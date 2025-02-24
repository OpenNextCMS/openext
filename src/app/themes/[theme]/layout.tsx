import React from 'react';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export default async function ThemeLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: { theme: string };
}) {
	// Initialize DB connection and check the theme status.
	await getUserDbConnection();
	const SettingsModel = getSettingsModel();
	const settings = await SettingsModel.findOne({});
	const activeTheme = settings?.themes.find(
		(theme: { name: string; isActive: boolean }) => theme.isActive && theme.name === params.theme
	);

	if (!activeTheme) {
		// Render appropriate message if the theme is not active.
		return <div>Theme is not active</div>;
	}

	// ...existing layout code...
	return <>{children}</>;
}
