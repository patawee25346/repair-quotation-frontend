import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import type { Quote, QuoteItem, QuoteStatus } from './models/quote.model';

export interface QuoteDetailDialogData {
  quote: Quote;
}

@Component({
  selector: 'app-quote-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatChipsModule, MatDividerModule],
  providers: [DatePipe, CurrencyPipe],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>description</mat-icon>
      <span>ใบเสนอราคา {{ data.quote.quoteNumber }}</span>
    </h2>

    <section mat-dialog-content class="dialog-content">
      <section class="summary-card">
        <header class="summary-card__header">
          <div>
            <h3>{{ data.quote.title || 'รายการซ่อม' }}</h3>
            <p class="muted" *ngIf="data.quote.description">{{ data.quote.description }}</p>
          </div>
          <mat-chip [class.status--approved]="data.quote.status === 'approved'" [class.status--pending]="data.quote.status === 'pending'" [class.status--draft]="data.quote.status === 'draft'" [class.status--rejected]="data.quote.status === 'rejected'" [class.status--expired]="data.quote.status === 'expired'">
            <mat-icon>{{ statusMeta[data.quote.status].icon }}</mat-icon>
            {{ statusMeta[data.quote.status].label }}
          </mat-chip>
        </header>

        <div class="summary-grid">
          <div>
            <label>ลูกค้า</label>
            <span>
              {{ formatCustomerName(data.quote) }}
            </span>
          </div>
          <div>
            <label>อุปกรณ์</label>
            <span>{{ formatDevice(data.quote) }}</span>
          </div>
          <div>
            <label>ออกเมื่อ</label>
            <span>{{ formatDate(data.quote.createdAt, 'dd/MM/yyyy HH:mm') }}</span>
          </div>
          <div>
            <label>ใช้ได้ถึง</label>
            <span>{{ formatDate(data.quote.validUntil, 'dd/MM/yyyy') }}</span>
          </div>
        </div>
      </section>

      <section class="items-card">
        <header>
          <h4><mat-icon>view_list</mat-icon> รายการอะไหล่/บริการ</h4>
        </header>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>รายละเอียด</th>
              <th class="text-end">จำนวน</th>
              <th class="text-end">ราคาต่อหน่วย</th>
              <th class="text-end">รวม</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of data.quote.items ?? []; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ item.description }}</td>
              <td class="text-end">{{ item.quantity | number:'1.0-2' }}</td>
              <td class="text-end">{{ formatMoney(item.unitPrice) }}</td>
              <td class="text-end">{{ formatMoney(item.subtotal) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="totals-card">
        <div class="total-row">
          <span>ค่าแรง</span>
          <strong>{{ formatMoney(data.quote.laborCost) }}</strong>
        </div>
        <div class="total-row">
          <span>ค่าอะไหล่</span>
          <strong>{{ formatMoney(data.quote.partsCost) }}</strong>
        </div>
        <div class="total-row" *ngIf="data.quote.discount > 0">
          <span>ส่วนลด</span>
          <strong>-{{ formatMoney(data.quote.discount) }}</strong>
        </div>
        <div class="total-row" *ngIf="data.quote.taxRate > 0">
          <span>ภาษี ({{ data.quote.taxRate * 100 | number:'1.0-2' }}%)</span>
          <strong>{{ formatMoney((data.quote.laborCost + data.quote.partsCost - data.quote.discount) * data.quote.taxRate) }}</strong>
        </div>
        <div class="total-row total-row--grand">
          <span>ยอดสุทธิ</span>
          <strong>{{ formatMoney(data.quote.totalAmount) }}</strong>
        </div>
      </section>

      <section class="notes-card" *ngIf="data.quote.notes">
        <header><mat-icon>sticky_note_2</mat-icon> หมายเหตุเพิ่มเติม</header>
        <p>{{ data.quote.notes }}</p>
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
        width: 100%;
        max-width: min(960px, 100vw - 32px);
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
        max-height: calc(90vh - 140px);
        overflow: auto;
      }
      .summary-card,
      .items-card,
      .totals-card,
      .notes-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.2);
        padding: 18px 20px;
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
      }
      .summary-card__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .summary-card__header h3 {
        margin: 0;
        font-size: 22px;
      }
      .summary-card__header mat-chip {
        font-weight: 600;
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }
      label {
        display: block;
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin-bottom: 4px;
      }
      .summary-grid span {
        font-size: 15px;
        font-weight: 500;
      }
      .muted {
        color: #64748b;
        margin: 6px 0 0;
      }
      .items-card header,
      .notes-card header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 10px 12px;
        text-align: left;
        border-bottom: 1px solid rgba(148, 163, 184, 0.2);
        font-size: 14px;
      }
      th {
        text-transform: uppercase;
        font-size: 12px;
        color: #94a3b8;
        letter-spacing: 0.08em;
      }
      .text-end {
        text-align: right;
      }
      .totals-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 15px;
        color: #475569;
      }
      .total-row strong {
        font-weight: 600;
      }
      .total-row--grand {
        font-size: 18px;
        color: #0f172a;
        padding-top: 6px;
        border-top: 1px dashed rgba(148, 163, 184, 0.4);
      }
      .notes-card p {
        margin: 0;
        line-height: 1.6;
      }
      .status--draft {
        background: rgba(148, 163, 184, 0.2);
        color: #475569;
      }
      .status--pending {
        background: rgba(30, 136, 229, 0.15);
        color: #1e88e5;
      }
      .status--approved {
        background: rgba(76, 175, 80, 0.18);
        color: #2e7d32;
      }
      .status--rejected {
        background: rgba(244, 67, 54, 0.18);
        color: #c62828;
      }
      .status--expired {
        background: rgba(158, 158, 158, 0.2);
        color: #616161;
      }
      @media (max-width: 640px) {
        .summary-card,
        .items-card,
        .totals-card,
        .notes-card {
          padding: 16px;
        }
        table {
          font-size: 13px;
        }
        th,
        td {
          padding: 8px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteDetailDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<QuoteDetailDialogComponent>);
  private readonly datePipe = inject(DatePipe);
  private readonly currencyPipe = inject(CurrencyPipe);
  readonly data = inject<QuoteDetailDialogData>(MAT_DIALOG_DATA);

  readonly statusMeta: Record<QuoteStatus, { label: string; icon: string }> = {
    draft: { label: 'ฉบับร่าง', icon: 'drafts' },
    pending: { label: 'รออนุมัติ', icon: 'hourglass_top' },
    approved: { label: 'อนุมัติแล้ว', icon: 'verified' },
    rejected: { label: 'ถูกปฏิเสธ', icon: 'cancel' },
    expired: { label: 'หมดอายุ', icon: 'history_toggle_off' },
  };

  close(): void {
    this.dialogRef.close();
  }

  formatCustomerName(quote: Quote): string {
    if (quote.customer) {
      const name = [quote.customer.firstName, quote.customer.lastName].filter(Boolean).join(' ');
      return name || quote.customer.email || '-';
    }
    return '-';
  }

  formatDevice(quote: Quote): string {
    if (!quote.device) {
      return '-';
    }
    const parts = [quote.device.type, quote.device.brand, quote.device.modelName].filter(Boolean);
    return parts.length ? parts.join(' · ') : quote.device.type;
  }

  formatMoney(value: number): string {
    return this.currencyPipe.transform(value, quoteCurrencySymbol(this.data.quote.currency), 'symbol-narrow', '1.2-2') ?? value.toFixed(2);
  }

  formatDate(value: string | null | undefined, format: string): string {
    if (!value) {
      return '-';
    }
    return this.datePipe.transform(value, format) ?? '-';
  }
}

function quoteCurrencySymbol(code: string): string {
  switch (code?.toUpperCase()) {
    case 'USD':
      return 'USD';
    case 'EUR':
      return '€';
    case 'JPY':
      return '¥';
    case 'GBP':
      return '£';
    case 'THB':
    default:
      return '฿';
  }
}
