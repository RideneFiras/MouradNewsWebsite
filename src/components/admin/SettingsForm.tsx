'use client';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { saveSettings } from '@/lib/admin/site';
import type { AdminMedia } from '@/lib/admin/media';
import { mediaUrl } from '@/lib/env';
import { MediaPicker } from './MediaPicker';

type V = Record<string, Record<string, unknown> | string | null>;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="a-panel space-y-3 p-4"><h2 className="a-h2">{title}</h2>{children}</section>;
}

export function SettingsForm({ initial, media }: { initial: V; media: Record<string, string> }) {
  const t = useTranslations('admin.settings');
  const tc = useTranslations('admin.common');
  const [v, setV] = useState<V>(initial);
  const [paths, setPaths] = useState(media);
  const [picker, setPicker] = useState<null | 'logo' | 'favicon' | 'og'>(null);
  const [status, setStatus] = useState<string | null>(null);
  const obj = (k: string) => (v[k] ?? {}) as Record<string, unknown>;
  const setIn = (k: string, field: string, value: unknown) => setV((x) => ({ ...x, [k]: { ...obj(k), [field]: value } }));
  const text = (k: string, field: string, label: string, opts: { dir?: 'ltr' | 'rtl'; area?: boolean; help?: string } = {}) => {
    const id = `${k}-${field}`;
    const val = String(obj(k)[field] ?? '');
    return (
      <div>
        <label className="a-label" htmlFor={id}>{label}</label>
        {opts.area
          ? <textarea id={id} className="a-textarea" dir={opts.dir} value={val} onChange={(e) => setIn(k, field, e.target.value)} />
          : <input id={id} className="a-input" dir={opts.dir} value={val} onChange={(e) => setIn(k, field, e.target.value)} />}
        {opts.help && <p className="a-help">{opts.help}</p>}
      </div>
    );
  };
  const check = (k: string, field: string, label: string) => (
    <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(obj(k)[field])} onChange={(e) => setIn(k, field, e.target.checked)} />{label}</label>
  );
  const num = (k: string, field: string, label: string, min: number, max: number, help?: string) => (
    <div><label className="a-label" htmlFor={`${k}-${field}`}>{label}</label>
      <input id={`${k}-${field}`} type="number" min={min} max={max} className="a-input w-28" value={Number(obj(k)[field] ?? min)} onChange={(e) => setIn(k, field, Number(e.target.value))} />
      {help && <p className="a-help">{help}</p>}</div>
  );
  const imageField = (key: 'logo' | 'favicon' | 'og', label: string, id: string | null) => (
    <div>
      <p className="a-label">{label}</p>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {id && paths[id] && <img src={mediaUrl(paths[id]) ?? ''} alt="" className="h-12 w-auto rounded border border-rule bg-white" />}
        <button type="button" className="a-btn a-btn-sm" onClick={() => setPicker(key)}>{tc('edit')}</button>
        {id && <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => {
          if (key === 'logo') setIn('logo', 'media_id', null); else setV((x) => ({ ...x, [key === 'favicon' ? 'favicon_media_id' : 'default_og_media_id']: null }));
        }}>×</button>}
      </div>
    </div>
  );
  const ia = (obj('in_article_ads').after_paragraphs as number[] | undefined) ?? [3, 8];

  return (
    <form className="space-y-4 pb-10" onSubmit={async (e) => {
      e.preventDefault();
      setStatus(tc('saving'));
      const res = await saveSettings(v);
      setStatus(res.ok ? t('saved') : `${tc('error')} ${res.ok ? '' : res.field ?? ''}`);
    }}>
      <Section title={t('identity')}>
        <div className="grid gap-3 md:grid-cols-2">
          {text('site_name', 'ar', `${t('siteName')} — ${tc('arabic')}`)}{text('site_name', 'fr', `${t('siteName')} — ${tc('french')}`, { dir: 'ltr' })}
          {text('tagline', 'ar', `${t('tagline')} — ${tc('arabic')}`)}{text('tagline', 'fr', `${t('tagline')} — ${tc('french')}`, { dir: 'ltr' })}
        </div>
        {check('logo', 'use_text_nameplate', t('textNameplate'))}
        {imageField('logo', t('logo'), (obj('logo').media_id as string | null) ?? null)}
        {imageField('favicon', t('favicon'), (v.favicon_media_id as string | null) ?? null)}
        {imageField('og', t('defaultShare'), (v.default_og_media_id as string | null) ?? null)}
      </Section>

      <Section title={t('masthead')}>
        <label className="flex items-center gap-2"><input type="checkbox" checked={obj('masthead_ears').start !== 'none'} onChange={(e) => setIn('masthead_ears', 'start', e.target.checked ? 'latest' : 'none')} />{t('earLatest')}</label>
        <div className="grid gap-3 md:grid-cols-2">{text('masthead_ears', 'end_ar', `${t('earEnd')} — ${tc('arabic')}`)}{text('masthead_ears', 'end_fr', `${t('earEnd')} — ${tc('french')}`, { dir: 'ltr' })}</div>
        <h3 className="a-label pt-2">{t('legal')}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {text('legal_masthead', 'director_ar', `${t('director')} — ${tc('arabic')}`)}{text('legal_masthead', 'director_fr', `${t('director')} — ${tc('french')}`, { dir: 'ltr' })}
          {text('legal_masthead', 'editor_in_chief_ar', `${t('editorInChief')} — ${tc('arabic')}`)}{text('legal_masthead', 'editor_in_chief_fr', `${t('editorInChief')} — ${tc('french')}`, { dir: 'ltr' })}
          {text('legal_masthead', 'address_ar', `${t('address')} — ${tc('arabic')}`)}{text('legal_masthead', 'address_fr', `${t('address')} — ${tc('french')}`, { dir: 'ltr' })}
          {text('legal_masthead', 'phone', t('phone'), { dir: 'ltr' })}{text('legal_masthead', 'email', t('email'), { dir: 'ltr' })}
          {text('legal_masthead', 'ads_email', t('adsEmail'), { dir: 'ltr' })}{text('legal_masthead', 'ads_phone', t('adsPhone'), { dir: 'ltr' })}
        </div>
        <h3 className="a-label pt-2">{t('social')}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {['facebook', 'instagram', 'youtube', 'x', 'whatsapp_channel'].map((s) => <div key={s}>{text('social_links', s, s, { dir: 'ltr' })}</div>)}
        </div>
      </Section>

      <Section title={t('dates')}>
        {check('show_hijri_date', 'enabled', t('hijri'))}
        {num('show_hijri_date', 'offset_days', t('hijriOffset'), -2, 2)}
      </Section>

      <Section title={t('content')}>
        {check('content_mixing', 'fr_include_arabic_content', t('mixFr'))}
        {check('content_mixing', 'ar_include_french_content', t('mixAr'))}
        {check('breaking', 'enabled', t('breakingEnabled'))}
        {num('breaking', 'default_hours', t('breakingHours'), 1, 72)}
        <h3 className="a-label pt-2">{t('inArticleAds')}</h3>
        <div className="flex flex-wrap gap-3">
          <div><label className="a-label" htmlFor="ia1">{t('afterParagraphs')} 1</label><input id="ia1" type="number" min={1} max={50} className="a-input w-24" value={ia[0] ?? 3} onChange={(e) => setIn('in_article_ads', 'after_paragraphs', [Number(e.target.value), ia[1] ?? 8])} /></div>
          <div><label className="a-label" htmlFor="ia2">{t('afterParagraphs')} 2</label><input id="ia2" type="number" min={1} max={50} className="a-input w-24" value={ia[1] ?? 8} onChange={(e) => setIn('in_article_ads', 'after_paragraphs', [ia[0] ?? 3, Number(e.target.value)])} /></div>
          {num('in_article_ads', 'min_paragraphs', t('minParagraphs'), 1, 50)}
        </div>
        <div className="grid gap-3 md:grid-cols-2">{text('home_text_block', 'text_ar', `${t('homeText')} — ${tc('arabic')}`, { area: true })}{text('home_text_block', 'text_fr', `${t('homeText')} — ${tc('french')}`, { area: true, dir: 'ltr' })}</div>
      </Section>

      <Section title={t('integrations')}>
        {text('ga4', 'measurement_id', t('ga4'), { dir: 'ltr' })}
        {text('adsense', 'client_id', t('adsenseClient'), { dir: 'ltr' })}
        {check('adsense', 'enabled', t('adsenseEnabled'))}
        <div><label className="a-label" htmlFor="consent-mode">{t('consentMode')}</label>
          <select id="consent-mode" className="a-select" value={String(obj('consent').mode ?? 'google_cmp')} onChange={(e) => setIn('consent', 'mode', e.target.value)}>
            <option value="google_cmp">{t('consent_google_cmp')}</option><option value="none">{t('consent_none')}</option>
          </select></div>
      </Section>

      <Section title={t('analytics')}>
        {num('analytics', 'raw_retention_days', t('retention'), 35, 180, t('retentionHelp'))}
        <p className="a-help">{t('excludeStaff')}</p>
      </Section>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-rule bg-paper py-3">
        <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
        <span role="status" className="text-[14px]">{status}</span>
      </div>

      <MediaPicker open={picker !== null} onClose={() => setPicker(null)} onPick={(m: AdminMedia) => {
        setPaths((p) => ({ ...p, [m.id]: m.variants?.['480'] ?? m.storage_path }));
        if (picker === 'logo') setIn('logo', 'media_id', m.id);
        else setV((x) => ({ ...x, [picker === 'favicon' ? 'favicon_media_id' : 'default_og_media_id']: m.id }));
        setPicker(null);
      }} />
    </form>
  );
}
