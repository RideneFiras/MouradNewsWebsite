'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { deleteCampaign, saveCampaign } from '@/lib/admin/ads';
import { mediaUrl } from '@/lib/env';
import type { AdminMedia } from '@/lib/admin/media';
import { MediaPicker } from '../MediaPicker';

export interface CampaignValues {
  id?: string; sponsor_name: string; slot_key: string; locale: 'ar' | 'fr' | 'both';
  creative_desktop_media_id: string | null; creative_mobile_media_id: string | null;
  click_url: string; alt_text: string; starts_at: string; ends_at: string; weight: number;
  category_ids: string[]; is_active: boolean; notes: string;
}
interface Opt { key: string; label: string; sizes: { desktop: [number, number]; mobile: [number, number] } }
interface Cat { id: string; name: string; parent_id: string | null }

export function CampaignForm({ locale, initial, slots, categories, previews }: {
  locale: 'ar' | 'fr'; initial: CampaignValues; slots: Opt[]; categories: Cat[]; previews: Record<string, string>;
}) {
  const t = useTranslations('admin.ads');
  const tc = useTranslations('admin.common');
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [paths, setPaths] = useState(previews);
  const [picker, setPicker] = useState<null | 'desktop' | 'mobile'>(null);
  const [error, setError] = useState<{ field?: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const slot = slots.find((s) => s.key === v.slot_key);
  const set = <K extends keyof CampaignValues>(k: K, val: CampaignValues[K]) => setV((x) => ({ ...x, [k]: val }));
  const errFor = (f: string) => (error?.field === f ? <p className="a-error">{error.text}</p> : null);

  const creative = (which: 'desktop' | 'mobile') => {
    const key = which === 'desktop' ? 'creative_desktop_media_id' : 'creative_mobile_media_id';
    const id = v[key];
    const size = slot?.sizes[which];
    return (
      <div>
        <p className="a-label">{t(`f.${which}`)} {size && <span className="font-normal text-ink-3" dir="ltr">({size[0]}×{size[1]})</span>}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {id && paths[id] && <img src={mediaUrl(paths[id]) ?? ''} alt="" className="mb-2 max-h-32 w-auto border border-rule bg-white" />}
        <div className="flex gap-2">
          <button type="button" className="a-btn a-btn-sm" onClick={() => setPicker(which)}>{t('f.choose')}</button>
          {id && <button type="button" className="a-btn a-btn-sm a-btn-ghost" onClick={() => set(key, null)}>{t('f.remove')}</button>}
        </div>
      </div>
    );
  };

  return (
    <form className="space-y-5" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      const res = await saveCampaign({ ...v, weight: Number(v.weight) });
      setBusy(false);
      if (!res.ok) {
        const map: Record<string, string> = { https: t('f.errors.https'), creative_required: t('f.errors.creative'), ends_before_start: t('f.errors.ends') };
        return setError({ field: res.field, text: map[res.error] ?? (res.field === 'click_url' ? t('f.errors.https') : t('f.errors.invalid')) });
      }
      router.push(`/${locale}/admin/ads`);
      router.refresh();
    }}>
      <section className="a-panel grid gap-4 p-4 md:grid-cols-2">
        <div>
          <label className="a-label" htmlFor="c-sponsor">{t('f.sponsor')}</label>
          <input id="c-sponsor" required maxLength={120} className="a-input" dir="auto" value={v.sponsor_name} onChange={(e) => set('sponsor_name', e.target.value)} />
        </div>
        <div>
          <label className="a-label" htmlFor="c-slot">{t('f.slot')}</label>
          <select id="c-slot" className="a-select" value={v.slot_key} onChange={(e) => set('slot_key', e.target.value)}>
            {slots.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="a-label" htmlFor="c-locale">{t('f.locale')}</label>
          <select id="c-locale" className="a-select" value={v.locale} onChange={(e) => set('locale', e.target.value as CampaignValues['locale'])}>
            <option value="both">{t('f.localeBoth')}</option><option value="ar">{t('f.localeAr')}</option><option value="fr">{t('f.localeFr')}</option>
          </select>
        </div>
        <div>
          <label className="a-label" htmlFor="c-weight">{t('f.weight')}</label>
          <input id="c-weight" type="number" min={1} max={100} className="a-input w-28" value={v.weight} onChange={(e) => set('weight', Number(e.target.value))} />
          <p className="a-help">{t('f.weightHelp')}</p>
        </div>
      </section>

      <section className="a-panel space-y-4 p-4">
        <p className="a-help">{t('f.creativeHelp')}</p>
        <div className="grid gap-4 md:grid-cols-2">{creative('desktop')}{creative('mobile')}</div>
        {errFor('creative_desktop_media_id')}
        <div>
          <label className="a-label" htmlFor="c-link">{t('f.link')}</label>
          <input id="c-link" required type="url" dir="ltr" className="a-input" placeholder="https://" value={v.click_url} aria-invalid={error?.field === 'click_url'} onChange={(e) => set('click_url', e.target.value)} />
          <p className="a-help">{t('f.linkHelp')}</p>
          {errFor('click_url')}
        </div>
        <div>
          <label className="a-label" htmlFor="c-alt">{t('f.alt')}</label>
          <input id="c-alt" maxLength={200} className="a-input" dir="auto" value={v.alt_text} onChange={(e) => set('alt_text', e.target.value)} />
        </div>
      </section>

      <section className="a-panel grid gap-4 p-4 md:grid-cols-2">
        <div>
          <label className="a-label" htmlFor="c-start">{t('f.starts')}</label>
          <input id="c-start" required type="datetime-local" dir="ltr" className="a-input" value={v.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
        </div>
        <div>
          <label className="a-label" htmlFor="c-end">{t('f.ends')}</label>
          <input id="c-end" type="datetime-local" dir="ltr" className="a-input" value={v.ends_at} aria-invalid={error?.field === 'ends_at'} onChange={(e) => set('ends_at', e.target.value)} />
          <p className="a-help">{t('f.endsHelp')}</p>
          {errFor('ends_at')}
        </div>
        <fieldset className="md:col-span-2">
          <legend className="a-label">{t('f.sections')}</legend>
          <p className="a-help mb-2">{t('f.sectionsHelp')}</p>
          <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <label key={c.id} className={`flex items-center gap-2 text-[14px] ${c.parent_id ? 'ps-5' : 'font-semibold'}`}>
                <input type="checkbox" checked={v.category_ids.includes(c.id)}
                  onChange={(e) => set('category_ids', e.target.checked ? [...v.category_ids, c.id] : v.category_ids.filter((x) => x !== c.id))} />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_active} onChange={(e) => set('is_active', e.target.checked)} />{t('f.active')}</label>
        <div className="md:col-span-2">
          <label className="a-label" htmlFor="c-notes">{t('f.notes')}</label>
          <textarea id="c-notes" className="a-textarea" maxLength={1000} value={v.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </section>

      {error && !error.field && <p role="alert" className="a-error">{error.text}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button className="a-btn a-btn-primary" disabled={busy}>{tc('save')}</button>
        {v.id && (
          <button type="button" className="a-btn a-btn-danger" onClick={async () => {
            if (!confirm(t('f.confirmDelete'))) return;
            const res = await deleteCampaign(v.id!);
            if (!res.ok) return setError({ text: res.error === 'has_stats' ? t('f.deleteBlocked') : tc('error') });
            router.push(`/${locale}/admin/ads`);
            router.refresh();
          }}>{t('f.delete')}</button>
        )}
      </div>

      <MediaPicker open={picker !== null} onClose={() => setPicker(null)} onPick={(m: AdminMedia) => {
        const key = picker === 'desktop' ? 'creative_desktop_media_id' : 'creative_mobile_media_id';
        setPaths((p) => ({ ...p, [m.id]: m.variants?.['480'] ?? m.storage_path }));
        set(key, m.id);
        setPicker(null);
      }} />
    </form>
  );
}
