'use client';
import type { MouseEvent } from 'react';
import { usePathname } from 'next/navigation';

/** «ع · FR»: current language bold. Goes to the same page in the other interface; article
 * pages resolve the linked translation (or the other homepage) server-side. */
export function LangSwitch({ locale, className = '' }: { locale: 'ar' | 'fr'; className?: string }) {
  const pathname = usePathname() || `/${locale}`;
  const other = locale === 'ar' ? 'fr' : 'ar';
  const rest = pathname.replace(/^\/(ar|fr)(?=\/|$)/, '');
  const href = `/${other}${rest}`;
  // Pages whose other-language URL isn't the same path (articles, static pages) declare it:
  // <span hidden data-lang-switch="/fr/..."> (linked translation, or the other homepage).
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    document.cookie = `NEXT_LOCALE=${other}; path=/; max-age=31536000; samesite=lax`;
    const declared = document.querySelector<HTMLElement>('[data-lang-switch]')?.dataset.langSwitch;
    if (declared) e.currentTarget.href = declared;
  };
  const item = (l: 'ar' | 'fr', label: string) =>
    l === locale ? (
      <span className="font-semibold text-ink" aria-current="true" lang={l}>{label}</span>
    ) : (
      <a href={href} onClick={onClick} hrefLang={l} lang={l} className="hover:text-accent">{label}</a>
    );
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {item('ar', 'ع')}
      <span aria-hidden="true">·</span>
      {item('fr', 'FR')}
    </span>
  );
}
