import { expect, test } from '@playwright/test';

test('the aquarium loads without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  const canvas = page.locator('#stage canvas');
  await expect(canvas).toBeVisible();
  // The canvas keeps a 16:9 shape inside the viewport.
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  await page.waitForTimeout(500);
  expect(errors).toEqual([]);
});

test('the species preview renders a fish', async ({ page }) => {
  await page.goto('/?fish=ocellaris-clownfish&still');
  await page.waitForTimeout(300);
  // Sample the centre of the stage: it should be clownfish orange-ish, not water.
  const rgb = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas') as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const d = ctx.getImageData(Math.round(c.width * 0.42), Math.round(c.height * 0.45), 1, 1).data;
    return [d[0]!, d[1]!, d[2]!];
  });
  expect(rgb[0]).toBeGreaterThan(200);
  expect(rgb[2]).toBeLessThan(120);
});

test('desktop keys map to remote actions without browser side effects', async ({ page }) => {
  await page.goto('/');
  const url = page.url();
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  expect(page.url()).toBe(url);
});
