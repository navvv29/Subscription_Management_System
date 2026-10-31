'use client';

import React, { useState } from 'react';
import {
  PageHeader, Card, Badge, Dialog, Button, SearchFilterRow, EmptyState, Alert,
  LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listMyInvoices, getMyInvoice } from '@/lib/api';
import { Invoice, InvoiceStatus, Payment } from '@/types';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { Receipt, Eye, Calendar, DollarSign, Printer } from 'lucide-react';

const PAGE_SIZE = 10;

const statusVariant: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted', confirmed: 'info', sent: 'default', paid: 'success', partially_paid: 'warning', overdue: 'danger', cancelled: 'muted',
};

export default function PortalInvoicesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<{ invoice: Invoice; payments: Payment[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { data, loading, error, reload } = useApiResource(
    `portal-invoices:${debouncedSearch}:${page}`,
    () => listMyInvoices({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
  );

  const invoices = data?.data ?? [];

  async function openInvoice(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      setDetail(await getMyInvoice(id));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Could not load this invoice.');
    } finally {
      setDetailLoading(false);
    }
  }

  const dialogOpen = detailLoading || !!detail || !!detailError;

  return (
    <div>
      <PageHeader title="My Invoices" description="View your invoices and payment history." />

      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search invoices..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading your invoices..." rows={4} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title="No invoices"
            description={search ? 'No invoices match your search.' : "You don't have any invoices yet."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr><th>Number</th><th>Status</th><th>Due Date</th><th>Total</th><th>Paid</th><th>Balance</th><th className="w-16"></th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-medium text-foreground">{inv.number}</td>
                    <td><Badge variant={statusVariant[inv.status]} dot>{formatStatus(inv.status)}</Badge></td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td className="font-medium">{formatCurrency(inv.totalMinor)}</td>
                    <td className="text-[var(--success-600)]">{formatCurrency(inv.paidMinor)}</td>
                    <td className={inv.balanceMinor > 0 ? 'font-semibold text-[var(--danger-600)]' : 'text-muted-foreground'}>
                      {formatCurrency(inv.balanceMinor)}
                    </td>
                    <td><Button variant="ghost" size="icon" onClick={() => openInvoice(inv.id)} title="View invoice"><Eye className="w-4 h-4" /></Button></td>
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

      <Dialog
        open={dialogOpen}
        onClose={() => { setDetail(null); setDetailError(null); }}
        title={detail ? `Invoice ${detail.invoice.number}` : 'Invoice'}
        size="lg"
      >
        {detailLoading && <LoadingState message="Loading invoice..." rows={3} />}
        {detailError && <Alert type="error" message={detailError} />}
        {detail && (() => {
          const invoice = detail.invoice;
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground">Status</p><Badge variant={statusVariant[invoice.status]} dot className="mt-1">{formatStatus(invoice.status)}</Badge></div>
                <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</p><p className="text-sm font-medium mt-0.5">{formatDate(invoice.dueDate)}</p></div>
                <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Total</p><p className="text-sm font-bold mt-0.5">{formatCurrency(invoice.totalMinor)}</p></div>
                <div className="p-3 rounded-lg bg-accent/50"><p className="text-xs text-muted-foreground">Balance</p><p className={`text-sm font-bold mt-0.5 ${invoice.balanceMinor > 0 ? 'text-[var(--danger-600)]' : 'text-[var(--success-600)]'}`}>{formatCurrency(invoice.balanceMinor)}</p></div>
              </div>

              {invoice.billingPeriodStart && (
                <p className="text-sm text-muted-foreground">Billing: {formatDate(invoice.billingPeriodStart)} – {invoice.billingPeriodEnd ? formatDate(invoice.billingPeriodEnd) : 'Ongoing'}</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full data-table">
                  <thead><tr><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {invoice.lineItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unitPriceMinor)}</td>
                        <td className="font-medium">{formatCurrency(item.totalMinor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.subtotalMinor)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(invoice.taxMinor)}</span></div>
                  {invoice.discountMinor > 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-[var(--success-600)]">-{formatCurrency(invoice.discountMinor)}</span></div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatCurrency(invoice.totalMinor)}</span></div>
                  <div className="flex justify-between text-[var(--success-600)]"><span>Paid</span><span>{formatCurrency(invoice.paidMinor)}</span></div>
                  <div className={`flex justify-between font-bold ${invoice.balanceMinor > 0 ? 'text-[var(--danger-600)]' : 'text-[var(--success-600)]'}`}>
                    <span>Balance</span><span>{formatCurrency(invoice.balanceMinor)}</span>
                  </div>
                </div>
              </div>

              {detail.payments.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Payment History</h3>
                  <div className="space-y-2">
                    {detail.payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--success-50)] border border-green-200 text-sm">
                        <div>
                          <p className="font-medium text-[var(--success-700)]">{formatCurrency(p.amountMinor)}</p>
                          <p className="text-xs text-[var(--success-600)]">{formatDate(p.paymentDate)} · {formatStatus(p.method)}</p>
                        </div>
                        {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4" /> Print</Button>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
