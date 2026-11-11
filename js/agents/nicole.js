/* ============================================================================
   agents/nicole.js -- Nicole Demara, founder and boss of the Cunning Hares
   (registered as Gentle House), the odd-job agency that takes any Hollow
   commission for the right price. A-Rank, Ether, Support, Defensive Assist.
   Released in Version 1.0.
   (How an Agent's own file works, its hooks and its helpers: agents/zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Nicole Demara, Lore, Dialogue, DMs,
   Voice-Overs, Cunning Hares, The Vault, and each of her skill pages: Basic
   Attack: Cunning Combo / Do As I Please, Dodge: Speed Demon, Dash Attack: Jack
   in the Box / Do As I Please, Dodge Counter: Diverted Bombard, Special Attack:
   Sugarcoated Bullet, EX Special Attack: Stuffed Sugarcoated Bullet, Chain
   Attack: Ether Shellacking, Ultimate: Ether Grenade, Quick Assist: Emergency
   Bombard, Defensive Assist: The Hare Strikes Back!, Assist Follow-Up: Window
   of Opportunity, Core Passive: Mechanical Case, Additional Ability: Hare of
   Many Burrows), zzz.gachabase.net (datamine, agent 1031: multipliers, Buildup,
   hit splits, EX costs), the official portrait and combat / city renders.

   Her kit (official):
     Basic Attack: Cunning Combo     3 steps, Physical: each a swing of her
                                     Mechanical Case and a burst of bullets
                                     (3, 4, then 20 bullets and 4 swings)
     Basic Attack: Do As I Please    after a reload: the same, stronger bullets
     Dodge: Speed Demon              hold Dodge while dodging: a reload
     Dash Attack: Jack in the Box    stick held: a dash in, swings and bullets;
                                     no stick: a backward vault and a shot.
                                     Reloads. (Reloaded: Dash Attack: Do As I
                                     Please, the dash with stronger bullets)
     Dodge Counter: Diverted Bombard / Quick Assist: Emergency Bombard: a hop
                                     back and an Ether shot. Reload
     Special Attack: Sugarcoated Bullet   an Ether shot (Anti-Interrupt). Reloads
     EX Special Attack: Stuffed Sugarcoated Bullet (60 Energy): a shell and an
                                     energy field on the target that pulls
                                     enemies to its centre. Hold: a small field
                                     at the muzzle hurts nearby enemies as it
                                     drinks 20 Energy a second. Invulnerable; a
                                     Quick Assist on hit; reloads
     Chain Attack: Ether Shellacking / Ultimate: Ether Grenade: the same,
                                     bigger. The Ultimate gives the rest of the
                                     squad 10 Energy, the next one in 20 more
     Defensive Assist: The Hare Strikes Back!   Assist Follow-Up: Window of
                                     Opportunity (a charge and a bombardment)
     Core Passive: Mechanical Case   her enhanced bullets and her energy fields
                                     cut the target's DEF by 40% for 3.5 s
     Additional Ability: Hare of Many Burrows   with another Ether Agent or a
                                     Cunning Hare: her debuff also makes the
                                     target take +25% Ether DMG from everyone
   Not given by any source (our choices, the report lists them):
   - "Up to 8 times" is read as 8 enhanced moves per reload. Each enhanced Basic
     step or Dash Attack uses one; a reload refills to 8. The reloaded dash does
     not reload itself.
   - Field length: 2.8 s (EX, Chain), 4.35 s (Ultimate), from the datamine's 19
     and 29 ticks, its totals in 10 and 15 ticks. Radius 2.6 / 3.2. The pull is
     strong on minions, light on elites; bosses and rival Agents hold their ground.
   - The held EX: up to 2 s, the official Charged Attack total in 10 ticks.
   - Dodge held 0.2 s into a dodge reloads.
   - The Quick Assist window: 2.5 s.
   - Bullets and ticks are grouped into fewer hits, keeping every total.
   The squad's DEF cut and Ether bonus use mech.dmgFor (no change to battle.js).
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const r2 = x => Math.round(x * 100) / 100;
  // Mechanical Case: 8 enhanced moves a reload (our reading of "up to 8 times"), DEF -40% for 3.5 s (core level 7);
  // Hare of Many Burrows: +25% Ether DMG taken. QA_WIN: our choice (as Cissia's). The held EX: a muzzle-field tick
  // every 0.2 s from 0.25 s in, 10 at most (2 s: the official Charged Attack total), 20 Energy a second (official)
  const AMMO = 8, DEF_DOWN = 0.4, DEBUFF = 3.5, HARE = 0.25, QA_WIN = 2.5;
  const CH_FROM = 0.25, CH_STEP = 0.2, CH_N = 10, CH_DRAIN = 20;
  const ETH = 0xe45cff, PINK = 0xff6ad5, VIO = 0x8a3ad8, ZONE = 0x6a1a9a, HOT = 0xffd8ff, TRACER = 0xfff0c0, CASEFX = 0xd8dce4, ORNG = 0xe78542;

  /* ----------------------------------------------------------------- kit -- */
  const PHYS = o => Object.assign({ attr: 'physical' }, o);
  const SWING = o => PHYS(Object.assign({ shape: 'arc', r: 2.4, arc: 140 }, o));                 // the case swung
  const SHOT = (enh, o) => PHYS(Object.assign({ shape: 'line', r: 0.8, len: 6.5 }, enh ? { nkShell: true } : {}, o));   // bullets
  const BOMB = o => Object.assign({ shape: 'circle', at: 'target', r: 2.2 }, o);                 // an Ether shell bursting
  // the string: swing times and their official total [DMG, Daze], bullet times and theirs (blE: the enhanced bullets' DMG)
  const STR = [
    { anim: 'nkSwing', dur: 0.56, cancel: 0.42, sw: [0.14], swT: [78.5, 29.4], bl: [0.24, 0.3, 0.36], blT: [54.6, 31.9], blE: 98.9 },
    { anim: 'nkUpper', dur: 0.62, cancel: 0.48, sw: [0.16], swT: [71.6, 44.4], bl: [0.26, 0.32, 0.38, 0.44], blT: [72.4, 42.1], blE: 131.8 },
    // 4 swings (the 4th, a slam, is the finisher) and 20 bullets, here 5 volleys
    { anim: 'nkFlurry', dur: 1.15, cancel: 0.98, sw: [0.18, 0.36, 0.54, 0.86], swT: [248.6, 157.1], bl: [0.26, 0.4, 0.5, 0.62, 0.72], blT: [360.8, 209.2], blE: 659.0 },
  ];
  function strDef(i, enh) {
    const S = STR[i], n = S.sw.length, m = S.bl.length;
    const hits = S.sw.map((t, j) => hit(t, S.swT[0] / n, S.swT[1] / n, 0, SWING(i === 2 && j === n - 1 ? { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 0.9 } : {})))
      .concat(S.bl.map(t => hit(t, (enh ? S.blE : S.blT[0]) / m, S.blT[1] / m, 0, SHOT(enh))))
      .sort((x, y) => x.t - y.t);
    // nkAmmo: an enhanced move (it spends one)
    return { name: enh ? 'Basic Attack: Do As I Please' : 'Basic Attack: Cunning Combo', anim: S.anim, dur: S.dur, cancel: S.cancel, reach: 2.4, range: 2.0, nkAmmo: enh, hits };
  }
  // Jack in the Box, forward: 2 swings (83.0 / 44.4) and 13 bullets (235.0 / 68.2), here 4 volleys; reloaded, its bullets
  // are enhanced (Buildup 121.29). nkReload: the move reloads when it hits
  function dashDef(enh) {
    const hits = [0.14, 0.2].map(t => hit(t, 83.0 / 2, 44.4 / 2, 0, SWING({ r: 2.2 })))
      .concat([0.28, 0.34, 0.4, 0.46].map(t => hit(t, 235.0 / 4, 68.2 / 4, enh ? r2(121.29 / 4) : 0, SHOT(enh))));
    return { name: enh ? 'Dash Attack: Do As I Please' : 'Dash Attack: Jack in the Box', anim: 'nkDash', dur: 0.64, cancel: 0.5, reach: 6, range: 2.2, nkAmmo: enh, nkReload: !enh, hits };
  }
  // the EX's bombard: two shells, each official 215.3 / 135.0 / 98.67 split 40% / 60% (datamine); nkField: the energy
  // field it leaves (at: when, n ticks every s, radius, the official totals [DMG, Daze, Buildup]); nkQA: a Quick Assist on hit
  const EXN = 'EX Special Attack: Stuffed Sugarcoated Bullet';
  const EX_FIELD = { at: 0.56, n: 10, every: 0.28, r: 2.6, T: [774.2, 486.4, 394.71] };
  function exDef(cost) {
    return { name: EXN, anim: 'nkCannon', dur: 1.0, cancel: 0.84, cost, reach: 8, range: 4.5, inv: [0, 0.95], nkReload: true, nkQA: true, nkField: EX_FIELD,
      hits: [[0.34, 0.4], [0.4, 0.6], [0.5, 0.4], [0.56, 0.6]].map(([t, k], i) => hit(t, 215.3 * k, 135.0 * k, r2(98.67 * k), BOMB(i === 3 ? { heavy: true, kb: 0.8, r: 2.4 } : {}))) };
  }
  const K = {
    basic: [0, 1, 2].map(i => strDef(i, false)),
    dap: [0, 1, 2].map(i => strDef(i, true)),
    dash: dashDef(false),
    dashE: dashDef(true),
    // no stick held: the vault back, then the shot (120.5 / 90.8 over its two hits)
    vault: { name: 'Dash Attack: Jack in the Box', anim: 'nkVault', dur: 0.66, cancel: 0.52, reach: 7, range: 4, nkReload: true, hits: [0.36, 0.44].map(t => hit(t, 120.5 / 2, 90.8 / 2, 0, SHOT(false, { r: 1.0, len: 7 }))) },
    counter: { name: 'Dodge Counter: Diverted Bombard', anim: 'nkVault', dur: 0.72, cancel: 0.56, reach: 7, inv: [0, 0.66], nkReload: true,
      hits: [hit(0.34, 182.5, 123.5, 31.64, { heavy: true, shape: 'line', r: 1.1, len: 7 }), hit(0.42, 182.5, 123.5, 31.64, BOMB({ heavy: true, r: 2.0, kb: 0.9 }))] },
    special: { name: 'Special Attack: Sugarcoated Bullet', anim: 'nkHip', dur: 0.56, cancel: 0.42, reach: 7, range: 4, cd: 1.2, dr: 0.4, nkReload: true,
      hits: [hit(0.18, 52.7, 38.2, 26.24, { shape: 'line', r: 0.9, len: 7 }), hit(0.26, 52.7, 38.2, 26.24, BOMB({ r: 1.6 }))] },
    ex: exDef(60),
    exRel: exDef(0),            // the shot at the end of a held EX (paid for as it charged)
    // held Special with the Energy: the charge (mech.tick: the muzzle field, the drain, the shot when you let go)
    exCharge: { name: EXN + ' (charging)', anim: 'nkCharge', dur: CH_FROM + CH_STEP * CH_N + 0.5, cost: 60, reach: 8, range: 4.5, inv: [0, CH_FROM + CH_STEP * CH_N + 0.5], nkCharge: true, then: 'exRel', hits: [] },
    chain: { name: 'Chain Attack: Ether Shellacking', anim: 'nkCannon', dur: 1.35, inv: [0, 1.35], reach: 9, nkReload: true, nkQA: true,
      nkField: { at: 0.62, n: 10, every: 0.28, r: 2.6, T: [566.8, 101.6, 194.69] },
      hits: [hit(0.5, 210.4, 38.2, 64.89, BOMB()), hit(0.62, 210.4, 38.2, 64.89, BOMB({ heavy: true, r: 2.6, kb: 1.0 }))] },
    ult: { name: 'Ultimate: Ether Grenade', anim: 'nkLob', dur: 2.0, inv: [0, 2.0], reach: 10, nkReload: true, nkQA: true,
      nkField: { at: 1.2, n: 15, every: 0.29, r: 3.2, T: [1746.6, 73.9, 53.99] },
      hits: [hit(1.2, 1293.6, 54.7, 35.99, BOMB({ heavy: true, r: 3.4, kb: 1.4 }))] },
    // The Hare Strikes Back!: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow; the
    // official Heavy is 467.9)
    assist: { name: 'Defensive Assist: The Hare Strikes Back!', type: 'defensive', anim: 'nkParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(371.0) },
    // Window of Opportunity: 754.4 / 496.4 / 353.67 over three hits, 30% / 35% / 35% (datamine)
    followup: { name: 'Assist Follow-Up: Window of Opportunity', anim: 'nkFollow', dur: 1.05, inv: [0, 1.0], reach: 7,
      hits: [[0.3, 0.3], [0.5, 0.35], [0.72, 0.35]].map(([t, k], i) => hit(t, 754.4 * k, 496.4 * k, r2(353.67 * k), i ? BOMB(i === 2 ? { heavy: true, r: 2.6, kb: 1.0 } : {}) : { shape: 'circle', at: 'front', r: 2.4 })) },
    quick: { name: 'Quick Assist: Emergency Bombard', anim: 'nkVault', dur: 0.66, inv: [0, 0.62], reach: 7, nkReload: true,
      hits: [hit(0.34, 63.6, 48.2, 31.64, { shape: 'line', r: 1.0, len: 7 }), hit(0.42, 63.6, 48.2, 31.64, BOMB({ r: 1.8, kb: 0.6 }))] },
  };
  K.dap0 = K.dap[0]; K.dap2 = K.dap[2];     // (for the squad screen's kit list)
  // the held EX's muzzle field, one tick: a tenth of the official Charged Attack (430.6 / 270.0 / 197.35)
  const CHG = hit(0, 430.6 / CH_N, 270.0 / CH_N, r2(197.35 / CH_N), { shape: 'circle', r: 1.8, nkField: true, kb: 0.02 });

  /* ----------------------------------------------------- her mechanics -- */
  const isEth = attr => attr === 'ether' || attr === 'auric' || !!(D.ATTR[attr] && D.ATTR[attr].as === 'ether');   // (this game counts Auric Ink as Ether)
  const foeOf = (a, B) => B.focus && B.focus.alive ? B.focus : a.act && a.act.tgt && a.act.tgt.alive ? a.act.tgt : a.lastTgt && a.lastTgt.alive ? a.lastTgt : null;
  const _m = new THREE.Vector3();
  const muzzle = a => { BT.sock(a, 'weapon', _m); if (_m.y < 0.3) _m.y = 0.8; return _m.clone(); };

  // a reload: 8 enhanced Basic or Dash Attacks (Do As I Please)
  function reload(a) {
    a.ammo = AMMO;
    if (!a.obj || !a.obj.visible) return;
    const m = muzzle(a);
    FX.glow(m.x, m.y, m.z, 0.9, ORNG, 0.18, { size1: 1.5 }); FX.burst(m.x, m.y, m.z, 8, { col: [0xffd27a, ORNG, 0xffffff], speed: 3, size: 0.07, life: 0.3, g: 3 });
  }
  // Mechanical Case on v: DEF -40% for 3.5 s (Hare of Many Burrows: +25% Ether DMG taken, as long)
  function debuff(a, v) {
    const B = BT.B, fresh = !(v.nkDef > B.t);
    v.nkDef = B.t + DEBUFF; if (a.nkHare) v.nkEth = B.t + DEBUFF;
    if (fresh) { FX.ring(v.x, v.z, 0.3, (v.rad || 0.6) + 0.9, VIO, 0.35, { y: 0.1 }); FX.glow(v.x, (v.height || 1.6) * 0.6, v.z, 1.2, ETH, 0.2); }
  }
  // her EX, Chain Attack or Ultimate hit: switch within the window (after her move) and the Agent coming in opens with theirs
  function openQA(a) {
    const B = BT.B; if (!B || B.allOut || a.rival || !BT.fielded().includes(a) || !BT.nextAlive(1)) return;
    const A = a.act, rest = A ? Math.max(0, (A.dur || A.def.dur) - A.t) : 0;
    a.nkQA = { until: B.t + rest + QA_WIN, auto: Math.random() < 0.5 };      // auto: whether AUTO takes this one
    BT.callout('QUICK ASSIST READY', 'assist', 'switch Agents');
  }
  // an energy field on the target (or ahead of her): its ticks carry the official totals; it pulls enemies in
  function spawnField(a, A) {
    const B = BT.B, F = A.def.nkField, tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 5, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 5, life = F.n * F.every + 0.1;
    const h = hit(0, F.T[0] / F.n, F.T[1] / F.n, r2(F.T[2] / F.n), { shape: 'circle', r: F.r, nkField: true, kb: 0.02 });
    const FA = { kind: 'nkField', def: { name: A.def.name + ' (Energy Field)', hits: [] }, data: {}, dir: A.dir, t: 0, tgt: null };
    a.nkFields.push({ x, z, r: F.r, left: F.n, every: F.every, next: B.t + 0.05, until: B.t + life, h, A: FA });
    FX.zone(x, z, F.r, ZONE, life); FX.pillar(x, z, F.r * 0.3, 3.2, ETH, 0.45); FX.ring(x, z, 0.4, F.r * 1.1, PINK, 0.45);
  }
  // the fields: the pull to the centre, their ticks, the light spiralling in
  function tickFields(a, dt) {
    const B = BT.B;
    for (let i = a.nkFields.length - 1; i >= 0; i--) {
      const f = a.nkFields[i];
      for (const v of BT.enemiesIn('circle', f.x, f.z, f.r + 1.5, 0)) {
        if (v.rival || v.rank === 'boss') continue;                       // (bosses and rival Agents hold their ground: our choice)
        const dx = f.x - v.x, dz = f.z - v.z, d = Math.hypot(dx, dz); if (d < 0.5) continue;
        const k = Math.min(d - 0.4, (v.rank === 'elite' ? 1.0 : 3.0) * dt); v.x += dx / d * k; v.z += dz / d * k;
      }
      while (f.left > 0 && B.t >= f.next) {
        f.left--; f.next += f.every;
        for (const v of BT.enemiesIn('circle', f.x, f.z, f.r, 0)) BT.applyHit(a, v, f.h, f.A, 'ether');
        FX.ring(f.x, f.z, f.r, f.r * 0.25, PINK, 0.3, { a: 0.6, y: 0.08 });
      }
      for (let j = 0; j < 2; j++) {
        const an = B.t * 5 + j * PI + rnd(-0.3, 0.3), r = f.r * rnd(0.7, 1);
        FX.p({ x: f.x + Math.cos(an) * r, y: rnd(0.15, 1.4), z: f.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 2 - Math.sin(an) * 3, vz: -Math.sin(an) * r * 2 + Math.cos(an) * 3, drag: 1.5, life: 0.4, size: 0.12, size1: 0.02, col: U.pick([ETH, PINK, VIO, HOT]) });
      }
      if (f.left <= 0 || B.t > f.until + 0.5) a.nkFields.splice(i, 1);
    }
  }
  // the held EX: the muzzle field drinks 20 Energy a second and ticks every 0.2 s (up to 10); let go (AUTO: its plan), full,
  // or out of Energy, she fires
  function charge(a, A, dt) {
    const S = A.data;
    if (A.t < CH_FROM) return;
    const held = BT.isPlayer(a) ? BT.btnHeld('special') : (S.nkC || 0) < (S.nkPlan || 0);
    if (held && a.energy > 0.5 && (S.nkN || 0) < CH_N) {
      const dd = Math.min(dt, a.energy / CH_DRAIN);
      BT.spendEnergy(a, CH_DRAIN * dd); S.nkC = (S.nkC || 0) + dd; S.nkAcc = (S.nkAcc || 0) + dd;
      while (S.nkAcc >= CH_STEP && (S.nkN || 0) < CH_N) { S.nkAcc -= CH_STEP; S.nkN = (S.nkN || 0) + 1; muzzleTick(a, A); }
      return;
    }
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    BT.endAct(a); a.gap = 0;
    a.queue.unshift({ def: K.exRel, kind: 'ex', tgt, delay: 0 });
  }
  function muzzleTick(a, A) {
    const cx = a.x + Math.sin(A.dir) * 1.8, cz = a.z + Math.cos(A.dir) * 1.8;
    const FA = { kind: 'nkField', def: { name: EXN + ' (charged)', hits: [] }, data: {}, dir: A.dir, t: 0, tgt: null };
    for (const v of BT.enemiesIn('circle', cx, cz, CHG.r, 0)) BT.applyHit(a, v, CHG, FA, 'ether');
    FX.ring(cx, cz, 0.3, CHG.r, PINK, 0.25, { y: 0.9, a: 0.5 }); SFX.play('ether');
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.nicole = {
    id: 'nicole', name: 'Nicole Demara', short: 'Nicole', faction: 'Cunning Hares', spec: 'Support', attr: 'ether', rank: 'A',
    color: '#eab3aa', color2: '#b4c138', assist: 'defensive', stance: 'nicole',
    blurb: 'The boss of the Cunning Hares: streetwise, money-mad and always in debt, always scheming, and still the boss who never lets her team go hungry. Her Mechanical Case fires bullets and Ether shells whose energy fields pull enemies together and cut their DEF, and with an Ether Agent or another Cunning Hare beside her, the whole squad\'s Ether DMG hits harder.',
    // Lv60 (gachabase): HP 8,145; ATK 649 (+75 core); DEF 622; Impact 88; Anomaly Mastery 90, Proficiency 93; CRIT 5% / 50%;
    // Energy Regen 1.56. On this game's scale (a Support: ATK at the low end, an A-Rank)
    stats: { hp: 9120, atk: 2700, def: 666, impact: 88, ap: 93, am: 90, cr: 0.1, cd: 0.8, er: 1.56, speed: 4.7 },
    ai: { range: 2.6, dodge: 0.76, reflex: 0.6, aggr: 0.9 },
    energyMax: 120, resource: 'ammo',
    core: [
      ['Core Passive: Mechanical Case', 'Her Special Attack, EX, Chain Attack and Ultimate reload her Mechanical Case when they hit, as do her Dash Attack, Dodge Counter and Quick Assist; so does holding Dodge as she dodges. Reloaded, her next 8 Basic or Dash Attacks fire enhanced bullets (Do As I Please). When her enhanced bullets or an energy field hit an enemy, its DEF is reduced by 40% for 3.5 s, for the whole squad.'],
      ['Energy fields', 'Her EX (60 Energy), Chain Attack and Ultimate fire a shell that leaves an Ether energy field on the target, pulling enemies to its centre and hitting them while it lasts. Hold Special to charge the EX: a small field at the muzzle hits nearby enemies as it drains 20 Energy a second (up to 2 s). Their hits set up a Quick Assist. Her Ultimate gives the rest of the squad 10 Energy, and the next Agent to switch in 20 more.'],
      ['Additional Ability: Hare of Many Burrows', 'With another Ether Agent or another Cunning Hare in the squad: an enemy debuffed by Mechanical Case also takes 25% more Ether DMG from everyone for 3.5 s.'],
    ],
    kit: K,
    kitShow: [['Reloaded', 'dap0'], ['Reloaded', 'dap2'], ['Dash, reloaded', 'dashE'], ['Dash, no stick', 'vault'], ['Hold EX', 'exCharge']],
    rivalMoves: [{ k: 'dap2', kind: 'basic', p: 0.2, cd: 5 }],
    howto: 'Nicole: her Special, EX, Chain Attack, Ultimate, Dash Attack, Dodge Counter and Quick Assist reload her Mechanical Case (so does holding Dodge as she dodges): her next 8 Basic or Dash Attacks fire enhanced bullets. Enhanced bullets and her energy fields (EX, Chain, Ultimate: they pull enemies in) cut the target\'s DEF by 40% for 3.5 s, and with an Ether Agent or a Cunning Hare in the squad, everyone deals +25% Ether DMG to it. Hold Special to charge the EX (20 Energy a second); a Dash Attack with no direction held vaults back and fires. Her EX, Chain and Ultimate set up a Quick Assist: switch Agents then. Her assist is a Defensive Assist: she parries.',
    mech: {
      // ammo: enhanced moves left; nkFields: her energy fields; nkQA: the Quick Assist she set up; nkNext: Ether Grenade's
      // 20 Energy for the next one in; nkHare: Hare of Many Burrows. (On enemies: nkDef / nkEth, when her debuffs end)
      init(a) { Object.assign(a, { ammo: 0, nkFields: [], nkQA: null, nkNext: false, nkHare: false }); },
      squad(a, B) { a.nkHare = B.squad.some(s => s !== a && (isEth(s.def.attr) || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B;
        if (def.nkAmmo) a.ammo = Math.max(0, a.ammo - 1);
        if (def === K.exCharge) A.data.nkPlan = BT.isPlayer(a) ? 0 : rnd(0.6, CH_STEP * CH_N);     // AUTO: how long it holds
        if (A.kind === 'ult' && !a.rival) {
          for (const s of B.squad) if (s !== a && s.alive) BT.gainEnergy(s, 10, true);
          a.nkNext = true;
          BT.log('Nicole: Ether Grenade! The squad recovers 10 Energy; the next Agent to switch in gets 20 more.', 'skill');
        }
      },
      // her enhanced bullets and fields debuff; a move that reloads does so when it hits; EX, Chain, Ultimate: a Quick Assist
      hit(a, v, h, A) {
        if (a.rival || !A || !A.data) return;
        if (h.nkShell || h.nkField) debuff(a, v);
        if (A.def.nkReload && !A.data.nkR) { A.data.nkR = true; reload(a); }
        if (A.def.nkQA && !A.data.nkQ) { A.data.nkQ = true; openQA(a); }
      },
      // her own hits on a debuffed enemy: its DEF cut, and (Hare of Many Burrows) +25% Ether DMG
      mods(a, v, h) {
        const B = BT.B; if (!B || !v) return {};
        const attr = (h && h.attr) || a.def.attr;
        return { defIgnore: v.nkDef > B.t ? DEF_DOWN : 0, dmg: v.nkEth > B.t && isEth(attr) ? HARE : 0 };
      },
      // the squad's: there is no DEF hook for a teammate, so the DEF cut comes as the DMG bonus it equals (exact when nothing
      // else adds to the DMG bonus; none for Sheer DMG, which ignores DEF): defMult(DEF x 0.6) / defMult(DEF) - 1
      // her DEF cut reaches Anomaly damage too (battle.js: anomalyDamage asks every squad member's anomDefK)
      anomDefK(s, v, src) { return BT.B && v && !src.rival && v.nkDef > BT.B.t ? 1 - DEF_DOWN : 1; },
      dmgFor(s, b, v, attr) {
        const B = BT.B; if (!B || !v || b === s || b.rival) return 0;
        let k = 0;
        if (v.nkDef > B.t && !b.def.sheer) { const D0 = v.def_ || 0; k += (794 + D0) / (794 + D0 * (1 - DEF_DOWN)) - 1; }
        if (v.nkEth > B.t && isEth(attr)) k += HARE;
        return k;
      },
      tick(a, dt, on) {
        const B = BT.B; if (!B || a.rival) return;
        if (B.result) { a.nkFields.length = 0; return; }
        const A = a.act;
        // the EX, Chain Attack, Ultimate: the field, as the last shell lands
        if (A && A.def.nkField && A.data && !A.data.nkF && A.t >= A.def.nkField.at) { A.data.nkF = true; spawnField(a, A); }
        if (A && A.def === K.exCharge && A.data) charge(a, A, dt);
        if (a.nkFields.length) tickFields(a, dt);
        // Speed Demon: Dodge held 0.2 s into a dodge reloads (AUTO: half its dodges, when low on ammo)
        const Dg = a.dodge;
        if (on && Dg && !Dg.nkR && B.t - Dg.t0 >= 0.2 && B.t <= Dg.until + 0.15) {
          if (BT.isPlayer(a)) { if (BT.btnHeld('dodge')) { Dg.nkR = true; reload(a); } }
          else { Dg.nkR = true; if (a.ammo < 4 && Math.random() < 0.5) reload(a); }
        }
        // the Quick Assist she set up runs out; AUTO takes it half the time, once her move is done
        if (a.nkQA && a.nkQA.until <= B.t) a.nkQA = null;
        if (on && B.auto && !B.allOut && a.nkQA && a.nkQA.auto && B.swapCd <= 0 && !B.chain && !B.cutin && !BT.assistThreat()
          && (!A || (A.def !== K.exCharge && A.hi >= (A.def.hits || []).length && !['ult', 'chain'].includes(A.kind)))) BT.cmdSwap(1);
      },
      // switched out: Ether Grenade's 20 Energy for whoever comes in; with a Quick Assist set up, they open with theirs
      swap(a, isIn, why) {
        const B = BT.B;
        if (isIn) { a.nkQA = null; return; }
        const inc = BT.active();
        if (a.nkNext && inc && inc !== a && !inc.rival) { a.nkNext = false; BT.gainEnergy(inc, 20, true); BT.log(`Ether Grenade: ${inc.def.short} switches in with 20 more Energy.`, 'skill'); }
        const Q = a.nkQA; a.nkQA = null;
        if (!Q || Q.until <= B.t || why !== 'swap') return;
        if (!inc || inc === a || !inc.alive || !inc.def.kit.quick) return;
        inc.queue.unshift({ def: inc.def.kit.quick, kind: 'quick', tgt: BT.pickTarget(inc), delay: 0.05 });
        BT.callout('QUICK ASSIST', 'assist', inc.def.kit.quick.name.replace('Quick Assist: ', ''));
        BT.log(`${inc.def.short}: ${inc.def.kit.quick.name} (set up by Nicole)`, 'assist');
      },
      // Special with the Energy: the EX (held: charged). Basic just after a dodge: the dash (no stick held: the vault back;
      // reloaded: the enhanced dash). Reloaded, Basic is Do As I Please. Otherwise the usual
      resolve(a, btn, hold, c) {
        if (btn === 'special') return a.energy >= K.ex.cost ? { def: hold ? K.exCharge : K.ex, kind: hold ? 'charged' : 'ex' } : null;
        if (btn !== 'basic') return null;
        if (c.dash) {
          if (BT.isPlayer(a) && !(BT.moveInput && BT.moveInput())) return { def: K.vault, kind: 'dash' };
          return { def: a.ammo > 0 ? K.dashE : K.dash, kind: 'dash' };
        }
        if (a.ammo > 0) { const step = c.step != null ? c.step : c.t - a.lastBasic > 0.9 ? 0 : a.combo; return { def: K.dap[step % 3], kind: 'basic', step }; }
        return null;
      },
      // AUTO: the EX with a full-ish bar or on a Stun (held when there is Energy to spare); out of ammo, the Special reloads
      ai(a, tgt, B) {
        if (a.energy >= K.ex.cost && (a.energy >= 100 || tgt.stun > 0 || Math.random() < 0.1)) return { btn: 'special', hold: a.energy >= 85 && Math.random() < 0.5 };
        if (a.ammo <= 0 && a.energy < K.ex.cost && (a.cds.special || 0) <= B.t && Math.random() < 0.5) return { btn: 'special' };
        return null;
      },
      hud(a, B) {
        const r = [`AMMO ${'●'.repeat(a.ammo)}${'○'.repeat(Math.max(0, AMMO - a.ammo))}`];
        const A = a.act; if (A && A.def === K.exCharge && A.data && A.data.nkC) r.push(`CHARGING ${A.data.nkC.toFixed(1)}s`);
        const f = a.nkFields[a.nkFields.length - 1]; if (f) r.push(`ENERGY FIELD ${Math.max(0, f.until - B.t).toFixed(1)}s`);
        const v = foeOf(a, B); if (v && v.nkDef > B.t) r.push(`MECHANICAL CASE: DEF -40%${v.nkEth > B.t ? ' · ETHER DMG +25%' : ''} ${Math.ceil(v.nkDef - B.t)}s`);
        if (a.nkQA && a.nkQA.until > B.t) r.push('QUICK ASSIST: SWITCH');
        if (a.nkNext) r.push('NEXT IN: +20 ENERGY');
        return r;
      },
    },
    town: {
      // Sixth Street: every one of her trust events is here (in front of Random Play with General Chop's noodle coupons;
      // outside Coff Cafe, once with Anby; the 141 and its discount bentos; hiding behind the truck by the 141; Howl's
      // Newsstand for rumours and scratchcards; after Waterfall Soup), her DM invitations (Box Galaxy, Coff Cafe, Random Play)
      // and her Quality Time Snake Duel at Godfinger. (Lumina Square has only the floral design at Dew Gardening.)
      home: 'sixth',
      // mornings: coupons at Random Play and the noodle queue; afternoons: scratchcards at the newsstand, the 141's truck and
      // Coff Cafe; evenings: Godfinger and the Box Galaxy machines on a lucky day; late: noodles, and out of sight of the debt
      // collectors
      routine: ['rp:door 25, soup:queue 25, 141:stall 20, huddle 30', 'news:read 25, 141:truck 20, cafe:t 20, 141:freezer 10, huddle 25', 'gf:corner 25, box:claw 25, soup:stool 20, huddle 30', 'soup:stool 35, alley:phone 25, rp:night 25, back:dumpster 15'],
      chatter: ['Time is money, Proxy~', 'Is that a debt collector? ...Act natural.'],
      lines: [
        'Cunning Hares, at your service! Any Hollow, any job, as long as the pay is right. ...What? Our rates are perfectly fair. Mostly.',
        'General Chop\'s Black Bowl Mushroom Noodles are the best on Sixth Street. I order mine without the mushrooms. Don\'t ask.',
        'My nail artist says this colour attracts money. So far it\'s attracted two debt collectors. Close enough!',
      ],
      chapters: [
        { title: 'Coupon bonanza', ask: ['Proxy! Perfect timing. To celebrate our wonderful partnership, you\'re treating me to noodles. Don\'t worry, I even got you a discount coupon!', 'Order at Waterfall Soup: Black Bowl Mushroom Noodles. Without the mushrooms. Off you go~'],
          steps: [{ t: 'order' }, { t: 'talk', to: 'nicole' }],
          scene: [['A', 'My noodles! Black Bowl Mushroom, no mushrooms. Perfection.'], ['P', 'General Chop says you queued for coupons three times. Once in sunglasses. Once with your hair down.'], ['A', 'That\'s called a master of disguise. Coupons don\'t grow on trees!'], ['P', 'He also says you bring the orphanage kids here and order big.'], ['A', 'Wh-who said he could tell you that?! ...Fine. Next time, I\'m treating you. When? Eventually!']] },
        { title: 'Broke on purpose', ask: ['Anby and I were just leaving Coff Cafe and, well... this month\'s budget is a little tight.', 'Could you buy Anby a coffee? She was looking at the instant stuff across the street. It was heartbreaking.'],
          steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'anby', reply: '...Thank you, Proxy. I have to confess something. Nicole bet me you\'d buy it if we pretended to be broke. I bet you wouldn\'t. I lost.' }, { t: 'talk', to: 'nicole' }],
          scene: [['A', 'Ha! Told you, Anby! The Proxy never lets us down~'], ['P', 'You set me up.'], ['A', 'It was a scientific test of our friendship. And you passed! With honours!'], ['A', '...Okay, okay. This round\'s on me. Look at that: the Cunning Hares paying for coffee. Write it down, it won\'t happen often.']] },
        { title: 'Sky-high rates', ask: ['Did you hear that? Two office workers by the 141 just called me a cheapskate! "Huge fees, lousy wages"! Slander!', 'Ask my employees, they\'ll set the record straight. Then let\'s take a commission and show Sixth Street how the Cunning Hares work.'],
          steps: [{ t: 'talk', to: 'billy', reply: 'The boss, a cheapskate? ...Okay, payday slips a couple of days sometimes. But she\'s never let us go hungry. A Starlight Knight doesn\'t badmouth his boss behind her back!' },
            { t: 'talk', to: 'nekomata', reply: 'Nicole pays late, nags about every Denny, and still splits her last bento with me. Don\'t tell her I said the last part.' },
            { t: 'clear', f: { enc: 'elite', lead: 'nicole', with: 'anby' } }, { t: 'talk', to: 'nicole' }],
          scene: [['A', 'Commission complete, and the client is thrilled! Worth every Denny of our fee.'], ['P', 'Billy and Nekomata say you never let them go hungry.'], ['A', 'Of course not! We, the Cunning Hares, are an ethical corporation!'], ['P', 'Wise says this is a good moment to bring up the list of what you owe us.'], ['A', 'Ahaha... look at the time! Leave us a good review on Inter-Knot, okay? Five stars!']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait and the combat and city renders: very long,
     wavy salmon-pink hair to the hips, gathered into two high bunches tied
     with black ribbon bows that stand up like a rabbit's ears, side-swept
     bangs with a black hair clip tipped yellow on her left; green eyes, a
     beauty mark under her left eye, yellow heart earrings, yellow nails. A
     black choker with a fishnet heart and a silver heart pendant, a white
     standing collar behind her neck. A black cropped jacket slipped off her
     shoulders, its long sleeves laced on the outside, white cuffs, a little
     orange-red patch on the left breast; a white crop top with a bold black
     print; bare midriff. Black denim shorts with a white lace frill, a
     studded belt with a gold buckle, a strap crossing to an O-ring at her
     left hip, a grey strap hanging behind like a tail with a D-ring; a green
     bunny plush with a red X eye on her right hip. Her left leg in a ripped
     black thigh-high with a garter strap and ring, her right bare with a
     black calf sock; chunky black platform combat boots with gold buckles
     and gold-studded soles. In battle only (the city render has none): her
     Mechanical Case, a big dark-grey hard case with a gold circular emblem,
     black straps with silver buckles and orange lights, carried in her
     right hand and fired from the hip. 165 cm. */
  function drawCase(g) {
    const C1 = 0x464443, C2 = 0x3e3c3c, C3 = 0x555554, GOLDC = 0xc0af8f, BAND = 0x19191a, BUCK = 0xb8bcc0, MUZ = 0x1a1216;
    // the body: long front to back (z), the handle on top under her hand, a faint logo print on its faces
    g.box(-1, -6, -4, 1, -1, 8, (x, y, z) => (y === -1 || y === -6 || z === -4 || z === 8) ? C2 : ((y * 3 + z * 2) % 7 === 0 ? C3 : C1));
    g.box(0, 0, -2, 0, 0, 1, BAND); g.set(0, -1, -2, C3); g.set(0, -1, 1, C3);                       // the handle
    // the gold circular emblem on both faces
    for (const x of [-1, 1]) for (let y = -6; y <= -1; y++) for (let z = -4; z <= 8; z++) {
      const d = Math.hypot(y + 3.5, z - 4.5); if (d >= 1.6 && d <= 2.5) g.set(x, y, z, GOLDC);
    }
    for (const x of [-1, 1]) { g.set(x, -3, 4, GOLDC); g.set(x, -4, 5, GOLDC); }                  // its letters, roughly
    // the black straps round it, silver buckles
    for (const z of [-2, 7]) { g.box(-1, -6, z, 1, -1, z, BAND); g.set(-1, -2, z, BUCK); g.set(1, -2, z, BUCK); }
    g.box(-1, -4, 1, -1, -3, 2, C3); g.set(-1, -3, 1, BUCK);                                       // the latch
    // the muzzle end (the front): a dark bore ringed in grey, orange lights at its foot
    g.box(-1, -4, 8, 1, -2, 8, C3); g.set(0, -3, 8, MUZ);
    g.set(-1, -6, 8, G(ORNG)); g.set(0, -6, 8, G(ORNG)); g.set(-1, -5, 7, G(ORNG)); g.set(1, -5, 7, G(ORNG));
  }
  {
    const HAIR = 0xeab3aa, HAIR2 = 0xd89f99, HAIR3 = 0xac766e, HAIRHI = 0xf6c1bd, SKIN = 0xfbe6d9, SKIN2 = 0xe8c8b8;
    const EYE = 0x98b054, LASH = 0x2a1a1c, MOUTH = 0xc8606a, MOUTH2 = 0x8a3040, MOLE = 0x8a5a50, YEL = 0xf0c20e;
    const RIB = 0x19191a, RIB2 = 0x2e2d2f, CHOKER = 0x2e2d2f, SILVER = 0x909695, COLLAR = 0xfbf0e7;
    const JACKET = 0x2e2d2f, JACKET2 = 0x19191a, SLEEVE = 0x454545, CUFF = 0xe6eaeb, LACE = 0x8a8f96, PATCH = 0xc63816;
    const TOP = 0xfbf0e7, TOP2 = 0xd8dadc, INK = 0x070505;
    const SHORTS = 0x242526, FRILL = 0xf2eee8, BELT = 0x19191a, STUD = 0x909695, GOLD = 0xc0af8f, GOLD2 = 0xa5925f, RING = 0xa8836d;
    const PLUSH = 0xb4c138, PLUSH2 = 0x788027, PLUSHHI = 0xc6d32f, XRED = 0xc24d2c, WHITE = 0xffffff;
    const STOCK = 0x2e2d2f, SOCK = 0x282626, BOOT = 0x3e3c3c, BOOT2 = 0x2b282b, SOLE = 0x19191a, STRAP = 0x909695, DRING = 0x8a7f6e;
    // an arm (s = 1: her left, +X): the bare shoulder, the jacket slipped down and bunched on the upper arm, the long black
    // sleeve laced on the outside, a white cuff, her hand and yellow nails
    const arm = s => g => {
      g.box(-1, 0, -1, 1, 0, 1, SKIN);
      g.box(-1, -2, -1, 1, -1, 1, JACKET); g.box(2 * s, -2, -1, 2 * s, -1, 1, JACKET2);
      g.box(-1, -5, -1, 1, -3, 1, SLEEVE); g.set(s, -3, 0, LACE); g.set(s, -5, 0, LACE); g.set(s, -4, -1, LACE);
      g.box(-1, -6, -1, 1, -6, 1, CUFF); g.set(0, -6, 2, CUFF); g.set(0, -6, -2, CUFF);
      g.box(-1, -7, -1, 1, -7, 1, SKIN); g.set(0, -7, 2, YEL);
    };
    // the shorts' leg openings, the white frill at their hem
    const shortsTop = g => { g.box(-1, 0, -1, 1, 0, 1, SHORTS); g.box(-1, -1, -1, 1, -1, 1, (x, y, z) => z === 1 || Math.abs(x) === 1 ? FRILL : SHORTS); };
    // the chunky platform boots: straps with gold buckles, gold studs round the sole
    const boots = (g, s) => {
      g.box(-1, -6, -1, 1, -6, 1, BOOT2); g.set(s, -6, 1, GOLD);
      g.box(-1, -8, -1, 1, -8, 1, BOOT2); g.set(s, -8, 2, GOLD);
      g.box(-1, -9, -1, 1, -9, 2, (x, y, z) => (x + z) & 1 ? GOLD2 : SOLE);
    };
    MODELS.nicole = H.humanoid({
      scale: 0.071, height: 28, width: 18,
      sockets: { weapon: ['case', [0, -3, 9]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, SHORTS);
        g.box(-3, 0, -2, 3, 0, 1, (x, y, z) => z === 1 && (x & 1) ? STUD : BELT);                    // the studded belt...
        g.box(-1, 0, 2, 1, 0, 2, GOLD); g.set(0, 0, 2, GOLD2);                                         // ...its gold buckle
        g.set(2, -1, 2, BELT); g.set(3, -1, 2, RING); g.set(3, -2, 1, BELT);                           // the strap to the O-ring at her left hip
        g.box(-3, -2, -2, 3, -2, 1, (x, y, z) => Math.abs(x) === 3 || z === 1 || z === -2 ? FRILL : SHORTS);   // the lace frill at the hem
        // the green bunny plush on the front of her right hip (clear of her hand): a round body, long ears, a red X eye and a
        // white O eye, a red button
        g.ell(-4, -2, 3, 1, 1.4, 1, (x, y) => y > -1 ? PLUSHHI : PLUSH);
        g.box(-4, 0, 3, -4, 2, 3, PLUSH); g.box(-3, 0, 3, -3, 1, 3, PLUSH2);
        g.set(-4, -1, 4, XRED); g.set(-3, -1, 4, WHITE); g.set(-4, -3, 4, XRED);
        g.box(2, -6, -3, 2, -2, -3, STRAP); g.set(2, -7, -3, DRING);                                   // the grey strap hanging behind, its D-ring
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, SKIN); g.set(0, 1, 1, SKIN2);                                        // the bare midriff, her navel
        g.box(-3, 3, -2, 3, 5, 1, TOP); g.box(-3, 3, -2, 3, 3, 1, TOP2);                               // the white crop top...
        g.box(-2, 3, 2, 2, 5, 2, (x, y) => (x + y * 2 + 9) % 3 === 0 ? INK : TOP);                     // ...its bold black print
        g.box(-3, 6, -1, 3, 6, 1, SKIN); g.box(-1, 6, -1, 1, 6, 1, CHOKER); g.set(0, 6, 2, RIB2);       // bare shoulders; the choker, its fishnet heart
        g.set(0, 5, 3, SILVER);                                                                        // the silver heart pendant
        g.box(-3, 6, -2, 3, 6, -2, COLLAR); g.set(-2, 6, 2, COLLAR); g.set(2, 6, 2, COLLAR);           // the white collar standing behind her neck
        // the cropped jacket, slipped off her shoulders: its back, its sides, its fronts, the orange-red patch on her left
        g.box(-3, 2, -3, 3, 5, -3, (x, y) => y === 2 ? JACKET2 : JACKET);
        for (const s of [-1, 1]) { g.box(3 * s, 2, -2, 3 * s, 5, 1, JACKET); g.box(3 * s, 2, 2, 3 * s, 4, 2, JACKET2); }
        g.set(3, 4, 3, PATCH);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH2 });
        g.set(-1, 0, 3, MOUTH); g.set(1, 0, 3, MOUTH);                                                 // her open grin
        g.set(2, 1, 3, MOLE);                                                                          // the beauty mark under her left eye
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 3], [-2, 4], [-1, 3], [0, 3], [1, 4], [2, 4], [3, 2], [4, 1]], sideTo: 2 });   // side-swept bangs
        g.set(-2, 7, 4, HAIRHI); g.set(1, 7, 4, HAIRHI); g.set(-3, 6, 3, HAIRHI); g.set(3, 7, 2, HAIRHI);
        for (const s of [-1, 1]) g.box(4 * s, -2, 1, 4 * s, 4, 2, (x, y) => y < 0 ? HAIR2 : HAIR);   // long locks framing her face
        g.box(-4, -1, -4, 4, 0, -4, HAIR2);
        // the two bunches high on her head, each tied with a black bow standing up like a rabbit's ears
        for (const s of [-1, 1]) {
          g.box(3 * s, 7, -2, 5 * s, 8, 0, HAIR); g.set(5 * s, 8, -1, HAIR3);
          g.set(4 * s, 9, -1, RIB2);                                                                   // the knot
          g.box(3 * s, 9, -1, 3 * s, 11, -1, RIB); g.box(5 * s, 9, -1, 5 * s, 10, -1, RIB); g.set(6 * s, 10, -1, RIB);   // the loops
        }
        g.set(2, 6, 5, RIB); g.set(3, 6, 5, YEL); g.set(2, 5, 5, RIB); g.set(3, 5, 5, YEL);             // the black clip, yellow-tipped, on her left bangs
        for (const s of [-1, 1]) { g.set(5 * s, 1, 0, YEL); g.set(5 * s, 0, 0, YEL); }                 // yellow heart earrings
      },
      armL: arm(1),
      armR: arm(-1),
      legL(g) {   // her left: the ripped black thigh-high, a garter strap and its ring
        H.leg(g, { pant: STOCK, boot: BOOT, bootH: 4, sole: SOLE });
        shortsTop(g);
        g.box(-1, -2, -1, 1, -2, 1, BELT); g.set(0, -2, 2, RING);
        g.set(0, -4, 1, SKIN); g.set(1, -5, 1, SKIN); g.set(-1, -3, 1, SKIN);                          // the rips
        boots(g, 1);
      },
      legR(g) {   // her right: bare, a black calf sock with a strap band
        H.leg(g, { pant: SKIN, boot: BOOT, bootH: 4, sole: SOLE });
        shortsTop(g);
        g.box(-1, -5, -1, 1, -5, 1, SOCK); g.box(-1, -4, -1, 1, -4, 1, BELT);
        boots(g, -1);
      },
      extra: {
        tail: {   // the long hair down her back (anim.js sways it)
          parent: 'head', at: [0, 3, -4], draw(g) {
            for (let y = 0; y >= -12; y--) {
              const w = y > -8 ? 4 : 3;
              g.box(-w, y, -1, w, y, 0, (x, yy, z) => y <= -11 ? HAIRHI : Math.abs(x) === w ? HAIR2 : (x * 2 + y * 3) % 7 === 0 && z === 0 ? HAIRHI : HAIR);
            }
          },
        },
        // the two long wavy tails from the bunches, down to her hips (anim.js sways them)
        tailL: twin(1), tailR: twin(-1),
        // the Mechanical Case in her right hand: empty here, filled in battle (hookLook, below). Tilted so that with her arm
        // in the ready stance it lies level at her hip, pointing forward
        case: { parent: 'armR', at: [0, -8, 0], rot: [0.55, 0, 0] },
      },
    });
    function twin(s) {
      return {
        parent: 'head', at: [5 * s, 7, -1], draw(g) {
          for (let y = 0; y >= -16; y--) {
            const i = -y, off = Math.round(Math.sin(i * 0.45) * 1.2) * s, w = i < 13 ? 1 : 0, z0 = i < 9 ? -2 : -1;
            g.box(off - w, y, z0, off + w, y, 1, (x, yy, z) => i >= 15 ? HAIRHI : (x - off) * s > 0 ? HAIR2 : (i + z) % 5 === 0 ? HAIRHI : HAIR);
          }
        },
      };
    }
  }

  /* -------------------------------------------- the case, drawn in battle --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Nicole) her rig's empty case part gets the case, once: in battle she
     carries it; in town (the city render) she does not. */
  let PROTO = null;
  const proto = () => PROTO || (PROTO = (() => { const g = new VX.Grid(); drawCase(g); return VX.object(g, MODELS.nicole.scale, { cast: false }); })());
  function armCase(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.case || P.case.userData.armed) return;
    P.case.add(proto().clone()); P.case.userData.armed = true;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded)
  let hooked = false;
  function hookLook() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'nicole') armCase(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'nicole') armCase(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookLook); else hookLook();

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: the case at her right hip pointing forward (its rot keeps it level so), her left hand on her hip
  ANIM.READY.nicole = { armL: [0.05, 0, 0.42], armR: [-0.55, 0, -0.14], torso: [0.04, 0.15, 0], head: [0, -0.12, 0.05], legL: [-0.15, 0, 0.07], legR: [0.18, 0, -0.06], hipsY: -0.02 };
  // hip fire: the case levelled at her hip, her left hand steadying it; the recoil, shot after shot
  const HIP = { armR: [-0.62, 0.05, -0.08], armL: [-0.95, -0.55, 0.3], torso: [0.06, 0.28, 0], head: [0, -0.25, 0], legL: [-0.38, 0, 0.1], legR: [0.3, 0, -0.1], hipsY: -0.07 };
  const hipPose = (k, o) => Object.assign({ armR: [HIP.armR[0] + k * 0.14, 0.05, -0.08], armL: HIP.armL, torso: [HIP.torso[0] - k * 0.05, 0.28, 0], head: HIP.head, legL: HIP.legL, legR: HIP.legR, hipsY: HIP.hipsY }, o || {});
  ACT.nkHipFire = (b, t) => add(b, hipPose(Math.max(0, Math.sin(t * 36))));
  // Cunning Combo: the case swung across (1st), swung up from low behind (2nd), each then shots from the hip
  ACT.nkSwing = (b, t, th, d) => t < th + 0.08 ? stage(b, { armR: [-1.1, 0.95, -1.0], torso: [0, 0.65, 0], legR: [0.3, 0, 0] }, { armR: [-1.05, -0.75, 0.45], torso: [0.12, -0.5, 0], legL: [-0.45, 0, 0], legR: [0.3, 0, 0] }, t, th, d) : ACT.nkHipFire(b, t);
  ACT.nkUpper = (b, t, th, d) => t < th + 0.08 ? stage(b, { armR: [0.55, 0, -0.25], torso: [0.25, 0.35, 0], hipsY: -0.1 }, { armR: [-2.3, 0, -0.3], torso: [-0.2, -0.1, 0], legL: [-0.5, 0, 0], lift: 0.08 }, t, th, d) : ACT.nkHipFire(b, t);
  // 3rd: a spin with the case swung out, firing as she turns; then the case slammed down
  ACT.nkFlurry = (b, t, th, d) => {
    if (t < 0.66) return add(b, { armR: [-1.35, 0, -1.25], armL: [-0.6, 0, 1.0], torso: [0.1, 0, 0], hipsY: -0.06, spin: clamp(t / 0.62, 0, 1) * PI * 2 });
    return stage(b, { armR: [-2.8, 0, -0.3], armL: [-2.0, 0, 0.4], torso: [-0.3, 0, 0], lift: 0.2 }, { armR: [-0.7, 0, 0], armL: [-0.9, 0, 0.3], torso: [0.5, 0, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], hipsY: -0.16 }, t - 0.66, 0.2, d - 0.66);
  };
  // Jack in the Box: a low dash in, the case forward, then shots
  ACT.nkDash = (b, t) => t < 0.24 ? add(b, { torso: [0.5, 0.1, 0], armR: [-0.7, 0, -0.1], armL: [0.6, 0, 0.45], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.12 }) : ACT.nkHipFire(b, t);
  // the vault back (Dash Attack, Dodge Counter, Quick Assist): a hop back, leaning away, then shots on landing
  ACT.nkVault = (b, t) => {
    if (t >= 0.32) return ACT.nkHipFire(b, t);
    const k = Math.sin(t / 0.32 * PI);
    return add(b, { legL: [-1.2, 0, 0.2], legR: [-0.9, 0, -0.2], armR: [-0.7, 0, -0.3], armL: [0.4, 0, 0.7], torso: [-0.25, 0, 0], tilt: -0.55 * k, lift: 0.35 * k });
  };
  // Sugarcoated Bullet: one braced shot from the hip
  ACT.nkHip = (b, t, th, d) => stage(b, hipPose(0), hipPose(1, { torso: [-0.12, 0.28, 0], hipsY: -0.05 }), t, th, d);
  // the EX, Chain Attack: feet planted wide, both hands on the case, each shell kicking it back
  const CAN = { armR: [-0.7, 0.1, -0.05], armL: [-1.05, -0.6, 0.3], torso: [0.12, 0.35, 0], head: [0, -0.3, 0], legL: [-0.6, 0, 0.18], legR: [0.5, 0, -0.18], hipsY: -0.12 };
  const canPose = (k, o) => Object.assign({}, CAN, { armR: [CAN.armR[0] + k * 0.3, 0.1, -0.05], torso: [CAN.torso[0] - k * 0.25, 0.35, 0] }, o || {});
  ACT.nkCannon = (b, t, th) => add(b, canPose(t >= th - 0.16 ? Math.abs(Math.sin((t - th + 0.16) * 20)) * Math.exp(-Math.max(0, t - th) * 2) : 0));
  // the held EX: braced, the case trembling as it drinks the Energy
  ACT.nkCharge = (b, t) => add(b, canPose(0, { hipsY: CAN.hipsY - 0.02, roll: Math.sin(t * 46) * 0.012 * Math.min(1, t * 2) }));
  // Ether Grenade: the case tipped up to lob the grenade high, the kick as it goes
  ACT.nkLob = (b, t) => { const k = t > 0.7 ? Math.exp(-(t - 0.7) * 5) : 0; return add(b, { armR: [-1.15 + k * 0.35, 0.1, -0.1], armL: [-1.4, -0.5, 0.3], torso: [-0.15 - k * 0.2, 0.3, 0], head: [-0.25, -0.2, 0], legL: [-0.5, 0, 0.15], legR: [0.45, 0, -0.15], hipsY: -0.08 }); };
  // The Hare Strikes Back!: the case raised before her as a shield
  ACT.nkParry = b => add(b, { armR: [-1.35, -0.55, 0.25], armL: [-1.25, -0.2, 0.15], torso: [0.18, 0, 0], hipsY: -0.1, legL: [-0.5, 0, 0], legR: [0.4, 0, 0] });
  // Window of Opportunity: she charges in, swings the case, then bombards from the hip
  ACT.nkFollow = (b, t, th, d) => t < 0.24 ? ACT.nkDash(b, 0) : t < 0.42 ? ACT.nkSwing(b, t, 0.3, 0.42) : ACT.nkCannon(b, t, 0.5, d);

  /* ------------------------------------------------------------- effects --
     nkShot: bullets from the case to the target (Physical: white-gold
     tracers; enhanced: pink-violet, with a spark where they land). nkShell:
     Ether shells lobbed from the muzzle to the target (high: the Ultimate's
     grenade). nkBoom: a shell bursting in Ether. nkMuzzle: the held EX's
     little field at the muzzle, drawing light in. The energy fields' own
     look (a violet pool, rings closing in, light spiralling to the centre)
     is drawn by spawnField / tickFields above. */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const aim = (a, A, tgt, far) => tgt ? { x: tgt.x, z: tgt.z } : { x: a.x + Math.sin(A.dir) * (far || 6), z: a.z + Math.cos(A.dir) * (far || 6) };
  const E = CHOREO.events;
  E.nkShot = (a, A, e, tgt) => {
    const m = muzzle(a), p = aim(a, A, tgt, e.len || 6), enh = !!e.enh;
    for (let i = 0; i < (e.n || 1); i++) {
      const end = V3(p.x + rnd(-0.4, 0.4), 0.9 + rnd(-0.2, 0.3), p.z + rnd(-0.4, 0.4));
      FX.beam(m, end, enh ? PINK : TRACER, 0.06, 0.12); FX.beam(m, end, 0xffffff, 0.025, 0.1);
      if (enh) FX.burst(end.x, end.y, end.z, 5, { col: [PINK, ETH, 0xffffff], speed: 3, size: 0.08, life: 0.25 });
    }
    FX.glow(m.x, m.y, m.z, enh ? 1.0 : 0.7, enh ? ETH : 0xffe0a0, 0.1);
    SFX.play('shot');
  };
  E.nkShell = (a, A, e, tgt) => {
    const m = muzzle(a), p = aim(a, A, tgt, 6), T = e.T || 0.2, g = e.high ? 30 : 14;
    FX.glow(m.x, m.y, m.z, 1.6, ETH, 0.18, { size1: 2.6 }); FX.glow(m.x, m.y, m.z, 0.9, 0xffffff, 0.1);
    for (let i = 0; i < (e.n || 1); i++) {
      const x1 = p.x + rnd(-0.3, 0.3), z1 = p.z + rnd(-0.3, 0.3);
      FX.p({ x: m.x, y: m.y, z: m.z, vx: (x1 - m.x) / T, vy: (0.5 - m.y) / T + g * T / 2, vz: (z1 - m.z) / T, g, life: T, size: e.big ? 0.42 : 0.3, size1: 0.2, col: i ? PINK : HOT });
    }
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.15 : 0.08); SFX.play(e.big ? 'boom' : 'shot');
  };
  E.nkBoom = (a, A, e, tgt) => {
    const B = BT.B, p = aim(a, A, tgt, 6), r = e.r || 2.4;
    FX.burst(p.x, 0.9, p.z, e.big ? 60 : 36, { col: [0xffffff, ETH, PINK, VIO, HOT], speed: e.big ? 9 : 7, size: 0.18, size1: 0.04, life: 0.6, g: 2, up: 1.5 });
    FX.glow(p.x, 1, p.z, r * 1.2, ETH, 0.35, { size1: r * 2 }); FX.ring(p.x, p.z, 0.4, r, PINK, 0.4); FX.ring(p.x, p.z, 0.3, r * 0.6, 0xffffff, 0.3);
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.4 : 0.22); SFX.play('boom');
  };
  CHOREO.streams.nkMuzzle = (a, A) => {
    if (A.t < CH_FROM) return;
    const cx = a.x + Math.sin(A.dir) * 1.8, cz = a.z + Math.cos(A.dir) * 1.8;
    for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(1.2, 2.2); FX.p({ x: cx + Math.cos(an) * r, y: rnd(0.4, 1.4), z: cz + Math.sin(an) * r, vx: -Math.cos(an) * r * 3, vz: -Math.sin(an) * r * 3, life: 0.3, size: 0.12, size1: 0.03, col: U.pick([ETH, PINK, HOT]) }); }
    if (Math.random() < 0.3) FX.glow(cx, 0.9, cz, 1.2, ETH, 0.12);
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const shots = (def, enh) => def.hits.filter(h => h.shape === 'line').map(h => ({ t: h.t, fx: 'nkShot', n: 2, enh }));
  const swings = def => def.hits.filter(h => h.shape === 'arc').map((h, i) => ({ t: h.t, fx: 'crescent', y: 0.8, tilt: i & 1 ? -0.4 : 0.4, r: 2.2, arc: 2.4, col: CASEFX }));
  const AFTER = 0xf0b8c8;
  for (const enh of [false, true]) {
    const L = enh ? K.dap : K.basic;
    set(L[0], { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.5 }], events: swings(L[0]).concat(shots(L[0], enh)) });
    set(L[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.4 }], events: swings(L[1]).concat(shots(L[1], enh)) });
    set(L[2], { motion: [{ t0: 0.02, t1: 0.6, kind: 'fwd', d: 0.6, ease: 'lin' }],
      events: swings(L[2]).concat(shots(L[2], enh), [{ t: 0.86, fx: 'crescent', y: 1.0, tilt: 1.2, r: 2.6, arc: 3.0, col: CASEFX }, { t: 0.86, fx: 'dust' }]) });
  }
  for (const d of [K.dash, K.dashE]) set(d, { motion: [{ t0: 0, t1: 0.14, kind: 'toTarget', gap: 1.6 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: AFTER }], events: swings(d).concat(shots(d, d === K.dashE)) });
  set(K.vault, { motion: [{ t0: 0, t1: 0.32, kind: 'leap', h: 0.8, d: -2.4 }], stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: AFTER }], events: shots(K.vault, false) });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 0.8, side: 'auto' }, { t0: 0.1, t1: 0.32, kind: 'leap', h: 0.7, d: -1.6 }], stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.3, fx: 'nkShell', T: 0.12, big: true }, { t: 0.34, fx: 'nkShot', n: 3, enh: true }, { t: 0.42, fx: 'nkBoom', r: 2.0 }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.3, kind: 'leap', h: 0.7, d: -1.6 }], stream: [{ t0: 0, t1: 0.28, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.3, fx: 'nkShell', T: 0.12 }, { t: 0.34, fx: 'nkShot', n: 2, enh: true }, { t: 0.42, fx: 'nkBoom', r: 1.8 }] });
  set(K.special, { motion: [{ t0: 0.18, t1: 0.3, kind: 'back', d: 0.3 }], events: [{ t: 0.16, fx: 'nkShell', T: 0.1 }, { t: 0.18, fx: 'nkShot', n: 1, enh: true }, { t: 0.26, fx: 'nkBoom', r: 1.6 }] });
  for (const d of [K.ex, K.exRel]) set(d, { motion: [{ t0: 0.2, t1: 0.6, kind: 'back', d: 0.7 }],
    events: [{ t: 0.2, fx: 'nkShell', T: 0.14, n: 2 }, { t: 0.34, fx: 'nkBoom', r: 2.2 }, { t: 0.42, fx: 'nkShell', T: 0.14, n: 2, big: true }, { t: 0.56, fx: 'nkBoom', r: 2.6, big: true }] });
  set(K.exCharge, { stream: [{ t0: CH_FROM, t1: K.exCharge.dur, kind: 'nkMuzzle' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.0 }],
    events: [{ t: 0.3, fx: 'nkShell', T: 0.2, n: 2 }, { t: 0.5, fx: 'nkBoom', r: 2.2 }, { t: 0.45, fx: 'nkShell', T: 0.17, n: 3, big: true }, { t: 0.62, fx: 'nkBoom', r: 2.8, big: true }, { t: 0.62, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.2 }],
    events: [{ t: 0.4, fx: 'whiteFlash' }, { t: 0.7, fx: 'nkShell', T: 0.5, n: 3, high: true, big: true }, { t: 1.2, fx: 'nkBoom', r: 3.6, big: true }, { t: 1.2, fx: 'whiteFlash' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 1.4 }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.3, fx: 'crescent', y: 0.9, tilt: 0.5, r: 2.4, arc: 2.6, col: CASEFX }, { t: 0.4, fx: 'nkShell', T: 0.1 }, { t: 0.5, fx: 'nkBoom', r: 2.0 }, { t: 0.6, fx: 'nkShell', T: 0.12, big: true }, { t: 0.72, fx: 'nkBoom', r: 2.6, big: true }] });
})();
