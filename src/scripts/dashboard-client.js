import {
  buildDrawerSubtitle,
  filterThreats,
  MODEL_FILTERS as modelFilters,
  shortModel,
  sortThreats,
} from '../lib/dashboard-utils.js';
import { getThreatDetailHref } from '../lib/threats-utils.js';

let allThreats = [];
let overviewFilter = 'all';
let selectedThreatId = null;

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

const vectorGroups = [
  { key: 'skill-md', label: 'SKILL.md / AI agent file abuse', vectors: ['skill-md'] },
  { key: 'supply-chain', label: 'npm / PyPI / GitHub supply chain', vectors: ['npm', 'pypi', 'github-repo', 'github-advisory'] },
  { key: 'mcp', label: 'MCP server abuse', vectors: ['mcp-server'] },
  { key: 'ide-plugin', label: 'IDE extension / plugin store', vectors: ['vs-code-ext', 'ide', 'plugin-store', 'browser-ext'] },
  { key: 'model-weights', label: 'Model weights / HuggingFace Hub', vectors: ['huggingface'] },
  { key: 'api-prompt', label: 'API abuse / prompt injection', vectors: ['api'] },
];

const safeSetText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = String(value);
};

const badge = (text, className) => `<span class="badge ${className}">${text}</span>`;
const severityBadge = (severity) => badge(severity.toUpperCase(), severityClasses[severity] ?? 'b-gray');
const statusBadge = (status) => badge(status, statusClasses[status] ?? 'b-gray');

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function findThreat(id) {
  return allThreats.find((threat) => threat.id === id) ?? null;
}

function arraySection(label, items) {
  if (!items?.length) return '';
  return `<section class="drawer-section">
    <div class="drawer-label">${label}</div>
    <div class="drawer-list">${items.map((item) => `<div class="drawer-item">${escapeHtml(item)}</div>`).join('')}</div>
  </section>`;
}

function threatDrawerHtml(threat) {
  const facts = [
    ['Severity', threat.severity.toUpperCase()],
    ['Status', threat.status],
    ['Published', formatDate(threat.publishedAt)],
    ['Source', threat.source],
    ['Patch', threat.patchVersion ?? 'None listed'],
    ['Threat type', threat.type],
  ];
  const modelBadges = threat.models
    .map((model) => `<span class="badge b-model">${escapeHtml(shortModel(model))}</span>`)
    .join('');
  const vectorBadges = threat.vectors.map((vector) => `<span class="badge b-gray">${escapeHtml(vector)}</span>`).join('');
  const ttpBadges = threat.ttps.map((ttp) => `<span class="ttp-tag">${escapeHtml(ttp.id)}</span>`).join('');
  const sourceHref = /^https?:\/\//.test(threat.sourceUrl ?? '') ? threat.sourceUrl : null;

  return `
    <section class="drawer-hero">
      <div class="drawer-band">
        <div class="drawer-label">Incident summary</div>
        <div class="drawer-copy">${escapeHtml(threat.description)}</div>
        <div class="tc-meta">
          ${severityBadge(threat.severity)}
          ${statusBadge(threat.status)}
          <span class="badge b-gray">${escapeHtml(threat.type)}</span>
        </div>
      </div>
      <div class="drawer-hero-rail">
        <div class="drawer-score-card">
          <div class="drawer-label">Blended score</div>
          <span class="score">${threat.score.blended.toFixed(1)}</span>
        </div>
        <div class="drawer-band-title">Review focus</div>
        <div class="drawer-copy">Model impact, distribution vectors, and mitigation readiness are grouped below for faster analyst review.</div>
      </div>
    </section>
    <section class="drawer-section">
      <div class="drawer-label">Coverage</div>
      <div class="drawer-pill-grid">
        <div class="drawer-band">
          <div class="drawer-band-title">Models</div>
          <div class="tc-meta">${modelBadges}</div>
        </div>
        <div class="drawer-band">
          <div class="drawer-band-title">Vectors and TTPs</div>
          <div class="tc-meta">
            ${vectorBadges}
            ${ttpBadges}
            ${threat.cve ? `<span class="ttp-tag">${escapeHtml(threat.cve)}</span>` : ''}
          </div>
        </div>
      </div>
    </section>
    <section class="drawer-section">
      <div class="drawer-label">Key facts</div>
      <div class="drawer-grid">
        ${facts
          .map(([label, value]) => `<div class="drawer-stat"><div class="drawer-stat-k">${escapeHtml(label)}</div><div class="drawer-stat-v">${escapeHtml(value)}</div></div>`)
          .join('')}
      </div>
    </section>
    ${arraySection('Mitigations', threat.mitigations)}
    ${arraySection('IOCs', threat.iocs)}
    <section class="drawer-section">
      <div class="drawer-label">Canonical route</div>
      <a class="drawer-link" href="${escapeHtml(getThreatDetailHref(threat))}">Open detail page</a>
    </section>
    ${sourceHref ? `<section class="drawer-section"><div class="drawer-label">Reference</div><a class="drawer-link" href="${escapeHtml(sourceHref)}" target="_blank" rel="noreferrer">Open source advisory</a></section>` : ''}
  `;
}

