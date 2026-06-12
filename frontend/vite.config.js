import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      // disable fast refresh to avoid preamble detection issues on Windows dev env
      fastRefresh: false,
      jsxRuntime: 'automatic',
    }),
  ],
  server: {
    port: 4173,
  },
});
