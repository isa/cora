import type { ComponentType } from 'react';
// Source preview uses direct source imports to keep the browser bundle free of
// server-only renderer helpers; package subpath verification is covered in Plan 04.
import { BUILTIN_ICON_REGISTRY } from '../../renderer/components/index.js';
import { AnalyticsNode } from '../../renderer/components/nodes/AnalyticsNode.js';
import { ApiNode } from '../../renderer/components/nodes/ApiNode.js';
import { AppNode } from '../../renderer/components/nodes/AppNode.js';
import { BoxNode } from '../../renderer/components/nodes/BoxNode.js';
import { ConfigurationNode } from '../../renderer/components/nodes/ConfigurationNode.js';
import { DatabaseNode } from '../../renderer/components/nodes/DatabaseNode.js';
import { DecisionNode } from '../../renderer/components/nodes/DecisionNode.js';
import { DocumentNode } from '../../renderer/components/nodes/DocumentNode.js';
import { IconNode } from '../../renderer/components/nodes/IconNode.js';
import { LabelIconNode } from '../../renderer/components/nodes/LabelIconNode.js';
import { LabelNode } from '../../renderer/components/nodes/LabelNode.js';
import { PeopleNode } from '../../renderer/components/nodes/PeopleNode.js';
import { ArtificialIntelligenceNode } from '../../renderer/components/nodes/ArtificialIntelligenceNode.js';
import { ArchiveNode } from '../../renderer/components/nodes/ArchiveNode.js';
import { CloudNode } from '../../renderer/components/nodes/CloudNode.js';
import { MultimediaNode } from '../../renderer/components/nodes/MultimediaNode.js';
import { PersonNode } from '../../renderer/components/nodes/PersonNode.js';
import { WebsiteNode } from '../../renderer/components/nodes/WebsiteNode.js';
import type { PackManifest, PreviewComponentDefinition } from './types.js';
import {
  baseNodeControls,
  baseNodeDefaults,
  boxNodeControls,
  iconNodeControls,
  labelNodeControls,
  labelIconNodeControls,
  documentNodeControls,
  documentNodeDefaults,
  apiNodeControls,
  apiNodeDefaults,
  databaseNodeControls,
  databaseNodeDefaults,
  analyticsNodeControls,
  analyticsNodeDefaults,
  configurationNodeControls,
  configurationNodeDefaults,
  cloudNodeControls,
  cloudNodeDefaults,
  archiveNodeControls,
  archiveNodeDefaults,
  artificialIntelligenceNodeControls,
  artificialIntelligenceNodeDefaults,
  multimediaNodeControls,
  multimediaNodeDefaults,
  peopleNodeControls,
  peopleNodeDefaults,
  personNodeControls,
  personNodeDefaults,
  decisionNodeControls,
  decisionNodeDefaults,
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
      // Boxes inherit renderer auto-size semantics unless the user explicitly resizes them.
      size: undefined,
    }, boxNodeControls),
    component('label', displayNameForComponent('label'), 'basic', LabelNode as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('label'),
      title: 'Label',
      size: undefined,
    }, labelNodeControls),
    component('icon', displayNameForComponent('icon'), 'basic', IconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('icon'),
      title: 'Icon',
      subtitle: '',
      iconName: 'database',
      size: 'lg',
    }, iconNodeControls),
    component('labelIcon', displayNameForComponent('labelIcon'), 'basic', LabelIconNode as unknown as ComponentType<PreviewNodeProps>, {
      ...catalogDefaultProps('labelIcon'),
      title: '',
      subtitle: '',
      iconName: 'database',
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
    component('decision', displayNameForComponent('decision'), 'product', DecisionNode as ComponentType<PreviewNodeProps>, decisionNodeDefaults, decisionNodeControls),
    component('analytics', displayNameForComponent('analytics'), 'product', AnalyticsNode as ComponentType<PreviewNodeProps>, analyticsNodeDefaults, analyticsNodeControls),
    component('person', displayNameForComponent('person'), 'product', PersonNode as ComponentType<PreviewNodeProps>, personNodeDefaults, personNodeControls),
    component('people', displayNameForComponent('people'), 'product', PeopleNode as ComponentType<PreviewNodeProps>, peopleNodeDefaults, peopleNodeControls),
    component('configuration', displayNameForComponent('configuration'), 'product', ConfigurationNode as ComponentType<PreviewNodeProps>, configurationNodeDefaults, configurationNodeControls),
    component('cloud', displayNameForComponent('cloud'), 'product', CloudNode as ComponentType<PreviewNodeProps>, cloudNodeDefaults, cloudNodeControls),
    component('archive', displayNameForComponent('archive'), 'product', ArchiveNode as ComponentType<PreviewNodeProps>, archiveNodeDefaults, archiveNodeControls),
    component('artificialIntelligence', displayNameForComponent('artificialIntelligence'), 'product', ArtificialIntelligenceNode as ComponentType<PreviewNodeProps>, artificialIntelligenceNodeDefaults, artificialIntelligenceNodeControls),
    component('multimedia', displayNameForComponent('multimedia'), 'product', MultimediaNode as ComponentType<PreviewNodeProps>, multimediaNodeDefaults, multimediaNodeControls),
    component('app', displayNameForComponent('app'), 'product', AppNode as ComponentType<PreviewNodeProps>, appNodeDefaults, appNodeControls),
  ],
};

export const previewIcon = BUILTIN_ICON_REGISTRY.error;
