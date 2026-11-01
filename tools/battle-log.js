// Fast-forward an AUTO battle and print the battle log lines that match a pattern.
//   node tools/battle-log.js squad=a,b,c arena=summit encounter=elite seconds=150 grep=COUNTER|Guard
const path = require('path');
const { chromium } = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await p.waitForFunction('window.__ready === true');
  const out = await p.evaluate(o => {
    const lines = [];
    BT.T.auto = true; BT.T.dmgNumbers = false;
    GAME.startBattle({ squad: o.squad, arena: o.arena, encounter: o.encounter }); BT.B.auto = true;
    const lg = BT.hooks.log, co = BT.hooks.callout;
    BT.hooks.log = (t, c) => { lines.push(`${BT.B ? BT.B.t.toFixed(1) : ''} ${t}`); if (lg) lg(t, c); };
    BT.hooks.callout = (t, c, s) => { lines.push(`${BT.B ? BT.B.t.toFixed(1) : ''} [${t}] ${s || ''}`); if (co) co(t, c, s); };
    for (let i = 0; i < o.seconds * 60; i++) { if (!BT.B || BT.B.result) break; BT.update(1 / 60); }
    const B = BT.B;
    return { lines, result: B && B.result, t: B && B.t.toFixed(1), eh: B && B.eh, taken: B && B.stats.taken };
  }, { squad: (args.squad || 'caesar,aria,yixuan').split(','), arena: args.arena || 'summit', encounter: args.encounter || 'elite', seconds: +(args.seconds || 150) });
  const re = new RegExp(args.grep || '.', 'i');
  for (const l of out.lines) if (re.test(l)) console.log(l);
  console.log('RESULT', out.result, 't', out.t, 'taken', out.taken, JSON.stringify(out.eh));
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 10).join('\n') : 'no errors');
  await b.close();
})();
