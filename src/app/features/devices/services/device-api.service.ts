import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CustomerDevice } from '../../customers/models/customer.model';

interface DeviceCategoryResponseRaw {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

interface DeviceResponse {
  id: number;
  customer_id?: number;
  category_id?: number;
  name?: string;
  type: string;
  brand?: string;
  model_name?: string;
  model_number?: string;
  serial_number?: string;
  status?: string;
  problem_details?: string;
  notes?: string;
  purchase_date?: string;
  created_at?: string;
  updated_at?: string;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  category?: DeviceCategoryResponseRaw;
}

export interface DeviceWithCategory extends CustomerDevice {
  categoryId?: number;
  category?: DeviceCategoryResponse;
  customerId?: number;
}

interface DeviceListResponse {
  data: DeviceResponse[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface DeviceSingleResponse {
  data: DeviceResponse;
}

export interface DeviceListOptions {
  query?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedDevice<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DeviceApiService {
  private readonly http = inject(HttpClient);

  listByCustomer(
    customerId: number,
    options: DeviceListOptions = {}
  ): Observable<PaginatedDevice<CustomerDevice>> {
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));

    if (options.query && options.query.trim()) {
      params = params.set('q', options.query.trim());
    }

    const url = `${environment.apiBaseUrl}/customers/${customerId}/devices`;
    console.log('Device API URL:', url);
    console.log('Device API params:', params.toString());

    return this.http
      .get<DeviceListResponse>(url, { params })
      .pipe(
        map((response) => {
          console.log('Device API raw response:', response);
          return {
            data: response.data.map((item) => this.mapDevice(item)),
            meta: response.meta,
          };
        })
      );
  }

  listAll(options: DeviceListOptions = {}): Observable<PaginatedDevice<DeviceWithCategory>> {
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));

    if (options.query && options.query.trim()) {
      params = params.set('q', options.query.trim());
    }

    const url = `${environment.apiBaseUrl}/devices`;
    console.log('Device API URL (all):', url);
    console.log('Device API params:', params.toString());

    return this.http
      .get<DeviceListResponse>(url, { params })
      .pipe(
        map((response) => {
          console.log('Device API raw response (all):', response);
          return {
            data: response.data.map((item) => this.mapDeviceWithCategory(item)),
            meta: response.meta,
          };
        })
      );
  }

  get(deviceId: number): Observable<DeviceWithCategory> {
    return this.http
      .get<DeviceSingleResponse>(`${environment.apiBaseUrl}/devices/${deviceId}`)
      .pipe(map((response) => this.mapDeviceWithCategory(response.data)));
  }

  create(customerId: number, payload: DevicePayload): Observable<DeviceWithCategory> {
    return this.http
      .post<DeviceSingleResponse>(`${environment.apiBaseUrl}/customers/${customerId}/devices`, this.toRequestPayload(payload))
      .pipe(map((response) => this.mapDeviceWithCategory(response.data)));
  }

  update(deviceId: number, customerId: number, payload: Partial<DevicePayload>): Observable<DeviceWithCategory> {
    return this.http
      .put<DeviceSingleResponse>(`${environment.apiBaseUrl}/customers/${customerId}/devices/${deviceId}`, this.toRequestPayload(payload))
      .pipe(map((response) => this.mapDeviceWithCategory(response.data)));
  }

  delete(deviceId: number, customerId: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/customers/${customerId}/devices/${deviceId}`);
  }

  private mapDevice(raw: DeviceResponse): CustomerDevice {
    return {
      id: raw.id,
      type: raw.type,
      brand: raw.brand,
      modelName: raw.model_name,
      modelNumber: raw.model_number,
      serialNumber: raw.serial_number,
      problemDetails: raw.problem_details,
      notes: raw.notes,
      purchaseDate: raw.purchase_date,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private mapDeviceWithCustomer(raw: DeviceResponse): CustomerDevice & { customer?: { id: number; first_name?: string; last_name?: string; company_name?: string } } {
    const result: CustomerDevice & { customer?: { id: number; first_name?: string; last_name?: string; company_name?: string } } = {
      id: raw.id,
      type: raw.type,
      brand: raw.brand,
      modelName: raw.model_name,
      modelNumber: raw.model_number,
      serialNumber: raw.serial_number,
      problemDetails: raw.problem_details,
      notes: raw.notes,
      purchaseDate: raw.purchase_date,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
    if (raw.customer) {
      result.customer = {
        id: raw.customer.id,
        first_name: raw.customer.first_name,
        last_name: raw.customer.last_name,
        company_name: raw.customer.company_name,
      };
    }
    return result;
  }

  private mapDeviceWithCategory(raw: DeviceResponse): DeviceWithCategory {
    const result: DeviceWithCategory = {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      brand: raw.brand,
      modelName: raw.model_name,
      modelNumber: raw.model_number,
      serialNumber: raw.serial_number,
      status: raw.status as 'active' | 'inactive' | 'repair' | 'sold' | undefined,
      problemDetails: raw.problem_details,
      notes: raw.notes,
      purchaseDate: raw.purchase_date,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
    if (raw.customer_id) {
      result.customerId = raw.customer_id;
    }
    if (raw.category_id) {
      result.categoryId = raw.category_id;
    }
    if (raw.category) {
      result.category = {
        id: raw.category.id,
        name: raw.category.name,
        description: raw.category.description,
        isActive: raw.category.is_active ?? true,
      };
    }
    return result;
  }

  private toRequestPayload(payload: DevicePayload | Partial<DevicePayload>): any {
    return {
      category_id: payload.categoryId ?? undefined,
      name: payload.name ?? undefined,
      type: payload.type ?? undefined,
      brand: payload.brand ?? undefined,
      model_name: payload.modelName ?? undefined,
      model_number: payload.modelNumber ?? undefined,
      serial_number: payload.serialNumber ?? undefined,
      status: payload.status ?? undefined,
      problem_details: payload.problemDetails ?? undefined,
      notes: payload.notes ?? undefined,
      purchase_date: payload.purchaseDate ?? undefined,
    };
  }
}

export interface DevicePayload {
  categoryId?: number;
  name?: string;
  type: string;
  brand?: string;
  modelName?: string;
  modelNumber?: string;
  serialNumber?: string;
  status?: 'active' | 'inactive' | 'repair' | 'sold';
  problemDetails?: string;
  notes?: string;
  purchaseDate?: string;
}

export interface DeviceCategoryResponse {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
}

