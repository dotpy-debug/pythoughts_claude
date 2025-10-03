# Pythoughts Platform - Production Deployment Summary

## Quick Start

This document provides a quick reference for deploying Pythoughts to production. For detailed information, refer to the comprehensive documentation files.

---

## File Structure

```
pythoughts/
├── .env.production.template      # Production environment template
├── docker-compose.prod.yml       # Production Docker Compose config
├── PRODUCTION_DEPLOY.md          # Complete deployment guide
├── SECURITY_HARDENING.md         # Security checklist
├── BACKUP_RECOVERY.md            # Backup and recovery procedures
├── docker/
│   ├── nginx/
│   │   └── nginx.conf           # Production Nginx configuration
│   ├── postgresql.conf          # PostgreSQL tuning
│   ├── redis.conf               # Redis configuration
│   └── scripts/
│       ├── backup.sh            # Database backup script
│       └── redis-backup.sh      # Redis backup script
└── src/
    └── lib/
        └── health.ts            # Health check implementation
```

---

## Pre-Deployment Checklist

### Infrastructure

- [ ] VPS provisioned (min: 2 vCPU, 4GB RAM, 40GB SSD)
- [ ] Ubuntu 22.04 LTS or Debian 12 installed
- [ ] Docker 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] Domain registered and DNS configured
- [ ] Firewall configured (UFW/iptables)
- [ ] SSH key-based authentication enabled

### Third-Party Services

- [ ] Supabase project created
- [ ] Supabase API keys obtained
- [ ] Resend account created
- [ ] Resend API key generated
- [ ] Resend domain verified
- [ ] Sentry project created (optional)

### Security

