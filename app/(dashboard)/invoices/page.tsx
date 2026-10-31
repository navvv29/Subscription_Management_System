'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PageHeader, Card, Button, SearchFilterRow, Badge,
  EmptyState, Alert, Tabs, LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listInvoices } from '@/lib/api';
import { InvoiceStatus } from '@/types';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { Receipt, Eye } from 'lucide-react';

const PAGE_SIZE = 10;

const statusVariant: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted',
  confirmed: 'info',
  sent: 'default',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'danger',
  cancelled: 'muted',
};

const statusTabs = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'paid', label: 'Paid' },
  { id: 'overdue', label: 'Overdue' },
];

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useApiResource(
    `invoices:${debouncedSearch}:${statusFilter}:${page}`,
    () => listInvoices({
      search: debouncedSearch,
      status: statusFilter as InvoiceStatus | 'all',
      page,
      pageSize: PAGE_SIZE,
    })
  );

  const invoices = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="View and manage customer invoices."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices' }]}
      />

      <Card padding="none">
        <div className="px-4 pt-4">
          <Tabs tabs={statusTabs} activeTab={statusFilter} onTabChange={(id) => { setStatusFilter(id); setPage(1); }} />
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search invoices..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading invoices..." rows={5} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title="No invoices found"
            description="Invoices are generated from the Billing Center."
          />
        ) : (
          <div className="overflow-x-auto">
            {error && <div className="px-4"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td>{inv.customerName}</td>
                    <td><Badge variant={statusVariant[inv.status]} dot>{formatStatus(inv.status)}</Badge></td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td className="font-medium">{formatCurrency(inv.totalMinor)}</td>
                    <td className="text-[var(--success-600)]">{formatCurrency(inv.paidMinor)}</td>
                    <td className={inv.balanceMinor > 0 ? 'font-semibold text-[var(--danger-600)]' : 'text-muted-foreground'}>
                      {formatCurrency(inv.balanceMinor)}
                    </td>
                    <td>
                      <Link href={`/invoices/${inv.id}`} title="View invoice">
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
