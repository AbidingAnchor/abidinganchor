import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      manifest: false,
      injectManifest: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        globIgnores: ['**/crossReferences*.js'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
