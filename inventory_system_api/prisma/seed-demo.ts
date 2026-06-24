/**
 * @file seed-demo.ts
 * @description Provisions a self-contained DEMONSTRATION / TEST company so the app can
 * be shown off (or QA'd) without touching any real customer data. Because the platform
 * is multi-tenant and every record is scoped by `companyId`, everything created here is
 * fully isolated: anything you do while logged into the demo account only ever affects
 * the demo company.
 *
 * What it creates (all clearly labelled "Demo"):
 *   1. A demo Company — "Vantori Demo Co." (PRO plan, generous limits).
 *   2. Three logins covering every role: ADMIN, WAREHOUSE, TECHNICIAN.
 *   3. A realistic field-service product catalogue with inventory levels
 *      (including a few intentionally low-stock items so alerts have something to show).
 *   4. Sample assets.
 *   5. Two trucks, a truck-stock template, and an assignment.
 *
 * Run with:
 *   npm run seed:demo
 *
 * Re-running is SAFE and resets the demo back to this known-good state: records are
 * upserted by their natural unique keys, so duplicates are never created and any edits
 * made while demoing are reverted on the next run.
 *
 * Credentials and company name can be overridden via SEED_DEMO_* env vars (see below);
 * defaults are used otherwise.
 */
import bcrypt from 'bcrypt';
import { prisma, disconnectPrisma } from '../src/lib/prisma';
import { RoleService } from '../src/modules/role/role.service';

/** bcrypt work factor — matches the value used by the auth service for real logins. */
const BCRYPT_ROUNDS = 12;

const DEMO_COMPANY_NAME = process.env.SEED_DEMO_COMPANY_NAME || 'Vantori Demo Co.';
const DEMO_ADMIN_EMAIL = process.env.SEED_DEMO_ADMIN_EMAIL || 'demo@vantori.app';
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'VantoriDemo!2026';

// Extra role-specific logins share the demo password so the whole app is explorable.
const DEMO_WAREHOUSE_EMAIL = process.env.SEED_DEMO_WAREHOUSE_EMAIL || 'warehouse@vantori.app';
const DEMO_TECHNICIAN_EMAIL = process.env.SEED_DEMO_TECHNICIAN_EMAIL || 'tech@vantori.app';

/**
 * Demo catalogue. `qty` below `lowStockThreshold` intentionally trips the low-stock
 * alerts so that part of the UI has data to display.
 */
const DEMO_PRODUCTS: Array<{
  name: string;
  barcode: string;
  model?: string;
  type?: string;
  location?: string;
  qty: number;
  lowStockThreshold?: number;
}> = [
  { name: 'R-410A Refrigerant (25 lb)', barcode: 'DEMO-HVAC-0001', model: 'R410A-25', type: 'Refrigerant', location: 'Aisle A1', qty: 42, lowStockThreshold: 10 },
  { name: '16x25x1 Pleated Air Filter (MERV 11)', barcode: 'DEMO-HVAC-0002', model: 'AF-162501', type: 'Filter', location: 'Aisle A2', qty: 6, lowStockThreshold: 20 },
  { name: 'Dual Run Capacitor 45/5 MFD', barcode: 'DEMO-HVAC-0003', model: 'CAP-4505', type: 'Electrical', location: 'Aisle B1', qty: 28, lowStockThreshold: 8 },
  { name: 'Contactor 2-Pole 30A 24V', barcode: 'DEMO-HVAC-0004', model: 'CON-2P30', type: 'Electrical', location: 'Aisle B1', qty: 3, lowStockThreshold: 6 },
  { name: 'Thermostat (Programmable, WiFi)', barcode: 'DEMO-HVAC-0005', model: 'TSTAT-WIFI', type: 'Controls', location: 'Aisle C3', qty: 15, lowStockThreshold: 5 },
  { name: '3/4" Copper Pipe (10 ft)', barcode: 'DEMO-PLMB-0006', model: 'CU-34-10', type: 'Plumbing', location: 'Aisle D2', qty: 54, lowStockThreshold: 15 },
  { name: 'Condensate Pump 120V', barcode: 'DEMO-HVAC-0007', model: 'CP-120', type: 'Pump', location: 'Aisle C1', qty: 9, lowStockThreshold: 4 },
  { name: 'Igniter (Hot Surface, Universal)', barcode: 'DEMO-HVAC-0008', model: 'IGN-UNIV', type: 'Furnace', location: 'Aisle B3', qty: 2, lowStockThreshold: 5 },
  { name: 'Wire Nuts (Assorted, 500 ct)', barcode: 'DEMO-ELEC-0009', model: 'WN-500', type: 'Electrical', location: 'Aisle B2', qty: 31, lowStockThreshold: 10 },
  { name: 'Refrigerant Gauge Manifold Set', barcode: 'DEMO-TOOL-0010', model: 'GMS-4V', type: 'Tool', location: 'Tool Crib', qty: 7, lowStockThreshold: 3 },
];

