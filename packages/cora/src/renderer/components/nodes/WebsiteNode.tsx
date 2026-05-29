import type { BoxStyleProps } from '../types.js';
import { resolveCatalogTextLayout } from '../../../core/catalogTextLayout.js';
import { resolveWebsiteComponentSize, WEBSITE_SIZE_PRESETS, PRODUCT_FRAME_INSET } from '../styles.js';
import {
  CatalogShadow,
  CatalogText,
  resolvedCatalogFrame,
} from './shared.js';

export interface WebsiteNodeProps extends BoxStyleProps {
  x?: number;
  y?: number;
  skeletonColor?: string;
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

function isLightPage(pageFill: string) {
  const lum = luminance(pageFill);
  return lum === undefined || lum >= 0.45;
}

const BROWSER_TRAFFIC_LIGHTS = ['#ff5f57', '#febc2e', '#28c840'] as const;

const LIGHT_BROWSER_CHROME = {
  frame: '#cbd5e1',
  bar: '#e8eaed',
  addressBar: '#ffffff',
};

const DARK_BROWSER_CHROME = {
  frame: '#71717a',
  bar: '#52525b',
  addressBar: '#3f3f46',
};

function roundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
  const right = x + width;
  const bottom = y + height;
  const r = Math.min(radius, width / 2, height / 2);

