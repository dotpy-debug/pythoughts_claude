# Migration Runbook

## Quick Reference

### Emergency Rollback
```bash
# Rollback last migration
npm run migration:rollback

# Restore from backup
npm run migration:restore --backup=backup_2024-01-01.sql
```

### Standard Migration
```bash
# Run migrations
npm run migration:run

# Dry run (no changes)
npm run migration:dry-run

# Validate only
npm run migration:validate
```

## Common Scenarios

### Scenario 1: New Migration Deployment

**Steps:**
1. Test locally: `npm run migration:test`
2. Review migration file
3. Dry run: `npm run migration:dry-run`
4. Deploy to staging: `STAGE=staging npm run migration:run`
5. Verify: `npm run migration:status`
6. Deploy to production: `STAGE=production npm run migration:run`

**Checklist:**
- [ ] Migration tested locally
- [ ] Backup created (automatic)
- [ ] Dry run successful
- [ ] Health check passed
- [ ] Data integrity verified

### Scenario 2: Migration Failure

**Symptoms:**
- Migration fails during execution
- Database in inconsistent state
- Application errors

**Steps:**
1. Check migration logs: `cat logs/migration-audit.log`
2. Review failed migration: `npm run migration:status`
3. If rollback available: `npm run migration:rollback`
4. If rollback not available: Restore from backup
5. Investigate root cause
6. Fix migration and redeploy

### Scenario 3: Data Integrity Issues

**Symptoms:**
- Foreign key violations
- Orphaned records
- Missing required data

**Steps:**
1. Run integrity check: `npm run migration:test --integrity`
2. Review violations
3. Create data fix migration
4. Test fix migration
5. Apply fix migration

## Troubleshooting

### Issue: Migration Timeout

**Solution:**
- Increase timeout: `MIGRATION_TIMEOUT=60000 npm run migration:run`
- Break large migration into smaller ones
- Run during maintenance window

### Issue: Lock Conflicts

**Solution:**
- Check active connections: `SELECT * FROM pg_stat_activity`
- Wait for locks to release
- Retry migration

### Issue: Backup Failure

**Solution:**
- Check disk space: `df -h`
- Verify pg_dump availability
- Use manual backup if needed

## Contact

For migration issues:
1. Check logs first
2. Review runbook
3. Escalate to database team

