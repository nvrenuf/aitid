import { sortThreats } from './dashboard-utils.js';

export const THREAT_MAP_MEANING =
  'Threat Map represents observed infrastructure and exposure geography only. It does not represent actor origin, victim geography, customer geography, or live attack traffic.';

export const THREAT_MAP_LIMITATIONS = [
  'Map coverage is intentionally partial and only includes threats with an explicit geography observation record.',
  'Coordinates are approximate region anchors unless a source supports tighter placement.',
  'Current seed observations are coarse, analyst-curated entries for a non-production corpus and should be read as regional context, not precise telemetry.',
];

// Coarse seed observations keep the map honest: only broad regions are attached, and every anchor is
// marked approximate so later UI work cannot imply street-level or live-attack precision.
export const THREAT_MAP_OBSERVATIONS = [
  {
    id: 'map-ghostclaw-na',
    threatId: 'seed-ghostclaw-skill-md',
    scope: 'observed-infrastructure',
    regionKey: 'north-america',
    regionName: 'North America',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse regional anchor for the seed record based on reviewed infrastructure and exposure context; retained at macro-region precision only.',
    anchor: { lat: 39.8283, lng: -98.5795, isApproximate: true, label: 'North America anchor' },
  },
  {
    id: 'map-ghostclaw-europe',
    threatId: 'seed-ghostclaw-supply-chain',
    scope: 'observed-infrastructure',
    regionKey: 'western-europe',
    regionName: 'Western Europe',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse regional anchor for the seed record based on reviewed infrastructure and exposure context; retained at macro-region precision only.',
    anchor: { lat: 50.1109, lng: 8.6821, isApproximate: true, label: 'Western Europe anchor' },
  },
  {
    id: 'map-copilot-apac',
    threatId: 'seed-copilot-vscode-exfil',
    scope: 'observed-exposure',
    regionKey: 'asia-pacific',
    regionName: 'Asia-Pacific',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse exposure region carried in the seed corpus to support regional posture review without implying precise endpoint locations.',
    anchor: { lat: 1.3521, lng: 103.8198, isApproximate: true, label: 'Asia-Pacific anchor' },
  },
  {
    id: 'map-hf-na',
    threatId: 'seed-hf-llama-poisoned-weights',
    scope: 'observed-infrastructure',
    regionKey: 'north-america',
    regionName: 'North America',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse infrastructure region carried in the seed corpus for model-hub exposure tracking; no point-level fidelity is claimed.',
    anchor: { lat: 39.8283, lng: -98.5795, isApproximate: true, label: 'North America anchor' },
  },
  {
    id: 'map-m365-europe',
    threatId: 'seed-m365-copilot-prompt-inject',
    scope: 'observed-exposure',
    regionKey: 'western-europe',
    regionName: 'Western Europe',
    precision: 'macro-region',
    sourceQuality: 'analyst-curated',
    summary: 'Coarse exposure region carried in the seed corpus to support region-level review; the product does not claim organization or customer geography.',
    anchor: { lat: 50.1109, lng: 8.6821, isApproximate: true, label: 'Western Europe anchor' },
  },
];

function buildThreatMapPoint(threat, observation) {
  return {
    id: observation.id,
    threatId: threat.id,
    threatTitle: threat.title,
    severity: threat.severity,
    status: threat.status,
    score: threat.score.blended,
    scope: observation.scope,
    regionKey: observation.regionKey,
    regionName: observation.regionName,
    precision: observation.precision,
    sourceQuality: observation.sourceQuality,
    summary: observation.summary,
    anchor: observation.anchor,
    vectors: threat.vectors,
    models: threat.models,
    publishedAt: threat.publishedAt,
  };
}

function countByValue(items) {
  return items.reduce((counts, item) => {
    counts.set(item, (counts.get(item) ?? 0) + 1);
    return counts;
  }, new Map());
}

