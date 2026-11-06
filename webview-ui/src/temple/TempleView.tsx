import { useEffect, useRef, useState } from 'react';

import { useCodexLocale } from '../codexLocale.js';
import { CodexPanel } from '../components/CodexPanel.js';
import { characterFor, characters } from './characters.js';
import {
  arrangeSessions,
  CAPACITY,
  HEIGHT,
  isLead,
  poseFor,
  positionFor,
  type TempleFilter,
  type TempleZone,
  WIDTH,
  zoneFor,
} from './layout.js';
import { TempleSprite } from './TempleSprite.js';
import { useCodexMonitor } from './useCodexMonitor.js';

const assetBase = `${import.meta.env.BASE_URL}temple/`;
const filters: { id: TempleFilter; icon: string; label: string }[] = [
  { id: 'all', icon: 'groups', label: 'All' },
  { id: 'active', icon: 'construction', label: 'Working' },
  { id: 'rest', icon: 'local_cafe', label: 'Rest & waiting' },
  { id: 'leads', icon: 'account_tree', label: 'Leads' },
];

export function TempleView() {
  const { t, role } = useCodexLocale();
  const { sessions, received, warning, connection, live } = useCodexMonitor();
  const [filter, setFilter] = useState<TempleFilter>('all');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const { groups, pages } = arrangeSessions(sessions, filter);
  const currentPage = Math.min(page, pages - 1);
  const scale = fit * zoom;
  const active = sessions.filter((s) => s.status === 'active').length;
  const selectedSession = sessions.find((s) => s.id === selected);
  const animate = live && !paused && !reducedMotion;

  useEffect(() => {
    document.title = 'Codex Pixel Agents · Lantern Hall';
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setFit(
        Math.max(0.1, Math.min(entry.contentRect.width / WIDTH, entry.contentRect.height / HEIGHT)),
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!animate) return;
    const timer = setInterval(() => setElapsed((time) => time + 0.15), 150);
    return () => clearInterval(timer);
  }, [animate]);
  useEffect(() => {
    const images = ['lantern-hall.png', ...characters.map((character) => character.file)].map(
      (file) => {
        const image = new Image();
        image.onerror = () => setAssetError(true);
        image.src = assetBase + file;
        return image;
      },
    );
    return () =>
      images.forEach((image) => {
        image.onerror = null;
      });
  }, []);

  function inspect(id: number) {
    const session = sessions.find((s) => s.id === id);
    if (!session) return;
    setFilter('all');
    const zone = zoneFor(session, sessions);
    const all = arrangeSessions(sessions, 'all');
    setPage(Math.floor(all.groups[zone].findIndex((s) => s.id === id) / CAPACITY[zone]));
    setSelected(id);
  }

  return (
    <div className="temple-app">
      <nav className="temple-sidebar" aria-label={t('Activity filters')}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => {
              setFilter(item.id);
              setPage(0);
            }}
          >
            <span className="material-symbols-sharp" aria-hidden="true">
              {item.icon}
            </span>
            <span>{t(item.label)}</span>
            <small>
              {item.id === 'all'
                ? sessions.length
                : item.id === 'active'
                  ? active
                  : item.id === 'rest'
                    ? sessions.length - active
                    : sessions.filter((s) => isLead(s, sessions)).length}
            </small>
          </button>
        ))}
      </nav>
      <section className="temple-main" aria-label={t('Lantern Hall')}>
        <div className="temple-viewport" ref={viewport}>
          <div className="temple-scaled" style={{ width: WIDTH * scale, height: HEIGHT * scale }}>
            <div
              className="temple-scene"
              data-testid="temple-scene"
              style={{
                width: WIDTH,
                height: HEIGHT,
                transform: `scale(${scale})`,
                backgroundImage: `url("${assetBase}lantern-hall.png")`,
              }}
            >
              {(Object.keys(groups) as TempleZone[]).flatMap((zone) =>
                groups[zone]
                  .slice(currentPage * CAPACITY[zone], (currentPage + 1) * CAPACITY[zone])
                  .map((session, index) => {
                    const position = positionFor(zone, index);
                    const pose = poseFor(session, zone, elapsed, animate);
                    const character = characterFor(session);
                    const spriteScale = (zone === 'rest' ? 90 : 104) / character.frames[0].h;
                    return (
                      <button
                        type="button"
                        key={session.id}
                        className={`temple-agent temple-agent-${zone}`}
                        data-testid={`temple-agent-${session.id}`}
                        data-state={session.status}
                        data-zone={zone}
                        data-pose={pose}
                        data-character={character.id}
                        data-animated={
                          animate &&
                          (zone === 'prayer' ||
                            (zone === 'rest' && session.status === 'idle' && session.id % 3 !== 0))
                            ? 'true'
                            : 'false'
                        }
                        aria-label={`${role(session.label)} · ${t(session.status)} · ${session.model || t('Model not recorded')}`}
                        aria-pressed={selected === session.id}
                        onClick={() => setSelected(session.id)}
                        style={{ left: position.x - 54, top: position.y - 120 }}
                      >
                        {zone === 'prayer' && <span className="temple-mat" aria-hidden="true" />}
                        <TempleSprite
                          className="temple-sprite"
                          character={character}
                          pose={pose}
                          scale={spriteScale}
                        />
                        <span className="temple-agent-name">
                          <i data-state={session.status} />
                          {role(session.label)}
                        </span>
                      </button>
                    );
                  }),
              )}
            </div>
          </div>
        </div>
        <div className="temple-live" role="status" data-live={live}>
          <span className="temple-live-dot" />
          {!live
            ? t(
                connection === 'connected'
                  ? 'Waiting for session data…'
                  : connection === 'connecting'
                    ? 'Connecting…'
                    : 'Reconnecting…',
              )
            : t('Live · local sessions')}
          {paused || reducedMotion ? ` · ${t('Motion paused')}` : ''}
        </div>
        {!!warning && (
          <p className="temple-warning" role="alert">
            {t(warning)}
          </p>
        )}
        {assetError && (
          <p className="temple-warning" role="alert">
            {t('Temple artwork could not be loaded. Session data remains available in Sessions.')}
          </p>
        )}
        {received && sessions.length === 0 && (
          <div className="temple-empty">
            <strong>{t('The hall is quiet')}</strong>
            <p>
              {t('Start a task in Codex Desktop or CLI. Recent local sessions will appear here.')}
            </p>
          </div>
        )}
        <CodexPanel onSelect={inspect} />
        {selectedSession && (
          <aside className="temple-inspector" aria-label={t('Agent details')}>
            <button
              className="temple-close"
              type="button"
              onClick={() => setSelected(null)}
              aria-label={t('Close agent')}
            >
              ×
            </button>
            <small>{isLead(selectedSession, sessions) ? t('LEAD') : t('Session')}</small>
            <h2>{role(selectedSession.label)}</h2>
            <p>
              <span className="codex-status" data-state={selectedSession.status}>
                {t(selectedSession.status)}
              </span>
              {!live ? ` · ${t('Last recorded state')}` : ''}
            </p>
            <dl>
              <dt>{t('Appearance')}</dt>
              <dd>{t(characterFor(selectedSession).name)}</dd>
              <dt>{t('Model')}</dt>
              <dd>{selectedSession.model || t('Model not recorded')}</dd>
              <dt>{t('Project')}</dt>
              <dd>{selectedSession.directoryName}</dd>
              <dt>{t('Tools')}</dt>
              <dd>{selectedSession.tools.map((tool) => tool.toolName).join(', ') || '—'}</dd>
            </dl>
            {selectedSession.parentAgentId !== undefined && (
              <p>
                {t('Parent session')}:{' '}
                {role(
                  sessions.find((s) => s.id === selectedSession.parentAgentId)?.label ||
                    String(selectedSession.parentAgentId),
                )}
              </p>
            )}
            <small>
              {t(
                'Activity inferred from local logs. No prompts or tool contents displayed. This viewer does not assign agents.',
              )}
            </small>
          </aside>
        )}
      </section>
      <footer className="temple-toolbar">
        <strong>{t('Lantern Hall')}</strong>
        <span className="temple-counts">
          {t('Working')} <b>{active}</b>
          <span> / </span>
          {t('Rest & waiting')} <b>{sessions.length - active}</b>
        </span>
        <span className="temple-page-controls">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
            aria-label={t('Previous page')}
          >
            ‹
          </button>
          <span>
            {t('Page')} {currentPage + 1} / {pages}
          </span>
          <button
            type="button"
            disabled={currentPage === pages - 1}
            onClick={() => setPage(currentPage + 1)}
            aria-label={t('Next page')}
          >
            ›
          </button>
        </span>
        <span className="temple-toolbar-end">
          <button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>
            {t(paused ? 'Resume motion' : 'Pause motion')}
          </button>
          <button
            type="button"
            disabled={zoom <= 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            aria-label={t('Zoom out')}
          >
            −
          </button>
          <button type="button" onClick={() => setZoom(1)} aria-label={t('Fit scene')}>
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            disabled={zoom >= 3}
            onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            aria-label={t('Zoom in')}
          >
            +
          </button>
        </span>
      </footer>
    </div>
  );
}