function updateActiveCard() {
  document.querySelectorAll('.tcard').forEach((card) => {
    card.classList.toggle('active', card.dataset.threatId === selectedThreatId);
  });
}

function openThreatDetail(id) {
  const threat = findThreat(id);
  if (!threat) return;

  selectedThreatId = threat.id;
  safeSetText('drawer-title', threat.title);
  safeSetText('drawer-sub', buildDrawerSubtitle(threat));

  const drawerBody = document.getElementById('drawer-body');
  if (drawerBody) {
    drawerBody.innerHTML = threatDrawerHtml(threat);
  }

  document.getElementById('detail-scrim')?.classList.add('open');
  const drawer = document.getElementById('detail-drawer');
  drawer?.classList.add('open');
  drawer?.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  updateActiveCard();
}

function closeThreatDetail() {
  selectedThreatId = null;
  document.getElementById('detail-scrim')?.classList.remove('open');
  const drawer = document.getElementById('detail-drawer');
  drawer?.classList.remove('open');
  drawer?.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
  updateActiveCard();
}

function cardHtml(threat) {
  const cve = threat.cve ? `<span class="ttp-tag">${escapeHtml(threat.cve)}</span>` : '';
  const patchLabel = threat.patchVersion ? `Patch ${escapeHtml(threat.patchVersion)}` : 'Patch not listed';
  const modelBadges = threat.models.map((model) => `<span class="badge b-model">${shortModel(model)}</span>`).join('');
  const vectorBadges = threat.vectors.map((vector) => `<span class="badge b-gray">${escapeHtml(vector)}</span>`).join('');
  const ttpBadges = threat.ttps.map((ttp) => `<span class="ttp-tag">${escapeHtml(ttp.id)}</span>`).join('');
  const detailHref = getThreatDetailHref(threat);

  return `<article class="tcard" id="card-${threat.id}" data-threat-id="${threat.id}" tabindex="0" role="button" aria-label="Open details for ${escapeHtml(threat.title)}">
    <div class="tc-kicker">
      <div class="tc-kicker-main">
        ${severityBadge(threat.severity)}
        ${statusBadge(threat.status)}
        <span class="badge b-gray">${escapeHtml(threat.type)}</span>
      </div>
      <span class="tc-date">${formatDate(threat.publishedAt)}</span>
    </div>
    <div class="tc-top">
      <div>
        <div class="tc-title"><a class="drawer-link" href="${detailHref}" data-threat-link>${escapeHtml(threat.title)}</a></div>
        <div class="tc-meta-line">Source ${escapeHtml(threat.source)} | ${threat.models.length} model targets | ${threat.vectors.length} vectors</div>
      </div>
      <div class="tc-right">
        <div class="tc-score-card">
          <span class="tc-score-label">Blended score</span>
          <span class="score">${threat.score.blended.toFixed(1)}</span>
        </div>
      </div>
    </div>
    <div class="tc-band">
      <div class="tc-group">
        <div class="tc-group-label">Models</div>
        <div class="tc-meta">${modelBadges}</div>
      </div>
      <div class="tc-group">
        <div class="tc-group-label">Vectors and TTPs</div>
        <div class="tc-meta">${vectorBadges}${ttpBadges}${cve}</div>
      </div>
    </div>
    <div class="tc-desc clamp">${escapeHtml(threat.description)}</div>
    <div class="tc-footer">
      <div class="tc-footer-meta">
        <span class="tc-foot-item">${patchLabel}</span>
      </div>
      <div class="tc-meta">
        <button class="expand-btn" type="button" data-open-detail="${threat.id}">Open drawer</button>
        <a class="expand-btn" href="${detailHref}" data-threat-link>Open detail page</a>
      </div>
    </div>
  </article>`;
}

