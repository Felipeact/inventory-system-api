/**
 * Shared types mirroring the Inventory System API responses.
 * The API returns un-enveloped JSON (raw objects/arrays).
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  lowStockThreshold: number;
  model?: string | null;
  type?: string | null;
  location?: string | null;
  project?: string | null;
  account?: string | null;
  status?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  // Quantity may arrive flat or nested under `inventory`.
  quantity?: number;
  inventory?: { quantity: number } | null;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  serialCode: string;
  status: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Truck {
  id: string;
  truckNumber: string;
  plateNumber?: string | null;
  status: string;
  technicianId?: string | null;
  technician?: { id: string; name: string; email: string } | null;
}

export interface TruckStockItem {
  id: string;
  productName: string;
  category?: string | null;
  requiredQuantity: number;
  currentQuantity: number;
  minimumQuantity: number;
  expectedPrice?: number | null;
  unit?: string | null;
  notes?: string | null;
}

export interface TruckStockTemplate {
  id: string;
  name: string;
  tradeType?: string | null;
  items?: TruckStockItem[];
}

export interface Receipt {
  id: string;
  truckId: string;
  fileUrl: string;
  status: string;
  totalAmount?: number | null;
  createdAt?: string;
}

export interface InventoryReport {
  totalProducts?: number;
  totalQuantity?: number;
  lowStockCount?: number;
  totalValue?: number;
  [key: string]: unknown;
}

/** Helper to read a product's quantity regardless of API shape. */
export function productQuantity(p: Product): number {
  if (typeof p.quantity === "number") return p.quantity;
  if (p.inventory && typeof p.inventory.quantity === "number")
    return p.inventory.quantity;
  return 0;
}
