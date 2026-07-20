import React from 'react';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export default async function ThemeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ theme: string }>;
}) {
  const { theme } = await params;

  // Initialize DB connection and check the theme status.
  await getUserDbConnection();
  const SettingsModel = getSettingsModel();
  const settings = await SettingsModel.findOne({});
  const activeTheme = settings?.themes.find(
    (t: { name: string; isActive: boolean }) => t.isActive && t.name === theme
  );

  if (!activeTheme) {
    // Render appropriate message if the theme is not active.
    return <div>Theme is not active</div>;
  }

  // ...existing layout code...
  return <>{children}</>;
}
