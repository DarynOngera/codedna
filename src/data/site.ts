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

export const SERVICES = [
  {
    title: 'Apps',
    body: 'We build and run our own software products, from football predictions to algorithmic finance.',
    href: '/apps',
  },
  {
    title: 'Artificial Intelligence',
    body: 'We work with machine learning, predictive models and automation to solve problems using real data.',
  },
  {
    title: 'Cloud Computing',
    body: 'We design, deploy and manage cloud infrastructure, from initial setup to ongoing operations.',
  },
  {
    title: 'IT Consulting',
    body: 'We help businesses make technical decisions, design systems and put solutions into practice.',
  },
] as const;

