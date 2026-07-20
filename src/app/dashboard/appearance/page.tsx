import { ThemeManager } from '@/components/themeSystem/ThemeManager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Appearance · Themes',
};

/**
 * Admin → Appearance → Themes (spec §13). Mounts the Theme Manager, which
 * contains the grid, upload modal, preview panel (with Options + Monaco editor
 * tabs), search / filter / sort / pagination.
 */
export default function AppearanceThemesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <ThemeManager />
    </div>
  );
}
