import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { paginationSchema } from '@/lib/validation/schemas';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = paginationSchema.safeParse({
      page: searchParams.get('page') ?? '1',
      pageSize: searchParams.get('pageSize') ?? '20',
      sortBy: searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
    });

    if (!params.success) {
      return apiError('VALIDATION_ERROR', params.error.message);
    }

    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');
    const subscriptionId = searchParams.get('subscriptionId');

    let list = Array.from(store.invoices.values());
    if (status) list = list.filter((i) => i.status === status);
    if (customerId) list = list.filter((i) => i.customerId === customerId);
    if (subscriptionId) list = list.filter((i) => i.subscriptionId === subscriptionId);

    list.sort((a, b) => {
      const order = params.data.sortOrder === 'asc' ? 1 : -1;
      return order * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    const { page, pageSize } = params.data;
    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const startIdx = (page - 1) * pageSize;
    const paginated = list.slice(startIdx, startIdx + pageSize);

    return apiSuccess({
      data: paginated,
      pagination: { page, pageSize, totalCount, totalPages },
    });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to fetch invoices', 500);
  }
}

