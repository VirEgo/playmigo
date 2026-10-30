import http from 'node:http';
import path from 'node:path';
import { readFile, realpath, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_PORT = 4300;
const LM_STUDIO_ORIGIN = 'http://127.0.0.1:1234';
const LM_PATH_PREFIX = '/api/lm-studio';
const BODY_LIMIT = 32 * 1024;
const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.png', 'image/png'],
  ['.json', 'application/json; charset=utf-8'],
]);

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

function isAllowedOrigin(req, port) {
  const requestName = new URL(`http://${req.headers.host || '127.0.0.1'}`).hostname.toLowerCase();
  if (!['localhost', '127.0.0.1'].includes(requestName)) return false;
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    const reqHost = req.headers.host;
    const [reqName, reqPort] = reqHost.startsWith('[')
      ? [new URL(`http://${reqHost}`).hostname, new URL(`http://${reqHost}`).port]
      : (() => {
          const i = reqHost.lastIndexOf(':');
          return i < 0 ? [reqHost, ''] : [reqHost.slice(0, i), reqHost.slice(i + 1)];
        })();
    const effectiveReqPort = reqPort || String(port);
    const effectiveOriginPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    const names = new Set([reqName.toLowerCase(), 'localhost', '127.0.0.1']);
    return (
      parsed.protocol === 'http:' &&
      names.has(parsed.hostname.toLowerCase()) &&
      effectiveOriginPort === effectiveReqPort
    );
  } catch {
    return false;
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > BODY_LIMIT)
      throw Object.assign(new Error('Request body is too large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
    return parsed;
  } catch {
    throw Object.assign(new Error('Request body must be valid JSON'), { status: 400 });
  }
}

async function proxyLmStudio(req, res, pathname, fetchImpl) {
  if (!['/api/lm-studio/v1/models', '/api/lm-studio/v1/chat/completions'].includes(pathname))
    return sendJson(res, 404, { error: 'Not found' });
  if (pathname.endsWith('/models') && req.method !== 'GET')
    return sendJson(res, 405, { error: 'Method not allowed' });
  if (pathname.endsWith('/chat/completions') && req.method !== 'POST')
    return sendJson(res, 405, { error: 'Method not allowed' });
  let body;
  if (req.method === 'POST') {
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, error.status || 400, { error: error.message });
    }
  }
  try {
    const upstream = await fetchImpl(
      `${LM_STUDIO_ORIGIN}${pathname.slice(LM_PATH_PREFIX.length)}`,
      {
        method: req.method,
        headers: body
          ? { 'content-type': 'application/json', accept: 'application/json' }
          : { accept: 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(125_000),
      },
    );
    const payload = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'content-length': payload.length,
      'cache-control': 'no-store',
    });
    res.end(payload);
  } catch {
    sendJson(res, 502, {
      error: 'LM Studio is unavailable. Start the local server at 127.0.0.1:1234 and try again.',
    });
  }
}

function isWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  );
}

export function createLocalServer({
  root = path.resolve('dist/child-trainer/browser'),
  port = DEFAULT_PORT,
  fetchImpl = fetch,
} = {}) {
  const resolvedRoot = path.resolve(root);
  return http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      const pathname = decodeURIComponent(requestUrl.pathname);
      if (!isAllowedOrigin(req, port)) return sendJson(res, 403, { error: 'Origin not allowed' });
      if (pathname === '/api/lm-studio' || pathname.startsWith(`${LM_PATH_PREFIX}/`))
        return await proxyLmStudio(req, res, pathname, fetchImpl);
      if (!['GET', 'HEAD'].includes(req.method))
        return sendJson(res, 405, { error: 'Method not allowed' });
      const relative = pathname.replace(/^\/+/, '');
      let candidate = path.resolve(resolvedRoot, relative || 'index.html');
      if (!isWithinRoot(resolvedRoot, candidate)) return sendJson(res, 403, { error: 'Forbidden' });
      let fileStat;
      try {
        fileStat = await stat(candidate);
      } catch {
        fileStat = null;
      }
      if (fileStat?.isDirectory()) {
        candidate = path.join(candidate, 'index.html');
        try {
          fileStat = await stat(candidate);
        } catch {
          fileStat = null;
        }
      }
      if (fileStat?.isFile()) {
        const actualPath = await realpath(candidate);
        if (!isWithinRoot(await realpath(resolvedRoot), actualPath))
          return sendJson(res, 403, { error: 'Forbidden' });
      }
      if (!fileStat?.isFile()) {
        const acceptsHtml = (req.headers.accept || '').includes('text/html');
        const looksLikeAsset = path.extname(pathname) !== '';
        if (!acceptsHtml || looksLikeAsset) return sendJson(res, 404, { error: 'Not found' });
        candidate = path.join(resolvedRoot, 'index.html');
        try {
          fileStat = await stat(candidate);
        } catch {
          fileStat = null;
        }
        if (!fileStat?.isFile()) return sendJson(res, 404, { error: 'Not found' });
      }
      const bytes = await readFile(candidate);
      const headers = {
        'content-type':
          CONTENT_TYPES.get(path.extname(candidate).toLowerCase()) || 'application/octet-stream',
        'content-length': bytes.length,
        'x-content-type-options': 'nosniff',
      };
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      if (!res.headersSent) sendJson(res, 400, { error: 'Invalid request' });
      else res.destroy();
    }
  });
}

function parsePort(args) {
  const index = args.indexOf('--port');
  if (index < 0) return DEFAULT_PORT;
  const raw = args[index + 1];
  if (!raw || !/^\d+$/.test(raw)) throw new Error('--port requires an integer from 1 to 65535');
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('--port requires an integer from 1 to 65535');
  return port;
}

const invokedPath = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  try {
    const port = parsePort(process.argv.slice(2));
    const server = createLocalServer({ port });
    server.listen(port, '127.0.0.1', () =>
      console.log(`Local preview listening at http://127.0.0.1:${port}`),
    );
    server.on('error', (error) => {
      console.error(`Unable to start local preview: ${error.message}`);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
