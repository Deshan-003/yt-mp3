import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['yt-dlp.exe', 'ffmpeg.exe', 'ffprobe.exe', 'deno.exe'];
if (!files.every(file => existsSync(path.join(root, 'resources/bin', file)))) {
  if (process.platform !== 'win32') throw new Error('Tool setup requires Windows.');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
    path.join(root, 'scripts/fetch-tools.ps1')], { cwd: root, stdio: 'inherit', windowsHide: true, shell: false });
  if (result.status !== 0) throw new Error('Conversion tool setup failed.');
}
const manifest = JSON.parse(readFileSync(path.join(root, 'resources/bin/checksums.json'), 'utf8').replace(/^\uFEFF/, ''));
for (const file of files) {
  const expected = manifest.find(entry => entry.File === file)?.Hash.toLowerCase();
  const actual = createHash('sha256').update(readFileSync(path.join(root, 'resources/bin', file))).digest('hex');
  if (actual !== expected) throw new Error('Tool checksum mismatch: ' + file + '. Run npm run tools:fetch.');
}
console.log('Bundled Windows conversion tools verified.');

