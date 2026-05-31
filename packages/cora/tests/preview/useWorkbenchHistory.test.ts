import { describe, expect, it } from 'vitest';

import {
  addNodeToCanvas,
  createDefaultWorkbenchState,
  setNodePosition,
} from '../../src/preview/state.js';
import {
  cloneWorkbenchState,
  workbenchDocumentEqual,
} from '../../src/preview/workbenchHistory.js';

/** Mirrors useWorkbenchHistory stack rules for unit tests without React. */
function createHistoryHarness(initial = createDefaultWorkbenchState()) {
  let present = initial;
  const past: ReturnType<typeof cloneWorkbenchState>[] = [];
  const future: ReturnType<typeof cloneWorkbenchState>[] = [];
  let gestureBaseline: ReturnType<typeof cloneWorkbenchState> | null = null;

  const apply = (next: typeof present, record = true) => {
    if (record && !workbenchDocumentEqual(present, next)) {
      past.push(cloneWorkbenchState(present));
      future.length = 0;
    }
    present = next;
  };

  return {
    get present() {
      return present;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
    apply,
    beginGesture() {
      if (!gestureBaseline) {
        gestureBaseline = cloneWorkbenchState(present);
      }
    },
    endGesture() {
      const baseline = gestureBaseline;
      gestureBaseline = null;
      if (!baseline || workbenchDocumentEqual(baseline, present)) {
        return;
      }
      past.push(baseline);
      future.length = 0;
    },
    undo() {
      const previous = past.pop();
      if (!previous) {
        return;
      }
      future.push(cloneWorkbenchState(present));
      present = previous;
    },
    redo() {
      const next = future.pop();
      if (!next) {
        return;
      }
      past.push(cloneWorkbenchState(present));
      present = next;
    },
  };
}

describe('useWorkbenchHistory stack behavior', () => {
  it('undoes and redoes document edits', () => {
    const history = createHistoryHarness();

    history.apply(addNodeToCanvas(history.present, 'box', { x: 0, y: 0 }));
    expect(history.present.nodes).toHaveLength(1);
    expect(history.canUndo).toBe(true);

    history.undo();
    expect(history.present.nodes).toHaveLength(0);
    expect(history.canRedo).toBe(true);

    history.redo();
    expect(history.present.nodes).toHaveLength(1);
  });

  it('coalesces a drag gesture into one undo step', () => {
    const history = createHistoryHarness();
    history.apply(addNodeToCanvas(history.present, 'box', { x: 10, y: 10 }));

    history.beginGesture();
    history.apply(setNodePosition(history.present, 'node-1', { x: 20, y: 20 }), false);
    history.apply(setNodePosition(history.present, 'node-1', { x: 30, y: 30 }), false);
    history.endGesture();

    expect(history.present.nodes[0]?.position).toEqual({ x: 30, y: 30 });
    expect(history.canUndo).toBe(true);

    history.undo();
    expect(history.present.nodes[0]?.position).toEqual({ x: 10, y: 10 });
  });

  it('clears redo stack after a new edit', () => {
    const history = createHistoryHarness();
    history.apply(addNodeToCanvas(history.present, 'box', { x: 0, y: 0 }));
    history.undo();
    history.apply(addNodeToCanvas(history.present, 'app', { x: 40, y: 0 }));

    expect(history.canRedo).toBe(false);
    expect(history.present.nodes[0]?.componentId).toBe('app');
  });
});
