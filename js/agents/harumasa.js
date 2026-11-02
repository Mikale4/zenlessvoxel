/* ============================================================================
   agents/harumasa.js -- Asaba Harumasa of Hollow Special Operations Section
   6 (H.S.O.S.6). S-Rank, Electric, Attack, Defensive Assist. Released in
   Version 1.4.

   An Agent in his own file, as agents/zhuyuan.js describes (the hooks and
   helpers a file like this can use are listed in its header). Numbers: skill
   names, inputs and mechanics are the official game's; multipliers are the
   official level-12 values scaled to this game's tuning: DMG x0.45, Daze
   x0.6; Anomaly Buildup as datamined (/100). Which hits are heavy is not
   listed by any source: the game's usual rule (string finishers, counters,
   EX, Chain, Ultimate, assist follow-ups) decides.

   Sources: zzz.gachabase.net (datamine, game data 3.3.0: skills, stats,
   core skill), genshin-builds, icy-veins, game8, the bilibili wiki (official
   portrait, intro art and in-game skill demo clips), Siliconera, Pocket
   Gamer, Gosugamers, KeenGamer.

   His kit (official, base kit):
     Basic Attack: Cloud Piercer      5 piercing hits: three swings of the
                                      bladed bow (Physical), a lunging shot and
                                      a point-blank blast (Electric). Hit 5
                                      calls up 2 Electro Quivers (6 on the first
                                      5th hit after a Chain Attack).
     Basic Attack: Cloud Piercer - Drift   a direction + Basic during the
                                      string: a ranged Physical shot that
                                      repositions him.
     Basic Attack: Falling Feather    hold Basic: an aimed shot. Hold Special
                                      straight after Basic hit 5, a Special, an
                                      EX or a Chain Attack: a quick shot.
     Basic Attack: Ha-Oto no Ya       when Falling Feather hits with Electro
                                      Quivers out, they fire at the enemies it
                                      hit: each arrow leaves Electro Prison (up
                                      to 8 stacks, 10 s). 2 stacks X-Mark an
                                      enemy; while any is X-Marked he is
                                      Awakened.
     Dash Attack: Hiten no Tsuru (Physical) / Hiten no Tsuru - Slash
                                      (Awakened: rushes to the nearest X-Marked
                                      enemy, 2 Electro Prison a cut, up to 3 in
                                      a row; also Basic straight after Falling
                                      Feather; 40% less DMG taken)
     Dodge Counter: Hidden Edge       Special Attack: Nowhere to Hide
     EX Special Attack: Nowhere to Run (60 Energy: daggers, an enhanced arrow,
                                      6 Electro Quivers)
     Chain Attack: Kai - Hanare (6 Quivers)   Ultimate: Zanshin
     Quick Assist: Braced Bow    Defensive Assist: Yugamae
     Assist Follow-Up: Yugamae - Slash
     Core Passive: Day Break          the Slash's CRIT Rate +25%; its critical
                                      hits give Gleaming Edge (1 a hit, up to 3
                                      a Slash; up to 6, 5 s): +12% CRIT DMG to
                                      the Slash a stack.
     Additional Ability: Overclock    with a Stun or Anomaly teammate: +40% DMG
                                      against Stunned or Anomaly-afflicted
                                      enemies, and Falling Feather puts 2
                                      Electro Prison on them.
     Electro Quivers also come from a teammate's Attribute Anomaly when none
     are out (6, once per 12 s). Up to 6 at a time.
   NOT included: the v2.6 Potential additions (Potential Vision): EX Special
   Attack: Nowhere to Run - Patrol, Zanshin - Scattered Blossoms, Chasing
   Thunder and the Slash's block on its first hit, Day Break's bonuses for the
   Ultimate, and Potential Awakening: Focus.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const EL = 0x5ec8ff, EL2 = 0xbfe8ff, CYAN = 0x3dc5d6, PINK = 0xff7ad8, TR = 0xffe2b0, ORANGE = 0xffa040;

  /* ----------------------------------------------------------------- kit -- */
  // each Slash is a dash in and an X-shaped cut: two crossing strokes and the flare (3 hits, so Day Break can give its
  // 3 Gleaming Edge a Slash; the split is our choice). No source gives the Slash an Anomaly Buildup.
  const XCUT = (dmg, daze) => [0.24, 0.3, 0.38].map(t => hit(t, dmg / 3, daze / 3, 0, { shape: 'circle', at: 'target', r: 1.5 }));
  const K = {
    basic: [
      { name: 'Basic Attack: Cloud Piercer', anim: 'hmSwing1', dur: 0.42, cancel: 0.3, reach: 1.7, range: 1.6, hits: [hit(0.15, 85.3, 40.8, 0, { attr: 'physical' })] },
      { name: 'Basic Attack: Cloud Piercer', anim: 'hmSwing2', dur: 0.45, cancel: 0.32, reach: 1.7, range: 1.6, hits: [hit(0.16, 80.5, 67.4, 0, { attr: 'physical' })] },
      { name: 'Basic Attack: Cloud Piercer', anim: 'hmSwing3', dur: 0.55, cancel: 0.42, reach: 1.8, range: 1.6, hits: [hit(0.22, 142.4, 100.2, 0, { attr: 'physical', arc: 220 })] },
      { name: 'Basic Attack: Cloud Piercer', anim: 'hmLunge', dur: 0.55, cancel: 0.42, reach: 4, range: 2.2, hits: [hit(0.22, 180.3, 134.7, 49.2, { shape: 'line', r: 0.9, len: 6 })] },
      { name: 'Basic Attack: Cloud Piercer', anim: 'hmCrouchShot', dur: 0.7, cancel: 0.55, reach: 2.8, range: 1.8, hsQ5: true, hsWindow: true, hits: [hit(0.28, 266.0, 173.7, 65.8, { heavy: true, shape: 'cone', r: 3.4, arc: 50, kb: 0.9 })] },
    ],
    // a direction + Basic during the string (yours: AUTO keeps to the string)
    drift: { name: 'Basic Attack: Cloud Piercer - Drift', anim: 'hmDrift', dur: 0.5, cancel: 0.38, reach: 6, range: 3, hits: [hit(0.2, 139.9, 74.0, 0, { attr: 'physical', shape: 'line', r: 0.8, len: 6.5 })] },
    // Falling Feather: the quick shot (hold Special in the window) and the aimed one (hold Basic). Same numbers.
    ffQuick: { name: 'Basic Attack: Falling Feather', anim: 'hmFlipShot', dur: 0.55, cancel: 0.42, reach: 8, range: 3.5, hsFF: true, hits: [hit(0.15, 211.0, 79.1, 33.5, { shape: 'line', r: 1.0, len: 8.5 })] },
    ffAim: { name: 'Basic Attack: Falling Feather', anim: 'hmAimShot', dur: 0.85, cancel: 0.68, reach: 9, range: 4, hsFF: true, hits: [hit(0.55, 211.0, 79.1, 33.5, { shape: 'line', r: 1.0, len: 9.5 })] },
    // the Electro Quivers' arrows (mech.hit fires them through BT.applyHit; as a move of its own it is only for tests)
    haoto: { name: 'Basic Attack: Ha-Oto no Ya', anim: 'hmBraced', dur: 0.3, cancel: 0.3, reach: 9, hits: [hit(0.05, 32.4, 0, 0, { shape: 'circle', at: 'target', r: 0.6 })] },
    dash: { name: 'Dash Attack: Hiten no Tsuru', anim: 'hmDashThrust', dur: 0.6, cancel: 0.45, reach: 7, hits: [0.24, 0.31, 0.38].map(t => hit(t, 162.1 / 3, 61.3 / 3, 0, { attr: 'physical', shape: 'line', r: 0.8, len: 3.2 })) },
    // Awakened: the Slash, 1st / 2nd / 3rd in a row (dr: Anti-Interrupt and 40% less DMG taken)
    slash1: { name: 'Dash Attack: Hiten no Tsuru - Slash', anim: 'hmSlash', dur: 0.62, cancel: 0.46, reach: 9, range: 1.4, dr: 0.4, hsSlash: 1, hits: XCUT(325.1, 99.0) },
    slash2: { name: 'Dash Attack: Hiten no Tsuru - Slash', anim: 'hmSlash', dur: 0.62, cancel: 0.46, reach: 9, range: 1.4, dr: 0.4, hsSlash: 2, hits: XCUT(333.8, 69.0) },
    slash3: { name: 'Dash Attack: Hiten no Tsuru - Slash', anim: 'hmSlash', dur: 0.62, cancel: 0.46, reach: 9, range: 1.4, dr: 0.4, hsSlash: 3, hits: XCUT(379.9, 74.8) },
    counter: { name: 'Dodge Counter: Hidden Edge', anim: 'hmThrust', dur: 0.65, cancel: 0.5, reach: 3, inv: [0, 0.55], hits: [hit(0.2, 439.6, 292.2, 53.6, { heavy: true, shape: 'line', r: 1.0, len: 5, kb: 0.9 })] },
    special: { name: 'Special Attack: Nowhere to Hide', anim: 'hmBackflip', dur: 0.62, cancel: 0.48, reach: 6, range: 3, cd: 1.5, dr: 0.4, hsWindow: true, hits: [hit(0.15, 105.1, 78.7, 33.3, { shape: 'line', r: 0.9, len: 7 })] },
    // the daggers, then the enhanced arrow (the 10/10/10/70 split is our choice); its landing calls up 6 Quivers (hsGen)
    ex: { name: 'EX Special Attack: Nowhere to Run', anim: 'hmEx', dur: 1.2, cancel: 1.05, cost: 60, reach: 6, range: 3, inv: [0, 1.1], hsWindow: true, hsGen: 0.82,
      hits: [0.24, 0.32, 0.4].map(t => hit(t, 899.2 * 0.1, 674.5 * 0.1, 319.1 * 0.1, { shape: 'cone', r: 5, arc: 40 })).concat([hit(0.82, 899.2 * 0.7, 674.5 * 0.7, 319.1 * 0.7, { heavy: true, shape: 'line', r: 1.4, len: 9, kb: 1.1 })]) },
    // a wide piercing sweep, then the enhanced arrow from the sky (40/60, our choice)
    chain: { name: 'Chain Attack: Kai - Hanare', anim: 'hmChain', dur: 1.4, inv: [0, 1.4], hsWindow: true, hsGen: 1.05,
      hits: [hit(0.32, 1035.7 * 0.4, 275.8 * 0.4, 256.3 * 0.4, { shape: 'line', r: 1.8, len: 7 }), hit(1.05, 1035.7 * 0.6, 275.8 * 0.6, 256.3 * 0.6, { heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1.2 })] },
    // the great shot, and the field it leaves (85/7.5/7.5, our choice)
    ult: { name: 'Ultimate: Zanshin', anim: 'hmUlt', dur: 2.3, inv: [0, 2.3],
      hits: [1.5, 1.72, 1.94].map((t, i) => { const k = i ? 0.075 : 0.85; return hit(t, 3908.6 * k, 160.8 * k, 61.8 * k, i ? { shape: 'line', r: 1.9, len: 11 } : { heavy: true, shape: 'line', r: 1.9, len: 11, kb: 1.6 }); }) },
    assist: { name: 'Defensive Assist: Yugamae', type: 'defensive', anim: 'hmGuard', dur: 0.45, inv: [0, 0.45], daze: Math.round(371.9) },
    followup: { name: 'Assist Follow-Up: Yugamae - Slash', anim: 'hmFollow', dur: 1.05, inv: [0, 1.0],
      hits: [0.25, 0.5].map(t => hit(t, 615.1 * 0.25, 395.3 * 0.25, 181.5 * 0.25, { arc: 160, r: 2.6 })).concat([hit(0.78, 615.1 * 0.5, 395.3 * 0.5, 181.5 * 0.5, { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.0 })]) },
    quick: { name: 'Quick Assist: Braced Bow', anim: 'hmBraced', dur: 0.65, reach: 6, inv: [0, 0.6], hits: [hit(0.26, 169.0, 127.2, 53.6, { shape: 'line', r: 1.0, len: 7, kb: 0.6 })] },
  };
  const SLASH = [K.slash1, K.slash2, K.slash3];

  /* ------------------------------------------- Electro Prison, Quivers -- */
  // Electro Prison lives on the enemy: v.hsPrison stacks until v.hsPrisonT. 2 or more: X-Marked.
  const marks = (v, t) => v.alive && v.hsPrisonT > t ? v.hsPrison : 0;
  const awake = (B, t) => B.enemies.some(v => marks(v, t) >= 2);
  function prison(v, n) {
    const t = BT.B.t, was = marks(v, t);
    v.hsPrison = Math.min(8, was + n); v.hsPrisonT = t + 10;
    if (was < 2 && v.hsPrison >= 2) BT.log(`${v.def.name} is X-Marked.`, 'skill');
  }
  function nearestMarked(a, B) {
    let best = null, bd = 1e9;
    for (const v of B.enemies) { if (marks(v, B.t) < 2) continue; const d = U.dist(a, v); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  // where the Quivers hover: a fan behind his shoulders
  const _q = new THREE.Vector3();
  const slot = (a, i, n, t, out) => { const an = a.face + PI + (i - (n - 1) / 2) * 0.5; return out.set(a.x + Math.sin(an) * 0.95, 1.75 + Math.sin(t * 3 + i) * 0.08 + (a.airY || 0), a.z + Math.cos(an) * 0.95); };
  function quivers(a, n) {
    const was = a.hsQ; a.hsQ = Math.min(6, a.hsQ + n);
    if (a.obj && a.obj.visible) for (let i = was; i < a.hsQ; i++) { slot(a, i, a.hsQ, BT.B.t, _q); FX.glow(_q.x, _q.y, _q.z, 0.8, CYAN, 0.25); FX.burst(_q.x, _q.y, _q.z, 6, { col: [0xffffff, CYAN, EL2], speed: 2, size: 0.07, life: 0.3, g: 0 }); }
  }
  // one arrow of Ha-Oto no Ya, from Quiver i to v
  function haoto(a, v, i) {
    const B = BT.B; slot(a, i % 6, 6, B.t, _q);
    const p1 = new THREE.Vector3(v.x + rnd(-0.2, 0.2), Math.min(1.8, v.height * 0.6), v.z + rnd(-0.2, 0.2));
    FX.beam(_q.clone(), p1, CYAN, 0.09, 0.18); FX.beam(_q.clone(), p1, 0xffffff, 0.035, 0.14); FX.glow(p1.x, p1.y, p1.z, 0.9, EL, 0.14);
    SFX.play('shot', 0.05);
    BT.applyHit(a, v, K.haoto.hits[0], { def: K.haoto, kind: 'haoto', data: {}, dir: U.ang(a, v), t: 0, tgt: v }, 'electric');
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.harumasa = {
    id: 'harumasa', name: 'Asaba Harumasa', short: 'Harumasa', faction: 'Hollow Special Operations Section 6', spec: 'Attack', attr: 'electric', rank: 'S',
    color: '#f7d852', color2: '#325664', assist: 'defensive', stance: 'bow',
    blurb: 'Section 6\'s laid-back archer, who picked the bow so he would have to run less, and whose bow is also a pair of blades. His string, EX and Chain Attack call up Electro Quivers; Falling Feather sets them loose to X-Mark his targets, and while one is marked his Dash Attack becomes a lightning Slash.',
    stats: { hp: 8290, atk: 3080, def: 640, impact: 90, ap: 95, am: 80, cr: 0.49, cd: 0.9, er: 1.2, speed: 4.8 },
    ai: { range: 2.0, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'quivers',
    core: [
      ['Core Passive: Day Break', 'Dash Attack: Hiten no Tsuru - Slash gains +25% CRIT Rate. Its critical hits give him Gleaming Edge (up to 3 a Slash; up to 6 stacks, 5 s, refreshed): +12% CRIT DMG to the Slash per stack.'],
      ['Electro Quivers and Electro Prison', 'Basic hit 5 calls up 2 Electro Quivers (6 on the first one after a Chain Attack); his EX and Chain Attack call up 6, and so does a teammate\'s Attribute Anomaly when none are out (once per 12 s). Up to 6. When Falling Feather hits, they fire Ha-Oto no Ya at its targets, each arrow adding 1 Electro Prison (up to 8, 10 s). At 2 stacks an enemy is X-Marked, and while one is, Harumasa is Awakened.'],
      ['Hiten no Tsuru - Slash', 'Awakened, Basic during a dodge (or straight after Falling Feather) rushes him to the nearest X-Marked enemy for an X-shaped cut that spends 2 of its Electro Prison. Press again to cut again while the mark lasts, up to 3 in a row. He takes 40% less DMG while cutting.'],
      ['Falling Feather', 'Hold Basic to draw and fire an aimed shot. Hold Special straight after Basic hit 5, a Special Attack, an EX or a Chain Attack for a quick shot.'],
      ['Additional Ability: Overclock', 'With a Stun or Anomaly Agent in the squad: +40% DMG against Stunned or Anomaly-afflicted enemies, and Falling Feather puts 2 Electro Prison on them.'],
    ],
    kit: K,
    kitShow: [['Hold', 'ffAim'], ['Hold Special', 'ffQuick'], ['Quivers', 'haoto'], ['Dash', 'dash'], ['Awakened', 'slash1'], ['Drift', 'drift']],
    rivalMoves: [{ k: 'ffAim', kind: 'core', p: 0.2, cd: 4 }, { k: 'slash1', kind: 'dash', p: 0.12, cd: 6 }],
    howto: 'Harumasa: Basic hit 5, EX and Chain Attack call up Electro Quivers. Hold Basic (or hold Special straight after hit 5, a Special, EX or Chain) for Falling Feather: the Quivers fire and stack Electro Prison, and at 2 stacks an enemy is X-Marked. Then dodge + Basic, or Basic right after Falling Feather, for Hiten no Tsuru - Slash, up to 3 in a row. His assist is a Defensive Assist.',
    mech: {
      init(a) { a.hsQ = 0; a.hsQPend = []; a.hsVolley = []; a.hsQuickT = 0; a.hsAfterFF = 0; a.hsSlashT = 0; a.hsSlashN = 0; a.hsGleam = 0; a.hsGleamT = 0; a.hsChain = false; a.hsAnomCd = 0; a.hsOver = false; a.hsAwake = false; },
      squad(a, B) { a.hsOver = B.squad.some(s => s !== a && (s.def.spec === 'Stun' || s.def.spec === 'Anomaly')); },
      start(a, def, A) {
        const B = BT.B, t = B.t;
        if (def.hsWindow) a.hsQuickT = t + A.dur + 0.6;                    // hold Special now: the quick Falling Feather
        if (def.hsFF) { a.hsQuickT = 0; a.hsAfterFF = t + A.dur + 0.5; }   // Basic just after it: the Slash (Awakened)
        if (def.hsGen) a.hsQPend.push({ at: t + def.hsGen, n: 6 });        // the enhanced arrow lands: 6 Quivers
        if (A.kind === 'chain') a.hsChain = true;                          // the next 5th hit calls up 6
        if (def.hsSlash) {
          const prey = nearestMarked(a, B);                                // he rushes the nearest X-Marked enemy
          if (prey) { A.tgt = prey; A.dir = a.face = U.ang(a, prey); }
          a.hsSlashN = def.hsSlash % 3; a.hsSlashT = t + A.dur + 0.5; a.hsAfterFF = 0; A.data.gl = 0;
        } else a.hsSlashT = 0;
        // AUTO follows the 5th hit with the quick Falling Feather, as a player holding Special would
        if (def === K.basic[4] && !A.data.manual && !a.queue.length && Math.random() < 0.85) a.queue.push({ def: K.ffQuick, kind: 'core', delay: 0.05 });
      },
      hit(a, v, h, A) {
        const B = BT.B, d = A.def;
        if (d.hsQ5 && !A.data.q5) { A.data.q5 = true; quivers(a, a.hsChain ? 6 : 2); a.hsChain = false; }
        if (d.hsFF) {
          if (a.hsOver && (v.stun > 0 || v.anom)) prison(v, 2);           // Overclock
          if (A.data.q == null) { A.data.q = a.hsQ; a.hsQ = 0; }           // every Quiver out fires, at each enemy it hit
          for (let i = 0; i < A.data.q; i++) a.hsVolley.push({ v, at: B.t + 0.06 + i * 0.06, i });
        }
        if (d === K.haoto) prison(v, 1);
        if (d.hsSlash) {
          if (!A.data.spent && v === A.tgt && marks(v, B.t) >= 2) { A.data.spent = true; v.hsPrison -= 2; }
          if (A.data.crit && A.data.gl < 3) { A.data.gl++; a.hsGleam = Math.min(6, (a.hsGleamT > B.t ? a.hsGleam : 0) + 1); a.hsGleamT = B.t + 5; }
        }
      },
      // Overclock's DMG; the Slash's CRIT (Day Break). We roll the Slash's crit ourselves (cr +-5 makes it certain either
      // way) so that hit() knows a critical hit landed and gives Gleaming Edge.
      mods(a, v, h, A) {
        const B = BT.B, o = { dmg: a.hsOver && (v.stun > 0 || v.anom) ? 0.4 : 0 };
        if (A && A.def.hsSlash) {
          const crit = Math.random() < a.st.cr + 0.25;
          A.data.crit = crit; o.cr = crit ? 5 : -5; o.cd = 0.12 * (a.hsGleamT > B.t ? a.hsGleam : 0);
        }
        return o;
      },
      tick(a, dt, on) {
        const B = BT.B, t = B.t;
        for (let i = a.hsQPend.length - 1; i >= 0; i--) if (t >= a.hsQPend[i].at) { quivers(a, a.hsQPend[i].n); a.hsQPend.splice(i, 1); }
        for (let i = a.hsVolley.length - 1; i >= 0; i--) { const s = a.hsVolley[i]; if (t < s.at) continue; a.hsVolley.splice(i, 1); if (s.v.alive) haoto(a, s.v, s.i); }
        const aw = awake(B, t);
        if (aw && !a.hsAwake && on) BT.callout('AWAKENED', 'skill', 'Harumasa · X-Mark');
        a.hsAwake = aw;
        // the Quivers hovering behind him (cyan arrows), and the X-Marks over his targets
        if (on) for (let i = 0; i < a.hsQ; i++) {
          slot(a, i, a.hsQ, t, _q);
          for (let k = 0; k < 4; k++) FX.p({ x: _q.x, y: _q.y - 0.18 + k * 0.12, z: _q.z, life: 0.05, size: k === 3 ? 0.11 : 0.06, size1: k === 3 ? 0.11 : 0.06, col: k === 3 ? 0xffffff : CYAN, spin: 0 });
        }
        const yaw = B.cam && B.cam.yaw || 0, rx = Math.cos(yaw), rz = -Math.sin(yaw);
        for (const v of B.enemies) {
          const n = marks(v, t); if (n < 2) continue;
          const y = v.height + 0.35;
          for (let k = -2; k <= 2; k++) for (const s of k ? [-1, 1] : [1]) FX.p({ x: v.x + rx * k * 0.12 * s, y: y + k * 0.12, z: v.z + rz * k * 0.12 * s, life: 0.05, size: 0.07, size1: 0.07, col: k ? ORANGE : 0xffffff, spin: 0 });
          for (let k = 0; k < n; k++) FX.p({ x: v.x + rx * (k - (n - 1) / 2) * 0.12, y: y - 0.4, z: v.z + rz * (k - (n - 1) / 2) * 0.12, life: 0.05, size: 0.05, size1: 0.05, col: EL, spin: 0 });
        }
      },
      // a teammate's Attribute Anomaly with no Quivers out: 6 Quivers (once per 12 s)
      anomaly(a, src) {
        const B = BT.B;
        if (src === a || a.hsQ > 0 || a.hsAnomCd > B.t) return;
        a.hsAnomCd = B.t + 12; quivers(a, 6); BT.log(`Harumasa: ${src.def.short}'s Anomaly calls up 6 Electro Quivers.`, 'skill');
      },
      // hold Basic: the aimed Falling Feather. Hold Special in the window: the quick one. Awakened, Basic after a dodge,
      // after Falling Feather or after a Slash: the (next) Slash. Your direction + Basic during the string: Drift.
      resolve(a, btn, hold, c) {
        const t = c.t;
        if (btn === 'special') return hold && a.hsQuickT > t ? { def: K.ffQuick, kind: 'core' } : null;
        if (btn !== 'basic') return null;
        if (hold) return { def: K.ffAim, kind: 'core' };
        if (awake(c.B, t) && (c.dash || a.hsAfterFF > t || a.hsSlashT > t)) return { def: SLASH[a.hsSlashT > t ? a.hsSlashN : 0], kind: 'dash' };
        if (!c.dash && a.combo > 0 && t - a.lastBasic <= 0.9 && BT.isPlayer(a) && BT.moveInput()) return { def: K.drift, kind: 'basic', step: a.combo - 1 };
        return null;
      },
      // AUTO: the Slash while anyone is X-Marked (a dash in, then Basic), the quick Falling Feather in its window,
      // and an aimed one now and then with Quivers out
      ai(a, tgt, B) {
        const t = B.t;
        if (awake(B, t) && (a.hsSlashT > t || a.hsAfterFF > t || Math.random() < 0.6)) return { btn: 'basic', o: { dash: true } };
        if (a.hsQuickT > t && Math.random() < 0.85) return { btn: 'special', hold: true };
        if (a.hsQ >= 2 && Math.random() < 0.3) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const t = B.t, n = B.enemies.filter(v => marks(v, t) >= 2).length;
        return [`QUIVERS ${'◆'.repeat(a.hsQ)}${'◇'.repeat(6 - a.hsQ)}`].concat(n ? [`AWAKENED · X-MARK ×${n}`] : [], a.hsGleamT > t ? [`GLEAMING EDGE ×${a.hsGleam} ${Math.ceil(a.hsGleamT - t)}s`] : [], a.hsQuickT > t ? ['HOLD SPECIAL: FALLING FEATHER'] : []);
      },
    },
    town: {
      routine: ['cafe:t 40, metro:wait 25, huddle 35', 'box:bench 40, bardic:bench 25, huddle 35', 'soup:stool 35, gf:cab 20, huddle 45', 'alley:vend 40, box:cats 35, rp:night 25'],
      chatter: ['Just stretching my legs. Doctor\'s orders.', 'Overtime? Never heard of it.'],
      lines: [
        'Asaba Harumasa, Section 6. If you\'re here to hand me more work, I\'m on sick leave. Officially. Probably.',
        'Black coffee, no sugar. Soukaku always ends up with my sugar packets. Everybody wins.',
        'I picked the bow so I\'d have to run less. Smart, right? ...Don\'t tell the Captain I said that.',
      ],
      chapters: [
        { title: 'Black, no sugar', ask: ['Manager~ You look like someone who\'d do a sick man a favour.', 'A coffee from Coff Cafe. Black, no sugar. If the Vice-Captain asks, I was resting the whole time.'], steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'harumasa' }],
          scene: [['A', 'Ahh, black. Perfect. You even skipped the sugar.'], ['P', 'You didn\'t want any?'], ['A', 'Never do. Soukaku takes the packets off me anyway. Call it a donation to Section 6.'], ['A', '...Thanks, Manager. Small favours are the best kind. Nobody has to work overtime.']] },
        { title: 'A day off', ask: ['I put in for a day off. Don\'t tell anyone, but it isn\'t for the doctor this time.', 'Come and find me one afternoon. I\'ll be around. Sitting down, most likely.'], steps: [{ t: 'slot', slot: 1, to: 'harumasa' }],
          scene: [['A', 'There you are. Took your time. I almost had to do something.'], ['P', 'You took a whole day off to sit on Sixth Street?'], ['A', 'To sit on Sixth Street with you. ...Too honest? I\'ll blame the medication.'], ['A', 'Holidays, freedom, a good day every day. That\'s the dream. ...Today counts, I think.']] },
        { title: 'Minimum effort', ask: ['Section 6 wants a Hollow checked. The Captain said "thoroughly". I\'m fairly sure she meant "quickly".', 'Take me on an Elite run, Manager. You do the thinking. I\'ll do exactly enough.'], steps: [{ t: 'clear', f: { enc: 'elite', with: 'harumasa' } }, { t: 'talk', to: 'harumasa' }],
          scene: [['A', 'Done, and nobody had to run. Much.'], ['P', 'You were sprinting at the end there.'], ['A', 'That was a brisk walk. A frail man has his limits, y\'know.'], ['A', '...Relax, Manager. It\'d take a lot more than that to finish me off. Same time next week?']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait and intro art: short, messy, layered navy-
     indigo hair with an antenna strand, bangs over a yellow headband tied at
     the back with long ribbon tails, golden eyes, a black choker with an X
     pendant and a stud in his left ear. A white dress shirt, the right sleeve
     rolled up; a charcoal tactical vest with a plate over his left chest (a
     white three-diamond emblem, a teal clip and strap); on his left arm a
     black sleeve with the yellow "56" armband and a black glove, on his right
     a yellow glove with a grey palm and a black wristband. A black belt with
     pouches and mechanical clips; a dark teal jacket tied round his waist,
     hanging behind him like a tail (a white flame logo, "56"); black slacks,
     black sneakers on chunky yellow soles. A long black quiver on his back,
     cyan-tipped arrows standing out of it. The bow: a big recurve, nearly
     his height, whose limbs are silver blades, a black mechanical riser
     trimmed teal, a katana-style wrapped grip below it, a glowing cyan
     string. He holds it lowered in his left hand. 173 cm. */
  {
    const HAIR = 0x3a4055, HAIR2 = 0x252939, HAIRM = 0x464e68, HAIRHI = 0x596176;
    const BAND = 0xf7d852, BAND2 = 0xcfaa4b, SKIN = 0xf5e7d9, EYE = 0xddc897, EYE2 = 0x8a7658, MOUTH = 0xc98a7e;
    const SHIRT = 0xf2f6fb, SHIRT2 = 0xd2e6fd, SHIRT3 = 0x839db0, VEST = 0x2d3233, VEST2 = 0x3a4045, TEAL = 0x26696f, TEALL = 0x42a5b2, WHITE = 0xffffff;
    const SLEEVE = 0x4e4f4c, ARMBAND = 0xe0c665, INK = 0x3a2e14, GLOVE = 0xfbdc5d, PALM = 0xa8aaac, BLACK = 0x1c1f21, BLACK2 = 0x313536, PANTS = 0x24282a, GREY = 0x6a6e76, SILVER = 0xc6c7cc;
    const JACKET = 0x325664, JACKETL = 0x439eaa, JACKETD = 0x1d262a, PRINT = 0x648090, SOLE = 0xecc058, SOLE2 = 0xa3833d;
    const QUIVER = 0x171b20, QUIVER2 = 0x3a4045, SHAFT = 0x2a2e34, BLADE = 0xc6c7cc, BLADEHI = 0xeceef2, BLADED = 0x8e9098;
    MODELS.harumasa = H.humanoid({
      scale: 0.074, height: 28, width: 20,
      sockets: { weapon: ['bow', [0, -2, 3]], tip: ['bow', [0, 2, 15]], off: ['armR', [0, -8, 0]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, PANTS); g.box(-3, 0, -2, 3, 0, 1, BLACK); g.set(0, 0, 2, GREY);   // black slacks, the belt and its buckle
        // the teal jacket tied round his waist: the sleeves round his hips, knotted at the front
        g.box(-3, -1, 2, 3, -1, 2, JACKET); g.box(-4, -1, -2, -4, -1, 1, JACKETD); g.box(4, -1, -2, 4, -1, 1, JACKET); g.box(-4, -1, -3, 4, -1, -3, JACKETD);
        g.box(1, -2, 3, 2, -1, 3, JACKETL); g.set(1, -3, 3, JACKET); g.set(2, -3, 3, JACKETD);   // the knot, a sleeve end
        g.box(2, -1, -4, 3, 0, -4, VEST); g.set(3, -1, -5, GREY);                                // a pouch on the belt behind...
        g.box(-3, -1, -4, -2, 0, -4, VEST2); g.set(-3, 0, -5, TEALL);                            // ...and a mechanical clip
        g.box(4, -2, -1, 4, 0, 0, VEST); g.set(5, -1, 0, TEALL);                                 // the pouch at his left hip
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, SHIRT);                                                        // the white dress shirt
        g.box(-3, 0, -2, -3, 6, 1, SHIRT2); g.box(-2, 0, -2, 3, 1, -2, SHIRT2);                  // its blue-white shade
        g.box(-2, 3, 2, 0, 5, 2, SHIRT); g.set(-1, 4, 2, SHIRT2); g.set(-1, 2, 2, SHIRT3);       // the right breast, a button
        g.box(-3, 3, 2, -3, 6, 2, VEST2); g.box(-3, 6, -2, -3, 6, 1, VEST2);                     // the vest's strap over his right shoulder
        g.box(1, 2, 2, 3, 5, 2, VEST); g.box(1, 3, 3, 3, 5, 3, VEST2);                           // the charcoal plate over his left chest...
        g.set(2, 5, 3, WHITE); g.set(1, 4, 3, WHITE); g.set(3, 4, 3, WHITE);                     // ...its white three-diamond emblem
        g.box(2, 6, 2, 3, 6, 2, VEST); g.set(2, 6, 3, TEALL);                                    // the teal clip on top
        g.set(2, 2, 3, TEAL); g.set(2, 1, 2, TEAL); g.set(2, 0, 2, TEAL);                       // the teal strap hanging from it
        g.box(3, 1, -2, 3, 5, 1, VEST);                                                          // the side panel on his left flank
        g.box(-3, 2, -3, 3, 6, -3, VEST); g.box(-1, 3, -3, 1, 5, -3, VEST2);                     // the vest's back (the quiver rides on it)
        g.box(-1, 6, 2, 0, 6, 2, BLACK); g.set(-2, 6, 2, SHIRT); g.set(1, 6, 2, SHIRT);          // the black choker between the collar points
        g.set(0, 5, 3, SILVER);                                                                  // its X pendant
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: HAIR2, mouth: MOUTH });
        g.set(-1, 2, 3, EYE2); g.set(1, 2, 3, EYE2); g.set(1, 0, 3, MOUTH);                      // golden eyes, darker below; a lopsided smile
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 1], [-3, 2], [-2, 4], [-1, 4], [0, 3], [1, 4], [2, 4], [3, 2], [4, 1]], sideTo: 2 });
        g.box(-4, 5, 4, 4, 5, 4, BAND); g.box(-4, 5, -4, -4, 5, 3, BAND); g.box(4, 5, -4, 4, 5, 3, BAND); g.box(-3, 5, -4, 3, 5, -4, BAND2);   // the yellow headband
        g.box(-1, 4, 5, -1, 6, 5, HAIR); g.set(0, 6, 5, HAIRM); g.box(2, 5, 5, 2, 6, 5, HAIR);  // bangs falling over it
        g.box(-4, -1, 1, -4, 0, 2, HAIR); g.box(4, -1, 1, 4, 0, 2, HAIR);                       // side locks to the jaw
        g.set(4, 2, 0, SKIN); g.set(4, 1, 0, SILVER);                                            // his left ear and its stud
        // messy layered spikes: the crown, flicks over the band at the sides, the nape
        g.set(-3, 8, 0, HAIR); g.set(-2, 8, -2, HAIRM); g.set(2, 8, -1, HAIR); g.set(3, 8, 1, HAIRM); g.set(-1, 8, 2, HAIR);
        g.set(0, 8, 1, HAIR); g.set(0, 9, 0, HAIR); g.set(1, 10, -1, HAIRHI);                   // the antenna strand
        g.set(-5, 6, -1, HAIR); g.set(-5, 4, -2, HAIR2); g.set(5, 6, 0, HAIR); g.set(5, 3, -2, HAIR2); g.set(-5, 7, 1, HAIRM);
        g.box(-3, -1, -4, 3, -1, -4, HAIR2); g.set(-2, -2, -4, HAIR2); g.set(1, -2, -4, HAIR2); g.set(3, -2, -3, HAIR2);
        g.set(-3, 2, -5, HAIR); g.set(0, 4, -5, HAIRM); g.set(2, 1, -5, HAIR2); g.set(-1, 6, -5, HAIR);
        g.set(-2, 7, 2, HAIRHI); g.set(2, 7, 0, HAIRHI); g.set(-1, 7, -2, HAIRM);               // highlights
      },
      armL(g) {   // the bow arm: the vest's shoulder plate, the yellow armband, a black sleeve and glove
        H.arm(g, { sleeve: SLEEVE, sleeveTo: 8, skin: SKIN, glove: BLACK, gloveLen: 2, len: 8 });
        g.box(-1, 0, -1, 1, 1, 1, VEST); g.box(2, 0, -1, 2, 1, 1, VEST2);
        g.box(-1, -1, -1, 1, -1, 1, SHIRT);
        g.box(-1, -2, -1, 1, -2, 1, ARMBAND); g.set(1, -2, 1, INK); g.set(1, -2, -1, INK); g.set(0, -2, 1, INK);   // "56" in black
        g.box(-1, -5, -1, 1, -5, 1, BLACK2);                                                     // the wrist strap
      },
      armR(g) {   // the white sleeve rolled up past the elbow, a bare forearm, the yellow glove
        H.arm(g, { sleeve: SHIRT, sleeveTo: 4, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
        g.box(-1, -3, -1, 1, -3, 1, SHIRT2); g.set(-1, -3, 1, SHIRT3); g.set(0, 0, 1, VEST2);    // the rolled cuff; the vest strap
        g.box(-1, -5, -1, 1, -5, 1, BLACK);                                                      // the black wristband
        g.set(1, -6, 0, PALM); g.set(1, -7, 0, PALM); g.set(1, -7, 1, PALM);                    // the grey palm
      },
      legL(g) { H.leg(g, { pant: PANTS, boot: BLACK, bootH: 2, sole: SOLE }); g.box(-1, -9, -1, 1, -9, -1, SOLE2); g.set(1, -8, 1, SOLE); },
      legR(g) { H.leg(g, { pant: PANTS, boot: BLACK, bootH: 2, sole: SOLE }); g.box(-1, -9, -1, 1, -9, -1, SOLE2); g.set(-1, -8, 1, SOLE); },
      extra: {
        tail: {   // the jacket tied round his waist, its body hanging down behind him (longer on his right)
          parent: 'hips', at: [0, -1, -3], draw(g) {
            for (let y = 0; y >= -9; y--) for (let x = -4; x <= 4; x++) {
              if (y < (x < 0 ? -9 : -6) || (y < -3 && x === 0) || (y < -6 && x === -4)) continue;
              const fold = x === -2 || x === 2, hem = y === (x < 0 ? -9 : -6);
              g.set(x, y, 0, hem ? JACKETD : fold ? JACKETL : JACKET);
            }
            g.set(2, -1, 0, WHITE); g.set(3, -2, 0, WHITE); g.set(2, -2, 0, WHITE); g.set(1, -2, 0, WHITE); g.set(2, -3, 0, WHITE);   // the white flame logo
            g.box(-3, -1, 0, -1, -1, 0, PRINT); g.set(-3, -2, 0, PRINT); g.set(-1, -2, 0, PRINT);                                   // "56"
          },
        },
        tailR: {  // the headband's long ribbon tails, tied at the back
          parent: 'head', at: [1, 5, -5], draw(g) {
            g.box(-1, -1, 0, 0, 0, 0, BAND2);
            for (let i = 0; i < 7; i++) { const s = Math.floor(i / 3); g.set(-1 - s, -1 - i, -s, i % 3 ? BAND : BAND2); g.set(-s, -1 - i, -s, BAND); }
            for (let i = 0; i < 5; i++) g.set(1 + Math.floor(i / 2), -1 - i, -Math.floor(i / 2), BAND2);
          },
        },
        quiver: { // the long black quiver across his back, cyan-tipped arrows standing out of it
          parent: 'torso', at: [-2, 3, -4], rot: [-0.1, 0, 0.35], draw(g) {
            g.box(-1, -6, -1, 1, 7, 0, QUIVER); g.box(-1, -6, -1, -1, 7, -1, QUIVER2); g.box(-1, 7, -1, 1, 7, 0, QUIVER2);
            g.set(0, 1, -1, BAND); g.set(-1, 0, -1, BAND); g.set(1, 0, -1, BAND); g.set(0, -1, -1, BAND); g.set(0, 0, -1, QUIVER);   // the yellow circle logo
            g.set(0, -3, -1, TEALL); g.set(1, -6, -1, TEALL);                                    // teal marks
            for (const [x, z, h] of [[-1, -1, 3], [0, 0, 4], [1, -1, 2], [0, -1, 5]]) { g.box(x, 8, z, x, 7 + h, z, SHAFT); g.set(x, 8 + h, z, G(CYAN)); }
          },
        },
        bow: {    // the bladed recurve, gripped in his left hand: along +Z from the hand, the string on the arm's side (+Y)
          parent: 'armL', at: [0, -7, 0], draw(g) {
            g.box(0, -1, -1, 0, 0, 5, BLACK); g.box(0, -2, 1, 0, -2, 4, BLACK2); g.set(0, -3, 2, BLACK2); g.set(0, -3, 3, TEALL);   // the riser, its sight block
            g.set(1, -1, 2, TEALL); g.set(-1, -1, 2, TEALL); g.set(1, 0, 4, TEALL); g.set(-1, 0, 4, TEALL); g.set(0, 1, 3, GREY);
            g.box(0, -1, 6, 0, 0, 6, TEALL); g.set(0, -2, 6, G(TEALL));                          // the limb clip, a light
            for (let z = -2; z >= -6; z--) { g.set(0, -1, z, (z & 1) ? BLACK : VEST2); g.set(0, 0, z, (z & 1) ? VEST2 : BLACK); }   // the wrapped katana grip
            g.box(0, -2, -7, 0, 1, -7, BLACK2); g.set(1, -1, -7, TEALL); g.set(-1, -1, -7, TEALL); g.set(1, 0, -7, BLACK2); g.set(-1, 0, -7, BLACK2);   // its guard
            // the limbs are blades: the bright edge outward, the spine toward the string, curving back at the tips
            const limb = (z0, n, s, bend) => {
              for (let i = 0; i <= n; i++) {
                const z = z0 + s * i, k = i / n, y = Math.round(bend * k * k);
                g.set(0, y, z, BLADED); g.set(0, y - 1, z, BLADEHI); if (k < 0.45) g.set(0, y - 2, z, BLADE);
              }
              g.set(0, bend - 1, z0 + s * (n + 1), BLADEHI);                                     // the recurve tip flicks forward
            };
            limb(7, 8, 1, 4); limb(-8, 6, -1, 3);
            g.line(0, 5, 15, 0, 4, -14, G(CYAN));                                                // the glowing cyan string
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     His ready stance: the bow low in his left hand, levelled forward. The
     poses below are written as whole stances (rel() turns them into the
     change from the ready stance); keys() blends a timeline of them. The
     bow lies along his hand's forward axis: a lowered arm levels it, an arm
     raised straight ahead stands it up for a shot. */
  const RB = ANIM.READY.bow = { armL: [-0.2, 0, 0.15], armR: [-0.1, 0, -0.18], torso: [0.04, -0.12, 0], head: [0, 0.12, 0], legL: [-0.18, 0, 0.07], legR: [0.15, 0, -0.07], hipsY: -0.02 };
  const rel = P => { const o = {}; for (const k in P) o[k] = Array.isArray(P[k]) ? P[k].map((v, i) => v - (RB[k] ? RB[k][i] : 0)) : P[k] - (k === 'hipsY' ? RB.hipsY : 0); return o; };
  const ov = (P, o) => Object.assign({}, P, o);
  const keys = (b, t, KS) => {
    let i = 0; while (i < KS.length - 1 && t >= KS[i + 1][0]) i++;
    const [t0, P0] = KS[i], [t1, P1] = KS[Math.min(i + 1, KS.length - 1)];
    return mix(add(b, rel(P0)), add(b, rel(P1)), t1 > t0 ? U.ease(clamp((t - t0) / (t1 - t0), 0, 1)) : 1);
  };
  // the archer's stance: left shoulder to the target, bow arm straight out, the right hand drawing to his chest
  const DRAW = { armL: [-1.55, 0, 0.8], armR: [-1.45, 0, 1.25], torso: [0.02, -0.8, 0], head: [0, 0.72, 0], legL: [-0.35, 0, 0.2], legR: [0.3, 0, -0.2], hipsY: -0.07 };
  const LOOSE = ov(DRAW, { armR: [-1.3, 0, 0.35], torso: [-0.06, -0.86, 0] });
  const SKY = ov(DRAW, { armL: [-2.35, 0, 0.8], armR: [-2.2, 0, 1.25], torso: [-0.25, -0.8, 0], head: [-0.45, 0.72, 0] });
  const RUSH = { armL: [0.55, 0, 0.35], armR: [0.4, 0, -0.3], torso: [0.5, 0.1, 0], head: [-0.25, 0, 0], legL: [-1.05, 0, 0.05], legR: [0.75, 0, -0.05], hipsY: -0.16 };
  const LANDLOW = { armL: [-1.0, 1.35, 0.25], armR: [0.25, 0, -0.7], torso: [0.42, 0.2, 0], head: [-0.25, -0.15, 0], legL: [-1.35, 0, 0.38], legR: [0.95, 0, -0.38], hipsY: -0.4 };
  const TUCK = { armL: [-1.5, 0, 0.6], armR: [-1.4, 0, 1.1], torso: [0.25, -0.5, 0], head: [-0.3, 0.4, 0], legL: [-1.6, 0, 0.2], legR: [-1.4, 0, -0.2] };
  // the blade swings of his string: forehand (his left to right), backhand
  const SWA = [{ armL: [-1.7, 0, 1.4], armR: [-0.3, 0, -0.3], torso: [0, 0.55, 0] }, { armL: [-1.35, 0, -0.45], armR: [-0.2, 0, -0.5], torso: [0.12, -0.55, 0], legL: [-0.55, 0, 0.1], legR: [0.35, 0, -0.1] }];
  const SWB = [{ armL: [-1.3, 0, -0.6], torso: [0.05, -0.6, 0] }, { armL: [-1.6, 0, 1.4], torso: [0.1, 0.55, 0], legR: [-0.55, 0, -0.1], legL: [0.35, 0, 0.1] }];
  ACT.hmSwing1 = (b, t, th, d) => stage(b, rel(SWA[0]), rel(SWA[1]), t, th, d);
  ACT.hmSwing2 = (b, t, th, d) => stage(b, rel(SWB[0]), rel(SWB[1]), t, th, d);
  ACT.hmSwing3 = (b, t, th, d) => add(stage(b, rel({ armL: [-0.7, 0, 1.2], legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1], hipsY: -0.12 }), rel({ armL: [-1.5, 0, 1.45], torso: [-0.1, 0, 0], lift: 0.12 }), t, th, d), { spin: clamp(t / (th + 0.08), 0, 1) * PI * 2 });
  ACT.hmBraced = (b, t, th, d) => stage(b, rel(DRAW), rel(LOOSE), t, th, d);
  ACT.hmLunge = (b, t, th, d) => stage(b, rel(ov(DRAW, { legL: [0.2, 0, 0.1], legR: [-0.3, 0, -0.1] })), rel(ov(LOOSE, { legL: [-1.05, 0, 0.12], legR: [0.75, 0, -0.12], torso: [0.25, -0.85, 0], hipsY: -0.16 })), t, th, d);
  // the 5th hit: down in a crouch, a blast from the bow at point-blank range
  ACT.hmCrouchShot = (b, t, th, d) => stage(b, rel(ov(DRAW, { armL: [-1.35, 0, 0.8], torso: [0.35, -0.8, 0], legL: [-1.2, 0, 0.3], legR: [0.9, 0, -0.3], hipsY: -0.3 })), rel(ov(LOOSE, { armL: [-1.3, 0, 0.8], torso: [0.25, -0.86, 0], legL: [-1.25, 0, 0.3], legR: [0.95, 0, -0.3], hipsY: -0.34 })), t, th, d);
  ACT.hmDrift = (b, t, th, d) => add(ACT.hmBraced(b, t, th, d), { legL: [-0.5, 0, 0.2], legR: [-0.2, 0, -0.2] });
  // Falling Feather, aimed: the string drawn back slowly, then loosed
  ACT.hmAimShot = (b, t, th, d) => t < th ? add(b, rel(ov(DRAW, { armR: [-1.45, 0, 0.8 + 0.45 * U.easeOut(clamp(t / th, 0, 1))] })))
    : mix(add(b, rel(LOOSE)), b, U.ease(clamp((t - th - 0.15) / Math.max(0.05, d - th - 0.15), 0, 1)));
  // a backflip, firing upside down at its top, landing in a low slide with the bow flat. The flip ends at `end`, where
  // the move's hmUnflip event turns the body's pitch back by a whole turn (so it does not unwind)
  const flip = end => (b, t, th, d) => t < end ? add(b, rel(ov(TUCK, { tilt: -clamp(t / (end - 0.06), 0, 1) * PI * 2 }))) : keys(b, t, [[end, LANDLOW], [end + 0.1, LANDLOW], [d, {}]]);
  ACT.hmFlipShot = flip(0.36);     // Falling Feather, quick
  ACT.hmBackflip = flip(0.34);     // Nowhere to Hide
  ACT.hmThrust = (b, t, th, d) => stage(b, rel({ armL: [0.3, 0, 0.25], torso: [0, 0.45, 0], legR: [0.4, 0, 0] }), rel({ armL: [-0.55, 0, 0.08], armR: [0.3, 0, -0.4], torso: [0.3, -0.35, 0], legL: [-1.05, 0, 0], legR: [0.7, 0, 0], hipsY: -0.15 }), t, th, d);
  ACT.hmDashThrust = (b, t, th, d) => t < th - 0.04 ? add(b, rel(RUSH)) : add(ACT.hmThrust(b, th + 0.04, th, d), { armL: [Math.sin(t * 42) * 0.3, 0, 0] });
  // the Slash: the rush in with the blade swept back, an X of two strokes, down in a crouch
  const CUT = [
    { armL: [-2.7, 0, 1.0], torso: [-0.05, 0.45, 0], legL: [-0.7, 0, 0.1], legR: [0.5, 0, -0.1], hipsY: -0.1 },
    { armL: [-0.55, 0, -0.65], torso: [0.3, -0.5, 0], legL: [-0.8, 0, 0.1], legR: [0.55, 0, -0.1], hipsY: -0.14 },
    { armL: [-2.6, 0, -0.45], torso: [-0.05, -0.45, 0], legL: [-0.7, 0, 0.1], legR: [0.5, 0, -0.1], hipsY: -0.1 },
    { armL: [-0.6, 0, 1.25], torso: [0.3, 0.5, 0], legL: [-0.8, 0, 0.1], legR: [0.55, 0, -0.1], hipsY: -0.14 },
  ];
  ACT.hmSlash = (b, t) => keys(b, t, [[0, RUSH], [0.17, RUSH], [0.2, CUT[0]], [0.25, CUT[1]], [0.27, CUT[2]], [0.32, CUT[3]], [0.4, LANDLOW], [0.52, LANDLOW], [0.62, {}]]);
  // Nowhere to Run: a flurry of thrown daggers, then the enhanced arrow
  ACT.hmEx = (b, t, th, d) => t < 0.45 ? add(b, rel({ armR: [-1.8 + Math.sin(t * 38) * 0.6, 0, 0.2 + Math.cos(t * 38) * 0.3], armL: [-0.4, 0, 0.3], torso: [0.1, Math.sin(t * 19) * 0.25 - 0.1, 0], legL: [-0.4, 0, 0.1], legR: [0.35, 0, -0.1], hipsY: -0.06 }))
    : ACT.hmAimShot(b, t - 0.45, 0.37, d - 0.45);
  // Kai - Hanare: a sweeping dash and cut, a step back, the bow raised to the sky, loosed
  ACT.hmChain = (b, t) => keys(b, t, [[0, RUSH], [0.22, RUSH], [0.28, SWA[0]], [0.34, SWA[1]], [0.5, SWA[1]], [0.62, ov(SKY, { armR: [-2.2, 0, 0.8] })], [0.98, SKY], [1.03, ov(SKY, { armR: [-2.0, 0, 0.35] })], [1.25, ov(SKY, { armR: [-2.0, 0, 0.35] })], [1.4, {}]]);
  // Zanshin: arrows from the quiver, the full draw crackling, the shot, down in the field it leaves
  ACT.hmUlt = (b, t) => add(keys(b, t, [[0, {}], [0.15, { armR: [-2.9, 0, -0.45], armL: [-0.5, 0, 0.4], torso: [-0.1, 0.25, 0], head: [-0.2, 0.2, 0] }], [0.5, { armR: [-2.9, 0, -0.45], armL: [-0.5, 0, 0.4], torso: [-0.1, 0.25, 0] }], [0.75, DRAW],
    [1.45, ov(DRAW, { armR: [-1.45, 0, 1.4], torso: [0, -0.85, 0], legL: [-0.5, 0, 0.25], legR: [0.45, 0, -0.25], hipsY: -0.12 })], [1.52, ov(LOOSE, { torso: [-0.2, -0.9, 0], hipsY: -0.1 })], [1.75, LANDLOW], [2.1, LANDLOW], [2.3, {}]]),
  { roll: t > 0.75 && t < 1.45 ? Math.sin(t * 45) * 0.012 : 0 });
  // Yugamae - Slash: forehand, backhand, a spinning cut, down low
  ACT.hmFollow = (b, t, th, d) => t < 0.55 ? keys(b, t, [[0, RUSH], [0.16, SWA[0]], [0.25, SWA[1]], [0.4, SWB[0]], [0.5, SWB[1]]])
    : t < 0.8 ? add(b, rel({ armL: [-1.5, 0, 1.45], legL: [-0.5, 0, 0.15], legR: [0.4, 0, -0.15], hipsY: -0.1, spin: clamp((t - 0.58) / 0.2, 0, 1) * PI * 2 }))
      : keys(b, t, [[0.8, LANDLOW], [0.95, LANDLOW], [d, {}]]);
  // Yugamae: the bow held level across his front, the blades to meet the blow
  ACT.hmGuard = b => add(b, rel({ armL: [-1.35, 1.5, 0.1], armR: [-1.2, -0.5, 0.5], torso: [0.15, 0, 0], legL: [-0.45, 0, 0.12], legR: [0.4, 0, -0.12], hipsY: -0.1 }));

  /* ------------------------------------------------------------- effects --
     hmArrow: an arrow's streak from the bow (bolt: lightning trailing it;
     hot: the orange flash where it lands). hmFlash: the point-blank blast.
     hmCut / hmStar: the Slash's crossing strokes and its pink star flare.
     hmDagger, hmPillars, hmSkyShot, hmBurst: the EX and the Chain Attack.
     hmRings, hmBlast, hmField: the Ultimate. hmDraw (stream): light
     gathering on the bow as he draws. hmUnflip: see flip() above. */
  const _m = new THREE.Vector3(), _n = new THREE.Vector3();
  const bowAt = a => { BT.sock(a, 'weapon', _m); if (_m.y < 0.4) _m.y = 1.0; return _m; };
  const at = (a, A, tgt, d) => tgt ? [tgt.x, tgt.z] : [a.x + Math.sin(A.dir) * (d || 2), a.z + Math.cos(A.dir) * (d || 2)];
  const zig = (p0, p1, col, w, life, n, amp) => { let p = p0.clone(); for (let i = 1; i <= n; i++) { const q = p0.clone().lerp(p1, i / n); if (i < n) { q.x += rnd(-amp, amp); q.y += rnd(-amp, amp) * 0.6; q.z += rnd(-amp, amp); } FX.beam(p, q, col, w, life); p = q; } };
  const shake = s => { BT.B.cam.shake = Math.max(BT.B.cam.shake, s); };
  const E = CHOREO.events, S = CHOREO.streams;
  E.hmArrow = (a, A, e, tgt) => {
    const m = bowAt(a).clone(), dir = A.dir, L = e.len || 7, w = e.big ? 1.9 : 1, col = e.col || EL;
    const end = new THREE.Vector3(m.x + Math.sin(dir) * L, 0.95, m.z + Math.cos(dir) * L);
    FX.glow(m.x, m.y, m.z, 1.0 * w, 0xffffff, 0.1, { size1: 1.8 * w }); FX.glow(m.x, m.y, m.z, 1.4 * w, col, 0.16);
    FX.beam(m, end, col, 0.13 * w, 0.24); FX.beam(m, end, 0xffffff, 0.05 * w, 0.18);
    if (e.bolt) for (let i = 0; i < 2; i++) zig(m, end, i ? EL2 : col, 0.05, 0.22, 7, 0.28);
    const [hx, hz] = tgt && U.dist(a, tgt) <= L + tgt.rad ? [tgt.x, tgt.z] : [end.x, end.z];
    FX.burst(hx, 1.0, hz, 14 * w, { col: [0xffffff, EL2, e.hot ? ORANGE : col], speed: 6, size: 0.1, life: 0.35, g: 2 });
    FX.glow(hx, 1.0, hz, 1.3 * w, e.hot ? ORANGE : col, 0.2, { size1: 2.4 * w });
    shake(0.05 * w); SFX.play(e.big ? 'boom' : 'shot');
  };
  E.hmFlash = (a, A, e) => {
    const m = bowAt(a).clone(), dir = A.dir, k = e.small ? 0.6 : 1;
    FX.glow(m.x, m.y, m.z, 2.2 * k, 0xffffff, 0.12, { size1: 3.2 * k }); FX.glow(m.x, m.y, m.z, 2.8 * k, EL, 0.22, { size1: 4 * k });
    for (let i = 0; i < 34 * k; i++) { const a2 = dir + rnd(-0.45, 0.45), sp = rnd(8, 13); FX.p({ x: m.x, y: m.y, z: m.z, vx: Math.sin(a2) * sp, vy: rnd(-0.6, 0.8), vz: Math.cos(a2) * sp, drag: 2.4, life: 0.3, size: 0.12, size1: 0.02, col: U.pick([EL, EL2, 0xffffff]) }); }
    shake(0.14 * k); SFX.play('boom');
  };
  E.hmCut = (a, A, e, tgt) => {
    const dir = A.dir, r = tgt ? clamp(U.dist(a, tgt), 1.2, 2.6) : 2, s = e.s || 1, y = 1.1 + (a.airY || 0);
    FX.slash(a.x, y, a.z, r + 0.3, dir, EL, { tilt: 0.95 * s, arc: 2.2, width: 0.5, life: 0.3, sweep: 1.8 * s });
    FX.slash(a.x, y, a.z, r + 0.15, dir, 0xffffff, { tilt: 0.95 * s, arc: 2.0, width: 0.18, life: 0.24, sweep: 1.8 * s });
    const [x, z] = at(a, A, tgt); FX.burst(x, 1.1, z, 12, { col: [0xffffff, EL2, EL], speed: 6, size: 0.08, life: 0.3, g: 2 });
    SFX.play('swing');
  };
  E.hmStar = (a, A, e, tgt) => {
    const [x, z] = at(a, A, tgt), y = tgt ? Math.min(1.6, tgt.height * 0.55) : 1.1, yaw = BT.B.cam.yaw || 0, rx = Math.cos(yaw), rz = -Math.sin(yaw);
    for (const [c, w] of [[PINK, 0.12], [0xffffff, 0.04]]) {
      FX.beam(new THREE.Vector3(x - rx * 1.5, y, z - rz * 1.5), new THREE.Vector3(x + rx * 1.5, y, z + rz * 1.5), c, w, 0.3);
      FX.beam(new THREE.Vector3(x, y - 1.3, z), new THREE.Vector3(x, y + 1.3, z), c, w, 0.3);
    }
    FX.glow(x, y, z, 1.4, PINK, 0.3, { size1: 2.6 }); FX.glow(x, y, z, 1.0, 0xffffff, 0.18, { size1: 1.8 });
    FX.burst(x, y, z, 18, { col: [0xffffff, PINK, EL2], speed: 7, size: 0.09, life: 0.4, g: 1 });
    shake(0.16); SFX.play('heavy');
  };
  E.hmDagger = (a, A, e, tgt) => {
    BT.sock(a, 'off', _n); const p0 = _n.clone(), dir = A.dir + rnd(-0.25, 0.25), L = tgt ? Math.min(6, U.dist(a, tgt)) : 5;
    const p1 = new THREE.Vector3(a.x + Math.sin(dir) * L, 1.0, a.z + Math.cos(dir) * L);
    FX.beam(p0, p1, EL2, 0.06, 0.16); FX.beam(p0, p1, 0xffffff, 0.025, 0.12); FX.burst(p1.x, 1.0, p1.z, 8, { col: [0xffffff, EL], speed: 4, size: 0.07, life: 0.25 });
    SFX.play('swing');
  };
  E.hmPillars = (a, A, e, tgt) => {
    const [x, z] = at(a, A, tgt, 3), r = e.r || 2.2;
    for (let i = 0; i < 5; i++) {
      const an = i / 5 * PI * 2 + rnd(-0.3, 0.3), px = x + Math.cos(an) * r, pz = z + Math.sin(an) * r;
      FX.pillar(px, pz, 0.14, 6, EL, 0.55); zig(new THREE.Vector3(px, 7, pz), new THREE.Vector3(px, 0.1, pz), i % 2 ? EL2 : 0xffffff, 0.06, 0.3, 5, 0.25);
    }
    FX.ring(x, z, 0.4, r + 0.4, EL, 0.5); SFX.play('ether');
  };
  E.hmSkyShot = a => { const m = bowAt(a).clone(), top = new THREE.Vector3(m.x, 10, m.z); FX.beam(m, top, EL2, 0.16, 0.3); FX.beam(m, top, 0xffffff, 0.06, 0.24); FX.glow(m.x, m.y, m.z, 1.4, EL, 0.2); SFX.play('shot'); };
  E.hmBurst = (a, A, e, tgt) => {
    const [x, z] = at(a, A, tgt, 3), r = e.r || 3, c = new THREE.Vector3(x, 1.2, z);
    for (let i = 0; i < 6; i++) { const an = rnd(0, PI * 2), d = rnd(1, r); zig(c, new THREE.Vector3(x + Math.cos(an) * d, rnd(0.2, 2.2), z + Math.sin(an) * d), i % 2 ? PINK : 0xffb0ec, 0.07, 0.3, 4, 0.3); }
    FX.glow(x, 1.2, z, r, PINK, 0.25, { size1: r * 1.6 }); FX.named('bolt', { x, z, r });
    FX.ring(x, z, 0.4, r, EL, 0.45); FX.ring(x, z, 0.3, r * 0.65, PINK, 0.4);
    shake(0.35); SFX.play('boom');
  };
  E.hmRings = a => { for (let i = 0; i < 3; i++) FX.ring(a.x, a.z, 0.3, 1.2 + i * 0.35, i % 2 ? CYAN : EL, 0.5, { y: 0.6 + i * 0.45, a: 0.7 }); const m = bowAt(a); FX.glow(m.x, m.y, m.z, 1.6, CYAN, 0.35, { size1: 2.4 }); SFX.play('ether'); };
  E.hmBlast = (a, A, e) => {
    const m = bowAt(a).clone(), dir = A.dir, L = e.len || 12, end = new THREE.Vector3(m.x + Math.sin(dir) * L, 1.0, m.z + Math.cos(dir) * L);
    FX.beam(m, end, EL, 1.1, 0.5); FX.beam(m, end, EL2, 0.6, 0.45); FX.beam(m, end, 0xffffff, 0.26, 0.4);
    for (let i = 0; i < 3; i++) zig(m, end, i ? EL2 : 0xffffff, 0.07, 0.4, 9, 0.6);
    for (let i = 0; i < 80; i++) { const d = rnd(0.5, L); FX.p({ x: m.x + Math.sin(dir) * d + rnd(-0.6, 0.6), y: 1 + rnd(-0.6, 0.6), z: m.z + Math.cos(dir) * d + rnd(-0.6, 0.6), vx: rnd(-1.5, 1.5), vy: rnd(-0.5, 2), vz: rnd(-1.5, 1.5), life: rnd(0.3, 0.7), size: 0.14, size1: 0.02, col: U.pick([0xffffff, EL, EL2, CYAN]) }); }
    FX.glow(m.x, m.y, m.z, 4, 0xffffff, 0.25, { size1: 6 }); FX.glow(end.x, 1, end.z, 3, EL, 0.4, { size1: 5 });
    shake(0.5); SFX.play('boom');
  };
  E.hmField = (a, A, e) => { const r = e.r || 3; FX.zone(a.x, a.z, r, EL, 0.9); FX.ring(a.x, a.z, 0.4, r, EL2, 0.5); FX.burst(a.x, 0.3, a.z, 24, { col: [EL, EL2, 0xffffff], speed: 4, size: 0.08, life: 0.5, g: -1, flat: true }); };
  E.hmUnflip = a => { const R = a.body && a.body.rotation; if (R && R.x < -PI) R.x += PI * 2; };
  S.hmDraw = (a, A, s, dt) => {
    const m = bowAt(a), n = Math.max(1, Math.round(dt * 70)), T = 0.22;
    for (let i = 0; i < n; i++) { const an = rnd(0, PI * 2), r = rnd(0.7, 1.3), ox = Math.cos(an) * r, oy = rnd(-0.6, 0.6) * r, oz = Math.sin(an) * r; FX.p({ x: m.x + ox, y: m.y + oy, z: m.z + oz, vx: -ox / T, vy: -oy / T, vz: -oz / T, life: T, size: 0.08, size1: 0.02, col: U.pick([CYAN, EL2, 0xffffff]) }); }
    if (Math.random() < 0.3) FX.glow(m.x, m.y, m.z, 0.6, CYAN, 0.08);
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const arrow = (t, o) => Object.assign({ t, fx: 'hmArrow' }, o || {});
  // Cloud Piercer: three swings of the bladed bow leaving orange-white trails, a lunging shot's long streak, a crouched
  // point-blank flash (the official skill clip)
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.5 }], events: [{ t: 0.15, fx: 'crescent', y: 1.0, tilt: -0.35, r: 2.1, arc: 2.6, col: TR, sweep: -1.2 }] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.4 }], events: [{ t: 0.16, fx: 'crescent', y: 1.1, tilt: 0.45, r: 2.0, arc: 2.6, col: TR, sweep: 1.2 }] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.22, kind: 'fwd', d: 0.5 }], events: [{ t: 0.22, fx: 'crescent', y: 0.9, tilt: 0.1, r: 2.2, arc: 5.8, col: TR, sweep: 2.8 }, { t: 0.22, fx: 'sparkBurst' }] });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.2, kind: 'fwd', d: 0.9 }], stream: [{ t0: 0.04, t1: 0.2, kind: 'afterimage', col: EL }], events: [arrow(0.22, { len: 6 })] });
  set(K.basic[4], { motion: [{ t0: 0.04, t1: 0.22, kind: 'fwd', d: 0.6 }], events: [{ t: 0.28, fx: 'hmFlash' }] });
  set(K.drift, { motion: [{ t0: 0, t1: 0.3, kind: 'side', d: 1.5, side: 'auto' }, { t0: 0, t1: 0.3, kind: 'leap', h: 0.45, d: 0 }], events: [arrow(0.2, { len: 6.5, col: TR })] });
  // Falling Feather: the quick one an inverted flip trailing lightning, the aimed one a long draw and an orange flash
  set(K.ffQuick, { motion: [{ t0: 0, t1: 0.36, kind: 'leap', h: 1.1, d: 0 }], stream: [{ t0: 0.05, t1: 0.36, kind: 'spark' }], events: [arrow(0.15, { len: 8.5, bolt: true }), { t: 0.36, fx: 'hmUnflip' }] });
  set(K.ffAim, { stream: [{ t0: 0.08, t1: 0.52, kind: 'hmDraw' }], events: [arrow(0.55, { len: 9.5, bolt: true, hot: true, big: true })] });
  set(K.haoto, { events: [arrow(0.05, { len: 8, col: CYAN })] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: 0xb8c8e0 }], events: [0.24, 0.31, 0.38].map(t => ({ t, fx: 'thrustLine', col: TR, len: 3.2 })) });
  // the Slash: a dash to the X-Marked enemy, two crossing blue-white strokes, the pink star flare, down in a crouch
  for (const def of SLASH) set(def, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 0.7 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: EL }, { t0: 0, t1: 0.22, kind: 'spark' }], events: [{ t: 0.24, fx: 'hmCut', s: 1 }, { t: 0.3, fx: 'hmCut', s: -1 }, { t: 0.38, fx: 'hmStar' }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.1, side: 'auto' }, { t0: 0.1, t1: 0.2, kind: 'fwd', d: 1.2 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: EL }], events: [{ t: 0.2, fx: 'thrustLine', col: EL2, len: 5 }, { t: 0.2, fx: 'hmFlash', small: true }] });
  // Nowhere to Hide: the backflip shot, the low slide
  set(K.special, { motion: [{ t0: 0, t1: 0.34, kind: 'leap', h: 1.0, d: -1.0 }, { t0: 0.34, t1: 0.52, kind: 'back', d: 0.6 }], stream: [{ t0: 0.34, t1: 0.52, kind: 'dust' }], events: [arrow(0.15, { len: 7 }), { t: 0.34, fx: 'hmUnflip' }] });
  set(K.ex, { motion: [{ t0: 0.82, t1: 1.0, kind: 'back', d: 0.7 }], stream: [{ t0: 0.46, t1: 0.8, kind: 'hmDraw' }], events: [0.24, 0.32, 0.4].map(t => ({ t, fx: 'hmDagger' })).concat([arrow(0.82, { len: 9, big: true, bolt: true })]) });
  // Kai - Hanare: a lightning-wrapped sweep round the target, lightning pillars round it, the skyward shot, the burst
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'orbit', ang: 1.1, gap: 1.6, side: 'auto' }, { t0: 0.45, t1: 0.65, kind: 'back', d: 1.2 }],
    stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: EL }, { t0: 0, t1: 0.3, kind: 'spark' }, { t0: 0.6, t1: 1.0, kind: 'hmDraw' }],
    events: [{ t: 0.32, fx: 'crescent', y: 1.0, tilt: 0.05, r: 2.8, arc: 3.4, col: EL2, sweep: 2.0 }, { t: 0.7, fx: 'hmPillars', r: 2.2 }, { t: 1.0, fx: 'hmSkyShot' }, { t: 1.05, fx: 'hmBurst', r: 3.2 }, { t: 1.05, fx: 'whiteFlash' }] });
  // Zanshin: blue rings, the long crackling draw, the great white-blue blast, the field it leaves
  set(K.ult, { track: 1.5, motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.0 }, { t0: 1.5, t1: 1.7, kind: 'back', d: 0.6 }],
    stream: [{ t0: 0.75, t1: 1.45, kind: 'hmDraw' }, { t0: 0.75, t1: 1.45, kind: 'spark' }, { t0: 0.8, t1: 1.45, kind: 'sparkRing', r: 1.8 }],
    events: [{ t: 0.3, fx: 'hmRings' }, { t: 0.75, fx: 'hmRings' }, { t: 1.5, fx: 'hmBlast', len: 12 }, { t: 1.5, fx: 'whiteFlash' }, { t: 1.62, fx: 'hmField', r: 3.2 }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: EL }],
    events: [{ t: 0.25, fx: 'crescent', y: 1.0, tilt: -0.35, r: 2.4, arc: 2.8, col: EL2, sweep: -1.4 }, { t: 0.5, fx: 'crescent', y: 1.1, tilt: 0.45, r: 2.4, arc: 2.8, col: EL, sweep: 1.4 }, { t: 0.78, fx: 'crescent', y: 0.9, tilt: 0, r: 2.8, arc: 6.0, col: EL2, sweep: 2.8 }, { t: 0.78, fx: 'boltAt' }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 3.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: EL }], events: [arrow(0.26, { len: 7, bolt: true })] });
})();
