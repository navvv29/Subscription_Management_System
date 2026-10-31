'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PageHeader, Card, Button, Badge, Alert, LoadingState, ErrorState, EmptyState,
} from '@/components/ui';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import { getSubscription, transitionSubscription } from '@/lib/api';
import { SubscriptionStatus } from '@/types';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import {
  CreditCard, ArrowLeft, Play, Pause, XCircle, RotateCcw,
  Calendar, User, FileText, DollarSign, PauseCircle,
} from 'lucide-react';

const statusVariant: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default'> = {
  draft: 'muted',
  active: 'success',
  paused: 'warning',
  cancelled: 'danger',
  expired: 'muted',
  pending_renewal: 'info',
};

interface Action {
  label: string;
  to: SubscriptionStatus;
  icon: React.ReactNode;
  variant: 'primary' | 'success' | 'destructive' | 'outline';
}

export default function SubscriptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, loading, error, reload } = useApiResource(
    `subscription:${id}`,
    () => getSubscription(id)
  );

  async function handleTransition(action: Action) {
    if (!data) return;
    setBusy(true);
    try {
      await transitionSubscription(data.subscription.id, action.to);
      setAlert({ type: 'success', message: `${data.subscription.number}: ${action.label} successful.` });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Action failed.' });
    } finally {
      setBusy(false);
    }
  }

  const back = (
    <Link href="/dashboard/subscriptions">
      <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </Link>
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Subscription" description="Loading subscription..." breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subscriptions', href: '/dashboard/subscriptions' }, { label: 'Subscription' }]} />
        <LoadingState message="Loading subscription..." rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Subscription" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subscriptions', href: '/dashboard/subscriptions' }, { label: 'Subscription' }]} actions={back} />
        <Card><ErrorState message={error} onRetry={reload} /></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Subscription Not Found" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Subscriptions', href: '/dashboard/subscriptions' }, { label: 'Not Found' }]} />
        <EmptyState icon={<CreditCard className="w-12 h-12" />} title="Subscription not found" description="This subscription does not exist or was removed." action={back} />
      </div>
    );
  }

  const { subscription, plan, invoices } = data;

  // Buttons follow the lifecycle AND the plan's policy flags. The server still
  // validates every transition; hiding a button is never the enforcement.
  const actions: Action[] = [];
  if (subscription.status === 'draft') {
    actions.push({ label: 'Activate', to: 'active', icon: <Play className="w-4 h-4" />, variant: 'success' });
  }
  if (subscription.status === 'active') {
    if (!plan || plan.allowPause) {
      actions.push({ label: 'Pause', to: 'paused', icon: <Pause className="w-4 h-4" />, variant: 'outline' });
    }
    if (!plan || plan.allowEarlyClose) {
      actions.push({ label: 'Cancel', to: 'cancelled', icon: <XCircle className="w-4 h-4" />, variant: 'destructive' });
    }
  }
  if (subscription.status === 'paused') {
    if (!plan || plan.allowPause) {
      actions.push({ label: 'Resume', to: 'active', icon: <Play className="w-4 h-4" />, variant: 'success' });
    }
    if (!plan || plan.allowEarlyClose) {
      actions.push({ label: 'Cancel', to: 'cancelled', icon: <XCircle className="w-4 h-4" />, variant: 'destructive' });
    }
  }
  if ((subscription.status === 'expired' || subscription.status === 'pending_renewal') && (!plan || plan.allowRenewal)) {
    actions.push({ label: 'Renew', to: 'active', icon: <RotateCcw className="w-4 h-4" />, variant: 'primary' });
  }

  return (
    <div>
      <PageHeader
        title={`Subscription ${subscription.number}`}
        description={subscription.customerName}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Subscriptions', href: '/dashboard/subscriptions' },
          { label: subscription.number },
        ]}
        actions={back}
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Customer</p>
              <Link href={`/dashboard/customers/${subscription.customerId}`} className="text-sm font-medium text-primary hover:underline">
                {subscription.customerName ?? subscription.customerId}
              </Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="text-sm font-medium">{subscription.planName ?? plan?.name ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Payment Terms</p>
              <p className="text-sm font-medium">{subscription.paymentTerms}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Next Billing</p>
              <p className="text-sm font-medium">{formatDate(subscription.nextBillingDate)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <Badge variant={statusVariant[subscription.status]} dot className="mt-1">{formatStatus(subscription.status)}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Start Date</p>
            <p className="font-medium mt-1">{formatDate(subscription.startDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">End Date</p>
            <p className="font-medium mt-1">{subscription.endDate ? formatDate(subscription.endDate) : 'Ongoing'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Billing Interval</p>
            <p className="font-medium mt-1">{plan ? formatStatus(plan.interval) : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Min. Quantity</p>
            <p className="font-medium mt-1">{plan ? plan.minimumQuantity : '—'}</p>
          </div>
        </div>

        {plan && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            <Badge variant={plan.allowPause ? 'success' : 'muted'} dot><PauseCircle className="w-3 h-3" /> Pause {plan.allowPause ? 'allowed' : 'not allowed'}</Badge>
            <Badge variant={plan.allowEarlyClose ? 'success' : 'muted'} dot><XCircle className="w-3 h-3" /> Early close {plan.allowEarlyClose ? 'allowed' : 'not allowed'}</Badge>
            <Badge variant={plan.allowRenewal ? 'success' : 'muted'} dot><RotateCcw className="w-3 h-3" /> Renewal {plan.allowRenewal ? 'allowed' : 'not allowed'}</Badge>
          </div>
        )}
      </Card>

      <Card padding="none" className="mb-6">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th className="text-right">Line Total</th></tr></thead>
            <tbody>
              {subscription.items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium">{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPriceMinor)}</td>
                  <td className="text-right font-semibold">{formatCurrency(item.totalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card padding="none" className="mb-6">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Invoices</h2>
          <Link href="/dashboard/invoices" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {invoices.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No invoices generated for this subscription yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead><tr><th>Number</th><th>Status</th><th>Due</th><th>Total</th><th>Balance</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium text-primary hover:underline">
                        {inv.number}
                      </Link>
                    </td>
                    <td><Badge variant="outline">{formatStatus(inv.status)}</Badge></td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td>{formatCurrency(inv.totalMinor)}</td>
                    <td className={inv.balanceMinor > 0 ? 'font-semibold text-[var(--danger-600)]' : 'text-muted-foreground'}>
                      {formatCurrency(inv.balanceMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {actions.length === 0
              ? 'No lifecycle actions are available for this subscription in its current state.'
              : 'Available lifecycle actions. The server remains authoritative.'}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                loading={busy}
                onClick={() => handleTransition(action)}
              >
                {action.icon} {action.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
