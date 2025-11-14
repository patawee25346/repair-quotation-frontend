import { CommonModule } from '@angular/common';
import {
  AfterContentInit,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ContentChildren,
  Directive,
  Input,
  OnChanges,
  Output,
  QueryList,
  SimpleChanges,
  TemplateRef,
  TrackByFunction,
  ViewChild,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { EventEmitter } from '@angular/core';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';

export type DataTableAlignment = 'start' | 'center' | 'end';

export interface DataTableColumn<T> {
  key: string;
  label: string;
  accessor?: (item: T, index: number) => unknown;
  align?: DataTableAlignment;
  sortable?: boolean;
}

export interface DataTableCellContext<T> {
  $implicit: T;
  index: number;
}

@Directive({
  selector: 'ng-template[appDataTableCell]',
  standalone: true,
})
export class DataTableCellDirective {
  @Input('appDataTableCell') columnKey!: string;

  constructor(public readonly template: TemplateRef<unknown>) {}
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatProgressBarModule, MatSortModule, MatPaginatorModule],
  template: `
    <div class="data-table" [class.data-table--dense]="dense">
      <div class="data-table__container" *ngIf="!loading; else loadingTpl">
        <table
          mat-table
          [dataSource]="dataSource"
          class="data-table__table mat-elevation-z1"
          matSort
          [matSortDisabled]="!sortable"
          [matSortActive]="sortActive || ''"
          [matSortDirection]="sortDirection || 'asc'"
          [matSortDisableClear]="sortDisableClear"
          (matSortChange)="handleSortChange($event)"
          *ngIf="columns.length; else emptyColumns"
        >
          <ng-container *ngFor="let column of columns" [matColumnDef]="column.key">
            <th
              mat-header-cell
              *matHeaderCellDef
              mat-sort-header
              [disabled]="!sortable || column.sortable === false"
              [class.text-start]="column.align === 'start' || !column.align"
              [class.text-center]="column.align === 'center'"
              [class.text-end]="column.align === 'end'"
            >
              {{ column.label }}
            </th>
            <td
              mat-cell
              *matCellDef="let row; let rowIndex = index"
              [class.text-start]="column.align === 'start' || !column.align"
              [class.text-center]="column.align === 'center'"
              [class.text-end]="column.align === 'end'"
            >
              <ng-container *ngIf="templateMap.get(column.key) as tpl; else defaultCell">
                <ng-container *ngTemplateOutlet="tpl; context: { $implicit: row, index: rowIndex }"></ng-container>
              </ng-container>
              <ng-template #defaultCell>{{ resolveCellValue(column, row, rowIndex) }}</ng-template>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
        <p class="data-table__empty" *ngIf="!dataSource.data.length">{{ emptyMessage }}</p>
        <mat-paginator
          *ngIf="paginator"
          [length]="length"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          [pageSizeOptions]="pageSizeOptions"
          [showFirstLastButtons]="true"
          (page)="handlePage($event)"
        ></mat-paginator>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="data-table__loading">
        <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
      </div>
    </ng-template>

    <ng-template #emptyColumns>
      <p class="data-table__empty">ไม่มีคอลัมน์ให้แสดงผล</p>
    </ng-template>
  `,
  styles: [
    `
      .data-table {
        width: 100%;
      }
      .data-table__container {
        overflow-x: auto;
      }
      .data-table__table {
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
      }
      .data-table__empty {
        text-align: center;
        margin: 16px 0;
        color: #666;
        font-size: 14px;
      }
      .data-table__loading {
        padding: 16px 0;
      }
      .data-table__loading mat-progress-bar {
        width: 100%;
        max-width: 320px;
        margin: 0 auto;
      }
      .data-table :where(th, td) {
        font-size: 14px;
      }
      .text-start {
        text-align: left;
      }
      .text-center {
        text-align: center;
      }
      .text-end {
        text-align: right;
      }
      .data-table--dense .data-table :where(th, td) {
        padding: 8px 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T extends object> implements OnChanges, AfterContentInit, AfterViewInit {
  @Input({ required: true }) data: ReadonlyArray<T> = [];
  @Input({ required: true }) columns: ReadonlyArray<DataTableColumn<T>> = [];
  @Input() emptyMessage = 'ไม่พบข้อมูล';
  @Input() loading = false;
  @Input() dense = false;
  @Input() trackBy?: TrackByFunction<T>;
  @Input() sortable = false;
  @Input() sortActive?: string;
  @Input() sortDirection: 'asc' | 'desc' | '' = 'asc';
  @Input() sortDisableClear = false;
  @Output() sortChange = new EventEmitter<Sort>();
  @Input() paginator = false;
  @Input() length = 0;
  @Input() pageIndex = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: ReadonlyArray<number> = [5, 10, 25, 50];
  @Output() pageChange = new EventEmitter<PageEvent>();

  @ContentChildren(DataTableCellDirective)
  private readonly cellTemplates!: QueryList<DataTableCellDirective>;

  @ViewChild(MatSort) private matSort?: MatSort;
  @ViewChild(MatPaginator) private matPaginator?: MatPaginator;

  readonly dataSource = new MatTableDataSource<T>([]);
  displayedColumns: string[] = [];
  templateMap = new Map<string, TemplateRef<DataTableCellContext<T>>>();

  private readonly defaultTrackBy: TrackByFunction<T> = (index) => index;

  get trackByFn(): TrackByFunction<T> {
    return this.trackBy ?? this.defaultTrackBy;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.dataSource.data = [...this.data];
    }
    if (changes['columns']) {
      this.displayedColumns = this.columns.map((column) => column.key);
    }
    if (changes['sortable'] || changes['sortActive'] || changes['sortDirection']) {
      this.assignSort();
    }
  }

  ngAfterViewInit(): void {
    this.assignSort();
  }

  ngAfterContentInit(): void {
    this.buildTemplateMap();
    this.cellTemplates.changes.subscribe(() => this.buildTemplateMap());
  }

  private buildTemplateMap(): void {
    const map = new Map<string, TemplateRef<DataTableCellContext<T>>>();
    if (this.cellTemplates) {
      this.cellTemplates.forEach((directive) => {
        if (directive.columnKey) {
          map.set(directive.columnKey, directive.template as TemplateRef<DataTableCellContext<T>>);
        }
      });
    }
    this.templateMap = map;
  }

  private assignSort(): void {
    this.dataSource.sort = this.sortable && this.matSort ? this.matSort : null;
    this.dataSource.paginator = this.paginator && this.matPaginator ? this.matPaginator : null;
    if (this.sortable && this.matSort) {
      if (this.sortActive) {
        this.matSort.active = this.sortActive;
      }
      if (this.sortDirection) {
        this.matSort.direction = this.sortDirection || 'asc';
      }
      this.matSort.disableClear = this.sortDisableClear;
    }
  }

  handleSortChange(event: Sort): void {
    this.sortChange.emit(event);
  }

  handlePage(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  resolveCellValue(column: DataTableColumn<T>, row: T, index: number): string {
    if (column.accessor) {
      const result = column.accessor(row, index);
      return result == null ? '' : String(result);
    }
    const value = (row as Record<string, unknown>)[column.key as keyof Record<string, unknown>];
    return value == null ? '' : String(value);
  }
}
