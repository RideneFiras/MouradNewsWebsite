'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PlayIcon } from '@/components/shared/icons';
import { splitSentences } from '@/lib/public/sentences';

/**
 * «استمع إلى المقال»: reads the article with the device's own voice (Web Speech API), no
 * audio files and no paid service. One utterance per sentence (Chrome cuts long utterances
 * and some engines ignore pause), the sentence being read highlighted with the CSS Custom
 * Highlight API (no DOM changes), the word too where the engine reports word boundaries.
 * Hidden when the device has no voice for the article's language.
 */

type Seg = { el: HTMLElement; start: number; end: number; text: string };
type State = 'idle' | 'playing' | 'paused';

const SENTENCE = 'listen-sentence';
const WORD = 'listen-word';

function subscribeVoices(cb: () => void) {
  if (typeof speechSynthesis === 'undefined') return () => {};
  speechSynthesis.addEventListener('voiceschanged', cb);
  return () => speechSynthesis.removeEventListener('voiceschanged', cb);
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
  // Prefer a local voice (word boundaries are reported), then Tunisian/Maghreb variants.
  const rank = (v: SpeechSynthesisVoice) => (v.localService ? 0 : 2) + (/tn|dz|ma/i.test(v.lang) ? 0 : 1);
  return voices.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/** Text nodes of an element with their offsets in the element's textContent. */
function rangeFor(el: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let pos = 0;
  let startSet = false;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = n.textContent?.length ?? 0;
    if (!startSet && start <= pos + len) {
      range.setStart(n, Math.max(0, start - pos));
      startSet = true;
    }
    if (startSet && end <= pos + len) {
      range.setEnd(n, Math.max(0, end - pos));
      return range;
    }
    pos += len;
  }
  return null;
}

const canHighlight = () => typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

function mark(name: string, range: Range | null) {
  if (!canHighlight()) return;
  if (range) CSS.highlights.set(name, new Highlight(range));
  else CSS.highlights.delete(name);
}

export function ListenButton({ lang, labels }: { lang: 'ar' | 'fr'; labels: { listen: string; pause: string; resume: string; stop: string } }) {
  // The snapshot is the voice's URI (a string, stable between calls); the voice is looked up when speaking.
  const voiceUri = useSyncExternalStore(subscribeVoices, () => pickVoice(lang)?.voiceURI ?? '', () => '');
  const [state, setState] = useState<State>('idle');
  const segs = useRef<Seg[]>([]);
  const index = useRef(0);
  const run = useRef(0); // invalidates callbacks of utterances cancelled by pause/stop

  useEffect(() => () => {
    run.current++;
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    mark(SENTENCE, null);
    mark(WORD, null);
  }, []);

  if (!voiceUri) return null;

  const collect = (): Seg[] => {
    const body = document.querySelector('[data-article-body]');
    if (!body) return [];
    const blocks = body.querySelectorAll<HTMLElement>('.prose-article > p:not(.read-also), .prose-article > h2, .prose-article > h3, .prose-article li, .prose-article blockquote p');
    const out: Seg[] = [];
    blocks.forEach((el) => {
      for (const s of splitSentences(el.textContent ?? '')) out.push({ el, ...s });
    });
    return out;
  };

  const speak = (i: number) => {
    const my = run.current;
    const seg = segs.current[i];
    if (!seg) {
      stop();
      return;
    }
    index.current = i;
    const sentence = rangeFor(seg.el, seg.start, seg.end);
    mark(SENTENCE, sentence);
    mark(WORD, null);
    if (!canHighlight()) seg.el.classList.add('is-reading');
    const r = sentence?.getBoundingClientRect();
    if (r && (r.top < 80 || r.bottom > window.innerHeight - 40)) seg.el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const u = new SpeechSynthesisUtterance(seg.text);
    const voice = speechSynthesis.getVoices().find((v) => v.voiceURI === voiceUri) ?? pickVoice(lang);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    }
    u.rate = 0.95;
    u.onboundary = (e) => {
      if (my !== run.current || e.name !== 'word') return;
      const from = seg.start + e.charIndex;
      const rest = seg.text.slice(e.charIndex);
      const len = e.charLength || (rest.match(/^\S+/)?.[0].length ?? 0);
      if (len) mark(WORD, rangeFor(seg.el, from, from + len));
    };
    u.onend = () => {
      if (my !== run.current) return;
      seg.el.classList.remove('is-reading');
      speak(i + 1);
    };
    u.onerror = u.onend;
    speechSynthesis.speak(u);
  };

  const start = () => {
    segs.current = collect();
    run.current++;
    speechSynthesis.cancel();
    setState('playing');
    speak(0);
  };
  // Pause = cancel and restart the current sentence: speechSynthesis.pause() is unreliable on Android.
  const pause = () => {
    run.current++;
    speechSynthesis.cancel();
    setState('paused');
  };
  const resume = () => {
    run.current++;
    setState('playing');
    speak(index.current);
  };
  function stop() {
    run.current++;
    speechSynthesis.cancel();
    segs.current.forEach((s) => s.el.classList.remove('is-reading'));
    mark(SENTENCE, null);
    mark(WORD, null);
    index.current = 0;
    setState('idle');
  }

  const item = 'inline-flex min-h-11 items-center gap-2 px-3 font-ui text-[14px] font-semibold border border-rule hover:border-accent hover:text-accent';
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`${item} border-ink`}
        aria-pressed={state === 'playing'}
        onClick={state === 'playing' ? pause : state === 'paused' ? resume : start}
      >
        {state === 'playing' ? <PauseGlyph /> : <PlayIcon size={18} />}
        <span>{state === 'playing' ? labels.pause : state === 'paused' ? labels.resume : labels.listen}</span>
      </button>
      {state !== 'idle' && (
        <button type="button" className={item} onClick={stop}>{labels.stop}</button>
      )}
    </div>
  );
}

const PauseGlyph = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M9 6v12M15 6v12" />
  </svg>
);
