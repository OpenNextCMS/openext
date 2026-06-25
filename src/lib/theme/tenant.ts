import { getDynamicEnv } from '@/utils/dynamicEnv';

/**
 * Resolve a stable tenant identifier.
 *
 * This repo isolates tenants by database, so the active page-DB name *is* the
 * tenant. We stamp it as `tenantId` on every Theme document for traceability,
 * but the real isolation boundary remains the page-DB connection.
 */
export function resolveTenantId(): string {
  return getDynamicEnv().PAGE_DB_NAME || 'pages';
}
