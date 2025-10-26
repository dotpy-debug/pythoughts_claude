/**
 * Drizzle Kit Configuration
 *
 * Configuration for Drizzle ORM database migrations and schema management
 */

import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/db/schema.ts',
  out: './supabase/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
} satisfies Config;
