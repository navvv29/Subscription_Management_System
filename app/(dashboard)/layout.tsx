import React from 'react';
import { connection } from 'next/server';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

// The shell reads the active path and the pages read dynamic route params, so
// this segment renders at request time rather than as a static shell.
export const instant = false;

export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  return <DashboardLayout>{children}</DashboardLayout>;
}
