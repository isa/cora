# Architecture

**Analysis Date:** 2026-05-29

## Pattern Overview

**Overall:** Layered Monolithic CLI and Library exports.

**Key Characteristics:**
- **Strict Dependency Direction:** `cli` → `preview`/`web` → `renderer` → `core`. No module imports files from higher layers.
- **Pure Stateless Renderer:** React rendering is completely stateless and runs identically in both headless CLI and browser preview SPA environments.
- **AST-preserving YAML mutation:** Edits from the preview workbench mutate the YAML Document AST to preserve layout structure, ordering, and comments.
- **Worker thread layout execution:** Layout calculations (ELK engine) run on a worker thread to keep the Node/browser main threads unblocked.

## Layers

**Core Layer (`packages/cora/src/core/`):**
- Purpose: Parsing, validation, layout calculations, and style resolution.
- Contains: Schema validator (`validator.ts`), ELK wrapper (`layout.ts`), theme resolver (`themeResolver.ts`), and offline icon manager (`iconify.ts`).
- Depends on: `elkjs`, `yaml`, `ajv` (React is completely forbidden).
- Used by: Renderer layer, CLI layer, and Preview layer.

**Renderer Layer (`packages/cora/src/renderer/`):**
- Purpose: Stateless React components that render the Diagram IR to SVG markup.
- Contains: SVG element components (`components/`), SVG serializer (`renderToSVG.tsx`), rasterizer (`renderToPNG.ts`), and PDF exporters (`renderToPDF.ts`, `renderToPDFHighQuality.ts`).
- Depends on: Core types, React 19.
- Used by: CLI command layer and Preview application.

**Preview Layer (`packages/cora/src/preview/`):**
- Purpose: Vite-based interactive component workbench browser application.
- Contains: Component explorer SPA (`App.tsx`), layout sandbox (`geometry.ts`), drag/drop handlers (`drag.ts`), and local preview server utility (`server.ts`).
- Depends on: Core types, Renderer React components.
- Used by: CLI dev environment commands.

**CLI Layer (`packages/cora/src/cli/`):**
- Purpose: Node process entry point, flag parsing, file system I/O, and command routing.
- Contains: Command handlers (`commands/validate.ts`, `commands/render.ts`, `commands/schema.ts`, `commands/preview.ts`) and Playwright installer (`playwrightInstall.ts`).
- Depends on: Core layer, Renderer layer, and Node standard library.
- Used by: Executable binary runtime (`dist/cli.js`).

## Data Flow

**Diagram Rendering Flow (`cora render`):**

1. User invokes `cora render diagram.yaml -o output.svg`
2. `cli/commands/render.ts` reads the file and invokes `core/parser.ts`.
3. `core/validator.ts` verifies diagram syntax and contents against the JSON Schema schema.
4. `core/themeResolver.ts` resolves stylesheet styles and component look attributes.
5. `core/layout.ts` invokes ELK layout calculations inside `core/layoutWorker.ts` and outputs layout coordinates.
6. `renderer/renderToSVG.tsx` serializes the layout result into an XML-namespaced SVG string.
7. File I/O writes the SVG document to disk.

**Interactive Preview Flow (`cora preview`):**

1. User runs `cora preview --no-open` in a development environment.
2. CLI dynamically imports the preview server command (gated via `isDevEnvironment` to prevent Vite imports in production installs).
3. `preview/server.ts` starts a Vite development server serving the preview workbench client application.
4. Client application mounts the `preview/App.tsx` component to allow interaction with preview templates.

## Key Abstractions

**DiagramIR (`src/core/types.ts`):**
- Purpose: Core typed representation of nodes, edges, groups, and styles. Acts as the intermediate model contract between core pipelines and renderers.

**Node Component Catalog (`src/renderer/components/nodes/`):**
- Purpose: Extensible, stateless drawing components representing visual styles (e.g., `BoxNode.tsx`, `WebsiteNode.tsx`, `AppNode.tsx`).

**Structured Error Array (`src/core/errors.ts`):**
- Purpose: Standardized structure for parser syntax errors (`PARSE_ERROR`), schema check failures (`SCHEMA_VIOLATION`), and layouts mismatches (`LAYOUT_ERROR`). Returned by the validator for agent loop consumption.

## Entry Points

**Main Library Entry (`src/index.ts`):**
- Purpose: Library entry exporting core functions and public components for programmatic use.

**CLI Entry Point (`src/cli/index.ts`):**
- Purpose: CLI parsing entry. Conditionally loads the preview server command in development environments.

## Error Handling

**Strategy:** Errors throw standard domain error objects containing validation details, which are caught at CLI level to print a structured JSON array (`StructuredError[]`) if `--format json` is requested.

**Patterns:**
- Schema violations raise AJV validation arrays mapping to file path and validation rules.
- Chromium installation failures raise `ChromiumInstallError` with network/execution context.

## Cross-Cutting Concerns

**Theme Resolution:**
- Managed centrally in `src/renderer/themes/componentDefaults.ts` as the single source of truth for component margins, font sizes, colors, and line widths.

**Text Measurement:**
- Handled in `src/core/measureText.ts` and `src/core/catalogTextLayout.ts` to compute label geometry before executing ELK layout calculations.

---

*Architecture analysis: 2026-05-29*
*Update when major patterns change*
