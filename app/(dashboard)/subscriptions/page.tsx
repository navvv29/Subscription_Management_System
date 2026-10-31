'use client';

import React, { useEffect, useState } from 'react';
import { subscriptionStatusColors } from '@/types/common';
import { formatCurrency } from '@/types/common';
import type { Subscription } from '@/types/database';

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await fetch('/api/subscriptions');
      const json = await res.json();
      if (json.data?.data) {
        setSubscriptions(json.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransition = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Transition failed');
      }
    } catch {
      alert('Network error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Subscriptions Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Guarded lifecycle state machine: Draft → Quotation → Confirmed → Active → Closed / Paused
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading subscriptions...</div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No subscriptions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Subscription</th>
                  <th className="py-3 px-3">Start Date</th>
                  <th className="py-3 px-3">Next Billing</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">State Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-medium text-white text-xs">{s.number}</td>
                    <td className="py-3 px-3 text-xs">{s.startDate}</td>
                    <td className="py-3 px-3 text-xs font-mono text-sky-400">{s.nextBillingDate}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-white">
                      {formatCurrency(s.totalMinor)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${subscriptionStatusColors[s.status] || 'bg-slate-800 text-slate-400'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      {s.status === 'draft' && (
                        <button
                          onClick={() => handleTransition(s.id, 'submit_quotation')}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded"
                        >
                          To Quotation
                        </button>
                      )}
                      {s.status === 'quotation' && (
                        <button
                          onClick={() => handleTransition(s.id, 'confirm')}
                          className="text-xs bg-indigo-900 hover:bg-indigo-800 text-indigo-200 px-2 py-1 rounded"
                        >
                          Confirm
                        </button>
                      )}
                      {s.status === 'confirmed' && (
                        <button
                          onClick={() => handleTransition(s.id, 'activate')}
                          className="text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-200 px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {s.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleTransition(s.id, 'pause')}
                            className="text-xs bg-amber-900/60 hover:bg-amber-800/60 text-amber-200 px-2 py-1 rounded"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => handleTransition(s.id, 'close')}
                            className="text-xs bg-rose-900/60 hover:bg-rose-800/60 text-rose-200 px-2 py-1 rounded"
                          >
                            Close
                          </button>
                        </>
                      )}
                      {s.status === 'paused' && (
                        <button
                          onClick={() => handleTransition(s.id, 'resume')}
                          className="text-xs bg-emerald-900 hover:bg-emerald-800 text-emerald-200 px-2 py-1 rounded"
                        >
                          Resume
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

