import type { TempleSession } from './useCodexMonitor.js';

export type TempleFilter = 'all' | 'active' | 'rest' | 'leads';
export type TempleZone = 'prayer' | 'rest' | 'lead';
export const CAPACITY = { prayer: 12, rest: 8, lead: 2 };
export const WIDTH = 1672;
export const HEIGHT = 941;

export function isLead(session: TempleSession, sessions: TempleSession[]) {
  return (
    session.label === 'technical-director' || sessions.some((s) => s.parentAgentId === session.id)
  );
}

export function zoneFor(session: TempleSession, sessions: TempleSession[]): TempleZone {
  if (session.status !== 'active') return 'rest';
  return isLead(session, sessions) ? 'lead' : 'prayer';
}

export function arrangeSessions(sessions: TempleSession[], filter: TempleFilter) {
  const groups: Record<TempleZone, TempleSession[]> = { prayer: [], rest: [], lead: [] };
  for (const session of [...sessions].sort((a, b) => a.id - b.id)) {
    if (filter === 'active' && session.status !== 'active') continue;
    if (filter === 'rest' && session.status === 'active') continue;
    if (filter === 'leads' && !isLead(session, sessions)) continue;
    groups[zoneFor(session, sessions)].push(session);
  }
  const pages = Math.max(
    1,
    ...Object.entries(groups).map(([zone, entries]) =>
      Math.ceil(entries.length / CAPACITY[zone as TempleZone]),
    ),
  );
  return { groups, pages };
}

export function positionFor(zone: TempleZone, index: number) {
  if (zone === 'prayer') {
    const row = Math.floor(index / 4),
      col = index % 4;
    return { x: 530 + col * 170 - row * 65, y: 545 + row * 119 };
  }
  if (zone === 'lead') return { x: 1450 + index * 100, y: 531 };
  return [
    { x: 139, y: 415 },
    { x: 380, y: 392 },
    { x: 172, y: 490 },
    { x: 388, y: 465 },
    { x: 1390, y: 694 },
    { x: 1590, y: 767 },
    { x: 1465, y: 857 },
    { x: 1590, y: 875 },
  ][index];
}

const poseEnds = [1.2, 1.8, 2.55, 3.2, 4.9, 5.6, 6.5, 7.5];
export function poseFor(
  session: TempleSession,
  zone: TempleZone,
  elapsed: number,
  animate: boolean,
) {
  if (zone === 'lead') return 11;
  if (zone === 'rest') {
    if (session.status !== 'idle') return 2;
    return session.id % 3 === 0 ? 10 : animate && Math.floor(elapsed / 2 + session.id) % 2 ? 9 : 8;
  }
  if (!animate) return 0;
  const phase = (elapsed + session.id * 1.37) % 7.5;
  return poseEnds.findIndex((end) => phase < end);
}
