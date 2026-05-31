import { describe, expect, it } from 'vitest';

import { builtInPack } from '../../src/preview/pack/builtins.js';
import { TAILWIND } from '../../src/renderer/themes/tailwindPalette.js';

describe('built-in preview pack', () => {
  it('lists all selectable built-ins without Group or Line as nodes', () => {
    const ids = builtInPack.components.map((component) => component.label);

    expect(builtInPack.id).toBe('built-ins');
    expect(ids).toEqual(
      expect.arrayContaining([
        'Box',
        'Label',
        'Icon',
        'Website',
        'Document',
        'API',
        'Database',
        'App',
      ]),
    );
    expect(builtInPack.components.map((component) => component.id)).toContain('document');
    expect(ids).not.toContain('Group');
    expect(ids).not.toContain('Line');
  });

  it('uses compact text defaults for label nodes', () => {
    const labelNode = builtInPack.components.find((component) => component.id === 'label');
    const labelIconNode = builtInPack.components.find((component) => component.id === 'labelIcon');
    const websiteNode = builtInPack.components.find((component) => component.id === 'website');
    const apiNode = builtInPack.components.find((component) => component.id === 'api');
    const databaseNode = builtInPack.components.find((component) => component.id === 'database');

    expect(labelNode?.defaultProps).toMatchObject({
      titleFontSize: 11,
      subtitleFontSize: 10,
    });
    expect(labelIconNode?.defaultProps).toMatchObject({
      title: '',
      subtitle: '',
    });
    expect(websiteNode?.controls.map((control) => control.key)).toContain('skeletonColor');
    expect(websiteNode?.defaultProps).toMatchObject({
      backgroundColor: TAILWIND.white,
      borderColor: 'transparent',
      borderWidth: 0,
      skeletonColor: TAILWIND.slate[400],
      size: 'lg',
    });
    expect(apiNode?.defaultProps).toMatchObject({
      backgroundColor: 'transparent',
      iconColor: TAILWIND.amber[500],
      title: 'API',
      size: 'lg',
    });
    expect(apiNode?.defaultProps).not.toHaveProperty('borderColor');
    expect(apiNode?.defaultProps).not.toHaveProperty('borderWidth');
    expect(apiNode?.defaultProps).not.toHaveProperty('borderStyle');
    expect(apiNode?.defaultProps).not.toHaveProperty('radius');
    expect(apiNode?.controls.map((control) => control.key)).not.toContain('borderColor');
    expect(apiNode?.controls.map((control) => control.key)).not.toContain('radius');
    expect(databaseNode?.defaultProps).toMatchObject({
      backgroundColor: 'transparent',
      iconColor: TAILWIND.emerald[500],
      title: 'Database',
      size: 'lg',
    });
    expect(databaseNode?.defaultProps).not.toHaveProperty('borderColor');
    expect(databaseNode?.defaultProps).not.toHaveProperty('borderWidth');
    expect(databaseNode?.defaultProps).not.toHaveProperty('borderStyle');
    expect(databaseNode?.defaultProps).not.toHaveProperty('radius');
    expect(databaseNode?.controls.map((control) => control.key)).not.toContain('borderColor');
    expect(databaseNode?.controls.map((control) => control.key)).not.toContain('radius');
  });
});
