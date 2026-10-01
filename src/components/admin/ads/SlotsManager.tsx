'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveSlot } from '@/lib/admin/ads';

export interface SlotRow {
  key: string; label_ar: string; label_fr: string | null; mode: 'off' | 'adsense' | 'direct' | 'house'; adsense_slot_id: string | null;
  sizes: { desktop: [number, number]; mobile: [number, number] }; is_active: boolean;
}
const MODES = ['off', 'adsense', 'direct', 'house'] as const;

function SlotEditor({ initial }: { initial: SlotRow }) {
  const t = useTranslations('admin.ads');
  const tc = useTranslations('admin.common');
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dim = (which: 'desktop' | 'mobile', i: 0 | 1, label: string) => (
    <label className="text-[13px]">
      <span className="block text-ink-3">{label}</span>
      <input type="number" min={50} max={1200} className="a-input min-h-9 w-20 py-1" dir="ltr" value={s.sizes[which][i]}
        onChange={(e) => {
          const next = [...s.sizes[which]] as [number, number];
          next[i] = Number(e.target.value);
          setS({ ...s, sizes: { ...s.sizes, [which]: next } });
        }} />
    </label>
  );
  return (
    <form className="grid gap-3 border-b border-rule py-4 lg:grid-cols-[1.2fr_1fr_1.4fr_auto] lg:items-end" onSubmit={async (e) => {
      e.preventDefault();
      const res = await saveSlot(s);
      setMsg(res.ok ? { ok: true, text: t('saved') } : { ok: false, text: res.field === 'adsense_slot_id' ? t('adsenseSlotRequired') : tc('error') });
    }}>
      <div>
        <p className="font-semibold">{s.label_ar}</p>
        <p className="text-[13px] text-ink-3"><bdi dir="ltr">{s.key}</bdi> · <bdi lang="fr">{s.label_fr}</bdi></p>
        <label className="mt-1 flex items-center gap-2 text-[13px]"><input type="checkbox" checked={s.is_active} onChange={(e) => setS({ ...s, is_active: e.target.checked })} />{t('active')}</label>
      </div>
      <div className="space-y-2">
        <label className="block text-[13px]">
          <span className="block text-ink-3">{t('mode')}</span>
          <select className="a-select min-h-9 py-1" value={s.mode} onChange={(e) => setS({ ...s, mode: e.target.value as SlotRow['mode'] })}>
            {MODES.map((m) => <option key={m} value={m}>{t(`modes.${m}`)}</option>)}
          </select>
        </label>
        {s.mode === 'adsense' && (
          <label className="block text-[13px]">
            <span className="block text-ink-3">{t('adsenseSlot')}</span>
            <input className="a-input min-h-9 py-1" dir="ltr" inputMode="numeric" pattern="[0-9]{4,20}" value={s.adsense_slot_id ?? ''} onChange={(e) => setS({ ...s, adsense_slot_id: e.target.value })} />
          </label>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <fieldset className="flex gap-2"><legend className="mb-1 text-[13px] font-semibold">{t('desktop')}</legend>{dim('desktop', 0, t('width'))}{dim('desktop', 1, t('height'))}</fieldset>
        <fieldset className="flex gap-2"><legend className="mb-1 text-[13px] font-semibold">{t('mobile')}</legend>{dim('mobile', 0, t('width'))}{dim('mobile', 1, t('height'))}</fieldset>
      </div>
      <div className="flex items-center gap-2">
        <button className="a-btn a-btn-sm">{tc('save')}</button>
        {msg && <span role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-[13px] text-ok' : 'a-error'}>{msg.text}</span>}
      </div>
    </form>
  );
}

export function SlotsManager({ slots }: { slots: SlotRow[] }) {
  return <div>{slots.map((s) => <SlotEditor key={s.key} initial={s} />)}</div>;
}
