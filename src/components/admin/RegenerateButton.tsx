'use client';
import { useState } from 'react';
import { regenerateCache } from '@/lib/admin/site';

export function RegenerateButton({ label, done }: { label: string; done: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="flex items-center gap-3">
      <button type="button" className="a-btn" onClick={async () => { const r = await regenerateCache(); setMsg(r.ok ? done : 'error'); }}>{label}</button>
      {msg && <span role="status" className="text-[14px]">{msg}</span>}
    </span>
  );
}
