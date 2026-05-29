# Codebase Structure

**Analysis Date:** 2026-05-29

## Directory Layout

```
cora-monorepo/
├── .planning/            # Project planning, roadmap, and state documentation
│   ├── codebase/        # Codebase mapping and audit files (this directory)
│   ├── phases/          # Detailed phase plans, context, and summaries
│   └── research/        # Technology, architecture, and feature research files
├── packages/
│   └── cora/            # Core Cora implementation package
│       ├── dist/        # Compiled production CLI and library assets
│       ├── preview-dist/# Pre-built Vite client preview SPA bundle
│       ├── scripts/     # Utility scripts (icon generation, etc.)
│       ├── src/         # TypeScript source code
│       │   ├── cli/     # CLI parser and command definitions
│       │   ├── core/    # Document parser, AJV schema validator, and ELK layouts
│       │   ├── preview/ # Vite application components, styles, and dev server
│       │   └── renderer/# React components and drawing serialize helpers
│       └── tests/       # Unit, integration, smoke, and golden regression tests
├── package.json         # Workspace configurations and run scripts
├── turbo.json           # Turborepo task definitions and cache settings
└── tsconfig.base.json   # TypeScript base compiler configuration
```

## Directory Purposes

**packages/cora/src/core/**
- Purpose: Abstract syntax validation, layout calculations, and helper functions.
- Contains: `*.ts` files executing AST operations and layouts engine hooks.
- Key files:
  - `layout.ts`: Main ELK layout engine wrapper.
  - `validator.ts`: AJV validation runner.
  - `parser.ts`: Parser resolving diagram YAML/JSON specifications.

**packages/cora/src/renderer/**
- Purpose: Converts parsed LayoutedDiagram properties into SVG shapes.
- Contains: React drawing components and PDF/PNG packaging serializers.
- Key files:
  - `Diagram.tsx`: Master components router and SVG layout compositor.
  - `renderToSVG.tsx`: Static markup generator.
  - `renderToPDF.ts` & `renderToPDFHighQuality.ts`: Document export implementations.

**packages/cora/src/preview/**
- Purpose: Interactive preview canvas application codebase.
- Contains: Component explorer components and custom Vite setups.
- Key files:
  - `App.tsx`: Workbench layout and controls manager.
  - `server.ts`: Express development server launching configuration.

**packages/cora/tests/**
- Purpose: Verification suites covering all system commands and layouts.
- Subdirectories:
  - `core/`: Tests for parsing, validator, and connection calculations.
  - `renderer/`: Tests checking generated SVG structures.
  - `pdf/`: Exporters verification tests.
  - `smoke/`: CLI and package distribution health checks.

## Key File Locations

**Entry Points:**
- `packages/cora/src/index.ts`: Public API entry point.
- `packages/cora/src/cli/index.ts`: Command parser entry point.

**Configuration:**
- `turbo.json`: Root Turborepo task configuration.
- `packages/cora/package.json`: Main manifest declaring runtime dependencies.
- `packages/cora/tsconfig.json`: Local compiler setup.

**Core Logic:**
- `packages/cora/src/core/schema/diagram.schema.json`: ground-truth JSON Schema schema definition.

## Naming Conventions

**Files:**
- `kebab-case.ts`: For core utility modules, parser components, and general helper scripts.
- `PascalCase.tsx` / `PascalCase.ts`: For React components, layout configurations, and master routers (e.g., `BoxNode.tsx`, `Diagram.tsx`).
- `kebab-case.test.ts`: For test specifications (e.g., `connection-anchors.test.ts`).

**Directories:**
- `kebab-case`: General directories (e.g., `preview-dist`, `node_modules`).

**Special Patterns:**
- `index.ts`: Standard barrel file re-exporting local files.

## Where to Add New Code

**New Node Shape / Drawing Component:**
- Implementation: `packages/cora/src/renderer/components/nodes/` (Create `PascalCase.tsx` component and export it in `index.ts`).
- Styling Default: Define default attributes inside `packages/cora/src/renderer/themes/componentDefaults.ts`.

**New CLI Option / Command:**
- Implementation: `packages/cora/src/cli/commands/` (Define Command interface rules and export it inside `packages/cora/src/cli/index.ts`).

**New Core Layout Rule:**
- Implementation: `packages/cora/src/core/layout.ts` (Update layout worker handlers or sizing overrides).
- Test Case: Add verification assertions to `packages/cora/tests/core/` and update golden visual outputs.

## Special Directories

**packages/cora/dist/**
- Purpose: Generated production build assets (CLI executable and libraries).
- Committed: No (specifically excluded via `.gitignore`).

**packages/cora/preview-dist/**
- Purpose: Vite production compiler output for preview workbench SPA.
- Committed: No (specifically excluded via `.gitignore`).

---

*Structure analysis: 2026-05-29*
*Update when directory structure changes*
