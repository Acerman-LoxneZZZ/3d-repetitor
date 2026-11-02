import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderHTML } from './render.mjs';
const root = resolve(process.argv.includes('--dist') ? 'dist' : '.');
const { siteConfig: renderConfig } = await import(pathToFileURL(resolve(root, 'src/config.js')).href);
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
http.createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' });response.end();return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.') || part === 'node_modules') || /^\/(?:scripts|tests|docs)\//.test(pathname)) { response.writeHead(404);response.end('Не найдено');return; }
    let path = resolve(root, `.${pathname}`);
    if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403);response.end();return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const source = await readFile(path);
    const content = extname(path) === '.html' ? renderHTML(source.toString('utf8'), renderConfig) : source;
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Cache-Control': 'no-cache' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });response.end('<!doctype html><html lang="ru"><meta charset="utf-8"><title>Страница не найдена</title><p>Эта страница не найдена. <a href="/">Вернуться на главную</a></p></html>'); }
}).on('error', error => { console.error(`Не удалось запустить локальный сервер: ${error.code}. ${error.code === 'EPERM' ? 'Среда запрещает прослушивание порта.' : 'Проверьте доступность порта; можно указать --port 4174.'}`);process.exitCode = 1; })
  .listen(port, '127.0.0.1', () => console.log(`Локальный сайт: http://127.0.0.1:${port}`));
