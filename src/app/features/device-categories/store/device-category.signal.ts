import { signal } from '@angular/core';
import { DeviceCategory } from '../models/device-category.model';

export const deviceCategoriesSignal = signal<DeviceCategory[]>([]);
export const deviceCategoryTotalSignal = signal<number>(0);
export const deviceCategoryLoadingSignal = signal<boolean>(false);
export const deviceCategorySelectedSignal = signal<DeviceCategory | null>(null);

