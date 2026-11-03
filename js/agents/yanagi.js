/* ============================================================================
   agents/yanagi.js -- Tsukishiro Yanagi, Deputy Chief and intelligence
   officer of Hollow Special Operations Section 6 (H.A.N.D.). S-Rank,
   Electric, Anomaly, Defensive Assist. Released in Version 1.3.
   (The hooks and helpers an Agent's file can use are listed in zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Tsukishiro Yanagi, Lore, Dialogue, DMs,
   Voice-Overs, Fashion, Uro Tsuki, Attribute Anomaly / Polarity Disorder,
   the trust commissions Coffee Time and King of Karaoke), zzz.gachabase.net
   (datamine, game data 3.4.2: per-hit multipliers, Anomaly Buildup, stats),
   the official Agent Mechanics graphic ("hold Special Attack" for the EX),
   the "Behind the Agent" Uro Tsuki art, the official portrait and in-game
   models, the BlueStacks guide, and a search summary of Prydwen / Icy Veins.

   Her kit (official):
     Basic Attack: Tsukuyomi Kagura  5 slashes; the string changes with her
                                    stance, Jougen or Kagen. Hits 1-2 are
                                    Physical, 3-5 Electric. Jougen: Electric
                                    DMG +10%, Anti-Interrupt during Basic
                                    Attacks. Kagen: PEN Ratio +10%, her Basic
                                    Attacks interrupt more. For 8 s after a
                                    switch she keeps the old stance's bonus too.
     Dash Attack: Fleeting Flight (Physical)
     Dodge Counter: Rapid Retaliation  (-> the 3rd Basic hit)
     Special Attack: Ruten          a slash that switches stance (Anti-
                                    Interrupt). After Basic hit 3, 4 or 5 it is
                                    Swift Ruten: faster, it blocks attacks, and
                                    Basic carries on from the 3rd hit.
     EX Special Attack: Gekka Ruten (hold Special, 40 Energy) a charged thrust
                                    (she switches stance and enters
                                    Shinrabanshou, 15 s: after Basic hit 5 or
                                    any skill, Basic starts from the 3rd hit),
                                    then a downward strike: on an enemy with an
                                    Anomaly, Polarity Disorder (15% of that
                                    Disorder + 3,200% of her Anomaly
                                    Proficiency; the Anomaly stays).
     Chain Attack: Celestial Harmony (switches stance; -> 3rd hit)
     Ultimate: Raiei Tenge          a wide slash, then a lightning strike that
                                    sets off Polarity Disorder (-> 3rd hit)
     Quick Assist: Blade of Elegance (-> 3rd hit)
     Defensive Assist: Radiant Reversal
     Assist Follow-Up: Weeping Willow Stab (switches stance; -> 3rd hit)
     Core Passive: Lunar Eclipse    after her EX, for 15 s, every Disorder the
                                    squad applies has its multiplier raised by
                                    250%; the EX's targets take +20% Electric
                                    DMG from her (15 s).
     Additional Ability: Gessou     with another Anomaly or Electric Agent: for
                                    8 s after a stance switch her Basic hits
                                    build 45% more Electric Anomaly.
   Our choices (no source says): she enters battle in Jougen; the stance
   switches as the move starts; Kagen's "Interrupt Level" is extra knockback
   (battle.js lets only heavy hits interrupt); Jougen's Anti-Interrupt is a
   small dr (battle.js reads any dr as Anti-Interrupt); the sub-hits of Basic
   hits 4 (Jougen) and 3 (Kagen), Weeping Willow Stab and Raiei Tenge; the
   Polarity Disorder's Anomaly Proficiency part on this game's scale (below).
   Numbers: official level-12 values x0.45 DMG, x0.6 Daze; Anomaly Buildup as
   datamined (/100); the parry's Daze is the official value.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, lerp } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const ELEC = [0xffffff, 0xd0f0ff, 0x5ec8ff, 0x9ad8ff], BLUE = 0x5ec8ff, VIOLET = 0xa898ff, STEEL = 0xd8dce8;
  const JOUGEN = 0x6ab8ff, KAGEN = 0xffa850;          // the stance diamonds under her icon: blue, orange
  const AI_DR = 0.1, KB_UP = 0.45;                    // Jougen's Anti-Interrupt (any dr), Kagen's harder-interrupting hits (knockback)
  const LUNAR = 250;                                  // Lunar Eclipse: Disorder multiplier +250% (core level 7)
  // Polarity Disorder's "3,200% of her Anomaly Proficiency", as an Anomaly multiplier: 32 x AP scaled like the rest
  // of her Anomaly DMG here (by her ATK over her official 872), i.e. 3,200 x 100 / 872 % of ATK x AP/100
  const POL_AP = Math.round(3200 * 100 / 872);

  /* ----------------------------------------------------------------- kit -- */
  const BASIC = 'Basic Attack: Tsukuyomi Kagura', PH = o => Object.assign({ attr: 'physical' }, o || {});
  const K = {
    // Jougen (K.basic): sweeping, rising cuts; Anti-Interrupt through the string (dr)
    basic: [
      { name: BASIC, anim: 'ygRise', dur: 0.42, cancel: 0.3, reach: 2.2, range: 2.0, dr: AI_DR, hits: [hit(0.15, 113.8, 42.1, 0, PH({ arc: 150 }))] },
      { name: BASIC, anim: 'ygCross', dur: 0.46, cancel: 0.32, reach: 2.2, range: 2.0, dr: AI_DR, hits: [hit(0.17, 199.8, 102.2, 0, PH({ arc: 170 }))] },
      { name: BASIC, anim: 'ygSweep', dur: 0.56, cancel: 0.42, reach: 2.3, range: 2.0, dr: AI_DR, hits: [hit(0.22, 226.4, 104.6, 79.91, { shape: 'circle', at: 'self', r: 2.8 })] },
      { name: BASIC, anim: 'ygTwin', dur: 0.62, cancel: 0.46, reach: 2.3, range: 2.0, dr: AI_DR, hits: [0.16, 0.32].map(t => hit(t, 254.2 / 2, 117.2 / 2, 89.42 / 2, { arc: 170 })) },
      { name: BASIC, anim: 'ygCrescent', dur: 0.86, cancel: 0.7, reach: 2.4, range: 2.0, dr: AI_DR, ygLast: true, hits: [hit(0.36, 474.5, 217.8, 167.35, { heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 0.9 })] },
    ],
    // Kagen: thrusts and falling cuts that drive enemies back (Interrupt Level: more knockback)
    kagen: [
      { name: BASIC, anim: 'ygThrust', dur: 0.46, cancel: 0.32, reach: 2.6, range: 2.1, hits: [hit(0.16, 226.4, 84.1, 0, PH({ shape: 'line', r: 0.9, len: 3.4, kb: 0.15 + KB_UP }))] },
      { name: BASIC, anim: 'ygFall', dur: 0.5, cancel: 0.36, reach: 2.3, range: 2.0, hits: [hit(0.18, 259.0, 140.4, 0, PH({ arc: 140, kb: 0.15 + KB_UP }))] },
      { name: BASIC, anim: 'ygFlurry', dur: 0.48, cancel: 0.36, reach: 2.6, range: 2.1, hits: [0.12, 0.2, 0.28].map(t => hit(t, 146.5 / 3, 67.7 / 3, 51.38 / 3, { shape: 'line', r: 0.9, len: 3.2, kb: 0.1 + KB_UP })) },
      { name: BASIC, anim: 'ygFallSpin', dur: 0.58, cancel: 0.44, reach: 2.3, range: 2.0, hits: [hit(0.22, 215.5, 100.2, 76.07, { shape: 'circle', at: 'self', r: 2.7, kb: 0.15 + KB_UP })] },
      { name: BASIC, anim: 'ygPlunge', dur: 0.95, cancel: 0.78, reach: 2.6, range: 2.0, ygLast: true, hits: [hit(0.42, 544.6, 250.3, 192.04, { heavy: true, shape: 'circle', at: 'front', r: 3.0, kb: 1.0 + KB_UP })] },
    ],
    dash: { name: 'Dash Attack: Fleeting Flight', anim: 'ygDash', dur: 0.5, cancel: 0.38, reach: 7, hits: [hit(0.2, 101.0, 68.5, 0, PH({ arc: 160 }))] },
    counter: { name: 'Dodge Counter: Rapid Retaliation', anim: 'ygCounter', dur: 0.62, cancel: 0.48, reach: 2.6, inv: [0, 0.55], ygThird: true, hits: [hit(0.22, 463.7, 275.6, 76.52, { heavy: true, arc: 180, r: 2.9, kb: 0.9 })] },
    // Ruten: a slash that switches stance (Anti-Interrupt: dr, as the other Agents' Specials). Swift Ruten (after Basic
    // hit 3-5): faster, it blocks (ygBlock: incoming below), and Basic carries on from the 3rd hit. One datamine entry
    special: { name: 'Special Attack: Ruten', anim: 'ygRuten', dur: 0.58, cancel: 0.44, reach: 2.6, range: 2.2, cd: 1.5, dr: 0.4, ygSwitch: true, hits: [hit(0.24, 235.1, 159.6, 96.0, { arc: 170, r: 2.9 })] },
    swift: { name: 'Special Attack: Ruten (Swift Ruten)', anim: 'ygRuten', dur: 0.4, cancel: 0.3, reach: 2.6, range: 2.2, cd: 1.5, dr: 0.4, ygSwitch: true, ygThird: true, ygBlock: 0.36, hits: [hit(0.12, 235.1, 159.6, 96.0, { arc: 170, r: 2.9 })] },
    // Gekka Ruten: the charge, the thrust through, the downward strike (Polarity Disorder: polar)
    ex: { name: 'EX Special Attack: Gekka Ruten', anim: 'ygGekka', dur: 1.3, cancel: 1.15, cost: 40, reach: 6, range: 3, inv: [0, 1.25], ygSwitch: true,
      hits: [hit(0.42, 327.7, 190.9, 143.5, { shape: 'line', r: 1.1, len: 6 }), hit(0.92, 756.2, 164.6, 268.54, { heavy: true, shape: 'circle', at: 'target', r: 2.8, kb: 1.1, polar: true })] },
    chain: { name: 'Chain Attack: Celestial Harmony', anim: 'ygChain', dur: 1.35, inv: [0, 1.35], ygSwitch: true, ygThird: true,
      hits: [hit(0.7, 1187.1, 268.5, 359.58, { heavy: true, shape: 'cone', r: 5, arc: 130, kb: 1.2 })] },
    // Raiei Tenge: one datamined value; the slash takes 70% of it, the lightning strike 30% (our split)
    ult: { name: 'Ultimate: Raiei Tenge', anim: 'ygUlt', dur: 2.3, inv: [0, 2.3], ygThird: true,
      hits: [hit(1.0, 3024.3 * 0.7, 147.0 * 0.7, 904.39 * 0.7, { shape: 'cone', r: 6.5, arc: 150 }), hit(1.6, 3024.3 * 0.3, 147.0 * 0.3, 904.39 * 0.3, { heavy: true, shape: 'circle', at: 'target', r: 4.5, kb: 1.6, polar: true })] },
    // Radiant Reversal: the official Daze is 366.3% on a light blow, 463.7% on a heavy one; the parry's own x1.2 on a heavy blow comes close
    assist: { name: 'Defensive Assist: Radiant Reversal', type: 'defensive', anim: 'ygParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(366.3) },
    // Weeping Willow Stab: four quick stabs (12.5% each), then the slash (50%) (our split)
    followup: { name: 'Assist Follow-Up: Weeping Willow Stab', anim: 'ygWillow', dur: 1.05, inv: [0, 1.0], ygSwitch: true, ygThird: true,
      hits: [0.2, 0.3, 0.4, 0.5].map(t => hit(t, 815.2 * 0.125, 481.2 * 0.125, 312.23 * 0.125, { shape: 'line', r: 1.0, len: 3.5 })).concat([hit(0.74, 815.2 * 0.5, 481.2 * 0.5, 312.23 * 0.5, { heavy: true, shape: 'cone', r: 3.4, arc: 130, kb: 1.0 })]) },
    quick: { name: 'Quick Assist: Blade of Elegance', anim: 'ygRise', dur: 0.62, reach: 2.6, inv: [0, 0.55], ygThird: true, hits: [hit(0.24, 188.2, 127.1, 76.52, { arc: 170, r: 2.9, kb: 0.6 })] },
  };

  /* ------------------------------------------------- stances, the string -- */
  const kept = (a, t) => (a.ygPrevT > t ? a.ygPrev : null);   // the stance whose bonus she still keeps (8 s)
  const has = (a, t, s) => (a.ygStance || 'jougen') === s || kept(a, t) === s;
  // a string def with the other stance's bonus kept on it: Jougen's Anti-Interrupt (dr) on a Kagen hit, Kagen's
  // knockback on a Jougen hit (built once each, after the choreography below is on the defs)
  const VAR = new Map();
  function withKept(def, k) {
    let m = VAR.get(def); if (!m) VAR.set(def, m = {});
    if (!m[k]) m[k] = k === 'dr' ? Object.assign({}, def, { dr: AI_DR }) : Object.assign({}, def, { hits: def.hits.map(h => Object.assign({}, h, { kb: (h.kb || 0.15) + KB_UP })) });
    return m[k];
  }
  function stringHit(a, t, step) {
    if ((a.ygStance || 'jougen') === 'kagen') { const d = K.kagen[step]; return has(a, t, 'jougen') ? withKept(d, 'dr') : d; }
    const d = K.basic[step]; return has(a, t, 'kagen') ? withKept(d, 'kb') : d;
  }
  // the hit of the string her last Basic was (1-5), while the string is still going; 0 if it is not
  const lastHit = (a, t) => (a.combo > 0 && t - a.lastBasic <= 0.9 ? ((a.combo - 1) % 5) + 1 : 0);
  const ruten = (a, t) => ({ def: lastHit(a, t) >= 3 ? K.swift : K.special, kind: 'special' });
  function switchStance(a, def) {
    const B = BT.B, t = B.t;
    a.ygPrev = a.ygStance || 'jougen'; a.ygPrevT = t + 8;
    a.ygStance = a.ygPrev === 'kagen' ? 'jougen' : 'kagen';
    a.ygGessouT = t + 8;                                                       // Gessou: 8 s of +45% Electric buildup on her Basic
    BT.log(`Yanagi: ${a.ygStance === 'kagen' ? 'Kagen' : 'Jougen'} stance (${def.name.replace(/^[^:]+: /, '')}). ${a.ygPrev === 'kagen' ? 'Kagen' : 'Jougen'}'s bonus stays 8 s.`, 'skill');
    stanceFx(a);
  }
  // Polarity Disorder: 15% of the Disorder the target's Anomaly would give (Lunar Eclipse raises it), plus her
  // Anomaly Proficiency part; the Anomaly stays on the target
  function polarity(a, v) {
    const B = BT.B, an = v.anom, An = an && D.ANOMALY[an.type]; if (!An || !v.alive) return;
    const base = (An.disorderBase || 450) + (An.disorderPerSec || 0) * Math.max(0, an.t) + (a.ygLunarT > B.t ? LUNAR : 0);
    const dmg = BT.anomalyDamage(a, v, base * 0.15 + POL_AP, An.attr);
    BT.hurtEnemy(v, dmg, { attr: An.attr, src: a, big: true, cls: 'disorder', color: '#d8c8ff' });
    BT.callout('POLARITY DISORDER', 'disorder', `${v.def.name} · ${An.name} stays`);
    BT.log(`Yanagi: Polarity Disorder on ${v.def.name} (${An.name}): ${U.fmt(dmg)}. The ${An.name} stays on it.`, 'anomaly');
    polarFx(v, An);
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.yanagi = {
    id: 'yanagi', name: 'Tsukishiro Yanagi', short: 'Yanagi', faction: 'Hollow Special Operations Section 6', spec: 'Anomaly', attr: 'electric', rank: 'S',
    color: '#f4c7c4', color2: '#43767b', assist: 'defensive', stance: 'naginata',
    blurb: 'Deputy Chief of Section 6 and its intelligence officer, the "normal" one who keeps the reports, the Chief and the team running. Her retractable naginata flows between two stances, Jougen and Kagen, and her EX Special Gekka Ruten strikes an enemy\'s Anomaly with Polarity Disorder, a Disorder that leaves the Anomaly where it is.',
    // HP 7,788 x1.12, DEF 612 x1.07; ATK 872 on the Anomaly scale (Miyabi's 880 -> 2,900); Anomaly Proficiency 114 x2.55;
    // CRIT 5% + 0.05, 50% + 0.3
    stats: { hp: 8720, atk: 2870, def: 655, impact: 86, ap: 290, am: 148, cr: 0.1, cd: 0.8, er: 1.2, speed: 4.8 },
    ai: { range: 2.0, dodge: 0.8, reflex: 0.64, aggr: 1.0 },
    energyMax: 120, resource: 'stance',
    core: [
      ['Core Passive: Lunar Eclipse', 'After her EX Special Attack, for 15 s, the DMG multiplier of every Disorder the squad applies rises by 250%. When her EX Special Attack hits an enemy, her Electric DMG against it rises by 20% for 15 s.'],
      ['Stances: Jougen and Kagen', 'Her Basic Attack changes with her stance. Jougen: Electric DMG +10%, Anti-Interrupt during Basic Attacks. Kagen: PEN Ratio +10%, her Basic Attacks drive enemies back. Tap Special for Ruten, a slash that switches stance; after Basic hit 3, 4 or 5 it is Swift Ruten: faster, it blocks attacks, and Basic carries on from the new stance\'s 3rd hit. Her EX, Chain Attack and Assist Follow-Up switch stance too, and for 8 s after a switch she keeps the old stance\'s bonus as well. Her Dodge Counter, Quick Assist, Chain Attack, Ultimate and Follow-Up lead straight into the 3rd hit.'],
      ['EX Special Attack: Gekka Ruten', 'Hold Special with 40 Energy: a charged thrust (she switches stance and enters Shinrabanshou for 15 s: after Basic hit 5 or any skill, her next Basic starts from the 3rd hit), then a downward strike. On an enemy suffering an Anomaly it sets off Polarity Disorder: 15% of the Disorder that Anomaly would give, plus 3,200% of her Anomaly Proficiency, and the Anomaly stays. Her Ultimate\'s lightning strike does the same.'],
      ['Additional Ability: Gessou', 'With another Anomaly Agent or another Electric Agent in the squad: for 8 s after she switches stance, her Basic Attack hits build 45% more Electric Anomaly.'],
    ],
    kit: K,
    kitShow: [['Swift', 'swift']],
    rivalMoves: [{ k: 'swift', kind: 'special', p: 0.18, cd: 5 }],
    howto: 'Yanagi: tap Special for Ruten, a slash that switches her stance (Jougen: Electric DMG +10%, Kagen: PEN Ratio +10%; the old bonus stays 8 s). After Basic hit 3, 4 or 5 it is Swift Ruten: faster, it blocks, and Basic carries on from the 3rd hit. Hold Special with 40 Energy for her EX, Gekka Ruten: Shinrabanshou, Lunar Eclipse for the squad\'s Disorders, and Polarity Disorder on an enemy with an Anomaly. Her assist is a Defensive Assist.',
    mech: {
      init(a) { a.ygStance = 'jougen'; a.ygPrev = null; a.ygPrevT = 0; a.ygGessouT = 0; a.ygShinT = 0; a.ygLunarT = 0; a.ygThirdT = 0; a.ygNext3 = 0; a.ygGessou = false; a.ygQuickA = null; hookLook(); },
      // Gessou: another Anomaly Agent, or another Electric one, in the squad
      squad(a, B) { a.ygGessou = B.squad.some(s => s !== a && (s.def.spec === 'Anomaly' || s.def.attr === 'electric')); },
      start(a, def, A) {
        const B = BT.B, t = B.t;
        // Shinrabanshou: after Basic hit 5 or any other skill, the next Basic is the 3rd hit (resolve reads ygNext3)
        if (A.kind === 'basic') { a.ygThirdT = 0; a.ygNext3 = def.ygLast ? t + A.dur + 0.9 : 0; }
        else a.ygNext3 = t + A.dur + 0.9;
        if (def.ygThird) a.ygThirdT = t + A.dur + 0.8;                             // "follow up with the 3rd hit"
        if (def.ygSwitch) switchStance(a, def);
        if (A.kind === 'ex') {
          a.ygShinT = t + 15; a.ygLunarT = t + 15;
          BT.callout('SHINRABANSHOU', 'skill', 'Yanagi · Lunar Eclipse 15 s');
          BT.log('Yanagi: Shinrabanshou (15 s). Lunar Eclipse: the squad\'s Disorder multipliers +250% for 15 s.', 'skill');
        }
      },
      hit(a, v, h, A, attr) {
        const B = BT.B, t = B.t;
        // Gessou: her Basic hits build 45% more Electric Anomaly for 8 s after a stance switch
        if (a.ygGessou && a.ygGessouT > t && A.kind === 'basic' && attr === 'electric' && h.bu) BT.addBuildup(a, v, 'electric', h.bu * 0.45);
        if (A.kind === 'ex' && v.alive) v.ygLE = { src: a, t: t + 15 };            // Lunar Eclipse: her Electric DMG on it +20%
        if (h.polar && v.alive && v.anom && v.anom.t > 0) polarity(a, v);
      },
      mods(a, v, h, A) {
        const t = BT.B.t, attr = (h && h.attr) || a.def.attr;
        let dmg = 0;
        if (attr === 'electric' && has(a, t, 'jougen')) dmg += 0.1;                // Jougen
        if (attr === 'electric' && v && v.ygLE && v.ygLE.src === a && v.ygLE.t > t) dmg += 0.2;   // Lunar Eclipse
        return { dmg, defIgnore: has(a, t, 'kagen') ? 0.1 : 0 };                    // Kagen: PEN Ratio +10%
      },
      // Lunar Eclipse: a Disorder from anyone in the squad gets 250% more multiplier (the extra lands with it)
      disorder(a, src, v, old) {
        const B = BT.B, An = D.ANOMALY[old.type];
        if (!(a.ygLunarT > B.t) || !An || !src || !B.squad.includes(src) || !v.alive) return;
        const dmg = BT.anomalyDamage(src, v, LUNAR, An.attr);
        BT.hurtEnemy(v, dmg, { attr: An.attr, src, big: true, cls: 'disorder', color: '#d8c8ff' });
        BT.log(`Lunar Eclipse: the Disorder on ${v.def.name} deals ${U.fmt(dmg)} more (Yanagi, multiplier +250%).`, 'anomaly');
        FX.ring(v.x, v.z, 0.3, 3.4, VIOLET, 0.45, { y: 0.1 }); FX.glow(v.x, 1.2, v.z, 2.4, 0xd8c8ff, 0.25, { size1: 3.6 });
      },
      // Swift Ruten blocks what comes at her while it plays (not an unblockable red flash: our choice)
      incoming(a, e, h) {
        const A = a.act;
        if (!A || A.def !== K.swift || A.t > K.swift.ygBlock || h.flash === 'red') return false;
        blockFx(a); return true;
      },
      tick(a, dt, on) {
        const B = BT.B, t = B.t, A = a.act;
        // a Quick Assist does not go through start: it leads into the 3rd hit all the same
        if (A && A.kind === 'quick' && A !== a.ygQuickA) { a.ygQuickA = A; a.ygThirdT = t + (A.dur - A.t) + 0.8; }
        // Shinrabanshou: pale moonlight and sparks drifting round her
        if (on && a.ygShinT > t && a.obj && a.obj.visible && Math.random() < dt * 16) {
          const an = rnd(0, PI * 2), r = rnd(0.4, 0.9);
          FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.3, 1.8) + (a.airY || 0), z: a.z + Math.sin(an) * r, vy: rnd(0.3, 0.8), drag: 1, life: 0.6, size: 0.09, size1: 0.02, col: U.pick([0xe8e4ff, VIOLET, 0x9ad8ff]) });
        }
      },
      // Special: tapped, Ruten (Swift Ruten after Basic hit 3-5); held with 40 Energy, Gekka Ruten. AUTO taps for its EX
      // (ai.js presses Special without holding); its own Ruten asks with o.step 'ruten' (ai below).
      // Basic: the string of her stance; the 3rd hit after the moves that lead into it, and in Shinrabanshou
      resolve(a, btn, hold, c) {
        const t = c.t;
        if (btn === 'special') {
          if (c.step === 'ruten') return ruten(a, t);
          if (a.energy >= K.ex.cost && (hold || !BT.isPlayer(a))) return { def: K.ex, kind: 'ex' };
          return ruten(a, t);
        }
        if (btn !== 'basic' || c.dash) return null;
        let step = typeof c.step === 'number' ? c.step : t - a.lastBasic > 0.9 ? 0 : a.combo;
        step = ((step % 5) + 5) % 5;
        if (a.ygThirdT > t || (a.ygShinT > t && a.ygNext3 > t && step === 0)) step = 2;
        return { def: stringHit(a, t, step), kind: 'basic', step };
      },
      // AUTO: Gekka Ruten for a Polarity Disorder, or to open Shinrabanshou; Swift Ruten off hits 3-5 to switch stance
      // and keep both bonuses up
      ai(a, tgt, B) {
        const t = B.t;
        if (a.energy >= K.ex.cost && (tgt.anom || !(a.ygShinT > t)) && Math.random() < 0.6) return { btn: 'special' };
        if (lastHit(a, t) >= 3 && !(a.ygPrevT > t) && Math.random() < 0.55) return { btn: 'special', o: { step: 'ruten' } };
        return null;
      },
      hud(a, B) {
        const t = B.t, kag = a.ygStance === 'kagen', k = kept(a, t);
        const r = [`STANCE ${kag ? 'KAGEN' : 'JOUGEN'} ${has(a, t, 'jougen') ? '◆' : '◇'}${has(a, t, 'kagen') ? '◆' : '◇'}${k ? ` (+${k === 'kagen' ? 'KAGEN' : 'JOUGEN'} ${Math.ceil(a.ygPrevT - t)}s)` : ''}`];
        if (a.ygShinT > t) r.push(`SHINRABANSHOU ${Math.ceil(a.ygShinT - t)}s`);
        if (a.ygLunarT > t) r.push(`LUNAR ECLIPSE · DISORDER +250% ${Math.ceil(a.ygLunarT - t)}s`);
        if (a.ygGessou && a.ygGessouT > t) r.push(`GESSOU ${Math.ceil(a.ygGessouT - t)}s`);
        if (lastHit(a, t) >= 3) r.push('SPECIAL: SWIFT RUTEN');
        const v = a.lastTgt; if (v && v.alive && v.anom && a.energy >= K.ex.cost) r.push('TARGET: ANOMALY · HOLD SPECIAL');
        return r;
      },
    },
    town: {
      // the Section 6 Office: her desk is the one under the file piles. Off duty the wiki finds her mostly in Lumina
      // Square, but her work is where she spends her days (and nights: "I end up working into the next day")
      home: 'section6',
      // her desk, the Hollow board, the paperwork at the counter; late at night still at her desk
      routine: ['s6:desk_yanagi 55, s6:board 20, s6:counter 15, s6:cooler 10', 's6:desk_yanagi 40, s6:white 20, s6:board 15, huddle 25', 's6:desk_yanagi 40, s6:cooler 15, s6:sofa 15, huddle 30', 's6:desk_yanagi 75, s6:window 25'],
      chatter: ['More work has arrived.', 'Clock off on time... one day.'],
      lines: [
        'Tsukishiro Yanagi, Deputy Chief of Section 6. If the team has been giving you a headache, do tell me. I know the feeling well.',
        'Red bean buns are the perfect office breakfast. No smell, no leaks, hardly any crumbs. You can eat one on the move and bother nobody.',
        'After a week like this one I want the worst movie you have. Something with a shark in it. ...Why do terrible movies always have a shark in them?',
      ],
      chapters: [
        { title: 'Decaf', ask: ['Proxy, a small favour? A coffee from Coff Cafe. Decaf, if Tin Master will forgive me.', 'It\'s my day off, in principle. I would like to save the caffeine for days that come with a headache.'], steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'yanagi' }],
          scene: [['A', 'Thank you. ...Did he give you the look too? The one that says decaf is a crime?'], ['P', 'He said the classic beans are better.'], ['A', 'He\'s right. Decaffeinating strips out a lot of the flavour. I just don\'t want caffeine on a day off.'], ['A', 'The Chief used to drink five espressos before bed and sleep like a stone. Then I mentioned that coffee keeps people awake. Now it keeps her awake.'], ['A', 'Like a fairy-tale monster that loses its power once you say its name. ...I still feel a little guilty.']] },
        { title: 'Into the next day', ask: ['The quarterly reports are due, and Asaba\'s section is... blank, so far.', 'Would you ask him how his part is going? Then come by later. I expect I\'ll still be at my desk.'], steps: [{ t: 'talk', to: 'harumasa', reply: 'My part? I was going to start right after my medicine. Tell Tsukishiro it\'s nearly done. ...It isn\'t. She\'ll be at that desk past midnight, y\'know. Somebody should make her go home.' }, { t: 'slot', slot: 3, to: 'yanagi' }],
          scene: [['A', 'Is it that late already? Sometimes I work into the next day without noticing.'], ['P', 'Harumasa says his part is nearly done.'], ['A', 'Then it hasn\'t been started. ...He\'s a good person, though. He once spent half an hour promising a crying Soukaku he would live to a hundred.'], ['A', 'My dream? To clock off on time every day. A warm dinner with the people I love, and a movie on the sofa after work.'], ['P', 'After work. So in your dream you still go to work.'], ['A', '...Oh, heavens. I hadn\'t noticed that.']] },
        { title: 'One fatal strike', ask: ['An Ethereal has surfaced in a Hollow, and I have its file: every weakness, every habit.', 'Put me at the head of your squad with the Chief beside us, Proxy. With the intel in hand, one strike is enough.'], steps: [{ t: 'clear', f: { enc: 'boss', lead: 'yanagi', with: 'miyabi' } }, { t: 'talk', to: 'yanagi' }],
          scene: [['A', 'Target down. Casualties: none. Overtime: minimal. I\'ll have the report done tonight.'], ['P', 'You knew every move it would make.'], ['A', 'That is my job. The Chief\'s is to cut. Yours, it seems, is to see the openings before I\'ve filed them.'], ['A', 'Good work, Chief. ...And thank you, Proxy. Someone has to carry the small things so the others only carry their weapons. Today it wasn\'t only me.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait and in-game models: light pink, loosely wavy
     hair to the chest, side-swept bangs, a long lock in front of her right
     shoulder, the rest down her back; a black hair clip with a small headset
     over her right ear, dark teal earrings, thin black glasses, rose-magenta
     eyes. A white shirt with a high collar and breast pocket, a navy-violet
     ribbon tie, black harness straps over both shoulders, a black waist
     cincher with a bronze ring emblem. On her right shoulder a black spiked
     pauldron with a white eye emblem and a teal gem, a white bow below it,
     and the dark teal jacket draped from that shoulder to the knee (white
     triangle marks, a dark hem with an X). White sleeves, black wristbands
     (an hourglass on the right), black gloves. A black belt, a gold clasp
     with two grey tassels, the HSO-S6 badge at her left hip; a dark slate
     pencil skirt to mid-thigh, gold buttons down her right front, a gold ring
     at the hem, a slit at the left; bare legs, black heeled ankle boots with
     buckled straps. At her left hip the retracted Uro Tsuki, a black device
     with grey plates and a teal light.
     URO TSUKI extended ("Behind the Agent" art): a long black shaft banded
     grey with a mechanical butt, the teal braided grip, the black mechanical
     collar with a clock dial and teal lights, a long silver blade, notched on
     the spine, curving up at the tip: a little longer than she is tall. It
     is drawn only in battle (hookLook, below): out of it she has it
     retracted at her hip, as in the city. 169 cm: scale 0.072. */
  function drawNaginata(g) {
    const SHAFT = 0x25232a, SHAFT2 = 0x525056, WRAP = 0x2b6167, WRAP2 = 0x3a9a9a, COLLAR = 0x302c34, PLATE = 0x838891, DIAL = 0xece8dc;
    const BLADE = 0xc8ccd4, EDGE = 0xf2f2f4, LIGHT = G(0x40e0d0);
    for (let z = -13; z <= -3; z++) g.set(0, 0, z, z % 4 === 0 ? SHAFT2 : SHAFT);          // the shaft behind her hand, banded grey
    g.box(-1, -1, -15, 1, 1, -14, COLLAR); g.set(0, 0, -16, PLATE); g.set(0, 1, -13, LIGHT); // the mechanical butt, a teal ring
    for (let z = -2; z <= 2; z++) g.set(0, 0, z, (z & 1) ? WRAP2 : WRAP);                     // the teal braided grip in her hand
    g.box(-1, -1, 3, 1, 1, 5, COLLAR); g.box(-1, 1, 3, 1, 1, 3, PLATE);                       // the mechanical collar, a grey plate
    g.set(1, 0, 4, DIAL); g.set(-1, 0, 4, DIAL); g.set(1, 1, 4, 0x1a1a1e);                    // the clock dial (it keeps real time, the wiki says)
    g.set(0, 1, 5, LIGHT); g.set(0, -1, 4, LIGHT);                                            // teal light strips
    for (let z = 6; z <= 16; z++) { const y = z >= 13 ? 1 : 0; g.set(0, y, z, BLADE); if (z < 16) g.set(0, y - 1, z, EDGE); }   // the blade, its bright edge below
    for (const z of [6, 8, 10]) g.set(0, 1, z, PLATE);                                        // notches on the spine
  }
  {
    const HAIR = 0xf4c7c4, HAIR2 = 0xdda6a6, HAIR3 = 0xc8908f, HAIRHI = 0xfbdcd8, SKIN = 0xfdece4, SKIN2 = 0xf9dfd5, EYE = 0xa85a82, LASH = 0x3a2630, MOUTH = 0xd88a8a;
    const GLASS = 0x2a2a30, CLIP = 0x414347, EARRING = 0x2a6a68, SHIRT = 0xf1f2f3, SHIRT2 = 0xd8dce2, TIE = 0x2f2a44, STRAP = 0x2d2933, CORSET = 0x1a1729, CORSET2 = 0x2c2938, GOLD = 0xc8a050;
    const BELT = 0x24202b, SILVER = 0xc0c4cc, SKIRT = 0x454955, SKIRT2 = 0x3c404b, TASSEL = 0x8a8c94, BADGE = 0xe8eaee;
    const TEAL = 0x43767b, TEAL2 = 0x316267, TEALD = 0x1e2a32, CORD = 0x54878a, MARK = 0xeef0f2, PAUL = 0x282e38, PAUL2 = 0x3a404a, SPIKE = 0xe4e2e8, GEM = G(0x3fd0c8);
    const GLOVE = 0x2f2b34, BOOT = 0x36333c, BOOT2 = 0x43444b, DEVICE = 0x25232a, PLATE = 0x838891, KNOB = 0x174e54;
    const leg = g => {
      H.leg(g, { pant: SKIN2, boot: BOOT, bootH: 3, sole: BOOT2 });                         // bare legs, black ankle boots
      g.cut(-1, -9, 0, 1, -9, 1); g.cut(-1, -9, -1, -1, -9, -1); g.cut(1, -9, -1, 1, -9, -1);   // high heels: the arch lifts onto a narrow heel
      g.box(-1, -7, -1, 1, -7, 1, BOOT2); g.set(1, -7, 2, SILVER); g.set(0, -8, 2, BOOT2);   // the buckled straps
    };
    const sleeve = g => { H.arm(g, { sleeve: SHIRT, sleeveTo: 6, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 }); g.box(-1, -5, -1, 1, -5, 1, STRAP); };   // white sleeve, black wristband and glove
    MODELS.yanagi = H.humanoid({
      scale: 0.072, height: 28, width: 20,
      sockets: { weapon: ['naginata', [0, 0, 14]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 2, SKIRT);                                                    // the high waist of the skirt...
        g.box(-4, -5, -2, 4, -2, 2, (x, y, z) => (z === 2 && (x + y) % 3 === 0 ? SKIRT2 : SKIRT));   // ...a pencil skirt to mid-thigh
        g.cut(3, -5, 2, 4, -4, 2);                                                            // the slit at her left front
        g.box(-3, 0, -2, 3, 0, 2, BELT); g.set(0, 0, 3, SILVER); g.set(-2, 0, 2, TEAL2); g.set(2, 0, 2, TEAL2);   // the belt, its buckle, teal accents
        for (const y of [-2, -3, -4]) g.set(-3, y, 3, GOLD);                                  // gold buttons down her right front
        g.set(-4, -5, 3, GOLD);                                                               // a gold ring at the hem
        g.set(-2, -1, 3, GOLD); g.set(-1, -1, 3, GOLD); g.box(-2, -3, 3, -2, -2, 3, TASSEL); g.box(-1, -3, 3, -1, -2, 3, TASSEL);   // the gold clasp, two grey tassels
        g.box(2, -3, 3, 3, -2, 3, BADGE); g.set(2, -1, 3, STRAP); g.set(3, -3, 3, 0x9aa0ac);   // the HSO-S6 ID badge at her left hip
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, CORSET); g.box(-2, 0, 2, 2, 2, 2, CORSET);                    // the black waist cincher...
        for (const [x, y] of [[-1, 1], [1, 1], [0, 2], [0, 0]]) g.set(x, y, 3, GOLD); g.set(0, 1, 3, CORSET2);   // ...its bronze ring emblem
        g.box(-3, 3, -2, 3, 6, 1, SHIRT); g.box(-2, 3, 2, 2, 5, 2, SHIRT);                      // the white shirt
        g.set(2, 4, 3, SHIRT2);                                                               // the breast pocket
        g.set(-1, 6, 2, SHIRT); g.set(1, 6, 2, SHIRT); g.set(0, 6, 2, TIE);                   // the high collar, the ribbon's knot...
        g.set(-1, 5, 3, TIE); g.set(1, 5, 3, TIE); g.set(0, 4, 3, TIE); g.set(-1, 3, 3, TIE);   // ...its loops and tails
        for (const x of [-2, 2]) { g.box(x, 3, 2, x, 4, 2, STRAP); g.box(x, 6, -2, x, 6, 1, STRAP); g.box(x, 3, -2, x, 5, -2, STRAP); }   // the harness straps over both shoulders
        g.box(-3, 3, -2, -3, 6, 1, TEAL); g.box(-3, 6, -2, -2, 6, 1, TEAL);                   // the teal jacket over her right shoulder
        g.set(-2, 5, 3, MARK); g.set(-2, 4, 3, MARK);                                         // the white bow below the pauldron
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 0], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 1]], sideTo: 2 });   // side-swept bangs
        g.set(-2, 7, 4, HAIRHI); g.set(-1, 6, 4, HAIRHI); g.set(2, 6, 4, HAIRHI); g.set(3, 7, 3, HAIRHI);   // light catching the bangs
        g.box(-2, 1, 4, -1, 1, 4, GLASS); g.box(1, 1, 4, 2, 1, 4, GLASS);                       // thin black glasses: the lower rims...
        g.set(-3, 2, 4, GLASS); g.set(3, 2, 4, GLASS); g.set(0, 3, 4, GLASS);                 // ...the outer corners, the bridge (the bangs hide the top rims)
        g.box(-3, -5, 2, -3, 1, 3, (x, y) => (y & 1 ? HAIR : HAIR2)); g.set(-3, -6, 2, HAIR3); // the long lock in front of her right shoulder
        g.box(-4, -3, -4, 4, -1, -4, HAIR2);                                                  // the back of the hair, below the cap
        g.box(-5, 3, 0, -5, 7, 0, CLIP); g.box(-5, 1, 1, -5, 2, 1, CLIP); g.set(-6, 2, 1, EARRING);   // the hair clip and headset over her right ear
        g.set(-4, 0, 1, EARRING); g.set(4, 0, 1, EARRING);                                    // dark teal earrings
      },
      armL: sleeve,
      armR(g) {
        sleeve(g); g.set(-2, -5, 0, SILVER);                                                  // the wristband's hourglass emblem
        g.box(-2, -2, -2, 1, 1, 2, (x, y, z) => ((x + y + z) & 1 ? PAUL : PAUL2));             // the black pauldron, studded with diamonds
        g.set(-3, 0, 0, MARK); g.set(-3, -1, 0, MARK); g.set(-3, -1, 1, MARK); g.set(-3, 0, 1, GEM);   // its white eye emblem, the teal gem
        [[-1, 2, 0], [-1, 3, 0], [0, 2, -1], [-2, 2, 1], [-2, 3, 1]].forEach(([x, y, z]) => g.set(x, y, z, SPIKE));   // white spikes on top
      },
      legL: leg,
      legR: leg,
      extra: {
        tail: {   // her hair down her back, loosely wavy, parting into locks at the ends
          parent: 'head', at: [0, 2, -4], draw(g) {
            for (let i = 0; i < 9; i++) {
              const z = -1 - (i > 4 ? 1 : 0), col = x => ((x + i) % 4 === 0 ? HAIR2 : (x * 3 + i) % 7 === 0 ? HAIRHI : i > 6 ? HAIR2 : HAIR);
              if (i < 6) g.box(i < 4 ? -4 : -3, -i, z - 1, i < 4 ? 4 : 3, -i, z, col);
              else for (const [x0, n] of [[-3, 9], [0, 8], [2, 9]]) if (i < n) g.box(x0, -i, z - 1, x0 + 1, -i, z, col);
            }
          },
        },
        tailR: {  // the dark teal jacket draped from her right shoulder, hanging behind the arm to the knee
          parent: 'torso', at: [-5, 6, -2], draw(g) {
            g.box(-2, -11, -1, 0, 0, 0, (x, y) => (y <= -8 ? TEALD : x === -2 ? TEAL2 : TEAL));
            for (const [x, y] of [[-1, -3], [-2, -4], [0, -4], [-1, -5], [-2, -5], [0, -5]]) g.set(x, y, -1, MARK);   // white triangle marks
            for (const [x, y] of [[-2, -9], [0, -9], [-1, -10], [-2, -11], [0, -11]]) g.set(x, y, -1, MARK);          // the X near the hem
            g.box(1, -6, 0, 1, 0, 0, CORD);                                                    // the teal braided cord
          },
        },
        holster: {  // Uro Tsuki retracted, at her left hip
          parent: 'hips', at: [5, -1, 0], rot: [0, 0, 0.12], draw(g) {
            g.box(0, -7, -1, 0, 0, 0, DEVICE); g.box(0, -1, -1, 1, 0, 0, PLATE); g.set(1, -4, 0, PLATE);
            g.set(1, -2, -1, KNOB); g.set(0, -7, 0, G(0x40e0d0));                              // a teal knob, the teal light at its end
          },
        },
        // the extended naginata in her right hand: empty here, filled in battle (hookLook). Tilted so that, with her
        // arm in the ready stance, the blade points forward and down and the shaft rises behind her
        naginata: { parent: 'armR', at: [0, -7, 1], rot: [1.05, 0, 0] },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     Her stance: the naginata low in her right hand, the blade forward and
     down, the shaft rising behind her (the in-game model). Poses below are
     the angles she reaches (rel() turns them into the change from it).
     Jougen (the waxing quarter moon): rising cuts and sweeps. Kagen (the
     waning one): thrusts and falling cuts (our reading of the names). */
  ANIM.READY.naginata = { armR: [-0.45, 0.1, -0.2], armL: [-0.25, 0, 0.18], torso: [0.06, 0.2, 0], head: [0, -0.15, 0], legL: [-0.25, 0, 0.06], legR: [0.2, 0, -0.06], hipsY: -0.04 };
  const R0 = ANIM.READY.naginata;
  const rel = o => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].map((v, i) => v - R0[k][i]) : k === 'hipsY' ? o[k] - R0.hipsY : o[k]; return r; };
  const LOW = rel({ armR: [-0.25, 0.4, 0.55], armL: [-0.3, 0, 0.3], torso: [0.15, -0.5, 0], head: [0, 0.4, 0], hipsY: -0.12, legL: [-0.6, 0, 0.1], legR: [0.4, 0, -0.1] });   // low, across to the left
  const HIGH = rel({ armR: [-2.5, -0.3, -0.5], armL: [-0.4, 0, 0.5], torso: [-0.1, 0.5, 0], head: [0, -0.3, 0], hipsY: -0.06, legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] });   // the blade swept up to the right
  const OVER = rel({ armR: [-2.9, 0.1, -0.2], armL: [-1.0, 0, 0.3], torso: [-0.25, 0.3, 0], head: [-0.1, -0.2, 0], hipsY: -0.05, legL: [-0.3, 0, 0.1], legR: [0.25, 0, -0.1] });   // raised overhead
  const DOWN = rel({ armR: [-0.75, 0, 0.25], armL: [-0.5, 0, 0.4], torso: [0.4, -0.25, 0], head: [0.1, 0.2, 0], hipsY: -0.18, legL: [-0.95, 0, 0.12], legR: [0.7, 0, -0.1] });   // cut down, low
  const DRAW = rel({ armR: [-0.7, 0, -0.2], armL: [-0.9, 0.3, 0.3], torso: [0.05, 0.6, 0], head: [0, -0.5, 0], hipsY: -0.1, legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1] });   // drawn back to thrust
  const STAB = rel({ armR: [-1.15, 0, 0.05], armL: [-0.3, 0, 0.6], torso: [0.3, -0.25, 0], head: [-0.15, 0.2, 0], hipsY: -0.16, legL: [-1.05, 0, 0.1], legR: [0.75, 0, -0.1] });   // lunging, the blade level
  const WIDE = rel({ armR: [-1.45, 0, -1.25], armL: [-0.4, 0, 0.9], torso: [0.05, 0, 0], head: [0, 0, 0], hipsY: -0.1, legL: [-0.4, 0, 0.15], legR: [0.3, 0, -0.15] });   // arm out, to spin
  const SWING = rel({ armR: [-1.3, 0, -1.2], torso: [0.05, 0.6, 0], head: [0, -0.4, 0], hipsY: -0.08, legL: [-0.5, 0, 0.1], legR: [0.35, 0, -0.1] });   // out to the right...
  const CUT = rel({ armR: [-1.3, 0, 0.8], armL: [-0.5, 0, 0.6], torso: [0.12, -0.6, 0], head: [0, 0.4, 0], hipsY: -0.1, legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] });   // ...and across to the left
  const RUSH = rel({ armR: [0.35, 0, -0.4], armL: [0.3, 0, 0.4], torso: [0.6, -0.3, 0], head: [-0.4, 0.3, 0], hipsY: -0.2, legL: [-1.2, 0, 0], legR: [0.9, 0, 0] });   // low and fast, the blade trailing
  const ygRing = (b, t, th, P, turns) => add(stage(b, P, P, t, th, 9), { spin: clamp((t - th * 0.3) / (th * 0.9), 0, 1) * PI * 2 * (turns || 1) });
  ACT.ygRise = (b, t, th, d) => stage(b, LOW, HIGH, t, th, d);
  ACT.ygFall = (b, t, th, d) => stage(b, OVER, DOWN, t, th, d);
  ACT.ygCross = (b, t, th, d) => stage(b, SWING, CUT, t, th, d);
  ACT.ygThrust = (b, t, th, d) => stage(b, DRAW, STAB, t, th, d);
  // Jougen 3: one turn, the blade sweeping round her
  ACT.ygSweep = (b, t, th, d) => { const p = ygRing(b, t, th, WIDE); return t < d * 0.75 ? p : mix(p, b, U.ease(clamp((t - d * 0.75) / (d * 0.25), 0, 1))); };
  // Jougen 4: a rising cut and a falling one
  ACT.ygTwin = (b, t, th, d) => t < 0.24 ? ACT.ygRise(b, t, 0.16, 0.24) : ACT.ygFall(b, t - 0.24, 0.08, d - 0.24);
  // Jougen 5: a leaping, spinning rise, the crescent drawn overhead
  ACT.ygCrescent = (b, t, th, d) => add(stage(b, LOW, HIGH, t, th, d), { spin: clamp(t / (th + 0.05), 0, 1) * PI * 2, lift: 0.35 * Math.sin(clamp(t / (th + 0.25), 0, 1) * PI) });
  // Kagen 3: quick stabs
  ACT.ygFlurry = (b, t, th, d) => { const k = 0.5 + 0.5 * Math.sin(t * 40 - 1.2), p = mix(add(b, DRAW), add(b, STAB), k); return t < d * 0.7 ? p : mix(p, b, U.ease(clamp((t - d * 0.7) / (d * 0.3), 0, 1))); };
  // Kagen 4: a low spinning cut that ends falling
  ACT.ygFallSpin = (b, t, th, d) => add(stage(b, WIDE, DOWN, t, th, d), { spin: clamp(t / (th + 0.04), 0, 1) * PI * 2 });
  // Kagen 5: up, and the blade driven down where she lands
  ACT.ygPlunge = (b, t, th, d) => add(stage(b, OVER, DOWN, t, th, d), { tilt: t < th ? -0.15 * Math.sin(t / th * PI) : 0 });
  ACT.ygDash = (b, t, th, d) => stage(b, RUSH, CUT, t, th, d);
  ACT.ygCounter = (b, t, th, d) => add(stage(b, LOW, HIGH, t, th, d), { spin: clamp(t / (th + 0.04), 0, 1) * PI * 2 });
  // Ruten: the naginata twirled once round her, then the slash (the stance changes with it)
  ACT.ygRuten = (b, t, th, d) => add(stage(b, WIDE, CUT, t, th, d), { spin: clamp(t / (th + 0.02), 0, 1) * PI * 2 });
  // Gekka Ruten: the charge (crouched, trembling), the thrust through, up into the air, the blade driven down
  ACT.ygGekka = (b, t, th, d) => {
    if (t < 0.36) return add(b, Object.assign({}, DRAW, { roll: Math.sin(t * 40) * 0.012 * Math.min(1, t * 3), hipsY: DRAW.hipsY - 0.06 }));
    if (t < 0.6) return stage(b, DRAW, STAB, t - 0.3, 0.12, 0.3);
    if (t < 0.84) return mix(add(b, STAB), add(b, OVER), U.easeOut(clamp((t - 0.6) / 0.2, 0, 1)));
    return stage(b, OVER, DOWN, t - 0.8, 0.12, d - 0.8);
  };
  // Celestial Harmony: a turn to gather the swing, then one great falling cut
  ACT.ygChain = (b, t, th, d) => t < 0.56 ? ygRing(b, t, 0.4, WIDE) : stage(b, OVER, DOWN, t - 0.56, 0.14, d - 0.56);
  // Raiei Tenge: crouched, gathering; the wide slash; still, the blade raised as the lightning falls
  ACT.ygUlt = (b, t, th, d) => {
    if (t < 0.85) return add(b, Object.assign({}, DRAW, { roll: Math.sin(t * 36) * 0.014 * Math.min(1, t * 2), hipsY: DRAW.hipsY - 0.08 }));
    if (t < 1.35) return stage(b, SWING, CUT, t - 0.85, 0.15, 0.5);
    const up = add(b, rel({ armR: [-2.6, 0, -0.3], armL: [-0.3, 0, 0.4], torso: [-0.15, -0.2, 0], head: [-0.3, 0, 0], hipsY: -0.06 }));
    return t < 1.9 ? mix(add(b, CUT), up, U.easeOut(clamp((t - 1.35) / 0.2, 0, 1))) : mix(up, b, U.ease(clamp((t - 1.9) / Math.max(0.05, d - 1.9), 0, 1)));
  };
  // Weeping Willow Stab: the stabs, then a rising slash
  ACT.ygWillow = (b, t, th, d) => t < 0.6 ? ACT.ygFlurry(b, t, th, 10) : stage(b, LOW, HIGH, t - 0.6, 0.14, d - 0.6);
  // Radiant Reversal: the shaft held across, meeting the blow
  ACT.ygParry = b => add(b, rel({ armR: [-1.6, 0.4, 0.5], armL: [-1.2, -0.3, -0.3], torso: [0.1, 0.2, 0], head: [0, -0.2, 0], hipsY: -0.1, legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1] }));

  /* ------------------------------------------------------------- effects --
     The official clips: blue-white lightning, cyan sparks, star glints; her
     arcs are electric blue edged with a pale moonlit violet (Physical: pale
     steel). ygArc / ygRing: arcs and ring slashes; ygStab: a thrust's line;
     ygMoon: a great crescent (Chain Attack, Ultimate); ygBolt: lightning on
     the target; ygMark / ygStreak: Gekka Ruten's thrust; ygFlash: the
     blade's glint. Streams: ygCharge (gathering lightning), ygTrail. */
  const E = CHOREO.events, S = CHOREO.streams, _v = new THREE.Vector3();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shake = s => { BT.B.cam.shake = Math.max(BT.B.cam.shake, s); };
  const tgtPos = (a, A, tgt, k) => tgt ? [tgt.x, tgt.z] : [a.x + Math.sin(A.dir) * (k || 2), a.z + Math.cos(A.dir) * (k || 2)];
  const sparks = (x, y, z, n, sp) => FX.burst(x, y, z, n, { col: ELEC, speed: sp || 5, size: 0.08, life: 0.3, g: 1 });
  E.ygArc = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.0) + (a.airY || 0), r = e.r || 2.4, o = { tilt: e.tilt || 0, arc: e.arc || 2.6, life: 0.3, sweep: e.sweep || 1.0 };
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, e.phys ? STEEL : BLUE, Object.assign({ width: e.big ? 0.6 : 0.42 }, o));
    FX.slash(a.x + fx * 0.3, y + 0.03, a.z + fz * 0.3, r * 0.88, dir, e.phys ? 0xffffff : VIOLET, Object.assign({}, o, { width: 0.14, life: 0.24 }));
    if (!e.phys) sparks(a.x + fx * r * 0.8, y, a.z + fz * r * 0.8, e.big ? 18 : 8);
    if (e.big) shake(0.16);
  };
  E.ygRing = (a, A, e) => {
    const y = (e.y || 0.9) + (a.airY || 0), r = e.r || 2.6, o = { tilt: e.tilt || 0, arc: 6.1, life: 0.32, sweep: 1.6 };
    FX.slash(a.x, y, a.z, r, A.dir, BLUE, Object.assign({ width: e.big ? 0.55 : 0.42 }, o));
    FX.slash(a.x, y + 0.04, a.z, r * 0.9, A.dir, VIOLET, Object.assign({}, o, { width: 0.14, life: 0.26 }));
    FX.ring(a.x, a.z, 0.4, r, 0x9ad8ff, 0.35, { a: 0.55 });
    for (let i = 0; i < 4; i++) { const an = rnd(0, PI * 2); sparks(a.x + Math.cos(an) * r * 0.9, y, a.z + Math.sin(an) * r * 0.9, 4); }
    if (e.big) shake(0.2);
  };
  E.ygStab = (a, A, e) => {
    const L = e.len || 3.2, fx = Math.sin(A.dir), fz = Math.cos(A.dir), y = 1.0 + (a.airY || 0), p0 = V(a.x + fx * 0.5, y, a.z + fz * 0.5), p1 = V(a.x + fx * L, y, a.z + fz * L);
    FX.beam(p0, p1, e.phys ? STEEL : BLUE, e.big ? 0.32 : 0.16, 0.2); FX.beam(p0.clone(), p1.clone(), 0xffffff, e.big ? 0.1 : 0.05, 0.16);
    FX.glow(p1.x, y, p1.z, e.big ? 1.6 : 1.0, e.phys ? 0xffffff : 0x9ad8ff, 0.16);
    if (!e.phys) sparks(p1.x, y, p1.z, e.big ? 16 : 6);
    if (e.big) shake(0.2);
  };
  // a great crescent: stacked arcs in white, electric blue and moonlit violet, flying wide ahead of her
  E.ygMoon = (a, A, e) => {
    const r = e.r || 4, dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir);
    [0xffffff, BLUE, VIOLET].forEach((c, i) => FX.slash(a.x + fx * 0.4, 1.0 + i * 0.12, a.z + fz * 0.4, r * (1 - i * 0.1), dir, c, { tilt: (e.tilt || 0) + i * 0.04, arc: e.arc || 2.4, width: 0.95 - i * 0.25, life: 0.45, sweep: 1.4 }));
    FX.glow(a.x + fx * r * 0.6, 1.1, a.z + fz * r * 0.6, r * 0.8, 0x9ad8ff, 0.28, { size1: r * 1.4 });
    for (let i = 0; i < 6; i++) { const an = dir + rnd(-0.9, 0.9), d = rnd(r * 0.5, r); sparks(a.x + Math.sin(an) * d, rnd(0.6, 1.6), a.z + Math.cos(an) * d, 5, 6); }
    shake(e.big ? 0.4 : 0.25); SFX.play('heavy');
  };
  E.ygBolt = (a, A, e, tgt) => {
    const [x, z] = tgtPos(a, A, tgt, 2.2), n = e.n || 1;
    for (let i = 0; i < n; i++) FX.named('bolt', { x: x + (i ? rnd(-1.8, 1.8) : 0), z: z + (i ? rnd(-1.8, 1.8) : 0), r: e.big ? 3.2 : 2 });
    FX.glow(x, 1.2, z, e.big ? 4 : 2.4, 0xb8d8ff, 0.3, { size1: e.big ? 6 : 3.5 });
    shake(e.big ? 0.4 : 0.18); SFX.play(e.big ? 'boom' : 'heavy');
  };
  E.ygMark = (a, A) => { A.ygFrom = { x: a.x, z: a.z }; };
  E.ygStreak = (a, A) => {
    const f = A.ygFrom || { x: a.x - Math.sin(A.dir) * 4, z: a.z - Math.cos(A.dir) * 4 };
    if (Math.hypot(a.x - f.x, a.z - f.z) < 0.4) return;
    FX.beam(V(f.x, 1.0, f.z), V(a.x, 1.0, a.z), BLUE, 0.45, 0.4); FX.beam(V(f.x, 1.0, f.z), V(a.x, 1.0, a.z), 0xffffff, 0.12, 0.32);
    for (let i = 0; i < 26; i++) { const k = Math.random(); FX.p({ x: lerp(f.x, a.x, k), y: 1.0 + rnd(-0.3, 0.3), z: lerp(f.z, a.z, k), vy: rnd(0, 0.8), life: rnd(0.3, 0.6), size: 0.12, size1: 0.02, col: U.pick(ELEC) }); }
  };
  E.ygFlash = a => { BT.sock(a, 'weapon', _v); FX.glow(_v.x, _v.y, _v.z, 1.3, 0xffffff, 0.14, { size1: 2.2 }); sparks(_v.x, _v.y, _v.z, 10); SFX.play('swing'); };
  // gathering lightning: sparks drawn in to her, short arcs crackling round her feet
  S.ygCharge = (a, A, s, dt) => {
    if (Math.random() < dt * 30) { const an = rnd(0, PI * 2), r = rnd(1.2, 2.4); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.2, 1.8), z: a.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.4, vz: -Math.sin(an) * r * 2.4, drag: 1, life: 0.38, size: 0.1, size1: 0.02, col: U.pick(ELEC) }); }
    if (Math.random() < dt * 10) { const a0 = rnd(0, PI * 2), a1 = a0 + rnd(0.5, 1.2), r = rnd(1.2, 1.8); FX.beam(V(a.x + Math.cos(a0) * r, rnd(0.2, 1.2), a.z + Math.sin(a0) * r), V(a.x + Math.cos(a1) * r, rnd(0.2, 1.2), a.z + Math.sin(a1) * r), U.pick([0x9ad8ff, 0xffffff, VIOLET]), 0.05, 0.08); }
    if (Math.random() < dt * 4) FX.ring(a.x, a.z, 0.3, 1.8, BLUE, 0.4, { a: 0.4 });
  };
  S.ygTrail = (a, A, s, dt) => {
    const n = Math.max(1, Math.round(dt * 110));
    for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.2, 0.2), y: 0.3 + rnd(0, 1.3) + (a.airY || 0), z: a.z + rnd(-0.2, 0.2), life: 0.35, size: 0.12, size1: 0.02, col: Math.random() < 0.3 ? VIOLET : U.pick(ELEC) });
    if (Math.random() < 0.5) FX.glow(a.x, 1.0 + (a.airY || 0), a.z, 1.2, 0x9ad8ff, 0.2, { size1: 1.0, a: 0.5 });
  };
  // a stance switch: a ring of the new stance's colour under her (the diamonds: blue Jougen, orange Kagen)
  function stanceFx(a) {
    if (!a.obj || !a.obj.visible) return;
    const c = a.ygStance === 'kagen' ? KAGEN : JOUGEN;
    FX.ring(a.x, a.z, 0.3, 1.9, c, 0.42, { y: 0.08 }); FX.ring(a.x, a.z, 0.2, 1.2, 0xffffff, 0.3, { y: 0.1 });
    BT.sock(a, 'chest', _v); FX.glow(_v.x, _v.y, _v.z, 1.2, c, 0.2, { size1: 1.8 });
  }
  // Polarity Disorder: two bolts, the Anomaly's colour and white, rings opening round it (the Anomaly stays)
  function polarFx(v, An) {
    const col = D.ATTR[An.attr] ? D.ATTR[An.attr].hex : BLUE;
    FX.named('bolt', { x: v.x + 0.4, z: v.z, r: 3 }); FX.named('bolt', { x: v.x - 0.4, z: v.z, r: 2.2 });
    FX.ring(v.x, v.z, 0.4, 3.6, 0xffffff, 0.45, { y: 0.1 }); FX.ring(v.x, v.z, 0.3, 2.6, col, 0.5, { y: 0.12 }); FX.ring(v.x, v.z, 0.3, 1.6, VIOLET, 0.4, { y: 0.14 });
    FX.glow(v.x, 1.3, v.z, 3.4, 0xd8c8ff, 0.35, { size1: 5.5 });
    FX.burst(v.x, 1.2, v.z, 40, { col: [0xffffff, 0xd8c8ff, col, BLUE], speed: 8, size: 0.13, size1: 0.03, life: 0.6, g: 1, up: 1 });
    shake(0.35); SFX.play('anomaly');
  }
  function blockFx(a) {
    BT.sock(a, 'weapon', _v);
    FX.glow(_v.x, _v.y, _v.z, 1.6, 0xd8e8ff, 0.18, { size1: 2.6 }); sparks(_v.x, _v.y, _v.z, 16, 6);
    if (BT.T.dmgNumbers) FX.number(a.x, a.height, a.z, 'BLOCK', 'miss');
    SFX.play('parry');
  }

  /* --------------------------------------------------- Uro Tsuki, drawn --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Yanagi) her rig's empty naginata part gets the extended weapon, once:
     in battle she holds it; everywhere else (Section 6's office, the squad
     screen) it stays retracted at her hip. */
  let PROTO = null;
  const proto = () => PROTO || (PROTO = (() => { const g = new VX.Grid(); drawNaginata(g); return VX.object(g, MODELS.yanagi.scale, { cast: false }); })());
  function arm(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.naginata || P.naginata.userData.armed) return;
    P.naginata.add(proto().clone()); P.naginata.userData.armed = true;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded, or at her first battle)
  let hooked = false;
  function hookLook() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'yanagi') arm(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'yanagi') arm(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookLook); else hookLook();

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const arc = (t, o) => Object.assign({ t, fx: 'ygArc' }, o || {});
  const stab = (t, o) => Object.assign({ t, fx: 'ygStab' }, o || {});
  // Jougen
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.45 }], events: [arc(0.15, { phys: true, tilt: -0.7, sweep: -1.0, r: 2.3 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.17, kind: 'side', d: 0.3, side: 'auto' }], events: [arc(0.17, { phys: true, tilt: 0.1, r: 2.4, arc: 2.8 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.22, kind: 'fwd', d: 0.4 }], events: [{ t: 0.22, fx: 'ygRing', r: 2.8, y: 0.9 }] });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.32, kind: 'fwd', d: 0.5, ease: 'lin' }], events: [arc(0.16, { tilt: -0.7, sweep: -1.0 }), arc(0.32, { tilt: 0.9, r: 2.5 })] });
  set(K.basic[4], { motion: [{ t0: 0.04, t1: 0.5, kind: 'leap', h: 0.5, d: 0.6 }], stream: [{ t0: 0.04, t1: 0.4, kind: 'spark' }],
    events: [{ t: 0.36, fx: 'ygRing', r: 2.9, y: 1.1, tilt: -0.25, big: true }, { t: 0.38, fx: 'ygMoon', r: 3, tilt: -0.5, arc: 2.0 }] });
  // Kagen
  set(K.kagen[0], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.6 }], events: [stab(0.16, { phys: true, len: 3.4 })] });
  set(K.kagen[1], { motion: [{ t0: 0.02, t1: 0.18, kind: 'fwd', d: 0.3 }], events: [arc(0.18, { phys: true, tilt: 1.3, r: 2.3 })] });
  set(K.kagen[2], { motion: [{ t0: 0.02, t1: 0.3, kind: 'fwd', d: 0.5, ease: 'lin' }], events: [0.12, 0.2, 0.28].map(t => stab(t, { len: 3.2 })) });
  set(K.kagen[3], { motion: [{ t0: 0.02, t1: 0.22, kind: 'fwd', d: 0.3 }], events: [{ t: 0.22, fx: 'ygRing', r: 2.7, y: 0.7, tilt: 0.15 }] });
  set(K.kagen[4], { motion: [{ t0: 0.04, t1: 0.42, kind: 'leap', h: 1.3, d: 1.0 }], stream: [{ t0: 0.04, t1: 0.42, kind: 'spark' }],
    events: [arc(0.42, { tilt: 1.45, r: 2.8, big: true }), { t: 0.43, fx: 'dust' }, { t: 0.44, fx: 'ygBolt' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: 0x9ad8ff }], events: [arc(0.2, { phys: true, tilt: 0.2, r: 2.4 })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.1, t1: 0.22, kind: 'fwd', d: 1.0 }], stream: [{ t0: 0, t1: 0.2, kind: 'ygTrail' }],
    events: [arc(0.22, { tilt: -0.6, sweep: -1.0, r: 2.9, big: true }), { t: 0.22, fx: 'ygFlash' }] });
  set(K.special, { motion: [{ t0: 0.02, t1: 0.24, kind: 'fwd', d: 0.4 }], stream: [{ t0: 0.02, t1: 0.24, kind: 'spark' }], events: [arc(0.24, { tilt: 0.15, r: 2.9, arc: 2.9 })] });
  set(K.swift, { motion: [{ t0: 0, t1: 0.12, kind: 'fwd', d: 0.5 }], stream: [{ t0: 0, t1: 0.14, kind: 'afterimage', col: 0xb8a8ff }], events: [arc(0.12, { tilt: 0.15, r: 2.9, arc: 2.9 }), { t: 0.12, fx: 'ygFlash' }] });
  // Gekka Ruten: the charge, the thrust through the target, up, and down on it with the lightning
  set(K.ex, { motion: [{ t0: 0.36, t1: 0.5, kind: 'charge', d: 6, hit: 0.42 }, { t0: 0.56, t1: 0.92, kind: 'leap', h: 1.4, toTarget: true }], stream: [{ t0: 0, t1: 0.36, kind: 'ygCharge' }, { t0: 0.36, t1: 0.5, kind: 'ygTrail' }],
    events: [{ t: 0.35, fx: 'ygMark' }, { t: 0.36, fx: 'ygFlash' }, stab(0.42, { len: 5, big: true }), { t: 0.5, fx: 'ygStreak' }, arc(0.92, { tilt: 1.45, r: 3, big: true }), { t: 0.92, fx: 'ygBolt', big: true }, { t: 0.94, fx: 'whiteFlash' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.0 }, { t0: 0.5, t1: 0.68, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0.08, t1: 0.5, kind: 'ygCharge' }, { t0: 0.5, t1: 0.68, kind: 'ygTrail' }],
    events: [{ t: 0.66, fx: 'ygFlash' }, { t: 0.7, fx: 'ygMoon', r: 4.6, tilt: 1.2, big: true }, { t: 0.72, fx: 'ygBolt' }, { t: 0.72, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.2 }], stream: [{ t0: 0.2, t1: 0.95, kind: 'ygCharge' }],
    events: [{ t: 0.9, fx: 'ygFlash' }, { t: 1.0, fx: 'ygMoon', r: 6.5, arc: 2.6, big: true }, { t: 1.0, fx: 'whiteFlash' }, { t: 1.45, fx: 'ygBolt', n: 3, big: true }, { t: 1.6, fx: 'ygBolt', n: 2, big: true }, { t: 1.6, fx: 'whiteFlash' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.18, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.18, kind: 'ygTrail' }],
    events: [0.2, 0.3, 0.4, 0.5].map(t => stab(t, { len: 3.4 })).concat([arc(0.74, { tilt: -0.6, sweep: -1.0, r: 3.2, big: true }), { t: 0.74, fx: 'ygFlash' }]) });
  set(K.quick, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.22, kind: 'ygTrail' }], events: [arc(0.24, { tilt: -0.6, sweep: -1.0, r: 2.9 })] });
})();
