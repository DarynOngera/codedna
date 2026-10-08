/**
 * Structured source of truth for the apps under the Apps section.
 * Add a product here and it flows through the apps hub, the footer and the
 * home page preview. Keep marketing copy here, not in page templates.
 */
export interface AppInfo {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  features: readonly string[];
  platforms: readonly string[];
  status: string;
  /** Path to the app's own page. */
  href: string;
  /** Optional in-app privacy policy URL. */
  privacyPath?: string;
  /** Optional dedicated contact address. */
  contactEmail?: string;
}

export const APPS: readonly AppInfo[] = [
  {
    slug: 'prometheusfc',
    name: 'PrometheusFC',
    tagline: 'Football predictions, made social.',
    summary:
      'A football predictions app where you track your picks, build parlays, test your knowledge and compete with friends, battles and groups.',
    features: [
      'Track picks and build parlays',
      'A virtual bankroll to play with, not real money',
      'Quizzes, XP, coins, streaks and achievements',
      'Friends, battles and private groups',
      'Leaderboards and weekly prize leagues',
      'Match alerts and live score cards on your device',
    ],
    platforms: ['iOS', 'Android'],
    status: 'In beta',
    href: '/apps/prometheusfc',
    privacyPath: '/apps/prometheusfc/privacy',
    contactEmail: 'prometheusfc@c0dedna.com',
  },
  {
    slug: 'finalgo',
    name: 'FinAlgo',
    tagline: 'Algorithmic finance, in development.',
    summary:
      'FinAlgo is our algorithmic finance product. Full product details are being finalised and will appear here.',
    features: [],
    platforms: [],
    status: 'In development',
    href: '/apps/finalgo',
  },
] as const;
