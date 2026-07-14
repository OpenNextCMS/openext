import { ThemeActivationController } from '@/modules/theme';

export const dynamic = 'force-dynamic';

/** POST /api/themes/[id]/activate — activate theme for the live site. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return ThemeActivationController.activate(id);
}
