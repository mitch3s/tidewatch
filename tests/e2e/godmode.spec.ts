import { expect, type Page, test } from '@playwright/test';

const row = (page: Page, label: string) => page.locator('.tw-god-row', { hasText: label }).first();

test('?god opens the panel and the badge', async ({ page }) => {
  await page.goto('/?reset&god');
  await expect(page.locator('.tw-god-badge')).toHaveText('GOD');
  await expect(page.locator('.tw-god-panel')).toBeVisible();
});

test('G toggles god mode; Back closes it', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('g');
  await expect(page.locator('.tw-god-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.tw-god-panel')).toHaveCount(0);
});

test('the colour-button sequence opens god mode (keys 1-4 on a PC)', async ({ page }) => {
  await page.goto('/?reset');
  for (const k of ['1', '2', '3', '4']) await page.keyboard.press(k);
  await expect(page.locator('.tw-god-panel')).toBeVisible();
});

test('the panel works with remote keys only', async ({ page }) => {
  await page.goto('/?reset&god');
  // The first row is "Open the fish lab"; move down to "Visitor" and back up.
  await expect(page.locator('.tw-god-row.tw-focus')).toContainText('Open the fish lab');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.tw-god-row.tw-focus')).toContainText('Visitor');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  // "Summon this visitor" → a visitor appears.
  await expect(page.locator('.tw-hint')).toHaveClass(/tw-show/);
});

test('collect everything goes through the game and is saved', async ({ page }) => {
  await page.goto('/?reset&god');
  await row(page, 'Collect everything').click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('tidewatch.save')!));
  expect(Object.values(s.species as Record<string, { state: string }>).every((p) => p.state === 'collected')).toBe(true);
  expect(s.unlockedBiomes).toEqual(['reef', 'amazon']);
});

test('setting a species back to unseen is saved', async ({ page }) => {
  await page.goto('/?reset&god');
  const clown = row(page, 'Ocellaris clownfish');
  await expect(clown).toContainText('collected');
  await clown.click(); // collected → unseen (choices cycle)
  await expect(clown).toContainText('unseen');
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('tidewatch.save')!));
  expect(s.species['ocellaris-clownfish'].state).toBe('unseen');
});

test('the fish lab opens, edits a value, and goes back', async ({ page }) => {
  await page.goto('/?reset&god');
  await row(page, 'Open the fish lab').click();
  await expect(page.locator('.tw-god-title')).toContainText('Fish lab');
  await expect(row(page, 'upper')).toBeVisible();
  // Nudge the body height with the remote: focus the row, then right.
  await row(page, 'upper').click();
  const before = await row(page, 'upper').locator('.tw-god-value').textContent();
  await page.keyboard.press('ArrowRight');
  await expect(row(page, 'upper').locator('.tw-god-value')).not.toHaveText(before!);
  await page.keyboard.press('Escape');
  await expect(page.locator('.tw-god-title')).toContainText('God mode');
});

test('importing a bad save shows an error and keeps progress', async ({ page }) => {
  await page.goto('/?reset&god');
  await page.locator('.tw-god-row textarea').first().fill('{"not": "a save"}');
  await page.locator('.tw-god-row textarea').first().dispatchEvent('change');
  const imp = row(page, 'Import the JSON above');
  await imp.click();
  await imp.click(); // confirm
  await expect(page.locator('.tw-toast')).toContainText('Import failed');
});

test('god mode opens from the codex settings (for remotes without colour buttons)', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight'); // Settings tab
  const row = page.locator('[data-setting="god"]');
  await expect(row).toContainText('Open god mode');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown');
  await expect(page.locator('.tw-codex .tw-focused')).toContainText('Open god mode');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tw-codex')).toHaveCount(0);
  await expect(page.locator('.tw-god-panel')).toBeVisible();
});
