# Deploying Pythoughts on Bolt.new

This guide helps you deploy and run Pythoughts on the bolt.new platform, which has specific constraints around WebAssembly packages and system dependencies.

## Common Issues on Bolt.new

### 1. Sharp Package Installation Errors

**Error:**
```
npm error EIO: '@webassembly/sharp@0.34.4' not found in cache
```

**Solution:** Sharp is now marked as an optional dependency. The app will work without it by using unoptimized images.

### 2. Turbopack Not Supported Error

**Error:**
```
Error: `turbo.createProject` is not supported by the wasm bindings.
```

**Solution:** Always use the provided npm scripts that disable Turbopack, or use the bolt-specific commands.

### 3. SWC Dependencies Missing

**Error:**
```
⚠ Found lockfile missing swc dependencies, patching...
```

**Solution:** Run the bolt:fix script to clean and reinstall dependencies properly.

## Quick Fix (Recommended)

If you're experiencing installation or startup errors, run this single command:

```bash
npm run bolt:fix
```

This script will:
1. Clear npm cache
2. Remove old node_modules and lockfile
3. Reinstall dependencies with compatibility flags
4. Build the Next.js app

## Manual Setup Steps

If the quick fix doesn't work, follow these steps:

### Step 1: Clean Installation

```bash
# Clear npm cache
npm cache clean --force

# Remove old files
rm -rf node_modules package-lock.json .next

# Install with legacy peer deps
npm install --legacy-peer-deps --no-optional
```

### Step 2: Start Development Server

Use the bolt-specific dev command that disables image optimization and Turbopack:

```bash
npm run bolt:dev
```

**DO NOT** use `npx next dev` directly, as it will enable Turbopack by default.

### Step 3: For Production Builds

```bash
# Build the app
npm run bolt:build

# Start production server
npm run bolt:start
```

## Available Bolt.new Commands

| Command | Description |
|---------|-------------|
| `npm run bolt:fix` | Fix all common deployment issues |
| `npm run bolt:dev` | Start dev server (no Turbopack, no image optimization) |
| `npm run bolt:build` | Build for production |
| `npm run bolt:start` | Start production server |

## Environment Variables for Bolt.new

Create a `.env` file with these required variables:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgresql_connection_string

# Better Auth
BETTER_AUTH_SECRET=your_secret_key_min_32_chars
VITE_BETTER_AUTH_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourdomain.com

# Image Optimization (disabled for bolt.new)
NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION=true
```

## What's Different on Bolt.new?

### Image Optimization Disabled

Sharp (the image optimization library) requires native bindings that may not work on bolt.new. We've configured the app to work without it:

- Images are served unoptimized
- Still uses Next.js Image component for responsive sizing
- Faster builds without sharp compilation

### No Turbopack

Turbopack requires native bindings that aren't available in WASM environments. We use the traditional Next.js compiler instead:

- Slightly slower builds
- 100% compatibility
- No feature loss

### No Collaboration Server

The real-time collaboration server (Hocuspocus) requires WebSocket server capabilities:

- Vite mode (SPA) will work fine
- Tiptap editor works in single-user mode
- For multi-user editing, deploy to Vercel or your own server

## Troubleshooting

### Port Already in Use

Bolt.new uses port 3000 by default. If you see port conflicts:

```bash
# Kill the process on port 3000
pkill -f "next dev"

# Or use a different port
PORT=3001 npm run bolt:dev
```

### Database Connection Issues

If you can't connect to Supabase:

1. Check your `DATABASE_URL` format:
   ```
   postgresql://user:password@host:5432/database
   ```

2. Ensure Supabase allows connections from bolt.new IPs
3. Try using the connection pooler URL instead of direct connection

### App Shows Blank Screen

1. Check browser console for errors
2. Verify environment variables are set correctly
3. Try rebuilding:
   ```bash
   npm run bolt:fix
   npm run bolt:dev
   ```

### "Command not found: bash"

If you're on Windows or the fix script doesn't work:

```bash
# Windows PowerShell/CMD
npm cache clean --force
rmdir /s /q node_modules .next
del package-lock.json
npm install --legacy-peer-deps --no-optional
npm run bolt:dev
```

## Performance Tips

1. **Use Vite mode for development**
   ```bash
   npm run dev
   ```
   Vite is faster and doesn't require Next.js compilation.

2. **Disable source maps in production**
   Set `NODE_ENV=production` before building

3. **Reduce bundle size**
   - Remove unused dependencies
   - Use dynamic imports for large components

## Production Deployment

For production deployments, we recommend:

1. **Vercel** (recommended)
   - Full feature support
   - Edge functions
   - Image optimization works
   - One-click deployment

2. **Docker**
   - Use the provided Dockerfile
   - Full control over dependencies
   - Can use sharp and all native packages

3. **Traditional VPS**
   - Deploy with PM2
   - Full Node.js environment
   - All features available

Bolt.new is great for quick prototyping and testing, but consider these alternatives for production deployments.

## Getting Help

If you encounter issues:

1. Check this guide first
2. Run `npm run bolt:fix` to reset everything
3. Check the browser console for specific errors
4. Verify environment variables are set
5. Try the manual setup steps above

## Next Steps

After getting the app running:

1. Set up your Supabase database
2. Run migrations: `npm run migrate`
3. Create your first blog post
4. Configure authentication settings
5. Test the editor functionality

Happy coding! 🚀