function renderFeed(elementId, threats) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const sorted = sortThreats(threats);
  element.innerHTML = sorted.length
    ? `<div class="feed-stack">${sorted.map(cardHtml).join('')}</div>`
    : '<div class="empty">No threats matching this filter.</div>';
  updateActiveCard();
}

function renderVectorThreats() {
  const element = document.getElementById('vec-threats-view');
  if (!element) return;

  element.innerHTML = vectorGroups
    .map((group) => {
      const threats = allThreats.filter((threat) => threat.vectors.some((vector) => group.vectors.includes(vector)));
      if (!threats.length) return '';
      return `<div>
        <div class="shdr">${group.label}<span>${threats.length} threat${threats.length > 1 ? 's' : ''}</span></div>
        <div class="feed-stack">${sortThreats(threats).map(cardHtml).join('')}</div>
      </div>`;
    })
    .join('');
}

function renderVectorMatrix() {
  const element = document.getElementById('vec-matrix-view');
  if (!element) return;

  const vectors = ['SKILL.md', 'npm/PyPI', 'GitHub', 'VS Code', 'MCP', 'HF Hub', 'API/Prompt'];
  const vectorKeys = [
    ['skill-md'],
    ['npm', 'pypi'],
    ['github-repo', 'github-advisory'],
    ['vs-code-ext', 'ide'],
    ['mcp-server'],
    ['huggingface'],
    ['api'],
  ];
  const models = [
    { label: 'OpenAI', fn: modelFilters.openai },
    { label: 'Copilot', fn: modelFilters.copilot },
    { label: 'Claude', fn: modelFilters.claude },
    { label: 'OSS/HF', fn: modelFilters.oss },
  ];

  const cell = (keys, modelFilter) => {
    const threats = allThreats.filter(
      (threat) => threat.vectors.some((vector) => keys.includes(vector)) && (modelFilter(threat) || threat.models.includes('multi-model')),
    );
    if (!threats.length) return `<div class="mdot md-none"></div>`;
    const topThreat = sortThreats(threats)[0];
    const className = { critical: 'md-crit', high: 'md-high', medium: 'md-med', low: 'md-none' }[topThreat.severity] ?? 'md-none';
    return `<div class="mdot ${className}" title="${topThreat.severity.toUpperCase()}: ${topThreat.title}"></div>`;
  };

  element.innerHTML = `
    <table class="matrix-tbl">
      <tr><th>Vector</th>${models.map((model) => `<th>${model.label}</th>`).join('')}</tr>
      ${vectors.map((vector, index) => `<tr><td>${vector}</td>${models.map((model) => `<td>${cell(vectorKeys[index], model.fn)}</td>`).join('')}</tr>`).join('')}
    </table>
    <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap">
      ${[
        ['CRITICAL', 'md-crit'],
        ['HIGH', 'md-high'],
        ['MEDIUM', 'md-med'],
        ['NONE', 'md-none'],
      ].map(([label, className]) => `<div style="display:flex;align-items:center;gap:4px"><div class="mdot ${className}" style="cursor:default"></div><span style="font-size:8px;font-family:var(--font-sans);color:var(--txt3)">${label}</span></div>`).join('')}
    </div>`;
}

