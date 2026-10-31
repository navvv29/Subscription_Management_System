import { describe, it, expect, beforeEach } from 'vitest';
import { recordAuditLog, queryAuditLogs } from '@/lib/audit/audit-service';
import { store } from '@/lib/store';

describe('Immutable Audit Trail & Compliance Logging', () => {
  beforeEach(() => {
    store.auditLogs.clear();
  });

  it('records audit events and allows querying by entity and actor', () => {
    const entityId = `sub-audit-${Date.now()}`;
    const log1 = recordAuditLog({
      actorId: 'admin-lead',
      action: 'subscription.activated',
      entityType: 'subscription',
      entityId,
      metadata: { previousStatus: 'confirmed', newStatus: 'active' },
    });

    const log2 = recordAuditLog({
      actorId: 'admin-lead',
      action: 'payment.recorded',
      entityType: 'payment',
      entityId: `pay-audit-${Date.now()}`,
      metadata: { amountMinor: 200000 },
    });

    expect(store.auditLogs.has(log1.id)).toBe(true);
    expect(store.auditLogs.has(log2.id)).toBe(true);

    const subscriptionLogs = queryAuditLogs({
      entityType: 'subscription',
      entityId,
    });
    expect(subscriptionLogs.length).toBe(1);
    expect(subscriptionLogs[0].action).toBe('subscription.activated');

    const adminLogs = queryAuditLogs({ actorId: 'admin-lead' });
    expect(adminLogs.length).toBeGreaterThanOrEqual(2);
  });
});
