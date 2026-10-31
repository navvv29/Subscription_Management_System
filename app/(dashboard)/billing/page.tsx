'use client';

import React, { useState } from 'react';
import { Play, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function BillingCenterPage() {
  const [asOfDate, setAsOfDate] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  React.useEffect(() => {
    setAsOfDate(new Date().toISOString().split('T')[0]);
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
          Server-side automated billing engine with strict idempotency and duplicate-run protection
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
              Duplicate Billing Guard
            </div>
            <p>
              Constraint <code className="text-indigo-300 font-mono text-[10px]">(subscription_id, period_start, period_end)</code> guarantees no customer is billed twice for the same interval.
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
          <h2 className="text-sm font-semibold text-white mb-3">Batch Execution Results</h2>
          {!result ? (
            <div className="text-center py-16 text-xs text-slate-500">
              Run a batch to view processed items, generated invoices, and duplicate prevention logs.
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold text-sm">{result.message}</div>
                  <div className="text-slate-400 mt-1">As-of Date: {result.asOfDate}</div>
                </div>
                {result.summary && (
                  <div className="flex gap-3 text-right">
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
                  </div>
                )}
              </div>

              {result.results && result.results.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/60 uppercase text-slate-400 border-b border-slate-800">
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
    </div>
  );
}
