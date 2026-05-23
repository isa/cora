import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/preview/App.js';

const packageRoot = new URL('../..', import.meta.url).pathname;

describe('preview visual contract', () => {
  it('renders the agreed workbench composition markers', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('Cora');
    expect(markup).toContain('Library / Components');
    expect(markup).toContain('Diagram Elements');
    expect(markup).toContain('Inspector / Attributes');
    expect(markup).toContain('Inspector');
    expect(markup).toContain('Style');
    expect(markup).toContain('canvas-toolbar-inner');
    expect(markup).toContain('aria-label="Zoom out"');
    expect(markup).toContain('aria-label="Zoom in"');
    expect(markup).not.toContain('Create Node');
    expect(markup).toContain('Duplicate');
    expect(markup).toContain('Delete');
    expect(markup).toContain('Clear Canvas');
  });

  it('keeps technical labels out of visible primary chrome', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).not.toContain('Labels');
    expect(markup).not.toMatch(/>node-[12]</);
    expect(markup).not.toMatch(/\(node-[12]\)/);
  });

  it('keeps the preview palette and surface tokens local and stable', () => {
    const css = readFileSync(join(packageRoot, 'src/preview/styles.css'), 'utf8');

    expect(css).toContain('--preview-accent: #6d28d9');
    expect(css).toContain('--preview-bg: #f9f9f9');
    expect(css).toContain('--preview-surface: #ffffff');
    expect(css).toContain('--preview-ink: #1a1c1c');
    expect(css).toContain('radial-gradient');
    expect(css).toContain('prefers-reduced-motion');
  });
});
