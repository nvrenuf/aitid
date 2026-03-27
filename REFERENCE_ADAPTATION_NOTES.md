# ThreatParallax Reference Adaptation Notes

## 5 things to borrow from the HTML reference

1. Fixed, compact product header with calmer top-level navigation.
2. Stronger section framing with shorter headers and a more deliberate spacing rhythm.
3. KPI rows that read as disciplined product instrumentation instead of dashboard scaffolding.
4. A more professional map stage plus right-rail composition, with the caption and supporting context integrated into the same visual system.
5. Denser operator workbench treatment: tighter filter rows, clearer title-to-metadata hierarchy, and calmer dark surfaces.

## 5 things not to borrow

1. The "AI Threat Radar" identity, naming, and generic positioning.
2. Nation-impact framing, country risk scoring, or any unsupported geographic claims.
3. Broad CVE-database or intelligence-platform scope that exceeds the current ThreatParallax product.
4. Theatrical world-map behavior, hotspot pulse language, or speculative global storytelling.
5. Reference copy that implies live telemetry, actor attribution, or macro threat certainty not supported by ThreatParallax data.

## How those choices map to ThreatParallax specifically

- The fixed-header idea maps to ThreatParallax's existing shell by refining [ProductLayout.astro](/c:/Users/lee/projects/aitid/src/components/layout/ProductLayout.astro) rather than changing route architecture.
- The reference's spacing discipline maps to the approved design-review direction: shorter top compositions, calmer cards, tighter chips, and fewer competing accents across `/overview`, `/threats`, `/threat-map`, and `/threats/[slug]`.
- The KPI treatment will be adapted to ThreatParallax's real metrics only: collection health, active severity counts, model scope, and queue context. No synthetic macro statistics will be introduced.
- The map adaptation will borrow compositional polish only. ThreatParallax will keep its current observed-infrastructure and exposure semantics, regional anchors, and explicit unmapped coverage.
- The list/workbench ideas will be reinterpreted for ThreatParallax's real operator workflow: search, severity/model/vector/status filtering, canonical threat records, and source-backed review rather than a generic incident database.
