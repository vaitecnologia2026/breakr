import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Configuração do Vite para o front do Breakr OS.
// O pacote @breakr/shared aponta para o código-fonte TS (monorepo npm workspaces),
// então criamos um alias para que o Vite resolva e transpile o arquivo diretamente.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@breakr/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 5173,
  },
});
