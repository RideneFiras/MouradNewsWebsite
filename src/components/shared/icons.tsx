// Thin-stroke icons, allowed only for: search, menu, close, share targets, play, external link
// (docs/02-design-system.md). 18–20px, currentColor.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 20): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false,
});

export const SearchIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
);
export const MenuIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const ExternalIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
);
export const LinkIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
);
export const PlayIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M8 5.5v13l10-6.5z" /></svg>
);
export const FacebookIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M14 8h2.5V4.5H14c-2.2 0-3.5 1.6-3.5 3.8V10H8v3.5h2.5V20H14v-6.5h2.5L17 10h-3V8.6c0-.4.3-.6.6-.6z" /></svg>
);
export const WhatsappIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6z" /><path d="M9.2 8.8c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .4-.1.6l-.4.5c-.1.1-.1.3 0 .5.5.9 1.3 1.6 2.2 2.1.2.1.4.1.5 0l.5-.6c.2-.2.4-.2.6-.1l1.4.7c.2.1.3.3.3.5v.4c0 .4-.2.8-.6 1-.6.3-1.4.4-2.4 0-1.7-.7-3.2-2.2-3.9-3.8-.4-1-.3-1.9 0-2.5z" /></svg>
);
export const XIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} {...p}><path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" strokeWidth={1.2} /></svg>
);
