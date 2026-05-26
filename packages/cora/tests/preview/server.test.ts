import { describe, expect, it } from 'vitest';

import { createPreviewServerConfig } from '../../src/preview/server.js';

describe('preview server config', () => {
  it('uses explicit package-local Vite configuration with browser opening disabled in tests', () => {
    const config = createPreviewServerConfig({
      root: '/tmp/cora-preview-root',
      host: '127.0.0.1',
      port: 4173,
      open: false,
    });

    expect(config.root).toBe('/tmp/cora-preview-root');
    expect(config.configFile).toBe(false);
    expect(config.server).toMatchObject({
      host: '127.0.0.1',
      port: 4173,
      fs: {
        strict: true,
        allow: expect.arrayContaining(['/tmp/cora-preview-root']),
      },
    });
  });
});
