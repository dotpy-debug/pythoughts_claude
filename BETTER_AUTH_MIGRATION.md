# Better-Auth Migration Guide

This guide provides step-by-step instructions for migrating from Supabase Auth to Better-Auth with Resend email provider integration for the Pythoughts platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup Verification](#database-setup-verification)
4. [Environment Configuration](#environment-configuration)
5. [Migration Steps](#migration-steps)
6. [Testing Checklist](#testing-checklist)
7. [Rollback Procedure](#rollback-procedure)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Why Migrate to Better-Auth?

- **Better Developer Experience**: More flexible and customizable than Supabase Auth
- **Email Provider Control**: Direct integration with Resend for branded emails
- **Enhanced Security**: Built-in 2FA support and rate limiting
- **Cost Optimization**: Reduced dependency on Supabase-specific features
- **Session Management**: Fine-grained control over session expiry and refresh

### Migration Strategy

This migration uses a **gradual rollout** approach:

1. Keep Supabase Auth as fallback during transition
2. Run both auth systems in parallel initially
3. Gradually migrate users to Better-Auth
4. Monitor for issues before full cutover
5. Deprecate Supabase Auth after successful migration

### Timeline

- **Phase 1**: Setup and Testing (1-2 days)
- **Phase 2**: Parallel Operation (1 week)
- **Phase 3**: Gradual Migration (2-3 weeks)
- **Phase 4**: Full Cutover (1 day)
- **Phase 5**: Deprecation (1 week monitoring)

---

## Prerequisites

### Required Services

1. **Supabase Account** (existing)
   - PostgreSQL database access
   - Existing `profiles` table
   - Migration applied: `20251003042251_add_tasks_and_better_auth_tables.sql`

2. **Resend Account** (new)
   - Sign up at [resend.com](https://resend.com)
   - Verify your sending domain
   - Generate API key from [resend.com/api-keys](https://resend.com/api-keys)

3. **Production Domain** (if deploying)
   - SSL certificate configured
   - Domain verified for email sending

### Required Knowledge

- Basic PostgreSQL/SQL
- React hooks and state management
- Environment variable configuration
- Email template design (optional)

---

## Database Setup Verification

### Step 1: Verify Existing Tables

Connect to your Supabase PostgreSQL database and verify the following tables exist:

```sql
-- Check profiles table (existing Supabase auth users)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid)
-- username (text)
-- email (text)
-- bio (text)
-- avatar_url (text)
-- email_verified (boolean)
-- created_at (timestamptz)
-- updated_at (timestamptz)
```

### Step 2: Verify Better-Auth Tables

Run this query to verify Better-Auth migration was applied:

```sql
-- Check better_auth_sessions table
SELECT * FROM better_auth_sessions LIMIT 0;

-- Check better_auth_accounts table
SELECT * FROM better_auth_accounts LIMIT 0;
```

**If these tables don't exist**, run the migration:

```bash
# Navigate to postgres migrations directory
cd postgres/migrations

# Apply the migration (using psql or Supabase dashboard SQL editor)
psql -h <your-supabase-host> -U postgres -d postgres -f 20251003042251_add_tasks_and_better_auth_tables.sql
```

### Step 3: Verify Row-Level Security (RLS)

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('better_auth_sessions', 'better_auth_accounts');

-- Expected output: both tables should have rowsecurity = true
```

### Step 4: Verify Indexes

```sql
-- Check indexes for performance
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('better_auth_sessions', 'better_auth_accounts')
ORDER BY tablename, indexname;

-- Expected indexes:
-- idx_auth_sessions_user
-- idx_auth_sessions_token
-- idx_auth_sessions_expires
-- idx_auth_accounts_user
-- idx_auth_accounts_provider
```

---

## Environment Configuration

### Step 1: Set Up Resend

1. **Sign up for Resend**:
   - Visit [resend.com](https://resend.com)
   - Create account
   - Verify email address

2. **Add and Verify Domain**:
   ```bash
   # Add your domain in Resend dashboard
   # Navigate to: Domains > Add Domain
   # Add: pythoughts.com (or your domain)

   # Add DNS records provided by Resend:
   # - SPF record
   # - DKIM record
   # - DMARC record (recommended)
   ```

3. **Generate API Key**:
   ```bash
   # Navigate to: API Keys > Create API Key
   # Name: "Pythoughts Production"
   # Permissions: Full access (or Email sending only)
   # Copy the key (starts with re_)
   ```

### Step 2: Generate Better-Auth Secret

```bash
# Generate a secure random secret (32+ characters)
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using online generator
# Visit: https://generate-secret.vercel.app/32
```

### Step 3: Update Environment Variables

**For Development (`.env`):**

```bash
# Existing Supabase configuration (keep these)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key

# Redis (optional, defaults to localhost)
VITE_REDIS_URL=redis://localhost:6379

# Better-Auth configuration (add these)
VITE_BETTER_AUTH_URL=http://localhost:5173
VITE_BETTER_AUTH_SECRET=your-generated-secret-from-step-2

# Resend email configuration (add this)
VITE_RESEND_API_KEY=re_your_resend_api_key_here

# Feature flags (optional)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

**For Production:**

```bash
# Use environment variable management service (Vercel, Railway, etc.)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_REDIS_URL=rediss://your-production-redis-url
VITE_BETTER_AUTH_URL=https://pythoughts.com
VITE_BETTER_AUTH_SECRET=your-production-secret-different-from-dev
VITE_RESEND_API_KEY=re_your_production_resend_key
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### Step 4: Verify Configuration

```bash
# Start development server
npm run dev

# Check console for initialization messages:
# ✓ Environment variables validated successfully
# ✓ Better-Auth initialized
#   - baseURL: http://localhost:5173
#   - emailEnabled: true
#   - twoFactorEnabled: true
#   - sessionExpiry: 7 days
```

---

## Migration Steps

### Phase 1: Setup and Testing (Days 1-2)

#### Day 1: Initial Setup

1. **Install dependencies** (already done):
   ```bash
   npm install better-auth resend
   ```

2. **Create auth configuration files**:
   - `src/lib/auth.ts` (server-side config)
   - `src/lib/auth-client.ts` (client-side utilities)

3. **Test database connection**:
   ```bash
   # Run a test query to verify Better-Auth can connect
   npm run dev
   # Check browser console for any database connection errors
   ```

4. **Test email sending**:
   ```typescript
   // Create test file: src/test-email.ts
   import { sendWelcomeEmail } from './lib/auth';

   sendWelcomeEmail('your-email@example.com', 'TestUser')
     .then(() => console.log('Email sent successfully'))
     .catch(err => console.error('Email failed:', err));
   ```

#### Day 2: Integration Testing

1. **Create test user with Better-Auth**:
   ```typescript
   import { signUp } from './lib/auth-client';

   // Test signup flow
   await signUp({
     email: 'test@example.com',
     password: 'SecurePassword123!',
     username: 'testuser'
   });
   ```

2. **Verify database records**:
   ```sql
   -- Check that profile was created
   SELECT * FROM profiles WHERE email = 'test@example.com';

   -- Check that session was created
   SELECT * FROM better_auth_sessions
   WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@example.com');

   -- Check that account link was created
   SELECT * FROM better_auth_accounts
   WHERE user_id = (SELECT id FROM profiles WHERE email = 'test@example.com');
   ```

3. **Test email verification**:
   - Check email inbox for OTP code
   - Verify email template rendering
   - Test OTP verification flow

4. **Test session management**:
   - Login and verify session creation
   - Check session cookie in browser
   - Test session expiry behavior

### Phase 2: Parallel Operation (Week 1)

#### Configure Dual Auth System

1. **Update authentication logic to support both systems**:
   ```typescript
   // src/lib/auth-adapter.ts
   export async function getUser(request: Request) {
     // Try Better-Auth first
     const betterAuthUser = await getBetterAuthUser(request);
     if (betterAuthUser) return betterAuthUser;

     // Fallback to Supabase Auth
     const supabaseUser = await getSupabaseUser(request);
     return supabaseUser;
   }
   ```

2. **Add feature flag for gradual rollout**:
   ```typescript
   // src/lib/feature-flags.ts
   export const USE_BETTER_AUTH = process.env.VITE_USE_BETTER_AUTH === 'true';

   // Usage in components:
   if (USE_BETTER_AUTH) {
     await signInWithBetterAuth(credentials);
   } else {
     await signInWithSupabase(credentials);
   }
   ```

3. **Monitor both systems**:
   - Log authentication attempts
   - Track success/failure rates
   - Monitor session creation
   - Compare performance metrics

#### Week 1 Monitoring Checklist

- [ ] Better-Auth signup works correctly
- [ ] Email verification OTPs delivered
- [ ] Sessions persist across page reloads
- [ ] Password reset flow works
- [ ] 2FA enrollment works
- [ ] No database errors in logs
- [ ] Email delivery rate > 95%
- [ ] Session creation latency < 200ms

### Phase 3: Gradual Migration (Weeks 2-4)

#### User Migration Strategy

**Option A: On-Login Migration (Recommended)**

```typescript
// When user logs in with Supabase Auth, migrate to Better-Auth
async function migrateUserOnLogin(supabaseUser: SupabaseUser, password: string) {
  // Check if already migrated
  const existingAccount = await db.query(
    'SELECT * FROM better_auth_accounts WHERE user_id = $1 AND provider = $2',
    [supabaseUser.id, 'email']
  );

  if (existingAccount.rows.length > 0) {
    // Already migrated, use Better-Auth
    return signInWithBetterAuth({ email: supabaseUser.email, password });
  }

  // Create Better-Auth account (password already verified by Supabase)
  await createBetterAuthAccount({
    userId: supabaseUser.id,
    email: supabaseUser.email,
    passwordHash: supabaseUser.encrypted_password, // Transfer existing hash
    emailVerified: supabaseUser.email_confirmed_at !== null,
  });

  // Future logins will use Better-Auth
  return signInWithBetterAuth({ email: supabaseUser.email, password });
}
```

**Option B: Batch Migration**

```sql
-- Migrate all existing users to Better-Auth accounts table
INSERT INTO better_auth_accounts (user_id, provider, provider_account_id)
SELECT
  id,
  'email' AS provider,
  email AS provider_account_id
FROM profiles
WHERE email IS NOT NULL
ON CONFLICT (provider, provider_account_id) DO NOTHING;

-- Note: Users will need to reset password on first Better-Auth login
-- since we cannot migrate encrypted passwords directly
```

#### Week 2-4 Migration Checklist

- [ ] Enable on-login migration
- [ ] Send email notifications to users about migration
- [ ] Monitor migration success rate
- [ ] Track users still on Supabase Auth
- [ ] Address migration failures
- [ ] Update documentation

### Phase 4: Full Cutover (Day 1)

1. **Verify migration completion**:
   ```sql
   -- Check percentage of users migrated
   SELECT
     COUNT(*) FILTER (WHERE ba.id IS NOT NULL) AS migrated_users,
     COUNT(*) AS total_users,
     ROUND(100.0 * COUNT(*) FILTER (WHERE ba.id IS NOT NULL) / COUNT(*), 2) AS migration_percentage
   FROM profiles p
   LEFT JOIN better_auth_accounts ba ON p.id = ba.user_id;

   -- Expected: migration_percentage > 95%
   ```

2. **Switch default auth provider**:
   ```typescript
   // Update feature flag
   VITE_USE_BETTER_AUTH=true
   ```

3. **Remove Supabase Auth fallback** (after 24 hours of monitoring):
   ```typescript
   // Remove fallback logic from auth-adapter.ts
   export async function getUser(request: Request) {
     return getBetterAuthUser(request); // Only Better-Auth
   }
   ```

4. **Update UI to remove Supabase Auth options**:
   - Remove "Continue with Supabase" buttons
   - Update login/signup forms to use Better-Auth only
   - Update documentation and help articles

### Phase 5: Deprecation (Week 1)

1. **Monitor for any Supabase Auth usage**:
   ```sql
   -- Check for any recent Supabase Auth sessions
   SELECT COUNT(*) FROM auth.sessions
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```

2. **Send final migration notice** to remaining users

3. **Disable Supabase Auth** (after 7 days):
   ```sql
   -- Disable Supabase Auth policies (keep as backup)
   -- Do NOT drop auth.users table yet
   ```

4. **Clean up legacy code**:
   - Remove Supabase Auth imports
   - Remove Supabase Auth components
   - Archive migration scripts

---

## Testing Checklist

### Functional Testing

#### Authentication Flows

- [ ] **Sign Up**
  - [ ] Valid email/password creates account
  - [ ] Duplicate email shows error
  - [ ] Weak password rejected
  - [ ] Profile created in `profiles` table
  - [ ] Account link created in `better_auth_accounts`
  - [ ] Verification email sent

- [ ] **Email Verification**
  - [ ] OTP email delivered
  - [ ] Email template renders correctly
  - [ ] Valid OTP verifies email
  - [ ] Invalid OTP shows error
  - [ ] Expired OTP shows error
  - [ ] Resend OTP works

- [ ] **Sign In**
  - [ ] Valid credentials log in
  - [ ] Invalid credentials show error
  - [ ] Unverified email shows warning
  - [ ] Session created in `better_auth_sessions`
  - [ ] Session cookie set correctly

- [ ] **Password Reset**
  - [ ] Reset email delivered
  - [ ] Reset link works
  - [ ] Password successfully updated
  - [ ] Can login with new password

- [ ] **Sign Out**
  - [ ] Session deleted from database
  - [ ] Session cookie cleared
  - [ ] Redirect to home page
  - [ ] Cannot access protected routes

#### Session Management

- [ ] **Session Persistence**
  - [ ] Session survives page reload
  - [ ] Session survives browser close/reopen (if "Remember me")
  - [ ] Session expires after 7 days
  - [ ] Expired session redirects to login

- [ ] **Session Security**
  - [ ] Session cookie is HttpOnly
  - [ ] Session cookie is Secure (production)
  - [ ] Session cookie is SameSite=Lax
  - [ ] CSRF protection enabled

#### Two-Factor Authentication

- [ ] **2FA Enrollment**
  - [ ] QR code displays
  - [ ] TOTP token validates
  - [ ] Backup codes generated
  - [ ] 2FA enabled in database

- [ ] **2FA Login**
  - [ ] Prompts for 2FA code after password
  - [ ] Valid TOTP code grants access
  - [ ] Invalid TOTP code shows error
  - [ ] Backup code works

### Email Testing

#### Email Delivery

- [ ] **Verification Email**
  - [ ] Delivered within 1 minute
  - [ ] Not marked as spam
  - [ ] Template renders on all clients (Gmail, Outlook, Apple Mail)
  - [ ] Links work correctly
  - [ ] OTP code visible and copyable

- [ ] **Password Reset Email**
  - [ ] Delivered within 1 minute
  - [ ] Reset link works
  - [ ] Link expires after 1 hour
  - [ ] Template renders correctly

- [ ] **Welcome Email**
  - [ ] Sent after verification
  - [ ] Template renders correctly
  - [ ] Links work correctly

#### Email Template Testing

Test on these email clients:
- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Outlook (web)
- [ ] Outlook (desktop)
- [ ] Apple Mail (iOS)
- [ ] Apple Mail (macOS)
- [ ] Thunderbird

### Database Testing

- [ ] **Table Structure**
  - [ ] All columns exist
  - [ ] Foreign keys work
  - [ ] Indexes created
  - [ ] RLS policies active

- [ ] **Data Integrity**
  - [ ] No orphaned sessions
  - [ ] No orphaned accounts
  - [ ] User IDs match profiles
  - [ ] Timestamps accurate

### Performance Testing

- [ ] **Response Times**
  - [ ] Sign up < 500ms
  - [ ] Sign in < 300ms
  - [ ] Session validation < 100ms
  - [ ] Email sending < 2s

- [ ] **Load Testing**
  - [ ] 100 concurrent signups
  - [ ] 500 concurrent logins
  - [ ] 1000 concurrent session validations
  - [ ] No database connection errors

### Security Testing

- [ ] **Password Security**
  - [ ] Minimum 8 characters enforced
  - [ ] Password hashed (not plaintext)
  - [ ] Password not exposed in logs
  - [ ] Password not exposed in API responses

- [ ] **Session Security**
  - [ ] Cannot steal session token
  - [ ] Cannot forge session token
  - [ ] Cannot reuse expired session
  - [ ] Cannot access other user's session

- [ ] **Rate Limiting**
  - [ ] Login attempts limited (10/min)
  - [ ] Signup attempts limited (5/min)
  - [ ] Email sending limited (3/min)
  - [ ] Password reset limited (3/min)

---

## Rollback Procedure

If critical issues are discovered, follow this procedure to rollback:

### Immediate Rollback (Production Issue)

1. **Switch back to Supabase Auth**:
   ```bash
   # Update environment variable
   VITE_USE_BETTER_AUTH=false

   # Redeploy application
   git revert <better-auth-commit>
   git push
   ```

2. **Verify Supabase Auth works**:
   - Test login with existing users
   - Check session creation
   - Monitor error rates

3. **Disable Better-Auth endpoints**:
   ```typescript
   // Temporarily disable Better-Auth routes
   if (request.url.includes('/api/auth/better-auth')) {
     return new Response('Temporarily disabled', { status: 503 });
   }
   ```

### Database Rollback

```sql
-- Do NOT delete data during rollback
-- Keep better_auth_* tables for future retry

-- Disable Better-Auth RLS policies temporarily
ALTER TABLE better_auth_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE better_auth_accounts DISABLE ROW LEVEL SECURITY;

-- Re-enable after investigation
```

### Gradual Rollback (Non-Critical Issues)

1. **Reduce Better-Auth traffic**:
   ```typescript
   // Roll back from 100% to 50%
   const USE_BETTER_AUTH = Math.random() < 0.5;
   ```

2. **Fix issues while on Supabase Auth**

3. **Resume migration after fixes validated**

---

## Troubleshooting

### Common Issues

#### Issue: "Email verification not working"

**Symptoms**: OTP emails not delivered

**Solutions**:
1. Check Resend API key is valid
2. Verify domain DNS records
3. Check spam folder
4. Review Resend dashboard logs
5. Verify email template syntax

```bash
# Test email sending directly
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer ${VITE_RESEND_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "noreply@pythoughts.com",
    "to": "your-email@example.com",
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

#### Issue: "Session not persisting"

**Symptoms**: User logged out on page reload

**Solutions**:
1. Check session cookie settings
2. Verify `credentials: 'include'` in fetch
3. Check browser cookie settings
4. Verify CORS configuration
5. Check session expiry time

```typescript
// Debug session storage
console.log('Session cookie:', document.cookie);
console.log('Session storage:', sessionStorage.getItem('better-auth-session'));
```

#### Issue: "Database connection errors"

**Symptoms**: Auth operations fail with DB errors

**Solutions**:
1. Verify Supabase connection string
2. Check database connection pool
3. Verify RLS policies
4. Check table permissions
5. Review PostgreSQL logs

```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Check for blocking queries
SELECT * FROM pg_stat_activity WHERE wait_event IS NOT NULL;
```

#### Issue: "Migration incomplete"

**Symptoms**: Some users still on Supabase Auth

**Solutions**:
1. Send migration reminder emails
2. Force migration on next login
3. Provide manual migration tool
4. Contact unmigrated users directly

```sql
-- Find unmigrated users
SELECT p.email, p.username, p.created_at
FROM profiles p
LEFT JOIN better_auth_accounts ba ON p.id = ba.user_id
WHERE ba.id IS NULL
ORDER BY p.created_at DESC;
```

### Getting Help

- **Better-Auth Docs**: [better-auth.com/docs](https://better-auth.com/docs)
- **Resend Docs**: [resend.com/docs](https://resend.com/docs)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)
- **GitHub Issues**: Create issue with `[better-auth]` tag

---

## Success Criteria

Migration is considered successful when:

- [ ] 95%+ of users migrated to Better-Auth
- [ ] Email delivery rate > 98%
- [ ] Authentication response time < 300ms average
- [ ] Zero authentication errors for 72 hours
- [ ] Session persistence working correctly
- [ ] 2FA enrollment rate > 10%
- [ ] No database performance degradation
- [ ] No user-reported authentication issues

---

## Post-Migration Monitoring

### Week 1 Metrics

Track these metrics daily:

- Authentication success rate
- Email delivery rate
- Session creation time
- Database query performance
- Error rate by endpoint
- User feedback/complaints

### Week 2-4 Metrics

Track these metrics weekly:

- User retention rate
- 2FA adoption rate
- Password reset frequency
- Session expiry patterns
- Email engagement rates

---

## Next Steps

After successful migration:

1. **Optimize email templates** based on engagement data
2. **Implement additional auth features**:
   - Social login (Google, GitHub)
   - Magic link authentication
   - Passkey/WebAuthn support
3. **Enhance security**:
   - Add device fingerprinting
   - Implement anomaly detection
   - Add login notifications
4. **Improve UX**:
   - Add session management UI
   - Add connected devices view
   - Add security activity log

---

## Documentation

Keep these documents updated:

- `README.md` - Update authentication section
- `SECURITY_BEST_PRACTICES.md` - Add Better-Auth security guidelines
- API documentation - Update auth endpoints
- User guides - Update signup/login instructions

---

**Migration Version**: 1.0.0
**Last Updated**: 2025-10-03
**Maintained By**: Pythoughts Platform Team
