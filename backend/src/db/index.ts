  import { Database } from 'bun:sqlite';
  import { drizzle } from 'drizzle-orm/bun-sqlite';
  import * as schema from './schema';

  const sqlite = new Database(process.env.DATABASE_PATH || './dash.db', {
    create: true,
    readwrite: true
  });

  // Enable WAL mode for better concurrent access
  sqlite.exec('PRAGMA journal_mode = WAL;');

  // Increase busy timeout to handle concurrent access better
  sqlite.exec('PRAGMA busy_timeout = 5000;');

  // Optimize for performance
  sqlite.exec('PRAGMA synchronous = NORMAL;');
  sqlite.exec('PRAGMA cache_size = 10000;');
  sqlite.exec('PRAGMA temp_store = MEMORY;');

  export const db = drizzle(sqlite, { schema });
  export type DB = typeof db;