import type { DiagramComponent } from '../../layout-ir.js';
import { LOOK } from './lookTokens.js';
import {
  NODE_TITLE_SIZE,
  NODE_SUBTITLE_SIZE,
  EDGE_LABEL_SIZE,
  STANDALONE_LABEL_SIZE,
} from './fontTokens.js';

export function catalogDefaultProps(component: DiagramComponent): Record<string, any> {
  const common = {
    backgroundColor: LOOK.surface.fill,
    radius: LOOK.radius.md,
    borderStyle: 'solid' as const,
    borderColor: LOOK.border.default,
    borderWidth: 1,
    textColor: LOOK.text.primary,
    subtitleColor: LOOK.text.muted,
    titleFontSize: NODE_TITLE_SIZE,
    subtitleFontSize: NODE_SUBTITLE_SIZE,
    shadow: 'none' as const,
    size: 'md' as const,
  };
  const { shadow, ...commonWithoutShadow } = common;
  void shadow;

  switch (component) {
    case 'box':
      return {
        ...common,
      };

    case 'label':
      return {
        ...commonWithoutShadow,
        backgroundColor: 'transparent',
        radius: 12,
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        textColor: LOOK.text.standaloneLabel,
        titleFontSize: STANDALONE_LABEL_SIZE,
      };

    case 'icon':
      return {
        ...commonWithoutShadow,
        backgroundColor: 'transparent',
        radius: 0,
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        iconColor: LOOK.components.icon.iconColor,
        size: 'lg' as const,
      };

    case 'labelIcon':
      return {
        ...commonWithoutShadow,
        backgroundColor: 'transparent',
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        radius: 0,
        iconColor: LOOK.components.labelIcon.iconColor,
        size: 'lg' as const,
      };

    case 'website':
      return {
        ...commonWithoutShadow,
        backgroundColor: LOOK.components.website.fill,
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        skeletonColor: LOOK.components.website.skeleton,
        windowColor: LOOK.components.website.window,
        windowBarColor: LOOK.components.website.windowBar,
        windowAddressBarColor: LOOK.components.website.windowAddress,
        size: 'lg' as const,
      };

    case 'app':
      return {
        ...commonWithoutShadow,
        backgroundColor: 'transparent',
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        iconColor: LOOK.components.app.iconColor,
        size: 'lg' as const,
      };

    case 'document':
      return {
        ...commonWithoutShadow,
        backgroundColor: 'transparent',
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        iconColor: LOOK.components.document.iconColor,
        size: 'lg' as const,
      };

    case 'api':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.api.iconColor,
      };

    case 'database':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.database.iconColor,
      };

    case 'decision':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.decision.iconColor,
      };

    case 'analytics':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.analytics.iconColor,
      };

    case 'person':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.person.iconColor,
      };

    case 'people':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.people.iconColor,
      };

    case 'configuration':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.configuration.iconColor,
      };

    case 'cloud':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.cloud.iconColor,
      };

    case 'archive':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.archive.iconColor,
      };

    case 'artificialIntelligence':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.artificialIntelligence.iconColor,
      };

    case 'multimedia':
      return {
        backgroundColor: 'transparent',
        textColor: LOOK.text.primary,
        subtitleColor: LOOK.text.muted,
        titleFontSize: NODE_TITLE_SIZE,
        subtitleFontSize: NODE_SUBTITLE_SIZE,
        size: 'lg' as const,
        iconColor: LOOK.components.multimedia.iconColor,
      };

    default:
      return common;
  }
}
