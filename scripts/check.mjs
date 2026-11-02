import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { siteConfig, safeContactLinks } from '../src/config.js';
import { validateContact } from '../src/contact.js';
import { graphSVG } from '../src/lesson.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message);checks++; };
for (const directory of ['src', 'scripts']) {
  for (const file of await readdir(directory)) {
    if (!/\.(m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', resolve(directory, file)], { encoding: 'utf8' });
    check(result.status === 0, `Syntax: ${file}\n${result.stderr}`);
  }
}

for (const file of ['index.html', 'lesson.html']) {
  const html = await readFile(file, 'utf8');
  check(/<html\s[^>]*lang="ru"/.test(html), `${file}: Russian language`);
  check((html.match(/<h1(?:\s|>)/g) || []).length === 1, `${file}: exactly one H1`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  check(new Set(ids).size === ids.length, `${file}: unique IDs`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
    const pathname = match[1];
    if (pathname === '/') continue;
    check(await stat(resolve(`.${pathname}`)).then(() => true, () => false), `${file}: local asset ${pathname}`);
  }
  for (const match of html.matchAll(/(?:href|aria-controls|aria-describedby)="(#[^"]+)"/g)) {
    if (match[1] === '#') continue;
    check(ids.includes(match[1].slice(1)), `${file}: target ${match[1]}`);
  }
}
for (const file of ['styles/main.css', 'styles/lesson.css']) {
  const css = await readFile(file, 'utf8');
  for (const match of css.matchAll(/url\(['"]?(\/[^)'"\s]+)/g)) check(await stat(resolve(`.${match[1]}`)).then(() => true, () => false), `${file}: CSS asset ${match[1]}`);
  check((css.match(/{/g) || []).length === (css.match(/}/g) || []).length, `${file}: balanced CSS blocks`);
}
check(siteConfig.preview, 'Preview is explicit while personal data is missing');
check(safeContactLinks().length === 0, 'Unknown contact has no fake link');
check(safeContactLinks({ telegram: 'javascript:alert(1)', email: '<bad>', phone: 'not-a-phone' }).length === 0, 'Unsafe contact values rejected');
check(safeContactLinks({ telegram: '@math_teacher', email: 'teacher@example.com', phone: '+7 (999) 123-45-67' }).length === 3, 'Configured real contact formats supported');
check(Object.keys(validateContact({ name: '', contact: '', method: 'email' })).length === 2, 'Required fields validated');
check(!!validateContact({ name: 'Анна', method: 'email', contact: 'bad-mail' }).contact, 'Email validation');
check(!!validateContact({ name: 'Анна', method: 'telegram', contact: 'abc' }).contact, 'Telegram validation');
check(!!validateContact({ name: 'Анна', method: 'phone', contact: 'телефон' }).contact, 'Phone validation');
check(!!validateContact({ name: 'Анна', method: 'phone', contact: '-------' }).contact, 'Phone requires digits');
for (const [method, contact] of [['email','anna@example.com'],['telegram','@anna_math'],['phone','+7 999 123-45-67']]) check(Object.keys(validateContact({ name: 'Анна', method, contact })).length === 0, `${method}: valid contact`);
const graph = graphSVG();
const points = graph.match(/class="math-graph-curve" d="([^"]+)"/)[1].split(/[ML]/).filter(Boolean).map(pair => pair.trim().split(',').map(Number));
const axisY = Number(graph.match(/class="math-graph-axes"[^]*?<path d="M[\d.]+ ([\d.]+)H/)[1]);
const startX = points[0][0], scaleX = (points.at(-1)[0] - startX) / 5, scaleY = (axisY - points[0][1]) / 6;
check(points.every(([px,py]) => { const x=(px-startX)/scaleX,y=(axisY-py)/scaleY;return Math.abs(y-(x*x-5*x+6))<.001; }), 'Every plotted point follows y=x²−5x+6');
const roots = [...graph.match(/class="math-graph-roots"[^]*?<\/g>/)[0].matchAll(/cx="([^"]+)" cy="([^"]+)"/g)].map(match => [(Number(match[1])-startX)/scaleX,(axisY-Number(match[2]))/scaleY]);
check(roots.length === 2 && Math.abs(roots[0][0]-2)<.001 && Math.abs(roots[1][0]-3)<.001 && roots.every(([,y])=>Math.abs(y)<.001), 'Marked roots lie on the X axis at 2 and 3');
const vertex = graph.match(/class="math-graph-vertex" cx="([^"]+)" cy="([^"]+)"/);
check(Math.abs((Number(vertex[1])-startX)/scaleX-2.5)<.001 && Math.abs((axisY-Number(vertex[2]))/scaleY+.25)<.001, 'Marked vertex is (2.5,-.25)');
for (const root of [2,3]) check(root * root - 5 * root + 6 === 0, 'Demonstration roots checked');
for (const root of [3,4]) check(root * root - 7 * root + 12 === 0, 'Practice roots checked');
check(3*3+4*4 === 5*5 && 5*5+12*12 === 13*13, 'Geometry examples checked');

const luminance = hex => {
  const values = hex.replace('#','').match(/../g).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
  return values[0]*.2126+values[1]*.7152+values[2]*.0722;
};
const ratio = (a,b) => { const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05); };
const pairs = [['#1c1d20','#f1f1f1',4.5],['#606166','#f1f1f1',4.5],['#ffffff','#455ce9',4.5],['#ffffff','#85898a',3],['#161719','#85898a',4.5],['#fff8f4','#d3232a',4.5],['#fff0eb','#d3232a',4.5],['#fff8f4','#c22127',4.5],['#c1c1c5','#1c1d20',4.5]];
for (const [foreground,background,minimum] of pairs) check(ratio(foreground,background)>=minimum, `Contrast ${foreground}/${background}: ${ratio(foreground,background).toFixed(2)} >= ${minimum}`);
console.log(`Проверки пройдены: ${checks}. Синтаксис, ссылки/ассеты, структура, конфигурация, валидация контакта, точная математика, контраст палитр.`);
