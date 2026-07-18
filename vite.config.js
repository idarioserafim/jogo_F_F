import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Define que '@' aponta para a pasta 'src'
      '@': path.resolve(__dirname, './src'),
      // Cria atalhos específicos para as pastas que estão dando erro
      '@/lib': path.resolve(__dirname, './src/components/lib'),
      '@/utils': path.resolve(__dirname, './src/components/utils'),
    },
  },
});