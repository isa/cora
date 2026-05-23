import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/preview/App.js';
import { filterComponents } from '../../src/preview/components/CatalogSidebar.js';
import { ControlInput } from '../../src/preview/components/ControlInput.js';
import { createDefaultWorkbenchState } from '../../src/preview/state.js';

describe('preview workbench', () => {
  it('renders catalog, canvas, inspector, drag tiles, and hidden overlay labels toggle', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Catalog"');
    expect(markup).toContain('aria-label="Canvas"');
    expect(markup).toContain('aria-label="Inspector"');
    expect(markup).toContain('Components');
    expect(markup).toContain('Drag To Canvas');
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('component-icon');
    expect(markup).toContain('Group');
    expect(markup).not.toContain('ShapeNode');
    expect(markup).toContain('Drag components here');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('Labels');
    expect(markup).toContain('Delete');
    expect(markup).toContain('Clear');
    expect(markup).toContain('>+<');
    expect(markup).toContain('>-<');
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
    const labels = filterComponents(createDefaultWorkbenchState(), 'issue').map((item) => item.label);

    expect(labels).toEqual(['IssueNode']);
  });
});
