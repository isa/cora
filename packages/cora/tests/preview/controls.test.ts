import { describe, expect, it } from 'vitest';

import {
  baseNodeControls,
  connectionControls,
  iconNodeControls,
  issueNodeControls,
  labelIconNodeControls,
  labelNodeControls,
  pageNodeControls,
  websiteNodeControls,
} from '../../src/preview/controls/defaults.js';
import { searchPreviewIcons } from '../../src/preview/iconSearch.js';

describe('preview controls', () => {
  it('constrains enum controls for PageNode.type, IssueNode.icon, borderStyle, shadow, lineStyle, startMarker, and endMarker', () => {
    expect(pageNodeControls.find((control) => control.label === 'PageNode.type')).toMatchObject({
      kind: 'enum',
      options: ['landing', 'form', 'content', 'profile', 'settings'],
    });
    expect(issueNodeControls.find((control) => control.label === 'IssueNode.icon')).toMatchObject({
      kind: 'enum',
      options: ['bug', 'warning', 'error', 'stop'],
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
      options: ['none', 'arrow', 'circle', 'filledCircle', 'diamond', 'filledDiamond', 'square', 'filledSquare'],
      display: 'select',
    });
    expect(connectionControls.find((control) => control.key === 'endMarker')).toMatchObject({
      kind: 'enum',
      options: ['none', 'arrow', 'circle', 'filledCircle', 'diamond', 'filledDiamond', 'square', 'filledSquare'],
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
    expect(labelNodeControls.some((control) => control.key === 'shadowColor')).toBe(false);
    expect(iconNodeControls.map((control) => control.key)).toEqual([
      'iconName',
      'iconColor',
      'title',
      'subtitle',
      'size',
      'backgroundColor',
      'radius',
      'borderStyle',
      'borderColor',
      'borderWidth',
      'textColor',
      'subtitleColor',
      'titleFontSize',
      'subtitleFontSize',
    ]);
    expect(labelIconNodeControls.map((control) => control.key)).toEqual(['iconName', 'iconColor', 'title', 'subtitle', 'backgroundColor', 'size']);
    expect(labelIconNodeControls.find((control) => control.key === 'iconName')).toMatchObject({
      kind: 'icon',
    });
    expect(labelIconNodeControls.find((control) => control.kind === 'size')).toMatchObject({
      explicit: { width: 40, height: 40 },
      presetSizes: {
        sm: { width: 20, height: 20 },
        md: { width: 40, height: 40 },
        lg: { width: 60, height: 60 },
        xl: { width: 80, height: 80 },
        xxl: { width: 100, height: 100 },
      },
    });
    expect(websiteNodeControls.map((control) => control.key)).toContain('skeletonColor');
    expect(websiteNodeControls.find((control) => control.kind === 'size')).toMatchObject({
      explicit: { width: 144, height: 160 },
      presetSizes: {
        md: { width: 96, height: 107 },
        lg: { width: 144, height: 160 },
        xl: { width: 216, height: 240 },
        xxl: { width: 324, height: 360 },
      },
    });
  });

  it('searches local Iconify index names for icon controls', async () => {
    await expect(searchPreviewIcons('database', 5).then((icons) => icons.map((icon) => icon.fullName))).resolves.toContain(
      'material-symbols:database',
    );
  });

  it('fuzzy searches local Iconify index names', async () => {
    const results = await searchPreviewIcons('cld dnld', 12);

    expect(results.map((icon) => icon.fullName)).toContain('material-symbols:cloud-download');
  });
});
