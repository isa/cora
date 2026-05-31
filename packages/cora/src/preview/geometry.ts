import {
  resolveComponentSize,
  resolveWebsiteComponentSize,
  resolveAppComponentSize,
  resolveApiComponentSize,
  resolveDatabaseComponentSize,
  resolveAnalyticsComponentSize,
  resolveConfigurationComponentSize,
  resolveDecisionComponentSize,
  resolveDocumentComponentSize,
  resolveLabelIconComponentSize,
  resolveCloudComponentSize,
  resolveArchiveComponentSize,
  resolveArtificialIntelligenceComponentSize,
  resolveMultimediaComponentSize,
  resolvePeopleComponentSize,
  resolvePersonComponentSize,
  APP_SIZE_PRESETS,
  API_SIZE_PRESETS,
  DATABASE_SIZE_PRESETS,
  ANALYTICS_SIZE_PRESETS,
  CONFIGURATION_SIZE_PRESETS,
  DECISION_SIZE_PRESETS,
  CLOUD_SIZE_PRESETS,
  ARCHIVE_SIZE_PRESETS,
  ARTIFICIAL_INTELLIGENCE_SIZE_PRESETS,
  MULTIMEDIA_SIZE_PRESETS,
  DOCUMENT_SIZE_PRESETS,
  PEOPLE_SIZE_PRESETS,
  PERSON_SIZE_PRESETS,
  WEBSITE_SIZE_PRESETS,
  LABEL_ICON_SIZE_PRESETS,
  ICON_NODE_ART_SIZE,
  APP_ICON_VIEW_WIDTH,
  APP_ICON_VIEW_HEIGHT,
  iconNodeScale,
} from '../renderer/components/styles.js';
import { resolveCatalogTextLayout } from '../core/catalogTextLayout.js';
import {
  API_CONNECTION_GAP,
  DOCUMENT_CONNECTION_GAP,
  PEOPLE_CONNECTION_GAP,
  WEBSITE_CONNECTION_GAP,
  chooseConnectionSides,
  connectionAnchorBox,
  sidePoint,
  type AnchorNode,
  type Side,
} from '../core/connectionAnchors.js';
import { markerShaftTrim } from '../core/edgeMarkers.js';
import type { ConnectionProps } from './controls/defaults.js';
import type { CanvasConnection, CanvasNode, PreviewPosition, WorkbenchState } from './state.js';

export { chooseConnectionSides, sidePoint };
export type { Side };

export interface PreviewBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewPoint {
  x: number;
  y: number;
}

export interface AttachmentSlot {
  nodeId: string;
  side: Side;
  index: number;
  label: string;
  x: number;
  y: number;
}

function nodeText(node: CanvasNode): string {
  return String(node.props.title ?? node.props.text ?? '');
}

function nodeSubtitle(node: CanvasNode): string {
  return String(node.props.subtitle ?? '');
}

function nodeTitleFontSize(node: CanvasNode, fallback = 12): number {
  return node.props.titleFontSize ?? fallback;
}

function nodeSubtitleFontSize(node: CanvasNode, fallback = 13): number {
  return node.props.subtitleFontSize ?? Math.max(8, nodeTitleFontSize(node, fallback) - 2);
}

function wrappedTextHeight(
  node: CanvasNode,
  width: number,
  titleFontSize: number,
  subtitleFontSize: number,
): number {
  return resolveCatalogTextLayout({
    text: nodeText(node),
    subtitle: nodeSubtitle(node),
    width,
    fontSize: titleFontSize,
    subtitleFontSize,
  }).totalHeight;
}

function previewBaseSize(node: CanvasNode): { width: number; height: number } {
  return node.componentId === 'app'
    ? resolveAppComponentSize(node.props.size, APP_SIZE_PRESETS.lg)
    : node.componentId === 'api'
      ? resolveApiComponentSize(node.props.size, API_SIZE_PRESETS.lg)
      : node.componentId === 'database'
        ? resolveDatabaseComponentSize(node.props.size, DATABASE_SIZE_PRESETS.lg)
        : node.componentId === 'decision'
          ? resolveDecisionComponentSize(node.props.size, DECISION_SIZE_PRESETS.lg)
          : node.componentId === 'analytics'
            ? resolveAnalyticsComponentSize(node.props.size, ANALYTICS_SIZE_PRESETS.lg)
            : node.componentId === 'person'
              ? resolvePersonComponentSize(node.props.size, PERSON_SIZE_PRESETS.lg)
              : node.componentId === 'people'
                ? resolvePeopleComponentSize(node.props.size, PEOPLE_SIZE_PRESETS.lg)
                : node.componentId === 'configuration'
                  ? resolveConfigurationComponentSize(node.props.size, CONFIGURATION_SIZE_PRESETS.lg)
                  : node.componentId === 'cloud'
                    ? resolveCloudComponentSize(node.props.size, CLOUD_SIZE_PRESETS.lg)
                    : node.componentId === 'archive'
                      ? resolveArchiveComponentSize(node.props.size, ARCHIVE_SIZE_PRESETS.lg)
                      : node.componentId === 'artificialIntelligence'
                        ? resolveArtificialIntelligenceComponentSize(
                            node.props.size,
                            ARTIFICIAL_INTELLIGENCE_SIZE_PRESETS.lg,
                          )
                        : node.componentId === 'multimedia'
                          ? resolveMultimediaComponentSize(node.props.size, MULTIMEDIA_SIZE_PRESETS.lg)
                          : node.componentId === 'document'
          ? resolveDocumentComponentSize(node.props.size, DOCUMENT_SIZE_PRESETS.lg)
          : node.componentId === 'website'
            ? resolveWebsiteComponentSize(node.props.size, WEBSITE_SIZE_PRESETS.lg)
            : node.componentId === 'labelIcon'
              ? resolveLabelIconComponentSize(node.props.size, LABEL_ICON_SIZE_PRESETS.lg)
                : node.componentId === 'icon'
                  ? resolveAppComponentSize(node.props.size, APP_SIZE_PRESETS.lg)
                : resolveComponentSize(node.props.size, { width: 120, height: 45 });
}

