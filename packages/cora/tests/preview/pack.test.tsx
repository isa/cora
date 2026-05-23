import { describe, expect, it } from 'vitest';

import { builtInPack } from '../../src/preview/pack/builtins.js';

describe('built-in preview pack', () => {
  it('lists all selectable built-ins without Group or Line as nodes', () => {
    const ids = builtInPack.components.map((component) => component.label);

    expect(builtInPack.id).toBe('built-ins');
    expect(ids).toEqual(
      expect.arrayContaining([
        'BoxNode',
        'LabelNode',
        'IconNode',
        'WebsiteNode',
        'PageNode',
        'AppNode',
        'DecisionNode',
        'IssueNode',
        'ShapeNode',
      ]),
    );
    expect(ids).not.toContain('Group');
    expect(ids).not.toContain('Line');
  });

  it('uses compact text defaults for label nodes', () => {
    const labelNode = builtInPack.components.find((component) => component.id === 'label');

    expect(labelNode?.defaultProps).toMatchObject({
      titleFontSize: 9,
      subtitleFontSize: 8,
    });
  });
});
