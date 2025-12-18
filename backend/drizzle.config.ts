import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `file:${process.env.DATABASE_PATH || './dash.db'}`
  }
} satisfies Config;
