export interface StoreConfig {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  logoUrl: string;
  bannerUrl: string;
  description: string;
  currency: string;
  locale: string;
  timezone: string;
  primaryColor: string;
  secondaryColor: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  minimumOrderAmount: number;
  deliveryFee: number;
  taxRate: number;
  businessHours: BusinessHours[];
  contactPhone: string;
  contactEmail: string;
  address: string;
}

export interface BusinessHours {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}
