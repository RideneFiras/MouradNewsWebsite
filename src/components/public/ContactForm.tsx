'use client';
import { useEffect, useRef, useState } from 'react';

type Labels = Record<'name' | 'email' | 'subject' | 'message' | 'send' | 'sending' | 'sent' | 'failed' | 'subject_news_tip' | 'subject_advertising' | 'subject_correction' | 'subject_other', string>;

export function ContactForm({ locale, labels }: { locale: 'ar' | 'fr'; labels: Labels }) {
  const started = useRef(0);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  useEffect(() => {
    started.current = Date.now();
  }, []);
  return state === 'sent' ? (
    <p role="status" className="border-s-[3px] border-ok bg-white p-4 font-ui">{labels.sent}</p>
  ) : (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState('sending');
        try {
          const res = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: f.get('name'), email: f.get('email'), subject: f.get('subject'), message: f.get('message'),
              website: f.get('website') || undefined, locale, elapsed: Date.now() - started.current,
            }),
          });
          setState(res.ok ? 'sent' : 'failed');
        } catch {
          setState('failed');
        }
      }}
    >
      <div>
        <label htmlFor="c-name" className="mb-1 block font-ui text-[15px] font-semibold">{labels.name}</label>
        <input id="c-name" name="name" required maxLength={200} className="input" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="c-email" className="mb-1 block font-ui text-[15px] font-semibold">{labels.email}</label>
        <input id="c-email" name="email" type="email" required maxLength={320} className="input" dir="ltr" autoComplete="email" />
      </div>
      <div>
        <label htmlFor="c-subject" className="mb-1 block font-ui text-[15px] font-semibold">{labels.subject}</label>
        <select id="c-subject" name="subject" className="input" defaultValue="news_tip">
          {(['news_tip', 'advertising', 'correction', 'other'] as const).map((s) => <option key={s} value={s}>{labels[`subject_${s}`]}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="c-message" className="mb-1 block font-ui text-[15px] font-semibold">{labels.message}</label>
        <textarea id="c-message" name="message" required minLength={5} maxLength={8000} rows={7} className="input" />
      </div>
      <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state === 'failed' && <p role="alert" className="font-ui text-danger">{labels.failed}</p>}
      <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>{state === 'sending' ? labels.sending : labels.send}</button>
    </form>
  );
}
