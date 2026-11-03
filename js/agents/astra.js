/* ============================================================================
   agents/astra.js -- Astra Yao, "The Queen", Ridu's most iconic singer and
   the star of the Stars of Lyra. S-Rank, Ether, Support, Evasive Assist.
   Released in Version 1.5.
   (How an Agent's own file works, its hooks and its helpers: agents/zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Astra Yao, Lore, Dialogue, DMs,
   Voice-Overs, Idyllic Cadenza, Chord, Basic Attack: Finale, Windchimes &
   Oaths, Tutorial/(Character Intro) Astra Yao, Stars of Lyra, Angels of
   Delusion, Hemiola; the trust commissions Night Owl Noodle Shop, Tiny
   Safehouse, Starloop Dreams and The Answer of an Idol), zzz.gachabase.net
   (datamine, game data 3.4.2), the official portrait, in-game renders and
   Agent Mechanics clips. She is not in the Angels of Delusion: the wiki puts
   her in the Stars of Lyra with her bodyguard Evelyn; the Angels (Aria,
   Sunna, Nangong Yu) are an allied group she looks out for.

   Her kit (official):
     Basic Attack: "Capriccio"        3 strokes of Hemiola, her microphone
                                     staff; hold Basic in the 3rd to charge
                                     (enemies drawn in, a wider, stronger
                                     hit); after other moves, held Basic goes
                                     straight to that 3rd hit
     Dash Attack: "Lunar Eclipse Melody" (the stick steers it)
     Dodge Counter: "Umbrella Waltz"
     Special Attack: "Windchimes & Oaths"   she darts away (invulnerable, the
                                     stick steers), a Tremolo, and she enters
                                     Idyllic Cadenza; held, 1 to 4 more
                                     Tremolos as it charges. Sets up a Quick
                                     Assist when it hits
     Idyllic Cadenza                 the whole squad: DMG +20%, CRIT DMG +25%.
                                     She cannot move, takes 40% less DMG.
                                     Basic: Interlude (Tremolos); Basic after a
                                     Perfect Dodge: Chorus (4 Tremolos); hold
                                     Basic: Finale (it ends the state; with the
                                     Energy, 1 Tremolo, an EX, and 3 Tone
                                     Clusters); hold Dodge: end it. Switched
                                     out she stays on the field, invulnerable;
                                     back in, Windchimes & Oaths at once
     Chord                           every 25 Energy. In Cadenza, with one: a
                                     Quick Assist when the one fighting lands a
                                     hit (once per 3 s; a heavy hit, once per
                                     1 s). A teammate switching in by Quick
                                     Assist, Chain Attack or an Assist: she
                                     spends 25 for a Tremolo (an EX). Switching
                                     quickly is a Precise Assist: 3 Tone
                                     Clusters (Chain and Assist switch-ins
                                     always are)
     Chain Attack: "Tipsy Concerto" / Ultimate: "Fantasian Sonata": her song
                                     as a blast; Cadenza after; the Ultimate
                                     heals the squad and turns the next two
                                     Quick Assists into Chain Attacks
     Quick Assist: "One Luminous Sky"   Evasive Assist: "Two Hearts"
     Assist Follow-Up: "Three Lifetimes of Fate" (an energy beam)
     Core Passive: Graceful Andante  a teammate switching in while she spends
                                     a Chord, or her Finale: +ATK (35% of
                                     hers, up to 1,200) for her and the
                                     incoming Agent, 20 s, up to 30 s
     Additional Ability: Moonlit Frenzy  with an Attack, Anomaly or Rupture
                                     teammate: a Precise Assist or Finale paid
                                     with Energy adds 1 Tremolo + 3 Tone
                                     Clusters
   Our choices where no source says (the report lists them): the Cadenza buff
   lasts as long as the state; Finale's follow-up costs 25 Energy, as the
   Chord's; a Precise Assist is a switch within 0.8 s of the prompt (open
   1.2 s); the held Special adds a Tremolo per 0.35 s of charge; Special in
   Cadenza casts Windchimes & Oaths again; the charged 3rd hit is full after
   0.9 s (sooner: the plain 3rd hit); off the field in Cadenza she gains
   Energy at her on-field rate (she is still on the field).
   One line in battle.js is needed for the squad's CRIT DMG (mech.cdFor, below):
   see the report.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd, lerp } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // a share k of a move's official total [DMG%, Daze%, Anomaly Buildup] (the sources give each as one number)
  const part = (t, k, T, o) => hit(t, T[0] * k, T[1] * k, Math.round(T[2] * k * 100) / 100, o);
  // a Tremolo: 110% / 72.6% / 17.59 each, wherever it comes from (Interlude, Chorus, Finale, Special, Quick Assist)
  const TREM = [110.0, 72.6, 17.59];
  const trem = (t, o) => hit(t, TREM[0], TREM[1], TREM[2], Object.assign({ shape: 'circle', at: 'target', r: 1.7 }, o || {}));
  const CHN = [1343.9, 349.5, 411.16], ULT = [3920.0, 358.2, 216.63], FUP = [609.3, 391.9, 257.01];
  // Chord: 25 Energy. Idyllic Cadenza: DMG +20%, CRIT DMG +25% (level 12), 40% less DMG taken. Graceful Andante: 35% of
  // her ATK up to 1,200 (the official cap: this game's ATK sits on the official in-combat scale). The Ultimate's heal:
  // 2,950 HP (-50 + 250 x skill level 12) x 1.12, this game's HP scale. QA_WIN / PRECISE: our choice (the header)
  const CHORD = 25, CAD_DMG = 0.2, CAD_CD = 0.25, CAD_TAKEN = 0.6, GA_K = 0.35, GA_CAP = 1200, HEAL = 3300;
  const QA_WIN = 1.2, PRECISE = 0.8, SP_STEP = 0.35;
  const ETHER = 0xe45cff, ROSE = 0xff5ab0, LILAC = 0xb88aff, GOLDFX = 0xffd27a, STAGE = 0xff2a3a, WHITEFX = 0xfff0fa;
  const NOTES = [ROSE, LILAC, GOLDFX, WHITEFX, ETHER];

  /* ----------------------------------------------------------------- kit -- */
  const K = {
    basic: [
      { name: 'Basic Attack: "Capriccio"', anim: 'asSwing', dur: 0.46, cancel: 0.32, reach: 2.0, range: 1.8, hits: [hit(0.16, 87.8, 62.2, 37.45, { shape: 'arc', r: 2.3, arc: 130 })] },
      { name: 'Basic Attack: "Capriccio"', anim: 'asSweep', dur: 0.54, cancel: 0.4, reach: 2.1, range: 1.8, hits: [hit(0.22, 118.5, 85.0, 51.25, { shape: 'arc', r: 2.5, arc: 220 })] },
      { name: 'Basic Attack: "Capriccio"', anim: 'asBurst', dur: 0.7, cancel: 0.56, reach: 2.6, range: 2.0, hits: [hit(0.3, 241.9, 173.1, 104.31, { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 0.7 })] },
    ],
    // held Basic: the 3rd hit, charging (asPull: enemies drawn in from that far; asFull: from then on, the full-strength
    // hit). Letting go plays capMax or the plain 3rd hit (mech.tick); kept held to the end, capMax (then)
    capCharge: { name: 'Basic Attack: "Capriccio" (charging)', anim: 'asCharge', dur: 1.4, reach: 3.2, range: 2.4, hits: [], asPull: 4.2, asFull: 0.9, then: 'capMax' },
    capMax: { name: 'Basic Attack: "Capriccio" (charged)', anim: 'asBig', dur: 0.75, cancel: 0.6, reach: 3.4, range: 2.4, hits: [hit(0.2, 542.4, 329.4, 199.39, { heavy: true, shape: 'circle', at: 'front', r: 3.6, kb: 1.0 })] },
    dash: { name: 'Dash Attack: "Lunar Eclipse Melody"', anim: 'asGlide', dur: 0.56, cancel: 0.42, reach: 6, asSteer: [0, 0.3], hits: [hit(0.26, 162.1, 61.3, 36.64, { shape: 'circle', at: 'front', r: 2.2 })] },
    counter: { name: 'Dodge Counter: "Umbrella Waltz"', anim: 'asWaltz', dur: 0.72, cancel: 0.58, inv: [0, 0.65], hits: [hit(0.32, 220.0, 145.2, 35.18, { heavy: true, shape: 'circle', r: 2.8, kb: 0.9 })] },
    // Windchimes & Oaths: she darts away, the Tremolo, Idyllic Cadenza (cadAt); qa: it sets up a Quick Assist
    special: { name: 'Special Attack: "Windchimes & Oaths"', anim: 'asWind', dur: 0.72, cancel: 0.6, reach: 9, range: 5, cd: 1, inv: [0, 0.3], asSteer: [0, 0.28], cadAt: 0.42, qa: true, hits: [trem(0.42)] },
    // held: the same, then the charge (from asHoldFrom); letting go plays spRel1..4, kept held to the end, spRel4
    spCharge: { name: 'Special Attack: "Windchimes & Oaths" (charging)', anim: 'asWindCharge', dur: 0.42 + SP_STEP * 4, reach: 9, range: 5, cd: 1, inv: [0, 0.3], asSteer: [0, 0.28], cadAt: 0.42, qa: true, asPull: 4.5, asHoldFrom: 0.42, then: 'spRel4', hits: [trem(0.42)] },
    // Idyllic Cadenza (cad: she stays where she stands). Interlude: 5 presses of 1, 1, 2, 1, 2 Tremolos
    interlude: [1, 1, 2, 1, 2].map((n, i) => ({ name: 'Basic Attack: Interlude', anim: i % 2 ? 'asSing2' : 'asSing', dur: n > 1 ? 0.56 : 0.44, cancel: n > 1 ? 0.42 : 0.32, reach: 9, range: 5, cad: true, qa: true,
      hits: (n > 1 ? [0.16, 0.3] : [0.16]).map((t, j) => trem(t, i === 4 && j === 1 ? { heavy: true, kb: 0.6 } : {})) })),
    chorus: { name: 'Basic Attack: Chorus', anim: 'asChorus', dur: 0.9, cancel: 0.8, reach: 9, range: 5, inv: [0, 0.85], cad: true, qa: true, hits: [0.2, 0.32, 0.44, 0.6].map((t, j) => trem(t, j === 3 ? { heavy: true, kb: 0.8 } : {})) },
    finale: { name: 'Basic Attack: Finale', anim: 'asFinale', dur: 0.8, cancel: 0.68, reach: 9, range: 5, cad: true, hits: [trem(0.3, { heavy: true, kb: 0.8, r: 2.0 })] },
    // her EX: a Tremolo paid with a Chord (fired by the Chord and by Finale; as a move of its own it is only for tests)
    ex: { name: 'EX Special Attack: Tremolo', anim: 'asSing', dur: 0.6, cancel: 0.5, cost: CHORD, reach: 9, range: 5, hits: [hit(0.2, 92.2, 0, 29.77, { heavy: true, shape: 'circle', at: 'target', r: 1.7 })] },
    clus: { name: 'Chord: Tone Cluster', anim: 'asSing2', dur: 0.4, reach: 9, hits: [hit(0.15, 48.2, 0, 10.32, { shape: 'circle', at: 'target', r: 1.3 })] },
    chain: { name: 'Chain Attack: "Tipsy Concerto"', anim: 'asConcert', dur: 1.45, inv: [0, 1.45], reach: 9, qa: true, cadAfter: true,
      hits: [0.4, 0.58, 0.76].map(t => part(t, 0.15, CHN, { shape: 'circle', at: 'target', r: 2.4 })).concat([part(1.05, 0.55, CHN, { heavy: true, shape: 'circle', at: 'target', r: 3.4, kb: 1.2 })]) },
    // asSub: the next two Quick Assists become Chain Attacks; asAt: the heal as the blast lands
    ult: { name: 'Ultimate: "Fantasian Sonata"', anim: 'asSonata', dur: 2.3, inv: [0, 2.3], reach: 10, qa: true, cadAfter: true, asSub: 2, asAt: [[1.75, 'heal']],
      hits: [0.6, 0.85, 1.1, 1.35].map(t => part(t, 0.1, ULT, { shape: 'circle', at: 'target', r: 3.2 })).concat([part(1.75, 0.6, ULT, { heavy: true, shape: 'circle', at: 'target', r: 4.6, kb: 1.5 })]) },
    assist: { name: 'Evasive Assist: "Two Hearts"', type: 'evasive', anim: 'dodge', dur: 0.45, inv: [0, 0.45] },
    followup: { name: 'Assist Follow-Up: "Three Lifetimes of Fate"', anim: 'asBeamPose', dur: 1.05, inv: [0, 1.0], reach: 9,
      hits: [part(0.35, 0.25, FUP, { shape: 'line', r: 1.2, len: 9 }), part(0.55, 0.25, FUP, { shape: 'line', r: 1.2, len: 9 }), part(0.8, 0.5, FUP, { heavy: true, shape: 'line', r: 1.3, len: 9, kb: 1.0 })] },
    quick: { name: 'Quick Assist: "One Luminous Sky"', anim: 'asSing', dur: 0.62, inv: [0, 0.58], reach: 9, hits: [trem(0.26, { kb: 0.6, r: 2.0 })] },
  };
  // the charged Special's last part: 1 to 4 Tremolos
  for (let n = 1; n <= 4; n++) K['spRel' + n] = { name: 'Special Attack: "Windchimes & Oaths"', anim: 'asSing', dur: 0.32 + 0.13 * n, cancel: 0.22 + 0.13 * n, reach: 9, range: 5, cad: true, qa: true,
    hits: Array.from({ length: n }, (_, i) => trem(0.14 + i * 0.13)) };
  K.int1 = K.interlude[0];                            // (for the squad screen's kit list)

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.astra = {
    id: 'astra', name: 'Astra Yao', short: 'Astra', faction: 'Stars of Lyra', spec: 'Support', attr: 'ether', rank: 'S',
    color: '#be212b', color2: '#e8c060', assist: 'evasive', stance: 'astra',
    blurb: 'Ridu\'s Queen of song, the star of the Stars of Lyra: imposing on stage, a bubbly runaway off it, with her bodyguard Eve never far behind. Her microphone staff Hemiola sends out Tremolos; in Idyllic Cadenza she sings where she stands, lifting the whole squad\'s DMG and CRIT DMG, and pays her Energy in Chords to strike for and power up whoever switches in.',
    stats: { hp: 9640, atk: 2850, def: 642, impact: 83, ap: 92, am: 93, cr: 0.1, cd: 0.8, er: 1.56, speed: 4.7 },
    ai: { range: 2.0, dodge: 0.75, reflex: 0.6, aggr: 0.9 },
    energyMax: 120, resource: 'chords',
    core: [
      ['Core Passive: Graceful Andante', 'In Idyllic Cadenza, when a teammate switches in by Quick Assist, Chain Attack, Defensive or Evasive Assist and Astra spends a Chord (25 Energy) on the Tremolo she fires for them, she and the incoming Agent gain ATK equal to 35% of hers (up to 1,200) for 20 s, extended up to 30 s by repeats. Finale gives it to her too.'],
      ['Idyllic Cadenza', 'Windchimes & Oaths (Special: she darts away, then a Tremolo; hold it for 1 to 4 more), her Chain Attack and her Ultimate put her in it: the whole squad deals +20% DMG and +25% CRIT DMG. She cannot move and takes 40% less DMG. Basic is Interlude, Basic after a Perfect Dodge is Chorus, hold Basic for Finale (it ends the state; with 25 Energy, another Tremolo, an EX, and 3 Tone Clusters), hold Dodge to end it. Switched out, she stays on the field, invulnerable, singing; switched back, she opens with Windchimes & Oaths.'],
      ['Chords and Precise Assists', 'Every 25 Energy is a Chord. In Idyllic Cadenza, with a Chord, a teammate\'s hit sets up a Quick Assist (once per 3 s; a heavy hit, once per 1 s); her Special, Interlude, Chorus, Chain Attack and Ultimate always do. Switch within 0.8 s for a Precise Assist: she adds 3 Tone Clusters (switch-ins by Chain Attack or an Assist always count). Her Ultimate heals the squad 3,300 HP and turns the next two Quick Assists into Chain Attacks.'],
      ['Additional Ability: Moonlit Frenzy', 'With an Attack, Anomaly or Rupture Agent in the squad: when she spends Energy on a Precise Assist or a Finale, she adds another Tremolo and 3 Tone Clusters.'],
    ],
    kit: K,
    kitShow: [['Cadenza', 'int1'], ['Cadenza', 'chorus'], ['Hold (Cadenza)', 'finale'], ['Hold', 'capMax'], ['Chord', 'clus']],
    rivalMoves: [{ k: 'capMax', kind: 'charged', p: 0.2, cd: 6 }],
    howto: 'Astra Yao: Special (Windchimes & Oaths) darts away and puts her in Idyllic Cadenza: the squad deals +20% DMG and +25% CRIT DMG, and she sings where she stands (Basic: Interlude; after a Perfect Dodge: Chorus; hold Basic: Finale, which ends it; hold Dodge: end it). Her Tremolos set up a Quick Assist: switch then, and for every 25 Energy (a Chord) she fires a Tremolo for the teammate coming in and gives you both +ATK (Graceful Andante); switch at once for a Precise Assist (3 Tone Clusters). Off the field she keeps singing. Out of it, hold Basic for a charged 3rd hit. Her assist is an Evasive Assist.',
    mech: {
      // asCad: Idyllic Cadenza. asPin: where she stands in it. asGA: Graceful Andante's end, per Agent. asShots: her queued
      // Tremolos and Tone Clusters. asPend: a Quick Assist she has set up, waiting for its Agent's move to allow it; asQA:
      // the one on offer (for the Precise Assist). asSub: Quick Assists left to turn into Chain Attacks. asMF: Moonlit Frenzy
      init(a) {
        Object.assign(a, { asCad: false, asPin: null, asGA: {}, asShots: [], asPend: null, asQA: null, asQAcd: 0, asQAcdH: 0, asSub: 0,
          asCadAfter: null, asChorusUntil: 0, asMF: false, asDodgeT: 0, asFarT: 0, asNoteT: 0, stance: 'astra' });
        hookUp();
      },
      squad(a, B) { a.asMF = B.squad.some(s => s !== a && ['Attack', 'Anomaly', 'Rupture'].includes(s.def.spec)); },
      start(a, def, A) {
        if (def === K.chorus) a.asChorusUntil = 0;
        if (def.cadAfter) a.asCadAfter = A;                 // (Chain Attack, Ultimate: Idyllic Cadenza once it is over)
        if (def.asSub) { a.asSub = def.asSub; BT.log('Astra Yao: Fantasian Sonata! Her next two Quick Assists will be Chain Attacks.', 'skill'); }
        if (def === K.finale) finale(a);
        if (def.asPull) A.data.asPlan = def === K.capCharge ? (Math.random() < 0.6 ? 1.0 : 0.3) : SP_STEP * (1 + Math.floor(Math.random() * 4)) - 0.05;   // AUTO: how long it holds
        if (def === K.special || def === K.spCharge) a.asChorusUntil = 0;
      },
      // her move sets up a Quick Assist (once a move); her Chain Attack or Ultimate, one of the Chain Attacks it replaces
      hit(a, v, h, A) {
        if (A && A.def && A.def.qa && A.data && !A.data.asQ) { A.data.asQ = true; pend(a, a); }
      },
      // a teammate's hit: Fantasian Sonata's next Chain Attack; with a Chord in Idyllic Cadenza, a Quick Assist
      allyHit(a, src, v, h, A) {
        const B = BT.B;
        if (!a.alive || !src || src === a || src.rival || !A || !A.data) return;
        if (a.asSub > 0 && ['chain', 'ult', 'ult2'].includes(A.kind)) { if (!A.data.asQ) { A.data.asQ = true; pend(a, src); } return; }
        if (!a.asCad || a.energy < CHORD || a.asPend || (a.asQA && a.asQA.until > B.t)) return;
        if (!BT.fielded().includes(src) || src.launchedUntil > B.t) return;
        if (h.heavy) { if (a.asQAcdH > B.t) return; a.asQAcdH = B.t + 1; } else { if (a.asQAcd > B.t) return; a.asQAcd = B.t + 3; }
        pend(a, src);
      },
      swap(a, isIn, why) {
        const B = BT.B;
        if (!isIn) {
          // switched out in Idyllic Cadenza: she stays on the field, a step aside from whoever takes her place
          if (a.asCad && !B.allOut) {
            const v = BT.pickTarget(a), d = v ? U.ang(v, a) : a.face + PI;
            a.x += Math.sin(d) * 1.4; a.z += Math.cos(d) * 1.4; keepIn(a);
            a.asPin = { x: a.x, z: a.z };
          }
          return;
        }
        if (!a.asCad) return;
        // back in: a plain switch finds her where she stood; she opens with Windchimes & Oaths (after a Quick Assist, too)
        if (why === 'swap' && a.asPin) { a.x = a.asPin.x; a.z = a.asPin.z; } else a.asPin = null;
        if (why === 'swap' || why === 'quick') a.queue.push({ def: K.special, kind: 'special', delay: why === 'swap' ? 0.05 : 0 });
      },
      tick(a, dt, on) {
        const B = BT.B, A = a.act;
        if (!a.alive) { if (a.asCad) exitCad(a, null); a.asShots.length = 0; return; }
        // her moves' moments: into Idyllic Cadenza (cadAt; Chain Attack and Ultimate once over), the Ultimate's heal
        if (A && A.def.cadAt != null && A.data && A.t >= A.def.cadAt && !A.data.asCadIn) { A.data.asCadIn = true; enterCad(a); }
        if (A && A.def.asAt && A.data) for (const [t, k] of A.def.asAt) if (A.t >= t && !A.data['as' + k]) { A.data['as' + k] = true; AT[k](a); }
        if (a.asCadAfter && a.act !== a.asCadAfter) { a.asCadAfter = null; enterCad(a); }
        // the stick steers some of her moves; held Basic and held Special charge, drawing enemies in
        if (on && A && A.def.asSteer && A.t >= A.def.asSteer[0] && A.t <= A.def.asSteer[1]) steerBy(a, dt);
        if (on && A && A.def.asPull) charge(a, A, dt);
        if (a.asCad) cadenza(a, dt, on);
        // the Quick Assist she set up goes on offer when its Agent's move allows; the one on offer runs out
        if (a.asPend) tryOpen(a);
        if (a.asQA && a.asQA.until <= B.t) a.asQA = null;
        // her queued Tremolos and Tone Clusters
        if (a.asShots.length) for (let i = a.asShots.length - 1; i >= 0; i--) if (a.asShots[i].at <= B.t) fire(a, a.asShots.splice(i, 1)[0]);
      },
      // Idyllic Cadenza: 40% less DMG, and only a heavy blow staggers her (anti-interrupt); a launch is a launch
      incoming(a, e, h) {
        if (!a.asCad || h.launch || !BT.B) return false;
        BT.hurtAgent(a, e, Object.assign({}, h, { mult: (h.mult || 0) * CAD_TAKEN, flinchOnly: !h.heavy }));
        return true;
      },
      // Idyllic Cadenza for her; the squad's in dmgFor / cdFor; Graceful Andante in atkFor (atkOf asks every Agent)
      mods(a) { return { dmg: a.asCad ? CAD_DMG : 0, cd: a.asCad ? CAD_CD : 0 }; },
      dmgFor(s, b) { return BT.B && s.asCad && s.alive && !b.rival ? CAD_DMG : 0; },
      cdFor(s, b) { return BT.B && s.asCad && s.alive && !b.rival ? CAD_CD : 0; },   // (battle.js: the report's one line)
      atkFor(a, b) { const B = BT.B; return B && a.asGA && !b.rival && (a.asGA[b.id] || 0) > B.t ? gaAtk(a) : 0; },
      // Special: Windchimes & Oaths (held: charged), in Idyllic Cadenza too. Basic in Cadenza: Interlude, Chorus after a
      // Perfect Dodge (tick moves the Dodge Counter's window to asChorusUntil), held Finale. Otherwise held Basic: the
      // charged 3rd hit; tapped, her string as usual
      resolve(a, btn, hold, c) {
        if (btn === 'special') return { def: hold ? K.spCharge : K.special, kind: 'special' };
        if (btn !== 'basic') return null;
        if (a.asCad) {
          if (hold) return { def: K.finale, kind: 'core' };
          if (a.asChorusUntil > c.t) return { def: K.chorus, kind: 'counter' };
          const step = c.step != null ? c.step : c.t - a.lastBasic > 0.9 ? 0 : a.combo;
          return { def: K.interlude[step % K.interlude.length], kind: 'basic', step };
        }
        if (hold && !c.dash) return { def: K.capCharge, kind: 'charged' };
        return null;
      },
      // AUTO: into Idyllic Cadenza (often held), then sing: Chorus when it is there, Interludes, a Finale now and then
      // with the Energy to spare. Out of it, the charged 3rd hit at the end of her string
      ai(a, tgt, B) {
        if (a.asCad) {
          if (a.asChorusUntil > B.t) return { btn: 'basic' };
          if (a.energy >= 60 && U.dist(a, tgt) - tgt.rad < 8.5 && Math.random() < 0.06) return { btn: 'basic', hold: true };
          return { btn: 'basic' };
        }
        if ((a.cds.special || 0) <= B.t && Math.random() < 0.6) return { btn: 'special', hold: Math.random() < 0.45 };
        if (a.combo === 2 && Math.random() < 0.4) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const n = Math.min(4, Math.floor(a.energy / CHORD)), r = [`CHORDS ${'●'.repeat(n)}${'○'.repeat(4 - n)}`];
        if (a.asCad) r.push('IDYLLIC CADENZA · SQUAD DMG +20% · CRIT DMG +25%');
        const ga = (a.asGA[a.id] || 0) - B.t; if (ga > 0) r.push(`GRACEFUL ANDANTE +${gaAtk(a)} ATK ${Math.ceil(ga)}s`);
        if (a.asQA && a.asQA.until > B.t) r.push('QUICK ASSIST: SWITCH NOW');
        if (a.asSub > 0) r.push(`NEXT ${a.asSub > 1 ? 'TWO QUICK ASSISTS' : 'QUICK ASSIST'}: CHAIN ATTACK`);
        return r;
      },
    },
    town: {
      // Sixth Street: Random Play is her favourite haunt and "safe house" (Agent Intel, Tiny Safehouse), her trust events
      // are at the video store counter and the truck by the 141 (with Cookie), she slips into the 404 for the shows, eats
      // late at Waterfall Soup ("number one on my list of favorite noodle shops"), and Bardic Needle is a Quality Time
      // place. (Lumina Square has her playground game and the cinema signing.)
      home: 'sixth',
      // the video store and Bardic Needle's crates by day, the 141 truck and its ice cream in the afternoon, the 404 at six,
      // late noodles and the video store at night (waiting at the metro for Eve's car)
      routine: ['rp:door 35, bardic:crates 25, box:cats 15, huddle 25', '141:truck 35, rp:window 25, 141:icecream 15, huddle 25', '404:door 35, 404:q1 25, gf:cab 15, huddle 25', 'soup:stool 45, rp:night 35, metro:wait 20'],
      chatter: ['Shh! I\'m in disguise.', 'Ah, a peaceful interlude.'],
      lines: [
        'Random Play has rare cuts of old movies. That\'s my official excuse, anyway. Eve says I come here far too often. ...She\'s not wrong.',
        'I\'m planning a shelter for strays. Not Cookie, though! She has an owner here on Sixth Street. I checked. Eventually.',
        'Waterfall Soup is number one on my list of noodle shops. It\'s open late, and at that hour nobody asks for a selfie. Well. Almost nobody.',
      ],
      chapters: [
        { title: 'Safe house', ask: ['Psst! Paparazzi. Two of them, on my tail for blocks. I switched taxis twice!', 'Let me lie low at Random Play for a bit. And... could you order me noodles at Waterfall Soup? The spicy ones. I\'m starving.'], steps: [{ t: 'order' }, { t: 'talk', to: 'astra' }],
          scene: [['A', 'Noodles! You\'re a lifesaver. Mmm... okay, these are REALLY spicy.'], ['P', 'The two outside just ordered the same bowl.'], ['A', 'Look at them fanning their mouths! Now\'s my chance to slip out the back.'], ['A', 'I\'ve added "an all-nighter at the video store" to my bucket list. Next time I\'m bringing pajamas. Don\'t move the couch!']] },
        { title: 'Little Sunna', ask: ['Little Sunna asked me what an "idol" really is. She looked so serious, I couldn\'t help teasing her.', 'Take her a sweet milk tea from me? And tell her there\'s no rush to find the answer.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'sunna', reply: 'Th-this is from Astra? "No rush"... Okay. T-tell her thank you. And that I\'m not little!' }, { t: 'talk', to: 'astra' }],
          scene: [['P', 'She says thank you. And that she\'s not little.'], ['A', 'Hehe. Her reactions are priceless.'], ['A', 'Being an idol isn\'t something you look up in a dictionary. It\'s something you do, one step at a time.'], ['P', 'Have you figured it out?'], ['A', '...Not completely. Don\'t tell her that part. Or do. Maybe it\'ll help.']] },
        { title: 'Encore', ask: ['Aria\'s playing the 404 tonight, and Eve says I can\'t go. "Too many prying eyes."', 'So let\'s take the show to a Hollow! Ask Aria if she\'ll share the stage, then take us both in.'], steps: [{ t: 'talk', to: 'aria', reply: 'A duet with Astra Yao?! In a Hollow?! ...I mean, yes! Tell her yes! Fandom Power, maximum!' }, { t: 'clear', f: { enc: 'elite', lead: 'aria', with: 'astra' } }, { t: 'talk', to: 'astra' }],
          scene: [['A', 'What a show! She hit every cue. I knew she would, ever since Starloop.'], ['P', 'Starloop?'], ['A', 'Security wouldn\'t let you two in, remember? I asked them to waive the check for performers. She\'s a performer. Obviously.'], ['A', 'Music is magic. Thank you for giving us a stage. ...Same time next week?']] },
      ],
    },
  };

  /* -------------------------------------------------------- mechanics -- */
  const gaAtk = a => Math.min(GA_CAP, Math.round(GA_K * a.st.atk));
  function keepIn(a) { const Bd = BT.B && BT.B.bounds; if (Bd) { a.x = clamp(a.x, Bd[0] + 0.5, Bd[2] - 0.5); a.z = clamp(a.z, Bd[1] + 0.5, Bd[3] - 0.5); } }
  // Graceful Andante for b: 20 s, repeats extend it up to 30 s
  function andante(a, b) {
    const B = BT.B, left = Math.max(0, (a.asGA[b.id] || 0) - B.t);
    a.asGA[b.id] = B.t + Math.min(30, left + 20);
  }
  function enterCad(a) {
    if (!a.alive) return;
    const was = a.asCad; a.asCad = true; a.stance = 'astraSing'; a.asPin = null; a.asFarT = 0;
    if (!was) { BT.callout('IDYLLIC CADENZA', 'skill', 'Astra Yao · squad DMG +20%, CRIT DMG +25%'); BT.log('Astra Yao enters Idyllic Cadenza: the squad deals +20% DMG and +25% CRIT DMG. She sings where she stands and takes 40% less DMG.', 'skill'); }
    stageFx(a);
  }
  function exitCad(a, why) {
    const B = BT.B, on = BT.fielded().includes(a);
    a.asCad = false; a.stance = 'astra'; a.asPin = null; a.asChorusUntil = 0;
    if (why) BT.log(`Astra Yao leaves Idyllic Cadenza (${why}).`, 'skill');
    if (a.alive && !on && !B.allOut && a.obj.visible) { a.obj.visible = false; FX.burst(a.x, 1, a.z, 14, { col: [0xffffff, ETHER, ROSE], speed: 3, size: 0.1, life: 0.35, g: -2 }); }
  }
  // Finale: she leaves the state with Graceful Andante; with a Chord, the EX Tremolo and Tone Clusters (Moonlit Frenzy: again)
  function finale(a) {
    exitCad(a, null); andante(a, a);
    if (a.energy < CHORD) { BT.log('Astra Yao: Basic Attack: Finale (Graceful Andante).', 'skill'); return; }
    BT.spendEnergy(a, CHORD);
    follow(a, a, 0.42); if (a.asMF) follow(a, a, 1.0);
    BT.log(`Astra Yao: Basic Attack: Finale, with a Chord: a Tremolo (EX) and Tone Clusters${a.asMF ? ', twice (Moonlit Frenzy)' : ''}.`, 'ex');
  }
  // a Tremolo then 3 Tone Clusters (t0: seconds from now); 3 Tone Clusters
  function follow(a, who, t0) { shot(a, who, t0, 'trem'); clusters(a, who, t0 + 0.22); }
  function clusters(a, who, t0) { for (let i = 0; i < 3; i++) shot(a, who, t0 + i * 0.12, 'clus'); }
  function shot(a, who, d, k) { a.asShots.push({ at: BT.B.t + d, who, k }); }
  // one of them goes off: at what the Agent it is for is fighting
  function fire(a, s) {
    const w = s.who && s.who.alive ? s.who : BT.active();
    let v = w && w.act && w.act.tgt && w.act.tgt.alive ? w.act.tgt : w && w.lastTgt && w.lastTgt.alive ? w.lastTgt : null;
    if (!v) v = BT.pickTarget(w || a);
    if (!v || !v.alive) return;
    const tr = s.k === 'trem', def = tr ? K.ex : K.clus, h = def.hits[0];
    const A = { kind: tr ? 'ex' : 'chord', def, data: {}, dir: U.ang(a, v), t: 0, tgt: v };
    noteFx(a, v, tr);
    for (const e of BT.enemiesIn('circle', v.x, v.z, h.r, 0)) BT.applyHit(a, e, h, A, 'ether');
  }
  // a teammate switching in while she is in Idyllic Cadenza (BT.on: 'quick', 'chain', 'assist')
  function switchIn(a, inc, kind) {
    const B = BT.B;
    if (!a.asCad || !a.alive || !inc || inc === a || inc.rival) return;
    const Q = a.asQA; a.asQA = null;
    const precise = kind !== 'quick' || !!(Q && B.t - Q.at <= PRECISE), paid = a.energy >= CHORD;
    if (paid) { BT.spendEnergy(a, CHORD); shot(a, inc, 0.15, 'trem'); andante(a, a); andante(a, inc); }
    if (precise) clusters(a, inc, 0.45);
    if (paid && precise && a.asMF) follow(a, inc, 0.95);
    if (!paid && !precise) return;
    if (precise) BT.callout('PRECISE ASSIST', 'assist', `Astra Yao · ${inc.def.short}`);
    BT.log(`Astra Yao (Chord${paid ? ', 25 Energy' : ''}): ${paid ? `a Tremolo for ${inc.def.short}, +${gaAtk(a)} ATK for both (Graceful Andante)` : 'no Chord left'}${precise ? `; Precise Assist: 3 Tone Clusters${paid && a.asMF ? ', and a Tremolo with 3 more (Moonlit Frenzy)' : ''}` : ''}.`, 'skill');
  }
  // a Quick Assist she sets up for who (the Agent fighting): it goes on offer once who's move allows it (yours: at once,
  // unless an Ultimate, a Chain Attack or an Assist is playing; AUTO's: from its cancel point). After Fantasian Sonata
  // it is a Chain Attack instead
  function pend(a, who) { a.asPend = { who, until: BT.B.t + 4 }; }
  function tryOpen(a) {
    const B = BT.B, P = a.asPend, who = P.who;
    if (P.until <= B.t || !who.alive || (!B.allOut && who !== BT.active()) || !B.squad.some(s => s.alive && s !== who)) { a.asPend = null; return; }   // (no one to switch to: nothing)
    if (B.chain || B.cutin) return;
    const W = who.act;
    if (W && (['ult', 'ult2', 'chain', 'assist'].includes(W.kind) || (!BT.isPlayer(who) && W.t < (W.def.cancel || W.dur)))) return;
    a.asPend = null;
    if (a.asSub > 0 && openChain(who)) { a.asSub--; return; }
    who.launchedUntil = B.t + QA_WIN; a.asQA = { at: B.t, until: B.t + QA_WIN };
    BT.callout('QUICK ASSIST', 'assist', 'Astra Yao · switch now');
  }
  // Fantasian Sonata: a Chain Attack choice on what who is fighting (as battle.js opens one on a Stun)
  function openChain(who) {
    const B = BT.B, v = who.act && who.act.tgt && who.act.tgt.alive ? who.act.tgt : BT.pickTarget(who);
    if (!v) return false;
    const opts = B.squad.filter(s => s.alive && s !== who);
    if (!opts.length) return false;
    B.chain = { tgt: v, opts: opts.slice(0, 2), timer: BT.T.chainWindow, from: who, count: B.chainCount || 0 };
    BT.callout('CHAIN ATTACK', 'chain', 'Fantasian Sonata'); SFX.play('chain');
    if (BT.hooks.chainOpen) BT.hooks.chainOpen(B.chain);
    BT.log('Fantasian Sonata: a Chain Attack instead of a Quick Assist.', 'chain');
    return true;
  }
  // Idyllic Cadenza, every frame: the Dodge Counter's window is Chorus's; she stands where she is (the frame hook pins
  // her); hold Dodge to leave it (AUTO: when nothing is in reach); off the field she keeps singing where she stood
  function cadenza(a, dt, on) {
    const B = BT.B, A = a.act;
    if (a.counterUntil > B.t) { a.asChorusUntil = a.counterUntil; a.counterUntil = 0; }
    if (!A || A.def.cad) { if (!a.asPin) a.asPin = { x: a.x, z: a.z }; } else a.asPin = null;
    if (on && BT.isPlayer(a) && BT.btnHeld('dodge')) { a.asDodgeT += dt; if (a.asDodgeT >= 0.5) { a.asDodgeT = 0; exitCad(a, 'Dodge held'); return; } } else a.asDodgeT = 0;
    if (on && !BT.isPlayer(a) && !A) {
      const near = B.enemies.some(v => v.alive && v.spawnT <= 0 && U.dist(a, v) - v.rad < 9);
      a.asFarT = near ? 0 : a.asFarT + dt; if (a.asFarT > 1.5) { exitCad(a, 'nothing in reach'); return; }
    }
    if (!on && !B.allOut) {
      if (!a.obj.visible) { a.obj.visible = true; FX.glow(a.x, 1.2, a.z, 2, ROSE, 0.3); }
      if (a.state !== 'idle') { a.state = 'idle'; a.anim.state = 'idle'; }
      const w = BT.active(), v = w && w.act && w.act.tgt && w.act.tgt.alive ? w.act.tgt : w && w.lastTgt && w.lastTgt.alive ? w.lastTgt : null;
      if (v) a.face = U.turn(a.face, U.ang(a, v), 1 - Math.exp(-6 * dt));
      BT.gainEnergy(a, a.st.er * 0.55 * dt);             // (on the field after all: her on-field Energy rate)
    }
    a.asNoteT -= dt;
    if (a.asNoteT <= 0 && a.obj.visible) {                // notes rising from Hemiola as she sings
      a.asNoteT = rnd(0.35, 0.7);
      const m = mic(a); FX.p({ x: m.x + rnd(-0.3, 0.3), y: m.y, z: m.z + rnd(-0.3, 0.3), vx: rnd(-0.4, 0.4), vy: rnd(0.8, 1.4), vz: rnd(-0.4, 0.4), drag: 1, life: 1.1, size: 0.13, size1: 0.04, col: U.pick(NOTES), g: -0.2 });
    }
  }
  // held Basic / Special: enemies drawn in toward the spot before her; letting go (AUTO: its plan) plays the release
  function charge(a, A, dt) {
    const d = A.def, from = d.asHoldFrom || 0;
    if (A.t < from) return;
    const cx = a.x + Math.sin(A.dir) * 2.2, cz = a.z + Math.cos(A.dir) * 2.2;
    for (const v of BT.enemiesIn('circle', cx, cz, d.asPull, 0)) {
      if (v.rival || v.rank === 'boss') continue;                       // (bosses and rival Agents hold their ground: our choice)
      const dx = cx - v.x, dz = cz - v.z, dd = Math.hypot(dx, dz); if (dd < 0.8 + v.rad) continue;
      const k = (v.rank === 'elite' ? 1.0 : 2.4) * dt; v.x += dx / dd * k; v.z += dz / dd * k;
    }
    const me = BT.isPlayer(a), held = me ? BT.btnHeld(d === K.spCharge ? 'special' : 'basic') : A.t - from < (A.data.asPlan || 0);
    if (held && A.t < d.dur - 0.04) return;
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null, c = A.t - from;
    BT.endAct(a); a.gap = 0;
    if (d === K.capCharge) a.queue.unshift(c >= d.asFull ? { def: K.capMax, kind: 'charged', tgt, delay: 0 } : { def: K.basic[2], kind: 'basic', tgt, delay: 0, step: 2 });
    else a.queue.unshift({ def: K['spRel' + clamp(1 + Math.floor(c / SP_STEP), 1, 4)], kind: 'special', tgt, delay: 0 });
  }
  // the stick moves her while a move allows it (yours only)
  function steerBy(a, dt) {
    const I = BT.isPlayer(a) && BT.moveInput && BT.moveInput(); if (!I) return;
    const y = BT.B.cam.yaw || 0, d = Math.atan2(Math.cos(y) * I.x - Math.sin(y) * I.y, -Math.sin(y) * I.x - Math.cos(y) * I.y);
    a.x += Math.sin(d) * 6 * dt; a.z += Math.cos(d) * 6 * dt; keepIn(a);
  }
  // the moments in her moves (def.asAt), fired from mech.tick
  const AT = {
    heal(a) {
      const B = BT.B;
      for (const s of B.squad) if (s.alive) s.hp = Math.min(s.hpMax, s.hp + HEAL);
      for (const s of BT.fielded().concat(BT.fielded().includes(a) ? [] : [a])) {
        if (BT.T.dmgNumbers && s !== a) FX.number(s.x, s.height + 0.2, s.z, '+' + U.fmt(HEAL), 'big', '#8dffb8');
        FX.burst(s.x, 1, s.z, 24, { col: [0x8dffb8, ROSE, WHITEFX, GOLDFX], speed: 3, size: 0.12, life: 0.7, g: -2 }); FX.ring(s.x, s.z, 0.4, 2.2, 0x8dffb8, 0.5);
      }
      BT.log(`Astra Yao: Fantasian Sonata heals the whole squad ${U.fmt(HEAL)} HP.`, 'skill');
    },
  };
  // the frame hook (Idyllic Cadenza pins her where she stands) and the switch-ins she answers. Agent files load before
  // battle.js: it goes in once the page has loaded, or at her first battle
  let hooked = false;
  function hookUp() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on((kind, d) => {
      const B = BT.B; if (!B) return;
      if (kind === 'frame') {
        for (const s of B.squad) if (s.id === 'astra' && s.asCad && s.asPin && s.alive) { s.x = s.asPin.x; s.z = s.asPin.z; s.vx = 0; s.vz = 0; s.obj.position.x = s.x; s.obj.position.z = s.z; }
        return;
      }
      if (!d || !d.a) return;
      if (kind === 'quick' || kind === 'chain' || (kind === 'assist' && (d.type === 'defensive' || d.type === 'evasive')))
        for (const s of B.squad) if (s.id === 'astra') switchIn(s, d.a, kind);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookUp); else hookUp();

  /* --------------------------------------------------------------- model --
     From the official portrait, in-game and city renders: very long straight
     teal-black hair to mid-thigh, blunt hime bangs and side locks, a white
     headband, gold ornaments with tassels and teal-drop earrings on her left,
     crimson eyes. A red choker with a pearl strand and a gold medallion; an
     open red cropped jacket off the shoulders, puffed and ruffled, its long
     sleeves flaring at white-trimmed cuffs, pearl buttons, red tails behind.
     A white corset dress: boning, gold studs down the front, gold star
     brooches and white bows at the waist, a flared skirt of white petal
     panels open on a black underskirt with a dark star, a white disc with a
     gold star on her left hip. Bare legs; a pearl garter with a black ribbon
     on her left thigh, pearl ankle straps, black platform heels with big black
     bows. 176 cm: a tall Agent.
     In her right hand Hemiola, a gold microphone staff as tall as she is: the
     shaft spiral-wrapped, a silver diamond knob, the round gold microphone
     (studded, a pale blue crystal at its heart) inside a gold gyroscope ring,
     a CD clipped on top; a steel ferrule with a red ring at its foot. */
  {
    const HAIR = 0x1c2a2e, HAIR2 = 0x142027, HAIRHI = 0x264552, BAND = 0xeef0f6, BAND2 = 0x939ea9, SKIN = 0xfae3d4, SKIN2 = 0xdbb5a2;
    const EYE = 0x782636, LASH = 0x1a1216, MOUTH = 0xd0767a, RED = 0xbe212b, RED2 = 0x7a1d22, RED3 = 0x541317, TRIM = 0xf2f0f4;
    const WHITE = 0xdce0ec, WHITE2 = 0xadb3cb, WHITE3 = 0x949bb2, GOLD = 0xe8c060, GOLD2 = 0x8c6f3e, GOLDHI = 0xfeeb9c, BRASS = 0xa98673;
    const BLACK = 0x1e1d22, BLACK2 = 0x100e0f, STAR = 0x3a3c52, PEARL = 0xe8e2ea, PEARL2 = 0xcdc7cf, TEAL = 0x3fa89a;
    const SILVER = 0xcbcee5, STEEL = 0x434360, CRYSTAL = 0xc7d4f1, CD = 0x6c628f, CD2 = 0xc8c0e8, FERR = 0xc8303a;
    // an arm (s = 1: her left, +X): the red sleeve, puffed and ruffled at the shoulder (kept clear of her chest), the
    // flared cuff trimmed white with a pearl button, her hand
    const arm = s => g => {
      for (let y = -1; y >= -5; y--) g.box(-1, y, -1, 1, y, 1, y === -3 ? RED2 : RED);
      g.box(s > 0 ? -1 : -2, -1, -2, s > 0 ? 2 : 1, 0, 2, (x, y, z) => ((x + z + y) & 1) ? RED : RED2);   // the puffed, ruffled shoulder
      g.box(-2, -6, -2, 2, -6, 2, (x, y, z) => Math.abs(x) === 2 || Math.abs(z) === 2 ? TRIM : RED);      // the flared cuff, white-trimmed
      g.set(0, -5, -2, PEARL);                                                                             // a pearl button
      g.box(-1, -7, -1, 1, -7, 1, SKIN);                                                                   // her hand
    };
    // a leg (left: her left one, the pearl garter): bare, black platform heels with a bow at the back, a pearl ankle strap
    const leg = left => g => {
      H.leg(g, { pant: SKIN, boot: BLACK, bootH: 2, sole: BLACK2 });
      g.box(-1, -6, -1, 1, -5, -1, SKIN2);                                                   // the back of the calf, in shade
      g.box(-1, -7, -1, 1, -7, 1, (x, y, z) => (x + z) & 1 ? PEARL : PEARL2);               // the pearl ankle strap
      g.box(-1, -9, -2, 1, -8, -2, BLACK2);                                                  // the heel
      g.box(-1, -7, -2, 1, -7, -2, BLACK); g.set(-2, -6, -2, BLACK); g.set(2, -6, -2, BLACK); g.set(0, -6, -2, BLACK2);   // the big black bow
      if (left) {
        g.box(-1, -2, -1, 1, -2, 1, (x, y, z) => (x + z) & 1 ? PEARL : PEARL2);             // the pearl garter on her left thigh...
        g.set(2, -2, 0, BLACK); g.set(2, -3, 0, BLACK); g.set(2, -3, -1, BLACK);              // ...and its black ribbon
      }
    };
    MODELS.astra = H.humanoid({
      scale: 0.075, height: 28, width: 20,
      sockets: { weapon: ['staff', [0, 16, 1]], off: ['armL', [0, -7, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, WHITE);                                                      // the skirt's waist under the corset
        // the petal panels flaring out, shaded at the folds, open at the front on the black underskirt
        const panel = (x, z, front) => Math.abs(x) <= 1 && z >= front ? BLACK : ((x + z) % 3 === 0 ? WHITE2 : WHITE);
        g.box(-4, -2, -3, 4, -2, 2, (x, y, z) => panel(x, z, 2));
        g.box(-5, -3, -4, 5, -3, 3, (x, y, z) => panel(x, z, 3));
        g.box(-5, -4, -4, 5, -4, 3, (x, y, z) => Math.abs(x) <= 1 && z >= 3 ? BLACK2 : ((x * 3 + z) & 1 ? WHITE : WHITE3));   // a lace hem
        g.cut(-3, -2, -2, 3, -2, 1); g.cut(-4, -4, -3, 4, -3, 2);                              // (hollow underneath: her legs move freely)
        g.set(0, -3, 3, STAR); g.set(0, -2, 2, STAR);                                           // the dark star on the underskirt
        for (const s of [-1, 1]) { g.set(s * 3, 0, 2, WHITE); g.set(s * 4, 0, 2, WHITE2); g.set(s * 4, -1, 2, WHITE2); g.set(s * 3, 0, 3, GOLD); }   // white bows, gold star brooches
        g.cyl('x', -2, 0, 1.6, 6, 6, (x, y, z) => (y === -2 && z === 0) ? GOLD : (y + z) & 1 ? TRIM : WHITE2);   // the white disc on her left hip, a gold star
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, WHITE);                                                       // the corset's waist
        g.box(-2, 0, 2, 2, 2, 2, (x, y) => x === 0 ? (y === 1 ? WHITE2 : GOLD) : (x & 1 ? WHITE2 : WHITE));   // boning, gold studs down the front
        g.box(-3, 3, -2, 3, 5, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, WHITE); g.set(0, 3, 2, WHITE2);   // the bust
        g.box(-2, 5, 1, 2, 5, 1, SKIN); g.box(-1, 6, -1, 1, 6, 1, RED);                          // bare above it; the red choker...
        g.set(0, 6, 2, GOLD); g.set(-1, 5, 2, PEARL); g.set(0, 5, 2, GOLDHI); g.set(1, 5, 2, PEARL);   // ...its gold medallion and pearls
        g.set(-2, 1, 3, BRASS); g.set(2, 2, 3, BRASS);                                           // gold star brooches on the corset
        // the red jacket, open and off the shoulders: its sides and back, red tails behind, pearl buttons on the hem
        g.box(-3, 1, -2, -3, 6, 1, RED); g.box(3, 1, -2, 3, 6, 1, RED);
        g.box(-3, 1, -3, 3, 6, -3, (x, y) => y === 1 ? RED2 : RED);
        g.box(-3, -2, -4, 3, 0, -4, (x, y) => ((x + y) & 1) ? RED : RED2); g.box(-2, -3, -4, 2, -3, -4, RED2);
        for (const x of [-2, 0, 2]) g.set(x, 0, -5, PEARL);
        g.box(-2, 6, -3, 2, 6, -3, RED3);                                                         // the dark red of its turned-down collar
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        g.set(-1, 0, 3, 0xffffff); g.set(1, 0, 3, MOUTH);                                        // her grin
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 4], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]], sideTo: 2 });   // blunt hime bangs
        for (const x of [-3, 0, 3]) g.set(x, 6, 4, HAIRHI);                                       // a sheen on them
        g.box(-4, 7, 1, 4, 7, 1, BAND); g.box(-4, 5, 1, -4, 6, 1, BAND); g.box(4, 5, 1, 4, 6, 1, BAND);   // the white headband over the crown...
        g.set(-2, 7, 2, BAND2); g.set(-1, 7, 2, BLACK);                                           // ...its little ornament
        for (const s of [-1, 1]) g.box(s * 4, -2, 2, s * 4, 3, 3, (x, y) => y === -2 ? HAIR2 : HAIR);   // hime side locks to the shoulder
        g.set(-4, 1, 2, HAIRHI); g.set(4, 2, 3, HAIRHI);
        g.box(-4, -1, -4, 4, 0, -4, HAIR2);                                                       // the back, to the nape
        g.set(5, 6, -1, GOLD); g.set(5, 5, -2, GOLD2); g.box(5, 2, -2, 5, 4, -2, GOLD);           // a gold ornament and its tassel, on her left
        for (const s of [-1, 1]) { g.set(s * 4, 1, 0, GOLD); g.set(s * 4, 0, 0, TEAL); }          // gold earrings, teal drops
      },
      armL: g => { arm(1)(g); g.box(-1, -7, -1, 1, -7, -1, GOLD); g.set(0, -7, 1, TRIM); },      // (a white-and-gold bangle on her left wrist)
      armR: arm(-1),
      legL: leg(true),
      legR: leg(false),
      extra: {
        tail: {   // her long straight hair, down the back to mid-thigh (anim.js sways it)
          parent: 'head', at: [0, 3, -4], draw(g) {
            for (let y = 0; y >= -16; y--) {
              const w = y > -12 ? 4 : 3;
              g.box(-w, y, -1, w, y, 0, (x, yy, z) => y <= -15 ? HAIR2 : (x * 2 + y * 3) % 7 === 0 && z === 0 ? HAIRHI : Math.abs(x) === w ? HAIR2 : HAIR);
            }
          },
        },
        staff: {  // Hemiola in her right hand (rot: upright with her arm as in her ready stance)
          parent: 'armR', at: [0, -7, 1], rot: [0.6, 0, 0], draw(g) {
            for (let y = -12; y <= 10; y++) g.set(0, y, 0, y <= -9 ? (y === -11 ? FERR : STEEL) : ((y + 30) % 3 === 0 ? GOLD2 : (y + 30) % 3 === 1 ? GOLDHI : GOLD));   // the spiral-wrapped shaft, the steel ferrule
            g.set(0, -13, 0, SILVER);                                                              // its point
            g.box(-1, 11, -1, 1, 11, 1, SILVER); g.set(0, 12, 0, STEEL); g.set(-2, 11, 0, SILVER); g.set(2, 11, 0, SILVER);   // the silver diamond knob
            // the microphone: a round gold disc facing out, studded, the pale blue crystal at its heart
            g.cyl('z', 0, 16, 3, 0, 0, (x, y) => { const r2 = x * x + (y - 16) * (y - 16); return r2 <= 1.3 ? G(CRYSTAL) : r2 >= 6.5 && ((x + y) & 1) ? GOLDHI : GOLD; });
            g.cyl('z', 0, 16, 2.4, -1, -1, GOLD2);
            for (let i = 0; i < 28; i++) { const an = i / 28 * PI * 2; g.set(Math.round(Math.cos(an) * 4.6), 16 + Math.round(Math.sin(an) * 4.6), -1, i % 7 === 0 ? GOLDHI : GOLD); }   // the gyroscope ring
            g.set(0, 13, 0, GOLD2); g.set(0, 19, -1, GOLD2);                                       // where the ring meets the stem
            g.cyl('z', -2, 21, 1.6, 0, 0, (x, y) => (x === -2 && y === 21) ? SILVER : (x + y) & 1 ? CD2 : CD);   // a CD clipped on top
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: Hemiola upright in her right hand (its rot keeps it vertical with her arm so), one foot before the other
  ANIM.READY.astra = { armL: [-0.15, 0, 0.3], armR: [-0.6, 0.1, -0.1], torso: [0.02, 0.12, 0], head: [0.02, -0.1, 0.04], legL: [0.06, 0, 0.03], legR: [-0.14, 0, -0.04], hipsY: 0 };
  // Idyllic Cadenza: on stage, singing, her free hand out to the crowd, chin up
  ANIM.READY.astraSing = { armL: [-0.55, 0, 1.05], armR: [-0.6, 0.15, -0.1], torso: [-0.06, 0.15, 0], head: [-0.22, -0.1, 0.06], legL: [0.08, 0, 0.04], legR: [-0.16, 0, -0.04], hipsY: 0 };
  const UPR = { armR: [-0.6, 0.1, -0.1] };
  // Capriccio: a swing of Hemiola, a twirling sweep, then she plants it and sings the note out
  ACT.asSwing = (b, t, th, d) => stage(b, { armR: [-2.3, 0.4, -0.6], torso: [-0.05, 0.6, 0], legR: [0.25, 0, 0] }, { armR: [-1.0, -0.6, 0.5], torso: [0.15, -0.5, 0], legL: [-0.45, 0, 0], legR: [0.3, 0, 0], hipsY: -0.05 }, t, th, d);
  ACT.asSweep = (b, t, th, d) => add(stage(b, { armR: [-1.4, 0.9, -1.1], torso: [0, 0.8, 0] }, { armR: [-1.4, -0.9, 0.9], armL: [-0.4, 0, 1.1], torso: [0.1, -0.8, 0], legL: [-0.5, 0, 0], hipsY: -0.06 }, t, th, d), { spin: clamp(t / (th + 0.12), 0, 1) * PI * 2 });
  ACT.asBurst = (b, t, th, d) => stage(b, Object.assign({ armL: [-0.7, 0, 1.2], head: [-0.3, 0, 0], torso: [-0.15, 0.2, 0] }, UPR), Object.assign({ armL: [-1.65, -0.2, 0.15], head: [0.05, 0, 0], torso: [0.18, -0.1, 0], legL: [-0.55, 0, 0], legR: [0.35, 0, 0], hipsY: -0.06 }, UPR), t, th, d);
  // charging: Hemiola drawn across her, a crouch, a tremble of power; the charged hit sweeps it up overhead
  ACT.asCharge = (b, t) => add(b, { armR: [-1.3, 0.6, -0.3], armL: [-1.1, -0.5, 0.4], torso: [0.25, 0.1, 0], head: [0.1, 0, 0], hipsY: -0.12, legL: [-0.4, 0, 0.1], legR: [0.3, 0, -0.1], roll: Math.sin(t * 40) * 0.015 * Math.min(1, t * 2) });
  ACT.asBig = (b, t, th, d) => stage(b, { armR: [-1.3, 0.6, -0.3], armL: [-1.1, -0.5, 0.4], torso: [0.25, 0, 0], hipsY: -0.12 }, { armR: [-2.7, 0, -0.3], armL: [-0.5, 0, 1.4], torso: [-0.3, 0, 0], head: [-0.35, 0, 0], lift: 0.12 }, t, th, d);
  // a Tremolo: her free hand thrown toward the target as the note leaves (Sing2: the gesture from above)
  ACT.asSing = (b, t, th, d) => stage(b, { armL: [-0.6, 0.3, 1.1], head: [-0.2, 0, 0.05] }, { armL: [-1.7, -0.15, 0.1], head: [-0.25, -0.1, 0], torso: [-0.06, -0.15, 0] }, t, th, d);
  ACT.asSing2 = (b, t, th, d) => stage(b, { armL: [-2.3, 0, 0.3], torso: [-0.1, 0.2, 0], head: [-0.3, 0, 0] }, { armL: [-1.4, 0, 0.9], torso: [0.08, -0.1, 0], head: [-0.1, 0, 0.08] }, t, th, d);
  ACT.asChorus = (b, t) => { const k = Math.sin(t * 22); return add(b, { armL: [-1.4 + k * 0.45, 0.2 * k, 0.6 - k * 0.3], head: [-0.25, 0, 0.05 * k], torso: [-0.08, 0.2 * k, 0], lift: Math.abs(k) * 0.04 }); };
  // Finale: Hemiola and her hand raised high, then the last note flung forward
  ACT.asFinale = (b, t, th, d) => stage(b, { armR: [-2.7, 0, -0.25], armL: [-2.5, 0, 0.4], torso: [-0.25, 0, 0], head: [-0.35, 0, 0], lift: 0.12 }, { armR: [-1.5, -0.2, 0], armL: [-1.75, 0, 0.2], torso: [0.25, 0, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0], hipsY: -0.08 }, t, th, d);
  // Lunar Eclipse Melody: a gliding twirl; Umbrella Waltz: a waltz spin, Hemiola out like an open umbrella
  ACT.asGlide = (b, t, th, d) => add(stage(b, { torso: [0.35, 0, 0], armR: [-1.2, 0, -0.5], armL: [0.3, 0, 0.9], legL: [-0.7, 0, 0], legR: [0.5, 0, 0] }, { armR: [-1.6, -0.4, 0.6], armL: [-0.4, 0, 1.2], torso: [0.1, -0.5, 0] }, t, th, d), { spin: clamp((t - th * 0.3) / (th * 0.8), 0, 1) * PI * 2 });
  ACT.asWaltz = (b, t, th) => { const k = clamp(t / (th + 0.1), 0, 1); return add(b, { spin: k * PI * 3, armR: [-1.5, 0, -1.3], armL: [-0.7, 0, 1.4], legR: [-0.3, 0, -0.1], lift: Math.sin(k * PI) * 0.18, hipsY: -0.04 }); };
  // Windchimes & Oaths: she darts away (leaning back, arms trailing), then sings; held, she gathers the charge
  ACT.asWind = (b, t, th, d) => t < 0.28 ? add(b, { torso: [-0.3, 0, 0], armL: [0.6, 0, 0.7], armR: [-0.2, 0, -0.6], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], lift: Math.sin(t / 0.28 * PI) * 0.12 }) : ACT.asSing(b, t - 0.28, Math.max(0.05, th - 0.28), d - 0.28);
  ACT.asWindCharge = (b, t, th, d) => t < th + 0.12 ? ACT.asWind(b, t, th, d) : add(ACT.asCharge(b, t), { armL: [-0.6, 0.6, 0.4], head: [-0.2, 0, 0] });
  // Tipsy Concerto: she sings to the target, Hemiola raised, then throws the blast
  ACT.asConcert = (b, t, th, d) => t < 0.95 ? add(b, { armR: [-1.0, 0.2, -0.2], armL: [-1.2 + Math.sin(t * 14) * 0.35, 0, 0.9], head: [-0.3, 0, Math.sin(t * 5) * 0.08], torso: [-0.12, 0.15, 0] })
    : stage(b, { armL: [-2.4, 0, 0.6], torso: [-0.2, 0, 0] }, { armL: [-1.7, 0, 0.1], armR: [-1.3, 0, -0.1], torso: [0.2, 0, 0], hipsY: -0.06 }, t - 0.95, 0.1, d - 0.95);
  // Fantasian Sonata: lifted on her song, arms wide; the blast as she brings them in
  ACT.asSonata = (b, t, th, d) => t < 1.6 ? add(b, { armL: [-2.2, 0, 1.0], armR: [-1.0, 0.3, -0.3], head: [-0.4, 0, Math.sin(t * 3) * 0.08], torso: [-0.2, 0, 0], lift: Math.min(1, t * 1.6) * 0.5 + Math.sin(t * 3.4) * 0.05, spin: Math.sin(t * 1.5) * 0.25 })
    : stage(b, { armL: [-2.6, 0, 0.8], lift: 0.5 }, { armL: [-1.6, 0, 0.1], armR: [-1.5, 0, -0.1], torso: [0.25, 0, 0], lift: 0.1, hipsY: -0.06 }, t - 1.6, 0.15, d - 1.6);
  // Three Lifetimes of Fate: Hemiola levelled in both hands, the beam
  ACT.asBeamPose = (b, t, th) => add(b, { armR: [-1.55, 0.25, -0.05], armL: [-1.45, -0.35, 0.25], torso: [0.12, 0.25, 0], legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1], hipsY: -0.08, roll: t > th ? Math.sin(t * 40) * 0.01 : 0 });

  /* ------------------------------------------------------------- effects --
     From the official Agent Mechanics clips: a Tremolo is a violet-pink
     pillar of light on the target with gold sparks (asTrem; from Hemiola's
     microphone). Idyllic Cadenza begins with a red pillar and red stage-light
     lines across the floor (asStage). The Ultimate's stage of pink, violet
     and blue light with gold four-point stars (asSpot). asBlast: the sound
     wave of her 3rd hit; asLance: the Follow-Up's beam; asPull: the charge
     drawing the air (and enemies) in. */
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const _p = new THREE.Vector3();
  const mic = a => { BT.sock(a, 'weapon', _p); if (_p.y < 0.4) _p.y = 1.6; return _p.clone(); };
  const aimAt = (a, A, tgt, far) => tgt ? { x: tgt.x, z: tgt.z } : { x: a.x + Math.sin(A.dir) * (far || 5), z: a.z + Math.cos(A.dir) * (far || 5) };
  function stars(x, y, z, r, n) {
    for (let i = 0; i < (n || 5); i++) {
      const sx = x + rnd(-r, r) * 0.6, sy = y + rnd(0, 1.5), sz = z + rnd(-r, r) * 0.6, L = rnd(0.25, 0.55);
      FX.beam(V3(sx - L, sy, sz), V3(sx + L, sy, sz), GOLDFX, 0.06, 0.45); FX.beam(V3(sx, sy - L, sz), V3(sx, sy + L, sz), GOLDFX, 0.06, 0.45);
      FX.glow(sx, sy, sz, 0.6, 0xfff4c0, 0.45, { size1: 0.9 });
    }
  }
  // a Tremolo from Hemiola to (p.x, p.z)
  function tremFx(a, p, big) {
    const k = big ? 1.5 : 1, m = mic(a);
    FX.beam(m, V3(p.x, 1.0, p.z), ROSE, 0.09 * k, 0.18); FX.glow(m.x, m.y, m.z, 0.9 * k, ROSE, 0.15, { size1: 1.5 * k });
    FX.pillar(p.x, p.z, 0.4 * k, 4.5 * k, LILAC, 0.35);
    FX.beam(V3(p.x, 5 * k, p.z), V3(p.x, 0.1, p.z), 0xffb8e8, 0.1 * k, 0.25);
    FX.glow(p.x, 1.1, p.z, 1.5 * k, ETHER, 0.25, { size1: 2.6 * k }); FX.ring(p.x, p.z, 0.3, 1.4 * k, ROSE, 0.3);
    FX.burst(p.x, 1.0, p.z, Math.round(14 * k), { col: [GOLDFX, WHITEFX, ROSE, ETHER], speed: 5 * k, size: 0.1, size1: 0.03, life: 0.45, g: 1 });
    if (big && BT.B) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.12);
  }
  // a Chord's Tremolo or Tone Cluster (smaller: three of them come in a row)
  function noteFx(a, v, tr) {
    if (tr) { tremFx(a, v, true); SFX.play('ether'); return; }
    const m = mic(a); FX.beam(m, V3(v.x, 1.1, v.z), LILAC, 0.06, 0.14);
    FX.glow(v.x, 1.2, v.z, 1.0, LILAC, 0.2, { size1: 1.6 }); FX.named('notes', { x: v.x, z: v.z, attr: 'ether' });
  }
  function stageFx(a) {
    FX.pillar(a.x, a.z, 0.5, 6, STAGE, 0.6); FX.beam(V3(a.x, 7, a.z), V3(a.x, 0.1, a.z), ROSE, 0.1, 0.5);
    for (const s of [-1, 1]) for (const dy of [0.25, 1.0]) { const d = a.face + PI / 2 * s; FX.beam(V3(a.x, dy, a.z), V3(a.x + Math.sin(d) * 5.5, dy, a.z + Math.cos(d) * 5.5), STAGE, 0.07, 0.6); }
    FX.ring(a.x, a.z, 0.5, 3.4, GOLDFX, 0.6, { y: 0.06 }); FX.ring(a.x, a.z, 0.3, 2.4, ROSE, 0.5, { y: 0.08 });
    SFX.play('ether');
  }
  const E = CHOREO.events;
  E.asTrem = (a, A, e, tgt) => tremFx(a, aimAt(a, A, tgt, e.far), e.big);
  E.asStage = a => stageFx(a);
  E.asBlast = (a, A, e) => {
    const B = BT.B, r = e.r || 2.6, x = a.x + Math.sin(A.dir) * 1.3, z = a.z + Math.cos(A.dir) * 1.3;
    FX.named('sound', { x, z, r }); FX.ring(x, z, 0.4, r, ROSE, 0.4); FX.ring(x, z, 0.3, r * 0.7, LILAC, 0.35, { y: 0.9 });
    FX.burst(x, 1, z, e.big ? 36 : 20, { col: NOTES, speed: e.big ? 7 : 5, size: 0.12, size1: 0.03, life: 0.5, g: 1 });
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.3 : 0.15); SFX.play(e.big ? 'boom' : 'ether');
  };
  E.asSpot = (a, A, e, tgt) => {
    const B = BT.B, p = aimAt(a, A, tgt), r = e.r || 3;
    FX.pillar(p.x, p.z, r * 0.35, 8, ETHER, 0.6); FX.pillar(p.x, p.z, r * 0.2, 9, WHITEFX, 0.4);
    [ROSE, LILAC, 0x7ab8ff, GOLDFX].forEach((c, i) => FX.ring(p.x, p.z, 0.4, r * (0.6 + i * 0.22), c, 0.5 + i * 0.1, { y: 0.06 + i * 0.02 }));
    FX.burst(p.x, 1.2, p.z, 50, { col: [GOLDFX, WHITEFX, ROSE, ETHER, LILAC], speed: 8, size: 0.16, size1: 0.04, life: 0.7, g: 1, up: 2 });
    stars(p.x, 1.6, p.z, r, e.big ? 7 : 4);
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.45 : 0.25); SFX.play('boom');
  };
  E.asSong = (a, A, e) => { FX.named('notes', { x: a.x, z: a.z, attr: 'ether' }); FX.named('sound', { x: a.x, z: a.z, r: e.r || 3 }); if (e.stars) stars(a.x, 2, a.z, 2.5, 4); };
  E.asLance = (a, A, e) => {
    const L = 9, y = 1.25, p0 = V3(a.x + Math.sin(A.dir) * 0.7, y, a.z + Math.cos(A.dir) * 0.7), p1 = V3(a.x + Math.sin(A.dir) * L, y, a.z + Math.cos(A.dir) * L), k = e.big ? 1.6 : 1;
    FX.beam(p0, p1, ETHER, 0.32 * k, 0.3); FX.beam(p0, p1, WHITEFX, 0.12 * k, 0.24); FX.glow(p0.x, y, p0.z, 1.4 * k, ROSE, 0.25);
    for (let i = 0; i < 16 * k; i++) { const d = rnd(0.5, L); FX.p({ x: a.x + Math.sin(A.dir) * d, y: y + rnd(-0.3, 0.3), z: a.z + Math.cos(A.dir) * d, vy: rnd(0.3, 1.2), life: 0.5, size: 0.12, size1: 0.03, col: U.pick(NOTES) }); }
    if (e.big) { BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.3); SFX.play('boom'); }
  };
  CHOREO.streams.asPull = (a, A) => {
    const cx = a.x + Math.sin(A.dir) * 2.2, cz = a.z + Math.cos(A.dir) * 2.2;
    for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(2, 4); FX.p({ x: cx + Math.cos(an) * r, y: rnd(0.3, 1.8), z: cz + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.5, vz: -Math.sin(an) * r * 2.5, life: 0.4, size: 0.12, size1: 0.03, col: U.pick(NOTES) }); }
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const AFTER = 0xff8ad0;
  const tremEv = def => def.hits.map(h => ({ t: h.t, fx: 'asTrem', big: !!h.heavy }));
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.4 }], events: [{ t: 0.16, fx: 'crescent', y: 1.0, tilt: -0.3, r: 2.2, arc: 2.2, col: ROSE }] });
  set(K.basic[1], { motion: [{ t0: 0.04, t1: 0.22, kind: 'fwd', d: 0.35 }], events: [{ t: 0.22, fx: 'crescent', y: 0.9, tilt: 0.1, r: 2.4, arc: 3.6, col: LILAC, sweep: 2.0 }] });
  set(K.basic[2], { events: [{ t: 0.3, fx: 'asBlast', r: 2.6 }] });
  set(K.capCharge, { stream: [{ t0: 0, t1: 1.4, kind: 'asPull' }] });
  set(K.capMax, { events: [{ t: 0.2, fx: 'asBlast', r: 3.6, big: true }, { t: 0.2, fx: 'whiteFlash' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.6 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFTER }], events: [{ t: 0.26, fx: 'crescent', y: 0.9, tilt: 0, r: 2.2, arc: 5.6, col: ROSE, sweep: 2.8 }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.12, t1: 0.26, kind: 'toTarget', gap: 1.4 }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.32, fx: 'crescent', y: 1.0, tilt: 0, r: 2.6, arc: 6.2, col: LILAC, sweep: 3.0 }, { t: 0.32, fx: 'asBlast', r: 2.8 }] });
  for (const d of [K.special, K.spCharge]) set(d, { motion: [{ t0: 0, t1: 0.26, kind: 'back', d: 2.6 }], stream: [{ t0: 0, t1: 0.26, kind: 'afterimage', col: AFTER }].concat(d === K.spCharge ? [{ t0: 0.45, t1: d.dur, kind: 'asPull' }] : []),
    events: [{ t: 0.42, fx: 'asTrem' }, { t: 0.42, fx: 'asStage' }] });
  for (let n = 1; n <= 4; n++) set(K['spRel' + n], { events: tremEv(K['spRel' + n]) });
  for (const d of K.interlude) set(d, { events: tremEv(d) });
  set(K.chorus, { events: tremEv(K.chorus).concat([{ t: 0.05, fx: 'asSong', r: 2.4 }]) });
  set(K.finale, { events: [{ t: 0.3, fx: 'asTrem', big: true }, { t: 0.3, fx: 'asSong', r: 3, stars: true }] });
  set(K.ex, { events: [{ t: 0.2, fx: 'asTrem', big: true }] });
  set(K.clus, { events: [{ t: 0.15, fx: 'asTrem' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.0 }], events: [{ t: 0.1, fx: 'asSong', r: 3, stars: true }, { t: 0.4, fx: 'asTrem' }, { t: 0.58, fx: 'asTrem' }, { t: 0.76, fx: 'asTrem' }, { t: 1.05, fx: 'asSpot', r: 3.4 }, { t: 1.05, fx: 'whiteFlash' }, { t: 1.3, fx: 'asStage' }] });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.2 }], events: [{ t: 0.2, fx: 'asSong', r: 4, stars: true }, { t: 0.6, fx: 'asTrem' }, { t: 0.85, fx: 'asTrem' }, { t: 1.1, fx: 'asTrem' }, { t: 1.35, fx: 'asTrem' },
    { t: 1.5, fx: 'asSong', r: 5, stars: true }, { t: 1.75, fx: 'asSpot', r: 4.6, big: true }, { t: 1.75, fx: 'whiteFlash' }, { t: 2.1, fx: 'asStage' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 0.8 }], events: [{ t: 0.35, fx: 'asLance' }, { t: 0.55, fx: 'asLance' }, { t: 0.8, fx: 'asLance', big: true }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 3.5 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFTER }], events: [{ t: 0.26, fx: 'asTrem', big: true }] });
})();
