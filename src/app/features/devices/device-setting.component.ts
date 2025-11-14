import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import {
  DataTableCellDirective,
  DataTableColumn,
  DataTableComponent,
} from '../../shared/components/data-table/data-table.component';
import { DeviceSettingFormDialogComponent } from './device-setting-form-dialog.component';
import { DeviceApiService, DeviceWithCategory } from './services/device-api.service';
import { CustomerDevice } from '../customers/models/customer.model';
import {
  deviceSettingsSignal,
  deviceSettingsLoadingSignal,
  deviceSettingsSelectedSignal,
  deviceSettingsTotalSignal,
} from './store/device-setting.signal';

@Component({
  selector: 'app-device-setting',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    DataTableComponent,
    DataTableCellDirective,
  ],
  template: `
    <section class="page">
      <header class="page-header">
        <div class="page-header__title">
          <mat-icon class="page-header__icon">build</mat-icon>
          <div>
            <h1>ตั้งค่าอุปกรณ์</h1>
            <p>กำหนดประเภทอุปกรณ์และสถานะเพื่อใช้งานในการซ่อมและใบเสนอราคา</p>
          </div>
        </div>
        <button mat-flat-button color="primary" (click)="createDevice()" [disabled]="loading()">
          <mat-icon>add</mat-icon>
          เพิ่มอุปกรณ์
        </button>
      </header>

      <section class="card filters-card">
        <form [formGroup]="filterForm" class="filters" autocomplete="off">
          <mat-form-field appearance="outline" class="filters__field">
            <mat-label>ค้นหา</mat-label>
            <input matInput formControlName="query" placeholder="ประเภท, ยี่ห้อ, รุ่น" />
            <button
              *ngIf="filterForm.controls.query.value"
              matSuffix
              mat-icon-button
              type="button"
              (click)="filterForm.controls.query.setValue('')"
            >
              <mat-icon>clear</mat-icon>
            </button>
          </mat-form-field>

          <mat-slide-toggle formControlName="showActiveOnly">
            แสดงเฉพาะอุปกรณ์ที่เปิดใช้งาน
          </mat-slide-toggle>
        </form>
      </section>

      <section class="card">
        <header class="card__header">
          <h3>รายการอุปกรณ์ ({{ total() }})</h3>
          <p class="muted">จัดการอุปกรณ์และหมวดหมู่เพื่อใช้งานในการซ่อมและใบเสนอราคา</p>
        </header>

        <app-data-table
          [data]="items()"
          [columns]="columns"
          [dense]="true"
          [loading]="loading()"
          [length]="total()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="pageSizeOptions"
          [paginator]="true"
          [trackBy]="trackById"
          (pageChange)="pageChanged($event)"
          [emptyMessage]="emptyMessage"
        >
          <ng-template appDataTableCell="index" let-item let-index="index">
            {{ tableOffset() + index + 1 }}
          </ng-template>

          <ng-template appDataTableCell="name" let-item>
            {{ item.name || '—' }}
          </ng-template>

          <ng-template appDataTableCell="type" let-item>
            <div class="name-cell">
              <span class="name-cell__title">{{ formatDeviceType(item) }}</span>
            </div>
          </ng-template>

          <ng-template appDataTableCell="category" let-item>
            {{ item.category?.name || '—' }}
          </ng-template>

          <ng-template appDataTableCell="status" let-item>
            <span [class]="'status-badge status-' + (item.status || 'active')">
              {{ getStatusLabel(item.status) }}
            </span>
          </ng-template>

          <ng-template appDataTableCell="isActive" let-item>
            <mat-slide-toggle
              [checked]="item.status === 'active'"
              [disabled]="loading()"
              color="primary"
              (change)="toggleStatus(item)"
            ></mat-slide-toggle>
          </ng-template>

          <ng-template appDataTableCell="serialNumber" let-item>
            {{ item.serialNumber || '—' }}
          </ng-template>


          <ng-template appDataTableCell="createdAt" let-item>
            {{ item.createdAt | date: 'dd/MM/yy HH:mm' }}
          </ng-template>

          <ng-template appDataTableCell="updatedAt" let-item>
            {{ item.updatedAt | date: 'dd/MM/yy HH:mm' }}
          </ng-template>

          <ng-template appDataTableCell="actions" let-item>
            <div class="table-tools">
              <button mat-icon-button color="primary" matTooltip="แก้ไข" (click)="editDevice(item)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" matTooltip="ลบ" (click)="deleteDevice(item)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 16px;
      }
      .page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .page-header__title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .page-header__icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: rgba(25, 118, 210, 0.85);
      }
      .page-header__title h1 {
        margin: 0;
        font-size: 24px;
      }
      .page-header__title p {
        margin: 4px 0 0;
        color: rgba(0, 0, 0, 0.6);
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
      .filters {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      .filters__field {
        flex: 1 1 320px;
        min-width: 240px;
      }
      .card__header {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .card__header h3 {
        margin: 0;
        font-size: 18px;
      }
      .muted {
        color: #718096;
        font-size: 13px;
        margin: 0;
      }
      .name-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .name-cell__title {
        font-weight: 600;
      }
      .name-cell__status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.54);
      }
      .name-cell__status.is-active {
        color: #2e7d32;
      }
      .table-tools {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .status-toggle {
        padding: 4px 0;
      }
      ::ng-deep .status-toggle {
        padding: 4px 0;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }
      .status-active {
        background-color: #e8f5e9;
        color: #2e7d32;
      }
      .status-inactive {
        background-color: #ffebee;
        color: #c62828;
      }
      .status-repair {
        background-color: #fff3e0;
        color: #ef6c00;
      }
      .status-sold {
        background-color: #f3e5f5;
        color: #7b1fa2;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceSettingComponent implements OnInit {
  private readonly api = inject(DeviceApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly loading = deviceSettingsLoadingSignal;
  readonly items = deviceSettingsSignal;
  readonly total = deviceSettingsTotalSignal;
  readonly selected = deviceSettingsSelectedSignal;

  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions: number[] = [10, 20, 50];
  readonly emptyMessage = 'ยังไม่มีอุปกรณ์';

  readonly tableOffset = computed(() => this.pageIndex() * this.pageSize());

  readonly columns: DataTableColumn<DeviceWithCategory>[] = [
    { key: 'index', label: '#', align: 'center', sortable: false },
    { key: 'name', label: 'ชื่ออุปกรณ์', align: 'start', sortable: true },
    { key: 'type', label: 'ประเภท/ยี่ห้อ/รุ่น', align: 'start', sortable: true },
    { key: 'category', label: 'หมวดหมู่', align: 'start', sortable: false },
    { key: 'status', label: 'สถานะ', align: 'center', sortable: true },
    { key: 'isActive', label: 'การใช้งาน', align: 'center', sortable: false },
    { key: 'serialNumber', label: 'หมายเลขเครื่อง', align: 'start', sortable: true },
    { key: 'createdAt', label: 'สร้างเมื่อ', align: 'start', sortable: true },
    { key: 'updatedAt', label: 'อัปเดตเมื่อ', align: 'start', sortable: true },
    { key: 'actions', label: 'เครื่องมือ', align: 'center', sortable: false },
  ];

  readonly filterForm = this.fb.nonNullable.group({
    query: [''],
    showActiveOnly: [false],
  });

  ngOnInit(): void {
    // Initial load
    this.executeFetch();

    this.filterForm.controls.query.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetPaging());

    this.filterForm.controls.showActiveOnly.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetPaging());
  }

  pageChanged(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.executeFetch();
  }

  createDevice(): void {
    this.dialog
      .open(DeviceSettingFormDialogComponent, {
        width: '500px',
        data: { mode: 'create' },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.mode === 'create') {
          this.openSnack('สร้างอุปกรณ์สำเร็จ');
          this.executeFetch();
        }
      });
  }

  editDevice(device: DeviceWithCategory): void {
    deviceSettingsSelectedSignal.set(device);
    this.dialog
      .open(DeviceSettingFormDialogComponent, {
        width: '500px',
        data: { mode: 'edit', device },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.mode === 'edit') {
          this.openSnack('อัปเดตอุปกรณ์สำเร็จ');
          this.executeFetch();
        }
        deviceSettingsSelectedSignal.set(null);
      });
  }

  toggleStatus(device: DeviceWithCategory): void {
    if (!device.customerId) {
      this.openSnack('ไม่สามารถเปลี่ยนสถานะได้ เนื่องจากไม่มีข้อมูลลูกค้า', true);
      return;
    }
    const newStatus: 'active' | 'inactive' = device.status === 'active' ? 'inactive' : 'active';
    this.setLoading(true);
    this.api
      .update(device.id, device.customerId, { status: newStatus })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.openSnack(newStatus === 'active' ? 'เปิดใช้งานอุปกรณ์สำเร็จ' : 'ปิดใช้งานอุปกรณ์สำเร็จ');
          this.executeFetch();
        },
        error: (err) => {
          this.handleError(err, 'ไม่สามารถเปลี่ยนสถานะได้');
          this.setLoading(false);
        },
      });
  }

  deleteDevice(device: DeviceWithCategory): void {
    if (!confirm(`ต้องการลบอุปกรณ์ "${this.formatDeviceType(device)}" หรือไม่?`)) {
      return;
    }
    if (!device.customerId) {
      this.openSnack('ไม่สามารถลบอุปกรณ์ได้ เนื่องจากไม่มีข้อมูลลูกค้า', true);
      return;
    }
    this.setLoading(true);
    this.api
      .delete(device.id, device.customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.openSnack('ลบอุปกรณ์สำเร็จ');
          this.executeFetch();
        },
        error: (err) => {
          this.handleError(err, 'ไม่สามารถลบอุปกรณ์ได้');
          this.setLoading(false);
        },
      });
  }

  formatDeviceType(device: DeviceWithCategory): string {
    const parts = [device.type, device.brand, device.modelName].filter(Boolean);
    return parts.length ? parts.join(' · ') : device.type;
  }

  getStatusLabel(status?: 'active' | 'inactive' | 'repair' | 'sold'): string {
    const labels: Record<string, string> = {
      active: 'ใช้งาน',
      inactive: 'ไม่ใช้งาน',
      repair: 'ซ่อม',
      sold: 'ขายแล้ว',
    };
    return labels[status || 'active'] || 'ใช้งาน';
  }

  trackById(_: number, item: DeviceWithCategory): number {
    return item.id;
  }

  private executeFetch(): void {
    const { query, showActiveOnly } = this.filterForm.getRawValue();
    this.fetchDevices({
      query: query ?? undefined,
      limit: this.pageSize(),
      offset: this.pageIndex() * this.pageSize(),
    }, showActiveOnly);
  }

  private fetchDevices(options: { query?: string; limit: number; offset: number }, showActiveOnly: boolean): void {
    this.setLoading(true);
    this.api
      .listAll(options)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          let filtered = response.data;
          if (showActiveOnly) {
            filtered = filtered.filter((d) => d.status === 'active');
          }
          deviceSettingsSignal.set(filtered);
          deviceSettingsTotalSignal.set(filtered.length);
          this.setLoading(false);
        },
        error: (err) => {
          this.handleError(err, 'โหลดอุปกรณ์ไม่สำเร็จ');
          this.setLoading(false);
        },
      });
  }

  private resetPaging(): void {
    this.pageIndex.set(0);
    this.executeFetch();
  }

  private setLoading(value: boolean): void {
    deviceSettingsLoadingSignal.set(value);
  }

  private handleError(err: unknown, fallbackMessage: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (err as any)?.error?.error ?? fallbackMessage;
    this.openSnack(typeof message === 'string' ? message : fallbackMessage, true);
  }

  private openSnack(message: string, isError = false): void {
    this.snackBar.open(message, 'ปิด', {
      duration: isError ? undefined : 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}

