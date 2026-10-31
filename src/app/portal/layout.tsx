import { Suspense } from 'react';
import { PortalLayout } from '@/components/layout/portal-layout';

// The portal shell reads usePathname() for active navigation, so it is a
// blocking (client-driven) segment rather than a prerendered static shell.
export const instant = false;

function ShellFallback() {
  return (
    <div className="min-h-screen bg-background" aria-hidden>
      <div className="h-16 border-b border-border bg-card" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6" />
    </div>
  );
}

export default function Layout({ children }: LayoutProps<"/portal">) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <PortalLayout>{children}</PortalLayout>
    </Suspense>
  );
}
