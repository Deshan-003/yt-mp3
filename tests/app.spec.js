import { test, expect } from '@playwright/test';
import { youtubeId } from '../src/services/validation.ts';
import { mp3Filename } from '../shared/filename.ts';
const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

test('validates supported URLs and rejects deceptive hosts', () => {
  for (const url of [link, 'https://youtu.be/dQw4w9WgXcQ?t=3', 'https://m.youtube.com/shorts/dQw4w9WgXcQ', 'https://youtube.com/live/dQw4w9WgXcQ']) expect(youtubeId(url)).toBe('dQw4w9WgXcQ');
  for (const url of ['', 'hello', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=short', 'javascript:alert(1)', 'https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ', 'https://youtube.com/playlist?list=abc']) expect(youtubeId(url)).toBeNull();
});

test('inline validation and keyboard submission', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('YouTube Link', { exact: true }).fill('not a link');
  await page.getByLabel('YouTube Link', { exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toHaveText('Please enter a valid YouTube link.');
  await expect(page.getByLabel('YouTube Link', { exact: true })).toBeFocused();
  await page.screenshot({ path: 'test-results/error.png' });
});

test('complete flow, honest save preview, and reset', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.screenshot({ path: 'test-results/idle.png' });
  await page.getByLabel('YouTube Link', { exact: true }).fill(link);
  await page.getByRole('button', { name: 'Convert to MP3' }).click();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await page.screenshot({ path: 'test-results/converting.png' });
  await expect(page.getByRole('heading', { name: 'MP3 Ready' })).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'test-results/ready.png' });
  await page.getByRole('button', { name: 'Save MP3', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('does not create an MP3');
  await page.getByRole('button', { name: 'Convert Another' }).click();
  await expect(page.getByLabel('YouTube Link', { exact: true })).toHaveValue('');
  expect(errors).toEqual([]);
});

test('cancellation prevents stale completion', async ({ page }) => {
  await page.goto('/');
  await page.clock.install();
  await page.getByLabel('YouTube Link', { exact: true }).fill(link);
  await page.getByRole('button', { name: 'Convert to MP3' }).click();
  await page.getByRole('button', { name: 'Cancel conversion' }).click();
  await page.clock.fastForward(6000);
  await expect(page.getByRole('button', { name: 'Convert to MP3' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'MP3 Ready' })).toHaveCount(0);
});

test('conversion failure retains the URL for retry', async ({ page }) => {
  await page.goto('/?fail=converting');
  await page.getByLabel('YouTube Link', { exact: true }).fill(link);
  await page.getByRole('button', { name: 'Convert to MP3' }).click();
  await expect(page.getByRole('alert')).toHaveText("Couldn't convert this video. Please try again.");
  await expect(page.getByLabel('YouTube Link', { exact: true })).toHaveValue(link);
});

test('clipboard paste and denied access', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(value => Object.defineProperty(navigator.clipboard, 'readText', { configurable: true, value: async () => value }), link);
  await page.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(page.getByLabel('YouTube Link', { exact: true })).toHaveValue(link);
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'readText', { value: async () => { throw Error('denied'); } }));
  await page.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Ctrl+V');
});

test('compact layout fits 650 by 450 in every primary state', async ({ page }) => {
  await page.setViewportSize({ width: 650, height: 450 }); await page.goto('/');
  const fits = async () => expect(await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))).toEqual({ width: 650, height: 450 });
  await fits();
  await page.getByLabel('YouTube Link', { exact: true }).fill(link);
  await page.getByRole('button', { name: 'Convert to MP3' }).click();
  await fits();
  await expect(page.getByRole('heading', { name: 'MP3 Ready' })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Save MP3', exact: true }).click();
  await fits();
  await page.screenshot({ path: 'test-results/compact.png' });
});

test('sanitizes Windows filenames including device names and trailing dots', () => {
  expect(mp3Filename('Video <title>: a/b\\c|d?e*f"')).toBe('Video title a b c d e f.mp3');
  expect(mp3Filename('CON')).toBe('_CON.mp3');
  expect(mp3Filename('NUL.mp3')).toBe('_NUL.mp3');
  expect(mp3Filename('...')).toBe('Audio.mp3');
  expect(mp3Filename('name. ')).toBe('name.mp3');
});

for (const [stage, message] of [
  ['fetching', "Couldn't get information for this video."],
  ['downloading', "Couldn't download the audio. Please try again."]
]) test(`${stage} failure is friendly and retryable`, async ({ page }) => {
  await page.goto(`/?fail=${stage}`);
  await page.getByLabel('YouTube Link', { exact: true }).fill(link);
  await page.getByRole('button', { name: 'Convert to MP3' }).click();
  await expect(page.getByRole('alert')).toHaveText(message);
  await expect(page.getByLabel('YouTube Link', { exact: true })).toHaveValue(link);
});

test('pasting invalid text validates without starting conversion', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'readText', { configurable: true, value: async () => 'not youtube' }));
  await page.getByRole('button', { name: 'Paste', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Please enter a valid YouTube link.');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});
