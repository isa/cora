import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  listDiagramPathsInWorkspace,
  resolveDiagramPathInWorkspace,
} from '../../../src/preview/previewWorkspace.js';
import {
  displayNameForWorkspaceDiagram,
  folderPathForWorkspaceDiagram,
  groupWorkspaceDiagramsByFolder,
} from '../../../src/preview/previewDevSave.js';

describe('previewWorkspace', () => {
  it('lists diagram files in nested workspace folders', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cora-ws-'));
    writeFileSync(join(dir, 'root.yaml'), 'version: 1\n', 'utf8');
    writeFileSync(join(dir, 'notes.json'), '{}\n', 'utf8');
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'nested', 'child.yml'), 'version: 1\n', 'utf8');

    expect(listDiagramPathsInWorkspace(dir)).toEqual(['nested/child.yml', 'root.yaml']);

    rmSync(dir, { recursive: true, force: true });
  });

  it('groups workspace diagrams by folder for the picker', () => {
    expect(
      groupWorkspaceDiagramsByFolder([
        'fixtures/valid/box-arrows.yaml',
        'fixtures/invalid/missing-version.yaml',
        'root.yml',
      ]),
    ).toEqual([
      {
        folder: '',
        paths: ['root.yml'],
      },
      {
        folder: 'fixtures/invalid',
        paths: ['fixtures/invalid/missing-version.yaml'],
      },
      {
        folder: 'fixtures/valid',
        paths: ['fixtures/valid/box-arrows.yaml'],
      },
    ]);
    expect(displayNameForWorkspaceDiagram('fixtures/valid/box-arrows.yaml')).toBe('box-arrows.yaml');
    expect(folderPathForWorkspaceDiagram('fixtures/valid/box-arrows.yaml')).toBe('fixtures/valid');
  });

  it('rejects paths that escape the workspace root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cora-ws-'));
    expect(() => resolveDiagramPathInWorkspace(dir, '../outside.yaml')).toThrow(
      /inside the preview workspace/,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});
