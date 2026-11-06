import { templeAssetBase, type TempleCharacter } from './characters.js';

export function TempleSprite({
  character,
  pose,
  scale,
  className,
}: {
  character: TempleCharacter;
  pose: number;
  scale: number;
  className?: string;
}) {
  const frame = character.frames[pose];
  return (
    <svg
      className={className}
      aria-hidden="true"
      width={frame.w * scale}
      height={frame.h * scale}
      viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`}
    >
      <image
        href={`${templeAssetBase}${character.file}`}
        width={character.width}
        height={character.height}
      />
    </svg>
  );
}
