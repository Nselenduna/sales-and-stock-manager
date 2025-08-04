export interface SalesTransaction {
  id: string;
  date: Date;
  total: number;
  items: SalesItem[];
  customerId?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface SalesItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface SalesStats {
  dailyTotal: number;
  monthlyTotal: number;
  topProducts: Array<{ 
    productId: string;
    quantity: number;
    revenue: number;
  }>; 
}