import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  borderDasharray,
  Line,
  LineMarkerDefs,
  resolveComponentSize,
} from '../../src/renderer/components/index.js';

describe('renderer component primitives', () => {
  it('resolves size presets and explicit dimensions', () => {
    const fallback = { width: 10, height: 20 };

    expect(resolveComponentSize('sm', fallback)).toEqual({ width: 96, height: 40 });
    expect(resolveComponentSize('xxl', fallback)).toEqual({ width: 288, height: 128 });
    expect(resolveComponentSize({ width: 123, height: 45 }, fallback)).toEqual({
      width: 123,
      height: 45,
    });
  });

  it('maps border styles to SVG dash arrays', () => {
    expect(borderDasharray('none', 2)).toBeUndefined();
    expect(borderDasharray('solid', 2)).toBeUndefined();
    expect(borderDasharray('dashed', 2)).toBe('12 8');
    expect(borderDasharray('dotted', 2)).toBe('2 8');
  });

  it('renders line points with marker attributes', () => {
    const markup = renderToStaticMarkup(
      <Line
        points={[
          { x: 0, y: 0 },
          { x: 20, y: 10 },
        ]}
        endMarker="arrow"
        strokeColor="#123456"
        strokeWidth={2}
      />,
    );

    expect(markup).toContain('<path');
    expect(markup).toContain('M 0 0 L 20 10');
    expect(markup).toContain('stroke="#123456"');
    expect(markup).toContain('stroke-width="2"');
    expect(markup).toContain('marker-end="url(#cora-marker-arrow)"');
  });

  it('renders centralized line marker definitions', () => {
    const markup = renderToStaticMarkup(<LineMarkerDefs color="#123456" />);

    expect(markup).toContain('id="cora-marker-arrow"');
    expect(markup).toContain('id="cora-marker-circle"');
    expect(markup).toContain('id="cora-marker-filled-circle"');
  });
});
