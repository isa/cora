import type { BoxStyleProps } from '../types.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import {
  APP_ICON_VIEW_HEIGHT,
  APP_ICON_VIEW_WIDTH,
  APP_SIZE_PRESETS,
  ICON_NODE_ART_SIZE,
  iconNodeScale,
  resolveAppComponentSize,
} from '../styles.js';
import {
  CatalogShadow,
  CatalogText,
  resolvedCatalogFrame,
} from './shared.js';

export interface AppNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

// majesticons:iphone-old-apps (MIT), adapted — taller frame, home button pinned to bottom.
const IPHONE_OLD_APPS_PATH = [
  'M5 5a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z',
  'm3 1.001a1 1 0 0 0 2 0V6a1 1 0 1 0-2 0',
  'm4 1a1 1 0 0 1-1-1V6a1 1 0 1 1 2 0v.001a1 1 0 0 1-1 1',
  'm2-1a1 1 0 1 0 2 0V6a1 1 0 1 0-2 0',
  'm-5 4a1 1 0 0 1-1-1V9a1 1 0 1 1 2 0v.001a1 1 0 0 1-1 1',
  'm2-1a1 1 0 1 0 2 0V9a1 1 0 1 0-2 0',
  'm4 1a1 1 0 0 1-1-1V9a1 1 0 1 1 2 0v.001a1 1 0 0 1-1 1',
  'm-7 2a1 1 0 1 0 2 0V12a1 1 0 1 0-2 0',
  'm4 1a1 1 0 0 1-1-1V12a1 1 0 1 1 2 0v.001a1 1 0 0 1-1 1',
  'M11 23a1 1 0 1 0 2 0a1 1 0 1 0-2 0',
].join('');

function IphoneOldAppsIcon({
  x = 0,
  y = 0,
  width,
  height,
  color,
  title,
}: {
  x?: number;
  y?: number;
  width: number;
  height: number;
  color: string;
  title?: string;
}) {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox={`0 0 ${APP_ICON_VIEW_WIDTH} ${APP_ICON_VIEW_HEIGHT}`}
      color={color}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path fillRule="evenodd" clipRule="evenodd" d={IPHONE_OLD_APPS_PATH} />
    </svg>
  );
}

export function AppNode(props: AppNodeProps) {
  const resolvedSize = resolveAppComponentSize(props.size, APP_SIZE_PRESETS.lg);
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = iconNodeScale(frame);

  const hasLabel = Boolean(frame.text || frame.subtitle);
  const titleFontSize = (frame.titleFontSize ?? 12) * ratio;
  const subtitleFontSize = (frame.subtitleFontSize ?? Math.max(8, (frame.titleFontSize ?? 12) - 2)) * ratio;
  const textHeight = hasLabel
    ? resolveCatalogTextLayout({
        text: frame.text,
        subtitle: frame.subtitle,
        width: frame.width,
        fontSize: titleFontSize,
        subtitleFontSize,
      }).totalHeight
    : 0;
  const labelGap = (hasLabel ? 8 : 0) * ratio;
  const topPadding = (hasLabel ? 6 : 0) * ratio;
  const bottomPadding = (hasLabel ? 6 : 0) * ratio;

  const iconWidth = ICON_NODE_ART_SIZE * ratio;
  const iconHeight = iconWidth * (APP_ICON_VIEW_HEIGHT / APP_ICON_VIEW_WIDTH);
  const iconX = frame.x + (frame.width - iconWidth) / 2;
  const iconY = frame.y + topPadding + (frame.height - iconHeight - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const textY = iconY + iconHeight + labelGap;
  const iconColor = frame.borderColor ?? '#000000';
  const shadowFill = frame.backgroundColor === 'transparent' ? '#ffffff' : frame.backgroundColor;

  return (
    <g>
      <CatalogShadow
        x={iconX}
        y={iconY}
        width={iconWidth}
        height={iconHeight}
        radius={10 * ratio}
        fill={shadowFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <IphoneOldAppsIcon
        x={iconX}
        y={iconY}
        width={iconWidth}
        height={iconHeight}
        color={iconColor}
        title={frame.text}
      />
      <CatalogText
        x={frame.x}
        y={textY}
        width={frame.width}
        height={textHeight}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={titleFontSize}
        subtitleFontSize={subtitleFontSize}
        fontFamily={frame.fontFamily}
        fontWeight={frame.titleBold ? 700 : 400}
        subtitleFontWeight={frame.subtitleBold ? 700 : 400}
      />
    </g>
  );
}
