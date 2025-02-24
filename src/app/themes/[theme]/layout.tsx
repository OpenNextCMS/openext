import React from 'react';
import { redirect } from 'next/navigation';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export default async function ThemeLayout({ children, params }: { children: React.ReactNode; params: { theme: string } }) {
	// Initialize DB connection and check the theme status.
	await getUserDbConnection();
	const SettingsModel = getSettingsModel();
	const settings = await SettingsModel.findOne({});
	if (!settings) return <div>Settings not found</div>;

	// Determine the active theme regardless of the URL parameter
	const activeTheme = settings.themes.find((theme: { name: string; isActive: boolean }) => theme.isActive);
	if (!activeTheme) return <div>No active theme configured</div>;

	// If the requested theme does not match the active theme, redirect
	if (params.theme !== activeTheme.name) {
		redirect(`/themes/${activeTheme.name}/layouts`);
	}

	// ...existing layout code...
	return <>{children}</>;
}
