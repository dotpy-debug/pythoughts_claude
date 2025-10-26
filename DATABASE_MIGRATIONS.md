# Database Migrations Guide

**Automatic Database Migration System**

This guide explains the automatic database migration system that runs on `npm start` with comprehensive error handling and fallback mechanisms.

---

## 🎯 Overview

The Pythoughts platform includes an automatic database migration system that:

- ✅ **Runs automatically** on `npm start`
- ✅ **Non-interactive** - no manual intervention needed
- ✅ **Error handling** - retries and fallback mechanisms
- ✅ **Graceful degradation** - app starts even if migrations fail (development)
- ✅ **Connection retry logic** - attempts reconnection on failure
- ✅ **Dual-mode** - Drizzle ORM + raw SQL fallback

---

## 📦 Setup

### 1. Install Dependencies

All required dependencies are already installed:

```bash
# Already included:
# - drizzle-orm
# - drizzle-kit
# - postgres
```

### 2. Configure Environment Variables

Create `.env.local` file in project root:

```env
# Required: Database Connection String
DATABASE_URL=postgresql://postgres:your_password@db.your-project.supabase.co:5432/postgres

# Alternative formats:
# Local PostgreSQL:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/pythoughts

# Supabase (pooler connection):
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true

# Supabase (direct connection):
# DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Getting DATABASE_URL from Supabase:**

1. Go to Supabase Dashboard → Project Settings → Database
2. Under "Connection string", copy the "URI" format
3. Replace `[YOUR-PASSWORD]` with your actual database password
4. Use port `5432` for direct connection (recommended for migrations)

### 3. Verify Setup

Test database connection:

```bash
npm run db:migrate
```

You should see:

```
=== Database Migration Runner ===

ℹ Step 1: Getting database connection string...
✓ Database URL configured
ℹ Step 2: Testing database connection...
→ Testing database connection (attempt 1/3)...
✓ Database connection successful
...
✓ Migration completed successfully
```

---

## 🚀 Usage

### Automatic Migration on Start

Simply run:

```bash
npm start
```

This will:
1. Run all pending database migrations
2. Start the Next.js production server
3. Continue even if migrations fail (with warning)

### Manual Migration Commands

```bash
# Run migrations manually
npm run db:migrate

# Push schema changes to database (Drizzle)
npm run db:push

# Generate migration files from schema
npm run db:generate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Drop migration (dangerous!)
npm run db:drop
```

---

## 📁 Directory Structure

```
pythoughts_claude-main/
├── supabase/
│   └── migrations/           # SQL migration files
│       ├── 20251026_collaboration_documents.sql
│       └── ...
├── scripts/
│   ├── migrate-database.ts  # Migration runner
│   └── start-with-migrations.ts  # Start wrapper
├── drizzle.config.ts         # Drizzle configuration
└── .env.local                # Environment variables (create this)
```

---

## 🔧 How It Works

### Migration Flow

```
npm start
    │
    ├─> Run migrations (tsx scripts/start-with-migrations.ts)
    │   │
    │   ├─> Step 1: Get DATABASE_URL
    │   │   ├─> Check environment variables
    │   │   └─> Throw error if not found
    │   │
    │   ├─> Step 2: Test connection (3 retries)
    │   │   ├─> Attempt 1: Connect
    │   │   ├─> Attempt 2: Connect (wait 2s)
    │   │   └─> Attempt 3: Connect (wait 2s)
    │   │
    │   ├─> Step 3: Locate migrations directory
    │   │   ├─> Check supabase/migrations
    │   │   ├─> Check drizzle/migrations
    │   │   └─> Check migrations/
    │   │
    │   ├─> Step 4: Run migrations
    │   │   ├─> Try: Drizzle ORM migrate
    │   │   └─> Fallback: Raw SQL migrations
    │   │
    │   └─> Step 5: Verify schema
    │       └─> SELECT 1 test query
    │
    └─> Start Next.js server (next start)
```

### Error Handling

**Connection Failures:**
- Retries 3 times with 2-second delay
- Exits with error if all retries fail
- Provides helpful error messages

**Migration Failures:**
- First attempts Drizzle ORM migration
- Falls back to raw SQL execution
- Logs detailed error information
- Continues to start app (development mode)

**Missing DATABASE_URL:**
- Checks multiple environment variable names:
  - `DATABASE_URL`
  - `VITE_SUPABASE_DB_URL`
  - `SUPABASE_DB_URL`
- Provides helpful setup instructions

---

## 🛠️ Troubleshooting

### Error: "DATABASE_URL is required"

**Problem:** Environment variable not set

**Solution:**
```bash
# Create .env.local file
echo "DATABASE_URL=postgresql://postgres:password@host:5432/database" > .env.local

