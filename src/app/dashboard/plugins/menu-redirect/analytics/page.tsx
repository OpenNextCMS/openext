'use client';

import PluginGate from '@/components/menu-redirect/PluginGate';
import AnalyticsDashboard from '@/components/menu-redirect/AnalyticsDashboard';

/** Menu Redirect click-analytics dashboard (gated by plugin state). */
export default function MenuRedirectAnalyticsPage() {
  return (
    <PluginGate>
      <AnalyticsDashboard />
    </PluginGate>
  );
}
