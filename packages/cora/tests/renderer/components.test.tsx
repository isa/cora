import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  ApiNode,
  borderDasharray,
  AppNode,
  BoxNode,
  DatabaseNode,
  DocumentNode,
  IconNode,
  Group,
  LabelNode,
  LabelIconNode,
  Line,
  LineMarkerDefs,
  linePathData,
  APP_SIZE_PRESETS,
  DOCUMENT_SIZE_PRESETS,
  ICON_NODE_SIZE_PRESETS,
  LABEL_ICON_SIZE_PRESETS,
  WEBSITE_SIZE_PRESETS,
  resolveAppComponentSize,
  resolveComponentSize,
  type SvgIconProps,
  WebsiteNode,
} from '../../src/renderer/components/index.js';
import { baselineYForVisualCenter, measureNodes } from '../../src/core/measureText.js';
import { edgeBridgeMap } from '../../src/core/edgeGeometry.js';
import { EdgeLabel } from '../../src/renderer/components/edges/EdgeLabel.js';
import {
  edgeBridgeMaskPathData,
  edgeLineMarkerPoints,
  edgeLinePathData,
  edgeMarkerCarrierPathData,
} from '../../src/renderer/components/edges/edgePath.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';
import { Diagram } from '../../src/renderer/Diagram.js';
import { iconifyIcon } from '../../src/renderer/iconify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rendererSourceRoot = join(__dirname, '../../src/renderer/components/nodes');
const previewGeometryPath = join(__dirname, '../../src/preview/geometry.ts');

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

  it('uses the shared 50% preset ladder for icon-like render components', () => {
    expect(ICON_NODE_SIZE_PRESETS).toEqual({
      sm: { width: 48, height: 48 },
      md: { width: 72, height: 72 },
      lg: { width: 96, height: 96 },
      xl: { width: 144, height: 144 },
      xxl: { width: 192, height: 192 },
    });
    expect(resolveAppComponentSize('lg', { width: 1, height: 1 })).toEqual(APP_SIZE_PRESETS.lg);
    expect(DOCUMENT_SIZE_PRESETS.lg).toEqual({ width: 72, height: 96 });
    expect(LABEL_ICON_SIZE_PRESETS.lg).toEqual(ICON_NODE_SIZE_PRESETS.lg);
    expect(WEBSITE_SIZE_PRESETS).toMatchObject({
      sm: { width: 54, height: 60 },
      lg: { width: 108, height: 120 },
      xxl: { width: 216, height: 240 },
    });
  });

  it('measures rendered diagram icon nodes with lg defaults', () => {
    const measured = measureNodes([
      { id: 'icon', label: 'Icon', component: 'icon' },
      { id: 'document', label: 'Doc', component: 'document' },
      { id: 'app', label: 'App', component: 'app' },
      { id: 'api', label: 'API', component: 'api' },
      { id: 'database', label: 'DB', component: 'database' },
      { id: 'label-icon', label: 'Icon', component: 'labelIcon' },
      { id: 'website', label: 'Website', component: 'website' },
    ]);

    expect(Object.fromEntries(measured.map((node) => [
      node.id,
      { width: node.measuredWidth, height: node.measuredHeight },
    ]))).toMatchObject({
      icon: ICON_NODE_SIZE_PRESETS.lg,
      document: DOCUMENT_SIZE_PRESETS.lg,
      app: APP_SIZE_PRESETS.lg,
      api: APP_SIZE_PRESETS.lg,
      database: APP_SIZE_PRESETS.lg,
      'label-icon': LABEL_ICON_SIZE_PRESETS.lg,
      website: WEBSITE_SIZE_PRESETS.lg,
    });
  });

  it('uses explicit style.size dimensions when provided', () => {
    const measured = measureNodes([
      { id: 'icon', label: 'Icon', component: 'icon', style: { size: { width: 140, height: 140 } } },
      { id: 'box', label: 'Box', component: 'box', style: { size: { width: 200, height: 80 } } },
    ]);

    expect(measured[0]).toMatchObject({ measuredWidth: 140, measuredHeight: 140 });
    expect(measured[1]?.measuredWidth).toBeGreaterThanOrEqual(200);
    expect(measured[1]?.measuredHeight).toBeGreaterThanOrEqual(80);
  });

  it('keeps icon-like nodes on the shared icon scale contract', () => {
    const iconLikeFiles = [
      'IconNode.tsx',
      'LabelIconNode.tsx',
      'AppNode.tsx',
      'ApiNode.tsx',
      'DatabaseNode.tsx',
    ];

    for (const file of iconLikeFiles) {
      const source = readFileSync(join(rendererSourceRoot, file), 'utf8');
      expect(source).toContain('iconNodeScale');
      expect(source).not.toMatch(/frame\.width\s*\/\s*(?:40|160|192)/);
      expect(source).not.toContain('remainingTextHeight');
    }

    const documentSource = readFileSync(join(rendererSourceRoot, 'DocumentNode.tsx'), 'utf8');
    expect(documentSource).toContain('DOCUMENT_SIZE_PRESETS.lg.width');
    expect(documentSource).not.toContain('remainingTextHeight');

    const previewGeometry = readFileSync(previewGeometryPath, 'utf8');
    expect(previewGeometry).toContain('iconNodeScale');
    expect(previewGeometry).not.toMatch(/(?:box|size)\.width\s*\/\s*(?:40|160)/);
  });

  it('maps border styles to SVG dash arrays', () => {
    expect(borderDasharray('none', 2)).toBeUndefined();
    expect(borderDasharray('solid', 2)).toBeUndefined();
    expect(borderDasharray('dashed', 2)).toBe('6 2');
    expect(borderDasharray('dotted', 2)).toBe('1 2');
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
    expect(markup).toContain('marker-end="url(#cora-marker-arrow-end)"');
  });

  it('renders orthogonal line elbows without curves', () => {
    const pathData = linePathData([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 40 },
    ]);

    expect(pathData).toBe('M 0 0 L 40 0 L 40 40');
    expect(pathData).not.toContain('Q');
  });

  it('renders centralized line marker definitions', () => {
    const markup = renderToStaticMarkup(<LineMarkerDefs color="#123456" />);

    expect(markup).toContain('id="cora-marker-arrow-start"');
    expect(markup).toContain('id="cora-marker-arrow-end"');
    expect(markup).toContain('refX="8"');
    expect(markup).toContain('id="cora-marker-circle"');
    expect(markup).toContain('id="cora-marker-filled-circle"');
    expect(markup).toContain('id="cora-marker-diamond"');
    expect(markup).toContain('id="cora-marker-filled-diamond"');
    expect(markup).toContain('id="cora-marker-square"');
    expect(markup).toContain('id="cora-marker-filled-square"');
    expect(markup).toContain('orient="auto"');
  });

  it('renders diagram edge marker choices from the layout IR', () => {
    const markup = renderToStaticMarkup(
      <Diagram
        diagram={{
          kind: 'box-arrows',
          nodes: [],
          edges: [
            {
              from: 'a',
              to: 'b',
              points: [
                { x: 0, y: 0 },
                { x: 40, y: 0 },
              ],
              startMarker: 'diamond',
              endMarker: 'filledSquare',
            },
          ],
          width: 40,
          height: 20,
          theme: defaultTheme,
        }}
      />,
    );

    expect(markup).toContain('marker-start="url(#cora-marker-diamond)"');
    expect(markup).toContain('marker-end="url(#cora-marker-filled-square)"');
  });
});

