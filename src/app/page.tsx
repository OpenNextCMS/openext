import { redirect } from 'next/navigation';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export default async function Home() {
  // Initialize DB connection and load settings directly.
  await getUserDbConnection();
  const SettingsModel = getSettingsModel();
  const settings = await SettingsModel.findOne({});
  const activeTheme = settings?.themes.find((theme: { name: string; isActive: boolean }) => theme.isActive);

  if (activeTheme) {
    redirect(`/themes/${activeTheme.name}/layouts`);
  }

  // No active theme found; show default content
  return (
    <main>
      <h1>Hello World</h1>
    </main>
  );
}