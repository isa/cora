# Testing Patterns

**Analysis Date:** 2026-05-29

## Test Framework

**Runner:**
- Vitest 4.1.x
- Configuration: `packages/cora/vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect` (uses standard matchers like `toBe`, `toEqual`, `toMatchObject`, `toContain`, `toThrow`).

**Run Commands:**
```bash
bun run test                              # Runs all Vitest unit tests
bun run test -- tests/core/iconify.test.ts # Runs a single test file
bun run test:golden                       # Compares rendered SVG layouts to golden baselines
UPDATE_GOLDEN=1 bun run test:golden       # Re-renders and updates visual golden baselines
```

## Test File Organization

**Location:**
- Test specs are kept in a separate directory structure under `packages/cora/tests/` rather than collocated with source code.

**Subdirectories:**
- `tests/core/`: Validation, parser, and layout coordinate calculations.
- `tests/renderer/`: Pure SVG React components structure tests.
- `tests/pdf/`: Default resvg/pdf-lib and Playwright high-quality PDF exporter logic.
- `tests/preview/`: Geometry and workbench canvas coordinates updates tests.
- `tests/smoke/`: Global command execution and package tarball integrity checks.
- `tests/golden/`: Baselines folder storing raw SVG layout snapshots.

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it } from 'vitest';

describe('Context/Feature Area', () => {
  it('should verify expected outcome under a specific scenario', () => {
    // Arrange (optional)
    const input = 'sample';
    
    // Act
    const result = processInput(input);
    
    // Assert
    expect(result).toEqual('expected');
  });
});
```

**Invariants Checked in Golden Tests:**
- No `<foreignObject>` elements in the output SVG (resvg compatibility constraint).
- Presence of valid XML namespaces (`xmlns="http://www.w3.org/2000/svg"`).
- Presence of `viewBox` properties for auto-scaling.

## Mocking

**Framework:**
- Vitest built-in mocking (`vi`).
- Stubs like `CORA_TEST_PLAYWRIGHT_INSTALL_STUB` are used to mock large binary package downloads.

## Coverage

- Coverage tracking is run on-demand via Vitest commands (`vitest run --coverage`), focused primarily on core parser pipelines and validators to ensure zero runtime parsing errors.

---

*Testing analysis: 2026-05-29*
*Update when test patterns change*
