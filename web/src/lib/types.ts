/**
 * Shared types mirroring the Inventory System API responses.
 * The API returns un-enveloped JSON (raw objects/arrays).
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Effective permission names (role + per-user grants) returned on login. */
  permissions?: string[];
  mustChangePassword?: boolean;
}

/** A company team member as returned by GET /users. */
export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role?: { name: string } | null;
  roleId?: string;
  mustChangePassword?: boolean;
}

/** Truck-stock template line item. */
export interface TemplateItem {
  id?: string;
  productName: string;
  category?: string | null;
  requiredQuantity: number;
  currentQuantity?: number;
  minimumQuantity?: number;
  expectedPrice?: number | null;
  unit?: string | null;
  notes?: string | null;
}

/** A truck-stock assignment of a template to a truck. */
export interface Assignment {
  id: string;
  truckId: string;
  templateId: string;
  truck?: Truck | null;
  template?: TruckStockTemplate | null;
  createdAt?: string;
}

/** A truck-stock movement / history entry. */
export interface Movement {
  id: string;
  action: string;
  previousQuantity: number;
  newQuantity: number;
  notes?: string | null;
  createdAt?: string;
  truckStockItem?: { productName?: string } | null;
  changedBy?: { name?: string; email?: string } | null;
}

/** An audit log entry from GET /reports/audit-logs. */
export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  companyId: string;
  details?: string | null;
  createdAt: string;
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

/** Super-admin: a tenant company as returned by /super-admin/companies. */
export interface AdminCompany {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  maxUsers: number;
  maxProducts: number;
  createdAt?: string;
  users?: { id: string; email: string }[];
  products?: { id: string }[];
}

/** Super-admin: an activation code as returned by /super-admin/activation-codes. */
export interface ActivationCode {
  id: string;
  code: string;
  plan: string;
  maxUsers: number;
  maxProducts: number;
  isUsed: boolean;
  isActive: boolean;
  companyId?: string | null;
}

/** Helper to read a product's quantity regardless of API shape. */
export function productQuantity(p: Product): number {
  if (typeof p.quantity === "number") return p.quantity;
  if (p.inventory && typeof p.inventory.quantity === "number")
    return p.inventory.quantity;
  return 0;
}
