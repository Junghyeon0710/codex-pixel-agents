# Validation record

Date: 2026-11-06. Local platform: Windows, Node.js 24.14.1.

## Automated checks

| Layer                | Result                 | Scope                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex unit/server    | 13 passed              | Metadata allowlist, native parent links, internal-session filtering, tool lifecycle, UTF-8 partial writes, malformed/oversized lines, incremental append, truncation, recency, workspace filtering, deduplication, handshake order, token/Origin/Host checks, read-only messages, reconnect |
| TypeScript           | Passed                 | Retained backend/core and frontend production build                                                                                                                                                                                                                                         |
| Upstream frontend    | 195 passed in 20 files | Retained renderer, editor and interaction unit tests                                                                                                                                                                                                                                        |
| Production build     | Passed                 | Bundled Codex server and Vite browser application; upstream chunk-size advisory remains                                                                                                                                                                                                     |
| Chromium integration | 1 scenario passed      | Real production server and browser: 2 characters, active tool, completion, third child, refresh, character restoration, removal and mobile viewport; no page exceptions                                                                                                                     |

The browser scenario uses synthetic JSONL fixtures, not an AI model. It verifies actual canvas characters through the upstream test observability hooks, not only text or DOM counts. [preview.png](preview.png) is a screenshot of that browser run, with clearly labeled demo roles.

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
