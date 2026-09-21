import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (S3, Akzeptanzkriterium):
 * "Druckvorschau zeigt Koffer-Etiketten, keine stillgelegten Dubletten"
 * und "Beim Drucken erscheinen keine Bedienelemente (@media print greift)."
 * Der DB-Pfad (koffer_physisch WHERE aktiv) braucht eine echte
 * Supabase-Session und ist hier nicht ohne Testzugang pruefbar -- siehe
 * Uebergabe. Dieser Test blockiert daher bewusst den Supabase-Import und
 * prueft den dokumentierten Rueckfall auf daten.js: er zeigt ALLE Koffer
 * aus daten.js (16, nicht nur die 12 iPad-Koffer -- Entscheidung siehe
 * Uebergabe) mit sichtbarem Warnhinweis, und die Druckansicht blendet die
 * Bedienelemente aus.
 */
test('S3: Etiketten-Rueckfall (kein Supabase erreichbar) + Druck-CSS', async ({ page }) => {
  await page.route('**/@supabase/supabase-js@2', (route) => route.abort());
  await page.goto('/etiketten.html');
  await page.waitForSelector('.warn');

  // Voreinstellung ist der Etikettenbogen; fuer die Rueckfall-Pruefung des
  // freien Rasters wird bewusst umgeschaltet.
  await page.selectOption('#format', 'frei');
  const labelCount = await page.locator('.grid .label').count();
  expect(labelCount).toBeGreaterThan(0);
  await expect(page.getByTestId('warn-db')).toContainText('Datenbank nicht erreichbar');

  // Ohne Session liefert get_kollegium_public() nichts -- dann darf KEINE
  // Lehrerliste gedruckt werden, sondern es muss ein Hinweis stehen
  // (20.09.2026: Platzhalternamen auf einer Wandliste waeren schlimmer als
  // gar keine Liste).
  await expect(page.getByTestId('warn-lehrer')).toContainText('Keine Lehrerliste geladen');
  expect(await page.locator('#sec-lehrer').count()).toBe(0);

  // Jedes Koffer-Etikett traegt CODE128 (svg) UND QR (canvas) nebeneinander
  const erstesLabel = page.locator('.grid .label').first();
  await expect(erstesLabel.locator('svg')).toBeVisible();
  await expect(erstesLabel.locator('.qr-box canvas')).toHaveCount(1);

  // Druckansicht: Toolbar und Warnhinweis verschwinden
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toolbar')).toBeHidden();
  await expect(page.getByTestId('warn-db')).toBeHidden();
  await expect(page.getByTestId('warn-lehrer')).toBeHidden();
});
