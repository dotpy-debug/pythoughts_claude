# Pythoughts Platform - Production Deployment Guide

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup and Migration](#database-setup-and-migration)
5. [Application Deployment](#application-deployment)
6. [Health Checks and Verification](#health-checks-and-verification)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Rollback Procedures](#rollback-procedures)
10. [Post-Deployment Tasks](#post-deployment-tasks)
11. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] **VPS/Server Specifications**
  - [ ] Minimum 2 vCPUs
  - [ ] Minimum 4GB RAM (8GB recommended)
  - [ ] Minimum 40GB SSD storage
  - [ ] Ubuntu 22.04 LTS or Debian 12 (recommended)
  - [ ] Root or sudo access

- [ ] **Network Requirements**
  - [ ] Static IP address assigned
  - [ ] Firewall configured (UFW or iptables)
  - [ ] Ports 80 and 443 accessible
  - [ ] Port 22 for SSH (with IP whitelisting)

- [ ] **Domain Configuration**
  - [ ] Domain registered and DNS configured
  - [ ] A record pointing to server IP
  - [ ] AAAA record for IPv6 (if applicable)
  - [ ] DNS propagation completed (24-48 hours)

### Software Prerequisites

- [ ] **Docker and Docker Compose**
  ```bash
  # Verify Docker version (20.10+ required)
  docker --version

  # Verify Docker Compose version (2.0+ required)
  docker compose version
  ```

- [ ] **SSL Certificate Provider**
  - [ ] Let's Encrypt Certbot installed
  - [ ] OR SSL certificates from certificate authority
  - [ ] Certificate files in PEM format

- [ ] **Git** (for deployment)
  ```bash
  git --version  # 2.0+ required
  ```

### Third-Party Services

- [ ] **Supabase Project**
  - [ ] Project created at https://supabase.com
  - [ ] Database initialized
  - [ ] API keys obtained
  - [ ] Row Level Security (RLS) configured

- [ ] **Email Service (Resend)**
  - [ ] Account created at https://resend.com
  - [ ] API key generated
  - [ ] Domain verified (for production emails)

- [ ] **Error Tracking (Optional but Recommended)**
  - [ ] Sentry project created
  - [ ] DSN obtained

---

## Infrastructure Setup

### 1. Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  curl \
  wget \
  git \
  vim \
  ufw \
  fail2ban \
  htop \
  ncdu \
  certbot \
  python3-certbot-nginx

# Set timezone
sudo timedatectl set-timezone UTC
```

### 2. Security Hardening

#### SSH Configuration

```bash
# Create new user (do not use root in production)
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

# Generate SSH key (on your local machine)
ssh-keygen -t ed25519 -C "deploy@pythoughts" -f ~/.ssh/pythoughts_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/pythoughts_deploy.pub deploy@YOUR_SERVER_IP

# Configure SSH (edit /etc/ssh/sshd_config)
sudo vim /etc/ssh/sshd_config
```

**SSH Security Settings:**
```
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers deploy
```

```bash
# Restart SSH
sudo systemctl restart sshd
```

#### Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Optional: Allow specific IPs only for SSH
# sudo ufw allow from YOUR_IP_ADDRESS to any port 22

# Enable firewall
sudo ufw enable
sudo ufw status verbose
```

#### Fail2Ban Configuration

```bash
# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo vim /etc/fail2ban/jail.local
```

**Fail2Ban Configuration:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
```

```bash
# Start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose (standalone)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker compose version

# Enable Docker to start on boot
sudo systemctl enable docker
sudo systemctl start docker
```

### 4. Directory Structure Setup

```bash
# Create project directory
sudo mkdir -p /opt/pythoughts
sudo chown -R deploy:deploy /opt/pythoughts
cd /opt/pythoughts

# Create directory structure
mkdir -p \
  data/postgres \
  data/redis \
  backups/postgres \
  backups/redis \
  logs/nginx \
  logs/app \
  secrets \
  certs \
  docker/scripts \
  docker/nginx/conf.d

# Set proper permissions
chmod 700 secrets
chmod 755 data backups logs
```

---

## Environment Configuration

### 1. Clone Repository

```bash
cd /opt/pythoughts
git clone https://github.com/yourusername/pythoughts.git .

# Or use deployment key
git clone git@github.com:yourusername/pythoughts.git .
```

### 2. Create Production Environment File

```bash
# Copy template
cp .env.production.template .env.production

# Edit with production values
vim .env.production
```

**Required Values to Set:**

```bash
# Application
VITE_APP_URL=https://your-domain.com

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/pythoughts_production?sslmode=disable

# Redis
VITE_REDIS_URL=redis://:password@redis:6379

# Better Auth
VITE_BETTER_AUTH_URL=https://your-domain.com
VITE_BETTER_AUTH_SECRET=$(openssl rand -base64 32)

# Email
VITE_RESEND_API_KEY=re_your_api_key
EMAIL_FROM_ADDRESS=noreply@your-domain.com

# CORS
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Logging
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn (optional)
```

### 3. Generate Secrets

```bash
# Generate database password
openssl rand -base64 32 > secrets/db_password.txt

# Generate Redis password
openssl rand -base64 32 > secrets/redis_password.txt

# Generate Better Auth secret
openssl rand -base64 32 > secrets/auth_secret.txt

# Add Resend API key
echo "re_your_resend_api_key" > secrets/resend_api_key.txt

# Secure secret files
chmod 600 secrets/*
```

### 4. SSL Certificate Setup

#### Option A: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate (standalone mode)
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Copy certificates to project directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/
sudo cp /etc/letsencrypt/live/your-domain.com/chain.pem certs/
sudo chown -R deploy:deploy certs/

# Generate DH parameters (this takes 5-10 minutes)
openssl dhparam -out certs/dhparam.pem 4096

# Setup auto-renewal
sudo certbot renew --dry-run
```

**Certbot Auto-Renewal Cron:**
```bash
# Edit crontab
sudo crontab -e

# Add renewal check (runs twice daily)
0 0,12 * * * certbot renew --quiet --post-hook "docker compose -f /opt/pythoughts/docker-compose.prod.yml restart nginx"
```

#### Option B: Custom Certificate

```bash
# Copy your certificate files
cp /path/to/fullchain.pem certs/
cp /path/to/privkey.pem certs/
cp /path/to/chain.pem certs/

# Generate DH parameters
openssl dhparam -out certs/dhparam.pem 4096

# Set permissions
chmod 644 certs/*.pem
chmod 400 certs/privkey.pem
```

### 5. Update Nginx Configuration

```bash
# Edit nginx.conf
vim docker/nginx/nginx.conf

# Update server_name directive
server_name your-domain.com www.your-domain.com;

# Verify configuration
docker run --rm -v $(pwd)/docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t
```

---

## Database Setup and Migration

### 1. Initialize Database

```bash
# Start PostgreSQL container only
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to be ready
docker compose -f docker-compose.prod.yml logs -f postgres

# Verify database is healthy
docker compose -f docker-compose.prod.yml ps
```

### 2. Create Database Schema

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production

# Or run initialization script
docker compose -f docker-compose.prod.yml exec -T postgres psql -U pythoughts -d pythoughts_production < docker/init-db.sql
```

### 3. Run Migrations

**If using a migration tool (e.g., Prisma, TypeORM):**

```bash
# Run migrations
docker compose -f docker-compose.prod.yml run --rm app npm run migrate

# Or manually
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -f /path/to/migrations.sql
```

### 4. Seed Initial Data (if needed)

```bash
# Run seed script
docker compose -f docker-compose.prod.yml run --rm app npm run seed

# Or import data
docker compose -f docker-compose.prod.yml exec -T postgres psql -U pythoughts -d pythoughts_production < seed-data.sql
```

### 5. Verify Database Setup

```bash
# Check tables
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "\dt"

# Check connections
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Application Deployment

### 1. Build Docker Images

```bash
cd /opt/pythoughts

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Build production image
docker compose -f docker-compose.prod.yml build --no-cache

# Verify image
docker images | grep pythoughts
```

### 2. Start Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Monitor startup
docker compose -f docker-compose.prod.yml logs -f
```

### 3. Verify Service Status

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Check individual services
docker compose -f docker-compose.prod.yml ps postgres
docker compose -f docker-compose.prod.yml ps redis
docker compose -f docker-compose.prod.yml ps app
docker compose -f docker-compose.prod.yml ps nginx
```

### 4. Verify Network Connectivity

```bash
# Test internal network
docker compose -f docker-compose.prod.yml exec app ping -c 3 postgres
docker compose -f docker-compose.prod.yml exec app ping -c 3 redis

# Test Redis connection
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) ping

# Test PostgreSQL connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U pythoughts
```

---

## Health Checks and Verification

### 1. Application Health Checks

```bash
# Nginx health check
curl -I http://localhost/health

# Application health check
curl -I https://your-domain.com/health

# Readiness check
curl https://your-domain.com/ready

# Liveness check
curl https://your-domain.com/live
```

### 2. SSL/TLS Verification

```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Test SSL configuration (online)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

### 3. Security Headers Verification

```bash
# Check security headers
curl -I https://your-domain.com/

# Verify specific headers
curl -I https://your-domain.com/ | grep -E '(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)'

# Online security test
# Visit: https://securityheaders.com/?q=your-domain.com
```

### 4. Performance Testing

```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/

# Create curl-format.txt
cat > curl-format.txt <<EOF
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF

# Load testing (install apache2-utils)
sudo apt install apache2-utils
ab -n 1000 -c 10 https://your-domain.com/
```

### 5. Database Connection Testing

```bash
# Test application database connection
docker compose -f docker-compose.prod.yml exec app node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"

# Check database statistics
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "
SELECT
  count(*) as connections,
  state
FROM pg_stat_activity
WHERE datname = 'pythoughts_production'
GROUP BY state;
"
```

### 6. Redis Connection Testing

```bash
# Test Redis connection
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) info server

# Test set/get
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) set test_key "test_value"
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) get test_key
```

---

## Monitoring and Logging

### 1. Container Monitoring

```bash
# Monitor resource usage
docker stats

# Monitor specific services
docker stats pythoughts-app-prod pythoughts-postgres-prod pythoughts-redis-prod

# Check container logs
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx --tail=100
```

### 2. Log Aggregation

```bash
# View all logs
docker compose -f docker-compose.prod.yml logs -f

# Filter by service
docker compose -f docker-compose.prod.yml logs -f app nginx

# Search logs
docker compose -f docker-compose.prod.yml logs | grep ERROR

# Export logs
docker compose -f docker-compose.prod.yml logs --no-color > logs/deployment-$(date +%Y%m%d).log
```

### 3. System Monitoring

```bash
# Disk usage
df -h
du -sh /opt/pythoughts/*

# Memory usage
free -h

# CPU usage
top -bn1 | head -20

# Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes
```

### 4. Application Metrics

```bash
# PostgreSQL statistics
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "
SELECT
  datname,
  numbackends as connections,
  xact_commit as commits,
  xact_rollback as rollbacks,
  blks_read,
  blks_hit,
  tup_returned,
  tup_fetched,
  tup_inserted,
  tup_updated,
  tup_deleted
FROM pg_stat_database
WHERE datname = 'pythoughts_production';
"

# Redis statistics
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) info stats
```

### 5. Setup Monitoring Alerts

**Create monitoring script:**

```bash
cat > /opt/pythoughts/docker/scripts/health-monitor.sh <<'EOF'
#!/bin/bash

# Health monitoring script
DOMAIN="your-domain.com"
ALERT_EMAIL="admin@example.com"

# Check HTTP status
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/health)

if [ "$HTTP_STATUS" != "200" ]; then
  echo "ALERT: Application health check failed - HTTP $HTTP_STATUS" | \
    mail -s "Pythoughts Health Alert" $ALERT_EMAIL
fi

# Check container status
CONTAINERS=$(docker compose -f /opt/pythoughts/docker-compose.prod.yml ps -q | wc -l)
if [ "$CONTAINERS" -lt 4 ]; then
  echo "ALERT: Not all containers are running" | \
    mail -s "Pythoughts Container Alert" $ALERT_EMAIL
fi

# Check disk space
DISK_USAGE=$(df -h /opt/pythoughts | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
  echo "ALERT: Disk usage is at ${DISK_USAGE}%" | \
    mail -s "Pythoughts Disk Alert" $ALERT_EMAIL
fi
EOF

chmod +x /opt/pythoughts/docker/scripts/health-monitor.sh

# Add to crontab (run every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/pythoughts/docker/scripts/health-monitor.sh") | crontab -
```

---

## Backup and Recovery

### 1. Database Backup

**Manual Backup:**

```bash
# Create backup directory
mkdir -p backups/postgres

# Manual backup
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  -F c \
  -f /backups/pythoughts_$(date +%Y%m%d_%H%M%S).backup

# Backup with SQL format
docker compose -f docker-compose.prod.yml exec postgres pg_dump \
  -U pythoughts \
  -d pythoughts_production \
  > backups/postgres/pythoughts_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backups/postgres/
```

**Automated Backup Script:**

```bash
cat > docker/scripts/backup.sh <<'EOF'
#!/bin/sh
set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pythoughts_${TIMESTAMP}.backup"

echo "Starting database backup..."

# Create backup
pg_dump \
  -h $POSTGRES_HOST \
  -p $POSTGRES_PORT \
  -U $POSTGRES_USER \
  -d $POSTGRES_DB \
  -F c \
  -f "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"

# Clean old backups
find $BACKUP_DIR -name "pythoughts_*.backup.gz" -mtime +$RETENTION_DAYS -delete

echo "Old backups cleaned (retention: ${RETENTION_DAYS} days)"

# List current backups
echo "Current backups:"
ls -lh $BACKUP_DIR/pythoughts_*.backup.gz 2>/dev/null || echo "No backups found"
EOF

chmod +x docker/scripts/backup.sh
```

**Schedule Automated Backups:**

```bash
# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/pythoughts && docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup") | crontab -
```

### 2. Redis Backup

**Manual Backup:**

```bash
# Trigger Redis save
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) BGSAVE

# Copy RDB file
docker compose -f docker-compose.prod.yml exec redis cp /data/dump.rdb /backups/redis_$(date +%Y%m%d_%H%M%S).rdb
```

**Automated Redis Backup Script:**

```bash
cat > docker/scripts/redis-backup.sh <<'EOF'
#!/bin/sh
set -e

BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting Redis backup..."

# Trigger background save
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $(cat /run/secrets/redis_password) BGSAVE

# Wait for save to complete
sleep 5

# Copy RDB file
cp /data/dump.rdb "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

# Compress
gzip "$BACKUP_DIR/redis_${TIMESTAMP}.rdb"

echo "Redis backup completed"

# Clean old backups
find $BACKUP_DIR -name "redis_*.rdb.gz" -mtime +$RETENTION_DAYS -delete

echo "Old backups cleaned"
EOF

chmod +x docker/scripts/redis-backup.sh
```

### 3. Application Backup

```bash
# Backup application code and configuration
tar -czf backups/pythoughts_app_$(date +%Y%m%d).tar.gz \
  --exclude='node_modules' \
  --exclude='data' \
  --exclude='backups' \
  --exclude='.git' \
  /opt/pythoughts

# Backup secrets (encrypted)
tar -czf - secrets/ | gpg --symmetric --cipher-algo AES256 > backups/secrets_$(date +%Y%m%d).tar.gz.gpg
```

### 4. Restore from Backup

**Restore Database:**

```bash
# Stop application
docker compose -f docker-compose.prod.yml stop app

# Restore from custom format
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U pythoughts \
  -d pythoughts_production \
  -c \
  -F c \
  /backups/pythoughts_YYYYMMDD_HHMMSS.backup

# Or restore from SQL format
docker compose -f docker-compose.prod.yml exec -T postgres psql \
  -U pythoughts \
  -d pythoughts_production \
  < backups/postgres/pythoughts_YYYYMMDD_HHMMSS.sql

# Start application
docker compose -f docker-compose.prod.yml start app
```

**Restore Redis:**

```bash
# Stop Redis
docker compose -f docker-compose.prod.yml stop redis

# Copy backup file
gunzip -c backups/redis_YYYYMMDD_HHMMSS.rdb.gz > data/redis/dump.rdb

# Start Redis
docker compose -f docker-compose.prod.yml start redis
```

### 5. Disaster Recovery

**Complete System Restore:**

```bash
# 1. Restore application files
tar -xzf backups/pythoughts_app_YYYYMMDD.tar.gz -C /opt/

# 2. Restore secrets
gpg --decrypt backups/secrets_YYYYMMDD.tar.gz.gpg | tar -xz -C /opt/pythoughts/

# 3. Restore database
docker compose -f docker-compose.prod.yml up -d postgres
# Wait for PostgreSQL to start
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U pythoughts \
  -d pythoughts_production \
  -c \
  -F c \
  /backups/pythoughts_YYYYMMDD.backup

# 4. Restore Redis
gunzip -c backups/redis_YYYYMMDD.rdb.gz > data/redis/dump.rdb
docker compose -f docker-compose.prod.yml up -d redis

# 5. Start all services
docker compose -f docker-compose.prod.yml up -d

# 6. Verify
docker compose -f docker-compose.prod.yml ps
curl https://your-domain.com/health
```

---

## Rollback Procedures

### 1. Quick Rollback (Same Version)

```bash
# Restart services
docker compose -f docker-compose.prod.yml restart

# Or restart specific service
docker compose -f docker-compose.prod.yml restart app
```

### 2. Rollback to Previous Docker Image

```bash
# List available images
docker images | grep pythoughts

# Tag current version as backup
docker tag pythoughts:latest pythoughts:backup-$(date +%Y%m%d)

# Rollback to specific version
docker compose -f docker-compose.prod.yml down app
docker tag pythoughts:previous-version pythoughts:latest
docker compose -f docker-compose.prod.yml up -d app
```

### 3. Rollback to Previous Git Commit

```bash
# View recent commits
cd /opt/pythoughts
git log --oneline -n 10

# Rollback to specific commit
git checkout <commit-hash>

# Rebuild and restart
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app

# Verify
curl https://your-domain.com/health
```

### 4. Complete Rollback (Database + Application)

```bash
# 1. Stop all services
docker compose -f docker-compose.prod.yml down

# 2. Restore database from backup
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
  -U pythoughts \
  -d pythoughts_production \
  -c \
  /backups/pythoughts_YYYYMMDD.backup

# 3. Rollback application code
git checkout <previous-commit>

# 4. Rebuild
docker compose -f docker-compose.prod.yml build

# 5. Start services
docker compose -f docker-compose.prod.yml up -d

# 6. Verify
docker compose -f docker-compose.prod.yml ps
curl https://your-domain.com/health
```

### 5. Emergency Maintenance Mode

```bash
# Create maintenance page
cat > docker/nginx/html/maintenance.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
  <title>Maintenance - Pythoughts</title>
  <style>
    body { font-family: Arial; text-align: center; padding: 50px; }
    h1 { color: #333; }
  </style>
</head>
<body>
  <h1>Scheduled Maintenance</h1>
  <p>We're currently performing scheduled maintenance.</p>
  <p>We'll be back shortly. Thank you for your patience.</p>
</body>
</html>
EOF

# Enable maintenance mode (edit nginx.conf)
# Add at top of server block:
# return 503;
# error_page 503 /maintenance.html;
# location = /maintenance.html {
#   root /usr/share/nginx/html;
#   internal;
# }

# Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## Post-Deployment Tasks

### 1. Verify Deployment

- [ ] All containers running: `docker compose -f docker-compose.prod.yml ps`
- [ ] Health checks passing: `curl https://your-domain.com/health`
- [ ] SSL certificate valid: Check expiry date
- [ ] Security headers present: `curl -I https://your-domain.com/`
- [ ] Database accessible: Run test query
- [ ] Redis accessible: Test cache operations
- [ ] Email sending working: Test registration email
- [ ] Authentication working: Test login/signup
- [ ] Logs being generated: Check log files
- [ ] Backups configured: Verify backup cron jobs
- [ ] Monitoring active: Check monitoring dashboard

### 2. Performance Tuning

```bash
# Monitor resource usage
docker stats

# Optimize PostgreSQL settings based on available resources
# Edit docker/postgresql.conf

# Optimize Redis memory settings
# Edit docker/redis.conf

# Optimize Nginx worker processes
# Edit docker/nginx/nginx.conf
```

### 3. Security Audit

```bash
# Run security scan
docker scout cves pythoughts:latest

# Check for vulnerable packages
docker compose -f docker-compose.prod.yml run --rm app npm audit

# Test security headers
curl -I https://your-domain.com/ | grep -E '(Strict-Transport-Security|X-Frame-Options|Content-Security-Policy)'

# SSL test
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

### 4. Documentation Updates

- [ ] Update deployment documentation with actual values
- [ ] Document any custom configurations
- [ ] Update runbooks for operations team
- [ ] Record server credentials in password manager
- [ ] Document troubleshooting steps for common issues

### 5. Monitoring Setup

```bash
# Setup log rotation
sudo cat > /etc/logrotate.d/pythoughts <<EOF
/opt/pythoughts/logs/**/*.log {
  daily
  missingok
  rotate 14
  compress
  delaycompress
  notifempty
  create 0640 deploy deploy
  sharedscripts
}
EOF

# Test log rotation
sudo logrotate -d /etc/logrotate.d/pythoughts
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service-name>

# Check container status
docker compose -f docker-compose.prod.yml ps

# Inspect container
docker inspect pythoughts-<service>-prod

# Common fixes:
# - Check environment variables
# - Verify secrets exist
# - Check port conflicts
# - Verify volume permissions
```

#### 2. Database Connection Errors

```bash
# Test connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U pythoughts

# Check connection string
docker compose -f docker-compose.prod.yml exec app printenv | grep DATABASE_URL

# Verify password
cat secrets/db_password.txt

# Check PostgreSQL logs
docker compose -f docker-compose.prod.yml logs postgres

# Common fixes:
# - Verify DATABASE_URL format
# - Check password in secrets file
# - Ensure postgres is healthy
# - Check network connectivity
```

#### 3. SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in certs/fullchain.pem -text -noout

# Test SSL handshake
openssl s_client -connect your-domain.com:443

# Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew

# Common fixes:
# - Verify certificate files exist
# - Check file permissions
# - Ensure paths in nginx.conf are correct
# - Regenerate certificates if expired
```

#### 4. Redis Connection Issues

```bash
# Test Redis connection
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) ping

# Check Redis logs
docker compose -f docker-compose.prod.yml logs redis

# Verify password
cat secrets/redis_password.txt

# Common fixes:
# - Check Redis password
# - Verify Redis is running
# - Check REDIS_URL format
# - Ensure network connectivity
```

#### 5. Application Errors

```bash
# Check application logs
docker compose -f docker-compose.prod.yml logs -f app

# Check environment variables
docker compose -f docker-compose.prod.yml exec app printenv

# Restart application
docker compose -f docker-compose.prod.yml restart app

# Rebuild application
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d app

# Common fixes:
# - Check environment variables
# - Verify secrets are loaded
# - Check for missing dependencies
# - Review application logs
```

#### 6. Nginx Configuration Errors

```bash
# Test nginx configuration
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx

# Common fixes:
# - Fix syntax errors in nginx.conf
# - Verify SSL certificate paths
# - Check upstream configuration
# - Restart nginx
```

#### 7. Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Clear system cache
sudo sync
sudo echo 3 > /proc/sys/vm/drop_caches

# Increase swap (temporary)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Long-term fixes:
# - Upgrade server RAM
# - Optimize application memory usage
# - Reduce resource limits
# - Enable swap permanently
```

#### 8. Disk Space Issues

```bash
# Check disk usage
df -h
du -sh /opt/pythoughts/*

# Clean Docker resources
docker system prune -a --volumes

# Clean old logs
find /opt/pythoughts/logs -type f -mtime +30 -delete

# Clean old backups
find /opt/pythoughts/backups -type f -mtime +30 -delete

# Long-term fixes:
# - Increase disk size
# - Setup log rotation
# - Configure backup retention
# - Move data to external storage
```

### Emergency Contacts

**System Administrator:** your-email@example.com
**Database Administrator:** dba@example.com
**Security Team:** security@example.com
**On-Call Rotation:** oncall@example.com

### Support Resources

- **Documentation:** https://docs.pythoughts.com
- **Status Page:** https://status.pythoughts.com
- **Support Portal:** https://support.pythoughts.com
- **Community Forum:** https://community.pythoughts.com

---

## Deployment Checklist Summary

### Pre-Deployment
- [ ] Infrastructure provisioned
- [ ] DNS configured
- [ ] SSL certificates obtained
- [ ] Third-party services configured
- [ ] Secrets generated
- [ ] Environment variables set

### Deployment
- [ ] Code deployed
- [ ] Docker images built
- [ ] Database migrated
- [ ] Services started
- [ ] Health checks passing

### Post-Deployment
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Logs aggregated
- [ ] Security audit completed
- [ ] Performance tested
- [ ] Documentation updated

### Maintenance
- [ ] Backup retention configured
- [ ] Log rotation enabled
- [ ] Update schedule defined
- [ ] Incident response plan documented
- [ ] Rollback procedure tested

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-03
**Maintained By:** DevOps Team
