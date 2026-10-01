'use client';
import { mediaUrl } from '@/lib/env';

/** Click on the image to set the focal point (stored 0–1, used as object-position). */
export function FocalPicker({ path, variants, x, y, onChange, label }: {
  path: string; variants?: Record<string, string>; x: number; y: number; onChange: (x: number, y: number) => void; label: string;
}) {
  const src = mediaUrl(variants?.['960'] ?? variants?.['480'] ?? path) ?? '';
  return (
    <div>
      <p className="a-help mb-1">{label}</p>
      <button
        type="button"
        className="relative block w-full cursor-crosshair overflow-hidden rounded border border-rule"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
          const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
          onChange(Math.round(fx * 1000) / 1000, Math.round(fy * 1000) / 1000);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="block w-full" />
        <span aria-hidden="true" className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white outline outline-2 outline-ink"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }} />
      </button>
    </div>
  );
}
