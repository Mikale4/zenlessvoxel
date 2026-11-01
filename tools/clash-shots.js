// Screenshots of Proxy Clash, front to back: the cabinets on Sixth Street, the setup screen, a fight, the results.
//   node tools/clash-shots.js outdir [phone|desktop] [mode]
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '.', phone = process.argv[3] === 'phone', mode = process.argv[4] || 'tag3';
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__ready === true');
  const shot = async (name, ms) => { await p.waitForTimeout(ms || 400); await p.screenshot({ path: path.join(out, name) }); console.log('saved', name); };
  // an account, Belle, at the cabinets
  await p.evaluate(async mode => { localStorage.clear(); const r = await Auth.register('ClashTester', 'pass1234'); Auth.update({ proxy: 'belle', seenIntro: true }); U.store.ns = Auth.current().id; U.store.set('clash', { mode, squad: ['caesar', 'burnice', 'aria'], rival: 'vesper', rsquad: null, arena: 'stage' }); MENU.loadAccount(); MENU.lobby({ spawn: [-3.9, -1.2] }); }, mode);
  await p.evaluate(() => { for (let i = 0; i < 40; i++) { Lobby.update(1 / 30); FX.update(1 / 30, 1 / 30); } });
  await shot('clash-1-lobby.png', 600);
  // the setup screen
  await p.evaluate(() => MENU.clash());
  await p.evaluate(() => { for (let i = 0; i < 30; i++) { } });
  await shot('clash-2-setup.png', 900);
  // a fight: step it forward, then a frame
  await p.evaluate(() => { BT.T.auto = true; MENU.clashGo(); BT.B.auto = true; for (let i = 0; i < 60 * 9; i++) { GAME.tick(1 / 60); if (BT.B.result) break; } HUD.update(BT.B, 0.1); });
  await shot('clash-3-fight.png', 500);
  await p.evaluate(() => { for (let i = 0; i < 60 * 14; i++) { GAME.tick(1 / 60); if (BT.B.result) break; } HUD.update(BT.B, 0.1); });
  await shot('clash-4-fight.png', 500);
  // to the end, and the results
  const res = await p.evaluate(() => { for (let i = 0; i < 60 * 300; i++) { GAME.tick(1 / 60); if (BT.B.result) break; } const r = BT.B.result, t = BT.B.t; BT.hooks.finish(BT.B); return r + ' ' + t.toFixed(1); });
  console.log('result', res);
  await shot('clash-5-results.png', 600);
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no errors');
  await b.close();
})();
