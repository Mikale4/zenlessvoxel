// Make an enemy perform each of its attacks on cue (the Agent stands still) and screenshot each one.
//   node tools/enemy-test.js <enemy> <outdir> [attack name,attack name] [phase=1|2]
// Writes <outdir>/<enemy>_<n>_<attack>_<k>.png: the windup, then just after the first and the last hit.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const ARENA = { raider: 'outer', pyromaniac: 'outer', enforcer: 'outer', pompey: 'outer', spawn: 'summit', arcavor: 'summit', huskron: 'summit', priest: 'summit', faun: 'stage', specter: 'stage', dullahan: 'stage', butcher: 'stage' };
(async () => {
  const [, , id, out, only, phase] = process.argv;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__ready === true');
  const names = await p.evaluate(([id, arena, phase]) => {
    BT.T.dmgNumbers = true; BT.T.calmCam = true; BT.T.auto = false; BT.T.hazards = false;
    DATA.ENCOUNTERS[arena].test = { name: 'Test', waves: [[id]] };
    GAME.startBattle({ squad: ['caesar', 'burnice', 'yixuan'], arena, encounter: 'test' });
    BT.thinkAgents = () => {};                                   // the Agent stands still
    // a close side-on camera on the two of them
    const up = BT.update; BT.update = dt => { up(dt); const B = BT.B; if (!B) return; const e = B.enemies[0], ag = BT.active(), cam = BT.world.camera, k = Math.max(1, e.height / 2.1) * (window.__far || 1);
      const mx = (e.x + ag.x) / 2, mz = (e.z + ag.z) / 2; cam.position.set(mx + 5.8 * k, 2.7 * k, mz + 1.8 * k); cam.lookAt(mx, e.height * 0.42, mz); };
    for (let i = 0; i < 150; i++) BT.update(1 / 60);
    const e = BT.B.enemies[0]; if (phase) e.phase = +phase;
    return DATA.ENEMIES[id].attacks.map(k => k.name);
  }, [id, ARENA[id], phase]);
  const list = only ? only.split(',') : names;
  let n = 0;
  for (const name of list) {
    const times = await p.evaluate(name => {
      const B = BT.B, ag = BT.active(), e = B.enemies[0], def = e.def.attacks.find(k => k.name === name);
      if (!def) return null;
      e.act = null; e.atkCd = 999; e.hp = e.hpMax; e.stun = 0; e.daze = 0; e.state = 'idle'; e.anim.state = 'idle'; e.airY = 0;
      ag.act = null; ag.state = 'idle'; ag.anim.state = 'idle'; ag.hp = ag.hpMax; ag.dodge = null; ag.vx = ag.vz = 0;
      const far = (def.minReach || 0) > 2.5 || def.reach > 6; window.__far = far ? 1.5 : 1;
      ag.x = 0; ag.z = 3; e.x = 0; e.z = far ? 3 - Math.max(def.minReach || 0, 5) - e.rad : 3 - Math.min(def.reach * 0.8, 2.4) - e.rad - ag.rad;
      e.face = 0; B.threats = []; B.paused = false;
      BT.startEnemyAttack(e, def, ag);
      e.atkCd = 999;
      const hs = def.hits.map(h => h.t), sp = e.act.speed || 1;
      return [Math.max(0.1, hs[0] - 0.3) / sp, (hs[0] + 0.04) / sp, (hs[hs.length - 1] + 0.06) / sp].filter((t, i, a) => i === 0 || t > a[i - 1] + 0.05);
    }, name);
    if (!times) { console.log('no attack', name); continue; }
    let tPrev = 0; n++;
    for (let k = 0; k < times.length; k++) {
      await p.evaluate(dt => { const B = BT.B; B.paused = false; const steps = Math.round(dt * 60); for (let i = 0; i < steps; i++) { B.enemies[0].atkCd = 999; BT.update(1 / 60); HUD.update(B, 1 / 60); } B.paused = true; }, times[k] - tPrev);
      tPrev = times[k];
      await p.waitForTimeout(100);
      await p.screenshot({ path: path.join(out, `${id}_${n}_${name.replace(/[^A-Za-z]+/g, '')}_${k}.png`) });
    }
    const after = await p.evaluate(() => { const B = BT.B; B.paused = false; for (let i = 0; i < 150; i++) { B.enemies[0].atkCd = 999; BT.update(1 / 60); } const ag = BT.active(); return { hp: Math.round(ag.hp), max: ag.hpMax, eh: Object.assign({}, B.eh) }; });
    console.log(`${id} | ${name} | agent hp ${after.hp}/${after.max} | ${JSON.stringify(after.eh)}`);
  }
  console.log(id, 'done', errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n') : 'no errors');
  await b.close();
})();
