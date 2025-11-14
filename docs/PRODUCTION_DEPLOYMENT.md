# Production Deployment Guide

This guide outlines the fully automated, production-ready deployment system that eliminates manual interventions, emergency fixes, and workarounds.

## Overview

The deployment system provides:

- ✅ **Zero-downtime deployments** with health checks
- ✅ **Automatic database migrations** with backup and rollback
- ✅ **Comprehensive quality gates** before deployment
- ✅ **Continuous monitoring** and alerting
- ✅ **Automatic rollback** on failure
- ✅ **Production-grade security** scanning

## Architecture

### Components

1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Automated quality gates
   - Testing across environments
   - Security scanning
   - Build verification

2. **Automated Migration System** (`scripts/migrate-database-production.ts`)
   - Transaction-based migrations
   - Automatic backups
   - Rollback capability
   - Health verification

3. **Health Check System** (`scripts/health-check.ts`)
   - Database connectivity
   - Redis connectivity
   - System resources
   - Environment validation

4. **Deployment Automation** (`scripts/automated-deployment.ts`)
   - Pre-deployment validation
   - Automated migrations
   - Post-deployment verification
   - Rollback on failure

5. **Monitoring Setup** (`scripts/monitoring-setup.ts`)
   - Error tracking
   - Performance monitoring
   - Alert integration

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Redis (Production)
REDIS_URL=redis://host:6379

# Session Security (Production)
SESSION_SECRET=your-secret-key

# Migration Configuration (Optional)
MIGRATION_BACKUP_ENABLED=true
MIGRATION_ROLLBACK_ENABLED=true
MIGRATION_MAX_RETRIES=3
MIGRATION_RETRY_DELAY=2000

# Health Check
HEALTH_CHECK_URL=https://your-app.com/api/health

# Monitoring
ERROR_TRACKING_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
ALERT_WEBHOOK_URL=https://your-webhook-url
MONITORING_CHECK_INTERVAL=60000
```

### Environment-Specific Configuration

#### Development
```bash
MIGRATION_BACKUP_ENABLED=false
SKIP_TESTS=true
```

#### Staging
```bash
MIGRATION_BACKUP_ENABLED=true
HEALTH_CHECK_URL=https://staging.example.com/api/health
DEPLOY_ENV=staging
```

#### Production
```bash
MIGRATION_BACKUP_ENABLED=true
MIGRATION_ROLLBACK_ENABLED=true
HEALTH_CHECK_URL=https://example.com/api/health
DEPLOY_ENV=production
ERROR_TRACKING_ENABLED=true
PERFORMANCE_MONITORING_ENABLED=true
```

## Deployment Process

### Automated Deployment

The system automatically handles:

1. **Pre-deployment Checks**
   - Environment variable validation
   - Build artifact verification
   - Health check verification

2. **Database Migrations**
   - Automatic backup creation
   - Transaction-based execution
   - Rollback on failure
   - Verification after completion

3. **Application Deployment**
   - Zero-downtime deployment
   - Health check endpoints
   - Load balancer integration

4. **Post-deployment Verification**
   - Health check validation
   - Service availability check
   - Automatic rollback on failure

### Manual Deployment Commands

```bash
# Check system health
npm run health:check

# Run production migrations
npm run db:migrate:production

