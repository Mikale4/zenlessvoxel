/* ============================================================================
   agents/seed.js -- Seed (Flora), the heavy weapons specialist of Obol Squad
   (New Eridu Defense Force, Obsidian Division), and Seed Sr., the combat mech
   that raised her and left her his codename. S-Rank, Electric, Attack,
   Defensive Assist. Released in Version 2.2.

   (An Agent in her own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)
   Numbers: skill names, inputs and mechanics are the official game's.
   Multipliers are the official level-12 values scaled to this game's tuning:
   DMG x0.45, Daze x0.6; Anomaly Buildup as datamined (/100). Which hits are
   heavy is not listed by any source: the game's usual rule (string finishers,
   counters, EX, Chain, Ultimate, assist follow-ups) decides; Slaughter, a
   charged Basic, and Downfall's smash count as finishers.

   Sources: Zenless Zone Zero Wiki (Seed, Lore, Dialogue, DMs, Voice-Overs,
   Media, Seed Sr., Obol Squad), zzz.gachabase.net (datamine, agent 1461,
   game data 3.4.2 beta), Prydwen (kit guide), Game8, the official portrait,
   in-game models and Agent Intro / Gameplay Details graphics and clips.

   Her kit (official):
     Basic Attack: Chrysanthemum Wheel Dance   up to 4 attacks: her steel wheel
                                     (1-2, Physical), then her floating turrets
                                     (3-4, Electric). Attacked as she backs off
                                     after the 3rd (until the 4th), she dodges
                                     on her own.
     Basic Attack: Falling Petals - Slaughter   Basic after her 4th hit, Dodge
                                     Counter, Quick Assist or Assist Follow-Up:
                                     she switches to the mech, Seed Sr., for a
                                     charged punch. At 120 Steel Charge, once:
                                     hold Basic for it anywhere.
     Basic Attack: Falling Petals - Downfall    after Slaughter or her Ultimate,
                                     with 120 Steel Charge: Basic. 60 for the
                                     First Form (sweeping shots), 60 more for
                                     the Second (a jumping smash).
     Dash Attack: Magnetic Wheel Dance (Physical)   Dodge Counter: Blossom Burst
     Special Attack: Withered in Frost  a wheel thrown on a curved path.
     EX Special Attack: Raining Iron Petals   10 Energy, then 5 a volley while
                                     you hold it: she flies on the mech's back
                                     (the stick moves her), firing missiles. Let
                                     go: Raining Iron Petals - Away (cannon
                                     fire). 60 Energy in one flight: Slaughter.
     Chain Attack: Tempest of Frosty Petals (she lands in the mech's arms)
     Ultimate: Clockwork Garden - Bloom! (she pilots it; +60 Steel Charge)
     Quick Assist: Barrage of Raining Flowers   Defensive Assist: Sprouting Barrier
     Assist Follow-Up: Crimson Core Burst
     Core Passive: Flower Chain Protocol   the Attack teammate with the highest
                                     ATK is her Vanguard. The Vanguard's EX:
                                     Seed gains Onslaught; Seed's EX: the
                                     Vanguard gains Direct Strike (each +1000
                                     ATK, +30% CRIT DMG, 40 s); both at once:
                                     Besiege, +25% DMG for both. Each Energy
                                     point spent (hers, or the Vanguard's on
                                     the field): 0.5 Steel Charge.
     Additional Ability: Surprise Strike   with another Attack Agent: her hits on
                                     the field give the Vanguard 2 Energy (once
                                     a second); Slaughter, Downfall and her
                                     Ultimate deal 30% more DMG and ignore 25%
                                     Electric RES.
   Not documented anywhere (our choices, marked below): the Steel Charge each
   hit gives, how fast the EX spends its 5s (a volley every 0.22 s), how long
   Slaughter and Downfall wait for your Basic, how the multi-part multipliers
   split over their hits.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd, ang, lerp } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // Steel Charge (official): the cap, the start, the mark for Downfall and the quick Slaughter; Downfall takes 60 per Form
  const S_MAX = 150, S_START = 60, S_GATE = 120, DF_COST = 60;
  const SL_WIN = 1.0, DF_WIN = 1.2;                   // seconds after the move for your Basic (our choice)
  // Flower Chain Protocol at its top level (official). The ATK is flat, as in the game: this game's ATK is a built Agent's
  const VG_ATK = 1000, VG_CD = 0.3, BESIEGE = 0.25, VG_T = 40;
  const SS_DMG = 0.3, SS_RES = 0.25, SS_EN = 2;       // Surprise Strike
  // the EX: 10 Energy to take off, 5 for each volley after (official); a volley every 0.22 s (our choice); 60 in one flight
  const EX_COST = 10, EX_TICK = 5, EX_FULL = 60, EX_T = [0.3, 0.52, 0.74, 0.96, 1.18, 1.4, 1.62, 1.84, 2.06, 2.28, 2.5], EX_DUR = 2.75, FLY = 4.2;
  const DF1_T = [0.3, 0.45, 0.6, 0.75, 0.9], DF2_T = 1.1, DF2_HIT = 1.8;    // Downfall: the sweeping shots, the Second Form, its smash
  const AWAY_T = [0.12, 0.22, 0.32, 0.42], CH_T = [0.5, 0.68, 0.86], CH_HIT = 1.25;
  const ULT_M = [0.5, 0.68, 0.86, 1.04], ULT_R = [1.35, 1.5, 1.65, 1.8], ULT_LEAP = 1.95, ULT_HIT = 2.55;
  const B3_BACK = 0.24;                               // her 3rd hit's retreat begins: from here to her 4th hit she dodges on her own
  const ELEC = [0xffffff, 0xd0f0ff, 0x5ec8ff, 0x9ad8ff], HOLO = 0x8fd8ff, LASER = 0xffb8e0, MISS = [0xfff0c0, 0xffc060, 0xffffff];

  /* ----------------------------------------------------------------- kit --
     sc: the Steel Charge a hit gives (not published anywhere: our choice, after Prydwen: her 4th Basic hit, EX, Chain
     Attack and Assist Follow-Up give the most; a Mobalytics table has ~3 and ~8 for the first two hits). Slaughter,
     Downfall, Away and the Ultimate give none on hit (official). sdMech: the move is the mech's (MODELS.seedSr): 'pilot'
     (she is inside), 'rider' (on its back), 'held' (in its arms). sdBig: Surprise Strike's moves. */
  const BA = 'Basic Attack: Chrysanthemum Wheel Dance';
  const PHYS = o => Object.assign({ attr: 'physical' }, o);
  const K = {
    basic: [
      { name: BA, anim: 'sdThrow', dur: 0.46, cancel: 0.34, reach: 4.5, range: 3, hits: [hit(0.2, 93.8, 44.8, 0, PHYS({ shape: 'line', r: 0.9, len: 5, sc: 3 }))] },
      // the wheel out and back (one official multiplier, split evenly: our choice)
      { name: BA, anim: 'sdThrow2', dur: 0.62, cancel: 0.48, reach: 4.5, range: 3, hits: [0.22, 0.42].map(t => hit(t, 248.4 / 2, 124.7 / 2, 0, PHYS({ shape: 'line', r: 0.9, len: 5, sc: 4 }))) },
      { name: BA, anim: 'sdRetreat', dur: 0.72, cancel: 0.54, reach: 5.5, range: 3.5, hits: [hit(0.22, 144.4, 67.7, 40.53, { shape: 'line', r: 1.0, len: 6.5, sc: 10 })] },
      { name: BA, anim: 'sdCommand', dur: 0.86, cancel: 0.66, reach: 6, range: 3.5, hits: [hit(0.36, 717.2, 339.8, 205.83, { heavy: true, shape: 'line', r: 1.3, len: 7, kb: 0.9, sc: 30 })] },
    ],
    slaughter: { name: 'Basic Attack: Falling Petals - Slaughter', anim: 'srPunch', dur: 1.05, cancel: 0.86, reach: 3.2, range: 2.2, inv: [0, 1.05], sdMech: 'pilot', sdBig: true,
      hits: [hit(0.55, 333.8, 217.4, 131.63, { heavy: true, shape: 'arc', r: 4, arc: 80, kb: 1.2 })] },
    // the First Form's sweeping shots share its one multiplier (split evenly: our choice), then the Second Form's smash.
    // Second Form Daze: the datamine's 253.5 (the wiki table's 462.5 rises 3.5x faster per level than any other row: a typo)
    downfall: { name: 'Basic Attack: Falling Petals - Downfall', anim: 'srDownfall', dur: 2.25, cancel: 2.05, reach: 6, range: 4, inv: [0, 2.25], sdMech: 'pilot', sdBig: true,
      hits: DF1_T.map(t => hit(t, 1057.4 / 5, 102.0 / 5, 61.69 / 5, { shape: 'arc', r: 7, arc: 90 })).concat([hit(DF2_HIT, 1979.4, 253.5, 153.36, { heavy: true, shape: 'circle', at: 'target', r: 3.4, kb: 1.6 })]) },
    dash: { name: 'Dash Attack: Magnetic Wheel Dance', anim: 'sdThrow', dur: 0.5, cancel: 0.38, reach: 6, hits: [hit(0.2, 129.1, 48.6, 0, PHYS({ shape: 'line', r: 1.0, len: 6, sc: 3 }))] },
    counter: { name: 'Dodge Counter: Blossom Burst', anim: 'sdBarrage', dur: 0.8, cancel: 0.62, reach: 6, inv: [0, 0.74],
      hits: [0.2, 0.32, 0.44].map(t => hit(t, 640.2 * 0.2, 382.5 * 0.2, 131.69 * 0.2, { shape: 'arc', r: 6, arc: 60, sc: 3 })).concat([hit(0.58, 640.2 * 0.4, 382.5 * 0.4, 131.69 * 0.4, { heavy: true, shape: 'arc', r: 6, arc: 60, kb: 0.9, sc: 6 })]) },
    special: { name: 'Special Attack: Withered in Frost', anim: 'sdThrow', dur: 0.6, cancel: 0.44, reach: 5, range: 3.5, cd: 1.2, hits: [hit(0.34, 96.1, 71.9, 43.34, { shape: 'circle', at: 'target', r: 1.8, sc: 5 })] },
    // Raining Iron Petals: a volley for the Energy it costs, the multiplier shared by Energy (10 for the first, 5 each after: 60 in all).
    // Its natural end is a full flight: Slaughter follows (then)
    ex: { name: 'EX Special Attack: Raining Iron Petals', anim: 'srFly', dur: EX_DUR, cancel: EX_DUR, cost: EX_COST, reach: 7, range: 5, inv: [0, EX_DUR], sdMech: 'rider', then: 'slaughter',
      hits: EX_T.map((t, i) => { const k = (i ? EX_TICK : EX_COST) / EX_FULL, last = i === EX_T.length - 1; return hit(t, 1367.6 * k, 880.5 * k, 577.35 * k, { shape: 'circle', at: 'target', r: 2.4, sc: 2, heavy: last, kb: last ? 0.8 : 0 }); }) },
    away: { name: 'EX Special Attack: Raining Iron Petals - Away', anim: 'srCannon', dur: 0.8, cancel: 0.62, reach: 7, range: 5, inv: [0, 0.8], sdMech: 'rider',
      hits: AWAY_T.map(t => hit(t, 37.1 / 4, 14.7 / 4, 8.33 / 4, { shape: 'line', r: 1.0, len: 8 })) },
    chain: { name: 'Chain Attack: Tempest of Frosty Petals', anim: 'srChain', dur: 1.6, inv: [0, 1.6], sdMech: 'held',
      hits: CH_T.map(t => hit(t, 1469.0 * 0.15, 443.8 * 0.15, 467.86 * 0.15, { shape: 'line', r: 1.3, len: 9, sc: 6 })).concat([hit(CH_HIT, 1469.0 * 0.55, 443.8 * 0.55, 467.86 * 0.55, { heavy: true, shape: 'circle', at: 'target', r: 3.4, kb: 1.4, sc: 12 })]) },
    ult: { name: 'Ultimate: Clockwork Garden - Bloom!', anim: 'srUlt', dur: 3.0, inv: [0, 3.0], sdMech: 'pilot', sdBig: true,
      hits: ULT_M.map(t => hit(t, 6500.2 * 0.08, 894.0 * 0.08, 541.7 * 0.08, { shape: 'circle', at: 'target', r: 3 }))
        .concat(ULT_R.map(t => hit(t, 6500.2 * 0.07, 894.0 * 0.07, 541.7 * 0.07, { shape: 'circle', at: 'target', r: 3.6 })))
        .concat([hit(ULT_HIT, 6500.2 * 0.4, 894.0 * 0.4, 541.7 * 0.4, { heavy: true, shape: 'circle', at: 'target', r: 4.4, kb: 1.8 })]) },
    // Sprouting Barrier: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow; the official Heavy is 514.4)
    assist: { name: 'Defensive Assist: Sprouting Barrier', type: 'defensive', anim: 'sdParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Crimson Core Burst', anim: 'sdBarrage', dur: 1.2, reach: 6, inv: [0, 1.15],
      hits: [0.25, 0.37, 0.49, 0.61, 0.73].map(t => hit(t, 912.5 * 0.12, 602.9 * 0.12, 389.76 * 0.12, { shape: 'arc', r: 6, arc: 60, sc: 3 })).concat([hit(0.95, 912.5 * 0.4, 602.9 * 0.4, 389.76 * 0.4, { heavy: true, shape: 'arc', r: 6.5, arc: 60, kb: 1.0, sc: 15 })]) },
    quick: { name: 'Quick Assist: Barrage of Raining Flowers', anim: 'sdBarrage', dur: 0.75, reach: 6, inv: [0, 0.7],
      hits: [0.22, 0.36, 0.5].map(t => hit(t, 308.0 / 3, 115.5 / 3, 70.0 / 3, { shape: 'arc', r: 6, arc: 60, kb: 0.3, sc: 4 })) },
  };

  /* ----------------------------------------------------- her mechanics -- */
  const fielded = a => BT.fielded().includes(a);
  const ons = a => !!a.sdVg && a.sdOns > BT.B.t;     // Onslaught (on Seed)
  const dst = a => !!a.sdVg && a.sdDS > BT.B.t;      // Direct Strike (on her Vanguard)
  const besiege = a => ons(a) && dst(a);              // both: Besiege for both
  // the way the stick points on the floor (as ai.js reads it: the camera's up and right)
  const stickDir = I => { const y = BT.B.cam.yaw || 0; return Math.atan2(Math.cos(y) * I.x - Math.sin(y) * I.y, -Math.sin(y) * I.x - Math.cos(y) * I.y); };

  function addSteel(a, n) {
    const was = a.steel; a.steel = Math.min(S_MAX, a.steel + n);
    if (was < S_GATE && a.steel >= S_GATE) { a.sdQuick = true; BT.log('Seed: 120 Steel Charge. One Falling Petals - Slaughter is ready anywhere: hold Basic.', 'skill'); }
  }
  function spendSteel(a, n) { a.steel = Math.max(0, a.steel - n); if (a.steel < S_GATE) a.sdQuick = false; }
  // the automatic dodge as she backs off after her 3rd hit: a Perfect Dodge (her Dodge Counter is ready)
  function autoDodge(a, e) {
    const B = BT.B;
    BT.endAct(a); a.queue.length = 0;
    a.dodge = { t0: B.t, until: B.t + 0.38 };
    a.state = 'dodge'; a.anim.state = 'dodge'; a.anim.t = 0; a.stT = 0;
    const side = Math.random() < 0.5 ? 1 : -1, dir = (e && e.x != null ? ang(e, a) : a.face + PI) + side * 1.1;
    a.anim.side = side; a.vx = Math.sin(dir) * 8; a.vz = Math.cos(dir) * 8;
    SFX.play('dodge'); FX.burst(a.x, 0.3, a.z, 8, { col: [0xffffff, HOLO], speed: 2, size: 0.08, life: 0.25, g: 0 });
    BT.perfectDodge(a, e);
  }
  // let go of EX in flight (or out of Energy): Raining Iron Petals - Away
  function away(a, A) {
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    BT.endAct(a); a.gap = 0; a.queue.unshift({ def: K.away, kind: 'ex2', tgt, delay: 0 });
  }
  // the flight: 5 Energy before each volley after the first, the stick flies her about
  function flight(a, A, dt, on) {
    const B = BT.B, n = A.data.sdPaid || 0, last = EX_T.length - 1;
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    if (tgt) A.dir = ang(a, tgt);
    if (n < last && BT.isPlayer(a) && !BT.btnHeld('special') && A.t > EX_T[0] + 0.05) return away(a, A);
    if (n < last && A.t >= EX_T[n + 1] - 0.05) {
      if (a.energy < EX_TICK) return away(a, A);
      BT.spendEnergy(a, EX_TICK); A.data.sdPaid = n + 1;
      if (n + 1 === last) a.sdExSl = true;           // 60 Energy in this flight: Slaughter when it ends (the move's then)
    }
    const I = on && BT.isPlayer(a) && BT.moveInput();
    if (I) {
      const d = stickDir(I), Bn = B.bounds;
      a.x += Math.sin(d) * FLY * dt; a.z += Math.cos(d) * FLY * dt;
      if (Bn) { a.x = clamp(a.x, Bn[0] + 0.4, Bn[2] - 0.4); a.z = clamp(a.z, Bn[1] + 0.4, Bn[3] - 0.4); }
    }
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.seed = {
    id: 'seed', name: 'Seed', short: 'Seed', faction: 'Obol Squad', spec: 'Attack', attr: 'electric', rank: 'S',
    color: '#8fcad5', color2: '#f2bc60', assist: 'defensive', stance: 'scooter',
    blurb: 'Obol Squad\'s heavy weapons specialist, Flora, who took the codename "Seed" and the combat mech Seed Sr. from the Intelligent Construct who raised her: she rides her scooter into battle with a steel wheel and floating turrets, and switches into the mech for its heaviest blows. Her Steel Charge powers its Slaughter punch and Downfall barrage, and with another Attack Agent as her Vanguard, each one\'s EX Special Attack buffs the other.',
    stats: { hp: 8590, atk: 3130, def: 655, impact: 93, ap: 93, am: 94, cr: 0.35, cd: 1.0, er: 1.2, speed: 4.9 },
    ai: { range: 3.0, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'steel',
    core: [
      ['Core Passive: Flower Chain Protocol', 'The Attack teammate with the highest ATK is her Vanguard. The Vanguard\'s EX Special Attack gives Seed Onslaught; Seed\'s gives the Vanguard Direct Strike: +1000 ATK and +30% CRIT DMG each, for 40 s (both start a battle with them). With both, both gain Besiege: +25% DMG. They work while that Agent is on the field. Every point of Energy Seed spends, or the Vanguard spends on the field, gives Seed 0.5 Steel Charge.'],
      ['Steel Charge and the mech', 'Up to 150; she starts with 60. Her hits fill it (her 4th Basic hit, EX, Chain Attack and Assist Follow-Up most), her Ultimate gives 60. After her 4th Basic hit, Dodge Counter, Quick Assist or Assist Follow-Up, Basic: Falling Petals - Slaughter, Seed Sr.\'s charged punch. At 120, once, hold Basic for it anywhere. After Slaughter or her Ultimate with 120: Basic for Falling Petals - Downfall (60, then 60 more), sweeping shots and a jumping smash. As she backs off after her 3rd hit she dodges on her own.'],
      ['EX Special Attack: Raining Iron Petals', 'Press Special (10 Energy) and keep it held: on the mech\'s back she flies (move with the stick), firing missiles for 5 Energy a volley. Let go for Raining Iron Petals - Away, cannon fire; 60 Energy in one flight, and Slaughter follows at once.'],
      ['Additional Ability: Surprise Strike', 'With another Attack Agent in the squad: her hits on the field give the Vanguard 2 Energy (once a second), and Slaughter, Downfall and her Ultimate deal 30% more DMG and ignore 25% Electric RES.'],
    ],
    kit: K,
    kitShow: [['After 4th hit', 'slaughter'], ['120 Steel', 'downfall'], ['EX let go', 'away']],
    rivalMoves: [{ k: 'slaughter', kind: 'core', p: 0.25, cd: 5 }],
    howto: 'Seed: after her 4th Basic hit, Dodge Counter (her 3rd hit dodges on its own as she backs off), Quick Assist or Assist Follow-Up, press Basic: the mech Seed Sr. punches (Slaughter); with 120 Steel Charge, Basic again for Downfall. Hold Special for her EX flight (5 Energy a volley; 60 in one flight ends in Slaughter; let go early for Away). Pair her with another Attack Agent, her Vanguard: their EX Special Attacks buff each other. Her assist is a Defensive Assist: she parries.',
    mech: {
      init(a) {
        a.steel = S_START; a.sdQuick = false; a.sdSlUntil = 0; a.sdDfUntil = 0; a.sdExSl = false; a.sdAutoT = 0;
        a.sdVg = null; a.sdOns = 0; a.sdDS = 0; a.sdSSt = 0; a.sdE = a.energy; a.sdVE = 0; a.sdVgAct = null; a.sdPods = null;
      },
      squad(a, B) {
        // the Vanguard: the Attack teammate with the highest initial ATK. Entering the battle with one: Onslaught, Direct Strike (so Besiege)
        const t0 = B.t || 0;
        a.sdVg = B.squad.filter(s => s !== a && s.def.spec === 'Attack').reduce((m, s) => !m || s.st.atk > m.st.atk ? s : m, null);
        if (a.sdVg) { a.sdOns = t0 + VG_T; a.sdDS = t0 + VG_T; a.sdVE = a.sdVg.energy; BT.log(`Seed: ${a.sdVg.def.short} is her Vanguard (Onslaught, Direct Strike, Besiege).`, 'skill'); }
      },
      start(a, def, A) {
        const B = BT.B, dur = A.dur / (A.speed || 1);
        // the moves Slaughter follows
        if (def === K.basic[3] || A.kind === 'counter' || A.kind === 'quick' || A.kind === 'followup') a.sdSlUntil = B.t + dur + SL_WIN;
        if (def === K.slaughter) {
          if (a.sdExSl) a.sdExSl = false;                                   // (the end of a full flight)
          else if (!(a.sdSlUntil > B.t)) a.sdQuick = false;                 // held Basic at 120: the one quick chance is spent
          a.sdSlUntil = 0; a.sdDfUntil = B.t + dur + DF_WIN;
        }
        if (A.kind === 'ult') { addSteel(a, 60); a.sdDfUntil = B.t + dur + DF_WIN; }
        if (def === K.downfall) { a.sdDfUntil = 0; spendSteel(a, DF_COST); }
        if (def === K.ex) { a.sdExSl = false; if (a.sdVg) { a.sdDS = B.t + VG_T; BT.log(`Seed: Direct Strike for ${a.sdVg.def.short} (40 s).`, 'skill'); } }
      },
      hit(a, v, h, A) {
        const B = BT.B;
        if (h.sc && A.data.sdSC !== h) { A.data.sdSC = h; addSteel(a, h.sc); }
        // Surprise Strike: Energy for the Vanguard when she deals DMG on the field (once a second)
        if (a.sdVg && a.sdVg.alive && a.sdSSt <= B.t && fielded(a)) { a.sdSSt = B.t + 1; BT.gainEnergy(a.sdVg, SS_EN, true); }
      },
      // her own DMG: Besiege; Surprise Strike's +30% and the Electric RES it ignores (as a DMG bonus: 25% of RES over the
      // RES multiplier, exact when nothing else adds); Onslaught's CRIT DMG
      mods(a, v, h, A) {
        if (!BT.B || a.rival || !a.sdVg) return {};
        const on = fielded(a), big = A && A.def.sdBig;
        return { dmg: (besiege(a) && on ? BESIEGE : 0) + (big ? SS_DMG + SS_RES / BT.resMult(v, 'electric') : 0), cd: ons(a) && on ? VG_CD : 0 };
      },
      // Onslaught's ATK for her, Direct Strike's for the Vanguard (atkOf asks every Agent)
      atkFor(s, b) {
        if (!BT.B || !s.sdVg || b.rival) return 0;
        if (b === s) return ons(s) && fielded(s) ? VG_ATK : 0;
        return b === s.sdVg && dst(s) && fielded(b) ? VG_ATK : 0;
      },
      cdFor(s, b) { if (!BT.B || b.rival || b !== s.sdVg) return 0; return dst(s) && fielded(b) ? VG_CD : 0; },
      dmgFor(s, b) { if (!BT.B || b.rival || b !== s.sdVg) return 0; return besiege(s) && fielded(b) ? BESIEGE : 0; },
      tick(a, dt, on) {
        const B = BT.B, A = a.act, vg = a.sdVg;
        // Steel Charge from Energy spent: hers, and the Vanguard's while it is on the field
        if (a.energy < a.sdE) addSteel(a, (a.sdE - a.energy) * 0.5);
        a.sdE = a.energy;
        if (vg) {
          if (vg.energy < a.sdVE && fielded(vg)) addSteel(a, (a.sdVE - vg.energy) * 0.5);
          a.sdVE = vg.energy;
          // the Vanguard's EX Special Attack: Onslaught for Seed
          const VA = vg.act;
          if (VA && (VA.kind === 'ex' || VA.kind === 'ex2') && a.sdVgAct !== VA) { a.sdVgAct = VA; a.sdOns = B.t + VG_T; BT.log(`Seed: Onslaught (${vg.def.short}'s EX Special Attack, 40 s).`, 'skill'); }
        }
        if (a.sdQuick && a.steel < S_GATE) a.sdQuick = false;
        // Downfall: the Second Form takes its own 60
        if (A && A.def === K.downfall && !A.data.sdF2 && A.t >= DF2_T) { A.data.sdF2 = true; spendSteel(a, DF_COST); }
        if (A && A.def === K.ex && on) flight(a, A, dt, on);
        // back from the mech when no mech move is running or waiting (CHOREO.end does it at a move's end; this catches the rest)
        if (a.rigHome && !(a.act && a.act.def.sdMech) && !a.queue.some(q => q.def && q.def.sdMech)) CHOREO.swapRig(a, null);
      },
      swap(a, isIn) { if (!isIn && a.sdPods) a.sdPods.alive = false; },
      // as she backs off after her 3rd hit, until her 4th lands: she dodges on her own (once in 1.2 s: our choice)
      incoming(a, e) {
        const B = BT.B, A = a.act;
        if (!A || a.sdAutoT > B.t) return false;
        const win = (A.def === K.basic[2] && A.t >= B3_BACK) || (A.def === K.basic[3] && A.t < K.basic[3].hits[0].t);
        if (!win) return false;
        a.sdAutoT = B.t + 1.2; autoDodge(a, e); return true;
      },
      // Basic: Downfall after Slaughter or the Ultimate (120 Steel Charge); Slaughter after her 4th hit, Dodge Counter, Quick
      // Assist or Assist Follow-Up; held at 120, the one quick Slaughter. Special: AUTO keeps the EX for a full flight
      resolve(a, btn, hold, c) {
        if (btn === 'special') return !BT.isPlayer(a) && a.energy >= EX_COST && a.energy < EX_FULL ? { def: K.special, kind: 'special' } : null;
        if (btn !== 'basic' || c.dash) return null;
        if (a.sdDfUntil > c.t && a.steel >= S_GATE) return { def: K.downfall, kind: 'core' };
        if (a.sdSlUntil > c.t) return { def: K.slaughter, kind: 'core' };
        if (hold && a.sdQuick && a.steel >= S_GATE) return { def: K.slaughter, kind: 'core' };
        return null;
      },
      ai(a, tgt, B) {
        if (a.sdDfUntil > B.t && a.steel >= S_GATE) return { btn: 'basic' };
        if (a.sdSlUntil > B.t) return { btn: 'basic' };
        if (a.sdQuick && a.steel >= S_GATE && (tgt.stun > 0 || Math.random() < 0.4)) return { btn: 'basic', hold: true };
        if (a.energy >= EX_FULL && (tgt.stun > 0 || a.energy >= 100 || Math.random() < 0.15)) return { btn: 'special' };
        return null;
      },
      hud(a, B) {
        const n = Math.floor(a.steel / 15), r = [`STEEL CHARGE ${'●'.repeat(n)}${'○'.repeat(10 - n)} ${Math.floor(a.steel)}`];
        if (a.sdDfUntil > B.t && a.steel >= S_GATE) r.push('DOWNFALL: BASIC');
        else if (a.sdSlUntil > B.t) r.push('SLAUGHTER: BASIC');
        else if (a.sdQuick && a.steel >= S_GATE) r.push('SLAUGHTER: HOLD BASIC');
        if (a.act && a.act.def === K.ex) r.push(`FLIGHT ${EX_COST + EX_TICK * (a.act.data.sdPaid || 0)}/${EX_FULL} ENERGY`);
        if (a.sdVg) {
          const o = a.sdOns - B.t, d = a.sdDS - B.t;
          r.push(`VANGUARD ${a.sdVg.def.short.toUpperCase()} · ONSLAUGHT ${o > 0 ? Math.ceil(o) + 's' : '–'} · DIRECT STRIKE ${d > 0 ? Math.ceil(d) + 's' : '–'}${besiege(a) ? ' · BESIEGE' : ''}`);
        }
        return r;
      },
    },
    town: {
      home: 'failume',
      // Failume Heights holds four of her six trust events: Sailume Bay with Trigger in the mornings (the sea view), the
      // overpass by the Seagaze Road cable car with Orphie and Coalby (BooBox), Devon Pawnshop, the Echo Chamber at night;
      // her Failume invitation meets at the cable car station. Evenings at Suibian Temple (she wants to plant flowers at the
      // Proxy's place there) and the video store; late at night by the cable car (she sleeps in Seed Sr.'s cockpit)
      routine: ['view:rail 35, boo:look 25, cable:look 20, huddle 20', 'cable:look 25, boo:look 25, goods:browse 15, video:window 15, huddle 20', 'temple:tree 25, plaza:bench 20, video:window 20, huddle 35', 'cable:bench 50, plaza:bench 30, view:rail 20'],
      chatter: ['Yah-hoh~', '(She is talking to a passing Bangboo in Bangboo. It looks lost.)'],
      lines: [
        'Yah-hoh~ Seed, Obol Squad\'s heavy weapons specialist. *sniff* You smell like one of my own kind, Proxy~',
        'Coalby keeps hanging around BooBox. It says it isn\'t interested in that Avocaboo. I read its visual records. It is~',
        'Seed Sr.\'s cockpit is the comfiest bed in New Eridu. Small, warm, and it smells of rust remover. Peach-scented, obviously~',
      ],
      chapters: [
        { title: 'Handmade', ask: ['Senior~ The pawnshop uncle still doesn\'t know what to give his daughter for her birthday.', 'He\'s clueless the same way Seed Sr. was. Go and see how he\'s doing? I\'ll wait by the cable car.'],
          steps: [{ t: 'talk', to: 'vince', reply: '(Vince turns a half-carved wooden toy over in his big metal hands.) That kid said a dress needs an electric shock function. ...I\'m closing the shop on my daughter\'s birthday, and I\'m making the present myself. These hands weren\'t built for carving.' }, { t: 'talk', to: 'seed' }],
          scene: [['A', 'He\'s closing the shop on her birthday? ...Then it doesn\'t matter what the present is.'], ['P', 'Even without an electric shock function?'], ['A', 'I\'ll let him off this once~ Handmade is better anyway.'], ['A', 'Seed Sr. made every one of my birthday presents by hand. Wobbly ones. They\'re all still in the cockpit.'], ['A', '...My birthday is November 22nd, Proxy. Just so you know~']] },
        { title: 'Perception training', ask: ['Trigger is taking me to Sailume Bay for perception training. Soil, flowers, a sleepy cat... I\'m meant to feel which ones are alive.', 'Come and find me there one morning? If Trigger wants a training target, I\'m picking you~'],
          steps: [{ t: 'talk', to: 'trigger', reply: 'I\'ll be with her by the water in the morning, Proxy. She needs to learn the feel of living things, and she listens better when you\'re there. Bring your hands. She\'ll want them.' }, { t: 'slot', slot: 0, to: 'seed' }],
          scene: [['A', 'The soil is damp and doesn\'t do anything. The flowers are softer. They\'d snap if I twisted them.'], ['A', 'The cat is warm. I can feel it breathing. Seed Sr. had me pet cats too... it\'s the same, but different.'], ['P', 'And the training target?'], ['A', 'You, obviously~ ...Warm and soft, like a marshmallow with electricity in it. Hehe.'], ['A', 'Now Trigger says I owe her a thousand-word reflection. Proxy... mayday...']] },
        { title: 'We\'ll win this, Seed Sr.', ask: ['Captain Magus wants Obol Squad on an Elite in the Hollow. Orphie\'s coming, and Seed Sr. too.', 'Put me at the front, Proxy, with Orphie beside me. If it gets loud, I\'ll let my turrets do the talking~'],
          steps: [{ t: 'clear', f: { enc: 'elite', lead: 'seed', with: 'orphie' } }, { t: 'talk', to: 'orphie', reply: 'Seed called me "Fire Dragon Twin Tails" right in the middle of the fight! ...Captain Magus says nicknames in combat are unauthorised. I think she\'s jealous.' }, { t: 'talk', to: 'seed' }],
          scene: [['A', 'Target dismantled~ Orphie didn\'t stumble once. She earned her new nickname.'], ['P', 'Magus called it unauthorised.'], ['A', 'The Captain lectures, I space out. It works~'], ['A', 'Seed Sr. told me friends are the ones you see when you look behind you. I looked. Orphie, the Captain, Trigger... you.'], ['A', '...We won this one, Seed Sr. Let\'s go home~']] },
      ],
    },
  };

  /* --------------------------------------------------------------- models --
     SEED, from the official portrait and her combat and city models: a
     jaw-length bob, pale mint turning blue at the ends, an ahoge, a thin navy
     braid on her left side and a silver four-leaf clover clip; teal-green
     eyes; a dark navy choker with a clover pendant. A white halter dress to
     mid-thigh with a dark grey bandeau, gold-orange cords and grommets, a
     dark slate panel on her left hip, clover emblems, and the orange
     OPERATOR strap hanging from her back; bare shoulders, grey bolted bands
     on her upper arms, long white sleeves, dark grey fingerless gloves with
     yellow fingertips; white thigh-high stockings with grey patches, an
     orange loop on her left thigh, a grey band on her right; grey toeless
     stirrup socks, bare toes. She stands on her one-wheeled scooter: a round
     grey deck on a yellow-orange chassis, a dark grey column up to a
     grey-beige paddle with a clover, a black handlebar. 153 cm.
     SEED SR. (240 cm), from the NPC portrait (a night scene: the khaki and
     the helmet are lightened) and a daylight mechanics clip (greys, yellow,
     black, the jets): a small grey helmet head with a gold star crest and a
     dark visor; huge rounded grey pauldrons, the left with a cross bolt;
     segmented grey gauntlets, dark fists; a khaki vest with SEED lettering
     and X marks, black chest pouches with yellow tags; tall yellow-orange
     units behind the shoulders and a black thruster pack, blue jets; a navy
     tabard; grey thighs, orange knee pads, navy shins, big yellow-orange
     boots. Seed rides on its back (EX) or sits in its arms (Chain): she is
     drawn on it in miniature (the mech's voxels are bigger than hers). */
  const HAIR = 0xd6f4f1, HAIR2 = 0xc6e8e8, HAIRHI = 0xf3fbf9, HAIRB = 0x8fcad5, HAIRD = 0x6199b8, HAIRDD = 0x456f8f, BRAID = 0x374c6a, BRAID2 = 0x4f627b;
  const SKIN = 0xfff2e6, EYE = 0x4e6966, LASH = 0x273c4f, MOUTH = 0xe0a49a, BLUSH = 0xfbd9d0;   // (the mouth and blush: our tones)
  const CHOKER = 0x404656, CHOKER2 = 0x171a22, PEND = 0xd9d7d5, CLIP = 0xcddbec;
  const DRESS = 0xfbf7f1, DRESS2 = 0xeae2da, BANDEAU = 0x7c7977, BANDEAU2 = 0xa09c99, CORD = 0xf2bc60, STRAP = 0xca975f, STRAPD = 0xa16a32, SLATE = 0x171c26, SLATE2 = 0x585e6b;
  const SLEEVE = 0xf8f5f1, SLEEVE2 = 0xcdc4c1, BAND = 0xa8a8a8, BAND2 = 0x464646, GLOVE = 0x6b767e, GLOVE2 = 0x201f1e, FINGER = 0xf2bc60;
  const STOCK = 0xe8e6e2, STOCK2 = 0xdeddd9, STOCKSH = 0xbdb8b5, PATCH = 0x818181, SOCK = 0x83848c, SOCK2 = 0x37363b;
  const DECK = 0x555c65, DECK2 = 0x5b626a, DECKD = 0x2a2f34, CHAS = 0xcfa948, CHAS2 = 0xbf963c, CHASD = 0x916724, COLUMN = 0x3f4043, PADDLE = 0xc0b7ae, PADDLE2 = 0x736d66, HANDLE = 0x1a1715;
  const MGREY = 0xb5b4aa, MGREY2 = 0x9a9b92, MGREY3 = 0x75776e, MDARK = 0x2e3f46, MDARK2 = 0x26353f, KHAKI = 0xb9b48c, KHAKI2 = 0xa8a37c, NAVY = 0x1e2a3c, NAVY2 = 0x2a3a4e;
  const YEL = 0xf3bd6f, YEL2 = 0xd4a058, YEL3 = 0x8e6831, JET = G(0x76bff4), HELM = 0x7a8a96, HELM2 = 0x5a6a76, GOLD = 0xe8b95a, GOLD2 = 0xd4a058, WHITE = 0xe8eef2, EYEL = G(0xbfe8ff);   // (the visor lights: our choice)
  {
    const arm = s => g => {   // s: +1 her left, -1 her right
      H.arm(g, { sleeve: SKIN, sleeveTo: 2, skin: SLEEVE, glove: GLOVE, gloveLen: 1, len: 8 });   // the bare shoulder, the long white sleeve, the glove
      g.box(-1, -2, -1, 1, -2, 1, BAND); g.set(2 * s, -2, 0, BAND2); g.set(2 * s, -1, 0, BAND2);   // the grey band round her upper arm, its bolted clamp
      for (let y = -3; y >= -6; y--) g.set(-s, y, -1, SLEEVE2);                                     // the sleeve's shaded inner side
      g.box(-1, -8, 1, 1, -8, 1, FINGER); g.set(0, -7, 2, GLOVE2);                                  // the yellow fingertips
    };
    const leg = s => g => {
      H.leg(g, { pant: STOCK, boot: SOCK, bootH: 2, sole: SOCK2, len: 9 });   // the white thigh-high stockings, the grey stirrup socks
      g.box(-1, -9, 2, 1, -8, 2, SKIN);                                         // bare toes
      g.box(-1, -7, -1, 1, -2, -1, STOCK2); g.set(0, -6, -1, STOCKSH);         // the stocking's shade behind
      g.set(0, -3, 1, PATCH); g.set(0, -4, 1, PATCH);                          // a grey capsule patch on the thigh
      if (s > 0) { g.set(2, -2, 0, CORD); g.set(2, -3, 1, CORD); g.set(2, -4, 0, CORD); }   // her left thigh: the orange loop
      else { g.box(-1, -1, -1, 1, -1, 1, BAND); g.set(-2, -1, 0, BAND2); }     // her right: the grey band, its buckle
    };
    MODELS.seed = H.humanoid({
      scale: 0.066, height: 29, width: 14, std: { hipY: 14 },                  // (the hips sit 3 voxels higher: she stands on the scooter's deck)
      sockets: { weapon: ['armR', [0, -8, 1]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, DRESS); g.box(-3, -2, 2, 3, 0, 2, DRESS2);   // the white dress over her hips...
        g.box(-3, -4, -2, 3, -3, 2, (x, y, z) => z === 2 ? DRESS2 : DRESS);    // ...to mid-thigh
        g.box(4, -4, -2, 4, 0, 1, (x, y) => y === 0 ? SLATE2 : SLATE); g.set(4, -2, 2, PEND);   // the dark slate panel at her left hip, a clover
        g.set(-2, -3, 3, PEND); g.set(1, -3, 3, PEND);                           // the clover emblems on the skirt
        g.box(-1, -4, 2, 0, -4, 2, CORD);                                        // "DESIGN-00833", in gold
        g.set(-3, -2, 2, CORD); g.set(3, -1, 2, CORD);                           // the gold cords' ends
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 1, 1, DRESS); g.box(-2, 0, 2, 2, 1, 2, DRESS2);     // the waist
        g.box(-3, 2, -2, 3, 2, 1, DRESS); g.box(-3, 2, 2, 3, 2, 2, DRESS2);
        g.box(-3, 3, -2, 3, 4, 2, (x, y, z) => z === 2 && y === 4 && Math.abs(x) <= 2 ? BANDEAU2 : BANDEAU);   // the dark grey bandeau
        g.set(-1, 3, 2, CORD); g.set(1, 3, 2, CORD);                              // its gold grommets, and the cord laced down the front
        for (let y = 0; y <= 2; y++) g.set(0, y, 2, CORD);
        g.box(-3, 5, -2, 3, 5, 1, SKIN); g.box(-2, 5, 2, 2, 5, 2, SKIN);        // bare shoulders and collarbones
        g.set(0, 5, 2, DRESS);                                                    // the halter strap up to the choker
        g.box(-1, 6, -1, 1, 6, 1, CHOKER); g.set(0, 6, 2, PEND); g.set(1, 6, -2, CHOKER2);   // the choker, its clover pendant, the buckle
        g.box(-2, 0, -3, 2, 4, -3, DRESS2);                                       // the dress's back
        g.set(2, 5, -3, STRAP);                                                    // where the OPERATOR strap hangs from
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH, blush: BLUSH });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 3], [-3, 4], [-2, 4], [-1, 3], [1, 4], [2, 3], [3, 4], [4, 3]], sideTo: 2 });
        const bob = (x, y) => y >= 3 ? HAIR : y >= 1 ? HAIRB : y >= 0 ? HAIRD : HAIRDD;
        g.box(-5, -1, -3, -5, 5, 2, bob); g.box(5, -1, -3, 5, 5, 2, bob);         // the jaw-length bob, blue at the ends
        g.box(-4, -1, -5, 4, 5, -5, bob); g.box(-4, -1, -4, 4, 0, -4, bob);      // the back
        g.box(-4, 0, 3, -4, 3, 3, bob); g.box(4, 0, 3, 4, 3, 3, bob);            // the locks framing her face
        for (const [x, y, z] of [[-2, 8, 1], [1, 8, 0], [-1, 8, -2], [2, 7, 3]]) g.set(x, y, z, HAIRHI);   // the shine on top
        g.set(0, 8, 0, HAIR); g.set(0, 9, 1, HAIR); g.set(-1, 10, 1, HAIRHI); g.set(-1, 10, 2, HAIR);   // the ahoge
        g.box(2, 6, 4, 3, 7, 4, CLIP); g.set(1, 7, 4, CLIP); g.set(3, 5, 4, PEND);   // the four-leaf clover clip on her left
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tail: {   // the thin navy braid on her left side
          parent: 'head', at: [4, 1, -2], draw(g) {
            for (let i = 0; i < 10; i++) g.box(0, -i, 0, 1, -i, 0, i % 2 ? BRAID2 : BRAID);
            g.set(0, -10, 0, HAIRD);
          },
        },
        tailL: {  // the orange OPERATOR strap hanging from her back (named so it sways like the hair)
          parent: 'torso', at: [2, 5, -3], draw(g) {
            for (let i = 0; i <= 11; i++) g.set(0, -i, 0, i >= 6 && i <= 9 && i % 2 ? STRAPD : STRAP);
            g.box(0, -12, 0, 1, -12, 0, BAND);                                   // its grey buckle tip
          },
        },
        scooter: {   // her one-wheeled scooter, under her feet (on the ground: it rides with her, leaps and all)
          parent: null, at: [0, 0, 0], draw(g) {
            g.ell(0, 1, 0, 1, 1.5, 1.5, (x, y, z) => x === 0 && Math.abs(y - 1) + Math.abs(z) <= 1 ? CHAS : CHASD);   // the wheel under the deck, its yellow hub
            for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) {
              const r = Math.hypot(x, z); if (r > 4.6) continue;
              g.set(x, 2, z, r > 3.8 ? DECKD : (x === 0 || z === 0) && r < 2.5 ? DECK2 : DECK);   // the round grey deck, its cross plate
              if (r > 3.4) g.set(x, 1, z, z >= 1 || z <= -3 ? CHAS : CHASD);                        // the yellow chassis rim
            }
            g.box(-5, 0, -2, -5, 2, 1, CHAS2); g.box(5, 0, -2, 5, 2, 1, CHAS2);   // the chassis housings at the sides
            g.box(-5, 1, 3, -3, 3, 5, CHAS);                                        // the yellow clamp at the column's foot
            for (let y = 3; y <= 12; y++) g.set(-4, y, y < 8 ? 4 : 5, COLUMN);      // the steering column, in front of her right leg
            g.box(-5, 8, 4, -3, 8, 5, PADDLE2);                                     // its collar
            g.box(-5, 11, 5, -3, 14, 5, PADDLE); g.set(-4, 15, 5, PADDLE); g.set(-4, 12, 6, PADDLE2);   // the paddle panel, its clover
            g.box(-7, 14, 4, -1, 14, 4, HANDLE); g.set(-7, 14, 4, COLUMN); g.set(-1, 14, 4, COLUMN);   // the handlebar, its grip ends
          },
        },
      },
    });
    MODELS.seed.ride = true;   // she stands on her scooter: a walk keeps her legs on the deck (anim.js, see the report)

    // Seed in miniature on the mech (its voxels are 1.6x hers): held, sitting with her legs out in front; riding, kneeling
    const mini = held => g => {
      if (held) { g.box(-1, 0, 1, 1, 0, 4, STOCK); g.box(-1, -1, 4, 1, -2, 4, STOCK); g.box(-1, -3, 4, 1, -3, 5, SOCK); }
      else { g.box(-2, 0, -1, 2, 1, 2, STOCK); g.box(-2, 0, -2, 2, 0, -2, SOCK); }
      g.box(-2, 1, -1, 2, 3, 1, DRESS); g.box(-2, 3, -1, 2, 3, 1, BANDEAU);    // the dress, the bandeau
      g.box(-3, 1, 0, -3, 3, 0, SLEEVE); g.box(3, 1, 0, 3, 3, 0, SLEEVE); g.set(-3, 0, 1, GLOVE); g.set(3, 0, 1, GLOVE);   // her arms
      g.set(0, 4, 0, CHOKER);
      g.box(-2, 5, -2, 2, 8, 2, SKIN); g.set(-1, 6, 2, EYE); g.set(1, 6, 2, EYE);   // her head, teal eyes
      g.box(-2, 8, -2, 2, 9, 2, HAIR); g.box(-3, 4, -2, -3, 8, 1, HAIRB); g.box(3, 4, -2, 3, 8, 1, HAIRB); g.box(-2, 4, -3, 2, 8, -3, HAIRB);   // the mint bob
      g.set(2, 8, 3, CLIP); g.set(0, 10, 0, HAIR);                                 // the clover clip, the ahoge
    };
    const mArm = s => g => {
      g.ell(0, 0, 0, 3, 2, 3, (x, y) => y <= -2 ? MGREY3 : y >= 2 ? MGREY2 : MGREY);   // the huge round pauldron
      if (s > 0) { g.set(4, 0, 0, MDARK); g.set(4, 1, 0, MGREY2); g.set(4, -1, 0, MGREY2); g.set(4, 0, 1, MGREY2); g.set(4, 0, -1, MGREY2); }   // the cross bolt on the left one
      g.box(-1, -4, -1, 1, -3, 1, MDARK);                                        // the upper arm
      g.box(-2, -10, -2, 2, -5, 2, (x, y) => y === -7 ? MGREY3 : y === -5 ? MGREY2 : MGREY);   // the segmented gauntlet
      g.set(3 * s, -6, 0, MGREY2); g.set(3 * s, -9, 0, MGREY2);                  // its bolts
      g.box(-2, -12, -1, 2, -11, 2, MDARK); g.box(-1, -13, 0, 1, -13, 2, MDARK2);   // the dark fist
    };
    const mLeg = () => g => {
      g.box(-2, -3, -2, 2, 0, 2, MGREY); g.box(-2, -3, -2, 2, -3, 2, MGREY2);   // the grey thigh
      g.box(-1, -4, -1, 1, -4, 1, MDARK);                                        // the knee joint
      g.box(-2, -6, 3, 2, -4, 3, YEL); g.box(-2, -6, 2, 2, -4, 2, YEL2);        // the orange knee pad
      g.box(-2, -8, -2, 2, -5, 1, NAVY); g.set(0, -6, -2, MGREY2);              // the navy shin
      g.box(-2, -10, -2, 2, -9, 4, (x, y, z) => y === -10 ? MDARK : x === -2 || z === -2 ? YEL2 : YEL);   // the big yellow-orange boot, its sole
      g.set(-1, -9, 5, MGREY); g.set(1, -9, 5, MGREY);                           // the silver clasps on its toe
    };
    MODELS.seedSr = H.humanoid({
      scale: 0.105, height: 27, width: 26, std: { hipY: 12, legX: 3, shoulderX: 7, headY: 9 },
      sockets: { weapon: ['armR', [0, -12, 1]], off: ['armL', [0, -12, 1]], head: ['head', [0, 3, 0]], chest: ['torso', [0, 5, 3]] },
      hips(g) {
        g.box(-4, -2, -3, 4, 0, 2, NAVY);                                        // the navy tabard...
        g.box(-3, -5, 3, 3, -1, 3, (x, y) => y === -1 ? NAVY2 : NAVY); g.box(-3, -5, -3, 3, -2, -3, NAVY);   // ...its front and back flaps
        g.set(-2, -2, 4, MGREY); g.set(2, -2, 4, MGREY); g.set(-2, -3, 4, MGREY2); g.set(2, -3, 4, MGREY2);  // the silver D-rings
        g.box(5, -4, -2, 5, -1, 1, MGREY); g.box(-5, -4, -2, -5, -1, 1, MGREY);   // armour plates over the hips
      },
      torso(g) {
        g.box(-4, 0, -3, 4, 1, 2, NAVY);                                          // the navy waist
        g.box(-5, 2, -3, 5, 7, 3, KHAKI); g.box(-4, 2, 4, 4, 6, 4, (x, y) => y === 2 ? KHAKI2 : KHAKI);   // the khaki vest, its front plate
        for (const x of [-3, -1, 1, 3]) g.set(x, 6, 4, MDARK);                    // SEED across the chest
        for (const x of [-2, 2]) { g.set(x, 3, 5, MDARK); g.set(x - 1, 4, 5, MDARK); g.set(x + 1, 2, 5, MDARK); }   // the X marks
        g.box(-4, 6, 4, -2, 8, 5, MDARK); g.box(2, 6, 4, 4, 8, 5, MDARK);         // the black chest pouches...
        g.set(-3, 8, 6, YEL); g.set(3, 8, 6, YEL); g.set(3, 7, 6, WHITE);         // ...their yellow tags, a white label
        g.box(-3, 8, -2, 3, 8, 2, NAVY);                                          // the collar
        g.box(-6, 4, -6, -3, 11, -4, x => x === -6 ? YEL2 : YEL); g.box(3, 4, -6, 6, 11, -4, x => x === 6 ? YEL2 : YEL);   // the tall yellow units behind the shoulders
        g.box(-6, 4, -6, -3, 4, -4, YEL3); g.box(3, 4, -6, 6, 4, -4, YEL3);
        g.box(-2, 1, -6, 2, 7, -4, MDARK); g.set(0, 5, -7, WHITE); g.set(0, 3, -7, WHITE);   // the black thruster pack (THREE GATES)
        g.box(-1, 0, -6, 1, 0, -5, JET); g.set(-4, 3, -5, JET); g.set(4, 3, -5, JET);   // the blue jets
      },
      head(g) {
        g.box(-1, 0, -1, 1, 0, 1, MDARK);                                         // the neck
        g.box(-2, 1, -2, 2, 4, 2, HELM); g.box(-2, 4, -2, 2, 4, 2, HELM2);        // the small helmet head
        g.box(-2, 2, 3, 2, 3, 3, MDARK); g.set(-1, 3, 3, EYEL); g.set(1, 3, 3, EYEL);   // the dark visor, two lights
        g.box(-3, 4, 3, 3, 4, 3, GOLD); g.box(-2, 5, 3, 2, 5, 3, GOLD); g.box(-1, 6, 3, 1, 6, 3, GOLD2); g.set(0, 7, 3, GOLD);   // the gold star crest
        g.set(-4, 5, 3, GOLD2); g.set(4, 5, 3, GOLD2);
      },
      armL: mArm(1),
      armR: mArm(-1),
      legL: mLeg(),
      legR: mLeg(),
      extra: {
        rider: { parent: 'torso', at: [0, 8, -5], draw: mini(false) },          // Seed on its back (EX)
        held: { parent: 'torso', at: [0, 4, 6], draw: mini(true) },             // Seed in its arms (Chain Attack)
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     SEED, on her scooter: her right hand on the handlebar, the left free. Her
     wheel thrown from the right hand; the turrets sent with the left. */
  ANIM.READY.scooter = { armL: [-0.12, 0, 0.14], armR: [-0.5, 0.1, -0.06], torso: [0.03, 0.05, 0], head: [0, -0.05, 0], legL: [0, 0, 0.03], legR: [0, 0, -0.03], hipsY: 0 };
  const plus = (...ps) => { const r = {}; for (const p of ps) for (const k in p) { const v = p[k]; r[k] = Array.isArray(v) ? (r[k] ? r[k].map((x, i) => x + v[i]) : v.slice()) : (r[k] || 0) + v; } return r; };
  const times = (p, s) => { const r = {}; for (const k in p) r[k] = Array.isArray(p[k]) ? p[k].map(x => x * s) : p[k] * s; return r; };
  const spike = (t, ts, w) => { let k = 0; for (const s of ts) if (t >= s) k = Math.max(k, 1 - (t - s) / (w || 0.14)); return Math.max(0, k); };
  // (every move starts from her arms at her sides, not on the handlebar: POSE[k] gets her stance less this)
  const NEUT = { armL: [0.12, 0, -0.14], armR: [0.5, -0.1, 0.06], torso: [-0.03, -0.05, 0], head: [0, 0.05, 0] }, POSE = {};
  const THROWN = { armR: [-1.45, -0.55, 0.55], torso: [0.08, -0.45, 0], head: [0, 0.2, 0] };
  POSE.sdThrow = (b, t, th, d) => stage(b, { armR: [-0.7, 1.0, -1.2], torso: [0, 0.5, 0], head: [0, -0.25, 0] }, THROWN, t, th, d);
  POSE.sdThrow2 = (b, t, th, d) => t < 0.3 ? POSE.sdThrow(b, t, Math.min(th, 0.2), 0.3) : stage(b, THROWN, { armR: [-1.1, 0.25, -0.2], torso: [0, 0.15, 0] }, t - 0.3, 0.1, d - 0.3);   // ...and caught
  POSE.sdRetreat = (b, t, th, d) => stage(b, { armL: [-0.9, 0.3, 0.45], torso: [0, -0.25, 0] }, { armL: [-1.65, -0.1, 0.1], torso: [-0.14, -0.2, 0], head: [-0.06, 0, 0] }, t, th, d);
  POSE.sdCommand = (b, t, th, d) => stage(b, { armL: [-2.8, 0, 0.3], armR: [-0.45, 0, -0.25], torso: [-0.15, 0, 0], head: [-0.2, 0, 0] }, { armL: [-1.55, 0, 0.05], armR: [-1.4, 0, -0.05], torso: [0.15, 0, 0], head: [0.05, 0, 0] }, t, th, d);
  // both hands conducting the turrets (Dodge Counter, Quick Assist, Assist Follow-Up)
  POSE.sdBarrage = (b, t, th, d) => add(stage(b, { armL: [-1.2, 0.3, 0.6], armR: [-1.2, -0.3, -0.6] }, { armL: [-1.6, -0.2, 0.3], armR: [-1.6, 0.2, -0.3], torso: [0.08, 0, 0] }, t, th, d), { armL: [Math.sin(t * 18) * 0.07, 0, 0], armR: [-Math.sin(t * 18) * 0.07, 0, 0] });
  POSE.sdParry = b => add(b, { armL: [-1.55, -0.35, 0.15], armR: [-1.55, 0.35, -0.15], torso: [0.12, 0, 0], hipsY: -0.04 });
  /* SEED SR. (on the mech's rig: the same part names) */
  const AIMM = { armL: [-1.5, 0, 0.12], armR: [-1.5, 0, -0.12] }, RECOIL = { armL: [0.2, 0, 0], armR: [0.2, 0, 0], torso: [-0.05, 0, 0] };
  const SMASH_UP = { armL: [-3.0, 0, 0.3], armR: [-3.0, 0, -0.3], torso: [-0.25, 0, 0], legL: [-0.9, 0, 0], legR: [0.3, 0, 0] };
  const SMASH_DN = { armL: [-0.8, 0, 0.25], armR: [-0.8, 0, -0.25], torso: [0.6, 0, 0], head: [-0.3, 0, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], hipsY: -0.18 };
  const sweepAt = t => -0.45 + 0.9 * clamp((t - DF1_T[0]) / (DF1_T[DF1_T.length - 1] - DF1_T[0]), 0, 1);   // Downfall's sweep (radians from the aim)
  // Slaughter: the fist drawn back, then the charged punch
  POSE.srPunch = (b, t, th, d) => stage(b, { armR: [0.55, 0.3, -0.5], armL: [-0.9, 0, 0.35], torso: [-0.05, 0.75, 0], legL: [-0.35, 0, 0], legR: [0.25, 0, 0], hipsY: -0.06 },
    { armR: [-1.7, -0.25, 0.15], armL: [0.35, 0, 0.3], torso: [0.25, -0.65, 0], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], hipsY: -0.14 }, t, th, d);
  // Downfall: sweeping shots, the body swinging across the aim; then the jump, both fists up, and the smash
  POSE.srDownfall = (b, t, th, d) => {
    if (t < DF2_T) { const k = clamp(t / 0.2, 0, 1); return add(b, plus(times(AIMM, k), { torso: [0.1, sweepAt(t) * k, 0] }, times(RECOIL, spike(t, DF1_T)))); }
    return stage(b, SMASH_UP, SMASH_DN, t - DF2_T, DF2_HIT - DF2_T, d - DF2_T);
  };
  // the EX: flying, leaning forward, arms out, legs trailing (Seed on its back)
  POSE.srFly = (b, t) => add(b, { tilt: 0.55, armL: [-1.0, 0, 0.35], armR: [-1.0, 0, -0.35], legL: [0.55, 0, 0.12], legR: [0.75, 0, -0.12], head: [-0.45, 0, 0], torso: [0, 0, Math.sin(t * 3) * 0.05], hipsY: Math.sin(t * 4) * 0.03 });
  POSE.srCannon = (b, t) => add(b, plus({ tilt: 0.3 * (1 - clamp((t - 0.45) / 0.3, 0, 1)) }, AIMM, times(RECOIL, spike(t, AWAY_T, 0.08))));
  // the Chain Attack: Seed in its left arm, the right firing
  POSE.srChain = (b, t) => add(b, plus({ armL: [-1.45, 0.3, 0.25], armR: [-1.55, -0.1, -0.12], torso: [-0.06, 0, 0] }, times({ armR: [0.3, 0, 0], torso: [-0.05, 0, 0] }, spike(t, CH_T.concat([CH_HIT - 0.3]), 0.12))));
  // the Ultimate: arms up as the missiles and rockets go, then the jumping smash
  POSE.srUlt = (b, t, th, d) => t < ULT_LEAP ? add(b, plus({ armL: [-2.4, 0, 0.55], armR: [-2.4, 0, -0.55], torso: [-0.15, 0, 0], head: [-0.3, 0, 0] }, times(RECOIL, spike(t, ULT_M.concat(ULT_R), 0.1))))
    : stage(b, SMASH_UP, SMASH_DN, t - ULT_LEAP, ULT_HIT - ULT_LEAP, d - ULT_LEAP);
  for (const k in POSE) ACT[k] = (b, t, th, d) => POSE[k](add(b, NEUT), t, th, d);

  /* ------------------------------------------------------------- effects --
     sdWheel: her steel wheel, thrown spinning (out and back; on a curve for
     Withered in Frost). sdPods: her two turret pods hover beside her
     (yellow-orange and black, a blue nozzle); sdBeam: their pink-white lasers
     converging on the target in blue lightning. sdMech: into the mech, which
     materialises from a blue hologram (Seed rides on it or sits in its arms).
     sdMissiles: missiles from its back (rain: rockets falling from the sky);
     sdBoom: their electric blasts. sdPunch, sdSweep, sdCannon: the mech's
     punch, Downfall's sweeping shots, its cannon. sdBarrier: the hologram
     barrier of her parry. Streams: sdCharge (lightning gathering at the
     fist), sdJets (its blue thrusters). */
  const _v = new THREE.Vector3();
  const aim = (a, A, tgt, d) => tgt ? { x: tgt.x, z: tgt.z } : { x: a.x + Math.sin(A.dir) * (d || 4), z: a.z + Math.cos(A.dir) * (d || 4) };
  let wheelProto = null, podProto = null;
  function wheelObj() {
    if (!wheelProto) {
      const g = new VX.Grid();
      for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) { const r = Math.hypot(x, z); if (r <= 3.4) g.set(x, 0, z, r < 1.2 ? CHAS : r < 2.4 ? 0xc8ccd0 : 0x8a9096); }
      for (const [x, z] of [[0, 4], [0, -4], [4, 0], [-4, 0], [3, 3], [-3, 3], [3, -3], [-3, -3]]) g.set(x, 0, z, 0xc8ccd0);   // the petal teeth (a chrysanthemum)
      g.set(0, 1, 0, CHASD); g.set(0, -1, 0, CHASD);
      wheelProto = VX.object(g, 0.07, { cast: false });
    }
    return wheelProto.clone();
  }
  function podObj() {
    if (!podProto) {
      const g = new VX.Grid();
      g.box(-2, -2, -2, 2, 3, 2, (x, y, z) => z === 2 && y >= -1 && y <= 2 && Math.abs(x) <= 1 ? MDARK : x === -2 || y === 3 ? YEL2 : YEL);   // the yellow pod, its black face plate
      g.box(-1, -4, -1, 1, -3, 1, MDARK); g.set(0, -5, 0, G(0x9ad8ff));          // the nozzle underneath, glowing
      g.set(0, 1, 3, G(LASER));                                                  // the laser emitter
      podProto = VX.object(g, 0.055, { cast: false });
    }
    return podProto.clone();
  }
  CHOREO.events.sdWheel = (a, A, e, tgt) => {
    BT.sock(a, 'weapon', _v);
    const x0 = _v.x, z0 = _v.z, y0 = Math.max(0.6, _v.y), T = aim(a, A, tgt, e.len || 4.5), dur = e.dur || 0.4, o = wheelObj();
    o.position.set(x0, y0, z0);
    FX.custom(o, dur, (k, dt2) => {
      o.rotation.y += dt2 * 30;
      const out = e.back ? Math.sin(k * PI) : k, fx = e.back ? a.x : x0, fz = e.back ? a.z : z0;
      let px = lerp(fx, T.x, out), pz = lerp(fz, T.z, out);
      if (e.curve) { const dx = T.z - z0, dz = -(T.x - x0), L = Math.hypot(dx, dz) || 1, s = Math.sin(k * PI) * e.curve; px += dx / L * s; pz += dz / L * s; }
      o.position.set(px, y0, pz);
      if (Math.random() < 0.7) FX.p({ x: px, y: y0, z: pz, life: 0.25, size: 0.09, size1: 0.02, col: U.pick(e.phys ? [0xffffff, 0xc8ccd0, 0xffe0a0] : ELEC) });
    });
    SFX.play('swing');
  };
  // the pods: one pair at a time, kept as long as her moves want them (a.sdPods.until), gone when she leaves the field
  function pods(a, dur) {
    const B = BT.B; if (!B) return;
    if (a.sdPods && a.sdPods.alive) { a.sdPods.until = Math.max(a.sdPods.until, B.t + dur); return; }
    const P = a.sdPods = { alive: true, until: B.t + dur, t0: B.t, L: [] };
    for (const s of [1, -1]) {
      const o = podObj();
      const place = () => {
        const B2 = BT.B, f = a.face, k = Math.min(1, (B2.t - P.t0) * 8, Math.max(0.05, (P.until + 0.15 - B2.t) * 7));
        o.position.set(a.x + Math.cos(f) * s * 0.9 + Math.sin(f) * 0.2, 1.5 + (a.airY || 0) + Math.sin(B2.real * 5 + s) * 0.06, a.z - Math.sin(f) * s * 0.9 + Math.cos(f) * 0.2);
        o.rotation.y = f; o.scale.setScalar(Math.max(0.05, k));
      };
      place(); P.L.push(o);
      FX.custom(o, 60, () => {
        const B2 = BT.B;
        if (!B2 || !P.alive || B2.t > P.until + 0.15 || !a.obj.visible) { P.alive = false; if (a.sdPods === P) a.sdPods = null; FX.kill(o); return; }
        place();
      });
      FX.glow(o.position.x, o.position.y, o.position.z, 0.9, HOLO, 0.2);
    }
  }
  CHOREO.events.sdPods = (a, A, e) => pods(a, e.dur || 1);
  CHOREO.events.sdBeam = (a, A, e, tgt) => {
    const B = BT.B, T = aim(a, A, tgt, e.len || 5), P = a.sdPods && a.sdPods.alive ? a.sdPods.L : null, w = e.big ? 1.6 : 1;
    const end = new THREE.Vector3(T.x, 0.9, T.z), from = P ? P.map(o => o.position.clone()) : [new THREE.Vector3(a.x, 1.5, a.z)];
    for (const p of from) { FX.beam(p, end, LASER, 0.14 * w, 0.2); FX.beam(p, end, 0xffffff, 0.05 * w, 0.14); FX.glow(p.x, p.y, p.z, 0.7 * w, LASER, 0.12); }
    FX.glow(end.x, end.y, end.z, 1.4 * w, 0x9ad8ff, 0.2, { size1: 2.2 * w });
    FX.burst(end.x, end.y, end.z, Math.round(14 * w), { col: ELEC, speed: 5, size: 0.08, life: 0.3 });
    if (e.big) { FX.named('bolt', { x: end.x, z: end.z, r: 2 }); B.cam.shake = Math.max(B.cam.shake, 0.15); }
    SFX.play(e.big ? 'boom' : 'shot');
  };
  function holo(a, big) {
    const y0 = a.airY || 0, h = big ? 2.8 : 1.8;
    FX.glow(a.x, 1.3 + y0, a.z, big ? 3.6 : 2.4, HOLO, 0.3, { size1: big ? 5 : 3.5 });
    for (let i = 0; i < 40; i++) FX.p({ x: a.x + rnd(-1, 1), y: y0 + rnd(0.1, h), z: a.z + rnd(-1, 1), vy: rnd(0.5, 2), life: rnd(0.3, 0.6), size: 0.1, size1: 0.02, col: U.pick([HOLO, 0xffffff, 0x5ec8ff]) });
    FX.ring(a.x, a.z, 0.3, big ? 2.4 : 1.6, HOLO, 0.35);
  }
  // into the mech (the move's sdMech says where Seed is); out again when the move ends (CHOREO.end, the BACK event below)
  CHOREO.events.sdMech = (a, A, e) => {
    const was = a.rig;
    CHOREO.swapRig(a, 'seedSr');
    const P = a.rig.parts;
    if (P.rider) P.rider.visible = e.ride === 'rider';
    if (P.held) P.held.visible = e.ride === 'held';
    if (was !== a.rig) holo(a, true);
  };
  CHOREO.events.sdMissiles = (a, A, e, tgt) => {
    const T = aim(a, A, tgt, 5), n = e.n || 6, tt = e.T || 0.35, back = a.face + PI;
    if (e.rain) {   // a meteor shower of rockets, from high above
      for (let i = 0; i < n; i++) { const x1 = T.x + rnd(-2.4, 2.4), z1 = T.z + rnd(-2.4, 2.4), dx = rnd(-2, 2), dz = rnd(-2, 2); FX.p({ x: x1 + dx, y: 9, z: z1 + dz, vx: -dx / tt, vy: -8.7 / tt, vz: -dz / tt, life: tt, size: 0.3, size1: 0.12, col: U.pick(MISS) }); }
      return;
    }
    const x0 = a.x + Math.sin(back) * 0.4, z0 = a.z + Math.cos(back) * 0.4, y0 = 2.4 + (a.airY || 0), g = 16;
    for (let i = 0; i < n; i++) {
      const x1 = T.x + rnd(-1.6, 1.6), z1 = T.z + rnd(-1.6, 1.6), sx = x0 + rnd(-0.5, 0.5), sz = z0 + rnd(-0.5, 0.5);
      FX.p({ x: sx, y: y0, z: sz, vx: (x1 - sx) / tt, vy: (0.3 - y0) / tt + g * tt / 2, vz: (z1 - sz) / tt, g, life: tt, size: 0.2, size1: 0.1, col: U.pick(MISS) });
    }
    FX.glow(x0, y0, z0, 1.2, 0xffc060, 0.15);
    SFX.play('shot');
  };
  CHOREO.events.sdBoom = (a, A, e, tgt) => {
    const B = BT.B, T = aim(a, A, tgt, 4), r = e.r || 2.6;
    FX.burst(T.x, 0.7, T.z, e.small ? 16 : e.big ? 70 : 36, { col: [0xffffff, 0xffe0a0, 0x5ec8ff, 0x9ad8ff, 0xffb040], speed: e.big ? 10 : 7, size: 0.18, size1: 0.04, life: 0.6, g: 2, up: 1.4 });
    FX.ring(T.x, T.z, 0.4, r * 1.2, 0x9ad8ff, 0.45); FX.glow(T.x, 1, T.z, r * 1.3, 0x5ec8ff, 0.3, { size1: r * 2.2 });
    if (e.small) { B.cam.shake = Math.max(B.cam.shake, 0.06); return; }
    FX.named('bolt', { x: T.x, z: T.z, r }); FX.ring(T.x, T.z, 0.3, r * 0.7, 0xffffff, 0.3);
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.5 : 0.25); SFX.play('boom');
  };
  CHOREO.events.sdPunch = (a, A, e, tgt) => {
    const B = BT.B; BT.sock(a, 'weapon', _v);
    FX.glow(_v.x, _v.y, _v.z, 2.4, 0x9ad8ff, 0.25, { size1: 4 });
    for (let i = 0; i < 50; i++) { const a2 = A.dir + rnd(-0.5, 0.5), sp = rnd(8, 14); FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: Math.sin(a2) * sp, vy: rnd(-1, 1.5), vz: Math.cos(a2) * sp, drag: 2.5, life: 0.35, size: 0.14, size1: 0.03, col: U.pick(ELEC) }); }
    const T = aim(a, A, tgt, 2.5); FX.named('bolt', { x: T.x, z: T.z, r: 2.6 });
    FX.ring(a.x + Math.sin(A.dir) * 2, a.z + Math.cos(A.dir) * 2, 0.4, 3, 0x9ad8ff, 0.35);
    B.cam.shake = Math.max(B.cam.shake, 0.4); SFX.play('boom');
  };
  CHOREO.events.sdSweep = (a, A, e) => {
    BT.sock(a, 'weapon', _v);
    const d = A.dir + (e.off || 0), L = e.len || 7, p1 = new THREE.Vector3(a.x + Math.sin(d) * L, 0.6, a.z + Math.cos(d) * L);
    FX.beam(_v, p1, 0x5ec8ff, 0.18, 0.2); FX.beam(_v, p1, 0xffffff, 0.07, 0.15);
    FX.glow(_v.x, _v.y, _v.z, 1.1, 0x9ad8ff, 0.1);
    FX.burst(p1.x, 0.6, p1.z, 12, { col: ELEC, speed: 5, size: 0.09, life: 0.3 });
    SFX.play('shot');
  };
  CHOREO.events.sdCannon = (a, A, e, tgt) => {
    BT.sock(a, 'weapon', _v);
    const T = aim(a, A, tgt, 7), p1 = new THREE.Vector3(T.x + rnd(-0.4, 0.4), 0.8, T.z + rnd(-0.4, 0.4)), k = e.big ? 1.5 : 1;
    FX.glow(_v.x, _v.y, _v.z, 1.3 * k, 0xffd080, 0.12, { size1: 2 * k }); FX.beam(_v, p1, 0xffc060, 0.14 * k, 0.16); FX.beam(_v, p1, 0xffffff, 0.05 * k, 0.12);
    FX.burst(p1.x, p1.y, p1.z, Math.round(14 * k), { col: [0xffffff, 0xffd080, 0x5ec8ff], speed: 5, size: 0.1, life: 0.3 });
    if (e.big) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.12);
    SFX.play(e.big ? 'boom' : 'shot');
  };
  CHOREO.events.sdBarrier = (a) => {
    const f = a.face, fx = Math.sin(f), fz = Math.cos(f), cx = Math.cos(f), cz = -Math.sin(f);
    for (let i = -6; i <= 6; i++) for (let j = 0; j < 6; j++) if (Math.random() < 0.6) FX.p({ x: a.x + fx * 0.9 + cx * i * 0.14, y: 0.3 + j * 0.25, z: a.z + fz * 0.9 + cz * i * 0.14, life: 0.35, size: 0.12, size1: 0.04, col: U.pick([HOLO, 0xffffff, 0x5ec8ff]) });
    FX.glow(a.x + fx * 0.9, 1.0, a.z + fz * 0.9, 2.2, HOLO, 0.25, { size1: 3 }); FX.ring(a.x, a.z, 0.4, 1.6, HOLO, 0.3);
  };
  CHOREO.streams.sdCharge = (a) => {
    BT.sock(a, 'weapon', _v);
    for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(0.6, 1.2); FX.p({ x: _v.x + Math.cos(an) * r, y: _v.y + rnd(-0.5, 0.5), z: _v.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 4, vz: -Math.sin(an) * r * 4, life: 0.25, size: 0.1, size1: 0.02, col: U.pick(ELEC) }); }
    if (Math.random() < 0.3) FX.glow(_v.x, _v.y, _v.z, 0.9, 0x9ad8ff, 0.08);
  };
  CHOREO.streams.sdJets = (a, A, s, dt) => {
    const back = a.face + PI, x = a.x + Math.sin(back) * 0.55, z = a.z + Math.cos(back) * 0.55, y = 1.6 + (a.airY || 0), n = Math.max(1, Math.round(dt * 90));
    for (let i = 0; i < n; i++) FX.p({ x: x + rnd(-0.25, 0.25), y, z: z + rnd(-0.25, 0.25), vx: Math.sin(back) * rnd(2, 4), vy: rnd(-3, -1.5), vz: Math.cos(back) * rnd(2, 4), drag: 2, life: 0.25, size: 0.14, size1: 0.03, col: U.pick([0x9ee2f3, 0x76bff4, 0xffffff]) });
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const evs = (...L) => [].concat(...L).sort((p, q) => p.t - q.t);        // (a move's events must run in time order)
  const MECH = ride => ({ t: 0, fx: 'sdMech', ride });
  const BACK = { t: 99, fx: 'transform', to: 'seedSr' };                    // never reached: it tells CHOREO.end to turn her back from the mech
  const AFT = 0x9ad8ff;
  set(K.basic[0], { events: [{ t: 0.12, fx: 'sdWheel', back: true, dur: 0.34, phys: true }] });
  set(K.basic[1], { events: [{ t: 0.12, fx: 'sdWheel', back: true, dur: 0.5, phys: true }] });
  set(K.basic[2], { motion: [{ t0: B3_BACK, t1: 0.46, kind: 'back', d: 1.3 }], events: [{ t: 0.02, fx: 'sdPods', dur: 0.8 }, { t: 0.22, fx: 'sdBeam' }] });
  set(K.basic[3], { stream: [{ t0: 0.08, t1: 0.34, kind: 'spark' }], events: [{ t: 0.02, fx: 'sdPods', dur: 0.9 }, { t: 0.36, fx: 'sdBeam', big: true }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.18, kind: 'fwd', d: 1.4 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFT }], events: [{ t: 0.12, fx: 'sdWheel', dur: 0.24, len: 6, phys: true }, { t: 0.16, fx: 'sdWheel', dur: 0.24, len: 6, phys: true, curve: 0.6 }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.0, side: 'auto' }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFT }],
    events: evs([{ t: 0.02, fx: 'sdPods', dur: 0.8 }], [0.2, 0.32, 0.44].map(t => ({ t, fx: 'sdBeam' })), [{ t: 0.58, fx: 'sdBeam', big: true }]) });
  set(K.special, { events: [{ t: 0.1, fx: 'sdWheel', back: true, curve: 1.8, dur: 0.5 }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 3.5 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFT }],
    events: evs([{ t: 0.02, fx: 'sdPods', dur: 0.75 }], [0.22, 0.36, 0.5].map(t => ({ t, fx: 'sdBeam' }))) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 3.5 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFT }],
    events: evs([{ t: 0.02, fx: 'sdPods', dur: 1.2 }], [0.25, 0.37, 0.49, 0.61, 0.73].map(t => ({ t, fx: 'sdBeam' })), [{ t: 0.95, fx: 'sdBeam', big: true }, { t: 0.95, fx: 'boltAt' }]) });
  set(K.assist, { events: [{ t: 0, fx: 'sdBarrier' }] });
  // the mech
  set(K.slaughter, { motion: [{ t0: 0, t1: 0.22, kind: 'fall' }, { t0: 0.42, t1: 0.55, kind: 'fwd', d: 1.4 }], stream: [{ t0: 0.1, t1: 0.52, kind: 'sdCharge' }],
    events: evs([MECH('pilot'), { t: 0.55, fx: 'sdPunch' }, { t: 0.55, fx: 'whiteFlash' }, BACK]) });
  set(K.downfall, { motion: [{ t0: DF2_T + 0.05, t1: DF2_HIT, kind: 'leap', h: 2.2, d: 0, toTarget: true }], stream: [{ t0: 0.05, t1: 0.95, kind: 'sparkRing', r: 1.8 }, { t0: DF2_T, t1: DF2_HIT, kind: 'sdJets' }],
    events: evs([MECH('pilot'), { t: 0.15, fx: 'sdMissiles', n: 8, T: 0.35 }], DF1_T.map(t => ({ t, fx: 'sdSweep', off: sweepAt(t) })), [{ t: DF2_HIT, fx: 'sdBoom', r: 3.4, big: true }, { t: DF2_HIT, fx: 'whiteFlash' }, BACK]) });
  set(K.ex, { motion: [{ t0: 0, t1: 0.3, kind: 'rise', h: 0.9 }], stream: [{ t0: 0, t1: EX_DUR, kind: 'sdJets' }],
    events: evs([MECH('rider')], EX_T.map((t, i) => ({ t: Math.max(0.05, t - 0.25), fx: 'sdMissiles', n: i ? 3 : 6, T: 0.25 })), EX_T.map(t => ({ t, fx: 'sdBoom', r: 1.6, small: true })), [BACK]) });
  set(K.away, { motion: [{ t0: 0.45, t1: 0.75, kind: 'fall' }], events: evs([MECH('rider')], AWAY_T.map(t => ({ t, fx: 'sdCannon' })), [BACK]) });
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.0 }], stream: [{ t0: 0.3, t1: 1.5, kind: 'sdJets' }],
    events: evs([MECH('held')], CH_T.map(t => ({ t, fx: 'sdCannon', big: true })), [{ t: CH_HIT - 0.3, fx: 'sdMissiles', n: 12, T: 0.3 }, { t: CH_HIT, fx: 'sdBoom', r: 3.4, big: true }, { t: CH_HIT, fx: 'whiteFlash' }, BACK]) });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 0.8 }, { t0: ULT_LEAP, t1: ULT_HIT, kind: 'leap', h: 3.0, d: 0, toTarget: true }],
    stream: [{ t0: 0.3, t1: ULT_LEAP, kind: 'sparkRing', r: 2.2 }, { t0: ULT_LEAP, t1: ULT_HIT, kind: 'sdJets' }],
    events: evs([MECH('pilot')], ULT_M.map(t => ({ t: t - 0.25, fx: 'sdMissiles', n: 6, T: 0.25 })), ULT_M.map(t => ({ t, fx: 'sdBoom', r: 2.2, small: true })),
      ULT_R.map(t => ({ t: t - 0.3, fx: 'sdMissiles', n: 8, rain: true, T: 0.3 })), ULT_R.map(t => ({ t, fx: 'sdBoom', r: 2.6, small: true })),
      [{ t: ULT_HIT, fx: 'sdBoom', r: 4.4, big: true }, { t: ULT_HIT, fx: 'whiteFlash' }, BACK]) });
})();
