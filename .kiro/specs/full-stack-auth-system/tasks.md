# Implementation Plan

## Current State Analysis
The application is **fully functional** with Vite + React 18 + TypeScript using Supabase for authentication and database. The design document specifies a migration to Next.js with Drizzle ORM and shadcn/ui, but this is a complete rewrite of an already working application.

## What's Already Built (Vite/React/Supabase Stack)

### ✅ Authentication & User Management
- Supabase Auth with email/password authentication
- AuthContext with sign up, sign in, sign out functionality
- Rate limiting on authentication attempts
- Profile management system
- User profiles with extended information (bio, location, company, job title, social links)
- User skills system with proficiency levels
- User follow/unfollow and blocking functionality
- _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

### ✅ Post Management System
- Full CRUD operations for posts (news and blogs)
- Post creation with markdown editor (@uiw/react-md-editor)
- Post listing with sorting (hot, new, top)
- Post detail view with full content
- Voting system (upvote/downvote) with optimistic UI updates
- Post categories and filtering
- Image upload support
- _Requirements: 6.1, 6.2, 6.3, 6.4_

### ✅ Comment System
- Nested comment threading with unlimited depth
- Comment CRUD operations
- Comment voting system
- Real-time comment updates via Supabase subscriptions
- Comment moderation and deletion
- _Requirements: 6.1, 6.3_

### ✅ Task Management
- Full task CRUD operations
- Task board with status columns (todo, in_progress, completed, archived)
- Priority levels (low, medium, high, urgent)
- Task assignment and collaboration
- Drag-and-drop functionality with @dnd-kit
- Infinite canvas view for tasks
- Task comments and activity tracking
- Due dates and tags
- _Requirements: 6.1, 6.2, 6.3_

### ✅ Reaction System
- Emoji reactions on posts and comments (12 types: like, love, laugh, wow, sad, angry, heart, fire, clap, thinking, celebrate, rocket)
- Reaction picker component
- Real-time reaction updates
- Reaction counts and aggregation
- _Requirements: 6.3_

### ✅ Notification System
- Real-time notifications via Supabase subscriptions
- Notification types: post_reply, comment_reply, vote, mention, task_assigned
- Unread count tracking
- Mark as read functionality
- Browser notifications support
- Notification preferences management
- _Requirements: 6.4_

### ✅ Trending Algorithm
- Reddit-inspired "hot" algorithm with custom optimizations
- Trending score calculation: log10(votes) + (2.0 * comments) + (0.5 * reactions) - age_penalty
- Age penalty with exponential decay (gravity: 12 hours, exponent: 1.8)
- Vote velocity tracking
- Trending posts view with materialized view support
- Category-based trending
- Redis caching with 5-minute TTL
- Background refresh job
- _Requirements: 7.1, 7.2, 7.3, 7.4_

### ✅ Caching Layer
- Redis integration with IORedis
- Cache utilities (get, set, delete, delete pattern)
- Cache keys for posts, users, tasks, comments, trending
- Cache TTL management (short: 60s, medium: 300s, long: 1800s, very long: 3600s)
- Cache invalidation on data mutations
- Retry logic with exponential backoff
- _Requirements: 8.6_

### ✅ UI Components
- **Custom Components**: Button, Input, Card, Modal, Badge, TerminalWindow
- **Shadcn-style Components**: ShadcnButton, ShadcnInput, ShadcnCard, ShadcnBadge (using CVA)
- **Animation Components**: FloatingBubbles, LogoLoopHorizontal, LogoLoopVertical, TypewriterText
- **Layout Components**: Header, Footer with navigation
- Terminal aesthetic with custom theme colors (terminal-green, terminal-blue, terminal-purple, logrocket colors)
- Responsive design with mobile-first approach
- _Requirements: 5.1, 5.5_

### ✅ Error Handling & Logging
- Custom error classes (ExternalServiceError, ValidationError, etc.)
- Error logger with context tracking
- Retry logic with configurable strategies
- Rate limiting utilities
- Security utilities (input sanitization, URL validation, XSS prevention)
- Security headers configuration
- _Requirements: 8.1, 8.2_

