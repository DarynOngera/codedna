/**
 * Single source of truth for site-wide identity and shared content.
 * Change these and the whole site follows: canonical URLs, OG tags, sitemap,
 * structured data, nav and footer.
 */
export const SITE_URL = 'https://c0dedna.com';
export const SITE_NAME = 'CODEDNA';
export const SITE_TITLE = 'CODEDNA — Where Code Meets Biology';
export const SITE_DESCRIPTION =
  'CODEDNA explores the intersection of computation, technology, and biological systems.';

export const CONTACT_EMAIL = 'hello@c0dedna.com';

export const NAV_ITEMS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

/** Broad, non-committal areas of interest. Never phrase these as services or offerings. */
export const AREAS_OF_INTEREST = [
  {
    title: 'Computational methods for biological data',
    body: 'Turning biological measurements into things software can reason about — representation, analysis, and interpretation.',
  },
  {
    title: 'Software systems for life-science workflows',
    body: 'Tooling built with engineering discipline for work that happens at the bench, in the field, and in between.',
  },
  {
    title: 'Interfaces between engineering and the laboratory',
    body: 'The seam where instruments, protocols, and code meet — usually the least polished and most consequential part.',
  },
  {
    title: 'Exploratory research and prototyping',
    body: 'Small, fast experiments to find out whether a question is worth asking properly.',
  },
] as const;
