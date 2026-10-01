'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { SiteSettings } from '@/lib/data/settings';
import { consentDefaultsScript } from '@/lib/analytics/consent';

/** GA4 (only when a measurement ID is set in the admin) and Consent Mode v2 defaults (also for AdSense).
 * Loaded after the page is interactive so it never delays the first paint. */
export function Analytics({ settings }: { settings: SiteSettings }) {
  const id = settings.ga4?.measurement_id?.trim();
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (!id || !window.gtag) return;
    if (first.current) {
      first.current = false;
      return;
    }
    window.gtag('event', 'page_view', { page_path: pathname, page_location: window.location.href });
  }, [pathname, id]);
  const ga4 = !!id && /^G-[A-Z0-9]+$/.test(id);
  // AdSense reads the same Consent Mode defaults, so they are set whenever either is on.
  const adsense = !!settings.adsense?.enabled && /^ca-pub-\d+$/.test(settings.adsense?.client_id ?? '');
  if (!ga4 && !adsense) return null;
  return (
    <>
      <Script id="consent-defaults" strategy="afterInteractive">{consentDefaultsScript()}</Script>
      {ga4 && <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />}
      {ga4 && <Script id="ga4-config" strategy="afterInteractive">{`gtag('js',new Date());gtag('config','${id}');`}</Script>}
    </>
  );
}
