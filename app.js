'use strict';

// ponytail: placeholder hex colors — swap all values here for final brand palette
const COLORS = {
  'Euthanasia':           '#41ffbb',
  'Assisted Suicide':     '#2dd7fc',
  'Refusal of treatment': '#ff85e4',
  'Unclear / in debate':  '#ff8b03',
  'Illegal':              '#363636',
  'Proposals':            '#fbff4f',
  'no-data':              '#dee0e3',
};

// entries_json domain keys use capital-T "Refusal of Treatment";
// category field uses lowercase-t — this mapping bridges the two
const DOMAIN_TO_CATEGORY = {
  'Euthanasia':           'Euthanasia',
  'Assisted Suicide':     'Assisted Suicide',
  'Refusal of Treatment': 'Refusal of treatment',
};

// GeoJSON admin field value → CSV leg_country name (only differs for United States)
const ADMIN_TO_CSV_COUNTRY = { 'United States of America': 'United States' };

const LEGISLATION_CATEGORIES = [
  'Euthanasia', 'Assisted Suicide', 'Refusal of treatment', 'Unclear / in debate', 'Illegal',
];

const DOMAIN_ORDER = ['Euthanasia', 'Assisted Suicide', 'Refusal of Treatment'];

// ---- State ----
const state = {
  show: 'Legislation',
  hoveredCategory: null,
  selectedJurisdiction: null,
};

// ---- Globals ----
let geoData, countriesData, archiveData;
let geoLayer, countriesLayer, leafletMap;
let rawCounts = {};    // CSV leg_country → count
let maxRawCount = 1;   // cached for Archive opacity scaling
const archiveCounts = {}; // GeoJSON subdivision feature name → effective count (own + parent)

// ---- Bootstrap ----
async function init() {
  [geoData, countriesData, archiveData] = await Promise.all([
    fetch('_data/world_joined.geojson').then(r => r.json()),
    fetch('_data/world_countries.geojson').then(r => r.json()),
    fetch('_data/archive.json').then(r => r.json()),
  ]);

  // Raw counts by CSV leg_country name
  archiveData.forEach(entry => {
    (entry.countries || []).forEach(c => { rawCounts[c] = (rawCounts[c] || 0) + 1; });
  });
  maxRawCount = Math.max(...Object.values(rawCounts), 1);

  // Per-subdivision effective count: own entries + parent-country entries
  geoData.features.forEach(f => {
    const { name, admin } = f.properties;
    let count = rawCounts[name] || 0;
    if (admin && admin !== name) {
      count += rawCounts[ADMIN_TO_CSV_COUNTRY[admin] || admin] || 0;
    }
    if (count > 0) archiveCounts[name] = count;
  });

  initMap();
  buildShowPanel();
  buildLegend();
  buildHelpPanel();
  buildArchiveGrid([]);
}

// Entry type -> neon color from website design system
const TYPE_COLORS = {
  textual:     '#41ffbb',
  visual:      '#ff85e4',
  audio:       '#2dd7fc',
  performative:'#ff8b03',
};

// ---- Helpers ----
function colorFor(category) {
  return COLORS[category] || COLORS['no-data'];
}

// Neons are light; only Illegal (#363636) needs white text.
function badgeTextColor(bg) {
  return bg === COLORS['Illegal'] ? '#fff' : '#363636';
}


// Archive count for any feature: checks precomputed subdivision counts first,
// then falls back to raw country-level lookup (for world_countries layer features).
function archiveCount(name) {
  if (archiveCounts[name] !== undefined) return archiveCounts[name];
  return rawCounts[ADMIN_TO_CSV_COUNTRY[name] || name] || 0;
}

// ---- Map ----
function makeLayerOptions(features) {
  return {
    style: featureStyle,
    onEachFeature: (feature, layer) => {
      layer.bindTooltip(tooltipLabel(feature), { sticky: true, className: 'map-tooltip' });
      layer.on({ click: e => { L.DomEvent.stopPropagation(e); onJurisdictionClick(feature); } });
    },
  };
}

