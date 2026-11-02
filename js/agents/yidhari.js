/* ============================================================================
   agents/yidhari.js -- Yidhari Murphy of Spook Shack, an octopus Thiren who
   writes ghost stories and spaces out between them. S-Rank, Ice, Rupture,
   Defensive Assist. Released in Version 2.3.

   (The hooks and helpers an Agent's own file can use are listed in the
   header of agents/zhuyuan.js. Hers: init, squad, start, hit, mods, tick,
   incoming, ult, ultUsed, resolve, ai, hud.)

   Sources: Zenless Zone Zero Wiki (Yidhari Murphy, Lore, Voice-Overs,
   Dialogue, Max Adrenaline, Sheer Force, Tentacles, the skill preview
   clips), zzz.gachabase.net (datamine, game data 3.4.2: every level-12
   number matches the wiki's live values), the official HoYoWiki entry and
   HoYoLAB Agent Record, Prydwen.

   Her kit (official):
     Basic Attack: Crushing Strike   3 hits; the 3rd heals her 10% HP.
     Basic Attack: Frostbite Embrace hold Basic: she charges up to 3 levels,
                                     draining HP (faster the higher it is,
                                     never below 25%); let go to slam. Level
                                     3 is a long spin (it drags small fry in)
                                     then a smash; Basic mid-spin skips to the
                                     smash. After a level 2+ slam, Basic is
                                     Crushing Strike's 3rd hit, up to +30%.
     Frost's Crushing Weight         hit while charging or spinning, her
                                     tentacles block (25% less DMG); below full
                                     charge they strike back and add a level.
                                     Then Special/EX: a sure Surging Cold.
     Special Attack: Cease Thoughts  a launcher.
     Special Attack: Surging Cold, Crushing Pursuit   Special/EX while
                                     charging or spinning (or Dodge with Basic
                                     held): a launcher. Meeting a blow is
                                     Surging Cold; hitting a Stunned enemy with
                                     60 Adrenaline is Crushing Pursuit. Either
                                     maxes the charge; Basic during it is the
                                     finishing smash.
     EX Special Attack: Frost Coil (60 Adrenaline): two rising strikes, icy
                                     mist; if it hit, she heals 33% of her
                                     missing HP at the end.
     EX Special Attack: Glacial Crush (60, after Surging Cold or Crushing
                                     Pursuit, EX or Basic): dash, leap, smash;
                                     heals 33% of missing HP; +15 Adrenaline
                                     after Surging Cold (once a second); Basic
                                     after it is the finishing smash.
     Dash Attack: Frostbloom Impact  Dodge Counter: Icehaul Reverb
     Chain Attack: Frostbound Oath   (stronger in Wellspring, tentacles join)
     Ether Veil: Wellspring          with full Decibels, the final hit of
                                     Frostbite Embrace, Frost Coil, Glacial
                                     Crush or the Chain Attack spends 3,000:
                                     the squad's Max HP +5% for 30 s (repeats
                                     extend it, up to 300 s); she charges, and
                                     drains, faster.
     Ultimate: Final Act - Crossing the River of Regret   only within 30 s of
                                     a Wellspring she opened, once, free.
     Quick Assist: Frostshock Reinforcement   Defensive Assist: Flashquake
     Rejection   Assist Follow-Up: Glacial Onslaught
     Core Passive: Dreamscape Collection   Sheer Force +0.1 per Max HP, all her
                                     Ice DMG is Sheer DMG; +60 Adrenaline on
                                     entering battle; her skills deal more DMG
                                     as her HP falls (+100% below 50%, kept 5 s
                                     after she heals past it); fewer Decibels
                                     from her hits, 10 for every 1% HP lost.
     Additional Ability: Narrative Completion   with a Stun or Support Agent:
                                     below 50% HP +30% CRIT DMG and 25% less DMG
                                     taken; in Wellspring, a level-3 charged
                                     slam or Glacial Crush calls an icy
                                     tentacle (an EX Special Attack, 12 s).
   Our choices (no source gives them): 0.45 s per charge level; the drain
   rate; AUTO charges to level 3; how much "fewer" Decibels her hits give
   (40% of the usual); the Max HP +5% does not refill current HP; the split
   of multi-part skills into hits; which hits are heavy (the usual rule).
   The first hit's "ALT" values (125.1%) are not used: no source says when.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, R = D.RULES, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const ICE = 0x8fe4ff, ICEW = 0xe0ffff, ICEB = 0xbfeaff, LAVG = 0xd8c8f0, MAG = 0xe45cff, VIO = 0x9a5ae8;

  /* ----------------------------------------------------------------- kit --
     adr: Adrenaline a landed hit gives (datamine); ydFinal: a final hit that
     can open Wellspring; ydTent: one that can call Narrative Completion's
     tentacle; ydHeal / ydHealMiss: her heals. */
  const CS = 'Basic Attack: Crushing Strike', FE = 'Basic Attack: Frostbite Embrace';
  const K = {
    basic: [
      { name: CS, anim: 'ydUp', dur: 0.5, cancel: 0.36, reach: 2.0, range: 1.6, hits: [hit(0.18, 122.3, 89.1, 54, { adr: 2.16, shape: 'arc', r: 2.4, arc: 130 })] },
      { name: CS, anim: 'ydSweep', dur: 0.62, cancel: 0.46, reach: 2.0, range: 1.6, hits: [hit(0.24, 172.9, 131.3, 79.3, { adr: 3.17, shape: 'circle', at: 'self', r: 2.5 })] },
      { name: CS, anim: 'ydSlam', dur: 0.85, cancel: 0.66, reach: 2.0, range: 1.6, ydHeal: 0.1, hits: [hit(0.4, 415.7, 256.3, 155, { adr: 6.2, heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 1.0 })] },
    ],
    // the same 3rd hit, out of a level 2+ charged slam (+15% / +30%: "up to 30%", our split by level)
    cs3: { name: CS, anim: 'ydSlam', dur: 0.85, cancel: 0.66, reach: 2.2, range: 1.6, ydHeal: 0.1, hits: [hit(0.4, 415.7, 256.3, 155, { adr: 6.2, heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 1.0 })] },
    // Frostbite Embrace: the charge (held; mech.tick drains HP, raises the level and lets go), then the slam for its level
    feCharge: { name: FE, anim: 'ydCharge', dur: 6, cancel: 0.05, reach: 2.2, range: 1.8, ydCharge: true, hits: [] },
    feL1: { name: FE, anim: 'ydSpinSlam', dur: 0.85, cancel: 0.68, reach: 2.2, range: 1.8, ydFinish: true, ydLv: 1, hits: [hit(0.42, 323.1, 223.0, 134.7, { adr: 3.15, heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.0, ydFinal: true })] },
    feL2: { name: FE, anim: 'ydSpinSlam', dur: 0.85, cancel: 0.68, reach: 2.2, range: 1.8, ydFinish: true, ydLv: 2, hits: [hit(0.42, 508.2, 394.4, 238.5, { adr: 4.79, heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.1, ydFinal: true })] },
    feSpin: { name: FE, anim: 'ydSpinLong', dur: 1.2, cancel: 0.12, reach: 2.2, range: 1.6, ydLv: 3, then: 'feSmash', hits: [0.2, 0.45, 0.7, 0.95].map(t => hit(t, 472.3 / 4, 266.9 / 4, 161.6 / 4, { adr: 1.62, shape: 'circle', at: 'self', r: 3.0, ydPull: true })) },
    feSmash: { name: FE, anim: 'ydSmash', dur: 0.95, cancel: 0.78, reach: 2.4, range: 1.8, ydFinish: true, ydLv: 3, hits: [hit(0.4, 692.4, 427.2, 258.3, { adr: 6.32, heavy: true, shape: 'circle', at: 'front', r: 3.0, kb: 1.2, ydFinal: true, ydTent: true })] },
    // Frost's Crushing Weight: the tentacles' counter (dealt from mech.incoming during the charge, not a move of its own)
    fcw: { name: 'Frost\'s Crushing Weight', anim: 'ydCharge', dur: 0.3, reach: 2.2, hits: [hit(0, 98.2, 55.4, 33.3, { adr: 1.33, shape: 'cone', r: 2.8, arc: 150, kb: 0.4 })] },
    dash: { name: 'Dash Attack: Frostbloom Impact', anim: 'ydUp', dur: 0.55, cancel: 0.42, reach: 6, hits: [hit(0.24, 142.0, 67.2, 40, { adr: 1.6 })] },
    counter: { name: 'Dodge Counter: Icehaul Reverb', anim: 'ydReverb', dur: 0.7, cancel: 0.55, inv: [0, 0.6], hits: [hit(0.24, 371.2, 305.9, 85, { heavy: true, shape: 'cone', r: 3.0, arc: 150, kb: 0.9 })] },
    special: { name: 'Special Attack: Cease Thoughts', anim: 'ydLaunch', dur: 0.6, cancel: 0.45, reach: 2.0, cd: 1.5, dr: 0.4, hits: [hit(0.22, 79.2, 74.8, 45, { kb: 0.6 })] },
    surge: { name: 'Special Attack: Surging Cold, Crushing Pursuit', anim: 'ydLaunch', dur: 0.75, cancel: 0.4, reach: 2.2, dr: 0.4, hits: [hit(0.22, 168.4, 157.4, 95, { kb: 0.6 })] },
    ex: { name: 'EX Special Attack: Frost Coil', anim: 'ydCoil', dur: 1.3, cancel: 1.15, cost: 60, reach: 2.2, inv: [0, 1.25], ydHealMiss: 0.33, healAt: 1.15,
      hits: [hit(0.25, 1020.6 * 0.3, 771 * 0.3, 523.2 * 0.3), hit(0.55, 1020.6 * 0.3, 771 * 0.3, 523.2 * 0.3), hit(0.9, 1020.6 * 0.4, 771 * 0.4, 523.2 * 0.4, { heavy: true, shape: 'circle', at: 'front', r: 3.0, kb: 1.0, ydFinal: true })] },
    glacial: { name: 'EX Special Attack: Glacial Crush', anim: 'ydGlacial', dur: 1.45, cancel: 1.3, cost: 60, reach: 6, inv: [0, 1.4], ydHealMiss: 0.33, healAt: 1.3,
      hits: [hit(0.25, 2015.2 * 0.25, 1052.7 * 0.25, 701 * 0.25), hit(0.95, 2015.2 * 0.75, 1052.7 * 0.75, 701 * 0.75, { heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1.3, ydFinal: true, ydTent: true })] },
    // Narrative Completion's icy tentacle (an EX Special Attack; its hit is dealt from mech.tick)
    tentacle: { name: 'Narrative Completion: Icy Tentacle', reach: 9, dur: 0.4, hits: [hit(0, 158.4, 0, 0, { shape: 'circle', at: 'target', r: 1.8 })] },
    chain: { name: 'Chain Attack: Frostbound Oath', anim: 'ydChain', dur: 1.4, inv: [0, 1.4],
      hits: [hit(0.55, 1145.8 * 0.4, 415.5 * 0.4, 451.2 * 0.4, { shape: 'arc', r: 2.8, arc: 160 }), hit(1.0, 1145.8 * 0.6, 415.5 * 0.6, 451.2 * 0.6, { heavy: true, shape: 'circle', at: 'target', r: 3.4, kb: 1.2, ydFinal: true })] },
    ult: { name: 'Ultimate: Final Act – Crossing the River of Regret', anim: 'ydUlt', dur: 2.2, inv: [0, 2.2],
      hits: [hit(1.0, 3044.5 * 0.2, 292.2 * 0.2, 176.6 * 0.2, { shape: 'circle', at: 'target', r: 4.5 }), hit(1.5, 3044.5 * 0.8, 292.2 * 0.8, 176.6 * 0.8, { heavy: true, shape: 'circle', at: 'target', r: 5, kb: 2 })] },
    assist: { name: 'Defensive Assist: Flashquake Rejection', type: 'defensive', anim: 'ydBlock', dur: 0.45, inv: [0, 0.45], daze: 408 },
    followup: { name: 'Assist Follow-Up: Glacial Onslaught', anim: 'ydSmash', dur: 1.0, inv: [0, 0.95], hits: [hit(0.42, 626.9, 513.5, 333.4, { heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.1 })] },
    quick: { name: 'Quick Assist: Frostshock Reinforcement', anim: 'ydSlam', dur: 0.7, inv: [0, 0.65], hits: [hit(0.3, 164.7, 77.8, 46.7, { adr: 1.87, kb: 0.7, shape: 'circle', at: 'front', r: 2.2 })] },
  };

  /* ---------------------------------------------------- her mechanics --
     a.ydLv: Frost's Crushing Weight's charge level (0..3). Windows (until a
     time): ydCut (Basic: Crushing Strike's 3rd hit), ydSlam (Basic: the
     finishing slam), ydGC (Glacial Crush), ydFCW (after a tentacle block:
     Special is a sure Surging Cold). ydWell: Wellspring; ydUlt: her free
     Ultimate. */
  const LV_T = 0.45;                 // seconds per charge level (our choice); 1.5x faster in Wellspring
  const DB_KEEP = 0.4;               // the share of the usual Decibels her landed hits still give (our choice: "fewer")
  const HIT_DB = { basic: 8, dash: 8, special: 18, ex: 30, ex2: 30, counter: 40, quick: 60, followup: 60, chain: 40, hold: 8, charged: 30, core: 25 };   // = battle.js applyHit's table
  const SURGE_WIN = 0.42;            // a blow landing this early in the launcher collides with it: Surging Cold
  const slamFor = lv => lv >= 3 ? K.feSmash : lv === 2 ? K.feL2 : K.feL1;
  const dbFull = a => a.decibels >= R.decibelMax - 1;
  const _w = new THREE.Vector3();

  function heal(a, n) {
    n = Math.max(0, Math.min(n, a.hpMax - a.hp)); if (n < 1) return;
    a.hp += n;
    if (BT.T.dmgNumbers) FX.number(a.x, a.height * 0.9, a.z, '+' + U.fmt(n), 'tick', '#9dffd0');
    FX.glow(a.x, 1.0, a.z, 1.6, 0x9dffd0, 0.3, { size1: 2.4, a: 0.6 });
  }
  // Ether Veil: Wellspring: she spends her 3,000 Decibels (her gauge waits at 2,999: see tick)
  function wellspring(a) {
    const B = BT.B, was = a.ydWell > B.t;
    a.decibels = Math.max(0, a.decibels - R.decibelMax + 1);
    a.ydWell = was ? Math.min(B.t + 300, a.ydWell + 30) : B.t + 30;     // repeats extend it, up to 300 s
    a.ydUlt = B.t + 30;                                                 // one Ultimate within 30 s (a new one replaces an unused one)
    wellFx(a); SFX.play('anomaly');
    BT.callout('ETHER VEIL: WELLSPRING', 'skill', 'Yidhari · Ultimate ready');
    BT.log(`Yidhari: Ether Veil: Wellspring (${Math.ceil(a.ydWell - B.t)} s): the squad's Max HP +5%. Her Ultimate is ready for 30 s.`, 'skill');
  }
  // the squad's Max HP +5% while Wellspring lasts (current HP stays: our choice)
  function wellHp(B, on) {
    B.ydWellHp = on;
    for (const s of B.squad) {
      if (on) s.hpMax = Math.round(s.hpMax * 1.05);
      else { s.hpMax = Math.round(s.hpMax / 1.05); s.hp = Math.min(s.hp, s.hpMax); }
      if (s.ydHp != null) s.ydHp = s.hp;
    }
  }
  function surgingCold(a, A) {
    const B = BT.B;
    A.data.ydSC = true; a.ydSC = true; a.ydLv = 3;
    a.ydGC = a.ydSlam = B.t + Math.max(0, A.dur - A.t) + 1.0;
    BT.sock(a, 'chest', _w); star(_w.x + Math.sin(A.dir) * 0.6, _w.y, _w.z + Math.cos(A.dir) * 0.6, 1.1);
    B.freeze = Math.max(B.freeze, 0.1); SFX.play('parry');
    BT.callout('SURGING COLD', 'perfect', 'Yidhari · charge maxed');
    BT.log('Yidhari: Surging Cold! Charge level 3' + (a.energy >= K.glacial.cost ? '; Glacial Crush is ready (EX or Basic).' : '.'), 'perfect');
  }
  function crushingPursuit(a, A) {
    const B = BT.B;
    A.data.ydCP = true; a.ydSC = false; a.ydLv = 3;
    a.ydGC = a.ydSlam = B.t + Math.max(0, A.dur - A.t) + 1.0;
    const h = hammerHead(a); star(h.x, h.y, h.z, 0.9);
    BT.callout('CRUSHING PURSUIT', 'perfect', 'Yidhari · charge maxed');
    BT.log('Yidhari: Crushing Pursuit! Charge level 3; Glacial Crush is ready (EX or Basic).', 'perfect');
  }
  // Frost's Crushing Weight: the tentacles take a blow; below full charge they strike back and add a level
  function block(a, e, h, A) {
    const B = BT.B;
    a.ydFlare = B.t + 0.4; tentFlare(a);
    if (!A.def.ydCharge || a.ydLv >= 3) return;
    a.ydLv++; a.ydChT = 0; levelFx(a); a.ydFlare = 0; a.ydLash = B.t + 0.3; a.ydFCW = B.t + 1.2;
    tentLash(a, A);
    BT.log(`Yidhari: Frost's Crushing Weight (charge level ${a.ydLv}).`, 'skill');
    BT.agentHit(a, K.fcw.hits[0], A);
  }
  // while she charges: the level builds and her HP drains (the higher it is, the faster; never below 25%).
  // You: letting go of Basic slams at the level reached (BT.btnHeld). AUTO: level 3, or Crushing Pursuit on a Stun
  function charging(a, A, dt) {
    const B = BT.B, well = a.ydWell > B.t;
    if (a.ydLv < 3) {
      a.ydChT += dt * (well ? 1.5 : 1);
      if (a.ydChT >= LV_T) { a.ydChT = 0; a.ydLv++; levelFx(a); }
      const f = a.hp / a.hpMax;
      if (f > 0.25) a.hp = Math.max(a.hpMax * 0.25, a.hp - a.hpMax * (0.05 + 0.15 * clamp((f - 0.25) / 0.75, 0, 1)) * (well ? 1.5 : 1) * dt);
    }
    if (BT.isPlayer(a)) { if (a.ydLv >= 1 && (!BT.btnHeld('basic') || A.t > 4)) release(a, A); return; }
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    if (tgt && tgt.stun > 0 && a.ydLv >= 1 && a.energy >= K.glacial.cost) return toSurge(a, tgt);
    if (a.ydLv >= 3) release(a, A);
  }
  function release(a, A) {
    const lv = a.ydLv, tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    const def = lv >= 3 ? (BT.isPlayer(a) || Math.random() < 0.4 ? K.feSpin : K.feSmash) : slamFor(lv);   // (AUTO skips the spin now and then)
    BT.endAct(a); a.gap = 0; a.queue.unshift({ def, kind: 'charged', tgt });
  }
  function toSurge(a, tgt) { if (a.act) BT.endAct(a); a.gap = 0; a.queue.unshift({ def: K.surge, kind: 'special', tgt: tgt || BT.pickTarget(a) }); }
  function icyTentacle(a) {
    const v = a.ydTentTgt && a.ydTentTgt.alive ? a.ydTentTgt : BT.pickTarget(a); a.ydTentTgt = null;
    if (!v || !a.alive) return;
    BT.agentHit(a, K.tentacle.hits[0], { def: K.tentacle, kind: 'ex', t: 0, hi: 0, tgt: v, dir: Math.atan2(v.x - a.x, v.z - a.z), fired: {}, data: {} });
  }

  /* her four tentacles (tn1a..tn4a off her lower back, tn1b..tn4b their tips): [root pitch, root roll, tip pitch,
     tip roll] for tentacle i (s: her right -1 / left +1, o: an outer one) in each mode. They hang like a skirt,
     coil up while she charges, flare out to block, lash forward, trail behind in the air */
  const TENT = {
    rest: (i, s, o, tt) => [0.5 + (o ? 0.05 : 0) + Math.sin(tt * 1.3 + i * 1.7) * 0.06, s * (o ? 0.65 : 0.2), 0.55 + Math.sin(tt * 1.8 + i) * 0.14, s * 0.45],
    run: (i, s, o, tt) => [1.05 + Math.sin(tt * 9 + i) * 0.06, s * (o ? 0.45 : 0.15), 0.35, s * 0.2],
    coil: (i, s, o, tt) => [0.1 + Math.sin(tt * 4 + i) * 0.05, s * (o ? 1.15 : 0.75), -1.0, s * 0.55],
    flare: (i, s, o, tt) => [-0.15, s * (o ? 1.45 : 1.1), -0.65 + Math.sin(tt * 6 + i) * 0.1, s * 0.8],
    lash: (i, s, o) => [-1.25, s * (o ? 0.5 : 0.18), -0.45, s * 0.1],
    trail: (i, s, o, tt) => [1.45, s * (o ? 0.55 : 0.22), 0.7 + Math.sin(tt * 5 + i) * 0.1, s * 0.3],
    limp: (i, s, o) => [0.85, s * (o ? 0.8 : 0.3), 0.3, s * 0.3],
  };
  const TN = [['tn1a', 'tn1b', -1, true], ['tn2a', 'tn2b', -1, false], ['tn3a', 'tn3b', 1, false], ['tn4a', 'tn4b', 1, true]];
  const tentMode = A => { const m = A.def.tent; if (typeof m === 'string') return m; let cur = m[0][1]; for (const e of m) if (A.t >= e[0]) cur = e[1]; return cur; };
  function tentacles(a, dt) {
    const P = a.rig && a.rig.parts; if (!P || !P.tn1a) return;
    const B = BT.B, A = a.act, st = a.anim.state;
    let mode = 'rest';
    if (a.ydFlare > B.t) mode = 'flare'; else if (a.ydLash > B.t) mode = 'lash';
    else if (A && A.def.tent) mode = tentMode(A);
    else if (st === 'run') mode = 'run'; else if (st === 'dodge') mode = 'trail'; else if (['down', 'dead', 'stun', 'getup'].includes(st)) mode = 'limp';
    const fn = TENT[mode] || TENT.rest, tt = B.t + a.seed, k = 1 - Math.exp(-(mode === 'lash' || mode === 'flare' ? 22 : 8) * dt);
    TN.forEach(([ra, rb, s, o], i) => {
      const p = fn(i, s, o, tt), A1 = P[ra], A2 = P[rb]; if (!A1 || !A2) return;
      A1.rotation.x += (p[0] - A1.rotation.x) * k; A1.rotation.z += (p[1] - A1.rotation.z) * k;
      A2.rotation.x += (p[2] - A2.rotation.x) * k; A2.rotation.z += (p[3] - A2.rotation.z) * k;
    });
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.yidhari = {
    id: 'yidhari', name: 'Yidhari Murphy', short: 'Yidhari', faction: 'Spook Shack', spec: 'Rupture', attr: 'ice', rank: 'S',
    color: '#a96eb0', color2: '#deb48a', assist: 'defensive', stance: 'kraken',
    blurb: 'An octopus Thiren of Spook Shack who writes ghost stories and spaces out between them; her four "little ones" hang behind her like a skirt. With the KRAKEN hammer she spends her own HP to charge Frostbite Embrace, heals it back, and turns every 1% she loses into Decibels for Ether Veil: Wellspring.',
    stats: { hp: 9520, atk: 2895, def: 479, impact: 95, ap: 90, am: 87, cr: 0.49, cd: 0.9, er: 0, speed: 4.7 },
    ai: { range: 1.8, dodge: 0.55, reflex: 0.6, aggr: 1.0 },
    energyMax: 120, resource: 'adrenaline', sheer: true,
    core: [
      ['Core Passive: Dreamscape Collection', 'Sheer Force +0.1 per point of Max HP; all her Ice DMG is Sheer DMG (ignores DEF). She enters battle with 60 Adrenaline. Her skills deal more DMG the lower her HP, up to +100% below 50% (kept 5 s after she heals past it). Her hits give fewer Decibels (40% here); instead every 1% HP she loses gives her 10 (hers alone).'],
      ['Frost\'s Crushing Weight', 'Hold Basic to charge Frostbite Embrace: up to 3 levels, draining HP (faster the higher it is, never below 25%); let go to slam (level 3: a spin that drags enemies in, then a smash; Basic skips the spin). After a level 2+ slam, Basic is Crushing Strike\'s 3rd hit (+10% HP), up to +30% DMG. Hit while charging or spinning, her tentacles block (-25% DMG) and, below full charge, strike back and add a level. Special while charging (or Dodge with Basic held): Surging Cold, Crushing Pursuit; meeting a blow, or a Stunned enemy with 60 Adrenaline, maxes the charge and opens Glacial Crush (EX or Basic).'],
      ['Ether Veil: Wellspring', 'With full Decibels, the last hit of Frostbite Embrace, Frost Coil, Glacial Crush or her Chain Attack spends 3,000 Decibels: the squad\'s Max HP +5% for 30 s (repeats extend it, up to 300 s), she charges and drains faster, her Chain Attack hits harder, and her Ultimate is hers to use once within 30 s, free. (It is her only way to her Ultimate.)'],
      ['Additional Ability: Narrative Completion', 'With a Stun or Support Agent in the squad: below 50% HP, +30% CRIT DMG and 25% less DMG taken; in Wellspring, a level-3 charged smash or Glacial Crush calls an icy tentacle to strike (an EX Special Attack, once every 12 s).'],
    ],
    kit: K,
    kitShow: [['Hold', 'feCharge'], ['Blocked', 'fcw'], ['Hold + Special', 'surge'], ['EX', 'glacial']],
    rivalMoves: [{ k: 'feSpin', kind: 'charged', p: 0.2, cd: 6 }, { k: 'feL2', kind: 'charged', p: 0.2, cd: 4 }],
    howto: 'Yidhari: hold Basic to charge Frostbite Embrace (it costs HP, never below 25%) and let go to slam; Basic right after a level 2+ slam is Crushing Strike\'s 3rd hit (+10% HP). Hit while charging, her tentacles block and add a level. Special while charging (or Dodge with Basic held) is Surging Cold: meet a blow, or a Stunned enemy with 60 Adrenaline, for Glacial Crush. Losing HP fills her Decibels; full, a big finisher opens Ether Veil: Wellspring and her free Ultimate. Her assist is a Defensive Assist.',
    mech: {
      init(a) {
        a.energy = 60;   // Dreamscape Collection: she enters battle with 60 Adrenaline (not a full bar)
        Object.assign(a, { ydLv: 0, ydChT: 0, ydWell: 0, ydUlt: 0, ydLowT: 0, ydCut: 0, ydCutLv: 0, ydSlam: 0, ydGC: 0, ydFCW: 0, ydSC: false, ydRefund: 0,
          ydTentCd: 0, ydTentAt: 0, ydTentTgt: null, ydHp: null, ydChg: false, ydFlare: 0, ydLash: 0, ydNC: false });
      },
      squad(a, B) { a.ydNC = B.squad.some(s => s !== a && (s.def.spec === 'Stun' || s.def.spec === 'Support')); },   // Narrative Completion
      start(a, def, A) {
        const B = BT.B;
        if (def === K.feCharge) { a.ydLv = 0; a.ydChT = 0; a.ydCut = 0; a.ydSlam = 0; a.ydGC = 0; return; }
        if (def === K.feSpin) { BT.log(`Yidhari: ${def.name} (charge level 3)`, 'skill'); return; }
        if (def.ydFinish) {
          if (def.ydLv >= 2) { a.ydCut = B.t + A.dur + 0.8; a.ydCutLv = def.ydLv; } else a.ydCut = 0;
          a.ydLv = 0; a.ydSlam = 0; a.ydGC = 0; a.ydFCW = 0;
          BT.log(`Yidhari: ${def.name} (charge level ${def.ydLv})`, 'skill');
        }
        if (def === K.cs3) { A.data.ydCut = a.ydCutLv >= 3 ? 0.3 : 0.15; a.ydCut = 0; }
        if (def === K.surge) {
          a.ydSlam = B.t + A.dur + 0.5; a.ydSC = false;
          if (a.ydFCW > B.t) { a.ydFCW = 0; surgingCold(a, A); }                   // after Frost's Crushing Weight: a sure Surging Cold
        }
        if (def === K.glacial) {
          a.ydGC = 0; a.ydSlam = B.t + A.dur + 0.8;                                 // Basic after it: the finishing smash
          if (a.ydSC && a.ydRefund <= B.t) { BT.gainEnergy(a, 15, true); a.ydRefund = B.t + 1; }   // +15 Adrenaline after Surging Cold (once a second)
          a.ydSC = false;
        }
        if (A.kind === 'chain' && a.ydWell > B.t) A.data.ydWellChain = true;
      },
      hit(a, v, h, A) {
        const B = BT.B;
        if (h.adr) BT.gainEnergy(a, h.adr, true);                                    // Adrenaline per landed hit (datamine)
        // fewer Decibels from her hits: take back part of what battle.js adds right after this
        a.decibels -= (HIT_DB[A.kind] || 10) * BT.T.decibelRate * ((B.buff && B.buff.db) || 1) * (1 - DB_KEEP);
        // the level-3 spin drags non-elite enemies in
        if (h.ydPull && v.rank === 'minion' && !v.rival) { const d = Math.hypot(v.x - a.x, v.z - a.z); if (d > 1.2) { v.x += (a.x - v.x) / d * 0.5; v.z += (a.z - v.z) / d * 0.5; } }
        if (A.def === K.surge && !A.data.ydSC && !A.data.ydCP && v.stun > 0 && a.energy >= K.glacial.cost) crushingPursuit(a, A);
      },
      // (mods runs once for every hit that lands, before its damage: a killing blow counts here too)
      mods(a, v, h, A) {
        const B = BT.B, X = A && A.data;
        if (X) {
          X.ydLanded = true;
          if (h.ydFinal && !X.ydFinalDone) { X.ydFinalDone = true; if (dbFull(a)) wellspring(a); }
          if (h.ydTent && !X.ydTentDone && a.ydNC && a.ydWell > B.t && a.ydTentCd <= B.t) {
            X.ydTentDone = true; a.ydTentCd = B.t + 12; a.ydTentAt = B.t + 0.35; a.ydTentTgt = v;
            iceTentacles(v.x, v.z, null, 1, 0.75, 0.7);
          }
        }
        const f = a.hp / a.hpMax, low = f <= 0.5 || a.ydLowT > B.t;
        let dmg = low ? 1 : clamp((1 - f) / 0.5, 0, 1);                              // Dreamscape Collection: up to +100% as her HP falls (linear: our reading)
        if (X && X.ydCut) dmg += X.ydCut;                                            // Crushing Strike out of a charged slam
        if (X && X.ydWellChain) dmg += 0.1;                                          // Frostbound Oath in Wellspring (1,260.2% for 1,145.8%)
        return { dmg, cd: a.ydNC && f < 0.5 ? 0.3 : 0 };
      },
      // a blow on her: Surging Cold if it meets the launcher; the tentacles block while she charges or spins
      // (-25%, no flinch, no launch); Narrative Completion's -25% below half HP
      incoming(a, e, h) {
        const A = a.act, d = A && A.def;
        if (d === K.surge && A.t <= SURGE_WIN && !A.data.ydSC) { surgingCold(a, A); return true; }
        const guard = !!(d && (d.ydCharge || d === K.feSpin)), nc = a.ydNC && a.hp < a.hpMax * 0.5;
        if (!guard && !nc) return false;
        const k = (guard ? 0.75 : 1) * (nc ? 0.75 : 1);
        BT.hurtAgent(a, e, Object.assign({}, h, { mult: (h.mult || 0) * k }, guard ? { launch: false, flinchOnly: true } : {}));
        if (guard && a.alive && a.act === A) block(a, e, h, A);
        return true;
      },
      tick(a, dt, on) {
        const B = BT.B, A = a.act, d = A && A.def;
        // Dreamscape Collection: every 1% of HP she loses gives her 10 Decibels (not shared)
        if (a.ydHp != null && a.hp < a.ydHp) a.decibels = Math.min(R.decibelMax, a.decibels + (a.ydHp - a.hp) / a.hpMax * 1000 * BT.T.decibelRate);
        a.ydHp = a.hp;
        // her Decibels wait just under MAXIMUM: full, they open Wellspring (a final hit), never a plain Ultimate
        if (a.decibels > R.decibelMax - 1) a.decibels = R.decibelMax - 1;
        if (a.hp < a.hpMax * 0.5) a.ydLowT = B.t + 5;                                // the full DMG bonus lingers 5 s after she heals past 50%
        if ((a.ydWell > B.t) !== !!B.ydWellHp) wellHp(B, a.ydWell > B.t);
        // heals: 10% on Crushing Strike's 3rd hit; 33% of missing HP at the end of Frost Coil and Glacial Crush, if they hit
        if (d && d.ydHeal && !A.data.ydHealed && A.t >= d.hits[0].t) { A.data.ydHealed = true; heal(a, a.hpMax * d.ydHeal); }
        if (d && d.ydHealMiss && !A.data.ydHealed && A.data.ydLanded && A.t >= d.healAt) { A.data.ydHealed = true; heal(a, (a.hpMax - a.hp) * d.ydHealMiss); }
        if (a.ydTentAt && B.t >= a.ydTentAt) { a.ydTentAt = 0; icyTentacle(a); }
        if (d && d.ydCharge) charging(a, A, dt);
        // Dodge with Basic held while charging: Surging Cold, Crushing Pursuit instead (AUTO: a dodge it planned mid-charge)
        if (a.ydChg && !a.act && a.state === 'dodge' && a.dodge && (!BT.isPlayer(a) || BT.btnHeld('basic'))) {
          a.dodge = null; a.state = 'idle'; a.anim.state = 'idle'; a.vx = 0; a.vz = 0; a.dashUntil = 0; a.press = null;
          a.dodgeCharges = Math.min(R.dodgeCharges, a.dodgeCharges + 1);
          toSurge(a, null);
        }
        a.ydChg = !!(a.act && a.act.def.ydCharge);
        // in Wellspring her tentacles glow white-lavender
        if (a.ydWell > B.t && a.obj.visible && a.rig.parts.tn1b && Math.random() < dt * 12) {
          a.rig.socket(U.pick(['tn1b', 'tn2b', 'tn3b', 'tn4b']), [0, -rnd(1, 6), 0], _w);
          FX.p({ x: _w.x, y: _w.y, z: _w.z, vx: rnd(-0.3, 0.3), vy: rnd(0.3, 1), vz: rnd(-0.3, 0.3), life: 0.6, size: 0.14, size1: 0.02, col: U.pick([0xffffff, 0xe8dcf4, LAVG, 0xff9af0]) });
        }
        tentacles(a, dt);
      },
      // her Ultimate: only the one a Wellspring gave her, free (cmdUlt spends no Decibels)
      ult(a) { return a.ydUlt > BT.B.t ? { def: K.ult, kind: 'ult', free: true } : null; },
      ultUsed(a) { a.ydUlt = 0; },
      resolve(a, btn, hold, c) {
        const A = a.act, cur = A && A.def, t = c.t;
        const gc = a.ydGC > t && a.energy >= K.glacial.cost ? { def: K.glacial, kind: 'ex' } : null;
        if (btn === 'special') {
          if ((cur && (cur.ydCharge || cur === K.feSpin)) || a.ydFCW > t) return { def: K.surge, kind: 'special' };   // charging, spinning: the counter-launcher
          return gc;                                                                // after Surging Cold / Crushing Pursuit: Glacial Crush (else the usual)
        }
        if (btn !== 'basic') return null;
        if (cur && cur.ydCharge) return hold ? null : { def: slamFor(a.ydLv), kind: 'charged' };
        if (cur === K.feSpin) return { def: K.feSmash, kind: 'charged' };           // Basic mid-spin: straight to the smash
        if (gc) return gc;
        if (!hold && (cur === K.surge || a.ydSlam > t || a.ydFCW > t)) return { def: slamFor(a.ydLv), kind: 'charged' };
        if (hold) return { def: K.feCharge, kind: 'hold' };
        if (a.ydCut > t) return { def: K.cs3, kind: 'basic', step: 2 };
        return null;
      },
      // AUTO: Glacial Crush and the finishing smash when they open, Crushing Strike's 3rd hit after a big slam,
      // Frost Coil on a Stun / a full bar / low HP, otherwise mostly charging (her main damage)
      ai(a, tgt, B) {
        if (a.ydGC > B.t && a.energy >= K.glacial.cost) return { btn: 'special' };
        if (a.ydSlam > B.t || a.ydCut > B.t) return { btn: 'basic' };
        if (a.energy >= K.ex.cost && (a.energy >= 110 || tgt.stun > 0 || a.hp < a.hpMax * 0.35)) return { btn: 'special' };
        if (Math.random() < 0.7) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const f = a.hp / a.hpMax, low = f <= 0.5 || a.ydLowT > B.t;
        const r = [`FROST'S CRUSHING WEIGHT ${'◆'.repeat(a.ydLv)}${'◇'.repeat(3 - a.ydLv)}`, `DREAMSCAPE +${Math.round((low ? 1 : clamp((1 - f) / 0.5, 0, 1)) * 100)}% DMG`];
        if (a.ydWell > B.t) r.push(`WELLSPRING ${Math.ceil(a.ydWell - B.t)}s`);
        else if (dbFull(a)) r.push('DECIBELS FULL · A FINISHER OPENS WELLSPRING');
        if (a.ydUlt > B.t) r.push(`ULTIMATE READY ${Math.ceil(a.ydUlt - B.t)}s`);
        if (a.ydGC > B.t && a.energy >= K.glacial.cost) r.push('GLACIAL CRUSH READY');
        return r;
      },
    },
    town: {
      routine: ['rp:door 35, rp:window 20, news:read 20, huddle 25', 'box:claw 30, box:bench 20, 141:icecream 25, huddle 25', 'rp:door 25, bardic:window 25, soup:stool 25, huddle 25', 'rp:night 35, bardic:bench 25, 141:freezer 20, metro:wait 20'],
      chatter: ['Spacing-out time...', 'It smells like rain. ...Good.'],
      lines: [
        'Hm...? Oh, Proxy. Sorry. It\'s spacing-out time... You can stay, if you like. I don\'t mind company.',
        'I\'m writing a new story for Spook Shack. A claw machine that only gives prizes to people who\'ve already lost something... Yuzuha says it needs more screaming.',
        'The little ones like you. They don\'t say so... but they curl up when you\'re near. That means they\'re happy.',
      ],
      chapters: [
        { title: 'Lost in the queue', ask: ['Proxy... Susie says I\'ve been standing in the claw machine line at Box Galaxy since noon.', 'I don\'t remember joining it. Could you ask her what I came for? ...It might make a good story.'], steps: [{ t: 'talk', to: 'susie', reply: '(Susie laughs: Yidhari stood in line for twenty minutes staring at a plush octopus, let everyone go ahead of her, and never put a coin in.)' }, { t: 'talk', to: 'yidhari' }],
          scene: [['P', 'Susie says you were staring at a plush octopus.'], ['A', '...Ah. Yes. It had the same face one of my little ones makes when it sulks.'], ['A', 'I must have drifted off. It happens. I\'m very good at waiting, so the line never bothered me.'], ['P', 'Want me to try the claw for it?'], ['A', 'No... leave it there. It looked happy with the others. ...That can be how the story ends.']] },
        { title: 'After the rain', ask: ['It\'s going to rain tonight... I can feel it. I like rainy days.', 'Would you bring me a hot milk tea from the 141? I\'ll wait right here. Waiting is something I\'m good at.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'yidhari' }],
          scene: [['A', 'Warm... thank you, Proxy.'], ['A', 'When it rains the whole city goes quiet. Nobody expects anything from anyone. I like that.'], ['P', 'And after the rain?'], ['A', 'A very long, very hot bath, with a record from Bardic Needle playing. ...Elfy says one side is too short for my baths.'], ['A', 'I used to look forward to rain and nothing else. Now there\'s tea with you, too.']] },
        { title: 'The next chapter', ask: ['Yuzuha says a story needs a climax. Mine always stop just before it.', 'Put me at the front of your squad against something big, Proxy. ...I want to see how this one ends.'], steps: [{ t: 'clear', f: { enc: 'boss', lead: 'yidhari' } }, { t: 'talk', to: 'yidhari' }],
          scene: [['A', '...It\'s quiet now. The little ones are tired.'], ['A', 'When I look into the Hollows\' past, everything runs together, like ink in water. But you... I can see you clearly, Proxy.'], ['P', 'Sounds like a good ending.'], ['A', 'An ending? No... a first chapter. We still have the rest of the story to write. Together.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official splash and in-game renders: a honey-blonde wavy bob to
     the jaw (#DEB48A, shadow #B1815F) with a big spiral curl at the front of
     the crown, black streaks on her left, a little braid on her right and a
     yellow ribbon at the back; a near-black brown beret (#2E2927) worn tilted
     back; magenta-pink eyes with a yellow-green centre. A purple high collar
     with a gold eye brooch; a cropped white off-shoulder top (#DDDFEE) with
     chest pockets, a cleavage cutout and a black diamond patch; detached puffy
     white sleeves with black bows down the seams, a black diamond "eye", black
     cuffs with purple studs. A black corset (#2C2825) with a hip chain and a
     round rainbow-lit gadget at her right hip; black shorts with a gold ruffle
     on her left hip (#B77C26) and purple sucker circles. Her right leg in a
     ripped black thigh-high (#3A302F) on a garter strap; her left bare, a
     black band below the knee and a short black sock; black platform
     Mary-Janes with silver rings and purple bows. Four tentacles from her
     lower back, purple on top (#9952A3 / #A96EB0), lavender-grey and suckered
     underneath (#B9AEC1), dark spiral spots and one red one; they hang behind
     her like a skirt (separate parts: mech.tick moves them). KRAKEN: a long
     black shaft with a T-handle, a purple tentacle hook and a red gourd charm;
     a gunmetal cylinder head (#373B46) with a pointed nose and red triangles
     one way, purple sucker discs (#AC78AD) in black-and-white striped rims the
     other, white lettering, a red spiral, spikes round the collar. 171 cm. */
  {
    const HAIR = 0xdeb48a, HAIR2 = 0xb1815f, HAIRHI = 0xf2d2aa, STREAK = 0x2b2321, SKIN = 0xf3d3c6, EYE = 0xe29cb9, EYE2 = 0xb94a8a, EYEC = 0xc6d64e;   // (skin: the report's #DDAFA2 is sampled in shade; lit voxels need it lighter)
    const BERET = 0x2e2927, BERET2 = 0x3d3633, RIBBON = 0xf0c64a;
    const WHITE = 0xdddfee, WHITE2 = 0xc2c4d8, BLACK = 0x2c2825, BLACK2 = 0x1b1918, COLLAR = 0x6b3f8e, GOLD = 0xd9a63e, GOLD2 = 0xb77c26, SILVER = 0xc8ccd6, STUD = 0xa060d0;
    const TIGHT = 0x3a302f, SOLE = 0x232025;
    const TP = 0x9952a3, TP2 = 0xa96eb0, TL = 0xb9aec1, TL2 = 0xcfc6d8, TSUCK = 0x958aa6, TSPOT = 0x3c3640, TRED = 0xc8303a;
    const GUN = 0x373b46, GUN2 = 0x4c5260, GUND = 0x24272e, SHAFT = 0x1c1c22, DISC = 0xac78ad, DISC2 = 0xcb98cc, RIMW = 0xe6e6ee, RIMB = 0x18181c, HRED = 0xd02a2a, GOURD = 0xe0502a, GOURD2 = 0xf08a3a, HOOK = 0x8a4aa8, HOOK2 = 0xb07ad0;
    // a detached puffy sleeve (s: +1 her left, -1 her right): bare shoulder, the white puff, bows down the outer seam, the cuff
    const arm = s => g => {
      for (let y = 0; y >= -7; y--) g.box(-1, y, -1, 1, y, 1, y >= -1 || y === -7 ? SKIN : y === -6 ? BLACK : WHITE);
      g.box(-2, -5, -2, 2, -2, 2, (x, y, z) => (z === -2 || x === -s * 2) ? WHITE2 : WHITE);
      for (const y of [-2, -4]) { g.box(s * 3, y, -1, s * 3, y, 1, BLACK); g.set(s * 3, y, 0, BLACK2); }       // black bows down the seam
      for (const [x, y] of [[0, -3], [-1, -4], [1, -4], [0, -5]]) g.set(x, y, 2, BLACK);                         // the black diamond "eye"...
      g.set(0, -4, 2, WHITE);                                                                                    // ...white at its centre
      g.set(0, -6, 2, STUD); g.set(s * 2, -6, 0, STUD);                                                          // purple studs on the black cuff
    };
    // a tentacle: the root segment, purple on top (-Z, away from her), lavender-grey and suckered underneath (+Z)...
    const tentRoot = (s, spot) => g => {
      for (let y = 0; y >= -7; y--) g.box(-1, y, -1, 1, y, 1, (x, yy, z) => z === 1 ? (x === 0 ? ((yy & 1) ? TSUCK : TL2) : TL) : z === -1 ? (x === 0 ? TP2 : TP) : TP);
      g.set(0, -3, -1, TSPOT); g.set(s, -5, -1, spot || TSPOT);                     // dark spiral spots (one of them red)
    };
    // ...and its tip, thinner, curling out at the end
    const tentTip = s => g => {
      for (let y = 0; y >= -6; y--) {
        if (y > -4) g.box(-1, y, -1, 0, y, 0, (x, yy, z) => z === 0 ? (x === 0 ? TL2 : TL) : (x === 0 ? TP2 : TP));
        else g.set(0, y, 0, (y & 1) ? TL : TP2);
      }
      for (const [x, y] of [[s, -7], [s * 2, -7], [s * 2, -6], [s * 2, -5]]) g.set(x, y, 0, TL2);
    };
    MODELS.yidhari = H.humanoid({
      scale: 0.072, height: 28, width: 24,
      // weapon: the hammer's head, where its ice comes from
      sockets: { weapon: ['hammer', [0, -12, 0]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, BLACK);                                             // the black shorts
        g.box(3, -3, -2, 4, -1, 1, (x, y, z) => ((y + z) & 1) ? GOLD : GOLD2);          // the gold ruffle on her left hip...
        g.set(4, -4, -1, GOLD2); g.set(4, -4, 1, GOLD); g.set(3, -4, 0, GOLD2);        // ...its ragged hem
        for (const [x, y] of [[-2, -1], [0, -2], [2, -1]]) g.set(x, y, 2, TP);         // purple sucker circles on the shorts
        g.box(-2, -2, -3, 2, -1, -3, TP);                                               // her lower back, where the tentacles grow
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, BLACK); g.box(-2, 0, 2, 2, 2, 2, BLACK);             // the black corset, high on the waist
        for (let y = 0; y <= 2; y++) { g.set(1, y, 2, y === 1 ? SILVER : 0x8a8e98); g.set(-1, y, 2, BLACK2); }   // buttons, the lacing
        g.set(2, 0, 2, SILVER); g.set(3, 0, 2, 0x8a8e98); g.set(4, 0, 1, SILVER);    // the hip chain
        g.box(-3, 0, 2, -3, 1, 2, GOLD2);                                               // the round gadget at her right hip, lit in rainbow colours
        g.set(-3, 1, 3, G(0xff5a8a)); g.set(-2, 1, 3, G(0xffd04a)); g.set(-2, 0, 3, G(0x5ae8ff)); g.set(-3, 0, 3, G(0xb05aff));
        g.box(-3, 3, -2, 3, 5, 1, WHITE); g.box(-2, 3, 2, 2, 5, 2, WHITE);             // the cropped white top
        g.set(0, 4, 2, SKIN); g.set(0, 5, 2, SKIN);                                     // its cleavage cutout
        for (const x of [-2, -1, 1, 2]) g.set(x, 5, 2, WHITE2);                         // the chest pockets' flaps
        g.set(2, 4, 2, BLACK);                                                          // the black diamond patch
        g.box(-3, 6, -2, 3, 6, 1, SKIN);                                                // bare shoulders: the top sits off them
        g.box(-1, 6, -1, 1, 6, 1, COLLAR);                                              // the purple high collar...
        g.set(-1, 6, 2, GOLD); g.set(0, 6, 2, BLACK2); g.set(1, 6, 2, GOLD);            // ...its gold eye brooch
        g.set(0, 4, -3, GOLD2); g.set(0, 3, -3, BLACK2);                                // the diamond on her back
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x3a2622, mouth: 0xd07a78 });
        for (const s of [-1, 1]) { g.set(s, 3, 3, EYE2); g.set(s, 2, 3, EYEC); }        // magenta eyes, a yellow-green centre
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 3], [-2, 4], [0, 4], [1, 3], [3, 3], [4, 2]], sideTo: 3 });
        for (const s of [-1, 1]) for (let y = -2; y <= 4; y++) g.box(s * (y < 0 ? 6 : 5), y, -3, s * (y < 0 ? 6 : 5), y, y < 1 ? 1 : 2, (y & 1) ? HAIR2 : HAIR);   // the wavy bob, flicking out at the jaw
        g.box(-5, -2, -5, 5, 4, -5, (x, y) => ((x + y) & 3) === 0 ? HAIR : HAIR2); g.box(-4, -2, -4, 4, -1, -4, HAIR2);
        for (const s of [-1, 1]) { g.set(s * 6, -3, 0, HAIRHI); g.set(s * 5, -3, 1, HAIR); }
        g.box(5, -1, 1, 5, 3, 1, STREAK); g.set(6, -2, 0, STREAK); g.set(3, 6, 4, STREAK); g.set(4, 5, 4, STREAK);   // black streaks on her left, through the fringe
        for (let y = 2; y >= -3; y--) g.set(-5, y, 3, (y & 1) ? HAIRHI : HAIR2); g.set(-5, -4, 3, BLACK);           // the little braid on her right
        for (const [x, y] of [[1, 8], [1, 9], [2, 10], [3, 10], [4, 9], [4, 8], [3, 7]]) g.set(x, y, 4, x === 2 || x === 3 ? HAIRHI : HAIR);   // the big spiral curl
        g.set(2, 8, 4, HAIR2);
        g.box(-4, 8, -5, 4, 8, 1, BERET); g.box(-3, 9, -4, 3, 9, 0, BERET2); g.box(-4, 6, -6, 4, 7, -6, BERET); g.set(0, 10, -2, BERET);   // the beret, tilted back
        g.box(-1, 3, -6, 1, 3, -6, RIBBON); g.set(-2, 4, -6, RIBBON); g.set(2, 4, -6, RIBBON); g.set(0, 2, -6, RIBBON); g.set(1, 1, -6, RIBBON);   // the yellow ribbon
      },
      armL: arm(1),
      armR: arm(-1),
      legL(g) {   // bare: a black band below the knee, a short black sock, a platform Mary-Jane with a silver ring and a purple bow
        H.leg(g, { pant: SKIN, boot: BLACK2, bootH: 2, sole: SOLE });
        g.box(-1, -1, -1, 1, 0, 1, BLACK); g.box(-1, -5, -1, 1, -5, 1, BLACK); g.box(-1, -7, -1, 1, -7, 1, BLACK);
        g.set(0, -8, 3, SILVER); g.set(1, -8, 3, STUD);
      },
      legR(g) {   // a ripped black thigh-high on a garter strap
        H.leg(g, { pant: TIGHT, boot: BLACK2, bootH: 2, sole: SOLE });
        g.box(-1, -1, -1, 1, 0, 1, BLACK); g.box(-1, -2, -1, 1, -2, 1, BLACK2); g.set(0, -1, 2, BLACK2);
        for (const [x, y, z] of [[0, -3, 1], [1, -4, 1], [-1, -6, 1], [1, -3, -1]]) g.set(x, y, z, SKIN);
        g.set(0, -8, 3, SILVER); g.set(-1, -8, 3, STUD);
      },
      extra: {
        // KRAKEN, in her right fist (the grip at 0): the shaft runs up to a T-handle, down to the head (rot: it rests low and
        // forward with her arm hanging, the head near the ground; overhead, the head leads the swing)
        hammer: {
          parent: 'armR', at: [0, -7, 1], rot: [-0.55, 0, 0.25], draw(g) {
            g.box(0, -9, 0, 0, 9, 0, SHAFT); g.box(-2, 9, 0, 2, 9, 0, SHAFT); g.set(-2, 9, 0, GUN2); g.set(2, 9, 0, GUN2);   // shaft, T-handle
            for (const [y, z] of [[7, 1], [8, 2], [8, 3], [7, 4], [6, 4], [5, 3], [5, 2]]) g.set(0, y, z, HOOK); g.set(0, 6, 2, HOOK2);   // the tentacle hook
            g.set(2, 8, 0, HRED); g.set(2, 7, 0, HRED);                                                                  // the gourd charm on its red cord...
            g.ell(2, 5.5, 0, 0.7, 0.7, 0.7, GOURD); g.ell(2, 4, 0, 1.1, 0.9, 1.1, (x, y, z) => ((x * 7 + y * 3 + z * 5) & 3) === 0 ? 0xffffff : GOURD);
            g.set(2, 2, 0, GOURD2); g.box(2, 0, 0, 2, 1, 0, BLACK2);                                                    // ...its flame tail, the black tag
            g.box(-1, -9, -1, 1, -9, 1, GUN2); for (const [x, z] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) g.set(x, -9, z, SILVER);   // the collar, its spikes
            g.cyl('z', 0, -12, 2.5, -4, 4, (x, y, z) => z === 1 ? DISC : (y === -10 && (z & 1)) ? GUN2 : y === -14 ? GUND : GUN);  // the gunmetal head, a purple band
            for (let z = -2; z <= 3; z++) if (z !== 1) { g.set(2, -12, z, (z & 1) ? RIMW : 0xbfc3cc); g.set(-2, -12, z, (z & 1) ? RIMW : 0xbfc3cc); }   // KRAKEN
            g.set(2, -13, -3, HRED); g.set(-2, -13, -3, HRED);                                                          // the red spiral emblem
            for (const [z, r] of [[5, 1.8], [6, 1.1], [7, 0.4]]) g.cyl('z', 0, -12, r, z, z, z === 5 ? GUN2 : GUN);       // the pointed nose...
            g.set(0, -10, 5, HRED); g.set(0, -11, 6, HRED); g.set(0, -14, 5, HRED);                                     // ...red triangles on it
            for (let x = -2; x <= 2; x++) for (let y = -14; y <= -10; y++) {                                           // the sucker-disc end: purple in striped rims
              const dy = y + 12, d = Math.hypot(x, dy); if (d > 2.85) continue;
              g.set(x, y, -5, d < 1.2 ? DISC2 : d < 2 ? DISC : (Math.round(Math.atan2(dy, x) * 4 / PI) & 1) ? RIMW : RIMB);
            }
            for (const [x, y] of [[0, -12], [-2, -12], [2, -12], [0, -10], [0, -14]]) g.set(x, y, -6, x || y !== -12 ? DISC : DISC2);
          },
        },
        // the four tentacles (her right outer, right inner, left inner, left outer): roots off her lower back, tips below
        tn1a: { parent: 'hips', at: [-2, -1, -3], rot: [0.55, 0, -0.65], draw: tentRoot(-1) },
        tn1b: { parent: 'tn1a', at: [0, -7, 0], rot: [0.55, 0, -0.45], draw: tentTip(-1) },
        tn2a: { parent: 'hips', at: [-1, -1, -3], rot: [0.5, 0, -0.2], draw: tentRoot(-1, TRED) },
        tn2b: { parent: 'tn2a', at: [0, -7, 0], rot: [0.55, 0, -0.45], draw: tentTip(-1) },
        tn3a: { parent: 'hips', at: [1, -1, -3], rot: [0.5, 0, 0.2], draw: tentRoot(1) },
        tn3b: { parent: 'tn3a', at: [0, -7, 0], rot: [0.55, 0, 0.45], draw: tentTip(1) },
        tn4a: { parent: 'hips', at: [2, -1, -3], rot: [0.55, 0, 0.65], draw: tentRoot(1) },
        tn4b: { parent: 'tn4a', at: [0, -7, 0], rot: [0.55, 0, 0.45], draw: tentTip(1) },
      },
    });
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: laid-back, the hammer hanging low in her right hand, her head tilted (spacing out)
  ANIM.READY.kraken = { armL: [-0.1, 0, 0.16], armR: [-0.3, 0.05, -0.14], torso: [0.03, -0.08, 0], head: [0.05, 0.12, 0.07], legL: [-0.06, 0, 0.05], legR: [0.1, 0, -0.04], hipsY: -0.01 };
  // an upward swing from low behind her (Crushing Strike 1, Dash Attack)
  ACT.ydUp = (b, t, th, d) => stage(b, { armR: [0.6, 0, -0.3], armL: [-0.4, 0, 0.3], torso: [0.2, -0.45, 0], hipsY: -0.1, legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1] }, { armR: [-2.3, -0.2, 0.2], armL: [-0.9, 0, 0.5], torso: [-0.2, 0.35, 0], legL: [-0.6, 0, 0.1], legR: [0.35, 0, -0.1], lift: 0.06 }, t, th, d);
  // a low spinning sweep, the hammer out to her side (Crushing Strike 2)
  ACT.ydSweep = (b, t, th, d) => add(stage(b, { armR: [-0.4, 0.5, -1.2], torso: [0.15, -0.6, 0], hipsY: -0.15 }, { armR: [-0.4, -0.4, -1.2], armL: [-0.6, 0, 1.0], torso: [0.2, 0.3, 0], hipsY: -0.2, legL: [-0.7, 0, 0.2], legR: [0.5, 0, -0.2] }, t, th, d), { spin: clamp(t / (th + 0.08), 0, 1) * PI * 2 });
  // the overhead slam (Crushing Strike 3, Quick Assist)
  ACT.ydSlam = (b, t, th, d) => stage(b, { armR: [-3.0, 0, -0.15], armL: [-2.7, 0, 0.25], torso: [-0.35, 0, 0], head: [-0.15, 0, 0], lift: 0.15 }, { armR: [-0.85, 0, 0.12], armL: [-0.9, 0, 0.3], torso: [0.6, 0, 0], head: [0.15, 0, 0], hipsY: -0.2, legL: [-1.0, 0, 0.1], legR: [0.7, 0, -0.1] }, t, th, d);
  // Frostbite Embrace's charge: a low crouch, the hammer dragged behind her
  ACT.ydCharge = (b, t) => add(b, { armR: [0.95, 0.1, -0.3], armL: [-0.7, 0, 0.55], torso: [0.45, -0.35, 0], head: [-0.2, 0.25, 0], hipsY: -0.25, legL: [-1.0, 0, 0.15], legR: [0.55, 0, -0.2], roll: Math.sin(t * 40) * 0.008 });
  // levels 1 and 2: one spin, then the slam
  ACT.ydSpinSlam = (b, t, th, d) => { const s0 = Math.max(0.1, th - 0.22); return t < s0 ? add(b, { armR: [-0.3, 0, -1.3], armL: [-0.6, 0, 0.9], hipsY: -0.1, spin: t / s0 * PI * 2 }) : ACT.ydSlam(b, t - s0, th - s0, d - s0); };
  // level 3: the long spin, the hammer swung round at arm's length
  ACT.ydSpinLong = (b, t) => add(b, { armR: [-0.25, 0, -1.35], armL: [-0.3, 0, 1.0], torso: [0.1, 0, 0], hipsY: -0.08, spin: t * 13 });
  // a leaping smash: the hammer high overhead, then down (level-3 smash, Glacial Crush, Chain, Follow-Up, Ultimate)
  ACT.ydSmash = (b, t, th, d) => {
    if (t < th - 0.05) { const k = clamp(t / Math.max(0.05, th - 0.05), 0, 1); return add(b, { armR: [-3.1, 0, -0.15], armL: [-2.8, 0, 0.25], torso: [-0.4 + k * 0.25, 0, 0], head: [-0.2, 0, 0], legL: [-0.9 * k, 0, 0], legR: [0.4 * k, 0, 0] }); }
    return stage(b, { armR: [-3.1, 0, -0.15], armL: [-2.8, 0, 0.25] }, { armR: [-0.85, 0, 0.12], armL: [-1.0, 0, 0.3], torso: [0.65, 0, 0], legL: [-1.1, 0, 0.1], legR: [0.8, 0, -0.1], hipsY: -0.22 }, t - th + 0.07, 0.07, d - th + 0.07);
  };
  // the launcher (Cease Thoughts, Surging Cold): low, then the hammer swept up
  ACT.ydLaunch = (b, t, th, d) => stage(b, { armR: [0.5, 0, -0.3], torso: [0.35, -0.4, 0], hipsY: -0.18, legL: [-0.8, 0, 0.1], legR: [0.5, 0, -0.1] }, { armR: [-2.9, 0, -0.2], armL: [-1.2, 0, 0.6], torso: [-0.3, 0.3, 0], legL: [-0.3, 0, 0], legR: [0.2, 0, 0], lift: 0.2 }, t, th, d);
  // Frost Coil: two rising strikes, then low with the hammer's head on the ground in the mist
  ACT.ydCoil = (b, t, th, d) => t < 0.4 ? ACT.ydLaunch(b, t, 0.25, 0.4) : t < 0.72 ? ACT.ydUp(b, t - 0.4, 0.15, 0.32) : add(b, { armR: [-0.35, 0, -0.15], armL: [-0.6, 0, 0.4], torso: [0.55, 0.2, 0], head: [-0.1, 0, 0], hipsY: -0.28, legL: [-1.1, 0, 0.2], legR: [0.7, 0, -0.2] });
  // Glacial Crush: a dashing upward strike, then the leap and the smash
  ACT.ydGlacial = (b, t, th, d) => t < 0.4 ? ACT.ydUp(b, t, 0.25, 0.4) : ACT.ydSmash(b, t - 0.4, 0.55, d - 0.4);
  // Icehaul Reverb: a wide backhand sweep
  ACT.ydReverb = (b, t, th, d) => stage(b, { armR: [-1.4, 0, -1.1], torso: [0.1, -0.8, 0], hipsY: -0.12 }, { armR: [-1.5, 0, 0.6], armL: [-0.5, 0, 0.8], torso: [0.15, 0.8, 0], legL: [-0.7, 0, 0], legR: [0.5, 0, 0], hipsY: -0.16 }, t, th, d);
  // Frostbound Oath: the leaping swing, then she points the ice tentacles in
  ACT.ydChain = (b, t, th, d) => t < 0.75 ? ACT.ydSmash(b, t, 0.55, 0.75) : add(b, { armR: [-0.6, 0, -0.35], armL: [-1.7, 0, 0.6], torso: [0.15, 0.2, 0], head: [-0.1, 0, 0], hipsY: -0.12, legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] });
  // the Ultimate: she lifts the hammer (blue flames in its vents), then the leaping smash
  ACT.ydUlt = (b, t, th, d) => t < 0.8 ? add(b, { armR: [-2.95 + Math.sin(t * 3) * 0.05, 0, -0.2], armL: [-1.0, 0, 0.5], torso: [-0.2, 0, 0], head: [-0.25, 0, 0], lift: Math.min(1, t * 2) * 0.1 }) : ACT.ydSmash(b, t - 0.8, 0.7, d - 0.8);
  // Flashquake Rejection: the hammer held across her in both hands
  ACT.ydBlock = b => add(b, { armR: [-1.5, 0.6, 0.2], armL: [-1.4, -0.4, -0.35], torso: [0.15, 0, 0], hipsY: -0.1, legL: [-0.5, 0, 0.1], legR: [0.45, 0, -0.1] });

  /* ------------------------------------------------------------- effects --
     ydIce: jagged ice crystals bursting from the ground, mist and chips;
     ydCracks: frost cracks across the floor; ydStar: a white-blue starburst;
     ydShards: ice shards off the hammer; ydIceTent: giant clear ice
     tentacles that curl up out of the ground and slam; ydIceField: a field
     of ice spikes; ydPillar: a blue-white pillar of light. Streams: ydGather
     (the charge gathering at the hammer), ydSpinArc (blue arcs round the
     spin), ydFlame (blue flames from the hammer's vents). */
  const _v = new THREE.Vector3();
  const hammerHead = a => { BT.sock(a, 'weapon', _v); if (_v.y < 0.2) _v.y = 0.2; return _v; };
  const ICES = [0xffffff, ICEW, ICE, ICEB];
  function star(x, y, z, s, col) {
    FX.glow(x, y, z, 1.2 * s, 0xffffff, 0.2, { size1: 2.4 * s });
    FX.glow(x, y, z, 2 * s, col || ICE, 0.3, { size1: 3.5 * s });
    FX.beam(new THREE.Vector3(x - 1.8 * s, y, z), new THREE.Vector3(x + 1.8 * s, y, z), 0xffffff, 0.06 * s, 0.22);
    FX.beam(new THREE.Vector3(x, y - 1.2 * s, z), new THREE.Vector3(x, y + 1.2 * s, z), 0xffffff, 0.06 * s, 0.22);
  }
  function mist(x, z, r, n) {
    for (let i = 0; i < n; i++) { const an = rnd(0, PI * 2), d = rnd(0, r); FX.p({ x: x + Math.cos(an) * d, y: 0.15, z: z + Math.sin(an) * d, vx: Math.cos(an) * rnd(0.5, 1.5), vy: rnd(0.1, 0.5), vz: Math.sin(an) * rnd(0.5, 1.5), drag: 1.2, life: rnd(0.8, 1.3), size: 0.4, size1: 0.9, col: U.pick([0x5a7a90, 0x7aa0b8, 0x8ab0c8]) }); }
  }
  function iceBurst(x, z, r, big) {
    const n = big ? 14 : 9;
    for (let i = 0; i < n; i++) {
      const an = i / n * PI * 2 + rnd(-0.2, 0.2), d0 = rnd(0.2, 0.6) * r, d1 = d0 + rnd(0.5, 1.0) * r * 0.6, h = rnd(0.5, 1.3) * (big ? 1.4 : 1);
      FX.beam(new THREE.Vector3(x + Math.cos(an) * d0, 0.05, z + Math.sin(an) * d0), new THREE.Vector3(x + Math.cos(an) * d1, h, z + Math.sin(an) * d1), U.pick([ICEW, ICE, ICEB]), rnd(0.18, 0.32) * (big ? 1.3 : 1), big ? 0.7 : 0.5);
    }
    FX.burst(x, 0.5, z, big ? 40 : 24, { col: ICES, speed: big ? 8 : 6, size: 0.12, size1: 0.03, life: 0.6, g: 5, up: 2 });
    FX.ring(x, z, 0.3, r, ICE, 0.45); FX.ring(x, z, 0.2, r * 0.6, 0xffffff, 0.3);
    FX.glow(x, 0.8, z, r * 0.9, ICE, 0.3, { size1: r * 1.8 });
    mist(x, z, r, big ? 18 : 10);
  }
  function cracks(x, z, r) {
    for (let i = 0; i < 7; i++) {
      const an = rnd(0, PI * 2); let px = x, pz = z;
      for (let j = 0; j < 3; j++) { const a2 = an + rnd(-0.5, 0.5), L = r / 3 * rnd(0.7, 1.2), qx = px + Math.cos(a2) * L, qz = pz + Math.sin(a2) * L; FX.beam(new THREE.Vector3(px, 0.04, pz), new THREE.Vector3(qx, 0.04, qz), ICEB, 0.06, 0.9); px = qx; pz = qz; }
    }
  }
  function shards(a, A, up) {
    const h = hammerHead(a), x = h.x, y = h.y, z = h.z;
    for (let i = 0; i < 22; i++) { const an = A.dir + rnd(-0.7, 0.7), sp = rnd(5, 10); FX.p({ x, y, z, vx: Math.sin(an) * sp, vy: up ? rnd(4, 8) : rnd(0.5, 3), vz: Math.cos(an) * sp, drag: 1.2, g: 9, life: 0.55, size: 0.14, size1: 0.05, col: U.pick(ICES) }); }
  }
  // a giant clear ice tentacle (one voxel model, cloned): it rises out of the ground, curls over and slams down
  let iceProto = null;
  function iceTentacleObj() {
    if (!iceProto) {
      const g = new VX.Grid(), C = [0xbfeaff, 0x9ad8f8, 0xe4f8ff];
      for (let i = 0; i <= 16; i++) {
        const k = i / 16, r = 2.4 * (1 - k * 0.7), z0 = 5 * k * k;
        g.ell(0, i, z0, r, 0.6, r, (x, y, z) => z > z0 + r * 0.5 && i % 3 === 1 ? G(ICE) : C[(x + i + 30) % 3]);
      }
      for (const [y, z] of [[16, 6], [15, 7], [14, 7], [13, 6]]) g.ell(0, y, z, 0.6, 0.6, 0.6, C[2]);
      iceProto = VX.object(g, 0.085, { cast: false });
    }
    return iceProto.clone();
  }
  function iceTentacles(tx, tz, dir, n, size, life) {
    for (let i = 0; i < n; i++) {
      const an = (dir != null ? dir + PI / 2 : rnd(0, PI * 2)) + (i % 2 ? PI : 0) + (i >= 2 ? 0.7 : 0), R0 = 1.8 + size * 0.5;
      const px = tx + Math.sin(an) * R0, pz = tz + Math.cos(an) * R0, o = iceTentacleObj(), delay = i * 0.06, L = life + delay;
      o.rotation.order = 'YXZ'; o.rotation.y = Math.atan2(tx - px, tz - pz); o.position.set(px, -2 * size, pz); o.scale.setScalar(size * 0.35);
      FX.custom(o, L, (k0, dt, obj) => {
        const k = clamp((k0 * L - delay) / life, 0, 1), rise = U.easeOut(clamp(k / 0.3, 0, 1)), slam = U.easeIn(clamp((k - 0.35) / 0.2, 0, 1)), sink = clamp((k - 0.75) / 0.25, 0, 1);
        obj.position.y = -1.6 * size * (1 - rise) - 1.8 * size * sink;
        obj.rotation.x = -0.35 + slam * 1.3;
        obj.scale.setScalar(size * (0.35 + 0.65 * rise) * (1 - sink * 0.4));
        if (!obj.userData.hit && k >= 0.55) { obj.userData.hit = true; iceBurst(lerp(px, tx, 0.7), lerp(pz, tz, 0.7), 1.4 * size, false); }
      });
      FX.burst(px, 0.2, pz, 12, { col: ICES, speed: 4, size: 0.12, life: 0.5, g: 4, up: 2 });
    }
  }
  const lerp = U.lerp;
  // the Wellspring burst: a swirling magenta-violet ring of ether
  function wellFx(a) {
    FX.ring(a.x, a.z, 0.4, 4.5, MAG, 0.7, { a: 0.8 }); FX.ring(a.x, a.z, 0.3, 3.2, VIO, 0.6); FX.ring(a.x, a.z, 0.2, 2.0, 0x5ae8ff, 0.5);
    FX.glow(a.x, 1.2, a.z, 3, MAG, 0.4, { size1: 6 });
    for (let i = 0; i < 60; i++) { const an = i / 60 * PI * 4, r = 0.4 + i / 60 * 3.5; FX.p({ x: a.x + Math.cos(an) * r, y: 0.3 + rnd(0, 1.2), z: a.z + Math.sin(an) * r, vx: -Math.sin(an) * 4, vy: rnd(0.2, 1.2), vz: Math.cos(an) * 4, drag: 1.5, life: 0.8, size: 0.16, size1: 0.04, col: U.pick([MAG, VIO, 0xff9af0, 0x5ae8ff, 0xffffff]) }); }
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.2);
  }
  // the tentacles flare to take a blow: a white-lavender glow and a star at her back
  function tentFlare(a) {
    BT.sock(a, 'chest', _w); const bx = _w.x - Math.sin(a.face) * 0.5, bz = _w.z - Math.cos(a.face) * 0.5, y = _w.y - 0.3;
    FX.glow(bx, y, bz, 1.8, LAVG, 0.25, { size1: 3 }); star(bx, y, bz, 0.8, LAVG);
    FX.burst(bx, y, bz, 16, { col: [0xffffff, LAVG, 0xb9aec1], speed: 5, size: 0.1, life: 0.35, g: 1 });
  }
  // ...and lash forward (Frost's Crushing Weight's counter)
  function tentLash(a, A) {
    for (const s of [-1.1, -0.4, 0.4, 1.1]) { const an = A.dir + s * 0.5; FX.beam(new THREE.Vector3(a.x, 0.7, a.z), new THREE.Vector3(a.x + Math.sin(an) * 2.6, 0.6 + rnd(0, 0.5), a.z + Math.cos(an) * 2.6), U.pick([0xa96eb0, 0xb9aec1, LAVG]), 0.22, 0.22); }
    FX.burst(a.x + Math.sin(A.dir) * 2, 0.8, a.z + Math.cos(A.dir) * 2, 14, { col: [0xffffff, ICE, LAVG], speed: 5, size: 0.1, life: 0.35 });
  }
  // a charge level reached: a starburst at the hammer's head (level 3: brighter, a ring)
  function levelFx(a) {
    const h = hammerHead(a); star(h.x, h.y, h.z, 0.45 + a.ydLv * 0.25);
    if (a.ydLv >= 3) { FX.ring(a.x, a.z, 0.3, 2.2, ICE, 0.35); SFX.play('perfect'); } else SFX.play('ether');
  }
  const E = CHOREO.events, S = CHOREO.streams;
  const spot = (a, A, e, tgt) => e.at === 'target' && tgt ? { x: tgt.x, z: tgt.z } : { x: a.x + Math.sin(A.dir) * (e.d != null ? e.d : 1.4), z: a.z + Math.cos(A.dir) * (e.d != null ? e.d : 1.4) };
  E.ydIce = (a, A, e, tgt) => { const p = spot(a, A, e, tgt); iceBurst(p.x, p.z, e.r || 2.2, e.big); BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.32 : 0.16); if (e.big) SFX.play('boom'); };
  E.ydCracks = (a, A, e, tgt) => { const p = spot(a, A, e, tgt); cracks(p.x, p.z, e.r || 2.6); };
  E.ydMist = (a, A, e, tgt) => { const p = spot(a, A, e, tgt); mist(p.x, p.z, e.r || 3, 20); };
  E.ydShards = (a, A, e) => shards(a, A, e.up);
  E.ydStar = (a, A, e) => {
    if (e.at === 'head') { const h = hammerHead(a); star(h.x, h.y, h.z, e.s || 1); return; }
    BT.sock(a, 'chest', _w); star(_w.x + Math.sin(A.dir) * 0.8, _w.y, _w.z + Math.cos(A.dir) * 0.8, e.s || 1);
  };
  // (in Wellspring two more join in)
  E.ydIceTent = (a, A, e, tgt) => { const p = spot(a, A, { at: 'target', d: 2 }, tgt); iceTentacles(p.x, p.z, A.dir, Math.min(4, (e.n || 2) + (a.ydWell > BT.B.t ? 2 : 0)), e.size || 1, e.life || 0.75); };
  E.ydIceField = (a, A, e, tgt) => {
    const p = spot(a, A, { at: 'target' }, tgt), r = e.r || 4.5;
    for (let i = 0; i < 26; i++) { const an = rnd(0, PI * 2), d = rnd(0.5, r), bx = p.x + Math.cos(an) * d, bz = p.z + Math.sin(an) * d; FX.beam(new THREE.Vector3(bx, 0.05, bz), new THREE.Vector3(bx + Math.cos(an) * 0.6, rnd(0.6, 1.8), bz + Math.sin(an) * 0.6), U.pick([ICEW, ICE, ICEB]), rnd(0.2, 0.4), 0.9); }
    mist(p.x, p.z, r, 20); FX.ring(p.x, p.z, 0.5, r, ICE, 0.6);
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.3); SFX.play('heavy');
  };
  E.ydPillar = (a, A, e, tgt) => { const p = spot(a, A, { at: 'target' }, tgt); FX.pillar(p.x, p.z, 0.9, 10, ICEB, 0.7); FX.beam(new THREE.Vector3(p.x, 12, p.z), new THREE.Vector3(p.x, 0.2, p.z), 0xffffff, 0.5, 0.5); };
  E.ydTentFlare = a => tentFlare(a);
  S.ydGather = (a, A, s, dt) => {
    const h = hammerHead(a), hx = h.x, hy = h.y, hz = h.z, lv = a.ydLv || 0, n = Math.max(1, Math.round(dt * (40 + lv * 30)));
    for (let i = 0; i < n; i++) {
      const an = rnd(0, PI * 2), el = rnd(-0.6, 0.9), r = rnd(0.9, 1.6), cx = Math.cos(an) * Math.cos(el), cy = Math.sin(el), cz = Math.sin(an) * Math.cos(el);
      FX.p({ x: hx + cx * r, y: hy + cy * r, z: hz + cz * r, vx: -cx * r * 3, vy: -cy * r * 3, vz: -cz * r * 3, life: 0.3, size: 0.09, size1: 0.02, col: U.pick(ICES) });
    }
    if (Math.random() < dt * 14) FX.glow(hx, hy, hz, 0.5 + lv * 0.35, lv >= 3 ? 0xffffff : ICE, 0.12, { size1: 0.8 + lv * 0.4 });
    if (Math.random() < dt * 6) mist(a.x, a.z, 1.2, 2);
  };
  S.ydSpinArc = (a, A, s, dt) => {
    if (Math.random() < dt * 9) FX.slash(a.x, rnd(0.5, 1.1), a.z, rnd(2.2, 2.9), rnd(0, PI * 2), U.pick([ICE, 0x4aa8e8, ICEW]), { tilt: rnd(-0.2, 0.2), arc: 2.6, width: 0.35, life: 0.25, sweep: 2.2 });
    for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(2.4, 3.4); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.2, 1.2), z: a.z + Math.sin(an) * r, vx: -Math.cos(an) * 5 - Math.sin(an) * 3, vz: -Math.sin(an) * 5 + Math.cos(an) * 3, drag: 1, life: 0.45, size: 0.1, size1: 0.02, col: U.pick(ICES) }); }
  };
  S.ydFlame = (a, A, s, dt) => {
    const h = hammerHead(a), x = h.x, y = h.y, z = h.z, n = Math.max(1, Math.round(dt * 90));
    for (let i = 0; i < n; i++) FX.p({ x: x + rnd(-0.25, 0.25), y: y + rnd(-0.1, 0.2), z: z + rnd(-0.25, 0.25), vx: rnd(-0.4, 0.4), vy: rnd(1.5, 3), vz: rnd(-0.4, 0.4), drag: 1.5, life: 0.35, size: 0.16, size1: 0.02, col: U.pick([0x5ae8ff, 0x3a8aff, ICEB, 0xffffff]), g: -1 });
    if (Math.random() < dt * 10) FX.glow(x, y, z, 1.0, 0x5ab8ff, 0.12);
  };

  /* -------------------------------------------------------- choreography --
     `tent`: what her tentacles do during the move (a mode, or [[time, mode]]). */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const AFTER = 0xc8b8f0;
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.18, kind: 'fwd', d: 0.5 }], events: [{ t: 0.18, fx: 'crescent', y: 0.9, tilt: 1.25, r: 2.2, arc: 2.4, col: ICE, sweep: 1.4 }] });
  set(K.basic[1], { tent: 'flare', motion: [{ t0: 0.02, t1: 0.24, kind: 'fwd', d: 0.4 }], events: [{ t: 0.22, fx: 'crescent', y: 0.45, tilt: 0.05, r: 2.5, arc: 5.8, col: ICEW, sweep: 2.8 }] });
  for (const def of [K.basic[2], K.cs3]) set(def, { tent: [[0, 'trail'], [0.4, 'flare']], motion: [{ t0: 0.05, t1: 0.4, kind: 'leap', h: 0.5, d: 0.6 }], events: [{ t: 0.36, fx: 'crescent', y: 1.3, tilt: 1.55, r: 2.4, arc: 2.6, col: ICEW, sweep: 1.6 }, { t: 0.4, fx: 'ydIce', r: 2.2 }, { t: 0.4, fx: 'ydCracks', r: 2.6 }] });
  set(K.feCharge, { tent: 'coil', stream: [{ t0: 0, t1: 6, kind: 'ydGather' }] });
  set(K.feL1, { tent: [[0, 'flare'], [0.3, 'trail'], [0.45, 'rest']], events: [{ t: 0.12, fx: 'crescent', y: 0.7, tilt: 0, r: 2.4, arc: 5.8, col: ICE, sweep: 2.6 }, { t: 0.42, fx: 'ydIce', r: 2.4 }, { t: 0.42, fx: 'ydCracks', r: 2.8 }] });
  set(K.feL2, { tent: [[0, 'flare'], [0.3, 'trail'], [0.45, 'flare']], events: [{ t: 0.12, fx: 'crescent', y: 0.7, tilt: 0, r: 2.5, arc: 5.8, col: ICE, sweep: 2.6 }, { t: 0.42, fx: 'ydIce', r: 2.8, big: true }, { t: 0.42, fx: 'ydCracks', r: 3.0 }] });
  set(K.feSpin, { tent: 'flare', stream: [{ t0: 0, t1: 1.2, kind: 'ydSpinArc' }, { t0: 0, t1: 1.2, kind: 'dust' }] });
  set(K.feSmash, { tent: [[0, 'trail'], [0.42, 'flare']], motion: [{ t0: 0, t1: 0.4, kind: 'leap', h: 1.1, d: 0.5 }], events: [{ t: 0.38, fx: 'crescent', y: 1.4, tilt: 1.55, r: 2.8, arc: 2.8, col: ICEW, sweep: 1.8 }, { t: 0.4, fx: 'ydIce', r: 3.0, big: true }, { t: 0.4, fx: 'ydCracks', r: 3.4 }, { t: 0.4, fx: 'whiteFlash' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.3 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFTER }], events: [{ t: 0.24, fx: 'crescent', y: 0.9, tilt: 1.2, r: 2.2, col: ICE }] });
  set(K.counter, { tent: [[0, 'trail'], [0.2, 'lash']], motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.1, side: 'auto' }, { t0: 0.12, t1: 0.22, kind: 'toTarget', gap: 1.4 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }], events: [{ t: 0.24, fx: 'crescent', y: 0.9, tilt: 0.3, r: 2.8, arc: 3.4, col: ICEW, sweep: 2.2 }, { t: 0.24, fx: 'ydIce', r: 2.0, d: 1.6 }] });
  set(K.special, { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.4 }], events: [{ t: 0.22, fx: 'crescent', y: 1.0, tilt: 1.45, r: 2.2, col: ICE, sweep: 1.6 }, { t: 0.22, fx: 'ydShards', up: true }] });
  set(K.surge, { tent: [[0, 'flare'], [0.35, 'rest']], motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.4 }], events: [{ t: 0.02, fx: 'ydStar', s: 0.6, at: 'head' }, { t: 0.22, fx: 'crescent', y: 1.0, tilt: 1.45, r: 2.4, col: ICEW, sweep: 1.6 }, { t: 0.22, fx: 'ydShards', up: true }] });
  set(K.ex, { tent: [[0, 'flare'], [0.9, 'rest']], motion: [{ t0: 0.05, t1: 0.25, kind: 'fwd', d: 0.5 }], events: [{ t: 0.25, fx: 'crescent', y: 1.0, tilt: 1.45, r: 2.4, col: ICE, sweep: 1.6 }, { t: 0.25, fx: 'ydStar', s: 0.6 }, { t: 0.55, fx: 'crescent', y: 1.2, tilt: 1.5, r: 2.6, col: ICEW, sweep: 1.8 }, { t: 0.55, fx: 'ydStar', s: 0.8 }, { t: 0.9, fx: 'ydIce', r: 3.0, big: true }, { t: 0.9, fx: 'ydMist', r: 3.2 }] });
  set(K.glacial, { tent: [[0, 'lash'], [0.4, 'trail'], [0.95, 'flare']], motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 1.2 }, { t0: 0.4, t1: 0.95, kind: 'leap', h: 2.4, d: 0, toTarget: true }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0, fx: 'ydStar', s: 1.0 }, { t: 0.25, fx: 'crescent', y: 1.0, tilt: 1.45, r: 2.4, col: ICE, sweep: 1.6 }, { t: 0.92, fx: 'crescent', y: 1.6, tilt: 1.55, r: 3.0, arc: 2.8, col: ICEW, sweep: 1.8 }, { t: 0.95, fx: 'ydIce', r: 3.4, big: true, at: 'target' }, { t: 0.95, fx: 'ydShards' }, { t: 0.95, fx: 'whiteFlash' }] });
  set(K.chain, { tent: [[0, 'trail'], [0.55, 'flare']], motion: [{ t0: 0, t1: 0.55, kind: 'leap', h: 2.0, d: 0, toTarget: true }],
    events: [{ t: 0.52, fx: 'crescent', y: 1.2, tilt: 1.3, r: 2.8, arc: 3, col: ICE, sweep: 2 }, { t: 0.55, fx: 'ydIce', r: 2.4 }, { t: 0.6, fx: 'ydIceTent', n: 2, size: 1 }, { t: 1.0, fx: 'ydIce', r: 3.4, big: true, at: 'target' }, { t: 1.0, fx: 'whiteFlash' }] });
  set(K.ult, { tent: [[0, 'flare'], [0.8, 'trail'], [1.5, 'flare']], motion: [{ t0: 0.8, t1: 1.5, kind: 'leap', h: 3.0, d: 0, toTarget: true }], stream: [{ t0: 0.15, t1: 1.45, kind: 'ydFlame' }],
    events: [{ t: 0.3, fx: 'ydStar', s: 1.2, at: 'head' }, { t: 0.95, fx: 'ydIceField', r: 4.5 }, { t: 1.05, fx: 'ydIceTent', n: 4, size: 1.5, life: 0.9 }, { t: 1.5, fx: 'ydIce', r: 5, big: true, at: 'target' }, { t: 1.5, fx: 'ydPillar' }, { t: 1.5, fx: 'whiteFlash' }] });
  set(K.assist, { tent: 'flare', events: [{ t: 0, fx: 'ydTentFlare' }] });
  set(K.followup, { tent: [[0, 'trail'], [0.42, 'flare']], motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.3 }], stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: AFTER }], events: [{ t: 0.4, fx: 'crescent', y: 1.4, tilt: 1.55, r: 2.6, arc: 2.8, col: ICEW, sweep: 1.8 }, { t: 0.42, fx: 'ydIce', r: 2.8, big: true }, { t: 0.42, fx: 'ydShards' }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.26, kind: 'toTarget', gap: 1.3 }], stream: [{ t0: 0, t1: 0.26, kind: 'afterimage', col: AFTER }], events: [{ t: 0.28, fx: 'crescent', y: 1.3, tilt: 1.5, r: 2.3, col: ICEW, sweep: 1.6 }, { t: 0.3, fx: 'ydIce', r: 2 }] });
})();
