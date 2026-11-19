import { expect, type Page, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('tidewatch.save') ?? 'null'));
}

test('a fresh start has the reef and its two starter fish', async ({ page }) => {
  await page.goto('/?reset');
  await expect(page.locator('.tw-brand')).toContainText('Coral reef');
  await page.waitForTimeout(300);
  // Saving happens on events or every 30 s; force one by hiding the page.
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const s = await saved(page);
  expect(s.unlockedBiomes).toEqual(['reef']);
  expect(s.species['ocellaris-clownfish'].state).toBe('collected');
  expect(s.species['yellow-tang'].state).toBe('collected');
});

test('catching a rare visitor with OK collects it', async ({ page }) => {
  await page.goto('/?reset&visitor=now');
  const hint = page.locator('.tw-hint');
  await expect(hint).toHaveClass(/tw-show/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.tw-toast')).toContainText('You caught a Mandarin dragonet!');
  await expect(hint).not.toHaveClass(/tw-show/);
  const s = await saved(page);
  expect(s.species['mandarin-dragonet'].state).toBe('collected');
});

test('progress survives a reload', async ({ page }) => {
  await page.goto('/?reset&visitor=now');
  await expect(page.locator('.tw-hint')).toHaveClass(/tw-show/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.tw-toast')).toContainText('caught');
  await page.goto('/');
  await page.waitForTimeout(300);
  const s = await saved(page);
  expect(s.species['mandarin-dragonet'].state).toBe('collected');
});

test('a missed visitor is marked as sighted', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?reset&visitor=now');
  await expect(page.locator('.tw-hint')).toHaveClass(/tw-show/);
  await expect(page.locator('.tw-toast')).toContainText('swam by', { timeout: 35_000 });
  const s = await saved(page);
  expect(s.species['mandarin-dragonet'].state).toBe('sighted');
});

test('an arrival adds a new fish and says so', async ({ page }) => {
  await page.goto('/?reset&arrival=now');
  await expect(page.locator('.tw-toast')).toContainText('has settled in');
  const s = await saved(page);
  const collected = Object.values(s.species as Record<string, { state: string }>).filter((p) => p.state === 'collected');
  expect(collected).toHaveLength(3);
});

test('left/right switches between unlocked tanks', async ({ page }) => {
  await page.goto('/?reset&unlockAll');
  const brand = page.locator('.tw-brand');
  await expect(brand).toContainText('Coral reef');
  await expect(brand).toContainText('switch tank');
  await page.keyboard.press('ArrowRight');
  await expect(brand).toContainText('Amazon river');
  await page.keyboard.press('ArrowLeft');
  await expect(brand).toContainText('Coral reef');
});

test('a moment plays, shows its caption, and is recorded once it ends (v1.4)', async ({ page }) => {
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/?reset&unlockAll&moment=corydoras-air');
  await expect(page.locator('.tw-brand')).toContainText('Amazon river');
  // Behind the "new tank" messages from unlocking everything.
  await expect(page.locator('.tw-toast', { hasText: 'A gulp of air' })).toBeVisible({ timeout: 30_000 });
  await expect.poll(async () => (await saved(page))?.moments?.['corydoras-air']?.witnessedAt, { timeout: 30_000 }).toBeTruthy();
  expect(errors).toEqual([]);
});
