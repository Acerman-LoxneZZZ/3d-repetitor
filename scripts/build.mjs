import { mkdir, cp, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderHTML } from './render.mjs';
const output = resolve('dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'lesson.html', 'styles', 'src', 'assets']) await cp(name, resolve(output, name), { recursive: true });
for (const name of ['index.html', 'lesson.html']) {
  await writeFile(resolve(output, name), renderHTML(await readFile(name, 'utf8')));
}
// Source portrait masters and prompts stay in the source checkout, outside the public bundle.
await rm(resolve(output, 'assets/character/tutor.png'), { force: true });
await rm(resolve(output, 'assets/character/prompt.md'), { force: true });
const files = await readdir(output);
console.log(`Сборка готова: dist/ (${files.join(', ')}). Внешние CDN не нужны.`);
