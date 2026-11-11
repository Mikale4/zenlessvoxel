/* ============================================================================
   agents/billy.js -- Billy Kid, "the White Chariot" of the Cunning Hares
   (Gentle House): an Intelligent Construct, once Calydon's Champion, now a
   die-hard Starlight Knight fan with a pair of revolvers he calls "the girls".
   A-Rank, Physical, Attack, Evasive Assist. Released in Version 1.0.
   (How an Agent's own file works, its hooks and its helpers: agents/zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Billy Kid, Lore, Dialogue: the eleven
   Sixth Street trust events and the Quality Time places, Voice-Overs, DMs,
   Media; Starlight Engine Replica; the Basic Attack: Full Firepower scaling
   table), zzz.gachabase.net (datamine, agent 1081, game data 3.4.3 beta:
   stats, skill text, multipliers, Buildup, the hit-by-hit split of every move
   and which hit is heavy, core levels, Mindscapes), Game8 (Steady Shot by core
   level), the official portrait, combat and city models and character sheet.

   His kit (official):
     Basic Attack: Full Firepower    press: Standing Fire (piercing shots).
                                     Press again or hold: Crouching Shot, he
                                     kneels and keeps firing as long as you
                                     press or hold. Stick pushed meanwhile:
                                     Rolling Shot. Let go: Finishing Shot.
     Dash Attack: Starlight Sanction stick pushed out of the dodge: Scattered,
                                     shots all round him; not pushed: Focused,
                                     one straight piercing shot.
     Dodge Counter: Fair Fight       Special Attack: Stand Still (up to 3
                                     piercing shots in a line, Anti-Interrupt)
     EX Special Attack: Clearance Time  60 Energy, piercing shots in a line.
     Chain Attack: Starlight Mirage  Ultimate: Starlight, Shine Bright (piercing
                                     shots at everything round him)
     Quick Assist: Power of Teamwork Evasive Assist: Flash Spin
     Assist Follow-Up: Fatal Shot    (pierces a large area in front)
     Core Passive: Steady Shot       entering Crouching Shot: his DMG +50% until
                                     he moves, returns to standby, or is knocked
                                     back or launched.
     Additional Ability: Team Starlight  with another Agent of his Attribute or
                                     Faction: each Chain Attack gives his next
                                     Ultimate +50% DMG (2 stacks; an Ultimate
                                     resets them).
   Our choices where no source says (the report lists them): how many bullets
   each fire makes (Standing Fire: 2 hits and 4 bullets; entering Crouching
   Shot: the Crouching Fire's 2 hits and 4 bullets; every further 0.4 s of it:
   6 bullets; the bullets land a pair, one from each gun, to a hit); all timings; a Rolling Shot is part of Crouching Shot and keeps
   Steady Shot; the stick sets the Rolling Shot's way (forward, back, left,
   right of him); AUTO's Dash Attack is Scattered with 2 enemies near him.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, add, mix } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // a share k of a move's official [DMG%, Daze%, Anomaly Buildup] (the datamine gives each as one number and splits it over its hits)
  const part = (t, k, T, o) => hit(t, T[0] * k, T[1] * k, Math.round(T[2] * k * 100) / 100, o);
  // official level-12 values (gachabase skill_data: base + 11 steps; Buildup /100). Fire and Rolling Shot: the 2 hits together;
  // Bullet: one bullet
  const SF = [136.2, 81.9, 54.39], SB = [15.3, 9.4, 6.04], CF = [124.5, 82.2, 29.03], CB = [25.9, 14.4, 8.89];
  const RS = [124.5, 82.2, 29.03], FS = [99.0, 83.8, 80.79];
  const SP1 = [48.4, 36.3, 24.14], SP2 = [103.4, 78.1, 25.84], SP3 = [100.7, 75.4, 25.00];
  const EXM = [1088.3, 659.5, 446.87], DSM = [126.8, 94.9, 34.98], DFM = [78.6, 29.4, 43.29], DCM = [443.6, 290.2, 93.36];
  const CHM = [1471.1, 295.6, 417.83], ULM = [3196.0, 286.3, 211.70], QAM = [186.9, 140.7, 93.36], FUM = [778.2, 512.8, 364.97];
  const STEADY = 0.5, TEAM = 0.5;                      // Steady Shot at core level F; Team Starlight a stack (up to 2)
  const WIN = 0.6;                                     // after Standing Fire or a Stand Still shot: a press carries on (ours)
  // the datamined split of each move over its hits
  const S4 = [1 / 3, 1 / 6, 1 / 6, 1 / 3], S3 = [0.25, 0.25, 0.5];
  const SCH = [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.05, 0.05, 0.1];
  const SUL = [...Array(9).fill(0.07), ...Array(7).fill(1 / 70), 0.07, 0.2];
  const SFU = [...Array(10).fill(0.08), 0.1, 0.1];
  // when the hits land (ours) and which gun fires each: R his right, L his left, B both
  const T_ST = [0.12, 0.17, 0.22, 0.28, 0.33, 0.38], G_ST = 'BRLBRL';
  const T_CI = [0.16, 0.21, 0.26, 0.31, 0.36, 0.41], G_CI = 'BRLBRL';
  const T_LP = [0.03, 0.09, 0.15, 0.21, 0.27, 0.33], G_LP = 'RLRLRL';
  const T_RO = [0.34, 0.44], G_RO = 'RB';
  const T_FI = [0.2, 0.3, 0.38, 0.52], G_FI = 'BRLB';
  const T_EX = [0.3, 0.46, 0.56, 0.78], G_EX = 'BRLB';
  const T_DS = [0.14, 0.2, 0.26, 0.32, 0.38, 0.44, 0.5];
  const T_DC = [0.2, 0.3, 0.44], G_DC = 'RLB';
  const T_QA = [0.26, 0.36, 0.5], G_QA = 'RLB';
  const T_FU = [0.16, 0.22, 0.28, 0.34, 0.4, 0.46, 0.52, 0.58, 0.64, 0.7, 0.86, 1.0], G_FU = 'RLRLRLRLRLBB';
  const T_CH = [0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92, 1.04, 1.12, 1.3];
  const T_UL = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.36, 1.41, 1.46, 1.51, 1.56, 1.61, 1.66, 1.78, 2.05];
  const TRACER = 0xfff2c0, FLASH = 0xffc860, BRASS = 0xd6b67d, STAR = 0xffe27a, AFT = 0xd85c5c;

  /* ----------------------------------------------------------------- kit -- */
  // every hit is a piercing shot: a line (or, all round him, a circle). fx: blHit keeps battle.js's sword slash off a gunshot
  // (the shots themselves are drawn by the choreography below)
  const LINE = (r, len, o) => Object.assign({ shape: 'line', r, len, fx: 'blHit' }, o || {});
  const RING = (r, o) => Object.assign({ shape: 'circle', r, fx: 'blHit' }, o || {});
  const HV = kb => ({ heavy: true, kb });
  const BA = 'Basic Attack: Full Firepower', SS = 'Special Attack: Stand Still';
  // the bullets land a pair at a time, one from each gun: a hit for every two (this game pays Energy and Decibels by the hit,
  // and at a hit a bullet he would fill them twice as fast as anyone else)
  // Standing Fire: its 2 hits (both guns) and 4 Standing Bullets between them (neither is heavy in the datamine)
  const STAND = { name: BA, anim: 'blStand', dur: 0.62, cancel: 0.46, reach: 6.5, range: 4, track: 0.36,
    hits: [part(0.12, 0.5, SF, LINE(0.8, 7)), part(0.2, 2, SB, LINE(0.6, 7)), part(0.28, 0.5, SF, LINE(0.8, 7)), part(0.36, 2, SB, LINE(0.6, 7))] };
  // a Rolling Shot: a roll the way the stick pushes, then its 2 hits (the 2nd heavy; the datamine's roll to the left has none)
  const roll = (side) => ({ name: BA + ' (Rolling Shot)', anim: 'blRoll' + side, dur: 0.62, cancel: 0.5, reach: 7, range: 4, track: 0.44, holdRepeat: true,
    hits: [part(T_RO[0], 0.5, RS, LINE(0.8, 7)), part(T_RO[1], 0.5, RS, LINE(0.9, 7, side === 'L' ? {} : HV(0.5)))] });
  const K = {
    basic: [STAND],
    stand: STAND,
    // into Crouching Shot (held, or Basic again after Standing Fire): the Crouching Fire's 2 hits (the 2nd heavy) and 4 bullets
    crouchIn: { name: BA + ' (Crouching Shot)', anim: 'blCrouchIn', dur: 0.58, cancel: 0.44, reach: 7, range: 4, track: 0.4, holdRepeat: true,
      hits: [part(0.16, 0.5, CF, LINE(0.8, 7)), part(0.24, 2, CB, LINE(0.6, 7)), part(0.31, 0.5, CF, LINE(0.8, 7, HV(0.4))), part(0.39, 2, CB, LINE(0.6, 7))] },
    // ...and on, for as long as Basic is held or pressed: Crouching Bullets, 6 every 0.4 s
    crouch: { name: BA + ' (Crouching Shot)', anim: 'blCrouch', dur: 0.46, cancel: 0.4, reach: 7, range: 4, track: 0.4, holdRepeat: true,
      hits: [0.06, 0.18, 0.3].map(t => part(t, 2, CB, LINE(0.6, 7))) },
    rollL: roll('L'), rollR: roll('R'), rollF: roll('F'), rollB: roll('B'),
    // let go: the Finishing Shot (4 hits, the last heavy)
    finish: { name: BA + ' (Finishing Shot)', anim: 'blFinish', dur: 0.82, cancel: 0.64, reach: 7, range: 4, track: 0.2,
      hits: T_FI.map((t, i) => part(t, S4[i], FS, LINE(i === 3 ? 1.2 : 0.9, 8, i === 3 ? HV(0.8) : {}))) },
    dash: { name: 'Dash Attack: Starlight Sanction (Scattered)', anim: 'blSpin', dur: 0.7, cancel: 0.56, reach: 7, hits: T_DS.map(t => part(t, 1 / 7, DSM, RING(3.8))) },
    dashF: { name: 'Dash Attack: Starlight Sanction (Focused)', anim: 'blSlide', dur: 0.52, cancel: 0.4, reach: 8, hits: [part(0.22, 1, DFM, LINE(0.9, 8))] },
    counter: { name: 'Dodge Counter: Fair Fight', anim: 'blCounter', dur: 0.72, cancel: 0.56, reach: 7, inv: [0, 0.66],
      hits: T_DC.map((t, i) => part(t, S3[i], DCM, LINE(1.0, 8, i === 2 ? HV(0.9) : {}))) },
    // Stand Still: up to 3 shots, Special again for the next (resolve); each is heavy in the datamine
    special: { name: SS, anim: 'blShotR', dur: 0.5, cancel: 0.34, reach: 7, range: 4, cd: 2.5, dr: 0.4, hits: [part(0.18, 1, SP1, LINE(0.9, 8, HV(0.4)))] },
    sp2: { name: SS, anim: 'blShotL', dur: 0.5, cancel: 0.34, reach: 7, range: 4, cd: 2.5, dr: 0.4, hits: [part(0.16, 1, SP2, LINE(0.9, 8, HV(0.5)))] },
    sp3: { name: SS, anim: 'blShotB', dur: 0.62, cancel: 0.48, reach: 7, range: 4, cd: 2.5, dr: 0.4, hits: [part(0.22, 1, SP3, LINE(1.1, 8.5, HV(0.9)))] },
    ex: { name: 'EX Special Attack: Clearance Time', anim: 'blEX', dur: 1.1, cancel: 0.95, cost: 60, reach: 7, range: 4, inv: [0, 1.0],
      hits: T_EX.map((t, i) => part(t, S4[i], EXM, LINE(i === 0 || i === 3 ? 1.4 : 1.1, 9, i === 3 ? HV(1.1) : {}))) },
    chain: { name: 'Chain Attack: Starlight Mirage', anim: 'blChain', dur: 1.6, inv: [0, 1.6],
      hits: T_CH.map((t, i) => part(t, SCH[i], CHM, RING(i === 10 ? 5.2 : 4.6, i === 10 ? HV(1.3) : {}))) },
    ult: { name: 'Ultimate: Starlight, Shine Bright', anim: 'blUlt', dur: 2.5, inv: [0, 2.5],
      hits: T_UL.map((t, i) => part(t, SUL[i], ULM, RING(i === 17 ? 6 : 5.4, i === 17 ? HV(1.8) : {}))) },
    assist: { name: 'Evasive Assist: Flash Spin', type: 'evasive', anim: 'blFlash', dur: 0.45, inv: [0, 0.45] },
    // ten quick shots fanning across a wide cone, then two big ones
    followup: { name: 'Assist Follow-Up: Fatal Shot', anim: 'blFollow', dur: 1.25, inv: [0, 1.2],
      hits: T_FU.map((t, i) => part(t, SFU[i], FUM, Object.assign({ shape: 'cone', r: 5.5, arc: 110, fx: 'blHit' }, i === 11 ? HV(1.0) : {}))) },
    quick: { name: 'Quick Assist: Power of Teamwork', anim: 'blQuick', dur: 0.75, inv: [0, 0.7],
      hits: T_QA.map((t, i) => part(t, S3[i], QAM, LINE(1.0, 8, i === 2 ? HV(0.7) : {}))) },
  };
  const ROLLS = [K.rollL, K.rollR, K.rollF, K.rollB], CRS = [K.crouchIn, K.crouch].concat(ROLLS), STILL = [K.special, K.sp2, K.sp3];

  /* ----------------------------------------------------- his mechanics -- */
  const floorDir = (I, c) => { const y = (c.B && c.B.cam && c.B.cam.yaw) || 0; return Math.atan2(Math.cos(y) * I.x - Math.sin(y) * I.y, -Math.sin(y) * I.x - Math.cos(y) * I.y); };   // the stick's way on the floor (as ai.js reads it)
  // you, in Crouching Shot with the stick pushed: a Rolling Shot that way (forward, back, to his left or right)
  function rollWay(a, c) {
    const I = BT.moveInput && BT.moveInput(); if (!I) return null;
    const r = U.wrap(floorDir(I, c) - a.face);
    return Math.abs(r) < PI / 4 ? K.rollF : Math.abs(r) > PI * 3 / 4 ? K.rollB : r > 0 ? K.rollL : K.rollR;
  }
  // the Dash Attack: yours Scattered with the stick pushed, Focused without; AUTO's Scattered with 2 enemies near him
  const scattered = a => BT.isPlayer(a) ? !!(BT.moveInput && BT.moveInput()) : BT.enemiesIn('circle', a.x, a.z, 4, 0).length >= 2;
  const steadyOff = a => { a.blSteady = false; };

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.billy = {
    id: 'billy', name: 'Billy Kid', short: 'Billy', faction: 'Cunning Hares', spec: 'Attack', attr: 'physical', rank: 'A',
    color: '#c23d3b', color2: '#efece6', assist: 'evasive', stance: 'billy',
    blurb: 'The Cunning Hares\' "White Chariot": an Intelligent Construct and one-time Outer Ring champion who lives for the Starlight Knight show, Monica\'s photobooks and Godfinger\'s arcade, and fetches Nicole\'s noodles. With his two revolvers, "the girls", he holds Basic to drop into Crouching Shot, a stream of piercing shots with +50% DMG from Steady Shot until he moves; push the stick for a Rolling Shot, let go for the Finishing Shot.',
    // Lv60 with core: HP 6,907, ATK 787, DEF 606, Impact 91, AM 92, AP 91, CRIT 19.4% / 50%, ER 1.2 (gachabase), on this game's scale
    stats: { hp: 7740, atk: 2650, def: 648, impact: 91, ap: 91, am: 92, cr: 0.49, cd: 0.9, er: 1.2, speed: 4.8 },
    ai: { range: 4, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120,
    core: [
      ['Core Passive: Steady Shot', 'When he enters Crouching Shot during his Basic Attack, Billy\'s DMG rises 50%, and it stays up (an EX or Ultimate straight out of it keeps it too) until he moves, walking or dodging, returns to standby, or is knocked back or launched.'],
      ['Full Firepower', 'Tap Basic for Standing Fire. Hold Basic, or press it again straight after, for Crouching Shot: he kneels and fires piercing shots for as long as you hold or keep pressing. Push the stick meanwhile for a Rolling Shot that way; let go for the Finishing Shot. Special again for Stand Still\'s 2nd and 3rd shots. Out of a dodge, Basic is Starlight Sanction: shots all round him with the stick pushed, one straight shot without.'],
      ['Additional Ability: Team Starlight', 'With another Physical Agent or a Cunning Hares member in the squad: each Chain Attack gives his next Ultimate +50% DMG (2 stacks at most); the Ultimate uses them up.'],
    ],
    kit: K,
    kitShow: [['Hold', 'crouch'], ['Hold + stick', 'rollL'], ['Let go', 'finish'], ['Dash (stick)', 'dash'], ['Dash', 'dashF']],
    rivalMoves: [{ k: 'crouchIn', kind: 'core', p: 0.25, cd: 3 }, { k: 'finish', kind: 'core', p: 0.2, cd: 5 }],
    howto: 'Billy Kid: hold Basic (or press it again after Standing Fire) for Crouching Shot, piercing shots for as long as you hold; Steady Shot gives +50% DMG from then until he moves, swaps out or is knocked down. Push the stick while firing for a Rolling Shot, let go for the Finishing Shot; Special again for Stand Still\'s next shot (up to 3). Chain Attacks with a Physical or Cunning Hares teammate store +50% DMG for his next Ultimate (2 at most). His assist is an Evasive Assist: he dodges, then Basic for Fatal Shot.',
    mech: {
      // blCrouch: in Crouching Shot; blSteady: Steady Shot; blStandT: until when Basic goes on into Crouching Shot; blSpN / blSpT:
      // the Stand Still shot just fired and until when the next can follow; blTeam / blTS: Team Starlight and its stacks;
      // blLoops / blWant / blPlan: AUTO's Crouching Shot (how long it has fired, how long it means to, its next step)
      init(a) { a.blCrouch = false; a.blSteady = false; a.blStandT = 0; a.blSpN = 0; a.blSpT = 0; a.blTeam = false; a.blTS = 0; a.blLoops = 0; a.blWant = 3; a.blPlan = null; hookUp(); },
      squad(a, B) { a.blTeam = B.squad.some(s => s !== a && (s.def.attr === a.def.attr || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B, bot = !A.data.manual, tgt = A.tgt && A.tgt.alive ? A.tgt : null;
        if (CRS.includes(def)) {
          if (!a.blSteady) BT.log('Billy: Steady Shot! +50% DMG until he moves.', 'skill');
          a.blSteady = true; a.blCrouch = true;
          if (def === K.crouchIn) { a.blLoops = 0; a.blWant = 2 + Math.floor(Math.random() * 3); } else a.blLoops++;
          // AUTO's next step (yours are your own presses): keep firing, a Rolling Shot now and then, or the Finishing Shot
          if (bot) a.blPlan = a.blLoops >= a.blWant ? 'finish' : !ROLLS.includes(def) && Math.random() < 0.18 ? (Math.random() < 0.5 ? 'rollL' : 'rollR') : 'crouch';
        } else { a.blCrouch = false; a.blPlan = null; }
        a.blStandT = def === K.stand ? B.t + A.dur + WIN : 0;
        // Stand Still: which shot this is, and the window for the next; AUTO presses Special again (queued: yours are yours)
        const n = STILL.indexOf(def) + 1;
        a.blSpN = n; a.blSpT = n === 1 || n === 2 ? B.t + A.dur + WIN : 0;
        if (bot && (n === 1 || n === 2) && a.energy < K.ex.cost && Math.random() < 0.8) a.queue.push({ def: STILL[n], kind: 'special', delay: 0.03, tgt });
        // Team Starlight: a stack for each Chain Attack, all of them on the next Ultimate
        if (A.kind === 'chain' && a.blTeam) { a.blTS = Math.min(2, a.blTS + 1); BT.log(`Billy: Team Starlight x${a.blTS}: his next Ultimate deals +${a.blTS * 50}% DMG.`, 'skill'); }
        if (A.kind === 'ult') { A.data.blTS = a.blTS; if (a.blTS) BT.callout('TEAM STARLIGHT', 'skill', `Billy · +${a.blTS * 50}% DMG`); a.blTS = 0; }
      },
      mods(a, v, h, A) { return { dmg: (a.blSteady ? STEADY : 0) + (A && A.data && A.data.blTS ? TEAM * A.data.blTS : 0) }; },
      swap(a, isIn) { if (!isIn) { steadyOff(a); a.blCrouch = false; } },
      tick(a, dt, on) {
        const A = a.act;
        // Steady Shot ends when he moves (a walk, a dodge), returns to standby, or is knocked back or launched
        if (a.blSteady && (!on || ['hit', 'down', 'getup', 'dodge', 'stun', 'dead'].includes(a.state) || (!A && a.moving))) steadyOff(a);
        if (!a.blCrouch) return;
        if (A && CRS.includes(A.def)) return;                                      // still in Crouching Shot
        if (A || !on || a.state !== 'idle' || a.moving) { a.blCrouch = false; return; }   // something else cut it short
        if (a.press || a.queue.length) return;                                        // a press on its way decides it
        // the last stretch of Crouching Shot played out with Basic let go: the Finishing Shot
        a.blCrouch = false;
        a.queue.push({ def: K.finish, kind: 'basic', delay: 0 });
      },
      // Special: within a moment of a Stand Still shot, without the Energy for the EX, the next one (up to 3).
      // Basic: out of a dodge, Starlight Sanction (Scattered or Focused). In Crouching Shot, held or pressed: more of it, or a
      // Rolling Shot the way the stick pushes (AUTO: as it planned, or its Finishing Shot). Otherwise held, or pressed again
      // straight after Standing Fire: into Crouching Shot; tapped: Standing Fire
      resolve(a, btn, hold, c) {
        if (btn === 'special') {
          if (a.energy >= K.ex.cost || !(a.blSpT > c.t) || a.blSpN < 1 || a.blSpN > 2) return null;
          return { def: STILL[a.blSpN], kind: 'special' };
        }
        if (btn !== 'basic') return null;
        if (c.dash) return { def: scattered(a) ? K.dash : K.dashF, kind: 'dash' };
        if (a.blCrouch) {
          if (BT.isPlayer(a)) return { def: rollWay(a, c) || K.crouch, kind: 'basic' };
          return { def: a.blPlan === 'finish' ? K.finish : a.blPlan && K[a.blPlan] ? K[a.blPlan] : K.crouch, kind: 'basic' };
        }
        if (hold || a.blStandT > c.t) return { def: K.crouchIn, kind: 'basic' };
        return { def: K.stand, kind: 'basic' };
      },
      // AUTO: after Standing Fire it presses again (resolve: into Crouching Shot); without the Energy for the EX, often straight
      // into Crouching Shot (always on a Stun). Its Crouching Shot runs as planned in start; Stand Still's shots are queued there
      ai(a, tgt, B) {
        if (a.blStandT > B.t) return { btn: 'basic' };
        if (a.energy < K.ex.cost && (tgt.stun > 0 || Math.random() < 0.45)) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const r = [];
        if (a.blCrouch) r.push(BT.isPlayer(a) ? 'CROUCHING SHOT · LET GO: FINISHING SHOT · STICK: ROLLING SHOT' : 'CROUCHING SHOT');
        else if (a.blStandT > B.t) r.push('BASIC AGAIN: CROUCHING SHOT');
        if (a.blSteady) r.push('STEADY SHOT +50% DMG');
        if (a.blSpT > B.t && a.blSpN >= 1 && a.blSpN <= 2) r.push(`STAND STILL ${a.blSpN}/3 · SPECIAL: NEXT SHOT`);
        if (a.blTeam) r.push(a.blTS ? `TEAM STARLIGHT x${a.blTS} · NEXT ULTIMATE +${a.blTS * 50}%` : 'TEAM STARLIGHT');
        return r;
      },
    },
    town: {
      // Sixth Street: every one of his trust events is there (Howl's Newsstand at 6 AM for Monica's photobook, a broken W-Engine
      // battery behind it; Nicole's takeaway from Waterfall Soup; Godfinger, where he keeps losing to Nicole and Anby; Officer
      // Gerant by Sage in a Barrel; Random Play; Coff Cafe and his instant coffee), as are his DM invitations (Box Galaxy,
      // Godfinger, Bardic Needle) and most of his Quality Time stops (the Bangboo Statue among them)
      home: 'sixth',
      // mornings in the newsstand's line and Waterfall Soup's (the boss's noodles); afternoons at Godfinger, Random Play, Coff
      // Cafe and the Bangboo Statue; evenings Godfinger, Bardic Needle's CDs and poses by the statue; late, the 141 for a snack
      // (the night he scared Officer Gerant), Godfinger's wall, Random Play
      routine: ['news:read 35, soup:queue 25, cafe:t 10, huddle 30', 'gf:cab 30, rp:door 20, cafe:t 15, box:statue 10, huddle 25', 'gf:cab 35, bardic:crates 20, box:statue 15, huddle 30', '141:stall 40, gf:wall 30, rp:night 30'],
      chatter: ['Starlight, it\'s time to shine!', 'Two guns. Double the accuracy. That\'s just math.'],
      lines: [
        'Billy Kid, Starlight Knight! ...And Cunning Hares. Both! Got a Hollow job? The girls and I are ready to roll.',
        'I usually drink the instant coffee from the 141. Coff Cafe\'s tastes exactly the same to me. Maybe my taste module\'s a few versions behind... Nicole won\'t pay a single Denny to upgrade it.',
        'A new Starlight Knight series is coming out! I\'m saving up for three sets. And Monica\'s new photobook. And the limited edition. ...Saving is hard.',
      ],
      chapters: [
        { title: 'The limited edition', ask: ['Manager! I\'m, uh, just out for a stroll. Definitely not queuing at the newsstand since 6 AM for Monica\'s limited-edition photobook. Nope.', 'Okay, I am. But the boss wants her noodles from Waterfall Soup, and if I leave the line... Ask Jonah if there\'s a limited edition left? And pick up Nicole\'s noodles?'],
          steps: [{ t: 'talk', to: 'jonah', reply: 'Monica\'s photobook? One limited edition left, with the freebie. The robot in the line has been here since dawn... tell him it\'s his.' },
            { t: 'order' },
            { t: 'talk', to: 'nicole', reply: 'My noodles, and still hot! ...Wait, why are YOU bringing them? Billy\'s in that photobook line again, isn\'t he. Hmph. That counts against his performance next quarter!' },
            { t: 'talk', to: 'billy' }],
          scene: [['A', '*sniffle* I got it. The limited edition. With the freebie!'], ['P', 'Nicole says the noodle run counts against your performance next quarter.'], ['A', 'What?! She told me it counted FOR it! That was my delivery fee!'], ['A', '...Still worth it. Thanks, Manager. Having you around must be good luck!'], ['P', 'Aren\'t you going to open it?'], ['A', 'Open it? It\'s way too nice to open. I\'ll have to get a second one...']] },
        { title: 'The curse', ask: ['Manager, I think I\'m cursed. Alone at Godfinger or online, I\'m a pro. Against Nicole and Anby? I lose. Every. Single. Time.', 'Snake Duel, four-player mode: you and me against them. Ask Asha for a cabinet, and tell the boss the Starlight Knight accepts her challenge!'],
          steps: [{ t: 'talk', to: 'asha', reply: 'Four-player Snake Duel? Billy again? He\'s my best customer... and my best loser. Cabinet three is free. Good luck. You\'ll need it.' },
            { t: 'talk', to: 'nicole', reply: 'A rematch? Hehe~ Fortune favours the fool, Billy, just not at games! Fine, Anby and I accept. Losers buy the noodles!' },
            { t: 'talk', to: 'billy' }],
          scene: [['A', 'We WON! Did you see that? We\'re the perfect team!'], ['P', 'So much for the curse.'], ['A', 'It WAS a curse, and you broke it, Manager! It definitely wasn\'t me being bad at games.'], ['A', 'Anby didn\'t say a word, Nicole called it beginner\'s luck... and now the boss is buying the noodles. Best day ever!'], ['A', 'Next time let\'s play against each other. I\'m gonna practise!']] },
        { title: 'Starlight Knight, ready to fight', ask: ['The girls are cleaned, oiled and fully loaded. I even counted the bullets this time! ...Mostly.', 'There\'s a big villain in a Hollow, Manager. Put me at the front, with Kitty. Nekomata, I mean. A Starlight Knight never runs from danger!'],
          steps: [{ t: 'clear', f: { enc: 'boss', lead: 'billy', with: 'nekomata' } }, { t: 'talk', to: 'billy' }],
          scene: [['A', 'Hahaha! Villain down! The Starlight Knights never lose!'], ['P', 'You ran out of bullets halfway through.'], ['A', 'That wasn\'t running out. That was tactical repositioning. For better aim!'], ['A', 'Kitty had my back, you called every move... That\'s my team. Even a Starlight Knight can\'t do it alone.'], ['A', 'Hey, Manager, take a picture? I\'ll hit you with the signature pose!']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, combat and city models and the character
     sheet: a robot's head, a black face plate pointed at the chin and peaked
     at the brow, slanted yellow eyes, a white-silver frame round it with two
     prongs into the hair, round red ear modules with dark centres; tall white
     hair spiked up and back. A cropped red bomber jacket worn open (a dark
     zip down its edges), a huge popped collar, silver studs below the
     shoulders, a gold sheriff star on his left chest, a black twin pouch on
     his right, a small white patch at his left front, white "KID" down his
     left sleeve, a black triangle patch on his right, white fleece cuffs; on
     the back a grey boar-head patch with red stars and silver shoulder bars.
     Under it a black bodysuit, a gold diamond gem at the sternum, a white
     segmented belly plate with gold trim. Black robotic hands, red finger
     accents. A wide black studded belt, its silver buckle at his right front,
     a thick silver chain looping from his left hip; charcoal skinny jeans, a
     brown holster strapped to his right thigh, a grey skull patch on his
     right knee; black high-tops with white soles, red heels, a white tongue
     tag, a silver ankle disc. In battle only (the city model carries none):
     two long revolvers, square barrels with graffiti, red grips with a star
     spur at the butt, one black, one gunmetal grey. 188 cm. */
  const DRAW = {};
  {
    const HAIR = 0xf2efe8, HAIR2 = 0xc9beb9, HAIR3 = 0xa59995, HAIRHI = 0xfbfaf6;
    const PLATE = 0x232022, PLATE2 = 0x3a3a3a, METAL = 0x4a474b, EYE = 0xf5f497, FRAME = 0xd8d4d2, FRAME2 = 0x9a9496;
    const EAR = 0xc23d3b, EAR2 = 0x8e211f, EARC = 0x333431;
    const RED = 0xc23d3b, RED2 = 0xa12527, RED3 = 0x7a1818, REDHI = 0xcc4945, ZIP = 0x4c4e50, STUD = 0xa9a8ab, STARG = 0xf9e179;
    const SUIT = 0x2b2930, SUIT2 = 0x18151b, GEM = 0xd6b67d, GEMC = 0x55481d, ABS = 0xe6e5de, ABS2 = 0xc9c8c0, TRIM = 0xd6b67d;
    const CUFF = 0xf1ede4, HAND = 0x2f2d32, HAND2 = 0x16151a, JOINT = 0x8a888c, FINGER = 0xa12527;
    const BELT = 0x2d2a31, BUCKLE = 0x9f9d9e, CHAIN = 0xb4b3b3, CHAIN2 = 0x898688;
    const PANTS = 0x313034, PANTS2 = 0x26232a, HOL = 0x62514e, HOL2 = 0x4a3c3a, SKULL = 0xbcbbc1, SKULLD = 0x3a3640;
    const SHOE = 0x343437, SHOE2 = 0x1f1c21, SOLE = 0xdcddd6, SHOER = 0xa12527, TAGW = 0xf0f0ec;
    const PATCH = 0x8a8a8e, PATCHD = 0x2a282c, WHITE = 0xf6f1e7, BLACK = 0x1e1c22;
    const GUNB = 0x222126, GUNB2 = 0x3a383d, GUNBM = 0x8a8a8c, GUNG = 0x5d5d5d, GUNG2 = 0x7c7b7b, GUNGM = 0xe8e6e2;
    const GRIP = 0xa32b28, GRIP2 = 0x6e1b17, SPUR = 0xb8b6b8, MUZ = 0x111013;
    const arm = s => g => {   // s: +1 his left, -1 his right
      H.arm(g, { sleeve: RED, sleeveTo: 6, skin: HAND, glove: HAND, gloveLen: 2, len: 9, cuff: CUFF });
      g.box(-1, 1, -1, 1, 1, 1, RED);                                                   // the jacket's puffed shoulder...
      g.box(2 * s, 0, -1, 2 * s, -3, 1, RED2);                                          // ...bulging out
      g.box(-1, -6, -2, 1, -6, 2, CUFF); g.set(2 * s, -6, 0, CUFF);                     // the white fleece cuff, turned back
      g.box(-1, -8, 2, 1, -8, 2, HAND2); g.set(0, -8, 2, FINGER); g.set(-s, -8, 2, FINGER);   // the robotic fingers, red accents
      g.set(s, -7, 2, JOINT); g.set(-s, -7, 2, JOINT);                                  // silver knuckle joints
    };
    const leg = s => g => {
      H.leg(g, { len: 10, pant: PANTS, boot: SHOE, bootH: 3, sole: SOLE });
      for (let y = -1; y >= -7; y--) g.set(s, y, 0, PANTS2);                           // the outer seam of the skinny jeans
      g.box(-1, -7, -1, 1, -7, 1, SHOE2);                                               // the high-top's padded collar
      g.box(-1, -9, 2, 1, -9, 2, SHOE2); g.set(0, -8, 2, TAGW);                         // the strap over the toe, the white tongue tag
      g.box(-1, -10, -1, 1, -9, -1, SHOER);                                             // the red heel
      g.set(2 * s, -9, 0, STUD);                                                        // the silver ankle disc
    };
    MODELS.billy = H.humanoid({
      scale: 0.079, height: 30, width: 20, std: { hipY: 12 },                          // 188 cm: long legs (10 voxels, the hips a voxel higher)
      sockets: { weapon: ['gunR', [0, 1, 8]], off: ['gunL', [0, 1, 8]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, -1, 1, PANTS);                                             // the jeans
        g.box(-3, 0, -2, 3, 0, 1, BELT);                                                // the wide black belt...
        g.box(-3, 0, 2, 3, 0, 2, x => (x & 1) ? BUCKLE : BELT); g.box(-3, 0, -3, 3, 0, -3, x => (x & 1) ? BUCKLE : BELT);   // ...its silver studs
        g.box(-3, 0, 3, -2, 0, 3, BUCKLE); g.set(-2, -1, 2, BELT);                      // the buckle at his right front, the strap's end
        // the thick silver chain, from his left hip down in a loop and back up behind
        [[3, -1, 2], [4, -2, 2], [4, -3, 1], [4, -4, 0], [4, -4, -1], [4, -3, -2], [4, -2, -3], [3, -1, -3]].forEach(([x, y, z], i) => g.set(x, y, z, i & 1 ? CHAIN2 : CHAIN));
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 1, 1, SUIT); g.box(-2, 0, 2, 2, 1, 2, SUIT);                // the black bodysuit at the waist
        g.box(-1, 0, 2, 1, 3, 2, (x, y) => (y & 1) ? ABS2 : ABS);                       // the white segmented belly plate...
        for (const s of [-1, 1]) { g.set(s * 2, 1, 2, TRIM); g.set(s * 2, 2, 2, TRIM); }   // ...its gold trim
        g.box(-3, 2, -2, 3, 6, 1, RED); g.box(-3, 2, -2, 3, 2, 1, RED2);                // the cropped red jacket, its hem band
        g.box(-1, 4, 2, 1, 6, 2, SUIT); g.set(-1, 6, 2, SUIT2); g.set(1, 6, 2, SUIT2);  // the black chest between its open fronts
        g.set(0, 5, 2, GEM); g.set(-1, 4, 2, GEM); g.set(1, 4, 2, GEM); g.set(0, 4, 3, GEMC); g.set(0, 3, 3, GEM);   // the gold diamond gem
        for (const s of [-1, 1]) {
          g.box(s * 2, 2, 2, s * 3, 6, 2, RED);                                         // the jacket's fronts...
          for (let y = 2; y <= 5; y++) g.set(s * 2, y, 2, (y & 1) ? ZIP : RED2);        // ...the open zip down their edges
          g.set(s * 2, 6, 2, STUD); g.set(s * 3, 6, 2, STUD);                           // round silver studs below the shoulders
        }
        g.set(3, 4, 3, STARG);                                                          // the gold sheriff star on his left chest
        g.box(-3, 4, 3, -2, 4, 3, BLACK); g.set(-3, 5, 3, BLACK);                       // the black twin pouch on his right
        g.set(3, 2, 3, WHITE);                                                          // the little white patch at his left front
        // the huge popped collar, up round his jaw, open at the front (beside the neck only above his shoulders, clear of the arms)
        g.box(-4, 6, -4, 4, 8, -4, RED); g.box(-4, 8, -4, 4, 8, -4, REDHI);
        for (const s of [-1, 1]) { g.box(s * 4, 6, -3, s * 4, 7, -2, RED); g.box(s * 4, 8, -3, s * 4, 8, 1, RED); g.set(s * 4, 8, 1, RED3); }
        g.set(-2, 8, -5, STUD); g.set(2, 8, -5, STUD);                                  // two bolts at its back
        // the back: the grey boar-head patch, red stars beneath; silver bars on the shoulders
        g.box(-2, 3, -3, 2, 5, -3, PATCH); g.set(0, 4, -3, PATCHD); g.set(-1, 5, -3, PATCHD); g.set(1, 5, -3, PATCHD);
        g.box(-2, 2, -3, 2, 2, -3, x => (x & 1) ? RED : PATCHD);
        for (const s of [-1, 1]) g.box(s * 2, 6, -3, s * 3, 6, -3, STUD);
      },
      head(g) {
        g.box(-3, 0, -3, 3, 6, 3, METAL);                                               // the robot's head
        // the black face plate: pointed at the chin, widest at the eyes, peaked at the brow; a ridge down its middle
        for (const [y, x0, x1] of [[-1, 0, 0], [0, -1, 1], [1, -2, 2], [2, -2, 2], [3, -2, 2], [4, -2, 2], [5, -2, 2], [6, -1, 1], [7, 0, 0]]) g.box(x0, y, 4, x1, y, 4, PLATE);
        g.box(0, 1, 5, 0, 5, 5, PLATE2);
        for (const s of [-1, 1]) { g.set(s, 3, 4, G(EYE)); g.set(s * 2, 3, 4, G(EYE)); g.set(s * 2, 4, 4, G(EYE)); }   // the slanted yellow eyes
        // the white-silver frame: cheek plates, the brow line, two prongs up into the hair; the peak
        for (const s of [-1, 1]) {
          g.box(s * 3, 1, 3, s * 3, 5, 4, FRAME); g.set(s * 3, 0, 3, FRAME2);
          g.set(s * 3, 6, 4, FRAME); g.set(s * 2, 6, 4, FRAME); g.set(s, 7, 4, FRAME);
          g.set(s * 2, 7, 3, FRAME); g.set(s * 2, 8, 2, FRAME); g.set(s * 3, 9, 1, FRAME2);
        }
        g.set(0, 8, 4, FRAME);
        // the round red ear modules, dark centres in red rims, white mounts
        for (const s of [-1, 1]) {
          g.box(s * 4, 2, -1, s * 4, 4, 1, EAR);
          g.set(s * 5, 3, 0, EARC); for (const [y, z] of [[2, 0], [4, 0], [3, -1], [3, 1]]) g.set(s * 5, y, z, EAR2);
          g.set(s * 4, 5, 1, FRAME); g.set(s * 4, 1, 0, FRAME2);
        }
        // the hair: a white mass over the crown and the back of the head, spiked up and back
        g.box(-3, 7, -4, 3, 8, 1, HAIR2); g.box(-3, 3, -4, 3, 6, -4, HAIR3); g.box(-4, 5, -3, -4, 6, 0, HAIR2); g.box(4, 5, -3, 4, 6, 0, HAIR2);
        const hc = (x, y, z) => y >= 12 ? HAIRHI : y >= 10 ? HAIR : ((x + y + z) & 1) ? HAIR : HAIR2;
        for (const [x0, y0, z0, x1, y1, z1, r] of [[0, 8, 0, 0, 14, -2, 1.2], [-2, 8, 0, -3, 13, -1, 1], [2, 8, 0, 3, 13, -1, 1], [-1, 8, -2, -1, 13, -5, 1.1], [1, 8, -2, 1, 12, -5, 1],
          [-3, 7, -2, -6, 11, -3, 0.9], [3, 7, -2, 6, 11, -3, 0.9], [0, 7, -3, 0, 11, -7, 1], [-4, 6, -1, -6, 8, 0, 0.6], [4, 6, -1, 6, 8, 0, 0.6]]) {
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 2;
          for (let i = 0; i <= n; i++) { const k = i / n, rr = r * (1 - k); g.ell(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (z1 - z0) * k, rr, rr, rr, hc); }   // a tapering spike
        }
      },
      armL(g) {
        arm(1)(g);
        for (const [y, z] of [[-1, -1], [-1, 1], [-2, -1], [-2, 0], [-3, -1], [-3, 1], [-4, 0], [-5, -1], [-5, 0], [-5, 1]]) g.set(2, y, z, WHITE);   // "KID" down his left sleeve
      },
      armR(g) {
        arm(-1)(g);
        g.set(-2, -1, 0, BLACK); g.set(-2, -2, -1, BLACK); g.set(-2, -2, 1, BLACK); g.set(-2, -2, 0, WHITE);   // the black triangle patch on his right sleeve
      },
      legL: leg(1),
      legR(g) {
        leg(-1)(g);
        g.box(-2, -1, -1, -2, -4, 1, HOL); g.set(-2, -1, 0, HOL2); g.set(-3, -2, 0, HOL2);   // the brown holster on his right thigh, its flap
        for (const y of [-2, -4]) { g.box(-1, y, 2, 1, y, 2, HOL2); g.box(-1, y, -2, 1, y, -2, HOL2); }   // its two straps round the thigh
        g.set(0, -5, 2, SKULL); g.set(-1, -5, 2, SKULLD); g.set(0, -6, 2, SKULL); g.set(-1, -6, 2, SKULL);   // the grey skull patch on his right knee
      },
      extra: {
        // the revolvers in his hands: empty here, filled in battle (hookUp, below). Tilted so that the barrel runs on from his
        // arm, a little above it: level when his arm is raised to aim
        gunR: { parent: 'armR', at: [0, -8, 1], rot: [1.4, 0, 0] },
        gunL: { parent: 'armL', at: [0, -8, 1], rot: [1.4, 0, 0] },
      },
    });
    // a revolver along +Z from the grip in his hand: the red grip raked back, its star spur, the frame and cylinder, the hammer,
    // the long square barrel with graffiti along it, the front sight, the muzzle
    const revolver = (g, body, body2, mark) => {
      g.box(0, -3, -1, 0, -1, 0, GRIP); g.set(0, -3, -2, GRIP2); g.set(0, -2, -2, GRIP);
      for (const [x, y, z] of [[0, -4, -2], [0, -5, -2], [0, -4, -3], [1, -4, -2], [-1, -4, -2]]) g.set(x, y, z, SPUR);
      g.set(0, -1, 1, body2);                                                           // the trigger guard
      g.box(-1, 0, -1, 1, 1, 1, body); g.set(-1, 0, 0, body2); g.set(1, 1, 0, body2);   // the frame, the cylinder
      g.set(0, 2, -1, body2); g.set(0, 2, 0, GRIP);                                     // the hammer, a red accent
      g.box(0, 0, 2, 0, 1, 6, body);
      for (let z = 2; z <= 6; z++) if (z & 1) g.set(0, (z >> 1) & 1, z, mark);         // the graffiti along the barrel
      g.set(0, 2, 6, body2); g.box(0, 0, 7, 0, 1, 7, MUZ);
    };
    DRAW.gunR = g => revolver(g, GUNB, GUNB2, GUNBM);
    DRAW.gunL = g => revolver(g, GUNG, GUNG2, GUNGM);
  }

  /* --------------------------------------------------------------- poses --
     His stance: a revolver low in each hand, the barrels forward and down.
     The poses below are the angles he reaches (rel() turns them into the
     change from his stance); keys() plays a move as keyframes, from his
     stance; recoil() kicks each arm up as its gun fires. */
  ANIM.READY.billy = { armL: [-0.8, 0.1, 0.2], armR: [-0.8, -0.1, -0.2], torso: [0.04, 0.15, 0], head: [0, -0.12, 0], legL: [-0.2, 0, 0.1], legR: [0.2, 0, -0.1], hipsY: -0.02 };
  const R0 = ANIM.READY.billy;
  const rel = o => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].map((v, i) => v - R0[k][i]) : k === 'hipsY' ? o[k] - R0.hipsY : o[k]; return r; };
  const plus = (...ps) => { const r = {}; for (const p of ps) for (const k in p) { const v = p[k]; r[k] = Array.isArray(v) ? (r[k] ? r[k].map((x, i) => x + v[i]) : v.slice()) : (r[k] || 0) + v; } return r; };
  const AIM = rel({ armL: [-1.5, 0.1, 0.06], armR: [-1.5, -0.1, -0.06], torso: [0.02, 0, 0], head: [0, 0, 0], legL: [-0.32, 0, 0.12], legR: [0.26, 0, -0.12], hipsY: -0.05 });   // both guns level
  const AIMR = rel({ armR: [-1.55, 0, -0.04], armL: [-0.6, 0, 0.35], torso: [0.02, 0.3, 0], head: [0, -0.28, 0], legL: [-0.32, 0, 0.1], legR: [0.26, 0, -0.1], hipsY: -0.04 });   // the right one, his right shoulder leading
  const AIML = rel({ armL: [-1.55, 0, 0.04], armR: [-0.6, 0, -0.35], torso: [0.02, -0.3, 0], head: [0, 0.28, 0], legL: [-0.32, 0, 0.1], legR: [0.26, 0, -0.1], hipsY: -0.04 });   // the left one
  const CROUCH = rel({ armL: [-1.36, 0.08, 0.06], armR: [-1.36, -0.08, -0.06], torso: [0.14, 0, 0], head: [-0.12, 0, 0], legL: [-0.9, 0, 0.14], legR: [0.55, 0, -0.08], hipsY: -0.24 });   // down on one knee, both guns level
  const TUCK = rel({ armL: [-0.7, 0, 0.3], armR: [-0.7, 0, -0.3], torso: [0.55, 0, 0], head: [0.3, 0, 0], legL: [-1.5, 0, 0.12], legR: [-1.35, 0, -0.12], hipsY: -0.32 });   // curled up: a roll, a jump
  const SPREAD = rel({ armL: [-0.15, 0, 1.45], armR: [-0.15, 0, -1.45], torso: [0.02, 0, 0], head: [0, 0, 0], legL: [-0.15, 0, 0.25], legR: [0.15, 0, -0.25], hipsY: -0.06 });   // arms out to the sides
  const CROSS = rel({ armL: [-1.8, 0, -0.75], armR: [-1.8, 0, 0.75], torso: [-0.06, 0, 0], head: [-0.05, 0, 0], legL: [-0.1, 0, 0.28], legR: [0.1, 0, -0.28], hipsY: -0.06 });   // arms crossed: "Starlight... mirage!"
  const HERO = rel({ armR: [-3.0, 0, -0.25], armL: [-1.5, 0.1, 0.35], torso: [-0.08, 0.25, 0], head: [-0.12, -0.2, 0], legL: [-0.35, 0, 0.3], legR: [0.3, 0, -0.25], hipsY: -0.1 });   // the signature pose, a gun to the sky
  const DOWNS = rel({ armL: [-0.75, 0, 0.3], armR: [-0.75, 0, -0.3], torso: [0.45, 0, 0], head: [0.3, 0, 0], legL: [-0.8, 0, 0.1], legR: [-0.35, 0, -0.1], hipsY: -0.04 });   // firing down from the air
  const HOPB = rel({ armL: [-1.7, 0.1, 0.06], armR: [-1.7, -0.1, -0.06], torso: [-0.3, 0, 0], head: [0.15, 0, 0], legL: [-0.9, 0, 0.1], legR: [-0.3, 0, -0.1], hipsY: -0.04 });   // a hop back, guns up
  const BRACE = rel({ armL: [-1.5, 0.1, 0.06], armR: [-1.5, -0.1, -0.06], torso: [0.1, 0, 0], head: [-0.05, 0, 0], legL: [-0.6, 0, 0.18], legR: [0.5, 0, -0.18], hipsY: -0.2 });   // landed wide and low
  const SLIDE = rel({ armR: [-1.5, 0, -0.05], armL: [-0.25, 0, 0.6], torso: [-0.15, 0.3, 0], head: [0.1, -0.25, 0], legL: [-1.1, 0, 0.1], legR: [0.7, 0, -0.1], hipsY: -0.28 });   // sliding in, one gun out
  // keyframes [[t, pose]]: eased from one to the next, from his stance before the first; the last is held
  function keys(b, t, K) {
    if (t <= K[0][0]) return mix(b, add(b, K[0][1]), U.easeOut(clamp(t / Math.max(0.01, K[0][0]), 0, 1)));
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return mix(add(b, K[i - 1][1]), add(b, K[i][1]), U.ease(clamp((t - K[i - 1][0]) / Math.max(0.01, K[i][0] - K[i - 1][0]), 0, 1)));
    return add(b, K[K.length - 1][1]);
  }
  // each gun kicks up as it fires (S: R, L or B for each time in T) and settles
  function recoil(t, T, S, w) {
    let r = 0, l = 0; w = w || 0.3;
    T.forEach((s, i) => { if (t < s) return; const k = Math.exp(-(t - s) * 20); if (S[i] !== 'L') r = Math.max(r, k); if (S[i] !== 'R') l = Math.max(l, k); });
    return { armR: [-w * r, 0, 0], armL: [-w * l, 0, 0], torso: [-0.05 * Math.max(r, l), 0, 0] };
  }
  // Full Firepower: Standing Fire; down to a knee and firing (Crouching Shot); a roll and two shots; up for the Finishing Shot
  ACT.blStand = (b, t, th, d) => add(keys(b, t, [[0.08, AIM], [0.44, AIM], [d, {}]]), recoil(t, T_ST, G_ST));
  ACT.blCrouchIn = (b, t) => add(keys(b, t, [[0.12, CROUCH]]), recoil(t, T_CI, G_CI));
  ACT.blCrouch = (b, t) => add(add(b, CROUCH), recoil(t, T_LP, G_LP, 0.22));
  // a Rolling Shot: curled, a turn as he rolls aside (forward or back: a dive or a tumble), then up on a knee firing. The turn is
  // a whole one (driven straight, so it does not unwind); the lean and the tilt come back to nothing
  const rollAct = (side, fwd) => (b, t) => {
    if (t < 0.32) { const k = clamp(t / 0.3, 0, 1); return add(add(b, TUCK), side ? { spin: k * PI * 2 * side, roll: Math.sin(k * PI) * 0.6 * side, lift: 0.05 } : { tilt: Math.sin(k * PI) * 0.6 * fwd, lift: 0.05 }); }
    return add(add(b, CROUCH), recoil(t, T_RO, G_RO));
  };
  ACT.blRollL = rollAct(1, 0); ACT.blRollR = rollAct(-1, 0); ACT.blRollF = rollAct(0, 1); ACT.blRollB = rollAct(0, -1);
  ACT.blFinish = (b, t, th, d) => add(keys(b, t, [[0.1, plus(AIM, { hipsY: -0.08 })], [0.6, AIM], [d, {}]]), recoil(t, T_FI, G_FI, 0.36));
  // Stand Still: the right gun, the left, then both
  ACT.blShotR = (b, t, th, d) => add(keys(b, t, [[Math.max(0.05, th - 0.06), AIMR], [d - 0.08, AIMR], [d, {}]]), recoil(t, [th], ['R'], 0.5));
  ACT.blShotL = (b, t, th, d) => add(keys(b, t, [[Math.max(0.05, th - 0.06), AIML], [d - 0.08, AIML], [d, {}]]), recoil(t, [th], ['L'], 0.5));
  ACT.blShotB = (b, t, th, d) => add(keys(b, t, [[Math.max(0.05, th - 0.06), AIM], [d - 0.08, AIM], [d, {}]]), recoil(t, [th], ['B'], 0.55));
  // Clearance Time: a hop back, then braced low, explosive rounds down the line
  ACT.blEX = (b, t, th, d) => add(keys(b, t, [[0.12, HOPB], [0.26, BRACE], [0.92, BRACE], [d, {}]]), recoil(t, T_EX, G_EX, 0.42));
  // Starlight Sanction: a turn with both arms out (Scattered); a slide in and one shot (Focused)
  ACT.blSpin = (b, t, th, d) => add(keys(b, t, [[0.1, SPREAD], [0.56, SPREAD], [d, {}]]), { spin: clamp((t - 0.12) / 0.42, 0, 1) * PI * 2 });
  ACT.blSlide = (b, t, th, d) => add(keys(b, t, [[0.14, SLIDE], [0.4, SLIDE], [d, {}]]), recoil(t, [0.22], ['R'], 0.45));
  ACT.blCounter = (b, t, th, d) => add(keys(b, t, [[0.12, AIM], [0.56, AIM], [d, {}]]), recoil(t, T_DC, G_DC, 0.4));
  ACT.blQuick = (b, t, th, d) => add(keys(b, t, [[0.2, AIM], [0.62, AIM], [d, {}]]), recoil(t, T_QA, G_QA, 0.4));
  // Fatal Shot: ten shots sweeping across the cone (the torso turns with them), then two big ones
  ACT.blFollow = (b, t, th, d) => {
    const k = clamp((t - 0.16) / 0.54, 0, 1), sweep = t < 0.78 ? (-0.5 + k) * 0.8 : 0;
    return add(add(keys(b, t, [[0.12, AIM], [1.1, AIM], [d, {}]]), { torso: [0, sweep, 0] }), recoil(t, T_FU, G_FU, 0.3));
  };
  // Starlight Mirage: up, three turns in the air with both arms out, firing all round; arms crossed; down, arms out for the
  // last burst, then the signature pose
  ACT.blChain = (b, t, th, d) => {
    if (t < 0.3) return keys(b, t, [[0.3, TUCK]]);
    if (t < 0.96) return add(add(b, SPREAD), { spin: clamp((t - 0.3) / 0.66, 0, 1) * PI * 6 });
    return keys(b, t - 0.96, [[0.08, CROSS], [0.24, CROSS], [0.34, SPREAD], [0.46, HERO], [d, HERO]]);
  };
  // Starlight, Shine Bright: up, five turns firing all round, down firing, arms crossed, the burst, the signature pose
  ACT.blUlt = (b, t, th, d) => {
    if (t < 0.45) return keys(b, t, [[0.2, TUCK], [0.45, SPREAD]]);
    if (t < 1.7) return add(add(b, SPREAD), { spin: clamp((t - 0.45) / 1.25, 0, 1) * PI * 10 });
    return keys(b, t - 1.7, [[0.1, DOWNS], [0.22, CROSS], [0.33, CROSS], [0.36, SPREAD], [0.52, HERO], [d, HERO]]);
  };
  // Flash Spin: a dodge with a turn
  ACT.blFlash = (b, t) => add(ACT.dodge(b), { spin: clamp(t / 0.35, 0, 1) * PI * 2 });

  /* ------------------------------------------------------------- effects --
     blShot: a gun (or both) fires along the aim: a muzzle flash, a tracer, a
     spent casing (big: a heavier shot). blRing: shots out all round him (down:
     from the air to the ground); blStorm (a stream): the same, without let-up.
     blBoom: an explosive round going off (Clearance Time); blImpact: a heavy
     round landing. blStar: the Starlight Knight's star on the ground, a burst
     of gold; blCharge, blSparkle: gold light gathering, glittering round him. */
  FX.extra.blHit = () => {};
  const _v = new THREE.Vector3();
  const gunAt = (a, s, out) => { BT.sock(a, s === 'L' ? 'off' : 'weapon', out); if (out.y < 0.3) out.y = 1.0 + (a.airY || 0); return out; };
  const aimAt = (a, A, tgt, d) => ({ x: tgt ? tgt.x : a.x + Math.sin(A.dir) * (d || 5), z: tgt ? tgt.z : a.z + Math.cos(A.dir) * (d || 5) });
  // a tracer from p along dir (lite: a single streak, for the bursts all round him)
  function tracer(p, dir, L, big, dy, lite) {
    const p1 = new THREE.Vector3(p.x + Math.sin(dir) * L, Math.max(0.15, p.y + (dy || 0)), p.z + Math.cos(dir) * L);
    FX.beam(p.clone(), p1, TRACER, 0.07 * big, 0.12);
    if (lite) return;
    if (big > 1) FX.beam(p.clone(), p1, 0xffffff, 0.03 * big, 0.08);
    FX.glow(p.x, p.y, p.z, 1.0 * big, FLASH, 0.1, { size1: 1.6 * big });
    const s = Math.random() < 0.5 ? 1 : -1;                                            // a spent casing flips away
    FX.p({ x: p.x, y: p.y, z: p.z, vx: Math.cos(dir) * rnd(1, 2.5) * s, vy: rnd(1.5, 3), vz: -Math.sin(dir) * rnd(1, 2.5) * s, g: 9, drag: 0.5, life: 0.6, size: 0.05, size1: 0.05, col: BRASS, glow: false });
  }
  CHOREO.events.blShot = (a, A, e) => {
    const B = BT.B, big = e.big ? 1.8 : 1, dir = A.dir + (e.ang || 0);
    for (const s of e.g === 'B' ? ['R', 'L'] : [e.g || 'R']) tracer(gunAt(a, s, _v), dir, e.len || 7, big, e.dy);
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.1 : 0.03);
    if (e.big || e.g !== 'L') SFX.play(e.big ? 'heavy' : 'shot');
  };
  CHOREO.events.blRing = (a, A, e) => {
    const n = e.n || 6, R = e.r || 4, y = 1.0 + (a.airY || 0), o = rnd(0, PI * 2);
    for (let i = 0; i < n; i++) { const an = o + i / n * PI * 2; tracer(new THREE.Vector3(a.x + Math.sin(an) * 0.5, y, a.z + Math.cos(an) * 0.5), an, R, e.big ? 1.6 : 1, e.down ? 0.25 - y : 0, !e.big); }
    FX.glow(a.x, y, a.z, e.big ? 2.4 : 1.4, FLASH, 0.14);
    if (e.big) { FX.ring(a.x, a.z, 0.4, R, STAR, 0.35); BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.22); }
    SFX.play('shot');
  };
  CHOREO.streams.blStorm = (a, A, s, dt) => {
    const n = Math.floor(dt * (s.rate || 30) + Math.random());
    for (let i = 0; i < n; i++) { const p = gunAt(a, Math.random() < 0.5 ? 'R' : 'L', _v); tracer(p, rnd(0, PI * 2), s.r || 4.5, 0.8, s.down ? 0.25 - p.y : 0, true); }
  };
  CHOREO.streams.blSparkle = (a, A, s, dt) => {
    const n = Math.max(1, Math.round(dt * 40));
    for (let i = 0; i < n; i++) { const an = rnd(0, PI * 2), r = rnd(0.6, 2.4); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.4, 2.2) + (a.airY || 0), z: a.z + Math.sin(an) * r, vy: rnd(0.2, 1), life: 0.45, size: 0.12, size1: 0.02, col: U.pick([STAR, 0xffffff, BRASS]) }); }
  };
  CHOREO.events.blBoom = (a, A, e, tgt) => {
    const P = aimAt(a, A, tgt), r = e.r || 1.8;
    FX.burst(P.x, 0.9, P.z, e.big ? 46 : 24, { col: [0xffffff, 0xffe080, 0xff9a30, 0x5a3a2a], speed: e.big ? 8 : 6, size: 0.16, size1: 0.04, life: 0.55, g: 3, up: 1.5 });
    FX.glow(P.x, 1, P.z, r * 1.3, 0xffb040, 0.3, { size1: r * 2.4 }); FX.ring(P.x, P.z, 0.3, r * 1.2, 0xfff0c0, 0.35);
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.32 : 0.14); SFX.play('boom');
  };
  CHOREO.events.blImpact = (a, A, e, tgt) => {
    const P = aimAt(a, A, tgt), r = e.r || 1.6;
    FX.ring(P.x, P.z, 0.3, r, TRACER, 0.3); FX.glow(P.x, 1, P.z, r, TRACER, 0.2, { size1: r * 1.8 });
    FX.burst(P.x, 1, P.z, 18, { col: [0xffffff, TRACER, BRASS], speed: 5, size: 0.1, life: 0.35, g: 2 });
  };
  CHOREO.events.blStar = (a, A, e, tgt) => {
    const self = e.self || !tgt, x = self ? a.x : tgt.x, z = self ? a.z : tgt.z, R = e.r || 3, o = rnd(0, PI * 2), P = [];
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? R * 0.4 : R, an = o + i / 10 * PI * 2; P.push(new THREE.Vector3(x + Math.sin(an) * rr, 0.12, z + Math.cos(an) * rr)); }
    for (let i = 0; i < 10; i++) FX.beam(P[i], P[(i + 1) % 10], STAR, 0.14, 0.55);   // a five-pointed star drawn on the ground
    FX.burst(x, 1.0, z, e.big ? 60 : 36, { col: [0xffffff, STAR, BRASS, 0xff6a5a], speed: e.big ? 9 : 6, size: 0.14, size1: 0.03, life: 0.6, g: 2, up: 1 });
    FX.glow(x, 1.1, z, R, STAR, 0.35, { size1: R * 1.8 }); FX.ring(x, z, 0.4, R * 1.2, 0xffffff, 0.4);
    if (e.big) { FX.pillar(x, z, 0.5, 6, STAR, 0.45); FX.ring(x, z, 0.3, R * 0.7, STAR, 0.5); }
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.42 : 0.24); SFX.play('boom');
  };
  CHOREO.events.blCharge = a => {
    BT.sock(a, 'chest', _v); FX.glow(_v.x, _v.y, _v.z, 2.2, STAR, 0.35, { size1: 3.4 });
    FX.burst(a.x, 1.2 + (a.airY || 0), a.z, 30, { col: [0xffffff, STAR, BRASS], speed: 5, size: 0.12, life: 0.5, g: -1 }); FX.ring(a.x, a.z, 0.4, 2.6, STAR, 0.4);
  };

  /* ------------------------------------------ the revolvers, drawn in battle --
     Each frame of a battle (BT.on 'frame', for him and for a rival Proxy's
     Billy) his rig's empty gun parts get the girls, once: in battle he has
     them; in town (the city model) he carries none. */
  const PROTO = {};
  const proto = k => PROTO[k] || (PROTO[k] = (() => { const g = new VX.Grid(); DRAW[k](g); return VX.object(g, MODELS.billy.scale, { cast: false }); })());
  function armGuns(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.gunR || P.gunR.userData.armed) return;
    P.gunR.add(proto('gunR').clone()); if (P.gunL) P.gunL.add(proto('gunL').clone());
    P.gunR.userData.armed = true;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded, or at his first battle)
  let hooked = false;
  function hookUp() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'billy') armGuns(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'billy') armGuns(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookUp); else hookUp();

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  // a shot at each time in T, from the gun in S (B: both, a heavier shot); o(i): more for the i-th
  const shots = (T, S, o) => T.map((t, i) => Object.assign({ t, fx: 'blShot', g: S[i], big: S[i] === 'B' }, o ? o(i) : {}));
  set(K.stand, { events: shots(T_ST, G_ST) });
  set(K.crouchIn, { motion: [{ t0: 0, t1: 0.12, kind: 'back', d: 0.25 }], events: shots(T_CI, G_CI).concat([{ t: 0.1, fx: 'dust' }]) });
  set(K.crouch, { events: shots(T_LP, G_LP) });
  for (const [def, mo] of [[K.rollL, { kind: 'side', d: 2.2, side: 1 }], [K.rollR, { kind: 'side', d: 2.2, side: -1 }], [K.rollF, { kind: 'fwd', d: 1.8 }], [K.rollB, { kind: 'back', d: 2.2 }]])
    set(def, { motion: [Object.assign({ t0: 0.02, t1: 0.3 }, mo)], stream: [{ t0: 0.02, t1: 0.3, kind: 'dust' }], events: shots(T_RO, G_RO) });
  set(K.finish, { motion: [{ t0: 0.52, t1: 0.62, kind: 'back', d: 0.35 }], events: shots(T_FI, G_FI, () => ({ len: 8 })).concat([{ t: 0.52, fx: 'blImpact', r: 1.8 }]) });
  set(K.special, { events: [{ t: 0.18, fx: 'blShot', g: 'R', big: true, len: 8 }] });
  set(K.sp2, { events: [{ t: 0.16, fx: 'blShot', g: 'L', big: true, len: 8 }] });
  set(K.sp3, { motion: [{ t0: 0.22, t1: 0.34, kind: 'back', d: 0.4 }], events: [{ t: 0.22, fx: 'blShot', g: 'B', big: true, len: 8.5 }, { t: 0.22, fx: 'blImpact', r: 1.4 }] });
  set(K.ex, { motion: [{ t0: 0.02, t1: 0.26, kind: 'back', d: 1.3 }, { t0: 0.02, t1: 0.26, kind: 'leap', h: 0.7 }], stream: [{ t0: 0.02, t1: 0.26, kind: 'afterimage', col: AFT }],
    events: shots(T_EX, G_EX, () => ({ len: 9 })).concat([{ t: 0.3, fx: 'blBoom', r: 1.6 }, { t: 0.46, fx: 'blBoom', r: 1.0 }, { t: 0.56, fx: 'blBoom', r: 1.0 }, { t: 0.78, fx: 'blBoom', r: 2.2, big: true }, { t: 0.78, fx: 'whiteFlash' }]) });
  set(K.dash, { motion: [{ t0: 0, t1: 0.12, kind: 'fwd', d: 0.8 }], stream: [{ t0: 0, t1: 0.12, kind: 'afterimage', col: AFT }], events: T_DS.map(t => ({ t, fx: 'blRing', n: 5, r: 4 })) });
  set(K.dashF, { motion: [{ t0: 0, t1: 0.2, kind: 'fwd', d: 1.6 }], stream: [{ t0: 0, t1: 0.2, kind: 'dust' }, { t0: 0, t1: 0.18, kind: 'afterimage', col: AFT }], events: [{ t: 0.22, fx: 'blShot', g: 'R', big: true, len: 8 }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.0, side: 'auto' }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: AFT }], events: shots(T_DC, G_DC, () => ({ len: 8 })).concat([{ t: 0.44, fx: 'blImpact', r: 1.8 }]) });
  set(K.quick, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 3.2 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFT }], events: shots(T_QA, G_QA, () => ({ len: 8 })).concat([{ t: 0.5, fx: 'blImpact', r: 1.8 }]) });
  set(K.assist, { stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: AFT }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.14, kind: 'back', d: 0.6 }], events: shots(T_FU, G_FU, i => ({ ang: i < 10 ? -0.5 + i / 9 : 0, len: 6.5 })).concat([{ t: 1.0, fx: 'blImpact', r: 2.4 }, { t: 1.0, fx: 'whiteFlash' }]) });
  set(K.chain, { motion: [{ t0: 0.04, t1: 0.3, kind: 'rise', h: 1.5 }, { t0: 1.14, t1: 1.28, kind: 'fall' }], stream: [{ t0: 0.3, t1: 0.96, kind: 'blStorm', rate: 30, r: 4.6, down: true }],
    events: T_CH.slice(0, 10).map(t => ({ t, fx: 'blRing', n: 5, r: 4.6, down: true })).concat([{ t: 1.0, fx: 'blCharge' }, { t: 1.3, fx: 'blRing', n: 14, r: 5.2, big: true }, { t: 1.3, fx: 'blStar', self: true, r: 4.4 }, { t: 1.3, fx: 'whiteFlash' }]) });
  set(K.ult, { motion: [{ t0: 0.08, t1: 0.45, kind: 'rise', h: 2.2 }, { t0: 1.7, t1: 1.84, kind: 'fall' }], stream: [{ t0: 0.45, t1: 1.7, kind: 'blStorm', rate: 36, r: 5.4, down: true }, { t0: 0.1, t1: 1.7, kind: 'blSparkle' }],
    events: [{ t: 0.3, fx: 'blCharge' }].concat(T_UL.slice(0, 16).map(t => ({ t, fx: 'blRing', n: 4, r: 5.4, down: true })))
      .concat([{ t: 1.78, fx: 'blShot', g: 'B', big: true, dy: -1.6, len: 4 }, { t: 1.92, fx: 'blCharge' }, { t: 2.05, fx: 'blRing', n: 18, r: 6, big: true }, { t: 2.05, fx: 'blStar', self: true, r: 5.5, big: true }, { t: 2.05, fx: 'whiteFlash' }]) });
})();
