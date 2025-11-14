import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { finalize, filter as rxFilter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataTableCellDirective, DataTableColumn, DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { Quote, QuoteStatus } from './models/quote.model';
import { QuoteApiService, QuoteListParams } from './services/quote-api.service';
import { QuoteDetailDialogComponent, QuoteDetailDialogData } from './quote-detail-dialog.component';
import { QuoteCreateDialogComponent } from './quote-create-dialog.component';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatSnackBarModule,
    DataTableComponent,
    DataTableCellDirective,
  ],
  providers: [DatePipe],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="hero">
          <div class="hero__title">
            <mat-icon>description</mat-icon>
            <div>
              <h2>ใบเสนอราคา</h2>
              <p>ติดตามสถานะใบเสนอราคาทั้งหมดของลูกค้าและอุปกรณ์</p>
            </div>
          </div>
          <div class="hero__stats">
            <div class="hero__stat">
              <label>ทั้งหมด</label>
              <strong>{{ meta().total }}</strong>
            </div>
            <div class="hero__stat" *ngFor="let status of statusFilters">
              <label>{{ status.label }}</label>
              <strong>{{ countByStatus(status.value) }}</strong>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <button mat-flat-button color="primary" type="button" (click)="openCreate()" [disabled]="loading()">
            <mat-icon>add</mat-icon>
            สร้างใบเสนอราคา
          </button>
          <button mat-stroked-button color="primary" type="button" (click)="refresh()" [disabled]="loading()">
            <mat-icon>refresh</mat-icon>
            รีเฟรช
          </button>
        </div>
      </header>

      <section class="card filter-card">
        <h3><mat-icon>filter_list</mat-icon> ตัวกรอง</h3>
        <form #filterForm="ngForm" (ngSubmit)="applyFilters(filterForm)">
          <mat-form-field appearance="outline">
            <mat-label>สถานะ</mat-label>
            <mat-select
              name="status"
              multiple
              [ngModel]="filters().statuses"
              (ngModelChange)="setStatuses($event)"
            >
              <mat-option *ngFor="let status of statusFilters" [value]="status.value">
                {{ status.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>วันที่เริ่ม</mat-label>
            <input
              matInput
              [matDatepicker]="startPicker"
              name="dateFrom"
              [ngModel]="filters().dateFrom"
              (ngModelChange)="setDateFrom($event)"
            />
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>วันที่สิ้นสุด</mat-label>
            <input
              matInput
              [matDatepicker]="endPicker"
              name="dateTo"
              [ngModel]="filters().dateTo"
              (ngModelChange)="setDateTo($event)"
            />
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>

          <button mat-flat-button color="primary" type="submit" [disabled]="loading()">
            <mat-icon>search</mat-icon>
            ใช้ตัวกรอง
          </button>
        </form>
      </section>

      <section class="card">
        <header class="card__header">
          <div>
            <h3>รายการใบเสนอราคา</h3>
            <p class="muted">คำอธิบายและยอดรวมแสดงตามสกุลเงิน {{ filters().currency }}</p>
          </div>
        </header>

        <p class="error" *ngIf="errorMessage()">{{ errorMessage() }}</p>

        <app-data-table
          [data]="quotes()"
          [columns]="columns"
          [dense]="true"
          [loading]="loading()"
          emptyMessage="ยังไม่มีใบเสนอราคาที่สร้างไว้"
          [paginator]="true"
          [length]="meta().total"
          [pageIndex]="pagination().pageIndex"
          [pageSize]="pagination().pageSize"
          [pageSizeOptions]="pageSizeOptions"
          (pageChange)="onPageChange($event)"
        >
          <ng-template appDataTableCell="status" let-quote>
            <span class="status-chip" [ngClass]="statusClass(quote.status)">
              <mat-icon>{{ statusIcon(quote.status) }}</mat-icon>
              {{ statusLabel(quote.status) }}
            </span>
          </ng-template>

          <ng-template appDataTableCell="customer" let-quote>
            <div class="customer-cell">
              <mat-icon>person</mat-icon>
              <span>{{ formatCustomer(quote) }}</span>
            </div>
          </ng-template>

          <ng-template appDataTableCell="device" let-quote>
            <div class="device-cell" *ngIf="quote.device; else noDevice">
              <mat-icon>devices</mat-icon>
              <span>{{ formatDevice(quote) }}</span>
            </div>
            <ng-template #noDevice>-</ng-template>
          </ng-template>

          <ng-template appDataTableCell="total" let-quote>
            <span class="text-strong">{{ formatMoney(quote.totalAmount, quote.currency) }}</span>
          </ng-template>

          <ng-template appDataTableCell="actions" let-quote>
            <div class="actions">
              <button mat-stroked-button color="primary" type="button" (click)="openDetail(quote)">
                <mat-icon>visibility</mat-icon>
                <span>รายละเอียด</span>
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
        display: flex;
        flex-direction: column;
        gap: 18px;
        padding: 24px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        gap: 16px;
        flex-wrap: wrap;
      }
      .hero {
        display: flex;
        flex: 1 1 360px;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        padding: 18px 20px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.05) 100%);
        border: 1px solid rgba(59, 130, 246, 0.2);
      }
      .hero__title {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .hero__title mat-icon {
        font-size: 32px;
        width: 36px;
        height: 36px;
        color: #1d4ed8;
      }
      .hero__title h2 {
        margin: 0 0 4px;
        font-size: 22px;
      }
      .hero__title p {
        margin: 0;
        color: #4a5568;
        font-size: 14px;
      }
      .hero__stats {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .hero__stat {
        min-width: 90px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 12px;
        padding: 10px;
        text-align: center;
        border: 1px solid rgba(59, 130, 246, 0.12);
      }
      .hero__stat label {
        display: block;
        font-size: 12px;
        color: #4a5568;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .hero__stat strong {
        font-size: 18px;
        color: #1e293b;
      }
      .card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .filter-card form {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        align-items: center;
      }
      .filter-card mat-form-field {
        min-width: 200px;
        flex: 1 1 200px;
      }
      .card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .header-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .card__header h3 {
        margin: 0;
      }
      .muted {
        color: #718096;
        font-size: 13px;
        margin: 2px 0 0;
      }
      .status-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 600;
      }
      .status-chip mat-icon {
        font-size: 16px;
      }
      .status--draft {
        background: rgba(148, 163, 184, 0.18);
        color: #475569;
      }
      .status--pending {
        background: rgba(59, 130, 246, 0.18);
        color: #1d4ed8;
      }
      .status--approved {
        background: rgba(34, 197, 94, 0.18);
        color: #166534;
      }
      .status--rejected {
        background: rgba(248, 113, 113, 0.18);
        color: #b91c1c;
      }
      .status--expired {
        background: rgba(107, 114, 128, 0.18);
        color: #4b5563;
      }
      .customer-cell,
      .device-cell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .customer-cell mat-icon,
      .device-cell mat-icon {
        font-size: 18px;
        color: rgba(59, 130, 246, 0.8);
      }
      .text-strong {
        font-weight: 600;
        color: #1e293b;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      .error {
        margin: 0;
        color: #d32f2f;
      }
      @media (max-width: 720px) {
        .page {
          padding: 16px;
        }
        .hero {
          flex-direction: column;
          align-items: flex-start;
        }
        .hero__stats {
          width: 100%;
          justify-content: space-between;
        }
        .filter-card mat-form-field {
          flex: 1 1 100%;
        }
      }
    `,
  ],
})
export class QuoteListComponent implements OnInit {
  private readonly api = inject(QuoteApiService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = inject(DatePipe);

  readonly quotes = signal<Quote[]>([]);
  readonly meta = signal<{ total: number; limit: number; offset: number }>({ total: 0, limit: 10, offset: 0 });
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filters = signal<{
    statuses: QuoteStatus[];
    dateFrom: Date | null;
    dateTo: Date | null;
    currency: string;
  }>({ statuses: [], dateFrom: null, dateTo: null, currency: 'THB' });

  readonly pagination = signal<{ pageIndex: number; pageSize: number }>({ pageIndex: 0, pageSize: 10 });
  readonly pageSizeOptions = [5, 10, 25, 50];

  readonly statusFilters: Array<{ value: QuoteStatus; label: string }> = [
    { value: 'draft', label: 'ฉบับร่าง' },
    { value: 'pending', label: 'รออนุมัติ' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'rejected', label: 'ถูกปฏิเสธ' },
    { value: 'expired', label: 'หมดอายุ' },
  ];

  readonly statusMeta: Record<QuoteStatus, { label: string; className: string; icon: string }> = {
    draft: { label: 'ฉบับร่าง', className: 'status--draft', icon: 'drafts' },
    pending: { label: 'รออนุมัติ', className: 'status--pending', icon: 'hourglass_top' },
    approved: { label: 'อนุมัติแล้ว', className: 'status--approved', icon: 'verified' },
    rejected: { label: 'ถูกปฏิเสธ', className: 'status--rejected', icon: 'cancel' },
    expired: { label: 'หมดอายุ', className: 'status--expired', icon: 'history_toggle_off' },
  };

  readonly columns: DataTableColumn<Quote>[] = [
    { key: 'quoteNumber', label: 'เลขที่ใบเสนอราคา', sortable: false },
    { key: 'status', label: 'สถานะ', sortable: false },
    { key: 'customer', label: 'ลูกค้า', sortable: false },
    { key: 'device', label: 'อุปกรณ์', sortable: false },
    {
      key: 'createdAt',
      label: 'สร้างเมื่อ',
      accessor: (quote) => this.datePipe.transform(quote.createdAt, 'dd/MM/yyyy HH:mm'),
    },
    {
      key: 'total',
      label: 'ยอดสุทธิ',
      accessor: (quote) => this.formatMoney(quote.totalAmount, quote.currency),
      align: 'end',
    },
    { key: 'actions', label: 'เครื่องมือ', sortable: false, align: 'end' },
  ];

  ngOnInit(): void {
    this.load();
  }

  refresh(): void {
    this.load();
  }

  applyFilters(form: NgForm): void {
    if (form.invalid) {
      return;
    }
    this.pagination.set({ pageIndex: 0, pageSize: this.pagination().pageSize });
    this.load();
  }

  setStatuses(statuses: QuoteStatus[]): void {
    this.filters.update((current) => ({ ...current, statuses }));
  }

  setDateFrom(date: Date | null): void {
    this.filters.update((current) => ({ ...current, dateFrom: date }));
  }

  setDateTo(date: Date | null): void {
    this.filters.update((current) => ({ ...current, dateTo: date }));
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pagination.set({ pageIndex: event.pageIndex, pageSize: event.pageSize });
    this.load();
  }

  countByStatus(status: QuoteStatus): number {
    return this.quotes().filter((quote) => quote.status === status).length;
  }

  openDetail(quote: Quote): void {
    this.dialog.open<QuoteDetailDialogComponent, QuoteDetailDialogData>(QuoteDetailDialogComponent, {
      width: '960px',
      maxWidth: '95vw',
      data: { quote },
    });
  }

  openCreate(): void {
    this.dialog
      .open<QuoteCreateDialogComponent, void, Quote>(QuoteCreateDialogComponent, {
        width: '960px',
        maxWidth: '95vw',
        disableClose: true,
      })
      .afterClosed()
      .pipe(rxFilter((created): created is Quote => Boolean(created)))
      .subscribe((created) => {
        this.snackbar.open(`สร้างใบเสนอราคา ${created.quoteNumber} สำเร็จ`, 'ปิด', { duration: 3500 });
        this.load();
      });
  }

  formatCustomer(quote: Quote): string {
    if (!quote.customer) {
      return '-';
    }
    const name = [quote.customer.firstName, quote.customer.lastName].filter(Boolean).join(' ');
    return name || quote.customer.email || '-';
  }

  formatDevice(quote: Quote): string {
    if (!quote.device) {
      return '-';
    }
    const parts = [quote.device.type, quote.device.brand, quote.device.modelName].filter(Boolean);
    return parts.length ? parts.join(' · ') : quote.device.type;
  }

  formatMoney(amount: number, currency: string): string {
    const symbol = this.currencySymbol(currency);
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  statusClass(status: QuoteStatus): string {
    return this.statusMeta[status]?.className ?? 'status--draft';
  }

  statusIcon(status: QuoteStatus): string {
    return this.statusMeta[status]?.icon ?? 'info';
  }

  statusLabel(status: QuoteStatus): string {
    return this.statusMeta[status]?.label ?? status;
  }

  private currencySymbol(code: string): string {
    switch (code?.toUpperCase()) {
      case 'USD':
        return '$';
      case 'EUR':
        return '€';
      case 'JPY':
        return '¥';
      case 'GBP':
        return '£';
      case 'THB':
      default:
        return '฿';
    }
  }

  private load(): void {
    const { pageIndex, pageSize } = this.pagination();
    const params: QuoteListParams = {
      limit: pageSize,
      offset: pageIndex * pageSize,
      status: this.filters().statuses,
      dateFrom: this.filters().dateFrom ?? undefined,
      dateTo: this.filters().dateTo ?? undefined,
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    this.api
      .list(params)
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.quotes.set(res.data);
          const firstCurrency = res.data[0]?.currency ?? this.filters().currency;
          this.filters.update((current) => ({ ...current, currency: firstCurrency ?? 'THB' }));
          this.meta.set({
            total: typeof res.meta.total === 'number' ? res.meta.total : res.data.length,
            limit: params.limit ?? 10,
            offset: params.offset ?? 0,
          });
        },
        error: () => {
          this.quotes.set([]);
          this.meta.set({ total: 0, limit: pageSize, offset: 0 });
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลใบเสนอราคาได้');
          this.snackbar.open('โหลดข้อมูลใบเสนอราคาไม่สำเร็จ', 'ปิด', { duration: 3500 });
        },
      });
  }
}

