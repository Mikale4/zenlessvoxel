/* ============================================================================
   agents/trigger.js -- Trigger, the sniper of Obol Squad (New Eridu Defense
   Force, Obsidian Division; formerly Lyre Squad). S-Rank, Electric, Stun,
   Defensive Assist. Released in Version 1.6.

   (An Agent in her own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)
   Numbers: skill names, inputs and mechanics are the official game's.
   Multipliers are the official level-12 values scaled to this game's tuning:
   DMG x0.45, Daze x0.6; Anomaly Buildup as datamined (/100). Which hits are
   heavy is not listed by any source: the game's usual rule (string finishers,
   counters, EX, Chain, Ultimate, assist follow-ups) decides.

   Sources: Zenless Zone Zero Wiki (Trigger, Lore, Dialogue, DMs, Voice-Overs,
   Phlegethon, Obol Squad, Orphie & Magus's Dialogue), zzz.gachabase.net
   (datamine, agent 1361, game data 3.4.2 beta), the official Agent Intro
   graphics, the official portrait, in-game models and "Behind the Agent"
   sheet (the rifle Phlegethon).

   Her kit (official):
     Basic Attack: Cold-Bore Shot    up to 4 shots ahead, 1-3 Physical, the 4th
                                     Electric.
     Basic Attack: Silenced Shot     hold Basic: Sniper Stance, continuous fire;
                                     attacked, she evades on her own (once every
                                     8 s; or as you move her) for a Perfect
                                     Dodge and an automatic charged counter.
                                     Let go: a step back and the Finishing Move
                                     (it triggers the previous Agent's Quick
                                     Assist, once every 25 s). Fire and counter
                                     hits: +25 Purge (max 100).
     Basic Attack: Harmonizing Shot  off the field, with Purge: a teammate's
                                     Basic, Dodge Counter, Special, Dash Attack
                                     or Quick Assist hit calls her in; she
                                     circles the enemy and fires two shots, an
                                     Aftershock (3 Purge; once every 3 s).
     Basic Attack: Harmonizing Shot - Tartarus   the same for a heavy hit of a
                                     teammate's EX, Assist Follow-Up or
                                     Ultimate: three shots and a Finishing Move
                                     (5 Purge; each skill type twice in 20 s).
     Dash Attack: Vengeful Specter (Physical)   Dodge Counter: Condemned Soul
     Special Attack: Spectral Flash  a lunging slash (the bayonet).
     EX Special Attack: Flash Burial (60 Energy) a lunging slash, then a leap
                                     and a shot into the ground.
     Chain Attack: Stygian Guide     Ultimate: Underworld Requiem
       EX and Ultimate on hit: the previous Agent's Quick Assist, and
       Coordinated Support (8 s / 4 shots; Ultimate 12 s / 6; up to 20 s / 10):
       any teammate hit fires a Harmonizing Shot, free and with no cooldown.
     Quick Assist: Cold-Bore Cover Fire   Defensive Assist: Delaying Demise
     Assist Follow-Up: Piercing Thunder
     Core Passive: Soul-Searching Gaze   her Aftershocks raise the target's Stun
                                     DMG Multiplier by 35% for 5 s, even while
                                     it is not Stunned.
     Additional Ability: Silver Lantern's Gaze   with an Attack or another
                                     Electric Agent: each 1% CRIT Rate over 40%,
                                     +1.5% Aftershock Daze (max +75%).
   Not documented anywhere (our choices, marked below): the Purge she starts a
   battle with (0), Sniper Stance's fire rate (a shot every 0.42 s) and how
   long it can be held (16 shots), the window to take the Quick Assist she
   sets up (2.5 s after the move), how the EX, Chain, Follow-Up and Tartarus
   multipliers split over their hits.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, dist, ang } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const PMAX = 100, P_START = 0;                      // Purge: the cap; the start (not documented: our choice)
  const QA_WIN = 2.5;                                 // seconds to switch to the Agent whose Quick Assist she set up (our choice)
  const ELEC = [0xffffff, 0xd0f0ff, 0x5ec8ff, 0x9ad8ff];

  /* ----------------------------------------------------------------- kit -- */
  const BA = 'Basic Attack: Cold-Bore Shot', SS = 'Basic Attack: Silenced Shot';
  const PHYS = { attr: 'physical' };
  const shotL = o => Object.assign({ shape: 'line', r: 0.8, len: 10 }, o);   // a rifle shot: a line ahead
  // Sniper Stance: a shot every 0.42 s while Basic is held, up to 16 (fire rate and length: our choice)
  const SN = Array.from({ length: 16 }, (_, i) => Math.round((0.38 + i * 0.42) * 100) / 100), SN_DUR = 6.9;
  const CH = [0.35, 0.52, 0.69, 0.86, 1.1];                                  // Stygian Guide: the shots
  const HARM_T = [0.28, 0.48], TART_T = [0.22, 0.38, 0.54, 0.9];             // the Aftershocks' shots
  const K = {
    basic: [
      { name: BA, anim: 'tgShot', dur: 0.4, cancel: 0.3, reach: 6, range: 4, hits: [hit(0.14, 69.7, 26.1, 0, shotL(PHYS))] },
      { name: BA, anim: 'tgShot', dur: 0.42, cancel: 0.32, reach: 6, range: 4, hits: [hit(0.15, 114.1, 42.8, 0, shotL(PHYS))] },
      // (the wiki's live table: 221.7; the 3.4.2 beta datamine has 222.0)
      { name: BA, anim: 'tgShot', dur: 0.5, cancel: 0.38, reach: 6, range: 4, hits: [hit(0.18, 221.7, 91.6, 0, shotL({ attr: 'physical', r: 0.9 }))] },
      { name: BA, anim: 'tgShot4', dur: 0.78, cancel: 0.6, reach: 6.5, range: 4, hits: [hit(0.32, 486.1, 266.0, 174.41, shotL({ heavy: true, r: 1.1, len: 11, kb: 0.9 }))] },
    ],
    // Sniper Stance (held Basic): one long move, a shot at each SN time; letting go (or AUTO's plan done) ends it in the
    // Finishing Move (mech.tick), and so does its natural end (then)
    snipe: { name: SS, anim: 'tgSnipe', dur: SN_DUR, cancel: SN_DUR, reach: 9, range: 6, trgStance: true, trgPurge: true, then: 'finish',
      hits: SN.map(t => hit(t, 96.0, 35.9, 27.0, shotL({ len: 11 }))) },
    // the automatic charged counter after her evade in the stance (then back into it)
    scounter: { name: SS + ' (charged counter)', anim: 'tgSpinShot', dur: 0.8, cancel: 0.7, inv: [0, 0.8], trgStance: true, trgPurge: true, then: 'snipe',
      hits: [hit(0.45, 468.2, 223.6, 193.22, shotL({ heavy: true, r: 1.1, len: 11, kb: 1.0 }))] },
    finish: { name: SS + ' (Finishing Move)', anim: 'tgFinish', dur: 0.95, cancel: 0.85, reach: 9, range: 6, inv: [0, 0.95],
      hits: [hit(0.55, 263.2, 98.6, 119.26, shotL({ heavy: true, r: 1.1, len: 12, kb: 1.0 }))] },
    // her Aftershocks from off the field (fired by mech.tick, not as a move: trgDur is how long she is out there)
    harm: { name: 'Basic Attack: Harmonizing Shot', anim: 'tgHarm', dur: 0.75, trgDur: 0.75, aftershock: true, hits: HARM_T.map(t => hit(t, 96.3, 54.6, 10.86)) },
    tart: { name: 'Basic Attack: Harmonizing Shot - Tartarus', anim: 'tgTart', dur: 1.25, trgDur: 1.25, aftershock: true,
      hits: TART_T.slice(0, 3).map(t => hit(t, 45.7, 25.8, 20.49)).concat([hit(0.9, 91.4, 51.6, 40.98, { big: true })]) },
    dash: { name: 'Dash Attack: Vengeful Specter', anim: 'tgDash', dur: 0.5, cancel: 0.38, reach: 7, hits: [hit(0.2, 103.1, 38.9, 0, shotL(PHYS))] },
    counter: { name: 'Dodge Counter: Condemned Soul', anim: 'tgSpinShot', dur: 0.62, cancel: 0.48, inv: [0, 0.56], hits: [hit(0.26, 439.7, 292.3, 76.66, shotL({ heavy: true, r: 1.2, kb: 0.9 }))] },
    special: { name: 'Special Attack: Spectral Flash', anim: 'tgSlash', dur: 0.55, cancel: 0.42, reach: 2.4, range: 1.6, cd: 1.2, dr: 0.4, hits: [hit(0.22, 143.0, 107.8, 65.0, { shape: 'arc', r: 2.6, arc: 130 })] },
    // Flash Burial: the slash and the shot into the ground share the one official multiplier (split 25/75: our choice)
    ex: { name: 'EX Special Attack: Flash Burial', anim: 'tgBurial', dur: 1.2, cancel: 1.05, cost: 60, reach: 2.6, range: 1.8, inv: [0, 1.15],
      hits: [hit(0.25, 1269.1 * 0.25, 649.4 * 0.25, 356.66 * 0.25, { shape: 'arc', r: 2.8, arc: 140 }), hit(0.88, 1269.1 * 0.75, 649.4 * 0.75, 356.66 * 0.75, { heavy: true, shape: 'circle', at: 'target', r: 2.8, kb: 1.2 })] },
    chain: { name: 'Chain Attack: Stygian Guide', anim: 'tgChain', dur: 1.4, inv: [0, 1.4],
      hits: CH.map((t, i) => { const k = i < 4 ? 0.15 : 0.4; return hit(t, 1150.0 * k, 204.0 * k, 322.86 * k, shotL(i < 4 ? { r: 1.2, len: 12 } : { heavy: true, r: 1.4, len: 12, kb: 1.4 })); }) },
    ult: { name: 'Ultimate: Underworld Requiem', anim: 'tgUlt', dur: 2.1, inv: [0, 2.1], hits: [hit(1.25, 2961.1, 1384.0, 76.66, { heavy: true, shape: 'cone', r: 8, arc: 70, kb: 1.8 })] },
    // Delaying Demise: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow; the official Heavy is 514.4)
    assist: { name: 'Defensive Assist: Delaying Demise', type: 'defensive', anim: 'tgParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Piercing Thunder', anim: 'tgFollow', dur: 1.3, inv: [0, 1.25],
      hits: [0.2, 0.35, 0.5].map(t => hit(t, 866.3 * 0.15, 491.3 * 0.15, 369.51 * 0.15, { shape: 'arc', r: 2.6, arc: 140 })).concat([hit(1.0, 866.3 * 0.55, 491.3 * 0.55, 369.51 * 0.55, shotL({ heavy: true, r: 1.3, kb: 1.2 }))]) },
    quick: { name: 'Quick Assist: Cold-Bore Cover Fire', anim: 'tgSpinShot', dur: 0.62, inv: [0, 0.58], hits: [hit(0.26, 169.1, 127.3, 76.66, shotL({ r: 1.1, kb: 0.7 }))] },
  };

  /* ----------------------------------------------------- her mechanics -- */
  // Soul-Searching Gaze: the target's Stun DMG Multiplier +35% (5 s), Stunned or not. The game's Stun multiplier is its own
  // factor (x1.5 on a Stun), so +35% of it is 0.35 / that factor as a DMG bonus here (exact when nothing else adds)
  const gaze = v => v && v.trgGaze > BT.B.t ? 0.35 / BT.stunMult(v) : 0;
  // Silver Lantern's Gaze: Aftershock Daze from CRIT Rate over 40%
  const lantern = a => a.trgSLG ? 1 + Math.min(0.75, Math.max(0, a.st.cr - 0.4) * 100 * 0.015) : 1;
  const HARM_KINDS = ['basic', 'core', 'hold', 'charged', 'counter', 'special', 'dash', 'quick'];   // Basic Attacks, Dodge Counter, Special, Dash Attack, Quick Assist
  const TART_OF = { ex: 'ex', ex2: 'ex', followup: 'followup', ult: 'ult', ult2: 'ult' };           // EX, Assist Follow-Up, Ultimate
  const fielded = a => BT.fielded().includes(a);
  const prevOf = a => { const S = BT.B.squad, n = S.length, i = S.indexOf(a); for (let k = 1; k < n; k++) { const s = S[(i - k + n) % n]; if (s.alive && s !== a) return s; } return null; };
  // the way the stick points on the floor (as ai.js reads it: the camera's up and right)
  const stickDir = I => { const y = BT.B.cam.yaw || 0; return Math.atan2(Math.cos(y) * I.x - Math.sin(y) * I.y, -Math.sin(y) * I.x - Math.cos(y) * I.y); };

  function coordinated(a, dur, n) {
    const B = BT.B, C = a.trgCS && a.trgCS.until > B.t ? a.trgCS : { until: B.t, left: 0 };
    a.trgCS = { until: Math.min(B.t + 20, C.until + dur), left: Math.min(10, C.left + n) };
    BT.callout('COORDINATED SUPPORT', 'skill', `Trigger · ${a.trgCS.left} shots`);
    BT.log(`Trigger: Coordinated Support (${Math.round(a.trgCS.until - B.t)} s, ${a.trgCS.left} Harmonizing Shots for the squad's hits).`, 'skill');
  }
  // her move just set up the Quick Assist of the Agent before her in the squad: switch to that Agent to take it
  function openQA(a, A) {
    const B = BT.B; if (B.allOut) return;
    const who = prevOf(a); if (!who || !who.def.kit.quick) return;
    a.trgQA = { who, until: B.t + Math.max(0, A.dur - A.t) + QA_WIN };
    BT.callout('QUICK ASSIST READY', 'assist', who.def.short);
    BT.log(`Trigger: ${who.def.short}'s Quick Assist is ready (switch to ${who.def.short}).`, 'skill');
  }
  // letting go of the stance: a step back and the Finishing Move
  function release(a, A) {
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    BT.endAct(a); a.gap = 0; a.queue.unshift({ def: K.finish, kind: 'core', tgt, delay: 0 });
  }
  // the evade in the stance: a sidestep, a Perfect Dodge, and the charged counter at once
  function evade(a, e, A) {
    const B = BT.B, s = Math.random() < 0.5 ? 1 : -1, d = A.dir;
    FX.glow(a.x, 1.0, a.z, 1.4, 0x9ad8ff, 0.25, { size1: 1.2, a: 0.6 });
    a.x += Math.cos(d) * s * 1.2; a.z -= Math.sin(d) * s * 1.2;
    a.dodge = { t0: B.t, until: B.t + 0.3 };
    BT.perfectDodge(a, e);                                         // (its slow motion, Decibels and Energy)
    a.counterUntil = 0;                                            // the counter is automatic: no Dodge Counter press waiting
    const tgt = e && e.alive ? e : A.tgt && A.tgt.alive ? A.tgt : null;
    BT.endAct(a); a.gap = 0; a.queue.unshift({ def: K.scounter, kind: 'core', tgt, delay: 0.05 });
  }

  /* Harmonizing Shot: she flashes in beside the enemy her teammate just hit, circles it firing, and is gone (on the field,
     in an All-Out clash, she fires from where she stands, between her own moves). As Orphie's Corrosive Flash in battle.js:
     she cannot be hit out there (she is not on the field). */
  function startHarm(a, v, src, def) {
    const B = BT.B, ghost = !fielded(a), prev = a.trgH;
    if (!ghost && (a.act || a.state !== 'idle')) return false;
    const Hs = { def, t0: B.t, tgt: v, n: 0, ghost, A: { def, kind: 'aftershock', t: 0, hi: 0, tgt: v, dir: 0, fired: {}, data: {} } };
    if (ghost) {
      if (prev && prev.ghost) { Hs.side = prev.side; Hs.r = prev.r; Hs.a0 = ang(v, a); }   // Tartarus taking over: from where she is
      else { Hs.side = Math.random() < 0.5 ? 1 : -1; Hs.r = Math.max(3.2, v.rad + 2.6); Hs.a0 = ang(v, src) + Hs.side * 1.5; }
      place(a, Hs);
      if (!(prev && prev.ghost)) FX.burst(a.x, 1, a.z, 14, { col: [0xffffff, 0x5ec8ff], speed: 3, size: 0.1, life: 0.35, g: -2 });
      a.obj.visible = true; a.airY = 0;
      Object.assign(a.anim, { state: 'act', t: 0, th: def.hits[0].t, dur: def.trgDur, act: { anim: def.anim } });
    }
    a.trgH = Hs;
    if (!a.trgTold) { a.trgTold = true; BT.log('Trigger: Harmonizing Shot, from the bench (a teammate\'s hit while she has Purge).', 'skill'); }
    if (def === K.tart) BT.log('Trigger: Harmonizing Shot - Tartarus!', 'skill');
    return true;
  }
  // round the target as she fires ("while encircling the enemy")
  function place(a, Hs) {
    const B = BT.B, v = Hs.tgt, I = B.bounds, k = clamp((B.t - Hs.t0) / Hs.def.trgDur, 0, 1);
    const an = Hs.a0 + Hs.side * 0.9 * k;
    a.x = v.x + Math.sin(an) * Hs.r; a.z = v.z + Math.cos(an) * Hs.r;
    if (I) { a.x = clamp(a.x, I[0] + 0.4, I[2] - 0.4); a.z = clamp(a.z, I[1] + 0.4, I[3] - 0.4); }
    a.face = ang(a, v);
  }
  function stepHarm(a, on) {
    const B = BT.B, Hs = a.trgH, v = Hs.tgt;
    if (Hs.ghost && on) { a.trgH = null; return; }                // swapped in meanwhile: she is simply on the field now
    if (!v.alive || B.result) return endHarm(a);
    const t = B.t - Hs.t0;
    if (Hs.ghost) { place(a, Hs); a.anim.t = t; }
    while (Hs.n < Hs.def.hits.length && t >= Hs.def.hits[Hs.n].t) {
      const h = Hs.def.hits[Hs.n++], k = lantern(a);
      Hs.A.dir = ang(a, v); Hs.A.t = t;
      tracer(a, v.x, 1.0, v.z, { big: h.big });
      BT.applyHit(a, v, k > 1 ? Object.assign({}, h, { daze: h.daze * k }) : h, Hs.A, 'electric');
      if (!v.alive) break;
    }
    if (t >= Hs.def.trgDur || !v.alive) endHarm(a);
  }
  function endHarm(a) {
    const Hs = a.trgH; a.trgH = null;
    if (!Hs || !Hs.ghost || fielded(a)) return;
    a.obj.visible = false; a.anim.state = 'idle'; a.anim.act = null;
    FX.burst(a.x, 1, a.z, 12, { col: [0xffffff, 0x5ec8ff], speed: 3, size: 0.1, life: 0.3, g: -2 });
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.trigger = {
    id: 'trigger', name: 'Trigger', short: 'Trigger', faction: 'Obol Squad', spec: 'Stun', attr: 'electric', rank: 'S',
    color: '#f4b243', color2: '#df3729', assist: 'defensive', stance: 'sniper',
    blurb: 'The Obol Squad\'s sniper: blinded in the fall of the old capital, she "sees" through Ether Vision and senses honed past anyone\'s, and Phlegethon, the rifle her old squad built her, carries a bayonet. Hold Basic for Sniper Stance to fill her Purge; then, off the field, she flashes in beside the enemy for Harmonizing Shot whenever a teammate strikes, piling on Daze and raising the Stun DMG it takes.',
    // CRIT Rate as a CRIT build (her kit expects one: Silver Lantern's Gaze adds Aftershock Daze for CRIT Rate over 40%;
    // at the usual Stun scale's 10% it would never act). Our choice: 60%, a modest build.
    stats: { hp: 8870, atk: 2530, def: 642, impact: 131, ap: 95, am: 96, cr: 0.6, cd: 0.8, er: 1.2, speed: 4.8 },
    ai: { range: 4.0, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'purge',
    core: [
      ['Core Passive: Soul-Searching Gaze', 'When her Aftershocks hit an enemy, its Stun DMG Multiplier rises by 35% for 5 s, even while it is not Stunned: the whole squad hits it harder.'],
      ['Sniper Stance and Purge', 'Hold Basic for Sniper Stance: continuous fire, each hit +25 Purge (max 100). Attacked while she fires, she evades on her own (once every 8 s, or whenever you are moving her) for a Perfect Dodge and an automatic charged counter. Let go: she steps back for the Finishing Move, which sets up the Quick Assist of the Agent before her in the squad (once every 25 s; switch to that Agent within 2.5 s). She starts a fight with no Purge.'],
      ['Harmonizing Shot', 'Off the field, with Purge: a teammate\'s Basic Attack, Dodge Counter, Special Attack, Dash Attack or Quick Assist hit calls her in beside the enemy for two Aftershock shots (3 Purge; once every 3 s). A heavy hit of a teammate\'s EX, Assist Follow-Up or Ultimate calls Harmonizing Shot - Tartarus: three shots and a Finishing Move (5 Purge; each of the three twice in 20 s).'],
      ['Coordinated Support', 'When her EX or Ultimate hits, it sets up the previous Agent\'s Quick Assist, and for 8 s (Ultimate 12 s) every hit by the Agent on the field fires a Harmonizing Shot, free and with no cooldown, up to 4 times (Ultimate 6). Entering it again adds time and shots, up to 20 s and 10.'],
      ['Additional Ability: Silver Lantern\'s Gaze', 'With an Attack Agent or another Electric Agent in the squad: each 1% of her CRIT Rate above 40% raises her Aftershocks\' Daze by 1.5%, up to 75%.'],
    ],
    kit: K,
    kitShow: [['Hold', 'snipe'], ['Finish', 'finish'], ['Aftershock', 'harm'], ['Aftershock', 'tart']],
    rivalMoves: [{ k: 'finish', kind: 'core', p: 0.2, cd: 6 }],
    howto: 'Trigger: hold Basic for Sniper Stance (continuous fire, +25 Purge a hit; let go for the Finishing Move, which sets up the Quick Assist of the Agent before her: switch to that Agent). Then swap her out: while she has Purge, your teammates\' hits call her in for Harmonizing Shot Aftershocks (Tartarus on a heavy EX, Follow-Up or Ultimate hit), and the enemies they hit take more Stun DMG. Her EX and Ultimate give Coordinated Support: free Harmonizing Shots for a while. Her assist is a Defensive Assist: she parries.',
    mech: {
      init(a) {
        a.purge = P_START; a.trgH = null; a.trgHcd = 0; a.trgTart = { ex: [], followup: [], ult: [] }; a.trgCS = null; a.trgQA = null; a.trgQA25 = 0;
        a.trgEvT = 0; a.trgShots = 0; a.trgPlan = 0; a.trgSLG = false; a.trgTold = false;
      },
      squad(a, B) {
        // Silver Lantern's Gaze: an Attack Agent, or one sharing her attribute (Electric)
        a.trgSLG = B.squad.some(s => s !== a && (s.def.spec === 'Attack' || s.def.attr === a.def.attr));
        // Orphie's Forged in Flames covers every Agent with Zeroed In: Trigger's Aftershocks ignore 25% DEF too (battle.js reads a.orFIF)
        const o = B.squad.find(s => s.id === 'orphie'); if (o && o.orFIF) a.orFIF = true;
      },
      start(a, def) {
        const B = BT.B;
        // into Sniper Stance afresh (not back into it after the charged counter): AUTO plans when to let go, once the
        // Purge it wants is in (a shot more now and then); you let go of Basic
        if (def === K.snipe && !a.trgStance) { a.trgShots = 0; a.trgPlan = clamp(Math.ceil((PMAX - a.purge) / 25), 2, 5) + (Math.random() < 0.5 ? 1 : 0); a.cds.trgSnipe = B.t + 7; }
        a.trgStance = !!def.trgStance;
      },
      hit(a, v, h, A) {
        const B = BT.B, d = A.def;
        // Sniper Stance's fire and its charged counter: +25 Purge a hit
        if (d.trgPurge && A.data.trgP !== h) { A.data.trgP = h; a.purge = Math.min(PMAX, a.purge + 25); if (d === K.snipe) a.trgShots++; }
        // Soul-Searching Gaze: her Aftershocks mark the enemy for 5 s
        if (d.aftershock && v.alive) v.trgGaze = B.t + 5;
        // EX and Ultimate: Coordinated Support and the previous Agent's Quick Assist (once a move)
        if ((d === K.ex || d === K.ult) && !A.data.trgCS) { A.data.trgCS = true; coordinated(a, d === K.ult ? 12 : 8, d === K.ult ? 6 : 4); openQA(a, A); }
        // the Finishing Move: the Quick Assist, once every 25 s
        if (d === K.finish && !A.data.trgQ && a.trgQA25 <= B.t) { A.data.trgQ = true; a.trgQA25 = B.t + 25; openQA(a, A); }
      },
      mods(a, v) { return { dmg: gaze(v) }; },
      // the same Stun DMG for her teammates' hits on a marked enemy (battle.js: agentDamage asks every squad member's dmgFor)
      dmgFor(s, b, v) { if (!BT.B || b === s || b.rival) return 0; return gaze(v); },
      // a teammate's hit landed: Harmonizing Shot (or Tartarus) if she has the Purge, free in Coordinated Support
      allyHit(a, src, v, h, A) {
        const B = BT.B;
        if (!a.alive || a.stun > 0 || B.phase !== 'fight' || !v.alive || !A || src.rival || !fielded(src)) return;
        if (A.kind === 'aftershock' || A.kind === 'corrosive') return;
        const grp = h.heavy && TART_OF[A.kind];
        let tart = false;
        if (grp && a.purge >= 5) { a.trgTart[grp] = a.trgTart[grp].filter(t => t > B.t - 20); tart = a.trgTart[grp].length < 2; }
        if (a.trgH) {                                               // during a Harmonizing Shot, Tartarus takes over at once
          if (tart && a.trgH.def === K.harm && startHarm(a, v, src, K.tart)) { a.purge -= 5; a.trgTart[grp].push(B.t); }
          return;
        }
        if (tart) { if (startHarm(a, v, src, K.tart)) { a.purge -= 5; a.trgTart[grp].push(B.t); } return; }
        const CS = a.trgCS;
        if (CS && CS.until > B.t && CS.left > 0) { if (startHarm(a, v, src, K.harm)) CS.left--; return; }
        if (HARM_KINDS.includes(A.kind) && a.purge >= 3 && a.trgHcd <= B.t && startHarm(a, v, src, K.harm)) { a.purge -= 3; a.trgHcd = B.t + 3; }
      },
      tick(a, dt, on) {
        const B = BT.B, A = a.act;
        if (a.trgCS && (a.trgCS.until <= B.t || a.trgCS.left <= 0)) a.trgCS = null;
        if (a.trgQA && (a.trgQA.until <= B.t || !a.trgQA.who.alive)) a.trgQA = null;
        if (a.trgH) stepHarm(a, on);
        // out of the stance some other way (hit, dodged, an Ultimate): it is over
        if (a.trgStance && !(A && A.def.trgStance) && !a.queue.some(q => q.def && q.def.trgStance)) a.trgStance = false;
        // Sniper Stance: you let go of Basic (AUTO: its plan is done, or the target is gone): the Finishing Move
        if (on && A && A.def === K.snipe && A.t > 0.15) {
          const done = BT.isPlayer(a) ? !BT.btnHeld('basic') : a.trgShots >= a.trgPlan || !(A.tgt && A.tgt.alive);
          if (done) { release(a, A); return; }
          // the stick moves her left, right or back while she fires (never forward)
          const I = BT.isPlayer(a) && BT.moveInput();
          if (I) {
            const d = stickDir(I); let dx = Math.sin(d), dz = Math.cos(d);
            const fx = Math.sin(A.dir), fz = Math.cos(A.dir), along = dx * fx + dz * fz;
            if (along > 0) { dx -= along * fx; dz -= along * fz; }
            a.x += dx * 2.4 * dt; a.z += dz * 2.4 * dt;
          }
        }
        // AUTO takes the Quick Assist she set up, once her move is done (a swap now would cut it short)
        if (on && B.auto && !B.allOut && a.trgQA && B.swapCd <= 0 && !B.chain && !B.cutin && !BT.assistThreat()
          && (!A || (A.hi >= (A.def.hits || []).length && !['ult', 'chain'].includes(A.kind)))) BT.cmdSwap(a.trgQA.who);
      },
      swap(a, isIn, why) {
        const B = BT.B;
        if (isIn) { if (a.trgH && a.trgH.ghost) a.trgH = null; return; }
        a.trgStance = false;
        const Q = a.trgQA; a.trgQA = null;
        if (!Q || Q.until <= B.t || why !== 'swap') return;
        // switched to the Agent she set up: that Agent comes in with a Quick Assist
        const inc = BT.active(); if (!inc || inc !== Q.who || !inc.alive) return;
        inc.queue.unshift({ def: inc.def.kit.quick, kind: 'quick', tgt: BT.pickTarget(inc), delay: 0.05 });
        BT.callout('QUICK ASSIST', 'assist', inc.def.kit.quick.name.replace('Quick Assist: ', ''));
        BT.log(`${inc.def.short}: ${inc.def.kit.quick.name} (set up by Trigger)`, 'assist');
      },
      // in Sniper Stance: her own evade (once every 8 s; whenever you are moving her) instead of the blow
      incoming(a, e) {
        const B = BT.B, A = a.act;
        if (!A || A.def !== K.snipe) return false;
        const moving = BT.isPlayer(a) && !!BT.moveInput();
        if (!moving && a.trgEvT > B.t) return false;
        if (!moving) a.trgEvT = B.t + 8;
        evade(a, e, A); return true;
      },
      // held Basic: Sniper Stance (just after a dodge: the Dash Attack, as usual)
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || !hold || c.dash) return null;
        return { def: K.snipe, kind: 'core' };
      },
      // AUTO: into Sniper Stance when her Purge runs low (not on a Stun: that is for damage), now and then
      ai(a, tgt, B) {
        if (a.purge <= 50 && !(tgt.stun > 0) && (a.cds.trgSnipe || 0) <= B.t) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const n = Math.floor(a.purge / 10), r = [`PURGE ${'●'.repeat(n)}${'○'.repeat(10 - n)} ${Math.floor(a.purge)}`];
        if (a.act && a.act.def.trgStance) r.push('SNIPER STANCE');
        if (a.trgCS && a.trgCS.until > B.t) r.push(`COORDINATED SUPPORT ${Math.ceil(a.trgCS.until - B.t)}s ×${a.trgCS.left}`);
        if (a.trgQA && a.trgQA.until > B.t) r.push(`QUICK ASSIST: SWITCH TO ${a.trgQA.who.def.short.toUpperCase()}`);
        if (a.trgHcd > B.t) r.push(`HARMONIZING SHOT ${Math.ceil(a.trgHcd - B.t)}s`);
        return r;
      },
    },
    town: {
      home: 'lumina',
      // mornings at the 141 (the limited red bean buns) and on the tactile paving outside the HIA Club and down into
      // the metro; afternoons the same, Dew Gardening's flowers, Old Duyi's; evenings the Gravity Cinema posters and the
      // shampoo smell of Beaverson's; late nights by the river, where the wind is
      routine: ['141:stall 30, hia:door 30, metro:wait 15, huddle 25', 'hia:door 25, 141:freezer 15, dew:browse 15, duyi:look 15, huddle 30', 'cin:poster 30, beav:sofa 20, river:rail 20, huddle 30', 'river:rail 70, play:bench 30'],
      chatter: ['(She hums a harmonica tune under her breath.)', 'I heard you coming, Proxy. Your footsteps are easy to know.'],
      lines: [
        'Trigger, sniper of Obol Squad. I can\'t see much behind this visor, Proxy. I don\'t need to. I know the sound of your footsteps.',
        'The 141 here sells a few limited red bean buns. Miss Tsukishiro and I always seem to arrive at exactly the same moment.',
        'Nobody in Obol Squad eats red bean buns with me. Soldier 11 only eats spicy, Seed can\'t decide, and if I offer Orphie sweets, Captain Magus blows a fuse.',
      ],
      chapters: [
        { title: 'Ten left', ask: ['Proxy... the 141 has ten limited red bean buns left, and Miss Tsukishiro wants them as much as I do.', 'Would you talk to her for me? She\'s at the Section 6 office. I\'d rather settle this as friends than as rivals.'],
          steps: [{ t: 'talk', to: 'yanagi', reply: 'Miss Trigger said that? ...Then five each. Red bean buns should be savoured with companions, not fought over. Please tell her so, Manager.' }, { t: 'talk', to: 'trigger' }],
          scene: [['A', 'Five each... that\'s fair. Thank you, Proxy.'], ['P', 'You\'re not going to eat all five in one go, are you?'], ['A', 'On a mission I would. Today I\'d like to try it Miss Tsukishiro\'s way. Slowly. With you, if that\'s alright.'], ['A', '...It really is sweeter when you take your time. I never knew that.']] },
        { title: 'Tactile paving', ask: ['The tactile paving outside the HIA Club stops halfway, and I hear the metro\'s is worse. I\'m noting every gap for the municipal office.', 'Walk the paths with me one afternoon? I want to shut out my other senses and walk them the way most people who can\'t see do. I might stumble, so...'],
          steps: [{ t: 'talk', to: 'sage', reply: '(Sage in a Barrel nods at the yellow tiles.) The lass with the mask walks these every afternoon, slow as you like. Then she writes. Then she walks them again.' }, { t: 'slot', slot: 1, to: 'trigger' }],
          scene: [['A', '...Mhm. Take my hand. I\'ll block out my hearing and touch as much as I can.'], ['A', 'The path stops dead by the stairs. And down in the metro the loop just goes round and round. Someone could wander in it all day.'], ['P', 'Got it all written down?'], ['A', 'Every gap. ...Though I couldn\'t block out the feeling in my hand. Not even a little. Thank you for walking with me, Proxy.']] },
        { title: 'Overwatch', ask: ['Orphie and Captain Magus want to take on an Elite in the Hollow, and a squad without its sniper is a squad without eyes.', 'Put me at the front and Orphie beside me, Proxy. I\'ll call every angle; Magus can do the shouting.'],
          steps: [{ t: 'clear', f: { enc: 'elite', with: 'orphie', lead: 'trigger' } }, { t: 'talk', to: 'orphie', reply: 'Trigger saw every one of them before they moved! Magus says the overwatch was "acceptable". ...That\'s practically a medal, coming from the Captain.' }, { t: 'talk', to: 'trigger' }],
          scene: [['A', 'Target down. Orphie and Captain Magus, not a scratch. That\'s all I needed.'], ['P', 'Orphie says Magus called it "acceptable".'], ['A', 'Hehe~ From the Captain that\'s a parade. She still growls when I offer Orphie a red bean bun, though.'], ['A', 'I lost a squad once, Proxy. This one I\'m keeping. And I won\'t carry it alone like I used to. My back is in your hands, and theirs.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, the in-game models and the "Behind the
     Agent" sheet: platinum blonde hair, long side-swept bangs over the right
     half of a black visor mask that hides her eyes (two small lights at its
     bottom corners), a high ponytail falling to her thighs and long loose
     locks; red triangular clips with silver discs at both temples, a grey
     metal clip on top, a yellow coiled cable from her left ear. A grey metal
     throat piece over a dark hood; a cropped black camouflage jacket with long
     puffed sleeves; a yellow sash over her left shoulder with the red Obol
     emblem and two silver coins; a dark chest rig with yellow-tan buckles on a
     khaki band; a bare midriff crossed by black X straps, a silver ring; a
     yellow-and-black half-cape on her right side. Black camo leggings with
     yellow hip panels, holster pouches, a white emblem on the left thigh and
     grey diamonds down the right; knee pads with two yellow marks; black boots
     with yellow toggles over olive lower shoes, a red-orange toe; black
     fingerless gloves, a yellow patch on the left. Phlegethon, her electric
     sniper rifle: a yellow-orange receiver and hooked claw stock with black
     plates, a long dark-navy barrel, a grey suppressor, a bayonet blade under
     the barrel. 173 cm. */
  {
    const HAIR = 0xf4eec4, HAIR2 = 0xded5ad, HAIR3 = 0xa7936f, HAIRHI = 0xfaf6d8, SKIN = 0xf7e6d5, NAVEL = 0xe8cbb6;
    const VISOR = 0x3f3e4a, VISOR2 = 0x2c2b35, VISHI = 0x656275, VLIGHT = G(0xd8ecff);   // (the lights' colour is not given anywhere: our choice)
    const CLIPR = 0xe65e55, CLIPR2 = 0xbe3d37, CLIPRD = 0x773c37, DISC = 0xcfc9bf, CLIPM = 0x908c86, CABLE = 0xe8d154;
    const HOOD = 0x3b3a46, HOOD2 = 0x454351, NECKM = 0xa4a7aa, NECKM2 = 0x7f8283;
    const JACK = 0x373640, JACK2 = 0x4c4851, JACK3 = 0x1e1e24;
    const SASH = 0xf9d34b, SASH2 = 0xebc451, SASHD = 0x81694b, EMB = 0xdf3729, COIN = 0xcfc9bf;
    const RIG = 0x3d3c46, RIG2 = 0x242125, BUCK = 0xccb174, KHAKI = 0x9c8c6a, STRAP = 0x242125, RING = 0xc8ccd4;
    const LEG = 0x46444a, LEG2 = 0x54535a, LEG3 = 0x2d2b33, HIPY = 0xf2c84a, EMBW = 0xd8d8dc, DIAM = 0xb8b8c0;
    const KNEE = 0x4f515e, KNEEY = 0xf2c84a, BOOT = 0x37353c, BOOTO = 0x7b705d, BOOTO2 = 0x6c6450, BSTRAP = 0xbc9443, SOLE = 0x1e1c1e, TOE = 0xd8452a;
    const GLOVE = 0x39363c, GLOVEY = 0xf2c84a, CAPE = 0xf4b243, CAPE2 = 0xd09b4b, CAPEK = 0x1e1d22;
    const RY = 0xf4b243, RY2 = 0xf8ba53, RYD = 0xd09b4b, RB = 0x392e35, RB2 = 0x594d54, BARREL = 0x202434, BARREL2 = 0x29323f;
    const BLADE = 0x485059, EDGE = 0xd4d2c9, EDGE2 = 0xb4b3ad, SUPP = 0x46585c, SUPP2 = 0x5c666c;
    // the camouflage on her jacket and leggings: blotches of a lighter and a darker tone
    const camo = (c, c2, c3) => (x, y, z) => { const n = (((x * 3 + y * 5 + z * 7) % 7) + 7) % 7; return n === 0 ? c3 : n === 3 ? c2 : c; };
    const arm = s => g => {   // s: +1 her left, -1 her right
      H.arm(g, { sleeve: camo(JACK, JACK2, JACK3), sleeveTo: 6, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
      g.box(2 * s, -4, -1, 2 * s, -2, 1, JACK2);                                      // the puffed sleeve
      g.box(-1, -5, -1, 1, -5, 1, JACK3);                                              // the strap at the cuff
      g.set(0, -7, 2, SKIN);                                                           // fingerless: the fingertips
      if (s > 0) g.set(1, -6, 0, GLOVEY);                                              // the yellow patch on her left glove
    };
    const leg = s => g => {
      H.leg(g, { pant: camo(LEG, LEG2, LEG3), boot: BOOT, bootH: 4, sole: SOLE });
      g.box(-1, -5, 2, 1, -4, 2, KNEE); g.set(-1, -4, 2, KNEEY); g.set(1, -4, 2, KNEEY);   // the knee pad, its two yellow marks
      g.box(-1, -8, -1, 1, -7, 1, BOOTO); g.box(-1, -8, 2, 1, -8, 2, BOOTO2);              // the olive lower shoe, its toe
      g.set(0, -6, 2, BSTRAP); g.set(0, -8, 2, TOE);                                       // the yellow toggle; the red-orange toe
      if (s > 0) g.set(0, -2, 1, EMBW);                                                    // her left thigh: the white emblem
      else { g.set(-1, -1, 0, DIAM); g.set(-1, -3, 0, DIAM); }                            // her right thigh: grey diamonds down its side
    };
    MODELS.trigger = H.humanoid({
      scale: 0.073, height: 28, width: 20,
      sockets: { weapon: ['rifle', [0, 1, 13]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, camo(LEG, LEG2, LEG3));                            // the high-waisted camo leggings
        for (const s of [-1, 1]) { g.set(s * 3, 0, 1, HIPY); g.set(s * 2, 0, 1, HIPY); g.set(s * 3, -1, 1, HIPY); }   // the yellow hip panels
        g.set(0, -2, 2, NECKM);                                                        // the zip pull
        g.box(4, -2, -1, 4, 0, 1, RIG); g.set(4, 0, 0, NECKM2);                         // the holster on her left hip
        g.box(-4, -2, 0, -4, -1, 1, RIG2);                                             // a pouch on her right hip
        g.box(1, -2, 2, 1, 0, 2, RIG); g.set(1, 0, 2, NECKM);                           // the radio pouch hanging in front
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, SKIN); g.set(0, 0, 1, NAVEL);                         // the bare midriff
        g.set(0, 2, 2, STRAP); g.set(-1, 1, 2, STRAP); g.set(1, 1, 2, STRAP); g.set(-2, 0, 2, STRAP); g.set(2, 0, 2, STRAP);   // the black X straps
        g.set(0, 1, 2, RING);                                                          // the silver ring at their cross
        g.box(-3, 3, -2, 3, 6, 1, camo(JACK, JACK2, JACK3));                            // the cropped camo jacket
        g.box(-3, 3, 2, 0, 4, 2, RIG); g.set(-3, 3, 2, RIG2); g.set(-2, 3, 2, BUCK); g.set(-1, 3, 2, BUCK);   // the chest rig, its buckles
        g.box(-3, 5, 2, 0, 5, 2, KHAKI);                                               // the khaki band over it
        for (const [x, y] of [[2, 6], [3, 6], [1, 5], [2, 5], [1, 4], [2, 4], [0, 3], [1, 3]]) g.set(x, y, 2, (x + y) % 3 === 0 ? SASH2 : SASH);   // the yellow sash
        g.set(0, 3, 3, EMB); g.set(1, 3, 3, EMB);                                      // the red Obol emblem
        g.set(1, 5, 3, COIN); g.set(2, 5, 3, COIN);                                    // the two silver coins
        g.box(2, 5, -3, 3, 6, -3, SASH2); g.set(2, 4, -3, SASHD);                       // the sash over her shoulder, behind
        g.box(-3, 6, -3, 3, 7, -2, HOOD); g.box(-2, 8, -3, 2, 8, -3, HOOD2);            // the hood bunched behind her neck
        g.box(-1, 6, 2, 1, 6, 2, NECKM); g.set(-1, 7, 2, NECKM); g.set(0, 7, 2, NECKM2); g.set(1, 6, 3, NECKM2);   // the metal throat piece
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: VISOR, lash: VISOR2, mouth: 0xc98a7a });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 3], [3, 4], [4, 3]], sideTo: 2 });
        // the visor: black over the eyes and the bridge of the nose, wrapping to the ears; the two lights at its bottom corners
        g.box(-3, 2, 4, 3, 4, 4, (x, y) => (y === 4 && (x === 1 || x === 2)) ? VISHI : y === 4 ? VISOR2 : VISOR);
        g.set(0, 1, 4, VISOR); g.box(-4, 2, 2, -4, 3, 3, VISOR2); g.box(4, 2, 2, 4, 3, 3, VISOR2);
        g.set(-3, 2, 4, VLIGHT); g.set(3, 2, 4, VLIGHT);
        // the long side-swept bangs, over the visor's right half
        g.box(-4, 4, 5, -1, 6, 5, HAIR); g.box(-3, 2, 5, -2, 3, 5, HAIR2); g.set(-4, 3, 5, HAIR); g.set(0, 6, 5, HAIRHI); g.set(1, 7, 5, HAIR);
        for (const [x, y, z] of [[-2, 8, 2], [0, 8, 1], [2, 8, 0], [-1, 8, -1]]) g.set(x, y, z, HAIRHI);   // the shine on top
        g.box(-5, -4, 0, -5, 4, 2, (x, y) => y < -2 ? HAIR2 : HAIR);                   // the long lock at her right cheek
        g.box(5, -1, -2, 5, 3, -1, HAIR);                                              // the shorter one on her left
        g.box(-4, -2, -4, 4, -1, -4, HAIR2);                                           // the nape
        // the red triangular clips with silver discs: the bigger on her left, the other at her right temple
        g.box(5, 5, 0, 5, 6, 2, CLIPR2); g.set(5, 7, 1, CLIPR); g.set(5, 4, 1, CLIPRD); g.set(6, 5, 1, DISC);
        g.box(-5, 4, 2, -5, 5, 3, CLIPR2); g.set(-5, 6, 2, CLIPR); g.set(-6, 5, 2, DISC);
        g.box(1, 8, -3, 3, 8, -2, CLIPM); g.set(3, 9, -2, CLIPM);                       // the grey metal clip on top
        g.set(5, 2, -2, CABLE); g.set(5, 1, -1, CABLE); g.set(5, 0, -1, CABLE); g.set(4, -1, 0, CABLE);   // the yellow coiled cable from her left ear
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tail: {   // the high ponytail, from the back of her head on the left, falling to her thighs
          parent: 'head', at: [2, 6, -4], draw(g) {
            g.box(-1, -1, 0, 1, 1, 1, CLIPM);                                          // the metal tie
            const path = [[0, 1, -1, 1.6], [0, 0, -2, 1.6], [0, -2, -3, 1.7], [0, -4, -3, 1.6], [0, -6, -3, 1.5], [0, -8, -3, 1.4], [0, -10, -2, 1.3], [0, -12, -2, 1.2], [0, -14, -2, 1.0], [0, -16, -1, 0.9]];
            path.forEach(([x, y, z, r], i) => g.ell(x, y, z, r, 1.2, r * 0.8, i >= 8 ? HAIR3 : i % 3 === 1 ? HAIR2 : HAIR));
          },
        },
        tailR: {  // the long loose locks flying out on her right
          parent: 'head', at: [-3, 1, -3], draw(g) {
            for (let i = 0; i < 12; i++) { const z = -Math.floor(i / 4); g.box(-1, -i, z - 1, 0, -i, z, i > 9 ? HAIR3 : (i + z) % 3 === 0 ? HAIR2 : HAIR); }
          },
        },
        tailL: {  // the half-cape on her right side, yellow with a black tip (named so it sways like the hair)
          parent: 'torso', at: [-4, 6, -3], draw(g) {
            for (let i = 0; i <= 11; i++) {
              const x1 = i < 9 ? 1 : i < 10 ? 0 : -1;                                   // narrowing to the black tip at its outer edge
              g.box(-1, -i, 0, x1, -i, 0, x => i >= 9 ? CAPEK : x === -1 ? CAPE2 : CAPE);
            }
          },
        },
        rifle: {  // Phlegethon, in her right hand (rot: level when she shoulders it, pointing down at the ready)
          parent: 'armR', at: [0, -7, 1], rot: [1.35, 0, 0], draw(g) {
            g.box(-1, 0, -1, 1, 1, 3, (x, y) => y === 1 ? (x === 0 ? RY2 : RY) : RB);   // the receiver: yellow-orange on top, black plates
            g.set(1, 0, 1, RYD); g.set(-1, 0, 1, RYD);                                  // (the OBOL lettering's stripe)
            g.box(0, -1, -5, 0, 1, -2, (x, y) => y === 1 ? RY : RB); g.set(0, 0, -5, RB2);   // the stock...
            g.set(0, -2, -5, RY); g.set(0, -1, -4, RB2);                                // ...and its hooked claw
            g.set(0, -1, 0, RB2); g.set(0, -2, 0, RB);                                  // the grip
            g.set(0, -1, 2, RB); g.set(0, -2, 2, RB); g.set(0, -2, 3, RY);              // the claw-shaped front grip
            g.box(-1, 0, 4, 1, 1, 6, BARREL2); g.box(0, 1, 7, 0, 1, 10, BARREL);        // the dark-navy barrel
            g.box(0, -1, 3, 0, 0, 9, (x, y) => y === -1 ? EDGE : BLADE); g.set(0, -1, 10, EDGE2);   // the bayonet blade under it
            g.box(0, 0, 10, 0, 1, 12, SUPP); g.set(0, 1, 12, SUPP2);                   // the suppressor
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     (the numbers are added to her ready stance: Phlegethon low in her right
     hand, the muzzle down, the left hand forward) */
  ANIM.READY.sniper = { armL: [-0.85, 0, -0.45], armR: [-0.9, 0, -0.1], torso: [0.06, -0.12, 0], head: [0, 0.1, 0], legL: [-0.25, 0, 0.08], legR: [0.2, 0, -0.08], hipsY: -0.03 };
  const plus = (...ps) => { const r = {}; for (const p of ps) for (const k in p) { const v = p[k]; r[k] = Array.isArray(v) ? (r[k] ? r[k].map((x, i) => x + v[i]) : v.slice()) : (r[k] || 0) + v; } return r; };
  const times = (p, s) => { const r = {}; for (const k in p) r[k] = Array.isArray(p[k]) ? p[k].map(x => x * s) : p[k] * s; return r; };
  const spike = (t, ts, w) => { let k = 0; for (const s of ts) if (t >= s) k = Math.max(k, 1 - (t - s) / (w || 0.14)); return Math.max(0, k); };
  const AIM = { armR: [-0.45, 0, 0.17], armL: [-0.6, 0, -0.15], torso: [0, -0.05, 0], head: [0.04, 0.05, 0] };   // shouldered: the rifle level
  const KICK = { armR: [-0.14, 0, 0], armL: [-0.1, 0, 0], torso: [-0.06, 0, 0], head: [-0.04, 0, 0] };           // the recoil
  const CROUCH = { legL: [-0.55, 0, 0.12], legR: [0.45, 0, -0.12], hipsY: -0.1, torso: [0.1, 0, 0] };
  const KNEEL = { legL: [-1.1, 0, 0.1], legR: [0.9, 0, -0.1], hipsY: -0.32, torso: [0.12, 0, 0] };
  const DOWN = { armR: [0.5, 0, 0.17], armL: [0.3, 0, -0.15], torso: [0.45, -0.05, 0], head: [0.4, 0.05, 0], legL: [-1.0, 0, 0.1], legR: [-0.5, 0, -0.1] };   // in the air, the muzzle down
  ACT.tgShot = (b, t, th, d) => stage(b, AIM, plus(AIM, KICK), t, th, d);
  ACT.tgShot4 = (b, t, th, d) => stage(b, plus(AIM, CROUCH), plus(AIM, KICK, KICK, CROUCH), t, th, d);
  // Sniper Stance: braced low, the rifle shouldered, a kick at every shot
  ACT.tgSnipe = (b, t) => add(b, plus(times(plus(AIM, CROUCH), clamp(t / 0.22, 0, 1)), times(KICK, spike(t, SN))));
  // the Finishing Move: a step back, the rifle readied, one big shot
  ACT.tgFinish = (b, t, th, d) => stage(b, plus(AIM, { armR: [0.25, 0, 0], torso: [0.12, 0.25, 0], legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }), plus(AIM, KICK, KICK, CROUCH), t, th, d);
  // "rotate and fire": a spin into the shot (Dodge Counter, Quick Assist, the charged counter)
  ACT.tgSpinShot = (b, t, th, d) => add(stage(b, AIM, plus(AIM, KICK, KICK), t, th, d), { spin: clamp(t / Math.max(0.05, th - 0.04), 0, 1) * PI * 2 });
  ACT.tgDash = (b, t, th, d) => stage(b, { armR: [0.3, 0, 0], armL: [0.3, 0, 0], torso: [0.25, 0, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0] }, plus(AIM, KICK), t, th, d);
  // the bayonet: Phlegethon swung like a blade, forehand and backhand
  ACT.tgSlash = (b, t, th, d) => stage(b, { armR: [-0.4, 0.9, -0.9], armL: [0.2, 0, 0.3], torso: [0, 0.7, 0], legR: [0.3, 0, 0] }, { armR: [-0.3, -0.6, 0.7], armL: [0.3, 0, 0.5], torso: [0.15, -0.6, 0], legL: [-0.7, 0, 0], legR: [0.5, 0, 0], hipsY: -0.08 }, t, th, d);
  ACT.tgSlashB = (b, t, th, d) => stage(b, { armR: [-0.3, -0.6, 0.7], torso: [0.1, -0.6, 0] }, { armR: [-0.5, 0.9, -0.8], armL: [0.2, 0, 0.3], torso: [0.1, 0.6, 0], legL: [-0.5, 0, 0], legR: [0.5, 0, 0], hipsY: -0.06 }, t, th, d);
  // Flash Burial: the lunging slash, then up into the air and a shot down into the ground
  ACT.tgBurial = (b, t, th, d) => t < 0.42 ? ACT.tgSlash(b, t, 0.25, 0.42) : stage(b, DOWN, plus(DOWN, { armR: [-0.18, 0, 0], torso: [-0.12, 0, 0] }), t - 0.42, 0.46, d - 0.42);
  // Stygian Guide: braced, shot after heavy shot
  ACT.tgChain = (b, t) => add(b, plus(AIM, CROUCH, times(KICK, 1.6 * spike(t, CH, 0.16))));
  // Underworld Requiem: down on one knee, a long aim, then the one huge shot
  ACT.tgUlt = (b, t, th) => add(b, plus(times(plus(AIM, KNEEL), clamp(t / 0.35, 0, 1)), times(KICK, 2.6 * spike(t, [th], 0.35))));
  // Piercing Thunder: three slashes, a hop, the charged shot on landing
  ACT.tgFollow = (b, t, th, d) => {
    if (t < 0.27) return ACT.tgSlash(b, t, 0.2, 0.27);
    if (t < 0.42) return ACT.tgSlashB(b, t - 0.27, 0.08, 0.15);
    if (t < 0.62) return ACT.tgSlash(b, t - 0.42, 0.08, 0.2);
    return stage(b, plus(AIM, { legL: [-0.8, 0, 0], legR: [-0.4, 0, 0] }), plus(AIM, KICK, KICK, CROUCH), t - 0.62, 0.38, d - 0.62);
  };
  // Delaying Demise: the rifle across her body
  ACT.tgParry = b => add(b, { armR: [-0.5, 0.6, 0.5], armL: [-0.7, 0, -0.5], torso: [0.12, -0.3, 0], hipsY: -0.1, legL: [-0.35, 0, 0], legR: [0.35, 0, 0] });
  // off the field: aiming as she circles the enemy (Harmonizing Shot; Tartarus with its Finishing Move)
  ACT.tgHarm = (b, t) => add(b, plus(AIM, CROUCH, times(KICK, spike(t, HARM_T))));
  ACT.tgTart = (b, t) => add(b, plus(AIM, CROUCH, times(KICK, spike(t, TART_T) * (t >= 0.9 ? 2.2 : 1))));

  /* ------------------------------------------------------------- effects --
     tgShot: a muzzle flash at Phlegethon and the shot's tracer, electric blue
     with a white core (the "Behind the Agent" sheet's muzzle flash; phys: the
     Physical shots, pale gold; big: a heavier shot). tgDown: Flash Burial's
     shot into the ground, lightning bursting from it. tgBlast: Underworld
     Requiem, a fan of light over a wide area. */
  const _m = new THREE.Vector3();
  const muzzle = a => { BT.sock(a, 'weapon', _m); if (_m.y < 0.4) _m.y = 1.1; return _m; };
  function tracer(a, x1, y1, z1, o) {
    const m = muzzle(a).clone(), p1 = new THREE.Vector3(x1, y1, z1), k = o.big ? 1.7 : 1, col = o.phys ? 0xfff2c0 : 0x5ec8ff;
    FX.glow(m.x, m.y, m.z, 0.9 * k, 0xffffff, 0.1, { size1: 1.8 * k }); FX.glow(m.x, m.y, m.z, 1.3 * k, col, 0.16, { size1: 2.4 * k });
    FX.beam(m.clone(), p1, col, 0.12 * k, 0.18); FX.beam(m, p1, 0xffffff, 0.045 * k, 0.12);
    FX.burst(x1, y1, z1, Math.round(8 * k), { col: o.phys ? [0xffffff, 0xfff2c0, 0xf4d35e] : ELEC, speed: 4, size: 0.08, life: 0.25 });
    SFX.play(o.big ? 'boom' : 'shot');
  }
  CHOREO.events.tgShot = (a, A, e, tgt) => {
    const L = e.len || 10, near = tgt && dist(a, tgt) < L + 1;
    const x1 = near ? tgt.x : a.x + Math.sin(A.dir) * L, z1 = near ? tgt.z : a.z + Math.cos(A.dir) * L;
    tracer(a, x1, 1.0, z1, e);
    if (e.big) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.12);
  };
  CHOREO.events.tgDown = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 2.5, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 2.5;
    tracer(a, x, 0.2, z, { big: true });
    FX.named('bolt', { x, z, r: 2.8 }); FX.ring(x, z, 0.4, 3.0, 0x5ec8ff, 0.45); FX.ring(x, z, 0.3, 1.8, 0xffffff, 0.3);
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.3);
  };
  CHOREO.events.tgBlast = (a, A, e, tgt) => {
    const m = muzzle(a).clone(), L = e.len || 9;
    for (let i = -3; i <= 3; i++) { const d = A.dir + i * 0.13, p1 = new THREE.Vector3(a.x + Math.sin(d) * L, 0.9, a.z + Math.cos(d) * L); FX.beam(m.clone(), p1, i ? 0x5ec8ff : 0xffffff, i ? 0.18 : 0.4, 0.35); }
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 5, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 5;
    FX.named('bolt', { x, z, r: 4 }); FX.ring(x, z, 0.5, 6, 0x9ad8ff, 0.5); FX.glow(x, 1, z, 4, 0x5ec8ff, 0.35, { size1: 7 });
    FX.burst(x, 0.8, z, 60, { col: ELEC, speed: 9, size: 0.14, life: 0.6, g: 1, up: 2 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.45); SFX.play('boom');
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const shot = (t, o) => Object.assign({ t, fx: 'tgShot' }, o || {});
  const SLASH = 0x9ad8ff, AFTER = 0x8ad0ff;
  set(K.basic[0], { events: [shot(0.14, { phys: true })] });
  set(K.basic[1], { events: [shot(0.15, { phys: true })] });
  set(K.basic[2], { motion: [{ t0: 0.18, t1: 0.28, kind: 'back', d: 0.2 }], events: [shot(0.18, { phys: true })] });
  set(K.basic[3], { motion: [{ t0: 0.32, t1: 0.46, kind: 'back', d: 0.45 }], events: [shot(0.32, { big: true, len: 11 })] });
  set(K.snipe, { events: SN.map(t => shot(t, { len: 11 })) });
  set(K.scounter, { stream: [{ t0: 0, t1: 0.42, kind: 'spark' }], events: [shot(0.45, { big: true, len: 11 }), { t: 0.45, fx: 'boltAt' }] });
  set(K.finish, { motion: [{ t0: 0, t1: 0.22, kind: 'back', d: 1.0 }], stream: [{ t0: 0.22, t1: 0.53, kind: 'spark' }], events: [shot(0.55, { big: true, len: 12 })] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.18, kind: 'fwd', d: 1.2 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFTER }], events: [shot(0.2, { phys: true })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.0, side: 'auto' }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }], events: [shot(0.26, { big: true })] });
  set(K.special, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFTER }], events: [{ t: 0.22, fx: 'crescent', y: 1.0, tilt: 0.3, r: 2.4, arc: 2.4, col: SLASH }] });
  set(K.ex, { motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 1.0 }, { t0: 0.42, t1: 1.05, kind: 'leap', h: 2.0, d: -1.2 }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFTER }, { t0: 0.45, t1: 0.85, kind: 'spark' }],
    events: [{ t: 0.25, fx: 'crescent', y: 1.0, tilt: -0.4, r: 2.6, arc: 2.6, col: SLASH }, { t: 0.88, fx: 'tgDown' }, { t: 0.88, fx: 'whiteFlash' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.2 }], events: CH.map((t, i) => shot(t, { big: i === 4, len: 12 })).concat([{ t: 1.1, fx: 'boltAt', big: true }, { t: 1.1, fx: 'whiteFlash' }]) });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.2 }], stream: [{ t0: 0.35, t1: 1.22, kind: 'spark' }, { t0: 0.6, t1: 1.22, kind: 'sparkRing', r: 2.2 }], events: [{ t: 1.25, fx: 'tgBlast', len: 9 }, { t: 1.25, fx: 'whiteFlash' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.0 }, { t0: 0.62, t1: 0.95, kind: 'leap', h: 1.1, d: -1.0 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }],
    events: [0.2, 0.35, 0.5].map((t, i) => ({ t, fx: 'crescent', y: 1.0, tilt: i % 2 ? -0.4 : 0.4, r: 2.3, arc: 2.2, col: SLASH })).concat([shot(1.0, { big: true }), { t: 1.0, fx: 'boltAt' }]) });
  set(K.quick, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 3.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFTER }], events: [shot(0.26, { big: true })] });
})();
