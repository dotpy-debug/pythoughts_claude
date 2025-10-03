# Security Best Practices for Pythoughts Platform

## Overview

This document outlines security best practices for developing and maintaining the Pythoughts platform. All developers must follow these guidelines to ensure the platform remains secure against modern threats.

---

## Table of Contents

1. [Input Validation & Sanitization](#1-input-validation--sanitization)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Database Security](#3-database-security)
4. [API Security](#4-api-security)
5. [Client-Side Security](#5-client-side-security)
6. [Error Handling](#6-error-handling)
7. [Environment & Secrets Management](#7-environment--secrets-management)
8. [Security Testing](#8-security-testing)
9. [Incident Response](#9-incident-response)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Input Validation & Sanitization

### Rule: Never Trust User Input

All user input must be validated and sanitized before use, storage, or display.

### Required Validations

#### User Registration
```typescript
import { isValidEmail, isValidUsername, isStrongPassword } from '../utils/security';

// Email validation
if (!isValidEmail(email)) {
  throw new Error('Invalid email format');
}

// Username validation (3-20 chars, alphanumeric + _ -)
if (!isValidUsername(username)) {
  throw new Error('Username must be 3-20 characters (letters, numbers, _, - only)');
}

// Password strength (production)
if (isProduction() && !isStrongPassword(password)) {
  throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
}
```

#### Content Submission
```typescript
import { sanitizeInput, sanitizeURL, isValidContentLength } from '../utils/security';

// Validate length
if (!isValidContentLength(title, 1, 200)) {
  throw new Error('Title must be between 1 and 200 characters');
}

if (!isValidContentLength(content, 1, 50000)) {
  throw new Error('Content must be between 1 and 50000 characters');
}

// Sanitize title (HTML entity encoding)
const sanitizedTitle = sanitizeInput(title);

// Sanitize URLs (prevent javascript:, data: URIs)
const sanitizedImageUrl = sanitizeURL(imageUrl);
```

#### URL Validation
```typescript
import { sanitizeURL } from '../utils/security';

// ALWAYS sanitize URLs before rendering
const safeUrl = sanitizeURL(userProvidedUrl);

// For images
<img src={sanitizeURL(post.image_url)} alt={post.title} />

// For avatars
<img src={sanitizeURL(profile.avatar_url)} alt={profile.username} />
```

### DO NOT

❌ Never directly render user-provided URLs without sanitization
❌ Never use `dangerouslySetInnerHTML` without sanitization
❌ Never trust client-side validation alone
❌ Never skip validation because "it's already in the database"

---

## 2. Authentication & Authorization

### Password Requirements

**Development:** Minimum 6 characters
**Production:** Minimum 8 characters with complexity:
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

```typescript
import { isStrongPassword } from '../utils/security';

if (isProduction() && !isStrongPassword(password)) {
  setError('Password must meet complexity requirements');
  return;
}
```

### Session Management

#### Best Practices
- ✅ Use Supabase session management (handles securely)
- ✅ Implement session timeouts (7 days default)
- ✅ Validate session on sensitive operations
- ✅ Clear sessions on logout
- ❌ Never store tokens in localStorage (Supabase uses httpOnly cookies)

```typescript
// Check authentication before sensitive operations
if (!user) {
  throw new Error('Authentication required');
}

// Validate session is not expired
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('Session expired');
}
```

### Authorization Checks

#### Always Check User Permissions

```typescript
// Before updating/deleting content
if (post.author_id !== user.id) {
  throw new Error('Unauthorized: You can only edit your own posts');
}

// Before accessing sensitive data
if (!user) {
  throw new Error('Authentication required');
}
```

#### Rely on RLS Policies

- ✅ Database RLS policies are the primary authorization layer
- ✅ Client-side checks are for UX only (hide buttons, etc.)
- ✅ Never disable RLS
- ❌ Never bypass RLS with service role key client-side

---

## 3. Database Security

### Row Level Security (RLS)

#### ALWAYS Enabled
```sql
ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;
```

#### Policy Template
```sql
-- SELECT policy (read)
CREATE POLICY "policy_name_select"
  ON tablename FOR SELECT
  TO authenticated, anon
  USING (condition);

-- INSERT policy (create)
CREATE POLICY "policy_name_insert"
  ON tablename FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id_column);

-- UPDATE policy (modify)
CREATE POLICY "policy_name_update"
  ON tablename FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id_column)
  WITH CHECK (auth.uid() = user_id_column);

-- DELETE policy (remove)
CREATE POLICY "policy_name_delete"
  ON tablename FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id_column);
```

### SQL Injection Prevention

#### ALWAYS Use Supabase Query Builder
```typescript
// ✅ CORRECT - Parameterized query
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('author_id', userId);

// ❌ WRONG - Never construct raw SQL with user input
// (Supabase doesn't support this, but as a principle)
const query = `SELECT * FROM posts WHERE author_id = '${userId}'`;
```

#### Validate UUIDs
```typescript
import { isValidUUID } from '../utils/security';

if (!isValidUUID(postId)) {
  throw new Error('Invalid ID format');
}

const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('id', postId)
  .single();
```

### Database Constraints

#### Add Validation at Database Level
```sql
-- Email format
ALTER TABLE profiles
  ADD CONSTRAINT valid_email
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$');

-- Username format
ALTER TABLE profiles
  ADD CONSTRAINT valid_username
  CHECK (username ~ '^[a-zA-Z0-9_-]{3,20}$');

-- URL format
ALTER TABLE posts
  ADD CONSTRAINT valid_image_url
  CHECK (image_url = '' OR image_url ~ '^https?://');
```

---

## 4. API Security

### Rate Limiting

#### ALWAYS Implement Rate Limiting

```typescript
import { checkRateLimit } from '../utils/security';

const handleLogin = async (email: string, password: string) => {
  // Rate limit: 5 attempts per minute per email
  const rateLimit = checkRateLimit(`login:${email}`, 5, 60000);

  if (!rateLimit.allowed) {
    const waitSeconds = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    throw new Error(`Too many login attempts. Please try again in ${waitSeconds} seconds`);
  }

  // Proceed with login...
};
```

#### Rate Limit Guidelines

| Operation | Max Requests | Window |
|-----------|-------------|--------|
| Login/Signup | 5 | 1 minute |
| Post Creation | 10 | 10 minutes |
| Comment Creation | 30 | 1 minute |
| Vote/Reaction | 100 | 1 minute |
| API Calls (general) | 100 | 1 minute |

### Request Validation

#### Validate All Parameters
```typescript
// Validate required fields
if (!title || !content) {
  throw new Error('Missing required fields');
}

// Validate ID formats
if (!isValidUUID(postId)) {
  throw new Error('Invalid post ID');
}

// Validate enums
const validStatuses = ['todo', 'in_progress', 'completed', 'archived'];
if (!validStatuses.includes(status)) {
  throw new Error('Invalid status');
}
```

---

## 5. Client-Side Security

### Content Security Policy (CSP)

CSP is configured in `vite.config.ts` - **DO NOT** weaken these policies without security review.

```typescript
// ✅ ALLOWED
<script src="/app.js"></script>
<img src="https://images.example.com/photo.jpg" />

// ❌ BLOCKED by CSP
<script>alert('XSS')</script>
<img src="javascript:alert('XSS')" />
```

### XSS Prevention

#### Markdown Rendering
```typescript
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

// ✅ ALWAYS use rehype-sanitize
<ReactMarkdown rehypePlugins={[rehypeSanitize]}>
  {userContent}
</ReactMarkdown>

// ❌ NEVER render raw HTML
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

#### Image/Avatar URLs
```typescript
import { sanitizeURL } from '../utils/security';

// ✅ ALWAYS sanitize URLs
<img src={sanitizeURL(url)} alt="User content" />

// ❌ NEVER trust user URLs
<img src={userProvidedUrl} alt="Unsafe" />
```

### State Management

- ✅ Never store sensitive data in React state
- ✅ Clear sensitive data on unmount
- ✅ Use Supabase session management
- ❌ Never store passwords, tokens, or secrets in state

---

## 6. Error Handling

### Error Message Sanitization

```typescript
import { sanitizeErrorMessage, isSafeError } from '../utils/security';

try {
  await someOperation();
} catch (error) {
  // Determine if error is safe to display
  const message = isSafeError(error)
    ? error.message
    : sanitizeErrorMessage(error);

  setError(message);

  // Log full error details (server-side or development only)
  if (isDevelopment()) {
    console.error('Operation failed:', error);
  }
}
```

### Safe Error Messages

#### ✅ SAFE (User-Friendly)
- "Invalid email or password"
- "Username already exists"
- "Session expired"
- "Operation failed. Please try again"

#### ❌ UNSAFE (Information Disclosure)
- "PostgreSQL connection failed at 192.168.1.1:5432"
- "User not found in database table 'profiles'"
- "SQL error: duplicate key value violates unique constraint"
- Stack traces with file paths

### Development vs Production

```typescript
import { isProduction, isDevelopment } from '../lib/env';

const handleError = (error: Error) => {
  if (isProduction()) {
    // Production: Generic message + logging
    setError('An error occurred. Please try again later.');
    logToErrorService(error);
  } else {
    // Development: Detailed error for debugging
    setError(error.message);
    console.error('Detailed error:', error);
  }
};
```

---

## 7. Environment & Secrets Management

### Environment Variables

#### Rules
1. ✅ **NEVER** commit `.env` file to git
2. ✅ **ALWAYS** use `.env.example` for documentation
3. ✅ **VALIDATE** all env vars on startup (done in `src/lib/env.ts`)
4. ❌ **NEVER** expose secrets with `VITE_` prefix

#### Client vs Server Variables

```typescript
// ✅ CLIENT-SAFE (VITE_ prefix)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (public anon key)

// ❌ SERVER-ONLY (no VITE_ prefix)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  // NEVER expose to client!
REDIS_URL=redis://...              // Server-side only
DATABASE_URL=postgresql://...       // Server-side only
```

### Secret Rotation

#### Regular Rotation Schedule
- API keys: Every 90 days
- Database passwords: Every 180 days
- JWT secrets: Every 365 days
- Service account keys: Every 90 days

#### Immediate Rotation If:
- Secret exposed in code/logs
- Employee departure (service accounts)
- Suspected compromise
- Failed security audit

### .gitignore Verification

```bash
# Verify .env is gitignored
git check-ignore .env
# Should output: .env

# Check for accidentally committed secrets
git log --all --full-history --source --decorate -- .env
# Should be empty
```

---

## 8. Security Testing

### Pre-Deployment Security Checklist

#### Code Review
- [ ] All user inputs validated and sanitized
- [ ] No secrets in code or committed
- [ ] RLS policies reviewed and tested
- [ ] Rate limiting implemented
- [ ] Error messages sanitized
- [ ] URLs validated before rendering
- [ ] Security headers configured

#### Manual Testing
- [ ] Test XSS with `<script>alert('XSS')</script>` in all inputs
- [ ] Test SQL injection with `' OR '1'='1` (should be blocked)
- [ ] Test rate limiting by rapid requests
- [ ] Test authorization bypass attempts
- [ ] Test session expiry handling
- [ ] Test password requirements
- [ ] Test error message disclosure

#### Automated Testing

```bash
# Dependency audit
npm audit
npm audit fix

# Security linting
npm run lint

# Type checking
npm run typecheck
```

### Penetration Testing

Before production launch:
1. Test authentication bypass
2. Test authorization bypass (RLS policies)
3. Test input validation bypasses
4. Test rate limiting effectiveness
5. Test error handling for information disclosure
6. Test session management

---

## 9. Incident Response

### Security Incident Severity

| Level | Definition | Response Time |
|-------|-----------|---------------|
| P0 - Critical | Active exploit, data breach | Immediate |
| P1 - High | Vulnerability with high risk | 24 hours |
| P2 - Medium | Vulnerability with medium risk | 1 week |
| P3 - Low | Vulnerability with low risk | 1 month |

### Incident Response Steps

1. **Detect**
   - Monitor error logs
   - Watch for unusual activity
   - Review security alerts

2. **Assess**
   - Determine severity
   - Identify affected systems
   - Estimate scope

3. **Contain**
   - Disable compromised accounts
   - Revoke exposed credentials
   - Block malicious IPs

4. **Remediate**
   - Patch vulnerabilities
   - Rotate affected secrets
   - Update security controls

5. **Recover**
   - Restore from backups if needed
   - Verify system integrity
   - Resume normal operations

6. **Document**
   - Write incident report
   - Update security procedures
   - Conduct lessons learned

### Emergency Contacts

```
Security Lead: [security@pythoughts.com]
Database Admin: [dba@pythoughts.com]
Infrastructure: [ops@pythoughts.com]
```

---

## 10. Deployment Checklist

### Before Production Deployment

#### Environment
- [ ] All required env vars configured
- [ ] Secrets rotated (not using dev secrets)
- [ ] Environment validation passes
- [ ] Production mode enabled

#### Security
- [ ] Security headers enabled (verified in `vite.config.ts`)
- [ ] HTTPS enforced
- [ ] HSTS enabled
- [ ] Rate limiting enabled
- [ ] RLS policies reviewed
- [ ] Input validation implemented
- [ ] Error sanitization enabled

#### Database
- [ ] RLS enabled on all tables
- [ ] Database backups configured
- [ ] Database encryption at rest enabled
- [ ] Connection pooling configured
- [ ] Indexes optimized

#### Authentication
- [ ] Strong password requirements enabled
- [ ] Session timeout configured
- [ ] 2FA available (Better-Auth ready)
- [ ] Account lockout policy active
- [ ] Email verification required

#### Monitoring
- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Security event logging enabled
- [ ] Uptime monitoring configured
- [ ] Alert thresholds set

#### Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Data export functionality available
- [ ] Account deletion available

### Post-Deployment Verification

```bash
# Test security headers
curl -I https://pythoughts.com

# Expected headers:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...
```

---

## Quick Reference

### Security Utilities

All security utilities are in `src/utils/security.ts`:

```typescript
// Input sanitization
sanitizeInput(input: string)
sanitizeURL(url: string)

// Validation
isValidEmail(email: string)
isValidUsername(username: string)
isValidPassword(password: string)
isStrongPassword(password: string)
isValidContentLength(content: string, min: number, max: number)
isValidUUID(uuid: string)

// Rate limiting
checkRateLimit(identifier: string, maxRequests: number, windowMs: number)

// Error handling
sanitizeErrorMessage(error: any)
isSafeError(error: any)

// Privacy
maskEmail(email: string)
removeSensitiveData(obj: any)
```

### Environment Helpers

All environment helpers are in `src/lib/env.ts`:

```typescript
isProduction()  // true if NODE_ENV === 'production'
isDevelopment() // true if NODE_ENV === 'development'
isTest()        // true if NODE_ENV === 'test'
```

### Security Headers

Security headers configuration in `src/utils/securityHeaders.ts`:

```typescript
import { securityHeaders, getCORSHeaders } from '../utils/securityHeaders';
```

---

## Training & Resources

### Required Reading
- [ ] OWASP Top 10 2021
- [ ] Supabase RLS Documentation
- [ ] Better-Auth Security Guide
- [ ] This Security Best Practices document

### External Resources
- OWASP: https://owasp.org/www-project-top-ten/
- Supabase Security: https://supabase.com/docs/guides/auth
- Better-Auth: https://better-auth.com
- NIST Password Guidelines: https://pages.nist.gov/800-63-3/

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. Email security@pythoughts.com with details
3. Include steps to reproduce
4. Wait for acknowledgment before disclosure
5. Allow reasonable time for fix

---

**Document Version:** 1.0
**Last Updated:** October 3, 2025
**Next Review:** January 3, 2026