function initMap() {
  leafletMap = L.map('map', { minZoom: 1, maxBoundsViscosity: 1.0 });

  // ponytail: CartoDB Positron no-labels — swap URL here for a different tile style
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
      ' © <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(leafletMap);

  geoLayer      = L.geoJSON(geoData,       makeLayerOptions()).addTo(leafletMap);
  countriesLayer = L.geoJSON(countriesData, makeLayerOptions()); // added only in Archive mode

  leafletMap.fitBounds(geoLayer.getBounds(), { padding: [0, 0] });
  leafletMap.setZoom(leafletMap.getZoom() + 1);
  leafletMap.on('click', clearSelection);
}

function featureStyle(feature) {
  const { name, category, has_proposal } = feature.properties;
  let fillColor, fillOpacity = 0.85;

  if (state.show === 'Proposals') {
    const active = has_proposal === true;
    fillColor   = active ? COLORS['Proposals'] : COLORS['no-data'];
    fillOpacity = active ? 0.85 : 0.25;

  } else if (state.show === 'Archive') {
    const count = archiveCount(name);
    if (count === 0) {
      fillColor   = COLORS['no-data'];
      fillOpacity = 0.25;
    } else {
      fillColor   = '#4A4A4A'; // matches legend gradient color rgba(74,74,74,...)
      fillOpacity = 0.08 + (count / maxRawCount) * 0.87; // maps to legend's 0.08→0.95 range
    }

  } else {
    // Legislation (default)
    fillColor = colorFor(category);
    if (state.hoveredCategory && category !== state.hoveredCategory) {
      fillColor   = COLORS['no-data'];
      fillOpacity = 0.15;
    }
  }

  return { fillColor, fillOpacity, color: '#ffffff', weight: 0.5, opacity: 0.5 };
}

function refreshMap() {
  if (state.show === 'Archive') {
    countriesLayer?.setStyle(featureStyle);
  } else {
    geoLayer?.setStyle(featureStyle);
  }
}

// ---- Tooltip ----
// For states/provinces: "StateName (Country)". For countries: just the name.
function tooltipLabel(feature) {
  const { name, admin } = feature.properties;
  return admin && admin !== name ? `${name} (${admin})` : name;
}

// ---- Legend ----
function buildLegend() {
  const panel = d3.select('#legend-panel').html('');
  panel.append('p').attr('class', 'panel-heading').text('Legend');

  if (state.show === 'Legislation') {
    LEGISLATION_CATEGORIES.forEach(cat => {
      const row = panel.append('div').attr('class', 'legend-row legend-hoverable')
        .on('mouseenter', () => { state.hoveredCategory = cat; refreshMap(); })
        .on('mouseleave', () => { state.hoveredCategory = null; refreshMap(); });
      row.append('span').attr('class', 'legend-swatch').style('background', COLORS[cat]);
      row.append('span').attr('class', 'legend-label').text(cat);
    });
    const noDataRow = panel.append('div').attr('class', 'legend-row');
    noDataRow.append('span').attr('class', 'legend-swatch').style('background', COLORS['no-data']);
    noDataRow.append('span').attr('class', 'legend-label').text('No data');

  } else if (state.show === 'Proposals') {
    const row = panel.append('div').attr('class', 'legend-row');
    row.append('span').attr('class', 'legend-swatch').style('background', COLORS['Proposals']);
    row.append('span').attr('class', 'legend-label').text('Active proposal');

  } else {
    // Archive — opacity ramp matching featureStyle's 0.08→0.95 range
    const mid = Math.round(maxRawCount / 2);
    const wrap     = panel.append('div').attr('class', 'legend-archive-wrap');
    wrap.append('p').attr('class', 'legend-archive-note')
      .text('Archive entries per country');
    wrap.append('div').attr('class', 'legend-gradient-bar');
    const ticks = wrap.append('div').attr('class', 'legend-gradient-ticks');
    [0, mid, maxRawCount].forEach((n, i) => {
      ticks.append('span').attr('class', 'legend-tick')
        .style('left', `${i * 50}%`)
        .text(n === maxRawCount ? n + '+' : n);
    });
  }
}

// ---- Help Panel ----
const HELP_TEXT = {
  Proposals: 'Highlighted countries have an active legislative proposal. Click a country to open its legal history.',
  Archive:   'Shade shows how many archive entries originate from each country — darker means more. Click a country to filter the archive grid below.',
};

