import { readdir, stat, open } from 'node:fs/promises';
import path from 'node:path';

const clean = (v, max = 90) =>
  typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f]/g, '').slice(0, max) : '';
export function newSession() {
  return {
    sessionId: '',
    parentId: '',
    cwd: '',
    role: 'Codex',
    model: '',
    status: 'unknown',
    lastActivityMs: 0,
    tools: new Map(),
  };
}

// Deliberately allowlist metadata. Never retain messages, arguments, results or tokens.
export function reduceRecord(s, record) {
  const p = record?.payload;
  if (!p || typeof p !== 'object') return;
  // Windows가 열린 로그의 수정 시각을 지연해도 실제 기록 시각으로 활동을 판단한다.
  if (['event_msg', 'response_item', 'turn_context'].includes(record.type)) {
    const timestamp = typeof record.timestamp === 'string' ? Date.parse(record.timestamp) : NaN;
    if (Number.isFinite(timestamp) && timestamp <= Date.now())
      s.lastActivityMs = Math.max(s.lastActivityMs, timestamp);
  }
  if (record.type === 'session_meta') {
    if (s.sessionId) return; // Forked history cannot replace this file's identity.
    s.sessionId = clean(p.id, 128);
    s.cwd = typeof p.cwd === 'string' ? p.cwd : '';
    const spawn = p.source?.subagent?.thread_spawn;
    s.parentId = clean(spawn?.parent_thread_id || p.parent_thread_id, 128);
    s.internal = !!p.source?.subagent && !spawn;
    s.role =
      clean(p.agent_role || spawn?.agent_role || p.agent_nickname || spawn?.agent_nickname) ||
      'Codex';
  } else if (record.type === 'turn_context') {
    s.model = clean(p.model);
  } else if (record.type === 'event_msg') {
    if (p.type === 'task_started' || p.type === 'user_message') {
      s.status = 'active';
      s.tools.clear();
    } else if (['task_complete', 'turn_aborted', 'shutdown_complete'].includes(p.type)) {
      s.status = p.type === 'turn_aborted' ? 'interrupted' : 'idle';
      s.tools.clear();
    }
  } else if (record.type === 'response_item') {
    if (['function_call', 'custom_tool_call'].includes(p.type)) {
      const id = clean(p.call_id, 160),
        name = clean(p.name);
      if (id && name) {
        s.tools.set(id, name);
        s.status = 'active';
      }
      // Bound memory even for malformed transcripts with missing outputs.
      if (s.tools.size > 64) s.tools.delete(s.tools.keys().next().value);
    } else if (['function_call_output', 'custom_tool_call_output'].includes(p.type)) {
      s.tools.delete(clean(p.call_id, 160));
    }
  }
}

async function collect(dir, result, depth = 0) {
  if (depth > 4) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const file = path.join(dir, e.name);
    if (e.isDirectory()) await collect(file, result, depth + 1);
    else if (e.isFile() && e.name.endsWith('.jsonl')) {
      try {
        const info = await stat(file);
        result.push({ file, info });
      } catch {
        /* rotated */
      }
    }
  }
}

