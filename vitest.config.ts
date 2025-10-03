import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',

    // Global test setup
    setupFiles: ['./src/test/setup-tests.ts'],

    // Enable globals like describe, it, expect
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
        '.eslintrc.cjs',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // Test file patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

    // Watch mode settings
    watch: false,

    // Test timeout
    testTimeout: 10000,

    // Reporter
    reporters: ['verbose'],

    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
});
