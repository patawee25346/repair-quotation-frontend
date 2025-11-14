import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { CustomerApiService } from './services/customer-api.service';
import type { Customer, CustomerDevice } from './models/customer.model';
import { CustomerDeviceDetailDialogComponent, DeviceDetailDialogData } from './customer-device-detail-dialog.component';

export interface CustomerDetailDialogData {
  customerId: number;
}

@Component({
  selector: 'app-customer-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
  ],
  providers: [DatePipe],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <span class="dialog-title__icon">
        <mat-icon>person_search</mat-icon>
      </span>
      <span class="dialog-title__text">รายละเอียดลูกค้า</span>
      <span class="dialog-title__spacer"></span>
      <button mat-icon-button type="button" (click)="close()" aria-label="ปิด">
        <mat-icon>close</mat-icon>
      </button>
    </h2>

    <section mat-dialog-content class="dialog-content" *ngIf="!loading(); else loadingTpl">
      <ng-container *ngIf="customer(); else errorTpl">
        <section class="hero-card">
          <div class="hero-card__avatar">
            <mat-icon>person</mat-icon>
          </div>
          <div class="hero-card__body">
            <div class="hero-card__headline">
              <h3>
                {{ customer()?.firstName }} {{ customer()?.lastName }}
                <small *ngIf="customer()?.companyName">{{ customer()?.companyName }}</small>
              </h3>
              <div class="hero-card__tags">
                <span class="chip" [class.chip--active]="customer()?.status === 'active'" [class.chip--inactive]="customer()?.status === 'inactive'">
                  <mat-icon>{{ customer()?.status === 'active' ? 'verified' : 'block' }}</mat-icon>
                  {{ customer()?.status === 'active' ? 'ใช้งานอยู่' : 'ปิดใช้งาน' }}
                </span>
                <span class="chip">
                  <mat-icon>calendar_today</mat-icon>
                  สร้าง {{ formatDate(customer()?.createdAt) }}
                </span>
                <span class="chip" *ngIf="customer()?.updatedAt">
                  <mat-icon>update</mat-icon>
                  อัปเดต {{ formatDate(customer()?.updatedAt) }}
                </span>
              </div>
            </div>
            <p class="hero-card__subtitle" *ngIf="customer()?.notes">{{ customer()?.notes }}</p>
          </div>
        </section>

        <section class="info-grid">
          <article class="info-card">
            <header><mat-icon>contact_mail</mat-icon> ข้อมูลติดต่อ</header>
            <div class="info-card__content">
              <div class="info-card__item">
                <label>อีเมล</label>
                <span>{{ customer()?.email || '-' }}</span>
              </div>
              <div class="info-card__item">
                <label>เบอร์โทร</label>
                <span>{{ customer()?.phoneNumber || '-' }}</span>
              </div>
              <div class="info-card__item">
                <label>เบอร์สำรอง</label>
                <span>{{ customer()?.alternatePhoneNumber || '-' }}</span>
              </div>
              <div class="info-card__item">
                <label>เลขประจำตัวผู้เสียภาษี</label>
                <span>{{ customer()?.taxId || '-' }}</span>
              </div>
            </div>
          </article>

          <article class="info-card">
            <header><mat-icon>home_pin</mat-icon> ที่อยู่</header>
            <div class="info-card__content info-card__content--address" [class.empty]="!anyAddressLine()">
              <mat-icon>map</mat-icon>
              <div>
                <span *ngIf="customer()?.addressLine1">{{ customer()?.addressLine1 }}</span>
                <span *ngIf="customer()?.addressLine2">{{ customer()?.addressLine2 }}</span>
                <span *ngIf="anyAddressLine(); else emptyAddress">
                  {{ customer()?.subDistrict || '-' }}
                  <ng-container *ngIf="customer()?.district"> · {{ customer()?.district }}</ng-container>
                  <ng-container *ngIf="customer()?.province"> · {{ customer()?.province }}</ng-container>
                  <ng-container *ngIf="customer()?.postalCode"> · {{ customer()?.postalCode }}</ng-container>
                </span>
                <ng-template #emptyAddress>
                  <span class="muted">ยังไม่มีข้อมูลที่อยู่</span>
                </ng-template>
              </div>
            </div>
          </article>

          <article class="info-card" *ngIf="customer()?.notes">
            <header><mat-icon>sticky_note_2</mat-icon> หมายเหตุเพิ่มเติม</header>
            <div class="info-card__content info-card__content--notes">
              <mat-icon>format_quote</mat-icon>
              <p>{{ customer()?.notes }}</p>
            </div>
          </article>
        </section>

        <section class="timeline-card" *ngIf="(customer()?.devices?.length ?? 0) > 0">
          <header class="timeline-card__header">
            <div>
              <h4><mat-icon>devices_other</mat-icon> ประวัติอุปกรณ์</h4>
              <p>อุปกรณ์ที่ลูกค้าเคยนำเข้ารับบริการ</p>
            </div>
          </header>
          <ul class="timeline__list">
            <li class="timeline__item" *ngFor="let device of customer()?.devices; trackBy: deviceTrackBy">
              <div class="timeline__point"></div>
              <div class="timeline__card" (click)="openDeviceDetail(device)" role="button" tabindex="0">
                <header class="timeline__card-header">
                  <div>
                    <h5>{{ device.type }}<span *ngIf="device.brand"> · {{ device.brand }}</span></h5>
                    <small *ngIf="device.modelName || device.modelNumber">
                      {{ device.modelName || '-' }}
                      <ng-container *ngIf="device.modelNumber">({{ device.modelNumber }})</ng-container>
                    </small>
                  </div>
                  <span class="timeline__card-date" *ngIf="device.createdAt">{{ formatDate(device.createdAt) }}</span>
                </header>
                <dl class="timeline__meta">
                  <div *ngIf="device.serialNumber">
                    <dt>Serial</dt>
                    <dd>{{ device.serialNumber }}</dd>
                  </div>
                  <div *ngIf="device.problemDetails">
                    <dt>อาการ</dt>
                    <dd>{{ device.problemDetails }}</dd>
                  </div>
                  <div *ngIf="device.notes">
                    <dt>หมายเหตุ</dt>
                    <dd>{{ device.notes }}</dd>
                  </div>
                  <div *ngIf="device.purchaseDate">
                    <dt>ซื้อเมื่อ</dt>
                    <dd>{{ formatDate(device.purchaseDate) }}</dd>
                  </div>
                </dl>
              </div>
            </li>
          </ul>
        </section>
      </ng-container>
    </section>

    <ng-template #loadingTpl>
      <div class="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <span>กำลังโหลดข้อมูลลูกค้า...</span>
      </div>
    </ng-template>

    <ng-template #errorTpl>
      <div class="error-block">
        <mat-icon>error</mat-icon>
        <p>{{ error() || 'ไม่พบข้อมูลลูกค้า' }}</p>
        <button mat-stroked-button color="primary" type="button" (click)="close()">ปิด</button>
      </div>
    </ng-template>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">ปิด</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        width: min(880px, 100vw - 32px);
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        padding-bottom: 8px;
        font-size: 22px;
        font-weight: 600;
      }
      .dialog-title__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(33, 150, 243, 0.12) 0%, rgba(33, 150, 243, 0.05) 100%);
        color: #1e88e5;
      }
      .dialog-title__text {
        letter-spacing: 0.4px;
      }
      .dialog-title__spacer {
        flex: 1 1 auto;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .hero-card {
        position: relative;
        display: flex;
        gap: 18px;
        padding: 22px 24px;
        border-radius: 18px;
        overflow: hidden;
        color: #0f172a;
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 45%, #ffffff 100%);
        border: 1px solid rgba(33, 150, 243, 0.25);
        box-shadow: 0 18px 30px rgba(33, 150, 243, 0.14);
      }
      .hero-card__avatar {
        min-width: 72px;
        height: 72px;
        border-radius: 24px;
        background: #ffffff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #1e88e5;
        font-size: 32px;
        box-shadow: 0 12px 25px rgba(30, 136, 229, 0.18);
      }
      .hero-card__body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }
      .hero-card__headline h3 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 0.4px;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .hero-card__headline h3 small {
        font-size: 16px;
        font-weight: 500;
        color: #1e88e5;
      }
      .hero-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 12px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.85);
        color: #1e293b;
      }
      .chip mat-icon {
        font-size: 18px;
      }
      .chip--active {
        background: rgba(76, 175, 80, 0.18);
        color: #1b5e20;
      }
      .chip--inactive {
        background: rgba(244, 67, 54, 0.18);
        color: #c62828;
      }
      .hero-card__subtitle {
        margin: 0;
        font-size: 15px;
        line-height: 1.6;
        color: rgba(15, 23, 42, 0.75);
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 18px;
      }
      .info-card {
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        box-shadow: 0 15px 30px rgba(15, 23, 42, 0.08);
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .info-card header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 16px;
        color: #1e293b;
      }
      .info-card__content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px 24px;
        align-items: start;
      }
      .info-card__item label {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #7b8ea7;
        margin-bottom: 4px;
      }
      .info-card__item span {
        font-size: 15px;
        font-weight: 500;
        color: #1f2937;
        display: block;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .info-card__content--address {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      .info-card__content--address mat-icon {
        color: #1e88e5;
      }
      .info-card__content--address div {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 15px;
        color: #334155;
      }
      .info-card__content--address.empty div {
        color: #9aa4b6;
      }
      .info-card__content--notes {
        display: flex;
        gap: 12px;
        color: #f9a825;
      }
      .info-card__content--notes mat-icon {
        font-size: 30px;
      }
      .info-card__content--notes p {
        margin: 0;
        color: #424242;
        font-size: 15px;
        line-height: 1.6;
      }
      .muted {
        color: #90a4ae;
      }
      .timeline-card {
        background: #ffffff;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        padding: 22px 24px;
        box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .timeline-card__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .timeline-card__header h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-size: 17px;
        font-weight: 600;
        color: #1e293b;
      }
      .timeline-card__header p {
        margin: 4px 0 0;
        font-size: 13px;
        color: #64748b;
      }
      .timeline__list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .timeline__item {
        position: relative;
        padding-left: 28px;
      }
      .timeline__item::before {
        content: '';
        position: absolute;
        left: 9px;
        top: 8px;
        bottom: -16px;
        width: 2px;
        background: linear-gradient(180deg, rgba(30, 136, 229, 0.4) 0%, rgba(30, 136, 229, 0) 100%);
      }
      .timeline__item:last-child::before {
        display: none;
      }
      .timeline__point {
        position: absolute;
        left: 2px;
        top: 6px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #1e88e5;
        box-shadow: 0 0 0 4px rgba(30, 136, 229, 0.15);
      }
      .timeline__card {
        background: #ffffff;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.18);
        padding: 16px 18px;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        gap: 12px;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
      }
      .timeline__card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .timeline__card-header h5 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #0f172a;
      }
      .timeline__card-header small {
        display: block;
        font-size: 13px;
        color: #60718d;
      }
      .timeline__card-date {
        font-size: 12px;
        color: #1e88e5;
        font-weight: 600;
      }
      .timeline__meta {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }
      .timeline__meta dt {
        font-size: 11px;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.08em;
        margin-bottom: 2px;
      }
      .timeline__meta dd {
        margin: 0;
        font-size: 13px;
        color: #1f2937;
      }
      .loading,
      .error-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 28px 0;
        text-align: center;
      }
      .error-block mat-icon {
        font-size: 36px;
        color: #f44336;
      }
      mat-dialog-actions {
        padding-top: 16px;
      }
      @media (max-width: 960px) {
        :host {
          width: calc(100vw - 24px);
        }
        .info-grid {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
        .info-card__content {
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        .info-card__content .info-card__item:nth-child(2) span {
          text-align: left;
        }
      }
      @media (max-width: 640px) {
        .dialog-title {
          gap: 8px;
          font-size: 20px;
        }
        .hero-card {
          flex-direction: column;
          text-align: center;
          align-items: center;
        }
        .hero-card__avatar {
          min-width: 64px;
          height: 64px;
        }
        .hero-card__headline h3 {
          justify-content: center;
          gap: 8px;
        }
        .hero-card__tags {
          justify-content: center;
        }
        .info-card {
          padding: 16px;
        }
        .info-card__content {
          grid-template-columns: 1fr;
        }
        .info-card__content .info-card__item:nth-child(2) span {
          text-align: left;
        }
        .info-card__content--address {
          flex-direction: column;
        }
        .timeline-card {
          padding: 18px;
        }
        .timeline__item::before {
          left: 7px;
        }
        .timeline__point {
          left: 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CustomerDetailDialogComponent>);
  private readonly data = inject<CustomerDetailDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(CustomerApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly datePipe = inject(DatePipe);
  private readonly dialog = inject(MatDialogRef<CustomerDetailDialogComponent>);
  private readonly matDialog = inject(MatDialog);

  readonly customer = signal<Customer | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api
      .get(this.data.customerId, { includeDevices: true })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (customer) => {
          this.customer.set(customer);
        },
        error: (err) => {
          const message = err?.error?.error ?? err?.message;
          this.error.set(typeof message === 'string' ? message : 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
        },
      });
  }

  close(): void {
    this.dialogRef.close();
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    return this.datePipe.transform(value, 'dd/MM/yyyy') ?? '-';
  }

  anyAddressLine(): boolean {
    const customer = this.customer();
    if (!customer) {
      return false;
    }
    return [customer.subDistrict, customer.district, customer.province, customer.postalCode].some((v) => !!v);
  }

  deviceTrackBy(index: number, item: CustomerDevice): number {
    return item.id ?? index;
  }

  openDeviceDetail(device: CustomerDevice): void {
    this.matDialog.open<CustomerDeviceDetailDialogComponent, DeviceDetailDialogData>(CustomerDeviceDetailDialogComponent, {
      width: '480px',
      data: { device },
    });
  }
}
