import { test, expect } from '@playwright/test';
import { mkdtemp, writeFile, appendFile, rm, mkdir, readdir } from 'node:fs/promises';
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
    fixture('demo-code', 'code-implementer', 'demo-root'),
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

test('temple renders recorded agents, follows activity and preserves locale', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.__PIXEL_AGENTS_E2E = true;
  });
  await page.goto(url);
  const panel = page.getByRole('complementary', { name: 'Codex session monitor' });
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(panel).toContainText('2 sessions · 2 active');
  await expect(page.getByTestId('temple-scene')).toBeVisible();
  await expect(page.locator('.temple-agent')).toHaveCount(2);
  await expect(panel).toContainText('↳ code-implementer');
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
  await expect(page.locator('.temple-agent[data-state=idle]')).toHaveAttribute('data-zone', 'rest');
  await writeFile(
    path.join(dir, 'review.jsonl'),
    fixture('demo-review', 'Review (demo)', 'demo-root'),
  );
  await expect(panel).toContainText('3 sessions · 2 active');
  await expect(page.locator('.temple-agent')).toHaveCount(3);
  await page.reload();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(panel).toContainText('3 sessions · 2 active');
  await expect(page.locator('.temple-agent')).toHaveCount(3);
  await page.waitForTimeout(2500); // Let spawn animations settle for the documentation image.
  await mkdir('docs/codex', { recursive: true });
  await page.screenshot({ path: 'docs/codex/preview.png' });
  const language = page.getByRole('combobox', { name: 'Language / 언어' });
  await language.selectOption('ko');
  const koreanPanel = page.getByRole('complementary', { name: 'Codex 세션 모니터' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(koreanPanel).toContainText('세션 3개 · 작업 중 2개');
  await expect(koreanPanel).toContainText('↳ 코드 구현');
  await expect(koreanPanel).toContainText('example-model');
  await page.getByText('사용 안내', { exact: true }).first().click();
  await expect(page.getByRole('region', { name: '사용 안내' })).toContainText(
    '작업 성공을 보장하지 않아요',
  );
  await page.getByText('사용 안내', { exact: true }).first().click();
  await page.getByRole('button', { name: '세션 목록' }).click();
  await expect(koreanPanel).toBeHidden();
  await rm(path.join(dir, 'review.jsonl'));
  await page.getByRole('button', { name: '세션 목록' }).click();
  await expect(koreanPanel).toContainText('세션 2개 · 작업 중 1개');
  await page.reload();
  await page.getByRole('button', { name: '세션 목록', exact: true }).click();
  await expect(language).toHaveValue('ko');
  await expect(koreanPanel).toContainText('세션 2개 · 작업 중 1개');
  await page.screenshot({ path: 'docs/codex/preview-ko.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(language).toBeVisible();
  await expect(koreanPanel).toBeVisible();
  await expect(page.getByRole('navigation', { name: '뷰어 메뉴' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await language.selectOption('en');
  await expect(panel).toContainText('2 sessions · 1 active');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(panel).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('language selection works when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
    Storage.prototype.setItem = () => {
      throw new DOMException('Blocked', 'SecurityError');
    };
  });
  await page.goto(url);
  const language = page.getByRole('combobox', { name: 'Language / 언어' });
  await expect(language).toHaveValue('en');
  await language.selectOption('ko');
  await page.getByRole('button', { name: '세션 목록', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Codex 세션 모니터' })).toBeVisible();
});

test('eight character previews show real atlases and localized poses', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'Characters', exact: true }).click();
  const gallery = page.getByRole('dialog', { name: 'Eight temple characters' });
  await expect(gallery).toBeVisible();
  await expect(gallery.locator('figure')).toHaveCount(8);
  const files = await gallery
    .locator('image')
    .evaluateAll((images) => images.map((image) => image.getAttribute('href')));
  expect(new Set(files).size).toBe(8);
  for (const file of files)
    expect((await page.request.get(new URL(file, url).href)).ok()).toBe(true);
  await page.getByLabel('Preview pose', { exact: true }).selectOption('4');
  await expect(gallery.locator('figure[data-pose="4"]')).toHaveCount(8);
  await page.getByLabel('Preview pose', { exact: true }).selectOption('11');
  await page.getByRole('button', { name: 'Close gallery' }).click();
  await expect(gallery).not.toBeVisible();
  await page.getByRole('combobox', { name: 'Language / 언어' }).selectOption('ko');
  await page.getByRole('button', { name: '캐릭터', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '법당 캐릭터 8종' })).toContainText('남색 · 은발');
  await page.screenshot({ path: 'docs/codex/temple-characters.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: '캐릭터 창 닫기' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '법당 캐릭터 8종' })).not.toBeVisible();
});

test('variable population, motion, selection, disconnect and empty hall', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const file of await readdir(dir)) await rm(path.join(dir, file));
  for (let i = 0; i < 24; i++) {
    await writeFile(
      path.join(dir, `population-${i}.jsonl`),
      fixture(`population-${i}`, `Agent ${i + 1}`),
    );
  }
  const upstreamSockets = [];
  let networkBlocked = false;
  await page.routeWebSocket('**/ws?*', (socket) => {
    if (networkBlocked) {
      socket.close();
      return;
    }
    upstreamSockets.push(socket.connectToServer());
  });
  await page.goto(url);
  await expect(page.locator('.temple-counts')).toContainText('Working 24');
  await expect(page.locator('.temple-agent')).toHaveCount(12);
  await expect(page.locator('.temple-page-controls')).toContainText('1 / 2');
  const first = page.locator('.temple-agent').first();
  const character = await first.getAttribute('data-character');
  const pose = await first.getAttribute('data-pose');
  await expect.poll(() => first.getAttribute('data-pose')).not.toBe(pose);
  await expect(first).toHaveAttribute('data-character', character);
  const appearances = await page
    .locator('.temple-agent')
    .evaluateAll((elements) =>
      Object.fromEntries(elements.map((el) => [el.dataset.testid, el.dataset.character])),
    );
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(first).toHaveAttribute('data-animated', 'false');
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await first.click();
  await expect(page.getByRole('complementary', { name: 'Agent details' })).toContainText(
    'example-model',
  );
  await page.getByRole('button', { name: 'Close agent', exact: true }).click();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.temple-agent')).toHaveCount(12);
  await expect(page.locator('.temple-page-controls')).toContainText('2 / 2');
  Object.assign(
    appearances,
    await page
      .locator('.temple-agent')
      .evaluateAll((elements) =>
        Object.fromEntries(elements.map((el) => [el.dataset.testid, el.dataset.character])),
      ),
  );
  expect(new Set(Object.values(appearances)).size).toBe(8);
  await page.screenshot({ path: 'docs/codex/temple-active-population.png' });
  for (let i = 0; i < 24; i++)
    await appendFile(
      path.join(dir, `population-${i}.jsonl`),
      record('event_msg', { type: 'task_complete' }),
    );
  await expect(page.locator('.temple-counts')).toContainText('Working 0');
  await expect(page.locator('.temple-agent')).toHaveCount(8);
  await expect(page.locator('.temple-agent[data-zone=prayer]')).toHaveCount(0);
  await expect(page.locator('.temple-page-controls')).toContainText('2 / 3');
  for (const element of await page.locator('.temple-agent').all()) {
    expect(await element.getAttribute('data-character')).toBe(
      appearances[await element.getAttribute('data-testid')],
    );
  }
  await page.waitForTimeout(750); // Capture the resting layout after its 650ms position transition.
  await page.screenshot({ path: 'docs/codex/temple-rest-population.png' });
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.locator('.temple-agent')).toHaveCount(8);
  for (const element of await page.locator('.temple-agent').all()) {
    expect(await element.getAttribute('data-character')).toBe(
      appearances[await element.getAttribute('data-testid')],
    );
  }
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(page.locator('.codex-sessions li')).toHaveCount(24);
  await page.locator('.codex-session-select').first().click();
  await expect(page.getByRole('complementary', { name: 'Agent details' })).toBeVisible();
  await expect(page.locator('.temple-page-controls')).toContainText('1 / 3');
  await page.getByRole('button', { name: 'Close agent', exact: true }).click();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await appendFile(
    path.join(dir, 'population-0.jsonl'),
    record('event_msg', { type: 'turn_aborted' }),
  );
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await page.locator('.codex-session-select').getByText('Agent 1', { exact: true }).click();
  await page.getByRole('button', { name: 'Close agent', exact: true }).click();
  await page.getByRole('button', { name: 'Sessions', exact: true }).click();
  await expect(page.locator('.temple-agent[data-state=interrupted]')).toHaveAttribute(
    'data-animated',
    'false',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.temple-agent[data-animated=true]')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Close the actual proxied socket. The new handshake must restore sessions.
  networkBlocked = true;
  upstreamSockets.at(-1).close();
  await expect(page.locator('.temple-live')).toHaveAttribute('data-live', 'false');
  await expect(page.locator('.temple-agent[data-animated=true]')).toHaveCount(0);
  networkBlocked = false;
  await expect.poll(() => upstreamSockets.length).toBeGreaterThan(1);
  await expect(page.locator('.temple-live')).toHaveAttribute('data-live', 'true');
  await expect(page.locator('.temple-agent')).toHaveCount(8);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fit scene', exact: true })).toHaveText('125%');
  await page.getByRole('button', { name: 'Fit scene', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeVisible();
  for (const file of await readdir(dir)) await rm(path.join(dir, file));
  await expect(page.locator('.temple-empty')).toBeVisible();
  await expect(page.locator('.temple-agent')).toHaveCount(0);
  expect(errors).toEqual([]);
});
