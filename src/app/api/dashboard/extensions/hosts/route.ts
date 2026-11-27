import { listExtensionHosts } from '@/lib/extensions/hostRegistry';
import { readExtensions } from '@/app/api/dashboard/extensions/shared';

export async function GET() {
  return readExtensions(async () => ({
    body: { hosts: listExtensionHosts() },
  }));
}
