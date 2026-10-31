import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { updateCustomerSchema } from '@/lib/validation/schemas';
import { store } from '@/lib/store';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const customer = store.customers.get(id);
  if (!customer) {
    return apiError('NOT_FOUND', 'Customer not found', 404);
  }
  return apiSuccess(customer);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const customer = store.customers.get(id);
    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found', 404);
    }

    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', parsed.error.errors.map((e) => e.message).join(', '));
    }

    if (parsed.data.email) {
      const duplicate = Array.from(store.customers.values()).find(
        (c) => c.id !== id && c.email.toLowerCase() === parsed.data.email!.toLowerCase()
      );
      if (duplicate) {
        return apiError('DUPLICATE_EMAIL', 'A customer with this email already exists', 409);
      }
    }

    const updated = {
      ...customer,
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    store.customers.set(id, updated);
    return apiSuccess(updated);
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update customer', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const customer = store.customers.get(id);
    if (!customer) {
      return apiError('NOT_FOUND', 'Customer not found', 404);
    }

    const hasSubscriptions = Array.from(store.subscriptions.values()).some((s) => s.customerId === id);
    const hasInvoices = Array.from(store.invoices.values()).some((i) => i.customerId === id);
    const hasQuotations = Array.from(store.quotations.values()).some((q) => q.customerId === id);
    if (hasSubscriptions || hasInvoices || hasQuotations) {
      return apiError(
        'CUSTOMER_IN_USE',
        'This customer has quotations, subscriptions or invoices and cannot be deleted.',
        409
      );
    }

    store.customers.delete(id);
    return apiSuccess({ id });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to delete customer', 500);
  }
}
