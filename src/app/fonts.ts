// Google Fonts, self-hosted at build time by next/font (no runtime requests to Google).
// Families and weights verified on fonts.googleapis.com on 2026-10-01 (DECISIONS.md).
// Only weights the CSS actually uses are loaded (500 is unused: see DECISIONS.md).
import { Aref_Ruqaa, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Markazi_Text, Noto_Naskh_Arabic, Source_Serif_4 } from 'next/font/google';

export const aref = Aref_Ruqaa({ weight: ['700'], subsets: ['arabic', 'latin'], display: 'swap', variable: '--f-aref', preload: false });
export const markazi = Markazi_Text({ weight: ['600', '700'], subsets: ['arabic', 'latin'], display: 'swap', variable: '--f-markazi', preload: true });
export const naskh = Noto_Naskh_Arabic({ weight: ['400', '700'], subsets: ['arabic'], display: 'swap', variable: '--f-naskh', preload: true });
export const sourceSerif = Source_Serif_4({ weight: ['400', '600'], subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--f-source-serif', preload: false });
export const plexAr = IBM_Plex_Sans_Arabic({ weight: ['400', '600'], subsets: ['arabic'], display: 'swap', variable: '--f-plex-ar', preload: false });
export const plex = IBM_Plex_Sans({ weight: ['400', '600'], subsets: ['latin', 'latin-ext'], display: 'swap', variable: '--f-plex', preload: false });

export const fontVariables = [aref, markazi, naskh, sourceSerif, plexAr, plex].map((f) => f.variable).join(' ');
