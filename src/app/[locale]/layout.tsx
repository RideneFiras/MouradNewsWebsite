import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { dirOf, isLocale, type AppLocale } from '@/lib/i18n/routing';
import { getSettings } from '@/lib/data/queries';
import { pick } from '@/lib/data/settings';
import { mediaUrl, siteUrl } from '@/lib/env';
import { fontVariables } from '../fonts';

// Rendered on first request, then cached (ISR) — nothing is prerendered at build time,
// so building doesn't need database access.
export function generateStaticParams() {
  return [];
}

export const viewport: Viewport = { themeColor: '#f5f1e8', width: 'device-width', initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l: AppLocale = isLocale(locale) ? locale : 'ar';
  const settings = (await getSettings()) as Awaited<ReturnType<typeof getSettings>> & { favicon_path?: string | null };
  const name = pick(settings.site_name, l);
  const favicon = settings.favicon_path ? mediaUrl(settings.favicon_path) : null;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: name, template: `%s | ${name}` },
    applicationName: name,
    icons: favicon ? { icon: favicon, apple: favicon } : undefined,
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} dir={dirOf(locale)} className={fontVariables}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
