import { describe, expect, it } from 'vitest';
import { LOOK } from '../../../src/renderer/themes/lookTokens.js';
import { TAILWIND } from '../../../src/renderer/themes/tailwindPalette.js';
import { catalogDefaultProps } from '../../../src/renderer/themes/componentDefaults.js';
import { defaultTheme } from '../../../src/renderer/themes/default.js';
import { resolveDiagramTheme } from '../../../src/renderer/themes/registry.js';
import type { DiagramComponent } from '../../../layout-ir.js';

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

  it('uses neutral website catalog defaults and themed website shapes', () => {
    const website = catalogDefaultProps('website');
    expect(website.backgroundColor).toBe(TAILWIND.white);
    expect(website.borderColor).toBe('transparent');
    expect(website.borderWidth).toBe(0);
    expect(website.skeletonColor).toBe(TAILWIND.slate[400]);
    const themed = resolveDiagramTheme('folio-light');
    expect(themed.shapes.website?.fill).toMatch(/^#/);
    expect(themed.shapes.website?.stroke).toBe('none');
    expect(themed.shapes.website?.skeletonColor).toMatch(/^#/);
  });

  it('uses neutral api catalog defaults and themed api shapes', () => {
    const api = catalogDefaultProps('api');
    expect(api.backgroundColor).toBe('transparent');
    expect(api.iconColor).toBe(TAILWIND.amber[500]);
    expect(api).not.toHaveProperty('borderColor');
    expect(api).not.toHaveProperty('borderWidth');
    expect(api).not.toHaveProperty('borderStyle');
    expect(api).not.toHaveProperty('radius');
    const themed = resolveDiagramTheme('folio-light');
    expect(themed.shapes.api?.fill).toBe('none');
    expect(themed.shapes.api?.iconColor).toMatch(/^#/);
  });

  it('uses neutral database catalog defaults and themed database shapes', () => {
    const database = catalogDefaultProps('database');
    expect(database.backgroundColor).toBe('transparent');
    expect(database.iconColor).toBe(TAILWIND.emerald[500]);
    expect(database).not.toHaveProperty('borderColor');
    expect(database).not.toHaveProperty('borderWidth');
    expect(database).not.toHaveProperty('borderStyle');
    expect(database).not.toHaveProperty('radius');
    const themed = resolveDiagramTheme('folio-light');
    expect(themed.shapes.database?.fill).toBe('none');
    expect(themed.shapes.database?.iconColor).toMatch(/^#/);
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
    const props = catalogDefaultProps('box');
    expect(props.backgroundColor).toBeDefined();
    expect(props.shadow).toBe('none');

    for (const kind of ['label', 'icon', 'labelIcon', 'website', 'document', 'api', 'database', 'app'] satisfies DiagramComponent[]) {
      const componentProps = catalogDefaultProps(kind);
      expect(componentProps.backgroundColor).toBeDefined();
      expect(componentProps).not.toHaveProperty('shadow');
      expect(componentProps).not.toHaveProperty('shadowColor');
    }
  });

  it('verifies defaultTheme values', () => {
    expect(defaultTheme.edge.strokeWidth).toBe(1.5);
    expect(defaultTheme.shadowBlur).toBe(0);
    expect(defaultTheme.nodeLabel.fontSize).toBe(12);
    expect(defaultTheme.edgeLabel.fontSize).toBe(10);
    expect(defaultTheme.fontFamily).toBe('Source Sans 3');
    expect(defaultTheme.background).toMatch(/^#/);
    expect(resolveDiagramTheme('folio-light').background).toBe(defaultTheme.background);

    for (const key of Object.keys(defaultTheme.shapes)) {
      const shape = defaultTheme.shapes[key]!;
      expect(shape).not.toHaveProperty('shadow');
    }
  });
});
