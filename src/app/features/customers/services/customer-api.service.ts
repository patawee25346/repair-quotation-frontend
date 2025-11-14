import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Customer, CustomerDevice, CustomerPayload, CustomerStatus, Paginated } from '../models/customer.model.js';

@Injectable({ providedIn: 'root' })
export class CustomerApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/customers`;

  list(limit = 10, offset = 0, q?: string, status?: CustomerStatus): Observable<Paginated<Customer>> {
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    if (q) params = params.set('q', q);
    if (status) params = params.set('status', status);
    return this.http
      .get<Paginated<CustomerResponse>>(`${this.base}`, { params })
      .pipe(map((res) => ({ data: res.data.map((item) => this.mapCustomer(item)), meta: res.meta })));
  }

  get(id: number, options?: { includeDevices?: boolean }) {
    let params = new HttpParams();
    if (options?.includeDevices) {
      params = params.set('include_devices', 'true');
    }
    return this.http
      .get<{ data: CustomerResponse }>(`${this.base}/${id}`, { params })
      .pipe(map((res) => this.mapCustomer(res.data)));
  }

  create(payload: CustomerPayload): Observable<Customer> {
    return this.http
      .post<{ data: CustomerResponse }>(this.base, this.toRequestPayload(payload))
      .pipe(map((res) => this.mapCustomer(res.data)));
  }

  update(id: number, payload: CustomerPayload): Observable<Customer> {
    return this.http
      .put<{ data: CustomerResponse }>(`${this.base}/${id}`, this.toRequestPayload(payload))
      .pipe(map((res) => this.mapCustomer(res.data)));
  }

  setActive(id: number, active: boolean): Observable<Customer> {
    return this.http
      .put<{ data: CustomerResponse }>(`${this.base}/${id}`, {
        is_active: active,
        status: active ? 'active' : 'inactive',
      })
      .pipe(map((res) => this.mapCustomer(res.data)));
  }

  remove(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  private mapCustomer(raw: CustomerResponse): Customer {
    return {
      id: raw.id,
      code: raw.code,
      name: raw.name,
      companyName: raw.company_name ?? undefined,
      firstName: raw.first_name,
      lastName: raw.last_name,
      email: raw.email,
      phoneNumber: raw.phone_number ?? undefined,
      alternatePhoneNumber: raw.alternate_phone_number ?? undefined,
      subDistrict: raw.sub_district ?? raw.district ?? undefined,
      addressLine1: raw.address_line1 ?? undefined,
      addressLine2: raw.address_line2 ?? undefined,
      district: raw.district ?? undefined,
      province: raw.province ?? undefined,
      postalCode: raw.postal_code ?? undefined,
      taxId: raw.tax_id ?? undefined,
      notes: raw.notes ?? undefined,
      isActive: raw.is_active,
      status: raw.status ?? (raw.is_active ? 'active' : 'inactive'),
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      devices: raw.devices?.map((device) => this.mapDevice(device)) ?? undefined,
    };
  }

  private toRequestPayload(payload: CustomerPayload): CustomerRequest {
    return {
      company_name: payload.companyName,
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone_number: payload.phoneNumber,
      alternate_phone_number: payload.alternatePhoneNumber,
      sub_district: payload.subDistrict,
      address_line1: payload.addressLine1,
      address_line2: payload.addressLine2,
      district: payload.district,
      province: payload.province,
      postal_code: payload.postalCode,
      tax_id: payload.taxId,
      notes: payload.notes,
      status: payload.status,
    };
  }

  private mapDevice(raw: DeviceResponse): CustomerDevice {
    return {
      id: raw.id,
      type: raw.type,
      brand: raw.brand ?? undefined,
      modelName: raw.model_name ?? undefined,
      modelNumber: raw.model_number ?? undefined,
      serialNumber: raw.serial_number ?? undefined,
      problemDetails: raw.problem_details ?? undefined,
      notes: raw.notes ?? undefined,
      purchaseDate: raw.purchase_date ?? undefined,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}

interface CustomerResponse {
  id: number;
  code: string;
  name: string;
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  alternate_phone_number?: string;
  sub_district?: string;
  address_line1?: string;
  address_line2?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  tax_id?: string;
  notes?: string;
  is_active: boolean;
  status?: CustomerStatus;
  created_at?: string;
  updated_at?: string;
  devices?: DeviceResponse[];
}

interface CustomerRequest {
  company_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  alternate_phone_number?: string;
  sub_district?: string;
  address_line1?: string;
  address_line2?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  tax_id?: string;
  notes?: string;
  status?: CustomerStatus;
}

interface DeviceResponse {
  id: number;
  type: string;
  brand?: string;
  model_name?: string;
  model_number?: string;
  serial_number?: string;
  problem_details?: string;
  notes?: string;
  purchase_date?: string;
  created_at?: string;
  updated_at?: string;
}
