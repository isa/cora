import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

import { computeLayout, cleanAllEdgePoints } from '../../../src/core/layout.js';
import {
  EDGE_LABEL_RUNWAY,
  updateLabeledEdgePlacements,
} from '../../../src/core/labeledEdgeExpansion.js';
import {
  API_CONNECTION_GAP,
  DOCUMENT_CONNECTION_GAP,
  PEOPLE_CONNECTION_GAP,
  WEBSITE_CONNECTION_GAP,
  connectionAnchorBox,
  sidePoint,
} from '../../../src/core/connectionAnchors.js';
import { measureNodes } from '../../../src/core/measureText.js';
import { edgeBridgeMap, edgeSegments } from '../../../src/core/edgeGeometry.js';
import {
  effectiveEndMarker,
  effectiveStartMarker,
  markerVisibleTrim,
} from '../../../src/core/edgeMarkers.js';
import type { Diagram } from '../../../src/core/types.js';
import { edgeLinePathData } from '../../../src/renderer/components/edges/edgePath.js';
import { defaultTheme } from '../../../src/renderer/themes/default.js';

describe('connection anchors', () => {
  const EPSILON = 0.001;
  const VALID_FIXTURES = [
    'box-arrows',
    'components',
    'database',
    'flowchart',
    'icon-gallery',
    'infra',
    'marker-cycle',
    'markers',
    'microservice',
    'minimal',
  ];

  function segmentCrossesNode(
    segment: ReturnType<typeof edgeSegments>[number],
    node: Awaited<ReturnType<typeof computeLayout>>['nodes'][number],
  ): boolean {
    if (segment.orientation === 'vertical') {
      if (segment.a.x < node.x - 0.001 || segment.a.x > node.x + node.measuredWidth + 0.001) {
        return false;
      }
      const overlap = Math.min(Math.max(segment.a.y, segment.b.y), node.y + node.measuredHeight) -
        Math.max(Math.min(segment.a.y, segment.b.y), node.y);
      return overlap > 0.001;
    }

    if (segment.a.y < node.y - 0.001 || segment.a.y > node.y + node.measuredHeight + 0.001) {
      return false;
    }
    const overlap = Math.min(Math.max(segment.a.x, segment.b.x), node.x + node.measuredWidth) -
      Math.max(Math.min(segment.a.x, segment.b.x), node.x);
    return overlap > 0.001;
  }

  function segmentMergesWithGroupBorder(
    segment: ReturnType<typeof edgeSegments>[number],
    group: NonNullable<Awaited<ReturnType<typeof computeLayout>>['groups']>[number],
  ): boolean {
    if (segment.orientation === 'vertical') {
      const onBorder = Math.abs(segment.a.x - group.x) <= 6 ||
        Math.abs(segment.a.x - (group.x + group.width)) <= 6;
      const overlap = Math.min(Math.max(segment.a.y, segment.b.y), group.y + group.height) -
        Math.max(Math.min(segment.a.y, segment.b.y), group.y);
      return onBorder && overlap > 0.001;
    }

    const onBorder = Math.abs(segment.a.y - group.y) <= 6 ||
      Math.abs(segment.a.y - (group.y + group.height)) <= 6;
    const overlap = Math.min(Math.max(segment.a.x, segment.b.x), group.x + group.width) -
      Math.max(Math.min(segment.a.x, segment.b.x), group.x);
    return onBorder && overlap > 0.001;
  }

  function sharedSegmentCount(edges: Awaited<ReturnType<typeof computeLayout>>['edges']): number {
    let count = 0;
    for (let firstIndex = 0; firstIndex < edges.length; firstIndex++) {
      const firstSegments = edgeSegments(edges[firstIndex]!.points);
      for (let secondIndex = firstIndex + 1; secondIndex < edges.length; secondIndex++) {
        const secondSegments = edgeSegments(edges[secondIndex]!.points);
        for (const first of firstSegments) {
          for (const second of secondSegments) {
            if (first.orientation !== second.orientation) {
              continue;
            }
            if (first.orientation === 'horizontal') {
              if (Math.abs(first.a.y - second.a.y) > 0.001) {
                continue;
              }
              const overlap = Math.min(Math.max(first.a.x, first.b.x), Math.max(second.a.x, second.b.x)) -
                Math.max(Math.min(first.a.x, first.b.x), Math.min(second.a.x, second.b.x));
              if (overlap > 0.001) count++;
            } else {
              if (Math.abs(first.a.x - second.a.x) > 0.001) {
                continue;
              }
              const overlap = Math.min(Math.max(first.a.y, first.b.y), Math.max(second.a.y, second.b.y)) -
                Math.max(Math.min(first.a.y, first.b.y), Math.min(second.a.y, second.b.y));
              if (overlap > 0.001) count++;
            }
          }
        }
      }
    }

    return count;
  }

  function crowdedParallelSegmentCount(
    edges: Awaited<ReturnType<typeof computeLayout>>['edges'],
  ): number {
    let count = 0;
    const clearance = 14;

    for (let firstIndex = 0; firstIndex < edges.length; firstIndex++) {
      const firstSegments = edgeSegments(edges[firstIndex]!.points);
      for (let secondIndex = firstIndex + 1; secondIndex < edges.length; secondIndex++) {
        const secondSegments = edgeSegments(edges[secondIndex]!.points);
        for (const first of firstSegments) {
          for (const second of secondSegments) {
            if (first.orientation !== second.orientation) {
              continue;
            }

            const lineDistance = first.orientation === 'horizontal'
              ? Math.abs(first.a.y - second.a.y)
              : Math.abs(first.a.x - second.a.x);
            if (lineDistance <= EPSILON || lineDistance >= clearance) {
              continue;
            }

            const overlap = first.orientation === 'horizontal'
              ? overlapRange(first.a.x, first.b.x, second.a.x, second.b.x)
              : overlapRange(first.a.y, first.b.y, second.a.y, second.b.y);
            if (overlap > EPSILON) {
              count++;
            }
          }
        }
      }
    }

    return count;
  }

  function loadFixtureDiagram(name: string): Diagram {
    const url = new URL(`../../fixtures/valid/${name}.yaml`, import.meta.url);
    return (parse(readFileSync(url, 'utf8')) as { diagram: Diagram }).diagram;
  }

  async function layoutFixture(name: string): Promise<Awaited<ReturnType<typeof computeLayout>>> {
    const diagram = loadFixtureDiagram(name);
    return computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
  }

  function overlapRange(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
    return Math.min(Math.max(aStart, aEnd), Math.max(bStart, bEnd)) -
      Math.max(Math.min(aStart, aEnd), Math.min(bStart, bEnd));
  }

  function segmentCrossesNodeInterior(
    segment: ReturnType<typeof edgeSegments>[number],
    node: Awaited<ReturnType<typeof computeLayout>>['nodes'][number],
  ): boolean {
    if (segment.orientation === 'vertical') {
      if (segment.a.x <= node.x + EPSILON || segment.a.x >= node.x + node.measuredWidth - EPSILON) {
        return false;
      }
      return overlapRange(segment.a.y, segment.b.y, node.y, node.y + node.measuredHeight) > EPSILON;
    }

    if (segment.a.y <= node.y + EPSILON || segment.a.y >= node.y + node.measuredHeight - EPSILON) {
      return false;
    }
    return overlapRange(segment.a.x, segment.b.x, node.x, node.x + node.measuredWidth) > EPSILON;
  }

  function segmentMergesWithNodeSide(
    segment: ReturnType<typeof edgeSegments>[number],
    node: Awaited<ReturnType<typeof computeLayout>>['nodes'][number],
  ): boolean {
    if (segment.orientation === 'vertical') {
      const onSide = Math.abs(segment.a.x - node.x) <= EPSILON ||
        Math.abs(segment.a.x - (node.x + node.measuredWidth)) <= EPSILON;
      return onSide && overlapRange(segment.a.y, segment.b.y, node.y, node.y + node.measuredHeight) > EPSILON;
    }

    const onSide = Math.abs(segment.a.y - node.y) <= EPSILON ||
      Math.abs(segment.a.y - (node.y + node.measuredHeight)) <= EPSILON;
    return onSide && overlapRange(segment.a.x, segment.b.x, node.x, node.x + node.measuredWidth) > EPSILON;
  }

  function segmentMergesWithExactGroupSide(
    segment: ReturnType<typeof edgeSegments>[number],
    group: NonNullable<Awaited<ReturnType<typeof computeLayout>>['groups']>[number],
  ): boolean {
    if (segment.orientation === 'vertical') {
      const onSide = Math.abs(segment.a.x - group.x) <= EPSILON ||
        Math.abs(segment.a.x - (group.x + group.width)) <= EPSILON;
      return onSide && overlapRange(segment.a.y, segment.b.y, group.y, group.y + group.height) > EPSILON;
    }

    const onSide = Math.abs(segment.a.y - group.y) <= EPSILON ||
      Math.abs(segment.a.y - (group.y + group.height)) <= EPSILON;
    return onSide && overlapRange(segment.a.x, segment.b.x, group.x, group.x + group.width) > EPSILON;
  }

  function pathSegments(pathData: string): Array<[{ x: number; y: number }, { x: number; y: number }]> {
    const commands = pathData.match(/[ML] [-\d.]+ [-\d.]+/g) ?? [];
    const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];
    let cursor: { x: number; y: number } | undefined;

    for (const command of commands) {
      const [op, xText, yText] = command.split(' ');
      const point = { x: Number(xText), y: Number(yText) };
      if (op === 'M') {
        cursor = point;
        continue;
      }
      if (cursor) {
        segments.push([cursor, point]);
      }
      cursor = point;
    }

    return segments;
  }

  function segmentLength(
    [start, end]: [{ x: number; y: number }, { x: number; y: number }],
  ): number {
    return Math.hypot(end.x - start.x, end.y - start.y);
  }

  function axisValue(
    point: { x: number; y: number },
    orientation: 'horizontal' | 'vertical',
  ): number {
    return orientation === 'horizontal' ? point.x : point.y;
  }

  function edgeLabelRect(
    edge: Awaited<ReturnType<typeof computeLayout>>['edges'][number],
  ): { left: number; right: number; top: number; bottom: number } | undefined {
    if (!edge.labelPlacement) {
      return undefined;
    }

    const boxWidth = edge.labelPlacement.width + 6;
    const boxHeight = edge.labelPlacement.height + 3;
    const renderY = edge.labelPlacement.orientation === 'horizontal'
      ? edge.labelPlacement.y - 1
      : edge.labelPlacement.y;

    return {
      left: edge.labelPlacement.x - boxWidth / 2,
      right: edge.labelPlacement.x + boxWidth / 2,
      top: renderY - boxHeight / 2,
      bottom: renderY + boxHeight / 2,
    };
  }

  function rectOverlap(
    a: { left: number; right: number; top: number; bottom: number },
    b: { left: number; right: number; top: number; bottom: number },
  ): number {
    return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  }

  function crowdedParallelSegments(
    edges: Awaited<ReturnType<typeof computeLayout>>['edges'],
  ): Array<{
    first: string;
    second: string;
    orientation: 'horizontal' | 'vertical';
    distance: number;
    overlap: number;
  }> {
    const crowded: Array<{
      first: string;
      second: string;
      orientation: 'horizontal' | 'vertical';
      distance: number;
      overlap: number;
    }> = [];

    for (let firstIndex = 0; firstIndex < edges.length; firstIndex++) {
      const firstSegments = edgeSegments(edges[firstIndex]!.points);
      for (let secondIndex = firstIndex + 1; secondIndex < edges.length; secondIndex++) {
        const secondSegments = edgeSegments(edges[secondIndex]!.points);
        for (const first of firstSegments) {
          for (const second of secondSegments) {
            if (first.orientation !== second.orientation) {
              continue;
            }

            const firstLine = first.orientation === 'horizontal' ? first.a.y : first.a.x;
            const secondLine = second.orientation === 'horizontal' ? second.a.y : second.a.x;
            const distance = Math.abs(firstLine - secondLine);
            if (distance <= EPSILON || distance >= 14) {
              continue;
            }

            const overlap = overlapRange(
              axisValue(first.a, first.orientation),
              axisValue(first.b, first.orientation),
              axisValue(second.a, second.orientation),
              axisValue(second.b, second.orientation),
            );
            if (overlap <= 16) {
              continue;
            }

            crowded.push({
              first: `${edges[firstIndex]!.from}->${edges[firstIndex]!.to}`,
              second: `${edges[secondIndex]!.from}->${edges[secondIndex]!.to}`,
              orientation: first.orientation,
              distance,
              overlap,
            });
          }
        }
      }
    }

    return crowded;
  }

  function pointIsInteriorOnSegment(value: number, start: number, end: number): boolean {
    return value > Math.min(start, end) + EPSILON && value < Math.max(start, end) - EPSILON;
  }

  function hasBridgeAt(
    edge: Awaited<ReturnType<typeof computeLayout>>['edges'][number],
    point: { x: number; y: number },
  ): boolean {
    return (edge.bridges ?? []).some((bridge) =>
      Math.abs(bridge.x - point.x) <= EPSILON &&
      Math.abs(bridge.y - point.y) <= EPSILON
    );
  }

  it('keeps every valid fixture orthogonal and clear of node bodies and sides', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);

      for (const edge of layout.edges) {
        for (let index = 0; index < edge.points.length - 1; index++) {
          const start = edge.points[index]!;
          const end = edge.points[index + 1]!;
          if (start.x !== end.x && start.y !== end.y) {
            failures.push(`${fixture}: ${edge.from}->${edge.to} has a diagonal layout segment`);
          }
        }

        for (const segment of edgeSegments(edge.points)) {
          for (const node of layout.nodes) {
            if (segmentCrossesNodeInterior(segment, node)) {
              failures.push(`${fixture}: ${edge.from}->${edge.to} crosses node ${node.id}`);
            }
            if (segmentMergesWithNodeSide(segment, node)) {
              failures.push(`${fixture}: ${edge.from}->${edge.to} merges with node side ${node.id}`);
            }
          }

          for (const group of layout.groups ?? []) {
            if (segmentMergesWithExactGroupSide(segment, group)) {
              failures.push(`${fixture}: ${edge.from}->${edge.to} merges with group side ${group.id}`);
            }
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps every valid fixture free of merged edge lanes', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);
      const shared = sharedSegmentCount(layout.edges);
      if (shared > 0) {
        failures.push(`${fixture}: ${shared} shared lanes`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('renders every valid fixture without diagonal stroke segments', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);

      for (const edge of layout.edges) {
        for (const [start, end] of pathSegments(edgeLinePathData(edge, { trimForMarkers: true }))) {
          if (start.x !== end.x && start.y !== end.y) {
            failures.push(`${fixture}: ${edge.from}->${edge.to} has a rendered diagonal segment`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps labels and endpoint markers on real shaft runway in every valid fixture', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);

      for (const edge of layout.edges) {
        const segments = edgeSegments(edge.points);
        const first = segments[0];
        const last = segments.at(-1);
        const sourceMinimum = 2 + markerVisibleTrim(effectiveStartMarker(edge.startMarker)) + 11;
        const targetMinimum = 2 + markerVisibleTrim(effectiveEndMarker(edge.endMarker)) + 11;

        if (first) {
          if (first.length < sourceMinimum - EPSILON) {
            failures.push(`${fixture}: ${edge.from}->${edge.to} source marker runway ${first.length}`);
          }
        }
        if (last) {
          if (last.length < targetMinimum - EPSILON) {
            failures.push(`${fixture}: ${edge.from}->${edge.to} target marker runway ${last.length}`);
          }
        }

        if (!edge.labelPlacement) {
          continue;
        }

        const labelSegment = segments.find((segment) => segment.index === edge.labelPlacement!.segmentIndex);
        if (!labelSegment) {
          failures.push(`${fixture}: ${edge.from}->${edge.to} label segment missing`);
          continue;
        }

        const center = axisValue(edge.labelPlacement, edge.labelPlacement.orientation);
        const labelHalfSpan = edge.labelPlacement.orientation === 'horizontal'
          ? edge.labelPlacement.width / 2
          : edge.labelPlacement.height / 2;
        const segmentMin = Math.min(
          axisValue(labelSegment.a, labelSegment.orientation),
          axisValue(labelSegment.b, labelSegment.orientation),
        );
        const segmentMax = Math.max(
          axisValue(labelSegment.a, labelSegment.orientation),
          axisValue(labelSegment.b, labelSegment.orientation),
        );

        const leading = center - labelHalfSpan - segmentMin;
        const trailing = segmentMax - (center + labelHalfSpan);
        if (leading < EDGE_LABEL_RUNWAY - EPSILON) {
          failures.push(`${fixture}: ${edge.from}->${edge.to} label leading runway ${leading}`);
        }
        if (trailing < EDGE_LABEL_RUNWAY - EPSILON) {
          failures.push(`${fixture}: ${edge.from}->${edge.to} label trailing runway ${trailing}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps edge labels clear of node bodies in every valid fixture', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);

      for (const edge of layout.edges) {
        const labelRect = edgeLabelRect(edge);
        if (!labelRect) {
          continue;
        }

        for (const node of layout.nodes) {
          const nodeRect = {
            left: node.x,
            right: node.x + node.measuredWidth,
            top: node.y,
            bottom: node.y + node.measuredHeight,
          };

          if (rectOverlap(labelRect, nodeRect) > EPSILON) {
            failures.push(`${fixture}: ${edge.from}->${edge.to} label overlaps ${node.id}`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps valid fixtures free of nearly merged parallel lanes', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);
      const crowded = crowdedParallelSegments(layout.edges);

      for (const pair of crowded) {
        failures.push(
          `${fixture}: ${pair.first} near-merges ${pair.second} (${pair.orientation} ${pair.distance.toFixed(2)}px)`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('adds a bridge for every perpendicular edge crossing in valid fixtures', async () => {
    const failures: string[] = [];

    for (const fixture of VALID_FIXTURES) {
      const layout = await layoutFixture(fixture);

      for (let firstIndex = 0; firstIndex < layout.edges.length; firstIndex++) {
        const first = layout.edges[firstIndex]!;
        for (let secondIndex = firstIndex + 1; secondIndex < layout.edges.length; secondIndex++) {
          const second = layout.edges[secondIndex]!;
          for (const firstSegment of edgeSegments(first.points)) {
            for (const secondSegment of edgeSegments(second.points)) {
              if (firstSegment.orientation === secondSegment.orientation) {
                continue;
              }

              const horizontal = firstSegment.orientation === 'horizontal' ? firstSegment : secondSegment;
              const vertical = firstSegment.orientation === 'vertical' ? firstSegment : secondSegment;
              const crossing = { x: vertical.a.x, y: horizontal.a.y };
              const crossesInterior =
                pointIsInteriorOnSegment(crossing.x, horizontal.a.x, horizontal.b.x) &&
                pointIsInteriorOnSegment(crossing.y, vertical.a.y, vertical.b.y);

              if (!crossesInterior) {
                continue;
              }

              if (!hasBridgeAt(first, crossing) && !hasBridgeAt(second, crossing)) {
                failures.push(`${fixture}: ${first.from}->${first.to} crosses ${second.from}->${second.to} without a bridge`);
              }
            }
          }
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('puts the crossing gap on the other line when a crossing touches marker runway', () => {
    const protectedArrow = {
      from: 'source',
      to: 'target',
      points: [
        { x: 50, y: 0 },
        { x: 50, y: 100 },
      ],
    };
    const crossingLine = {
      from: 'other',
      to: 'next',
      points: [
        { x: 50, y: 90 },
        { x: 110, y: 90 },
      ],
    };

    const bridges = edgeBridgeMap([protectedArrow, crossingLine]);

    expect(bridges.get(0)).toBeUndefined();
    expect(bridges.get(1)).toEqual([
      {
        x: 50,
        y: 90,
        segmentIndex: 0,
        orientation: 'horizontal',
      },
    ]);
  });

  it('normalizes fallback center-to-center routes into orthogonal elbows', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'source', label: 'Source', position: { x: 40, y: 40 } },
        { id: 'target', label: 'Target', position: { x: 260, y: 160 } },
      ],
      edges: [
        { from: 'source', to: 'target' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const points = layout.edges[0]!.points;

    expect(points.length).toBeGreaterThan(2);
    for (let index = 0; index < points.length - 1; index++) {
      const start = points[index]!;
      const end = points[index + 1]!;
      expect(start.x === end.x || start.y === end.y).toBe(true);
    }
  });

  it('uses icon artwork centers for single decision side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'decision', label: 'Decision', component: 'decision', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'decision' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const decision = layout.nodes.find((node) => node.id === 'decision')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(decision.x + 20);
    expect(target.y).toBe(decision.y + 39.5);
  });

  it('uses icon artwork centers for single analytics side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'analytics', label: 'Analytics', component: 'analytics', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'analytics' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const analytics = layout.nodes.find((node) => node.id === 'analytics')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(analytics.x + 20);
    expect(target.y).toBe(analytics.y + 39.5);
  });

  it('uses icon artwork centers for single configuration side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'configuration', label: 'Config', component: 'configuration', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'configuration' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const configuration = layout.nodes.find((node) => node.id === 'configuration')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(configuration.x + 20);
    expect(target.y).toBe(configuration.y + 39.5);
  });

  it('uses icon artwork centers for single cloud side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'cloud', label: 'Cloud', component: 'cloud', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'cloud' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const cloud = layout.nodes.find((node) => node.id === 'cloud')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(cloud.x + 20);
    expect(target.y).toBe(cloud.y + 39.5);
  });

  it('uses icon artwork centers for single archive side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'archive', label: 'Archive', component: 'archive', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'archive' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const archive = layout.nodes.find((node) => node.id === 'archive')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(archive.x + 20);
    expect(target.y).toBe(archive.y + 39.5);
  });

  it('uses icon artwork centers for single artificialIntelligence side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'ai', label: 'AI', component: 'artificialIntelligence', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'ai' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const ai = layout.nodes.find((node) => node.id === 'ai')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(ai.x + 20);
    expect(target.y).toBe(ai.y + 39.5);
  });

  it('uses icon artwork centers for single multimedia side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'multimedia', label: 'Multi', component: 'multimedia', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'multimedia' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const multimedia = layout.nodes.find((node) => node.id === 'multimedia')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(multimedia.x + 20);
    expect(target.y).toBe(multimedia.y + 39.5);
  });

  it('uses icon artwork centers for single app side connections in rendered layouts', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 80, y: 120 } },
        { id: 'app', label: 'App', component: 'app', position: { x: 300, y: 100 } },
      ],
      edges: [
        { from: 'box', to: 'app' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const app = layout.nodes.find((node) => node.id === 'app')!;
    const edge = layout.edges[0]!;
    const target = edge.points.at(-1)!;

    expect(target.x).toBe(app.x + 20);
    expect(target.y).toBe(app.y + 39.5);
  });

  it('distributes multiple rendered app side connections across the phone artwork', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'app', label: 'App', component: 'app', position: { x: 100, y: 100 } },
        { id: 'top', label: 'Top', position: { x: 320, y: 80 } },
        { id: 'bottom', label: 'Bottom', position: { x: 320, y: 220 } },
      ],
      edges: [
        { from: 'app', to: 'top' },
        { from: 'app', to: 'bottom' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const app = layout.nodes.find((node) => node.id === 'app')!;
    const starts = layout.edges.map((edge) => edge.points[0]!);

    expect(starts.map((point) => point.x)).toEqual([app.x + 76, app.x + 76]);
    expect(starts[0]!.y).toBeCloseTo(app.y + 26.38888888888889);
    expect(starts[1]!.y).toBeCloseTo(app.y + 46.61111111111109);
    expect((starts[0]!.y + starts[1]!.y) / 2).toBeCloseTo(app.y + 36.5);
  });

  it('routes app bottom connections below the label while keeping them centered on the icon width', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'app', label: 'App', component: 'app', position: { x: 100, y: 100 } },
        { id: 'next', label: 'Next', position: { x: 90, y: 280 } },
      ],
      edges: [
        { from: 'app', to: 'next' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const app = layout.nodes.find((node) => node.id === 'app')!;
    const start = layout.edges[0]!.points[0]!;

    // Source may snap up to a few pixels toward the target to avoid a tiny
    // zigzag, but must remain centered on the app icon width.
    expect(Math.abs(start.x - (app.x + app.measuredWidth / 2))).toBeLessThanOrEqual(6);
    expect(start.y).toBe(app.y + app.measuredHeight);
  });

  it('gaps people top/left/right anchors outside the icon silhouette', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'box', label: 'Box', position: { x: 40, y: 100 } },
        { id: 'people', label: 'People', component: 'people', position: { x: 240, y: 100 } },
        { id: 'above', label: 'Above', position: { x: 240, y: 20 } },
      ],
      edges: [
        { from: 'box', to: 'people' },
        { from: 'above', to: 'people' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const people = layout.nodes.find((node) => node.id === 'people')!;
    const fromLeft = layout.edges.find((edge) => edge.from === 'box')!.points.at(-1)!;
    const fromAbove = layout.edges.find((edge) => edge.from === 'above')!.points.at(-1)!;
    const expectedLeft = sidePoint(
      connectionAnchorBox(
        {
          id: people.id,
          x: people.x,
          y: people.y,
          width: people.measuredWidth,
          height: people.measuredHeight,
          component: 'people',
          text: 'People',
        },
        'left',
      ),
      'left',
    ).x;
    const expectedTop = sidePoint(
      connectionAnchorBox(
        {
          id: people.id,
          x: people.x,
          y: people.y,
          width: people.measuredWidth,
          height: people.measuredHeight,
          component: 'people',
          text: 'People',
        },
        'top',
      ),
      'top',
    ).y;

    expect(fromLeft.x).toBeCloseTo(expectedLeft, 0);
    expect(fromAbove.y).toBeCloseTo(expectedTop, 0);
  });

  it('keeps people top/bottom anchors on the full artwork height', () => {
    const node = {
      id: 'people',
      x: 100,
      y: 100,
      width: 96,
      height: 96,
      component: 'people' as const,
      text: 'People',
    };
    const top = sidePoint(connectionAnchorBox(node, 'top'), 'top');
    const left = sidePoint(connectionAnchorBox(node, 'left'), 'left');
    const artSize = 56;
    const scale = artSize / 24;
    const fullArtLeft = node.x + (node.width - artSize) / 2;
    const gap = PEOPLE_CONNECTION_GAP * scale;

    expect(left.x).toBe(fullArtLeft - gap);
    expect(top.x).toBe(node.x + node.width / 2);
    expect(top.y).toBe(108.5 - gap);
  });

  it('centers database top connections on the icon when the source is slightly misaligned', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'source', label: 'Source', position: { x: 192, y: 80 } },
        {
          id: 'database',
          label: 'Database',
          component: 'database',
          position: { x: 200, y: 200 },
        },
      ],
      edges: [{ from: 'source', to: 'database' }],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const database = layout.nodes.find((node) => node.id === 'database')!;
    const target = layout.edges[0]!.points.at(-1)!;
    const expectedTop = sidePoint(
      connectionAnchorBox(
        {
          id: database.id,
          x: database.x,
          y: database.y,
          width: database.measuredWidth,
          height: database.measuredHeight,
          component: 'database',
          text: database.label,
        },
        'top',
      ),
      'top',
    );

    expect(target.x).toBe(expectedTop.x);
    expect(target.y).toBe(expectedTop.y);
  });

  it('gaps api left/right and top anchors outside the cube silhouette', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'left', label: 'Left', position: { x: 40, y: 100 } },
        { id: 'api', label: 'API', component: 'api', position: { x: 240, y: 100 } },
        { id: 'above', label: 'Above', position: { x: 240, y: 20 } },
      ],
      edges: [
        { from: 'left', to: 'api' },
        { from: 'above', to: 'api' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const api = layout.nodes.find((node) => node.id === 'api')!;
    const fromLeft = layout.edges.find((edge) => edge.from === 'left')!.points.at(-1)!;
    const fromAbove = layout.edges.find((edge) => edge.from === 'above')!.points.at(-1)!;
    const expectedLeft = sidePoint(
      connectionAnchorBox(
        {
          id: api.id,
          x: api.x,
          y: api.y,
          width: api.measuredWidth,
          height: api.measuredHeight,
          component: 'api',
          text: 'API',
        },
        'left',
      ),
      'left',
    ).x;
    const expectedTop = sidePoint(
      connectionAnchorBox(
        {
          id: api.id,
          x: api.x,
          y: api.y,
          width: api.measuredWidth,
          height: api.measuredHeight,
          component: 'api',
          text: 'API',
        },
        'top',
      ),
      'top',
    ).y;

    expect(fromLeft.x).toBeCloseTo(expectedLeft, 0);
    expect(fromAbove.y).toBeCloseTo(expectedTop, 0);
  });

  it('keeps api bottom anchors on the full node height below the label', () => {
    const node = {
      id: 'api',
      x: 100,
      y: 100,
      width: 96,
      height: 96,
      component: 'api' as const,
      text: 'API',
    };
    const top = sidePoint(connectionAnchorBox(node, 'top'), 'top');
    const left = sidePoint(connectionAnchorBox(node, 'left'), 'left');
    const bottom = sidePoint(connectionAnchorBox(node, 'bottom'), 'bottom');
    const artSize = 56;
    const scale = artSize / 256;
    const fullArtLeft = node.x + (node.width - artSize) / 2;
    const gap = API_CONNECTION_GAP * scale;
    const cubeLeft = fullArtLeft + 40 * scale;

    expect(left.x).toBeLessThan(cubeLeft);
    expect(left.x).toBe(cubeLeft - gap);
    expect(top.y).toBeLessThan(119);
    expect(bottom.y).toBe(node.y + node.height);
  });

  it('gaps document top anchors above the icon artwork', () => {
    const node = {
      id: 'doc',
      x: 100,
      y: 100,
      width: 72,
      height: 96,
      component: 'document' as const,
      text: 'Proposal',
    };
    const anchorBox = connectionAnchorBox(node, 'top');
    const top = sidePoint(anchorBox, 'top');
    const bottom = sidePoint(connectionAnchorBox(node, 'bottom'), 'bottom');
    const scale = (56 / 24);
    const gap = DOCUMENT_CONNECTION_GAP * scale;

    expect(gap).toBeGreaterThan(6);
    expect(top.y).toBe(anchorBox.y);
    expect(bottom.y).toBe(node.y + node.height);
  });

  it('gaps website top/left/right anchors outside the browser window', () => {
    const node = {
      id: 'site',
      x: 100,
      y: 100,
      width: 108,
      height: 120,
      component: 'website' as const,
      text: 'Website',
    };
    const leftBox = connectionAnchorBox(node, 'left');
    const topBox = connectionAnchorBox(node, 'top');
    const left = sidePoint(leftBox, 'left');
    const top = sidePoint(topBox, 'top');
    const right = sidePoint(leftBox, 'right');
    const bottom = sidePoint(connectionAnchorBox(node, 'bottom'), 'bottom');
    const scale = leftBox.width / (600 + WEBSITE_CONNECTION_GAP * 2);
    const gap = WEBSITE_CONNECTION_GAP * scale;
    const windowX = leftBox.x + gap;
    const windowY = topBox.y + gap;

    expect(gap).toBeGreaterThan(6);
    expect(left.x).toBeCloseTo(windowX - gap, 5);
    expect(top.y).toBeCloseTo(windowY - gap, 5);
    expect(right.x).toBeCloseTo(windowX + 600 * scale + gap, 5);
    expect(bottom.y).toBe(node.y + node.height);
  });

  it('recomputes group bounds after labeled edges expand the layout', async () => {
    const diagram: Diagram = {
      kind: 'infra',
      direction: 'TB',
      nodes: [
        { id: 'entry', label: 'Entry' },
        { id: 'middle', label: 'Middle' },
        { id: 'database', label: 'Database' },
      ],
      edges: [
        { from: 'entry', to: 'middle', label: 'a very long route label' },
        { from: 'middle', to: 'database', label: 'persist' },
      ],
      groups: [
        {
          id: 'region',
          label: 'Region',
          contains: ['middle', 'database'],
        },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const group = layout.groups![0]!;
    const database = layout.nodes.find((node) => node.id === 'database')!;

    expect(database.y + database.measuredHeight).toBeLessThanOrEqual(group.y + group.height);
  });

  it('detours collinear edge segments instead of letting connections merge', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'auth', label: 'Auth', position: { x: 100, y: 40 } },
        { id: 'users', label: 'Users', position: { x: 130, y: 150 } },
        { id: 'audit', label: 'Audit', position: { x: 210, y: 150 } },
      ],
      edges: [
        { from: 'auth', to: 'users' },
        { from: 'auth', to: 'audit' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });

    expect(sharedSegmentCount(layout.edges)).toBe(0);
  });

  it('detours edges around unrelated node bodies', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'source', label: 'Source', position: { x: 100, y: 40 } },
        { id: 'target', label: 'Target', position: { x: 100, y: 260 } },
        { id: 'obstacle', label: 'Obstacle', position: { x: 90, y: 145 } },
      ],
      edges: [
        { from: 'source', to: 'target' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const obstacle = layout.nodes.find((node) => node.id === 'obstacle')!;

    expect(
      edgeSegments(layout.edges[0]!.points).some((segment) => segmentCrossesNode(segment, obstacle)),
    ).toBe(false);
  });

  it('detours edges away from group borders', async () => {
    const diagram: Diagram = {
      kind: 'infra',
      direction: 'TB',
      nodes: [
        { id: 'dns', label: 'DNS', position: { x: 120, y: 20 } },
        { id: 'east', label: 'East', position: { x: 120, y: 120 } },
        { id: 'west', label: 'West', position: { x: 50, y: 500 } },
      ],
      edges: [
        { from: 'dns', to: 'east' },
        { from: 'dns', to: 'west' },
      ],
      groups: [
        {
          id: 'east-region',
          label: 'East Region',
          contains: ['east'],
        },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const group = layout.groups![0]!;
    const westEdge = layout.edges.find((edge) => edge.to === 'west')!;

    expect(
      edgeSegments(westEdge.points).some((segment) => segmentMergesWithGroupBorder(segment, group)),
    ).toBe(false);
  });

  it('clamps edge labels to keep minimum stub distance from elbows', async () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      layout: 'preserve',
      nodes: [
        { id: 'a', label: 'NodeA', position: { x: 100, y: 100 } },
        { id: 'b', label: 'NodeB', position: { x: 400, y: 100 } },
      ],
      edges: [
        { from: 'a', to: 'b', label: 'clamped' },
      ],
    };

    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });

    const edge = layout.edges[0]!;
    expect(edge.labelPlacement).toBeDefined();
    const placement = edge.labelPlacement!;
    const nodeA = layout.nodes.find((n) => n.id === 'a')!;
    const nodeB = layout.nodes.find((n) => n.id === 'b')!;
    const minX = nodeA.x + nodeA.measuredWidth;
    const maxX = nodeB.x;
    expect(placement.x).toBeGreaterThanOrEqual(minX + EDGE_LABEL_RUNWAY);
    expect(placement.x).toBeLessThanOrEqual(maxX - EDGE_LABEL_RUNWAY);
  });

  it('moves labels off tiny elbow-adjacent segments onto a real carrier segment', () => {
    const edge = {
      from: 'a',
      to: 'b',
      label: 'io',
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 0 },
        { x: 80, y: 30 },
        { x: 160, y: 30 },
      ],
    };

    updateLabeledEdgePlacements([], [edge]);

    expect(edge.labelPlacement).toBeDefined();
    expect(edge.labelPlacement!.segmentIndex).not.toBe(1);
    expect(edge.labelPlacement!.orientation).toBe('horizontal');
  });

  it('simplifies overshooting zigzags', () => {
    const edge: any = {
      from: 'a',
      to: 'b',
      points: [
        { x: 150, y: 100 },
        { x: 250, y: 100 }, // overshoot past b (x = 200)
        { x: 250, y: 200 },
        { x: 200, y: 200 },
      ],
    };
    cleanAllEdgePoints([edge]);
    // The overshooting zigzag should be simplified to (150, 100) -> (200, 100) -> (200, 200)
    expect(edge.points).toEqual([
      { x: 150, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
    ]);
  });

  it('collapses unnecessary three-segment detours to a single elbow', () => {
    const edge: any = {
      from: 'a',
      to: 'b',
      points: [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 20 },
        { x: 120, y: 20 },
      ],
    };

    cleanAllEdgePoints([edge]);

    expect(edge.points.length).toBe(3);
  });

  it('keeps visible shaft on both sides of labels even when the segment ends in a marker', async () => {
    const diagram = loadFixtureDiagram('database');
    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const edge = layout.edges.find((candidate) => candidate.label === 'session lookup')!;
    const segments = pathSegments(edgeLinePathData(edge, { trimForMarkers: true }));
    const horizontal = segments.filter(([start, end]) => Math.abs(start.y - end.y) < 0.001);

    expect(horizontal).toHaveLength(2);
    expect(Math.abs(horizontal[0]![1].x - horizontal[0]![0].x)).toBeGreaterThanOrEqual(EDGE_LABEL_RUNWAY);
    expect(Math.abs(horizontal[1]![1].x - horizontal[1]![0].x)).toBeGreaterThanOrEqual(EDGE_LABEL_RUNWAY);
  });

  it('keeps trimmed edge strokes orthogonal after label and marker processing', async () => {
    const diagram = loadFixtureDiagram('microservice');
    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const edge = layout.edges.find((candidate) => candidate.label === 'login events')!;
    const segments = pathSegments(edgeLinePathData(edge, { trimForMarkers: true }));

    expect(segments.length).toBeGreaterThan(0);
    for (const [start, end] of segments) {
      expect(start.x === end.x || start.y === end.y).toBe(true);
    }
  });

  it('keeps visible runway before the first and last elbows in the repaired box fixtures', async () => {
    const diagram = loadFixtureDiagram('microservice');
    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const outgoing = layout.edges.find((candidate) => candidate.from === 'recommendations' && candidate.to === 'analytics')!;
    const incoming = layout.edges.find((candidate) => candidate.label === 'preferences')!;
    const outgoingSegments = pathSegments(edgeLinePathData(outgoing, { trimForMarkers: true }));
    const incomingSegments = pathSegments(edgeLinePathData(incoming, { trimForMarkers: true }));

    expect(segmentLength(outgoingSegments[0]!)).toBeGreaterThanOrEqual(11);
    expect(segmentLength(incomingSegments.at(-1)!)).toBeGreaterThanOrEqual(11);
  });

  it('uses a simple orthogonal route without tiny stubs when opposite faces are close', async () => {
    const diagram = loadFixtureDiagram('flowchart');
    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });
    const edge = layout.edges.find((candidate) => candidate.from === 'load' && candidate.to === 'check')!;

    expect(edge.points.length).toBeLessThanOrEqual(4);
    for (const segment of edgeSegments(edge.points)) {
      expect(segment.length).toBeGreaterThanOrEqual(22);
    }
  });

  it('keeps the microservice fixture free of shared lanes', async () => {
    const diagram = loadFixtureDiagram('microservice');
    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });

    expect(sharedSegmentCount(layout.edges)).toBe(0);
  });

  it('keeps the microservice fixture free of crowded near-parallel lanes', async () => {
    const diagram = loadFixtureDiagram('microservice');
    const layout = await computeLayout({
      diagram,
      measuredNodes: measureNodes(diagram.nodes),
      theme: defaultTheme,
    });

    expect(crowdedParallelSegmentCount(layout.edges)).toBe(0);
  });
});
