import { apiSuccess, apiError } from '@/lib/api-helpers';
import { store } from '@/lib/store';
import { isDueForBilling } from '@/lib/billing/date-utils';
import { isBefore, parseISO, startOfDay, format } from 'date-fns';
import type { DashboardSummary } from '@/types/database';
import { requireStaff } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requireStaff();
  if ('response' in auth) return auth.response;
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const today = startOfDay(new Date());

    const allSubs = Array.from(store.subscriptions.values());
    const allInvoices = Array.from(store.invoices.values());
    const allPayments = Array.from(store.payments.values());

    const activeSubscriptions = allSubs.filter((s) => s.status === 'active').length;

    const collectedMinor = allPayments.reduce((sum, p) => sum + p.amountMinor, 0);

    const outstandingMinor = allInvoices
      .filter((i) => i.status !== 'cancelled' && i.status !== 'paid')
      .reduce((sum, i) => sum + i.balanceMinor, 0);

    const overdueMinor = allInvoices
      .filter((i) => {
        if (i.status === 'cancelled' || i.status === 'paid') return false;
        return isBefore(startOfDay(parseISO(i.dueDate)), today);
      })
      .reduce((sum, i) => sum + i.balanceMinor, 0);

    const dueForBillingCount = allSubs.filter(
      (s) => s.status === 'active' && isDueForBilling(s.nextBillingDate, todayStr)
    ).length;

    const summary: DashboardSummary = {
      activeSubscriptions,
      collectedMinor,
      outstandingMinor,
      overdueMinor,
      dueForBillingCount,
    };

    const recentInvoices = allInvoices
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const recentPayments = allPayments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return apiSuccess({
      summary,
      recentInvoices,
      recentPayments,
    });
  } catch (err: unknown) {
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Dashboard calculation failed', 500);
  }
}

