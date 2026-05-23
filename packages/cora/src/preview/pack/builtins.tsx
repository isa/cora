import type { ComponentType } from 'react';
// Source preview uses direct source imports to keep the browser bundle free of
// server-only renderer helpers; package subpath verification is covered in Plan 04.
import { ErrorIcon } from '../../renderer/components/icons.js';
import { AppNode } from '../../renderer/components/nodes/AppNode.js';
import { BoxNode } from '../../renderer/components/nodes/BoxNode.js';
import { DecisionNode } from '../../renderer/components/nodes/DecisionNode.js';
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
  labelNodeControls,
  labelIconNodeControls,
  issueNodeControls,
  issueNodeDefaults,
  pageNodeControls,
  pageNodeDefaults,
  type PreviewNodeProps,
} from '../controls/defaults.js';

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
  defaultProps: { ...defaultProps, title: defaultProps.title ?? defaultProps.text ?? label },
  controls,
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
    component('box', 'BoxNode', 'basic', BoxNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      backgroundColor: '#FFFFFF',
      borderColor: '#0A0A0A',
      textColor: '#0A0A0A',
      radius: 14,
      size: { width: 220, height: 56 },
    }),
    component('label', 'LabelNode', 'basic', LabelNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      backgroundColor: '#FFFFFF',
      borderStyle: 'none',
      titleFontSize: 9,
      subtitleFontSize: 8,
      title: 'LabelNode',
    }, labelNodeControls),
    component('icon', 'IconNode', 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      title: '',
      subtitle: undefined,
      backgroundColor: 'transparent',
      borderStyle: 'none',
      size: 'md',
      iconType: 'ok',
      iconColor: '#2F7D7E',
    }, iconNodeControls),
    component('labelIcon', 'LabelIconNode', 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      title: '',
      subtitle: undefined,
      backgroundColor: '#FFFFFF',
      borderStyle: 'none',
      size: 'md',
      iconType: 'ok',
      iconColor: '#2F7D7E',
    }, labelIconNodeControls),
    component('website', 'WebsiteNode', 'product', WebsiteNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      title: 'WebsiteNode',
      backgroundColor: '#FFF7CC',
      size: { width: 120, height: 164 },
    }),
    component('page', 'PageNode', 'product', PageNode as ComponentType<PreviewNodeProps>, pageNodeDefaults, pageNodeControls),
    component('app', 'AppNode', 'product', AppNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      title: 'AppNode',
      backgroundColor: '#DCFCE7',
      size: { width: 120, height: 164 },
    }),
    component('decision', 'DecisionNode', 'logic', DecisionNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      title: 'DecisionNode',
      backgroundColor: '#FED7AA',
    }),
    component('issue', 'IssueNode', 'status', IssueNode as ComponentType<PreviewNodeProps>, issueNodeDefaults, issueNodeControls),
    component('shape', 'ShapeNode', 'basic', ShapeNode as ComponentType<PreviewNodeProps>, {
      ...baseNodeDefaults,
      title: 'ShapeNode',
      backgroundColor: '#CCFBF1',
    }),
  ],
};

export const previewIcon = ErrorIcon;
