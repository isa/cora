import { describe, expect, it } from 'vitest';

import {
  addNodeToCanvas,
  clearSelection,
  createDefaultWorkbenchState,
  selectCanvasItem,
  setGroupSize,
  updateGroup,
  updateConnectionProps,
  updateNodeProps,
} from '../../src/preview/state.js';
import { previewNodeSize } from '../../src/preview/geometry.js';

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
        'document',
        { x: 200, y: 20 },
      ),
      'app',
      { x: 360, y: 20 },
    );

    expect(state.nodes.map((node) => node.componentId)).toEqual(['box', 'document', 'app']);
    expect(state.connections).toHaveLength(2);
    expect(state.selected).toEqual({ kind: 'node', id: 'node-4' });
  });

  it('resets props and positions when replacing a selected canvas node from the catalog', () => {
    const state = updateNodeProps(
      addNodeToCanvas(
        addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
        'app',
        { x: 220, y: 20 },
      ),
      'node-1',
      'title',
      'Changed',
    );
    const reset = addNodeToCanvas(selectCanvasItem(state, { kind: 'node', id: 'node-1' }), 'document', { x: 300, y: 120 });

    expect(reset.nodes.at(-1)?.componentId).toBe('document');
    expect(reset.nodes.at(-1)?.props.title).not.toBe('Changed');
    expect(reset.nodes.at(-1)?.position).toEqual({ x: 300, y: 120 });
  });

  it('applies catalog prop overrides when adding searched icons', () => {
    const state = addNodeToCanvas(
      createDefaultWorkbenchState(),
      'icon',
      { x: 10, y: 20 },
      { title: 'cloud', iconName: 'material-symbols:cloud' },
    );

    expect(state.nodes[0]?.componentId).toBe('icon');
    expect(state.nodes[0]?.props.title).toBe('cloud');
    expect(state.nodes[0]?.props.iconName).toBe('material-symbols:cloud');
  });

  it('uses the compact remapped website component size scale', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'website', { x: 10, y: 20 });
    const small = updateNodeProps(state, state.nodes[0]!.id, 'size', 'sm');
    const medium = updateNodeProps(small, state.nodes[0]!.id, 'size', 'md');
    const large = updateNodeProps(medium, state.nodes[0]!.id, 'size', 'lg');

    expect(state.nodes[0]?.props.size).toBe('lg');
    expect(previewNodeSize(state.nodes[0]!)).toEqual({ width: 108, height: 120 });
    expect(previewNodeSize(small.nodes[0]!)).toEqual({ width: 64, height: 60 });
    expect(previewNodeSize(medium.nodes[0]!)).toEqual({ width: 81, height: 90 });
    expect(previewNodeSize(large.nodes[0]!)).toEqual({ width: 108, height: 120 });
  });

  it('attaches label components to the selected connection without creating a node connection', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'document',
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
    expect(withLabelIcon.nodes.at(-1)?.props.title).toBe('');
  });

  it('clears selection and resizes groups without replacing canvas content', () => {
    const withGroup = addNodeToCanvas(createDefaultWorkbenchState(), 'group', { x: 20.4, y: 30.6 });
    const styled = updateGroup(withGroup, withGroup.groups[0]!.id, {
      fillColor: '#f8fafc',
      labelColor: '#334155',
      labelSize: 16,
    });
    const resized = setGroupSize(styled, styled.groups[0]!.id, { width: 320.4, height: 220.6 });
    const deselected = clearSelection(resized);

    expect(withGroup.groups[0]).toMatchObject({
      fillColor: 'none',
      labelColor: '#0f172a',
      labelSize: 12,
      position: { x: 20, y: 31 },
    });
    expect(resized.groups[0]).toMatchObject({
      fillColor: '#f8fafc',
      labelColor: '#334155',
      labelSize: 16,
      size: { width: 320, height: 221 },
    });
    expect(deselected.groups).toHaveLength(1);
    expect(deselected.selected).toBeUndefined();
  });

  it('rejects invalid connection prop updates', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'document',
      { x: 220, y: 20 },
    );
    const connection = state.connections[0]!;
    const invalid = updateConnectionProps(state, connection.id, 'strokeWidth', 99);
    const valid = updateConnectionProps(state, connection.id, 'strokeWidth', 4);

    expect(invalid.connections[0]?.props.strokeWidth).toBe(connection.props.strokeWidth);
    expect(valid.connections[0]?.props.strokeWidth).toBe(4);
  });
});
