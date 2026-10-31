import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { format, parseISO } from 'date-fns';

export async function GET() {
  try {
    const allInvoices = Array.from(store.invoices.values());
    const allPayments = Array.from(store.payments.values());

    const monthlyMap = new Map<
      string,
      { collectedMinor: number; outstandingMinor: number; invoiceCount: number }
    >();

    for (const inv of allInvoices) {
      if (inv.status === 'cancelled') continue;
      const month = format(parseISO(inv.createdAt), 'yyyy-MM');
      const item = monthlyMap.get(month) ?? {
        collectedMinor: 0,
        outstandingMinor: 0,
        invoiceCount: 0,
      };
      item.outstandingMinor += inv.balanceMinor;
      item.invoiceCount += 1;
      monthlyMap.set(month, item);
    }

    for (const p of allPayments) {
      const month = format(parseISO(p.paymentDate || p.createdAt), 'yyyy-MM');
      const item = monthlyMap.get(month) ?? {
        collectedMinor: 0,
        outstandingMinor: 0,
        invoiceCount: 0,
      };
      item.collectedMinor += p.amountMinor;
      monthlyMap.set(month, item);
    }

    const report = Array.from(monthlyMap.entries())
      .map(([period, data]) => ({
        period,
        ...data,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return apiSuccess({ report });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Revenue report failed', 500);
  }
}
