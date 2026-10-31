import { store } from '@/lib/store';
import type { AuditLog } from '@/types/database';

export interface CreateAuditLogParams {
  actorId: string;
  action: string;
  entityType: 'subscription' | 'invoice' | 'payment' | 'quotation' | 'customer' | 'plan' | 'billing_run';
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an immutable audit log entry and persist to store.
 */
export function recordAuditLog(params: CreateAuditLogParams): AuditLog {
  const auditLog: AuditLog = {
    id: crypto.randomUUID(),
    actorId: params.actorId || 'system',
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    createdAt: new Date().toISOString(),
  };

  store.auditLogs.set(auditLog.id, auditLog);
  store.persist();

  return auditLog;
}

/**
 * Query audit logs with optional filters.
 */
export function queryAuditLogs(filters?: {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  limit?: number;
}): AuditLog[] {
  let logs = Array.from(store.auditLogs.values());

  if (filters?.entityType) {
    logs = logs.filter((l) => l.entityType === filters.entityType);
  }
  if (filters?.entityId) {
    logs = logs.filter((l) => l.entityId === filters.entityId);
  }
  if (filters?.actorId) {
    logs = logs.filter((l) => l.actorId === filters.actorId);
  }
  if (filters?.action) {
    logs = logs.filter((l) => l.action.toLowerCase().includes(filters.action!.toLowerCase()));
  }

  // Sort newest first
  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filters?.limit && filters.limit > 0) {
    logs = logs.slice(0, filters.limit);
  }

  return logs;
}

