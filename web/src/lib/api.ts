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
  AdminAnalytics,
  AdminCompany,
  AdminQuote,
  CreateQuoteResult,
  Deal,
  BillingStatus,
  Assignment,
  Asset,
  AuditLog,
  AuthResponse,
  CompanyUser,
  InventoryReport,
  Movement,
  Product,
  Receipt,
  TemplateItem,
  Truck,
  TruckStockItem,
  TruckStockTemplate,
} from "./types";

/** The live API to fall back to when no valid override is configured. */
const DEFAULT_API_BASE_URL =
  "https://inventory-system-api-production.up.railway.app";

/**
 * Resolve the API base URL from the environment, defending against the common
 * failure modes: unset, empty, a stray trailing slash, or the literal strings
 * "undefined"/"null" that leak in from misconfigured .env files or shells.
 * Falls back to the production API so the app works with zero configuration.
 */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw || raw === "undefined" || raw === "null") return DEFAULT_API_BASE_URL;
  return raw.replace(/\/$/, "");
}

export const API_BASE_URL = resolveApiBaseUrl();

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

/** Actionable message for a fetch that never reached the API (down / wrong URL / CORS). */
function networkErrorMessage() {
  return (
    `Couldn't reach the API at ${API_BASE_URL}. Check that the API is running, ` +
    `that NEXT_PUBLIC_API_BASE_URL is correct, and that the API's CORS_ORIGINS ` +
    `includes this site's URL.`
  );
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    // A thrown fetch means the request never reached the API: the API is down,
    // NEXT_PUBLIC_API_BASE_URL is wrong, or CORS_ORIGINS doesn't allow this site.
    throw new ApiError(0, networkErrorMessage());
  }

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

  async updateAsset(id: string, input: Partial<Asset>) {
    return request<Asset>(`/assets/${id}`, { method: "PUT", body: input });
  },

  // ---- Users / team (admin) ----
  async listUsers() {
    return asArray<CompanyUser>(await request("/users"), "users");
  },
  async inviteUser(input: { name?: string; email: string; role: string }) {
    return request<{ user: CompanyUser; emailSent: boolean; temporaryPassword?: string }>(
      "/users/invite",
      { method: "POST", body: input },
    );
  },
  async updateUser(
    id: string,
    input: { name?: string; email?: string; role?: string; password?: string },
  ) {
    return request<CompanyUser>(`/users/${id}`, { method: "PUT", body: input });
  },
  async resetUserPassword(id: string) {
    return request<{ temporaryPassword: string }>(`/users/${id}/reset-password`, {
      method: "POST",
    });
  },
  async deleteUser(id: string) {
    return request(`/users/${id}`, { method: "DELETE" });
  },
  async updateMe(input: { name?: string; email?: string }) {
    return request<CompanyUser>("/users/me", { method: "PATCH", body: input });
  },

  // ---- Trucks ----
  async createTruck(input: {
    truckNumber: string;
    plateNumber?: string;
    status?: string;
    technicianId?: string;
  }) {
    return request<Truck>("/truck-stock/trucks", { method: "POST", body: input });
  },
  async updateTruck(id: string, input: Partial<Truck> & { technicianId?: string | null }) {
    return request<Truck>(`/truck-stock/trucks/${id}`, { method: "PUT", body: input });
  },

  // ---- Truck-stock templates ----
  async getTemplate(id: string) {
    return request<TruckStockTemplate>(`/truck-stock/templates/${id}`);
  },
  async createTemplate(input: {
    name: string;
    tradeType?: string;
    items: TemplateItem[];
  }) {
    return request<TruckStockTemplate>("/truck-stock/templates", {
      method: "POST",
      body: input,
    });
  },
  async updateTemplate(
    id: string,
    input: { name?: string; tradeType?: string; items?: TemplateItem[] },
  ) {
    return request<TruckStockTemplate>(`/truck-stock/templates/${id}`, {
      method: "PUT",
      body: input,
    });
  },
  async deleteTemplate(id: string) {
    return request(`/truck-stock/templates/${id}`, { method: "DELETE" });
  },

  // ---- Assignments ----
  async listAssignments() {
    return asArray<Assignment>(await request("/truck-stock/assignments"), "assignments");
  },
  async createAssignment(input: { truckId: string; templateId: string }) {
    return request<Assignment>("/truck-stock/assignments", {
      method: "POST",
      body: input,
    });
  },
  async updateAssignment(id: string, input: { truckId: string; templateId: string }) {
    return request<Assignment>(`/truck-stock/assignments/${id}`, {
      method: "PUT",
      body: input,
    });
  },
  async deleteAssignment(id: string) {
    return request(`/truck-stock/assignments/${id}`, { method: "DELETE" });
  },

  // ---- Truck-stock operations ----
  async transferToTruck(input: {
    productId: string;
    truckStockItemId: string;
    quantity: number;
  }) {
    return request("/truck-stock/transfer-to-truck", { method: "POST", body: input });
  },
  async useTruckItem(input: { truckStockItemId: string; quantity: number; notes?: string }) {
    return request("/truck-stock/use-item", { method: "POST", body: input });
  },
  async updateTruckItemQuantity(itemId: string, quantity: number) {
    return request(`/truck-stock/items/${itemId}/quantity`, {
      method: "PATCH",
      body: { quantity },
    });
  },
  async listMovements() {
    return asArray<Movement>(await request("/truck-stock/movements"), "movements");
  },

  // ---- Receipts ----
  async uploadReceiptFile(fileName: string, fileContentBase64: string) {
    return request<{ fileUrl: string; fileName: string; sizeBytes: number }>(
      "/truck-stock/receipts/upload",
      { method: "POST", body: { fileName, fileContentBase64 } },
    );
  },
  async createReceipt(input: { truckId: string; fileUrl: string; totalAmount?: number }) {
    return request<Receipt>("/truck-stock/receipts", { method: "POST", body: input });
  },
  async addReceiptItem(
    receiptId: string,
    input: { itemName: string; quantity: number; unitPrice?: number; totalPrice?: number },
  ) {
    return request(`/truck-stock/receipts/${receiptId}/items`, {
      method: "POST",
      body: input,
    });
  },
  async reconcileReceipt(receiptId: string) {
    return request(`/truck-stock/receipts/${receiptId}/reconcile`, { method: "POST" });
  },
  async updateReceiptStatus(receiptId: string, status: string) {
    return request<Receipt>(`/truck-stock/receipts/${receiptId}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  // ---- Reports (extended) ----
  async auditLogs() {
    return asArray<AuditLog>(await request("/reports/audit-logs"), "logs");
  },
  async stockMovements() {
    return asArray<Movement>(await request("/reports/stock-movements"), "movements");
  },

  // ---- Public lead / demo capture ----
  async submitLead(input: Record<string, unknown>) {
    return request<{ message: string }>("/leads", {
      method: "POST",
      body: input,
      auth: false,
    });
  },

  // ---- Billing (Stripe) ----
  async billingStatus() {
    return request<BillingStatus>("/billing/status");
  },
  /** Start Stripe Checkout for a plan; returns a hosted URL to redirect to. */
  async billingCheckout(plan: string) {
    return request<{ url: string }>("/billing/checkout", {
      method: "POST",
      body: { plan },
    });
  },
  /** Open the Stripe customer portal; returns a hosted URL to redirect to. */
  async billingPortal() {
    return request<{ url: string }>("/billing/portal", { method: "POST" });
  },

  // ---- AI assistant ----
  async aiStatus() {
    return request<{ enabled: boolean }>("/ai/status");
  },
  /**
   * Send the full conversation (plain-text turns; the last one is the new user
   * message) and get back the assistant's reply plus the actions it took.
   */
  async aiChat(messages: { role: "user" | "assistant"; content: string }[]) {
    return request<{ reply: string; actions: { tool: string; ok: boolean }[] }>(
      "/ai/chat",
      { method: "POST", body: { messages } },
    );
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
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/super-admin${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    // Never reached the API: it's down, the URL is wrong, or CORS blocked it.
    throw new ApiError(0, networkErrorMessage());
  }

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
  async createCode(input: { code: string; plan: string }) {
    // Limits + AI are derived from the plan server-side (single source of truth).
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
  async updateCompanyPlan(id: string, plan: string) {
    // Limits + AI follow the plan automatically (single source of truth).
    return saRequest(`/companies/${id}/plan`, { method: "PATCH", body: { plan } });
  },

  // ---- Revenue analytics ----
  async analytics() {
    return saRequest<AdminAnalytics>("/analytics");
  },
  /**
   * Set (number) or clear (null) a company's flat monthly contract amount, used for
   * custom/Enterprise deals. Clearing reverts to standard per-seat plan pricing.
   */
  async setCompanyPricing(id: string, monthlyPriceOverride: number | null) {
    return saRequest(`/companies/${id}/pricing`, {
      method: "PATCH",
      body: { monthlyPriceOverride },
    });
  },

  // ---- Custom recurring charges ("quotes") ----
  async createQuote(
    companyId: string,
    input: {
      amount: number;
      interval: "monthly" | "biweekly";
      label?: string;
      setupFee?: number;
      setupLabel?: string;
    },
  ) {
    return saRequest<CreateQuoteResult>(`/companies/${companyId}/quote`, {
      method: "POST",
      body: input,
    });
  },
  async listQuotes(companyId: string) {
    return asArray<AdminQuote>(await saRequest(`/companies/${companyId}/quotes`), "quotes");
  },
  async cancelQuote(subscriptionId: string) {
    return saRequest(`/quotes/${subscriptionId}/cancel`, { method: "POST" });
  },

  // ---- Sales pipeline: prospect quotes (deals) ----
  async listDeals() {
    return asArray<Deal>(await saRequest("/deals"), "deals");
  },
  async createDeal(input: {
    companyName: string;
    contactEmail: string;
    plan: string;
    seats?: number;
    maxUsers?: number;
    maxProducts?: number;
    amount?: number;
    interval?: "monthly" | "biweekly";
    description?: string;
    setupFee?: number;
    setupLabel?: string;
  }) {
    return saRequest<Deal>("/deals", { method: "POST", body: input });
  },
  async sendDeal(id: string) {
    return saRequest<Deal>(`/deals/${id}/send`, { method: "POST" });
  },
  async emailDealCode(id: string) {
    return saRequest<Deal>(`/deals/${id}/email-code`, { method: "POST" });
  },
  async declineDeal(id: string) {
    return saRequest<Deal>(`/deals/${id}/decline`, { method: "POST" });
  },
  async removeDeal(id: string) {
    return saRequest(`/deals/${id}`, { method: "DELETE" });
  },
  async syncDeal(id: string) {
    return saRequest<Deal>(`/deals/${id}/sync`, { method: "POST" });
  },
  async issueDealCode(id: string) {
    return saRequest<Deal>(`/deals/${id}/issue-code`, { method: "POST" });
  },
  async reconcile() {
    return saRequest<{ companiesSynced: number; quotesResolved: number }>("/reconcile", {
      method: "POST",
    });
  },
};
