/**
 * @file ai.tools.ts
 * @description Tool surface the AI assistant can call. Each tool maps to an existing
 * service method, so the assistant operates through the exact same business logic,
 * validation, and audit logging as the REST API — it has no privileged backdoor.
 *
 * Two guarantees make "full AI control" safe:
 *  1. Tenant isolation — every service call is scoped to the caller's `companyId`,
 *     so the assistant can only ever see or touch the signed-in user's own company.
 *  2. RBAC — write tools declare a required permission. If the user lacks it the
 *     tool is rejected with an error result the model explains, rather than executed.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { PERMISSIONS } from '../../constants/permissions';
import { ProductService } from '../products/product.service';
import { AssetService } from '../asset/asset.service';
import { ReportService } from '../report/report.service';
import { TruckStockService } from '../truck-stock/truck-stock.service';
import { UserService } from '../user/user.service';
import { AppError } from '../../core/app-error';

/** Identity + permissions of the user on whose behalf the assistant is acting. */
export interface AiContext {
  companyId: string;
  userId: string;
  role: string;
  permissions: string[];
}

/** Result of running a tool. `isError` flips the tool_result is_error flag. */
export interface ToolResult {
  content: string;
  isError: boolean;
}

interface ToolDef {
  schema: Anthropic.Tool;
  /** Permission required to run this tool. Omitted for read-only/no-gate tools. */
  permission?: string;
  run: (input: any, ctx: AiContext) => Promise<unknown>;
}

// Services are stateless and cheap to construct; share one set per process.
const products = new ProductService();
const assets = new AssetService();
const reports = new ReportService();
const trucks = new TruckStockService();
const users = new UserService();

/**
 * The full tool registry. Keep descriptions action-oriented and explicit about
 * *when* to call each one — recent Claude models reach for tools based on these.
 */
