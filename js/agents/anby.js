/* ============================================================================
   agents/anby.js -- Anby Demara, the first member of the Cunning Hares (Gentle
   House) and its strongest fighter; once Soldier 0 of the Defense Force's
   Silver Squad. A-Rank, Electric, Stun, Defensive Assist. Released in
   Version 1.0.
   (How an Agent's own file works, its hooks and its helpers: agents/zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Anby Demara, Lore, Dialogue, DMs,
   Voice-Overs, Media, Fashion, Demara Battery Mark II; the trust commissions
   Anby's Movie Time and Anby's Problem; the Quality Time events Iced Wasabi
   Incoming, Spot the Difference, Perfect With Burgers, Classic Scene, Feeling
   Relaxed), zzz.gachabase.net (datamine, agent 1011, game data 3.4.3 beta:
   skills, multipliers, Buildup, the hit-by-hit split of every move and which
   hit is heavy, core levels), the official portrait, in-game and city models.

   Her kit (official):
     Basic Attack: Turbo Volt        4 slashes: the first 3 Physical (the 3rd in
                                     three cuts), the 4th Electric (five cuts).
     Basic Attack: Thunderbolt       after the 3rd hit, hold Basic, or pause and
                                     press it: a downward strike, Electric,
                                     Anti-Interrupt (instead of the 4th hit).
     Dash Attack: Taser Blast        slashes all round her, Physical.
     Dodge Counter: Thunderclap      Special Attack: Fork Lightning (an upward
                                     slash, Anti-Interrupt)
     EX Special Attack: Lightning Bolt  60 Energy, a powerful upward slash.
       Both launch faster ("Quick Launch") straight after the 3rd hit of her
       string or after Thunderbolt.
     Chain Attack: Electro Engine    Ultimate: Overdrive Engine (an upward slash,
                                     then several downward strikes)
     Quick Assist: Thunderfall       Defensive Assist: Flash
     Assist Follow-Up: Lightning Whirl (a spinning slash)
     Core Passive: Fluctuating Voltage   Thunderbolt, a Special or an EX
                                     launched after the 3rd hit: +64% Daze.
     Additional Ability: Parallel Connection   with another Agent of her
                                     Attribute or Faction: her Dodge Counter
                                     hitting gives +7.2 Energy (once per 5 s).
   Our choices where no source says (the report lists them): the "pause" that
   turns a press into Thunderbolt is 0.2 s after the 3rd hit ends (the string
   resets after 0.9 s, as for everyone); Fluctuating Voltage counts only
   straight after the 3rd hit (a Special after Thunderbolt launches faster but
   gets no extra Daze: the text says "after the 3rd hit"); the Special's and
   the Quick Assist's last hits are heavy, as the datamine flags them.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // a share k of a move's official total [DMG%, Daze%, Anomaly Buildup] (the datamine gives each move as one number and
  // splits it over its hits)
  const part = (t, k, T, o) => hit(t, T[0] * k, T[1] * k, Math.round(T[2] * k * 100) / 100, o);
  // official level-12 totals (gachabase skill_data: base + 11 steps; Buildup /100)
  const B1 = [63.1, 24.4, 0], B2 = [67.8, 44.1, 0], B3 = [228.0, 134.7, 0], B4 = [478.9, 282.0, 172.47], TBM = [657.5, 213.9, 127.5];
  const SPM = [186.9, 140.7, 93.3], EXM = [1166.0, 722.7, 532.37], DAM = [113.9, 42.7, 0], DCM = [360.6, 243.1, 61.63];
  const CHM = [1085.8, 216.0, 342.83], ULM = [3026.2, 1487.7, 210.03], QAM = [124.4, 93.6, 61.63], FUM = [670.7, 437.7, 313.22];
  const PARRY = 371.0;                                 // Flash: Light Defensive Daze (Heavy 467.9, Chain 227.6), official, unscaled
  const FV = 0.64;                                     // Fluctuating Voltage at core level F
  const PC_EN = 7.2, PC_CD = 5;                        // Parallel Connection
  const PAUSE = 0.2, WIN = 0.9;                        // the pause for Thunderbolt (our choice); the string's window
  // the datamined split of each move over its hits
  const S4 = [2 / 13, 2 / 13, 3 / 13, 3 / 13, 3 / 13], SEX = [0.25, 0.125, 0.125, 0.25, 0.125, 0.125];
  const SUL = [0.05, 0.05, 0.1, 0.05, 0.05, 0.1, 0.075, 0.075, 0.15, 0.075, 0.075, 0.15];
  // when the hits land (ours: the official clips set the shape of each move, not its timing)
  const T4 = [0.14, 0.24, 0.38, 0.46, 0.56], TTB = [0.36, 0.42, 0.48, 0.56, 0.66];
  const TSP = [0.22, 0.29, 0.36], TSPQ = [0.1, 0.17, 0.24];
  const TEX = [0.24, 0.32, 0.4, 0.52, 0.6, 0.7], TEXQ = [0.12, 0.2, 0.28, 0.4, 0.48, 0.58];
  const TDC = [0.2, 0.28, 0.36, 0.46], TQA = [0.24, 0.32, 0.4, 0.5], TCH = [0.4, 0.55, 0.7, 0.98];
  const TUL = [0.55, 0.6, 0.66, 0.72, 0.77, 0.84, 1.15, 1.22, 1.32, 1.45, 1.52, 1.65];
  const TFU = [0.2, 0.27, 0.34, 0.41, 0.48, 0.55, 0.68, 0.78, 0.9];
  const EL = 0x5ec8ff, EL2 = 0x9ad8ff, PHYS = 0xfff2c0, AFT = 0xc8e080;
  const ELEC = [0xffffff, 0xd0f0ff, 0x5ec8ff, 0x9ad8ff];

  /* ----------------------------------------------------------------- kit -- */
  const BA = 'Basic Attack: Turbo Volt', PH = { attr: 'physical' };
  const arcO = (r, arc, o) => Object.assign({ shape: 'arc', r, arc }, o || {});
  const last = (i, n, o) => (i === n - 1 ? o : {});
  const spec = (name, T, dur, cancel) => ({ name, anim: 'anRise', dur, cancel, reach: 2.0, range: 1.6, cd: 1.0, dr: 0.4,
    hits: T.map((t, i) => part(t, 1 / 3, SPM, arcO(2.4, 120, last(i, 3, { heavy: true, kb: 0.6 })))) });
  const exOf = (name, T, dur, cancel) => ({ name, anim: 'anRiseBig', dur, cancel, cost: 60, reach: 2.4, range: 1.8, inv: [0, cancel - 0.05],
    hits: T.map((t, i) => part(t, SEX[i], EXM, Object.assign({ shape: 'circle', at: 'front', r: 2.6 }, last(i, 6, { heavy: true, kb: 1.2 })))) });
  const K = {
    basic: [
      { name: BA, anim: 'anCut1', dur: 0.4, cancel: 0.28, reach: 1.8, range: 1.5, hits: [hit(0.14, B1[0], B1[1], B1[2], arcO(2.2, 130, PH))] },
      { name: BA, anim: 'anCut2', dur: 0.44, cancel: 0.32, reach: 1.8, range: 1.5, hits: [hit(0.16, B2[0], B2[1], B2[2], arcO(2.2, 130, PH))] },
      { name: BA, anim: 'anTriple', dur: 0.7, cancel: 0.52, reach: 1.9, range: 1.5, hits: [0.14, 0.26, 0.4].map((t, i) => part(t, [0.25, 0.25, 0.5][i], B3, arcO(2.3, 140, PH))) },
      // the 4th: two Electric cuts, then three as she spins (the last heavy)
      { name: BA, anim: 'anVolt', dur: 0.95, cancel: 0.76, reach: 1.9, range: 1.5,
        hits: T4.map((t, i) => part(t, S4[i], B4, i < 2 ? arcO(2.4, 150) : Object.assign({ shape: 'circle', at: 'self', r: 2.6 }, last(i, 5, { heavy: true, kb: 0.9 })))) },
    ],
    // after the 3rd hit, held or after a pause (resolve): instead of the 4th hit
    thunder: { name: 'Basic Attack: Thunderbolt', anim: 'anThunder', dur: 1.0, cancel: 0.82, reach: 2.2, range: 1.6, dr: 0.4,
      hits: TTB.map((t, i) => part(t, S4[i], TBM, Object.assign({ shape: 'circle', at: 'front', r: 2.3 }, last(i, 5, { heavy: true, kb: 1.0 })))) },
    dash: { name: 'Dash Attack: Taser Blast', anim: 'anSpinCut', dur: 0.55, cancel: 0.42, reach: 7, hits: [0.2, 0.3].map(t => part(t, 0.5, DAM, { attr: 'physical', shape: 'circle', at: 'self', r: 2.4 })) },
    counter: { name: 'Dodge Counter: Thunderclap', anim: 'anCounter', dur: 0.7, cancel: 0.55, inv: [0, 0.62], hits: TDC.map((t, i) => part(t, 0.25, DCM, arcO(2.6, 140, last(i, 4, { heavy: true, kb: 0.9 })))) },
    special: spec('Special Attack: Fork Lightning', TSP, 0.62, 0.48),
    // straight after the 3rd hit or after Thunderbolt (resolve): the same moves, launched faster
    specialQ: spec('Special Attack: Fork Lightning (Quick Launch)', TSPQ, 0.5, 0.38),
    ex: exOf('EX Special Attack: Lightning Bolt', TEX, 1.05, 0.9),
    exQ: exOf('EX Special Attack: Lightning Bolt (Quick Launch)', TEXQ, 0.93, 0.78),
    chain: { name: 'Chain Attack: Electro Engine', anim: 'anChain', dur: 1.3, inv: [0, 1.3],
      hits: TCH.map((t, i) => part(t, 0.25, CHM, Object.assign({ shape: 'circle', at: 'target', r: 2.6 }, last(i, 4, { heavy: true, kb: 1.2 })))) },
    // the upward slash (40% of it over six hits), then the downward strikes (60% over six)
    ult: { name: 'Ultimate: Overdrive Engine', anim: 'anUlt', dur: 2.1, inv: [0, 2.1],
      hits: TUL.map((t, i) => part(t, SUL[i], ULM, Object.assign({ shape: 'circle', at: 'target', r: i < 6 ? 3.0 : 3.4 }, last(i, 12, { heavy: true, r: 4.0, kb: 1.6 })))) },
    // Flash: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow; the official Heavy is 467.9)
    assist: { name: 'Defensive Assist: Flash', type: 'defensive', anim: 'anParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(PARRY) },
    // the spin (six hits of 1/12), then three of 1/6
    followup: { name: 'Assist Follow-Up: Lightning Whirl', anim: 'anWhirl', dur: 1.15, inv: [0, 1.1],
      hits: TFU.map((t, i) => part(t, i < 6 ? 1 / 12 : 1 / 6, FUM, i < 6 ? { shape: 'circle', at: 'self', r: 2.6 } : arcO(2.6, 140, last(i, 9, { heavy: true, kb: 1.1 })))) },
    quick: { name: 'Quick Assist: Thunderfall', anim: 'anFall', dur: 0.75, inv: [0, 0.7], hits: TQA.map((t, i) => part(t, 0.25, QAM, arcO(2.6, 140, last(i, 4, { heavy: true, kb: 0.7 })))) },
  };
  const QUICK = [K.specialQ, K.exQ];
  // the 3rd hit of her string has just played (a.combo counts the string's steps; it is still the 3rd hit's while a move
  // that follows it starts, ai.js moves it on afterwards)
  const third = (a, t) => a.combo % K.basic.length === 3 && t - a.lastBasic <= WIN;

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.anby = {
    id: 'anby', name: 'Anby Demara', short: 'Anby', faction: 'Cunning Hares', spec: 'Stun', attr: 'electric', rank: 'A',
    color: '#b4c86b', color2: '#e8e6e3', assist: 'defensive', stance: 'anby',
    blurb: 'The Cunning Hares\' first member and their strongest fighter: calm, short on common sense, sure that movies are true stories, and devoted to hamburgers and to Nicole, who found her by the old capital\'s ruins. Her electrified sword builds Daze fast: after the 3rd hit of her string she holds Basic for Thunderbolt or snaps out a Special or EX, and straight off that 3rd hit each deals 64% more Daze.',
    // Lv60 with core: HP 7,500, ATK 658, DEF 612, Impact 136, AM 94, AP 93, CRIT 5% / 50%, ER 1.2 (gachabase), on this game's scale
    stats: { hp: 8400, atk: 2220, def: 655, impact: 136, ap: 93, am: 94, cr: 0.1, cd: 0.7, er: 1.2, speed: 4.8 },
    ai: { range: 1.6, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120,
    core: [
      ['Core Passive: Fluctuating Voltage', 'Basic Attack: Thunderbolt, a Special Attack or an EX Special Attack launched straight after the 3rd hit of her Basic Attack deals 64% more Daze.'],
      ['Thunderbolt and Quick Launch', 'After the 3rd hit of Turbo Volt, hold Basic, or pause a moment and then press it, for Basic Attack: Thunderbolt: a leaping downward strike, Electric, Anti-Interrupt, instead of the 4th hit. A Special or EX Special straight after the 3rd hit or after Thunderbolt launches faster. Her first three Basic hits and the Dash Attack are Physical; the rest of her kit is Electric.'],
      ['Additional Ability: Parallel Connection', 'With another Electric Agent or a Cunning Hares member in the squad: when her Dodge Counter hits, she gains 7.2 more Energy (once every 5 s).'],
    ],
    kit: K,
    kitShow: [['Hold (after 3rd hit)', 'thunder'], ['Quick (after 3rd hit)', 'specialQ'], ['Quick EX', 'exQ']],
    rivalMoves: [{ k: 'thunder', kind: 'core', p: 0.22, cd: 5 }],
    howto: 'Anby Demara: after the 3rd hit of her string, hold Basic (or wait a moment, then press it) for Thunderbolt, or press Special for a Special or EX that launches faster; Thunderbolt, Special and EX straight off the 3rd hit deal 64% more Daze (Fluctuating Voltage). With another Electric Agent or a Cunning Hare beside her, her Dodge Counter gives Energy. Her assist is a Defensive Assist: she parries, then Basic for Lightning Whirl.',
    mech: {
      // anTB: until when a Special or EX launches faster after Thunderbolt. anPC: Parallel Connection holds; anPCcd: its 5 s
      init(a) { a.anTB = 0; a.anPC = false; a.anPCcd = 0; hookUp(); },
      squad(a, B) { a.anPC = B.squad.some(s => s !== a && (s.def.attr === a.def.attr || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B, bot = !A.data.manual && !!a.queue;
        // Fluctuating Voltage: Thunderbolt, or a Special / EX launched straight off the 3rd hit
        if (def === K.thunder || (QUICK.includes(def) && third(a, B.t))) A.data.anFV = true;
        a.anTB = def === K.thunder ? B.t + A.dur + WIN : 0;
        // AUTO (yours are your own presses): what follows the 3rd hit. The EX straight off it while the target is still
        // standing (Daze), Thunderbolt more often on a Stun (damage), now and then the quick Special, or just the 4th hit
        if (def === K.basic[2] && bot && !a.queue.length) {
          const tgt = A.tgt && A.tgt.alive ? A.tgt : null, stun = !!(tgt && tgt.stun > 0), r = Math.random();
          let q = null;
          if (a.energy >= K.exQ.cost && (a.energy >= 100 || (!stun && r < 0.65))) q = { def: K.exQ, kind: 'ex', delay: 0.02 };
          else if (r < (stun ? 0.7 : 0.4)) q = { def: K.thunder, kind: 'basic', step: 3, delay: 0.14 };
          else if (r < 0.62 && ((a.cds && a.cds.special) || 0) <= B.t) q = { def: K.specialQ, kind: 'special', delay: 0.02 };
          if (q) a.queue.push(Object.assign(q, { tgt }));
        }
        // ...and after Thunderbolt, sometimes the quick EX
        if (def === K.thunder && bot && !a.queue.length && a.energy >= K.exQ.cost && Math.random() < 0.35) a.queue.push({ def: K.exQ, kind: 'ex', delay: 0.05, tgt: A.tgt && A.tgt.alive ? A.tgt : null });
      },
      hit(a, v, h, A) {
        const B = BT.B;
        // Fluctuating Voltage: the extra Daze of every hit of the move
        if (A && A.data && A.data.anFV && v.alive) BT.addDaze(a, v, a.st.impact * (h.daze || 0) / 100 * FV);
        // Parallel Connection: Energy when her Dodge Counter hits (a flat amount, as the official text gives it)
        if (A && A.kind === 'counter' && a.anPC && a.anPCcd <= B.t) { a.anPCcd = B.t + PC_CD; BT.gainEnergy(a, PC_EN, true); }
      },
      // Basic after the 3rd hit: held, or pressed after a pause, Thunderbolt (tapped at once, the 4th hit as usual).
      // Special after the 3rd hit or after Thunderbolt: the Quick Launch Special, or with the Energy the Quick Launch EX
      resolve(a, btn, hold, c) {
        const step = c.step != null ? c.step : c.t - a.lastBasic > WIN ? 0 : a.combo, after3 = step % K.basic.length === 3;
        if (btn === 'special') {
          if (!after3 && !(a.anTB > c.t)) return null;
          return a.energy >= K.exQ.cost ? { def: K.exQ, kind: 'ex' } : { def: K.specialQ, kind: 'special' };
        }
        if (btn !== 'basic' || c.dash) return null;
        if (after3 && (hold || c.t - a.lastBasic > PAUSE)) return { def: K.thunder, kind: 'basic', step };
        return null;
      },
      // AUTO: her choices after the 3rd hit are queued in start; if the 3rd hit ended with nothing queued, Thunderbolt
      ai(a, tgt, B) {
        if (third(a, B.t) && !a.queue.length && Math.random() < 0.6) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const r = [];
        if (third(a, B.t)) r.push('3RD HIT · HOLD BASIC: THUNDERBOLT · SPECIAL/EX: QUICK · +64% DAZE');
        else if (a.anTB > B.t) r.push('THUNDERBOLT · SPECIAL/EX: QUICK LAUNCH');
        if (a.anPC) r.push(a.anPCcd > B.t ? `PARALLEL CONNECTION ${Math.ceil(a.anPCcd - B.t)}s` : 'PARALLEL CONNECTION READY');
        return r;
      },
    },
    town: {
      // Sixth Street: every one of her trust events is there (the Random Play counter and its doorstep, the 141's limited
      // burgers and its poster, Howl's newsstand, Waterfall Soup, Coff Cafe and Mr. Panda, Box Galaxy with Nicole, the bike
      // parking by the 404 at noon), and Godfinger is her Quality Time arcade. (Her Lumina Square wish events are outings.)
      home: 'sixth',
      // mornings returning tapes at Random Play, the 141, the paper, a Tin Master Special; afternoons the 404's bike parking
      // (cinema or home?), the 141's freezer (wasabi ice cream), noodles, Box Galaxy's surprise boxes, Godfinger; evenings
      // Godfinger and the video store; late nights at Random Play's window and a bench, replaying a movie in her head
      routine: ['rp:door 30, 141:stall 20, news:read 15, cafe:t 15, huddle 20', '404:door 15, 141:icecream 15, soup:stool 20, box:claw 15, gf:cab 15, huddle 20', 'gf:cab 30, rp:window 25, soup:stool 15, huddle 30', 'rp:night 55, box:bench 25, metro:wait 20'],
      chatter: ['Replaying last night\'s movie in my head. Almost at the credits.', 'Two movies for the price of one ticket. Nicole\'s idea.'],
      lines: [
        'Anby, of the Cunning Hares. If it has to do with a Hollow, we handle it. ...Nicole says I should also mention our reasonable rates.',
        'Burgers have protein, carbs and greens, they taste good, and they\'re affordable. Nothing in New Eridu comes close. Not even General Chop\'s noodles.',
        'Mr. Panda sits outside Coff Cafe every day, with a full table in front of him. Sometimes I buy him a coffee too. ...Before Nicole, I was alone for a long time. I got used to it.',
      ],
      chapters: [
        { title: 'The Heartbeat', ask: ['Proxy. Does Random Play have "The Heartbeat"? A mother goes into a Hollow to find her child. I saw it in a cinema, a long time ago.', 'I want to watch it again, and a tape means I can. Could you look for it? I\'ll come by the store.'],
          steps: [{ t: 'talk', to: 'sib', reply: '"The Heartbeat"? Bottom shelf, with the dramas. Anby borrows a lot of tapes... and always brings them back fast. Here.' }, { t: 'talk', to: 'anby' }],
          scene: [['A', 'You found it. Thank you.'], ['P', 'Want to watch it together?'], ['A', 'Together...? If you don\'t mind. Sure.'], ['A', '...The end, when the mother finds her child in the Hollow and they hold each other. It gets me every time.'], ['P', 'Was that a sob I heard?'], ['A', 'No. The tape is old. ...Let\'s watch another one next time.']] },
        { title: 'Surprise boxes', ask: ['Nicole has a new side hustle for the Cunning Hares: surprise boxes from Box Galaxy, resold when we draw a special edition.', 'We haven\'t drawn one yet. People say fortune favours fools... Could you get Billy to open the last box? Susie is keeping it for us.'],
          steps: [{ t: 'talk', to: 'susie', reply: 'The Cunning Hares\' boxes? Nicole bought half a shelf. Here, the last one. Good luck!' },
            { t: 'talk', to: 'billy', reply: 'Me? Open it? Why do I get the feeling that\'s an insult... Fine, fine. ...Whoa! A special edition! Nicole\'s gonna flip!' },
            { t: 'talk', to: 'nicole', reply: 'A special edition?! Hehe~ I told you this side hustle was a sure thing! ...Wait. Why did Billy get it and not me?' }, { t: 'talk', to: 'anby' }],
          scene: [['A', 'The special edition. Billy drew it on the first try.'], ['P', 'Nicole says it was her plan all along.'], ['A', 'Mhm. "Confidence is the first step toward success." They say it in a movie. So I believe in Nicole.'], ['A', '...I only brought half the money she gave me. Just in case. It keeps our books balanced this month. Don\'t tell her.']] },
        { title: 'The after-party', ask: ['A commission for the Cunning Hares: an Elite in a Hollow. Nicole says to start planning the after-party now.', 'Snacks for a successful commission are a Cunning Hares tradition. Bring Nicole some Ol\' Captain Jerky from the 141, then put me at the front, with the kitty cat. Nekomata.'],
          steps: [{ t: 'buy', item: 'jerky' }, { t: 'bring', item: 'jerky', to: 'nicole', reply: 'Ol\' Captain Jerky! See? Following me is the best strategy! Now go get that Elite. I\'ll take care of the party planning~' },
            { t: 'clear', f: { enc: 'elite', lead: 'anby', with: 'nekomata' } }, { t: 'talk', to: 'anby' }],
          scene: [['A', 'Target neutralised. The kitty cat ran ahead again. I told her to be careful.'], ['P', 'You two work well together.'], ['A', 'Nicole makes the plans, Billy needs repairs afterwards, and the kitty cat does whatever she likes. I handle the fighting.'], ['A', 'And you, Proxy. When you\'re with us in a Hollow, everyone feels at ease. ...The after-party is at the office. Nicole says the jerky is yours to share.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, in-game and city models: a short silver-white
     bob, choppy bangs, faint blue-grey tips, a thin braid in front of her
     right ear tied with black bands; orange-red eyes; dark headphones over her
     crown with dull gold rings; a black choker. A cropped hooded jacket, lime
     green over black: a lime chest piece with five black dots like a die's
     five, a black tab with a white lightning-bolt patch below it, the lime
     hood bunched at her nape with red-orange toggles, lime shoulder puffs with
     round black speaker discs in grey rims, bulky black sleeves and cuffs,
     black fingerless gloves. A white crop top over a bare midriff. A black
     pleated mini skirt, a black belt with a grey clip buckle, an orange-red
     strap at her left front. Black thigh-high stockings: her left with an
     orange-red band at the top and a grey print down its outer side, her
     right thigh with a black buckle strap. Chunky lime-and-black high-tops,
     white soles, a red pull tab. In battle only (the city model carries
     none): her sword, a long straight single-edged blade with a notch near
     the tip, a dark grip with a triangle-logo pommel and the red Demara
     Battery at the guard; its black scabbard, a glowing lime zigzag and a
     gold triangular cap, worn across the back of her hips. 156 cm. */
  const DRAW = {};
  {
    const HAIR = 0xe8e6e3, HAIR2 = 0xcfd3d4, HAIRHI = 0xf8f8f5, TIP = 0x8fa3aa, TIE = 0x1c1c1a;
    const SKIN = 0xf8e3d6, NAVEL = 0xe9cbb8, EYE = 0xdb6a45, LASH = 0x3a2a26, MOUTH = 0xd08a80;
    const HP = 0x4b5145, HPBAND = 0x34372f, HPGOLD = 0xb39d5c, CHOKER = 0x23231f;
    const LIME = 0xb4c86b, LIME2 = 0x8c9c55, DOT = 0x1e1e1b, TAG = 0xf6f2ec, TAB = 0xc04a24;
    const BLACK = 0x23231f, BLACK2 = 0x3b3b39, DISC = 0x1e1f1c, RIM = 0xa9abaa, BUCKLE = 0x9a9c9a, GLOVE = 0x262624, WHITE = 0xf3ece4;
    const SKIRT = 0x343534, SKIRT2 = 0x1f1f1f, BELT = 0x2b2b2b, STRAP = 0xd87450;
    const STOCK = 0x1e1d1d, STOCK2 = 0x2c2b2b, PAT = 0x8c8c8a, STRIPE = 0xc4553c, TSTRAP = 0x111110;
    const SHOE = 0xbbcd7b, SHOEB = 0x171812, SOLE = 0xe1e2e0, SHOER = 0xc0392b;
    const STEEL = 0xb5b3b2, STEEL2 = 0x7f7f7e, EDGE = 0xe6e6e4, GRIP = 0x4f4e4d, GRIP2 = 0x2a2a29, LOGO = 0x8a8a88;
    const BATT = 0xc8402e, BATT2 = 0x8a2a20, BOLTW = 0xf4f0ea, SAYA = 0x262b28, SAYA2 = 0x1a1d1b, NEON = G(0xc0e24e), GOLD = 0xc2a65a;
    const arm = s => g => {   // s: +1 her left, -1 her right
      H.arm(g, { sleeve: BLACK, sleeveTo: 7, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
      g.box(-1, 0, -1, 1, -2, 1, LIME); g.box(2 * s, -2, -1, 2 * s, 0, 1, LIME2);        // the lime shoulder puff, bulging out
      g.set(3 * s, -1, 0, DISC);                                                         // the round speaker disc...
      for (const [y, z] of [[0, 0], [-2, 0], [-1, -1], [-1, 1]]) g.set(3 * s, y, z, RIM); // ...in its grey rim
      g.box(-1, -6, -2, 1, -5, 2, BLACK); g.box(2 * s, -6, -1, 2 * s, -5, 1, BLACK2);    // the bulky black cuff
      g.set(2 * s, -5, 0, BUCKLE);                                                       // its buckle
      g.set(0, -7, 2, SKIN);                                                             // fingerless: the fingertips
    };
    const leg = s => g => {
      H.leg(g, { pant: STOCK, boot: SHOE, bootH: 3, sole: SOLE });
      g.box(-1, 0, -1, 1, -3, 1, SKIN);                                                  // the bare thigh below the skirt
      if (s > 0) {                                                                       // her left: the orange-red band at the top...
        g.box(-1, -4, -1, 1, -4, 1, STRIPE);
        for (const [y, z] of [[-5, 0], [-6, 1], [-6, -1]]) g.set(1, y, z, PAT);          // ...and the grey print down its outer side
      } else {                                                                           // her right: a black buckle strap round the thigh
        g.box(-1, -3, -1, 1, -3, 1, TSTRAP); g.set(0, -3, 1, BUCKLE);                    // (two in the art: one voxel row here)
        g.box(-1, -4, -1, 1, -4, 1, STOCK2);                                            // the stocking's top
      }
      g.box(-1, -7, -1, 1, -7, 1, SHOEB); g.set(0, -8, 2, SHOEB);                        // the high-tops: a black collar, the strap over the toe
      g.set(s, -8, -1, SHOEB);                                                           // a black panel at the heel
      g.set(0, -6, -2, SHOER);                                                           // the red pull tab
    };
    MODELS.anby = H.humanoid({
      scale: 0.0675, height: 28, width: 20,
      sockets: { weapon: ['blade', [0, 0, 15]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, SKIRT);                                               // under the skirt
        g.box(-4, -3, -3, 4, -1, 2, (x, y, z) => ((x + z) & 1 ? SKIRT2 : SKIRT));        // the pleated mini skirt
        g.box(-3, 0, -2, 3, 0, 1, BELT); g.box(-3, 0, 2, 3, 0, 2, BELT);                 // the black belt...
        g.box(-1, 0, 3, 0, 0, 3, BUCKLE);                                                // ...its grey clip buckle
        g.set(2, 0, 3, STRAP); g.set(2, -1, 3, STRAP); g.set(3, -2, 3, STRAP);           // the orange-red strap at her left front
        g.box(4, -1, 0, 4, -3, 0, BELT);                                                 // a black strap down her left side
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, SKIN); g.set(0, 0, 1, NAVEL);                          // the bare midriff
        g.box(-3, 3, -2, 3, 3, 1, WHITE); g.set(-1, 3, 2, WHITE); g.set(1, 3, 2, WHITE); // the white crop top showing below the jacket
        g.box(-3, 4, -2, 3, 6, 1, BLACK); g.box(-3, 4, -3, 3, 5, -3, BLACK);             // the black cropped jacket
        g.box(-2, 4, 2, 2, 6, 2, (x, y) => (Math.abs(x) <= 1 && ((x + y) & 1) ? DOT : LIME));   // the lime chest piece, five dots like a die
        g.set(0, 3, 2, BLACK); g.set(0, 2, 2, TAG);                                      // the black tab, the white lightning-bolt patch
        g.box(-3, 6, -2, -2, 6, 1, LIME); g.box(2, 6, -2, 3, 6, 1, LIME);                // the lime over her shoulders
        g.box(-1, 6, -1, 1, 6, 1, CHOKER);                                               // the black choker
        g.box(-3, 6, -3, 3, 7, -3, LIME); g.box(-2, 8, -3, 2, 8, -3, LIME2);             // the lime hood bunched at her nape
        g.set(-3, 7, -2, TAB); g.set(3, 7, -2, TAB);                                     // its red-orange toggles
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 1], [-3, 2], [-2, 4], [-1, 4], [0, 3], [1, 4], [2, 4], [3, 2], [4, 1]], sideTo: 3 });   // choppy bangs
        for (const s of [-1, 1]) {                                                       // the bob, to the jaw, its tips blue-grey
          g.box(s * 5, -1, -3, s * 5, 4, 2, (x, y) => (y === -1 ? TIP : y === 0 ? HAIR2 : HAIR));
          g.box(s * 4, -1, -3, s * 4, 0, 1, (x, y) => (y === -1 ? TIP : HAIR2));
        }
        g.box(-4, 1, -5, 4, 5, -5, HAIR); g.box(-4, -1, -5, 4, 0, -4, (x, y) => (y === -1 ? TIP : HAIR2));   // round at the back
        for (const [x, y, z] of [[-2, 7, 2], [1, 7, 1], [3, 7, -1], [-1, 6, -5]]) g.set(x, y, z, HAIRHI);     // the shine
        for (let y = 2; y >= -3; y--) g.set(-5, y, 3, y === 1 || y === -2 ? TIE : (y & 1) ? HAIR : HAIR2);    // the braid at her right ear, its black ties
        // the headphones: the band over her crown, the cups over her ears, their gold rings
        for (let x = -3; x <= 3; x++) g.set(x, 8, 0, HPBAND);
        for (const s of [-1, 1]) {
          g.set(s * 4, 8, 0, HPBAND); for (let y = 4; y <= 7; y++) g.set(s * 5, y, 0, HPBAND);
          g.box(s * 5, 1, -1, s * 5, 3, 1, HP);
          g.box(s * 6, 1, -1, s * 6, 3, 1, HPGOLD); g.set(s * 6, 2, 0, HP);
        }
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(1),
      legR: leg(-1),
      extra: {
        // the sword in her right hand and its scabbard behind her hips: empty here, filled in battle (hookLook, below).
        // Tilted so that, in her ready stance, the blade points forward and a little down
        blade: { parent: 'armR', at: [0, -7, 1], rot: [1.1, 0, 0] },
        saya: { parent: 'hips', at: [0, -1, -4], rot: [0, 0, -0.1] },
      },
    });
    // the sword along +Z from the grip in her hand
    DRAW.blade = g => {
      for (let z = -2; z <= 1; z++) g.set(0, 0, z, (z & 1) ? GRIP2 : GRIP);              // the dark grip, wrapped
      g.box(0, -1, -3, 0, 1, -3, GRIP2); g.set(0, 0, -4, LOGO);                          // the pommel, its triangle logo
      g.box(0, -1, 2, 0, 1, 2, GRIP2);                                                   // the black collar of the guard
      g.box(-1, -3, 1, 0, -2, 2, BATT); g.set(0, -2, 2, BOLTW); g.box(-1, -4, 1, 0, -4, 2, BATT2);   // the red Demara Battery, a white bolt
      for (let z = 3; z <= 16; z++) {                                                    // the long straight blade
        if (z <= 12) g.set(0, 1, z, STEEL2);                                             // the spine (it narrows toward the tip)
        if (z <= 15) g.set(0, 0, z, STEEL);
        if (z !== 13 && z <= 14) g.set(0, -1, z, EDGE);                                  // the bright edge, a notch near the tip
      }
      g.set(0, 0, 16, EDGE); g.set(0, 0, 4, LOGO); g.set(0, 0, 5, GRIP2);                // the clipped point; the lettering by the base
    };
    // the scabbard across the back of her hips: the mouth at her right hip, the gold-capped end past her left side
    DRAW.saya = g => {
      g.box(-6, -1, -1, 11, 0, 0, SAYA); g.box(-7, -1, -1, -7, 0, 0, SAYA2);
      for (let x = -4; x <= 10; x++) { const y = ((x + 8) % 4) < 2 ? 0 : -1; g.set(x, y, 0, NEON); g.set(x, y, -1, NEON); }   // the glowing lime zigzag
      g.box(12, -1, -1, 12, 0, 0, GOLD); g.set(13, 0, -1, GOLD); g.set(13, 0, 0, GOLD);   // the gold triangular cap
    };
  }

  /* --------------------------------------------------------------- poses --
     Her stance: the sword low in her right hand, the blade forward and a
     little down, her left hand loose. The poses below are the angles she
     reaches (rel() turns them into the change from her stance); keys() plays
     a move as keyframes, from her stance and back to it. */
  ANIM.READY.anby = { armR: [-0.55, 0.15, -0.2], armL: [-0.35, 0, 0.25], torso: [0.08, 0.2, 0], head: [0, -0.15, 0], legL: [-0.28, 0, 0.08], legR: [0.22, 0, -0.08], hipsY: -0.04 };
  const R0 = ANIM.READY.anby;
  const rel = o => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].map((v, i) => v - R0[k][i]) : k === 'hipsY' ? o[k] - R0.hipsY : o[k]; return r; };
  const plus = (...ps) => { const r = {}; for (const p of ps) for (const k in p) { const v = p[k]; r[k] = Array.isArray(v) ? (r[k] ? r[k].map((x, i) => x + v[i]) : v.slice()) : (r[k] || 0) + v; } return r; };
  const WINDR = rel({ armR: [-2.3, 0.5, -0.9], armL: [-0.45, 0, 0.45], torso: [0.02, 0.65, 0], head: [0, -0.45, 0], hipsY: -0.07, legL: [-0.5, 0, 0.1], legR: [0.35, 0, -0.1] });   // drawn back over her right shoulder
  const CUTL = rel({ armR: [-1.0, -0.6, 0.75], armL: [-0.3, 0, 0.55], torso: [0.18, -0.6, 0], head: [0, 0.45, 0], hipsY: -0.11, legL: [-0.75, 0, 0.1], legR: [0.5, 0, -0.1] });   // cut down across to her left
  const CUTR = rel({ armR: [-1.45, 0.4, -1.3], armL: [-0.45, 0, 0.5], torso: [0.1, 0.65, 0], head: [0, -0.45, 0], hipsY: -0.09, legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] });   // the backhand, out to her right
  const LOWR = rel({ armR: [0.35, 0.2, -0.45], armL: [-0.65, 0, 0.45], torso: [0.32, 0.45, 0], head: [-0.15, -0.35, 0], hipsY: -0.17, legL: [-0.95, 0, 0.12], legR: [0.65, 0, -0.1] });   // crouched, the blade low behind her
  const UP = rel({ armR: [-2.95, -0.2, -0.25], armL: [-0.55, 0, 0.65], torso: [-0.22, -0.3, 0], head: [-0.3, 0.2, 0], hipsY: -0.02, legL: [-0.35, 0, 0.1], legR: [0.25, 0, -0.1], lift: 0.12 });   // the rising slash, the blade high
  const UP2 = plus(UP, { lift: 0.2 });
  const OVER = rel({ armR: [-3.0, 0, -0.15], armL: [-2.6, 0, 0.3], torso: [-0.28, 0, 0], head: [-0.2, 0, 0], hipsY: -0.04, legL: [-0.3, 0, 0.08], legR: [0.25, 0, -0.08] });   // raised overhead in both hands
  const DOWN = rel({ armR: [-0.55, 0, 0.12], armL: [-0.8, 0, 0.2], torso: [0.58, 0, 0], head: [0.2, 0, 0], hipsY: -0.22, legL: [-1.05, 0, 0.1], legR: [0.8, 0, -0.1] });   // struck down, low
  const WIDE = rel({ armR: [-1.5, 0, -1.35], armL: [-0.5, 0, 1.0], torso: [0.05, 0, 0], head: [0, 0, 0], hipsY: -0.1, legL: [-0.4, 0, 0.15], legR: [0.3, 0, -0.15] });   // the arm out, to spin
  const RUSH = rel({ armR: [0.45, 0, -0.5], armL: [0.35, 0, 0.4], torso: [0.6, -0.3, 0], head: [-0.4, 0.3, 0], hipsY: -0.2, legL: [-1.2, 0, 0], legR: [0.9, 0, 0] });   // low and fast, the blade trailing
  const GUARD = rel({ armR: [-1.55, 0.65, 0.6], armL: [-1.25, -0.3, -0.3], torso: [0.12, -0.3, 0], head: [0, 0.2, 0], hipsY: -0.1, legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1] });   // the blade across, meeting the blow
  const TUCK = { legL: [-1.3, 0, 0.1], legR: [-1.0, 0, -0.1] };                         // knees up, in the air
  const OVERT = plus(OVER, TUCK);
  // keyframes [[t, pose]]: eased from one to the next, from her stance before the first; the last is held
  function keys(b, t, K) {
    if (t <= K[0][0]) return mix(b, add(b, K[0][1]), U.easeOut(clamp(t / Math.max(0.01, K[0][0]), 0, 1)));
    for (let i = 1; i < K.length; i++) if (t <= K[i][0]) return mix(add(b, K[i - 1][1]), add(b, K[i][1]), U.ease(clamp((t - K[i - 1][0]) / Math.max(0.01, K[i][0] - K[i - 1][0]), 0, 1)));
    return add(b, K[K.length - 1][1]);
  }
  const turn = (t, t0, t1, n) => ({ spin: clamp((t - t0) / (t1 - t0), 0, 1) * PI * 2 * (n || 1) });   // whole turns between t0 and t1
  // Turbo Volt: a diagonal cut, the backhand, three quick cuts ending low, then two Electric cuts and a spin
  ACT.anCut1 = (b, t, th, d) => keys(b, t, [[th * 0.75, WINDR], [th + 0.03, CUTL], [th + 0.14, CUTL], [d, {}]]);
  ACT.anCut2 = (b, t, th, d) => keys(b, t, [[th * 0.75, CUTL], [th + 0.03, CUTR], [th + 0.14, CUTR], [d, {}]]);
  ACT.anTriple = (b, t, th, d) => keys(b, t, [[0.1, WINDR], [0.16, CUTL], [0.22, CUTL], [0.28, CUTR], [0.34, OVER], [0.42, DOWN], [0.55, DOWN], [d, {}]]);
  ACT.anVolt = (b, t, th, d) => add(keys(b, t, [[0.1, WINDR], [0.16, CUTL], [0.25, CUTR], [0.32, WIDE], [0.58, WIDE], [0.66, CUTL], [0.76, CUTL], [d, {}]]), turn(t, 0.3, 0.58));
  // Thunderbolt: up, the blade overhead, knees tucked, and down onto the target
  ACT.anThunder = (b, t, th, d) => keys(b, t, [[th - 0.08, OVERT], [th + 0.04, DOWN], [0.74, DOWN], [d, {}]]);
  // Fork Lightning: crouched, then the rising slash. Lightning Bolt: the same, twice, the second off the ground
  ACT.anRise = (b, t, th, d) => keys(b, t, [[th - 0.05, LOWR], [th + 0.05, UP], [th + 0.24, UP], [d, {}]]);
  ACT.anRiseBig = (b, t, th, d) => keys(b, t, [[th - 0.05, LOWR], [th + 0.05, UP], [th + 0.17, CUTL], [th + 0.24, LOWR], [th + 0.32, UP2], [th + 0.55, UP2], [d, {}]]);
  // Taser Blast: in low, then a turn with the blade out
  ACT.anSpinCut = (b, t, th, d) => add(keys(b, t, [[th - 0.06, RUSH], [th, WIDE], [th + 0.2, WIDE], [d, {}]]), turn(t, th - 0.04, th + 0.14));
  // Thunderclap: three cuts and a rising one
  ACT.anCounter = (b, t, th, d) => keys(b, t, [[th - 0.05, WINDR], [th + 0.02, CUTL], [th + 0.09, CUTR], [th + 0.16, CUTL], [th + 0.2, LOWR], [th + 0.28, UP], [th + 0.4, UP], [d, {}]]);
  // Thunderfall: down from above onto the target, then cuts and a rising one
  ACT.anFall = (b, t, th, d) => keys(b, t, [[th - 0.06, OVERT], [th + 0.02, DOWN], [th + 0.09, CUTR], [th + 0.16, CUTL], [th + 0.2, LOWR], [th + 0.28, UP], [th + 0.36, UP], [d, {}]]);
  // Lightning Whirl: two turns with the blade out, then up, across, and down
  ACT.anWhirl = (b, t, th, d) => add(keys(b, t, [[0.16, WIDE], [0.58, WIDE], [0.63, LOWR], [0.7, UP], [0.79, CUTL], [0.84, OVERT], [0.92, DOWN], [1.0, DOWN], [d, {}]]), turn(t, 0.18, 0.58, 2));
  // Electro Engine: rising, cutting, then the big rising slash off the ground
  ACT.anChain = (b, t, th, d) => keys(b, t, [[0.32, LOWR], [0.42, UP], [0.5, CUTL], [0.57, CUTR], [0.66, CUTL], [0.74, LOWR], [0.9, LOWR], [1.0, UP2], [1.12, UP2], [d, {}]]);
  // Overdrive Engine: the rising slash in a storm of cuts, then up, and strike after strike down
  ACT.anUlt = (b, t, th, d) => keys(b, t, [[0.45, LOWR], [0.57, UP], [0.62, CUTL], [0.68, UP], [0.74, CUTR], [0.86, UP2], [1.05, OVERT], [1.16, DOWN], [1.2, OVER], [1.24, DOWN], [1.28, OVER], [1.33, DOWN],
    [1.4, OVER], [1.46, DOWN], [1.5, OVER], [1.53, DOWN], [1.58, OVERT], [1.67, DOWN], [1.85, DOWN], [d, {}]]);
  // Flash: the blade across
  ACT.anParry = b => add(b, GUARD);

  /* ------------------------------------------------------------- effects --
     anCut: a slash of the blade (pale gold for her Physical hits, crackling
     blue-white for the Electric ones; ring: a full turn). anUp: the rising
     slash, lightning climbing from the ground (big: more, and a column of
     light). anDown: the downward strike, a bolt onto the target. anZap: a
     crackle from the blade to the target. anCharge, anStorm: the Ultimate's
     gathering and its last strike's storm of bolts. */
  const _v = new THREE.Vector3();
  const tip = a => { BT.sock(a, 'weapon', _v); if (_v.y < 0.3) _v.y = 1.0; return _v; };
  const aim = (a, A, tgt, d) => ({ x: tgt ? tgt.x : a.x + Math.sin(A.dir) * (d || 1.6), z: tgt ? tgt.z : a.z + Math.cos(A.dir) * (d || 1.6) });
  CHOREO.events.anCut = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), col = e.phys ? PHYS : EL, y = (e.y || 1.0) + (a.airY || 0);
    const r = (e.ring ? 2.7 : 2.3) * (e.small ? 0.85 : 1), arc = e.ring ? 5.8 : 2.6, tilt = e.ring ? 0.08 : (e.tilt || 0), sweep = e.ring ? 1.4 : (e.sweep || 1.0);
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, col, { tilt, arc, width: e.big ? 0.55 : 0.4, life: 0.26, sweep });
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r * 0.86, dir, 0xffffff, { tilt, arc: arc * 0.92, width: 0.14, life: 0.2, sweep });
    if (!e.phys) { const p = tip(a); FX.burst(p.x, p.y, p.z, e.big ? 16 : 7, { col: ELEC, speed: 4, size: 0.08, life: 0.25 }); }
    if (e.big) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.12);
  };
  CHOREO.events.anUp = (a, A, e, tgt) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), r = e.big ? 2.8 : 2.4, y = 1.0 + (a.airY || 0), P = aim(a, A, tgt);
    FX.slash(a.x + fx * 0.6, y, a.z + fz * 0.6, r, dir, EL, { tilt: 1.45, arc: 2.6, width: e.big ? 0.6 : 0.42, life: 0.3, sweep: -1.3 });
    FX.slash(a.x + fx * 0.6, y, a.z + fz * 0.6, r * 0.85, dir, 0xffffff, { tilt: 1.45, arc: 2.3, width: 0.16, life: 0.24, sweep: -1.3 });
    for (let i = 0; i < (e.big ? 3 : 1); i++) FX.beam(new THREE.Vector3(P.x + rnd(-0.3, 0.3), 0.1, P.z + rnd(-0.3, 0.3)), new THREE.Vector3(P.x + rnd(-0.4, 0.4), e.big ? 4.5 : 3, P.z + rnd(-0.4, 0.4)), U.pick([EL, EL2, 0xffffff]), e.big ? 0.16 : 0.1, 0.22);
    FX.burst(P.x, 1.0, P.z, e.big ? 30 : 14, { col: ELEC, speed: 6, size: 0.09, life: 0.35, g: -1, up: 2 });
    if (e.big) { FX.glow(P.x, 1.4, P.z, 2.6, EL, 0.3, { size1: 4 }); FX.pillar(P.x, P.z, 0.35, 6, EL, 0.3); BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.22); SFX.play('boom'); }
  };
  CHOREO.events.anDown = (a, A, e, tgt) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), P = aim(a, A, tgt), r = e.big ? 2.8 : 2.2;
    FX.slash(a.x + fx * 0.6, 1.1 + (a.airY || 0), a.z + fz * 0.6, 2.4, dir, EL, { tilt: 1.45, arc: 2.4, width: 0.5, life: 0.28, sweep: 1.3 });
    FX.named('bolt', { x: P.x, z: P.z, r }); FX.ring(P.x, P.z, 0.3, r * 1.1, EL2, 0.35);
    if (e.big) { FX.ring(P.x, P.z, 0.3, r * 0.6, 0xffffff, 0.3); FX.named('quake', { x: P.x, z: P.z, r }); SFX.play('boom'); }
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.3 : 0.14);
  };
  CHOREO.events.anZap = (a, A, e, tgt) => {
    const p = tip(a).clone(), P = aim(a, A, tgt, 1.8), y = tgt ? (tgt.height || 1.6) * 0.55 : 1.0;
    const m = new THREE.Vector3((p.x + P.x) / 2 + rnd(-0.3, 0.3), (p.y + y) / 2 + rnd(-0.2, 0.3), (p.z + P.z) / 2 + rnd(-0.3, 0.3));
    FX.beam(p, m.clone(), EL2, 0.07, 0.12); FX.beam(m, new THREE.Vector3(P.x, y, P.z), 0xffffff, 0.06, 0.12);
    FX.burst(P.x, y, P.z, 10, { col: ELEC, speed: 4, size: 0.08, life: 0.25 });
  };
  CHOREO.events.anCharge = a => {
    const p = tip(a); FX.glow(p.x, p.y, p.z, 1.6, EL, 0.4, { size1: 2.6 });
    FX.burst(a.x, 1.0, a.z, 24, { col: ELEC, speed: 5, size: 0.08, life: 0.4, g: -1 }); FX.ring(a.x, a.z, 0.4, 2.4, EL2, 0.4);
  };
  CHOREO.events.anStorm = (a, A, e, tgt) => {
    const P = aim(a, A, tgt, 2), r = e.r || 4;
    FX.named('bolt', { x: P.x, z: P.z, r: 3.4 });
    for (let i = 0; i < 5; i++) { const an = i / 5 * PI * 2 + rnd(-0.3, 0.3), d = r * rnd(0.45, 0.8); FX.named('bolt', { x: P.x + Math.cos(an) * d, z: P.z + Math.sin(an) * d, r: 1.4 }); }
    FX.ring(P.x, P.z, 0.5, r * 1.3, EL, 0.5); FX.glow(P.x, 1, P.z, r, EL, 0.35, { size1: r * 1.8 });
    FX.burst(P.x, 0.8, P.z, 60, { col: ELEC, speed: 9, size: 0.12, life: 0.6, g: 1, up: 2 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.45); SFX.play('boom');
  };

  /* ---------------------------------------------- the sword, drawn in battle --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Anby) her rig's empty blade and scabbard parts get the sword, once: in
     battle she has it; in town (the city model) she carries none. */
  const PROTO = {};
  const proto = k => PROTO[k] || (PROTO[k] = (() => { const g = new VX.Grid(); DRAW[k](g); return VX.object(g, MODELS.anby.scale, { cast: false }); })());
  function armSword(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.blade || P.blade.userData.armed) return;
    P.blade.add(proto('blade').clone()); if (P.saya) P.saya.add(proto('saya').clone());
    P.blade.userData.armed = true;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded, or at her first battle)
  let hooked = false;
  function hookUp() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'anby') armSword(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'anby') armSword(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookUp); else hookUp();

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const cut = (t, o) => Object.assign({ t, fx: 'anCut' }, o || {});
  const up = (t, o) => Object.assign({ t, fx: 'anUp' }, o || {});
  const down = (t, o) => Object.assign({ t, fx: 'anDown' }, o || {});
  const zap = t => ({ t, fx: 'anZap' });
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.13, kind: 'fwd', d: 0.45 }], events: [cut(0.14, { phys: true, tilt: -0.6, sweep: -1.0 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.4 }], events: [cut(0.16, { phys: true, tilt: 0.5, sweep: 1.0 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.36, kind: 'fwd', d: 0.6, ease: 'lin' }], events: [cut(0.14, { phys: true, tilt: -0.6, sweep: -1.0 }), cut(0.26, { phys: true, tilt: 0.5, sweep: 1.0 }), cut(0.4, { phys: true, tilt: 1.35, sweep: 1.2, big: true }), { t: 0.4, fx: 'dust' }] });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.3, kind: 'fwd', d: 0.8 }], stream: [{ t0: 0.3, t1: 0.58, kind: 'spark' }],
    events: [cut(0.14, { tilt: -0.6, sweep: -1.0 }), cut(0.24, { tilt: 0.5, sweep: 1.0 }), cut(0.38, { ring: true }), cut(0.46, { ring: true }), cut(0.56, { ring: true, big: true }), { t: 0.56, fx: 'boltAt' }] });
  set(K.thunder, { motion: [{ t0: 0.04, t1: 0.4, kind: 'leap', h: 1.3, toTarget: true }], stream: [{ t0: 0.06, t1: 0.36, kind: 'spark' }],
    events: [down(0.36), { t: 0.42, fx: 'boltAt' }, zap(0.48), { t: 0.56, fx: 'boltAt' }, down(0.66, { big: true }), { t: 0.66, fx: 'whiteFlash' }] });
  for (const d of [K.special, K.specialQ]) {
    const T = d.hits.map(h => h.t);
    set(d, { motion: [{ t0: 0.02, t1: Math.max(0.06, T[0] - 0.02), kind: 'fwd', d: 0.45 }], stream: [{ t0: 0, t1: T[0], kind: 'spark' }], events: [up(T[0]), zap(T[1]), zap(T[2]), { t: T[2], fx: 'boltAt' }] });
  }
  for (const d of [K.ex, K.exQ]) {
    const T = d.hits.map(h => h.t);
    set(d, { motion: [{ t0: 0, t1: Math.max(0.06, T[0] - 0.04), kind: 'toTarget', gap: 1.0 }, { t0: T[3] - 0.08, t1: T[5] + 0.12, kind: 'leap', h: 0.9 }],
      stream: [{ t0: 0, t1: T[0], kind: 'afterimage', col: AFT }, { t0: 0, t1: T[5], kind: 'spark' }],
      events: [up(T[0], { big: true }), zap(T[1]), zap(T[2]), up(T[3], { big: true }), zap(T[4]), up(T[5], { big: true }), { t: T[5], fx: 'boltAt', big: true }, { t: T[5], fx: 'whiteFlash' }] });
  }
  set(K.dash, { motion: [{ t0: 0, t1: 0.18, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFT }], events: [cut(0.2, { phys: true, ring: true }), cut(0.3, { phys: true, ring: true })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 0.9, side: 'auto' }, { t0: 0.1, t1: 0.2, kind: 'fwd', d: 0.9 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFT }],
    events: [cut(0.2, { tilt: -0.6, sweep: -1.0 }), cut(0.28, { tilt: 0.5, sweep: 1.0 }), cut(0.36, { tilt: -0.4, sweep: -1.0 }), up(0.46, { big: true }), { t: 0.46, fx: 'boltAt' }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.26, kind: 'leap', h: 1.5, toTarget: true }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFT }],
    events: [down(0.24), cut(0.32, { tilt: 0.5, sweep: 1.0 }), cut(0.4, { tilt: -0.6, sweep: -1.0 }), up(0.5), { t: 0.5, fx: 'boltAt' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.2 }, { t0: 0.86, t1: 1.14, kind: 'leap', h: 1.1 }], stream: [{ t0: 0.2, t1: 0.95, kind: 'sparkRing', r: 2.6 }, { t0: 0.1, t1: 0.98, kind: 'spark' }],
    events: [up(0.4), cut(0.55, { tilt: -0.5, sweep: -1.0 }), cut(0.7, { tilt: 0.5, sweep: 1.0 }), up(0.98, { big: true }), { t: 0.98, fx: 'boltAt', big: true }, { t: 0.98, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 0.8 }, { t0: 0.42, t1: 0.55, kind: 'toTarget', gap: 1.0 }, { t0: 0.86, t1: 1.66, kind: 'leap', h: 2.0 }],
    stream: [{ t0: 0.1, t1: 0.55, kind: 'spark' }, { t0: 0.3, t1: 1.7, kind: 'sparkRing', r: 3.2 }],
    events: [{ t: 0.3, fx: 'anCharge' }]
      .concat(TUL.slice(0, 6).map((t, i) => (i === 2 || i === 5 ? up(t, { big: i === 5 }) : zap(t))))
      .concat(TUL.slice(6).map((t, i) => (i === 2 || i === 5 ? down(t, { big: true }) : { t, fx: 'boltAt' })))
      .concat([{ t: 1.65, fx: 'anStorm', r: 4 }, { t: 1.65, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.18, kind: 'toTarget', gap: 1.1 }, { t0: 0.78, t1: 0.92, kind: 'leap', h: 0.8 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFT }, { t0: 0.18, t1: 0.6, kind: 'spark' }],
    events: TFU.slice(0, 6).map(t => cut(t, { ring: true, small: true })).concat([up(0.68), cut(0.78, { tilt: -0.5, sweep: -1.0 }), down(0.9, { big: true }), { t: 0.9, fx: 'whiteFlash' }]) });
})();
