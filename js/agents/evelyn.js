/* ============================================================================
   agents/evelyn.js -- Evelyn Chevalier, Stars of Lyra: manager and personal
   bodyguard of the singer Astra Yao (Odeum HAE); once an operative of a
   shadowy "organization" (former codename Scheele's Green). S-Rank, Fire,
   Attack, Defensive Assist. Released in Version 1.5 ("Astra-nomical Moment").
   (The hooks and helpers an Agent's file can use are listed in zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Evelyn Chevalier, Lore, Dialogue, DMs,
   Voice-Overs, Fashion, Media; the Character Intro and Gameplay Details
   tutorials; the Quality Time events Order in Order, Financial Products,
   Outstanding Concert, Workout Time, Girl of the Same Name, Unlovedboo,
   Nothing Wanted, Thriller Movie, No Match for Her; the trust commissions
   Facial Recognition, Together as Promised, Unknown Letter, All for Show),
   zzz.gachabase.net (datamine, game data 3.4.2: per-hit multipliers, Anomaly
   Buildup, stats, the move list), the official portrait, in-game models,
   "Behind the Agent" art and skill previews; a search summary of Prydwen's
   guide (Burning Embers: up to 16, and what some moves give) and Game8's.

   Her kit (official):
     Basic Attack: Razor Wire         5 hits: knife cuts and a kick (hits 1-3,
                                      Physical), then the Lunalux Garrote (4-5,
                                      Fire). The 5th hit binds the main target:
                                      Binding Seal.
     Passive: Bind                    her damaging moves build Burning Embers;
                                      spending them on Garrote, or Decibels on
                                      her Ultimate, gives 1 Burning Tether
                                      Point. With 3, her next Garrote spends
                                      them all on a lower-Interrupt-Level
                                      Chain Attack: Lunalux - Snare.
     Basic Attack: Garrote - First Form / - Second Form   at 50% Embers or
                                      more, hold Basic or Special (keep holding
                                      for the Second Form): each spends 50%
                                      Embers; Anti-Interrupt, DMG taken -40%.
     Dash Attack: Piercing Ambush     a kick (Physical)
     Dodge Counter: Strangling Reversal   a garrote slash round her; binds
     Special Attack: Locked Position  (not in Binding Seal; Special or EX)
                                      the garrote pulls the enemy in, a
                                      charging kick; binds. Anti-Interrupt.
     Special Attack: Binding Sunder - First Form   (in Binding Seal) centred
                                      on the bound target, tethers the enemies
                                      round it and detonates; the Seal ends.
                                      It dodges as it starts: a Perfect Dodge
                                      gives 25% more Embers. Basic after the
                                      tether cancels the detonation into the
                                      Basic Attack's 3rd hit; held, Garrote.
     EX Special Attack: Binding Sunder - Final Form (60 Energy) the same,
                                      pulling the enemies in; invulnerable.
     Chain Attack: Lunalux - Snare / Ultimate: Lunalux Garrote - Timbre:
                                      many garrotes slash ahead, an explosion;
                                      binds. Timbre takes off her jacket for
                                      the battle: Dance of Awakened Fire (the
                                      Ultimate is then Lunalux Garrote -
                                      Shadow, and Snare keeps 1 Tether Point).
     Quick Assist: Fierce Blade (binds)   Defensive Assist: Silent Protection
     Assist Follow-Up: Course Disruption  a slash, an explosion ahead; binds
     Core Passive: Entangle           in Binding Seal, CRIT Rate +25% (kept
                                      10 s after); switched out while in it,
                                      she follows up with Binding Sunder -
                                      First Form by herself.
     Additional Ability: Ambush Point with a Stun or Support Agent: Chain
                                      Attack and Ultimate DMG +30%; at 80% CRIT
                                      Rate or more, Snare, Timbre and Shadow
                                      hit with 125% of their multipliers.
   Our choices (no source gives them): Burning Embers counted 0-16 (Prydwen's
   "up to 16"; 50% = 8). What a move gives: Prydwen's table for Locked
   Position (1), Binding Sunder (1), Final Form (8), the Dodge Counter (1) and
   the Perfect Dodge (4 = 25%); ours for the rest (Basic hits 1-3 and the
   cancel hit 1, hits 4-5 2, Dash Attack 1, Quick Assist 1, Follow-Up 2,
   Chain Attack and Ultimate none: they give Tether Points). The Snare that
   replaces a Garrote also pays the Garrote's 50% Embers, and is not heavy
   ("lower Interrupt Level": it opens no Chain). Binding Seal lasts until the
   detonation or the target falls. The dodge at a Binding Sunder's start is
   its first 0.3 s (a Perfect Dodge inside the game's window). Anti-Interrupt
   with no DMG reduction is a token dr 0.05. The sub-hit splits of the Chain
   Attack, Ultimate and Follow-Up. Her CRIT Rate here (49%, +25% in Binding
   Seal) reaches Ambush Point's 80% only with a CRIT Rate buff from elsewhere.
   Mindscapes are not modelled.
   Numbers: official level-12 values x0.45 DMG, x0.6 Daze; Anomaly Buildup as
   datamined (/100); the parry's Daze is the official value.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, lerp, ang, dist } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // the burning garrote in the official clips: red-orange wire, white-hot cores, crimson and rose, a few violet sparks
  const WIRE = 0xff5a36, FLAME = 0xff8a3a, HOT = 0xfff0d6, CRIM = 0xd8283a, ROSE = 0xff7a9a, VIO = 0xb070ff, STEEL = 0xdfe6f0;
  const SPARK = [0xffffff, HOT, FLAME, WIRE, CRIM, ROSE];
  const EMB_MAX = 16, EMB_HALF = 8, EMB_PD = 4;       // Burning Embers (Prydwen: up to 16; 50% = 8; a Perfect Dodge 25% = 4)
  const CORE_CR = 0.25, CORE_KEEP = 10;               // Entangle (core level 7)
  const AMB_DMG = 0.3, AMB_CR = 0.8, AMB_X = 1.25;    // Ambush Point
  const EVADE = 0.3;                                  // Binding Sunder's dodge as it starts (our choice)

  /* ----------------------------------------------------------------- kit --
     emb: the Burning Embers a move gives (on its first landed hit); bind: the
     hit that binds the main target in Binding Seal; garrote: a move that
     spends half her Embers; sunder: a Binding Sunder (centred on the bound
     target; its last hit is the detonation). */
  const BASIC = 'Basic Attack: Razor Wire';
  const K = {
    basic: [
      { name: BASIC, anim: 'evCutR', dur: 0.4, cancel: 0.28, reach: 1.8, range: 1.6, emb: 1, hits: [hit(0.14, 102.9, 38.8, 0, { attr: 'physical', arc: 140 })] },
      { name: BASIC, anim: 'evCutL', dur: 0.44, cancel: 0.32, reach: 1.8, range: 1.6, emb: 1, hits: [hit(0.16, 124.8, 81.3, 0, { attr: 'physical', arc: 150 })] },
      { name: BASIC, anim: 'spinKick', dur: 0.52, cancel: 0.4, reach: 2.0, range: 1.7, emb: 1, hits: [hit(0.2, 157.4, 94.0, 0, { attr: 'physical', shape: 'circle', at: 'self', r: 2.2 })] },
      { name: BASIC, anim: 'evLash', dur: 0.6, cancel: 0.46, reach: 2.8, range: 2.2, emb: 2, hits: [hit(0.24, 373.7, 230.0, 139.03, { arc: 170, r: 3.0 })] },
      { name: BASIC, anim: 'evThrowPull', dur: 0.8, cancel: 0.62, reach: 4.0, range: 2.6, emb: 2, hits: [hit(0.32, 447.8, 253.0, 152.91, { heavy: true, shape: 'line', r: 1.0, len: 4.6, kb: 0.2, bind: true })] },
    ],
    // a Binding Sunder cancelled by Basic: the 3rd hit, in Fire (the move list: "Binding Sunder canceling explosion")
    cut3: { name: BASIC, anim: 'spinKick', dur: 0.52, cancel: 0.4, reach: 2.0, range: 1.7, emb: 1, hits: [hit(0.2, 157.4, 94.0, 0, { shape: 'circle', at: 'self', r: 2.4 })] },
    garrote1: { name: 'Basic Attack: Garrote - First Form', anim: 'evGarrote1', dur: 0.8, cancel: 0.66, reach: 3.2, range: 2.4, dr: 0.4, garrote: true,
      hits: [hit(0.34, 453.0, 182.7, 110.03, { arc: 210, r: 3.8, kb: 0.5 })] },
    garrote2: { name: 'Basic Attack: Garrote - Second Form', anim: 'evGarrote2', dur: 0.86, cancel: 0.7, reach: 3.2, range: 2.4, dr: 0.4, garrote: true,
      hits: [hit(0.36, 490.5, 187.5, 113.36, { shape: 'circle', at: 'front', r: 3.3, kb: 0.6 })] },
    dash: { name: 'Dash Attack: Piercing Ambush', anim: 'kick', dur: 0.5, cancel: 0.38, reach: 7, emb: 1, hits: [hit(0.22, 121.0, 45.7, 0, { attr: 'physical' })] },
    counter: { name: 'Dodge Counter: Strangling Reversal', anim: 'evSpinLash', dur: 0.72, cancel: 0.56, inv: [0, 0.66], emb: 1,
      hits: [hit(0.28, 421.4, 281.7, 70.03, { heavy: true, shape: 'circle', at: 'self', r: 3.0, kb: 0.5, bind: true })] },
    locked: { name: 'Special Attack: Locked Position', anim: 'evLocked', dur: 0.62, cancel: 0.48, reach: 5.5, range: 3.0, dr: 0.05, cd: 2, emb: 1,
      hits: [hit(0.3, 105.1, 78.7, 47.48, { arc: 130, bind: true })] },
    // Binding Sunder: the tether (its "Bind" hit), then the detonation, both centred on the bound target (mech.start aims it)
    special: { name: 'Special Attack: Binding Sunder - First Form', anim: 'evSunder', dur: 0.95, cancel: 0.42, reach: 12, range: 3.0, dr: 0.05, cd: 1.5, emb: 1, sunder: true,
      hits: [hit(0.36, 81.1, 61.3, 36.64, { shape: 'circle', at: 'target', r: 3.5 }), hit(0.7, 68.1, 51.6, 30.84, { shape: 'circle', at: 'target', r: 3.5, kb: 0.4 })] },
    ex: { name: 'EX Special Attack: Binding Sunder - Final Form', anim: 'evSunderEx', dur: 1.25, cancel: 0.52, cost: 60, reach: 12, range: 3.0, inv: [EVADE, 1.2], emb: 8, sunder: true,
      hits: [hit(0.46, 1082.4, 656.0, 444.62, { heavy: true, shape: 'circle', at: 'target', r: 4.0 }), hit(0.95, 120.1, 90.4, 56.2, { heavy: true, shape: 'circle', at: 'target', r: 4.0, kb: 0.8 })] },
    // Lunalux - Snare: three garrote slashes ahead, then the explosion
    chain: { name: 'Chain Attack: Lunalux - Snare', anim: 'evSnare', dur: 1.4, inv: [0, 1.4], track: 0.95,
      hits: [0.3, 0.45, 0.6].map((t, i) => hit(t, 1658.7 * 0.15, 355.4 * 0.15, 290.17 * 0.15, Object.assign({ arc: 150, r: 4.0 }, i === 0 ? { bind: true } : {})))
        .concat([hit(0.95, 1658.7 * 0.55, 355.4 * 0.55, 290.17 * 0.55, { heavy: true, shape: 'circle', at: 'target', r: 3.6, kb: 1.0 })]) },
    ult: { name: 'Ultimate: Lunalux Garrote - Timbre', anim: 'evUlt', dur: 2.2, inv: [0, 2.2], track: 1.7,
      hits: [0.55, 0.7, 0.85, 1.0, 1.15, 1.3].map((t, i) => hit(t, 3977.3 * 0.08, 391.3 * 0.08, 236.7 * 0.08, Object.assign({ shape: 'circle', at: 'target', r: 4.2 }, i === 0 ? { bind: true } : {})))
        .concat([hit(1.7, 3977.3 * 0.52, 391.3 * 0.52, 236.7 * 0.52, { heavy: true, shape: 'circle', at: 'target', r: 4.8, kb: 1.6 })]) },
    // Silent Protection: the official Daze is 407.7% on a light blow, 514.4% on a heavy one (the parry's own x1.2 comes close), 250.4% in a chain
    assist: { name: 'Defensive Assist: Silent Protection', type: 'defensive', anim: 'evParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Course Disruption', anim: 'evFollow', dur: 1.0, inv: [0, 0.95], emb: 2,
      hits: [hit(0.24, 584.2 * 0.35, 374.4 * 0.35, 245.67 * 0.35, { arc: 160, r: 2.8, bind: true }), hit(0.62, 584.2 * 0.65, 374.4 * 0.65, 245.67 * 0.65, { heavy: true, shape: 'circle', at: 'front', r: 3.2, kb: 0.9 })] },
    quick: { name: 'Quick Assist: Fierce Blade', anim: 'evSpinLash', dur: 0.7, inv: [0, 0.62], emb: 1,
      hits: [hit(0.28, 155.2, 116.7, 70.03, { shape: 'circle', at: 'self', r: 3.0, kb: 0.4, bind: true })] },
  };
  // Lunalux - Snare from 3 Burning Tether Points (a Garrote turned Chain Attack): the same, at a lower Interrupt Level (no heavy hit)
  K.snare = Object.assign({}, K.chain, { hits: K.chain.hits.map(h => Object.assign({}, h, { heavy: false })), garrote: true });
  // Dance of Awakened Fire: her Ultimate is Lunalux Garrote - Shadow (the same numbers)
  K.shadow = Object.assign({}, K.ult, { name: 'Ultimate: Lunalux Garrote - Shadow' });

  /* --------------------------------- Burning Embers, Binding Seal, rules -- */
  const fielded = a => BT.fielded().includes(a);
  const sealed = a => !!(a.evSeal && a.evSeal.alive);
  const critOn = a => sealed(a) || a.evCrT > BT.B.t;                       // Entangle
  const critRate = a => a.st.cr + (critOn(a) ? CORE_CR : 0);
  const garroteNext = a => (a.evTP >= 3 ? K.snare : K.garrote1);
  function gainEmb(a, n) { if (n > 0) a.evEmb = Math.min(EMB_MAX, a.evEmb + n); }
  function seal(a, v) {
    const B = BT.B, was = a.evSeal;
    a.evSeal = v; a.evCrT = 0;
    if (was !== v) {
      wrapFx(v);
      if (!was || !was.alive) BT.log(`Evelyn: Binding Seal on ${v.def.name} (Entangle: CRIT Rate +25%).`, 'skill');
    }
    if (B && !a.evSealTold) { a.evSealTold = true; BT.callout('BINDING SEAL', 'skill', 'Evelyn · Special: Binding Sunder'); }
  }
  function endSeal(a) {
    if (!a.evSeal) return;
    a.evSeal = null; a.evCrT = BT.B.t + CORE_KEEP;
  }
  // Ambush Point at 80% CRIT Rate: the same move with 125% of its multipliers (made once, after the choreography below)
  const boosted = new Map();
  function boost(def) {
    if (!boosted.has(def)) boosted.set(def, Object.assign({}, def, { hits: def.hits.map(h => Object.assign({}, h, { mult: Math.round(h.mult * AMB_X) })) }));
    return boosted.get(def);
  }
  // the next move, queued in place of the one running (the Second Form, Snare, the cancel into the 3rd hit)
  function follow(a, def, tgt, kind, step) {
    BT.endAct(a); a.gap = 0;
    a.queue.unshift(Object.assign({ def, kind: kind || (def === K.snare ? 'chain' : 'core'), tgt: tgt && tgt.alive ? tgt : null, delay: 0 }, step != null ? { step } : {}));
  }
  // a Binding Sunder's dodge: a Perfect Dodge inside the game's window (+25% Burning Embers), any later blow simply misses
  function sunderDodge(a, e, A) {
    const B = BT.B, T = BT.T;
    if (A.t <= T.perfectWin + 0.02 && !A.data.evPD) {
      A.data.evPD = true; gainEmb(a, EMB_PD); B.stats.perfect++;
      BT.emit('perfect', { a, e }); BT.say(a, 'perfect_dodge'); SFX.play('perfect');
      BT.callout('PERFECT DODGE', 'perfect', 'Binding Sunder · +25% Burning Embers');
      B.slow = { s: 0.3, t: 0.5 }; BT.gainDecibels(a, 150); BT.gainEnergy(a, 4);
      FX.glow(a.x, 1.1, a.z, 2.2, 0x9ad8ff, 0.35, { size1: 3.5 });
      BT.log('Evelyn: Perfect Dodge in Binding Sunder (+25% Burning Embers).', 'perfect');
    } else if (T.dmgNumbers) FX.number(a.x, a.height, a.z, 'MISS', 'miss');
  }
  // Entangle: switched out in Binding Seal, she stays behind a moment for Binding Sunder - First Form (Trigger's way: seen, not on the field)
  function autoSunder(a) {
    const B = BT.B, v = a.evSeal, def = K.special;
    if (!sealed(a) || a.evGhost) return;
    const d = ang(a, v);
    a.x += Math.cos(d) * 1.3; a.z -= Math.sin(d) * 1.3;                     // a step aside from whoever came in
    a.face = ang(a, v); a.airY = 0; a.obj.visible = true;
    a.evGhost = { t0: B.t, v, n: 0, A: { def, kind: 'special', t: 0, hi: 0, tgt: v, dir: a.face, fired: {}, data: { auto: true } } };
    Object.assign(a.anim, { state: 'act', t: 0, th: def.hits[0].t, dur: def.dur, act: { anim: def.anim } });
    BT.log('Evelyn: switched out in Binding Seal: Binding Sunder - First Form follows by itself (Entangle).', 'skill');
    BT.callout('BINDING SUNDER', 'skill', 'Evelyn · Entangle');
  }
  function stepGhost(a, on) {
    const B = BT.B, Gh = a.evGhost, def = Gh.A.def, v = Gh.v;
    if (on) { a.evGhost = null; return; }                                    // back on the field: she simply fights on
    const t = B.t - Gh.t0; Gh.A.t = t; a.anim.t = t;
    if (v.alive) a.face = ang(a, v);
    while (Gh.n < def.hits.length && t >= def.hits[Gh.n].t) {
      const h = def.hits[Gh.n++], x = v.x, z = v.z;
      Gh.A.dir = a.face; Gh.A.hi = Gh.n;
      if (Gh.n === 1) E.evTether(a, Gh.A, { r: h.r }, v); else E.evBlast(a, Gh.A, { r: h.r }, v);
      for (const e of BT.enemiesIn('circle', x, z, h.r, 0)) BT.applyHit(a, e, h, Gh.A, 'fire');
    }
    if (t >= def.dur || B.result) {
      a.evGhost = null; endSeal(a);
      if (!fielded(a)) { a.obj.visible = false; a.anim.state = 'idle'; a.anim.act = null; FX.burst(a.x, 1, a.z, 12, { col: [0xffffff, WIRE], speed: 3, size: 0.1, life: 0.3, g: -2 }); }
    }
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.evelyn = {
    id: 'evelyn', name: 'Evelyn Chevalier', short: 'Evelyn', faction: 'Stars of Lyra', spec: 'Attack', attr: 'fire', rank: 'S',
    color: '#e2c98e', color2: '#b3283a', assist: 'defensive', stance: 'garrote',
    blurb: 'Astra Yao\'s manager and personal bodyguard, once an operative raised by a shadowy "organization" under names like Scheele\'s Green: no one gets closer to Miss Yao than she does. Her Lunalux Garrote is a burning wire tipped with a Porcelume blade: she binds a target in Binding Seal, tethers its neighbours and detonates them, and spends her Burning Embers on Garrote until her Tether Points turn it into a Chain Attack.',
    // HP 7,788 x1.12, DEF 612 x1.07; ATK 929 with core x3.37; CRIT 19.4% with core + 0.3, 50% + 0.4
    // CRIT Rate 55% (not the scale rule's 49%): with her core's +25% while a target is bound she reaches the 80% her
    // Additional Ability's ×1.25 asks for, as a built Evelyn does. Our choice.
    stats: { hp: 8720, atk: 3130, def: 655, impact: 93, ap: 90, am: 92, cr: 0.55, cd: 0.9, er: 1.2, speed: 4.8 },
    ai: { range: 2.0, dodge: 0.82, reflex: 0.66, aggr: 1.0 },
    energyMax: 120, resource: 'embers',
    core: [
      ['Core Passive: Entangle', 'Entering Binding Seal raises her CRIT Rate by 25%, and she keeps it for 10 s after the Seal ends. Switched out while in Binding Seal, she follows up with Special Attack: Binding Sunder - First Form by herself.'],
      ['Burning Embers and Garrote', 'Her moves build Burning Embers (up to 16). At half or more, hold Basic or Special for Garrote - First Form, and keep holding for the Second Form: each spends half her Embers (Anti-Interrupt, 40% less DMG taken) and gives 1 Burning Tether Point, as her Ultimate does. With 3 Points, her next Garrote is Chain Attack: Lunalux - Snare instead.'],
      ['Binding Seal', 'Her string\'s 5th hit, Special Attack: Locked Position, her Dodge Counter, assists, Chain Attack and Ultimate bind the main target in Binding Seal. Sealed, Special is Binding Sunder (with 60 Energy the EX, Final Form, which pulls the enemies in): it dodges as it starts (a Perfect Dodge: +25% Embers), tethers the enemies round the target and detonates, ending the Seal. Basic before the detonation cancels it into her string\'s 3rd hit; held, Garrote.'],
      ['Dance of Awakened Fire', 'Her first Ultimate, Lunalux Garrote - Timbre, takes off her jacket for the rest of the battle: her Ultimate becomes Lunalux Garrote - Shadow, and Lunalux - Snare keeps 1 Burning Tether Point.'],
      ['Additional Ability: Ambush Point', 'With a Stun or Support Agent in the squad: Chain Attack and Ultimate DMG +30%, and at 80% CRIT Rate or more, Lunalux - Snare, Timbre and Shadow hit with 125% of their multipliers.'],
    ],
    kit: K,
    kitShow: [['Hold', 'garrote1'], ['Hold', 'garrote2'], ['Special', 'locked'], ['3 Tether', 'snare'], ['Dance', 'shadow']],
    rivalMoves: [{ k: 'garrote1', kind: 'core', p: 0.2, cd: 6 }, { k: 'locked', kind: 'special', p: 0.15, cd: 5 }],
    howto: 'Evelyn: her moves fill Burning Embers; at half, hold Basic or Special for Garrote (keep holding for the Second Form), each a Burning Tether Point, and at 3 Points the next Garrote is her Chain Attack, Lunalux - Snare. Her string\'s 5th hit, Special (Locked Position), Dodge Counter and assists bind the target in Binding Seal (+25% CRIT Rate); sealed, Special is Binding Sunder (the EX with Energy), which dodges as it starts and detonates round the target; Basic before the blast cancels it into her string, and a switch-out sets it off by itself. Her assist is a Defensive Assist.',
    mech: {
      init(a) {
        Object.assign(a, { evEmb: 0, evTP: 0, evSeal: null, evCrT: 0, evDance: false, evGhost: null, evTetherT: 0, evAmb: false, evSealTold: false });
        const P = a.rig && a.rig.parts; if (P && P.coat) P.coat.visible = true;
      },
      // Ambush Point: another squad member is a Stun or Support Agent
      squad(a, B) { a.evAmb = B.squad.some(s => s !== a && (s.def.spec === 'Stun' || s.def.spec === 'Support')); },
      start(a, def, A) {
        // Binding Sunder goes off round the bound target, wherever she aims; AUTO decides what it does after the tether
        if (def.sunder) {
          if (sealed(a)) { A.tgt = a.evSeal; A.dir = ang(a, A.tgt); }
          A.data.evPlan = a.evEmb >= EMB_HALF && Math.random() < 0.55 ? 'garrote' : Math.random() < 0.35 ? 'cut' : 'boom';
        }
        // Garrote (and the Snare that takes its place) spends half the Embers; a Tether Point, or all of them for the Snare
        if (def.garrote) {
          a.evEmb = Math.max(0, a.evEmb - EMB_HALF);
          if (def === K.snare) {
            a.evTP = a.evDance ? 1 : 0;
            BT.say(a, 'chain'); BT.callout('LUNALUX - SNARE', 'skill', 'Evelyn · 3 Burning Tether Points');
            BT.log(`Evelyn: 3 Burning Tether Points: Chain Attack: Lunalux - Snare${a.evDance ? ' (Dance of Awakened Fire: 1 Point kept)' : ''}.`, 'chain');
          } else { a.evTP = Math.min(3, a.evTP + 1); BT.log(`Evelyn: ${def.name} (Burning Tether Point ${a.evTP}/3).`, 'skill'); }
          A.data.evMore = def === K.garrote1 && Math.random() < 0.75;          // (AUTO keeps holding for the Second Form)
        }
        // her Ultimate: a Tether Point; the first one takes off her jacket for the battle
        if (A.kind === 'ult') {
          a.evTP = Math.min(3, a.evTP + 1);
          if (!a.evDance) {
            a.evDance = true; danceFx(a);
            BT.callout('DANCE OF AWAKENED FIRE', 'skill', 'Evelyn · Ultimate: Lunalux Garrote - Shadow');
            BT.log('Evelyn takes off her jacket: Dance of Awakened Fire (for the battle). Her Ultimate is now Lunalux Garrote - Shadow, and Lunalux - Snare keeps 1 Burning Tether Point.', 'skill');
          }
        }
        // Ambush Point at 80% CRIT Rate: 125% of the multipliers
        if (a.evAmb && (def === K.chain || def === K.snare || def === K.ult || def === K.shadow) && critRate(a) >= AMB_CR) { A.def = boost(def); A.data.evX = true; }
      },
      hit(a, v, h, A) {
        const D0 = A.data || (A.data = {});
        // Burning Embers: once a move, on its first landed hit
        if (A.def.emb && !D0.evEmb) { D0.evEmb = true; gainEmb(a, A.def.emb); }
        // the binding hit: the main target (or, until it is struck, the first one hit)
        if (h.bind && v.alive) {
          if (!D0.evBound) { seal(a, v); D0.evBound = v === A.tgt ? 2 : 1; }
          else if (D0.evBound === 1 && v === A.tgt) { seal(a, v); D0.evBound = 2; }
        }
      },
      // Entangle's CRIT Rate; Ambush Point's Chain Attack and Ultimate DMG
      mods(a, v, h, A) {
        return { cr: critOn(a) ? CORE_CR : 0, dmg: a.evAmb && A && (A.kind === 'chain' || A.kind === 'ult') ? AMB_DMG : 0 };
      },
      // her Ultimate at MAXIMUM Decibels: Timbre, or Shadow in the Dance of Awakened Fire
      ult(a) { return a.decibels >= D.RULES.decibelMax ? { def: a.evDance ? K.shadow : K.ult, kind: 'ult' } : null; },
      swap(a, isIn) {
        if (isIn) { if (a.evGhost) a.evGhost = null; return; }
        if (a.alive && sealed(a) && BT.B.phase === 'fight') autoSunder(a);
      },
      // Binding Sunder's dodge as it starts
      incoming(a, e) {
        const A = a.act;
        if (!A || !A.def.sunder || A.t > EVADE) return false;
        sunderDodge(a, e, A); return true;
      },
      tick(a, dt, on) {
        const B = BT.B, t = B.t, A = a.act;
        if (!a.alive) return;
        if (a.evSeal && !a.evSeal.alive) endSeal(a);
        if (a.evGhost) stepGhost(a, on);
        const P = a.rig.parts; if (P.coat) P.coat.visible = !a.evDance;        // Dance of Awakened Fire: the jacket is off
        if (A && A.data) {
          // Binding Sunder: the detonation ends the Seal; AUTO cancels it into the 3rd hit, or holds for Garrote, after the tether
          if (A.def.sunder) {
            if (A.hi >= A.def.hits.length && !A.data.evDet) { A.data.evDet = true; endSeal(a); }
            else if (A.hi >= 1 && A.t >= A.def.cancel && !A.data.evDone && !BT.isPlayer(a)) {
              A.data.evDone = true;
              if (A.data.evPlan === 'garrote' && a.evEmb >= EMB_HALF) follow(a, garroteNext(a), A.tgt);
              else if (A.data.evPlan === 'cut') follow(a, K.cut3, A.tgt, 'basic', 2);
            }
          }
          // Garrote - First Form, still held: the Second Form (the Snare, with 3 Tether Points)
          else if (A.def === K.garrote1 && A.t >= A.def.cancel && !A.data.evNext) {
            A.data.evNext = true;
            const held = BT.isPlayer(a) ? BT.btnHeld('basic') || BT.btnHeld('special') : A.data.evMore;
            if (held && a.evEmb >= EMB_HALF) follow(a, a.evTP >= 3 ? K.snare : K.garrote2, A.tgt);
          }
        }
        // the wire to the bound target; embers round her in the Dance of Awakened Fire
        if (on && a.obj.visible) {
          const v = a.evSeal;
          if (sealed(a) && t >= a.evTetherT && dist(a, v) < 14) {
            a.evTetherT = t + 0.1;
            BT.sock(a, 'weapon', _v);
            FX.beam(_v.clone(), V(v.x, (v.height || 1.6) * 0.55, v.z), WIRE, 0.035, 0.13);
          }
          if (a.evDance && Math.random() < dt * 12) {
            const an = rnd(0, PI * 2), r = rnd(0.3, 0.8);
            FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.2, 1.4) + (a.airY || 0), z: a.z + Math.sin(an) * r, vy: rnd(0.6, 1.4), drag: 1, life: 0.55, size: 0.09, size1: 0.02, col: U.pick(SPARK) });
          }
        }
      },
      // Basic or Special held at half Embers: Garrote (the Snare with 3 Tether Points). Special: Locked Position, or in
      // Binding Seal Binding Sunder (the EX with the Energy). Basic during a Binding Sunder, after its tether: the 3rd hit
      resolve(a, btn, hold, c) {
        const A = a.act, inSunder = !!(A && A.def.sunder && A.hi >= 1 && A.hi < A.def.hits.length);
        if (hold && a.evEmb >= EMB_HALF) { const d = garroteNext(a); return { def: d, kind: d === K.snare ? 'chain' : 'core' }; }
        if (btn === 'basic') return inSunder ? { def: K.cut3, kind: 'basic', step: 2 } : null;
        if (inSunder) return BT.isPlayer(a) ? { def: null, kind: 'special' } : null;   // (pressed again before the blast: it goes off)
        if (sealed(a)) return a.energy >= K.ex.cost ? { def: K.ex, kind: 'ex' } : { def: K.special, kind: 'special' };
        return { def: K.locked, kind: 'special' };
      },
      // AUTO: Garrote at half Embers (always with 3 Tether Points, a bound target or full Embers); Binding Sunder once bound;
      // Locked Position to bind
      ai(a, tgt, B) {
        const sd = sealed(a), cdOk = (a.cds.special || 0) <= B.t;
        if (a.evEmb >= EMB_HALF && (a.evTP >= 3 || sd || a.evEmb >= EMB_MAX || Math.random() < 0.3)) return { btn: 'basic', hold: true };
        if (sd && cdOk && Math.random() < 0.35) return { btn: 'special' };
        if (!sd && cdOk && Math.random() < 0.22) return { btn: 'special' };
        return null;
      },
      hud(a, B) {
        const t = B.t, n = Math.round(clamp(a.evEmb / 2, 0, 8));
        const r = [`BURNING EMBERS ${'▮'.repeat(n)}${'▯'.repeat(8 - n)} ${Math.round(a.evEmb / EMB_MAX * 100)}%`];
        r.push(`TETHER ${'◆'.repeat(a.evTP)}${'◇'.repeat(3 - a.evTP)}${a.evEmb >= EMB_HALF ? (a.evTP >= 3 ? ' · HOLD: LUNALUX - SNARE' : ' · HOLD: GARROTE') : ''}`);
        if (sealed(a)) r.push(`BINDING SEAL · ${a.evSeal.def.name.toUpperCase()} · CRIT +25%`);
        else if (a.evCrT > t) r.push(`ENTANGLE · CRIT +25% ${Math.ceil(a.evCrT - t)}s`);
        if (a.evDance) r.push('DANCE OF AWAKENED FIRE');
        return r;
      },
    },
    town: {
      // Lumina Square: seven of her trust and Quality Time events happen here (High Ambitions, the alley cats, the
      // Galleria, Gravity Cinema, facial recognition among the regulars, a night out, a letter at the 141) and her trust
      // event at Sān-Z STUDIO; the square's own research found her at Coff Cafe, the playground and JC Pharmacy too
      home: 'lumina',
      // the metro entrance and the Galleria by day (where she meets you), Coff Cafe; Gravity Cinema (Miss Yao's work),
      // the 141, JC Pharmacy and Eve's pigeons in the afternoon; Simmer (Miss Yao's favourite), the playground, the HIA
      // in the evening; the riverside at night
      routine: ['metro:wait 25, gal:door 25, cafe:t 20, huddle 30', 'cin:poster 25, 141:stall 15, jc:window 15, news:read 15, huddle 30', 'simmer:queue 25, play:bench 25, hia:door 20, huddle 30', 'river:rail 50, river:bench 30, metro:wait 20'],
      chatter: ['Ten o\'clock. ...No threat. Just overtime.', 'Miss Yao forgot lunch again, I expect.'],
      lines: [
        'Evelyn Chevalier. Miss Yao\'s manager, and her bodyguard. Relax: I filed you under "non-threat" a long time ago.',
        'I\'m logging every regular on this square. The man with the briefcase walking in circles: overtime, not a threat. The one living in the trash can, I only found out about recently.',
        'Have you noticed the cats in Lumina Square are fatter than anywhere else? I\'m drafting a charity program. Miss Yao, a fitness challenge, cats as dumbbells. It would trend.',
      ],
      chapters: [
        { title: 'Girl of the same name', ask: ['Miss Yao says the newsstand manager here shares my name. Eve. Apparently a "very fashionable girl."', 'Last time I went to the wrong newsstand and introduced myself to a dog called Howl. Would you... make the introduction for me, Manager?'],
          steps: [{ t: 'talk', to: 'eve', reply: 'Evelyn? Astra Yao\'s manager? Tell her the Eves of Lumina Square stick together. And that her singer\'s poster sells out every week.' }, { t: 'talk', to: 'evelyn' }],
          scene: [['P', 'She says the Eves of Lumina Square stick together.'], ['A', '...Then it\'s official. Good.'], ['A', 'Saying my own name to a stranger feels strange. I\'ve answered to a lot of names.'], ['P', 'This one suits you.'], ['A', 'I think so too. Next time I\'ll buy a paper from her. Two, actually. One of them has Miss Yao\'s poster in it.']] },
        { title: 'Order in order', ask: ['Miss Yao forgets to eat whenever she\'s busy, so I keep something in my bag for her. Today I\'m stuck reviewing a contract.', 'Pick something up from the 141 and take it to her, would you? Anything. I always order from the top of the menu down, so I never have to choose.'],
          steps: [{ t: 'buy', item: 'jerky' }, { t: 'bring', item: 'jerky', to: 'astra', reply: 'Jerky? Eve sent you, didn\'t she. She always knows when I\'ve skipped lunch... Tell her thank you! Actually, don\'t. She\'ll look smug about it~' }, { t: 'talk', to: 'evelyn' }],
          scene: [['A', 'She ate it? All of it? ...Good.'], ['P', 'She says you worry too much.'], ['A', 'She says that every day. Then she forgets lunch every day.'], ['A', 'Too many choices are a headache. What to eat, what to order...'], ['A', '...Who to spend a day off with. That one, I\'ve already decided.']] },
        { title: 'Scheele\'s Green', ask: ['A letter was waiting for me at the 141. No sender, and the paper is Scheele\'s Green. Someone wants me to know they remember who I used to be.', 'Whoever sent it works out of the Hollow, and I\'d rather meet the past head-on. Put me at the front of your squad, Manager.'],
          steps: [{ t: 'clear', f: { enc: 'elite', lead: 'evelyn' } }, { t: 'talk', to: 'evelyn' }],
          scene: [['A', 'Threat neutralized. Whoever sent that letter will hear about this.'], ['P', 'Are you all right?'], ['A', 'My past is far less glamorous than you\'d think. One day I\'ll tell you all of it. I hope you\'ll still look at me the same way.'], ['A', 'I have new goals now. A new life. People I want to protect.'], ['A', 'Miss Yao. ...And you.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, the in-game combat and city models and the
     "Behind the Agent" sheets: blonde hair, a side-swept fringe over her left
     eye and face-framing locks, the back braided across her head into a low
     chignon with a gold moth pin and a grey ring at the nape; lavender eyes,
     a beauty mark under her right eye, a gold drop earring on her right ear.
     A black choker with a gold stud, a white sleeveless shirt with a high
     collar, a silver ring and gold moth clasp on an olive-gold tie; a dark
     brown harness framing the bust and an under-bust band. Glossy black
     high-waisted trousers (a plum cast) with a silver zip and buttons, a
     belt, a silver ring at her right hip, a strap with a long buckle round
     her right thigh; pointed black ankle boots with gold toes and straps.
     Bare arms: a black band round the right upper arm, a long black glove on
     the left, red gloves on both hands. A long black coat draped over her
     shoulders, the crimson lining showing, gold stripes at the hem (she takes
     it off in the Dance of Awakened Fire: the 'coat' part).
     LUNALUX GARROTE ("Behind the Agent" art): a folding knife, an angular
     black handle with a triangular cut-out and silver pivot screws, a curved
     silver thumb hook, a broad silver blade with a slot and serrations; its
     wire runs from her glove. 173 cm: scale 0.074. */
  {
    const HAIR = 0xe6d29e, HAIR2 = 0xcdb57a, HAIR3 = 0xb39a62, HAIRHI = 0xf2e6c4;
    const SKIN = 0xfae5d8, EYE = 0x6c67a3, LASH = 0x3a2e2a, MOUTH = 0xd8928a, MOLE = 0xa8786c;
    const GOLD = 0xc0a776, GOLD2 = 0x8b7a4e, PEARL = 0xf0ead8, GREY = 0x6a6e76, CHOKER = 0x1e1f26;
    const SHIRT = 0xf7f5f6, SHIRT2 = 0xdedede, TIE = 0xb8a050, TIE2 = 0x8b7f58, STRAP = 0x3b3036, STRAP2 = 0x594f4a;
    const PANTS = 0x2a2331, PANTS2 = 0x403b4a, SEAM = 0x1a141f, BELT = 0x372f38, SILVER = 0xb8bec8, SILVER2 = 0x9da2b4;
    const COAT = 0x1b181e, COAT2 = 0x3b373f, LINING = 0x6e1a25, LINING2 = 0x8a242c;
    const GLOVE = 0x883230, GLOVE2 = 0x5a1c1e, SLEEVE = 0x2a262a, ARMBAND = 0x241e2d;
    const BOOT = 0x2e2d35, BOOT2 = 0x4a494f, TOE = 0xa18854, SOLE = 0x18161b;
    const HANDLE = 0x26262b, HANDLE2 = 0x45454d, BLADE = 0xc8cfdc, BLADE2 = 0x959fb5;
    // a leg: the glossy trousers (a sheen, the criss-cross seams), the pointed ankle boot with its straps and gold toe
    const leg = (s, strap) => g => {
      H.leg(g, { pant: PANTS, boot: BOOT, bootH: 3, sole: SOLE });
      for (let y = -8; y <= -1; y++) g.set(s, y, 1, y % 3 === 0 ? SEAM : PANTS2);   // the sheen down the outer front, a seam across it
      g.set(-s, -4, 1, SEAM); g.set(0, -5, 1, SEAM); g.set(s, -6, 1, SEAM);          // the seams crossing the shin
      g.box(-1, -9, 2, 1, -9, 2, TOE); g.set(0, -8, 2, TOE);                       // the gold pointed toe
      g.set(-1, -7, 1, BOOT2); g.set(1, -7, 1, BOOT2); g.set(0, -8, 1, BOOT2);     // the boot's crossed straps
      g.set(0, -9, -2, BOOT);                                                       // the heel
      if (strap) { g.box(-1, -2, -1, 1, -2, 1, STRAP); g.set(-1, -2, 2, SILVER2); g.set(0, -2, 2, SILVER); }   // the thigh strap, its long buckle
    };
    MODELS.evelyn = H.humanoid({
      scale: 0.074, height: 28, width: 20,
      sockets: { weapon: ['blade', [0, 0, 6]], off: ['armL', [0, -8, 0]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, PANTS);                                         // the high-waisted trousers
        g.box(-3, 0, -2, 3, 0, 1, BELT); g.set(1, 0, 2, SILVER);                   // the belt, its buckle
        g.set(-1, -1, 2, SILVER); g.set(-1, -2, 2, SILVER2);                       // the silver zip
        g.set(-4, -1, 0, SILVER); g.set(-4, -3, 0, SILVER); g.set(-4, -2, -1, SILVER); g.set(-4, -2, 1, SILVER);   // the silver ring at her right hip...
        g.set(-4, -4, 0, SILVER2); g.set(-4, -5, -1, SILVER2);                     // ...a loose end of wire from it
        g.box(3, -2, -1, 4, -1, 0, STRAP);                                          // a small dark pouch at her left hip
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 1, 1, PANTS); g.box(-1, 0, 2, -1, 1, 2, PANTS2);        // the trousers come up to her ribs
        g.set(1, 0, 2, SILVER); g.set(1, 1, 2, SILVER); g.set(-1, 1, 2, SILVER2);  // the front buttons
        g.box(-3, 2, -2, 3, 2, 1, STRAP); g.box(-2, 2, 2, 2, 2, 2, STRAP);          // the under-bust band of the harness
        g.box(-3, 3, -2, 3, 6, 1, SHIRT); g.box(-3, 3, -2, 3, 3, -2, SHIRT2);       // the white sleeveless shirt
        g.box(-2, 3, 2, 2, 5, 2, SHIRT); g.box(-2, 3, 2, 2, 3, 2, SHIRT2);          // the bust
        g.box(-3, 6, -1, -3, 6, 1, SKIN); g.box(3, 6, -1, 3, 6, 1, SKIN);           // bare shoulders (the armholes cut in)
        for (const s of [-1, 1]) { g.set(2 * s, 3, 3, STRAP); g.set(2 * s, 4, 3, STRAP); g.set(2 * s, 5, 3, STRAP2); }   // the harness straps framing the bust
        g.box(-2, 6, 2, 2, 6, 2, SHIRT); g.box(-1, 6, 2, 1, 6, 2, CHOKER);          // the high collar; the black choker inside it
        g.set(0, 6, 3, GOLD); g.set(0, 5, 3, SILVER);                               // its gold stud; the silver ring at the collar
        g.set(-1, 5, 3, GOLD); g.set(1, 5, 3, GOLD);                                // the gold moth clasp's wings
        g.set(0, 4, 3, TIE); g.set(0, 3, 3, TIE); g.set(0, 2, 3, TIE2); g.set(0, 1, 2, TIE2);   // the olive-gold tie, to the waist
        for (const [x, y] of [[-2, 5], [-1, 4], [1, 4], [2, 5], [0, 3]]) g.set(x, y, -2, STRAP);   // the harness crossing her back
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        g.set(-2, 1, 3, MOLE);                                                      // the beauty mark under her right eye
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 3], [-3, 4], [-2, 4], [-1, 4], [0, 3], [1, 3], [2, 2], [3, 2], [4, 1]], sideTo: 2 });   // the fringe swept over her left eye
        g.set(-1, 6, 4, HAIRHI); g.set(1, 7, 3, HAIRHI); g.set(2, 5, 4, HAIRHI); g.set(-3, 7, 2, HAIRHI);   // light on the crown and fringe
        g.box(4, -2, 3, 4, 3, 3, HAIR); g.set(5, 0, 2, HAIR2); g.set(5, 1, 2, HAIR2);     // the long lock framing the left of her face
        g.box(-4, 0, 3, -4, 3, 3, HAIR2);                                           // the shorter one on the right, tucked behind the ear
        for (let x = -4; x <= 4; x++) { g.set(x, 5, -5, (x & 1) ? HAIR2 : HAIRHI); g.set(x, 4, -5, (x & 1) ? HAIR : HAIR3); }   // the braid across the back of her head
        g.ell(0, 1, -6, 2.6, 2.0, 1.4, HAIR); g.box(-1, 0, -8, 1, 2, -8, HAIR2); g.set(0, 3, -7, HAIR3);   // the low chignon
        g.set(-3, 4, -6, GOLD); g.set(-4, 5, -6, GOLD); g.set(-4, 3, -6, GOLD2); g.set(-2, 3, -6, GOLD2);   // the gold moth pin in the braid
        g.set(-3, 0, -5, GREY); g.set(-4, 0, -5, GREY); g.set(-4, 1, -5, GREY);     // the grey ring at the nape
        g.set(-5, 2, 0, GOLD); g.set(-5, 1, 0, GOLD); g.set(-5, 1, 1, PEARL);       // the gold drop earring, her right ear
      },
      // her right arm bare, a black band round it; a red glove
      armR(g) {
        H.arm(g, { sleeve: SKIN, sleeveTo: 0, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
        g.box(-1, -2, -1, 1, -2, 1, ARMBAND);
        g.set(0, -7, 1, GLOVE2); g.set(0, -6, -2, HANDLE); g.set(0, -7, -2, SILVER);   // the dark knuckles; the garrote's spool at the back of the wrist
      },
      // her left: a long black glove to above the elbow, the hand red
      armL(g) {
        H.arm(g, { sleeve: SKIN, sleeveTo: 0, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
        g.box(-1, -5, -1, 1, -1, 1, SLEEVE); g.box(-1, -1, -1, 1, -1, 1, GLOVE2);   // the long glove, its dark red top edge
        g.set(0, -7, 1, GLOVE2);
      },
      legR: leg(-1, true),
      legL: leg(1, false),
      extra: {
        // the long black coat over her shoulders: the crimson lining at the open front and inside, gold stripes at the hem
        // (drawn round her, never through her: it sits on the shoulders at y 1, behind the back at z -3/-4, out at x 7)
        coat: {
          parent: 'torso', at: [0, 6, 0], draw(g) {
            g.box(-7, 1, -2, -4, 1, 1, COAT); g.box(4, 1, -2, 7, 1, 1, COAT);      // over the shoulders
            g.box(-3, 0, -3, 3, 0, -3, COAT); g.box(-6, 0, -4, 6, 0, -4, COAT);    // the collar at the back of her neck, the yoke
            g.box(-6, 0, 2, -4, 0, 2, COAT); g.box(4, 0, 2, 6, 0, 2, COAT);        // the lapels...
            g.box(-6, -1, 2, -4, -1, 2, LINING2); g.box(4, -1, 2, 6, -1, 2, LINING2);   // ...turned, the red showing
            for (const s of [-1, 1]) { g.box(s * 7, 0, -3, s * 7, 0, 1, COAT); g.set(s * 7, 0, 2, LINING2); }
            for (let y = -1; y >= -14; y--) {
              const w = y < -9 ? 7 : 6;
              g.box(-w, y, -4, w, y, -4, (x) => (Math.abs(x) === 3 && y < -4 ? COAT2 : COAT));   // the back, falling to her knees (two folds)
              g.box(-w + 1, y, -3, w - 1, y, -3, LINING);                                     // the lining behind her
              for (const s of [-1, 1]) {
                g.box(s * 7, y, -3, s * 7, y, 1, COAT);                                       // the sides, draped from the shoulders
                g.set(s * 7, y, 2, LINING2);                                                  // the open front edge, red
                if (y <= -9) g.box(s * 6, y, -2, s * 6, y, 1, LINING);                        // the lining inside, below her hands
              }
            }
            for (const y of [-12, -13]) for (const s of [-1, 1]) { g.box(s * 7, y, -2, s * 7, y, 0, (y & 1) ? GOLD : GOLD2); }   // the gold stripes at the hem
            for (let x = -7; x <= 7; x += 2) g.set(x, -14, -4, GOLD2);
          },
        },
        // the Lunalux Garrote's knife in her right hand, blade forward
        blade: {
          parent: 'armR', at: [0, -7, 1], rot: [0.6, 0, 0], draw(g) {
            g.box(0, -1, -2, 0, -1, 1, HANDLE); g.box(0, 1, -2, 0, 1, 1, HANDLE);   // the angular black handle...
            g.set(0, 0, -2, HANDLE); g.set(0, 0, 0, HANDLE2); g.set(0, 0, 1, HANDLE);   // ...its triangular cut-out (0, 0, -1)
            g.set(1, 0, 1, SILVER); g.set(-1, 0, 1, SILVER);                        // the pivot screws
            g.set(0, 2, 0, SILVER); g.set(0, 3, -1, SILVER);                        // the curved thumb hook
            for (let z = 2; z <= 6; z++) { g.set(0, 0, z, BLADE); if (z < 6) g.set(0, -1, z, BLADE2); }   // the broad silver blade
            g.set(0, 1, 2, BLADE); g.set(0, 1, 3, BLADE2); g.set(0, 1, 4, BLADE);   // its spine, serrated
            g.set(0, -1, 3, HANDLE2);                                               // the slot
            g.set(0, 0, 7, BLADE); g.set(0, 1, 6, BLADE2);                          // the point
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     Her stance: upright and composed, the knife low in her right hand. Razor
     Wire: a forehand and a backhand cut, a spinning kick, then the garrote:
     lashed out burning, thrown to bind and pulled back. Garrote: great
     sweeping arcs of fire. Binding Sunder: a step back out of the blow, the
     wires drawn taut, a sharp yank that sets them off. */
  ANIM.READY.garrote = { armL: [-0.3, 0.2, 0.3], armR: [-0.62, 0.2, -0.22], torso: [0.08, 0.25, 0], head: [0, -0.2, 0], legL: [-0.28, 0, 0.08], legR: [0.22, 0, -0.06], hipsY: -0.04 };
  const back = (p, b, t, d, k0) => (t < d * k0 ? p : mix(p, b, U.ease(clamp((t - d * k0) / (d * (1 - k0)), 0, 1))));
  ACT.evCutR = (b, t, th, d) => stage(b, { armR: [-1.9, 0.3, -1.0], torso: [0, 0.6, 0] }, { armR: [-1.2, -0.4, 0.9], torso: [0.12, -0.5, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0] }, t, th, d);
  ACT.evCutL = (b, t, th, d) => stage(b, { armR: [-1.3, -0.5, 0.9], torso: [0, -0.5, 0] }, { armR: [-1.6, 0.4, -1.0], torso: [0.1, 0.6, 0], legR: [-0.4, 0, 0], legL: [0.3, 0, 0] }, t, th, d);
  // the garrote lashed out in a burning arc
  ACT.evLash = (b, t, th, d) => stage(b, { armR: [-2.6, 0.2, -0.6], armL: [-0.5, 0, 0.6], torso: [-0.2, 0.7, 0] }, { armR: [-0.9, -0.5, 0.6], armL: [-0.3, 0, 1.0], torso: [0.25, -0.6, 0], legL: [-0.6, 0, 0], legR: [0.45, 0, 0], hipsY: -0.08 }, t, th, d);
  // thrown to bind (the knife flies out on its wire), then pulled back hard
  const PULL = { armR: [-0.4, 0.3, -0.5], armL: [-0.9, 0, 0.5], torso: [-0.25, 0.3, 0], legL: [0.35, 0, 0], legR: [-0.55, 0, 0], hipsY: -0.06 };
  ACT.evThrowPull = (b, t, th, d) => (t < th + 0.04
    ? stage(b, { armR: [-2.5, 0, -0.4], torso: [-0.15, 0.5, 0] }, { armR: [-1.65, 0, 0.1], torso: [0.25, -0.3, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0] }, t, th, d)
    : back(add(b, PULL), b, t, d, 0.72));
  // Garrote - First Form: one great arc from high on her right down across her
  ACT.evGarrote1 = (b, t, th, d) => stage(b, { armR: [-2.8, 0.4, -0.8], armL: [-1.2, 0, 1.0], torso: [-0.25, 0.9, 0], hipsY: -0.02 }, { armR: [-0.8, -0.6, 1.0], armL: [-0.4, 0, 1.2], torso: [0.35, -0.9, 0], legL: [-0.9, 0, 0.1], legR: [0.7, 0, -0.1], hipsY: -0.16 }, t, th, d);
  // Garrote - Second Form: she turns once with it and brings it round the other way
  ACT.evGarrote2 = (b, t, th, d) => add(stage(b, { armR: [-1.4, 0, -1.4], armL: [-1.3, 0, 1.3], torso: [0, -0.4, 0], lift: 0.1 }, { armR: [-1.0, 0.5, -0.9], armL: [-0.6, 0, 1.3], torso: [0.3, 0.7, 0], legL: [0.5, 0, 0], legR: [-0.8, 0, 0], hipsY: -0.16 }, t, th, d), { spin: U.easeOut(clamp(t / (th + 0.06), 0, 1)) * PI * 2 });
  // Strangling Reversal / Fierce Blade: a turn with the wire out, slashing all round her
  ACT.evSpinLash = (b, t, th, d) => back(add(b, { armR: [-1.45, 0, -1.4], armL: [-1.3, 0, 1.3], torso: [0.12, 0, 0], hipsY: -0.1, legL: [-0.4, 0, 0.15], legR: [0.3, 0, -0.15], spin: U.easeOut(clamp(t / (th + 0.12), 0, 1)) * PI * 2 }), b, t, d, 0.7);
  ACT.evParry = b => add(b, { armR: [-1.6, 0.4, 0.4], armL: [-1.4, -0.4, -0.4], torso: [0.1, 0, 0], hipsY: -0.1, legL: [-0.5, 0, 0.1], legR: [0.45, 0, -0.1] });
  // Locked Position: the wire thrown, the enemy pulled in, a charging flying kick
  const FLYKICK = { legR: [-1.6, 0, 0], legL: [0.5, 0, 0], torso: [-0.4, 0, 0], armL: [0.5, 0, 0.8], armR: [0.4, 0, -0.8], tilt: -0.35 };
  ACT.evLocked = (b, t, th, d) => (t < 0.16 ? add(b, { armR: [-1.7, 0, 0.1], torso: [0.2, -0.3, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0] }) : back(add(b, FLYKICK), b, t, d, 0.72));
  // Binding Sunder: a step back out of the blow, the wires drawn taut in both hands, then the yank that detonates them
  const TAUT = { armR: [-1.5, 0.3, -0.5], armL: [-1.5, -0.3, 0.5], torso: [0.05, 0, 0], hipsY: -0.06, legL: [-0.35, 0, 0.1], legR: [0.3, 0, -0.1] };
  const YANK = { armR: [-0.6, 0.6, -1.1], armL: [-0.6, -0.6, 1.1], torso: [-0.2, 0, 0], head: [-0.1, 0, 0], hipsY: -0.1, legL: [0.3, 0, 0], legR: [-0.5, 0, 0] };
  const STEP = { torso: [0.3, 0, 0.2], armL: [0.4, 0, 0.5], armR: [0.4, 0, -0.5], legL: [-0.7, 0, 0], legR: [0.5, 0, 0], hipsY: -0.14 };
  const sunder = (b, t, d, t1, t2) => (t < t1 ? add(b, STEP) : t < t2 ? add(b, TAUT) : back(add(b, YANK), b, t, d, 0.85));
  ACT.evSunder = (b, t, th, d) => sunder(b, t, d, 0.28, 0.64);
  ACT.evSunderEx = (b, t, th, d) => sunder(b, t, d, 0.3, 0.88);
  // Lunalux - Snare: garrote after garrote flung out ahead, then the yank
  const fling = (b, t) => add(b, { armR: [-1.6 + 0.5 * Math.sin(t * 20), 0.3, -0.7], armL: [-1.5 - 0.5 * Math.sin(t * 20), -0.3, 0.7], torso: [0.1, 0.3 * Math.sin(t * 10), 0], hipsY: -0.08, legL: [-0.5, 0, 0.1], legR: [0.4, 0, -0.1] });
  ACT.evSnare = (b, t, th, d) => (t < 0.88 ? fling(b, t) : back(add(b, YANK), b, t, d, 0.85));
  // Timbre / Shadow: the hands crossed, the web of wires flung over the field, rising a little, then the yank
  ACT.evUlt = (b, t, th, d) => (t < 0.4 ? add(b, { armR: [-1.4, 0.8, 0.6], armL: [-1.4, -0.8, -0.6], head: [0.15, 0, 0], hipsY: -0.04 })
    : t < 1.6 ? add(fling(b, t), { lift: 0.25 * Math.sin(clamp((t - 0.4) / 1.2, 0, 1) * PI) }) : back(add(b, YANK), b, t, d, 0.88));
  // Course Disruption: a cut, then the thrust that sets off the blast ahead
  ACT.evFollow = (b, t, th, d) => (t < 0.42 ? ACT.evCutR(b, t, 0.24, 0.42) : stage(b, { armR: [-0.4, 0, -0.3], torso: [0, 0.6, 0], legR: [0.4, 0, 0] }, { armR: [-1.65, 0, 0.1], torso: [0.25, -0.4, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0] }, t - 0.42, 0.2, d - 0.42));

  /* ------------------------------------------------------------- effects --
     The official previews: the garrote burns red-orange along its length
     with a white-hot core; Garrote cuts huge arcs of fire and leaves a line
     burning on the ground; the Ultimate throws a web of burning wires across
     the field before the blast; a few rose and violet sparks. evCut: a knife
     cut (steel); evLash: a burning arc; evWire: the wire to a point; evPull:
     the wire yanking an enemy in; evRing: a full turn of burning wire;
     evTether: wires from the bound target to its neighbours (pull: drawn in);
     evWeb: wires crossing through the target; evBlast: the detonation. */
  const E = CHOREO.events, S = CHOREO.streams, _v = new THREE.Vector3();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shake = s => { BT.B.cam.shake = Math.max(BT.B.cam.shake, s); };
  const sparks = (x, y, z, n, sp) => FX.burst(x, y, z, n, { col: SPARK, speed: sp || 5, size: 0.08, life: 0.32, g: 1 });
  const flamesAlong = (p0, p1, n) => { for (let i = 0; i < n; i++) { const k = Math.random(); FX.p({ x: lerp(p0.x, p1.x, k), y: lerp(p0.y, p1.y, k) + rnd(-0.1, 0.1), z: lerp(p0.z, p1.z, k), vy: rnd(0.4, 1.4), drag: 1.5, life: rnd(0.25, 0.5), size: 0.13, size1: 0.03, col: U.pick(SPARK), g: -1 }); } };
  function wire(p0, p1, big) {
    FX.beam(p0, p1, WIRE, big ? 0.12 : 0.07, 0.24); FX.beam(p0.clone(), p1.clone(), HOT, big ? 0.04 : 0.025, 0.18);
    flamesAlong(p0, p1, big ? 18 : 10);
  }
  const hand = a => { BT.sock(a, 'weapon', _v); if (_v.y < 0.5) _v.y = 1.0; return _v.clone(); };
  const mid = v => V(v.x, (v.height || 1.6) * 0.55, v.z);
  E.evCut = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.05) + (a.airY || 0), o = { tilt: e.tilt || 0, arc: e.arc || 2.4, life: 0.22, sweep: e.sweep || 1.0 };
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, e.r || 2.0, dir, STEEL, Object.assign({ width: 0.3 }, o));
    FX.slash(a.x + fx * 0.3, y + 0.03, a.z + fz * 0.3, (e.r || 2.0) * 0.9, dir, 0xffffff, Object.assign({}, o, { width: 0.1, life: 0.18 }));
    FX.glow(a.x + fx * 0.9, y, a.z + fz * 0.9, 0.8, 0xffffff, 0.1, { size1: 1.3 });
    SFX.play('swing');
  };
  E.evLash = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.0) + (a.airY || 0), r = e.r || 2.8, o = { tilt: e.tilt || 0, arc: e.arc || 3.0, life: 0.3, sweep: e.sweep || 1.2 };
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, WIRE, Object.assign({ width: e.big ? 0.5 : 0.34 }, o));
    FX.slash(a.x + fx * 0.3, y + 0.03, a.z + fz * 0.3, r * 0.94, dir, HOT, Object.assign({}, o, { width: 0.1, life: 0.24 }));
    for (let i = 0; i < (e.big ? 24 : 12); i++) { const an = dir + rnd(-o.arc / 2, o.arc / 2), rr = r * rnd(0.85, 1.05); FX.p({ x: a.x + Math.sin(an) * rr, y: y + rnd(-0.3, 0.3), z: a.z + Math.cos(an) * rr, vy: rnd(0.3, 1.2), drag: 1.5, life: rnd(0.25, 0.5), size: 0.14, size1: 0.03, col: U.pick(SPARK), g: -1 }); }
    if (e.big) shake(0.18);
    SFX.play('fire');
  };
  E.evWire = (a, A, e, tgt) => {
    const L = e.len || 4.5, p0 = hand(a), p1 = tgt && !e.free ? mid(tgt) : V(a.x + Math.sin(A.dir) * L, 1.0, a.z + Math.cos(A.dir) * L);
    wire(p0, p1, e.big); sparks(p1.x, p1.y, p1.z, 8);
  };
  // the wire bites and drags the enemy toward her (a boss does not budge)
  E.evPull = (a, A, e, tgt) => {
    if (!tgt || !tgt.alive) return;
    wire(hand(a), mid(tgt), true);
    if (tgt.rank !== 'boss') { const g = ang(tgt, a), d = Math.min(e.d || 1.4, Math.max(0, dist(a, tgt) - tgt.rad - 1.0)); tgt.x += Math.sin(g) * d; tgt.z += Math.cos(g) * d; }
    sparks(tgt.x, (tgt.height || 1.6) * 0.55, tgt.z, 10, 4);
  };
  E.evRing = (a, A, e) => {
    const y = (e.y || 1.0) + (a.airY || 0), r = e.r || 3.0, o = { tilt: e.tilt || 0, arc: 6.2, life: 0.32, sweep: 1.8 };
    FX.slash(a.x, y, a.z, r, A.dir, WIRE, Object.assign({ width: 0.4 }, o));
    FX.slash(a.x, y + 0.04, a.z, r * 0.94, A.dir, HOT, Object.assign({}, o, { width: 0.1, life: 0.26 }));
    FX.ring(a.x, a.z, 0.4, r, FLAME, 0.35, { a: 0.6 });
    for (let i = 0; i < 6; i++) { const an = rnd(0, PI * 2); sparks(a.x + Math.cos(an) * r * 0.9, y, a.z + Math.sin(an) * r * 0.9, 4); }
    shake(0.16); SFX.play('fire');
  };
  // Garrote: a huge arc of fire, then a line of it burning along the ground toward the target
  E.evGarrote = (a, A, e, tgt) => {
    E.evLash(a, A, Object.assign({ r: 3.8, arc: 3.6, big: true }, e));
    const L = tgt ? Math.min(6, dist(a, tgt) + 1.5) : 4.5;
    FX.named('fireLine', { fromX: a.x, fromZ: a.z, yaw: A.dir, len: L });
    for (let i = 0; i < 26; i++) { const k = rnd(0.3, L); FX.p({ x: a.x + Math.sin(A.dir) * k + rnd(-0.2, 0.2), y: 0.15, z: a.z + Math.cos(A.dir) * k + rnd(-0.2, 0.2), vy: rnd(1, 2.6), life: rnd(0.3, 0.6), size: 0.22, size1: 0.5, col: U.pick([0xffe080, FLAME, WIRE]), g: -1 }); }
    shake(0.22);
  };
  // Binding Sunder: wires from the bound target to every enemy round it (and to her hand); pull draws them in (Final Form)
  E.evTether = (a, A, e, tgt) => {
    const v = tgt || A.tgt; if (!v) return;
    const c = mid(v), r = e.r || 3.5;
    wire(hand(a), c, true);
    for (const o of BT.enemiesIn('circle', v.x, v.z, r + (e.pull ? 1.5 : 0), 0)) {
      if (o === v) continue;
      wire(c.clone(), mid(o), false);
      if (e.pull && o.rank !== 'boss') { const g = ang(o, v), d = Math.max(0, dist(o, v) - o.rad - v.rad - 0.4) * 0.65; o.x += Math.sin(g) * d; o.z += Math.cos(g) * d; }
    }
    FX.ring(v.x, v.z, 0.3, r, WIRE, 0.4, { y: 0.9, a: 0.7 }); FX.glow(c.x, c.y, c.z, 1.6, FLAME, 0.25, { size1: 2.4 });
    SFX.play('swing');
  };
  // wires crossing through the target from every side (the Ultimate's web, the Snare's slashes)
  E.evWeb = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 3, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 3, n = e.n || 5, L = e.len || 7;
    for (let i = 0; i < n; i++) {
      const an = rnd(0, PI), y0 = rnd(0.3, 2.2), y1 = rnd(0.3, 2.2);
      const p0 = V(x + Math.cos(an) * L / 2, y0, z + Math.sin(an) * L / 2), p1 = V(x - Math.cos(an) * L / 2, y1, z - Math.sin(an) * L / 2);
      FX.beam(p0, p1, U.pick([WIRE, WIRE, CRIM, ROSE]), 0.08, 0.3); FX.beam(p0.clone(), p1.clone(), HOT, 0.025, 0.22);
    }
    sparks(x, 1.0, z, 14, 6); FX.glow(x, 1.0, z, 1.8, WIRE, 0.2, { size1: 2.6 });
    if (Math.random() < 0.5) FX.burst(x, 1.0, z, 6, { col: [VIO, ROSE], speed: 4, size: 0.07, life: 0.3, g: 1 });
    shake(0.1); SFX.play('swing');
  };
  // the detonation round the bound target
  E.evBlast = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * (e.d || 2.5), z = tgt ? tgt.z : a.z + Math.cos(A.dir) * (e.d || 2.5), r = e.r || 3;
    FX.named('explode', { x, z, r, attr: 'fire' });
    FX.ring(x, z, 0.4, r, WIRE, 0.45, { y: 0.08 }); FX.ring(x, z, 0.3, r * 0.65, HOT, 0.38, { y: 0.1 }); FX.ring(x, z, 0.2, r * 1.15, CRIM, 0.5, { y: 0.06, a: 0.5 });
    FX.glow(x, 1.1, z, r * 1.1, FLAME, 0.32, { size1: r * 2 });
    FX.burst(x, 1.0, z, e.big ? 60 : 34, { col: SPARK, speed: 8, size: 0.14, size1: 0.03, life: 0.6, g: 1, up: 1 });
    if (e.big) FX.burst(x, 1.2, z, 16, { col: [VIO, ROSE, 0xffffff], speed: 6, size: 0.1, life: 0.5, g: 1 });
    shake(e.big ? 0.45 : 0.26); SFX.play(e.big ? 'boom' : 'heavy');
  };
  E.evSpark = a => { BT.sock(a, 'weapon', _v); FX.glow(_v.x, _v.y, _v.z, 1.0, HOT, 0.12, { size1: 1.8 }); sparks(_v.x, _v.y, _v.z, 8); };
  // the burning wire trailing her hand as she moves
  S.evTrail = (a, A, s, dt) => {
    BT.sock(a, 'weapon', _v);
    const n = Math.max(1, Math.round(dt * 90));
    for (let i = 0; i < n; i++) FX.p({ x: _v.x + rnd(-0.15, 0.15), y: _v.y + rnd(-0.15, 0.15), z: _v.z + rnd(-0.15, 0.15), vy: rnd(0.2, 0.8), life: 0.35, size: 0.11, size1: 0.02, col: U.pick(SPARK), g: -0.5 });
  };
  // Binding Seal taking hold: coils of burning wire round the target
  function wrapFx(v) {
    if (!v || !v.alive) return;
    const h = v.height || 1.6, r = (v.rad || 0.5) + 0.25;
    for (const k of [0.3, 0.55, 0.8]) FX.ring(v.x, v.z, r * 1.6, r, WIRE, 0.45, { y: h * k, a: 0.85 });
    FX.burst(v.x, h * 0.55, v.z, 14, { col: SPARK, speed: 3, size: 0.08, life: 0.35, g: 1 });
  }
  // Dance of Awakened Fire: she throws the coat off in a swirl of embers
  function danceFx(a) {
    const P = a.rig && a.rig.parts; if (P && P.coat) P.coat.visible = false;
    BT.sock(a, 'chest', _v);
    FX.burst(_v.x, _v.y + 0.3, _v.z, 30, { col: [0x1b181e, 0x6e1a25, 0x8a242c, FLAME], glow: false, speed: 4, size: 0.14, life: 0.7, g: 3, up: 2 });
    FX.burst(_v.x, _v.y, _v.z, 30, { col: SPARK, speed: 5, size: 0.1, size1: 0.02, life: 0.6, g: -1, up: 1 });
    FX.ring(a.x, a.z, 0.3, 2.4, WIRE, 0.5, { y: 0.08 }); FX.glow(_v.x, _v.y, _v.z, 2.2, FLAME, 0.35, { size1: 3.4 });
  }

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const cut = (t, o) => Object.assign({ t, fx: 'evCut' }, o || {});
  const lash = (t, o) => Object.assign({ t, fx: 'evLash' }, o || {});
  // Razor Wire
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.45 }], events: [cut(0.14, { tilt: -0.4, sweep: -1.0 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.4 }], events: [cut(0.16, { tilt: 0.5 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.45 }], events: [cut(0.2, { y: 0.6, r: 2.2, arc: 4.0, tilt: 0.1 })] });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.24, kind: 'fwd', d: 0.5 }], stream: [{ t0: 0.08, t1: 0.3, kind: 'evTrail' }], events: [lash(0.24, { tilt: -0.5, sweep: -1.2, r: 3.0, arc: 3.2 })] });
  set(K.basic[4], { motion: [{ t0: 0.36, t1: 0.56, kind: 'back', d: 0.5 }], events: [{ t: 0.22, fx: 'evWire', len: 4.6 }, { t: 0.32, fx: 'evPull', d: 0.8 }, { t: 0.32, fx: 'evSpark' }] });
  set(K.cut3, { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.45 }], stream: [{ t0: 0.02, t1: 0.24, kind: 'evTrail' }], events: [{ t: 0.2, fx: 'evRing', r: 2.4, y: 0.6 }] });
  // Garrote
  set(K.garrote1, { motion: [{ t0: 0.05, t1: 0.3, kind: 'fwd', d: 0.5 }], stream: [{ t0: 0.05, t1: 0.36, kind: 'evTrail' }], events: [{ t: 0.34, fx: 'evGarrote', tilt: -0.9, sweep: -1.4 }] });
  set(K.garrote2, { motion: [{ t0: 0.04, t1: 0.3, kind: 'fwd', d: 0.4 }], stream: [{ t0: 0.04, t1: 0.38, kind: 'evTrail' }], events: [{ t: 0.36, fx: 'evGarrote', tilt: 0.8, sweep: 1.4 }, { t: 0.38, fx: 'evRing', r: 3.0, y: 0.5 }] });
  // the Dash Attack and the Dodge Counter
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: ROSE }], events: [cut(0.22, { y: 0.8, tilt: -1.1, r: 2.0 })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.0, side: 'auto' }], stream: [{ t0: 0, t1: 0.14, kind: 'afterimage', col: ROSE }, { t0: 0.12, t1: 0.3, kind: 'evTrail' }], events: [{ t: 0.28, fx: 'evRing', r: 3.0 }] });
  // Locked Position: the wire thrown, the enemy pulled in, the flying kick
  set(K.locked, { motion: [{ t0: 0.16, t1: 0.3, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0.16, t1: 0.3, kind: 'afterimage', col: WIRE }], events: [{ t: 0.08, fx: 'evWire', len: 5 }, { t: 0.14, fx: 'evPull', d: 1.4 }, cut(0.3, { y: 0.9, tilt: -1.2, r: 2.0 })] });
  // Binding Sunder: back out of the blow, the tether, the detonation
  set(K.special, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.2 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: ROSE }], events: [{ t: 0.36, fx: 'evTether', r: 3.5 }, { t: 0.7, fx: 'evBlast', r: 3.5 }] });
  set(K.ex, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.4 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: ROSE }, { t0: 0.3, t1: 0.9, kind: 'evTrail' }],
    events: [{ t: 0.42, fx: 'evTether', r: 4.0, pull: true }, { t: 0.46, fx: 'evWeb', n: 4, len: 6 }, { t: 0.95, fx: 'evBlast', r: 4.0, big: true }, { t: 0.95, fx: 'whiteFlash' }] });
  // Lunalux - Snare: three garrotes slashing ahead, the web, the explosion
  const snare = { motion: [{ t0: 0, t1: 0.2, kind: 'back', d: 0.8 }], stream: [{ t0: 0.2, t1: 0.9, kind: 'evTrail' }],
    events: [lash(0.3, { r: 4.0, arc: 2.8, tilt: -0.6, sweep: -1.2 }), { t: 0.3, fx: 'evWire' }, lash(0.45, { r: 4.0, arc: 2.8, tilt: 0.6 }), lash(0.6, { r: 4.2, arc: 3.0, tilt: 0, big: true }), { t: 0.75, fx: 'evWeb', n: 6 }, { t: 0.95, fx: 'evBlast', r: 3.6, big: true }, { t: 0.95, fx: 'whiteFlash' }] };
  set(K.chain, snare); set(K.snare, snare);
  // Timbre / Shadow: back, the web of wires thrown again and again, all drawn tight, the blast
  const ultCh = { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.0 }], stream: [{ t0: 0.4, t1: 1.6, kind: 'evTrail' }],
    events: [{ t: 0.15, fx: 'evSpark' }].concat([0.55, 0.7, 0.85, 1.0, 1.15, 1.3].map((t, i) => ({ t, fx: 'evWeb', n: 4 + i, len: 8 })), [{ t: 1.5, fx: 'evTether', r: 4.8 }, { t: 1.7, fx: 'evBlast', r: 4.8, big: true }, { t: 1.7, fx: 'whiteFlash' }]) };
  set(K.ult, ultCh); set(K.shadow, ultCh);
  set(K.assist, { events: [{ t: 0.05, fx: 'evSpark' }] });
  // Course Disruption: in close, the cut, then the blast ahead
  set(K.followup, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.4 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: ROSE }],
    events: [lash(0.24, { tilt: -0.6, sweep: -1.2, r: 2.8 }), { t: 0.5, fx: 'evWire', len: 3 }, { t: 0.62, fx: 'evBlast', r: 3.2, d: 2.4 }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.18, kind: 'toTarget', gap: 1.6 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: ROSE }, { t0: 0.14, t1: 0.3, kind: 'evTrail' }], events: [{ t: 0.28, fx: 'evRing', r: 3.0 }] });
})();
