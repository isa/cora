import { describe, expect, it } from 'vitest';

import {
  nodePointerHitRect,
  sharedPreviewLayout,
} from '../../src/preview/components/WorkbenchCanvas.js';
import { computeNodeBox } from '../../src/preview/geometry.js';
import {
  addNodeToCanvas,
  createDefaultWorkbenchState,
  selectCanvasItem,
} from '../../src/preview/state.js';

describe('attached label pointer hit targets', () => {
  it('centers the hit rect on visible label text, not the full layout box', () => {
    let state = createDefaultWorkbenchState();
    state = { ...state, nodes: [], connections: [], groups: [], selected: undefined };
    state = addNodeToCanvas(state, 'box', { x: 80, y: 80 });
    state = addNodeToCanvas(state, 'box', { x: 80, y: 320 });
    const connection = state.connections[0]!;
    state = selectCanvasItem(state, { kind: 'connection', id: connection.id });
    state = addNodeToCanvas(state, 'label', { x: 0, y: 0 }, { text: 'Edge label' });

    const label = state.nodes.find((node) => node.componentId === 'label')!;
    const edge = sharedPreviewLayout(state)!.edges[0]!;
    const box = computeNodeBox(state, label.id, edge.points)!;
    const hit = nodePointerHitRect(label, box);

    expect(hit.width).toBeLessThan(box.width);
    expect(hit.height).toBeLessThanOrEqual(box.height);
    expect(hit.x + hit.width / 2).toBeCloseTo(box.x + box.width / 2, 0);
    expect(hit.y + hit.height / 2).toBeCloseTo(box.y + box.height / 2, 0);
  });

  it('uses top-aligned content height for attached icon labels', () => {
    let state = createDefaultWorkbenchState();
    state = { ...state, nodes: [], connections: [], groups: [], selected: undefined };
    state = addNodeToCanvas(state, 'box', { x: 80, y: 80 });
    state = addNodeToCanvas(state, 'box', { x: 80, y: 320 });
    const connection = state.connections[0]!;
    state = selectCanvasItem(state, { kind: 'connection', id: connection.id });
    state = addNodeToCanvas(state, 'labelIcon', { x: 0, y: 0 }, { title: 'API' });

    const labelIcon = state.nodes.find((node) => node.componentId === 'labelIcon')!;
    const edge = sharedPreviewLayout(state)!.edges[0]!;
    const box = computeNodeBox(state, labelIcon.id, edge.points)!;
    const hit = nodePointerHitRect(labelIcon, box);

    expect(hit.height).toBeLessThan(box.height);
    expect(hit.y).toBeLessThanOrEqual(box.y);
  });
});
