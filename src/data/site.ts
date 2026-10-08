/**
 * Single source of truth for site-wide identity and shared content.
 * Change these and the whole site follows: canonical URLs, OG tags, sitemap,
 * structured data, nav and footer.
 */
export const SITE_URL = 'https://c0dedna.com';
export const SITE_NAME = 'CODEDNA';
export const SITE_TAGLINE = 'Software, Cloud & AI for business';
export const SITE_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_DESCRIPTION =
  'CODEDNA is a corporate technology company. We build our own apps and provide artificial intelligence, cloud computing and IT consulting for businesses.';

export const CONTACT_EMAIL = 'hello@c0dedna.com';

export const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/apps', label: 'Apps' },
] as const;

/** The four things CODEDNA does. Rendered as an equal grid on the home page. */
export const SERVICES = [
  {
    title: 'Apps',
    body: 'Products we design, build and run ourselves — from football predictions to algorithmic finance.',
    href: '/apps',
  },
  {
    title: 'Artificial Intelligence',
    body: 'Machine learning, prediction and automation applied to real business problems and data.',
  },
  {
    title: 'Cloud Computing',
    body: 'Architecture, migration and operations on cloud infrastructure that scales with the workload.',
  },
  {
    title: 'IT Consulting',
    body: 'Technical direction and hands-on engineering for teams that need to move carefully and fast.',
  },
] as const;
