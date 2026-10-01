'use client';
import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

/** Vertical list reorderable by drag-and-drop (desktop) and arrow buttons (keyboard, phones). */
export function Sortable<T extends { id: string }>({ items, onReorder, render, className = '' }: {
  items: T[]; onReorder: (next: T[]) => void; render: (item: T, index: number) => ReactNode; className?: string;
}) {
  const t = useTranslations('admin.common');
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x!);
    onReorder(next);
  };
  return (
    <ul className={className}>
      {items.map((it, i) => (
        <li key={it.id} draggable
          onDragStart={(e) => { setDrag(it.id); e.dataTransfer.effectAllowed = 'move'; }}
          onDragOver={(e) => { e.preventDefault(); setOver(it.id); }}
          onDragLeave={() => setOver((o) => (o === it.id ? null : o))}
          onDrop={(e) => { e.preventDefault(); const from = items.findIndex((x) => x.id === drag); move(from, i); setDrag(null); setOver(null); }}
          onDragEnd={() => { setDrag(null); setOver(null); }}
          className={`flex items-stretch gap-2 ${drag === it.id ? 'a-dragging' : ''} ${over === it.id && drag !== it.id ? 'a-drop-target' : ''}`}>
          <span className="flex cursor-grab items-center self-start px-1 pt-3 text-ink-3 select-none" aria-hidden="true" title={t('dragToReorder')}>⋮⋮</span>
          <div className="min-w-0 flex-1">{render(it, i)}</div>
          <span className="flex flex-col gap-0.5 self-start pt-1">
            <button type="button" className="a-btn a-btn-ghost a-btn-sm min-h-6 px-2" aria-label={t('moveUp')} disabled={i === 0} onClick={() => move(i, i - 1)}>▲</button>
            <button type="button" className="a-btn a-btn-ghost a-btn-sm min-h-6 px-2" aria-label={t('moveDown')} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>▼</button>
          </span>
        </li>
      ))}
    </ul>
  );
}
