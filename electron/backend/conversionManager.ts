import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { ConversionOutcome, ConversionProgress, ConversionResult, ConversionStage, VideoMetadata } from '../../shared/types';
import { youtubeId } from '../../shared/validation';
import { verifyBinaries, type Binaries } from './binaries';
import { getVideoInfo, downloadAudio, convertAudio } from './pipeline';
import { friendlyError } from './errors';
import { ProcessFailure } from './process';

interface Job {
  id: string; controller: AbortController; directory?: string; output?: string;
  metadata?: VideoMetadata; result?: ConversionResult; saved?: boolean;
}
export class ConversionManager {
  private job?: Job;
  private running?: Promise<ConversionOutcome>;
  private resetting?: Promise<void>;
  private saving = false;
  constructor(private binaries: Binaries, private tempRoot: string,
    private publish: (event: ConversionProgress) => void,
    private log: (category: string, details?: string) => void = () => {}) {}

  start(requestId: unknown, url: unknown): Promise<ConversionOutcome> {
    if (typeof requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(requestId) ||
      typeof url !== 'string' || url.length > 4096 || !youtubeId(url))
      return Promise.resolve({ status: 'error', message: 'Please enter a valid YouTube link.' });
    if (this.running || this.resetting || this.saving || this.job)
      return Promise.resolve({ status: 'error', message: 'Finish or cancel the current conversion first.' });
    const job: Job = { id: requestId, controller: new AbortController() };
    this.job = job;
    const promise = this.run(job, 'https://www.youtube.com/watch?v=' + youtubeId(url));
    this.running = promise;
    void promise.finally(() => { if (this.running === promise) this.running = undefined; });
    return promise;
  }
  private async run(job: Job, url: string): Promise<ConversionOutcome> {
    let stage: ConversionStage = 'fetching';
    let lastProgress = 0;
    const emit = (progress: number) => {
      if (job.controller.signal.aborted) return;
      lastProgress = Math.max(lastProgress, Math.round(progress));
      this.publish({ requestId: job.id, stage, progress: lastProgress,
        ...(job.metadata || { title: 'Getting video information...', thumbnail: '', duration: 0 }) });
    };
    try {
      this.log('binary detection'); await verifyBinaries(this.binaries);
      await mkdir(this.tempRoot, { recursive: true });
      job.directory = await mkdtemp(path.join(this.tempRoot, 'conversion-'));
      emit(0); this.log('metadata request');
      job.metadata = await getVideoInfo(url, this.binaries, job.directory, job.controller.signal);
      stage = 'downloading'; emit(10); this.log('download start');
      await downloadAudio(url, this.binaries, job.directory, job.controller.signal, percent => emit(10 + percent * 0.6));
      const source = (await readFile(path.join(job.directory, 'source-path.txt'), 'utf8')).trim();
      if (path.dirname(path.resolve(source)) !== path.resolve(job.directory) || !path.basename(source).startsWith('source.'))
        throw new Error('Unexpected source path');
      this.log('download complete'); stage = 'converting'; emit(70);
      job.output = path.join(job.directory, 'audio.mp3'); this.log('FFmpeg start');
      const info = await convertAudio(source, job.output, job.metadata, this.binaries, job.directory,
        job.controller.signal, percent => emit(Math.min(99, 70 + percent * 0.29)));
      // Leave only the verified MP3 until Save As, reset, or exit.
      for (const entry of await readdir(job.directory)) {
        if (entry !== 'audio.mp3') await rm(path.join(job.directory, entry), { recursive: true, force: true });
      }
      job.controller.signal.throwIfAborted();
      emit(100); this.log('FFmpeg complete', String(info.size) + ' bytes');
      job.result = { ...job.metadata, duration: Math.round(info.duration), id: job.id, sizeBytes: info.size,
        format: 'MP3', bitrate: 320, isMock: false };
      return { status: 'completed', result: job.result };
    } catch (error) {
      const canceled = job.controller.signal.aborted;
      this.log(canceled ? 'canceled' : 'error', stage + ': ' +
        (error instanceof ProcessFailure ? 'process exit ' + error.code : (error as NodeJS.ErrnoException)?.code || (error as Error)?.name));
      await this.cleanup(job);
      if (this.job === job) this.job = undefined;
      return canceled ? { status: 'canceled' } : { status: 'error', message: friendlyError(error, stage) };
    }
  }
  async cancel(requestId: unknown) {
    if (this.job?.id === requestId) await this.reset();
  }
  reset(): Promise<void> {
    if (this.resetting) return this.resetting;
    if (this.saving) return Promise.reject(new Error('Save in progress'));
    const job = this.job;
    job?.controller.abort();
    this.resetting = (async () => {
      await this.running;
      if (job) await this.cleanup(job);
      if (this.job === job) this.job = undefined;
    })().finally(() => { this.resetting = undefined; });
    return this.resetting;
  }
  getResult(id: unknown) {
    if (typeof id !== 'string' || this.job?.id !== id || !this.job.result || !this.job.output || this.running)
      throw new Error('Result unavailable');
    return this.job.result;
  }
  async save(id: unknown, choose: (title: string) => Promise<string | undefined>): Promise<'canceled' | 'saved'> {
    const result = this.getResult(id);
    const job = this.job!;
    if (this.saving || this.resetting || job.saved) throw new Error('Save unavailable');
    this.saving = true;
    let staged: string | undefined;
    try {
      const destination = await choose(result.title);
      if (!destination) return 'canceled';
      // The destination comes only from the native dialog. Source paths never cross IPC.
      const comparison = (value: string) => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
      if (comparison(destination).startsWith(comparison(this.tempRoot) + path.sep)) throw new Error('Temporary destination');
      staged = path.join(path.dirname(destination), '.yt-mp3-' + randomUUID() + '.tmp');
      await copyFile(job.output!, staged, constants.COPYFILE_EXCL);
      if ((await stat(staged)).size !== result.sizeBytes) throw new Error('Incomplete copy');
      await rename(staged, destination); staged = undefined;
      if ((await stat(destination)).size !== result.sizeBytes) throw new Error('Incomplete save');
      job.saved = true; this.log('saved');
      await this.cleanup(job);
      return 'saved';
    } finally {
      if (staged) await rm(staged, { force: true }).catch(() => {});
      this.saving = false;
    }
  }
  private async cleanup(job: Job) {
    if (!job.directory) return;
    // Only a directory created by this manager, directly beneath its own temp root.
    if (path.dirname(job.directory) !== path.resolve(this.tempRoot) || !path.basename(job.directory).startsWith('conversion-'))
      throw new Error('Unsafe cleanup path');
    try { await rm(job.directory, { recursive: true, force: true, maxRetries: 6, retryDelay: 150 }); this.log('cleanup'); }
    catch (error) { this.log('cleanup deferred', (error as NodeJS.ErrnoException).code); }
  }
}

