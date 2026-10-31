'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PageHeader, Card, Button, SearchFilterRow,
  Dialog, Input, EmptyState, Pagination, Alert, LoadingState, ErrorState,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/lib/api';
import { ApiRequestError } from '@/lib/api/client';
import { Customer } from '@/types';
import { formatDate } from '@/lib/utils';
import { Users, Plus, Mail, Phone, Building2, Pencil, Trash2 } from 'lucide-react';

const PAGE_SIZE = 10;

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useApiResource(
    `customers:${debouncedSearch}:${page}`,
    () => listCustomers({ search: debouncedSearch, page, pageSize: PAGE_SIZE })
  );

  const customers = data?.data ?? [];

  function openCreate() {
    setEditingCustomer(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompany('');
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormEmail(customer.email);
    setFormPhone(customer.phone || '');
    setFormCompany(customer.company || '');
    setFormErrors({});
    setDialogOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Name is required';
    if (!formEmail.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) errors.email = 'Invalid email format';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingCustomer) {
        const updated = await updateCustomer(editingCustomer.id, {
          name: formName,
          email: formEmail,
          phone: formPhone || undefined,
          company: formCompany || undefined,
        });
        setAlert({ type: 'success', message: `Customer "${updated.name}" updated successfully.` });
      } else {
        const created = await createCustomer({
          name: formName,
          email: formEmail,
          phone: formPhone || undefined,
          company: formCompany || undefined,
        });
        setAlert({ type: 'success', message: `Customer "${created.name}" created successfully.` });
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      if (err instanceof ApiRequestError && err.field) {
        setFormErrors({ [err.field]: err.message });
      } else {
        setDialogOpen(false);
        setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not save customer.' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Are you sure you want to delete "${customer.name}"?`)) return;
    setDeletingId(customer.id);
    try {
      await deleteCustomer(customer.id);
      setAlert({ type: 'success', message: `Customer "${customer.name}" deleted.` });
      if (customers.length === 1 && page > 1) setPage(page - 1);
      else await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not delete customer.' });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage your customer accounts and contact information."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Customers' }]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        }
      />

      {alert && (
        <div className="mb-4">
          <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
        </div>
      )}

      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search by name, email or company..."
          />
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading customers..." rows={5} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title="No customers found"
            description={search ? 'Try adjusting your search terms.' : 'Get started by adding your first customer.'}
            action={!search && <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Customer</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            {error && <div className="px-4"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Company</th>
                  <th>Created</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <Link
                        href={`/customers/${customer.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {customer.name}
                      </Link>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        {customer.email}
                      </span>
                    </td>
                    <td>
                      {customer.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {customer.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td>
                      {customer.company ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          {customer.company}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td>{customer.createdAt ? formatDate(customer.createdAt) : '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(customer)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer)}
                          loading={deletingId === customer.id}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--danger-500)]" />
                        </Button>
                      </div>
                    </td>
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'New Customer'}
        description={editingCustomer ? 'Update customer information.' : 'Add a new customer to your account.'}
      >
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            required
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            error={formErrors.name}
            placeholder="e.g., Rajesh Kumar"
          />
          <Input
            label="Email"
            type="email"
            required
            value={formEmail}
            onChange={(e) => setFormEmail(e.target.value)}
            error={formErrors.email}
            placeholder="e.g., rajesh@company.com"
          />
          <Input
            label="Phone"
            value={formPhone}
            onChange={(e) => setFormPhone(e.target.value)}
            placeholder="e.g., +91 98765 43210"
          />
          <Input
            label="Company"
            value={formCompany}
            onChange={(e) => setFormCompany(e.target.value)}
            placeholder="e.g., TechCorp Solutions"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editingCustomer ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
