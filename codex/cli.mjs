import path from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { buildAssetCache } from '../server/src/assetReload.ts';
import { SessionMonitor } from './session-monitor.mjs';
import { startServer } from './server.mjs';

async function main() {
  const { values } = parseArgs({
    options: {
      port: { type: 'string', default: '4877' },
      'sessions-dir': { type: 'string' },
      workspace: { type: 'string' },
      'recent-minutes': { type: 'string', default: '60' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(
      'Codex Pixel Agents — read-only local session viewer\n\nUsage: npm start -- [--workspace PATH] [--port 4877] [--recent-minutes 60]\n  --sessions-dir PATH   Override CODEX_HOME/sessions (for fixtures or custom installs)\n\nOpen the printed URL; continue working in Codex Desktop or CLI.',
    );
    return;
  }
  const port = Number(values.port),
    recentMinutes = Number(values['recent-minutes']);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid --port');
  if (!Number.isFinite(recentMinutes) || recentMinutes <= 0 || recentMinutes > 10080)
    throw new Error('--recent-minutes must be in (0, 10080]');
  const sessionsDir =
    values['sessions-dir'] ||
    path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
  const monitor = new SessionMonitor({ sessionsDir, workspace: values.workspace, recentMinutes });
  const distRoot = __dirname;
  const cache = await buildAssetCache(distRoot, []);
  const server = await startServer({
    monitor,
    cache,
    staticDir: path.join(distRoot, 'webview'),
    port,
  });
  console.log(
    `\nCodex Pixel Agents\nLocal office: ${server.url}\nRead-only session activity; no prompts or tool contents are sent to the browser.\nPress Ctrl+C to stop.\n`,
  );
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await server.app.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
