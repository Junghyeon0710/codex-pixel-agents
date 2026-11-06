import { build } from 'esbuild';
import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await cp('webview-ui/public/assets', 'dist/assets', { recursive: true });
await build({
  entryPoints: ['codex/cli.mjs'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/codex.cjs',
  packages: 'external',
  banner: { js: '#!/usr/bin/env node' },
});
