// The app version and the git commit a build comes from (used by vite.config.ts).
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export function buildInfo() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  let commit = 'unknown';
  try {
    const run = (cmd) => execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    commit = run('git rev-parse --short HEAD');
    // "+" marks a build with uncommitted changes.
    if (run('git status --porcelain') !== '') commit += '+';
  } catch {
    // Not a git checkout: keep "unknown".
  }
  return { version: pkg.version, commit };
}
