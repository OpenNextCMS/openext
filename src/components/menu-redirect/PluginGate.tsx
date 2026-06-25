'use client';

import type { ReactNode } from 'react';
import { Loader2, Plug, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePluginState } from './usePluginState';

/**
 * Master client gate for the Menu Redirect plugin UI.
 * - loading → skeleton
 * - not installed → Install screen
 * - installed + disabled → Enable screen
 * - installed + enabled → children (the real plugin)
 */
export default function PluginGate({ children }: { children: ReactNode }) {
  const { state, loading, acting, install, enable } = usePluginState();

  if (loading || !state) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!state.installed) {
    return (
      <Centered>
        <Plug className="mb-4 h-10 w-10 text-primary" />
        <h2 className="text-2xl font-bold">Install Menu Redirect</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Map your header menu items to pages, posts, anchors or external URLs, with click
          tracking and live updates.
        </p>
        <Button className="mt-6" onClick={install} disabled={acting === 'install'}>
          {acting === 'install' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Install Menu Redirect
        </Button>
      </Centered>
    );
  }

  if (!state.enabled) {
    return (
      <Centered>
        <Power className="mb-4 h-10 w-10 text-orange-500" />
        <h2 className="text-2xl font-bold">Plugin is disabled</h2>
        <p className="mt-2 max-w-md text-muted-foreground">
          Your menu redirect mappings are preserved but dormant. Enable the plugin to manage them
          and activate redirects on your published site.
        </p>
        <Button className="mt-6" onClick={enable} disabled={acting === 'enable'}>
          {acting === 'enable' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enable plugin
        </Button>
      </Centered>
    );
  }

  return <>{children}</>;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="flex max-w-lg flex-col items-center p-10 text-center">{children}</Card>
    </div>
  );
}
