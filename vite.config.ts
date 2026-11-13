/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Publicado em https://andrenunes57.github.io/cursinho-agnes-lemos/ (SPEC §12.3).
// A mesma base é usada no dev (http://localhost:5173/cursinho-agnes-lemos/) para pegar
// cedo qualquer erro de caminho/basename.
export default defineConfig({
  base: '/cursinho-agnes-lemos/',
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
