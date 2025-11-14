/**
 * Start Script with Automatic Migrations
 *
 * Runs database migrations before starting the application
 * with proper error handling and graceful degradation
 */

import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const colors = {
  reset: '\u001B[0m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  red: '\u001B[31m',
  blue: '\u001B[34m',
  cyan: '\u001B[36m',
};

/**
 * Run a command and return exit code
 */
function runCommand(command: string, arguments_: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, arguments_, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code || 0);
    });

    child.on('error', (error) => {
      console.error(`${colors.red}Error executing ${command}:${colors.reset}`, error);
      resolve(1);
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║  Starting Pythoughts Platform          ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

  // Step 1: Run schema sync (includes migrations)
  console.log(`${colors.blue}[1/3]${colors.reset} Synchronizing database schema...`);

  // Check if schema file exists and sync if needed
  const { existsSync } = await import('node:fs');
  const schemaPath = resolve(projectRoot, 'src/db/schema.ts');
  
  let migrationExitCode = 0;
  if (existsSync(schemaPath)) {
    migrationExitCode = await runCommand('tsx', ['scripts/drizzle-schema-sync.ts']);
  } else {
    // Fallback to regular migrations if no schema file
    migrationExitCode = await runCommand('tsx', ['scripts/migrate-database.ts']);
  }

  if (migrationExitCode === 0) {
    console.log(`${colors.green}✓${colors.reset} Migrations completed successfully\n`);
  } else {
    console.log(`\n${colors.yellow}⚠ Warning:${colors.reset} Migrations failed or were skipped`);
    console.log(`${colors.yellow}           The app will start anyway (development mode)${colors.reset}\n`);
  }

  // Step 2: Run regular migrations (for non-Drizzle migrations)
  console.log(`${colors.blue}[2/3]${colors.reset} Running database migrations...`);

  const regularMigrationExitCode = await runCommand('tsx', ['scripts/migrate-database.ts']);
  
  if (regularMigrationExitCode === 0) {
    console.log(`${colors.green}✓${colors.reset} Migrations completed successfully\n`);
  }

  // Step 3: Start Next.js server
  console.log(`${colors.blue}[3/3]${colors.reset} Starting Next.js production server...\n`);

  const serverExitCode = await runCommand('next', ['start']);

  process.exit(serverExitCode);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
