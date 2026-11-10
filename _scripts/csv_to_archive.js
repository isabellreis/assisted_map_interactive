// Converts the shared cleaned archive CSV -> _data/archive.json
// Run: node _scripts/csv_to_archive.js  (from project root)

'use strict';
const fs = require('fs');
const path = require('path');

const CSV_PATH  = path.join(__dirname, '../../_data/clean_archive.csv');
const CONTEXT_PATH = path.join(__dirname, '../../_data/legal_contexts.csv');
const GEO_PATH  = path.join(__dirname, '../_data/world_joined.geojson');
const OUT_PATH  = path.join(__dirname, '../_data/archive.json');

function parseCSV(text) {
  const rows = []; let row = [], field = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuote = false;
      else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (row.length) { row.push(field); rows.push(row); }
  const headers = rows[0];
  return rows.slice(1).map(r => Object.fromEntries(headers.map((k, i) => [k, r[i] === 'NA' ? null : r[i]])));
}

// Build country -> category lookup from GeoJSON
const geo = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
const categoryByCountry = {};
geo.features.forEach(f => {
  if (f.properties.name && f.properties.category) {
    categoryByCountry[f.properties.name] = f.properties.category;
  }
});

const rows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
const contextRows = parseCSV(fs.readFileSync(CONTEXT_PATH, 'utf8'));
const contextsByEntry = new Map();
contextRows.forEach(row => {
  const context = {
    order: row.context_order ? parseInt(row.context_order, 10) : null,
    country: row.leg_country || null,
    text: row.leg_text || null,
    link: row.leg_link || null,
  };
  if (!contextsByEntry.has(row.entry_id)) contextsByEntry.set(row.entry_id, []);
  contextsByEntry.get(row.entry_id).push(context);
});

const archive = rows.map(r => {
  const legalContexts = (contextsByEntry.get(r.entry_id) || [])
    .sort((a, b) => a.order - b.order);
  const countries = [...new Set(legalContexts
    .map(context => context.country)
    .filter(country => country && country !== 'NA'))];

  return {
    id:             r.entry_id,
    title:          r.title,
    creator:        r.author,
    description:    r.summary,
    type:           r.primary_category,   // textual / visual / audio / performative
    subtype:        r.type,               // film / documentary / fiction / prose / etc.
    year:           r.year ? parseInt(r.year) : null,
    status_context: countries.map(country => categoryByCountry[country]).find(Boolean) || null,
    countries,
    legal_contexts: legalContexts,
    thumbnail:      null,
    url:            r.url,
    leg_text:       r.leg_text,
    leg_link:       r.leg_link || null,
  };
});

fs.writeFileSync(OUT_PATH, JSON.stringify(archive, null, 2));
console.log(`wrote ${archive.length} entries to ${OUT_PATH}`);

// Print country distribution for verification
const dist = {};
archive.forEach(e => e.countries.forEach(c => { dist[c] = (dist[c] || 0) + 1; }));
console.log('distribution:', dist);
