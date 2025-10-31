# Pythoughts

Enterprise-grade JAMstack blog platform built with Next.js 16, Vite, React 19, and Supabase.

## Features

- **Dual-Mode Architecture**: Vite (SPA) + Next.js (SSG/ISR/SSR)
- **Real-Time Collaboration**: Yjs + Hocuspocus for multi-user editing
- **Advanced Blog Editor**: Tiptap with rich formatting and collaboration
- **Authentication**: Better Auth with 2FA support
- **Database**: PostgreSQL via Supabase with Drizzle ORM
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Type Safety**: TypeScript with strict mode

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Run development servers
npm run dev:all          # Vite + Collaboration server
npm run dev              # Vite only
npm run dev:next         # Next.js only

# Run tests
npm run test:unit        # Unit tests
npm run test:e2e         # E2E tests

# Build for production
npm run build:all        # Build both Vite and Next.js
npm run build:prod       # Production build with SEO files
```

## Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Project overview, architecture, and development guide
- **[CODE_QUALITY.md](./CODE_QUALITY.md)** - Code quality, pre-commit hooks, and CI/CD
- **[INTEGRATION_PLAN.md](./INTEGRATION_PLAN.md)** - Feature roadmap and implementation plan

## Code Quality

### Pre-commit Hooks

Automatically run on every commit:

- ✅ ESLint (no warnings allowed)
- ✅ Prettier formatting
- ✅ TypeScript type checking
- ✅ Commit message validation (Conventional Commits)

### CI/CD Pipeline

Runs on every push and pull request:

- ✅ Lint & type check
- ✅ Unit tests (70% coverage minimum)
- ✅ Build verification (Vite + Next.js)
- ✅ Security scanning
- ✅ E2E tests

See [CODE_QUALITY.md](./CODE_QUALITY.md) for detailed documentation.

## Development Commands

### Core Development

```bash
npm run dev              # Vite development server
npm run dev:next         # Next.js development server
npm run dev:collab       # Collaboration server
npm run dev:all          # Run all servers
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run typecheck        # TypeScript type checking
npm run format           # Format with Prettier
npm run format:check     # Check formatting
```

### Testing

```bash
npm run test             # Unit tests (watch mode)
npm run test:unit        # Run unit tests once
npm run test:coverage    # Generate coverage report
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # E2E tests with UI
```

### Building

```bash
npm run build            # Build Vite app
npm run build:next       # Build Next.js app
npm run build:all        # Build both
npm run build:prod       # Production build with SEO
```

### Database

```bash
npm run migrate          # Run migrations
npm run migrate:status   # Check migration status
npm run db:studio        # Open Drizzle Studio
npm run db:generate      # Generate migration files
```

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

**Examples**:

```bash
feat(auth): add two-factor authentication
fix(blog): resolve markdown rendering issue
docs: update README with setup instructions
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Build Tools**: Vite 5, Next.js 16
- **Editor**: Tiptap 2 with Collaboration extensions
- **Auth**: Better Auth 1.3
- **Database**: PostgreSQL (Supabase), Drizzle ORM
- **Collaboration**: Yjs, Hocuspocus
- **Testing**: Vitest, Playwright
- **Deployment**: Vercel, Docker

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Better Auth
BETTER_AUTH_SECRET=your_secret_key
VITE_BETTER_AUTH_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
```

## Project Structure

```
src/
├── actions/          # Next.js Server Actions
├── app/             # Next.js App Router pages
├── components/      # React components
├── hooks/           # Custom React hooks
├── lib/             # Core libraries (auth, supabase)
├── services/        # Business logic
└── main.tsx         # Vite entry point

server/
├── index.ts              # Collaboration server
└── collaboration.ts      # Hocuspocus config

.github/
└── workflows/
    ├── code-quality.yml  # Code quality checks
    ├── ci.yml            # CI pipeline
    └── ...

.husky/
├── pre-commit           # Pre-commit hook
└── commit-msg           # Commit message validation
```

## Troubleshooting

### Pre-commit hooks not running

```bash
npm run prepare
```

### Build fails

```bash
rm -rf node_modules .next dist
npm install --legacy-peer-deps
npm run build:all
```

### Type errors

```bash
npm run typecheck
# Fix errors and commit again
```

See [CODE_QUALITY.md](./CODE_QUALITY.md) for more troubleshooting tips.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes and commit following Conventional Commits
4. Push to your fork: `git push origin feat/your-feature`
5. Open a Pull Request

All commits must pass pre-commit hooks and CI/CD checks.

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