# Execute automated deployment
npm run deploy
```

### CI/CD Pipeline

The GitHub Actions workflow automatically:

1. **Quality Gates**
   - Linting
   - Type checking
   - Format verification
   - Security audit

2. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

3. **Security Scanning**
   - Dependency vulnerabilities
   - Code security issues

4. **Build Verification**
   - Production build test
   - Artifact validation

5. **Migration Validation**
   - Migration status check
   - Migration test run

6. **Deployment**
   - Staging deployment (on `develop` branch)
   - Production deployment (on `main` branch)

## Health Check Endpoints

### Full Health Check
```
GET /api/health
```

Returns comprehensive system health including:
- Database connectivity
- Redis connectivity
- System resources
- Environment configuration

**Response:**
```json
{
  "overall": "healthy",
  "checks": [
    {
      "service": "database",
      "status": "healthy",
      "latency": 45
    },
    {
      "service": "redis",
      "status": "healthy",
      "latency": 12
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

### Liveness Probe
```
GET /api/health/live
```

Simple endpoint for container orchestration liveness checks.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Readiness Probe
```
GET /api/health/ready
```

Checks if the application is ready to serve traffic.

**Response:**
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Database Migrations

### Automatic Migrations

Migrations run automatically:
- On application start (development)
- Before deployment (production)
- With automatic backup and rollback

### Migration Process

1. **Connection Test**
   - Verify database connectivity
   - Retry with exponential backoff

2. **Status Check**
   - Check current migration status
   - Identify pending migrations

3. **Backup Creation**
   - Automatic backup before migration
   - Stored in `backups/` directory

4. **Migration Execution**
   - Transaction-based execution
   - Automatic rollback on failure

5. **Verification**
   - Schema validation
   - Health check

### Migration Commands

```bash
# Development migrations
npm run db:migrate

# Production migrations (with backup and rollback)
npm run db:migrate:production

# Check migration status
npm run migrate:status
```

### Migration Safety

- **Transactions**: All migrations run in transactions
- **Backups**: Automatic backups before migrations
- **Rollback**: Automatic rollback on failure
- **Verification**: Post-migration health checks

## Monitoring and Alerting

### Error Tracking

Automatic error tracking for:
- Uncaught exceptions
- Unhandled promise rejections
- Runtime errors

### Performance Monitoring

Automatic monitoring of:
- Response times
- Memory usage
- Database query performance
- Redis operation latency

### Alerting

Configure alert webhook in environment:
```bash
ALERT_WEBHOOK_URL=https://your-webhook-url
```

Alerts sent for:
- System health degradation
- Migration failures
- Service unavailability

## Rollback Procedures

### Automatic Rollback

The system automatically rolls back:
- Failed migrations (transaction rollback)
- Failed deployments (health check failure)

### Manual Rollback

1. **Stop current deployment**
2. **Restore from backup**
3. **Verify health**

```bash
# Health check
npm run health:check

# If needed, restore from backup
# (backup location logged during migration)
```

## Security Considerations

### Security Scanning

- **Automated**: CI/CD pipeline includes security scanning
- **Dependencies**: `npm audit` for vulnerability scanning
- **Code**: Trivy for code security scanning

### Secrets Management

- **Environment Variables**: Use secure environment variable storage
- **Never Commit**: Secrets never committed to repository
- **Rotation**: Regular secret rotation

### Database Security

- **Connection Strings**: Use secure connection strings
- **Backups**: Encrypted backups
- **Access Control**: Minimal required permissions

## Best Practices

### Deployment

1. **Always test in staging first**
2. **Verify health checks before production**
3. **Monitor during and after deployment**
4. **Have rollback plan ready**

### Migrations

1. **Review migrations before deployment**
2. **Test migrations in staging**
3. **Ensure backups are enabled**
4. **Monitor migration progress**

### Monitoring

1. **Set up alerting early**
2. **Monitor key metrics**
3. **Review logs regularly**
4. **Respond to alerts promptly**

## Troubleshooting

### Migration Failures

1. Check database connectivity
2. Verify migration files
3. Review backup availability
4. Check logs for errors

### Health Check Failures

1. Verify environment variables
2. Check service connectivity
3. Review system resources
4. Check application logs

### Deployment Failures

1. Review pre-deployment checks
2. Verify build artifacts
3. Check health endpoints
4. Review deployment logs

## Support

For issues or questions:
1. Check deployment logs
2. Review health check endpoints
3. Verify environment configuration
4. Contact DevOps team

