import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (S1, Akzeptanzkriterium):
 * "abgeholt_prozent = null erscheint als 'noch keine Daten'." 0 % wuerde
 * behaupten, dass niemand Koffer abholt -- das ist nicht dasselbe wie
 * "wir haben dazu noch keine Messung" (Mindestgruppengroesse 5, siehe
 * IPAD-BUCHUNG-KONTEXT.md Abschnitt 13). Der Demo-DataService liefert im
 * Grundzustand (keine Ausgaben, kaum Buchungen) genau diesen Fall von
 * selbst -- das macht den Test realistisch statt konstruiert.
 */
test('S1: null-Kennzahlen erscheinen als "noch keine Daten", nie als 0 %', async ({ page }) => {
  await page.goto('/index.html?forceMode=demo&forceUser=Ko');
  await page.waitForSelector('[data-testid="tab-verwaltung"]');
  await page.click('[data-testid="tab-verwaltung"]');
  await page.click('[data-testid="verw-auslastung"]');
  await expect(page.locator('[data-testid="auslastung-view"]')).toBeVisible();
  await page.waitForTimeout(400);

  const storniert = await page.locator('[data-testid="ausl-storniert"]').innerText();
  const abgeholt = await page.locator('[data-testid="ausl-abgeholt"]').innerText();
  expect(storniert).toContain('noch keine Daten');
  expect(abgeholt).toContain('noch keine Daten');
  expect(storniert).not.toContain('0 %');
  expect(abgeholt).not.toContain('0 %');
});
