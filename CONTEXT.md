# Cora Diagram Theming

Domain language for how diagram color themes communicate meaning — not implementation.

## Language

**Diagram theme**:
A named visual palette applied to an entire diagram via optional `diagram.theme` in YAML. Resolves to one of ten built-in theme ids; omitted field defaults to `folio-light` for validate/render. CLI `--theme` may override at render time without mutating the file; canvas save writes the active id back to YAML.
_Avoid_: color scheme, skin, global-only theme preference

**Theme validation**:
Validate and render hard-fail with `UNKNOWN_THEME` when `diagram.theme` names a missing theme. No silent fallback to another palette. Preview workbench may default to `folio-light` when theme is omitted or invalid so the UI stays usable.
_Avoid_: silent theme fallback on render, preview hard-crash on bad theme id

**Theme selection**:
Where the active theme id is stored. Source of truth is `diagram.theme` in the diagram file; not user config alone.
_Avoid_: ~/.config theme default (without YAML), implicit light/dark mode

**Theme file**:
A palette-first YAML file loaded at runtime — not compiled to TypeScript. Built-in themes ship inside the npm package; extension themes install to the Cora extensions cache. Same format and loader for both. Works from `npx cora` with no theme build step.
_Avoid_: build-time theme compilation, TS-authored palette grids

**Built-in theme**:
A theme YAML file bundled with the `cora` package. Discovered by the runtime theme loader alongside installed extension themes.
_Avoid_: hardcoded ThemeTokens-only themes (for new work)

**Extension theme id**:
A pack-prefixed theme identifier for extension themes (e.g. `brand-kit/corporate-light`). Built-in ids stay unprefixed (`folio-light`). CLI resolves id or slug; prevents extension themes from shadowing built-ins.
_Avoid_: flat global ids for extensions, unprefixed extension themes

**Extension theme**:
A palette-only YAML file installed via the extensions system. Provides `id`, `label`, `appearance`, and `palette`; the runtime loader merges it with the core-shipped **theme contract**. Same loader as built-in themes.
_Avoid_: self-contained duplicate component maps (default for extensions)

**Theme font**:
The single typeface a theme assigns to all diagram labels (nodes, edges, groups). Must be one of the bundled diagram fonts. Per-node `style.fontFamily` overrides the theme default for that node only.
_Avoid_: arbitrary web fonts in themes, split node/edge faces (for v1)

**Theme stroke**:
Border and line weights from the theme contract (`strokes.node`, `strokes.edge`, `strokes.group`). Contract defines defaults; each theme personality may override `strokes` in its palette file. Per-node `style.strokeWidth` / `borderWidth` overrides the theme default.
_Avoid_: hardcoded stroke widths in renderer components (for theme-driven paths), fixed stroke weights across all personalities

**Theme contract file**:
The core-shipped YAML merged with every theme at load time: `components`, `edge`, `group`, `typography` (sizes, weights, default `fontFamily`), and `strokes` (node, edge, group widths). Palette files supply hex and may override `fontFamily` and stroke weights per personality.

**Theme id**:
The stable machine identifier for a theme (`folio-light`, `ocean-dark`). Used in `diagram.theme`, schema validation, and as the primary CLI argument.
_Avoid_: friendly name, display name (when id is meant)

**Theme label**:
The human-friendly name shown in the preview theme dropdown (e.g. `Folio Mist`). CLI accepts the theme id or a slugified label (`folio-mist`); YAML always stores the id.
_Avoid_: id (when label is meant)

**Theme slug**:
Normalized form of a theme label for CLI lookup — lowercase, spaces to hyphens (e.g. `Folio Mist` → `folio-mist`). Resolves to the same theme as `folio-light` when unambiguous.

**Theme catalog**:
All themes discoverable at runtime — ten built-in pairs plus any installed extension themes. Preview dropdown and CLI list themes by **label**; resolve by **id** or **slug**.
_Avoid_: compile-time-only registry

**Component slot**:
A keyed entry in a diagram theme for each renderer `component` (`box`, `database`, `icon`, `line`, `group`, etc.). The theme assigns default colors per slot; all nodes using that component inherit them.
_Avoid_: role, category, shape type (when `component` is meant)

**Palette contract**:
The fixed file structure and component→palette mapping shared by every built-in theme. v1 covers the current catalog; new components add slots additively and reuse existing palette accents. New palette keys only when a distinct hue is needed. Missing slots fall back to `box`.
_Avoid_: one unique hue per component, closed component lists

**Palette extension**:
How the contract grows when new renderer components ship. Add a component slot (often pointing at an existing accent like `orange` or `cyan`); update all ten themes when ready; until then fallback styling applies.
_Avoid_: new palette key for every component

**Fill strategy**:
How palette colors apply to component bodies. Colorful built-in themes use **full fill** — each component slot sets `fill` from the palette (often with alpha in the hex value). Stroke and `iconColor` may match or contrast.
_Avoid_: tinted fill, stroke-only (for current built-in colorful themes)

**Edge styling**:
Line and marker colors come from the active theme's `edge` slot only in v1. All edges in a diagram share the same stroke; per-edge color overrides are deferred.
_Avoid_: per-edge style (for v1)

**Theme override**:
Per-node or per-group differences from the active theme, stored inline in diagram YAML — not a separate top-level overrides block. Preview writes only properties that differ from the **theme-resolved** baseline for that component slot.
_Avoid_: overrides section, full style blobs on every node

**Style alias**:
Equivalent YAML keys for the same override — e.g. `fill`, `fillColor`, and `backgroundColor` all set node fill. Canonical internal form uses theme contract keys (`fill`, `stroke`, `labelFill`, `iconColor`).

**Palette**:
Named color tokens declared once in a theme file (e.g. `cyan`, `green`, `surface`). Component slots reference palette names instead of repeating hex values. Built-in syntax-style themes are authored palette-first.
_Avoid_: swatch list, color map (unless explicitly the palette section)

## Flagged ambiguities

**Component vs role**: A node's `component` is its renderer shape. Theme color is keyed by component, not by architectural meaning. Two `box` nodes share the same theme colors unless one has a **theme override**.

## Example dialogue

**Dev:** Should the payments service look different from the orders service?

**Expert:** Only if you override it. Set `diagram.theme: folio-light` for defaults; add `style.fill` on payments if it should differ. Preview saves only that delta under the node's `style:`.

**Dev:** I changed a border color in preview — where does that go?

**Expert:** Same place — `nodes[].style.borderColor` (or `stroke`; they're aliases). Omitted keys still come from the theme file for that component.

**Dev:** Where do icon and edge colors live?

**Expert:** In the theme file — same palette contract as box fill. `components.icon.iconColor: purple`, `edge.stroke: muted`. One system, no separate light/dark layer.

**Dev:** What happens to diagrams that used `theme: light`?

**Expert:** Migrate to a new id like `folio-light`. `theme: default` becomes the same alias. One field, ten ids, one resolver.
