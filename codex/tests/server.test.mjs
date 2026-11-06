import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';
import { startServer, initialMessages } from '../server.mjs';

async function server(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'codex-pixel-server-'));
  await writeFile(path.join(dir, 'index.html'), 'test office');
  const monitor = {
    poll: async () => [
      {
        id: 1,
        label: 'Codex',
        status: 'active',
        tools: [],
        model: 'test',
        directoryName: 'sample',
      },
    ],
    diagnostics: {},
  };
  const s = await startServer({ monitor, cache: {}, staticDir: dir, port: 0, intervalMs: 20 });
  t.after(async () => {
    await s.app.close();
    await rm(dir, { recursive: true, force: true });
  });
  return s;
}
function connect(s, { token = s.token, origin = s.origin } = {}) {
  return new WebSocket(`${s.origin.replace('http', 'ws')}/ws?token=${token}`, { origin });
}
test('layout handshake orders agents before layout and activity after it', () => {
  const messages = initialMessages({}, [{ id: 1, tools: [], label: 'Codex', status: 'idle' }]);
  const types = messages.map((m) => m.type);
  assert.ok(types.indexOf('existingAgents') < types.indexOf('layoutLoaded'));
  assert.ok(types.indexOf('agentStatus') > types.indexOf('layoutLoaded'));
  assert.equal(messages.find((m) => m.type === 'officeAccess').readOnly, true);
});
test('server rejects foreign hosts, untrusted origins and missing/wrong token', async (t) => {
  const s = await server(t);
  const rebound = await s.app.inject({ url: '/health', headers: { host: 'attacker.example' } });
  assert.equal(rebound.statusCode, 403);
  for (const options of [
    { token: '' },
    { token: 'wrong' },
    { origin: 'https://attacker.example' },
  ]) {
    await new Promise((resolve, reject) => {
      const ws = connect(s, options);
      ws.on('open', () => {
        ws.close();
        reject(new Error('Unauthorized socket accepted'));
      });
      ws.on('unexpected-response', (_req, res) => {
        assert.equal(res.statusCode, 403);
        ws.terminate();
        resolve();
      });
      ws.on('error', () => {});
    });
  }
});
test('authenticated client receives state; mutations are ignored; reconnect restores state', async (t) => {
  const s = await server(t);
  for (let i = 0; i < 2; i++) {
    const messages = await new Promise((resolve, reject) => {
      const ws = connect(s),
        received = [];
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error('Handshake timed out'));
      }, 3000);
      ws.on('error', reject);
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'launchAgent', command: 'NEVER_EXECUTE' }));
        ws.send('{bad');
        ws.send(JSON.stringify({ type: 'webviewReady' }));
      });
      ws.on('message', (data) => {
        const m = JSON.parse(data);
        received.push(m);
        if (m.type === 'codexSessions') {
          clearTimeout(timeout);
          ws.close();
          resolve(received);
        }
      });
    });
    assert.ok(messages.some((m) => m.type === 'existingAgents' && m.agents[0] === 1));
    assert.equal(
      messages.some((m) => m.type === 'terminalSessionOpened'),
      false,
    );
  }
});
