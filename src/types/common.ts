export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export type SortOrder = 'ascend' | 'descend';

export interface SortParams {
  field: string;
  order: SortOrder;
}

export interface DateRange {
  start: string;
  end: string;
}
