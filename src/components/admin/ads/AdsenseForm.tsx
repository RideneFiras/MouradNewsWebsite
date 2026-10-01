'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { saveSettings } from '@/lib/admin/site';

/** AdSense account + ads.txt (stored in site_settings: adsense, ads_txt). */
export function AdsenseForm({ initial }: { initial: { client_id: string; enabled: boolean; ads_txt: string } }) {
  const t = useTranslations('admin.ads');
  const tc = useTranslations('admin.common');
  const [v, setV] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const pub = v.client_id.replace(/^ca-/, '');
  const txtOk = !v.client_id || !v.ads_txt.trim() || v.ads_txt.includes(pub);
  return (
    <form className="a-panel space-y-4 p-4" onSubmit={async (e) => {
      e.preventDefault();
      const res = await saveSettings({ adsense: { client_id: v.client_id.trim(), enabled: v.enabled }, ads_txt: { content: v.ads_txt } });
      setStatus(res.ok ? { ok: true, text: t('saved') } : { ok: false, text: tc('error') });
    }}>
      <h2 className="a-h2">{t('adsense')}</h2>
      <p className="a-help">{t('adsenseHelp')}</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="a-label" htmlFor="ads-client">{t('adsenseClient')}</label>
          <input id="ads-client" className="a-input" dir="ltr" pattern="ca-pub-[0-9]{10,20}" placeholder="ca-pub-0000000000000000" value={v.client_id} onChange={(e) => setV({ ...v, client_id: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 self-end pb-3"><input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} />{t('adsenseEnabled')}</label>
      </div>
      <div>
        <label className="a-label" htmlFor="ads-txt">{t('adsTxt')}</label>
        <textarea id="ads-txt" className="a-textarea font-mono text-[13px]" dir="ltr" rows={4} value={v.ads_txt} onChange={(e) => setV({ ...v, ads_txt: e.target.value })} />
        <p className="a-help">{t('adsTxtHelp')} · <a href="/ads.txt" target="_blank" rel="noopener" className="underline">{t('adsTxtView')}</a></p>
        {!txtOk && <p className="a-error">{t('adsTxtWarn')}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button className="a-btn a-btn-primary">{tc('save')}</button>
        {status && <p role={status.ok ? 'status' : 'alert'} className={status.ok ? 'text-ok text-[14px]' : 'a-error'}>{status.text}</p>}
      </div>
    </form>
  );
}
