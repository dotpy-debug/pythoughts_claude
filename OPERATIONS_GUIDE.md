# Pythoughts Platform - Operations Quick Reference

This document provides quick reference commands for common operational tasks.

---

## Daily Operations

### Check Service Status

```bash
# All services
docker compose -f docker-compose.prod.yml ps

# Health check
curl https://your-domain.com/health

# Resource usage
docker stats --no-stream
```

### View Logs

```bash
# All services (last 100 lines)
docker compose -f docker-compose.prod.yml logs --tail=100

# Follow logs in real-time
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f app

# Filter by time
docker compose -f docker-compose.prod.yml logs --since 1h

# Filter by keyword
docker compose -f docker-compose.prod.yml logs | grep ERROR
```

---

## Service Management

### Start/Stop Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# Restart all services
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart app

# Stop specific service
docker compose -f docker-compose.prod.yml stop app

# Start specific service
docker compose -f docker-compose.prod.yml start app
```

### Update Application

```bash
# Pull latest code
cd /opt/pythoughts
git pull

# Backup database first
docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup

# Rebuild and update
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d --no-deps app

# Verify
curl https://your-domain.com/health
```

---

## Database Operations

### Database Access

```bash
# Connect to PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production

# Run SQL file
docker compose -f docker-compose.prod.yml exec -T postgres psql -U pythoughts -d pythoughts_production < query.sql

# Execute single query
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT COUNT(*) FROM profiles;"
```

### Database Maintenance

```bash
# Analyze database
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "ANALYZE;"

# Vacuum database
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "VACUUM ANALYZE;"

# Check database size
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT pg_size_pretty(pg_database_size('pythoughts_production'));"

# Check table sizes
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Database Statistics

```bash
# Active connections
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'pythoughts_production';"

# Slow queries
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Cache hit ratio
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT sum(heap_blks_read) as heap_read, sum(heap_blks_hit) as heap_hit, sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 as cache_hit_ratio FROM pg_statio_user_tables;"
```

---

## Redis Operations

### Redis Access

```bash
# Connect to Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt)

# Get server info
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) INFO

# Check memory usage
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) INFO memory

# Check stats
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) INFO stats
```

### Redis Maintenance

```bash
# Database size
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) DBSIZE

# Save snapshot
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) SAVE

# Background save
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) BGSAVE

# Check last save time
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) LASTSAVE

# Flush database (DANGEROUS!)
# docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) FLUSHDB
```

---

## Backup and Restore

### Manual Backups

```bash
# Database backup
docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup

# Redis backup
docker compose -f docker-compose.prod.yml --profile backup run --rm redis-backup

# Configuration backup
tar -czf backups/config_$(date +%Y%m%d).tar.gz \
  .env.production \
  docker-compose.prod.yml \
  docker/nginx/nginx.conf

# Secrets backup (encrypted)
tar -czf - secrets/ | gpg --symmetric --cipher-algo AES256 > backups/secrets_$(date +%Y%m%d).tar.gz.gpg
```

### Restore Operations

```bash
# Restore database
docker compose -f docker-compose.prod.yml stop app
gunzip -c backups/postgres/pythoughts_YYYYMMDD.backup.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
    -U pythoughts \
    -d pythoughts_production \
    --clean
docker compose -f docker-compose.prod.yml start app

# Restore Redis
docker compose -f docker-compose.prod.yml stop redis
gunzip -c backups/redis/redis_YYYYMMDD.rdb.gz > data/redis/dump.rdb
docker compose -f docker-compose.prod.yml start redis

# Verify restore
curl https://your-domain.com/health
```

---

## Monitoring

### System Resources

```bash
# CPU and memory usage
htop

# Disk usage
df -h
du -sh /opt/pythoughts/*

# Network connections
netstat -tulpn | grep LISTEN

# Docker resource usage
docker stats

# Docker disk usage
docker system df
```

### Application Metrics

```bash
# Response time test
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/

# Create curl-format.txt
cat > curl-format.txt <<'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
EOF

# Request count (from Nginx logs)
docker compose -f docker-compose.prod.yml exec nginx sh -c "cat /var/log/nginx/access.log | wc -l"

# Error count (last hour)
docker compose -f docker-compose.prod.yml logs --since 1h | grep -i error | wc -l
```

---

## Security Operations

### SSL Certificate Management

```bash
# Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Restart Nginx after renewal
docker compose -f docker-compose.prod.yml restart nginx
```

### Security Checks

```bash
# Check open ports
sudo ss -tulpn

# Check failed SSH attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Check Fail2ban status
sudo fail2ban-client status
sudo fail2ban-client status sshd

# UFW firewall status
sudo ufw status verbose

# Last logins
last -n 20

# Check for updates
sudo apt update
sudo apt list --upgradable
```

### Rate Limit Monitoring

```bash
# Check rate limit violations (Nginx)
docker compose -f docker-compose.prod.yml logs nginx | grep "limiting requests"

# Count rate limit violations by IP
docker compose -f docker-compose.prod.yml logs nginx | grep "limiting requests" | awk '{print $NF}' | sort | uniq -c | sort -rn

# Ban IP manually (if needed)
sudo ufw deny from <IP_ADDRESS>
```

---

## Troubleshooting

### Container Issues

