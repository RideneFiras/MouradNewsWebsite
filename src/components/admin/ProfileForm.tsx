'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { changePassword, saveProfile } from '@/lib/admin/site';
import type { AdminMedia } from '@/lib/admin/media';
import { mediaUrl } from '@/lib/env';
import { MediaPicker } from './MediaPicker';

export interface ProfileData { id: string; display_name_ar: string; display_name_fr: string | null; slug: string; title_ar: string | null; title_fr: string | null; bio_ar: string | null; bio_fr: string | null; avatar_media_id: string | null; avatar_path: string | null; email_public: string | null; social: Record<string, string>; show_public_page: boolean; ui_locale: 'ar' | 'fr' }

export function ProfileForm({ initial, self }: { initial: ProfileData; self: boolean }) {
  const t = useTranslations('admin.profile');
  const tc = useTranslations('admin.common');
  const [p, setP] = useState(initial);
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pw, setPw] = useState<string | null>(null);
  const field = (k: keyof ProfileData, label: string, opts: { dir?: 'ltr'; area?: boolean } = {}) => (
    <div>
      <label className="a-label" htmlFor={`p-${k}`}>{label}</label>
      {opts.area ? <textarea id={`p-${k}`} className="a-textarea" dir={opts.dir} value={String(p[k] ?? '')} onChange={(e) => setP({ ...p, [k]: e.target.value })} />
        : <input id={`p-${k}`} className="a-input" dir={opts.dir} value={String(p[k] ?? '')} onChange={(e) => setP({ ...p, [k]: e.target.value })} />}
    </div>
  );
  return (
    <div className="space-y-6 pb-10">
      <form className="a-panel space-y-3 p-4" onSubmit={async (e) => {
        e.preventDefault();
        const r = await saveProfile(p.id, { ...p, social: p.social ?? {} });
        setMsg(r.ok ? tc('saved') : r.field === 'slug' ? `${tc('slug')}: ${tc('error')}` : tc('error'));
      }}>
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.avatar_path && <img src={mediaUrl(p.avatar_path) ?? ''} alt="" className="h-20 w-20 rounded object-cover" />}
          <button type="button" className="a-btn a-btn-sm" onClick={() => setPicker(true)}>{t('portrait')}</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {field('display_name_ar', t('nameAr'))}{field('display_name_fr', t('nameFr'), { dir: 'ltr' })}
          {field('title_ar', t('titleAr'))}{field('title_fr', t('titleFr'), { dir: 'ltr' })}
          {field('bio_ar', t('bioAr'), { area: true })}{field('bio_fr', t('bioFr'), { area: true, dir: 'ltr' })}
          {field('slug', tc('slug'), { dir: 'ltr' })}{field('email_public', t('publicEmail'), { dir: 'ltr' })}
          {['facebook', 'x', 'instagram', 'youtube'].map((s) => (
            <div key={s}><label className="a-label" htmlFor={`s-${s}`}>{s}</label>
              <input id={`s-${s}`} className="a-input" dir="ltr" placeholder="https://" value={p.social?.[s] ?? ''} onChange={(e) => setP({ ...p, social: { ...p.social, [s]: e.target.value } })} /></div>
          ))}
        </div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={p.show_public_page} onChange={(e) => setP({ ...p, show_public_page: e.target.checked })} />{t('showPage')}</label>
        <div><label className="a-label" htmlFor="p-ui">{t('uiLocale')}</label>
          <select id="p-ui" className="a-select w-auto" value={p.ui_locale} onChange={(e) => setP({ ...p, ui_locale: e.target.value as 'ar' })}><option value="ar">العربية</option><option value="fr">Français</option></select></div>
        <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
        {msg && <p role="status" className="text-[14px]">{msg}</p>}
      </form>
      {self && (
        <form className="a-panel space-y-3 p-4" onSubmit={async (e) => {
          e.preventDefault();
          const v = String(new FormData(e.currentTarget).get('password') ?? '');
          const r = await changePassword(v);
          setPw(r.ok ? t('passwordChanged') : tc('error'));
        }}>
          <h2 className="a-h2">{t('changePassword')}</h2>
          <input name="password" type="password" minLength={10} required dir="ltr" autoComplete="new-password" className="a-input max-w-sm" aria-label={t('changePassword')} />
          <button type="submit" className="a-btn">{tc('save')}</button>
          {pw && <p role="status" className="text-[14px]">{pw}</p>}
        </form>
      )}
      <MediaPicker open={picker} onClose={() => setPicker(false)} onPick={(m: AdminMedia) => { setP({ ...p, avatar_media_id: m.id, avatar_path: m.variants?.['480'] ?? m.storage_path }); setPicker(false); }} />
    </div>
  );
}
