import { shortModel } from '../lib/dashboard-utils.js';
import {
  DEFAULT_THREAT_SORT,
  applyThreatFilters,
  getThreatDetailHref,
  sortThreatCollection,
  summarizeThreatResultSet,
} from '../lib/threats-utils.js';
import { formatEasternDate } from '../lib/time.js';

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
  mitigated: 'b-gray',
  patched: 'b-gray',
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
  return formatEasternDate(value);
}

function formatThreatAge(value) {
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return 'Unknown age';

  const diffMs = Date.now() - publishedAt.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / 86400000));

  if (diffDays === 0) return 'Published today';
  if (diffDays === 1) return '1 day old';
  if (diffDays < 14) return `${diffDays} days old`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week old';
  if (diffWeeks < 8) return `${diffWeeks} weeks old`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths <= 1) return '1 month old';
  return `${diffMonths} months old`;
}

function resultCard(threat) {
  const models = threat.models.map((model) => badge(shortModel(model), 'b-model')).join('');
  const vectors = threat.vectors.map((vector) => badge(vector, 'b-gray')).join('');
  const ttpIds = threat.ttps.map((ttp) => `<span class="ttp-tag">${escapeHtml(ttp.id)}</span>`).join('');
  const patchLine = threat.patchVersion ? `Patch ${escapeHtml(threat.patchVersion)}` : 'Patch not listed';
  const iocLine = `${threat.iocs.length} IOC${threat.iocs.length === 1 ? '' : 's'}`;
  const detailHref = getThreatDetailHref(threat);

  return `
    <article class="threat-row ${escapeHtml(threat.severity)}">
      <div class="threat-row-top">
        <div class="tc-meta">
          ${badge(threat.severity.toUpperCase(), severityClasses[threat.severity] ?? 'b-gray')}
          ${badge(threat.status, statusClasses[threat.status] ?? 'b-gray')}
          ${badge(threat.type, 'b-gray')}
          ${threat.cve ? `<span class="ttp-tag">${escapeHtml(threat.cve)}</span>` : ''}
        </div>
        <div class="threat-row-date">Published ${formatDate(threat.publishedAt)}</div>
      </div>

      <div class="threat-row-main">
        <div>
          <div class="threat-row-title"><a class="threat-row-link" href="${detailHref}">${escapeHtml(threat.title)}</a></div>
          <div class="threat-row-meta-line"><strong>${escapeHtml(threat.source)}</strong> &middot; ${formatThreatAge(threat.publishedAt)}</div>
          <div class="threat-row-meta-line">${threat.models.length} model targets &middot; ${threat.vectors.length} vectors &middot; ${iocLine}</div>
        </div>
        <div class="threat-row-score">
          <span class="threat-row-score-label">Blended score</span>
          <span class="threat-row-score-value ${escapeHtml(threat.severity)}">${threat.score.blended.toFixed(1)}</span>
        </div>
      </div>

      <div class="threat-row-summary">${escapeHtml(threat.description)}</div>

      <div class="threat-row-bands">
        <div class="threat-row-band">
          <strong>Affected models</strong>
          <div class="tc-meta">${models}</div>
        </div>
        <div class="threat-row-band">
          <strong>Operational context</strong>
          <div class="tc-meta">${vectors}${ttpIds}</div>
        </div>
      </div>

      <div class="threat-row-foot">
        <span>${patchLine} &middot; Updated ${formatDate(threat.updatedAt)}</span>
        <span>${threat.mitigations.length} mitigation action${threat.mitigations.length === 1 ? '' : 's'}</span>
        <a class="expand-btn" href="${detailHref}">Open detail page</a>
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
  const resultsCritical = document.querySelector('[data-results-critical]');

  if (total) total.textContent = String(summary.total);
  if (active) active.textContent = String(summary.activeCount);
  if (critical) critical.textContent = String(summary.criticalCount);
  if (results) results.textContent = String(summary.total);
  if (newest) newest.textContent = summary.newestPublishedAt ? formatDate(summary.newestPublishedAt) : 'None';
  if (resultsCritical) resultsCritical.textContent = String(summary.criticalCount);
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

function resetWorkbench() {
  state.query = '';
  state.severity = '';
  state.model = '';
  state.vector = '';
  state.status = '';
  state.sort = DEFAULT_THREAT_SORT;

  const search = document.getElementById('threats-search');
  const severity = document.getElementById('threats-severity');
  const model = document.getElementById('threats-model');
  const vector = document.getElementById('threats-vector');
  const status = document.getElementById('threats-status');
  const sort = document.getElementById('threats-sort');

  if (search) search.value = '';
  if (severity) severity.value = '';
  if (model) model.value = '';
  if (vector) vector.value = '';
  if (status) status.value = '';
  if (sort) sort.value = DEFAULT_THREAT_SORT;

  renderThreats();
}

bindInput('threats-search', 'query');
bindInput('threats-severity', 'severity');
bindInput('threats-model', 'model');
bindInput('threats-vector', 'vector');
bindInput('threats-status', 'status');
bindInput('threats-sort', 'sort');
document.getElementById('threats-reset')?.addEventListener('click', resetWorkbench);
renderThreats();
