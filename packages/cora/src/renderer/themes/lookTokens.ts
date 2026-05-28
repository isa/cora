import { TAILWIND } from './tailwindPalette.js';

export const LOOK = {
  surface: {
    fill: TAILWIND.white,
    diagram: TAILWIND.slate[50],
  },
  border: {
    default: TAILWIND.slate[300],
    hairline: TAILWIND.slate[200],
  },
  text: {
    primary: TAILWIND.slate[800],
    muted: TAILWIND.slate[400],
    edgeLabel: TAILWIND.slate[600],
    standaloneLabel: TAILWIND.slate[800],
  },
  edge: {
    stroke: TAILWIND.slate[700],
    width: 2,
  },
  group: {
    stroke: TAILWIND.slate[400],
    strokeWidth: 1,
    strokeDasharray: '4 4',
  },
  radius: {
    md: 8,
  },
  components: {
    document: {
      fill: TAILWIND.white,
      stroke: TAILWIND.slate[700],
    },
    app: {
      fill: TAILWIND.white,
      stroke: '#000000',
    },
    api: {
      fill: TAILWIND.white,
      stroke: TAILWIND.slate[700],
      iconColor: TAILWIND.violet[500],
    },
    database: {
      fill: TAILWIND.white,
      stroke: TAILWIND.slate[700],
      iconColor: TAILWIND.violet[500],
    },
    website: {
      fill: TAILWIND.white,
      stroke: TAILWIND.slate[700],
      skeleton: TAILWIND.slate[200],
    },
    icon: {
      iconColor: TAILWIND.violet[500],
    },
    labelIcon: {
      fill: TAILWIND.violet[200],
      stroke: TAILWIND.violet[500],
      iconColor: TAILWIND.violet[600],
    },
  },
} as const;
