'use client';
import { useEffect, useState } from 'react';
import { FacebookIcon, LinkIcon, WhatsappIcon } from '@/components/shared/icons';

const withUtm = (url: string, source: string) => {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'share');
  return u.toString();
};

/**
 * Phones: a slim share bar at the bottom of the screen while reading (WhatsApp first: that is
 * how articles travel in Tunisia). It appears after the first screen and goes away once the
 * share row under the article comes into view, so it never covers the end of the page.
 */
export function MobileShareBar({ url, title, labels }: { url: string; title: string; labels: { whatsapp: string; facebook: string; share: string; copied: string } }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const row = document.querySelector('.share-row');
    let rowAhead = true; // the article's own share row is still below the screen
    const update = () => setShow(window.scrollY > 400 && rowAhead);
    const io = row ? new IntersectionObserver(([en]) => {
      rowAhead = !!en && !en.isIntersecting && en.boundingClientRect.top > 0;
      update();
    }) : null;
    if (row) io!.observe(row);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, []);

  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${withUtm(url, 'whatsapp')}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withUtm(url, 'facebook'))}`;
  const btn = 'inline-flex h-11 items-center justify-center gap-2 border border-rule px-3 font-ui text-[14px] font-semibold';
  return (
    <div aria-hidden={!show} className={`no-print fixed inset-x-0 bottom-0 z-40 border-t border-rule-strong bg-paper pb-[env(safe-area-inset-bottom)] transition-transform duration-200 lg:hidden ${show ? 'translate-y-0' : 'pointer-events-none translate-y-full'}`}>
      <div className="container-page flex items-center gap-2 py-2">
        <a href={wa} target="_blank" rel="noopener" data-share="whatsapp" tabIndex={show ? 0 : -1} className={`${btn} flex-1 border-ink`}>
          <WhatsappIcon size={20} /> <span>{labels.whatsapp}</span>
        </a>
        <a href={fb} target="_blank" rel="noopener" data-share="facebook" tabIndex={show ? 0 : -1} className={`${btn} w-12`} aria-label={labels.facebook}>
          <FacebookIcon size={18} />
        </a>
        <button type="button" tabIndex={show ? 0 : -1} className={`${btn} w-12`} aria-label={copied ? labels.copied : labels.share} onClick={async () => {
          const shareUrl = withUtm(url, 'copy');
          if (typeof navigator.share === 'function') {
            try { await navigator.share({ title, url: shareUrl }); return; } catch { /* cancelled */ }
          }
          try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* ignore */ }
        }}>
          <LinkIcon size={18} />
        </button>
      </div>
    </div>
  );
}
