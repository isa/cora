import { describe, expect, it } from 'vitest';

import {
  addIconItemToCanvas,
  addNodeToCanvas,
  clearSelection,
  createDefaultWorkbenchState,
  selectCanvasItem,
  setGroupPosition,
  setGroupSize,
  updateGroup,
  updateConnectionProps,
  updateNodeProps,
} from '../../src/preview/state.js';
import { catalogItems } from '../../src/preview/pack/catalogItems.js';

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
      'icon',
      { x: 360, y: 20 },
    );

    expect(state.nodes.map((node) => node.componentId)).toEqual(['box', 'page', 'icon']);
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

  it('adds icon drops as reusable shortcuts and supports line-attached label icons', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'page',
      { x: 220, y: 20 },
    );
    const withIcon = addIconItemToCanvas(connected, 'default', 'database', { x: 340, y: 80 });
    const withAttachedIcon = addIconItemToCanvas(
      withIcon,
      'default',
      'database',
      { x: 120, y: 80 },
      {
        componentId: 'labelIcon',
        attachedConnectionId: connected.connections[0]!.id,
      },
    );

    expect(withIcon.nodes.at(-1)?.componentId).toBe('icon');
    expect(withAttachedIcon.nodes.at(-1)?.componentId).toBe('labelIcon');
    expect(withAttachedIcon.nodes.at(-1)?.attachedConnectionId).toBe(connected.connections[0]!.id);
    expect(catalogItems(withAttachedIcon).filter((item) => item.id === 'icon:default:database')).toHaveLength(1);
  });

  it('clears selection and resizes groups without replacing canvas content', () => {
    const withGroup = addNodeToCanvas(createDefaultWorkbenchState(), 'group', { x: 20, y: 30 });
    const resized = setGroupSize(withGroup, withGroup.groups[0]!.id, { width: 320, height: 220 });
    const deselected = clearSelection(resized);

    expect(resized.groups[0]?.size).toEqual({ width: 320, height: 220 });
    expect(deselected.groups).toHaveLength(1);
    expect(deselected.selected).toBeUndefined();
  });

  it('rounds group geometry updates to whole pixels', () => {
    const withGroup = addNodeToCanvas(createDefaultWorkbenchState(), 'group', { x: 20.4, y: 30.6 });
    const groupId = withGroup.groups[0]!.id;
    const moved = setGroupPosition(withGroup, groupId, { x: 101.2, y: 202.8 });
    const resized = setGroupSize(moved, groupId, { width: 320.3, height: 220.7 });
    const patched = updateGroup(resized, groupId, {
      position: { x: 11.5, y: 12.49 },
      size: { width: 180.5, height: 90.49 },
    });

    expect(withGroup.groups[0]?.position).toEqual({ x: 20, y: 31 });
    expect(moved.groups[0]?.position).toEqual({ x: 101, y: 203 });
    expect(resized.groups[0]?.size).toEqual({ width: 320, height: 221 });
    expect(patched.groups[0]?.position).toEqual({ x: 12, y: 12 });
    expect(patched.groups[0]?.size).toEqual({ width: 181, height: 90 });
  });

  it('rejects invalid connection prop updates', () => {
    const state = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 }),
      'page',
      { x: 220, y: 20 },
    );
    const connection = state.connections[0]!;
    const invalid = updateConnectionProps(state, connection.id, 'strokeWidth', 99);
    const valid = updateConnectionProps(state, connection.id, 'strokeWidth', 4);

    expect(invalid.connections[0]?.props.strokeWidth).toBe(connection.props.strokeWidth);
    expect(valid.connections[0]?.props.strokeWidth).toBe(4);
  });
});
