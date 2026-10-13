const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.BASE_URL || 'http://127.0.0.1:8766/';
let browser;
before(async () => {
  browser = await chromium.launch(process.env.CHROME_EXECUTABLE ? { executablePath: process.env.CHROME_EXECUTABLE } : {});
});
after(async () => { await browser?.close(); });
async function visit(path = '', options = {}) {
  const context = await browser.newContext({ locale: 'ko-KR', viewport: { width: 390, height: 844 }, ...options });
  const page = await context.newPage();
  await page.goto(new URL(path, base).href);
  await page.waitForFunction(() => !document.documentElement.classList.contains('fonts-loading'));
  return { context, page };
}

test('home defers hidden writing thumbnails and renders all posts on first tab click', async () => {
  const { context, page } = await visit();
  assert.equal(await page.locator('.post-list > .post-row').count(), 0);
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(r => r.name.includes('giscus.app') || r.name.includes('PretendardVariable'))), false);
  await page.locator('nav [data-tab-link="writing"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.post-list > .post-row').length === 8);
  assert.equal(await page.locator('nav [aria-current="page"]').textContent(), '글');
  await page.locator('nav [data-tab-link="writing"]').press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.about-panel').classList.contains('is-active'));
  await context.close();
});

test('all articles work at mobile/desktop widths and legacy links reach static pages', async () => {
  const { context, page } = await visit();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const posts = await (await context.request.get(new URL('data/posts.json', base).href)).json();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const post of posts) {
      await page.goto(new URL(`post.html?id=${post.id}`, base).href);
      await page.waitForURL(`**/writing/${post.id}/`);
      assert((await page.locator('#post-body').textContent()).length > 100, post.id);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, post.id);
    }
  }
  assert.deepEqual(errors, []);
  await context.close();
});

test('static content is readable with JavaScript disabled', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(new URL('writing/what-is-kafka/', base).href);
  assert((await page.locator('#post-body').textContent()).length > 100);
  assert(await page.locator('#post-title').isVisible());
  await page.goto(base);
  assert.equal(await page.locator('.post-row').count(), 8);
  await context.close();
});

test('font readiness gates reveal and a failed font request cannot strand the page', async () => {
  for (const fail of [false, true]) {
    const context = await browser.newContext({ locale: 'ko-KR' });
    const page = await context.newPage();
    await page.route('**/*.woff2*', async route => {
      if (fail) return route.abort();
      await new Promise(resolve => setTimeout(resolve, 1200));
      return route.continue();
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    if (!fail) assert.equal(await page.locator('body').evaluate(e => getComputedStyle(e).visibility), 'hidden');
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible');
    if (!fail) assert(await page.evaluate(() => document.fonts.check('700 16px Pretendard', 'TaeeunKil홈글소개')));
    await context.close();
  }
});

test('static article has no body-insertion shift and does not download the full font', async () => {
  const context = await browser.newContext({ locale: 'ko-KR', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const urls = []; page.on('request', r => urls.push(r.url()));
  await page.addInitScript(() => {
    window.shifts = [];
    new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.shifts.push(e.value); })).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(new URL('writing/toss-fe-ai-verification/', base).href);
  await page.waitForFunction(() => !document.documentElement.classList.contains('fonts-loading'));
  await page.waitForTimeout(500);
  assert(await page.evaluate(() => window.shifts.reduce((a, b) => a + b, 0) < 0.01));
  assert(!urls.some(u => u.includes('PretendardVariable') || u.includes('body.ko.html') || u.includes('giscus.app')));
  for (const image of await page.locator('.post-body img').all()) {
    assert(await image.getAttribute('width'));
    assert(await image.getAttribute('height'));
  }
  await context.close();
});

test('dialogs open, trap focus and restore focus after Escape', async () => {
  const { context, page } = await visit('#portfolio');
  for (const button of await page.locator('[data-project-open]').all()) {
    await button.click();
    assert.equal(await page.locator('dialog[open]').count(), 1);
    await page.keyboard.press('Shift+Tab');
    assert(await page.evaluate(() => !!document.activeElement.closest('dialog[open]')));
    await page.keyboard.press('Escape');
    assert(await button.evaluate(e => e === document.activeElement));
  }
  await context.close();
});

test('language persistence, translation fallback and local code highlighting', async () => {
  const { context, page } = await visit('writing/expensive-main-thread/');
  await page.locator('[data-language="en"]').click();
  await page.waitForFunction(() => document.querySelector('#post-title').textContent.match(/[A-Za-z]/));
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  await page.goto(new URL('writing/what-is-kafka/', base).href);
  await page.waitForSelector('.translation-note');
  assert((await page.locator('#post-body').textContent()).length > 100);
  await context.close();
  const code = await visit('writing/expensive-main-thread/');
  await code.page.waitForSelector('.post-body .token');
  assert((await code.page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.name.includes('prism')).every(r => new URL(r.name).origin === location.origin))));
  await code.context.close();
});

test('responsive navigation has no horizontal page overflow', async () => {
  const { context, page } = await visit('', { reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const hash of ['home', 'writing', 'about', 'portfolio']) {
      await page.goto(new URL('#' + hash, base).href);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width} ${hash}`);
    }
  }
  await context.close();
});

test('failed translation preserves the current article and language', async () => {
  const { context, page } = await visit('writing/expensive-main-thread/');
  const title = await page.locator('#post-title').textContent();
  await page.route('**/body.en.html', route => route.abort());
  await page.locator('[data-language="en"]').click();
  await page.waitForSelector('#post-load-error:not([hidden])');
  assert.equal(await page.locator('#post-title').textContent(), title);
  assert.equal(await page.locator('html').getAttribute('lang'), 'ko');
  await context.close();
});

test('comments are requested only when approaching the comments section', async () => {
  const context = await browser.newContext({ locale: 'ko-KR' });
  const page = await context.newPage();
  let requested = false;
  await page.route('https://giscus.app/client.js', route => {
    requested = true;
    return route.fulfill({ contentType: 'application/javascript', body: '' });
  });
  await page.goto(new URL('writing/toss-fe-ai-verification/', base).href);
  await page.waitForTimeout(300);
  assert.equal(requested, false);
  await page.locator('#giscus-comments').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !!document.querySelector('script[data-giscus-loader]'));
  await page.waitForTimeout(100);
  assert.equal(requested, true);
  await context.close();
});
