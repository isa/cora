import { describe, expect, it } from 'vitest';

import {
  addNodeToCanvas,
  clearSelection,
  createDefaultWorkbenchState,
  selectCanvasItem,
  setGroupSize,
  updateNodeProps,
} from '../../src/preview/state.js';

describe('preview drag canvas state', () => {
  it('starts with an empty canvas and no selected lines or groups', () => {
    const state = createDefaultWorkbenchState();

    expect(state.nodes).toEqual([]);
    expect(state.connections).toEqual([]);
    expect(state.groups).toEqual([]);
    expect(state.selected).toBeUndefined();
    expect('selectedLine' in state).toBe(false);
    expect('selectedGroup' in state).toBe(false);
  });

  it('adds unlimited nodes and creates connections between drops', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(
        addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
        'page',
        { x: 200, y: 20 },
      ),
      'issue',
      { x: 360, y: 20 },
    );

    expect(state.nodes.map((node) => node.componentId)).toEqual(['box', 'page', 'issue']);
    expect(state.connections).toHaveLength(2);
    expect(state.selected).toEqual({ kind: 'node', id: 'node-4' });
  });

  it('resets props and positions when replacing a selected canvas node from the catalog', () => {
    const state = updateNodeProps(
      addNodeToCanvas(
        addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
        'issue',
        { x: 220, y: 20 },
      ),
      'node-1',
      'title',
      'Changed',
    );
    const reset = addNodeToCanvas(selectCanvasItem(state, { kind: 'node', id: 'node-1' }), 'page', { x: 300, y: 120 });

    expect(reset.nodes.at(-1)?.componentId).toBe('page');
    expect(reset.nodes.at(-1)?.props.title).not.toBe('Changed');
    expect(reset.nodes.at(-1)?.position).toEqual({ x: 300, y: 120 });
  });

  it('attaches label components to the selected connection without creating a node connection', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'page',
      { x: 220, y: 20 },
    );
    const withLabel = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connected.connections[0]!.id }),
      'label',
      { x: 100, y: 100 },
    );

    expect(withLabel.connections).toHaveLength(1);
    expect(withLabel.nodes.at(-1)?.componentId).toBe('label');
    expect(withLabel.nodes.at(-1)?.attachedConnectionId).toBe(connected.connections[0]!.id);

    const withLabelIcon = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connected.connections[0]!.id }),
      'labelIcon',
      { x: 120, y: 100 },
    );

    expect(withLabelIcon.connections).toHaveLength(1);
    expect(withLabelIcon.nodes.at(-1)?.componentId).toBe('labelIcon');
    expect(withLabelIcon.nodes.at(-1)?.attachedConnectionId).toBe(connected.connections[0]!.id);
  });

  it('clears selection and resizes groups without replacing canvas content', () => {
    const withGroup = addNodeToCanvas(createDefaultWorkbenchState(), 'group', { x: 20, y: 30 });
    const resized = setGroupSize(withGroup, withGroup.groups[0]!.id, { width: 320, height: 220 });
    const deselected = clearSelection(resized);

    expect(resized.groups[0]?.size).toEqual({ width: 320, height: 220 });
    expect(deselected.groups).toHaveLength(1);
    expect(deselected.selected).toBeUndefined();
  });
});
