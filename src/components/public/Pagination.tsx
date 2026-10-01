import Link from 'next/link';

/** «الأحدث» / «الأقدم» with numbered pages. ?page=N, no infinite scroll. */
export function Pagination({ basePath, page, totalPages, labels, query = {} }: {
  basePath: string; page: number; totalPages: number; labels: { newer: string; older: string; page: (n: number) => string }; query?: Record<string, string>;
}) {
  if (totalPages <= 1) return null;
  const href = (n: number) => {
    const p = new URLSearchParams(query);
    if (n > 1) p.set('page', String(n));
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const pages: (number | '…')[] = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 2) pages.push(n);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-4 font-ui text-[15px]" aria-label="pagination">
      {page > 1 ? <Link prefetch={false} href={href(page - 1)} rel="prev" className="btn">{labels.newer}</Link> : <span />}
      <ul className="flex flex-wrap gap-1">
        {pages.map((n, i) =>
          n === '…' ? (
            <li key={`e${i}`} className="px-2 text-ink-3" aria-hidden="true">…</li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className="inline-flex h-11 min-w-11 items-center justify-center bg-ink px-2 text-paper">{n}</span>
              ) : (
                <Link prefetch={false} href={href(n)} aria-label={labels.page(n)} className="inline-flex h-11 min-w-11 items-center justify-center px-2 hover:text-accent">{n}</Link>
              )}
            </li>
          ),
        )}
      </ul>
      {page < totalPages ? <Link prefetch={false} href={href(page + 1)} rel="next" className="btn">{labels.older}</Link> : <span />}
    </nav>
  );
}

export function pageFromSearch(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 1 && n < 10000 ? n : 1;
}
