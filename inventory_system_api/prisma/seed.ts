/**
 * @file seed.ts
 * @description Idempotent first-run seed. Bootstraps the platform so a test/admin
 * account can be created immediately, without hand-rolling curl commands:
 *
 *   1. Seeds the global permission catalogue.
 *   2. Creates the first super-admin (if none exists).
 *   3. Creates a sample activation code (if it doesn't exist) that a company admin
 *      can use on the web "Register" page to create the first real account.
 *
 * Values are read from the environment with safe defaults. Run with:
 *   npm run seed
 *
 * Re-running is safe: existing records are left untouched.
 */
import bcrypt from 'bcrypt';
import { prisma, disconnectPrisma } from '../src/lib/prisma';
import { RoleService } from '../src/modules/role/role.service';

const BCRYPT_ROUNDS = 12;

async function main() {
  const adminEmail = process.env.SEED_SUPER_ADMIN_EMAIL || 'admin@inventory.local';
  const adminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe!2026';

  const code = (process.env.SEED_ACTIVATION_CODE || 'TEST-2026').trim();
  const plan = (process.env.SEED_ACTIVATION_PLAN || 'PRO').toUpperCase();
  const maxUsers = Number(process.env.SEED_ACTIVATION_MAX_USERS || 25);
  const maxProducts = Number(process.env.SEED_ACTIVATION_MAX_PRODUCTS || 5000);

  // 1. Permissions (safe upsert, used by every company's roles).
  await new RoleService().seedPermissions();
  console.log('✔ Permissions seeded');

  // 2. First super-admin.
  const existingAdmins = await prisma.superAdmin.count();
  if (existingAdmins === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    await prisma.superAdmin.create({ data: { email: adminEmail, passwordHash } });
    console.log(`✔ Super-admin created: ${adminEmail}`);
    if (!process.env.SEED_SUPER_ADMIN_PASSWORD) {
      console.log(`  (default password "${adminPassword}" — change it after first login)`);
    }
  } else {
    console.log('• Super-admin already exists — skipping');
  }

  // 3. Sample activation code for the Register page.
  const existingCode = await prisma.activationCode.findUnique({ where: { code } });
  if (!existingCode) {
    await prisma.activationCode.create({
      data: { code, plan, maxUsers, maxProducts, isActive: true, isUsed: false }
    });
    console.log(`✔ Activation code created: ${code} (plan ${plan}, ${maxUsers} users, ${maxProducts} products)`);
  } else {
    console.log(`• Activation code "${code}" already exists — skipping`);
  }

  console.log('\nDone. Register a company at /register using the activation code above.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
