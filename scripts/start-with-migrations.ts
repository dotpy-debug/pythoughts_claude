/**
 * Start Script with Automatic Migrations
 *
 * Runs database migrations before starting the application
 * with proper error handling and graceful degradation
 */

import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Run a command and return exit code
 */
function runCommand(command: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
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

  // Step 1: Run migrations
  console.log(`${colors.blue}[1/2]${colors.reset} Running database migrations...`);

  const migrationExitCode = await runCommand('tsx', ['scripts/migrate-database.ts']);

  if (migrationExitCode !== 0) {
    console.log(`\n${colors.yellow}⚠ Warning:${colors.reset} Migrations failed or were skipped`);
    console.log(`${colors.yellow}           The app will start anyway (development mode)${colors.reset}\n`);
  } else {
    console.log(`${colors.green}✓${colors.reset} Migrations completed successfully\n`);
  }

  // Step 2: Start Next.js server
  console.log(`${colors.blue}[2/2]${colors.reset} Starting Next.js production server...\n`);

  const serverExitCode = await runCommand('next', ['start']);

  process.exit(serverExitCode);
}

main().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
