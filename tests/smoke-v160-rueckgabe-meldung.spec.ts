import { test, expect, Page } from '@playwright/test';

/**
 * Warum dieser Test existiert (v1.6.0, 23.09.2026, Norberts iPhone-Rueckmeldung):
 *  - "Stornieren" tat im Hub der iOS-App nichts: window.confirm erschien nicht
 *    (Supabase-Log: kein einziger Schreibaufruf). Jetzt In-App-Dialog.
 *  - Ausgegebene Koffer liessen sich nicht zurueckgeben -> "Zurueckgeben"-Knopf.
 *  - Rueckmeldung zu Koffern (fehlende iPads, kaputte Tastaturen …).
 *  - Bestand nach Standort; Laptops = 2 Wagen im PC-Raum; archivierte Koffer
 *    erscheinen nicht mehr als "Ausser Betrieb".
 *  - Keine Buchung in der Vergangenheit.
 */
const ADMIN = '/index.html?forceMode=demo&forceUser=Ko';
const MEMBER = '/index.html?forceMode=demo&forceUser=L2';

function morgenISO() {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function keinNativerDialog(page: Page) {
  page.on('dialog', async (d) => { await d.dismiss(); throw new Error('nativer Dialog: ' + d.message()); });
}
async function hooks(page: Page) {
  await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.ds);
}

