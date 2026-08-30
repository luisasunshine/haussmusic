import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    // Sobre divisão de código, uma lição aprendida na marra: uma primeira
    // versão deste arquivo separava react/radix/framer-motion em chunks
    // manuais. O build passava sem um aviso sequer e o app quebrava ao
    // abrir, com "Cannot read properties of undefined (reading
    // 'createContext')" — os chunks manuais tinham criado uma dependência
    // circular, e o pedaço do Radix era avaliado antes do React existir.
    //
    // O ganho real de peso não vinha daí de qualquer forma: vem dos
    // imports dinâmicos (a abertura em three.js e o vinil 3D), que o
    // Rollup separa sozinho, na ordem certa, sem ajuda. Então aqui não há
    // manualChunks de propósito.
    chunkSizeWarningLimit: 900,
  },
});
