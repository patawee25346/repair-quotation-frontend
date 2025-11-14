import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { AdminUserApiService } from './services/admin-user-api.service';
import { AdminUser, UserRole, UserStatus } from './models/admin-user.model';
import { DataTableCellDirective, DataTableColumn, DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { DatePipe } from '@angular/common';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserCreateDialogComponent, UserCreateDialogData, UserCreateDialogResult } from './user-create-dialog.component';
import { UserResetPasswordDialogComponent, UserResetPasswordDialogData, UserResetPasswordDialogResult } from './user-reset-password-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    DataTableComponent,
    DataTableCellDirective,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatSlideToggleModule,
  ],
  providers: [DatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <h2>ผู้ใช้ระบบ</h2>
        <button
          mat-icon-button
          color="primary"
          type="button"
          (click)="refresh()"
          [disabled]="loading()"
          matTooltip="รีเฟรชรายการ"
        >
          <mat-icon>refresh</mat-icon>
        </button>
      </header>

      <section class="card">
        <h3>ค้นหา</h3>
        <form class="filter-form" (ngSubmit)="applyFilters(filterForm)" #filterForm="ngForm">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>ค้นหา</mat-label>
            <input
              matInput
              type="text"
              name="query"
              placeholder="ค้นหาชื่อผู้ใช้หรืออีเมล"
              autocomplete="off"
              [ngModel]="filters().query"
              (ngModelChange)="setFilterQuery($event)"
            />
            <button
              mat-icon-button
              matSuffix
              type="button"
              aria-label="ล้างคำค้น"
              *ngIf="filters().query"
              (click)="setFilterQuery('')"
            >
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Role</mat-label>
            <mat-select name="role" [ngModel]="filters().role" (ngModelChange)="setFilterRole($event)">
              <mat-option value="all">ทั้งหมด</mat-option>
              <mat-option *ngFor="let role of roleOptions" [value]="role">{{ role }}</mat-option>
            </mat-select>
            <mat-icon matSuffix>manage_accounts</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>สถานะ</mat-label>
            <mat-select name="status" [ngModel]="filters().status" (ngModelChange)="setFilterStatus($event)">
              <mat-option value="all">ทั้งหมด</mat-option>
              <mat-option *ngFor="let status of statusOptions" [value]="status">
                {{ statusInfo(status).label }}
              </mat-option>
            </mat-select>
            <mat-icon matSuffix>toggle_on</mat-icon>
          </mat-form-field>

          <button mat-flat-button color="primary"  class="filter-button" type="submit" [disabled]="loading()">
            <mat-icon>filter_list</mat-icon>
            <span>ใช้ตัวกรอง</span>
          </button>
        </form>
      </section>

      <section class="card card--hero">
        <div class="hero-content">
          <div class="hero-text">
            <div class="hero-title">
              <mat-icon>groups</mat-icon>
              <div>
                <h3>จัดการผู้ใช้</h3>
                <p class="hero-subtitle">เพิ่มผู้ใช้ใหม่หรือปรับสิทธิ์เพื่อให้ทีมทำงานได้อย่างมีประสิทธิภาพ</p>
              </div>
            </div>
            <div class="hero-stats">
              <div class="hero-stat">
                <span class="hero-stat__label">ทั้งหมด</span>
                <span class="hero-stat__value">{{ users().length }}</span>
              </div>
              <div class="hero-stat">
                <span class="hero-stat__label">เปิดใช้งาน</span>
                <span class="hero-stat__value hero-stat__value--success">{{ activeCount() }}</span>
              </div>
              <div class="hero-stat">
                <span class="hero-stat__label">ปิดการใช้งาน</span>
                <span class="hero-stat__value hero-stat__value--muted">{{ inactiveCount() }}</span>
              </div>
            </div>
          </div>
          <button mat-flat-button color="primary" type="button" (click)="openCreateDialog()" class="hero-action">
            <mat-icon>person_add</mat-icon>
            <span>สร้างผู้ใช้ใหม่</span>
          </button>
        </div>
      </section>

      <section class="card">
        <header class="card-header">
          <h3>รายการผู้ใช้ ({{ users().length }})</h3>
          <span *ngIf="meta()?.total">ทั้งหมด {{ meta()?.total }} รายการ</span>
        </header>

        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

        <app-data-table
          [data]="users()"
          [columns]="userColumns"
          [loading]="loading()"
          emptyMessage="ยังไม่มีผู้ใช้ในระบบ"
          [dense]="true"
          [paginator]="true"
          [length]="meta()?.total ?? users().length"
          [pageIndex]="pagination().pageIndex"
          [pageSize]="pagination().pageSize"
          [pageSizeOptions]="pageSizeOptions"
          (pageChange)="onPageChange($event)"
        >
          <ng-template appDataTableCell="role" let-user>
            <mat-form-field appearance="fill" class="table-field">
              <mat-select [ngModel]="getRoleDraft(user)" (ngModelChange)="onRoleChange(user.id, $event)" [disabled]="isUpdating(user.id)">
                <mat-select-trigger>
                  <span class="role-trigger">
                    <mat-icon class="role-trigger__icon" [ngClass]="roleInfo(getRoleDraft(user)).iconClass">
                      {{ roleInfo(getRoleDraft(user)).icon }}
                    </mat-icon>
                    <span class="role-trigger__label">{{ roleInfo(getRoleDraft(user)).label }}</span>
                  </span>
                </mat-select-trigger>
                <mat-option *ngFor="let item of roleItems" [value]="item.value">
                  <div class="role-option">
                    <mat-icon class="role-option__icon" [ngClass]="item.iconClass">{{ item.icon }}</mat-icon>
                    <div class="role-option__text">
                      <div class="role-option__title">{{ item.label }}</div>
                      <div class="role-option__description">{{ item.description }}</div>
                    </div>
                  </div>
                </mat-option>
              </mat-select>
            </mat-form-field>
          </ng-template>

          <ng-template appDataTableCell="status" let-user>
            <div class="status-cell">
              <mat-slide-toggle
                class="status-toggle"
                color="primary"
                [checked]="user.status === 'active'"
                (change)="onStatusToggle(user, $event.checked)"
                [disabled]="isStatusUpdating(user.id)"
                [attr.data-label]="user.status === 'active' ? 'เปิด' : 'ปิด'"
              >
              </mat-slide-toggle>
            </div>
          </ng-template>

          <ng-template appDataTableCell="actions" let-user>
            <div class="actions">
              <button
                mat-stroked-button
                color="primary"
                type="button"
                (click)="saveRole(user)"
                [disabled]="isUpdating(user.id) || getRoleDraft(user) === user.role"
              >
                <mat-icon>save</mat-icon>
                <span>บันทึก Role</span>
              </button>
              <button mat-stroked-button type="button" (click)="openResetPasswordDialog(user)">
                <mat-icon>lock_reset</mat-icon>
                <span>ตั้งรหัสใหม่</span>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </section>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .card {
        background: #fff;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .card--hero {
        background: linear-gradient(135deg, rgba(25, 118, 210, 0.08), rgba(25, 118, 210, 0.02));
        border: 1px solid rgba(25, 118, 210, 0.08);
        padding: 24px;
      }
      .hero-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        flex-wrap: wrap;
      }
      .hero-title {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .hero-title mat-icon {
        font-size: 40px;
        height: 40px;
        width: 40px;
        color: #1976d2;
      }
      .hero-title h3 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
      }
      .hero-subtitle {
        margin: 4px 0 0;
        color: #60718d;
        font-size: 14px;
      }
      .hero-action {
        padding: 0 28px;
        height: 44px;
        border-radius: 22px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.35);
      }
      .hero-action mat-icon {
        font-size: 20px;
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }
      form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-end;
      }
      .filter-form {
        gap: 16px;
        justify-content: center;
        align-items: center;
      }
      .filter-field {
        flex: 1 1 220px;
        min-width: 220px;
      }
      .filter-form button {
        align-self: center;
      }
      .form-field {
        flex: 1 1 220px;
        min-width: 220px;
      }
      .table-field {
        width: 160px;
      }
      button {
        cursor: pointer;
      }
      button[disabled] {
        cursor: not-allowed;
        opacity: 0.5;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .actions button mat-icon,
      .create-form button mat-icon,
      .filter-form button mat-icon,
      .password-form button mat-icon {
        margin-right: 4px;
      }
      .role-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 160px;
      }
      .status-cell {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .status-cell mat-slide-toggle {
        display: inline-flex;
      }
      .status-toggle .mat-slide-toggle-content {
        display: none;
      }
      .status-toggle .mat-slide-toggle-bar {
        position: relative;
      }
      .status-toggle .mat-slide-toggle-bar::after {
        content: attr(data-label);
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        font-size: 11px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.64);
        pointer-events: none;
      }
      .status-toggle.mat-slide-toggle-checked .mat-slide-toggle-bar::after {
        color: #fff;
      }
      .status-label {
        font-size: 13px;
      }
      .role-trigger__icon {
        font-size: 18px;
      }
      .role-trigger__label {
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .role-option {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .table-field .mat-select-trigger {
        justify-content: center;
      }
      .table-field .mat-select-value-text {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .role-option__icon {
        font-size: 18px;
      }
      .role-option__text {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
        max-width: 220px;
      }
      .role-option__title {
        font-weight: 600;
        font-size: 13px;
      }
      .role-option__description {
        font-size: 11px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: normal;
      }
      .role-icon--primary {
        color: #1976d2;
      }
      .role-icon--accent {
        color: #9c27b0;
      }
      .role-icon--warn {
        color: #d32f2f;
      }
      .error {
        color: #f44336;
        margin: 0;
        font-size: 13px;
      }
      .success {
        color: #2e7d32;
        margin: 0;
        font-size: 13px;
      }
      .hint {
        font-size: 12px;
        color: #666;
      }
      .password-form {
        flex-wrap: wrap;
      }
      .password-panel {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .filter-form {
        justify-content: flex-end; /* ฟิลด์อยู่ซ้าย ปุ่มอยู่ขวา */
      }
      .filter-form button {
        margin-bottom: 16px;         /* เผื่อเว้นระยะจากฟิลด์ */
      }
      .filter-button {
        height: 50px;       // เพิ่มความสูง (ค่า default ~36px)
        font-size: 16px;    // ขยายขนาดตัวอักษรถ้าต้องการ
        padding: 0 24px;    // ปรับ padding ซ้าย-ขวา
      }
      .hero-stats {
        display: flex;
        gap: 16px;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .hero-stat {
        background: #fff;
        border-radius: 12px;
        padding: 12px 16px;
        min-width: 120px;
        box-shadow: 0 2px 6px rgba(25, 118, 210, 0.1);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .hero-stat__label {
        font-size: 12px;
        text-transform: uppercase;
        color: #60718d;
        letter-spacing: 0.08em;
      }
      .hero-stat__value {
        font-size: 20px;
        font-weight: 600;
        color: #0d1f44;
      }
      .hero-stat__value--success {
        color: #1b5e20;
      }
      .hero-stat__value--muted {
        color: #9e2141;
      }
    `,
  ],
})
export class UserManagementComponent implements OnInit {
  private readonly api = inject(AdminUserApiService);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  private readonly roleMeta: Record<
    UserRole,
    {
      value: UserRole;
      label: string;
      description: string;
      icon: string;
      iconClass: string;
    }
  > = {
    admin: {
      value: 'admin',
      label: 'Administrator',
      description: 'จัดการสิทธิ์และการตั้งค่าระบบทั้งหมด',
      icon: 'security',
      iconClass: 'role-icon--warn',
    },
    technician: {
      value: 'technician',
      label: 'Technician',
      description: 'ดูแลงานซ่อมและอัปเดตสถานะอุปกรณ์',
      icon: 'build',
      iconClass: 'role-icon--primary',
    },
    customer: {
      value: 'customer',
      label: 'Customer',
      description: 'เข้าถึงสถานะงานและเอกสารของตนเอง',
      icon: 'person',
      iconClass: 'role-icon--accent',
    },
  };

  readonly roleItems = Object.values(this.roleMeta);
  readonly roleOptions: UserRole[] = this.roleItems.map((item) => item.value);

  private readonly statusMeta: Record<UserStatus, { value: UserStatus; label: string; description: string; icon: string; chipColor: 'primary' | 'accent' | 'warn' }> = {
    active: {
      value: 'active',
      label: 'เปิดใช้งาน',
      description: 'ผู้ใช้สามารถเข้าสู่ระบบและใช้งานระบบได้',
      icon: 'check_circle',
      chipColor: 'primary',
    },
    inactive: {
      value: 'inactive',
      label: 'ปิดการใช้งาน',
      description: 'ผู้ใช้ไม่สามารถเข้าสู่ระบบหรือใช้งานระบบได้',
      icon: 'block',
      chipColor: 'warn',
    },
  };

  readonly statusItems = Object.values(this.statusMeta);
  readonly statusOptions: UserStatus[] = this.statusItems.map((item) => item.value);

  readonly users = signal<AdminUser[]>([]);
  readonly activeCount = computed(() => this.users().filter((user) => user.status === 'active').length);
  readonly inactiveCount = computed(() => this.users().filter((user) => user.status === 'inactive').length);
  readonly meta = signal<{ total: number; limit: number; offset: number; status?: UserStatus } | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filters = signal<{ query: string; role: 'all' | UserRole; status: 'all' | UserStatus }>({
    query: '',
    role: 'all',
    status: 'all',
  });
  readonly pagination = signal<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 10 });
  readonly tableOffset = computed(() => this.meta()?.offset ?? this.pagination().pageIndex * this.pagination().pageSize);

  readonly roleDrafts = signal<Record<number, UserRole>>({});
  readonly statusUpdatingId = signal<number | null>(null);

  readonly updatingUserId = signal<number | null>(null);
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly userColumns: DataTableColumn<AdminUser>[] = [
    {
      key: 'index',
      label: '#',
      align: 'center',
      accessor: (_, index) => this.tableOffset() + index + 1,
      sortable: false,
    },
    { key: 'username', label: 'Username', accessor: (user) => user.username, align: 'start', sortable: true },
    { key: 'role', label: 'Role', align: 'start', sortable: true },
    { key: 'status', label: 'สถานะ', align: 'center', sortable: false },
    {
      key: 'createdAt',
      label: 'สร้างเมื่อ',
      accessor: (user) => this.datePipe.transform(user.createdAt, 'dd/MM/yy HH:mm') ?? '-',
      sortable: true,
    },
    {
      key: 'updatedAt',
      label: 'อัปเดตเมื่อ',
      accessor: (user) => this.datePipe.transform(user.updatedAt, 'dd/MM/yy HH:mm') ?? '-',
      sortable: true,
    },
    { key: 'actions', label: 'เครื่องมือ', align: 'center', sortable: false },
  ];

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadUsers();
  }

  refresh(): void {
    this.loadUsers();
  }

  onPageChange(event: PageEvent): void {
    this.pagination.set({ pageIndex: event.pageIndex, pageSize: event.pageSize });
    this.loadUsers();
  }

  applyFilters(form: NgForm): void {
    if (this.loading() || form.invalid) {
      return;
    }
    this.loadUsers();
  }

  setFilterQuery(query: string): void {
    this.filters.update((current) => ({ ...current, query }));
    this.pagination.set({ pageIndex: 0, pageSize: this.pagination().pageSize });
    this.searchTerm$.next(query);
  }

  setFilterRole(role: 'all' | UserRole): void {
    this.filters.update((current) => ({ ...current, role }));
    this.pagination.set({ pageIndex: 0, pageSize: this.pagination().pageSize });
  }

  setFilterStatus(status: 'all' | UserStatus): void {
    this.filters.update((current) => ({ ...current, status }));
    this.pagination.set({ pageIndex: 0, pageSize: this.pagination().pageSize });
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<UserCreateDialogComponent, UserCreateDialogData, UserCreateDialogResult | undefined>(
      UserCreateDialogComponent,
      {
        width: '420px',
        data: { roleOptions: this.roleOptions, statusOptions: this.statusOptions },
        disableClose: true,
      }
    );

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.created) {
          this.pagination.set({ pageIndex: 0, pageSize: this.pagination().pageSize });
          this.loadUsers();
          this.snackBar.open(`สร้างผู้ใช้ ${result.username} สำเร็จ`, 'ปิด', { duration: 3000 });
        }
      });
  }

  openResetPasswordDialog(user: AdminUser): void {
    const dialogRef = this.dialog.open<
      UserResetPasswordDialogComponent,
      UserResetPasswordDialogData,
      UserResetPasswordDialogResult | undefined
    >(UserResetPasswordDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { userId: user.id, username: user.username },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.reset) {
          this.snackBar.open(`ตั้งรหัสผ่านใหม่ให้ ${user.username} สำเร็จ`, 'ปิด', { duration: 3000 });
        }
      });
  }

  onRoleChange(userId: number, value: string): void {
    this.setRoleDraft(userId, value as UserRole);
  }

  getRoleDraft(user: AdminUser): UserRole {
    return this.roleDrafts()[user.id] ?? user.role;
  }

  setRoleDraft(userId: number, role: UserRole): void {
    this.roleDrafts.update((drafts) => ({
      ...drafts,
      [userId]: role,
    }));
  }

  saveRole(user: AdminUser): void {
    const desiredRole = this.getRoleDraft(user);
    if (desiredRole === user.role) {
      return;
    }

    this.updatingUserId.set(user.id);
    this.api
      .updateUser(user.id, { role: desiredRole })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.updatingUserId.set(null))
      )
      .subscribe({
        next: (updated) => {
          this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
          this.roleDrafts.update((drafts) => {
            const clone = { ...drafts };
            delete clone[user.id];
            return clone;
          });
          this.snackBar.open('บันทึก role สำเร็จ', 'ปิด', { duration: 2500 });
        },
        error: (err) => {
          this.errorMessage.set(this.extractError(err));
        },
      });
  }

  isUpdating(userId: number): boolean {
    return this.updatingUserId() === userId;
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.filters();
    const roleParam = filters.role === 'all' ? undefined : filters.role;
    const statusParam = filters.status === 'all' ? undefined : filters.status;
    const pagination = this.pagination();
    const limit = pagination.pageSize;
    const offset = pagination.pageIndex * pagination.pageSize;

    this.api
      .listUsers({
        query: filters.query.trim() || undefined,
        role: roleParam,
        status: statusParam,
        limit,
        offset,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          const meta = res.meta ?? {
            total: res.data.length,
            limit,
            offset,
          };
          this.meta.set(meta);
          this.roleDrafts.set({});
          const resolvedLimit = meta.limit ?? pagination.pageSize;
          const resolvedOffset = meta.offset ?? offset;
          this.pagination.set({
            pageIndex: Math.floor(resolvedOffset / resolvedLimit),
            pageSize: resolvedLimit,
          });
          this.statusUpdatingId.set(null);
        },
        error: (err) => {
          this.errorMessage.set(this.extractError(err));
          this.users.set([]);
        },
      });
  }

  private readonly searchTerm$ = new Subject<string>();

  private setupSearchDebounce(): void {
    this.searchTerm$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadUsers();
      });
  }

  private extractError(err: unknown): string {
    if (err && typeof err === 'object') {
      const anyErr = err as any;
      if (typeof anyErr.error?.error === 'string') {
        return anyErr.error.error;
      }
      if (typeof anyErr.message === 'string') {
        return anyErr.message;
      }
    }
    return 'เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง';
  }

  roleMetaInfo(role: UserRole): string {
    return this.roleMetaLabel(role);
  }

  roleMetaLabel(role: UserRole): string {
    return this.roleMeta[role]?.label ?? role;
  }

  roleInfo(role: UserRole) {
    return this.roleMeta[role] ?? this.roleMeta.customer;
  }

  statusInfo(status: UserStatus) {
    return this.statusMeta[status] ?? this.statusMeta['inactive'];
  }

  isStatusUpdating(userId: number): boolean {
    return this.statusUpdatingId() === userId;
  }

  onStatusToggle(user: AdminUser, checked: boolean): void {
    const newStatus = checked ? 'active' : 'inactive';
    this.statusUpdatingId.set(user.id);
    this.api
      .updateUser(user.id, { status: newStatus })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.statusUpdatingId.set(null))
      )
      .subscribe({
        next: (updated) => {
          this.users.update((list) => list.map((item) => (item.id === updated.id ? updated : item)));
          const label = updated.status === 'active' ? 'เปิดใช้งาน' : 'ปิดการใช้งาน';
          this.snackBar.open(`เปลี่ยนสถานะเป็น ${label} แล้ว`, 'ปิด', { duration: 2500 });
        },
        error: (err) => {
          this.errorMessage.set(this.extractError(err));
        },
      });
  }
}
