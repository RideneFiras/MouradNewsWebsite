import type { ReactNode } from 'react';
import '@/styles/globals.css';

// The <html> element is rendered by app/[locale]/layout.tsx (lang/dir per locale).
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
