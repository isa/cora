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
    primary: TAILWIND.slate[900],
    muted: TAILWIND.slate[500],
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
    decision: {
      fill: TAILWIND.amber[200],
      stroke: TAILWIND.amber[500],
    },
    issue: {
      fill: TAILWIND.rose[200],
      stroke: TAILWIND.rose[500],
    },
    page: {
      fill: TAILWIND.sky[200],
      stroke: TAILWIND.sky[500],
    },
    app: {
      fill: TAILWIND.emerald[200],
      stroke: TAILWIND.emerald[500],
    },
    website: {
      fill: TAILWIND.white,
      stroke: '#1c1d1a',
    },
    shape: {
      fill: TAILWIND.teal[200],
      stroke: TAILWIND.teal[500],
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