const DEMO_ASSETS: Array<{ name: string; type: string; serialCode: string; description?: string }> = [
  { name: 'Fluke 87V Multimeter', type: 'Tool', serialCode: 'DEMO-AST-0001', description: 'Calibrated 2026-01' },
  { name: 'Refrigerant Recovery Machine', type: 'Equipment', serialCode: 'DEMO-AST-0002', description: 'Shop unit' },
  { name: 'Vacuum Pump (5 CFM)', type: 'Equipment', serialCode: 'DEMO-AST-0003' },
  { name: 'Nitrogen Regulator', type: 'Tool', serialCode: 'DEMO-AST-0004' },
];

async function ensureCompany() {
  const existing = await prisma.company.findFirst({ where: { name: DEMO_COMPANY_NAME } });
  if (existing) {
    // Keep limits generous on re-run in case they were edited during a demo.
    return prisma.company.update({
      where: { id: existing.id },
      data: { plan: 'PRO', subscriptionStatus: 'ACTIVE', maxUsers: 25, maxProducts: 5000 },
    });
  }
  return prisma.company.create({
    data: {
      name: DEMO_COMPANY_NAME,
      plan: 'PRO',
      subscriptionStatus: 'ACTIVE',
      maxUsers: 25,
      maxProducts: 5000,
    },
  });
}

async function ensureRoles(companyId: string) {
  const admin = await prisma.role.findFirst({ where: { companyId, name: 'ADMIN' } });
  if (admin) {
    const warehouse = await prisma.role.findFirst({ where: { companyId, name: 'WAREHOUSE' } });
    const technician = await prisma.role.findFirst({ where: { companyId, name: 'TECHNICIAN' } });
    return { admin, warehouse: warehouse!, technician: technician! };
  }
  return new RoleService().createDefaultRoles(companyId);
}

async function ensureUser(opts: {
  companyId: string;
  email: string;
  name: string;
  roleId: string;
  passwordHash: string;
}) {
  const { companyId, email, name, roleId, passwordHash } = opts;
  return prisma.user.upsert({
    where: { email_companyId: { email, companyId } },
    update: { name, roleId, passwordHash, mustChangePassword: false },
    create: { email, name, roleId, passwordHash, companyId, mustChangePassword: false },
  });
}

async function seedProducts(companyId: string) {
  for (const p of DEMO_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { barcode_companyId: { barcode: p.barcode, companyId } },
      update: {
        name: p.name,
        model: p.model,
        type: p.type,
        location: p.location,
        status: 'Active',
        lowStockThreshold: p.lowStockThreshold ?? 5,
      },
      create: {
        name: p.name,
        barcode: p.barcode,
        companyId,
        model: p.model,
        type: p.type,
        location: p.location,
        status: 'Active',
        lowStockThreshold: p.lowStockThreshold ?? 5,
      },
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { quantity: p.qty },
      create: { productId: product.id, quantity: p.qty, companyId },
    });
  }
}

async function seedAssets(companyId: string) {
  for (const a of DEMO_ASSETS) {
    await prisma.asset.upsert({
      where: { serialCode_companyId: { serialCode: a.serialCode, companyId } },
      update: { name: a.name, type: a.type, status: 'active', description: a.description },
      create: {
        name: a.name,
        type: a.type,
        serialCode: a.serialCode,
        status: 'active',
        description: a.description,
        companyId,
      },
    });
  }
}

