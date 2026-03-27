import { getThreatDetailHref } from '../lib/threats-utils.js';
import { aggregateThreatMapRegions } from '../lib/threat-map-core.js';

const datasetNode = document.getElementById('threat-map-dataset');

if (!datasetNode) {
  throw new Error('Threat Map dataset payload is missing.');
}

const dataset = JSON.parse(datasetNode.textContent ?? '{}');
const state = {
  severity: '',
  model: '',
  vector: '',
  activeRegion: dataset.regions?.[0]?.regionKey ?? '',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function projectAnchor(anchor) {
  return {
    x: ((anchor.lng + 180) / 360) * 100,
    y: ((90 - anchor.lat) / 180) * 100,
  };
}

function filterPoints(points) {
  return points.filter((point) => {
    if (state.severity && point.severity !== state.severity) return false;
    if (state.model && !point.models.includes(state.model)) return false;
    if (state.vector && !point.vectors.includes(state.vector)) return false;
    return true;
  });
}

function filterUnmapped(unmappedThreats) {
  return unmappedThreats.filter((threat) => {
    if (state.severity && threat.severity !== state.severity) return false;
    if (state.model && !threat.models.includes(state.model)) return false;
    if (state.vector && !threat.vectors.includes(state.vector)) return false;
    return true;
  });
}

function renderNodes(regions) {
  const container = document.getElementById('threat-map-nodes');
  if (!container) return;

  container.innerHTML = regions
    .map((region) => {
      const point = projectAnchor(region.anchor);
      const size = Math.min(72, 28 + region.threatCount * 8);
      const isActive = region.regionKey === state.activeRegion;

      return `<button
        class="map-region-node ${isActive ? 'active' : ''}"
        data-region-node="${escapeHtml(region.regionKey)}"
        style="left:${point.x}%;top:${point.y}%;width:${size}px;height:${size}px;"
        aria-pressed="${String(isActive)}"
      >
        <span class="map-region-count">${region.threatCount}</span>
        <span class="map-region-label">${escapeHtml(region.regionName)}</span>
      </button>`;
    })
    .join('');
}

function renderRegionDetails(points, regions) {
  const container = document.getElementById('threat-map-region-details');
  if (!container) return;

  const activeRegion = regions.find((region) => region.regionKey === state.activeRegion) ?? regions[0] ?? null;
  state.activeRegion = activeRegion?.regionKey ?? '';

  if (!activeRegion) {
    container.innerHTML = `<section class="threat-map-detail active">
      <div class="threat-map-detail-head">
        <div>
          <div class="page-kicker">Regional detail</div>
          <h2>No mapped regions match the current filters</h2>
        </div>
      </div>
      <div class="page-list">
        <div class="page-list-item">
          <strong>Filter result</strong>
          <p>Adjust severity, model, or vector filters to restore mapped regional coverage.</p>
        </div>
      </div>
    </section>`;
    return;
  }

  const regionPoints = points.filter((point) => point.regionKey === activeRegion.regionKey);
  container.innerHTML = `<section class="threat-map-detail active">
    <div class="threat-map-detail-head">
      <div>
        <div class="page-kicker">Regional detail</div>
        <h2>${escapeHtml(activeRegion.regionName)}</h2>
      </div>
      <span class="page-eyebrow">${activeRegion.threatCount} tracked threats</span>
    </div>

    <div class="info-card-grid">
      <div class="info-card">
        <span>Precision</span>
        <strong>${escapeHtml(activeRegion.precisions.join(', '))}</strong>
        <p>${escapeHtml(activeRegion.anchor.label)} is an approximate map anchor for this region.</p>
      </div>
      <div class="info-card">
        <span>Dominant vectors</span>
        <strong>${escapeHtml(activeRegion.dominantVectors.join(', '))}</strong>
        <p>Vectors reflect the mapped threats that remain after the current filters are applied.</p>
      </div>
      <div class="info-card">
        <span>Affected models</span>
        <strong>${escapeHtml(activeRegion.affectedModels.join(', '))}</strong>
        <p>Model tags are pulled directly from the filtered mapped threats in this region.</p>
      </div>
      <div class="info-card">
        <span>Observation count</span>
        <strong>${activeRegion.pointCount}</strong>
        <p>Multiple observations can still roll up into the same region when the signal remains coarse.</p>
      </div>
    </div>

    <div class="threat-map-section">
      <div class="page-kicker">Top threats</div>
      <div class="page-list">
        ${activeRegion.topThreats.map((threat) => `<div class="page-list-item">
          <strong><a class="drawer-link" href="${getThreatDetailHref({ title: threat.title })}">${escapeHtml(threat.title)}</a></strong>
          <p>Severity ${escapeHtml(threat.severity)} · blended score ${threat.score.toFixed(1)}</p>
        </div>`).join('')}
      </div>
    </div>

    <div class="threat-map-section">
      <div class="page-kicker">Observation notes</div>
      <div class="page-list">
        ${regionPoints.map((point) => `<div class="page-list-item">
          <strong><a class="drawer-link" href="${getThreatDetailHref({ title: point.threatTitle })}">${escapeHtml(point.threatTitle)}</a></strong>
          <p>${escapeHtml(point.summary)}<br />Scope: ${escapeHtml(point.scope)} · Quality: ${escapeHtml(point.sourceQuality)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

function renderUnmapped(unmappedThreats) {
  const container = document.getElementById('threat-map-unmapped');
  if (!container) return;

  const grouped = unmappedThreats.reduce((map, threat) => {
    const bucket = map.get(threat.reasonCategory) ?? [];
    bucket.push(threat);
    map.set(threat.reasonCategory, bucket);
    return map;
  }, new Map());

  const groups = [...grouped.entries()];

  container.innerHTML = `<div class="page-kicker">Unmapped coverage</div>
    <div class="page-list-item">
      <strong>${unmappedThreats.length} threats remain off-map after filters</strong>
      <p>Threats stay off the map until observed infrastructure or exposure geography can be stated defensibly. The categories below explain why the current records remain unmapped.</p>
    </div>
    ${groups.map(([category, threats]) => `<div class="page-list-item">
      <strong>${escapeHtml(category)} (${threats.length})</strong>
      <p>${escapeHtml(threats[0].reasonDetail)}</p>
      <div class="page-list threat-map-unmapped-group">
        ${threats.map((threat) => `<div class="page-list-item">
          <strong><a class="drawer-link" href="${getThreatDetailHref({ title: threat.threatTitle })}">${escapeHtml(threat.threatTitle)}</a></strong>
          <p>Severity ${escapeHtml(threat.severity)} · Status ${escapeHtml(threat.status)}</p>
        </div>`).join('')}
      </div>
    </div>`).join('')}`;
}

function renderFilterSummary(points, unmappedThreats) {
  const countNode = document.getElementById('threat-map-filter-count');
  const chipsNode = document.getElementById('threat-map-active-filters');
  if (countNode) countNode.textContent = `${points.length} mapped observations`;
  if (!chipsNode) return;

  const chips = [
    state.severity ? `Severity: ${state.severity}` : '',
    state.model ? `Model: ${state.model}` : '',
    state.vector ? `Vector: ${state.vector}` : '',
    !state.severity && !state.model && !state.vector ? 'All mapped threats' : '',
    unmappedThreats.length ? `${unmappedThreats.length} unmapped remain` : 'No unmapped records in current filter',
  ].filter(Boolean);

  chipsNode.innerHTML = chips.map((chip) => `<span class="future-chip">${escapeHtml(chip)}</span>`).join('');
}

function render() {
  const filteredPoints = filterPoints(dataset.points ?? []);
  const filteredRegions = aggregateThreatMapRegions(filteredPoints);
  const filteredUnmapped = filterUnmapped(dataset.unmappedThreats ?? []);

  if (!filteredRegions.some((region) => region.regionKey === state.activeRegion)) {
    state.activeRegion = filteredRegions[0]?.regionKey ?? '';
  }

  renderNodes(filteredRegions);
  renderRegionDetails(filteredPoints, filteredRegions);
  renderUnmapped(filteredUnmapped);
  renderFilterSummary(filteredPoints, filteredUnmapped);

  document.querySelectorAll('[data-region-node]').forEach((node) => {
    node.addEventListener('click', () => {
      state.activeRegion = node.dataset.regionNode ?? '';
      render();
    });
  });
}

function bindSelect(id, key) {
  const node = document.getElementById(id);
  if (!node) return;
  node.addEventListener('change', () => {
    state[key] = node.value;
    render();
  });
}

bindSelect('threat-map-filter-severity', 'severity');
bindSelect('threat-map-filter-model', 'model');
bindSelect('threat-map-filter-vector', 'vector');
render();
