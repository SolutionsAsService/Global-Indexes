#!/usr/bin/env python3
"""Rebuild the index files and manifest.json from Our World in Data's archived datasets.

    python3 scripts/build-data.py            # download (cached in .cache/), write ./*.json and manifest.json
    python3 scripts/build-data.py --check    # validate every file and the manifest; no network
    python3 scripts/build-data.py --selftest # prove the checker fails on a file whose ranks contradict its scores

Each index is written in the same shape as PressFreedom.json:
    { "Country": { "2016": { "Score": 71.49, "Rank": 12 }, ... }, ... }
Rank is computed here, per year, among the countries in that file (1 = best by the index's own direction,
ties share the lower rank). Aggregates (regions, income groups, "World") and UK sub-nations are dropped.
Records are skipped, never guessed: an empty or missing source file stops the build for that index.
Standard library only.
"""
import csv, io, json, os, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache")
RAW = "https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/"

AGGREGATES = {
    "World", "Australasia", "Caribbean", "Central Asia", "Central Europe", "Central Europe, Eastern Europe, and Central Asia",
    "Central Sub-Saharan Africa", "East Asia", "Eastern Europe", "Eastern Sub-Saharan Africa", "High SDI", "High-income",
    "High-middle SDI", "Latin America and Caribbean", "Low SDI", "Low-middle SDI", "Middle SDI", "North Africa and Middle East",
    "North America", "Oceania", "South Asia", "Southeast Asia", "Southern Latin America", "Southern Sub-Saharan Africa",
    "Sub-Saharan Africa", "Western Europe", "Western Sub-Saharan Africa", "England", "Scotland", "Wales", "Northern Ireland",
}

# Not sovereign states, or no longer existing: dropped so they do not sit in a ranking's denominator.
NOT_COUNTRIES = {
    "American Samoa", "Bermuda", "Greenland", "Guam", "Puerto Rico", "Northern Mariana Islands", "United States Virgin Islands",
    "Virgin Islands, U.S.", "Northern Cyprus", "Crimea", "Transkei", "South Yemen", "German Democratic Republic", "Somaliland",
    "Organisation of Eastern Caribbean States",
}
# One name per country: the archive uses several spellings, and two spellings in one file double-count a country.
ALIASES = {
    "Korea": "South Korea", "Czech Republic": "Czechia", "Macedonia": "North Macedonia", "Swaziland": "Eswatini",
    "Ivory Coast": "Cote d'Ivoire", "Micronesia (country)": "Micronesia", "Federated States of Micronesia": "Micronesia",
    "East Timor": "Timor", "Burma": "Myanmar",
}

