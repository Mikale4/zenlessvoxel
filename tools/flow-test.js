// The whole front end: title (with its live battle), register, choose a Proxy, the intro, the
// lobby (walk, use the HDD, talk to an Agent, records), back again. Screenshots at each step.
//   node tools/flow-test.js <outdir> [phone]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2], phone = process.argv[3] === 'phone'; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext(phone ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__ready === true');
  const shot = async (n) => { await p.waitForTimeout(350); await p.screenshot({ path: path.join(out, (phone ? 'p_' : '') + n + '.png') }); };
  const step = (n, dt) => p.evaluate(([n, dt]) => { for (let i = 0; i < n; i++) { if (GAME.mode === 'lobby') { Lobby.update(dt); FX.update(dt, dt); } else if (BT.B) BT.update(dt); } }, [n, dt || 1 / 30]);
  await step(120); await shot('01_title');
  await p.click('text=REGISTER A PROXY'); await shot('02_register');
  const name = 'Phaethon' + Math.floor(Math.random() * 900 + 100);
  const inputs = await p.$$('.auth input');
  await inputs[0].fill(name); await inputs[1].fill('hollow'); await inputs[2].fill('hollow');
  await p.click('text=CREATE ACCOUNT'); await p.waitForTimeout(500);
  await step(30); await shot('03_chooser');
  await p.click('.pcard.belle'); await step(40); await shot('04_chose_belle');
  await p.click("text=I'M BELLE"); await p.waitForTimeout(900); await step(20); await shot('05_lobby_intro');
  for (let i = 0; i < 6; i++) { const d = await p.$('.dlg'); if (!d) break; await d.click(); await p.waitForTimeout(80); }
  // walk out of the shop and down the street with the keys
  await p.keyboard.down('s'); await step(60); await p.keyboard.up('s');
  await p.keyboard.down('a'); await step(50); await p.keyboard.up('a');
  await step(20); await shot('06_street');
  const where = await p.evaluate(() => { const m = Lobby.player(); return { x: +m.x.toFixed(2), z: +m.z.toFixed(2) }; });
  // talk to Caesar: click her sign
  await p.evaluate(() => Lobby.goUse('agent:caesar')); await step(160); await shot('07_caesar_talk');
  const d1 = await p.$('.dlg'); if (d1) await d1.click(); await p.waitForTimeout(300); await shot('08_dossier');
  await p.click('text=CLOSE'); await p.waitForTimeout(200);
  // into Random Play, to the HDD
  await p.evaluate(() => Lobby.goUse('hdd')); await step(300); await shot('09_hdd');
  const mode = await p.evaluate(() => GAME.mode);
  await p.click('text=◀ SIXTH STREET'); await p.waitForTimeout(500); await step(40); await shot('10_back_in_lobby');
  await p.evaluate(() => MENU.records()); await shot('11_records');
  await p.click('text=CLOSE');
  const acc = await p.evaluate(() => Auth.current());
  console.log((phone ? 'PHONE ' : '') + JSON.stringify({ name, proxy: acc.proxy, seenIntro: acc.seenIntro, walkedTo: where, modeAfterHdd: mode }));
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n') : 'no errors');
  await b.close();
})();
