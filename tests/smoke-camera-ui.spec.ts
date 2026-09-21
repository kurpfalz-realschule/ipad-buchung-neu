import { test, expect } from '@playwright/test';

/**
 * Regression fuer iPad/Safari: html5-qrcode darf erst starten, wenn sein
 * Zielbereich sichtbar und messbar ist. Der primaere „Scannen“-Button startet
 * bei leerem Eingabefeld die Kamera; mit Text verarbeitet er weiterhin den Code.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/html5-qrcode.min.js', async route => {
    await route.fulfill({
      contentType: 'application/javascript',
      body: `
        window.__cameraStarts = 0;
        window.__cameraStartVisible = false;
        window.Html5Qrcode = class {
          constructor(id) { this.id = id; }
          start() {
            const el = document.getElementById(this.id);
            window.__cameraStarts += 1;
            window.__cameraStartVisible = !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;
            if (el) {
              const video = document.createElement('video');
              video.setAttribute('data-testid', 'mock-camera-video');
              el.appendChild(video);
            }
            return Promise.resolve();
          }
          stop() { return Promise.resolve(); }
          clear() {
            const el = document.getElementById(this.id);
            if (el) el.replaceChildren();
          }
        };
      `,
    });
  });
});

test('„Scannen“ zeigt und startet die Kamera in einem messbaren Vorschaubereich', async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto('/index.html?forceMode=demo&forceUser=Ko');
  await page.click('[data-testid="tab-scannen"]');

  await expect(page.getByTestId('station-go')).toHaveText('📷 Scannen');
  await page.click('[data-testid="station-go"]');

  await expect(page.getByTestId('station-cam-region')).toBeVisible();
  await expect(page.getByTestId('mock-camera-video')).toBeVisible();
  await expect(page.getByTestId('station-go')).toHaveText('Kamera läuft …');
  const kamera = await page.evaluate(() => ({
    starts: (window as any).__cameraStarts,
    visibleBeimStart: (window as any).__cameraStartVisible,
  }));
  expect(kamera).toEqual({ starts: 1, visibleBeimStart: true });
});

test('„Scannen“ verarbeitet einen eingetippten Code statt die Kamera zu öffnen', async ({ page }) => {
  await page.goto('/index.html?forceMode=demo&forceUser=Ko');
  await page.click('[data-testid="tab-scannen"]');
  await page.fill('[data-testid="station-input"]', 'KOFFER-02');

  await expect(page.getByTestId('station-go')).toHaveText('↵ Code verwenden');
  await page.click('[data-testid="station-go"]');

  await expect(page.getByTestId('station-result')).toContainText('Ausgegeben');
  expect(await page.evaluate(() => (window as any).__cameraStarts)).toBe(0);
});
