/**
 * Production Monitoring Setup
 *
 * Automated monitoring and alerting configuration:
 * - Error tracking
 * - Performance monitoring
 * - Health check endpoints
 * - Alert integration
 */

import { HealthChecker, type SystemHealth } from './health-check.js';

interface MonitoringConfig {
  errorTrackingEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  alertWebhookUrl?: string;
  checkInterval: number;
}

class ProductionMonitoring {
  private config: MonitoringConfig;
  private healthChecker: HealthChecker;
  private intervalId?: NodeJS.Timeout;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      errorTrackingEnabled: process.env.ERROR_TRACKING_ENABLED !== 'false',
      performanceMonitoringEnabled: process.env.PERFORMANCE_MONITORING_ENABLED !== 'false',
      alertWebhookUrl: process.env.ALERT_WEBHOOK_URL,
      checkInterval: Number.parseInt(process.env.MONITORING_CHECK_INTERVAL || '60000', 10),
      ...config,
    };

    this.healthChecker = new HealthChecker();
  }

  /**
   * Send alert notification
   */
  private async sendAlert(health: SystemHealth): Promise<void> {
    if (!this.config.alertWebhookUrl) {
      return;
    }

    try {
      await fetch(this.config.alertWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: health.overall,
          checks: health.checks,
          timestamp: health.timestamp,
        }),
      });
    } catch (error) {
      console.error('[Monitoring] Failed to send alert:', error);
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    console.log('[Monitoring] Starting production monitoring...');

    this.intervalId = setInterval(async () => {
      try {
        const health = await this.healthChecker.runAllChecks();

        if (health.overall === 'unhealthy') {
          console.error('[Monitoring] ⚠ System health degraded!');
          console.log(this.healthChecker.formatOutput(health));
          await this.sendAlert(health);
        } else if (health.overall === 'degraded') {
          console.warn('[Monitoring] ⚠ System performance degraded');
        }
      } catch (error) {
        console.error('[Monitoring] Error during health check:', error);
      }
    }, this.config.checkInterval);

    console.log(`[Monitoring] Monitoring active (check interval: ${this.config.checkInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('[Monitoring] Monitoring stopped');
    }
  }

  /**
   * Setup error tracking
   */
  setupErrorTracking(): void {
    if (!this.config.errorTrackingEnabled) {
      return;
    }

    // Global error handler
    process.on('uncaughtException', (error) => {
      console.error('[Error Tracking] Uncaught Exception:', error);
      // In production, send to error tracking service (Sentry, etc.)
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Error Tracking] Unhandled Rejection:', reason);
      // In production, send to error tracking service
    });

    console.log('[Monitoring] Error tracking enabled');
  }
}

export { ProductionMonitoring };

