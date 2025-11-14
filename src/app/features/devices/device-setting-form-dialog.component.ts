import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceApiService, DevicePayload, DeviceWithCategory } from './services/device-api.service';
import { CustomerDevice } from '../customers/models/customer.model';
import { DeviceCategoryApiService } from '../device-categories/services/device-category-api.service';
import { DeviceCategory } from '../device-categories/models/device-category.model';
import { CustomerApiService } from '../customers/services/customer-api.service';
import { Customer } from '../customers/models/customer.model';

export interface DeviceSettingDialogData {
  mode: 'create' | 'edit';
  device?: DeviceWithCategory;
}

export interface DeviceSettingDialogResult {
  mode: 'create' | 'edit';
  device: DeviceWithCategory;
}

@Component({
  selector: 'app-device-setting-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ isEdit ? 'edit' : 'add' }}</mat-icon>
      <span>{{ isEdit ? 'แก้ไขอุปกรณ์' : 'สร้างอุปกรณ์' }}</span>
    </h2>

    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-form" id="device-setting-form">
      <mat-form-field appearance="outline">
        <mat-label>ลูกค้า</mat-label>
        <mat-select formControlName="customerId" required>
          <mat-option *ngIf="customerLoading()" disabled>กำลังโหลด...</mat-option>
          <mat-option *ngFor="let customer of customers()" [value]="customer.id">
            {{ formatCustomer(customer) }}
          </mat-option>
        </mat-select>
        <mat-error *ngIf="form.controls.customerId.hasError('required')">กรุณาเลือกลูกค้า</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>หมวดหมู่</mat-label>
        <mat-select formControlName="categoryId">
          <mat-option [value]="null">ไม่ระบุ</mat-option>
          <mat-option *ngFor="let category of categories()" [value]="category.id">
            {{ category.name }}
          </mat-option>
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>ชื่ออุปกรณ์</mat-label>
        <input matInput formControlName="name" autocomplete="off" />
        <mat-error *ngIf="form.controls.name.hasError('maxlength')">ชื่ออุปกรณ์ต้องไม่เกิน 100 ตัวอักษร</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>ประเภท</mat-label>
        <input matInput formControlName="type" required autocomplete="off" />
        <mat-error *ngIf="form.controls.type.hasError('required')">กรุณาระบุประเภท</mat-error>
        <mat-error *ngIf="form.controls.type.hasError('maxlength')">ประเภทต้องไม่เกิน 50 ตัวอักษร</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>ยี่ห้อ</mat-label>
        <input matInput formControlName="brand" autocomplete="off" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>รุ่น</mat-label>
        <input matInput formControlName="modelName" autocomplete="off" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>หมายเลขเครื่อง</mat-label>
        <input matInput formControlName="serialNumber" autocomplete="off" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>สถานะ</mat-label>
        <mat-select formControlName="status">
          <mat-option value="active">ใช้งาน</mat-option>
          <mat-option value="inactive">ไม่ใช้งาน</mat-option>
          <mat-option value="repair">ซ่อม</mat-option>
          <mat-option value="sold">ขายแล้ว</mat-option>
        </mat-select>
      </mat-form-field>

      <p class="error" *ngIf="error()">{{ error() }}</p>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()" [disabled]="loading()">
        ยกเลิก
      </button>
      <button mat-flat-button color="primary" type="submit" form="device-setting-form" [disabled]="form.invalid || loading()">
        <mat-icon>{{ isEdit ? 'save' : 'check' }}</mat-icon>
        <span>{{ isEdit ? 'บันทึก' : 'สร้าง' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 480px;
      }
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
      }
      .error {
        color: #d32f2f;
        font-size: 13px;
        margin: 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceSettingFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DeviceApiService);
  private readonly categoryApi = inject(DeviceCategoryApiService);
  private readonly customerApi = inject(CustomerApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<DeviceSettingFormDialogComponent, DeviceSettingDialogResult | undefined>>(MatDialogRef);
  readonly data = inject<DeviceSettingDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = this.data.mode === 'edit';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly categories = signal<DeviceCategory[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly customerLoading = signal(false);

  readonly form = this.fb.group({
    customerId: [null as number | null, [Validators.required]],
    categoryId: [null as number | null],
    name: ['', [Validators.maxLength(100)]],
    type: ['', [Validators.required, Validators.maxLength(50)]],
    brand: ['', [Validators.maxLength(100)]],
    modelName: ['', [Validators.maxLength(100)]],
    modelNumber: ['', [Validators.maxLength(100)]],
    serialNumber: ['', [Validators.maxLength(100)]],
    status: ['active' as 'active' | 'inactive' | 'repair' | 'sold'],
    problemDetails: ['', [Validators.maxLength(2000)]],
    notes: ['', [Validators.maxLength(2000)]],
  });

  constructor() {
    this.loadCategories();
    this.loadCustomers();
    if (this.data.device) {
      const item = this.data.device;
      this.form.patchValue({
        customerId: item.customerId ?? null,
        categoryId: item.categoryId ?? null,
        name: item.name ?? '',
        type: item.type ?? '',
        brand: item.brand ?? '',
        modelName: item.modelName ?? '',
        modelNumber: item.modelNumber ?? '',
        serialNumber: item.serialNumber ?? '',
        status: item.status ?? 'active',
        problemDetails: item.problemDetails ?? '',
        notes: item.notes ?? '',
      });
    }
  }

  private loadCategories(): void {
    this.categoryApi
      .list({ isActive: true, limit: 1000 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.categories.set(response.data);
        },
        error: () => {
          this.categories.set([]);
        },
      });
  }

  private loadCustomers(): void {
    this.customerLoading.set(true);
    this.customerApi
      .list(50, 0, undefined, 'active')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.customers.set(res.data);
          this.customerLoading.set(false);
        },
        error: () => {
          this.customers.set([]);
          this.customerLoading.set(false);
        },
      });
  }

  formatCustomer(customer: Customer): string {
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
    return fullName || customer.companyName || customer.email || `Customer #${customer.id}`;
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    const payload = this.toPayload();
    const customerId = this.form.controls.customerId.value;
    if (!customerId) {
      this.error.set('กรุณาเลือกลูกค้า');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const request$ =
      this.isEdit && this.data.device
        ? this.api.update(this.data.device.id, customerId, payload)
        : this.api.create(customerId, payload);

    request$
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (device) => {
          this.dialogRef.close({ mode: this.isEdit ? 'edit' : 'create', device });
        },
        error: (err) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message = (err as any)?.error?.error ?? 'ไม่สามารถบันทึกอุปกรณ์ได้';
          this.error.set(typeof message === 'string' ? message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  private toPayload(): DevicePayload {
    const value = this.form.getRawValue();
    return {
      categoryId: value.categoryId ?? undefined,
      name: value.name?.trim() || undefined,
      type: (value.type ?? '').trim(),
      brand: value.brand?.trim() || undefined,
      modelName: value.modelName?.trim() || undefined,
      modelNumber: value.modelNumber?.trim() || undefined,
      serialNumber: value.serialNumber?.trim() || undefined,
      status: value.status ?? 'active',
      problemDetails: value.problemDetails?.trim() || undefined,
      notes: value.notes?.trim() || undefined,
    };
  }
}

