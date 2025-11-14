import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';
import { AuthApiService } from '../../features/auth/services/auth-api.service';
import { catchError, filter, switchMap, take, throwError, Observable, Subject, of } from 'rxjs';

let refreshing = false;
const refreshSubject = new Subject<string | null>(); // emit new access token

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenSvc = inject(TokenService);
  const authApi = inject(AuthApiService);

  const accessToken = tokenSvc.getAccessToken();
  const cloned = accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : req;

  return next(cloned).pipe(
    catchError((err: any) => {
      // if 401, try refresh
      if (err?.status === 401) {
        const refreshToken = tokenSvc.getRefreshToken();
        if (!refreshToken) {
          return throwError(() => err);
        }

        if (!refreshing) {
          refreshing = true;
          // start refresh
          return authApi.refreshToken(refreshToken).pipe(
            switchMap((res: any) => {
              const newAccess = res.accessToken;
              const newRefresh = res.refreshToken;
              tokenSvc.saveTokens(newAccess, newRefresh);
              refreshing = false;
              refreshSubject.next(newAccess);
              return next(req.clone({ setHeaders: { Authorization: `Bearer ${newAccess}` } }));
            }),
            catchError((refreshErr) => {
              refreshing = false;
              refreshSubject.next(null);
              tokenSvc.clear();
              return throwError(() => refreshErr);
            })
          );
        } else {
          // queue the request until refreshSubject emits
          return refreshSubject.pipe(
            filter((t) => t !== undefined),
            take(1),
            switchMap((token) => {
              if (!token) return throwError(() => err);
              return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
            })
          );
        }
      }
      return throwError(() => err);
    })
  );
};
