import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { Paginated, Quote, QuoteCreatePayload, QuoteStatus } from '../models/quote.model';

export interface QuoteListParams {
  status?: QuoteStatus[];
  customerId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

@Injectable({ providedIn: 'root' })
export class QuoteApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/quotes`;

  list(params: QuoteListParams = {}): Observable<Paginated<Quote>> {
    let httpParams = new HttpParams();

    if (params.limit != null) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.offset != null) {
      httpParams = httpParams.set('offset', String(params.offset));
    }
    if (params.customerId != null) {
      httpParams = httpParams.set('customer_id', String(params.customerId));
    }
    if (params.status?.length) {
      params.status.forEach((st) => {
        httpParams = httpParams.append('status', st);
      });
    }
    if (params.dateFrom) {
      httpParams = httpParams.set('date_from', params.dateFrom.toISOString());
    }
    if (params.dateTo) {
      httpParams = httpParams.set('date_to', params.dateTo.toISOString());
    }

    return this.http
      .get<Paginated<QuoteResponse>>(`${this.baseUrl}`, { params: httpParams })
      .pipe(
        map((res) => ({
          data: res.data.map((quote) => this.mapQuote(quote)),
          meta: res.meta,
        }))
      );
  }

  get(id: number): Observable<Quote> {
    return this.http
      .get<{ data: QuoteResponse }>(`${this.baseUrl}/${id}`)
      .pipe(map((res) => this.mapQuote(res.data)));
  }

  create(payload: QuoteCreatePayload): Observable<Quote> {
    const body = this.toCreateRequest(payload);
    return this.http
      .post<{ data: QuoteResponse }>(this.baseUrl, body)
      .pipe(map((res) => this.mapQuote(res.data)));
  }

  private mapQuote(raw: QuoteResponse): Quote {
    return {
      id: raw.id,
      quoteNumber: raw.quote_number,
      title: raw.title,
      description: raw.description,
      status: raw.status,
      currency: raw.currency,
      laborCost: raw.labor_cost,
      partsCost: raw.parts_cost,
      discount: raw.discount,
      taxRate: raw.tax_rate,
      totalAmount: raw.total_amount,
      validUntil: raw.valid_until,
      notes: raw.notes,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      customer: raw.customer
        ? {
            id: raw.customer.id,
            firstName: raw.customer.first_name,
            lastName: raw.customer.last_name,
            email: raw.customer.email,
          }
        : undefined,
      device: raw.device
        ? {
            id: raw.device.id,
            type: raw.device.type,
            brand: raw.device.brand,
            modelName: raw.device.model_name,
            modelNumber: raw.device.model_number,
          }
        : undefined,
      items: raw.items?.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        subtotal: item.subtotal,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })),
    };
  }

  private toCreateRequest(payload: QuoteCreatePayload): CreateQuoteRequest {
    const request: CreateQuoteRequest = {
      customer_id: payload.customerId,
      title: payload.title?.trim() || undefined,
      description: payload.description?.trim() || undefined,
      currency: payload.currency?.trim() || undefined,
      labor_cost: payload.laborCost ?? undefined,
      discount: payload.discount ?? undefined,
      tax_rate: payload.taxRate ?? undefined,
      notes: payload.notes?.trim() || undefined,
      valid_until: payload.validUntil
        ? typeof payload.validUntil === 'string'
          ? payload.validUntil
          : payload.validUntil.toISOString()
        : undefined,
      items: payload.items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    };

    if (payload.deviceId != null && payload.deviceId > 0) {
      request.device_id = payload.deviceId;
    }

    return request;
  }
}

interface QuoteResponse {
  id: number;
  quote_number: string;
  title?: string;
  description?: string;
  status: QuoteStatus;
  currency: string;
  labor_cost: number;
  parts_cost: number;
  discount: number;
  tax_rate: number;
  total_amount: number;
  valid_until?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  device?: {
    id: number;
    type: string;
    brand?: string;
    model_name?: string;
    model_number?: string;
  };
  items?: Array<{
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    created_at?: string;
    updated_at?: string;
  }>;
}

interface CreateQuoteRequest {
  customer_id: number;
  device_id?: number;
  title?: string;
  description?: string;
  currency?: string;
  labor_cost?: number;
  discount?: number;
  tax_rate?: number;
  notes?: string;
  valid_until?: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
  }>;
}
