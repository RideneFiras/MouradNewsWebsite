// Fallback for URLs outside any locale (the middleware normally prefixes /ar).
import Link from 'next/link';

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ background: '#f5f1e8', color: '#17140f', fontFamily: 'serif', padding: 32 }}>
        <h1>الصفحة غير موجودة</h1>
        <p>
          <Link href="/ar">الصفحة الرئيسية</Link> · <Link href="/fr">Accueil</Link>
        </p>
      </body>
    </html>
  );
}
