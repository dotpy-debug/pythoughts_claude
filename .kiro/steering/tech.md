# Tech Stack & Build System

## Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** as build tool and dev server
- **Tailwind CSS** for styling with custom design tokens
- **Lucide React** for consistent iconography

## Backend & Data
- **Supabase** for PostgreSQL database, authentication, and real-time features
- **Redis** (via IORedis) for high-performance caching
- **Better-Auth** integration planned for enhanced authentication
- **Resend** planned for email services

## Key Libraries
- **@dnd-kit** for drag-and-drop functionality
- **@uiw/react-md-editor** for markdown editing
- **react-markdown** with rehype/remark plugins for content rendering
- **class-variance-authority** + **clsx** + **tailwind-merge** for component styling

## Development Tools
- **ESLint** with TypeScript and React plugins
- **TypeScript** with strict configuration
- **PostCSS** with Autoprefixer

## Common Commands

### Development
```bash
npm run dev          # Start development server
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Build & Deploy
```bash
npm run build        # Production build
npm run preview      # Preview production build locally
```

## Environment Variables
Required for full functionality:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_REDIS_URL` - Redis connection string (defaults to localhost:6379)
- `VITE_BETTER_AUTH_URL` - Authentication service URL
- `VITE_RESEND_API_KEY` - Email service API key

## Performance Optimizations
- Redis caching with automatic invalidation
- Vite's optimizeDeps excludes lucide-react for better performance
- Lazy loading and code splitting ready
- Real-time updates via Supabase subscriptions