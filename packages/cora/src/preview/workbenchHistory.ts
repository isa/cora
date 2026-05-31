import { serializeWorkbenchYaml } from './persistence.js';
import type { WorkbenchState } from './state.js';

export const WORKBENCH_HISTORY_LIMIT = 50;

export function cloneWorkbenchState(state: WorkbenchState): WorkbenchState {
  return {
    pack: state.pack,
    diagramKind: state.diagramKind,
    diagramLayout: state.diagramLayout,
    layoutSnapshot: state.layoutSnapshot
      ? (JSON.parse(JSON.stringify(state.layoutSnapshot)) as WorkbenchState['layoutSnapshot'])
      : undefined,
    diagramTheme: state.diagramTheme,
    diagramDirection: state.diagramDirection,
    sourceName: state.sourceName,
    nodes: state.nodes.map((node) => ({
      ...node,
      props: { ...node.props },
      position: { ...node.position },
      ...(node.layoutSize ? { layoutSize: { ...node.layoutSize } } : {}),
    })),
    groups: state.groups.map((group) => ({
      ...group,
      position: { ...group.position },
      size: { ...group.size },
    })),
    connections: state.connections.map((connection) => ({
      ...connection,
      props: { ...connection.props },
    })),
    selected: state.selected ? { ...state.selected } : undefined,
    selectedNodeIds: [...state.selectedNodeIds],
    selectedConnectionIds: [...state.selectedConnectionIds],
    selectedGroupIds: [...state.selectedGroupIds],
    nextId: state.nextId,
  };
}

/** True when diagram content (nodes, edges, groups, layout metadata) is unchanged. */
export function workbenchDocumentEqual(a: WorkbenchState, b: WorkbenchState): boolean {
  return serializeWorkbenchYaml(a) === serializeWorkbenchYaml(b);
}

export function trimHistoryPast(past: WorkbenchState[]): WorkbenchState[] {
  if (past.length <= WORKBENCH_HISTORY_LIMIT) {
    return past;
  }
  return past.slice(past.length - WORKBENCH_HISTORY_LIMIT);
}

export function shouldHandleWorkbenchHistoryShortcut(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'target'>,
): 'undo' | 'redo' | undefined {
  if (event.altKey) {
    return undefined;
  }

  const target = event.target as { tagName?: string; isContentEditable?: boolean } | null;
  const tagName = target?.tagName?.toLowerCase();
  if (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target?.isContentEditable
  ) {
    return undefined;
  }

  const mod = event.metaKey || event.ctrlKey;
  if (!mod) {
    return undefined;
  }

  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey) {
    return 'undo';
  }
  if ((key === 'z' && event.shiftKey) || key === 'y') {
    return 'redo';
  }
  return undefined;
}
