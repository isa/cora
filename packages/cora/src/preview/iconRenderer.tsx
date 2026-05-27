import { useEffect, useState } from 'react';
import { iconToSVG } from '@iconify/utils/lib/svg/build';
import { getIconData } from '@iconify/utils/lib/icon-set/get-icon';
import type { IconifyIcon, IconifyJSON } from '@iconify/types';

import { parseIconReference } from '../core/iconify.js';
import { ErrorIcon, type SvgIconComponent, type SvgIconProps } from '../renderer/components/icons.js';

interface RenderedIconSvg {
  body: string;
  viewBox: string;
}

const collectionCache = new Map<string, Promise<IconifyJSON | undefined>>();
const iconDataCache = new Map<string, Promise<IconifyIcon | undefined>>();
const svgCache = new Map<string, Promise<RenderedIconSvg | undefined>>();

function svgStorageKey(iconName: string, size: number): string {
  return `cora.iconify.svg.${size}.${iconName}`;
}

function readStoredSvg(iconName: string, size: number): RenderedIconSvg | undefined {
  try {
    const stored = window.localStorage.getItem(svgStorageKey(iconName, size));
    return stored ? JSON.parse(stored) as RenderedIconSvg : undefined;
  } catch {
    return undefined;
  }
}

function writeStoredSvg(iconName: string, size: number, svg: RenderedIconSvg): void {
  try {
    window.localStorage.setItem(svgStorageKey(iconName, size), JSON.stringify(svg));
  } catch {
    // Ignore quota and privacy-mode failures; in-memory cache still helps.
  }
}

function collectionUrl(prefix: string): string {
  return `https://raw.githubusercontent.com/iconify/icon-sets/master/json/${encodeURIComponent(prefix)}.json`;
}

function loadCollection(prefix: string): Promise<IconifyJSON | undefined> {
  const cached = collectionCache.get(prefix);
  if (cached) {
    return cached;
  }

  const request = fetch(collectionUrl(prefix))
    .then(async (response) => {
      if (!response.ok) {
        return undefined;
      }
      return await response.json() as IconifyJSON;
    })
    .catch(() => undefined);

  collectionCache.set(prefix, request);
  return request;
}

function loadIconData(iconName: string): Promise<IconifyIcon | undefined> {
  const cached = iconDataCache.get(iconName);
  if (cached) {
    return cached;
  }

  const request = Promise.resolve(parseIconReference(iconName))
    .then(async (reference) => {
      if (!reference) {
        return undefined;
      }
      const collection = await loadCollection(reference.prefix);
      return collection ? getIconData(collection, reference.name) ?? undefined : undefined;
    });

  iconDataCache.set(iconName, request);
  return request;
}

function loadIconSvg(iconName: string, size: number): Promise<RenderedIconSvg | undefined> {
  const cacheKey = `${iconName}\0${size}`;
  const cached = svgCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const stored = readStoredSvg(iconName, size);
  if (stored) {
    const request = Promise.resolve(stored);
    svgCache.set(cacheKey, request);
    return request;
  }

  const request = loadIconData(iconName).then((icon) => {
    if (!icon) {
      return undefined;
    }
    const svg = iconToSVG(icon, {
      height: size,
      width: size,
    });
    const rendered = {
      body: svg.body,
      viewBox: svg.attributes.viewBox,
    };
    writeStoredSvg(iconName, size, rendered);
    return rendered;
  });

  svgCache.set(cacheKey, request);
  return request;
}

function RemoteIconifyIcon({
  iconName,
  x = 0,
  y = 0,
  size,
  color,
  title,
  onResolve,
}: SvgIconProps & { iconName: string; onResolve?(loaded: boolean): void }) {
  const [svg, setSvg] = useState<RenderedIconSvg | undefined>();

  useEffect(() => {
    let mounted = true;

    void loadIconSvg(iconName, size).then((resolved) => {
      if (mounted) {
        setSvg(resolved);
        onResolve?.(resolved !== undefined);
      }
    });

    return () => {
      mounted = false;
    };
  }, [iconName, onResolve, size]);

  if (!svg) {
    return null;
  }

  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox={svg.viewBox}
      color={color}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <g dangerouslySetInnerHTML={{ __html: svg.body }} />
    </svg>
  );
}

export function previewIconForName(iconName: string): SvgIconComponent {
  return (props) => <RemoteIconifyIcon iconName={iconName} {...props} />;
}

export function IconifyPreviewIcon(props: SvgIconProps & { iconName: string; onResolve?(loaded: boolean): void }) {
  return <RemoteIconifyIcon {...props} />;
}
