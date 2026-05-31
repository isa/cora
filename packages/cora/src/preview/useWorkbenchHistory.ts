import { useCallback, useRef, useState } from 'react';

import {
  cloneWorkbenchState,
  trimHistoryPast,
  workbenchDocumentEqual,
} from './workbenchHistory.js';
import type { WorkbenchState } from './state.js';

export type WorkbenchStateChangeOptions = {
  /** When false, updates present state without pushing an undo step (live drag preview). */
  record?: boolean;
};

export function useWorkbenchHistory(initialState: () => WorkbenchState) {
  const [state, setStateRaw] = useState(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const pastRef = useRef<WorkbenchState[]>([]);
  const futureRef = useRef<WorkbenchState[]>([]);
  const gestureBaselineRef = useRef<WorkbenchState | null>(null);
  const [historyRevision, setHistoryRevision] = useState(0);

  const bumpHistory = useCallback(() => {
    setHistoryRevision((value) => value + 1);
  }, []);

  void historyRevision;
  const undoAvailable = pastRef.current.length > 0;
  const redoAvailable = futureRef.current.length > 0;

  const recordDocumentChange = useCallback(
    (previous: WorkbenchState) => {
      pastRef.current = trimHistoryPast([...pastRef.current, cloneWorkbenchState(previous)]);
      futureRef.current = [];
      bumpHistory();
    },
    [bumpHistory],
  );

  const applyState = useCallback(
    (next: WorkbenchState, options?: WorkbenchStateChangeOptions) => {
      const previous = stateRef.current;
      if (options?.record !== false && !workbenchDocumentEqual(previous, next)) {
        recordDocumentChange(previous);
      }
      setStateRaw(next);
      stateRef.current = next;
    },
    [recordDocumentChange],
  );

  const setState = useCallback(
    (update: WorkbenchState | ((current: WorkbenchState) => WorkbenchState), options?: WorkbenchStateChangeOptions) => {
      const next = typeof update === 'function' ? update(stateRef.current) : update;
      applyState(next, options);
    },
    [applyState],
  );

  const replaceState = useCallback(
    (next: WorkbenchState, options?: { resetHistory?: boolean }) => {
      setStateRaw(next);
      stateRef.current = next;
      if (options?.resetHistory !== false) {
        pastRef.current = [];
        futureRef.current = [];
        gestureBaselineRef.current = null;
        bumpHistory();
      }
    },
    [bumpHistory],
  );

  const beginHistoryGesture = useCallback(() => {
    if (gestureBaselineRef.current) {
      return;
    }
    gestureBaselineRef.current = cloneWorkbenchState(stateRef.current);
  }, []);

  const endHistoryGesture = useCallback(() => {
    const baseline = gestureBaselineRef.current;
    gestureBaselineRef.current = null;
    if (!baseline || workbenchDocumentEqual(baseline, stateRef.current)) {
      return;
    }
    pastRef.current = trimHistoryPast([...pastRef.current, baseline]);
    futureRef.current = [];
    bumpHistory();
  }, [bumpHistory]);

  const undo = useCallback(() => {
    const previous = pastRef.current.pop();
    if (!previous) {
      return;
    }
    futureRef.current.push(cloneWorkbenchState(stateRef.current));
    setStateRaw(previous);
    stateRef.current = previous;
    bumpHistory();
  }, [bumpHistory]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) {
      return;
    }
    pastRef.current = trimHistoryPast([...pastRef.current, cloneWorkbenchState(stateRef.current)]);
    setStateRaw(next);
    stateRef.current = next;
    bumpHistory();
  }, [bumpHistory]);

  return {
    state,
    stateRef,
    setState,
    replaceState,
    beginHistoryGesture,
    endHistoryGesture,
    undo,
    redo,
    canUndo: undoAvailable,
    canRedo: redoAvailable,
  };
}
