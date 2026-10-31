'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PageHeader, Card, Button, SearchFilterRow, Badge,
  EmptyState, Alert, Tabs, LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listSubscriptions } from '@/lib/api';
import { SubscriptionStatus } from '@/types';
import { formatDate, formatStatus } from '@/lib/utils';
import { CreditCard, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

const statusVariant: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted',
  confirmed: 'info',
  active: 'success',
  paused: 'warning',
  cancelled: 'danger',
  expired: 'muted',
  pending_renewal: 'info',
};

const statusTabs = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApiResource(
    `subscriptions:${debouncedSearch}:${statusFilter}:${page}`,
    () => listSubscriptions({
      search: debouncedSearch,
      status: statusFilter as SubscriptionStatus | 'all',
      page,
      pageSize: PAGE_SIZE,
    })
  );

  const subscriptions = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="View and manage customer subscriptions and their lifecycle."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subscriptions' }]}
      />

      <Card padding="none">
        <div className="px-4 pt-4">
          <Tabs tabs={statusTabs} activeTab={statusFilter} onTabChange={(id) => { setStatusFilter(id); setPage(1); }} />
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search by number, customer or plan..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading subscriptions..." rows={5} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-12 h-12" />}
            title="No subscriptions found"
            description="Subscriptions are created from accepted quotations."
          />
        ) : (
          <div className="overflow-x-auto">
            {error && <div className="px-4"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Start</th>
                  <th>Next Billing</th>
                  <th>Terms</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <Link href={`/subscriptions/${sub.id}`} className="font-medium text-primary hover:underline">
                        {sub.number}
                      </Link>
                    </td>
                    <td>{sub.customerName}</td>
                    <td>{sub.planName}</td>
                    <td><Badge variant={statusVariant[sub.status]} dot>{formatStatus(sub.status)}</Badge></td>
                    <td>{formatDate(sub.startDate)}</td>
                    <td>{formatDate(sub.nextBillingDate)}</td>
                    <td><Badge variant="outline">{sub.paymentTerms}</Badge></td>
                    <td>
                      <Link href={`/subscriptions/${sub.id}`} title="View details">
                        <Button variant="ghost" size="icon" tabIndex={-1}><Eye className="w-4 h-4" /></Button>
                      </Link>
                    </td>
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
    </div>
  );
}
