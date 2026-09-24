import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: parseInt(process.env.PORT || '5173'),
    host: true,
    proxy: {
      '/api': {
        target:
          process.env.services__apiservice__http__0 ||
          process.env.VITE_API_BASE_URL ||
          'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
