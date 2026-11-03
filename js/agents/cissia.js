/* ============================================================================
   agents/cissia.js -- Cissia, case specialist of Public Security's
   Metropolitan Order Division (New Eridu Public Security), a Thiren snake
   from the Outer Ring. S-Rank, Electric, Attack, Defensive Assist. Released
   in Version 2.7.

   (An Agent in her own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)
   Numbers: skill names, inputs and mechanics are the official game's.
   Multipliers are the official level-12 values scaled to this game's tuning:
   DMG x0.45, Daze x0.6; Anomaly Buildup as datamined (/100). Which hits are
   heavy is not listed by any source: the game's usual rule (string finishers,
   counters, EX, Chain, Ultimate, assist follow-ups) decides; Serpent's Kiss,
   a slam, counts as one too.

   Sources: Zenless Zone Zero Wiki (Cissia, Lore, Dialogue, DMs, Fashion,
   Chalky (Snake), Serpentine Seeker, Metropolitan Order Division, her Trust
   Commissions, Agent Focus: Cissia), zzz.gachabase.net (datamine, agent 1521),
   the official Agent Intro and Gameplay Details graphics and clips, the
   official portrait and in-game models; guide summaries (Prydwen, Icy Veins,
   Mobalytics) only to confirm the Venom cap of 6 that the official HUD shows.

   Her kit (official):
     Basic Attack: Tongue Flick      up to 4 attacks forward; the 4th: +2 Venom
                                     (+1 on a Stunned enemy).
     Basic Attack: Serpent's Kiss    hold Basic with Serpentine Shadow: a leap,
                                     a lock-on (keep holding, drag the stick:
                                     longer, and the landing where you steer),
                                     a slam. On hit, all her Venom goes off as
                                     Corrode Bone. Using it triggers a Quick
                                     Assist. A Shadow for every 6 Venom gained
                                     (she starts with 1, up to 3).
     Corrode Bone                    Electric DMG to nearby enemies; each one:
                                     her CRIT Rate +6% for 15 s (3 stacks).
     Dash Attack: Bite Mark          Dodge Counter: Bite Back
     Special Attack: Bared Fangs     a long-range snake bite.
     EX Special Attack: Venomous Bite (65 Energy, +5 back) long-range bites;
                                     held, each 20 more Energy (up to 60) is
                                     one more bite; 3 Venom (+1 per 20 more).
                                     Basic after it: the string's 4th hit. Its
                                     hit triggers a Quick Assist.
     Chain Attack: Gang Operation    Ultimate: Ophidiophobia   +3 Venom each,
                                     a Quick Assist on hit; the Ultimate gives
                                     Ether Veil: Cold-Blooded (squad CRIT DMG
                                     +5%, 30 s).
     Quick Assist: Alarm System      Defensive Assist: Extra Prison Rations
     Assist Follow-Up: Partners in Crime
     Core Passive: Fatal Concoction  3 Venom on entering battle (max 6). With
                                     Venom, 1 every 5 s goes off as Corrode
                                     Bone (+335% ATK; Daze +40%/+60% with 1/2
                                     Electric Agents); excess Venom goes off at
                                     once. The squad's Electric DMG ignores 6%
                                     DEF, +1% per 0.12 initial Energy Regen
                                     over 1.4 (max 25%), until 30 s after the
                                     Venom runs out.
     Additional Ability: Festering Venom   with a Stun Agent or another
                                     Electric one: while she has Venom (and 30 s
                                     after), squad CRIT DMG +40%, hers +50%.
   Not documented anywhere (our choices, marked below): the order of the EX's
   four strikes (the datamine has three at 401.7% and one at 133.9%: the small
   one first here), how the Chain Attack and Follow-Up split over their hits,
   how far the lock-on can be held (1.5 s), the window to take the Quick
   Assist (2.5 s, as Trigger's), whom it goes to (whoever you switch to), a
   held EX taking all the Energy it can (up to 60) rather than charging over
   time, and the entry Venom counting toward her first Serpentine Shadow.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, dist, ang } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const VMAX = 6, SHMAX = 3, CB_EVERY = 5, AFTER = 30;   // Venom's cap (the HUD's six pips), Serpentine Shadow's, the 5 s, the 30 s
  const QA_WIN = 2.5;                                   // seconds to switch for the Quick Assist she sets up (our choice, as Trigger's)
  const KISS_LOCK = [0.34, 0.6], KISS_EXT = 1.5, KISS_STEER = 6;   // Serpent's Kiss: the lock-on, how long it can be held (our choice), the steer
  const ELEC = [0xffffff, 0xd0f0ff, 0x5ec8ff, 0x9ad8ff], EL = 0x9ad8ff, EL2 = 0x5ec8ff;
  const FANG = 0xff5a8a, SCALE = 0xf2f7fd, GOLDFX = 0xf4e6ad;    // her red-pink impact streaks, the white tail, the gold fork's arcs

  /* ----------------------------------------------------------------- kit -- */
  const TF = 'Basic Attack: Tongue Flick', BITE = 'EX Special Attack: Venomous Bite';
  const biteL = o => Object.assign({ shape: 'line', r: 1.0, len: 6.5 }, o);   // a long-range bite: a line ahead
  // Venomous Bite: three strikes at 401.7% and one at 133.9% (the datamine; together the wiki's 1339.0 / 544.7), plus
  // one more 401.7% strike for each 20 Energy held in (n). The order of the four: our choice
  const EX_T = [0.18, 0.34, 0.5, 0.66], EXTRA_T = [0.84, 1.0, 1.16];
  function exDef(n) {
    const hits = [hit(EX_T[0], 133.9, 54.8, 54.59, biteL())]
      .concat(EX_T.slice(1).map(t => hit(t, 401.7, 163.3, 163.75, biteL())))
      .concat(EXTRA_T.slice(0, n).map(t => hit(t, 401.7, 163.3, 163.75, biteL())));
    Object.assign(hits[hits.length - 1], { heavy: true, kb: 1.0 });
    const end = hits[hits.length - 1].t;
    // csExtra: the bites held in; csVen: the Venom it gives at csVenAt; csQAhit: its hit sets up a Quick Assist
    return { name: BITE, anim: 'csBite', dur: end + 0.36, cancel: end + 0.26, cost: 65, reach: 6.5, range: 4.5, inv: [0, end + 0.3],
      csExtra: n, csVen: 3 + n, csVenAt: end + 0.05, csQAhit: true, hits };
  }
  const CH = [0.3, 0.5, 0.7];                          // Gang Operation: three strikes and the finish (15% / 15% / 15% / 55%: our choice)
  const FU = [0.3, 0.55];                              // Partners in Crime: two smashes and the last (22.5% / 22.5% / 55%: our choice)
  const K = {
    basic: [
      { name: TF, anim: 'csFlick1', dur: 0.42, cancel: 0.3, reach: 2.6, range: 2.0, hits: [hit(0.15, 155.8, 91.1, 65.3, { shape: 'arc', r: 2.8, arc: 120 })] },
      { name: TF, anim: 'csFlick2', dur: 0.48, cancel: 0.34, reach: 2.6, range: 2.0, hits: [hit(0.17, 278.4, 147.9, 104.66, { shape: 'arc', r: 2.9, arc: 150 })] },
      { name: TF, anim: 'csFlick3', dur: 0.58, cancel: 0.44, reach: 2.6, range: 2.0, hits: [hit(0.24, 270.4, 131.4, 90.96, { shape: 'circle', r: 3.0 })] },
      // the 4th: the staff thrust and the tail's bite together (2 Venom when it lands: mech.hit)
      { name: TF, anim: 'csFlick4', dur: 0.78, cancel: 0.6, reach: 4.5, range: 2.6, hits: [hit(0.32, 501.0, 239.4, 187.32, biteL({ heavy: true, r: 1.1, len: 5, kb: 0.9 }))] },
    ],
    // held Basic with a Serpentine Shadow: up, the lock-on (mech.tick holds it while Basic stays down), the slam
    kiss: { name: 'Basic Attack: Serpent\'s Kiss', anim: 'csKiss', dur: 1.1, cancel: 1.0, reach: 8, range: 4, inv: [0, 1.1],
      hits: [hit(0.74, 1009.1, 269.9, 130.63, { heavy: true, shape: 'circle', r: 3.4, kb: 1.1 })] },
    // Corrode Bone is not a move: Fatal Concoction and Serpent's Kiss set it off (corrode(), below); this is its name and kind
    corrode: { name: 'Corrode Bone', anim: 'csFang', dur: 0.3, hits: [] },
    dash: { name: 'Dash Attack: Bite Mark', anim: 'csDash', dur: 0.5, cancel: 0.38, reach: 3, hits: [hit(0.2, 294.7, 94.3, 56.65, { shape: 'arc', r: 2.8, arc: 140 })] },
    counter: { name: 'Dodge Counter: Bite Back', anim: 'csLeap', dur: 0.72, cancel: 0.56, inv: [0, 0.66], hits: [hit(0.34, 649.0, 355.4, 115.03, { heavy: true, shape: 'circle', r: 3.0, kb: 0.9 })] },
    special: { name: 'Special Attack: Bared Fangs', anim: 'csFang', dur: 0.55, cancel: 0.42, reach: 6, range: 4, cd: 1.2, dr: 0.4, hits: [hit(0.22, 104.8, 66.0, 39.98, biteL())] },
    ex: exDef(0), exH1: exDef(1), exH2: exDef(2), exH3: exDef(3),
    chain: { name: 'Chain Attack: Gang Operation', anim: 'csChain', dur: 1.45, inv: [0, 1.45], reach: 4, csVen: 3, csVenAt: 1.2, csQAhit: true,
      hits: CH.map(t => hit(t, 1475.9 * 0.15, 388.4 * 0.15, 434.53 * 0.15, { shape: 'cone', r: 4.5, arc: 120 }))
        .concat([hit(1.05, 1475.9 * 0.55, 388.4 * 0.55, 434.53 * 0.55, { heavy: true, shape: 'circle', r: 3.6, kb: 1.4 })]) },
    ult: { name: 'Ultimate: Ophidiophobia', anim: 'csUlt', dur: 2.0, inv: [0, 2.0], reach: 7, csVen: 3, csVenAt: 1.6, csQAhit: true,
      hits: [hit(1.3, 3622.7, 182.7, 110.03, { heavy: true, shape: 'cone', r: 7, arc: 90, kb: 1.8 })] },
    // Extra Prison Rations: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow; the official Heavy is 514.4)
    assist: { name: 'Defensive Assist: Extra Prison Rations', type: 'defensive', anim: 'csParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Partners in Crime', anim: 'csFollow', dur: 1.25, inv: [0, 1.2],
      hits: FU.map(t => hit(t, 1042.0 * 0.225, 580.8 * 0.225, 376.17 * 0.225, { shape: 'circle', at: 'front', r: 2.6 }))
        .concat([hit(0.9, 1042.0 * 0.55, 580.8 * 0.55, 376.17 * 0.55, { heavy: true, shape: 'circle', r: 3.2, kb: 1.1 })]) },
    // Alarm System: the leap and the sweep; cancel early: "during it" Special, EX or a held Serpent's Kiss can follow at once
    quick: { name: 'Quick Assist: Alarm System', anim: 'csLeap', dur: 0.66, cancel: 0.4, inv: [0, 0.6], hits: [hit(0.32, 149.6, 95.2, 57.51, { shape: 'circle', r: 3.0, kb: 0.6 })] },
  };
  const EXS = [K.ex, K.exH1, K.exH2, K.exH3];
  // Corrode Bone: its own multiplier plus Fatal Concoction's 335% ATK, one Electric hit; Daze x1.4 / x1.6 (squad Electric
  // Agents) at the moment it goes off. No Buildup, Energy or Decibels in the datamine (battle.js still adds its usual few Decibels)
  const CB = { t: 0, mult: Math.round((254.4 + 335) * DM), daze: 233.2 * DZ, bu: 0, shape: 'circle', r: 2.2 };

  /* ----------------------------------------------------- her mechanics -- */
  const isElec = attr => attr === 'electric' || !!(D.ATTR[attr] && D.ATTR[attr].as === 'electric');
  const buffOn = a => a.venom > 0 || a.csAfter > BT.B.t;          // Venom's effects: while she has it, and 30 s after
  // the enemy nearest the fight (the Agent on the field), for Corrode Bone from the bench
  function foeNear(x, z) {
    const B = BT.B, f = BT.active(); if (x == null && f) { x = f.x; z = f.z; }
    let best = null, bd = 1e9;
    for (const v of B.enemies) { if (!v.alive || v.spawnT > 0) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  // the way the stick points on the floor (as ai.js reads it: the camera's up and right)
  const stickDir = I => { const y = BT.B.cam.yaw || 0; return Math.atan2(Math.cos(y) * I.x - Math.sin(y) * I.y, -Math.sin(y) * I.x - Math.cos(y) * I.y); };

  // Venom: up to 6; each point past that is a Corrode Bone at once; every 6 gained, a Serpentine Shadow
  function gainVenom(a, n, v) {
    const B = BT.B;
    for (let i = 0; i < n; i++) {
      if (a.venom < VMAX) a.venom++;
      else a.csCBq.push({ at: B.t + 0.08 * (a.csCBq.length + 1), v });
      if (++a.csGain >= 6) {
        a.csGain -= 6;
        if (a.csShadow < SHMAX) { a.csShadow++; BT.callout('SERPENTINE SHADOW', 'skill', `Cissia · ${a.csShadow}`); }
      }
    }
  }
  // Corrode Bone: Electric DMG round the enemy (nearby ones too), her CRIT Rate +6% for 15 s (3 stacks)
  function corrode(a, v) {
    const B = BT.B; if (!B || B.result) return;
    if (!v || !v.alive) v = foeNear(v ? v.x : null, v ? v.z : null); if (!v) return;
    const A = { def: K.corrode, kind: 'corrode', t: 0, hi: 0, tgt: v, dir: ang(a, v), fired: {}, data: {} };
    const h = Object.assign({}, CB, { daze: Math.round(CB.daze * a.csCBdz) });
    corrodeFx(v);
    for (const e of BT.enemiesIn('circle', v.x, v.z, h.r, 0)) BT.applyHit(a, e, h, A, 'electric');
    a.csCrN = Math.min(3, a.csCrN + 1); a.csCrT = B.t + 15;
  }
  // a Quick Assist she sets up: switch within the window (after her move) and the Agent coming in opens with theirs
  function openQA(a) {
    const B = BT.B; if (!B || B.allOut || a.rival || !BT.fielded().includes(a) || !BT.nextAlive(1)) return;
    const A = a.act, rest = A ? Math.max(0, A.dur - A.t) + (A.def === K.kiss ? KISS_EXT : 0) : 0;
    a.csQA = { until: B.t + rest + QA_WIN, auto: Math.random() < 0.5 };   // auto: whether AUTO takes this one
    BT.callout('QUICK ASSIST READY', 'assist', 'switch Agents');
    BT.log('Cissia: a Quick Assist is ready (switch Agents).', 'skill');
  }
  // Serpent's Kiss in the air: while you hold Basic the lock-on lasts (the move waits, up to 1.5 s) and the stick moves
  // where she will land
  function kissHold(a, A, dt, on) {
    const B = BT.B, held = on && BT.isPlayer(a) && BT.btnHeld('basic');
    if (A.t >= KISS_LOCK[0] && A.t <= KISS_LOCK[1] && held && (A.data.csExt || 0) < KISS_EXT) {
      A.speed = 0; A.data.csExt = (A.data.csExt || 0) + dt;
      const I = BT.moveInput();
      if (I) {
        const d = stickDir(I), Bd = B.bounds;
        a.x += Math.sin(d) * KISS_STEER * dt; a.z += Math.cos(d) * KISS_STEER * dt;
        if (Bd) { a.x = clamp(a.x, Bd[0] + 0.4, Bd[2] - 0.4); a.z = clamp(a.z, Bd[1] + 0.4, Bd[3] - 0.4); }
      }
      if ((A.data.csRet || 0) <= B.t) { A.data.csRet = B.t + 0.14; FX.ring(a.x, a.z, 0.2, 1.6, EL, 0.2, { y: 0.06 }); FX.glow(a.x, 0.2, a.z, 1.2, FANG, 0.15); }   // the landing mark
    } else if (A.speed === 0) A.speed = 1;
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.cissia = {
    id: 'cissia', name: 'Cissia', short: 'Cissia', faction: 'Metropolitan Order Division', spec: 'Attack', attr: 'electric', rank: 'S',
    color: '#f32969', color2: '#fae9bb', assist: 'defensive', stance: 'cissia',
    blurb: 'A case specialist of Public Security\'s Metropolitan Order Division: a Thiren snake from the Outer Ring who calls herself a selfish bad guy, lives for eggs, free samples and a warm couch, and never goes anywhere without Chalky, the white snake on her shoulders. Her string, EX, Chain and Ultimate build Venom, which keeps bursting into Corrode Bone even from the bench and lets the squad\'s Electric DMG ignore DEF; hold Basic for Serpent\'s Kiss to spend it all at once.',
    // Energy Regen as official with her core (1.56): above Fatal Concoction's 1.4, so its DEF ignore starts at 7%
    stats: { hp: 8590, atk: 3160, def: 648, impact: 93, ap: 93, am: 94, cr: 0.35, cd: 1.0, er: 1.56, speed: 4.8 },
    ai: { range: 3.0, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'venom',
    core: [
      ['Core Passive: Fatal Concoction', 'She enters battle with 3 Venom (up to 6). While she has Venom, one is spent every 5 s, on the field or off it, on Corrode Bone: Electric DMG to the enemies near the fight, and her CRIT Rate +6% for 15 s (up to 3 times); its Daze +40% (+60% with another Electric Agent). Venom past 6 goes off as Corrode Bone at once. With Venom, and for 30 s after it runs out, the squad\'s Electric DMG ignores 6% of DEF, +1% for each 0.12 of her Energy Regen over 1.4 (up to 25%; 7% as she stands).'],
      ['Venom and Serpentine Shadow', 'Her string\'s 4th hit gives 2 Venom (3 on a Stunned enemy); her EX, Chain Attack and Ultimate give 3. Every 6 Venom gained is a Serpentine Shadow (she starts with 1, up to 3): hold Basic to spend one on Serpent\'s Kiss, a leap and a slam that turns all her Venom into Corrode Bone at once. Keep holding to stay locked on (up to 1.5 s) and steer the landing with the stick.'],
      ['Venomous Bite and Quick Assists', 'EX (65 Energy, 5 back): four long-range bites. Hold Special to pour in more: each 20 Energy is another bite and another Venom (up to 60). Basic right after it is the string\'s 4th hit. Serpent\'s Kiss, and her EX, Chain Attack and Ultimate when they hit, set up a Quick Assist: switch within 2.5 s of the move and the Agent coming in opens with theirs. Her Ultimate also gives the squad Ether Veil: Cold-Blooded, +5% CRIT DMG for 30 s.'],
      ['Additional Ability: Festering Venom', 'With a Stun Agent or another Electric Agent in the squad: while she has Venom, and for 30 s after it runs out, the whole squad\'s CRIT DMG +40%, and hers +50%.'],
    ],
    kit: K,
    kitShow: [['Hold', 'kiss'], ['Hold EX', 'exH3'], ['Venom', 'corrode']],
    rivalMoves: [{ k: 'kiss', kind: 'core', p: 0.2, cd: 6 }],
    howto: 'Cissia: her string\'s 4th hit, EX, Chain Attack and Ultimate build Venom (up to 6); while she has it, one turns into Corrode Bone every 5 s, even from the bench, and the squad\'s Electric DMG ignores DEF (with a Stun or Electric teammate, +40% CRIT DMG for the squad too). Hold Basic with a Serpentine Shadow for Serpent\'s Kiss: a leap and a slam that spends all her Venom at once (keep holding to aim the landing with the stick). Hold Special for a bigger EX (each 20 more Energy: another bite, another Venom); Basic after it is the 4th hit. Her Kiss, EX, Chain and Ultimate set up a Quick Assist: switch Agents then. Her assist is a Defensive Assist: she parries.',
    mech: {
      // venom: Venom; csShadow: Serpentine Shadow; csGain: Venom gained toward the next Shadow (the entry Venom counts: our
      // choice); csTick: Fatal Concoction's 5 s; csCBq: Corrode Bones about to go off; csCrN / csCrT: its CRIT Rate stacks;
      // csAfter: when Venom's effects end once it is gone; csVeil: Ether Veil: Cold-Blooded; csQA: the Quick Assist she set
      // up; csEx4Until: Basic is the string's 4th hit; csFV: Festering Venom; csDefIg: the DEF ignored; csCBdz: Corrode Bone's Daze
      init(a) {
        Object.assign(a, { venom: 3, csShadow: 1, csGain: 3, csTick: 0, csCBq: [], csCrN: 0, csCrT: 0, csAfter: 0, csVeil: 0, csQA: null, csEx4Until: 0,
          csFV: false, csDefIg: 0.06, csCBdz: 1.4 });
      },
      squad(a, B) {
        // Festering Venom: a Stun Agent, or another sharing her attribute (Electric)
        a.csFV = B.squad.some(s => s !== a && (s.def.spec === 'Stun' || isElec(s.def.attr)));
        // Fatal Concoction: 6%, +1% for each full 0.12 of initial Energy Regen over 1.4, up to 25%
        a.csDefIg = Math.min(25, 6 + Math.max(0, Math.floor((a.st.er - 1.4) / 0.12 + 1e-9))) / 100;
        // Corrode Bone's Daze: +40% / +60% with 1 / 2 Electric characters in the squad (her own count: she is one of them)
        a.csCBdz = B.squad.filter(s => isElec(s.def.attr)).length >= 2 ? 1.6 : 1.4;
      },
      start(a, def, A) {
        const B = BT.B;
        if (def === K.kiss) { a.csShadow = Math.max(0, a.csShadow - 1); a.cds.csKiss = B.t + 2; openQA(a); }   // "upon activating": a Quick Assist
        if (def.csExtra != null) {                                                          // Venomous Bite: 5 Energy back, then the held-in 20s
          BT.gainEnergy(a, 5, true);
          if (def.csExtra) BT.spendEnergy(a, 20 * def.csExtra);
          a.csEx4Until = B.t + A.dur + 0.7;
        }
        if (def === K.basic[3]) a.csEx4Until = 0;
        if (def === K.ult) { a.csVeil = B.t + 30; BT.log('Cissia: Ether Veil: Cold-Blooded (+5% CRIT DMG for the squad, 30 s).', 'skill'); }
      },
      hit(a, v, h, A) {
        if (!A || A.kind === 'corrode' || !A.data) return;
        const B = BT.B, d = A.def;
        // the string's 4th hit: 2 Venom, 3 on a Stunned enemy (once a move)
        if (d === K.basic[3] && !A.data.csV) { A.data.csV = true; gainVenom(a, 2 + (v.stun > 0 ? 1 : 0), v); }
        // Serpent's Kiss lands: all her Venom goes off as Corrode Bone, one after another
        if (d === K.kiss && !A.data.csK) {
          A.data.csK = true;
          const n = a.venom; a.venom = 0; a.csAfter = B.t + AFTER;
          for (let i = 0; i < n; i++) a.csCBq.push({ at: B.t + 0.1 + i * 0.09, v });
          if (n) BT.log(`Cissia: Serpent's Kiss sets off ${n} Venom: Corrode Bone ×${n}.`, 'skill');
        }
        // EX, Chain Attack, Ultimate: a Quick Assist when they hit (once a move)
        if (d.csQAhit && !A.data.csQ) { A.data.csQ = true; openQA(a); }
      },
      // her own CRIT Rate (Corrode Bone), CRIT DMG (Festering Venom's +50% for her; Ether Veil), DEF ignored (Fatal Concoction)
      mods(a) {
        const B = BT.B, on = buffOn(a);
        return { cr: a.csCrT > B.t ? 0.06 * a.csCrN : 0, cd: (a.csFV && on ? 0.5 : 0) + (a.csVeil > B.t ? 0.05 : 0), defIgnore: on ? a.csDefIg : 0 };
      },
      // the squad's: Festering Venom's +40% and Ether Veil's +5% CRIT DMG
      cdFor(s, b) {
        const B = BT.B; if (!B || b === s || b.rival || !s.alive) return 0;
        return (s.csFV && buffOn(s) ? 0.4 : 0) + (s.csVeil > B.t ? 0.05 : 0);
      },
      // the squad's Electric DMG ignoring DEF: there is no DEF hook for a teammate, so as the DMG bonus it equals (exact when
      // nothing else adds to the DMG bonus): defMult(DEF x (1 - x)) / defMult(DEF) - 1
      dmgFor(s, b, v, attr) {
        if (!BT.B || b === s || b.rival || !s.alive || !v || !buffOn(s) || !isElec(attr)) return 0;
        const D0 = v.def_ || 0; return (794 + D0) / (794 + D0 * (1 - s.csDefIg)) - 1;
      },
      tick(a, dt, on) {
        const B = BT.B; if (!B || a.rival) return;
        const A = a.act;
        if (a.venom > 0) a.csAfter = B.t + AFTER;
        // EX, Chain Attack, Ultimate: their Venom, once the move is done ("after using this skill")
        if (A && A.def.csVen && A.data && !A.data.csVenDone && A.t >= A.def.csVenAt) { A.data.csVenDone = true; gainVenom(a, A.def.csVen, A.tgt); }
        if (A && A.def === K.kiss) kissHold(a, A, dt, on);
        // the Corrode Bones waiting to go off
        for (let i = a.csCBq.length - 1; i >= 0; i--) if (a.csCBq[i].at <= B.t) corrode(a, a.csCBq.splice(i, 1)[0].v);
        // Fatal Concoction: with Venom, one goes off every 5 s (on the field or not), while there is an enemy to bite
        const foe = a.venom > 0 ? foeNear() : null;
        if (foe) { a.csTick += dt; if (a.csTick >= CB_EVERY) { a.csTick -= CB_EVERY; a.venom--; corrode(a, foe); } }
        else if (!a.venom) a.csTick = 0;
        // the Quick Assist she set up runs out; AUTO takes it half the time, once her move (and the 4th hit after an EX) is done
        if (a.csQA && a.csQA.until <= B.t) a.csQA = null;
        if (on && B.auto && !B.allOut && a.csQA && a.csQA.auto && B.swapCd <= 0 && !B.chain && !B.cutin && !BT.assistThreat()
          && (a.csEx4Until <= B.t || (A && A.def === K.basic[3]))
          && (!A || (A.hi >= (A.def.hits || []).length && !['ult', 'chain'].includes(A.kind)))) BT.cmdSwap(1);
      },
      // switched out with a Quick Assist set up: whoever comes in opens with theirs
      swap(a, isIn, why) {
        const B = BT.B;
        if (isIn) { a.csQA = null; return; }
        const Q = a.csQA; a.csQA = null;
        if (!Q || Q.until <= B.t || why !== 'swap') return;
        const inc = BT.active(); if (!inc || inc === a || !inc.alive || !inc.def.kit.quick) return;
        inc.queue.unshift({ def: inc.def.kit.quick, kind: 'quick', tgt: BT.pickTarget(inc), delay: 0.05 });
        BT.callout('QUICK ASSIST', 'assist', inc.def.kit.quick.name.replace('Quick Assist: ', ''));
        BT.log(`${inc.def.short}: ${inc.def.kit.quick.name} (set up by Cissia)`, 'assist');
      },
      // Special: Venomous Bite with the Energy (held: one more bite for each 20 more, up to 3). Basic: held with a Shadow,
      // Serpent's Kiss; just after the EX, the string's 4th hit. Otherwise the usual
      resolve(a, btn, hold, c) {
        if (btn === 'special') {
          if (a.energy < K.ex.cost) return null;
          const n = hold ? clamp(Math.floor((a.energy - K.ex.cost + 5) / 20), 0, 3) : 0;
          return { def: EXS[n], kind: 'ex' };
        }
        if (btn !== 'basic' || c.dash) return null;
        if (hold && a.csShadow >= 1) return { def: K.kiss, kind: 'core' };
        if (!hold && a.csEx4Until > c.t) return { def: K.basic[3], kind: 'basic', step: 3 };
        return null;
      },
      // AUTO: Serpent's Kiss with Venom to spend (most on a Stun, or before a Shadow is wasted); the EX held in when the
      // Energy is high
      ai(a, tgt, B) {
        if (a.csShadow >= 1 && (a.cds.csKiss || 0) <= B.t && (a.venom >= 5 || (tgt.stun > 0 && a.venom >= 2) || (a.csShadow >= SHMAX && a.venom >= 3))) return { btn: 'basic', hold: true };
        if (a.energy >= 105 || (tgt.stun > 0 && a.energy >= 85)) return { btn: 'special', hold: true };
        return null;
      },
      hud(a, B) {
        const r = [`VENOM ${'◆'.repeat(a.venom)}${'◇'.repeat(Math.max(0, VMAX - a.venom))}`, `SERPENTINE SHADOW ${'●'.repeat(a.csShadow)}${'○'.repeat(Math.max(0, SHMAX - a.csShadow))}`];
        if (!a.venom && a.csAfter > B.t) r.push(`FATAL CONCOCTION ${Math.ceil(a.csAfter - B.t)}s`);
        if (a.csCrT > B.t && a.csCrN) r.push(`CORRODE BONE +${6 * a.csCrN}% CRIT RATE ${Math.ceil(a.csCrT - B.t)}s`);
        if (a.csVeil > B.t) r.push(`ETHER VEIL: COLD-BLOODED ${Math.ceil(a.csVeil - B.t)}s`);
        if (a.csQA && a.csQA.until > B.t) r.push('QUICK ASSIST: SWITCH');
        if (a.csEx4Until > B.t) r.push('BASIC: THE 4TH HIT');
        return r;
      },
    },
    town: {
      home: 'lumina',
      // Lumina Square: three of her five trust events (beside Richard Teamilk; the Coff Cafe roof at noon; the Public
      // Security office, her division's base) and two of her Trust Commissions (the Galleria's free samples; outside
      // Public Security). Mornings at the Teamilk corner and the N.E.P.S. gate with her reports; afternoons in the sun at
      // Coff Cafe and "scouting" the Galleria's sample stands; evenings snacks at the 141 and a soft seat; her nights
      // belong to Random Play's couch on Sixth Street, so here she curls up on Beaverson's pink sofa or by the river
      routine: ['tea:stool 30, neps:gate 25, gal:door 20, huddle 25', 'cafe:t 30, gal:door 25, tea:stool 15, huddle 30', 'gal:door 25, 141:stall 25, beav:sofa 20, huddle 30', 'beav:sofa 55, river:bench 45'],
      chatter: ['*sniff sniff* ...Somebody\'s got snacks on them.', 'Chalky, no hunting on your own. I\'ll find us food.'],
      lines: [
        'Case specialist Cissia, Metropolitan Order Division. Yes, Public Security. No, I don\'t like talking about it either. And please don\'t tell Captain Severian you saw me napping.',
        'Snakes are cold-blooded, Proxy. Chalky and I need somewhere warm... the Coff Cafe roof at noon, under the big umbrella, is perfect.',
        'The Galleria\'s free samples are an important investigation. How good the samples are tells you how a shop\'s doing. ...I also get lunch.',
      ],
      chapters: [
        { title: 'City rules of survival', ask: ['Shh! I\'m on assignment. The Galleria\'s free samples are intel: you can tell how a shop\'s doing from them.', 'Today the first hundred customers get a free egg burger. Go check the line for me? And maybe grab a teamilk. I\'ll... hold our spot.'],
          steps: [{ t: 'talk', to: 'mia', reply: 'The egg burgers? First hundred customers, yes! ...Your friend with the tail has been past every sample stand twice. She calls it "tactical hunger".' }, { t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'cissia' }],
          scene: [['A', 'Score! A piping-hot free egg burger... and you brought teamilk.'], ['A', 'Here. Half is yours. Don\'t make that face.'], ['P', 'Jane says you never share your lunch.'], ['A', 'My rule\'s simple: whoever gives you food is a good person. You gave me teamilk, so you get half. ...Just this once! Chalky, stop staring.']] },
        { title: 'Section seven', ask: ['Manager! I have to hand a mission report in at Public Security, in person. The whole place smells like an interrogation room.', 'And Captain Zhu Yuan is at the gate. My legs give out every time she says hello. Come with me? If I start stammering, just say the specialist is in a rush.'],
          steps: [{ t: 'talk', to: 'zhuyuan', reply: 'Specialist Cissia hides behind the lamp posts whenever I greet her. Am I greeting her too loudly? ...I will try a quieter "good morning". Please tell her so.' },
            { t: 'talk', to: 'officerL', reply: 'Section seven says "last seen east-ish". We need a reference point, Specialist. ...Zone C-7, by the rock shaped like a broken tooth? Fine. Filed. Payment in three business days.' }, { t: 'talk', to: 'cissia' }],
          scene: [['A', 'Phew. That was worse than a Hollow. Who needs coordinates when there\'s a rock that looks like a broken tooth?'], ['P', 'Zhu Yuan says she\'ll say good morning more quietly.'], ['A', 'Q-quieter?! ...That might be even scarier. Still, that\'s Chalky\'s and my food money for the month.'], ['A', 'Thanks for standing there with me. With you behind me, all those rules don\'t weigh so much. Like having a spare tail.']] },
        { title: 'Partners in crime', ask: ['Captain Severian sent me a case in a Hollow. Just reading his message made my tail go cold.', 'Put me at the front with Trigger, Proxy. She sees everything coming. If things go south... okay, I\'ll try not to be the first one out.'],
          steps: [{ t: 'clear', f: { enc: 'elite', with: 'trigger', lead: 'cissia' } }, { t: 'talk', to: 'jane', reply: 'Cissia stayed in a Hollow to the end? When I picked her up in the Outer Ring she bolted at the first whiff of trouble. ...Tell her good work. And that she still owes me a lunch.' }, { t: 'talk', to: 'cissia' }],
          scene: [['A', 'We\'re out! Case closed, and I didn\'t bail on you. Not even once!'], ['P', 'Jane says good work. And that you owe her a lunch.'], ['A', 'Jane found me when I had nothing... but my lunch is my lunch. ...Fine. Half a lunch.'], ['A', 'Hey, Proxy. Don\'t push me away, okay? I\'ve finally got a warm spot I don\'t want to run from.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait and the in-game models: long pale golden
     blonde hair turning tan and rose-pink at the tips, a high side ponytail
     on her left with a white pom-pom and a black ribbon, a tall ahoge, a
     small braid at her left temple, a black squiggle clip on her right
     bangs, a silver ear cuff; red eyes and a little fang. A black choker
     with a silver ring, and Chalky, her white snake, lying behind her neck
     and over both shoulders, his head with its green bow on her left
     collarbone. A cropped red halter top with white buttons and N.E.P.S. on
     the left breast over a navy argyle corset-bodysuit laced white down the
     front; bare shoulders; detached white puffed sleeves with dark bands,
     black N.E.P.S. cuffs with handcuffs hanging from them. A layered black-
     navy frilled skirt on a black belt with a gold star buckle; black
     thigh-highs laced down the outer side, garter bands with gold rings
     (the portrait's right stocking is sheer brown; in game both are black);
     chunky black platform boots with a white snake loop and red-pink soles,
     white fluff at the ankles. Her tail: long, white, scaled with a
     blue-grey cross-hatch, a pink band near its base and a red-pink spiked
     tip (five parts, mg1 -> mgHead, that anim.js curls and swings as it
     does Orphie's Magus). The staff (in battle only: the city model has
     none): a black segmented shaft with gold studs, a pink spear tip at one
     end, a pink-and-yellow mechanical grip, and at the other end a gold
     double helix of two serpents ending in a two-pronged fork. 156 cm. */
  function drawStaff(g) {
    const SHAFT = 0x30343e, SHAFT2 = 0x444853, STUD = 0xa97429, COLLAR = 0x22242c;
    const SPEAR = 0xc33472, SPEAR2 = 0xe64886, SPEARD = 0x5c2647, GRIPP = 0xda4981, GRIPY = 0xe6a83a, GRIPG = 0x4a4e58;
    const GOLD = 0xd9c18d, GOLD2 = 0xa98c5e, GOLDHI = 0xf4e6ad, GOLDD = 0x876955;
    // the shaft behind her hand (rising behind her), banded, gold studs along it
    for (let z = -13; z <= -1; z++) g.set(0, 0, z, z % 3 === 0 ? SHAFT2 : SHAFT);
    for (const z of [-3, -7, -11]) g.set(0, 1, z, STUD);
    // the pink spear tip
    g.box(-1, -1, -14, 1, 1, -14, COLLAR);
    g.box(-1, -1, -15, 1, 1, -16, (x, y) => (x === 0 && y === 1) ? SPEAR2 : (y === -1 ? SPEARD : SPEAR));
    g.set(0, 0, -17, SPEAR); g.set(0, 0, -18, SPEAR2); g.set(1, 0, -16, SPEARD); g.set(-1, 0, -16, SPEARD);
    // the mechanical grip: pink plates, a yellow panel, grey
    g.box(-1, -1, 1, 1, 1, 3, (x, y) => y === 1 ? GRIPP : (x === 0 && y === -1 ? GRIPY : GRIPG));
    g.set(1, 0, 2, GRIPY); g.set(-1, 0, 2, GRIPP);
    // the gold double helix: two serpents twisting round each other...
    for (let z = 4; z <= 11; z++) {
      const an = (z - 4) * 0.8, x1 = Math.round(Math.cos(an)), y1 = Math.round(Math.sin(an));
      g.set(x1, y1, z, y1 > 0 ? GOLDHI : GOLD); g.set(-x1, -y1, z, -y1 > 0 ? GOLDHI : GOLD2);
      if (x1 === 0 && y1 === 0) g.set(0, 0, z, GOLDD);
    }
    // ...parting into the two prongs of the fork, their tips pointed
    for (let z = 12; z <= 17; z++) { const w = z < 14 ? 1 : 2; g.set(w, 0, z, z & 1 ? GOLD : GOLDHI); g.set(-w, 0, z, z & 1 ? GOLD2 : GOLD); }
    g.set(2, 0, 18, GOLDHI); g.set(-2, 0, 18, GOLDHI); g.set(0, 0, 12, GOLDD);
  }
  {
    const HAIR = 0xf6dfa8, HAIR2 = 0xe2bf86, HAIR3 = 0xc89a74, HAIRHI = 0xfdf2cf, TIP = 0xc07a74, TIP2 = 0xc19da7;
    const SKIN = 0xfbe6dc, EYE = 0x903939, LASH = 0x3b1b24, MOUTH = 0xc8505e, WHITE = 0xffffff, CLIP = 0x1f1a26, SILVER = 0xc8ccd4;
    const POM = 0xf3f8fd, RIBBON = 0x252835, CHOKER = 0x1f1a26;
    const CHALKY = 0xf7fbfc, CHALKY2 = 0xe3dadf, CHEYE = 0xd8305a, BOW = 0x6fba45, BOW2 = 0x4e9a30;
    const RED = 0xf32969, RED2 = 0xc31e56, BTN = 0xf8f4f4, NAVY = 0x1c1a33, DIAM = 0x5a6aa8, VLINE = 0x871049, LACE = 0xe8e8f0;
    const SLEEVE = 0xf4fafe, SLEEVE2 = 0xdfe8f3, BAND = 0x3a3d48, CUFF = 0x322a3e, CUFFT = 0xf0f0f4, CUFFS = 0xa5aace;
    const SKIRT = 0x2d334a, SKIRT2 = 0x4c5170, SKIRTHI = 0x525a8f, BELT = 0x1a1a24, GOLD = 0xd9b45a, GRING = 0xc8a050;
    const STOCK = 0x33283b, STOCK2 = 0x3b2d42, GARTER = 0x1e1a24, BOOT = 0x1a1e30, BOOT2 = 0x37394f, LOOP = 0xf2f4f8, BPINK = 0xd23c6a, SOLE = 0x2a1a26;
    const TAIL = 0xf2f7fd, TAIL2 = 0xd5e4f8, TAILL = 0x91a9d0, TAILU = 0xb4cbf1, TAG = 0xd24c8e, TPINK = 0xc33472, TPINK2 = 0xe64886, TPINKD = 0x5c2647;
    const argyle = (x, y) => ((Math.abs(x) + y) % 3 === 0 ? DIAM : NAVY);       // the corset's diamonds
    const arm = s => g => {   // s: +1 her left, -1 her right
      H.arm(g, { sleeve: SLEEVE, sleeveTo: 7, skin: SKIN, len: 8 });
      g.box(-1, 0, -1, 1, 0, 1, SKIN);                                              // the bare shoulder
      g.box(-1, -1, -1, 1, -1, 1, BAND);                                            // the dark band at the top of the detached sleeve
      g.box(2 * s, -5, -1, 2 * s, -3, 1, SLEEVE2);                                  // the puff
      g.box(-1, -6, -1, 1, -6, 1, CUFF); g.set(0, -6, 2, CUFFT);                    // the black N.E.P.S. cuff
      g.set(2 * s, -6, 0, CUFFS); g.set(2 * s, -7, 0, CUFFS);                       // the handcuff hanging from it
    };
    const leg = s => g => {
      H.leg(g, { pant: STOCK, boot: BOOT, bootH: 3, sole: SOLE });
      g.box(-1, -1, -1, 1, 0, 1, SKIN);                                             // the bare thigh under the skirt
      g.box(-1, -2, -1, 1, -2, 1, GARTER); g.set(s, -2, 2, GRING);                  // the garter band, its gold ring
      g.box(-1, -3, -1, 1, -3, 1, STOCK2);                                          // the stocking's top
      for (let y = -6; y <= -4; y++) g.set(s, y, 0, y & 1 ? SKIN : STOCK2);         // laced down the outer side
      g.box(-1, -7, -1, 1, -7, 1, BOOT2); g.set(0, -7, 2, LOOP); g.set(0, -8, 2, BPINK);   // the platform boot: the white snake loop, pink
      g.box(-1, -9, 2, 1, -9, 2, BPINK);                                            // the red-pink sole at the front
      g.set(2 * s, -6, -1, POM); g.set(2 * s, -6, 0, POM);                          // the white fluff at the ankle
    };
    // one white tail segment running back along -Z: scales cross-hatched blue-grey on top, a bluer belly
    const seg = (r, len) => g => {
      for (let z = 0; z >= -len; z--) for (let x = -r; x <= r; x++) for (let y = -r; y <= r; y++) {
        if (r > 1 && Math.abs(x) === r && Math.abs(y) === r) continue;                 // rounded
        const c = y === -r ? TAILU : y === r ? (((x + z) % 3 === 0 || (x - z) % 3 === 0) ? TAILL : TAIL) : Math.abs(x) === r ? ((y + z) % 3 === 0 ? TAILL : TAIL2) : TAIL;
        g.set(x, y, z, c);
      }
    };
    MODELS.cissia = H.humanoid({
      scale: 0.0675, height: 28, width: 20,
      // weapon: the gold fork's tips; fang: her tail's tip (the bites come from it)
      sockets: { weapon: ['staff', [0, 0, 16]], fang: ['mgHead', [0, 0, -6]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, NAVY);                                              // the bodysuit
        g.box(-3, 0, 2, 3, 0, 2, BELT); g.set(0, 0, 3, GOLD);                          // the black belt, the gold star buckle
        // the layered frilled skirt: the hem in light and dark frills
        g.box(-4, -3, -3, 4, -1, 2, (x, y, z) => y === -3 ? (((x + z) & 1) ? SKIRT2 : SKIRTHI) : y === -2 ? SKIRT : SKIRT2);
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, argyle); g.box(-2, 0, 2, 2, 2, 2, argyle);           // the argyle corset, waist to ribs
        g.set(0, 1, 2, LACE); g.set(0, 2, 2, LACE); g.set(-1, 0, 2, VLINE); g.set(1, 0, 2, VLINE);   // white lacing; the magenta V
        g.box(-3, 3, -2, 3, 5, 1, NAVY);                                               // the bodysuit up her back
        g.box(-3, 3, 1, 3, 5, 2, (x) => Math.abs(x) === 3 ? RED2 : RED);               // the cropped red halter top
        g.set(0, 3, 3, BTN); g.set(0, 5, 3, BTN); g.set(2, 4, 3, WHITE);               // white buttons; N.E.P.S. on the left breast
        g.box(-3, 6, -2, 3, 6, 1, SKIN); g.set(-3, 5, 1, SKIN); g.set(3, 5, 1, SKIN);  // bare shoulders
        g.box(-1, 6, -1, 1, 6, 1, CHOKER); g.set(0, 6, 2, SILVER);                     // the black choker, its silver ring
        // Chalky: behind her neck, over both shoulders, down her right side; his head on her left collarbone with its green bow
        g.box(-2, 6, -3, 2, 6, -3, CHALKY); g.box(-3, 6, -2, -3, 6, 1, CHALKY); g.box(3, 6, -2, 3, 6, 1, CHALKY);
        g.set(-3, 5, 2, CHALKY); g.set(-3, 4, 3, CHALKY2); g.set(-2, 3, 3, CHALKY); g.set(-2, 2, 3, CHALKY2);
        g.set(3, 6, 2, CHALKY); g.set(2, 6, 3, CHALKY); g.set(1, 6, 3, CHEYE);
        g.set(2, 5, 3, BOW); g.set(3, 5, 3, BOW2);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        g.set(1, 0, 3, WHITE);                                                         // the little fang
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 1], [-3, 3], [-2, 4], [-1, 4], [0, 3], [1, 4], [2, 4], [3, 3], [4, 1]], sideTo: 3 });
        g.box(-5, -6, 0, -5, 4, 2, (x, y) => y < -3 ? TIP : y < 0 ? HAIR3 : HAIR);   // the long locks framing her face...
        g.box(5, -6, 0, 5, 4, 2, (x, y) => y < -3 ? TIP : y < 0 ? HAIR3 : HAIR);     // ...to her chest, rosy at the ends
        for (const [x, y, z] of [[-2, 7, 2], [1, 7, 1], [3, 7, -1]]) g.set(x, y + 1, z, HAIRHI);   // the shine on top
        g.set(0, 8, 1, HAIR); g.set(0, 9, 1, HAIR); g.set(1, 10, 1, HAIRHI); g.set(1, 11, 0, HAIR); g.set(0, 11, -1, HAIR2);   // the ahoge
        g.set(-3, 6, 5, CLIP); g.set(-2, 7, 5, CLIP); g.set(-1, 6, 5, CLIP);           // the black squiggle clip on her right bangs
        for (let z = 2; z >= -3; z--) g.set(5, 5, z, z & 1 ? HAIR2 : HAIRHI);          // the braid from her left temple to the ponytail
        g.set(5, 3, -1, SILVER); g.set(5, 2, -1, SILVER);                              // the ear cuff on her left ear
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tailL: {  // the high side ponytail on her left: the pom-pom, the black ribbon, the hair falling to her waist (sways)
          parent: 'head', at: [5, 6, -2], draw(g) {
            g.ell(0, 1, 0, 1.6, 1.6, 1.6, POM);
            g.box(1, 0, -1, 2, 1, -1, RIBBON); g.box(1, -1, -2, 1, -3, -2, RIBBON);
            const path = [[1, -1, -1, 1.5], [1, -3, -2, 1.6], [2, -5, -2, 1.6], [2, -7, -2, 1.5], [2, -9, -2, 1.4], [2, -11, -1, 1.3], [2, -13, -1, 1.1], [2, -15, -1, 0.9]];
            path.forEach(([x, y, z, r], i) => g.ell(x, y, z, r, 1.2, r * 0.8, i >= 7 ? TIP2 : i >= 6 ? TIP : i >= 4 ? HAIR3 : i % 2 ? HAIR2 : HAIR));
          },
        },
        tailR: {  // the long hair down her back to the waist, rose at the tips (sways)
          parent: 'head', at: [0, 2, -5], draw(g) {
            for (let i = 0; i <= 15; i++) {
              const w = i < 4 ? 4 : i < 10 ? 3 : 2, z = -Math.floor(i / 6);
              g.box(-w, -i, z - 1, w, -i, z, x => i > 13 ? TIP2 : i > 11 ? TIP : i > 7 ? HAIR3 : (x + i) % 4 === 0 ? HAIR2 : HAIR);
            }
          },
        },
        // her snake tail, segment by segment from her lower back (as Magus: anim.js drives mg1..mgHead)
        mg1: { parent: 'hips', at: [0, -2, -2], rot: [-0.55, 0, 0], draw(g) {
          seg(2, 6)(g);
          for (let x = -2; x <= 2; x++) { g.set(x, 2, -1, TAG); g.set(x, -2, -1, TAG); } g.set(2, 0, -1, TAG); g.set(-2, 0, -1, TAG); g.set(0, -3, -1, TAG);   // the pink band, its tag
        } },
        mg2: { parent: 'mg1', at: [0, 0, -6], rot: [0.6, 0, 0], draw: seg(2, 6) },
        mg3: { parent: 'mg2', at: [0, 0, -6], rot: [0.85, 0, 0], draw: seg(1, 6) },
        mg4: { parent: 'mg3', at: [0, 0, -6], rot: [0.6, 0, 0], draw: seg(1, 5) },
        mgHead: { parent: 'mg4', at: [0, 0, -5], rot: [0.85, 0, 0], draw(g) {
          // the red-pink spiked tip: a tapering core, spikes up, down and to the sides
          for (let z = 0; z >= -6; z--) { if (z > -3) g.box(-1, -1, z, 1, 1, z, z & 1 ? TPINKD : TPINK); else g.set(0, 0, z, z & 1 ? TPINK : TPINKD); }
          for (const z of [-1, -3, -5]) { g.set(0, 2, z, TPINK2); g.set(0, -2, z, TPINKD); g.set(2, 0, z, TPINK); g.set(-2, 0, z, TPINK); }
          g.set(0, 0, -7, TPINK2);
        } },
        // the staff in her right hand: empty here, filled in battle (hookLook, below). Tilted so that, with her arm in the
        // ready stance, the gold fork points forward and down and the pink tip rises behind her (the in-game model)
        staff: { parent: 'armR', at: [0, -7, 1], rot: [1.05, 0, 0] },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     Her stance: the staff low in her right hand, the gold fork forward and
     down, the shaft rising behind her (the in-game model). The poses below
     are the angles she reaches (rel() turns them into the change from it). */
  ANIM.READY.cissia = { armR: [-0.45, 0.1, -0.2], armL: [-0.3, 0, 0.22], torso: [0.06, 0.18, 0], head: [0, -0.12, 0], legL: [-0.25, 0, 0.06], legR: [0.2, 0, -0.06], hipsY: -0.04 };
  const R0 = ANIM.READY.cissia;
  const rel = o => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].map((v, i) => v - R0[k][i]) : k === 'hipsY' ? o[k] - R0.hipsY : o[k]; return r; };
  const plus = (...ps) => { const r = {}; for (const p of ps) for (const k in p) { const v = p[k]; r[k] = Array.isArray(v) ? (r[k] ? r[k].map((x, i) => x + v[i]) : v.slice()) : (r[k] || 0) + v; } return r; };
  const LOW = rel({ armR: [-0.25, 0.4, 0.55], armL: [-0.3, 0, 0.3], torso: [0.15, -0.5, 0], head: [0, 0.4, 0], hipsY: -0.12, legL: [-0.6, 0, 0.1], legR: [0.4, 0, -0.1] });   // low, across to the left
  const HIGH = rel({ armR: [-2.5, -0.3, -0.5], armL: [-0.4, 0, 0.5], torso: [-0.1, 0.5, 0], head: [0, -0.3, 0], hipsY: -0.06, legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] });   // flicked up to the right
  const OVER = rel({ armR: [-2.9, 0.1, -0.2], armL: [-1.0, 0, 0.3], torso: [-0.25, 0.3, 0], head: [-0.1, -0.2, 0], hipsY: -0.05, legL: [-0.3, 0, 0.1], legR: [0.25, 0, -0.1] });   // raised overhead
  const DOWN = rel({ armR: [-0.75, 0, 0.25], armL: [-0.5, 0, 0.4], torso: [0.4, -0.25, 0], head: [0.1, 0.2, 0], hipsY: -0.18, legL: [-0.95, 0, 0.12], legR: [0.7, 0, -0.1] });   // smashed down, low
  const DRAW = rel({ armR: [-0.7, 0, -0.2], armL: [-0.9, 0.3, 0.3], torso: [0.05, 0.6, 0], head: [0, -0.5, 0], hipsY: -0.1, legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1] });   // drawn back to strike
  const STAB = rel({ armR: [-1.15, 0, 0.05], armL: [-0.3, 0, 0.6], torso: [0.3, -0.25, 0], head: [-0.15, 0.2, 0], hipsY: -0.16, legL: [-1.05, 0, 0.1], legR: [0.75, 0, -0.1] });   // lunging, the fork level
  const FANGS = rel({ armR: [-1.0, 0, 0.1], armL: [-1.5, 0, 0.1], torso: [0.3, -0.3, 0], head: [-0.15, 0.2, 0], hipsY: -0.16, legL: [-1.05, 0, 0.1], legR: [0.75, 0, -0.1] });   // lunging, her left hand out like a striking head
  const WIDE = rel({ armR: [-1.45, 0, -1.25], armL: [-0.4, 0, 0.9], torso: [0.05, 0, 0], head: [0, 0, 0], hipsY: -0.1, legL: [-0.4, 0, 0.15], legR: [0.3, 0, -0.15] });   // arm out, to spin
  const SWING = rel({ armR: [-1.3, 0, -1.2], torso: [0.05, 0.6, 0], head: [0, -0.4, 0], hipsY: -0.08, legL: [-0.5, 0, 0.1], legR: [0.35, 0, -0.1] });   // out to the right...
  const CUT = rel({ armR: [-1.3, 0, 0.8], armL: [-0.5, 0, 0.6], torso: [0.12, -0.6, 0], head: [0, 0.4, 0], hipsY: -0.1, legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] });   // ...and across to the left
  const RUSH = rel({ armR: [0.35, 0, -0.4], armL: [0.3, 0, 0.4], torso: [0.6, -0.3, 0], head: [-0.4, 0.3, 0], hipsY: -0.2, legL: [-1.2, 0, 0], legR: [0.9, 0, 0] });   // low and fast, the staff trailing
  const GUARD = rel({ armR: [-1.6, 0.4, 0.5], armL: [-1.2, -0.3, -0.3], torso: [0.1, 0.2, 0], head: [0, -0.2, 0], hipsY: -0.1, legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1] });   // the shaft across, meeting the blow
  const TUCK = { legL: [-1.3, 0, 0.1], legR: [-1.0, 0, -0.1] };                 // knees up, in the air
  const OVERT = plus(OVER, TUCK);
  const back = (p, b, t, t0, d) => mix(add(b, p), b, U.ease(clamp((t - t0) / Math.max(0.05, d - t0), 0, 1)));   // from a pose back to her stance
  const ring = (b, t, th, turns) => add(stage(b, WIDE, WIDE, t, th, 9), { spin: clamp((t - th * 0.3) / (th * 0.9), 0, 1) * PI * 2 * (turns || 1) });
  // Tongue Flick: a rising flick, a cross cut, a spinning sweep, the lunge with the tail's bite
  ACT.csFlick1 = (b, t, th, d) => stage(b, LOW, HIGH, t, th, d);
  ACT.csFlick2 = (b, t, th, d) => stage(b, SWING, CUT, t, th, d);
  ACT.csFlick3 = (b, t, th, d) => { const p = ring(b, t, th); return t < d * 0.75 ? p : mix(p, b, U.ease(clamp((t - d * 0.75) / (d * 0.25), 0, 1))); };
  ACT.csFlick4 = (b, t, th, d) => stage(b, DRAW, FANGS, t, th, d);
  ACT.csDash = (b, t, th, d) => stage(b, RUSH, CUT, t, th, d);
  // Bite Back, Alarm System: a leap forward, knees up, and a sweep round her as she lands
  ACT.csLeap = (b, t, th, d) => add(stage(b, OVER, CUT, t, th, d), Object.assign(t < th - 0.04 ? Object.assign({}, TUCK) : {}, { spin: clamp((t - (th - 0.14)) / 0.16, 0, 1) * PI * 2 }));
  // Bared Fangs: the long-range snake bite
  ACT.csFang = (b, t, th, d) => stage(b, DRAW, FANGS, t, th, d);
  // Venomous Bite: drawn back, then strike after strike (the tail lunging past her)
  ACT.csBite = (b, t, th, d) => {
    if (t < 0.12) return mix(b, add(b, DRAW), U.easeOut(t / 0.12));
    const k = 0.5 + 0.5 * Math.sin((t - 0.12) * 32 - 1.4), p = mix(add(b, DRAW), add(b, FANGS), k);
    return t < d - 0.25 ? p : mix(p, b, U.ease(clamp((t - (d - 0.25)) / 0.25, 0, 1)));
  };
  // Serpent's Kiss: up, knees tucked and the staff raised overhead while she locks on, then down on the target
  ACT.csKiss = (b, t, th, d) => {
    if (t < 0.32) return mix(b, add(b, OVERT), U.easeOut(t / 0.32));
    if (t < th - 0.1) return add(b, plus(OVERT, { lift: Math.sin(t * 9) * 0.03 }));
    if (t < th + 0.05) return mix(add(b, OVERT), add(b, DOWN), (t - (th - 0.1)) / 0.15);
    return back(DOWN, b, t, th + 0.12, d);
  };
  // Gang Operation: whirling strikes, then up and one smash
  ACT.csChain = (b, t, th, d) => {
    if (t < 0.8) return add(b, Object.assign({}, WIDE, { spin: t / 0.8 * PI * 4 }));
    if (t < 1.0) return mix(add(b, WIDE), add(b, OVERT), U.easeOut((t - 0.8) / 0.2));
    if (t < 1.08) return mix(add(b, OVERT), add(b, DOWN), (t - 1.0) / 0.08);
    return back(DOWN, b, t, 1.25, d);
  };
  // Ophidiophobia: crouched and gathering, trembling; up; the thunderbolt smash
  ACT.csUlt = (b, t, th, d) => {
    if (t < 0.9) return add(b, Object.assign({}, DRAW, { roll: Math.sin(t * 36) * 0.014 * Math.min(1, t * 2), hipsY: DRAW.hipsY - 0.08 }));
    if (t < th - 0.08) return mix(add(b, DRAW), add(b, OVERT), U.easeOut((t - 0.9) / Math.max(0.05, th - 0.98)));
    if (t < th + 0.04) return mix(add(b, OVERT), add(b, DOWN), (t - (th - 0.08)) / 0.12);
    return back(DOWN, b, t, th + 0.3, d);
  };
  // Partners in Crime: a series of downward smashes
  ACT.csFollow = (b, t, th, d) => {
    const smash = (t0, t1, tt) => stage(b, OVER, DOWN, t - t0, tt - t0, t1 - t0);
    if (t < 0.42) return smash(0, 0.42, FU[0]);
    if (t < 0.68) return smash(0.42, 0.68, FU[1]);
    return smash(0.68, d, 0.9);
  };
  // Extra Prison Rations: the shaft across
  ACT.csParry = b => add(b, GUARD);

  /* ------------------------------------------------------------- effects --
     The official clips: Electric as blue-white lightning with red-pink
     streaks at the impacts; the tail lunging white. csBite: a bite at range
     (the white lunge from her tail's tip, two fangs closing, sparks; big: a
     bolt too). csLock: Serpent's Kiss's lock-on (a blue column and a dome
     ring on the target). csSlam: a landing (a bolt, red-pink streaks
     radiating along the floor, rings). Corrode Bone: fangs closing on the
     enemy, a small bolt, venom sparks. */
  const _v = new THREE.Vector3();
  function fangs(x, y, z, dir, r, col) {
    const bx = x - Math.sin(dir) * r * 0.5, bz = z - Math.cos(dir) * r * 0.5;
    FX.slash(bx, y + 0.22, bz, r, dir, col, { tilt: 1.35, arc: 2.0, width: 0.22, life: 0.22, sweep: 1.1 });
    FX.slash(bx, y - 0.22, bz, r, dir, 0xffffff, { tilt: -1.35, arc: 2.0, width: 0.18, life: 0.2, sweep: 1.1 });
  }
  function corrodeFx(v) {
    const y = (v.height || 1.6) * 0.55, d = rnd(0, PI * 2);
    fangs(v.x, y, v.z, d, 0.9, FANG);
    FX.named('bolt', { x: v.x, z: v.z, r: 1.4 });
    FX.burst(v.x, y, v.z, 14, { col: [0xffffff, FANG, 0xc86aff, EL2], speed: 4, size: 0.09, life: 0.35, g: 1 });
  }
  CHOREO.events.csBite = (a, A, e, tgt) => {
    const L = e.len || 6, near = tgt && dist(a, tgt) - tgt.rad < L;
    const px = near ? tgt.x : a.x + Math.sin(A.dir) * L, pz = near ? tgt.z : a.z + Math.cos(A.dir) * L;
    BT.sock(a, 'fang', _v); const p0 = _v.clone(); if (p0.y < 0.4) p0.y = 0.9;
    const p1 = new THREE.Vector3(px, 1.0, pz), k = e.big ? 1.5 : e.small ? 0.7 : 1;
    FX.beam(p0, p1, SCALE, 0.2 * k, 0.16); FX.beam(p0.clone(), p1, EL2, 0.08 * k, 0.14);
    fangs(px, 1.0, pz, A.dir, 0.9 * k, FANG);
    FX.burst(px, 1.0, pz, Math.round(12 * k), { col: ELEC.concat([FANG]), speed: 5, size: 0.09, life: 0.3, g: 1 });
    FX.glow(px, 1.0, pz, 1.3 * k, EL2, 0.18);
    if (e.big) { FX.named('bolt', { x: px, z: pz, r: 2 }); BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.15); }
  };
  CHOREO.events.csLock = (a, A, e, tgt) => {
    if (!tgt) return;
    FX.pillar(tgt.x, tgt.z, 0.45, 7, EL2, 0.5); FX.ring(tgt.x, tgt.z, 0.3, 2.6, EL, 0.5, { y: 0.06 }); FX.glow(tgt.x, 0.3, tgt.z, 2.2, EL2, 0.4, { size1: 3 });
  };
  CHOREO.events.csSlam = (a, A, e) => {
    const r = e.r || 3.2, x = a.x + Math.sin(A.dir) * (e.ahead || 0), z = a.z + Math.cos(A.dir) * (e.ahead || 0);
    FX.named('bolt', { x, z, r }); FX.glow(x, 1, z, r, 0xffffff, 0.2, { size1: r * 1.6 });
    for (let i = 0; i < 12; i++) {                                                // the red-pink streaks radiating along the floor
      const an = i / 12 * PI * 2 + rnd(-0.1, 0.1), L = r * rnd(0.8, 1.3);
      FX.beam(new THREE.Vector3(x, 0.15, z), new THREE.Vector3(x + Math.sin(an) * L, 0.15, z + Math.cos(an) * L), i & 1 ? FANG : 0xff8a6a, 0.1, 0.3);
    }
    FX.ring(x, z, 0.4, r * 1.2, EL, 0.4); FX.ring(x, z, 0.3, r * 0.7, 0xffffff, 0.3);
    FX.burst(x, 0.4, z, 40, { col: ELEC, speed: 8, size: 0.1, life: 0.45, g: 2, up: 1 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.45 : 0.3); SFX.play('boom');
  };

  /* --------------------------------------------- the staff, drawn in battle --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Cissia) her rig's empty staff part gets the staff, once: in battle she
     holds it; in town (the city model) she carries none. */
  let PROTO = null;
  const proto = () => PROTO || (PROTO = (() => { const g = new VX.Grid(); drawStaff(g); return VX.object(g, MODELS.cissia.scale, { cast: false }); })());
  function armStaff(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.staff || P.staff.userData.armed) return;
    P.staff.add(proto().clone()); P.staff.userData.armed = true;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded)
  let hooked = false;
  function hookLook() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'cissia') armStaff(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'cissia') armStaff(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookLook); else hookLook();

  /* -------------------------------------------------------- choreography --
     tail: the mode her tail takes (anim.js's Magus modes: aim, arched over
     her shoulder; low, out past her side along the ground ahead; whip, a
     sweep across her front at the strike; ring, coiled round her spinning) */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const bite = (t, o) => Object.assign({ t, fx: 'csBite' }, o || {});
  const cres = (t, o) => Object.assign({ t, fx: 'crescent', y: 1.0, r: 2.4, col: GOLDFX }, o || {});
  const AFT = 0xf4c0d0;
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.45 }], events: [cres(0.15, { tilt: -0.7, sweep: -1.0 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.17, kind: 'side', d: 0.3, side: 'auto' }], events: [cres(0.17, { tilt: 0.1, r: 2.5, arc: 2.8, col: EL })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.24, kind: 'fwd', d: 0.4 }], tail: 'ring', events: [cres(0.24, { y: 0.9, tilt: 0.1, r: 2.9, arc: 5.8, sweep: 1.4, col: EL })] });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.3, kind: 'fwd', d: 0.7 }], stream: [{ t0: 0.04, t1: 0.3, kind: 'afterimage', col: AFT }], tail: [[0, 'aim'], [0.22, 'low']],
    events: [{ t: 0.32, fx: 'thrustLine', col: EL2, len: 4.5 }, bite(0.32, { len: 5, big: true })] });
  // Serpent's Kiss: up and over to the target, the lock-on, the fall and the slam where she lands
  set(K.kiss, { motion: [{ t0: 0.04, t1: 0.32, kind: 'rise', h: 2.4 }, { t0: 0.04, t1: 0.32, kind: 'toTarget', gap: 0.5 }, { t0: 0.62, t1: 0.74, kind: 'fall' }],
    stream: [{ t0: 0.32, t1: 0.66, kind: 'spark' }], tail: [[0, 'aim'], [0.62, 'ring']],
    events: [{ t: 0.3, fx: 'csLock' }, { t: 0.74, fx: 'csSlam', r: 3.4 }, { t: 0.74, fx: 'whiteFlash' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFT }], tail: 'run', events: [cres(0.2, { tilt: 0.2, col: EL })] });
  for (const k of ['counter', 'quick']) set(K[k], { motion: [{ t0: 0, t1: 0.32, kind: 'leap', h: 1.2, toTarget: true }], stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: AFT }], tail: [[0, 'rest'], [0.22, 'whip', 0.32]],
    events: [cres(0.33, { y: 0.8, tilt: 0.1, r: 3.0, arc: 5.8, sweep: 1.4, col: EL }), { t: 0.33, fx: 'dust' }, { t: 0.33, fx: 'boltAt', big: k === 'counter' }] });
  set(K.special, { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.3 }], tail: [[0, 'aim'], [0.16, 'low']], events: [bite(0.22, { len: 6 })] });
  // Venomous Bite: strike after strike, the tail lunging low, the last one a sweep across her front
  for (const def of EXS) {
    const T = def.hits.map(h => h.t), last = T[T.length - 1];
    const tail = [[0, 'aim']]; T.slice(0, -1).forEach(t => { tail.push([t - 0.06, 'low']); if (t + 0.06 < last - 0.12) tail.push([t + 0.06, 'aim']); }); tail.push([last - 0.12, 'whip', last]);
    set(def, { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.6 }], stream: [{ t0: 0.1, t1: last, kind: 'spark' }], tail,
      events: def.hits.map((h, i) => bite(h.t, { len: 6.5, big: !!h.heavy, small: i === 0 })).concat([{ t: T[0], fx: 'thrustLine', col: EL2, len: 4 }]) });
  }
  set(K.chain, { motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.4 }, { t0: 0.8, t1: 1.05, kind: 'leap', h: 1.4, d: 0.3 }], stream: [{ t0: 0.2, t1: 0.8, kind: 'sparkRing', r: 2.6 }, { t0: 0.2, t1: 0.8, kind: 'spark' }],
    tail: [[0, 'ring'], [0.8, 'aim'], [0.95, 'whip', 1.05]],
    events: CH.map(t => cres(t, { y: 0.9, tilt: rnd(-0.3, 0.3), r: 3.0, arc: 4.2, sweep: 1.2, col: EL })).concat(CH.map(t => bite(t, { len: 4.5 })), [{ t: 1.05, fx: 'csSlam', r: 3.6, big: true }, { t: 1.05, fx: 'whiteFlash' }]) });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.0 }, { t0: 0.9, t1: 1.3, kind: 'leap', h: 2.2, d: 1.2 }], stream: [{ t0: 0.2, t1: 0.9, kind: 'spark' }, { t0: 0.3, t1: 0.9, kind: 'sparkRing', r: 2.4 }],
    tail: [[0, 'cannon'], [1.1, 'whip', 1.3]],
    events: [{ t: 0.85, fx: 'csLock' }, { t: 1.3, fx: 'csSlam', r: 5, big: true, ahead: 1.5 }, { t: 1.3, fx: 'boltAt', big: true }, { t: 1.3, fx: 'whiteFlash' }, { t: 1.45, fx: 'boltAt' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFT }], tail: [[0, 'aim'], [0.78, 'whip', 0.9]],
    events: FU.map(t => cres(t, { tilt: 1.45, r: 2.6, col: EL })).concat(FU.map(t => ({ t, fx: 'boltAt' })), [{ t: 0.9, fx: 'csSlam', r: 3.2 }, { t: 0.9, fx: 'whiteFlash' }]) });
})();
