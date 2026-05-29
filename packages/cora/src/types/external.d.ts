declare module 'fontkit' {
  export interface Font {
    unitsPerEm: number;
    layout(text: string): { advanceWidth: number };
  }

  export function openSync(path: string): Font;
}

declare module 'elkjs/lib/elk-api.js' {
  import type { ElkNode } from 'elkjs/lib/elk-api';

  export default class ELK {
    constructor(options?: {
      workerUrl?: string;
      workerFactory?: (url?: string) => Worker;
    });
    layout(graph: ElkNode): Promise<ElkNode>;
    terminateWorker(): Promise<void>;
  }
}

declare module 'elkjs/lib/elk-worker.min.js?url' {
  const value: string;
  export default value;
}
