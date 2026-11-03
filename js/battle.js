/* ============================================================================
   battle.js -- the battle: a squad of three Agents (one on the field at a
   time) against waves of enemies, in real time. The Agents fight on their
   own (ai.js); you command them, the way Pallet to Pewter's trainer does:
     Swap (W / Q / 1-3) - on an enemy's flash it becomes an Assist, while
       your Agent is launched it becomes a Quick Assist
     Chain Attacks - pick who follows up when a Stunned enemy takes a heavy hit
     Ultimate (R) when an Agent's Decibels hit MAXIMUM, EX call (E)
     Focus target (Tab / click), Tactics menu (Esc) that stops time, AUTO (T)
   With AUTO off you also move the Agent on the field (arrow keys / touch
   stick); she still picks and throws her attacks herself.
   PROXY CLASH (opts.clash): the "enemies" are a rival Proxy's Agents, fought
   with their own kits; clash.js drives them and the hooks below hand it the
   rival's hits, the hits on a rival, and its swaps, downs and win. In an
   All-Out clash (B.allOut) your whole squad is on the field at once: active()
   is the one you lead, fielded() all of them; Swap then picks whom you lead,
   and assists, Quick Assists and Chain Attacks send a teammate in without a
   swap.
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
    if (BT.B.zeroIn > BT.B.t) atk += 255;                                        // Orphie & Magus: Zeroed In
    for (const s of BT.B.squad) if (s.def.mech && s.def.mech.atkFor) atk += s.def.mech.atkFor(s, a) || 0;   // a teammate's buff (js/agents/)
    return atk;
  };
  const active = () => BT.B && BT.B.squad[BT.B.active];
  BT.active = active;
  /* an Agent's own mechanics, from her file in js/agents/ (def.mech): init, squad, start, hit, mods, tick, swap,
     anomaly, resolve, ai, hud. mech(a, 'hit', ...) calls the one she has, if she has it */
  const mech = (a, k, ...args) => { const M = a && a.def && a.def.mech; return M && M[k] ? M[k](a, ...args) : undefined; };
  BT.mech = mech;
  /* can she fire her Ultimate now: MAXIMUM Decibels, Yixuan's Technique Points, or her own file's rule (mech.ult) */
  BT.ultReady = ag => !!ag && (ag.decibels >= R.decibelMax || (ag.id === 'yixuan' && ag.tp >= 120) || !!mech(ag, 'ult'));
  /* the Agents on the field: the one you lead, or (an All-Out Proxy Clash) every one still standing */
  const fielded = () => { const B = BT.B; if (!B) return []; if (B.allOut) return B.squad.filter(a => a.alive); const a = active(); return a && a.alive ? [a] : []; };
  BT.fielded = fielded;
  const onFieldA = a => BT.B.allOut ? a.alive : a === active();
  // moves an Agent will not be pulled out of to help a teammate
  const BUSY = ['ult', 'ult2', 'chain', 'assist', 'quick'];
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
  /* moments anyone can listen for (TRAINING does): BT.on(fn) calls fn(kind, data) for 'skill', 'dodge', 'perfect',
     'swap', 'assist', 'parry', 'quick', 'stun', 'chain', 'ult', and 'frame' every frame; it returns the way to stop */
  const listeners = [];
  BT.on = fn => { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; };
  BT.emit = (kind, data) => { for (const f of listeners.slice()) f(kind, data); };

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
      slot, st: Object.assign({}, def.stats), hpMax: def.stats.hp, hp: def.stats.hp, baseHp: def.stats.hp, energy: def.resource === 'adrenaline' ? def.energyMax : 45, decibels: 600,
      dodgeCharges: R.dodgeCharges, dodgeCd: 0, combo: 0, lastBasic: -9, queue: [], gap: 0, counterUntil: 0, launchedUntil: 0,
      heat: 100, nitro: true, tp: 0, auric: 0, meditation: 0, delusion: 0, cheer: 0, noIce: false, ppBuff: 0, impactUp: 0, adrBoost: 0, auricAnomCd: 0, exCall: false,
      voltage: 0, might: 0, momentum: 0, bheat: 100, radiance: 0, flares: 0, pflow: false, ffdReady: false, refr: 0, reflect: 0, huweiT: 2.5, corrT: 2, phaseT: 0,
    });
    if (def.id === 'aria') a.st.ap += 45;                              // Innate Stage Presence
    mech(a, 'init');
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
  function disposeEnt(e) {
    if (!e) return; BT.world.scene.remove(e.obj); e.rig.dispose();
    for (const r of [e.rigHome, e.rigAlt]) if (r && r !== e.rig) r.dispose();   // Aria's other form
  }
  // for clash.js: the rival Proxy's Agents are built from the same parts
  BT.makeEnt = makeEnt; BT.makeCompanion = makeCompanion; BT.disposeEnt = disposeEnt;
  // the companions that come with an Agent: Yixuan's ink bird, Ju Fufu's Hu Wei (Magus is no companion:
  // it is Orphie's own tail, part of her model)
  const COMPANION = BT.COMPANION = { yixuan: 'inkbird', jufufu: 'huwei' };
  /* passives that depend on who else is in the squad */
  function squadSetup(B) {
    const S = B.squad;
    S.forEach((a, i) => {
      // Remielle's Attribute Flux: her light takes on the attribute of the next Agent in the squad
      if (a.id === 'remielle') { const nx = S[(i + 1) % S.length]; a.flux = nx && nx !== a && nx.def.attr !== 'lumiflux' ? nx.def.attr : 'physical'; }
      // Qingyi's Three Verses: with an Attack Agent or a teammate from her faction, more Daze, and ATK from Impact over 120
      if (a.id === 'qingyi' && S.some(s => s !== a && (s.def.spec === 'Attack' || s.def.faction === a.def.faction))) { a.qyBoost = true; a.st.atk += Math.min(600, Math.max(0, a.st.impact - 120) * 6); }
      // Orphie's Forged in Flames: with a Stun or Support Agent, Aftershocks under Zeroed In ignore 25% DEF
      if (a.id === 'orphie' && S.some(s => s !== a && (s.def.spec === 'Stun' || s.def.spec === 'Support'))) a.orFIF = true;
    });
    for (const a of S) mech(a, 'squad', B);                              // the Additional Abilities in the Agents' own files
    // Remielle's Invitation to Bloom: the squad's ATK rises with each other Anomaly Agent
    const rem = S.find(s => s.id === 'remielle');
    if (rem) {
      const n = S.filter(s => s !== rem && s.def.spec === 'Anomaly').length, k = [0, 0.06, 0.12, 0.4][n] || 0;
      if (k) { const add = Math.round(rem.st.atk * k); for (const s of S) s.st.atk += add; B.bloomLog = `Invitation to Bloom: the squad gains +${add} ATK.`; }
    }
  }

  /* ------------------------------------------------------------- start -- */
  BT.init = (world, tuning) => { BT.world = world; BT.T = tuning; };
  /* this fight's multiplier on a rate (a meal, a coffee, a dive's Resonia: B.buff) */
  const BUFF = k => (BT.B && BT.B.buff && BT.B.buff[k]) || 1;
  BT.start = opts => {
    BT.end();
    const T = BT.T, clash = !!(opts.clash && window.CLASH), allOut = clash && CLASH.modeOf(opts.clash, opts.squad.length).allOut;
    const enc = clash ? { name: 'Proxy Clash', waves: [[]] } : opts.enc || D.ENCOUNTERS[opts.arena][opts.encounter];   // (TRAINING brings its own)
    const built = BT.world.loadArena(opts.arena);
    const B = BT.B = {
      opts, arena: built.A, built, bounds: built.bounds, obstacles: built.obstacles || [], barrels: (built.barrels || []).map(b => Object.assign({ alive: true }, b)),
      t: 0, real: 0, phase: 'intro', introT: 0, squad: opts.squad.map((id, i) => makeAgent(id, i, opts.look)), active: 0, enemies: [], projs: [], threats: [], zones: [],
      wave: 0, waves: enc.waves, enc, addsDone: false, assist: Math.min(R.assistPointsMax, T.assistPoints != null ? T.assistPoints : R.assistPointsStart),
      swapCd: 0, chain: null, cutin: null, slow: null, freeze: 0, paused: false, aegis: null, veil: 0, fandom: [], focus: null,
      cam: { x: 0, z: 2, zoom: 1, yaw: 0, k: 4, shake: 0, shot: null }, hazardT: rnd(8, 12), result: null, auto: !!T.auto && !opts.tutorial, allOut,
      eh: { swing: 0, out: 0, assist: 0, perfect: 0, dodged: 0, inv: 0, block: 0, hit: 0 },
      stats: { dmg: 0, perfect: 0, assists: 0, chains: 0, stuns: 0, anomalies: 0, disorders: 0, ults: 0, taken: 0, maxHit: 0 },
    };
    // a meal at Waterfall Soup, the day's coffee, a dive's Resonia: multipliers on this fight; a dive's HP carried over
    B.buff = Object.assign({ dmg: 1, daze: 1, db: 1, energy: 1, anomaly: 1, hp: 1, assist: 0 }, opts.buff || {});
    if (B.buff.assist) B.assist = Math.min(R.assistPointsMax, B.assist + B.buff.assist);
    B.companions = [];
    for (const s of B.squad) if (COMPANION[s.id]) B.companions.push(makeCompanion(s, COMPANION[s.id]));
    squadSetup(B);
    const a = active(); a.obj.visible = true; a.x = 0; a.z = 4.5; a.face = Math.PI;
    for (const c of B.companions) if (c.owner === a || c.id === 'huwei') showCompanion(c, true);
    if (clash) {
      // Agent against Agent: both squads get the same deeper HP pool, so a fight lasts
      const hpK = (T.clashHp || 1) * CLASH.modeOf(opts.clash, B.squad.length).hp;
      for (const s of B.squad) { s.hpMax = Math.round(s.baseHp * hpK); s.hp = s.hpMax; }
      // All-Out: the whole squad takes the field, side by side
      if (allOut) B.squad.forEach((s, i) => { s.obj.visible = true; s.x = (i - (B.squad.length - 1) / 2) * 2.6; s.z = 4.5; s.face = Math.PI; for (const c of B.companions) if (c.owner === s) showCompanion(c, true); });
      CLASH.start(B);
    } else spawnWave(0);
    if (B.buff.hp !== 1) for (const s of B.squad) { s.hpMax = Math.round(s.hpMax * B.buff.hp); s.hp = s.hpMax; }
    if (opts.carry) {                                                   // a dive: each Agent comes in with the HP she left the last fight with
      for (const s of B.squad) { const f = opts.carry[s.id]; if (f == null) continue; s.hp = Math.max(0, Math.round(s.hpMax * f)); if (s.hp <= 0) { s.alive = false; s.state = 'dead'; s.obj.visible = false; } }
      if (!B.squad[B.active].alive) { const nx = B.squad.find(s => s.alive); if (nx) { B.squad[B.active].obj.visible = false; B.active = B.squad.indexOf(nx); nx.obj.visible = true; nx.x = 0; nx.z = 4.5; nx.face = Math.PI; } }
    }
    log(`${B.arena.name}: ${enc.name}`, 'sys');
    if (opts.buffNote) log(opts.buffNote, 'skill');
    if (B.bloomLog) log(B.bloomLog, 'skill');
    const rem = B.squad.find(s => s.id === 'remielle'); if (rem) log(`Remielle's Lumiflux takes on ${D.ATTR[rem.flux].name} (Attribute Flux).`, 'skill');
    if (BT.hooks.start) BT.hooks.start(B);
    return B;
  };
  BT.end = () => {
    const B = BT.B; if (!B) return;
    if (B.rival && window.CLASH) CLASH.end(B);
    for (const e of new Set([...B.squad, ...B.enemies, ...B.companions, ...(B.rival ? B.rival.squad : [])])) disposeEnt(e);
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
  /* an Agent speaks (voice.js): her line from the real game for this moment */
  function say(ag, moment, o) { if (window.VOICE && BT.B && !BT.B.opts.attract && ag && ag.id) VOICE.say(ag.id, moment, Object.assign({ rival: !!ag.rival }, o)); }
  BT.say = say;
  // what she says as a move starts (your Ultimates and Chain Attacks speak where you call them)
  const SAYS = { ex: 'ex', ex2: 'ex', counter: 'counter' }, RIVAL_SAYS = { ex: 'ex', ex2: 'ex', counter: 'counter', ult: 'ult', chain: 'chain' };

  /* ------------------------------------------------------- the actions -- */
  function startAct(e, def, opts) {
    opts = opts || {};
    e.act = { def, t: 0, hi: 0, tgt: opts.tgt || null, dir: e.face, kind: opts.kind || 'basic', fired: {}, data: opts, dur: opts.dur || def.dur };
    e.state = 'act'; e.stT = 0;
    Object.assign(e.anim, { state: 'act', t: 0, act: def, th: def.hits && def.hits.length ? def.hits[0].t : Math.min(0.3, def.dur * 0.5), dur: e.act.dur });
    if (window.CHOREO) CHOREO.start(e, e.act);
    if (e.type === 'agent' && BT.B && BT.B.rival) CLASH.onAgentAct(e, e.act);   // a rival sees it coming
    const line = e.rival ? RIVAL_SAYS[e.act.kind] : e.type === 'agent' ? SAYS[e.act.kind] : null; if (line) say(e, line);
    return e.act;
  }
  BT.startAct = startAct;
  function endAct(e) {
    if (e.act && window.CHOREO) CHOREO.end(e, e.act);
    e.act = null; e.state = 'idle'; e.stT = 0; e.anim.state = 'idle'; e.anim.act = null;
  }
  BT.endAct = endAct;
  /* step a running action: turn, lunge, fire its hits on time */
  function stepAct(e, dt) {
    const A = e.act, d = A.def;
    A.t += dt * (A.speed || 1); e.anim.t = A.t;
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    const firstHit = d.hits && d.hits.length ? d.hits[0].t : 0.2;
    // aim at the target until just before the first hit (an enemy move can lock on earlier: track)
    const trackUntil = d.track != null ? d.track : firstHit - (e.rival ? 0.15 : e.type === 'enemy' ? 0.22 : 0);
    if (tgt && A.t < trackUntil) { A.dir = ang(e, tgt); }
    e.face = turn(e.face, A.dir, 1 - Math.exp(-18 * dt));
    for (const mv of [d.move, d.move2]) {
      if (!mv || A.t < mv[0] || A.t - dt > mv[1]) continue;
      const span = Math.max(0.01, mv[1] - mv[0]), k = (Math.min(A.t, mv[1]) - Math.max(A.t - dt, mv[0])) / span;
      let distance = mv[2];
      if (tgt && distance > 0 && e.type === 'agent') distance = Math.min(distance, Math.max(0, dist(e, tgt) - tgt.rad - e.rad * 0.6));
      if (tgt && distance > 0 && e.type === 'enemy' && !(d.hits && d.hits.some(h => h.shape === 'line'))) distance = Math.min(distance, Math.max(0, dist(e, tgt) - 0.9));
      e.x += Math.sin(A.dir) * distance * k; e.z += Math.cos(A.dir) * distance * k;
    }
    if (window.CHOREO) CHOREO.step(e, A, dt * (A.speed || 1));
    if (e.act !== A) return;          // the move was cut short (a crash, a counter)
    if (d.adrenalinePerSec && e.type === 'agent') gainEnergy(e, d.adrenalinePerSec * dt, true);
    while (d.hits && A.hi < d.hits.length && A.t >= d.hits[A.hi].t) {
      const h = d.hits[A.hi++];
      if (e.type === 'agent') BT.agentHit(e, h, A); else if (e.rival) CLASH.hit(e, h, A); else BT.enemyHit(e, h, A);
      if (e.act !== A) return;
    }
    if (A.t >= A.dur) { const then = d.then; endAct(e); if ((e.type === 'agent' || e.rival) && then) e.queue.unshift({ def: e.def.kit[then], kind: 'core' }); if (e.type === 'agent' && BT.hooks.actEnd) BT.hooks.actEnd(e, A); }
  }
  BT.stepAct = stepAct;

  /* ------------------------------------------------------ resources -- */
  function gainEnergy(a, n, raw) {
    const T = BT.T; a.energy = Math.min(a.def.energyMax, a.energy + n * (raw ? 1 : T.energyRate * BUFF('energy')));
  }
  function spendEnergy(a, n) {
    a.energy = Math.max(0, a.energy - n);
    if (a.id === 'burnice') { a.heat = Math.min(100, a.heat + n * 1.4); if (a.heat >= 50) a.nitro = true; }
    if (a.id === 'yixuan') a.tp = Math.min(120, a.tp + n * 0.667);
  }
  BT.gainEnergy = gainEnergy; BT.spendEnergy = spendEnergy;
  function gainDecibels(a, n) {
    const B = BT.B, T = BT.T; n *= T.decibelRate * BUFF('db');
    for (const s of B.squad) if (s.alive) s.decibels = Math.min(R.decibelMax, s.decibels + (s === a ? n : n * R.decibelShare));
  }
  BT.gainDecibels = gainDecibels;
  function gainAssist(n) { const B = BT.B; B.assist = Math.min(R.assistPointsMax, B.assist + n); }

  /* ----------------------------------------------------------- damage -- */
  const defMult = def => 794 / (794 + def);
  // (D.ATTR[x].as: an attribute that counts as another for weakness and resistance, e.g. Miyabi's Frost as Ice)
  function resMult(v, attr) { const d = v.def; if (!d || !d.weak) return 1; const a = attr === 'auric' ? 'ether' : (D.ATTR[attr] && D.ATTR[attr].as) || attr; return d.weak.includes(a) || d.weak.includes(attr) ? 1.2 : d.resist.includes(a) || d.resist.includes(attr) ? 0.8 : 1; }
  function stunMult(v) { if (!(v.stun > 0)) return 1; return R.stunMult + (v.rank === 'boss' ? 0.25 * v.chainsUsed : 0) + 0.04 * (v.subj || 0); }   // (+ Qingyi's Subjugation)
  BT.stunMult = stunMult;
  BT.resMult = resMult;
  /* a direct hit from an Agent */
  function agentDamage(a, v, h, attr, A) {
    const T = BT.T, B = BT.B;
    const sheer = !!a.def.sheer, base = sheer ? (0.3 * atkOf(a) + 0.1 * (a.baseHp || a.hpMax)) : atkOf(a);
    let dmg = base * h.mult / 100;
    const M = mech(a, 'mods', v, h, A) || {};                                // her own file's DMG bonus, CRIT, DEF ignored (js/agents/)
    let cr = a.st.cr + (M.cr || 0), cd = a.st.cd + (M.cd || 0) + (a.meditation > B.t ? 0.4 : 0) + (B.roar > B.t ? B.roarCd : 0);
    for (const s of B.squad) if (s !== a && s.def.mech && s.def.mech.cdFor) cd += s.def.mech.cdFor(s, a, v, A) || 0;   // a teammate's CRIT DMG buff (js/agents/: Astra Yao's Idyllic Cadenza)
    const crit = Math.random() < cr; if (crit) dmg *= 1 + cd;
    let bonus = 1;
    if (h.stunBonus && v.stun > 0) bonus += h.stunBonus;
    if (A && A.def.delusionBoost) bonus += 0.5;
    if (a.id === 'yixuan' && A && ['auric', 'eruption', 'ex', 'ex2', 'exAlt', 'followup', 'chain', 'ult', 'ult2'].includes(A.kind)) bonus += 0.4; // core: skill DMG +
    if (v.vuln > B.t) bonus += 0.25;                                         // Battle Spirit
    if (A && A.data && A.data.vOver) bonus += A.data.vOver * 0.01;          // Qingyi: Voltage over 75%
    if (A && A.data && A.data.mom) bonus += 0.05 * A.data.mom;               // Ju Fufu: Momentum spent on the spin
    if (A && A.def.aftershock && a.id === 'orphie') bonus += 0.25;           // Orphie: Aftershock DMG
    if (A && B.roar > B.t) bonus += A.kind === 'chain' ? 0.117 : (A.kind === 'ult' || A.kind === 'ult2') ? 0.233 : 0;   // Tiger's Roar
    if (B.squad.some(s => s.pflow)) bonus += 0.1;                            // Remielle's Phase Flow
    bonus += M.dmg || 0;
    for (const s of B.squad) if (s !== a && s.def.mech && s.def.mech.dmgFor) bonus += s.def.mech.dmgFor(s, a, v, attr, A) || 0;   // a teammate's DMG buff (js/agents/: Lighter's Elation, his RES cut)
    const defK = (A && A.def.aftershock && a.orFIF && B.zeroIn > B.t ? 0.75 : 1) * (1 - (M.defIgnore || 0));   // Forged in Flames
    dmg *= bonus * (sheer ? 1 : defMult(v.def_ * defK)) * resMult(v, attr) * stunMult(v) * T.agentDmg * BUFF('dmg');
    return { dmg: Math.max(1, Math.round(dmg)), crit };
  }
  /* anomaly-type damage (ticks, bursts, Disorder, Afterburn, Abloom): scales with AP */
  function anomalyDamage(src, v, pct, attr, atkSnap, apSnap) {
    const T = BT.T, B = BT.B;
    let dmg = (atkSnap || atkOf(src)) * pct / 100 * ((apSnap || src.st.ap) / 100);
    dmg *= defMult(v.def_) * resMult(v, attr) * stunMult(v) * (v.vuln > B.t ? 1.25 : 1) * T.agentDmg * BUFF('dmg');
    return Math.max(1, Math.round(dmg));
  }
  BT.anomalyDamage = anomalyDamage;
  /* subtract HP from an enemy, record it, show it */
  function hurtEnemy(v, dmg, o) {
    const B = BT.B, T = BT.T;
    if (!v.alive) return;
    if (v.rival) { dmg = CLASH.hurt(v, dmg, o); if (dmg <= 0) return; }   // a rival's Radiant Aegis soaks it up
    v.hp -= dmg; v.flash = 1; B.stats.dmg += dmg; B.stats.maxHit = Math.max(B.stats.maxHit, dmg);
    if (v.floor) v.hp = Math.max(v.hp, v.hpMax * v.floor);              // (TRAINING: it stays up until the last lesson)
    if (T.dmgNumbers) {
      const col = o.color || (D.ATTR[o.attr] ? D.ATTR[o.attr].color : '#fff');
      FX.number(v.x, v.height * 0.75 + (o.dy || 0), v.z, U.fmt(dmg), (o.crit ? 'crit ' : '') + (o.big ? 'big ' : '') + (o.cls || ''), col);
    }
    if (v.hp <= 0) killEnemy(v, o.src);
  }
  BT.hurtEnemy = hurtEnemy;
  function killEnemy(v, src) {
    const B = BT.B;
    if (v.act && window.CHOREO) CHOREO.end(v, v.act);
    v.hp = 0; v.alive = false; v.act = null; v.state = 'dead'; v.anim.state = 'dead'; v.stT = 0; v.stun = 0; v.dodge = null;
    B.threats = B.threats.filter(t => t.e !== v);
    if (v.rival) CLASH.down(v); else log(`${v.def.name} is defeated.`, 'kill');
    SFX.play('down');
    if (B.chain && B.chain.tgt === v) closeChain();
    if (B.focus === v) B.focus = null;
  }

  /* ----------------------------------------------- Daze, Stun, Chains -- */
  function addDaze(a, v, amount) {
    const B = BT.B, T = BT.T;
    if (v.stun > 0 || !v.alive) return;
    let k = T.dazeRate * BUFF('daze') * (a.impactUp > B.t ? 1.2 : 1) * (v.flinch > 0 ? 1 + D.ANOMALY.assault.flinchDaze : 1);
    v.daze += amount * k;
    if (v.enhanced) { v.enhDaze = (v.enhDaze || 0) + amount * k; if (v.enhDaze >= v.dazeMax * 0.3) breakEnhance(v); }
    if (v.daze >= v.dazeMax) { if (v.noStun) v.daze = v.dazeMax * 0.97; else stunEnemy(v, a); }   // (TRAINING: not before its lesson)
  }
  BT.addDaze = addDaze;
  function breakEnhance(v) {
    const B = BT.B; v.enhanced = false; v.enhNext = B.t + 25;
    callout('ENHANCEMENT BROKEN', 'perfect', v.def.name); log(`${v.def.name}'s Ether Enhanced state is broken.`, 'perfect');
    FX.burst(v.x, 1.6, v.z, 40, { col: [0xc8ff3a, 0xffffff], speed: 7, size: 0.12, life: 0.5 });
  }
  function stunEnemy(v, a) {
    const B = BT.B;
    if (v.enhanced) breakEnhance(v);
    if (v.act && window.CHOREO) CHOREO.end(v, v.act);
    if (v.act && v.act.tele) for (const f of v.act.tele) FX.kill(f);
    if (v.rival) CLASH.stunned(v);
    v.daze = v.dazeMax; v.stun = v.stunMax; v.act = null; v.state = 'stun'; v.anim.state = 'stun'; v.stT = 0;
    v.chainsLeft = Math.min(R.chains[v.rank] || 1, alive(B.squad).length); v.chainsUsed = 0;
    B.threats = B.threats.filter(t => t.e !== v);
    B.stats.stuns++; BT.emit('stun', { v, a }); mech(a, 'stunned', v); callout('STUNNED', 'stun', v.def.name); log(`${v.def.name} is Stunned! (${v.chainsLeft} Chain Attack${v.chainsLeft > 1 ? 's' : ''})`, 'stun');
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
    callout('CHAIN ATTACK', 'chain'); SFX.play('chain'); if (!B.auto) say(B.chain.opts[0], 'chain_select');   // (AUTO picks at once)
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
    if (B.allOut) pullIn(ag); else swapIn(ag, 'chain', v);
    ag.x = v.x + Math.sin(ang(v, ag) || 0) * (v.rad + 1.2); ag.z = v.z + Math.cos(ang(v, ag) || 0) * (v.rad + 1.2); ag.face = ang(ag, v);
    const A = startAct(ag, ag.def.kit.chain, { tgt: v, kind: 'chain' }); B.chainLast = A;
    onSkillStart(ag, ag.def.kit.chain, A); say(ag, 'chain');
    // Ju Fufu: with 100 Might, Hu Wei answers a teammate's Chain Attack with Suppressing Tiger Cauldron
    const fu = B.squad.find(s => s.id === 'jufufu' && s.alive);
    if (fu && fu !== ag && fu.might >= 100 && !(B.suppressCd > B.t)) { fu.might -= 100; B.suppressCd = B.t + 8; suppress(fu, v); }
    gainAssist(R.assistGain); B.stats.chains++; gainDecibels(ag, 300); BT.emit('chain', { a: ag, v });
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
    v.bu[type] = (v.bu[type] || 0) + amount * (a.st.am / 100) * T.anomalyRate * BUFF('anomaly') * (mul || 1) * (resMult(v, attr) > 1 ? 1.2 : resMult(v, attr) < 1 ? 0.8 : 1);
    const max = v.def.buMax * (v.buMul[type] || 1);
    if (v.bu[type] >= max) { v.bu[type] = 0; v.buMul[type] = Math.min(2, (v.buMul[type] || 1) * 1.2); triggerAnomaly(a, v, type); }
  }
  BT.addBuildup = addBuildup;
  BT.triggerAnomaly = (a, v, type) => triggerAnomaly(a, v, type);   // (an Anomaly set off without its buildup: Alice's Polarized Assault)
  BT.gainAssist = gainAssist; BT.atkOf = a => atkOf(a);
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
    for (const s of B.squad) if (s.alive && v.alive) mech(s, 'anomaly', a, v, type);   // (whoever triggered it: some Agents answer a teammate's Anomaly)
    // Remielle: a teammate's Anomaly on an enemy carrying Lumiflux Buildup Refringes
    const rem = B.squad.find(s => s.id === 'remielle' && s.alive);
    if (rem && a !== rem && v.lumi > 0 && v.alive) refringe(rem, v, A);
  }
  function refringe(rem, v, An) {
    const B = BT.B, k = v.lumi; v.lumi = 0;
    const dmg = anomalyDamage(rem, v, 100 * k, An.attr);
    callout('REFRINGE', 'abloom', v.def.name); log(`Refringe on ${v.def.name} (Lumiflux ×${k}): ${U.fmt(dmg)}. Remielle stores a Voidflare.`, 'anomaly');
    hurtEnemy(v, dmg, { attr: An.attr, src: rem, big: true, cls: 'abloom', color: '#ff9ae6' });
    FX.named('prism', { x: v.x, z: v.z, r: 2.4, attr: An.attr }); gainDecibels(rem, 80);
    rem.flares = Math.min(3, rem.flares + 1); rem.refr++;
    if (rem.pflow && rem.refr >= 3) endPhaseFlow(rem, 'three Refringes');
  }
  function luminize(a, v, k) {
    if (!(a.flares > 0) || !v.alive) return;
    const attr = a.flux || 'physical', n = a.flares, dmg = anomalyDamage(a, v, 55 * k * n, attr);
    a.flares = 0;
    callout('LUMINIZE', 'abloom', `${n} Voidflare${n > 1 ? 's' : ''}`); log(`Remielle: Luminize on ${v.def.name} (${n} Voidflare${n > 1 ? 's' : ''}): ${U.fmt(dmg)}`, 'anomaly');
    hurtEnemy(v, dmg, { attr, src: a, big: true, cls: 'abloom', color: '#ff9ae6' });
    FX.named('prism', { x: v.x, z: v.z, r: 2.6, attr }); gainDecibels(a, 80);
  }
  function gainVoltage(a, n) {
    const was = a.voltage; a.voltage = Math.min(100, a.voltage + n);
    if (was < 75 && a.voltage >= 75) log('Qingyi: Flash Connect! Her next Basic Attack is Enchanted Moonlit Blossoms.', 'skill');
  }
  /* Remielle off the field: Phase Flow */
  function startPhaseFlow(r) { r.pflow = true; r.phaseT = 0.6; r.refr = 0; log('Remielle enters Phase Flow: her light keeps falling on the target, and the squad deals +10% DMG.', 'skill'); callout('PHASE FLOW', 'skill', 'Remielle · off the field'); }
  function endPhaseFlow(r, why) { if (!r.pflow) return; r.pflow = false; r.ffdReady = true; log(`Remielle's Phase Flow ends (${why}): her next swap-in is Flower & Feather Dance.`, 'skill'); }
  function phaseFlow(r, dt) {
    const B = BT.B, K = r.def.kit.phase, on = active();
    r.phaseT -= dt; if (r.phaseT > 0) return;
    r.phaseT = K.every;
    const v = on && on.alive ? BT.pickTarget(on) : null; if (!v) return;
    if (window.CHOREO) CHOREO.events.lightFall(r, { dir: 0 }, { r: 1.8 }, v);
    applyHit(r, v, { mult: K.mult, daze: K.daze, bu: K.bu, lumi: 1, shape: 'circle', r: 1.6 }, { kind: 'phase', def: { name: K.name, hits: [] }, data: {}, dir: 0, t: 0 }, r.flux || 'physical');
    r.radiance -= K.drain; if (r.radiance <= 0) { r.radiance = 0; endPhaseFlow(r, 'Floating Radiance spent'); }
  }
  function disorder(a, v, old) {
    const B = BT.B, A = D.ANOMALY[old.type];
    for (const s of B.squad) if (s.alive) mech(s, 'disorder', a, v, old);
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
    const tgt = A.tgt && A.tgt.alive ? A.tgt : A.data.manual ? null : BT.pickTarget(a);   // (yours with no one in reach: a swing at the air)
    const attr = h.attr || a.flux || a.def.attr, cols = FX.colors(attr), dir = A.dir;   // (Remielle: the attribute her Lumiflux took on)
    const shape = h.shape || 'arc', reach = (A.def.reach || 1.6);
    if (shape === 'proj') { spawnProj(a, h, A, tgt, attr); SFX.play(attr === 'fire' ? 'fire' : 'ether'); return; }
    let cx = a.x, cz = a.z, r = h.r || reach + 0.7;
    if (h.at === 'target' && tgt) { cx = tgt.x; cz = tgt.z; }
    else if (h.at === 'front') { cx = a.x + Math.sin(dir) * 1.3; cz = a.z + Math.cos(dir) * 1.3; }
    let victims = enemiesIn(shape, cx, cz, r, dir, h.arc, h.len);
    if (!victims.length && tgt && tgt.model && shape !== 'circle' && dist(a, tgt) < reach + tgt.rad + 0.9) victims = [tgt];
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
    if (v.rival && CLASH.intercept(a, v, h, A)) return;      // a rival dodges, blocks, or a teammate parries for her
    const ex = window.CHOREO && CHOREO.ext;
    const res = agentDamage(a, v, h, attr, A), guard = ex ? ex.guardMult(v) : 1;
    if (guard < 1) { res.dmg = Math.max(1, Math.round(res.dmg * guard)); if (T.dmgNumbers && Math.random() < 0.5) FX.number(v.x, v.height + 0.3, v.z, 'GUARD', 'miss'); }
    hurtEnemy(v, res.dmg, { attr, crit: res.crit, src: a, big: A.kind === 'ult' || A.kind === 'chain' });
    for (const s of B.squad) if (s !== a && s.alive && v.alive && !a.rival) mech(s, 'allyHit', a, v, h, A);
    const p = new THREE.Vector3(); sockWorld(v, 'chest', p);
    FX.hitSpark(p.x, p.y, p.z, attr, h.heavy, res.crit);
    if (!v.alive) { gainDecibels(a, 40); return; }
    let dzK = 1;
    if (a.qyBoost && (A.kind === 'basic' || A.kind === 'core')) dzK *= 1.2;   // Qingyi: Three Verses
    if (A.data && A.data.vOver) dzK *= 1 + A.data.vOver * 0.01;
    addDaze(a, v, a.st.impact * (h.daze || 0) / 100 * guard * dzK);
    let buMul = 1;
    if (a.id === 'burnice' && ['hold', 'ex', 'ex2'].includes(A.kind) && squadHas(s => s.id !== 'burnice' && (s.def.spec === 'Anomaly' || s.def.faction === 'Sons of Calydon'))) buMul *= 1.65; // Fire Kindling
    if (a.id === 'aria' && A.kind === 'charged') buMul *= 1 + 0.1 * (A.data.ppBuff || 0);
    if (a.delusion > B.t && attr === 'ether') buMul *= 1.3;
    addBuildup(a, v, attr, h.bu || 0, buMul);
    anomalyOnHit(v);
    if (v.alive) kitOnHit(a, v, h, A, attr);
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
      const dmg = Math.round(atkOf(bur) * mult / 100 * defMult(v.def_) * resMult(v, 'fire') * stunMult(v) * (v.vuln > B.t ? 1.25 : 1) * T.agentDmg * BUFF('dmg'));
      hurtEnemy(v, dmg, { attr: 'fire', src: bur, cls: 'afterburn' });
      addBuildup(bur, v, 'fire', 80, squadHas(s => s.id !== 'burnice' && (s.def.spec === 'Anomaly' || s.def.faction === 'Sons of Calydon')) ? 1.65 : 1);
      FX.named('flameRing', { x: v.x, z: v.z, r: 1.2, attr: 'fire' });
    }
    // Aria: Fandom Power, Abloom
    if (a.id === 'aria') {
      if (A.def.fandom && !A.fandomDone) { A.fandomDone = true; addFandom(v.x, v.z, A.def.fandom); }
      if (A.kind === 'charged' && h.heavy && v.anom) abloom(a, v);
    }
    // reactions: guards counter, charges break, openings pay off; otherwise a stagger
    if (v.rival) { if (v.stun <= 0 && v.alive) CLASH.react(v, h, a, A); }
    else if (v.stun <= 0 && v.alive && !(ex && ex.onHit(a, v, h, A))) react(v, h, a);
    if (h.heavy) maybeChain(a, v, A);
  }
  BT.applyHit = applyHit;
  /* the new Agents' kit mechanics on a landed hit */
  function kitOnHit(a, v, h, A, attr) {
    const B = BT.B, kit = a.def.kit;
    // Qingyi: Flash Connect Voltage; the finish of Enchanted Moonlit Blossoms leaves Subjugation
    if (a.id === 'qingyi') {
      if (h.rush && A.data.rushHit !== h) { A.data.rushHit = h; A.data.rushN = (A.data.rushN || 0) + 1; }
      if (h.finisher && !A.data.subjDone) {
        A.data.subjDone = true;
        v.subj = Math.min(20, (v.subj || 0) + (5 + (A.data.rushN || 0)) * (v.rank === 'boss' || v.rival ? 1 : 2));
        log(`${v.def.name}: Subjugation ×${v.subj} (Stun DMG ×${(R.stunMult + 0.04 * v.subj).toFixed(2)} while Stunned).`, 'skill');
      } else if (A.def !== kit.moonlit && attr === 'electric') gainVoltage(a, (h.daze || 0) * 0.1);
    }
    // Remielle: Lumiflux Buildup; Luminize from her stored Voidflares; Flower & Feather Dance stretches a Stun
    if (a.id === 'remielle') {
      if (h.lumi) { v.lumi = Math.min(3, (v.lumi || 0) + h.lumi); v.lumiT = B.t + 20; }
      if (A.def.luminize && h.heavy && !A.data.lumDone) { A.data.lumDone = true; luminize(a, v, A.def.luminize); if (!v.alive) return; }
      if (A.def.stunExtend && v.stun > 0 && !A.data.extDone) { A.data.extDone = true; v.stun += A.def.stunExtend; log(`${v.def.name}'s Stun lasts ${A.def.stunExtend} s longer.`, 'skill'); }
    }
    mech(a, 'hit', v, h, A, attr);
    if (!v.alive) return;
    // Orphie & Magus: the fire blade restores Bottled Heat; the Heat Charge laser puts the squad in Zeroed In
    if (a.id === 'orphie') {
      if (A.kind === 'basic' && h.heavy && !A.data.bhDone) { A.data.bhDone = true; a.bheat = Math.min(125, a.bheat + 10); }
      if (A.def.zeroIn && !A.data.ziDone) { A.data.ziDone = true; if (!(B.zeroIn > B.t)) log('Orphie & Magus: Zeroed In! The squad gains +255 ATK (12 s).', 'skill'); B.zeroIn = B.t + 12; }
    }
  }
  function react(v, h, a) {
    const B = BT.B;
    const kb = (h.kb || 0.15) * (v.rank === 'minion' ? 1 : v.rank === 'elite' ? 0.35 : 0);
    if (kb > 0) { const d = ang(a, v); v.vx += Math.sin(d) * kb * 5; v.vz += Math.cos(d) * kb * 5; }
    const winding = v.act && v.act.t < (v.act.def.hits && v.act.def.hits.length ? v.act.def.hits[0].t * 0.35 : 0.2);
    const ar = v.act && v.act.def.armor;
    if (ar && v.act.t >= ar[0] && v.act.t <= ar[1]) return;   // a charged move that will not be stopped
    if (v.poise === 0 && h.heavy) interrupt(v, 0.45);
    else if (v.poise === 1 && h.heavy && winding) interrupt(v, 0.4);
    // otherwise a light hit is just a flinch you can see (the white flash); it does not stop the enemy
  }
  function interrupt(v, t, force) {
    const B = BT.B;
    if (!v.alive || v.stun > 0) return;
    if (v.rival && CLASH.unstoppable(v, force)) return;       // an Ultimate, an assist: Agents don't flinch out of those
    if (v.act) { B.threats = B.threats.filter(th => th.e !== v); if (v.act.tele) for (const f of v.act.tele) FX.kill(f); if (window.CHOREO) CHOREO.end(v, v.act); }
    if (v.rival) CLASH.staggered(v);
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
      const fx = window.CHOREO ? CHOREO.critter(px, pz) : FX.glow(px, 0.5, pz, 0.7, 0x5fe8e0, 9999, { size1: 0.7 });
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
          if (p.h.fx === 'fireball') FX.named('explode', { x: p.x, z: p.z, r: r || 1.2, attr: 'fire' }); else if (p.h.fx === 'lightLance') FX.named('lightBurst', { x: p.x, z: p.z, y: 1, r: r || 1.2, attr: p.attr }); else FX.named('sound', { x: p.x, z: p.z, r: r || 1.2 });
          for (const v of victims) applyHit(p.src, v, p.h, p.A, p.attr);
          barrelCheck(p.x, p.z, r || 0.8, p.attr, p.h.heavy, p.src);
          B.projs.splice(i, 1); continue;
        }
        p.x += dx / d * step; p.z += dz / d * step; p.y += (1.0 - p.y) * Math.min(1, dt * 4);
        p.fx.position.set(p.x, p.y, p.z);
        if (Math.random() < 0.6) FX.p({ x: p.x, y: p.y, z: p.z, life: 0.25, size: 0.14, col: FX.colors(p.attr)[0] });
      } else {
        // enemy shots fly straight at where the Agent was when they were fired, and hit whoever they meet
        p.x += p.dx * step; p.z += p.dz * step; p.y += (p.y1 - p.y) * Math.min(1, dt * 3); p.fx.position.set(p.x, p.y, p.z);
        if (Math.random() < 0.5) FX.p({ x: p.x, y: p.y, z: p.z, life: 0.2, size: 0.12, col: p.col || 0xff6a4a });
        const ag = fielded().find(a => a.obj.visible && Math.hypot(a.x - p.x, a.z - p.z) < a.rad + 0.25);
        if (ag) { FX.kill(p.fx); B.projs.splice(i, 1); if (p.e && p.e.rival) CLASH.projHit(p, ag); else BT.incoming(p.e, p.h, p.threat && p.threat.target === ag ? p.threat : null, ag); if (p.threat && p.threat.target !== ag) p.threat.done = true; continue; }
        if (p.t > p.life) { FX.kill(p.fx); B.projs.splice(i, 1); if (p.threat) p.threat.done = true; }
      }
    }
  }
  const PROJ_COL = { fireball: 0xff8a2a, miasmaBolt: 0xff3a8a, etherBolt: 0xc8ff3a, talisman: 0xffcf4a, bignote: 0xff7ab8 };
  BT.spawnEnemyProj = (e, h, threat, tgt) => {
    const B = BT.B, ag = tgt || (threat && threat.target) || active(), from = new THREE.Vector3();
    const ex = window.CHOREO && CHOREO.ext;
    if (!(ex && ex.origin(e, h, from))) sockWorld(e, e.model.sockets && e.model.sockets.muzzle ? 'muzzle' : 'weapon', from);
    if (from.y < 0.6) from.y = 1.1;
    const d = Math.max(0.1, Math.hypot(ag.x - from.x, ag.z - from.z));
    const col = PROJ_COL[h.fx] || 0xff4a6a, big = h.fx === 'talisman' || h.fx === 'fireball' || h.fx === 'bignote';
    const fx = FX.glow(from.x, from.y, from.z, big ? 0.8 : 0.6, col, 9999, { size1: big ? 0.8 : 0.6 });
    B.projs.push({ side: 'enemy', e, h, threat, x: from.x, y: Math.max(1.0, from.y), y1: 1.0, z: from.z, dx: (ag.x - from.x) / d, dz: (ag.z - from.z) / d, speed: h.speed || 12, fx, col, t: 0, life: 2.2 });
    SFX.play('shot');
  };

  /* -------------------------------------- the Agent's own special moves -- */
  function onSkillStart(a, def, A) {
    const B = BT.B;
    if (def.cost && !A.data.free) spendEnergy(a, Math.min(a.energy, def.cost));
    if (def.aegis || A.data.aegis) giveAegis(a);
    // Special pressed again during her EX (or just after) is her second EX; Burnice's also follows her Chain Attack, Follow-Up and Mixed Flame Blend
    const K = a.def.kit;
    if (K.ex2) { if (def === K.ex2) a.ex2Until = 0; else if (def === K.ex || (a.id === 'burnice' && (A.kind === 'chain' || A.kind === 'followup' || def === K.hold))) a.ex2Until = B.t + A.dur + 0.5; }
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
      // Ju Fufu's Aura of Authority: an Attack or Rupture Agent's Ultimate gives her 300 Decibels
      if (['Attack', 'Rupture'].includes(a.def.spec)) for (const s of B.squad) if (s !== a && s.id === 'jufufu' && s.alive) s.decibels = Math.min(R.decibelMax, s.decibels + 300);
    }
    if (def.noIce) a.noIce = true;
    if (a.id === 'qingyi') {
      if (def === a.def.kit.moonlit) { A.data.vOver = Math.max(0, a.voltage - 75); a.voltage = 0; log(`Qingyi: ${def.name}${A.data.vOver > 0 ? ` (+${Math.round(A.data.vOver)}% from Voltage)` : ''}`, 'skill'); callout('MOONLIT BLOSSOMS', 'skill', 'Qingyi · Flash Connect'); }
      if (def.voltage) gainVoltage(a, def.voltage);
    }
    if (a.id === 'jufufu') {
      if (def.might) a.might = Math.min(200, a.might + def.might);
      if (def.momentum) a.momentum = Math.min(15, a.momentum + def.momentum);
      if (def.spin) { A.data.mom = Math.min(6, a.momentum); a.momentum -= A.data.mom; a.might = Math.min(200, a.might + 10 * A.data.mom); log(`Ju Fufu: ${def.name} (${A.data.mom} Momentum)`, 'skill'); }
    }
    if (a.id === 'orphie') {
      if (def.bheat) a.bheat = Math.min(125, a.bheat + def.bheat);
      if (def.bheatCost) a.bheat = Math.max(0, a.bheat - def.bheatCost);
    }
    if (a.id === 'remielle') {
      if (def.radiance) a.radiance = Math.min(120, a.radiance + def.radiance);
      if (def === K.rainbow || def === K.fleeting) log(`Remielle: ${def.name}${a.flares ? ` (${a.flares} Voidflare${a.flares > 1 ? 's' : ''})` : ''}`, 'skill');
      if (def === K.fleeting) a.reflect = 0;
      if (def.reflection) a.reflect = B.t + 12;
      if (def === K.ffd) { a.ffdReady = false; a.refr = 0; a.energy = Math.max(a.energy, 60); if (B.allOut || alive(B.squad).length < 2) a.radiance = 0; log(`Remielle: ${def.name}!`, 'skill'); callout('FLOWER & FEATHER DANCE', 'skill', 'Remielle'); }
    }
    mech(a, 'start', def, A);
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
  function showCompanion(c, on) {
    if (c.id === 'huwei') on = c.owner.alive;              // Hu Wei stays on the field whoever is fighting
    if (on && !c.obj.visible) { const o = anchorOf(c.owner); c.x = o.x + 1; c.z = o.z; c.y = c.id === 'huwei' ? 0.28 : 2.4; }
    c.obj.visible = on;
  }
  /* where a companion fights: by its Agent on the field, else by whoever is fighting for her side */
  function anchorOf(o) {
    const B = BT.B;
    if (o.rival) { if (!o.benched) return o; const RV = B.rival; return (RV && (RV.allOut ? RV.squad.find(r => r.alive && !r.benched) : RV.squad[RV.active])) || o; }
    if (B.allOut || o === active()) return o;
    return active() || o;
  }
  function swapIn(ag, why, tgt) {
    const B = BT.B, out = active(), idx = B.squad.indexOf(ag);
    if (out === ag) return;
    if (out) {
      if (out.act && window.CHOREO) CHOREO.end(out, out.act); out.airY = 0;
      out.obj.visible = false; out.act = null; out.state = 'idle'; out.anim.state = 'idle'; out.queue.length = 0; out.dodge = null;
      FX.burst(out.x, 1, out.z, 14, { col: [0xffffff, D.ATTR[out.def.attr].hex], speed: 3, size: 0.1, life: 0.35, g: -2 });
      for (const c of B.companions) if (c.owner === out) showCompanion(c, false);
      ag.x = out.x; ag.z = out.z; ag.face = out.face;
      if (out.id === 'remielle' && out.alive && out.radiance >= 120 && !out.pflow) startPhaseFlow(out);
    }
    B.active = idx; ag.obj.visible = true; ag.state = 'idle'; ag.anim.state = 'idle'; ag.act = null; ag.swapInv = B.t + 0.35; ag.queue.length = 0;
    // Remielle back from Phase Flow: she comes in with Flower & Feather Dance
    if (ag.id === 'remielle') {
      if (ag.pflow) endPhaseFlow(ag, 'she is back on the field');
      if (ag.ffdReady && (why === 'swap' || why === 'forced')) { ag.ffdReady = false; ag.queue.unshift({ def: ag.def.kit.ffd, kind: 'core', tgt: tgt || null, delay: 0.05 }); }
    }
    if (tgt) ag.face = ang(ag, tgt);
    for (const c of B.companions) if (c.owner === ag) showCompanion(c, true);
    FX.glow(ag.x, 1.1, ag.z, 2.4, D.ATTR[ag.def.attr].hex, 0.3, { size1: 3 }); SFX.play('swap');
    // a plain swap or a teammate down: she says so (an assist, a Chain Attack or an Ultimate speaks for itself)
    if (why === 'swap') say(ag, B.focus && B.focus.stun > 0 ? 'assist_stunned' : 'assist', { with: out && out.id, p: 0.4 });
    else if (why === 'forced') say(ag, 'assist_down');
    for (const th of B.threats) { th.plan = null; if (th.target === out && !th.hazard) th.target = ag; } // the new Agent faces what was coming, with her own plans
    if (out) mech(out, 'swap', false, why); mech(ag, 'swap', true, why);
    if (BT.hooks.swap) BT.hooks.swap(out, ag, why);
    BT.emit('swap', { out, a: ag, why });
    BT.planDefense && BT.B.threats.forEach(th => BT.planDefense(ag, th));
  }
  BT.swapIn = swapIn;
  /* the live assist opportunity: an incoming flashed hit on the on-field Agent */
  function assistThreat() {
    const B = BT.B, F = fielded();
    let best = null;
    for (const th of B.threats) {
      if (th.done || th.assist || !th.flash || !F.includes(th.target)) continue;
      if (B.allOut && !helperFor(th.target)) continue;
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
    if (B.allOut) return allOutCommand(dirOrAgent);
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
  /* All-Out: Swap is a command to the squad on the field. On a flash a teammate dashes in to help
     whoever it is aimed at; when one of yours is launched, a teammate's Quick Assist; otherwise
     it picks which Agent you lead (the one you move, whose EX and Ultimate you call). */
  function helperFor(target, prefer) {
    const B = BT.B;
    const ok = s => s && s.alive && s !== target && !(s.stun > 0) && !['down', 'getup', 'stun', 'dead'].includes(s.state) && !(s.act && BUSY.includes(s.act.kind));
    if (ok(prefer)) return prefer;
    return B.squad.filter(ok).sort((x, y) => dist(x, target) - dist(y, target))[0] || null;
  }
  BT.helperFor = helperFor;
  function allOutCommand(dirOrAgent) {
    const B = BT.B, lead = active();
    const ag = typeof dirOrAgent === 'object' ? dirOrAgent : nextAlive(dirOrAgent || 1);
    const th = assistThreat();
    if (th) { const h = helperFor(th.target, ag); if (h) return doAssist(h, th); }
    const down = B.squad.find(s => s.alive && s.launchedUntil > B.t);
    if (down) { const h = helperFor(down, ag); if (h) return doQuickAssist(h, down); }
    if (!ag || !ag.alive || ag === lead) return false;
    B.active = B.squad.indexOf(ag);
    FX.ring(ag.x, ag.z, 0.3, 1.3, 0xf4d35e, 0.35); SFX.play('swap');
    log(`You lead ${ag.def.short}.`, 'cmd');
    if (BT.hooks.swap) BT.hooks.swap(lead, ag, 'lead');
    return true;
  }
  /* a teammate stepping in: whatever she was doing stops */
  function pullIn(ag) {
    if (ag.act && window.CHOREO) CHOREO.end(ag, ag.act);
    ag.act = null; ag.queue.length = 0; ag.dodge = null; ag.state = 'idle'; ag.anim.state = 'idle'; ag.airY = 0; ag.swapInv = BT.B.t + 0.35;
    FX.burst(ag.x, 1, ag.z, 10, { col: [0xffffff, D.ATTR[ag.def.attr].hex], speed: 3, size: 0.09, life: 0.3, g: -2 });
  }
  function doAssist(ag, th) {
    const B = BT.B, out = B.allOut ? th.target : active();
    const cost = th.hit && th.hit.freeAssist ? 0 : (th.heavy || th.launch) ? (ag.id === 'caesar' ? 1 : R.assistCostHeavy) : R.assistCostLight;
    // an Evasive Assist Agent (def.assist 'evasive') does not parry: she dodges the blow in Vital View and follows up
    const e = th.e, evasive = ag.def.assist === 'evasive' && B.assist >= cost, defensive = !evasive && th.flash === 'gold' && B.assist >= cost;
    if (B.allOut) pullIn(ag); else swapIn(ag, 'assist', e);
    const toward = ang(e, B.allOut ? th.target : ag), dd = e.rad + 1.1;     // (All-Out: between the attacker and her teammate)
    ag.x = e.x + Math.sin(toward) * dd; ag.z = e.z + Math.cos(toward) * dd; ag.face = ang(ag, e);
    const def = ag.def.kit.assist;
    if (defensive) {
      B.assist -= cost; th.assist = { agent: ag, type: 'defensive' };
      startAct(ag, def, { tgt: e, kind: 'assist', dur: Math.max(def.dur, th.impactAt - B.t + 0.12) });
      callout('DEFENSIVE ASSIST', 'assist', def.name.replace('Defensive Assist: ', '')); say(ag, 'assist', { with: out.id, p: 0.8 });
      log(`${ag.def.short}: ${def.name} (${cost ? `${cost} Assist Point${cost > 1 ? 's' : ''}` : 'free'})`, 'assist');
    } else if (evasive) {
      B.assist -= cost; th.assist = { agent: ag, type: 'evasive' };
      const who = B.allOut ? th.target : ag;
      if (who.act && window.CHOREO) CHOREO.end(who, who.act); who.act = null;
      who.dodge = { t0: th.impactAt - 0.05, until: th.impactAt + 0.3, assist: 'evasive', helper: ag };
      who.state = 'dodge'; who.anim.state = 'dodge'; who.anim.t = 0; who.anim.side = 1; who.stT = 0;
      callout('EVASIVE ASSIST', 'assist', def.name.replace('Evasive Assist: ', '')); say(ag, 'assist', { with: out.id, p: 0.8 });
      log(`${ag.def.short}: ${def.name} (${cost ? `${cost} Assist Point${cost > 1 ? 's' : ''}` : 'free'})`, 'assist');
    } else {
      th.assist = { agent: ag, type: 'evade' };
      const who = B.allOut ? th.target : ag;           // All-Out: she pulls her teammate clear
      if (who.act && window.CHOREO) CHOREO.end(who, who.act); who.act = null;
      who.dodge = { t0: th.impactAt - 0.05, until: th.impactAt + 0.3, assist: true };
      who.state = 'dodge'; who.anim.state = 'dodge'; who.anim.t = 0; who.anim.side = 1; who.stT = 0;
      callout(B.assist < cost && th.flash === 'gold' ? 'NO ASSIST POINTS' : 'PERFECT DODGE', 'assist', 'Assist on a red flash'); say(ag, 'perfect_dodge');
      log(B.allOut ? `${ag.def.short} pulls ${th.target.def.short} clear of a ${th.flash === 'red' ? 'red flash' : 'flash (no Assist Points)'}: Perfect Dodge.` : `${ag.def.short} switches in on a ${th.flash === 'red' ? 'red flash' : 'flash with no Assist Points'}: Perfect Dodge.`, 'assist');
    }
    if (!B.allOut && out.id === 'yixuan' && e.type === 'enemy' && squadHas(s => ['Stun', 'Support', 'Defense'].includes(s.def.spec))) {   // Auric Ink Undercurrent: the lightning strike
      const dmg = Math.round(out.st.sheer * 2.25 * resMult(e, 'auric') * stunMult(e) * BT.T.agentDmg * BUFF('dmg'));
      hurtEnemy(e, dmg, { attr: 'auric', src: out, cls: 'afterburn' }); gainEnergy(out, 5, true);
      FX.beam(new THREE.Vector3(e.x, 8, e.z), new THREE.Vector3(e.x, 0.5, e.z), 0xffcf4a, 0.25, 0.25);
    }
    B.stats.assists++; BT.emit('assist', { a: ag, type: th.assist.type });
    return true;
  }
  function doQuickAssist(ag, who) {
    const B = BT.B, out = who || active();
    const tgt = BT.pickTarget(out) || B.enemies.find(e => e.alive);
    if (B.allOut) pullIn(ag); else swapIn(ag, 'quick', tgt);
    out.launchedUntil = 0;
    const A = startAct(ag, ag.def.kit.quick, { tgt, kind: 'quick' });
    callout('QUICK ASSIST', 'assist', ag.def.kit.quick.name.replace('Quick Assist: ', '')); say(ag, 'quick', { with: out.id });
    log(`${ag.def.short}: ${ag.def.kit.quick.name}`, 'assist'); BT.emit('quick', { a: ag });
    if (ag.id === 'aria') ag.noIce = true;
    return true;
  }
  /* the Ultimate command */
  BT.cmdUlt = (agent) => {
    const B = BT.B; if (!B || B.phase !== 'fight' || B.cutin) return false;
    let ag = agent || active();
    if (!ag || !ag.alive || ag.stun > 0) return false;
    const yix = ag.id === 'yixuan' && ag.tp >= 120;            // Endless Talisman Suppression (Technique Points) has priority
    const own = mech(ag, 'ult');                                // her own file's: { def, kind, free } (an Ultimate without Decibels)
    if (!yix && !own && ag.decibels < R.decibelMax) return false;
    if (B.chain) { if (ag !== active()) return false; B.chain = null; if (BT.hooks.chainClose) BT.hooks.chainClose(); }
    if (ag !== active() && !B.allOut) swapIn(ag, 'ult');
    ag.act = null; ag.dodge = null; ag.queue.length = 0;
    const def = own ? own.def : yix ? ag.def.kit.ult2 : ag.def.kit.ult;
    if (!yix && !(own && own.free)) ag.decibels -= R.decibelMax;
    gainAssist(R.assistGain); B.stats.ults++; BT.emit('ult', { a: ag });
    B.cutin = { agent: ag, def, t: 0, dur: BT.T.cutins ? 1.15 : 0.01, kind: own ? own.kind || 'ult' : yix ? 'ult2' : 'ult' };
    if (own) mech(ag, 'ultUsed', own);
    if (BT.hooks.cutin) BT.hooks.cutin(ag, def);
    SFX.play('ult'); say(ag, yix ? 'ult2' : 'ult');
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
  BT.setAuto = on => { const B = BT.B; if (B && B.opts.tutorial) return; if (B) B.auto = on; BT.T.auto = on; };   // (TRAINING: you fight)

  /* --------------------------------------- enemy hits on the on-field Agent -- */
  /* resolve one enemy hit against the on-field Agent: assists, dodges, blocks, damage */
  BT.incoming = (e, h, th, ag) => {
    const B = BT.B, T = BT.T;
    ag = ag || active(); if (!ag || !ag.alive || !ag.obj.visible) { if (th) th.done = true; return; }
    if (th) th.done = true;
    // a Perfect Assist swapped in on this hit
    const EH = B.eh;
    if (th && th.assist && th.assist.type === 'defensive' && th.assist.agent.alive && (th.assist.agent === ag || B.allOut)) { EH.assist++; return parry(th.assist.agent, e, h); }
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
    if (mech(ag, 'incoming', e, h)) { EH.block++; return; }
    EH.hit++;
    hurtAgent(ag, e, h);
  };
  function parry(ag, e, h) {
    const B = BT.B, def = ag.def.kit.assist;
    BT.emit('parry', { a: ag, e });
    SFX.play('parry'); B.freeze = Math.max(B.freeze, 0.12);
    const p = new THREE.Vector3(); sockWorld(ag, 'weapon', p);
    FX.glow(p.x, p.y, p.z, 2.6, 0xfff0a0, 0.3, { size1: 4.5 }); FX.burst(p.x, p.y, p.z, 30, { col: [0xffffff, 0xfff0a0, 0xf4d35e], speed: 8, size: 0.1, life: 0.4 });
    addDaze(ag, e, ag.st.impact * (def.daze || 400) / 100 * (h.heavy ? 1.2 : 1));
    const EA = e.act, more = h.chainParry && EA && EA.def.hits.some(x => x.t > h.t + 1e-3 && x.flash === 'gold');
    if (h.chainParry && EA) EA.parries = (EA.parries || 0) + 1;
    if (h.parryDaze && e.alive && e.stun <= 0) { addDaze(ag, e, e.dazeMax * h.parryDaze); callout('COUNTERED', 'perfect', `${e.def.name} reels`); }
    if (h.expose && e.alive) { e.vuln = B.t + 6; callout('WEAKNESS EXPOSED', 'perfect', e.def.name); log(`${e.def.name}'s weakness is exposed (+25% DMG taken).`, 'perfect'); }
    if (more) {                                     // the next lash is already on its way: no stagger yet
      gainDecibels(ag, 150); gainEnergy(ag, 5);
      shot({ x: (ag.x + e.x) / 2, z: (ag.z + e.z) / 2, zoom: 0.8, dur: 0.4, pri: 2 });
      return;
    }
    if (h.chainParry && EA && EA.parries >= 2 && e.alive && e.stun <= 0) {
      addDaze(ag, e, e.dazeMax * 0.3); if (e.stun <= 0) interrupt(e, 1.6, true);
      callout('SPECIAL STAGGER', 'stun', `${EA.parries} Defensive Assists in a row`); log(`${e.def.name} is staggered by ${EA.parries} Defensive Assists in a row!`, 'perfect');
    } else if (e.alive && e.stun <= 0) interrupt(e, e.rank === 'boss' ? 0.6 : 0.9, true);
    gainDecibels(ag, 250); gainEnergy(ag, 8);
    if (ag.id === 'caesar') { ag.impactUp = B.t + 3; battleSpirit(ag); }
    shot({ x: (ag.x + e.x) / 2, z: (ag.z + e.z) / 2, zoom: 0.75, dur: 0.6, pri: 2, roll: rnd(-0.06, 0.06) });
    say(ag, 'perfect_assist');
    if (e.def.cancelsFollowUp && Math.random() < 0.35) { callout('FOLLOW-UP CANCELLED', 'warn', e.def.name); if (BT.hooks.glitch) BT.hooks.glitch(); return; }
    if (BT.isPlayer(ag)) { ag.followUntil = B.t + 1.6; ag.followTgt = e; return; }   // you fight: Basic for the Assist Follow-Up
    ag.queue.unshift({ def: ag.def.kit.followup, kind: 'followup', tgt: e, delay: 0.1 });
  }
  function perfectDodge(ag, e, viaAssist) {
    const B = BT.B, T = BT.T;
    ag.dodge.perfectDone = true; B.stats.perfect++; BT.emit('perfect', { a: ag, e });
    // an Evasive Assist: Vital View, then her Assist Follow-Up (yours to press, as after a parry)
    if (viaAssist === 'evasive') {
      const h = ag.dodge.helper || ag; B.slow = { s: 0.2, t: 0.6 };
      if (BT.isPlayer(h)) { h.followUntil = B.t + 1.6; h.followTgt = e && e.type === 'enemy' ? e : null; }
      else h.queue.unshift({ def: h.def.kit.followup, kind: 'followup', tgt: e && e.type === 'enemy' && e.alive ? e : null, delay: 0.1 });   // (a projectile dodged is no target)
      callout('VITAL VIEW', 'perfect', h.def.short); gainDecibels(h, 250); gainEnergy(h, 8);
      log(`${h.def.short}: Evasive Assist! Vital View.`, 'perfect');
      return;
    }
    callout('PERFECT DODGE', 'perfect'); SFX.play('perfect'); if (!viaAssist) say(ag, 'perfect_dodge');
    B.slow = { s: viaAssist ? 0.2 : 0.3, t: 0.5 };
    ag.counterUntil = B.t + 1.0; ag.counterTgt = e && e.type === 'enemy' ? e : null;
    gainDecibels(ag, 150); if (ag.def.resource === 'adrenaline') gainEnergy(ag, 5, true); else gainEnergy(ag, 4);
    FX.glow(ag.x, 1.1, ag.z, 2.2, 0x9ad8ff, 0.35, { size1: 3.5 });
    log(`${ag.def.short}: Perfect Dodge!`, 'perfect');
  }
  BT.perfectDodge = perfectDodge;
  function hurtAgent(ag, e, h) {
    const B = BT.B, T = BT.T;
    let dmg = e.atk * (e.enhanced ? 1.3 : 1) * h.mult / 100 * defMult(ag.st.def) * T.enemyDmg * (ag.stun > 0 ? R.stunMult : 1);
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
    if (ag.stun > 0) return;                                     // Stunned (Proxy Clash): she just takes it
    const anti = (ag.act && ag.act.def.dr) || shielded;
    if (h.launch) {
      if (ag.act && window.CHOREO) CHOREO.end(ag, ag.act);
      ag.act = null; ag.queue.length = 0; ag.state = 'down'; ag.anim.state = 'down'; ag.anim.t = 0; ag.stT = 0; ag.downT = 1.25; ag.launchedUntil = B.t + 1.25;
      const d = ang(e, ag); ag.vx = Math.sin(d) * 7; ag.vz = Math.cos(d) * 7;
      callout('LAUNCHED', 'warn', 'Swap now for a Quick Assist'); B.cam.shake = Math.max(B.cam.shake, 0.35); say(ag, 'staggered');
      log(`${ag.def.short} is launched! (Quick Assist ready)`, 'warn');
    } else if ((!anti || h.heavy) && !h.flinchOnly) {   // flinchOnly: a rival Agent's hit that only makes her flinch (clash.js)
      if (ag.act && window.CHOREO) CHOREO.end(ag, ag.act);
      ag.act = null; ag.queue.length = 0; ag.state = 'hit'; ag.anim.state = 'hit'; ag.anim.t = 0; ag.stT = 0; ag.hitT = h.heavy ? 0.5 : 0.25;
      const d = ang(e, ag); ag.vx = Math.sin(d) * (h.heavy ? 4 : 1.5); ag.vz = Math.cos(d) * (h.heavy ? 4 : 1.5);
      if (h.heavy) B.cam.shake = Math.max(B.cam.shake, 0.22);
    }
  }
  BT.hurtAgent = hurtAgent;
  function agentDown(ag) {
    const B = BT.B;
    if (ag.act && window.CHOREO) CHOREO.end(ag, ag.act);
    ag.hp = 0; ag.alive = false; ag.act = null; ag.state = 'dead'; ag.anim.state = 'dead'; ag.stT = 0; ag.queue.length = 0; ag.stun = 0; ag.dodge = null;
    log(`${ag.def.name} is down!`, 'warn'); callout(`${ag.def.short.toUpperCase()} DOWN`, 'warn'); say(ag, 'defeated');
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
    if (!T.hazards || !ag || !ag.alive || B.rival || B.opts.tutorial) return;     // a Proxy Clash is a straight fight (and TRAINING a quiet one)
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
    if (B.allOut) {                                              // All-Out: everybody still fighting, the one you lead weighted in
      for (const a of fielded()) pts.push(a);
      for (const v of B.enemies) if (v.alive && pts.length < 8) pts.push(v);
      if (ag && ag.alive) pts.push(ag, ag);
    } else {
      if (ag && ag.obj.visible) pts.push(ag);
      const tgt = ag && BT.pickTarget(ag); if (tgt) pts.push(tgt);
      for (const v of B.enemies) if (v.alive && v !== tgt && pts.length < 4 && ag && dist(v, ag) < 7) pts.push(v);
    }
    if (pts.length) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
      tx = (x0 + x1) / 2; tz = (z0 + z1) / 2 + 0.4; const spread = Math.hypot(x1 - x0, (z1 - z0) * 1.4);
      if (B.allOut && ag && ag.alive) { tx = tx * 0.75 + ag.x * 0.25; tz = tz * 0.75 + (ag.z + 0.4) * 0.25; }
      zoom = clamp(0.72 + spread * 0.07, 0.8, B.allOut ? 1.7 : 1.45); yaw = clamp(-tx * 0.025, -0.25, 0.25);
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
    const d = 12.2 * C.zoom * (BT.camK || 1), hgt = 8.2 * C.zoom * (BT.camK || 1);   // camK: further back on a portrait screen
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
      if (B.introT > 1.6) { B.phase = 'fight'; callout('FIGHT', 'fight'); say(active(), 'encounter_' + (B.rival ? 'boss' : B.opts.encounter)); }
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
    BT.emit('frame', rdt);
  };
  function flashTint(e, rdt) {
    if (e.flash > 0) e.flash = Math.max(0, e.flash - rdt * 6);
    const B = BT.B, m = e.rig.mat;
    let r = e.flash * 0.9, g = e.flash * 0.9, b = e.flash * 0.9;
    if (e.type === 'agent' && e.stun > 0) { const s = 0.25 + 0.15 * Math.sin(B.real * 10); r += s; g += s * 0.85; }
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
      if (!a.act && a.airY > 0) a.airY = Math.max(0, a.airY - dt * 9);
      if (a.dodge && B.t > a.dodge.until) { a.dodge = null; if (a.state === 'dodge') { a.state = 'idle'; a.anim.state = 'idle'; } }
      const on = onFieldA(a);
      if (a.def.resource === 'adrenaline') gainEnergy(a, (on ? 2.2 : 1.0) * dt + (a.adrBoost > B.t ? 2 * dt : 0), true);
      else gainEnergy(a, a.st.er * (on ? 1 : 0.45) * dt);
      if (a.id === 'burnice' && !a.nitro && a.heat >= 50) a.nitro = true;
      if (a.pflow && B.phase === 'fight') phaseFlow(a, dt);
      if (B.phase === 'fight') mech(a, 'tick', dt, on);
    }
    // the Radiant Aegis
    if (B.aegis && B.aegis.until <= B.t && B.aegis.hp > 0) { B.aegis.hp = 0; B.aegis.atkUntil = B.t + 5; }
    // Fandom Power tokens bob
    for (const f of B.fandom) f.t += dt;
    // the AI: Agents, enemies, and (on AUTO) the commander
    if (B.phase === 'fight') {
      BT.thinkAgents(dt);
      BT.thinkEnemies(dt);
      if (B.auto) BT.thinkCommander(dt);
    }
    stepProjs(dt);
    // enemy timers, anomalies
    for (const v of B.enemies) {
      if (!v.alive) { v.stT += dt; v.airY = Math.max(0, v.airY - dt * 4); if (v.stT > 1.4 && v.obj.visible) { v.obj.visible = false; FX.burst(v.x, 0.8, v.z, 20, { col: [0x9a9aa8, 0xffffff, 0x5a5a66], speed: 3, size: 0.12, life: 0.5, g: -1 }); } continue; }
      tickAnomaly(v, dt);
      if (v.flinch > 0) v.flinch -= dt;
      if (v.lumi && v.lumiT <= B.t) v.lumi = 0;
      if (v.stun > 0) {
        v.stun -= dt; v.daze = v.dazeMax * clamp(v.stun / v.stunMax, 0, 1);
        if (v.stun <= 0) endStun(v);
      }
      // boss adds and phases
      if (v.rank === 'boss' && !B.addsDone && B.enc.adds && v.hp / v.hpMax <= B.enc.adds.at) {
        B.addsDone = true; log(`${v.def.name} calls for backup!`, 'warn'); callout('REINFORCEMENTS', 'wave');
        B.enc.adds.ids.forEach((id, k) => { const e = makeEnemy(id); e.x = (k ? 1 : -1) * 7; e.z = -4; e.airY = 6; e.spawnT = 0.6 + k * 0.2; B.enemies.push(e); });
      }
      if (v.def.phase2 && v.phase === 1 && v.hp / v.hpMax <= v.def.phase2.at) { v.phase = 2; callout('PHASE 2', 'wave', v.def.phase2.name); log(`${v.def.name} enters phase 2: ${v.def.phase2.name}.`, 'warn'); if (BT.hooks.phase2 && !B.opts.attract) BT.hooks.phase2(v); }
    }
    hazards(dt);
    if (B.rival) CLASH.step(dt);                                // the rival Proxy: resources, swaps, the next Agent in
    if (B.result) return;
    // the on-field Agent went down: bring in the next one
    if (B.downSwap > 0) {
      B.downSwap -= dt;
      if (B.downSwap <= 0) {
        if (B.allOut) {                                          // All-Out: nobody steps in; you lead whoever is left
          const left = B.squad.filter(s => s.alive); if (!left.length) return finish('lose');
          if (!active().alive) { B.active = B.squad.indexOf(left[0]); log(`You lead ${left[0].def.short}.`, 'cmd'); }
        } else { const nx = nextAlive(1); if (nx) { swapIn(nx, 'forced'); log(`${nx.def.short} steps in.`, 'cmd'); } else return finish('lose'); }
      }
    }
    // the wave is cleared
    if (B.phase === 'fight' && !B.rival && B.enemies.length && B.enemies.every(e => !e.alive) && !B.waveDelay) B.waveDelay = 1.6;
    if (B.waveDelay > 0) {
      B.waveDelay -= dt;
      if (B.waveDelay <= 0) {
        B.waveDelay = 0;
        for (const e of B.enemies) disposeEnt(e); B.enemies = []; B.threats = [];
        if (B.wave + 1 < B.waves.length) spawnWave(B.wave + 1); else return finish('win');
      }
    }
  }
  /* an enemy is out of its Stun (time's up, or something ends it early: Hugo's Totalize) with `daze` left in its bar */
  function endStun(v, daze) {
    const B = BT.B;
    v.stun = 0; v.daze = daze || 0; v.subj = 0; v.state = 'idle'; v.anim.state = 'idle'; v.chainsLeft = 0;
    log(`${v.def.name} recovers from Stun.`, 'sys'); if (B.chain && B.chain.tgt === v) closeChain(); say(active(), 'stun_recover');
  }
  BT.endStun = endStun;
  function finish(result) {
    const B = BT.B; if (B.result) return;
    B.result = result; B.phase = 'end'; closeChain();
    for (const ag of fielded()) if (result === 'win' && ag.alive && !(ag.stun > 0)) { if (ag.act && window.CHOREO) CHOREO.end(ag, ag.act); ag.state = 'win'; ag.anim.state = 'win'; ag.act = null; }
    // Victory / Defeat from the soundtrack; the synthesized jingle only with the music off
    if (B.opts.attract || !MUSIC.play(result === 'win' ? 'win' : 'lose', { fade: 300 })) SFX.play(result === 'win' ? 'win' : 'lose');
    const clash = !!B.rival;
    callout(result === 'win' ? (clash ? 'VICTORY' : 'MISSION CLEAR') : (clash ? 'DEFEAT' : 'MISSION FAILED'), result === 'win' ? 'clear' : 'fail');
    log(result === 'win' ? (clash ? `${B.rival.diff.name}'s whole squad is down.` : 'All enemies defeated.') : 'The whole squad is down.', 'sys');
    if (clash) CLASH.finish(B, result);
    setTimeout(() => { if (BT.B === B && BT.hooks.finish) BT.hooks.finish(B); }, 2200);
  }
  BT.finish = finish;
  BT.retreat = () => { const B = BT.B; if (!B || B.result) return; B.result = 'retreat'; B.phase = 'end'; if (BT.hooks.finish) BT.hooks.finish(B); };

  /* companions: Yixuan's ink bird at her shoulder (it swoops in on her wing strikes); Hu Wei, Ju Fufu's
     cauldron, which rolls along beside whoever is fighting and jumps on the target every few seconds.
     A rival's companions do the same for the rival. And Orphie, off the field, flashes in to fire
     Corrosive Flash (her tail, Magus, does the firing). */
  function stepCompanions(dt, rdt) {
    const B = BT.B;
    for (const c of B.companions) {
      if (!c.owner.alive) { c.obj.visible = false; c.slam = null; continue; }
      if (c.id === 'huwei') stepHuwei(c, dt, rdt);
      else if (c.obj.visible) stepBird(c, dt, rdt);
    }
    for (const o of B.squad.concat(B.rival ? B.rival.squad : [])) if (o.id === 'orphie') corrosiveFlash(o, dt, rdt);
  }
  function stepBird(c, dt, rdt) {
    const B = BT.B, o = c.owner;
    const A = o.act, dive = c.dive && B.real - c.dive.t0 < c.dive.dur && c.dive.tgt.alive ? c.dive : null, wingMove = !!dive || (A && /wings|ultYixuan|auric|array/.test(A.def.anim || ''));
    let tx, tz, ty;
    if (dive) { const k = (B.real - dive.t0) / dive.dur, s = Math.sin(k * Math.PI); tx = U.lerp(o.x, dive.tgt.x, s); tz = U.lerp(o.z, dive.tgt.z, s); ty = 2.4 - s * 1.5; if (!dive.hit && k > 0.45) { dive.hit = true; FX.named('ink', { x: dive.tgt.x, z: dive.tgt.z, y: 1, r: 1.4 }); FX.glow(dive.tgt.x, 1, dive.tgt.z, 1.8, 0xffcf4a, 0.25); } }
    else if (wingMove && A.tgt && A.tgt.alive) { const k = Math.sin(Math.min(1, A.t / A.dur) * Math.PI); tx = U.lerp(o.x, A.tgt.x, k * 0.9); tz = U.lerp(o.z, A.tgt.z, k * 0.9); ty = 2.4 + k * 1.2; }
    else { tx = o.x - Math.sin(o.face) * 0.6 + Math.cos(o.face) * 0.9; tz = o.z - Math.cos(o.face) * 0.6 - Math.sin(o.face) * 0.9; ty = 2.35; }
    const k = 1 - Math.exp(-(dive ? 16 : wingMove ? 9 : 4) * Math.max(dt, rdt * 0.2));
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
  /* whom a companion attacks: the target of whoever leads its side */
  function sideTarget(o, an) {
    if (!o.rival) return BT.pickTarget(an);
    const F = fielded().filter(x => x.obj.visible);
    if (an.tgt && F.includes(an.tgt)) return an.tgt;
    return F.sort((x, y) => dist(x, an) - dist(y, an))[0] || null;
  }
  /* Hu Wei comes down on a target (choreography, its own attack, Suppressing Tiger Cauldron). mode:
     jump    a leap, spinning, onto the target
     flail   Ju Fufu swings it round her by its tail, then down onto the target
     ride    it spins like a top under her (Mountain King's Game): no landing
     meteor  it drops from high above, on fire (her Ultimate) */
  function huweiSlam(c, v, o) {
    const B = BT.B; if (!c.owner.alive || !v) return;
    if (c.slam && c.slam.strike && !c.slam.landed && !o.strike) return;   // (a jump that will hit is not cut short by a show one)
    c.obj.visible = true;
    c.slam = { t0: B.t, dur: o.dur || 0.8, tgt: v, x0: c.x, z0: c.z, big: o.big || 1, popcorn: o.popcorn, strike: o.strike || null, landed: false, mode: o.mode || 'jump', a0: ang(c.owner, c) };
  }
  BT.huweiSlam = huweiSlam;
  function slamLands(c, S) {
    const B = BT.B, v = S.tgt, r = S.big * 1.3;
    FX.named('explode', { x: v.x, z: v.z, r: r * 1.2 }); FX.named('quake', { x: v.x, z: v.z, r: r * 1.3 });
    FX.glow(v.x, 0.6, v.z, 1.4 * S.big, 0xff8a2a, 0.3, { size1: 2.4 * S.big });     // the tiger's brow-mark flares
    if (S.popcorn) FX.named('popcorn', { x: v.x, z: v.z, r });
    B.cam.shake = Math.max(B.cam.shake, S.big > 1 ? 0.3 : 0.12); SFX.play(S.big > 1 ? 'boom' : 'heavy');
    if (S.strike) companionStrike(c, S.strike, v);
  }
  /* a companion's hit: through the usual hit path for yours, through clash.js on your Agents for a rival's */
  function companionStrike(c, St, v) {
    const o = c.owner; if (!v || !v.alive) return;
    if (o.rival) { if (window.CLASH && CLASH.companionHit) CLASH.companionHit(o, St.h, v); return; }
    const A = { kind: St.kind || 'core', def: { name: St.name || '', hits: [] }, data: {}, dir: ang(c, v), t: 0 };
    const r = St.h.r || 0, victims = r ? enemiesIn('circle', v.x, v.z, r, 0) : [];
    if (!victims.includes(v)) victims.push(v);
    for (const x of victims) applyHit(o, x, St.h, A, St.h.attr || o.flux || o.def.attr);
    if (St.might) o.might = Math.min(200, o.might + St.might);
    if (St.bheat) o.bheat = Math.min(125, o.bheat + St.bheat);
    if (St.roar) tigersRoar(o);
  }
  function suppress(fu, v) {
    const B = BT.B, K = fu.def.kit.suppress, c = B.companions.find(x => x.owner === fu && x.id === 'huwei');
    log(`Hu Wei: ${K.name}!`, 'chain'); callout(K.name.replace('Chain Attack: ', ''), 'skill', 'Hu Wei · 100 Might');
    const St = { h: { mult: K.mult, daze: K.daze, bu: K.bu, r: K.r, attr: 'fire' }, kind: 'chain', name: K.name, roar: true };
    if (c) huweiSlam(c, v, { dur: 0.9, big: 2.2, popcorn: true, strike: St }); else companionStrike({ owner: fu, x: fu.x, z: fu.z }, St, v);
  }
  function tigersRoar(fu) {
    const B = BT.B;
    B.roarCd = 0.2 + Math.min(0.2, Math.max(0, fu.st.atk - 2800) * 0.0005);
    if (!(B.roar > B.t)) { log(`Tiger's Roar: +${Math.round(B.roarCd * 100)}% CRIT DMG, Chain Attack DMG +11.7%, Ultimate DMG +23.3% for the squad (30 s).`, 'skill'); callout("TIGER'S ROAR", 'skill', 'the whole squad'); }
    B.roar = B.t + 30;
  }
  function stepHuwei(c, dt, rdt) {
    const B = BT.B, o = c.owner, an = anchorOf(o), K = o.def.kit.huwei, R0 = 0.28;   // R0: it sits on the ground
    c.obj.visible = true;
    // its own attack every few seconds, on whatever its side is fighting
    if (B.phase === 'fight' && dt > 0 && !c.slam && !B.result) {
      o.huweiT -= dt;
      if (o.huweiT <= 0) {
        const v = sideTarget(o, an);
        if (v && v.alive && dist(an, v) < 9) { o.huweiT = K.every; huweiSlam(c, v, { dur: 0.8, popcorn: Math.random() < 0.5, strike: { h: { mult: K.mult, daze: K.daze, bu: K.bu, attr: 'fire', r: 1.4 }, kind: 'huwei', name: K.name, might: K.might } }); }
        else o.huweiT = 0.6;
      }
    }
    const S = c.slam, P = c.rig.parts;
    let scale = 1, spin = 0;
    const px = c.x, pz = c.z;
    if (S) {
      const k = (B.t - S.t0) / S.dur, v = S.tgt, top = 2.4 + S.big * 0.7;
      if (k >= 1 || (!v.alive && !S.landed && S.mode !== 'ride')) c.slam = null;
      else if (S.mode === 'ride') {                                   // a top under her, spinning
        c.x = o.x; c.z = o.z; c.y = R0; spin = B.real * 22;
        if (Math.random() < 0.6) FX.p({ x: c.x + rnd(-0.4, 0.4), y: 0.1, z: c.z + rnd(-0.4, 0.4), vy: rnd(0.5, 1.5), life: 0.3, size: 0.15, col: U.pick([0xffd060, 0xff8a2a]), g: -1 });
      } else {
        if (k < 0.55) {
          const q = k / 0.55;
          if (S.mode === 'flail') {                                   // round her on its tail, twice
            const a = S.a0 + q * Math.PI * 4, r = 1.6; c.x = o.x + Math.sin(a) * r; c.z = o.z + Math.cos(a) * r; c.y = 0.9 + q * 0.6;
            if (rdt > 0) { const hand = sockWorld(o, 'weapon', new THREE.Vector3()); FX.beam(hand, new THREE.Vector3(c.x, c.y, c.z), 0xf0b030, 0.07, 0.05); }
          } else if (S.mode === 'meteor') { c.x = v.x; c.z = v.z; c.y = 7.5 - q * 1.5; if (Math.random() < 0.8) FX.p({ x: c.x, y: c.y, z: c.z, vy: 2, life: 0.4, size: 0.4, size1: 0.1, col: U.pick([0xffd060, 0xff8a2a, 0xff4a1a]) }); }
          else { c.x = U.lerp(S.x0, v.x, q); c.z = U.lerp(S.z0, v.z, q); c.y = R0 + Math.sin(q * Math.PI * 0.5) * top; }
          spin = q * Math.PI * 4;
        } else if (k < 0.7) {
          const q = (k - 0.55) / 0.15, y0 = S.mode === 'meteor' ? 6 : S.mode === 'flail' ? 1.5 : R0 + top;
          if (S.mode === 'flail') { c.x = U.lerp(c.x, v.x, q); c.z = U.lerp(c.z, v.z, q); } else { c.x = v.x; c.z = v.z; }
          c.y = y0 * (1 - q * q) + R0 * q * q;
          if (S.mode !== 'jump' && Math.random() < 0.8) FX.p({ x: c.x, y: c.y, z: c.z, vy: 2, life: 0.35, size: 0.35, size1: 0.1, col: U.pick([0xffd060, 0xff8a2a]) });
        } else { c.x = v.x; c.z = v.z; c.y = R0 + (k - 0.7) * 1.2; }
        if (k >= 0.7 && !S.landed) { S.landed = true; slamLands(c, S); }
        scale = 1 + (S.big - 1) * (k < 0.7 ? Math.sin(Math.min(1, k / 0.55) * Math.PI / 2) : Math.max(0, 1 - (k - 0.7) / 0.3));
        c.face = turn(c.face, ang(c, v), 1 - Math.exp(-10 * rdt));
        if (P.head) P.head.rotation.x = k < 0.6 ? -0.5 : 0;          // the lid lifts as it comes down
      }
    }
    if (!c.slam) {
      // it rolls along beside whoever is fighting
      const tx = an.x - Math.sin(an.face) * 0.5 - Math.cos(an.face) * 1.0, tz = an.z - Math.cos(an.face) * 0.5 + Math.sin(an.face) * 1.0;
      const k = 1 - Math.exp(-5 * Math.max(dt, rdt * 0.2));
      c.x += (tx - c.x) * k; c.z += (tz - c.z) * k; c.y += (R0 - c.y) * (1 - Math.exp(-14 * rdt));
      const moved = Math.hypot(c.x - px, c.z - pz);
      if (moved > 0.002) { c.face = turn(c.face, Math.atan2(c.x - px, c.z - pz), 1 - Math.exp(-10 * rdt)); c.roll = (c.roll || 0) + moved / R0; }
      else { const tg = sideTarget(o, an); c.face = turn(c.face, tg ? ang(c, tg) : an.face, 1 - Math.exp(-5 * rdt)); c.roll = (c.roll || 0) * Math.exp(-6 * rdt); }   // stopped: it sits up, face front
      if (P.head) P.head.rotation.x = Math.sin(B.real * 3) * 0.05;
    }
    if (P.body) P.body.rotation.x = c.slam ? 0 : (c.roll || 0) % (Math.PI * 2);
    c.flap += rdt * 5;
    if (P.armL) P.armL.rotation.z = Math.sin(c.flap) * 0.15; if (P.armR) P.armR.rotation.z = -Math.sin(c.flap) * 0.15;
    if (P.tail) P.tail.rotation.x = 0.2 + Math.sin(c.flap * 0.8) * 0.25;
    c.obj.scale.setScalar(scale);
    c.obj.position.set(c.x, c.y, c.z); c.obj.rotation.y = c.face + spin;
  }
  /* Corrosive Flash: while Orphie is off the field (All-Out: standing idle between her own moves) and a
     teammate is attacking, she flashes in beside her, braces, and Magus fires four laser pulses at that
     teammate's target from over her shoulder; then (if she was off the field) she is gone again. She cannot
     be hit while she is out there: she is not on the field. */
  function corrosiveFlash(o, dt, rdt) {
    const B = BT.B, K = o.def.kit.corrosive; if (!o.alive) { o.cflash = null; return; }
    const allOut = o.rival ? B.rival && B.rival.allOut : B.allOut, onF = o.rival ? !o.benched : onFieldA(o);
    let F = o.cflash;
    if (F && F.ghost && onF) { o.cflash = F = null; }                  // swapped in meanwhile: she is simply on the field now
    if (!F) {
      if (B.phase !== 'fight' || dt <= 0 || B.result) return;
      o.corrT -= dt;
      if (o.corrT > 0 || (allOut ? (o.act || o.state !== 'idle') : onF)) return;
      const side = o.rival ? B.rival.squad.filter(r => r.alive && !r.benched) : fielded();
      const sh = side.find(s => s !== o && s.act && s.act.def.hits && s.act.def.hits.length && s.act.tgt && s.act.tgt.alive);
      if (!sh) { o.corrT = 0.4; return; }
      o.corrT = K.every;
      F = o.cflash = { t0: B.t, dur: 1.2, tgt: sh.act.tgt, n: 0, ghost: !onF };
      if (F.ghost) {
        const side2 = Math.random() < 0.5 ? 1 : -1;
        o.x = sh.x + Math.cos(sh.face) * 1.5 * side2; o.z = sh.z - Math.sin(sh.face) * 1.5 * side2; o.face = ang(o, F.tgt); o.airY = 0;
        o.obj.visible = true; FX.burst(o.x, 1, o.z, 14, { col: [0xffffff, 0xff6a1a], speed: 3, size: 0.1, life: 0.35, g: -2 });
      }
      if (F.ghost) { F.act = { anim: 'orBrace', tail: 'cannon' }; Object.assign(o.anim, { state: 'act', t: 0, th: 0.35, dur: 1.2, act: F.act }); }
      if (!o.rival && !o.told) { o.told = true; log(`Orphie & Magus: ${K.name}, from the bench (every ${K.every} s while another Agent attacks).`, 'skill'); }
    }
    const k = (B.t - F.t0) / F.dur, v = F.tgt;
    if (F.ghost) { if (rdt > 0) o.face = turn(o.face, ang(o, v), 1 - Math.exp(-12 * rdt)); o.anim.t = B.t - F.t0; }
    const pulses = [0.3, 0.42, 0.54, 0.66];
    while (F.n < 4 && k >= pulses[F.n] && v.alive) { F.n++; magusPulse(o, v); companionStrike({ owner: o, x: o.x, z: o.z }, { h: { mult: K.mult, daze: 15, bu: K.bu, attr: 'fire' }, kind: 'corrosive', name: K.name, bheat: F.n === 1 ? K.bheat : 0 }, v); }
    if (k >= 1 || !v.alive) {
      o.cflash = null;
      if (F.ghost && o.anim.act === F.act) { o.anim.state = 'idle'; o.anim.act = null; }
      if (F.ghost) { o.obj.visible = false; FX.burst(o.x, 1, o.z, 12, { col: [0xffffff, 0xff6a1a], speed: 3, size: 0.1, life: 0.3, g: -2 }); }
      return;
    }
    // a rival on the bench is not drawn by the main loop: place and pose her here
    if (o.rival && F.ghost) { o.obj.position.set(o.x, 0, o.z); o.obj.rotation.y = o.face; ANIM.apply(o, Math.max(dt, rdt * 0.5), B.t); }
  }
  function magusPulse(o, v) {
    const p = new THREE.Vector3(); sockWorld(o, 'muzzle', p);
    const end = new THREE.Vector3(v.x, 0.9, v.z);
    FX.beam(p.clone(), end, 0xff4a1a, 0.22, 0.12); FX.beam(p, end, 0xfff0c0, 0.08, 0.1);
    FX.glow(p.x, p.y, p.z, 0.9, 0xffa040, 0.1); FX.glow(v.x, 0.9, v.z, 1.2, 0xff7a2a, 0.15); SFX.play('fire');
  }
})();
