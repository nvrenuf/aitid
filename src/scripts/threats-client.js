import { shortModel } from '../lib/dashboard-utils.js';
import {
  DEFAULT_THREAT_SORT,
  applyThreatFilters,
  sortThreatCollection,
  summarizeThreatResultSet,
} from '../lib/threats-utils.js';

const severityClasses = {
  critical: 'b-crit',
  high: 'b-high',
  medium: 'b-med',
  low: 'b-low',
  info: 'b-info',
};

const statusClasses = {
  active: 'b-high',
  investigating: 'b-med',
  mitigated: 'b-low',
  patched: 'b-low',
  disputed: 'b-gray',
};

const state = {
  query: '',
  severity: '',
  model: '',
  vector: '',
  status: '',
  sort: DEFAULT_THREAT_SORT,
};

function readCorpus() {
  const raw = document.getElementById('threats-corpus')?.textContent ?? '[]';
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const allThreats = readCorpus();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function badge(text, className) {
  return `<span class="badge ${className}">${escapeHtml(text)}</span>`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function resultCard(threat) {
  const models = threat.models.map((model) => badge(shortModel(model), 'b-model')).join('');
  const vectors = threat.vectors.map((vector) => badge(vector, 'b-gray')).join('');
  const ttpIds = threat.ttps.map((ttp) => `<span class="ttp-tag">${escapeHtml(ttp.id)}</span>`).join('');
  const patchLine = threat.patchVersion ? `Patch ${escapeHtml(threat.patchVersion)}` : 'Patch not listed';

  return `
    <article class="threat-row">
      <div class="threat-row-head">
        <div>
          <div class="threat-row-title">${escapeHtml(threat.title)}</div>
          <div class="threat-row-source">${escapeHtml(threat.source)}</div>
        </div>
        <div class="tc-score-card">
          <span class="tc-score-label">Blended score</span>
          <span class="score">${threat.score.blended.toFixed(1)}</span>
        </div>
      </div>

      <div class="threat-row-meta">
        <div class="tc-meta">
          ${badge(threat.severity.toUpperCase(), severityClasses[threat.severity] ?? 'b-gray')}
          ${badge(threat.status, statusClasses[threat.status] ?? 'b-gray')}
          ${badge(threat.type, 'b-gray')}
          ${threat.cve ? `<span class="ttp-tag">${escapeHtml(threat.cve)}</span>` : ''}
        </div>
        <div class="tc-meta-line">Published ${formatDate(threat.publishedAt)} | Updated ${formatDate(threat.updatedAt)}</div>
      </div>

      <div class="threat-row-summary">${escapeHtml(threat.description)}</div>

      <div class="threat-row-groups">
        <div class="threat-row-band">
          <strong>Model exposure</strong>
          <div class="tc-meta">${models}</div>
        </div>
        <div class="threat-row-band">
          <strong>Vectors and TTPs</strong>
          <div class="tc-meta">${vectors}${ttpIds}</div>
        </div>
      </div>

      <div class="threat-row-foot">
        <span>${patchLine}</span>
        <span>${threat.iocs.length} IOC${threat.iocs.length === 1 ? '' : 's'} | ${threat.mitigations.length} mitigation actions</span>
      </div>
    </article>
  `;
}

function renderActiveFilters(filters) {
  const container = document.getElementById('threats-active-filters');
  if (!container) return;

  const chips = [
    filters.query ? `Search: ${filters.query}` : '',
    filters.severity ? `Severity: ${filters.severity}` : '',
    filters.model ? `Model: ${shortModel(filters.model)}` : '',
    filters.vector ? `Vector: ${filters.vector}` : '',
    filters.status ? `Status: ${filters.status}` : '',
  ].filter(Boolean);

  container.innerHTML = chips.length
    ? chips.map((chip) => `<span class="future-chip">${escapeHtml(chip)}</span>`).join('')
    : '<span class="future-chip">All threats</span>';
}

function renderSummary(summary) {
  const total = document.querySelector('[data-threat-total]');
  const active = document.querySelector('[data-threat-active]');
  const critical = document.querySelector('[data-threat-critical]');
  const results = document.querySelector('[data-results-count]');
  const newest = document.querySelector('[data-newest-published]');

  if (total) total.textContent = String(summary.total);
  if (active) active.textContent = String(summary.activeCount);
  if (critical) critical.textContent = String(summary.criticalCount);
  if (results) results.textContent = String(summary.total);
  if (newest) newest.textContent = summary.newestPublishedAt ? formatDate(summary.newestPublishedAt) : 'None';
}

function renderThreats() {
  const results = document.getElementById('threats-results');
  if (!results) return;

  const filtered = applyThreatFilters(allThreats, state);
  const sorted = sortThreatCollection(filtered, state.sort);
  const summary = summarizeThreatResultSet(filtered);

  renderSummary(summary);
  renderActiveFilters(state);

  results.innerHTML = sorted.length
    ? sorted.map(resultCard).join('')
    : `<div class="threat-empty">
        No threats match the current query. Clear one or more filters to return to the full corpus.
      </div>`;
}

function bindInput(id, key) {
  const element = document.getElementById(id);
  if (!element) return;

  element.addEventListener('input', () => {
    state[key] = element.value.trim();
    renderThreats();
  });

  element.addEventListener('change', () => {
    state[key] = element.value.trim();
    renderThreats();
  });
}

bindInput('threats-search', 'query');
bindInput('threats-severity', 'severity');
bindInput('threats-model', 'model');
bindInput('threats-vector', 'vector');
bindInput('threats-status', 'status');
bindInput('threats-sort', 'sort');
renderThreats();
