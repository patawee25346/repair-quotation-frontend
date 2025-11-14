import { signal } from '@angular/core';
import { DeviceWithCategory } from '../services/device-api.service';

export const deviceSettingsSignal = signal<DeviceWithCategory[]>([]);
export const deviceSettingsTotalSignal = signal<number>(0);
export const deviceSettingsLoadingSignal = signal<boolean>(false);
export const deviceSettingsSelectedSignal = signal<DeviceWithCategory | null>(null);

