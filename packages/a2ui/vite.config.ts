import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/a2ui/',
  plugins: [react()],
  build: {
    outDir: '../../dist-vite/a2ui',
    emptyOutDir: true,
  },
})
