// Copies the webOS app files into dist/ and builds an .ipk with LG's CLI.
// Run via `npm run package:webos` (which builds first).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const out = join(root, 'out');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}

// A release package must not contain god mode (spec 5.6). Dev packages for
// testing on the TV (`npm run package:webos:dev`) pass --dev and skip this.
const devPackage = process.argv.includes('--dev');
if (!devPackage) {
  const js = readFileSync(join(dist, 'assets', 'app.js'), 'utf8');
  if (js.includes('tw-god') || js.includes('Open the fish lab')) {
    console.error('Release build contains god-mode code. Aborting.');
    process.exit(1);
  }
}

cpSync(join(root, 'webos'), dist, { recursive: true });

// Keep the app version in sync with package.json.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const appinfoPath = join(dist, 'appinfo.json');
const appinfo = JSON.parse(readFileSync(appinfoPath, 'utf8'));
appinfo.version = pkg.version;
writeFileSync(appinfoPath, JSON.stringify(appinfo, null, 2) + '\n');

mkdirSync(out, { recursive: true });
const bin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'ares-package.cmd' : 'ares-package');
execFileSync(bin, [dist, '-o', out, '--no-minify'], { stdio: 'inherit', shell: process.platform === 'win32' });
console.log(`\nPackage written to ${out}`);
