# Repository Guidelines

This repository backs the Pythoughts hybrid Next.js/Vite client, the collaboration server, and the supporting automation.

## Project Structure & Module Organization

- `src/app` hosts Next.js routes and API handlers; `src/pages-vite` serves the Vite marketing surface.
- UI modules live in `src/components`, domain logic in `src/services` and `src/utils`, and contracts in `src/schemas` and `src/types`.
- Real-time collaboration runs from `server/index.ts` with helper scripts in `scripts/`; data assets stay in `migrations/`, `supabase/`, `public/`, and long-form references in `docs/`.
- Vitest specs colocate in `src/tests`, while Playwright suites reside at the root-level `tests/`.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite client; `npm run dev:all` launches Next.js plus the collaboration server, and `npm run docker:dev` brings up backing services.
- `npm run build:prod` chains SEO generation with the Vite and Next builds; `npm run start:all` serves the production bundle.
- Keep quality gates green: `npm run lint`, `npm run typecheck`, `npm run format:check`, and database helpers (`npm run migrate`, `npm run migrate:status`, `npm run db:generate`).

## Coding Style & Naming Conventions

- Prettier enforces two-space indentation, semicolons, single quotes, and a 100-character line width—no manual overrides.
- ESLint (Next + TypeScript) runs through Husky/lint-staged; fix or justify every warning before commit.
- Use `PascalCase` for components, `use`-prefixed hooks, camelCase utilities, and keep types in `src/types` with Zod schemas in `src/schemas` (e.g., `postSchema`).

## Testing Guidelines

- Vitest with Testing Library covers units and integrations via `npm run test:unit`, `npm run test:integration`, and `npm run test:coverage`.
- Playwright end-to-end suites run from `tests/` with `npm run test:e2e` or `npm run test:e2e:ui`.
- CI enforces 70% minimum coverage across lines, statements, functions, and branches—review `COVERAGE_GUIDE.md` before shipping sizable features.

## Commit & Pull Request Guidelines

- Follow the conventional commit style present in history (`fix:`, `chore:`, optional scopes) for clear changelogs.
- Keep commits small and runnable; rerun lint, typecheck, and targeted tests locally because Husky will block failures.
- Pull requests should link tracking tickets, describe behavior changes, add UI screenshots when relevant, call out migrations or env updates, request area owners, and wait for green CI.

## Environment & Secrets

- Copy `.env.example` or `.env.local.example` to `.env.local`; keep secrets out of git.
- Supabase/Drizzle tooling depends on those vars—`npm run db:studio` inspects schema changes, `npm run db:push` syncs updates, and `docker/` compose files mirror production integrations.
