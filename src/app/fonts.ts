// Fonts (docs/02 "Typography"), all self-hosted: no runtime requests to Google.
// - Arabic faces: subset files in src/app/fonts/ (basic Arabic block, every OpenType
//   feature kept), built by scripts/fonts/subset-arabic-fonts.sh — about a third lighter
//   than Google's "arabic" subset, which carries Persian/Urdu extensions we never use.
// - Latin faces: next/font/google, Latin subsets only (downloaded only when Latin text
//   is on the page, thanks to unicode-range).
// Arabic text faces use display "optional": if a font isn't ready at first paint (slow
// first visit) the page keeps the fallback instead of re-wrapping headlines later (no
// metric-matched fallback exists for Arabic, so a swap moves text); it is cached for the
// next page. Latin faces and the nameplate keep "swap": next/font gives Latin faces a
// size-adjusted fallback, and the nameplate box has a fixed height. Families and weights verified on
// fonts.googleapis.com on 2026-10-01 (DECISIONS.md).
import localFont from 'next/font/local';
import { IBM_Plex_Sans, Markazi_Text, Source_Serif_4 } from 'next/font/google';

// The Arabic faces declare the same unicode-range as the subset files, so they are never
// downloaded for Latin text, and have no fallback entries: next/font would otherwise add a
// metric "Fallback" face (local Times/Arial, no unicode-range) that captures Latin text —
// and, on Windows, whose Times/Arial contain Arabic, Arabic text too. They come first in
// every font stack (tokens.css). next/font requires literal options, hence the repetition.

export const aref = localFont({
  src: './fonts/ArefRuqaa-700-ar.woff2', weight: '700', display: 'swap', variable: '--f-aref', preload: false, fallback: [], adjustFontFallback: false, declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const markaziAr = localFont({
  src: './fonts/MarkaziText-var-ar.woff2', weight: '400 700', display: 'optional', variable: '--f-markazi-ar', preload: true, fallback: [], adjustFontFallback: false, declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const naskh = localFont({
  src: './fonts/NotoNaskhArabic-var-ar.woff2', weight: '400 700', display: 'optional', variable: '--f-naskh', preload: true, fallback: [], adjustFontFallback: false, declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const plexAr = localFont({
  src: [
    { path: './fonts/IBMPlexSansArabic-400-ar.woff2', weight: '400' },
    { path: './fonts/IBMPlexSansArabic-600-ar.woff2', weight: '600' },
  ],
  display: 'optional', variable: '--f-plex-ar', preload: false, fallback: [], adjustFontFallback: false, declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const markazi = Markazi_Text({ weight: ['600', '700'], subsets: ['latin'], display: 'swap', variable: '--f-markazi', preload: false });
export const sourceSerif = Source_Serif_4({ weight: ['400', '600'], subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--f-source-serif', preload: false });
export const plex = IBM_Plex_Sans({ weight: ['400', '600'], subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--f-plex', preload: false });

export const fontVariables = [aref, markaziAr, naskh, plexAr, markazi, sourceSerif, plex].map((f) => f.variable).join(' ');
