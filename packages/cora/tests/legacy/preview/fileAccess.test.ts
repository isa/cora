import { describe, expect, it } from 'vitest';

import {
  buildSuggestedSaveName,
  shouldAutosaveWorkbenchYaml,
} from '../../../src/preview/fileAccess.js';

describe('preview fileAccess', () => {
  it('normalizes diagram save names to .yml', () => {
    expect(buildSuggestedSaveName('infra.yaml')).toBe('infra.yml');
    expect(buildSuggestedSaveName('diagram.json')).toBe('diagram.yml');
    expect(buildSuggestedSaveName(undefined)).toBe('diagram.yml');
  });

  it('skips autosave when serialized YAML matches the last saved snapshot', () => {
    expect(shouldAutosaveWorkbenchYaml('version: 1\n', 'version: 1\n')).toBe(false);
    expect(shouldAutosaveWorkbenchYaml('version: 1\n', null)).toBe(true);
    expect(shouldAutosaveWorkbenchYaml('version: 2\n', 'version: 1\n')).toBe(true);
  });
});
