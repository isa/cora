import type { SvgIconComponent } from '../../renderer/components/iconTypes.js';
import type { PreviewNodeProps } from '../controls/defaults.js';

let previewMaskCounter = 0;

function nextMaskId(provider: string, service: string): string {
  previewMaskCounter += 1;
  return `preview-icon-${provider}-${service}-${previewMaskCounter}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function createPreviewPackIcon(provider: string, service: string): SvgIconComponent {
  const href = `/icon-packs/${provider}/icons/${service}.svg`;
  const id = nextMaskId(provider, service);

  return function PreviewPackIcon({ x = 0, y = 0, size, color = 'currentColor', title }) {
    return (
      <g
        transform={`translate(${x} ${y})`}
        role={title ? 'img' : undefined}
        aria-label={title}
      >
        {title ? <title>{title}</title> : null}
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={size} height={size} style={{ maskType: 'alpha' }}>
            <image href={href} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
          </mask>
        </defs>
        <rect width={size} height={size} fill={color} mask={`url(#${id})`} />
      </g>
    );
  };
}

export function resolvePreviewIcon(
  props: Pick<PreviewNodeProps, 'provider' | 'service'>,
): SvgIconComponent {
  return createPreviewPackIcon(props.provider ?? 'default', props.service ?? 'warning');
}
