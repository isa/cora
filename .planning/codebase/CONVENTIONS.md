# Coding Conventions

**Analysis Date:** 2026-05-29

## Naming Patterns

**Files:**
- `kebab-case.ts`: For modules, controllers, helper libraries, and setup files.
- `PascalCase.tsx`: For React components (e.g., `BoxNode.tsx`, `Diagram.tsx`).
- `kebab-case.test.ts`: For test specifications located alongside source or in test folders.
- `index.ts`: Standard barrel file for module re-exports.

**Functions:**
- `camelCase`: For all standard utility and helper functions.
- Async functions do not use custom prefixes; they use descriptive verbs (e.g., `installChromium`).

**Variables:**
- `camelCase`: For standard variables and properties.
- `UPPER_SNAKE_CASE`: For constant definitions (e.g., `ERROR_CODES`, `DEFAULT_ICON_PREFIX`).

**Types:**
- `PascalCase`: For interfaces, type aliases, and enums. Interfaces do not use the `I` prefix (e.g., `DiagramNode`, not `IDiagramNode`).

## Code Style

**Formatting:**
- Indentation: 2 spaces.
- Semicolons: Required.
- Quotes: Single quotes for JavaScript/TypeScript string declarations.
- Trailing commas: Used for objects and lists to prevent noisy diffs.

**Linting:**
- Handled primarily by strict TypeScript type checking (`tsc --noEmit`) verifying variables, signatures, and imports.

## Import Organization

**Order:**
- 1. Node.js built-in modules (`node:path`, `node:fs`, `node:child_process`).
- 2. External package dependencies (`react`, `ajv`, `elkjs`).
- 3. Local source code imports (using relative paths `../` or `./`).
- 4. Type imports (explicitly declared via `import type { ... }`).

**Important Node/ESM Rule:**
- Relative imports **must** include the `.js` extension (e.g., `import { CHROMIUM_DIR } from './paths.js'`), even when importing TypeScript source files. This is mandatory for ESM runtime compatibility.

## Error Handling

**Patterns:**
- Programmatic/agent validation flows do not raise throwing exceptions; they return structured error arrays (`StructuredError[]`) detailing validation gaps.
- CLI execution problems throw custom domain errors (e.g., `ChromiumInstallError`) which are caught in `cli/index.ts` to output clean messages and exit codes.

## Logging

- The CLI uses `console.log` for rendering ASCII diagrams and messages, and `console.error` for validation errors.
- Text formatting colors are applied via the `picocolors` package.

## Comments

- JSDoc comments are recommended for public library APIs and main modules.
- TODO comments follow the standard `// TODO: description` pattern (optionally referencing issue numbers).

---

*Convention analysis: 2026-05-29*
*Update when patterns change*
