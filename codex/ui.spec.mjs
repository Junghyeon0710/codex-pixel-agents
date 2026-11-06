import { test, expect } from '@playwright/test';
import { mkdtemp, writeFile, appendFile, rm, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

let dir, child, url;
const record = (type, payload) => JSON.stringify({ type, payload }) + '\n';
const fixture = (id, role, parent) =>
  record('session_meta', {
    id,
    cwd: '/demo/SampleProject',
    agent_role: role,
    source: parent ? { subagent: { thread_spawn: { parent_thread_id: parent } } } : 'cli',
  }) +
  record('turn_context', { model: 'example-model' }) +
  record('event_msg', { type: 'task_started' });
test.beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'codex-pixel-ui-'));
  await writeFile(path.join(dir, 'root.jsonl'), fixture('demo-root', 'Director (demo)'));
  await writeFile(
    path.join(dir, 'code.jsonl'),
    fixture('demo-code', 'Implementation (demo)', 'demo-root'),
  );
  child = spawn(process.execPath, ['dist/codex.cjs', '--port', '0', '--sessions-dir', dir], {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  url = await new Promise((resolve, reject) => {
    let output = '',
      errors = '';
    const timer = setTimeout(() => reject(new Error(`Server startup timeout: ${errors}`)), 20000);
    child.stderr.on('data', (chunk) => {
      errors += chunk;
    });
    child.on('exit', (code) => {
      if (!url) {
        clearTimeout(timer);
        reject(new Error(`Server exited ${code}: ${errors}`));
      }
    });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/Local office: (http:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
});
test.afterAll(async () => {
  if (child && child.exitCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    child.kill();
    await exited;
  }
  if (dir) await rm(dir, { recursive: true, force: true });
});

test('built office renders real characters, follows incremental events and reconnects', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__PIXEL_AGENTS_E2E = true;
  });
  await page.goto(url);
  const panel = page.getByRole('complementary', { name: 'Codex session monitor' });
  await expect(panel).toContainText('2 sessions · 2 active');
  await expect(page.getByTestId('office-canvas')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__pixelAgentsTestHooks?.getCharacters?.().filter((c) => !c.isGreeter).length,
      ),
    )
    .toBe(2);
  await expect(panel).toContainText('↳ Implementation (demo)');
  await appendFile(
    path.join(dir, 'code.jsonl'),
    record('response_item', {
      type: 'function_call',
      call_id: 'demo-tool',
      name: 'exec_command',
      arguments: 'PRIVATE_ARGUMENT_NOT_FOR_BROWSER',
    }),
  );
  await expect(panel).toContainText('exec_command');
  expect(await page.content()).not.toContain('PRIVATE_ARGUMENT_NOT_FOR_BROWSER');
  await appendFile(
    path.join(dir, 'code.jsonl'),
    record('response_item', {
      type: 'function_call_output',
      call_id: 'demo-tool',
      output: 'PRIVATE_RESULT_NOT_FOR_BROWSER',
    }) + record('event_msg', { type: 'task_complete' }),
  );
  await expect(panel).toContainText('2 sessions · 1 active');
  await expect(panel).not.toContainText('exec_command');
  await writeFile(
    path.join(dir, 'review.jsonl'),
    fixture('demo-review', 'Review (demo)', 'demo-root'),
  );
  await expect(panel).toContainText('3 sessions · 2 active');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__pixelAgentsTestHooks?.getCharacters?.().filter((c) => !c.isGreeter).length,
      ),
    )
    .toBe(3);
  await page.reload();
  await expect(panel).toContainText('3 sessions · 2 active');
  await expect
    .poll(() =>
      page.evaluate(
        () => window.__pixelAgentsTestHooks?.getCharacters?.().filter((c) => !c.isGreeter).length,
      ),
    )
    .toBe(3);
  await page.waitForTimeout(2500); // Let spawn animations settle for the documentation image.
  await mkdir('docs/codex', { recursive: true });
  await page.screenshot({ path: 'docs/codex/preview.png' });
  await rm(path.join(dir, 'review.jsonl'));
  await expect(panel).toContainText('2 sessions · 1 active');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
