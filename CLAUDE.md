# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pythoughts** is an enterprise-grade JAMstack blog platform built with Next.js 16, Vite, React 19, and Supabase. The application features real-time collaboration, advanced blog authoring with Tiptap, authentication with Better Auth, and a dual-mode architecture supporting both Vite (SPA) and Next.js (SSG/ISR/SSR).

**Current Phase:** Phase 7 complete - Real-time collaboration with Yjs/Hocuspocus implemented. Phases 8-10 pending (Git versioning, Media pipeline, AI moderation).

## Development Commands

### Core Development

```bash
# Vite development server (SPA mode)
npm run dev

# Next.js development server (SSG/ISR mode)
npm run dev:next

# Collaboration server (WebSocket/Yjs)
npm run dev:collab

# Run all servers concurrently (Vite + Collaboration)
npm run dev:all
```

### Building

```bash
# Build Vite app
npm run build

# Build Next.js app
npm run build:next

# Build both Vite and Next.js
npm run build:all

# Production build with SEO files
npm run build:prod
```

### Testing

```bash
# Run unit tests (Vitest)
npm run test              # Watch mode
npm run test:unit         # Run once
npm run test:coverage     # With coverage

# Run E2E tests (Playwright)
npm run test:e2e          # Headless
npm run test:e2e:ui       # Interactive UI
npm run test:e2e:headed   # With browser window
npm run test:e2e:debug    # Debug mode
```

### Database Management

```bash
# Run migrations (automatic with start script)
npm run migrate

# Check migration status
npm run migrate:status

# Drizzle ORM commands
npm run db:migrate        # Run migrations with Drizzle
npm run db:push          # Push schema changes (dangerous)
npm run db:generate      # Generate migration files
npm run db:studio        # Open Drizzle Studio
npm run db:drop          # Drop database (dangerous)
```

### Production

```bash
# Start production server (with auto-migrations)
npm start

# Start Next.js production server
npm run start:next

# Start collaboration server
npm run start:collab

# Start all production servers
npm run start:all
```

### Docker

```bash
npm run docker:dev       # Start dev containers
npm run docker:down      # Stop containers
npm run docker:logs      # View app logs
npm run docker:build     # Build production image
npm run docker:prod      # Run production compose
```

### Linting & Type Checking

```bash
npm run lint             # Lint with ESLint
npm run lint:next        # Next.js linting
npm run typecheck        # TypeScript type checking
```

## Architecture Overview

### Dual-Mode Architecture

The application runs in two modes simultaneously:

1. **Vite Mode (SPA)**: Fast development, client-side routing, real-time features
   - Entry: `src/main.tsx`
   - Router: React Router DOM v7
   - Served on: `http://localhost:5173`

2. **Next.js Mode (SSG/ISR/SSR)**: SEO-optimized blog rendering
   - Entry: `src/app/`
   - Router: Next.js App Router
   - Served on: `http://localhost:3000`

### Key Directories

```
src/
├── actions/          # Next.js Server Actions (RSC)
├── app/             # Next.js App Router pages
│   ├── blog/[slug]/ # ISR blog post pages
│   ├── blogs/       # ISR blog listing
│   └── api/         # API routes (revalidation)
├── components/      # React components (shared between modes)
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── lib/            # Core libraries
│   ├── auth.ts     # Better Auth configuration
│   ├── supabase.ts # Supabase client
│   └── env.ts      # Environment variables
├── services/       # Business logic services
├── routes/         # Vite mode route definitions
├── middleware.ts   # Next.js middleware (security headers)
└── main.tsx        # Vite entry point

server/
├── index.ts              # Collaboration server entry
└── collaboration.ts      # Hocuspocus server config

scripts/
├── migrate-database.ts          # Auto-migration script
├── start-with-migrations.ts     # Production startup
└── generate-seo-files.ts        # SEO metadata generation
```

### Database Architecture

- **ORM**: Drizzle ORM with PostgreSQL
- **Provider**: Supabase (PostgreSQL + Auth + Storage)
- **Migrations**: Automatic on startup via `scripts/start-with-migrations.ts`
- **Schema Location**: `src/db/schema.ts` (not in repo, inferred from migrations)

### Authentication Flow

- **Provider**: Better Auth v1.3+
- **Strategy**: Email/password with OTP verification
- **Email**: Resend API for transactional emails
- **Session**: 7-day expiry, cookie-based
- **2FA**: TOTP support enabled
- **Tables**: `profiles` (users), `better_auth_sessions`, `better_auth_accounts`

Key files:
- `src/lib/auth.ts` - Server-side auth configuration
- `src/components/auth/` - Auth UI components
- `src/actions/` - Server Actions for auth operations

### Real-Time Collaboration (Phase 7)

- **Technology**: Yjs CRDT + Hocuspocus WebSocket server
- **Editor**: Tiptap with Collaboration extensions
- **Server**: `server/collaboration.ts` (runs on port 3001)
- **Features**: Multi-user editing, presence indicators, conflict-free sync

### Rendering Strategy

| Route | Strategy | Revalidation | Config Location |
|-------|----------|--------------|-----------------|
| `/` | SSR | N/A | Vite mode only |
| `/blog/[slug]` | ISR | 1 hour | `src/app/blog/[slug]/page.tsx` |
| `/blogs` | ISR | 5 min | `src/app/blogs/page.tsx` |
| `/profile` | SSR | N/A | Vite mode only |

