import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'fr'],
  defaultLocale: 'ar',
  localePrefix: 'always',
  // "/" honours the NEXT_LOCALE cookie (set when a reader switches language).
  localeDetection: false,
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365 },
});

export type AppLocale = (typeof routing.locales)[number];

export function isLocale(x: string | undefined | null): x is AppLocale {
  return x === 'ar' || x === 'fr';
}

export const dirOf = (l: AppLocale) => (l === 'ar' ? 'rtl' : 'ltr');
