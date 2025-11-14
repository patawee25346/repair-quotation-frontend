import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

export interface DeviceDetailDialogData {
  device: {
    type: string;
    brand?: string;
    modelName?: string;
    modelNumber?: string;
    serialNumber?: string;
    problemDetails?: string;
    notes?: string;
    purchaseDate?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}

@Component({
  selector: 'app-customer-device-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  providers: [DatePipe],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>memory</mat-icon>
      <span>ข้อมูลอุปกรณ์</span>
    </h2>

    <section mat-dialog-content class="dialog-content">
      <header class="header">
        <div>
          <h3>{{ data.device.type }}</h3>
          <p *ngIf="data.device.brand">ยี่ห้อ {{ data.device.brand }}</p>
        </div>
        <div class="chips">
          <mat-chip *ngIf="data.device.modelName">{{ data.device.modelName }}</mat-chip>
          <mat-chip *ngIf="data.device.modelNumber">รุ่น {{ data.device.modelNumber }}</mat-chip>
        </div>
      </header>

      <mat-divider></mat-divider>

      <div class="info-grid">
        <div class="info">
          <label>Serial</label>
          <span>{{ data.device.serialNumber || '-' }}</span>
        </div>
        <div class="info">
          <label>ซื้อเมื่อ</label>
          <span>{{ formatDate(data.device.purchaseDate, 'dd/MM/yyyy') }}</span>
        </div>
        <div class="info">
          <label>สร้างเมื่อ</label>
          <span>{{ formatDate(data.device.createdAt) }}</span>
        </div>
        <div class="info">
          <label>อัปเดตล่าสุด</label>
          <span>{{ formatDate(data.device.updatedAt) }}</span>
        </div>
      </div>

      <section class="section" *ngIf="data.device.problemDetails">
        <h4><mat-icon>report_problem</mat-icon> รายละเอียดปัญหา</h4>
        <p>{{ data.device.problemDetails }}</p>
      </section>

      <section class="section" *ngIf="data.device.notes">
        <h4><mat-icon>sticky_note_2</mat-icon> หมายเหตุ</h4>
        <p>{{ data.device.notes }}</p>
      </section>
    </section>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="close()">ปิด</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        width: min(480px, 100vw - 32px);
      }
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      }
      .header h3 {
        margin: 0;
        font-size: 22px;
      }
      .header p {
        margin: 4px 0 0;
        color: #60718d;
      }
      .chips {
        display: flex;
        gap: 8px;
      }
      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
      }
      .info label {
        display: block;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
      }
      .info span {
        font-size: 15px;
        font-weight: 500;
      }
      .section h4 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 0 6px;
        font-size: 16px;
      }
      .section p {
        margin: 0;
        color: #334155;
        line-height: 1.5;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDeviceDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CustomerDeviceDetailDialogComponent>);
  private readonly datePipe = inject(DatePipe);
  readonly data = inject<DeviceDetailDialogData>(MAT_DIALOG_DATA);

  close(): void {
    this.dialogRef.close();
  }

  formatDate(value: string | null | undefined, format: string = 'dd/MM/yyyy HH:mm'): string {
    if (!value) {
      return '-';
    }
    return this.datePipe.transform(value, format) ?? '-';
  }
}
