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
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceCategoryApiService } from './services/device-category-api.service';
import { DeviceCategory, DeviceCategoryPayload } from './models/device-category.model';

export interface DeviceCategoryDialogData {
  mode: 'create' | 'edit';
  category?: DeviceCategory;
}

export interface DeviceCategoryDialogResult {
  mode: 'create' | 'edit';
  category: DeviceCategory;
}

@Component({
  selector: 'app-device-category-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>{{ isEdit ? 'edit' : 'category' }}</mat-icon>
      <span>{{ isEdit ? 'แก้ไขหมวดหมู่' : 'สร้างหมวดหมู่ใหม่' }}</span>
    </h2>

    <form
      [formGroup]="form"
      (ngSubmit)="submit()"
      mat-dialog-content
      class="dialog-form"
      id="device-category-form"
    >
      <mat-form-field appearance="outline">
        <mat-label>ชื่อหมวดหมู่</mat-label>
        <input matInput formControlName="name" required autocomplete="off" />
        <mat-error *ngIf="form.controls.name.hasError('required')"
          >กรุณาระบุชื่อหมวดหมู่</mat-error
        >
        <mat-error *ngIf="form.controls.name.hasError('maxlength')"
          >ชื่อหมวดหมู่ยาวเกินกำหนด</mat-error
        >
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>รายละเอียด</mat-label>
        <textarea matInput rows="3" formControlName="description"></textarea>
        <mat-error *ngIf="form.controls.description.hasError('maxlength')"
          >รายละเอียดต้องไม่เกิน 255 ตัวอักษร</mat-error
        >
      </mat-form-field>

      <mat-slide-toggle formControlName="isActive">เปิดใช้งานหมวดหมู่นี้</mat-slide-toggle>

      <p class="error" *ngIf="error()">{{ error() }}</p>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()" [disabled]="loading()">
        ยกเลิก
      </button>
      <button
        mat-flat-button
        color="primary"
        type="submit"
        form="device-category-form"
        [disabled]="form.invalid || loading()"
      >
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
export class DeviceCategoryFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(DeviceCategoryApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialogRef =
    inject<MatDialogRef<DeviceCategoryFormDialogComponent, DeviceCategoryDialogResult | undefined>>(
      MatDialogRef,
    );
  readonly data = inject<DeviceCategoryDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = this.data.mode === 'edit';
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
    isActive: [true],
  });

  constructor() {
    if (this.data.category) {
      const category = this.data.category;
      this.form.patchValue({
        name: category.name,
        description: category.description ?? '',
        isActive: category.isActive,
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

    const request$ =
      this.isEdit && this.data.category
        ? this.api.update(this.data.category.id, payload)
        : this.api.create(payload);

    request$
      .pipe(finalize(() => this.loading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (category) => {
          this.dialogRef.close({ mode: this.isEdit ? 'edit' : 'create', category });
        },
        error: (err) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const message = (err as any)?.error?.error ?? 'ไม่สามารถบันทึกหมวดหมู่ได้';
          this.error.set(typeof message === 'string' ? message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  private toPayload(): DeviceCategoryPayload {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description?.trim() || undefined,
      isActive: value.isActive,
    };
  }
}

