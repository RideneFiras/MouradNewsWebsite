'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { EngagementClock, scrollPercent } from '@/lib/analytics/engagement';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function send(payload: object) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.('/api/t', new Blob([body], { type: 'application/json' }))) return;
  } catch {
    /* fall back */
  }
  void fetch('/api/t', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
}

const readablePath = (p: string) => {
  try {
    return decodeURIComponent(p).slice(0, 300);
  } catch {
    return p.slice(0, 300);
  }
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (+c ^ (crypto.getRandomValues(new Uint8Array(1))[0]! & (15 >> (+c / 4)))).toString(16)));

/**
 * First-party, cookieless tracker (docs/07): a page-view beacon per page (client-side
 * navigations included) and an engagement beacon (active seconds, scroll depth) when the
 * page is hidden or left. No cookies, no storage, no identifiers in the browser.
 */
export function Tracker({ token, locale }: { token: string; locale: 'ar' | 'fr' }) {
  const pathname = usePathname();
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || /\/(admin|preview)(\/|$)/.test(pathname)) return;
    const pvId = uuid();
    const now = () => Date.now();
    const clock = new EngagementClock(now(), document.visibilityState === 'visible');

    // UTM parameters: read, then remove from the address bar so they aren't re-shared.
    const url = new URL(window.location.href);
    const utm = { utm_source: url.searchParams.get('utm_source'), utm_medium: url.searchParams.get('utm_medium'), utm_campaign: url.searchParams.get('utm_campaign') };
    if (utm.utm_source || utm.utm_medium || utm.utm_campaign) {
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(window.history.state, '', url.pathname + (url.search ? url.search : '') + url.hash);
    }

    const art = document.querySelector<HTMLElement>('[data-track-article]');
    const articleId = art ? Number(art.dataset.trackArticle) : null;
    const section = art?.dataset.trackSection ?? pathname.match(/^\/(?:ar|fr)\/section\/([a-z0-9-]+)/)?.[1] ?? null;
    send({
      type: 'pv', pv_id: pvId, path: readablePath(pathname), article_public_id: articleId || null, category_slug: section,
      locale, referrer: prevUrl.current ?? document.referrer ?? null, ...utm, screen_w: window.screen?.width ?? null, ts_token: token,
    });
    prevUrl.current = window.location.href;

    const body = document.querySelector<HTMLElement>('[data-article-body]');
    let readSent = false;
    const onScroll = () => {
      clock.activity(now());
      const el = body ?? document.documentElement;
      const r = el.getBoundingClientRect();
      clock.scroll(scrollPercent(r.top, r.height, window.innerHeight));
      if (articleId && !readSent && clock.scrollPct >= 75) {
        readSent = true;
        window.gtag?.('event', 'article_read', { section: section ?? '', author: art?.dataset.trackAuthor ?? '' });
      }
    };
    const onActivity = () => clock.activity(now());
    let lastSent = -1;
    const flush = () => {
      clock.tick(now());
      const key = clock.seconds * 1000 + clock.scrollPct;
      if (key === lastSent) return;
      lastSent = key;
      send({ type: 'eng', pv_id: pvId, engaged_seconds: clock.seconds, max_scroll_pct: clock.scrollPct });
    };
    const onVisibility = () => {
      clock.setVisible(now(), document.visibilityState === 'visible');
      if (document.visibilityState === 'hidden') flush();
    };
    const timer = window.setInterval(() => clock.tick(now()), 5000);
    window.addEventListener('scroll', onScroll, { passive: true });
    ['keydown', 'pointerdown', 'pointermove', 'touchstart'].forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    onScroll();
    return () => {
      flush();
      window.clearInterval(timer);
      window.removeEventListener('scroll', onScroll);
      ['keydown', 'pointerdown', 'pointermove', 'touchstart'].forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [pathname, token, locale]);

  return null;
}
