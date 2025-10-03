# Pythoughts Platform - Security Hardening Checklist

## Overview

This document provides a comprehensive security hardening checklist for production deployment of the Pythoughts platform. Follow all items to ensure maximum security posture.

---

## Table of Contents

1. [Environment Variables Security](#environment-variables-security)
2. [Secrets Management](#secrets-management)
3. [HTTPS and SSL/TLS](#https-and-ssltls)
4. [Rate Limiting](#rate-limiting)
5. [CORS Configuration](#cors-configuration)
6. [Security Headers](#security-headers)
7. [Database Security](#database-security)
8. [Redis Security](#redis-security)
9. [Container Security](#container-security)
10. [Network Security](#network-security)
11. [Authentication Security](#authentication-security)
12. [Input Validation](#input-validation)
13. [Logging and Monitoring](#logging-and-monitoring)
14. [Incident Response](#incident-response)

---

## Environment Variables Security

### Configuration Files

- [ ] **Never commit `.env.production` to version control**
  ```bash
  # Add to .gitignore
  echo ".env.production" >> .gitignore
  echo "secrets/*" >> .gitignore
  ```

- [ ] **Use environment-specific configurations**
  - Development: `.env`
  - Staging: `.env.staging`
  - Production: `.env.production`

- [ ] **Validate all environment variables on startup**
  - Check `src/lib/env.ts` for validation logic
  - Fail fast if required variables are missing
  - Validate format (URLs, API keys, etc.)

### Variable Naming

- [ ] **Prefix public variables with `VITE_`**
  - Only `VITE_*` variables are exposed to frontend
  - Server-only secrets must NOT have `VITE_` prefix

- [ ] **Use descriptive, uppercase names**
  - Good: `DATABASE_URL`, `REDIS_PASSWORD`
  - Bad: `db`, `pwd`, `secret`

### Access Control

- [ ] **Restrict file permissions**
  ```bash
  chmod 600 .env.production
  chmod 700 secrets/
  chmod 600 secrets/*
  ```

- [ ] **Set proper ownership**
  ```bash
  chown deploy:deploy .env.production
  chown -R deploy:deploy secrets/
  ```

---

## Secrets Management

### Generation

- [ ] **Generate strong, random secrets**
  ```bash
  # Generate 32-byte random secret
  openssl rand -base64 32

  # Generate 64-byte random secret
  openssl rand -base64 64

  # Generate UUID
  uuidgen
  ```

- [ ] **Use different secrets per environment**
  - Never reuse production secrets in staging/dev
  - Rotate secrets regularly (every 90 days minimum)

### Storage

- [ ] **Use Docker Secrets for production**
  ```bash
  # Create secret files
  echo "$(openssl rand -base64 32)" > secrets/db_password.txt
  echo "$(openssl rand -base64 32)" > secrets/redis_password.txt
  echo "$(openssl rand -base64 32)" > secrets/auth_secret.txt

  # Secure permissions
  chmod 600 secrets/*.txt
  ```

- [ ] **Consider external secrets management**
  - AWS Secrets Manager
  - HashiCorp Vault
  - Azure Key Vault
  - Google Secret Manager

### Rotation

- [ ] **Implement secret rotation policy**
  ```bash
  # Secret rotation schedule
  # - Database passwords: Every 90 days
  # - API keys: Every 90 days
  # - JWT secrets: Every 180 days
  # - SSL certificates: Auto-renewed by Certbot
  ```

- [ ] **Document rotation procedures**
  - Create rollback plan before rotation
  - Test in staging first
  - Perform during maintenance window
  - Verify all services after rotation

---

## HTTPS and SSL/TLS

### Certificate Management

- [ ] **Use valid SSL certificates**
  - Let's Encrypt for free certificates
  - Commercial CA for extended validation
  - Wildcard certificates for subdomains

- [ ] **Enable HTTPS for all traffic**
  ```nginx
  # Force HTTPS redirect
  server {
    listen 80;
    return 301 https://$host$request_uri;
  }
  ```

- [ ] **Configure auto-renewal**
  ```bash
  # Certbot auto-renewal
  sudo certbot renew --dry-run

  # Add to crontab
  0 0,12 * * * certbot renew --quiet --post-hook "docker compose restart nginx"
  ```

### SSL/TLS Configuration

- [ ] **Use TLS 1.2 and 1.3 only**
  ```nginx
  ssl_protocols TLSv1.2 TLSv1.3;
  ```

- [ ] **Use strong cipher suites**
  ```nginx
  ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';
  ssl_prefer_server_ciphers off;
  ```

- [ ] **Enable OCSP stapling**
  ```nginx
  ssl_stapling on;
  ssl_stapling_verify on;
  ```

- [ ] **Generate strong DH parameters**
  ```bash
  openssl dhparam -out certs/dhparam.pem 4096
  ```

### Testing

- [ ] **Achieve A+ rating on SSL Labs**
  - Test at: https://www.ssllabs.com/ssltest/
  - Fix all vulnerabilities
  - Enable HSTS

- [ ] **Test certificate chain**
  ```bash
  openssl s_client -connect your-domain.com:443 -servername your-domain.com
  ```

---

## Rate Limiting

### Nginx Rate Limiting

- [ ] **Configure rate limit zones**
  ```nginx
  # General traffic
  limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;

  # API endpoints
  limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

  # Authentication endpoints
  limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
  ```

- [ ] **Apply rate limits to endpoints**
  ```nginx
  location /api/ {
    limit_req zone=api burst=50 nodelay;
  }

  location ~ ^/(login|register) {
    limit_req zone=login burst=5 nodelay;
  }
  ```

- [ ] **Configure connection limiting**
  ```nginx
  limit_conn_zone $binary_remote_addr zone=addr:10m;
  limit_conn addr 10;
  ```

### Application-Level Rate Limiting

- [ ] **Implement Redis-based rate limiting**
  ```typescript
  // Example rate limiter
  async function checkRateLimit(userId: string, limit: number, window: number): Promise<boolean> {
    const key = `ratelimit:${userId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, window);
    }

    return current <= limit;
  }
  ```

- [ ] **Monitor rate limit violations**
  ```bash
  # Check Nginx rate limit logs
  grep "limiting requests" /var/log/nginx/error.log
  ```

---

## CORS Configuration

### Strict Origin Policy

- [ ] **Define allowed origins explicitly**
  ```typescript
  const ALLOWED_ORIGINS = [
    'https://pythoughts.com',
    'https://www.pythoughts.com',
    'https://app.pythoughts.com',
  ];
  ```

- [ ] **Never use wildcard (*) in production**
  ```typescript
  // BAD - Do not use in production
  Access-Control-Allow-Origin: *

  // GOOD - Specific origins only
  Access-Control-Allow-Origin: https://pythoughts.com
  ```

- [ ] **Validate origin before responding**
  ```typescript
  function validateOrigin(origin: string): boolean {
    return ALLOWED_ORIGINS.includes(origin);
  }
  ```

### CORS Headers

- [ ] **Configure allowed methods**
  ```nginx
  add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
  ```

- [ ] **Configure allowed headers**
  ```nginx
  add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
  ```

- [ ] **Configure credentials policy**
  ```nginx
  add_header Access-Control-Allow-Credentials "true" always;
  ```

---

## Security Headers

### Essential Headers

- [ ] **HTTP Strict Transport Security (HSTS)**
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  ```

- [ ] **X-Frame-Options**
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN" always;
  ```

- [ ] **X-Content-Type-Options**
  ```nginx
  add_header X-Content-Type-Options "nosniff" always;
  ```

- [ ] **X-XSS-Protection**
  ```nginx
  add_header X-XSS-Protection "1; mode=block" always;
  ```

- [ ] **Referrer-Policy**
  ```nginx
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  ```

### Content Security Policy (CSP)

- [ ] **Implement strict CSP**
  ```nginx
  add_header Content-Security-Policy "
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com data:;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  " always;
  ```

- [ ] **Test CSP configuration**
  - Use CSP Evaluator: https://csp-evaluator.withgoogle.com/
  - Monitor CSP violations in browser console
  - Implement CSP reporting endpoint

### Permissions Policy

- [ ] **Restrict browser features**
  ```nginx
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" always;
  ```

### Testing

- [ ] **Achieve A+ rating on Security Headers**
  - Test at: https://securityheaders.com/
  - Fix all missing headers
  - Remove insecure headers

---

## Database Security

### PostgreSQL Security

- [ ] **Use strong passwords**
  ```bash
  # Generate strong password
  openssl rand -base64 32
  ```

- [ ] **Enable SSL/TLS connections**
  ```
  DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
  ```

- [ ] **Limit network access**
  ```bash
  # PostgreSQL pg_hba.conf
  # Only allow connections from application network
  host all all 172.21.0.0/24 md5
  ```

- [ ] **Use connection pooling**
  ```typescript
  const pool = new Pool({
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  ```

- [ ] **Enable audit logging**
  ```sql
  -- Enable PostgreSQL audit logging
  ALTER SYSTEM SET log_connections = 'on';
  ALTER SYSTEM SET log_disconnections = 'on';
  ALTER SYSTEM SET log_statement = 'ddl';
  SELECT pg_reload_conf();
  ```

### Row Level Security (RLS)

- [ ] **Enable RLS on all tables**
  ```sql
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
  ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **Create restrictive policies**
  ```sql
  -- Users can only read their own data
  CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

  -- Users can only update their own data
  CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);
  ```

### Database Backups

- [ ] **Implement automated backups**
  ```bash
  # Daily backups at 2 AM
  0 2 * * * cd /opt/pythoughts && docker compose -f docker-compose.prod.yml --profile backup run --rm db-backup
  ```

- [ ] **Encrypt backups**
  ```bash
  # Encrypt backup with GPG
  pg_dump -Fc database | gpg --symmetric --cipher-algo AES256 > backup.dump.gpg
  ```

- [ ] **Test backup restoration**
  ```bash
  # Test restore in staging environment
  pg_restore -d staging_db backup.dump
  ```

---

## Redis Security

### Redis Configuration

- [ ] **Require password authentication**
  ```bash
  requirepass $(cat /run/secrets/redis_password)
  ```

- [ ] **Disable dangerous commands**
  ```
  rename-command FLUSHDB ""
  rename-command FLUSHALL ""
  rename-command KEYS ""
  rename-command CONFIG ""
  ```

- [ ] **Bind to internal network only**
  ```
  bind 127.0.0.1 172.21.0.1
  ```

- [ ] **Enable TLS/SSL**
  ```
  tls-port 6379
  port 0
  tls-cert-file /etc/redis/redis.crt
  tls-key-file /etc/redis/redis.key
  tls-ca-cert-file /etc/redis/ca.crt
  ```

### Redis ACL

- [ ] **Create restricted user accounts**
  ```bash
  # Create read-only user
  ACL SETUSER readonly on >password ~* -@all +@read

  # Create app user with limited commands
  ACL SETUSER app on >password ~* -@all +@read +@write +@string +@hash +@set +@list
  ```

### Redis Persistence

- [ ] **Configure appropriate persistence**
  ```
  # RDB snapshots
  save 900 1
  save 300 10
  save 60 10000

  # AOF for durability
  appendonly yes
  appendfsync everysec
  ```

---

## Container Security

### Docker Security

- [ ] **Run containers as non-root user**
  ```dockerfile
  # Create non-root user
  RUN addgroup -g 1001 -S nodejs && \
      adduser -S nodejs -u 1001

  USER nodejs
  ```

- [ ] **Use read-only root filesystem**
  ```yaml
  read_only: true
  tmpfs:
    - /tmp
    - /app/.cache
  ```

- [ ] **Drop unnecessary capabilities**
  ```yaml
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE
  ```

- [ ] **Scan images for vulnerabilities**
  ```bash
  # Scan with Docker Scout
  docker scout cves pythoughts:latest

  # Scan with Trivy
  trivy image pythoughts:latest
  ```

### Image Security

- [ ] **Use official base images**
  ```dockerfile
  FROM node:20-alpine
  # Not: FROM node:latest
  ```

- [ ] **Pin specific versions**
  ```dockerfile
  FROM node:20.11.0-alpine3.19
  FROM postgres:16.2-alpine
  FROM redis:7.2.4-alpine
  ```

- [ ] **Multi-stage builds**
  ```dockerfile
  # Build stage
  FROM node:20-alpine AS builder
  # ... build steps

  # Production stage
  FROM node:20-alpine AS production
  COPY --from=builder /app/dist ./dist
  ```

- [ ] **Minimize image layers**
  ```dockerfile
  # Combine RUN commands
  RUN apk add --no-cache curl wget && \
      npm ci --production && \
      apk del curl wget
  ```

### Resource Limits

- [ ] **Set CPU limits**
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '2.0'
      reservations:
        cpus: '1.0'
  ```

- [ ] **Set memory limits**
  ```yaml
  deploy:
    resources:
      limits:
        memory: 1G
      reservations:
        memory: 512M
  ```

---

## Network Security

### Firewall Configuration

- [ ] **Enable UFW firewall**
  ```bash
  sudo ufw enable
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  ```

- [ ] **Allow only necessary ports**
  ```bash
  sudo ufw allow ssh
  sudo ufw allow http
  sudo ufw allow https
  sudo ufw status numbered
  ```

- [ ] **Restrict SSH access**
  ```bash
  # Allow SSH from specific IPs only
  sudo ufw delete allow ssh
  sudo ufw allow from YOUR_IP_ADDRESS to any port 22
  ```

### Docker Networks

- [ ] **Use internal networks**
  ```yaml
  networks:
    backend:
      internal: true  # No external access
  ```

- [ ] **Segment networks**
  ```yaml
  services:
    app:
      networks:
        - frontend
        - backend
    postgres:
      networks:
        - backend  # Only backend access
  ```

### SSH Hardening

- [ ] **Disable root login**
  ```
  # /etc/ssh/sshd_config
  PermitRootLogin no
  ```

- [ ] **Use SSH keys only**
  ```
  PasswordAuthentication no
  PubkeyAuthentication yes
  ```

- [ ] **Change default SSH port** (optional)
  ```
  Port 2222
  ```

- [ ] **Implement fail2ban**
  ```bash
  sudo apt install fail2ban
  sudo systemctl enable fail2ban
  ```

---

## Authentication Security

### Password Policy

- [ ] **Enforce strong passwords**
  - Minimum 12 characters
  - Require uppercase, lowercase, numbers, symbols
  - Check against common passwords
  - Implement password strength meter

- [ ] **Implement account lockout**
  - Lock after 5 failed attempts
  - Lockout duration: 15 minutes
  - Send email notification

### Session Management

- [ ] **Use secure session configuration**
  ```typescript
  const session = {
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: true, // HTTPS only
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };
  ```

- [ ] **Implement session timeout**
  - Idle timeout: 30 minutes
  - Absolute timeout: 24 hours
  - Prompt before timeout

### Multi-Factor Authentication

- [ ] **Implement 2FA/MFA**
  - TOTP (Time-based One-Time Password)
  - SMS verification (backup)
  - Recovery codes

- [ ] **Enforce MFA for admin accounts**

### Token Security

- [ ] **Use short-lived JWTs**
  - Access tokens: 15 minutes
  - Refresh tokens: 7 days
  - Rotate refresh tokens

- [ ] **Implement token revocation**
  - Store revoked tokens in Redis
  - Check on each request
  - Clear expired entries

---

## Input Validation

### Server-Side Validation

- [ ] **Validate all user inputs**
  ```typescript
  import { z } from 'zod';

  const userSchema = z.object({
    email: z.string().email(),
    password: z.string().min(12),
    username: z.string().regex(/^[a-zA-Z0-9_]{3,20}$/),
  });
  ```

- [ ] **Sanitize HTML content**
  ```typescript
  import DOMPurify from 'isomorphic-dompurify';

  const sanitized = DOMPurify.sanitize(userInput);
  ```

- [ ] **Prevent SQL injection**
  - Use parameterized queries
  - Never concatenate user input
  - Use ORM/query builder

- [ ] **Prevent XSS**
  - Escape output
  - Use Content Security Policy
  - Validate input

### File Upload Security

- [ ] **Validate file types**
  ```typescript
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type');
  }
  ```

- [ ] **Limit file size**
  ```nginx
  client_max_body_size 10m;
  ```

- [ ] **Scan uploaded files**
  - Use ClamAV or similar
  - Check file signatures
  - Store in isolated location

---

## Logging and Monitoring

### Application Logging

- [ ] **Log security events**
  - Authentication attempts
  - Authorization failures
  - Suspicious activities
  - Rate limit violations

- [ ] **Use structured logging**
  ```typescript
  logger.info('User login', {
    userId: user.id,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  ```

- [ ] **Never log sensitive data**
  - Passwords
  - API keys
  - Credit card numbers
  - Personal information

### Security Monitoring

- [ ] **Implement intrusion detection**
  ```bash
  # Install AIDE (Advanced Intrusion Detection Environment)
  sudo apt install aide
  sudo aideinit
  ```

- [ ] **Monitor log files**
  ```bash
  # Setup logwatch
  sudo apt install logwatch
  sudo logwatch --detail High --mailto admin@example.com --range today
  ```

- [ ] **Setup alerting**
  - Error rate threshold
  - Failed login attempts
  - Unusual traffic patterns
  - Resource exhaustion

### External Monitoring

- [ ] **Use uptime monitoring**
  - UptimeRobot
  - Pingdom
  - StatusCake

- [ ] **Use APM (Application Performance Monitoring)**
  - Sentry for errors
  - DataDog for metrics
  - New Relic for performance

---

## Incident Response

### Preparation

- [ ] **Create incident response plan**
  - Define roles and responsibilities
  - Document escalation procedures
  - Prepare communication templates

- [ ] **Setup emergency contacts**
  - On-call rotation
  - Emergency contact list
  - External support contacts

### Detection

- [ ] **Setup alerting for security events**
  - Failed authentication attempts
  - Unauthorized access attempts
  - Unusual traffic patterns
  - System anomalies

### Response Procedures

- [ ] **Document response procedures**
  1. Identify and assess incident
  2. Contain the threat
  3. Eradicate the cause
  4. Recover systems
  5. Post-incident review

- [ ] **Implement emergency shutoff**
  ```bash
  # Emergency maintenance mode
  docker compose -f docker-compose.prod.yml down
  ```

---

## Security Checklist Summary

### Critical (Must Have)

- [ ] All secrets generated and secured
- [ ] HTTPS enabled with valid certificate
- [ ] Environment variables validated
- [ ] Database passwords strong and unique
- [ ] Redis password authentication enabled
- [ ] Firewall configured and enabled
- [ ] SSH key-based authentication only
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Backups automated and tested

### Important (Should Have)

- [ ] CORS properly configured
- [ ] Content Security Policy implemented
- [ ] Row Level Security enabled
- [ ] Container security hardened
- [ ] Logging and monitoring enabled
- [ ] Fail2ban configured
- [ ] SSL/TLS A+ rating achieved
- [ ] Secret rotation policy defined
- [ ] Incident response plan created

### Recommended (Nice to Have)

- [ ] Multi-factor authentication enabled
- [ ] Intrusion detection system
- [ ] External secrets management
- [ ] Security scanning automated
- [ ] Penetration testing completed
- [ ] Security audit performed
- [ ] Bug bounty program

---

**Document Version:** 1.0.0
**Last Updated:** 2025-10-03
**Review Schedule:** Quarterly
