import { signal } from '@angular/core';
import { Customer } from '../models/customer.model';

export const customersSignal = signal<Customer[]>([]);
export const customersTotal = signal<number>(0);
export const customersLoading = signal<boolean>(false);
