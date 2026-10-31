'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PageHeader, Card, Button, Badge, Alert, LoadingState, ErrorState, EmptyState,
} from '@/components/ui';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import { getInvoice, confirmInvoice, cancelInvoice, sendInvoiceEmail } from '@/lib/api';
import { InvoiceStatus } from '@/types';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import {
  Receipt, ArrowLeft, CheckCircle2, XCircle, Send, Printer,
  Mail, Calendar, User, FileText,
} from 'lucide-react';

const statusVariant: Record<InvoiceStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted',
  confirmed: 'info',
  sent: 'default',
  paid: 'success',
  partially_paid: 'warning',
  overdue: 'danger',
  cancelled: 'muted',
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const { data, loading, error, reload } = useApiResource(
    `invoice:${id}`,
    () => getInvoice(id)
  );

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await action();
      if (success) setAlert({ type: 'success', message: success });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/dashboard/invoices">
      <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </Link>
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Invoice" description="Loading invoice..." breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices', href: '/dashboard/invoices' }, { label: 'Invoice' }]} />
        <LoadingState message="Loading invoice..." rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Invoice" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices', href: '/dashboard/invoices' }, { label: 'Invoice' }]} actions={back} />
        <Card><ErrorState message={error} onRetry={reload} /></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Invoice Not Found" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Invoices', href: '/dashboard/invoices' }, { label: 'Not Found' }]} />
        <EmptyState icon={<Receipt className="w-12 h-12" />} title="Invoice not found" description="This invoice does not exist or was removed." action={back} />
      </div>
    );
  }

  const { invoice, customer, payments } = data;
  const canCancel = invoice.status !== 'cancelled' && invoice.status !== 'paid' && invoice.paidMinor === 0;

  return (
    <div>
      <PageHeader
        title={`Invoice ${invoice.number}`}
        description={invoice.customerName}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Invoices', href: '/dashboard/invoices' },
          { label: invoice.number },
        ]}
        actions={back}
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      {/* Customer snapshot + key dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Customer</p>
          <Link href={`/dashboard/customers/${invoice.customerId}`} className="text-sm font-medium text-primary hover:underline mt-1 block">
            {invoice.customerName ?? customer?.name ?? invoice.customerId}
          </Link>
          {customer && (
            <p className="text-xs text-muted-foreground mt-1">
              {customer.email}{customer.company ? ` · ${customer.company}` : ''}
            </p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Subscription</p>
          {invoice.subscriptionId ? (
            <Link href={`/dashboard/subscriptions/${invoice.subscriptionId}`} className="text-sm font-medium text-primary hover:underline mt-1 block">
              {invoice.subscriptionNumber ?? invoice.subscriptionId}
            </Link>
          ) : (
            <p className="text-sm font-medium mt-1">—</p>
          )}
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Issue / Due</p>
          <p className="text-sm font-medium mt-1">{formatDate(invoice.issueDate)}</p>
          <p className="text-xs text-muted-foreground">Due {formatDate(invoice.dueDate)}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge variant={statusVariant[invoice.status]} dot className="mt-1">{formatStatus(invoice.status)}</Badge>
          {invoice.billingPeriodStart && (
            <p className="text-xs text-muted-foreground mt-2">
              Period {formatDate(invoice.billingPeriodStart)} – {invoice.billingPeriodEnd ? formatDate(invoice.billingPeriodEnd) : '—'}
            </p>
          )}
        </Card>
      </div>

      {/* Email status — only claimed when the server recorded a send */}
      <div className="mb-6">
        {invoice.emailSentAt ? (
          <div className="flex items-center gap-2 text-sm text-[var(--success-600)]">
            <Mail className="w-4 h-4" />
            Email sent on {formatDate(invoice.emailSentAt)}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            No confirmed email has been sent for this invoice.
          </div>
        )}
      </div>

      <Card padding="none" className="mb-6">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPriceMinor)}</td>
                  <td className="text-right">{formatCurrency(item.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Totals come straight from the invoice record */}
      <div className="flex justify-end mb-6">
        <Card className="w-full sm:w-80">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.subtotalMinor)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(invoice.taxMinor)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-[var(--success-600)]">-{formatCurrency(invoice.discountMinor)}</span></div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-base">
              <span>Total</span><span>{formatCurrency(invoice.totalMinor)}</span>
            </div>
            <div className="flex justify-between text-[var(--success-600)]">
              <span>Paid</span><span>{formatCurrency(invoice.paidMinor)}</span>
            </div>
            <div className={`flex justify-between font-bold text-lg ${invoice.balanceMinor > 0 ? 'text-[var(--danger-600)]' : 'text-[var(--success-600)]'}`}>
              <span>Balance</span><span>{formatCurrency(invoice.balanceMinor)}</span>
            </div>
          </div>
        </Card>
      </div>

      {payments.length > 0 && (
        <Card padding="none" className="mb-6">
          <div className="p-4 border-b border-border"><h2 className="text-lg font-semibold text-foreground">Payments</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr><th>Date</th><th>Method</th><th>Note</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.paymentDate)}</td>
                    <td><Badge variant="outline">{formatStatus(p.method)}</Badge></td>
                    <td className="text-muted-foreground">{p.note || '—'}</td>
                    <td className="text-right font-semibold text-[var(--success-600)]">{formatCurrency(p.amountMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap justify-end gap-2">
          {invoice.status === 'draft' && (
            <Button loading={busy} onClick={() => run(() => confirmInvoice(invoice.id), 'Invoice confirmed.')}>
              <CheckCircle2 className="w-4 h-4" /> Confirm
            </Button>
          )}
          {(invoice.status === 'confirmed' || invoice.status === 'sent') && (
            <Button
              variant="outline"
              loading={busy}
              onClick={() => run(async () => {
                const result = await sendInvoiceEmail(invoice.id);
                setAlert(result.sent
                  ? { type: 'success', message: 'Invoice email sent.' }
                  : { type: 'warning', message: result.message });
              })}
            >
              <Send className="w-4 h-4" /> Send Email
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" loading={busy} onClick={() => run(() => cancelInvoice(invoice.id), 'Invoice cancelled.')}>
              <XCircle className="w-4 h-4" /> Cancel
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Print
          </Button>
        </div>
      </Card>
    </div>
  );
}
