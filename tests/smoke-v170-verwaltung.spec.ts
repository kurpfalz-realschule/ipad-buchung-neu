import { test, expect, Page } from '@playwright/test';

/**
 * Warum dieser Test existiert (v1.7.0, 23.09.2026, Norbert):
 *  - Auslastung und "wer leiht wie oft" sieht NUR Norbert (ipad_admins),
 *    nicht die anderen App-Admins und schon gar nicht das Kollegium.
 *  - Bekannte Koffer-Probleme stehen bei der Buchung, damit man weiss,
 *    dass z. B. ein iPad fehlt.
 *  - Meldungen sind in der Verwaltung gesammelt und administrierbar
 *    (erledigen mit Notiz, wieder oeffnen, Historie je Koffer).
 */
const NORBERT = '/index.html?forceMode=demo&forceUser=Ko';
function morgenISO() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function hooks(page: Page) { await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.ds); }

test.describe('v1.7.0: Verwaltung nur fuer Norbert, Hinweise bei Buchungen', () => {
  for (const kuerzel of ['Ca', 'Sch', 'L2']) {
    test(`${kuerzel} sieht keine Verwaltung, keine Auslastung, keine Admin-Knoepfe`, async ({ page }) => {
      await page.goto('/index.html?forceMode=demo&forceUser=' + kuerzel);
      await page.waitForSelector('[data-testid="tab-reservieren"]');
      await expect(page.locator('[data-testid="tab-verwaltung"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="tab-auslastung"]')).toHaveCount(0);
      await page.click('[data-testid="tab-bestand"]');
      await expect(page.locator('[data-testid="koffer-ausser-betrieb"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="koffer-historie"]')).toHaveCount(0);
      const r = await page.evaluate(() => (window as any).__KRS_TEST_HOOKS__.ds.getNutzung('2026-01-01', '2026-12-31').then(() => 'ok', (e: any) => e.code));
      expect(r).toBe('not_authorized');
    });
  }

  test('Hinweis bei der Reservierung und in "Meine Buchungen"', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=L2');
    await hooks(page);
    await page.evaluate(async (d) => {
      const ds = (window as any).__KRS_TEST_HOOKS__.ds;
      await ds.meldeKoffer({ koffer_id: 5, art: 'fehlt', anzahl: 2, geraete: '43, 47' });
      await ds.reservierePool({ pool_typ: 'ipad_koffer', pool_standort: 'LZ', datum: d, stunde_von: 3, stunde_bis: 4, anzahl: 1 });
    }, morgenISO());
    await page.click('[data-testid="tab-bestand"]'); await page.click('[data-testid="tab-reservieren"]');
    await expect(page.locator('[data-testid="res-hinweise"]')).toContainText('Koffer 5');
    await expect(page.locator('[data-testid="res-hinweise"]')).toContainText('2 Geräte fehlen');
    await expect(page.locator('[data-testid="buchung-hinweise"]')).toContainText('Nr. 43, 47');
    // Kartenraum hat keine Meldung -> kein Hinweis
    await page.selectOption('[data-testid="res-pool-standort"]', '1OG');
    await expect(page.locator('[data-testid="res-hinweise"]')).toHaveCount(0);
  });

  test('Station zeigt bekannte Probleme nach der Ausgabe', async ({ page }) => {
    await page.goto(NORBERT);
    await hooks(page);
    await page.evaluate(() => (window as any).__KRS_TEST_HOOKS__.ds.meldeKoffer({ koffer_id: 3, art: 'tastatur_defekt', anzahl: 1 }));
    await page.click('[data-testid="tab-scannen"]');
    await page.fill('[data-testid="station-input"]', 'KOFFER-03');
    await page.click('[data-testid="station-go"]');
    await expect(page.locator('[data-testid="station-hinweise"]')).toContainText('Tastatur kaputt');
  });

  test('Verwaltung: Meldung erledigen mit Notiz, wieder oeffnen, Historie', async ({ page }) => {
    page.on('dialog', async (d) => { await d.dismiss(); throw new Error('nativer Dialog'); });
    await page.goto(NORBERT);
    await hooks(page);
    await page.evaluate(() => (window as any).__KRS_TEST_HOOKS__.ds.meldeKoffer({ koffer_id: 8, art: 'geraet_defekt', anzahl: 1, geraete: '75', text: 'Display gesprungen' }));
    await page.click('[data-testid="tab-verwaltung"]');
    await expect(page.locator('[data-testid="verw-meldung"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="verw-meldung"]')).toContainText('Koffer 8');
    await expect(page.locator('[data-testid="verw-meldung"]')).toContainText('Display gesprungen');
    await page.click('[data-testid="verw-meldung-erledigt"]');
    await page.fill('[data-testid="dlg-input"]', 'zur Reparatur');
    await page.click('[data-testid="dlg-ok"]');
    await expect(page.locator('[data-testid="verw-meldung"]')).toHaveCount(0);
    await page.click('[data-testid="verw-filter-erledigt"]');
    await expect(page.locator('[data-testid="verw-meldung"]')).toContainText('zur Reparatur');
    await page.click('[data-testid="verw-meldung-wieder"]');
    await expect(page.locator('[data-testid="verw-meldung"]')).toHaveCount(0);
    await page.click('[data-testid="verw-filter-offen"]');
    await expect(page.locator('[data-testid="verw-meldung"]')).toHaveCount(1);
    // Historie im Bestand
    await page.click('[data-testid="tab-bestand"]');
    await page.click('[data-barcode="KOFFER-08"] [data-testid="koffer-historie"]');
    await expect(page.locator('[data-testid="historie-liste"]')).toContainText('Display gesprungen');
  });

  test('Verwaltung: Nutzung pro Person mit Datenschutz-Hinweis', async ({ page }) => {
    await page.goto(NORBERT);
    await hooks(page);
    await page.evaluate(async (d) => {
      const h = (window as any).__KRS_TEST_HOOKS__;
      await h.ds.reservierePool({ pool_typ: 'ipad_koffer', pool_standort: 'LZ', datum: d, stunde_von: 1, stunde_bis: 2, anzahl: 2 });
      await h.ds.reservierePool({ pool_typ: 'laptop_koffer', pool_standort: 'PCR', datum: d, stunde_von: 3, stunde_bis: 3, anzahl: 1 });
    }, morgenISO());
    await page.click('[data-testid="tab-verwaltung"]');
    await page.click('[data-testid="verw-nutzung"]');
    await expect(page.locator('[data-testid="verw-nutzung-view"]')).toContainText('Nur für dich sichtbar');
    await page.click('[data-testid="nutzung-4w"]');
    await page.click('[data-testid="nutzung-schuljahr"]');
    const zeile = page.locator('[data-testid="nutzung-zeile"]').first();
    await expect(zeile).toContainText('Ko');
    await expect(zeile).toContainText('5'); // 2x2 + 1x1 Koffer-Std.
    await expect(zeile).toContainText('1 / 1');
  });
});

