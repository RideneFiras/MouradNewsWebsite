// LOCAL DEVELOPMENT ONLY: creates three staff users in the local Supabase (supabase start)
// so the admin can be tried and tested. Never run against production.
// Usage: pnpm dev:users
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from '../tests/support/load-env';

loadEnvLocal();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
if (!/127\.0\.0\.1|localhost/.test(url)) throw new Error('Refusing to create test users outside a local Supabase.');
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', { auth: { persistSession: false } });

export const DEV_PASSWORD = 'local-dev-password';
const users = [
  { email: 'admin@elborj.test', role: 'admin', name_ar: 'مراد ريدان', name_fr: 'Mourad Ridene', title_ar: 'رئيس التحرير', title_fr: 'Rédacteur en chef', slug: 'mourad-ridene' },
  { email: 'editor@elborj.test', role: 'editor', name_ar: 'محرر الاختبار', name_fr: 'Éditeur test', title_ar: 'محرر', title_fr: 'Éditeur', slug: 'editeur-test' },
  { email: 'author@elborj.test', role: 'author', name_ar: 'كاتب الاختبار', name_fr: 'Auteur test', title_ar: 'مراسل', title_fr: 'Correspondant', slug: 'auteur-test' },
];

for (const u of users) {
  const { data: list } = await db.auth.admin.listUsers();
  let id = list.users.find((x) => x.email === u.email)?.id;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({ email: u.email, password: DEV_PASSWORD, email_confirm: true, user_metadata: { display_name: u.name_ar, slug: u.slug } });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await db.from('profiles').update({ role: u.role, display_name_ar: u.name_ar, display_name_fr: u.name_fr, title_ar: u.title_ar, title_fr: u.title_fr, slug: u.slug, is_active: true }).eq('id', id);
  if (error) throw error;
  console.log(`${u.role.padEnd(6)} ${u.email} / ${DEV_PASSWORD}`);
}
