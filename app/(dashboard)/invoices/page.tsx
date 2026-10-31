'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, invoiceStatusColors } from '@/types/common';
import type { Invoice } from '@/types/database';
import { Printer, Mail } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch('/api/invoices');
      const json = await res.json();
      if (json.data?.data) {
        setInvoices(json.data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: string, action: 'confirm' | 'cancel') => {
    try {
      const res = await fetch(`/api/invoices/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        loadData();
      } else {
        const json = await res.json();
        alert(json.error?.message || 'Action failed');
      }
    } catch {
      alert('Network error');
    }
  };

  const handleSendEmail = async (id: string) => {
    try {
      setSendingId(id);
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        alert(json.data?.message || 'Invoice sent successfully!');
      } else {
        alert(json.error?.message || 'Failed to dispatch email.');
      }
    } catch {
      alert('Network error while dispatching email.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Invoices</h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete register with tax/discount breakdowns, status lifecycle, print preview, and dispatch
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm">No invoices found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Invoice</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Billing Period</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Paid</th>
                  <th className="py-3 px-3">Balance</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-mono font-medium text-white text-xs">{inv.number}</td>
                    <td className="py-3 px-3 text-xs">{inv.customerName}</td>
                    <td className="py-3 px-3 text-xs font-mono text-slate-400">
                      {inv.billingPeriodStart ? `${inv.billingPeriodStart} → ${inv.billingPeriodEnd}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-xs">{inv.dueDate}</td>
                    <td className="py-3 px-3 text-xs font-semibold text-white">{formatCurrency(inv.totalMinor)}</td>
                    <td className="py-3 px-3 text-xs text-emerald-400">{formatCurrency(inv.paidMinor)}</td>
                    <td className="py-3 px-3 text-xs font-mono text-amber-400">{formatCurrency(inv.balanceMinor)}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${invoiceStatusColors[inv.status] || 'bg-slate-800 text-slate-400'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Print View Link */}
                      <Link
                        href={`/invoices/${inv.id}/print`}
                        className="inline-flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded"
                        title="Print / PDF Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </Link>

                      {/* Email Dispatch Button */}
                      <button
                        onClick={() => handleSendEmail(inv.id)}
                        disabled={sendingId === inv.id}
                        className="inline-flex items-center gap-1 text-xs bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 px-2 py-1 rounded disabled:opacity-50"
                        title="Dispatch Invoice Email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{sendingId === inv.id ? 'Sending...' : 'Email'}</span>
                      </button>

                      {inv.status === 'draft' && (
                        <button
                          onClick={() => handleAction(inv.id, 'confirm')}
                          className="text-xs bg-indigo-900/60 hover:bg-indigo-800 text-indigo-300 px-2 py-1 rounded"
                        >
                          Confirm
                        </button>
                      )}
                      {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                        <button
                          onClick={() => handleAction(inv.id, 'cancel')}
                          className="text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded"
                        >
                          Cancel
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
