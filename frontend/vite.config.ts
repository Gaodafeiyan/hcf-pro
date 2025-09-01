import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('wagmi') || id.includes('viem') || id.includes('@tanstack')) {
              return 'vendor-wagmi';
            }
            if (id.includes('@rainbow-me') || id.includes('@walletconnect') || id.includes('@reown')) {
              return 'vendor-wallet';
            }
            if (id.includes('@metamask') || id.includes('metamask')) {
              return 'vendor-metamask';
            }
            if (id.includes('ethers')) {
              return 'vendor-ethers';
            }
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'vendor-ui';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 3000 // 提高到3MB，消除警告
  }
})
