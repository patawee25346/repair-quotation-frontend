import { Injectable, signal, computed } from '@angular/core';
import { TokenService } from './token.service';
import { Router } from '@angular/router';
import { AuthUser } from '../../features/auth/models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_STORAGE_KEY = 'current_user';

  private readonly _user = signal<AuthUser | null>(null);
  user = computed(() => this._user());
  isLoggedIn = computed(() => !!this._user());
  role = computed(() => this._user()?.role ?? null);

  constructor(private tokenSvc: TokenService, private router: Router) {
    this.restoreUserFromStorage();
  }

  private restoreUserFromStorage(): void {
    const token = this.tokenSvc.getAccessToken();
    const stored = localStorage.getItem(this.USER_STORAGE_KEY);
    if (!token || !stored) {
      if (!token) {
        localStorage.removeItem(this.USER_STORAGE_KEY);
      }
      return;
    }

    try {
      const parsed: AuthUser = JSON.parse(stored);
      if (parsed && parsed.id && parsed.username && parsed.role && parsed.status) {
        if (parsed.status !== 'active') {
          localStorage.removeItem(this.USER_STORAGE_KEY);
          this.tokenSvc.clear();
          return;
        }
        this._user.set(parsed);
      } else {
        localStorage.removeItem(this.USER_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(this.USER_STORAGE_KEY);
    }
  }

  private cacheUser(user: AuthUser | null): void {
    if (user) {
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(this.USER_STORAGE_KEY);
    }
  }

  setUser(user: AuthUser) {
    this._user.set(user);
    this.cacheUser(user);
  }

  loginSuccess(user: AuthUser, accessToken: string, refreshToken?: string) {
    this.setUser(user);
    this.tokenSvc.saveTokens(accessToken, refreshToken);
  }

  hasRole(...roles: string[]): boolean {
    const current = this._user();
    return !!current && roles.includes(current.role);
  }

  getDefaultRoute(): string {
    const role = this._user()?.role;
    switch (role) {
      case 'admin':
        return '/customers';
      case 'technician':
        return '/customers';
      case 'customer':
        return '/quotes';
      default:
        return '/auth/login';
    }
  }

  logout() {
    this._user.set(null);
    this.tokenSvc.clear();
    this.cacheUser(null);
    this.router.navigate(['/auth/login']);
  }
}
