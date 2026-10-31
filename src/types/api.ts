// ============================================================================
// API Response Types
// ============================================================================

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  field?: string;
}

export interface ApiError {
  error: ApiErrorDetail;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function isApiError<T>(response: ApiResponse<T>): response is ApiError {
  return 'error' in response;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