function topValues(items, limit = 3) {
  return [...countByValue(items).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function uniqueValues(items) {
  return [...new Set(items)];
}

function buildUnmappedThreatSummary(threat) {
  if (threat.iocs?.length) {
    return {
      threatId: threat.id,
      threatTitle: threat.title,
      severity: threat.severity,
      status: threat.status,
      reasonCategory: 'Indicator support, no region anchor',
      reasonDetail:
        'The record includes indicators or supporting artifacts, but the current dataset still lacks an explicit observed infrastructure or exposure region that would justify a map placement.',
      vectors: threat.vectors,
      models: threat.models,
    };
  }

  if (threat.affectedVersions || threat.patchVersion || threat.cve) {
    return {
      threatId: threat.id,
      threatTitle: threat.title,
      severity: threat.severity,
      status: threat.status,
      reasonCategory: 'Advisory context, no geography signal',
      reasonDetail:
        'The current record provides product or version posture, but it does not capture a defensible observed geography for infrastructure or exposure.',
      vectors: threat.vectors,
      models: threat.models,
    };
  }

  return {
    threatId: threat.id,
    threatTitle: threat.title,
    severity: threat.severity,
    status: threat.status,
    reasonCategory: 'Context-only record, no geography signal',
    reasonDetail:
      'The current record describes threat behavior and scope, but it does not include an observed regional anchor for infrastructure or exposure.',
    vectors: threat.vectors,
    models: threat.models,
  };
}

export function aggregateThreatMapRegions(points) {
  const grouped = new Map();
  for (const point of points) {
    const bucket = grouped.get(point.regionKey) ?? [];
    bucket.push(point);
    grouped.set(point.regionKey, bucket);
  }

  return [...grouped.entries()]
    .map(([regionKey, regionPoints]) => {
      const representative = regionPoints[0];
      const threatMap = new Map(regionPoints.map((point) => [point.threatId, point]));
      const regionThreats = sortThreats(
        [...threatMap.values()].map((point) => ({
          id: point.threatId,
          title: point.threatTitle,
          severity: point.severity,
          score: { blended: point.score },
        })),
      );

      return {
        regionKey,
        regionName: representative.regionName,
        anchor: representative.anchor,
        threatCount: threatMap.size,
        pointCount: regionPoints.length,
        topThreats: regionThreats.slice(0, 3).map((threat) => ({
          id: threat.id,
          title: threat.title,
          severity: threat.severity,
          score: threat.score.blended,
        })),
        dominantVectors: topValues(regionPoints.flatMap((point) => point.vectors)),
        affectedModels: topValues(regionPoints.flatMap((point) => point.models)),
        precisions: uniqueValues(regionPoints.map((point) => point.precision)),
      };
    })
    .sort((left, right) => right.threatCount - left.threatCount || left.regionName.localeCompare(right.regionName));
}

export function buildThreatMapDataset(threats, observations = THREAT_MAP_OBSERVATIONS) {
  const threatsById = new Map(threats.map((threat) => [threat.id, threat]));
  const points = observations
    .map((observation) => {
      const threat = threatsById.get(observation.threatId);
      return threat ? buildThreatMapPoint(threat, observation) : null;
    })
    .filter(Boolean);
  const mappedThreatIds = new Set(points.map((point) => point.threatId));
  const regions = aggregateThreatMapRegions(points);
  const unmappedThreats = threats
    .filter((threat) => !mappedThreatIds.has(threat.id))
    .map((threat) => buildUnmappedThreatSummary(threat));

  return {
    meaning: THREAT_MAP_MEANING,
    limitations: THREAT_MAP_LIMITATIONS,
    coverage: {
      mappedThreatCount: mappedThreatIds.size,
      unmappedThreatCount: Math.max(0, threats.length - mappedThreatIds.size),
      mappedRegionCount: regions.length,
      pointCount: points.length,
    },
    points,
    regions,
    unmappedThreatIds: unmappedThreats.map((threat) => threat.threatId),
    unmappedThreats,
  };
}
