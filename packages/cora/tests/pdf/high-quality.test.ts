import { describe, it } from 'vitest';

// Gated lane: only runs when CORA_TEST_PLAYWRIGHT=1 so default CI
// does not download Chromium. Plan 03-03 turns the todo into a real
// test against renderToPDFHighQuality. Covers EXP-03.
const enabled = process.env.CORA_TEST_PLAYWRIGHT === '1';
const d = enabled ? describe : describe.skip;

d('renderToPDFHighQuality', () => {
  it.todo('produces valid PDF via Playwright');
});
