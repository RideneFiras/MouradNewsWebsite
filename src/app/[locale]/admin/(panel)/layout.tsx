import type { ReactNode } from 'react';
import { Sidebar } from '@/components/admin/Sidebar';
import { isEditor, requireStaff } from '@/lib/auth/staff';
import { sessionClient } from '@/lib/supabase/server';

export default async function PanelLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const staff = await requireStaff(locale);
  let review = 0;
  let unread = 0;
  if (isEditor(staff)) {
    const db = await sessionClient();
    const [r, m] = await Promise.all([
      db.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'in_review'),
      db.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    ]);
    review = r.count ?? 0;
    unread = m.count ?? 0;
  }
  const name = (locale === 'fr' ? staff.display_name_fr : null) || staff.display_name_ar;
  return (
    <div className="lg:flex">
      <Sidebar locale={locale} role={staff.role} name={name} reviewCount={review} unreadMessages={unread} />
      <main id="content" className="min-w-0 flex-1 px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
