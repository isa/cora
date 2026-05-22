import { describe, expect, it } from 'vitest';

import {
  baseNodeControls,
  connectionControls,
  issueNodeControls,
  pageNodeControls,
} from '../../src/preview/controls/defaults.js';

describe('preview controls', () => {
  it('constrains enum controls for PageNode.type, IssueNode.icon, borderStyle, lineStyle, startMarker, and endMarker', () => {
    expect(pageNodeControls.find((control) => control.label === 'PageNode.type')).toMatchObject({
      kind: 'enum',
      options: ['landing', 'form', 'content', 'profile', 'settings'],
    });
    expect(issueNodeControls.find((control) => control.label === 'IssueNode.icon')).toMatchObject({
      kind: 'enum',
      options: ['bug', 'warning', 'error', 'stop'],
    });
    expect(baseNodeControls.find((control) => control.key === 'borderStyle')).toMatchObject({
      kind: 'enum',
      options: ['none', 'solid', 'dashed', 'dotted'],
    });
    expect(connectionControls.find((control) => control.key === 'lineStyle')).toMatchObject({
      kind: 'enum',
      options: ['solid', 'dashed', 'dotted'],
    });
    expect(connectionControls.find((control) => control.key === 'startMarker')).toMatchObject({
      kind: 'enum',
      options: ['none', 'arrow', 'circle', 'filledCircle'],
    });
    expect(connectionControls.find((control) => control.key === 'endMarker')).toMatchObject({
      kind: 'enum',
      options: ['none', 'arrow', 'circle', 'filledCircle'],
    });
  });

  it('defines bounded number controls and size controls', () => {
    expect(baseNodeControls.find((control) => control.kind === 'number')).toMatchObject({
      min: expect.any(Number),
      max: expect.any(Number),
      step: expect.any(Number),
    });
    expect(baseNodeControls.find((control) => control.kind === 'size')).toMatchObject({
      presets: ['sm', 'md', 'lg', 'xl', 'xxl'],
      explicit: { width: 176, height: 72 },
    });
  });
});