### ✅ Testing Infrastructure
- Vitest configuration for unit tests
- Playwright configuration for E2E tests
- React Testing Library setup
- MSW (Mock Service Worker) for API mocking
- Test utilities and helpers
- Existing tests: Button.test.tsx, SignInForm.test.tsx, security.test.ts, trending.test.ts
- _Requirements: 8.3_

### ✅ Deployment & DevOps
- Docker configuration (docker-compose.yml, docker-compose.prod.yml, Dockerfile)
- Vite build optimization with code splitting
- Environment variable validation
- Security headers for development and production
- NPM scripts for dev, build, test, and deployment
- _Requirements: 4.1, 4.2, 4.3, 4.4_

### ✅ Better-Auth & Resend Integration (Configured but using Supabase)
- Better-Auth library installed and configured
- Resend email provider configured
- Email templates for verification, password reset, and welcome emails
- Two-factor authentication support configured
- Currently using Supabase Auth in production, Better-Auth ready for migration
- _Requirements: 1.1, 1.2, 1.3_

---

## Migration Strategy
The design document calls for migrating to Next.js with Drizzle ORM and shadcn/ui. This is a **complete rewrite** of a fully functional application. The tasks below outline the migration path.

---

## Migration Tasks (Next.js + Drizzle ORM + shadcn/ui)

**Note:** The following tasks represent a complete rewrite of the existing Vite application. Consider whether this migration is necessary given the fully functional current state.

- [ ] 1. Initialize Next.js project structure
  - Create new Next.js 14+ project with App Router in a separate directory
  - Configure TypeScript with strict mode matching current tsconfig
  - Set up Tailwind CSS with existing custom terminal theme colors (terminal-green, terminal-blue, terminal-purple, logrocket colors)
  - Install core dependencies: drizzle-orm, @node-rs/argon2, postgres, @tanstack/react-query
  - Create app/, lib/, and components/ directory structure
  - Copy over existing utility functions and constants
  - _Requirements: 4.1, 4.2_

- [ ] 2. Set up Drizzle ORM and database schema
  - Install drizzle-orm, drizzle-kit, and postgres driver
  - Create drizzle.config.ts with PostgreSQL connection
  - Define schema in lib/db/schema.ts replicating Supabase tables:
    - Better-Auth tables (user, session, account, verification)
    - profiles table with extended user information
    - posts table (news and blogs)
    - comments table with nested threading support
    - votes table for posts and comments
    - reactions table with 12 emoji types
    - tasks table with status, priority, and assignment
    - task_comments and task_activity tables
    - notifications table with preferences
    - user_skills, user_follows, user_blocks tables
    - canvas_tasks table for infinite canvas
  - Generate and run initial migrations
  - Set up database connection pooling with environment variables
  - Create database indexes matching Supabase performance
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. Configure Better-Auth with Drizzle adapter
  - Update lib/auth.ts to use Drizzle adapter instead of Supabase client
  - Configure email/password authentication with existing Resend templates
  - Set up Google OAuth provider configuration
  - Create API route handlers at app/api/auth/[...all]/route.ts
  - Implement session management with secure httpOnly cookies
  - Create middleware for protected routes (app/middleware.ts)
  - Port existing rate limiting logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 4. Install and configure shadcn/ui component system
  - Initialize shadcn/ui with `npx shadcn-ui@latest init`
  - Configure components.json with custom terminal theme colors
  - Install core components: Button, Input, Card, Dialog, Form, Label, Textarea, Badge, Select, Dropdown
  - Create custom theme variants matching existing terminal aesthetic
  - Update tailwind.config to include shadcn/ui theme tokens
  - Ensure compatibility with existing custom components
  - _Requirements: 5.1, 5.5_

