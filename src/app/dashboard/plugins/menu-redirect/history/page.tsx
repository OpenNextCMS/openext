'use client';

import PluginGate from '@/components/menu-redirect/PluginGate';
import HistoryView from '@/components/menu-redirect/HistoryView';

/** Menu Redirect audit history (gated by plugin state). */
export default function MenuRedirectHistoryPage() {
  return (
    <PluginGate>
      <HistoryView />
    </PluginGate>
  );
}
