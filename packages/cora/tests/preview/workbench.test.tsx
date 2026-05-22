import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/preview/App.js';

describe('preview workbench', () => {
  it('renders catalog, canvas, inspector, connection controls, and overlay labels toggle', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('aria-label="Catalog"');
    expect(markup).toContain('aria-label="Canvas"');
    expect(markup).toContain('aria-label="Inspector"');
    expect(markup).toContain('Primary node');
    expect(markup).toContain('Secondary node');
    expect(markup).toContain('Toggle labels');
    expect(markup).toContain('lineStyle');
  });
});
