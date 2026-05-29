import { describe, expect, it } from 'vitest';

import {
  appNodeControls,
  baseNodeControls,
  connectionControls,
  documentNodeControls,
  iconNodeControls,
  labelIconNodeControls,
  labelNodeControls,
  websiteNodeControls,
} from '../../src/preview/controls/defaults.js';
import { searchPreviewIcons } from '../../src/preview/iconSearch.js';

describe('preview controls', () => {
  it('constrains enum controls for borderStyle, shadow, lineStyle, startMarker, and endMarker', () => {
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

  it('defines bounded number controls and no size controls (nodes resize by drag)', () => {
    expect(baseNodeControls.find((control) => control.kind === 'number')).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
      step: expect.any(Number),
    });
    // Size is now controlled by dragging the node's resize handle, not the inspector.
    expect(baseNodeControls.some((control) => control.kind === 'size')).toBe(false);
    expect(baseNodeControls.some((control) => control.key === 'size')).toBe(false);
    expect(labelNodeControls.some((control) => control.key === 'size')).toBe(false);
    expect(labelNodeControls.some((control) => control.key === 'shadow')).toBe(false);
    expect(labelNodeControls.some((control) => control.key === 'shadowColor')).toBe(false);
    expect(iconNodeControls.map((control) => control.key)).toEqual([
      'iconName',
      'iconColor',
      'title',
      'subtitle',
      'textColor',
      'subtitleColor',
      'titleFontSize',
      'subtitleFontSize',
      'titleBold',
      'subtitleBold',
    ]);
    // Icon/web/document/database/api/app have no visual radius — control removed.
    expect(iconNodeControls.some((control) => control.key === 'radius')).toBe(false);
    expect(websiteNodeControls.some((control) => control.key === 'radius')).toBe(false);
    expect(appNodeControls.some((control) => control.key === 'radius')).toBe(false);
    expect(documentNodeControls.some((control) => control.key === 'radius')).toBe(false);
    expect(labelIconNodeControls.map((control) => control.key)).toEqual([
      'iconName',
      'iconColor',
      'title',
      'subtitle',
      'textColor',
      'subtitleColor',
      'titleFontSize',
      'subtitleFontSize',
      'titleBold',
      'subtitleBold',
      'backgroundColor',
    ]);
    // Icon labels expose text size and a bold toggle.
    expect(labelIconNodeControls.some((control) => control.key === 'titleFontSize')).toBe(true);
    expect(labelIconNodeControls.some((control) => control.kind === 'bold')).toBe(true);
    expect(labelIconNodeControls.find((control) => control.key === 'iconName')).toMatchObject({
      kind: 'enum',
    });
    expect(labelIconNodeControls.some((control) => control.kind === 'size')).toBe(false);
    expect(websiteNodeControls.map((control) => control.key)).toContain('skeletonColor');
    expect(websiteNodeControls.some((control) => control.kind === 'size')).toBe(false);
    expect(documentNodeControls.some((control) => control.kind === 'size')).toBe(false);
    expect(documentNodeControls.map((control) => control.key)).not.toContain('borderStyle');
    expect(documentNodeControls.map((control) => control.key)).not.toContain('borderColor');
    expect(documentNodeControls.map((control) => control.key)).not.toContain('borderWidth');
    expect(documentNodeControls.map((control) => control.key)).toContain('shadow');
    expect(documentNodeControls.map((control) => control.key)).toContain('shadowColor');
    expect(documentNodeControls.map((control) => control.key)).toContain('iconColor');
  });

  it('searches local Iconify index names for icon controls', async () => {
    await expect(searchPreviewIcons('database', 5).then((icons) => icons.map((icon) => icon.fullName))).resolves.toContain(
      'material-symbols:database',
    );
  });

  it('matches literal Iconify keywords and ranks exact keyword matches first', async () => {
    const results = await searchPreviewIcons('cloud download', 12);

    expect(results.map((icon) => icon.fullName)).toContain('material-symbols:cloud-download');
    expect(results[0]?.fullName).toBe('material-symbols:cloud-download');
    await expect(searchPreviewIcons('cld dnld', 12)).resolves.toEqual([]);
  });
});
