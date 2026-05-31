import type { BoxStyleProps } from '../types.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import {
  CLOUD_SIZE_PRESETS,
  ICON_NODE_ART_SIZE,
  iconNodeScale,
  resolveCloudComponentSize,
} from '../styles.js';
import { CatalogText, resolvedCatalogFrame } from './shared.js';

export interface CloudNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  iconColor?: string;
}

/** Material Symbols `cloud` (24×24). */
const ARTBOARD = 24;
const CLOUD_PATH =
  'M6.5 20q-2.275 0-3.887-1.575T1 14.575q0-1.95 1.175-3.475T5.25 9.15q.625-2.3 2.5-3.725T12 4q2.925 0 4.963 2.038T19 11q1.725.2 2.863 1.488T23 15.5q0 1.875-1.312 3.188T18.5 20z';

export function CloudNode(props: CloudNodeProps) {
  const resolvedSize = resolveCloudComponentSize(props.size, CLOUD_SIZE_PRESETS.lg);
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
  const iconColor = props.iconColor ?? '#0ea5e9';

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
        <path d={CLOUD_PATH} />
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
