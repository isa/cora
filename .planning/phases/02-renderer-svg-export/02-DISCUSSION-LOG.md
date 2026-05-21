# Phase 2: Core Renderer + SVG Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 2-Core Renderer + SVG Export
**Areas discussed:** Default theme aesthetic, Font strategy

---

## Default theme aesthetic

| Option | Description | Selected |
|--------|-------------|----------|
| Clean and minimal | Lightweight, sketch-like | |
| Polished and professional | Suitable for architecture docs and presentations | ✓ |
| Technical and information-dense | Compact, documentation-first | |
| You decide | Defer to planner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Neutral grays with one accent | Restrained palette | |
| Soft pastels per shape or role | Gentle differentiated hues | ✓ |
| High-contrast monochrome | Bold black/white | |
| You decide | Defer to planner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Flat — borders only | No shadows | |
| Subtle depth | Light shadow or inset border | ✓ |
| Layered — clear elevation | Strong group/node hierarchy | |
| You decide | Defer to planner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Compact | Fit more on one page | |
| Balanced | Readable without wasting space | ✓ |
| Airy | Generous whitespace | |
| You decide | Defer to planner | |

**User's choice:** Polished professional + soft pastels + subtle depth + balanced density
**Notes:** User skipped follow-up questions; moved directly to Font strategy.

---

## Font strategy

| Option | Description | Selected |
|--------|-------------|----------|
| System font stack | OS-native fonts, lighter install | ✓ |
| Single embedded webfont | Consistent metrics everywhere | |
| Embedded pair (sans + mono) | Sans for labels, mono for code-like text | |
| You decide | Defer to planner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Exact cross-platform | Same SVG everywhere | ✓ |
| Good enough | Minor OS differences OK | |
| You decide | Defer to planner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Small (12px base) | More content per diagram | |
| Medium (14px base) | Balanced readability | ✓ |
| Large (16px base) | Presentation-first | |
| You decide | Defer to planner | |

| Option | Description | Selected |
|--------|-------------|----------|
| Regular only | One weight throughout | |
| Regular + semibold | Bold node titles, regular edge labels | ✓ |
| You decide | Defer to planner | |

**User's choice:** System font stack + exact cross-platform parity + 14px base + regular/semibold hierarchy
**Notes:** System stack and exact cross-platform parity may conflict; flagged in CONTEXT.md for research resolution.

---

## Claude's Discretion

- Per-kind layout personality (not selected for discussion)
- Golden-image regression strictness (not selected for discussion)
- Text measurement library selection (research phase per ROADMAP)
- Exact pastel hex values and shadow implementation details

## Deferred Ideas

- Per-kind layout personality — user did not select this gray area
- Golden-image regression bar — user did not select this gray area
