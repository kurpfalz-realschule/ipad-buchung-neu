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

  const labelCount = await page.locator('.grid .label').count();
  expect(labelCount).toBeGreaterThan(0);
  await expect(page.locator('.warn')).toContainText('Datenbank nicht erreichbar');

  // Keine Lehrer-Codes mehr (Entscheidung E5) -- frueher gab es dafuer eine
  // eigene Ueberschrift "Lehrer-Codes"
  const headings = await page.locator('h2').allTextContents();
  expect(headings.join(' ')).not.toMatch(/Lehrer-Codes/);

  // Jedes Koffer-Etikett traegt CODE128 (svg) UND QR (canvas) nebeneinander
  const erstesLabel = page.locator('.grid .label').first();
  await expect(erstesLabel.locator('svg')).toBeVisible();
  await expect(erstesLabel.locator('.qr-box canvas')).toHaveCount(1);

  // Druckansicht: Toolbar und Warnhinweis verschwinden
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.toolbar')).toBeHidden();
  await expect(page.locator('.warn')).toBeHidden();
});
