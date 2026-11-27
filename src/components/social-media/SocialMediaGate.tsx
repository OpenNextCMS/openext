'use client';

import React from 'react';
import Link from 'next/link';
import { Loader2, Share2 } from 'lucide-react';
import { useSocialMediaStatus } from './useSocialMediaStatus';

export function SocialMediaGate({ children }: { children: React.ReactNode }) {
  const { loading, installed, enabled } = useSocialMediaStatus();

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (!installed || !enabled) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-lg border bg-card p-8 text-center">
        <Share2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">
          Social Media Integration is {installed ? 'disabled' : 'not installed'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Install and enable Social Media Integration from the Plugins marketplace.
        </p>
        <Link
          href="/dashboard/plugins"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to Plugins
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
