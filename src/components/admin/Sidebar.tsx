'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CloseIcon, MenuIcon } from '@/components/shared/icons';
import type { AppRole } from '@/lib/auth/staff';
import { logoutAction } from '@/lib/auth/actions';

type Item = { key: string; href: string; roles?: AppRole[]; badge?: number; exact?: boolean };

export function Sidebar({ locale, role, name, reviewCount, unreadMessages }: { locale: string; role: AppRole; name: string; reviewCount: number; unreadMessages: number }) {
  const t = useTranslations('admin.nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const b = `/${locale}/admin`;
  const ED: AppRole[] = ['editor', 'admin'];
  const AD: AppRole[] = ['admin'];
  const items: Item[] = [
    { key: 'dashboard', href: b, exact: true },
    { key: 'articles', href: `${b}/articles`, exact: true },
    { key: 'newArticle', href: `${b}/articles/new` },
    { key: 'review', href: `${b}/articles?status=in_review`, roles: ED, badge: reviewCount },
    { key: 'media', href: `${b}/media` },
    { key: 'categories', href: `${b}/categories`, roles: ED },
    { key: 'tags', href: `${b}/tags`, roles: ED },
    { key: 'formats', href: `${b}/formats`, roles: ED },
    { key: 'homepage', href: `${b}/homepage`, roles: ED },
    { key: 'menus', href: `${b}/menus`, roles: ED },
    { key: 'pages', href: `${b}/pages`, roles: ED },
    { key: 'stats', href: `${b}/stats` },
    { key: 'ads', href: `${b}/ads`, roles: AD },
    { key: 'mediaKit', href: `${b}/media-kit`, roles: AD },
    { key: 'messages', href: `${b}/messages`, roles: ED, badge: unreadMessages },
    { key: 'team', href: `${b}/team`, roles: AD },
    { key: 'settings', href: `${b}/settings`, roles: AD },
    { key: 'system', href: `${b}/system`, roles: AD },
    { key: 'profile', href: `${b}/profile` },
  ];
  const visible = items.filter((i) => !i.roles || i.roles.includes(role));
  const isActive = (i: Item) => {
    const path = i.href.split('?')[0]!;
    if (i.key === 'review') return false;
    return i.exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);
  };
  const other = locale === 'ar' ? 'fr' : 'ar';
  const nav = (
    <nav className="a-nav flex flex-col py-2" aria-label={t('menu')}>
      {visible.map((i) => (
        <Link key={i.key} href={i.href} onClick={() => setOpen(false)} aria-current={isActive(i) ? 'page' : undefined}
          className="flex min-h-10 items-center justify-between border-s-[3px] border-transparent px-4 text-[15px] hover:text-accent">
          <span>{t(i.key as 'dashboard')}</span>
          {i.badge ? <span className="a-chip text-accent">{i.badge}</span> : null}
        </Link>
      ))}
      <div className="mt-4 border-t border-rule px-4 pt-3 text-[14px]">
        <p className="mb-2 text-ink-3">{name}</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a href={`/${locale}`} target="_blank" rel="noopener" className="underline">{t('viewSite')}</a>
          <a href={pathname.replace(/^\/(ar|fr)/, `/${other}`)} className="underline" lang={other}>{other === 'fr' ? 'Français' : 'العربية'}</a>
        </p>
        <form action={logoutAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="a-btn a-btn-sm">{t('logout')}</button>
        </form>
      </div>
    </nav>
  );
  return (
    <>
      <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-rule bg-white px-2 lg:hidden">
        <button type="button" className="a-btn a-btn-ghost" onClick={() => setOpen(true)} aria-label={t('menu')} aria-expanded={open}><MenuIcon /></button>
        <span className="text-[15px] font-semibold">{visible.find(isActive) ? t(visible.find(isActive)!.key as 'dashboard') : ''}</span>
        <Link href={`${b}/articles/new`} className="a-btn a-btn-sm a-btn-primary">{t('newArticle')}</Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white lg:hidden" role="dialog" aria-modal="true" aria-label={t('menu')}>
          <div className="flex justify-end border-b border-rule p-1">
            <button type="button" className="a-btn a-btn-ghost" onClick={() => setOpen(false)} aria-label={t('close')}><CloseIcon /></button>
          </div>
          {nav}
        </div>
      )}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-e border-rule bg-white lg:block">{nav}</aside>
    </>
  );
}
