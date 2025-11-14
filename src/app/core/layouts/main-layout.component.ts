import { Component, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterLinkActive,
    CommonModule,
  ],
  template: `
    <mat-sidenav-container class="layout-container">
      <mat-sidenav #drawer class="layout-sidenav" mode="side" [opened]="false">
        <mat-nav-list>
          <a
            mat-list-item
            *ngFor="let link of navLinks(); trackBy: trackByNav"
            [routerLink]="link.path"
            routerLinkActive="active-link"
            (click)="closeDrawer()"
          >
            {{ link.label }}
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="layout-toolbar">
          <button
            mat-icon-button
            aria-label="เปิดเมนูนำทาง"
            class="toolbar-icon"
            (click)="toggleDrawer()"
            [disabled]="!navLinks().length"
          >
            <mat-icon>menu</mat-icon>
          </button>

          <span class="toolbar-title">Repair &amp; Quotation System</span>
          <span class="spacer"></span>

          <button
            mat-icon-button
            aria-label="ไปหน้าคำขอซ่อม"
            *ngIf="hasLink('/quotes')"
            routerLink="/quotes"
          >
            <mat-icon>favorite</mat-icon>
          </button>

          <button
            mat-icon-button
            aria-label="ไปหน้ารายงาน"
            *ngIf="hasLink('/reports')"
            routerLink="/reports"
          >
            <mat-icon>share</mat-icon>
          </button>

          <span *ngIf="user(); else guestInfo" class="user-info">
            {{ user()?.username }}<small *ngIf="user()?.role"> ({{ user()?.role }})</small>
          </span>
          <ng-template #guestInfo>
            <span class="user-info">Guest</span>
          </ng-template>

          <button
            *ngIf="isLoggedIn()"
            mat-icon-button
            aria-label="ออกจากระบบ"
            class="toolbar-icon"
            (click)="logout()"
          >
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>

        <div class="layout-content">
          <router-outlet></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .layout-toolbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      .layout-container {
        height: 100vh;
        background: #f5f7fa;
      }
      .layout-sidenav {
        width: 240px;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
        background: #fff;
      }
      .layout-content {
        padding: 16px;
        min-height: calc(100vh - 64px);
        background: #f5f7fa;
      }
      .spacer {
        flex: 1;
      }
      .user-info {
        margin-right: 8px;
        font-size: 14px;
      }
      .toolbar-icon {
        margin-right: 4px;
      }
      .toolbar-title {
        font-size: 18px;
        font-weight: 600;
        margin-left: 8px;
        letter-spacing: 0.5px;
      }
      .active-link {
        font-weight: 600;
        color: var(--mat-primary-500, #1976d2);
      }
      mat-nav-list a {
        border-radius: 8px;
        margin: 4px 8px;
      }
      mat-nav-list a.active-link {
        background: rgba(25, 118, 210, 0.12);
      }
    `,
  ],
})
export class MainLayoutComponent {
  @ViewChild(MatSidenav) private drawer?: MatSidenav;

  private readonly auth = inject(AuthService);

  readonly user = this.auth.user;
  readonly isLoggedIn = this.auth.isLoggedIn;
  readonly navLinks = computed(() => this.getLinksForRole(this.user()?.role ?? null));

  logout(): void {
    this.auth.logout();
  }

  toggleDrawer(): void {
    if (this.drawer) {
      this.drawer.toggle();
    }
  }

  closeDrawer(): void {
    if (this.drawer && this.drawer.opened) {
      this.drawer.close();
    }
  }

  trackByNav(index: number, link: NavLink): string {
    return link.path;
  }

  hasLink(path: string): boolean {
    return this.navLinks().some((link) => link.path === path);
  }

  private getLinksForRole(role: string | null): NavLink[] {
    if (!role) {
      return [];
    }

    if (role === 'admin') {
      return [
        { label: 'Users', path: '/admin/users' },
        { label: 'Customers', path: '/customers' },
        { label: 'Quotes', path: '/quotes' },
        { label: 'Repairs', path: '/repairs' },
        { label: 'Invoices', path: '/invoices' },
        { label: 'Reports', path: '/reports' },
        { label: 'ตั้งค่าหมวดหมู่อุปกรณ์', path: '/device-categories' },
        { label: 'ตั้งค่าอุปกรณ์', path: '/devices' },
      ];
    }

    if (role === 'technician') {
      return [
        { label: 'Customers', path: '/customers' },
        { label: 'Quotes', path: '/quotes' },
        { label: 'Repairs', path: '/repairs' },
      ];
    }

    return [
      { label: 'Quotes', path: '/quotes' },
      { label: 'Repairs', path: '/repairs' },
      { label: 'Invoices', path: '/invoices' },
    ];
  }
}

interface NavLink {
  label: string;
  path: string;
}

