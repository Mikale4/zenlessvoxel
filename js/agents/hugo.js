/* ============================================================================
   agents/hugo.js -- Hugo Vlad, leader of Mockingbird: a gallery owner among
   New Eridu's elite by day, a phantom thief by night. S-Rank, Ice, Attack,
   Defensive Assist. Released in Version 1.7.
   (An Agent in his own file: the hooks and helpers are documented at the top
   of agents/zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Hugo Vlad, Final Notice, Voice-Overs,
   Lore, DMs, Dialogue), HoYoWiki entry 707 (official skill text, skill GIFs,
   level 1-16 multipliers), the archived hakush.in datamine (1291.json, saved
   2025-04-11: per-hit splits and Anomaly Buildup), Prydwen, zzz.gg, Game8,
   and the official splash art and in-game model.

   His kit (official):
     Basic Attack: Dark Abyss Quartet    up to 4 attacks: three with the case
                                         (Physical), then the 4th: the case opens
                                         into the scythe for a slash and a shot
                                         (Ice). Hold Basic during the 4th to
                                         charge the shot. -40% DMG taken during it.
     Basic Attack: Dark Abyss Concerto   Basic after the Quartet's 4th hit, the
                                         Dodge Counter's shot or the Quick Assist's
                                         shot: the scythe thrown forward to slash,
                                         then a shot; hold to charge the shot.
     Dash Attack: Phantasm - Shatter     (Physical)
     Dodge Counter: Phantasm - Slash     slashes; hold Basic during it for a shot,
                                         keep holding for a charged shot (the shot
                                         counts as a Basic Attack); or Basic for
                                         the Quartet's 4th hit
     Quick Assist: Elegy                 the same, weaker
     Special Attack: Soul Hunter - Judgment     the scythe spun, then a slash
     EX Special Attack: Soul Hunter - Punishment (40 Energy): a spin, then a
                                         Finishing Move (not a heavy attack)
     Chain Attack: Trick of Fate         a wide slash, then a shot that counts
                                         as a charged shot
     Ultimate: Blaspheme                 the scythe thrown spinning, then a
                                         Finishing Move (not a heavy attack)
     Defensive Assist: The End Has Not Come / Assist Follow-Up: Ace Reversal
     (the EX, the Ultimate and the Follow-Up chain into the Quartet's 4th hit)
     Core Passive: Terminating Verdict   Totalize: a Finishing Move landing on a
                                         Stunned enemy cashes in its remaining
                                         Stun for a far bigger multiplier, then
                                         ends the Stun (some Daze stays). Dark
                                         Abyss Reverb: +CRIT when his Chain Attack
                                         hits or his attacks Stun. +ATK per Stun
                                         Agent in the squad.
     Additional Ability: Prelude to Finality   (a Stun or Ice teammate) Chain
                                         Attack and Totalize DMG up; an EX
                                         Totalize gives Energy back.
   Our choices (the sources do not say):
     - hits 1-3 and the Dash Attack are Physical (zero buildup in the datamine,
       orange sparks in the official GIF), swung with the closed case;
     - the EX's spin / Finishing Move split is the datamine's; the Ultimate,
       listed as one number, gets the same proportions; the Chain Attack's shot
       has no number of its own: the listed total is split 75 / 25; the Special's
       single number is split 40 / 60 between the spin and the slash;
     - "charge": keep Basic held as he levels the scythe to shoot (the 4th hit,
       the Concerto, the counter's shot); the counter's shot itself is a held
       Basic during (or kept held through) the Dodge Counter / Quick Assist;
     - Totalize's added multiplier is scaled x0.45 like every multiplier;
       "normal enemies" (Prelude to Finality) read as non-bosses, as the report;
     - the Special has no stated damage reduction: a token one for its
       Anti-Interrupt; the Defensive Assist's light-parry Daze x0.6 (the game's
       x1.2 on a heavy blow comes close to the official heavy figure);
     - no Decibel maximum was found: the game's usual 3000.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd, lerp } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const ICEC = 0x8fe4ff, VIOLET = 0xb08aff, FROST = [0xffffff, 0xdaf6ff, 0x8fe4ff, 0xa7b5f6];
  const Q = 'Basic Attack: Dark Abyss Quartet', C = 'Basic Attack: Dark Abyss Concerto';

  /* ----------------------------------------------------------------- kit --
     Flags of his own on a move: hgCase (the closed briefcase, not the scythe);
     hgConc (Basic next is the Concerto); hgShot (Basic next: held, that shot;
     tapped, the 4th hit); hg4 (Basic next is the 4th hit); hgEnd (the chain of
     follow-ups ends); hgCharge / hgAt / hgT (Basic still held at hgT, after
     hgAt hits: it becomes that charged shot, mech.tick). hgFinish: a Finishing
     Move (Totalize). */
  const K = {
    basic: [
      { name: Q, anim: 'hgCase1', dur: 0.44, cancel: 0.32, reach: 1.7, range: 1.4, hgCase: true, hits: [hit(0.16, 87.1, 32.6, 0, { attr: 'physical' })] },
      { name: Q, anim: 'hgCase2', dur: 0.5, cancel: 0.36, reach: 1.7, range: 1.4, hgCase: true, hits: [hit(0.2, 148.9, 82.4, 0, { attr: 'physical' })] },
      { name: Q, anim: 'hgLunge', dur: 0.62, cancel: 0.46, reach: 2.8, range: 1.6, hgCase: true, hits: [hit(0.24, 340.1, 193.0, 0, { attr: 'physical', shape: 'line', r: 1.0, len: 3.4 })] },
      // the 4th: the scythe's slash, then he drops back and shoots
      { name: Q, anim: 'hgQuartet', dur: 1.0, cancel: 0.84, reach: 2.2, range: 1.6, dr: 0.4, hgConc: true, hgCharge: 'q4c', hgAt: 1, hgT: 0.42,
        hits: [hit(0.22, 298.7, 189.6, 95.81, { shape: 'arc', r: 2.6, arc: 120 }), hit(0.7, 118.0, 75.4, 36.17, { heavy: true, shape: 'line', r: 0.9, len: 7, fx: 'hgFrost' })] },
    ],
    q4c: { name: Q + ' (Charged Shot)', anim: 'hgChargeShot', dur: 0.92, cancel: 0.76, reach: 7, range: 3.5, dr: 0.4, hgConc: true, hits: [hit(0.52, 236.8, 144.1, 77.70, { heavy: true, shape: 'line', r: 1.1, len: 8.5, kb: 0.8, fx: 'hgFrost' })] },
    conc: { name: C, anim: 'hgConcerto', dur: 1.08, cancel: 0.9, reach: 4.2, range: 2.8, dr: 0.4, hgEnd: true, hgCharge: 'concC', hgAt: 1, hgT: 0.56,
      hits: [hit(0.32, 287.5, 166.4, 100.23, { shape: 'line', r: 1.3, len: 5, fx: 'hgFrost' }), hit(0.8, 173.6, 100.8, 60.56, { heavy: true, shape: 'line', r: 0.9, len: 7, fx: 'hgFrost' })] },
    concC: { name: C + ' (Charged Shot)', anim: 'hgChargeShot', dur: 0.95, cancel: 0.8, reach: 7, range: 3.5, dr: 0.4, hgEnd: true, hits: [hit(0.52, 342.2, 197.2, 119.24, { heavy: true, shape: 'line', r: 1.2, len: 9, kb: 1.0, fx: 'hgFrost' })] },
    dash: { name: 'Dash Attack: Phantasm - Shatter', anim: 'hgLunge', dur: 0.55, cancel: 0.42, reach: 7, hgCase: true, hits: [hit(0.26, 187.0, 71.0, 0, { attr: 'physical' })] },
    counter: { name: 'Dodge Counter: Phantasm - Slash', anim: 'hgCounter', dur: 0.82, cancel: 0.66, inv: [0, 0.82], hgShot: 'ctrShot',
      hits: [0.12, 0.36].map(t => hit(t, 492.3 / 3, 322.3 / 3, 95 / 3, { shape: 'arc', r: 2.6, arc: 150 })).concat([hit(0.6, 492.3 / 3, 322.3 / 3, 95 / 3, { heavy: true, shape: 'arc', r: 2.6, arc: 150, kb: 0.8 })]) },
    // the counter's ranged phase: a hop back (invulnerable), then the shot (-40% DMG taken)
    ctrShot: { name: 'Dodge Counter: Phantasm - Slash (Shot)', anim: 'hgBackShot', dur: 0.8, cancel: 0.64, reach: 7, range: 3.5, inv: [0, 0.28], dr: 0.4, hgConc: true, hgCharge: 'ctrShotC', hgT: 0.3,
      hits: [hit(0.44, 324.9, 187.4, 113.33, { heavy: true, shape: 'line', r: 1.0, len: 7.5, fx: 'hgFrost' })] },
    ctrShotC: { name: 'Dodge Counter: Phantasm - Slash (Charged Shot)', anim: 'hgChargeShot', dur: 0.95, cancel: 0.8, reach: 7, range: 3.5, dr: 0.4, hgConc: true,
      hits: [hit(0.52, 424.4, 245.7, 148.30, { heavy: true, shape: 'line', r: 1.2, len: 9, kb: 1.0, fx: 'hgFrost' })] },
    special: { name: 'Special Attack: Soul Hunter - Judgment', anim: 'hgSpecial', dur: 0.9, cancel: 0.7, reach: 2.6, range: 1.8, cd: 1.5, dr: 0.01,   // (Anti-Interrupt only: a token dr)
      hits: [hit(0.24, 171.1 * 0.4, 128.2 * 0.4, 77.51 * 0.4, { shape: 'circle', r: 2.4 }), hit(0.55, 171.1 * 0.6, 128.2 * 0.6, 77.51 * 0.6, { shape: 'arc', r: 2.8, arc: 150, kb: 0.5 })] },
    // the spin deals the Daze, the Finishing Move the damage (the datamine's split); neither is a heavy attack
    ex: { name: 'EX Special Attack: Soul Hunter - Punishment', anim: 'hgEx', dur: 1.45, cancel: 1.28, cost: 40, reach: 3.2, range: 2.2, inv: [0, 1.45], hg4: true,
      hits: [0.45, 0.6, 0.75].map(t => hit(t, 37.4 / 3, 649.1 / 3, 22.54 / 3, { shape: 'circle', at: 'target', r: 2.2, fx: 'hgShards' }))
        .concat([hit(1.05, 709.8, 34.9, 428.43, { hgFinish: true, shape: 'circle', at: 'target', r: 2.6, kb: 1.0, fx: 'hgShards' })]) },
    chain: { name: 'Chain Attack: Trick of Fate', anim: 'hgChain', dur: 1.45, inv: [0, 1.45],
      hits: [hit(0.4, 1402.9 * 0.75, 394.2 * 0.75, 437.83 * 0.75, { shape: 'arc', r: 3.4, arc: 200, kb: 0.6 }), hit(1.02, 1402.9 * 0.25, 394.2 * 0.25, 437.83 * 0.25, { heavy: true, shape: 'line', r: 1.3, len: 9.5, kb: 1.2, fx: 'hgFrost' })] },
    ult: { name: 'Ultimate: Blaspheme', anim: 'hgUlt', dur: 2.3, inv: [0, 2.3], hg4: true,
      hits: [0.65, 0.9, 1.15].map(t => hit(t, 3055.0 * 0.05 / 3, 397.3 * 0.95 / 3, 218.33 * 0.05 / 3, { shape: 'circle', at: 'target', r: 2.6, fx: 'hgShards' }))
        .concat([hit(1.65, 3055.0 * 0.95, 397.3 * 0.05, 218.33 * 0.95, { hgFinish: true, shape: 'circle', at: 'target', r: 4.2, kb: 1.6, fx: 'hgShards' })]) },
    assist: { name: 'Defensive Assist: The End Has Not Come', type: 'defensive', anim: 'hgParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Ace Reversal', anim: 'hgFollow', dur: 0.95, inv: [0, 0.95], hg4: true,
      hits: [hit(0.28, 584.3 / 2, 374.5 / 2, 245.76 / 2, { shape: 'arc', r: 2.6, arc: 150 }), hit(0.56, 584.3 / 2, 374.5 / 2, 245.76 / 2, { heavy: true, shape: 'arc', r: 2.8, arc: 150, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Elegy', anim: 'hgCounter', dur: 0.82, inv: [0, 0.78], hgShot: 'qkShot',
      hits: [0.12, 0.36, 0.6].map((t, i) => hit(t, 209.0 / 3, 78.7 / 3, 47.5 / 3, { shape: 'arc', r: 2.6, arc: 150, kb: i === 2 ? 0.6 : 0.15 })) },
    qkShot: { name: 'Quick Assist: Elegy (Shot)', anim: 'hgBackShot', dur: 0.8, cancel: 0.64, reach: 7, range: 3.5, inv: [0, 0.28], dr: 0.4, hgConc: true, hgCharge: 'qkShotC', hgT: 0.3,
      hits: [hit(0.44, 250.1, 94.3, 56.66, { shape: 'line', r: 1.0, len: 7.5, fx: 'hgFrost' })] },
    qkShotC: { name: 'Quick Assist: Elegy (Charged Shot)', anim: 'hgChargeShot', dur: 0.95, cancel: 0.8, reach: 7, range: 3.5, dr: 0.4, hgConc: true,
      hits: [hit(0.52, 327.1, 123.4, 74.15, { shape: 'line', r: 1.2, len: 9, kb: 0.6, fx: 'hgFrost' })] },
  };

  /* -------------------------------------------- Totalize, Reverb, charge -- */
  // Totalize's added multiplier (official %): +1,000%, +280% per second of Stun left up to 5 s, +100% per second from 5 to 15 s, at most +3,400%
  const totalPct = s => Math.min(3400, 1000 + 280 * Math.min(5, s) + 100 * clamp(s - 5, 0, 10));
  function reverb(a) {
    const B = BT.B;
    if (!(a.hgReverb > B.t)) BT.log('Hugo: Dark Abyss Reverb (+12% CRIT Rate, +25% CRIT DMG, 6 s).', 'skill');
    a.hgReverb = B.t + 6;
  }
  function totalize(a, v, s, A) {
    const B = BT.B, keep = Math.min(0.25, 0.05 * s);
    BT.endStun(v, v.dazeMax * keep);                                   // the Stun ends at once; 5% Daze per second it had left (up to 25%) stays
    BT.callout('TOTALIZE', 'stun', `${v.def.name} · ${s.toFixed(1)} s of Stun`);
    BT.log(`Hugo: Totalize! ${s.toFixed(1)} s of ${v.def.name}'s Stun cashed in (+${U.fmt(totalPct(s))}%). The Stun ends; ${Math.round(keep * 100)}% of its Daze stays.`, 'skill');
    FX.ring(v.x, v.z, 0.5, 3.4, 0xffd870, 0.5); FX.ring(v.x, v.z, 0.3, 2.4, ICEC, 0.4, { y: 0.4 });
    FX.glow(v.x, 1.2, v.z, 3.2, 0xffffff, 0.3, { size1: 5 });
    FX.burst(v.x, 1.0, v.z, 40, { col: [0xffd870, 0xfff0c0, 0xffffff, ICEC], speed: 7, size: 0.13, size1: 0.03, life: 0.6, g: 2, up: 1 });
    B.cam.shake = Math.max(B.cam.shake, 0.35); SFX.play('heavy');
    // Prelude to Finality: an EX Totalize on a normal (non-boss) enemy gives back 20 Energy, once every 30 s
    if (a.hgPrelude && A.kind === 'ex' && v.rank !== 'boss' && !(a.hgEnCd > B.t)) { a.hgEnCd = B.t + 30; BT.gainEnergy(a, 20, true); BT.log('Prelude to Finality: +20 Energy.', 'skill'); }
  }
  // the player holding Basic down (and for how long): a held Basic during the counter is its shot; held through the aim, a charged shot
  const heldFor = (a, B, s) => { const S = B && B.btns && B.btns.basic; return !!(S && S.down && B.real - S.at >= s && BT.isPlayer(a)); };
  // a shot becoming its charged version (Basic still held as he levels the scythe; AUTO decides when the move starts)
  function charge(a, A) {
    const up = K[A.def.hgCharge], tgt = A.tgt, kind = A.kind, manual = A.data.manual;
    BT.endAct(a);
    const N = BT.startAct(a, up, { tgt, kind, manual });
    BT.onSkillStart(a, up, N);
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.hugo = {
    id: 'hugo', name: 'Hugo Vlad', short: 'Hugo', faction: 'Mockingbird', spec: 'Attack', attr: 'ice', rank: 'S',
    color: '#a7b5f6', color2: '#d3b67c', assist: 'defensive', stance: 'hugo',
    blurb: 'Leader of Mockingbird: a polished art collector among the elite by day, a phantom thief by night. His briefcase, Final Notice, opens into a scythe with a blade of ice; he strings slashes into shots and charged shots, and the Finishing Move of his EX or Ultimate Totalizes a Stunned enemy for enormous DMG, ending the Stun on the spot.',
    stats: { hp: 8890, atk: 3100, def: 660, impact: 95, ap: 90, am: 86, cr: 0.49, cd: 0.8, er: 1.2, speed: 4.8 },
    ai: { range: 1.8, dodge: 0.8, reflex: 0.64, aggr: 1.0 },
    energyMax: 120, resource: 'totalize',
    core: [
      ['Core Passive: Terminating Verdict', 'When the Finishing Move of his EX Special Attack or Ultimate hits a Stunned enemy, it Totalizes: the Finishing Move\'s multiplier rises by 1,000%, plus 280% for each second of Stun left (up to 5 s) and 100% for each second beyond (up to 15 s), at most 3,400% in all. The Stun then ends at once, leaving 5% of the enemy\'s Daze per second it had left (up to 25%). His EX deals 20% more Daze to an enemy that is not Stunned. +300 ATK with one Stun Agent in the squad, +900 with two.'],
      ['Dark Abyss Reverb', 'When his Chain Attack hits, or his attacks Stun an enemy: +12% CRIT Rate and +25% CRIT DMG for 6 s (a new trigger resets it).'],
      ['Additional Ability: Prelude to Finality', 'With a Stun Agent or another Ice Agent in the squad: Chain Attack DMG +15%, and another +35% against normal (non-boss) enemies; Totalize DMG +40%; a Totalize from his EX on a normal enemy gives back 20 Energy (once every 30 s).'],
    ],
    kit: K,
    kitShow: [['Basic', 'conc'], ['Hold', 'q4c'], ['Counter', 'ctrShot']],
    rivalMoves: [{ k: 'conc', kind: 'core', p: 0.25, cd: 5 }],
    howto: 'Hugo: tap Basic for Dark Abyss Quartet; keep Basic held as he levels the scythe after the 4th hit\'s slash for a Charged Shot, then Basic again for Dark Abyss Concerto (charged the same way). Hold Basic during his Dodge Counter or Quick Assist to shoot (keep holding: a Charged Shot), or tap it for the 4th hit. The Finishing Move of his EX and Ultimate Totalizes a Stunned enemy: the more Stun left, the more DMG, then the Stun ends, so save the EX for the end of a Stun. Defensive Assist.',
    mech: {
      init(a) { Object.assign(a, { hgReverb: 0, hgConcT: 0, hgCtrT: 0, hg4T: 0, hgShotK: 'ctrShot', hgArmT: 0, hgThrowT: 0, hgEnCd: 0, hgAtk: 0, hgPrelude: false }); },
      squad(a, B) {
        const others = B.squad.filter(s => s !== a), ice = s => s.def.attr === 'ice' || (D.ATTR[s.def.attr] && D.ATTR[s.def.attr].as === 'ice');
        a.hgAtk = [0, 300, 900][Math.min(2, others.filter(s => s.def.spec === 'Stun').length)];
        a.hgPrelude = others.some(s => s.def.spec === 'Stun' || ice(s));
      },
      atkFor(a, b) { return b === a ? a.hgAtk || 0 : 0; },
      start(a, def, A) {
        const B = BT.B, end = B.t + A.dur;
        // what Basic does next (any other move closes these)
        a.hgConcT = def.hgConc ? end + 0.9 : 0;
        a.hgCtrT = def.hgShot ? end + 0.6 : 0;
        a.hg4T = def.hg4 ? end + 0.9 : 0;
        if (def.hgShot) a.hgShotK = def.hgShot;
        if (def.hgCharge) A.data.hgAuto = Math.random() < (A.tgt && A.tgt.stun > 0 ? 0.85 : 0.55);
      },
      // (side effect: the Stun each Finishing Move found, so hit() Totalizes exactly where the DMG bonus applied)
      mods(a, v, h, A) {
        const B = BT.B, o = { dmg: 0, cr: 0, cd: 0 };
        if (a.hgReverb > B.t) { o.cr += 0.12; o.cd += 0.25; }
        if (A && A.kind === 'chain' && a.hgPrelude) o.dmg += 0.15 + (v.rank !== 'boss' ? 0.35 : 0);
        if (A && h.hgFinish && v.stun > 0) {
          (A.data.hgTot || (A.data.hgTot = new Map())).set(v, v.stun);
          const up = totalPct(v.stun) * DM;                                          // the added multiplier, scaled like the rest
          o.dmg += (1 + up / Math.max(1, h.mult)) * (a.hgPrelude ? 1.4 : 1) - 1;
        }
        return o;
      },
      hit(a, v, h, A) {
        if (A.kind === 'chain') reverb(a);
        if (A.kind === 'ex' && !(v.stun > 0) && h.daze) BT.addDaze(a, v, a.st.impact * h.daze / 100 * 0.2);   // EX: +20% Daze on an enemy not Stunned
        const s = A.data.hgTot && A.data.hgTot.get(v);
        if (s != null && v.alive && v.stun > 0) { A.data.hgTot.delete(v); totalize(a, v, s, A); }
      },
      stunned(a) { reverb(a); },
      tick(a, dt) {
        const B = BT.B, A = a.act; if (!B || !a.rig) return;
        // the case opens into the scythe for his Ice moves and folds shut a moment after
        if (A) a.hgArmT = A.def.hgCase ? 0 : B.t + 1.2;
        look(a, a.hgArmT > B.t);
        const W = a.rig.parts.weapon; if (W && !W.visible && !(a.hgThrowT > B.t)) W.visible = true;
        // Basic still held as he levels the scythe: the Charged Shot
        if (!A || !A.def.hgCharge || A.data.hgSeen || A.hi < (A.def.hgAt || 0) || A.t < A.def.hgT) return;
        A.data.hgSeen = true;
        if (BT.isPlayer(a) ? heldFor(a, B, 0.18) : A.data.hgAuto) charge(a, A);
      },
      // Basic: the Concerto after a 4th hit or a counter's shot; after a Dodge Counter or Quick Assist, held: the shot,
      // tapped: the 4th hit; after the EX, Ultimate or Follow-Up, the 4th hit. Just after a dodge: the Dash Attack, as usual
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || c.dash) return null;
        if (a.hgConcT > c.t) return { def: K.conc, kind: 'basic', step: -1 };
        if (a.hgCtrT > c.t) return hold || heldFor(a, c.B, 0.22) ? { def: K[a.hgShotK] || K.ctrShot, kind: 'basic', step: -1 } : { def: K.basic[3], kind: 'basic', step: 3 };
        if (a.hg4T > c.t) return { def: K.basic[3], kind: 'basic', step: 3 };
        return null;
      },
      // AUTO: after a counter, mostly the shot; with the EX ready on a Stunned enemy, wait for the Stun to run low (Totalize ends it)
      ai(a, tgt, B) {
        if (a.hgCtrT > B.t) return { btn: 'basic', hold: Math.random() < 0.7 };
        if (a.energy >= K.ex.cost && tgt.stun > 0) return tgt.stun < 2.2 || (tgt.chainsLeft <= 0 && tgt.stun < 4) ? { btn: 'special' } : { btn: 'basic' };
        return null;
      },
      hud(a, B) {
        const r = [];
        if (a.hgReverb > B.t) r.push(`REVERB ${Math.ceil(a.hgReverb - B.t)}s`);
        if (a.hgConcT > B.t) r.push('BASIC: CONCERTO'); else if (a.hgCtrT > B.t) r.push('HOLD BASIC: SHOT'); else if (a.hg4T > B.t) r.push('BASIC: 4TH HIT');
        const v = B.focus && B.focus.alive ? B.focus : a.lastTgt;
        if (v && v.alive && v.stun > 0) r.push(`TOTALIZE +${U.fmt(totalPct(v.stun))}%`);
        return r;
      },
    },
    town: {
      routine: ['news:read 35, cafe:t 25, huddle 40', 'box:claw 35, bardic:window 25, huddle 40', '404:door 35, rp:window 25, huddle 40', 'rp:night 40, alley:lean 35, 404:q1 25'],
      chatter: ['Heads, I win. Tails... I also win~', 'A fine evening for a curtain call.'],
      lines: [
        'Ah, dear Manager. Call it for me: heads or tails? ...Heads. Pity. I was hoping you\'d owe me a favour~',
        'Random Play keeps a respectable shelf of heist films. I borrow them for research. Purely professional, of course.',
        'The pigeons by the newsstand have far better manners than the gulls of Port Elpis. Do not tell the gulls.',
      ],
      chapters: [
        { title: 'A sweet arrangement', ask: ['Dear Manager, might I trouble you with a small errand? A milk tea from the 141.', 'As sweet as they make it. Don\'t ask why. And not a word to Vivian.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'hugo' }],
          scene: [['A', '...Ah. Sweet enough to stop a heart. Perfect.'], ['P', 'You don\'t look like you\'re enjoying it.'], ['A', 'Enjoyment isn\'t the point. My blood sugar keeps its own script; I\'m merely the actor.'], ['A', 'You saw nothing, dear Manager. A gentleman keeps a few secrets. ...Thank you~']] },
        { title: 'The claw machine trick', ask: ['Box Galaxy\'s claw machine has lost to me all week, and its keeper suspects sleight of hand.', 'Ask Susie what she thinks I\'m doing. I do so love a review.'], steps: [{ t: 'talk', to: 'susie', reply: 'The gentleman with the jacket on his shoulders? He flips a coin, the claw drops, out comes a plushie. Every time. I\'m checking the machine for magnets.' }, { t: 'talk', to: 'hugo' }],
          scene: [['P', 'Susie\'s checking the machine for magnets.'], ['A', 'Magnets! How wonderfully unimaginative. I\'m almost offended.'], ['P', 'So how do you do it?'], ['A', 'A magician never tells, dear Manager. ...But the coin is only there so she watches my hand, not the claw.']] },
        { title: 'Curtain call', ask: ['Every great performance needs a finale, and I\'ve found us a worthy villain: something Notorious, deep in a Hollow.', 'Put me at the front of your squad, dear Manager. I\'ll handle the encore.'], steps: [{ t: 'clear', f: { enc: 'boss', lead: 'hugo' } }, { t: 'talk', to: 'hugo' }],
          scene: [['A', 'And the curtain falls. Listen... applause, or just the Hollow settling?'], ['P', 'It was a good show.'], ['A', 'It was, wasn\'t it? You called every cue before I knew I needed one.'], ['A', 'Should you ever need a phantom thief, you know which coin to flip. I\'ll be back, like an avalanche~']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official splash art and in-game model: light gold hair (the
     report's #D3B67C, highlights #EDDB8C), swept bangs showing the forehead on
     his left, a strand down between the eyes, chin-length locks framing the
     face, a cowlick, pointed ears, and a long low ponytail braided at the nape
     and falling to his hips. Heterochromia: his right eye grey-green, his left
     red, a beauty mark under it. A deep indigo pinstriped shirt (#2E2E51 to
     #454C78), a pale lavender-white tie; a gold sunburst medallion, a silver
     compass, a black tassel with a royal-blue tab. The near-black navy suit
     jacket (#282B31) is worn with only its left sleeve on: its right half hangs
     off his right shoulder like a cape, the quilted periwinkle lining
     (#A7B5F6) showing, the empty sleeve swinging behind; a gold bird pin on the
     lapel, a strap with a royal-blue tab on the left arm. His right sleeve is
     the shirt's, rolled to the elbow with a garter, a silver bracelet, a glossy
     dark-navy glove with gold rings. High-waisted near-black trousers (#161621)
     with two silver buttons, a braided navy belt through a silver O-ring, gold
     coin medallions and a chain at his right hip; glossy dark-navy oxfords.
     Final Notice: closed, an angular coffin-like briefcase (#222A47) with gold
     studs, a silver latch, the Mockingbird script and a ring handle with a gold
     coin charm and a blue ribbon, carried at his side; open, a long dark scythe
     with an ice-blue crystal blade (MODELS.hugoScythe: the same body, swapped
     in for his Ice moves, CHOREO.swapRig). 185 cm and slim: long legs. */
  {
    const HAIR = 0xd3b67c, HAIR2 = 0xb39762, HAIRHI = 0xeddb8c, SKIN = 0xfcf1e8, EYEG = 0x7a8a76, EYER = 0xb8343c, LASH = 0x5a4626, MOUTH = 0xc98a80;
    const SHIRT = 0x3a3d68, SHIRT2 = 0x2e2e51, STRIPE = 0x4b5380, TIE = 0xe3dfed, TIE2 = 0xc4bedf;
    const JACK = 0x282b31, JACK2 = 0x1c1e24, LINE = 0xa7b5f6, LINE2 = 0x8e9ce4, CROSS = 0xe6ebff, ROYAL = 0x1a34c0;
    const TROUS = 0x161621, TROUS2 = 0x262634, BELT = 0x26304e, BELT2 = 0x3a4672, SILVER = 0xc8ccd8, CHAIN = 0x8e93a2, GOLD = 0xd9b04a, GOLD2 = 0xa8822c;
    const GLOVE = 0x1b2040, GLOVEHI = 0x3c4a8c, SHOE = 0x1c2140, SHOEHI = 0x3d4c90, BLACK = 0x121218;
    const CASE = 0x222a47, CASE2 = 0x343e66, CASE3 = 0x161b30, SEAM = 0x8c94b4, SHAFT = 0x1d2238, SHAFT2 = 0x3a4470;
    const ICE = G(0x8fe4ff), ICE2 = G(0xdaf6ff), ICE3 = G(0x5a9ce8);
    const lin = (y, k) => ((y + k * 2) % 3 === 0) ? CROSS : (y & 1) ? LINE : LINE2;   // the quilted lining, little crosses on it
    const leg = g => {
      H.leg(g, { len: 10, pant: TROUS, boot: SHOE, bootH: 2, sole: BLACK });
      for (let y = -8; y <= -1; y++) g.set(0, y, 1, TROUS2);                        // the pressed crease
      g.set(0, -9, 2, SHOEHI);                                                      // the glossy oxford's shine
    };
    const BODY = {
      scale: 0.078, height: 29, width: 20, std: { hipY: 12 },                       // 185 cm: long legs (10 voxels, the hips a voxel higher)
      sockets: { weapon: ['weapon', [0, 0, 18]], blade: ['weapon', [0, -6, 12]], hand: ['armR', [0, -9, 1]], off: ['armL', [0, -9, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, TROUS);                                          // the trousers
        g.box(-3, 0, -2, 3, 0, 1, (x, y, z) => ((x + z) & 1) ? BELT2 : BELT);       // the braided navy belt...
        g.set(1, 0, 2, SILVER); g.set(1, -1, 2, SILVER);                            // ...through a silver O-ring
        g.set(-2, -1, 2, GOLD); g.set(-3, -1, 2, GOLD2);                            // gold coin medallions at his right hip...
        for (const [x, y] of [[-3, -2], [-3, -3], [-2, -4], [-1, -3], [-1, -2]]) g.set(x, y, 2, CHAIN);   // ...and the chain hanging from them
        g.box(3, -4, 2, 3, 0, 2, JACK); g.box(2, -4, 2, 2, -1, 2, LINE); g.set(2, 0, 2, JACK);   // the jacket's left front to the thigh, its lining at the open edge
        g.box(4, -4, -2, 4, 0, 1, JACK);                                            // its side
        g.set(3, -1, 3, GOLD); g.set(3, -3, 3, JACK2);                              // a gold button, the pocket flap
      },
      torso(g) {
        const stripe = x => (x & 1) ? STRIPE : SHIRT;
        g.box(-2, 0, -2, 2, 2, 1, TROUS);                                           // the trousers' high waist, to the ribs...
        g.set(-1, 1, 2, SILVER); g.set(-1, 2, 2, SILVER);                           // ...with two silver buttons
        g.box(-3, 3, -2, 3, 6, 1, stripe); g.box(-2, 3, 2, 2, 5, 2, stripe);        // the deep indigo pinstriped shirt
        g.box(-2, 6, 2, 2, 6, 2, SHIRT2);                                           // its collar
        g.box(0, 3, 3, 0, 6, 3, (x, y) => y === 4 ? TIE2 : TIE); g.set(1, 2, 2, TIE2); g.set(1, 1, 2, TIE);   // the pale tie, its tail flicking out to his left
        g.set(-2, 5, 3, GOLD); g.set(-1, 5, 3, SILVER); g.set(1, 5, 3, CHAIN);      // the gold sunburst medallion, the silver compass, the chain between
        g.set(-2, 4, 3, BLACK); g.set(-2, 3, 3, ROYAL);                             // the black tassel with its royal-blue tab
        // the jacket: its back (the collar standing behind his neck), its left side and front with the lapel's gold bird pin
        g.box(-3, 1, -3, 3, 6, -3, JACK); g.box(-2, 7, -3, 2, 7, -2, JACK);
        g.box(3, 0, -2, 3, 6, 1, JACK); g.box(2, 0, 2, 3, 6, 2, JACK);
        g.set(2, 6, 3, JACK2); g.set(2, 5, 3, JACK2); g.set(3, 5, 3, GOLD); g.set(2, 1, 3, SILVER);
        g.box(1, 0, 2, 1, 2, 2, LINE);                                              // its lining at the open front
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYEG, lash: LASH, mouth: MOUTH });
        g.box(1, 2, 3, 2, 3, 3, EYER); g.set(2, 3, 3, 0xffffff);                    // his left eye red, his right grey-green (the report's samples, lifted to read)
        g.set(2, 1, 3, 0xb08478); g.set(1, 0, 3, MOUTH);                            // a beauty mark under the red eye; the smirk
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 0], [-3, 3], [-2, 4], [-1, 4], [0, 2], [3, 4], [4, 2]], sideTo: 2 });
        g.cut(1, 5, 4, 2, 5, 4); g.box(1, 5, 3, 2, 5, 3, SKIN);                     // the bangs swept aside: his forehead shows on the left
        for (const [x, y, z] of [[3, 5, 4], [3, 6, 4], [-1, 6, 4], [-2, 7, 4], [0, 7, 3], [-3, 6, 4]]) g.set(x, y, z, HAIRHI);   // the light on the sweep
        g.box(-4, -2, 2, -4, 4, 3, HAIR); g.box(4, -1, 2, 4, 4, 3, HAIR);           // chin-length locks framing the face
        g.box(-5, 1, 0, -5, 4, 2, HAIR); g.box(5, 1, 0, 5, 4, 2, HAIR); g.set(-4, -3, 3, HAIR2);
        g.box(-4, -2, -4, 4, -1, -4, HAIR2);                                        // the nape, gathered back into the ponytail
        for (const s of [-1, 1]) { g.set(s * 5, 2, -1, SKIN); g.set(s * 6, 3, -1, SKIN); g.set(s * 7, 4, -2, SKIN); }   // pointed ears
        g.set(0, 8, 1, HAIR); g.set(0, 9, 1, HAIR); g.set(0, 10, 2, HAIRHI); g.set(0, 10, 3, HAIR); g.set(0, 9, 4, HAIR2);   // the cowlick, curling forward
        for (const [x, y, z, c] of [[-2, 8, -1, HAIR], [2, 8, 0, HAIR2], [-3, 8, -3, HAIR], [3, 8, -2, HAIR], [-6, 4, 0, HAIR], [-6, 5, -1, HAIRHI], [6, 5, 0, HAIR]]) g.set(x, y, z, c);   // flyaways
      },
      armR(g) {   // the shirt's sleeve rolled to the elbow, a garter, a silver bracelet, the glossy glove with gold rings
        H.arm(g, { sleeve: SHIRT, sleeveTo: 4, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 9 });
        g.box(-1, 0, -1, 1, 0, 1, x => (x & 1) ? STRIPE : SHIRT);
        g.box(-1, -1, -1, 1, -1, 1, BLACK); g.set(-1, -1, 1, SILVER);               // the garter
        g.box(-1, -2, -1, 1, -2, 1, SHIRT2); g.box(-1, -3, -1, 1, -3, 1, SILVER);   // the roll, its silver edge
        g.set(0, -6, 1, SILVER); g.set(-1, -6, 0, SILVER);                          // the bracelet
        g.set(0, -7, 1, GLOVEHI); g.set(-1, -8, 1, GOLD); g.set(1, -8, 1, GOLD);    // the glove's shine, gold rings
      },
      armL(g) {   // in the jacket's sleeve: the strap with the royal-blue tab, buttons at the cuff, a gold ring on the bare hand
        H.arm(g, { sleeve: JACK, sleeveTo: 8, skin: SKIN, len: 9, pad: JACK });
        g.box(-1, -2, -1, 1, -2, 1, BLACK); g.set(1, -2, 0, ROYAL); g.set(1, -2, 1, ROYAL); g.set(0, -2, 1, SILVER);
        g.set(1, -6, 0, SILVER); g.set(1, -7, 0, SILVER);
        g.set(0, -8, 1, GOLD);
      },
      legL: leg,
      legR: leg,
    };
    const EXTRA = {
      tail: {   // the long low ponytail: braided at the nape, tied in navy, falling to his hips
        parent: 'head', at: [0, 0, -5], draw(g) {
          for (let y = 1; y >= -2; y--) { const k = y & 1; g.set(k ? -1 : 1, y, 0, HAIR); g.set(0, y, 0, HAIR2); g.set(k ? 1 : -1, y, 0, HAIRHI); g.set(0, y, -1, HAIR); }
          g.box(-1, -3, -1, 1, -3, 0, JACK2);
          for (let i = 0; i < 10; i++) {
            const w = i < 2 ? 1.3 : i < 7 ? 1.7 : 1.4 - (i - 7) * 0.2;
            g.ell(Math.sin(i * 0.5) * 0.4, -4 - i, -1 - Math.min(2, i / 4), w, 0.6, 0.9, i % 4 === 1 ? HAIRHI : i % 3 === 2 ? HAIR2 : HAIR);
          }
          g.set(-1, -14, -3, HAIRHI); g.set(1, -14, -3, HAIR); g.set(0, -15, -3, HAIR2);   // the ends, parting
        },
      },
      tailR: {   // the jacket's right half off his shoulder, a cape: the lining shows behind his arm and at its turned-back edge
        parent: 'torso', at: [-5, 8, -1], draw(g) {
          g.box(-3, 0, -3, 2, 0, 2, JACK);                                          // over the shoulder
          for (let y = -1; y >= -14; y--) {
            g.box(-3, y, -3, -3, y, 1, JACK); g.set(-3, y, 2, lin(y, 2));           // the outer side, its front edge turned back
            g.box(-2, y, -3, 1, y, -3, JACK);                                       // its back...
            g.box(-2, y, -2, 0, y, -2, x => lin(y, x));                             // ...lined
            g.set(-2, y, 2, lin(y, 1));                                             // the lapel
          }
          g.box(-3, -14, -3, 1, -14, 2, JACK2);                                     // the hem
          for (let y = -2; y >= -10; y--) g.set(-4, y, -2, JACK2);                  // the empty sleeve, swinging behind
          g.set(-4, -9, -1, SILVER); g.set(-4, -10, -1, SILVER);                    // its cuff buttons
        },
      },
      tailL: {   // the jacket's back below the waist, the vent at its middle (anim.js sways it like a coat tail)
        parent: 'torso', at: [0, 1, -3], draw(g) {
          for (let y = 0; y >= -8; y--) for (let x = -4; x <= 4; x++) if (!(y <= -4 && x === 0)) g.set(x, y, 0, y === -8 || (y <= -4 && Math.abs(x) === 1) ? JACK2 : JACK);
        },
      },
    };
    const BRIEFCASE = {   // Final Notice, closed: the coffin-shaped case held lengthwise out from his side
      parent: 'armR', at: [0, -9, 0], draw(g) {
        g.set(-1, 0, 0, SILVER); g.set(0, 1, 0, SILVER); g.set(1, 0, 0, SILVER);    // the ring handle in his glove...
        g.set(-2, 0, 1, GOLD); g.set(-3, 1, 1, ROYAL); g.set(-4, 1, 1, ROYAL);      // ...its gold coin charm and blue ribbon
        for (const [y, x0, x1] of [[-1, -6, 0], [-2, -7, 1], [-3, -7, 1], [-4, -7, 1], [-5, -7, 1], [-6, -6, 0]])
          g.box(x0, y, -1, x1, y, 1, (x, yy) => yy === -1 ? CASE2 : (x === x0 || x === x1) ? CASE3 : CASE);   // angled ends, a lighter lid
        for (const z of [-1, 1]) for (const [x, y] of [[-6, -1], [-7, -2], [-7, -3], [1, -4], [1, -5]]) g.set(x, y, z, GOLD);   // the gold studs stepping down its ends
        g.set(-8, -3, 0, SILVER); g.set(-8, -4, 0, CASE3);                          // the silver latch
        g.set(-4, -4, 1, SEAM); g.set(-3, -4, 1, SEAM); g.set(-2, -3, 1, SEAM);     // the little Mockingbird script
      },
    };
    const SCYTHE = {   // Final Notice, open: the long dark shaft through his fist, the case folded into its head, the crystal blade
      parent: 'armR', at: [0, -8, 1], draw(g) {
        for (let z = -6; z <= 13; z++) g.set(0, 0, z, z % 4 === 0 ? SHAFT2 : SHAFT);
        g.box(0, -1, -7, 0, 1, -7, CASE); g.set(0, 0, -8, GOLD);                    // the butt, a gold stud
        g.box(-1, -1, 12, 1, 2, 17, (x, y) => y === 2 ? CASE2 : CASE);             // the head: the folded case...
        for (const x of [-1, 1]) { g.set(x, 2, 12, GOLD); g.set(x, 2, 15, GOLD); g.set(x, 1, 17, GOLD); }   // ...its gold studs...
        g.set(0, 3, 14, SILVER); g.set(0, 0, 18, G(0xbfefff));                      // ...the latch, the muzzle he shoots from
        // the ice-blue crystal blade: out of the head, down and curving back toward him, its edge facing the shaft
        for (let i = 0; i <= 26; i++) {
          const s = i / 26, th = s * 1.45, w = 2.6 * (1 - s) + 0.4;
          for (let r = 9 - w; r <= 9.01; r += 0.5) {
            const y = -1 - r * Math.sin(th), z = 6 + r * Math.cos(th);
            g.set(0, y, z, r > 8.6 ? ICE3 : r < 9 - w + 0.6 ? ICE2 : ((Math.round(y) + Math.round(z)) % 3 === 0 ? ICE3 : ICE));
          }
        }
      },
    };
    MODELS.hugo = H.humanoid(Object.assign({}, BODY, { extra: Object.assign({ weapon: BRIEFCASE }, EXTRA) }));
    MODELS.hugoScythe = H.humanoid(Object.assign({}, BODY, { extra: Object.assign({ weapon: SCYTHE }, EXTRA) }));
  }

  /* ------------------------------------------ the case and the scythe --
     The same body, two rigs: the briefcase (his own model, also on Sixth
     Street) and the scythe (swapped in for his Ice moves, CHOREO.swapRig),
     carrying the pose over so nothing pops. Each move flips it at its start
     (the events hgArm / hgFold, so a rival Proxy's Hugo does too); mech.tick
     folds the case back a moment after his last scythe move. */
  const _v = new THREE.Vector3();
  function look(a, armed) {
    a.stance = armed ? 'hugoArmed' : 'hugo';
    if ((a.rig.id === 'hugoScythe') === armed) return;
    const from = a.rig;
    CHOREO.swapRig(a, armed ? 'hugoScythe' : null);
    const to = a.rig; if (to === from) return;
    for (const n in to.parts) { const p = from.parts[n]; if (p && n !== 'weapon') to.parts[n].rotation.copy(p.rotation); }
    to.parts.hips.position.copy(from.parts.hips.position);
    if (a.obj.visible) { BT.sock(a, 'hand', _v); FX.glow(_v.x, _v.y, _v.z, 1.2, ICEC, 0.18, { size1: 2 }); FX.burst(_v.x, _v.y, _v.z, 8, { col: FROST, speed: 3, size: 0.08, life: 0.3, g: 0 }); }
  }

  /* --------------------------------------------------------------- poses -- */
  // his ready stances: composed, the case at his side; armed, the scythe held forward and up
  ANIM.READY.hugo = { armL: [-0.06, 0, 0.1], armR: [-0.1, 0, -0.12], torso: [0.02, 0.12, 0], head: [0.05, -0.15, 0.06], legL: [-0.06, 0, 0.05], legR: [0.08, 0, -0.04], hipsY: 0 };
  ANIM.READY.hugoArmed = { armR: [-0.5, 0.15, -0.15], armL: [-0.3, 0.3, 0.22], torso: [0.06, 0.25, 0], head: [0, -0.2, 0], legL: [-0.25, 0, 0.08], legR: [0.2, 0, -0.06], hipsY: -0.03 };
  // the briefcase as a club: a backhand, a forehand from above, a low lunge (hits 1-3, the Dash Attack)
  ACT.hgCase1 = (b, t, th, d) => stage(b, { armR: [-1.2, 0.5, 0.8], torso: [0, -0.55, 0] }, { armR: [-1.1, -0.3, -0.9], torso: [0.1, 0.6, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0] }, t, th, d);
  ACT.hgCase2 = (b, t, th, d) => stage(b, { armR: [-2.5, 0, -0.4], torso: [-0.1, 0.5, 0] }, { armR: [-0.6, 0, 0.3], torso: [0.25, -0.45, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0], hipsY: -0.06 }, t, th, d);
  ACT.hgLunge = (b, t, th, d) => stage(b, { armR: [0.4, 0, -0.3], armL: [-0.3, 0, 0.3], torso: [0.25, 0.5, 0], legR: [0.5, 0, 0], hipsY: -0.08 }, { armR: [-1.55, 0, 0.1], armL: [0.5, 0, 0.5], torso: [0.45, -0.3, 0], legL: [-1.1, 0, 0], legR: [0.85, 0, 0], hipsY: -0.22 }, t, th, d);
  // the scythe in both hands: a great vertical reap; sweeps right and left
  ACT.hgReap = (b, t, th, d) => stage(b, { armR: [-2.3, -0.15, 0.1], armL: [-2.3, -0.3, -0.1], torso: [-0.3, -0.25, 0], lift: 0.05 }, { armR: [-0.1, -0.15, 0.25], armL: [-0.6, -0.3, -0.15], torso: [0.45, -0.25, 0], legL: [-0.75, 0, 0], legR: [0.5, 0, 0], hipsY: -0.12 }, t, th, d);
  ACT.hgSweepR = (b, t, th, d) => stage(b, { armR: [-0.9, 1.0, -0.9], armL: [-0.2, 0.4, 0.3], torso: [0, 0.75, 0] }, { armR: [-0.9, -1.0, 0.7], armL: [-0.4, -0.4, 0.4], torso: [0.12, -0.75, 0], legL: [-0.55, 0, 0], legR: [0.3, 0, 0] }, t, th, d);
  ACT.hgSweepL = (b, t, th, d) => stage(b, { armR: [-0.9, -1.0, 0.7], torso: [0, -0.75, 0] }, { armR: [-0.9, 1.0, -0.9], armL: [-0.2, 0.4, 0.3], torso: [0.12, 0.75, 0], legR: [-0.55, 0, 0], legL: [0.3, 0, 0] }, t, th, d);
  // down low, the scythe braced like a rifle (the shaft level, his left hand under it); the shot kicks him back
  ACT.hgAim = b => add(b, { armR: [0.25, -0.15, 0.12], armL: [-1.0, -0.3, -0.1], torso: [0.22, -0.25, 0], head: [-0.12, 0.05, 0], legL: [-0.85, 0, 0.08], legR: [0.6, 0, -0.04], hipsY: -0.24 });
  ACT.hgFire = (b, t, th, d) => { const k = t < th ? 0 : Math.max(0, 1 - (t - th) / 0.2); return add(ACT.hgAim(b), { torso: [-0.18 * k, 0, 0], armR: [-0.15 * k, 0, 0], armL: [-0.1 * k, 0, 0], hipsY: 0.03 * k }); };
  ACT.hgChargeShot = (b, t, th, d) => add(ACT.hgFire(b, t, th, d), { roll: t < th ? Math.sin(t * 48) * 0.012 : 0 });
  ACT.hgQuartet = (b, t, th, d) => t < 0.42 ? ACT.hgReap(b, t, th, 0.42) : ACT.hgFire(b, t - 0.42, 0.28, d - 0.42);
  // the Concerto: the scythe flung ahead, caught, then the shot
  ACT.hgThrow = (b, t, th, d) => stage(b, { armR: [-2.4, 0.3, -0.6], armL: [-0.2, 0, 0.4], torso: [-0.15, 0.6, 0] }, { armR: [-1.1, -0.4, 0.5], armL: [-0.6, 0, 0.6], torso: [0.25, -0.5, 0], legL: [-0.7, 0, 0], legR: [0.45, 0, 0], hipsY: -0.08 }, t, th, d);
  ACT.hgConcerto = (b, t, th, d) => t < 0.5 ? ACT.hgThrow(b, t, 0.2, 0.5) : ACT.hgFire(b, t - 0.5, 0.3, d - 0.5);
  // the Dodge Counter (and Quick Assist): sweep, sweep, reap; the ranged phase: a hop back, then the shot
  ACT.hgCounter = (b, t, th, d) => t < 0.24 ? ACT.hgSweepR(b, t, 0.12, 0.24) : t < 0.48 ? ACT.hgSweepL(b, t - 0.24, 0.12, 0.24) : ACT.hgReap(b, t - 0.48, 0.12, d - 0.48);
  ACT.hgBackShot = (b, t, th, d) => t < 0.28 ? add(b, { legL: [-1.1, 0, 0.2], legR: [-0.6, 0, -0.2], armR: [0.2, 0, -0.2], armL: [-0.6, 0, 0.5], torso: [0.35, 0, 0], hipsY: -0.1, tilt: -0.25 * Math.sin(t / 0.28 * PI) }) : ACT.hgFire(b, t - 0.28, Math.max(0.05, th - 0.28), d - 0.28);
  // the Special: the scythe spun round him, then a slash
  ACT.hgSpecial = (b, t, th, d) => t < 0.36 ? add(b, { armR: [-1.0, 0, -1.2], armL: [-0.8, 0, 1.0], legL: [-0.4, 0, 0.1], legR: [0.3, 0, 0], hipsY: -0.08, spin: clamp(t / 0.32, 0, 1) * PI * 2 })
    : stage(b, { armR: [-1.0, 1.1, -1.0], torso: [0, 0.8, 0] }, { armR: [-1.0, -1.0, 0.7], torso: [0.12, -0.8, 0], legL: [-0.7, 0, 0], legR: [0.4, 0, 0], hipsY: -0.14 }, t - 0.36, 0.19, d - 0.36);
  // dashing low, the scythe trailing
  ACT.hgRush = b => add(b, { armR: [0.6, 0, -0.4], armL: [0.5, 0, 0.4], torso: [0.55, 0, 0], legL: [-1.0, 0, 0], legR: [0.8, 0, 0], hipsY: -0.16 });
  // the EX: a dash through the enemy, the scythe twirled overhead, then the rising Finishing Move
  ACT.hgEx = (b, t, th, d) => t < 0.3 ? ACT.hgRush(b)
    : t < 0.9 ? add(b, { armR: [-2.6 + Math.sin(t * 30) * 0.15, 0, -0.25], armL: [-0.5, 0, 0.7], torso: [-0.12, 0, 0], head: [-0.2, 0, 0], legL: [-0.3, 0, 0.1], legR: [0.25, 0, -0.1], spin: (t - 0.3) / 0.6 * PI * 2 })
    : stage(b, { armR: [0.4, 0.3, -0.4], armL: [0.2, 0, 0.4], torso: [0.45, 0.4, 0], hipsY: -0.22 }, { armR: [-2.8, -0.2, 0.1], armL: [-1.2, 0, 0.5], torso: [-0.3, -0.3, 0], legL: [-0.3, 0, 0], legR: [0.5, 0, 0], lift: 0.3 }, t - 0.9, 0.15, d - 0.9);
  // the Chain Attack: a long low lunge, a wide slash, then a charged shot
  ACT.hgChain = (b, t, th, d) => t < 0.3 ? ACT.hgRush(b) : t < 0.6 ? ACT.hgSweepR(b, t - 0.3, 0.1, 0.3) : ACT.hgChargeShot(b, t - 0.6, 0.42, d - 0.6);
  // the Ultimate: the scythe thrown, then he stands at ease, a hand over his face (the red eye), and sweeps the Finishing Move
  ACT.hgUlt = (b, t, th, d) => t < 0.4 ? ACT.hgThrow(b, t, 0.2, 0.4)
    : t < 1.45 ? add(b, { armL: [-2.4, 0, -0.45], armR: [0.12, 0, -0.06], head: [0.12, 0.2, 0.06], torso: [-0.06, 0.1, 0], legL: [0.2, 0, 0.06], legR: [-0.15, 0, -0.04], hipsY: 0.03 })
    : ACT.hgSweepR(b, t - 1.45, 0.2, d - 1.45);
  ACT.hgFollow = (b, t, th, d) => t < 0.42 ? ACT.hgSweepR(b, t, 0.28, 0.42) : ACT.hgSweepL(b, t - 0.42, 0.14, d - 0.42);
  // the parry: the shaft held across against the blow
  ACT.hgParry = b => add(b, { armR: [-1.1, -0.5, 0.5], armL: [-1.2, 0.5, -0.4], torso: [0.12, -0.25, 0], hipsY: -0.1, legL: [-0.45, 0, 0.1], legR: [0.45, 0, -0.1] });

  /* ------------------------------------------------------------- effects --
     hgSlash: an ice crescent (tilt: its plane; fwd: that far ahead); hgShot:
     the shot from the scythe's head, a beam of ice (big: the charged one);
     hgCharge: frost drawn in as the shot charges; hgThrow: the scythe flung
     (vert: end over end ahead and back; stay: spinning flat at the target);
     hgRing: a ring of light; hgCrystals: violet-blue ice bursting from the
     ground (the Finishing Move); hgBlade: the Ultimate's huge jagged blade of
     ice; hgGlow, hgCoin (a coin flipped), hgMist, hgTwirl; hgArm / hgFold:
     the case opening / closing. Hit effects (fx): hgFrost, hgShards. */
  const S = CHOREO.streams, E = CHOREO.events, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const sockAt = (a, name) => { BT.sock(a, name, _v); _v.y = clamp(_v.y, 0.5, 1.6); return _v; };
  E.hgArm = a => look(a, true);
  E.hgFold = a => look(a, false);
  E.hgSlash = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), f = (e.fwd || 0) + 0.3, x = a.x + fx * f, z = a.z + fz * f;
    const y = (e.y || 1.05) + (a.airY || 0), r = e.r || 2.3, w = e.big ? 0.62 : 0.45, arc = e.arc || 2.8, tilt = e.tilt || 0, sweep = e.sweep || 1.1;
    FX.slash(x, y, z, r, dir, ICEC, { tilt, arc, width: w, life: 0.3, sweep });
    FX.slash(x, y, z, r * 0.84, dir, 0xffffff, { tilt, arc: arc * 0.9, width: w * 0.35, life: 0.22, sweep });
    for (let i = 0; i < (e.big ? 20 : 10); i++) {
      const an = dir + rnd(-arc / 2, arc / 2), d = r * rnd(0.7, 1.05);
      FX.p({ x: x + Math.sin(an) * d * 0.8, y: y + rnd(-0.6, 0.6) * (0.3 + Math.abs(Math.sin(tilt))), z: z + Math.cos(an) * d * 0.8, vx: Math.sin(an) * rnd(1, 3), vy: rnd(-0.4, 1.2), vz: Math.cos(an) * rnd(1, 3), drag: 2.2, life: rnd(0.3, 0.55), size: 0.1, size1: 0.02, col: U.pick(FROST) });
    }
    if (e.big) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.14);
  };
  E.hgShot = (a, A, e) => {
    const B = BT.B, dir = A.dir, m = sockAt(a, 'weapon'), L = e.len || 7, big = e.big ? 1.9 : 1;
    const p0 = V3(m.x, m.y, m.z), p1 = V3(m.x + Math.sin(dir) * L, m.y, m.z + Math.cos(dir) * L);
    FX.beam(p0, p1, ICEC, 0.16 * big, e.big ? 0.32 : 0.2); FX.beam(p0, p1, 0xffffff, 0.06 * big, e.big ? 0.26 : 0.15);
    FX.glow(p0.x, p0.y, p0.z, 1.0 * big, 0xffffff, 0.12, { size1: 2 * big }); FX.glow(p0.x, p0.y, p0.z, 1.5 * big, ICEC, 0.2, { size1: 2.8 * big });
    for (let i = 0; i < 14 * big; i++) { const d = rnd(0.5, L); FX.p({ x: p0.x + Math.sin(dir) * d, y: p0.y + rnd(-0.15, 0.15), z: p0.z + Math.cos(dir) * d, vx: rnd(-1, 1), vy: rnd(-0.5, 1), vz: rnd(-1, 1), drag: 2.5, life: 0.4, size: 0.1, size1: 0.02, col: U.pick(FROST) }); }
    if (e.big) { FX.glow(p1.x, p1.y, p1.z, 2.2, ICEC, 0.3, { size1: 3.4 }); FX.ring(p1.x, p1.z, 0.3, 2.0, 0xdaf6ff, 0.35); }
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.2 : 0.07); SFX.play(e.big ? 'boom' : 'shot');
  };
  S.hgCharge = (a, A, s) => {
    const m = sockAt(a, 'weapon'), k = clamp((A.t - s.t0) / Math.max(0.05, s.t1 - s.t0), 0, 1);
    for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(0.6, 1.3); FX.p({ x: m.x + Math.cos(an) * r, y: m.y + rnd(-0.6, 0.6), z: m.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 4, vz: -Math.sin(an) * r * 4, life: 0.22, size: 0.09, size1: 0.02, col: U.pick(FROST) }); }
    if (Math.random() < 0.5) FX.glow(m.x, m.y, m.z, 0.3 + k * 0.9, ICEC, 0.08);
  };
  S.hgMist = (a, A, s, dt) => { if (Math.random() < dt * 50) FX.p({ x: a.x + rnd(-1.5, 1.5), y: rnd(0.1, 0.6), z: a.z + rnd(-1.5, 1.5), vx: rnd(-0.5, 0.5), vy: rnd(0.1, 0.5), vz: rnd(-0.5, 0.5), drag: 1, life: 0.9, size: 0.3, size1: 0.6, col: U.pick([0xdaf6ff, 0xa7d8f0, 0xffffff]) }); };
  S.hgTwirl = a => { const an = BT.B.real * 14; for (let i = 0; i < 2; i++) { const a2 = an + i * PI; FX.p({ x: a.x + Math.cos(a2) * 1.3, y: 2.1 + (a.airY || 0), z: a.z + Math.sin(a2) * 1.3, vx: -Math.sin(a2) * 2, vz: Math.cos(a2) * 2, life: 0.3, size: 0.13, size1: 0.02, col: U.pick(FROST) }); } };
  let scytheProto = null;
  const scytheObj = () => { if (!scytheProto) { const g = new VX.Grid(); MODELS.hugoScythe.parts.weapon.draw(g); scytheProto = VX.object(g, MODELS.hugo.scale, { cast: false }); } return scytheProto.clone(); };
  E.hgThrow = (a, A, e, tgt) => {
    const B = BT.B, dur = e.dur || 0.5, P = a.rig.parts.weapon, s = MODELS.hugo.scale;
    if (P) P.visible = false;
    a.hgThrowT = B.t + dur;
    const g = new THREE.Group(), spin = new THREE.Group(), o = scytheObj();
    o.position.set(0, 0, -5 * s); if (!e.vert) o.rotation.z = PI / 2;               // turned about its middle; laid flat unless end over end
    spin.add(o); g.add(spin); g.rotation.y = A.dir;
    const fx = Math.sin(A.dir), fz = Math.cos(A.dir), L = e.len || 4.5, x0 = a.x + fx * L, z0 = a.z + fz * L;
    FX.custom(g, dur, (k, dt2) => {
      if (!BT.B) return;
      if (e.vert) spin.rotation.x += dt2 * 26; else spin.rotation.y += dt2 * 24;
      const out = e.stay ? (k < 0.2 ? U.easeOut(k / 0.2) : k > 0.82 ? 1 - U.easeIn((k - 0.82) / 0.18) : 1) : Math.sin(k * PI);
      const tx = e.stay && tgt && tgt.alive ? tgt.x : x0, tz = e.stay && tgt && tgt.alive ? tgt.z : z0;
      g.position.set(lerp(a.x, tx, out), 1.1 + (e.stay ? 0.4 * out : 0), lerp(a.z, tz, out));
      if (Math.random() < 0.7) FX.p({ x: g.position.x + rnd(-0.4, 0.4), y: g.position.y + rnd(-0.3, 0.3), z: g.position.z + rnd(-0.4, 0.4), life: 0.3, size: 0.11, size1: 0.02, col: U.pick(FROST) });
      if (k >= 0.98) { const W = a.rig.parts.weapon; if (W) W.visible = true; }
    });
  };
  E.hgRing = (a, A, e, tgt) => {
    const at = e.at === 'target' && tgt ? tgt : a, r = e.r || 2.4;
    FX.ring(at.x, at.z, 0.4, r, ICEC, 0.35, { y: 0.9 }); FX.ring(at.x, at.z, 0.3, r * 0.75, 0xffffff, 0.28, { y: 1.0, a: 0.6 });
    FX.burst(at.x, 1.0, at.z, 12, { col: FROST, speed: 5, size: 0.1, life: 0.35, g: 1 });
  };
  E.hgCrystals = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 2, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 2, r = e.r || 2.6;
    for (let i = 0; i < (e.big ? 16 : 10); i++) {
      const an = rnd(0, PI * 2), d = rnd(0.2, r * 0.8), h = rnd(1.0, 2.4) * (e.big ? 1.3 : 1), lean = rnd(0.2, 0.6), p0 = V3(x + Math.cos(an) * d, 0.05, z + Math.sin(an) * d);
      FX.beam(p0, V3(p0.x + Math.cos(an) * lean, h, p0.z + Math.sin(an) * lean), U.pick([VIOLET, 0x8fb8ff, ICEC]), rnd(0.18, 0.34), 0.55);
    }
    FX.glow(x, 1.0, z, r * 1.2, VIOLET, 0.35, { size1: r * 2 }); FX.ring(x, z, 0.4, r * 1.1, 0xb0c8ff, 0.45);
    FX.burst(x, 0.6, z, 40, { col: [0xffffff, 0xdaf6ff, VIOLET, ICEC], speed: 7, size: 0.14, size1: 0.03, life: 0.6, g: 3, up: 2 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.4 : 0.25); SFX.play('boom');
  };
  E.hgBlade = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 2, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 2, r = e.r || 4.4, dir = A.dir;
    FX.slash(x, 1.1, z, r, dir, ICEC, { tilt: 0.12, arc: 5.4, width: 1.1, life: 0.45, sweep: 2.4 });
    FX.slash(x, 1.15, z, r * 0.8, dir, 0xffffff, { tilt: 0.12, arc: 5.0, width: 0.4, life: 0.35, sweep: 2.4 });
    for (let i = 0; i < 10; i++) { const an = dir - 2.6 + i * 0.58, d1 = r * rnd(1.0, 1.25); FX.beam(V3(x + Math.sin(an) * r * 0.7, 0.9, z + Math.cos(an) * r * 0.7), V3(x + Math.sin(an) * d1, 1.2 + rnd(-0.3, 0.5), z + Math.cos(an) * d1), U.pick([ICEC, 0xdaf6ff, VIOLET]), 0.22, 0.4); }   // the jagged teeth
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.4);
  };
  E.hgGlow = a => { BT.sock(a, 'chest', _v); FX.glow(_v.x, _v.y, _v.z, 2.2, ICEC, 0.3, { size1: 3.4 }); FX.burst(_v.x, _v.y, _v.z, 16, { col: FROST, speed: 3, size: 0.1, life: 0.4, g: 0 }); };
  E.hgCoin = a => { BT.sock(a, 'off', _v); FX.p({ x: _v.x, y: _v.y, z: _v.z, vy: 6.5, g: 13, life: 1.0, size: 0.13, size1: 0.13, col: 0xf2c94c, spin: 26 }); FX.glow(_v.x, _v.y, _v.z, 0.5, 0xfff0a0, 0.15); };
  FX.extra.hgFrost = o => { const L = o.len || 7; for (let i = 0; i < 16; i++) { const d = rnd(0.5, L); FX.p({ x: o.fromX + Math.sin(o.yaw) * d, y: 1 + rnd(-0.25, 0.25), z: o.fromZ + Math.cos(o.yaw) * d, vx: rnd(-0.6, 0.6), vy: rnd(0, 0.8), vz: rnd(-0.6, 0.6), drag: 1.5, life: rnd(0.3, 0.6), size: 0.14, size1: 0.3, col: U.pick([0xdaf6ff, 0xa7d8f0, 0xffffff]) }); } };
  FX.extra.hgShards = o => FX.burst(o.x, 1.0, o.z, 18, { col: FROST, speed: 5, size: 0.12, size1: 0.02, life: 0.4, g: 3 });

  /* -------------------------------------------------------- choreography -- */
  // (every move opens or closes the case first: hgArm / hgFold)
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; def.events = [{ t: 0, fx: def.hgCase ? 'hgFold' : 'hgArm' }].concat(def.events || []); };
  const slash = (t, o) => Object.assign({ t, fx: 'hgSlash' }, o || {});
  const shot = (t, o) => Object.assign({ t, fx: 'hgShot' }, o || {});
  const charging = (t0, t1) => ({ t0, t1, kind: 'hgCharge' });
  const trail = (t0, t1, col) => ({ t0, t1, kind: 'afterimage', col: col || ICEC });
  const WARM = 0xffc080;
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.45 }], events: [{ t: 0.16, fx: 'crescent', y: 0.9, tilt: -0.5, r: 1.7, arc: 1.8, col: WARM }, { t: 0.16, fx: 'sparkBurst' }] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.5 }], events: [{ t: 0.2, fx: 'crescent', y: 1.0, tilt: 1.1, r: 1.8, arc: 2.0, col: WARM }, { t: 0.2, fx: 'sparkBurst' }] });
  // the lunge leaves a long violet streak (official GIF)
  set(K.basic[2], { motion: [{ t0: 0.04, t1: 0.24, kind: 'toTarget', gap: 0.4 }], stream: [trail(0.02, 0.26, VIOLET)], events: [{ t: 0.24, fx: 'thrustLine', col: VIOLET, len: 3.6 }, { t: 0.24, fx: 'sparkBurst' }] });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.45 }, { t0: 0.36, t1: 0.56, kind: 'back', d: 1.1 }], events: [slash(0.22, { tilt: 1.45, r: 2.5, arc: 3.0, y: 1.2, big: true }), shot(0.7)] });
  set(K.q4c, { motion: [{ t0: 0.52, t1: 0.64, kind: 'back', d: 0.4 }], stream: [charging(0, 0.52)], events: [shot(0.52, { big: true, len: 8.5 })] });
  set(K.conc, { motion: [{ t0: 0.5, t1: 0.66, kind: 'back', d: 0.6 }], events: [{ t: 0.15, fx: 'hgThrow', dur: 0.42, len: 4.6, vert: true }, slash(0.32, { tilt: 1.5, r: 1.6, arc: 5.6, fwd: 3, sweep: 3 }), shot(0.8)] });
  set(K.concC, { motion: [{ t0: 0.52, t1: 0.66, kind: 'back', d: 0.5 }], stream: [charging(0, 0.52)], events: [shot(0.52, { big: true, len: 9 })] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.26, kind: 'toTarget', gap: 0.9 }], stream: [trail(0, 0.26, VIOLET)], events: [{ t: 0.26, fx: 'thrustLine', col: VIOLET, len: 2.4 }, { t: 0.26, fx: 'sparkBurst' }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.1, side: 'auto' }, { t0: 0.1, t1: 0.2, kind: 'toTarget', gap: 1.0 }], stream: [trail(0, 0.2)], events: [slash(0.12, { tilt: -0.25 }), slash(0.36, { tilt: 0.3 }), slash(0.6, { tilt: 1.4, big: true })] });
  for (const k of ['ctrShot', 'qkShot']) set(K[k], { motion: [{ t0: 0, t1: 0.28, kind: 'leap', h: 0.5, d: -1.6 }], stream: [trail(0, 0.28)], events: [shot(0.44, { len: 7.5 })] });
  for (const k of ['ctrShotC', 'qkShotC']) set(K[k], { motion: [{ t0: 0.52, t1: 0.64, kind: 'back', d: 0.4 }], stream: [charging(0, 0.52)], events: [shot(0.52, { big: true, len: 9 })] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.1 }], stream: [trail(0, 0.2)], events: [slash(0.12, { tilt: -0.25 }), slash(0.36, { tilt: 0.3 }), slash(0.6, { tilt: 1.4 })] });
  // the Special: a dash in, a spin ringed with light, a slash, frost mist
  set(K.special, { motion: [{ t0: 0, t1: 0.18, kind: 'toTarget', gap: 1.0 }], stream: [trail(0, 0.18), { t0: 0.55, t1: 0.88, kind: 'hgMist' }], events: [{ t: 0.24, fx: 'hgRing', r: 2.4 }, slash(0.24, { tilt: 0, r: 2.3, arc: 6.2, sweep: 2.8 }), slash(0.55, { tilt: 0.1, r: 2.8, arc: 3.2, big: true })] });
  // the EX: a blue glow, a dash through the enemy, arcs overhead, the ice bursting from the ground
  set(K.ex, { motion: [{ t0: 0.05, t1: 0.3, kind: 'toTarget', gap: -1.4 }], stream: [trail(0, 0.3), { t0: 0.3, t1: 0.9, kind: 'hgTwirl' }],
    events: [{ t: 0, fx: 'hgGlow' }].concat([0.45, 0.6, 0.75].map(t => slash(t, { tilt: 0.15, r: 2.0, arc: 5.8, y: 2.0, sweep: 2.6 }))).concat([{ t: 1.05, fx: 'hgCrystals', r: 2.6 }, { t: 1.05, fx: 'whiteFlash' }]) });
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 0.9 }, { t0: 0.6, t1: 0.82, kind: 'back', d: 1.2 }], stream: [trail(0, 0.3), charging(0.7, 1.02)],
    events: [slash(0.4, { tilt: 0.05, r: 3.4, arc: 4.2, big: true, sweep: 1.6 }), shot(1.02, { big: true, len: 9.5 }), { t: 1.02, fx: 'whiteFlash' }] });
  // the Ultimate: a coin flipped, the scythe thrown spinning at the target, then the huge blade of ice
  set(K.ult, { events: [{ t: 0.02, fx: 'hgCoin' }, { t: 0.2, fx: 'hgThrow', dur: 1.25, stay: true }].concat([0.65, 0.9, 1.15].map(t => ({ t, fx: 'hgRing', r: 2.4, at: 'target' })))
    .concat([{ t: 1.65, fx: 'hgBlade', r: 4.4 }, { t: 1.65, fx: 'hgCrystals', r: 4.0, big: true }, { t: 1.65, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.26, kind: 'toTarget', gap: 1.0 }], stream: [trail(0, 0.26)], events: [slash(0.28, { tilt: -0.2 }), slash(0.56, { tilt: 0.35, big: true })] });
  set(K.assist, {});
})();
