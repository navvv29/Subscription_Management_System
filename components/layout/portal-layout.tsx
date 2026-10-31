'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, CreditCard, Receipt, Zap, LogOut, Menu, X } from 'lucide-react';
import { useApiResource } from '@/lib/hooks/use-api-resource';
import { getPortalProfile } from '@/lib/api';
import { ThemeToggle } from '@/components/theme-toggle';

const portalNavItems = [
  { href: '/portal', label: 'My Quotations', icon: FileText },
  { href: '/portal/subscriptions', label: 'My Subscriptions', icon: CreditCard },
  { href: '/portal/invoices', label: 'My Invoices', icon: Receipt },
];

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useApiResource('portal-session', getPortalProfile);
  const displayName = session?.profile.displayName ?? 'My Account';
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/portal" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[image:var(--primary-gradient)] flex items-center justify-center shadow-[0_0_22px_-4px_var(--primary-glow)]">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-foreground">
                Subscript <span className="text-primary">Portal</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {portalNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary-400)] to-[var(--primary-600)] flex items-center justify-center text-white text-xs font-bold">
                  {initials || '—'}
                </div>
                <span className="text-sm font-medium text-foreground">{displayName}</span>
              </div>
              <ThemeToggle />
              <button className="text-muted-foreground hover:text-foreground transition-colors" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
              <button
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-accent"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile nav */}
          {mobileMenuOpen && (
            <nav className="md:hidden py-3 border-t border-border space-y-1">
              {portalNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* Authentication is not wired in this build; say so instead of implying it. */}
      <div className="border-b border-[var(--warning-border)] bg-[var(--warning-50)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 text-xs text-[var(--warning-600)]">
          Demo portal session — sample records are shown until authentication and
          customer-scoped APIs are enabled.
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}
