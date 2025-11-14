import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly ACCESS = 'access_token';
  private readonly REFRESH = 'refresh_token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH);
  }

  saveTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(this.ACCESS, accessToken);
    if (refreshToken) localStorage.setItem(this.REFRESH, refreshToken);
  }

  clear() {
    localStorage.removeItem(this.ACCESS);
    localStorage.removeItem(this.REFRESH);
  }
}
