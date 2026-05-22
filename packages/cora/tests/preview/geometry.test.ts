import { describe, expect, it } from 'vitest';

import { moveNode } from '../../src/preview/drag.js';
import {
  chooseConnectionSides,
  computeAttachmentSlots,
  computeConnectionPoints,
} from '../../src/preview/geometry.js';
import { createDefaultWorkbenchState } from '../../src/preview/state.js';

describe('preview geometry', () => {
  it('selects left/right and top/bottom connection sides', () => {
    expect(
      chooseConnectionSides(
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 200, y: 10, width: 100, height: 50 },
      ),
    ).toEqual({ sourceSide: 'right', targetSide: 'left' });
    expect(
      chooseConnectionSides(
        { x: 0, y: 0, width: 100, height: 50 },
        { x: 10, y: 160, width: 100, height: 50 },
      ),
    ).toEqual({ sourceSide: 'bottom', targetSide: 'top' });
  });

  it('labels and distributes multiple same-side attachment slots', () => {
    const slots = computeAttachmentSlots(
      { x: 0, y: 0, width: 120, height: 80 },
      'primary',
      'top',
      3,
    );

    expect(slots.map((slot) => slot.label)).toEqual(['top-1', 'top-2', 'top-3']);
    expect(new Set(slots.map((slot) => slot.x)).size).toBe(3);
  });

  it('builds explicit line points and moves only the requested selected node', () => {
    const state = createDefaultWorkbenchState();
    const points = computeConnectionPoints(state);
    const moved = moveNode(state, 'secondary', { x: 20, y: 10 });

    expect(points.length).toBeGreaterThanOrEqual(2);
    expect(moved.primary.position).toEqual(state.primary.position);
    expect(moved.secondary.position).toEqual({ x: 490, y: 180 });
  });
});
