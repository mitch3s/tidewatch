import { expect, test } from '@playwright/test';

/**
 * Visual regression for every species (plan 6.5), drawn frozen in a fixed
 * pose. Tagged @visual and run with `npm run test:visual`, because reference
 * images depend on the operating system's rendering. After an intended look
 * change, update them with `npm run test:visual -- --update-snapshots`.
 */
const IDS = [
  'ocellaris-clownfish',
  'yellow-tang',
  'blue-tang',
  'royal-gramma',
  'moorish-idol',
  'mandarin-dragonet',
  'neon-tetra',
  'bronze-corydoras',
  'freshwater-angelfish',
  'discus',
  'zebra-pleco',
  'silver-arowana',
  'atolla-jellyfish',
  'spotted-lanternfish',
  'lovely-hatchetfish',
  'vampire-squid',
  'dumbo-octopus',
  'humpback-anglerfish',
];

for (const id of IDS) {
  test(`${id} looks the same @visual`, async ({ page }) => {
    await page.goto(`/?fish=${id}&still`);
    await page.waitForTimeout(300);
    await expect(page.locator('#stage canvas')).toHaveScreenshot(`${id}.png`, { maxDiffPixelRatio: 0.01 });
  });
}
