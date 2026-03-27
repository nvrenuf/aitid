export const PRODUCT_ROUTES = [
  {
    id: 'overview',
    href: '/overview',
    label: 'Overview',
    kicker: 'Operational posture',
    description: 'Live posture, active queue, and model-linked exposure.',
  },
  {
    id: 'threat-map',
    href: '/threat-map',
    label: 'Threat Map',
    kicker: 'Observed geography',
    description: 'Observed regional infrastructure and exposure, kept intentionally conservative.',
  },
  {
    id: 'threats',
    href: '/threats',
    label: 'Threats',
    kicker: 'Threat queue',
    description: 'Severity-led scanning and prioritization across tracked threats.',
  },
  {
    id: 'research',
    href: '/research',
    label: 'Research',
    kicker: 'Method and cadence',
    description: 'Method, cadence, and source discipline behind the current corpus.',
  },
];

export function getRouteMeta(pathname: string) {
  return PRODUCT_ROUTES.find((route) => route.href === pathname) ?? PRODUCT_ROUTES[0];
}
