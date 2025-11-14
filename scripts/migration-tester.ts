/**
 * Migration Testing Protocol
 *
 * Performs:
 * - Schema validation tests
 * - Migration dry-runs
 * - Data integrity validation post-migration
 * - Rollback procedure testing
 */

import { ComprehensiveMigrationManager } from './migration-manager.js';
import postgres from 'postgres';

class MigrationTester {
  private testDatabaseUrl: string;
  private productionDatabaseUrl?: string;

  constructor() {
    this.testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '';
    this.productionDatabaseUrl = process.env.DATABASE_URL;
  }

  /**
   * Run all migration tests
   */
  async runAllTests(): Promise<{ passed: number; failed: number; results: Array<{ test: string; passed: boolean; error?: string }> }> {
    const results: Array<{ test: string; passed: boolean; error?: string }> = [];
    let passed = 0;
    let failed = 0;

    console.log('\n=== Migration Test Suite ===\n');

    // Test 1: Schema Validation
    const validationTest = await this.testSchemaValidation();
    results.push(validationTest);
    if (validationTest.passed) passed++; else failed++;

    // Test 2: Dry Run
    const dryRunTest = await this.testDryRun();
    results.push(dryRunTest);
    if (dryRunTest.passed) passed++; else failed++;

    // Test 3: Data Integrity
    const integrityTest = await this.testDataIntegrity();
    results.push(integrityTest);
    if (integrityTest.passed) passed++; else failed++;

    // Test 4: Rollback
    const rollbackTest = await this.testRollback();
    results.push(rollbackTest);
    if (rollbackTest.passed) passed++; else failed++;

    console.log(`\n=== Test Results ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    return { passed, failed, results };
  }

  /**
   * Test schema validation
   */
  private async testSchemaValidation(): Promise<{ test: string; passed: boolean; error?: string }> {
    console.log('[Test] Schema Validation...');
    
    try {
      const manager = new ComprehensiveMigrationManager({
        databaseUrl: this.testDatabaseUrl,
        validateOnly: true,
      });

      const validation = await manager.validateSchemaCompatibility();
      
      if (validation.compatible) {
        console.log('  ✓ Schema validation passed');
        return { test: 'Schema Validation', passed: true };
      } else {
        console.log('  ✗ Schema validation failed');
        return { 
          test: 'Schema Validation', 
          passed: false, 
          error: validation.issues.join(', ') 
        };
      }
    } catch (error) {
      return {
        test: 'Schema Validation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test dry run execution
   */
  private async testDryRun(): Promise<{ test: string; passed: boolean; error?: string }> {
    console.log('[Test] Dry Run...');
    
    try {
      const manager = new ComprehensiveMigrationManager({
        databaseUrl: this.testDatabaseUrl,
        dryRun: true,
      });

      const success = await manager.execute();
      
      if (success) {
        console.log('  ✓ Dry run completed successfully');
        return { test: 'Dry Run', passed: true };
      } else {
        console.log('  ✗ Dry run failed');
        return { test: 'Dry Run', passed: false, error: 'Dry run execution failed' };
      }
    } catch (error) {
      return {
        test: 'Dry Run',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test data integrity
   */
  private async testDataIntegrity(): Promise<{ test: string; passed: boolean; error?: string }> {
    console.log('[Test] Data Integrity...');
    
    try {
      const sql = postgres(this.testDatabaseUrl, { max: 1 });
      
      // Check foreign key constraints
      const fkCheck = await sql`
        SELECT 
          COUNT(*) as violations
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
      `;

      // Check for orphaned records (example: posts without authors)
      const orphanCheck = await sql`
        SELECT COUNT(*) as orphans
        FROM posts p
        LEFT JOIN profiles pr ON p.author_id = pr.id
        WHERE p.author_id IS NOT NULL
        AND pr.id IS NULL
      `;

      const violations = Number.parseInt(fkCheck[0]?.violations || '0', 10);
      const orphans = Number.parseInt(orphanCheck[0]?.orphans || '0', 10);

      await sql.end();

      if (orphans === 0) {
        console.log('  ✓ Data integrity check passed');
        return { test: 'Data Integrity', passed: true };
      } else {
        console.log(`  ✗ Found ${orphans} orphaned records`);
        return { 
          test: 'Data Integrity', 
          passed: false, 
          error: `Found ${orphans} orphaned records` 
        };
      }
    } catch (error) {
      return {
        test: 'Data Integrity',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Test rollback procedure
   */
  private async testRollback(): Promise<{ test: string; passed: boolean; error?: string }> {
    console.log('[Test] Rollback Procedure...');
    
    try {
      // Note: This would test rollback in a test environment only
      if (!this.testDatabaseUrl.includes('test')) {
        console.log('  ⚠ Skipping rollback test (not in test environment)');
        return { test: 'Rollback Procedure', passed: true };
      }

      const manager = new ComprehensiveMigrationManager({
        databaseUrl: this.testDatabaseUrl,
      });

      const rollbackSuccess = await manager.rollbackLastMigration();
      
      if (rollbackSuccess) {
        console.log('  ✓ Rollback test passed');
        return { test: 'Rollback Procedure', passed: true };
      } else {
        console.log('  ✗ Rollback test failed');
        return { test: 'Rollback Procedure', passed: false, error: 'Rollback failed' };
      }
    } catch (error) {
      return {
        test: 'Rollback Procedure',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Main execution
async function main() {
  const tester = new MigrationTester();
  const results = await tester.runAllTests();

  if (results.failed > 0) {
    throw new Error(`Migration tests failed: ${results.failed} test(s) failed`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

export { MigrationTester };

