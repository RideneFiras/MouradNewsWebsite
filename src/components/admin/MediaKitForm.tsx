'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveSettings } from '@/lib/admin/site';
import type { MediaKitFormat, MediaKitSettings } from '@/lib/data/settings';

const METRICS = ['monthly_visitors', 'monthly_pageviews', 'engaged_time', 'mobile_share', 'geo', 'top_sections', 'articles_per_month', 'facebook_followers'] as const;
const PERIODS = ['last_full_month', 'last_30_days', 'last_3_months_avg'] as const;
const EMPTY: MediaKitFormat = { name_ar: '', name_fr: '', description_ar: '', description_fr: '', size: '', price_ar: '', price_fr: '', visible: true };

/** Media kit settings (docs/06): what is shown and how. The numbers themselves are never editable. */
export function MediaKitForm({ initial }: { initial: MediaKitSettings }) {
  const t = useTranslations('admin.mediaKit');
  const tc = useTranslations('admin.common');
  const [v, setV] = useState<MediaKitSettings>(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const setF = (i: number, patch: Partial<MediaKitFormat>) => setV((x) => ({ ...x, formats: x.formats.map((f, k) => (k === i ? { ...f, ...patch } : f)) }));
  const field = (id: string, label: string, value: string, onChange: (s: string) => void, opts: { dir?: 'ltr' | 'rtl' | 'auto'; area?: boolean; lang?: string } = {}) => (
    <div>
      <label className="a-label" htmlFor={id}>{label}</label>
      {opts.area
        ? <textarea id={id} className="a-textarea" dir={opts.dir ?? 'auto'} lang={opts.lang} value={value} onChange={(e) => onChange(e.target.value)} maxLength={1000} />
        : <input id={id} className="a-input" dir={opts.dir ?? 'auto'} lang={opts.lang} value={value} onChange={(e) => onChange(e.target.value)} maxLength={300} />}
    </div>
  );

  return (
    <form className="space-y-6" onSubmit={async (e) => {
      e.preventDefault();
      const res = await saveSettings({ media_kit: v });
      setStatus(res.ok ? { ok: true, text: t('saved') } : { ok: false, text: tc('error') });
    }}>
      <section className="a-panel space-y-3 p-4">
        <h2 className="a-h2">{t('metrics')}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {METRICS.map((m) => (
            <label key={m} className="flex items-center gap-2">
              <input type="checkbox" checked={!!v.metrics[m]} onChange={(e) => setV({ ...v, metrics: { ...v.metrics, [m]: e.target.checked } })} />
              {t(`m.${m}`)}
            </label>
          ))}
        </div>
      </section>

      <section className="a-panel grid gap-4 p-4 md:grid-cols-2">
        <fieldset>
          <legend className="a-label">{t('period')}</legend>
          {PERIODS.map((p) => (
            <label key={p} className="flex items-center gap-2"><input type="radio" name="period" checked={v.period === p} onChange={() => setV({ ...v, period: p })} />{t(`periods.${p}`)}</label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="a-label">{t('rounding')}</legend>
          {(['exact', 'round_down'] as const).map((r) => (
            <label key={r} className="flex items-center gap-2"><input type="radio" name="rounding" checked={v.rounding === r} onChange={() => setV({ ...v, rounding: r })} />{t(`roundings.${r}`)}</label>
          ))}
          <p className="a-help">{t('roundingHelp')}</p>
        </fieldset>
        {field('mk-st-ar', `${t('statement')} — ${tc('arabic')}`, v.statement_ar, (s) => setV({ ...v, statement_ar: s }), { area: true })}
        {field('mk-st-fr', `${t('statement')} — ${tc('french')}`, v.statement_fr, (s) => setV({ ...v, statement_fr: s }), { area: true, dir: 'ltr', lang: 'fr' })}
      </section>

      <section className="a-panel space-y-3 p-4">
        <h2 className="a-h2">{t('contact')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {field('mk-name', t('contactName'), v.contact_name, (s) => setV({ ...v, contact_name: s }))}
          {field('mk-phone', t('contactPhone'), v.contact_phone, (s) => setV({ ...v, contact_phone: s }), { dir: 'ltr' })}
          {field('mk-email', t('contactEmail'), v.contact_email, (s) => setV({ ...v, contact_email: s }), { dir: 'ltr' })}
        </div>
      </section>

      <section className="a-panel space-y-4 p-4">
        <h2 className="a-h2">{t('formats')}</h2>
        {v.formats.map((f, i) => (
          <fieldset key={i} className="grid gap-3 border-t border-rule pt-4 md:grid-cols-2">
            <legend className="sr-only">{f.name_ar || t('formatName')}</legend>
            {field(`f${i}-nar`, `${t('formatName')} — ${tc('arabic')}`, f.name_ar, (s) => setF(i, { name_ar: s }))}
            {field(`f${i}-nfr`, `${t('formatName')} — ${tc('french')}`, f.name_fr, (s) => setF(i, { name_fr: s }), { dir: 'ltr', lang: 'fr' })}
            {field(`f${i}-dar`, `${t('formatDesc')} — ${tc('arabic')}`, f.description_ar, (s) => setF(i, { description_ar: s }))}
            {field(`f${i}-dfr`, `${t('formatDesc')} — ${tc('french')}`, f.description_fr, (s) => setF(i, { description_fr: s }), { dir: 'ltr', lang: 'fr' })}
            {field(`f${i}-size`, t('formatSize'), f.size, (s) => setF(i, { size: s }), { dir: 'ltr' })}
            <div className="grid grid-cols-2 gap-3">
              {field(`f${i}-par`, `${t('formatPrice')} — ${tc('arabic')}`, f.price_ar, (s) => setF(i, { price_ar: s }))}
              {field(`f${i}-pfr`, `${t('formatPrice')} — ${tc('french')}`, f.price_fr, (s) => setF(i, { price_fr: s }), { dir: 'ltr', lang: 'fr' })}
              <p className="a-help col-span-2 -mt-2">{t('formatPriceHelp')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.visible} onChange={(e) => setF(i, { visible: e.target.checked })} />{t('formatVisible')}</label>
              <button type="button" className="a-btn a-btn-sm" disabled={i === 0} onClick={() => setV((x) => { const fs = [...x.formats]; [fs[i - 1], fs[i]] = [fs[i]!, fs[i - 1]!]; return { ...x, formats: fs }; })}>{tc('moveUp')}</button>
              <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setV((x) => ({ ...x, formats: x.formats.filter((_, k) => k !== i) }))}>{t('removeFormat')}</button>
            </div>
          </fieldset>
        ))}
        <button type="button" className="a-btn" disabled={v.formats.length >= 20} onClick={() => setV({ ...v, formats: [...v.formats, { ...EMPTY }] })}>{t('addFormat')}</button>
      </section>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-rule bg-paper py-3">
        <button className="a-btn a-btn-primary">{tc('save')}</button>
        {status && <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-[14px] text-ok' : 'a-error'}>{status.text}</p>}
      </div>
    </form>
  );
}
