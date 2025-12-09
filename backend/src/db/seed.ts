import { db } from './index';
import { themes, users } from './schema';
import { AuthService } from '../services/auth.service';

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await AuthService.hashPassword('admin123');
  await db.insert(users).values({
    email: 'admin@homelab.local',
    passwordHash,
    displayName: 'Admin User',
    roles: JSON.stringify(['admin'])
  }).onConflictDoNothing();

  console.log('✅ Database seeded successfully!');
  console.log('Default admin credentials:');
  console.log('  Email: admin@homelab.local');
  console.log('  Password: admin123');

  process.exit(0);
}

seed().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1);
});
