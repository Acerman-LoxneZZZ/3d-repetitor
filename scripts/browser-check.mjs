/** Optional real-browser regression check. Start npm run dev -- --port 4188 first. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeModule = resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const modulePath = process.env.PLAYWRIGHT_MODULE || (existsSync(runtimeModule) ? pathToFileURL(runtimeModule).href : 'playwright');
const { chromium } = await import(modulePath);
const executablePath = process.env.CHROME_PATH || (existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const base = process.env.SITE_URL || 'http://127.0.0.1:4188';
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const output = resolve('docs/screenshots');
await mkdir(output, { recursive: true });
let checks = 0;
const results = [];
const check = (value, description) => { assert.ok(value, description);checks++; };
async function ready(page, url = base) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.classList.contains('app-ready'));
  await page.evaluate(() => document.fonts.ready);
}
const scrollMaterials = async page => {
  await page.locator('#materials').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(850);
};

try {
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }, { width: 1440, height: 1000 }, { width: 1920, height: 1080 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(() => sessionStorage.setItem('math-intro-seen', 'true'));
    const page = await context.newPage();page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await ready(page);await scrollMaterials(page);
    const layout = await page.evaluate(() => {
      const heading = document.querySelector('#materials-title').getBoundingClientRect();
      return {
        headingOffset: heading.x + heading.width / 2 - innerWidth / 2,
        width: document.documentElement.scrollWidth,
        rows: [...document.querySelectorAll('.material-row')].map(row => {
          const cards = [...row.querySelectorAll('a:not([hidden])')];
          const first = cards[0].getBoundingClientRect(), last = cards.at(-1).getBoundingClientRect();
          return { firstCenter: first.x + first.width / 2 - innerWidth / 2, groupCenter: (first.left + last.right) / 2 - innerWidth / 2, left: first.left, right: last.right };
        }),
      };
    });
    check(Math.abs(layout.headingOffset) < 1, `${viewport.width}: gallery heading centred`);
    check(layout.width <= viewport.width, `${viewport.width}: no page overflow`);
    if (viewport.width <= 1100) check(layout.rows.every(row => Math.abs(row.firstCenter) < 1), `${viewport.width}: first material centred in each carousel`);
    else check(layout.rows.every(row => Math.abs(row.groupCenter) <= 11 && row.left >= 0 && row.right <= viewport.width), `${viewport.width}: both rows centred and fully inside viewport`);
    for (const [filter, count] of [['geometry', 1], ['algebra', 5], ['all', 6]]) {
      await page.locator(`[data-material-filter-button="${filter}"]`).click();
      check(await page.locator('[data-material-category]:not([hidden])').count() === count, `${viewport.width}: ${filter} gives ${count} real links`);
      check(await page.locator(`[data-material-filter-button="${filter}"]`).getAttribute('aria-pressed') === 'true', `${viewport.width}: filter state accessible`);
    }
    await page.locator('[data-material-filter-button="all"]').focus();await page.keyboard.press('End');
    check(await page.locator('[data-material-filter-button="geometry"]').getAttribute('aria-pressed') === 'true', `${viewport.width}: End selects last filter`);
    await page.keyboard.press('Home');
    check(await page.locator('[data-material-filter-button="all"]').getAttribute('aria-pressed') === 'true', `${viewport.width}: Home restores all`);
    await page.evaluate(() => ['geometry','algebra','all'].forEach(value => document.querySelector(`[data-material-filter-button="${value}"]`).click()));
    await page.waitForTimeout(550);
    check(await page.locator('[data-material-category]:not([hidden])').count() === 6, `${viewport.width}: rapid filtering settles correctly`);
    if (viewport.width <= 1100) {
      await page.locator('[data-gallery-next]').click();await page.waitForTimeout(650);
      check(await page.locator('.material-row').first().evaluate(row => row.scrollLeft > 100), `${viewport.width}: carousel arrow advances materials`);
      await page.locator('[data-gallery-prev]').click();await page.waitForTimeout(650);
    }
    if ([390,1440].includes(viewport.width)) {
      await scrollMaterials(page);await page.mouse.move(0,0);
      await page.locator('#materials').screenshot({ path: resolve(output, `materials-${viewport.width}.png`) });
      await page.locator('[data-step="1"]').click();
      await page.locator('[data-lesson-expand]').click();await page.waitForTimeout(550);
      check(await page.locator('#lesson-focus').evaluate(dialog => dialog.open), `${viewport.width}: full lesson opens`);
      check(await page.locator('#lesson-focus [data-lesson]').getAttribute('data-current-step') === '1', `${viewport.width}: opening preserves selected step`);
      for (let index = 0; index < 9; index++) await page.keyboard.press('Tab');
      check(await page.evaluate(() => Boolean(document.activeElement.closest('#lesson-focus'))), `${viewport.width}: native focus trap`);
      await page.locator('#lesson-focus [data-lesson-next]').click();await page.waitForTimeout(700);
      await page.locator('#lesson-focus').evaluate(dialog => { dialog.scrollTop = 0; });
      await page.locator('#lesson-focus').screenshot({ path: resolve(output, `lesson-focus-${viewport.width}.png`) });
      await page.locator('#lesson-focus').evaluate(dialog => { dialog.scrollTop = dialog.scrollHeight; });
      const close = await page.locator('[data-focus-close]').boundingBox();
      check(close && close.y >= 0 && close.y + close.height <= viewport.height, `${viewport.width}: close stays visible while scrolling`);
      await page.keyboard.press('Escape');await page.waitForTimeout(350);
      check(await page.locator('#lesson [data-lesson]').getAttribute('data-current-step') === '2', `${viewport.width}: close restores same scene and latest step`);
      check(await page.evaluate(() => document.activeElement.matches('[data-lesson-expand]') && !document.body.classList.contains('lesson-is-open')), `${viewport.width}: focus and scrolling restored`);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-lesson-expand]').click();await page.keyboard.press('Escape');
      check(!(await page.locator('#lesson-focus').evaluate(dialog => dialog.open)), `${viewport.width}: reduced motion keeps open/close functional`);
      await page.locator('[data-theme-toggle]').click();
      check(await page.locator('html').getAttribute('data-theme') === 'red', `${viewport.width}: new controls coexist with red theme`);
      await scrollMaterials(page);
      if (viewport.width === 1440) await page.locator('#materials').screenshot({ path: resolve(output, 'materials-red-1440.png') });
    }
    check(errors.length === 0, `${viewport.width}: no JavaScript errors: ${errors.join(', ')}`);
    results.push({ viewport, layout, errors });
    await context.close();
  }

  const lesson = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];lesson.on('pageerror', error => errors.push(error.message));
  for (const [topic, next] of [['quadratic','linear'],['linear','geometry'],['geometry','quadratic']]) {
    await ready(lesson, `${base}/lesson.html?topic=${topic}`);
    check(await lesson.locator('[data-next-lesson]').getAttribute('href') === `/lesson.html?topic=${next}`, `${topic}: next case links to ${next}`);
    check((await lesson.locator('[data-next-title]').textContent()).length > 10, `${topic}: next case has real title`);
  }
  await lesson.locator('[data-next-lesson]').click();await lesson.waitForURL('**/lesson.html?topic=quadratic');
  check((await lesson.locator('h1').textContent()).includes('Два корня'), 'Next case performs a real page navigation');
  await lesson.locator('.lesson-next').screenshot({ path: resolve(output, 'next-lesson-1440.png') });
  check(errors.length === 0, 'Lesson navigation has no JavaScript errors');
  await lesson.close();

  const noJS = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await noJS.goto(base, { waitUntil: 'networkidle' });
  check(await noJS.locator('[data-material-category]').count() === 6, 'No-JS keeps all six real materials');
  check(!(await noJS.locator('[data-material-filters]').isVisible()), 'No-JS hides inactive filter controls');
  check(!(await noJS.locator('[data-lesson-expand]').isVisible()), 'No-JS hides inactive full-screen control');
  check(await noJS.locator('#materials-title').isVisible(), 'No-JS keeps centred heading');
  await noJS.close();
  await writeFile(resolve(output, 'browser-check.json'), JSON.stringify({ date: new Date().toISOString(), checks, results, tested: ['centering','filters','keyboard','carousel','focus dialog','reduced motion','red theme','next case','no-JS'] }, null, 2));
  console.log(`Browser checks passed: ${checks}. Chrome, 360/390/768/1024/1440/1920px, real DOM/layout/navigation, screenshots in docs/screenshots/.`);
} finally { await browser.close(); }
