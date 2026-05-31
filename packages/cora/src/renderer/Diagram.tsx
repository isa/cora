import type { DiagramComponent, LayoutedDiagram, LayoutedNode, ThemeShapeStyle, ThemeTokens } from '../layout-ir.js';
import {
  ApiNode,
  AnalyticsNode,
  AppNode,
  ConfigurationNode,
  DatabaseNode,
  DecisionNode,
  EdgeLabel,
  Group,
  IconNode,
  LabelIconNode,
  LabelNode,
  Line,
  LineMarkerDefs,
  ArchiveNode,
  ArtificialIntelligenceNode,
  MultimediaNode,
  CloudNode,
  DocumentNode,
  PeopleNode,
  PersonNode,
  WebsiteNode,
  WarningIcon,
  BUILTIN_ICON_REGISTRY,
} from './components/index.js';
import type { SvgIconComponent } from './components/index.js';
import { BoxNode } from './components/nodes/BoxNode.js';
import {
  edgeBridgeMaskPathData,
  edgeLineMarkerPoints,
  edgeLinePathData,
} from './components/edges/edgePath.js';
import { computeViewBox } from './viewBox.js';
import { catalogDefaultProps } from './themes/componentDefaults.js';
import { iconifyIconForNode } from './iconify.js';

export interface DiagramProps {
  diagram: LayoutedDiagram;
}

function resolveNodeIcon(node: LayoutedNode): SvgIconComponent {
  if (node.provider === 'default' && node.service) {
    const icon = BUILTIN_ICON_REGISTRY[node.service];
    if (icon) return icon;
  }
  return iconifyIconForNode(node) ?? WarningIcon;
}

function renderNode(node: LayoutedNode, diagram: LayoutedDiagram) {
  const component = node.component ?? 'box';
  const icon = resolveNodeIcon(node);
  const shapeStyle =
    node.resolvedStyle ??
    diagram.theme.shapes[component] ??
    diagram.theme.shapes.box!;

  const catalogProps = nodeCatalogProps(
    node,
    shapeStyle,
    component as DiagramComponent,
    diagram.theme,
  );

  switch (component) {
    case 'label':
      return <LabelNode key={node.id} {...catalogProps} backgroundColor="transparent" borderStyle="none" />;
    case 'icon':
      return (
        <IconNode
          key={node.id}
          x={node.x}
          y={node.y}
          size={{ width: node.measuredWidth, height: node.measuredHeight }}
          iconColor={catalogProps.iconColor}
          fontFamily={catalogProps.fontFamily}
          icon={icon}
          title={node.label}
        />
      );
    case 'labelIcon':
      return <LabelIconNode key={node.id} {...catalogProps} icon={icon} />;
    case 'website':
      return <WebsiteNode key={node.id} {...catalogProps} />;
    case 'document':
      return <DocumentNode key={node.id} {...catalogProps} />;
    case 'api':
      return <ApiNode key={node.id} {...catalogProps} />;
    case 'database':
      return <DatabaseNode key={node.id} {...catalogProps} />;
    case 'app':
      return <AppNode key={node.id} {...catalogProps} />;
    case 'decision':
      return <DecisionNode key={node.id} {...catalogProps} />;
    case 'analytics':
      return <AnalyticsNode key={node.id} {...catalogProps} />;
    case 'person':
      return <PersonNode key={node.id} {...catalogProps} />;
    case 'people':
      return <PeopleNode key={node.id} {...catalogProps} />;
    case 'configuration':
      return <ConfigurationNode key={node.id} {...catalogProps} />;
    case 'cloud':
      return <CloudNode key={node.id} {...catalogProps} />;
    case 'archive':
      return <ArchiveNode key={node.id} {...catalogProps} />;
    case 'artificialIntelligence':
      return <ArtificialIntelligenceNode key={node.id} {...catalogProps} />;
    case 'multimedia':
      return <MultimediaNode key={node.id} {...catalogProps} />;
    case 'box':
    default:
      return <BoxNode key={node.id} node={node} theme={diagram.theme} />;
  }
}

function borderStyleFor(style: ThemeShapeStyle): 'none' | 'solid' | 'dashed' | 'dotted' {
  if (style.stroke === 'none' || style.strokeWidth === 0) {
    return 'none';
  }
  if (style.strokeDasharray) {
    return 'dashed';
  }
  return 'solid';
}

const ICON_TINT_COMPONENTS = new Set<DiagramComponent>([
  'icon',
  'labelIcon',
  'document',
  'api',
  'database',
  'app',
  'decision',
  'analytics',
  'person',
  'people',
  'configuration',
  'cloud',
  'archive',
  'artificialIntelligence',
  'multimedia',
]);

const NO_BORDER_COMPONENTS = new Set<DiagramComponent>([
  ...ICON_TINT_COMPONENTS,
  'website',
]);

const NO_SHADOW_COMPONENTS = NO_BORDER_COMPONENTS;

function isTransparentFill(fill: string | undefined): boolean {
  return fill === undefined || fill === 'none' || fill === 'transparent';
}

