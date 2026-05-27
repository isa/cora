import { describe, expect, it } from 'vitest';
import { LOOK } from '../../src/renderer/themes/lookTokens.js';
import { TAILWIND } from '../../src/renderer/themes/tailwindPalette.js';
import { catalogDefaultProps } from '../../src/renderer/themes/componentDefaults.js';
import { defaultTheme } from '../../src/renderer/themes/default.js';
import type { DiagramComponent } from '../../layout-ir.js';

describe('Design Tokens Contract', () => {
  it('defines correct edge width', () => {
    expect(LOOK.edge.width).toBe(2);
  });

  it('defines correct border radius', () => {
    expect(LOOK.radius.md).toBe(8);
  });

  it('defines correct default border color matching slate-300', () => {
    expect(LOOK.border.default).toBe(TAILWIND.slate[300]);
  });

  it('contains contrast pair strings', () => {
    expect(TAILWIND.slate[800]).toBeTruthy();
    expect(TAILWIND.white).toBeTruthy();
    expect(typeof TAILWIND.slate[800]).toBe('string');
    expect(typeof TAILWIND.white).toBe('string');
  });

  it('verifies catalogDefaultProps("box") attributes', () => {
    const box = catalogDefaultProps('box');
    expect(box.radius).toBe(8);
    expect(box.shadow).toBe('none');
  });

  it('verifies catalogDefaultProps("label") attributes', () => {
    const label = catalogDefaultProps('label');
    expect(label.titleFontSize).toBe(11);
    expect(label.radius).toBe(12);
    expect(label).not.toHaveProperty('shadow');
  });

  it('uses neutral website defaults', () => {
    const website = catalogDefaultProps('website');
    expect(website.backgroundColor).toBe(TAILWIND.white);
    expect(website.borderColor).toBe(TAILWIND.slate[700]);
    expect(website.skeletonColor).toBe(TAILWIND.slate[200]);
    expect(defaultTheme.shapes.website?.fill).toBe(TAILWIND.white);
    expect(defaultTheme.shapes.website?.stroke).toBe(TAILWIND.slate[700]);
  });

  it('uses neutral labelIcon defaults', () => {
    const labelIcon = catalogDefaultProps('labelIcon');
    expect(labelIcon.backgroundColor).toBe('transparent');
    expect(labelIcon.borderStyle).toBe('none');
    expect(labelIcon.borderWidth).toBe(0);
    expect(labelIcon.radius).toBe(0);
    expect(labelIcon).not.toHaveProperty('shadow');
  });

  it('verifies shadow defaults only exist for shadow-capable component kinds', () => {
    const kinds: DiagramComponent[] = [
      'box',
      'website',
      'document',
      'app',
    ];
    for (const kind of kinds) {
      const props = catalogDefaultProps(kind);
      expect(props.backgroundColor).toBeDefined();
      expect(props.shadow).toBe('none');
    }

    for (const kind of ['label', 'icon', 'labelIcon'] satisfies DiagramComponent[]) {
      const props = catalogDefaultProps(kind);
      expect(props.backgroundColor).toBeDefined();
      expect(props).not.toHaveProperty('shadow');
      expect(props).not.toHaveProperty('shadowColor');
    }
  });

  it('verifies defaultTheme values', () => {
    expect(defaultTheme.edge.strokeWidth).toBe(2);
    expect(defaultTheme.shadowBlur).toBe(0);
    expect(defaultTheme.nodeLabel.fontSize).toBe(12);
    expect(defaultTheme.edgeLabel.fontSize).toBe(10);
    expect(defaultTheme.background).toBe(TAILWIND.slate[50]);

    for (const key of Object.keys(defaultTheme.shapes)) {
      const shape = defaultTheme.shapes[key]!;
      expect(shape).not.toHaveProperty('shadow');
    }
  });
});
