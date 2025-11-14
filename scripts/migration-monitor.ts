/**
 * Migration Monitoring and Alerting System
 *
 * Provides:
 * - Real-time migration monitoring
 * - Alert integration for migration failures
 * - Performance metrics collection
 * - Health status tracking
 */

import { ComprehensiveMigrationManager } from './migration-manager.js';

interface AlertConfig {
  webhookUrl?: string;
  emailRecipients?: string[];
  enabled: boolean;
}

class MigrationMonitor {
  private alertConfig: AlertConfig;

  constructor() {
    this.alertConfig = {
      webhookUrl: process.env.MIGRATION_ALERT_WEBHOOK_URL,
      emailRecipients: process.env.MIGRATION_ALERT_EMAIL?.split(','),
      enabled: process.env.MIGRATION_MONITORING_ENABLED !== 'false',
    };
  }

  /**
   * Send alert notification
   */
  async sendAlert(
    severity: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    if (!this.alertConfig.enabled) {
      return;
    }

    const alert = {
      severity,
      message,
      timestamp: new Date().toISOString(),
      details,
    };

    // Send webhook alert
    if (this.alertConfig.webhookUrl) {
      try {
        await fetch(this.alertConfig.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      } catch (error) {
        console.error('[Monitor] Failed to send webhook alert:', error);
      }
    }

    console.log(`[Alert] ${severity.toUpperCase()}: ${message}`);
  }

  /**
   * Monitor migration execution
   */
  async monitorMigration(): Promise<boolean> {
    const manager = new ComprehensiveMigrationManager();
    
    try {
      const startTime = Date.now();
      
      // Send start alert
      await this.sendAlert('info', 'Migration started', {
        stage: process.env.NODE_ENV || 'development',
      });

      const success = await manager.execute();
      const duration = Date.now() - startTime;

      if (success) {
        const status = await manager.getStatusReport();
        await this.sendAlert('info', 'Migration completed successfully', {
          duration,
          applied: status.applied,
          pending: status.pending,
        });
      } else {
        await this.sendAlert('error', 'Migration failed', {
          duration,
        });
      }

      return success;
    } catch (error) {
      await this.sendAlert('critical', 'Migration execution error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Check migration health
   */
  async checkHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const manager = new ComprehensiveMigrationManager();
    
    try {
      await manager.testConnection();
      const healthCheck = await manager.performHealthCheck();
      
      if (!healthCheck.healthy) {
        await this.sendAlert('warning', 'Migration health check failed', {
          issues: healthCheck.issues,
        });
      }

      return healthCheck;
    } catch (error) {
      await this.sendAlert('error', 'Health check error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {
        healthy: false,
        issues: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

export { MigrationMonitor };

// Main execution
async function main() {
  const monitor = new MigrationMonitor();
  const arguments_ = process.argv.slice(2);

  await (arguments_.includes('--health') ? monitor.checkHealth() : monitor.monitorMigration());
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

