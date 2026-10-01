import { expect, test, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { ANON_KEY, SUPABASE_URL, revalidate, service } from './helpers';

// Users created by `pnpm dev:users` (local Supabase only).
const PASSWORD = 'local-dev-password';

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/ar/admin/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await Promise.all([page.waitForURL(/\/ar\/admin(?!\/login)/), page.click('button[type=submit]')]);
}

test.describe.serial('admin workflow', () => {
  const title = `[تجريبي] مقال اختبار سير العمل ${Date.now()}`;
  let articleId = '';

  test('author writes a draft and submits it for review', async ({ page }) => {
    await login(page, 'author@elborj.test');
    await page.goto('/ar/admin/articles/new');
    await page.fill('#title', title);
    await page.locator('.ProseMirror').click();
    await page.keyboard.type('هذه فقرة أولى من مقال الاختبار.');
    await page.click('text=حفظ كمسودة');
    await expect(page.locator('text=آخر حفظ')).toBeVisible();
    articleId = page.url().match(/articles\/([0-9a-f-]{36})/)![1]!;
    await page.click('button:has-text("إرسال للمراجعة")');
    await expect(page.getByRole('heading', { name: 'أُرسل المقال للمراجعة' })).toBeVisible();
  });

  test('editor sends it back with a note', async ({ page }) => {
    await login(page, 'editor@elborj.test');
    await page.goto(`/ar/admin/articles/${articleId}`);
    await page.click('button:has-text("إعادة للكاتب مع ملاحظة")');
    await page.fill('#note', 'أضف اسم المكان من فضلك.');
    await page.locator('dialog[open] button[type=submit]').click();
    await expect(page.locator('.a-chip[data-status="draft"]').first()).toBeVisible();
  });

  test('author sees the note and edits the draft', async ({ page }) => {
    await login(page, 'author@elborj.test');
    await page.goto(`/ar/admin/articles/${articleId}`);
    await expect(page.locator('text=أضف اسم المكان من فضلك.')).toBeVisible();
    await page.fill('#location', 'قليبية');
    await page.click('text=حفظ كمسودة');
    await expect(page.locator('text=آخر حفظ')).toBeVisible();
    await page.click('button:has-text("إرسال للمراجعة")');
    await expect(page.getByRole('heading', { name: 'أُرسل المقال للمراجعة' })).toBeVisible();
  });

  test('author cannot publish through the API (RLS + trigger)', async () => {
    const db = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
    const { error: e1 } = await db.auth.signInWithPassword({ email: 'author@elborj.test', password: PASSWORD });
    expect(e1).toBeNull();
    const { error } = await db.from('articles').update({ status: 'published' }).eq('id', articleId);
    expect(error).not.toBeNull();
    const { data } = await service().from('articles').select('status').eq('id', articleId).single();
    expect(data!.status).toBe('in_review');
  });

  test('editor schedules; the cron job publishes; the article is public', async ({ page, baseURL }) => {
    await login(page, 'editor@elborj.test');
    await page.goto(`/ar/admin/articles/${articleId}`);
    await page.click('button:has-text("برمجة النشر")');
    const inOneHour = new Date(Date.now() + 3600_000 + 3600_000); // Tunis = UTC+1
    await page.fill('#at', inOneHour.toISOString().slice(0, 16));
    await page.locator('dialog[open] button[type=submit]').click();
    await expect(page.getByRole('heading', { name: 'تمت برمجة المقال' })).toBeVisible();
    const db = service();
    const { data: before } = await db.from('articles').select('status, public_id').eq('id', articleId).single();
    expect(before!.status).toBe('scheduled');
    // Simulate the clock reaching the scheduled time, then run the job pg_cron runs every minute.
    await db.from('articles').update({ scheduled_for: new Date(Date.now() - 1000).toISOString() }).eq('id', articleId);
    const { data: n } = await db.rpc('publish_scheduled');
    expect(n).toBeGreaterThanOrEqual(1);
    await revalidate(baseURL!);
    await page.goto(`/ar/article/${before!.public_id}`);
    await expect(page.locator('h1')).toContainText('مقال اختبار سير العمل');
    await expect(page.locator('.dateline')).toContainText('قليبية');
  });

  test.afterAll(async () => {
    if (articleId) await service().from('articles').delete().eq('id', articleId);
  });
});

test('category delete with move', async ({ page, baseURL }) => {
  const db = service();
  const { data: cat } = await db.from('categories').insert({ slug: `e2e-cat-${Date.now()}`, name_ar: 'قسم للحذف', position: 99 }).select('id, slug').single();
  const { data: art } = await db.from('articles').insert({ title: '[تجريبي] مقال في قسم سيُحذف', category_id: cat!.id, status: 'published', published_at: new Date().toISOString(), is_demo: true }).select('id').single();
  try {
    await login(page, 'editor@elborj.test');
    await page.goto('/ar/admin/categories');
    const row = page.locator('.a-panel', { hasText: 'قسم للحذف' }).first();
    await row.locator('button:has-text("حذف")').click();
    const dlg = page.locator('dialog[open]');
    await dlg.locator('#target').selectOption({ label: 'ثقافة' });
    await dlg.locator('input[value="delete"]').check();
    await dlg.locator('button[type=submit]').click();
    await expect(page.locator('.a-panel', { hasText: 'قسم للحذف' })).toHaveCount(0);
    const { data: moved } = await db.from('articles').select('category_id').eq('id', art!.id).single();
    const { data: culture } = await db.from('categories').select('id').eq('slug', 'culture').single();
    expect(moved!.category_id).toBe(culture!.id);
    const { data: gone } = await db.from('categories').select('id').eq('id', cat!.id);
    expect(gone).toHaveLength(0);
    await revalidate(baseURL!, ['taxonomy']);
  } finally {
    await db.from('articles').delete().eq('id', art!.id);
    await db.from('categories').delete().eq('id', cat!.id);
  }
});

test('homepage reorder is reflected publicly', async ({ page, baseURL }) => {
  const db = service();
  const { data: before } = await db.from('homepage_sections').select('id, type, position, config').order('position');
  try {
    await login(page, 'editor@elborj.test');
    await page.goto('/ar/admin/homepage?tab=ar');
    await page.waitForLoadState('networkidle'); // hydrated: the arrow buttons work
    // Move the "opinion" section to the very top (above the lead) with the arrow buttons.
    const opinion = () => page.locator('ul > li').filter({ has: page.locator('p.font-semibold', { hasText: /^رأي/ }) }).first();
    const firstTitle = page.locator('ul > li p.font-semibold').first();
    for (let i = 0; i < 15 && !/^رأي/.test((await firstTitle.textContent()) ?? ''); i++) {
      await opinion().locator('button[aria-label="إلى الأعلى"]').click();
    }
    await expect(firstTitle).toHaveText(/^رأي/);
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/admin/homepage')),
      page.click('button:has-text("حفظ الصفحة الرئيسية")'),
    ]);
    const { data: after } = await db.from('homepage_sections').select('type, position').order('position');
    expect(after![0]!.type).toBe('opinion');
    await revalidate(baseURL!, ['homepage']);
    await page.goto('/ar');
    const firstSectionTitle = await page.locator('main section h2').first().textContent();
    expect(firstSectionTitle).toContain('رأي');
  } finally {
    for (const s of before ?? []) await db.from('homepage_sections').update({ position: s.position }).eq('id', s.id);
    await revalidate(baseURL!, ['homepage']);
  }
});
