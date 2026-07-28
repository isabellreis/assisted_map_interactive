// Reads Kirby content files -> data/archive.json
// Run: node scripts/kirby_to_archive.js  (from project root)
// Re-run whenever the backend content changes.

'use strict';
const fs   = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, '../backend-extract/content');
const GEO_PATH    = path.join(__dirname, '../data/world_joined.geojson');
const OUT_PATH    = path.join(__dirname, '../data/archive.json');

// type folder prefix -> URL slug
const TYPE_SLUG = {
  '1_textual':     'textual',
  '2_visual':      'visual',
  '3_audio':       'audio',
  '4_performative':'performative',
};

// ---- Kirby TXT parser ----
function parseKirby(txt) {
  const fields = {};
  txt.split(/\n----\n/).forEach(section => {
    const colonIdx = section.indexOf(':');
    if (colonIdx === -1) return;
    const key   = section.slice(0, colonIdx).trim().toLowerCase();
    const value = section.slice(colonIdx + 1).trim();
    fields[key] = value;
  });
  return fields;
}

// Extract all `origin: Country` values from a Context field string
function extractOrigins(contextStr) {
  if (!contextStr) return [];
  const matches = [...contextStr.matchAll(/origin:\s*(.+)/g)];
  return [...new Set(
    matches
      .map(m => m[1].trim().replace(/^["']+|["']+$/g, '').trim()) // strip stray quotes
      .filter(v => v && /[a-zA-Z]/.test(v))                       // must contain a letter
  )];
}

// Find the cover image file in an entry directory (skip test images and .txt sidecar files)
function findImage(dir, entrySlug) {
  let files;
  try { files = fs.readdirSync(dir); } catch { return null; }
  // prefer an image whose name matches the entry slug
  const named = files.find(f =>
    f.startsWith(entrySlug) && /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  if (named) return named;
  // fall back to any non-test image
  return files.find(f =>
    /\.(jpg|jpeg|png|webp)$/i.test(f) &&
    !f.endsWith('.txt') &&
    !f.includes('al-test-image')
  ) || null;
}

// ---- GeoJSON category lookup ----
const geo = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
const categoryByCountry = {};
geo.features.forEach(f => {
  if (f.properties.name && f.properties.category) {
    categoryByCountry[f.properties.name] = f.properties.category;
  }
});

// ---- Parse all entries ----
const archive = [];

for (const typeFolder of Object.keys(TYPE_SLUG)) {
  const typeDir = path.join(CONTENT_DIR, typeFolder);
  if (!fs.existsSync(typeDir)) continue;
  const typeSlug = TYPE_SLUG[typeFolder];

  for (const entryFolder of fs.readdirSync(typeDir)) {
    if (entryFolder.startsWith('_')) continue; // skip _drafts etc.
    const entryDir  = path.join(typeDir, entryFolder);
    const txtPath   = path.join(entryDir, 'entry.txt');
    if (!fs.existsSync(txtPath)) continue;

    const fields    = parseKirby(fs.readFileSync(txtPath, 'utf8'));

    // Skip drafts (unpublished entries won't have a UUID page listing, but
    // we check the content folder for a draft marker just in case)
    const entrySlug = entryFolder.replace(/^\d+_/, '');
    const countries = extractOrigins(fields.context);

    // status_context: use the first country's legislation category for card tint
    const statusContext = countries.length
      ? categoryByCountry[countries[0]] || null
      : null;

    // thumbnail: relative path from Outputs/assisted-map/ to the image file
    const imgFile  = findImage(entryDir, entrySlug);
    const thumbRel = imgFile
      ? `../../Projects/assisted-map/backend-extract/content/${typeFolder}/${entryFolder}/${imgFile}`
      : null;

    archive.push({
      id:             entrySlug,
      title:          fields.title || entrySlug,
      creator:        fields.author || null,
      description:    fields.extract || null,
      type:           typeSlug,
      year:           fields.year ? parseInt(fields.year) : null,
      status_context: statusContext,
      countries,
      thumbnail:      thumbRel,
      url:            `https://assistedlab.ch/${typeSlug}/${entrySlug}`,
    });
  }
}

// Sort by year desc, then title
archive.sort((a, b) => (b.year || 0) - (a.year || 0) || (a.title || '').localeCompare(b.title || ''));

fs.writeFileSync(OUT_PATH, JSON.stringify(archive, null, 2));
console.log(`wrote ${archive.length} entries`);

// Distribution summary
const dist = {};
archive.forEach(e => e.countries.forEach(c => { dist[c] = (dist[c] || 0) + 1; }));
console.log('distribution:', JSON.stringify(dist, null, 2));
