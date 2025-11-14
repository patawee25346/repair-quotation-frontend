import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Inject, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminUserApiService } from './services/admin-user-api.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

export interface UserResetPasswordDialogData {
  userId: number;
  username: string;
}

export interface UserResetPasswordDialogResult {
  reset: boolean;
}

@Component({
  selector: 'app-user-reset-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>lock_reset</mat-icon>
      <span>ตั้งรหัสผ่านใหม่</span>
    </h2>

    <form id="reset-password-form" [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-form">
      <p class="info">กำลังตั้งรหัสผ่านใหม่ให้กับผู้ใช้ <strong>{{ data.username }}</strong></p>

      <mat-form-field appearance="outline">
        <mat-label>รหัสผ่านใหม่</mat-label>
        <mat-icon matPrefix>lock</mat-icon>
        <input
          matInput
          type="password"
          formControlName="password"
          autocomplete="new-password"
          required
        />
        <mat-error *ngIf="form.controls.password.hasError('required')">กรุณากรอกรหัสผ่าน</mat-error>
        <mat-error *ngIf="form.controls.password.hasError('minlength')">ต้องมีอย่างน้อย 8 ตัวอักษร</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>ยืนยันรหัสผ่าน</mat-label>
        <mat-icon matPrefix>lock</mat-icon>
        <input
          matInput
          type="password"
          formControlName="confirmPassword"
          autocomplete="new-password"
          required
        />
        <mat-error *ngIf="form.controls.confirmPassword.hasError('required')">กรุณายืนยันรหัสผ่าน</mat-error>
        <mat-error *ngIf="passwordMismatch()">รหัสผ่านไม่ตรงกัน</mat-error>
      </mat-form-field>

      <p class="hint">รหัสผ่านต้องเป็นไปตามนโยบายความปลอดภัยของระบบ</p>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()" [disabled]="loading()">ยกเลิก</button>
      <button mat-flat-button color="primary" form="reset-password-form" type="submit" [disabled]="form.invalid || loading()">
        <mat-icon>check</mat-icon>
        <span>บันทึก</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        max-width: 420px;
      }
      h2 mat-icon {
        margin-right: 8px;
        vertical-align: middle;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
      }
      .info {
        margin: 0;
        font-size: 14px;
        color: #555;
      }
      .hint {
        font-size: 12px;
        color: #666;
        margin: 0;
      }
      .error {
        color: #f44336;
        margin: 0;
        font-size: 13px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserResetPasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UserResetPasswordDialogComponent, UserResetPasswordDialogResult | undefined>);
  private readonly api = inject(AdminUserApiService);
  private readonly destroyRef = inject(DestroyRef);

  constructor(@Inject(MAT_DIALOG_DATA) readonly data: UserResetPasswordDialogData) {}

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  passwordMismatch(): boolean {
    const { password, confirmPassword } = this.form.getRawValue();
    return password !== confirmPassword;
  }

  submit(): void {
    if (this.form.invalid || this.passwordMismatch()) {
      if (this.passwordMismatch()) {
        this.error.set('รหัสผ่านไม่ตรงกัน');
      }
      return;
    }

    const password = this.form.controls.password.value;
    this.loading.set(true);
    this.error.set(null);

    this.api
      .updateUser(this.data.userId, { password })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => this.dialogRef.close({ reset: true }),
        error: (err) => {
          const message = err?.error?.error ?? 'ไม่สามารถตั้งรหัสผ่านได้';
          this.error.set(typeof message === 'string' ? message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