# id, file, dataset folder in the OWID archive, value column, display names, direction, scale note, topic, notes
INDEXES = [
    dict(id="corruption", file="CorruptionPerceptions.json", folder="Corruption Perception Index - Transparency International (2018)",
         name="Corruption Perceptions Index", short="Corruption", source="Transparency International", source_url="https://www.transparency.org/cpi2018",
         better="higher", scale="0 to 100; 100 is very clean, 0 is highly corrupt", topic="Governance",
         notes="Perceived public-sector corruption, from expert assessments and business surveys."),
    dict(id="hdi", file="HumanDevelopment.json", folder="Human Development Index - UNDP",
         name="Human Development Index", short="Human development", source="UNDP, Human Development Report 2020", source_url="http://hdr.undp.org/en/indicators/137506",
         better="higher", scale="0 to 1", topic="Wellbeing",
         notes="A summary of life expectancy, schooling and income. One of its three parts is income per person, so it is not purely non-economic."),
    dict(id="gender", file="GenderInequality.json", folder="Gender Inequality Index - Human Development Report (2015)",
         name="Gender Inequality Index", short="Gender inequality", source="UNDP, Human Development Report 2015", source_url="http://hdr.undp.org/en/data",
         better="lower", scale="0 to 1; higher means more inequality", topic="Society",
         notes="Loss in potential human development from disparity between women and men. Archive note: 1995 values use parliamentary seat shares from 1997."),
    dict(id="hunger", file="GlobalHunger.json", folder="Global Hunger Index (2021)",
         name="Global Hunger Index", short="Hunger", source="Concern Worldwide and Welthungerhilfe", source_url="https://www.globalhungerindex.org/download/all.html",
         better="lower", scale="0 to 100; higher means more hunger", topic="Wellbeing",
         notes="Four indicators combined: undernourishment, child wasting, child stunting, child mortality. Covers 128 countries in a few years only."),
    dict(id="transparency", file="GovernmentTransparency.json", folder="Government Transparency index - Hollyer et al. (2014)",
         name="Government Transparency Index", short="Transparency", source="Hollyer, Rosendorff and Vreeland (2014)", source_url="http://hrvtransparency.org/",
         better="higher", scale="A modelled score, roughly -10 to 10; higher is more transparent", topic="Governance",
         notes="How fully governments report data to the World Bank, which includes economic data. The scale has no natural zero."),
    dict(id="health", file="HealthyLifeExpectancy.json", folder="Healthy Life Expectancy - IHME", column=2,
         name="Healthy Life Expectancy", short="Healthy life", source="IHME, Global Burden of Disease 2016", source_url="http://ghdx.healthdata.org/gbd-results-tool",
         better="higher", scale="Years a newborn can expect to live in good health", topic="Wellbeing",
         notes="Estimates for a person born in the given year."),
    dict(id="violence", file="ViolentDeaths.json", folder="Mortality from all forms of violence  (IHME (2016))", column=2,
         name="Death rate from violence", short="Violence", source="IHME, Global Burden of Disease 2016, amended by Our World in Data", source_url="http://ghdx.healthdata.org/gbd-results-tool",
         better="lower", scale="Age-standardised deaths from all forms of violence (the archive does not state the unit); higher means more deaths", topic="Safety",
         notes="Interpersonal violence, conflict and terrorism, and executions and police conflict. Rwanda 1994 is 8,132, the genocide year, and compresses any scale that includes it."),
    dict(id="satisfaction", file="DemocraticSatisfaction.json", folder="Democratic satisfaction - Claassen", column=2,
         name="Satisfaction with democracy", short="Democratic satisfaction", source="Claassen (2022), via Our World in Data", source_url="http://chrisclaassen.com/data.html",
         better="higher", scale="A modelled score from survey responses; 0 is about the average, roughly -2.5 to 3", topic="Governance",
         notes="Citizens' average satisfaction with the way democracy works in their own country, combined from more than a thousand surveys."),
]
# Not rebuilt here: the existing hand-supplied file, repaired for syntax only. Its ranks disagree with its scores.
PRESS_ALIASES = ALIASES
PRESS = dict(id="press", file="PressFreedom.json", name="World Press Freedom Index", short="Press freedom", source="Reporters Without Borders (as supplied)",
             source_url="https://rsf.org/en/index", better="higher", scale="0 to 100; 100 is most free", topic="Governance", verified=False,
             notes="Supplied with this repository and repaired for syntax only (stray braces and a junk tail). 100 countries, 2019 to 2023. In every year many ranks disagree with the score order, so treat Rank and Score as unverified; it is left out of cross-index views.")


def fetch(folder):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, folder.replace("/", "_") + ".csv")
    if not os.path.exists(path):
        q = urllib.parse.quote
        with urllib.request.urlopen(RAW + q(folder) + "/" + q(folder) + ".csv", timeout=60) as r:
            data = r.read()
        if not data.strip():
            raise SystemExit("empty source file for " + folder)
        open(path, "wb").write(data)
    return open(path, encoding="utf-8").read()


def build_index(ix):
    rows = list(csv.reader(io.StringIO(fetch(ix["folder"]))))
    col = ix.get("column", 2)
    data = {}
    for r in rows[1:]:
        if len(r) <= col or not r[col] or r[0] in AGGREGATES or r[0] in NOT_COUNTRIES:
            continue
        try:
            year, val = int(r[1]), round(float(r[col]), 4)
        except ValueError:
            continue
        name = ALIASES.get(r[0], r[0])
        have = data.setdefault(name, {})
        if year in have and name != r[0]:
            if have[year] != val:
                print("  note: %s %d: %r and %r differ, keeping the first" % (name, year, r[0], name))
            continue
        have[year] = val
    years = sorted({y for v in data.values() for y in v})
    out = {c: {} for c in data}
    for y in years:
        pts = [(v[y], c) for c, v in data.items() if y in v]
        pts.sort(key=lambda t: t[0], reverse=(ix["better"] == "higher"))
        rank, prev = 0, None
        for i, (v, c) in enumerate(pts, 1):
            if v != prev:  # values are already rounded to the 4 decimals that are stored, so ties match what a reader sees
                rank, prev = i, v
            out[c][str(y)] = {"Score": round(v, 4), "Rank": rank}
    return out


