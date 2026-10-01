import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Masthead } from '@/components/public/Masthead';
import { Footer } from '@/components/public/Footer';
import { NavActive } from '@/components/public/NavActive';
import { getChrome } from '@/lib/data/chrome';
import type { AppLocale } from '@/lib/i18n/routing';

export default async function PublicLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as AppLocale;
  setRequestLocale(locale);
  const chrome = await getChrome(locale);
  return (
    <>
      <Masthead locale={locale} settings={chrome.settings} categories={chrome.categories} pages={chrome.pages} latest={chrome.latest} breaking={chrome.breaking} />
      <main id="content" tabIndex={-1} className="outline-none">{children}</main>
      <Footer locale={locale} settings={chrome.settings} categories={chrome.categories} menu={chrome.menu} pages={chrome.pages} />
      <NavActive />
    </>
  );
}