const LEGISLATION_DEFS = [
  {
    category: 'Euthanasia',
    text: 'A medical professional actively ends a patient\'s life, typically by administering a lethal substance.',
  },
  {
    category: 'Assisted Suicide',
    text: 'A medical professional provides the means — usually a prescription — but the patient administers it themselves.',
  },
  {
    category: 'Refusal of treatment',
    text: 'No medical treatment may be given without the patient\'s explicit consent, which includes the right to withdraw or cancel life-sustaining treatment. The map does not distinguish between these two cases.',
  },
];

function buildHelpPanel() {
  const panel = d3.select('#help-panel').html('');

  if (state.show === 'Legislation') {
    panel.append('p').attr('class', 'help-intro')
      .text('Colour shows the most permissive status documented — a jurisdiction may have legislation across several domains. Click a country for the full picture.');

    const defs = panel.append('dl').attr('class', 'help-defs');
    LEGISLATION_DEFS.forEach(({ category, text }) => {
      defs.append('dt').attr('class', 'help-term')
        .style('color', COLORS[category])
        .text(category);
      defs.append('dd').attr('class', 'help-desc').text(text);
    });
  } else {
    panel.text(HELP_TEXT[state.show] || '');
  }
}

// ---- Show Panel ----
function buildShowPanel() {
  const panel = d3.select('#show-panel').html('');
  panel.append('p').attr('class', 'panel-heading').text('Show');

  ['Legislation', 'Proposals', 'Archive'].forEach(mode => {
    const lbl = panel.append('label').attr('class', 'show-option');
    lbl.append('input')
      .attr('type', 'radio')
      .attr('name', 'show-mode')
      .attr('value', mode)
      .property('checked', state.show === mode)
      .on('change', () => {
        const prev = state.show;
        state.show = mode;
        state.hoveredCategory = null;

        // Swap layers when entering or leaving Archive mode
        if (prev !== 'Archive' && mode === 'Archive') {
          leafletMap.removeLayer(geoLayer);
          countriesLayer.addTo(leafletMap);
        } else if (prev === 'Archive' && mode !== 'Archive') {
          leafletMap.removeLayer(countriesLayer);
          geoLayer.addTo(leafletMap);
        }

        buildLegend();
        buildHelpPanel();
        refreshMap();
      });
    lbl.append('span').text(mode);
  });
}

// ---- Info Panel ----
// Returns the feature's own name plus parent country name (for subdivisions),
// and also the CSV-normalized name for countries replaced by subdivisions in geoLayer.
function jurisdictionNames(feature) {
  const { name, admin } = feature.properties;
  const names = admin && admin !== name ? [name, admin] : [name];
  const csvName = ADMIN_TO_CSV_COUNTRY[name];
  if (csvName && !names.includes(csvName)) names.push(csvName);
  return names;
}

function onJurisdictionClick(feature) {
  const name = feature.properties.name;
  if (state.selectedJurisdiction === name) {
    clearSelection();
    return;
  }
  state.selectedJurisdiction = name;
  const names = jurisdictionNames(feature);
  const filtered = archiveData.filter(e => (e.countries || []).some(c => names.includes(c)));

  if (state.show === 'Archive') {
    showArchiveInfoPanel(feature, filtered.length);
  } else {
    showInfoPanel(feature);
  }
  buildArchiveGrid(filtered);
}

function showArchiveInfoPanel(feature, count) {
  const { name } = feature.properties;
  const panel = d3.select('#info-panel').classed('hidden', false).html('');
  const header = panel.append('div').attr('class', 'info-header');
  header.append('h2').attr('class', 'info-title').text(name);
  header.append('span').attr('class', 'info-count-badge')
    .text(`${count} ${count === 1 ? 'archive entry' : 'archive entries'}`);
  header.append('button').attr('class', 'info-close').html('&times;').on('click', clearSelection);
}

function clearSelection() {
  state.selectedJurisdiction = null;
  d3.select('#info-panel').classed('hidden', true).html('');
  buildArchiveGrid([]);
}

// Returns the current legal status (0/1/2) for a domain's entry list.
function currentDomainStatus(entries) {
  if (!entries?.length) return null;
  const nonProposal = entries.filter(e => e.leg_type !== 'proposal' && e.year != null);
  if (nonProposal.length) {
    return nonProposal.reduce((a, b) => (a.year >= b.year ? a : b)).status;
  }
  const undated = entries.find(e => e.leg_type !== 'proposal' && e.year == null && e.status != null);
  return undated?.status ?? null;
}

