import { _electron as electron, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { stat, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const output = path.resolve('test-results/Big Buck Bunny - backend verification.mp3');
await mkdir(path.dirname(output), { recursive: true });
const env = { ...process.env };
if (process.env.YT_MP3_DEV_TEST === 'true') env.VITE_DEV_SERVER_URL = 'http://127.0.0.1:5173';
const app = await electron.launch({ ...(process.env.YT_MP3_TEST_EXE ? { executablePath: process.env.YT_MP3_TEST_EXE } : { args: ['.'] }), env, timeout: 60000 });
const evidence = { mode: process.env.YT_MP3_TEST_EXE ? 'installed' : process.env.YT_MP3_DEV_TEST ? 'development' : 'production source', stages: [], output };
try {
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.getByRole('heading', { name: 'YT MP3', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined');
  assert.deepEqual(await app.evaluate(({ BrowserWindow }) => {
    const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return [p.contextIsolation, p.nodeIntegration, p.sandbox];
  }), [true, false, true]);
  await page.getByLabel('YouTube Link', { exact: true }).fill('https://www.youtube.com/watch?v=___________');
  await page.getByLabel('YouTube Link', { exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toHaveText('This video is unavailable.', { timeout: 60000 });
  await page.evaluate(() => {
    window.testUpdates = [];
    window.electronAPI.onConversionProgress(update => window.testUpdates.push(update));
  });
  await app.evaluate(({ clipboard }) => { clipboard.readText = () => 'https://www.youtube.com/watch?v=aqz-KE-bpKQ'; });
  await page.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(page.getByLabel('YouTube Link', { exact: true })).toHaveValue('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
  await page.getByLabel('YouTube Link', { exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'MP3 Ready' }).waitFor({ timeout: 240000 });
  await expect(page.getByText('Your audio has been successfully converted.')).toBeVisible();
  const updates = await page.evaluate(() => window.testUpdates);
  evidence.stages = [...new Set(updates.map(u => u.stage))];
  assert.deepEqual(evidence.stages, ['fetching', 'downloading', 'converting']);
  assert.equal(updates.at(-1).progress, 100);
  assert(updates.every((u, i) => i === 0 || u.progress >= updates[i - 1].progress));
  await expect.poll(() => page.evaluate(() => [...document.images].every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: 'test-results/real-' + evidence.mode + '.png' });
  // Exercise the real save handler with deterministic native-dialog outcomes.
  await app.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: true }); });
  await page.getByRole('button', { name: 'Save MP3', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save MP3', exact: true })).toBeEnabled();
  await app.evaluate(({ dialog }) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: 'Z:\\missing-yt-mp3-test\\output.mp3' }); });
  await page.getByRole('button', { name: 'Save MP3', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText("Couldn't save the MP3");
  await app.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }); }, output);
  await page.getByRole('button', { name: 'Save MP3', exact: true }).click();
  await expect(page.getByText('Your MP3 has been saved.')).toBeVisible({ timeout: 15000 });
  assert((await stat(output)).size > 1000000);
  const bin = process.env.YT_MP3_TEST_EXE ? path.join(path.dirname(process.env.YT_MP3_TEST_EXE), 'resources/bin') : path.resolve('resources/bin');
  evidence.probe = JSON.parse(execFileSync(path.join(bin, 'ffprobe.exe'), ['-v', 'error', '-show_entries', 'stream=codec_name,bit_rate:format=duration,size', '-of', 'json', output], { encoding: 'utf8', windowsHide: true }));
  assert.equal(evidence.probe.streams[0].codec_name, 'mp3');
  assert.equal(evidence.probe.streams[0].bit_rate, '320000');
  assert(Math.abs(Number(evidence.probe.format.duration) - 635) < 3);
  execFileSync(path.join(bin, 'ffmpeg.exe'), ['-v', 'error', '-xerror', '-i', output, '-f', 'null', '-'], { windowsHide: true });
  await page.getByRole('button', { name: 'Convert Another' }).click();
  await expect(page.getByLabel('YouTube Link', { exact: true })).toHaveValue('');
  for (const control of ['Maximize', 'Restore', 'Minimize']) {
    await page.getByRole('button', { name: control, exact: true }).click();
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.restore(); w.setSize(650, 450); });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight));
  assert.deepEqual(errors, []);
  const closed = app.waitForEvent('close', { timeout: 20000 });
  await page.getByRole('button', { name: 'Close', exact: true }).click().catch(error => { if (!page.isClosed()) throw error; });
  await closed;
  evidence.passed = true;
  await writeFile('test-results/real-' + evidence.mode + '.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await app.close(); }
