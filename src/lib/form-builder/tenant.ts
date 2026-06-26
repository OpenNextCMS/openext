import { getDynamicEnv } from '@/utils/dynamicEnv';

/**
 * Resolve a stable tenant identifier.
 *
 * This repo isolates tenants by database, so the active page-DB name *is* the
 * tenant. We surface it as `tenantId` on every Form Builder document so the
 * schema nominally matches the plugin spec and data is traceable, but the real
 * isolation boundary remains the page-DB connection.
 */
export function resolveTenantId(): string {
  return getDynamicEnv().PAGE_DB_NAME || 'pages';
}