def write_file(name, data):
    lines = ["{"]
    cs = sorted(data)
    for i, c in enumerate(cs):
        lines.append('  %s: {' % json.dumps(c, ensure_ascii=False))
        ys = sorted(data[c], reverse=True)
        for j, y in enumerate(ys):
            lines.append('    "%s": { "Score": %s, "Rank": %d }%s' % (y, data[c][y]["Score"], data[c][y]["Rank"], "," if j < len(ys) - 1 else ""))
        lines.append("  }" + ("," if i < len(cs) - 1 else ""))
    lines.append("}")
    open(os.path.join(ROOT, name), "w", encoding="utf-8").write("\n".join(lines) + "\n")


def describe(ix, data):
    years = sorted({int(y) for v in data.values() for y in v})
    latest = str(years[-1])
    m = {k: ix[k] for k in ("id", "file", "name", "short", "source", "source_url", "better", "scale", "topic", "notes")}
    m.update(verified=ix.get("verified", True), first_year=years[0], last_year=years[-1], years=years,
             countries=len(data), countries_latest=sum(1 for v in data.values() if latest in v))
    return m


def write_summary(manifest):
    """summary.json: each country's position in each verified index in that index's last year (small, for the front end)."""
    out = {}
    for m in manifest:
        if not m["verified"]:
            continue
        d, y = load(m["file"]), str(m["last_year"])
        n = m["countries_latest"]
        for c, v in d.items():
            if y in v:
                r = v[y]["Rank"]
                out.setdefault(c, {})[m["id"]] = {"y": m["last_year"], "s": v[y]["Score"], "r": r, "n": n, "p": round(100 * (n - r) / (n - 1), 1)}
    json.dump(out, open(os.path.join(ROOT, "summary.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))


def load(name):
    return json.load(open(os.path.join(ROOT, name), encoding="utf-8"))


def check():
    man = load("manifest.json")
    bad = []
    for m in man["indexes"]:
        try:
            d = load(m["file"])
        except Exception as e:
            bad.append("%s: %s" % (m["file"], e)); continue
        for c, v in d.items():
            for y, p in v.items():
                if set(p) != {"Score", "Rank"} or not isinstance(p["Rank"], int):
                    bad.append("%s %s %s: bad record" % (m["file"], c, y))
        if m["verified"]:  # computed ranks must be in score order
            for y in m["years"]:
                sign = -1 if m["better"] == "higher" else 1  # best first; ties (equal after rounding) may carry different ranks
                pts = sorted(((sign * v[str(y)]["Score"], v[str(y)]["Rank"]) for v in d.values() if str(y) in v))
                last = 0
                for s_, r in pts:
                    if r < last: bad.append("%s %s: rank %d out of score order" % (m["file"], y, r)); break
                    last = r
    print("OK" if not bad else "\n".join(bad), "- %d indexes" % len(man["indexes"]))
    return 1 if bad else 0


def selftest():
    """The checker must fail on a file whose ranks contradict its scores, and accept equal scores sharing a rank."""
    import tempfile, shutil
    tmp = tempfile.mkdtemp()
    global ROOT
    old, ROOT = ROOT, tmp
    try:
        json.dump({"indexes": [{"file": "t.json", "years": [2020], "better": "higher", "verified": True}]}, open(os.path.join(tmp, "manifest.json"), "w"))
        json.dump({"A": {"2020": {"Score": 90.0, "Rank": 2}}, "B": {"2020": {"Score": 80.0, "Rank": 1}}}, open(os.path.join(tmp, "t.json"), "w"))
        failed = check() == 1
        json.dump({"A": {"2020": {"Score": 90.0, "Rank": 1}}, "B": {"2020": {"Score": 80.0, "Rank": 2}}, "C": {"2020": {"Score": 80.0, "Rank": 2}}}, open(os.path.join(tmp, "t.json"), "w"))
        passed = check() == 0
    finally:
        ROOT = old
        shutil.rmtree(tmp, ignore_errors=True)
    print("selftest:", "ok" if failed and passed else "FAILED (failing fixture accepted or good fixture rejected)")
    sys.exit(0 if failed and passed else 1)


def main():
    if "--selftest" in sys.argv:
        selftest()
    if "--check" in sys.argv:
        sys.exit(check())
    manifest = []
    for ix in INDEXES:
        d = build_index(ix)
        write_file(ix["file"], d)
        manifest.append(describe(ix, d))
        print("%-28s %3d countries, %s-%s" % (ix["file"], len(d), manifest[-1]["first_year"], manifest[-1]["last_year"]))
    press = load("PressFreedom.json")
    manifest.append(describe(PRESS, press))
    write_summary(manifest)
    json.dump({"generated_by": "scripts/build-data.py", "indexes": manifest}, open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    open(os.path.join(ROOT, "manifest.json"), "a").write("\n")
    sys.exit(check())


if __name__ == "__main__":
    main()