describe('renderer catalog nodes', () => {
  it('renders Group with style overrides', () => {
    const markup = renderToStaticMarkup(
      <Group
        group={{
          id: 'group-a',
          label: 'Styled Group',
          x: 10,
          y: 20,
          width: 200,
          height: 120,
          style: {
            backgroundColor: '#f8fafc',
            titleColor: '#334155',
            titleSize: 18,
          },
        }}
        theme={defaultTheme}
      />,
    );

    expect(markup).toContain('fill="#f8fafc"');
    expect(markup).toContain('fill="#334155"');
    expect(markup).toContain('font-size="18"');
  });

  it('renders IconNode through the provided icon renderer with attached text', () => {
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
    expect(markup).toContain('Hidde');
    expect(markup).toContain('label');
  });

  it('renders Iconify icons through the existing SVG icon slot contract', () => {
    const DatabaseIcon = iconifyIcon('material-symbols:database');
    expect(DatabaseIcon).toBeDefined();

    const markup = renderToStaticMarkup(
      <IconNode
        icon={DatabaseIcon!}
        strokeColor="#475569"
        size={{ width: 40, height: 40 }}
        title="Database"
      />,
    );

    expect(markup).toContain('viewBox="0 0 24 24"');
    expect(markup).toContain('currentColor');
    expect(markup).toContain('Database');
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
      <BoxNode text="Shadow" backgroundColor="#FED7AA" shadow="radial" />,
    );

    expect(castMarkup).toContain('data-shadow="cast"');
    expect(radialMarkup).toContain('data-shadow="radial"');
  });

  it('renders icon shadows through the catalog shadow helper', () => {
    const castMarkup = renderToStaticMarkup(
      <IconNode icon={TestIcon} title="Icon" shadow="cast" iconColor="#8b5cf6" />,
    );
    const radialMarkup = renderToStaticMarkup(
      <IconNode icon={TestIcon} title="Icon" shadow="radial" iconColor="#8b5cf6" />,
    );

    expect(castMarkup).toContain('data-shadow="cast"');
    expect(castMarkup).toContain('opacity="0.28"');
    expect(castMarkup).toContain('fill="#7a7a7a"');
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

  it('wraps long non-box titles into multiple tspans', () => {
    const markup = renderToStaticMarkup(
      <DocumentNode text="A very long document title that should wrap instead of squeezing into one line" />,
    );

    expect((markup.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
    expect(markup).not.toContain('textLength=');
  });

  it('wraps long label titles into multiple lines', () => {
    const markup = renderToStaticMarkup(
      <LabelNode title="A very long label title that should wrap into multiple lines in the preview workbench" />,
    );

    expect((markup.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
  });

  it('renders title/subtitle bold only when the bold flag is set (default not bold)', () => {
    const regularLabel = renderToStaticMarkup(<LabelNode title="Primary" subtitle="Secondary" />);
    expect(regularLabel).toContain('font-weight="400"');
    expect(regularLabel).not.toContain('font-weight="700"');

    const boldLabel = renderToStaticMarkup(<LabelNode title="Primary" subtitle="Secondary" titleBold subtitleBold />);
    expect(boldLabel).toContain('font-weight="700"');

    const regularLabelIcon = renderToStaticMarkup(<LabelIconNode icon={TestIcon} text="Primary" subtitle="Secondary" />);
    expect(regularLabelIcon).toContain('font-weight="400"');
    expect(regularLabelIcon).not.toContain('font-weight="700"');

    const boldLabelIcon = renderToStaticMarkup(
      <LabelIconNode icon={TestIcon} text="Primary" subtitle="Secondary" titleBold subtitleBold />,
    );
    expect(boldLabelIcon).toContain('font-weight="700"');
  });

  it('renders DocumentNode from the Solar documents duotone paths', () => {
    const markup = renderToStaticMarkup(
      <DocumentNode
        backgroundColor="#ffffff"
        iconColor="#112233"
        text="Proposal"
      />,
    );

    expect(markup).toContain('M5.879 2.879C5 3.757 5 5.172 5 8v8c0 2.828');
    expect(markup).toContain('opacity="0.5"');
    expect(markup).toContain('color="#112233"');
    expect(markup).not.toContain('<rect');
    expect(markup).toContain('Proposal');
  });

  it('renders ApiNode from the Phosphor cube duotone paths', () => {
    const markup = renderToStaticMarkup(
      <ApiNode
        iconColor="#7c3aed"
        text="API"
      />,
    );

    expect(markup).toContain('M128 129.09V232');
    expect(markup).toContain('opacity="0.2"');
    expect(markup).toContain('color="#7c3aed"');
    expect(markup).toContain('API');
  });

  it('renders api diagram nodes with the catalog icon color', () => {
    const markup = renderToStaticMarkup(
      <Diagram
        diagram={{
          kind: 'box-arrows',
          nodes: [
            {
              id: 'api',
              label: 'API',
              component: 'api',
              measuredWidth: 160,
              measuredHeight: 128,
              x: 0,
              y: 0,
            },
          ],
          edges: [],
          width: 160,
          height: 128,
          theme: defaultTheme,
        }}
      />,
    );

    expect(markup).toContain('color="#8b5cf6"');
  });

  it('renders DatabaseNode from the Lets Icons database duotone paths', () => {
    const markup = renderToStaticMarkup(
      <DatabaseNode
        iconColor="#7c3aed"
        text="Database"
      />,
    );

    expect(markup).toContain('M5 8a12.04 12.04 0 0 0 14 0v10a14.11 14.11 0 0 1-14 0z');
    expect(markup).toContain('fill-opacity="0.25"');
    expect(markup).toContain('stroke-width="1.2"');
    expect(markup).toContain('color="#7c3aed"');
    expect(markup).toContain('Database');
  });

  it('renders database diagram nodes with the catalog icon color', () => {
    const markup = renderToStaticMarkup(
      <Diagram
        diagram={{
          kind: 'box-arrows',
          nodes: [
            {
              id: 'database',
              label: 'Database',
              component: 'database',
              measuredWidth: 160,
              measuredHeight: 128,
              x: 0,
              y: 0,
            },
          ],
          edges: [],
          width: 160,
          height: 128,
          theme: defaultTheme,
        }}
      />,
    );

    expect(markup).toContain('color="#8b5cf6"');
  });

  it('renders product node shadows with the shared cast footprint', () => {
    const documentMarkup = renderToStaticMarkup(<DocumentNode shadow="cast" />);
    const apiMarkup = renderToStaticMarkup(<ApiNode shadow="cast" />);
    const databaseMarkup = renderToStaticMarkup(<DatabaseNode shadow="cast" />);
    const appMarkup = renderToStaticMarkup(<AppNode shadow="cast" />);
    const websiteMarkup = renderToStaticMarkup(<WebsiteNode shadow="cast" />);

    for (const markup of [documentMarkup, apiMarkup, databaseMarkup, appMarkup, websiteMarkup]) {
      expect(markup).toContain('data-shadow="cast"');
      expect(markup).toContain('opacity="0.28"');
    }
  });

  it('renders AppNode with the iphone-old-apps icon path', () => {
    const markup = renderToStaticMarkup(<AppNode />);

    expect(markup).toContain('viewBox="0 0 24 26"');
    expect(markup).toContain('fill-rule="evenodd"');
    expect(markup).toContain('M5 5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v17');
    expect(markup).toContain('M11 23a1 1 0 1 0 2 0');
  });

  it('renders WebsiteNode with neutral default colors', () => {
    const markup = renderToStaticMarkup(<WebsiteNode />);

    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toContain('fill="#cbd5e1"');
    expect(markup).toContain('fill="#e2e8f0"');
    expect(markup).toContain('fill="#ff5f57"');
    expect(markup).toContain('fill="#febc2e"');
    expect(markup).toContain('fill="#28c840"');
    expect(markup).toContain('fill="#e8eaed"');
  });

  it('renders colorful traffic lights on dark website chrome', () => {
    const markup = renderToStaticMarkup(
      <WebsiteNode backgroundColor="#27272a" borderColor="#52525b" skeletonColor="#52525b" />,
    );

    expect(markup).toContain('fill="#ff5f57"');
    expect(markup).toContain('fill="#febc2e"');
    expect(markup).toContain('fill="#28c840"');
    expect(markup).toContain('fill="#71717a"');
    expect(markup).toContain('fill="#52525b"');
    expect(markup).toContain('fill="#3f3f46"');
  });

  it('fits constrained catalog labels inside their available width', () => {
    const markup = renderToStaticMarkup(
      <BoxNode text="Reject this oversized label" size={{ width: 64, height: 46 }} />,
    );

    expect(markup).toContain('textLength=');
    expect(markup).toContain('spacingAndGlyphs');
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

    expect(pathData).toContain('M 71 0');
  });

  it('keeps the marker carrier path continuous when labels split the visible stroke', () => {
    const edge = {
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
        orientation: 'horizontal' as const,
      },
    };

    expect(edgeLinePathData(edge)).toContain('M 71 0');
    expect(edgeMarkerCarrierPathData(edge)).toBe('M 2 0 L 98 0');
  });

  it('renders orthogonal edge elbows without curves', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    expect(pathData).toBe('M 2 0 L 50 0 L 50 48');
    expect(pathData).not.toContain('Q');
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

  it('keeps terminal bends square while preserving visible arrow runway', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 30 },
      ],
    });

    expect(pathData).toBe('M 2 0 L 50 0 L 50 28');
    expect(pathData).not.toContain('Q');
  });

  it('keeps arrow marker tips just outside the target anchor', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });

    expect(pathData).toBe('M 2 0 L 98 0');
  });

  it('backs the visible shaft away from marker bodies', () => {
    const pathData = edgeLinePathData(
      {
        from: 'a',
        to: 'b',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      },
      { trimForMarkers: true },
    );

    expect(pathData).toBe('M 2 0 L 90 0');
  });

  it('anchors circle marker edges outside node clearance', () => {
    const markerPoints = edgeLineMarkerPoints({
      from: 'a',
      to: 'b',
      startMarker: 'circle',
      endMarker: 'filledCircle',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    const visiblePathData = edgeLinePathData(
      {
        from: 'a',
        to: 'b',
        startMarker: 'circle',
        endMarker: 'filledCircle',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      },
      { trimForMarkers: true },
    );

    const pathXs = visiblePathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    expect(markerPoints[0]!.x).toBeCloseTo(5.63, 2);
    expect(markerPoints[1]!.x).toBeCloseTo(95.12, 2);
    expect(pathXs[0]).toBeCloseTo(9.26, 2);
    expect(pathXs[2]).toBeCloseTo(92.24, 2);
  });

  it('anchors diamond and square marker edges outside node clearance', () => {
    const markerPoints = edgeLineMarkerPoints({
      from: 'a',
      to: 'b',
      startMarker: 'diamond',
      endMarker: 'filledSquare',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    });
    const visiblePathData = edgeLinePathData(
      {
        from: 'a',
        to: 'b',
        startMarker: 'diamond',
        endMarker: 'filledSquare',
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      },
      { trimForMarkers: true },
    );

    const pathXs = visiblePathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    expect(markerPoints[0]!.x).toBeCloseTo(6.75, 2);
    expect(markerPoints[1]!.x).toBeCloseTo(95.12, 2);
    expect(pathXs[0]).toBeCloseTo(11.5, 2);
    expect(pathXs[2]).toBeCloseTo(92.24, 2);
  });

  it('keeps square elbows when the terminal segment leaves room for the runway', () => {
    const pathData = edgeLinePathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ],
    });

    expect(pathData).toBe('M 2 0 L 50 0 L 50 48');
    expect(pathData).not.toContain('Q');
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

    expect(pathData).toContain('L 45 0 L 55 0');
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

    expect(maskPathData).toBe('M 45 0 L 55 0');
  });

  it('puts the bridge on the segment with more room near compact elbows', () => {
    const bridges = edgeBridgeMap([
      {
        from: 'a',
        to: 'b',
        points: [
          { x: 0, y: 0 },
          { x: 40, y: 0 },
          { x: 40, y: 20 },
        ],
      },
      {
        from: 'c',
        to: 'd',
        points: [
          { x: 38, y: -20 },
          { x: 38, y: 40 },
        ],
      },
    ]);

    expect(bridges.get(0)).toBeUndefined();
    expect(bridges.get(1)).toEqual([
      {
        x: 38,
        y: 0,
        segmentIndex: 0,
        orientation: 'vertical',
      },
    ]);
  });

  it('keeps bridge masks when the edge label is on a different segment', () => {
    const maskPathData = edgeBridgeMaskPathData({
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 60 },
        { x: 160, y: 60 },
      ],
      labelPlacement: {
        x: 130,
        y: 60,
        width: 80,
        height: 14,
        segmentIndex: 2,
        orientation: 'horizontal',
      },
      bridges: [
        {
          x: 50,
          y: 0,
          segmentIndex: 0,
          orientation: 'horizontal',
        },
      ],
    });

    expect(maskPathData).toBe('M 45 0 L 55 0');
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
