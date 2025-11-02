#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
// no-op: we no longer resolve the vite binary directly
import path from 'node:path';

const log = (...args) => console.log('[runner]', ...args);

function detectPython() {
  const candidates = process.platform === 'win32' ? ['py', 'python', 'python3'] : ['python3', 'python'];
  for (const cmd of candidates) {
    const r = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
    if (r.status === 0) return cmd;
  }
  return null;
}

function run(cmd, args, opts = {}) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  p.on('exit', (code) => {
    if (code !== null && code !== 0) {
      log(`${cmd} exited with code ${code}`);
    }
  });
  return p;
}

// Ensure Node deps
if (!existsSync(path.join(process.cwd(), 'node_modules'))) {
  log('Installing Node dependencies...');
  const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Ensure Python deps
const py = detectPython();
if (!py) {
  log('Warning: Python not found on PATH. Backend may not start.');
}
if (py) {
  log('Installing Python dependencies (backend/requirements.txt)...');
  const r = spawnSync(py, ['-m', 'pip', 'install', '-r', 'backend/requirements.txt'], { stdio: 'inherit' });
  if (r.status !== 0) {
    log('pip install failed. You can install manually and re-run.');
  }
}

// Start backend (FastAPI)
let backend = null;
if (py) {
  backend = run(py, ['-m', 'uvicorn', 'backend.main:app', '--reload', '--port', '8000'], {
    env: process.env,
    cwd: process.cwd(),
  });
}

// Start frontend via npm run dev (more robust on Windows)
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const frontend = run(npmCmd, ['run', 'dev'], { env: process.env, cwd: process.cwd() });

function shutdown() {
  log('Shutting down...');
  if (backend && backend.pid) {
    try { process.kill(backend.pid); } catch {}
  }
  if (frontend && frontend.pid) {
    try { process.kill(frontend.pid); } catch {}
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', shutdown);
