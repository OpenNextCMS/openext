import { describeCompatibility } from '@/lib/extensions/lifecycle';
import { readExtensionId, readExtensions } from '@/app/api/dashboard/extensions/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ extensionId: string }> }
) {
  return readExtensions(async (services) => ({
    body: await describeCompatibility(readExtensionId((await params).extensionId), services),
  }));
}
