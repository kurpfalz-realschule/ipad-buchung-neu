import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (Sprint 3, 20.09.2026):
 * Zwei Korrekturen aus Norberts Rueckmeldung sollen nicht wieder
 * verlorengehen.
 *  1. "LZ" ist das LEHRERZIMMER (frueher stand dort "Lernzentrum"),
 *     "1OG" ist der KARTENRAUM. Der Datenbank-Schluessel bleibt 'LZ'/'1OG',
 *     weil pool_frei_pro_stunde exakt darauf filtert -- geprueft wird also
 *     ausdruecklich nur die Anzeige.
 *  2. Jeder iPad-Koffer traegt eine Nummer 1-12, und dahinter steht, welche
 *     iPads drin sind: Koffer 1 = iPads 1-10 ... Koffer 12 = 111-120.
 */
test.describe('Sprint 3: Standort-Klartext und Koffer-Nummern', () => {
  test('Bestand zeigt Koffer-Nummer, iPad-Bereich und den echten Raumnamen', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-bestand"]');

    const koffer01 = page.locator('[data-barcode="KOFFER-01"]');
    await expect(koffer01).toContainText('Koffer 1');
    await expect(koffer01).toContainText('iPads 1–10');
    await expect(koffer01).toContainText('Lehrerzimmer');
    await expect(koffer01).not.toContainText('Lernzentrum');

    const koffer07 = page.locator('[data-barcode="KOFFER-07"]');
    await expect(koffer07).toContainText('Koffer 7');
    await expect(koffer07).toContainText('iPads 61–70');
    await expect(koffer07).toContainText('Kartenraum');

    const koffer12 = page.locator('[data-barcode="KOFFER-12"]');
    await expect(koffer12).toContainText('Koffer 12');
    await expect(koffer12).toContainText('iPads 111–120');
  });

  test('Laptop-Koffer bekommen keine erfundene iPad-Nummer', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-bestand"]');
    const laptop = page.locator('[data-barcode="LAPTOP-01"]');
    // seit 23.09.2026: nur 2 Laptopwagen, beide im PC-Raum
    await expect(laptop).toContainText('PC-Raum');
    await expect(laptop).not.toContainText('iPads');
    await expect(laptop).toContainText('15 Geräte');
  });

  test('Standort-Auswahl beim Reservieren nennt die Räume im Klartext', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    const optionen = await page.locator('[data-testid="res-pool-standort"] option').allTextContents();
    expect(optionen.join(' | ')).toContain('Lehrerzimmer (LZ)');
    expect(optionen.join(' | ')).toContain('Kartenraum (1. OG)');
    expect(optionen.join(' | ')).not.toContain('Lernzentrum');
  });

  test('In keiner Ansicht steht noch "Lernzentrum"', async ({ page }) => {
    // Geprueft wird der SICHTBARE Text, nicht der Quelltext: in den
    // Code-Kommentaren steht das Wort absichtlich weiter ("LZ ist das
    // Lehrerzimmer, nicht das Lernzentrum") -- das soll es auch.
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    for (const tab of ['reservieren', 'scannen', 'bestand', 'auslastung']) {
      await page.click('[data-testid="tab-' + tab + '"]');
      const sichtbar = await page.locator('body').innerText();
      expect(sichtbar, 'Ansicht ' + tab).not.toMatch(/Lernzentrum/);
    }
  });
});
