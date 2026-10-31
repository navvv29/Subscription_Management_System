import { NextResponse } from 'next/server';

export const badRequest = (message: string, details?: unknown) =>
  NextResponse.json({ error: { code: 'VALIDATION_ERROR', message, details } }, { status: 400 });

export const databaseError = (message = 'Database operation failed') =>
  NextResponse.json({ error: { code: 'DATABASE_ERROR', message } }, { status: 400 });

export const success = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status });

export async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function parsePagination(params: URLSearchParams) {
  const positiveInt = (raw: string | null, fallback: number) => {
    if (raw === null) return fallback;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  };
  return {
    page: positiveInt(params.get('page'), 1),
    pageSize: Math.min(100, positiveInt(params.get('pageSize'), 25)),
  };
}

