import { _electron as electron, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const app = await electron.launch(process.env.YT_MP3_TEST_EXE ? { executablePath: process.env.YT_MP3_TEST_EXE } : { args: ['.'] });
try {
  const page = await app.firstWindow();
  await page.getByLabel('YouTube Link', { exact: true }).fill('https://youtu.be/aqz-KE-bpKQ');
  await page.getByLabel('YouTube Link', { exact: true }).press('Enter');
  await page.getByRole('heading', { name: 'MP3 Ready' }).waitFor({ timeout: 240000 });
  await writeFile('test-results/native-save-pid.txt', String(app.process().pid));
  await page.getByRole('button', { name: 'Save MP3', exact: true }).click();
  console.log('Native Save As opened. Awaiting dialog interaction.');
  await expect(page.getByText('Your MP3 has been saved.')).toBeVisible({ timeout: 180000 });
  await page.screenshot({ path: 'test-results/native-save-success.png' });
  console.log('Native Save As successfully saved the real converted MP3.');
} finally { await app.close(); }
