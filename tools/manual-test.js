// AUTO off (manual movement): a stand-in player steers toward the nearest enemy whenever
// nothing is in range and lets go once something is, so the Agent fights on her own.
//   node tools/manual-test.js squad=caesar,burnice,yixuan arena=outer encounter=patrol seconds=180
const path = require('path');
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__ready === true');
  const r = await p.evaluate(o => {
    BT.T.auto = false; BT.T.dmgNumbers = false;
    GAME.startBattle({ squad: o.squad, arena: o.arena, encounter: o.encounter }); BT.B.auto = false;
    let moving = 0, frames = 0, swaps = 0;
    for (let i = 0; i < o.seconds * 60; i++) {
      const B = BT.B; if (!B || B.result) break;
      const a = BT.active(), I = BT.input;
      I.x = I.y = I.k = 0;
      if (a && a.alive && !B.chain) {
        let near = null, nd = 1e9; for (const v of B.enemies) if (v.alive && v.spawnT <= 0) { const d = Math.hypot(v.x - a.x, v.z - a.z) - v.rad; if (d < nd) { nd = d; near = v; } }
        const reach = Math.max(a.def.ai.range || 1.6, ...a.def.kit.basic.map(k => k.reach || 1.6));
        if (near && nd > reach * 0.85) {
          const y = B.cam.yaw || 0, wx = near.x - a.x, wz = near.z - a.z, L = Math.hypot(wx, wz);
          I.x = (Math.cos(y) * wx - Math.sin(y) * wz) / L; I.y = (-Math.sin(y) * wx - Math.cos(y) * wz) / L; I.k = 1; moving++;
        }
        // the player answers flashes with an Assist now and then, and takes Quick Assists
        const th = BT.assistThreat(); if (th && Math.random() < 0.02) { if (BT.cmdSwap(1)) swaps++; }
        if (a.launchedUntil > B.t && Math.random() < 0.05) { if (BT.cmdSwap(1)) swaps++; }
      }
      if (B.chain && Math.random() < 0.05) BT.chainPick(0);
      BT.update(1 / 60); frames++;
    }
    const B = BT.B;
    return { result: B.result, t: B.t.toFixed(1), moving: (moving / frames).toFixed(2), swaps, taken: B.stats.taken, stats: B.stats, eh: B.eh, left: B.enemies.filter(e => e.alive).map(e => `${e.id} ${Math.round(e.hp / e.hpMax * 100)}%`) };
  }, { squad: (args.squad || 'caesar,burnice,yixuan').split(','), arena: args.arena || 'outer', encounter: args.encounter || 'patrol', seconds: +(args.seconds || 180) });
  console.log(JSON.stringify(r));
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 10).join('\n') : 'no errors');
  await b.close();
})();
