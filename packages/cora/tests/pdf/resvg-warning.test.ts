import { describe, it } from 'vitest';

// Plan 03-02 turns these into real tests against
// packages/cora/src/renderer/pdf/resvgCapture.ts (stderr capture +
// CI-mode exit). Covers D-11.
describe.skip('resvg stderr capture', () => {
  it.todo('captures No match for font-family warnings');
  it.todo('CI=1 + warnings → non-zero exit');
});
