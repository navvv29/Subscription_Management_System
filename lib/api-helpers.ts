import { NextResponse } from 'next/server';
import type { ApiSuccess, ApiError } from '@/types/api';

export function apiSuccess<T>(data: T, status: number = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

export function apiError(code: string, message: string, status: number = 400): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message } }, { status });
}