async function ensureTruck(companyId: string, truckNumber: string, plateNumber: string, technicianId?: string) {
  const existing = await prisma.truck.findFirst({ where: { companyId, truckNumber } });
  if (existing) {
    return prisma.truck.update({
      where: { id: existing.id },
      data: { plateNumber, status: 'ACTIVE', technicianId: technicianId ?? null },
    });
  }
  return prisma.truck.create({
    data: { companyId, truckNumber, plateNumber, status: 'ACTIVE', technicianId: technicianId ?? null },
  });
}

async function seedTrucks(companyId: string, technicianId: string, createdById: string) {
  const truck1 = await ensureTruck(companyId, 'DEMO-TRUCK-01', 'VAN-001', technicianId);
  await ensureTruck(companyId, 'DEMO-TRUCK-02', 'VAN-002');

  // One stock template with a couple of items, assigned to truck 1.
  let template = await prisma.truckStockTemplate.findFirst({
    where: { companyId, name: 'Demo Standard Service Kit' },
  });
  if (!template) {
    template = await prisma.truckStockTemplate.create({
      data: {
        companyId,
        name: 'Demo Standard Service Kit',
        tradeType: 'HVAC',
        createdById,
        items: {
          create: [
            { productName: 'Dual Run Capacitor 45/5 MFD', category: 'Electrical', requiredQuantity: 4, currentQuantity: 4, minimumQuantity: 2, unit: 'ea' },
            { productName: '16x25x1 Pleated Air Filter (MERV 11)', category: 'Filter', requiredQuantity: 10, currentQuantity: 6, minimumQuantity: 4, unit: 'ea' },
            { productName: 'R-410A Refrigerant (25 lb)', category: 'Refrigerant', requiredQuantity: 1, currentQuantity: 1, minimumQuantity: 1, unit: 'tank' },
          ],
        },
      },
    });
  }

  await prisma.truckStockAssignment.upsert({
    where: { truckId_templateId: { truckId: truck1.id, templateId: template.id } },
    update: {},
    create: { truckId: truck1.id, templateId: template.id, assignedById: createdById },
  });
}

async function main() {
  console.log(`Seeding demonstration company "${DEMO_COMPANY_NAME}"...\n`);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const company = await ensureCompany();
  console.log(`✔ Company ready: ${company.name} (${company.id})`);

  const roles = await ensureRoles(company.id);
  console.log('✔ Roles ready: ADMIN, WAREHOUSE, TECHNICIAN');

  const adminUser = await ensureUser({
    companyId: company.id,
    email: DEMO_ADMIN_EMAIL,
    name: 'Demo Admin',
    roleId: roles.admin.id,
    passwordHash,
  });
  await ensureUser({
    companyId: company.id,
    email: DEMO_WAREHOUSE_EMAIL,
    name: 'Demo Warehouse',
    roleId: roles.warehouse.id,
    passwordHash,
  });
  const techUser = await ensureUser({
    companyId: company.id,
    email: DEMO_TECHNICIAN_EMAIL,
    name: 'Demo Technician',
    roleId: roles.technician.id,
    passwordHash,
  });
  console.log('✔ Users ready: admin / warehouse / technician');

  await seedProducts(company.id);
  console.log(`✔ Products + inventory ready (${DEMO_PRODUCTS.length} items, some low-stock)`);

  await seedAssets(company.id);
  console.log(`✔ Assets ready (${DEMO_ASSETS.length} items)`);

  await seedTrucks(company.id, techUser.id, adminUser.id);
  console.log('✔ Trucks, stock template, and assignment ready');

  console.log('\nDemo account is ready. Log in with:');
  console.log(`  Admin       ${DEMO_ADMIN_EMAIL}      / ${DEMO_PASSWORD}`);
  console.log(`  Warehouse   ${DEMO_WAREHOUSE_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Technician  ${DEMO_TECHNICIAN_EMAIL}      / ${DEMO_PASSWORD}`);
  console.log('\nEverything here is isolated to the demo company — safe to explore.');
  console.log('Re-run `npm run seed:demo` at any time to reset the demo to this state.');
}

main()
  .catch((err) => {
    console.error('Demo seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
