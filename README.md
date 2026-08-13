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

- [ ] Double check how legal status is selected
- [ ] Work on prioritization logic for unclear / illegal
- [ ] Change how map deals with NAs
- [ ] Update Info Panel

### Data

- [ ] Go over caveats and double check new entries
- [ ] Standardize labels
- [ ] Decide on which legislative changes should be included
- [ ] Add northern territories
- [ ] Research Africa

---

## File structure

```
├── index.html              # App shell
├── style.css               # All styling (fonts, layout, card design)
├── app.js                  # All application logic (Leaflet + D3)
├── _assets/
│   └── fonts/              # Brand fonts (not in version control — see below)
├── _scripts/
│   ├── preprocessing_long.R    # Google Sheet → GeoJSON
│   ├── kirby_to_archive.js     # Kirby backend → archive.json
│   └── csv_to_archive.js       # CSV → archive.json (fallback)
├── _data/                  # Generated files — not in version control
│   ├── world_joined.geojson
│   ├── world_countries.geojson
│   └── archive.json
├── _notes/                 # Developer and handoff notes
│   ├── dev-notes.md            # Kirby CMS embedding notes
│   ├── assisted-lab-map-spec.md
│   └── claude-code-handoff.md
└── backend-extract/        # Kirby content export — not in version control
    └── content/            # Entry .txt files and cover images
```

**Fonts:** `_assets/fonts/` is gitignored. Copy the five `.woff2` files from the Kirby backend (`assets/`) into this folder before running locally.

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
4. else Euthanasia and Assisted Suicide both illegal but Refusal of Treatment has no data → **Unclear / in debate**
5. else any domain illegal → **Illegal**
6. else any domain unclear → **Unclear / in debate**
7. else no data → blank

### Archive — Kirby backend parser

**Source:** `backend-extract/content/` (Kirby flat-file export, not in version control)  
**Script:** `_scripts/kirby_to_archive.js`  
**Output:** `_data/archive.json`

To regenerate after content changes (run from project root):
```bash
node _scripts/kirby_to_archive.js
```

Current distribution: 131 entries across 34 countries. Highest counts: Canada (27), Switzerland (20), France and Netherlands (11 each).

### Archive — CSV fallback

If you have a flat `_data/archive.csv` instead of the Kirby backend:
```bash
node _scripts/csv_to_archive.js
```

</details>
