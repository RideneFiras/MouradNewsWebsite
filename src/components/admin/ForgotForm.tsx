'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { forgotAction } from '@/lib/auth/actions';

export function ForgotForm({ locale }: { locale: string }) {
  const t = useTranslations('admin.auth');
  const [state, action, pending] = useActionState(forgotAction, {});
  if (state.sent) return <p role="status" className="a-notice" data-tone="ok">{t('linkSent')}</p>;
  return (
    <form action={action} className="space-y-4">
      <p className="a-help">{t('forgotHelp')}</p>
      <input type="hidden" name="locale" value={locale} />
      <div>
        <label className="a-label" htmlFor="email">{t('email')}</label>
        <input id="email" name="email" type="email" required dir="ltr" className="a-input" />
      </div>
      <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{t('sendLink')}</button>
      <p className="text-center text-[14px]"><Link href={`/${locale}/admin/login`} className="text-ink-2 underline">{t('backToLogin')}</Link></p>
    </form>
  );
}
