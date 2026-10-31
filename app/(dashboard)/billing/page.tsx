'use client';

import React, { useState, useEffect } from 'react';
import { Play, ShieldCheck, History, CheckCircle2, XCircle } from 'lucide-react';
import { formatCurrency } from '@/types/common';
import type { BillingRun } from '@/types/database';

export default function BillingCenterPage() {
  const [asOfDate, setAsOfDate] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<BillingRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await fetch('/api/billing/runs');
      const json = await res.json();
      if (json.data) {
        setHistory(json.data);
      }
    } catch {
      console.error('Failed to load billing history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    setAsOfDate(new Date().toISOString().split('T')[0]);
    fetchHistory();
  }, []);

  const handleRunBatch = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch('/api/billing/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asOfDate }),
      });
      const json = await res.json();
      setResult(json.data || json.error);
      fetchHistory(); // refresh history
    } catch {
      setResult({ message: 'Failed to contact billing process endpoint' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Billing Center & Operations</h1>
        <p className="text-xs text-slate-400 mt-1">
          Server-side automated billing engine with concurrency mutex locking, formal BillingRuns, and idempotency guards
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-sm font-semibold text-white">Trigger Billing Run</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Target Billing Date (As-of Date)</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Concurrency & Idempotency
            </div>
            <p>
              Protected by distributed concurrency lease lock and unique composite constraint{' '}
              <code className="text-indigo-300 font-mono text-[10px]">(subscription_id, period_start, period_end)</code>.
            </p>
          </div>

          <button
            onClick={handleRunBatch}
            disabled={running}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            {running ? 'Processing Invoices...' : 'Execute Billing Batch'}
          </button>
        </div>

        <div className="md:col-span-2 bg-slate-950 p-6 rounded-xl border border-slate-800">
          <h2 className="text-sm font-semibold text-white mb-3">Live Batch Output</h2>
          {!result ? (
            <div className="text-center py-16 text-xs text-slate-500">
              Run a batch to view processed items, generated invoices, and duplicate prevention logs.
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold text-sm">{result.message}</div>
                  <div className="text-slate-400 mt-1">
                    {result.billingRunId && <span className="font-mono text-indigo-400 mr-2">ID: {result.billingRunId}</span>}
                    <span>As-of Date: {result.asOfDate}</span>
                  </div>
                </div>
                {result.summary && (
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="text-slate-500">Success</div>
                      <div className="text-emerald-400 font-bold text-sm">{result.summary.successCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Duplicates Guarded</div>
                      <div className="text-amber-400 font-bold text-sm">{result.summary.duplicateCount || 0}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Skipped</div>
                      <div className="text-slate-400 font-bold text-sm">{result.summary.skippedCount}</div>
                    </div>
                    {result.summary.totalBilledMinor !== undefined && (
                      <div>
                        <div className="text-slate-500">Billed Total</div>
                        <div className="text-white font-bold text-sm font-mono">
                          {formatCurrency(result.summary.totalBilledMinor)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {result.results && result.results.length > 0 && (
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 uppercase text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Subscription</th>
                        <th className="py-2.5 px-3">Invoice Number</th>
                        <th className="py-2.5 px-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {result.results.map((r: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-mono text-white">{r.subscriptionId}</td>
                          <td className="py-2.5 px-3 font-mono text-indigo-400">{r.invoiceNumber || '—'}</td>
                          <td className="py-2.5 px-3">
                            {r.isDuplicate ? (
                              <span className="text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
                                Duplicate Prevented
                              </span>
                            ) : r.success ? (
                              <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                                Generated
                              </span>
                            ) : (
                              <span className="text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                                {r.error}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historical Billing Runs Section */}
      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Execution Audit History (Billing Runs)</h2>
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition"
          >
            Refresh Logs
          </button>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8 text-xs text-slate-500">Loading historical runs...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">No historical billing runs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Target Date</th>
                  <th className="py-2.5 px-3">Started At</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Success</th>
                  <th className="py-2.5 px-3">Duplicates</th>
                  <th className="py-2.5 px-3">Skipped</th>
                  <th className="py-2.5 px-3">Total Billed</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 font-mono text-indigo-400 font-semibold">{run.id}</td>
                    <td className="py-2.5 px-3">{run.asOfDate || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{run.startedAt.replace('T', ' ').slice(0, 19)}</td>
                    <td className="py-2.5 px-3 font-mono">{run.durationMs ? `${run.durationMs}ms` : '—'}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{run.successCount}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">{run.duplicateCount}</td>
                    <td className="py-2.5 px-3 text-slate-400">{run.skippedCount}</td>
                    <td className="py-2.5 px-3 font-mono text-white">
                      {formatCurrency(run.totalBilledMinor || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          run.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                            : run.status === 'running'
                            ? 'bg-blue-950/60 text-blue-400 border border-blue-800'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {run.status === 'completed' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        )}
                        {run.status}
                      </span>
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
