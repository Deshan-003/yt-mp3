import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { ConversionManager } = require('../dist-electron/electron/backend/conversionManager.js');
const { binaryPaths } = require('../dist-electron/electron/backend/binaries.js');
const root = await mkdtemp(path.join(tmpdir(), 'YT-MP3-live-test-'));
const manager = new ConversionManager(binaryPaths(path.resolve('resources/bin')), root, () => {});
const evidence = [];
try {
  for (const url of ['https://youtu.be/aqz-KE-bpKQ', 'https://www.youtube.com/shorts/aqz-KE-bpKQ']) {
    const result = await manager.start(randomUUID(), url);
    assert.equal(result.status, 'completed', JSON.stringify(result));
    evidence.push({ url, status: result.status, bytes: result.result.sizeBytes, duration: result.result.duration });
    await manager.reset();
    assert.deepEqual(await readdir(root), []);
  }
  const result = await manager.start(randomUUID(), 'https://www.youtube.com/watch?v=___________');
  assert.equal(result.status, 'error');
  assert.match(result.message, /unavailable|information/);
  evidence.push({ unavailable: result });
  await writeFile('test-results/live-url-checks.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await manager.reset();
  assert(path.dirname(root) === path.resolve(tmpdir()) && path.basename(root).startsWith('YT-MP3-live-test-'));
  await rm(root, { recursive: true, force: true });
}
