import { describe, expect, it } from 'vitest';

import {
  iconReferenceForNode,
  parseIconReference,
  resolveIconData,
  searchIconReferences,
} from '../../../src/core/iconify.js';
import { validateDocument } from '../../../src/core/index.js';

describe('Iconify icon resolution', () => {
  it('resolves explicit Iconify ids from bundled icon data', () => {
    expect(parseIconReference('material-symbols:database')).toEqual({
      prefix: 'material-symbols',
      name: 'database',
      fullName: 'material-symbols:database',
    });
    expect(resolveIconData('material-symbols:database')).toMatchObject({
      body: expect.stringContaining('currentColor'),
    });
    expect(resolveIconData('basil:document-outline')).toMatchObject({
      body: expect.stringContaining('currentColor'),
    });
  });

  it('keeps provider/service compatibility for default icons', () => {
    expect(iconReferenceForNode({ provider: 'default', service: 'database' })).toBe(
      'material-symbols:database',
    );
  });

  it('searches bundled icon names by plain terms', () => {
    expect(searchIconReferences('database', 5).map((icon) => icon.fullName)).toContain(
      'material-symbols:database',
    );
  });

  it('validates icon references without requiring local SVG assets', () => {
    const valid = validateDocument({
      version: 1,
      diagram: {
        kind: 'box-arrows',
        nodes: [
          {
            id: 'archive',
            label: 'Archive',
            component: 'icon',
            icon: 'material-symbols:database',
          },
        ],
        edges: [],
      },
    });

    expect(valid).toEqual([]);

    const invalid = validateDocument({
      version: 1,
      diagram: {
        kind: 'box-arrows',
        nodes: [
          {
            id: 'archive',
            label: 'Archive',
            component: 'icon',
            icon: 'missing-set:database',
          },
        ],
        edges: [],
      },
    });

    expect(invalid).toMatchObject([
      {
        code: 'MISSING_EXTENSION',
        path: '/diagram/nodes/0/icon',
      },
    ]);
  });
});
