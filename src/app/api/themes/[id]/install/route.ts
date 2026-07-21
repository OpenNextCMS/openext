import { ThemeInstallController } from '@/modules/theme';

export const dynamic = 'force-dynamic';

/** POST /api/themes/[id]/install — mark package theme installed / verify assets. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ThemeInstallController.install(id);
}
