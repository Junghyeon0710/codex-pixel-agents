import { type ReactNode, useEffect, useState } from 'react';

import {
  CODEX_LANGUAGE_KEY,
  type CodexLanguage,
  CodexLocaleContext,
  readCodexLanguage,
  useCodexLocale,
} from '../codexLocale.js';
import { CharacterGallery } from '../temple/CharacterGallery.js';

function ViewerMenu({
  onLanguage,
  onTogglePanel,
}: {
  onLanguage: (language: CodexLanguage) => void;
  onTogglePanel: () => void;
}) {
  const { language, panelVisible, t } = useCodexLocale();
  return (
    <header className="codex-menubar">
      <strong className="codex-brand">
        <span className="material-symbols-sharp" aria-hidden="true">
          local_florist
        </span>
        {t('Mountain Temple')} <small>Codex Pixel Agents</small>
      </strong>
      <nav aria-label={t('Viewer menu')}>
        <CharacterGallery />
        <button type="button" aria-pressed={panelVisible} onClick={onTogglePanel}>
          {t('Sessions')}
        </button>
        <details className="codex-help">
          <summary>{t('Help')}</summary>
          <section className="codex-help-content" aria-label={t('Help')}>
            <strong>{t('Help')}</strong>
            <p>
              {t(
                'Keep this viewer open and start a task in Codex. Recorded sessions and real subagents appear automatically.',
              )}
            </p>
            <p>
              {t(
                'Select a character to inspect its activity. Use the zoom buttons and scroll to explore the hall.',
              )}
            </p>
            <p>
              {t(
                'Working agents bow toward the Buddha. Idle agents rest in the side lounges. Extra agents appear on additional pages; the full list stays available in Sessions.',
              )}
            </p>
            <p>
              {t(
                'Active: a turn or tool call was recorded. Idle: the turn ended; this does not prove success.',
              )}
            </p>
            <p>
              {t(
                'Interrupted: the turn was aborted. Stale: no update for over 5 minutes. Unknown: no recognized activity yet.',
              )}
            </p>
            <p>
              {t(
                'Language is saved in this browser. Model, tool and project names keep their original identifiers.',
              )}
            </p>
          </section>
        </details>
        <label className="codex-language">
          Language / 언어
          <select
            value={language}
            onChange={(event) => onLanguage(event.target.value as CodexLanguage)}
          >
            <option value="en" lang="en">
              English
            </option>
            <option value="ko" lang="ko">
              한국어
            </option>
          </select>
        </label>
      </nav>
    </header>
  );
}

export function CodexShell({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<CodexLanguage>(readCodexLanguage);
  const [panelVisible, setPanelVisible] = useState(false);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  const changeLanguage = (next: CodexLanguage) => {
    setLanguage(next);
    try {
      localStorage.setItem(CODEX_LANGUAGE_KEY, next);
    } catch {
      /* Still works for this visit. */
    }
  };
  return (
    <CodexLocaleContext.Provider value={{ language, panelVisible }}>
      <div className="codex-shell">
        <ViewerMenu
          onLanguage={changeLanguage}
          onTogglePanel={() => setPanelVisible((value) => !value)}
        />
        <main className="codex-office">{children}</main>
      </div>
    </CodexLocaleContext.Provider>
  );
}
