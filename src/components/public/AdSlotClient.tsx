'use client';
import { useEffect, useId, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { running, weightedIndex } from '@/lib/ads/pick';

interface Img { src: string | null; srcSet?: string; w: number | null; h: number | null }
export interface AdCreative { id: string; weight: number; starts_at: string; ends_at: string | null; alt: string; desktop: Img | null; mobile: Img | null }

interface Props {
  slotKey: string;
  slotLabel: string;
  mode: 'off' | 'adsense' | 'direct' | 'house';
  sizes: { desktop?: [number, number]; mobile?: [number, number] };
  candidates: AdCreative[];
  adsense: { client: string; slot: string } | null;
  house: { href: string; text: string; cta: string } | null;
  label: string;
  token: string;
  className?: string;
}

// One pick per slot instance and page view, stable across re-renders (external store
// so the server render, which can't know the pick, stays empty and hydration matches).
const picks = new Map<string, string | null>();
const noop = () => () => {};
function usePick(slotInstance: string, candidates: AdCreative[]): string | null | undefined {
  return useSyncExternalStore(
    noop,
    () => {
      const key = `${window.location.pathname}|${slotInstance}`; // a new pick on every page view
      if (!picks.has(key)) {
        const live = running(candidates, Date.now());
        const i = weightedIndex(live.map((c) => c.weight), Math.random());
        picks.set(key, i >= 0 ? live[i]!.id : null);
      }
      return picks.get(key) ?? null;
    },
    () => undefined,
  );
}
const showSlots = () => new URLSearchParams(window.location.search).get('show_slots') === '1';
const useShowSlots = () => useSyncExternalStore(noop, showSlots, () => false);

function beacon(body: object) {
  const data = JSON.stringify(body);
  if (!navigator.sendBeacon?.('/api/ads/i', new Blob([data], { type: 'application/json' }))) {
    void fetch('/api/ads/i', { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }
}

/** Impression = ≥ 50 % of the creative visible for ≥ 1 s, once per page view (docs/07). */
function useImpression(ref: React.RefObject<HTMLElement | null>, campaignId: string | null | undefined, slotKey: string, token: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !campaignId || !token) return;
    let timer: number | undefined;
    let done = false;
    const io = new IntersectionObserver(([e]) => {
      if (done) return;
      if (e && e.intersectionRatio >= 0.5) {
        timer ??= window.setTimeout(() => {
          done = true;
          io.disconnect();
          beacon({ campaign_id: campaignId, slot: slotKey, ts_token: token });
        }, 1000);
      } else if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: [0, 0.5, 1] });
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [ref, campaignId, slotKey, token]);
}

// AdSense: the script is loaded once, lazily, after the first interaction or when idle.
let adsenseLoading: Promise<void> | null = null;
function loadAdSense(client: string): Promise<void> {
  adsenseLoading ??= new Promise((resolve) => {
    const start = () => {
      const s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.head.appendChild(s);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    let fired = false;
    const once = () => {
      if (fired) return;
      fired = true;
      events.forEach((ev) => window.removeEventListener(ev, once));
      start();
    };
    events.forEach((ev) => window.addEventListener(ev, once, { once: true, passive: true }));
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(once, { timeout: 4000 });
    else window.setTimeout(once, 3000);
  });
  return adsenseLoading;
}

function AdSenseUnit({ client, slot, onUnfilled }: { client: string; slot: string; onUnfilled: () => void }) {
  const ins = useRef<HTMLModElement>(null);
  useEffect(() => {
    const el = ins.current;
    if (!el) return;
    let alive = true;
    void loadAdSense(client).then(() => {
      if (!alive || el.dataset.adsbygoogleStatus) return;
      try {
        ((window as Window & { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
      } catch {
        /* blocked */
      }
    });
    const mo = new MutationObserver(() => {
      if (el.getAttribute('data-ad-status') === 'unfilled') onUnfilled();
    });
    mo.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => {
      alive = false;
      mo.disconnect();
    };
  }, [client, slot, onUnfilled]);
  return <ins ref={ins} className="adsbygoogle block w-full" data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />;
}

export function AdSlotClient({ slotKey, slotLabel, mode, sizes, candidates, adsense, house, label, token, className = '' }: Props) {
  const id = useId();
  const pickId = usePick(`${slotKey}:${id}`, candidates);
  const outline = useShowSlots();
  const box = useRef<HTMLDivElement>(null);
  const creativeRef = useRef<HTMLAnchorElement>(null);
  const picked = pickId ? candidates.find((c) => c.id === pickId) ?? null : null;
  useImpression(creativeRef, picked?.id, slotKey, token);

  const hm = sizes.mobile?.[1] ?? sizes.desktop?.[1] ?? 250;
  const hd = sizes.desktop?.[1] ?? hm;
  const style = { '--ad-h-m': `${hm}px`, '--ad-h-d': `${hd}px` } as CSSProperties;
  const outlineInfo = outline ? (
    <p className="ad-outline-info caption" dir="ltr">{slotKey} · {mode} · {sizes.desktop?.join('×')} / {sizes.mobile?.join('×')} — {slotLabel}</p>
  ) : null;

  // Nothing to show: no box, no reserved space (unless an admin asked to see the slots).
  const nothing = candidates.length === 0 && !adsense && !house;
  if (nothing || pickId === null && !adsense && !house) {
    return outline ? <div className={`ad-slot ad-outline ${className}`} style={style}>{outlineInfo}</div> : null;
  }

  let body: React.ReactNode = null;
  if (picked) {
    const d = picked.desktop;
    const m = picked.mobile ?? d;
    const img = (m ?? d) as Img;
    body = (
      <a ref={creativeRef} href={`/api/ads/c/${picked.id}`} target="_blank" rel="sponsored noopener" className="ad-creative" data-campaign={picked.id}>
        <picture>
          {d && m !== d && d.src && <source media="(min-width: 768px)" srcSet={d.srcSet ?? d.src} />}
          <img src={img.src ?? ''} srcSet={img.srcSet} width={img.w ?? undefined} height={img.h ?? undefined} alt={picked.alt} loading="lazy" decoding="async" />
        </picture>
      </a>
    );
  } else if (pickId === undefined) {
    body = null; // server render / before hydration: reserved space only
  } else if (adsense) {
    body = <AdSenseUnit client={adsense.client} slot={adsense.slot} onUnfilled={() => box.current?.setAttribute('data-state', 'unfilled')} />;
  } else if (house) {
    body = (
      <a href={house.href} className="ad-house">
        <span className="ad-house-text">{house.text}</span>
        <span className="ad-house-cta">{house.cta}</span>
      </a>
    );
  }
  return (
    <aside ref={box} className={`ad-slot ${outline ? 'ad-outline' : ''} ${className}`} style={style} aria-label={label} data-slot={slotKey}>
      <p className="ad-label caption">{label}</p>
      <div className="ad-body">{body}</div>
      {outlineInfo}
    </aside>
  );
}
