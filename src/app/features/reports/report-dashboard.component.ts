import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-report-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Reports</h2>
      <p>แดชบอร์ดรายงานสำหรับผู้ดูแลระบบจะพร้อมใช้งานเร็วๆ นี้</p>
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
export class ReportDashboardComponent {}

