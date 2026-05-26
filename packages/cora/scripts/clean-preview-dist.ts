import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const previewDist = join(import.meta.dirname, '..', 'preview-dist');

await rm(previewDist, {
  force: true,
  maxRetries: 5,
  recursive: true,
  retryDelay: 100,
});
