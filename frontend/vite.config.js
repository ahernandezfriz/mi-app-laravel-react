import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // docker-compose sets VITE_API_URL=http://localhost:8080/api for Vite dev.
  // That env leaks into `vite build` and would make production call localhost.
  if (command === 'build' && process.env.VITE_API_URL?.includes('localhost')) {
    process.env.VITE_API_URL = '/api'
  }

  return {
    base: '/app/',
    plugins: [react(), tailwindcss()],
  }
})
