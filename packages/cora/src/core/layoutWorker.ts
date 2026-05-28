import { createRequire } from 'node:module';

import ELK from 'elkjs/lib/elk-api.js';
import Worker from 'web-worker';

import type { ElkNode } from 'elkjs/lib/elk-api';

const require = createRequire(import.meta.url);
let workerPath: string | undefined;

export function setElkWorkerUrl(url: string | undefined): void {
  workerPath = url;
  if (elkInstance) {
    void elkInstance.terminateWorker();
    elkInstance = null;
  }
}

function resolveWorkerPath(): string {
  if (workerPath) {
    return workerPath;
  }

  workerPath = typeof require.resolve === 'function'
    ? require.resolve('elkjs/lib/elk-worker.min.js')
    : 'elkjs/lib/elk-worker.min.js';
  return workerPath;
}

let elkInstance: InstanceType<typeof ELK> | null = null;

export function createElkWorker(): InstanceType<typeof ELK> {
  if (!elkInstance) {
    const resolvedWorkerPath = resolveWorkerPath();
    elkInstance = new ELK({
      workerUrl: resolvedWorkerPath,
      workerFactory: (url) => new Worker(url ?? resolvedWorkerPath),
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
