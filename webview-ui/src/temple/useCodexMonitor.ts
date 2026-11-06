import { useEffect, useState } from 'react';

import { transport } from '../transport/index.js';
import type { TransportState } from '../transport/types.js';

export interface TempleSession {
  id: number;
  sessionId?: string;
  label: string;
  model: string;
  status: string;
  directoryName: string;
  parentAgentId?: number;
  tools: { toolId: string; toolName: string }[];
}

export function useCodexMonitor() {
  const [sessions, setSessions] = useState<TempleSession[]>([]);
  const [received, setReceived] = useState(false);
  const [warning, setWarning] = useState('');
  const [scanFailed, setScanFailed] = useState(false);
  const [connection, setConnection] = useState<TransportState>(transport.state);
  useEffect(() => {
    let alive = true;
    const unsubscribe = transport.onMessage((message) => {
      const msg = message as unknown as {
        type: string;
        sessions?: TempleSession[];
        diagnostics?: { skippedLargeFiles: number; readErrors: number };
      };
      if (msg.type === 'codexSessions' && msg.sessions) {
        setSessions(msg.sessions);
        setReceived(true);
        setScanFailed(false);
        setWarning(
          msg.diagnostics?.skippedLargeFiles
            ? 'Some transcripts exceed the 64 MiB replay limit.'
            : msg.diagnostics?.readErrors
              ? 'Some session files could not be read.'
              : '',
        );
      } else if (msg.type === 'codexMonitorError') {
        setScanFailed(true);
        setWarning('Session scan failed.');
      }
    });
    // Re-handshake after every reconnect, not just the first WebSocket open.
    const unsubscribeState = transport.onStateChange((state) => {
      setConnection(state);
      if (state !== 'connected') setReceived(false);
      else transport.send({ type: 'webviewReady' });
    });
    setConnection(transport.state);
    // Deferring lets sibling panel listeners mount before initial state arrives.
    queueMicrotask(() => {
      if (alive && transport.state === 'connected') transport.send({ type: 'webviewReady' });
    });
    return () => {
      alive = false;
      unsubscribe();
      unsubscribeState();
    };
  }, []);
  return {
    sessions,
    received,
    warning,
    connection,
    live: connection === 'connected' && received && !scanFailed,
  };
}
