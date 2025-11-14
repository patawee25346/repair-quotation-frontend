import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CustomerApiService } from './services/customer-api.service';
import { Customer, CustomerPayload, CustomerStatus } from './models/customer.model';

export interface CustomerFormDialogData {
  mode: 'create' | 'edit';
  customer?: Customer;
}

export interface CustomerFormDialogResult {
  mode: 'create' | 'edit';
  customer: Customer;
}

@Component({
  selector: 'app-customer-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ isEdit ? 'edit' : 'person_add' }}</mat-icon>
      <span>{{ isEdit ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่' }}</span>
    </h2>

    <form [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-form" id="customer-form">
      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>ชื่อ</mat-label>
          <mat-icon matPrefix>person</mat-icon>
          <input matInput formControlName="firstName" autocomplete="given-name" required />
          <mat-error *ngIf="form.controls.firstName.hasError('required')">กรุณากรอกชื่อ</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>นามสกุล</mat-label>
          <mat-icon matPrefix>person</mat-icon>
          <input matInput formControlName="lastName" autocomplete="family-name" required />
          <mat-error *ngIf="form.controls.lastName.hasError('required')">กรุณากรอกนามสกุล</mat-error>
        </mat-form-field>
      </div>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>ชื่อบริษัท</mat-label>
          <mat-icon matPrefix>business</mat-icon>
          <input matInput formControlName="companyName" autocomplete="organization" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>สถานะ</mat-label>
          <mat-icon matPrefix>toggle_on</mat-icon>
          <mat-select formControlName="status" required>
            <mat-select-trigger>
              <span class="select-trigger">
                <mat-icon>{{ statusOption(form.controls.status.value).icon }}</mat-icon>
                <span>{{ statusOption(form.controls.status.value).label }}</span>
              </span>
            </mat-select-trigger>
            <mat-option *ngFor="let option of statusOptions" [value]="option.value">
              <div class="option-row">
                <mat-icon>{{ option.icon }}</mat-icon>
                <span>{{ option.label }}</span>
              </div>
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.controls.status.hasError('required')">กรุณาเลือกสถานะ</mat-error>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="form-field--full">
        <mat-label>อีเมล</mat-label>
        <mat-icon matPrefix>mail</mat-icon>
        <input matInput type="email" formControlName="email" autocomplete="email" required />
        <mat-error *ngIf="form.controls.email.hasError('email')">รูปแบบอีเมลไม่ถูกต้อง</mat-error>
        <mat-error *ngIf="form.controls.email.hasError('required')">กรุณากรอกอีเมล</mat-error>
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>เบอร์โทร</mat-label>
          <mat-icon matPrefix>call</mat-icon>
          <input matInput type="tel" formControlName="phoneNumber" autocomplete="tel" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>เบอร์สำรอง</mat-label>
          <mat-icon matPrefix>phone_in_talk</mat-icon>
          <input matInput type="tel" formControlName="alternatePhoneNumber" autocomplete="tel" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="form-field--full">
        <mat-label>เลขประจำตัวผู้เสียภาษี</mat-label>
        <mat-icon matPrefix>badge</mat-icon>
        <input matInput formControlName="taxId" autocomplete="off" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="form-field--full">
        <mat-label>ที่อยู่ (บรรทัด 1)</mat-label>
        <mat-icon matPrefix>home</mat-icon>
        <input matInput formControlName="addressLine1" autocomplete="address-line1" />
      </mat-form-field>

      <mat-form-field appearance="outline" class="form-field--full">
        <mat-label>ที่อยู่ (บรรทัด 2)</mat-label>
        <mat-icon matPrefix>home_work</mat-icon>
        <input matInput formControlName="addressLine2" autocomplete="address-line2" />
      </mat-form-field>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>ตำบล/แขวง</mat-label>
          <mat-icon matPrefix>location_city</mat-icon>
          <input matInput formControlName="subDistrict" autocomplete="address-level3" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>เขต/อำเภอ</mat-label>
          <mat-icon matPrefix>apartment</mat-icon>
          <input matInput formControlName="district" autocomplete="address-level2" />
        </mat-form-field>
      </div>

      <div class="form-row">
        <mat-form-field appearance="outline">
          <mat-label>จังหวัด</mat-label>
          <mat-icon matPrefix>map</mat-icon>
          <input matInput formControlName="province" autocomplete="address-level1" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>รหัสไปรษณีย์</mat-label>
          <mat-icon matPrefix>markunread_mailbox</mat-icon>
          <input matInput formControlName="postalCode" autocomplete="postal-code" />
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="form-field--full">
        <mat-label>หมายเหตุ</mat-label>
        <mat-icon matPrefix>notes</mat-icon>
        <textarea matInput rows="3" formControlName="notes"></textarea>
      </mat-form-field>

      <p class="error" *ngIf="error()">{{ error() }}</p>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()" [disabled]="loading()">
        ยกเลิก
      </button>
      <button mat-flat-button color="primary" type="submit" form="customer-form" [disabled]="form.invalid || loading()">
        <mat-icon>{{ isEdit ? 'save' : 'check' }}</mat-icon>
        <span>{{ isEdit ? 'บันทึก' : 'สร้างลูกค้า' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 540px;
      }
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
        width: 100%;
      }
      .form-row {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
      }
      .form-row mat-form-field {
        flex: 1 1 220px;
      }
      .form-field--full {
        width: 100%;
        flex: 1 1 100%;
      }
      .select-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .option-row {
        display: flex;
        align-items: center;
        gap: 8px;
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
export class CustomerFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<CustomerFormDialogComponent, CustomerFormDialogResult | undefined>);
  private readonly data = inject<CustomerFormDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(CustomerApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = this.data.mode === 'edit';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    companyName: ['', [Validators.maxLength(200)]],
    status: ['active' as CustomerStatus, [Validators.required]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.maxLength(32)]],
    alternatePhoneNumber: ['', [Validators.maxLength(32)]],
    addressLine1: ['', [Validators.maxLength(255)]],
    addressLine2: ['', [Validators.maxLength(255)]],
    subDistrict: ['', [Validators.maxLength(100)]],
    district: ['', [Validators.maxLength(100)]],
    province: ['', [Validators.maxLength(100)]],
    postalCode: ['', [Validators.maxLength(12)]],
    taxId: ['', [Validators.maxLength(32)]],
    notes: ['', [Validators.maxLength(2000)]],
  });

  readonly statusOptions: { value: CustomerStatus; label: string; icon: string }[] = [
    { value: 'active', label: 'เปิดใช้งาน', icon: 'toggle_on' },
    { value: 'inactive', label: 'ปิดการใช้งาน', icon: 'toggle_off' },
  ];

  constructor() {
    if (this.data.customer) {
      const customer = this.data.customer;
      this.form.patchValue({
        firstName: customer.firstName ?? '',
        lastName: customer.lastName ?? '',
        companyName: customer.companyName ?? '',
        status: customer.status ?? 'active',
        email: customer.email ?? '',
        phoneNumber: customer.phoneNumber ?? '',
        alternatePhoneNumber: customer.alternatePhoneNumber ?? '',
        addressLine1: customer.addressLine1 ?? '',
        addressLine2: customer.addressLine2 ?? '',
        subDistrict: customer.subDistrict ?? customer.district ?? '',
        district: customer.district ?? '',
        province: customer.province ?? '',
        postalCode: customer.postalCode ?? '',
        taxId: customer.taxId ?? '',
        notes: customer.notes ?? '',
      });
    }
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    const payload = this.toPayload();
    this.loading.set(true);
    this.error.set(null);

    const request$ = this.isEdit && this.data.customer
      ? this.api.update(this.data.customer.id, payload)
      : this.api.create(payload);

    request$
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (customer) => {
          this.dialogRef.close({ mode: this.isEdit ? 'edit' : 'create', customer });
        },
        error: (err) => {
          const message = err?.error?.error || 'ไม่สามารถบันทึกข้อมูลลูกค้าได้';
          this.error.set(typeof message === 'string' ? message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  private toPayload(): CustomerPayload {
    const value = this.form.getRawValue();
    return {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      phoneNumber: this.normalizeOptional(value.phoneNumber),
      alternatePhoneNumber: this.normalizeOptional(value.alternatePhoneNumber),
      addressLine1: this.normalizeOptional(value.addressLine1),
      addressLine2: this.normalizeOptional(value.addressLine2),
      subDistrict: this.normalizeOptional(value.subDistrict),
      district: this.normalizeOptional(value.district),
      province: this.normalizeOptional(value.province),
      postalCode: this.normalizeOptional(value.postalCode),
      companyName: this.normalizeOptional(value.companyName),
      taxId: this.normalizeOptional(value.taxId),
      notes: this.normalizeOptional(value.notes),
      status: value.status,
    };
  }

  statusOption(value: CustomerStatus | null | undefined) {
    return this.statusOptions.find((option) => option.value === value) ?? this.statusOptions[0];
  }

  private normalizeOptional(value: string | null | undefined): string | undefined {
    if (value == null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }
}
