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
2. P2-02 [#14](https://github.com/nvrenuf/aitid/issues/14) Threat Map data contract and geographic aggregation model - completed
   Note: Added an explicit Threat Map observation contract, conservative regional aggregation logic, unmapped coverage tracking, and a dedicated API payload that keeps map meaning limited to observed infrastructure and exposure geography.
3. P2-03 [#15](https://github.com/nvrenuf/aitid/issues/15) Threat Map UI and regional detail experience - completed
   Note: Replaced the placeholder route with a restrained interactive Threat Map page that exposes regional counts, top threats, dominant vectors, affected models, and unmapped coverage without overstating coordinate precision.
4. P2-04 [#16](https://github.com/nvrenuf/aitid/issues/16) Research landing surface and methodology placeholder - completed
   Note: Upgraded the Research route into a credible landing surface with current direction, methodology, and source/cadence framing while keeping the page intentionally lighter than a full advisories portal.
5. P2-05 [#17](https://github.com/nvrenuf/aitid/issues/17) Final regression sweep, documentation touch-up, and PR polish - completed
   Note: Ran the final build and smoke-test pass again, updated README for the new route structure and Threat Map API surface, and prepared the branch as the single draft PR review surface for Phase II.

## Phase III Execution Order

1. P3-01 [#19](https://github.com/nvrenuf/aitid/issues/19) Threats index route and operator filter workflow - completed
   Note: Added a dedicated `/threats` route with operator-oriented search, filtering, sorting, and corpus summary cues while preserving the current ThreatParallax visual language.
2. P3-02 [#20](https://github.com/nvrenuf/aitid/issues/20) Canonical threat detail pages and deep-link routing - completed
   Note: Added canonical `/threats/[slug]` detail routes, linked them from the Threats surface, exposed canonical detail links from Overview while keeping the drawer, and wired Threat Map regional lists into the same deep-link flow.
3. P3-03 [#21](https://github.com/nvrenuf/aitid/issues/21) Evidence, source transparency, and score/method context on threat detail - completed
   Note: Expanded canonical detail pages with source references, evidence/support notes, normalization and methodology framing, score breakdown context, and explicit limitations/confidence language grounded in the current dataset.
4. P3-04 [#22](https://github.com/nvrenuf/aitid/issues/22) Threat Map drilldowns, filters, and unmapped reason categories - completed
   Note: Added severity/model/vector map filters, re-rendered regional drilldowns against the filtered dataset, linked regional entries into canonical threat pages, and replaced raw unmapped IDs with defensible reason categories based on current record support.
5. P3-05 [#23](https://github.com/nvrenuf/aitid/issues/23) Final regression sweep, documentation touch-up, and PR polish - completed
   Note: Re-ran the final build and test pass, updated README for the new Threats surfaces and canonical detail routing, refreshed the Phase III tracker state, and prepared the branch as the single draft PR review surface for Phase III.

## Phase IV Execution Order

1. P4-01 [#25](https://github.com/nvrenuf/aitid/issues/25) Eastern Time timestamp normalization and visible time cleanup - completed
   Note: Added a shared America/New_York formatter, normalized the shell and overview timestamps to DST-aware EST/EDT output, and pinned visible threat dates to Eastern Time instead of browser-local rendering.
2. P4-02 [#26](https://github.com/nvrenuf/aitid/issues/26) Threat Map rendering bug repair and resilient fallback behavior - completed
   Note: Centralized map projection and edge clamping for marker placement, anchored the marker layer explicitly over the map stage, and added an in-surface regional fallback panel so the page remains useful when filters or rendering remove markers.
3. P4-03 [#27](https://github.com/nvrenuf/aitid/issues/27) Threat Map visual replacement with a real projected map surface - completed
   Note: Replaced the abstract placeholder backdrop with a dedicated projected world map component, upgraded the ocean/coastline treatment, and kept the existing observed-geography marker layer aligned to the same restrained trust-first semantics.
4. P4-04 [#28](https://github.com/nvrenuf/aitid/issues/28) Threat Map layout and detail-panel UX polish - completed
   Note: Rebalanced the filter bar and workspace proportions, added a reset path and stage caption, and reshaped the regional detail panel into a stickier, faster-scanning operator brief without changing the underlying map meaning.
5. P4-05 [#29](https://github.com/nvrenuf/aitid/issues/29) Final regression sweep, documentation touch-up, and PR polish - pending
   Note: Run the final build/test pass, verify timestamp behavior, refresh docs, and open the single Phase IV draft PR to `main`.
