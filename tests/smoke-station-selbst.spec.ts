import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (Sprint 3, 20.09.2026):
 * Norberts Vorgabe fuer den Scan-Ablauf lautet:
 *  · Auf dem eigenen iPad ist man ohnehin angemeldet -- dann wird NUR der
 *    Koffer-Code gescannt, der Lehrer-Schritt entfaellt.
 *  · An der Wandstation haengt eine Lehrerliste; dort scannt man erst den
 *    eigenen Code und dann den Koffer.
 *  · Das blanke Kuerzel ("Ko") muss genauso funktionieren wie der gedruckte
 *    Code ("L-Ko") -- der Server schneidet das Praefix ohnehin ab.
 */
test.describe('Sprint 3: Scan-Station, zwei Wege', () => {
  test('Angemeldet: ein einziger Scan (nur der Koffer) bucht aus', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-scannen"]');

    // Voreinstellung ist "Ich selbst" mit dem eigenen Kuerzel
    await expect(page.getByTestId('station-quelle-selbst')).toContainText('Ko');
    await expect(page.getByTestId('station-mode')).toContainText('angemeldet');
    await expect(page.getByTestId('station-prompt')).toContainText('Koffer scannen');
    await expect(page.getByTestId('station-prompt')).not.toContainText('Lehrer-Code');

    // Nur der Koffer wird gescannt -- kein Lehrer-Code davor
    await page.fill('[data-testid="station-input"]', 'KOFFER-02');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-result')).toContainText('Ausgegeben');
    await expect(page.getByTestId('station-result')).toContainText('Koffer 2');
  });

  test('Wandstation: erst Lehrer-Code, dann Koffer', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-scannen"]');
    await page.click('[data-testid="station-quelle-wand"]');

    await expect(page.getByTestId('station-prompt')).toContainText('Lehrer-Code scannen');

    // Koffer ohne Lehrer-Code -> deutlicher Hinweis, keine Buchung
    await page.fill('[data-testid="station-input"]', 'KOFFER-03');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-result')).toContainText('Erst Lehrer-Code');

    await page.fill('[data-testid="station-input"]', 'L-Ko');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-prompt')).toContainText('Koffer scannen');
    await page.fill('[data-testid="station-input"]', 'KOFFER-03');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-result')).toContainText('Ausgegeben');
  });

  test('Das blanke Kürzel funktioniert wie der gedruckte Code', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-scannen"]');
    await page.click('[data-testid="station-quelle-wand"]');

    // "Ko" statt "L-Ko"
    await page.fill('[data-testid="station-input"]', 'Ko');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-mode')).toContainText('Demo-Admin');
    await expect(page.getByTestId('station-prompt')).toContainText('Koffer scannen');

    await page.fill('[data-testid="station-input"]', 'KOFFER-04');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-result')).toContainText('Ausgegeben');
  });

  test('Ein Koffer-Barcode wird nie als Kürzel missverstanden', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-scannen"]');
    // LAPTOP-01 beginnt mit "L" -- darf trotzdem nicht als Lehrer-Code gelten
    await page.fill('[data-testid="station-input"]', 'LAPTOP-01');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.getByTestId('station-result')).toContainText('Ausgegeben');
  });

  test('Ohne Kürzel im Profil bleibt nur die Wandstation — mit Hinweis', async ({ page }) => {
    // forceUser mit einem Kuerzel, das NICHT in der Demo-Lehrerliste steht:
    // das Profil traegt es zwar, die Station laeuft aber normal weiter.
    await page.goto('/index.html?forceMode=demo&forceUser=L2');
    await page.click('[data-testid="tab-scannen"]');
    await expect(page.getByTestId('station-quelle-selbst')).toContainText('L2');
    // Nicht-Admin: Hinweis auf die Serverregel erscheint im Wandstation-Modus
    await page.click('[data-testid="station-quelle-wand"]');
    await expect(page.getByTestId('station-view')).toContainText('nur dein eigenes Kürzel');
  });
});
