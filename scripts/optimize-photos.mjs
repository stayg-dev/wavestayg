import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../public/양양 웨이브 스테이지/", import.meta.url));

async function* photos(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* photos(filename);
    else if (/\.(jpe?g|png)$/i.test(entry.name)) yield filename;
  }
}

let originalBytes = 0;
let optimizedBytes = 0;
let count = 0;
for await (const filename of photos(root)) {
  const output = filename.replace(/\.(jpe?g|png)$/i, ".webp");
  const result = await sharp(filename)
    .rotate()
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(output);
  originalBytes += (await stat(filename)).size;
  optimizedBytes += result.size;
  count++;
}
console.log(`${count} photos: ${(originalBytes / 1024 / 1024).toFixed(1)} MB → ${(optimizedBytes / 1024 / 1024).toFixed(1)} MB (${(100 * (1 - optimizedBytes / originalBytes)).toFixed(1)}% smaller)`);
