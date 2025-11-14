import { Component } from '@angular/core';
import { AuthApiService } from './services/auth-api.service';
import { AuthService } from '../../../app/core/services/auth.service';
import { FormsModule, NgForm } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatInputModule, NgIf, RouterLink],
  template: `
    <div class="login-container">
      <mat-card>
        <h2>Login</h2>
        <form (ngSubmit)="submit(f)" #f="ngForm" novalidate>
          <mat-form-field class="full-width">
            <mat-label>Username</mat-label>
            <input matInput name="username" [(ngModel)]="username" required autocomplete="username" />
          </mat-form-field>

          <mat-form-field class="full-width">
            <mat-label>Password</mat-label>
            <input matInput name="password" [(ngModel)]="password" required type="password" autocomplete="current-password" />
          </mat-form-field>

          <button mat-raised-button color="primary" class="full-width" [disabled]="loading || f.invalid">
            {{ loading ? 'Logging in…' : 'Login' }}
          </button>
        </form>
        <p *ngIf="errorMessage" class="error">{{ errorMessage }}</p>
        <p class="hint">
          ยังไม่มีบัญชี? <a routerLink="/auth/register">สมัครสมาชิก</a>
        </p>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container { display:flex; justify-content:center; margin-top:10vh; }
    mat-card { width:350px; padding:20px; display:flex; flex-direction:column; gap:12px; }
    .full-width { width:100%; }
    .error { color:#f44336; margin:0; font-size:13px; }
    .hint { font-size:13px; margin:0; text-align:center; }
    .hint a { text-decoration:none; }
  `]
})
export class LoginPageComponent {
  username = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(private api: AuthApiService, private auth: AuthService, private router: Router) {}

  submit(form: NgForm) {
    if (this.loading || form.invalid || !this.username || !this.password) {
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.api.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        // save tokens & user
        this.auth.loginSuccess(res.user, res.accessToken, res.refreshToken);
        this.loading = false;
        this.router.navigateByUrl(this.auth.getDefaultRoute());
      },
      error: (err) => {
        this.loading = false;
        const detail = err?.error?.error ?? 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง';
        this.errorMessage = typeof detail === 'string' ? detail : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      }
    });
  }
}
