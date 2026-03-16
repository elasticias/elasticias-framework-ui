export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  categoryName: string;
  available: boolean;
  modifierGroups: ModifierGroup[];
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  priceAdjustment: number;
  available: boolean;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  productCount: number;
}
