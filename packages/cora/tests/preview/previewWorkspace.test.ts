import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  defaultWorkspaceDiagramPath,
  displayNameForWorkspaceDiagram,
  folderPathForWorkspaceDiagram,
  groupWorkspaceDiagramsByFolder,
} from '../../src/preview/previewDevSave.js';
import {
  listDiagramPathsInWorkspace,
  resolveDiagramPathInWorkspace,
  resolvePreviewWorkspace,
} from '../../src/preview/previewWorkspace.js';

describe('previewWorkspace', () => {
  it('lists YAML diagram files only under examples/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cora-ws-'));
    mkdirSync(join(dir, 'examples'));
    mkdirSync(join(dir, 'examples', 'nested'));
    writeFileSync(join(dir, 'root.yaml'), 'version: 1\n', 'utf8');
    writeFileSync(join(dir, 'examples', 'root.yaml'), 'version: 1\n', 'utf8');
    writeFileSync(join(dir, 'examples', 'notes.json'), '{}\n', 'utf8');
    writeFileSync(join(dir, 'examples', 'nested', 'child.yml'), 'version: 1\n', 'utf8');

    expect(listDiagramPathsInWorkspace(dir)).toEqual([
      'examples/nested/child.yml',
      'examples/root.yaml',
    ]);

    rmSync(dir, { recursive: true, force: true });
  });

  it('resolves the workspace to the nearest ancestor with examples/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cora-ws-'));
    mkdirSync(join(dir, 'examples'));
    mkdirSync(join(dir, 'packages', 'cora'), { recursive: true });

    expect(resolvePreviewWorkspace(join(dir, 'packages', 'cora'))).toBe(dir);

    rmSync(dir, { recursive: true, force: true });
  });

  it('defaults new diagram saves into examples/', () => {
    expect(defaultWorkspaceDiagramPath()).toBe('examples/diagram.yml');
    expect(defaultWorkspaceDiagramPath('examples', 'preview.yml')).toBe('examples/preview.yml');
  });

  it('groups workspace diagrams by folder for the picker', () => {
    expect(
      groupWorkspaceDiagramsByFolder([
        'examples/valid/box-arrows.yaml',
        'examples/invalid/missing-version.yaml',
        'examples/root.yml',
      ]),
    ).toEqual([
      {
        folder: 'examples',
        paths: ['examples/root.yml'],
      },
      {
        folder: 'examples/invalid',
        paths: ['examples/invalid/missing-version.yaml'],
      },
      {
        folder: 'examples/valid',
        paths: ['examples/valid/box-arrows.yaml'],
      },
    ]);
    expect(displayNameForWorkspaceDiagram('examples/valid/box-arrows.yaml')).toBe('box-arrows.yaml');
    expect(folderPathForWorkspaceDiagram('examples/valid/box-arrows.yaml')).toBe('examples/valid');
  });

  it('rejects paths outside examples/', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cora-ws-'));
    mkdirSync(join(dir, 'examples'));
    writeFileSync(join(dir, 'outside.yaml'), 'version: 1\n', 'utf8');

    expect(() => resolveDiagramPathInWorkspace(dir, '../outside.yaml')).toThrow(
      /inside the preview workspace/,
    );
    expect(() => resolveDiagramPathInWorkspace(dir, 'outside.yaml')).toThrow(/inside examples\//);

    rmSync(dir, { recursive: true, force: true });
  });
});
