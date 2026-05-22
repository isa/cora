import type { ComponentType } from 'react';
// Source preview uses direct source imports to keep the browser bundle free of
// server-only renderer helpers; package subpath verification is covered in Plan 04.
import { ErrorIcon } from '../../renderer/components/icons.js';
import { AppNode } from '../../renderer/components/nodes/AppNode.js';
import { BoxNode } from '../../renderer/components/nodes/BoxNode.js';
import { DecisionNode } from '../../renderer/components/nodes/DecisionNode.js';
import { IconNode } from '../../renderer/components/nodes/IconNode.js';
import { IssueNode } from '../../renderer/components/nodes/IssueNode.js';
import { LabelIconNode } from '../../renderer/components/nodes/LabelIconNode.js';
import { LabelNode } from '../../renderer/components/nodes/LabelNode.js';
import { PageNode } from '../../renderer/components/nodes/PageNode.js';
import { ShapeNode } from '../../renderer/components/nodes/ShapeNode.js';
import { WebsiteNode } from '../../renderer/components/nodes/WebsiteNode.js';
import type { PackManifest, PreviewComponentDefinition } from './types.js';
import {
  baseNodeControls,
  baseNodeDefaults,
  iconNodeControls,
  issueNodeControls,
  issueNodeDefaults,
  pageNodeControls,
  pageNodeDefaults,
  type PreviewNodeProps,
} from '../controls/defaults.js';
import { lineVariants, scenarioIds } from '../scenarios.js';

const nodeScenarios = scenarioIds;

const component = (
  id: string,
  label: string,
  family: string,
  componentImpl: PreviewComponentDefinition<PreviewNodeProps>['component'],
  defaultProps: PreviewNodeProps = baseNodeDefaults,
  controls = baseNodeControls,
): PreviewComponentDefinition<PreviewNodeProps> => ({
  id,
  label,
  family,
  component: componentImpl,
  defaultProps: { ...defaultProps, text: defaultProps.text ?? label },
  controls,
  scenarios: nodeScenarios,
});

export const builtInPack: PackManifest = {
  id: 'built-ins',
  label: 'Built-ins',
  families: [
    { id: 'basic', label: 'Basic' },
    { id: 'product', label: 'Product' },
    { id: 'logic', label: 'Logic' },
    { id: 'status', label: 'Status' },
  ],
  components: [
    component('box', 'BoxNode', 'basic', BoxNode as ComponentType<PreviewNodeProps>),
    component('label', 'LabelNode', 'basic', LabelNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      backgroundColor: 'transparent',
      borderStyle: 'none',
      text: 'LabelNode',
    }),
    component('icon', 'IconNode', 'basic', IconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      text: 'IconNode',
      icon: undefined,
      iconColor: '#2F7D7E',
    }, iconNodeControls),
    component('labelIcon', 'LabelIconNode', 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      text: 'LabelIconNode',
      iconColor: '#2F7D7E',
    }, iconNodeControls),
    component('website', 'WebsiteNode', 'product', WebsiteNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      text: 'WebsiteNode',
      backgroundColor: '#FFF7CC',
    }),
    component('page', 'PageNode', 'product', PageNode as ComponentType<PreviewNodeProps>, pageNodeDefaults, pageNodeControls),
    component('app', 'AppNode', 'product', AppNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      text: 'AppNode',
      backgroundColor: '#DCFCE7',
    }),
    component('decision', 'DecisionNode', 'logic', DecisionNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      text: 'DecisionNode',
      backgroundColor: '#FED7AA',
    }),
    component('issue', 'IssueNode', 'status', IssueNode as ComponentType<PreviewNodeProps>, issueNodeDefaults, issueNodeControls),
    component('shape', 'ShapeNode', 'basic', ShapeNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      text: 'ShapeNode',
      backgroundColor: '#CCFBF1',
    }),
  ],
  scenarios: [
    { id: 'isolated', label: 'Isolated primary' },
    { id: 'connected', label: 'Connected nodes', lineVariants },
    { id: 'grouped', label: 'Grouped primary', group: { label: 'Group context' } },
    { id: 'grouped-connected', label: 'Grouped and connected', lineVariants, group: { label: 'Group context' } },
  ],
};

export const previewIcon = ErrorIcon;
