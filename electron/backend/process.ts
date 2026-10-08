import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

export class ProcessFailure extends Error {
  constructor(public readonly code: number | null, public readonly details: string) {
    super('Conversion tool failed'); this.name = 'ProcessFailure';
  }
}
export const abortError = () => new DOMException('Conversion canceled', 'AbortError');
async function terminateTree(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform !== 'win32') { child.kill('SIGKILL'); return; }
  await new Promise<void>(resolve => {
    const killer = spawn(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
      ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, shell: false, stdio: 'ignore' });
    killer.once('error', () => { child.kill(); resolve(); });
    killer.once('close', () => resolve());
  });
}
export function runTool(executable: string, args: string[], options: {
  signal: AbortSignal; cwd: string; onLine?: (line: string) => void; timeoutMs?: number;
}): Promise<string> {
  if (options.signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', DENO_NO_UPDATE_CHECK: '1' }
    });
    let output = '', errors = '', pending = '', timedOut = false, oversized = false;
    let termination: Promise<void> | undefined;
    const stop = () => { termination ??= terminateTree(child); };
    options.signal.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(() => { timedOut = true; stop(); }, options.timeoutMs ?? 30 * 60_000);
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      output += chunk;
      if (output.length > 16 * 1024 * 1024) { oversized = true; stop(); return; }
      pending += chunk;
      const lines = pending.split(/\r?\n/); pending = lines.pop() || '';
      for (const line of lines) options.onLine?.(line);
    });
    child.stderr.on('data', (chunk: string) => { errors = (errors + chunk).slice(-65536); });
    const cleanup = () => { clearTimeout(timer); options.signal.removeEventListener('abort', stop); };
    child.once('error', error => { cleanup(); reject(error); });
    child.once('close', async code => {
      cleanup(); await termination;
      if (options.signal.aborted) reject(abortError());
      else if (timedOut) reject(new ProcessFailure(code, 'Connection timed out'));
      else if (oversized) reject(new ProcessFailure(code, 'Tool output exceeded limit'));
      else if (code !== 0) reject(new ProcessFailure(code, errors));
      else { if (pending) options.onLine?.(pending); resolve(output); }
    });
  });
}

