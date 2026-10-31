'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader, StatCard, Card, Badge, LoadingState, ErrorState } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import { getDashboardOverview } from '@/lib/api';
import {
  CreditCard, DollarSign, AlertTriangle, Zap,
  ArrowRight, TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const { data, loading, error, reload } = useApiResource(
    'dashboard',
    getDashboardOverview
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Loading your subscription operations overview..." />
        <LoadingState message="Loading dashboard..." rows={4} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <Card>
          <ErrorState message={error ?? 'Dashboard data is unavailable.'} onRetry={reload} />
        </Card>
      </div>
    );
  }

  const { summary, recentSubscriptions, overdueInvoices } = data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your subscription operations."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active Subscriptions"
          value={summary.activeSubscriptions.toString()}
          icon={<CreditCard className="w-5 h-5" />}
        />
        <StatCard
          title="Collected"
          value={formatCurrency(summary.collectedMinor)}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(summary.outstandingMinor)}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Overdue"
          value={formatCurrency(summary.overdueMinor)}
          icon={<AlertTriangle className="w-5 h-5" />}
          className={summary.overdueMinor > 0 ? 'border-[var(--danger-500)]/30' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due for Billing */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Billing Due</h2>
            <Link
              href="/dashboard/billing"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Zap className="w-4 h-4" />
              Process Billing
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--warning-50)] border border-amber-200">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-[var(--warning-600)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--warning-600)]">
                {summary.dueForBillingCount} subscription{summary.dueForBillingCount !== 1 ? 's' : ''} due for billing
              </p>
              <p className="text-sm text-[var(--warning-600)]/80 mt-0.5">
                Review and process invoices for the current period
              </p>
            </div>
          </div>
        </Card>

        {/* Overdue Invoices */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Overdue Invoices</h2>
            <Link
              href="/dashboard/invoices"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No overdue invoices.</p>
          ) : (
            <div className="space-y-3">
              {overdueInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{inv.customerName} · Due {formatDate(inv.dueDate)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--danger-600)]">
                      {formatCurrency(inv.balanceMinor)}
                    </p>
                    <Badge variant="danger" dot>Overdue</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Active Subscriptions */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Active Subscriptions</h2>
            <Link
              href="/dashboard/subscriptions"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No active subscriptions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Customer</th>
                    <th>Plan</th>
                    <th>Next Billing</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSubscriptions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <Link href={`/dashboard/subscriptions/${sub.id}`} className="font-medium text-primary hover:underline">
                          {sub.number}
                        </Link>
                      </td>
                      <td>{sub.customerName}</td>
                      <td>{sub.planName}</td>
                      <td>{formatDate(sub.nextBillingDate)}</td>
                      <td>
                        <Badge variant="success" dot>Active</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
