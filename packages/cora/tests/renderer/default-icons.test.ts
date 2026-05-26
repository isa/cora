import { describe, expect, it } from 'vitest';
import { createElement } from 'react';

import { runSemanticValidation } from '../../src/core/errors.js';
import type { Diagram } from '../../src/core/types.js';
import {
  CloudIcon,
  DatabaseIcon,
  NetworkIcon,
  ServerIcon,
  UserIcon,
  getIconPack,
  isKnownServiceInPack,
  listIconPacks,
  resolveIcon,
} from '../../src/renderer/components/defaultIcons.js';

describe('default icon pack', () => {
  it('loads bundled default pack with thousands of icons', () => {
    const packs = listIconPacks(true);
    expect(packs.some((pack) => pack.manifest.id === 'default')).toBe(true);

    const defaultPack = getIconPack('default');
    expect(defaultPack).toBeDefined();
    expect(Object.keys(defaultPack!.manifest.icons).length).toBeGreaterThan(1000);
    expect(defaultPack!.manifest.categories.length).toBeGreaterThan(0);
  });

  it('resolveIcon returns components for known slugs and aliases', () => {
    expect(typeof resolveIcon('default', 'database')).toBe('function');
    expect(typeof resolveIcon('default', 'server')).toBe('function');
    expect(isKnownServiceInPack('default', 'server')).toBe(true);
    expect(isKnownServiceInPack('default', 'dns')).toBe(true);
    expect(isKnownServiceInPack('default', 'nonexistent-slug-xyz')).toBe(false);
  });
});

describe('default provider semantic validation', () => {
  const baseDiagram: Diagram = {
    kind: 'box-arrows',
    direction: 'right',
    nodes: [],
    edges: [],
    groups: [],
  };

  it('accepts provider default with known services', () => {
    for (const service of ['database', 'dns'] as const) {
      const errors = runSemanticValidation({
        ...baseDiagram,
        nodes: [
          {
            id: 'n1',
            label: 'Node',
            component: 'icon',
            provider: 'default',
            service,
          },
        ],
      });
      expect(errors).toEqual([]);
    }
  });

  it('rejects unknown service under default provider', () => {
    const errors = runSemanticValidation({
      ...baseDiagram,
      nodes: [
        {
          id: 'n1',
          label: 'Node',
          provider: 'default',
          service: 'nonexistent-slug-xyz',
        },
      ],
    });
    expect(errors.some((error) => error.code === 'UNKNOWN_SERVICE')).toBe(true);
  });

  it('still requires extensions for other providers', () => {
    const errors = runSemanticValidation({
      ...baseDiagram,
      nodes: [
        {
          id: 'n1',
          label: 'Node',
          provider: 'aws',
          service: 'lambda',
        },
      ],
    });
    expect(errors.some((error) => error.code === 'MISSING_EXTENSION')).toBe(true);
  });

  it('rejects service without provider', () => {
    const errors = runSemanticValidation({
      ...baseDiagram,
      nodes: [
        {
          id: 'n1',
          label: 'Node',
          service: 'database',
        },
      ],
    });
    expect(errors.some((error) => error.code === 'UNKNOWN_SERVICE')).toBe(true);
  });
});

describe('default icon components', () => {
  const icons = [ServerIcon, DatabaseIcon, CloudIcon, NetworkIcon, UserIcon];

  it.each(icons)('renders without throwing', (Icon) => {
    const node = Icon({ size: 48, color: '#000000' });
    expect(node).toBeTruthy();
    expect(createElement(Icon, { size: 48, color: '#000000' })).toBeTruthy();
  });
});
