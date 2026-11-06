import catalog from './characters.json';
import type { TempleSession } from './useCodexMonitor.js';

export const characters = catalog;
export type TempleCharacter = (typeof catalog)[number];
export const templeAssetBase = `${import.meta.env.BASE_URL}temple/`;

// Native session identity is independent of status, role, page, discovery order
// and the backend's ephemeral numeric IDs. No browser storage is required.
export function characterFor(session: Pick<TempleSession, 'id' | 'sessionId'>) {
  if (!session.sessionId) return characters[Math.abs(session.id - 1) % characters.length];
  let hash = 2166136261;
  for (let i = 0; i < session.sessionId.length; i++) {
    hash = Math.imul(hash ^ session.sessionId.charCodeAt(i), 16777619);
  }
  return characters[(hash >>> 0) % characters.length];
}
