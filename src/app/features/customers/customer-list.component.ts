import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CustomerApiService } from './services/customer-api.service';
import { customersLoading, customersSignal, customersTotal } from './store/customer.signal';
import { Customer, CustomerStatus } from './models/customer.model';
import {
  CustomerFormDialogComponent,
  CustomerFormDialogData,
  CustomerFormDialogResult,
} from './customer-form-dialog.component';
import { CustomerDetailDialogComponent, CustomerDetailDialogData } from './customer-detail-dialog.component';
import { DataTableCellDirective, DataTableColumn, DataTableComponent } from '../../shared/components/data-table/data-table.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSnackBarModule,
    DataTableComponent,
    DataTableCellDirective,
  ],
  providers: [DatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="hero">
          <div class="hero-title">
            <mat-icon>people</mat-icon>
            <div>
              <h2>ลูกค้า</h2>
              <p class="hero-subtitle">จัดการข้อมูลลูกค้าและประวัติการติดต่อทั้งหมดในที่เดียว</p>
            </div>
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat__label">ทั้งหมด</span>
              <span class="hero-stat__value">{{ total() }}</span>
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
        <button mat-flat-button color="primary" class="hero-action" type="button" (click)="openCreateDialog()">
          <mat-icon>person_add</mat-icon>
          <span>เพิ่มลูกค้า</span>
        </button>
      </header>

      <section class="card">
        <h3>ค้นหา</h3>
        <form class="filter-form" (ngSubmit)="applyFilters(filterForm)" #filterForm="ngForm">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>ค้นหาชื่อลูกค้าหรืออีเมล</mat-label>
            <mat-icon matPrefix>search</mat-icon>
            <input
              matInput
              type="text"
              name="query"
              autocomplete="off"
              [ngModel]="filters().query"
              (ngModelChange)="setFilterQuery($event)"
              placeholder="เช่น บริษัท เอ บี ซี"
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

          <mat-form-field appearance="outline" class="filter-field filter-field--small">
            <mat-label>สถานะ</mat-label>
            <mat-select name="status" [ngModel]="filters().status" (ngModelChange)="setFilterStatus($event)">
              <mat-option *ngFor="let option of statusOptions" [value]="option.value">{{ option.label }}</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-flat-button color="primary" class="filter-button" type="submit" [disabled]="loading()">
            <mat-icon>filter_list</mat-icon>
            <span>ใช้ตัวกรอง</span>
          </button>
        </form>
      </section>

      <section class="card">
        <div class="card-header">
          <div class="card-header__title">
            <h3>รายชื่อลูกค้า</h3>
            <span class="card-header__meta">ทั้งหมด {{ total() }} รายการ</span>
          </div>
          <button mat-stroked-button color="primary" type="button" (click)="refresh()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            <span>รีเฟรช</span>
          </button>
      </div>

        <mat-progress-bar *ngIf="loading()" mode="indeterminate"></mat-progress-bar>

        <app-data-table
          [data]="customers()"
          [columns]="columns"
          [loading]="loading()"
          emptyMessage="ยังไม่มีข้อมูลลูกค้า"
          [dense]="true"
        >
          <ng-template appDataTableCell="name" let-c>
            <div class="customer-name">
              <mat-icon fontIcon="person" class="customer-avatar"></mat-icon>
              <div>
                <div class="customer-name__title">{{ fullName(c) }}</div>
                <div class="customer-name__company" *ngIf="c.companyName">{{ c.companyName }}</div>
                <div class="customer-name__id">รหัส: {{ c.code }}</div>
              </div>
            </div>
          </ng-template>

          <ng-template appDataTableCell="email" let-c>
            <span>{{ c.email || '-' }}</span>
          </ng-template>

          <ng-template appDataTableCell="phone" let-c>
            <span>{{ c.phoneNumber || '-' }}</span>
          </ng-template>

          <ng-template appDataTableCell="taxId" let-c>
            <span>{{ c.taxId || '-' }}</span>
          </ng-template>

          <ng-template appDataTableCell="status" let-c>
            <span class="status-chip" [ngClass]="statusInfo(c.status).className">
              {{ statusInfo(c.status).label }}
            </span>
          </ng-template>

          <ng-template appDataTableCell="createdAt" let-c>
            <span>{{ formatDate(c.createdAt) }}</span>
      </ng-template>

          <ng-template appDataTableCell="actions" let-c>
            <div class="actions">
              <button mat-stroked-button type="button" color="accent" (click)="openDetailDialog(c)">
                <mat-icon>visibility</mat-icon>
                <span>รายละเอียด</span>
              </button>
              <button mat-stroked-button type="button" color="primary" (click)="openEditDialog(c)">
                <mat-icon>edit</mat-icon>
                <span>แก้ไข</span>
              </button>
              <button
                mat-stroked-button
                type="button"
                color="warn"
                (click)="deactivateCustomer(c)"
                [disabled]="c.status === 'inactive' || statusUpdating() === c.id"
              >
                <mat-icon>delete</mat-icon>
                <span>ปิดการใช้งาน</span>
              </button>
    </div>
          </ng-template>
        </app-data-table>

        <mat-paginator
          [length]="total()"
          [pageSize]="limit"
          [pageSizeOptions]="[5, 10, 25, 50]"
          (page)="onPage($event)"
        ></mat-paginator>
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
        gap: 16px;
        flex-wrap: wrap;
      }
      .hero {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .hero-title {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .hero-title mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: #1976d2;
      }
      .hero-subtitle {
        margin: 4px 0 0;
        color: #60718d;
        font-size: 14px;
      }
      .hero-stats {
        display: flex;
        gap: 16px;
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
      .hero-action {
        padding: 0 28px;
        height: 44px;
        border-radius: 22px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(25, 118, 210, 0.35);
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
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .card-header__title {
        display: flex;
        flex-direction: column;
      }
      .card-header__meta {
        font-size: 13px;
        color: #60718d;
      }
      .filter-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
        align-items: center;
      }
      .filter-field {
        flex: 1 1 260px;
        min-width: 220px;
      }
      .filter-field--small {
        max-width: 220px;
      }
      .filter-button {
        align-self: center;
      }
      .customer-name {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .customer-avatar {
        background: rgba(25, 118, 210, 0.12);
        border-radius: 50%;
        padding: 8px;
        font-size: 20px;
      }
      .customer-name__title {
        font-weight: 600;
      }
      .customer-name__company {
        font-size: 13px;
        color: #1b5e20;
      }
      .customer-name__id {
        font-size: 12px;
        color: #60718d;
      }
      .status-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .status-chip--active {
        background: rgba(76, 175, 80, 0.1);
        color: #2e7d32;
      }
      .status-chip--inactive {
        background: rgba(244, 67, 54, 0.1);
        color: #c62828;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
    `,
  ],
})
export class CustomerListComponent implements OnInit {
  private readonly api = inject(CustomerApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = inject(DatePipe);

  readonly customers = customersSignal;
  readonly total = customersTotal;
  readonly loading = customersLoading;

  readonly filters = signal<{ query: string; status: 'all' | 'active' | 'inactive' }>({ query: '', status: 'all' });
  readonly statusOptions = [
    { value: 'all' as const, label: 'ทั้งหมด' },
    { value: 'active' as const, label: 'เปิดใช้งาน' },
    { value: 'inactive' as const, label: 'ปิดการใช้งาน' },
  ];

  readonly activeCount = computed(() => this.customers().filter((c) => c.status === 'active').length);
  readonly inactiveCount = computed(() => this.customers().filter((c) => c.status === 'inactive').length);

  readonly statusMeta: Record<CustomerStatus, { label: string; className: string }> = {
    active: { label: 'เปิดใช้งาน', className: 'status-chip--active' },
    inactive: { label: 'ปิดการใช้งาน', className: 'status-chip--inactive' },
  };

  readonly statusUpdating = signal<number | null>(null);

  readonly columns: DataTableColumn<Customer>[] = [
    { key: 'name', label: 'ชื่อลูกค้า', align: 'start', sortable: false },
    { key: 'email', label: 'อีเมล', align: 'start', sortable: false },
    { key: 'phone', label: 'เบอร์โทร', align: 'start', sortable: false },
    { key: 'taxId', label: 'เลขประจำตัวผู้เสียภาษี', align: 'start', sortable: false },
    { key: 'status', label: 'สถานะ', align: 'start', sortable: false },
    { key: 'createdAt', label: 'สร้างเมื่อ', align: 'start', sortable: false },
    { key: 'actions', label: 'เครื่องมือ', align: 'end', sortable: false },
  ];

  readonly search$ = new Subject<string>();

  limit = 10;
  offset = 0;

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.load();
  }

  refresh(): void {
    this.load();
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open<
      CustomerFormDialogComponent,
      CustomerFormDialogData,
      CustomerFormDialogResult
    >(CustomerFormDialogComponent, {
      width: '520px',
      data: { mode: 'create' },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.customer) {
          this.snackBar.open('สร้างลูกค้าสำเร็จ', 'ปิด', { duration: 3000 });
          this.refresh();
        }
      });
  }

  openEditDialog(customer: Customer): void {
    const dialogRef = this.dialog.open<
      CustomerFormDialogComponent,
      CustomerFormDialogData,
      CustomerFormDialogResult
    >(CustomerFormDialogComponent, {
      width: '520px',
      data: { mode: 'edit', customer },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.customer) {
          this.snackBar.open('บันทึกข้อมูลลูกค้าสำเร็จ', 'ปิด', { duration: 3000 });
          this.refresh();
        }
      });
  }

  openDetailDialog(customer: Customer): void {
    this.dialog.open<CustomerDetailDialogComponent, CustomerDetailDialogData>(CustomerDetailDialogComponent, {
      width: '880px',
      maxWidth: '95vw',
      data: { customerId: customer.id },
    });
  }

  applyFilters(form: NgForm): void {
    if (form.invalid || this.loading()) {
      return;
    }
    this.paginationReset();
    this.load();
  }

  setFilterQuery(query: string): void {
    this.filters.update((current) => ({ ...current, query }));
    this.paginationReset();
    this.search$.next(query);
  }

  setFilterStatus(status: 'all' | 'active' | 'inactive'): void {
    this.filters.update((current) => ({ ...current, status }));
    this.paginationReset();
    this.load();
  }

  onPage(event: PageEvent): void {
    this.limit = event.pageSize;
    this.offset = event.pageIndex * event.pageSize;
    this.load();
  }

  trackById(index: number, item: Customer): number {
    return item.id;
  }

  fullName(customer: Customer): string {
    const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
    if (name) {
      return name;
    }
    return customer.companyName ?? '-';
  }

  statusInfo(status: CustomerStatus): { label: string; className: string } {
    return this.statusMeta[status] ?? { label: status, className: '' };
  }

  deactivateCustomer(customer: Customer): void {
    if (customer.status === 'inactive' || this.statusUpdating() !== null) {
      return;
    }

    this.statusUpdating.set(customer.id);
    this.api
      .setActive(customer.id, false)
      .pipe(finalize(() => this.statusUpdating.set(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          customersSignal.update((list) =>
            list.map((item) =>
              item.id === updated.id
                ? { ...item, isActive: updated.isActive, status: updated.status }
                : item
            )
          );
          this.snackBar.open('ปิดการใช้งานลูกค้าเรียบร้อย', 'ปิด', { duration: 3000 });
        },
        error: () => {
          this.snackBar.open('ไม่สามารถปิดการใช้งานลูกค้าได้', 'ปิด', { duration: 3000 });
        },
      });
  }

  formatDate(value?: string): string {
    if (!value) {
      return '-';
    }
    return this.datePipe.transform(value, 'dd/MM/yyyy') ?? '-';
  }

  private load(): void {
    const { query, status } = this.filters();
    const statusParam: CustomerStatus | undefined = status === 'all' ? undefined : status;

    this.loading.set(true);
    this.api
      .list(this.limit, this.offset, query.trim() || undefined, statusParam)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => {
          customersSignal.set(res.data);
          customersTotal.set(res.meta.total ?? res.data.length);
        },
        error: () => {
          customersSignal.set([]);
          customersTotal.set(0);
        },
      });
  }

  private paginationReset(): void {
    this.offset = 0;
  }

  private setupSearchDebounce(): void {
    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load());
  }
}
