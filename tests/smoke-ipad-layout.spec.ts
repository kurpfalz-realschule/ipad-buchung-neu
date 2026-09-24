import { test, expect, devices } from '@playwright/test';

/**
 * Warum dieser Test existiert (S1/S2, Akzeptanzkriterium):
 * "Heatmap lesbar auf iPad quer und hoch (834x1112 und 1180x820) sowie auf
 * dem iPhone (390x844)." und "Bedienbar auf dem iPad mit Zielflaechen ab
 * 44 px." Die Scan-Station laeuft auf genau diesen Geraeten an der Wand
 * im Lehrerzimmer -- ein Querscrollen oder zu kleine Tipp-Flaechen waeren
 * dort ein taeglich spuerbares Problem, kein kosmetischer Fehler.
 */
const groessen: Array<{ name: string; width: number; height: number }> = [
  { name: 'iPad quer', width: 1180, height: 820 },
  { name: 'iPad hoch', width: 834, height: 1112 },
  { name: 'iPhone', width: 390, height: 844 },
];

for (const g of groessen) {
  test(`S1/S2: kein Querscrollen + Zielflaechen >= 44px auf ${g.name} (${g.width}x${g.height})`, async ({ page }) => {
    await page.setViewportSize({ width: g.width, height: g.height });
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.waitForSelector('[data-testid="tab-reservieren"]');

    // Kein horizontales Scrollen auf der Startansicht
    const scrollCheck1 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(scrollCheck1, 'kein horizontales Scrollen (Reservieren)').toBe(true);

    // Scan-Station: Eingabefeld + Buttons >= 44px hoch, kein Scrollen
    await page.click('[data-testid="tab-scannen"]');
    await page.waitForSelector('[data-testid="station-input"]');
    const inputBox = await page.locator('[data-testid="station-input"]').boundingBox();
    expect(inputBox?.height, 'Eingabefeld Zielflaeche').toBeGreaterThanOrEqual(44);
    const goBtnBox = await page.locator('[data-testid="station-go"]').boundingBox();
    expect(goBtnBox?.height, '"Scannen"-Button Zielflaeche').toBeGreaterThanOrEqual(44);
    const scrollCheck2 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(scrollCheck2, 'kein horizontales Scrollen (Station)').toBe(true);

    // Auslastung: Heatmap lesbar, kein Scrollen der Seite selbst
    await page.click('[data-testid="tab-verwaltung"]');
    await page.click('[data-testid="verw-auslastung"]');
    await page.waitForSelector('[data-testid="auslastung-view"]');
    await page.waitForTimeout(300);
    const scrollCheck3 = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    expect(scrollCheck3, 'kein horizontales Scrollen der Seite (Auslastung -- die Heatmap selbst darf intern scrollen)').toBe(true);
    await expect(page.locator('[data-testid="ausl-pool"]').first()).toBeVisible();
  });
}
