import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ALL_TAGS } from '@/lib/data/cache';
import { expireEverything, expireTags } from '@/lib/cache/revalidate';
import { serverEnv } from '@/lib/env.server';

const Body = z.object({ tags: z.array(z.enum(ALL_TAGS as [string, ...string[]])).max(20).optional(), all: z.boolean().optional() });

/** On-demand revalidation, protected by REVALIDATE_SECRET (header x-revalidate-secret). */
export async function POST(request: Request) {
  const secret = request.headers.get('x-revalidate-secret') ?? '';
  let expected = '';
  try {
    expected = serverEnv.revalidateSecret();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!secret || secret.length !== expected.length || !timingSafeEqual(secret, expected)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  if (parsed.data.all) expireEverything();
  else expireTags(parsed.data.tags?.length ? parsed.data.tags : ['articles']);
  return NextResponse.json({ ok: true });
}

function timingSafeEqual(a: string, b: string) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
