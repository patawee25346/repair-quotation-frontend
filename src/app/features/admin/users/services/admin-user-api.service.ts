import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  AdminUser,
  AdminUserListResponse,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  UserRole,
  UserStatus,
} from '../models/admin-user.model';

type UserResponse = {
  id: number;
  username: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type UserListResponseRaw = {
  data: UserResponse[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    status?: string;
  };
};

@Injectable({ providedIn: 'root' })
export class AdminUserApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/users`;

  listUsers(params?: {
    query?: string;
    role?: UserRole;
    status?: UserStatus;
    limit?: number;
    offset?: number;
  }): Observable<AdminUserListResponse> {
    let httpParams = new HttpParams();
    if (params?.query) {
      httpParams = httpParams.set('q', params.query);
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params?.status) {
      httpParams = httpParams.set('status', params.status);
    }
    if (params?.limit != null) {
      httpParams = httpParams.set('limit', params.limit);
    }
    if (params?.offset != null) {
      httpParams = httpParams.set('offset', params.offset);
    }

    return this.http.get<UserListResponseRaw>(this.baseUrl, { params: httpParams }).pipe(map((res) => this.mapList(res)));
  }

  createUser(payload: CreateAdminUserRequest): Observable<AdminUser> {
    return this.http
      .post<{ data: UserResponse }>(this.baseUrl, payload)
      .pipe(map((res) => this.mapUser(res.data)));
  }

  updateUser(userId: number, payload: UpdateAdminUserRequest): Observable<AdminUser> {
    return this.http
      .patch<{ data: UserResponse }>(`${this.baseUrl}/${userId}`, payload)
      .pipe(map((res) => this.mapUser(res.data)));
  }

  private mapList(raw: UserListResponseRaw): AdminUserListResponse {
    return {
      data: raw.data.map((item) => this.mapUser(item)),
      meta: {
        total: raw.meta.total,
        limit: raw.meta.limit,
        offset: raw.meta.offset,
        status: raw.meta.status as UserStatus | undefined,
      },
    };
  }

  private mapUser(raw: UserResponse): AdminUser {
    return {
      id: raw.id,
      username: raw.username,
      role: raw.role as UserRole,
      status: raw.status as UserStatus,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}