test.describe('v1.6.0: Rueckgabe, Storno, Meldungen, Standorte', () => {
  test('Bestand: nach Standort gruppiert, Laptops nur im PC-Raum', async ({ page }) => {
    await page.goto(ADMIN);
    await page.click('[data-testid="tab-bestand"]');
    const gruppen = page.locator('[data-testid="standort-gruppe"]');
    await expect(gruppen).toHaveCount(3);
    expect(await gruppen.evaluateAll((els) => els.map((e) => e.getAttribute('data-standort')))).toEqual(['LZ', '1OG', 'PCR']);
    await expect(page.locator('[data-standort="PCR"] [data-testid="koffer-item"]')).toHaveCount(2);
    await expect(page.locator('[data-standort="LZ"] .standort-head')).toContainText('6 von 6 einsatzbereit');
    const nummern = await page.locator('[data-standort="1OG"] [data-testid="koffer-item"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-barcode')));
    expect(nummern).toEqual(['KOFFER-07', 'KOFFER-08', 'KOFFER-09', 'KOFFER-10', 'KOFFER-11', 'KOFFER-12']);
  });

  test('Reservieren: Laptop -> Standort nur PC-Raum', async ({ page }) => {
    await page.goto(ADMIN);
    await page.selectOption('[data-testid="res-pool-typ"]', 'laptop_koffer');
    await expect(page.locator('[data-testid="res-pool-standort"] option')).toHaveText(['PC-Raum']);
    await page.selectOption('[data-testid="res-pool-typ"]', 'ipad_koffer');
    await expect(page.locator('[data-testid="res-pool-standort"] option')).toHaveText(['Lehrerzimmer (LZ)', 'Kartenraum (1. OG)']);
  });

  test('Stornieren ueber In-App-Dialog (kein window.confirm)', async ({ page }) => {
    await keinNativerDialog(page);
    await page.goto(ADMIN);
    await hooks(page);
    await page.evaluate((d) => (window as any).__KRS_TEST_HOOKS__.ds.reservierePool({ pool_typ: 'ipad_koffer', pool_standort: 'LZ', datum: d, stunde_von: 3, stunde_bis: 4, anzahl: 2, zweck: '7b' }), morgenISO());
    await page.click('[data-testid="tab-bestand"]'); await page.click('[data-testid="tab-reservieren"]');
    await expect(page.locator('[data-testid="buchung-item"]')).toHaveCount(1);
    await page.click('[data-testid="buchung-storno"]');
    await expect(page.locator('[data-testid="dialog"]')).toBeVisible();
    await page.click('[data-testid="dlg-cancel"]');
    await expect(page.locator('[data-testid="buchung-item"]')).toHaveCount(1);
    await page.click('[data-testid="buchung-storno"]');
    await page.click('[data-testid="dlg-ok"]');
    await expect(page.locator('[data-testid="buchung-item"]')).toHaveCount(0);
  });

  test('Zurueckgeben mit Problem-Meldung -> Koffer frei + Meldung im Bestand', async ({ page }) => {
    await keinNativerDialog(page);
    // Nach Stundenende: der Koffer muss trotzdem "Ausgegeben" bleiben (wie am 22.09. live)
    await page.clock.setFixedTime(new Date('2026-09-23T15:30:00'));
    await page.goto(ADMIN);
    await hooks(page);
    await page.evaluate(() => { const h = (window as any).__KRS_TEST_HOOKS__; return h.ds.stationCheckout('L-Ko', 'KOFFER-02', { von: 8, bis: 8, label: '8. Stunde' }, h.uuid()); });
    await page.click('[data-testid="tab-bestand"]');
    await expect(page.locator('[data-barcode="KOFFER-02"] [data-testid="koffer-status"]')).toHaveText('Ausgegeben');
    // Admin sieht die offene Buchung auch in der Admin-Liste
    await page.click('[data-testid="tab-verwaltung"]');
    await page.click('[data-testid="verw-buchungen"]');
    await expect(page.locator('[data-testid="admin-buchung-item"]')).toHaveCount(1);
    await page.click('[data-testid="tab-reservieren"]');
    await page.click('[data-testid="buchung-rueckgabe"]');
    await page.click('[data-testid="rueckgabe-problem"]');
    await expect(page.locator('[data-testid="meldung-form"]')).toBeVisible();
    await page.click('[data-testid="meldung-art-tastatur_defekt"]');
    await page.fill('[data-testid="meldung-geraete"]', '14');
    await page.click('[data-testid="meldung-senden"]');
    await expect(page.locator('[data-testid="buchung-rueckgabe"]')).toHaveCount(0);
    await page.click('[data-testid="tab-bestand"]');
    await expect(page.locator('[data-barcode="KOFFER-02"] [data-testid="koffer-status"]')).toHaveText('Frei');
    await expect(page.locator('[data-barcode="KOFFER-02"] [data-testid="meldung-chip"]')).toContainText('Tastatur kaputt');
    await expect(page.locator('[data-barcode="KOFFER-02"] [data-testid="meldung-chip"]')).toContainText('Nr. 14');
    await page.click('[data-barcode="KOFFER-02"] [data-testid="meldung-erledigt"]');
    await page.click('[data-testid="dlg-ok"]'); // v1.7.0: Notiz-Dialog (leer lassen)
    await expect(page.locator('[data-barcode="KOFFER-02"] [data-testid="meldung-chip"]')).toHaveCount(0);
  });

  test('Admin: Koffer ausser Betrieb -> Pool zaehlt einen weniger', async ({ page }) => {
    await keinNativerDialog(page);
    await page.goto(ADMIN);
    await page.click('[data-testid="tab-bestand"]');
    await page.click('[data-barcode="KOFFER-03"] [data-testid="koffer-ausser-betrieb"]');
    await page.fill('[data-testid="dlg-input"]', '3 Akkus defekt');
    await page.click('[data-testid="dlg-ok"]');
    await expect(page.locator('[data-barcode="KOFFER-03"] [data-testid="koffer-status"]')).toHaveText('Außer Betrieb');
    await expect(page.locator('[data-barcode="KOFFER-03"]')).toContainText('3 Akkus defekt');
    await expect(page.locator('[data-standort="LZ"] .standort-head')).toContainText('5 von 6 einsatzbereit');
    await page.click('[data-testid="tab-reservieren"]');
    await page.fill('[data-testid="res-datum"]', morgenISO());
    await expect(page.locator('[data-testid="res-kapa-info"]')).toHaveText('noch 5 frei');
    await page.selectOption('[data-testid="res-pool-standort"]', '1OG');
    await expect(page.locator('[data-testid="res-kapa-info"]')).toHaveText('noch 6 frei');
  });

  test('Mitglied: keine Admin-Knoepfe, keine Auslastung, darf aber melden', async ({ page }) => {
    await page.goto(MEMBER);
    await expect(page.locator('[data-testid="tab-verwaltung"]')).toHaveCount(0);
    await page.click('[data-testid="tab-bestand"]');
    await expect(page.locator('[data-testid="koffer-ausser-betrieb"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="admin-buchung-item"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="koffer-melden"]').first()).toBeVisible();
  });

  test('Keine Buchung in der Vergangenheit', async ({ page }) => {
    // Mittwoch 10:00 -> Stunden 1 und 2 sind vorbei
    await page.clock.setFixedTime(new Date('2026-09-23T10:00:00'));
    await page.goto(ADMIN);
    await hooks(page);
    await expect(page.locator('[data-testid="res-datum"]')).toHaveValue('2026-09-23');
    await expect(page.locator('[data-testid="res-von"] option[value="1"]')).toBeDisabled();
    await expect(page.locator('[data-testid="res-von"] option[value="1"]')).toContainText('vorbei');
    await expect(page.locator('[data-testid="res-von"]')).toHaveValue('3');
    const fehler = await page.evaluate(() => (window as any).__KRS_TEST_HOOKS__.ds
      .reservierePool({ pool_typ: 'ipad_koffer', pool_standort: 'LZ', datum: '2026-09-23', stunde_von: 1, stunde_bis: 2, anzahl: 1 })
      .then(() => 'kein Fehler', (e: any) => e.code));
    expect(fehler).toBe('zeit_vorbei');
  });

  test('Nach Schulschluss springt das Datum auf den naechsten Schultag', async ({ page }) => {
    // Freitag 16:00 -> Montag
    await page.clock.setFixedTime(new Date('2026-09-25T16:00:00'));
    await page.goto(ADMIN);
    await expect(page.locator('[data-testid="res-datum"]')).toHaveValue('2026-09-28');
  });

  test('Im Hub eingebettet: kein doppelter Kopf, Tabs sichtbar', async ({ page }) => {
    await page.goto('/tests/fixtures/embed.html');
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('[data-testid="tab-reservieren"]')).toBeVisible();
    await expect(frame.locator('.header')).toBeHidden();
  });
});
