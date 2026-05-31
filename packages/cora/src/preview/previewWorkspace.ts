import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

import {
  defaultWorkspaceDiagramPath,
  PREVIEW_DIAGRAMS_DIR,
} from './previewDevSave.js';

export { defaultWorkspaceDiagramPath, PREVIEW_DIAGRAMS_DIR };

const DIAGRAM_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);
const WORKSPACE_LIST_EXTENSIONS = new Set(['.yaml', '.yml']);

const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'preview-dist',
  '.turbo',
  'coverage',
]);

export function isDiagramFileName(name: string): boolean {
  return DIAGRAM_EXTENSIONS.has(extname(name).toLowerCase());
}

export function isWorkspaceListableDiagramFileName(name: string): boolean {
  return WORKSPACE_LIST_EXTENSIONS.has(extname(name).toLowerCase());
}

export function resolvePreviewWorkspace(startDir: string = process.cwd()): string {
  let current = resolve(startDir);
  while (true) {
    const examplesDir = joinPath(current, PREVIEW_DIAGRAMS_DIR);
    if (existsSync(examplesDir) && statSync(examplesDir).isDirectory()) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(startDir);
}

export function resolvePreviewDiagramsDirectory(
  workspaceRoot: string,
  diagramsDir: string = PREVIEW_DIAGRAMS_DIR,
): string {
  const root = resolve(workspaceRoot);
  const target = resolve(root, diagramsDir);
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Preview examples directory not found: ${target}`);
  }
  return target;
}

export function resolveDiagramPathInWorkspace(
  workspaceRoot: string,
  diagramPath: string,
  options?: { diagramsDir?: string },
): string {
  const root = resolve(workspaceRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Preview workspace is not a directory: ${root}`);
  }

  const target = resolve(root, diagramPath);
  const rel = relative(root, target);
  if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
    throw new Error('Diagram path must stay inside the preview workspace.');
  }

  const diagramsDir = options?.diagramsDir ?? PREVIEW_DIAGRAMS_DIR;
  const diagramsRoot = resolvePreviewDiagramsDirectory(root, diagramsDir);
  const relToExamples = relative(diagramsRoot, target);
  if (relToExamples.startsWith('..') || relToExamples.includes(`..${sep}`)) {
    throw new Error(`Diagram path must stay inside ${diagramsDir}/.`);
  }

  return target;
}

export function listDiagramPathsInWorkspace(
  workspaceRoot: string,
  options?: { diagramsDir?: string },
): string[] {
  const root = resolve(workspaceRoot);
  const diagramsDir = options?.diagramsDir ?? PREVIEW_DIAGRAMS_DIR;
  const diagramsRoot = resolvePreviewDiagramsDirectory(root, diagramsDir);
  const paths: string[] = [];

  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = joinPath(directory, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIR_NAMES.has(entry.name)) {
          continue;
        }
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && isWorkspaceListableDiagramFileName(entry.name)) {
        paths.push(relative(root, fullPath).split(sep).join('/'));
      }
    }
  };

  walk(diagramsRoot);
  return paths.sort((a, b) => a.localeCompare(b));
}

function joinPath(directory: string, name: string): string {
  return resolve(directory, name);
}
