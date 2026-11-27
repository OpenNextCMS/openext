import { NextResponse } from 'next/server';
import { EXTENSION_ID_PATTERN } from '@/lib/extensions/constants';
import { ExtensionError } from '@/lib/extensions/errors';
import { extensionErrorResponse } from '@/lib/extensions/http';
import {
  createDefaultExtensionServices,
  type ExtensionServices,
} from '@/lib/extensions/lifecycle';
import { requireAnyCapability, requireCapability } from '@/lib/rbac';

export function readExtensionId(id: string): string {
  if (!EXTENSION_ID_PATTERN.test(id)) {
    throw new ExtensionError('invalid_package', 'Extension id is invalid.', 400);
  }
  return id;
}

async function run(
  mode: 'read' | 'write',
  fn: (services: ExtensionServices) => Promise<{ body: unknown; status?: number }>
): Promise<NextResponse> {
  try {
    const ctx =
      mode === 'write'
        ? await requireCapability('plugins.manage')
        : await requireAnyCapability('plugins.view', 'plugins.manage');
    const services = await createDefaultExtensionServices(ctx.user.userId);
    const result = await fn(services);
    return NextResponse.json(result.body, { status: result.status ?? 200 });
  } catch (error) {
    return extensionErrorResponse(error);
  }
}

export function readExtensions(
  fn: (services: ExtensionServices) => Promise<{ body: unknown; status?: number }>
): Promise<NextResponse> {
  return run('read', fn);
}

export function writeExtensions(
  fn: (services: ExtensionServices) => Promise<{ body: unknown; status?: number }>
): Promise<NextResponse> {
  return run('write', fn);
}
