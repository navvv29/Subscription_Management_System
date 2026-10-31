'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Repeat,
  Receipt,
  CreditCard,
  FileText,
  Users,
  Package,
  Calendar,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const navigation = [
  { name: 'Command Center', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Subscriptions', href: '/subscriptions', icon: Repeat },
  { name: 'Billing Queue', href: '/billing', icon: Receipt },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Quotations', href: '/quotations', icon: FileText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Products & Plans', href: '/products', icon: Package },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950/80 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
            S1
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
              Subscript One
              <span className="text-[10px] uppercase font-bold bg-indigo-950 text-indigo-400 border border-indigo-800 px-1.5 py-0.5 rounded">
                PRO
              </span>
            </div>
            <div className="text-xs text-slate-400">Command Center</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Member role badge */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-xs font-semibold text-indigo-300">
              NP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">Navaneed (Lead)</div>
              <div className="text-[11px] text-slate-400 truncate">Tech Lead & Billing</div>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-950/60 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-slate-400">System Healthy • Deterministic Billing Active</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60 font-mono">
              Minor Units (Paise)
            </span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700/60">
              Deterministic Tax: 18% Exclusive
            </span>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

