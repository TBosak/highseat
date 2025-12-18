import { $ } from 'bun';
import { Database } from 'bun:sqlite';

console.log('🔍 Initializing database...\n');

// 1. Push schema from schema.ts to database
console.log('📝 Syncing database schema from schema.ts...');
try {
  await $`bunx drizzle-kit push --config=drizzle.config.ts`.quiet();
  console.log('✅ Schema synced\n');
} catch (error) {
  console.error('❌ Schema push failed:', error);
  process.exit(1);
}

// 2. Check if database needs seeding
const dbPath = process.env.DATABASE_PATH || './dash.db';
const sqlite = new Database(dbPath, { create: true, readwrite: true });

try {
  const result = sqlite.query('SELECT COUNT(*) as count FROM users').get() as { count: number };

  if (result.count === 0) {
    console.log('🌱 Seeding database with default admin user...');
    await import('./seed');
    console.log('✅ Database seeded successfully\n');
  } else {
    console.log(`✅ Database already contains ${result.count} user(s)\n`);
  }
} catch (error) {
  console.error('❌ Database check failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

console.log('🚀 Database initialization complete!\n');
