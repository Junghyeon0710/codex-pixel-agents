import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, appendFile, rm, utimes } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { newSession, reduceRecord, SessionMonitor } from '../session-monitor.mjs';

const rec = (type, payload) => ({ type, payload });
const meta = (id = 'root', extra = {}) => rec('session_meta', { id, cwd: '/project', ...extra });
const event = (type) => rec('event_msg', { type });
const call = (type, extra = {}) =>
  rec('response_item', { type, call_id: 'call-1', name: 'exec_command', ...extra });
const lines = (...items) => items.map((v) => JSON.stringify(v)).join('\n') + '\n';
async function fixture(t, options = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'codex-pixel-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return {
    dir,
    file: path.join(dir, 'rollout.jsonl'),
    monitor: new SessionMonitor({ sessionsDir: dir, ...options }),
  };
}

test('records metadata and native parent relationship, without transcript content', () => {
  const s = newSession();
  reduceRecord(
    s,
    meta('child', {
      agent_role: 'reviewer',
      source: { subagent: { thread_spawn: { parent_thread_id: 'root' } } },
    }),
  );
  reduceRecord(s, rec('turn_context', { model: 'test-model', secret: 'PRIVATE' }));
  reduceRecord(s, call('function_call', { arguments: 'PRIVATE' }));
  reduceRecord(s, rec('response_item', { type: 'message', content: 'PRIVATE' }));
  assert.equal(s.parentId, 'root');
  assert.equal(s.role, 'reviewer');
  assert.equal(s.model, 'test-model');
  assert.equal(JSON.stringify(s).includes('PRIVATE'), false);
});
test('function and custom tool lifecycle, turn completion and interruption', () => {
  const s = newSession();
  for (const type of ['function_call', 'custom_tool_call']) {
    reduceRecord(s, call(type));
    assert.equal(s.status, 'active');
    assert.equal(s.tools.size, 1);
    reduceRecord(s, call(`${type}_output`));
    assert.equal(s.tools.size, 0);
  }
  reduceRecord(s, call('function_call'));
  reduceRecord(s, event('task_complete'));
  assert.equal(s.status, 'idle');
  assert.equal(s.tools.size, 0);
  reduceRecord(s, event('task_started'));
  assert.equal(s.status, 'active');
  reduceRecord(s, event('turn_aborted'));
  assert.equal(s.status, 'interrupted');
});
test('ignores unknown shapes and does not invent agents from a spawn tool', () => {
  const s = newSession();
  for (const record of [
    null,
    {},
    { payload: 2 },
    rec('unknown', {}),
    call('function_call', { name: 'spawn_agent' }),
  ])
    reduceRecord(s, record);
  assert.equal(s.sessionId, '');
  assert.equal(s.parentId, '');
});
test('incremental append, partial UTF-8 JSON, malformed line recovery and stable IDs', async (t) => {
  const { file, monitor } = await fixture(t);
  await writeFile(file, lines(meta(), event('task_started')));
  const first = await monitor.poll();
  assert.equal(first.length, 1);
  const bytes = Buffer.from(lines(call('function_call', { name: '읽기' })));
  const split = bytes.indexOf(Buffer.from('읽기')) + 1;
  await appendFile(file, bytes.subarray(0, split));
  assert.equal((await monitor.poll())[0].tools.length, 0);
  await appendFile(file, bytes.subarray(split));
  assert.equal((await monitor.poll())[0].tools[0].toolName, '읽기');
  await appendFile(file, 'not-json\n' + lines(event('task_complete')));
  const last = (await monitor.poll())[0];
  assert.equal(last.status, 'idle');
  assert.equal(last.id, first[0].id);
  assert.equal(monitor.diagnostics.malformedLines, 1);
});
test('truncation replays a replacement session without retaining old tools', async (t) => {
  const { file, monitor } = await fixture(t);
  await writeFile(file, lines(meta(), call('function_call'), event('task_started')));
  await monitor.poll();
  await writeFile(file, lines(meta('replacement')));
  const result = await monitor.poll();
  assert.equal(result[0].sessionId, 'replacement');
  assert.equal(result[0].tools.length, 0);
});
test('workspace filter and missing sessions directory are safe', async (t) => {
  const { dir, file, monitor } = await fixture(t, { workspace: '/another-project' });
  await writeFile(file, lines(meta()));
  assert.deepEqual(await monitor.poll(), []);
  assert.deepEqual(await new SessionMonitor({ sessionsDir: path.join(dir, 'missing') }).poll(), []);
});
test('stale active state is distinguished from live work, and expired files disappear', async (t) => {
  const { file, monitor } = await fixture(t, { recentMinutes: 20 });
  await writeFile(file, lines(meta(), call('function_call')));
  const old = new Date(Date.now() - 6 * 60_000);
  await utimes(file, old, old);
  const s = (await monitor.poll())[0];
  assert.equal(s.status, 'stale');
  assert.deepEqual(s.tools, []);
  assert.deepEqual(await monitor.poll(Date.now() + 30 * 60_000), []);
});
test('native child sessions map to the parent, duplicates do not create extra characters', async (t) => {
  const { dir, file, monitor } = await fixture(t);
  await writeFile(file, lines(meta()));
  await writeFile(
    path.join(dir, 'child.jsonl'),
    lines(meta('child', { source: { subagent: { thread_spawn: { parent_thread_id: 'root' } } } })),
  );
  await writeFile(path.join(dir, 'duplicate.jsonl'), lines(meta()));
  const sessions = await monitor.poll();
  assert.equal(sessions.length, 2);
  assert.equal(
    sessions.find((s) => s.sessionId === 'child').parentAgentId,
    sessions.find((s) => s.sessionId === 'root').id,
  );
});
test('oversized lines are skipped without leaking content or breaking the next record', async (t) => {
  const { file, monitor } = await fixture(t);
  await writeFile(
    file,
    lines(meta()) + 'x'.repeat(3 * 1024 * 1024) + '\n' + lines(event('task_complete')),
  );
  assert.equal((await monitor.poll())[0].status, 'idle');
});
test('internal approval sessions are excluded; top-level parent metadata is supported', async (t) => {
  const { dir, file, monitor } = await fixture(t);
  await writeFile(file, lines(meta('guardian', { source: { subagent: { other: 'guardian' } } })));
  await writeFile(path.join(dir, 'parent.jsonl'), lines(meta()));
  await writeFile(
    path.join(dir, 'child.jsonl'),
    lines(meta('child', { parent_thread_id: 'root', source: { subagent: { thread_spawn: {} } } })),
  );
  const sessions = await monitor.poll();
  assert.equal(sessions.length, 2);
  assert.equal(
    sessions.some((s) => s.sessionId === 'guardian'),
    false,
  );
  assert.equal(
    sessions.find((s) => s.sessionId === 'child').parentAgentId,
    sessions.find((s) => s.sessionId === 'root').id,
  );
});
