import { Command } from 'commander';
import { describe, expect, it } from 'vitest';

import { registerPreviewCommand } from '../../src/cli/commands/preview.js';

describe('preview command', () => {
  it('registers preview with host, port, and no-open options', () => {
    const program = new Command();
    registerPreviewCommand(program, {
      waitForSignal: false,
      start: async () => ({
        url: 'http://127.0.0.1:4173/',
        vite: {} as never,
        close: async () => {},
      }),
      open: async () => {},
    });

    const command = program.commands.find((item) => item.name() === 'preview');

    expect(command).toBeDefined();
    expect(command?.helpInformation()).toContain('--no-open');
    expect(command?.helpInformation()).toContain('--host');
    expect(command?.helpInformation()).toContain('--port');
  });
});
