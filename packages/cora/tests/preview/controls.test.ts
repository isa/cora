import { describe, expect, it } from 'vitest';

import {
  baseNodeControls,
  connectionControls,
  iconNodeControls,
  labelIconNodeControls,
  labelNodeControls,
  markerOptions,
  pageNodeControls,
  websiteNodeControls,
} from '../../src/preview/controls/defaults.js';

describe('preview controls', () => {
  it('constrains enum controls for PageNode.type, borderStyle, shadow, lineStyle, startMarker, and endMarker', () => {
    expect(pageNodeControls.find((control) => control.label === 'PageNode.type')).toMatchObject({
      kind: 'enum',
      options: ['landing', 'form', 'content', 'profile', 'settings'],
    });
    expect(baseNodeControls.find((control) => control.key === 'borderStyle')).toMatchObject({
      kind: 'enum',
      options: ['none', 'solid', 'dashed', 'dotted'],
    });
    expect(baseNodeControls.find((control) => control.key === 'shadow')).toMatchObject({
      kind: 'enum',
      options: ['none', 'cast', 'radial'],
    });
    expect(connectionControls.find((control) => control.key === 'lineStyle')).toMatchObject({
      kind: 'enum',
      options: ['solid', 'dashed', 'dotted'],
    });
    expect(connectionControls.find((control) => control.key === 'startMarker')).toMatchObject({
      kind: 'enum',
      options: markerOptions,
      display: 'select',
    });
    expect(connectionControls.find((control) => control.key === 'endMarker')).toMatchObject({
      kind: 'enum',
      options: markerOptions,
      display: 'select',
    });
    expect(connectionControls.find((control) => control.key === 'arrowSize')).toMatchObject({
      kind: 'number',
      min: 4,
      max: 24,
    });
    expect(baseNodeControls.find((control) => control.key === 'titleFontSize')).toMatchObject({
      kind: 'number',
      min: 8,
      max: 28,
    });
    expect(baseNodeControls.find((control) => control.key === 'subtitleFontSize')).toMatchObject({
      kind: 'number',
      min: 7,
      max: 24,
    });
  });

  it('defines bounded number controls and size controls', () => {
    expect(baseNodeControls.find((control) => control.kind === 'number')).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
      step: expect.any(Number),
    });
    expect(baseNodeControls.find((control) => control.kind === 'size')).toMatchObject({
      presets: ['sm', 'md', 'lg', 'xl', 'xxl'],
      explicit: { width: 140, height: 40 },
    });
    expect(labelNodeControls.some((control) => control.key === 'size')).toBe(false);
    expect(labelNodeControls.some((control) => control.key === 'shadow')).toBe(false);
    expect(iconNodeControls.some((control) => control.key === 'iconColor')).toBe(true);
    expect(iconNodeControls.some((control) => control.key === 'title')).toBe(true);
    expect(iconNodeControls.some((control) => control.key === 'subtitle')).toBe(true);
    expect(labelIconNodeControls.some((control) => control.key === 'shadow')).toBe(true);
    expect(labelIconNodeControls.find((control) => control.kind === 'size')).toMatchObject({
      explicit: { width: 128, height: 56 },
    });
    expect(websiteNodeControls.find((control) => control.key === 'skeletonColor')).toMatchObject({
      kind: 'color',
      label: 'Skeleton',
    });
  });
});
