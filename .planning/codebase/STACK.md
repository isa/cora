# Technology Stack

**Analysis Date:** 2026-05-29

## Languages

**Primary:**
- TypeScript 5.8.x - All application source code located in `src/` (core, renderer, cli, preview)

**Secondary:**
- JavaScript / MJS - Build and utility scripts located in `scripts/`, testing utilities (e.g., `tests/render-golden.mjs`)

## Runtime

**Environment:**
- Node.js >= 22 (engine requirement specified in package.json)
- Bun 1.3.6 - Local development and workspace dependency management

**Package Manager:**
- Bun 1.3.6 (using monorepo workspaces)
- Lockfile: `bun.lock` (root of workspace)

## Frameworks

**Core:**
- React 19.x - Pure UI components in the renderer (`packages/cora/src/renderer/`) and interactive preview application (`packages/cora/src/preview/`)
- React DOM 19.x - Used for HTML/SVG string serialization (`renderToStaticMarkup` in Node.js headless render) and mounting the client application in the preview SPA

**Testing:**
- Vitest 4.1.x - Fast, ESM-native unit testing runner (`packages/cora/vitest.config.ts`)
- Custom Golden testing runner - Node.js-based golden regression script (`packages/cora/tests/render-golden.mjs`)

**Build/Dev:**
- tsdown 0.22.x - Library compiler (builds TypeScript files to target files using Rolldown)
- Turborepo 2.5.x - Workspace build orchestrator (`turbo.json`)
- Vite 8.0.x - Bundler and dev server for preview workbench SPA (`packages/cora/src/preview/vite.config.ts`)

## Key Dependencies

**Critical:**
- `yaml` 2.7.x - Parses YAML into Document AST, allowing comment-preserving and order-preserving save-back mutations for `cora serve`
- `elkjs` 0.11.x - Automated graph layout engine based on Eclipse Layout Kernel (ELK)
- `ajv` 8.17.x - Compiles JSON Schema to validate diagram YAML input with high performance
- `@resvg/resvg-js` ~2.6.2 - Rust-backed fast SVG-to-PNG rasterizer with zero system dependencies
- `pdf-lib` 1.17.x - Selectable text overlay layout and PDF composition (draws raster images inside PDF structure)
- `playwright` 1.60.x - Optional browser instrumentation used for true vector PDF rendering under `--quality=high` (Chromium downloaded on first use to `~/.config/cora/browsers/`)

**Infrastructure:**
- `commander` 12.1.x - CLI commands structure and arguments parsing
- `picocolors` 1.1.x - Standard console color formatting (used in CLI commands outputs)
- `web-worker` 1.5.x - Runs ELK layout engine inside a worker thread to keep the main event loop responsive
- `@iconify/utils` 3.1.x & `@iconify-json/{basil,material-symbols}` - Offline icon validation, mapping, and rendering support

## Configuration

**Environment:**
- `CORA_AUTO_INSTALL=1` / `--yes` - Opts into headless Chromium binary installation for `--quality=high`
- `CI=1` - Runs default PDF lane tests with strict font-fallback warnings detection
- `UPDATE_GOLDEN=1` - Updates SVG golden baselines when running the golden regression runner

**Build:**
- `tsconfig.base.json` & `packages/cora/tsconfig.json` - Compiler configurations
- `packages/cora/tsdown.config.ts` - Bundler settings for core, renderer, and CLI distribution assets
- `packages/cora/src/preview/vite.config.ts` - Client application development server config

## Platform Requirements

**Development:**
- macOS, Linux, or Windows with Node.js >= 22 and Bun installed. Playwright requires dynamic browser download capability.

**Production:**
- Installed globally via npm/yarn/bun. Fully portable (except the optional `--quality=high` Chromium dependency which downloads to home config directories on-demand).

---

*Stack analysis: 2026-05-29*
*Update after major dependency changes*
