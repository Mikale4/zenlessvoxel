/* ============================================================================
   agents/vivian.js -- Vivian Banshee, the newest member of Mockingbird: a
   polite, gothic phantom thief who calls the Proxy "Lord Phaethon". S-Rank,
   Ether, Anomaly, Defensive Assist. Released in Version 1.7.

   (An Agent in her own file: the hooks and helpers she uses are documented
   at the top of agents/zhuyuan.js. Numbers as there: official level-12
   multipliers x0.45 DMG and x0.6 Daze; Anomaly Buildup as datamined /100.)

   Sources: Zenless Zone Zero Wiki (Vivian Banshee, Lore, Fashion, Voice-Overs,
   Dialogue, Energy), Prydwen (skills at Lv 12, Core Passive at Lv 7), Icy Veins
   (profile, and the 1.7.2 beta's Anomaly Buildup: the only values found, used
   as they are), dic.pixiv.net (appearance, skill visuals), colours sampled
   from the official portrait.

   Her kit (official):
     Basic Attack: Feathered Strike  4 hits, parasol and rapier. After the 4th
                                     she is a Noblewoman; with Basic held
                                     through it and Flight Feathers, she rises
                                     into Fluttering Frock instead.
     Basic Attack: Noblewoman - Waltz   (Basic as a Noblewoman) an invulnerable
                                     dash: +1 Flight Feather on hit, +1 more on
                                     a Perfect Dodge; then Fluttering Frock if
                                     she has feathers (Dodge held: not).
     Basic Attack: Fluttering Frock - Suspension   (Basic while she hovers) an
                                     invulnerable plunge on the area ahead that
                                     turns every Flight Feather into a Guard
                                     Feather (up to 5). It fires by itself if
                                     she is switched out while hovering; a
                                     Dodge ends Fluttering Frock.
     Basic Attack: Featherbloom      (automatic) when any squad member's EX
                                     Special hits, she spends a Guard Feather
                                     to strike that target, on or off the field
                                     (once per skill).
     Dash Attack: Silver Thorned Melody   Dodge Counter: Wingblade Reverb
                                     (-> Noblewoman, Basic held: Frock)
     Dodge: Dainty Steps             once each time she becomes a Noblewoman,
                                     she slips one blow on her own (not a
                                     Perfect Dodge).
     Special Attack: Song of Silver Wings (Anti-Interrupt)
     EX Special Attack: Violet Requiem   (60 Energy, +3 Flight Feathers, ->
                                     Fluttering Frock; Dodge held: Noblewoman)
     Chain Attack: Chorus of Celestial Wings (+2) / Ultimate: Soaring Bird's
                                     Song (+5): -> Fluttering Frock
     Quick Assist: Frostwing Guard (-> Noblewoman)
     Defensive Assist: Silver Umbrella Formation
     Assist Follow-Up: Featherblade Execution (+2, -> Fluttering Frock)
     Core Passive: Dirge of Destiny  Abloom: Featherbloom on an enemy with an
                                     Attribute Anomaly also deals a share of
                                     that Anomaly's DMG per 10 Anomaly
                                     Proficiency. Vivian's Prophecy: Suspension
                                     or Featherbloom on such an enemy leaves
                                     Ether DMG (55% ATK) every 0.55 s until its
                                     Anomaly ends. +2 Flight Feathers on entry.
     Additional Ability: Prophetic Tears   with another Anomaly or Ether Agent:
                                     a teammate's Anomaly sets off Featherbloom
                                     (a Guard Feather, once every 0.5 s); the
                                     squad's Corruption and Corruption Disorder
                                     deal +12% DMG.
   Our choices (no source says): hits 1-3 of the string and the first hit of
   the Dodge Counter, Special and Quick Assist are Physical, the rest Ether
   (the Anomaly Buildup is all on the Ether hits); how her multi-part skills
   split their multipliers; Flight Feathers also cap at 5 (Prydwen); a
   Noblewoman left alone settles after 3 s; the Chain Attack's look (not
   described anywhere); the parasol open in her two stances.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const sh = (x, k) => Math.round(x * k * 100) / 100;  // a share of a skill's Anomaly Buildup
  const VIOLET = 0xb070ff, LILAC = 0xd8c0ff, ETHER = 0xe45cff, SILVERFX = 0xe8ecf8;
  const PETAL = [0xffffff, LILAC, VIOLET, ETHER, 0xf0c8ff], FEATHER = [0xffffff, 0xf4ecff, LILAC, 0xc8c0e0], JETC = [VIOLET, ETHER, LILAC, 0xffffff];
  const CAP = 5, HOVER = 0.5;                         // feathers of each kind; how high Fluttering Frock holds her (m)

  /* ----------------------------------------------------------------- kit --
     vvTo / vvAt: the stance a move leaves her in, and when (noble: a
     Noblewoman, Basic held: Fluttering Frock; frock: Fluttering Frock, vvNeed:
     only with Flight Feathers, Dodge held: vvDodge or nothing; ground: down
     out of it). vvFlight: Flight Feathers it gives. vvOpen [t0, t1]: the
     parasol open then; vvShut: closed; vvPitch: the parasol's angle in the
     hand (a number, or [time, angle] steps). */
  const K = {
    basic: [
      { name: 'Basic Attack: Feathered Strike', anim: 'vvThrust', dur: 0.44, cancel: 0.32, reach: 2.2, range: 1.8, hits: [hit(0.15, 68.2, 64.4, 0, { attr: 'physical', shape: 'line', r: 0.8, len: 2.6 })] },
      { name: 'Basic Attack: Feathered Strike', anim: 'vvRapier', dur: 0.42, cancel: 0.3, reach: 1.9, range: 1.6, hits: [hit(0.14, 48.4, 42.4, 0, { attr: 'physical', shape: 'arc', r: 2.0, arc: 140 })] },
      { name: 'Basic Attack: Feathered Strike', anim: 'vvCross', dur: 0.62, cancel: 0.48, reach: 2.2, range: 1.8,
        hits: [hit(0.16, 153.9 * 0.4, 123.6 * 0.4, 0, { attr: 'physical', shape: 'arc', r: 2.0, arc: 150 }), hit(0.4, 153.9 * 0.6, 123.6 * 0.6, 0, { attr: 'physical', shape: 'line', r: 0.9, len: 2.8 })] },
      { name: 'Basic Attack: Feathered Strike', anim: 'vvSweep', dur: 0.78, cancel: 0.6, reach: 2.2, range: 1.8, vvTo: 'noble', vvAt: 0.32, hits: [hit(0.3, 257.1, 191.0, 50.12, { heavy: true, shape: 'circle', at: 'self', r: 2.4, kb: 0.8 })] },
    ],
    // her stances' Basic Attacks (mech.resolve gives them to Basic)
    waltz: { name: 'Basic Attack: Noblewoman - Waltz', anim: 'vvWaltz', dur: 0.55, cancel: 0.45, reach: 4.5, range: 2.0, inv: [0, 0.5], vvTo: 'frock', vvNeed: true, vvAt: 0.38, vvPitch: -0.85,
      hits: [hit(0.2, 96.2, 55.9, 57.37, { shape: 'arc', r: 2.2, arc: 170 })] },
    suspension: { name: 'Basic Attack: Fluttering Frock - Suspension', anim: 'vvPlunge', dur: 0.75, cancel: 0.58, reach: 3.4, range: 2.0, inv: [0, 0.7], vvTo: 'ground', vvAt: 0.36, vvShut: true, vvPitch: [[0, 0.3], [0.28, 0.85]],
      hits: [hit(0.36, 160.5, 94.3, 84.98, { shape: 'circle', at: 'front', r: 2.6, kb: 0.6 })] },
    // what she does on her own, on the field or off it (data for mech; never started as moves)
    featherbloom: { name: 'Basic Attack: Featherbloom', hits: [hit(0, 440, 0, 102, { kb: 0.3 })] },
    prophecy: { name: 'Core Passive: Vivian\'s Prophecy', hits: [hit(0, 55, 0, 0, { kb: 0.01 })] },
    dash: { name: 'Dash Attack: Silver Thorned Melody', anim: 'vvThrust', dur: 0.5, cancel: 0.38, reach: 7, hits: [hit(0.26, 100.2, 38.0, 0, { attr: 'physical', shape: 'line', r: 0.9, len: 3 })] },
    counter: { name: 'Dodge Counter: Wingblade Reverb', anim: 'vvCross', dur: 0.7, cancel: 0.52, inv: [0, 0.6], vvTo: 'noble', vvAt: 0.42,
      hits: [hit(0.16, 472.9 * 0.4, 311.8 * 0.4, 0, { attr: 'physical', shape: 'arc', r: 2.4, arc: 170 }), hit(0.4, 472.9 * 0.6, 311.8 * 0.6, 53.86, { heavy: true, shape: 'line', r: 1.1, len: 3.4, kb: 0.9 })] },
    special: { name: 'Special Attack: Song of Silver Wings', anim: 'vvSpecial', dur: 0.66, cancel: 0.5, reach: 2.4, range: 1.8, cd: 1.5, dr: 0.4,
      hits: [hit(0.14, 114.1 * 0.4, 85.5 * 0.4, 0, { attr: 'physical', shape: 'arc', r: 2.4, arc: 160 }), hit(0.4, 114.1 * 0.6, 85.5 * 0.6, 49.58, { shape: 'line', r: 0.9, len: 3 })] },
    // Violet Requiem: a sweep, the parasol opens, she charges with it held out like a shield, and finishes
    ex: { name: 'EX Special Attack: Violet Requiem', anim: 'vvEx', dur: 1.15, cancel: 1.0, cost: 60, reach: 3.0, range: 2.2, inv: [0, 1.05], vvFlight: 3, vvTo: 'frock', vvDodge: 'noble', vvAt: 0.95, vvOpen: [0.28, 9], vvPitch: 0.65,
      hits: [hit(0.2, 1185.5 * 0.15, 727.9 * 0.15, sh(416.25, 0.15), { shape: 'arc', r: 2.6, arc: 170 }), hit(0.32, 1185.5 * 0.15, 727.9 * 0.15, sh(416.25, 0.15), { shape: 'arc', r: 2.6, arc: 170 }),
        hit(0.62, 1185.5 * 0.2, 727.9 * 0.2, sh(416.25, 0.2), { shape: 'line', r: 1.2, len: 3.6 }), hit(0.88, 1185.5 * 0.5, 727.9 * 0.5, sh(416.25, 0.5), { heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.1 })] },
    chain: { name: 'Chain Attack: Chorus of Celestial Wings', anim: 'vvChain', dur: 1.4, inv: [0, 1.4], vvFlight: 2, vvTo: 'frock', vvAt: 1.25, vvOpen: [0, 0.8], vvPitch: [[0, -0.47], [0.8, 0.85]],
      hits: [hit(0.45, 1317.8 * 0.2, 330 * 0.2, sh(294.21, 0.2), { shape: 'circle', at: 'target', r: 3.4 }), hit(0.7, 1317.8 * 0.2, 330 * 0.2, sh(294.21, 0.2), { shape: 'circle', at: 'target', r: 3.4 }),
        hit(1.05, 1317.8 * 0.6, 330 * 0.6, sh(294.21, 0.6), { heavy: true, shape: 'circle', at: 'target', r: 3.8, kb: 1.2 })] },
    ult: { name: 'Ultimate: Soaring Bird\'s Song', anim: 'vvUlt', dur: 2.2, inv: [0, 2.2], track: 1.6, vvFlight: 5, vvTo: 'frock', vvAt: 2.0, vvOpen: [0, 1.1], vvPitch: [[0, -0.55], [1.1, 0.85]],
      hits: [0.35, 0.55, 0.75, 0.95].map(t => hit(t, 3374.2 * 0.1, 374.8 * 0.1, sh(834.66, 0.1), { shape: 'circle', at: 'target', r: 3.2 })).concat([hit(1.6, 3374.2 * 0.6, 374.8 * 0.6, sh(834.66, 0.6), { heavy: true, shape: 'circle', at: 'target', r: 4.6, kb: 1.6 })]) },
    // Silver Umbrella Formation: she meets the blow with the parasol opened in front of her (light parry 407.7; heavy is the game's x1.2)
    assist: { name: 'Defensive Assist: Silver Umbrella Formation', type: 'defensive', anim: 'vvParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7), vvOpen: [0, 9], vvPitch: 0.6 },
    followup: { name: 'Assist Follow-Up: Featherblade Execution', anim: 'vvFollow', dur: 1.0, inv: [0, 0.95], vvFlight: 2, vvTo: 'frock', vvAt: 0.85,
      hits: [hit(0.25, 747.9 * 0.4, 488.1 * 0.4, sh(231.81, 0.4), { shape: 'line', r: 1.0, len: 3.2 }), hit(0.6, 747.9 * 0.6, 488.1 * 0.6, sh(231.81, 0.6), { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Frostwing Guard', anim: 'vvCross', dur: 0.65, inv: [0, 0.6], vvTo: 'noble', vvAt: 0.42,
      hits: [hit(0.16, 195.2 * 0.4, 74.0 * 0.4, 0, { attr: 'physical', shape: 'arc', r: 2.4, arc: 160 }), hit(0.4, 195.2 * 0.6, 74.0 * 0.6, 26.93, { shape: 'line', r: 1.0, len: 3.2, kb: 0.6 })] },
  };

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.vivian = {
    id: 'vivian', name: 'Vivian Banshee', short: 'Vivian', faction: 'Mockingbird', spec: 'Anomaly', attr: 'ether', rank: 'S',
    color: '#9d91ba', color2: '#a72f36', assist: 'defensive', stance: 'vivian',
    blurb: 'The newest member of Mockingbird: a polite, very gothic phantom thief whose dark-purple parasol, Flight of Ceremony, is a lance with a rapier hidden in its handle and jets that let her hover. Her Flight Feathers become Guard Feathers, and whenever anyone in the squad lands an EX Special she drops one on the target as Featherbloom, blooming into whatever Anomaly it already carries.',
    stats: { hp: 8590, atk: 2900, def: 648, impact: 86, ap: 330, am: 144, cr: 0.1, cd: 0.7, er: 1.2, speed: 4.7 },
    ai: { range: 1.8, dodge: 0.8, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'feathers',
    core: [
      ['Core Passive: Dirge of Destiny', 'When Featherbloom hits an enemy suffering an Attribute Anomaly it triggers Abloom: extra DMG of that Anomaly, a share of one instance of it for every 10 Anomaly Proficiency (Fire 8%, Ether 6.15%, Electric 3.2%, Ice 1.08%, Physical 0.75%). Suspension or Featherbloom on such an enemy also leaves Vivian\'s Prophecy: Ether DMG equal to 55% of her ATK every 0.55 s, until its Anomaly ends. She enters battle with 2 Flight Feathers.'],
      ['Flight and Guard Feathers', 'Waltz (1, and 1 more on a Perfect Dodge), her EX (3), Chain Attack (2), Assist Follow-Up (2) and Ultimate (5) give Flight Feathers (up to 5). Suspension turns every one into a Guard Feather (up to 5). Whenever a squad member\'s EX Special hits, she spends a Guard Feather on Featherbloom against that target (once per skill), on or off the field.'],
      ['Noblewoman and Fluttering Frock', 'After her 4th Basic hit, Dodge Counter or Quick Assist she is a Noblewoman: Basic is Waltz, and once she slips a blow on her own (Dainty Steps). Basic held through them (with Flight Feathers), Waltz, her EX, Chain Attack, Ultimate and Assist Follow-Up lift her into Fluttering Frock: she hovers, and Basic is Suspension. Switched out while hovering, she lets Suspension go on her way out; a Dodge ends either stance.'],
      ['Additional Ability: Prophetic Tears', 'With another Anomaly or Ether Agent in the squad: when a teammate applies an Attribute Anomaly, she spends a Guard Feather on Featherbloom (once every 0.5 s), and the squad\'s Corruption and Corruption Disorder deal 12% more DMG.'],
    ],
    kit: K,
    kitShow: [['Basic', 'waltz'], ['Basic', 'suspension'], ['Auto', 'featherbloom']],
    rivalMoves: [{ k: 'waltz', kind: 'core', p: 0.2, cd: 4 }, { k: 'suspension', kind: 'core', p: 0.15, cd: 6 }],
    howto: 'Vivian: after her 4th Basic hit, Dodge Counter or Quick Assist she is a Noblewoman (Basic: Waltz, a dash worth a Flight Feather; she slips one blow on her own). Basic held through them, or her EX, Chain, Ultimate and Follow-Up, lift her into Fluttering Frock: Basic is then Suspension, which turns her Flight Feathers into Guard Feathers. Whenever anyone\'s EX Special hits, she spends one on Featherbloom, even from the bench; on an Anomaly it blooms (Abloom) and leaves her Prophecy. Her assist is a Defensive Assist: a parry, then Basic follows up.',
    mech: {
      init(a) { Object.assign(a, { vvFlight: 2, vvGuard: 0, vvNoble: false, vvFrock: false, vvDainty: true, vvNobleT: 0, vvQ: [], vvLift: 0, vvSpin: 0, vvLast: null, vvRigOpen: false, vvTears: false, vvTearsT: 0, vvCallT: 0 }); },
      squad(a, B) { a.vvTears = B.squad.some(s => s !== a && (s.def.spec === 'Anomaly' || s.def.attr === 'ether' || s.flux === 'ether')); },
      start(a, def, A) {
        if (def.vvFlight) addFlight(a, def.vvFlight);
        if (def.vvTo === 'noble') A.data.vvPick = Math.random() < 0.55;   // AUTO "holds Basic" through it about half the time
      },
      hit(a, v, h, A) {
        if ((A.kind === 'ex' || A.kind === 'ex2') && !A.data.vvBloom) { A.data.vvBloom = true; callBloom(a, v); }   // her own EX: Featherbloom too
        if (A.def === K.waltz && !A.data.vvFeather) { A.data.vvFeather = true; addFlight(a, 1); }
        if (A.def === K.suspension && v.anom) prophecy(a, v);
      },
      // a teammate's EX Special lands: Featherbloom on that target (once per skill), on the field or off it
      allyHit(a, src, v, h, A) {
        if (!A || !A.data || (A.kind !== 'ex' && A.kind !== 'ex2') || A.data.vvBloom) return;
        A.data.vvBloom = true; callBloom(a, v);
      },
      // Prophetic Tears: a teammate's Anomaly sets off Featherbloom (once every 0.5 s)
      anomaly(a, src, v) {
        const B = BT.B;
        if (!a.vvTears || src === a || !v.alive || B.t < a.vvTearsT) return;
        if (callBloom(a, v)) a.vvTearsT = B.t + 0.5;
      },
      // Dainty Steps: once each time she becomes a Noblewoman, she slips a blow on her own
      incoming(a, e) {
        if (!a.vvNoble || a.vvDainty) return false;
        a.vvDainty = true;
        const d = e && e.x != null ? U.ang(e, a) : a.face + PI, s = Math.random() < 0.5 ? 1 : -1;
        a.vx += Math.sin(d + s * 1.2) * 5; a.vz += Math.cos(d + s * 1.2) * 5;
        FX.glow(a.x, 1.0 + a.airY, a.z, 1.5, LILAC, 0.25, { size1: 1.4, a: 0.6 }); FX.burst(a.x, 0.3, a.z, 10, { col: PETAL, speed: 2.5, size: 0.1, life: 0.4, g: 0.5 });
        if (BT.T.dmgNumbers) FX.number(a.x, a.height, a.z, 'MISS', 'miss');
        BT.callout('DAINTY STEPS', 'perfect', 'Vivian'); SFX.play('dodge');
        return true;
      },
      // switched out while hovering: Suspension goes off on her way out
      swap(a, isIn) {
        if (isIn) return;
        if (a.vvFrock && a.alive) suspendOff(a);
        a.vvNoble = a.vvFrock = false; a.vvLift = 0; a.stance = 'vivian'; a.vvLast = null; look(a, false);
      },
      tick(a, dt) {
        const B = BT.B, A = a.act;
        // the Featherblooms on their way, and Prophecy on every target that keeps its Anomaly
        for (let i = a.vvQ.length - 1; i >= 0; i--) if (B.t >= a.vvQ[i].t) featherbloom(a, a.vvQ.splice(i, 1)[0].v);
        for (const v of B.enemies) {
          const P = v.vvProph; if (!P || P.src !== a) continue;
          if (!v.alive || !v.anom) { v.vvProph = null; continue; }
          if (B.t >= P.next) { P.next += 0.55; if (P.next < B.t) P.next = B.t + 0.55; tear(a, v); }
        }
        // a new move ends either stance (Waltz keeps her a Noblewoman and Suspension keeps her aloft until they land)
        if (A !== a.vvLast) {
          a.vvLast = A;
          if (A) { if (A.def !== K.waltz) a.vvNoble = false; if (A.def !== K.suspension) a.vvFrock = false; if (A.def === K.waltz) A.data.vvInv0 = B.eh.inv; }
        }
        if (A && A.def.vvTo && !A.data.vvSet && A.t >= A.def.vvAt) { A.data.vvSet = true; land(a, A); }
        // a blow passes through her invulnerable Waltz: a Perfect Dodge, and another Flight Feather
        if (A && A.def === K.waltz && A.data.vvInv0 != null && !A.data.vvPD && B.eh.inv > A.data.vvInv0) {
          A.data.vvPD = true; addFlight(a, 1); B.stats.perfect++;
          BT.callout('PERFECT DODGE', 'perfect', 'Waltz'); SFX.play('perfect'); B.slow = { s: 0.3, t: 0.3 };
          FX.glow(a.x, 1.1 + a.airY, a.z, 2.2, LILAC, 0.3, { size1: 3.4 });
        }
        // a dodge or a launch ends either stance; a Noblewoman left alone settles after 3 s (our choice)
        if (a.state === 'dodge' || a.state === 'down') a.vvNoble = a.vvFrock = false;
        if (a.vvNoble && !A && B.t - a.vvNobleT > 3) a.vvNoble = false;
        a.stance = a.vvFrock ? 'vvFrock' : a.vvNoble ? 'vvNoble' : 'vivian';
        // Fluttering Frock: the jets under her skirt hold her up
        const aloft = a.vvFrock && a.state !== 'dead';
        a.vvLift += ((aloft ? 1 : 0) - a.vvLift) * (1 - Math.exp(-5 * dt));
        if (aloft && !A) { a.airY = (HOVER + Math.sin(B.t * 2.6) * 0.04) * a.vvLift; if (a.obj.visible && Math.random() < dt * 40) jets(a, 2); }
        // the parasol: open in her stances (and where a move opens it), twirling; its angle in her hand follows the move
        const d = A && A.def, o = d && d.vvOpen;
        const open = a.obj.visible && !(d && d.vvShut) && (o ? A.t >= o[0] && A.t <= o[1] : a.vvNoble || a.vvFrock);
        if (open !== a.vvRigOpen) look(a, open);
        const P = a.rig.parts.parasol, R0 = a.rig.rest.parasol;
        if (P && R0) {
          const pitch = d ? pitchOf(d, A.t) : a.vvFrock ? -0.47 : a.vvNoble ? -0.9 : 0;
          P.rotation.x += (R0.rx + pitch - P.rotation.x) * (1 - Math.exp(-14 * dt));
          a.vvSpin = open ? a.vvSpin + dt * (a.vvNoble ? 7 : 2.5) : 0;
          P.rotation.z = R0.rz + a.vvSpin;
        }
      },
      // Basic as a Noblewoman is Waltz; aloft in Fluttering Frock, Suspension (after a dodge: the Dash Attack, as ever)
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || c.dash) return null;
        if (a.vvFrock) return { def: K.suspension, kind: 'core' };
        if (a.vvNoble) return { def: K.waltz, kind: 'core' };
        return null;
      },
      // AUTO: in either stance Basic at once (Waltz into Fluttering Frock, then Suspension for the Guard Feathers)
      ai(a) { return a.vvFrock || a.vvNoble ? { btn: 'basic' } : null; },
      hud(a, B) {
        const r = [`FLIGHT ${'●'.repeat(a.vvFlight)}${'○'.repeat(CAP - a.vvFlight)}`, `GUARD ${'◆'.repeat(a.vvGuard)}${'◇'.repeat(CAP - a.vvGuard)}`];
        if (a.vvFrock) r.push('FLUTTERING FROCK · BASIC: SUSPENSION');
        else if (a.vvNoble) r.push(`NOBLEWOMAN · BASIC: WALTZ${a.vvDainty ? '' : ' · DAINTY STEPS'}`);
        const n = B.enemies.filter(v => v.alive && v.vvProph && v.vvProph.src === a).length; if (n) r.push(`PROPHECY ×${n}`);
        if (a.vvTears) r.push('PROPHETIC TEARS');
        return r;
      },
    },
    town: {
      routine: ['cafe:t 35, news:read 25, rp:window 40', 'rp:window 30, rp:door 20, box:statue 15, bardic:bench 15, huddle 20', 'soup:stool 25, rp:window 35, alley:lean 20, huddle 20', 'rp:night 45, alley:lean 30, metro:wait 25'],
      chatter: ['Lord Phaethon is on this street. I simply know.', 'Do mind the hem, please. This lace is hand-stitched.'],
      lines: [
        'Good day, Lord Phaethon. I happened to be passing Random Play. For the fourth time this morning. Purely by chance, of course.',
        'Coffee stopped keeping me awake long ago, so I save it for the nights I can\'t sleep anyway. Robin says that is not how coffee works.',
        'Hugo taught me that a lady always knows three ways out of any room. On Sixth Street I only ever look for one way in.',
      ],
      chapters: [
        { title: 'An invitation', ask: ['Lord Phaethon... might I trouble you with a request? A small one. Easily forgotten.', 'I would like to be invited into Random Play. Properly. Would you ask the one at the counter whether I may come in?'],
          steps: [{ t: 'talk', to: 'sib', reply: 'The girl with the parasol? She\'s been at the window since we opened. Tell her to come in before she frightens the customers. ...She can help with the shelves.' }, { t: 'talk', to: 'vivian' }],
          scene: [['P', 'You\'re invited. You can even help with the shelves.'], ['A', 'Invited. Me. Inside. With the shelves.'], ['A', '...Forgive me. I need a moment. I am writing this down.'], ['P', 'In the notebook?'], ['A', 'You know about the notebook? ...Then you know it has room for a great many more pages, Lord Phaethon.']] },
        { title: 'Sleepless', ask: ['Coffee no longer keeps me awake. Now I drink it on the nights I could not sleep anyway.', 'Tonight looks like one of those. Would you bring me a cup from Coff Cafe? I will wait. I am very good at waiting.'],
          steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'vivian' }],
          scene: [['A', 'Thank you. It is warm. You remembered how I take it.'], ['P', 'I just guessed.'], ['A', '...Then it was fate. That is even better.'], ['A', 'Sometimes my tears show me things that have not happened yet. Tonight they showed me nothing at all. Only you, walking over with a cup.'], ['A', 'Perhaps I will sleep after all.']] },
        { title: 'The prophecy', ask: ['I saw it in my tears, Lord Phaethon. Something Notorious, and you at the heart of the Hollow.', 'I will not let it come true. Take me with you, and I will stand between you and whatever I saw.'],
          steps: [{ t: 'clear', f: { enc: 'boss', with: 'vivian' } }, { t: 'talk', to: 'vivian' }],
          scene: [['A', 'It is over. You are unhurt. ...You are unhurt?'], ['P', 'Not a scratch. Your dress, on the other hand.'], ['A', 'The dress can be mended; I sew. And a prophecy, it seems, can be mended too.'], ['A', 'Thank you for letting me change it. For once, what I saw was not the end.']] },
      ],
    },
  };

  /* ---------------------------------------------------- her mechanics -- */
  // Abloom: per 10 Anomaly Proficiency, this % of one instance of the target's Anomaly (Core Passive at Lv 7)
  const ABLOOM = { ether: 6.15, fire: 8, electric: 3.2, ice: 1.08, physical: 0.75, wind: 0.32 };
  const synth = (a, v, kind, def) => ({ kind, def, data: {}, dir: U.ang(a, v), t: 0, tgt: v });   // a hit that is not one of her moves
  function addFlight(a, n) { a.vvFlight = Math.min(CAP, a.vvFlight + n); }
  function convert(a) { if (!a.vvFlight) return; a.vvGuard = Math.min(CAP, a.vvGuard + a.vvFlight); a.vvFlight = 0; }
  // the moment a move leaves her in a stance (vvTo): held buttons choose, as in the real game (AUTO: its own pick)
  function land(a, A) {
    const d = A.def, B = BT.B, me = BT.isPlayer(a);
    if (A.data.vvPick == null) A.data.vvPick = Math.random() < 0.55;
    const basicHeld = me ? BT.btnHeld('basic') : A.data.vvPick, dodgeHeld = me && BT.btnHeld('dodge');
    let to = d.vvTo;
    if (to === 'ground') { convert(a); to = null; }                              // Suspension: every Flight Feather becomes a Guard Feather
    else if (to === 'noble') { if (basicHeld && a.vvFlight > 0) to = 'frock'; }
    else if (to === 'frock') { if (d.vvNeed && a.vvFlight <= 0) to = null; else if (dodgeHeld) to = d.vvDodge || null; }
    a.vvNoble = to === 'noble'; a.vvFrock = to === 'frock';
    if (a.vvNoble) { a.vvNobleT = B.t; a.vvDainty = false; }
  }
  // spend a Guard Feather: it flies to the target and blooms a moment later
  function callBloom(a, v) {
    if (!v || !v.alive || a.vvGuard <= 0) return false;
    a.vvGuard--; a.vvQ.push({ v, t: BT.B.t + 0.15 }); featherFly(a, v, 0.15);
    return true;
  }
  function featherbloom(a, v) {
    if (!v.alive) return;
    bloom(v.x, v.z, 1.9, false); SFX.play('ether');
    BT.applyHit(a, v, K.featherbloom.hits[0], synth(a, v, 'featherbloom', K.featherbloom), 'ether');
    if (v.alive && v.anom) { abloom(a, v); prophecy(a, v); }
  }
  // Abloom: a share of one instance of the target's Anomaly (a Corruption or Shock hit, a Burn tick, an Assault or Freeze burst)
  function abloom(a, v) {
    const An = v.anom && D.ANOMALY[v.anom.type]; if (!An || !v.alive) return;
    const at = An.attr, key = at === 'auric' ? 'ether' : (D.ATTR[at] && D.ATTR[at].as) || at;
    const one = An.onHit || An.tickMult || An.burst || 0;
    const dmg = BT.anomalyDamage(a, v, one * (ABLOOM[key] || 1) / 100 * a.st.ap / 10, at);
    BT.hurtEnemy(v, dmg, { attr: at, src: a, big: true, cls: 'abloom', color: '#c9a2ff' });
    BT.log(`Vivian: Abloom (${An.name}) on ${v.def.name}: ${U.fmt(dmg)}`, 'anomaly');
    if (BT.B.t > a.vvCallT) { a.vvCallT = BT.B.t + 2.5; BT.callout('ABLOOM', 'abloom', v.def.name); }
    bloom(v.x, v.z, 2.6, true); FX.ring(v.x, v.z, 0.3, 3, D.ATTR[at] ? D.ATTR[at].hex : ETHER, 0.4, { y: 0.1 });
  }
  // Vivian's Prophecy: her Ether DMG every 0.55 s for as long as the target keeps its Anomaly (mech.tick)
  function prophecy(a, v) {
    if (!v.alive || !v.anom || (v.vvProph && v.vvProph.src === a)) return;
    v.vvProph = { src: a, next: BT.B.t + 0.55 };
    BT.log(`Vivian's Prophecy falls on ${v.def.name}.`, 'skill');
    FX.ring(v.x, v.z, 0.3, 1.8, VIOLET, 0.4, { y: 0.08 });
  }
  function tear(a, v) {
    FX.p({ x: v.x, y: v.height + 0.9, z: v.z, vy: -7, life: 0.15, size: 0.18, size1: 0.1, col: LILAC });
    FX.glow(v.x, v.height * 0.7, v.z, 1.0, VIOLET, 0.16);
    BT.applyHit(a, v, K.prophecy.hits[0], synth(a, v, 'prophecy', K.prophecy), 'ether');   // (a hit: Corruption and Shock answer it)
  }
  // switched out in Fluttering Frock: Suspension on the area ahead of where she was
  function suspendOff(a) {
    const h = K.suspension.hits[0], dir = a.face, x = a.x + Math.sin(dir) * 1.3, z = a.z + Math.cos(dir) * 1.3;
    convert(a); bloom(x, z, h.r, false);
    const A = { kind: 'core', def: K.suspension, data: {}, dir, t: 0 };
    for (const v of BT.enemiesIn('circle', x, z, h.r, 0)) BT.applyHit(a, v, h, A, 'ether');
    BT.log(`Vivian: ${K.suspension.name}, on her way out.`, 'skill');
  }
  function pitchOf(d, t) { const p = d.vvPitch; if (p == null) return 0; if (typeof p === 'number') return p; let v = p[0][1]; for (const [ts, pv] of p) if (t >= ts) v = pv; return v; }
  // her look with the parasol open (MODELS.vivianOpen) or closed: the part angles carry over, so nothing jumps
  function look(a, open) {
    if (!!a.vvRigOpen === open || !window.CHOREO) return;
    const old = a.rig;
    CHOREO.swapRig(a, open ? 'vivianOpen' : null);
    a.vvRigOpen = open;
    if (a.rig !== old) for (const n in a.rig.parts) { const p = old.parts[n], q = a.rig.parts[n]; if (p) { q.rotation.copy(p.rotation); q.position.copy(p.position); } }
  }
  /* Prophetic Tears: +12% DMG for the squad's Corruption and Corruption Disorder. battle.js reads these numbers
     off D.ANOMALY.corruption each time a Corruption deals DMG (its on-hit DMG; the Disorder that overrides it),
     so while her squad has the Additional Ability they read 12% higher (set: still assignable) */
  {
    const C = D.ANOMALY.corruption, up = () => (window.BT && BT.B && BT.B.squad.some(s => s.vvTears) ? 1.12 : 1);
    for (const k of ['onHit', 'disorderBase', 'disorderPerSec']) {
      let base = C[k];
      Object.defineProperty(C, k, { enumerable: true, configurable: true, get: () => base * up(), set: v => { base = v; } });
    }
  }

  /* --------------------------------------------------------------- model --
     From the report's description of the official art: pale-purple hair in
     two big drill ringlets that hang to her waist, side-swept bangs, the rest
     falling down her back under a half-up braid tied with a black ribbon; a
     black lace headdress with a white pleated trim and a black bow; crimson
     eyes, pointed ears, pale skin. A gothic black-and-white dress: a laced
     black corset and bodice over a white blouse with a frilled jabot and a
     purple ribbon at the high collar; black puffed sleeves with white frills
     and lace cuffs; black nail polish; an A-line black overskirt open at the
     sides onto a white petticoat, the back of the dress open; four jet
     nozzles under the skirt. Patterned black stockings, thick-soled heeled
     pumps. Flight of Ceremony: a lance-long parasol of dark-purple silk and
     black leather (the official text; one source says periwinkle), silver
     bows at its edges, a mithril spike at the tip, the black leather grip a
     rapier's hilt. Open (MODELS.vivianOpen, in her stances): a ring of
     embroidered birds, silver bows at the rib tips, jets under the rim.
     162 cm. */
  {
    const SKIN = 0xf2e4e4, EYE = 0xa72f36, EYE2 = 0x6a1a22, LASH = 0x2a1a2a, MOUTH = 0xd08a90;
    const HAIR = 0xc0b9e5, HAIRHI = 0xc6cbed, HAIR2 = 0x9d9cc9, HAIR3 = 0x7b75a5, HAIR4 = 0x545279;
    const WHITE = 0xfdfdfd, WHITE2 = 0xdedbe8, BLACK = 0x0e0e18, BLACK2 = 0x232737, NAVY = 0x28273a, PURPLE = 0x503671, PURPLE2 = 0x6c4a96;
    const STOCK = 0x15141e, LACE = 0x3a3552, SHOE = 0x101016, SOLE = 0x2a2238, NAIL = 0x101014;
    const SILK = 0x3c2a5a, SILK2 = 0x4a3570, LEATHER = 0x18141f, LEATHER2 = 0x231c2c, BIRD = 0xa99cc8, SILVER = 0xc9ccd8, MITHRIL = 0xe4ecf6, SHAFT = 0x1c1a24, JET = G(0xb070ff);
    const gore = (x, y) => (Math.floor((Math.atan2(y, x) + PI) / (PI / 4)) & 1) === 1;   // eight panels: silk, leather, silk...
    // a drill ringlet: rings that widen, then taper to a point, striped in a spiral of light and shadow
    const drill = s => g => {
      for (let i = 0; i <= 11; i++) {
        const r = i < 2 ? 1.0 + i * 0.35 : i < 7 ? 1.7 : 1.7 - (i - 6) * 0.26;
        g.ell(0, -i, 0, r, 0.5, r, (x, y, z) => { const k = ((Math.atan2(z, x * s) / (2 * PI) + y * 0.17) % 1 + 1) % 1; return k < 0.22 ? HAIRHI : k < 0.5 ? HAIR : k < 0.78 ? HAIR2 : HAIR3; });
      }
    };
    // Flight of Ceremony along +Z from her fist: grip and pommel behind, the shaft, the canopy, the spike
    const parasol = open => g => {
      g.box(0, 0, -4, 0, 0, -1, LEATHER); g.set(0, 0, -5, SILVER); g.set(0, 1, -5, SILVER); g.set(0, -1, -5, SILVER);   // the leather grip and silver pommel: the rapier's hilt
      g.set(0, 0, 0, SILVER); g.set(1, 0, 0, SILVER); g.set(-1, 0, 0, SILVER);                                       // its guard
      for (let z = 1; z <= 16; z++) g.set(0, 0, z, SHAFT);
      g.box(-1, -1, 17, 1, 1, 17, SILVER); for (let z = 18; z <= 20; z++) g.set(0, 0, z, MITHRIL); g.set(0, 0, 21, G(0xeef2ff));   // the ferrule, the mithril spike
      if (!open) {
        for (let z = 5; z <= 15; z++) {                                            // the canopy furled tight round the shaft
          const r = z < 8 ? 1.2 + (z - 5) * 0.25 : 1.95 - (z - 8) * 0.2;
          g.cyl('z', 0, 0, r, z, z, (x, y) => gore(x, y) ? SILK : (z & 1) ? LEATHER : SILK2);
        }
        for (const [x, y] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) g.set(x, y, 5, SILVER);   // silver bows at the gathered hem
        g.cyl('z', 0, 0, 1.6, 11, 11, LEATHER2); g.set(0, 2, 11, SILVER);           // the strap and its snap
      } else {
        for (let x = -9; x <= 9; x++) for (let y = -9; y <= 9; y++) {              // the dome, opening back toward her hand
          const d2 = x * x + y * y; if (d2 > 92) continue;
          const r = Math.sqrt(d2), zt = Math.round(16 - d2 / 12), m = ((Math.atan2(y, x) + PI) / (PI / 4)) % 1;
          let c = gore(x, y) ? SILK : LEATHER;
          if (r > 5.0 && r < 6.6 && Math.abs(m - 0.5) < 0.22) c = BIRD;            // the ring of embroidered birds, one to a panel
          if (r > 8.6) c = m < 0.12 || m > 0.88 ? SILVER : LEATHER2;               // the rim: black leather, silver bows at the rib tips
          g.set(x, y, zt, c); if (r > 5.5) g.set(x, y, zt + 1, c);
        }
        for (const [x, y] of [[9, 0], [-9, 0], [0, 9], [0, -9]]) g.set(x, y, 8, JET);   // propulsion jets under the rim
      }
    };
    const arm = g => {
      H.arm(g, { sleeve: BLACK, sleeveTo: 6, skin: SKIN, len: 8 });
      g.box(-2, -2, -2, 2, 0, 2, BLACK); g.box(-2, -2, -2, 2, -2, 2, (x, y, z) => ((x + z) & 1) ? WHITE : WHITE2);   // the puffed shoulder, a white frill under it
      g.box(-2, -5, -2, 2, -5, 2, (x, y, z) => ((x + z) & 1) ? WHITE : WHITE2);    // the lace cuff
      g.set(0, -7, 1, NAIL);                                                         // black nail polish
    };
    const leg = g => {
      H.leg(g, { pant: (x, y, z) => (z === 1 && ((x + y) & 1) && y > -7) ? LACE : STOCK, boot: SHOE, bootH: 2, sole: SOLE });   // patterned stockings, heeled pumps
      g.box(-1, -9, -1, 1, -9, -1, SOLE); g.set(0, -8, 3, PURPLE);                 // the thick heel, a bow on the toe
    };
    const spec = open => ({
      scale: 0.07, height: 28, width: 22,
      sockets: { weapon: ['parasol', [0, 0, 21]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        for (let y = 0; y >= -6; y--) {                                            // the A-line overskirt, flaring to the knee
          const k = Math.min(3, Math.floor((1 - y) / 2)), w = 3 + k, f = 1 + k, bk = -2 - k;
          g.box(-w, y, bk, w, y, f, (x, yy, z) => {
            if (y === -6) return ((x + z) & 1) ? WHITE : WHITE2;                   // the white petticoat's frilled hem below it
            if (Math.abs(x) === w && z > bk && z < f && y < -1) return WHITE2;      // open at the sides onto the petticoat
            return y === -5 ? (((x + z) & 1) ? BLACK : BLACK2) : BLACK;
          });
        }
        g.cut(-5, -6, -4, 5, -6, 3); g.cut(-4, -5, -3, 4, -5, 2);                  // hollow under the hem
        for (const [x, z] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) { g.set(x, -5, z, SILVER); g.set(x, -6, z, JET); }   // the four jet nozzles under the skirt
        g.box(-2, 0, 2, 2, 0, 2, PURPLE); g.set(0, 0, 3, PURPLE2); g.set(-1, -1, 3, PURPLE); g.set(1, -1, 3, PURPLE);   // a purple sash at the waist, its bow
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, BLACK);                                           // the corset at the waist...
        for (let y = 0; y <= 3; y++) { g.set(0, y, 2, (y & 1) ? WHITE : BLACK2); g.set(-1, y, 2, BLACK2); g.set(1, y, 2, BLACK2); }   // ...laced up the front
        g.box(-3, 3, -2, 3, 6, 1, BLACK);                                           // the bodice
        g.box(-2, 3, 2, 2, 5, 2, WHITE); g.box(-1, 3, 3, 1, 5, 3, (x, y) => ((x + y) & 1) ? WHITE : WHITE2);   // the white blouse, its frilled jabot
        g.box(-3, 3, 2, -3, 6, 2, BLACK2); g.box(3, 3, 2, 3, 6, 2, BLACK2);          // the bodice's edges either side of it
        g.box(-2, 6, -1, 2, 6, 1, WHITE); g.box(-1, 6, 2, 1, 6, 2, WHITE);          // the high collar
        g.set(-1, 6, 3, PURPLE); g.set(1, 6, 3, PURPLE); g.set(0, 6, 3, PURPLE2); g.set(0, 5, 4, G(0xb27cff));   // the purple ribbon at the throat, a violet brooch
        g.box(-2, 3, -3, 2, 4, -3, SKIN); for (const [x, y] of [[-2, 4], [-1, 3], [0, 4], [1, 3], [2, 4]]) g.set(x, y, -3, BLACK2);   // the open back, the bodysuit's laces across it
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH, blush: 0xf4cfd6 });
        g.set(-1, 2, 3, EYE2); g.set(1, 2, 3, EYE2);                                // crimson eyes, their slit pupils darker
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 1], [-3, 3], [0, 4], [3, 3], [4, 1]], sideTo: 2 });   // side-swept bangs that frame the face
        g.set(-2, 6, 4, HAIRHI); g.set(2, 5, 4, HAIRHI); g.set(-3, 7, 2, HAIRHI); g.set(1, 7, 3, HAIRHI);
        g.box(-5, -1, 0, -5, 4, 2, HAIR); g.box(5, -1, 0, 5, 4, 2, HAIR);         // side locks in front of the ears, where the drills hang
        g.box(-4, -5, -5, 4, 3, -5, (x, y) => ((x + y) & 3) === 0 ? HAIR3 : HAIR2); g.box(-3, -7, -5, 3, -6, -5, HAIR3);   // the rest falls down her back
        g.box(-2, 4, -6, 2, 6, -6, HAIR3); g.set(0, 5, -7, HAIR4);                // the half-up braid...
        g.box(-1, 6, -7, 1, 7, -7, BLACK); g.set(-2, 7, -7, BLACK); g.set(2, 7, -7, BLACK); g.set(-1, 5, -7, PURPLE); g.set(1, 4, -7, PURPLE);   // ...tied with a black ribbon
        for (const s of [-1, 1]) { g.set(s * 5, 2, -1, SKIN); g.set(s * 6, 3, -1, SKIN); g.set(s * 6, 4, -2, SKIN); g.set(s * 7, 5, -2, SKIN); }   // pointed ears
        g.box(-5, 7, 0, 5, 8, 1, BLACK); g.box(-5, 5, 0, -5, 6, 1, BLACK); g.box(5, 5, 0, 5, 6, 1, BLACK);   // the black lace headdress over the crown...
        for (let x = -5; x <= 5; x++) g.set(x, 8, 2, (x & 1) ? WHITE : WHITE2);   // ...its white pleated trim...
        for (let x = -4; x <= 4; x += 2) g.set(x, 9, 0, NAVY);                    // ...lace points along the top
        g.box(5, 8, -1, 6, 9, 0, BLACK); g.set(7, 9, -1, BLACK); g.set(7, 10, 0, BLACK); g.set(6, 8, 1, PURPLE);   // a black bow at her left
      },
      armL: arm, armR: arm, legL: leg, legR: leg,
      extra: {
        tailL: { parent: 'head', at: [6, 2, 2], draw: drill(1) },   // the drill ringlets (named so anim.js swings them like hair)
        tailR: { parent: 'head', at: [-6, 2, 2], draw: drill(-1) },
        parasol: { parent: 'armR', at: [0, -7, 1], rot: [0.45, 0, 0], draw: parasol(open) },   // rot: angled down like a cane at rest; a hand at waist height levels it
      },
    });
    MODELS.vivian = H.humanoid(spec(false));
    MODELS.vivianOpen = H.humanoid(spec(true));   // the same, the parasol open (swapped in during her stances: look())
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: the parasol couched like a lance, the free hand light at her side
  ANIM.READY.vivian = { armL: [-0.25, 0, 0.35], armR: [-0.4, 0.1, -0.15], torso: [0.04, 0.2, 0], head: [0.02, -0.15, 0.05], legL: [-0.1, 0, 0.05], legR: [0.14, 0, -0.04], hipsY: -0.02 };
  // Noblewoman: the parasol open over her shoulder (twirling: mech.tick), a hand at her waist
  ANIM.READY.vvNoble = { armL: [-0.1, -0.3, 0.55], armR: [-1.45, 0, -0.35], torso: [-0.04, 0.12, 0.04], head: [0.06, -0.12, 0.1], legL: [0.02, 0, 0.04], legR: [-0.12, 0, -0.03], hipsY: 0 };
  // Fluttering Frock: aloft under the open parasol, legs together and trailing, the free hand out
  ANIM.READY.vvFrock = { armL: [-0.45, 0, 0.75], armR: [-1.9, 0, -0.1], torso: [0.06, 0, 0], head: [-0.05, 0, 0.04], legL: [0.22, 0, 0.03], legR: [0.38, 0, -0.03], hipsY: 0 };
  // a lance thrust with the parasol (a hand at the waist levels it)
  ACT.vvThrust = (b, t, th, d) => stage(b, { armR: [0.2, 0.1, -0.25], armL: [-0.4, 0, 0.5], torso: [-0.05, 0.55, 0], legR: [0.3, 0, 0] }, { armR: [-0.6, -0.05, 0.05], armL: [0.25, 0, 0.65], torso: [0.18, -0.35, 0], legL: [-0.85, 0, 0], legR: [0.6, 0, 0], hipsY: -0.12 }, t, th, d);
  // the rapier drawn from the handle: a slash with her left hand
  ACT.vvRapier = (b, t, th, d) => stage(b, { armL: [-2.3, -0.3, 0.8], armR: [-0.5, 0.3, -0.2], torso: [0, -0.55, 0] }, { armL: [-1.0, 0.6, -0.5], armR: [-0.4, 0, -0.3], torso: [0.1, 0.6, 0], legR: [-0.55, 0, 0], legL: [0.3, 0, 0] }, t, th, d);
  ACT.vvCross = (b, t, th, d) => t < 0.28 ? ACT.vvRapier(b, t, Math.min(th, 0.18), 0.28) : ACT.vvThrust(b, t - 0.28, 0.12, d - 0.28);   // rapier, then parasol
  // a full turn with the parasol swept round
  ACT.vvSweep = (b, t, th, d) => add(stage(b, { armR: [-0.9, 0.9, -1.0], armL: [-0.4, 0, 0.6], torso: [0, 0.8, 0], hipsY: -0.05 }, { armR: [-1.25, -0.9, 0.5], armL: [-0.6, 0, 1.1], torso: [0.1, -0.8, 0], legL: [-0.5, 0, 0], hipsY: -0.1 }, t, th, d), { spin: clamp(t / (th + 0.05), 0, 1) * PI * 2 });
  ACT.vvSwing = (b, t, th, d) => stage(b, { armR: [-1.0, 1.0, -1.0], armL: [-0.3, 0, 0.6], torso: [0, 0.8, 0] }, { armR: [-1.0, -0.9, 0.6], armL: [-0.4, 0, 0.9], torso: [0.1, -0.8, 0], legL: [-0.5, 0, 0] }, t, th, d);
  ACT.vvSpecial = (b, t, th, d) => t < 0.28 ? ACT.vvSwing(b, t, Math.min(th, 0.16), 0.28) : ACT.vvThrust(b, t - 0.28, 0.12, d - 0.28);   // an umbrella sweep, then a thrust
  // Waltz: a turning glide with the open parasol held high
  ACT.vvWaltz = (b, t) => add(b, { armL: [-1.3, 0, 1.2], armR: [-1.5, 0, -0.5], torso: [0.2, 0, 0.05], legL: [-0.45, 0, 0.1], legR: [0.35, 0, -0.1], spin: clamp(t / 0.42, 0, 1) * PI * 2, lift: 0.06 });
  // Suspension: a beat in the air with the parasol snapped shut overhead, then the plunge
  ACT.vvPlunge = (b, t, th, d) => t < th - 0.06 ? add(b, { armR: [-2.7, 0, -0.2], armL: [-0.7, 0, 0.95], torso: [-0.2, 0, 0], legL: [0.3, 0, 0.1], legR: [0.5, 0, -0.1] })
    : stage(b, { armR: [-2.7, 0, -0.2] }, { armR: [-0.2, 0, 0.05], armL: [-0.4, 0, 1.0], torso: [0.55, 0, 0], legL: [-0.95, 0, 0], legR: [0.6, 0, 0], hipsY: -0.18 }, t - th + 0.06, 0.06, d - th + 0.06);
  // Violet Requiem: the sweep, the charge behind the open parasol, the finishing thrust
  ACT.vvCharge = (b, t) => add(b, { armR: [-1.1, 0, 0.05], armL: [0.35, 0, 0.6], torso: [0.45, 0, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.12, roll: Math.sin(t * 22) * 0.03 });
  ACT.vvEx = (b, t, th, d) => t < 0.42 ? ACT.vvSwing(b, t, 0.2, 0.42) : t < 0.84 ? ACT.vvCharge(b, t) : ACT.vvThrust(b, t - 0.84, 0.04, d - 0.84);
  // aloft under the open parasol (Chain Attack); gliding round the target (Ultimate)
  ACT.vvRise = b => add(b, { armR: [-1.9, 0, -0.1], armL: [-0.5, 0, 0.9], legL: [0.25, 0, 0.05], legR: [0.45, 0, -0.05], torso: [-0.05, 0, 0], head: [-0.15, 0, 0] });
  ACT.vvGlide = b => add(b, { armR: [-1.8, 0, -0.15], armL: [-0.3, 0, 1.1], torso: [0.3, 0, -0.1], legL: [0.3, 0, 0.05], legR: [0.5, 0, -0.05], roll: -0.15 });
  ACT.vvChain = (b, t, th, d) => t < 0.8 ? ACT.vvRise(b) : ACT.vvPlunge(b, t - 0.8, 0.25, d - 0.8);
  ACT.vvUlt = (b, t, th, d) => t < 1.1 ? add(ACT.vvGlide(b), { armL: [Math.sin(t * 26) * 0.7, 0, 0] }) : ACT.vvPlunge(b, t - 1.1, 0.5, d - 1.1);   // rapier flicks as she circles
  ACT.vvFollow = (b, t, th, d) => t < 0.4 ? ACT.vvThrust(b, t, 0.25, 0.4) : ACT.vvSweep(b, t - 0.4, 0.2, d - 0.4);
  // Silver Umbrella Formation: the open parasol braced in front of her
  ACT.vvParry = b => add(b, { armR: [-1.25, 0.1, 0.15], armL: [-0.3, 0, 0.6], torso: [0.15, -0.25, 0], legL: [-0.45, 0, 0], legR: [0.45, 0, 0], hipsY: -0.08 });

  /* ------------------------------------------------------------- effects --
     bloom: the flower-shaped Ether bloom of her Featherbloom and finishers
     (petals ringed on the ground, a burst of petals). vvLance: a violet
     thrust off the parasol's spike; vvRapier: the rapier's thin silver arc;
     vvFeathers, vvFeatherRain: white and lilac feathers; vvOpen: the canopy
     flaring open. Streams: vvPetals (a trail), vvJets (the jets under her
     skirt), vvBirds (the parasol's embroidered birds wheeling round her
     target). */
  const _v = new THREE.Vector3();
  const tip = a => { BT.sock(a, 'weapon', _v); if (_v.y < 0.3) _v.y = 0.3; return _v; };
  function bloom(x, z, r, big) {
    const rot = rnd(0, PI);
    for (let p = 0; p < 6; p++) {
      const an = rot + p * PI / 3, px = x + Math.cos(an) * r * 0.42, pz = z + Math.sin(an) * r * 0.42;
      FX.slash(px, 0.12, pz, r * 0.42, Math.atan2(Math.cos(an), Math.sin(an)), p & 1 ? VIOLET : ETHER, { arc: 3.0, width: 0.16, life: big ? 0.6 : 0.45, sweep: 0.001 });
      for (let i = 0; i < (big ? 8 : 5); i++) { const s = rnd(-0.22, 0.22), sp = rnd(2.5, 5.5) * r / 2.4; FX.p({ x, y: 0.9, z, vx: Math.cos(an + s) * sp, vy: rnd(0.3, 1.6), vz: Math.sin(an + s) * sp, drag: 2.6, life: 0.6, size: 0.15, size1: 0.03, col: U.pick(PETAL), g: 0.6 }); }
    }
    FX.glow(x, 1.0, z, r * 0.9, VIOLET, 0.32, { size1: r * 1.9 });
    FX.ring(x, z, 0.3, r, ETHER, 0.45); FX.ring(x, z, 0.2, r * 0.5, 0xffffff, 0.3, { y: 0.07 });
    if (big && BT.B) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.28);
  }
  function jets(a, n) {
    for (let i = 0; i < n; i++) { const an = rnd(0, PI * 2); FX.p({ x: a.x + Math.cos(an) * 0.22, y: 0.32 + (a.airY || 0), z: a.z + Math.sin(an) * 0.22, vx: Math.cos(an) * 0.6, vy: -rnd(2.5, 4), vz: Math.sin(an) * 0.6, drag: 3, life: 0.22, size: 0.12, size1: 0.02, col: U.pick(JETC) }); }
  }
  // a Guard Feather flies to its target (from her parasol, or out of the sky when she is off the field)
  function featherFly(a, v, T) {
    const on = a.obj.visible;
    for (let i = 0; i < 8; i++) {
      const sx = on ? a.x + rnd(-0.3, 0.3) : v.x + rnd(-2, 2), sy = on ? 1.5 + (a.airY || 0) + rnd(0, 0.5) : rnd(4, 6), sz = on ? a.z + rnd(-0.3, 0.3) : v.z + rnd(-2, 2);
      FX.p({ x: sx, y: sy, z: sz, vx: (v.x - sx) / T, vy: (1.0 - sy) / T, vz: (v.z - sz) / T, life: T, size: 0.15, size1: 0.07, col: U.pick(FEATHER) });
    }
  }
  CHOREO.events.vvLance = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), L = e.len || 2.8, y = 1.0 + (a.airY || 0);
    const p0 = new THREE.Vector3(a.x + fx * 0.4, y, a.z + fz * 0.4), p1 = new THREE.Vector3(a.x + fx * L, y, a.z + fz * L);
    FX.beam(p0, p1, VIOLET, e.big ? 0.22 : 0.14, 0.2); FX.beam(p0, p1, 0xffffff, e.big ? 0.08 : 0.05, 0.14);
    FX.glow(p1.x, p1.y, p1.z, e.big ? 1.6 : 1.0, ETHER, 0.18);
    for (let i = 0; i < (e.big ? 8 : 4); i++) FX.p({ x: p1.x, y: p1.y, z: p1.z, vx: fx * rnd(1, 3) + rnd(-1.5, 1.5), vy: rnd(-0.3, 1.2), vz: fz * rnd(1, 3) + rnd(-1.5, 1.5), drag: 2, life: 0.5, size: 0.11, size1: 0.04, col: U.pick(FEATHER), g: 0.8 });
  };
  CHOREO.events.vvRapier = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = 1.15 + (a.airY || 0), r = e.big ? 2.4 : 2.0;
    FX.slash(a.x + fx * 0.25, y, a.z + fz * 0.25, r, dir, SILVERFX, { tilt: e.tilt || 0, arc: 2.2, width: 0.1, life: 0.2, sweep: 1.3 });
    FX.slash(a.x + fx * 0.25, y + 0.05, a.z + fz * 0.25, r * 0.9, dir, LILAC, { tilt: e.tilt || 0, arc: 2.0, width: 0.2, life: 0.24, sweep: 1.3 });
  };
  CHOREO.events.vvBloom = (a, A, e, tgt) => {
    let x = a.x, z = a.z;
    if (e.at === 'target' && tgt) { x = tgt.x; z = tgt.z; } else if (e.front) { x += Math.sin(A.dir) * 1.3; z += Math.cos(A.dir) * 1.3; }
    bloom(x, z, e.r || 2, e.big); SFX.play('ether');
  };
  CHOREO.events.vvFeathers = (a, A, e) => FX.burst(a.x, 1.2 + (a.airY || 0), a.z, e.big ? 30 : 16, { col: FEATHER, speed: e.big ? 5 : 3.5, size: 0.13, size1: 0.05, life: 0.8, g: 0.8 });
  CHOREO.events.vvOpen = a => { const p = tip(a); FX.burst(p.x, p.y, p.z, 18, { col: PETAL, speed: 4, size: 0.12, life: 0.5, g: 1 }); FX.glow(p.x, p.y, p.z, 1.8, VIOLET, 0.25, { size1: 2.8 }); };
  CHOREO.events.vvFeatherRain = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x, z = tgt ? tgt.z : a.z, r = e.r || 3;
    for (let i = 0; i < 24; i++) { const an = rnd(0, PI * 2), d = rnd(0, r); FX.p({ x: x + Math.cos(an) * d, y: rnd(3, 5), z: z + Math.sin(an) * d, vy: -rnd(7, 11), life: 0.4, size: 0.15, size1: 0.08, col: U.pick(FEATHER) }); }
    FX.ring(x, z, 0.3, r, VIOLET, 0.35); FX.glow(x, 1, z, r * 0.8, ETHER, 0.2);
  };
  CHOREO.streams.vvPetals = (a, A, s, dt) => { const n = Math.max(1, Math.round(dt * 90)); for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.25, 0.25), y: 0.5 + rnd(0, 1.1) + (a.airY || 0), z: a.z + rnd(-0.25, 0.25), vy: rnd(-0.2, 0.4), life: 0.45, size: 0.13, size1: 0.03, col: U.pick(PETAL), g: 0.4 }); };
  CHOREO.streams.vvJets = (a, A, s, dt) => { if (Math.random() < dt * 50) jets(a, 2); };
  CHOREO.streams.vvBirds = (a, A, s, dt, tgt) => {
    const cx = tgt ? tgt.x : a.x, cz = tgt ? tgt.z : a.z, r = s.r || 3, an = BT.B.real * 4;
    for (let i = 0; i < 2; i++) { const a2 = an + i * PI + rnd(-0.2, 0.2); FX.p({ x: cx + Math.cos(a2) * r, y: rnd(1.2, 2.4), z: cz + Math.sin(a2) * r, vx: -Math.sin(a2) * r * 3, vy: rnd(-0.3, 0.3), vz: Math.cos(a2) * r * 3, life: 0.2, size: 0.16, size1: 0.06, col: U.pick(FEATHER) }); }
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  // Feathered Strike: a lance thrust, the rapier, rapier and parasol together, a full turn that blooms
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.7 }], events: [{ t: 0.15, fx: 'vvLance', len: 2.6 }] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.4 }], events: [{ t: 0.14, fx: 'vvRapier', tilt: -0.5 }] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.4 }, { t0: 0.3, t1: 0.4, kind: 'fwd', d: 0.5 }], events: [{ t: 0.16, fx: 'vvRapier', tilt: 0.6 }, { t: 0.4, fx: 'vvLance', len: 2.8 }] });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.3, kind: 'fwd', d: 0.5 }], events: [{ t: 0.3, fx: 'crescent', y: 0.9, tilt: 0, r: 2.4, arc: 5.8, col: VIOLET, sweep: 2.8 }, { t: 0.3, fx: 'vvBloom', r: 2.2 }] });
  // Waltz: a turning dash straight through the target
  set(K.waltz, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: -0.5 }], stream: [{ t0: 0, t1: 0.32, kind: 'vvPetals' }, { t0: 0, t1: 0.3, kind: 'afterimage', col: LILAC }], events: [{ t: 0.2, fx: 'crescent', y: 1.0, tilt: 0, r: 2.0, arc: 5.6, col: LILAC, sweep: 2.6 }] });
  // Suspension: up, the parasol snapped shut, down on the area ahead, where it blooms
  set(K.suspension, { motion: [{ t0: 0, t1: 0.18, kind: 'rise', h: 1.3 }, { t0: 0.16, t1: 0.36, kind: 'toTarget', gap: 1.0 }, { t0: 0.2, t1: 0.36, kind: 'fall' }], stream: [{ t0: 0, t1: 0.2, kind: 'vvJets' }],
    events: [{ t: 0.36, fx: 'vvBloom', r: 2.6, front: true }, { t: 0.36, fx: 'vvFeathers' }, { t: 0.36, fx: 'dust' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: LILAC }], events: [{ t: 0.26, fx: 'vvLance', len: 3 }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.2, side: 'auto' }, { t0: 0.12, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.15, kind: 'afterimage', col: LILAC }],
    events: [{ t: 0.16, fx: 'vvRapier', tilt: 0.6, big: true }, { t: 0.4, fx: 'vvLance', len: 3.4, big: true }, { t: 0.4, fx: 'vvBloom', r: 2.0, front: true }] });
  set(K.special, { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.5 }, { t0: 0.3, t1: 0.4, kind: 'fwd', d: 0.6 }], events: [{ t: 0.14, fx: 'crescent', y: 1.0, tilt: -0.15, r: 2.4, arc: 3.0, col: VIOLET }, { t: 0.4, fx: 'vvLance', len: 3 }] });
  // Violet Requiem: she opens the parasol mid-sweep, then charges behind it
  set(K.ex, { motion: [{ t0: 0.42, t1: 0.86, kind: 'toTarget', gap: 1.0, ease: 'in' }], stream: [{ t0: 0.42, t1: 0.88, kind: 'vvPetals' }, { t0: 0.42, t1: 0.86, kind: 'afterimage', col: VIOLET }],
    events: [{ t: 0.2, fx: 'crescent', y: 1.0, tilt: -0.2, r: 2.6, arc: 3.2, col: VIOLET }, { t: 0.28, fx: 'vvOpen' }, { t: 0.32, fx: 'crescent', y: 1.2, tilt: 0.3, r: 2.6, arc: 3.2, col: LILAC }, { t: 0.62, fx: 'vvLance', len: 3.6 },
      { t: 0.88, fx: 'vvLance', len: 3, big: true }, { t: 0.88, fx: 'vvBloom', r: 2.8, front: true, big: true }, { t: 0.88, fx: 'vvFeathers', big: true }] });
  // Chorus of Celestial Wings (its look is not described anywhere: our choice): up on the parasol's jets, the
  // embroidered birds wheel round the target and feathers rain on it, then the plunge
  set(K.chain, { motion: [{ t0: 0.05, t1: 0.35, kind: 'rise', h: 1.8 }, { t0: 0.8, t1: 1.05, kind: 'toTarget', gap: 1.0 }, { t0: 0.85, t1: 1.05, kind: 'fall' }], stream: [{ t0: 0.05, t1: 0.8, kind: 'vvJets' }, { t0: 0.3, t1: 0.85, kind: 'vvBirds', r: 3.2 }],
    events: [{ t: 0.02, fx: 'vvOpen' }, { t: 0.45, fx: 'vvFeatherRain', r: 3.4 }, { t: 0.7, fx: 'vvFeatherRain', r: 3.4 }, { t: 1.05, fx: 'vvBloom', at: 'target', r: 3.8, big: true }, { t: 1.05, fx: 'vvFeathers', big: true }, { t: 1.05, fx: 'whiteFlash' }] });
  // Soaring Bird's Song: she circles the enemy, then rises and charges down on it with the umbrella; an Ether flower blooms where she lands
  set(K.ult, { motion: [{ t0: 0.05, t1: 0.3, kind: 'rise', h: 0.9 }, { t0: 0.1, t1: 1.05, kind: 'orbit', ang: PI * 2, gap: 1.6, side: 'auto', ease: 'lin' }, { t0: 1.1, t1: 1.35, kind: 'rise', h: 2.8 }, { t0: 1.35, t1: 1.6, kind: 'toTarget', gap: 0.9 }, { t0: 1.35, t1: 1.6, kind: 'fall' }],
    stream: [{ t0: 0.05, t1: 1.1, kind: 'vvJets' }, { t0: 0.1, t1: 1.05, kind: 'vvPetals' }, { t0: 0.2, t1: 1.1, kind: 'vvBirds', r: 2.6 }],
    events: [{ t: 0.02, fx: 'vvOpen' }].concat([0.35, 0.55, 0.75, 0.95].map((t, i) => ({ t, fx: 'vvRapier', tilt: i & 1 ? 0.6 : -0.6 })))
      .concat([{ t: 1.6, fx: 'vvBloom', at: 'target', r: 4.6, big: true }, { t: 1.6, fx: 'vvFeatherRain', r: 4 }, { t: 1.6, fx: 'vvFeathers', big: true }, { t: 1.6, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.0 }, { t0: 0.42, t1: 0.62, kind: 'leap', h: 0.8, d: 0.3 }],
    events: [{ t: 0.25, fx: 'vvLance', len: 3.2, big: true }, { t: 0.6, fx: 'crescent', y: 1.0, tilt: 0, r: 2.6, arc: 5.8, col: VIOLET, sweep: 2.8 }, { t: 0.6, fx: 'vvBloom', r: 2.6 }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: LILAC }], events: [{ t: 0.16, fx: 'vvRapier', tilt: -0.6 }, { t: 0.4, fx: 'vvLance', len: 3.2 }] });
  set(K.assist, { events: [{ t: 0, fx: 'vvOpen' }] });   // the parasol flares open to meet the blow
})();
