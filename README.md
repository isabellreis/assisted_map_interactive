# Assisted Lab — Global Overview Map

An interactive prototype for [assistedlab.ch](https://assistedlab.ch) showing two things in one view: the current legal landscape of assisted dying and euthanasia worldwide, and the geographic distribution of the Assisted Lab archive. Built to be handed off to the Kirby CMS dev team for embedding.

---

## How to use the map

### The three modes (right panel → Show)

**Legislation**
Default view. Each country or state is coloured by its current legal status. The colour reflects the *most permissive category documented* — a country may have legislation across several domains. The legend and info panel show the full picture.

| Colour | Meaning |
|---|---|
| Green `#41ffbb` | Euthanasia permitted |
| Cyan `#2dd7fc` | Assisted suicide permitted |
| Pink `#ff85e4` | Refusal of treatment documented |
| Orange `#ff8b03` | Unclear / actively debated |
| Dark `#363636` | Illegal |
| Light grey | No data |

Hover a region to see its name. Hover a legend item to highlight that category on the map.

**Proposals**
Highlights countries with active legislative proposals (yellow). Click to open the legal history.

**Archive**
Switches to a country-level heatmap. Shade intensity shows how many Assisted Lab archive entries originate from each country. Click a country to see the count and filter the archive grid below.

### Clicking a country

In Legislation/Proposals mode, clicking opens an info panel showing:
- The jurisdiction name and top-level category
- Legal history grouped by domain (Euthanasia / Assisted Suicide / Refusal of Treatment), each with laws, court rulings, and proposals in chronological order
- A status badge per domain based on the most recent non-proposal entry

In Archive mode, clicking filters the archive grid to that country's entries.

---

## TODO

### Map

- [x] Double check how legal status is selected
- [x] Work on prioritization logic for unclear / illegal
- [x] Change how map deals with NAs
- [x] Update Info Panel

### Data

- [ ] Go over caveats and double check new entries
- [ ] Standardize labels
- [ ] Decide on which legislative changes should be included
- [ ] Add northern territories
- [ ] Research Africa

---

## File structure

```
.
├── index.html                  # App shell
├── style.css                   # Styling, layout, and card design
├── app.js                      # Application logic (Leaflet + D3)
├── README.md                   # Project guide and data-pipeline instructions
├── .github/
│   └── workflows/
│       └── deploy.yml          # Deployment workflow
├── _scripts/
│   ├── preprocessing_long.R    # Google Sheet → legislation GeoJSON
│   ├── csv_to_archive.js       # Shared cleaned CSVs → _data/archive.json
│   └── kirby_to_archive.js     # Local Kirby export → data/archive.json
├── _data/                      # Map data consumed by app.js
│   ├── world_joined.geojson    # Legislation/proposals map geography
│   ├── world_countries.geojson # Country-level archive-map geography
│   └── archive.json            # Archive entries and legal-context records
├── notes/                      # Developer and handoff documentation
│   ├── assisted-lab-map-spec.md
│   ├── claude-code-handoff.md
│   ├── claude-code-handoff-continued.md
│   └── dev-notes.md
├── backend-extract/            # Local Kirby export; ignored by Git
│   ├── assets/                 # Exported assets
│   └── content/                # Entry text files and cover images
├── _assets/fonts/               # Optional local brand fonts; ignored by Git
└── data/                        # Alternate Kirby parser output, if generated
```

The shared scraper data lives outside this project, in the workspace-level
`../_data/` folder. The CSV importer reads `clean_archive.csv` and
`legal_contexts.csv` there and writes `_data/archive.json` for the app. The
generated map data under this project's `_data/` is checked in; the Kirby
backend export and local brand fonts are ignored by Git.

---

<details>
<summary>How to run locally</summary>

The app uses `fetch()` for data files, so it needs a local server (not `file://`):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

</details>

<details>
<summary>Data pipeline</summary>

### Legislation — R script

**Source:** Google Sheet (maintained by the Assisted Lab team)  
**Script:** `_scripts/preprocessing_long.R`  
**Output:** `_data/world_joined.geojson`, `_data/world_countries.geojson`

The sheet has four tabs: `world`, `us_states`, `canada_states`, `australia_states`. Each row is one legal event for a jurisdiction × domain combination.

**Why two GeoJSON files?** The Legislation and Archive modes need different geographic granularity:

- **`world_joined.geojson`** — used by Legislation and Proposals modes. The US, Canada, and Australia are split into states/provinces (because legislation varies by state). All other countries appear as single shapes. This is the main map layer.
- **`world_countries.geojson`** — used only by the Archive heatmap. Here the US, Canada, and Australia are shown as whole countries (not split), because archive entries are tagged by country, not by state. Using the subdivided file for the heatmap would mean US states each get their own colour, but archive entries are all tagged "United States" — they'd never match.

To regenerate after a sheet update (run from project root):
```bash
Rscript _scripts/preprocessing_long.R
```
Requires `googlesheets4` auth — run `Rscript -e 'googlesheets4::gs4_auth()'` once first.

**Category selection logic:** each jurisdiction gets one map `category`, chosen per domain (Euthanasia / Assisted Suicide / Refusal of Treatment) by taking the latest dated `law`/`amendment`/`court ruling`/`none` entry (`proposal` rows never count), falling back to an undated status if that's all there is. The three domain statuses are then collapsed by permissiveness, first match wins:

1. Euthanasia legal → **Euthanasia**
2. else Assisted Suicide legal → **Assisted Suicide**
3. else Refusal of Treatment legal → **Refusal of treatment**
4. else Refusal of Treatment has no data (and Euthanasia/Assisted Suicide aren't *both* also undocumented) → **Unclear / in debate**
5. else any domain illegal → **Illegal**
6. else any domain unclear → **Unclear / in debate**
7. else no data → blank

### Archive — Kirby backend parser

**Source:** `backend-extract/content/` (Kirby flat-file export, not in version control)  
**Script:** `_scripts/kirby_to_archive.js`  
**Output:** `data/archive.json` (alternate output; the app loads `_data/archive.json`)

To regenerate after content changes (run from project root):
```bash
node _scripts/kirby_to_archive.js
```

### Archive — CSV import

Run the scraper and cleaner from the workspace root to create
`../_data/clean_archive.csv` and `../_data/legal_contexts.csv`, then build the
app's archive JSON. Each entry's `legal_contexts` list retains every ordered
country, text, and link record; the `countries` list deduplicates countries
within that entry for map counts.

```bash
Rscript assisted_scrape/_main.r
Rscript assisted_scrape/clean.r
node assisted_map_interactive/_scripts/csv_to_archive.js
```

</details>
