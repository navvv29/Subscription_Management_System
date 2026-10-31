'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  PageHeader, Card, Button, Badge, Alert, LoadingState, ErrorState, EmptyState,
} from '@/components/ui';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import { getQuotation, updateQuotationStatus, convertQuotation } from '@/lib/api';
import { QuotationStatus } from '@/types';
import { formatCurrency, formatDate, formatStatus, isExpired } from '@/lib/utils';
import {
  FileText, ArrowLeft, Send, CheckCircle2, XCircle, ArrowRightCircle, Printer,
} from 'lucide-react';

const statusVariant: Record<QuotationStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted', sent: 'info', accepted: 'success', rejected: 'danger', expired: 'warning', converted: 'default',
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const { data: quotation, loading, error, reload } = useApiResource(
    `quotation:${id}`,
    () => getQuotation(id)
  );

  function report(err: unknown) {
    setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Action failed.' });
  }

  async function changeStatus(status: QuotationStatus, message: string) {
    if (!quotation) return;
    setBusy(true);
    try {
      await updateQuotationStatus(quotation.id, status);
      setAlert({ type: 'success', message });
      await reload();
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleConvert() {
    if (!quotation) return;
    setBusy(true);
    try {
      const subscription = await convertQuotation(quotation.id);
      router.push(`/subscriptions/${subscription.id}`);
    } catch (err) {
      report(err);
      setBusy(false);
    }
  }

  const back = (
    <Link href="/quotations">
      <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </Link>
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Quotation" description="Loading quotation..." breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotations', href: '/quotations' }, { label: 'Quotation' }]} />
        <LoadingState message="Loading quotation..." rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Quotation" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotations', href: '/quotations' }, { label: 'Quotation' }]} actions={back} />
        <Card><ErrorState message={error} onRetry={reload} /></Card>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div>
        <PageHeader title="Quotation Not Found" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotations', href: '/quotations' }, { label: 'Not Found' }]} />
        <EmptyState icon={<FileText className="w-12 h-12" />} title="Quotation not found" description="This quotation does not exist or was removed." action={back} />
      </div>
    );
  }

  const expired = isExpired(quotation.validUntil) && quotation.status !== 'accepted' && quotation.status !== 'converted';

  return (
    <div>
      <PageHeader
        title={`Quotation ${quotation.number}`}
        description={quotation.customerName}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Quotations', href: '/quotations' },
          { label: quotation.number },
        ]}
        actions={<div className="flex items-center gap-2">{back}</div>}
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      {expired && (
        <div className="mb-4">
          <Alert type="warning" title="Quotation expired" message="This quotation is past its validity date and cannot be accepted. Create a new quotation for the customer." />
        </div>
      )}

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Customer</p>
            <Link href={`/customers/${quotation.customerId}`} className="font-medium text-primary hover:underline">
              {quotation.customerName ?? quotation.customerId}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant={expired ? 'warning' : statusVariant[quotation.status]} dot className="mt-1">
              {expired ? 'Expired' : formatStatus(quotation.status)}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Valid Until</p>
            <p className={expired ? 'font-medium text-[var(--danger-600)] mt-1' : 'font-medium mt-1'}>
              {formatDate(quotation.validUntil)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium mt-1">{quotation.createdAt ? formatDate(quotation.createdAt) : '—'}</p>
          </div>
        </div>
      </Card>

      <Card padding="none" className="mb-6">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>Product</th><th>Plan</th><th>Qty</th><th>Unit Price</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.productName}</td>
                  <td>{item.planName || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPriceMinor)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="text-right font-semibold !border-t-2 !border-border">Quotation total</td>
                <td className="text-right font-bold text-lg !border-t-2 !border-border">{formatCurrency(quotation.totalMinor)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {quotation.notes && (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-foreground mb-1">Notes</h2>
          <p className="text-sm text-muted-foreground">{quotation.notes}</p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap justify-end gap-2">
          {quotation.status === 'draft' && (
            <Button loading={busy} onClick={() => changeStatus('sent', 'Quotation marked as sent.')}>
              <Send className="w-4 h-4" /> Mark as Sent
            </Button>
          )}
          {quotation.status === 'sent' && !expired && (
            <>
              <Button variant="destructive" loading={busy} onClick={() => changeStatus('rejected', 'Quotation marked as rejected.')}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button variant="success" loading={busy} onClick={() => changeStatus('accepted', 'Quotation accepted.')}>
                <CheckCircle2 className="w-4 h-4" /> Accept
              </Button>
            </>
          )}
          {quotation.status === 'accepted' && (
            <Button loading={busy} onClick={handleConvert}>
              <ArrowRightCircle className="w-4 h-4" /> Convert to Subscription
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
