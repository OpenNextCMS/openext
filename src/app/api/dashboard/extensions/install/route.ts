import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ExtensionError } from '@/lib/extensions/errors';
import { toPublicExtension } from '@/lib/extensions/http';
import { installStagedExtension } from '@/lib/extensions/lifecycle';
import { writeExtensions } from '@/app/api/dashboard/extensions/shared';

const bodySchema = z.object({ stagingId: z.string().uuid() }).strict();

export async function POST(req: NextRequest) {
  return writeExtensions(async (services) => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ExtensionError('invalid_package', 'A stagingId is required.', 400);
    }
    const installed = await installStagedExtension(parsed.data.stagingId, services);
    return {
      status: 201,
      body: {
        message: 'Extension installed. It is not enabled yet.',
        extension: toPublicExtension(installed.extension),
        validation: installed.validation,
      },
    };
  });
}
