// Converts data/archive.csv -> data/archive.json
// Run: node scripts/csv_to_archive.js  (from project root)

'use strict';
const fs = require('fs');
const path = require('path');

const CSV_PATH  = path.join(__dirname, '../data/archive.csv');
const GEO_PATH  = path.join(__dirname, '../data/world_joined.geojson');
const OUT_PATH  = path.join(__dirname, '../data/archive.json');

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

const archive = rows.map(r => ({
  id:             r.entry_id,
  title:          r.title,
  creator:        r.author,
  description:    r.summary,
  type:           r.primary_category,   // textual / visual / audio / performative
  subtype:        r.type,               // film / documentary / fiction / prose / etc.
  year:           r.year ? parseInt(r.year) : null,
  status_context: categoryByCountry[r.leg_country] || null,
  countries:      r.leg_country ? [r.leg_country] : [],
  thumbnail:      null,
  url:            r.url,
  leg_text:       r.leg_text,
  leg_link:       r.leg_link || null,
}));

fs.writeFileSync(OUT_PATH, JSON.stringify(archive, null, 2));
console.log(`wrote ${archive.length} entries to ${OUT_PATH}`);

// Print country distribution for verification
const dist = {};
archive.forEach(e => e.countries.forEach(c => { dist[c] = (dist[c] || 0) + 1; }));
console.log('distribution:', dist);
