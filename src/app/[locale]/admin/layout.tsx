import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';

// The admin is never cached and never indexed.
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false }, title: 'Admin' };

export default async function AdminRoot({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider locale={locale} messages={{ admin: messages.admin }} timeZone="Africa/Tunis">
      <div className="admin-ui min-h-screen">{children}</div>
    </NextIntlClientProvider>
  );
}
