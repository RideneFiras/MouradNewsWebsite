import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { dirOf, isLocale } from '@/lib/i18n/routing';
import { fontVariables } from '../fonts';

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
