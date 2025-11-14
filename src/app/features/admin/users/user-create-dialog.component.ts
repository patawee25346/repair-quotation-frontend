import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AdminUserApiService } from './services/admin-user-api.service';
import { UserRole, UserStatus } from './models/admin-user.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

export interface UserCreateDialogData {
  roleOptions: ReadonlyArray<UserRole>;
  statusOptions?: ReadonlyArray<UserStatus>;
}

export interface UserCreateDialogResult {
  created: boolean;
  username: string;
}

@Component({
  selector: 'app-user-create-dialog',
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
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>person_add</mat-icon>
      <span>สร้างผู้ใช้ใหม่</span>
    </h2>

    <form id="create-user-form" [formGroup]="form" (ngSubmit)="submit()" mat-dialog-content class="dialog-form">
      <mat-form-field appearance="outline">
        <mat-label>Username</mat-label>
        <mat-icon matPrefix>person</mat-icon>
        <input
          matInput
          formControlName="username"
          autocomplete="username"
          required
          minlength="3"
        />
        <mat-error *ngIf="form.controls.username.hasError('required')">กรุณากรอกชื่อผู้ใช้</mat-error>
        <mat-error *ngIf="form.controls.username.hasError('minlength')">ต้องมีอย่างน้อย 3 ตัวอักษร</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Password</mat-label>
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

      <mat-form-field appearance="outline">
        <mat-label>Role</mat-label>
        <mat-select formControlName="role" required>
          <mat-option *ngFor="let role of roleOptions" [value]="role">{{ role }}</mat-option>
        </mat-select>
        <mat-icon matSuffix>badge</mat-icon>
        <mat-error *ngIf="form.controls.role.hasError('required')">กรุณาเลือก role</mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>สถานะ</mat-label>
        <mat-select formControlName="status" required>
          <mat-option *ngFor="let status of statusOptions" [value]="status">
            {{ status === 'active' ? 'เปิดใช้งาน' : 'ปิดการใช้งาน' }}
          </mat-option>
        </mat-select>
        <mat-icon matSuffix>toggle_on</mat-icon>
        <mat-error *ngIf="form.controls.status.hasError('required')">กรุณาเลือกสถานะ</mat-error>
      </mat-form-field>

      <p class="hint">รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษรและเป็นไปตามนโยบายความปลอดภัย</p>
      <p class="error" *ngIf="error()">{{ error() }}</p>
    </form>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()" [disabled]="loading()">ยกเลิก</button>
      <button mat-flat-button color="primary" type="submit" form="create-user-form" [disabled]="form.invalid || loading()">
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
        max-width: 480px;
      }
      h2 mat-icon {
        vertical-align: middle;
        margin-right: 8px;
      }
      .dialog-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
        width: 100%;
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
export class UserCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<UserCreateDialogComponent, UserCreateDialogResult | undefined>);
  private readonly api = inject(AdminUserApiService);
  private readonly data = inject<UserCreateDialogData>(MAT_DIALOG_DATA);
  private readonly destroyRef = inject(DestroyRef);

  readonly roleOptions = this.data.roleOptions.length ? this.data.roleOptions : (['technician', 'customer', 'admin'] as UserRole[]);
  readonly statusOptions = this.data.statusOptions?.length ? this.data.statusOptions : (['active', 'inactive'] as UserStatus[]);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    role: [this.roleOptions[0], Validators.required],
    status: [this.statusOptions[0], Validators.required],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  passwordMismatch(): boolean {
    return this.form.value.password !== this.form.value.confirmPassword;
  }

  submit(): void {
    if (this.form.invalid || this.passwordMismatch()) {
      if (this.passwordMismatch()) {
        this.error.set('รหัสผ่านไม่ตรงกัน');
      }
      return;
    }

    const { username, password, role, status } = this.form.getRawValue();

    this.loading.set(true);
    this.error.set(null);

    this.api
      .createUser({ username, password, role, status })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (user) => {
          this.dialogRef.close({ created: true, username: user.username });
        },
        error: (err) => {
          const message = err?.error?.error ?? 'ไม่สามารถสร้างผู้ใช้ได้';
          this.error.set(typeof message === 'string' ? message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }
}
