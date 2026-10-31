import { NextRequest } from 'next/server';
import { apiSuccess } from '@/lib/api-helpers';
import { store } from '@/lib/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let runs = Array.from(store.billingRuns.values());

  if (status) {
    runs = runs.filter((r) => r.status === status);
  }

  // Sort newest first
  runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (limit > 0) {
    runs = runs.slice(0, limit);
  }

  return apiSuccess(runs);
}

