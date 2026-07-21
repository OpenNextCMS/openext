import { NextRequest } from 'next/server';
import { ThemeCrudController } from '@/modules/theme';

export const dynamic = 'force-dynamic';

/** PUT /api/themes/[id]/update — alias for package-aware theme update. */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ThemeCrudController.update(req, id);
}