- [ ] 5. Migrate authentication UI components
  - Rebuild SignInForm using shadcn/ui Form and Input with react-hook-form + zod
  - Rebuild SignUpForm with email verification flow
  - Create OTP verification component for email confirmation
  - Implement password reset workflow components
  - Add Google Sign-In button component
  - Port existing rate limiting and error handling
  - Maintain terminal aesthetic styling
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6. Create Next.js App Router pages and layouts
  - Create root layout (app/layout.tsx) with authentication provider and NotificationProvider
  - Build home page (app/page.tsx) for newsfeed with server components
  - Create blog pages (app/blogs/page.tsx and app/blogs/[id]/page.tsx)
  - Implement task management page (app/tasks/page.tsx)
  - Add authentication pages (app/auth/signin, signup, verify-email, reset-password)
  - Create user profile pages (app/profile/[username]/page.tsx)
  - Port Header and Footer components with navigation
  - _Requirements: 5.1, 5.5_

- [ ] 7. Implement server actions for post management
  - Create lib/actions/posts.ts with server actions for CRUD operations
  - Implement createPost, updatePost, deletePost with Drizzle queries
  - Add voteOnPost server action with optimistic updates
  - Create data fetching functions in lib/data/posts.ts
  - Implement pagination with cursor-based navigation
  - Add proper error handling, validation, and sanitization
  - Port trending score update triggers
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Migrate post UI components to Next.js
  - Convert PostList to use server components with client interactivity
  - Rebuild PostCard with shadcn/ui Card component
  - Migrate PostDetail with server-side data fetching
  - Update CreatePostModal with shadcn/ui Dialog and Form
  - Integrate markdown editor (@uiw/react-md-editor) in post creation
  - Implement voting UI with optimistic updates using useOptimistic
  - Port sorting functionality (hot, new, top)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 9. Implement server actions for comment system
  - Create lib/actions/comments.ts with comment CRUD operations
  - Implement nested comment queries with Drizzle (recursive CTEs)
  - Add comment voting and reaction server actions
  - Create data fetching functions in lib/data/comments.ts
  - Implement comment moderation and deletion logic
  - Port real-time subscription logic (consider Pusher or similar)
  - _Requirements: 6.1, 6.3_

- [ ] 10. Migrate comment UI components
  - Convert CommentSection to use server components
  - Rebuild CommentItem with shadcn/ui components
  - Update CommentForm with proper validation (zod)
  - Implement nested comment threading display
  - Add comment voting and reaction UI
  - Port real-time updates functionality
  - _Requirements: 6.1, 6.3_

- [ ] 11. Implement server actions for reaction system
  - Create lib/actions/reactions.ts with reaction CRUD operations
  - Implement reaction toggling logic (12 emoji types)
  - Add reaction aggregation queries
  - Port EmojiReactionPicker component
  - Implement ReactionBar with real-time updates
  - _Requirements: 6.3_

- [ ] 12. Implement server actions for task management
  - Create lib/actions/tasks.ts with task CRUD operations
  - Implement task status update and priority management actions
  - Add task assignment and collaboration features
  - Create data fetching functions in lib/data/tasks.ts
  - Implement task filtering and search logic
  - Port task comments and activity tracking
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 13. Migrate task management UI components
  - Convert TaskList to use server components with client interactivity
  - Rebuild TaskCard with shadcn/ui Card component
  - Update drag-and-drop functionality with @dnd-kit (ensure Next.js compatibility)
  - Migrate CreateTaskModal and TaskDetailModal with shadcn/ui Dialog
  - Implement task board interface with status columns
  - Port InfiniteCanvas and CanvasTask components
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 14. Implement notification system in Next.js
  - Create lib/actions/notifications.ts with notification operations
  - Implement notification creation triggers on relevant actions
  - Port NotificationContext or use React Query for state management
  - Rebuild NotificationBell, NotificationDropdown, NotificationItem components
  - Implement real-time notification updates (Pusher, Ably, or polling)
  - Add browser notification support
  - Port notification preferences management
  - _Requirements: 6.4_

- [ ] 15. Migrate user profile system
  - Create lib/actions/profiles.ts with profile CRUD operations
  - Implement user follow/unfollow and blocking functionality
  - Port UserProfileCard component with shadcn/ui
  - Create profile pages with extended information display
  - Implement user skills management
  - Add social links and profile editing
  - _Requirements: 5.1, 5.5_

