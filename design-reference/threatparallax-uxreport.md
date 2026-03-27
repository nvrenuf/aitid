# ThreatParallax — UI/UX Consultant Report

## Overview

ThreatParallax has solid bones. The information architecture is clear, the feature scope (threat feed, maps, SIEM integration, model-specific tabs) is genuinely useful, and the dark theme is well-suited to a security analyst workspace. The reference design system (Space Grotesk + Manrope + IBM Plex Mono, dark navy palette) is a strong foundation.

The primary opportunity is **consistency** — the color system, typography hierarchy, and severity language are partially implemented but not fully carried through to all surfaces.

---

## 1. Severity Color Language — Biggest Priority

The CSS already defines the right colors but they are underused in production:

| Severity | Color | Hex |
|----------|-------|-----|
| Critical | Red-pink | `#ff7d8f` |
| High | Amber | `#ffb36a` |
| Medium | Yellow | `#ffd369` |
| Low / Info | Blue | `#7dc4ff` |

### Apply these consistently across:

- **Threat card left border** — a 3px left border in severity color lets analysts scan without reading a single word. This is standard in security tooling (Splunk, Elastic SIEM, Microsoft Sentinel all use this pattern).
- **Blended score number** — the score (9.6, 9.4, 8.9) should be colored by severity tier, not plain white. A red 9.6 communicates urgency instantly.
- **Severity badges** — not just colored text, but a light background tint of the same color (e.g. `rgba(255,125,143,0.12)` for critical) so badges read as status indicators rather than plain labels.
- **Stat card accent lines** — the `::before` pseudo-element top border on each stat card should reflect severity (critical stat = red accent, new this week = amber, etc.). The reference HTML already implements this — ensure it carries to production.
- **Map region nodes** — nodes with higher threat counts should glow amber/red instead of uniform blue, making geographic hotspots scannable at a glance.

---

## 2. Threat Feed Card Anatomy

Each card should have a consistent, scannable structure:

```
[severity border] [severity badge] [status badge] [vector badge]
[Title — Space Grotesk, 15px, semibold]
[Source · model targets · vectors — IBM Plex Mono, 12px, muted]
                                          [Score — colored, 28px bold]
                                          [BLENDED SCORE — mono label]
[tag] [tag] [tag] [tag]
```

Currently cards are uniform with no left border and white score numbers. Adding the border and coloring the score are the two highest-impact changes.

---

## 3. Typography Hierarchy

The font trio is correct — use it more aggressively:

| Use | Font | Style |
|-----|------|-------|
| Display headings, scores | Space Grotesk | 600–700 weight, tight letter-spacing (-0.05em) |
| Body, descriptions, copy | Manrope | 400–500 weight, 1.6 line-height |
| Labels, tags, badges, timestamps | IBM Plex Mono | 10–11px, uppercase, 0.12em letter-spacing |

The monospace treatment on all metadata is what makes the interface read as a serious analytical tool rather than a generic dashboard. It should be applied to: section labels, score labels, tag chips, timestamps, filter chips, and status indicators.

---

## 4. Header / Hero Section

The current hero ("Track model-linked threats with product surfaces built for serious review") is doing marketing work on an analyst workspace. Security analysts want to land on data immediately.

**Recommendation:** Reduce the hero to a compact status bar — brand mark, platform name, live indicator, and timestamp — no more than 60px tall. The large display copy can live on a marketing/landing page, not inside the operational dashboard.

---

## 5. Map Surface

The threat map is the strongest surface in the product. Keep the:
- Dark ocean gradient
- Slate-gray landmasses
- Subtle graticule grid lines
- Rounded region nodes with count numbers
- Bottom legend ("higher-pressure cluster / supporting observation")

**One change:** Apply severity color to nodes. A region with 3+ threats should use a warm amber/red glow (`rgba(255,179,106,0.3)` border + glow) instead of the uniform blue. Lower-count regions stay blue. This makes the map actionable rather than decorative.

---

## 6. SIEM Configuration

The SIEM config form (Sentinel / Splunk / Elastic / CrowdStrike / webhook) is currently prominent in the main overview. This is a one-time setup task, not an operational control.

**Recommendation:** Move to a collapsed accordion or a dedicated Settings surface. A small "Configure SIEM ⚙" link in the model tab row is sufficient to surface it when needed.

---

## 7. Filter Chips

Filters (All / Critical / High / Medium / Supply chain / Jailbreak / Data exfil) should sit directly above the threat feed, not below the fold. They appear to be in the right position now — ensure they stay anchored there as the page grows.

---

## 8. Loading States

Several panels show raw "Loading threats..." and "Loading..." text. For a threat intelligence platform, blank panels create analyst anxiety.

**Recommendation:** Implement skeleton loaders — animated gray bars in the shape of card content — to communicate that data is actively loading rather than missing.

---

## Summary — Priority Order

1. **Apply severity colors to card left borders and score numbers** — highest visual impact, lowest implementation effort
2. **Color the map nodes by threat count/severity**
3. **Tighten badge treatment** — tinted backgrounds, monospace text
4. **Shrink the hero header** to a status bar
5. **Move SIEM config** out of the main view
6. **Add skeleton loaders** to replace "Loading..." text
7. **Audit all metadata labels** for consistent IBM Plex Mono treatment

---

## Reference Color Tokens

```css
--crit: #ff7d8f;
--high: #ffb36a;
--med:  #ffd369;
--info: #7dc4ff;
--low:  #62d6aa;

--bg:      #07111a;
--surface: rgba(9, 19, 29, 0.9);
--border:  rgba(129, 154, 182, 0.16);
--txt:     #f3f7fb;
--txt2:    #a9bfd6;
--txt3:    #7390ae;
```

These are already defined in the reference HTML. The work is ensuring they are applied consistently across all production surfaces.
