# Validation record

Date: 2026-11-06. Local platform: Windows, Node.js 24.14.1.

## Windows session-log timestamp correction

A native ongoing Codex Desktop task appended current records while its JSONL file retained an approximately ten-minute-old filesystem modification time. The original viewer showed that active task as stale. This observation concerns the viewer's log handling, not the project being developed.

Two synthetic regressions freeze the file modification time with `utimes`: initial discovery with a filesystem modification time outside the recency window, and incremental writes to an already discovered stale log. Both failed against upstream commit `7ac9970`: the first session was omitted and the second remained stale. The correction uses valid, non-future record timestamps alongside filesystem time, and applies recency after replay. Sessions are ranked by activity before the display limit is applied.

Additional coverage checks genuine inactivity and expiry, unchanged session IDs, completion, invalid/future/out-of-order timestamps, and activity ordering when the display limit is reached. No transcript contents or machine-specific paths are included in the fixtures. Existing replay-size and 200-file candidate limits remain; candidate selection still uses filesystem modification time.

The locally installed corrected viewer displayed the ongoing native task as active. This is a live root-session observation, not a new multi-agent run. For this correction, all 17 Codex parser/server tests, backend/core TypeScript checks, the production build (including frontend TypeScript), and git diff --check passed on Windows. The existing bundle-size advisory remains non-fatal. Historical frontend and browser runs below are separate evidence, not reruns of those suites for this patch.

## Activity-order selection test follow-up

The timestamp correction changed list ordering to activity time. CI then exposed a test assumption: the first session-list row was expected to occupy page 1, while the hall intentionally places characters by numeric ID. The production selection code correctly navigated to page 2 for the selected character. The browser test now derives the expected page from that selected ID and verifies its visibility and selected state. All four Chromium scenarios passed locally on Windows after this test correction, using synthetic sessions in an isolated output directory.

## Publication verification: temple, localization and eight appearances

The final local checkout passed 13 Codex parser/server tests, 195 retained frontend tests in 20 files, all four Chromium integration scenarios, backend/core and frontend TypeScript checks, changed-file ESLint, the production build and `git diff --check`. The existing bundle-size advisory is non-fatal. Browser fixtures cover all eight appearances in the actual hall, their work/rest transitions and the separate character gallery.

A separate production Chrome viewer read existing native `unreal-codex-studio` records with a seven-day recency window. It rendered 15 sessions across two pages (8 + 7): 13 idle and 2 interrupted. Seven of the eight catalog appearances were assigned to those real session IDs, and the DOM referenced the corresponding new production atlases. Tea, reading and stationary interrupted poses were observed; the browser reported no console errors. No transcript was edited or fabricated for this check, and no new AI task was launched. This is native-record replay, not proof of a freshly running team or of task success.

The scanner also reported one transcript above the existing 64 MiB replay limit. That file was skipped with a visible warning; the 15 displayed sessions still rendered correctly. Session IDs, raw records, private local paths and token URLs are excluded from the published evidence. See [sanitized result](temple-native-replay.json).

## Lantern Hall application

The Codex production viewer now renders the user-selected lantern temple with charcoal/brass controls and a transparent sprite atlas. The generated background contains no baked-in characters. Every visible character is driven by the existing session metadata stream.

Current checks passed:

- 13 Codex parser/server tests; backend/core TypeScript checks; frontend TypeScript build; changed frontend files lint; `git diff --check`.
- Production `npm run build`. On this Windows machine esbuild required execution outside the filesystem sandbox to read its ancestor directory. The build completed with the existing chunk-size advisory.
- 3 Chromium integration scenarios: incremental tool/turn updates and privacy, English/Korean controls and persistence, blocked browser storage, 24 active sessions across 2 pages, 24 resting sessions across 3 pages, list-to-character selection, interruption, animation pose changes, pause/resume, reduced motion, an actual WebSocket disconnect/reconnect, zoom, empty state and 390px mobile layout. No page exceptions were recorded. The population scenario was repeated after allowing the movement transition to settle for screenshots.
- Visual inspection of the production Chrome tab confirmed the charcoal/brass menu and the new empty hall. Its existing studio-workspace filter and 30-minute window had zero recent sessions; these settings were preserved. No new native Codex agent task was launched for this UI change.

`preview.png`, `preview-ko.png`, `temple-active-population.png` and `temple-rest-population.png` now show the temple build using **synthetic transcripts**. They are browser-rendered results, not generated mockup images or evidence of a newly launched AI team. The earlier native runtime evidence below remains historical.