test('Review-Fix: Ausser Betrieb warnt vor Ueberbuchung', async ({ page }) => {
  await page.goto(NORBERT);
  await hooks(page);
  await page.evaluate(async (d) => {
    const ds = (window as any).__KRS_TEST_HOOKS__.ds;
    await ds.reservierePool({ pool_typ: 'ipad_koffer', pool_standort: 'LZ', datum: d, stunde_von: 2, stunde_bis: 2, anzahl: 6 });
  }, morgenISO());
  await page.click('[data-testid="tab-bestand"]');
  await page.click('[data-barcode="KOFFER-01"] [data-testid="koffer-ausser-betrieb"]');
  await page.click('[data-testid="dlg-ok"]');
  await expect(page.locator('[data-testid="konflikt-liste"]')).toContainText('2. Std: 6 gebucht, 5 einsatzbereit');
});

test('Review-Fix: Verwaltungs-Tab zeigt Zahl offener Meldungen', async ({ page }) => {
  await page.goto(NORBERT);
  await hooks(page);
  await page.evaluate(() => (window as any).__KRS_TEST_HOOKS__.ds.meldeKoffer({ koffer_id: 4, art: 'ladekabel', anzahl: 1 }));
  await page.click('[data-testid="tab-bestand"]');
  await expect(page.locator('[data-testid="verw-badge"]')).toHaveText('1');
});
