import { describe, it } from 'vitest';

// Plan 03-02 turns these into real tests against
// packages/cora/src/renderer/pdf/pageSize.ts (computePageGeometry).
describe.skip('computePageGeometry', () => {
  it.todo('fit-to-content returns bbox + 2*margin');
  it.todo('--page=a4 with oversized diagram returns scale<1 and centered offset');
  it.todo('a4-portrait swaps width/height');
});
