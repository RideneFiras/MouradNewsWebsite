import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminClient } from '@/lib/supabase/admin';
import { clientIp, rateLimit } from '@/lib/security/rate-limit';

const Body = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  subject: z.enum(['news_tip', 'advertising', 'correction', 'other']),
  message: z.string().trim().min(5).max(8000),
  locale: z.enum(['ar', 'fr']).default('ar'),
  website: z.string().max(0).optional(), // honeypot: must stay empty
  elapsed: z.number().int().min(0), // ms between form display and submit
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  if (!rateLimit(`contact:${ip}`, 5, 2)) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 12000) return NextResponse.json({ ok: false }, { status: 413 });
  let parsed;
  try {
    parsed = Body.safeParse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  const d = parsed.data;
  // Bots: filled the hidden field, or submitted faster than a human can type.
  if (d.website || d.elapsed < 3000) return NextResponse.json({ ok: true });
  const { error } = await adminClient().from('contact_messages').insert({
    name: d.name, email: d.email, subject: d.subject, message: d.message, locale: d.locale,
  });
  if (error) {
    console.error('contact insert failed', { route: '/api/contact', code: error.code });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
