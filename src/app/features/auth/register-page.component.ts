import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from './services/auth-api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    NgFor,
    NgIf,
    RouterLink,
  ],
  template: `
    <div class="register-container">
      <mat-card>
        <h2>Register</h2>
        <form (ngSubmit)="submit(f)" #f="ngForm" novalidate>
          <mat-form-field class="full-width">
            <mat-label>Username</mat-label>
            <input matInput name="username" [(ngModel)]="username" required autocomplete="username" />
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Password</mat-label>
            <input matInput name="password" [(ngModel)]="password" required type="password" autocomplete="new-password" />
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Confirm Password</mat-label>
            <input matInput name="confirmPassword" [(ngModel)]="confirmPassword" required type="password" autocomplete="new-password" />
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Role</mat-label>
            <mat-select name="role" [(ngModel)]="role" required>
              <mat-option *ngFor="let option of roleOptions" [value]="option.value">
                {{ option.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-raised-button color="primary" class="full-width" [disabled]="loading || f.invalid">
            {{ loading ? 'Registering…' : 'Register' }}
          </button>
        </form>
        <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
        <p class="hint">
          มีบัญชีแล้ว? <a routerLink="/auth/login">เข้าสู่ระบบ</a>
        </p>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .register-container {
        display: flex;
        justify-content: center;
        margin-top: 8vh;
      }
      mat-card {
        width: 380px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .full-width {
        width: 100%;
      }
      .error {
        color: #f44336;
        margin: 0;
        font-size: 13px;
      }
      .hint {
        font-size: 13px;
        margin: 0;
        text-align: center;
      }
      .hint a {
        text-decoration: none;
      }
    `,
  ],
})
export class RegisterPageComponent {
  private readonly api = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  confirmPassword = '';
  role = 'customer';
  readonly roleOptions = [
    { value: 'customer', label: 'Customer' },
    { value: 'technician', label: 'Technician' },
  ];
  loading = false;
  errorMessage = '';

  submit(form: NgForm): void {
    if (this.loading || form.invalid) {
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'รหัสผ่านไม่ตรงกัน';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.api
      .register({ username: this.username, password: this.password, role: this.role })
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.auth.loginSuccess(res.user, res.accessToken, res.refreshToken);
          this.router.navigateByUrl(this.auth.getDefaultRoute());
        },
        error: (err) => {
          this.loading = false;
          const detail = err?.error?.error ?? 'ไม่สามารถสมัครสมาชิกได้ กรุณาลองอีกครั้ง';
          this.errorMessage = typeof detail === 'string' ? detail : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        },
      });
  }
}
