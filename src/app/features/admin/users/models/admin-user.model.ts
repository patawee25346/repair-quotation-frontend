export type UserRole = 'admin' | 'technician' | 'customer';
export type UserStatus = 'active' | 'inactive';

export interface AdminUser {
  id: number;
  username: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    status?: UserStatus;
  };
}

export interface CreateAdminUserRequest {
  username: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

export interface UpdateAdminUserRequest {
  password?: string;
  role?: UserRole;
  status?: UserStatus;
}
