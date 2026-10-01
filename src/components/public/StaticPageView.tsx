import type { ReactNode } from 'react';
import type { StaticPage } from '@/lib/data/types';
import { sanitizeArticleHtml } from '@/lib/content/sanitize';

export function StaticPageView({ page, children, after }: { page: StaticPage; children?: ReactNode; after?: ReactNode }) {
  return (
    <div className="container-page mt-8">
      <article className="mx-auto max-w-[var(--measure)]">
        <h1 className="headline-1 pb-2">{page.title}</h1>
        <div className="section-rule mb-8" />
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(page.body_html) }} />
        {children}
      </article>
      {after}
    </div>
  );
}
