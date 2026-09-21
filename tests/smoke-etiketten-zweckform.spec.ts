import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (Sprint 3, 21.09.2026):
 * Die Koffer-Etiketten werden auf Avery Zweckform 3481 gedruckt --
 * 70 x 41 mm, 3 Spalten x 7 Zeilen, 21 Etiketten je A4-Bogen. Stimmt das
 * Raster nicht auf den Millimeter, ist ein ganzer Bogen Etiketten hin.
 * Geprueft wird deshalb die tatsaechliche Groesse der gerenderten Etiketten,
 * nicht nur, dass sie da sind. Der Supabase-Client ist gestubbt; die Namen
 * darin sind Platzhalter.
 */

async function seiteMitStubOeffnen(page: import('@playwright/test').Page) {
  await page.route('**/@supabase/supabase-js@2', (route) => route.abort());
  await page.addInitScript(() => {
    const koffer: Array<Record<string, unknown>> = [];
    for (let i = 1; i <= 12; i++) {
      koffer.push({
        id: i, barcode: 'KOFFER-' + String(i).padStart(2, '0'), bezeichnung: 'Farbe ' + i,
        typ: 'ipad_koffer', kapazitaet: 10, standort: i <= 6 ? 'LZ' : '1OG', aktiv: true, notiz: ''
      });
    }
    const kollegium = [{ id: 1, kuerzel: 'Ko', display_name: 'Testperson Eins', role: 'admin' }];
    const tabelle = (data: unknown) => {
      const o: Record<string, unknown> = {};
      o.select = () => o; o.eq = () => o; o.order = () => o;
      o.then = (fn: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(fn);
      return o;
    };
    (window as unknown as Record<string, unknown>).supabase = {
      createClient: () => ({
        auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 't' } } } }) },
        from: () => tabelle(koffer),
        rpc: () => Promise.resolve({ data: kollegium, error: null })
      })
    };
  });
  await page.goto('/etiketten.html');
  await page.waitForSelector('.zf-sheet .zf-label');
}

test.describe('S3: Etikettenbogen Zweckform 3481', () => {
  test('Etiketten sind exakt 70 x 41 mm und liegen ohne Abstand im Raster', async ({ page }) => {
    await seiteMitStubOeffnen(page);

    const bogen = page.locator('.zf-sheet').first();
    const bogenBox = await bogen.boundingBox();
    expect(bogenBox, 'Bogen muss gerendert sein').not.toBeNull();
    const pxProMm = bogenBox!.width / 210; // der Bogen ist auf 210 mm gesetzt

    const etiketten = bogen.locator('.zf-label');
    await expect(etiketten).toHaveCount(12);

    const erstes = await etiketten.nth(0).boundingBox();
    expect(erstes!.width / pxProMm).toBeCloseTo(70, 1);
    expect(erstes!.height / pxProMm).toBeCloseTo(41, 1);

    // drei Spalten: das vierte Etikett steht wieder ganz links, eine Zeile tiefer
    const viertes = await etiketten.nth(3).boundingBox();
    expect(viertes!.x).toBeCloseTo(erstes!.x, 0);
    expect((viertes!.y - erstes!.y) / pxProMm).toBeCloseTo(41, 1);

    // zweite Spalte beginnt exakt 70 mm weiter rechts -- kein Zwischenraum
    const zweites = await etiketten.nth(1).boundingBox();
    expect((zweites!.x - erstes!.x) / pxProMm).toBeCloseTo(70, 1);
  });

  test('Auf dem Etikett stehen Nummer, iPad-Bereich, Raum und beide Codes', async ({ page }) => {
    await seiteMitStubOeffnen(page);
    const erstes = page.locator('.zf-sheet .zf-label').first();
    await expect(erstes).toContainText('Koffer 1');
    await expect(erstes).toContainText('iPads 1–10');
    await expect(erstes).toContainText('Lehrerzimmer');
    await expect(erstes).toContainText('KOFFER-01');
    await expect(erstes.locator('svg')).toBeVisible();
    await expect(erstes.locator('.zf-qr canvas')).toHaveCount(1);

    const siebtes = page.locator('.zf-sheet .zf-label').nth(6);
    await expect(siebtes).toContainText('Koffer 7');
    await expect(siebtes).toContainText('Kartenraum');
  });

  test('Angebrochener Bogen: freigelassene Plätze bleiben leer und verschieben den Rest', async ({ page }) => {
    await seiteMitStubOeffnen(page);
    await page.fill('#freilassen', '3');
    await page.waitForTimeout(200);

    const etiketten = page.locator('.zf-sheet .zf-label');
    await expect(etiketten).toHaveCount(15); // 3 leer + 12 Koffer
    await expect(etiketten.nth(0)).toHaveClass(/leer/);
    await expect(etiketten.nth(2)).toHaveClass(/leer/);
    await expect(etiketten.nth(3)).toContainText('Koffer 1');
  });

  test('Mehr Koffer als ein Bogen fasst → zweiter Bogen', async ({ page }) => {
    await seiteMitStubOeffnen(page);
    await page.fill('#freilassen', '15'); // 15 leer + 12 Koffer = 27 > 21
    await page.waitForTimeout(200);
    await expect(page.locator('.zf-sheet')).toHaveCount(2);
    await expect(page.locator('.zf-sheet').first().locator('.zf-label')).toHaveCount(21);
  });

  test('Umschalten auf das freie Raster blendet den Bogen aus', async ({ page }) => {
    await seiteMitStubOeffnen(page);
    await expect(page.locator('.zf-sheet').first()).toBeVisible();
    await page.selectOption('#format', 'frei');
    await expect(page.locator('.zf-sheet').first()).toBeHidden();
    await expect(page.locator('#sec-koffer .grid .label').first()).toBeVisible();
    await page.selectOption('#format', 'zf3481');
    await expect(page.locator('.zf-sheet').first()).toBeVisible();
  });
});
