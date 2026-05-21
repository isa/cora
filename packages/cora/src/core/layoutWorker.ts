import { createRequire } from 'node:module';

import ELK from 'elkjs/lib/elk-api.js';
import Worker from 'web-worker';

import type { ElkNode } from 'elkjs/lib/elk-api';

const require = createRequire(import.meta.url);
const workerPath = require.resolve('elkjs/lib/elk-worker.min.js');

let elkInstance: InstanceType<typeof ELK> | null = null;

export function createElkWorker(): InstanceType<typeof ELK> {
  if (!elkInstance) {
    elkInstance = new ELK({
      workerUrl: workerPath,
      workerFactory: (url) => new Worker(url ?? workerPath),
    });
  }
  return elkInstance;
}

export async function runElkLayout(graph: ElkNode): Promise<ElkNode> {
  const elk = createElkWorker();
  return elk.layout(graph);
}

export async function terminateElkWorker(): Promise<void> {
  if (elkInstance) {
    await elkInstance.terminateWorker();
    elkInstance = null;
  }
}
