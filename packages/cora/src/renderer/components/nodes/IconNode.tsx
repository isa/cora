import type { SvgIconComponent } from '../icons.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import type { BoxStyleProps, ComponentSize } from '../types.js';
import { CatalogIconSlot, CatalogShadow, CatalogText, resolvedCatalogFrame } from './shared.js';
import { APP_SIZE_PRESETS, ICON_NODE_ART_SIZE, iconNodeScale, resolveAppComponentSize } from '../styles.js';

export interface IconNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  size?: ComponentSize;
  strokeColor?: string;
  iconColor?: string;
  icon: SvgIconComponent;
  title?: string;
  subtitle?: string;
}

export function IconNode({
  icon,
  iconColor,
  strokeColor = 'currentColor',
  ...props
}: IconNodeProps) {
  const resolvedSize = resolveAppComponentSize(props.size, APP_SIZE_PRESETS.lg);
  const frame = resolvedCatalogFrame({
    ...props,
    size: resolvedSize,
  });
  const ratio = iconNodeScale(frame);

  const hasText = Boolean(frame.text || frame.subtitle);
  const titleFontSize = (frame.titleFontSize ?? 13) * ratio;
  const subtitleFontSize = (frame.subtitleFontSize ?? Math.max(8, (frame.titleFontSize ?? 13) - 2)) * ratio;
  const textHeight = hasText
    ? resolveCatalogTextLayout({
        text: frame.text,
        subtitle: frame.subtitle,
        width: frame.width - 16,
        fontSize: titleFontSize,
        subtitleFontSize,
      }).totalHeight
    : 0;
  const iconGap = (hasText ? 6 : 0) * ratio;

  const iconSize = ICON_NODE_ART_SIZE * ratio;
  const iconX = frame.x + (frame.width - iconSize) / 2;
  const iconY = frame.y + (hasText ? 6 * ratio : (frame.height - iconSize) / 2);
  const textY = iconY + iconSize + iconGap;
  const shadowFill = frame.backgroundColor === 'transparent' ? '#ffffff' : frame.backgroundColor;

  return (
    <g>
      <CatalogShadow
        x={iconX}
        y={iconY}
        width={iconSize}
        height={iconSize}
        radius={10 * ratio}
        fill={shadowFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <CatalogIconSlot
        icon={icon}
        x={iconX}
        y={iconY}
        size={iconSize}
        color={iconColor ?? strokeColor}
        title={frame.text}
      />
      {hasText ? (
        <CatalogText
          x={frame.x + 8}
          y={textY}
          width={frame.width - 16}
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
      ) : null}
    </g>
  );
}
