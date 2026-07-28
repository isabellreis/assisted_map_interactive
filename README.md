# Assisted Lab — Global Overview Map

An interactive prototype for [assistedlab.ch](https://assistedlab.ch) showing two things in one view: the current legal landscape of assisted dying and euthanasia worldwide, and the geographic distribution of the Assisted Lab archive. Built to be handed off to the Kirby CMS dev team for embedding.

---

## How to run locally

The app uses `fetch()` for data files, so it needs a local server (not `file://`):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

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

## Data pipeline

### Legislation — R script

**Source:** Google Sheet (maintained by the Assisted Lab team)  
**Script:** `scripts/preprocessing_long.R`  
**Output:** `data/world_joined.geojson`, `data/world_countries.geojson`

The sheet has four tabs: `world`, `us_states`, `canada_states`, `australia_states`. Each row is one legal event for a jurisdiction × domain combination.

**Why two GeoJSON files?** The Legislation and Archive modes need different geographic granularity:

- **`world_joined.geojson`** — used by Legislation and Proposals modes. The US, Canada, and Australia are split into states/provinces (because legislation varies by state). All other countries appear as single shapes. This is the main map layer.
- **`world_countries.geojson`** — used only by the Archive heatmap. Here the US, Canada, and Australia are shown as whole countries (not split), because archive entries are tagged by country, not by state. Using the subdivided file for the heatmap would mean US states each get their own colour, but archive entries are all tagged "United States" — they'd never match.

To regenerate after a sheet update (run from project root):
```bash
Rscript scripts/preprocessing_long.R
```
Requires `googlesheets4` auth — run `Rscript -e 'googlesheets4::gs4_auth()'` once first.

### Archive — Kirby backend parser

**Source:** `backend-extract/content/` (Kirby flat-file export, not in version control)  
**Script:** `scripts/kirby_to_archive.js`  
**Output:** `data/archive.json`

To regenerate after content changes (run from project root):
```bash
node scripts/kirby_to_archive.js
```

Current distribution: 131 entries across 34 countries. Highest counts: Canada (27), Switzerland (20), France and Netherlands (11 each).

### Archive — CSV fallback

If you have a flat `data/archive.csv` instead of the Kirby backend:
```bash
node scripts/csv_to_archive.js
```

---

## File structure

```
├── index.html              # App shell
├── style.css               # All styling (fonts, layout, card design)
├── app.js                  # All application logic (Leaflet + D3)
├── assets/
│   └── fonts/              # Brand fonts (not in version control — see below)
├── scripts/
│   ├── preprocessing_long.R    # Google Sheet → GeoJSON
│   ├── kirby_to_archive.js     # Kirby backend → archive.json
│   └── csv_to_archive.js       # CSV → archive.json (fallback)
├── data/                   # Generated files — not in version control
│   ├── world_joined.geojson
│   ├── world_countries.geojson
│   └── archive.json
└── backend-extract/        # Kirby content export — not in version control
    └── content/            # Entry .txt files and cover images
```

**Fonts:** `assets/fonts/` is gitignored. Copy the five `.woff2` files from the Kirby backend (`assets/`) into this folder before running locally.

---

## Notes for the dev team (Kirby CMS embedding)

1. **Data files** (`world_joined.geojson`, `world_countries.geojson`, `archive.json`) need to be served alongside the app. At ~15 MB combined, consider serving from a CDN.

2. **The map container** requires a fixed height. Current layout uses `58vh` for the map row and `flex: 1` for the archive grid. Adjust `#map-area` in `style.css` to fit the page template.

3. **Live archive data.** `archive.json` is currently a static export. For live deployment, a Kirby plugin could generate this JSON on the fly. Expected fields per entry: `id`, `title`, `creator`, `description`, `type`, `year`, `countries`, `thumbnail`, `url`.

4. **Legislation updates** require re-running the R script and redeploying the two GeoJSON files — there is no live connection to the Google Sheet.
