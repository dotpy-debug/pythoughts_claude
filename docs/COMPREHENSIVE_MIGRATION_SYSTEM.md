# Comprehensive Database Migration and Schema Management System

## Overview

This document describes the complete database migration and schema management system using Drizzle ORM. The system provides enterprise-grade features for automated, safe, and monitored database migrations.

## System Architecture

### Components

1. **Migration Manager** (`scripts/migration-manager.ts`)
   - Core migration execution engine
   - Version control and history tracking
   - Schema compatibility validation
   - Rollback mechanisms
   - Audit logging

2. **Migration Tester** (`scripts/migration-tester.ts`)
   - Automated test suite
   - Dry-run execution
   - Data integrity validation
   - Rollback testing

3. **Bug Tracker Integration** (`scripts/bug-tracker-integration.ts`)
   - Integration with bug tracking
   - Impact analysis
   - Change tracking

4. **Migration Monitor** (`scripts/migration-monitor.ts`)
   - Real-time monitoring
   - Alert integration
   - Performance metrics

## Features

### 1. Automated Migration Management

✅ **Detection and Generation**
- Automatic detection of schema changes in `src/db/schema.ts`
- Automatic migration generation via `npm run db:generate`
- Integration with Drizzle schema sync

✅ **Version Control**
- Migration versioning and history tracking
- Metadata table (`__migrations_metadata`) for tracking
- Hash verification for migration integrity

✅ **Schema Compatibility Validation**
- Pre-migration compatibility checks
- Validation of SQL syntax
- Detection of dangerous operations
- Database version checking

✅ **Rollback Mechanisms**
- Automatic rollback on failure
- Manual rollback support
- Rollback script management

### 2. Quality Assurance Process

✅ **Bug Tracking Integration**
- Comparison with reported issues
- Impact analysis for changes
- Related bug tracking

✅ **Test Coverage**
- Schema validation tests
- Dry-run execution
- Data integrity tests
- Rollback procedure tests

### 3. Implementation Requirements

✅ **Idempotent Migrations**
- All migrations use `IF NOT EXISTS` / `IF EXISTS`
- Safe to run multiple times
- Template provided in `templates/migration-template.sql`

✅ **Transaction Safety**
- All migrations run in transactions
- Automatic rollback on error
- Atomic execution

✅ **Logging and Monitoring**
- Comprehensive audit logging
- Real-time monitoring
- Performance metrics collection

✅ **Health Checks**
- Pre-migration health checks
- Post-migration verification
- Database consistency validation

### 4. Production Safeguards

✅ **Staged Deployment**
- Development → Staging → Production pipeline
- Environment-specific configurations
- Approval requirements for production

✅ **Backup Procedures**
- Automatic backups before migrations
- Backup verification
- Backup retention management

✅ **Emergency Rollback**
- Automatic rollback on failure
- Manual rollback commands
- Backup restoration procedures

✅ **Monitoring Alerts**
- Real-time migration monitoring
- Alert integration (webhooks, email)
- Failure notification system

### 5. Documentation and Maintenance

✅ **Documentation**
- Migration guide (`docs/MIGRATION_GUIDE.md`)
- Runbook (`docs/MIGRATION_RUNBOOK.md`)
- Security guide (`docs/MIGRATION_SECURITY.md`)
- This comprehensive guide

✅ **Change History**
- Migration metadata tracking
- Audit log (`logs/migration-audit.log`)
- Version history

### 6. Testing Protocol

✅ **Validation Tests**
- Schema compatibility validation
- SQL syntax checking
- Database version verification

✅ **Dry-Run Testing**
- Execute without applying changes
- Preview migration impact
- Verify migration logic

✅ **Data Integrity Tests**
- Foreign key validation
- Orphaned record detection
- Data consistency checks

✅ **Rollback Testing**
- Test rollback procedures
- Verify backup restoration
- Validate rollback scripts

### 7. Security Measures

✅ **Access Control**
- Role-based access for migrations
- Production approval requirements
- Environment variable protection

✅ **Secure Data Handling**
- No sensitive data in logs
- Encrypted backups
- Secure audit logging

✅ **Audit Logging**
- All operations logged
- User tracking
- Timestamp and duration recording
- Error logging

