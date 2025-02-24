import { getUserDbConnection, getSettingsModel } from '@/utils/db';
import ThemeLoader from '@/components/ThemeLoader';

export default async function Home() {
  await getUserDbConnection();
  const SettingsModel = getSettingsModel();
  const settings = await SettingsModel.findOne({});
  const activeTheme = settings?.themes.find(
    (theme: { name: string; isActive: boolean }) => theme.isActive
  );
  const themeName = activeTheme ? activeTheme.name : 'openNextDefault';
  
  // Render the client component that loads the theme dynamically.
  return <ThemeLoader themeName={themeName} />;
}