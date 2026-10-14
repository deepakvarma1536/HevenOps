import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/api/client.js',
        'src/components/ApiResourcePage.jsx',
        'src/components/AsyncState.jsx',
        'src/hooks/useAsyncResource.js',
        'src/pages/Login.jsx',
      ],
      thresholds: {
        statements: 65,
        branches: 55,
        functions: 60,
        lines: 70,
      },
    },
  },
});
