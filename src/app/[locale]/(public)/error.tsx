'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const fr = usePathname()?.startsWith('/fr');
  useEffect(() => {
    console.error('public page error', { digest: error.digest });
  }, [error]);
  return (
    <div className="container-page mt-12 max-w-[var(--measure)]">
      <h1 className="headline-1">{fr ? 'Une erreur est survenue' : 'حدث خطأ'}</h1>
      <p className="dek mt-4">{fr ? 'Cette page ne peut pas être affichée pour le moment. Réessayez dans un instant.' : 'تعذّر عرض هذه الصفحة الآن. حاول بعد لحظات.'}</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>{fr ? 'Réessayer' : 'أعد المحاولة'}</button>
    </div>
  );
}
