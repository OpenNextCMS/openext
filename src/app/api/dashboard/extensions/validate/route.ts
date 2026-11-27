import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ExtensionError } from '@/lib/extensions/errors';
import { revalidateStagedExtension } from '@/lib/extensions/lifecycle';
import { writeExtensions } from '@/app/api/dashboard/extensions/shared';

const bodySchema = z.object({ stagingId: z.string().uuid() }).strict();

export async function POST(req: NextRequest) {
  return writeExtensions(async (services) => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ExtensionError('invalid_package', 'A stagingId is required.', 400);
    }
    const result = await revalidateStagedExtension(parsed.data.stagingId, services);
    return {
      status: result.validation.installable ? 200 : 422,
      body: {
        message: result.validation.installable
          ? 'Staged package is ready to install.'
          : 'Staged package is not installable.',
        stagingId: result.stagingId,
        validation: result.validation,
      },
    };
  });
}
