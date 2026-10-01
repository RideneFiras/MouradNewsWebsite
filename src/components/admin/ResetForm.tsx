'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { setNewPasswordAction } from '@/lib/auth/actions';

/** New password. After a reset link the session cookie is already set (/api/auth/callback);
 * after an invite link the session tokens are in the URL hash and are sent to the server. */
export function ResetForm({ locale }: { locale: 'ar' | 'fr' }) {
  const t = useTranslations('admin.auth');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const password = String(new FormData(e.currentTarget).get('password') ?? '');
        if (password.length < 10) return setError(t('newPasswordHelp'));
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        setPending(true);
        const res = await setNewPasswordAction({
          password, locale,
          access_token: hash.get('access_token') ?? undefined,
          refresh_token: hash.get('refresh_token') ?? undefined,
        });
        setPending(false);
        if (res?.error) setError(t(res.error as 'badLogin'));
      }}
    >
      <div>
        <label className="a-label" htmlFor="password">{t('newPassword')}</label>
        <input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" dir="ltr" className="a-input" />
        <p className="a-help">{t('newPasswordHelp')}</p>
      </div>
      {error && <p role="alert" className="a-error">{error}</p>}
      <button type="submit" className="a-btn a-btn-primary w-full" disabled={pending}>{t('setPassword')}</button>
    </form>
  );
}
