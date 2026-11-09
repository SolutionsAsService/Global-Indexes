# Global Indexes

Published indexes of governance, wellbeing, society and safety, one JSON file each, with a front end that puts a country across all of them: a parallel chart on the home page, a page per country, a page per index, and a way to plot any two against each other.

The indexes are as last recorded in an open archive (Our World in Data's `owid-datasets`), not live feeds: the newest data point is from 2021 and some indexes end in 2010. Rank is computed here within each index and year. See the site's Sources page for each source, what was left out, and how positions are computed.

## The files

One file per index at the top of the repository, in one shape:

```json
{ "Norway": { "2018": { "Score": 84, "Rank": 7 }, "2017": { "Score": 85, "Rank": 6 } } }
```

| File | Index | Years | Source |
|---|---|---|---|
| `CorruptionPerceptions.json` | Corruption Perceptions Index | 2012–2018 | Transparency International |
| `HumanDevelopment.json` | Human Development Index | 1980–2017 | UNDP |
| `GenderInequality.json` | Gender Inequality Index | 1995–2015 | UNDP |
| `GlobalHunger.json` | Global Hunger Index | 2000–2021 | Concern Worldwide, Welthungerhilfe |
| `GovernmentTransparency.json` | Government Transparency Index | 1980–2010 | Hollyer, Rosendorff, Vreeland |
| `HealthyLifeExpectancy.json` | Healthy Life Expectancy | 1990–2016 | IHME, Global Burden of Disease |
| `ViolentDeaths.json` | Death rate from violence | 1990–2016 | IHME, Global Burden of Disease |
| `DemocraticSatisfaction.json` | Satisfaction with democracy | 1973–2020 | Claassen |
| `PressFreedom.json` | World Press Freedom Index | 2019–2023 | supplied; **unverified** |

`manifest.json` describes every file (source, scale, direction, notes, years). `summary.json` holds each country's latest position, for the front end.

`PressFreedom.json` was not valid JSON when this repository was inherited (stray braces and a junk tail). It has been repaired for syntax only; its values are unchanged. In every year many of its ranks disagree with its scores, so it is marked unverified and left out of the cross-index views.

## Run the site

```bash
npx serve .      # or: python3 -m http.server
```

Opening `index.html` directly will not work, because the data is loaded with `fetch`.

## Rebuild and check

```bash
python3 scripts/build-data.py             # download, rebuild every index file, manifest.json and summary.json
python3 scripts/build-data.py --check     # validate the data, no network
python3 scripts/build-data.py --selftest  # prove the check fails on ranks that contradict scores
node scripts/check-site.mjs               # links, printed figures, ranks and names against the data
```

The build uses only the Python standard library. Downloads are cached in `.cache/` (not committed).

Design decisions and review rounds are in [DESIGN-LOG.md](DESIGN-LOG.md).
