/* ============================================================================
   agents/lighter.js -- Lighter, the Champion and "Red Scarf" of the Sons of
   Calydon. S-Rank, Fire, Stun, Defensive Assist. Released in Version 1.3.

   (An Agent in his own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)
   Numbers: skill names, inputs and mechanics are the official game's.
   Multipliers are the official level-12 values scaled to this game's tuning:
   DMG x0.45, Daze x0.6; Anomaly Buildup as datamined (/100). Which hits are
   heavy is not listed by any source: the game's usual rule (string finishers,
   counters, EX, Chain, Ultimate, assist follow-ups) decides.

   Sources: Zenless Zone Zero Wiki (Lighter, Lore, Dialogue, DMs, Voice-Overs,
   "Spark", Outer Ring 1-Day Tour, Data Collection, Similar Yet Different
   Nights, Caesar's and Burnice's Dialogue), zzz.gachabase.net (datamine,
   game data 3.4.2 beta), the official HoYoLAB Agent Intro and Core Gameplay
   clip, the official portrait, in-game models and "Behind the Agent" sheet.

   His kit (official):
     Basic Attack: L-Form Thundering Fist   up to 5 forward strikes, hits 1-3
                                     Physical, 4 and 5 Fire. During hit 3, the
                                     stick pushed and Basic again: a series of
                                     melee follow-ups (5 of them; release the
                                     stick for hit 4). Hit 5 is a startup light
                                     punch (stick pushed: it alternates with
                                     hit 4), then a jab combo that keeps going
                                     while Basic is pressed or held, then a
                                     Finishing Move (invulnerable). He takes
                                     40% less DMG through hit 5.
     Dodge: Shadowed Slide           dodging while attacking is a shuffle dodge
                                     that keeps the Basic combo count; Special
                                     during it: a series of punches, EX: a
                                     punch combo (then Basic: hit 5).
     Dash Attack: Charging Slam (Physical)   Dodge Counter: Blazing Flash
                                     (then Basic: hit 5)
     Special Attack: V-Form Sunrise Uppercut
     EX Special Attack: V-Form Sunrise Uppercut - Full Distance (40 Energy; EX
                                     again during it: a follow-up for 20 more;
                                     then Basic: hit 4)
     Chain Attack: V-Form Scorching Sun   Ultimate: W-Form Crowned Inferno
     Quick Assist: Blazing Flash - Guard   Defensive Assist: Swift Break
     Assist Follow-Up: Charging Slam - Stab   (both: then Basic, hit 5)
     Core Passive: Accelerant        Morale (max 100): +2.9 a second, +0.26 for
                                     each point of Energy the squad spends. At
                                     80, his next switch-in launches a Quick
                                     Assist. With 80 or more, hit 5 enters
                                     Morale Burst: the startup, jab combo and
                                     Finishing Move are enhanced and spend
                                     Morale (each 10 spent: +2% Impact, max
                                     +20%, 6 s); no Morale over time; the
                                     startup and jabs cut the target's Ice and
                                     Fire RES by 15% for 30 s; the Finishing
                                     Move's Collapse lengthens a Stun by 3 s
                                     (once a Stun). Morale run dry mid-combo:
                                     the Powerful Finishing Move. Burst ends on
                                     the Finishing Move, off the field, or dry.
     Additional Ability: Fighting Spirit   with an Attack Agent or a Sons of
                                     Calydon member in the squad: Burst hit-5
                                     hits give the whole squad Elation (max 20,
                                     30 s; a Chain Attack refreshes it), +1.25%
                                     Ice and Fire DMG each, +0.25% more a stack
                                     per 10 Impact over 170 (cap +75%).
   Not documented anywhere (our choices, marked below): how much Morale each
   enhanced hit spends (7.5), the jab combo's longest run (2.4 s; Burst 4 s),
   the Morale he starts a fight with (80).
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const MMAX = 100, MCOST = 7.5, M_START = 80;        // Morale: the cap; per enhanced hit and at the start (our choices)
  const JAB_MAX = 2.4, JAB_MAX_B = 4.0;               // the jab combo's longest run (our choice)
  const FLAME = [0xfff0a0, 0xffd060, 0xff9a30, 0xff6a1a, 0xff4a10], BURSTC = [0xffffff, 0xd8ccff, 0x9a8aff, 0xff7ad8];

  /* ----------------------------------------------------------------- kit -- */
  const BA = 'Basic Attack: L-Form Thundering Fist', EXN = 'EX Special Attack: V-Form Sunrise Uppercut - Full Distance';
  const PHYS = { attr: 'physical' };
  const punch = o => Object.assign({ shape: 'cone', r: 2.3, arc: 70, fx: 'ltPunch' }, o);          // a straight punch: a narrow cone, his own impact
  const fire = o => punch(Object.assign({ fx: 'ltPunchF' }, o));
  const K = {
    basic: [
      { name: BA, anim: 'ltJab', dur: 0.36, cancel: 0.26, reach: 1.5, range: 1.3, hits: [hit(0.12, 78.8, 29.5, 0, punch(PHYS))] },
      { name: BA, anim: 'ltCross', dur: 0.42, cancel: 0.3, reach: 1.6, range: 1.3, hits: [hit(0.15, 96.4, 49.4, 0, punch(PHYS))] },
      { name: BA, anim: 'ltOneTwo', dur: 0.58, cancel: 0.44, reach: 1.6, range: 1.3, hits: [hit(0.14, 111.4 * 0.4, 70.9 * 0.4, 0, punch(PHYS)), hit(0.32, 111.4 * 0.6, 70.9 * 0.6, 0, punch(PHYS))] },
      { name: BA, anim: 'ltUpper', dur: 0.55, cancel: 0.42, reach: 1.7, range: 1.4, hits: [hit(0.22, 158.1, 114.6, 55.05, fire({ kb: 0.4 }))] },
      // hit 5: the startup light punch (40% less DMG taken from here to the Finishing Move), the jab combo after it
      { name: BA, anim: 'ltStart', dur: 0.46, cancel: 0.38, reach: 1.8, range: 1.4, dr: 0.4, then: 'jab', hits: [hit(0.18, 327.5, 194.4, 123.87, fire({ r: 2.5 }))] },
    ],
    // the 3rd hit's melee follow-ups (stick pushed, Basic again): all Physical
    fl: [[173.8, 91.3, 'ltHookR'], [96.1, 50.8, 'ltJab'], [116.4, 61.3, 'ltHookL'], [65.8, 34.9, 'ltJab'], [178.1, 93.8, 'ltCross']]
      .map(([d, z, an]) => ({ name: BA, anim: an, dur: 0.36, cancel: 0.26, reach: 1.6, range: 1.3, hits: [hit(0.12, d, z, 0, punch(PHYS))] })),
    // the jab combo: each run of three jabs is one "Combo" multiplier; pressed or held, it goes on (then: the Finishing Move)
    jab: { name: BA, anim: 'ltRush', dur: 0.48, cancel: 0.4, reach: 1.8, range: 1.4, dr: 0.4, then: 'fin', ltJab: true,
      hits: [0.08, 0.2, 0.32].map(t => hit(t, 246.1 / 3, 122.0 / 3, 77.70 / 3, fire({ r: 2.4 }))) },
    fin: { name: BA + ' (Finishing Move)', anim: 'ltFinish', dur: 0.7, cancel: 0.6, reach: 1.9, inv: [0, 0.7], dr: 0.4,
      hits: [hit(0.3, 210.2, 120.2, 76.05, { heavy: true, shape: 'cone', r: 3.0, arc: 80, kb: 1.2, fx: 'ltPunchH' })] },
    // Morale Burst: the same three, enhanced (80% less DMG taken), and the Powerful Finishing Move when Morale runs dry
    b5B: { name: BA + ' (Morale Burst)', anim: 'ltStart', dur: 0.46, cancel: 0.38, reach: 1.8, range: 1.4, dr: 0.8, then: 'jabB', ltBurst: true, hits: [hit(0.18, 355.4, 204.5, 123.87, punch({ fx: 'ltPunchB', r: 2.5 }))] },
    jabB: { name: BA + ' (Morale Burst)', anim: 'ltRush', dur: 0.48, cancel: 0.4, reach: 1.8, range: 1.4, dr: 0.8, then: 'finB', ltBurst: true, ltJab: true,
      hits: [0.08, 0.2, 0.32].map(t => hit(t, 729.5 / 3, 128.4 / 3, 77.70 / 3, punch({ fx: 'ltPunchB', r: 2.4 }))) },
    finB: { name: BA + ' (Morale Burst Finishing Move)', anim: 'ltFinish', dur: 0.75, cancel: 0.65, reach: 1.9, inv: [0, 0.75], dr: 0.8, ltColl: true,
      hits: [hit(0.3, 239.6, 138.3, 83.66, { heavy: true, shape: 'cone', r: 3.2, arc: 80, kb: 1.3, fx: 'ltPunchH' })] },
    finP: { name: BA + ' (Powerful Finishing Move)', anim: 'ltFinish', dur: 0.95, cancel: 0.85, reach: 1.9, inv: [0, 0.95], dr: 0.8, ltColl: true,
      hits: [hit(0.36, 871.0, 199.5, 100.23, { heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.8, fx: 'ltPunchH' })] },
    dash: { name: 'Dash Attack: Charging Slam', anim: 'ltSlam', dur: 0.55, cancel: 0.42, reach: 6, range: 1.3,
      hits: [hit(0.2, 180.1 * 0.4, 68.1 * 0.4, 0, punch(PHYS)), hit(0.32, 180.1 * 0.6, 68.1 * 0.6, 0, punch({ attr: 'physical', kb: 0.6 }))] },
    counter: { name: 'Dodge Counter: Blazing Flash', anim: 'ltCross', dur: 0.62, cancel: 0.48, inv: [0, 0.56], hits: [hit(0.2, 373.3, 253.4, 53.33, { heavy: true, shape: 'cone', r: 3.0, arc: 80, kb: 1.0, fx: 'ltPunchH' })] },
    special: { name: 'Special Attack: V-Form Sunrise Uppercut', anim: 'ltUpper', dur: 0.55, cancel: 0.42, reach: 1.8, range: 1.4, cd: 1.2, dr: 0.4, hits: [hit(0.22, 72.6, 55.0, 30.0, fire({ kb: 0.5 }))] },
    // out of a shuffle dodge: a series of punches (the same skill's multiplier, spread over them: no separate value is listed)
    spShuf: { name: 'Special Attack: V-Form Sunrise Uppercut (shuffle: punches)', anim: 'ltRush', dur: 0.5, cancel: 0.4, reach: 1.8, range: 1.4, cd: 1.2, dr: 0.4,
      hits: [0.08, 0.2, 0.32].map(t => hit(t, 72.6 / 3, 55.0 / 3, 10.0, fire())) },
    ex: { name: EXN, anim: 'ltLeapUpper', dur: 1.0, cancel: 0.85, cost: 40, reach: 2.0, range: 1.4, inv: [0, 0.95],
      hits: [hit(0.24, 973.6 * 0.3, 605.9 * 0.3, 367.64 * 0.3, fire()), hit(0.46, 973.6 * 0.7, 605.9 * 0.7, 367.64 * 0.7, { heavy: true, shape: 'cone', r: 3.0, arc: 90, kb: 1.2, fx: 'ltPunchH' })] },
    // EX again during it (battle.js: Special within the EX's window is K.ex2): the follow-up, down from the air
    ex2: { name: EXN + ' (follow-up)', anim: 'ltDive', dur: 0.9, cancel: 0.75, cost: 20, reach: 2.4, inv: [0, 0.85],
      hits: [hit(0.42, 586.4, 372.0, 223.26, { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.4, fx: 'ltPunchH' })] },
    exShuf: { name: EXN + ' (shuffle: punch combo)', anim: 'ltRushBig', dur: 1.0, cancel: 0.85, cost: 40, reach: 2.0, range: 1.4, inv: [0, 0.95],
      hits: [0.1, 0.22, 0.34, 0.46].map(t => hit(t, 973.6 * 0.1, 605.9 * 0.1, 367.64 * 0.1, fire())).concat([hit(0.68, 973.6 * 0.6, 605.9 * 0.6, 367.64 * 0.6, { heavy: true, shape: 'cone', r: 3.0, arc: 80, kb: 1.2, fx: 'ltPunchH' })]) },
    chain: { name: 'Chain Attack: V-Form Scorching Sun', anim: 'ltScorch', dur: 1.3, inv: [0, 1.3],
      hits: [hit(0.55, 1424.9 * 0.3, 410.7 * 0.3, 447.83 * 0.3, fire({ r: 2.6 })), hit(0.85, 1424.9 * 0.7, 410.7 * 0.7, 447.83 * 0.7, { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.4, fx: 'ltPunchH' })] },
    ult: { name: 'Ultimate: W-Form Crowned Inferno', anim: 'ltCrown', dur: 2.2, inv: [0, 2.2],
      hits: [0.55, 0.8, 1.05].map(t => hit(t, 3016.1 * 0.1, 1421.5 * 0.1, 96.69 * 0.1, { shape: 'circle', at: 'self', r: 3.2 })).concat([hit(1.55, 3016.1 * 0.7, 1421.5 * 0.7, 96.69 * 0.7, { heavy: true, shape: 'circle', at: 'self', r: 5.0, kb: 1.8 })]) },
    // Swift Break: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow; the official Heavy value is 26% more)
    assist: { name: 'Defensive Assist: Swift Break', type: 'defensive', anim: 'ltParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Charging Slam - Stab', anim: 'ltFinish', dur: 0.85, inv: [0, 0.8], hits: [hit(0.3, 439.8, 273.6, 182.72, { heavy: true, shape: 'cone', r: 3.2, arc: 70, kb: 1.2, fx: 'ltPunchH' })] },
    quick: { name: 'Quick Assist: Blazing Flash - Guard', anim: 'ltCross', dur: 0.62, inv: [0, 0.58], hits: [hit(0.22, 140.1, 104.9, 63.33, fire({ r: 2.6, kb: 0.8 }))] },
  };

  /* ----------------------------------------------------- his mechanics -- */
  const baseAttr = at => (D.ATTR[at] && D.ATTR[at].as) || at;
  const fireIce = at => { const b = baseAttr(at); return b === 'fire' || b === 'ice'; };
  // Elation: the stacks' Ice and Fire DMG (each stack's worth fixed when it was gained), capped at +75%
  const elation = a => { const B = BT.B; return a.ltEl > 0 && a.ltElT > B.t ? Math.min(75, a.ltEl * a.ltElPer) / 100 : 0; };
  // what the squad's Fire and Ice hits get from him: Elation, and the 15% RES cut on a target his Burst jabs marked
  // (the RES cut, -15% RES, as +15% DMG in this game's attribute multiplier)
  const squadBonus = (a, v) => elation(a) + (v && v.ltShred > BT.B.t ? 0.15 : 0);
  const setImpact = a => { a.st.impact = Math.round(a.ltImp0 * (1 + 0.02 * a.ltImpN)); };
  function addMorale(a, n) {
    const m0 = a.morale; a.morale = clamp(a.morale + n, 0, MMAX);
    if (m0 < 80 && a.morale >= 80 && !a.ltQA) { a.ltQA = true; BT.log('Lighter: 80 Morale. His next switch-in is a Quick Assist.', 'skill'); }
  }
  // Morale spent by an enhanced hit: each 10 raises his Impact 2% (up to 20%) for 6 s
  function spendMorale(a, n) {
    const B = BT.B; a.morale = Math.max(0, a.morale - n); a.ltCons += n;
    while (a.ltCons >= 10) { a.ltCons -= 10; a.ltImpN = Math.min(10, a.ltImpN + 1); a.ltImpT = B.t + 6; }
    setImpact(a);
  }
  // the player's stick is pushed (AUTO never pushes it: its follow-up flurry is planned in start)
  const pushing = a => BT.isPlayer(a) && !!(BT.moveInput && BT.moveInput());
  const fifth = (a, step) => ({ def: a.ltBurst || a.morale >= 80 ? K.b5B : K.basic[4], kind: 'basic', step });

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.lighter = {
    id: 'lighter', name: 'Lighter', short: 'Lighter', faction: 'Sons of Calydon', spec: 'Stun', attr: 'fire', rank: 'S',
    color: '#ac4130', color2: '#c9a85a', assist: 'defensive', stance: 'champion',
    blurb: 'The Sons of Calydon\'s Champion, the "Red Scarf" who duels the other gang\'s strongest: an ex-mercenary in shades who claims he faints at the sight of blood. One engine-driven gauntlet, "Spark": his 5th Basic hit becomes a jab combo, and with 80 Morale a Morale Burst that piles on Daze, cuts Fire and Ice RES and fires up the squad\'s Elation.',
    stats: { hp: 9240, atk: 2940, def: 655, impact: 155, ap: 90, am: 91, cr: 0.1, cd: 0.8, er: 1.2, speed: 4.8 },
    ai: { range: 1.4, dodge: 0.78, reflex: 0.6, aggr: 1.0 },
    energyMax: 120, resource: 'morale',
    core: [
      ['Core Passive: Accelerant', 'Lighter gains 2.9 Morale a second, and 0.26 for every point of Energy the squad spends (max 100). At 80 Morale his next switch-in launches a Quick Assist. With 80 or more, the 5th hit of his Basic Attack puts him in Morale Burst: its startup punch, jab combo and Finishing Move are enhanced and spend Morale as they land (each 10 spent: +2% Impact, up to 20%, for 6 s), and Morale stops coming on its own. He enters a fight with 80 Morale (our choice: the official start is not documented).'],
      ['Morale Burst', 'Burst startup punches and jabs cut the target\'s Ice and Fire RES by 15% for 30 s; the Burst Finishing Move puts Collapse on a Stunned enemy (its Stun lasts 3 s longer, once a Stun). If Morale runs dry mid-combo he follows with the Powerful Finishing Move. Burst ends when a Finishing Move lands, when he leaves the field, or when Morale runs out; what is left is kept. Through the whole 5th hit he takes 40% less DMG (80% in Burst).'],
      ['The 5th hit, the shuffle dodge', 'Hit 5 is a startup light punch (stick pushed: Basic swaps between it and hit 4), then a jab combo that runs on while Basic is pressed or held, then the Finishing Move. During hit 3, Basic with the stick pushed throws five melee follow-ups. Dodging mid-attack is a shuffle dodge that keeps the combo count: Special out of it is a series of punches, the EX a punch combo. After the Dodge Counter, Quick Assist, Assist Follow-Up or shuffle EX, Basic is hit 5; after the EX, hit 4. Special again during the EX spends 20 more Energy on its follow-up.'],
      ['Additional Ability: Fighting Spirit', 'With an Attack Agent or another Sons of Calydon member in the squad: each Burst 5th-hit blow that lands gives the whole squad a stack of Elation (max 20, 30 s; any Chain Attack refreshes it): +1.25% Fire and Ice DMG a stack, +0.25% more a stack for every 10 Impact over 170, up to +75%.'],
    ],
    kit: K,
    kitShow: [['Burst', 'jabB'], ['Finish', 'finP'], ['Shuffle', 'exShuf']],
    rivalMoves: [{ k: 'b5B', kind: 'core', p: 0.18, cd: 12 }],
    howto: 'Lighter: his 5th Basic hit turns into a jab combo (keep pressing or holding Basic, then the Finishing Move). With 80 Morale (it fills by itself and when the squad spends Energy) that 5th hit is Morale Burst: big Daze, Fire/Ice RES cut, Elation for the squad, and the Powerful Finishing Move if Morale runs dry; at 80 his next switch-in is a free Quick Assist. Dodge mid-attack for a shuffle dodge (Special or EX out of it), and press Special again during his EX for its follow-up. His assist is a Defensive Assist: he parries.',
    mech: {
      init(a) {
        a.morale = M_START; a.ltBurst = false; a.ltQA = a.morale >= 80; a.ltEn = []; a.ltCons = 0; a.ltImpN = 0; a.ltImpT = 0; a.ltImp0 = a.st.impact;
        a.ltEl = 0; a.ltElT = 0; a.ltElPer = 1.25; a.ltChA = null; a.ltFS = false;
        a.ltSeq = null; a.ltSeqT = 0; a.ltJab0 = 0; a.ltFlN = -1; a.ltFlPlan = 0;
        a.ltTo5 = 0; a.ltTo4 = 0; a.ltShuf = 0; a.ltDodge = null; a.ltPrev = null; a.ltQuickA = null;
      },
      // Fighting Spirit: another Attack Agent, or one of the Sons of Calydon
      squad(a, B) { a.ltFS = B.squad.some(s => s !== a && (s.def.spec === 'Attack' || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B, t = B.t;
        a.ltShuf = 0; a.ltTo5 = 0; a.ltTo4 = 0;
        // Basic right after: hit 5 (Dodge Counter, Quick Assist, Assist Follow-Up, the shuffle EX), hit 4 (the EX and its follow-up)
        if (['counter', 'quick', 'followup'].includes(A.kind) || def === K.exShuf) a.ltTo5 = t + A.dur + 0.6;
        if (def === K.ex || def === K.ex2) a.ltTo4 = t + A.dur + 0.6;
        // where he is in the string: hit 3 (the follow-ups may come), the startup punch, the jab combo
        if (def === K.basic[2]) { a.ltSeq = 'fl'; a.ltFlN = 0; a.ltFlPlan = BT.isPlayer(a) ? 0 : Math.random() < 0.4 ? K.fl.length : 0; a.ltSeqT = t + A.dur + 0.4; }
        else if (K.fl.includes(def)) { a.ltSeq = 'fl'; a.ltFlN = K.fl.indexOf(def) + 1; a.ltSeqT = t + A.dur + 0.4; }
        else if (def === K.basic[4] || def === K.b5B) { a.ltSeq = 'su'; a.ltSeqT = t + A.dur + 0.4; }
        else if (def.ltJab) { if (a.ltSeq !== 'jab') a.ltJab0 = t; a.ltSeq = 'jab'; a.ltSeqT = t + A.dur + 0.4; }
        else { a.ltSeq = null; a.ltSeqT = 0; }
        // Morale Burst: the 5th hit with 80 Morale or more
        if (def === K.b5B && !a.ltBurst) {
          a.ltBurst = true;
          BT.callout('MORALE BURST', 'skill', 'Lighter'); BT.log(`Lighter: Morale Burst! (${Math.floor(a.morale)} Morale)`, 'skill');
        }
        if (def === K.finP) a.ltBurst = false;
        // AUTO presses EX again during the EX now and then: the follow-up
        if (def === K.ex && !(A.data && A.data.manual) && a.energy >= K.ex2.cost && Math.random() < 0.6) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
      },
      hit(a, v, h, A) {
        const B = BT.B, d = A.def;
        // Burst startup and jabs: the RES cut (each target), Morale spent (each blow, once)
        if (d.ltBurst) {
          v.ltShred = B.t + 30;
          if (A.data.ltMH !== h) {
            A.data.ltMH = h; spendMorale(a, MCOST);
            if (a.morale <= 0 && !A.data.ltDry) {                                  // run dry mid-combo: the Powerful Finishing Move at once
              A.data.ltDry = true; a.ltBurst = false;
              BT.log('Lighter: Morale spent! Powerful Finishing Move.', 'skill');
              const tgt = A.tgt; BT.endAct(a); a.queue.unshift({ def: K.finP, kind: 'core', tgt, delay: 0 });
            }
          }
        }
        // Fighting Spirit: a Burst 5th-hit blow gives the squad a stack of Elation
        if (a.ltFS && (d.ltBurst || d === K.finB) && A.data.ltEH !== h) {
          A.data.ltEH = h;
          const imp = a.st.impact, per = 1.25 + (imp > 170 ? 0.25 * Math.floor((imp - 170) / 10) : 0);
          if (!a.ltEl) BT.log(`Fighting Spirit: the squad gains Elation (+${per}% Fire and Ice DMG a stack).`, 'skill');
          a.ltEl = Math.min(20, a.ltEl + 1); a.ltElT = B.t + 30; a.ltElPer = per;
        }
        // the Burst Finishing Moves: Collapse on a Stunned enemy (once a Stun); the plain Burst finish ends the Burst
        if (d.ltColl && v.alive && v.stun > 0 && !v.ltColl) { v.ltColl = true; v.stun += 3; BT.log(`${v.def.name}: Collapse (Stun +3 s).`, 'skill'); }
        if (d === K.finB && a.ltBurst) { a.ltBurst = false; BT.log(`Lighter: Morale Burst ends (${Math.floor(a.morale)} Morale kept).`, 'skill'); }
      },
      mods(a, v, h, A) { return { dmg: fireIce(h.attr || a.def.attr) ? squadBonus(a, v) : 0 }; },
      // the same for his teammates' Fire and Ice hits (battle.js: agentDamage asks every squad member's dmgFor; see the report)
      dmgFor(a, b, v, attr) { if (!BT.B || b === a || b.rival) return 0; return fireIce(attr) ? squadBonus(a, v) : 0; },
      tick(a, dt, on) {
        const B = BT.B, t = B.t, A = a.act;
        // Morale: on its own (not in Burst), and 0.26 for each point of Energy anyone in the squad spends
        let g = a.ltBurst ? 0 : 2.9 * dt;
        B.squad.forEach((s, i) => { const e0 = a.ltEn[i]; if (e0 != null && s.def.resource !== 'adrenaline' && s.energy < e0 - 1e-6) g += (e0 - s.energy) * 0.26; a.ltEn[i] = s.energy; });
        if (g > 0) addMorale(a, g);
        // a dodge out of an attack is a shuffle dodge: the combo count stays, and Special or EX comes out of it
        if (a.state === 'dodge' && a.dodge && a.dodge !== a.ltDodge) {
          a.ltDodge = a.dodge; a.ltSeqT = 0;
          if (a.ltPrev && a.ltPrev !== 'assist') a.ltShuf = a.dodge.until + 0.45;
        }
        a.ltPrev = A ? A.kind : null;
        // the Quick Assist from the Switch (battle.js starts it without start()): Basic after it is hit 5
        if (A && A.kind === 'quick' && A !== a.ltQuickA) { a.ltQuickA = A; a.ltTo5 = t + A.dur + 0.6; }
        // the Impact from spent Morale wears off after 6 s
        if (a.ltImpN > 0 && a.ltImpT <= t) { a.ltImpN = 0; a.ltCons = 0; setImpact(a); }
        // Elation: 30 s; anyone's Chain Attack refreshes it
        if (a.ltEl > 0 && a.ltElT <= t) a.ltEl = 0;
        for (const s of B.squad) if (s.act && s.act.kind === 'chain' && s.act !== a.ltChA) { a.ltChA = s.act; if (a.ltEl > 0) a.ltElT = t + 30; }
        // Collapse lasts until the enemy is back on its feet
        for (const v of B.enemies) if (v.ltColl && !(v.stun > 0)) v.ltColl = false;
      },
      // on: at 80 Morale, a Quick Assist the moment he is switched in. Off: the Burst ends (his Morale is kept)
      swap(a, isIn, why) {
        if (!isIn) {
          a.ltSeqT = 0;
          if (a.ltBurst) { a.ltBurst = false; BT.log(`Lighter: Morale Burst ends off the field (${Math.floor(a.morale)} Morale kept).`, 'skill'); }
          return;
        }
        if (a.ltQA && (why === 'swap' || why === 'forced')) {
          a.ltQA = false; a.queue.unshift({ def: K.quick, kind: 'quick', delay: 0.05 });
          BT.callout('QUICK ASSIST', 'assist', 'Blazing Flash - Guard · Morale');
        }
      },
      // Special out of a shuffle dodge: the punches (with 40 Energy, the punch combo EX). Basic: hit 5 or 4 right after the moves
      // that lead there; the startup punch's jab combo (the stick pushed: hit 4 instead, to swap between them), then the
      // Finishing Move once the combo has run its longest; out of a shuffle dodge, the string where it was; hit 3's
      // follow-ups with the stick pushed; at the 5th step, the Burst version with 80 Morale. Held or tapped: the same
      resolve(a, btn, hold, c) {
        const t = c.t;
        if (btn === 'special') return a.ltShuf > t ? (a.energy >= K.exShuf.cost ? { def: K.exShuf, kind: 'ex' } : { def: K.spShuf, kind: 'special' }) : null;
        if (btn !== 'basic') return null;
        if (a.ltTo5 > t) return fifth(a, 4);
        if (a.ltTo4 > t) return { def: K.basic[3], kind: 'basic', step: 3 };
        const seq = a.ltSeqT > t ? a.ltSeq : null;
        if (seq === 'su' || seq === 'jab') {
          if (seq === 'su' && pushing(a)) return { def: K.basic[3], kind: 'basic', step: 3 };
          if (seq === 'su' || t - a.ltJab0 < (a.ltBurst ? JAB_MAX_B : JAB_MAX)) return { def: a.ltBurst ? K.jabB : K.jab, kind: 'basic', step: 4 };
          return { def: a.ltBurst ? K.finB : K.fin, kind: 'core' };
        }
        if (a.ltShuf > t) { const s = a.combo % K.basic.length; return s === 4 ? fifth(a, 4) : { def: K.basic[s], kind: 'basic', step: s }; }
        if (c.dash) return null;
        if (seq === 'fl' && a.ltFlN >= 0 && a.ltFlN < K.fl.length && (pushing(a) || a.ltFlN < a.ltFlPlan)) return { def: K.fl[a.ltFlN], kind: 'basic', step: 2 };
        const step = c.step != null ? c.step : t - a.lastBasic > 0.9 ? 0 : a.combo;
        return step % K.basic.length === 4 ? fifth(a, step) : null;
      },
      // AUTO: with 80 Morale, straight to the 5th hit for a Morale Burst (at once on a Stun); it keeps jabbing until Morale runs dry
      ai(a, tgt, B) {
        if (!a.ltBurst && a.morale >= 80 && (tgt.stun > 0 || a.morale >= 95 || Math.random() < 0.3)) return { btn: 'basic', o: { step: 4 } };
        return null;
      },
      hud(a, B) {
        const n = Math.floor(a.morale / 10), r = [`MORALE ${'●'.repeat(n)}${'○'.repeat(10 - n)} ${Math.floor(a.morale)}`];
        if (a.ltBurst) r.push('MORALE BURST'); else if (a.morale >= 80) r.push('5TH HIT: MORALE BURST');
        if (a.ltQA) r.push('SWITCH IN: QUICK ASSIST');
        if (a.ltImpN > 0 && a.ltImpT > B.t) r.push(`IMPACT +${a.ltImpN * 2}% ${Math.ceil(a.ltImpT - B.t)}s`);
        if (a.ltEl > 0 && a.ltElT > B.t) r.push(`ELATION ×${a.ltEl} FIRE/ICE +${Math.round(elation(a) * 100)}% ${Math.ceil(a.ltElT - B.t)}s`);
        return r;
      },
    },
    town: {
      home: 'blazewood',
      // mornings on the road out of town (Yeh Yeh, his cactus) and at the garage bikes; afternoons at Cheesetopia or on Old
      // Demir's bench; evenings at Burnice's bar in the fuel truck; late nights on watch under the arch
      routine: ['south:look 35, shop:bike 25, huddle 40', 'cheese:seat 35, bench:demir 20, 747:browse 15, huddle 30', 'bar:stool 40, truck:lean 25, huddle 35', 'arch:look 55, south:look 45'],
      chatter: ['Anyone up for a round with the Champion?', 'Grape. It has to be grape.'],
      lines: [
        'Lighter, Sons of Calydon. When two gangs can\'t settle something, the Champions fight it out, one on one. That\'s me. The rest of the time Lucy finds me odd jobs.',
        'There\'s a cactus on the road out of town that looks like it\'s flashing a peace sign. I call it Yeh Yeh. Say hi if you pass. ...It likes you. I can tell.',
        'The shades? I faint at the sight of blood. ...You don\'t believe me either, huh.',
      ],
      chapters: [
        { title: 'Running on fumes', ask: ['The Spark runs on a fuel Burnice mixes herself. I\'m out, and she\'s busy behind the bar.', 'Pick up a Nitro-Fuel at the 747 and take it to her? She\'ll know what to do with it.'],
          steps: [{ t: 'buy', item: 'nitro' }, { t: 'bring', item: 'nitro', to: 'burnice', reply: 'For Lighter\'s glove? Leave it to me! One special batch, extra kick. Tell him it\'s going on his tab~' }, { t: 'talk', to: 'lighter' }],
          scene: [['A', 'Burnice mixed it? Then the Spark\'s good for another week.'], ['P', 'She says it\'s going on your tab.'], ['A', '...Then Lucy takes it out of my pay. She always gets her money\'s worth out of me.'], ['A', 'Big Daddy ordered this glove, Lucy paid for it, Burnice fuels it, Piper hauled it out here and the boss tuned it. Now you\'ve had a hand in it too. Thanks, Proxy.']] },
        { title: 'White flowers', ask: ['I need flowers. Soft colours, mostly white. ...For a memorial.', 'Nothing grows out here, the weather won\'t have it. Would you ask the florist at Dew Gardening, in Lumina Square, to wrap some for me?'],
          steps: [{ t: 'talk', to: 'orchidea', reply: 'Soft-toned flowers for a memorial... mostly white. I know just the ones. I\'ll wrap them carefully.' }, { t: 'talk', to: 'lighter' }],
          scene: [['A', '...Thanks. They\'re for old companions. Dane, Nick, Ratena.'], ['A', 'I led them. I made a bad call in a Hollow, and I was the only one who walked out. These tags are all I found.'], ['P', 'Orchidea gave me lilacs too. She said they were from you.'], ['A', '...She wasn\'t supposed to say who they were from.'], ['A', 'Anyway. Let\'s talk about something less heavy. Next time you\'re out this way, cheesesteak at Kasa\'s. On me.']] },
        { title: 'The Champion', ask: ['In the Outer Ring, when two gangs can\'t settle a thing, the Champions fight it out. One on one.', 'Something big is stirring in the Hollow outside town. Put me at the front, Proxy. That\'s what the red scarf is for.'],
          steps: [{ t: 'clear', f: { arena: 'outer', enc: 'boss', lead: 'lighter' } }, { t: 'talk', to: 'caesar', reply: 'Lighter took the front? Good. If I\'d gone in and got hurt by some small fry, he\'d have laughed his head off.' }, { t: 'talk', to: 'lighter' }],
          scene: [['A', 'Done. The Champion doesn\'t lose. ...Not with the boss watching, anyway.'], ['P', 'You fought like you had something to protect.'], ['A', 'I do. Out here nobody asks where you came from. If you\'ve got the skill, you write the rest yourself. The Sons gave me that.'], ['A', 'So I\'m not losing anyone else. ...Tonight\'s my night watch; the boss sleeps like a log when it\'s me. Go get some rest, Proxy.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, the in-game models and the "Behind the
     Agent" sheet: messy dark green-black hair, its long bangs swept down over
     his right eye; sunglasses worn low, dark brown-grey lenses with a thin
     gold rim, his olive-green left eye looking over it; a gritted grin. A red
     bandana round his neck whose long scarf tail hangs down his back. A black
     leather biker jacket with wide lapels, a silver zip and chain, a
     gold-printed back, gold-spiked shoulder pads over tiger-striped sleeves;
     a dark navy shirt with a gold winged badge, a little crown and a diamond.
     A black belt with gold studs and a round gold crest buckle; dark
     teal-navy trousers with quilted knee pads, a thigh strap and a tiger-
     striped pouch on his left thigh; black knee boots with silver
     criss-cross straps, toe caps and heel plates. His left hand: a black glove
     with gold studs, a spiked gold cuff. His right: "Spark", the gold
     combustion gauntlet: an engine housing over the forearm with the silver
     cylinder heads of a boxer engine out to the side, a four-point star on
     its front, two gold exhaust stacks running back past the elbow, spiked
     gold knuckles. 185 cm and broad: long legs, wide shoulders. */
  {
    const HAIR = 0x2b3739, HAIR2 = 0x1f282d, HAIRHI = 0x475655, SKIN = 0xf6e4cd, EYE = 0x6a7040, LASH = 0x1f1a1a, TEETH = 0xeeeae2, LIP = 0xc98a7a;
    const LENS = 0x3a3330, LENS2 = 0x6e625c, FRAME = 0x2a2422, RED = 0xac4130, RED2 = 0x8b2c23, SCARF2 = 0x8c2b3a, SCARF3 = 0x773d58, SCARF4 = 0x6e4770;
    const LEATHER = 0x16151c, LEATHER2 = 0x2e2d3b, SHIRT = 0x232838, BELT = 0x121216, GLOVE = 0x2a2831;
    const GOLD = 0xc9a85a, GOLD2 = 0x8a6a30, GOLDHI = 0xe6c689, SPIKE = 0xe7dfaf, TIGER = 0xd49c2c, TIGERDK = 0x231c10;
    const SILVER = 0xb8bcc4, SILVER2 = 0x747373, VENT = 0x413f40, CHAIN = 0x9a9ca4;
    const PANTS = 0x283a42, PANTS2 = 0x1f2b37, PANTSHI = 0x35434a, BOOT = 0x1c1c24, BOOT2 = 0x272935, SOLE = 0x111114;
    const ring = (x, z) => Math.abs(x) === 2 || Math.abs(z) === 2;
    // the gold-spiked leather shoulder pad, the tiger stripes on the sleeve under it (s: the outer side, +1 his left, -1 his right)
    const pad = (g, s) => {
      g.box(-2, 0, -2, 2, 1, 2, (x, y, z) => y === 1 && ring(x, z) ? GOLD2 : y === 1 ? LEATHER2 : LEATHER);
      g.set(0, 2, 0, SPIKE); g.set(s * 2, 2, -1, SPIKE); g.set(s * 2, 2, 1, SPIKE); g.set(s * 3, 1, 0, SPIKE); g.set(0, 3, 0, GOLDHI);
      for (let y = -1; y >= -3; y--) g.box(-1, y, -1, 1, y, 1, (x, yy, z) => ((x + yy * 2 + z) % 3 === 0) ? TIGERDK : TIGER);
    };
    const leg = s => g => {
      H.leg(g, { len: 10, pant: PANTS, boot: BOOT, bootH: 5, sole: SOLE });
      for (let y = -4; y <= -1; y++) g.set(0, y, 1, PANTSHI);                       // the light down the front of the leg
      g.box(-1, -5, 2, 1, -4, 2, (x, y) => (y & 1) ? PANTSHI : PANTS2);            // the quilted knee pad
      for (let y = -8; y <= -6; y++) { g.set(-1, y, 1, (y & 1) ? SILVER : BOOT2); g.set(1, y, 1, (y & 1) ? BOOT2 : SILVER); g.set(0, y, 1, SILVER2); }   // the criss-cross straps
      g.box(-1, -9, 2, 1, -9, 2, SILVER2); g.box(-1, -9, -1, 1, -9, -1, SILVER);    // the silver toe cap, the heel plate
      if (s > 0) {   // his left thigh: the strap with its gold buckle, the tiger-striped pouch
        g.box(-1, -2, -1, 1, -2, 1, BELT); g.set(0, -2, 2, GOLD);
        g.box(2, -4, -1, 2, -1, 1, (x, y, z) => ((y + z) & 1) ? TIGERDK : TIGER); g.set(2, -1, 0, GOLD); g.set(2, -4, 0, GOLD2);
      }
    };
    MODELS.lighter = H.humanoid({
      scale: 0.078, height: 29, width: 20, std: { hipY: 12, shoulderX: 6 },     // 185 cm: long legs (10 voxels), broad shoulders
      sockets: { weapon: ['armR', [0, -9, 2]], off: ['armL', [0, -9, 1]], exhaust: ['armR', [0, 0, -3]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, -1, 1, PANTS);                                           // the trousers
        g.box(-3, 0, -2, 3, 0, 1, x => (x & 1) ? GOLD2 : BELT);                      // the black belt, gold studs
        g.box(-1, -1, 2, 1, 0, 2, GOLD); g.set(0, 0, 2, GOLDHI); g.set(0, -1, 2, GOLD2);   // the round gold crest buckle
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, LEATHER);                                           // the jacket over the waist...
        g.box(-4, 3, -2, 4, 5, 1, LEATHER); g.box(-3, 6, -2, 3, 6, 1, LEATHER);      // ...a broad chest and shoulders
        g.box(-3, 1, 2, 3, 4, 2, LEATHER);                                            // its front
        g.box(-1, 1, 2, 1, 4, 2, SHIRT);                                              // open over the dark navy shirt
        g.box(-1, 3, 3, 1, 3, 3, GOLD2); g.set(0, 3, 3, GOLD);                        // the gold winged badge
        g.set(0, 2, 3, GOLD); g.set(0, 1, 3, SILVER);                                 // the little gold crown, the diamond mark
        for (const s of [-1, 1]) { g.box(s * 2, 3, 3, s * 3, 4, 3, LEATHER2); g.set(s * 3, 5, 2, LEATHER2); }   // the wide lapels
        for (let y = 0; y <= 2; y++) g.set(2, y, 3, (y & 1) ? SILVER : SILVER2);      // the zip down his left front
        for (const [x, y] of [[-2, 2], [-3, 1], [-2, 0]]) g.set(x, y, 3, CHAIN);      // the silver chain looping from the lapel
        g.box(-3, 1, -3, 3, 5, -3, (x, y) => ((x + 2 * y) % 3 === 0) ? GOLD : LEATHER);   // the gold print across his back
        g.box(-3, 6, -3, 3, 6, 2, RED);                                               // the red bandana round his neck...
        g.box(-2, 5, 2, 2, 5, 3, RED2); g.box(-1, 4, 3, 1, 4, 3, RED);                // ...its front fold
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: TEETH });
        g.set(-1, 0, 3, TEETH); g.set(1, 0, 3, TEETH); g.set(-2, 0, 3, LIP); g.set(2, 0, 3, LIP);   // the gritted, toothy grin
        // the sunglasses, worn low: the dark lenses, a thin gold rim on the left one (his left eye looks over it)
        g.box(-3, 1, 4, -1, 2, 4, (x, y) => y === 2 ? LENS2 : LENS);
        g.box(1, 1, 4, 3, 1, 4, LENS); g.box(1, 2, 4, 3, 2, 4, GOLD);
        g.set(0, 2, 4, FRAME); g.box(-4, 2, 0, -4, 2, 3, FRAME); g.box(4, 2, 0, 4, 2, 3, FRAME);   // the bridge, the arms over his ears
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [3, 4], [4, 3]], sideTo: 2 });
        // the long bangs swept down over his right eye, hanging in front of the glasses
        g.box(-3, 3, 5, -1, 6, 5, HAIR); g.set(-2, 2, 5, HAIR); g.set(-3, 2, 5, HAIR2); g.set(0, 6, 5, HAIR); g.set(-1, 7, 5, HAIRHI); g.set(-4, 4, 5, HAIR2);
        for (const [x, y, z] of [[-2, 7, 4], [0, 7, 4], [2, 7, 3], [-3, 8, 1], [1, 8, 2]]) g.set(x, y, z, HAIRHI);   // the green sheen on top
        g.box(-3, 8, -3, 2, 8, 2, HAIR); g.set(0, 9, 0, HAIR); g.set(0, 10, -1, HAIR); g.set(1, 11, -1, HAIR2);   // the messy crown, the cowlick
        g.box(-5, 1, -3, -5, 5, 1, HAIR); g.box(5, 1, -3, 5, 5, 0, HAIR);            // the shaggy sides...
        g.box(-4, -1, -4, 4, 0, -4, HAIR2); g.box(-3, -2, -4, 3, -2, -4, HAIR);       // ...the nape
        for (const [x, y, z, c] of [[-5, 6, 1, HAIR], [5, 6, 0, HAIR], [-6, 3, -1, HAIR2], [6, 4, -2, HAIR], [-2, 3, -5, HAIR], [2, 1, -5, HAIR2], [0, -2, -5, HAIR], [-4, 8, -2, HAIR2], [4, 8, -1, HAIR]]) g.set(x, y, z, c);   // flyaways
      },
      armL(g) {   // the leather sleeve to the wrist, the spiked gold cuff, the black glove with gold studs
        H.arm(g, { sleeve: LEATHER, sleeveTo: 7, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 9 });
        pad(g, 1);
        for (let y = -4; y >= -5; y--) g.set(0, y, 1, LEATHER2);
        g.box(-2, -6, -2, 2, -6, 2, (x, y, z) => ring(x, z) ? GOLD2 : LEATHER); g.set(3, -6, 0, SPIKE); g.set(0, -6, 3, SPIKE); g.set(0, -6, -3, SPIKE);
        g.set(-1, -8, 1, GOLD); g.set(1, -8, 1, GOLD);
      },
      armR(g) {   // "Spark", the combustion gauntlet
        H.arm(g, { sleeve: LEATHER, sleeveTo: 4, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 9 });
        pad(g, -1);
        g.box(-2, -7, -2, 2, -4, 2, (x, y, z) => y === -4 || z === 2 ? GOLDHI : z === -2 ? GOLD2 : GOLD);   // the engine housing over the forearm
        g.box(-4, -6, -1, -3, -5, 1, (x, y, z) => x === -4 ? (z === 0 ? VENT : SILVER2) : SILVER);           // the boxer engine's cylinder head, out to the side...
        g.set(2, -5, 0, SILVER); g.set(2, -6, 0, SILVER2);                                                   // ...and the other one's face
        g.set(0, -5, 3, GOLDHI); g.set(0, -4, 3, GOLD); g.set(0, -6, 3, GOLD); g.set(-1, -5, 3, GOLD); g.set(1, -5, 3, GOLD); g.set(0, -5, 4, SPIKE);   // the four-point star
        for (const x of [-1, 1]) g.box(x, -6, -3, x, -1, -3, (xx, y) => y === -1 ? VENT : y === -3 ? GOLD2 : GOLD);   // the two exhaust stacks, back past the elbow
        g.box(-1, -8, 2, 1, -8, 2, GOLD); g.set(-1, -9, 2, SPIKE); g.set(1, -9, 2, SPIKE);                    // the spiked gold knuckles
      },
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tail: {   // the Red Scarf: the bandana's long tail down his back, red darkening to magenta and violet at its torn end
          parent: 'torso', at: [-1, 6, -3], draw(g) {
            for (let i = 0; i < 14; i++) {
              const x = -Math.round(i * 0.3), z = -1 - Math.min(1, Math.floor(i / 6));
              g.box(x - 1, -i, z, x + 1, -i, z, i < 6 ? ((i & 1) ? RED : RED2) : i < 9 ? SCARF2 : i < 12 ? SCARF3 : SCARF4);
            }
            g.set(-6, -14, -2, SCARF4); g.set(-4, -15, -2, SCARF4);
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     (the numbers are added to his ready stance: a boxer's guard, the left
     lead, the gauntlet up by his chin) */
  ANIM.READY.champion = { armL: [-1.7, -0.32, 0.22], armR: [-1.45, 0.38, -0.2], torso: [0.12, 0.22, 0], head: [0.06, -0.2, 0], legL: [-0.35, 0, 0.1], legR: [0.3, 0, -0.1], hipsY: -0.06 };
  ACT.ltJab = (b, t, th, d) => stage(b, { armL: [0.35, 0.15, 0.1], torso: [0, -0.1, 0] }, { armL: [0.05, 0.32, -0.2], torso: [0.1, 0.3, 0], legL: [-0.2, 0, 0], hipsY: -0.03 }, t, th, d);
  ACT.ltCross = (b, t, th, d) => stage(b, { armR: [0.45, -0.25, -0.25], torso: [0, 0.3, 0] }, { armR: [-0.15, -0.38, 0.22], armL: [0.25, 0, 0.1], torso: [0.12, -0.65, 0], legL: [-0.25, 0, 0], legR: [0.25, 0, 0], hipsY: -0.05 }, t, th, d);
  ACT.ltHookL = (b, t, th, d) => stage(b, { armL: [0.2, 0.75, 0.6], torso: [0, -0.4, 0] }, { armL: [0.25, -0.55, -0.35], torso: [0.08, 0.6, 0], hipsY: -0.05 }, t, th, d);
  ACT.ltHookR = (b, t, th, d) => stage(b, { armR: [0.2, -0.75, -0.6], torso: [0, 0.4, 0] }, { armR: [0.25, 0.55, 0.35], torso: [0.08, -0.6, 0], hipsY: -0.05 }, t, th, d);
  ACT.ltOneTwo = (b, t, th, d) => t < 0.23 ? ACT.ltHookL(b, t, 0.14, 0.23) : ACT.ltCross(b, t - 0.23, 0.09, d - 0.23);
  // the uppercut: the gauntlet from the hip to over his head, the body rising with it
  ACT.ltUpper = (b, t, th, d) => stage(b, { armR: [1.2, -0.3, -0.2], torso: [0.28, 0.3, 0], hipsY: -0.14, legL: [-0.2, 0, 0], legR: [0.2, 0, 0] }, { armR: [-1.3, -0.35, 0.15], armL: [0.45, 0.1, 0.2], torso: [-0.3, -0.35, 0], head: [-0.2, 0.15, 0], lift: 0.16 }, t, th, d);
  // the startup light punch: a long lunging straight
  ACT.ltStart = (b, t, th, d) => add(ACT.ltCross(b, t, th, d), { legL: [-0.35, 0, 0], legR: [0.3, 0, 0], hipsY: -0.06 });
  // the jab combo: both fists in turn, fast
  ACT.ltRush = (b, t) => { const w = 34, pL = Math.max(0, Math.sin(t * w)), pR = Math.max(0, Math.sin(t * w + PI)); return add(b, { armL: [0.25 - 0.3 * pL, 0.32 * pL, -0.15 * pL], armR: [0.25 - 0.4 * pR, -0.38 * pR, 0.2 * pR], torso: [0.14, 0.35 * (pL - pR), 0], hipsY: -0.08, legL: [-0.2, 0, 0], legR: [0.15, 0, 0] }); };
  // the Finishing Move: the whole body behind one gauntlet straight
  ACT.ltFinish = (b, t, th, d) => stage(b, { armR: [0.9, -0.45, -0.4], armL: [0, 0.2, 0], torso: [0.08, 0.65, 0], hipsY: -0.12, legR: [0.35, 0, 0] }, { armR: [-0.2, -0.4, 0.25], armL: [0.6, 0.3, 0.3], torso: [0.3, -0.85, 0], legL: [-0.5, 0, 0], legR: [0.45, 0, 0], hipsY: -0.16 }, t, th, d);
  ACT.ltSlam = (b, t, th, d) => t < th - 0.08 ? add(b, { torso: [0.45, -0.45, 0], armR: [0.5, -0.2, -0.3], armL: [0.3, 0.2, 0.2], legL: [-0.75, 0, 0], legR: [0.55, 0, 0], hipsY: -0.1 }) : ACT.ltCross(b, t - (th - 0.08), 0.08, d - (th - 0.08));
  ACT.ltLeapUpper = (b, t, th, d) => add(ACT.ltUpper(b, t, Math.max(0.1, th + 0.22), d), t > th ? { legL: [-0.9, 0, 0], legR: [-0.2, 0, 0] } : {});
  // the EX follow-up: up again, and a hammer of a punch down onto them
  ACT.ltDive = (b, t, th, d) => stage(b, { armR: [-1.4, -0.2, -0.2], armL: [-0.4, 0.2, 0.4], torso: [-0.3, 0.2, 0], legL: [-0.8, 0, 0], legR: [-0.3, 0, 0] }, { armR: [1.25, 0, 0.1], armL: [0.6, 0, 0.4], torso: [0.6, -0.2, 0], legL: [-0.6, 0, 0], legR: [0.6, 0, 0], hipsY: -0.2 }, t, th, d);
  ACT.ltRushBig = (b, t, th, d) => t < 0.56 ? ACT.ltRush(b, t) : ACT.ltFinish(b, t - 0.56, 0.12, d - 0.56);
  // Swift Break: the gauntlet up across the blow, then swept aside
  ACT.ltParry = (b, t, th, d) => stage(b, { armR: [-0.35, 0.6, 0.1], torso: [0.1, -0.35, 0], hipsY: -0.1, legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }, { armR: [0.1, -0.5, -0.4], torso: [0.12, 0.3, 0], hipsY: -0.1 }, t, Math.min(th, 0.2), d);
  // Scorching Sun: the gauntlet drawn back, its engine revving, then let go
  ACT.ltScorch = (b, t, th, d) => t < th - 0.12 ? add(b, { armR: [0.9 + Math.sin(t * 40) * 0.04, -0.45, -0.4], torso: [0.08, 0.7, 0], hipsY: -0.16, legL: [-0.5, 0, 0], legR: [0.45, 0, 0] }) : ACT.ltFinish(b, t - (th - 0.12), 0.12, d - (th - 0.12));
  // Crowned Inferno: spinning up through his own fire, then the gauntlet driven into the ground
  ACT.ltCrown = (b, t, th, d) => {
    if (t < 1.22) return add(b, { armR: [-1.4, 0.2, -0.3], armL: [-0.2, 0, 0.6], torso: [-0.2, 0, 0], legL: [-0.8, 0, 0], legR: [-0.3, 0, 0], spin: clamp(t / 1.22, 0, 1) * PI * 3 });
    return stage(b, { armR: [-1.4, -0.2, -0.2], torso: [-0.3, 0, 0] }, { armR: [1.3, 0, 0.1], armL: [0.6, 0, 0.5], torso: [0.65, 0, 0], legL: [-0.7, 0, 0], legR: [0.7, 0, 0], hipsY: -0.22 }, t - 1.22, 0.33, d - 1.22);
  };

  /* ------------------------------------------------------------- effects --
     ltPunch (Physical), ltPunchF (Fire), ltPunchB (Morale Burst: the official
     clip's blue-violet and white fist flashes over the fire), ltPunchH (a
     heavy blow): the impact at his fist, for each hit (battle.js: h.fx through
     FX.named). ltExhaust: Spark's exhaust stacks blasting fire behind him
     (the "FAWOOOSH" of the official sheet); ltRise: a column of fire (the
     uppercuts); ltBoom: a fire explosion; ltCrown: a ring of fire pillars;
     ltBurstOn: the Burst lighting up. Streams: ltEngine (the engine running),
     ltStreaks (Burst jabs). */
  const at = (o, d) => { const x0 = o.fromX != null ? o.fromX : o.x, z0 = o.fromZ != null ? o.fromZ : o.z, yaw = o.yaw || 0; return [x0 + Math.sin(yaw) * d, z0 + Math.cos(yaw) * d]; };
  FX.extra.ltPunch = o => { const [x, z] = at(o, 1.15); FX.burst(x, 1.15, z, 8, { col: [0xffffff, 0xfff2c0, 0xf4d35e], speed: 4, size: 0.08, life: 0.22, g: 2 }); FX.glow(x, 1.15, z, 0.8, 0xfff0c0, 0.1, { size1: 1.3 }); };
  FX.extra.ltPunchF = o => { const [x, z] = at(o, 1.2); FX.burst(x, 1.15, z, 14, { col: FLAME, speed: 5, size: 0.11, size1: 0.03, life: 0.3, g: -1 }); FX.glow(x, 1.15, z, 1.1, 0xff8a2a, 0.14, { size1: 1.8 }); };
  FX.extra.ltPunchB = o => {
    const [x, z] = at(o, 1.2), [sx, sz] = at(o, 0.4);
    FX.beam(new THREE.Vector3(sx, 1.15 + rnd(-0.15, 0.15), sz), new THREE.Vector3(x, 1.15, z), U.pick([0xd8ccff, 0x9a8aff, 0xffffff]), 0.1, 0.12);
    FX.burst(x, 1.15, z, 14, { col: BURSTC.concat(FLAME.slice(1, 3)), speed: 5.5, size: 0.11, size1: 0.03, life: 0.3, g: -1 });
    FX.glow(x, 1.15, z, 1.2, U.pick([0x9a8aff, 0xff6ad5]), 0.14, { size1: 2 });
  };
  FX.extra.ltPunchH = o => {
    const [x, z] = at(o, 1.4);
    FX.burst(x, 1.1, z, 34, { col: FLAME, speed: 8, size: 0.16, size1: 0.04, life: 0.45, g: 1, up: 1 });
    FX.glow(x, 1.1, z, 2.2, 0xff6a1a, 0.25, { size1: 3.4 }); FX.ring(x, z, 0.3, 2.2, 0xff9a3a, 0.35);
  };
  const _v = new THREE.Vector3();
  CHOREO.events.ltExhaust = (a, A, e) => {
    BT.sock(a, 'exhaust', _v); const back = A.dir + PI, n = e.big ? 40 : 18, k = e.big ? 1.3 : 1;
    for (let i = 0; i < n; i++) {
      const a2 = back + rnd(-0.35, 0.35), sp = rnd(5, 9) * k;
      FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: Math.sin(a2) * sp, vy: rnd(0.5, 2.5), vz: Math.cos(a2) * sp, drag: 2, life: rnd(0.25, 0.45), size: 0.14, size1: 0.45, col: U.pick(FLAME), g: -2 });
    }
    FX.glow(_v.x, _v.y, _v.z, e.big ? 1.6 : 1.0, 0xff8a2a, 0.18);
    if (e.big) SFX.play('fire');
  };
  CHOREO.events.ltRise = (a, A, e) => {
    const x = a.x + Math.sin(A.dir) * 1.1, z = a.z + Math.cos(A.dir) * 1.1, r = e.big ? 0.9 : 0.55;
    FX.pillar(x, z, r, e.big ? 4.2 : 2.6, 0xff7a2a, 0.35); FX.pillar(x, z, r * 0.5, e.big ? 4.6 : 2.8, 0xffe0a0, 0.25);
    FX.burst(x, 0.6, z, e.big ? 36 : 18, { col: FLAME, speed: 4, size: 0.14, size1: 0.03, life: 0.5, g: -6, up: 4 });
  };
  CHOREO.events.ltBoom = (a, A, e, tgt) => {
    const B = BT.B, d = e.r ? Math.min(1.6, e.r * 0.5) : 1.3, x = tgt && !e.self ? tgt.x : a.x + Math.sin(A.dir) * d, z = tgt && !e.self ? tgt.z : a.z + Math.cos(A.dir) * d, r = e.r || 2.4;
    FX.named('explode', { x, z, r, attr: 'fire' });
    FX.ring(x, z, 0.4, r, 0xff9a3a, 0.45); FX.ring(x, z, 0.3, r * 0.6, 0xffe0a0, 0.35);
    FX.glow(x, 1, z, r * 1.1, 0xff6a1a, 0.35, { size1: r * 1.8 });
    for (let i = 0; i < (e.big ? 40 : 18); i++) { const an = rnd(0, PI * 2), rr = rnd(0.3, r); FX.p({ x: x + Math.cos(an) * rr, y: rnd(1.5, 3.5), z: z + Math.sin(an) * rr, vy: rnd(-2, 1), life: rnd(0.5, 0.9), size: 0.08, size1: 0.02, col: U.pick(FLAME), g: 4 }); }   // ember rain
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.4 : 0.22); SFX.play('boom');
  };
  CHOREO.events.ltCrown = (a, A, e) => {
    const r = e.r || 4.4;
    for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2, x = a.x + Math.cos(an) * r, z = a.z + Math.sin(an) * r; FX.pillar(x, z, 0.5, 3.6, 0xff6a1a, 0.6); FX.burst(x, 0.5, z, 10, { col: FLAME, speed: 3, size: 0.14, life: 0.5, g: -5, up: 3 }); }
    FX.ring(a.x, a.z, 0.5, r + 0.6, 0xffd060, 0.6); FX.ring(a.x, a.z, 0.4, r, 0xff5a1a, 0.5);
  };
  CHOREO.events.ltBurstOn = (a) => {
    FX.glow(a.x, 1.1, a.z, 2.4, 0x9a8aff, 0.3, { size1: 3.6 }); FX.glow(a.x, 1.1, a.z, 1.8, 0xff6a1a, 0.3, { size1: 3 });
    FX.ring(a.x, a.z, 0.4, 2.4, 0xb8a8ff, 0.4); FX.burst(a.x, 1.0, a.z, 30, { col: BURSTC.concat(FLAME), speed: 6, size: 0.12, life: 0.45, g: -2 });
  };
  CHOREO.streams.ltEngine = (a, A, s, dt) => {
    if (Math.random() > dt * 40) return;
    BT.sock(a, 'exhaust', _v); const back = A.dir + PI + rnd(-0.4, 0.4), sp = rnd(3, 6);
    FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: Math.sin(back) * sp, vy: rnd(0.5, 2), vz: Math.cos(back) * sp, drag: 2, life: 0.3, size: 0.1, size1: 0.32, col: U.pick(FLAME), g: -2 });
  };
  CHOREO.streams.ltStreaks = (a, A, s, dt) => {
    if (Math.random() > dt * 22) return;
    BT.sock(a, Math.random() < 0.5 ? 'weapon' : 'off', _v); const dir = A.dir + rnd(-0.25, 0.25), L = rnd(0.8, 1.4);
    FX.beam(_v.clone(), new THREE.Vector3(_v.x + Math.sin(dir) * L, _v.y + rnd(-0.2, 0.2), _v.z + Math.cos(dir) * L), U.pick([0xffffff, 0xd8ccff, 0x9a8aff]), 0.08, 0.1);
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const AFTER = 0xff8a4a;
  set(K.basic[0], { motion: [{ t0: 0, t1: 0.12, kind: 'fwd', d: 0.4 }] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.5 }] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.35 }, { t0: 0.24, t1: 0.32, kind: 'fwd', d: 0.35 }] });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.22, kind: 'fwd', d: 0.45 }], events: [{ t: 0.22, fx: 'ltRise' }] });
  for (const d of K.fl) set(d, { motion: [{ t0: 0, t1: 0.12, kind: 'fwd', d: 0.3 }] });
  set(K.basic[4], { motion: [{ t0: 0, t1: 0.18, kind: 'fwd', d: 0.9 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFTER }], events: [{ t: 0.18, fx: 'ltExhaust' }] });
  set(K.b5B, { motion: [{ t0: 0, t1: 0.18, kind: 'fwd', d: 0.9 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: 0x9a8aff }], events: [{ t: 0, fx: 'ltBurstOn' }, { t: 0.18, fx: 'ltExhaust', big: true }] });
  set(K.jab, { motion: [{ t0: 0, t1: 0.42, kind: 'fwd', d: 0.25, ease: 'lin' }], stream: [{ t0: 0, t1: 0.42, kind: 'ltEngine' }] });
  set(K.jabB, { motion: [{ t0: 0, t1: 0.42, kind: 'fwd', d: 0.25, ease: 'lin' }], stream: [{ t0: 0, t1: 0.42, kind: 'ltEngine' }, { t0: 0, t1: 0.42, kind: 'ltStreaks' }] });
  set(K.fin, { motion: [{ t0: 0.05, t1: 0.3, kind: 'fwd', d: 0.8 }], events: [{ t: 0.26, fx: 'ltExhaust', big: true }, { t: 0.3, fx: 'ltBoom', r: 2.2 }] });
  set(K.finB, { motion: [{ t0: 0.05, t1: 0.3, kind: 'fwd', d: 0.8 }], stream: [{ t0: 0, t1: 0.3, kind: 'ltStreaks' }], events: [{ t: 0.26, fx: 'ltExhaust', big: true }, { t: 0.3, fx: 'ltBoom', r: 2.6 }] });
  set(K.finP, { motion: [{ t0: 0.08, t1: 0.36, kind: 'fwd', d: 1.0 }], stream: [{ t0: 0, t1: 0.34, kind: 'ltEngine' }, { t0: 0, t1: 0.34, kind: 'ltStreaks' }], events: [{ t: 0.3, fx: 'ltExhaust', big: true }, { t: 0.36, fx: 'ltBoom', r: 3.4, big: true }, { t: 0.36, fx: 'whiteFlash' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.2, kind: 'dust' }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.1, t1: 0.2, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }], events: [{ t: 0.18, fx: 'ltExhaust', big: true }] });
  set(K.special, { motion: [{ t0: 0.04, t1: 0.22, kind: 'fwd', d: 0.3 }], events: [{ t: 0.22, fx: 'ltRise' }] });
  set(K.spShuf, { motion: [{ t0: 0, t1: 0.4, kind: 'fwd', d: 0.4, ease: 'lin' }], stream: [{ t0: 0, t1: 0.4, kind: 'ltEngine' }] });
  set(K.ex, { motion: [{ t0: 0.08, t1: 0.75, kind: 'leap', h: 1.6, d: 0.6 }], events: [{ t: 0.2, fx: 'ltExhaust', big: true }, { t: 0.46, fx: 'ltRise', big: true }] });
  set(K.ex2, { motion: [{ t0: 0, t1: 0.42, kind: 'leap', h: 1.8, d: 0, toTarget: true }], events: [{ t: 0.3, fx: 'ltExhaust', big: true }, { t: 0.42, fx: 'ltBoom', r: 2.6 }] });
  set(K.exShuf, { motion: [{ t0: 0, t1: 0.5, kind: 'fwd', d: 0.6, ease: 'lin' }, { t0: 0.58, t1: 0.68, kind: 'fwd', d: 0.6 }], stream: [{ t0: 0, t1: 0.5, kind: 'ltEngine' }], events: [{ t: 0.64, fx: 'ltExhaust', big: true }, { t: 0.68, fx: 'ltBoom', r: 2.4 }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.3 }, { t0: 0.45, t1: 0.55, kind: 'fwd', d: 0.6 }], stream: [{ t0: 0.1, t1: 0.5, kind: 'ltEngine' }],
    events: [{ t: 0.55, fx: 'ltExhaust', big: true }, { t: 0.85, fx: 'ltExhaust', big: true }, { t: 0.85, fx: 'ltBoom', r: 2.8, big: true }, { t: 0.85, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0.15, t1: 0.9, kind: 'rise', h: 2.4 }, { t0: 1.3, t1: 1.55, kind: 'fall' }], stream: [{ t0: 0.2, t1: 1.5, kind: 'ltEngine' }, { t0: 0.4, t1: 1.2, kind: 'flameRing', r: 3.2 }],
    events: [{ t: 0.55, fx: 'ltRise', big: true }, { t: 1.5, fx: 'ltExhaust', big: true }, { t: 1.55, fx: 'ltCrown', r: 4.6 }, { t: 1.55, fx: 'ltBoom', r: 5.0, big: true, self: true }, { t: 1.55, fx: 'whiteFlash' }] });
  set(K.assist, { events: [{ t: 0.12, fx: 'ltExhaust' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.25, kind: 'afterimage', col: AFTER }], events: [{ t: 0.26, fx: 'ltExhaust', big: true }, { t: 0.3, fx: 'ltBoom', r: 2.2 }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.3 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }], events: [{ t: 0.2, fx: 'ltExhaust' }] });
})();
