// Make each Agent perform her skills on cue (enemies held still) and screenshot two moments of each.
//   node tools/moves-test.js <agent> <outdir> [skill,skill,...]
// Writes <outdir>/<agent>_<skill>_<n>.png and prints any errors.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const [, , agent, out, only] = process.argv;
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__ready === true');
  const squad = [agent, ...['caesar', 'burnice', 'aria', 'yixuan'].filter(x => x !== agent).slice(0, 2)];
  await p.evaluate(sq => {
    BT.T.dmgNumbers = false; BT.T.calmCam = false; BT.T.auto = false;
    GAME.startBattle({ squad: sq, arena: 'stage', encounter: 'elite' });
    for (let i = 0; i < 150; i++) BT.update(1 / 60);
  }, squad);
  const skills = await p.evaluate(a => { const K = DATA.AGENTS[a].kit; return Object.keys(K).flatMap(k => Array.isArray(K[k]) ? K[k].map((_, i) => `basic.${i}`) : [k]); }, agent);
  const list = only ? only.split(',') : skills.filter(s => !['assist', 'guard'].includes(s));
  for (const sk of list) {
    const times = await p.evaluate(([a, sk]) => {
      const B = BT.B, ag = BT.active();
      const [k, i] = sk.split('.'); const def = i != null ? DATA.AGENTS[a].kit[k][+i] : DATA.AGENTS[a].kit[k];
      if (!def) return null;
      for (const e of B.enemies) { e.atkCd = 999; e.act = null; e.hp = e.hpMax; e.stun = 0; e.daze = 0; }
      const tgt = B.enemies.find(e => e.alive && e.spawnT <= 0) || B.enemies[0];
      ag.x = tgt.x + 0.2; ag.z = tgt.z + 3.2; ag.face = Math.PI; ag.act = null; ag.queue.length = 0; ag.airY = 0; ag.energy = 120; ag.state = 'idle';
      B.paused = false; B.threats = [];
      const kind = k === 'basic' ? 'basic' : k;
      BT.startSkill(ag, def, kind, tgt);
      const th = def.hits && def.hits.length ? def.hits[def.hits.length - 1].t : def.dur * 0.6;
      window.__shot = [Math.max(0.05, th * 0.45), th + 0.04];
      return window.__shot;
    }, [agent, sk]);
    if (!times) continue;
    let tPrev = 0;
    for (let n = 0; n < times.length; n++) {
      await p.evaluate(dt => { BT.B.paused = false; const steps = Math.round(dt * 60); for (let i = 0; i < steps; i++) { BT.update(1 / 60); HUD.update(BT.B, 1 / 60); } BT.B.paused = true; }, times[n] - tPrev);
      tPrev = times[n];
      await p.waitForTimeout(120);
      await p.screenshot({ path: path.join(out, `${agent}_${sk}_${n}.png`) });
    }
    await p.evaluate(() => { BT.B.paused = false; for (let i = 0; i < 90; i++) BT.update(1 / 60); });
  }
  console.log(agent, 'done', list.length, 'skills', errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 12).join('\n') : 'no errors');
  await b.close();
})();
