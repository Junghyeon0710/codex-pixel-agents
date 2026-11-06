import { useRef, useState } from 'react';

import { useCodexLocale } from '../codexLocale.js';
import { characters } from './characters.js';
import { TempleSprite } from './TempleSprite.js';

export function CharacterGallery() {
  const { t } = useCodexLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pose, setPose] = useState(11);
  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()}>
        {t('Characters')}
      </button>
      <dialog className="temple-gallery" ref={dialog} aria-labelledby="temple-gallery-title">
        <header>
          <div>
            <h2 id="temple-gallery-title">{t('Eight temple characters')}</h2>
            <p>{t('Appearance previews, not live sessions. Each character has all 12 poses.')}</p>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t('Close gallery')}
          >
            ×
          </button>
        </header>
        <label className="temple-gallery-pose">
          {t('Preview pose')}
          <select
            aria-label={t('Preview pose')}
            value={pose}
            onChange={(event) => setPose(Number(event.target.value))}
          >
            <option value={11}>{t('Scroll')}</option>
            <option value={0}>{t('Standing prayer')}</option>
            <option value={4}>{t('Full bow')}</option>
            <option value={8}>{t('Tea')}</option>
            <option value={10}>{t('Reading')}</option>
          </select>
        </label>
        <div className="temple-gallery-grid">
          {characters.map((character) => (
            <figure key={character.id} data-character={character.id} data-pose={pose}>
              <div className="temple-gallery-art">
                <TempleSprite
                  character={character}
                  pose={pose}
                  scale={148 / character.frames[0].h}
                />
              </div>
              <figcaption>{t(character.name)}</figcaption>
            </figure>
          ))}
        </div>
        <p className="temple-gallery-note">
          {t(
            'Each session keeps its appearance when working, resting or reconnecting. Appearances may repeat across sessions.',
          )}
        </p>
      </dialog>
    </>
  );
}
