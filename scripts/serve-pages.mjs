import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';

const root = path.resolve('dist/github-pages/browser');
const index = await readFile(path.join(root, 'index.html'), 'utf8');
const baseHref = index.match(/<base href="([^"]+)"/)?.[1];
if (!baseHref?.startsWith('/') || !baseHref.endsWith('/')) {
  throw new Error('Build the Pages site first with npm run build:pages.');
}
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Strict static hosting: no SPA fallback and no LM Studio proxy.
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    const url = new URL(req.url, 'http://127.0.0.1:4301');
    const pathname = decodeURIComponent(url.pathname);
    if (!pathname.startsWith(baseHref)) {
      res.writeHead(404).end('Not found');
      return;
    }
    let file = path.resolve(root, pathname.slice(baseHref.length) || 'index.html');
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403).end();
      return;
    }
    if ((await stat(file)).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { location: `${url.pathname}/${url.search}` }).end();
        return;
      }
      file = path.join(file, 'index.html');
    }
    const bytes = await readFile(file);
    res.writeHead(200, {
      'content-type': types[path.extname(file)] ?? 'application/octet-stream',
      'content-length': bytes.length,
      'x-content-type-options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(4301, '127.0.0.1', () => {
  console.log(`Pages preview: http://127.0.0.1:4301${baseHref}`);
});
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
