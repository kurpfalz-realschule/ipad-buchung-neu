import { test, expect } from '@playwright/test';

/**
 * Warum dieser Test existiert (S1, Akzeptanzkriterium):
 * Die Auslastungsstatistik zeigt Aggregate ueber Buchungen -- das ist
 * potenziell eine Verhaltens-/Leistungsauswertung von Lehrkraeften
 * (IPAD-BUCHUNG-KONTEXT.md, Abschnitt 9). Deshalb MUSS der Tab fuer
 * Nicht-Admins unsichtbar sein, und ein Admin muss ihn sehen und die
 * Ansicht muss fehlerfrei rendern. rpc_auslastung selbst prueft
 * is_app_admin() serverseitig -- die UI-Sichtbarkeit ist nur Bequemlichkeit,
 * aber ein Leck hier waere trotzdem ein Datenschutzproblem in der Praxis.
 *
 * 'Ko' ist in der admin_whitelist (CLAUDE.md), 'L2' nicht -- siehe die
 * Demo-Rollenzuordnung in index.html (ADMIN_KUERZEL).
 */
test.describe('S1: Auslastungs-Ansicht -- Admin-Sichtbarkeit', () => {
  test('Nicht-Admin sieht den Auslastungs-Tab nicht', async ({ page }) => {
    await page.goto('/index.html?forceMode=demo&forceUser=L2');
    await page.waitForSelector('[data-testid="tab-reservieren"]');
    await expect(page.locator('[data-testid="tab-auslastung"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="tab-verwaltung"]')).toHaveCount(0);
  });

  test('Admin sieht den Tab und die Ansicht rendert ohne Fehler', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto('/index.html?forceMode=demo&forceUser=Ko');
    await page.waitForSelector('[data-testid="tab-verwaltung"]');
    await page.click('[data-testid="tab-verwaltung"]');
    await page.click('[data-testid="verw-auslastung"]');
    await expect(page.locator('[data-testid="auslastung-view"]')).toBeVisible();

    // Zeitraum-Presets vorhanden und wechselbar
    await page.click('[data-testid="ausl-preset-hj"]');
    await page.click('[data-testid="ausl-preset-frei"]');
    await expect(page.locator('[data-testid="ausl-von"]')).toBeVisible();
    await page.click('[data-testid="ausl-preset-4w"]');

    await page.waitForTimeout(300);
    expect(pageErrors, 'Keine JS-Fehler beim Rendern der Ansicht').toEqual([]);

    // Keine Rohdaten (user_id/zweck) im DOM -- die Ansicht liest nur ueber
    // getAuslastung()/rpc_auslastung, nie direkt aus buchungen (Kontext 9.3)
    const bodyText = await page.locator('[data-testid="auslastung-view"]').innerText();
    expect(bodyText).not.toMatch(/user_id/i);
  });
});
