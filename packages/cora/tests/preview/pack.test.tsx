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
        'LabelIconNode',
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
});
