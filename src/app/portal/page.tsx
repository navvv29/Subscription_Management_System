'use client';

import React, { useState } from 'react';
import {
  PageHeader, Card, Badge, Dialog, Button, SearchFilterRow, EmptyState, Alert,
  LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listMyQuotations, acceptMyQuotation } from '@/lib/api';
import { Quotation, QuotationStatus } from '@/types';
import { formatCurrency, formatDate, isExpired, formatStatus } from '@/lib/utils';
import { FileText, Eye, CheckCircle2 } from 'lucide-react';

const PAGE_SIZE = 10;

const statusVariant: Record<QuotationStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted', sent: 'info', accepted: 'success', rejected: 'danger', expired: 'warning', converted: 'default',
};

export default function PortalQuotationsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Quotation | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [accepting, setAccepting] = useState(false);

  const { data, loading, error, reload } = useApiResource(
    `portal-quotations:${debouncedSearch}:${page}`,
    () => listMyQuotations({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
  );

  const quotations = data?.data ?? [];

  async function handleAccept() {
    if (!detail) return;
    setAccepting(true);
    try {
      await acceptMyQuotation(detail.id);
      setDetail(null);
      setAlert({ type: 'success', message: 'Quotation accepted. Our team will set up your subscription.' });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not accept quotation.' });
      setDetail(null);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div>
      <PageHeader title="My Quotations" description="View quotations addressed to your account." />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search quotations..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading your quotations..." rows={4} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No quotations"
            description={search ? 'No quotations match your search.' : "You don't have any quotations yet."}
          />
        ) : (
          <div className="overflow-x-auto">
            {error && <div className="px-4"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Status</th>
                  <th>Valid Until</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const expired = isExpired(q.validUntil) && q.status === 'sent';
                  return (
                    <tr key={q.id}>
                      <td className="font-medium text-foreground">{q.number}</td>
                      <td>
                        <Badge variant={expired ? 'warning' : statusVariant[q.status]} dot>
                          {expired ? 'Expired' : formatStatus(q.status)}
                        </Badge>
                      </td>
                      <td>
                        <span className={expired ? 'text-[var(--danger-600)]' : ''}>
                          {formatDate(q.validUntil)}
                          {expired && <span className="text-xs ml-1">(Expired)</span>}
                        </span>
                      </td>
                      <td>{q.items.length}</td>
                      <td className="font-semibold">{formatCurrency(q.totalMinor)}</td>
                      <td>
                        <Button variant="ghost" size="icon" onClick={() => setDetail(q)} title="View quotation">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
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

      <Dialog open={!!detail} onClose={() => setDetail(null)} title={detail ? `Quotation ${detail.number}` : ''} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Status:</span> <Badge variant={statusVariant[detail.status]} dot>{formatStatus(detail.status)}</Badge></div>
              <div><span className="text-muted-foreground">Valid Until:</span> {formatDate(detail.validUntil)}</div>
            </div>

            {isExpired(detail.validUntil) && detail.status === 'sent' && (
              <Alert type="warning" message="This quotation has expired. Please contact us for a new quote." />
            )}

            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead><tr><th>Product</th><th>Plan</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {detail.items.map(item => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.productName}</td>
                      <td>{item.planName || '—'}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPriceMinor)}</td>
                      <td className="font-semibold">{formatCurrency(item.totalMinor)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4} className="text-right font-semibold !border-t-2">Total</td><td className="font-bold text-lg !border-t-2">{formatCurrency(detail.totalMinor)}</td></tr>
                </tfoot>
              </table>
            </div>

            {detail.notes && <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded-lg">{detail.notes}</p>}

            <div className="flex justify-end gap-2">
              {detail.status === 'sent' && !isExpired(detail.validUntil) && (
                <Button variant="success" loading={accepting} onClick={handleAccept}>
                  <CheckCircle2 className="w-4 h-4" /> Accept Quotation
                </Button>
              )}
              <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
