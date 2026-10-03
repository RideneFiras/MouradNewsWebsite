'use client';
import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallLabels {
  install: string;
  installed: string;
  androidTitle: string;
  androidSteps: string[];
  iosTitle: string;
  iosSteps: string[];
}

/**
 * "Add to Home Screen" helper. Android/Chrome: a real install button (beforeinstallprompt).
 * iPhone/iPad: Safari has no install API, so the steps are shown first. Already opened from
 * the home screen: says so.
 */
export function InstallApp({ labels }: { labels: InstallLabels }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the device once after hydration
    setInstalled(standalone);
    setIos(/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return <p className="dek border-s-[3px] border-accent ps-4">{labels.installed}</p>;

  const android = (
    <section key="android">
      <h2 className="headline-3 mb-2">{labels.androidTitle}</h2>
      {prompt && (
        <button type="button" className="btn btn-primary mb-4" onClick={async () => {
          await prompt.prompt();
          const { outcome } = await prompt.userChoice;
          if (outcome === 'accepted') setInstalled(true);
          setPrompt(null);
        }}>
          {labels.install}
        </button>
      )}
      <ol className="list-decimal space-y-1.5 ps-6 font-body text-[18px] leading-[1.8]">
        {labels.androidSteps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </section>
  );
  const iphone = (
    <section key="ios">
      <h2 className="headline-3 mb-2">{labels.iosTitle}</h2>
      <ol className="list-decimal space-y-1.5 ps-6 font-body text-[18px] leading-[1.8]">
        {labels.iosSteps.map((s) => <li key={s}>{s}</li>)}
      </ol>
    </section>
  );
  return <div className="space-y-8">{ios ? [iphone, android] : [android, iphone]}</div>;
}
