'use client';

import React, { useState } from 'react';
import {
  PageHeader, Card, Button, SearchFilterRow, Badge,
  Input, Select, Textarea, EmptyState, Alert, LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listPayments, listPayableInvoices, createPayment } from '@/lib/api';
import { ApiRequestError } from '@/lib/api/client';
import { PaymentMethod } from '@/types';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import { DollarSign, Plus, CreditCard, Banknote, Smartphone } from 'lucide-react';

const PAGE_SIZE = 10;

const methodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
];

const methodIcon: Record<PaymentMethod, React.ReactNode> = {
  bank_transfer: <Banknote className="w-4 h-4" />,
  upi: <Smartphone className="w-4 h-4" />,
  card: <CreditCard className="w-4 h-4" />,
  cash: <DollarSign className="w-4 h-4" />,
  cheque: <DollarSign className="w-4 h-4" />,
  other: <DollarSign className="w-4 h-4" />,
};

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fInvoiceId, setFInvoiceId] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fMethod, setFMethod] = useState<PaymentMethod>('bank_transfer');
  const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0]);
  const [fNote, setFNote] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useApiResource(
    `payments:${debouncedSearch}:${page}`,
    async () => {
      const [payments, payable] = await Promise.all([
        listPayments({ search: debouncedSearch, page, pageSize: PAGE_SIZE }),
        listPayableInvoices(),
      ]);
      return { payments, payable };
    }
  );

  const payments = data?.payments.data ?? [];
  const unpaidInvoices = data?.payable ?? [];
  const selectedInvoice = unpaidInvoices.find(i => i.id === fInvoiceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fInvoiceId) errors.invoice = 'Select an invoice';
    if (!fAmount || isNaN(Number(fAmount)) || Number(fAmount) <= 0) errors.amount = 'Valid amount required';
    if (!fDate) errors.date = 'Date required';

    if (selectedInvoice && Math.round(Number(fAmount) * 100) > selectedInvoice.balanceMinor) {
      errors.amount = `Amount exceeds remaining balance of ${formatCurrency(selectedInvoice.balanceMinor)}`;
    }

    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const payment = await createPayment({
        invoiceId: fInvoiceId,
        amountMinor: Math.round(Number(fAmount) * 100),
        method: fMethod,
        paymentDate: fDate,
        note: fNote || undefined,
      });
      setAlert({ type: 'success', message: `Payment of ${formatCurrency(payment.amountMinor)} recorded for ${payment.invoiceNumber}.` });
      setShowForm(false);
      setFInvoiceId(''); setFAmount(''); setFMethod('bank_transfer'); setFNote(''); setFormErrors({});
      setPage(1);
      await reload();
    } catch (err) {
      if (err instanceof ApiRequestError && err.field) {
        setFormErrors({ [err.field]: err.message });
      } else {
        setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not record payment.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Record and manage payment transactions."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payments' }]}
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
            Record Payment
          </Button>
        }
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      {/* Payment Form */}
      {showForm && (
        <Card className="mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-4">Record New Payment</h2>
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Invoice"
                required
                options={unpaidInvoices.map(i => ({
                  value: i.id,
                  label: `${i.number} — ${i.customerName} (Balance: ${formatCurrency(i.balanceMinor)})`,
                }))}
                value={fInvoiceId}
                onChange={(e) => setFInvoiceId(e.target.value)}
                placeholder="Select invoice..."
                error={formErrors.invoice}
              />
              <Select
                label="Payment Method"
                required
                options={methodOptions}
                value={fMethod}
                onChange={(e) => setFMethod(e.target.value as PaymentMethod)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Amount (₹)"
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  error={formErrors.amount}
                />
                {selectedInvoice && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Remaining balance: <span className="font-semibold text-foreground">{formatCurrency(selectedInvoice.balanceMinor)}</span>
                  </p>
                )}
              </div>
              <Input
                label="Payment Date"
                required
                type="date"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                error={formErrors.date}
              />
            </div>

            <Textarea
              label="Note"
              value={fNote}
              onChange={(e) => setFNote(e.target.value)}
              placeholder="Optional payment note..."
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>Record Payment</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Payments List */}
      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search by invoice or customer..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading payments..." rows={5} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-12 h-12" />}
            title="No payments found"
            description={search ? 'Try adjusting your search.' : 'Record your first payment.'}
            action={!search && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Record Payment</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            {error && <div className="px-4"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-medium text-foreground">{payment.invoiceNumber}</td>
                    <td>{payment.customerName}</td>
                    <td>
                      <Badge variant="outline">
                        {methodIcon[payment.method]}
                        {formatStatus(payment.method)}
                      </Badge>
                    </td>
                    <td className="font-semibold text-[var(--success-600)]">
                      {formatCurrency(payment.amountMinor)}
                    </td>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td className="text-muted-foreground">{payment.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={data?.payments.page ?? 1}
            totalPages={data?.payments.totalPages ?? 1}
            onPageChange={setPage}
            totalItems={data?.payments.total ?? 0}
            pageSize={PAGE_SIZE}
          />
        </div>
      </Card>
    </div>
  );
}
