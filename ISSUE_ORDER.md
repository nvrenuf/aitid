ThreatParallax Phase I covers UI rebrand, visual-system cleanup, shell modernization, overview/feed refresh, and doc/QA alignment on the current non-prod deployment. Domain cutover and full threat-map implementation are deferred to Phase II.

## Phase I Execution Order

1. P1-01 [#6](https://github.com/nvrenuf/aitid/issues/6) ThreatParallax brand rename and metadata refresh - completed
   Note: Updated visible app branding and page metadata to ThreatParallax and removed prototype wording from the shell.
2. P1-02 [#1](https://github.com/nvrenuf/aitid/issues/1) Theme tokens, typography, and shared UI primitives extraction - completed
   Note: Extracted shared theme tokens and primitive styling into a dedicated stylesheet and reduced mono-heavy prototype presentation.
3. P1-03 [#2](https://github.com/nvrenuf/aitid/issues/2) App shell and navigation modernization - completed
   Note: Reworked the top-level shell with a stronger header, future-ready navigation framing, and a cleaner workspace layout while keeping the existing panels live.
4. P1-04 [#3](https://github.com/nvrenuf/aitid/issues/3) Overview redesign and KPI strip refresh - completed
   Note: Reframed the overview as a control-center landing surface with executive summary modules, stronger KPI cards, and clearer hierarchy around the live feed.
5. P1-05 [#4](https://github.com/nvrenuf/aitid/issues/4) Threat feed cards and detail drawer redesign - completed
   Note: Rebuilt the threat cards around clearer severity/status/model/vector bands and turned the drawer into a more structured incident brief without changing the underlying data model.
6. P1-06 [#5](https://github.com/nvrenuf/aitid/issues/5) README and Phase I regression/QA pass
