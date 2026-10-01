'use client';
import { useState, useSyncExternalStore } from 'react';
import { FacebookIcon, LinkIcon, WhatsappIcon, XIcon } from '@/components/shared/icons';

function withUtm(url: string, source: string) {
  const u = new URL(url);
  u.searchParams.set('utm_source', source);
  u.searchParams.set('utm_medium', 'share');
  return u.toString();
}

/** WhatsApp first and prominent; share links carry utm_source so shares can be counted. */
export function ShareRow({ url, title, labels }: {
  url: string; title: string; labels: { share: string; facebook: string; whatsapp: string; x: string; copy: string; copied: string };
}) {
  const [copied, setCopied] = useState(false);
  const canNative = useSyncExternalStore(
    () => () => {},
    () => typeof navigator.share === 'function' && window.matchMedia('(max-width: 767px)').matches,
    () => false,
  );

  const wa = `https://wa.me/?text=${encodeURIComponent(`${title} ${withUtm(url, 'whatsapp')}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withUtm(url, 'facebook'))}`;
  const x = `https://x.com/intent/post?url=${encodeURIComponent(withUtm(url, 'x'))}&text=${encodeURIComponent(title)}`;
  const item = 'inline-flex min-h-11 items-center gap-2 px-3 font-ui text-[14px] font-semibold border border-rule hover:border-accent hover:text-accent';

  return (
    <div className="share-row flex flex-wrap items-center gap-2" aria-label={labels.share}>
      <a href={wa} target="_blank" rel="noopener" className={`${item} border-ink`} data-share="whatsapp">
        <WhatsappIcon size={20} /> <span>{labels.whatsapp}</span>
      </a>
      <a href={fb} target="_blank" rel="noopener" className={item} data-share="facebook">
        <FacebookIcon size={18} /> <span className="hidden md:inline">{labels.facebook}</span>
        <span className="sr-only md:hidden">{labels.facebook}</span>
      </a>
      <a href={x} target="_blank" rel="noopener" className={item} data-share="x">
        <XIcon size={16} /> <span className="hidden md:inline">{labels.x}</span>
        <span className="sr-only md:hidden">{labels.x}</span>
      </a>
      <button
        type="button"
        className={item}
        onClick={async () => {
          const shareUrl = withUtm(url, 'copy');
          if (canNative) {
            try {
              await navigator.share({ title, url: shareUrl });
              return;
            } catch {
              /* cancelled: fall back to copy */
            }
          }
          try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {
            window.prompt(labels.copy, shareUrl);
          }
        }}
      >
        <LinkIcon size={18} /> <span>{copied ? labels.copied : canNative ? labels.share : labels.copy}</span>
      </button>
      <span className="sr-only" aria-live="polite">{copied ? labels.copied : ''}</span>
    </div>
  );
}