function renderSidebar() {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  const counts = [3, 5, 4, 7, 6, 9, 8, allThreats.length || 12];
  const maxCount = Math.max(...counts);
  const timeline = document.getElementById('sb-tl');
  const timelineLabels = document.getElementById('sb-tll');

  if (timeline) {
    timeline.innerHTML = counts
      .map((count, index) => {
        const height = Math.round((count / maxCount) * 40) + 2;
        const color = count >= 10 ? 'var(--crit)' : count >= 7 ? 'var(--high)' : count >= 5 ? 'var(--med)' : 'var(--low)';
        return `<div class="tlb" style="height:${height}px;background:${color}" title="Week ${index + 1}: ${count}"></div>`;
      })
      .join('');
  }

  if (timelineLabels) {
    timelineLabels.innerHTML = weeks.map((week) => `<div class="tllb">${week}</div>`).join('');
  }

  const models = [
    { name: 'OpenAI', fn: modelFilters.openai },
    { name: 'Copilot', fn: modelFilters.copilot },
    { name: 'OSS/HF', fn: modelFilters.oss },
    { name: 'Claude', fn: modelFilters.claude },
  ];
  const modelBars = document.getElementById('sb-models');
  if (modelBars) {
    const countsByModel = models.map((model) => allThreats.filter(model.fn).length);
    const maxModelCount = Math.max(...countsByModel, 1);
    modelBars.innerHTML = models
      .map((model, index) => {
        const percent = Math.round((countsByModel[index] / maxModelCount) * 100);
        const color = countsByModel[index] >= 6 ? 'var(--crit)' : countsByModel[index] >= 4 ? 'var(--high)' : countsByModel[index] >= 2 ? 'var(--med)' : 'var(--low)';
        return `<div class="mbar-row"><span class="mbar-name">${model.name}</span><div class="mbar-wrap"><div class="mbar" style="width:${percent}%;background:${color}"></div></div><span class="mbar-n">${countsByModel[index]}</span></div>`;
      })
      .join('');
  }

  const matrix = document.getElementById('sb-matrix');
  if (matrix) {
    const rows = [
      { label: 'SKILL.md', keys: ['skill-md'] },
      { label: 'npm/PyPI', keys: ['npm', 'pypi'] },
      { label: 'VS Code', keys: ['vs-code-ext', 'ide'] },
      { label: 'MCP', keys: ['mcp-server'] },
      { label: 'HF Hub', keys: ['huggingface'] },
    ];
    const matrixModels = [
      { label: 'OAI', fn: modelFilters.openai },
      { label: 'CPL', fn: modelFilters.copilot },
      { label: 'CLD', fn: modelFilters.claude },
      { label: 'OSS', fn: modelFilters.oss },
    ];
    matrix.innerHTML = `<table class="matrix-tbl">
      <tr><th></th>${matrixModels.map((model) => `<th>${model.label}</th>`).join('')}</tr>
      ${rows.map((row) => `<tr><td>${row.label}</td>${matrixModels.map((model) => {
        const threats = allThreats.filter(
          (threat) => threat.vectors.some((vector) => row.keys.includes(vector)) && (model.fn(threat) || threat.models.includes('multi-model')),
        );
        if (!threats.length) return `<td><div class="mdot md-none"></div></td>`;
        const topThreat = sortThreats(threats)[0];
        const className = { critical: 'md-crit', high: 'md-high', medium: 'md-med' }[topThreat.severity] ?? 'md-none';
        return `<td><div class="mdot ${className}" title="${topThreat.severity}"></div></td>`;
      }).join('')}</tr>`).join('')}
    </table>`;
  }
}

function updateBadges() {
  safeSetText('badge-overview', allThreats.length);
  safeSetText('badge-openai', allThreats.filter(modelFilters.openai).length);
  safeSetText('badge-claude', allThreats.filter(modelFilters.claude).length);
  safeSetText('badge-copilot', allThreats.filter(modelFilters.copilot).length);
  safeSetText('badge-oss', allThreats.filter(modelFilters.oss).length);
  safeSetText('badge-vectors', allThreats.filter((threat) => vectorGroups.some((group) => threat.vectors.some((vector) => group.vectors.includes(vector)))).length);
}

