/* ============================================================================
   agents/alice.js -- Alice Thymefield, heiress of the Thymefield family and
   the fencer of Spook Shack. A Rabbit Thiren. S-Rank, Physical, Anomaly,
   Defensive Assist. Released in Version 2.1.

   (An Agent in her own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)
   Numbers: skill names, inputs and mechanics are the official game's.
   Multipliers are the official level-12 values scaled to this game's tuning:
   DMG x0.45, Daze x0.6; Anomaly Buildup as datamined (/100). Which hits are
   heavy is not listed by any source: the game's usual rule (string finishers,
   counters, EX, Chain, Ultimate, assist follow-ups) decides.

   Sources: Zenless Zone Zero Wiki (Alice Thymefield, Lore, Voice-Overs,
   Dialogue, DMs), zzz.gachabase.net (datamine, game data 3.3 and 3.4 beta),
   Game8, the official HoYoLAB Agent Record and the official Agent Mechanics
   intro clips (Starshine Waltz, Northern and Southern Cross, the sword).

   Her kit (official):
     Basic Attack: Celestial Overture  up to 5 forward slashes. After she
                                     triggers Assault through Anomaly Buildup,
                                     the 5th hit of her next string is
                                     enhanced.
     Basic Attack: Starshine Waltz   hold Basic with at least 1 bar of Blade
                                     Etiquette: the charge spends up to 3 bars,
                                     then a series of slashes in an area round
                                     the target (more hits per charge level).
                                     Invulnerable; gains no Blade Etiquette.
                                     The 3-stage Finishing Move sets off
                                     Polarized Assault.
     Dash Attack: Blade-Dancer's Gale   Dodge Counter: Ceremony of Swordlight
                                     (a slash and a kick)
     Special Attack: Piercing Dawn   she hurls the blade through the enemies
                                     ahead. It can trigger a Perfect Dodge;
                                     after one, Basic is the 5th hit of her
                                     string.
     EX Special Attack: Aurora Thrust (40 Energy, +10 Blade Etiquette, can
                                     trigger a Perfect Dodge): with the stick
                                     pushed forward, Northern Cross (a thrust
                                     that goes through the enemy); neutral or
                                     pulled back, Southern Cross (a back-step
                                     slash, then a thrust).
     Chain Attack: Starfall Intermission   Ultimate: Starfall Finale (+200
                                     Blade Etiquette; none from its hits)
     Quick Assist: Intertwined Stab   Defensive Assist: Parry Guard
     Assist Follow-Up: Cross Riposte
     Core Passive: Twin Rainbows of the Swordheart: while any squad member's
                                     Physical Anomaly (Assault) is on an enemy,
                                     Alice deals extra DMG every 0.95 s, 2.5%
                                     of that Anomaly's DMG. A Disorder on an
                                     enemy still in it: +18% DMG multiplier
                                     per second of it left (up to +180%).
                                     Her hits build Blade Etiquette (max 300,
                                     a bar each 100); an Assault through
                                     buildup gives +10. Polarized Assault:
                                     100% of an Assault's DMG, ignoring
                                     buildup, and it Disorders any Anomaly,
                                     Physical included. Triggering Assault
                                     raises her Physical Anomaly Buildup Rate
                                     for 30 s (25% at full core).
     Additional Ability: Mystery Hunt: with another Anomaly or Support Agent
                                     in the squad, any Disorder gives her +30
                                     Blade Etiquette, each point of Anomaly
                                     Mastery over 140 gives 1.6 Anomaly
                                     Proficiency, and she enters the battle
                                     with 300 Blade Etiquette.
   Our choices (no source gives them): how much Blade Etiquette a hit builds
   (0.3 per point of the hit's Anomaly Buildup, once per hit); how many slashes
   each Waltz stage has (3 / 5 / 8) and how its DMG splits between them; how
   the Dodge Counter, Quick Assist, EX, Chain and Ultimate split into hits.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const GOLD = 0xffc060, GOLDW = 0xfff0c0, PINKW = 0xffd8ec, PINK = 0xff9ac8;
  const PD = 0.25;                                    // the opening of Piercing Dawn and the EX in which a blow is a Perfect Dodge (our choice)
  const BMAX = 300, PER_BU = 0.3;                     // Blade Etiquette: the official cap; what a hit builds is our choice

  /* ----------------------------------------------------------------- kit -- */
  // Starshine Waltz at a charge level: slashes round the target, the last one the Finishing Move (40% of the DMG: our choice)
  const waltz = (n, count, dur, dmg, daze, bu) => {
    const fin = dur - 0.45, ts = [];
    for (let i = 0; i < count - 1; i++) ts.push(Math.round((0.36 + i * (fin - 0.48) / Math.max(1, count - 2)) * 1000) / 1000);
    const k = 0.6 / (count - 1);
    return {
      name: 'Basic Attack: Starshine Waltz', anim: 'alWaltz', dur, cancel: dur - 0.1, reach: 4.5, range: 2.4, inv: [0, dur], alBars: n, alNoBlade: true,
      hits: ts.map(t => hit(t, dmg * k, daze * k, bu * k, { shape: 'circle', at: 'target', r: 2.6 }))
        .concat([hit(fin, dmg * 0.4, daze * 0.4, bu * 0.4, { heavy: true, shape: 'circle', at: 'target', r: 2.8, kb: 0.8, alPolar: n === 3 })]),
    };
  };
  const K = {
    basic: [
      { name: 'Basic Attack: Celestial Overture', anim: 'alCut', dur: 0.42, cancel: 0.3, reach: 1.8, range: 1.6, hits: [hit(0.16, 111.2, 60.6, 29.76, { shape: 'arc', r: 2.3, arc: 130 })] },
      { name: 'Basic Attack: Celestial Overture', anim: 'alCutBack', dur: 0.44, cancel: 0.32, reach: 1.8, range: 1.6, hits: [hit(0.16, 176.0, 105.0, 52.13, { shape: 'arc', r: 2.3, arc: 130 })] },
      { name: 'Basic Attack: Celestial Overture', anim: 'alLunge', dur: 0.5, cancel: 0.36, reach: 2.4, range: 1.8, hits: [hit(0.2, 133.2, 90.7, 44.45, { shape: 'line', r: 0.8, len: 3.2 })] },
      { name: 'Basic Attack: Celestial Overture', anim: 'alDouble', dur: 0.6, cancel: 0.46, reach: 1.9, range: 1.6, hits: [0.14, 0.34].map(t => hit(t, 224.1 / 2, 157.9 / 2, 77.81 / 2, { shape: 'arc', r: 2.4, arc: 140 })) },
      { name: 'Basic Attack: Celestial Overture', anim: 'alFlourish', dur: 0.78, cancel: 0.62, reach: 2.4, range: 1.8, hits: [hit(0.34, 261.2, 197.7, 97.2, { heavy: true, shape: 'line', r: 1.0, len: 3.6, kb: 0.8 })] },
    ],
    // the enhanced 5th hit (after an Assault through buildup; also Piercing Dawn's follow-up while it is ready)
    basic5e: { name: 'Basic Attack: Celestial Overture (Enhanced 5th Hit)', anim: 'alStarStrike', dur: 0.9, cancel: 0.72, reach: 3.0, range: 2.0, hits: [hit(0.42, 437.2, 316.5, 156.0, { heavy: true, shape: 'circle', at: 'target', r: 2.2, kb: 1.0 })] },
    // Starshine Waltz: one, two or three bars
    waltz1: waltz(1, 3, 1.15, 378.1, 83.9, 78.16),
    waltz2: waltz(2, 5, 1.45, 609.1, 117.2, 109.66),
    waltz3: waltz(3, 8, 2.1, 1931.5, 296.2, 467.83),
    dash: { name: 'Dash Attack: Blade-Dancer\'s Gale', anim: 'alCut', dur: 0.5, cancel: 0.38, reach: 7, hits: [hit(0.24, 151.2, 51.5, 23.92, { shape: 'arc', r: 2.4, arc: 140 })] },
    counter: { name: 'Dodge Counter: Ceremony of Swordlight', anim: 'alSlashKick', dur: 0.75, cancel: 0.58, inv: [0, 0.65],
      hits: [hit(0.16, 568.9 * 0.45, 329.5 * 0.45, 85.16 * 0.45, { shape: 'arc', r: 2.5, arc: 150 }), hit(0.42, 568.9 * 0.55, 329.5 * 0.55, 85.16 * 0.55, { heavy: true, kb: 0.9 })] },
    special: { name: 'Special Attack: Piercing Dawn', anim: 'alThrow', dur: 0.72, cancel: 0.56, reach: 6, range: 3.2, cd: 2, inv: [PD, 0.65], alPD: PD, hits: [hit(0.3, 125.1, 84.7, 39.65, { shape: 'line', r: 0.8, len: 7 })] },
    // Aurora Thrust: K.ex is Southern Cross (neutral or back), K.exN Northern Cross (the stick forward); mech.resolve picks
    ex: { name: 'EX Special Attack: Aurora Thrust - Southern Cross', anim: 'alSouth', dur: 1.15, cancel: 1.0, cost: 40, reach: 2.6, range: 2.2, inv: [PD, 1.05], alPD: PD, alBlade: 10,
      hits: [hit(0.2, 1064.4 * 0.35, 608.8 * 0.35, 364.46 * 0.35, { shape: 'arc', r: 2.9, arc: 160 }), hit(0.62, 1064.4 * 0.65, 608.8 * 0.65, 364.46 * 0.65, { heavy: true, shape: 'line', r: 1.0, len: 5, kb: 1.0 })] },
    exN: { name: 'EX Special Attack: Aurora Thrust - Northern Cross', anim: 'alNorth', dur: 1.0, cancel: 0.85, cost: 40, reach: 6, range: 4, inv: [PD, 0.9], alPD: PD, alBlade: 10,
      hits: [hit(0.45, 920.9, 517.9, 317.06, { heavy: true, shape: 'line', r: 1.1, len: 4, kb: 1.1 })] },
    chain: { name: 'Chain Attack: Starfall Intermission', anim: 'alFlurry', dur: 1.5, inv: [0, 1.5],
      hits: [0.08, 0.28, 0.48, 0.68, 0.88].map(t => hit(t, 1332.9 * 0.1, 308.1 * 0.1, 284.34 * 0.1, { shape: 'cone', r: 3.2, arc: 120 })).concat([hit(1.14, 1332.9 * 0.5, 308.1 * 0.5, 284.34 * 0.5, { heavy: true, shape: 'line', r: 1.2, len: 6, kb: 1.2 })]) },
    ult: { name: 'Ultimate: Starfall Finale', anim: 'alFinale', dur: 2.5, inv: [0, 2.5], alBlade: 200, alNoBlade: true,
      hits: [0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(t => hit(t, 4524.7 * 0.08, 364.7 * 0.08, 722.25 * 0.08, { shape: 'circle', at: 'target', r: 4.5 })).concat([hit(2.02, 4524.7 * 0.52, 364.7 * 0.52, 722.25 * 0.52, { heavy: true, shape: 'circle', at: 'target', r: 5, kb: 1.6 })]) },
    // Parry Guard: the Light Defensive Daze (battle.js adds 20% against a heavy blow; the official Heavy value is 27% more)
    assist: { name: 'Defensive Assist: Parry Guard', type: 'defensive', anim: 'alParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(366.3) },
    followup: { name: 'Assist Follow-Up: Cross Riposte', anim: 'alRiposte', dur: 1.0, inv: [0, 0.95], hits: [hit(0.35, 666.0, 388.2, 197.17, { heavy: true, shape: 'arc', r: 2.8, arc: 170, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Intertwined Stab', anim: 'alSlashKick', dur: 0.75, inv: [0, 0.7],
      hits: [hit(0.16, 327.2 * 0.45, 220.6 * 0.45, 103.85 * 0.45, { shape: 'arc', r: 2.5, arc: 150 }), hit(0.42, 327.2 * 0.55, 220.6 * 0.55, 103.85 * 0.55, { kb: 0.6 })] },
  };

  /* ----------------------------------------------------- her mechanics -- */
  const gain = (a, n) => { a.blade = clamp((a.blade || 0) + n, 0, BMAX); };
  // which Aurora Thrust: you, the stick pushed toward the enemy (within 90 degrees of the way to her target) for
  // Northern Cross, neutral or away for Southern Cross; AUTO either one (a.alNorth, re-rolled after each EX)
  function northern(a, c) {
    if (!BT.isPlayer(a)) return !!a.alNorth;
    const I = BT.moveInput && BT.moveInput(); if (!I) return false;
    const yaw = (c.B && c.B.cam && c.B.cam.yaw) || 0;
    const dir = Math.atan2(Math.cos(yaw) * I.x - Math.sin(yaw) * I.y, -Math.sin(yaw) * I.x - Math.cos(yaw) * I.y);   // the stick's way on the floor (as ai.js reads it)
    const tgt = a.lastTgt && a.lastTgt.alive ? a.lastTgt : null, ahead = tgt ? U.ang(a, tgt) : a.face;
    return Math.abs(U.wrap(dir - ahead)) < PI / 2;
  }
  // Polarized Assault on an enemy already in Assault: Disorder all the same. battle.js only sets off Disorder between
  // two different Anomalies, so this is its Disorder step for step (BT.disorder, should the lead export it)
  function assaultDisorder(a, v) {
    const B = BT.B, old = v.anom, An = D.ANOMALY.assault;
    if (BT.disorder) { BT.disorder(a, v, old); return; }
    for (const s of B.squad) if (s.alive) BT.mech(s, 'disorder', a, v, old);
    const pct = An.disorderBase + An.disorderPerSec * Math.max(0, old.t), dmg = BT.anomalyDamage(a, v, pct, An.attr, BT.atkOf(a), a.st.ap);
    v.anom = null; B.stats.disorders++;
    BT.callout('DISORDER', 'disorder', v.def.name); BT.log(`Disorder on ${v.def.name}: ${U.fmt(dmg)}`, 'anomaly');
    BT.hurtEnemy(v, dmg, { attr: An.attr, src: a, big: true, cls: 'disorder', color: '#ffffff' });
    BT.addDaze(a, v, 200);
    FX.ring(v.x, v.z, 0.4, 3.5, 0xffffff, 0.4); FX.glow(v.x, 1.2, v.z, 3, 0xffffff, 0.3, { size1: 5 });
  }
  // Polarized Assault: a full Assault that ignores buildup (BT.triggerAnomaly), Disordering whatever Anomaly is there
  function polarize(a, v) {
    if (v.anom && v.anom.type === 'assault' && v.anom.t > 0) assaultDisorder(a, v);
    if (!v.alive) return;
    a.alPolar = true;
    try { BT.triggerAnomaly(a, v, 'assault'); } finally { a.alPolar = false; }
    BT.callout('POLARIZED ASSAULT', 'anomaly assault', v.def.name); BT.log(`Alice: Polarized Assault on ${v.def.name}!`, 'anomaly');
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.alice = {
    id: 'alice', name: 'Alice Thymefield', short: 'Alice', faction: 'Spook Shack', spec: 'Anomaly', attr: 'physical', rank: 'S',
    color: '#265daf', color2: '#e5c7a5', assist: 'defensive', stance: 'fencer',
    blurb: 'Heiress of the Thymefield family and Spook Shack\'s fencer: timid, terrified of ghost stories, devoted to perfect symmetry. Her blade builds Blade Etiquette; held Basic spends it on Starshine Waltz, a storm of slashes round the target whose three-bar finish sets off Polarized Assault.',
    stats: { hp: 8590, atk: 2800, def: 648, impact: 86, ap: 330, am: 142, cr: 0.1, cd: 0.7, er: 1.2, speed: 4.8 },
    ai: { range: 1.8, dodge: 0.8, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'blade',
    core: [
      ['Core Passive: Twin Rainbows of the Swordheart', 'While any squad member\'s Assault (Physical Anomaly) lasts on an enemy, Alice deals extra DMG every 0.95 s, 2.5% of that Assault\'s DMG. A Disorder on an enemy still in Assault gets +18% DMG multiplier for every second of it left (up to +180%). When she triggers Assault, her Physical Anomaly Buildup Rate rises 25% for 30 s, and an Assault through buildup enhances the 5th hit of her next Basic string.'],
      ['Blade Etiquette', 'Her hits build Blade Etiquette (max 300, a bar for every 100); an Assault through buildup gives 10, each EX Special 10, her Ultimate 200. With a bar, hold Basic for Starshine Waltz: it spends up to 3 bars on slashes round the target. The 3-bar Finishing Move sets off Polarized Assault, a full Assault that ignores buildup and turns any Anomaly on the enemy, Physical included, into Disorder.'],
      ['Aurora Thrust and Piercing Dawn', 'With 40 Energy, Special with the stick pushed toward the enemy is Northern Cross, a thrust that runs through it; neutral or pulled back, Southern Cross, a back-step slash and a thrust. Both, and her Special Piercing Dawn (a thrown blade), can trigger a Perfect Dodge as they start; after one on Piercing Dawn, Basic is the 5th hit of her string.'],
      ['Additional Ability: Mystery Hunt', 'With another Anomaly or Support Agent in the squad: she enters battle with 300 Blade Etiquette, gains 30 whenever the squad triggers Disorder, and each point of Anomaly Mastery over 140 gives her 1.6 Anomaly Proficiency.'],
    ],
    kit: K,
    kitShow: [['Hold', 'waltz3'], ['EX', 'exN']],
    rivalMoves: [{ k: 'waltz3', kind: 'core', p: 0.15, cd: 12 }],
    howto: 'Alice: hold Basic with a bar of Blade Etiquette for Starshine Waltz (it spends up to 3 bars; the 3-bar finish sets off Polarized Assault, which Disorders even an Assault). Special with the stick toward the enemy is Northern Cross, neutral or back Southern Cross; her Special and EX can Perfect Dodge as they start (after Piercing Dawn, Basic is her 5th hit). Her assist is a Defensive Assist: she parries.',
    mech: {
      init(a) { a.blade = 0; a.alEnh = false; a.alRate = 0; a.alDawnUntil = 0; a.alNorth = Math.random() < 0.5; a.alPolar = false; a.alHideUntil = 0; a.alHunt = false; },
      // Mystery Hunt: another Anomaly or Support Agent in the squad (AP from Anomaly Mastery over 140: the official 1.6 a point,
      // times this game's Anomaly Proficiency scale, 2.8)
      squad(a, B) {
        a.alHunt = B.squad.some(s => s !== a && (s.def.spec === 'Anomaly' || s.def.spec === 'Support'));
        if (!a.alHunt) return;
        a.blade = BMAX;
        a.st.ap += Math.round(Math.max(0, a.st.am - 140) * 1.6 * 2.8);
      },
      start(a, def, A) {
        if (def.alBars) { a.blade = Math.max(0, a.blade - def.alBars * 100); BT.log(`Alice: ${def.name} (${def.alBars} bar${def.alBars > 1 ? 's' : ''} of Blade Etiquette)`, 'skill'); if (def.alBars === 3) BT.callout('STARSHINE WALTZ', 'skill', 'Alice · three bars'); }
        if (def.alBlade) gain(a, def.alBlade);                                         // EX +10, Ultimate +200 (as they start)
        if (A.kind === 'ex') a.alNorth = Math.random() < 0.5;                           // AUTO's next Aurora Thrust: either one
        if (def === K.basic5e) a.alEnh = false;
        if (def === K.basic[4] || def === K.basic5e) a.alDawnUntil = 0;
      },
      hit(a, v, h, A, attr) {
        const B = BT.B;
        if (!A.def.alNoBlade && A.data && A.data.alLast !== h) { A.data.alLast = h; gain(a, (h.bu || 0) * PER_BU); }   // Blade Etiquette, once a hit
        if (attr === 'physical' && a.alRate > B.t && h.bu && v.alive) BT.addBuildup(a, v, 'physical', h.bu * 0.25);  // the Buildup Rate +25% after an Assault
        if (h.alPolar && v.alive) polarize(a, v);                                       // the 3-stage Waltz's Finishing Move
      },
      // an Assault she triggers: the Buildup Rate for 30 s; through buildup (not Polarized), +10 and the enhanced 5th hit
      anomaly(a, src, v, type) {
        if (type !== 'assault' || src !== a) return;
        a.alRate = BT.B.t + 30;
        if (a.alPolar) return;
        gain(a, 10);
        if (!a.alEnh) BT.log('Alice: Assault! The 5th hit of her next Basic string is enhanced.', 'skill');
        a.alEnh = true;
      },
      // any squad Disorder: Mystery Hunt's +30; on an enemy still in Assault, Twin Rainbows adds 18% a second of it left (max 180%)
      disorder(a, src, v, old) {
        if (a.alHunt) gain(a, 30);
        if (!old || old.type !== 'assault' || !(old.t > 0) || !v.alive) return;
        const by = src && src.st ? src : a, pct = Math.min(180, 18 * old.t), dmg = BT.anomalyDamage(by, v, pct, 'physical');
        BT.hurtEnemy(v, dmg, { attr: 'physical', src: by, big: true, cls: 'disorder', color: '#ffffff' });
        BT.log(`Twin Rainbows of the Swordheart: Disorder +${Math.round(pct)}% (${U.fmt(dmg)})`, 'anomaly');
      },
      tick(a, dt, on) {
        const B = BT.B, P = a.rig && a.rig.parts.sword;
        if (P && !P.visible && !(a.alHideUntil > B.t)) P.visible = true;             // her sword back in her hand (thrown, planted)
        // Twin Rainbows of the Swordheart: every 0.95 s of an Assault on an enemy (anyone's), 2.5% of its DMG again
        for (const v of B.enemies) {
          const an = v.anom; if (!v.alive || !an || an.type !== 'assault' || !(an.t > 0)) continue;
          if (an.alNext == null) { an.alNext = B.t + 0.95; continue; }
          if (B.t < an.alNext) continue;
          an.alNext += 0.95;
          BT.hurtEnemy(v, BT.anomalyDamage(a, v, D.ANOMALY.assault.burst * 0.025, 'physical', an.atk, an.ap), { attr: 'physical', src: a, cls: 'tick', dy: -0.3 });
        }
      },
      // a blow in the opening of Piercing Dawn or an Aurora Thrust is a Perfect Dodge (their invulnerability starts after it);
      // after Piercing Dawn's, Basic is the 5th hit of her string instead of the Dodge Counter
      incoming(a, e, h) {
        const B = BT.B, A = a.act;
        if (!A || !A.def.alPD || A.t > A.def.alPD) return false;
        if (!A.data.alPD) {
          A.data.alPD = true;
          a.dodge = { t0: B.t, until: B.t + 0.3 };                                     // (BT.perfectDodge marks it done: the rest of the blow misses her)
          BT.perfectDodge(a, e, false);
          if (A.def === K.special) { a.counterUntil = 0; a.alDawnUntil = B.t + 1.6; BT.log('Alice: Piercing Dawn! Basic follows up with the 5th hit.', 'skill'); }
        } else if (BT.T.dmgNumbers) FX.number(a.x, a.height, a.z, 'MISS', 'miss');
        return true;
      },
      // Special: with the Energy, the Aurora Thrust the stick asks for. Held Basic with a bar: Starshine Waltz. The hold cannot
      // measure how long it is held, so it charges to as many bars as she has (up to 3) at once and slashes (our choice).
      // Basic after Piercing Dawn's Perfect Dodge, or at the 5th step after an Assault through buildup: the 5th hit (enhanced)
      resolve(a, btn, hold, c) {
        if (btn === 'special') return a.energy >= K.ex.cost ? { def: northern(a, c) ? K.exN : K.ex, kind: 'ex' } : null;
        if (btn !== 'basic') return null;
        if (a.alDawnUntil > c.t) return { def: a.alEnh ? K.basic5e : K.basic[4], kind: 'basic', step: 4 };
        if (c.dash) return null;
        if (hold && a.blade >= 100) return { def: K['waltz' + Math.min(3, Math.floor(a.blade / 100))], kind: 'core' };
        const step = c.step != null ? c.step : c.t - a.lastBasic > 0.9 ? 0 : a.combo;
        if (step % K.basic.length === 4 && a.alEnh) return { def: K.basic5e, kind: 'basic', step };
        return null;
      },
      // AUTO: the 5th hit after Piercing Dawn's Perfect Dodge; with three bars, the Waltz (at once on an Anomaly or a Stun)
      ai(a, tgt, B) {
        if (a.alDawnUntil > B.t) return { btn: 'basic' };
        if (a.blade >= BMAX && (tgt.anom || tgt.stun > 0 || Math.random() < 0.35)) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const n = Math.floor(a.blade / 100), r = [`BLADE ETIQUETTE ${'◆'.repeat(n)}${'◇'.repeat(3 - n)} ${Math.floor(a.blade)}`];
        if (a.alEnh) r.push('ENHANCED 5TH HIT');
        if (a.alDawnUntil > B.t) r.push('BASIC: 5TH HIT');
        if (a.alRate > B.t) r.push(`PHYSICAL BUILDUP +25% ${Math.ceil(a.alRate - B.t)}s`);
        return r;
      },
    },
    town: {
      routine: ['cafe:t 35, bardic:window 20, box:statue 15, huddle 30', 'box:claw 30, 141:icecream 20, news:read 15, huddle 35', 'soup:stool 35, gf:flags 15, huddle 50', 'rp:window 45, rp:door 25, alley:lean 30'],
      chatter: ['That sign is not centred. It is not centred at all.', 'A Thymefield never runs. ...She walks very quickly.'],
      lines: [
        'Alice Thymefield, of the Thymefield family. You may call me Alice. ...You are not about to tell me a ghost story, are you?',
        'Every shop sign on the left of this street is bigger than the one across from it. I noticed on my first day. I cannot stop noticing.',
        'Random Play has a whole shelf of horror films. I have watched every one of them. Mostly through my fingers.',
      ],
      chapters: [
        { title: 'Price tags', ask: ['Proxy... may I ask something embarrassing? The three Bangboo at the 141 would not take my card. Or my, um, rather large note.', 'Would you buy me a hot milk tea? I shall repay you. Generously.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'alice' }],
          scene: [['A', 'Thank you! How much do I owe you? A thousand Denny? Two?'], ['P', 'Nine.'], ['A', 'N-nine? But the cup is perfectly round. Surely that alone costs more.'], ['A', '...I shall remember "nine". Our maid says I read price tags badly. She may be a little bit right.']] },
        { title: 'Bins in the night', ask: ['Something opens the bins behind the shops every night. Mrs. Yani says so. Every single night.', 'I am not frightened! I am... investigating. For Spook Shack. Would you ask her what she has seen?'], steps: [{ t: 'talk', to: 'yani', reply: 'A ghost? It\'s that cat, Cookie! Into the bins every night, and every morning I\'m the one cleaning up.' }, { t: 'talk', to: 'alice' }],
          scene: [['P', 'It\'s Cookie. The cat.'], ['A', 'A cat. Not a vengeful spirit. A cat.'], ['A', '...Good! Wonderful. What a relief. I am very relieved.'], ['P', 'You sound a bit disappointed.'], ['A', 'I am not! ...Yuzuha will laugh if I report a cat. Let us file it as unsolved.']] },
        { title: 'A flawless bout', ask: ['Arnold taught me that a duel is a dance, and that a dance must be flawless.', 'Put me at the front of your squad in a Hollow, Proxy, and let us clear it with an S rank. Anything less would not be symmetrical.'], steps: [{ t: 'clear', f: { enc: 'elite', lead: 'alice', rank: 'S' } }, { t: 'talk', to: 'alice' }],
          scene: [['A', 'An S rank. Flawless. Father would have called that a good bout.'], ['P', 'You were amazing out there.'], ['A', 'I-I was adequate! The form was correct, that is all.'], ['A', '...Thank you, Proxy. For the Thymefield name. And for me.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official splash art and the in-game model: pale golden-blonde
     hair with blunt bangs, an ahoge and a braid along each side of the head;
     tall upright rabbit ears, blonde with pink insides; heterochromia, her
     right eye red and her left amber. A white sphere printed "Alice" with a
     small curled red ribbon at each side of her jaw, where two very long low
     twintails start: they fall to her knees, tied near the end with red
     "Alice" cylinders, and curl at the tips with a faint pink. A white
     collared blouse with puffed sleeves and strapped cuffs, a badge patch on
     her right upper arm, a dark grey bow tie, a red twisted cord looped twice
     across the chest with a silver clasp, a dark shoulder harness with a
     green-lit device; a black belt with a grey module (a gold hexagon smiley,
     three yellow-green lenses), a cable and a white strap with a red mark
     hanging down the front, a dark-blue holster bracket at the hip. A slate
     teal pleated skirt to mid-thigh, black sheer tights with X-shaped straps
     on the thighs, black fingerless gloves, chunky white sneakers with red
     trim and thick red bolted ankle cuffs, and a short fluffy rabbit tail.
     Her fencing sword: a long thin steel blade, a blue bell guard and a big
     curved blue D-shaped knuckle bow with white lettering, a silver grip.
     163 cm with the ears: a little shorter than 0.07 without them (our
     choice: 0.067). */
  {
    const HAIR = 0xe5c7a5, HAIRHI = 0xf7e3c1, HAIR2 = 0xd3ae86, TIPPK = 0xe9c0b2, EARPK = 0xf6a99c, SKIN = 0xfbe8dc;
    const EYER = 0xd35646, EYER2 = 0xe8826e, EYEL = 0xcf7839, EYEL2 = 0xe8aa52;
    const WHITE = 0xe7ebef, WHITE2 = 0xc9ced6, SPH = 0xe0e4e8, SPH2 = 0xbbc0c5, RED = 0xba3e3d, RED2 = 0xd4605c, CORD = 0x90282b;
    const BOW = 0x5c6265, BOW2 = 0x45494c, HARNESS = 0x2a2a30, BELT = 0x1e1e22, MOD = 0x5a5e66, MOD2 = 0x3a3d44, LENS = G(0xd1e724), HEXG = G(0xdca162), LED = G(0x5aff6a);
    const STRAPW = 0xeef0f2, CABLE = 0x4a4d54, HOLSTER = 0x15284b, CUFF = 0xd4d8de, PATCH = 0x8a6a4a, GOLDP = 0xdca162, BTN = 0xa0a6b0;
    const SKIRT = 0x4f6162, SKIRT2 = 0x3e4d50, SKIRT3 = 0x2e333f, TIGHTS = 0x312827, XSTRAP = 0x6e6a70, GLOVE = 0x38323c;
    const SHOE = 0xf1f5f7, SHOE2 = 0xc8ccd2, SHOERED = 0xb43839, SILVER = 0xc8ccd4, BLUE = 0x265daf, BLUE2 = 0x1c4a8e, STEEL = 0x8a929e, STEEL2 = 0xc0c8d4;
    const arm = s => g => {
      H.arm(g, { sleeve: WHITE, sleeveTo: 6, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
      g.box(-2, -4, -2, 2, -2, 2, (x, y, z) => y === -4 || z === -2 ? WHITE2 : WHITE);   // the puffed sleeve...
      g.box(-1, -5, -1, 1, -5, 1, CUFF); g.set(s * 2, -5, 0, BELT);                    // ...gathered at a strapped cuff
      g.box(-1, -8, -1, 1, -8, 1, SKIN);                                                // fingers out of the fingerless gloves
    };
    const leg = s => g => {
      H.leg(g, { pant: TIGHTS, boot: SHOE, bootH: 3, sole: SHOE2 });
      for (const [x, y] of [[-1, -1], [1, -1], [0, -2], [-1, -3], [1, -3]]) g.set(x, y, 2, XSTRAP);   // the X-shaped strap patch on the thigh
      g.box(-1, -6, -2, 1, -5, 2, SHOERED); g.box(s * 2, -6, -1, s * 2, -5, 1, SHOERED); g.set(s * 2, -6, 0, SILVER);   // the thick red ankle cuff, bolted
      g.box(-s, -9, -1, s * 2, -9, 2, SHOE2);                                             // the chunky sole
      g.set(0, -8, 2, SHOERED); g.box(-1, -7, -1, 1, -7, -1, SHOERED);                    // red trim at the toe and the heel
    };
    // a twintail (s = 1: her left, +X): from behind the sphere down to her knees, a red tie near the end, the tip curling
    const twin = s => g => {
      for (let i = 0; i < 15; i++) {
        const x = s * (i < 10 ? Math.sin(i * 0.32) * 0.8 : (i - 10) * 0.35), y = -i + (i > 12 ? (i - 12) * 0.5 : 0), z = i < 10 ? -Math.min(1.5, i * 0.18) : -1.5 + (i - 10) * 0.55;
        const w = i < 2 ? 1 : i < 9 ? 1.5 : 1.2;
        g.ell(x, y, z, w, 0.6, w, i > 11 ? TIPPK : i % 4 === 1 ? HAIR2 : i % 4 === 3 ? HAIRHI : HAIR);
      }
      g.cyl('y', 0, -1.5, 1.6, -10, -9, (x, y) => y === -9 ? RED2 : RED);                // the red "Alice" tie
    };
    MODELS.alice = H.humanoid({
      scale: 0.067, height: 29, width: 20,
      sockets: { weapon: ['sword', [0, 0, 18]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        const pleat = (x, y, z) => (x + z) % 3 === 0 ? SKIRT3 : (x + z) & 1 ? SKIRT : SKIRT2;
        g.box(-3, -1, -2, 3, 0, 1, SKIRT);                                                // the skirt's waistband
        g.box(-4, -3, -3, 4, -2, 2, pleat);                                               // the pleats...
        g.box(-5, -4, -4, 5, -4, 3, pleat); g.cut(-4, -4, -3, 4, -4, 2);                 // ...flaring to the hem at mid-thigh
        g.set(0, -1, 2, STRAPW); g.box(0, -3, 3, 0, -2, 3, STRAPW); g.box(0, -6, 4, 0, -4, 4, STRAPW); g.set(0, -6, 4, RED);   // the white strap down the front, a red mark at its end
        g.set(1, -1, 2, CABLE); g.box(1, -3, 3, 1, -2, 3, CABLE); g.set(1, -4, 4, 0xd8c84a);                         // a cable from the module
        g.set(-4, -1, 0, HOLSTER); g.box(-5, -3, -1, -5, -2, 1, HOLSTER); g.set(-5, -2, 2, HOLSTER);                  // the dark-blue holster bracket at her right hip
        g.ell(0, -2, -4, 1, 1, 0.6, HAIRHI);                                              // her short fluffy rabbit tail
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, WHITE);                 // the white collared blouse
        g.box(-3, 0, -2, 3, 0, 1, BELT);                                                  // the black belt
        g.box(-2, 0, 2, 2, 1, 2, MOD); g.box(-1, 0, 3, 1, 1, 3, MOD2);                     // the mechanical module on it...
        g.set(0, 1, 4, HEXG); g.set(-2, 1, 3, LENS); g.set(2, 1, 3, LENS); g.set(0, 0, 4, LENS);   // ...a gold hexagon smiley, three yellow-green lenses
        g.set(0, 2, 2, BTN);
        g.box(-2, 5, 2, 2, 5, 2, BOW); g.set(0, 5, 3, BOW2);                               // the dark grey bow tie...
        g.set(-1, 6, 2, WHITE); g.set(1, 6, 2, WHITE);                                     // ...under the collar points
        // the red twisted cord looped twice across the chest, a silver clasp between the loops
        for (const [x, y] of [[-2, 4], [-3, 3], [-1, 3], [-2, 2], [2, 4], [3, 3], [1, 3], [2, 2]]) g.set(x, y, Math.abs(x) <= 2 && y >= 3 ? 3 : 2, (x + y) & 1 ? CORD : RED);
        g.set(0, 4, 3, SILVER);
        // the dark shoulder harness: over both shoulders, crossing the back; a device with a green light on her right strap
        for (const s of [-1, 1]) { g.box(s * 3, 4, 2, s * 3, 6, 2, HARNESS); g.box(s * 3, 6, -2, s * 3, 6, 1, HARNESS); g.box(s * 2, 1, -3, s * 2, 6, -3, HARNESS); }
        g.box(-2, 3, -3, 2, 3, -3, HARNESS);
        g.set(-3, 5, 3, MOD); g.set(-3, 6, 3, LED);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYER, lash: 0x4a2a22, mouth: 0xd08a80, blush: 0xf6d0c6 });
        g.box(-2, 2, 3, -1, 2, 3, EYER2);                                                 // heterochromia: her right eye red...
        g.set(1, 3, 3, EYEL); g.box(1, 2, 3, 2, 2, 3, EYEL2);                              // ...her left amber (+X is her left)
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 3], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 3]], sideTo: 2 });
        g.box(-4, 4, 4, 4, 4, 4, HAIR);                                                   // blunt bangs, cut straight across
        g.box(-4, -1, 1, -4, 0, 2, HAIR); g.box(4, -1, 1, 4, 0, 2, HAIR);                 // locks framing the face to the jaw
        g.box(-4, -2, -4, 4, -1, -4, HAIR2);
        g.set(0, 8, 2, HAIR); g.set(1, 9, 2, HAIRHI);                                      // the ahoge
        for (const s of [-1, 1]) {
          // a braid along each side of the head, from the temple back to the nape
          [[5, 6, 2], [5, 6, 1], [5, 5, 0], [5, 5, -1], [5, 4, -2], [5, 3, -3], [4, 3, -4], [4, 2, -5], [3, 2, -5]]
            .forEach(([x, y, z], i) => { g.set(s * x, y, z, i & 1 ? HAIRHI : HAIR2); g.set(s * x, y + 1, z, i & 1 ? HAIR : HAIRHI); });
          // the tall rabbit ears, upright, blonde with pink insides
          for (let k = 0; k <= 4; k++) {
            const y = 8 + k, cx = s * (k < 3 ? 2 : 3), hw = k < 4 ? 1 : 0;
            for (let dx = -hw; dx <= hw; dx++) { g.set(cx + dx, y, -1, HAIR2); g.set(cx + dx, y, 0, dx === 0 && k >= 1 && k <= 3 ? EARPK : HAIR); }
          }
          // the white "Alice" sphere at the base of the twintail, a curled red ribbon behind it
          g.ell(s * 6, 0, -1, 1.2, 1.2, 1.2, (x, y) => y < 0 ? SPH2 : SPH); g.set(s * 7, 0, 0, RED);
          g.set(s * 7, 2, -2, RED); g.set(s * 8, 3, -2, RED); g.set(s * 8, 4, -3, RED2);
        }
      },
      armL: arm(1),
      armR(g) { arm(-1)(g); g.box(-2, -1, -1, -2, 0, 1, PATCH); g.set(-2, 0, 0, GOLDP); },   // the badge patch on her right upper arm
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tailL: { parent: 'head', at: [6, -1, -3], draw: twin(1) },
        tailR: { parent: 'head', at: [-6, -1, -3], draw: twin(-1) },
        sword: {  // her fencing sword in the right hand; rot runs the blade on from the line of her arm, a little forward
          parent: 'armR', at: [0, -7, 0], rot: [1.3, 0, 0], draw(g) {
            g.box(0, 0, -2, 0, 0, 0, SILVER); g.set(0, 0, -3, STEEL);                      // the silver grip, the pommel
            g.cyl('z', 0, 0, 1.8, 1, 2, (x, y, z) => z === 2 && y > 0 ? BLUE2 : BLUE);      // the blue bell guard...
            g.cyl('z', 0, 0, 1, 3, 3, BLUE2);
            // ...and the big curved D-shaped knuckle bow, blue with white lettering, back over the hand to the pommel
            [[0, 2, 1], [0, 3, 1], [0, 4, 0], [0, 4, -1], [0, 4, -2], [0, 3, -3], [0, 2, -3], [0, 1, -3]].forEach(([x, y, z], i) => g.set(x, y, z, i === 3 || i === 4 ? 0xf2f4f8 : BLUE));
            g.box(0, 0, 4, 0, 0, 17, STEEL); g.set(0, 0, 18, STEEL2);                      // the long thin blade
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: a fencer's, side-on, right foot forward, the blade low toward the enemy, the free hand out for balance
  ANIM.READY.fencer = { armL: [-0.25, 0.2, 0.55], armR: [-0.85, 0.15, -0.12], torso: [0.04, 0.35, 0], head: [0, -0.3, 0], legL: [0.22, 0, 0.12], legR: [-0.3, 0, -0.06], hipsY: -0.05 };
  // a forehand cut, high right to low left; a backhand cut, left to right
  ACT.alCut = (b, t, th, d) => stage(b, { armR: [-1.6, 0.4, -0.7], torso: [0, 0.35, 0] }, { armR: [-0.4, -0.7, 0.5], torso: [0.12, -0.55, 0], legR: [-0.4, 0, 0], hipsY: -0.06 }, t, th, d);
  ACT.alCutBack = (b, t, th, d) => stage(b, { armR: [-0.6, -0.8, 0.9], torso: [0, -0.5, 0] }, { armR: [-0.6, 0.7, -0.6], torso: [0.1, 0.4, 0], legR: [-0.45, 0, 0], hipsY: -0.06 }, t, th, d);
  // the lunge: the front foot out, the back leg straight, the sword arm extended, the free arm thrown back
  ACT.alLunge = (b, t, th, d) => stage(b, { armR: [0.15, 0.25, -0.25], armL: [-0.3, 0, 0.2], torso: [-0.05, 0.25, 0], legR: [0.2, 0, 0], hipsY: -0.04 },
    { armR: [-0.6, -0.2, 0.15], armL: [0.55, 0, 0.3], torso: [0.2, 0.1, 0], head: [-0.1, -0.1, 0], legR: [-0.75, 0, 0], legL: [0.5, 0, 0], hipsY: -0.18 }, t, th, d);
  ACT.alDouble = (b, t, th, d) => t < 0.24 ? ACT.alCut(b, t, 0.14, 0.24) : ACT.alCutBack(b, t - 0.24, 0.1, d - 0.24);
  // the 5th hit: a pirouette (a ring of light), then the thrust
  ACT.alFlourish = (b, t, th, d) => add(ACT.alLunge(b, t, th, d), { spin: clamp(t / Math.max(0.1, th - 0.1), 0, 1) * PI * 2 });
  // the enhanced 5th: a spinning leap, then the thrust as she lands
  ACT.alStarStrike = (b, t, th, d) => {
    if (t < th - 0.08) { const k = clamp(t / (th - 0.08), 0, 1); return add(b, { armR: [-1.4, 0.2, -0.4], armL: [0.4, 0, 0.8], legL: [-1.0 * k, 0, 0.1], legR: [-0.4 * k, 0, -0.1], torso: [-0.15, 0, 0], spin: k * PI * 2 }); }
    return ACT.alLunge(b, t - th + 0.1, 0.06, d - th + 0.1);
  };
  // a slash, then a kick (Dodge Counter, Quick Assist)
  ACT.alSlashKick = (b, t, th, d) => t < 0.3 ? ACT.alCut(b, t, 0.16, 0.3) : ACT.kick(b, t - 0.3, 0.12, d - 0.3);
  // Piercing Dawn: the blade drawn back over her shoulder, then hurled like a javelin
  ACT.alThrow = (b, t, th, d) => stage(b, { armR: [-2.2, 0.3, -0.4], armL: [-0.6, 0, 0.5], torso: [-0.15, 0.4, 0], legR: [0.35, 0, 0], hipsY: -0.04 },
    { armR: [-0.8, -0.15, 0.15], armL: [0.45, 0, 0.6], torso: [0.3, -0.45, 0], legR: [-0.75, 0, 0], legL: [0.5, 0, 0], hipsY: -0.12 }, t, th, d);
  // Northern Cross: coiled low with the blade drawn back, then the thrust as she runs through
  ACT.alNorth = (b, t, th, d) => t < th - 0.14
    ? add(b, { armR: [0.35, 0.3, -0.25], armL: [-0.5, 0, 0.9], torso: [0.35, 0.25, 0], head: [-0.25, -0.15, 0], legR: [-0.75, 0, 0], legL: [0.55, 0, 0.1], hipsY: -0.24 })
    : ACT.alLunge(b, t - th + 0.14, 0.1, d - th + 0.14);
  // Southern Cross: a back-step backhand slash, then a low thrust
  ACT.alSouth = (b, t, th, d) => t < 0.42 ? add(ACT.alCutBack(b, t, 0.2, 0.42), { hipsY: -0.08, legL: [0.3, 0, 0] }) : add(ACT.alLunge(b, t - 0.42, 0.2, d - 0.42), { hipsY: -0.08 });
  // Starshine Waltz: the lunge (a star at the blade tip), then a blur of slashes round the target, then she stands aside,
  // her sword planted at the target, a hand to her heart
  ACT.alWaltz = (b, t, th, d) => {
    if (t < 0.3) return ACT.alLunge(b, t, 0.18, 0.3);
    if (t < d - 0.5) { const k = t - 0.3; return add(b, { armR: [-1.0 + Math.sin(k * 26) * 0.5, Math.cos(k * 26) * 0.6, -0.3], armL: [0.3, 0, 0.9], torso: [0.2, Math.sin(k * 13) * 0.5, 0], legR: [-0.8, 0, 0], legL: [0.5, 0, 0], hipsY: -0.14, lift: 0.1, spin: k * 9 }); }
    return add(b, { armR: [0.75, 0, -0.25], armL: [-0.9, -0.6, -0.2], torso: [-0.08, -0.35, 0], head: [0.12, 0.3, 0], legR: [0.25, 0, -0.05], legL: [-0.2, 0, 0], hipsY: 0.03 });
  };
  // Starfall Intermission: cut after cut, then the thrust
  ACT.alFlurry = (b, t, th, d) => {
    const end = d - 0.5;
    if (t >= end) return ACT.alLunge(b, t - end, 0.14, d - end);
    const k = Math.floor(t / 0.2), u = t - k * 0.2;
    return (k & 1 ? ACT.alCutBack : ACT.alCut)(b, u, 0.08, 0.2);
  };
  // Starfall Finale: a fencer's salute, the blade raised before her face; the blur of slashes; the last thrust
  ACT.alFinale = (b, t, th, d) => {
    if (t < 0.4) return add(b, { armR: [-1.9, 0.1, -0.1], armL: [0.3, 0, 0.7], torso: [-0.1, -0.3, 0], head: [-0.15, 0.3, 0], hipsY: 0.02 });
    if (t < d - 0.6) return ACT.alWaltz(b, t - 0.1, th, d);
    return ACT.alLunge(b, t - (d - 0.6), 0.12, 0.6);
  };
  // Parry Guard: the blade up across her body
  ACT.alParry = (b) => add(b, { armR: [-0.7, 0.75, -0.35], armL: [0.1, 0, 0.35], torso: [0.1, -0.3, 0], head: [0, 0.2, 0], legL: [-0.35, 0, 0.05], legR: [0.4, 0, -0.05], hipsY: -0.1 });
  // Cross Riposte: a low charge, then the cut
  ACT.alRiposte = (b, t, th, d) => t < th - 0.1 ? add(b, { torso: [0.4, 0.1, 0], armR: [0.5, 0.2, -0.3], armL: [0.5, 0, 0.3], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], hipsY: -0.12 }) : ACT.alCut(b, t - th + 0.12, 0.12, d - th + 0.12);

  /* ------------------------------------------------------------- effects --
     From the official mechanics clips: alStar, a four-pointed star of white
     light (at her blade tip, or on the target); alLines, straight gold-orange
     and white light lines criss-crossing round the target, with a pink-violet
     flash on it; alBlast, the big gold-white blast; alPetals, pink-white
     petals drifting down; alPlant, her sword stuck upright in the ground at
     the target; alThrow, the blade hurled out and back; alStreak, Northern
     Cross's orange-gold and pink-white streaks; alGlint (stream), sparkles
     off the blade. (The clips also turn the world grey for the Waltz: not
     done, it would need the renderer.) */
  const _w = new THREE.Vector3();
  const bladeTip = a => { BT.sock(a, 'weapon', _w); if (_w.y < 0.3) _w.y = 0.9; return _w; };
  const around = (a, A, tgt) => tgt ? { x: tgt.x, z: tgt.z } : { x: a.x + Math.sin(A.dir) * 2, z: a.z + Math.cos(A.dir) * 2 };
  let swordProto = null;
  const swordObj = () => { if (!swordProto) { const g = new VX.Grid(); MODELS.alice.parts.sword.draw(g); swordProto = VX.object(g, MODELS.alice.scale, { cast: false }); } return swordProto.clone(); };
  CHOREO.events.alStar = (a, A, e, tgt) => {
    const p = e.at === 'target' && tgt ? new THREE.Vector3(tgt.x, (tgt.height || 1.6) * 0.55, tgt.z) : bladeTip(a).clone(), s = e.s || 1;
    FX.beam(new THREE.Vector3(p.x - s, p.y, p.z), new THREE.Vector3(p.x + s, p.y, p.z), 0xffffff, 0.07 * s, 0.24);
    FX.beam(new THREE.Vector3(p.x, p.y - s, p.z), new THREE.Vector3(p.x, p.y + s, p.z), 0xffffff, 0.07 * s, 0.24);
    FX.glow(p.x, p.y, p.z, s, 0xffffff, 0.22, { size1: s * 1.8 }); FX.glow(p.x, p.y, p.z, s * 1.4, PINK, 0.28, { size1: s * 2.4, a: 0.6 });
    FX.burst(p.x, p.y, p.z, 14, { col: [0xffffff, PINKW, GOLDW], speed: 4, size: 0.08, life: 0.35, g: 0 });
  };
  CHOREO.events.alLines = (a, A, e, tgt) => {
    const { x, z } = around(a, A, tgt), r = e.r || 2.4;
    for (let i = 0; i < (e.n || 6); i++) {
      const an = rnd(0, PI), L = r * rnd(1.1, 1.6), ox = rnd(-0.6, 0.6), oz = rnd(-0.6, 0.6);
      FX.beam(new THREE.Vector3(x + ox + Math.cos(an) * L, rnd(0.1, 2.4), z + oz + Math.sin(an) * L), new THREE.Vector3(x + ox - Math.cos(an) * L, rnd(0.1, 2.4), z + oz - Math.sin(an) * L), U.pick([GOLD, 0xffa040, GOLDW, 0xffffff]), rnd(0.05, 0.1), rnd(0.22, 0.34));
    }
    FX.glow(x, 1.1, z, r * 0.8, 0xd070ff, 0.18, { size1: r * 1.3, a: 0.7 });
    SFX.play('swing');
  };
  CHOREO.events.alBlast = (a, A, e, tgt) => {
    const { x, z } = around(a, A, tgt), r = e.r || 2.5;
    FX.glow(x, 1, z, r * 1.2, GOLD, 0.4, { size1: r * 2.4 }); FX.glow(x, 1, z, r * 0.7, 0xffffff, 0.3, { size1: r * 1.6 });
    FX.ring(x, z, 0.4, r, GOLDW, 0.45); FX.ring(x, z, 0.3, r * 0.65, PINKW, 0.35);
    FX.burst(x, 0.8, z, 40, { col: [0xffffff, GOLDW, GOLD, PINKW], speed: 8, size: 0.16, size1: 0.03, life: 0.6, g: 2, up: 1.5 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.4 : 0.25); SFX.play('boom');
  };
  CHOREO.events.alPetals = (a, A, e, tgt) => {
    const { x, z } = around(a, A, tgt), r = e.r || 2.5;
    for (let i = 0; i < (e.n || 24); i++) FX.p({ x: x + rnd(-r, r), y: rnd(1.2, 3.2), z: z + rnd(-r, r), vx: rnd(-0.8, 0.8), vy: rnd(-0.7, -0.2), vz: rnd(-0.8, 0.8), g: 0.3, drag: 1.0, life: rnd(1.2, 2.2), size: 0.11, size1: 0.07, col: U.pick([0xffc8dc, 0xffe4ee, 0xffffff, PINK]), glow: false });
  };
  // her sword stuck upright in the ground on her side of the target (the one in her hand hidden meanwhile)
  CHOREO.events.alPlant = (a, A, e, tgt) => {
    const B = BT.B, fx = Math.sin(A.dir), fz = Math.cos(A.dir), life = e.dur || 1, s = MODELS.alice.scale, y0 = 17.5 * s;
    const x = tgt ? tgt.x - fx * (tgt.rad + 0.4) : a.x + fx * 1.6, z = tgt ? tgt.z - fz * (tgt.rad + 0.4) : a.z + fz * 1.6;
    const P = a.rig.parts.sword; if (P) P.visible = false; a.alHideUntil = B.t + life;
    const o = swordObj(); o.rotation.set(PI / 2, 0, rnd(-0.12, 0.12)); o.position.set(x, y0 + 0.6, z);
    FX.custom(o, life, (k) => { o.position.y = y0 + Math.max(0, 0.6 - k * life * 6); if (k > 0.97 && P) P.visible = true; });
    FX.burst(x, 0.1, z, 16, { col: [0xc8b090, 0x8a7a60, 0xe0d0b0], glow: false, speed: 3, size: 0.1, g: 6, life: 0.5, flat: true });
  };
  // Piercing Dawn: the blade flies out point first along her aim and back to her hand
  CHOREO.events.alThrow = (a, A, e) => {
    const B = BT.B, dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), L = e.len || 6, life = e.dur || 0.42;
    const P = a.rig.parts.sword; if (P) P.visible = false; a.alHideUntil = B.t + life;
    const o = swordObj(); o.rotation.set(0, dir, 0);
    FX.custom(o, life, (k) => {
      const d = 0.4 + Math.sin(k * PI) * L; o.position.set(a.x + fx * d, 1.0, a.z + fz * d);
      if (Math.random() < 0.8) FX.p({ x: o.position.x, y: 1.0, z: o.position.z, life: 0.3, size: 0.12, size1: 0.02, col: U.pick([GOLDW, 0xffffff, PINKW]) });
      if (k > 0.97 && P) P.visible = true;
    });
    FX.beam(new THREE.Vector3(a.x + fx * 0.5, 1.0, a.z + fz * 0.5), new THREE.Vector3(a.x + fx * (L + 0.4), 1.0, a.z + fz * (L + 0.4)), GOLDW, 0.06, 0.3);
  };
  CHOREO.events.alStreak = (a, A, e) => {
    const fx = Math.sin(A.dir), fz = Math.cos(A.dir), L = e.len || 7;
    for (const [y, side, col, w] of [[1.0, 0, 0xffffff, 0.05], [1.05, 0, GOLD, 0.16], [0.8, 0.25, PINKW, 0.08], [1.3, -0.3, 0xffa040, 0.07], [0.55, -0.15, GOLDW, 0.05]]) {
      const ox = fz * side, oz = -fx * side;
      FX.beam(new THREE.Vector3(a.x + ox - fx * 0.5, y, a.z + oz - fz * 0.5), new THREE.Vector3(a.x + ox + fx * L, y, a.z + oz + fz * L), col, w, 0.38);
    }
    FX.glow(a.x + fx * 1.2, 1.0, a.z + fz * 1.2, 1.6, GOLD, 0.2);
  };
  CHOREO.streams.alGlint = (a) => {
    if (Math.random() > 0.6) return;
    const p = bladeTip(a);
    FX.p({ x: p.x + rnd(-0.1, 0.1), y: p.y, z: p.z + rnd(-0.1, 0.1), vy: rnd(-0.3, 0.3), life: 0.35, size: 0.1, size1: 0.02, col: U.pick([GOLDW, PINKW, 0xffffff]) });
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const cut = (t, tilt, o) => Object.assign({ t, fx: 'crescent', y: 1.0, tilt, r: 2.0, arc: 2.4, col: GOLDW }, o || {});
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.55 }], events: [cut(0.16, 0.55)] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.45 }], events: [cut(0.16, -0.55)] });
  set(K.basic[2], { motion: [{ t0: 0.04, t1: 0.2, kind: 'fwd', d: 0.9 }], events: [{ t: 0.2, fx: 'thrustLine', col: GOLDW, len: 3.2 }, { t: 0.2, fx: 'alStar', s: 0.7 }] });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.34, kind: 'fwd', d: 0.6 }], events: [cut(0.14, 0.6), cut(0.34, -0.6, { col: PINKW })] });
  set(K.basic[4], { motion: [{ t0: 0.04, t1: 0.34, kind: 'fwd', d: 1.1 }], stream: [{ t0: 0.04, t1: 0.3, kind: 'alGlint' }],
    events: [cut(0.2, 0, { r: 2.2, arc: 5.6, sweep: 2.4 }), { t: 0.34, fx: 'thrustLine', col: GOLD, len: 3.6 }, { t: 0.34, fx: 'alStar', s: 1.0 }] });
  set(K.basic5e, { motion: [{ t0: 0.02, t1: 0.42, kind: 'leap', h: 0.8, d: 0, toTarget: true }], stream: [{ t0: 0, t1: 0.42, kind: 'alGlint' }, { t0: 0, t1: 0.42, kind: 'afterimage', col: GOLD }],
    events: [cut(0.3, 0, { r: 2.2, arc: 5.6, sweep: 2.4 }), { t: 0.42, fx: 'alLines', n: 6, r: 2.2 }, { t: 0.42, fx: 'alStar', s: 1.4, at: 'target' }, { t: 0.42, fx: 'alBlast', r: 2.2 }] });
  // Starshine Waltz: the lunge in, a blur round the target with light lines at every slash, then she steps aside as the
  // Finishing Move lands: the blast, her sword planted, petals falling
  for (const n of [1, 2, 3]) {
    const W = K['waltz' + n], d = W.dur, fin = W.hits[W.hits.length - 1].t;
    set(W, { track: d,
      motion: [{ t0: 0, t1: 0.18, kind: 'toTarget', gap: 1.0 }, { t0: 0.3, t1: fin - 0.1, kind: 'orbit', ang: PI * (1 + n), gap: 1.5, side: 'auto', ease: 'lin' }, { t0: fin - 0.05, t1: fin + 0.12, kind: 'side', d: 1.0, side: 'auto' }],
      stream: [{ t0: 0.3, t1: fin, kind: 'afterimage', col: GOLD }, { t0: 0.3, t1: fin, kind: 'alGlint' }],
      events: [{ t: 0.18, fx: 'alStar', s: 1.4 }]
        .concat(W.hits.slice(0, -1).map(h => ({ t: h.t, fx: 'alLines', n: 3 + n, r: 2.4 })))
        .concat([{ t: fin, fx: 'alLines', n: 6 + 4 * n, r: 2.8 }, { t: fin, fx: 'alBlast', r: 2 + n * 0.5, big: n === 3 }, { t: fin, fx: 'alPlant', dur: d - fin + 0.5 }, { t: fin, fx: 'alPetals', r: 2.6, n: 12 * n }])
        .concat(n === 3 ? [{ t: fin, fx: 'whiteFlash' }] : []) });
  }
  set(K.dash, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: PINKW }], events: [cut(0.24, 0.4, { r: 2.2, arc: 2.6 })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.1, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.15, kind: 'afterimage', col: PINKW }],
    events: [cut(0.16, 0.5, { r: 2.3 }), { t: 0.42, fx: 'sparkBurst' }, { t: 0.42, fx: 'alStar', s: 0.9, at: 'target' }] });
  set(K.special, { events: [{ t: 0.28, fx: 'alThrow', len: 6.5, dur: 0.42 }] });
  // Southern Cross: back away with a great gold crescent, then the thrust, gold lines and sparks
  set(K.ex, { motion: [{ t0: 0.04, t1: 0.24, kind: 'back', d: 1.3 }, { t0: 0.5, t1: 0.62, kind: 'fwd', d: 1.8 }], stream: [{ t0: 0.5, t1: 0.62, kind: 'afterimage', col: GOLD }],
    events: [cut(0.2, 0.15, { y: 0.9, r: 2.9, arc: 3.0, col: GOLD, sweep: 1.4 }), { t: 0.62, fx: 'thrustLine', col: GOLD, len: 5 }, { t: 0.62, fx: 'alStreak', len: 5 }, { t: 0.62, fx: 'sparkBurst' }, { t: 0.62, fx: 'alStar', s: 1.2, at: 'target' }] });
  // Northern Cross: a star at the blade tip, then she runs the enemy through, trailing streaks; the star flashes on it
  set(K.exN, { track: 0.3, motion: [{ t0: 0.3, t1: 0.6, kind: 'charge', hit: 0.45, d: 7 }], stream: [{ t0: 0.3, t1: 0.6, kind: 'afterimage', col: PINKW }, { t0: 0.3, t1: 0.6, kind: 'dust' }],
    events: [{ t: 0.12, fx: 'alStar', s: 0.8 }, { t: 0.3, fx: 'alStreak', len: 8 }, { t: 0.45, fx: 'alStar', s: 1.6, at: 'target' }, { t: 0.45, fx: 'dust' }, { t: 0.45, fx: 'sparkBurst' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.08, kind: 'toTarget', gap: 1.1 }, { t0: 1.0, t1: 1.14, kind: 'fwd', d: 1.0 }], stream: [{ t0: 0, t1: 1.0, kind: 'alGlint' }],
    events: [0.08, 0.28, 0.48, 0.68, 0.88].map((t, i) => cut(t, i & 1 ? -0.6 : 0.6, { r: 2.4, col: i & 1 ? PINKW : GOLDW })).concat([{ t: 1.14, fx: 'alStar', s: 1.5, at: 'target' }, { t: 1.14, fx: 'alLines', n: 10, r: 3 }, { t: 1.14, fx: 'alBlast', r: 3 }]) });
  // Starfall Finale: the salute (the blade shines), a blur round the target with star lines over the whole area, the last
  // thrust: the great blast and the petals
  set(K.ult, { track: 2.5, motion: [{ t0: 0.4, t1: 1.8, kind: 'orbit', ang: PI * 4, gap: 2.0, side: 'auto', ease: 'lin' }, { t0: 1.9, t1: 2.02, kind: 'toTarget', gap: 1.0 }],
    stream: [{ t0: 0.4, t1: 1.9, kind: 'afterimage', col: GOLD }, { t0: 0, t1: 2.0, kind: 'alGlint' }],
    events: [{ t: 0.25, fx: 'alStar', s: 1.2 }].concat([0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map(t => ({ t, fx: 'alLines', n: 10, r: 4.2 })))
      .concat([{ t: 2.02, fx: 'alLines', n: 24, r: 4.8 }, { t: 2.02, fx: 'alStar', s: 2.0, at: 'target' }, { t: 2.02, fx: 'alBlast', r: 4.5, big: true }, { t: 2.02, fx: 'alPetals', r: 4.5, n: 50 }, { t: 2.02, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0.05, t1: 0.4, kind: 'charge', hit: 0.3, d: 6 }], stream: [{ t0: 0.05, t1: 0.35, kind: 'afterimage', col: PINKW }], events: [cut(0.35, 0.4, { r: 2.6, arc: 3.0, col: GOLD }), { t: 0.35, fx: 'alStar', s: 1.1, at: 'target' }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: PINKW }], events: [cut(0.16, 0.5, { r: 2.3 }), { t: 0.42, fx: 'sparkBurst' }] });
})();
