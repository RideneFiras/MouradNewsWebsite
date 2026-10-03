'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Phones: the section strip scrolls sideways, but nothing showed it. While more sections are
 * hidden at the end, a small «←» button sits at the end of the strip; tapping it scrolls on.
 * (No fade: gradients are on the design system's banned list.)
 */
export function NavScroll({ children, label }: { children: ReactNode; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const ul = box.current?.querySelector('ul');
    if (!ul) return;
    const update = () => setMore(Math.abs(ul.scrollLeft) + ul.clientWidth < ul.scrollWidth - 4);
    update();
    ul.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      ul.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div ref={box} className="relative min-w-0 flex-1">
      {children}
      {more && (
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            const ul = box.current?.querySelector('ul');
            const rtl = getComputedStyle(ul ?? document.documentElement).direction === 'rtl';
            ul?.scrollBy({ left: rtl ? -160 : 160, behavior: 'smooth' });
          }}
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center border-s border-rule bg-paper font-ui text-[18px] text-ink-2 lg:hidden"
        >
          <span aria-hidden="true" className="inline-block ltr:-scale-x-100">←</span>
        </button>
      )}
    </div>
  );
}
