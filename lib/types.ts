export interface Product {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  imageUrl?: string;
  unit_price: number; // NEW: Price per unit of the product
  description?: string; // NEW: Product description/notes
  category?: string; // NEW: Product category/group
  createdAt: string;
  updatedAt: string;
}
