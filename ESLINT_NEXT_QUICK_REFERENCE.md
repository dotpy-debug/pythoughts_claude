# ESLint Next.js Quick Reference

## Installation Summary

✅ **Status:** Successfully installed and configured
📦 **Package:** eslint-config-next@16.0.1
🔧 **Method:** `npm install eslint-config-next --save-dev --legacy-peer-deps`

## Configuration Files

### 1. eslint.config.js (ESLint 9 Flat Config)
```javascript
import nextPlugin from '@next/eslint-plugin-next';

// Next.js specific config
{
  files: ['src/app/**/*.{ts,tsx}', 'src/actions/**/*.{ts,tsx}'],
  plugins: {
    '@next/next': nextPlugin,
  },
  rules: {
    ...nextPlugin.configs.recommended.rules,
    ...nextPlugin.configs['core-web-vitals'].rules,
    'react-refresh/only-export-components': 'off',
  },
}
```

### 2. .eslintrc.json (Next.js CLI)
```json
{
  "extends": ["next/core-web-vitals", "next/typescript"]
}
```

## Commands

```bash
# Run ESLint with Next.js rules (Flat Config)
npm run lint

# Run Next.js CLI linting (Legacy Config)
npm run lint:next

# Auto-fix issues
npm run lint -- --fix

# Lint specific directory
npm run lint -- src/app/
```

## Active Next.js Rules

### Core Rules (recommended)
- ✅ `@next/next/no-img-element` - Use next/image for optimization
- ✅ `@next/next/no-html-link-for-pages` - Use next/link
- ✅ `@next/next/no-sync-scripts` - Avoid synchronous scripts
- ✅ `@next/next/inline-script-id` - Require id for inline scripts
- ✅ `@next/next/no-css-tags` - Use next/head for CSS

### Core Web Vitals (performance)
- ✅ `@next/next/no-page-custom-font` - Font optimization
- ✅ `@next/next/no-unwanted-polyfillio` - Avoid polyfills
- ✅ Performance and accessibility rules

## File Scope

Next.js rules apply to:
- `src/app/**/*.{ts,tsx}` - Next.js App Router pages
- `src/actions/**/*.{ts,tsx}` - Server Actions

Other files use standard React + TypeScript rules.

## Current Warnings

### Next.js Specific (1)
```
src/app/blogs/BlogsListView.tsx:103
warning: Using <img> could result in slower LCP
Fix: Replace with next/image
```

### TypeScript/React (166)
- Mostly `@typescript-eslint/no-explicit-any` warnings
- React hooks dependencies warnings
- Fast refresh export warnings

## Quick Fixes

### Replace img with next/image
```tsx
// Before
<img src={post.coverImage} alt={post.title} />

// After
import Image from 'next/image';
<Image
  src={post.coverImage}
  alt={post.title}
  width={800}
  height={400}
  loading="lazy"
/>
```

### Use next/link for navigation
```tsx
// Before
<a href="/blogs">View Blogs</a>

// After
import Link from 'next/link';
<Link href="/blogs">View Blogs</Link>
```

## Development Workflow

1. **Write code** in `src/app/` or `src/actions/`
2. **Save file** - Husky pre-commit hooks run ESLint
3. **Fix warnings** - Auto-fix with `npm run lint -- --fix`
4. **Commit** - Lint-staged ensures code quality

## Troubleshooting

### "Invalid project directory" error
- Ensure `.eslintrc.json` exists in project root
- Run `npm run lint` instead of `next lint`

### React 19 peer dependency warnings
- Currently no conflicts
- Using `--legacy-peer-deps` handles compatibility

### Rules not applying
- Check file matches glob pattern: `src/app/**/*.{ts,tsx}`
- Verify import: `import nextPlugin from '@next/eslint-plugin-next'`

## Additional Resources

- [Next.js ESLint Docs](https://nextjs.org/docs/app/building-your-application/configuring/eslint)
- [eslint-config-next GitHub](https://github.com/vercel/next.js/tree/canary/packages/eslint-config-next)
- Full report: `ESLINT_NEXT_INSTALLATION.md`
