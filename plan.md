Plan: Complete Feature Enhancement and Production Readiness for Pythoughts Social Blogging Platform
Last audit: 2025-10-18 (Build runbook refresh)

## Build & Delivery Runbook (2025-10-18)

**Scope**
- Plan sections 1-10 share a single Vite + React frontend (`src/`) backed by Supabase/PostgreSQL schemas (`supabase/migrations`, `postgres/migrations`) with Redis-powered features.
- The steps below document how to assemble, validate, and ship those capabilities end-to-end.

### 1. Toolchain & Prerequisites
- Node.js 20.x and npm 10.x (matches GitHub Actions `NODE_VERSION`); pin locally via `.nvmrc`/Volta to avoid drift.
- Optional CLIs: Supabase CLI (database migrations), Docker & Docker Compose (container workflows), Nixpacks (deployments).
- Global utilities referenced in docs/workflows: `@lhci/cli@0.14.x`, `pa11y-ci`, `wait-on`, `npx playwright install --with-deps`.
- External services required by roadmap items: Supabase project, Resend account, Better-Auth instance, Redis cache.

### 2. Environment Configuration
- Copy `.env.example` to `.env`; populate `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for plan sections 1-4 and 10.
- Enable server-side features (sections 5-8) by setting `REDIS_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY` as needed.
- Production builds derive from `.env.production.template` plus Docker secrets in `docker-compose.prod.yml`.

### 3. Local Database & Services
- Supabase-hosted path (sections 1-4 and 10): run migrations in `supabase/migrations` using Supabase CLI (`supabase db push`) or SQL client. NOTE: no helper script yet; see enhancements.
- Self-hosted stack (sections 5-6 and 9): `npm run docker:dev` starts Postgres + Redis + dev app; apply SQL from `postgres/migrations` to mirror schema.
- Redis is optional for basic browsing but required to exercise caching/rate limiting/trending work (section 6).

### 4. Dependency Installation
- `npm ci --prefer-offline --no-audit` (mirrors CI). Run after cloning or when lockfile changes.

### 5. Running the Application
- `npm run dev -- --host` => http://localhost:5173 (hot reload, uses current `.env`).
- `npm run preview` after a build to inspect production bundle locally (`npm run preview -- --host 0.0.0.0` for device testing).

### 6. Quality Gates & Test Matrix
- Static checks: `npm run lint`, `npm run typecheck` (CI job `quality`).
- Unit/component coverage (sections 1-7): `npm run test:unit`; `npm run test:coverage` produces `coverage/` with 70% thresholds defined in `vitest.config.ts`.
- End-to-end flows (sections 1-5 and 10): `npm run test:e2e` (ensure `npx playwright install --with-deps` beforehand; config auto-starts dev server).
- Accessibility: `pa11y-ci --config .pa11yci.json` against `npm run preview`.
- Performance: `npm run build` then `lhci autorun` (settings in `lighthouserc.json`; scripts `scripts/run-performance-tests.*` wrap this & Pa11y).
- Optional tooling: `npm run test:ui`, `npm run test:watch`, `npm run test:e2e:ui/headed/debug` for scenario debugging; `scripts/generate-seo-files.ts` refreshes SEO metadata.

### 7. Production Build & Distribution
- `npm run build` emits optimized assets to `dist/`; verify via `npm run preview`.
- Container images: `npm run docker:build` / `docker build -t pythoughts:latest .` (multi-stage targets `development` + `production`).
- Full-stack deployment: `npm run docker:prod` (`docker-compose -f docker-compose.prod.yml up -d`) after provisioning secrets, volumes, and TLS assets per compose comments.
- Alternative hosting: `nixpacks.toml` preconfigures Railway/Render deployments (`npm run preview` entrypoint, cached static headers).

### 8. CI/CD & Hosting Pipelines
- `.github/workflows/ci.yml` runs lint, typecheck, unit coverage, Playwright e2e, build verification, security, and Lighthouse checks.
- `.github/workflows/performance.yml` separates Lighthouse, Pa11y, and npm audit artifacts.
- `.github/workflows/deploy.yml` builds production artifact, deploys to Vercel (`deploy-vercel`), and reserves slots for migrations and smoke tests.
- `.github/workflows/pr-preview.yml` generates Vercel previews per pull request (comments currently contain mojibake; see findings).

### 9. Key Findings from Build Audit
- `deploy.yml` references `npm run migrate` / `npm run migrate:status`, but no scripts exist, so automated migrations will fail.
- Workflow comments in `deploy.yml` and `pr-preview.yml` include non-ASCII artifacts, leading to unreadable deployment notifications.
- Dual migration trees (`postgres/migrations` vs `supabase/migrations`) lack a documented sync strategy, risking schema drift across plan sections.

### 10. Recommended Build Enhancements
1. Add executable migration scripts (e.g., Supabase CLI or knex wrapper) so CI/CD steps invoking `npm run migrate*` succeed.
2. Introduce `.nvmrc` or `package.json` `"engines"` to enforce Node.js 20.x across contributors.
3. Provide a composite `npm run check` (lint + typecheck + test) or task runner to mirror CI locally before advancing plan milestones.
4. Publish data seeding fixtures for blogs, comments, tasks, and publications to stabilize local/e2e scenarios.
5. Document and automate Supabase vs self-hosted database flows to keep `supabase/` and `postgres/` migrations synchronized.
6. Clean up workflow notification strings to human-readable ASCII and align messaging with collaboration goals in section 10.

---

1. Core Medium-Style Blogging Features Implementation

Implement draft autosave system with scheduled publishing functionality
Build clap button component with animation and count display up to 50 claps
Create bookmark management system with reading lists organization
Develop text highlighting feature with color options and private notes
Build series management interface for grouping related blog posts with ordering
Create publication system for collaborative blogging with member roles
Implement tag-based content discovery with follow/unfollow functionality
Add reading progress tracking with position persistence and completion status
Build post view analytics dashboard for authors showing traffic sources
Create engagement score calculation and display in post statistics
2. Enhanced Content Creation and Management

Build rich markdown editor with live preview for blog posts
Add image upload functionality with drag-and-drop support
Implement draft recovery system to prevent content loss
Create SEO optimization fields for titles, descriptions, and canonical URLs
Build content scheduling interface with timezone support
Add reading time calculator displayed on all posts
Implement subtitle/excerpt editor for better content summaries
Create featured post selection system for homepage highlights
Build category management with custom category creation
Add content versioning to track post edit history
3. Advanced User Interaction Features

Build nested comment system with threading and reply chains
Implement comment voting and reaction system
Create user profile pages with extended bio and social links
Add follower/following system with activity feeds
Build user skill showcase with proficiency levels
Implement user blocking functionality for content control
Create notification preferences panel with granular controls
Add mention system with autocomplete for users and tags
Build reputation system based on engagement metrics
Implement user badges for achievements and milestones
4. Discovery and Feed Optimization

Build personalized feed based on followed tags and users
Implement trending algorithm with time decay and engagement scoring
Create tag exploration page with popular tags and descriptions
Add search functionality with full-text search across posts
Build related posts recommendation engine
Create "For You" feed using collaborative filtering
Implement reading list suggestions based on interests
Add topic clustering for content organization
Build trending topics sidebar with real-time updates
Create author recommendation system
5. Task Management System Enhancement

Build infinite canvas for visual task organization with pan and zoom
Add task assignment functionality to team members
Implement task activity logging and audit trail
Create task comment system for collaboration
Add task filtering by status, priority, assignee, and tags
Build kanban board view with drag-and-drop between columns
Implement task due date reminders and notifications
Create task templates for recurring workflows
Add task time tracking with start/stop functionality
Build task dependencies and blocking relationships
6. Performance and Optimization

Implement lazy loading for images and content
Add infinite scroll for post lists with pagination fallback
Optimize database queries with proper indexing
Implement caching strategy using Redis for trending content
Add image optimization and CDN integration
Build service worker for offline reading capability
Implement code splitting for faster initial page loads
Add skeleton loaders for better perceived performance
Optimize bundle size by removing unused dependencies
Implement database connection pooling
7. User Experience and Design Polish

Enhance mobile responsiveness across all components
Add dark/light theme toggle with preference persistence
Implement smooth page transitions and animations
Create loading states for all async operations
Add empty states with helpful guidance for new users
Build onboarding flow for first-time users
Implement keyboard shortcuts for power users
Add accessibility improvements including ARIA labels and keyboard navigation
Create print-friendly post layouts
Build social sharing with Open Graph meta tags
8. Security and Data Protection

Implement rate limiting for API endpoints
Add CSRF protection for form submissions
Create content moderation queue for reported posts
Implement spam detection for comments and posts
Add email verification for new accounts
Build two-factor authentication system
Implement session management with secure token rotation
Add content security policy headers
Create automated backup system for user data
Implement audit logging for sensitive operations
9. Analytics and Insights

Build author analytics dashboard with views, reads, and engagement
Create reading time analytics to understand audience behavior
Implement referral tracking to identify traffic sources
Add post performance comparisons over time
Build audience demographics insights
Create export functionality for analytics data
Implement A/B testing framework for features
Add conversion tracking for call-to-action buttons
Build cohort analysis for user retention
Create custom event tracking for key interactions
10. Publication and Collaboration Features

Build publication creation wizard with branding customization
Implement publication member invitation system via email
Create submission workflow with approval/rejection process
Add publication analytics separate from personal analytics
Build publication homepage with custom layout
Implement publication newsletter functionality
Create publication style guide editor
Add publication revenue sharing configuration
Build publication moderation tools
Implement cross-posting between personal blog and publications
