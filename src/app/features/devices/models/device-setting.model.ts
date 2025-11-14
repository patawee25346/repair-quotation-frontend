export interface DeviceCategory {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface DeviceType {
  id: number;
  name: string;
  description?: string;
  categoryId?: number;
  category?: DeviceCategory;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceTypePayload {
  name: string;
  description?: string;
  categoryId?: number;
  isActive: boolean;
}

export interface DeviceTypeListOptions {
  query?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface PaginatedDeviceType<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

