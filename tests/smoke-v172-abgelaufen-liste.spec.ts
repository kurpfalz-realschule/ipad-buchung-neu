import { test, expect, Page } from '@playwright/test';

/**
 * Feedback Franziska Mersi (30.09.2026):
 * Eine iPad-Reservierung von letzter Woche stand noch als
 * „Abgelaufen — nicht abgeholt" in „Meine Buchungen", obwohl der Koffer
 * geholt wurde. Abholung ohne Scan ist der Normalfall. Sobald das Datum
 * vorbei ist, soll die Zeile verschwinden. Offene Buchungen und eine
 * kurze Rueckgabe-Historie bleiben.
 */
function isoShift(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function hooks(page: Page) {
  await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.ds);
}

test('vergangene nicht-abgeholt-Zeile verschwindet, offene Buchungen bleiben', async ({ page }) => {
  await page.goto('/index.html?forceMode=demo&forceUser=L2');
  await hooks(page);
  await page.evaluate(({ gestern, vor3, vor10, heute, morgen }) => {
    const ds = (window as any).__KRS_TEST_HOOKS__.ds;
    const row = (id: number, status: string, datum: string, zweck: string) => ({
      id, user_id: ds.user.id, status, datum, stunde_von: 1, stunde_bis: 2,
      anzahl: 1, pool_typ: 'ipad_koffer', pool_standort: 'LZ', zweck, koffer_id: null,
    });
    ds._buchungen.push(
      row(9101, 'abgelaufen', gestern, 'MARKER-GESTERN-ABGELAUFEN'),
      row(9102, 'abgelaufen', vor3, 'MARKER-VOR3-ABGELAUFEN'),
      row(9103, 'abgelaufen', heute, 'MARKER-HEUTE-ABGELAUFEN'),
      row(9104, 'reserviert', morgen, 'MARKER-MORGEN-RESERVIERT'),
      row(9105, 'ausgegeben', gestern, 'MARKER-GESTERN-AUSGEGEBEN'),
      row(9106, 'zurueck', vor3, 'MARKER-VOR3-ZURUECK'),
      row(9107, 'zurueck', vor10, 'MARKER-VOR10-ZURUECK'),
    );
  }, {
    gestern: isoShift(-1),
    vor3: isoShift(-3),
    vor10: isoShift(-10),
    heute: isoShift(0),
    morgen: isoShift(1),
  });
  await page.click('[data-testid="tab-bestand"]');
  await page.click('[data-testid="tab-reservieren"]');

  const liste = page.locator('[data-testid="reservieren-view"]');
  await expect(liste).not.toContainText('MARKER-GESTERN-ABGELAUFEN');
  await expect(liste).not.toContainText('MARKER-VOR3-ABGELAUFEN');
  await expect(liste).not.toContainText('nicht abgeholt');
  const heute = page.locator('[data-testid="buchung-item"]', { hasText: 'MARKER-HEUTE-ABGELAUFEN' });
  await expect(heute).toHaveCount(1);
  await expect(heute.locator('.status-pill')).toHaveText('Vorbei');
  await expect(liste).toContainText('MARKER-MORGEN-RESERVIERT');
  await expect(liste).toContainText('MARKER-GESTERN-AUSGEGEBEN');
  await expect(liste).toContainText('MARKER-VOR3-ZURUECK');
  await expect(liste).not.toContainText('MARKER-VOR10-ZURUECK');
});
