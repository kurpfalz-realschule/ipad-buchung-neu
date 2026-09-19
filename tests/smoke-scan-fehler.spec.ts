import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (S2/S6, Akzeptanzkriterium):
 * "Alle Fehlerfaelle zeigen deutschen Klartext, keinen Rohfehler." Der
 * verbindliche Wortlaut steht in "sprint opus ipad-buchung.md", Abschnitt
 * "Vertraege fuer Sonnet" -- acht Codes insgesamt. Sechs davon lassen sich
 * im Demo-Modus tatsaechlich ueber die Scan-Station ausloesen (die anderen
 * beiden, not_authenticated/not_authorized, werden ausschliesslich
 * serverseitig erzwungen und sind im Demo-Mirror nicht nachstellbar --
 * das ist eine bewusste Grenze dieses Tests, siehe Uebergabe).
 * Erster Teil prueft die Zuordnungstabelle direkt (errMsg), zweiter Teil
 * einmal Ende-zu-Ende ueber die echte Scan-Station-UI, damit die
 * Verdrahtung (nicht nur die Funktion) belegt ist.
 */
test.describe('S2: Fehler-Klartexte', () => {
  test('errMsg() liefert fuer jeden Code den verbindlichen Wortlaut', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.errMsg);

    const erwartet: Record<string, string> = {
      koffer_not_found: 'Dieser Code geh\u00f6rt zu keinem Koffer.',
      koffer_inactive: 'Dieser Koffer ist stillgelegt.',
      already_checked_out: 'Der Koffer ist bereits ausgebucht \u2014 wurde er zur\u00fcckgegeben?',
      not_checked_out: 'Dieser Koffer ist gar nicht ausgebucht.',
      not_authenticated: 'Bitte neu anmelden.',
      lehrer_unbekannt: 'Dieses K\u00fcrzel ist im System nicht hinterlegt.',
      kapazitaet_belegt: 'Dieser Koffer ist in dieser Stunde schon vergeben.',
      not_authorized: 'Daf\u00fcr fehlt die Berechtigung.',
    };

    for (const [code, text] of Object.entries(erwartet)) {
      const rendered = await page.evaluate(({ code }) => {
        const hooks = (window as any).__KRS_TEST_HOOKS__;
        const err = hooks.makeErr(code, 'TEST');
        return hooks.errMsg(err);
      }, { code });
      expect(rendered, 'Klartext fuer ' + code).toBe(text);
    }
  });

  test('Ende-zu-Ende: unbekanntes Lehrer-Kuerzel zeigt den Klartext in der Station-UI', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-scannen"]');
    await page.fill('[data-testid="station-input"]', 'L-ZZ');
    await page.press('[data-testid="station-input"]', 'Enter');
    await page.fill('[data-testid="station-input"]', 'KOFFER-01');
    await page.press('[data-testid="station-input"]', 'Enter');

    await expect(page.locator('[data-testid="station-result"]')).toContainText('Dieses K\u00fcrzel ist im System nicht hinterlegt.');
    // kein Rohfehler (Stacktrace, "Error:", RPC-Code roh) im sichtbaren Text
    const resultText = await page.locator('[data-testid="station-result"]').innerText();
    expect(resultText).not.toMatch(/lehrer_unbekannt/);
    expect(resultText).not.toMatch(/Error:/);
  });

  test('Ende-zu-Ende: bereits ausgebuchter Koffer zeigt den Klartext', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.click('[data-testid="tab-scannen"]');
    await page.fill('[data-testid="station-input"]', 'L-Ko');
    await page.press('[data-testid="station-input"]', 'Enter');
    await page.fill('[data-testid="station-input"]', 'KOFFER-06');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.locator('[data-testid="station-result"]')).toContainText('Ausgegeben');

    await page.fill('[data-testid="station-input"]', 'L-Ko');
    await page.press('[data-testid="station-input"]', 'Enter');
    await page.fill('[data-testid="station-input"]', 'KOFFER-06');
    await page.press('[data-testid="station-input"]', 'Enter');
    await expect(page.locator('[data-testid="station-result"]')).toContainText('Der Koffer ist bereits ausgebucht');
  });
});
