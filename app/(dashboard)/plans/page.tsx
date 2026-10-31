'use client';

import React, { useState } from 'react';
import {
  PageHeader, Card, Button, SearchFilterRow, Badge, Dialog,
  Input, Select, Checkbox, EmptyState, Alert, LoadingState, ErrorState,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listPlans, createPlan, updatePlan, deletePlan } from '@/lib/api';
import { Plan, PlanInterval } from '@/types';
import { formatStatus } from '@/lib/utils';
import { ClipboardList, Plus, Pencil, Trash2, Calendar, Repeat, Pause, XCircle } from 'lucide-react';

const intervalOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const intervalBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  daily: 'warning',
  weekly: 'info',
  monthly: 'default',
  yearly: 'success',
};

export default function PlansPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [intervalFilter, setIntervalFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [fName, setFName] = useState('');
  const [fInterval, setFInterval] = useState<PlanInterval>('monthly');
  const [fMinQty, setFMinQty] = useState('1');
  const [fFrom, setFFrom] = useState('');
  const [fUntil, setFUntil] = useState('');
  const [fPause, setFPause] = useState(true);
  const [fEarlyClose, setFEarlyClose] = useState(false);
  const [fRenewal, setFRenewal] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data: plans, loading, error, reload } = useApiResource(
    `plans:${debouncedSearch}:${intervalFilter}`,
    () => listPlans({ search: debouncedSearch, interval: intervalFilter as PlanInterval | 'all' })
  );

  const rows = plans ?? [];

  function openCreate() {
    setEditingPlan(null);
    setFName(''); setFInterval('monthly'); setFMinQty('1'); setFFrom(''); setFUntil('');
    setFPause(true); setFEarlyClose(false); setFRenewal(true); setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setFName(plan.name); setFInterval(plan.interval); setFMinQty(plan.minimumQuantity.toString());
    setFFrom(plan.availableFrom || ''); setFUntil(plan.availableUntil || '');
    setFPause(plan.allowPause); setFEarlyClose(plan.allowEarlyClose); setFRenewal(plan.allowRenewal);
    setFormErrors({});
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fName.trim()) errors.name = 'Required';
    if (!fMinQty || isNaN(Number(fMinQty)) || Number(fMinQty) < 1) errors.minQty = 'Must be at least 1';
    if (fFrom && fUntil && fUntil < fFrom) errors.until = 'Available until must be on or after available from';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const planData = {
        name: fName.trim(),
        interval: fInterval,
        minimumQuantity: Number(fMinQty),
        availableFrom: fFrom || undefined,
        availableUntil: fUntil || undefined,
        allowPause: fPause,
        allowEarlyClose: fEarlyClose,
        allowRenewal: fRenewal,
      };
      if (editingPlan) {
        await updatePlan(editingPlan.id, planData);
        setAlert({ type: 'success', message: `Plan "${planData.name}" updated.` });
      } else {
        await createPlan(planData);
        setAlert({ type: 'success', message: `Plan "${planData.name}" created.` });
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not save plan.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: Plan) {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    setDeletingId(plan.id);
    try {
      await deletePlan(plan.id);
      setAlert({ type: 'success', message: `Plan "${plan.name}" deleted.` });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not delete plan.' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Plans"
        description="Configure subscription plans with billing intervals and policies."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Plans' }]}
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Plan</Button>}
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search plans...">
            <Select
              options={[{ value: 'all', label: 'All Intervals' }, ...intervalOptions]}
              value={intervalFilter}
              onChange={(e) => setIntervalFilter(e.target.value)}
              className="w-36"
            />
          </SearchFilterRow>
        </div>

        {loading && !plans ? (
          <div className="p-4"><LoadingState message="Loading plans..." rows={4} /></div>
        ) : error && !plans ? (
          <ErrorState message={error} onRetry={reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="w-12 h-12" />}
            title="No plans found"
            description={search ? 'Try adjusting your search.' : undefined}
            action={<Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Plan</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {error && <div className="col-span-full"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            {rows.map((plan) => (
              <div key={plan.id} className="border border-border rounded-xl p-5 hover:shadow-md transition-shadow bg-card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <Badge variant={intervalBadgeVariant[plan.interval]} className="mt-1">{formatStatus(plan.interval)}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(plan)} title="Edit plan"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan)} loading={deletingId === plan.id} title="Delete plan"><Trash2 className="w-4 h-4 text-[var(--danger-500)]" /></Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Min. quantity: {plan.minimumQuantity}</span>
                  </div>
                  {plan.availableFrom && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>From: {plan.availableFrom}{plan.availableUntil ? ` – ${plan.availableUntil}` : ''}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                  <Badge variant={plan.allowPause ? 'success' : 'muted'} dot>
                    <Pause className="w-3 h-3" /> Pause
                  </Badge>
                  <Badge variant={plan.allowEarlyClose ? 'success' : 'muted'} dot>
                    <XCircle className="w-3 h-3" /> Early Close
                  </Badge>
                  <Badge variant={plan.allowRenewal ? 'success' : 'muted'} dot>
                    <Repeat className="w-3 h-3" /> Renewal
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Plan Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingPlan ? 'Edit Plan' : 'New Plan'} size="md">
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Input label="Plan Name" required value={fName} onChange={(e) => setFName(e.target.value)} error={formErrors.name} placeholder="e.g., Monthly Starter" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Billing Interval" required options={intervalOptions} value={fInterval} onChange={(e) => setFInterval(e.target.value as PlanInterval)} />
            <Input label="Minimum Quantity" required type="number" min="1" value={fMinQty} onChange={(e) => setFMinQty(e.target.value)} error={formErrors.minQty} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Available From" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
            <Input label="Available Until" type="date" value={fUntil} onChange={(e) => setFUntil(e.target.value)} error={formErrors.until} />
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-[var(--slate-700)]">Policy Flags</p>
            <Checkbox label="Allow Pause" checked={fPause} onChange={(e) => setFPause(e.target.checked)} />
            <Checkbox label="Allow Early Close" checked={fEarlyClose} onChange={(e) => setFEarlyClose(e.target.checked)} />
            <Checkbox label="Allow Renewal" checked={fRenewal} onChange={(e) => setFRenewal(e.target.checked)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingPlan ? 'Update' : 'Create'} Plan</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
