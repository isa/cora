import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  borderDasharray,
  BoxNode,
  DecisionNode,
  IconNode,
  IssueNode,
  LabelNode,
  LabelIconNode,
  Line,
  LineMarkerDefs,
  linePathData,
  PageNode,
  resolveComponentSize,
  ShapeNode,
  type SvgIconProps,
} from '../../src/renderer/components/index.js';
import { baselineYForVisualCenter } from '../../src/core/measureText.js';
import { edgeBridgeMap } from '../../src/core/edgeGeometry.js';
import { EdgeLabel } from '../../src/renderer/components/edges/EdgeLabel.js';
import {
  edgeBridgeMaskPathData,
  edgeLinePathData,
} from '../../src/renderer/components/edges/edgePath.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';

function TestIcon({ x = 0, y = 0, size, color }: SvgIconProps) {
  return (
    <g transform={`translate(${x} ${y})`} data-icon="test">
      <path d={`M 0 0 H ${size} V ${size} H 0 Z`} fill="none" stroke={color} />
    </g>
  );
}

describe('renderer component primitives', () => {
  it('resolves size presets and explicit dimensions', () => {
    const fallback = { width: 10, height: 20 };

    expect(resolveComponentSize('sm', fallback)).toEqual({ width: 104, height: 44 });
    expect(resolveComponentSize('xxl', fallback)).toEqual({ width: 296, height: 132 });
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

  it('rounds orthogonal line elbows', () => {
    const pathData = linePathData([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
    ]);

    expect(pathData).toContain('Q 40 0 40 8');
  });

  it('renders centralized line marker definitions', () => {
    const markup = renderToStaticMarkup(<LineMarkerDefs color="#123456" />);

    expect(markup).toContain('id="cora-marker-arrow"');
    expect(markup).toContain('refX="0"');
    expect(markup).toContain('id="cora-marker-circle"');
    expect(markup).toContain('id="cora-marker-filled-circle"');
  });
});

describe('renderer catalog nodes', () => {
  it('renders IconNode through the provided icon renderer only', () => {
    const markup = renderToStaticMarkup(
      <IconNode
        icon={TestIcon}
        strokeColor="#abcdef"
        size={{ width: 40, height: 40 }}
        {...({ text: 'Hidden label' } as Record<string, unknown>)}
      />,
    );

    expect(markup).toContain('data-icon="test"');
    expect(markup).toContain('stroke="#abcdef"');
    expect(markup).not.toContain('Hidden label');
  });

  it('renders LabelIconNode with icon markup and text', () => {
    const markup = renderToStaticMarkup(
      <LabelIconNode icon={TestIcon} iconColor="#111111" text="Deploy" />,
    );

    expect(markup).toContain('data-icon="test"');
    expect(markup).toContain('Deploy');
  });

  it('renders LabelIconNode status type as icon-only', () => {
    const markup = renderToStaticMarkup(
      <LabelIconNode icon={TestIcon} iconType="question-mark" text="Hidden" />,
    );

    expect(markup).toContain('<circle');
    expect(markup).not.toContain('<rect');
    expect(markup).not.toContain('data-icon="test"');
    expect(markup).not.toContain('Hidden');
  });

  it('renders LabelIconNode status type with a filled badge background', () => {
    const markup = renderToStaticMarkup(
      <LabelIconNode icon={TestIcon} iconType="ok" backgroundColor="#ffffff" />,
    );

    expect(markup).toContain('fill="#ffffff"');
  });

  it('renders catalog title and subtitle with independent font sizes', () => {
    const markup = renderToStaticMarkup(
      <BoxNode
        title="Primary"
        subtitle="Secondary"
        titleFontSize={16}
        subtitleFontSize={10}
      />,
    );

    expect(markup).toContain('Primary');
    expect(markup).toContain('Secondary');
    expect(markup).toContain('font-size="16"');
    expect(markup).toContain('font-size="10"');
  });

  it('centers single-line catalog text on the node visual center', () => {
    const markup = renderToStaticMarkup(
      <BoxNode title="Centered" size={{ width: 156, height: 40 }} titleFontSize={13} />,
    );
    const y = Number(markup.match(/<text[^>]* y="([^"]+)"/)?.[1]);

    expect(y).toBeCloseTo(baselineYForVisualCenter(20, 13, 'node'), 5);
  });

  it('renders cast and radial shadows for box-style nodes', () => {
    const castMarkup = renderToStaticMarkup(
      <BoxNode text="Shadow" backgroundColor="#EDE9FE" shadow="cast" />,
    );
    const radialMarkup = renderToStaticMarkup(
      <DecisionNode text="Shadow" backgroundColor="#FED7AA" shadow="radial" />,
    );

    expect(castMarkup).toContain('data-shadow="cast"');
    expect(radialMarkup).toContain('data-shadow="radial"');
  });

  it('does not render shadows for label or label-icon nodes', () => {
    const labelMarkup = renderToStaticMarkup(
      <LabelNode title="Label" shadow="cast" />,
    );
    const labelIconMarkup = renderToStaticMarkup(
      <LabelIconNode icon={TestIcon} iconType="ok" shadow="radial" />,
    );

    expect(labelMarkup).not.toContain('data-shadow=');
    expect(labelIconMarkup).not.toContain('data-shadow=');
  });

  it('renders LabelNode with compact default font sizes', () => {
    const markup = renderToStaticMarkup(
      <LabelNode title="Primary" subtitle="Secondary" />,
    );

    expect(markup).toContain('font-size="11"');
    expect(markup).toContain('font-size="10"');
  });

  it('renders PageNode skeleton colors for landing pages', () => {
    const markup = renderToStaticMarkup(
      <PageNode
        type="landing"
        skeletonColorDark="#111111"
        skeletonColorLight="#eeeeee"
        text="Home"
      />,
    );

    expect(markup).toContain('fill="#111111"');
    expect(markup).toContain('fill="#eeeeee"');
  });

  it('renders every IssueNode icon variant', () => {
    for (const icon of ['bug', 'warning', 'error', 'stop'] as const) {
      const markup = renderToStaticMarkup(<IssueNode icon={icon} text={icon} />);
      expect(markup).toContain(icon);
      expect(markup).toContain('<g');
    }
  });

  it('fits constrained catalog labels inside their available width', () => {
    const markup = renderToStaticMarkup(
      <IssueNode icon="warning" text="Reject" size={{ width: 64, height: 46 }} />,
    );

    expect(markup).toContain('textLength=');
    expect(markup).toContain('spacingAndGlyphs');
  });

  it('renders DecisionNode geometry and text', () => {
    const markup = renderToStaticMarkup(<DecisionNode text="Approved?" />);

    expect(markup).toContain('<polygon');
    expect(markup).toContain('Approved?');
  });

  it('renders ShapeNode children', () => {
    const markup = renderToStaticMarkup(
      <ShapeNode>
        <circle cx="5" cy="5" r="3" data-child="shape" />
      </ShapeNode>,
    );

    expect(markup).toContain('data-child="shape"');
  });
});

describe('edge labels', () => {
  it('cuts path gaps around inline edge labels', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      label: 'request',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      labelPlacement: {
        x: 50,
        y: 0,
        width: 36,
        height: 8,
        segmentIndex: 0,
        orientation: 'horizontal',
      },
    });

    expect(pathData).toMatch(/M 6\d(?:\.\d+)? 0/);
  });

  it('rounds orthogonal edge elbows', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    expect(pathData).toContain('Q 50 0 50 4');
  });

  it('keeps a straight runway before arrowheads on short terminal segments', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 8 },
      ],
    });

    expect(pathData).not.toContain('Q 50 0');
  });

  it('rounds terminal bends while preserving visible arrow runway', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 30 },
      ],
    });

    expect(pathData).toContain('Q 50 0 50 4');
    expect(pathData).toMatch(/L 50 2\d(?:\.\d+)?/);
  });

  it('keeps rounded elbows when the terminal segment leaves room for the runway', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    expect(pathData).toContain('Q 50 0 50 4');
    expect(pathData).toMatch(/L 50 4\d(?:\.\d+)?/);
  });

  it('keeps overlap bridge crossings straight', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      bridges: [
        {
          x: 50,
          y: 0,
          segmentIndex: 0,
          orientation: 'horizontal',
        },
      ],
    });

    expect(pathData).toContain('L 47 0 L 53 0');
    expect(pathData).not.toContain('Q 50');
  });

  it('exposes straight bridge mask paths for hiding the crossed stroke below', () => {
    const maskPathData = edgeBridgeMaskPathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      bridges: [
        {
          x: 50,
          y: 0,
          segmentIndex: 0,
          orientation: 'horizontal',
        },
      ],
    });

    expect(maskPathData).toBe('M 47 0 L 53 0');
  });

  it('adds bridges when a segment endpoint touches another segment interior', () => {
    const bridges = edgeBridgeMap([
      {
        from: 'a',
        to: 'b',
        points: [
          { x: 0, y: 40 },
          { x: 80, y: 40 },
        ],
      },
      {
        from: 'c',
        to: 'd',
        points: [
          { x: 40, y: 0 },
          { x: 40, y: 40 },
        ],
      },
    ]);

    expect(bridges.get(0)).toEqual([
      {
        x: 40,
        y: 40,
        segmentIndex: 0,
        orientation: 'horizontal',
      },
    ]);
  });

  it('does not draw overlap bridges in the marker runway', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
      ],
      bridges: [
        {
          x: 70,
          y: 0,
          segmentIndex: 0,
          orientation: 'horizontal',
        },
      ],
    });

    expect(pathData).not.toContain('Q');
  });

  it('renders a backing fill behind edge labels', () => {
    const markup = renderToStaticMarkup(
      <EdgeLabel
        edge={{
          from: 'a',
          to: 'b',
          label: 'response',
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          labelX: 50,
          labelY: 0,
          labelPlacement: {
            x: 50,
            y: 0,
            width: 42,
            height: 8,
            segmentIndex: 0,
            orientation: 'horizontal',
          },
        }}
        theme={defaultTheme}
      />,
    );

    expect(markup).toContain('<rect');
    expect(markup).toContain(`fill="${defaultTheme.background}"`);
    expect(markup).toContain('response');
  });
});
