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
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';

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
      ...catalogDefaultProps('box'),
      title: 'BoxNode',
    }),
    component('label', 'LabelNode', 'basic', LabelNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('label'),
      title: 'LabelNode',
    }, labelNodeControls),
    component('icon', 'IconNode', 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('icon'),
      title: 'IconNode',
      iconType: 'ok',
    }, iconNodeControls),
    component('labelIcon', 'LabelIconNode', 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('labelIcon'),
      title: 'LabelIconNode',
      iconType: 'ok',
    }, labelIconNodeControls),
    component('website', 'WebsiteNode', 'product', WebsiteNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('website'),
      title: 'WebsiteNode',
    }),
    component('page', 'PageNode', 'product', PageNode as ComponentType<PreviewNodeProps>, pageNodeDefaults, pageNodeControls),
    component('app', 'AppNode', 'product', AppNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('app'),
      title: 'AppNode',
    }),
    component('decision', 'DecisionNode', 'logic', DecisionNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('decision'),
      title: 'DecisionNode',
    }),
    component('issue', 'IssueNode', 'status', IssueNode as ComponentType<PreviewNodeProps>, issueNodeDefaults, issueNodeControls),
    component('shape', 'ShapeNode', 'basic', ShapeNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('shape'),
      title: 'ShapeNode',
    }),
  ],
};

export const previewIcon = ErrorIcon;
