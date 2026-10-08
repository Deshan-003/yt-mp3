import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, copyFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { ConversionManager } = require('../dist-electron/electron/backend/conversionManager.js');
const pipeline = require('../dist-electron/electron/backend/pipeline.js');
const { binaryPaths } = require('../dist-electron/electron/backend/binaries.js');
const { runTool, ProcessFailure } = require('../dist-electron/electron/backend/process.js');
const { friendlyError } = require('../dist-electron/electron/backend/errors.js');
const { youtubeId } = require('../dist-electron/shared/validation.js');
const root = await mkdtemp(path.join(tmpdir(), 'YT-MP3-tests-'));
const jobs = path.join(root, 'jobs');
const binaries = binaryPaths(path.resolve('resources/bin'));
const source = path.join(root, 'tone.wav');
execFileSync(binaries.ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', source], { windowsHide: true });
const originals = { ...pipeline };
const meta = { title: 'Test audio', thumbnail: '', duration: 2, uploader: 'YT MP3 automated test', webpageUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ' };
function fixture() {
  pipeline.getVideoInfo = async () => meta;
  pipeline.downloadAudio = async (_url, _bin, cwd, _signal, progress) => {
    await copyFile(source, path.join(cwd, 'source.wav'));
    await writeFile(path.join(cwd, 'source-path.txt'), path.join(cwd, 'source.wav'));
    progress(50); progress(100);
  };
  pipeline.convertAudio = originals.convertAudio; // Real FFmpeg and FFprobe, not a fake MP3.
  const updates = [];
  const manager = new ConversionManager(binaries, jobs, event => updates.push(event));
  return { manager, updates };
}
test('real encoding, metadata, save cancellation/failure/retry, and safe cleanup', async () => {
  const { manager, updates } = fixture();
  const id = randomUUID();
  const response = await manager.start(id, meta.webpageUrl);
  assert.equal(response.status, 'completed', JSON.stringify(response));
  assert.equal(response.result.isMock, false);
  assert(response.result.sizeBytes > 70000);
  assert.deepEqual([...new Set(updates.map(u => u.stage))], ['fetching', 'downloading', 'converting']);
  assert.equal(updates.at(-1).progress, 100);
  assert.equal(await manager.save(id, async () => undefined), 'canceled');
  await assert.rejects(manager.save(randomUUID(), async () => path.join(root, 'bad.mp3')));
  await assert.rejects(manager.save(id, async () => path.join(root, 'missing', 'bad.mp3')));
  const destination = path.join(root, 'saved.mp3');
  assert.equal(await manager.save(id, async () => destination), 'saved');
  assert.equal((await stat(destination)).size, response.result.sizeBytes);
  await manager.reset();
  assert.deepEqual(await readdir(jobs), []);
  assert((await stat(destination)).size > 0);
});
test('backend independently rejects invalid/untrusted URLs and accepts supported forms', async () => {
  const { manager } = fixture();
  for (const url of ['https://youtube.com.evil.test/watch?v=aqz-KE-bpKQ', 'file:///etc/passwd', '--exec=bad', {}, null])
    assert.equal((await manager.start(randomUUID(), url)).status, 'error');
  for (const url of ['https://youtu.be/aqz-KE-bpKQ', 'https://www.youtube.com/shorts/aqz-KE-bpKQ', meta.webpageUrl])
    assert.equal(youtubeId(url), 'aqz-KE-bpKQ');
  assert.equal((await manager.start(randomUUID(), 'https://youtu.be/aqz-KE-bpKQ')).status, 'completed');
  await manager.reset();
  assert.equal((await manager.start(randomUUID(), 'https://www.youtube.com/shorts/aqz-KE-bpKQ')).status, 'completed');
  await manager.reset();
});
for (const [method, message] of [['getVideoInfo', "Couldn't get information for this video."], ['downloadAudio', "Couldn't download the audio. Please try again."], ['convertAudio', "Couldn't convert this video. Please try again."]]) {
  test(method + ' failure cleans files and supports a fresh job', async () => {
    const { manager } = fixture();
    pipeline[method] = async () => { throw new ProcessFailure(1, 'Controlled failure'); };
    assert.deepEqual(await manager.start(randomUUID(), meta.webpageUrl), { status: 'error', message });
    assert.deepEqual(await readdir(jobs), []);
    fixture(); // Restore all pipeline implementations for retry.
    assert.equal((await manager.start(randomUUID(), meta.webpageUrl)).status, 'completed');
    await manager.reset();
  });
}
test('cancel rejects concurrent work, drains process, and removes all temporary files', async () => {
  const { manager } = fixture();
  pipeline.getVideoInfo = async (_url, _bin, cwd, signal) => {
    await runTool(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { cwd, signal });
    return meta;
  };
  const id = randomUUID();
  const active = manager.start(id, meta.webpageUrl);
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal((await manager.start(randomUUID(), meta.webpageUrl)).status, 'error');
  await manager.cancel(id);
  assert.equal((await active).status, 'canceled');
  assert.deepEqual(await readdir(jobs), []);
});
test('Windows process cancellation terminates child descendants too', async () => {
  const controller = new AbortController();
  const script = "const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(child.pid);setInterval(()=>{},1000)";
  let descendant;
  const run = runTool(process.execPath, ['-e', script], { cwd: root, signal: controller.signal,
    onLine: line => { descendant = Number(line); controller.abort(); } });
  await assert.rejects(run, { name: 'AbortError' });
  assert(descendant > 0);
  assert.throws(() => process.kill(descendant, 0));
});
test('timeout, unavailable, network and disk errors are friendly', async () => {
  assert.equal(friendlyError(new ProcessFailure(1, 'Private video. Sign in'), 'fetching'), 'This video is unavailable.');
  assert.match(friendlyError(new ProcessFailure(1, 'Connection timed out'), 'downloading'), /internet connection/);
  assert.match(friendlyError(Object.assign(new Error(), { code: 'ENOSPC' }), 'converting'), /selected location/);
  await assert.rejects(runTool(process.execPath, ['-e', 'setInterval(()=>{},1000)'],
    { cwd: root, signal: new AbortController().signal, timeoutMs: 100 }), /Conversion tool failed/);
});
test.after(async () => {
  Object.assign(pipeline, originals);
  assert(path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith('YT-MP3-tests-'));
  await rm(root, { recursive: true, force: true });
});

