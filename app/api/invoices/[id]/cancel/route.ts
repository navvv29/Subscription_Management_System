import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { recordAuditLog } from '@/lib/audit/audit-service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoice = store.invoices.get(id);
  if (!invoice) {
    return apiError('NOT_FOUND', 'Invoice not found', 404);
  }

  if (invoice.status === 'paid') {
    return apiError('INVALID_STATUS', 'Cannot cancel an invoice that is already fully paid.', 400);
  }

  if (invoice.paidMinor > 0) {
    return apiError(
      'INVALID_STATUS',
      'Cannot cancel an invoice with recorded payments. Settle or reverse payments before cancellation.',
      400
    );
  }

  if (invoice.status === 'cancelled') {
    return apiError('INVALID_STATUS', 'Invoice is already cancelled.', 400);
  }

  const previousStatus = invoice.status;
  invoice.status = 'cancelled';
  invoice.updatedAt = new Date().toISOString();
  store.invoices.set(id, invoice);

  // Record audit log
  recordAuditLog({
    actorId: 'billing-admin',
    action: 'invoice.cancelled',
    entityType: 'invoice',
    entityId: invoice.id,
    metadata: {
      invoiceNumber: invoice.number,
      previousStatus,
      totalMinor: invoice.totalMinor,
    },
  });

  // Atomic disk persistence
  store.persist();

  return apiSuccess(invoice);
}
