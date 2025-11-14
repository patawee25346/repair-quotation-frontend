import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data?.['roles'] as string[]) ?? [];

  if (allowedRoles.length === 0 || auth.hasRole(...allowedRoles)) {
    return true;
  }

  const redirect = auth.getDefaultRoute();
  return router.parseUrl(redirect || '/auth/login');
};

