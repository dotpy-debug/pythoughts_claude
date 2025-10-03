# Pythoughts Platform - Backup and Recovery Procedures

## Overview

This document outlines comprehensive backup and disaster recovery procedures for the Pythoughts platform. Following these procedures ensures data integrity and business continuity.

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Database Backups](#database-backups)
3. [Redis Backups](#redis-backups)
4. [Application Backups](#application-backups)
5. [Backup Verification](#backup-verification)
6. [Restore Procedures](#restore-procedures)
7. [Disaster Recovery](#disaster-recovery)
8. [Backup Monitoring](#backup-monitoring)

---

## Backup Strategy

### Backup Types

| Type | Frequency | Retention | Priority |
|------|-----------|-----------|----------|
| Database Full | Daily | 30 days | Critical |
| Database Incremental | Every 6 hours | 7 days | High |
| Redis Snapshot | Every 6 hours | 7 days | Medium |
| Application Config | Weekly | 90 days | High |
| Secrets | Manual | Indefinite | Critical |
| Logs | Daily | 30 days | Low |

### Backup Locations

**Primary Backup:**
- Local: `/opt/pythoughts/backups/`
- Off-site: S3 bucket or equivalent

**Disaster Recovery:**
- Secondary region: Different geographic location
- Cold storage: Long-term archival (1+ years)

### Recovery Time Objective (RTO)

- **Critical**: 1 hour (database)
- **High**: 4 hours (full system)
- **Medium**: 24 hours (complete disaster recovery)

### Recovery Point Objective (RPO)

- **Critical**: 6 hours (maximum data loss)
- **Target**: 1 hour (with incremental backups)

---

## Database Backups

### Automated Daily Backups

**Backup Script:** `docker/scripts/backup.sh`

```bash
#!/bin/sh
# PostgreSQL Backup Script
set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pythoughts_${TIMESTAMP}.backup"
LOG_FILE="$BACKUP_DIR/backup.log"

# Logging function
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting database backup..."

# Check disk space (require at least 5GB free)
AVAIL_SPACE=$(df -BG "$BACKUP_DIR" | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$AVAIL_SPACE" -lt 5 ]; then
  log "ERROR: Insufficient disk space. Available: ${AVAIL_SPACE}GB, Required: 5GB"
  exit 1
fi

# Set password from secrets file
export PGPASSWORD=$(cat /run/secrets/db_password)

# Create backup with custom format (supports parallel restore)
pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -F c \
  -b \
  -v \
  -f "$BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
  log "Backup created successfully: $BACKUP_FILE"
else
  log "ERROR: Backup failed!"
  exit 1
fi

# Compress backup
log "Compressing backup..."
gzip -9 "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

if [ $? -eq 0 ]; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "Backup compressed: $BACKUP_FILE (Size: $BACKUP_SIZE)"
else
  log "ERROR: Compression failed!"
  exit 1
fi

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
echo "$CHECKSUM  $BACKUP_FILE" > "${BACKUP_FILE}.sha256"
log "Checksum: $CHECKSUM"

# Upload to S3 (if configured)
if [ -n "$AWS_S3_BUCKET" ]; then
  log "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/postgres/" --storage-class STANDARD_IA
  aws s3 cp "${BACKUP_FILE}.sha256" "s3://$AWS_S3_BUCKET/backups/postgres/"

  if [ $? -eq 0 ]; then
    log "Backup uploaded to S3 successfully"
  else
    log "WARNING: S3 upload failed, but local backup is available"
  fi
fi

# Clean old backups
log "Cleaning old backups (retention: ${RETENTION_DAYS} days)..."
find "$BACKUP_DIR" -name "pythoughts_*.backup.gz" -mtime +$RETENTION_DAYS -exec rm {} \;
find "$BACKUP_DIR" -name "pythoughts_*.backup.gz.sha256" -mtime +$RETENTION_DAYS -exec rm {} \;

# List current backups
log "Current local backups:"
ls -lh "$BACKUP_DIR"/pythoughts_*.backup.gz 2>/dev/null | tee -a "$LOG_FILE" || log "No backups found"

log "Backup completed successfully!"

# Send notification (if configured)
if [ -n "$BACKUP_NOTIFICATION_URL" ]; then
  curl -X POST "$BACKUP_NOTIFICATION_URL" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"success\",\"backup\":\"$BACKUP_FILE\",\"size\":\"$BACKUP_SIZE\",\"checksum\":\"$CHECKSUM\"}"
fi

unset PGPASSWORD
```

### Manual Backup

```bash
# Full database backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  -F c \
  -f /backups/manual_$(date +%Y%m%d_%H%M%S).backup

# SQL format backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  > backups/postgres/manual_$(date +%Y%m%d_%H%M%S).sql

# Schema only
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  --schema-only \
  > backups/postgres/schema_$(date +%Y%m%d).sql

# Data only
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  --data-only \
  -F c \
  -f /backups/data_$(date +%Y%m%d).backup

# Specific table backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  -t profiles \
  > backups/postgres/profiles_$(date +%Y%m%d).sql
```

### Incremental Backups (WAL Archiving)

**Enable WAL archiving in PostgreSQL:**

```sql
-- Configure WAL archiving
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET archive_mode = on;
ALTER SYSTEM SET archive_command = 'cp %p /backups/wal/%f';
ALTER SYSTEM SET archive_timeout = 300;  -- 5 minutes
SELECT pg_reload_conf();
```

**WAL Archive Script:**

```bash
#!/bin/bash
# Archive WAL files to S3
set -e

WAL_FILE=$1
WAL_DIR="/backups/wal"
S3_BUCKET="your-bucket"

# Copy to local archive
cp "$WAL_FILE" "$WAL_DIR/"

# Upload to S3
aws s3 cp "$WAL_FILE" "s3://$S3_BUCKET/wal/" --storage-class STANDARD_IA

# Clean old WAL files (keep 7 days)
find "$WAL_DIR" -type f -mtime +7 -delete
```

---

## Redis Backups

### Automated Redis Backups

**Backup Script:** `docker/scripts/redis-backup.sh`

```bash
#!/bin/sh
# Redis Backup Script
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_DIR/redis-backup.log"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting Redis backup..."

# Read password from secrets
REDIS_PASSWORD=$(cat /run/secrets/redis_password)

# Trigger background save
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE

log "Background save initiated, waiting for completion..."

# Wait for save to complete
SAVE_STATUS=""
while [ "$SAVE_STATUS" != "ok" ]; do
  sleep 2
  SAVE_STATUS=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE | xargs)
  CURRENT_SAVE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)

  # Check if still saving
  INFO=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" INFO persistence)
  if echo "$INFO" | grep -q "rdb_bgsave_in_progress:1"; then
    log "Save in progress..."
  else
    SAVE_STATUS="ok"
  fi
done

log "Save completed, copying RDB file..."

# Copy RDB file
cp /data/dump.rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

if [ $? -eq 0 ]; then
  log "RDB file copied successfully"
else
  log "ERROR: Failed to copy RDB file"
  exit 1
fi

# Compress backup
log "Compressing backup..."
gzip -9 "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

BACKUP_FILE="$BACKUP_DIR/redis_${TIMESTAMP}.rdb.gz"
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup compressed: $BACKUP_FILE (Size: $BACKUP_SIZE)"

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
echo "$CHECKSUM  $BACKUP_FILE" > "${BACKUP_FILE}.sha256"
log "Checksum: $CHECKSUM"

# Upload to S3 (if configured)
if [ -n "$AWS_S3_BUCKET" ]; then
  log "Uploading to S3..."
  aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/backups/redis/"
  aws s3 cp "${BACKUP_FILE}.sha256" "s3://$AWS_S3_BUCKET/backups/redis/"

  if [ $? -eq 0 ]; then
    log "Backup uploaded to S3 successfully"
  else
    log "WARNING: S3 upload failed"
  fi
fi

# Clean old backups
log "Cleaning old backups..."
find "$BACKUP_DIR" -name "redis_*.rdb.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "redis_*.rdb.gz.sha256" -mtime +$RETENTION_DAYS -delete

log "Redis backup completed successfully!"
```

### Manual Redis Backup

```bash
# Trigger save
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) SAVE

# Copy RDB file
docker compose -f docker-compose.prod.yml exec redis cp /data/dump.rdb /backups/redis_manual_$(date +%Y%m%d).rdb

# Export all keys (for migration)
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) --rdb /backups/redis_export.rdb

# Backup AOF file
docker compose -f docker-compose.prod.yml exec redis cp /data/appendonly.aof /backups/redis_aof_$(date +%Y%m%d).aof
```

---

## Application Backups

### Configuration Backup

```bash
#!/bin/bash
# Backup application configuration
set -e

BACKUP_DIR="/opt/pythoughts/backups/config"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/pythoughts"

mkdir -p "$BACKUP_DIR"

# Backup configuration files
tar -czf "$BACKUP_DIR/config_${TIMESTAMP}.tar.gz" \
  -C "$APP_DIR" \
  .env.production \
  docker-compose.prod.yml \
  docker/nginx/nginx.conf \
  docker/postgresql.conf \
  docker/redis.conf \
  package.json \
  package-lock.json

echo "Configuration backup created: config_${TIMESTAMP}.tar.gz"

# Backup secrets (encrypted)
tar -czf - -C "$APP_DIR" secrets/ | \
  gpg --symmetric --cipher-algo AES256 \
  > "$BACKUP_DIR/secrets_${TIMESTAMP}.tar.gz.gpg"

echo "Secrets backup created (encrypted): secrets_${TIMESTAMP}.tar.gz.gpg"

# Clean old backups (keep 90 days)
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +90 -delete
find "$BACKUP_DIR" -name "secrets_*.tar.gz.gpg" -mtime +90 -delete
```

### SSL Certificates Backup

```bash
#!/bin/bash
# Backup SSL certificates
set -e

BACKUP_DIR="/opt/pythoughts/backups/certs"
TIMESTAMP=$(date +%Y%m%d)
CERT_DIR="/opt/pythoughts/certs"

mkdir -p "$BACKUP_DIR"

# Backup certificates
tar -czf "$BACKUP_DIR/certs_${TIMESTAMP}.tar.gz" \
  -C "$CERT_DIR" \
  fullchain.pem \
  privkey.pem \
  chain.pem \
  dhparam.pem

echo "Certificate backup created: certs_${TIMESTAMP}.tar.gz"

# Keep 365 days
find "$BACKUP_DIR" -name "certs_*.tar.gz" -mtime +365 -delete
```

### Complete System Backup

```bash
#!/bin/bash
# Complete system backup (excluding data volumes)
set -e

BACKUP_DIR="/opt/pythoughts/backups/system"
TIMESTAMP=$(date +%Y%m%d)
APP_DIR="/opt/pythoughts"

mkdir -p "$BACKUP_DIR"

# Backup entire application directory
tar -czf "$BACKUP_DIR/system_${TIMESTAMP}.tar.gz" \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='backups' \
  --exclude='.git' \
  --exclude='*.log' \
  -C "$(dirname $APP_DIR)" \
  "$(basename $APP_DIR)"

BACKUP_SIZE=$(du -h "$BACKUP_DIR/system_${TIMESTAMP}.tar.gz" | cut -f1)
echo "System backup created: system_${TIMESTAMP}.tar.gz (Size: $BACKUP_SIZE)"

# Upload to S3
if [ -n "$AWS_S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_DIR/system_${TIMESTAMP}.tar.gz" \
    "s3://$AWS_S3_BUCKET/backups/system/" \
    --storage-class GLACIER
fi

# Keep 30 days locally
find "$BACKUP_DIR" -name "system_*.tar.gz" -mtime +30 -delete
```

---

## Backup Verification

### Verify Backup Integrity

```bash
#!/bin/bash
# Verify backup integrity
set -e

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Verifying backup: $BACKUP_FILE"

# Check if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo "Testing gzip integrity..."
  gunzip -t "$BACKUP_FILE"

  if [ $? -eq 0 ]; then
    echo "✓ Compression integrity OK"
  else
    echo "✗ Compression corrupted!"
    exit 1
  fi
fi

# Verify checksum if available
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [ -f "$CHECKSUM_FILE" ]; then
  echo "Verifying checksum..."
  sha256sum -c "$CHECKSUM_FILE"

  if [ $? -eq 0 ]; then
    echo "✓ Checksum verified"
  else
    echo "✗ Checksum mismatch!"
    exit 1
  fi
fi

# Test PostgreSQL backup
if [[ "$BACKUP_FILE" == *".backup"* ]]; then
  echo "Testing PostgreSQL backup..."
  gunzip -c "$BACKUP_FILE" | pg_restore -l > /dev/null

  if [ $? -eq 0 ]; then
    echo "✓ PostgreSQL backup structure OK"
  else
    echo "✗ PostgreSQL backup corrupted!"
    exit 1
  fi
fi

echo "Backup verification completed successfully!"
```

### Test Restore (Non-Destructive)

```bash
#!/bin/bash
# Test restore procedure in isolated environment
set -e

BACKUP_FILE=$1
TEST_DB="pythoughts_restore_test"

echo "Creating test database..."
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -c "CREATE DATABASE $TEST_DB;"

echo "Restoring backup to test database..."
gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U pythoughts \
  -d "$TEST_DB" \
  -v

if [ $? -eq 0 ]; then
  echo "✓ Test restore successful"

  # Verify data
  echo "Verifying restored data..."
  RECORD_COUNT=$(docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d "$TEST_DB" -t -c "SELECT COUNT(*) FROM profiles;")
  echo "Restored records: $RECORD_COUNT"

  # Cleanup
  docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -c "DROP DATABASE $TEST_DB;"
  echo "Test database cleaned up"
else
  echo "✗ Test restore failed!"
  exit 1
fi
```

---

## Restore Procedures

### Database Restore

**Full Restore:**

```bash
#!/bin/bash
# Full database restore
set -e

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will replace the current database!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Stop application
echo "Stopping application..."
docker compose -f docker-compose.prod.yml stop app

# Create pre-restore backup
echo "Creating pre-restore backup..."
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  -F c \
  -f /backups/pre_restore_$(date +%Y%m%d_%H%M%S).backup

# Terminate existing connections
echo "Terminating database connections..."
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'pythoughts_production' AND pid <> pg_backend_pid();
"

# Restore database
echo "Restoring database..."
gunzip -c "$BACKUP_FILE" | docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U pythoughts \
  -d pythoughts_production \
  --clean \
  --if-exists \
  -v

if [ $? -eq 0 ]; then
  echo "✓ Database restored successfully"

  # Verify restore
  echo "Verifying restore..."
  RECORD_COUNT=$(docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -t -c "SELECT COUNT(*) FROM profiles;")
  echo "Restored records: $RECORD_COUNT"

  # Start application
  echo "Starting application..."
  docker compose -f docker-compose.prod.yml start app

  echo "Restore completed successfully!"
else
  echo "✗ Database restore failed!"
  echo "Application remains stopped for safety"
  exit 1
fi
```

### Redis Restore

```bash
#!/bin/bash
# Redis restore
set -e

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Stopping Redis..."
docker compose -f docker-compose.prod.yml stop redis

echo "Restoring Redis backup..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
  gunzip -c "$BACKUP_FILE" > data/redis/dump.rdb
else
  cp "$BACKUP_FILE" data/redis/dump.rdb
fi

echo "Starting Redis..."
docker compose -f docker-compose.prod.yml start redis

# Wait for Redis to start
sleep 5

# Verify
REDIS_KEYS=$(docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) DBSIZE)
echo "Restored keys: $REDIS_KEYS"

echo "Redis restore completed!"
```

### Point-in-Time Recovery (PITR)

```bash
#!/bin/bash
# Point-in-Time Recovery using WAL files
set -e

BASE_BACKUP=$1
TARGET_TIME=$2  # Format: 2024-01-15 14:30:00
WAL_DIR="/backups/wal"

echo "Performing Point-in-Time Recovery..."
echo "Base backup: $BASE_BACKUP"
echo "Target time: $TARGET_TIME"

# Stop PostgreSQL
docker compose -f docker-compose.prod.yml stop postgres

# Restore base backup
echo "Restoring base backup..."
rm -rf data/postgres/*
gunzip -c "$BASE_BACKUP" | pg_restore -d postgres -C

# Configure recovery
cat > data/postgres/recovery.conf <<EOF
restore_command = 'cp $WAL_DIR/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL in recovery mode
docker compose -f docker-compose.prod.yml start postgres

echo "Recovery in progress, monitoring logs..."
docker compose -f docker-compose.prod.yml logs -f postgres
```

---

## Disaster Recovery

### Complete System Recovery

**Recovery Steps:**

1. **Provision New Server**
   ```bash
   # Setup new VPS with same specifications
   # Install Docker and Docker Compose
   # Configure firewall and SSH
   ```

2. **Restore Application Code**
   ```bash
   # Download latest system backup
   aws s3 cp s3://your-bucket/backups/system/system_YYYYMMDD.tar.gz .

   # Extract
   tar -xzf system_YYYYMMDD.tar.gz -C /opt/
   cd /opt/pythoughts
   ```

3. **Restore Secrets**
   ```bash
   # Download and decrypt secrets
   aws s3 cp s3://your-bucket/backups/config/secrets_YYYYMMDD.tar.gz.gpg .
   gpg --decrypt secrets_YYYYMMDD.tar.gz.gpg | tar -xz
   ```

4. **Restore Database**
   ```bash
   # Download latest database backup
   aws s3 cp s3://your-bucket/backups/postgres/pythoughts_YYYYMMDD_HHMMSS.backup.gz .

   # Start PostgreSQL
   docker compose -f docker-compose.prod.yml up -d postgres

   # Restore
   gunzip -c pythoughts_YYYYMMDD_HHMMSS.backup.gz | \
     docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
       -U pythoughts \
       -d pythoughts_production \
       -C
   ```

5. **Restore Redis**
   ```bash
   # Download Redis backup
   aws s3 cp s3://your-bucket/backups/redis/redis_YYYYMMDD_HHMMSS.rdb.gz .

   # Restore
   gunzip redis_YYYYMMDD_HHMMSS.rdb.gz
   cp redis_YYYYMMDD_HHMMSS.rdb data/redis/dump.rdb
   ```

6. **Start Services**
   ```bash
   # Start all services
   docker compose -f docker-compose.prod.yml up -d

   # Verify
   docker compose -f docker-compose.prod.yml ps
   curl https://your-domain.com/health
   ```

7. **Update DNS**
   ```bash
   # Point DNS to new server IP
   # Wait for propagation
   ```

### Disaster Recovery Checklist

- [ ] New server provisioned and secured
- [ ] Application code restored
- [ ] Secrets and configurations restored
- [ ] Database restored and verified
- [ ] Redis restored and verified
- [ ] SSL certificates installed
- [ ] DNS updated
- [ ] Health checks passing
- [ ] Monitoring re-enabled
- [ ] Backups re-configured
- [ ] Team notified
- [ ] Post-mortem scheduled

---

## Backup Monitoring

### Backup Verification Cron

```bash
# Add to crontab
0 6 * * * /opt/pythoughts/scripts/verify-backups.sh
```

### Monitoring Script

```bash
#!/bin/bash
# Monitor backup status
set -e

BACKUP_DIR="/opt/pythoughts/backups"
ALERT_EMAIL="admin@example.com"
MAX_AGE_HOURS=25  # Alert if no backup in 25 hours

# Check PostgreSQL backups
LATEST_PG_BACKUP=$(find "$BACKUP_DIR/postgres" -name "pythoughts_*.backup.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -z "$LATEST_PG_BACKUP" ]; then
  echo "ALERT: No PostgreSQL backups found!" | mail -s "Backup Alert: PostgreSQL" "$ALERT_EMAIL"
  exit 1
fi

# Check backup age
BACKUP_AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_PG_BACKUP")) / 3600 ))

if [ "$BACKUP_AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
  echo "ALERT: PostgreSQL backup is $BACKUP_AGE_HOURS hours old!" | mail -s "Backup Alert: PostgreSQL" "$ALERT_EMAIL"
fi

# Check Redis backups
LATEST_REDIS_BACKUP=$(find "$BACKUP_DIR/redis" -name "redis_*.rdb.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")

if [ -z "$LATEST_REDIS_BACKUP" ]; then
  echo "ALERT: No Redis backups found!" | mail -s "Backup Alert: Redis" "$ALERT_EMAIL"
fi

# Check backup sizes
PG_SIZE=$(du -sh "$LATEST_PG_BACKUP" | cut -f1)
REDIS_SIZE=$(du -sh "$LATEST_REDIS_BACKUP" | cut -f1)

echo "Latest backups:"
echo "PostgreSQL: $LATEST_PG_BACKUP (Size: $PG_SIZE, Age: ${BACKUP_AGE_HOURS}h)"
echo "Redis: $LATEST_REDIS_BACKUP (Size: $REDIS_SIZE)"

# Verify backup integrity
/opt/pythoughts/scripts/verify-backup-integrity.sh "$LATEST_PG_BACKUP"
```

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-03
**Review Schedule:** Monthly
