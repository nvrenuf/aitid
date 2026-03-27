export const PRODUCT_ROUTES = [
  {
    id: 'overview',
    href: '/overview',
    label: 'Overview',
    kicker: 'Operational posture',
    description: 'Leadership scanning, active feed review, and model-linked exposure tracking.',
  },
  {
    id: 'threat-map',
    href: '/threat-map',
    label: 'Threat Map',
    kicker: 'Observed geography',
    description: 'Infrastructure and exposure geography, aggregated conservatively from observed signals.',
  },
  {
    id: 'research',
    href: '/research',
    label: 'Research',
    kicker: 'Method and cadence',
    description: 'Light research framing, methodology, and source discipline for future expansion.',
  },
];

export function getRouteMeta(pathname: string) {
  return PRODUCT_ROUTES.find((route) => route.href === pathname) ?? PRODUCT_ROUTES[0];
}
