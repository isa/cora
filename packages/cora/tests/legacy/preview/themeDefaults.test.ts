import { describe, expect, it } from 'vitest';

import { catalogDefaultProps } from '../../../src/renderer/themes/componentDefaults.js';
import { LOOK } from '../../../src/renderer/themes/lookTokens.js';
import { resolveDiagramTheme } from '../../../src/renderer/themes/registry.js';
import {
  isThemeOwnedConnectionStroke,
  isThemeOwnedNodeColor,
  previewThemeDefaultsForComponent,
} from '../../../src/preview/themeDefaults.js';
import { addNodeToCanvas, createDefaultWorkbenchState } from '../../../src/preview/state.js';

describe('preview theme defaults', () => {
  it('treats catalog neutral fills as theme-owned', () => {
    const catalogFill = catalogDefaultProps('box').backgroundColor;
    expect(isThemeOwnedNodeColor(catalogFill, 'box', 'backgroundColor')).toBe(true);
  });

  it('does not treat arbitrary custom fills as theme-owned', () => {
    expect(isThemeOwnedNodeColor('#ff00ff', 'box', 'backgroundColor')).toBe(false);
  });

  it('treats prior built-in theme fills as theme-owned', () => {
    const folioFill = resolveDiagramTheme('folio-light').shapes.box!.fill;
    expect(isThemeOwnedNodeColor(folioFill, 'box', 'backgroundColor')).toBe(true);
  });

  it('maps preview defaults to the active diagram theme', () => {
    const folioState = createDefaultWorkbenchState();
    const oceanState = { ...folioState, diagramTheme: 'ocean-dark' };

    const folioBox = previewThemeDefaultsForComponent(folioState, 'box');
    const oceanBox = previewThemeDefaultsForComponent(oceanState, 'box');

    expect(folioBox.backgroundColor).toBe(resolveDiagramTheme('folio-light').shapes.box!.fill);
    expect(oceanBox.backgroundColor).toBe(resolveDiagramTheme('ocean-dark').shapes.box!.fill);
    expect(folioBox.backgroundColor).not.toBe(oceanBox.backgroundColor);
  });

  it('treats catalog and theme edge strokes as theme-owned', () => {
    expect(isThemeOwnedConnectionStroke(LOOK.edge.stroke)).toBe(true);
    expect(isThemeOwnedConnectionStroke(resolveDiagramTheme('ember-light').edge.stroke)).toBe(true);
    expect(isThemeOwnedConnectionStroke('#ff00ff')).toBe(false);
  });

  it('keeps newly added nodes on catalog props but theme-owned at render time', () => {
    const state = addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 40, y: 40 });
    const node = state.nodes[0]!;

    expect(node.props.backgroundColor).toBe(catalogDefaultProps('box').backgroundColor);
    expect(isThemeOwnedNodeColor(node.props.backgroundColor, 'box', 'backgroundColor')).toBe(true);
  });
});
