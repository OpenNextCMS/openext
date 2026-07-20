import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import PageClientWrapper from '@/components/PageClientWrapper';
import { getAuthUser } from '@/lib/api/auth';
import { buildRenderInput } from '@/modules/themeEngine/buildRenderInput';
import { themeManager } from '@/modules/themeEngine/ThemeManager';
import { themeRegistry } from '@/modules/themeEngine/ThemeRegistry';
import { EditDraftStore } from '@/modules/themeEngine/EditDraftStore';
import { toCmsBlocks } from '@/modules/themeEngine/bridges/pageBridge';
import { parseThemeSectionContent } from '@/modules/themeEngine/sectionSchema';
import { readDiskManifest } from '@/modules/themeEngine/readDiskManifest';
import ThemeEditBridge from '@/modules/themeEngine/ThemeEditBridge';
import ThemeRenderBoundary from '@/components/theme-engine/ThemeRenderBoundary';

export const dynamic = 'force-dynamic';

interface PageProps {
  params?: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Authenticated exact editor preview — same Header/Template/Footer pipeline as
 * the public site, with editMode markers + postMessage bridge.
 */
export default async function ThemeEngineEditPreviewPage({ params, searchParams }: PageProps) {
  const user = await getAuthUser();
  if (!user) return notFound();

  const resolved = await params;
  const themeSlug = resolved?.slug;
  if (!themeSlug) return notFound();

  const theme = await themeRegistry.getBySlug(themeSlug);
  if (!theme || theme.status !== 'installed') return notFound();

  const sp = (await searchParams) || {};
  const pageSlug = typeof sp.page === 'string' && sp.page ? sp.page : 'home';
  const draftKey = typeof sp.draft === 'string' ? sp.draft : '';

  let input = await buildRenderInput(pageSlug, themeSlug);
  if (!input) {
    // Homepage missing — still show theme shell with empty blocks.
    const card = await import('@/modules/themeEngine/buildRenderInput').then((m) =>
      m.buildCardPreviewInput(themeSlug)
    );
    input = { ...card, page: { ...card.page, slug: pageSlug, type: 'home' }, editMode: true };
  } else {
    input = { ...input, previewThemeSlug: themeSlug, editMode: true };
  }

  if (draftKey) {
    const draft = EditDraftStore.get(draftKey);
    if (draft && draft.themeSlug === themeSlug) {
      input = { ...input, draftBlocks: toCmsBlocks(draft.blocks), blocks: toCmsBlocks(draft.blocks) };
    }
  }

  // Cookie gate: require a logged-in session cookie to exist (getAuthUser already checked).
  await cookies();

  const result = await themeManager.renderPage(input);

  const manifest = (await readDiskManifest(themeSlug)) || theme.manifest;

  const sections = (input.draftBlocks ?? input.blocks)
    .map((block) => {
      const parsed = parseThemeSectionContent(
        (block.data as { content?: unknown })?.content ?? block.data
      );
      if (!parsed) return null;
      const label =
        manifest.editableSections?.find((s) => s.id === parsed.sectionId)?.label ||
        parsed.sectionId;
      return {
        id: parsed.sectionId,
        label,
        blockType: block.type,
        hidden: Boolean(parsed.hidden),
      };
    })
    .filter(Boolean) as Array<{ id: string; label: string; blockType: string; hidden?: boolean }>;

  // Prefer declared order when available.
  const declared = manifest.editableSections || [];
  if (declared.length > 0) {
    const byId = new Map(sections.map((s) => [s.id, s]));
    const ordered = declared
      .map((d) => byId.get(d.id) || { id: d.id, label: d.label, blockType: d.blockType, hidden: false })
      .concat(sections.filter((s) => !declared.some((d) => d.id === s.id)));
    sections.length = 0;
    sections.push(...ordered);
  }

  return (
    <PageClientWrapper>
      <link rel="stylesheet" href={result.stylesheetUrl} />
      <ThemeEditBridge themeSlug={themeSlug} pageSlug={pageSlug} sections={sections} />
      <ThemeRenderBoundary>
        <div className="rendered-page" data-theme-engine-edit-preview={themeSlug}>
          {result.element}
        </div>
      </ThemeRenderBoundary>
      <script src={result.scriptUrl} defer />
    </PageClientWrapper>
  );
}
