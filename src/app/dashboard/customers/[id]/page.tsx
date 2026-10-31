'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import {
  PageHeader, Card, Badge, Button, EmptyState, LoadingState, ErrorState,
} from '@/components/ui';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import {
  getCustomer, listSubscriptions, listInvoices, listQuotations,
} from '@/lib/api';
import { formatCurrency, formatDate, formatStatus } from '@/lib/utils';
import Link from 'next/link';
import {
  User, Mail, Phone, Building2, CreditCard, FileText,
  Receipt, ArrowLeft,
} from 'lucide-react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'default';

const statusVariant: Record<string, BadgeVariant> = {
  active: 'success', paused: 'warning', cancelled: 'danger', draft: 'muted', expired: 'muted',
  paid: 'success', confirmed: 'info', overdue: 'danger', partially_paid: 'warning',
  sent: 'info', accepted: 'success', converted: 'default', rejected: 'danger',
  pending_renewal: 'info',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;

  const { data, loading, error, reload } = useApiResource(`customer:${customerId}`, async () => {
    const [customer, quotations, subscriptions, invoices] = await Promise.all([
      getCustomer(customerId),
      listQuotations({ customerId, pageSize: 100 }),
      listSubscriptions({ customerId, pageSize: 100 }),
      listInvoices({ customerId, pageSize: 100 }),
    ]);
    return {
      customer,
      quotations: quotations.data,
      subscriptions: subscriptions.data,
      invoices: invoices.data,
    };
  });

  const backButton = (
    <Link href="/dashboard/customers">
      <Button variant="outline"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </Link>
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Customer" description="Loading customer records..." />
        <LoadingState message="Loading customer..." rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Customer"
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers', href: '/dashboard/customers' }, { label: 'Customer' }]}
          actions={backButton}
        />
        <Card><ErrorState message={error} onRetry={reload} /></Card>
      </div>
    );
  }

  const customer = data?.customer;

  if (!customer) {
    return (
      <div>
        <PageHeader
          title="Customer Not Found"
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers', href: '/dashboard/customers' }, { label: 'Not Found' }]}
        />
        <EmptyState
          icon={<User className="w-12 h-12" />}
          title="Customer not found"
          description="The customer you're looking for doesn't exist."
          action={backButton}
        />
      </div>
    );
  }

  const customerQuotations = data?.quotations ?? [];
  const customerSubs = data?.subscriptions ?? [];
  const customerInvoices = data?.invoices ?? [];

  return (
    <div>
      <PageHeader
        title={customer.name}
        description="Customer detail and related records"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Customers', href: '/dashboard/customers' },
          { label: customer.name },
        ]}
        actions={backButton}
      />

      {/* Customer Info Card */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-white text-lg font-bold">
              {customer.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <p className="font-semibold text-foreground">{customer.name}</p>
              <p className="text-xs text-muted-foreground">Customer</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>{customer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span>{customer.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span>{customer.company || '—'}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quotations */}
        <Card>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Quotations ({customerQuotations.length})
          </h2>
          {customerQuotations.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No quotations</p>
          ) : (
            <div className="space-y-2">
              {customerQuotations.map(q => (
                <Link key={q.id} href={`/dashboard/quotations/${q.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{q.number}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(q.totalMinor)}</p>
                  </div>
                  <Badge variant={statusVariant[q.status] || 'muted'} dot>{formatStatus(q.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Subscriptions */}
        <Card>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Subscriptions ({customerSubs.length})
          </h2>
          {customerSubs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No subscriptions</p>
          ) : (
            <div className="space-y-2">
              {customerSubs.map(s => (
                <Link key={s.id} href={`/dashboard/subscriptions/${s.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{s.number}</p>
                    <p className="text-xs text-muted-foreground">{s.planName}</p>
                  </div>
                  <Badge variant={statusVariant[s.status] || 'muted'} dot>{formatStatus(s.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Invoices */}
        <Card>
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Invoices ({customerInvoices.length})
          </h2>
          {customerInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No invoices</p>
          ) : (
            <div className="space-y-2">
              {customerInvoices.map(i => (
                <Link key={i.id} href={`/dashboard/invoices/${i.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{i.number}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(i.totalMinor)} · Due {formatDate(i.dueDate)}</p>
                  </div>
                  <Badge variant={statusVariant[i.status] || 'muted'} dot>{formatStatus(i.status)}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
