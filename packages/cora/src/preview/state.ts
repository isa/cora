import type { PackManifest, PreviewComponentDefinition } from './pack/types.js';
import { builtInPack } from './pack/builtins.js';
import { connectionControls, connectionDefaults, type ConnectionProps, type PreviewNodeProps } from './controls/defaults.js';
import { isValidControlValue } from './controls/schema.js';
import type { DiagramKind } from '../core/types.js';

export interface PreviewPosition {
  x: number;
  y: number;
}

export type AttachedEnd = 'source' | 'target';

export interface CanvasNode {
  id: string;
  componentId: string;
  props: PreviewNodeProps;
  position: PreviewPosition;
  attachedConnectionId?: string;
  // Which end of the connection an on-line icon anchors to. Persisted so moving
  // the connected boxes never flips the icon to the other side of the line.
  attachedEnd?: AttachedEnd;
}

export interface CanvasGroup {
  id: string;
  label: string;
  position: PreviewPosition;
  size: { width: number; height: number };
  fillColor: string;
  labelColor: string;
  labelSize: number;
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label?: string;
  props: ConnectionProps;
}

export type CanvasSelection =
  | { kind: 'node'; id: string }
  | { kind: 'connection'; id: string }
  | { kind: 'group'; id: string };

export interface WorkbenchState {
  pack: PackManifest;
  diagramKind: DiagramKind;
  diagramTheme?: string;
  diagramDirection?: 'LR' | 'TB';
  sourceName?: string;
  nodes: CanvasNode[];
  groups: CanvasGroup[];
  connections: CanvasConnection[];
  selected?: CanvasSelection;
  // Multi-selection (marquee / shift-click). For a single item the matching
  // array holds just its id and mirrors `selected`; 2+ ids total = multi mode.
  selectedNodeIds: string[];
  selectedConnectionIds: string[];
  selectedGroupIds: string[];
  nextId: number;
}

function componentById(pack: PackManifest, id: string): PreviewComponentDefinition {
  const found = pack.components.find((component) => component.id === id);
  if (!found) {
    throw new Error(`Unknown preview component "${id}".`);
  }
  return found;
}

function nextItemId(state: WorkbenchState, prefix: string): string {
  return `${prefix}-${state.nextId}`;
}

function roundPosition(position: PreviewPosition): PreviewPosition {
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

function roundGroupSize(size: CanvasGroup['size']): CanvasGroup['size'] {
  return {
    width: Math.round(size.width),
    height: Math.round(size.height),
  };
}

type GroupPatch = Partial<Pick<CanvasGroup, 'label' | 'position' | 'size' | 'fillColor' | 'labelColor' | 'labelSize'>>;

function roundGroupPatch(patch: GroupPatch): GroupPatch {
  const rounded = { ...patch };
  if (patch.position) {
    rounded.position = roundPosition(patch.position);
  }
  if (patch.size) {
    rounded.size = roundGroupSize(patch.size);
  }
  return rounded;
}

export function createDefaultWorkbenchState(pack = builtInPack): WorkbenchState {
  return {
    pack,
    diagramKind: 'box-arrows',
    nodes: [],
    groups: [],
    connections: [],
    selectedNodeIds: [],
    selectedConnectionIds: [],
    selectedGroupIds: [],
    nextId: 1,
  };
}

export function addCatalogItemToCanvas(
  state: WorkbenchState,
  componentId: string,
  position: PreviewPosition,
  props: Partial<PreviewNodeProps> = {},
): WorkbenchState {
  if (componentId === 'group') {
    const id = nextItemId(state, 'group');
    return {
      ...state,
      groups: [
        ...state.groups,
        {
          id,
          label: 'Group',
          position: roundPosition(position),
          size: { width: 280, height: 160 },
          fillColor: 'none',
          labelColor: '#0f172a',
          labelSize: 12,
        },
      ],
      selected: { kind: 'group', id },
      selectedNodeIds: [],
      selectedConnectionIds: [],
      selectedGroupIds: [id],
      nextId: state.nextId + 1,
    };
  }

  const definition = componentById(state.pack, componentId);
  const id = nextItemId(state, 'node');
  const attachesToConnection = componentId === 'label' || componentId === 'labelIcon';
  const attachedConnectionId =
    attachesToConnection && state.selected?.kind === 'connection'
      ? state.selected.id
      : undefined;
  const nextNode: CanvasNode = {
    id,
    componentId,
    props: { ...definition.defaultProps, ...props },
    position,
    attachedConnectionId,
  };
  const sourceNode =
    attachesToConnection || attachedConnectionId
      ? undefined
      : state.selected?.kind === 'node'
        ? state.nodes.find((node) => node.id === state.selected?.id && node.componentId !== 'label' && node.componentId !== 'labelIcon')
        : [...state.nodes].reverse().find((node) => node.componentId !== 'label' && node.componentId !== 'labelIcon');
  const connection =
    sourceNode && sourceNode.id !== id
      ? [{
          id: nextItemId({ ...state, nextId: state.nextId + 1 }, 'connection'),
          fromNodeId: sourceNode.id,
          toNodeId: id,
          props: { ...connectionDefaults },
        }]
      : [];

  return {
    ...state,
    nodes: [...state.nodes, nextNode],
    connections: [...state.connections, ...connection],
    selected: { kind: 'node', id },
    selectedNodeIds: [id],
    selectedConnectionIds: [],
    selectedGroupIds: [],
    nextId: state.nextId + 1 + connection.length,
  };
}

export const addNodeToCanvas = addCatalogItemToCanvas;

export function selectCanvasItem(state: WorkbenchState, selected: CanvasSelection): WorkbenchState {
  return {
    ...state,
    selected,
    selectedNodeIds: selected.kind === 'node' ? [selected.id] : [],
    selectedConnectionIds: selected.kind === 'connection' ? [selected.id] : [],
    selectedGroupIds: selected.kind === 'group' ? [selected.id] : [],
  };
}

export function clearSelection(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    selected: undefined,
    selectedNodeIds: [],
    selectedConnectionIds: [],
    selectedGroupIds: [],
  };
}

