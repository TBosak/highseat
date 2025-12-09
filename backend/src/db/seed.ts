import { db } from './index';
import { roles, users } from './schema';
import { AuthService } from '../services/auth.service';
import { eq } from 'drizzle-orm';

// Default admin credentials from environment
const DEFAULT_ADMIN_USERNAME = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
const DEFAULT_ADMIN_DISPLAY_NAME = process.env.DEFAULT_ADMIN_DISPLAY_NAME || 'Administrator';

const defaultRoles = [
  {
    name: 'admin',
    description: 'Administrator with full access to all features',
    permissions: JSON.stringify([
      'board:view',
      'board:edit',
      'board:design',
      'card:add',
      'card:edit',
      'card:delete',
      'theme:edit',
      'role:manage',
      'user:manage'
    ]),
    isSystem: true
  },
  {
    name: 'editor',
    description: 'Can edit boards and cards',
    permissions: JSON.stringify([
      'board:view',
      'board:edit',
      'card:add',
      'card:edit',
      'card:delete'
    ]),
    isSystem: true
  },
  {
    name: 'viewer',
    description: 'Read-only access to boards',
    permissions: JSON.stringify([
      'board:view'
    ]),
    isSystem: true
  }
];

async function seed() {
  console.log('🌱 Seeding database...\n');

  // 1. Seed default roles
  console.log('📋 Seeding default roles...');
  for (const roleData of defaultRoles) {
    const existing = await db.select().from(roles).where(eq(roles.name, roleData.name)).limit(1);

    if (existing.length === 0) {
      await db.insert(roles).values(roleData);
      console.log(`  ✅ Created role: ${roleData.name}`);
    } else {
      // Update existing system role with latest permissions
      await db.update(roles)
        .set({
          permissions: roleData.permissions,
          description: roleData.description,
          updatedAt: new Date()
        })
        .where(eq(roles.name, roleData.name));
      console.log(`  ✅ Updated role: ${roleData.name}`);
    }
  }

  // 2. Create default admin user
  console.log('\n👤 Creating default admin user...');
  const existingAdmin = await db.select()
    .from(users)
    .where(eq(users.username, DEFAULT_ADMIN_USERNAME))
    .limit(1);

  if (existingAdmin.length === 0) {
    const passwordHash = await AuthService.hashPassword(DEFAULT_ADMIN_PASSWORD);
    await db.insert(users).values({
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash,
      displayName: DEFAULT_ADMIN_DISPLAY_NAME,
      roles: JSON.stringify(['admin'])
    });
    console.log('  ✅ Admin user created successfully!');
  } else {
    console.log('  ℹ️  Admin user already exists, skipping...');
  }

  console.log('\n✅ Database seeded successfully!\n');
  console.log('═══════════════════════════════════════');
  console.log('📝 Default Admin Credentials:');
  console.log('═══════════════════════════════════════');
  console.log(`   Username: ${DEFAULT_ADMIN_USERNAME}`);
  console.log(`   Password: ${DEFAULT_ADMIN_PASSWORD}`);
  console.log('═══════════════════════════════════════');
  console.log('\n💡 Tip: If you forget the password, just re-run the seed or re-deploy!\n');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Error seeding database:', error);
  process.exit(1);
});
