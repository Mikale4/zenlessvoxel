// Proxy Clash, fast-forwarded headless with your side on AUTO.
//   node tools/clash-test.js squad=caesar,aria rival=vesper rsquad=burnice,yixuan arena=stage grep=Rival
//   node tools/clash-test.js batch=6 mode=all3 rival=patch,vesper,mirage     (calibration: win rate and length per rival; pool=a,b,c narrows the squads drawn)
//   modes: duel tag2 all2 tag3 all3 (size= alone means Tag Team at that size)
const path = require('path');
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 4).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__ready === true');
  const run = o => p.evaluate(o => {
    const lines = [];
    BT.T.auto = true; BT.T.dmgNumbers = false; if (o.hp) BT.T.clashHp = o.hp;
    GAME.startBattle({ squad: o.squad, arena: o.arena, look: {}, clash: { rival: o.rival, squad: o.rsquad, look: {}, mode: o.mode } }); BT.B.auto = true;
    const lg = BT.hooks.log, co = BT.hooks.callout;
    if (o.log) {
      BT.hooks.log = (t, c) => { lines.push(`${BT.B ? BT.B.t.toFixed(1) : ''} ${t}`); if (lg) lg(t, c); };
      BT.hooks.callout = (t, c, s) => { lines.push(`${BT.B ? BT.B.t.toFixed(1) : ''} [${t}] ${s || ''}`); if (co) co(t, c, s); };
    }
    let maxThreats = 0; const prof = {}, kinds = {}, mineProf = {};
    for (let i = 0; i < o.seconds * 60; i++) {
      if (!BT.B || BT.B.result) break; BT.update(1 / 60); maxThreats = Math.max(maxThreats, BT.B.threats.length);
      const e = CLASH.onField(), a = BT.active();
      for (const s of BT.B.squad) if (s.stun > 0) mineProf.stunned = (mineProf.stunned || 0) + 1 / 60;
      if (e && BT.B.phase === 'fight') {
        const k = !e.alive ? 'down' : e.stun > 0 ? 'stun' : e.act ? 'act:' + e.act.kind : e.state !== 'idle' ? e.state : e.gap > 0 ? 'gap' : e.moving ? 'approach' : 'idle';
        prof[k] = (prof[k] || 0) + 1 / 60;
        if (e.act && e.act.t === 0 + e.act.t && !e.act._seen) { e.act._seen = true; kinds[e.act.kind] = (kinds[e.act.kind] || 0) + 1; }
      }
      if (a && BT.B.phase === 'fight') { const k = !a.alive ? 'down' : a.act ? 'act:' + a.act.kind : a.state; mineProf[k] = (mineProf[k] || 0) + 1 / 60; }
    }
    const B = BT.B, RV = B.rival;
    BT.hooks.log = lg; BT.hooks.callout = co;
    const r = {
      lines, result: B.result || 'timeout', t: +B.t.toFixed(1), eh: B.eh, stats: B.stats, rstats: RV.stats, maxThreats, prof, kinds, mineProf,
      mine: B.squad.map(a => `${a.id}:${Math.round(100 * Math.max(0, a.hp) / a.hpMax)}%`).join(' '),
      theirs: RV.squad.map(a => `${a.id}:${Math.round(100 * Math.max(0, a.hp) / a.hpMax)}%`).join(' '),
    };
    GAME.toMenu();
    return r;
  }, o);
  const AG = (args.pool || 'caesar,burnice,aria,yixuan,qingyi,jufufu,orphie,remielle').split(','), pick = n => AG.slice().sort(() => Math.random() - 0.5).slice(0, n);   // pool= to narrow it
  if (args.batch) {
    const MODES = { duel: 1, tag2: 2, all2: 2, tag3: 3, all3: 3 };
    const mode = args.mode || ({ 1: 'duel', 2: 'tag2', 3: 'tag3' })[args.size || 3], rivals = (args.rival || 'patch,vesper,mirage').split(','), n = +args.batch, size = MODES[mode];
    for (const rival of rivals) {
      let wins = 0, tsum = 0, tl = [], ex = {};
      for (let i = 0; i < n; i++) {
        const out = await run({ squad: pick(size), rsquad: pick(size), rival, mode, arena: ['outer', 'summit', 'stage'][i % 3], seconds: +(args.seconds || 420), hp: +args.hp || 0 });
        if (out.result === 'win') wins++; tsum += out.t; tl.push(`${out.result[0]}${out.t}`);
        for (const k in out.rstats) ex[k] = (ex[k] || 0) + out.rstats[k];
        ex.stunnedMine = (ex.stunnedMine || 0) + (out.mineProf.stunned || 0); ex.dealt = (ex.dealt || 0) + out.stats.dmg / 1000; ex.taken = (ex.taken || 0) + out.stats.taken / 1000; ex.chains = (ex.chains || 0) + out.stats.chains; ex.stuns = (ex.stuns || 0) + out.stats.stuns; ex.perfectMine = (ex.perfectMine || 0) + out.stats.perfect; ex.assistsMine = (ex.assistsMine || 0) + out.stats.assists;
      }
      for (const k in ex) ex[k] = +(ex[k] / n).toFixed(1);
      console.log(`${mode} ${rival.padEnd(7)} wins ${wins}/${n}  avg ${(tsum / n).toFixed(0)}s  [${tl.join(' ')}]  per fight ${JSON.stringify(ex)}`);
    }
  } else {
    const out = await run({ squad: (args.squad || 'caesar,aria,yixuan').split(','), rsquad: args.rsquad ? args.rsquad.split(',') : null, rival: args.rival || 'vesper', mode: args.mode, arena: args.arena || 'stage', seconds: +(args.seconds || 420), log: true, hp: +args.hp || 0 });
    const re = new RegExp(args.grep || '.', 'i');
    for (const l of out.lines) if (re.test(l)) console.log(l);
    console.log('RESULT', out.result, 't', out.t, '| mine', out.mine, '| theirs', out.theirs);
    const fmt = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${typeof v === 'number' && v % 1 ? v.toFixed(1) : v}`).join(', ');
    if (args.prof) console.log('RIVAL TIME', fmt(out.prof), '\nRIVAL MOVES', fmt(out.kinds), '\nYOUR TIME', fmt(out.mineProf));
    console.log('you', JSON.stringify(out.stats), '\nrival', JSON.stringify(out.rstats), '\neh', JSON.stringify(out.eh), 'maxThreats', out.maxThreats);
  }
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 10).join('\n') : 'no errors');
  await b.close();
})();
