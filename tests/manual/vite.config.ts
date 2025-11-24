import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@grapevine/sdk': resolve(__dirname, '../../dist'),
      '@grapevine/sdk/react': resolve(__dirname, '../../dist/react')
    }
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['@grapevine/sdk', '@grapevine/sdk/react'],
    force: true
  },
  server: {
    port: 5173,
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});