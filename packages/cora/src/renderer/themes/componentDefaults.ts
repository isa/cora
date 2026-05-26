import type { DiagramComponent } from '../../layout-ir.js';
import { LOOK } from './lookTokens.js';
import { TAILWIND } from './tailwindPalette.js';
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

  switch (component) {
    case 'box':
      return {
        ...common,
      };

    case 'label':
      return {
        ...common,
        backgroundColor: 'transparent',
        radius: 0,
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        textColor: LOOK.text.standaloneLabel,
        titleFontSize: STANDALONE_LABEL_SIZE,
      };

    case 'icon':
      return {
        ...common,
        backgroundColor: 'transparent',
        radius: 0,
        borderStyle: 'none' as const,
        borderColor: 'transparent',
        borderWidth: 0,
        iconColor: LOOK.components.icon.iconColor,
      };

    case 'labelIcon':
      return {
        ...common,
        backgroundColor: LOOK.components.labelIcon.fill,
        borderColor: LOOK.components.labelIcon.stroke,
        iconColor: LOOK.components.labelIcon.iconColor,
      };

    case 'website':
      return {
        ...common,
        backgroundColor: LOOK.components.website.fill,
        borderColor: LOOK.components.website.stroke,
        subtitleColor: TAILWIND.slate[400],
        skeletonColor: '#b5b5b5',
        size: { width: 144, height: 160 },
      };

    case 'app':
      return {
        ...common,
        backgroundColor: LOOK.components.app.fill,
        borderColor: LOOK.components.app.stroke,
        size: { width: 96, height: 128 },
      };

    case 'page':
      return {
        ...common,
        backgroundColor: LOOK.components.page.fill,
        borderColor: LOOK.components.page.stroke,
        type: 'landing',
        skeletonColorDark: TAILWIND.slate[500],
        skeletonColorLight: TAILWIND.slate[200],
      };

    default:
      return common;
  }
}