/** Replace the whole multi-selection (marquee result across all item kinds). */
export function setSelectedItems(
  state: WorkbenchState,
  items: { nodeIds?: string[]; connectionIds?: string[]; groupIds?: string[] },
): WorkbenchState {
  const nodeIds = state.nodes.filter((n) => items.nodeIds?.includes(n.id)).map((n) => n.id);
  const connectionIds = state.connections.filter((c) => items.connectionIds?.includes(c.id)).map((c) => c.id);
  const groupIds = state.groups.filter((g) => items.groupIds?.includes(g.id)).map((g) => g.id);
  const total = nodeIds.length + connectionIds.length + groupIds.length;
  const single: CanvasSelection | undefined =
    total !== 1
      ? undefined
      : nodeIds.length
        ? { kind: 'node', id: nodeIds[0]! }
        : connectionIds.length
          ? { kind: 'connection', id: connectionIds[0]! }
          : { kind: 'group', id: groupIds[0]! };
  return { ...state, selected: single, selectedNodeIds: nodeIds, selectedConnectionIds: connectionIds, selectedGroupIds: groupIds };
}

/** Add/remove a node from the multi-selection (shift/cmd-click). */
export function toggleNodeSelection(state: WorkbenchState, nodeId: string): WorkbenchState {
  const has = state.selectedNodeIds.includes(nodeId);
  const ids = has
    ? state.selectedNodeIds.filter((id) => id !== nodeId)
    : [...state.selectedNodeIds, nodeId];
  return {
    ...state,
    selectedNodeIds: ids,
    selectedConnectionIds: [],
    selectedGroupIds: [],
    selected: ids.length === 1 ? { kind: 'node', id: ids[0]! } : undefined,
  };
}

/** Apply a prop change to every selected node that accepts it. */
export function updateNodesProps(
  state: WorkbenchState,
  nodeIds: string[],
  key: string,
  value: unknown,
): WorkbenchState {
  return nodeIds.reduce((next, nodeId) => updateNodeProps(next, nodeId, key, value), state);
}

export function updateNodeProps(
  state: WorkbenchState,
  nodeId: string,
  key: string,
  value: unknown,
): WorkbenchState {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return state;
  }
  const definition = componentById(state.pack, node.componentId);
  const control = definition.controls.find((item) => item.key === key);

  if (!control || !isValidControlValue(control, value)) {
    return state;
  }

  return {
    ...state,
    nodes: state.nodes.map((item) =>
      item.id === nodeId
        ? { ...item, props: { ...item.props, [key]: value } }
        : item,
    ),
  };
}

