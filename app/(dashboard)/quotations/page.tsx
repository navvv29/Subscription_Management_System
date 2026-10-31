'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency, quotationStatusColors } from '@/types/common';
import type { Quotation } from '@/types/database';

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/quotations');
      const json = await res.json();
      if (json.data) {
        setQuotations(json.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConvert = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert('Quotation successfully converted to active subscription! Agreed line prices preserved.');
        loadData();
      } else {
        alert(json.error?.message || 'Conversion failed');
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Quotations</h1>
        <p className="text-xs text-slate-400 mt-1">
          Validity period enforcement and conversion to subscriptions with preserved prices
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No quotations created yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Quotation</th>
                  <th className="py-3 px-3">Customer ID</th>
                  <th className="py-3 px-3">Valid Until</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-medium text-white text-xs">{q.number}</td>
                    <td className="py-3 px-3 text-xs text-slate-400">{q.customerId}</td>
                    <td className="py-3 px-3 text-xs">{q.validUntil}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-white">{formatCurrency(q.totalMinor)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${quotationStatusColors[q.status] || 'bg-slate-800 text-slate-400'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {q.status !== 'expired' && q.status !== 'rejected' && (
                        <button
                          onClick={() => handleConvert(q.id)}
                          className="text-xs bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 hover:bg-indigo-600/50 px-2.5 py-1 rounded"
                        >
                          Convert to Subscription
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
