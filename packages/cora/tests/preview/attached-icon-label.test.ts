import { describe, expect, it } from 'vitest';

import { sharedPreviewLayout } from '../../src/preview/components/WorkbenchCanvas.js';
import { computeNodeBox } from '../../src/preview/geometry.js';
import {
  addNodeToCanvas,
  createDefaultWorkbenchState,
  selectCanvasItem,
} from '../../src/preview/state.js';

function distToPolyline(p: { x: number; y: number }, pts: Array<{ x: number; y: number }>): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
  }
  return best;
}

describe('attached icon-label rides the drawn connection line', () => {
  it('places the icon centre on the shared-layout edge, not a re-derived route', () => {
    let state = createDefaultWorkbenchState();
    state = { ...state, nodes: [], connections: [], groups: [], selected: undefined };
    state = addNodeToCanvas(state, 'box', { x: 100, y: 100 });
    state = addNodeToCanvas(state, 'box', { x: 100, y: 400 });
    const connection = state.connections[0]!;
    state = selectCanvasItem(state, { kind: 'connection', id: connection.id });
    state = addNodeToCanvas(state, 'labelIcon', { x: 110, y: 220 });
    const iconNode = state.nodes.find((n) => n.componentId === 'labelIcon')!;

    const edge = sharedPreviewLayout(state)!.edges[0]!;
    const box = computeNodeBox(state, iconNode.id, edge.points)!;

    // The icon column is centred horizontally in the box; it must land on the
    // line. Walking the box centre against the polyline keeps the bound generous
    // enough to ignore the icon/text vertical offset while still catching a
    // sideways drift off the line.
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 3 };
    expect(distToPolyline(centre, edge.points)).toBeLessThan(8);
  });
});
