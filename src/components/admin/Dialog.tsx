'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from '@/components/shared/icons';

/** Native <dialog> (focus trap + Escape for free). */
export function Dialog({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} aria-label={title} style={wide ? { maxWidth: 'min(1000px, calc(100vw - 32px))' } : undefined}>
      <div className="flex items-center justify-between border-b border-rule px-4 py-2">
        <h2 className="a-h2">{title}</h2>
        <button type="button" className="a-btn a-btn-ghost a-btn-sm" onClick={onClose} aria-label="×"><CloseIcon size={18} /></button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto p-4">{open && children}</div>
    </dialog>
  );
}
