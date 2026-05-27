import { describe, expect, it } from 'vitest';
import { builtInPack } from '../../src/preview/pack/builtins.js';
import { catalogDefaultProps } from '../../src/renderer/themes/componentDefaults.js';
import type { DiagramComponent } from '../../layout-ir.js';

describe('Preview and Renderer Look Sync', () => {
  const STYLE_KEYS = [
    'backgroundColor',
    'borderColor',
    'borderWidth',
    'borderStyle',
    'radius',
    'textColor',
    'subtitleColor',
    'titleFontSize',
    'subtitleFontSize',
    'shadow',
    'iconColor',
  ];

  it('ensures every built-in pack component style matches catalogDefaultProps exactly', () => {
    for (const component of builtInPack.components) {
      const id = component.id as DiagramComponent;
      const defaults = catalogDefaultProps(id);

      // Extract style keys that exist in either defaultProps or defaults
      const expectedProps: Record<string, any> = {};
      const actualProps: Record<string, any> = {};

      for (const key of STYLE_KEYS) {
        if (key in defaults || key in component.defaultProps) {
          expectedProps[key] = defaults[key];
          actualProps[key] = component.defaultProps[key];
        }
      }

      expect(actualProps).toEqual(expectedProps);
    }
  });
});
