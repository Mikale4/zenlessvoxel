// Screenshot a page of this project with the pre-installed Playwright Chromium.
//   node tools/shot.js "tools/viewer.html?model=caesar" out.png [width] [height] [waitMs]
// Prints any console errors the page logged. Serves files over file://.
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [, , rel, out, w, h, wait] = process.argv;
  const root = path.resolve(__dirname, '..');
  const [file, query] = rel.split('?');
  const url = 'file://' + path.join(root, file) + (query ? '?' + query : '');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +w || 1280, height: +h || 720 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(url);
  try { await page.waitForFunction('window.__ready === true', null, { timeout: 30000 }); } catch (e) { errs.push('timeout waiting for __ready'); }
  await page.waitForTimeout(+wait || 300);
  await page.screenshot({ path: out });
  const txt = await page.evaluate(() => (document.getElementById('info') || {}).textContent || '');
  console.log(txt);
  if (errs.length) console.log(errs.join('\n'));
  await browser.close();
})();