export function previewNodeSize(node: CanvasNode): { width: number; height: number } {
  const base = previewBaseSize(node);
  const title = nodeText(node);
  const subtitle = nodeSubtitle(node);
  const titleFontSize = nodeTitleFontSize(node);
  const subtitleFontSize = nodeSubtitleFontSize(node);
  const hasText = Boolean(title || subtitle);

  if (node.componentId === 'box') {
    const lines = title ? title.split(/\r?\n/) : [];
    const subtitleLines = subtitle ? subtitle.split(/\r?\n/) : [];
    const longestLine = Math.max(...lines.map((line) => line.length), 1);
    const longestSubtitle = Math.max(...subtitleLines.map((line) => line.length), 0);
    const textWidth = Math.ceil(Math.max(longestLine * titleFontSize * 0.56, longestSubtitle * subtitleFontSize * 0.56) + 16);
    const textHeight = Math.ceil(
      16 +
      lines.length * titleFontSize * 1.25 +
      (lines.length > 0 && subtitleLines.length > 0 ? 3 : 0) +
      subtitleLines.length * subtitleFontSize * 1.25,
    );
    return {
      width: Math.max(base.width, textWidth),
      height: Math.max(base.height, textHeight),
    };
  }

  if (node.componentId === 'label') {
    const textHeight = Math.ceil(wrappedTextHeight(node, base.width, titleFontSize, subtitleFontSize) + 16);
    return {
      width: base.width,
      height: Math.max(28, base.height, textHeight),
    };
  }

  if (node.componentId === 'icon') {
    const ratio = iconNodeScale(base);
    const iconSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width - 16, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText ? 6 * ratio + iconSize + 6 * ratio + textHeight : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'labelIcon') {
    if (node.props.iconType) {
      return base;
    }
    return {
      width: base.width,
      height: Math.max(base.height, previewLabelIconContentHeight(node)),
    };
  }

  if (node.componentId === 'app' || node.componentId === 'database' || node.componentId === 'decision' || node.componentId === 'analytics' || node.componentId === 'person' || node.componentId === 'people' || node.componentId === 'configuration' || node.componentId === 'cloud' || node.componentId === 'archive' || node.componentId === 'artificialIntelligence' || node.componentId === 'multimedia') {
    const ratio = iconNodeScale(base);
    const artSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText
      ? 6 * ratio + artSize + 8 * ratio + textHeight + 6 * ratio
      : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'api') {
    const ratio = base.width / API_SIZE_PRESETS.lg.width;
    const artSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText
      ? 6 * ratio + artSize + 8 * ratio + textHeight + 6 * ratio
      : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'document') {
    const ratio = base.width / DOCUMENT_SIZE_PRESETS.lg.width;
    const artSize = ICON_NODE_ART_SIZE * ratio;
    const textHeight = hasText
      ? wrappedTextHeight(node, base.width, titleFontSize * ratio, subtitleFontSize * ratio)
      : 0;
    const requiredHeight = hasText
      ? 12 * ratio + artSize + 8 * ratio + textHeight + 8 * ratio
      : base.height;
    return { width: base.width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  if (node.componentId === 'website') {
    const width = hasText ? Math.max(base.width, 64) : base.width;
    const titleSize = node.props.titleFontSize ?? 12;
    const subtitleSize = node.props.subtitleFontSize ?? Math.max(8, titleSize - 2);
    const textHeight = hasText
      ? wrappedTextHeight(node, width, titleSize, subtitleSize)
      : 0;
    const requiredHeight = hasText
      ? 6 + 24 + 8 + textHeight + 6
      : base.height;
    return { width, height: Math.max(base.height, Math.ceil(requiredHeight)) };
  }

  return base;
}

export function canvasNodeSize(node: CanvasNode): { width: number; height: number } {
  return node.layoutSize ?? previewNodeSize(node);
}

/**
 * Intrinsic height of an icon-label node's *visible* content (icon + text below
 * it), top-aligned within the node box. The node box height is clamped up to the
 * size-preset minimum, which can leave dead space below the content; gapping the
 * connection line should track this tight content height, not the padded box.
 */
export function previewLabelIconContentHeight(node: CanvasNode): number {
  const base = previewBaseSize(node);
  if (node.props.iconType) {
    return base.height;
  }
  const ratio = iconNodeScale(base);
  const iconSize = ICON_NODE_ART_SIZE * ratio;
  const hasText = Boolean(nodeText(node) || nodeSubtitle(node));
  if (!hasText) {
    return base.height;
  }
  const textWidth = Math.max(120, base.width * 2.5);
  const textHeight = wrappedTextHeight(
    node,
    textWidth,
    nodeTitleFontSize(node) * ratio,
    nodeSubtitleFontSize(node) * ratio,
  );
  return Math.ceil(2 * ratio + iconSize + 4 * ratio + textHeight);
}

/**
 * Rendered size of a label node's text (longest wrapped line + wrapped height),
 * as opposed to its fixed box width. Used to tightly gap the connection line
 * around the visible text rather than the whole node box.
 */
export function previewLabelContentSize(node: CanvasNode): { width: number; height: number } {
  const base = previewBaseSize(node);
  const layout = resolveCatalogTextLayout({
    text: nodeText(node),
    subtitle: nodeSubtitle(node),
    width: base.width,
    fontSize: nodeTitleFontSize(node),
    subtitleFontSize: nodeSubtitleFontSize(node),
  });
  return { width: layout.contentWidth, height: layout.totalHeight };
}

export function computeNodeBox(
  state: WorkbenchState,
  nodeId: string,
  // Points of the connection this node is attached to, as drawn on the canvas
  // (the shared-layout edge). When supplied, attached label/icon placement walks
  // these exact points instead of re-deriving them — so an attached icon sits on
  // the visible line and doesn't bounce as boxes move or text changes.
  attachedEdgePoints?: Array<{ x: number; y: number }>,
): PreviewBox | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  if (!node) {
    return undefined;
  }
  const size = canvasNodeSize(node);
  // For an attached icon-label, where the icon centre sits on the line and how
  // far the content reaches around it (icon above, text below) — fed to the
  // anchor maths so the content always clears the line ending.
  const labelIconLayout = node.componentId === 'labelIcon'
    ? (() => {
        const ratio = iconNodeScale(size);
        const hasText = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
        const iconSize = node.props.iconType ? Math.min(size.width, size.height) * 0.62 : ICON_NODE_ART_SIZE * ratio;
        const iconYOffset = node.props.iconType
          ? (size.height - iconSize) / 2
          : hasText
          ? 2 * ratio
          : (size.height - iconSize) / 2;
        const iconCenterYOffset = iconYOffset + iconSize / 2;
        const contentHeight = node.props.iconType ? size.height : previewLabelIconContentHeight(node);
        return {
          iconCenterYOffset,
          extents: {
            halfWidth: size.width / 2,
            up: iconCenterYOffset,
            down: Math.max(0, contentHeight - iconCenterYOffset),
          },
        };
      })()
    : undefined;
  const attachedCenter = node.attachedConnectionId
    ? node.componentId === 'labelIcon'
      ? computeConnectionLabelIconCenter(state, node.attachedConnectionId, size, {
          x: node.position.x + size.width / 2,
          y: node.position.y + size.height / 2,
        }, node.attachedEnd, labelIconLayout!.extents, attachedEdgePoints)
      : attachedEdgePoints
        ? connectionCenter(attachedEdgePoints)
        : computeConnectionCenter(state, node.attachedConnectionId)
    : undefined;
  let position = node.position;
  if (attachedCenter) {
    if (node.componentId === 'labelIcon') {
      position = {
        x: attachedCenter.x - size.width / 2,
        y: attachedCenter.y - labelIconLayout!.iconCenterYOffset,
      };
    } else {
      position = {
        x: attachedCenter.x - size.width / 2,
        y: attachedCenter.y - size.height / 2,
      };
    }
  }

  return {
    id: node.id,
    ...position,
    ...size,
  };
}

function nodeHasLabelText(node: CanvasNode): boolean {
  return Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
}

function iconLikeArtCenter(
  box: PreviewBox,
  node: CanvasNode,
  options?: { topPadding?: number; bottomPadding?: number; labelGap?: number },
): PreviewPoint {
  const ratio = iconNodeScale(box);
  const hasText = nodeHasLabelText(node);
  const titleFontSize = (node.props.titleFontSize ?? 12) * ratio;
  const subtitleFontSize = (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio;
  const textHeight = hasText
    ? wrappedTextHeight(node, box.width, titleFontSize, subtitleFontSize)
    : 0;
  const labelGap = options?.labelGap ?? (hasText ? 8 : 0) * ratio;
  const topPadding = options?.topPadding ?? (hasText ? 6 : 0) * ratio;
  const bottomPadding = options?.bottomPadding ?? (hasText ? 6 : 0) * ratio;
  const artSize = ICON_NODE_ART_SIZE * ratio;
  const offsetX = box.x + (box.width - artSize) / 2;
  const offsetY = box.y + topPadding + (box.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
  return { x: offsetX + artSize / 2, y: offsetY + artSize / 2 };
}

function stackedIconVisualBox(box: PreviewBox, node: CanvasNode): PreviewBox {
  const ratio = iconNodeScale(box);
  const artSize = ICON_NODE_ART_SIZE * ratio;
  const center = iconLikeArtCenter(box, node);
  const artY = center.y - artSize / 2;
  const bottomEdge = box.y + box.height;

  return {
    id: box.id,
    x: center.x - artSize / 2,
    y: artY,
    width: artSize,
    height: bottomEdge - artY,
  };
}

function websiteIconVisualBox(box: PreviewBox, node: CanvasNode): PreviewBox {
  const hasLabel = nodeHasLabelText(node);
  const titleFontSize = node.props.titleFontSize ?? 12;
  const subtitleFontSize = node.props.subtitleFontSize ?? Math.max(8, titleFontSize - 2);
  const textHeight = hasLabel
    ? wrappedTextHeight(node, box.width, titleFontSize, subtitleFontSize)
    : 0;
  const labelGap = hasLabel ? 8 : 0;
  const topPadding = hasLabel ? 6 : 0;
  const bottomPadding = hasLabel ? 6 : 0;
  const artHeight = Math.max(24, box.height - textHeight - labelGap - topPadding - bottomPadding);
  const scale = Math.min(box.width / 624, artHeight / 584);
  const artWidth = 624 * scale;
  const scaledArtHeight = 584 * scale;
  const offsetX = box.x + (box.width - artWidth) / 2;
  const offsetY = box.y + topPadding + (artHeight - scaledArtHeight) / 2;
  const gap = WEBSITE_CONNECTION_GAP * scale;
  const windowX = offsetX + 12 * scale;
  const windowY = offsetY + 12 * scale;
  const bottomEdge = box.y + box.height;

  return {
    id: box.id,
    x: windowX - gap,
    y: windowY - gap,
    width: 600 * scale + gap * 2,
    height: bottomEdge - (windowY - gap),
  };
}

function documentIconVisualBox(box: PreviewBox, node: CanvasNode): PreviewBox {
  const ratio = Math.min(
    box.width / DOCUMENT_SIZE_PRESETS.lg.width,
    box.height / DOCUMENT_SIZE_PRESETS.lg.height,
  );
  const hasText = nodeHasLabelText(node);
  const titleFontSize = (node.props.titleFontSize ?? 12) * ratio;
  const subtitleFontSize = (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio;
  const textHeight = hasText
    ? wrappedTextHeight(node, box.width, titleFontSize, subtitleFontSize)
    : 0;
  const labelGap = (hasText ? 8 : 0) * ratio;
  const topPadding = 12 * ratio;
  const bottomPadding = (hasText ? 8 : 12) * ratio;
  const scale = (ICON_NODE_ART_SIZE / 24) * ratio;
  const artWidth = 24 * scale;
  const artHeight = 24 * scale;
  const artY = box.y + topPadding + (box.height - artHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const offsetX = box.x + (box.width - artWidth) / 2;
  const gap = DOCUMENT_CONNECTION_GAP * scale;
  const bottomEdge = box.y + box.height;

  return {
    id: box.id,
    x: offsetX,
    y: artY - gap,
    width: artWidth,
    height: bottomEdge - (artY - gap),
  };
}

function apiIconVisualBox(box: PreviewBox, node: CanvasNode): PreviewBox {
  const ratio = iconNodeScale(box);
  const artSize = ICON_NODE_ART_SIZE * ratio;
  const scale = artSize / 256;
  const hasText = nodeHasLabelText(node);
  const titleFontSize = (node.props.titleFontSize ?? 12) * ratio;
  const subtitleFontSize = (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio;
  const textHeight = hasText
    ? wrappedTextHeight(node, box.width, titleFontSize, subtitleFontSize)
    : 0;
  const labelGap = (hasText ? 8 : 0) * ratio;
  const topPadding = (hasText ? 6 : 0) * ratio;
  const bottomPadding = (hasText ? 6 : 0) * ratio;
  const artY = box.y + topPadding + (box.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const offsetX = box.x + (box.width - artSize) / 2;
  const gap = API_CONNECTION_GAP * scale;
  const bottomEdge = box.y + box.height;

  return {
    id: box.id,
    x: offsetX + 40 * scale - gap,
    y: artY + 32 * scale - gap,
    width: 176 * scale + gap * 2,
    height: bottomEdge - (artY + 32 * scale - gap),
  };
}

function peopleIconVisualBox(box: PreviewBox, node: CanvasNode): PreviewBox {
  const ratio = iconNodeScale(box);
  const artSize = ICON_NODE_ART_SIZE * ratio;
  const scale = artSize / 24;
  const hasText = nodeHasLabelText(node);
  const titleFontSize = (node.props.titleFontSize ?? 12) * ratio;
  const subtitleFontSize = (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio;
  const textHeight = hasText
    ? wrappedTextHeight(node, box.width, titleFontSize, subtitleFontSize)
    : 0;
  const labelGap = (hasText ? 8 : 0) * ratio;
  const topPadding = (hasText ? 6 : 0) * ratio;
  const bottomPadding = (hasText ? 6 : 0) * ratio;
  const artY = box.y + topPadding + (box.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const offsetX = box.x + (box.width - artSize) / 2;
  const gap = PEOPLE_CONNECTION_GAP * scale;
  const bottomEdge = box.y + box.height;

  return {
    id: box.id,
    x: offsetX - gap,
    y: artY - gap,
    width: artSize + gap * 2,
    height: bottomEdge - (artY - gap),
  };
}

/** Resize anchor for center-anchored scaling (icon/device centre, excluding label text). */
export function nodeResizeCenter(state: WorkbenchState, nodeId: string): PreviewPoint | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  const box = computeNodeBox(state, nodeId);
  if (!node || !box) {
    return undefined;
  }

  if (node.componentId === 'box' || node.componentId === 'label') {
    return undefined;
  }

  if (node.componentId === 'icon') {
    const ratio = iconNodeScale(box);
    const iconSize = ICON_NODE_ART_SIZE * ratio;
    const hasText = nodeHasLabelText(node);
    const iconY = box.y + (hasText ? 6 * ratio : (box.height - iconSize) / 2);
    return { x: box.x + box.width / 2, y: iconY + iconSize / 2 };
  }

  if (node.componentId === 'app') {
    const ratio = iconNodeScale(box);
    const scale = (ICON_NODE_ART_SIZE / APP_ICON_VIEW_WIDTH) * ratio;
    const artWidth = APP_ICON_VIEW_WIDTH * scale;
    const artHeight = APP_ICON_VIEW_HEIGHT * scale;
    const hasLabel = nodeHasLabelText(node);
    const textHeight = hasLabel
      ? wrappedTextHeight(
          node,
          box.width,
          (node.props.titleFontSize ?? 12) * ratio,
          (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio,
        )
      : 0;
    const labelGap = (hasLabel ? 8 : 0) * ratio;
    const topPadding = (hasLabel ? 6 : 0) * ratio;
    const bottomPadding = (hasLabel ? 6 : 0) * ratio;
    const offsetX = box.x + (box.width - artWidth) / 2;
    const offsetY = box.y + topPadding + (box.height - artHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;
    return { x: offsetX + artWidth / 2, y: offsetY + artHeight / 2 };
  }

  if (node.componentId === 'document') {
    const ratio = Math.min(
      box.width / DOCUMENT_SIZE_PRESETS.lg.width,
      box.height / DOCUMENT_SIZE_PRESETS.lg.height,
    );
    const hasLabel = nodeHasLabelText(node);
    const textHeight = hasLabel
      ? wrappedTextHeight(
          node,
          box.width,
          (node.props.titleFontSize ?? 12) * ratio,
          (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio,
        )
      : 0;
    const labelGap = (hasLabel ? 8 : 0) * ratio;
    const topPadding = 12 * ratio;
    const bottomPadding = (hasLabel ? 8 : 12) * ratio;
    const scale = (ICON_NODE_ART_SIZE / 24) * ratio;
    const artWidth = 24 * scale;
    const artHeight = 24 * scale;
    const offsetX = box.x + (box.width - artWidth) / 2;
    const offsetY = box.y + topPadding + (box.height - artHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;
    return { x: offsetX + artWidth / 2, y: offsetY + artHeight / 2 };
  }

  if (node.componentId === 'website') {
    const hasLabel = nodeHasLabelText(node);
    const titleFontSize = node.props.titleFontSize ?? 12;
    const subtitleFontSize = node.props.subtitleFontSize ?? Math.max(8, titleFontSize - 2);
    const textHeight = hasLabel
      ? wrappedTextHeight(node, box.width, titleFontSize, subtitleFontSize)
      : 0;
    const labelGap = hasLabel ? 8 : 0;
    const topPadding = hasLabel ? 6 : 0;
    const bottomPadding = hasLabel ? 6 : 0;
    const artHeight = Math.max(24, box.height - textHeight - labelGap - topPadding - bottomPadding);
    const scale = Math.min(box.width / 624, artHeight / 710);
    const artWidth = 624 * scale;
    const scaledArtHeight = 710 * scale;
    const offsetX = box.x + (box.width - artWidth) / 2;
    const offsetY = box.y + topPadding + (artHeight - scaledArtHeight) / 2;
    return { x: offsetX + artWidth / 2, y: offsetY + scaledArtHeight / 2 };
  }

  if (
    node.componentId === 'api' ||
    node.componentId === 'database' ||
    node.componentId === 'decision' ||
    node.componentId === 'analytics' ||
    node.componentId === 'person' ||
    node.componentId === 'people' ||
    node.componentId === 'configuration' ||
    node.componentId === 'cloud' ||
    node.componentId === 'archive' ||
    node.componentId === 'artificialIntelligence' ||
    node.componentId === 'multimedia' ||
    node.componentId === 'labelIcon'
  ) {
    return iconLikeArtCenter(box, node);
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Position a node so its resize anchor stays fixed after a centre-anchored scale. */
export function positionForResizeAnchor(
  state: WorkbenchState,
  nodeId: string,
  anchor: PreviewPoint,
  size: { width: number; height: number },
): PreviewPosition {
  const tempState: WorkbenchState = {
    ...state,
    nodes: state.nodes.map((item) =>
      item.id === nodeId
        ? { ...item, props: { ...item.props, size }, position: { x: 0, y: 0 } }
        : item,
    ),
  };
  const center = nodeResizeCenter(tempState, nodeId);
  if (!center) {
    return {
      x: Math.round(anchor.x - size.width / 2),
      y: Math.round(anchor.y - size.height / 2),
    };
  }
  return {
    x: Math.round(anchor.x - center.x),
    y: Math.round(anchor.y - center.y),
  };
}

function iconVisualBox(state: WorkbenchState, nodeId: string): PreviewBox | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  const box = computeNodeBox(state, nodeId);
  if (!node || !box) {
    return box;
  }

  // IconNode: horizontally narrowed to the icon artwork; vertically extends
  // to the full node bottom so that bottom-exiting lines clear title/subtitle.
  if (node.componentId === 'icon') {
    const ratio = iconNodeScale(box);
    const iconSize = ICON_NODE_ART_SIZE * ratio;
    const hasText = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
    const iconY = box.y + (hasText ? 6 * ratio : (box.height - iconSize) / 2);
    const bottomEdge = box.y + box.height;

    return {
      id: box.id,
      x: box.x + (box.width - iconSize) / 2,
      y: iconY,
      width: iconSize,
      height: bottomEdge - iconY,
    };
  }

  // AppNode: horizontally narrowed to the phone artwork; vertically extends
  // to the full node bottom so that bottom-exiting lines clear title/subtitle.
  if (node.componentId === 'app') {
    const ratio = iconNodeScale(box);
    const scale = (ICON_NODE_ART_SIZE / APP_ICON_VIEW_WIDTH) * ratio;
    const artWidth = APP_ICON_VIEW_WIDTH * scale;
    const artHeight = APP_ICON_VIEW_HEIGHT * scale;

    const hasLabel = Boolean((node.props.title ?? node.props.text) || node.props.subtitle);
    const textHeight = hasLabel
      ? wrappedTextHeight(
          node,
          box.width,
          (node.props.titleFontSize ?? 12) * ratio,
          (node.props.subtitleFontSize ?? Math.max(8, (node.props.titleFontSize ?? 12) - 2)) * ratio,
        )
      : 0;
    const labelGap = (hasLabel ? 8 : 0) * ratio;
    const topPadding = (hasLabel ? 6 : 0) * ratio;
    const bottomPadding = (hasLabel ? 6 : 0) * ratio;
    const offsetY = box.y + topPadding + (box.height - artHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;
    const bottomEdge = box.y + box.height;

    return {
      id: box.id,
      x: box.x + (box.width - artWidth) / 2,
      y: offsetY,
      width: artWidth,
      height: bottomEdge - offsetY,
    };
  }

  if (node.componentId === 'api') {
    return apiIconVisualBox(box, node);
  }

  if (node.componentId === 'document') {
    return documentIconVisualBox(box, node);
  }

  if (node.componentId === 'website') {
    return websiteIconVisualBox(box, node);
  }

  if (node.componentId === 'people') {
    return peopleIconVisualBox(box, node);
  }

  if (
    node.componentId === 'database' ||
    node.componentId === 'decision' ||
    node.componentId === 'analytics' ||
    node.componentId === 'person' ||
    node.componentId === 'configuration' ||
    node.componentId === 'cloud' ||
    node.componentId === 'archive' ||
    node.componentId === 'artificialIntelligence' ||
    node.componentId === 'multimedia'
  ) {
    return stackedIconVisualBox(box, node);
  }

  return box;
}

function previewAnchorNode(state: WorkbenchState, nodeId: string): AnchorNode | undefined {
  const node = state.nodes.find((item) => item.id === nodeId);
  const box = computeNodeBox(state, nodeId);
  if (!node || !box) {
    return undefined;
  }

  return {
    ...box,
    component: node.componentId as AnchorNode['component'],
    text: node.props.title ?? node.props.text,
    subtitle: node.props.subtitle,
    titleFontSize: node.props.titleFontSize,
    subtitleFontSize: node.props.subtitleFontSize,
    iconType: node.props.iconType,
  };
}

export function computeConnectionPointsForBoxes(
  source: PreviewBox,
  target: PreviewBox,
): Array<{ x: number; y: number }> {
  const { sourceSide, targetSide } = chooseConnectionSides(source, target);
  const start = sidePoint(source, sourceSide);
  const end = sidePoint(target, targetSide);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  if (sourceSide === 'left' || sourceSide === 'right') {
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

export function computeConnectionPoints(
  state: WorkbenchState,
  connection: CanvasConnection,
): Array<{ x: number; y: number }> {
  const source = iconVisualBox(state, connection.fromNodeId);
  const target = iconVisualBox(state, connection.toNodeId);
  if (!source || !target) {
    return [];
  }
  const { sourceSide, targetSide } = chooseConnectionSides(source, target);
  const ratios = computeConnectionAnchorRatios(state, connection.id);
  const sourceAnchorNode = previewAnchorNode(state, connection.fromNodeId);
  const targetAnchorNode = previewAnchorNode(state, connection.toNodeId);
  const sourceAnchorBox = sourceAnchorNode ? connectionAnchorBox(sourceAnchorNode, sourceSide) : source;
  const targetAnchorBox = targetAnchorNode ? connectionAnchorBox(targetAnchorNode, targetSide) : target;
  const start = sidePoint(sourceAnchorBox, sourceSide, ratios.sourceRatio);
  const end = sidePoint(targetAnchorBox, targetSide, ratios.targetRatio);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;

  if (sourceSide === 'left' || sourceSide === 'right') {
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
  }

  return [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
}

export function applyConnectionMarkerInsets(
  points: Array<{ x: number; y: number }>,
  props: Pick<ConnectionProps, 'startMarker' | 'endMarker' | 'arrowSize'>,
): Array<{ x: number; y: number }> {
  if (points.length < 2) {
    return points;
  }
  const next = points.map((point) => ({ ...point }));
  const endInset = previewMarkerInset(props.endMarker, props.arrowSize);
  const startInset = previewMarkerInset(props.startMarker, props.arrowSize);
  if (endInset > 0) {
    next[next.length - 1] = offsetPointToward(
      next[next.length - 1]!,
      next[next.length - 2]!,
      endInset,
    );
  }
  if (startInset > 0) {
    next[0] = offsetPointToward(next[0]!, next[1]!, startInset);
  }
  return next;
}

function previewMarkerInset(marker: ConnectionProps['startMarker'], markerSize: number): number {
  return markerShaftTrim(marker, markerSize);
}

function offsetPointToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0 || distance <= 0) {
    return from;
  }
  const ratio = Math.min(distance / length, 0.5);
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

export function computeConnectionAnchorRatios(
  state: WorkbenchState,
  connectionId: string,
): { sourceRatio: number; targetRatio: number } {
  const endpointGroups = new Map<string, Array<{ connectionId: string; role: 'source' | 'target'; sortCoord: number }>>();

  for (const connection of state.connections) {
    const source = iconVisualBox(state, connection.fromNodeId);
    const target = iconVisualBox(state, connection.toNodeId);
    if (!source || !target) {
      continue;
    }
    const { sourceSide, targetSide } = chooseConnectionSides(source, target);
    const sourceAnchorNode = previewAnchorNode(state, connection.fromNodeId);
    const targetAnchorNode = previewAnchorNode(state, connection.toNodeId);
    const sourceAnchorBox = sourceAnchorNode ? connectionAnchorBox(sourceAnchorNode, sourceSide) : source;
    const targetAnchorBox = targetAnchorNode ? connectionAnchorBox(targetAnchorNode, targetSide) : target;
    const sourceSortCoord = sourceSide === 'left' || sourceSide === 'right'
      ? target.y + target.height / 2
      : target.x + target.width / 2;
    const targetSortCoord = targetSide === 'left' || targetSide === 'right'
      ? source.y + source.height / 2
      : source.x + source.width / 2;
    const endpoints = [
      { nodeId: sourceAnchorBox.id, side: sourceSide, role: 'source' as const, sortCoord: sourceSortCoord },
      { nodeId: targetAnchorBox.id, side: targetSide, role: 'target' as const, sortCoord: targetSortCoord },
    ];

    for (const endpoint of endpoints) {
      const key = `${endpoint.nodeId}:${endpoint.side}`;
      const group = endpointGroups.get(key) ?? [];
      group.push({
        connectionId: connection.id,
        role: endpoint.role,
        sortCoord: endpoint.sortCoord,
      });
      endpointGroups.set(key, group);
    }
  }

  let sourceRatio = 0.5;
  let targetRatio = 0.5;
  for (const group of endpointGroups.values()) {
    group.sort((a, b) =>
      a.sortCoord - b.sortCoord ||
      a.connectionId.localeCompare(b.connectionId) ||
      a.role.localeCompare(b.role)
    );
    group.forEach((endpoint, index) => {
      if (endpoint.connectionId !== connectionId) {
        return;
      }
      const ratio = (index + 1) / (group.length + 1);
      if (endpoint.role === 'source') {
        sourceRatio = ratio;
      } else {
        targetRatio = ratio;
      }
    });
  }

  return { sourceRatio, targetRatio };
}

export function connectionCenter(points: Array<{ x: number; y: number }>): { x: number; y: number } | undefined {
  if (points.length === 0) {
    return undefined;
  }
  if (points.length === 1) {
    return points[0];
  }

  const lengths = points.slice(1).map((point, index) => {
    const previous = points[index]!;
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const totalLength = lengths.reduce((sum, length) => sum + length, 0);
  const midpoint = totalLength / 2;
  let cursor = 0;

  for (let index = 0; index < lengths.length; index++) {
    const length = lengths[index]!;
    if (cursor + length >= midpoint) {
      const start = points[index]!;
      const end = points[index + 1]!;
      const ratio = length === 0 ? 0 : (midpoint - cursor) / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    cursor += length;
  }

  return points.at(-1);
}

export function computeConnectionCenter(
  state: WorkbenchState,
  connectionId: string,
): { x: number; y: number } | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  return connection ? connectionCenter(computeConnectionPoints(state, connection)) : undefined;
}

// Fixed distance an on-line icon sits from the nearer node, independent of its
// own size, so resizing scales it in place rather than sliding it.
const LABEL_ICON_LINE_OFFSET = 40;

// Decide which end of a point list a reference point is nearer to.
function nearestEndOfPoints(
  points: Array<{ x: number; y: number }>,
  point: { x: number; y: number },
): 'source' | 'target' {
  if (points.length < 2) {
    return 'source';
  }
  const source = points[0]!;
  const target = points[points.length - 1]!;
  const sourceDistance = Math.hypot(point.x - source.x, point.y - source.y);
  const targetDistance = Math.hypot(point.x - target.x, point.y - target.y);
  return targetDistance < sourceDistance ? 'target' : 'source';
}

// Decide which end of a connection a point is nearer to. Used once when an icon
// is placed/dragged; the result is persisted so later box moves can't flip it.
export function connectionLabelIconEnd(
  state: WorkbenchState,
  connectionId: string,
  point: { x: number; y: number },
): 'source' | 'target' | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return undefined;
  }
  return nearestEndOfPoints(computeConnectionPoints(state, connection), point);
}

// Room reserved between the node's content and the line ending so the shaft and
// its arrow head always stay visible past the label/icon.
const LABEL_ICON_END_CLEARANCE = 18;

// How far the node's content reaches from the icon centre toward `dir` (a unit
// vector along the terminal segment, pointing at the endpoint). The icon sits at
// the top of the box and the text below it, so the up/down reach differ.
function contentReachTowardEndpoint(
  dir: { x: number; y: number },
  extents: { halfWidth: number; up: number; down: number },
): number {
  const vertical = dir.y >= 0 ? extents.down : extents.up;
  return Math.abs(dir.x) * extents.halfWidth + Math.abs(dir.y) * vertical;
}

export function computeConnectionLabelIconCenter(
  state: WorkbenchState,
  connectionId: string,
  size: { width: number; height: number } = { width: 40, height: 40 },
  preferredPoint?: { x: number; y: number },
  end?: 'source' | 'target',
  // The node's content reach from the icon centre: half its width, and how far
  // the content extends above (icon) and below (text) the icon centre.
  extents?: { halfWidth: number; up: number; down: number },
  // The connection's drawn points (shared-layout edge). When omitted, the points
  // are re-derived locally — kept only as a fallback for callers without a layout.
  pointsOverride?: Array<{ x: number; y: number }>,
): { x: number; y: number } | undefined {
  const connection = state.connections.find((item) => item.id === connectionId);
  if (!connection) {
    return undefined;
  }
  const points = pointsOverride ?? computeConnectionPoints(state, connection);
  void size;
  // A persisted end wins: it keeps the icon on the same side no matter how the
  // connected boxes are moved. Fall back to the nearest-end heuristic only when
  // no end has been recorded yet (e.g. legacy diagrams).
  const resolvedEnd = end
    ?? (preferredPoint && points.length > 1
      ? nearestEndOfPoints(points, preferredPoint)
      : undefined);
  const walk = resolvedEnd === 'target' ? [...points].reverse() : points;

  // Anchor a fixed distance from the chosen end, but push the icon further in if
  // its content (icon + text below) would otherwise reach the endpoint — so the
  // shaft and arrow head always have room, regardless of size or orientation.
  let distance = LABEL_ICON_LINE_OFFSET;
  if (extents && walk.length > 1) {
    const dx = walk[0]!.x - walk[1]!.x;
    const dy = walk[0]!.y - walk[1]!.y;
    const len = Math.hypot(dx, dy) || 1;
    const reach = contentReachTowardEndpoint({ x: dx / len, y: dy / len }, extents);
    distance = Math.max(distance, reach + LABEL_ICON_END_CLEARANCE);
  }

  return pointAlongPath(walk, distance);
}

function pointAlongPath(
  points: Array<{ x: number; y: number }>,
  distance: number,
): { x: number; y: number } | undefined {
  if (points.length === 0) {
    return undefined;
  }
  if (points.length === 1 || distance <= 0) {
    return points[0];
  }

  let remaining = distance;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1]!;
    const end = points[index]!;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (remaining <= length) {
      const ratio = length === 0 ? 0 : remaining / length;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    remaining -= length;
  }

  return points.at(-1);
}

export function computeAttachmentSlots(
  box: PreviewBox,
  side: Side,
  count: number,
): AttachmentSlot[] {
  return Array.from({ length: count }, (_, index) => {
    const ratio = (index + 1) / (count + 1);
    const point = sidePoint(box, side, ratio);
    return {
      nodeId: box.id,
      side,
      index: index + 1,
      label: `${side}-${index + 1}`,
      ...point,
    };
  });
}

export function computeSceneAttachmentSlots(state: WorkbenchState): AttachmentSlot[] {
  const groups = new Map<string, { box: PreviewBox; side: Side; count: number }>();
  for (const connection of state.connections) {
    const source = iconVisualBox(state, connection.fromNodeId);
    const target = iconVisualBox(state, connection.toNodeId);
    if (!source || !target) {
      continue;
    }
    const { sourceSide, targetSide } = chooseConnectionSides(source, target);
    const sourceAnchorNode = previewAnchorNode(state, connection.fromNodeId);
    const targetAnchorNode = previewAnchorNode(state, connection.toNodeId);
    for (const endpoint of [
      {
        box: sourceAnchorNode ? connectionAnchorBox(sourceAnchorNode, sourceSide) : source,
        side: sourceSide,
      },
      {
        box: targetAnchorNode ? connectionAnchorBox(targetAnchorNode, targetSide) : target,
        side: targetSide,
      },
    ]) {
      const key = `${endpoint.box.id}:${endpoint.side}`;
      const existing = groups.get(key);
      groups.set(key, {
        box: endpoint.box,
        side: endpoint.side,
        count: (existing?.count ?? 0) + 1,
      });
    }
  }
  return [...groups.values()].flatMap((group) =>
    computeAttachmentSlots(group.box, group.side, group.count),
  );
}
