import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

// Run against the production bundle, not Vite's development runtime.
const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  browser = await chromium.launch(
    process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : { channel: 'chrome' },
  );
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0]);
  const toggle = page.getByRole('button', { name: 'Toggle dark theme' });
  const compact = page.getByRole('button', { name: 'Compact outline' });
  const save = page.getByRole('button', { name: 'Save changes' });
  const disabled = page.getByRole('button', { name: 'Unavailable' });
  const css = (locator, property) => locator.evaluate((element, name) => getComputedStyle(element)[name], property);
  assert.equal(await css(toggle, 'backgroundColor'), 'rgb(15, 118, 110)');
  assert.equal(await css(compact, 'paddingTop'), '6px');
  assert.equal(await css(compact, 'backgroundColor'), 'rgba(0, 0, 0, 0)');
  assert.equal(await css(compact.locator('span').last(), 'fontSize'), '14px');
  assert.equal(await css(save, 'borderRadius'), '999px');
  assert.equal(await css(save.locator('[aria-hidden]'), 'fontSize'), '22px');
  assert.equal(await disabled.isDisabled(), true);
  await disabled.hover();
  assert.equal(await css(disabled, 'opacity'), '0.45');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await css(toggle, 'backgroundColor'), 'rgb(94, 234, 212)');
  assert.equal(await css(compact, 'color'), 'rgb(238, 248, 244)');
  assert.equal(await css(page.locator('main'), 'backgroundColor'), 'rgb(16, 21, 20)');
  await save.click();
  assert.equal(await page.getByRole('status').textContent(), 'Saved 1 times');
  await toggle.hover();
  assert.equal(await css(toggle, 'opacity'), '0.88');
  await page.mouse.move(0, 0);
  await toggle.focus();
  await page.keyboard.press('Tab');
  assert.equal(await css(compact, 'outlineStyle'), 'solid');
  assert.equal(await css(compact, 'outlineWidth'), '2px');
  await page.setViewportSize({ width: 390, height: 800 });
  assert.equal(await css(page.locator('main'), 'paddingLeft'), '16px');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log(
    'LLM example: production themes, variants, slot/root overrides, states, events and responsive layout passed.',
  );
} finally {
  await browser?.close();
  await promisify(server.httpServer.close.bind(server.httpServer))();
}
