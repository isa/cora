import { describe, expect, it } from 'vitest';
import {
  ServerIcon,
  DatabaseIcon,
  CloudIcon,
  NetworkIcon,
  UserIcon,
  DEFAULT_ICON_REGISTRY,
  BUILTIN_ICON_REGISTRY,
} from '../../src/renderer/components/index.js';
import { runSemanticValidation } from '../../src/core/errors.js';
import type { Diagram } from '../../src/core/types.js';

describe('Default Icon Registry', () => {
  it('DEFAULT_ICON_REGISTRY has exactly 5 entries', () => {
    const keys = Object.keys(DEFAULT_ICON_REGISTRY);
    expect(keys.length).toBe(5);
    expect(keys).toContain('server');
    expect(keys).toContain('database');
    expect(keys).toContain('cloud');
    expect(keys).toContain('network');
    expect(keys).toContain('user');
  });

  it('BUILTIN_ICON_REGISTRY has exactly 9 entries', () => {
    const keys = Object.keys(BUILTIN_ICON_REGISTRY);
    expect(keys.length).toBe(9);
    expect(keys).toContain('server');
    expect(keys).toContain('database');
    expect(keys).toContain('cloud');
    expect(keys).toContain('network');
    expect(keys).toContain('user');
    expect(keys).toContain('bug');
    expect(keys).toContain('warning');
    expect(keys).toContain('error');
    expect(keys).toContain('stop');
  });

  it('Every entry in both registries is a function', () => {
    for (const key of Object.keys(DEFAULT_ICON_REGISTRY)) {
      expect(typeof DEFAULT_ICON_REGISTRY[key]).toBe('function');
    }
    for (const key of Object.keys(BUILTIN_ICON_REGISTRY)) {
      expect(typeof BUILTIN_ICON_REGISTRY[key]).toBe('function');
    }
  });
});

describe('Default Icon Semantic Validation', () => {
  it('passes validation for valid default provider and services', () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      nodes: [
        { id: 'n1', label: 'Server', provider: 'default', service: 'server' },
        { id: 'n2', label: 'DB', provider: 'default', service: 'database' },
      ],
      edges: [],
    };
    const errors = runSemanticValidation(diagram);
    expect(errors).toEqual([]);
  });

  it('fails validation when service is unknown under default provider', () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      nodes: [
        { id: 'n1', label: 'Invalid', provider: 'default', service: 'nonexistent' },
      ],
      edges: [],
    };
    const errors = runSemanticValidation(diagram);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('UNKNOWN_SERVICE');
    expect(errors[0].path).toBe('/diagram/nodes/0/service');
  });

  it('fails validation when provider is unknown/not installed (e.g., aws)', () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      nodes: [
        { id: 'n1', label: 'AWS Server', provider: 'aws', service: 'ec2' },
      ],
      edges: [],
    };
    const errors = runSemanticValidation(diagram);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('MISSING_EXTENSION');
    expect(errors[0].path).toBe('/diagram/nodes/0/provider');
  });

  it('fails validation when service is specified but provider is missing', () => {
    const diagram: Diagram = {
      kind: 'box-arrows',
      nodes: [
        { id: 'n1', label: 'Database', service: 'database' },
      ],
      edges: [],
    };
    const errors = runSemanticValidation(diagram);
    expect(errors.length).toBe(1);
    expect(errors[0].code).toBe('UNKNOWN_SERVICE');
    expect(errors[0].path).toBe('/diagram/nodes/0/service');
  });
});

describe('Default Icon Component Smoke Tests', () => {
  const icons = [ServerIcon, DatabaseIcon, CloudIcon, NetworkIcon, UserIcon];

  it('each icon renders without throwing and returns a truthy value', () => {
    for (const Icon of icons) {
      const result = Icon({ size: 48, color: '#000000', title: 'Test Icon' });
      expect(result).toBeTruthy();
    }
  });
});
