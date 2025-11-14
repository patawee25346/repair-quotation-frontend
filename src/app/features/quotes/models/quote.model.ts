export type QuoteStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'expired';

export interface QuoteItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteItemPayload {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface QuoteCustomerSummary {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface QuoteDeviceSummary {
  id: number;
  type: string;
  brand?: string;
  modelName?: string;
  modelNumber?: string;
}

export interface Quote {
  id: number;
  quoteNumber: string;
  title?: string;
  description?: string;
  status: QuoteStatus;
  currency: string;
  laborCost: number;
  partsCost: number;
  discount: number;
  taxRate: number;
  totalAmount: number;
  validUntil?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: QuoteCustomerSummary;
  device?: QuoteDeviceSummary;
  items?: QuoteItem[];
}

export interface QuoteCreatePayload {
  customerId: number;
  deviceId?: number;
  title?: string;
  description?: string;
  currency?: string;
  laborCost?: number;
  discount?: number;
  taxRate?: number;
  notes?: string;
  validUntil?: Date | string;
  items: QuoteItemPayload[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    [key: string]: unknown;
  };
}
