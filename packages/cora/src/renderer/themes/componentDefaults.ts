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
        size: 'md' as const,
      };

    case 'website':
      return {
        ...common,
        backgroundColor: LOOK.components.website.fill,
        borderColor: LOOK.components.website.stroke,
        skeletonColor: LOOK.components.website.skeleton,
      };

    case 'app':
      return {
        ...common,
        backgroundColor: LOOK.components.app.fill,
        borderColor: LOOK.components.app.stroke,
      };

    case 'document':
      return {
        ...commonWithoutShadow,
        backgroundColor: LOOK.components.document.fill,
        borderColor: LOOK.components.document.stroke,
        iconColor: LOOK.components.document.stroke,
      };

    default:
      return common;
  }
}