## Usage

### Standard Workflow

```bash
# 1. Generate migration from schema changes
npm run db:generate

# 2. Review generated migration
cat supabase/migrations/[latest].sql

# 3. Test migration
npm run migration:test

# 4. Dry run
npm run migration:dry-run

# 5. Validate
npm run migration:validate

# 6. Apply migration
npm run migration:run
```

### Production Workflow

```bash
# 1. Test in development
npm run migration:test

# 2. Validate schema compatibility
npm run migration:validate

# 3. Deploy to staging
STAGE=staging npm run migration:run

# 4. Verify staging
npm run migration:status

# 5. Deploy to production (requires approval)
STAGE=production npm run migration:run
```

## Commands

### Migration Management
```bash
npm run migration:run           # Run migrations
npm run migration:dry-run       # Dry run (no changes)
npm run migration:validate      # Validate only
npm run migration:status        # Get status report
npm run migration:rollback      # Rollback last migration
```

### Testing
```bash
npm run migration:test          # Run all migration tests
```

### Schema Management
```bash
npm run db:sync                 # Sync Drizzle schema (dev)
npm run db:sync:production      # Sync Drizzle schema (prod)
npm run db:generate             # Generate migrations
```

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Migration Settings
MIGRATION_BACKUP_ENABLED=true
MIGRATION_ROLLBACK_ENABLED=true
MIGRATION_DRY_RUN=false
MIGRATION_VALIDATE_ONLY=false
MIGRATION_REQUIRE_APPROVAL=true  # Production only
MIGRATION_AUDIT_ENABLED=true

# Monitoring
MIGRATION_MONITORING_ENABLED=true
MIGRATION_ALERT_WEBHOOK_URL=https://webhook-url
MIGRATION_ALERT_EMAIL=admin@example.com

# Testing
TEST_DATABASE_URL=postgresql://user:password@host:5432/test_db
```

## Migration Template

All migrations should follow the template in `templates/migration-template.sql`:

```sql
BEGIN;

-- Idempotent operations
CREATE TABLE IF NOT EXISTS ...
DROP INDEX IF EXISTS ...
CREATE INDEX IF NOT EXISTS ...

-- Data migrations (if needed)
-- UPDATE ... WHERE ...

COMMIT;
```

## Monitoring and Alerts

### Health Checks

The system performs health checks:
- Before migration execution
- After migration completion
- On schedule (if monitoring enabled)

### Alert Types

- **Info**: Migration started/completed
- **Warning**: Health check issues
- **Error**: Migration failures
- **Critical**: System errors

### Alert Channels

- Webhook (configurable)
- Email (configurable)
- Console logs
- Audit log file

## Troubleshooting

### Migration Fails

1. Check logs: `cat logs/migration-audit.log`
2. Review error in migration metadata
3. Check backup availability
4. Execute rollback if needed

### Data Integrity Issues

1. Run integrity test: `npm run migration:test --integrity`
2. Review violations
3. Create data fix migration
4. Test and apply

### Health Check Fails

1. Check database connectivity
2. Verify critical tables exist
3. Check migration metadata consistency
4. Review recent migrations

## Best Practices

### Before Migration

1. ✅ Review migration file
2. ✅ Test in development
3. ✅ Run dry-run
4. ✅ Validate schema compatibility
5. ✅ Check for related bugs
6. ✅ Create backup (automatic)

### During Migration

1. ✅ Monitor execution
2. ✅ Watch for alerts
3. ✅ Verify transaction safety
4. ✅ Track performance

### After Migration

1. ✅ Verify health check
2. ✅ Validate data integrity
3. ✅ Review audit logs
4. ✅ Update documentation
5. ✅ Close related bugs

## Security Checklist

Before running migrations in production:

- [ ] Migration reviewed by team
- [ ] No credentials in migration files
- [ ] Backup created and verified
- [ ] Rollback plan documented
- [ ] Audit logging enabled
- [ ] Access control verified
- [ ] Monitoring enabled
- [ ] Alert channels configured

## Support

For issues:
1. Check migration logs
2. Review runbook
3. Check audit logs
4. Escalate to database team

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2024-01-01

