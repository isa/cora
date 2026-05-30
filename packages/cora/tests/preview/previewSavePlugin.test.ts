import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer as createHttpServer, type Server } from 'node:http';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { createPreviewSaveMiddleware } from '../../src/preview/previewSavePlugin.js';

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (typeof address === 'object' && address !== null) {
        resolve(address.port);
        return;
      }
      reject(new Error('Preview test server did not expose a port.'));
    });
    server.once('error', reject);
  });
}

describe('previewSavePlugin', () => {
  it('reads and writes diagrams anywhere under the workspace root', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cora-preview-save-'));
    mkdirSync(join(dir, 'nested'));
    const diagramPath = join(dir, 'nested', 'diagram.yaml');
    writeFileSync(diagramPath, 'version: 1\n', 'utf8');

    const middleware = createPreviewSaveMiddleware({ workspace: dir });
    const server = createHttpServer((req, res) => {
      void middleware(req, res, () => {
        res.statusCode = 404;
        res.end();
      });
    });

    const port = await listen(server);
    try {
      const base = `http://127.0.0.1:${port}`;

      const list = await fetch(`${base}/__cora/preview/diagrams`);
      expect(list.ok).toBe(true);
      const listJson = (await list.json()) as { paths: string[] };
      expect(listJson.paths).toContain('nested/diagram.yaml');

      const source = await fetch(`${base}/__cora/preview/source?path=nested/diagram.yaml`);
      expect(source.ok).toBe(true);

      const save = await fetch(`${base}/__cora/preview/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'nested/diagram.yaml',
          yaml: 'version: 1\ndiagram:\n  kind: box-arrows\n  nodes: []\n  edges: []\n',
        }),
      });
      expect(save.ok).toBe(true);
      expect(readFileSync(diagramPath, 'utf8')).toContain('kind: box-arrows');
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
