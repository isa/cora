import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/preview/App.js';
import { filterComponents } from '../../src/preview/library/filterLibrary.js';
import { ControlInput } from '../../src/preview/components/ControlInput.js';
import { createDefaultWorkbenchState } from '../../src/preview/state.js';

describe('preview workbench', () => {
  it('renders catalog, canvas, inspector, and visual shell markers', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Catalog"');
    expect(markup).toContain('aria-label="Canvas"');
    expect(markup).toContain('aria-label="Inspector"');
    expect(markup).toContain('Layers');
    expect(markup).toContain('Components');
    expect(markup).toContain('Search icons');
    expect(markup).toContain('aria-label="Theme Selection"');
    expect(markup).toContain('Default Theme');
    expect(markup).toContain('Monochrome');
    expect(markup).toContain('No Shadows');
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('component-icon');
    expect(markup).toContain('Group');
    expect(markup).not.toContain('ShapeNode');
    expect(markup).not.toContain('Items');
    expect(markup).toContain('Drag components here');
    expect(markup).not.toContain('Labels');
    expect(markup).not.toContain('Create Node');
    expect(markup).toContain('canvas-actions-panel');
    expect(markup).toContain('Duplicate');
    expect(markup).toContain('Delete');
    expect(markup).toContain('aria-label="Clear canvas"');
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).toContain('aria-label="Collapse Library"');
    expect(markup).toContain('aria-label="Collapse Inspector"');
    expect(markup).toContain('aria-label="Open Library"');
    expect(markup).toContain('aria-label="Open Inspector"');
  });

  it('renders text controls as multiline textareas', () => {
    const markup = renderToStaticMarkup(
      <ControlInput
        control={{ kind: 'text', key: 'title', label: 'Title' }}
        value={'line 1\nline 2'}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain('<textarea');
    expect(markup).toContain('line 1');
    expect(markup).toContain('line 2');
  });

  it('filters sidebar components by search text', () => {
    const state = createDefaultWorkbenchState();
    const labels = filterComponents(state.pack, 'icon').map((item) => item.label);

    expect(labels).toContain('Icon');
    expect(labels).not.toContain('IssueNode');
  });
});