const STATUS_LABEL = { 1: 'Legal', 0: 'Illegal', 2: 'Unclear' };
const STATUS_BG    = { 1: null, 0: COLORS['Illegal'], 2: COLORS['Unclear / in debate'] };

function showInfoPanel(feature) {
  const { name, category, entries_json } = feature.properties;
  const panel = d3.select('#info-panel').classed('hidden', false).html('');

  const header = panel.append('div').attr('class', 'info-header');
  header.append('h2').attr('class', 'info-title').text(name);
  if (category) {
    const bg = colorFor(category);
    header.append('span').attr('class', 'category-badge')
      .style('background', bg)
      .style('color', badgeTextColor(bg))
      .text(category);
  }
  header.append('button').attr('class', 'info-close').html('&times;').on('click', clearSelection);

  if (!entries_json) {
    panel.append('p').attr('class', 'info-empty').text('No legal data recorded for this jurisdiction.');
    return;
  }

  DOMAIN_ORDER.forEach(domain => {
    const entries = entries_json[domain];
    if (!entries?.length) return;

    const catKey = DOMAIN_TO_CATEGORY[domain] || domain;
    const domainColor = colorFor(catKey);
    const status = currentDomainStatus(entries);

    const section = panel.append('div').attr('class', 'info-domain');
    const domainHeader = section.append('div').attr('class', 'info-domain-header');
    domainHeader.append('h3').attr('class', 'info-domain-heading')
      .style('color', domainColor)
      .text(domain);
    if (status != null) {
      const badgeBg = STATUS_BG[status] ?? domainColor;
      domainHeader.append('span').attr('class', 'domain-status-badge')
        .style('background', badgeBg)
        .style('color', badgeTextColor(badgeBg))
        .text(STATUS_LABEL[status] ?? status);
    }

    const list = section.append('ul').attr('class', 'info-entry-list');
    entries.forEach(entry => {
      const li = list.append('li').attr('class', 'info-entry');
      const metaParts = [entry.leg_type, entry.year].filter(Boolean);
      if (metaParts.length) li.append('span').attr('class', 'entry-meta').text(metaParts.join(' · '));
      if (entry.label) {
        const el = entry.url
          ? li.append('a').attr('href', entry.url).attr('target', '_blank').attr('class', 'entry-label')
          : li.append('span').attr('class', 'entry-label');
        el.text(entry.label);
      }
      if (entry.note) li.append('p').attr('class', 'entry-note').text(entry.note);
    });
  });
}

// ---- Archive Grid ----
function buildArchiveGrid(entries) {
  const grid = d3.select('#archive-grid').html('');

  if (!entries.length) {
    grid.append('p').attr('class', 'archive-empty')
      .text('Click a country on the map to see related archive entries.');
    return;
  }

  entries.forEach(entry => {
    const card = grid.append('a')
      .attr('class', `grid__item grid__item--${entry.type}`)
      .attr('href', entry.url || '#')
      .attr('target', '_blank');

    // Square: header text overlaid, then image
    const top = card.append('div').attr('class', 'grid__item__top');

    // For entries with no image, show type colour as solid bg immediately
    if (!entry.thumbnail) {
      top.style('background-color', TYPE_COLORS[entry.type] || '#dee0e3');
    }

    top.append('div').attr('class', 'grid__item__header').text(entry.title);

    if (entry.thumbnail) {
      top.append('div').attr('class', 'grid__item__image')
        .append('div')
        .append('img')
        .attr('src', entry.thumbnail)
        .attr('alt', entry.title)
        .attr('loading', 'lazy');
    }

    // Below square: creator/description + year/type tags
    const bottom = card.append('div').attr('class', 'grid__item__bottom');
    const text = bottom.append('div').attr('class', 'grid__item__text');
    if (entry.creator) text.append('p').text(entry.creator);
    if (entry.description) text.append('p').text(entry.description);

    const tags = bottom.append('div').attr('class', 'grid__item__tags');
    if (entry.type) {
      tags.append('span').attr('class', `grid__item__tag grid__item__tag--${entry.type}`)
        .text(entry.type);
    }
    if (entry.year) tags.append('span').attr('class', 'grid__item__tag').text(entry.year);
  });
}

document.addEventListener('DOMContentLoaded', init);
