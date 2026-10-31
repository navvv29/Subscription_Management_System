'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Receipt,
  AlertCircle,
  Clock,
  Play,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  FileCheck,
} from 'lucide-react';
import { formatCurrency } from '@/types/common';
import type { DashboardSummary, Invoice, Payment } from '@/types/database';

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<string | null>(null);

  // Quick payment state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.data) {
        setSummary(json.data.summary);
        setRecentInvoices(json.data.recentInvoices || []);
        setRecentPayments(json.data.recentPayments || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleProcessBilling = async () => {
    setProcessing(true);
    setBatchResult(null);
    try {
      const res = await fetch('/api/billing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.data) {
        const { summary } = json.data;
        const msg = `Batch Complete: ${summary.successCount} generated, ${summary.duplicateCount || 0} duplicate guards hit, ${summary.skippedCount} skipped.`;
        setBatchResult(msg);
        fetchDashboardData();
      } else {
        setBatchResult(`Error: ${json.error?.message || 'Billing batch failed'}`);
      }
    } catch {
      setBatchResult('Error connecting to billing engine');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/confirm`, { method: 'POST' });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setRecordingPayment(true);
    setPaymentError(null);

    const amountMinor = Math.round(parseFloat(paymentAmount) * 100);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      setPaymentError('Enter a valid payment amount');
      setRecordingPayment(false);
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          amountMinor,
          method: paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
          note: 'Recorded via Command Center',
        }),
      });
      const json = await res.json();
      if (json.error) {
        setPaymentError(json.error.message);
      } else {
        setSelectedInvoice(null);
        setPaymentAmount('');
        fetchDashboardData();
      }
    } catch {
      setPaymentError('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        Loading Command Center...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner & Batch Trigger */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Subscription & Finance Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time reconciliation of subscriptions, recurring billing runs, invoices, and payments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleProcessBilling}
            disabled={processing}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-indigo-600/30 transition text-sm cursor-pointer"
          >
            {processing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white" />
            )}
            Process Due Invoices
          </button>
        </div>
      </div>

      {/* Batch Notification */}
      {batchResult && (
        <div className="bg-indigo-950/60 border border-indigo-700/60 text-indigo-200 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div>{batchResult}</div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Active Subscriptions
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-3">
            {summary?.activeSubscriptions ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Contractually active</div>
        </div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Collected Revenue
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-3">
            {formatCurrency(summary?.collectedMinor ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Reconciled payments</div>
        </div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Outstanding Invoices
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-3">
            {formatCurrency(summary?.outstandingMinor ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Pending settlement</div>
        </div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Overdue Amount
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-3">
            {formatCurrency(summary?.overdueMinor ?? 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Past payment due date</div>
        </div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            Due For Billing
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-sky-400 mt-3">
            {summary?.dueForBillingCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Ready for automated run</div>
        </div>
      </div>

      {/* Main Grid: Invoices & Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices (2 cols) */}
        <div className="lg:col-span-2 bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Invoices Register</h2>
              <p className="text-xs text-slate-400">Snapshot totals, status transitions & balance</p>
            </div>
            <span className="text-xs bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 rounded">
              {recentInvoices.length} Total
            </span>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No invoices generated yet. Click &quot;Process Due Invoices&quot; to run billing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3">Number</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Total</th>
                    <th className="py-3 px-3">Balance</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono font-medium text-white text-xs">
                        {inv.number}
                      </td>
                      <td className="py-3 px-3 truncate max-w-[140px] text-xs">
                        {inv.customerName}
                      </td>
                      <td className="py-3 px-3 font-semibold text-xs text-white">
                        {formatCurrency(inv.totalMinor)}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono">
                        {inv.balanceMinor === 0 ? (
                          <span className="text-emerald-400">Paid</span>
                        ) : (
                          <span className="text-amber-400">{formatCurrency(inv.balanceMinor)}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            inv.status === 'paid'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : inv.status === 'confirmed'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : inv.status === 'partially_paid'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {inv.status === 'draft' ? (
                          <button
                            onClick={() => handleConfirmInvoice(inv.id)}
                            className="text-xs bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/30 px-2 py-1 rounded"
                          >
                            Confirm
                          </button>
                        ) : inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPaymentAmount((inv.balanceMinor / 100).toString());
                              setPaymentError(null);
                            }}
                            className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30 px-2 py-1 rounded"
                          >
                            Pay
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payments Ledger (1 col) */}
        <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Payment Ledger</h2>
              <p className="text-xs text-slate-400">Reconciled collections</p>
            </div>
            <span className="text-xs bg-slate-900 border border-slate-700 text-slate-400 px-2 py-1 rounded">
              {recentPayments.length}
            </span>
          </div>

          {recentPayments.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No payments recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {formatCurrency(p.amountMinor)}
                    </div>
                    <div className="text-[11px] text-slate-400 uppercase mt-0.5">
                      {p.method.replace('_', ' ')} • {p.paymentDate}
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                    Settled
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-base">
                Record Payment for {selectedInvoice.number}
              </h3>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-1 bg-slate-950 p-3 rounded border border-slate-800">
              <div>Customer: <span className="text-white">{selectedInvoice.customerName}</span></div>
              <div>Invoice Total: <span className="text-white">{formatCurrency(selectedInvoice.totalMinor)}</span></div>
              <div>Remaining Balance: <span className="text-amber-400 font-semibold">{formatCurrency(selectedInvoice.balanceMinor)}</span></div>
            </div>

            {paymentError && (
              <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-2.5 rounded">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Amount (INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedInvoice.balanceMinor / 100}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Overpayment is strictly prevented. Max: ₹{(selectedInvoice.balanceMinor / 100).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 text-sm hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition disabled:opacity-50"
                >
                  {recordingPayment ? 'Recording...' : 'Apply Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

