import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--base-href')) {
  throw new Error('Usage: npm run build:pages -- --base-href /repository-name/');
}
const baseHref = args[1] ?? '/child-trainer/';
if (!/^\/(?:[a-zA-Z0-9_.-]+\/)*$/.test(baseHref) || baseHref.split('/').includes('..')) {
  throw new Error(
    '--base-href must be an absolute path ending in / (for example /child-trainer/).',
  );
}

const build = spawnSync(
  process.execPath,
  [
    'node_modules/@angular/cli/bin/ng.js',
    'build',
    '--configuration',
    'production,github-pages',
    '--base-href',
    baseHref,
  ],
  { stdio: 'inherit' },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const output = 'dist/github-pages/browser';
// Pages has no SPA rewrite support. Give every known route a real entry file.
// Keep this list in sync with src/app/app.routes.ts when adding routes.
for (const route of [
  'animals',
  'math',
  'logic',
  ...Array.from({ length: 24 }, (_, i) => `logic/logic-${String(i + 1).padStart(2, '0')}`),
]) {
  await mkdir(`${output}/${route}`, { recursive: true });
  await copyFile(`${output}/index.html`, `${output}/${route}/index.html`);
}
await writeFile(`${output}/.nojekyll`, '');
console.log(`GitHub Pages files ready in ${output}, base href: ${baseHref}`);
