'use client';

import React, { useEffect, useState } from 'react';
import type { Customer } from '@/types/database';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCustomers(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Customer Directory</h1>
        <p className="text-xs text-slate-400 mt-1">
          Registered business accounts with contact details and data isolation
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-xl border border-slate-800">
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-sm">Loading customers...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-medium text-white text-xs">{c.name}</td>
                    <td className="py-3 px-3 text-xs text-indigo-400">{c.email}</td>
                    <td className="py-3 px-3 text-xs">{c.company || '—'}</td>
                    <td className="py-3 px-3 text-xs text-slate-400">{c.phone || '—'}</td>
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

