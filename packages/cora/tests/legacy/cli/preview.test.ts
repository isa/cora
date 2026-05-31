import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';

import { registerPreviewCommand } from '../../../src/cli/commands/preview.js';

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

  it('does not call the browser opener when --no-open is passed', async () => {
    const program = new Command();
    const open = vi.fn();
    const close = vi.fn();
    registerPreviewCommand(program, {
      waitForSignal: false,
      start: async () => ({
        url: 'http://127.0.0.1:4173/',
        vite: {} as never,
        close,
      }),
      open,
    });

    await program.parseAsync(['node', 'cora', 'preview', '--no-open']);

    expect(open).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
