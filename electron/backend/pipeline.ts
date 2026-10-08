import path from 'node:path';
import { stat } from 'node:fs/promises';
import type { VideoMetadata } from '../../shared/types';
import type { Binaries } from './binaries';
import { youtubeOptions } from './binaries';
import { runTool } from './process';

export async function getVideoInfo(url: string, binaries: Binaries, cwd: string, signal: AbortSignal): Promise<VideoMetadata> {
  const raw = await runTool(binaries.ytDlp, [...youtubeOptions(binaries), '--skip-download', '--dump-single-json', '--', url],
    { cwd, signal, timeoutMs: 180_000 });
  const data = JSON.parse(raw);
  if (data.is_live || data.live_status === 'is_upcoming' || !Number.isFinite(data.duration) || data.duration <= 0)
    throw new Error('Video unavailable');
  let thumbnail = '';
  try {
    const candidate = new URL(data.thumbnail);
    if (candidate.protocol === 'https:' && (candidate.hostname === 'i.ytimg.com' || candidate.hostname.endsWith('.ytimg.com')))
      thumbnail = candidate.href;
  } catch { /* Use local artwork for absent/unsupported thumbnails. */ }
  return { title: String(data.title || 'Audio').slice(0, 1000), duration: data.duration, thumbnail,
    uploader: String(data.uploader || '').slice(0, 500), webpageUrl: url };
}
export async function downloadAudio(url: string, binaries: Binaries, cwd: string, signal: AbortSignal, progress: (percent: number) => void) {
  await runTool(binaries.ytDlp, [...youtubeOptions(binaries), '--newline', '--progress', '--no-simulate',
    '--progress-template', 'download:YT_PROGRESS:%(progress._percent_str)s', '--no-warnings',
    '-f', 'bestaudio/best', '-o', path.join(cwd, 'source.%(ext)s'), '--print-to-file', 'after_move:filepath', path.join(cwd, 'source-path.txt'), '--', url],
    { cwd, signal, onLine: line => {
      const match = /^YT_PROGRESS:\s*([\d.]+)%/.exec(line);
      if (match) progress(Math.min(100, Math.max(0, Number(match[1]))));
    } });
}
export async function convertAudio(source: string, output: string, metadata: VideoMetadata, binaries: Binaries,
  cwd: string, signal: AbortSignal, progress: (percent: number) => void) {
  await runTool(binaries.ffmpeg, ['-hide_banner', '-nostdin', '-loglevel', 'error', '-y', '-i', source,
    '-map', '0:a:0', '-vn', '-c:a', 'libmp3lame', '-b:a', '320k', '-id3v2_version', '3',
    '-metadata', 'title=' + metadata.title, '-metadata', 'artist=' + metadata.uploader,
    '-progress', 'pipe:1', '-nostats', output], { cwd, signal, onLine: line => {
      const match = /^out_time_us=(\d+)/.exec(line);
      if (match) progress(Math.min(100, Number(match[1]) / 1_000_000 / metadata.duration * 100));
    } });
  const info = JSON.parse(await runTool(binaries.ffprobe,
    ['-v', 'error', '-show_entries', 'stream=codec_name,bit_rate:format=duration,size', '-of', 'json', output], { cwd, signal, timeoutMs: 30_000 }));
  const audio = info.streams?.find((stream: { codec_name: string }) => stream.codec_name === 'mp3');
  const duration = Number(info.format?.duration);
  const size = (await stat(output)).size;
  if (!audio || Number(audio.bit_rate) !== 320000 || size < 1024 || !Number.isFinite(duration) ||
    Math.abs(duration - metadata.duration) > Math.max(3, metadata.duration * 0.02)) throw new Error('Invalid or truncated MP3');
  return { size, duration };
}

