import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve, sep } from 'node:path';

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

export function resolveDiagramPathInWorkspace(workspaceRoot: string, diagramPath: string): string {
  const root = resolve(workspaceRoot);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Preview workspace is not a directory: ${root}`);
  }

  const target = resolve(root, diagramPath);
  const rel = relative(root, target);
  if (rel.startsWith('..') || rel.includes(`..${sep}`)) {
    throw new Error('Diagram path must stay inside the preview workspace.');
  }

  return target;
}

export function listDiagramPathsInWorkspace(workspaceRoot: string): string[] {
  const root = resolve(workspaceRoot);
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

  walk(root);
  return paths.sort((a, b) => a.localeCompare(b));
}

function joinPath(directory: string, name: string): string {
  return resolve(directory, name);
}
