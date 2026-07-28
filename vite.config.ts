import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // base: './' keeps all asset paths in the build relative, so the bundle works
  // from any path or subdirectory rather than only from the domain root.
  base: './',
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  server: {
    port: 5173,
    proxy: {
      // Cloudflare Worker running under `wrangler dev` (default port 8787).
      // Leave VITE_SERVER_URL unset in dev so the client uses this same-origin proxy.
      '/ws': { target: 'http://localhost:8787', ws: true, changeOrigin: true },
    },
  },
})
