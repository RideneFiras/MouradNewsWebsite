'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveHomepage } from '@/lib/admin/homepage';
import { defaultConfig, SECTION_TYPES, type BuilderSection, type SectionType } from '@/lib/admin/homepage-types';
import { Dialog } from './Dialog';
import { Sortable } from './Sortable';

type Opt = { id: string; name: string };

export function HomepageBuilder({ tab, locale, initial, categories, formats, tags, adSlots }: {
  tab: 'ar' | 'fr'; locale: string; initial: BuilderSection[]; categories: Opt[]; formats: Opt[]; tags: Opt[]; adSlots: { key: string; name: string }[];
}) {
  const t = useTranslations('admin.homepage');
  const tc = useTranslations('admin.common');
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<BuilderSection | null>(null);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const nameOf = (list: Opt[], id: unknown) => list.find((x) => x.id === id)?.name ?? '—';

  const summary = (s: BuilderSection) => {
    const c = s.config as Record<string, unknown>;
    const parts: string[] = [];
    if (s.type === 'category_block') parts.push(nameOf(categories, c.category_id));
    if (s.type === 'format_block') parts.push(nameOf(formats, c.format_id));
    if (s.type === 'tag_block') parts.push(nameOf(tags, c.tag_id));
    if (s.type === 'ad_slot') parts.push(adSlots.find((a) => a.key === c.ad_slot_key)?.name ?? String(c.ad_slot_key));
    if (typeof c.count === 'number' || typeof c.count === 'string') parts.push(t('nArticles', { count: Number(c.count) }));
    if (typeof c.layout === 'string') parts.push(t(`layout_${c.layout}` as 'layout_stacked'));
    if (s.type === 'most_read') parts.push(`${c.window_days} ${t('windowDays')}`);
    return parts.join(' — ');
  };

  const previewHref = () => {
    const json = JSON.stringify(items.filter((s) => s.is_active).map(({ type, config, title_ar, title_fr, locale: l }) => ({ type, config, title_ar, title_fr, locale: l })));
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `/${tab}/preview/home?d=${b64}`;
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <nav className="flex gap-1" aria-label={t('title')}>
          {(['ar', 'fr'] as const).map((l) => (
            <Link prefetch={false} key={l} href={`/${locale}/admin/homepage?tab=${l}`} aria-current={tab === l ? 'page' : undefined} className={`a-btn a-btn-sm ${tab === l ? 'a-btn-primary' : ''}`}>{l === 'ar' ? tc('arabic') : tc('french')}</Link>
          ))}
        </nav>
        <button type="button" className="a-btn" onClick={() => setAdding(true)}>{t('addSection')}</button>
        <a className="a-btn" href={previewHref()} target="_blank" rel="noopener">{tc('preview')}</a>
        <button type="button" className="a-btn a-btn-primary" disabled={status === 'saving'} onClick={async () => {
          setStatus('saving');
          const r = await saveHomepage(tab, items);
          setStatus(r.ok ? 'saved' : 'error');
          if (r.ok) setItems((xs) => xs.map((x) => ({ ...x, isNew: false })));
          if (r.ok) window.location.reload();
        }}>{t('save')}</button>
        <span className="text-[13px] text-ink-3" role="status">{status === 'saving' ? tc('saving') : status === 'saved' ? tc('saved') : status === 'error' ? tc('error') : ''}</span>
      </div>
      <Sortable items={items} onReorder={setItems} className="space-y-2" render={(s) => (
        <div className={`a-panel flex flex-wrap items-center gap-3 p-3 ${s.is_active ? '' : 'opacity-60'}`}>
          <div className="min-w-[200px] flex-1">
            <p className="font-semibold">{t(`type_${s.type}` as 'type_lead')}{(tab === 'fr' ? s.title_fr : s.title_ar) ? ` — ${tab === 'fr' ? s.title_fr : s.title_ar}` : ''}</p>
            <p className="text-[13px] text-ink-3">{summary(s)} · {s.locale === 'both' ? t('both') : t('onlyThis')}</p>
          </div>
          <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={s.is_active} onChange={() => setItems((xs) => xs.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)))} />{tc('active')}</label>
          <button type="button" className="a-btn a-btn-sm" onClick={() => setEditing(s)}>{tc('edit')}</button>
          <button type="button" className="a-btn a-btn-sm a-btn-danger" onClick={() => setItems((xs) => xs.filter((x) => x.id !== s.id))}>{tc('delete')}</button>
        </div>
      )} />

      <Dialog open={adding} onClose={() => setAdding(false)} title={t('pickType')}>
        <ul className="divide-y divide-rule">
          {SECTION_TYPES.map((type) => (
            <li key={type}>
              <button type="button" className="w-full py-2 text-start hover:text-accent" onClick={() => {
                const s: BuilderSection = { id: crypto.randomUUID(), isNew: true, locale: tab, type, title_ar: null, title_fr: null, is_active: true,
                  config: defaultConfig(type as SectionType, { category: categories[0]?.id, format: formats[0]?.id, tag: tags[0]?.id }) };
                setItems((xs) => [...xs, s]);
                setAdding(false);
                setEditing(s);
              }}>
                <strong>{t(`type_${type}` as 'type_lead')}</strong>
                <span className="block text-[13px] text-ink-3">{t(`help_${type}` as 'help_lead')}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title={editing ? t(`type_${editing.type}` as 'type_lead') : ''}>
        {editing && <SectionForm s={editing} categories={categories} formats={formats} tags={tags} adSlots={adSlots}
          onSave={(next) => { setItems((xs) => xs.map((x) => (x.id === next.id ? next : x))); setEditing(null); }} />}
      </Dialog>
    </div>
  );
}

function SectionForm({ s, onSave, categories, formats, tags, adSlots }: { s: BuilderSection; onSave: (s: BuilderSection) => void; categories: Opt[]; formats: Opt[]; tags: Opt[]; adSlots: { key: string; name: string }[] }) {
  const t = useTranslations('admin.homepage');
  const tc = useTranslations('admin.common');
  const c = s.config as Record<string, unknown>;
  const select = (name: string, label: string, opts: { v: string; l: string }[], value: unknown) => (
    <div><label className="a-label" htmlFor={`s-${name}`}>{label}</label>
      <select id={`s-${name}`} name={name} defaultValue={String(value ?? '')} className="a-select">{opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
  );
  const num = (name: string, label: string, value: unknown, max = 20) => (
    <div><label className="a-label" htmlFor={`s-${name}`}>{label}</label><input id={`s-${name}`} name={name} type="number" min={1} max={max} defaultValue={Number(value ?? 5)} className="a-input w-28" /></div>
  );
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const config: Record<string, unknown> = {};
      for (const [k, v] of f.entries()) if (k.startsWith('c_')) config[k.slice(2)] = /^\d+$/.test(String(v)) && !k.endsWith('_id') ? Number(v) : String(v);
      onSave({ ...s, title_ar: String(f.get('title_ar') ?? '') || null, title_fr: String(f.get('title_fr') ?? '') || null, locale: f.get('both') === 'on' ? 'both' : s.locale === 'both' ? 'ar' : s.locale, config: { ...c, ...config } });
    }}>
      {s.type !== 'breaking_ticker' && s.type !== 'ad_slot' && s.type !== 'text_block' && s.type !== 'lead' && (
        <>
          <div><label className="a-label" htmlFor="s-title_ar">{t('titleOverride')} — {tc('arabic')}</label><input id="s-title_ar" name="title_ar" defaultValue={s.title_ar ?? ''} className="a-input" /></div>
          <div><label className="a-label" htmlFor="s-title_fr">{t('titleOverride')} — {tc('french')}</label><input id="s-title_fr" name="title_fr" lang="fr" dir="ltr" defaultValue={s.title_fr ?? ''} className="a-input" /></div>
        </>
      )}
      {s.type === 'lead' && (<>{num('c_secondary_count', t('secondaryCount'), c.secondary_count, 6)}{select('c_layout', t('layout'), ['side_by_side', 'stacked'].map((v) => ({ v, l: t(`layout_${v}` as 'layout_stacked') })), c.layout)}</>)}
      {s.type === 'category_block' && (<>{select('c_category_id', t('category'), categories.map((x) => ({ v: x.id, l: x.name })), c.category_id)}{num('c_count', t('count'), c.count)}
        {select('c_layout', t('layout'), ['one_big_four_list', 'feature_plus_list', 'three_columns', 'list_only'].map((v) => ({ v, l: t(`layout_${v}` as 'layout_stacked') })), c.layout)}</>)}
      {s.type === 'format_block' && (<>{select('c_format_id', t('format'), formats.map((x) => ({ v: x.id, l: x.name })), c.format_id)}{num('c_count', t('count'), c.count, 8)}</>)}
      {s.type === 'tag_block' && (<>{select('c_tag_id', t('tag'), tags.map((x) => ({ v: x.id, l: x.name })), c.tag_id)}{num('c_count', t('count'), c.count, 8)}</>)}
      {(s.type === 'latest_list' || s.type === 'editor_picks' || s.type === 'opinion') && num('c_count', t('count'), c.count, 30)}
      {s.type === 'most_read' && (<>{num('c_window_days', t('windowDays'), c.window_days, 90)}{num('c_count', t('count'), c.count, 10)}</>)}
      {s.type === 'ad_slot' && select('c_ad_slot_key', t('adSlot'), adSlots.map((a) => ({ v: a.key, l: a.name })), c.ad_slot_key)}
      {s.type === 'text_block' && (
        <>
          <div><label className="a-label" htmlFor="s-text_ar">{t('text')} — {tc('arabic')}</label><textarea id="s-text_ar" name="c_text_ar" defaultValue={String(c.text_ar ?? '')} className="a-textarea" /></div>
          <div><label className="a-label" htmlFor="s-text_fr">{t('text')} — {tc('french')}</label><textarea id="s-text_fr" name="c_text_fr" lang="fr" dir="ltr" defaultValue={String(c.text_fr ?? '')} className="a-textarea" /></div>
        </>
      )}
      <label className="flex items-center gap-2"><input type="checkbox" name="both" defaultChecked={s.locale === 'both'} />{t('both')}</label>
      <button type="submit" className="a-btn a-btn-primary">{tc('save')}</button>
    </form>
  );
}
