/**
 * Automated Drizzle Push System
 *
 * Intelligent schema synchronization that:
 * - Detects schema changes automatically
 * - Chooses between push (dev) and migrations (prod)
 * - Integrates with CI/CD pipeline
 * - Provides full safety and rollback capabilities
 *
 * This script automatically handles the decision between:
 * - `drizzle-kit push` (development - fast iteration)
 * - Migration generation + production migrations (production - safety)
 */

import { DrizzleSchemaSync } from './drizzle-schema-sync.js';

interface AutoPushOptions {
  environment: 'development' | 'staging' | 'production';
  forcePush: boolean;
  skipGeneration: boolean;
}

class AutoPushSystem {
  private options: AutoPushOptions;

  constructor(options: Partial<AutoPushOptions> = {}) {
    const environment = process.env.NODE_ENV || 'development';
    const detectedEnvironment = environment === 'production' 
      ? 'production' 
      : (environment === 'staging' ? 'staging' : 'development');
    this.options = {
      environment:
        (options.environment as 'development' | 'staging' | 'production') ||
        detectedEnvironment,
      forcePush: options.forcePush === true,
      skipGeneration: options.skipGeneration === true,
    };
  }

  /**
   * Determine the appropriate sync strategy based on environment
   */
  async execute(): Promise<boolean> {
    console.log(`\n=== Automated Drizzle Push System ===\n`);
    console.log(`Environment: ${this.options.environment}\n`);

    const sync = new DrizzleSchemaSync({
      production: this.options.environment !== 'development',
      skipMigration: this.options.skipGeneration,
      force: this.options.forcePush,
    });

    if (this.options.environment === 'development') {
      // Development: Use direct push for speed
      console.log('Using direct push (development mode)...');
      return await sync.push();
    } else {
      // Staging/Production: Use migration-based approach
      console.log('Using migration-based sync (production mode)...');
      return await sync.sync();
    }
  }
}

// Main execution
async function main() {
  const arguments_ = process.argv.slice(2);
  const environmentArgument = arguments_.find(argument => argument.startsWith('--env='));
  const environmentValue = environmentArgument?.split('=')[1] as 'development' | 'staging' | 'production' | undefined;
  const detectedEnvironment = process.env.NODE_ENV === 'production' 
    ? 'production' 
    : (process.env.NODE_ENV === 'staging' ? 'staging' : 'development');
  const options: Partial<AutoPushOptions> = {
    environment: environmentValue || detectedEnvironment,
    forcePush: arguments_.includes('--force'),
    skipGeneration: arguments_.includes('--skip-generation'),
  };

  const system = new AutoPushSystem(options);
  const success = await system.execute();

  if (!success) {
    throw new Error('Auto push failed');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export { AutoPushSystem };

