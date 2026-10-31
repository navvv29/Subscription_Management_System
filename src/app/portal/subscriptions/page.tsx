'use client';

import React, { useState } from 'react';
import {
  PageHeader, Card, Badge, Dialog, Button, SearchFilterRow, EmptyState,
  LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listMySubscriptions } from '@/lib/api';
import { Subscription, SubscriptionStatus } from '@/types';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { CreditCard, Eye, Calendar, FileText, DollarSign } from 'lucide-react';

const PAGE_SIZE = 10;

const statusVariant: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted', active: 'success', paused: 'warning', cancelled: 'danger', expired: 'muted', pending_renewal: 'info',
};

export default function PortalSubscriptionsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Subscription | null>(null);

  const { data, loading, error, reload } = useApiResource(
    `portal-subscriptions:${debouncedSearch}:${page}`,
    () => listMySubscriptions({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
  );

  const subscriptions = data?.data ?? [];

  return (
    <div>
      <PageHeader title="My Subscriptions" description="View your active and past subscriptions." />

      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search subscriptions..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading your subscriptions..." rows={4} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-12 h-12" />}
            title="No subscriptions"
            description={search ? 'No subscriptions match your search.' : "You don't have any subscriptions yet."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr><th>Number</th><th>Plan</th><th>Status</th><th>Start</th><th>Next Billing</th><th className="w-16"></th></tr>
              </thead>
              <tbody>
                {subscriptions.map(sub => (
                  <tr key={sub.id}>
                    <td className="font-medium text-foreground">{sub.number}</td>
                    <td>{sub.planName}</td>
                    <td><Badge variant={statusVariant[sub.status]} dot>{formatStatus(sub.status)}</Badge></td>
                    <td>{formatDate(sub.startDate)}</td>
                    <td>{formatDate(sub.nextBillingDate)}</td>
                    <td><Button variant="ghost" size="icon" onClick={() => setDetail(sub)} title="View subscription"><Eye className="w-4 h-4" /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={data?.page ?? 1}
            totalPages={data?.totalPages ?? 1}
            onPageChange={setPage}
            totalItems={data?.total ?? 0}
            pageSize={PAGE_SIZE}
          />
        </div>
      </Card>

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail ? `Subscription ${detail.number}` : ''} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Plan</p><p className="text-sm font-medium mt-0.5">{detail.planName}</p></div>
              <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Terms</p><p className="text-sm font-medium mt-0.5">{detail.paymentTerms}</p></div>
              <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground">Status</p><Badge variant={statusVariant[detail.status]} dot className="mt-1">{formatStatus(detail.status)}</Badge></div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-muted-foreground">Start</p><p className="font-medium">{formatDate(detail.startDate)}</p></div>
              <div><p className="text-muted-foreground">End</p><p className="font-medium">{detail.endDate ? formatDate(detail.endDate) : 'Ongoing'}</p></div>
              <div><p className="text-muted-foreground">Next Billing</p><p className="font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(detail.nextBillingDate)}</p></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                <tbody>
                  {detail.items.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPriceMinor)}</td>
                      <td className="font-semibold">{formatCurrency(item.totalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end"><Button variant="outline" onClick={() => setDetail(null)}>Close</Button></div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
