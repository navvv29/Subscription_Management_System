'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/types/common';
import type { Payment } from '@/types/database';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments')
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.data) {
          setPayments(json.data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Payment Ledger</h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable audit trail of customer collections reconciling against issued invoices
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No payment records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Invoice ID</th>
                  <th className="py-3 px-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 text-xs">{p.paymentDate}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-emerald-400">
                      {formatCurrency(p.amountMinor)}
                    </td>
                    <td className="py-3 px-3 text-xs uppercase text-slate-400">
                      {p.method.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-400">{p.invoiceId.slice(0, 12)}...</td>
                    <td className="py-3 px-3 text-xs text-slate-400">{p.note || '—'}</td>
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

