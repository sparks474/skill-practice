import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages は /skill-practice/ 配下。ローカル開発は /
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  plugins: [react()],
  base,
})
