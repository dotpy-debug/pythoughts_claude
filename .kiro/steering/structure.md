# Project Structure & Architecture

## Folder Organization

```
src/
├── components/          # React components organized by feature
│   ├── animations/      # Floating bubbles, logo loops, visual effects
│   ├── auth/           # Authentication forms and flows
│   ├── blogs/          # Blog-specific components (grid, cards)
│   ├── comments/       # Comment system components
│   ├── layout/         # Header, Footer, navigation
│   ├── notifications/  # Toast notifications, alerts
│   ├── posts/          # News feed posts (list, detail, create)
│   ├── profile/        # User profile components
│   ├── reactions/      # Voting, reactions system
│   ├── tasks/          # Task management components
│   └── ui/             # Reusable UI components (Button, Card, Modal, etc.)
├── contexts/           # React Context providers
├── lib/                # External service integrations
├── utils/              # Helper functions and utilities
└── App.tsx             # Main application component
```

## Component Architecture

### UI Components (`src/components/ui/`)
Reusable components following design system:
- **Button**: Multiple variants (primary, secondary, outline, ghost, gradient, danger)
- **Card**: Flexible with CardHeader, CardBody, CardFooter
- **Modal**: Full-featured with backdrop, animations, accessibility
- **Input**: Enhanced with labels, icons, error states
- **Badge**: Status indicators with color variants

### Feature Components
Organized by domain (posts, tasks, blogs, etc.) with:
- List/Grid views
- Detail/Edit forms
- Create modals
- Feature-specific UI elements

## State Management

### Context Providers
- **AuthContext**: User authentication state and methods
- **NotificationContext**: Toast notifications and alerts

### Local State Patterns
- Component-level state with useState
- Effect hooks for data fetching and subscriptions
- Optimistic UI updates for better UX

## Styling Conventions

### Tailwind Classes
- Use custom design tokens: `terminal-*`, `logrocket-*` colors
- Consistent spacing with Tailwind scale
- Animation classes: `animate-fade-in`, `animate-pulse-glow`
- Responsive design with mobile-first approach

### Component Styling
- Use `clsx` and `tailwind-merge` for conditional classes
- `class-variance-authority` for component variants
- Consistent hover states and transitions

## File Naming
- PascalCase for components: `PostList.tsx`, `CreateTaskModal.tsx`
- camelCase for utilities: `dateUtils.ts`, `supabase.ts`
- kebab-case for CSS classes and IDs

## Import Organization
1. React imports first
2. Third-party libraries
3. Internal components and utilities
4. Type imports last (if needed separately)