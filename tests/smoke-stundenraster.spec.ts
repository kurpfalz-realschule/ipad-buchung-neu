import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (S4, Akzeptanzkriterium):
 * "Eine Aenderung in stundenraster wirkt nach Neuladen, ohne Deploy" und
 * "Nicht buchbare Stunden (buchbar = false) werden ausgegraut."
 *
 * EHRLICHE GRENZE dieses Tests: der eigentliche DB-Abruf
 * (DataService.getStundenraster) braucht eine echte, angemeldete
 * Supabase-Session -- die gibt es in diesem Testlauf nicht (Demo-Modus
 * liefert bewusst immer null, siehe Kontext). Getestet wird daher:
 * (1) der Rueckfall auf daten.js stuerzt die App nicht ab und liefert die
 * Stunden 1-8, und (2) die Ausgrau-Logik (istBuchbar) selbst ist korrekt,
 * indem ein echtes Raster-Array (wie es aus der DB kaeme) direkt gegen die
 * Funktion gepruedft wird. Der volle DB-Pfad muss beim Durchklick-Test
 * (S7, mit Norbert) gegen die echte App-URL live bestaetigt werden.
 */
test.describe('S4: Stundenraster', () => {
  test('Rueckfall auf daten.js: App laedt, Stunden 1-8 verfuegbar', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.waitForSelector('[data-testid="tab-reservieren"]');
    const optionen = await page.locator('[data-testid="res-von"] option').allTextContents();
    expect(optionen.some((t) => t.startsWith('1.'))).toBe(true);
    expect(optionen.some((t) => t.startsWith('8.'))).toBe(true);
    expect(pageErrors).toEqual([]);
  });

  test('istBuchbar(): Stunde 9 (buchbar=false) wird als nicht buchbar erkannt', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.waitForFunction(() => !!(window as any).__KRS_TEST_HOOKS__?.istBuchbar);

    const raster = [
      { stunde: 1, buchbar: true }, { stunde: 2, buchbar: true }, { stunde: 3, buchbar: true },
      { stunde: 4, buchbar: true }, { stunde: 5, buchbar: true }, { stunde: 6, buchbar: true },
      { stunde: 7, buchbar: true }, { stunde: 8, buchbar: true }, { stunde: 9, buchbar: false },
    ];
    const result = await page.evaluate((raster) => {
      const hooks = (window as any).__KRS_TEST_HOOKS__;
      return {
        liste: hooks.stundenListe(raster),
        stunde9: hooks.istBuchbar(raster, 9),
        stunde1: hooks.istBuchbar(raster, 1),
      };
    }, raster);

    expect(result.liste).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.stunde9, 'Stunde 9 darf nicht buchbar sein').toBe(false);
    expect(result.stunde1, 'Stunde 1 bleibt buchbar').toBe(true);
  });
});
