import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Masthead } from '@/components/public/Masthead';
import { Footer } from '@/components/public/Footer';
import { NavActive } from '@/components/public/NavActive';
import { getChrome } from '@/lib/data/chrome';
import { Tracker } from '@/components/public/Tracker';
import { Analytics } from '@/components/public/Analytics';
import { AdSlot } from '@/components/public/AdSlot';
import { makeToken } from '@/lib/analytics/token';
import { serverEnv } from '@/lib/env.server';
import type { AppLocale } from '@/lib/i18n/routing';

export default async function PublicLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as AppLocale;
  setRequestLocale(locale);
  const chrome = await getChrome(locale);
  const token = await makeToken(serverEnv.trackerSecret());
  return (
    <>
      <Masthead locale={locale} settings={chrome.settings} categories={chrome.categories} pages={chrome.pages} latest={chrome.latest} breaking={chrome.breaking} />
      <AdSlot slotKey="header_leaderboard" locale={locale} className="container-page mt-4" />
      <main id="content" tabIndex={-1} className="outline-none">{children}</main>
      <AdSlot slotKey="footer" locale={locale} className="container-page mt-12" />
      <Footer locale={locale} settings={chrome.settings} categories={chrome.categories} menu={chrome.menu} pages={chrome.pages} />
      <NavActive />
      <Tracker token={token} locale={locale} />
      <Analytics settings={chrome.settings} />
    </>
  );
}
