# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project overview
- Stack: Vite + React 18 + TypeScript, TailwindCSS, Vitest (unit), Playwright (e2e), ESLint, Supabase client. Optional Redis/Postgres via Docker for local infra and server-oriented utilities.
- Node: CI targets Node 20; use Node 20 locally for parity.
- Env: Required client vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. Optional: VITE_BETTER_AUTH_URL (prod). Server-only when running scripts/server-like code: REDIS_URL, RESEND_API_KEY. See .env.example.

Common commands
- Install deps
  ```bash path=null start=null
  npm ci
  ```
- Dev server
  ```bash path=null start=null
  npm run dev
  ```
- Build and preview
  ```bash path=null start=null
  npm run build
  npm run preview
  ```
- Lint and typecheck
  ```bash path=null start=null
  npm run lint
  npm run typecheck
  ```
- Unit tests (Vitest)
  ```bash path=null start=null
  # run once / watch / UI / coverage
  npm run test:unit
  npm run test:watch
  npm run test:ui
  npm run test:coverage

  # run a single file
  npm run test -- src/lib/rate-limit.test.ts

  # run tests matching a name pattern
  npm run test -- -t "rate limit"
  ```
- E2E tests (Playwright)
  ```bash path=null start=null
  # one-time browser install
  npm run playwright:install

  # headless / UI / headed / debug
  npm run test:e2e
  npm run test:e2e:ui
  npm run test:e2e:headed
  npm run test:e2e:debug

  # run a single spec
  npx playwright test tests/e2e/auth.spec.ts

  # run tests by title
  npx playwright test -g "logs in"
  ```
- Docker (local infra + dev server in a container)
  ```bash path=null start=null
  # start Postgres, Redis, and app (Vite on 5173)
  npm run docker:dev

  # tail app logs / stop
  npm run docker:logs
  npm run docker:down

  # build image / prod compose
  npm run docker:build
  npm run docker:prod
  ```
- SQL migrations (node scripts; default dir: postgres/migrations)
  ```bash path=null start=null
  # PowerShell (Windows):
  $env:DATABASE_URL = "postgresql://pythoughts:pythoughts_dev_password@localhost:5432/pythoughts_dev"
  npm run migrate
  npm run migrate:status

  # choose a different migrations directory
  npm run migrate -- --dir=postgres/migrations
  ```

Testing and CI
- Unit tests use jsdom, MSW setup at src/test/setup-tests.ts; env is mocked so tests don’t need real Supabase/Redis.
- Playwright starts the dev server automatically (see playwright.config.ts webServer) and runs specs in tests/e2e.
- CI (./.github/workflows/ci.yml): lint, typecheck, unit + coverage, e2e (chromium), build verification, npm audit/Snyk, and Lighthouse. Separate workflows run Pa11y and performance audits.

High-level architecture
- Entry and routing
  - src/main.tsx mounts App under StrictMode and AuthProvider; registers a Service Worker in production with structured logging.
  - src/App.tsx wires BrowserRouter + lazy-loaded pages, and wraps with ThemeProvider and NotificationProvider. Header/Footer live at layout level; global keyboard shortcuts and scheduled post publishing hook are initialized here.
- State and context
  - Auth: src/contexts/AuthContext.tsx manages Supabase auth/session + profile loading, and exposes role flags and profile update helpers.
  - Theme/Notifications: src/contexts/ThemeContext.tsx and src/contexts/NotificationContext.tsx provide UI theming and in-app notifications.
- Domain and data access (src/lib)
  - env.ts: Validates import.meta.env (client) and process.env (server-only) with typed helpers and clear error reporting.
  - supabase.ts: Creates the Supabase client and defines shared table DTO types (Profile, Post, Comment, etc.).
  - logger.ts and errors.ts: Structured logging with level control; rich error types plus helpers suitable for API-style responses.
  - middleware-patterns.ts: Composable middleware (auth, rate-limit, validation, request logging) and a createHandler wrapper that returns either SuccessResponse or ErrorResponse.
  - redis.ts and rate-limiter.ts: Server-leaning utilities for caching and sliding-window rate limiting backed by Redis. Use via Docker compose in local dev; fail-open behavior ensures app resilience if Redis is unavailable.
- UI and pages
  - Components are grouped under src/components (auth UI, layout, animations, posts/tasks, etc.). Pages under src/pages are lazy loaded to keep initial bundles small; Vite’s manualChunks in vite.config.ts splits vendors (react, markdown libs, dnd, ui-utils, supabase) for better caching.
- Configuration
  - Vitest configured in vitest.config.ts (coverage thresholds, aliases under @/*, setup file). Playwright config runs the Vite dev server, supports multiple browsers/devices, and saves trace/video on failure.
  - ESLint is configured via eslint.config.js (TypeScript + react-refresh/react-hooks rules). Tailwind is set up with postcss/tailwind configs.
- Infrastructure
  - Dockerfile is multi-stage (deps → build → development → production via serve). docker-compose.yml provides Postgres/Redis for dev; docker-compose.prod.yml adds hardened production services and nginx reverse proxy.
  - SQL migrations live under postgres/migrations and are applied by scripts/run-migrations.mjs using a simple schema_migrations table.

Notes for Agents
- Before building/running, ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (copy .env.example → .env and fill).
- For server-leaning utilities (Redis, migrations), prefer running through Docker compose or set server-only env vars in your shell; these modules shouldn’t be imported into browser-only code paths.
