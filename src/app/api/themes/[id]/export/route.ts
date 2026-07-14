import { ThemeExportController } from '@/modules/theme';

export const dynamic = 'force-dynamic';

/** GET /api/themes/[id]/export — download theme as a shareable ZIP. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ThemeExportController.export(id);
}
