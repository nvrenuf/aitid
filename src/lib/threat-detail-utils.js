import { shortModel } from './dashboard-utils.js';

export function buildThreatDetailContext(threat) {
  const sourceReferences = [
    {
      title: 'Primary source',
      detail: threat.source,
      href: threat.sourceUrl ?? null,
    },
    ...(threat.cve
      ? [
          {
            title: 'CVE reference',
            detail: threat.cve,
            href: null,
          },
        ]
      : []),
    ...threat.ttps.map((ttp) => ({
      title: 'ATLAS technique',
      detail: `${ttp.id} - ${ttp.name}`,
      href: ttp.url ?? null,
    })),
  ];

  const evidenceHighlights = [
    {
      title: 'Supporting context',
      detail: threat.description,
    },
    {
      title: 'Observed coverage',
      detail: `Models: ${threat.models.map(shortModel).join(', ')}. Vectors: ${threat.vectors.join(', ')}.`,
    },
    {
      title: 'Indicator support',
      detail: threat.iocs.length
        ? `${threat.iocs.length} IOC${threat.iocs.length === 1 ? '' : 's'} are attached to the current record.`
        : 'No IOCs are listed in the current record.',
    },
    {
      title: 'Version posture',
      detail: threat.affectedVersions || threat.patchVersion
        ? `Affected: ${threat.affectedVersions ?? 'not explicitly listed'}. Patch: ${threat.patchVersion ?? 'not listed'}.`
        : 'Affected versions and patch versions are not explicitly listed in the current record.',
    },
  ];

  const methodologyNotes = [
    'ThreatParallax normalizes each tracked record into source, status, severity, type, models, vectors, TTPs, IOCs, mitigations, and patch posture when those fields are available.',
    'This page reflects the current normalized corpus entry. It is designed for operational review, not as a full editorial archive or external advisory replacement.',
    'The canonical route makes the record linkable, but the underlying evidence remains limited to what is captured in the current dataset.',
  ];

  const scoreContext = [
    {
      title: 'Score breakdown',
      detail: `CVSS ${threat.score.cvss.toFixed(1)} + ATLAS bonus ${threat.score.atlasBonus.toFixed(1)} = blended ${threat.score.blended.toFixed(1)}.`,
    },
    {
      title: 'Severity context',
      detail: `This record is currently labeled ${threat.severity.toUpperCase()} with status ${threat.status}.`,
    },
    {
      title: 'Why it scored this way',
      detail: threat.score.rationale,
    },
  ];

  const limitations = [];

  if (!threat.sourceUrl) {
    limitations.push('A named source is recorded, but the current entry does not include a direct source URL.');
  }

  if (!threat.iocs.length) {
    limitations.push('No IOCs are attached to this record, so the evidence section should be read as contextual rather than indicator-rich.');
  }

  if (!threat.affectedVersions) {
    limitations.push('Affected version scope is not explicitly listed in the current dataset.');
  }

  if (!threat.patchVersion) {
    limitations.push('No patch version is listed in the current dataset.');
  }

  limitations.push('This page summarizes the current ThreatParallax corpus entry only; it does not claim exhaustive source coverage, live telemetry, or independent corroboration beyond the listed references.');

  const confidenceFraming = threat.sourceUrl
    ? 'The record includes a direct source link, which improves traceability, but the page still reflects a curated product entry rather than a full source archive.'
    : 'The record is traceable to a named source, but direct source transparency is limited because the current entry does not include a source URL.';

  return {
    sourceReferences,
    evidenceHighlights,
    methodologyNotes,
    scoreContext,
    limitations,
    confidenceFraming,
  };
}