# Restart the app
npm start
```

### Error: "ECONNREFUSED" or connection timeout

**Problem:** Database not accessible

**Solutions:**

1. **Check database is running:**
   ```bash
   # For Supabase: Check project status in dashboard
   ```

2. **Verify connection string:**
   - Correct host and port
   - Valid username and password
   - Database name is correct

3. **Check firewall/network:**
   - Supabase projects are publicly accessible
   - Local databases might need firewall rules

4. **Use direct connection (not pooler):**
   ```env
   # Use port 5432 for migrations (not 6543)
   DATABASE_URL=postgresql://...@db.xxx.supabase.co:5432/postgres
   ```

### Error: "Migration file not found" or "Syntax error"

**Problem:** Migration file has SQL syntax errors

**Solutions:**

1. **Check migration file:**
   ```bash
   # Find the problematic migration
   ls -la supabase/migrations/
   ```

2. **Test SQL manually:**
   - Copy SQL from migration file
   - Run in Supabase SQL Editor
   - Fix any syntax errors

3. **Skip problematic migration:**
   ```bash
   # Temporarily rename file
   mv supabase/migrations/problematic.sql supabase/migrations/problematic.sql.bak
   ```

### Warning: "Migrations failed or were skipped"

**Problem:** Migrations failed but app started anyway

**Impact:** Database schema might be out of date

**Solutions:**

1. **Run migrations manually:**
   ```bash
   npm run db:migrate
   ```

2. **Check logs for specific error:**
   - Look for red error messages
   - Follow troubleshooting steps above

3. **Push schema directly (development only):**
   ```bash
   npm run db:push
   ```

---

## 📊 Migration Scripts Reference

### `npm start`
Runs migrations then starts Next.js server

**Use when:**
- Starting production server
- Deploying to production
- Running in Docker container

**Behavior:**
- Attempts migrations
- Warns if failed
- Starts server anyway

### `npm run db:migrate`
Runs all pending migrations

**Use when:**
- Manually running migrations
- Troubleshooting migration issues
- Testing new migrations

**Behavior:**
- Stops on first error
- Shows detailed error messages
- Exits with error code

### `npm run db:push`
Pushes Drizzle schema directly to database

**Use when:**
- Development schema changes
- Prototyping new features
- Quick schema updates

**⚠️ Warning:**
- Skips migration history
- Can cause data loss
- Not recommended for production

### `npm run db:generate`
Generates migration files from Drizzle schema

**Use when:**
- Creating new migrations
- Schema changes in `src/db/schema.ts`

**Workflow:**
```bash
# 1. Modify schema
vim src/db/schema.ts

# 2. Generate migration
npm run db:generate

# 3. Review migration
cat supabase/migrations/0001_xxx.sql

# 4. Apply migration
npm run db:migrate
```

### `npm run db:studio`
Opens Drizzle Studio (database GUI)

**Use when:**
- Browsing database tables
- Running manual queries
- Inspecting data

**Access:**
- Opens at http://localhost:4983
- Shows all tables and relationships
- Allows data editing

---

## 🔒 Security Best Practices

### Never Commit Credentials

```bash
# .gitignore already includes:
.env
.env.local
.env.production
```

### Use Environment Variables

```env
# ✅ Good: Use environment variables
DATABASE_URL=postgresql://...

# ❌ Bad: Hard-code in files
const url = 'postgresql://postgres:password123@...'
```

### Rotate Database Passwords

```bash
# After rotating password in Supabase:
# 1. Update .env.local
# 2. Restart app
npm start
```

### Use Read-Only for Queries

```typescript
// For SELECT queries, use pooler (read-only)
const queryUrl = process.env.VITE_SUPABASE_URL;

// For migrations, use direct connection
const migrateUrl = process.env.DATABASE_URL;
```

---

## 🚢 Deployment

### Vercel

1. Add environment variable in Vercel dashboard:
   ```
   DATABASE_URL=postgresql://...
   ```

2. Deploy:
   ```bash
   git push origin main
   # Vercel will run migrations automatically
   ```

### Docker

```dockerfile
# Dockerfile
ENV DATABASE_URL=postgresql://...
CMD ["npm", "start"]
# Migrations run automatically before server starts
```

### Railway / Render / Fly.io

1. Set DATABASE_URL environment variable in dashboard
2. Deploy with build command:
   ```bash
   npm run build:all
   ```
3. Start command:
   ```bash
   npm start
   ```

---

## 📈 Best Practices

### Migration Naming

```bash
# Good naming:
20251026_add_collaboration_table.sql
20251027_add_user_indexes.sql

# Bad naming:
migration1.sql
update.sql
```

### Migration Content

```sql
-- ✅ Good: Idempotent migrations
CREATE TABLE IF NOT EXISTS users (...);
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ❌ Bad: Non-idempotent
CREATE TABLE users (...);  -- Fails if table exists
```

### Testing Migrations

```bash
# 1. Test on development database first
DATABASE_URL=postgresql://localhost:5432/dev npm run db:migrate

# 2. Review changes
npm run db:studio

# 3. If good, apply to staging
DATABASE_URL=$STAGING_DB_URL npm run db:migrate

# 4. Finally, production
DATABASE_URL=$PRODUCTION_DB_URL npm run db:migrate
```

---

## 🎯 Success Checklist

Before deploying:

- [ ] `DATABASE_URL` set in environment
- [ ] All migrations tested locally
- [ ] `npm start` runs without errors
- [ ] Database schema verified in Drizzle Studio
- [ ] Backup taken (production)
- [ ] Rollback plan documented

---

**Created:** October 26, 2025
**Last Updated:** October 26, 2025
**Status:** ✅ Production Ready
