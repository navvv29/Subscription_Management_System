import { Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

// The admin shell reads usePathname() for active navigation, so it is a
// blocking (client-driven) segment rather than a prerendered static shell.
export const instant = false;

function ShellFallback() {
  return (
    <div className="flex h-screen bg-background" aria-hidden>
      <div className="hidden lg:block w-[260px] bg-[var(--sidebar-bg)]" />
      <div className="flex-1" />
    </div>
  );
}

export default function Layout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <DashboardLayout>{children}</DashboardLayout>
    </Suspense>
  );
}