export class SessionMonitor {
  constructor({ sessionsDir, workspace, recentMinutes = 60, maxAgents = 24 }) {
    this.sessionsDir = path.resolve(sessionsDir);
    this.workspace = workspace ? path.resolve(workspace) : null;
    this.recentMs = recentMinutes * 60_000;
    this.maxAgents = maxAgents;
    this.files = new Map();
    this.ids = new Map();
    this.nextId = 1;
    this.diagnostics = { candidates: 0, skippedLargeFiles: 0, readErrors: 0, malformedLines: 0 };
  }
  async poll(now = Date.now()) {
    const candidates = [];
    await collect(this.sessionsDir, candidates);
    const recent = candidates.sort((a, b) => b.info.mtimeMs - a.info.mtimeMs).slice(0, 200);
    this.diagnostics.candidates = recent.length;
    this.diagnostics.skippedLargeFiles = 0;
    const keep = new Set(recent.map((x) => x.file));
    for (const file of this.files.keys()) if (!keep.has(file)) this.files.delete(file);
    const sessions = new Map();
    const activityTimes = new Map();
    for (const { file, info } of recent) {
      let cursor = this.files.get(file);
      if (
        !cursor ||
        info.size < cursor.offset ||
        info.ino !== cursor.ino ||
        (info.size === cursor.offset && info.mtimeMs !== cursor.mtime)
      ) {
        cursor = {
          offset: 0,
          pending: Buffer.alloc(0),
          dropping: false,
          ino: info.ino,
          state: newSession(),
        };
        this.files.set(file, cursor);
      }
      if (!cursor.offset && info.size > 64 * 1024 * 1024) {
        this.diagnostics.skippedLargeFiles++;
        continue;
      }
      try {
        const handle = await open(file, 'r');
        try {
          // Initial replay is streamed, never loading a complete transcript into memory.
          while (cursor.offset < info.size) {
            const chunk = Buffer.alloc(Math.min(256 * 1024, info.size - cursor.offset));
            const { bytesRead } = await handle.read(chunk, 0, chunk.length, cursor.offset);
            if (!bytesRead) break;
            cursor.offset += bytesRead;
            let data = Buffer.concat([cursor.pending, chunk.subarray(0, bytesRead)]);
            let newline;
            while ((newline = data.indexOf(10)) >= 0) {
              const line = data.subarray(0, newline);
              data = data.subarray(newline + 1);
              if (!cursor.dropping && line.length <= 2 * 1024 * 1024) {
                try {
                  reduceRecord(cursor.state, JSON.parse(line.toString('utf8')));
                } catch {
                  this.diagnostics.malformedLines++;
                }
              }
              cursor.dropping = false;
            }
            if (data.length > 2 * 1024 * 1024) {
              cursor.dropping = true;
              data = Buffer.alloc(0);
            }
            cursor.pending = Buffer.from(data);
          }
        } finally {
          await handle.close();
        }
        cursor.mtime = info.mtimeMs;
      } catch {
        this.diagnostics.readErrors++;
        continue;
      }
      const s = cursor.state;
      // 시작 시에도 최대 200개 후보에서 기록 시각을 확인한 뒤 표시 기간을 적용한다.
      const lastActivity = Math.max(info.mtimeMs, Math.min(now, s.lastActivityMs));
      if (now - lastActivity > this.recentMs) continue;
      const normalize = (v) =>
        process.platform === 'win32' ? path.resolve(v).toLowerCase() : path.resolve(v);
      if (
        !s.sessionId ||
        s.internal ||
        (this.workspace && (!s.cwd || normalize(s.cwd) !== normalize(this.workspace)))
      )
        continue;
      if (!this.ids.has(s.sessionId)) this.ids.set(s.sessionId, this.nextId++);
      // 활동 기록은 프로세스 생존을 보증하지 않으며 5분 동안 기록이 없으면 오래됨으로 표시한다.
      const status = s.status === 'active' && now - lastActivity > 5 * 60_000 ? 'stale' : s.status;
      if (!sessions.has(s.sessionId)) {
        activityTimes.set(s.sessionId, lastActivity);
        sessions.set(s.sessionId, {
          id: this.ids.get(s.sessionId),
          sessionId: s.sessionId,
          parentId: s.parentId,
          label: s.role,
          model: s.model,
          status,
          directoryName: s.cwd ? path.basename(s.cwd.replaceAll('\\', '/')) : 'Codex',
          tools:
            status === 'active'
              ? [...s.tools].map(([toolId, toolName]) => ({ toolId, toolName }))
              : [],
        });
      }
    }
    // 수정 시각이 지연된 현재 작업도 실제 활동 순서로 표시 한도 안에 배치한다.
    const visible = [...sessions.values()]
      .sort((a, b) => activityTimes.get(b.sessionId) - activityTimes.get(a.sessionId))
      .slice(0, this.maxAgents);
    // Keep the identity cache bounded too; IDs remain stable while a session is visible.
    const visibleIds = new Set(visible.map((s) => s.sessionId));
    for (const id of this.ids.keys()) if (!visibleIds.has(id)) this.ids.delete(id);
    return visible.map((s) => ({ ...s, parentAgentId: this.ids.get(s.parentId) }));
  }
}
