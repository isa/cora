import type { BoxStyleProps } from '../types.js';
import {
  CatalogShadow,
  CatalogText,
  resolvedCatalogFrame,
} from './shared.js';

export interface WebsiteNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
}

function scaled(value: number, scale: number, offset: number) {
  return offset + value * scale;
}

function hexRgb(color: string): [number, number, number] | undefined {
  const match = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return undefined;
  const hex = match[1]!;
  return [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(color: string): number | undefined {
  const rgb = hexRgb(color);
  if (!rgb) return undefined;

  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(colorA: string, colorB: string): number {
  const a = luminance(colorA);
  const b = luminance(colorB);
  if (a === undefined || b === undefined) return 0;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function skeletonColorForFill(fill: string) {
  return contrastRatio(fill, '#1c1d1a') >= contrastRatio(fill, '#ffffff')
    ? '#1c1d1a'
    : '#ffffff';
}

function resolveSkeletonColor(fill: string, requested?: string) {
  if (requested) {
    return { color: requested, auto: false };
  }

  return { color: skeletonColorForFill(fill), auto: true };
}

export function WebsiteNode(props: WebsiteNodeProps) {
  const frame = resolvedCatalogFrame({
    fallbackSize: { width: 144, height: 160 },
    backgroundColor: '#ffffff',
    borderColor: '#1c1d1a',
    subtitleColor: '#b5b5b5',
    ...props,
  });
  const hasLabel = Boolean(frame.text || frame.subtitle);
  const labelHeight = hasLabel ? Math.min(28, frame.height * 0.18) : 0;
  const artHeight = frame.height - labelHeight;
  const scale = Math.min(frame.width / 800, artHeight / 800);
  const artWidth = 800 * scale;
  const scaledArtHeight = 800 * scale;
  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + (artHeight - scaledArtHeight) / 2;
  const pageFill = frame.backgroundColor;
  const chromeColor = frame.borderColor ?? '#1c1d1a';
  const controlFill = '#ffffff';
  const skeleton = resolveSkeletonColor(pageFill, props.skeletonColor);
  const s = (value: number, offset: number) => scaled(value, scale, offset);

  return (
    <g>
      <CatalogShadow
        x={offsetX + 100 * scale}
        y={offsetY + 150 * scale}
        width={600 * scale}
        height={560 * scale}
        radius={20 * scale}
        fill={pageFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <path
        d={[
          `M ${s(100, offsetX)} ${s(170, offsetY)}`,
          `C ${s(100, offsetX)} ${s(159, offsetY)} ${s(109, offsetX)} ${s(150, offsetY)} ${s(120, offsetX)} ${s(150, offsetY)}`,
          `L ${s(680, offsetX)} ${s(150, offsetY)}`,
          `C ${s(691, offsetX)} ${s(150, offsetY)} ${s(700, offsetX)} ${s(159, offsetY)} ${s(700, offsetX)} ${s(170, offsetY)}`,
          `L ${s(700, offsetX)} ${s(690, offsetY)}`,
          `C ${s(700, offsetX)} ${s(701, offsetY)} ${s(691, offsetX)} ${s(710, offsetY)} ${s(680, offsetX)} ${s(710, offsetY)}`,
          `L ${s(120, offsetX)} ${s(710, offsetY)}`,
          `C ${s(109, offsetX)} ${s(710, offsetY)} ${s(100, offsetX)} ${s(701, offsetY)} ${s(100, offsetX)} ${s(690, offsetY)}`,
          'Z',
        ].join(' ')}
        fill={pageFill}
        stroke={chromeColor}
        strokeWidth={13 * scale}
        strokeLinejoin="round"
      />
      <path
        d={[
          `M ${s(100, offsetX)} ${s(170, offsetY)}`,
          `C ${s(100, offsetX)} ${s(159, offsetY)} ${s(109, offsetX)} ${s(150, offsetY)} ${s(120, offsetX)} ${s(150, offsetY)}`,
          `L ${s(680, offsetX)} ${s(150, offsetY)}`,
          `C ${s(691, offsetX)} ${s(150, offsetY)} ${s(700, offsetX)} ${s(159, offsetY)} ${s(700, offsetX)} ${s(170, offsetY)}`,
          `L ${s(700, offsetX)} ${s(230, offsetY)}`,
          `L ${s(100, offsetX)} ${s(230, offsetY)}`,
          'Z',
        ].join(' ')}
        fill={chromeColor}
      />
      {[140, 185, 230].map((cx) => (
        <circle
          key={cx}
          cx={s(cx, offsetX)}
          cy={s(190, offsetY)}
          r={14 * scale}
          fill={controlFill}
        />
      ))}
      <rect
        x={s(275, offsetX)}
        y={s(171, offsetY)}
        width={400 * scale}
        height={38 * scale}
        rx={10 * scale}
        fill={controlFill}
      />
      <g fill={skeleton.color} opacity={skeleton.auto ? 0.52 : undefined}>
        <rect x={s(140, offsetX)} y={s(275, offsetY)} width={150 * scale} height={30 * scale} />
        <rect x={s(550, offsetX)} y={s(275, offsetY)} width={110 * scale} height={30 * scale} />
        <rect x={s(140, offsetX)} y={s(331, offsetY)} width={360 * scale} height={13 * scale} />
        <rect x={s(140, offsetX)} y={s(363, offsetY)} width={350 * scale} height={13 * scale} />
        <rect x={s(140, offsetX)} y={s(395, offsetY)} width={350 * scale} height={13 * scale} />
        <rect x={s(140, offsetX)} y={s(427, offsetY)} width={235 * scale} height={13 * scale} />
        <rect x={s(512, offsetX)} y={s(331, offsetY)} width={148 * scale} height={148 * scale} />
        <rect x={s(142, offsetX)} y={s(495, offsetY)} width={110 * scale} height={33 * scale} />
        <rect x={s(142, offsetX)} y={s(552, offsetY)} width={140 * scale} height={103 * scale} />
        <rect x={s(310, offsetX)} y={s(555, offsetY)} width={220 * scale} height={13 * scale} />
        <rect x={s(310, offsetX)} y={s(587, offsetY)} width={350 * scale} height={13 * scale} />
        <rect x={s(310, offsetX)} y={s(619, offsetY)} width={350 * scale} height={13 * scale} />
        <rect x={s(310, offsetX)} y={s(651, offsetY)} width={210 * scale} height={13 * scale} />
      </g>
      <CatalogText
        x={frame.x}
        y={frame.y + frame.height - labelHeight}
        width={frame.width}
        height={labelHeight}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize}
        subtitleFontSize={frame.subtitleFontSize}
      />
    </g>
  );
}
