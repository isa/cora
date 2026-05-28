import type { ComponentType } from 'react';
// Source preview uses direct source imports to keep the browser bundle free of
// server-only renderer helpers; package subpath verification is covered in Plan 04.
import { ErrorIcon } from '../../renderer/components/icons.js';
import { ApiNode } from '../../renderer/components/nodes/ApiNode.js';
import { AppNode } from '../../renderer/components/nodes/AppNode.js';
import { BoxNode } from '../../renderer/components/nodes/BoxNode.js';
import { DatabaseNode } from '../../renderer/components/nodes/DatabaseNode.js';
import { DocumentNode } from '../../renderer/components/nodes/DocumentNode.js';
import { IconNode } from '../../renderer/components/nodes/IconNode.js';
import { LabelIconNode } from '../../renderer/components/nodes/LabelIconNode.js';
import { LabelNode } from '../../renderer/components/nodes/LabelNode.js';
import { WebsiteNode } from '../../renderer/components/nodes/WebsiteNode.js';
import type { PackManifest, PreviewComponentDefinition } from './types.js';
import {
  baseNodeControls,
  baseNodeDefaults,
  iconNodeControls,
  labelNodeControls,
  labelIconNodeControls,
  documentNodeControls,
  documentNodeDefaults,
  apiNodeControls,
  apiNodeDefaults,
  databaseNodeControls,
  databaseNodeDefaults,
  appNodeControls,
  appNodeDefaults,
  websiteNodeControls,
  type PreviewNodeProps,
} from '../controls/defaults.js';
import { catalogDefaultProps } from '../../renderer/themes/componentDefaults.js';
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
      size: 'lg',
    }, iconNodeControls),
    component('labelIcon', displayNameForComponent('labelIcon'), 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('labelIcon'),
      title: '',
      subtitle: '',
      iconName: 'material-symbols:database',
      size: 'lg',
    }, labelIconNodeControls),
    component('website', displayNameForComponent('website'), 'product', WebsiteNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('website'),
      title: 'Website',
      size: 'lg',
    }, websiteNodeControls),
    component('document', displayNameForComponent('document'), 'product', DocumentNode as ComponentType<PreviewNodeProps>, documentNodeDefaults, documentNodeControls),
    component('api', displayNameForComponent('api'), 'product', ApiNode as ComponentType<PreviewNodeProps>, apiNodeDefaults, apiNodeControls),
    component('database', displayNameForComponent('database'), 'product', DatabaseNode as ComponentType<PreviewNodeProps>, databaseNodeDefaults, databaseNodeControls),
    component('app', displayNameForComponent('app'), 'product', AppNode as ComponentType<PreviewNodeProps>, appNodeDefaults, appNodeControls),
  ],
};

export const previewIcon = ErrorIcon;
