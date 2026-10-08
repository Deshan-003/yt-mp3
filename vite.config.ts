import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { randomBytes } from 'node:crypto';
export default defineConfig(({ command }) => {
  const nonce = randomBytes(18).toString('base64');
  return {
    plugins: [react(), { name: 'local-dev-csp', transformIndexHtml: html => command === 'serve'
      ? html.replace("script-src 'self'", `script-src 'self' 'nonce-${nonce}'`) : html }],
    html: command === 'serve' ? { cspNonce: nonce } : undefined,
    base: './', publicDir: 'assets/public',
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      watch: { ignored: ['**/resources/**', '**/.tool-downloads/**', '**/release/**', '**/dist/**', '**/dist-electron/**', '**/node_modules.pnpm-backup/**'] }
    }
  };
});

