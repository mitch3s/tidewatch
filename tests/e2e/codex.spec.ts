import { expect, type Page, test } from '@playwright/test';

/** Remote-only flows through the codex (plan 7.9). Arrow keys, Enter = OK, Escape = Back. */

const focused = (page: Page) => page.locator('.tw-codex .tw-focused');
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('tidewatch.save') ?? 'null'));

test('Up opens the codex; browse, open an entry, go back, close', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.tw-codex')).toBeVisible();
  await expect(page.locator('.tw-tab.tw-active')).toContainText('Coral reef');
  await expect(page.locator('.tw-tab.tw-active')).toContainText('2 / 6');
  await expect(focused(page)).toContainText('Ocellaris clownfish');

  await page.keyboard.press('ArrowRight');
  await expect(focused(page)).toContainText('Yellow tang');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tw-entry h2')).toHaveText('Yellow tang');
  await expect(page.locator('.tw-sci')).toHaveText('Zebrasoma flavescens');
  await expect(page.locator('.tw-entry')).toContainText('Did you know?');
  await expect(page.locator('.tw-sources')).toContainText('FishBase');

  // Left/right steps through the collected fish of this tank.
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.tw-entry h2')).toHaveText('Ocellaris clownfish');

  await page.keyboard.press('Escape');
  await expect(page.locator('.tw-grid')).toBeVisible();
  await expect(focused(page)).toContainText('Ocellaris clownfish');
  await page.keyboard.press('Escape');
  await expect(page.locator('.tw-codex')).toHaveCount(0);
});

test('Back also opens the codex from the aquarium', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('Escape');
  await expect(page.locator('.tw-codex')).toBeVisible();
});

test('unseen fish cannot be opened', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(focused(page)).toContainText('Not found yet');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tw-grid')).toBeVisible();
});

test('a caught visitor appears in the codex with its facts', async ({ page }) => {
  await page.goto('/?reset&visitor=now');
  await expect(page.locator('.tw-hint')).toHaveClass(/tw-show/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.tw-toast')).toContainText('caught');
  await page.keyboard.press('ArrowUp');
  const card = page.locator('[data-species="mandarin-dragonet"]');
  await expect(card).toContainText('Mandarin dragonet');
  await expect(card).toContainText('Rare visitor');
  await card.click();
  await expect(page.locator('.tw-entry')).toContainText('cyanophores');
});

test('a missed visitor shows as a sighted silhouette', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?reset&visitor=now');
  await expect(page.locator('.tw-toast')).toContainText('swam by', { timeout: 35_000 });
  // After 25 s without input the viewer is idle: the first press only wakes the UI (spec 5.5).
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.tw-codex')).toHaveCount(0);
  await page.keyboard.press('ArrowUp');
  const card = page.locator('[data-species="mandarin-dragonet"]');
  await expect(card).toHaveClass(/tw-sighted/);
  await expect(card).toContainText('Sighted');
  await card.click();
  await expect(page.locator('.tw-entry')).toContainText('Catch it next time');
});

test('the Amazon tab explains how to unlock it', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp'); // to the tabs
  await page.keyboard.press('ArrowRight'); // Amazon river
  await expect(page.locator('.tw-tab.tw-active')).toContainText('Amazon river');
  await expect(page.locator('.tw-locked')).toContainText('Collect 4 fish in the coral reef');
});

test('settings change with the remote and are saved', async ({ page }) => {
  await page.goto('/?reset');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight'); // Settings tab
  await expect(page.locator('.tw-settings')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(focused(page)).toContainText('Switch tanks automatically');
  await expect(focused(page)).toContainText('Every 15 min');
  await page.keyboard.press('ArrowRight');
  await expect(focused(page)).toContainText('Every 30 min');
  await page.keyboard.press('ArrowDown');
  await expect(focused(page)).toContainText('Day and night lighting');
  await page.keyboard.press('Enter');
  await expect(focused(page)).toContainText('Off');
  await page.keyboard.press('Escape'); // closing the codex saves
  const s = await saved(page);
  expect(s.settings).toEqual({ rotationMin: 30, dayNight: false });
});

test('reset progress needs a second press', async ({ page }) => {
  await page.goto('/?reset&collectAll');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(focused(page)).toContainText('Reset progress');
  await page.keyboard.press('Enter');
  await expect(focused(page)).toContainText('Press OK again');
  await page.keyboard.press('Enter');
  const s = await saved(page);
  expect(s.unlockedBiomes).toEqual(['reef']);
  expect(s.species['blue-tang'].state).toBe('unseen');
});

test('a due visitor waits while the codex is open, then appears', async ({ page }) => {
  test.setTimeout(60_000);
  // At 600x, the first visitor (due after 45-90 game minutes) is due within 9 real seconds.
  await page.goto('/?reset&timescale=600');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('.tw-codex')).toBeVisible();
  await page.waitForTimeout(11_000);
  await expect(page.locator('.tw-hint')).not.toHaveClass(/tw-show/);
  // Inside the codex keys always act (nothing fades there), so one Back closes it.
  await page.keyboard.press('Escape');
  await expect(page.locator('.tw-codex')).toHaveCount(0);
  await expect(page.locator('.tw-hint')).toHaveClass(/tw-show/, { timeout: 3000 });
});