export function updateConnectionProps(
  state: WorkbenchState,
  connectionId: string,
  key: keyof ConnectionProps,
  value: ConnectionProps[keyof ConnectionProps],
): WorkbenchState {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return state;
  }
  const control = connectionControls.find((item) => item.key === key);

  if (!control || !isValidControlValue(control, value)) {
    return state;
  }

  return {
    ...state,
    connections: state.connections.map((connection) =>
      connection.id === connectionId
        ? { ...connection, props: { ...connection.props, [key]: value } }
        : connection,
    ),
  };
}

export function reconnectConnectionEndpoint(
  state: WorkbenchState,
  connectionId: string,
  endpoint: 'from' | 'to',
  nodeId: string,
): WorkbenchState {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return state;
  }
  const node = state.nodes.find((item) => item.id === nodeId);
  // Only real nodes can be connection endpoints; labels attach to a line, not to its ends.
  if (!node || node.componentId === 'label' || node.componentId === 'labelIcon') {
    return state;
  }
  const fromNodeId = endpoint === 'from' ? nodeId : connection.fromNodeId;
  const toNodeId = endpoint === 'to' ? nodeId : connection.toNodeId;
  if (fromNodeId === toNodeId) {
    return state;
  }
  if (fromNodeId === connection.fromNodeId && toNodeId === connection.toNodeId) {
    return state;
  }
  return {
    ...state,
    connections: state.connections.map((item) =>
      item.id === connectionId ? { ...item, fromNodeId, toNodeId } : item,
    ),
    selected: { kind: 'connection', id: connectionId },
  };
}

export function updateGroup(
  state: WorkbenchState,
  groupId: string,
  patch: GroupPatch,
): WorkbenchState {
  const roundedPatch = roundGroupPatch(patch);
  return {
    ...state,
    groups: state.groups.map((group) =>
      group.id === groupId ? { ...group, ...roundedPatch } : group,
    ),
  };
}

export function setNodePosition(
  state: WorkbenchState,
  nodeId: string,
  position: PreviewPosition,
): WorkbenchState {
  return {
    ...state,
    nodes: state.nodes.map((node) => node.id === nodeId ? { ...node, position } : node),
  };
}

export function setNodeAttachedEnd(
  state: WorkbenchState,
  nodeId: string,
  attachedEnd: AttachedEnd,
): WorkbenchState {
  return {
    ...state,
    nodes: state.nodes.map((node) =>
      node.id === nodeId && node.attachedEnd !== attachedEnd ? { ...node, attachedEnd } : node,
    ),
  };
}

export function setNodePositions(
  state: WorkbenchState,
  positions: Array<{ id: string; position: PreviewPosition }>,
): WorkbenchState {
  const byId = new Map(positions.map((entry) => [entry.id, entry.position]));
  return {
    ...state,
    nodes: state.nodes.map((node) => (byId.has(node.id) ? { ...node, position: byId.get(node.id)! } : node)),
  };
}

export function setGroupPositions(
  state: WorkbenchState,
  positions: Array<{ id: string; position: PreviewPosition }>,
): WorkbenchState {
  const byId = new Map(positions.map((entry) => [entry.id, roundPosition(entry.position)]));
  return {
    ...state,
    groups: state.groups.map((group) => (byId.has(group.id) ? { ...group, position: byId.get(group.id)! } : group)),
  };
}

export function setNodeSize(
  state: WorkbenchState,
  nodeId: string,
  size: { width: number; height: number },
): WorkbenchState {
  const explicit = { width: Math.round(size.width), height: Math.round(size.height) };
  return {
    ...state,
    nodes: state.nodes.map((node) =>
      node.id === nodeId ? { ...node, props: { ...node.props, size: explicit } } : node,
    ),
  };
}

/** Resize a node while pinning its top-left to `position` (used to keep the
 *  body centre fixed during a centre-anchored resize). */
export function setNodeSizeAndPosition(
  state: WorkbenchState,
  nodeId: string,
  size: { width: number; height: number },
  position: PreviewPosition,
): WorkbenchState {
  const explicit = { width: Math.round(size.width), height: Math.round(size.height) };
  const pos = roundPosition(position);
  return {
    ...state,
    nodes: state.nodes.map((node) =>
      node.id === nodeId ? { ...node, props: { ...node.props, size: explicit }, position: pos } : node,
    ),
  };
}

