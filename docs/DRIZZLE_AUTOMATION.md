# Drizzle Schema Automation Guide

## Overview

This system **completely eliminates** the need for manual `drizzle-kit push` operations. All schema changes are handled automatically with production-grade safety features.

## 🚀 Automatic Schema Synchronization

### How It Works

1. **You modify `src/db/schema.ts`** - Define your schema using Drizzle ORM
2. **System detects changes** - Automatically generates migrations
3. **Migrations applied safely** - With backups, transactions, and rollback
4. **Zero manual intervention** - Everything is automatic

### Development Workflow

```bash
# 1. Edit src/db/schema.ts
# 2. Run automatic sync
npm run db:sync

# That's it! The system automatically:
# - Generates migrations from schema changes
# - Applies migrations safely
# - Verifies everything is in sync
```

### Production Workflow

```bash
# 1. Edit src/db/schema.ts
# 2. Commit and push
git add src/db/schema.ts
git commit -m "feat: update schema"
git push

# CI/CD automatically:
# - Generates migrations
# - Runs production migrations with backups
# - Verifies deployment
```

## 📋 Available Commands

### Development
```bash
npm run db:sync              # Full sync (generate + migrate)
npm run db:sync:check        # Check for schema drift (no changes)
npm run db:generate          # Generate migrations only
npm run db:migrate           # Run migrations only
```

### Production
```bash
npm run db:sync:production  # Production sync (with backups & rollback)
npm run db:migrate:production # Production migrations only
```

### Manual Override (if needed)
```bash
npm run db:push              # Direct push (development only, not recommended)
npm run db:auto-push         # Intelligent auto-push (chooses strategy)
```

## 🎯 Schema Definition

### Example Schema File (`src/db/schema.ts`)

```typescript
import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique(),
  username: text('username').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  authorId: uuid('author_id').references(() => profiles.id).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### Making Changes

1. **Edit `src/db/schema.ts`**
2. **Run sync command**
3. **Done!** - Migrations generated and applied automatically

## 🔄 CI/CD Integration

### Automatic Triggers

The system automatically syncs when:
- Schema file (`src/db/schema.ts`) changes are pushed
- Drizzle config (`drizzle.config.ts`) changes
- Manual workflow trigger

### Workflow Steps

1. **Schema Change Detection** - Detects changes to schema files
2. **Migration Generation** - Generates migrations automatically
3. **Validation** - Validates migrations before applying
4. **Staging Sync** - Applies to staging on `develop` branch
5. **Production Sync** - Applies to production on `main` branch
6. **Verification** - Health checks verify successful sync

## 🛡️ Safety Features

### Development Mode
- Fast iteration with direct push option
- Schema validation
- Error handling

### Production Mode
- **Automatic backups** before migrations
- **Transaction-based** execution
- **Automatic rollback** on failure
- **Health verification** after sync
- **No direct push** allowed

## 📊 Schema Drift Detection

The system can detect when your schema file is out of sync with the database:

```bash
npm run db:sync:check
```

This will:
- Compare schema.ts with database
- Report any differences
- Provide recommendations
- No changes are made

## 🔍 Troubleshooting

### Schema Not Found

If you see "Schema file not found":
1. Create `src/db/schema.ts`
2. Add your Drizzle schema definitions
3. Run sync again

### Migration Conflicts

If migrations conflict:
1. Check migration files in `supabase/migrations/`
2. Review generated migrations
3. Manually resolve conflicts if needed
4. Re-run sync

### Production Push Attempted

If you try to push in production:
- System automatically uses migration-based approach
- Direct push is disabled for safety
- All changes go through migration pipeline

## ✅ Best Practices

### 1. Always Use Sync Commands
```bash
# ✅ Good
npm run db:sync

# ❌ Bad (manual push)
npm run db:push
```

### 2. Test in Development First
```bash
# 1. Make schema changes
# 2. Test locally
npm run db:sync

# 3. Commit and push
git commit -m "feat: update schema"
git push
```

### 3. Review Generated Migrations
```bash
# After generation, review migrations
ls -la supabase/migrations/
cat supabase/migrations/[latest].sql
```

### 4. Use Production Sync for Production
```bash
# ✅ Production
npm run db:sync:production

# ❌ Never in production
npm run db:push
```

## 🚨 Important Notes

1. **Never manually run `drizzle-kit push` in production**
2. **Always use sync commands** - They handle everything automatically
3. **Review generated migrations** before deploying
4. **Test schema changes** in development first
5. **Use production sync** for production environments

## 📚 Related Documentation

- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [Migration Guide](MIGRATION_GUIDE.md)
- [Production Automation Summary](PRODUCTION_AUTOMATION_SUMMARY.md)

## 🎉 Benefits

### Before (Manual)
1. Edit schema.ts
2. Run `drizzle-kit generate`
3. Review migrations
4. Run `drizzle-kit push` or `npm run db:migrate`
5. Hope nothing breaks
6. Manual rollback if issues

### After (Automatic)
1. Edit schema.ts
2. Run `npm run db:sync`
3. Done! ✅

**Everything is automatic, safe, and production-ready!**

---

**Status**: ✅ Fully Automated
**Last Updated**: 2024-01-01
**Version**: 1.0.0

