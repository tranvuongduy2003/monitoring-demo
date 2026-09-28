import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number.parseInt(env.PORT || '5173', 10),
      host: env.VITE_HOST || '0.0.0.0',
      proxy: {
        '/api': {
          target:
            env.services__apiservice__http__0 ||
            env.VITE_API_BASE_URL ||
            'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
