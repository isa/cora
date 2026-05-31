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
      iconColor: TAILWIND.yellow[500],
    },
    app: {
      iconColor: TAILWIND.rose[500],
    },
    api: {
      iconColor: TAILWIND.amber[500],
    },
    database: {
      iconColor: TAILWIND.emerald[500],
    },
    decision: {
      iconColor: TAILWIND.sky[500],
    },
    analytics: {
      iconColor: TAILWIND.violet[500],
    },
    person: {
      iconColor: TAILWIND.sky[500],
    },
    people: {
      iconColor: TAILWIND.violet[600],
    },
    configuration: {
      iconColor: TAILWIND.slate[600],
    },
    cloud: {
      iconColor: TAILWIND.sky[500],
    },
    archive: {
      iconColor: TAILWIND.amber[600],
    },
    artificialIntelligence: {
      iconColor: TAILWIND.violet[600],
    },
    multimedia: {
      iconColor: TAILWIND.rose[500],
    },
    website: {
      fill: TAILWIND.white,
      skeleton: TAILWIND.slate[400],
      window: TAILWIND.slate[300],
      windowBar: '#e8eaed',
      windowAddress: TAILWIND.white,
    },
    icon: {
      iconColor: TAILWIND.violet[500],
    },
    labelIcon: {
      iconColor: TAILWIND.violet[500],
    },
  },
} as const;
