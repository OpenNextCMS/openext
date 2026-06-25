import { Schema } from 'mongoose';
import type { Connection, Model } from 'mongoose';
import { getPageDbConnection } from '@/utils/db';
import { resolveTenantId } from './tenant';

/**
 * Audit logging for Form Builder. The repo has no shared audit-log subsystem,
 * so this is a self-contained log written to a `FormAuditLog` collection in the
 * per-tenant page DB. Each entry: userId, tenantId, action, entityId,
 * entityType, metadata, timestamp. Logging never throws into the caller.
 */

export type FormAuditAction =
  | 'form.created'
  | 'form.updated'
  | 'form.deleted'
  | 'form.published'
  | 'form.archived'
  | 'form.restored';

interface IFormAuditLog {
  tenantId: string;
  userId?: string;
  action: FormAuditAction;
  entityId: string;
  entityType: 'form';
  metadata?: Record<string, unknown>;
}

const FormAuditLogSchema = new Schema<IFormAuditLog>(
  {
    tenantId: { type: String, index: true },
    userId: { type: String },
    action: { type: String, required: true },
    entityId: { type: String, required: true, index: true },
    entityType: { type: String, default: 'form' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

function getFormAuditLogModel(pageDb: Connection): Model<IFormAuditLog> {
  return (
    (pageDb.models.FormAuditLog as Model<IFormAuditLog>) ||
    pageDb.model<IFormAuditLog>('FormAuditLog', FormAuditLogSchema)
  );
}

export async function logFormAudit(params: {
  action: FormAuditAction;
  entityId: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const pageDb = await getPageDbConnection();
    const AuditLog = getFormAuditLogModel(pageDb);
    await AuditLog.create({
      tenantId: resolveTenantId(),
      userId: params.userId,
      action: params.action,
      entityId: params.entityId,
      entityType: 'form',
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    // Audit logging must never break the primary operation.
    console.error('[form-builder] audit log failed:', err);
  }
}
