import Link from 'next/link';
import { mediaUrl } from '@/lib/env';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';

/**
 * Nameplate from settings:
 * - text nameplate on, no logo: the calligraphic name (Aref Ruqaa);
 * - text nameplate on + logo: the logo as a mark with the name (above it on the large
 *   masthead, beside it in the small/compact bars);
 * - text nameplate off + logo: the logo image alone (a full lockup).
 */
export function Nameplate({ settings, locale, size = 'large' }: { settings: SiteSettings; locale: 'ar' | 'fr'; size?: 'large' | 'small' | 'compact' }) {
  const name = pick(settings.site_name, locale);
  const nameAr = settings.site_name.ar || name;
  const nameFr = settings.site_name.fr;
  const logo = settings.logo.path ? mediaUrl(settings.logo.path) : null;
  const heights = { large: 'h-20 lg:h-24', small: 'h-10', compact: 'h-9' };
  const markHeights = { large: 'h-14 lg:h-16', small: 'h-8', compact: 'h-7' };
  const text = { large: 'text-[56px] lg:text-[84px]', small: 'text-[34px]', compact: 'text-[30px]' };
  if (logo && !settings.logo.use_text_nameplate) {
    return (
      <Link prefetch={false} href={`/${locale}`} className="masthead-nameplate inline-flex flex-col items-center text-ink hover:text-ink" aria-label={name}>
        {/* eslint-disable-next-line @next/next/no-img-element -- uploaded SVG/PNG logo */}
        <img src={logo} alt={name} className={`${heights[size]} w-auto`} />
      </Link>
    );
  }
  return (
    <Link prefetch={false} href={`/${locale}`}
      className={`masthead-nameplate inline-flex items-center text-ink hover:text-ink ${size === 'large' ? 'flex-col' : 'flex-row gap-2'}`} aria-label={name}>
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded SVG/PNG mark, decorative next to the name
        <img src={logo} alt="" aria-hidden="true" className={`${markHeights[size]} w-auto ${size === 'large' ? 'mb-1' : ''}`} />
      )}
      <span lang="ar" className={`nameplate ${text[size]}`}>{nameAr}</span>
      {size === 'large' && nameFr && (
        <span lang="fr" dir="ltr" className="font-headline mt-0 text-[15px] font-semibold tracking-[0.2em] text-ink-2 uppercase">{nameFr}</span>
      )}
    </Link>
  );
}
