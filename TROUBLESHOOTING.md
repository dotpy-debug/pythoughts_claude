# Troubleshooting Guide

## npm Install Issues

### Error: `@webassembly/sharp` not found in cache

**Symptoms:**

```bash
npm error code EIO
npm error EIO: '@webassembly/sharp@0.34.4' not found in cache
```

**Cause:** Corrupted npm cache or Next.js SWC WebAssembly cache.

**Solution:**

**Option 1: Quick Fix**

```bash
npm run fix:install
```

**Option 2: Manual Steps**

```bash
# Clean project files
rm -rf node_modules .next dist .cache .turbo

# Clean global caches
rm -rf ~/.npm ~/.cache/next-swc ~/.cache/turbo

# Clean npm cache
npm cache clean --force

# Reinstall
npm install
```

**Option 3: Nuclear Option (if above fails)**

```bash
# Remove package-lock.json
rm package-lock.json

# Clean everything
npm run clean:all
npm cache clean --force

# Reinstall
npm install
```

---

## Next.js Turbopack Issues

### Error: `turbo.createProject` is not supported by WASM bindings

**Symptoms:**

```bash
Error: `turbo.createProject` is not supported by the wasm bindings.
Skipping creating a lockfile because we're using WASM bindings
```

**Cause:** Next.js 16 Turbopack doesn't fully support WebAssembly bindings yet.

**Solution:**

Turbopack is **already disabled** in this project. The error appears because Next.js still tries to download WASM bindings even with `--turbo=false`.

**Fix 1: Ensure you're using the correct script**

```bash
# Use this (has --turbo=false)
npm run dev:next

# NOT this (will try to use Turbopack)
npx next dev
```

**Fix 2: Patch Next.js lockfile**
If you see the warning about missing SWC dependencies:

```bash
# Next.js will patch the lockfile automatically
npm install
```

**Fix 3: Use Node.js 22+ (recommended)**

```bash
node --version  # Should be v22.21.1 or higher
```

Older Node versions may have incomplete WebAssembly support.

---

## Environment Variable Issues

### Error: `supabaseUrl is required`

**Symptoms:**

```bash
Error: supabaseUrl is required.
Error: Failed to collect page data for /blogs
```

**Cause:** Missing required environment variables for Supabase.

**Solution:**

1. **Create .env.local file:**

```bash
cp .env.local.example .env.local
```

2. **Add your Supabase credentials:**

```bash
# Get these from: Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Restart dev server:**

```bash
npm run dev:next
```

**Note:** `.env.local` is gitignored - never commit it!

---

## Build Issues

### TypeScript Errors During Pre-commit

**Symptoms:**

```bash
husky - pre-commit hook failed (code 2)
error TS2769: No overload matches this call
```

**Cause:** TypeScript errors in your code.

**Solution:**

1. **Check TypeScript errors:**

```bash
npm run typecheck
```

2. **Fix errors** or **skip pre-commit hook temporarily:**

```bash
git commit --no-verify -m "your message"
```

**Note:** Only use `--no-verify` for pre-existing errors, not new ones you introduce!

---

### Vite Build Succeeds but Next.js Fails

**Cause:** Next.js requires environment variables at build time, Vite doesn't.

**Solution:**

Ensure `.env.local` or `.env.production` has all required variables:

```bash
# Required for Next.js builds
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## Database Migration Issues

### Migrations Don't Run Automatically

**Symptoms:**

```bash
Error: relation "posts" does not exist
```

**Cause:** Database schema not created.

**Solution:**

1. **Check DATABASE_URL is set:**

```bash
echo $DATABASE_URL
```

2. **Run migrations manually:**

```bash
npm run migrate
```

3. **Check migration status:**

```bash
npm run migrate:status
```

**Note:** Migrations run automatically with `npm start` in production.

---

## Cleanup Scripts Reference

| Script                | Description                                     |
| --------------------- | ----------------------------------------------- |
| `npm run clean`       | Remove project build files                      |
| `npm run clean:cache` | Remove global npm/Next.js caches                |
| `npm run clean:all`   | Clean project + caches                          |
| `npm run reinstall`   | Clean project and reinstall                     |
| `npm run fix:install` | Nuclear option - clean everything and reinstall |

---

## Getting Help

1. Check this troubleshooting guide first
2. Search existing issues: https://github.com/your-repo/issues
3. Check Next.js docs: https://nextjs.org/docs
4. Check Supabase docs: https://supabase.com/docs

## Common Issues Checklist

Before reporting an issue, verify:

- [ ] Node.js version is 22.21.1 or higher (`node --version`)
- [ ] npm cache is clean (`npm cache verify`)
- [ ] `.env.local` exists with correct Supabase credentials
- [ ] `node_modules` is fresh (`npm run reinstall`)
- [ ] No conflicting processes on ports 3000, 5173, 3001
- [ ] Database is accessible (check Supabase dashboard)
- [ ] All environment variables are set correctly

---

## Still Having Issues?

If none of the above solutions work:

1. **Capture full error log:**

```bash
npm install > install.log 2>&1
# Share install.log
```

2. **Check versions:**

```bash
node --version
npm --version
cat package.json | grep "next\|vite\|react"
```

3. **Report the issue** with:
   - Full error message
   - Steps to reproduce
   - Environment info (OS, Node version)
   - What you've already tried
