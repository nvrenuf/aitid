import { SEVERITY_ORDER, shortModel, sortThreats } from './dashboard-utils.js';

export const DEFAULT_THREAT_SORT = 'severity';

export const THREAT_SORT_OPTIONS = [
  { value: 'severity', label: 'Highest severity' },
  { value: 'score', label: 'Highest score' },
  { value: 'publishedAt', label: 'Newest published' },
  { value: 'updatedAt', label: 'Newest updated' },
  { value: 'title', label: 'Title A-Z' },
];

export function slugifyThreatSegment(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function getThreatDetailSlug(threat) {
  return slugifyThreatSegment(threat.title);
}

export function getThreatDetailHref(threat) {
  return `/threats/${getThreatDetailSlug(threat)}`;
}

export function buildThreatSearchText(threat) {
  return [
    threat.id,
    threat.title,
    threat.description,
    threat.severity,
    threat.status,
    threat.type,
    threat.source,
    threat.cve ?? '',
    threat.affectedVersions ?? '',
    threat.patchVersion ?? '',
    ...threat.models.map(shortModel),
    ...threat.models,
    ...threat.vectors,
    ...threat.ttps.flatMap((ttp) => [ttp.id, ttp.name, ttp.tactic]),
    ...threat.iocs.flatMap((ioc) => [ioc.type, ioc.value, ioc.context ?? '']),
    ...threat.mitigations,
  ]
    .join(' ')
    .toLowerCase();
}

export function applyThreatFilters(threats, filters = {}) {
  const query = String(filters.query ?? '').trim().toLowerCase();

  return threats.filter((threat) => {
    if (filters.severity && threat.severity !== filters.severity) return false;
    if (filters.model && !threat.models.includes(filters.model)) return false;
    if (filters.vector && !threat.vectors.includes(filters.vector)) return false;
    if (filters.status && threat.status !== filters.status) return false;
    if (query && !buildThreatSearchText(threat).includes(query)) return false;
    return true;
  });
}

export function sortThreatCollection(threats, sort = DEFAULT_THREAT_SORT) {
  const collection = [...threats];

  switch (sort) {
    case 'score':
      return collection.sort((left, right) => right.score.blended - left.score.blended);
    case 'publishedAt':
      return collection.sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt));
    case 'updatedAt':
      return collection.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    case 'title':
      return collection.sort((left, right) => left.title.localeCompare(right.title));
    case 'severity':
    default:
      return sortThreats(collection).sort((left, right) => {
        const severityDelta = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
        if (severityDelta !== 0) return severityDelta;
        if (right.score.blended !== left.score.blended) return right.score.blended - left.score.blended;
        return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
      });
  }
}

export function summarizeThreatResultSet(threats) {
  const activeCount = threats.filter((threat) => threat.status === 'active').length;
  const criticalCount = threats.filter((threat) => threat.severity === 'critical').length;
  const uniqueModels = new Set(threats.flatMap((threat) => threat.models).filter((model) => model !== 'multi-model')).size;
  const newest = sortThreatCollection(threats, 'publishedAt')[0] ?? null;

  return {
    total: threats.length,
    activeCount,
    criticalCount,
    uniqueModels,
    newestPublishedAt: newest?.publishedAt ?? null,
  };
}
