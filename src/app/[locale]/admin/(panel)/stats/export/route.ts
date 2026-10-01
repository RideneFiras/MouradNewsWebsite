import { getStaff, isEditor } from '@/lib/auth/staff';
import { resolveRange } from '@/lib/stats/range';
import { toCsv } from '@/lib/stats/csv';
import { getAuthors, getBreakdown, getCategories, getTimeseries, getTopArticles, tunisToday } from '@/lib/stats/data';

const EDITOR_ONLY = new Set(['daily', 'sections', 'sources', 'referrers', 'campaigns', 'countries']);

/** CSV export of any statistics table (read-only; the RPCs enforce roles again). */
export async function GET(request: Request) {
  const staff = await getStaff();
  if (!staff) return new Response('Unauthorized', { status: 401 });
  const url = new URL(request.url);
  const table = url.searchParams.get('table') ?? 'articles';
  if (EDITOR_ONLY.has(table) && !isEditor(staff)) return new Response('Forbidden', { status: 403 });
  const today = await tunisToday();
  const r = resolveRange({ range: url.searchParams.get('range') ?? undefined, from: url.searchParams.get('from') ?? undefined, to: url.searchParams.get('to') ?? undefined }, today);
  let csv: string;
  switch (table) {
    case 'daily': {
      const s = await getTimeseries(r.from, r.to);
      csv = toCsv(['date', 'pageviews', 'visitors', 'engaged_avg_seconds'], s.map((p) => [p.bucket, p.pageviews, p.visitors, p.engaged_avg_seconds]));
      break;
    }
    case 'articles': {
      const a = await getTopArticles(r.from, r.to, 500);
      csv = toCsv(['public_id', 'title', 'language', 'published_at', 'authors', 'pageviews', 'visitors_daily_sum', 'engaged_avg_seconds', 'read_rate', 'main_source'],
        a.map((x) => [x.public_id, x.title, x.language, x.published_at, x.author_names, x.pageviews, x.visitors, x.engaged_avg_seconds, x.read_rate, x.main_source]));
      break;
    }
    case 'sections': {
      const c = await getCategories(r.from, r.to);
      csv = toCsv(['section_ar', 'section_fr', 'parent', 'pageviews', 'articles_published', 'avg_views_per_article'],
        c.map((x) => [x.name_ar, x.name_fr, x.parent_id ? c.find((p) => p.category_id === x.parent_id)?.name_ar : '', x.pageviews, x.articles_published, x.avg_views_per_article]));
      break;
    }
    case 'authors': {
      const a = await getAuthors(r.from, r.to);
      csv = toCsv(['author', 'articles_published', 'pageviews', 'avg_views_per_article', 'engaged_avg_seconds'],
        a.map((x) => [x.display_name_ar, x.articles_published, x.pageviews, x.avg_views_per_article, x.engaged_avg_seconds]));
      break;
    }
    case 'sources':
    case 'referrers':
    case 'campaigns':
    case 'countries': {
      const dim = ({ sources: 'source', referrers: 'referrer_host', campaigns: 'utm_campaign', countries: 'country' } as const)[table];
      const b = await getBreakdown(r.from, r.to, dim, 200);
      csv = toCsv([dim, 'pageviews', 'visitors_daily_sum', 'share'], b.map((x) => [x.value, x.pageviews, x.visitors, x.share]));
      break;
    }
    default:
      return new Response('Unknown table', { status: 400 });
  }
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="elborj-${table}-${r.from}_${r.to}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
