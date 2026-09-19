import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (S2, Akzeptanzkriterium + Kontext 4/10):
 * Der Client erzeugt den idempotency_key EINMAL je Scan-Vorgang und sendet
 * bei einem Wiederholungsversuch nach Netzfehler denselben Schluessel --
 * sonst legt ein Retry eine zweite Ausgabe an (ein Koffer waere dann
 * "doppelt ausgegeben"). Dieser Test prueft direkt gegen den DataService
 * (ueber window.__KRS_TEST_HOOKS__), weil ein echter Netzfehler im
 * Demo-Modus nicht provozierbar ist -- die Idempotenz-Garantie selbst ist
 * aber unabhaengig vom Transportweg und so zuverlaessig pruefbar.
 * Beim Bau dieses Tests wurde dabei ein echter Bug im Demo-Mirror
 * gefunden und behoben: stationCheckout/stationReturn pruefte den Key
 * ueberhaupt nicht (anders als checkout()/returnKoffer()).
 */
test('S2: zweimal derselbe idempotency_key legt nur EINE ausgaben-Zeile an', async ({ page }) => {
  await page.goto('/index.html?forceMode=demo&forceUser=Ko');
  await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.ds);

  const result = await page.evaluate(async () => {
    const hooks = (window as any).__KRS_TEST_HOOKS__;
    const ds = hooks.ds;
    const key = hooks.uuid();
    const vorher = ds._ausgaben.length;
    const r1 = await ds.stationCheckout('L-Ko', 'KOFFER-01', { von: 1, bis: 1, label: '1. Stunde' }, key);
    const nachEins = ds._ausgaben.length;
    const r2 = await ds.stationCheckout('L-Ko', 'KOFFER-01', { von: 1, bis: 1, label: '1. Stunde' }, key);
    const nachZwei = ds._ausgaben.length;
    return { vorher, nachEins, nachZwei, r2_idempotent: r2.idempotent === true, r1_buchung: r1.buchung_id, r2_buchung: r2.buchung_id };
  });

  expect(result.vorher).toBe(0);
  expect(result.nachEins).toBe(1);
  expect(result.nachZwei, 'Zweiter Aufruf mit gleichem Key darf KEINE neue Zeile anlegen').toBe(1);
  expect(result.r2_idempotent).toBe(true);
  expect(result.r2_buchung).toBe(result.r1_buchung);
});

test('S2: Rueckgabe ist ebenso idempotent ueber denselben Key', async ({ page }) => {
  await page.goto('/index.html?forceMode=demo&forceUser=Ko');
  await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.ds);

  const result = await page.evaluate(async () => {
    const hooks = (window as any).__KRS_TEST_HOOKS__;
    const ds = hooks.ds;
    await ds.stationCheckout('L-Ko', 'KOFFER-02', { von: 1, bis: 1, label: '1. Stunde' }, hooks.uuid());
    const key = hooks.uuid();
    const vorher = ds._ausgaben.length;
    await ds.stationReturn('KOFFER-02', key);
    const nachEins = ds._ausgaben.length;
    await ds.stationReturn('KOFFER-02', key);
    const nachZwei = ds._ausgaben.length;
    return { vorher, nachEins, nachZwei };
  });

  expect(result.nachEins).toBe(result.vorher + 1);
  expect(result.nachZwei, 'Zweite Rueckgabe mit gleichem Key darf KEINE neue Zeile anlegen').toBe(result.nachEins);
});
