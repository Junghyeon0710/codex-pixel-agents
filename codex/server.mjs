import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import staticFiles from '@fastify/static';
import { randomBytes, timingSafeEqual } from 'node:crypto';

export function activity(s, sessions) {
  const isLead = sessions.some((child) => child.parentAgentId === s.id);
  return [
    {
      type: 'agentTeamInfo',
      id: s.id,
      agentName: `${s.label}${s.model ? ` · ${s.model}` : ''}`,
      leadAgentId: s.parentAgentId,
      isTeamLead: isLead,
    },
    { type: 'agentToolsClear', id: s.id },
    ...s.tools.map((t) => ({
      type: 'agentToolStart',
      id: s.id,
      ...t,
      status: `Running ${t.toolName}`,
    })),
    {
      type: 'agentStatus',
      id: s.id,
      status: s.status === 'idle' ? 'waiting' : s.status,
      awaitingInput: false,
    },
  ];
}
export function initialMessages(cache, sessions) {
  const messages = [
    { type: 'officeAccess', readOnly: true },
    {
      type: 'terminalAvailability',
      available: false,
      reason: 'Read-only Codex session viewer. Start tasks in Codex.',
    },
    {
      type: 'providerCapabilities',
      readingTools: ['read_file', 'view_image', 'web.run'],
      subagentToolNames: [],
    },
    {
      type: 'settingsLoaded',
      soundEnabled: false,
      alwaysShowLabels: false,
      ghostHeadlessAgents: false,
      hooksEnabled: false,
      hooksInfoShown: true,
      lastSeenVersion: '1.5.0',
      watchAllSessions: true,
    },
  ];
  if (cache.characters)
    messages.push({ type: 'characterSpritesLoaded', characters: cache.characters.characters });
  if (cache.pets)
    messages.push({
      type: 'petSpritesLoaded',
      pets: cache.pets.pets,
      petNames: cache.pets.manifests.map((m) => m.name),
    });
  if (cache.floorTiles) messages.push({ type: 'floorTilesLoaded', sprites: cache.floorTiles });
  if (cache.wallTiles) messages.push({ type: 'wallTilesLoaded', sets: cache.wallTiles });
  if (cache.carpetTiles) messages.push({ type: 'carpetTilesLoaded', sets: cache.carpetTiles });
  if (cache.furniture)
    messages.push({
      type: 'furnitureAssetsLoaded',
      catalog: cache.furniture.catalog,
      sprites: Object.fromEntries(cache.furniture.sprites),
    });
  messages.push({
    type: 'existingAgents',
    agents: sessions.map((s) => s.id),
    agentMeta: Object.fromEntries(sessions.map((s) => [s.id, { palette: (s.id - 1) % 6 }])),
    directoryNames: Object.fromEntries(sessions.map((s) => [s.id, s.directoryName])),
  });
  messages.push({ type: 'layoutLoaded', layout: cache.defaultLayout });
  for (const s of sessions) messages.push(...activity(s, sessions));
  return messages;
}

export async function startServer({ monitor, cache, staticDir, port = 4877, intervalMs = 1000 }) {
  const app = Fastify({ logger: false });
  const token = randomBytes(32).toString('hex');
  let origin = '',
    host = '',
    sessions = await monitor.poll(),
    polling = false;
  const sockets = new Set();
  app.addHook('onRequest', async (req, reply) => {
    if (req.headers.host !== host) return reply.code(403).send({ error: 'Invalid host' });
    reply.header('Referrer-Policy', 'no-referrer').header('Cache-Control', 'no-store');
  });
  await app.register(websocket, { options: { maxPayload: 4096 } });
  await app.register(staticFiles, { root: staticDir });
  app.get('/health', async () => ({ ok: true, application: 'codex-pixel-agents' }));
  app.get(
    '/ws',
    {
      websocket: true,
      preValidation: async (req, reply) => {
        const supplied = new URL(req.url, origin).searchParams.get('token') || '';
        const a = Buffer.from(supplied),
          b = Buffer.from(token);
        if (req.headers.origin !== origin || a.length !== b.length || !timingSafeEqual(a, b))
          return reply.code(403).send({ error: 'Open the local URL printed by the CLI' });
      },
    },
    (socket) => {
      let ready = false;
      socket.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        // No shell, filesystem write, settings, hook, terminal or launch handlers.
        if (msg.type !== 'webviewReady') return;
        ready = true;
        sockets.add(socket);
        for (const message of initialMessages(cache, sessions))
          socket.send(JSON.stringify(message));
        socket.send(
          JSON.stringify({ type: 'codexSessions', sessions, diagnostics: monitor.diagnostics }),
        );
      });
      socket.on('close', () => {
        if (ready) sockets.delete(socket);
      });
    },
  );
  let timer;
  app.addHook('preClose', async () => {
    clearInterval(timer);
    for (const s of sockets) s.terminate();
  });
  const address = await app.listen({ host: '127.0.0.1', port });
  origin = address;
  host = new URL(address).host;
  const broadcast = (message) => {
    for (const s of sockets) if (s.readyState === 1) s.send(JSON.stringify(message));
  };
  timer = setInterval(async () => {
    if (polling) return;
    polling = true;
    try {
      const next = await monitor.poll();
      const previous = new Map(sessions.map((s) => [s.id, s]));
      for (const s of sessions)
        if (!next.some((n) => n.id === s.id)) broadcast({ type: 'agentClosed', id: s.id });
      for (const s of next) {
        if (!previous.has(s.id))
          broadcast({
            type: 'agentCreated',
            id: s.id,
            directoryName: s.directoryName,
            palette: (s.id - 1) % 6,
          });
        if (
          JSON.stringify(s) !== JSON.stringify(previous.get(s.id)) ||
          next.length !== sessions.length
        )
          for (const message of activity(s, next)) broadcast(message);
      }
      sessions = next;
      broadcast({ type: 'codexSessions', sessions, diagnostics: monitor.diagnostics });
    } catch {
      broadcast({ type: 'codexMonitorError', message: 'Session scan failed; retrying.' });
    } finally {
      polling = false;
    }
  }, intervalMs);
  return { app, url: `${address}/?token=${token}`, origin, token };
}
