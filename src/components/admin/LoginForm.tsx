'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { loginAction } from '@/lib/auth/actions';

export function LoginForm({ locale, next }: { locale: string; next?: string }) {
  const t = useTranslations('admin.auth');
  const [state, action, pending] = useActionState(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label className="a-label" htmlFor="email">{t('email')}</label>
        <input id="email" name="email" type="email" required autoComplete="username" dir="ltr" className="a-input" />
      </div>
      <div>
        <label className="a-label" htmlFor="password">{t('password')}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" className="a-input" />
      </div>
      {state.error && <p role="alert" className="a-error">{t(state.error as 'badLogin')}</p>}
      <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{t('login')}</button>
      <p className="text-center text-[14px]"><Link href={`/${locale}/admin/forgot`} className="text-ink-2 underline">{t('forgot')}</Link></p>
    </form>
  );
}
