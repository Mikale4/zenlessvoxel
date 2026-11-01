/* ============================================================================
   battle.js -- the battle: a squad of three Agents (one on the field at a
   time) against waves of enemies, in real time. The Agents fight on their
   own (ai.js); you command them, the way Pallet to Pewter's trainer does:
     Swap (Space / C / 1-3) - on an enemy's flash it becomes an Assist, while
       your Agent is launched it becomes a Quick Assist
     Chain Attacks - pick who follows up when a Stunned enemy takes a heavy hit
     Ultimate (Q) when an Agent's Decibels hit MAXIMUM, EX call (E)
     Focus target (Tab / click), Tactics menu (Esc) that stops time, AUTO (T)
   Rules follow the official game (data.js RULES); numbers are tunable.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, R = D.RULES;
  const { clamp, rnd, dist, ang, wrap, turn } = U;
  const BT = window.BT = { B: null, T: null, hooks: {} };

  /* ------------------------------------------------------------ helpers -- */
  const atkOf = a => {
    let atk = a.st.atk;
    if (BT.B.aegis && BT.B.aegis.atkUntil > BT.B.t && a === active()) atk += 600;  // Radiant Aegis: the bearer's ATK
    if (BT.B.veil > BT.B.t) atk += 290;                                          // Ether Veil: Delusion Reprise
    return atk;
  };
  const active = () => BT.B && BT.B.squad[BT.B.active];
  BT.active = active;
  const alive = list => list.filter(e => e.alive);
  const sockWorld = (e, name, out) => {
    const s = e.model.sockets && e.model.sockets[name];
    if (!s) { (out || (out = new THREE.Vector3())).set(e.x, e.height * (name === 'head' ? 0.9 : 0.55), e.z); return out; }
    return e.rig.socket(s[0], s[1], out);
  };
  BT.sock = sockWorld;
  function log(text, cls) { if (BT.hooks.log) BT.hooks.log(text, cls); }
  function callout(text, cls, sub) { if (BT.hooks.callout) BT.hooks.callout(text, cls, sub); }
  BT.log = log; BT.callout = callout;

  /* -------------------------------------------------------- entities -- */
  function makeEnt(type, id, def, modelId) {
    const M = MODELS[modelId], rig = VX.rig(modelId, M);
    const obj = new THREE.Group(), body = new THREE.Group();
    body.add(rig.root); obj.add(body); BT.world.scene.add(obj);
    return {
      type, id, def, model: M, rig, obj, body, kind: M.kind || 'humanoid', x: 0, z: 0, face: 0, vx: 0, vz: 0, airY: 0, alive: true,
      seed: rnd(0, 10), stance: def.stance || 'brute', height: rig.height, rad: Math.max(0.42, (M.width || 14) * M.scale * 0.3),
      anim: { state: 'idle', t: 0, th: 0.3, dur: 1, act: null, phase: 0, speed: 0, side: 1 }, state: 'idle', stT: 0, act: null, cds: {}, flash: 0,
    };
  }
  /* the model an Agent wears: her chosen form (Aria: idol or construct) */
  BT.modelFor = (id, look) => { const f = D.AGENTS[id].forms, k = look && look[id]; return f && k && f[k] && MODELS[f[k].model] ? f[k].model : id; };
  function makeAgent(id, slot, look) {
    const def = D.AGENTS[id], modelId = BT.modelFor(id, look), a = makeEnt('agent', id, def, modelId);
    a.modelId = modelId;
    Object.assign(a, {
      slot, st: Object.assign({}, def.stats), hpMax: def.stats.hp, hp: def.stats.hp, energy: def.resource === 'adrenaline' ? def.energyMax : 45, decibels: 600,
      dodgeCharges: R.dodgeCharges, dodgeCd: 0, combo: 0, lastBasic: -9, queue: [], gap: 0, counterUntil: 0, launchedUntil: 0,
      heat: 100, nitro: true, tp: 0, auric: 0, meditation: 0, delusion: 0, cheer: 0, noIce: false, ppBuff: 0, impactUp: 0, adrBoost: 0, auricAnomCd: 0, exCall: false,
    });
    if (def.id === 'aria') a.st.ap += 45;                              // Innate Stage Presence
    if (def.sheer) a.st.sheer = 0.3 * a.st.atk + 0.1 * a.hpMax;       // Grandmaster of Mysticism
    a.obj.visible = false;
    return a;
  }
  function makeEnemy(id) {
    const T = BT.T, def = D.ENEMIES[id], e = makeEnt('enemy', id, def, def.model);
    const hp = Math.round(def.hp * T.enemyHp);
    Object.assign(e, {
      rank: def.rank, poise: def.poise, hpMax: hp, hp, atk: def.atk, def_: def.def, daze: 0, dazeMax: def.daze, stun: 0, stunMax: def.stunDur, chainsLeft: 0, chainsUsed: 0,
      bu: {}, buMul: {}, anom: null, corrCd: 0, scorched: false, afterburnCd: 0, flinch: 0, vuln: 0, atkCd: rnd(0.8, 2.2) / T.aggro, phase: 1, recover: 0,
      hpLag: hp, dazeShown: 0, offBalance: 0,
    });
    if (e.rank === 'boss') e.rad = Math.max(e.rad, 1.1); else if (e.rank === 'elite') e.rad = Math.max(e.rad, 0.7);
    return e;
  }
  function makeCompanion(owner, modelId) {
    const c = makeEnt('companion', modelId, { stance: 'float' }, modelId);
    Object.assign(c, { owner, y: 2.2, flap: 0, dive: 0, diveX: 0, diveZ: 0 });
    c.obj.visible = false; return c;
  }
  function disposeEnt(e) { if (!e) return; BT.world.scene.remove(e.obj); e.rig.dispose(); }

  /* ------------------------------------------------------------- start -- */
  BT.init = (world, tuning) => { BT.world = world; BT.T = tuning; };
  BT.start = opts => {
    BT.end();
    const T = BT.T, enc = D.ENCOUNTERS[opts.arena][opts.encounter];
    const built = BT.world.loadArena(opts.arena);
    const B = BT.B = {
      opts, arena: built.A, built, bounds: built.bounds, obstacles: built.obstacles || [], barrels: (built.barrels || []).map(b => Object.assign({ alive: true }, b)),
      t: 0, real: 0, phase: 'intro', introT: 0, squad: opts.squad.map((id, i) => makeAgent(id, i, opts.look)), active: 0, enemies: [], projs: [], threats: [], zones: [],
      wave: 0, waves: enc.waves, enc, addsDone: false, assist: Math.min(R.assistPointsMax, T.assistPoints != null ? T.assistPoints : R.assistPointsStart),
      swapCd: 0, chain: null, cutin: null, slow: null, freeze: 0, paused: false, aegis: null, veil: 0, fandom: [], focus: null,
      cam: { x: 0, z: 2, zoom: 1, yaw: 0, k: 4, shake: 0, shot: null }, hazardT: rnd(8, 12), result: null, auto: !!T.auto,
      eh: { swing: 0, out: 0, assist: 0, perfect: 0, dodged: 0, inv: 0, block: 0, hit: 0 },
      stats: { dmg: 0, perfect: 0, assists: 0, chains: 0, stuns: 0, anomalies: 0, disorders: 0, ults: 0, taken: 0, maxHit: 0 },
    };
    B.companions = B.squad.filter(a => a.id === 'yixuan').map(a => makeCompanion(a, 'inkbird'));
    const a = active(); a.obj.visible = true; a.x = 0; a.z = 4.5; a.face = Math.PI;
    for (const c of B.companions) if (c.owner === a) showCompanion(c, true);
    spawnWave(0);
    log(`${B.arena.name}: ${enc.name}`, 'sys');
    if (BT.hooks.start) BT.hooks.start(B);
    return B;
  };
  BT.end = () => {
    const B = BT.B; if (!B) return;
    for (const e of [...B.squad, ...B.enemies, ...B.companions]) disposeEnt(e);
    for (const p of B.projs) if (p.fx) FX.kill(p.fx);
    for (const f of B.fandom) FX.kill(f.fx);
    FX.clear(); BT.B = null;
  };
  function spawnWave(i) {
    const B = BT.B, ids = B.waves[i]; B.wave = i;
    ids.forEach((id, k) => {
      const e = makeEnemy(id), n = ids.length;
      e.x = (k - (n - 1) / 2) * (n > 3 ? 2.6 : 3.2) + rnd(-0.4, 0.4); e.z = -2.8 + rnd(-0.8, 0.8) - (e.rank !== 'minion' ? 1 : 0); e.face = 0; e.airY = 6 + k * 0.8;
      e.spawnT = 0.5 + k * 0.15; B.enemies.push(e);
    });
    if (i > 0) { callout(`WAVE ${i + 1}`, 'wave'); log(`Wave ${i + 1}: ${ids.map(id => D.ENEMIES[id].name).join(', ')}`, 'sys'); }
    else log(`Enemies: ${ids.map(id => D.ENEMIES[id].name).join(', ')}`, 'sys');
  }

  /* ------------------------------------------------------- the actions -- */
  function startAct(e, def, opts) {
    opts = opts || {};
    e.act = { def, t: 0, hi: 0, tgt: opts.tgt || null, dir: e.face, kind: opts.kind || 'basic', fired: {}, data: opts, dur: opts.dur || def.dur };
    e.state = 'act'; e.stT = 0;
    Object.assign(e.anim, { state: 'act', t: 0, act: def, th: def.hits && def.hits.length ? def.hits[0].t : Math.min(0.3, def.dur * 0.5), dur: e.act.dur });
    return e.act;
  }
  BT.startAct = startAct;
  function endAct(e) {
    e.act = null; e.state = 'idle'; e.stT = 0; e.anim.state = 'idle'; e.anim.act = null;
  }
  BT.endAct = endAct;
  /* step a running action: turn, lunge, fire its hits on time */
  function stepAct(e, dt) {
    const A = e.act, d = A.def;
    A.t += dt * (A.speed || 1); e.anim.t = A.t;
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    const firstHit = d.hits && d.hits.length ? d.hits[0].t : 0.2;
    if (tgt && A.t < firstHit - (e.type === 'enemy' ? 0.22 : 0)) { A.dir = ang(e, tgt); }
    e.face = turn(e.face, A.dir, 1 - Math.exp(-18 * dt));
    for (const mv of [d.move, d.move2]) {
      if (!mv || A.t < mv[0] || A.t - dt > mv[1]) continue;
      const span = Math.max(0.01, mv[1] - mv[0]), k = (Math.min(A.t, mv[1]) - Math.max(A.t - dt, mv[0])) / span;
      let distance = mv[2];
      if (tgt && distance > 0 && e.type === 'agent') distance = Math.min(distance, Math.max(0, dist(e, tgt) - tgt.rad - e.rad * 0.6));
      if (tgt && distance > 0 && e.type === 'enemy' && !(d.hits && d.hits.some(h => h.shape === 'line'))) distance = Math.min(distance, Math.max(0, dist(e, tgt) - 0.9));
      e.x += Math.sin(A.dir) * distance * k; e.z += Math.cos(A.dir) * distance * k;
    }
    if (d.adrenalinePerSec && e.type === 'agent') gainEnergy(e, d.adrenalinePerSec * dt, true);
    while (d.hits && A.hi < d.hits.length && A.t >= d.hits[A.hi].t) {
      const h = d.hits[A.hi++];
      if (e.type === 'agent') BT.agentHit(e, h, A); else BT.enemyHit(e, h, A);
      if (!e.act) return;
    }
    if (A.t >= A.dur) { const then = d.then; endAct(e); if (e.type === 'agent' && then) e.queue.unshift({ def: e.def.kit[then], kind: 'core' }); if (e.type === 'agent' && BT.hooks.actEnd) BT.hooks.actEnd(e, A); }
  }
  BT.stepAct = stepAct;

  /* ------------------------------------------------------ resources -- */
  function gainEnergy(a, n, raw) {
    const T = BT.T; a.energy = Math.min(a.def.energyMax, a.energy + n * (raw ? 1 : T.energyRate));
  }
  function spendEnergy(a, n) {
    a.energy = Math.max(0, a.energy - n);
    if (a.id === 'burnice') { a.heat = Math.min(100, a.heat + n * 1.4); if (a.heat >= 50) a.nitro = true; }
    if (a.id === 'yixuan') a.tp = Math.min(120, a.tp + n * 0.667);
  }
  BT.gainEnergy = gainEnergy; BT.spendEnergy = spendEnergy;
  function gainDecibels(a, n) {
    const B = BT.B, T = BT.T; n *= T.decibelRate;
    for (const s of B.squad) if (s.alive) s.decibels = Math.min(R.decibelMax, s.decibels + (s === a ? n : n * R.decibelShare));
  }
  BT.gainDecibels = gainDecibels;
  function gainAssist(n) { const B = BT.B; B.assist = Math.min(R.assistPointsMax, B.assist + n); }

  /* ----------------------------------------------------------- damage -- */
  const defMult = def => 794 / (794 + def);
  function resMult(v, attr) { const d = v.def; if (!d || !d.weak) return 1; const a = attr === 'auric' ? 'ether' : attr; return d.weak.includes(a) || d.weak.includes(attr) ? 1.2 : d.resist.includes(a) || d.resist.includes(attr) ? 0.8 : 1; }
  function stunMult(v) { if (v.stun <= 0) return 1; return R.stunMult + (v.rank === 'boss' ? 0.25 * v.chainsUsed : 0); }
  BT.resMult = resMult;
  /* a direct hit from an Agent */
  function agentDamage(a, v, h, attr, A) {
    const T = BT.T, B = BT.B;
    const sheer = !!a.def.sheer, base = sheer ? (0.3 * atkOf(a) + 0.1 * a.hpMax) : atkOf(a);
    let dmg = base * h.mult / 100;
    let cr = a.st.cr, cd = a.st.cd + (a.meditation > B.t ? 0.4 : 0);
    const crit = Math.random() < cr; if (crit) dmg *= 1 + cd;
    let bonus = 1;
    if (h.stunBonus && v.stun > 0) bonus += h.stunBonus;
    if (A && A.def.delusionBoost) bonus += 0.5;
    if (a.id === 'yixuan' && A && ['auric', 'eruption', 'ex', 'ex2', 'exAlt', 'followup', 'chain', 'ult', 'ult2'].includes(A.kind)) bonus += 0.4; // core: skill DMG +
    if (v.vuln > B.t) bonus += 0.25;                                         // Battle Spirit
    dmg *= bonus * (sheer ? 1 : defMult(v.def_)) * resMult(v, attr) * stunMult(v) * T.agentDmg;
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }
  /* anomaly-type damage (ticks, bursts, Disorder, Afterburn, Abloom): scales with AP */
  function anomalyDamage(src, v, pct, attr, atkSnap, apSnap) {
    const T = BT.T, B = BT.B;
    let dmg = (atkSnap || atkOf(src)) * pct / 100 * ((apSnap || src.st.ap) / 100);
    dmg *= defMult(v.def_) * resMult(v, attr) * stunMult(v) * (v.vuln > B.t ? 1.25 : 1) * T.agentDmg;
    return Math.max(1, Math.round(dmg));
  }
  BT.anomalyDamage = anomalyDamage;
  /* subtract HP from an enemy, record it, show it */
  function hurtEnemy(v, dmg, o) {
    const B = BT.B, T = BT.T;
    if (!v.alive) return;
    v.hp -= dmg; v.flash = 1; B.stats.dmg += dmg; B.stats.maxHit = Math.max(B.stats.maxHit, dmg);
    if (T.dmgNumbers) {
      const col = o.color || (D.ATTR[o.attr] ? D.ATTR[o.attr].color : '#fff');
      FX.number(v.x, v.height * 0.75 + (o.dy || 0), v.z, U.fmt(dmg), (o.crit ? 'crit ' : '') + (o.big ? 'big ' : '') + (o.cls || ''), col);
    }
    if (v.hp <= 0) killEnemy(v, o.src);
  }
  BT.hurtEnemy = hurtEnemy;
  function killEnemy(v, src) {
    const B = BT.B;
    v.hp = 0; v.alive = false; v.act = null; v.state = 'dead'; v.anim.state = 'dead'; v.stT = 0; v.stun = 0;
    B.threats = B.threats.filter(t => t.e !== v);
    log(`${v.def.name} is defeated.`, 'kill'); SFX.play('down');
    if (B.chain && B.chain.tgt === v) closeChain();
    if (B.focus === v) B.focus = null;
  }

  /* ----------------------------------------------- Daze, Stun, Chains -- */
  function addDaze(a, v, amount) {
    const B = BT.B, T = BT.T;
    if (v.stun > 0 || !v.alive) return;
    let k = T.dazeRate * (a.impactUp > B.t ? 1.2 : 1) * (v.flinch > 0 ? 1 + D.ANOMALY.assault.flinchDaze : 1);
    v.daze += amount * k;
    if (v.daze >= v.dazeMax) stunEnemy(v, a);
  }
  BT.addDaze = addDaze;
  function stunEnemy(v, a) {
    const B = BT.B;
    v.daze = v.dazeMax; v.stun = v.stunMax; v.act = null; v.state = 'stun'; v.anim.state = 'stun'; v.stT = 0;
    v.chainsLeft = Math.min(R.chains[v.rank] || 1, alive(B.squad).length); v.chainsUsed = 0;
    B.threats = B.threats.filter(t => t.e !== v);
    B.stats.stuns++; callout('STUNNED', 'stun', v.def.name); log(`${v.def.name} is Stunned! (${v.chainsLeft} Chain Attack${v.chainsLeft > 1 ? 's' : ''})`, 'stun');
    SFX.play('stun'); gainDecibels(a, 150);
    FX.glow(v.x, v.height * 0.8, v.z, 2.5, 0xfff0a0, 0.4, { size1: 4 });
  }
  function maybeChain(a, v, A) {
    const B = BT.B;
    if (B.chain || v.stun <= 0 || v.chainsLeft <= 0 || !v.alive) return;
    if (A && A.kind === 'chain' && B.chainLast === A) return;
    const opts = alive(B.squad).filter(s => s !== a);
    if (!opts.length) return;
    v.chainsLeft--;
    B.chain = { tgt: v, opts: opts.slice(0, 2), timer: BT.T.chainWindow, from: a, count: (B.chainCount || 0) };
    callout('CHAIN ATTACK', 'chain'); SFX.play('chain');
    if (BT.hooks.chainOpen) BT.hooks.chainOpen(B.chain);
  }
  function closeChain() {
    const B = BT.B; if (!B.chain) return; B.chain = null; B.chainCount = 0; if (BT.hooks.chainClose) BT.hooks.chainClose();
  }
  BT.chainPick = idx => {
    const B = BT.B, C = B.chain; if (!C) return false;
    const ag = C.opts[idx]; if (!ag || !ag.alive) return false;
    const v = C.tgt; B.chain = null; if (BT.hooks.chainClose) BT.hooks.chainClose();
    v.chainsUsed++; B.chainCount = (B.chainCount || 0) + 1;
    swapIn(ag, 'chain', v);
    ag.x = v.x + Math.sin(ang(v, ag) || 0) * (v.rad + 1.2); ag.z = v.z + Math.cos(ang(v, ag) || 0) * (v.rad + 1.2); ag.face = ang(ag, v);
    const A = startAct(ag, ag.def.kit.chain, { tgt: v, kind: 'chain' }); B.chainLast = A;
    onSkillStart(ag, ag.def.kit.chain, A);
    gainAssist(R.assistGain); B.stats.chains++; gainDecibels(ag, 300);
    log(`${ag.def.short}: ${ag.def.kit.chain.name}`, 'chain'); callout(ag.def.kit.chain.name.replace('Chain Attack: ', ''), 'skill', ag.def.short);
    shot({ x: v.x, z: v.z, zoom: 0.72, dur: 0.9, pri: 3, yaw: rnd(-0.4, 0.4) });
    return true;
  };
  BT.chainSkip = () => { const B = BT.B; if (!B.chain) return; closeChain(); };

  /* ---------------------------------------------------------- anomalies -- */
  function addBuildup(a, v, attr, amount, mul) {
    const B = BT.B, T = BT.T;
    if (!v.alive || !amount) return;
    const type = D.ATTR[attr].anomaly, A0 = D.ANOMALY[type]; if (!A0) return;
    v.bu[type] = (v.bu[type] || 0) + amount * (a.st.am / 100) * T.anomalyRate * (mul || 1) * (resMult(v, attr) > 1 ? 1.2 : resMult(v, attr) < 1 ? 0.8 : 1);
    const max = v.def.buMax * (v.buMul[type] || 1);
    if (v.bu[type] >= max) { v.bu[type] = 0; v.buMul[type] = Math.min(2, (v.buMul[type] || 1) * 1.2); triggerAnomaly(a, v, type); }
  }
  BT.addBuildup = addBuildup;
  function squadHas(test) { return BT.B.squad.some(test); }
  function triggerAnomaly(a, v, type) {
    const B = BT.B, A = D.ANOMALY[type];
    const atk = atkOf(a), ap = a.st.ap;
    if (v.anom && v.anom.type !== type && v.anom.t > 0) disorder(a, v, v.anom);
    let dur = A.dur;
    if (type === 'burn' && squadHas(s => s.id === 'burnice') && squadHas(s => s.id !== 'burnice' && (s.def.spec === 'Anomaly' || s.def.faction === 'Sons of Calydon'))) dur += 3; // Fire Kindling
    if ((type === 'corruption' || type === 'auric') && squadHas(s => s.id === 'aria') && squadHas(s => s.id !== 'aria' && ['Stun', 'Support', 'Anomaly'].includes(s.def.spec))) dur += 3; // Collaborative Stage
    v.anom = { type, t: dur, dur, src: a, atk, ap, tick: 0 };
    B.stats.anomalies++;
    callout(A.name.toUpperCase(), 'anomaly ' + type, v.def.name); log(`${v.def.name}: ${A.name}! (${a.def.short})`, 'anomaly'); SFX.play('anomaly');
    FX.glow(v.x, v.height * 0.6, v.z, 2.4, D.ATTR[A.attr].hex, 0.45, { size1: 4 });
    gainDecibels(a, 60);
    if (A.burst) hurtEnemy(v, anomalyDamage(a, v, A.burst, A.attr, atk, ap), { attr: A.attr, src: a, big: true, cls: 'anom' });
    if (type === 'assault') { v.flinch = A.flinch; interrupt(v, 0.8, true); }
    else if (resMult(v, A.attr) > 1 || v.poise < 2) interrupt(v, 0.5, true);
    if (type === 'auric' && a.id === 'yixuan' && a.auricAnomCd <= B.t) { a.auricAnomCd = B.t + 10; gainEnergy(a, 10, true); }
  }
  function disorder(a, v, old) {
    const B = BT.B, A = D.ANOMALY[old.type];
    const pct = A.disorderBase + A.disorderPerSec * Math.max(0, old.t);
    const dmg = anomalyDamage(a, v, pct, A.attr, atkOf(a), a.st.ap);
    v.anom = null; B.stats.disorders++;
    callout('DISORDER', 'disorder', v.def.name); log(`Disorder on ${v.def.name}: ${U.fmt(dmg)}`, 'anomaly');
    hurtEnemy(v, dmg, { attr: A.attr, src: a, big: true, cls: 'disorder', color: '#ffffff' });
    addDaze(a, v, 200);
    FX.ring(v.x, v.z, 0.4, 3.5, 0xffffff, 0.4); FX.glow(v.x, 1.2, v.z, 3, 0xffffff, 0.3, { size1: 5 });
  }
  function tickAnomaly(v, dt) {
    const B = BT.B, an = v.anom; if (!an) return;
    an.t -= dt; const A = D.ANOMALY[an.type];
    if (A.tick) { an.tick += dt; while (an.tick >= A.tick) { an.tick -= A.tick; hurtEnemy(v, anomalyDamage(an.src, v, A.tickMult, A.attr, an.atk, an.ap), { attr: A.attr, src: an.src, cls: 'tick', dy: -0.3 }); if (!v.alive) return; } }
    if (an.t <= 0) v.anom = null;
  }
  /* Corruption and Shock: extra damage whenever the enemy is hit (rate limited) */
  function anomalyOnHit(v) {
    const B = BT.B, an = v.anom; if (!an) return;
    const A = D.ANOMALY[an.type]; if (!A.onHit || v.corrCd > B.t) return;
    v.corrCd = B.t + A.onHitCd;
    hurtEnemy(v, anomalyDamage(an.src, v, A.onHit, A.attr, an.atk, an.ap), { attr: A.attr, src: an.src, cls: 'tick', dy: -0.3 });
  }

  /* -------------------------------------------- Agent hits on enemies -- */
  function enemiesIn(shape, cx, cz, r, dir, arcDeg, len) {
    const B = BT.B, out = [];
    for (const v of B.enemies) {
      if (!v.alive || v.spawnT > 0) continue;
      const dx = v.x - cx, dz = v.z - cz, d = Math.hypot(dx, dz);
      if (shape === 'circle') { if (d <= r + v.rad) out.push(v); continue; }
      if (shape === 'line') {
        const along = dx * Math.sin(dir) + dz * Math.cos(dir), side = Math.abs(dx * Math.cos(dir) - dz * Math.sin(dir));
        if (along > -0.5 && along < (len || 7) + v.rad && side < r + v.rad) out.push(v); continue;
      }
      if (d > r + v.rad) continue;
      const da = Math.abs(wrap(Math.atan2(dx, dz) - dir));
      if (d < v.rad + 0.6 || da <= (arcDeg || 120) * Math.PI / 360 + Math.atan2(v.rad, Math.max(d, 0.1))) out.push(v);
    }
    return out;
  }
  BT.enemiesIn = enemiesIn;
  BT.agentHit = (a, h, A) => {
    const B = BT.B, T = BT.T;
    const tgt = A.tgt && A.tgt.alive ? A.tgt : BT.pickTarget(a);
    const attr = h.attr || a.def.attr, cols = FX.colors(attr), dir = A.dir;
    const shape = h.shape || 'arc', reach = (A.def.reach || 1.6);
    if (shape === 'proj') { spawnProj(a, h, A, tgt, attr); SFX.play(attr === 'fire' ? 'fire' : 'ether'); return; }
    let cx = a.x, cz = a.z, r = h.r || reach + 0.7;
    if (h.at === 'target' && tgt) { cx = tgt.x; cz = tgt.z; }
    else if (h.at === 'front') { cx = a.x + Math.sin(dir) * 1.3; cz = a.z + Math.cos(dir) * 1.3; }
    let victims = enemiesIn(shape, cx, cz, r, dir, h.arc, h.len);
    if (!victims.length && tgt && shape !== 'circle' && dist(a, tgt) < reach + tgt.rad + 0.9) victims = [tgt];
    // visuals
    if (h.fx) FX.named(h.fx, { x: cx, z: cz, yaw: dir, attr, r, fromX: a.x, fromZ: a.z, len: h.len, y: 1 });
    if (shape === 'arc' && !h.fx) FX.slash(a.x, 1.0, a.z, Math.min(2.4, r), dir, cols[1], { tilt: rnd(-0.6, 0.6), arc: (h.arc || 120) * Math.PI / 180 + 0.4 });
    if (!h.fx && shape !== 'arc' && victims.length) FX.slash(a.x, 1.0, a.z, 1.8, dir, cols[1], { tilt: rnd(-0.5, 0.5) });
    SFX.play(h.heavy ? 'heavy' : attr === 'fire' && h.fx ? 'fire' : 'swing');
    for (const v of victims) applyHit(a, v, h, A, attr);
    barrelCheck(cx, cz, r, attr, h.heavy, a);
  };
  /* everything one landed hit does */
  function applyHit(a, v, h, A, attr) {
    const B = BT.B, T = BT.T, kit = a.def.kit;
    if (!v.alive) return;
    const res = agentDamage(a, v, h, attr, A);
    hurtEnemy(v, res.dmg, { attr, crit: res.crit, src: a, big: A.kind === 'ult' || A.kind === 'chain' });
    const p = new THREE.Vector3(); sockWorld(v, 'chest', p);
    FX.hitSpark(p.x, p.y, p.z, attr, h.heavy, res.crit);
    if (!v.alive) { gainDecibels(a, 40); return; }
    addDaze(a, v, a.st.impact * (h.daze || 0) / 100);
    let buMul = 1;
    if (a.id === 'burnice' && ['hold', 'ex', 'ex2'].includes(A.kind) && squadHas(s => s.id !== 'burnice' && (s.def.spec === 'Anomaly' || s.def.faction === 'Sons of Calydon'))) buMul *= 1.65; // Fire Kindling
    if (a.id === 'aria' && A.kind === 'charged') buMul *= 1 + 0.1 * (A.data.ppBuff || 0);
    if (a.delusion > B.t && attr === 'ether') buMul *= 1.3;
    addBuildup(a, v, attr, h.bu || 0, buMul);
    anomalyOnHit(v);
    // energy and decibels by skill type
    const en = { basic: 1.0, dash: 1.2, special: 2, counter: 5, quick: 4, followup: 5, hold: 0.8, charged: 2, core: 1.5 }[A.kind] || 0;
    if (a.def.resource !== 'adrenaline') gainEnergy(a, en); else if (A.kind === 'counter') gainEnergy(a, 3, true);
    gainDecibels(a, { basic: 8, dash: 8, special: 18, ex: 30, ex2: 30, counter: 40, quick: 60, followup: 60, chain: 40, hold: 8, charged: 30, core: 25 }[A.kind] || 10);
    // Burnice: Scorched, and Afterburn when a teammate hits a Scorched enemy
    const bur = B.squad.find(s => s.id === 'burnice' && s.alive);
    if (a.id === 'burnice' && A.def.scorch && a.nitro) { if (!v.scorched) log(`${v.def.name} is Scorched.`, 'anomaly'); v.scorched = true; }
    if (bur && a !== bur && v.scorched && bur.heat >= 8 && v.afterburnCd <= B.t) {
      bur.heat -= 8; v.afterburnCd = B.t + 1.5; if (bur.heat <= 0) exitNitro(bur);
      const mult = 220 * (1 + Math.min(0.3, bur.st.ap / 1000));
      const dmg = Math.round(atkOf(bur) * mult / 100 * defMult(v.def_) * resMult(v, 'fire') * stunMult(v) * (v.vuln > B.t ? 1.25 : 1) * T.agentDmg);
      hurtEnemy(v, dmg, { attr: 'fire', src: bur, cls: 'afterburn' });
      addBuildup(bur, v, 'fire', 80, squadHas(s => s.id !== 'burnice' && (s.def.spec === 'Anomaly' || s.def.faction === 'Sons of Calydon')) ? 1.65 : 1);
      FX.named('flameRing', { x: v.x, z: v.z, r: 1.2, attr: 'fire' });
    }
    // Aria: Fandom Power, Abloom
    if (a.id === 'aria') {
      if (A.def.fandom && !A.fandomDone) { A.fandomDone = true; addFandom(v.x, v.z, A.def.fandom); }
      if (A.kind === 'charged' && h.heavy && v.anom) abloom(a, v);
    }
    // reactions
    if (v.stun <= 0) react(v, h, a);
    if (h.heavy) maybeChain(a, v, A);
  }
  BT.applyHit = applyHit;
  function react(v, h, a) {
    const B = BT.B;
    const kb = (h.kb || 0.15) * (v.rank === 'minion' ? 1 : v.rank === 'elite' ? 0.35 : 0);
    if (kb > 0) { const d = ang(a, v); v.vx += Math.sin(d) * kb * 5; v.vz += Math.cos(d) * kb * 5; }
    const winding = v.act && v.act.t < (v.act.def.hits && v.act.def.hits.length ? v.act.def.hits[0].t * 0.35 : 0.2);
    if (v.poise === 0 && h.heavy) interrupt(v, 0.45);
    else if (v.poise === 1 && h.heavy && winding) interrupt(v, 0.4);
    // otherwise a light hit is just a flinch you can see (the white flash); it does not stop the enemy
  }
  function interrupt(v, t, force) {
    const B = BT.B;
    if (!v.alive || v.stun > 0) return;
    if (v.act) { B.threats = B.threats.filter(th => th.e !== v); if (v.act.tele) for (const f of v.act.tele) FX.kill(f); }
    v.act = null; v.state = 'hit'; v.anim.state = 'hit'; v.anim.t = 0; v.stT = 0; v.hitT = t;
    v.atkCd = Math.max(v.atkCd, t + 0.4);
  }
  BT.interrupt = interrupt;
  function exitNitro(b) {
    b.heat = Math.max(0, b.heat); b.nitro = false;
    for (const v of BT.B.enemies) v.scorched = false;
    log('Burnice leaves the Nitro-Fuel Cocktail state: Scorched fades.', 'anomaly');
  }
  BT.exitNitro = exitNitro;
  function abloom(a, v) {
    const B = BT.B, an = v.anom, A = D.ANOMALY[an.type];
    const full = A.tick ? A.tickMult * (an.dur / A.tick) : A.onHit ? A.onHit * 10 : A.burst || 500;
    const ratio = 0.012 * (a.st.am / 10) * (v.stun > 0 ? 1.5 : 1) * (a.delusion > B.t ? 1.4 : 1);
    const dmg = anomalyDamage(a, v, full * ratio, A.attr, atkOf(a), a.st.ap);
    callout('ABLOOM', 'abloom', v.def.name); log(`Abloom on ${v.def.name}: ${U.fmt(dmg)}`, 'anomaly');
    hurtEnemy(v, dmg, { attr: A.attr, src: a, big: true, cls: 'abloom', color: '#ff9ad0' });
    FX.named('heart', { x: v.x, z: v.z, r: 2.5, attr: 'ether' }); gainDecibels(a, 80);
  }
  function addFandom(x, z, n) {
    const B = BT.B;
    for (let i = 0; i < n && B.fandom.length < 6; i++) {
      const a = rnd(0, Math.PI * 2), r = rnd(1.2, 2.6), px = clamp(x + Math.cos(a) * r, B.bounds[0] + 0.5, B.bounds[2] - 0.5), pz = clamp(z + Math.sin(a) * r, B.bounds[1] + 0.5, B.bounds[3] - 0.5);
      const fx = FX.glow(px, 0.5, pz, 0.7, 0x5fe8e0, 9999, { size1: 0.7 });
      B.fandom.push({ x: px, z: pz, fx, t: 0 });
      FX.burst(px, 0.4, pz, 6, { col: [0x5fe8e0, 0xffffff], speed: 2, size: 0.08, life: 0.4 });
    }
  }
  BT.addFandom = addFandom;
  function spawnProj(a, h, A, tgt, attr) {
    const B = BT.B, from = new THREE.Vector3();
    sockWorld(a, 'weapon', from); if (from.y < 0.5) from.y = 1.1;
    const tx = tgt ? tgt.x : a.x + Math.sin(A.dir) * 6, tz = tgt ? tgt.z : a.z + Math.cos(A.dir) * 6;
    const cols = FX.colors(attr), big = h.fx === 'bignote' || h.fx === 'fireball';
    const fx = FX.glow(from.x, from.y, from.z, big ? 0.9 : 0.55, cols[1], 9999, { size1: big ? 0.9 : 0.55 });
    B.projs.push({ side: 'agent', src: a, h, A, attr, x: from.x, y: from.y, z: from.z, tx, tz, tgt, speed: h.speed || 12, fx, t: 0, life: 1.6 });
  }

  /* ------------------------------------------------ enemy projectiles -- */
  function stepProjs(dt) {
    const B = BT.B;
    for (let i = B.projs.length - 1; i >= 0; i--) {
      const p = B.projs[i]; p.t += dt;
      const tx = p.tgt && p.tgt.alive ? p.tgt.x : p.tx, tz = p.tgt && p.tgt.alive ? p.tgt.z : p.tz;
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      const step = p.speed * dt;
      if (p.side === 'agent') {
        if (d <= step + (p.tgt ? p.tgt.rad * 0.6 : 0.3) || p.t > p.life) {
          p.x = tx; p.z = tz; FX.kill(p.fx);
          const r = p.h.r || 0;
          const victims = r > 0 ? enemiesIn('circle', p.x, p.z, r, 0) : (p.tgt && p.tgt.alive ? [p.tgt] : []);
          if (p.h.fx === 'fireball') FX.named('explode', { x: p.x, z: p.z, r: r || 1.2, attr: 'fire' }); else FX.named('sound', { x: p.x, z: p.z, r: r || 1.2 });
          for (const v of victims) applyHit(p.src, v, p.h, p.A, p.attr);
          barrelCheck(p.x, p.z, r || 0.8, p.attr, p.h.heavy, p.src);
          B.projs.splice(i, 1); continue;
        }
        p.x += dx / d * step; p.z += dz / d * step; p.y += (1.0 - p.y) * Math.min(1, dt * 4);
        p.fx.position.set(p.x, p.y, p.z);
        if (Math.random() < 0.6) FX.p({ x: p.x, y: p.y, z: p.z, life: 0.25, size: 0.14, col: FX.colors(p.attr)[0] });
      } else {
        // enemy shots fly straight at where the Agent was when they were fired
        const ag = active();
        p.x += p.dx * step; p.z += p.dz * step; p.fx.position.set(p.x, p.y, p.z);
        if (Math.random() < 0.5) FX.p({ x: p.x, y: p.y, z: p.z, life: 0.2, size: 0.12, col: 0xff6a4a });
        if (ag && ag.alive && Math.hypot(ag.x - p.x, ag.z - p.z) < ag.rad + 0.25) { FX.kill(p.fx); B.projs.splice(i, 1); BT.incoming(p.e, p.h, p.threat, ag); continue; }
        if (p.t > p.life) { FX.kill(p.fx); B.projs.splice(i, 1); if (p.threat) p.threat.done = true; }
      }
    }
  }
  BT.spawnEnemyProj = (e, h, threat) => {
    const B = BT.B, ag = active(), from = new THREE.Vector3(); sockWorld(e, e.model.sockets.muzzle ? 'muzzle' : 'weapon', from); if (from.y < 0.6) from.y = 1.1;
    const d = Math.max(0.1, Math.hypot(ag.x - from.x, ag.z - from.z));
    const fx = FX.glow(from.x, from.y, from.z, 0.6, h.fx === 'fireball' ? 0xff8a2a : 0xff4a6a, 9999, { size1: 0.6 });
    B.projs.push({ side: 'enemy', e, h, threat, x: from.x, y: 1.1, z: from.z, dx: (ag.x - from.x) / d, dz: (ag.z - from.z) / d, speed: h.speed || 12, fx, t: 0, life: 2.2 });
    SFX.play('shot');
  };

  /* -------------------------------------- the Agent's own special moves -- */
  function onSkillStart(a, def, A) {
    const B = BT.B;
    if (def.cost && !A.data.free) spendEnergy(a, Math.min(a.energy, def.cost));
    if (def.aegis || A.data.aegis) giveAegis(a);
    if (def.heatCost && a.id === 'burnice') { a.heat -= def.heatCost; if (a.heat <= 0) exitNitro(a); }
    if (a.id === 'aria') {
      if (def.fandomStart) addFandom(A.tgt ? A.tgt.x : a.x, A.tgt ? A.tgt.z : a.z, def.fandomStart);
      if (A.kind === 'charged') absorbFandom(a, A);
      if (def === a.def.kit.noIce) a.noIce = false;
      if (def.delusion) { a.delusion = B.t + 15; a.cheer = 3; B.veil = B.t + 30; addFandom(a.x, a.z, 4); log('Aria: Moment of Delusion! Ether Veil: Delusion Reprise (+ATK for the squad).', 'skill'); }
    }
    if (a.id === 'yixuan') {
      if (def.meditation) a.meditation = B.t + 15;
      if (def.evenHp) { const L = alive(B.squad), avg = L.reduce((s, x) => s + x.hp / x.hpMax, 0) / L.length; for (const x of L) x.hp = Math.round(x.hpMax * avg); }
      if (A.kind === 'ult2') { a.tp = 0; a.auric = Math.min(1, a.auric + 1); }
      if (A.kind === 'auric') a.auric = Math.max(0, a.auric - 1);
    }
    if (A.kind === 'ult' || A.kind === 'ult2') {
      for (const s of B.squad) if (s !== a && s.id === 'yixuan' && squadHas(x => ['Stun', 'Support', 'Defense'].includes(x.def.spec))) s.adrBoost = B.t + 10; // Auric Ink Undercurrent
    }
    if (def.noIce) a.noIce = true;
  }
  BT.onSkillStart = onSkillStart;
  function absorbFandom(a, A) {
    const B = BT.B; let n = 0;
    for (let i = B.fandom.length - 1; i >= 0 && n < 2; i--) {
      const f = B.fandom[i]; if (Math.hypot(f.x - a.x, f.z - a.z) > 7) continue;
      FX.beam(new THREE.Vector3(f.x, 0.5, f.z), new THREE.Vector3(a.x, 1.2, a.z), 0x5fe8e0, 0.08, 0.3); FX.kill(f.fx); B.fandom.splice(i, 1); n++;
    }
    A.data.ppBuff = n;
    if (a.cheer > 0) { a.cheer--; A.data.cheer = true; }
    // each absorbed Fandom Power (or All-Out Cheering) charges faster
    const quick = n + (A.data.cheer ? 2 : 0);
    if (quick > 0) { const k = Math.max(0.45, 1 - quick * 0.2); A.speed = 1 / k; }
    if (a.delusion > B.t) A.data.enhanced = true;
  }
  function giveAegis(caesar) {
    const B = BT.B;
    const val = Math.round(caesar.st.impact * 8 + 700);
    B.aegis = { hp: val, max: val, until: B.t + 90, atkUntil: B.t + 95 };
    log(`Caesar: Radiant Aegis (shield ${U.fmt(val)}, +ATK for the bearer).`, 'skill');
    FX.ring(caesar.x, caesar.z, 0.5, 2.2, 0xf4d35e, 0.5); FX.glow(caesar.x, 1.1, caesar.z, 2.2, 0xf4d35e, 0.4);
  }
  function battleSpirit(caesar) {
    const B = BT.B;
    if (!squadHas(s => s !== caesar && (s.def.assist === 'defensive' || s.def.faction === caesar.def.faction))) return;
    for (const v of alive(B.enemies)) if (dist(v, caesar) <= 7) v.vuln = B.t + 30;
  }
  BT.battleSpirit = battleSpirit;

  /* -------------------------------------------------- swapping, assists -- */
  function showCompanion(c, on) { c.obj.visible = on; if (on) { c.x = c.owner.x + 1; c.z = c.owner.z; c.y = 2.4; } }
  function swapIn(ag, why, tgt) {
    const B = BT.B, out = active(), idx = B.squad.indexOf(ag);
    if (out === ag) return;
    if (out) {
      out.obj.visible = false; out.act = null; out.state = 'idle'; out.anim.state = 'idle'; out.queue.length = 0; out.dodge = null;
      FX.burst(out.x, 1, out.z, 14, { col: [0xffffff, D.ATTR[out.def.attr].hex], speed: 3, size: 0.1, life: 0.35, g: -2 });
      for (const c of B.companions) if (c.owner === out) showCompanion(c, false);
      ag.x = out.x; ag.z = out.z; ag.face = out.face;
    }
    B.active = idx; ag.obj.visible = true; ag.state = 'idle'; ag.anim.state = 'idle'; ag.act = null; ag.swapInv = B.t + 0.35; ag.queue.length = 0;
    if (tgt) ag.face = ang(ag, tgt);
    for (const c of B.companions) if (c.owner === ag) showCompanion(c, true);
    FX.glow(ag.x, 1.1, ag.z, 2.4, D.ATTR[ag.def.attr].hex, 0.3, { size1: 3 }); SFX.play('swap');
    for (const th of B.threats) th.plan = null; // the new Agent makes her own defensive plans
    if (BT.hooks.swap) BT.hooks.swap(out, ag, why);
    BT.planDefense && BT.B.threats.forEach(th => BT.planDefense(ag, th));
  }
  BT.swapIn = swapIn;
  /* the live assist opportunity: an incoming flashed hit on the on-field Agent */
  function assistThreat() {
    const B = BT.B, T = BT.T, ag = active();
    let best = null;
    for (const th of B.threats) {
      if (th.done || th.assist || !th.flash || th.target !== ag) continue;
      if (B.t >= th.flashAt - 0.05 && B.t <= th.impactAt + 0.06) { if (!best || th.impactAt < best.impactAt) best = th; }
    }
    return best;
  }
  BT.assistThreat = assistThreat;
  function nextAlive(dir, from) {
    const B = BT.B, n = B.squad.length; let i = from != null ? from : B.active;
    for (let k = 1; k <= n; k++) { const j = (i + dir * k + n * 3) % n; if (B.squad[j].alive && j !== B.active) return B.squad[j]; }
    return null;
  }
  BT.nextAlive = nextAlive;
  /* the Swap command: an Assist on a flash, a Quick Assist when launched, a plain swap otherwise */
  BT.cmdSwap = (dirOrAgent) => {
    const B = BT.B; if (!B || B.phase !== 'fight' || B.cutin || B.chain || B.paused) return false;
    const T = BT.T, out = active();
    const ag = typeof dirOrAgent === 'object' ? dirOrAgent : nextAlive(dirOrAgent || 1);
    if (!ag || !ag.alive || ag === out) return false;
    const th = assistThreat();
    if (th && out.alive) return doAssist(ag, th);
    if (out.launchedUntil > B.t && out.alive) return doQuickAssist(ag);
    if (B.swapCd > 0 && out.alive) return false;
    if (out.act && out.act.def.inv && out.act.t < out.act.def.inv[1] && ['ult', 'chain'].includes(out.act.kind)) return false;
    swapIn(ag, 'swap'); B.swapCd = T.swapCd;
    log(`Swap: ${ag.def.short} is on the field.`, 'cmd');
    return true;
  };
  function doAssist(ag, th) {
    const B = BT.B, out = active();
    const cost = (th.heavy || th.launch) ? (ag.id === 'caesar' ? 1 : R.assistCostHeavy) : R.assistCostLight;
    const e = th.e, defensive = th.flash === 'gold' && B.assist >= cost;
    swapIn(ag, 'assist', e);
    const toward = ang(e, ag), dd = e.rad + 1.1;
    ag.x = e.x + Math.sin(toward) * dd; ag.z = e.z + Math.cos(toward) * dd; ag.face = ang(ag, e);
    const def = ag.def.kit.assist;
    if (defensive) {
      B.assist -= cost; th.assist = { agent: ag, type: 'defensive' };
      startAct(ag, def, { tgt: e, kind: 'assist', dur: Math.max(def.dur, th.impactAt - B.t + 0.12) });
      callout('DEFENSIVE ASSIST', 'assist', def.name.replace('Defensive Assist: ', ''));
      log(`${ag.def.short}: ${def.name} (${cost} Assist Point${cost > 1 ? 's' : ''})`, 'assist');
    } else {
      th.assist = { agent: ag, type: 'evade' };
      ag.dodge = { t0: th.impactAt - 0.05, until: th.impactAt + 0.3, assist: true };
      ag.state = 'dodge'; ag.anim.state = 'dodge'; ag.anim.t = 0; ag.anim.side = 1; ag.stT = 0;
      callout(B.assist < cost && th.flash === 'gold' ? 'NO ASSIST POINTS' : 'PERFECT DODGE', 'assist', 'Assist on a red flash');
      log(`${ag.def.short} switches in on a ${th.flash === 'red' ? 'red flash' : 'flash with no Assist Points'}: Perfect Dodge.`, 'assist');
    }
    if (out.id === 'yixuan' && e.type === 'enemy' && squadHas(s => ['Stun', 'Support', 'Defense'].includes(s.def.spec))) {   // Auric Ink Undercurrent: the lightning strike
      const dmg = Math.round(out.st.sheer * 2.25 * resMult(e, 'auric') * stunMult(e) * BT.T.agentDmg);
      hurtEnemy(e, dmg, { attr: 'auric', src: out, cls: 'afterburn' }); gainEnergy(out, 5, true);
      FX.beam(new THREE.Vector3(e.x, 8, e.z), new THREE.Vector3(e.x, 0.5, e.z), 0xffcf4a, 0.25, 0.25);
    }
    B.stats.assists++;
    return true;
  }
  function doQuickAssist(ag) {
    const B = BT.B, out = active();
    const tgt = BT.pickTarget(out) || B.enemies.find(e => e.alive);
    swapIn(ag, 'quick', tgt);
    out.launchedUntil = 0;
    const A = startAct(ag, ag.def.kit.quick, { tgt, kind: 'quick' });
    callout('QUICK ASSIST', 'assist', ag.def.kit.quick.name.replace('Quick Assist: ', ''));
    log(`${ag.def.short}: ${ag.def.kit.quick.name}`, 'assist');
    if (ag.id === 'aria') ag.noIce = true;
    return true;
  }
  /* the Ultimate command */
  BT.cmdUlt = (agent) => {
    const B = BT.B; if (!B || B.phase !== 'fight' || B.cutin) return false;
    let ag = agent || active();
    if (!ag.alive) return false;
    const yix = ag.id === 'yixuan' && ag.tp >= 120;            // Endless Talisman Suppression (Technique Points) has priority
    if (!yix && ag.decibels < R.decibelMax) return false;
    if (B.chain) { if (ag !== active()) return false; B.chain = null; if (BT.hooks.chainClose) BT.hooks.chainClose(); }
    if (ag !== active()) swapIn(ag, 'ult');
    ag.act = null; ag.dodge = null; ag.queue.length = 0;
    const def = yix ? ag.def.kit.ult2 : ag.def.kit.ult;
    if (!yix) ag.decibels -= R.decibelMax;
    gainAssist(R.assistGain); B.stats.ults++;
    B.cutin = { agent: ag, def, t: 0, dur: BT.T.cutins ? 1.15 : 0.01, kind: yix ? 'ult2' : 'ult' };
    if (BT.hooks.cutin) BT.hooks.cutin(ag, def);
    SFX.play('ult');
    log(`${ag.def.short}: ${def.name}!`, 'ult');
    return true;
  };
  BT.cmdEx = () => { const B = BT.B; if (!B || B.phase !== 'fight') return; const a = active(); a.exCall = true; callout('EX CALL', 'cmd', a.def.short); };
  BT.cmdFocus = (v) => {
    const B = BT.B; if (!B) return;
    const L = alive(B.enemies); if (!L.length) return;
    if (v) B.focus = v; else { const i = L.indexOf(B.focus); B.focus = L[(i + 1) % L.length]; }
    log(`Focus: ${B.focus.def.name}`, 'cmd');
  };
  BT.setAuto = on => { const B = BT.B; if (B) B.auto = on; BT.T.auto = on; };

  /* --------------------------------------- enemy hits on the on-field Agent -- */
  /* resolve one enemy hit against the on-field Agent: assists, dodges, blocks, damage */
  BT.incoming = (e, h, th, ag) => {
    const B = BT.B, T = BT.T;
    ag = ag || active(); if (!ag || !ag.alive || !ag.obj.visible) { if (th) th.done = true; return; }
    if (th) th.done = true;
    // a Perfect Assist swapped in on this hit
    const EH = B.eh;
    if (th && th.assist && th.assist.agent === ag) {
      if (th.assist.type === 'defensive') { EH.assist++; return parry(ag, e, h); }
    }
    // dodging: a Perfect Dodge if the dodge started just before the hit
    if (ag.dodge && B.t <= ag.dodge.until) {
      if (!ag.dodge.perfectDone && B.t - ag.dodge.t0 <= T.perfectWin + 0.02) { EH.perfect++; return perfectDodge(ag, e, ag.dodge.assist); }
      EH.dodged++;
      if (T.dmgNumbers) FX.number(ag.x, ag.height, ag.z, 'MISS', 'miss');
      return;
    }
    if ((ag.act && ag.act.def.inv && ag.act.t >= ag.act.def.inv[0] && ag.act.t <= ag.act.def.inv[1]) || ag.swapInv > B.t) { EH.inv++; if (T.dmgNumbers) FX.number(ag.x, ag.height, ag.z, 'MISS', 'miss'); return; }
    // Caesar's Perfect Block and guard stance (Yixuan's Ink Manifestation blocks too)
    if (ag.act && ag.act.def.perfectBlock && ag.act.t <= ag.act.def.perfectBlock) { EH.block++; return BT.perfectBlock(ag, e, h); }
    if (ag.guardUntil > B.t && h.flash !== 'red') { EH.block++; return BT.guardBlock(ag, e, h); }
    EH.hit++;
    hurtAgent(ag, e, h);
  };
  function parry(ag, e, h) {
    const B = BT.B, def = ag.def.kit.assist;
    SFX.play('parry'); B.freeze = Math.max(B.freeze, 0.12);
    const p = new THREE.Vector3(); sockWorld(ag, 'weapon', p);
    FX.glow(p.x, p.y, p.z, 2.6, 0xfff0a0, 0.3, { size1: 4.5 }); FX.burst(p.x, p.y, p.z, 30, { col: [0xffffff, 0xfff0a0, 0xf4d35e], speed: 8, size: 0.1, life: 0.4 });
    addDaze(ag, e, ag.st.impact * (def.daze || 400) / 100 * (h.heavy ? 1.2 : 1));
    if (e.alive && e.stun <= 0) interrupt(e, e.rank === 'boss' ? 0.6 : 0.9, true);
    gainDecibels(ag, 250); gainEnergy(ag, 8);
    if (ag.id === 'caesar') { ag.impactUp = B.t + 3; battleSpirit(ag); }
    shot({ x: (ag.x + e.x) / 2, z: (ag.z + e.z) / 2, zoom: 0.75, dur: 0.6, pri: 2, roll: rnd(-0.06, 0.06) });
    if (e.def.cancelsFollowUp && Math.random() < 0.35) { callout('FOLLOW-UP CANCELLED', 'warn', e.def.name); if (BT.hooks.glitch) BT.hooks.glitch(); return; }
    ag.queue.unshift({ def: ag.def.kit.followup, kind: 'followup', tgt: e, delay: 0.1 });
  }
  function perfectDodge(ag, e, viaAssist) {
    const B = BT.B, T = BT.T;
    ag.dodge.perfectDone = true; B.stats.perfect++;
    callout('PERFECT DODGE', 'perfect'); SFX.play('perfect');
    B.slow = { s: viaAssist ? 0.2 : 0.3, t: 0.5 };
    ag.counterUntil = B.t + 1.0; ag.counterTgt = e && e.type === 'enemy' ? e : null;
    gainDecibels(ag, 150); if (ag.def.resource === 'adrenaline') gainEnergy(ag, 5, true); else gainEnergy(ag, 4);
    FX.glow(ag.x, 1.1, ag.z, 2.2, 0x9ad8ff, 0.35, { size1: 3.5 });
    log(`${ag.def.short}: Perfect Dodge!`, 'perfect');
  }
  BT.perfectDodge = perfectDodge;
  function hurtAgent(ag, e, h) {
    const B = BT.B, T = BT.T;
    let dmg = e.atk * h.mult / 100 * defMult(ag.st.def) * T.enemyDmg;
    if (ag.act && ag.act.def.dr) dmg *= 1 - ag.act.def.dr;
    dmg = Math.round(dmg * rnd(0.95, 1.05));
    if (B.aegis && B.aegis.hp > 0 && B.aegis.until > B.t) { const ab = Math.min(B.aegis.hp, dmg); B.aegis.hp -= ab; dmg -= ab; if (B.aegis.hp <= 0) { log('Radiant Aegis breaks.', 'warn'); B.aegis.atkUntil = B.t + 5; } }
    ag.hp -= dmg; ag.flash = 1; B.stats.taken += dmg;
    if (T.dmgNumbers && dmg > 0) FX.number(ag.x, ag.height * 0.8, ag.z, U.fmt(dmg), 'hurt', '#ff5a5a');
    FX.burst(ag.x, 1, ag.z, h.heavy ? 14 : 7, { col: [0xffffff, 0xff6a5a], speed: 4, size: 0.09, life: 0.3 });
    SFX.play(h.heavy ? 'heavy' : 'hit');
    gainDecibels(ag, 30);
    const shielded = B.aegis && B.aegis.hp > 0 && B.aegis.until > B.t;
    if (ag.hp <= 0) return agentDown(ag);
    const anti = (ag.act && ag.act.def.dr) || shielded;
    if (h.launch) {
      ag.act = null; ag.queue.length = 0; ag.state = 'down'; ag.anim.state = 'down'; ag.anim.t = 0; ag.stT = 0; ag.downT = 1.25; ag.launchedUntil = B.t + 1.25;
      const d = ang(e, ag); ag.vx = Math.sin(d) * 7; ag.vz = Math.cos(d) * 7;
      callout('LAUNCHED', 'warn', 'Swap now for a Quick Assist'); B.cam.shake = Math.max(B.cam.shake, 0.35);
      log(`${ag.def.short} is launched! (Quick Assist ready)`, 'warn');
    } else if (!anti || h.heavy) {
      ag.act = null; ag.queue.length = 0; ag.state = 'hit'; ag.anim.state = 'hit'; ag.anim.t = 0; ag.stT = 0; ag.hitT = h.heavy ? 0.5 : 0.25;
      const d = ang(e, ag); ag.vx = Math.sin(d) * (h.heavy ? 4 : 1.5); ag.vz = Math.cos(d) * (h.heavy ? 4 : 1.5);
      if (h.heavy) B.cam.shake = Math.max(B.cam.shake, 0.22);
    }
  }
  BT.hurtAgent = hurtAgent;
  function agentDown(ag) {
    const B = BT.B;
    ag.hp = 0; ag.alive = false; ag.act = null; ag.state = 'dead'; ag.anim.state = 'dead'; ag.stT = 0; ag.queue.length = 0;
    log(`${ag.def.name} is down!`, 'warn'); callout(`${ag.def.short.toUpperCase()} DOWN`, 'warn');
    B.downSwap = 1.0;
  }

  /* ----------------------------------------------- arena hazards & barrels -- */
  function barrelCheck(x, z, r, attr, heavy, a) {
    const B = BT.B;
    for (const b of B.barrels) {
      if (!b.alive) continue;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d <= r + 0.4 && (attr === 'fire' || heavy)) explodeBarrel(b, a);
    }
  }
  function explodeBarrel(b, a) {
    const B = BT.B, T = BT.T;
    b.alive = false; b.obj.visible = false;
    FX.named('explode', { x: b.x, z: b.z, r: 2.8, attr: 'fire' }); SFX.play('boom'); B.cam.shake = Math.max(B.cam.shake, 0.4);
    callout('FUEL BARREL', 'hazard'); log('A fuel barrel explodes!', 'hazard');
    for (const v of enemiesIn('circle', b.x, b.z, 2.8, 0)) { hurtEnemy(v, Math.round((v.rank === 'minion' ? 0.12 : 0.03) * v.hpMax), { attr: 'fire', src: a, big: true }); if (v.alive) { addBuildup(a, v, 'fire', 400); addDaze(a, v, 150); } }
    const ag = active();
    if (T.hazards && ag && ag.alive && Math.hypot(ag.x - b.x, ag.z - b.z) < 2.6) BT.incoming({ atk: ag.hpMax * 0.07 / 0.5 / defMult(ag.st.def) / T.enemyDmg, def: { name: 'Fuel barrel' }, x: b.x, z: b.z, rad: 0 }, { mult: 50, heavy: true }, null, ag);
    for (const o of B.barrels) if (o.alive && Math.hypot(o.x - b.x, o.z - b.z) < 2.8) setTimeout(() => { if (BT.B === B && o.alive) explodeBarrel(o, a); }, 220);
  }
  function hazards(dt) {
    const B = BT.B, T = BT.T, ag = active();
    for (let i = B.zones.length - 1; i >= 0; i--) {
      const zn = B.zones[i]; zn.t -= dt;
      if (zn.t <= 0) { B.zones.splice(i, 1); continue; }
      zn.tick -= dt;
      if (zn.tick <= 0 && zn.live && ag && ag.alive && Math.hypot(ag.x - zn.x, ag.z - zn.z) < zn.r) {
        zn.tick = 0.5; const dmg = Math.round(ag.hpMax * 0.012 * T.enemyDmg); ag.hp -= dmg; if (T.dmgNumbers) FX.number(ag.x, ag.height, ag.z, U.fmt(dmg), 'hurt', '#b88aff'); if (ag.hp <= 0) agentDown(ag);
      }
    }
    if (!T.hazards || !ag || !ag.alive) return;
    B.hazardT -= dt; if (B.hazardT > 0) return;
    const id = B.arena.id;
    if (id === 'summit') {                                         // miasma pools well up under the Agent
      B.hazardT = rnd(9, 13);
      const x = ag.x + rnd(-0.6, 0.6), z = ag.z + rnd(-0.6, 0.6), r = 1.7;
      FX.telegraph(x, z, r, 0xa060ff, 1.4);
      const zn = { x, z, r, t: 7.4, tick: 1.4, live: false }; B.zones.push(zn);
      setTimeout(() => { if (BT.B === B) { zn.live = true; FX.zone(x, z, r, 0x8040ff, 6); } }, 1400 / Math.max(0.2, BT.T.speed));
      log('Miasma wells up from the flagstones.', 'hazard');
    } else if (id === 'stage') {                                    // a stage light rig comes down: dodge it
      B.hazardT = rnd(10, 14);
      const fake = { atk: 0, def: { name: 'Falling stage light' }, x: ag.x, z: ag.z, rad: 0, alive: true, hazard: true };
      BT.enemyLikeHazard(fake, ag.x, ag.z, 1.6, 1.3);
    } else if (id === 'outer') {                                    // a stray barrel of fuel rolls in
      B.hazardT = rnd(16, 22);
      const dead = B.barrels.filter(b => !b.alive); if (dead.length) { const b = U.pick(dead); b.alive = true; b.obj.visible = true; log('Someone rolls out another fuel barrel.', 'hazard'); }
    }
  }
  /* a telegraphed hazard strike the Agents can dodge (it registers as a red-flash threat) */
  BT.enemyLikeHazard = (src, x, z, r, delay) => {
    const B = BT.B, T = BT.T, ag = active();
    FX.telegraph(x, z, r, 0xff4a6a, delay);
    const th = { e: src, hit: { mult: 0, heavy: true, launch: true, flash: 'red' }, target: ag, impactAt: B.t + delay, flashAt: B.t + delay - T.flashLead, flash: 'red', heavy: true, launch: true, hazard: { x, z, r } };
    B.threats.push(th); if (BT.planDefense) BT.planDefense(ag, th);
  };

  /* ------------------------------------------------------- the director -- */
  function shot(o) { const B = BT.B; if (!B || BT.T.calmCam) return; if (B.cam.shot && B.cam.shot.t < B.cam.shot.dur && (B.cam.shot.pri || 0) > (o.pri || 0)) return; B.cam.shot = Object.assign({ t: 0, dur: 0.5, zoom: 0.8, yaw: 0, roll: 0, pri: 0 }, o); }
  BT.shot = shot;
  function camUpdate(dt) {
    const B = BT.B, C = B.cam, cam = BT.world.camera, ag = active();
    let tx = 0, tz = 1, zoom = 1.05, yaw = 0, roll = 0, rate = 3;
    const pts = [];
    if (ag && ag.obj.visible) pts.push(ag);
    const tgt = ag && BT.pickTarget(ag); if (tgt) pts.push(tgt);
    for (const v of B.enemies) if (v.alive && v !== tgt && pts.length < 4 && ag && dist(v, ag) < 7) pts.push(v);
    if (pts.length) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
      tx = (x0 + x1) / 2; tz = (z0 + z1) / 2 + 0.4; const spread = Math.hypot(x1 - x0, (z1 - z0) * 1.4);
      zoom = clamp(0.72 + spread * 0.07, 0.8, 1.45); yaw = clamp(-tx * 0.025, -0.25, 0.25);
    }
    if (B.cutin) {
      const a = B.cutin.agent, f = a.face, k = U.easeOut(Math.min(1, B.cutin.t / 0.35));
      const px = a.x + Math.sin(f) * 2.6 + Math.cos(f) * 0.8, pz = a.z + Math.cos(f) * 2.6 - Math.sin(f) * 0.8;
      cam.position.set(px, 1.5 + (1 - k) * 0.5, pz); cam.lookAt(a.x, a.height * 0.72, a.z); cam.rotation.z += Math.sin(B.cutin.t * 2) * 0.02;
      C.x = a.x; C.z = a.z; return;
    }
    const S = C.shot; if (S && S.t < S.dur && !BT.T.calmCam) { S.t += dt; tx = S.x; tz = S.z + 0.4; zoom = S.zoom; yaw = S.yaw || yaw; roll = S.roll || 0; rate = 7; }
    if (B.phase === 'intro') { zoom = 1.25 - Math.min(1, B.introT / 1.6) * 0.2; tz = -1; }
    if (BT.T.calmCam) { zoom = Math.max(zoom, 1.15); rate = 2; }
    const k = 1 - Math.exp(-rate * dt);
    C.x += (tx - C.x) * k; C.z += (tz - C.z) * k; C.zoom += (zoom - C.zoom) * k; C.yaw += (yaw - C.yaw) * (1 - Math.exp(-2 * dt)); C.roll = (C.roll || 0) + (roll - (C.roll || 0)) * k;
    const d = 12.2 * C.zoom, hgt = 8.2 * C.zoom;
    let px = C.x + Math.sin(C.yaw) * d, pz = C.z + Math.cos(C.yaw) * d, py = hgt;
    if (C.shake > 0) { C.shake = Math.max(0, C.shake - dt * 1.6); const s = C.shake * 0.35; px += rnd(-s, s); py += rnd(-s, s); pz += rnd(-s, s); }
    cam.position.set(px, py, pz); cam.lookAt(C.x, 0.9, C.z - 0.4); cam.rotation.z += C.roll;
  }

  /* --------------------------------------------------------- the loop -- */
  BT.update = (rdt) => {
    const B = BT.B, T = BT.T; if (!B) return;
    B.real += rdt;
    // time: impact freezes, slow motion, the chain choice, cut-ins, the tactics menu
    let ts = T.speed;
    if (B.paused) ts = 0;
    else if (B.cutin) ts = 0;
    else if (B.chain) ts *= T.chainSlow;
    else if (B.freeze > 0) { B.freeze -= rdt; ts = 0; }
    else if (B.slow && B.slow.t > 0) { B.slow.t -= rdt; ts *= B.slow.s; }
    const dt = Math.min(0.05, rdt) * ts;
    if (B.chain && !B.paused) { B.chain.timer -= rdt * (T.speed || 1); if (B.chain.timer <= 0) { if (T.autoChain || B.auto) BT.chainPick(BT.bestChain ? BT.bestChain() : 0); else closeChain(); } }
    if (B.cutin && !B.paused) {
      B.cutin.t += rdt;
      if (B.cutin.t >= B.cutin.dur) {
        const C = B.cutin; B.cutin = null; if (BT.hooks.cutinEnd) BT.hooks.cutinEnd();
        const tgt = BT.pickTarget(C.agent);
        const A = startAct(C.agent, C.def, { tgt, kind: C.kind }); onSkillStart(C.agent, C.def, A);
        shot({ x: tgt ? tgt.x : C.agent.x, z: tgt ? tgt.z : C.agent.z, zoom: 0.95, dur: C.def.dur, pri: 4, yaw: rnd(-0.3, 0.3) });
      }
    }
    if (B.phase === 'intro') {
      B.introT += rdt;
      if (B.introT > 1.6) { B.phase = 'fight'; callout('FIGHT', 'fight'); }
    }
    if (dt > 0) {
      B.t += dt;
      if (B.swapCd > 0) B.swapCd -= dt;
      stepWorld(dt);
    }
    // companions, animation, FX, camera keep moving even when the battle is frozen (they use dt=0 then)
    for (const e of [...B.squad, ...B.enemies]) { if (e.obj.visible || e.type === 'enemy') { e.obj.position.set(e.x, 0, e.z); e.obj.rotation.y = e.face; ANIM.apply(e, Math.max(dt, B.cutin && e === B.cutin.agent ? rdt * 0.4 : 0), B.t); flashTint(e, rdt); } }
    stepCompanions(dt, rdt);
    if (B.built.anim) B.built.anim(B.real, rdt);
    FX.update(dt, rdt);
    camUpdate(B.cutin ? rdt : rdt);
    if (BT.hooks.frame) BT.hooks.frame(B, rdt);
  };
  function flashTint(e, rdt) {
    if (e.flash > 0) e.flash = Math.max(0, e.flash - rdt * 6);
    const B = BT.B, m = e.rig.mat;
    let r = e.flash * 0.9, g = e.flash * 0.9, b = e.flash * 0.9;
    if (e.type === 'enemy' && e.alive) {
      if (e.stun > 0) { const s = 0.25 + 0.15 * Math.sin(B.real * 10); r += s; g += s * 0.85; }
      else if (e.anom) { const c = D.ATTR[D.ANOMALY[e.anom.type].attr].hex, s = 0.12 + 0.08 * Math.sin(B.real * 8); r += ((c >> 16) & 255) / 255 * s; g += ((c >> 8) & 255) / 255 * s; b += (c & 255) / 255 * s; }
      if (e.scorched) r += 0.08 + 0.05 * Math.sin(B.real * 12);
    }
    m.emissive.setRGB(Math.min(1, r), Math.min(1, g), Math.min(1, b));
  }
  function stepWorld(dt) {
    const B = BT.B, T = BT.T, ag = active();
    // spawning enemies drop in
    for (const e of B.enemies) if (e.spawnT > 0) { e.spawnT -= dt; e.airY = Math.max(0, e.airY - dt * 14); if (e.spawnT <= 0) { e.airY = 0; FX.ring(e.x, e.z, 0.3, 1.6, 0xffffff, 0.3); } }
    // timers on Agents
    for (const a of B.squad) {
      if (!a.alive) continue;
      if (a.dodgeCd > 0) { a.dodgeCd -= dt; if (a.dodgeCd <= 0) a.dodgeCharges = R.dodgeCharges; }
      if (a.dodge && B.t > a.dodge.until) { a.dodge = null; if (a.state === 'dodge') { a.state = 'idle'; a.anim.state = 'idle'; } }
      const on = a === ag;
      if (a.def.resource === 'adrenaline') gainEnergy(a, (on ? 2.2 : 1.0) * dt + (a.adrBoost > B.t ? 2 * dt : 0), true);
      else gainEnergy(a, a.st.er * (on ? 1 : 0.45) * dt);
      if (a.id === 'burnice' && !a.nitro && a.heat >= 50) a.nitro = true;
    }
    // the Radiant Aegis
    if (B.aegis && B.aegis.until <= B.t && B.aegis.hp > 0) { B.aegis.hp = 0; B.aegis.atkUntil = B.t + 5; }
    // Fandom Power tokens bob
    for (const f of B.fandom) { f.t += dt; f.fx.position.y = 0.5 + Math.sin(f.t * 3) * 0.12; }
    // the AI: Agents, enemies, and (on AUTO) the commander
    if (B.phase === 'fight') {
      BT.thinkAgents(dt);
      BT.thinkEnemies(dt);
      if (B.auto) BT.thinkCommander(dt);
    }
    stepProjs(dt);
    // enemy timers, anomalies
    for (const v of B.enemies) {
      if (!v.alive) { v.stT += dt; if (v.stT > 1.4 && v.obj.visible) { v.obj.visible = false; FX.burst(v.x, 0.8, v.z, 20, { col: [0x9a9aa8, 0xffffff, 0x5a5a66], speed: 3, size: 0.12, life: 0.5, g: -1 }); } continue; }
      tickAnomaly(v, dt);
      if (v.flinch > 0) v.flinch -= dt;
      if (v.stun > 0) {
        v.stun -= dt; v.daze = v.dazeMax * Math.max(0, v.stun / v.stunMax);
        if (v.stun <= 0) { v.stun = 0; v.daze = 0; v.state = 'idle'; v.anim.state = 'idle'; v.chainsLeft = 0; log(`${v.def.name} recovers from Stun.`, 'sys'); if (B.chain && B.chain.tgt === v) closeChain(); }
      }
      // boss adds and phases
      if (v.rank === 'boss' && !B.addsDone && B.enc.adds && v.hp / v.hpMax <= B.enc.adds.at) {
        B.addsDone = true; log(`${v.def.name} calls for backup!`, 'warn'); callout('REINFORCEMENTS', 'wave');
        B.enc.adds.ids.forEach((id, k) => { const e = makeEnemy(id); e.x = (k ? 1 : -1) * 7; e.z = -4; e.airY = 6; e.spawnT = 0.6 + k * 0.2; B.enemies.push(e); });
      }
      if (v.def.phase2 && v.phase === 1 && v.hp / v.hpMax <= v.def.phase2.at) { v.phase = 2; callout('PHASE 2', 'wave', v.def.phase2.name); log(`${v.def.name} enters phase 2: ${v.def.phase2.name}.`, 'warn'); }
    }
    hazards(dt);
    // the on-field Agent went down: bring in the next one
    if (B.downSwap > 0) {
      B.downSwap -= dt;
      if (B.downSwap <= 0) { const nx = nextAlive(1); if (nx) { swapIn(nx, 'forced'); log(`${nx.def.short} steps in.`, 'cmd'); } else return finish('lose'); }
    }
    // the wave is cleared
    if (B.phase === 'fight' && B.enemies.length && B.enemies.every(e => !e.alive) && !B.waveDelay) B.waveDelay = 1.6;
    if (B.waveDelay > 0) {
      B.waveDelay -= dt;
      if (B.waveDelay <= 0) {
        B.waveDelay = 0;
        for (const e of B.enemies) disposeEnt(e); B.enemies = []; B.threats = [];
        if (B.wave + 1 < B.waves.length) spawnWave(B.wave + 1); else return finish('win');
      }
    }
  }
  function finish(result) {
    const B = BT.B; if (B.result) return;
    B.result = result; B.phase = 'end'; closeChain();
    const ag = active(); if (result === 'win' && ag && ag.alive) { ag.state = 'win'; ag.anim.state = 'win'; ag.act = null; }
    SFX.play(result === 'win' ? 'win' : 'lose');
    callout(result === 'win' ? 'MISSION CLEAR' : 'MISSION FAILED', result === 'win' ? 'clear' : 'fail');
    log(result === 'win' ? 'All enemies defeated.' : 'The whole squad is down.', 'sys');
    setTimeout(() => { if (BT.B === B && BT.hooks.finish) BT.hooks.finish(B); }, 2200);
  }
  BT.finish = finish;
  BT.retreat = () => { const B = BT.B; if (!B || B.result) return; B.result = 'retreat'; B.phase = 'end'; if (BT.hooks.finish) BT.hooks.finish(B); };

  /* companions: Yixuan's ink bird flies at her shoulder and swoops in on her wing strikes */
  function stepCompanions(dt, rdt) {
    const B = BT.B;
    for (const c of B.companions) {
      const o = c.owner; if (!c.obj.visible) continue;
      const A = o.act, wingMove = A && /wings|ultYixuan|exYixuan|auric|array/.test(A.def.anim || '');
      let tx, tz, ty;
      if (wingMove && A.tgt && A.tgt.alive) { const k = Math.sin(Math.min(1, A.t / A.dur) * Math.PI); tx = U.lerp(o.x, A.tgt.x, k * 0.9); tz = U.lerp(o.z, A.tgt.z, k * 0.9); ty = 2.4 + k * 1.2; }
      else { tx = o.x - Math.sin(o.face) * 0.6 + Math.cos(o.face) * 0.9; tz = o.z - Math.cos(o.face) * 0.6 - Math.sin(o.face) * 0.9; ty = 2.35; }
      const k = 1 - Math.exp(-(wingMove ? 9 : 4) * Math.max(dt, rdt * 0.2));
      const px = c.x, pz = c.z; c.x += (tx - c.x) * k; c.z += (tz - c.z) * k; c.y += (ty - c.y) * k;
      const sp = Math.hypot(c.x - px, c.z - pz) / Math.max(1e-4, rdt);
      if (sp > 0.3) c.face = turn(c.face, Math.atan2(c.x - px, c.z - pz), 1 - Math.exp(-6 * rdt)); else c.face = turn(c.face, o.face, 1 - Math.exp(-3 * rdt));
      c.flap += rdt * (wingMove ? 16 : 8);
      const P = c.rig.parts, f = Math.sin(c.flap) * (wingMove ? 0.9 : 0.55);
      if (P.armL) P.armL.rotation.z = 0.15 + f; if (P.armR) P.armR.rotation.z = -0.15 - f;
      if (P.tail) P.tail.rotation.x = 0.2 + Math.sin(c.flap * 0.5) * 0.15;
      c.obj.position.set(c.x, c.y + Math.sin(B.real * 2.4) * 0.12, c.z); c.obj.rotation.y = c.face;
      if (wingMove && Math.random() < 0.5) FX.p({ x: c.x, y: c.y, z: c.z, life: 0.4, size: 0.12, col: Math.random() < 0.5 ? 0x141418 : 0xffcf4a, vy: -0.5 });
    }
  }
})();
