import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-repair-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      <h2>Repair Orders</h2>
      <p>ฟีเจอร์รายการงานซ่อมจะมาเร็วๆ นี้</p>
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
export class RepairListComponent {}

