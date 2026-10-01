import { getTranslations } from 'next-intl/server';
import type { Lang } from '@/lib/data/types';
import type { MediaKitSettings } from '@/lib/data/settings';
import { formatDate } from '@/lib/format/date';
import { formatAudience, formatDuration } from '@/lib/format/number';
import { SectionHeader } from './story';
import { PrintButton } from './PrintButton';

type Numbers = Record<string, unknown> & { rounded?: boolean; period?: string; from?: string; to?: string };

const COUNTRY: Record<string, { ar: string; fr: string }> = {
  TN: { ar: 'تونس', fr: 'Tunisie' }, FR: { ar: 'فرنسا', fr: 'France' }, DZ: { ar: 'الجزائر', fr: 'Algérie' }, LY: { ar: 'ليبيا', fr: 'Libye' },
  IT: { ar: 'إيطاليا', fr: 'Italie' }, DE: { ar: 'ألمانيا', fr: 'Allemagne' }, BE: { ar: 'بلجيكا', fr: 'Belgique' }, CA: { ar: 'كندا', fr: 'Canada' },
  MA: { ar: 'المغرب', fr: 'Maroc' }, US: { ar: 'الولايات المتحدة', fr: 'États-Unis' }, CH: { ar: 'سويسرا', fr: 'Suisse' }, QA: { ar: 'قطر', fr: 'Qatar' },
  SA: { ar: 'السعودية', fr: 'Arabie saoudite' }, AE: { ar: 'الإمارات', fr: 'Émirats' }, GB: { ar: 'المملكة المتحدة', fr: 'Royaume-Uni' },
};

/** Live audience numbers (read-only, from media_kit_public()), ad formats and contact. */
export async function MediaKit({ locale, numbers, cfg }: { locale: Lang; numbers: Numbers; cfg: MediaKitSettings }) {
  const t = await getTranslations({ locale, namespace: 'mediaKit' });
  const rounded = Boolean(numbers.rounded);
  const n = (k: string) => (typeof numbers[k] === 'number' ? (numbers[k] as number) : null);
  const big = (v: number) => (rounded && v >= 100 ? t('moreThan', { n: formatAudience(v, locale, true) }) : formatAudience(v, locale, false));
  const tiles: { label: string; value: string; def?: string }[] = [];
  if (n('monthly_visitors') !== null) tiles.push({ label: t('monthlyVisitors'), value: big(n('monthly_visitors')!), def: t('def_visitors') });
  if (n('monthly_pageviews') !== null) tiles.push({ label: t('monthlyPageviews'), value: big(n('monthly_pageviews')!), def: t('def_pageviews') });
  if (n('engaged_avg_seconds') !== null) tiles.push({ label: t('engagedTime'), value: formatDuration(n('engaged_avg_seconds')!, locale), def: t('def_engaged') });
  if (n('mobile_share') !== null) tiles.push({ label: t('mobileShare'), value: `${n('mobile_share')}%` });
  const geo = numbers.geo as { tunisia_share?: number; abroad_share?: number; top_countries?: { country: string; share: number }[] } | undefined;
  if (geo?.tunisia_share != null) tiles.push({ label: t('tunisiaShare'), value: `${geo.tunisia_share}%` });
  if (geo?.abroad_share != null) tiles.push({ label: t('abroadShare'), value: `${geo.abroad_share}%` });
  if (n('articles_per_month') !== null) tiles.push({ label: t('articlesPerMonth'), value: formatAudience(n('articles_per_month')!, locale, false) });
  const sections = (numbers.top_sections as { name_ar: string; name_fr: string | null }[] | undefined) ?? [];
  const fb = numbers.facebook as { followers?: number; recorded_for?: string } | undefined;
  const period = numbers.period && numbers.from && numbers.to
    ? t(`period_${numbers.period}` as 'period_last_full_month', { from: formatDate(`${numbers.from}T12:00:00Z`, locale, 'short'), to: formatDate(`${numbers.to}T12:00:00Z`, locale, 'short') })
    : null;
  const hasData = tiles.some((x) => x.value !== '0' && x.value !== '0%');
  const statement = locale === 'fr' ? cfg.statement_fr || cfg.statement_ar : cfg.statement_ar || cfg.statement_fr;
  const formats = (cfg.formats ?? []).filter((f) => f.visible);

  return (
    <div className="mt-12 space-y-12">
      <section aria-labelledby="mk-audience">
        <SectionHeader id="mk-audience" title={t('audience')} />
        {period && <p className="meta -mt-2 mb-4">{period}</p>}
        {!hasData ? (
          <p className="dek">{t('noData')}</p>
        ) : (
          <dl className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
            {tiles.map((x) => (
              <div key={x.label} className="border-t border-rule py-4">
                <dt className="meta">{x.label}</dt>
                <dd className="font-headline text-[36px] leading-tight font-bold tabular-nums">{x.value}</dd>
                {x.def && <dd className="caption mt-1">{x.def}</dd>}
              </div>
            ))}
          </dl>
        )}
        {geo?.top_countries && geo.top_countries.length > 0 && (
          <p className="meta mt-4">{t('topCountries')}: {geo.top_countries.map((c) => `${COUNTRY[c.country]?.[locale] ?? c.country} ${c.share}%`).join(' · ')}</p>
        )}
        {sections.length > 0 && (
          <p className="meta mt-2">{t('topSections')}: {sections.map((s) => (locale === 'fr' ? s.name_fr || s.name_ar : s.name_ar)).join(' · ')}</p>
        )}
        {statement && <p className="mt-6 max-w-[var(--measure)] border-s-[3px] border-rule-strong ps-4 font-body text-[17px] leading-relaxed">{statement}</p>}
      </section>

      {fb?.followers != null && (
        <section className="border-t border-rule pt-4">
          <p className="meta">{t('facebookFollowers')}</p>
          <p className="font-headline text-[32px] font-bold tabular-nums">{big(fb.followers)}</p>
          {fb.recorded_for && <p className="caption">{t('facebookNote', { date: formatDate(`${fb.recorded_for}T12:00:00Z`, locale, 'short') })}</p>}
        </section>
      )}

      {formats.length > 0 && (
        <section aria-labelledby="mk-formats">
          <SectionHeader id="mk-formats" title={t('formats')} />
          <div className="prose-article max-w-none">
            <div className="table-wrap">
              <table>
                <tbody>
                  {formats.map((f, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{locale === 'fr' ? f.name_fr || f.name_ar : f.name_ar}</td>
                      <td>{locale === 'fr' ? f.description_fr || f.description_ar : f.description_ar}</td>
                      <td dir="ltr" className="whitespace-nowrap">{f.size}</td>
                      <td className="whitespace-nowrap">{(locale === 'fr' ? f.price_fr : f.price_ar) || t('onRequest')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="border-t-2 border-rule-strong pt-4">
        <h2 className="kicker mb-2 text-ink">{t('contact')}</h2>
        <p className="font-ui text-[16px]">
          {[cfg.contact_name, cfg.contact_phone, cfg.contact_email].filter(Boolean).map((v, i) => (
            <span key={i}>{i > 0 && ' · '}<bdi>{v}</bdi></span>
          ))}
        </p>
        <div className="mt-4"><PrintButton label={t('downloadPdf')} /></div>
      </section>
    </div>
  );
}