export function setGroupPosition(
  state: WorkbenchState,
  groupId: string,
  position: PreviewPosition,
): WorkbenchState {
  return updateGroup(state, groupId, { position });
}

export function setGroupSize(
  state: WorkbenchState,
  groupId: string,
  size: { width: number; height: number },
): WorkbenchState {
  return updateGroup(state, groupId, { size });
}

export function duplicateSelected(state: WorkbenchState): WorkbenchState {
  // Multi-node selection: copy each node (offset, no auto-connections).
  if (state.selectedNodeIds.length > 1) {
    const ids = new Set(state.selectedNodeIds);
    const originals = state.nodes.filter((node) => ids.has(node.id));
    if (originals.length === 0) {
      return state;
    }
    const copies = originals.map((node, index) => ({
      ...node,
      id: `node-${state.nextId + index}`,
      position: { x: node.position.x + 28, y: node.position.y + 28 },
      attachedConnectionId: undefined,
    }));
    return {
      ...state,
      nodes: [...state.nodes, ...copies],
      selected: undefined,
      selectedNodeIds: copies.map((node) => node.id),
      selectedConnectionIds: [],
      selectedGroupIds: [],
      nextId: state.nextId + copies.length,
    };
  }
  if (!state.selected) {
    return state;
  }
  if (state.selected.kind === 'node') {
    const node = state.nodes.find((item) => item.id === state.selected?.id);
    if (!node) {
      return state;
    }
    const id = nextItemId(state, 'node');
    const attachesToConnection = node.componentId === 'label' || node.componentId === 'labelIcon';
    const connection =
      !attachesToConnection
        ? [{
            id: nextItemId({ ...state, nextId: state.nextId + 1 }, 'connection'),
            fromNodeId: node.id,
            toNodeId: id,
            props: { ...connectionDefaults },
          }]
        : [];
    return {
      ...state,
      nodes: [
        ...state.nodes,
        {
          ...node,
          id,
          position: { x: node.position.x + 28, y: node.position.y + 28 },
          attachedConnectionId: attachesToConnection ? node.attachedConnectionId : undefined,
        },
      ],
      connections: [...state.connections, ...connection],
      selected: { kind: 'node', id },
      selectedNodeIds: [id],
      selectedConnectionIds: [],
      selectedGroupIds: [],
      nextId: state.nextId + 1 + connection.length,
    };
  }
  if (state.selected.kind === 'group') {
    const group = state.groups.find((item) => item.id === state.selected?.id);
    if (!group) {
      return state;
    }
    const id = nextItemId(state, 'group');
    return {
      ...state,
      groups: [
        ...state.groups,
        {
          ...group,
          id,
          label: `${group.label} Copy`,
          position: { x: group.position.x + 28, y: group.position.y + 28 },
        },
      ],
      selected: { kind: 'group', id },
      selectedNodeIds: [],
      selectedConnectionIds: [],
      selectedGroupIds: [id],
      nextId: state.nextId + 1,
    };
  }
  return state;
}

export function deleteSelected(state: WorkbenchState): WorkbenchState {
  const nodeIds = new Set(state.selectedNodeIds);
  const groupIds = new Set(state.selectedGroupIds);
  // Connections removed: explicitly selected, or attached to a removed node.
  const removedConnectionIds = new Set(state.selectedConnectionIds);
  for (const connection of state.connections) {
    if (nodeIds.has(connection.fromNodeId) || nodeIds.has(connection.toNodeId)) {
      removedConnectionIds.add(connection.id);
    }
  }

  if (nodeIds.size === 0 && groupIds.size === 0 && removedConnectionIds.size === 0) {
    return state;
  }

  return {
    ...state,
    connections: state.connections.filter((connection) => !removedConnectionIds.has(connection.id)),
    nodes: state.nodes.filter(
      (node) => !nodeIds.has(node.id) && !removedConnectionIds.has(node.attachedConnectionId ?? ''),
    ),
    groups: state.groups.filter((group) => !groupIds.has(group.id)),
    selected: undefined,
    selectedNodeIds: [],
    selectedConnectionIds: [],
    selectedGroupIds: [],
  };
}

export function clearCanvas(state: WorkbenchState): WorkbenchState {
  return {
    ...state,
    nodes: [],
    groups: [],
    connections: [],
    selected: undefined,
    selectedNodeIds: [],
    selectedConnectionIds: [],
    selectedGroupIds: [],
  };
}
