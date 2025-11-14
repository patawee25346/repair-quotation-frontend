import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { DeviceCategoryApiService } from './services/device-category-api.service';
import {
  deviceCategoriesSignal,
  deviceCategoryLoadingSignal,
  deviceCategorySelectedSignal,
  deviceCategoryTotalSignal,
} from './store/device-category.signal';
import { DeviceCategoryFormDialogComponent } from './device-category-form-dialog.component';
import { DeviceCategory } from './models/device-category.model';
import {
  DataTableComponent,
  DataTableColumn,
  DataTableCellDirective,
} from '../../shared/components/data-table/data-table.component';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-device-category-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    DataTableComponent,
    DataTableCellDirective,
  ],
  template: `
    <section class="page">
      <header class="page__header">
        <div class="page__hero">
          <mat-icon class="hero-icon">category</mat-icon>
          <div>
            <h1>ตั้งค่าหมวดหมู่อุปกรณ์</h1>
            <p>จัดการหมวดหมู่อุปกรณ์สำหรับงานซ่อมและใบเสนอราคา</p>
          </div>
        </div>

        <button mat-flat-button color="primary" (click)="createCategory()" [disabled]="loading()">
          <mat-icon>add</mat-icon>
          เพิ่มหมวดหมู่
        </button>
      </header>

      <section class="card filters-card">
        <form [formGroup]="filterForm" autocomplete="off" class="filters">
          <mat-form-field class="filters__field" appearance="outline">
            <mat-label>ค้นหา</mat-label>
            <input matInput formControlName="query" placeholder="ชื่อหมวดหมู่ หรือคำอธิบาย" />
            <button
              *ngIf="filterForm.controls.query.value"
              matSuffix
              mat-icon-button
              type="button"
              (click)="filterForm.controls.query.setValue('')"
            >
              <mat-icon>clear</mat-icon>
            </button>
          </mat-form-field>

          <mat-slide-toggle formControlName="isActive">
            แสดงเฉพาะหมวดหมู่ที่เปิดใช้งาน
          </mat-slide-toggle>
        </form>
      </section>

      <section class="card">
        <header class="card__header">
          <h3>รายการหมวดหมู่ ({{ total() }})</h3>
          <p class="muted">ใช้สำหรับจัดกลุ่มประเภทอุปกรณ์เพื่อการอ้างอิงและรายงาน</p>
        </header>

        <app-data-table
          [data]="items()"
          [columns]="columns"
          [dense]="true"
          [loading]="loading()"
          [length]="total()"
          [pageIndex]="pageIndex()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="pageSizeOptions"
          [paginator]="true"
          [trackBy]="trackById"
          (pageChange)="pageChanged($event)"
          [emptyMessage]="emptyMessage"
        >
          <ng-template appDataTableCell="index" let-category let-index="index">
            {{ tableOffset() + index + 1 }}
          </ng-template>

          <ng-template appDataTableCell="name" let-category>
            <div class="name-cell">
              <span class="name-cell__title">{{ category.name }}</span>
              <span class="name-cell__status" [class.is-active]="category.isActive">
                <mat-icon>{{ category.isActive ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                {{ category.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </div>
          </ng-template>

          <ng-template appDataTableCell="description" let-category>
            {{ category.description || '—' }}
          </ng-template>

          <ng-template appDataTableCell="isActive" let-category>
            <mat-slide-toggle
              class="status-toggle"
              color="primary"
              [checked]="category.isActive"
              (change)="toggleActive(category)"
            ></mat-slide-toggle>
          </ng-template>

          <ng-template appDataTableCell="createdAt" let-category>
            {{ category.createdAt | date: 'dd/MM/yy HH:mm' }}
          </ng-template>

          <ng-template appDataTableCell="updatedAt" let-category>
            {{ category.updatedAt | date: 'dd/MM/yy HH:mm' }}
          </ng-template>

          <ng-template appDataTableCell="actions" let-category>
            <div class="table-tools">
              <button
                mat-icon-button
                color="primary"
                matTooltip="แก้ไข"
                (click)="editCategory(category)"
              >
                <mat-icon>edit</mat-icon>
              </button>
              <button
                mat-icon-button
                color="warn"
                matTooltip="ลบ"
                (click)="deleteCategory(category)"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </section>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 16px;
      }

      .page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .page__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
      }

      .page__hero {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .page__hero h1 {
        margin: 0;
        font-size: 24px;
      }

      .page__hero p {
        margin: 4px 0 0;
        color: rgba(0, 0, 0, 0.54);
        font-size: 14px;
      }

      .hero-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: rgba(25, 118, 210, 0.85);
      }

      .filters-card {
        display: block;
        padding: 20px;
      }

      .card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .filters {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }

      .filters__field {
        flex: 1 1 320px;
        min-width: 240px;
      }

      .card__header {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 12px;
      }

      .card__header h3 {
        margin: 0;
        font-size: 18px;
      }

      .card__header .muted {
        margin: 0;
        color: rgba(0, 0, 0, 0.54);
        font-size: 13px;
      }

      .muted {
        color: #718096;
        font-size: 13px;
      }

      .name-cell {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .name-cell__title {
        font-weight: 600;
      }

      .name-cell__status {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.54);
      }

      .name-cell__status.is-active {
        color: #2e7d32;
      }

      .table-tools {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .status-toggle {
        padding: 4px 0;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceCategoryListComponent implements OnInit {
  private readonly api = inject(DeviceCategoryApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly displayedColumns = ['name', 'description', 'isActive', 'createdAt', 'actions'];

  readonly loading = deviceCategoryLoadingSignal;
  readonly items = deviceCategoriesSignal;
  readonly total = deviceCategoryTotalSignal;
  readonly selected = deviceCategorySelectedSignal;

  readonly pageSize = signal(20);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions: number[] = [10, 20, 50];
  readonly emptyMessage = 'ยังไม่มีหมวดหมู่';

  readonly tableOffset = computed(() => this.pageIndex() * this.pageSize());

  readonly columns: DataTableColumn<DeviceCategory>[] = [
    { key: 'index', label: '#', align: 'center', sortable: false },
    { key: 'name', label: 'ชื่อหมวดหมู่', align: 'start', sortable: true },
    { key: 'description', label: 'รายละเอียด', align: 'start', sortable: true },
    { key: 'isActive', label: 'สถานะ', align: 'center', sortable: false },
    { key: 'createdAt', label: 'สร้างเมื่อ', align: 'start', sortable: true },
    { key: 'updatedAt', label: 'อัปเดตเมื่อ', align: 'start', sortable: true },
    { key: 'actions', label: 'เครื่องมือ', align: 'center', sortable: false },
  ];

  readonly filterForm = this.fb.nonNullable.group({
    query: [''],
    isActive: [true],
  });

  readonly filteredItems = computed(() => this.items());

  ngOnInit(): void {
    // Initial load
    this.executeFetch();

    this.filterForm.controls.query.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetPaging());

    this.filterForm.controls.isActive.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.resetPaging());
  }

  pageChanged(event: PageEvent): void {
    this.pageSize.set(event.pageSize);
    this.pageIndex.set(event.pageIndex);
    this.executeFetch();
  }

  createCategory(): void {
    this.dialog
      .open(DeviceCategoryFormDialogComponent, {
        width: '420px',
        data: { mode: 'create' },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.mode === 'create') {
          this.openSnack('บันทึกหมวดหมู่สำเร็จ');
          this.refreshAfterChange(result.category);
        }
      });
  }

  editCategory(category: DeviceCategory): void {
    deviceCategorySelectedSignal.set(category);
    this.dialog
      .open(DeviceCategoryFormDialogComponent, {
        width: '420px',
        data: { mode: 'edit', category },
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result?.mode === 'edit') {
          this.openSnack('อัปเดตหมวดหมู่สำเร็จ');
          this.refreshAfterChange(result.category);
        }
        deviceCategorySelectedSignal.set(null);
      });
  }

  deleteCategory(category: DeviceCategory): void {
    if (!confirm(`ต้องการลบหมวดหมู่ \"${category.name}\" หรือไม่?`)) {
      return;
    }
    this.setLoading(true);
    this.api
      .delete(category.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.openSnack('ลบหมวดหมู่สำเร็จ');
          this.executeFetch();
        },
        error: (err) => {
          this.handleError(err, 'ไม่สามารถลบหมวดหมู่ได้');
          this.setLoading(false);
        },
      });
  }

  toggleActive(category: DeviceCategory): void {
    const payload = {
      name: category.name,
      description: category.description,
      isActive: !category.isActive,
    };
    this.api
      .update(category.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.openSnack(updated.isActive ? 'เปิดใช้งานหมวดหมู่' : 'ปิดใช้งานหมวดหมู่');
          // Refresh ข้อมูลใหม่ทั้งหมดเพื่อให้ตรงกับ filter และ server
          this.executeFetch();
        },
        error: (err) => {
          this.handleError(err, 'ไม่สามารถอัปเดตสถานะได้');
        },
      });
  }

  trackById(_: number, item: DeviceCategory): number {
    return item.id;
  }

  private executeFetch(): void {
    const { query, isActive } = this.filterForm.getRawValue();
    this.fetchCategories({
      query: query ?? undefined,
      isActive: isActive === true ? true : undefined,
      limit: this.pageSize(),
      offset: this.pageIndex() * this.pageSize(),
    });
  }

  private fetchCategories(options: { query?: string; isActive?: boolean; limit: number; offset: number }): void {
    this.setLoading(true);
    this.api
      .list(options)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          deviceCategoriesSignal.set(
            response.data.map((item) => ({
              ...item,
              createdAt: item.createdAt ?? undefined,
              updatedAt: item.updatedAt ?? undefined,
            })),
          );
          deviceCategoryTotalSignal.set(response.meta.total);
          this.setLoading(false);
        },
        error: (err) => {
          this.handleError(err, 'โหลดหมวดหมู่ไม่สำเร็จ');
          this.setLoading(false);
        },
      });
  }

  private refreshAfterChange(updated: DeviceCategory): void {
    const data = this.items();
    const index = data.findIndex((item) => item.id === updated.id);
    if (index >= 0) {
      const next = [...data];
      next[index] = updated;
      deviceCategoriesSignal.set(next);
    } else {
      this.executeFetch();
    }
  }

  private resetPaging(): void {
    this.pageIndex.set(0);
    this.executeFetch();
  }

  private setLoading(value: boolean): void {
    deviceCategoryLoadingSignal.set(value);
  }

  private handleError(err: unknown, fallbackMessage: string): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (err as any)?.error?.error ?? fallbackMessage;
    this.openSnack(typeof message === 'string' ? message : fallbackMessage, true);
  }

  private openSnack(message: string, isError = false): void {
    this.snackBar.open(message, 'ปิด', {
      duration: isError ? undefined : 3000,
      panelClass: isError ? ['snackbar-error'] : ['snackbar-success'],
    });
  }
}

