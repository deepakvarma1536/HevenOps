import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dirname(fileURLToPath(import.meta.url)), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
