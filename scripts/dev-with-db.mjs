/**
 * Starts Postgres (docker compose), waits until it accepts connections,
 * builds the app, runs seeds, then starts Nest in watch mode.
 *
 *   pnpm run dev:db
 *
 * Requires: Docker Desktop / docker CLI + compose v2, pnpm.
 */
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = resolve(root, 'docker-compose.yml');
const envFile = resolve(root, '.env.development');

const composeArgsBase = ['compose', '-f', composeFile];
if (existsSync(envFile)) {
  composeArgsBase.push('--env-file', envFile);
}

function run(cmd, args, opts = {}) {
  const useShell =
    process.platform === 'win32' && (cmd === 'pnpm' || cmd === 'npm');
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: useShell,
    ...opts,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function composeExecQuiet(args) {
  const r = spawnSync(
    'docker',
    [...composeArgsBase, 'exec', '-T', 'db', ...args],
    { cwd: root, stdio: 'pipe' },
  );
  return r.status === 0;
}

async function waitForPostgres() {
  const maxAttempts = 45;
  for (let i = 0; i < maxAttempts; i++) {
    if (composeExecQuiet(['pg_isready', '-U', 'postgres'])) {
      return;
    }
    process.stdout.write(
      `\rWaiting for Postgres… (${i + 1}/${maxAttempts})`,
    );
    await delay(1000);
  }
  console.error('\nPostgres did not become ready in time.');
  process.exit(1);
}

async function main() {
  console.log('Starting database container…');
  run('docker', [...composeArgsBase, 'up', '-d', 'db']);

  await waitForPostgres();
  console.log('\nPostgres is ready.');

  console.log('Building (required for pnpm run seed)…');
  run('pnpm', ['run', 'build']);

  console.log('Running seed…');
  run('pnpm', ['run', 'seed']);

  console.log('Starting dev server…');
  run('pnpm', ['run', 'start:dev']);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
