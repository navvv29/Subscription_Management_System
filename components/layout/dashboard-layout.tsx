'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  LayoutDashboard, Users, Package, ClipboardList, FileText,
  CreditCard, Receipt, DollarSign, Zap, ChevronLeft, Menu, X,
  LogOut, Store, Bell,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/plans', label: 'Plans', icon: ClipboardList },
  { href: '/quotations', label: 'Quotations', icon: FileText },
  { href: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { href: '/billing', label: 'Billing Center', icon: Zap },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/payments', label: 'Payments', icon: DollarSign },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col text-sidebar-foreground transition-all duration-300',
          'bg-sidebar-bg bg-[image:var(--sidebar-gradient)] border-r border-white/5',
          'shadow-[inset_-1px_0_0_rgba(255,255,255,0.04),18px_0_60px_-40px_rgba(2,6,23,0.9)]',
          sidebarOpen ? 'w-[260px]' : 'w-[68px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[image:var(--primary-gradient)] flex items-center justify-center shadow-[0_0_22px_-4px_var(--primary-glow)]">
              <Zap className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg tracking-tight text-white">
                Subscript
              </span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md hover:bg-sidebar-hover transition-colors"
          >
            <ChevronLeft className={cn('w-4 h-4 text-sidebar-muted transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md hover:bg-sidebar-hover"
          >
            <X className="w-4 h-4 text-sidebar-muted" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[image:linear-gradient(90deg,rgba(99,102,241,0.38),rgba(99,102,241,0.06))] text-white border border-indigo-400/25 shadow-[0_0_26px_-12px_var(--primary-glow)]'
                    : 'border border-transparent text-sidebar-muted hover:bg-sidebar-hover hover:text-white'
                )}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            href="/portal"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-white transition-colors"
            title="Open customer portal"
          >
            <Store className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Customer Portal</span>}
          </Link>
          {sidebarOpen && (
            <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-white text-xs font-bold">
                SM
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Shehruz M.</p>
                <p className="text-xs text-sidebar-muted truncate">Admin</p>
              </div>
              <button className="text-sidebar-muted hover:text-white transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 h-16 px-4 lg:px-6 border-b border-border bg-card backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="hidden lg:flex flex-col">
              <span className="kicker">Operations console</span>
              <span className="text-xs text-muted-foreground">Deterministic billing · minor units (paise)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-50)] px-3 py-1.5 text-[11px] font-medium text-[var(--success-600)]">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success-500)] opacity-70 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--success-500)]" />
              </span>
              System live
            </span>
            <ThemeToggle />
            <button
              aria-label="Notifications"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-[var(--input-bg)] hover:bg-accent transition-colors"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger-500)] shadow-[0_0_0_2px_var(--card)]" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="relative flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
