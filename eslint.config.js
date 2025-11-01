import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

// Import Next.js ESLint config for flat config
// Note: eslint-config-next provides both legacy and flat config support
import nextPlugin from '@next/eslint-plugin-next';

export default tseslint.config(
  {
    ignores: [
      'dist',
      '.next',
      'node_modules',
      'build',
      'coverage',
      '*.config.js',
      '*.config.ts',
      'scripts/**/*.mjs',
      '.husky'
    ]
  },
  // Base config for all TypeScript files
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: [
            'withRouteErrorBoundary',
            'useRequireRole',
            'calculatePasswordStrength',
            'useTOC',
            'addHeadingIds',
            'buildNestedTOC',
            'generateBreadcrumbsFromPath',
            'validateSEO',
            'generateBlogPostSchema',
            'generatePersonSchema',
            'generateWebsiteSchema',
            'generateOrganizationSchema',
            'generateBreadcrumbSchema',
            'updateMetaTags',
            'generateRSSFeed',
            'generateSitemap',
            'useAuth',
            'useNotifications',
            'useTheme',
            'useKeyboardShortcuts',
            'useFocusTrap',
            'useArrowKeyNavigation',
            'useEscapeKey',
            'useSkipToContent',
            'useScreenReaderAnnouncement',
            'GLOBAL_SHORTCUTS',
            'render',
            'waitForNextUpdate',
            'createMockUser',
            'createMockPost',
            'createMockComment',
            'createMockNotification'
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Next.js specific config for app directory and server components
  {
    files: ['src/app/**/*.{ts,tsx}', 'src/actions/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      // Disable react-refresh for Next.js Server Components
      'react-refresh/only-export-components': 'off',
    },
  }
);
