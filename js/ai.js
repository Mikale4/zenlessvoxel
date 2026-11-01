/* ============================================================================
   ai.js -- who does what, moment to moment.
     Agents:    the on-field Agent fights on her own: picks targets, closes
                distance, chains her basic combo, spends Energy on EX Specials,
                uses her core mechanics, and plans a dodge (or a block) for each
                attack she sees coming. A well-timed dodge is a Perfect Dodge.
     Enemies:   circle the Agent, take turns attacking (aggression tokens),
                telegraph their big hits with gold or red flashes.
     Commander: on AUTO, the game gives your commands for you.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, R = D.RULES;
  const { clamp, rnd, dist, ang, wrap, turn } = U;
  const B_ = () => BT.B, T_ = () => BT.T;

  /* ------------------------------------------------------- movement -- */
  function steer(e, tx, tz, speed, dt) {
    const dx = tx - e.x, dz = tz - e.z, L = Math.hypot(dx, dz);
    let wx = 0, wz = 0; if (L > 0.06) { const sp = Math.min(speed, L * 3.2); wx = dx / L * sp; wz = dz / L * sp; }
    const k = 1 - Math.exp(-dt * 8); e.vx += (wx - e.vx) * k; e.vz += (wz - e.vz) * k;
  }
  function physics(e, dt, damp) {
    const B = B_(), I = B.bounds;
    if (damp) { const d = Math.exp(-dt * 7); e.vx *= d; e.vz *= d; }
    e.x += e.vx * dt; e.z += e.vz * dt;
    // personal space: nobody stands inside anybody else
    const others = e.type === 'enemy' ? [...B.enemies, BT.active()] : B.enemies;
    for (const o of others) {
      if (!o || o === e || !o.alive || o.spawnT > 0 || (o.type === 'agent' && !o.obj.visible)) continue;
      const dx = e.x - o.x, dz = e.z - o.z, d = Math.hypot(dx, dz), min = (e.rad + o.rad) * (e.type !== o.type ? 0.92 : 1.05);
      if (d < min && d > 1e-4) { const push = (min - d) * (e.type === 'agent' ? 0.5 : 0.4); e.x += dx / d * push; e.z += dz / d * push; }
    }
    for (const ob of B.obstacles) { const dx = e.x - ob.x, dz = e.z - ob.z, d = Math.hypot(dx, dz), min = ob.r + e.rad; if (d < min && d > 1e-4) { e.x += dx / d * (min - d); e.z += dz / d * (min - d); } }
    e.x = clamp(e.x, I[0] + e.rad * 0.5, I[2] - e.rad * 0.5); e.z = clamp(e.z, I[1] + e.rad * 0.5, I[3] - e.rad * 0.5);
    const sp = Math.hypot(e.vx, e.vz); e.anim.speed = sp; e.anim.phase += sp * dt * 2.3;
    if (e.state === 'idle' || e.state === 'move') {
      if (sp <= 0.45) e.anim.state = 'idle';
      else if (e.type === 'enemy') e.anim.state = (Math.sin(e.face) * e.vx + Math.cos(e.face) * e.vz) / sp > 0.55 ? 'run' : 'strafe';   // side-steps and backing off
      else e.anim.state = 'run';
    }
  }
  BT.physics = physics;

  /* --------------------------------------------------------- targeting -- */
  BT.pickTarget = a => {
    const B = B_(); if (!B) return null;
    if (B.focus && B.focus.alive) return B.focus;
    let best = null, bv = -1e9;
    for (const v of B.enemies) {
      if (!v.alive || v.spawnT > 0) continue;
      const d = dist(a, v);
      const val = -d + (v.stun > 0 ? 4 : 0) + (v.rank === 'boss' ? 2 : v.rank === 'elite' ? 1 : 0) + (v === a.lastTgt ? 1.5 : 0) - v.hp / v.hpMax;
      if (val > bv) { bv = val; best = v; }
    }
    a.lastTgt = best; return best;
  };

  /* ------------------------------------------------------------ Agents -- */
  BT.thinkAgents = dt => {
    const B = B_(), a = BT.active();
    for (const s of B.squad) if (s.state === 'dead' && s.obj.visible) { s.anim.t += dt; physics(s, dt, true); }
    if (!a || !a.alive) return;
    a.stT += dt;
    // carry out defensive plans (dodges, blocks) made when attacks were announced
    for (const th of B.threats) if (th.target === a && th.plan && !th.plan.done && B.t >= th.plan.at) { th.plan.done = true; execPlan(a, th); }
    switch (a.state) {
      case 'hit': a.hitT -= dt; a.anim.t += dt; physics(a, dt, true); if (a.hitT <= 0) { a.state = 'idle'; a.anim.state = 'idle'; } return;
      case 'down': a.downT -= dt; a.anim.t += dt; physics(a, dt, true); if (a.downT <= 0) { a.state = 'getup'; a.anim.state = 'getup'; a.anim.t = 0; a.getupT = 0.45; } return;
      case 'getup': a.getupT -= dt; a.anim.t += dt; physics(a, dt, true); if (a.getupT <= 0) { a.state = 'idle'; a.anim.state = 'idle'; } return;
      case 'dodge': a.anim.t += dt; physics(a, dt, false); { const d = Math.exp(-dt * 5); a.vx *= d; a.vz *= d; } return;
      case 'win': return;
    }
    if (a.act) {
      BT.stepAct(a, dt); physics(a, dt, true);
      const A = a.act;
      if (A && A.kind === 'basic' && A.t >= (A.def.cancel || A.dur)) decide(a, dt, true);
      return;
    }
    if (a.guardUntil > B.t) { a.anim.state = 'guard'; a.state = 'guard'; physics(a, dt, true); if (a.queue.length) { a.guardUntil = 0; a.state = 'idle'; } else return; }
    else if (a.state === 'guard') { a.state = 'idle'; a.anim.state = 'idle'; }
    if (a.gap > 0) { a.gap -= dt; physics(a, dt, true); return; }
    decide(a, dt, false);
    physics(a, dt, !a.moving);
  };

  function decide(a, dt, fromCombo) {
    const B = B_(), T = T_(), K = a.def.kit;
    a.moving = false;
    if (a.queue.length) {
      const q = a.queue[0]; if (q.delay > 0) { q.delay -= dt; return; }
      a.queue.shift();
      if (q.def.cost && !q.free && a.energy < q.def.cost) return;
      startSkill(a, q.def, q.kind, q.tgt || BT.pickTarget(a), q); return;
    }
    if (a.counterUntil > B.t) { a.counterUntil = 0; startSkill(a, K.counter, 'counter', a.counterTgt && a.counterTgt.alive ? a.counterTgt : BT.pickTarget(a)); return; }
    const tgt = BT.pickTarget(a);
    if (!tgt) { if (fromCombo) return; a.moving = true; steer(a, 0, 3, a.st.speed * 0.5, dt); return; }
    // keep out of miasma pools
    for (const zn of B.zones) if (zn.live && Math.hypot(a.x - zn.x, a.z - zn.z) < zn.r + 0.3) { const d = ang(zn, a); a.moving = true; steer(a, a.x + Math.sin(d) * 3, a.z + Math.cos(d) * 3, a.st.speed, dt); a.face = turn(a.face, ang(a, tgt), 1 - Math.exp(-10 * dt)); return; }
    // Burnice keeps her distance: a hop back when an enemy crowds her
    if (!fromCombo && a.def.ai.kite && a.def.kit.hop && (a.cds.hop || 0) <= B.t) {
      const close = B.enemies.find(v => v.alive && v.spawnT <= 0 && dist(a, v) - v.rad < a.def.ai.kite);
      if (close && Math.random() < 0.6) { a.cds.hop = B.t + rnd(2.2, 3.5); startSkill(a, a.def.kit.hop, 'move', close); return; }
    }
    const c = choose(a, tgt, fromCombo); if (!c) return;
    const reach = (c.def.reach || 1.6), d = dist(a, tgt) - tgt.rad;
    if (d > reach) {
      if (fromCombo) return;
      if (d > 4.6 && K.dash && c.kind === 'basic' && (a.cds.dash || 0) <= B.t) { a.cds.dash = B.t + 1.5; startSkill(a, K.dash, 'dash', tgt); return; }
      a.moving = true;
      const want = Math.max(0.6, Math.min(reach - 0.3, c.def.range || a.def.ai.range));
      const ax = ang(tgt, a); steer(a, tgt.x + Math.sin(ax) * (want + tgt.rad), tgt.z + Math.cos(ax) * (want + tgt.rad), a.st.speed, dt);
      a.face = turn(a.face, ang(a, tgt), 1 - Math.exp(-10 * dt));
      return;
    }
    if (fromCombo && c.kind !== 'basic') return;  // combos only cancel into the next basic
    startSkill(a, c.def, c.kind, tgt, c);
  }

  function choose(a, tgt, fromCombo) {
    const B = B_(), T = T_(), K = a.def.kit, id = a.id;
    const exOk = a.energy >= K.ex.cost;
    if (!fromCombo) {
      if (a.exCall && exOk) { a.exCall = false; return pickEx(a); }
      if (T.autoUlt && !B.auto && (a.decibels >= R.decibelMax || (id === 'yixuan' && a.tp >= 120))) { if (BT.cmdUlt(a)) return null; }
      if (id === 'yixuan' && a.auric > 0) return { def: K.auric, kind: 'auric' };
      if (id === 'burnice' && a.nitro && a.heat >= 20 && (a.cds.hold || 0) <= B.t && (!tgt.scorched || Math.random() < 0.25)) return { def: K.hold, kind: 'hold' };
      if (id === 'aria') {
        if (a.noIce && Math.random() < 0.7) return { def: K.noIce, kind: 'special' };
        const near = B.fandom.filter(f => Math.hypot(f.x - a.x, f.z - a.z) < 7).length;
        if ((a.cds.charged || 0) <= B.t && (near >= 2 || a.cheer > 0 || (tgt.anom && Math.random() < 0.45))) return { def: K.charged, kind: 'charged' };
      }
      if (id === 'caesar' && B.assist >= 4 && (a.cds.deadEnd || 0) <= B.t && BT.enemiesIn('circle', a.x, a.z, 3.6, 0).length >= 2 && Math.random() < 0.25) return { def: K.deadEnd, kind: 'core' };
      if (exOk && (a.energy >= a.def.energyMax * 0.85 || tgt.stun > 0 || Math.random() < 0.1)) return pickEx(a);
      if ((a.cds.special || 0) <= B.t && Math.random() < 0.3) return { def: K.special, kind: 'special' };
    }
    if (B.t - a.lastBasic > 0.9) a.combo = 0;
    // ranged fighters skip their close-range combo steps when the target is far
    let step = K.basic[a.combo % K.basic.length];
    if (a.def.ai.range > 2.5 && (step.reach || 1.6) < 2.2 && dist(a, tgt) - tgt.rad > 2.6) { a.combo++; step = K.basic[a.combo % K.basic.length]; }
    return { def: step, kind: 'basic' };
  }
  function pickEx(a) {
    const K = a.def.kit;
    if (a.id === 'yixuan' && Math.random() < 0.4) return { def: K.exAlt, kind: 'ex' };
    return { def: K.ex, kind: 'ex' };
  }
  function startSkill(a, def, kind, tgt, opts) {
    const B = B_(), K = a.def.kit;
    if (!def) return;
    if (kind === 'core' && def === K.deadEnd) { if (B.assist < 1) return; B.assist -= 1; a.cds.deadEnd = B.t + 8; BT.battleSpirit(a); }
    if (tgt) a.face = ang(a, tgt);
    const A = BT.startAct(a, def, { tgt, kind, free: opts && opts.free, aegis: opts && opts.aegis });
    BT.onSkillStart(a, def, A);
    if (kind === 'basic') { a.combo++; a.lastBasic = B.t + def.dur; }
    else a.combo = 0;
    if (kind === 'special') a.cds.special = B.t + (def.cd || 3.5);
    if (kind === 'hold') a.cds.hold = B.t + 4;
    if (kind === 'charged') a.cds.charged = B.t + 2.5;
    if (!['basic', 'dash', 'hold', 'core'].includes(kind) || def === K.hold) {
      if (['ex', 'ex2', 'followup', 'chain', 'quick', 'counter', 'auric', 'eruption', 'special'].includes(kind) || def === K.hold) BT.log(`${a.def.short}: ${def.name}`, kind === 'ex' || kind === 'ex2' ? 'ex' : 'skill');
      if (kind === 'ex' || kind === 'ex2') BT.callout(def.name.replace(/^EX Special Attack: /, ''), 'skill', a.def.short + ' · EX');
    }
    // EX follow-ups the way the kits chain them
    const r = Math.random();
    if (kind === 'ex' && def === K.ex) {
      if (a.id === 'burnice' && a.energy >= K.ex2.cost && r < 0.6) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
      if (a.id === 'aria' && a.energy >= K.ex2.cost && r < 0.65) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
      if (a.id === 'yixuan' && a.energy >= K.ex2.cost && r < 0.6) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
    }
    if (a.id === 'burnice' && (kind === 'chain' || kind === 'followup' || def === K.hold) && a.energy >= K.ex2.cost && r < 0.5) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
    if (kind === 'counter' && a.id === 'aria') a.combo = 2;   // Slide-Shift Variation flows into the 3rd Sweet Melody
    a.gap = kind === 'basic' ? 0 : rnd(0.04, 0.18);
  }
  BT.startSkill = startSkill;

  /* Caesar holds a guard stance after Shockwave Shield Bash and Parry Counter */
  BT.hooks.actEnd = (a, A) => {
    const B = B_();
    if (A.def.guardAfter && a.id === 'caesar') { a.guardUntil = B.t + Math.min(A.def.guardAfter, 0.9); }
  };

  /* ---------------------------------------------------- defence plans --
     When an attack is announced, the on-field Agent decides once how to meet
     it: a dodge (timed well, it is a Perfect Dodge), a block, or nothing. */
  BT.planDefense = (ag, th) => {
    const B = B_(), T = T_();
    if (!ag || th.target !== ag || th.plan || !ag.alive || th.assist) return;
    const AI = ag.def.ai, imp = th.impactAt, K = ag.def.kit;
    if (ag.id === 'caesar' && th.flash !== 'red' && !th.hazard && (ag.cds.special || 0) <= imp - 0.4 && Math.random() < AI.guard) { th.plan = { type: 'block', at: imp - rnd(0.05, 0.17) }; return; }
    if (ag.id === 'yixuan' && th.flash && !th.hazard && ag.energy >= K.ex.cost && Math.random() < 0.25) { th.plan = { type: 'inkblock', at: imp - rnd(0.05, 0.2) }; return; }
    const p = AI.dodge * (th.heavy ? 0.95 : 0.45) * (th.flash ? 1.1 : 0.9) * (th.hazard ? 1.3 : 1);
    if (Math.random() >= p) { th.plan = { type: 'none' }; return; }
    const q = clamp(AI.reflex * T.reflex, 0.03, 0.95), r = Math.random();
    const off = r < q ? rnd(0.03, Math.max(0.05, T.perfectWin - 0.02)) : r < q + (1 - q) * 0.75 ? rnd(T.perfectWin + 0.03, 0.34) : rnd(0.5, 0.7);
    th.plan = { type: 'dodge', at: imp - off };
  };
  function execPlan(a, th) {
    const B = B_(), K = a.def.kit;
    if (!['idle', 'act', 'guard', 'move'].includes(a.state) || th.done) return;
    if (a.act) {
      const A = a.act, inv = A.def.inv;
      if (['ult', 'ult2', 'chain', 'assist'].includes(A.kind)) return;
      if (inv && A.t + (th.impactAt - B.t) >= inv[0] && A.t + (th.impactAt - B.t) <= inv[1]) return;
    }
    if (th.plan.type === 'dodge') doDodge(a, th.e);
    else if (th.plan.type === 'block') { a.act = null; startSkill(a, K.special, 'special', th.e && th.e.alive ? th.e : BT.pickTarget(a)); }
    else if (th.plan.type === 'inkblock') { a.act = null; startSkill(a, K.ex, 'ex', th.e && th.e.alive ? th.e : BT.pickTarget(a)); }
  }
  function doDodge(a, e) {
    const B = B_(), T = T_();
    if (a.dodgeCharges <= 0) return false;
    a.dodgeCharges--; if (a.dodgeCharges <= 0) a.dodgeCd = T.dodgeCd;
    a.act = null; a.queue = a.queue.filter(q => q.kind === 'followup');
    a.dodge = { t0: B.t, until: B.t + 0.38 };
    a.state = 'dodge'; a.anim.state = 'dodge'; a.anim.t = 0; a.stT = 0;
    const away = e && e.x != null ? ang(e, a) : a.face + Math.PI, side = Math.random() < 0.5 ? 1 : -1;
    a.anim.side = side;
    const dir = away + side * 1.1;
    a.vx = Math.sin(dir) * 8; a.vz = Math.cos(dir) * 8;
    SFX.play('dodge'); FX.burst(a.x, 0.3, a.z, 6, { col: [0xffffff, 0x9ad8ff], speed: 2, size: 0.08, life: 0.25, g: 0 });
    return true;
  }
  BT.doDodge = doDodge;

  /* ------------------------------------------- Perfect Block, Retaliation -- */
  BT.perfectBlock = (ag, e, h) => {
    const B = B_(), K = ag.def.kit, viaEx = ag.act && ag.act.def === K.ex;
    SFX.play('parry'); B.freeze = Math.max(B.freeze, 0.1);
    BT.callout('PERFECT BLOCK', 'perfect', ag.def.short);
    FX.glow(ag.x, 1.2, ag.z, 2.2, 0xfff0a0, 0.3, { size1: 3.6 });
    if (e && e.alive && e.x != null) { BT.addDaze(ag, e, ag.st.impact * 3); if (e.stun <= 0 && e.rank !== 'boss') BT.interrupt(e, 0.6); }
    BT.gainDecibels(ag, 150);
    if (ag.id === 'caesar') {
      ag.impactUp = B.t + 3; BT.battleSpirit(ag);
      ag.act = null; ag.queue.unshift(viaEx ? { def: K.osb, kind: 'ex2', free: true, tgt: e, delay: 0.05 } : { def: K.thrust, kind: 'special', tgt: e, delay: 0.05 });
      BT.log(`Caesar: Perfect Block! ${viaEx ? 'Overpowered Shield Bash (free)' : 'Roaring Thrust'}`, 'perfect');
    } else if (ag.id === 'yixuan') { BT.gainEnergy(ag, 10, true); BT.log('Yixuan: Perfect Block with Ink Manifestation (+10 Adrenaline).', 'perfect'); }
  };
  BT.guardBlock = (ag, e, h) => {
    const B = B_(), K = ag.def.kit;
    const soft = Object.assign({}, h, { mult: h.mult * 0.6, launch: false, heavy: false });
    ag.guardUntil = 0;
    const saveAct = ag.act; ag.act = { def: { dr: 0.001 }, t: 0, kind: 'guard' }; BT.hurtAgent(ag, e, soft); ag.act = saveAct;
    if (!ag.alive) return;
    ag.vx += Math.sin(ang(e, ag)) * 2.5; ag.vz += Math.cos(ang(e, ag)) * 2.5;
    BT.callout('RETALIATION', 'perfect', ag.def.short); SFX.play('parry');
    ag.impactUp = B.t + 3; BT.battleSpirit(ag);
    if (ag.energy >= K.osb.cost) ag.queue.unshift({ def: K.osb, kind: 'ex2', tgt: e, delay: 0.05, aegis: true });
    else ag.queue.unshift({ def: K.thrust, kind: 'special', tgt: e, delay: 0.05 });
  };

  /* ------------------------------------------------------------ Enemies -- */
  function attackDur(def) { if (def.dur) return def.dur; const last = Math.max(...def.hits.map(h => h.t)); def.dur = last + (def.rec != null ? def.rec : 0.55); return def.dur; }
  const TELE_COL = { molotov: 0xff7a2a, miasmaBurst: 0xd040ff, etherBurst: 0xc8ff3a, coralSpike: 0xff4a4a };
  function startEnemyAttack(e, def, ag) {
    const B = B_(), T = T_(), ex = window.CHOREO && CHOREO.ext;
    attackDur(def);
    const A = BT.startAct(e, def, { tgt: ag, kind: 'enemy' });
    A.threats = []; A.flashes = []; A.tele = []; A.rain = {}; A.teleFollow = [];
    A.dir = ang(e, ag); A.ox = e.x; A.oz = e.z;
    const haste = e.phase === 2 && e.def.phase2 && e.def.phase2.haste; if (haste) A.speed = haste;
    const sp = A.speed || 1;
    e.cds[def.name] = B.t + def.cd / T.aggro; e.atkCd = (def.dur / sp + rnd(e.def.atkGap[0], e.def.atkGap[1])) / T.aggro;
    if (e.mv) e.mv.dart = 0;
    const I = B.bounds, inX = x => clamp(x, I[0] + 1, I[2] - 1), inZ = z => clamp(z, I[1] + 1, I[3] - 1);
    def.hits.forEach((h, i) => {
      let impact = B.t + h.t / sp;
      if (h.shape === 'proj') impact += dist(e, ag) / (h.speed || 12);
      const col = h.flash === 'gold' ? 0xffd04a : TELE_COL[h.fx] || 0xff3a4a, dur = h.t / sp;
      if (h.shape === 'rain') {
        // the first point lands on the Agent, the rest within `spread` of her (a single point with a spread lands anywhere in it)
        const n = h.n || 4, spread = h.spread != null ? h.spread : 3.5, pts = [];
        for (let k = 0; k < n; k++) pts.push(k === 0 && !(n === 1 && h.spread) ? [ag.x, ag.z] : [inX(ag.x + rnd(-spread, spread)), inZ(ag.z + rnd(-spread, spread) * 0.85)]);
        A.rain[i] = pts; for (const [x, z] of pts) A.tele.push(FX.telegraph(x, z, h.r || 1.5, col, dur));
      } else if (h.shape === 'circle' && h.at === 'ahead') {
        A.tele.push(FX.telegraph(A.ox + Math.sin(A.dir) * h.d, A.oz + Math.cos(A.dir) * h.d, h.r || 1.3, col, dur));
      } else if (h.shape === 'line' || (h.shape === 'beam' && !def.sweep && !A.teleFollow.length)) {
        const len = h.len || 8, yaw = h.yaw || 0;
        const obj = ex ? ex.teleRect(e.x, e.z, A.dir + yaw, len, (h.r || 1.2) * 2, col, dur) : FX.telegraph(e.x + Math.sin(A.dir) * len / 2, e.z + Math.cos(A.dir) * len / 2, len / 2, col, dur, { arc: 0.32, a0: -0.16 - Math.PI / 2, yaw: A.dir });
        A.tele.push(obj); if (ex) A.teleFollow.push({ obj, yaw });
      } else if (h.shape === 'beam' && def.sweep && i === 0) {
        const len = h.len || 10, span = def.sweep[1] - def.sweep[0], mid = (def.sweep[0] + def.sweep[1]) / 2;
        const obj = FX.telegraph(e.x, e.z, len, col, dur, { arc: span + 0.2, a0: -(span + 0.2) / 2 - Math.PI / 2, yaw: A.dir + mid });
        A.tele.push(obj); A.teleFollow.push({ obj, yaw: mid });
      } else if (h.shape === 'circle' && h.at === 'self' && (h.r || 0) >= 2.4) A.tele.push(FX.telegraph(e.x, e.z, h.r, col, dur));
      const th = { e, hit: h, target: ag, impactAt: impact, flashAt: h.flash ? Math.max(B.t, impact - T.flashLead) : null, flash: h.flash || null, heavy: !!h.heavy, launch: !!h.launch, A, done: false };
      B.threats.push(th); A.threats.push(th);
      if (h.flash) A.flashes.push({ at: th.flashAt, color: h.flash, th });
      BT.planDefense(ag, th);
    });
    if (e.rank !== 'minion') BT.log(`${e.def.name}: ${def.name}${def.hits.some(h => h.flash === 'red') ? ' (red flash)' : def.hits.some(h => h.flash) ? ' (gold flash)' : ''}`, 'enemy');
  }
  BT.startEnemyAttack = startEnemyAttack;
  /* would hit h reach the Agent (with `pad` extra metres of slack)? */
  function reaches(e, h, A, ag, pad) {
    const dir = h.shape === 'beam' ? A.dir + (h.yaw || 0) : e.face, r = (h.r || 1.8) + pad, d = dist(e, ag);
    switch (h.shape) {
      case 'circle': { const c = circleAt(e, h, A); return Math.hypot(ag.x - c[0], ag.z - c[1]) <= r + ag.rad; }
      case 'rain': return (A.rain[A.def.hits.indexOf(h)] || []).some(([x, z]) => Math.hypot(ag.x - x, ag.z - z) <= r + ag.rad * 0.5);
      case 'beam': { const dx = ag.x - e.x, dz = ag.z - e.z, along = dx * Math.sin(dir) + dz * Math.cos(dir), side = Math.abs(dx * Math.cos(dir) - dz * Math.sin(dir)); return along > -0.6 - pad && along < (h.len || 8) + ag.rad + pad && side <= r + ag.rad; }
      case 'line': {                                   // a charge: anywhere along the path it has run so far
        const S = A.chargeFrom; if (!S) return d <= r + ag.rad + e.rad + 0.6;
        const ex = e.x + Math.sin(A.dir) * e.rad, ez = e.z + Math.cos(A.dir) * e.rad, vx = ex - S.x, vz = ez - S.z, L2 = vx * vx + vz * vz;
        const k = L2 > 1e-6 ? clamp(((ag.x - S.x) * vx + (ag.z - S.z) * vz) / L2, 0, 1) : 0;
        return Math.hypot(ag.x - (S.x + vx * k), ag.z - (S.z + vz * k)) <= r + ag.rad + 0.3;
      }
      default: { const da = Math.abs(wrap(ang(e, ag) - dir)); return d <= r + ag.rad + e.rad * 0.5 && (da <= (h.arc || 120) * Math.PI / 360 + 0.35 + (pad ? 0.6 : 0) || d < e.rad + ag.rad + 0.3); }
    }
  }
  function circleAt(e, h, A) {
    if (h.at === 'front') return [e.x + Math.sin(e.face) * (e.rad + 0.8), e.z + Math.cos(e.face) * (e.rad + 0.8)];
    if (h.at === 'ahead') return [A.ox + Math.sin(A.dir) * h.d, A.oz + Math.cos(A.dir) * h.d];
    return [e.x, e.z];
  }
  BT.enemyHit = (e, h, A) => {
    const B = B_(), ag = BT.active();
    const th = A.threats && A.threats.find(t => t.hit === h && !t.done);
    if (!ag || !ag.alive || !ag.obj.visible) { if (th) th.done = true; return; }
    if (h.shape === 'proj') { BT.spawnEnemyProj(e, h, th); return; }
    const dir = e.face, r = h.r || 1.8;
    // effects (a move's own crescents and props are drawn by its choreography)
    if (h.shape === 'arc' && !h.noSlash) FX.slash(e.x, 1.1 * (e.height / 1.9), e.z, Math.min(3.6, r), dir, h.flash === 'red' ? 0xff4a5a : 0xffffff, { arc: (h.arc || 120) * Math.PI / 180, width: 0.4 });
    if (h.shape === 'arc' && h.fx) FX.named(h.fx, { x: e.x, z: e.z, yaw: dir, r, fromX: e.x, fromZ: e.z, y: e.height * 0.5 });
    if (h.shape === 'circle') { const [cx, cz] = circleAt(e, h, A); FX.named(h.fx || 'quake', { x: cx, z: cz, r, yaw: dir }); }
    if (h.shape === 'rain') for (const [x, z] of (A.rain[A.def.hits.indexOf(h)] || [])) FX.named(h.fx || 'explode', { x, z, r: h.r || 1.5, attr: 'ether' });
    SFX.play(h.heavy ? 'heavy' : h.fx === 'molotov' ? 'fire' : 'swing');
    if (h.heavy) B.cam.shake = Math.max(B.cam.shake, e.rank === 'boss' ? 0.3 : 0.15);
    // does it reach the Agent?
    const inRange = reaches(e, h, A, ag, 0);
    // a Perfect Dodge counts if the dodge started on time, even if it carried her clear
    const perfectish = ag.dodge && B.t <= ag.dodge.until && !ag.dodge.perfectDone && B.t - ag.dodge.t0 <= T_().perfectWin + 0.02 && reaches(e, h, A, ag, 3);
    B.eh.swing++;
    if (inRange || perfectish || (th && th.assist)) BT.incoming(e, h, th, ag);
    else { B.eh.out++; if (th) th.done = true; }
  };
  /* how an enemy moves between attacks (data.js ai.style):
       melee    closes in and edges round you; Raiders back off now and then to charge
       ranged   holds its distance, backs away when you close in, drifts sideways
       float    the same, gliding
       boxer    bobs in and out at punching range with quick sidesteps
       stalker  circles warily at a distance, then darts in to strike */
  function enemyMove(e, ag, dt, idx) {
    const B = B_(), d = dist(e, ag), AI = e.def.ai || {}, style = AI.style || 'melee';
    const M = e.mv || (e.mv = { dir: idx % 2 ? 1 : -1, t: rnd(1, 2.5), hop: rnd(0.4, 1), back: B.t + rnd(AI.retreat ? AI.retreat[0] : 99, AI.retreat ? AI.retreat[1] : 99), dart: 0 });
    M.t -= dt; if (M.t <= 0) { M.t = rnd(1.4, 3); if (Math.random() < 0.35) M.dir = -M.dir; }
    const near = e.def.range + ag.rad + e.rad * 0.6;
    let want = near, orbit = 0, sp = e.def.speed;
    switch (style) {
      case 'ranged': case 'float':
        want = (AI.keep || e.def.range) + ag.rad; orbit = 0.45 * M.dir;
        if (d < (AI.flee || want * 0.5) + ag.rad) sp *= 1.15;
        break;
      case 'boxer':
        want = (AI.keep || 2.2) + ag.rad; orbit = 0.6 * M.dir; M.hop -= dt;
        if (M.hop <= 0 && Math.abs(d - want) < 1.2) { M.hop = rnd(0.45, 0.9); const s = Math.random() < 0.5 ? 1 : -1, a = ang(e, ag) + s * Math.PI / 2; e.vx += Math.sin(a) * 4.5; e.vz += Math.cos(a) * 4.5; }
        break;
      case 'stalker':
        want = (AI.keep || 3.6) + ag.rad; orbit = 0.8 * M.dir; sp *= 0.55;
        break;
      default:
        orbit = Math.abs(d - want) < 0.7 ? 0.25 * M.dir : 0;
    }
    if (M.dart > B.t) { want = near; orbit = 0; sp = e.def.speed * 1.35; }                // darting in for a close-range move
    if (AI.retreat && B.t >= M.back) { M.back = B.t + rnd(AI.retreat[0], AI.retreat[1]); M.away = B.t + 1.4; }
    if (M.away > B.t) { want = 6.5; orbit = 0.2 * M.dir; sp *= 1.2; }                     // backing off for a long-range charge
    // spread the pack around the Agent so they do not all queue on one side
    const a0 = ang(ag, e) + (idx % 2 ? 0.3 : -0.3) * (idx ? 1 : 0) + orbit;
    const tx = ag.x + Math.sin(a0) * want, tz = ag.z + Math.cos(a0) * want;
    const spd = sp * (d > want + 2 ? 1 : style === 'melee' ? 0.6 : 0.5);
    if (Math.hypot(tx - e.x, tz - e.z) > 0.3) steer(e, tx, tz, spd, dt); else steer(e, e.x, e.z, 0, dt);
    e.face = turn(e.face, ang(e, ag), 1 - Math.exp(-6 * dt));
  }
  BT.thinkEnemies = dt => {
    const B = B_(), T = T_(), ag = BT.active();
    // how many enemies may be swinging at once
    const minionLimit = Math.max(1, Math.round(2 * T.aggro));
    let minionsActing = B.enemies.filter(v => v.alive && v.act && v.rank === 'minion').length;
    const ex = window.CHOREO && CHOREO.ext;
    B.enemies.forEach((e, idx) => {
      if (!e.alive || e.spawnT > 0) return;
      if (ex) ex.think(e, dt);
      if (e.stun > 0) { physics(e, dt, true); return; }
      if (e.state === 'hit') { e.hitT -= dt; e.anim.t += dt; physics(e, dt, true); if (e.hitT <= 0) { e.state = 'idle'; e.anim.state = 'idle'; } return; }
      if (e.act) {
        const A = e.act;
        BT.stepAct(e, dt);
        if (A.flashes) for (const f of A.flashes) if (!f.done && B.t >= f.at) {
          f.done = true; const p = new THREE.Vector3(); BT.sock(e, 'head', p);
          FX.glow(p.x, p.y + 0.2, p.z, 1.2, f.color === 'red' ? 0xff3a3a : 0xffd04a, 0.35, { size1: 3.2, depthTest: false });
          FX.glow(p.x, p.y + 0.2, p.z, 0.5, 0xffffff, 0.25, { size1: 1.6, depthTest: false });
          SFX.play(f.color === 'red' ? 'flashRed' : 'flashGold'); if (BT.hooks.flash) BT.hooks.flash(f.color, f.th);
        }
        physics(e, dt, true);
        return;
      }
      if (!ag || !ag.alive || !ag.obj.visible) { steer(e, e.x, e.z, 0, dt); physics(e, dt, false); return; }
      e.atkCd -= dt;
      enemyMove(e, ag, dt, idx);
      if (e.atkCd <= 0 && B.phase === 'fight' && !B.cutin) {
        if (e.rank === 'minion' && minionsActing >= minionLimit) { e.atkCd = rnd(0.3, 0.8); }
        else {
          const d = dist(e, ag) - ag.rad - e.rad * 0.5, M = e.mv || {};
          const forced = ex && ex.forced ? ex.forced(e) : null;
          // a stalker sometimes darts in for its close-range moves instead of striking from where it is
          if (!forced && (e.def.ai || {}).style === 'stalker' && !(M.dart > B.t) && d > 2.8 && Math.random() < 0.5) { M.dart = B.t + 1.6; e.atkCd = 0.05; }
          const darting = M.dart > B.t;
          const opts = (forced ? [forced] : e.def.attacks).filter(k => (forced || (e.cds[k.name] || 0) <= B.t) && (!k.ph || k.ph === e.phase) && (!k.phase || k.phase <= e.phase)
            && k.reach >= d && (!k.minReach || d >= k.minReach) && (!darting || k.reach <= 3) && (!ex || forced || ex.allowed(e, k)));
          if (opts.length) {
            let tot = opts.reduce((s, k) => s + k.w, 0), r = Math.random() * tot, pick = opts[0];
            for (const k of opts) { r -= k.w; if (r <= 0) { pick = k; break; } }
            startEnemyAttack(e, pick, ag); if (e.rank === 'minion') minionsActing++;
          }
        }
      }
      physics(e, dt, false);
    });
    // hazards that strike like attacks (falling stage lights)
    for (const th of B.threats) {
      if (!th.hazard || th.done || B.t < th.impactAt) continue;
      th.done = true; const hz = th.hazard, a = BT.active();
      FX.named('explode', { x: hz.x, z: hz.z, r: hz.r, attr: 'ether' }); SFX.play('boom'); B.cam.shake = Math.max(B.cam.shake, 0.35);
      BT.log('A stage light rig comes crashing down!', 'hazard');
      for (const v of BT.enemiesIn('circle', hz.x, hz.z, hz.r, 0)) BT.hurtEnemy(v, Math.round(v.hpMax * (v.rank === 'minion' ? 0.08 : 0.02)), { attr: 'physical', src: a });
      if (a && a.alive && Math.hypot(a.x - hz.x, a.z - hz.z) <= hz.r + a.rad + (a.dodge ? 2.5 : 0)) {
        const src = { atk: a.hpMax * 0.1 * (794 + a.st.def) / 794 / T.enemyDmg, def: { name: 'Stage light' }, x: hz.x, z: hz.z, rad: 0, alive: true };
        BT.incoming(src, { mult: 100, heavy: true, launch: true, flash: 'red' }, th, a);
      }
    }
    B.threats = B.threats.filter(th => !th.done && B.t < th.impactAt + 1.5);
  };

  /* ----------------------------------------------------------- Commander --
     AUTO: the game gives your commands. Assists on flashes, Quick Assists,
     Chain picks, Ultimates at good moments, and a rotation so everybody gets
     field time. */
  BT.bestChain = () => {
    const B = B_(), C = B.chain; if (!C) return 0;
    let best = 0, bv = -1e9;
    C.opts.forEach((a, i) => {
      const v = C.tgt; let s = Math.random() * 0.5;
      if (a.decibels >= R.decibelMax) s += 1.5;
      if (BT.resMult(v, a.def.attr) > 1) s += 1;
      if (a.id === 'burnice' && !v.scorched) s += 0.8;
      if (a.id === 'aria' && v.anom) s += 0.8;
      if (a.id === 'caesar' && !(B.aegis && B.aegis.hp > 0)) s += 0.7;
      if (a.id === 'yixuan') s += 0.4;
      if (s > bv) { bv = s; best = i; }
    });
    return best;
  };
  BT.thinkCommander = dt => {
    const B = B_(), T = T_(), ag = BT.active(); if (!ag) return;
    const C = B.cmdr || (B.cmdr = { next: 0, rot: B.t + rnd(10, 15), qa: 0 });
    if (B.chain) { if (!C.chainAt) C.chainAt = B.real + rnd(0.45, 0.9); if (B.real >= C.chainAt) { C.chainAt = 0; BT.chainPick(BT.bestChain()); } return; }
    C.chainAt = 0;
    if (B.cutin || !ag.alive) return;
    // Assists on flashes the on-field Agent is not going to Perfect Dodge herself
    const th = BT.assistThreat();
    if (th && th.cmdAt == null) {
      const self = th.plan && th.plan.type === 'dodge' && th.impactAt - th.plan.at <= T.perfectWin;
      th.cmdAt = !self && Math.random() < 0.6 ? Math.min(th.impactAt - 0.04, B.t + rnd(0.08, 0.32)) : Infinity;
    }
    if (th && B.t >= th.cmdAt) { th.cmdAt = Infinity; BT.cmdSwap(1); return; }
    // Quick Assist when launched
    if (ag.launchedUntil > B.t) { if (!C.qa) C.qa = B.t + rnd(0.15, 0.35); if (B.t >= C.qa) { C.qa = 0; BT.cmdSwap(1); } return; }
    C.qa = 0;
    // Ultimates when they will count
    if (B.t >= C.next) {
      C.next = B.t + 0.4;
      const tgt = BT.pickTarget(ag), worth = tgt && (tgt.stun > 0 || tgt.rank === 'boss' || B.enemies.filter(v => v.alive).length >= 3 || tgt.rank === 'elite');
      if (worth && !(ag.act && ['chain', 'ult', 'ult2', 'assist'].includes(ag.act.kind))) {
        if (ag.decibels >= R.decibelMax || (ag.id === 'yixuan' && ag.tp >= 120)) { BT.cmdUlt(ag); return; }
        const o = B.squad.find(s => s.alive && s !== ag && (s.decibels >= R.decibelMax || (s.id === 'yixuan' && s.tp >= 120)));
        if (o && tgt.stun > 0 && !BT.assistThreat()) { BT.cmdUlt(o); return; }
      }
    }
    // rotate so everyone gets the field
    if (B.t >= C.rot && !BT.assistThreat() && B.swapCd <= 0 && !(ag.act && ['ult', 'ult2', 'chain', 'ex', 'ex2', 'assist', 'followup'].includes(ag.act.kind))) {
      C.rot = B.t + rnd(9, 15);
      const o = B.squad.filter(s => s.alive && s !== ag).sort((x, y) => y.energy - x.energy)[0];
      if (o && (o.energy > ag.energy + 15 || Math.random() < 0.4)) BT.cmdSwap(o);
    }
  };
})();
