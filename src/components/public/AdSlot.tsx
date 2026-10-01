import { getTranslations } from 'next-intl/server';
import { getAdData, getCategories, getSettings } from '@/lib/data/queries';
import { mediaUrl } from '@/lib/env';
import { serverEnv } from '@/lib/env.server';
import { makeToken } from '@/lib/analytics/token';
import { matchesSection } from '@/lib/ads/pick';
import type { ActiveCampaign } from '@/lib/data/types';
import { AdSlotClient, type AdCreative } from './AdSlotClient';

function srcSet(variants: Record<string, string> | null, path: string | null): { src: string | null; srcSet?: string } {
  const entries = Object.entries(variants ?? {}).filter(([w]) => /^\d+$/.test(w)).sort((a, b) => Number(a[0]) - Number(b[0]));
  const src = mediaUrl(path ?? entries.at(-1)?.[1]);
  return { src, srcSet: entries.length ? entries.map(([w, p]) => `${mediaUrl(p)} ${w}w`).join(', ') : undefined };
}

function creative(c: ActiveCampaign): AdCreative {
  const d = c.desktop_path ? { ...srcSet(c.desktop_variants, c.desktop_path), w: c.desktop_width, h: c.desktop_height } : null;
  const m = c.mobile_path ? { ...srcSet(c.mobile_variants, c.mobile_path), w: c.mobile_width, h: c.mobile_height } : null;
  return { id: c.id, weight: c.weight, starts_at: c.starts_at, ends_at: c.ends_at, alt: c.alt_text || c.sponsor_name, desktop: d, mobile: m };
}

/**
 * An ad position (docs/02 "Ad slot", docs/07). Resolution: running sponsor campaigns
 * for this slot/language/section (picked in the browser, weighted) → AdSense manual unit
 * when the slot is in AdSense mode → house ad in house mode → nothing (no reserved space).
 */
export async function AdSlot({ slotKey, locale, categoryId, className = '' }: { slotKey: string; locale: 'ar' | 'fr'; categoryId?: string | null; className?: string }) {
  const [{ slots, campaigns }, settings] = await Promise.all([getAdData(), getSettings()]);
  const slot = slots.find((s) => s.key === slotKey);
  if (!slot) return null;
  let parentId: string | null = null;
  if (categoryId) parentId = (await getCategories()).find((c) => c.id === categoryId)?.parent_id ?? null;
  const candidates = slot.mode === 'off' ? [] : campaigns
    .filter((c) => c.slot_key === slotKey && (c.locale === 'both' || c.locale === locale) && matchesSection(c.category_ids, categoryId, parentId))
    .map(creative)
    .filter((c) => c.desktop?.src || c.mobile?.src);
  const client = settings.adsense?.client_id?.trim() ?? '';
  const adsense = slot.mode === 'adsense' && settings.adsense?.enabled && /^ca-pub-\d+$/.test(client) && slot.adsense_slot_id
    ? { client, slot: slot.adsense_slot_id } : null;
  const t = await getTranslations({ locale, namespace: 'common' });
  const hasContent = candidates.length > 0 || !!adsense || slot.mode === 'house';
  return (
    <AdSlotClient
      slotKey={slot.key}
      slotLabel={locale === 'fr' ? slot.label_fr || slot.label_ar : slot.label_ar}
      mode={slot.mode}
      sizes={slot.sizes}
      candidates={candidates}
      adsense={adsense}
      house={slot.mode === 'house' ? { href: `/${locale}/advertise`, text: t('houseAd'), cta: t('houseAdCta') } : null}
      label={t('ad')}
      token={hasContent && candidates.length ? await makeToken(serverEnv.trackerSecret()) : ''}
      className={className}
    />
  );
}
