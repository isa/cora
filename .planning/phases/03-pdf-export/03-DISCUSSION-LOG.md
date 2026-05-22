# Phase 3: PDF Export - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-22
**Phase:** 3-PDF Export
**Areas discussed:** Page sizing strategy, PDF text fidelity, --quality=high failure UX, Oversized diagram handling

---

## Page sizing strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Fit-to-content | Page = diagram bbox + small margin. No empty whitespace; page size varies per diagram. | |
| Fixed page (A4 / Letter) | Always A4 landscape (or configurable). Diagram scaled to fit. Predictable print; small diagrams float in whitespace. | |
| Fit-to-content default + --page flag | Default = fit-to-content; opt-in `--page=a4\|letter\|...` for print workflows. | ✓ |

**User's choice:** Fit-to-content default + opt-in `--page` flag.
**Notes:** Best of both worlds — agent/embed workflows get tight PDFs by default; print users opt in.

---

## PDF text fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Selectable text (embed Noto Sans) | pdf-lib embeds bundled Noto Sans; text objects placed over vector shapes. Searchable/copyable. ~200KB embed. | ✓ |
| Vector-only (resvg → PDF, no live text) | resvg rasterizes text to paths/glyphs. Simpler, smaller diff vs SVG. Not selectable. | |
| Decide in research/planning | Defer to researcher. | |

**User's choice:** Selectable text via embedded Noto Sans.
**Notes:** Accessibility and PR-diffability matter. Phase 2 already bundles Noto Sans, so embedding cost is low.

---

## --quality=high failure UX

| Option | Description | Selected |
|--------|-------------|----------|
| Hard fail with install hint | Exit non-zero with actionable error referencing `--yes` / `CORA_AUTO_INSTALL=1` / cache path. | ✓ |
| Fall back to resvg with warning | Render via default pipeline + warning. Risk: silent quality regression in CI. | |
| Hard fail by default; --quality=high-or-default flag for fallback | Default hard fail; opt-in flag enables fallback. | |

**User's choice:** Hard fail with install hint.
**Notes:** Agents/CI need a deterministic signal. A silent fallback hides quality regressions.

---

## Oversized diagram handling

| Option | Description | Selected |
|--------|-------------|----------|
| Single oversized page | Page dimensions match diagram bbox exactly. Consistent with fit-to-content. Viewers handle zoom. | ✓ |
| Scale-to-fit single A4/Letter | When `--page` is set, scale whole diagram to fit. Tiny labels on huge diagrams. | |
| Tile across multiple pages | Tile with crop marks when content overflows `--page`. More complex; deferred for v1. | |

**User's choice:** Single oversized page by default; scale-to-fit when `--page` is set.
**Notes:** Multi-page tiling deferred — re-evaluate if users ask.

---

## Claude's Discretion

- Exact margin value for fit-to-content (suggestion: 24pt).
- Full list of supported `--page` values beyond a4/letter/portrait variants.
- Text-position tolerance between SVG and PDF (suggestion: ≤1pt).
- pdf-lib swap if researcher finds a better fit (selectable-text requirement is non-negotiable).
- Non-interactive predicate (`CI=1` env, no TTY, `--format=json`).
- Playwright install topology (optional dep, runtime download, etc.).
- Windows Chromium cache dir resolution (likely via `env-paths` or equivalent).

## Deferred Ideas

- Multi-page tiling for oversized diagrams.
- Custom `--margin` flag.
- PDF metadata (title/author from diagram metadata).
- `cora doctor` Chromium presence check — belongs in Phase 6.
- Print-optimized CMYK color profile.
