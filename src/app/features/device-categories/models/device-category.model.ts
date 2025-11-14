export interface DeviceCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceCategoryPayload {
  name: string;
  description?: string;
  isActive: boolean;
}

export interface DeviceCategoryListOptions {
  query?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

