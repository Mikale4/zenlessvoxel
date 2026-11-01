// Drive the real game headless: start a battle and fast-forward it, report what happened.
//   node tools/play.js [squad=caesar,burnice,yixuan] [arena=outer] [encounter=patrol] [seconds=120] [shots=dir] [auto=1]
// Prints console errors, the battle result, stats and periodic snapshots. With shots=dir it saves screenshots.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +(args.w || 1280), height: +(args.h || 720) } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction('window.__ready === true', null, { timeout: 60000 });
  const shots = args.shots; if (shots) fs.mkdirSync(shots, { recursive: true });
  if (shots) await page.screenshot({ path: path.join(shots, '00_title.png') });
  if (args.setup) { await page.evaluate(() => MENU.setup()); await page.waitForTimeout(800); if (shots) await page.screenshot({ path: path.join(shots, '01_setup.png') }); }
  const squad = (args.squad || 'caesar,burnice,yixuan').split(','), arena = args.arena || 'outer', encounter = args.encounter || 'patrol';
  await page.evaluate(o => { BT.T.auto = o.auto; MENU.saveTuning && 0; GAME.startBattle({ squad: o.squad, arena: o.arena, encounter: o.encounter }); BT.B.auto = o.auto; }, { squad, arena, encounter, auto: args.auto !== '0' });
  const total = +(args.seconds || 120), step = +(args.step || 10);
  for (let t = 0; t < total; t += step) {
    const snap = await page.evaluate(n => {
      for (let i = 0; i < n; i++) { if (!BT.B || BT.B.result) break; BT.update(1 / 60); HUD.update(BT.B, 1 / 60); }
      const B = BT.B; if (!B) return { gone: true };
      const a = BT.active();
      return { t: +B.t.toFixed(1), result: B.result, wave: B.wave + 1, active: a.id, assist: B.assist,
        squad: B.squad.map(s => `${s.id}:${Math.round(s.hp)}/${s.hpMax} en${Math.round(s.energy)} db${Math.round(s.decibels)}`).join(' | '),
        enemies: B.enemies.filter(e => e.alive).map(e => `${e.id}:${Math.round(e.hp / e.hpMax * 100)}% dz${Math.round(e.daze / e.dazeMax * 100)}${e.stun > 0 ? ' STUN' : ''}${e.anom ? ' ' + e.anom.type : ''}`).join(', '),
        stats: B.stats, eh: B.eh };
    }, Math.round(step * 60));
    console.log(JSON.stringify(snap));
    if (shots) { await page.waitForTimeout(250); await page.screenshot({ path: path.join(shots, `t${String(Math.round(snap.t || 0)).padStart(4, '0')}.png`) }); }
    if (snap.gone || snap.result) break;
  }
  await page.waitForTimeout(2600);
  if (shots) await page.screenshot({ path: path.join(shots, 'zz_end.png') });
  const fps = await page.evaluate(() => window.__stats && window.__stats.fps);
  console.log('fps(headless swiftshader):', fps);
  if (errs.length) console.log('ERRORS:\n' + [...new Set(errs)].slice(0, 20).join('\n'));
  await browser.close();
})();
