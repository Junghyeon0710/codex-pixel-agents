import { useEffect, useState } from 'react';

import { useCodexLocale } from '../codexLocale.js';
import { transport } from '../transport/index.js';

interface Session {
  id: number;
  label: string;
  model: string;
  status: string;
  directoryName: string;
  parentAgentId?: number;
  tools: { toolId: string; toolName: string }[];
}

export function CodexPanel({ onSelect }: { onSelect?: (id: number) => void } = {}) {
  const { language, panelVisible, t, role } = useCodexLocale();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [received, setReceived] = useState(false);
  const [warning, setWarning] = useState('');
  useEffect(() => {
    document.title = 'Codex Pixel Agents';
    return transport.onMessage((message) => {
      const msg = message as unknown as {
        type: string;
        sessions?: Session[];
        diagnostics?: { skippedLargeFiles: number; readErrors: number };
        message?: string;
      };
      if (msg.type === 'codexSessions' && msg.sessions) {
        setSessions(msg.sessions);
        setReceived(true);
        setWarning(
          msg.diagnostics?.skippedLargeFiles
            ? 'Some transcripts exceed the 64 MiB replay limit.'
            : msg.diagnostics?.readErrors
              ? 'Some session files could not be read.'
              : '',
        );
      } else if (msg.type === 'codexMonitorError') setWarning('Session scan failed.');
    });
  }, []);
  return (
    <aside hidden={!panelVisible} className="codex-panel" aria-label={t('Codex session monitor')}>
      <strong className="codex-title">Codex Pixel Agents</strong>
      <p className="codex-subtitle">{t('Local session viewer · Read only')}</p>
      <p aria-live="polite">
        {received
          ? language === 'ko'
            ? `세션 ${sessions.length}개 · 작업 중 ${sessions.filter((s) => s.status === 'active').length}개`
            : `${sessions.length} sessions · ${sessions.filter((s) => s.status === 'active').length} active`
          : t('Connecting to local monitor…')}
      </p>
      {received && !sessions.length && (
        <p>{t('Start a task in Codex Desktop or CLI. Recent local sessions will appear here.')}</p>
      )}
      <ul className="codex-sessions">
        {sessions.map((s) => (
          <li key={s.id} data-testid={`codex-session-${s.id}`}>
            <button
              type="button"
              className="codex-session-select"
              title={s.label}
              onClick={() => onSelect?.(s.id)}
            >
              {s.parentAgentId ? '↳ ' : ''}
              {role(s.label)}
            </button>{' '}
            <span className="codex-status" data-state={s.status}>
              · {t(s.status)}
            </span>
            <div className="codex-model">
              {s.model || t('Model not recorded')} · {s.directoryName}
            </div>
            {!!s.tools.length && (
              <div className="codex-tools">{s.tools.map((t) => t.toolName).join(', ')}</div>
            )}
          </li>
        ))}
      </ul>
      {warning && (
        <p role="status" className="codex-warning">
          {t(warning)}
        </p>
      )}
      <small className="codex-note">
        {t(
          'Activity inferred from local logs. No prompts or tool contents displayed. This viewer does not assign agents.',
        )}
      </small>
    </aside>
  );
}
