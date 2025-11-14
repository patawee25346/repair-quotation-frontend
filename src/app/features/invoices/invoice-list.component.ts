import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Invoices</h2>
      <p>ฟีเจอร์รายการใบแจ้งหนี้กำลังจัดเตรียมอยู่</p>
    </section>
  `,
  styles: [
    `
      .page {
        padding: 24px;
      }
      h2 {
        margin-bottom: 12px;
      }
    `,
  ],
})
export class InvoiceListComponent {}

