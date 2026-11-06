import './index.css';
import './temple/temple.css';
// Bundled by Vite into the SPA's own CSS — the standalone server must serve
// every asset itself (no CDN).
import '@xterm/xterm/css/xterm.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import { CodexShell } from './components/CodexShell.js';
import { isBrowserRuntime } from './runtime';
import { TempleView } from './temple/TempleView.js';

async function main() {
  // browserMock is for Vite dev mode only (UI prototyping without a server).
  // In standalone server mode, assets are loaded server-side and sent over WebSocket.
  if (isBrowserRuntime && import.meta.env.DEV && import.meta.env.MODE !== 'codex') {
    const { initBrowserMock } = await import('./browserMock.js');
    await initBrowserMock();
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {import.meta.env.MODE === 'codex' ? (
        <CodexShell>
          <TempleView />
        </CodexShell>
      ) : (
        <App />
      )}
    </StrictMode>,
  );
}

main().catch(console.error);
