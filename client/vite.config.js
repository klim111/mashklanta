import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths' // ✅ You were missing this line

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths() 
  ],
})