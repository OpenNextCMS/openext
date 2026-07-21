'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { apiUrl } from '@/lib/apiClient';

/** Default home landing (no theme render). */
export default function HomeClient() {
  useEffect(() => {
    const syncDbCookie = async () => {
      try {
        const res = await fetch(apiUrl('/api/env-connection?key=dbConnection'));
        const data = await res.json();
        document.cookie = `dbConnection=${data.dbConnection}; path=/; expires=Fri, 31 Dec 9999 23:59:59 GMT`;
      } catch {
        // ignore — middleware handles setup redirect
      }
    };

    syncDbCookie();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">OpenNext CMS</h1>
        <p className="max-w-md text-muted-foreground">
          Theme rendering on the home page is temporarily disabled.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Log in
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
