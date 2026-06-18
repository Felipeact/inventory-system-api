/**
 * Lightweight typed client for the Inventory System API.
 *
 * - Reads the base URL from NEXT_PUBLIC_API_BASE_URL.
 * - Persists JWT access/refresh tokens in localStorage (browser only).
 * - Injects `Authorization: Bearer` and transparently refreshes the access
 *   token once on a 401 before retrying the original request.
 */
import type {
  ActivationCode,
  AdminCompany,
  Asset,
  AuthResponse,
  InventoryReport,
  Product,
  Receipt,
  Truck,
  TruckStockItem,
  TruckStockTemplate,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const ACCESS_KEY = "sp_access_token";
const REFRESH_KEY = "sp_refresh_token";
const USER_KEY = "sp_user";
const SA_TOKEN_KEY = "sp_sa_token";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  access: () => (isBrowser() ? localStorage.getItem(ACCESS_KEY) : null),
  refresh: () => (isBrowser() ? localStorage.getItem(REFRESH_KEY) : null),
  user: () => {
    if (!isBrowser()) return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set(session: AuthResponse) {
    if (!isBrowser()) return;
    localStorage.setItem(ACCESS_KEY, session.accessToken);
    localStorage.setItem(REFRESH_KEY, session.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  },
  setAccess(token: string) {
    if (isBrowser()) localStorage.setItem(ACCESS_KEY, token);
  },
  clear() {
    if (!isBrowser()) return;
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/**
 * Super-admin token store. The super-admin JWT is separate from company-user
 * tokens (different audience, 12h expiry, no refresh) so it is kept under its
 * own key and never mixed into the regular Authorization flow.
 */
export const superAdminStore = {
  token: () => (isBrowser() ? localStorage.getItem(SA_TOKEN_KEY) : null),
  set(token: string) {
    if (isBrowser()) localStorage.setItem(SA_TOKEN_KEY, token);
  },
  clear() {
    if (isBrowser()) localStorage.removeItem(SA_TOKEN_KEY);
  },
};

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (auth) {
    const token = tokenStore.access();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // Transparent single refresh on expiry.
  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, { ...opts, retry: false });
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.refresh();
  if (!refreshToken) return false;
  if (refreshing) return refreshing;

  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return false;
      }
      const data = (await res.json()) as { accessToken: string };
      tokenStore.setAccess(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/** Some list endpoints may wrap results; normalize to an array. */
function asArray<T>(data: unknown, key?: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (key && Array.isArray(obj[key])) return obj[key] as T[];
    for (const v of Object.values(obj)) if (Array.isArray(v)) return v as T[];
  }
  return [];
}

export const api = {
  // ---- Auth ----
  async login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  },
  async register(input: {
    email: string;
    password: string;
    code: string;
    companyName: string;
  }) {
    return request<AuthResponse>("/auth/register", {
      method: "POST",
      body: input,
      auth: false,
    });
  },
  async changePassword(currentPassword: string, newPassword: string) {
    return request("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  },
  async requestReset(email: string) {
    return request("/auth/request-reset", {
      method: "POST",
      body: { email },
      auth: false,
    });
  },
  async logout() {
    const refreshToken = tokenStore.refresh();
    try {
      if (refreshToken)
        await request("/auth/logout", {
          method: "POST",
          body: { refreshToken },
          auth: false,
        });
    } finally {
      tokenStore.clear();
    }
  },

  // ---- Products ----
  async listProducts() {
    return asArray<Product>(await request("/products"), "products");
  },
  async lowStockProducts() {
    return asArray<Product>(await request("/products/low-stock"), "products");
  },
  async createProduct(input: Partial<Product> & { name: string; barcode: string }) {
    return request<Product>("/products", { method: "POST", body: input });
  },
  async updateProduct(id: string, input: Partial<Product>) {
    return request<Product>(`/products/${id}`, { method: "PUT", body: input });
  },
  async deleteProduct(id: string) {
    return request(`/products/${id}`, { method: "DELETE" });
  },
  async scanIn(barcode: string, quantity: number) {
    return request("/products/scan-in", {
      method: "POST",
      body: { barcode, quantity },
    });
  },
  async scanOut(barcode: string, quantity: number) {
    return request("/products/scan-out", {
      method: "POST",
      body: { barcode, quantity },
    });
  },

  // ---- Assets ----
  async listAssets() {
    return asArray<Asset>(await request("/assets"), "assets");
  },
  async createAsset(input: {
    name: string;
    type: string;
    serialCode: string;
    status?: string;
    description?: string;
  }) {
    return request<Asset>("/assets", { method: "POST", body: input });
  },
  async deleteAsset(id: string) {
    return request(`/assets/${id}`, { method: "DELETE" });
  },

  // ---- Truck stock ----
  async listTrucks() {
    return asArray<Truck>(await request("/truck-stock/trucks"), "trucks");
  },
  async listTemplates() {
    return asArray<TruckStockTemplate>(
      await request("/truck-stock/templates"),
      "templates",
    );
  },
  async myStock() {
    return asArray<TruckStockItem>(
      await request("/truck-stock/my-stock"),
      "items",
    );
  },
  async truckLowStock() {
    return asArray<TruckStockItem>(
      await request("/truck-stock/low-stock"),
      "items",
    );
  },
  async listReceipts() {
    return asArray<Receipt>(await request("/truck-stock/receipts"), "receipts");
  },

  // ---- Reports ----
  async inventoryReport() {
    return request<InventoryReport>("/reports/inventory-summary");
  },
  async assetsReport() {
    return request<InventoryReport>("/reports/assets-summary");
  },

  // ---- Exports ----
  /**
   * Download an export file (e.g. "/exports/products/pdf") with the bearer
   * token attached, then trigger a browser save. Available formats per
   * resource: csv, xlsx, pdf (plus /exports/company/json).
   */
  async downloadExport(path: string, filename: string) {
    const fetchExport = () => {
      const token = tokenStore.access();
      return fetch(`${API_BASE_URL}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
    };

    let res = await fetchExport();
    // Mirror request()'s behaviour: transparently refresh once on an expired token.
    if (res.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) res = await fetchExport();
    }
    if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
    const blob = await res.blob();
    if (!isBrowser()) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ---- Public lead / demo capture ----
  async submitLead(input: Record<string, unknown>) {
    return request<{ message: string }>("/leads", {
      method: "POST",
      body: input,
      auth: false,
    });
  },
};

/**
 * Authenticated request against the super-admin endpoints. Uses the separate
 * super-admin token; on a 401 it clears the token so the caller can redirect to
 * the super-admin login (there is no refresh flow for this short-lived token).
 */
async function saRequest<T>(
  path: string,
  opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const { method = "GET", body, headers = {} } = opts;
  const token = superAdminStore.token();
  const res = await fetch(`${API_BASE_URL}/super-admin${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 401) {
    superAdminStore.clear();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data?.message || data?.error || message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Super-admin platform-operator API (separate auth from company users). */
export const superAdminApi = {
  /** Bootstrap the very first super-admin. Requires the one-time bootstrap secret. */
  async create(email: string, password: string, bootstrapSecret: string) {
    return saRequest("/create", {
      method: "POST",
      body: { email, password },
      headers: { "x-bootstrap-secret": bootstrapSecret },
    });
  },
  async login(email: string, password: string) {
    const data = await saRequest<{ token: string }>("/login", {
      method: "POST",
      body: { email, password },
    });
    superAdminStore.set(data.token);
    return data;
  },
  logout() {
    superAdminStore.clear();
  },

  // ---- Activation codes ----
  async listCodes() {
    return asArray<ActivationCode>(await saRequest("/activation-codes"), "codes");
  },
  async createCode(input: {
    code: string;
    plan: string;
    maxUsers: number;
    maxProducts: number;
  }) {
    return saRequest<ActivationCode>("/activation-codes", { method: "POST", body: input });
  },
  async deactivateCode(id: string) {
    return saRequest(`/activation-codes/${id}/deactivate`, { method: "PATCH" });
  },

  // ---- Companies ----
  async listCompanies() {
    return asArray<AdminCompany>(await saRequest("/companies"), "companies");
  },
  async activateCompany(id: string) {
    return saRequest(`/companies/${id}/activate`, { method: "PATCH" });
  },
  async deactivateCompany(id: string) {
    return saRequest(`/companies/${id}/deactivate`, { method: "PATCH" });
  },
  async updateCompanyPlan(
    id: string,
    input: { plan: string; maxUsers: number; maxProducts: number },
  ) {
    return saRequest(`/companies/${id}/plan`, { method: "PATCH", body: input });
  },
};
