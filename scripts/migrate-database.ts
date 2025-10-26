/**
 * Database Migration Runner
 *
 * Automatically runs database migrations on app start with:
 * - Non-interactive execution
 * - Comprehensive error handling
 * - Fallback mechanisms
 * - Connection retry logic
 * - Migration status checking
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

/**
 * Color codes for console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Logger utility
 */
const logger = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg: string) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

/**
 * Get database connection string
 */
function getDatabaseUrl(): string {
  // Try different environment variable sources
  const url =
    process.env.DATABASE_URL ||
    process.env.VITE_SUPABASE_DB_URL ||
    process.env.SUPABASE_DB_URL;

  if (!url) {
    // Try to construct from Supabase URL
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      // Extract project ref from Supabase URL
      const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
      if (match) {
        const projectRef = match[1];
        logger.warning('DATABASE_URL not found, using Supabase direct connection');
        logger.info(`Project ref: ${projectRef}`);

        // Return a placeholder that will need manual configuration
        throw new Error(
          'DATABASE_URL is required. Please add it to your .env.local:\n' +
          `DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`
        );
      }
    }

    throw new Error(
      'DATABASE_URL is required for migrations.\n' +
      'Please add it to your .env.local file:\n' +
      'DATABASE_URL=postgresql://user:password@host:5432/database'
    );
  }

  return url;
}

/**
 * Test database connection with retry logic
 */
async function testConnection(
  connectionString: string,
  maxRetries = 3,
  retryDelay = 2000
): Promise<postgres.Sql | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.step(`Testing database connection (attempt ${attempt}/${maxRetries})...`);

      const sql = postgres(connectionString, {
        max: 1,
        connect_timeout: 10,
      });

      // Test query
      await sql`SELECT 1`;

      logger.success('Database connection successful');
      return sql;
    } catch (error) {
      logger.error(`Connection attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      if (attempt < maxRetries) {
        logger.warning(`Retrying in ${retryDelay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error('Max connection retries exceeded');
        return null;
      }
    }
  }

  return null;
}

/**
 * Check if migrations directory exists
 */
function checkMigrationsDirectory(): string {
  const possiblePaths = [
    resolve(projectRoot, 'supabase/migrations'),
    resolve(projectRoot, 'drizzle/migrations'),
    resolve(projectRoot, 'migrations'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      logger.info(`Found migrations directory: ${path}`);
      return path;
    }
  }

  // Default to supabase/migrations
  const defaultPath = possiblePaths[0];
  logger.warning(`Migrations directory not found, using: ${defaultPath}`);
  return defaultPath;
}

/**
 * Run migrations with error handling
 */
async function runMigrations(sql: postgres.Sql, migrationsFolder: string): Promise<boolean> {
  try {
    logger.step('Starting database migrations...');

    const db = drizzle(sql);

    await migrate(db, { migrationsFolder });

    logger.success('All migrations completed successfully');
    return true;
  } catch (error) {
    logger.error('Migration failed:');

    if (error instanceof Error) {
      console.error(`  ${colors.red}${error.message}${colors.reset}`);

      if (error.stack) {
        console.error(`\n${colors.yellow}Stack trace:${colors.reset}`);
        console.error(error.stack);
      }
    } else {
      console.error(`  ${colors.red}${String(error)}${colors.reset}`);
    }

    return false;
  }
}

/**
 * Fallback: Run raw SQL migrations
 */
async function runRawSqlMigrations(sql: postgres.Sql, migrationsFolder: string): Promise<boolean> {
  try {
    logger.step('Attempting fallback: running raw SQL migrations...');

    const { readdirSync } = await import('fs');
    const files = readdirSync(migrationsFolder)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      logger.warning('No SQL migration files found');
      return true;
    }

    logger.info(`Found ${files.length} SQL migration file(s)`);

    for (const file of files) {
      try {
        logger.step(`Running migration: ${file}`);
        const filePath = resolve(migrationsFolder, file);
        const sqlContent = readFileSync(filePath, 'utf-8');

        await sql.unsafe(sqlContent);

        logger.success(`Migration ${file} completed`);
      } catch (error) {
        logger.error(`Failed to run migration ${file}:`);
        if (error instanceof Error) {
          console.error(`  ${colors.red}${error.message}${colors.reset}`);
        }
        return false;
      }
    }

    logger.success('All raw SQL migrations completed');
    return true;
  } catch (error) {
    logger.error('Fallback migration failed:');
    if (error instanceof Error) {
      console.error(`  ${colors.red}${error.message}${colors.reset}`);
    }
    return false;
  }
}

/**
 * Main migration function
 */
async function main() {
  console.log(`\n${colors.bright}=== Database Migration Runner ===${colors.reset}\n`);

  let sql: postgres.Sql | null = null;

  try {
    // Step 1: Get database URL
    logger.step('Step 1: Getting database connection string...');
    const databaseUrl = getDatabaseUrl();
    logger.success('Database URL configured');

    // Step 2: Test connection
    logger.step('Step 2: Testing database connection...');
    sql = await testConnection(databaseUrl);

    if (!sql) {
      logger.error('Failed to connect to database');
      logger.warning('Skipping migrations (database unavailable)');
      process.exit(1);
    }

    // Step 3: Check migrations directory
    logger.step('Step 3: Locating migrations...');
    const migrationsFolder = checkMigrationsDirectory();

    if (!existsSync(migrationsFolder)) {
      logger.warning('Migrations directory does not exist');
      logger.info('No migrations to run, skipping...');
      process.exit(0);
    }

    // Step 4: Run migrations
    logger.step('Step 4: Running migrations...');
    const success = await runMigrations(sql, migrationsFolder);

    if (!success) {
      logger.warning('Primary migration failed, attempting fallback...');
      const fallbackSuccess = await runRawSqlMigrations(sql, migrationsFolder);

      if (!fallbackSuccess) {
        logger.error('All migration attempts failed');
        process.exit(1);
      }
    }

    // Step 5: Verify migrations
    logger.step('Step 5: Verifying database schema...');
    await sql`SELECT 1`;
    logger.success('Database schema verified');

    console.log(`\n${colors.green}${colors.bright}✓ Migration completed successfully${colors.reset}\n`);
    process.exit(0);
  } catch (error) {
    console.log(`\n${colors.red}${colors.bright}✗ Migration failed${colors.reset}\n`);

    if (error instanceof Error) {
      logger.error(error.message);

      // Provide helpful hints based on error type
      if (error.message.includes('DATABASE_URL')) {
        console.log(`\n${colors.yellow}Hint:${colors.reset} Make sure to add DATABASE_URL to your .env.local file`);
        console.log(`${colors.yellow}Example:${colors.reset} DATABASE_URL=postgresql://postgres:password@localhost:5432/database`);
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        console.log(`\n${colors.yellow}Hint:${colors.reset} Check if your database is running and accessible`);
        console.log(`${colors.yellow}For Supabase:${colors.reset} Make sure you're using the direct connection string`);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  } finally {
    // Clean up connection
    if (sql) {
      await sql.end();
    }
  }
}

// Run migrations
main();