  return [
    `M ${x + r} ${y}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${y + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${bottom - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function headerPath(x: number, y: number, width: number, height: number, radius: number) {
  const right = x + width;
  const bottom = y + height;
  const r = Math.min(radius, width / 2, height);

  return [
    `M ${x} ${bottom}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${y + r}`,
    `V ${bottom}`,
    'Z',
  ].join(' ');
}

const ART_BOUNDS = {
  x: 88,
  y: 138,
  width: 624,
  height: 584,
};

export function WebsiteNode(props: WebsiteNodeProps) {
  const fallbackSize = WEBSITE_SIZE_PRESETS.lg;
  const frame = resolvedCatalogFrame({
    fallbackSize,
    backgroundColor: '#ffffff',
    borderColor: '#334155',
    subtitleColor: '#b5b5b5',
    ...props,
    size: resolveWebsiteComponentSize(props.size, fallbackSize),
  });
  const hasLabel = Boolean(frame.text || frame.subtitle);
  const titleFontSize = frame.titleFontSize ?? 12;
  const subtitleFontSize = frame.subtitleFontSize ?? Math.max(8, titleFontSize - 2);
  const textHeight = hasLabel
    ? resolveCatalogTextLayout({
        text: frame.text,
        subtitle: frame.subtitle,
        width: frame.width,
        fontSize: titleFontSize,
        subtitleFontSize,
      }).totalHeight
    : 0;
  const labelGap = hasLabel ? 8 : 0;
  const topPadding = hasLabel ? 6 : 0;
  const bottomPadding = hasLabel ? 6 : 0;
  const artHeight = Math.max(24, frame.height - textHeight - labelGap - topPadding - bottomPadding);
  const scale = Math.min(frame.width / ART_BOUNDS.width, artHeight / ART_BOUNDS.height);
  const artWidth = ART_BOUNDS.width * scale;
  const scaledArtHeight = ART_BOUNDS.height * scale;
  const offsetX = frame.x + (frame.width - artWidth) / 2;
  const offsetY = frame.y + topPadding + (artHeight - scaledArtHeight) / 2;
  const sx = (value: number) => scaled(value - ART_BOUNDS.x, scale, offsetX);
  const sy = (value: number) => scaled(value - ART_BOUNDS.y, scale, offsetY);
  const textY = sy(710) + labelGap;
  const remainingTextHeight = Math.max(textHeight, frame.y + frame.height - textY - bottomPadding);
  const pageFill = frame.backgroundColor;
  const lightPage = isLightPage(pageFill);
  const chrome = lightPage ? LIGHT_BROWSER_CHROME : DARK_BROWSER_CHROME;
  const trafficLightFills = BROWSER_TRAFFIC_LIGHTS;
  const skeleton = resolveSkeletonColor(
    pageFill,
    props.skeletonColor ?? '#e2e8f0',
  );
  const windowX = sx(100);
  const windowY = sy(150);
  const windowWidth = sx(700) - windowX;
  const windowHeight = sy(710) - windowY;
  const windowRadius = 20 * scale;
  const borderWidth = PRODUCT_FRAME_INSET * scale;
  const outerPath = roundedRectPath(windowX, windowY, windowWidth, windowHeight, windowRadius);
  const innerX = windowX + borderWidth;
  const innerY = windowY + borderWidth;
  const innerWidth = windowWidth - borderWidth * 2;
  const innerHeight = windowHeight - borderWidth * 2;
  const innerRadius = Math.max(0, windowRadius - borderWidth);
  const innerPath = roundedRectPath(innerX, innerY, innerWidth, innerHeight, innerRadius);
  const chromeHeight = sy(230) - innerY;
  const chromePath = headerPath(innerX, innerY, innerWidth, chromeHeight, innerRadius);

  return (
    <g>
      <CatalogShadow
        x={windowX}
        y={windowY}
        width={windowWidth}
        height={windowHeight}
        radius={windowRadius}
        fill={pageFill}
        shadow={frame.shadow}
        shadowColor={frame.shadowColor}
      />
      <path d={outerPath} fill={chrome.frame} />
      <path d={innerPath} fill={pageFill} />
      <path d={chromePath} fill={chrome.bar} />
      {[140, 185, 230].map((cx, index) => (
        <circle
          key={cx}
          cx={sx(cx)}
          cy={sy(190)}
          r={14 * scale}
          fill={trafficLightFills[index]}
        />
      ))}
      <rect
        x={sx(275)}
        y={sy(171)}
        width={400 * scale}
        height={38 * scale}
        rx={10 * scale}
        fill={chrome.addressBar}
      />
      <g fill={skeleton.color} opacity={skeleton.auto ? 0.52 : undefined}>
        <rect x={sx(140)} y={sy(275)} width={150 * scale} height={30 * scale} />
        <rect x={sx(550)} y={sy(275)} width={110 * scale} height={30 * scale} />
        <rect x={sx(140)} y={sy(331)} width={350 * scale} height={13 * scale} />
        <rect x={sx(140)} y={sy(363)} width={350 * scale} height={13 * scale} />
        <rect x={sx(140)} y={sy(395)} width={350 * scale} height={13 * scale} />
        <rect x={sx(140)} y={sy(427)} width={235 * scale} height={13 * scale} />
        <rect x={sx(512)} y={sy(331)} width={148 * scale} height={148 * scale} />
        <rect x={sx(142)} y={sy(495)} width={110 * scale} height={33 * scale} />
        <rect x={sx(142)} y={sy(552)} width={140 * scale} height={103 * scale} />
        <rect x={sx(310)} y={sy(555)} width={220 * scale} height={13 * scale} />
        <rect x={sx(310)} y={sy(587)} width={350 * scale} height={13 * scale} />
        <rect x={sx(310)} y={sy(619)} width={350 * scale} height={13 * scale} />
        <rect x={sx(310)} y={sy(651)} width={210 * scale} height={13 * scale} />
      </g>
      <CatalogText
        x={frame.x}
        y={textY}
        width={frame.width}
        height={remainingTextHeight}
        text={frame.text}
        subtitle={frame.subtitle}
        color={frame.textColor}
        subtitleColor={frame.subtitleColor}
        fontSize={frame.titleFontSize}
        subtitleFontSize={frame.subtitleFontSize}
        fontWeight={frame.titleBold ? 700 : 400}
        subtitleFontWeight={frame.subtitleBold ? 700 : 400}
      />
    </g>
  );
}
