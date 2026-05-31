import type { BoxStyleProps } from '../types.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import {
  ANALYTICS_SIZE_PRESETS,
  ICON_NODE_ART_SIZE,
  iconNodeScale,
  resolveAnalyticsComponentSize,
} from '../styles.js';
import { CatalogText, resolvedCatalogFrame } from './shared.js';

export interface AnalyticsNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  iconColor?: string;
}

const ARTBOARD = 24;
const CHART_PRIMARY_PATH =
  'M14 20.5V4.25c0-.728-.002-1.2-.048-1.546c-.044-.325-.115-.427-.172-.484s-.159-.128-.484-.172C12.949 2.002 12.478 2 11.75 2s-1.2.002-1.546.048c-.325.044-.427.115-.484.172s-.128.159-.172.484c-.046.347-.048.818-.048 1.546V20.5z';
const CHART_SECONDARY_PATH =
  'M8 8.75A.75.75 0 0 0 7.25 8h-3a.75.75 0 0 0-.75.75V20.5H8zm12 5a.75.75 0 0 0-.75-.75h-3a.75.75 0 0 0-.75.75v6.75H20z';
const CHART_AXIS_PATH = 'M1.75 20.5a.75.75 0 0 0 0 1.5h20a.75.75 0 0 0 0-1.5z';

export function AnalyticsNode(props: AnalyticsNodeProps) {
  const resolvedSize = resolveAnalyticsComponentSize(props.size, ANALYTICS_SIZE_PRESETS.lg);
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

  const artSize = ICON_NODE_ART_SIZE * ratio;
  const scale = artSize / ARTBOARD;
  const offsetX = frame.x + (frame.width - artSize) / 2;
  const offsetY = frame.y + topPadding + (frame.height - artSize - textHeight - labelGap - topPadding - bottomPadding) / 2;
  const textY = offsetY + artSize + labelGap;
  const iconColor = props.iconColor ?? '#8b5cf6';

  return (
    <g>
      <g
        transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}
        color={iconColor}
        fill="currentColor"
        aria-label={frame.text}
        role={frame.text ? 'img' : undefined}
      >
        {frame.text ? <title>{frame.text}</title> : null}
        <path d={CHART_PRIMARY_PATH} fillRule="evenodd" clipRule="evenodd" />
        <path d={CHART_SECONDARY_PATH} opacity="0.7" />
        <path d={CHART_AXIS_PATH} opacity="0.5" />
      </g>
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
