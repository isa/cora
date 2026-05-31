import { describe, expect, it } from 'vitest';

import {
  addNodeToCanvas,
  clearSelection,
  createDefaultWorkbenchState,
  deleteSelected,
  reconnectConnectionEndpoint,
  replaceNodeComponent,
  selectCanvasItem,
  setGroupSize,
  setNodeSize,
  setSelectedItems,
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

  it('replaces an existing node with an icon while preserving compatible props and connections', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'document',
      { x: 220, y: 20 },
    );
    const styled = updateNodeProps(
      updateNodeProps(
        setNodeSize(connected, 'node-1', { width: 180, height: 96 }),
        'node-1',
        'title',
        'API Gateway',
      ),
      'node-1',
      'backgroundColor',
      '#ff0000',
    );
    const replaced = replaceNodeComponent(styled, 'node-1', 'icon', {
      iconName: 'material-symbols:cloud',
    });

    expect(replaced.nodes).toHaveLength(2);
    expect(replaced.connections).toHaveLength(1);
    expect(replaced.connections[0]).toMatchObject({ fromNodeId: 'node-1', toNodeId: 'node-2' });
    expect(replaced.nodes[0]).toMatchObject({
      id: 'node-1',
      componentId: 'icon',
      position: { x: 10, y: 20 },
      props: {
        title: 'API Gateway',
        iconName: 'material-symbols:cloud',
        size: { width: 180, height: 96 },
      },
    });
    expect(replaced.nodes[0]?.props.backgroundColor).toBe('transparent');
    expect(replaced.selected).toEqual({ kind: 'node', id: 'node-1' });
  });

  it('uses the compact remapped website component size scale', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'website', { x: 10, y: 20 });
    const node = state.nodes[0]!;
    const sized = (size: 'sm' | 'md' | 'lg') => ({ ...node, props: { ...node.props, size } });

    expect(node.props.size).toBe('lg');
    expect(previewNodeSize(sized('lg'))).toEqual({ width: 108, height: 120 });
    expect(previewNodeSize(sized('sm'))).toEqual({ width: 64, height: 60 });
    expect(previewNodeSize(sized('md'))).toEqual({ width: 81, height: 90 });
  });

  it('resizes a node by setting an explicit pixel size', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 });
    const id = state.nodes[0]!.id;
    const resized = setNodeSize(state, id, { width: 220.4, height: 96.6 });

    expect(resized.nodes[0]?.props.size).toEqual({ width: 220, height: 97 });
    // Other nodes/props are untouched.
    expect(resized.nodes[0]?.position).toEqual(state.nodes[0]?.position);
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

  it('re-attaches a connection endpoint to another node, creating a second input', () => {
    // node-1 -> node-2 -> node-3 (connection-3: 1->2, connection-6: 2->3)
    const chain = addNodeToCanvas(
      addNodeToCanvas(
        addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
        'box',
        { x: 220, y: 20 },
      ),
      'box',
      { x: 430, y: 20 },
    );
    const [first, second] = chain.connections;
    expect(first).toMatchObject({ fromNodeId: 'node-1', toNodeId: 'node-2' });
    expect(second).toMatchObject({ fromNodeId: 'node-2', toNodeId: 'node-4' });

    // Drag the target end of node-1 -> node-2 onto node-3 (node-4).
    const reconnected = reconnectConnectionEndpoint(chain, first!.id, 'to', 'node-4');
    expect(reconnected.connections.find((c) => c.id === first!.id)).toMatchObject({
      fromNodeId: 'node-1',
      toNodeId: 'node-4',
    });
    // node-4 now has two incoming connections.
    expect(reconnected.connections.filter((c) => c.toNodeId === 'node-4')).toHaveLength(2);
    expect(reconnected.selected).toEqual({ kind: 'connection', id: first!.id });
  });

  it('rejects endpoint re-attachment that would create a self-loop or hit a label', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'box',
      { x: 220, y: 20 },
    );
    const connection = connected.connections[0]!;
    const withLabel = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connection.id }),
      'label',
      { x: 100, y: 100 },
    );
    const labelId = withLabel.nodes.at(-1)!.id;

    // Dropping the 'to' end back onto its own source would self-loop -> unchanged.
    expect(reconnectConnectionEndpoint(withLabel, connection.id, 'to', 'node-1')).toBe(withLabel);
    // Labels attach to the line, not its ends -> unchanged.
    expect(reconnectConnectionEndpoint(withLabel, connection.id, 'to', labelId)).toBe(withLabel);
  });

  it('marquee-selects nodes, connections and groups, and deletes them all together', () => {
    const withNodes = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'box',
      { x: 220, y: 20 },
    );
    const withGroup = addNodeToCanvas(withNodes, 'group', { x: 0, y: 0 });
    const connectionId = withGroup.connections[0]!.id;
    const groupId = withGroup.groups[0]!.id;

    const selected = setSelectedItems(withGroup, {
      nodeIds: ['node-1', 'node-2'],
      connectionIds: [connectionId],
      groupIds: [groupId],
    });
    expect(selected.selectedNodeIds).toEqual(['node-1', 'node-2']);
    expect(selected.selectedConnectionIds).toEqual([connectionId]);
    expect(selected.selectedGroupIds).toEqual([groupId]);
    // Mixed selection has no single `selected` item.
    expect(selected.selected).toBeUndefined();

    const cleared = deleteSelected(selected);
    expect(cleared.nodes).toEqual([]);
    expect(cleared.connections).toEqual([]);
    expect(cleared.groups).toEqual([]);
    expect(cleared.selectedNodeIds).toEqual([]);
    expect(cleared.selectedConnectionIds).toEqual([]);
    expect(cleared.selectedGroupIds).toEqual([]);
  });

  it('collapses a single-item marquee result back to a normal selection', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 });
    const selected = setSelectedItems(state, { nodeIds: ['node-1'] });
    expect(selected.selected).toEqual({ kind: 'node', id: 'node-1' });
    expect(selected.selectedNodeIds).toEqual(['node-1']);
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
