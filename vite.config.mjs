import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import commonjs from 'vite-plugin-commonjs';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  plugins: [react(), commonjs()],
  base: './',
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
        pinned: path.resolve(__dirname, 'src/renderer/pinned.html')
        // 👆 Removed iphone.html entry
      },
      external: ['@mui/icons-material', '@mui/material']
    }
  }
});