const REGISTRY: Record<string, ToolDef> = {
  // ---- Reporting / read ----
  inventory_summary: {
    schema: {
      name: 'inventory_summary',
      description:
        'Get a high-level inventory report for the company: total products, total ' +
        'quantity on hand, and how many items are below their low-stock threshold. ' +
        'Call this for questions like "how is my stock?" or to start a report.',
      input_schema: { type: 'object', properties: {} },
    },
    run: (_input, ctx) => reports.inventorySummary(ctx.companyId),
  },

  assets_summary: {
    schema: {
      name: 'assets_summary',
      description:
        'Get a report of company assets: total, active, and inactive counts.',
      input_schema: { type: 'object', properties: {} },
    },
    run: (_input, ctx) => reports.assetsSummary(ctx.companyId),
  },

  list_products: {
    schema: {
      name: 'list_products',
      description:
        'List/search products with their current quantity and low-stock threshold. ' +
        'Use the `search` argument to find products by name or barcode. Returns ' +
        'product IDs needed for update_product / delete_product.',
      input_schema: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Filter by product name or barcode.' },
          limit: { type: 'integer', description: 'Max rows (1-100, default 20).' },
        },
      },
    },
    run: (input, ctx) =>
      products.getAll(ctx.companyId, { search: input?.search, limit: input?.limit }),
  },

  low_stock_products: {
    schema: {
      name: 'low_stock_products',
      description:
        'List products that are at or below their low-stock threshold and need reordering.',
      input_schema: { type: 'object', properties: {} },
    },
    run: (_input, ctx) => products.getLowStock(ctx.companyId),
  },

  list_assets: {
    schema: {
      name: 'list_assets',
      description: 'List/search company assets (tools, equipment) and their status.',
      input_schema: {
        type: 'object',
        properties: { search: { type: 'string', description: 'Filter by name/serial.' } },
      },
    },
    run: (input, ctx) => assets.getAll(ctx.companyId, { search: input?.search }),
  },

  list_trucks: {
    schema: {
      name: 'list_trucks',
      description: 'List the fleet of trucks and their assigned technicians.',
      input_schema: { type: 'object', properties: {} },
    },
    run: (_input, ctx) => trucks.getTrucks(ctx.companyId),
  },

  truck_low_stock: {
    schema: {
      name: 'truck_low_stock',
      description: 'List truck-stock items across the fleet that are running low.',
      input_schema: { type: 'object', properties: {} },
    },
    run: (_input, ctx) => trucks.getLowStockItems(ctx.companyId),
  },

  stock_movements: {
    schema: {
      name: 'stock_movements',
      description:
        'Recent stock movement history (scans in/out, transfers). Useful for ' +
        'auditing what changed and when.',
      input_schema: {
        type: 'object',
        properties: { limit: { type: 'integer', description: 'Max rows (1-100).' } },
      },
    },
    run: (input, ctx) => reports.stockMovements(ctx.companyId, { limit: input?.limit }),
  },

  list_users: {
    schema: {
      name: 'list_users',
      description: 'List the team members (users) in the company and their roles.',
      input_schema: { type: 'object', properties: {} },
    },
    permission: PERMISSIONS.MANAGE_USERS,
    run: (_input, ctx) => users.getUsers(ctx.companyId),
  },

  // ---- Write / actions ----
  create_product: {
    schema: {
      name: 'create_product',
      description:
        'Create a new product in inventory. Requires a unique barcode. Set ' +
        '`quantity` for opening stock and `lowStockThreshold` for reorder alerts.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          barcode: { type: 'string' },
          quantity: { type: 'integer', description: 'Opening quantity (default 0).' },
          lowStockThreshold: { type: 'integer', description: 'Reorder threshold (default 5).' },
          model: { type: 'string' },
          type: { type: 'string' },
          location: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'barcode'],
      },
    },
    permission: PERMISSIONS.ADD_PRODUCT,
    run: (input, ctx) => products.create(input, ctx.companyId, ctx.userId),
  },

  update_product: {
    schema: {
      name: 'update_product',
      description:
        'Update fields on an existing product (look up its id with list_products first).',
      input_schema: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          name: { type: 'string' },
          lowStockThreshold: { type: 'integer' },
          model: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['productId'],
      },
    },
    permission: PERMISSIONS.ADD_PRODUCT,
    run: (input, ctx) => {
      const { productId, ...dto } = input ?? {};
      return products.updateProduct(productId, dto, ctx.companyId, ctx.userId);
    },
  },

  delete_product: {
    schema: {
      name: 'delete_product',
      description:
        'Permanently delete a product. Destructive — confirm with the user before calling.',
      input_schema: {
        type: 'object',
        properties: { productId: { type: 'string' } },
        required: ['productId'],
      },
    },
    permission: PERMISSIONS.ADD_PRODUCT,
    run: (input, ctx) => products.deleteProduct(input.productId, ctx.companyId, ctx.userId),
  },

  scan_in: {
    schema: {
      name: 'scan_in',
      description: 'Add stock to a product by barcode (receiving / restocking).',
      input_schema: {
        type: 'object',
        properties: {
          barcode: { type: 'string' },
          quantity: { type: 'integer', description: 'Amount to add (> 0).' },
        },
        required: ['barcode', 'quantity'],
      },
    },
    permission: PERMISSIONS.SCAN_IN,
    run: (input, ctx) => products.scanIn(input.barcode, input.quantity, ctx.companyId, ctx.userId),
  },

  scan_out: {
    schema: {
      name: 'scan_out',
      description: 'Remove stock from a product by barcode (issuing / consumption).',
      input_schema: {
        type: 'object',
        properties: {
          barcode: { type: 'string' },
          quantity: { type: 'integer', description: 'Amount to remove (> 0).' },
        },
        required: ['barcode', 'quantity'],
      },
    },
    permission: PERMISSIONS.SCAN_OUT,
    run: (input, ctx) => products.scanOut(input.barcode, input.quantity, ctx.companyId, ctx.userId),
  },

  create_asset: {
    schema: {
      name: 'create_asset',
      description: 'Register a new company asset (tool/equipment) with a unique serial code.',
      input_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          serialCode: { type: 'string' },
          status: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['name', 'type', 'serialCode'],
      },
    },
    permission: PERMISSIONS.ADD_ASSET,
    run: (input, ctx) => assets.create(input, ctx.companyId, ctx.userId),
  },

  create_truck: {
    schema: {
      name: 'create_truck',
      description: 'Add a truck to the fleet.',
      input_schema: {
        type: 'object',
        properties: {
          truckNumber: { type: 'string' },
          plateNumber: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['truckNumber'],
      },
    },
    permission: PERMISSIONS.MANAGE_TRUCK_STOCK,
    run: (input, ctx) => trucks.createTruck(input, ctx.companyId, ctx.userId),
  },

  invite_user: {
    schema: {
      name: 'invite_user',
      description:
        'Invite a new team member by email with a role (ADMIN, WAREHOUSE, or TECHNICIAN). ' +
        'Sends them an invite/temporary password. Confirm details with the user first.',
      input_schema: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['ADMIN', 'WAREHOUSE', 'TECHNICIAN'] },
        },
        required: ['email', 'role'],
      },
    },
    permission: PERMISSIONS.MANAGE_USERS,
    run: (input, ctx) => users.inviteUser(input, ctx.companyId, ctx.userId),
  },
};

/** Schemas to send to Claude. */
export const aiTools: Anthropic.Tool[] = Object.values(REGISTRY).map((t) => t.schema);

/**
 * Execute one tool call. Enforces RBAC, then runs the mapped service method.
 * Never throws — failures (permission, validation, not-found) come back as an
 * error result so the model can read it and recover or explain to the user.
 */
export async function executeTool(
  name: string,
  input: unknown,
  ctx: AiContext,
): Promise<ToolResult> {
  const tool = REGISTRY[name];
  if (!tool) {
    return { content: `Unknown tool: ${name}`, isError: true };
  }

  if (tool.permission && !ctx.permissions.includes(tool.permission)) {
    return {
      content:
        `Permission denied: your role (${ctx.role}) lacks the "${tool.permission}" ` +
        `permission required to ${name}. Tell the user they need an admin to do this.`,
      isError: true,
    };
  }

  try {
    const result = await tool.run(input ?? {}, ctx);
    return { content: JSON.stringify(result ?? { ok: true }), isError: false };
  } catch (err) {
    const message =
      err instanceof AppError ? err.message : err instanceof Error ? err.message : String(err);
    return { content: `Error running ${name}: ${message}`, isError: true };
  }
}