function nodeCatalogProps(
  node: LayoutedNode,
  style: ThemeShapeStyle,
  component: DiagramComponent,
  theme: ThemeTokens,
) {
  const defaults = catalogDefaultProps(component);
  const styleOverrides = node.style ?? {};
  const resolvedStyle = node.resolvedStyle ?? style;
  const transparentFill = isTransparentFill(resolvedStyle.fill);
  const props = {
    x: node.x,
    y: node.y,
    size: { width: node.measuredWidth, height: node.measuredHeight },
    backgroundColor: transparentFill && ICON_TINT_COMPONENTS.has(component)
      ? 'transparent'
      : resolvedStyle.fill,
    borderColor: resolvedStyle.stroke,
    borderWidth: resolvedStyle.strokeWidth ?? defaults.borderWidth,
    borderStyle: borderStyleFor(resolvedStyle),
    text: node.label,
    textColor: resolvedStyle.labelFill ?? theme.nodeLabel.fill,
    radius: defaults.radius,
    titleFontSize: theme.nodeLabel.fontSize,
    subtitleFontSize: defaults.subtitleFontSize,
    fontFamily:
      typeof styleOverrides.fontFamily === 'string'
        ? styleOverrides.fontFamily
        : theme.fontFamily,
    skeletonColor: resolvedStyle.skeletonColor ?? defaults.skeletonColor,
    iconColor: resolvedStyle.iconColor ?? defaults.iconColor,
    windowColor: resolvedStyle.windowColor ?? defaults.windowColor,
    windowBarColor: resolvedStyle.windowBarColor ?? defaults.windowBarColor,
    windowAddressBarColor: resolvedStyle.windowAddressBarColor ?? defaults.windowAddressBarColor,
    shadow: resolvedStyle.shadow ? ('cast' as const) : ('none' as const),
    shadowColor: resolvedStyle.shadow,
  };

  if (NO_BORDER_COMPONENTS.has(component)) {
    props.borderColor = 'transparent';
    props.borderWidth = 0;
    props.borderStyle = 'none';
  }

  if (NO_SHADOW_COMPONENTS.has(component)) {
    props.shadow = 'none';
    props.shadowColor = undefined;
  }

  return props;
}

export function Diagram({ diagram }: DiagramProps) {
  const viewBox = computeViewBox(diagram);
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);

  return (
    <svg viewBox={viewBox}>
      <defs>
        <filter
          id="cora-shadow-blur"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
      >
          <feGaussianBlur stdDeviation={diagram.theme.shadowBlur} />
        </filter>
        <LineMarkerDefs color={diagram.theme.edge.stroke} />
      </defs>
      <rect x={vx} y={vy} width={vw} height={vh} fill={diagram.theme.background} />
      <g id="groups">
        {(diagram.groups ?? []).map((group) => (
          <Group key={group.id} group={group} theme={diagram.theme} />
        ))}
      </g>
      <g id="nodes">
        {diagram.nodes.map((node) => renderNode(node, diagram))}
      </g>
      <g id="edges">
        {diagram.edges.map((edge) => (
          <Line
            key={`${edge.from}-${edge.to}-${edge.label ?? ''}`}
            points={edgeLineMarkerPoints(edge)}
            pathData={edgeLinePathData(edge, { trimForMarkers: true })}
            strokeColor={diagram.theme.edge.stroke}
            strokeWidth={diagram.theme.edge.strokeWidth}
          />
        ))}
        {diagram.edges.map((edge) => (
          <Line
            key={`markers-${edge.from}-${edge.to}-${edge.label ?? ''}`}
            points={edgeLineMarkerPoints(edge)}
            strokeColor="transparent"
            strokeWidth={0.001}
            startMarker={edge.startMarker ?? 'none'}
            endMarker={edge.endMarker ?? 'arrow'}
          />
        ))}
      </g>
      <g id="edge-bridge-masks">
        {diagram.edges.map((edge) => {
          const bridgeMaskPathData = edgeBridgeMaskPathData(edge);
          return bridgeMaskPathData ? (
            <Line
              key={`bridge-mask-${edge.from}-${edge.to}-${edge.label ?? ''}`}
              points={edgeLineMarkerPoints(edge)}
              pathData={bridgeMaskPathData}
              strokeColor={diagram.theme.background}
              strokeWidth={diagram.theme.edge.strokeWidth + 3}
            />
          ) : null;
        })}
      </g>
      <g id="edge-bridges">
        {diagram.edges.map((edge) => {
          const bridgePathData = edgeBridgeMaskPathData(edge);
          return bridgePathData ? (
            <Line
              key={`bridge-${edge.from}-${edge.to}-${edge.label ?? ''}`}
              points={edgeLineMarkerPoints(edge)}
              pathData={bridgePathData}
              strokeColor={diagram.theme.edge.stroke}
              strokeWidth={diagram.theme.edge.strokeWidth}
            />
          ) : null;
        })}
      </g>
      <g id="edge-labels">
        {diagram.edges.map((edge) => (
          <EdgeLabel
            key={`label-${edge.from}-${edge.to}-${edge.label ?? ''}`}
            edge={edge}
            theme={diagram.theme}
          />
        ))}
      </g>
    </svg>
  );
}
