export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: string;
  status: 'active' | 'inactive';
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}
