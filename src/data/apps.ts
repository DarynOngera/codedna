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
    tagline: 'Take control of your financial health.',
    summary:
      'A personal finance app for planning major life goals, understanding where your balance is heading and making smarter saving decisions — built on advanced projections and simulations tuned to your situation.',
    features: [
      'Plan major life goals with advanced projections and simulations',
      'Guidance through every step of requesting a loan',
      'Proactive balance forecasts built on data science and models tuned to you',
      'Smart alerts and savings recommendations',
    ],
    platforms: ['iOS', 'Android', 'Web'],
    status: 'In development',
    href: '/apps/finalgo',
  },
] as const;
