/* ============================================================================
   agents/jane.js -- Jane Doe, criminal behavior specialist and consultant to
   the Criminal Investigation Special Response Team (New Eridu Public
   Security). S-Rank, Physical, Anomaly, Defensive Assist. A rat Thiren.
   Released in Version 1.1 ("Undercover R&B").
   (The hooks and helpers an Agent's file can use are listed in zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Jane Doe, Passion, the Character Intro and
   Gameplay Details tutorials, Lore, Dialogue, DMs, Voice-Overs, Fashion,
   Porcelume Daggers and Bootblades, the Quality Time events Riverside
   Whispers / Perfect Choice / Teamilk Time / Priceless Photo / Closest to
   You, the trust commissions Late Night Caller / Peace Detective /
   Conversation Topics for Sharing Noodles, the Undercover R&B episodes Poised
   to Act and Beliefs Come to Light), zzz.gachabase.net (datamine: per-hit
   multipliers, Anomaly Buildup, stats), the official Agent Mechanics clips,
   the character sheet and the "Behind the Agent" weapon art; a search
   summary of guides (Prydwen, Lootbar, Sportskeeda) for how fast the Passion
   Stream fills.

   Her kit (official):
     Basic Attack: Dancing Blades     up to 6 attacks: dagger cuts and
                                      bootblade kicks (the blades are in her
                                      shoes; her moves are figure skating's).
     Passion                          her damaging moves, Perfect Dodges and
                                      Defensive Assists build Passion Stream;
                                      full, she enters Passion: Physical Anomaly
                                      Buildup Rate +25%, and each point of
                                      Anomaly Proficiency over 120 gives 2 ATK
                                      (up to 600). In Passion her damaging
                                      moves spend the Stream, Perfect Dodges and
                                      Defensive Assists restore it; empty, it
                                      ends.
     Basic Attack: Salchow Jump       one use on entering Passion. Hold Basic:
                                      rapid attacks (hold to extend; Anti-
                                      Interrupt, 40% less DMG taken), release
                                      for the finishing strike (invulnerable).
                                      In Passion it restores Passion Stream.
     Dodge: Phantom                   two dodges that alternate, each with its
                                      own Dash Attack and Dodge Counter; in
                                      Passion she slips through enemies.
     Dash Attack: Edge Jump (a rising cut / a series of slashes)
     Dash Attack: Phantom Thrust (Passion: three rushing slashes)
     Dodge Counter: Swift Shadow (slashes and a downward thrust / a leap into
                                      three combos)
     Dodge Counter: Swift Shadow Dance (Passion: a flurry of slashes)
     Special Attack: Aerial Sweep     kicks in the air, then a sweep
     EX Special Attack: Aerial Sweep - Clearout (60 Energy)
     Chain Attack: Flowers of Sin / Ultimate: Final Curtain: she weaves
                                      through the enemies cutting, and enters
                                      Passion with a full Stream.
     Quick Assist: Dark Thorn / Lutz Jump (Passion)
     Defensive Assist: Last Defense   Assist Follow-Up: Gale Sweep
     Core Passive: Insight            her hits leave enemies Gnawed (10 s). An
                                      Assault anyone sets off on a Gnawed enemy
                                      Flinches it 5 s longer and can crit:
                                      CRIT Rate 40% + 0.16% per point of her
                                      Anomaly Proficiency, CRIT DMG 50%.
     Additional Ability: Sore Spot    with another Anomaly Agent or one of her
                                      faction: Physical Anomaly Buildup Rate
                                      +20%, +15% more on an enemy that already
                                      has an Attribute Anomaly.
   Our choices (no source gives them): the Passion Stream is 100; out of
   Passion a move fills it by its datamined Decibels / 14 (a full string plus
   a Special: about 100, as the guides say), at most 60 a move; in Passion a
   move spends 40% of that (at most 20); a Perfect Dodge gives 20, a
   Defensive Assist 25, the Salchow finisher 34 ("about a third", one guide).
   Salchow's consecutive hits: 8, over the longest hold (1.75 s). The sub-hit
   splits of the multi-hit moves. Passion's ATK is on this game's scale (x3,
   as Sunna's and Hugo's flat ATK), and her Anomaly Proficiency here stands
   for an equipped one (it is above 120). Battle.js rolls no CRIT on Anomaly
   DMG: Insight's critical Assault adds its extra 50% as a second number.
   Passing through enemies on a Passion dodge is not modelled.
   Numbers: official level-12 values x0.45 DMG, x0.6 Daze; Anomaly Buildup as
   datamined (/100); the parry's Daze is the official value.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, lerp } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // her slashes in the official clips: coral, red, rose, peach, white-hot centres
  const CORAL = 0xf09078, ROSE = 0xff8ac8, PEACH = 0xf0a878, DEEP = 0xa84860, STEEL = 0xd6ddd6;
  const SPARK = [0xffffff, 0xffd0c0, CORAL, ROSE, PEACH];
  const PS_MAX = 100, PS_CAP = 60, PS_SPEND = 0.4, PS_SPEND_CAP = 20;   // the Passion Stream (our numbers, above)
  const PD_PS = 20, DA_PS = 25, SAL_PS = 34;
  const PASSION_BU = 0.25, SORE_BU = 0.2, SORE_BU2 = 0.15;             // Physical Anomaly Buildup Rate
  const ATK_K = 3;                                                      // flat ATK onto this game's scale
  const GNAW = 10, FLINCH_UP = 5, INSIGHT_CR = 0.4, INSIGHT_CR_AP = 0.0016, INSIGHT_CD = 0.5;   // Insight (core level 7)
  const SAL_MIN = 0.45, SAL_MAX = 1.75, SAL_T = [0.15, 0.37, 0.59, 0.81, 1.03, 1.25, 1.47, 1.69];

  /* ----------------------------------------------------------------- kit --
     ps: the Passion Stream a move gives out of Passion (on its first landed
     hit); in Passion it spends PS_SPEND of it instead. */
  const BASIC = 'Basic Attack: Dancing Blades';
  const K = {
    basic: [
      { name: BASIC, anim: 'jdCutR', dur: 0.38, cancel: 0.26, reach: 1.8, range: 1.6, ps: 3, hits: [hit(0.13, 72.4, 23.0, 21.34, { arc: 140 })] },
      { name: BASIC, anim: 'jdCutL', dur: 0.42, cancel: 0.3, reach: 1.8, range: 1.6, ps: 8, hits: [hit(0.15, 125.0, 67.4, 52.06, { arc: 150 })] },
      { name: BASIC, anim: 'jdCross', dur: 0.5, cancel: 0.36, reach: 1.9, range: 1.7, ps: 11, hits: [0.14, 0.26].map(t => hit(t, 167.1 / 2, 90.3 / 2, 68.78 / 2, { arc: 160 })) },
      { name: BASIC, anim: 'jdSpinKick', dur: 0.62, cancel: 0.46, reach: 2.0, range: 1.7, ps: 20, hits: [0.18, 0.32].map(t => hit(t, 327.3 / 2, 164.7 / 2, 127.45 / 2, { shape: 'circle', at: 'self', r: 2.4 })) },
      { name: BASIC, anim: 'jdKickHi', dur: 0.5, cancel: 0.36, reach: 2.0, range: 1.7, ps: 12, hits: [hit(0.18, 197.8, 103.9, 76.71, { arc: 120, r: 2.3 })] },
      { name: BASIC, anim: 'jdLeapSpin', dur: 0.86, cancel: 0.7, reach: 2.2, range: 1.8, ps: 36,
        hits: [hit(0.3, 582.8 * 0.35, 300.1 * 0.35, 226.62 * 0.35, { shape: 'circle', at: 'self', r: 2.5 }), hit(0.48, 582.8 * 0.65, 300.1 * 0.65, 226.62 * 0.65, { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 0.9 })] },
    ],
    // Salchow Jump: the consecutive attacks (held; mech.tick ends them on release and queues the finisher)
    salchow: { name: 'Basic Attack: Salchow Jump', anim: 'jdSkate', dur: 2.3, cancel: 2.3, reach: 2.0, range: 1.6, dr: 0.4, ps: 0,
      hits: SAL_T.map(t => hit(t, 602.2 / 8, 344.7 / 8, 273.4 / 8, { shape: 'circle', at: 'self', r: 2.4, kb: 0.1 })) },
    salFin: { name: 'Basic Attack: Salchow Jump (Finishing Move)', anim: 'jdSalFin', dur: 0.8, cancel: 0.66, inv: [0, 0.75], jdGain: SAL_PS,
      hits: [hit(0.4, 323.0, 184.5, 146.56, { heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.0 })] },
    // Edge Jump: after her first dodge a rising cut, after the second a series of slashes; Phantom Thrust in Passion
    dash: { name: 'Dash Attack: Edge Jump', anim: 'jdRise', dur: 0.5, cancel: 0.38, reach: 7, ps: 6, hits: [hit(0.2, 143.0, 54.5, 32.5, { arc: 120 })] },
    dash2: { name: 'Dash Attack: Edge Jump', anim: 'jdFlurry', dur: 0.56, cancel: 0.42, reach: 7, ps: 6, hits: [0.14, 0.24, 0.34].map(t => hit(t, 143.0 / 3, 54.5 / 3, 32.5 / 3, { arc: 140 })) },
    dashP: { name: 'Dash Attack: Phantom Thrust', anim: 'jdFlurry', dur: 0.56, cancel: 0.42, reach: 7, ps: 9, hits: [0.14, 0.24, 0.34].map(t => hit(t, 209.0 / 3, 78.7 / 3, 47.48 / 3, { shape: 'line', r: 1.0, len: 3.2 })) },
    // Swift Shadow: after the first dodge, slashes then a downward thrust; after the second, a leap into three combos
    counter: { name: 'Dodge Counter: Swift Shadow', anim: 'jdCounter', dur: 0.72, cancel: 0.56, reach: 2.6, inv: [0, 0.65], ps: 21,
      hits: [hit(0.16, 683.3 * 0.4, 344.7 * 0.4, 177.67 * 0.4, { arc: 160 }), hit(0.42, 683.3 * 0.6, 344.7 * 0.6, 177.67 * 0.6, { heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 0.9 })] },
    counter2: { name: 'Dodge Counter: Swift Shadow', anim: 'jdAirCombo', dur: 0.8, cancel: 0.62, reach: 2.6, inv: [0, 0.72], ps: 21,
      hits: [0.2, 0.36, 0.52].map((t, i) => hit(t, 683.3 / 3, 344.7 / 3, 177.67 / 3, i === 2 ? { heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 0.9 } : { arc: 160 })) },
    counterP: { name: 'Dodge Counter: Swift Shadow Dance', anim: 'jdFlurry', dur: 0.72, cancel: 0.56, reach: 2.6, inv: [0, 0.66], ps: 25,
      hits: [0.14, 0.26, 0.38].map((t, i) => hit(t, 774.2 / 3, 371.8 / 3, 194.31 / 3, i === 2 ? { heavy: true, arc: 180, r: 2.6, kb: 0.8 } : { arc: 170 })) },
    special: { name: 'Special Attack: Aerial Sweep', anim: 'jdAerial', dur: 0.66, cancel: 0.5, reach: 2.2, range: 1.8, cd: 1.2, dr: 0.4, ps: 10,
      hits: [hit(0.16, 116.1 / 2, 87.5 / 2, 52.5 / 2, { arc: 120 }), hit(0.42, 116.1 / 2, 87.5 / 2, 52.5 / 2, { shape: 'circle', at: 'self', r: 2.4 })] },
    ex: { name: 'EX Special Attack: Aerial Sweep - Clearout', anim: 'jdAerial', dur: 1.05, cancel: 0.9, cost: 60, reach: 2.4, range: 1.9, inv: [0, 1.0], ps: 60,
      hits: [0.2, 0.38].map(t => hit(t, 1150.0 * 0.25, 702.4 * 0.25, 473.96 * 0.25, { arc: 130 })).concat([hit(0.7, 1150.0 * 0.5, 702.4 * 0.5, 473.96 * 0.5, { heavy: true, shape: 'circle', at: 'self', r: 3.2, kb: 1.0 })]) },
    // Flowers of Sin / Final Curtain: she cuts through the enemies back and forth, then the finishing strike (enters Passion)
    chain: { name: 'Chain Attack: Flowers of Sin', anim: 'jdChain', dur: 1.45, inv: [0, 1.45], track: 1.1,
      hits: [0.35, 0.6, 0.85].map(t => hit(t, 1266.2 * 0.2, 356.4 * 0.2, 439.46 * 0.2, { shape: 'circle', at: 'target', r: 3.0 })).concat([hit(1.12, 1266.2 * 0.4, 356.4 * 0.4, 439.46 * 0.4, { heavy: true, shape: 'circle', at: 'target', r: 3.6, kb: 1.2 })]) },
    ult: { name: 'Ultimate: Final Curtain', anim: 'jdUlt', dur: 2.4, inv: [0, 2.4], track: 1.8,
      hits: [0.5, 0.75, 1.0, 1.25].map(t => hit(t, 2941.3 * 0.1, 280.0 * 0.1, 966.58 * 0.1, { shape: 'circle', at: 'target', r: 3.6 })).concat([hit(1.85, 2941.3 * 0.6, 280.0 * 0.6, 966.58 * 0.6, { heavy: true, shape: 'circle', at: 'target', r: 4.8, kb: 1.6 })]) },
    // Last Defense: the official Daze is 407.7% on a light blow, 514.4% on a heavy one; the parry's own x1.2 on a heavy blow comes close
    assist: { name: 'Defensive Assist: Last Defense', type: 'defensive', anim: 'jdParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Gale Sweep', anim: 'jdGale', dur: 1.0, inv: [0, 0.95], ps: 60,
      hits: [hit(0.3, 692.0 * 0.35, 448.6 * 0.35, 292.92 * 0.35, { arc: 150 }), hit(0.66, 692.0 * 0.65, 448.6 * 0.65, 292.92 * 0.65, { heavy: true, arc: 220, r: 3.6, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Dark Thorn', anim: 'jdCounter', dur: 0.72, inv: [0, 0.66], ps: 21,
      hits: [hit(0.16, 239.1 * 0.4, 179.7 * 0.4, 108.33 * 0.4, { arc: 160 }), hit(0.42, 239.1 * 0.6, 179.7 * 0.6, 108.33 * 0.6, { shape: 'circle', at: 'front', r: 2.4, kb: 0.6 })] },
    // Lutz Jump: her Quick Assist in Passion (mech.tick swaps it in: a Quick Assist does not go through start)
    lutz: { name: 'Quick Assist: Lutz Jump', anim: 'jdLutz', dur: 0.66, inv: [0, 0.62], ps: 25, hits: [0.14, 0.26, 0.38].map(t => hit(t, 275.0 / 3, 206.8 / 3, 124.96 / 3, { arc: 170, kb: 0.4 })) },
  };

  /* ----------------------------------------- Passion, Insight, the rules -- */
  // Passion: each point of Anomaly Proficiency over 120 is 2 ATK, up to 600 (x3 here)
  const passionAtk = a => Math.round(Math.min(600, Math.max(0, 2 * (a.st.ap - 120))) * ATK_K);
  const insightRate = a => Math.min(1, INSIGHT_CR + INSIGHT_CR_AP * a.st.ap);
  // her Dodge Counter after a Perfect Dodge: Swift Shadow Dance in Passion, else the one of the dodge she made
  const counterDef = a => (a.jdPassion ? K.counterP : a.jdPD && a.jdPD.n === 2 ? K.counter2 : K.counter);
  function enterPassion(a, why) {
    const was = a.jdPassion;
    a.jdPassion = true; a.jdPS = PS_MAX; a.jdSal = 1;                     // one use of Salchow Jump
    BT.callout('PASSION', 'skill', 'Jane · Salchow Jump: hold Basic');
    BT.log(`Jane ${was ? 'refills her Passion Stream' : 'enters Passion'}${why ? ` (${why})` : ''}: Physical Anomaly Buildup +25%, ATK +${passionAtk(a)}. One Salchow Jump ready (hold Basic).`, 'skill');
    passionFx(a);
  }
  function exitPassion(a) {
    a.jdPassion = false; a.jdPS = 0;
    BT.log('Jane: her Passion Stream runs dry. Passion ends.', 'skill');
  }
  function gainPS(a, n) {
    if (!(n > 0)) return;
    if (a.jdPassion) { a.jdPS = Math.min(PS_MAX, a.jdPS + n); return; }
    a.jdPS = Math.min(PS_MAX, a.jdPS + n);
    if (a.jdPS >= PS_MAX) enterPassion(a);
  }
  function spendPS(a, n) {
    if (!a.jdPassion || !(n > 0)) return;
    a.jdPS -= n;
    if (a.jdPS <= 0) exitPassion(a);
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.jane = {
    id: 'jane', name: 'Jane Doe', short: 'Jane', faction: 'Criminal Investigation Special Response Team', spec: 'Anomaly', attr: 'physical', rank: 'S',
    color: '#87a1a2', color2: '#bd3249', assist: 'defensive', stance: 'bootblade',
    blurb: 'A criminal behavior specialist and Public Security\'s long-time consultant: disguise, infiltration, and a different alias every time you ask. She skates and spins through a fight on the daggers and bootblades a gang leader once paid her with, fills her Passion Stream to enter Passion and its Salchow Jump, and Gnaws her targets so that their Assault can land a critical hit.',
    // HP 7,788 x1.12, DEF 606 x1.07; ATK 880 with core on the Anomaly scale (as Miyabi's 880 -> 2,900); Anomaly
    // Proficiency 114 x2.55; CRIT 5% + 0.05, 50% + 0.3
    stats: { hp: 8720, atk: 2900, def: 648, impact: 86, ap: 290, am: 148, cr: 0.1, cd: 0.8, er: 1.2, speed: 4.9 },
    ai: { range: 1.8, dodge: 0.85, reflex: 0.68, aggr: 1.0 },
    energyMax: 120, resource: 'passion',
    core: [
      ['Core Passive: Insight', 'Her hits leave an enemy Gnawed for 10 s. When anyone in the squad sets off Assault on a Gnawed enemy, its Flinch lasts 5 s longer, and the Assault can land a critical hit: CRIT Rate 40% plus 0.16% for each point of her Anomaly Proficiency, CRIT DMG 50%.'],
      ['Passion', 'Her damaging moves, Perfect Dodges and Defensive Assists fill her Passion Stream; full, she enters Passion: Physical Anomaly Buildup Rate +25%, and each point of Anomaly Proficiency over 120 gives her 2 ATK (up to 600, x3 on this game\'s scale). In Passion her Dash Attack, Dodge Counter and Quick Assist become Phantom Thrust, Swift Shadow Dance and Lutz Jump; her damaging moves spend the Stream, Perfect Dodges and Defensive Assists refill it, and when it runs dry Passion ends. Her Chain Attack and Ultimate put her straight into Passion with a full Stream.'],
      ['Basic Attack: Salchow Jump', 'Entering Passion gives her one use. Hold Basic: she spins forward in a flurry of cuts (keep holding to make it last; she resists interruption and takes 40% less DMG), then let go for the finishing strike, invulnerable, which refills her Passion Stream.'],
      ['Dodge: Phantom', 'Two dodges that alternate, each with its own Dash Attack (Edge Jump: a rising cut, or a series of slashes) and Dodge Counter (Swift Shadow: slashes and a downward thrust, or a leap into three combos).'],
      ['Additional Ability: Sore Spot', 'With another Anomaly Agent or a member of her faction in the squad: Physical Anomaly Buildup Rate +20%, and 15% more against an enemy already suffering an Attribute Anomaly.'],
    ],
    kit: K,
    kitShow: [['Hold', 'salchow'], ['Passion', 'dashP'], ['Passion', 'counterP'], ['Passion', 'lutz']],
    rivalMoves: [{ k: 'dashP', kind: 'dash', p: 0.2, cd: 5 }],
    howto: 'Jane: her hits fill her Passion Stream (a full string and a Special about fill it; so do Perfect Dodges and Defensive Assists); full, she enters Passion: more Physical buildup, more ATK, and enhanced Dash Attack, Dodge Counter and Quick Assist, while her hits spend the Stream. Entering Passion gives her one Salchow Jump: hold Basic, keep holding to extend it, let go for the finishing strike. Her hits Gnaw enemies: an Assault on them Flinches longer and can crit. Her assist is a Defensive Assist.',
    mech: {
      init(a) { Object.assign(a, { jdPS: 0, jdPassion: false, jdSal: 0, jdPD: null, jdDodgeN: 1, jdDodgeT: -9, jdDodgeObj: null, jdAsA: null, jdSalEnd: 0, jdSore: false }); hookArm(); },
      // Sore Spot: another Anomaly Agent, or one of her faction (Zhu Yuan, Qingyi), in the squad
      squad(a, B) { a.jdSore = B.squad.some(s => s !== a && (s.def.spec === 'Anomaly' || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B;
        if (A.kind === 'counter') a.jdPD = null;
        if (A.kind === 'chain' || A.kind === 'ult') enterPassion(a, def.name.replace(/^[^:]+: /, ''));
        if (def === K.salchow) {
          a.jdSal = Math.max(0, a.jdSal - 1);
          a.jdSalEnd = B.t + rnd(1.0, SAL_MAX);                                 // (AUTO lets go somewhere in there)
          BT.log('Jane: Basic Attack: Salchow Jump.', 'skill');
        }
      },
      hit(a, v, h, A, attr) {
        const B = BT.B, t = B.t;
        // Insight: Gnawed (10 s)
        if (v.alive) { if (!(v.jdGnaw > t)) gnawFx(v); v.jdGnaw = t + GNAW; }
        // Passion and Sore Spot: a higher Physical Anomaly Buildup Rate
        if (attr === 'physical' && h.bu && v.alive) {
          let k = a.jdPassion ? PASSION_BU : 0;
          if (a.jdSore) k += SORE_BU + (v.anom && v.anom.t > 0 ? SORE_BU2 : 0);
          if (k) BT.addBuildup(a, v, 'physical', h.bu * k);
        }
        // the Passion Stream: once a move, on its first landed hit
        const d = A.def;
        if (A.data && !A.data.jdPs) {
          A.data.jdPs = true;
          if (d.jdGain) gainPS(a, d.jdGain);
          else if (d.ps) { if (a.jdPassion) spendPS(a, Math.min(PS_SPEND_CAP, Math.round(d.ps * PS_SPEND))); else gainPS(a, Math.min(PS_CAP, d.ps)); }
        }
      },
      // Passion: the ATK her Anomaly Proficiency gives her
      atkFor(a, b) { return b === a && a.jdPassion ? passionAtk(a) : 0; },
      // Insight: an Assault anyone in the squad sets off on a Gnawed enemy
      anomaly(a, src, v, type) {
        const B = BT.B, An = D.ANOMALY.assault;
        if (type !== 'assault' || !v.alive || !(v.jdGnaw > B.t) || !src || !B.squad.includes(src)) return;
        v.flinch = (v.flinch || 0) + FLINCH_UP;
        if (Math.random() >= insightRate(a)) return;
        const an = v.anom, base = BT.anomalyDamage(src, v, An.burst, An.attr, an && an.atk, an && an.ap);
        const dmg = Math.max(1, Math.round(base * INSIGHT_CD));
        BT.hurtEnemy(v, dmg, { attr: 'physical', src, big: true, crit: true, cls: 'anom' });
        BT.log(`Insight: the Assault on the Gnawed ${v.def.name} is a critical hit (+${U.fmt(dmg)}). Its Flinch lasts 5 s longer.`, 'anomaly');
        insightFx(v);
      },
      tick(a, dt, on) {
        const B = BT.B, t = B.t, A = a.act;
        if (!a.alive) return;
        // her two dodges, alternating (a new dodge within a moment of the last one is the second)
        if (a.dodge && a.dodge !== a.jdDodgeObj) {
          a.jdDodgeObj = a.dodge;
          if (!a.dodge.assist) { a.jdDodgeN = a.jdDodgeN === 1 && t - a.jdDodgeT < 1.2 ? 2 : 1; a.jdDodgeT = t; }
        }
        // a Perfect Dodge: Passion Stream, and Basic is her own Dodge Counter (resolve reads jdPD)
        if (a.counterUntil > t) { a.jdPD = { until: a.counterUntil, n: a.jdDodgeN || 1 }; a.counterUntil = 0; gainPS(a, PD_PS); }
        // a Defensive Assist (it does not go through start)
        if (A && A.kind === 'assist' && A !== a.jdAsA) { a.jdAsA = A; gainPS(a, DA_PS); }
        // in Passion her Quick Assist is Lutz Jump
        if (A && A.kind === 'quick' && A.def === K.quick && a.jdPassion && A.t < 0.15) {
          const tgt = A.tgt; BT.endAct(a); BT.startAct(a, K.lutz, { tgt, kind: 'quick' });
        }
        // Salchow Jump: let go (or the longest hold) and the finishing strike follows
        if (A && A.def === K.salchow) {
          const held = BT.isPlayer(a) ? BT.btnHeld('basic') : t < a.jdSalEnd;
          if ((!held && A.t >= SAL_MIN) || A.t >= SAL_MAX) { const tgt = A.tgt; BT.endAct(a); a.queue.unshift({ def: K.salFin, kind: 'core', tgt, delay: 0 }); }
        }
        // Passion: coral sparks round her feet; her dodges leave a phantom
        if (on && a.jdPassion && a.obj && a.obj.visible) {
          if (Math.random() < dt * 14) { const an = rnd(0, PI * 2), r = rnd(0.3, 0.8); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.1, 0.6) + (a.airY || 0), z: a.z + Math.sin(an) * r, vy: rnd(0.6, 1.4), drag: 1, life: 0.5, size: 0.09, size1: 0.02, col: U.pick(SPARK) }); }
          if (a.state === 'dodge' && Math.random() < dt * 30) FX.glow(a.x, 1.0, a.z, 1.3, ROSE, 0.22, { size1: 1.2, a: 0.5 });
        }
      },
      // Basic: after a Perfect Dodge her Dodge Counter; after a dodge her Dash Attack (which dodge, or Passion's);
      // held with a Salchow Jump to use, Salchow Jump. Everything else as usual
      resolve(a, btn, hold, c) {
        if (btn !== 'basic') return null;
        if (a.jdPD && a.jdPD.until > c.t) return { def: counterDef(a), kind: 'counter' };
        if (c.dash) return { def: a.jdPassion ? K.dashP : a.jdDodgeN === 2 ? K.dash2 : K.dash, kind: 'dash' };
        if (hold && a.jdSal > 0) return { def: K.salchow, kind: 'core' };
        return null;
      },
      // AUTO: the Dodge Counter after a Perfect Dodge; Salchow Jump to refill a Stream running low (or on a Stun)
      ai(a, tgt, B) {
        const t = B.t;
        if (a.jdPD && a.jdPD.until > t) return { btn: 'basic' };
        if (a.jdSal > 0 && (!a.jdPassion || a.jdPS <= 40 || tgt.stun > 0) && Math.random() < 0.4) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const t = B.t, n = Math.round(clamp(a.jdPS / PS_MAX, 0, 1) * 10);
        const r = [`PASSION STREAM ${'▮'.repeat(n)}${'▯'.repeat(10 - n)}${a.jdPassion ? ' · PASSION' : ''}`];
        if (a.jdPassion) r.push(`PASSION · PHYSICAL BUILDUP +25% · ATK +${passionAtk(a)}`);
        if (a.jdSal > 0) r.push('SALCHOW JUMP · HOLD BASIC');
        if (a.jdPD && a.jdPD.until > t) r.push(`BASIC: ${counterDef(a).name.replace(/^[^:]+: /, '').toUpperCase()}`);
        const v = a.lastTgt; if (v && v.alive && v.jdGnaw > t) r.push(`TARGET GNAWED ${Math.ceil(v.jdGnaw - t)}s · ASSAULT CRIT ${Math.round(insightRate(a) * 100)}%`);
        return r;
      },
    },
    town: {
      // Lumina Square: the precinct she works out of ("Lumina Square PubSec"), where her captain Zhu Yuan already
      // lives here, and four of her five Quality Time places (the riverside, the 141, the teamilk store, the monument)
      // plus Simmer Hotpot and Gravity Cinema. She loves Sixth Street, but "if it weren't for work..."
      home: 'lumina',
      // the newsstand and the monument by day; outside Simmer Hotpot and at the teamilk counter in the afternoon; the
      // cinema, instant noodles at the 141, the precinct in the evening; a night owl by the river, or off to work
      routine: ['news:read 25, mon:look 20, cafe:t 20, huddle 35', 'simmer:queue 35, tea:stool 30, huddle 35', 'cin:poster 30, 141:fridge 25, neps:gate 20, huddle 25', 'river:bench 40, river:rail 25, neps:gate 25, lum:vend 10'],
      chatter: ['Pork noodles again...?', 'Which alias today...?'],
      lines: [
        'Jane. Criminology specialist, consultant to Public Security. Want to be my research subject? ...Kidding. Mostly~',
        'Sixth Street has this calming effect on people. If it weren\'t for work, I\'d move there. But the precinct is here, and the nights are long. I like the nights.',
        'People expect me to eat fancy. I don\'t. A plain bowl of pork noodles is my comfort food, and comfort is hard to come by in this city.',
      ],
      chapters: [
        { title: 'Your pick', ask: ['Manager~ The teamilk counter here has far too many choices. I always freeze up.', 'So you choose for me. A milk tea from the 141 will do. I want to see how well you know my tastes.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'jane' }],
          scene: [['A', 'Ooh, the one you picked... I love it. You know my tastes so well~'], ['P', 'It was the only one they had.'], ['A', 'Then it was fate. Here, take a sip of mine.'], ['P', '...You\'re sure there\'s nothing in it?'], ['A', 'Manager! If I wanted to slip you something, I\'d be far subtler than milk tea. ...Kidding~']] },
        { title: 'The captain\'s calls', ask: ['Our captain takes a phone call at every dinner and sneaks off where nobody can hear. Every single day.', 'Go and ask her who it is, Manager. Purely for my research into suspicious behavior.'], steps: [{ t: 'talk', to: 'zhuyuan', reply: 'Who calls me at dinner? ...My mother. She checks that I\'ve eaten. Every day. Jane sent you, didn\'t she.' }, { t: 'talk', to: 'jane' }],
          scene: [['P', 'It\'s her mother. Checking that she\'s eaten.'], ['A', 'Hahaha! I had a whole theory once, you know. A secret affair, a double life...'], ['A', 'Then it turned out to be her mom. Honestly? The better twist.'], ['P', 'So you already knew.'], ['A', 'Of course. But watching Officer 148 go red over it is worth the whole case file.'], ['A', 'Besides you, my colleagues are the most interesting people in my life. Don\'t tell them I said that~']] },
        { title: 'Operation Hooked', ask: ['The Special Response Team has a gang cornered in a Hollow. I\'m the informant again, so naturally I go in first.', 'Put me at the head of your squad with the captain behind us, Manager. Let\'s close it before she has to read anyone their rights twice.'], steps: [{ t: 'clear', f: { enc: 'elite', lead: 'jane', with: 'zhuyuan' } }, { t: 'talk', to: 'jane' }],
          scene: [['A', 'Target down, case closed. And this time nobody had to drink a gallon of water to sweat off a sedative.'], ['P', '...What?'], ['A', 'Long story. A rookie, a pair of cuffs, a lot of water. Ask Seth sometime~'], ['A', 'The captain wants us at a commendation. I expect I\'ll have a new case by then. I always do.'], ['A', 'Good night, Manager. Sweet dreams. ...That one isn\'t a line, by the way.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, character sheet and in-game model: a
     slate-black bob (a teal cast) with blunt bangs, flicking out at the jaw,
     crimson under the back and a long low ponytail fading from black to
     crimson; pointed pink rat-Thiren ears through the hair, a copper ear
     cuff, teal eyes. A cropped grey-green bomber jacket with puffy sleeves, a
     cream fur collar and cuffs, round elbow pads with blue lights, a silver
     patch on the right sleeve, "MICE" and a black X-harness on the back; a
     black crop top, a dark red tie with a white arrow, a black strap with a
     silver D-ring; bare midriff. High-waisted black shorts, a double black
     belt with silver buckles, a red pouch at the back, a frayed hem, garters;
     sheer black-brown tights torn at the thigh and knees, a thigh band on the
     left; tall slouchy grey boots, dark studded tops, cream laces, black
     tags, red toes, thick soles (the bootblades are in them). Black
     fingerless gloves. A long grey-teal rat tail to the floor, ending in a
     kunai-like blade with a red clamp.
     PORCELUME DAGGERS ("Behind the Agent" art): ring daggers, a red ring
     guard round the knuckles, a broad grey blade with a black spine and a
     notch. She keeps them out of sight (concealment is the point, she says):
     drawn only in battle (hookArm, below). 170 cm: scale 0.072. */
  function drawDagger(g) {
    const RING = 0xc24558, RING2 = 0x972739, BLADE = 0xd6ddd6, BLADE2 = 0xa3aea5, SPINE = 0x26201d;
    for (let x = -1; x <= 1; x++) { g.set(x, 1, 2, RING); g.set(x, -1, 2, RING2); }   // the red ring guard in front of her knuckles...
    g.set(-1, 0, 2, RING); g.set(1, 0, 2, RING);                                      // ...open in the middle
    for (let y = -2; y >= -5; y--) { g.set(0, y, -1, SPINE); g.set(0, y, 0, BLADE2); g.set(0, y, 1, BLADE); }   // the broad blade below the fist, its black spine
    g.set(0, -3, 1, SPINE);                                                           // the notch
    g.set(0, -6, 1, BLADE); g.set(0, -6, 2, BLADE); g.set(0, -7, 2, BLADE2);          // the hooked tip, curving forward
  }
  {
    const SKIN = 0xfbeade, EYE = 0x597d81, LASH = 0x1a1c1e, MOUTH = 0xd08a84;
    const HAIR = 0x2e3638, HAIR2 = 0x1f2426, HAIRHI = 0x505f64, SHEEN = 0x76858c, RED1 = 0x4b171f, RED2 = 0x78283a, RED3 = 0xa03447, RED4 = 0xbd3249;
    const EAR = 0xe8a8a0, EARIN = 0xb77b72, CUFF = 0xc8604a;
    const FUR = 0xf6f2e4, FUR2 = 0xdcd5c8, JK = 0x87a1a2, JK2 = 0x6f8080, JK3 = 0x4f5c5d, PAD = 0x5b6665, LED = G(0x5aa8ff);
    const TOP = 0x1e2124, TIE = 0x571924, WHITE = 0xf2f2ee, CHOKER = 0x141618, STRAP = 0x1d2021, SILVER = 0xb8bfc7;
    const SHORTS = 0x292d32, BELT = 0x191819, FRAY = 0x586062, POUCH = 0xa0303f;
    const TIGHTS = 0x3a2e30, TIGHTS2 = 0x5a4848, BAND = 0x232528;
    const BOOT = 0x899095, BOOT2 = 0x787e82, BOOTD = 0x323338, STUD = 0x9aa0a6, LACE = 0xd0c8a8, TAG = 0x18181a, TOE = 0x923d52, SOLE = 0x46484b;
    const GLOVE = 0x272a2e, TAIL = 0x5f7272, TAIL2 = 0x455453, TIP = 0xabb2ba, TIPRED = 0xc03048;
    // a sleeve of the bomber jacket: puffy (one voxel out, s: the outer side), a round elbow pad with a blue light,
    // the cream fur cuff, a black fingerless glove
    const sleeve = s => g => {
      H.arm(g, { sleeve: JK, sleeveTo: 6, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
      const o = 2 * s;
      g.box(Math.min(s, o), -5, -1, Math.max(s, o), -1, 1, JK); g.box(-1, -5, -2, 1, -2, -2, JK2);   // the puff, out and behind
      g.box(-1, -5, -1, 1, -5, 1, JK2);                                                               // gathered at the wrist
      g.box(o, -4, -1, o, -3, 0, PAD); g.set(o, -4, 1, LED);                                          // the elbow pad, its light
      g.box(-1, -6, -1, 1, -6, 1, FUR);                                                               // the fur cuff
    };
    // a leg: the shorts at the top, a frayed hem, torn sheer tights, the tall slouchy boot
    const leg = (holes, band) => g => {
      H.leg(g, { pant: TIGHTS, boot: BOOT, bootH: 5, sole: SOLE });
      g.box(-1, -1, -1, 1, 0, 1, SHORTS); g.set(-1, -1, 1, FRAY); g.set(1, -1, 1, FRAY); g.set(0, -1, -1, FRAY);   // the shorts, a frayed hem
      g.set(0, -3, 1, TIGHTS2); g.set(0, -2, -1, TIGHTS2);                                        // the sheen on the tights
      for (const [x, y] of holes) g.set(x, y, 1, SKIN);                                          // the tears
      if (band) { g.box(-1, -2, -1, 1, -2, 1, BAND); g.set(0, -2, 2, SILVER); }                  // the thigh band, the garter's arrow clip
      g.box(-1, -4, -1, 1, -4, 1, BOOTD); g.set(-1, -4, 1, STUD); g.set(1, -4, 1, STUD);          // the boot's dark studded top
      g.box(-2, -5, -2, 2, -5, 2, BOOT2);                                                         // the slouch folding over
      g.set(0, -6, 2, LACE); g.set(-1, -7, 2, LACE); g.set(1, -7, 2, LACE);                      // cream laces criss-crossed
      g.set(-2, -6, 0, TAG); g.set(2, -6, 0, TAG); g.set(-2, -7, 0, TOE); g.set(2, -7, 0, TOE);  // the black tags, red-tipped
      g.box(-1, -8, 2, 1, -8, 2, TOE);                                                           // the red toe cap (the sole below)
    };
    MODELS.jane = H.humanoid({
      scale: 0.072, height: 28, width: 20,
      sockets: { weapon: ['daggerR', [0, -4, 1]], off: ['daggerL', [0, -4, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, SHORTS);                                                       // the high-waisted black shorts
        g.set(-2, -2, 2, STRAP); g.set(2, -2, 2, STRAP);                                          // the garter straps
        g.set(-2, -1, -3, BELT); g.set(2, -1, -3, BELT);                                          // back pockets
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 1, 1, BELT); g.set(-1, 0, 2, SILVER); g.set(1, 1, 2, SILVER);         // the double belt, its silver buckles
        g.box(-1, 0, -3, 1, 1, -3, POUCH); g.set(1, 1, -3, WHITE);                                // the red pouch at the back (her toolkit)
        g.box(-3, 2, -2, 3, 2, -1, TOP); g.box(-3, 2, 0, 3, 2, 1, SKIN);                          // a strip of bare midriff
        g.box(-3, 3, -2, 3, 6, 1, JK); g.box(-3, 3, -2, 3, 3, 1, JK2);                            // the cropped bomber jacket, its hem
        g.box(-1, 3, 1, 1, 6, 1, TOP); g.box(-1, 3, 2, 1, 5, 2, TOP);                             // the black crop top in the open front
        g.box(-2, 3, 2, -2, 5, 2, JK); g.box(2, 3, 2, 2, 5, 2, JK);                               // the jacket's fronts
        g.set(-3, 4, 1, JK3); g.set(3, 4, 1, JK3);
        g.set(0, 5, 3, TIE); g.set(0, 4, 3, TIE); g.set(0, 3, 3, WHITE); g.set(0, 2, 2, TIE);     // the dark red tie, its white arrow
        g.box(2, 4, 3, 2, 6, 3, STRAP); g.set(3, 3, 3, SILVER); g.set(3, 2, 3, SILVER);           // the black strap, the silver D-ring
        g.box(-3, 6, -2, 3, 6, 2, FUR); g.box(-3, 6, -3, 3, 6, -3, FUR2); g.set(0, 6, 2, CHOKER); // the cream fur collar, the black choker
        g.set(-2, 6, 2, FUR2); g.set(2, 6, 2, FUR2);
        for (const x of [-1, 0, 1]) g.set(x, 5, -3, WHITE);                                       // "MICE" across the back
        for (const [x, y] of [[-2, 4], [-1, 3], [1, 3], [2, 4], [-2, 3], [2, 3]]) g.set(x, y, -3, STRAP);   // the black X-harness
        g.set(0, 4, -3, RED4); g.set(0, 3, -3, WHITE);                                            // its red-and-white emblem
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 1], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 1]], sideTo: 3 });   // blunt bangs straight across
        g.box(-5, -1, -3, -5, 5, 2, HAIR); g.box(5, -1, -3, 5, 5, 2, HAIR);                       // the bob, to the jaw...
        g.box(-4, -1, -4, 4, 0, -4, HAIR2);
        g.set(-6, -1, 0, HAIR); g.set(-6, -1, 1, HAIR2); g.set(6, -1, 0, HAIR); g.set(6, -1, -1, HAIR2);   // ...its ends flicking out
        g.set(-1, 7, 2, SHEEN); g.set(1, 7, 1, HAIRHI); g.set(2, 7, 2, SHEEN); g.set(-3, 6, 3, HAIRHI);   // light on the crown
        for (const [x, y] of [[-3, 0], [-1, -1], [2, 0], [3, -1]]) g.set(x, y, -5, RED3);         // crimson under the back of the bob
        for (const s of [-1, 1]) {                                                                // pointed rat-Thiren ears through the hair
          g.set(5 * s, 3, 0, EAR); g.set(6 * s, 3, 0, EARIN); g.set(6 * s, 4, 0, EAR); g.set(7 * s, 5, 0, EAR);
        }
        g.set(6, 2, 1, CUFF);                                                                     // the copper cuff on her left ear
      },
      armL: sleeve(1),
      armR(g) { sleeve(-1)(g); g.set(-3, -1, 0, SILVER); g.set(-3, -2, 1, SILVER); g.set(-3, -2, -1, SILVER); },   // the silver spiked patch
      legL: leg([[-1, -3]], true),
      legR: leg([[-1, -2], [0, -2], [1, -3]], false),
      extra: {
        tail: {   // the long low ponytail, black at the nape fading to crimson, to her hips
          parent: 'head', at: [0, 1, -4], draw(g) {
            for (let i = 0; i < 16; i++) {
              const y = -i, col = i < 3 ? HAIR : i < 6 ? RED1 : i < 9 ? RED2 : i < 12 ? RED3 : RED4, w = i < 10 ? 1 : 0;
              if (i < 14) g.box(-w, y, -1, w, y, 0, (x) => ((x + i) % 3 === 0 && i > 3 ? (i < 9 ? RED3 : RED2) : col));
              else { g.set(-1, y, 0, RED4); g.set(1, y, -1, RED4); }                                // the ends parting
            }
            g.box(-1, 1, -1, 1, 1, 0, HAIR2);                                                      // tied at the nape
          },
        },
        tailL: {  // the rat tail: from the small of her back down to the floor, ending in a kunai-like blade
          parent: 'hips', at: [0, -1, -3], draw(g) {
            const path = [[0, 0, 0], [0, -1, -1], [0, -2, -2], [0, -3, -2], [0, -4, -3], [0, -5, -3], [0, -6, -4], [0, -7, -4], [0, -8, -5], [0, -9, -6], [0, -10, -7], [1, -10, -8], [1, -10, -9], [2, -10, -10], [2, -10, -11]];
            path.forEach(([x, y, z], i) => { g.set(x, y, z, i % 3 === 2 ? TAIL2 : TAIL); if (i < 4) g.set(x, y + 1, z, TAIL); });
            g.set(3, -10, -12, TIPRED); g.set(3, -9, -12, TIPRED);                                 // the red clamp
            g.set(3, -10, -13, TIP); g.set(4, -10, -14, TIP); g.set(4, -10, -15, TIP); g.set(5, -10, -16, TIP);   // the blade...
            g.set(3, -9, -14, TIP); g.set(4, -11, -14, TIP);                                       // ...its barbs
          },
        },
        // the ring daggers in her hands: empty here, filled in battle (hookArm)
        daggerR: { parent: 'armR', at: [0, -7, 0] },
        daggerL: { parent: 'armL', at: [0, -7, 0] },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     Her stance: light on her feet, a skater's poise, the daggers loose in
     her hands. Dancing Blades: dagger cuts right, left, both, then the
     bootblades (a spinning kick, a high kick) and a leaping spin. Salchow
     Jump spins her on one foot, arms out. */
  ANIM.READY.bootblade = { armL: [-0.55, -0.25, 0.4], armR: [-0.7, 0.25, -0.35], torso: [0.14, 0.2, 0], head: [0, -0.2, 0], legL: [-0.3, 0, 0.1], legR: [0.28, 0, -0.1], hipsY: -0.07 };
  const back = (p, b, t, d, k0) => (t < d * k0 ? p : mix(p, b, U.ease(clamp((t - d * k0) / (d * (1 - k0)), 0, 1))));
  ACT.jdCutR = (b, t, th, d) => stage(b, { armR: [-0.9, 0, -0.9], torso: [0, 0.5, 0] }, { armR: [-0.5, 0, 1.3], torso: [0.12, -0.6, 0], legL: [-0.3, 0, 0], legR: [0.2, 0, 0] }, t, th, d);
  ACT.jdCutL = (b, t, th, d) => stage(b, { armL: [-0.9, 0, 0.9], torso: [0, -0.5, 0] }, { armL: [-0.5, 0, -1.3], torso: [0.12, 0.6, 0], legR: [-0.3, 0, 0], legL: [0.2, 0, 0] }, t, th, d);
  ACT.jdCross = (b, t, th, d) => (t < 0.2 ? ACT.jdCutR(b, t, 0.14, 0.2) : ACT.jdCutL(b, t - 0.2, 0.06, d - 0.2));
  ACT.jdKickHi = (b, t, th, d) => stage(b, { legR: [0.45, 0, 0], torso: [-0.05, 0.4, 0], armL: [-0.3, 0, 0.5], armR: [0.2, 0, -0.3] }, { legR: [-2.0, 0, -0.1], torso: [-0.4, -0.2, 0], armL: [0.2, 0, 1.0], armR: [0.4, 0, -1.0], hipsY: -0.04 }, t, th, d);
  ACT.jdSpinKick = (b, t, th, d) => { const k = clamp(t / (d * 0.6), 0, 1); return add(stage(b, { legL: [0.3, 0, 0], armL: [-0.3, 0, 0.9], armR: [-0.3, 0, -0.9] }, { legL: [-1.5, 0, 0.6], armL: [-0.2, 0, 1.3], armR: [-0.2, 0, -1.3], torso: [-0.2, 0, 0] }, t, th, d), { spin: k * PI * 2, lift: 0.15 * Math.sin(k * PI) }); };
  // the string's last: up, two turns in the air, the bootblade driven down where she lands
  ACT.jdLeapSpin = (b, t, th, d) => { const k = clamp(t / 0.48, 0, 1); return add(stage(b, { armL: [-0.6, 0, 1.2], armR: [-0.6, 0, -1.2], legL: [-1.0, 0, 0], legR: [-0.5, 0, 0] }, { armR: [-0.4, 0, 1.0], armL: [-0.4, 0, -1.0], legR: [-1.6, 0, 0], legL: [0.5, 0, 0], torso: [0.3, 0, 0], hipsY: -0.1 }, t, 0.48, d), { spin: U.easeOut(k) * PI * 4 }); };
  // Salchow Jump: spinning on one foot, arms out (a whole number of turns comes back to the stance at the end)
  ACT.jdSkate = (b, t, th, d) => { const k = clamp(t / 0.15, 0, 1); return add(b, { armL: [-0.4 * k, 0, 1.35 * k], armR: [-0.4 * k, 0, -1.35 * k], legR: [-0.5 * k, 0, -0.25 * k], legL: [0.15 * k, 0, 0.05], torso: [0.08, 0, 0], spin: t * 15, lift: k * (0.1 + 0.05 * Math.sin(t * 9)) }); };
  ACT.jdSalFin = (b, t, th, d) => { const k = clamp(t / th, 0, 1); return add(stage(b, { armR: [-2.6, 0, -0.4], armL: [-2.4, 0, 0.4], legL: [-0.9, 0, 0], legR: [-0.3, 0, 0], torso: [-0.25, 0, 0] }, { armR: [-0.6, 0, 1.0], armL: [-0.6, 0, -1.0], torso: [0.45, 0, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.16 }, t, th, d), { spin: U.easeOut(k) * PI * 2 }); };
  // Edge Jump: low, then a rising cut
  ACT.jdRise = (b, t, th, d) => stage(b, { armR: [0.4, 0, -0.4], torso: [0.4, 0.3, 0], hipsY: -0.16, legL: [-0.7, 0, 0], legR: [0.5, 0, 0] }, { armR: [-2.9, 0, -0.1], armL: [-0.2, 0, 0.6], torso: [-0.3, -0.2, 0], legL: [0.2, 0, 0], legR: [-0.5, 0, 0], lift: 0.3 }, t, th, d);
  // quick cuts with both daggers, crossing and uncrossing
  ACT.jdFlurry = (b, t, th, d) => { const s = Math.sin(t * 34); return back(add(b, { armR: [-0.9 - 0.5 * s, 0, 0.6 * s], armL: [-0.9 + 0.5 * s, 0, 0.6 * s], torso: [0.15, 0.35 * s, 0], hipsY: -0.08, legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1] }), b, t, d, 0.75); };
  ACT.jdDownThrust = (b, t, th, d) => stage(b, { armR: [-2.9, 0, -0.2], armL: [-0.6, 0, 0.5], torso: [-0.25, 0, 0], lift: 0.3 }, { armR: [-0.4, 0, 0.1], armL: [-0.5, 0, 0.6], torso: [0.75, 0, 0], hipsY: -0.22, legL: [-1.0, 0, 0], legR: [0.85, 0, 0] }, t, th, d);
  ACT.jdCounter = (b, t, th, d) => (t < 0.3 ? ACT.jdFlurry(b, t, 0.16, 0.4) : ACT.jdDownThrust(b, t - 0.3, 0.12, d - 0.3));
  ACT.jdAirCombo = (b, t, th, d) => add(ACT.jdFlurry(b, t, th, d), { legL: [-0.9, 0, 0], legR: [-0.4, 0, 0], tilt: -0.15 * Math.sin(clamp(t / d, 0, 1) * PI) });
  // Aerial Sweep: kicks in the air, leaning back, then low and round with the sweep
  ACT.jdAerial = (b, t, th, d) => {
    if (t < d * 0.5) { const s = Math.sin(t * 30); return add(b, { legR: [-1.5 + 0.7 * s, 0, 0], legL: [-0.8 - 0.7 * s, 0, 0], torso: [-0.35, 0, 0], armL: [0.3, 0, 0.9], armR: [0.3, 0, -0.9], tilt: -0.25 }); }
    const q = clamp((t - d * 0.5) / (d * 0.3), 0, 1);
    return back(add(b, { legR: [-1.3, 0, -0.7], legL: [0.6, 0, 0.2], hipsY: -0.28, torso: [0.35, 0, 0], armL: [-0.3, 0, 1.2], armR: [0.2, 0, -0.6], spin: U.easeOut(q) * PI * 2 }), b, t, d, 0.85);
  };
  ACT.jdParry = b => add(b, { armL: [-1.5, -0.3, -0.5], armR: [-1.5, 0.3, 0.5], torso: [0.1, 0, 0], hipsY: -0.1, legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1] });
  ACT.jdGale = (b, t, th, d) => (t < 0.42 ? ACT.jdRise(b, t, 0.3, 0.42) : add(ACT.jdCutR(b, t - 0.42, 0.24, d - 0.42), { spin: clamp((t - 0.42) / 0.3, 0, 1) * PI * 2 }));
  // weaving through the enemies: low and fast, the daggers trailing
  ACT.jdWeave = (b, t) => add(b, { armR: [0.5, 0, -0.5], armL: [0.4, 0, 0.5], torso: [0.6, -0.2 + 0.4 * Math.sin(t * 12), 0], head: [-0.4, 0, 0], hipsY: -0.2, legL: [-1.1, 0, 0], legR: [0.8, 0, 0] });
  ACT.jdChain = (b, t, th, d) => (t < 0.95 ? ACT.jdWeave(b, t) : ACT.jdSalFin(b, t - 0.95, 0.17, d - 0.95));
  // Final Curtain: the daggers drawn, crossed; the passes; gathered; the finishing strike
  ACT.jdUlt = (b, t, th, d) => {
    if (t < 0.3) return add(b, { armL: [-1.2, -0.3, -0.3], armR: [-1.2, 0.3, 0.3], head: [0.1, 0, 0] });
    if (t < 1.35) return ACT.jdWeave(b, t);
    if (t < 1.5) return add(b, { armL: [-0.3, 0, 1.2], armR: [-0.3, 0, -1.2], torso: [0.2, 0, 0], hipsY: -0.15, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] });
    return ACT.jdSalFin(b, t - 1.5, 0.35, d - 1.5);
  };
  ACT.jdLutz = (b, t, th, d) => add(ACT.jdFlurry(b, t, th, d), { legL: [-0.8, 0, 0], legR: [0.3, 0, 0], spin: clamp(t / (d * 0.6), 0, 1) * PI * 2 });

  /* ------------------------------------------------------------- effects --
     The official clips: coral and red slashes with white-hot centres, rose
     and pink streaks, peach sparks; the Ultimate crosses the field in pink
     streaks and ends in a star of light. jdArc: a dagger cut; jdKick: a
     bootblade arc (steel, a glint); jdRing: a full turn; jdStab: a rushing
     thrust; jdDown: a downward thrust into the ground; jdMark / jdWeave: the
     streak of each pass through the enemies; jdCurtain: the finale's star;
     jdFlash: the daggers' glint. Streams: jdTrail, jdSpin (Salchow Jump). */
  const E = CHOREO.events, S = CHOREO.streams, _v = new THREE.Vector3();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shake = s => { BT.B.cam.shake = Math.max(BT.B.cam.shake, s); };
  const sparks = (x, y, z, n, sp) => FX.burst(x, y, z, n, { col: SPARK, speed: sp || 5, size: 0.08, life: 0.3, g: 1 });
  E.jdArc = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.0) + (a.airY || 0), r = e.r || 2.2, o = { tilt: e.tilt || 0, arc: e.arc || 2.4, life: 0.26, sweep: e.sweep || 1.0 };
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, CORAL, Object.assign({ width: e.big ? 0.55 : 0.36 }, o));
    FX.slash(a.x + fx * 0.3, y + 0.03, a.z + fz * 0.3, r * 0.88, dir, e.pink ? ROSE : 0xffffff, Object.assign({}, o, { width: 0.12, life: 0.2 }));
    sparks(a.x + fx * r * 0.8, y, a.z + fz * r * 0.8, e.big ? 16 : 6);
    if (e.big) shake(0.16);
  };
  E.jdKick = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.high ? 1.5 : 0.55) + (a.airY || 0), r = e.r || 2.0;
    const o = { tilt: e.tilt != null ? e.tilt : (e.high ? -1.0 : 0.1), arc: e.arc || 2.6, life: 0.24, sweep: 1.1 };
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, STEEL, Object.assign({ width: 0.3 }, o));
    FX.slash(a.x + fx * 0.3, y + 0.03, a.z + fz * 0.3, r * 0.9, dir, CORAL, Object.assign({}, o, { width: 0.14, life: 0.2 }));
    FX.glow(a.x + fx * 0.8, y, a.z + fz * 0.8, 0.9, 0xffffff, 0.1, { size1: 1.4 });           // the bootblade's glint
    sparks(a.x + fx * r * 0.8, y, a.z + fz * r * 0.8, 6);
  };
  E.jdRing = (a, A, e) => {
    const y = (e.y || 0.9) + (a.airY || 0), r = e.r || 2.4, o = { tilt: e.tilt || 0, arc: 6.1, life: 0.3, sweep: 1.6 };
    FX.slash(a.x, y, a.z, r, A.dir, CORAL, Object.assign({ width: e.big ? 0.5 : 0.34 }, o));
    FX.slash(a.x, y + 0.04, a.z, r * 0.9, A.dir, ROSE, Object.assign({}, o, { width: 0.12, life: 0.24 }));
    if (e.big || e.ground) FX.ring(a.x, a.z, 0.4, r, CORAL, 0.35, { a: 0.6 });
    for (let i = 0; i < (e.big ? 6 : 3); i++) { const an = rnd(0, PI * 2); sparks(a.x + Math.cos(an) * r * 0.9, y, a.z + Math.sin(an) * r * 0.9, 4); }
    if (e.big) shake(0.2);
  };
  E.jdStab = (a, A, e) => {
    const L = e.len || 3, fx = Math.sin(A.dir), fz = Math.cos(A.dir), y = 1.0 + (a.airY || 0), p0 = V(a.x + fx * 0.4, y, a.z + fz * 0.4), p1 = V(a.x + fx * L, y, a.z + fz * L);
    FX.beam(p0, p1, CORAL, 0.16, 0.18); FX.beam(p0.clone(), p1.clone(), 0xffffff, 0.05, 0.14);
    sparks(p1.x, y, p1.z, 6);
  };
  E.jdDown = (a, A, e) => {
    const fx = Math.sin(A.dir), fz = Math.cos(A.dir), px = a.x + fx * (e.d || 1.2), pz = a.z + fz * (e.d || 1.2);
    FX.beam(V(px, 2.0, pz), V(px, 0.1, pz), CORAL, 0.3, 0.24); FX.beam(V(px, 2.2, pz), V(px, 0.1, pz), 0xffffff, 0.12, 0.18);
    FX.ring(px, pz, 0.3, e.r || 1.8, CORAL, 0.35, { a: 0.6 });
    FX.burst(px, 0.2, pz, 16, { col: SPARK, speed: 5, size: 0.09, life: 0.35, g: 4, up: 1 });
    shake(e.big ? 0.25 : 0.14); SFX.play('heavy');
  };
  E.jdMark = (a, A) => { A.jdFrom = { x: a.x, z: a.z }; };
  E.jdWeave = (a, A, e, tgt) => {
    const f = A.jdFrom || { x: a.x - Math.sin(A.dir) * 3, z: a.z - Math.cos(A.dir) * 3 }, y = 1.0 + (a.airY || 0);
    if (Math.hypot(a.x - f.x, a.z - f.z) > 0.4) {
      FX.beam(V(f.x, y, f.z), V(a.x, y, a.z), ROSE, e.big ? 0.4 : 0.3, 0.32); FX.beam(V(f.x, y, f.z), V(a.x, y, a.z), 0xffffff, 0.1, 0.26);
      for (let i = 0; i < 18; i++) { const k = Math.random(); FX.p({ x: lerp(f.x, a.x, k), y: y + rnd(-0.3, 0.3), z: lerp(f.z, a.z, k), vy: rnd(0, 0.8), life: rnd(0.3, 0.55), size: 0.11, size1: 0.02, col: U.pick(SPARK) }); }
    }
    A.jdFrom = { x: a.x, z: a.z };
    if (tgt) { FX.slash(tgt.x, 1.0, tgt.z, 1.8, rnd(0, PI * 2), CORAL, { tilt: rnd(-0.8, 0.8), arc: 2.4, width: 0.4, life: 0.26, sweep: 1.2 }); sparks(tgt.x, 1.0, tgt.z, 10, 6); }
    shake(0.12); SFX.play('swing');
  };
  // the finale: rings on the ground, a star of light thrown out from the target
  E.jdCurtain = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 2, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 2, r = e.r || 3.2, n = e.big ? 10 : 6;
    FX.ring(x, z, 0.4, r, CORAL, 0.45, { y: 0.08 }); FX.ring(x, z, 0.3, r * 0.7, PEACH, 0.38, { y: 0.1 }); FX.ring(x, z, 0.2, r * 1.2, ROSE, 0.5, { y: 0.06, a: 0.5 });
    for (let i = 0; i < n; i++) { const an = i / n * PI * 2 + rnd(-0.2, 0.2), L = r * rnd(0.7, 1.2); FX.beam(V(x, 1.1, z), V(x + Math.cos(an) * L, 1.1 + rnd(-0.6, 1.2), z + Math.sin(an) * L), U.pick([ROSE, 0xffffff, CORAL]), 0.12, 0.3); }
    FX.glow(x, 1.2, z, r * 1.1, 0xffd0e0, 0.32, { size1: r * 2 });
    FX.burst(x, 1.0, z, e.big ? 60 : 36, { col: SPARK, speed: 8, size: 0.14, size1: 0.03, life: 0.6, g: 1, up: 1 });
    shake(e.big ? 0.45 : 0.28); SFX.play(e.big ? 'boom' : 'heavy');
  };
  E.jdFlash = a => {
    BT.sock(a, 'weapon', _v); FX.glow(_v.x, _v.y, _v.z, 1.1, 0xffffff, 0.12, { size1: 2 }); sparks(_v.x, _v.y, _v.z, 8);
    BT.sock(a, 'off', _v); FX.glow(_v.x, _v.y, _v.z, 0.9, 0xffffff, 0.1, { size1: 1.6 });
  };
  S.jdTrail = (a, A, s, dt) => {
    const n = Math.max(1, Math.round(dt * 100));
    for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.2, 0.2), y: 0.3 + rnd(0, 1.3) + (a.airY || 0), z: a.z + rnd(-0.2, 0.2), life: 0.35, size: 0.12, size1: 0.02, col: U.pick(SPARK) });
    if (Math.random() < 0.4) FX.glow(a.x, 1.0 + (a.airY || 0), a.z, 1.2, ROSE, 0.18, { size1: 1.0, a: 0.5 });
  };
  // Salchow Jump: coral spirals flung off as she turns, arcs all round her
  S.jdSpin = (a, A, s, dt) => {
    const an = BT.B.real * 14, r = s.r || 1.3;
    for (let i = 0; i < 3; i++) { const a2 = an + i * PI * 2 / 3; FX.p({ x: a.x + Math.cos(a2) * r, y: 0.4 + rnd(0, 1.0) + (a.airY || 0), z: a.z + Math.sin(a2) * r, vx: -Math.sin(a2) * 4, vz: Math.cos(a2) * 4, drag: 2, life: 0.3, size: 0.13, size1: 0.02, col: U.pick(SPARK) }); }
    if (Math.random() < dt * 8) FX.slash(a.x, 0.8 + rnd(0, 0.6), a.z, 1.8, rnd(0, PI * 2), U.pick([CORAL, ROSE]), { tilt: rnd(-0.4, 0.4), arc: 4.5, width: 0.3, life: 0.2, sweep: 2.4 });
    if (Math.random() < dt * 4) FX.ring(a.x, a.z, 0.3, 1.8, CORAL, 0.3, { a: 0.4 });
  };
  // entering Passion: rings of coral and rose at her feet, a burst rising
  function passionFx(a) {
    if (!a.obj || !a.obj.visible) return;
    FX.ring(a.x, a.z, 0.3, 2.2, CORAL, 0.45, { y: 0.08 }); FX.ring(a.x, a.z, 0.2, 1.4, ROSE, 0.4, { y: 0.1 });
    BT.sock(a, 'chest', _v); FX.glow(_v.x, _v.y, _v.z, 1.6, ROSE, 0.3, { size1: 2.6 });
    FX.burst(a.x, 0.6, a.z, 30, { col: SPARK, speed: 4, size: 0.1, size1: 0.02, life: 0.6, g: -1, up: 1 });
    SFX.play('perfect');
  }
  // Gnawed: a little bite of red sparks where it lands
  function gnawFx(v) { FX.burst(v.x, (v.height || 1.6) * 0.6, v.z, 8, { col: [0x8a2234, DEEP, 0xffffff], speed: 3, size: 0.08, life: 0.3, g: 1 }); }
  // Insight: the Assault's critical hit, a gold-white flash
  function insightFx(v) {
    const y = (v.height || 1.6) * 0.6;
    FX.glow(v.x, y, v.z, 2.2, 0xffe0a0, 0.25, { size1: 3.4 });
    FX.burst(v.x, y, v.z, 24, { col: [0xffffff, 0xf4d35e, CORAL], speed: 7, size: 0.12, size1: 0.03, life: 0.45, g: 1 });
    shake(0.2);
  }

  /* -------------------------------------------- the daggers, drawn --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Jane) her rig's empty dagger parts get the ring daggers, once: in battle
     she holds them; in town and on the squad screen they stay out of sight. */
  let PROTO = null;
  const proto = () => PROTO || (PROTO = (() => { const g = new VX.Grid(); drawDagger(g); return VX.object(g, MODELS.jane.scale, { cast: false }); })());
  function armDaggers(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.daggerR || P.daggerR.userData.armed) return;
    P.daggerR.add(proto().clone()); if (P.daggerL) P.daggerL.add(proto().clone());
    P.daggerR.userData.armed = true;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded, or at her first battle)
  let hooked = false;
  function hookArm() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'jane') armDaggers(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'jane') armDaggers(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookArm); else hookArm();

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const arc = (t, o) => Object.assign({ t, fx: 'jdArc' }, o || {});
  const kick = (t, o) => Object.assign({ t, fx: 'jdKick' }, o || {});
  const pass = (t0, t1) => ({ t0, t1, kind: 'toTarget', gap: -1.3 });      // a pass through the target, out the other side
  // Dancing Blades
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.13, kind: 'fwd', d: 0.45 }], events: [arc(0.13, { tilt: -0.5, sweep: -1.0, r: 2.0 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.4 }], events: [arc(0.15, { tilt: 0.5, r: 2.1 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.26, kind: 'fwd', d: 0.5, ease: 'lin' }], events: [arc(0.14, { tilt: -0.4, sweep: -1.0 }), arc(0.26, { tilt: 0.6, pink: true })] });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.32, kind: 'fwd', d: 0.5 }], events: [kick(0.18), kick(0.32, { tilt: -0.3 })] });
  set(K.basic[4], { motion: [{ t0: 0.02, t1: 0.18, kind: 'fwd', d: 0.5 }], events: [kick(0.18, { high: true })] });
  set(K.basic[5], { motion: [{ t0: 0.04, t1: 0.48, kind: 'leap', h: 0.9, d: 0.8 }], stream: [{ t0: 0.04, t1: 0.44, kind: 'jdTrail' }],
    events: [{ t: 0.3, fx: 'jdRing', r: 2.5 }, kick(0.48, { tilt: 0.9, r: 2.6 }), { t: 0.48, fx: 'jdDown', d: 1.3, r: 2.2 }] });
  // Salchow Jump: spinning forward, then up and down on them
  set(K.salchow, { motion: [{ t0: 0.05, t1: SAL_MAX, kind: 'fwd', d: 1.6, ease: 'lin' }], stream: [{ t0: 0.05, t1: SAL_MAX + 0.05, kind: 'jdSpin' }], events: [{ t: 0.05, fx: 'jdFlash' }] });
  set(K.salFin, { motion: [{ t0: 0, t1: 0.4, kind: 'leap', h: 1.1, d: 0.8 }], stream: [{ t0: 0, t1: 0.38, kind: 'jdTrail' }],
    events: [{ t: 0.4, fx: 'jdRing', r: 2.8, big: true, ground: true }, { t: 0.4, fx: 'dust' }, { t: 0.42, fx: 'jdCurtain', r: 2.4 }] });
  // the Dash Attacks
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: CORAL }], events: [arc(0.2, { tilt: -1.3, r: 2.2 })] });
  set(K.dash2, { motion: [{ t0: 0, t1: 0.14, kind: 'toTarget', gap: 1.0 }, { t0: 0.14, t1: 0.34, kind: 'fwd', d: 0.4 }], stream: [{ t0: 0, t1: 0.14, kind: 'afterimage', col: CORAL }],
    events: [arc(0.14, { tilt: -0.5, sweep: -1 }), arc(0.24, { tilt: 0.5 }), arc(0.34, { tilt: -0.1, pink: true })] });
  set(K.dashP, { motion: [pass(0, 0.36)], stream: [{ t0: 0, t1: 0.36, kind: 'jdTrail' }], events: [{ t: 0, fx: 'jdMark' }, { t: 0.14, fx: 'jdStab' }, { t: 0.24, fx: 'jdStab' }, { t: 0.36, fx: 'jdWeave' }] });
  // the Dodge Counters
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.1, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: ROSE }],
    events: [arc(0.16, { tilt: -0.5, sweep: -1 }), arc(0.24, { tilt: 0.5, pink: true }), { t: 0.42, fx: 'jdDown', big: true }] });
  set(K.counter2, { motion: [{ t0: 0, t1: 0.16, kind: 'toTarget', gap: 1.1 }, { t0: 0.16, t1: 0.52, kind: 'leap', h: 1.1, d: 0.3 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: ROSE }],
    events: [arc(0.2, { tilt: -0.6, sweep: -1 }), arc(0.36, { tilt: 0.6 }), { t: 0.52, fx: 'jdRing', r: 2.5, big: true }] });
  set(K.counterP, { motion: [{ t0: 0, t1: 0.12, kind: 'toTarget', gap: 1.0 }, { t0: 0.12, t1: 0.38, kind: 'fwd', d: 0.4 }], stream: [{ t0: 0, t1: 0.4, kind: 'jdTrail' }],
    events: [{ t: 0.05, fx: 'jdFlash' }, arc(0.14, { tilt: -0.5, sweep: -1 }), arc(0.26, { tilt: 0.5, pink: true }), arc(0.38, { tilt: 0, r: 2.6, big: true })] });
  // Aerial Sweep / Clearout: up, the kicks, down into the sweep
  set(K.special, { motion: [{ t0: 0.02, t1: 0.42, kind: 'leap', h: 0.7, d: 0.5 }], events: [kick(0.16, { high: true }), kick(0.24, { high: true, tilt: -0.6 }), { t: 0.42, fx: 'jdRing', y: 0.4, r: 2.4 }] });
  set(K.ex, { motion: [{ t0: 0.04, t1: 0.6, kind: 'leap', h: 1.2, d: 0.8 }], stream: [{ t0: 0.04, t1: 0.6, kind: 'jdTrail' }],
    events: [kick(0.2, { high: true }), kick(0.3, { high: true, tilt: -0.6 }), kick(0.38, { high: true, tilt: -1.2 }), { t: 0.7, fx: 'jdRing', y: 0.45, r: 3.2, big: true, ground: true }, { t: 0.7, fx: 'dust' }] });
  // Flowers of Sin: three passes through them, then the finishing strike
  set(K.chain, { motion: [pass(0.15, 0.35), pass(0.4, 0.6), pass(0.65, 0.85), { t0: 0.95, t1: 1.12, kind: 'leap', h: 1.0, d: 0, toTarget: true }], stream: [{ t0: 0.1, t1: 0.9, kind: 'jdTrail' }],
    events: [{ t: 0.12, fx: 'jdMark' }, { t: 0.12, fx: 'jdFlash' }, { t: 0.35, fx: 'jdWeave' }, { t: 0.6, fx: 'jdWeave' }, { t: 0.85, fx: 'jdWeave' }, { t: 1.12, fx: 'jdCurtain', r: 3.4 }, { t: 1.12, fx: 'whiteFlash' }] });
  // Final Curtain: back, four passes, gathered, and down on them
  set(K.ult, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 0.6 }, pass(0.32, 0.5), pass(0.55, 0.75), pass(0.8, 1.0), pass(1.05, 1.25), { t0: 1.5, t1: 1.85, kind: 'leap', h: 1.4, d: 0, toTarget: true }],
    stream: [{ t0: 0.3, t1: 1.3, kind: 'jdTrail' }, { t0: 1.35, t1: 1.5, kind: 'jdSpin', r: 1.0 }],
    events: [{ t: 0.3, fx: 'jdMark' }, { t: 0.3, fx: 'jdFlash' }].concat([0.5, 0.75, 1.0, 1.25].map(t => ({ t, fx: 'jdWeave', big: true })), [{ t: 1.85, fx: 'jdCurtain', r: 4.8, big: true }, { t: 1.85, fx: 'whiteFlash' }]) });
  set(K.assist, { events: [{ t: 0.05, fx: 'jdFlash' }] });
  // Gale Sweep: up at it, the swift cut, then the wide sweep
  set(K.followup, { motion: [{ t0: 0, t1: 0.3, kind: 'leap', h: 1.2, d: 0, toTarget: true }], stream: [{ t0: 0, t1: 0.3, kind: 'jdTrail' }],
    events: [arc(0.3, { tilt: -1.1, r: 2.4 }), arc(0.66, { r: 3.6, arc: 3.4, big: true }), { t: 0.66, fx: 'jdRing', r: 3.4, ground: true }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.16, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: ROSE }], events: [arc(0.16, { tilt: -0.5, sweep: -1 }), arc(0.24, { tilt: 0.5 }), { t: 0.42, fx: 'jdDown' }] });
  set(K.lutz, { motion: [{ t0: 0, t1: 0.12, kind: 'toTarget', gap: 1.0 }, { t0: 0.12, t1: 0.42, kind: 'leap', h: 0.9, d: 0.3 }], stream: [{ t0: 0, t1: 0.42, kind: 'jdTrail' }],
    events: [arc(0.14, { tilt: -0.5, sweep: -1 }), arc(0.26, { tilt: 0.5, pink: true }), { t: 0.38, fx: 'jdRing', r: 2.5 }] });
})();
