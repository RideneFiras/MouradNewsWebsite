// Fonts (docs/02 "Typography"), all self-hosted: no runtime requests to Google.
// - Arabic faces: subset files in src/app/fonts/ (basic Arabic block, every OpenType
//   feature kept), built by scripts/fonts/subset-arabic-fonts.sh — about a third lighter
//   than Google's "arabic" subset, which carries Persian/Urdu extensions we never use.
// - Latin faces: next/font/google, Latin subsets only (downloaded only when Latin text
//   is on the page, thanks to unicode-range).
// Text faces use display "optional": if a font isn't ready at first paint (slow first
// visit) the page keeps the fallback instead of re-wrapping headlines later (layout
// shift); it is cached for the next page. The nameplate keeps "swap": its box has a
// fixed height, so swapping it can't move anything. Families and weights verified on
// fonts.googleapis.com on 2026-10-01 (DECISIONS.md).
import localFont from 'next/font/local';
import { IBM_Plex_Sans, Markazi_Text, Source_Serif_4 } from 'next/font/google';

// The Arabic faces declare the same unicode-range as the subset files, so they are never
// downloaded for Latin text (next/font requires literal options, hence the repetition).

export const aref = localFont({
  src: './fonts/ArefRuqaa-700-ar.woff2', weight: '700', display: 'swap', variable: '--f-aref', preload: false, fallback: ['serif'], declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const markaziAr = localFont({
  src: './fonts/MarkaziText-var-ar.woff2', weight: '400 700', display: 'optional', variable: '--f-markazi-ar', preload: true, fallback: ['serif'], declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const naskh = localFont({
  src: './fonts/NotoNaskhArabic-var-ar.woff2', weight: '400 700', display: 'optional', variable: '--f-naskh', preload: true, fallback: ['serif'], declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const plexAr = localFont({
  src: [
    { path: './fonts/IBMPlexSansArabic-400-ar.woff2', weight: '400' },
    { path: './fonts/IBMPlexSansArabic-600-ar.woff2', weight: '600' },
  ],
  display: 'optional', variable: '--f-plex-ar', preload: false, fallback: ['system-ui', 'sans-serif'], declarations: [{ prop: 'unicode-range', value: 'U+0600-06FF, U+200C-200F, U+2010-2011, U+FD3E-FD3F' }],
});
export const markazi = Markazi_Text({ weight: ['600', '700'], subsets: ['latin'], display: 'optional', variable: '--f-markazi', preload: false });
export const sourceSerif = Source_Serif_4({ weight: ['400', '600'], subsets: ['latin', 'latin-ext'], display: 'optional', variable: '--f-source-serif', preload: false });
export const plex = IBM_Plex_Sans({ weight: ['400', '600'], subsets: ['latin', 'latin-ext'], display: 'optional', variable: '--f-plex', preload: false });

export const fontVariables = [aref, markaziAr, naskh, plexAr, markazi, sourceSerif, plex].map((f) => f.variable).join(' ');
