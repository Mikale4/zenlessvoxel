// Phone check: the title, squad screen and a battle on an emulated phone (portrait and
// landscape, touch), with a thumb-stick drag; plus the arrow keys on a desktop.
//   node tools/phone-test.js <outdir>
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const url = 'file://' + path.resolve(__dirname, '..', 'index.html');
  for (const [name, w, h] of [['portrait', 390, 844], ['landscape', 844, 390]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
    await p.goto(url); await p.waitForFunction('window.__ready === true');
    await p.screenshot({ path: path.join(out, `${name}_0_title.png`) });
    await p.evaluate(() => MENU.setup()); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, `${name}_1_setup.png`) });
    const info = await p.evaluate(() => ({ touch: GAME.touch, low: GAME.lowPower, dpr: BT.world.renderer.getPixelRatio(), cls: document.documentElement.className }));
    await p.evaluate(() => { BT.T.auto = false; GAME.startBattle({ squad: ['caesar', 'burnice', 'yixuan'], arena: 'outer', encounter: 'patrol' }); for (let i = 0; i < 200; i++) { BT.update(1 / 60); HUD.update(BT.B, 1 / 60); } });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${name}_2_battle.png`) });
    // a thumb drag: press low on the left, push up and to the right
    const x0 = w * 0.22, y0 = h * 0.7;
    const before = await p.evaluate(() => { const a = BT.active(); return { x: a.x, z: a.z }; });
    await p.mouse.move(x0, y0); await p.mouse.down();
    for (let i = 1; i <= 8; i++) await p.mouse.move(x0 + i * 6, y0 - i * 6);
    await p.evaluate(() => { for (let i = 0; i < 40; i++) { BT.update(1 / 60); HUD.update(BT.B, 1 / 60); } });
    // the stick draws on pointer moves; keep the finger down for the screenshot
    await p.mouse.move(x0 + 50, y0 - 50);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(out, `${name}_3_stick.png`) });
    const mid = await p.evaluate(() => { const a = BT.active(); return { x: a.x, z: a.z, input: Object.assign({}, BT.input) }; });
    await p.mouse.up();
    await p.evaluate(() => MENU.howto()); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${name}_4_howto.png`) });
    console.log(name, JSON.stringify(info), 'moved', JSON.stringify(before), '->', JSON.stringify(mid), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
    await ctx.close();
  }
  // desktop: the arrow keys move her (screen up = away from the camera = -z)
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForFunction('window.__ready === true');
  await p.evaluate(() => { BT.T.auto = false; GAME.startBattle({ squad: ['caesar', 'burnice', 'yixuan'], arena: 'outer', encounter: 'patrol' }); for (let i = 0; i < 200; i++) BT.update(1 / 60); });
  const res = {};
  for (const k of ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']) {
    const a0 = await p.evaluate(() => { const B = BT.B, a = BT.active(); if (B.chain) BT.chainSkip(); B.cutin = null; a.act = null; a.state = 'idle'; a.queue.length = 0; a.gap = 0; for (const e of B.enemies) { e.atkCd = 99; e.daze = 0; e.stun = 0; e.x = 9; e.z = -6; } return { x: a.x, z: a.z }; });
    await p.keyboard.down(k);
    await p.evaluate(() => { for (let i = 0; i < 30; i++) GAME.tick(1 / 60); });
    await p.keyboard.up(k);
    await p.evaluate(() => { for (let i = 0; i < 6; i++) GAME.tick(1 / 60); });
    const a1 = await p.evaluate(() => { const a = BT.active(); return { x: a.x, z: a.z }; });
    res[k] = [+(a1.x - a0.x).toFixed(2), +(a1.z - a0.z).toFixed(2)];
  }
  const keys = await p.evaluate(() => { const B = BT.B, n0 = B.active; const k = c => window.dispatchEvent(new KeyboardEvent('keydown', { key: c })); B.swapCd = 0; k('w'); const n1 = B.active; B.swapCd = 0; k('q'); const n2 = B.active; return { start: n0, afterW: n1, afterQ: n2 }; });
  console.log('desktop arrows dx,dz', JSON.stringify(res), 'swaps', JSON.stringify(keys), errs.length ? 'ERRORS ' + errs.join(' | ') : 'no errors');
  await b.close();
})();
