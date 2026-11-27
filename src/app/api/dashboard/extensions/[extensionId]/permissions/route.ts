import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ExtensionError } from '@/lib/extensions/errors';
import { toPublicExtension } from '@/lib/extensions/http';
import { approveExtensionPermissions } from '@/lib/extensions/lifecycle';
import { readExtensionId, writeExtensions } from '@/app/api/dashboard/extensions/shared';

const bodySchema = z
  .object({
    approve: z.array(z.string()).max(50),
    trustedExecution: z.enum(['approved', 'denied']).optional(),
  })
  .strict();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return writeExtensions(async (services) => {
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      throw new ExtensionError('invalid_package', 'Permission approval payload is invalid.', 400);
    }
    const extension = await approveExtensionPermissions(
      readExtensionId((await params).extensionId),
      parsed.data,
      services
    );
    return {
      body: {
        message: 'Extension permissions updated.',
        extension: toPublicExtension(extension),
      },
    };
  });
}
