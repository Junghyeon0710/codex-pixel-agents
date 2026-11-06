// Extract metadata only. The original generated PNGs are never modified.
import { readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const variants = [
  ['slate', 'Slate topknot', 'agents.png'],
  ['jade', 'Jade braid', 'characters/jade.png'],
  ['ochre', 'Ochre short hair', 'characters/ochre.png'],
  ['rose', 'Rose low bun', 'characters/rose.png'],
  ['sage', 'Sage shaved head', 'characters/sage.png'],
  ['indigo', 'Indigo silver hair', 'characters/indigo.png'],
  ['terracotta', 'Terracotta curls', 'characters/terracotta.png'],
  ['ivory', 'Ivory twin buns', 'characters/ivory.png'],
];
const result = [];
for (const [id, name, file] of variants) {
  const png = PNG.sync.read(
    await readFile(new URL(`../webview-ui/public/temple/${file}`, import.meta.url)),
  );
  let clear = 0;
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i] === 0) clear++;
  if (clear < png.width * png.height * 0.35) throw new Error(`${id}: missing transparent padding`);
  const frames = [];
  for (let n = 0; n < 12; n++) {
    const x0 = Math.floor(((n % 4) * png.width) / 4),
      x1 = Math.floor((((n % 4) + 1) * png.width) / 4);
    const y0 = Math.floor((Math.floor(n / 4) * png.height) / 3),
      y1 = Math.floor(((Math.floor(n / 4) + 1) * png.height) / 3);
    let left = x1,
      top = y1,
      right = x0,
      bottom = y0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        if (png.data[(y * png.width + x) * 4 + 3] > 32) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    if (
      right <= left ||
      bottom <= top ||
      left <= x0 ||
      top <= y0 ||
      right >= x1 - 1 ||
      bottom >= y1 - 1
    ) {
      throw new Error(`${id} pose ${n}: empty or clipped sprite`);
    }
    frames.push({ x: left, y: top, w: right - left + 1, h: bottom - top + 1 });
  }
  result.push({ id, name, file, width: png.width, height: png.height, frames });
  console.log(
    `${id}: 12 padded poses, ${Math.round((clear / (png.width * png.height)) * 100)}% transparent`,
  );
}
await writeFile(
  new URL('../webview-ui/src/temple/characters.json', import.meta.url),
  JSON.stringify(result, null, 2) + '\n',
);