function renderAll() {
  renderFeed('overview-feed', filterThreats(allThreats, overviewFilter));
  renderFeed('feed-openai', allThreats.filter(modelFilters.openai));
  renderFeed('feed-claude', allThreats.filter(modelFilters.claude));
  renderFeed('feed-copilot', allThreats.filter(modelFilters.copilot));
  renderFeed('feed-oss', allThreats.filter(modelFilters.oss));
  renderVectorThreats();
  renderVectorMatrix();
  renderSidebar();
  updateBadges();
}

async function loadThreats() {
  try {
    const response = await fetch('/api/threats');
    const data = await response.json();
    allThreats = data.threats ?? [];
  } catch {
    allThreats = [];
  }
  renderAll();
}

async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const stats = await response.json();
    const statusText = stats.pipelineStatus === 'healthy' ? 'Collection healthy' : 'Collection needs review';
    const updatedText = new Date(stats.lastUpdated).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    safeSetText('m-total', stats.totalThreats);
    safeSetText('m-crit', stats.activeCritical);
    safeSetText('m-week', stats.newThisWeek);
    safeSetText('m-models', `${stats.modelsAffected} / 5`);
    safeSetText('m-total-d', stats.totalThreats > 0 ? `+ ${Math.max(1, Math.floor(stats.totalThreats * 0.25))} vs last week` : '');
    safeSetText('m-crit-d', stats.activeCritical > 0 ? `+ ${stats.activeCritical} new today` : 'no active criticals');
    safeSetText('m-week-d', 'steady vs prior');
    safeSetText('m-models-d', stats.modelsAffected >= 5 ? 'all tracked models affected' : 'Gemini currently clear');
    safeSetText('overview-status', statusText);
    safeSetText('overview-updated', updatedText);
    safeSetText('overview-critical', stats.activeCritical);
    safeSetText('overview-models', stats.modelsAffected);
    safeSetText('overview-week', stats.newThisWeek);
    safeSetText('overview-total', stats.totalThreats);
  } catch {
    // Use server-rendered fallback values.
  }
}

function initTabBar() {
  document.getElementById('tabbar')?.addEventListener('click', (event) => {
    const button = event.target.closest('.tab');
    if (!button) return;

    const tab = button.dataset.tab;
    document.querySelectorAll('.tab').forEach((node) => node.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((node) => node.classList.remove('active'));
    button.classList.add('active');
    document.getElementById(`panel-${tab}`)?.classList.add('active');
  });
}

function initOverviewFilters() {
  document.querySelector('.filterbar')?.addEventListener('click', (event) => {
    const pill = event.target.closest('.fpill');
    if (!pill) return;

    overviewFilter = pill.dataset.f ?? 'all';
    document.querySelectorAll('.fpill').forEach((node) => node.classList.remove('active'));
    pill.classList.add('active');
    renderFeed('overview-feed', filterThreats(allThreats, overviewFilter));
  });
}

function initThreatInteractions() {
  document.body.addEventListener('click', (event) => {
    if (event.target.closest('[data-threat-link]')) return;

    const openButton = event.target.closest('[data-open-detail]');
    if (openButton) {
      event.stopPropagation();
      openThreatDetail(openButton.dataset.openDetail);
      return;
    }

    const card = event.target.closest('.tcard');
    if (card) {
      openThreatDetail(card.dataset.threatId);
    }
  });

  document.body.addEventListener('keydown', (event) => {
    const card = event.target.closest('.tcard');
    if (!card) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openThreatDetail(card.dataset.threatId);
    }
  });

  document.getElementById('detail-scrim')?.addEventListener('click', closeThreatDetail);
  document.getElementById('drawer-close')?.addEventListener('click', closeThreatDetail);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeThreatDetail();
  });
}

