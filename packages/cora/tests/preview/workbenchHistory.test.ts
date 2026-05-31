import { describe, expect, it } from 'vitest';

import {
  addNodeToCanvas,
  clearSelection,
  createDefaultWorkbenchState,
  selectCanvasItem,
  setNodePosition,
} from '../../src/preview/state.js';
import {
  shouldHandleWorkbenchHistoryShortcut,
  workbenchDocumentEqual,
  WORKBENCH_HISTORY_LIMIT,
  trimHistoryPast,
} from '../../src/preview/workbenchHistory.js';

describe('workbenchHistory', () => {
  it('treats selection-only updates as document-equal', () => {
    const base = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 });
    const selected = selectCanvasItem(base, { kind: 'node', id: 'node-1' });

    expect(workbenchDocumentEqual(base, selected)).toBe(true);
    expect(workbenchDocumentEqual(base, clearSelection(selected))).toBe(true);
  });

  it('detects node position changes as document edits', () => {
    const base = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 10, y: 20 });
    const moved = setNodePosition(base, 'node-1', { x: 40, y: 50 });

    expect(workbenchDocumentEqual(base, moved)).toBe(false);
  });

  it('trims undo stack to the configured limit', () => {
    const past = Array.from({ length: WORKBENCH_HISTORY_LIMIT + 5 }, (_, index) =>
      createDefaultWorkbenchState(),
    );
    const trimmed = trimHistoryPast(past);

    expect(trimmed).toHaveLength(WORKBENCH_HISTORY_LIMIT);
    expect(trimmed[0]).toBe(past[5]);
  });
});

describe('shouldHandleWorkbenchHistoryShortcut', () => {
  it('maps platform undo/redo shortcuts outside editable fields', () => {
    expect(
      shouldHandleWorkbenchHistoryShortcut({
        key: 'z',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        target: { tagName: 'DIV' },
      }),
    ).toBe('undo');

    expect(
      shouldHandleWorkbenchHistoryShortcut({
        key: 'z',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        target: { tagName: 'DIV' },
      }),
    ).toBe('redo');

    expect(
      shouldHandleWorkbenchHistoryShortcut({
        key: 'y',
        metaKey: false,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        target: { tagName: 'DIV' },
      }),
    ).toBe('redo');
  });

  it('ignores shortcuts while typing in inputs', () => {
    expect(
      shouldHandleWorkbenchHistoryShortcut({
        key: 'z',
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        target: { tagName: 'INPUT' },
      }),
    ).toBeUndefined();
  });
});
