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

  if (invoice.status !== 'draft') {
    return apiError(
      'INVALID_STATUS',
      `Cannot confirm invoice with status '${invoice.status}'. Only draft invoices can be confirmed.`,
      400
    );
  }

  invoice.status = 'confirmed';
  invoice.updatedAt = new Date().toISOString();
  store.invoices.set(invoice.id, invoice);

  // Record audit log
  recordAuditLog({
    actorId: 'billing-admin',
    action: 'invoice.confirmed',
    entityType: 'invoice',
    entityId: invoice.id,
    metadata: {
      invoiceNumber: invoice.number,
      totalMinor: invoice.totalMinor,
      dueDate: invoice.dueDate,
    },
  });

  // Atomic disk persistence
  store.persist();

  return apiSuccess(invoice);
}
