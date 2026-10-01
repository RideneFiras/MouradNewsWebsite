'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CloseIcon, MenuIcon } from '@/components/shared/icons';
import { LangSwitch } from './LangSwitch';

export interface MenuSection {
  href: string;
  label: string;
  children: { href: string; label: string }[];
}

/** Full-height sheet with sections, sub-sections, pages and the language switch (mobile). */
export function MobileMenu({ locale, sections, pages, labels }: {
  locale: 'ar' | 'fr';
  sections: MenuSection[];
  pages: { href: string; label: string }[];
  labels: { menu: string; close: string; sections: string; pages: string };
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const opener = openerRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu"
        className="inline-flex h-11 w-11 items-center justify-center" aria-label={labels.menu}>
        <MenuIcon />
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label={labels.menu} className="fixed inset-0 z-50 overflow-y-auto bg-paper">
          <div className="flex items-center justify-between border-b border-rule px-4 py-2">
            <LangSwitch locale={locale} className="meta text-[15px]" />
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex h-11 w-11 items-center justify-center" aria-label={labels.close}>
              <CloseIcon />
            </button>
          </div>
          <nav className="px-4 pb-10" aria-label={labels.sections} onClick={(e) => (e.target as HTMLElement).closest('a') && setOpen(false)}>
            <ul className="hairline-list">
              {sections.map((s) => (
                <li key={s.href} className="py-3">
                  <Link prefetch={false} href={s.href} className="font-headline text-[22px] font-bold">{s.label}</Link>
                  {s.children.length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      {s.children.map((c) => (
                        <li key={c.href}><Link prefetch={false} href={c.href} className="font-ui text-[15px] text-ink-2">{c.label}</Link></li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
            {pages.length > 0 && (
              <>
                <p className="meta mt-8 mb-2">{labels.pages}</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-2">
                  {pages.map((p) => (
                    <li key={p.href}><Link prefetch={false} href={p.href} className="font-ui text-[15px]">{p.label}</Link></li>
                  ))}
                </ul>
              </>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