## Menu and Korean language follow-up

The menu update passed 13 Codex unit/server tests, TypeScript checks, production build,
and 2 Chromium scenarios. The expanded browser scenario verifies English defaults,
Korean status/role text, unchanged model identifiers, language persistence after reload,
help text, hiding/reopening the session list while records change, switching back to English,
and a 390px mobile viewport without horizontal overflow. A second scenario verifies that
language selection still works when browser storage throws a SecurityError.

The existing local Chrome viewer was refreshed, switched to Korean, reloaded, and visually
inspected with the Korean help menu open. Its project filter had no recent sessions at that
time; character activity was exercised separately in the synthetic Chromium scenario.
[preview-ko.png](preview-ko.png) and the updated English preview use synthetic sessions.
These UI changes do not launch agents or modify Codex settings. The earlier native and
upstream test records below remain historical results; no new AI task was needed for this update.

## Eight-character appearance update

The appearance catalog contains eight distinct atlases, each with 12 poses (96 frames total). `node codex/temple-atlas.mjs` verified true transparency and nonempty, padded bounds in every frame. Source art is unchanged by metadata extraction.

The production build, TypeScript and changed-file ESLint checks passed. All four Chromium integration scenarios passed. They cover localized character previews, all eight asset URLs, pose selection, mobile layout, session lifecycle and the 24-session synthetic population. The population fixture exercises eight appearances and preserves assignments when workers switch to rest. These are synthetic UI fixtures, not newly launched AI tasks.

The existing local Chrome viewer was also visually inspected with all eight characters in full-bow and front-facing scroll poses. Its gallery has no browser console errors and explicitly distinguishes previews from live sessions. The gallery screenshot is [temple-characters.png](temple-characters.png).

## Historical initial automated checks

| Layer                | Result                 | Scope                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex unit/server    | 13 passed              | Metadata allowlist, native parent links, internal-session filtering, tool lifecycle, UTF-8 partial writes, malformed/oversized lines, incremental append, truncation, recency, workspace filtering, deduplication, handshake order, token/Origin/Host checks, read-only messages, reconnect |
| TypeScript           | Passed                 | Retained backend/core and frontend production build                                                                                                                                                                                                                                         |
| Upstream frontend    | 195 passed in 20 files | Retained renderer, editor and interaction unit tests                                                                                                                                                                                                                                        |
| Production build     | Passed                 | Bundled Codex server and Vite browser application; upstream chunk-size advisory remains                                                                                                                                                                                                     |
| Chromium integration | 1 scenario passed      | Real production server and browser: 2 characters, active tool, completion, third child, refresh, character restoration, removal and mobile viewport; no page exceptions                                                                                                                     |

The initial browser scenario used synthetic JSONL fixtures, not an AI model, and verified office canvas characters through the upstream test hooks. The preview images have since been replaced by the current temple browser run described above.

## Fresh native Codex smoke test

A new **Codex CLI 0.167.0-alpha.3.2** session ran in an isolated local test directory, using a read-only sandbox and ordinary approval review. It read a harmless file, waited briefly so the monitor could sample the tool state, then returned `CODEX_PIXEL_LIVE_OK`.

The actual monitor observed:

1. A new active session.
2. Recorded model `gpt-6.1-sol`.
3. Native tool name `exec` becoming active.
4. The tool ending.
5. The session becoming idle.

Process exit code was 0. The final token matched. See [sanitized machine-readable result](live-smoke.json). This proves a fresh CLI transcript was detected and updated; it does not prove every Codex version or every tool schema is compatible. The `exec` wrapper's nested command is intentionally not inspected.

## Existing native multi-agent replay

The monitor also read four existing native sessions from a prior controlled model-resolution test: one parent and three children. All three child links resolved to the parent, and the recorded Astra/Sol models were preserved. See [sanitized result](native-team-replay.json).

This was a replay of existing real records, **not** a newly launched multi-agent task. Internal approval sessions in the same session store were excluded. Desktop-style metadata was inspected for compatibility; no native Codex UI extension was installed or tested.

## Reproduce

Run the commands in the main README. CI repeats automated checks on Windows and Ubuntu without model calls or account secrets. A native smoke test requires a working authenticated Codex installation: start the viewer for an isolated workspace, ask Codex to read a harmless file, and observe the active/tool/idle sequence.

Raw transcripts, user messages, local absolute paths, authentication data and server token URLs are deliberately excluded from this repository. Only sanitized summaries and synthetic screenshots are published.
