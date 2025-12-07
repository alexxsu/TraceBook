import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    // Fix Vite cache issues - disable dep optimization caching
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        target: 'esnext'
      }
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      hmr: {
        overlay: true,
        timeout: 5000,
      },
      headers: {
        'Cache-Control': 'no-store',
      },
      // Clear cache on server start
      fs: {
        strict: false,
      },
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 1600,
      target: 'esnext',
    },
    // Use absolute path for cache to avoid OneDrive issues
    cacheDir: path.resolve(__dirname, '.vite'),
  };
});