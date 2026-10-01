import Link from 'next/link';
import { mediaUrl } from '@/lib/env';
import type { SiteSettings } from '@/lib/data/settings';
import { pick } from '@/lib/data/settings';

/** Calligraphic text nameplate (Aref Ruqaa) or the uploaded logo, from settings. */
export function Nameplate({ settings, locale, size = 'large' }: { settings: SiteSettings; locale: 'ar' | 'fr'; size?: 'large' | 'small' | 'compact' }) {
  const name = pick(settings.site_name, locale);
  const nameAr = settings.site_name.ar || name;
  const nameFr = settings.site_name.fr;
  const logoPath = !settings.logo.use_text_nameplate ? settings.logo.path : null;
  const logo = logoPath ? mediaUrl(logoPath) : null;
  const heights = { large: 'h-20 lg:h-24', small: 'h-10', compact: 'h-9' };
  const text = { large: 'text-[56px] lg:text-[84px]', small: 'text-[34px]', compact: 'text-[30px]' };
  return (
    <Link prefetch={false} href={`/${locale}`} className="masthead-nameplate inline-flex flex-col items-center text-ink hover:text-ink" aria-label={name}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded SVG/PNG logo
        <img src={logo} alt={name} className={`${heights[size]} w-auto`} />
      ) : (
        <>
          <span lang="ar" className={`nameplate ${text[size]}`}>{nameAr}</span>
          {size === 'large' && nameFr && (
            <span lang="fr" dir="ltr" className="font-headline mt-0 text-[15px] font-semibold tracking-[0.2em] text-ink-2 uppercase">{nameFr}</span>
          )}
        </>
      )}
    </Link>
  );
}
