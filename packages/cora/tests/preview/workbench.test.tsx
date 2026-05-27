import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App, shouldFocusSearchFromShortcut } from '../../src/preview/App.js';
import { filterComponents } from '../../src/preview/components/CatalogSidebar.js';
import { ControlInput } from '../../src/preview/components/ControlInput.js';
import { GroupPanel } from '../../src/preview/components/GroupPanel.js';
import { previewConnectionPathData, WorkbenchCanvas } from '../../src/preview/components/WorkbenchCanvas.js';
import { applyConnectionMarkerInsets, computeConnectionPoints } from '../../src/preview/geometry.js';
import { searchPreviewIcons } from '../../src/preview/iconSearch.js';
import { addNodeToCanvas, createDefaultWorkbenchState, selectCanvasItem } from '../../src/preview/state.js';

describe('preview workbench', () => {
  it('renders catalog, canvas, inspector, and visual shell markers', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Catalog"');
    expect(markup).toContain('aria-label="Canvas"');
    expect(markup).toContain('aria-label="Inspector"');
    expect(markup).toContain('Layers');
    expect(markup).toContain('Components');
    expect(markup).toContain('Search components and icons...');
    expect(markup).toContain('aria-label="Theme Selection"');
    expect(markup).toContain('Default Theme');
    expect(markup).toContain('Monochrome');
    expect(markup).toContain('No Shadows');
    expect(markup).toContain('draggable="true"');
    expect(markup).toContain('component-icon');
    expect(markup).toContain('Group');
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

  it('renders group title and style controls', () => {
    const markup = renderToStaticMarkup(
      <GroupPanel
        group={{
          id: 'group-1',
          label: 'Group',
          position: { x: 10, y: 20 },
          size: { width: 280, height: 160 },
          fillColor: 'none',
          labelColor: '#0f172a',
          labelSize: 12,
        }}
        onGroupChange={() => {}}
      />,
    );

    expect(markup).toContain('Title');
    expect(markup).toContain('Background color');
    expect(markup).toContain('Title color');
    expect(markup).toContain('Title size');
    expect(markup).toContain('step="10"');
  });

  it('opens a gap in preview connections under attached labels', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'document',
      { x: 420, y: 100 },
    );
    const state = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connected.connections[0]!.id }),
      'label',
      { x: 0, y: 0 },
      { title: 'something nice' },
    );
    const connection = state.connections[0]!;
    const points = applyConnectionMarkerInsets(computeConnectionPoints(state, connection), connection.props);
    const pathData = previewConnectionPathData(state, connection, points);
    const markup = renderToStaticMarkup(<WorkbenchCanvas state={state} onStateChange={() => undefined} />);

    expect(pathData.match(/M /g)).toHaveLength(2);
    expect(markup).toContain(`d="${pathData}"`);
  });

  it('opens an attached-label gap across vertical preview connection bends', () => {
    const connected = addNodeToCanvas(
      addNodeToCanvas(createDefaultWorkbenchState(), 'box', { x: 100, y: 100 }),
      'box',
      { x: 100, y: 340 },
    );
    const state = addNodeToCanvas(
      selectCanvasItem(connected, { kind: 'connection', id: connected.connections[0]!.id }),
      'label',
      { x: 0, y: 0 },
      { title: 'something nice' },
    );
    const connection = state.connections[0]!;
    const points = applyConnectionMarkerInsets(computeConnectionPoints(state, connection), connection.props);
    const pathData = previewConnectionPathData(state, connection, points);

    expect(pathData).toContain('M 168 268');
  });

  it('filters sidebar components by search text', () => {
    const labels = filterComponents(createDefaultWorkbenchState(), 'document').map((item) => item.label);

    expect(labels).toEqual(['Document']);
  });

  it('excludes icon and labelIcon components from the catalog list', () => {
    const items = filterComponents(createDefaultWorkbenchState(), '');
    const ids = items.map((item) => item.id);
    expect(ids).not.toContain('icon');
    expect(ids).not.toContain('labelIcon');
    // Ensure others are present
    expect(ids).toContain('box');
    expect(ids).toContain('app');
    expect(ids).toContain('document');
    expect(ids).toContain('website');
    expect(ids).toContain('group');
  });

  it('searches Iconify results for the top search dropdown', async () => {
    const results = await searchPreviewIcons('cloud');
    const fullNames = results.map((icon) => icon.fullName);

    expect(results.length).toBeGreaterThan(24);
    expect(fullNames).toContain('material-symbols:cloud');
    expect(fullNames.some((name) => !name.startsWith('material-symbols:'))).toBe(true);
  });

  it('supports slash as the global search focus shortcut', () => {
    expect(shouldFocusSearchFromShortcut({
      key: '/',
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      target: null,
    })).toBe(true);
    expect(shouldFocusSearchFromShortcut({
      key: '/',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      target: null,
    })).toBe(false);
  });
});
