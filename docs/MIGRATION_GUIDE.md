# Database Migration Guide

Complete guide to the automated database migration system.

## Overview

The migration system is fully automated and production-ready with:
- Automatic backups
- Transaction-based execution
- Rollback capability
- Health verification
- Zero manual intervention required

## Migration Types

### Development Migrations

Used during development:
```bash
npm run db:migrate
```

Features:
- No backups (fast iteration)
- Direct execution
- Error logging

### Production Migrations

Used in production deployments:
```bash
npm run db:migrate:production
```

Features:
- Automatic backups
- Transaction-based
- Rollback on failure
- Health verification
- Comprehensive logging

## Migration Lifecycle

### 1. Pre-Migration

- **Connection Test**: Verifies database connectivity
- **Status Check**: Identifies pending migrations
- **Backup Creation**: Creates database backup

### 2. Migration Execution

- **Transaction Start**: Begins database transaction
- **Migration Run**: Executes pending migrations
- **Commit/Rollback**: Commits on success, rolls back on failure

### 3. Post-Migration

- **Verification**: Validates database schema
- **Health Check**: Verifies system health
- **Cleanup**: Cleans up temporary resources

## Creating Migrations

### Using Drizzle Kit

```bash
# Generate migration from schema changes
npm run db:generate

# Review generated migration in supabase/migrations/
```

### Manual SQL Migrations

Create SQL file in `supabase/migrations/`:
```sql
-- migration_name.sql
BEGIN;

-- Your migration SQL here
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

COMMIT;
```

## Migration Best Practices

### 1. Idempotent Migrations

Always make migrations idempotent:
```sql
CREATE TABLE IF NOT EXISTS table_name (...);
CREATE INDEX IF NOT EXISTS index_name ON table_name(column);
```

### 2. Backward Compatible

Maintain backward compatibility:
- Add columns as nullable first
- Remove columns in separate migration
- Use feature flags when possible

### 3. Performance Considerations

- Use `CONCURRENTLY` for index creation
- Batch large data migrations
- Test on staging first

### 4. Rollback Planning

Always consider rollback:
- Document rollback steps
- Test rollback in staging
- Keep migrations small and focused

## Migration Status

Check migration status:
```bash
npm run migrate:status
```

Shows:
- Applied migrations
- Pending migrations
- Last migration timestamp

## Troubleshooting

### Migration Fails

1. **Check Logs**: Review migration logs for errors
2. **Verify Backup**: Check if backup was created
3. **Test Connection**: Verify database connectivity
4. **Review Migration**: Check migration SQL for errors

### Rollback Needed

1. **Automatic Rollback**: System automatically rolls back on failure
2. **Manual Rollback**: Use backup if automatic rollback fails
3. **Verify State**: Confirm database is in correct state

### Connection Issues

1. **Verify DATABASE_URL**: Check environment variable
2. **Network**: Verify network connectivity
3. **Credentials**: Verify database credentials
4. **Retry**: System automatically retries with backoff

## Production Checklist

Before running production migrations:

- [ ] Migrations tested in staging
- [ ] Backup system verified
- [ ] Rollback plan documented
- [ ] Health checks configured
- [ ] Monitoring enabled
- [ ] Maintenance window scheduled (if needed)
- [ ] Team notified

## Migration Safety Features

### Automatic Backups

- Created before each migration
- Stored in `backups/` directory
- Timestamped for identification

### Transaction Support

- All migrations in transactions
- Automatic rollback on failure
- Atomic execution

### Health Verification

- Database connectivity check
- Schema validation
- Service health verification

## Advanced Configuration

### Custom Migration Settings

```typescript
const runner = new ProductionMigrationRunner({
  backupEnabled: true,
  rollbackOnFailure: true,
  maxRetries: 5,
  retryDelay: 3000,
  healthCheckUrl: 'https://example.com/api/health',
});
```

### Migration Hooks

Add custom hooks for:
- Pre-migration validation
- Post-migration verification
- Custom backup logic

## Support

For migration issues:
1. Check migration logs
2. Review backup files
3. Verify environment configuration
4. Contact database administrator

