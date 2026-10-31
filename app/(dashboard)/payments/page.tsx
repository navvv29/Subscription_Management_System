'use client';

import React, { useEffect, useState } from 'react';
import { formatCurrency } from '@/types/common';
import type { Payment } from '@/types/database';
import { RotateCcw, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Refund modal state
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payments');
      const json = await res.json();
      const list = Array.isArray(json.data) ? json.data : json.data?.data || [];
      setPayments(list);
    } catch {
      console.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleOpenRefund = (payment: Payment) => {
    setRefundTarget(payment);
    setRefundAmount((payment.amountMinor / 100).toFixed(2));
    setRefundReason('Customer billing adjustment / credit note');
    setRefundError(null);
  };

  const handleExecuteRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundTarget) return;

    setProcessingRefund(true);
    setRefundError(null);

    const amountMinor = Math.round(parseFloat(refundAmount) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setRefundError('Enter a valid refund amount in Rupees');
      setProcessingRefund(false);
      return;
    }

    try {
      const res = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: refundTarget.invoiceId,
          paymentId: refundTarget.id,
          refundAmountMinor: amountMinor,
          refundReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        setRefundError(json.error?.message || 'Refund failed');
      } else {
        setRefundTarget(null);
        loadPayments();
      }
    } catch {
      setRefundError('Network error while processing refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Payment Ledger</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit trail of collections and reversals reconciling against customer invoices
          </p>
        </div>
        <button
          onClick={loadPayments}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition cursor-pointer"
        >
          Refresh Ledger
        </button>
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
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Invoice ID</th>
                  <th className="py-3 px-3">Reference / Note</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 text-xs font-mono">{p.paymentDate}</td>
                    <td className="py-3 px-3 text-xs">
                      {p.isRefund ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-full">
                          <ArrowUpRight className="w-3 h-3" /> Refund
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                          <ArrowDownRight className="w-3 h-3" /> Payment
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-3 px-3 text-xs font-bold font-mono ${
                        p.isRefund ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {p.isRefund ? `-${formatCurrency(p.amountMinor)}` : formatCurrency(p.amountMinor)}
                    </td>
                    <td className="py-3 px-3 text-xs uppercase text-slate-400">
                      {p.method.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-indigo-400">{p.invoiceId.slice(0, 8)}...</td>
                    <td className="py-3 px-3 text-xs text-slate-400">{p.refundReason || p.note || '—'}</td>
                    <td className="py-3 px-3 text-xs text-slate-500">{p.recordedBy}</td>
                    <td className="py-3 px-3 text-right">
                      {!p.isRefund && (
                        <button
                          onClick={() => handleOpenRefund(p)}
                          className="inline-flex items-center gap-1 text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 px-2 py-1 rounded cursor-pointer"
                          title="Issue Refund / Reversal"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Refund</span>
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

      {/* Refund Modal */}
      {refundTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Process Refund / Reversal</h3>
            <p className="text-xs text-slate-400 mb-4">
              Refund against payment for invoice <span className="font-mono text-indigo-400">{refundTarget.invoiceId.slice(0, 12)}...</span>.
              Maximum refundable: <strong className="text-white">{formatCurrency(refundTarget.amountMinor)}</strong>.
            </p>

            <form onSubmit={handleExecuteRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Refund Amount (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Service downgrade adjustment"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              {refundError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                  {refundError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundTarget(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg disabled:opacity-50 transition cursor-pointer"
                >
                  {processingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
