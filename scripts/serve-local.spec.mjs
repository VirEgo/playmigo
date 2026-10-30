import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createLocalServer } from './serve-local.mjs';

let root;
let server;
let baseUrl;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'child-trainer-preview-'));
  await mkdir(path.join(root, 'assets'));
  await writeFile(path.join(root, 'index.html'), '<main>App shell</main>');
  await writeFile(path.join(root, 'assets', 'app.js'), 'console.log("app")');
  server = createLocalServer({
    root,
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

describe('local preview server', () => {
  it('serves index and falls back for HTML navigation', async () => {
    const response = await fetch(`${baseUrl}/`, { headers: { accept: 'text/html' } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /App shell/);
    const route = await fetch(`${baseUrl}/some/route`, { headers: { accept: 'text/html' } });
    assert.equal(route.status, 200);
    assert.match(await route.text(), /App shell/);
  });

  it('returns 404 for missing assets', async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`, { headers: { accept: '*/*' } });
    assert.equal(response.status, 404);
  });

  it('blocks traversal paths', async () => {
    const response = await fetch(`${baseUrl}/..%2f..%2fpackage.json`, {
      headers: { accept: 'text/html' },
    });
    assert.notEqual(response.status, 200);
  });

  it('returns 404 for unknown API routes', async () => {
    const response = await fetch(`${baseUrl}/api/lm-studio/v1/admin`);
    assert.equal(response.status, 404);
  });

  it('rejects a cross-origin request', async () => {
    const response = await fetch(`${baseUrl}/api/lm-studio/v1/models`, {
      headers: { origin: 'https://attacker.example' },
    });
    assert.equal(response.status, 403);
  });

  it('returns a readable 502 when LM Studio is unavailable', async () => {
    const response = await fetch(`${baseUrl}/api/lm-studio/v1/models`);
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /LM Studio is unavailable/);
  });

  it('forwards only the supported chat request path and JSON body', async () => {
    const requests = [];
    server.close();
    server = createLocalServer({
      root,
      fetchImpl: async (url, options) => {
        requests.push({ url: String(url), options });
        return new Response('{"choices":[]}', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
    const body = { model: 'local-model', messages: [{ role: 'user', content: 'hello' }] };
    const response = await fetch(`${baseUrl}/api/lm-studio/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { choices: [] });
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'http://127.0.0.1:1234/v1/chat/completions');
    assert.deepEqual(JSON.parse(requests[0].options.body), body);
    assert.equal(requests[0].options.headers.cookie, undefined);
  });
});
