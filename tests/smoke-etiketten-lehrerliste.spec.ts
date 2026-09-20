import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (Sprint 3, 20.09.2026):
 * An der Wand sollen zwei Dinge haengen bzw. kleben --
 *  · am Koffer ein Etikett mit Nummer, iPad-Bereich und Raum im Klartext,
 *  · an der Wand eine Lehrerliste mit Barcode "L-<Kuerzel>".
 * Der echte Weg braucht eine Supabase-Session; hier wird der Client durch
 * einen Stub ersetzt, damit genau der DB-Renderpfad geprueft wird (der
 * Rueckfall ohne Session hat einen eigenen Test in
 * smoke-etiketten-druck.spec.ts). Die Namen im Stub sind Platzhalter --
 * in Tests stehen keine echten Kollegiumsdaten.
 */
test('S3: Koffer-Etiketten und Lehrerliste aus der Datenbank', async ({ page }) => {
  await page.route('**/@supabase/supabase-js@2', (route) => route.abort());
  await page.addInitScript(() => {
    const koffer = [
      { id: 30, barcode: 'KOFFER-01', bezeichnung: 'iPad lila/weiß', typ: 'ipad_koffer', kapazitaet: 10, standort: 'LZ', aktiv: true, notiz: '' },
      { id: 36, barcode: 'KOFFER-07', bezeichnung: 'iPad Silber', typ: 'ipad_koffer', kapazitaet: 10, standort: '1OG', aktiv: true, notiz: '' },
      { id: 42, barcode: 'LAPTOP-01', bezeichnung: 'Laptop-Koffer 1', typ: 'laptop_koffer', kapazitaet: 15, standort: 'LZ', aktiv: true, notiz: '15 PCs' }
    ];
    const kollegium = [
      { id: 1, kuerzel: 'Ko', display_name: 'Testperson Eins', role: 'admin', avatar_color: '#7c3aed' },
      { id: 2, kuerzel: 'Ab', display_name: 'Testperson Zwei', role: 'member', avatar_color: '#0ea5e9' },
      { id: 3, kuerzel: null, display_name: 'Ohne Kürzel', role: 'member', avatar_color: '#64748b' }
    ];
    const tabelle = (data: unknown) => {
      const o: Record<string, unknown> = {};
      o.select = () => o; o.eq = () => o; o.order = () => o;
      o.then = (fn: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(fn);
      return o;
    };
    (window as unknown as Record<string, unknown>).supabase = {
      createClient: () => ({
        auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'test' } } } }) },
        from: () => tabelle(koffer),
        rpc: () => Promise.resolve({ data: kollegium, error: null })
      })
    };
  });

  await page.goto('/etiketten.html');
  await page.waitForSelector('#sec-koffer .label');

  // Koffer-Etikett: Nummer, Farbe, iPad-Bereich, Raum im Klartext
  const erstes = page.locator('#sec-koffer .label').first();
  await expect(erstes).toContainText('Koffer 1');
  await expect(erstes).toContainText('iPads 1–10');
  await expect(erstes).toContainText('Lehrerzimmer');
  await expect(erstes).toContainText('KOFFER-01');

  const zweites = page.locator('#sec-koffer .label').nth(1);
  await expect(zweites).toContainText('Koffer 7');
  await expect(zweites).toContainText('iPads 61–70');
  await expect(zweites).toContainText('Kartenraum');

  // Laptop-Koffer bekommt keine iPad-Nummern untergeschoben
  const drittes = page.locator('#sec-koffer .label').nth(2);
  await expect(drittes).not.toContainText('iPads');
  await expect(drittes).toContainText('15 Geräte');

  // Lehrerliste: nur Personen mit Kuerzel, Barcode traegt "L-<Kuerzel>"
  await expect(page.locator('#sec-lehrer .label')).toHaveCount(2);
  const lehrerTexte = await page.locator('#sec-lehrer .label').allTextContents();
  expect(lehrerTexte.join(' | ')).toContain('Testperson Eins');
  expect(lehrerTexte.join(' | ')).toContain('L-Ko');
  expect(lehrerTexte.join(' | ')).not.toContain('Ohne Kürzel');
  // alphabetisch nach Anzeigenamen
  expect(lehrerTexte[0]).toContain('Testperson Eins');

  // Jedes Lehrer-Etikett traegt CODE128 und QR
  await expect(page.locator('#sec-lehrer .label').first().locator('svg')).toBeVisible();
  await expect(page.locator('#sec-lehrer .label').first().locator('.qr-box canvas')).toHaveCount(1);

  // Druckauswahl blendet die jeweils andere Sektion aus
  await page.check('input[name="was"][value="lehrer"]');
  await expect(page.locator('#sec-koffer')).toBeHidden();
  await expect(page.locator('#sec-lehrer')).toBeVisible();
  await page.check('input[name="was"][value="koffer"]');
  await expect(page.locator('#sec-lehrer')).toBeHidden();
  await expect(page.locator('#sec-koffer')).toBeVisible();

  // Druckansicht blendet die Bedienelemente aus
  await page.check('input[name="was"][value="alles"]');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toolbar')).toBeHidden();
});
