import { supabase } from './supabase';
import { logger } from './logger';

export type AuditAction =
  | 'user.signup'
  | 'user.login'
  | 'user.logout'
  | 'user.password_reset'
  | 'user.email_verify'
  | 'user.profile_update'
  | 'user.delete'
  | 'post.create'
  | 'post.update'
  | 'post.delete'
  | 'post.publish'
  | 'comment.create'
  | 'comment.update'
  | 'comment.delete'
  | 'moderation.post_flag'
  | 'moderation.post_approve'
  | 'moderation.post_reject'
  | 'moderation.user_ban'
  | 'moderation.user_unban'
  | 'admin.role_grant'
  | 'admin.role_revoke'
  | 'admin.settings_update'
  | 'security.rate_limit_exceeded'
  | 'security.suspicious_activity'
  | 'security.spam_detected';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  actor_id: string | null;
  target_id: string | null;
  target_type: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  severity: AuditSeverity;
  created_at: string;
};

/**
 * Audit logging system for tracking sensitive operations
 * Provides comprehensive audit trail for security and compliance
 */
export class AuditLogger {
  /**
   * Log an audit event
   * @param params - Audit log parameters
   */
  static async log(params: {
    action: AuditAction;
    actorId?: string;
    targetId?: string;
    targetType?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    severity?: AuditSeverity;
  }): Promise<void> {
    try {
      const {
        action,
        actorId = null,
        targetId = null,
        targetType = null,
        metadata = {},
        ipAddress = null,
        userAgent = null,
        severity = 'info',
      } = params;

      // Insert audit log entry
      const { error } = await supabase.from('audit_logs').insert({
        action,
        actor_id: actorId,
        target_id: targetId,
        target_type: targetType,
        metadata,
        ip_address: ipAddress,
        user_agent: userAgent,
        severity,
      });

      if (error) {
        logger.error('Failed to create audit log', error, { action, actorId });
        return;
      }

      // Also log to application logger for critical events
      if (severity === 'critical') {
        logger.warn('Critical audit event', {
          action,
          actorId,
          targetId,
          severity,
        });
      }

      logger.debug('Audit log created', {
        action,
        actorId,
        targetId,
        severity,
      });
    } catch (error) {
      // Never throw from audit logging - it should not break the application
      logger.error('Audit logging error', error as Error, params);
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuth(params: {
    action: Extract<AuditAction, 'user.login' | 'user.logout' | 'user.signup'>;
    userId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actorId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata,
      severity: 'info',
    });
  }

  /**
   * Log content moderation events
   */
  static async logModeration(params: {
    action: Extract<
      AuditAction,
      | 'moderation.post_flag'
      | 'moderation.post_approve'
      | 'moderation.post_reject'
      | 'moderation.user_ban'
      | 'moderation.user_unban'
    >;
    moderatorId: string;
    targetId: string;
    targetType: 'post' | 'comment' | 'user';
    reason?: string;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actorId: params.moderatorId,
      targetId: params.targetId,
      targetType: params.targetType,
      metadata: { reason: params.reason },
      ipAddress: params.ipAddress,
      severity: 'warning',
    });
  }

  /**
   * Log admin actions
   */
  static async logAdmin(params: {
    action: Extract<AuditAction, 'admin.role_grant' | 'admin.role_revoke' | 'admin.settings_update'>;
    adminId: string;
    targetId?: string;
    metadata: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actorId: params.adminId,
      targetId: params.targetId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      severity: 'critical',
    });
  }

  /**
   * Log security events
   */
  static async logSecurity(params: {
    action: Extract<
      AuditAction,
      'security.rate_limit_exceeded' | 'security.suspicious_activity' | 'security.spam_detected'
    >;
    userId?: string;
    ipAddress?: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actorId: params.userId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      severity: 'warning',
    });
  }

  /**
   * Query audit logs
   */
  static async query(filters: {
    action?: AuditAction;
    actorId?: string;
    targetId?: string;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }

      if (filters.targetId) {
        query = query.eq('target_id', filters.targetId);
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to query audit logs', error);
        return [];
      }

      return (data || []) as AuditLogEntry[];
    } catch (error) {
      logger.error('Audit log query error', error as Error);
      return [];
    }
  }

  /**
   * Get audit trail for a specific user
   */
  static async getUserAuditTrail(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.query({ actorId: userId, limit });
  }

  /**
   * Get recent critical security events
   */
  static async getSecurityEvents(hours: number = 24): Promise<AuditLogEntry[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.query({
      severity: 'critical',
      startDate,
      limit: 100,
    });
  }
}

/**
 * Helper function for easy audit logging
 */
export async function auditLog(
  action: AuditAction,
  params?: Omit<Parameters<typeof AuditLogger.log>[0], 'action'>
): Promise<void> {
  return AuditLogger.log({ action, ...params });
}
