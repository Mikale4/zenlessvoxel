/* ============================================================================
   clash.js -- PROXY CLASH: your squad against a rival Proxy's squad.

   The rival's Agents live on the enemy side of the battle (so everything that
   hits, Dazes, Stuns, chains, burns and targets an enemy works on them), but
   they fight the way Agents do, with their own kits from data.js / moves.js:
     - a brain like ai.js's: closing in, the basic combo and its cancels,
       Specials on cooldown, EX Specials when the Energy is there (with the
       follow-ups the kits chain), each Agent's core move (Burnice's Mixed
       Flame Blend and her hop back, Aria's Perfect Pitch, Caesar's Dead End),
       and the Ultimate at MAXIMUM Decibels
     - dodges planned against your Agent's moves as they start (timed well:
       a Perfect Dodge and the Dodge Counter that answers it), i-frames,
       Perfect Blocks (Caesar's Shield Bash and Parry Counter, Yixuan's Ink
       Manifestation), and a teammate's Defensive Assist: one of your heavy
       hits parried, your Agent sent reeling, then the Assist Follow-Up
     - the rival Proxy's own swaps, Assist Points, a Radiant Aegis
   Every rival move is announced to your side the way an enemy attack is: its
   heavy hits flash gold (a Defensive Assist / parry chance), an Ultimate's
   finisher flashes red (dodge it), and its big area hits are marked on the
   ground, so your Agents (and you) can answer them.
   Both squads get the same deeper HP pool (Battle Lab: Agent HP in Proxy
   Clash). Daze, Stun, Chain Attacks, Anomalies and your Ultimates work on a
   rival Agent as they do on an elite enemy.

   Hooks (battle.js / ai.js call these): CLASH.start(B) end(B) step(dt)
   think(e, dt) hit(e, h, A) projHit(p, ag) intercept(a, v, h, A)
   react(v, h, a, A) onAgentAct(a, A) hurt(v, dmg) down(v) stunned(v)
   staggered(v) unstoppable(v, force) finish(B, result)
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, R = D.RULES;
  const { clamp, rnd, dist, ang, turn } = U;
  const CLASH = {};
  const B_ = () => BT.B, T_ = () => BT.T;
  // moves an Agent will not break off for anything, and nothing staggers her out of
  const LOCKED = ['ult', 'ult2', 'chain', 'assist', 'followup', 'quick'];
  // your moves whose heavy hits a rival teammate may parry
  const PARRY = ['basic', 'special', 'ex', 'ex2', 'charged', 'hold', 'core', 'counter', 'dash'];
  // the share of a rival's light hits your Agent sees coming (and so may plan to dodge)
  const SEEN = 0.35;
  // in an Agent-against-Agent fight only a high-level skill's heavy hit staggers (both ways)
  const STAGGER = ['ex', 'ex2', 'chain', 'ult', 'ult2', 'followup', 'quick', 'counter', 'eruption', 'charged'];
  // Energy and Decibels for a rival hit that lands, by kind (as applyHit gives your Agents)
  const EN = { basic: 1.0, dash: 1.2, special: 2, counter: 5, quick: 4, followup: 5, hold: 0.8, charged: 2, core: 1.5 };
  const DB = { basic: 8, dash: 8, special: 18, ex: 30, ex2: 30, counter: 40, quick: 60, followup: 60, chain: 40, hold: 8, charged: 30, core: 25 };

  // your Agents' Daze bar and Stun in a clash: the same as a rival Agent's (symmetric)
  const DAZE = 3000, STUN = 3.5;
  CLASH.DAZE = DAZE; CLASH.STUN = STUN;

  /* the rival on the field (Tag Team), or the first one still standing (All-Out) */
  const onField = () => { const B = B_(), RV = B && B.rival; if (!RV) return null; if (RV.allOut) return RV.squad.find(r => r.alive) || null; const r = RV.squad[RV.active]; return r && !r.benched ? r : null; };
  const fieldRivals = () => { const RV = B_().rival; return RV ? RV.squad.filter(r => !r.benched && r.alive) : []; };
  CLASH.onField = onField; CLASH.fieldRivals = fieldRivals;
  CLASH.randomSquad = n => Object.keys(D.AGENTS).sort(() => Math.random() - 0.5).slice(0, n);
  /* the five modes (data.js CLASH_MODES); an old save without one: Tag Team at its size */
  CLASH.modeOf = (o, n) => D.CLASH_MODES[o && o.mode] || D.CLASH_MODES[n >= 3 ? 'tag3' : n === 2 ? 'tag2' : 'duel'];

  /* ---------------------------------------------------- a rival Agent -- */
  function makeRival(id, look, slot, diff, mode) {
    const T = T_(), A = D.AGENTS[id], modelId = BT.modelFor(id, look);
    const def = {
      name: `Rival ${A.short}`, short: A.short, agent: A, kit: A.kit, ai: A.ai, attr: A.attr, spec: A.spec, faction: A.faction, color: A.color, color2: A.color2,
      rank: 'elite', poise: 0, weak: [], resist: [], daze: DAZE, stunDur: STUN, buMax: 1500, stance: A.stance, model: modelId, attacks: [], info: A.blurb,
    };
    const e = BT.makeEnt('enemy', id, def, modelId), hp = Math.round(A.stats.hp * (T.clashHp || 1) * (diff.hp || 1) * mode.hp);
    Object.assign(e, {
      rival: true, slot, modelId, st: Object.assign({}, A.stats), baseHp: A.stats.hp,
      rank: 'elite', poise: 0, hpMax: hp, hp, atk: A.stats.atk, def_: A.stats.def, daze: 0, dazeMax: def.daze, stun: 0, stunMax: def.stunDur, chainsLeft: 0, chainsUsed: 0,
      bu: {}, buMul: {}, anom: null, corrCd: 0, scorched: false, afterburnCd: 0, flinch: 0, vuln: 0, atkCd: 0, phase: 1, recover: 0, hpLag: hp, dazeShown: 0, offBalance: 0,
      energy: A.resource === 'adrenaline' ? A.energyMax : 45, decibels: 300, dodgeCharges: R.dodgeCharges, dodgeCd: 0, combo: 0, lastBasic: -9, queue: [], gap: 0,
      counterUntil: 0, plans: [], benched: true, swapInv: 0, pick: null, strafe: Math.random() < 0.5 ? 1 : -1,
      huweiT: 2.5, corrT: 2,     // (Hu Wei's and Magus's timers)
    });
    e.obj.visible = false;
    return e;
  }

  /* ---------------------------------------------------------- the start -- */
  CLASH.start = B => {
    const o = B.opts.clash, diff = D.RIVALS[o.rival] || D.RIVALS.vesper, mode = CLASH.modeOf(o, B.squad.length);
    const ids = (o.squad && o.squad.length ? o.squad : CLASH.randomSquad(B.squad.length)).slice(0, 3);
    const RV = B.rival = {
      id: diff.id, diff, mode, allOut: !!B.allOut, squad: ids.map((id, i) => makeRival(id, o.look || {}, i, diff, mode)), active: 0,
      dmg: typeof diff.dmg === 'object' ? diff.dmg[mode.id] : diff.dmg,   // by mode (data.js)
      assist: diff.assistStart, assistCd: 0, assistRegen: 22, swapT: rnd(diff.swap[0], diff.swap[1]), retreatT: 0, downT: 0, aegis: null, intro: false, escapeAt: null,
      stats: { perfect: 0, dodges: 0, assists: 0, blocks: 0, ults: 0, exs: 0, chains: 0, stuns: 0, escapes: 0 },
    };
    for (const r of RV.squad) if (BT.COMPANION[r.id]) { const c = BT.makeCompanion(r, BT.COMPANION[r.id]); if (c.id === 'huwei') { c.obj.visible = true; c.x = 0; c.z = -3; c.y = 0.2; } B.companions.push(c); }
    // a rival Remielle's light takes on the attribute of the next rival Agent (Attribute Flux)
    RV.squad.forEach((r, i) => { if (r.id === 'remielle') { const nx = RV.squad[(i + 1) % RV.squad.length]; r.flux = nx !== r && nx.def.attr !== 'lumiflux' ? nx.def.attr : 'physical'; } });
    RV.rings = RV.squad.map(() => groundRing(0xff3a4a));
    if (RV.allOut) RV.lead = groundRing(0xf4d35e);                 // under the Agent you lead
    // your Agents get a Daze bar too: a rival can Stun them, and her teammates Chain Attack them
    for (const a of B.squad) Object.assign(a, { daze: 0, dazeMax: DAZE, stun: 0, stunMax: STUN, chainsLeft: 0 });
    if (RV.allOut) RV.squad.forEach(r => enter(r, 'start')); else enter(RV.squad[0], 'start');
    BT.log(`${diff.name} (${diff.tier} Proxy) fields ${ids.map(id => D.AGENTS[id].short).join(', ')}.`, 'enemy');
    BT.log(`${diff.name}: "${diff.hello}"`, 'enemy');
  };
  CLASH.end = B => { const RV = B.rival; if (!RV) return; for (const g of (RV.rings || []).concat(RV.lead ? [RV.lead] : [])) { if (g.m.parent) g.m.parent.remove(g.m); g.geo.dispose(); g.mat.dispose(); } };
  /* a red ring under each rival on the field: in a mirror match you can tell whose Caesar is whose
     (All-Out: a yellow one under the Agent you lead) */
  function groundRing(col) {
    const geo = new THREE.RingGeometry(0.6, 0.76, 40), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.035; m.renderOrder = 2; BT.world.scene.add(m);
    return { m, geo, mat };
  }

  /* ------------------------------------------------- on and off the field -- */
  function enter(r, why, from) {
    const B = B_(), RV = B.rival, ag = BT.active();
    if (!RV.allOut) RV.active = RV.squad.indexOf(r);
    Object.assign(r, { benched: false, act: null, state: 'idle', dodge: null, pick: null, vx: 0, vz: 0, airY: 0, gap: why === 'assist' ? 0 : 0.35, swapInv: B.t + 0.4 });
    r.anim.state = 'idle'; r.queue.length = 0; r.plans.length = 0; r.obj.visible = true;
    if (r.stun > 0) { r.state = 'stun'; r.anim.state = 'stun'; }
    if (from) { r.x = from.x; r.z = from.z; r.face = from.face; }
    else { r.x = RV.allOut ? (r.slot - (RV.squad.length - 1) / 2) * 2.6 : 0; r.z = -3.2; r.face = 0; r.airY = 5; r.spawnT = 0.45 + r.slot * 0.12; }
    if (ag && from) r.face = ang(r, ag);
    if (!B.enemies.includes(r)) B.enemies.push(r);
    for (const c of B.companions) if (c.owner === r && !c.obj.visible) { c.obj.visible = true; c.x = r.x + 1; c.z = r.z; c.y = 2.4; }
    if (from) { FX.glow(r.x, 1.1, r.z, 2.4, D.ATTR[r.def.attr].hex, 0.3, { size1: 3 }); FX.ring(r.x, r.z, 0.3, 1.5, 0xff3a4a, 0.3); SFX.play('swap'); }
  }
  function leave(r) {
    const B = B_();
    if (r.act) cancelAct(r);
    Object.assign(r, { benched: true, state: 'idle', dodge: null, pick: null, airY: 0, vx: 0, vz: 0 });
    r.anim.state = 'idle'; r.plans.length = 0; r.queue.length = 0; r.obj.visible = false;
    B.enemies = B.enemies.filter(e => e !== r);
    B.threats = B.threats.filter(t => t.e !== r);
    if (B.focus === r) B.focus = null;
    for (const c of B.companions) if (c.owner === r && c.id !== 'huwei' && !c.burst) c.obj.visible = false;   // (Hu Wei stays on the field)
    if (r.alive) FX.burst(r.x, 1, r.z, 14, { col: [0xffffff, 0xff3a4a, D.ATTR[r.def.attr].hex], speed: 3, size: 0.1, life: 0.35, g: -2 });
  }
  function swapTo(r, why) {
    const B = B_(), RV = B.rival, out = onField(); if (!out || out === r || !r.alive) return false;
    const from = { x: out.x, z: out.z, face: out.face };
    leave(out); enter(r, why, from);
    BT.log(why === 'retreat' || why === 'escape' ? `${RV.diff.name} pulls ${out.def.short} out: ${r.def.short} steps in.` : `${RV.diff.name} swaps in ${r.def.short}.`, 'enemy');
    return true;
  }
  /* a rival move stopped part way: its announced hits are off */
  function cancelAct(e) {
    const B = B_(), A = e.act; if (!A) return;
    B.threats = B.threats.filter(t => t.A !== A);
    for (const f of A.tele || []) FX.kill(f);
    BT.endAct(e);
  }

  /* --------------------------------------------------------- resources -- */
  function gain(e, n) { e.energy = Math.min(e.def.agent.energyMax, e.energy + n); }
  function spend(e, n) { e.energy = Math.max(0, e.energy - n); }
  function decibels(e, n) {
    const RV = B_().rival;
    for (const r of RV.squad) if (r.alive) r.decibels = Math.min(R.decibelMax, r.decibels + (r === e ? n : n * R.decibelShare));
  }
  function landed(e, kind) {
    if (!e.alive) return;
    if (e.def.agent.resource !== 'adrenaline') gain(e, EN[kind] || 0); else if (kind === 'counter') gain(e, 3);
    decibels(e, DB[kind] || 10);
  }

  /* ------------------------------------------- the rival Proxy, each step -- */
  CLASH.step = dt => {
    const B = B_(), RV = B.rival; if (!RV) return;
    if (!RV.intro && B.real > 0.2) { RV.intro = true; BT.callout('PROXY CLASH', 'wave', `VS ${RV.diff.name.toUpperCase()} · ${RV.diff.tier.toUpperCase()} PROXY`); }
    for (const r of RV.squad) {
      if (!r.alive) continue;
      const on = !r.benched;
      if (r.def.agent.resource === 'adrenaline') gain(r, (on ? 2.2 : 1.0) * dt); else gain(r, r.st.er * (on ? 1 : 0.45) * dt);
      if (on && B.phase === 'fight') r.decibels = Math.min(R.decibelMax, r.decibels + RV.diff.dbRate * dt);   // a rival Proxy's Agents build up on their own too
      if (r.dodgeCd > 0) { r.dodgeCd -= dt; if (r.dodgeCd <= 0) r.dodgeCharges = R.dodgeCharges; }
      if (r.dodge && B.t > r.dodge.until) { r.dodge = null; if (r.state === 'dodge') { r.state = 'idle'; r.anim.state = 'idle'; } }
      if (!r.act && r.airY > 0 && !(r.spawnT > 0)) r.airY = Math.max(0, r.airY - dt * 9);
      // a Stunned rival who was swapped out recovers on the bench (on the field, battle.js counts it)
      if (r.benched && r.stun > 0) { r.stun -= dt; r.daze = r.dazeMax * clamp(r.stun / r.stunMax, 0, 1); if (r.stun <= 0) { r.stun = 0; r.daze = 0; r.subj = 0; r.state = 'idle'; r.anim.state = 'idle'; r.chainsLeft = 0; } }
    }
    // your Stunned Agents (on the field or swapped out) come round
    for (const a of B.squad) if (a.stun > 0) {
      a.stun -= dt; a.daze = a.dazeMax * Math.max(0, a.stun / a.stunMax);
      if (a.stun <= 0 || !a.alive) { a.stun = 0; a.daze = 0; a.chainsLeft = 0; if (a.state === 'stun') { a.state = 'idle'; a.anim.state = 'idle'; } }
    }
    if (RV.aegis && (RV.aegis.until <= B.t || RV.aegis.hp <= 0)) RV.aegis = null;
    RV.assistRegen -= dt; if (RV.assistRegen <= 0) { RV.assistRegen = 22; RV.assist = Math.min(R.assistPointsMax, RV.assist + 1); }
    // the rings: red under each rival on the field, yellow under the Agent you lead (All-Out)
    RV.squad.forEach((r, i) => { const g = RV.rings[i], show = !r.benched && r.alive && r.obj.visible && !(r.spawnT > 0); g.m.visible = show; if (show) { g.m.position.set(r.x, 0.035, r.z); g.m.scale.setScalar(r.rad / 0.55); } });
    if (RV.lead) { const a = BT.active(), show = a && a.alive && a.obj.visible; RV.lead.m.visible = !!show; if (show) { RV.lead.m.position.set(a.x, 0.036, a.z); RV.lead.m.scale.setScalar(a.rad / 0.55); } }
    // All-Out: nobody steps in; the clash is won when the last of them is down
    if (RV.allOut) {
      if (B.phase === 'fight' && RV.squad.every(r => !r.alive)) { RV.downT += dt; if (RV.downT > 1.5 && !B.result) BT.finish('win'); }
      return;
    }
    const cur = RV.squad[RV.active];
    // the rival on the field is down: the next one steps in (or that was the last)
    if (B.phase === 'fight' && cur && !cur.alive) {
      RV.downT += dt;
      if (RV.downT > 1.5) {                                        // (after she fades, at 1.4 s)
        RV.downT = 0;
        const nx = RV.squad.find(r => r.alive);
        if (!nx) { if (!B.result) BT.finish('win'); return; }
        const from = { x: cur.x, z: cur.z, face: cur.face };
        leave(cur); enter(nx, 'down', from);
        BT.log(`${RV.diff.name} sends in ${nx.def.short}.`, 'enemy'); BT.callout(`RIVAL ${nx.def.short.toUpperCase()}`, 'rival', 'steps in');
        RV.swapT = B.t + rnd(RV.diff.swap[0], RV.diff.swap[1]);
      }
      return;
    }
    if (B.phase === 'fight' && !B.chain) commander();
  };
  /* swaps: a rotation, so every rival Agent gets field time; a badly hurt one pulled out for a fresher
     one; and (as you can) a Stunned one pulled out before your Chain Attacks land, the sharper the Proxy
     the more often */
  function commander() {
    const B = B_(), RV = B.rival, cur = onField(), Dd = RV.diff;
    if (!cur || !cur.alive) return;
    if (cur.stun > 0) {
      if (RV.escapeAt == null) RV.escapeAt = Math.random() < Dd.escape ? B.t + rnd(0.2, 0.5) : Infinity;
      const o = RV.squad.filter(r => r.alive && r.benched && !(r.stun > 0)).sort((x, y) => y.hp / y.hpMax - x.hp / x.hpMax)[0];
      if (o && B.t >= RV.escapeAt) { RV.escapeAt = Infinity; RV.stats.escapes++; swapTo(o, 'escape'); BT.callout('STUN ESCAPE', 'rival', `${RV.diff.name} swaps ${cur.def.short} out`); }
      return;
    }
    RV.escapeAt = null;
    if (cur.state === 'dodge' || cur.state === 'hit') return;
    if (cur.act && cur.act.kind !== 'basic') return;
    const bench = RV.squad.filter(r => r.alive && r.benched && !(r.stun > 0)); if (!bench.length) return;
    const hr = cur.hp / cur.hpMax;
    if (hr < 0.3 && RV.retreatT <= B.t) {
      RV.retreatT = B.t + 8;
      const o = bench.slice().sort((x, y) => y.hp / y.hpMax - x.hp / x.hpMax)[0];
      if (o.hp / o.hpMax > hr + 0.25 && Math.random() < 0.35 + 0.4 * Dd.reflex) { swapTo(o, 'retreat'); RV.swapT = B.t + rnd(Dd.swap[0], Dd.swap[1]); return; }
    }
    if (B.t < RV.swapT) return;
    RV.swapT = B.t + rnd(Dd.swap[0], Dd.swap[1]);
    const o = bench.slice().sort((x, y) => (y.energy + y.decibels / 40) - (x.energy + x.decibels / 40))[0];
    if (o && (o.energy > cur.energy + 10 || o.decibels >= R.decibelMax || Math.random() < 0.5)) swapTo(o, 'swap');
  }

  /* -------------------------------------------- the rival Agent, each frame -- */
  /* whom a rival Agent fights: in Tag Team, whoever you have on the field; All-Out, she picks
     (whoever is hitting her, whoever no teammate is on, a hurt or Stunned one) and sticks to it a while */
  function targetFor(e) {
    const B = B_(), RV = B.rival, F = BT.fielded().filter(a => a.obj.visible);
    if (!F.length) { e.tgt = null; return null; }
    if (!RV.allOut) return (e.tgt = F[0]);
    if (e.tgt && F.includes(e.tgt) && B.t < (e.tgtUntil || 0) && !(e.tgt.stun > 0 && false)) return e.tgt;
    let best = null, bv = -1e9;
    for (const a of F) {
      let v = -dist(e, a) * 0.6 + (a.lastTgt === e ? 2 : 0) + (1 - a.hp / a.hpMax) * 1.5 + (a.stun > 0 ? 3 : 0) + (a === e.tgt ? 0.8 : 0);
      v -= 1.5 * RV.squad.filter(r => r !== e && r.alive && !r.benched && r.tgt === a).length;
      if (v > bv) { bv = v; best = a; }
    }
    e.tgt = best; e.tgtUntil = B.t + rnd(2.5, 4.5);
    return best;
  }
  CLASH.think = (e, dt) => {
    const B = B_(), ag = targetFor(e);
    e.stT += dt;
    if (e.stun > 0) { BT.physics(e, dt, true); return; }
    // dodges planned when your Agent's moves began
    for (const p of e.plans) if (!p.done && B.t >= p.at) { p.done = true; tryDodge(e, p); }
    if (e.plans.length > 6 || e.plans.some(p => p.done)) e.plans = e.plans.filter(p => !p.done);
    switch (e.state) {
      case 'hit': e.hitT -= dt; e.anim.t += dt; BT.physics(e, dt, true); if (e.hitT <= 0) { e.state = 'idle'; e.anim.state = 'idle'; } return;
      case 'dodge': e.anim.t += dt; BT.physics(e, dt, false); { const k = Math.exp(-dt * 5); e.vx *= k; e.vz *= k; } return;
      case 'win': return;
    }
    if (e.act) {
      const A = e.act;
      if (ag && A.tgt && A.tgt !== ag && A.tgt.type === 'agent' && !B.rival.allOut) A.tgt = ag;   // you swapped: the move goes on at whoever came in
      lockTargets(e, A, A.tgt && A.tgt.type === 'agent' && A.tgt.alive ? A.tgt : ag);
      BT.stepAct(e, dt);
      if (A.flashes) for (const f of A.flashes) if (!f.done && B.t >= f.at) {
        f.done = true; const p = new THREE.Vector3(); BT.sock(e, 'head', p);
        FX.glow(p.x, p.y + 0.2, p.z, 1.2, f.color === 'red' ? 0xff3a3a : 0xffd04a, 0.35, { size1: 3.2, depthTest: false });
        FX.glow(p.x, p.y + 0.2, p.z, 0.5, 0xffffff, 0.25, { size1: 1.6, depthTest: false });
        SFX.play(f.color === 'red' ? 'flashRed' : 'flashGold'); if (BT.hooks.flash) BT.hooks.flash(f.color, f.th);
        BT.say(BT.active(), 'charge_hint');
      }
      BT.physics(e, dt, true);
      if (e.act === A && A.kind === 'basic' && A.t >= (A.def.cancel || A.dur)) decide(e, dt, true);
      return;
    }
    if (B.phase !== 'fight') { BT.physics(e, dt, true); return; }
    if (e.gap > 0) { e.gap -= dt; e.moving = true; circle(e, ag, dt); BT.physics(e, dt, false); return; }
    decide(e, dt, false);
    BT.physics(e, dt, !e.moving);
  };
  /* between moves: edge round your Agent, facing her */
  function circle(e, ag, dt) {
    if (!ag || !ag.alive || !ag.obj.visible) { BT.steer(e, e.x, e.z, 0, dt); return; }
    const d = clamp(dist(e, ag), 1.8, 4.5), a0 = ang(ag, e) + 0.45 * e.strafe;
    BT.steer(e, ag.x + Math.sin(a0) * d, ag.z + Math.cos(a0) * d, e.st.speed * 0.45, dt);
    e.face = turn(e.face, ang(e, ag), 1 - Math.exp(-8 * dt));
    if (Math.random() < dt * 0.4) e.strafe = -e.strafe;
  }
  function decide(e, dt, fromCombo) {
    const B = B_(), K = e.def.kit, ag = e.tgt;
    e.moving = false;
    if (e.queue.length) {
      const q = e.queue[0]; if (q.delay > 0) { q.delay -= dt; return; }
      e.queue.shift();
      if (q.def && (!q.def.cost || q.free || e.energy >= q.def.cost)) startSkill(e, q.def, q.kind, ag, q);
      return;
    }
    if (!ag || !ag.alive || !ag.obj.visible) { if (!fromCombo) { e.moving = true; circle(e, null, dt); } return; }
    if (ag.state === 'down' || ag.state === 'getup') { if (!fromCombo) { e.moving = true; circle(e, ag, dt); } return; }   // no kicking an Agent who is down
    if (e.counterUntil > B.t) { e.counterUntil = 0; startSkill(e, K.counter, 'counter', ag); return; }
    // Burnice keeps her distance: a hop back when she is crowded
    if (!fromCombo && e.def.ai.kite && K.hop && (e.cds.hop || 0) <= B.t && dist(e, ag) - ag.rad < e.def.ai.kite) {
      e.cds.hop = B.t + rnd(2.5, 4); if (Math.random() < 0.6) { startSkill(e, K.hop, 'move', ag); return; }
    }
    const c = fromCombo ? choose(e, ag, true) : (e.pick || (e.pick = choose(e, ag, false)));
    if (!c) return;
    const reach = c.def.reach || 1.6, d = dist(e, ag) - ag.rad;
    if (d > reach) {
      if (fromCombo) return;
      if (d > 4.6 && K.dash && c.kind === 'basic' && (e.cds.dash || 0) <= B.t) { e.cds.dash = B.t + 2.5; startSkill(e, K.dash, 'dash', ag); return; }
      e.moving = true;
      const want = Math.max(0.6, Math.min(reach - 0.3, c.def.range || e.def.ai.range)), ax = ang(ag, e);
      BT.steer(e, ag.x + Math.sin(ax) * (want + ag.rad), ag.z + Math.cos(ax) * (want + ag.rad), e.st.speed, dt);
      e.face = turn(e.face, ang(e, ag), 1 - Math.exp(-10 * dt));
      return;
    }
    if (fromCombo && c.kind !== 'basic') return;
    startSkill(e, c.def, c.kind, ag, c);
  }
  function choose(e, ag, fromCombo) {
    const B = B_(), RV = B.rival, K = e.def.kit, id = e.id, Dd = RV.diff;
    if (!fromCombo) {
      if (e.decibels >= R.decibelMax && (e.cds.ult || 0) <= B.t) {
        e.cds.ult = B.t + 1.2;
        if (Math.random() < Dd.ult && !(ag.act && ['ult', 'ult2', 'chain'].includes(ag.act.kind))) return { def: K.ult, kind: 'ult' };
      }
      if (id === 'burnice' && K.hold && (e.cds.hold || 0) <= B.t && Math.random() < 0.45) return { def: K.hold, kind: 'hold' };
      if (id === 'aria' && K.charged && (e.cds.charged || 0) <= B.t && Math.random() < 0.35) return { def: K.charged, kind: 'charged' };
      if (id === 'caesar' && K.deadEnd && RV.assist >= 2 && (e.cds.deadEnd || 0) <= B.t && Math.random() < 0.15) return { def: K.deadEnd, kind: 'core' };
      if (id === 'qingyi' && K.moonlit && (e.cds.moonlit || 0) <= B.t && Math.random() < 0.3) return { def: K.moonlit, kind: 'core' };
      if (id === 'jufufu' && K.spin && (e.cds.spin || 0) <= B.t && Math.random() < 0.25) return { def: K.spin, kind: 'core' };
      if (id === 'orphie' && K.heatCharge && (e.cds.heat || 0) <= B.t && Math.random() < 0.25) return { def: K.heatCharge, kind: 'ex2' };
      if (id === 'remielle' && K.rainbow && (e.cds.rainbow || 0) <= B.t && Math.random() < 0.3) return { def: K.rainbow, kind: 'charged' };
      // the special moves her own file lists for a rival's hands: [{ k: kit key, kind, p: chance, cd }]
      for (const s of e.def.agent.rivalMoves || []) if (K[s.k] && (e.cds[s.k] || 0) <= B.t && Math.random() < s.p) { e.cds[s.k] = B.t + (s.cd || 4); return { def: K[s.k], kind: s.kind }; }
      if (e.energy >= K.ex.cost && (e.energy >= e.def.agent.energyMax * 0.85 || ag.stun > 0 || Math.random() < 0.3)) return pickEx(e);
      if ((e.cds.special || 0) <= B.t && Math.random() < 0.35) return { def: K.special, kind: 'special' };
    }
    if (B.t - e.lastBasic > 0.9) e.combo = 0;
    // ranged fighters skip their close-range combo steps when the target is far
    let step = K.basic[e.combo % K.basic.length];
    if (e.def.ai.range > 2.5 && (step.reach || 1.6) < 2.2 && dist(e, ag) - ag.rad > 2.6) { e.combo++; step = K.basic[e.combo % K.basic.length]; }
    return { def: step, kind: 'basic' };
  }
  function pickEx(e) {
    const K = e.def.kit;
    if (e.id === 'yixuan' && K.exAlt && Math.random() < 0.4) return { def: K.exAlt, kind: 'ex' };
    return { def: K.ex, kind: 'ex' };
  }
  function startSkill(e, def, kind, tgt, o) {
    const B = B_(), RV = B.rival, K = e.def.kit, Dd = RV.diff;
    if (!def) return;
    e.pick = null;
    if (tgt) e.face = ang(e, tgt);
    if (kind === 'core' && def === K.deadEnd) { RV.assist -= 1; e.cds.deadEnd = B.t + 10; }
    if (def.cost && !(o && o.free)) spend(e, Math.min(e.energy, def.cost));
    const A = BT.startAct(e, def, { tgt, kind });
    A.dir = tgt ? ang(e, tgt) : e.face; A.tele = []; A.locks = {};
    if (kind === 'basic') { e.combo++; e.lastBasic = B.t + def.dur; } else e.combo = 0;
    if (kind === 'special') e.cds.special = B.t + (def.cd || 3.5) * (1.6 - 0.5 * Dd.reflex);
    if (kind === 'hold') e.cds.hold = B.t + rnd(6, 9);
    if (kind === 'charged') e.cds.charged = B.t + rnd(5, 8);
    // (your Agents earn these with Voltage, Momentum and Bottled Heat; a rival waits about as long)
    if (def === K.moonlit) e.cds.moonlit = B.t + rnd(9, 12);
    if (def === K.spin) e.cds.spin = B.t + rnd(10, 14);
    if (def === K.heatCharge) e.cds.heat = B.t + rnd(20, 26);
    if (def === K.rainbow) e.cds.rainbow = B.t + rnd(6, 9);
    if (def.aegis || (o && o.aegis)) aegis(e);
    if (kind === 'ult') {
      e.decibels -= R.decibelMax; RV.stats.ults++; RV.assist = Math.min(R.assistPointsMax, RV.assist + 1);
      B.freeze = Math.max(B.freeze, 0.3);
      BT.callout(def.name.replace(/^Ultimate: /, ''), 'rivalult', `RIVAL ${e.def.short.toUpperCase()} · ULTIMATE`);
      BT.log(`Rival ${e.def.short}: ${def.name}!`, 'ult'); SFX.play('ult');
      if (BT.hooks.flash) BT.hooks.flash('red');
      BT.shot({ x: e.x, z: e.z, zoom: 0.85, dur: Math.min(1.4, def.dur), pri: 4, yaw: rnd(-0.3, 0.3) });
    } else if (kind === 'ex' || kind === 'ex2') {
      RV.stats.exs++;
      BT.callout(def.name.replace(/^EX Special Attack: /, ''), 'rival', `RIVAL ${e.def.short.toUpperCase()} · EX`);
      BT.log(`Rival ${e.def.short}: ${def.name}`, 'enemy');
    } else if (['special', 'hold', 'charged', 'core', 'followup', 'counter'].includes(kind)) BT.log(`Rival ${e.def.short}: ${def.name}`, 'enemy');
    announce(e, A);
    // EX follow-ups the way the kits chain them
    const r = Math.random();
    if (kind === 'ex' && def === K.ex && K.ex2 && e.energy >= K.ex2.cost && r < 0.55) e.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
    if (e.id === 'burnice' && (kind === 'followup' || kind === 'hold') && K.ex2 && e.energy >= K.ex2.cost && r < 0.4) e.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
    if (kind === 'counter' && e.id === 'aria') e.combo = 2;
    // a breather between moves: how long it lasts is how sharp the rival Proxy is
    const last = kind === 'basic' && e.combo % K.basic.length === 0;
    e.gap = kind === 'basic' ? (last ? rnd(Dd.react[0], Dd.react[1]) + 0.15 : 0) : kind === 'move' ? 0.05 : rnd(Dd.react[0], Dd.react[1]);
  }
  function aegis(e) {
    const B = B_(), RV = B.rival, v = Math.round(e.st.impact * 8 + 700);
    RV.aegis = { hp: v, max: v, until: B.t + 60 };
    BT.log(`Rival ${e.def.short}: Radiant Aegis (a ${U.fmt(v)} shield for the rival squad).`, 'enemy');
    FX.ring(e.x, e.z, 0.5, 2.2, 0xf4d35e, 0.5); FX.glow(e.x, 1.1, e.z, 2.2, 0xf4d35e, 0.4);
  }

  /* ---------------------------------------------- announcing a rival move --
     Each hit becomes a threat on your Agent, the way an enemy attack is: she
     plans a dodge for it, and a flashed one is a Defensive Assist chance. */
  function flashFor(kind, h, i, last) {
    if (kind === 'ult' || kind === 'ult2') return i === last ? 'red' : null;
    if (!h.heavy) return null;
    return ['ex', 'ex2', 'special', 'charged', 'hold', 'core', 'followup', 'basic'].includes(kind) ? 'gold' : null;
  }
  function scaled(e, h, A, i, last) {
    const T = T_(), RV = B_().rival, ag = BT.active();
    let mult = h.mult * RV.dmg * (T.rivalDmg != null ? T.rivalDmg : 1) / Math.max(0.05, T.enemyDmg || 1);
    // Sheer DMG (Yixuan) grows with Max HP and ignores DEF
    if (e.def.agent.sheer && ag) mult *= (0.3 * e.st.atk + 0.1 * e.baseHp) / e.st.atk * (794 + ag.st.def) / 794;
    return Object.assign({}, h, { mult, flash: flashFor(A.kind, h, i, last), launch: !!h.launch || (A.kind === 'ult' && i === last && !!h.heavy), flinchOnly: !h.heavy || !STAGGER.includes(A.kind), kind: A.kind });
  }
  function announce(e, A) {
    const B = B_(), T = T_(), ag = BT.active(), d = A.def, sp = A.speed || 1;
    A.threats = []; A.flashes = [];
    if (!d.hits || !d.hits.length || !ag || !ag.alive) return;
    const last = d.hits.length - 1;
    d.hits.forEach((h, i) => {
      // a heavy hit is seen coming; a quick light one only now and then (the rest just land, unless she is already clear)
      if (!h.heavy && i !== last && Math.random() > SEEN) return;
      let impact = B.t + h.t / sp;
      if (h.shape === 'proj') impact += dist(e, ag) / (h.speed || 12);
      const hh = scaled(e, h, A, i, last), flash = hh.flash;
      const th = { e, hit: h, hh, target: ag, impactAt: impact, flashAt: flash ? Math.max(B.t, impact - T.flashLead) : null, flash, heavy: !!h.heavy, launch: hh.launch, A, done: false };
      B.threats.push(th); A.threats.push(th);
      if (flash) A.flashes.push({ at: th.flashAt, color: flash, th });
      BT.planDefense(ag, th);
    });
  }
  /* an area hit centred on your Agent picks its spot a moment before it lands (the big ones are marked) */
  function lockTargets(e, A, ag) {
    const d = A.def; if (!d.hits || !A.locks || !ag) return;
    d.hits.forEach((h, i) => {
      if (h.at !== 'target' || A.locks[i]) return;
      const big = h.heavy && (h.r || 0) >= 2.4, lead = big ? 0.55 : 0.15;
      if (A.t < h.t - lead) return;
      A.locks[i] = { x: ag.x, z: ag.z };
      if (big) A.tele.push(FX.telegraph(ag.x, ag.z, h.r, A.kind === 'ult' ? 0xff3a4a : 0xffd04a, Math.max(0.05, (h.t - A.t) / (A.speed || 1))));
    });
  }

  /* ------------------------------------------------ a rival hit lands -- */
  function center(e, h, A, ag) {
    if (h.at === 'target') { const L = A.locks && A.locks[A.def.hits.indexOf(h)]; return L ? [L.x, L.z] : [ag.x, ag.z]; }
    if (h.at === 'front') return [e.x + Math.sin(A.dir) * 1.3, e.z + Math.cos(A.dir) * 1.3];
    return [e.x, e.z];
  }
  function reaches(e, h, A, ag, pad) {
    const shape = h.shape || 'arc', r = (h.r || (A.def.reach || 1.6) + 0.7) + pad, [cx, cz] = center(e, h, A, ag);
    const dx = ag.x - cx, dz = ag.z - cz, d = Math.hypot(dx, dz), dir = A.dir;
    if (shape === 'circle') return d <= r + ag.rad;
    if (shape === 'line') {
      const along = dx * Math.sin(dir) + dz * Math.cos(dir), side = Math.abs(dx * Math.cos(dir) - dz * Math.sin(dir));
      return along > -0.5 - pad && along < (h.len || 7) + ag.rad + pad && side < r + ag.rad;
    }
    if (d > r + ag.rad) return false;
    const da = Math.abs(U.wrap(Math.atan2(dx, dz) - dir));
    return d < ag.rad + 0.6 || da <= (h.arc || 120) * Math.PI / 360 + Math.atan2(ag.rad, Math.max(d, 0.1)) + (pad ? 0.6 : 0);
  }
  const crit = (e, hh) => Math.random() < e.st.cr ? Object.assign({}, hh, { mult: hh.mult * (1 + e.st.cd), crit: true }) : hh;
  CLASH.hit = (e, h, A) => {
    const B = B_(), T = T_(), RV = B.rival, F = BT.fielded().filter(a => a.obj.visible);
    const th = A.threats && A.threats.find(t => t.hit === h && !t.done);
    const ag = A.tgt && A.tgt.type === 'agent' && A.tgt.alive && F.includes(A.tgt) ? A.tgt : (RV.allOut ? null : F[0]);
    if (!ag) { if (th) th.done = true; return; }
    const i = A.def.hits.indexOf(h), hh = th ? th.hh : scaled(e, h, A, i, A.def.hits.length - 1);
    const attr = h.attr || e.flux || e.def.attr, cols = FX.colors(attr), dir = A.dir;
    if (h.shape === 'proj') { BT.spawnEnemyProj(e, hh, th, ag); SFX.play(attr === 'fire' ? 'fire' : 'ether'); return; }
    const [cx, cz] = center(e, h, A, ag), r = h.r || (A.def.reach || 1.6) + 0.7, shape = h.shape || 'arc';
    // the look of it, as the same move looks in your Agents' hands
    if (h.fx) FX.named(h.fx, { x: cx, z: cz, yaw: dir, attr, r, fromX: e.x, fromZ: e.z, len: h.len, y: 1 });
    if (shape === 'arc' && !h.fx) FX.slash(e.x, 1.0, e.z, Math.min(2.4, r), dir, cols[1], { tilt: rnd(-0.6, 0.6), arc: (h.arc || 120) * Math.PI / 180 + 0.4 });
    SFX.play(h.heavy ? 'heavy' : attr === 'fire' && h.fx ? 'fire' : 'swing');
    if (h.heavy) B.cam.shake = Math.max(B.cam.shake, A.kind === 'ult' ? 0.3 : 0.12);
    // whom it reaches: the Agent it was aimed at (a Perfect Dodge counts if the dodge started on time,
    // even if it carried her clear; one who swapped in on it resolves it either way), and in an All-Out
    // clash anyone else of yours standing in it
    const victims = [];
    for (const a of RV.allOut ? F : [ag]) {
      const aimed = a === ag, inRange = reaches(e, h, A, a, 0);
      const perfectish = aimed && a.dodge && B.t <= a.dodge.until && !a.dodge.perfectDone && B.t - a.dodge.t0 <= T.perfectWin + 0.02 && reaches(e, h, A, a, 3);
      if (inRange || perfectish || (aimed && th && th.assist)) victims.push(a);
    }
    B.eh.swing++;
    if (!victims.length) { B.eh.out++; if (th) th.done = true; return; }
    for (const a of victims) {
      const hp0 = a.hp, wasStun = a.stun > 0;
      BT.incoming(e, crit(e, hh), a === ag ? th : null, a);
      if (a.hp < hp0) {
        landed(e, A.kind);
        if (!wasStun) dazeAgent(a, e.st.impact * (h.daze || 0) / 100, e);
        else if (h.heavy) rivalChain(e, a, A);
      }
    }
    if (th && !victims.includes(ag)) th.done = true;
  };
  CLASH.projHit = (p, ag) => {
    FX.named(p.h.fx === 'fireball' ? 'explode' : p.h.fx === 'lightLance' ? 'lightBurst' : 'sound', { x: p.x, z: p.z, y: 1, r: p.h.fx === 'fireball' ? 1.3 : 1.0, attr: p.h.attr || p.e.flux || p.e.def.attr });
    const hp0 = ag.hp, wasStun = ag.stun > 0;
    BT.incoming(p.e, crit(p.e, p.h), p.threat && p.threat.target === ag ? p.threat : null, ag);
    if (p.threat && p.threat.target !== ag) p.threat.done = true;
    if (ag.hp < hp0) { landed(p.e, p.h.kind || 'basic'); if (!wasStun) dazeAgent(ag, p.e.st.impact * (p.h.daze || 0) / 100, p.e); else if (p.h.heavy) rivalChain(p.e, ag, null); }
  };

  /* a rival's companion lands a hit on one of your Agents (Hu Wei's jump, Magus's Corrosive Flash):
     a light hit, never flashed; she can dodge it */
  CLASH.companionHit = (o, h, ag) => {
    if (!ag || !ag.alive || !ag.obj.visible) return;
    const A = { kind: 'core', def: { hits: [h] }, dir: ang(o, ag), t: 0 };
    const hh = Object.assign(scaled(o, h, A, 0, 1), { flash: null, launch: false, flinchOnly: true, heavy: false });
    hh.mult *= 0.5;   // a companion fires on a timer with no breathers between: half the rival's Agent multiplier
    const hp0 = ag.hp, wasStun = ag.stun > 0;
    BT.incoming(o, crit(o, hh), null, ag);
    if (ag.hp < hp0) { landed(o, 'core'); if (!wasStun) dazeAgent(ag, o.st.impact * (h.daze || 0) / 100, o); }
  };

  /* ----------------------------------------- Daze and Stun on your Agents --
     A rival Agent's landed hits build Daze on yours exactly as yours do on hers. A full bar Stuns
     her for a few seconds: she cannot act, takes x1.5 DMG, and a rival heavy hit on her opens a
     Chain Attack by one of the rival's teammates (up to two per Stun). In Tag Team, swap her out. */
  function dazeAgent(a, n, from) {
    if (!(a.dazeMax > 0) || !(n > 0) || a.stun > 0 || !a.alive) return;
    a.daze += n * T_().dazeRate;
    if (a.daze >= a.dazeMax) stunAgent(a, from);
  }
  CLASH.dazeAgent = dazeAgent;
  function stunAgent(a, from) {
    const B = B_(), RV = B.rival;
    if (a.act && window.CHOREO) CHOREO.end(a, a.act);
    Object.assign(a, { act: null, dodge: null, state: 'stun', stun: a.stunMax, daze: a.dazeMax, launchedUntil: 0, guardUntil: 0, airY: 0 });
    a.queue.length = 0; a.anim.state = 'stun'; a.anim.t = 0;
    a.chainsLeft = Math.min(2, RV.squad.filter(r => r.alive && r !== from).length);
    RV.stats.stuns++; if (from) decibels(from, 150);
    BT.callout('STUNNED', 'warn', RV.allOut ? `${a.def.short} · keep them off her` : `${a.def.short} · swap her out!`);
    BT.log(`${a.def.short} is Stunned!${RV.allOut ? '' : ' Swap her out before their Chain Attacks.'}`, 'warn'); SFX.play('stun');
    FX.glow(a.x, a.height * 0.8, a.z, 2.5, 0xfff0a0, 0.4, { size1: 4 });
  }
  /* a rival teammate follows a heavy hit on your Stunned Agent with her Chain Attack */
  function rivalChain(e, a, A) {
    const B = B_(), RV = B.rival;
    if (!(a.stun > 0) || !(a.chainsLeft > 0) || B.chain || B.cutin) return;
    const free = r => r !== e && r.alive && !(r.stun > 0) && !['dodge', 'hit'].includes(r.state) && !(r.act && LOCKED.includes(r.act.kind));
    const helpers = RV.squad.filter(r => free(r) && (RV.allOut ? !r.benched : r.benched));
    if (!helpers.length) return;
    const r = U.pick(helpers), K = r.def.kit;
    a.chainsLeft--;
    if (RV.allOut) { if (r.act) cancelAct(r); r.state = 'idle'; r.anim.state = 'idle'; }
    else { const from = { x: e.x, z: e.z, face: e.face }; leave(e); enter(r, 'chain', from); }
    const d = ang(a, r) || 0; r.x = a.x + Math.sin(d) * (a.rad + 1.2); r.z = a.z + Math.cos(d) * (a.rad + 1.2); r.face = ang(r, a); r.swapInv = B.t + 0.3;
    const A2 = BT.startAct(r, K.chain, { tgt: a, kind: 'chain' }); A2.dir = ang(r, a); A2.tele = []; A2.locks = {}; r.tgt = a; r.tgtUntil = B.t + 3;
    announce(r, A2);
    RV.stats.chains++; RV.assist = Math.min(R.assistPointsMax, RV.assist + 1); decibels(r, 300);
    BT.callout('RIVAL CHAIN ATTACK', 'rivalult', `${r.def.short} · ${K.chain.name.replace('Chain Attack: ', '')}`);
    BT.log(`Rival ${r.def.short}: ${K.chain.name} on ${a.def.short}!`, 'enemy');
    BT.shot({ x: a.x, z: a.z, zoom: 0.75, dur: 0.9, pri: 3, yaw: rnd(-0.4, 0.4) });
  }

  /* ------------------------------------------- your hits on a rival Agent -- */
  /* true: the hit does not land (a dodge, i-frames, a Perfect Block, a teammate's parry) */
  CLASH.intercept = (a, v, h, A) => {
    const B = B_(), T = T_();
    if (v.benched || !v.alive) return true;
    if (v.stun > 0) return false;
    if (v.dodge && B.t <= v.dodge.until) {
      if (v.dodge.perfectOK && !v.dodge.perfectDone && B.t - v.dodge.t0 <= T.perfectWin + 0.02) perfectDodge(v, a); else miss(v);
      return true;
    }
    const VA = v.act;
    if (VA && VA.def.perfectBlock && VA.t <= VA.def.perfectBlock && VA.kind !== 'assist') { block(v, a); return true; }
    if ((VA && VA.def.inv && VA.t >= VA.def.inv[0] && VA.t <= VA.def.inv[1]) || v.swapInv > B.t) { miss(v); return true; }
    if (h.heavy && PARRY.includes(A.kind) && teammateParry(v, a)) return true;
    return false;
  };
  function miss(v) { if (T_().dmgNumbers) FX.number(v.x, v.height, v.z, 'MISS', 'miss'); }
  function perfectDodge(v, a) {
    const B = B_(), RV = B.rival;
    v.dodge.perfectDone = true; RV.stats.perfect++;
    BT.callout('PERFECT DODGE', 'rival', `Rival ${v.def.short}`); SFX.play('perfect');
    v.counterUntil = B.t + 0.9; v.counterTgt = a; v.queue.length = 0; v.pick = null;
    decibels(v, 150); gain(v, v.def.agent.resource === 'adrenaline' ? 5 : 4);
    FX.glow(v.x, 1.1, v.z, 2.2, 0xff8a9a, 0.35, { size1: 3.5 });
    BT.log(`Rival ${v.def.short}: Perfect Dodge!`, 'enemy');
  }
  function block(v, a) {
    const B = B_(), RV = B.rival, K = v.def.kit;
    SFX.play('parry'); B.freeze = Math.max(B.freeze, 0.08); RV.stats.blocks++;
    BT.callout('PERFECT BLOCK', 'rival', `Rival ${v.def.short}`); BT.log(`Rival ${v.def.short}: Perfect Block!`, 'enemy');
    FX.glow(v.x, 1.2, v.z, 2.2, 0xfff0a0, 0.3, { size1: 3.6 });
    staggerAgent(a, 0.4, v); dazeAgent(a, v.st.impact * 3, v);
    decibels(v, 150);
    if (v.id === 'caesar' && K.thrust) { cancelAct(v); v.queue.unshift({ def: K.thrust, kind: 'special', delay: 0.05 }); }
    else gain(v, 10);
  }
  /* a teammate swaps in (All-Out: dashes over) on one of your heavy hits and parries it (a rival Assist Point) */
  function teammateParry(v, a) {
    const B = B_(), RV = B.rival, Dd = RV.diff;
    if (RV.assist < 1 || RV.assistCd > B.t || B.chain) return false;
    const free = r => r !== v && r.alive && !(r.stun > 0) && !['dodge', 'hit'].includes(r.state) && !(r.act && LOCKED.includes(r.act.kind));
    const bench = RV.squad.filter(r => free(r) && (RV.allOut ? !r.benched : r.benched)); if (!bench.length) return false;
    RV.assistCd = B.t + 0.8;                                              // one look at a time
    if (Math.random() >= Dd.assist) return false;
    const r = RV.allOut ? bench.sort((x, y) => dist(x, v) - dist(y, v))[0] : bench.sort((x, y) => y.hp / y.hpMax - x.hp / x.hpMax)[0], K = r.def.kit;
    RV.assist -= 1; RV.assistCd = B.t + 5; RV.stats.assists++;
    if (RV.allOut) {
      if (r.act) cancelAct(r);
      const d = ang(v, a); r.x = v.x + Math.sin(d) * (v.rad + 0.7); r.z = v.z + Math.cos(d) * (v.rad + 0.7); r.face = ang(r, a);
      Object.assign(r, { state: 'idle', dodge: null, pick: null, gap: 0, airY: 0 }); r.anim.state = 'idle'; r.queue.length = 0;
      FX.burst(r.x, 1, r.z, 12, { col: [0xffffff, 0xff3a4a], speed: 3, size: 0.09, life: 0.3, g: -2 });
    } else { leave(v); enter(r, 'assist', { x: v.x, z: v.z, face: ang(v, a) }); }
    r.swapInv = B.t + 0.6; r.tgt = a; r.tgtUntil = B.t + 3;
    const A2 = BT.startAct(r, K.assist, { tgt: a, kind: 'assist', dur: 0.5 }); A2.dir = ang(r, a); A2.threats = []; A2.flashes = []; A2.tele = []; A2.locks = {};
    r.queue.push({ def: K.followup, kind: 'followup', delay: 0.02 });
    SFX.play('parry'); B.freeze = Math.max(B.freeze, 0.12);
    const p = new THREE.Vector3(); BT.sock(r, 'weapon', p);
    FX.glow(p.x, p.y, p.z, 2.6, 0xff9aa0, 0.3, { size1: 4.5 }); FX.burst(p.x, p.y, p.z, 30, { col: [0xffffff, 0xff9aa0, 0xff3a4a], speed: 8, size: 0.1, life: 0.4 });
    BT.callout('RIVAL ASSIST', 'rival', K.assist.name.replace('Defensive Assist: ', '') + ' · your hit is parried');
    BT.log(`${Dd.name}: ${r.def.short} swaps in and parries (${K.assist.name}).`, 'enemy');
    staggerAgent(a, 0.55, r); dazeAgent(a, r.st.impact * (K.assist.daze || 400) / 100, r);
    decibels(r, 250); gain(r, 8);
    BT.shot({ x: (r.x + a.x) / 2, z: (r.z + a.z) / 2, zoom: 0.78, dur: 0.5, pri: 2 });
    return true;
  }
  /* your Agent reels (parried, blocked): whatever she was doing is over */
  function staggerAgent(a, t, from) {
    if (a.act && window.CHOREO) CHOREO.end(a, a.act);
    a.act = null; a.queue.length = 0; a.dodge = null;
    a.state = 'hit'; a.anim.state = 'hit'; a.anim.t = 0; a.stT = 0; a.hitT = t;
    const d = ang(from, a); a.vx = Math.sin(d) * 4; a.vz = Math.cos(d) * 4;
  }
  /* how a rival Agent takes a hit: a high-level skill's heavy hit staggers her unless her move is
     Anti-Interrupt; anything else only makes her flinch (the white flash), as your Agents do against hers */
  CLASH.react = (v, h, a, A) => {
    if (CLASH.unstoppable(v) || v.state === 'dodge') return;
    const VA = v.act, anti = VA && (VA.def.dr || (VA.def.inv && VA.t >= VA.def.inv[0] && VA.t <= VA.def.inv[1]));
    const kb = (h.kb || 0.15) * 0.4; if (kb > 0 && !anti) { const d = ang(a, v); v.vx += Math.sin(d) * kb * 5; v.vz += Math.cos(d) * kb * 5; }
    if (h.heavy && !anti && A && STAGGER.includes(A.kind)) BT.interrupt(v, 0.45);
  };
  CLASH.unstoppable = (v, force) => {
    const A = v.act; if (!A) return false;
    if (LOCKED.includes(A.kind)) return true;
    const inv = A.def.inv; return !force && !!(inv && A.t >= inv[0] && A.t <= inv[1]);
  };
  CLASH.staggered = v => { v.queue.length = 0; v.pick = null; v.dodge = null; v.gap = 0; };
  CLASH.stunned = v => { v.plans.length = 0; v.queue.length = 0; v.dodge = null; v.pick = null; v.counterUntil = 0; };
  CLASH.hurt = (v, dmg, o) => {
    const B = B_(), RV = B.rival, S = RV && RV.aegis;
    if (v.alive && !(o && (o.cls === 'tick' || o.cls === 'afterburn'))) decibels(v, 30);   // as your Agents get when hit
    if (S && S.hp > 0 && S.until > B.t) {
      const ab = Math.min(S.hp, dmg); S.hp -= ab; dmg -= ab;
      if (ab > 0 && T_().dmgNumbers && Math.random() < 0.25) FX.number(v.x, v.height + 0.2, v.z, 'AEGIS', 'miss');
      if (S.hp <= 0) BT.log(`${RV.diff.name}'s Radiant Aegis breaks.`, 'perfect');
    }
    return dmg;
  };
  CLASH.down = v => {
    const RV = B_().rival; RV.downT = 0;
    BT.log(`${v.def.name} is down!`, 'kill'); BT.callout(`RIVAL ${v.def.short.toUpperCase()} DOWN`, 'perfect', `${RV.squad.filter(r => r.alive).length} left`);
    BT.say(v, 'defeated');
  };

  /* ------------------------------------- your Agent's move: dodge it? --
     As your Agents do against an enemy's attack, a rival decides once, as the
     move begins, whether to dodge it and when (on time: a Perfect Dodge). */
  CLASH.onAgentAct = (a, A) => {
    const B = B_(), T = T_(), RV = B.rival; if (!RV || B.phase !== 'fight') return;
    const v = A.tgt && A.tgt.rival ? A.tgt : onField(); if (!v || !v.alive || v.benched || v.stun > 0) return;
    const d = A.def; if (!d.hits || !d.hits.length || (A.tgt && A.tgt !== v)) return;
    if (dist(a, v) > (d.reach || 2) + 7) return;
    const hi = d.hits.findIndex(h => h.heavy), h = d.hits[hi >= 0 ? hi : 0], sp = A.speed || 1;
    let impact = B.t + h.t / sp; if (h.shape === 'proj') impact += dist(a, v) / (h.speed || 12);
    const k = A.kind === 'ult' || A.kind === 'ult2' || A.kind === 'chain' ? 1.1 : A.kind === 'basic' ? (hi >= 0 ? 0.9 : 0.45) : 0.95;
    if (Math.random() >= v.def.ai.dodge * RV.diff.dodge * k) return;
    const q = clamp(v.def.ai.reflex * RV.diff.reflex, 0.03, 0.95), r = Math.random();
    const off = r < q ? rnd(0.03, Math.max(0.05, T.perfectWin - 0.02)) : r < q + (1 - q) * 0.75 ? rnd(T.perfectWin + 0.03, 0.34) : rnd(0.5, 0.7);
    v.plans.push({ at: impact - off, a, A, perfect: r < q });
  };
  function tryDodge(e, p) {
    const B = B_(), T = T_(), RV = B.rival;
    if (e.stun > 0 || !['idle', 'act', 'move'].includes(e.state) || e.dodgeCharges <= 0) return;
    if (p.a.act !== p.A) return;                                       // that move is already over
    if (e.act) {
      const A = e.act, inv = A.def.inv;
      if (LOCKED.includes(A.kind) || (inv && A.t >= inv[0] && A.t <= inv[1])) return;
      if (A.kind !== 'basic' && Math.random() < 0.5) return;          // committed to a skill
      cancelAct(e);
    }
    e.dodgeCharges--; if (e.dodgeCharges <= 0) e.dodgeCd = T.dodgeCd;
    e.queue = e.queue.filter(q => q.kind === 'followup'); e.pick = null; RV.stats.dodges++;
    e.dodge = { t0: B.t, until: B.t + 0.38, perfectOK: p.perfect };
    e.state = 'dodge'; e.anim.state = 'dodge'; e.anim.t = 0; e.stT = 0;
    const away = ang(p.a, e), side = Math.random() < 0.5 ? 1 : -1, dir = away + side * 1.1;
    e.anim.side = side; e.vx = Math.sin(dir) * 8; e.vz = Math.cos(dir) * 8;
    SFX.play('dodge'); FX.burst(e.x, 0.3, e.z, 6, { col: [0xffffff, 0xff9aa0], speed: 2, size: 0.08, life: 0.25, g: 0 });
  }

  /* ------------------------------------------------------------ the end -- */
  CLASH.finish = (B, result) => {
    const RV = B.rival;
    if (result === 'lose') for (const r of fieldRivals()) if (!(r.stun > 0)) { cancelAct(r); r.state = 'win'; r.anim.state = 'win'; }
    BT.log(`${RV.diff.name}: "${result === 'win' ? RV.diff.lose : RV.diff.win}"`, 'enemy');
  };

  window.CLASH = CLASH;
})();
