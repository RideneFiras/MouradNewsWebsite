'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CloseIcon } from '@/components/shared/icons';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'elborj-install-dismissed';
const DAYS = 30;

/**
 * Registers the service worker (installable app + offline page) and, on phones, shows a slim
 * bar at the bottom: «ثبّت البرج على هاتفك». Android/Chrome: a real install button. iPhone
 * (Safari has no install API): a link to the steps page. Not on article pages (they have the
 * share bar), not when already installed, and not for 30 days after it is closed.
 */
export function InstallBanner({ locale, labels }: { locale: 'ar' | 'fr'; labels: { text: string; install: string; how: string; close: string } }) {
  const pathname = usePathname() ?? '';
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = Date.now() - Number(localStorage.getItem(KEY) ?? 0) < DAYS * 86400000;
    } catch { /* private mode: show it */ }
    const phone = window.matchMedia('(max-width: 1023px)').matches;
    const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    // Only Safari can add to the home screen on iOS (Chrome/Firefox there can't): show it there.
    const iosSafari = isIos && /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Instagram/i.test(navigator.userAgent);
    const eligible = phone && !standalone && !dismissed;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device once after hydration
    setIos(iosSafari);
    if (eligible && iosSafari) setHidden(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
      if (eligible) setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (hidden || pathname.includes('/article/') || pathname.endsWith('/app') || (!prompt && !ios)) return null;
  const close = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ }
    setHidden(true);
  };
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t-2 border-rule-strong bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden" role="region" aria-label={labels.text}>
      <div className="container-page flex items-center gap-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static icon */}
        <img src="/icons/icon-192.png" alt="" width={36} height={36} className="shrink-0" />
        <p className="min-w-0 flex-1 font-ui text-[15px] font-semibold leading-snug">{labels.text}</p>
        {prompt ? (
          <button type="button" className="btn btn-primary shrink-0" onClick={async () => {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
            setHidden(true);
          }}>{labels.install}</button>
        ) : (
          <a href={`/${locale}/app`} className="btn btn-primary shrink-0">{labels.how}</a>
        )}
        <button type="button" onClick={close} className="inline-flex h-11 w-11 shrink-0 items-center justify-center" aria-label={labels.close}><CloseIcon size={18} /></button>
      </div>
    </div>
  );
}
