export type CustomerStatus = 'active' | 'inactive';

export interface CustomerDevice {
  id: number;
  name?: string;
  type: string;
  brand?: string;
  modelName?: string;
  modelNumber?: string;
  serialNumber?: string;
  status?: 'active' | 'inactive' | 'repair' | 'sold';
  problemDetails?: string;
  notes?: string;
  purchaseDate?: string;
  createdAt?: string;
  updatedAt?: string;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    description?: string;
    isActive?: boolean;
  };
}

export interface Customer {
  id: number;
  code?: string;
  name?: string;
  companyName?: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
  status: CustomerStatus;
  createdAt?: string;
  updatedAt?: string;
  devices?: CustomerDevice[];
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    status?: string;
  };
}

export interface CustomerPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  taxId?: string;
  notes?: string;
  companyName?: string;
  status?: CustomerStatus;
}
