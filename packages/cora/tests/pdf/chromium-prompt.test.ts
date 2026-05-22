import { describe, it } from 'vitest';

// Plan 03-03 turns these into real tests against the
// --quality=high predicate split (CHROMIUM_NOT_INSTALLED JSON shape,
// --yes triggers install, CORA_AUTO_INSTALL=1 triggers install).
// Covers EXP-04.
describe.skip('--quality=high predicate split', () => {
  it.todo('non-interactive + no --yes + missing chromium → CHROMIUM_NOT_INSTALLED JSON');
  it.todo('--yes triggers install via spawn');
  it.todo('CORA_AUTO_INSTALL=1 triggers install');
});
