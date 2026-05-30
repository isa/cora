import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

import { displayNameForWorkspaceDiagram } from './previewDevSave.js';
import {
  listDiagramPathsInWorkspace,
  resolveDiagramPathInWorkspace,
} from './previewWorkspace.js';

export interface PreviewSavePluginOptions {
  /** Absolute workspace root; diagrams in this tree may be read and written. */
  workspace: string;
  /** Optional diagram path relative to workspace to open on startup. */
  openPath?: string;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolvePromise, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolvePromise(text ? JSON.parse(text) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readDiagramQueryPath(req: IncomingMessage): string | null {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.searchParams.get('path');
  return path && path.length > 0 ? path : null;
}

export function createPreviewSaveMiddleware(options: PreviewSavePluginOptions) {
  const workspaceRoot = resolve(options.workspace);
  const openPath = options.openPath;

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split('?')[0];

    if (url === '/__cora/preview/config' && req.method === 'GET') {
      sendJson(res, 200, {
        workspace: workspaceRoot,
        openPath: openPath ?? null,
      });
      return;
    }

    if (url === '/__cora/preview/diagrams' && req.method === 'GET') {
      try {
        sendJson(res, 200, { paths: listDiagramPathsInWorkspace(workspaceRoot) });
      } catch (error) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : 'Could not list workspace diagrams.',
        });
      }
      return;
    }

    if (url === '/__cora/preview/source' && req.method === 'GET') {
      const diagramPath = readDiagramQueryPath(req) ?? openPath;
      if (!diagramPath) {
        sendJson(res, 400, { error: 'Missing diagram path query parameter.' });
        return;
      }

      try {
        const absolutePath = resolveDiagramPathInWorkspace(workspaceRoot, diagramPath);
        const content = readFileSync(absolutePath, 'utf8');
        sendJson(res, 200, {
          path: diagramPath,
          name: displayNameForWorkspaceDiagram(diagramPath),
          content,
        });
      } catch (error) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : 'Could not read diagram file.',
        });
      }
      return;
    }

    if (url === '/__cora/preview/save' && req.method === 'POST') {
      try {
        const body = (await readJsonBody(req)) as { path?: string; yaml?: string };
        const diagramPath = body.path ?? openPath;
        if (!diagramPath) {
          sendJson(res, 400, { error: 'Request body must include a diagram path.' });
          return;
        }
        if (typeof body.yaml !== 'string') {
          sendJson(res, 400, { error: 'Request body must include a yaml string.' });
          return;
        }

        const absolutePath = resolveDiagramPathInWorkspace(workspaceRoot, diagramPath);
        writeFileSync(absolutePath, body.yaml, 'utf8');
        sendJson(res, 200, {
          path: diagramPath,
          name: displayNameForWorkspaceDiagram(diagramPath),
        });
      } catch (error) {
        sendJson(res, 500, {
          error: error instanceof Error ? error.message : 'Could not save diagram file.',
        });
      }
      return;
    }

    next();
  };
}

export function previewSavePlugin(options: PreviewSavePluginOptions): Plugin {
  const workspaceRoot = resolve(options.workspace);

  return {
    name: 'cora-preview-save',
    transformIndexHtml(html) {
      const injection = `<script>window.__CORA_PREVIEW_WORKSPACE__=${JSON.stringify(workspaceRoot)};</script>`;
      return html.replace('</head>', `${injection}</head>`);
    },
    configureServer(server) {
      server.middlewares.use(createPreviewSaveMiddleware(options));
    },
  };
}
