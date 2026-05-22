import { describe, expect, it } from 'vitest';

import { lineVariants, scenarioIds } from '../../src/preview/scenarios.js';
import {
  createDefaultWorkbenchState,
  switchScenario,
  updateNodeProps,
} from '../../src/preview/state.js';

describe('preview scenarios and state', () => {
  it('defines required scenarios and line variants', () => {
    expect(scenarioIds).toEqual(['isolated', 'connected', 'grouped', 'grouped-connected']);
    expect(lineVariants.map((variant) => variant.id)).toEqual(
      expect.arrayContaining(['plain', 'arrow', 'dashed-arrow', 'dotted-circle', 'double-marker']),
    );
  });

  it('keeps primary and secondary as the only selected node roles', () => {
    const state = createDefaultWorkbenchState();

    expect(state.primary).toBeDefined();
    expect(state.secondary).toBeDefined();
    expect('selectedLine' in state).toBe(false);
    expect('selectedGroup' in state).toBe(false);
  });

  it('resets props and positions when switching scenarios', () => {
    const state = updateNodeProps(createDefaultWorkbenchState(), 'primary', 'text', 'Changed');
    const reset = switchScenario(state, 'grouped-connected');

    expect(reset.scenario).toBe('grouped-connected');
    expect(reset.primary.props.text).not.toBe('Changed');
    expect(reset.primary.position).toEqual({ x: 180, y: 170 });
  });
});