```bash
# Inspect container
docker inspect pythoughts-app-prod

# Check container health
docker compose -f docker-compose.prod.yml ps

# Container resource usage
docker stats pythoughts-app-prod

# Restart unhealthy container
docker compose -f docker-compose.prod.yml restart app

# Rebuild container
docker compose -f docker-compose.prod.yml build --no-cache app
docker compose -f docker-compose.prod.yml up -d app
```

### Network Issues

```bash
# Test internal network
docker compose -f docker-compose.prod.yml exec app ping -c 3 postgres
docker compose -f docker-compose.prod.yml exec app ping -c 3 redis

# Test external connectivity
docker compose -f docker-compose.prod.yml exec app ping -c 3 google.com

# Check DNS resolution
docker compose -f docker-compose.prod.yml exec app nslookup your-domain.com

# List network interfaces
docker network ls
docker network inspect pythoughts-frontend
```

### Performance Issues

```bash
# Check system load
uptime
top -bn1 | head -20

# Check I/O wait
iostat -x 1 5

# Check disk I/O
iotop -o

# Check network I/O
iftop -i eth0

# Find large files
find /opt/pythoughts -type f -size +100M -exec ls -lh {} \;

# Check log sizes
du -sh /opt/pythoughts/logs/*
```

---

## Maintenance Tasks

### Cleanup Operations

```bash
# Clean Docker resources
docker system prune -a --volumes

# Clean old logs (older than 30 days)
find /opt/pythoughts/logs -type f -mtime +30 -delete

# Clean old backups (older than 30 days)
find /opt/pythoughts/backups -type f -mtime +30 -delete

# Vacuum PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "VACUUM FULL ANALYZE;"

# Optimize Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) BGREWRITEAOF
```

### Regular Maintenance Schedule

**Daily:**
- Check service health
- Review error logs
- Monitor disk space
- Verify backups completed

**Weekly:**
- Review security logs
- Check for application updates
- Analyze performance metrics
- Test backup restore (staging)

**Monthly:**
- Update dependencies
- Rotate secrets (if needed)
- Security audit
- Performance optimization review

**Quarterly:**
- Disaster recovery test
- Comprehensive security audit
- Capacity planning review
- Documentation update

---

## Emergency Procedures

### Emergency Restart

```bash
# Quick restart (all services)
docker compose -f docker-compose.prod.yml restart

# Force recreate (if restart doesn't help)
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Emergency Maintenance Mode

```bash
# Stop application (keep database and Redis running)
docker compose -f docker-compose.prod.yml stop app nginx

# Enable maintenance page (edit nginx.conf)
# Uncomment maintenance mode section and reload

# Restart when ready
docker compose -f docker-compose.prod.yml start app nginx
```

### Emergency Rollback

```bash
# Stop application
docker compose -f docker-compose.prod.yml stop app

# Revert to previous version
git log --oneline -n 10
git checkout <previous-commit>

# Restore previous database backup (if needed)
gunzip -c backups/postgres/pythoughts_YYYYMMDD.backup.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres pg_restore \
    -U pythoughts \
    -d pythoughts_production \
    --clean

# Rebuild and restart
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml start app

# Verify
curl https://your-domain.com/health
```

---

## Common Issues and Solutions

### Issue: Container won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs <service>

# Check environment variables
docker compose -f docker-compose.prod.yml config

# Verify secrets exist
ls -la secrets/

# Check ports
sudo netstat -tulpn | grep -E ':(80|443|5432|6379)'
```

### Issue: Database connection errors

```bash
# Verify database is running
docker compose -f docker-compose.prod.yml ps postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U pythoughts

# Check password
cat secrets/db_password.txt

# Verify connection string
docker compose -f docker-compose.prod.yml exec app printenv | grep DATABASE_URL
```

### Issue: High memory usage

```bash
# Check memory usage
free -h
docker stats

# Restart services to free memory
docker compose -f docker-compose.prod.yml restart

# Check for memory leaks in logs
docker compose -f docker-compose.prod.yml logs | grep -i "out of memory"

# Consider increasing server RAM or optimizing queries
```

### Issue: Slow response times

```bash
# Check database performance
docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis latency
docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt) --latency

# Check Nginx logs for slow requests
docker compose -f docker-compose.prod.yml logs nginx | grep -E 'request_time=[0-9]+\.'

# Monitor resource usage
htop
iotop
```

---

## Useful Aliases

Add these to `~/.bashrc` or `~/.zshrc`:

```bash
# Navigate to project
alias cdp='cd /opt/pythoughts'

# Docker Compose shortcuts
alias dcp='docker compose -f docker-compose.prod.yml'
alias dcup='docker compose -f docker-compose.prod.yml up -d'
alias dcdown='docker compose -f docker-compose.prod.yml down'
alias dcrestart='docker compose -f docker-compose.prod.yml restart'
alias dclogs='docker compose -f docker-compose.prod.yml logs -f'
alias dcps='docker compose -f docker-compose.prod.yml ps'

# Health check
alias health='curl https://your-domain.com/health'

# Backup
alias backup='docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup'

# Database access
alias dbshell='docker compose -f docker-compose.prod.yml exec postgres psql -U pythoughts -d pythoughts_production'

# Redis access
alias rediscli='docker compose -f docker-compose.prod.yml exec redis redis-cli -a $(cat secrets/redis_password.txt)'
```

---

## Contact Information

**System Administrator**: admin@example.com
**On-Call**: oncall@example.com
**Emergency Hotline**: +1-XXX-XXX-XXXX

---

**Last Updated**: 2025-10-03
**Document Version**: 1.0.0
