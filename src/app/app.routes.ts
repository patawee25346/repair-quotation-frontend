import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';


export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login-page.component').then(
            (m) => m.LoginPageComponent
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register-page.component').then(
            (m) => m.RegisterPageComponent
          ),
      },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/layouts/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/admin/users').then(
            (m) => m.UserManagementComponent
          ),
      },
      {
        path: 'device-categories',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/device-categories').then(
            (m) => m.DeviceCategoryListComponent
          ),
      },
      {
        path: 'customers',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'technician'] },
        loadComponent: () =>
          import('./features/customers/customer-list.component').then(
            (m) => m.CustomerListComponent
          ),
      },
      {
        path: 'quotes',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'technician', 'customer'] },
        loadComponent: () =>
          import('./features/quotes').then(
            (m) => m.QuoteListComponent
          ),
      },
      {
        path: 'repairs',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'technician', 'customer'] },
        loadComponent: () =>
          import('./features/repairs').then(
            (m) => m.RepairListComponent
          ),
      },
      {
        path: 'invoices',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'customer'] },
        loadComponent: () =>
          import('./features/invoices').then(
            (m) => m.InvoiceListComponent
          ),
      },
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/reports').then(
            (m) => m.ReportDashboardComponent
          ),
      },
      {
        path: 'devices',
        canActivate: [roleGuard],
        data: { roles: ['admin'] },
        loadComponent: () =>
          import('./features/devices').then(
            (m) => m.DeviceSettingComponent
          ),
      },
      { path: '', redirectTo: 'customers', pathMatch: 'full' },
    ],
  },
];
