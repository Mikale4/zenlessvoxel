/* ============================================================================
   agents/yeshunguang.js -- Ye Shunguang ("Xiao'Guang"), Void Hunter: Qingming
   Arbiter, of Yunkui Summit: Yixuan's disciple, the Qingming Sword's Keeper.
   S-Rank, Honed Edge (a Physical sub-attribute), Attack, Defensive Assist.
   Released in Version 2.5. 162 cm.

   (An Agent in her own file: see agents/zhuyuan.js for every hook and helper.)

   Sources: the research report (hakush / nanoka datamine of live 3.3, the
   Zenless Zone Zero Wiki tables and subpages, Prydwen's kit data and review,
   Game8, the official "Expert Challenge" combat-design video), and the
   official splash art of both looks and the in-game model render.

   Her kit (official):
     NORMAL STATE (Physical)
     Basic Attack: Swiftedge             4 forward slashes; hit 4 chains into
                                         the Dash Attack (Basic again).
     Basic Attack: Cloudstream Sword Will  hold Basic: a stream of blade
                                         shockwaves, Anti-Interrupt.
     Dash Attack: Phantasm Dash          Dodge Counter: Swallow Strike (leap, thrust)
     Special Attack: Guiding Tides       spends a dodge and counts as one; a
                                         Perfect Dodge in it throws a flying sword
                                         instead, then Basic is Swiftedge hit 2.
     EX Special Attack: Gale Suppression (60 Energy) rushing slash and a flying
                                         sword; +1 Qingming Sword Force.
     Chain Attack: Smite the Wicked      Quick Assist: Support Guard
     Defensive Assist: When I Return     Assist Follow-Up: Cease Hostility
     Ultimate: Chasing Storms            a sword formation; Enlightened Mind,
                                         Ether Veil: Verdict, +6 Sword Force,
                                         and she is left airborne.
     Entry Skill: Illuminating Darkness  hold Basic at 6 Sword Force (or swap her
                                         in): Enlightened Mind and the Verdict
                                         veil; counts as a Quick Assist; airborne.
     ENLIGHTENED MIND (16 s, the clock stops off the field; all DMG Honed Edge;
     everything invulnerable but Splitting Currents' first two hits)
     Sunderlight (Basic, airborne) 2 downward slashes -> Sunderlight
                                         Annihilation (Basic after hit 2, or
                                         Special): a falling strike that lands
                                         her; with 2+ Sword Force it spends 2 on
                                         hit, hits far harder and leaves
                                         Culmination. Maximum (Basic after it,
                                         1 Sword Force): a wide sweep.
     Splitting Currents (Basic, grounded) 3 slashes; with Sword Force the 3rd is
                                         Skyward Ascent, a rising slash back into
                                         the air (also Basic after a Perfect Dodge).
     Clean Exit (Special, grounded)      a backstep slash that counts as a dodge;
                                         Perfect Dodge it, then Basic: Maximum.
     Soaring Light (hold Special)        slashes that spend Sword Force (or
                                         Culmination) one a slash until none is
                                         left or you let go; tapped after
                                         Annihilation or Maximum: one slash (after
                                         Maximum it flows into Skyward Ascent).
     Return to Dust (hold Special at 0, or Ultimate) ends the state; after a
                                         Decibel Chasing Storms it is Ultimate:
                                         Cleaving Heavens (no Decibels).
     Lure Thunder (Chain), Tactical Support (Quick Assist), Unification
                                         (Assist Follow-Up): the state's versions.
     Core Passive: Burning Clarity       Unity (+30% CRIT Rate, +25% DMG); Sword
                                         Force (6) and Bearer (overflow, 3);
                                         Veil Vulnerability (the enemy's Stun DMG
                                         Multiplier for her hits even when it is
                                         not Stunned, the bonus capped at 110%).
     Additional Ability: Shadowtrace Flight  with a Support or Defense Agent: a
                                         teammate's Ether Veil gives 3 Sword Force
                                         (in the state: 3 Bearer).
   Our choices (no source has them): which hits are heavy (the game's rule);
   how fast her hits fill the Sword Force gauge; Sword Force is paid at the
   first landed hit; the automatic Annihilation when she is swapped out is the
   plain one; Veil Vulnerability is applied as a DMG bonus (mech.mods).
   Simplified: Wandering Cloud (riding the sword case on a held Dodge) is not
   in battle (the case appears when she draws the Qingming Sword); Dodge does
   not follow Sunderlight into Annihilation (Special does); Honed Edge builds
   the same Assault gauge as Physical.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, R = D.RULES, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, lerp } = U, PI = Math.PI;
  const ID = 'yeshunguang';
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const ph = (t, dmg, daze, o) => hit(t, dmg, daze, 0, Object.assign({ attr: 'physical' }, o));   // her normal state: Physical, no buildup
  const RED = 0xd43932, PINKR = 0xffb0a8, WHITE = 0xffffff, PALE = 0xe8ecff, LILAC = 0xc8c4e0;
  const EM_DUR = 16, SF_MAX = 6, BEARER_MAX = 3, HOVER = 0.55;
  // Burning Clarity's gauge (our rate): 1 Sword Force per 900 points of (scaled) DMG multiplier, by the kind of
  // move. Basics and counters build it best; Chain Attacks, assists and follow-ups poorly (Prydwen's review)
  const SF_PER = 900, SFK = { basic: 1, dash: 1, counter: 1, special: 1, core: 1, quick: 0.4, followup: 0.4, chain: 0.3 };

  /* ------------------------------------------------------- Honed Edge --
     A Physical sub-attribute: Physical for weakness, resistance and Assault
     (white light, the colour of her Enlightened Mind effects). */
  D.ATTR.honed = { name: 'Honed Edge', color: '#eef0ff', hex: 0xeef0ff, anomaly: 'assault', as: 'physical' };
  FX.ATTR_COL.honed = [0xffffff, 0xe8ecff, 0xb4b8d8];

  /* ----------------------------------------------------------------- kit -- */
  const K = {
    basic: [
      { name: 'Basic Attack: Swiftedge', anim: 'ysCutR', dur: 0.4, cancel: 0.28, reach: 1.7, range: 1.5, hits: [ph(0.14, 159.7, 40.8, { shape: 'arc', r: 2.2, arc: 130 })] },
      { name: 'Basic Attack: Swiftedge', anim: 'ysCutL', dur: 0.46, cancel: 0.33, reach: 1.7, range: 1.5, hits: [ph(0.16, 488.3, 117.1, { shape: 'arc', r: 2.2, arc: 140 })] },
      { name: 'Basic Attack: Swiftedge', anim: 'ysTwirl', dur: 0.52, cancel: 0.38, reach: 1.8, range: 1.5, hits: [ph(0.22, 250.0, 54.1, { shape: 'circle', at: 'self', r: 2.2 })] },
      { name: 'Basic Attack: Swiftedge', anim: 'ysCleaveDown', dur: 0.78, cancel: 0.6, reach: 1.9, range: 1.5, hits: [ph(0.34, 736.5, 161.2, { heavy: true, shape: 'arc', r: 2.6, arc: 150, kb: 0.8 })] },
    ],
    // held Basic: six blade shockwaves a cycle; it keeps going while held (holdRepeat)
    cloud: { name: 'Basic Attack: Cloudstream Sword Will', anim: 'ysFlurry', dur: 0.62, cancel: 0.56, reach: 4.5, range: 2.6, dr: 0.4, holdRepeat: true,
      hits: [0.1, 0.18, 0.26, 0.34, 0.42, 0.5].map(t => ph(t, 33.5, 7.9, { shape: 'line', r: 0.9, len: 5.5 })) },
    dash: { name: 'Dash Attack: Phantasm Dash', anim: 'ysLunge', dur: 0.5, cancel: 0.38, reach: 7, hits: [ph(0.22, 210.6, 31.7, { shape: 'arc', r: 2.2, arc: 120 })] },
    counter: { name: 'Dodge Counter: Swallow Strike', anim: 'ysSwallow', dur: 0.66, cancel: 0.5, reach: 4, inv: [0, 0.6], hits: [ph(0.34, 692.8, 176.8, { heavy: true, shape: 'line', r: 1.1, len: 3.6, kb: 0.9 })] },
    special: { name: 'Special Attack: Guiding Tides', anim: 'ysFlick', dur: 0.42, cancel: 0.32, reach: 4, range: 2.4, inv: [0, 0.2], hits: [ph(0.16, 197.9, 37.5, { shape: 'line', r: 0.9, len: 5 })] },
    // Guiding Tides on a Perfect Dodge: the flying sword (heavy: our choice, like a Dodge Counter)
    tides: { name: 'Special Attack: Guiding Tides', anim: 'ysThrow', dur: 0.55, cancel: 0.42, reach: 6, inv: [0, 0.5], hits: [ph(0.3, 632.7, 199.2, { heavy: true, shape: 'circle', at: 'target', r: 1.8, kb: 0.8 })] },
    // (one official multiplier; split 35/65 between the rushing slash and the flying sword: our choice)
    ex: { name: 'EX Special Attack: Gale Suppression', anim: 'ysGale', dur: 1.15, cancel: 1.0, cost: 60, reach: 3.5, range: 2.0, inv: [0, 1.1],
      hits: [ph(0.22, 2357.6 * 0.35, 510.6 * 0.35, { shape: 'circle', at: 'self', r: 2.2 }), ph(0.82, 2357.6 * 0.65, 510.6 * 0.65, { heavy: true, shape: 'circle', at: 'target', r: 2.6, kb: 1.1 })] },
    smite: { name: 'Chain Attack: Smite the Wicked', anim: 'ysSmite', dur: 1.3, inv: [0, 1.3], hits: [ph(0.75, 1743.9, 272.8, { heavy: true, shape: 'cone', r: 4.6, arc: 150, kb: 1.2 })] },
    // the sword formation: four volleys and the last great one (the official total, split: our choice). Honed Edge:
    // she is already in Enlightened Mind
    ult: { name: 'Ultimate: Chasing Storms', anim: 'ysStorm', dur: 2.2, inv: [0, 2.2],
      hits: [0.95, 1.1, 1.25, 1.4].map(t => hit(t, 385, 8.25, 10, { shape: 'circle', at: 'target', r: 3.4 })).concat([hit(1.8, 2310, 49.5, 60, { heavy: true, shape: 'circle', at: 'target', r: 4.6, kb: 1.4 })]) },
    entry: { name: 'Entry Skill: Illuminating Darkness', anim: 'ysDraw', dur: 1.1, reach: 3, inv: [0, 1.1], hits: [hit(0.6, 800.8, 181.5, 220, { shape: 'cone', r: 4.8, arc: 160, kb: 0.9 })] },
    guard: { name: 'Quick Assist: Support Guard', anim: 'ysSwallow', dur: 0.65, inv: [0, 0.6], hits: [ph(0.3, 161.9, 48.2, { shape: 'line', r: 1.1, len: 3.4, kb: 0.6 })] },
    assist: { name: 'Defensive Assist: When I Return', type: 'defensive', anim: 'ysParry', dur: 0.45, inv: [0, 0.45], daze: 293 },
    cease: { name: 'Assist Follow-Up: Cease Hostility', anim: 'ysCleaveDown', dur: 1.0, inv: [0, 0.95], hits: [ph(0.45, 828.4, 210.4, { heavy: true, shape: 'cone', r: 3.4, arc: 120, kb: 1.0 })] },

    /* Enlightened Mind (ysEM: the state does not end during it; ysStep: what Basic and Special follow it
       with; ysAir: airborne (true) or grounded (false) after it; ysPay: Sword Force spent on hit) */
    sun1: { name: 'Basic Attack: Enlightened Mind - Sunderlight', anim: 'ysSunder', dur: 0.42, cancel: 0.3, reach: 2.4, range: 1.6, inv: [0, 0.42], ysEM: true, ysStep: 'sun1', ysAir: true,
      hits: [hit(0.18, 241.7, 51.6, 61.7, { shape: 'arc', r: 2.4, arc: 140 })] },
    sun2: { name: 'Basic Attack: Enlightened Mind - Sunderlight', anim: 'ysSunder2', dur: 0.45, cancel: 0.32, reach: 2.4, range: 1.6, inv: [0, 0.45], ysEM: true, ysStep: 'sun2', ysAir: true,
      hits: [hit(0.18, 313.8, 66.0, 80, { shape: 'arc', r: 2.4, arc: 140 })] },
    annih: { name: 'Basic Attack: Enlightened Mind - Sunderlight Annihilation', anim: 'ysAnnih', dur: 0.8, cancel: 0.62, reach: 2.6, inv: [0, 0.8], ysEM: true, ysStep: 'annih', ysAir: false, ysPay: 2,
      hits: [hit(0.36, 1783.3, 87.5, 105, { heavy: true, shape: 'circle', at: 'front', r: 3.2, kb: 1.0 })] },
    annih0: { name: 'Basic Attack: Enlightened Mind - Sunderlight Annihilation', anim: 'ysAnnih', dur: 0.6, cancel: 0.46, reach: 2.4, inv: [0, 0.6], ysEM: true, ysStep: 'annih', ysAir: false,
      hits: [hit(0.3, 320.5, 68.1, 81.7, { heavy: true, shape: 'circle', at: 'front', r: 2.2, kb: 0.6 })] },
    max: { name: 'Basic Attack: Enlightened Mind - Sunderlight Maximum', anim: 'ysSweep', dur: 0.8, cancel: 0.62, reach: 2.8, inv: [0, 0.8], ysEM: true, ysStep: 'max', ysAir: false, ysPay: 1,
      hits: [hit(0.32, 1209.8, 115.5, 140, { heavy: true, shape: 'arc', r: 3.6, arc: 220, kb: 0.9 })] },
    split1: { name: 'Basic Attack: Enlightened Mind - Splitting Currents', anim: 'ysCutR', dur: 0.42, cancel: 0.3, reach: 2.2, range: 1.5, ysEM: true, ysStep: 'split1', ysAir: false,
      hits: [hit(0.15, 225.9, 54.5, 65, { shape: 'arc', r: 2.2, arc: 130 })] },
    split2: { name: 'Basic Attack: Enlightened Mind - Splitting Currents', anim: 'ysCutL', dur: 0.45, cancel: 0.32, reach: 2.2, range: 1.5, ysEM: true, ysStep: 'split2', ysAir: false,
      hits: [hit(0.18, 312.1, 74.8, 90, { shape: 'arc', r: 2.2, arc: 140 })] },
    split3: { name: 'Basic Attack: Enlightened Mind - Splitting Currents', anim: 'ysLunge', dur: 0.6, cancel: 0.46, reach: 3, range: 1.5, inv: [0.15, 0.45], ysEM: true, ysStep: 'split3', ysAir: false,
      hits: [hit(0.24, 433.3, 104.0, 125, { heavy: true, shape: 'line', r: 1.2, len: 4.2, kb: 0.9 })] },
    ascent: { name: 'Basic Attack: Enlightened Mind - Skyward Ascent', anim: 'ysRise', dur: 0.55, cancel: 0.42, reach: 2.2, inv: [0, 0.55], ysEM: true, ysStep: 'ascent', ysAir: true,
      hits: [hit(0.18, 182.3, 54.5, 32.5, { shape: 'arc', r: 2.2, arc: 140, kb: 0.3 })] },
    clean: { name: 'Special Attack: Enlightened Mind - Clean Exit', anim: 'ysBackstep', dur: 0.45, cancel: 0.34, reach: 2.2, inv: [0, 0.45], ysEM: true, ysStep: 'clean', ysAir: false,
      hits: [hit(0.12, 142.5, 26.3, 31.7, { shape: 'arc', r: 2.2, arc: 140 })] },
    // held: up to six slashes, each paid as it comes (mech.tick); it stops when you let go or nothing is left
    soar: { name: 'EX Special Attack: Enlightened Mind - Soaring Light', anim: 'ysSoar', dur: 1.36, cancel: 1.3, reach: 2.6, range: 1.8, inv: [0, 1.36], ysEM: true,
      hits: [0, 1, 2, 3, 4, 5].map(i => hit(0.2 + i * 0.16, 353.4, 27.9, 196.7 / 6, { heavy: true, shape: 'circle', at: 'target', r: 2.0 })) },
    soar1: { name: 'EX Special Attack: Enlightened Mind - Soaring Light', anim: 'ysCutR', dur: 0.45, cancel: 0.34, reach: 2.6, inv: [0, 0.45], ysEM: true,
      hits: [hit(0.18, 353.4, 27.9, 196.7 / 6, { heavy: true, shape: 'circle', at: 'target', r: 2.0 })] },
    soarM: { name: 'EX Special Attack: Enlightened Mind - Soaring Light', anim: 'ysCutR', dur: 0.45, cancel: 0.45, reach: 2.6, inv: [0, 0.45], ysEM: true, then: 'ascent',
      hits: [hit(0.18, 353.4, 27.9, 196.7 / 6, { heavy: true, shape: 'circle', at: 'target', r: 2.0 })] },
    dust: { name: 'EX Special Attack: Enlightened Mind - Return to Dust', anim: 'ysDust', dur: 1.5, reach: 3, inv: [0, 1.5], ysEM: true, ysAir: false,
      hits: [hit(1.0, 2322.7, 209.8, 253, { heavy: true, shape: 'circle', at: 'self', r: 5, kb: 1.4 })] },
    cleave: { name: 'Ultimate: Cleaving Heavens', anim: 'ysCleave', dur: 2.2, inv: [0, 2.2], ysEM: true, ysAir: false,
      hits: [hit(1.6, 6168.7, 227.2, 275, { heavy: true, shape: 'circle', at: 'target', r: 5, kb: 2 })] },
    lure: { name: 'Chain Attack: Enlightened Mind - Lure Thunder', anim: 'ysSmite', dur: 1.25, inv: [0, 1.25], ysEM: true, ysAir: true,
      hits: [hit(0.6, 1817.2, 206.8, 449.5, { heavy: true, shape: 'cone', r: 4.6, arc: 160, kb: 1.2 })] },
    tactical: { name: 'Quick Assist: Enlightened Mind - Tactical Support', anim: 'ysCutR', dur: 0.6, inv: [0, 0.55], ysEM: true, ysAir: false,
      hits: [hit(0.24, 135.5, 50.7, 60, { shape: 'arc', r: 2.4, arc: 140, kb: 0.6 })] },
    unify: { name: 'Assist Follow-Up: Enlightened Mind - Unification', anim: 'ysSmite', dur: 1.0, inv: [0, 0.95], ysEM: true, ysAir: false,
      hits: [hit(0.45, 860.1, 219.7, 286.2, { heavy: true, shape: 'circle', at: 'front', r: 3.0, kb: 1.0 })] },
  };
  /* Her Chain Attack, Quick Assist and Assist Follow-Up change with the state. battle.js reads kit.chain /
     .quick / .followup at the moment it uses them, so these are getters: Enlightened Mind's versions while
     she is in it, and (Quick Assist) the Entry Skill when she has 6 Sword Force (it counts as one). (In a
     Proxy Clash mirror match the rival's Ye goes by yours.) */
  const mine = () => { const B = window.BT && BT.B; return B ? B.squad.filter(s => s.id === ID) : []; };
  const emNow = () => mine().some(s => s.ysEM);
  Object.defineProperty(K, 'chain', { enumerable: true, configurable: true, get: () => emNow() ? K.lure : K.smite });
  Object.defineProperty(K, 'followup', { enumerable: true, configurable: true, get: () => emNow() ? K.unify : K.cease });
  Object.defineProperty(K, 'quick', { enumerable: true, configurable: true, get: () => emNow() ? K.tactical : mine().some(s => s.ysSF >= SF_MAX) ? K.entry : K.guard });

  /* ------------------------------------------------- her mechanics -- */
  const fuel = a => a.ysSF > 0 || a.ysCulm;                                     // a Soaring Light slash can be paid
  const fin = a => ({ def: a.ysCH ? K.cleave : K.dust, kind: a.ysCH ? 'ult' : 'ex' });
  const annihFor = a => a.ysSF >= 2 ? K.annih : K.annih0;
  // Sword Force past 6 becomes Bearer (up to 3), by any means
  function gainSF(a, n) {
    const got = Math.max(0, Math.min(SF_MAX - a.ysSF, n)), over = n - got;
    a.ysSF += got; if (over > 0) a.ysBearer = Math.min(BEARER_MAX, a.ysBearer + over);
    if (a.ysSF >= SF_MAX) a.ysGauge = 0;
  }
  // one Soaring Light slash: Culmination pays first, then Sword Force
  function payOne(a, soar) {
    if (soar && a.ysCulm) { a.ysCulm = false; return true; }
    if (a.ysSF > 0) { a.ysSF--; return true; }
    return false;
  }
  function enterEM(a, viaUlt) {
    Object.assign(a, { ysEM: true, ysT: EM_DUR, ysAir: true, ysCulm: false, ysCH: !!viaUlt, ysPD: null, ysLast: null, ysLastT: 0, ysEndAfter: null });
    if (viaUlt) gainSF(a, 6);
    // in the state the Ultimate button is her finisher: the Decibels wait (restored when it ends)
    const cap = R.decibelMax - 1; a.ysDb = Math.max(0, a.decibels - cap); a.decibels = Math.min(a.decibels, cap);
    BT.callout('ENLIGHTENED MIND', 'skill', `${a.def.short} · Ether Veil: Verdict`);
    BT.log(`${a.def.short}: Enlightened Mind and Ether Veil: Verdict (${EM_DUR} s on the field). Her Honed Edge hits treat every enemy as if it were Stunned.`, 'skill');
  }
  function exitEM(a, why) {
    const b = a.ysBearer;
    Object.assign(a, { ysEM: false, ysT: 0, ysAir: false, ysCulm: false, ysCH: false, ysPD: null, ysLast: null, ysEndAfter: null, ysBearer: 0 });
    if (b) gainSF(a, b);                                                             // Bearer turns back into Sword Force
    a.decibels = Math.min(R.decibelMax, a.decibels + (a.ysDb || 0)); a.ysDb = 0;
    if (a.ysVeilFx) { FX.kill(a.ysVeilFx); a.ysVeilFx = null; }
    look(a, false);
    if (a.obj.visible) { FX.glow(a.x, 1.1, a.z, 2.6, PALE, 0.3, { size1: 4 }); FX.burst(a.x, 1, a.z, 24, { col: [WHITE, PALE, LILAC], speed: 4, size: 0.1, life: 0.5, g: -1 }); }
    BT.log(`${a.def.short}: Enlightened Mind ends (${why}).${b ? ` Bearer returns ${b} Qingming Sword Force.` : ''}`, 'skill');
  }
  /* her second look: the same body, two rigs (CHOREO.swapRig, as Hugo's scythe), the pose carried over */
  function look(a, em) {
    if ((a.rig.id === 'yeshunguangEM') === em || !MODELS.yeshunguangEM) return;
    const from = a.rig; CHOREO.swapRig(a, em ? 'yeshunguangEM' : null);
    const to = a.rig; if (to === from) return;
    for (const n in to.parts) { const p = from.parts[n]; if (p) to.parts[n].rotation.copy(p.rotation); }
    to.parts.hips.position.copy(from.parts.hips.position);
  }
  // Guiding Tides and Clean Exit spend a dodge and count as one: a Perfect Dodge can land in them
  function dodgeLike(a) {
    const B = BT.B;
    if (a.dodge || a.dodgeCharges <= 0) return;
    a.dodgeCharges--; if (a.dodgeCharges <= 0) a.dodgeCd = BT.T.dodgeCd;
    a.dodge = { t0: B.t, until: B.t + 0.3 };
  }
  // the Verdict veil's mark at her feet while the state lasts
  function veilRing(a) {
    if (a.ysVeilFx) return;
    const g = new THREE.Group(), mats = [];
    for (const [r0, r1, c, op] of [[1.5, 1.62, WHITE, 0.55], [2.2, 2.27, PALE, 0.3]]) {
      const geo = new THREE.RingGeometry(r0, r1, 48), mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2; g.add(m); mats.push(mat, geo);
    }
    a.ysVeilFx = FX.custom(g, 9999, (k, dt) => { g.visible = a.obj.visible && a.alive; g.position.set(a.x, 0.05, a.z); g.rotation.y += dt * 0.8; }, mats);
  }
  /* what a move she starts changes (mech.start; and from mech.tick for the moves battle.js starts without
     it: Quick Assists, so the Entry Skill on one) */
  function begin(a, def, A) {
    const B = BT.B; A.data.ysBegun = true;
    if (def.ysStep) { a.ysLast = def.ysStep; a.ysLastT = B.t + A.dur + 0.9; }
    if (def.ysAir != null) a.ysAir = !!a.ysEM && def.ysAir;
    if (def === K.basic[1]) a.ysTideT = 0;
    if (def === K.basic[3]) a.ysSw4T = B.t + A.dur + 0.6;                       // hit 4 chains into the Dash Attack
    else if (def === K.dash) a.ysSw4T = 0;
    else if (def === K.special || def === K.clean) dodgeLike(a);
    else if (def === K.tides) a.ysTideT = B.t + A.dur + 0.8;                    // ...then Basic is Swiftedge hit 2
    else if (def === K.cloud) a.cds.ysCloud = B.t + 4;
    else if (def === K.ex) gainSF(a, 1);
    else if (def === K.ult) enterEM(a, true);
    else if (def === K.entry) enterEM(a, false);
    else if (def === K.soar) { A.data.ysN = payOne(a, true) ? 1 : 0; a.ysLast = null; }
    else if (def === K.soar1) { payOne(a, true); a.ysLastT = B.t + A.dur + 0.9; }   // (Maximum may still follow)
    else if (def === K.soarM) payOne(a, true);
    else if (def === K.max) a.ysLast = a.ysPD && a.ysPD.until > B.t ? 'maxpd' : 'max';
    else if (def === K.dust || def === K.cleave) { a.ysEndAfter = A; a.ysLast = null; }
    if (def === K.ascent || def === K.max) a.ysPD = null;
  }
  // swapped out in the air in Enlightened Mind: Sunderlight Annihilation on the way out (the plain one: our choice)
  function leaveStrike(a) {
    const h = Object.assign({}, K.annih0.hits[0], { heavy: false }), dir = a.face;
    const cx = a.x + Math.sin(dir) * 1.3, cz = a.z + Math.cos(dir) * 1.3;
    const A = { def: K.annih0, kind: 'core', data: {}, dir, t: 0, tgt: null, hi: 0, fired: {} };
    E.ysLand(a, A, { r: 2.2, x: cx, z: cz, em: true });
    for (const v of BT.enemiesIn('circle', cx, cz, h.r, dir)) BT.applyHit(a, v, h, A, a.def.attr);
    BT.log(`${a.def.short}: ${K.annih0.name} as she leaves the field.`, 'skill');
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.yeshunguang = {
    id: ID, name: 'Ye Shunguang', short: 'Shunguang', faction: 'Yunkui Summit', spec: 'Attack', attr: 'honed', rank: 'S',
    color: '#d43932', color2: '#f6f1ec', assist: 'defensive', stance: 'ysJian',
    blurb: 'The Qingming Sword Keeper of Yunkui Summit: a Void Hunter with a smile for everyone, a diary she never lets out of her sight, and a secret she keeps from all of them. Her jian builds Qingming Sword Force; at six she draws the Qingming Sword and enters Enlightened Mind, white-haired among flying swords, where her Honed Edge strikes every enemy as if it were Stunned.',
    stats: { hp: 8590, atk: 3160, def: 648, impact: 83, ap: 93, am: 94, cr: 0.49, cd: 0.7, er: 1.2, speed: 4.8 },
    ai: { range: 1.7, dodge: 0.8, reflex: 0.64, aggr: 1.05 },
    energyMax: 120, resource: 'swordforce',
    core: [
      ['Core Passive: Burning Clarity', 'Unity: +30% CRIT Rate and +25% DMG from the moment she enters battle. Chasing Storms or her Entry Skill puts her in Enlightened Mind with Ether Veil: Verdict for 16 s (the clock stops while she is off the field): her skills change, her DMG becomes Honed Edge, and every enemy takes her hits with Veil Vulnerability, its Stun DMG Multiplier as if it were Stunned (the bonus capped at 110%).'],
      ['Qingming Sword Force', 'Outside Enlightened Mind her attacks slowly fill a gauge, one point at a time up to 6; Gale Suppression gives 1, Chasing Storms 6. Points past 6 become Bearer (up to 3), returned as Sword Force when the state ends. At 6, hold Basic (or swap her in) for Entry Skill: Illuminating Darkness. In the state, Sunderlight Annihilation spends 2 (and leaves Culmination, which pays for one Soaring Light slash), Sunderlight Maximum 1, Soaring Light 1 a slash.'],
      ['Enlightened Mind', 'In the air, Basic is Sunderlight (two downward slashes, then Annihilation, which lands her; Special goes straight to Annihilation). On the ground, Basic is Splitting Currents (with Sword Force its 3rd hit is Skyward Ascent, back into the air) and Special is Clean Exit, a dodge: Perfect Dodge it, then Basic for Sunderlight Maximum. After Annihilation, Basic is Maximum; after either, Special is one Soaring Light slash. Hold Special for Soaring Light; with nothing left, hold Special (or press Ultimate) for Return to Dust, or Ultimate: Cleaving Heavens after a Chasing Storms, and the state ends.'],
      ['Additional Ability: Shadowtrace Flight', 'With a Support or Defense Agent in the squad: when a teammate raises an Ether Veil, she gains 3 Qingming Sword Force (3 Bearer if she is in Enlightened Mind).'],
    ],
    kit: K,
    kitShow: [['Hold', 'cloud'], ['Entry', 'entry'], ['Enlightened', 'sun1'], ['Enlightened', 'annih'], ['Enlightened', 'max'], ['Enlightened', 'split1'], ['Enlightened', 'ascent'], ['Enlightened', 'clean'], ['Enlightened', 'soar'], ['Enlightened', 'dust'], ['Ultimate', 'cleave'], ['Chain', 'lure']],
    rivalMoves: [{ k: 'cloud', kind: 'core', p: 0.18, cd: 6 }, { k: 'tides', kind: 'special', p: 0.15, cd: 8 }],
    howto: 'Shunguang: her string and Gale Suppression build Qingming Sword Force; at 6, hold Basic (or swap her in) for Enlightened Mind: 16 s of Honed Edge among flying swords, and every enemy takes her hits as if Stunned. In the air Basic is Sunderlight, on the ground Splitting Currents; hold Special for Soaring Light, and with no Sword Force left hold Special or press Ultimate to end it with Return to Dust (Cleaving Heavens after Chasing Storms). Her assist is a Defensive Assist.',
    mech: {
      init(a) {
        Object.assign(a, { ysSF: 0, ysGauge: 0, ysBearer: 0, ysEM: false, ysT: 0, ysAir: false, ysCulm: false, ysCH: false, ysPD: null, ysLast: null, ysLastT: 0,
          ysTideT: 0, ysSw4T: 0, ysDb: 0, ysVeilOn: false, ysAA: false, ysEndAfter: null, ysVeilFx: null });
      },
      squad(a, B) { a.ysAA = B.squad.some(s => s !== a && (s.def.spec === 'Support' || s.def.spec === 'Defense')); },
      start(a, def, A) { begin(a, def, A); },
      hit(a, v, h, A) {
        const d = A.def;
        if (d.ysPay && !A.data.ysPaid) { A.data.ysPaid = true; a.ysSF = Math.max(0, a.ysSF - d.ysPay); if (d === K.annih) a.ysCulm = true; }
        // Burning Clarity: outside the state, under 6, her hits fill the gauge (once a hit, however many it strikes)
        if (a.ysEM || a.ysSF >= SF_MAX || A.data.ysH === h) return;
        A.data.ysH = h;
        const k = SFK[A.kind]; if (!k) return;
        a.ysGauge += h.mult * k / SF_PER;
        while (a.ysGauge >= 1 && a.ysSF < SF_MAX) { a.ysGauge -= 1; a.ysSF++; }
        if (a.ysSF >= SF_MAX) { a.ysGauge = 0; BT.callout('QINGMING SWORD FORCE ×6', 'skill', `${a.def.short} · hold Basic: Entry Skill`); }
      },
      // Unity; in the state, Veil Vulnerability: the enemy's Stun DMG Multiplier (as if Stunned) replaces its own,
      // the bonus capped at 110% (a DMG bonus here)
      mods(a, v) {
        let dmg = 0.25;
        if (a.ysEM && v) {
          const base = R.stunMult + (v.stun > 0 && v.rank === 'boss' ? 0.25 * (v.chainsUsed || 0) : 0) + 0.04 * (v.subj || 0);
          dmg += (1 + Math.min(1.1, Math.max(0, base - 1))) / BT.stunMult(v) - 1;
        }
        return { dmg, cr: 0.3 };
      },
      tick(a, dt, on) {
        const B = BT.B;
        if (!a.alive) return;
        // Shadowtrace Flight: a teammate raises an Ether Veil (a new one, not an extension)
        const veil = B.veil > B.t;
        if (veil && !a.ysVeilOn && a.ysAA) {
          if (a.ysEM) a.ysBearer = Math.min(BEARER_MAX, a.ysBearer + 3); else gainSF(a, 3);
          BT.log(`${a.def.short}: Shadowtrace Flight: +3 ${a.ysEM ? 'Bearer' : 'Qingming Sword Force'}.`, 'skill');
        }
        a.ysVeilOn = veil;
        const A = a.act;
        if (A && !A.data.ysBegun) begin(a, A.def, A);
        // a Perfect Dodge: in Guiding Tides, the flying sword at once; in the state, Basic is Skyward Ascent
        // (in Clean Exit: Sunderlight Maximum) instead of the Dodge Counter
        if (a.counterUntil > B.t) {
          if (A && A.def === K.special) { const tgt = a.counterTgt; a.counterUntil = 0; BT.endAct(a); a.queue.unshift({ def: K.tides, kind: 'special', tgt, delay: 0 }); }
          else if (a.ysEM) { a.ysPD = { until: a.counterUntil, max: !!(A && A.def === K.clean) }; a.counterUntil = 0; }
        }
        if (!a.ysEM) return;
        if (on) a.ysT -= dt;                                                      // (the clock stops off the field)
        if (a.ysEndAfter && a.act !== a.ysEndAfter) return exitEM(a, a.ysEndAfter.def.name.replace(/^[^:]+: (Enlightened Mind - )?/, ''));
        if (a.ysT <= 0 && !(a.act && a.act.def.ysEM)) return exitEM(a, 'time');
        const cap = R.decibelMax - 1;
        if (a.decibels > cap) { a.ysDb = Math.min(R.decibelMax, (a.ysDb || 0) + a.decibels - cap); a.decibels = cap; }
        if (!(A && (A.def === K.ult || A.def === K.entry))) { look(a, true); veilRing(a); }   // (those swap at the draw: ysAwaken)
        // Soaring Light held: each slash is paid just before it lands; let go, or nothing left, and it stops
        if (A && A.def === K.soar) {
          const Hs = K.soar.hits, n = A.data.ysN || 0;
          if (n < Hs.length && A.hi >= n && A.t >= Hs[n].t - 0.07) {
            if ((BT.isPlayer(a) && !BT.btnHeld('special')) || !payOne(a, true)) BT.endAct(a); else A.data.ysN = n + 1;
          }
        }
        // airborne: she stands on a flying sword between moves
        if (a.ysAir && !a.act) a.airY = Math.max(a.airY, HOVER);
        const P = a.rig.parts;
        if (P.ride) P.ride.visible = !!a.ysAir;
        if (P.swords) P.swords.position.y = a.rig.rest.swords.py + Math.sin(B.real * 2.2 + a.seed) * 0.035;
      },
      swap(a, isIn, why) {
        const B = BT.B;
        if (isIn) { if (why === 'swap' && !a.ysEM && a.ysSF >= SF_MAX && B.phase === 'fight') a.queue.unshift({ def: K.entry, kind: 'quick', delay: 0.05 }); return; }
        if (a.ysEM && a.ysAir && a.alive) { a.ysAir = false; leaveStrike(a); }
      },
      // the Ultimate button in the state is her finisher (no Decibels). AUTO keeps it for when the Sword Force is
      // spent or the state is about to run out
      ult(a) {
        if (!a.ysEM || a.ysEndAfter) return null;
        if (!BT.isPlayer(a) && fuel(a) && a.ysT > 1.5) return null;
        return Object.assign(fin(a), { free: true });
      },
      resolve(a, btn, hold, c) {
        const t = c.t;
        if (btn === 'special') {
          if (!a.ysEM) return null;                                              // Guiding Tides, or Gale Suppression with 60 Energy
          if (hold) return fuel(a) ? { def: K.soar, kind: 'ex' } : fin(a);
          const L = a.ysLastT > t ? a.ysLast : null;
          if ((L === 'annih' || L === 'max' || L === 'maxpd') && fuel(a)) return { def: L === 'annih' ? K.soar1 : K.soarM, kind: 'ex' };
          if (a.ysAir) return { def: annihFor(a), kind: 'core' };
          return { def: K.clean, kind: 'special' };
        }
        if (!a.ysEM) {
          if (hold) return a.ysSF >= SF_MAX ? { def: K.entry, kind: 'quick' } : c.dash ? null : { def: K.cloud, kind: 'core' };
          if (c.dash) return null;
          if (a.ysTideT > t) return { def: K.basic[1], kind: 'basic', step: 1 };
          if (a.ysSw4T > t) return { def: K.dash, kind: 'dash' };
          return null;
        }
        if (a.ysPD && a.ysPD.until > t) return { def: a.ysPD.max ? K.max : K.ascent, kind: 'core' };
        const L = a.ysLastT > t ? a.ysLast : null;
        if (L === 'sun2') return { def: annihFor(a), kind: 'core' };
        if (L === 'annih' && a.ysSF >= 1) return { def: K.max, kind: 'core' };
        if (L === 'maxpd') return { def: K.ascent, kind: 'core' };
        if (a.ysAir) return { def: L === 'sun1' ? K.sun2 : K.sun1, kind: 'basic' };
        if (L === 'split1') return { def: K.split2, kind: 'basic' };
        if (L === 'split2') return a.ysSF >= 1 ? { def: K.ascent, kind: 'core' } : { def: K.split3, kind: 'basic' };
        return { def: K.split1, kind: 'basic' };
      },
      // AUTO: the Entry Skill at 6; in the state, Prydwen's standard loop (Sunderlight x2, Annihilation, Maximum,
      // a Soaring Light into Skyward Ascent, again), the rest of the Sword Force near the end, then the finisher
      ai(a, tgt, B) {
        if (!a.ysEM) {
          if (a.ysSF >= SF_MAX) return { btn: 'basic', hold: true };
          if (a.ysTideT > B.t || a.ysSw4T > B.t) return { btn: 'basic' };
          if ((a.cds.ysCloud || 0) <= B.t && Math.random() < 0.15 && BT.enemiesIn('circle', a.x, a.z, 4.5, 0).length >= 2) return { btn: 'basic', hold: true };
          return null;
        }
        if (a.ysPD && a.ysPD.until > B.t) return { btn: 'basic' };
        if (!fuel(a) || a.ysT < 4.5) return { btn: 'special', hold: true };
        const L = a.ysLastT > B.t ? a.ysLast : null;
        if ((L === 'max' || L === 'maxpd') && Math.random() < 0.65) return { btn: 'special' };
        return { btn: 'basic' };
      },
      hud(a) {
        const r = [`SWORD FORCE ${'◆'.repeat(a.ysSF)}${'◇'.repeat(Math.max(0, SF_MAX - a.ysSF))}${a.ysEM || a.ysSF >= SF_MAX ? '' : ` ${Math.floor(a.ysGauge * 100)}%`}${a.ysBearer ? ` · BEARER ${a.ysBearer}` : ''}`];
        if (a.ysEM) r.push(`ENLIGHTENED MIND ${Math.max(0, Math.ceil(a.ysT))}s · ${a.ysAir ? 'AIRBORNE' : 'GROUNDED'}${a.ysCulm ? ' · CULMINATION' : ''}`);
        else if (a.ysSF >= SF_MAX) r.push('HOLD BASIC: ENTRY SKILL');
        return r;
      },
    },
    town: {
      routine: ['box:cats 35, cafe:menu 25, bardic:bench 20, huddle 20', 'bardic:bench 30, 141:stall 20, box:claw 15, huddle 35', 'rp:window 30, soup:stool 25, huddle 45', 'box:statue 40, rp:night 30, alley:lean 30'],
      chatter: ['Junior! Have you eaten today?', 'Note to self... write that down.'],
      lines: [
        'Ye Shunguang of Yunkui Summit, at your service, Junior! ...Ah. I\'m supposed to say that in a Hollow, not outside a shop.',
        'Just between us, I\'m not good with bitter drinks. A barley latte, though... maybe I could be brave about one of those?',
        'I keep a diary. Everything goes in it: what I ate, what Shifu said, what you said. Especially what you said, Junior.',
      ],
      chapters: [
        { title: 'A brave sip', ask: ['Junior, um... Coff Cafe is the most famous cafe on Sixth Street, isn\'t it?', 'Could you bring me one of Tin Master\'s coffees? I\'m not good with bitter things... but if it\'s from you, I\'ll be brave!'], steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: ID }],
          scene: [['A', 'Here goes... !!'], ['P', 'Too bitter?'], ['A', 'B-bitter. Very bitter. ...I\'m drinking all of it anyway.'], ['A', 'This is going in my diary: Junior bought me coffee. It was bitter. The day was sweet.']] },
        { title: 'A very dignified cat', ask: ['Junior! There\'s a grey cat on this street who looks at everyone as if she owns it.', 'Could you ask her whether I may pet her? Politely. Cats like it when you ask politely.'], steps: [{ t: 'talk', to: 'cookie', reply: '(Cookie considers you for a long moment, then flops over and shows her belly. That seems to be a yes.)' }, { t: 'talk', to: ID }],
          scene: [['P', 'She said yes. In her way.'], ['A', 'Really? Then... gently, gently... oh, she\'s so soft!'], ['A', 'There\'s a little one at Suibian Temple called A-Shuo. I\'ll tell him he has a friend on Sixth Street now.'], ['A', 'Th-thank you, Junior. This goes in the diary too.']] },
        { title: 'A senior\'s duty', ask: ['As your senior sister at Yunkui Summit, I should show you how we fight. Properly!', 'Take me to the Summit, Junior, and clear it with me. I\'ll... I\'ll try not to trip.'], steps: [{ t: 'clear', f: { arena: 'summit', with: ID } }, { t: 'talk', to: ID }],
          scene: [['A', 'Light brings the dawn! ...See? That\'s how a senior does it.'], ['P', 'You tripped. Once.'], ['A', 'Th-that was a technique! A very advanced one!'], ['A', '...Thank you for guiding me, Junior. If anything\'s ever wrong, promise you\'ll tell me. I\'ll do the same. I\'ll try.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official splash art and the in-game render. NORMAL: very long
     chestnut hair to past her knees, a black underlayer and black locks
     framing her face, fluffy ear-like tufts flaring at the top; a white
     headband, a pair of red bows standing up behind it, little red knots
     with white tails on the side locks; red eyes. A bushy brown tail. A
     sleeveless white qipao (cloud embroidery) with a gold mandarin collar,
     a dark gold-trimmed chest panel and black frog buttons, a dark grey-navy
     sash knotted at her left, yellow hip tassels, a long front panel between
     high slits. Bare shoulders, grey metal bands round the upper arms, white
     detached sleeves from the elbow, a bangle on her left wrist, a red
     talisman ribbon lettered in white trailing from her left arm. A red cloud
     tattoo on her left thigh. Black platform ankle heels, red heels, sheer
     brown uppers, gold motifs. The jian: dark gunmetal with a scale pattern,
     a black-and-gold hilt, a red tassel.
     ENLIGHTENED MIND (MODELS.yeshunguangEM, swapped in by CHOREO.swapRig):
     silky white hair with lavender-grey shade, black underneath, one red
     front streak; the white horn of the Bai Ze; a white tail; a fanged
     smile; a grey sash; a red cloud-pattern thigh-high and red boot on her
     left leg; the Qingming Sword (dark, a white core of light, a ring
     pommel); five pale flying swords fanned behind her, and one under her
     feet when she is airborne. 162 cm. */
  const SKIN = 0xfbe3d6, EYE = 0xc4282c, LASH = 0x2a1a16, UNDER = 0x232121, STREAK = 0xbf2f27;
  const DRESS = 0xfff4eb, DRESS2 = 0xe6ded6, CLOUD = 0xd6cdc4, GOLD = 0xcc9f3d, GOLD2 = 0xa47c2a, DARK = 0x24242c, BTN = 0x141418, TASSEL = 0xe8b830;
  const SLEEVE = 0xf6f2ee, SLEEVE2 = 0xe2dcd6, METAL = 0x8a8c94, RIB = 0xd43932, RIB2 = 0x972821, WHT = 0xf8f6f2, TAT = 0x8f1010;
  const SHOE = 0x16141a, HEEL = 0x682528, UPPER = 0x7b6057, STOCK = 0xb93a2b, STOCK2 = 0x86241c;
  const HILT = 0x18181c, BLADE = 0x686b75, BLADE2 = 0x50535c, EDGE = 0x9a9ea8, TAS = 0xa72b29, STEEL = 0xc8d0dc, STEEL2 = 0x9aa2b0, SHINE = G(0xf2f6ff);
  // a pale flying sword along +Z (the hilt behind the origin): the fan, the one she rides, and the effects' swords
  function drawFly(g) {
    g.box(0, 0, -3, 0, 0, -1, 0x2a2a30); g.set(0, 0, -4, STEEL2);
    g.box(-1, 0, 0, 1, 0, 0, STEEL2); g.set(0, 1, 0, STEEL2); g.set(0, -1, 0, STEEL2);
    for (let z = 1; z <= 11; z++) { g.set(0, 0, z, SHINE); g.set(-1, 0, z, STEEL); if (z < 10) { g.set(1, 0, z, STEEL2); g.set(0, 1, z, STEEL); } }
    g.set(0, 0, 12, G(0xffffff));
  }
  {
    function build(em) {
      const HAIR = em ? 0xf6f1ec : 0x5a4130, HAIR2 = em ? 0xb4b0c4 : 0x3c2b1e, HAIRHI = em ? 0xffffff : 0x9a775a;
      const SASH = em ? 0x6a6c74 : 0x3a3f55, SASH2 = em ? 0x54565e : 0x2c3044;
      const TAIL = em ? 0xf2eee8 : 0x4d3a2c, TAIL2 = em ? 0xd2cedc : 0x3a2a1e, TIP = em ? 0xffffff : 0x8a6a50;
      const arm = s => g => {
        H.arm(g, { sleeve: SKIN, sleeveTo: 4, skin: SLEEVE, len: 8 });          // bare shoulder and upper arm, the white detached sleeve below
        g.box(-1, -2, -1, 1, -2, 1, METAL);                                        // the grey metal band round the upper arm
        g.box(-1, -4, -1, 1, -4, 1, SLEEVE2);                                      // the sleeve's top edge
        g.box(-1, -7, -1, 1, -7, 1, SKIN);                                         // her hand
        if (s > 0) g.box(-1, -6, -1, 1, -6, 1, METAL);                             // the bangle on her left wrist
      };
      const leg = left => g => {
        const stock = em && left;                                                 // Enlightened Mind: the red thigh-high and boot on her left leg
        H.leg(g, { pant: stock ? STOCK : SKIN, boot: stock ? STOCK : UPPER, bootH: 3, sole: SHOE });
        g.box(-1, -9, -1, 1, -9, 2, SHOE); g.box(-1, -8, 2, 1, -8, 2, SHOE);      // the black platform sole and toe
        g.box(-1, -9, -1, 1, -8, -1, stock ? RIB2 : HEEL);                         // the red heel
        g.box(-1, -6, -1, 1, -6, 1, stock ? STOCK2 : SHOE);                        // the ankle cuff
        g.set(0, -7, 1, GOLD);                                                     // a gold motif on the sheer upper
        if (stock) {
          g.box(-1, 0, -1, 1, 0, 1, SKIN); g.box(-1, -1, -1, 1, -1, 1, STOCK2);    // bare at the top, the stocking's band
          for (const [x, y, z] of [[1, -3, 1], [0, -4, 1], [1, -5, 0], [-1, -3, 1], [1, -2, 0]]) g.set(x, y, z, 0xd85848);   // its cloud pattern
        } else if (left) for (const [x, y, z] of [[1, -2, 1], [1, -3, 1], [0, -3, 1], [1, -4, 0], [1, -3, 0], [0, -2, 1]]) g.set(x, y, z, TAT);   // the red cloud tattoo
      };
      const extra = {
        tail: {   // the bushy tail, hanging behind her from under the dress's back panel
          parent: 'hips', at: [0, -1, -4], draw(g) {
            const P = [[0, 0, 0, 1.2], [0, -1, -1, 1.7], [0, -2.5, -2.2, 2.3], [0.5, -4, -3.2, 2.6], [1, -5.5, -3.8, 2.7], [1, -7, -4, 2.4], [0.5, -8.3, -3.8, 1.9], [0, -9.3, -3.2, 1.2]];
            P.forEach(([x, y, z, r], i) => g.ell(x, y, z, r, 1.5, r * 0.9, (X, Y, Z) => i >= 6 ? TIP : ((X + Y + Z) % 3 === 0 ? TAIL2 : TAIL)));
          },
        },
        tailL: {  // the very long hair falling down her back past her knees (a part, so it trails behind her)
          parent: 'head', at: [0, 3, -4], draw(g) {
            for (let i = 0; i <= 18; i++) {
              const w = i < 2 ? 4 : i < 13 ? 5 : 4;
              for (let x = -w; x <= w; x++) {
                if (i > 15 && (x + i) % 3 === 0) continue;                         // ragged ends
                g.set(x, -i, -1, (x * 3 + i) % 5 === 0 ? HAIR2 : i < 4 && (x === -2 || x === 1) ? HAIRHI : HAIR);
                if (Math.abs(x) < w && i > 2) g.set(x, -i, 0, em ? ((x & 1) ? UNDER : HAIR2) : UNDER);   // the black underlayer
              }
            }
          },
        },
        tailR: {  // the red talisman ribbon lettered in white, trailing from her left arm
          parent: 'armL', at: [1, -2, 0], draw(g) {
            for (let i = 0; i < 13; i++) g.set(1, -i, -Math.floor(i / 4), i >= 11 ? WHT : i % 4 === 2 ? WHT : i % 2 ? RIB : RIB2);
          },
        },
        sword: {  // in her right hand, the blade along +Z (rot: forward and down at her side, level when the arm is raised)
          parent: 'armR', at: [0, -7, 0], rot: [1.1, 0, 0], draw(g) {
            if (!em) {   // the jian: a black grip with gold bands, a black-and-gold guard, dark gunmetal scales, a red tassel
              g.box(0, 0, -3, 0, 0, 0, HILT); g.set(0, 0, -2, GOLD); g.set(0, 0, 0, GOLD); g.set(0, 0, -4, GOLD);
              g.box(-1, 0, 1, 1, 0, 1, HILT); g.set(-2, 0, 1, GOLD); g.set(2, 0, 1, GOLD); g.set(0, 1, 1, GOLD); g.set(0, -1, 1, GOLD);
              for (let z = 2; z <= 14; z++) { g.set(0, 0, z, (z & 1) ? BLADE : BLADE2); if (z <= 12) { g.set(-1, 0, z, (z & 2) ? BLADE2 : BLADE); g.set(1, 0, z, (z & 2) ? BLADE : BLADE2); } }
              g.set(0, 0, 15, EDGE); g.set(0, 0, 16, EDGE);
              g.set(0, -1, -4, GOLD); g.box(0, -4, -5, 0, -2, -5, TAS); g.set(0, -5, -5, RIB2); g.set(0, -5, -6, TAS);
            } else {     // the Qingming Sword: a ring pommel, a black orb in a silver guard, a dark blade with a core of light
              g.box(0, 0, -3, 0, 0, 0, HILT); g.set(0, 1, -5, STEEL); g.set(0, 0, -6, STEEL); g.set(0, -1, -5, STEEL); g.set(0, 0, -4, STEEL);
              g.box(-1, 0, 1, 1, 0, 1, STEEL); g.set(0, 1, 1, BTN); g.set(0, -1, 1, BTN); g.set(-2, 0, 1, STEEL2); g.set(2, 0, 1, STEEL2);
              for (let z = 2; z <= 15; z++) { g.set(0, 0, z, G(0xeef2ff)); if (z <= 13) { g.set(-1, 0, z, 0x3a3d48); g.set(1, 0, z, 0x2c2f38); } }
              g.set(0, 0, 16, G(0xffffff)); g.set(1, 0, 2, RIB); g.set(-1, 0, 3, RIB);
            }
          },
        },
      };
      if (em) {
        extra.swords = {   // the five flying swords fanned behind her
          parent: 'torso', at: [0, 4, -7], draw(g) {
            for (let k = 0; k < 5; k++) {
              const an = (k - 2) * 0.36, sx = Math.sin(an), cy = Math.cos(an), z = -Math.abs(k - 2) * 0.6;
              const P = d => [sx * 3 + sx * d, cy * 1.5 + cy * d];
              g.line(...P(0), z, ...P(2), z, HILT);                                    // the hilt
              const [gx, gy] = P(2.6); g.line(gx - cy * 1.3, gy + sx * 1.3, z, gx + cy * 1.3, gy - sx * 1.3, z, STEEL2);   // the guard
              g.line(...P(3), z, ...P(13), z, STEEL); const [ex, ey] = P(3), [fx, fy] = P(12.5); g.line(ex + 1, ey, z, fx + 1, fy, z, SHINE);   // the blade, one edge alight
              g.set(...P(14), z, G(0xffffff));
            }
          },
        };
        extra.ride = {     // the sword she stands on in the air (shown only while airborne: mech.tick)
          parent: 'hips', at: [0, -12, 0], draw(g) {
            g.box(0, 0, -7, 0, 0, -5, 0x2a2a30); g.box(-1, 0, -4, 1, 0, -4, STEEL2);
            for (let z = -3; z <= 6; z++) { g.set(0, 0, z, SHINE); g.set(-1, 0, z, STEEL); g.set(1, 0, z, STEEL2); }
            g.set(0, 0, 7, G(0xffffff));
          },
        };
      }
      return H.humanoid({
        scale: 0.07, height: 28, width: 20,
        sockets: { weapon: ['sword', [0, 0, 16]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
        hips(g) {
          g.box(-3, -2, -2, 3, 0, 1, DRESS);                                        // the qipao over the hips
          g.box(-1, -2, 2, 1, 0, 2, DRESS);
          for (let y = -3; y >= -9; y--) g.box(-1, y, 2, 1, y, 2, x => ((x + y) % 3 === 0 ? CLOUD : DRESS));   // the long front panel between the high slits...
          g.box(-1, -9, 2, 1, -9, 2, DRESS2);                                        // ...to the ankles
          for (let y = -3; y >= -8; y--) g.box(-2, y, -3, 2, y, -3, x => ((x - y) % 4 === 0 ? CLOUD : DRESS));  // the back panel
          g.set(-1, -1, 2, GOLD2); g.set(1, -1, 2, GOLD2);                           // gold piping at the slits
        },
        torso(g) {
          g.box(-2, 0, -2, 2, 2, 1, DRESS);                                         // the qipao at the waist
          g.box(-3, 3, -2, 3, 5, 1, DRESS); g.box(-2, 3, 2, 2, 4, 2, DRESS);         // bodice and bust
          g.box(-3, 6, -1, 3, 6, 0, SKIN);                                          // bare shoulders: it is sleeveless
          g.box(-1, 6, -1, 1, 6, 2, GOLD); g.set(0, 6, 2, BTN);                      // the gold mandarin collar, a black frog button
          g.box(-2, 5, 2, 2, 5, 2, DARK); g.set(-2, 5, 2, GOLD); g.set(2, 5, 2, GOLD); g.set(0, 5, 3, GOLD2); g.set(-1, 5, 3, BTN); g.set(1, 5, 3, BTN);   // the dark chest panel, gold trim, frog buttons
          for (const [x, y, z] of [[-2, 3, 2], [-1, 4, 2], [2, 3, 2], [1, 1, 1], [-1, 2, 1]]) g.set(x, y, z, CLOUD);   // cloud embroidery
          g.box(-2, 0, -2, 2, 1, 1, SASH); g.box(-2, 0, 2, 2, 1, 2, SASH);           // the sash...
          g.box(1, 0, 3, 2, 1, 3, SASH2); g.box(2, -3, 2, 2, -1, 2, SASH2);          // ...knotted at her left, the ends hanging
          for (const s of [-1, 1]) { g.set(s * 3, 0, 0, GOLD); g.box(s * 4, -4, 0, s * 4, -1, 0, TASSEL); g.set(s * 4, 0, 0, GOLD); }   // yellow tassels at the hips
        },
        head(g) {
          H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: em ? 0xb8505a : 0xd07a74, blush: em ? null : 0xf6c4bc });
          if (em) g.set(1, 0, 3, 0xffffff);                                          // the fanged smile
          H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 3], [-2, 4], [-1, 3], [0, 4], [1, 3], [2, 4], [3, 3], [4, 2]], sideTo: 2 });
          g.box(-4, -2, -4, 4, 0, -4, HAIR2);
          for (const s of [-1, 1]) {
            g.box(s * 5, -4, -3, s * 5, 5, 1, HAIR);                                 // full side hair...
            g.box(s * 5, -8, 2, s * 5, 3, 2, UNDER); g.box(s * 4, -1, 3, s * 4, 3, 3, UNDER);   // ...the black locks framing her face, down to her chest
            g.ell(s * 5.5, 6.5, -0.5, 1.4, 1.0, 1.5, HAIR);                          // the ear-like tufts flaring at the top
            g.line(s * 6, 7, -1, s * 8, 6, -1, HAIR); g.set(s * 9, 5, -1, HAIRHI); g.set(s * 8, 7, 0, HAIRHI);
            g.line(s * 2, 8, -1, s * 4, 11, -2, RIB, 0.5); g.set(s * 4, 12, -2, RIB2); g.set(s * 3, 9, -2, RIB2);   // the red bows standing up behind the headband
            g.set(s * 5, 3, 3, RIB); g.set(s * 5, 2, 3, WHT); g.set(s * 5, 1, 3, WHT);  // a red knot with white tails on each side lock
          }
          g.box(-4, 7, 1, 4, 7, 1, WHT); g.box(-4, 5, 1, -4, 6, 1, WHT); g.box(4, 5, 1, 4, 6, 1, WHT);   // the white headband across the crown
          if (em) {
            g.box(2, 4, 4, 2, 6, 4, STREAK); g.set(3, 3, 4, STREAK); g.box(5, -6, 2, 5, -2, 2, STREAK);   // the red streak at the front, her left
            const HORN = 0xf4f2f0, HORN2 = 0xd8d4e2;                                 // the white horn of the Bai Ze, curving back
            g.box(0, 8, 1, 1, 9, 1, HORN); g.set(1, 10, 0, HORN); g.set(1, 11, 0, HORN2); g.set(1, 12, -1, HORN2); g.set(0, 8, 2, RIB);
          } else { g.set(0, 8, 0, HAIR); g.set(-1, 9, -1, HAIRHI); g.set(-1, 10, -2, HAIR); }   // a stray strand on top
        },
        armL: arm(1),
        armR: arm(-1),
        legL: leg(true),
        legR: leg(false),
        extra,
      });
    }
    MODELS.yeshunguang = build(false);
    MODELS.yeshunguangEM = build(true);
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: the jian low at her right side, the left hand loose
  ANIM.READY.ysJian = { armL: [-0.25, 0, 0.35], armR: [-0.45, 0.15, -0.2], torso: [0.06, 0.15, 0], head: [0, -0.12, 0], legL: [-0.2, 0, 0.08], legR: [0.18, 0, -0.08], hipsY: -0.03 };
  ACT.ysCutR = (b, t, th, d) => stage(b, { armR: [-1.6, 0.9, -1.1], armL: [-0.4, 0, 0.6], torso: [0, 0.7, 0] }, { armR: [-1.4, -0.9, 0.7], armL: [-0.2, 0, 0.8], torso: [0.12, -0.6, 0], legL: [-0.5, 0, 0], legR: [0.35, 0, 0] }, t, th, d);
  ACT.ysCutL = (b, t, th, d) => stage(b, { armR: [-1.3, -0.9, 0.8], torso: [0, -0.6, 0] }, { armR: [-1.6, 0.8, -1.0], armL: [-0.3, 0, 0.8], torso: [0.12, 0.65, 0], legR: [-0.55, 0, 0], legL: [0.35, 0, 0] }, t, th, d);
  // a sword-spinning flourish (the combat video's)
  ACT.ysTwirl = (b, t, th, d) => add(stage(b, { armR: [-1.5, 0, -1.2], armL: [-0.6, 0, 0.9] }, { armR: [-1.5, 0, -1.4], armL: [-1.0, 0, 1.1], hipsY: -0.06 }, t, th, d), { spin: clamp(t / (th + 0.12), 0, 1) * PI * 2 });
  ACT.ysCleaveDown = (b, t, th, d) => stage(b, { armR: [-2.9, 0.3, -0.5], armL: [-2.2, 0, 0.4], torso: [-0.25, 0.3, 0], lift: 0.2 }, { armR: [-0.6, -0.4, 0.4], armL: [-0.6, 0, 0.7], torso: [0.5, -0.3, 0], legL: [-0.9, 0, 0], legR: [0.6, 0, 0], hipsY: -0.14 }, t, th, d);
  ACT.ysFlurry = (b, t) => { const k = Math.sin(t * 30); return add(b, { armR: [-1.5 + k * 0.5, k * 0.9, -0.3], armL: [-1.3, -0.3, 0.6], torso: [0.12, Math.sin(t * 15) * 0.3, 0], legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1], hipsY: -0.08 }); };
  ACT.ysLunge = (b, t, th, d) => stage(b, { armR: [-0.6, 0.3, -0.4], torso: [0, 0.5, 0], legR: [0.4, 0, 0] }, { armR: [-1.65, 0, 0.05], armL: [0.3, 0, 0.7], torso: [0.3, -0.35, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.14 }, t, th, d);
  // a leap, then the thrust (Swallow Strike, Support Guard)
  ACT.ysSwallow = (b, t, th, d) => t < th - 0.12 ? add(b, { legL: [-1.2, 0, 0.2], legR: [-0.6, 0, -0.2], armR: [-0.8, 0.3, -0.5], armL: [-0.5, 0, 0.9], torso: [-0.15, 0.4, 0] }) : ACT.ysLunge(b, t - (th - 0.12), 0.12, d - (th - 0.12));
  ACT.ysFlick = (b, t, th, d) => stage(b, { armR: [-0.9, 0.6, -0.8], torso: [0, 0.5, 0] }, { armR: [-1.5, -0.4, 0.3], torso: [-0.1, -0.4, 0], legL: [0.3, 0, 0], legR: [-0.3, 0, 0] }, t, th, d);
  // the flying sword sent off with two fingers of her left hand
  ACT.ysThrow = (b, t, th, d) => stage(b, { armL: [-2.2, -0.3, 0.6], armR: [-0.3, 0, -0.4], torso: [-0.1, -0.5, 0] }, { armL: [-1.6, 0.3, -0.1], armR: [0.2, 0, -0.6], torso: [0.15, 0.5, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0] }, t, th, d);
  ACT.ysGale = (b, t, th, d) => t < 0.45 ? ACT.ysLunge(b, t, 0.22, 0.45) : ACT.ysThrow(b, t - 0.45, 0.25, d - 0.45);
  ACT.ysSmite = (b, t, th, d) => stage(b, { armR: [-2.6, 0.9, -1.0], armL: [-1.8, 0, 0.6], torso: [-0.2, 0.9, 0], lift: 0.15, hipsY: -0.05 }, { armR: [-1.4, -1.2, 0.9], armL: [-0.4, 0, 1.0], torso: [0.25, -0.9, 0], legL: [-0.8, 0, 0.1], legR: [0.6, 0, -0.1], hipsY: -0.16 }, t, th, d);
  // Chasing Storms: the sword raised to the sky while the formation gathers, then brought down on the target
  ACT.ysStorm = (b, t, th, d) => {
    const up = add(b, { armR: [-2.95, 0, -0.25], armL: [-0.4, 0, 0.85], head: [-0.3, 0, 0], torso: [-0.12, 0, 0], lift: Math.min(1, t * 1.4) * 0.3 });
    if (t < 1.55) return up;
    return mix(up, add(b, { armR: [-1.65, 0, 0.05], armL: [-0.3, 0, 0.85], torso: [0.22, 0, 0] }), U.easeOut(clamp((t - 1.55) / 0.25, 0, 1)));
  };
  // the Entry Skill: a crouch to the sword case at her left, the Qingming Sword drawn in a rising cut
  ACT.ysDraw = (b, t, th, d) => stage(b, { armR: [-0.9, -0.8, 0.9], armL: [-0.6, -0.4, 0.5], torso: [0.35, -0.6, 0], hipsY: -0.14, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] }, { armR: [-2.9, 0.4, -0.4], armL: [-0.5, 0, 0.9], torso: [-0.3, 0.4, 0], head: [-0.25, 0, 0], lift: 0.25 }, t, th, d);
  ACT.ysParry = (b) => add(b, { armR: [-1.45, -0.9, 0.9], armL: [-0.5, 0, 0.6], torso: [0.15, -0.35, 0], hipsY: -0.1, legL: [-0.45, 0, 0], legR: [0.45, 0, 0] });
  // Enlightened Mind
  ACT.ysSunder = (b, t, th, d) => stage(b, { armR: [-3.0, 0.2, -0.4], armL: [-1.0, 0, 0.8], torso: [-0.3, 0.2, 0], legL: [-0.9, 0, 0.1], legR: [-0.3, 0, -0.1] }, { armR: [-0.7, -0.2, 0.3], armL: [-0.3, 0, 1.0], torso: [0.45, -0.2, 0], legL: [-0.5, 0, 0], legR: [0.2, 0, 0], tilt: 0.12 }, t, th, d);
  ACT.ysSunder2 = (b, t, th, d) => stage(b, { armR: [-1.8, -1.0, 0.9], torso: [-0.1, -0.6, 0], legL: [-0.8, 0, 0] }, { armR: [-1.2, 1.0, -1.0], torso: [0.3, 0.7, 0], legR: [-0.7, 0, 0], legL: [0.1, 0, 0] }, t, th, d);
  ACT.ysAnnih = (b, t, th, d) => stage(b, { armR: [-3.0, 0, -0.2], armL: [-2.4, 0, 0.3], torso: [-0.35, 0, 0], legL: [-1.1, 0, 0.2], legR: [-0.6, 0, -0.2] }, { armR: [-0.4, 0, 0.1], armL: [-0.9, 0, 0.6], torso: [0.6, 0, 0], legL: [-1.0, 0, 0], legR: [0.75, 0, 0], hipsY: -0.22 }, t, th, d);
  ACT.ysSweep = (b, t, th, d) => stage(b, { armR: [-1.5, 1.3, -1.2], armL: [-1.0, 0, 0.9], torso: [0.05, 1.1, 0], hipsY: -0.08 }, { armR: [-1.5, -1.4, 1.0], armL: [-0.5, 0, 1.2], torso: [0.15, -1.1, 0], legL: [-0.7, 0, 0.15], legR: [0.5, 0, -0.15], hipsY: -0.18 }, t, th, d);
  ACT.ysRise = (b, t, th, d) => stage(b, { armR: [-0.3, -0.5, 0.6], torso: [0.3, -0.3, 0], hipsY: -0.12, legL: [-0.5, 0, 0], legR: [0.4, 0, 0] }, { armR: [-3.0, 0.3, -0.3], armL: [-0.6, 0, 1.0], torso: [-0.35, 0.3, 0], head: [-0.3, 0, 0], legL: [-1.2, 0, 0.1], legR: [0.1, 0, 0] }, t, th, d);
  ACT.ysBackstep = (b, t, th, d) => stage(b, { armR: [-0.8, 0.8, -0.9], torso: [0.1, 0.6, 0] }, { armR: [-1.5, -0.7, 0.6], torso: [-0.25, -0.5, 0], legL: [0.5, 0, 0], legR: [-0.4, 0, 0], tilt: -0.12 }, t, th, d);
  ACT.ysSoar = (b, t) => { const k = Math.sin(t * 22); return add(b, { armR: [-1.6 + k * 0.6, k * 1.1, -0.2 * k], armL: [-1.4, -0.4, 0.5], torso: [0.15, -k * 0.5, 0], legL: [-0.6, 0, 0.12], legR: [0.45, 0, -0.12], hipsY: -0.1 }); };
  // Return to Dust: the light gathers round her raised sword, then one sweep all the way round
  ACT.ysDust = (b, t, th, d) => add(stage(b, { armR: [-2.6, -0.5, 0.3], armL: [-2.2, 0.4, 0.5], head: [-0.3, 0, 0], torso: [-0.2, 0, 0], lift: 0.25 }, { armR: [-1.5, -1.4, 1.0], armL: [-0.5, 0, 1.2], torso: [0.15, -1.1, 0], legL: [-0.7, 0, 0.15], legR: [0.5, 0, -0.15], hipsY: -0.18 }, t, th, d), { spin: clamp((t - th + 0.2) / 0.3, 0, 1) * PI * 2 });
  // Cleaving Heavens: both hands raised while the great blade comes down, then the cut
  ACT.ysCleave = (b, t, th, d) => stage(b, { armR: [-3.05, 0, -0.15], armL: [-2.8, 0, 0.2], head: [-0.35, 0, 0], torso: [-0.25, 0, 0], lift: 0.3 }, { armR: [-0.4, 0, 0.1], armL: [-0.9, 0, 0.6], torso: [0.6, 0, 0], legL: [-1.0, 0, 0], legR: [0.75, 0, 0], hipsY: -0.22 }, t, th, d);

  /* ------------------------------------------------------------- effects --
     Normal state: red and white; Enlightened Mind: pure white light (the
     combat-design video). ysArc: a two-colour slash arc; ysWave: a flying
     blade shockwave; ysFly: flying swords at the target; ysRain: the sword
     formation falling; ysGiant: Cleaving Heavens' great blade; ysCase: the
     octagonal sword case rising beside her; ysAwaken: the second look and the
     Verdict veil; ysLand, ysBurst, ysSky: impacts. */
  const E = CHOREO.events, S = CHOREO.streams;
  const cols = (a, e) => (e && e.em != null ? e.em : a.ysEM) ? [WHITE, PALE, LILAC] : [RED, WHITE, PINKR];
  let flyProto = null, caseProto = null;
  const flySword = () => { if (!flyProto) { const g = new VX.Grid(); drawFly(g); flyProto = VX.object(g, 0.07, { cast: false }); } return flyProto.clone(); };
  // the sword case: a long grey case with gold fittings, an octagonal head holding a black-and-white yin-yang disc
  function drawCase(g) {
    const GR = 0x72747a, GR2 = 0x5a5c62, DK = 0x272c2f, GD = 0xb69c51, BL = 0x16161a, WH = 0xf4f2ee;
    g.box(-3, 0, -2, 3, 15, 2, GR); g.box(-3, 0, -2, 3, 0, 2, DK);
    g.box(-2, 1, 2, 2, 14, 2, (x, y) => ((x + y * 2) % 5 === 0 ? DK : GR2));
    for (const y of [3, 12]) { g.set(-3, y, 2, GD); g.set(3, y, 2, GD); }
    const cy = 21;
    for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) {
      const ax = Math.abs(x), ay = Math.abs(y), oct = Math.max(ax, ay, (ax + ay) / 1.4);
      if (oct > 6.6) continue;
      if (oct > 5) { g.set(x, cy + y, 0, DK); g.set(x, cy + y, 1, GR); g.set(x, cy + y, -1, GR); continue; }
      const r = Math.hypot(x, y);
      if (r > 4.6) { g.set(x, cy + y, 0, BL); continue; }
      let c = x >= 0 ? WH : BL;
      if (Math.hypot(x, y - 2.3) <= 2.3) c = BL; if (Math.hypot(x, y + 2.3) <= 2.3) c = WH;
      if (Math.hypot(x, y - 2.3) <= 0.8) c = WH; if (Math.hypot(x, y + 2.3) <= 0.8) c = BL;
      g.set(x, cy + y, 1, c);
    }
    for (const [x, y] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) g.set(x, cy + y, 2, GD);
    g.set(2, cy + 1, 2, RED); g.set(3, cy, 2, RED);
  }
  const caseObj = () => { if (!caseProto) { const g = new VX.Grid(); drawCase(g); caseProto = VX.object(g, 0.07, { cast: false }); } return caseProto.clone(); };
  const tgtXZ = (a, A, tgt, d) => tgt ? [tgt.x, tgt.z] : [a.x + Math.sin(A.dir) * (d || 2.5), a.z + Math.cos(A.dir) * (d || 2.5)];

  E.ysArc = (a, A, e) => {
    const [c0, c1] = cols(a, e), dir = A.dir + (e.yaw || 0), fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.0) + (a.airY || 0), r = e.r || 2.2;
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, c0, { tilt: e.tilt || 0, arc: e.arc || 2.4, width: e.big ? 0.6 : 0.42, life: e.big ? 0.34 : 0.26, sweep: e.sweep || 0.9 });
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r * 0.86, dir, c1, { tilt: e.tilt || 0, arc: (e.arc || 2.4) * 0.92, width: 0.16, life: 0.22, sweep: e.sweep || 0.9 });
    if (e.big) { FX.glow(a.x + fx * 1.2, y, a.z + fz * 1.2, 1.8, c0, 0.18, { size1: 3 }); BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.15); }
  };
  E.ysWave = (a, A, e) => {
    const [c0, c1] = cols(a, e), dir = A.dir + (e.yaw || 0), fx = Math.sin(dir), fz = Math.cos(dir), L = e.len || 5, y = (e.y || 1.0) + (a.airY || 0) * 0.5, s = e.s || 1;
    const x0 = a.x + fx * 0.6, z0 = a.z + fz * 0.6, g = new THREE.Group(), mats = [];
    for (const [r, w, c] of [[1.0 * s, 0.3 * s, c0], [0.86 * s, 0.12 * s, c1]]) {
      const geo = new THREE.RingGeometry(r - w, r, 20, 1, -0.9, 1.8), mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2 + (e.tilt || 0); m.rotation.z = -PI / 2; g.add(m); mats.push(mat, geo);
    }
    g.rotation.y = dir; g.position.set(x0, y, z0);
    FX.custom(g, e.life || 0.3, k => { g.position.set(x0 + fx * L * k, y, z0 + fz * L * k); mats[0].opacity = mats[2].opacity = 1 - k * k; }, mats);
  };
  E.ysFly = (a, A, e, tgt) => {
    const [c0, c1] = cols(a, e), n = e.n || 1, T = e.dur || 0.22, [tx, tz] = tgtXZ(a, A, tgt, 4), lx = Math.cos(A.dir), lz = -Math.sin(A.dir);
    for (let i = 0; i < n; i++) {
      const from = new THREE.Vector3(); BT.sock(a, 'chest', from);
      const side = (i - (n - 1) / 2) * 0.7; from.x += lx * side; from.z += lz * side; from.y += 0.7 + Math.abs(side) * 0.2;
      const o = flySword(), delay = i * (e.gap || 0.05), life = delay + T, ty = 0.9;
      o.position.copy(from); o.lookAt(tx, ty, tz); o.visible = false;
      FX.custom(o, life, k => {
        const tt = k * life - delay; if (tt < 0) return;
        o.visible = true; const q = Math.min(1, tt / T);
        o.position.set(lerp(from.x, tx, q), lerp(from.y, ty, q), lerp(from.z, tz, q));
        if (Math.random() < 0.7) FX.p({ x: o.position.x, y: o.position.y, z: o.position.z, life: 0.25, size: 0.1, size1: 0.02, col: Math.random() < 0.5 ? c0 : c1 });
        if (q >= 1 && !o.userData.hit) { o.userData.hit = 1; FX.burst(tx, ty, tz, 12, { col: [c0, c1, WHITE], speed: 5, size: 0.1, life: 0.3, g: 2 }); FX.glow(tx, ty, tz, 1.4, c0, 0.18); }
      });
    }
    SFX.play('dodge');
  };
  E.ysRain = (a, A, e, tgt) => {
    const [c0, c1] = cols(a, e), [cx, cz] = tgtXZ(a, A, tgt, 3), n = e.n || 24, span = e.span || 1, R0 = e.r || 3.2, fall = 0.2;
    for (let i = 0; i < n; i++) {
      const delay = Math.random() * span, an = rnd(0, PI * 2), d = Math.sqrt(Math.random()) * R0, x = cx + Math.cos(an) * d, z = cz + Math.sin(an) * d, life = delay + fall + 0.3;
      const o = flySword(); o.rotation.set(PI / 2 + rnd(-0.15, 0.15), 0, rnd(0, PI)); o.position.set(x, 8, z); o.visible = false;
      FX.custom(o, life, k => {
        const tt = k * life - delay; if (tt < 0) return;
        o.visible = true; const q = Math.min(1, tt / fall); o.position.y = 8 - 7.3 * q;
        if (q >= 1 && !o.userData.hit) { o.userData.hit = 1; FX.burst(x, 0.2, z, 5, { col: [c0, c1], speed: 3, size: 0.08, life: 0.25, g: 4 }); FX.ring(x, z, 0.1, 0.6, c0, 0.25); }
      });
    }
    FX.ring(cx, cz, 0.5, R0, c0, span + 0.3, { a: 0.5 }); SFX.play('dodge');
  };
  E.ysGiant = (a, A, e, tgt) => {
    const [x, z] = tgtXZ(a, A, tgt, 3), T = e.dur || 1.2, o = flySword();
    o.scale.setScalar(6); o.rotation.set(PI / 2, 0, rnd(0, PI)); o.position.set(x, 16, z);
    FX.custom(o, T + 0.5, k => {
      const q = Math.min(1, k * (T + 0.5) / T); o.position.y = 16 - 10.8 * q * q;
      if (q < 1 && Math.random() < 0.6) FX.p({ x: x + rnd(-0.5, 0.5), y: o.position.y - rnd(0, 4), z: z + rnd(-0.5, 0.5), vy: 2, life: 0.3, size: 0.16, size1: 0.03, col: U.pick([WHITE, PALE]) });
      if (q >= 1 && !o.userData.hit) { o.userData.hit = 1; FX.pillar(x, z, 1.4, 9, PALE, 0.5); }
    });
    FX.glow(x, 6, z, 4, WHITE, T, { size1: 6, a: 0.4 }); FX.ring(x, z, 0.5, 5, PALE, T, { a: 0.5 });
  };
  E.ysCase = (a, A, e) => {
    const o = caseObj(), f = a.face, x = a.x + Math.cos(f) * 1.1 - Math.sin(f) * 0.2, z = a.z - Math.sin(f) * 1.1 - Math.cos(f) * 0.2, life = e.dur || 1.0;
    o.rotation.y = f; o.position.set(x, -2, z);
    FX.custom(o, life, k => {
      const down = k > 0.8 ? (k - 0.8) / 0.2 : 0;
      o.position.y = -2 * (1 - U.easeOut(Math.min(1, k * 6))) - 2.2 * down * down;
      if (k > 0.25 && k < 0.75 && Math.random() < 0.5) FX.p({ x: x + rnd(-0.3, 0.3), y: 1.5 + rnd(-0.3, 0.3), z: z + rnd(-0.3, 0.3), vy: rnd(0.5, 2), life: 0.4, size: 0.1, col: U.pick([WHITE, PALE, RED]) });
    });
    FX.ring(x, z, 0.2, 1.2, WHITE, 0.35); FX.glow(x, 1.5, z, 1.8, WHITE, 0.4, { size1: 3 });
  };
  E.ysAwaken = a => {
    if (a.ysEM) { look(a, true); veilRing(a); }
    const y = 1.1 + (a.airY || 0);
    FX.glow(a.x, y, a.z, 3.6, WHITE, 0.4, { size1: 6.5 });
    FX.burst(a.x, y, a.z, 46, { col: [WHITE, PALE, LILAC], speed: 7, size: 0.13, size1: 0.03, life: 0.6, g: 1 });
    FX.ring(a.x, a.z, 0.4, 7, WHITE, 0.7, { a: 0.8 }); FX.ring(a.x, a.z, 0.3, 4.5, PALE, 0.55);
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.25); SFX.play('perfect');
  };
  E.ysLand = (a, A, e) => {
    const [c0, c1, c2] = cols(a, e), x = e.x != null ? e.x : a.x + Math.sin(A.dir) * 0.8, z = e.z != null ? e.z : a.z + Math.cos(A.dir) * 0.8, r = e.r || 2;
    FX.ring(x, z, 0.3, r, c0, 0.4); FX.ring(x, z, 0.2, r * 0.6, c1, 0.3, { y: 0.07 });
    FX.burst(x, 0.3, z, e.big ? 40 : 18, { col: [c0, c1, c2], speed: e.big ? 7 : 5, size: 0.12, size1: 0.03, life: 0.5, g: 4, up: 2 });
    FX.named('quake', { x, z, r: r * 0.8 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.32 : 0.16);
  };
  E.ysBurst = (a, A, e, tgt) => {
    const [c0, c1, c2] = cols(a, e), [x, z] = e.self || !tgt ? [a.x, a.z] : [tgt.x, tgt.z], r = e.r || 2;
    FX.glow(x, 1, z, r * (e.big ? 1.3 : 0.8), c0, e.big ? 0.4 : 0.22, { size1: r * 2 });
    FX.ring(x, z, 0.3, r, c0, 0.4); if (e.big) FX.ring(x, z, 0.3, r * 0.65, c1, 0.35, { y: 0.08 });
    FX.burst(x, 0.9, z, e.big ? 50 : 16, { col: [c0, c1, c2, WHITE], speed: e.big ? 8 : 5, size: 0.13, size1: 0.03, life: 0.55, g: 2, up: 1 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.4 : 0.12); if (e.big) SFX.play('boom');
  };
  E.ysSky = (a, A, e, tgt) => {
    const [x, z] = tgtXZ(a, A, tgt);
    FX.beam(new THREE.Vector3(x, 10, z), new THREE.Vector3(x, 0.2, z), WHITE, 0.4, 0.3); FX.beam(new THREE.Vector3(x, 10, z), new THREE.Vector3(x, 0.2, z), PALE, 0.9, 0.22);
    FX.pillar(x, z, 0.6, 8, PALE, 0.35); E.ysBurst(a, A, { r: e.r || 3, big: true, em: e.em }, tgt);
  };
  S.ysTrail = (a, A, s, dt) => { const n = Math.max(1, Math.round(dt * 90)), [c0, c1] = cols(a, s); for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.25, 0.25), y: rnd(0.4, 1.6) + (a.airY || 0), z: a.z + rnd(-0.25, 0.25), vy: rnd(-0.3, 0.6), life: 0.35, size: 0.12, size1: 0.02, col: Math.random() < 0.5 ? c0 : c1 }); };
  S.ysGather = (a, A, s) => { const [c0, c1] = cols(a, s); for (let i = 0; i < 3; i++) { const an = rnd(0, PI * 2), r = rnd(2, 4); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.3, 2.4), z: a.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.6, vz: -Math.sin(an) * r * 2.6, life: 0.36, size: 0.12, size1: 0.02, col: Math.random() < 0.5 ? c0 : c1 }); } };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const arc = (t, o) => Object.assign({ t, fx: 'ysArc' }, o || {});
  const wave = (t, o) => Object.assign({ t, fx: 'ysWave' }, o || {});
  const after = (t0, t1, col) => ({ t0, t1, kind: 'afterimage', col });
  // the normal state
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.45 }], events: [arc(0.14, { tilt: -0.35 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.5 }], events: [arc(0.16, { tilt: 0.55 })] });
  set(K.basic[2], { motion: [{ t0: 0.04, t1: 0.2, kind: 'fwd', d: 0.35 }], events: [arc(0.22, { arc: 5.8, sweep: 2.6, y: 0.9 })] });
  set(K.basic[3], { motion: [{ t0: 0.06, t1: 0.34, kind: 'leap', h: 0.5, d: 0.9 }], events: [arc(0.34, { tilt: 1.15, r: 2.6, big: true }), wave(0.36, { len: 4, tilt: 1.15 }), { t: 0.34, fx: 'ysLand', r: 1.6 }] });
  set(K.cloud, { events: K.cloud.hits.map((h, i) => wave(h.t, { tilt: i % 2 ? 0.6 : -0.6, len: 5.5, s: 0.8, life: 0.25 })) });
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.0 }], stream: [after(0, 0.2, PINKR)], events: [arc(0.22, { tilt: -0.2 })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.08, kind: 'side', d: 0.8, side: 'auto' }, { t0: 0.08, t1: 0.34, kind: 'leap', h: 1.1, toTarget: true }], stream: [after(0, 0.3, PINKR)], events: [{ t: 0.34, fx: 'thrustLine', col: RED, len: 3.6 }, { t: 0.34, fx: 'ysLand', r: 1.4 }] });
  set(K.special, { motion: [{ t0: 0, t1: 0.14, kind: 'back', d: 0.5 }], events: [wave(0.16, { len: 5, tilt: -0.4 })] });
  set(K.tides, { events: [{ t: 0.06, fx: 'ysFly', dur: 0.22 }, { t: 0.3, fx: 'ysBurst', r: 1.6 }] });
  set(K.ex, { motion: [{ t0: 0.06, t1: 0.26, kind: 'toTarget', gap: -1.2 }], stream: [after(0.06, 0.3, PINKR), { t0: 0.06, t1: 0.3, kind: 'ysTrail' }], events: [arc(0.22, { tilt: -0.2, big: true }), { t: 0.56, fx: 'ysFly', n: 3, dur: 0.24, gap: 0.03 }, { t: 0.82, fx: 'ysBurst', r: 2.6, big: true }] });
  set(K.smite, { motion: [{ t0: 0.3, t1: 0.7, kind: 'fwd', d: 0.6 }], events: [arc(0.75, { r: 4.2, arc: 3.4, big: true }), wave(0.78, { len: 6, s: 2 }), { t: 0.75, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 1.85, t1: 2.15, kind: 'rise', h: HOVER }], events: [{ t: 0.05, fx: 'ysCase', dur: 1.2 }, { t: 0.45, fx: 'ysAwaken' }, { t: 0.7, fx: 'ysRain', n: 36, span: 1.05, r: 3.6 }, { t: 1.8, fx: 'ysBurst', r: 4.6, big: true }, { t: 1.8, fx: 'whiteFlash' }] });
  set(K.entry, { motion: [{ t0: 0.62, t1: 0.9, kind: 'rise', h: 0.6 }], events: [{ t: 0.02, fx: 'ysCase', dur: 0.8 }, { t: 0.35, fx: 'ysAwaken' }, arc(0.6, { r: 4.4, arc: 3.6, big: true, tilt: 1.3 }), wave(0.62, { len: 6, s: 2.2, tilt: 1.3 }), { t: 0.6, fx: 'whiteFlash' }] });
  set(K.guard, { motion: [{ t0: 0, t1: 0.3, kind: 'leap', h: 1.0, toTarget: true }], stream: [after(0, 0.28, PINKR)], events: [{ t: 0.3, fx: 'thrustLine', col: RED, len: 3.4 }] });
  set(K.cease, { motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.0 }], events: [arc(0.2, { tilt: -0.4 }), arc(0.45, { tilt: 1.1, big: true, r: 3 }), wave(0.47, { len: 4.5 })] });
  // Enlightened Mind: fast dashing slashes, several changes of position
  set(K.sun1, { motion: [{ t0: 0, t1: 0.14, kind: 'toTarget', gap: 1.1 }, { t0: 0, t1: 0.12, kind: 'rise', h: 0.95 }], stream: [{ t0: 0, t1: 0.15, kind: 'ysTrail' }], events: [arc(0.18, { tilt: 1.25, y: 1.2 })] });
  set(K.sun2, { motion: [{ t0: 0, t1: 0.15, kind: 'orbit', ang: 0.9, gap: 1.1 }], stream: [after(0, 0.15, PALE)], events: [arc(0.18, { tilt: -1.25, y: 1.2 }), wave(0.2, { len: 3, tilt: -1.25, s: 0.8 })] });
  set(K.annih, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 0.9 }, { t0: 0, t1: 0.16, kind: 'rise', h: 1.7 }, { t0: 0.18, t1: 0.36, kind: 'fall' }], events: [arc(0.36, { tilt: 1.4, r: 3, big: true }), { t: 0.36, fx: 'ysLand', r: 3.2, big: true }, { t: 0.36, fx: 'whiteFlash' }] });
  set(K.annih0, { motion: [{ t0: 0, t1: 0.3, kind: 'fall' }], events: [arc(0.3, { tilt: 1.4 }), { t: 0.3, fx: 'ysLand', r: 2.2 }] });
  set(K.max, { events: [arc(0.32, { r: 3.4, arc: 4.4, sweep: 2.2, big: true, tilt: 0.05 }), arc(0.34, { r: 2.8, arc: 4.2, sweep: 2.2, tilt: -0.15 }), { t: 0.32, fx: 'ysLand', r: 3.6 }] });
  set(K.split1, { motion: [{ t0: 0, t1: 0.13, kind: 'toTarget', gap: 1.0 }], stream: [after(0, 0.13, PALE)], events: [arc(0.15, { tilt: -0.3 })] });
  set(K.split2, { motion: [{ t0: 0, t1: 0.16, kind: 'orbit', ang: 1.2, gap: 1.0 }], stream: [after(0, 0.16, PALE)], events: [arc(0.18, { tilt: 0.5 })] });
  set(K.split3, { motion: [{ t0: 0.04, t1: 0.24, kind: 'toTarget', gap: -1.4 }], stream: [after(0.04, 0.24, PALE), { t0: 0.04, t1: 0.24, kind: 'ysTrail' }], events: [arc(0.24, { tilt: -0.1, big: true }), { t: 0.24, fx: 'thrustLine', col: WHITE, len: 4 }] });
  set(K.ascent, { motion: [{ t0: 0.04, t1: 0.3, kind: 'rise', h: 1.1 }], stream: [{ t0: 0, t1: 0.3, kind: 'ysTrail' }], events: [arc(0.18, { tilt: 1.5, r: 2.3 })] });
  set(K.clean, { motion: [{ t0: 0.1, t1: 0.34, kind: 'back', d: 1.5 }], stream: [after(0.1, 0.34, PALE)], events: [arc(0.12, { tilt: -0.5 })] });
  set(K.soar, { motion: [{ t0: 0, t1: 0.15, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 1.3, kind: 'ysTrail' }],
    events: K.soar.hits.map((h, i) => arc(h.t, { tilt: i % 2 ? 0.9 : -0.9, r: 2.2 })).concat(K.soar.hits.map(h => ({ t: h.t, fx: 'ysBurst', r: 1.2 }))) });
  for (const k of ['soar1', 'soarM']) set(K[k], { motion: [{ t0: 0, t1: 0.14, kind: 'toTarget', gap: 1.0 }], events: [arc(0.18, { tilt: -0.6, big: true }), { t: 0.18, fx: 'ysBurst', r: 1.4 }] });
  set(K.dust, { motion: [{ t0: 0, t1: 0.25, kind: 'fall' }], stream: [{ t0: 0.1, t1: 0.95, kind: 'ysGather' }], events: [arc(1.0, { arc: 6.2, sweep: 3, r: 4.6, big: true }), { t: 1.0, fx: 'ysBurst', self: true, r: 5, big: true }, { t: 1.0, fx: 'whiteFlash' }] });
  set(K.cleave, { motion: [{ t0: 0, t1: 0.25, kind: 'fall' }], stream: [{ t0: 0.1, t1: 1.3, kind: 'ysGather' }], events: [{ t: 0.3, fx: 'ysGiant', dur: 1.3 }, { t: 1.6, fx: 'ysBurst', r: 5, big: true }, { t: 1.6, fx: 'whiteFlash' }] });
  set(K.lure, { motion: [{ t0: 0.75, t1: 1.05, kind: 'rise', h: 0.8 }], events: [arc(0.6, { r: 4.2, arc: 3.4, big: true }), { t: 0.58, fx: 'ysSky', r: 3 }, { t: 0.6, fx: 'whiteFlash' }] });
  set(K.tactical, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [after(0, 0.22, PALE)], events: [arc(0.24, { tilt: -0.3 })] });
  set(K.unify, { motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.0 }], events: [arc(0.45, { r: 3.2, big: true }), { t: 0.45, fx: 'ysLand', r: 3 }] });
})();
