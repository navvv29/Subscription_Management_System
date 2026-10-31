'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/types/common';
import type { Product, Plan } from '@/types/database';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/products').then((r) => r.json()), fetch('/api/plans').then((r) => r.json())])
      .then(([prodJson, planJson]) => {
        if (prodJson.data) setProducts(prodJson.data);
        if (planJson.data) setPlans(planJson.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Catalogue: Products & Plans</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configured offerings, billing intervals, sale/cost price minor units, and policy flags
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products */}
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h2 className="text-sm font-semibold text-white mb-4">Products Catalogue</h2>
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading products...</div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{p.notes || p.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-indigo-400">{formatCurrency(p.salePriceMinor)}</div>
                    <div className="text-[10px] text-slate-500">Cost: {formatCurrency(p.costPriceMinor)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h2 className="text-sm font-semibold text-white mb-4">Billing Plans</h2>
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">Loading plans...</div>
          ) : (
            <div className="space-y-3">
              {plans.map((pl) => (
                <div key={pl.id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-white">{pl.name}</div>
                    <div className="text-[11px] text-slate-400 uppercase mt-0.5 font-mono">
                      Interval: {pl.interval} • Min Qty: {pl.minimumQuantity}
                    </div>
                  </div>
                  <div className="flex gap-1.5 text-[10px]">
                    <span className={`px-2 py-0.5 rounded border ${pl.allowPause ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      Pause {pl.allowPause ? '✓' : '✗'}
                    </span>
                    <span className={`px-2 py-0.5 rounded border ${pl.allowEarlyClose ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      Early Close {pl.allowEarlyClose ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

