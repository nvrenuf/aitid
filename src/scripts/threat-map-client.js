import { getThreatDetailHref } from '../lib/threats-utils.js';
import { aggregateThreatMapRegions } from '../lib/threat-map-core.js';
import { projectThreatMapAnchor } from '../lib/threat-map-projection.js';

const datasetNode = document.getElementById('threat-map-dataset');
const state = {
  severity: '',
  model: '',
  vector: '',
  activeRegion: '',
};

function readDataset(node) {
  if (!node) {
    return { points: [], regions: [], unmappedThreats: [] };
  }

  try {
    const parsed = JSON.parse(node.textContent ?? '{}');
    return {
      points: parsed.points ?? [],
      regions: parsed.regions ?? [],
      unmappedThreats: parsed.unmappedThreats ?? [],
    };
  } catch {
    return { points: [], regions: [], unmappedThreats: [] };
  }
}

const dataset = readDataset(datasetNode);
state.activeRegion = dataset.regions[0]?.regionKey ?? '';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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
      const point = projectThreatMapAnchor(region.anchor);
      const size = Math.min(72, 28 + region.threatCount * 8);
      const isActive = region.regionKey === state.activeRegion;

      return `<button type="button"
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

function renderStageFallback(title, copy, regions = dataset.regions) {
  const stage = document.getElementById('threat-map-stage');
  const fallback = document.getElementById('threat-map-stage-fallback');
  const titleNode = document.getElementById('threat-map-stage-fallback-title');
  const copyNode = document.getElementById('threat-map-stage-fallback-copy');
  const listNode = document.getElementById('threat-map-stage-fallback-list');

  if (stage) stage.dataset.mapState = 'fallback';
  if (titleNode) titleNode.textContent = title;
  if (copyNode) copyNode.textContent = copy;
  if (listNode) {
    listNode.innerHTML = regions.length
      ? regions.slice(0, 4).map((region) => `<div class="page-list-item">
          <strong>${escapeHtml(region.regionName)}</strong>
          <p>${region.threatCount} tracked threats · ${region.pointCount} mapped observations · ${escapeHtml(region.anchor.label)}</p>
        </div>`).join('')
      : `<div class="page-list-item">
          <strong>No regional summary available</strong>
          <p>The current dataset does not contain any defensible regional observations to display.</p>
        </div>`;
  }
  if (fallback) fallback.hidden = false;
}

function clearStageFallback() {
  const stage = document.getElementById('threat-map-stage');
  const fallback = document.getElementById('threat-map-stage-fallback');

  if (stage) stage.dataset.mapState = 'ready';
  if (fallback) fallback.hidden = true;
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
          <p class="threat-map-detail-copy">Adjust the current filters to restore mapped regional posture in the detail panel.</p>
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
        <p class="threat-map-detail-copy">Approximate regional posture based on the mapped observations currently in scope.</p>
      </div>
      <div class="threat-map-detail-stat">
        <span>Tracked threats</span>
        <strong>${activeRegion.threatCount}</strong>
        <p>${activeRegion.pointCount} mapped observations</p>
      </div>
    </div>

    <div class="info-card-grid threat-map-detail-grid">
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

    <div class="threat-map-detail-columns">
      <section class="threat-map-section-card">
        <div class="page-kicker">Top threats</div>
        <div class="page-list">
          ${activeRegion.topThreats.map((threat) => `<div class="page-list-item">
            <strong><a class="drawer-link" href="${getThreatDetailHref({ title: threat.title })}">${escapeHtml(threat.title)}</a></strong>
            <p>Severity ${escapeHtml(threat.severity)} · blended score ${threat.score.toFixed(1)}</p>
          </div>`).join('')}
        </div>
      </section>

      <section class="threat-map-section-card">
        <div class="page-kicker">Observation notes</div>
        <div class="page-list">
          ${regionPoints.map((point) => `<div class="page-list-item">
            <strong><a class="drawer-link" href="${getThreatDetailHref({ title: point.threatTitle })}">${escapeHtml(point.threatTitle)}</a></strong>
            <p>${escapeHtml(point.summary)}<br />Scope: ${escapeHtml(point.scope)} · Quality: ${escapeHtml(point.sourceQuality)}</p>
          </div>`).join('')}
        </div>
      </section>
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
  const stage = document.getElementById('threat-map-stage');
  const nodes = document.getElementById('threat-map-nodes');
  const filteredPoints = filterPoints(dataset.points);
  const filteredRegions = aggregateThreatMapRegions(filteredPoints);
  const filteredUnmapped = filterUnmapped(dataset.unmappedThreats);

  if (!stage || !nodes) {
    renderStageFallback(
      'Projected map unavailable',
      'The map stage is unavailable, so the regional summary remains visible while the visualization is degraded.',
    );
    renderRegionDetails(dataset.points, dataset.regions);
    renderUnmapped(dataset.unmappedThreats);
    renderFilterSummary([], dataset.unmappedThreats);
    return;
  }

  if (!filteredRegions.some((region) => region.regionKey === state.activeRegion)) {
    state.activeRegion = filteredRegions[0]?.regionKey ?? '';
  }

  if (filteredRegions.length === 0) {
    renderStageFallback(
      'No mapped regions match the current filters',
      'Adjust severity, model, or vector filters to restore mapped regional coverage. Regional summaries remain available here when no markers qualify.',
    );
  } else {
    clearStageFallback();
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

function renderWhenStageReady() {
  const stage = document.getElementById('threat-map-stage');
  if (!stage) {
    renderStageFallback(
      'Projected map unavailable',
      'The map stage is unavailable, so the regional summary remains visible while the visualization is degraded.',
    );
    renderRegionDetails(dataset.points, dataset.regions);
    renderUnmapped(dataset.unmappedThreats);
    renderFilterSummary([], dataset.unmappedThreats);
    return;
  }

  let attempts = 0;
  const maxAttempts = 12;

  const attemptRender = () => {
    if (stage.clientWidth > 0 && stage.clientHeight > 0) {
      render();
      return;
    }

    attempts += 1;
    if (attempts >= maxAttempts) {
      renderStageFallback(
        'Projected map unavailable',
        'The map stage could not be measured, so the regional summary remains visible while the visualization is degraded.',
      );
      renderRegionDetails(dataset.points, dataset.regions);
      renderUnmapped(dataset.unmappedThreats);
      renderFilterSummary([], dataset.unmappedThreats);
      return;
    }

    window.requestAnimationFrame(attemptRender);
  };

  window.requestAnimationFrame(attemptRender);
}

function bindSelect(id, key) {
  const node = document.getElementById(id);
  if (!node) return;
  node.addEventListener('change', () => {
    state[key] = node.value;
    render();
  });
}

function resetFilters() {
  state.severity = '';
  state.model = '';
  state.vector = '';

  const severity = document.getElementById('threat-map-filter-severity');
  const model = document.getElementById('threat-map-filter-model');
  const vector = document.getElementById('threat-map-filter-vector');

  if (severity) severity.value = '';
  if (model) model.value = '';
  if (vector) vector.value = '';

  render();
}

bindSelect('threat-map-filter-severity', 'severity');
bindSelect('threat-map-filter-model', 'model');
bindSelect('threat-map-filter-vector', 'vector');
document.getElementById('threat-map-reset-filters')?.addEventListener('click', resetFilters);
renderWhenStageReady();
