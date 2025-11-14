import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DeviceCategory,
  DeviceCategoryListOptions,
  DeviceCategoryPayload,
  PaginatedResponse,
} from '../models/device-category.model';

interface DeviceCategoryResponse {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DeviceCategoryListResponse {
  data: DeviceCategoryResponse[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface DeviceCategorySingleResponse {
  data: DeviceCategoryResponse;
}

@Injectable({ providedIn: 'root' })
export class DeviceCategoryApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/device-categories`;

  list(options: DeviceCategoryListOptions = {}): Observable<PaginatedResponse<DeviceCategory>> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));

    if (options.query && options.query.trim()) {
      params = params.set('q', options.query.trim());
    }

    if (typeof options.isActive === 'boolean') {
      params = params.set('is_active', String(options.isActive));
    }

    return this.http.get<DeviceCategoryListResponse>(this.baseUrl, { params }).pipe(
      map((response) => ({
        data: response.data.map((item) => this.mapCategory(item)),
        meta: response.meta,
      })),
    );
  }

  get(id: number): Observable<DeviceCategory> {
    return this.http
      .get<DeviceCategorySingleResponse>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => this.mapCategory(response.data)));
  }

  create(payload: DeviceCategoryPayload): Observable<DeviceCategory> {
    return this.http
      .post<DeviceCategorySingleResponse>(this.baseUrl, this.toRequestPayload(payload))
      .pipe(map((response) => this.mapCategory(response.data)));
  }

  update(id: number, payload: DeviceCategoryPayload): Observable<DeviceCategory> {
    return this.http
      .put<DeviceCategorySingleResponse>(`${this.baseUrl}/${id}`, this.toRequestPayload(payload))
      .pipe(map((response) => this.mapCategory(response.data)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  private mapCategory(raw: DeviceCategoryResponse): DeviceCategory {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description ?? undefined,
      isActive: raw.is_active,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  private toRequestPayload(payload: DeviceCategoryPayload) {
    return {
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
      is_active: payload.isActive,
    };
  }
}

