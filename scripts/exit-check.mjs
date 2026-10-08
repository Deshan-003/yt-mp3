import { _electron as electron } from '@playwright/test';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const folder = path.join(tmpdir(), 'YT-MP3');
const before = await readdir(folder).catch(() => []);
const app = await electron.launch(process.env.YT_MP3_TEST_EXE ? { executablePath: process.env.YT_MP3_TEST_EXE } : { args: ['.'] });
try {
  const page = await app.firstWindow();
  await page.getByLabel('YouTube Link', { exact: true }).fill('https://youtu.be/aqz-KE-bpKQ');
  await page.getByLabel('YouTube Link', { exact: true }).press('Enter');
  await page.getByRole('progressbar').waitFor();
  await new Promise(resolve => setTimeout(resolve, 600));
  const closed = app.waitForEvent('close', { timeout: 20000 });
  await page.getByRole('button', { name: 'Close', exact: true }).click().catch(error => { if (!page.isClosed()) throw error; });
  await closed;
} finally { await app.close(); }
assert.deepEqual((await readdir(folder)).sort(), before.sort());
console.log('Exit during conversion cleaned the active job directory.');
