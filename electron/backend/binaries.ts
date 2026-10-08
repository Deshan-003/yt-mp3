import path from 'node:path';
import { access } from 'node:fs/promises';
export interface Binaries { ytDlp: string; ffmpeg: string; ffprobe: string; deno: string; directory: string }
export function binaryPaths(directory: string): Binaries {
  return { directory, ytDlp: path.join(directory, 'yt-dlp.exe'), ffmpeg: path.join(directory, 'ffmpeg.exe'),
    ffprobe: path.join(directory, 'ffprobe.exe'), deno: path.join(directory, 'deno.exe') };
}
export async function verifyBinaries(binaries: Binaries) {
  for (const file of [binaries.ytDlp, binaries.ffmpeg, binaries.ffprobe, binaries.deno]) {
    try { await access(file); } catch { throw new Error('TOOLS_MISSING'); }
  }
}
export function youtubeOptions(binaries: Binaries) {
  return ['--ignore-config', '--no-plugin-dirs', '--no-playlist', '--no-cache-dir', '--no-colors',
    '--socket-timeout', '30', '--retries', '2', '--fragment-retries', '2',
    '--no-js-runtimes', '--js-runtimes', 'deno:' + binaries.deno,
    '--ffmpeg-location', binaries.directory];
}

