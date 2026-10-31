'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PageHeader, Card, Button, Badge, Alert, StatCard,
  LoadingState, ErrorState, EmptyState,
} from '@/components/ui';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import { listDueSubscriptions, processDueInvoices } from '@/lib/api';
import { BillingBatchResult } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Zap, CheckCircle2, XCircle, AlertTriangle, Loader2,
  CreditCard, Calendar,
} from 'lucide-react';

export default function BillingPage() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<BillingBatchResult | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const { data: dueSubscriptions, loading, error, reload } = useApiResource(
    'billing:due',
    listDueSubscriptions
  );

  const due = dueSubscriptions ?? [];

  async function handleProcessBilling() {
    setProcessing(true);
    setResult(null);
    setAlert(null);
    try {
      const batch = await processDueInvoices();
      setResult(batch);
      setAlert({
        type: batch.failureCount > 0 ? 'warning' : 'success',
        message: `Processed ${batch.totalProcessed} subscriptions: ${batch.successCount} succeeded, ${batch.failureCount} failed.`,
      });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Batch processing failed.' });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing Center"
        description="Process due invoices for active subscriptions."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Billing Center' }]}
        actions={
          <Button onClick={handleProcessBilling} loading={processing} disabled={due.length === 0}>
            <Zap className="w-4 h-4" />
            Process Due Invoices
          </Button>
        }
      />

      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Due for Billing"
          value={loading ? '—' : due.length.toString()}
          icon={<Calendar className="w-5 h-5" />}
          className={due.length > 0 ? 'border-[var(--warning-500)]/30' : ''}
        />
        {result && (
          <>
            <StatCard
              title="Successfully Processed"
              value={result.successCount.toString()}
              icon={<CheckCircle2 className="w-5 h-5" />}
              className="border-[var(--success-500)]/30"
            />
            <StatCard
              title="Failed"
              value={result.failureCount.toString()}
              icon={<XCircle className="w-5 h-5" />}
              className={result.failureCount > 0 ? 'border-[var(--danger-500)]/30' : ''}
            />
          </>
        )}
      </div>

      {/* Due Subscriptions */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          Subscriptions Due for Billing
        </h2>

        {loading ? (
          <LoadingState message="Finding subscriptions due for billing..." rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : due.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-12 h-12 text-[var(--success-500)]" />}
            title="All caught up!"
            description="No subscriptions are currently due for billing."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Subscription</th>
                  <th>Customer</th>
                  <th>Plan</th>
                  <th>Next Billing Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {due.map((sub) => (
                  <tr key={sub.id}>
                    <td>
                      <Link href={`/dashboard/subscriptions/${sub.id}`} className="font-medium text-primary hover:underline">
                        {sub.number}
                      </Link>
                    </td>
                    <td>{sub.customerName}</td>
                    <td>{sub.planName}</td>
                    <td>
                      <span className="text-[var(--warning-600)] font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {formatDate(sub.nextBillingDate)}
                      </span>
                    </td>
                    <td><Badge variant="success" dot>Active</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Batch Results */}
      {processing && (
        <Card>
          <div className="flex items-center gap-3 py-8 justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">Processing invoices...</p>
          </div>
        </Card>
      )}

      {result && !processing && (
        <Card>
          <h2 className="text-lg font-semibold text-foreground mb-4">Batch Results</h2>
          <div className="space-y-3">
            {result.results.map((r) => (
              <div
                key={r.subscriptionId}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  r.success
                    ? 'bg-[var(--success-50)] border-green-200'
                    : 'bg-[var(--danger-50)] border-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {r.success ? (
                    <CheckCircle2 className="w-5 h-5 text-[var(--success-600)]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-[var(--danger-600)]" />
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {r.subscriptionNumber}
                      {r.invoiceNumber && (
                        <span className="text-muted-foreground"> → {r.invoiceNumber}</span>
                      )}
                    </p>
                    {r.error && (
                      <p className="text-xs text-[var(--danger-600)] mt-0.5">{r.error}</p>
                    )}
                  </div>
                </div>
                <Badge variant={r.success ? 'success' : 'danger'}>
                  {r.success ? 'Success' : 'Failed'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
