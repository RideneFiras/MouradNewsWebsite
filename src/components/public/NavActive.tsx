'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/** Underlines the current section in the nav. Article pages declare their section with
 * <span data-active-section="slug" hidden />. */
export function NavActive() {
  const pathname = usePathname();
  useEffect(() => {
    const declared = document.querySelector<HTMLElement>('[data-active-section]')?.dataset.activeSection;
    const fromPath = pathname?.match(/^\/(?:ar|fr)\/section\/([a-z0-9-]+)/)?.[1];
    const slugs = new Set([declared, fromPath, ...(document.querySelector<HTMLElement>('[data-active-parent]')?.dataset.activeParent ?? '').split(',')].filter(Boolean));
    document.querySelectorAll<HTMLAnchorElement>('.masthead-nav a[data-section]').forEach((a) => {
      if (slugs.has(a.dataset.section)) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }, [pathname]);
  return null;
}
