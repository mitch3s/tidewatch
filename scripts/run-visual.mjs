// Runs the @visual screenshot tests (works the same on Windows, macOS, Linux).
import { spawnSync } from 'node:child_process';

const args = ['playwright', 'test', '--grep', '@visual', '--trace', 'off', ...process.argv.slice(2)];
const r = spawnSync('npx', args, { stdio: 'inherit', shell: true, env: { ...process.env, TW_VISUAL: '1' } });
process.exit(r.status ?? 1);
