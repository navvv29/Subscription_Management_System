'use client';

import React, { useState } from 'react';
import {
  PageHeader, Card, Button, SearchFilterRow, Badge, Dialog,
  Input, Select, Textarea, Checkbox, EmptyState, Alert, LoadingState, ErrorState, Pagination,
} from '@/components/ui';
import { useApiResource, useDebouncedValue } from '@/lib/hooks/use-api-resource';
import {
  listProducts, listVariants, createProduct, updateProduct,
  createVariant, updateVariant,
} from '@/lib/api';
import { Product, ProductVariant } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Package, Plus, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

const PAGE_SIZE = 10;

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantProductId, setVariantProductId] = useState<string>('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Product form
  const [fName, setFName] = useState('');
  const [fType, setFType] = useState('');
  const [fSalePrice, setFSalePrice] = useState('');
  const [fCostPrice, setFCostPrice] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fActive, setFActive] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Variant form
  const [vName, setVName] = useState('');
  const [vAdjustment, setVAdjustment] = useState('');
  const [vErrors, setVErrors] = useState<Record<string, string>>({});

  const { data, loading, error, reload } = useApiResource(
    `products:${debouncedSearch}:${activeFilter}:${page}`,
    async () => {
      const [products, variants] = await Promise.all([
        listProducts({
          search: debouncedSearch,
          isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
          page,
          pageSize: PAGE_SIZE,
        }),
        listVariants(),
      ]);
      return { products, variants };
    }
  );

  const products = data?.products.data ?? [];
  const variants = data?.variants ?? [];

  function openCreateProduct() {
    setEditingProduct(null);
    setFName(''); setFType('Software'); setFSalePrice(''); setFCostPrice(''); setFNotes(''); setFActive(true);
    setFormErrors({});
    setDialogOpen(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setFName(product.name);
    setFType(product.type);
    setFSalePrice((product.salePriceMinor / 100).toString());
    setFCostPrice((product.costPriceMinor / 100).toString());
    setFNotes(product.notes || '');
    setFActive(product.isActive);
    setFormErrors({});
    setDialogOpen(true);
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fName.trim()) errors.name = 'Required';
    if (!fType.trim()) errors.type = 'Required';
    if (!fSalePrice || isNaN(Number(fSalePrice)) || Number(fSalePrice) <= 0) errors.salePrice = 'Valid price required';
    if (!fCostPrice || isNaN(Number(fCostPrice)) || Number(fCostPrice) < 0) errors.costPrice = 'Valid cost required';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const input = {
        name: fName.trim(),
        type: fType,
        salePriceMinor: Math.round(Number(fSalePrice) * 100),
        costPriceMinor: Math.round(Number(fCostPrice) * 100),
        notes: fNotes || undefined,
        isActive: fActive,
      };
      if (editingProduct) {
        await updateProduct(editingProduct.id, input);
        setAlert({ type: 'success', message: `Product "${input.name}" updated.` });
      } else {
        await createProduct(input);
        setAlert({ type: 'success', message: `Product "${input.name}" created.` });
      }
      setDialogOpen(false);
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not save product.' });
    } finally {
      setSaving(false);
    }
  }

  function openCreateVariant(productId: string) {
    setEditingVariant(null);
    setVariantProductId(productId);
    setVName(''); setVAdjustment('0');
    setVErrors({});
    setVariantDialogOpen(true);
  }

  function openEditVariant(v: ProductVariant) {
    setEditingVariant(v);
    setVariantProductId(v.productId);
    setVName(v.name);
    setVAdjustment((v.priceAdjustmentMinor / 100).toString());
    setVErrors({});
    setVariantDialogOpen(true);
  }

  async function handleVariantSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!vName.trim()) errors.name = 'Required';
    if (vAdjustment === '' || isNaN(Number(vAdjustment))) errors.adjustment = 'Valid number required';
    setVErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const input = {
        productId: variantProductId,
        name: vName.trim(),
        priceAdjustmentMinor: Math.round(Number(vAdjustment) * 100),
      };
      if (editingVariant) await updateVariant(editingVariant.id, input);
      else await createVariant(input);
      setVariantDialogOpen(false);
      setAlert({ type: 'success', message: `Variant "${input.name}" saved.` });
      await reload();
    } catch (err) {
      setAlert({ type: 'error', message: err instanceof Error ? err.message : 'Could not save variant.' });
    } finally {
      setSaving(false);
    }
  }

  function getProductVariants(productId: string) {
    return variants.filter((v) => v.productId === productId);
  }

  const previewBase = products.find(p => p.id === variantProductId)?.salePriceMinor ?? 0;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage products, pricing and variants."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Products' }]}
        actions={<Button onClick={openCreateProduct}><Plus className="w-4 h-4" /> Add Product</Button>}
      />

      {alert && <div className="mb-4"><Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} /></div>}

      <Card padding="none">
        <div className="p-4 pb-0">
          <SearchFilterRow
            searchValue={search}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            searchPlaceholder="Search products..."
          >
            <Select
              options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value as 'all' | 'active' | 'inactive'); setPage(1); }}
              className="w-32"
            />
          </SearchFilterRow>
        </div>

        {loading && !data ? (
          <div className="p-4"><LoadingState message="Loading products..." rows={5} /></div>
        ) : error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No products found"
            description={search ? 'Try adjusting your search.' : 'Create your first product.'}
            action={!search && <Button onClick={openCreateProduct}><Plus className="w-4 h-4" /> Add Product</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            {error && <div className="px-4"><Alert type="error" message={error} onClose={() => reload()} /></div>}
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="w-8"></th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Sale Price</th>
                  <th>Cost Price</th>
                  <th>Status</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const pVariants = getProductVariants(product.id);
                  const isExpanded = expandedProduct === product.id;
                  return (
                    <React.Fragment key={product.id}>
                      <tr>
                        <td>
                          {pVariants.length > 0 && (
                            <button onClick={() => setExpandedProduct(isExpanded ? null : product.id)} className="p-1 hover:bg-accent rounded">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                        <td className="font-medium text-foreground">{product.name}</td>
                        <td><Badge variant="outline">{product.type}</Badge></td>
                        <td className="font-medium">{formatCurrency(product.salePriceMinor)}</td>
                        <td className="text-muted-foreground">{formatCurrency(product.costPriceMinor)}</td>
                        <td>
                          <Badge variant={product.isActive ? 'success' : 'muted'} dot>
                            {product.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditProduct(product)} title="Edit product"><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openCreateVariant(product.id)} title="Add variant"><Plus className="w-4 h-4 text-primary" /></Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && pVariants.map((v) => {
                        const finalPrice = product.salePriceMinor + v.priceAdjustmentMinor;
                        return (
                          <tr key={v.id} className="bg-[var(--slate-50)]">
                            <td></td>
                            <td className="pl-8 text-sm">
                              <span className="text-muted-foreground">↳</span> {v.name}
                            </td>
                            <td colSpan={2}>
                              <span className="text-sm">
                                Adjustment: <span className={v.priceAdjustmentMinor >= 0 ? 'text-[var(--success-600)]' : 'text-[var(--danger-600)]'}>
                                  {v.priceAdjustmentMinor >= 0 ? '+' : ''}{formatCurrency(v.priceAdjustmentMinor)}
                                </span>
                              </span>
                            </td>
                            <td>
                              <span className="text-sm font-medium">
                                Final: {formatCurrency(finalPrice)}
                              </span>
                            </td>
                            <td></td>
                            <td>
                              <Button variant="ghost" size="icon" onClick={() => openEditVariant(v)}><Pencil className="w-3.5 h-3.5" /></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={data?.products.page ?? 1}
            totalPages={data?.products.totalPages ?? 1}
            onPageChange={setPage}
            totalItems={data?.products.total ?? 0}
            pageSize={PAGE_SIZE}
          />
        </div>
      </Card>

      {/* Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editingProduct ? 'Edit Product' : 'New Product'} size="md">
        <form noValidate onSubmit={handleProductSubmit} className="space-y-4">
          <Input label="Product Name" required value={fName} onChange={(e) => setFName(e.target.value)} error={formErrors.name} placeholder="e.g., Enterprise SaaS Platform" />
          <Select label="Type" required options={[{ value: 'Software', label: 'Software' }, { value: 'Service', label: 'Service' }, { value: 'Hardware', label: 'Hardware' }]} value={fType} onChange={(e) => setFType(e.target.value)} error={formErrors.type} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sale Price (₹)" required type="number" step="0.01" min="0" value={fSalePrice} onChange={(e) => setFSalePrice(e.target.value)} error={formErrors.salePrice} />
            <Input label="Cost Price (₹)" required type="number" step="0.01" min="0" value={fCostPrice} onChange={(e) => setFCostPrice(e.target.value)} error={formErrors.costPrice} />
          </div>
          <Textarea label="Notes" value={fNotes} onChange={(e) => setFNotes(e.target.value)} placeholder="Optional product notes..." />
          <Checkbox label="Active" checked={fActive} onChange={(e) => setFActive(e.target.checked)} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingProduct ? 'Update' : 'Create'} Product</Button>
          </div>
        </form>
      </Dialog>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onClose={() => setVariantDialogOpen(false)} title={editingVariant ? 'Edit Variant' : 'New Variant'} size="sm">
        <form noValidate onSubmit={handleVariantSubmit} className="space-y-4">
          <Input label="Variant Name" required value={vName} onChange={(e) => setVName(e.target.value)} error={vErrors.name} placeholder="e.g., Starter (10 users)" />
          <Input label="Price Adjustment (₹)" required type="number" step="0.01" value={vAdjustment} onChange={(e) => setVAdjustment(e.target.value)} error={vErrors.adjustment} hint="Positive to increase, negative to decrease base sale price." />
          {variantProductId && (
            <div className="p-3 rounded-lg bg-accent text-sm">
              <p className="font-medium text-accent-foreground">Price Preview</p>
              <p className="text-muted-foreground mt-1">
                Base: {formatCurrency(previewBase)} →
                Final: <span className="font-semibold text-foreground">
                  {formatCurrency(previewBase + Math.round(Number(vAdjustment || 0) * 100))}
                </span>
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setVariantDialogOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingVariant ? 'Update' : 'Create'} Variant</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
