import type { ReactNode } from 'react';

export function AuthCard({ title, siteName, children }: { title: string; siteName: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-paper px-4 pt-16">
      <div className="w-full max-w-sm">
        <p className="nameplate mb-2 text-center text-[44px]">{siteName}</p>
        <div className="a-panel p-6">
          <h1 className="a-h1 mb-4">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
