/* ============================================================================
   hud.js -- the battle HUD: the squad panel (HP, Energy/Adrenaline, Decibels,
   each Agent's own resource), Assist Points, the target's HP/Daze/anomaly
   buildup, the command buttons, the Chain Attack prompt, the Ultimate cut-in,
   callouts, the battle log, and the flash vignette.
   ========================================================================== */
(function () {
  'use strict';
  const { el, $ } = U, D = window.DATA, R = D.RULES;
  const HUD = {};
  let root = null, E = {}, lastLog = [], floatPool = [];
  const pct = (v, m) => Math.max(0, Math.min(100, v / m * 100)) + '%';
  const portrait = id => (window.PORTRAITS && PORTRAITS[id]) || '';

  HUD.build = B => {
    root = $('hud'); root.innerHTML = ''; root.hidden = false; E = {}; lastLog = []; floatPool = [];
    // squad
    const sq = el('div', { class: 'squad' });
    E.main = {
      img: el('img', { alt: '' }), name: el('span'), spec: el('small'), hp: el('i', { class: 'v' }), sh: el('i', { class: 'sh' }), hpn: el('div', { class: 'hpnum' }),
      en: el('i', { class: 'v' }), exm: el('b'), enBar: null, res: el('div', { class: 'res' }), dbv: el('i', { class: 'v' }), dbt: el('b'), db: null,
      dz: el('i', { class: 'v' }), dzBar: null,
    };
    const M = E.main;
    M.dzBar = el('div', { class: 'bar daze', hidden: !B.rival }, M.dz);          // Proxy Clash: your Agents can be Stunned too
    M.enBar = el('div', { class: 'bar en' }, M.en, M.exm);
    M.db = el('div', { class: 'db' }, el('span', null, 'DECIBELS'), el('div', { class: 'bar' }, M.dbv), M.dbt);
    sq.append(el('div', { class: 'amain' }, M.img, el('div', null, el('div', { class: 'aname' }, M.name, M.spec), el('div', { class: 'bar hp' }, M.hp, M.sh), M.dzBar, M.hpn, M.enBar, M.db, M.res)));
    E.subs = [0, 1].map(i => {
      const s = { img: el('img', { alt: '' }), nm: el('div', { class: 'nm' }), hp: el('i', { class: 'v' }), en: el('i', { class: 'v' }), db: el('i', { class: 'v' }), dz: el('i', { class: 'v' }), key: el('kbd') };
      s.root = el('div', { class: 'asub pe', onpointerdown: ev => { ev.preventDefault(); if (s.agent) BT.cmdSwap(s.agent); } },
        s.img, el('div', null, s.nm, el('div', { class: 'bar hp' }, s.hp), B.rival ? el('div', { class: 'bar daze' }, s.dz) : null, el('div', { class: 'bar en' }, s.en), el('div', { class: 'bar', style: { height: '3px' } }, s.db)), s.key);
      sq.append(s.root); return s;
    });
    E.assist = el('div', { class: 'assist' }); sq.append(E.assist);
    root.append(sq);
    // target enemy
    E.en = { name: el('span'), rank: el('em'), hp: el('i', { class: 'v' }), lag: el('i', { class: 'lag' }), daze: el('i', { class: 'v' }), dazeBar: null, stunx: el('div', { class: 'stunx' }), anoms: el('div', { class: 'anoms' }), chips: el('div', { class: 'chips' }) };
    E.en.dazeBar = el('div', { class: 'bar daze' }, E.en.daze);
    E.enRoot = el('div', { class: 'enemy' }, el('div', { class: 'en-name' }, E.en.rank, E.en.name), el('div', { class: 'bar hp' }, E.en.lag, E.en.hp), E.en.dazeBar, E.en.stunx, E.en.anoms, E.en.chips);
    root.append(E.enRoot);
    // top right
    E.tm = el('div', { class: 'tm' }); E.wv = el('div', { class: 'wv' });
    E.auto = el('button', { class: 'auto pe', onpointerdown: ev => { ev.preventDefault(); BT.setAuto(!BT.B.auto); HUD.saveAuto(); } }, 'AUTO');
    E.moveHint = el('div', { class: 'movehint' });
    // Proxy Clash: the rival Proxy's squad
    E.rv = null;
    if (B.rival) {
      const RV = B.rival;
      E.rv = { root: el('div', { class: 'rv' }), rows: [], pips: el('div', { class: 'rv-assist' }) };
      E.rv.root.append(el('div', { class: 'rv-head', style: { borderColor: RV.diff.color } }, el('b', null, RV.diff.name.toUpperCase()), el('small', null, `${RV.diff.tier.toUpperCase()} · RIVAL PROXY`)));
      for (const r of RV.squad) {
        const row = { r, hp: el('i'), db: el('i'), root: null };
        row.root = el('div', { class: 'rv-row' }, el('img', { src: portrait(r.modelId || r.id), alt: '' }), el('div', null, el('span', null, r.def.short), el('div', { class: 'bar hp' }, row.hp), el('div', { class: 'bar db' }, row.db)));
        E.rv.rows.push(row); E.rv.root.append(row.root);
      }
      E.rv.root.append(E.rv.pips);
    }
    root.append(el('div', { class: 'topright' }, E.tm, E.wv, E.auto, E.moveHint, E.rv ? E.rv.root : null));
    // log, callouts, floating bars
    E.log = el('div', { class: 'log' }); E.co = el('div', { class: 'callouts' }); E.floats = el('div');
    root.append(E.log, E.co, E.floats);
    // commands
    const cmd = (label, key, fn, cls) => { const b = el('button', { class: 'cmd pe ' + (cls || ''), onpointerdown: ev => { ev.preventDefault(); SFX.unlock(); fn(); } }, el('span', null, label), el('small', null, key)); return b; };
    E.swapWord = B.allOut ? 'SWITCH' : 'SWAP';                     // All-Out: nobody swaps out; you switch whom you lead
    E.cPrev = cmd('◀ ' + E.swapWord, 'Q', () => BT.cmdSwap(-1));
    E.cNext = cmd(E.swapWord + ' ▶', 'W', () => BT.cmdSwap(1));
    E.cEx = cmd('EX', 'E', () => BT.cmdEx());
    E.cUlt = cmd('ULT', 'R', () => BT.cmdUlt(), 'ult');
    E.cTab = cmd('TARGET', 'TAB', () => BT.cmdFocus());
    E.cMenu = cmd('TACTICS', 'ESC', () => MENU.tactics());
    for (const b of [E.cPrev, E.cNext, E.cEx, E.cUlt, E.cTab, E.cMenu]) b.querySelector('span').className = 'lbl';
    E.cdBar = el('i', { class: 'cd' }); E.cNext.append(E.cdBar);
    root.append(el('div', { class: 'cmds' }, E.cPrev, E.cNext, E.cEx, E.cTab, E.cUlt, E.cMenu));
    // chain prompt, cut-in
    E.chain = el('div', { class: 'chainp', hidden: true }); root.append(E.chain);
    E.cut = el('div', { class: 'cutin', hidden: true }); document.body.append(E.cut);
    E.vig = $('vignette'); E.bars = $('bars');
    HUD.applyLogPref();
  };
  HUD.destroy = () => { if (root) { root.innerHTML = ''; root.hidden = true; } if (E.cut) E.cut.remove(); if (E.vig) E.vig.className = ''; if (E.bars) E.bars.classList.remove('on'); };
  HUD.applyLogPref = () => { if (E.log) E.log.style.display = BT.T.showLog ? '' : 'none'; };
  HUD.saveAuto = () => { if (window.MENU) MENU.saveTuning(); };

  /* ------------------------------------------------------------ hooks -- */
  const off = () => !root || root.hidden;   // no HUD (the title's battle): the hooks stay quiet
  BT.hooks.log = (text, cls) => {
    if (!E.log || off()) return;
    const d = el('div', { class: cls || '' }, text); E.log.append(d);
    while (E.log.children.length > 7) E.log.firstChild.remove();
    [...E.log.children].forEach((c, i, a) => c.classList.toggle('old', i < a.length - 3));
  };
  BT.hooks.callout = (text, cls, sub) => {
    if (!E.co || off()) return;
    const d = el('div', { class: 'co ' + (cls || '') }, text, sub ? el('small', null, sub) : null);
    E.co.append(d); while (E.co.children.length > 3) E.co.firstChild.remove();
    setTimeout(() => d.remove(), 950);
  };
  BT.hooks.chainOpen = C => {
    if (!E.chain || off()) return;
    E.chain.innerHTML = ''; E.chain.hidden = false;
    const card = (a, i) => el('div', { class: 'cc', onpointerdown: ev => { ev.preventDefault(); BT.chainPick(i); } },
      el('img', { src: portrait(a.modelId || a.id), alt: '' }), el('div', null, el('b', null, a.def.short), el('small', null, a.def.kit.chain.name.replace('Chain Attack: ', '')), el('kbd', null, i === 0 ? 'Q / 1' : 'W / 2')));
    E.chainTb = el('i');
    const mid = el('div', { class: 'mid' }, 'CHAIN', el('div', { class: 'tb' }, E.chainTb), el('small', null, `${C.tgt.def.name} · ${C.tgt.chainsLeft + 1} left`), E.chainUlt = el('small', null, ''));
    if (C.opts[0]) E.chain.append(card(C.opts[0], 0));
    E.chain.append(mid);
    if (C.opts[1]) E.chain.append(card(C.opts[1], 1));
  };
  BT.hooks.chainClose = () => { if (E.chain) E.chain.hidden = true; };
  BT.hooks.cutin = (a, def) => {
    if (!E.cut || !BT.T.cutins || off()) return;
    const col = a.def.color;
    E.cut.innerHTML = ''; E.cut.hidden = false;
    E.cut.append(el('div', { class: 'stripe', style: { background: `linear-gradient(90deg, transparent, ${col} 15%, ${a.def.color2} 60%, transparent)` } }),
      el('div', { class: 'txt' }, el('small', null, a.def.name.toUpperCase()), el('b', null, def.name.replace(/^Ultimate: /, ''))));
  };
  BT.hooks.cutinEnd = () => { if (E.cut) E.cut.hidden = true; };
  let vigT = 0;
  BT.hooks.flash = (color) => { if (off()) return; vigT = 0.18; if (E.vig) E.vig.className = color; };
  BT.hooks.glitch = () => { if (!E.vig || off()) return; E.vig.className = 'glitch'; vigT = 0.5; };

  /* ----------------------------------------------------------- update -- */
  const _v = new THREE.Vector3();
  let acc = 0;
  HUD.update = (B, rdt) => {
    if (!root || !B) return;
    acc += rdt;
    if (vigT > 0) { vigT -= rdt; if (vigT <= 0 && E.vig) E.vig.className = ''; }
    const ag = BT.active();
    // the assist window glows the vignette as long as it is open
    const th = BT.assistThreat();
    if (th && vigT <= 0 && E.vig) E.vig.className = (th.flash === 'gold' && B.assist > 0) ? 'gold' : 'red';
    else if (!th && vigT <= 0 && E.vig && E.vig.className !== '') E.vig.className = '';
    E.bars.classList.toggle('on', !!B.cutin || !!B.chain || !!(ag && ag.act && ['ult', 'ult2', 'chain'].includes(ag.act.kind)));
    if (B.chain && E.chainTb) { E.chainTb.style.width = pct(B.chain.timer, BT.T.chainWindow); E.chainUlt.textContent = ag && (ag.decibels >= R.decibelMax) ? 'R: ULTIMATE' : ''; }
    floats(B);
    if (acc < 1 / 30) return; acc = 0;
    // main panel
    const M = E.main;
    if (ag) {
      if (M.img.dataset.id !== ag.modelId) { M.img.src = portrait(ag.modelId || ag.id); M.img.dataset.id = ag.modelId; M.name.textContent = ag.def.name; M.spec.textContent = B.allOut ? `LEAD · ${ag.def.spec}` : `${ag.def.spec} · ${D.ATTR[ag.def.attr].name}`; }
      if (B.rival) { M.dz.style.width = pct(ag.daze || 0, ag.dazeMax || 1); M.dzBar.className = 'bar daze' + (ag.stun > 0 ? ' stun' : ''); }
      M.hp.style.width = pct(ag.hp, ag.hpMax); M.hpn.textContent = '';
      M.hpn.append(el('span', null, `HP ${U.fmt(Math.max(0, ag.hp))} / ${U.fmt(ag.hpMax)}`), el('span', null, B.aegis && B.aegis.hp > 0 && B.aegis.until > B.t ? `AEGIS ${U.fmt(B.aegis.hp)}` : ''));
      M.sh.style.width = B.aegis && B.aegis.hp > 0 && B.aegis.until > B.t ? pct(B.aegis.hp, B.aegis.max) : '0%';
      const adr = ag.def.resource === 'adrenaline', cost = ag.def.kit.ex.cost;
      M.enBar.className = 'bar en' + (adr ? ' adr' : '') + (ag.energy < cost ? ' low' : '');
      M.en.style.width = pct(ag.energy, ag.def.energyMax); M.exm.style.left = pct(cost, ag.def.energyMax);
      const dbMax = ag.decibels >= R.decibelMax;
      M.db.className = 'db' + (dbMax ? ' max' : ''); M.dbv.style.width = pct(ag.decibels, R.decibelMax);
      M.dbt.textContent = dbMax ? 'MAXIMUM' : ag.decibels >= 2000 ? 'BLASTING' : ag.decibels >= 1000 ? 'UPROAR' : Math.floor(ag.decibels);
      M.res.innerHTML = '';
      const r = [];
      r.push(`${adr ? 'ADRENALINE' : 'ENERGY'} ${Math.floor(ag.energy)}`);
      if (ag.id === 'burnice') r.push(`HEAT ${Math.floor(ag.heat)}${ag.nitro ? ' · NITRO-FUEL' : ''}`);
      if (ag.id === 'aria') { r.push(`FANDOM ${B.fandom.length}/6`); if (ag.delusion > B.t) r.push(`DELUSION ${Math.ceil(ag.delusion - B.t)}s`); if (ag.cheer) r.push(`CHEERING ×${ag.cheer}`); if (ag.noIce) r.push('NO ICE READY'); }
      if (ag.id === 'yixuan') { r.push(`TECHNIQUE ${Math.floor(ag.tp)}/120`); if (ag.auric) r.push('AURIC INK POINT'); if (ag.meditation > B.t) r.push(`MEDITATION ${Math.ceil(ag.meditation - B.t)}s`); }
      if (ag.id === 'caesar' && ag.impactUp > B.t) r.push('STANCE SWITCH');
      r.push(`DODGE ${ag.dodgeCharges > 0 ? '●'.repeat(ag.dodgeCharges) : '…'}`);
      if (ag.stun > 0) r.unshift(`STUNNED ${ag.stun.toFixed(1)}s${B.allOut ? '' : ' · SWAP!'}`);
      for (const t of r) M.res.append(el('span', null, t));
    }
    // the other two: W brings in the next, Q the previous
    const n = B.squad.length, nxt = BT.nextAlive(1), prv = BT.nextAlive(-1);
    const others = [1, 2].filter(k => k < n).map(k => B.squad[(B.active + k) % n]);   // (a squad of two: just the one)
    E.subs.forEach((s, i) => {
      const a = others[i]; s.agent = a; s.root.hidden = !a; if (!a) return;
      if (s.img.dataset.id !== a.modelId) { s.img.src = portrait(a.modelId || a.id); s.img.dataset.id = a.modelId; s.nm.textContent = a.def.short; }
      s.hp.style.width = pct(a.hp, a.hpMax); s.en.style.width = pct(a.energy, a.def.energyMax); s.db.style.width = pct(a.decibels, R.decibelMax);
      if (B.rival) s.dz.style.width = pct(a.daze || 0, a.dazeMax || 1);
      s.root.classList.toggle('down', !a.alive); s.root.classList.toggle('dbmax', a.decibels >= R.decibelMax); s.root.classList.toggle('stun', a.stun > 0);
      s.key.textContent = a === nxt ? 'W' : a === prv ? 'Q' : '—';
    });
    E.assist.innerHTML = ''; E.assist.append(el('span', null, 'ASSIST '));
    for (let i = 0; i < R.assistPointsMax; i++) E.assist.append(el('i', { class: i < B.assist ? 'on' : '' }));
    // target
    const tgt = ag && BT.pickTarget(ag);
    E.enRoot.hidden = !tgt;
    if (tgt) {
      const en = E.en;
      en.name.textContent = tgt.rival ? tgt.def.agent.name : tgt.def.name; en.rank.textContent = tgt.rival ? 'RIVAL' : tgt.rank === 'boss' ? 'BOSS' : tgt.rank === 'elite' ? 'ELITE' : 'ENEMY'; en.rank.className = tgt.rival ? 'rival' : tgt.rank;
      tgt.hpLag += (tgt.hp - tgt.hpLag) * 0.12; if (tgt.hpLag < tgt.hp) tgt.hpLag = tgt.hp;
      en.hp.style.width = pct(tgt.hp, tgt.hpMax); en.lag.style.width = pct(tgt.hpLag, tgt.hpMax);
      en.daze.style.width = pct(tgt.daze, tgt.dazeMax); en.dazeBar.className = 'bar daze' + (tgt.stun > 0 ? ' stun' : '');
      en.stunx.textContent = tgt.stun > 0 ? `STUNNED · DMG ×${(R.stunMult + (tgt.rank === 'boss' ? 0.25 * tgt.chainsUsed : 0)).toFixed(2)} · ${tgt.chainsLeft} chain${tgt.chainsLeft === 1 ? '' : 's'} left` : '';
      en.anoms.innerHTML = '';
      for (const type in tgt.bu) {
        const v = tgt.bu[type]; if (v <= 0) continue;
        const A = D.ANOMALY[type], max = tgt.def.buMax * (tgt.buMul[type] || 1);
        en.anoms.append(el('div', { class: 'ab', title: A.name }, el('i', { style: { width: pct(v, max), background: A.color } })));
      }
      en.chips.innerHTML = '';
      const chip = (t, c) => en.chips.append(el('span', { class: 'chip', style: { color: c } }, t));
      if (tgt.anom) { const A = D.ANOMALY[tgt.anom.type]; chip(`${A.name.toUpperCase()} ${Math.ceil(tgt.anom.t)}s`, A.color); }
      if (tgt.scorched) chip('SCORCHED', '#ff8a3a');
      if (tgt.flinch > 0) chip('FLINCH', '#f4d35e');
      if (tgt.vuln > B.t) chip('VULNERABLE +25% DMG', '#ff5a5a');
      if (tgt.enhanced) chip('ETHER ENHANCED', '#c8ff3a');
      if (tgt.ether > 0) chip(`WHEEL ETHER ${tgt.ether}/3`, tgt.ether >= 3 ? '#ffffff' : '#c8ff3a');
      { const A = tgt.act, st = A && A.def.stance; if (st && A.t >= st[0] && A.t <= st[1]) chip('GUARD: COUNTERS HITS', '#ff7a3a'); }
      if (tgt.crashedUntil > B.t) chip('CRASHED', '#ffe060');
      if (tgt.rival) {
        const RV = B.rival;
        if (tgt.decibels >= R.decibelMax) chip('ULTIMATE READY', '#ff5ab0');
        if (tgt.energy >= tgt.def.kit.ex.cost) chip('EX READY', '#ffe98a');
        if (RV.aegis && RV.aegis.hp > 0) chip(`AEGIS ${U.fmt(RV.aegis.hp)}`, '#f4d35e');
        if (tgt.dodgeCharges <= 0) chip('NO DODGES', '#9ad8ff');
      }
      if (tgt.def.weak.length) chip('WEAK: ' + tgt.def.weak.map(w => D.ATTR[w].name).join(', '), '#9ad8ff');
      if (tgt.def.resist.length) chip('RES: ' + tgt.def.resist.map(w => D.ATTR[w].name).join(', '), '#888');
    }
    // top right
    const s = Math.floor(B.t); E.tm.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    E.wv.textContent = B.rival ? `PROXY CLASH · ${B.arena.name.toUpperCase()}` : `${B.arena.name.toUpperCase()} · WAVE ${B.wave + 1}/${B.waves.length}`;
    if (E.rv) {
      const RV = B.rival;
      for (const row of E.rv.rows) {
        const r = row.r;
        row.hp.style.width = pct(r.hp, r.hpMax); row.db.style.width = pct(r.decibels, R.decibelMax);
        row.root.classList.toggle('on', (RV.allOut ? !r.benched : RV.squad[RV.active] === r) && r.alive); row.root.classList.toggle('stun', r.stun > 0); row.root.classList.toggle('down', !r.alive); row.root.classList.toggle('dbmax', r.alive && r.decibels >= R.decibelMax);
      }
      E.rv.pips.innerHTML = ''; E.rv.pips.append(el('span', null, 'ASSIST '));
      for (let i = 0; i < R.assistPointsMax; i++) E.rv.pips.append(el('i', { class: i < RV.assist ? 'on' : '' }));
    }
    E.auto.classList.toggle('on', !!B.auto); E.auto.textContent = B.auto ? 'AUTO: ON' : 'AUTO: OFF';
    E.moveHint.textContent = B.auto ? 'She moves on her own' : (window.GAME && GAME.touch ? 'Drag to move' : '← ↑ ↓ → to move');
    // command buttons
    const qa = B.allOut ? B.squad.some(s => s.alive && s.launchedUntil > B.t) : ag && ag.launchedUntil > B.t;
    for (const [b, who] of [[E.cNext, nxt], [E.cPrev, prv]]) {
      const lbl = b.querySelector('.lbl'), base = b === E.cNext ? E.swapWord + ' ▶' : '◀ ' + E.swapWord;
      b.className = 'cmd pe'; lbl.textContent = base;
      if (!who) { b.classList.add('off'); continue; }
      if (th) { b.classList.add('assist'); if (!(th.flash === 'gold' && B.assist > 0)) b.classList.add('red'); lbl.textContent = th.flash === 'gold' && B.assist > 0 ? 'ASSIST' : 'DODGE'; }
      else if (qa) { b.classList.add('quick'); lbl.textContent = 'QUICK'; }
      else if (B.swapCd > 0 && !B.allOut) b.classList.add('off');
    }
    E.cdBar.style.width = B.swapCd > 0 ? pct(B.swapCd, BT.T.swapCd || 1) : '0%';
    if (ag) {
      E.cEx.className = 'cmd pe' + (ag.energy >= ag.def.kit.ex.cost ? ' ready' : ' off') + (ag.exCall ? ' assist' : '');
      const ultReady = ag.decibels >= R.decibelMax || (ag.id === 'yixuan' && ag.tp >= 120);
      E.cUlt.className = 'cmd pe ult' + (ultReady ? ' ready' : ' off');
    }
  };
  /* small HP/Daze bars over every enemy but the target */
  function floats(B) {
    const cam = BT.world.camera, W = innerWidth, H = innerHeight, ag = BT.active(), tgt = ag && BT.pickTarget(ag);
    let i = 0;
    for (const v of B.enemies) {
      if (!v.alive || v.spawnT > 0) continue;
      let f = floatPool[i]; if (!f) { f = { root: el('div', { class: 'hpfloat' }), hp: el('i'), dz: el('b') }; f.root.append(f.hp, f.dz); E.floats.append(f.root); floatPool.push(f); }
      i++;
      _v.set(v.x, v.height + 0.35 + v.airY, v.z).project(cam);
      f.root.style.display = _v.z > 1 ? 'none' : '';
      f.root.style.left = ((_v.x + 1) / 2 * W) + 'px'; f.root.style.top = ((1 - _v.y) / 2 * H) + 'px';
      f.hp.style.width = pct(v.hp, v.hpMax); f.dz.style.width = pct(v.daze, v.dazeMax); f.root.className = 'hpfloat' + (v === tgt ? ' focus' : '') + (v.rival ? ' rival' : '');
    }
    if (B.allOut) for (const a of BT.fielded()) {
      if (a === ag || !a.obj.visible) continue;
      let f = floatPool[i]; if (!f) { f = { root: el('div', { class: 'hpfloat' }), hp: el('i'), dz: el('b') }; f.root.append(f.hp, f.dz); E.floats.append(f.root); floatPool.push(f); }
      i++;
      _v.set(a.x, a.height + 0.35 + a.airY, a.z).project(cam);
      f.root.style.display = _v.z > 1 ? 'none' : '';
      f.root.style.left = ((_v.x + 1) / 2 * W) + 'px'; f.root.style.top = ((1 - _v.y) / 2 * H) + 'px';
      f.hp.style.width = pct(a.hp, a.hpMax); f.dz.style.width = pct(a.daze || 0, a.dazeMax || 1); f.root.className = 'hpfloat ally' + (a.stun > 0 ? ' stun' : '');
    }
    for (; i < floatPool.length; i++) floatPool[i].root.style.display = 'none';
  }
  window.HUD = HUD;
})();
