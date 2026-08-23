import { spawn } from 'node:child_process';

const GRACE_MS = 10_000;

const definitions = [
  {
    command: process.execPath,
    args: ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', '3001'],
    env: { ...process.env },
  },
  {
    command: process.execPath,
    args: ['octo-admin/index.js'],
    env: { ...process.env, OCTO_ADMIN_HOST:"127.0.0.1", OCTO_ADMIN_PORT:"3005" },
  },
  {
    command: process.execPath,
    args: ['--import', 'tsx', 'backend/src/server.ts'],
    env: { ...process.env, BACKEND_HOST:"127.0.0.1", BACKEND_PORT:"4001" },
  },
];

let shuttingDown = false;
const children = [];

function killAll(signal) {
  for (const child of children) {
    try { child.kill(signal); } catch {}
  }
}

function initiateShutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;

  killAll('SIGTERM');

  const timer = setTimeout(() => {
    killAll('SIGKILL');
  }, GRACE_MS);
  timer.unref?.();

  let pending = children.filter(c => !c.exitCode && c.exitCode !== 0).length;
  if (pending === 0) process.exit(exitCode);

  for (const child of children) {
    child.on('exit', () => {
      pending -= 1;
      if (pending <= 0) process.exit(exitCode);
    });
  }
}

process.on('SIGINT', () => initiateShutdown(0));
process.on('SIGTERM', () => initiateShutdown(0));

for (const def of definitions) {
  const child = spawn(def.command, def.args, {
    stdio: 'inherit',
    shell: false,
    env: def.env,
  });

  children.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const status = code !== null ? code : 1;
    const failed = status !== 0 || signal !== null;
    initiateShutdown(failed ? (status || 1) : 1);
  });

  child.on('error', () => {
    if (!shuttingDown) initiateShutdown(1);
  });
}