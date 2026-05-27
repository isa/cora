import type { ComponentType } from 'react';
// Source preview uses direct source imports to keep the browser bundle free of
// server-only renderer helpers; package subpath verification is covered in Plan 04.
import { ErrorIcon } from '../../renderer/components/icons.js';
import { AppNode } from '../../renderer/components/nodes/AppNode.js';
import { BoxNode } from '../../renderer/components/nodes/BoxNode.js';
import { IconNode } from '../../renderer/components/nodes/IconNode.js';
import { LabelIconNode } from '../../renderer/components/nodes/LabelIconNode.js';
import { LabelNode } from '../../renderer/components/nodes/LabelNode.js';
import { PageNode } from '../../renderer/components/nodes/PageNode.js';
import { WebsiteNode } from '../../renderer/components/nodes/WebsiteNode.js';
import type { PackManifest, PreviewComponentDefinition } from './types.js';
import {
  baseNodeControls,
  baseNodeDefaults,
  iconNodeControls,
  labelNodeControls,
  labelIconNodeControls,
  pageNodeControls,
  pageNodeDefaults,
  appNodeControls,
  appNodeDefaults,
  websiteNodeControls,
  type PreviewNodeProps,
} from '../controls/defaults.js';
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';
import { WEBSITE_SIZE_PRESETS } from '../../renderer/components/styles.js';
import { displayNameForComponent } from './displayNames.js';

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
  ],
  components: [
    component('box', displayNameForComponent('box'), 'basic', BoxNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('box'),
      title: 'Box',
    }),
    component('label', displayNameForComponent('label'), 'basic', LabelNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('label'),
      title: 'Label',
    }, labelNodeControls),
    component('icon', displayNameForComponent('icon'), 'basic', IconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('icon'),
      title: 'Icon',
      subtitle: '',
      iconName: 'material-symbols:database',
      size: { width: 160, height: 128 },
    }, iconNodeControls),
    component('labelIcon', displayNameForComponent('labelIcon'), 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('labelIcon'),
      title: '',
      subtitle: '',
      iconName: 'material-symbols:database',
      size: 'md',
    }, labelIconNodeControls),
    component('website', displayNameForComponent('website'), 'product', WebsiteNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('website'),
      title: 'Website',
      size: WEBSITE_SIZE_PRESETS.lg,
    }, websiteNodeControls),
    component('page', displayNameForComponent('page'), 'product', PageNode as ComponentType<PreviewNodeProps>, pageNodeDefaults, pageNodeControls),
    component('app', displayNameForComponent('app'), 'product', AppNode as ComponentType<PreviewNodeProps>, appNodeDefaults, appNodeControls),
  ],
};

export const previewIcon = ErrorIcon;
