import { useEffect, useState } from 'react';

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

export function CodexPanel() {
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
            : '',
        );
      } else if (msg.type === 'codexMonitorError')
        setWarning(msg.message || 'Session scan failed.');
    });
  }, []);
  return (
    <aside className="codex-panel" aria-label="Codex session monitor">
      <strong className="codex-title">Codex Pixel Agents</strong>
      <p className="codex-subtitle">Local session viewer · Read only</p>
      <p aria-live="polite">
        {received
          ? `${sessions.length} sessions · ${sessions.filter((s) => s.status === 'active').length} active`
          : 'Connecting to local monitor…'}
      </p>
      {received && !sessions.length && (
        <p>Start a task in Codex Desktop or CLI. Recent local sessions will appear here.</p>
      )}
      <ul className="codex-sessions">
        {sessions.map((s) => (
          <li key={s.id} data-testid={`codex-session-${s.id}`}>
            <b>
              {s.parentAgentId ? '↳ ' : ''}
              {s.label}
            </b>{' '}
            <span className="codex-status" data-state={s.status}>
              · {s.status}
            </span>
            <div className="codex-model">
              {s.model || 'Model not recorded'} · {s.directoryName}
            </div>
            {!!s.tools.length && (
              <div className="codex-tools">{s.tools.map((t) => t.toolName).join(', ')}</div>
            )}
          </li>
        ))}
      </ul>
      {warning && (
        <p role="status" className="codex-warning">
          {warning}
        </p>
      )}
      <small className="codex-note">
        Activity inferred from local logs. No prompts or tool contents displayed. This viewer does
        not assign agents.
      </small>
    </aside>
  );
}
