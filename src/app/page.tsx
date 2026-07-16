import { TemplateThemeRenderer } from '@/modules/theme/services/TemplateThemeRenderer';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

/**
 * Site root. When a WordPress-style **template theme** is active, the home page is
 * served from the theme's own HTML (rendered by /api/site/render) so it looks
 * exactly like the theme. Otherwise the default block-theme home renders.
 */
export default async function Home() {
  const templateTheme = await TemplateThemeRenderer.getActive();
  if (templateTheme) {
    return (
      <iframe
        src="/api/site/render?path="
        title={templateTheme.name}
        style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', border: 'none' }}
      />
    );
  }
  return <HomeClient />;
}