- [ ] SSL certificates obtained (Let's Encrypt recommended)
- [ ] Strong passwords generated for all services
- [ ] Secrets stored securely
- [ ] SSH root login disabled
- [ ] Fail2ban installed and configured
- [ ] Regular security updates enabled

---

## Deployment Steps (Quick Version)

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Create project directory
sudo mkdir -p /opt/pythoughts
sudo chown $USER:$USER /opt/pythoughts
cd /opt/pythoughts

# Clone repository
git clone <your-repo-url> .
```

### 2. Environment Configuration

```bash
# Create directory structure
mkdir -p data/{postgres,redis} backups/{postgres,redis} secrets certs logs

# Generate secrets
openssl rand -base64 32 > secrets/db_password.txt
openssl rand -base64 32 > secrets/redis_password.txt
openssl rand -base64 32 > secrets/auth_secret.txt
echo "re_your_resend_key" > secrets/resend_api_key.txt
chmod 600 secrets/*

# Configure environment
cp .env.production.template .env.production
vim .env.production  # Fill in production values
```

### 3. SSL Certificate

```bash
# Install Certbot
sudo apt install certbot -y

# Obtain certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/
sudo cp /etc/letsencrypt/live/your-domain.com/chain.pem certs/
sudo chown $USER:$USER certs/*

# Generate DH parameters (takes 5-10 minutes)
openssl dhparam -out certs/dhparam.pem 4096
```

### 4. Database Setup

```bash
# Start PostgreSQL
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for PostgreSQL to be healthy
docker compose -f docker-compose.prod.yml logs -f postgres

# Run migrations (if needed)
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production < migrations.sql
```

### 5. Deploy Application

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Verify services
docker compose -f docker-compose.prod.yml ps
```

### 6. Verify Deployment

```bash
# Health check
curl https://your-domain.com/health

# Check logs
docker compose -f docker-compose.prod.yml logs -f app

# Test SSL
curl -I https://your-domain.com/
```

### 7. Setup Backups

```bash
# Make scripts executable
chmod +x docker/scripts/*.sh

# Add backup cron job (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * cd /opt/pythoughts && docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup") | crontab -

# Test backup
docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup
```

---

## Essential Commands

### Service Management

```bash
# Start services
docker compose -f docker-compose.prod.yml up -d

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart specific service
docker compose -f docker-compose.prod.yml restart app

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### Monitoring

```bash
# Resource usage
docker stats

# Application logs
docker compose -f docker-compose.prod.yml logs -f app

# Nginx logs
docker compose -f docker-compose.prod.yml logs -f nginx

# Database logs
docker compose -f docker-compose.prod.yml logs -f postgres

# System resources
htop
df -h
free -h
```

### Maintenance

```bash
# Update application
cd /opt/pythoughts
git pull
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps app

# Database backup
docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup

# Clean Docker resources
docker system prune -a

# Renew SSL certificate
sudo certbot renew
docker compose -f docker-compose.prod.yml restart nginx
```

---

## Health Check Endpoints

| Endpoint | Purpose | Expected Response |
|----------|---------|-------------------|
| `/health` | General health | 200 OK |
| `/ready` | Readiness probe | 200 OK |
| `/live` | Liveness probe | 200 OK |

### Example Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2025-10-03T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "latency": 5
    },
    {
      "name": "redis",
      "status": "healthy",
      "latency": 2
    },
    {
      "name": "auth",
      "status": "healthy",
      "latency": 10
    },
    {
      "name": "external_services",
      "status": "healthy",
      "latency": 50
    }
  ]
}
```

---

## Security Checklist

### Critical

- [ ] HTTPS enabled with valid certificate
- [ ] All secrets generated and secured (chmod 600)
- [ ] Database password is strong and unique
- [ ] Redis password authentication enabled
- [ ] SSH key-based authentication only
- [ ] Firewall configured (allow only 22, 80, 443)
- [ ] Security headers configured in Nginx
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables validated

### Important

- [ ] Fail2ban configured
- [ ] SSL/TLS A+ rating (test at ssllabs.com)
- [ ] Content Security Policy implemented
- [ ] Row Level Security enabled in Supabase
- [ ] Docker containers run as non-root
- [ ] Automated backups configured
- [ ] Log monitoring enabled
- [ ] Incident response plan created
- [ ] Secret rotation policy defined

---

## Backup Strategy

| Backup Type | Frequency | Retention | Location |
|-------------|-----------|-----------|----------|
| Database Full | Daily 2 AM | 30 days | Local + S3 |
| Redis Snapshot | Every 6h | 7 days | Local |
| Config Files | Weekly | 90 days | Local + S3 |
| SSL Certs | Monthly | 365 days | Local |

### Restore Database

```bash
# Full restore
gunzip -c backups/postgres/pythoughts_YYYYMMDD.backup.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
    -U pythoughts \
    -d pythoughts_production \
    --clean
```

### Restore Redis

```bash
# Stop Redis
docker compose -f docker-compose.prod.yml stop redis

# Restore backup
gunzip -c backups/redis/redis_YYYYMMDD.rdb.gz > data/redis/dump.rdb

# Start Redis
docker compose -f docker-compose.prod.yml start redis
```

---

## Monitoring and Alerts

### Setup Monitoring

```bash
# Check service health every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * curl -f https://your-domain.com/health || echo 'Health check failed' | mail -s 'Alert' admin@example.com") | crontab -

# Monitor disk space
(crontab -l 2>/dev/null; echo "0 */6 * * * df -h /opt/pythoughts | awk 'NR==2 {if ($5+0 > 80) print}' | mail -s 'Disk Alert' admin@example.com") | crontab -
```

### Key Metrics to Monitor

- **Application**: Response time, error rate, request count
- **Database**: Connection count, query time, cache hit ratio
- **Redis**: Memory usage, evictions, hit rate
- **System**: CPU usage, memory usage, disk space
- **Network**: Bandwidth usage, connection count

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service>

# Check configuration
docker compose -f docker-compose.prod.yml config

# Rebuild
docker compose -f docker-compose.prod.yml build --no-cache <service>
```

### Database Connection Issues

```bash
# Test connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U pythoughts

# Check password
cat secrets/db_password.txt

# Verify DATABASE_URL
docker compose -f docker-compose.prod.yml exec app printenv | grep DATABASE_URL
```

### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in certs/fullchain.pem -text -noout

# Test SSL
openssl s_client -connect your-domain.com:443

# Renew certificate
sudo certbot renew --force-renewal
```

### Out of Memory

```bash
# Check memory usage
free -h
docker stats

# Restart services
docker compose -f docker-compose.prod.yml restart

# Increase swap (temporary)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Performance Optimization

### Database

```bash
# Check slow queries
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Analyze tables
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "ANALYZE;"

# Vacuum
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "VACUUM ANALYZE;"
```

### Redis

```bash
# Check memory usage
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) INFO memory

# Check slow commands
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) SLOWLOG GET 10
```

### Nginx

```bash
# Test configuration
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload without downtime
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## Update Procedure

### Zero-Downtime Update

```bash
# 1. Pull latest changes
cd /opt/pythoughts
git pull

# 2. Backup database
docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup

# 3. Build new image
docker compose -f docker-compose.prod.yml build app

# 4. Update application only
docker compose -f docker-compose.prod.yml up -d --no-deps --build app

# 5. Verify
curl https://your-domain.com/health
docker compose -f docker-compose.prod.yml logs -f app
```

### Rollback Procedure

```bash
# 1. Stop application
docker compose -f docker-compose.prod.yml stop app

# 2. Revert code
git checkout <previous-commit>

# 3. Rebuild
docker compose -f docker-compose.prod.yml build app

# 4. Start
docker compose -f docker-compose.prod.yml start app

# 5. Verify
curl https://your-domain.com/health
```

---

## Support and Resources

### Documentation

- **Full Deployment Guide**: `PRODUCTION_DEPLOY.md`
- **Security Hardening**: `SECURITY_HARDENING.md`
- **Backup & Recovery**: `BACKUP_RECOVERY.md`
- **Environment Config**: `.env.production.template`

### External Resources

- **Supabase Docs**: https://supabase.com/docs
- **Docker Docs**: https://docs.docker.com
- **Nginx Docs**: https://nginx.org/en/docs/
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Redis Docs**: https://redis.io/documentation

### Testing Tools

- **SSL Test**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
- **Uptime Monitor**: https://uptimerobot.com/

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] Infrastructure provisioned and configured
- [ ] DNS records configured and propagated
- [ ] SSL certificates obtained and installed
- [ ] All environment variables set
- [ ] Secrets generated and secured
- [ ] Database schema created
- [ ] Third-party services configured

### Deployment

- [ ] Code deployed to production server
- [ ] Docker images built
- [ ] All services started successfully
- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Rate limiting functional
- [ ] Backups configured and tested

### Post-Deployment

- [ ] Application accessible via HTTPS
- [ ] Authentication working
- [ ] Database queries functional
- [ ] Redis caching working
- [ ] Email sending functional
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team notified

---

## Emergency Contacts

**System Administrator**: admin@example.com
**Database Administrator**: dba@example.com
**Security Team**: security@example.com
**On-Call**: oncall@example.com

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-03 | Initial production deployment setup |

---

**Last Updated**: 2025-10-03
**Maintained By**: DevOps Team
**Review Schedule**: Quarterly

---

## Next Steps

1. **Deploy to production** following this guide
2. **Test all functionality** thoroughly
3. **Monitor for 24-48 hours** closely
4. **Perform load testing** to verify capacity
5. **Document any issues** and resolutions
6. **Train team** on operations procedures
7. **Schedule regular reviews** of security and performance

**Good luck with your deployment!**