**SSG**: Top 100 blogs pre-rendered at build time (`generateStaticParams`)
**ISR**: Incremental Static Regeneration with `revalidate: 3600`
**On-demand**: `/api/revalidate` endpoint for manual cache busting

## Important Patterns

### Server Actions Pattern

Server Actions are used for all data mutations in Next.js mode:

```typescript
// src/actions/posts.ts
'use server';

export async function createPost(formData: FormData) {
  const session = await getSession(); // Better Auth
  if (!session) throw new Error('Unauthorized');

  // Validate, process, insert into DB
  // Return type-safe result
}
```

### Environment Variables

- **Client-side**: `VITE_*` prefix (exposed to browser)
- **Server-side**: No prefix (Node.js only)
- **Configuration**: `src/lib/env.ts` with Zod validation
- **Example**: `.env.local.example`, `.env.production.template`

Critical variables:
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - Database
- `BETTER_AUTH_SECRET` - Session encryption
- `RESEND_API_KEY` - Email sending
- `DATABASE_URL` - Direct PostgreSQL connection

### Migration Strategy

**DO NOT** run `npm run db:push` in production - it bypasses migrations!

Always use:
```bash
npm run db:generate    # Generate migration files
npm run migrate        # Apply migrations
```

Migrations auto-run on production startup via `npm start`.

### Security Headers

Security headers are configured in multiple locations:
- `next.config.js` - Next.js routes
- `vite.config.ts` - Vite dev/preview
- `src/middleware.ts` - Dynamic CSP nonces

CSP includes:
- Script nonce injection for inline scripts
- Supabase API/WebSocket allowlist
- No `unsafe-eval`, no `unsafe-inline` (except styles)

### Component Organization

Components follow shadcn/ui patterns with CVA for variants:

```
src/components/
├── ui/              # Base shadcn/ui components (Button, Dialog, etc.)
├── blog/            # Blog-specific features
│   ├── editor/      # Tiptap editor with collaboration
│   ├── reader/      # Blog post rendering
│   └── ...
├── auth/            # Authentication forms
└── layout/          # Shell components (Header, Footer)
```

## Testing Guidelines

### Unit Tests (Vitest)

- Location: `src/**/*.test.ts(x)`
- Setup: `src/test/setup-tests.ts`
- Coverage target: 70% (enforced)
- Run with: `npm run test:unit`

### E2E Tests (Playwright)

- Location: `tests/e2e/`
- Config: `playwright.config.ts`
- Browsers: Chrome, Firefox, Safari, Mobile viewports
- Run with: `npm run test:e2e`

Before running E2E tests:
```bash
npm run playwright:install  # Install browser binaries
```

## Deployment

### Vercel (Recommended)

The app is optimized for Vercel Edge deployment:

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

Configuration: `vercel.json` (cache headers, rewrites)

### Docker

Production-ready Dockerfile included:

```bash
docker build -t pythoughts:latest .
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Port Conflicts

- Vite dev: `5173`
- Next.js dev: `3000`
- Collaboration: `3001`
- PostgreSQL: `5432` (if using local Docker)

### Database Connection Issues

If migrations fail, check:
1. `DATABASE_URL` format: `postgresql://user:pass@host:5432/db`
2. Supabase connection pooler vs direct connection
3. SSL mode: `?sslmode=require` may be needed

### Better Auth Session Issues

If auth doesn't persist:
1. Check `BETTER_AUTH_SECRET` is set
2. Verify `VITE_BETTER_AUTH_URL` matches deployment URL
3. Clear cookies and try again
4. Check Supabase RLS policies allow session reads

### Collaboration Server Not Connecting

1. Verify `npm run dev:collab` is running
2. Check WebSocket URL in editor config
3. Ensure firewall allows port 3001
4. Check browser console for CORS errors

## Key Technologies

- **Framework**: Next.js 16 (App Router) + Vite 5
- **Language**: TypeScript 5.5
- **UI**: React 19, shadcn/ui, Tailwind CSS 3
- **Editor**: Tiptap 2 with Collaboration extensions
- **Auth**: Better Auth 1.3
- **Database**: PostgreSQL via Supabase, Drizzle ORM
- **Collaboration**: Yjs, Hocuspocus
- **Testing**: Vitest (unit), Playwright (E2E)
- **Email**: Resend
- **Deployment**: Vercel Edge, Docker

## Roadmap

**Completed Phases:**
- ✅ Phase 1-4: Core blog features with Tiptap editor
- ✅ Phase 5: JAMstack rendering (SSG/ISR/SSR)
- ✅ Phase 6: Edge CDN & security headers
- ✅ Phase 7: Real-time collaboration with Yjs

**Pending Phases:**
- ⏳ Phase 8: Git-based versioning (isomorphic-git)
- ⏳ Phase 9: Advanced media pipeline (Cloudinary, AI tagging)
- ⏳ Phase 10: AI moderation (AWS Rekognition, Comprehend)

See `INTEGRATION_PLAN.md` for detailed implementation specs.

## Additional Documentation

- `INTEGRATION_PLAN.md` - Detailed phase implementation guide
- `DATABASE_MIGRATIONS.md` - Migration system documentation
- `COLLABORATION_GUIDE.md` - Real-time editing setup
- `DEPLOYMENT_SECURITY.md` - Production security checklist
- `NEXTJS_SETUP.md` - Next.js configuration guide
- `ROADMAP.md` - Feature roadmap and priorities
