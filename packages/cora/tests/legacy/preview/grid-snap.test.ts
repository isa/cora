import { describe, expect, it } from 'vitest';

import { snapPoint, resolveGridConfig } from '../../../src/core/grid.js';
import { shouldSnap } from '../../../src/preview/gridSnap.js';

describe('preview grid snap', () => {
  it('shouldSnap truth table', () => {
    expect(shouldSnap(true, false)).toBe(true);
    expect(shouldSnap(true, true)).toBe(false);
    expect(shouldSnap(false, false)).toBe(false);
    expect(shouldSnap(false, true)).toBe(true);
  });

  it('maps raw drag position through snapPoint with default config', () => {
    const raw = { x: 10, y: 10 };
    const config = resolveGridConfig();
    expect(snapPoint(raw, config)).toEqual({ x: 16, y: 16 });
  });

  // Connection endpoint drags intentionally skip snap (D-06) — enforced in WorkbenchCanvas.
});
