// ============================================================================
// API Client
// One place that decides between the in-browser mock fixtures and the real
// route handlers in `app/api`.
//
// Live mode is the default. Set NEXT_PUBLIC_API_MODE=mock to run the UI against
// `lib/api/mock-store.ts` without a server (used for isolated UI work).
// ============================================================================

import type { ApiErrorDetail } from '@/types';

export class ApiRequestError extends Error {
  code: string;
  field?: string;

  constructor(detail: ApiErrorDetail) {
    super(detail.message);
    this.name = 'ApiRequestError';
    this.code = detail.code;
    this.field = detail.field;
  }
}

export function isMockApiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_API_MODE === 'mock';
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Calls the real API and unwraps the shared `{ data }` / `{ error }` envelope.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | { data: T }
    | { error: ApiErrorDetail }
    | null;

  if (!response.ok || !body || 'error' in body) {
    const detail = body && 'error' in body
      ? body.error
      : { code: 'REQUEST_FAILED', message: `Request failed (${response.status})` };
    throw new ApiRequestError(detail);
  }

  return body.data;
}

/** Treats the server's NOT_FOUND as a null result instead of an error. */
export async function apiFetchOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiFetch<T>(path, init);
  } catch (err) {
    if (err instanceof ApiRequestError && err.code === 'NOT_FOUND') return null;
    throw err;
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
