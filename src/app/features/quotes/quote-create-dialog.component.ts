import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, inject, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { QuoteApiService } from './services/quote-api.service';
import type { Quote, QuoteCreatePayload } from './models/quote.model';
import { CustomerApiService } from '../customers/services/customer-api.service';
import type { Customer, CustomerDevice } from '../customers/models/customer.model';
import { DeviceApiService } from '../devices/services/device-api.service';

type QuoteItemFormGroup = FormGroup<{
  description: FormControl<string | null>;
  quantity: FormControl<number | null>;
  unitPrice: FormControl<number | null>;
}>;

type QuoteFormGroup = FormGroup<{
  customerId: FormControl<number | null>;
  deviceId: FormControl<number | null>;
  title: FormControl<string | null>;
  description: FormControl<string | null>;
  currency: FormControl<string | null>;
  laborCost: FormControl<number | null>;
  discount: FormControl<number | null>;
  taxRate: FormControl<number | null>;
  notes: FormControl<string | null>;
  validUntil: FormControl<Date | null>;
  items: FormArray<QuoteItemFormGroup>;
}>;

@Component({
  selector: 'app-quote-create-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    <form class="dialog-form" [formGroup]="form" (ngSubmit)="submit()">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>add_circle</mat-icon>
        <span>สร้างใบเสนอราคาใหม่</span>
      </h2>

      <mat-dialog-content class="dialog-content">
        <section class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>ลูกค้า <span class="required-asterisk">*</span></mat-label>
            <mat-select formControlName="customerId" (selectionChange)="handleCustomerChange($event.value)">
              <mat-option *ngIf="customerLoading()" disabled>กำลังโหลด...</mat-option>
              <mat-option *ngFor="let customer of customers()" [value]="customer.id">
                {{ formatCustomer(customer) }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="form.controls.customerId.hasError('required')">
              กรุณาเลือกชื่อลูกค้า
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>อุปกรณ์</mat-label>
            <mat-select formControlName="deviceId" [disabled]="deviceLoading() || !form.controls.customerId.value">
              <mat-option *ngIf="deviceLoading()" disabled>กำลังโหลด...</mat-option>
              <mat-option *ngIf="!deviceLoading() && !form.controls.customerId.value" disabled>
                กรุณาเลือกลูกค้าก่อน
              </mat-option>
              <mat-option *ngIf="!deviceLoading() && form.controls.customerId.value && !devices().length" disabled>
                ไม่มีข้อมูลอุปกรณ์ของลูกค้านี้
              </mat-option>
              <mat-option [value]="null">ไม่ระบุ</mat-option>
              <mat-option *ngFor="let device of devices()" [value]="device.id">
                {{ formatDevice(device) }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>หัวข้อ</mat-label>
            <input matInput formControlName="title" maxlength="150" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>สกุลเงิน <span class="required-asterisk">*</span></mat-label>
            <input matInput formControlName="currency" />
            <mat-error *ngIf="form.controls.currency.hasError('required')">
              กรุณาระบุสกุลเงิน
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>ค่าแรง</mat-label>
            <input matInput type="number" min="0" step="0.01" formControlName="laborCost" />
            <mat-error *ngIf="form.controls.laborCost.hasError('min')">
              ค่าแรงต้องไม่ติดลบ
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>ส่วนลด</mat-label>
            <input matInput type="number" min="0" step="0.01" formControlName="discount" />
            <mat-error *ngIf="form.controls.discount.hasError('min')">
              ส่วนลดต้องไม่ติดลบ
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>อัตราภาษี (%)</mat-label>
            <input matInput type="number" min="0" max="1" step="0.01" formControlName="taxRate" />
            <mat-error *ngIf="form.controls.taxRate.hasError('min') || form.controls.taxRate.hasError('max')">
              อัตราภาษีต้องอยู่ระหว่าง 0 ถึง 1
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>ใช้ได้ถึง</mat-label>
            <input
              matInput
              [matDatepicker]="validUntilPicker"
              formControlName="validUntil"
              (focus)="validUntilPicker.open()"
              (click)="validUntilPicker.open()"
            />
           
            <mat-datepicker-toggle matSuffix [for]="validUntilPicker"></mat-datepicker-toggle>
            <mat-datepicker touchUi #validUntilPicker></mat-datepicker>
          </mat-form-field>
        </section>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>คำอธิบาย</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>หมายเหตุ</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>

        <mat-divider></mat-divider>

        <section class="items-section">
          <header>
            <h3><mat-icon>view_list</mat-icon> รายการอะไหล่/บริการ</h3>
            <button mat-stroked-button color="primary" type="button" (click)="addItem()">
              <mat-icon>add</mat-icon>
              เพิ่มรายการ
            </button>
          </header>

          <div
            class="item-card"
            *ngFor="let itemGroup of items.controls; let index = index; trackBy: trackByIndex"
            [formGroup]="itemGroup"
          >
            <div class="item-card__header">
              <span>รายการที่ {{ index + 1 }}</span>
              <button mat-icon-button type="button" (click)="removeItem(index)" [disabled]="items.length === 1">
                <mat-icon>delete</mat-icon>
              </button>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>รายละเอียด <span class="required-asterisk">*</span></mat-label>
              <textarea matInput formControlName="description" rows="2"></textarea>
              <mat-error *ngIf="itemGroup.controls.description.hasError('required')">
                โปรดระบุรายละเอียดรายการ
              </mat-error>
              <mat-error *ngIf="itemGroup.controls.description.hasError('maxlength')">
                รายละเอียดต้องไม่เกิน 255 ตัวอักษร
              </mat-error>
            </mat-form-field>

            <div class="item-row">
              <mat-form-field appearance="outline">
                <mat-label>จำนวน <span class="required-asterisk">*</span></mat-label>
                <input matInput type="number" min="0.01" step="0.01" formControlName="quantity" />
                <mat-error *ngIf="itemGroup.controls.quantity.hasError('required')">
                  กรุณาระบุจำนวน
                </mat-error>
                <mat-error *ngIf="itemGroup.controls.quantity.hasError('min')">
                  จำนวนต้องมากกว่า 0
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>ราคาต่อหน่วย <span class="required-asterisk">*</span></mat-label>
                <input matInput type="number" min="0" step="0.01" formControlName="unitPrice" />
                <mat-error *ngIf="itemGroup.controls.unitPrice.hasError('required')">
                  กรุณาระบุราคา
                </mat-error>
                <mat-error *ngIf="itemGroup.controls.unitPrice.hasError('min')">
                  ราคาไม่สามารถติดลบ
                </mat-error>
              </mat-form-field>
            </div>
          </div>
        </section>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="close()" [disabled]="submitting()">ยกเลิก</button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="submitting() || form.invalid || !items.length"
        >
          <mat-icon>check_circle</mat-icon>
          สร้างใบเสนอราคา
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: min(960px, 100vw - 32px);
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 0;
        width: 100%;
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 18px;
        max-height: calc(90vh - 160px);
        overflow: auto;
        padding-top: 8px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .full-width {
        width: 100%;
      }
      .items-section header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .required-asterisk {
        color: #f44336;
        font-weight: 500;
      }
      
      /* Hide ALL Material's default required asterisks in this component - comprehensive approach */
      ::ng-deep .mat-mdc-form-field .mdc-floating-label--required::after,
      ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-required-marker,
      ::ng-deep .mat-mdc-text-field-wrapper .mdc-floating-label--required::after,
      ::ng-deep .mdc-text-field--required .mdc-floating-label::after,
      ::ng-deep .mdc-floating-label--required::after,
      ::ng-deep .mat-mdc-form-field-subscript-wrapper .mat-mdc-form-field-required-marker,
      ::ng-deep .mat-mdc-form-field-hint-wrapper .mat-mdc-form-field-required-marker {
        display: none !important;
        content: '' !important;
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        font-size: 0 !important;
        line-height: 0 !important;
        position: absolute !important;
        left: -9999px !important;
      }
      .items-section header h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 16px;
      }
      .item-card {
        border: 1px solid rgba(148, 163, 184, 0.3);
        border-radius: 12px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: #fff;
      }
      .item-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: #1e293b;
      }
      .item-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      @media (max-width: 600px) {
        .dialog-form {
          max-width: none;
        }
        .dialog-content {
          max-height: calc(100vh - 180px);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class QuoteCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<QuoteCreateDialogComponent, Quote | undefined>);
  private readonly quoteApi = inject(QuoteApiService);
  private readonly customerApi = inject(CustomerApiService);
  private readonly deviceApi = inject(DeviceApiService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly customers = signal<readonly Customer[]>([]);
  readonly devices = signal<readonly CustomerDevice[]>([]);
  readonly customerLoading = signal(false);
  readonly deviceLoading = signal(false);
  readonly submitting = signal(false);

  readonly form: QuoteFormGroup = this.fb.group({
    customerId: this.fb.control<number | null>(null, { validators: [Validators.required] }),
    deviceId: this.fb.control<number | null>(null),
    title: this.fb.control<string | null>(''),
    description: this.fb.control<string | null>(''),
    currency: this.fb.control<string | null>('THB', { validators: [Validators.required] }),
    laborCost: this.fb.control<number | null>(0, { validators: [Validators.min(0)] }),
    discount: this.fb.control<number | null>(0, { validators: [Validators.min(0)] }),
    taxRate: this.fb.control<number | null>(0, { validators: [Validators.min(0), Validators.max(1)] }),
    notes: this.fb.control<string | null>(''),
    validUntil: this.fb.control<Date | null>(new Date()),
    items: this.fb.array<QuoteItemFormGroup>([this.createItemGroup()]),
  });

  constructor() {
    this.loadCustomers();
    
    // Watch for customer changes and load devices
    this.form.controls.customerId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((customerId) => {
        if (customerId) {
          this.handleCustomerChange(customerId);
        } else {
        this.devices.set([]);
        this.form.controls.deviceId.setValue(null);
      }
    });
  }

  get items(): FormArray<QuoteItemFormGroup> {
    return this.form.controls.items;
  }

  trackByIndex(index: number): number {
    return index;
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length === 1) {
      return;
    }
    this.items.removeAt(index);
  }

  handleCustomerChange(customerId: number | null): void {
    if (!customerId) {
      this.devices.set([]);
      this.form.controls.deviceId.setValue(null);
      return;
    }

    this.deviceLoading.set(true);
    this.deviceApi
      .listByCustomer(customerId, { limit: 1000 })
      .pipe(
        finalize(() => this.deviceLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          console.log('Customer devices loaded:', response.data.length);
          this.devices.set(response.data);
          // Reset device selection if current device is not in the list
          const currentDeviceId = this.form.controls.deviceId.value;
          if (currentDeviceId && !response.data.find((d) => d.id === currentDeviceId)) {
            this.form.controls.deviceId.setValue(null);
          }
        },
        error: (err) => {
          console.error('Failed to load customer devices:', err);
          this.devices.set([]);
          this.form.controls.deviceId.setValue(null);
          this.snackbar.open('โหลดข้อมูลอุปกรณ์ไม่สำเร็จ', 'ปิด', { duration: 3500 });
        },
      });
  }

  formatDevice(device: CustomerDevice): string {
    const parts = [device.type, device.brand, device.modelName].filter(Boolean);
    return parts.length ? parts.join(' · ') : device.type;
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid || !this.items.length) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (raw.customerId == null) {
      this.snackbar.open('กรุณาเลือกลูกค้าก่อนสร้างใบเสนอราคา', 'ปิด', { duration: 3500 });
      return;
    }

    // Validate all items are complete
    const invalidItems = raw.items.filter(
      (item) =>
        !item.description?.trim() ||
        (this.toNumber(item.quantity) ?? 0) <= 0 ||
        (this.toNumber(item.unitPrice) ?? 0) < 0
    );
    if (invalidItems.length > 0) {
      this.snackbar.open('กรุณาตรวจสอบรายการ: ต้องมีคำอธิบาย, จำนวน > 0, และราคา >= 0', 'ปิด', { duration: 3500 });
      return;
    }

    // Sanitize items
    const sanitizedItems = raw.items.map((item) => ({
      description: item.description?.trim() ?? '',
      quantity: this.toNumber(item.quantity) ?? 0,
      unitPrice: this.toNumber(item.unitPrice) ?? 0,
    }));

    const payload: QuoteCreatePayload = {
      customerId: raw.customerId,
      deviceId: raw.deviceId ?? undefined,
      title: raw.title?.trim() ? raw.title.trim() : undefined,
      description: raw.description?.trim() ? raw.description.trim() : undefined,
      currency: raw.currency?.trim() || 'THB',
      laborCost: this.toNumber(raw.laborCost),
      discount: this.toNumber(raw.discount),
      taxRate: this.toNumber(raw.taxRate),
      notes: raw.notes?.trim() ? raw.notes.trim() : undefined,
      validUntil: raw.validUntil ?? undefined,
      items: sanitizedItems,
    };

    this.submitting.set(true);
    this.quoteApi
      .create({
        ...payload,
        items: sanitizedItems,
      })
      .pipe(
        finalize(() => this.submitting.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (quote: Quote) => {
          this.dialogRef.close(quote);
        },
        error: (err) => {
          console.error('Create quote error:', err);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errorMessage = (err as any)?.error?.error || 'สร้างใบเสนอราคาไม่สำเร็จ';
          this.snackbar.open(typeof errorMessage === 'string' ? errorMessage : 'สร้างใบเสนอราคาไม่สำเร็จ', 'ปิด', { duration: 3500 });
        },
      });
  }

  private createItemGroup(): QuoteItemFormGroup {
    return this.fb.group({
      description: this.fb.control<string | null>('', {
        validators: [Validators.required, Validators.maxLength(255)],
      }),
      quantity: this.fb.control<number | null>(1, {
        validators: [Validators.required, Validators.min(0.01)],
      }),
      unitPrice: this.fb.control<number | null>(0, {
        validators: [Validators.required, Validators.min(0)],
      }),
    });
  }

  private loadCustomers(): void {
    this.customerLoading.set(true);
    this.customerApi
      .list(50, 0, undefined, 'active')
      .pipe(
        finalize(() => this.customerLoading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.customers.set(res.data);
        },
        error: () => {
          this.snackbar.open('โหลดรายชื่อลูกค้าไม่สำเร็จ', 'ปิด', { duration: 3500 });
        },
      });
  }


  formatCustomer(customer: Customer): string {
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
    return fullName || customer.companyName || customer.email || `Customer #${customer.id}`;
  }


  private toNumber(value: number | null): number | undefined {
    if (value == null) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

