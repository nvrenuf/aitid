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
6. P1-06 [#5](https://github.com/nvrenuf/aitid/issues/5) README and Phase I regression/QA pass - completed
   Note: Updated the README to the ThreatParallax framing, refreshed package-level product description, and closed Phase I with a final build and brand-reference sweep.

## Phase 1.5 Execution Order

1. P1.5-01 [#8](https://github.com/nvrenuf/aitid/issues/8) UTF-8 normalization and visible copy cleanup - completed
   Note: Removed the remaining corrupted banner text in the main page source and normalized high-risk visible separators in the drawer subtitle.
2. P1.5-02 [#9](https://github.com/nvrenuf/aitid/issues/9) Component extraction for shell, overview, feed, and drawer - completed
   Note: Split the dashboard shell into focused Astro components and moved the client-side feed, drawer, and interaction logic into a dedicated browser module so `index.astro` now acts as the page composition layer.
3. P1.5-03 [#10](https://github.com/nvrenuf/aitid/issues/10) Minimal smoke test harness and npm test script - completed
   Note: Added a lightweight `node:test` smoke suite around shared dashboard helper logic and introduced a real `npm test` entrypoint so Phase 1.5 work is no longer validated by build alone.
4. P1.5-04 [#11](https://github.com/nvrenuf/aitid/issues/11) Final regression sweep and PR polish - completed
   Note: Ran the final build and smoke-test pass, refreshed README usage notes for the new test entrypoint, updated user-facing export filenames to ThreatParallax, and appended the Phase 1.5 addendum to draft PR #7.

## Phase II Execution Order

1. P2-01 [#13](https://github.com/nvrenuf/aitid/issues/13) Route structure and navigation transition - completed
   Note: Split the dashboard into route-based Overview, Threat Map, and Research surfaces, redirected `/` into the Overview route, and kept the existing workspace tabs active inside the Overview page.
2. P2-02 [#14](https://github.com/nvrenuf/aitid/issues/14) Threat Map data contract and geographic aggregation model - in progress
3. P2-03 [#15](https://github.com/nvrenuf/aitid/issues/15) Threat Map UI and regional detail experience - pending
4. P2-04 [#16](https://github.com/nvrenuf/aitid/issues/16) Research landing surface and methodology placeholder - pending
5. P2-05 [#17](https://github.com/nvrenuf/aitid/issues/17) Final regression sweep, documentation touch-up, and PR polish - pending