- [ ] 16. Migrate trending algorithm to Next.js
  - Port trending score calculation to lib/services/trending.ts
  - Create server action to update trending scores
  - Implement Vercel Cron Job or similar for periodic updates
  - Add data fetching function for trending posts using Drizzle
  - Update Logo Loop components to display trending content
  - Port trending stats and category-based trending
  - Ensure Redis caching works with Next.js
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 17. Migrate Redis caching layer
  - Port lib/redis.ts to work with Next.js server components
  - Update cache utilities for Next.js environment
  - Implement cache invalidation on server actions
  - Configure Redis connection pooling for serverless
  - Update cache keys and TTL strategies
  - Test caching with Next.js revalidation
  - _Requirements: 8.6_

- [ ] 18. Implement Next.js caching and performance optimizations
  - Configure Next.js caching with revalidate tags for posts and users
  - Use unstable_cache for trending posts and user profiles
  - Implement image optimization with next/image for avatars and post images
  - Configure font optimization with next/font for JetBrains Mono
  - Set up proper cache invalidation on data mutations
  - Add loading states with Suspense boundaries
  - Implement streaming for large data sets
  - _Requirements: 8.6_

- [ ] 19. Migrate error handling and logging
  - Create global error boundary (app/error.tsx and app/global-error.tsx)
  - Implement API error handling with consistent response format
  - Port existing logger to work with Next.js server components
  - Add form validation error messages with zod
  - Create user-friendly error pages (app/not-found.tsx, app/error.tsx)
  - Port security utilities (sanitization, rate limiting)
  - _Requirements: 8.1, 8.2_

- [ ] 20. Migrate animations and visual components
  - Port FloatingBubbles, LogoLoopHorizontal, LogoLoopVertical to Next.js
  - Ensure client-side animations work with "use client" directive
  - Maintain terminal aesthetic and gradient effects
  - Update TypewriterText component for Next.js
  - Verify all CSS animations and transitions work
  - _Requirements: 5.5_

- [ ]* 21. Update testing infrastructure for Next.js
  - Configure Vitest for Next.js server components and actions
  - Update Playwright tests for new Next.js routes
  - Create test utilities for Drizzle database setup and teardown
  - Port existing tests: Button.test.tsx, SignInForm.test.tsx, security.test.ts, trending.test.ts
  - Add tests for server actions
  - Configure MSW for Next.js API mocking
  - _Requirements: 8.3_

- [ ]* 22. Write tests for migrated functionality
  - Test authentication flows with Better-Auth and Drizzle
  - Test server actions for posts, comments, tasks, reactions
  - Verify voting and reaction systems work correctly
  - Test trending algorithm calculations
  - Validate form submissions and error handling
  - Test real-time updates and notifications
  - E2E tests for critical user flows
  - _Requirements: 8.3_

- [ ] 23. Configure deployment for Next.js
  - Create next.config.js with proper configuration
  - Update environment variables for production
  - Set up database connection pooling for serverless/edge
  - Configure Vercel deployment or alternative hosting
  - Set up Vercel Cron Jobs for trending updates
  - Update Docker configuration for Next.js if needed
  - Create deployment scripts and CI/CD pipeline updates
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 24. Data migration and cutover
  - Export all data from Supabase (posts, comments, users, tasks, etc.)
  - Create data migration scripts for new Drizzle schema
  - Test data integrity between Supabase and new PostgreSQL database
  - Plan cutover strategy with minimal downtime
  - Set up database backups and rollback procedures
  - Verify all features work with migrated data
  - Update DNS and routing for production cutover
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 25. Final integration and polish
  - Verify all features work end-to-end in Next.js
  - Ensure responsive design across all device sizes
  - Validate accessibility standards compliance (WCAG 2.1 AA)
  - Optimize performance and loading times (Lighthouse scores)
  - Conduct security review and vulnerability assessment
  - Update documentation for new architecture
  - Create migration guide for team members
  - Monitor production for issues post-launch
  - _Requirements: 5.5, 8.5, 8.6_