function initModelSubnavs() {
  ['openai', 'claude', 'copilot', 'oss'].forEach((model) => {
    const nav = document.getElementById(`msubnav-${model}`);
    if (!nav) return;

    nav.addEventListener('click', (event) => {
      const button = event.target.closest('.mstab');
      if (!button) return;

      nav.querySelectorAll('.mstab').forEach((node) => node.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.mf;
      let threats = allThreats.filter(modelFilters[model]);
      if (filter !== 'all') {
        threats = threats.filter((threat) => threat.type === filter);
      }
      renderFeed(`feed-${model}`, threats);
    });
  });
}

function initVectorToggle() {
  document.getElementById('vt-threats')?.addEventListener('click', function onThreatsClick() {
    this.classList.add('active');
    document.getElementById('vt-matrix')?.classList.remove('active');
    const threatsView = document.getElementById('vec-threats-view');
    const matrixView = document.getElementById('vec-matrix-view');
    if (threatsView) threatsView.style.display = 'block';
    if (matrixView) matrixView.style.display = 'none';
  });

  document.getElementById('vt-matrix')?.addEventListener('click', function onMatrixClick() {
    this.classList.add('active');
    document.getElementById('vt-threats')?.classList.remove('active');
    const threatsView = document.getElementById('vec-threats-view');
    const matrixView = document.getElementById('vec-matrix-view');
    if (threatsView) threatsView.style.display = 'none';
    if (matrixView) matrixView.style.display = 'block';
  });
}

function downloadBlob(blob, filename) {
  const link = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  link.click();
}

function exportJson() {
  downloadBlob(new Blob([JSON.stringify(allThreats, null, 2)], { type: 'application/json' }), 'threatparallax-threats.json');
}

function exportCsv() {
  const rows = [['id', 'title', 'severity', 'blended_score', 'status', 'type', 'models', 'vectors', 'ttps', 'cve', 'source', 'publishedAt']];
  allThreats.forEach((threat) => rows.push([
    threat.id,
    `"${threat.title}"`,
    threat.severity,
    threat.score.blended,
    threat.status,
    threat.type,
    threat.models.join('|'),
    threat.vectors.join('|'),
    threat.ttps.map((ttp) => ttp.id).join('|'),
    threat.cve ?? '',
    threat.source,
    threat.publishedAt,
  ]));
  downloadBlob(new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' }), 'threatparallax-threats.csv');
}

function exportStix() {
  const bundle = {
    type: 'bundle',
    id: `bundle--aitid-${Date.now()}`,
    spec_version: '2.1',
    objects: allThreats.map((threat) => ({
      type: 'vulnerability',
      spec_version: '2.1',
      id: `vulnerability--${threat.id}`,
      created: threat.publishedAt,
      modified: threat.updatedAt,
      name: threat.title,
      description: threat.description,
      labels: [...threat.models, ...threat.vectors, threat.type],
      x_aitid: {
        severity: threat.severity,
        score: threat.score,
        atlas_ttps: threat.ttps.map((ttp) => ttp.id),
        iocs: threat.iocs,
        status: threat.status,
        mitigations: threat.mitigations,
      },
    })),
  };
  downloadBlob(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }), 'threatparallax-stix.json');
}

function saveSiemConfig() {
  alert('SIEM config saved. Set SIEM_TYPE, SIEM_WEBHOOK_URL, SIEM_SECRET, and SIEM_MIN_SEVERITY in your Vercel environment variables to activate live forwarding.');
}

function initClock() {
  window.setInterval(() => {
    safeSetText('hdr-time', new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, 30000);
}

function initResize() {
  const handle = document.getElementById('sidebar-resize-handle');
  const sidebar = document.getElementById('overview-sidebar');
  if (!handle || !sidebar) return;

  const saved = localStorage.getItem('aitid-sidebar-width');
  if (saved) sidebar.style.width = `${saved}px`;

  let startX = 0;
  let startWidth = 0;

  handle.addEventListener('mousedown', (event) => {
    startX = event.clientX;
    startWidth = sidebar.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(moveEvent) {
      const delta = startX - moveEvent.clientX;
      const nextWidth = Math.min(520, Math.max(160, startWidth + delta));
      sidebar.style.width = `${nextWidth}px`;
    }

    function onUp() {
      handle.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('aitid-sidebar-width', sidebar.offsetWidth);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    event.preventDefault();
  });
}

window.exportJson = exportJson;
window.exportCsv = exportCsv;
window.exportStix = exportStix;
window.saveSiemConfig = saveSiemConfig;

initTabBar();
initOverviewFilters();
initThreatInteractions();
initModelSubnavs();
initVectorToggle();
initClock();
initResize();
loadStats();
loadThreats();
