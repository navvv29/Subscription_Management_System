'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PageHeader, Card, Button, SearchFilterRow, Badge, Dialog,
  Input, Select, EmptyState, Alert, Tabs, LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import {
  listQuotations, createQuotation, listProducts, listPlans, listCustomers,
} from '@/lib/api';
import type { QuotationLineInput } from '@/lib/api';
import { ApiRequestError } from '@/lib/api/client';
import { QuotationStatus, Product, Plan, Customer } from '@/types';
import { formatCurrency, formatDate, isExpired, formatStatus } from '@/lib/utils';
import { FileText, Plus, Eye, Send, CheckCircle2, XCircle, AlertTriangle, ArrowRightCircle } from 'lucide-react';

const PAGE_SIZE = 10;

const statusConfig: Record<QuotationStatus, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'; icon: React.ReactNode }> = {
  draft: { variant: 'muted', icon: null },
  sent: { variant: 'info', icon: <Send className="w-3 h-3" /> },
  accepted: { variant: 'success', icon: <CheckCircle2 className="w-3 h-3" /> },
  rejected: { variant: 'danger', icon: <XCircle className="w-3 h-3" /> },
  expired: { variant: 'warning', icon: <AlertTriangle className="w-3 h-3" /> },
  converted: { variant: 'default', icon: <ArrowRightCircle className="w-3 h-3" /> },
};

const statusTabs = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'expired', label: 'Expired' },
];

interface LineDraft {
  productId: string;
  planId: string;
  quantity: string;
  unitPrice: string;
}

const emptyLine: LineDraft = { productId: '', planId: '', quantity: '1', unitPrice: '' };

export default function QuotationsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lookups for the create form
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Form state
  const [fCustomerId, setFCustomerId] = useState('');
  const [fValidUntil, setFValidUntil] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fItems, setFItems] = useState<LineDraft[]>([{ ...emptyLine }]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useApiResource(
    `quotations:${debouncedSearch}:${statusFilter}:${page}`,
    () => listQuotations({
      search: debouncedSearch,
      status: statusFilter as QuotationStatus | 'all',
      page,
      pageSize: PAGE_SIZE,
    })
  );

  const quotations = data?.data ?? [];

  async function openCreate() {
    setFCustomerId(''); setFValidUntil(''); setFNotes('');
    setFItems([{ ...emptyLine }]);
    setFormErrors({});
    setAlert(null);
    setDialogOpen(true);
    try {
      const [customerList, productList, planList] = await Promise.all([
        listCustomers({ pageSize: 200 }),
        listProducts({ pageSize: 200 }),
        listPlans(),
      ]);
      setCustomers(customerList.data);
      setProducts(productList.data.filter((p) => p.isActive));
      setPlans(planList);
    } catch (err) {
      setDialogOpen(false);
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not load form data.' });
    }
  }

  function addItem() {
    setFItems(prev => [...prev, { ...emptyLine }]);
  }

  function removeItem(idx: number) {
    setFItems(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof LineDraft, value: string) {
    setFItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fCustomerId) errors.customer = 'Required';
    if (!fValidUntil) errors.validUntil = 'Required';
    else if (fValidUntil < new Date().toISOString().slice(0, 10)) errors.validUntil = 'Must be today or later';
    if (fItems.length === 0 || fItems.some(i => !i.productId || !i.unitPrice)) errors.items = 'All line items must have a product and price';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    const items: QuotationLineInput[] = fItems.map((item) => ({
      productId: item.productId,
      planId: item.planId || undefined,
      quantity: Math.max(1, Number(item.quantity) || 1),
      unitPriceMinor: Math.round(Number(item.unitPrice) * 100),
    }));

    setSaving(true);
    try {
      const created = await createQuotation({
        customerId: fCustomerId,
        validUntil: fValidUntil,
        notes: fNotes || undefined,
        items,
      });
      setAlert({ type: 'success', message: `Quotation ${created.number} created.` });
      setDialogOpen(false);
      setPage(1);
      await reload();
    } catch (err) {
      if (err instanceof ApiRequestError && err.field) {
        setFormErrors({ [err.field]: err.message });
      } else {
        setDialogOpen(false);
        setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not create quotation.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Create and manage customer quotations."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Quotations' }]}
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Quotation</Button>}
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      <Card padding="none">
        <div className="px-4 pt-4">
          <Tabs tabs={statusTabs} activeTab={statusFilter} onTabChange={(id) => { setStatusFilter(id); setPage(1); }} />
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search quotations..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading quotations..." rows={5} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : quotations.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No quotations found"
            description={search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first quotation.'}
            action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Quotation</Button>}
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
                  <th>Valid Until</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const expired = isExpired(q.validUntil) && q.status !== 'converted' && q.status !== 'accepted';
                  const cfg = statusConfig[q.status];
                  return (
                    <tr key={q.id}>
                      <td>
                        <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">
                          {q.number}
                        </Link>
                      </td>
                      <td>{q.customerName}</td>
                      <td>
                        <Badge variant={expired ? 'warning' : cfg.variant} dot>
                          {cfg.icon} {expired ? 'Expired' : formatStatus(q.status)}
                        </Badge>
                      </td>
                      <td>
                        <span className={expired ? 'text-[var(--danger-600)] font-medium' : ''}>
                          {formatDate(q.validUntil)}
                          {expired && q.status === 'sent' && (
                            <span className="ml-1.5 text-xs">(Expired)</span>
                          )}
                        </span>
                      </td>
                      <td>{q.items.length} item{q.items.length !== 1 ? 's' : ''}</td>
                      <td className="font-semibold">{formatCurrency(q.totalMinor)}</td>
                      <td>
                        <Link href={`/quotations/${q.id}`} title="View details">
                          <Button variant="ghost" size="icon" tabIndex={-1}><Eye className="w-4 h-4" /></Button>
                        </Link>
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="New Quotation" size="lg">
        <form noValidate onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Customer" required options={customers.map(c => ({ value: c.id, label: c.name }))} value={fCustomerId} onChange={(e) => setFCustomerId(e.target.value)} placeholder="Select customer..." error={formErrors.customer} />
            <Input label="Valid Until" required type="date" min={new Date().toISOString().slice(0, 10)} value={fValidUntil} onChange={(e) => setFValidUntil(e.target.value)} error={formErrors.validUntil} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[var(--slate-700)]">Line Items *</label>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}><Plus className="w-3.5 h-3.5" /> Add Item</Button>
            </div>
            {formErrors.items && <p className="text-xs text-destructive mb-2">{formErrors.items}</p>}
            <div className="space-y-3">
              {fItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <Select placeholder="Product..." options={products.map(p => ({ value: p.id, label: p.name }))} value={item.productId}
                      onChange={(e) => {
                        updateItem(idx, 'productId', e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) updateItem(idx, 'unitPrice', (prod.salePriceMinor / 100).toString());
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Select placeholder="Plan (optional)" options={plans.map(p => ({ value: p.id, label: p.name }))} value={item.planId} onChange={(e) => updateItem(idx, 'planId', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" step="0.01" min="0" placeholder="Price ₹" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                  </div>
                  <div className="sm:col-span-1">
                    {fItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} title="Remove line">
                        <XCircle className="w-4 h-4 text-[var(--danger-500)]" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Input label="Notes" value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Optional notes..." />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Quotation</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
