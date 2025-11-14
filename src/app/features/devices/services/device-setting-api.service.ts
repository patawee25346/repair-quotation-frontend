import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DeviceType,
  DeviceTypeListOptions,
  DeviceTypePayload,
  PaginatedDeviceType,
} from '../models/device-setting.model';

interface DeviceCategoryResponse {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

interface DeviceTypeResponse {
  id: number;
  name: string;
  description?: string;
  category_id?: number;
  category?: DeviceCategoryResponse;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DeviceTypeListResponse {
  data: DeviceTypeResponse[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface DeviceTypeSingleResponse {
  data: DeviceTypeResponse;
}

@Injectable({ providedIn: 'root' })
export class DeviceSettingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/device-types`;

  list(options: DeviceTypeListOptions = {}): Observable<PaginatedDeviceType<DeviceType>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));

    if (options.query && options.query.trim()) {
      params = params.set('q', options.query.trim());
    }

    if (typeof options.isActive === 'boolean') {
      params = params.set('is_active', String(options.isActive));
    }

    return this.http.get<DeviceTypeListResponse>(this.baseUrl, { params }).pipe(
      map((response) => ({
        data: response.data.map((item) => this.mapDeviceType(item)),
        meta: response.meta,
      })),
    );
  }

  get(id: number): Observable<DeviceType> {
    return this.http
      .get<DeviceTypeSingleResponse>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.mapDeviceType(response.data)));
  }

  create(payload: DeviceTypePayload): Observable<DeviceType> {
    return this.http
      .post<DeviceTypeSingleResponse>(this.baseUrl, this.toRequestPayload(payload))
      .pipe(map((response) => this.mapDeviceType(response.data)));
  }

  update(id: number, payload: DeviceTypePayload): Observable<DeviceType> {
    return this.http
      .put<DeviceTypeSingleResponse>(`${this.baseUrl}/${id}`, this.toRequestPayload(payload))
      .pipe(map((response) => this.mapDeviceType(response.data)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private mapDeviceType(raw: DeviceTypeResponse): DeviceType {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description ?? undefined,
      categoryId: raw.category_id,
      category: raw.category
        ? {
            id: raw.category.id,
            name: raw.category.name,
            description: raw.category.description,
            isActive: raw.category.is_active,
          }
        : undefined,
      isActive: raw.is_active,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private toRequestPayload(payload: DeviceTypePayload) {
    return {
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
      category_id: payload.categoryId ?? undefined,
      is_active: payload.isActive,
    };
  }
}

