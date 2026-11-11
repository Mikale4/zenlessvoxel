/* ============================================================================
   agents/goldship.js -- Gold Ship ("Golshi"), a GUEST from Umamusume: Pretty
   Derby: Tracen Academy's greatest trickster. A-Rank, Physical, Stun,
   Defensive Assist (all our choices).

   (An Agent in her own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)

   ---- A GUEST: HER KIT IS THIS GAME'S OWN DESIGN -------------------------
   Gold Ship is not in Zenless Zone Zero: there is no official kit, no
   official number, no voice line. Everything below (skills, the Whim gauge,
   Golshi Theater, End Closer, every multiplier) is this game's own design,
   built in ZZZ's structure from her character, and set beside Anby Demara's
   official level-12 values (an A-Rank Stun Agent) so that she is no
   stronger overall. The numbers are written as level-12 values and go
   through the same hit() helper as every Agent (DMG x0.45, Daze x0.6,
   Buildup as written). Heavy hits follow the game's usual rule (string
   finisher, Dodge Counter, EX, Chain, Ultimate, Assist Follow-Up).
   ---------------------------------------------------------------------------

   Sources (for who she is, what she looks like, and the names): the
   Umamusume Fandom wiki (Gold Ship; Gold Ship/Trainee/Red Strife), the
   official Japanese character page (profile, catchphrase, theme colours,
   the racing-outfit, uniform and concept art), Wikipedia (Gold Ship
   (Umamusume: Pretty Derby)), umamusu.wiki (Gold Ship). The research notes:
   reports/goldship.md.

   Her kit (OUR DESIGN, named after her own things):
     Basic Attack: Fickle Maiden     ("Golshi the Fickle Maiden", her event)
                                     4 kicks: a snap front kick, a spinning
                                     back kick, two hoof stomps, a flying kick
                                     and a landing stomp. All Physical.
     Basic Attack: Golshi Theater    (her official profile's ゴルシ劇場) her
                                     moves fill Whim (max 100); at 100 an act
                                     is drawn at random and held Basic plays
                                     it: Into the Sack (the enemy is Bagged:
                                     +20% Daze from the whole squad, 6 s), Hot
                                     Mustard (an interrupt, +20 Energy), Guess
                                     Who? (behind it, its eyes covered, then the
                                     biggest kick of the three)
     Dash Attack: Straight to the Gate   (she "flies to the starting gate")
     Dodge Counter: Red Ribbon       (a red ribbon marks a horse that kicks):
                                     a double rear kick
     Special Attack: Warning Shot!   (her 2-star unique skill's name): she
                                     throws her Rubik's cube
     EX Special Attack: Golshi Drop Kick   60 Energy: a drop kick, a spring off
                                     the enemy, a second drop kick
     Chain Attack: Gold Ship Has Arrived!   (her self-introduction)
     Ultimate: Anchors Aweigh!       (her 3-star unique skill's name; her
                                     anchor): a long-spurt lap of kicks, a drop
                                     kick, a giant gold anchor. Fills Whim.
     Quick Assist: Out of Nowhere    Defensive Assist: Gatekept (her skill)
     Assist Follow-Up: 12 Billion Yen Rear   (the real horse's starting gate)
     Core Passive: Golshi Theater (above)
     Additional Ability: End Closer  (her runner type) with an Attack Agent or
                                     another Physical Agent: +25% Daze against
                                     an enemy already at 50% Daze or more.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, { ACT, add, mix } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // a share k of a move's total [DMG%, Daze%, Anomaly Buildup], split over its hits
  const part = (t, k, T, o) => hit(t, T[0] * k, T[1] * k, Math.round(T[2] * k * 100) / 100, o);
  // OUR DESIGN's level-12 totals, set beside Anby Demara's official ones (anby.js; the report's table): no stronger
  const B3 = [212, 132, 70], B4 = [470, 278, 170], DCM = [358, 240, 60], EXM = [1150, 715, 520];
  const SACK = [260, 200, 120], MUST = [300, 210, 130], GUESS = [420, 330, 150];
  const CHM = [1080, 215, 340], ULM = [3000, 1480, 210], FUM = [665, 435, 310];
  const PARRY = 371.0;                                 // Gatekept: Anby's Light Defensive Daze (an A-Rank Stun Agent's), unscaled
  // Golshi Theater (our design): Whim, what each move gives as it first lands, the acts
  const WMAX = 100, W_START = 50;
  const WGAIN = { basic: 8, dash: 8, special: 12, quick: 20, counter: 25, followup: 25, ex: 30, chain: 30 };
  const ACTS = { sack: 'Into the Sack', mustard: 'Hot Mustard', guess: 'Guess Who?' };
  const BAG_T = 6, BAG_DZ = 0.2, MUSTARD_EN = 20;      // Bagged: 6 s, +20% Daze; Hot Mustard: +20 Energy
  const EC = 0.25, EC_AT = 0.5;                        // End Closer: +25% Daze at 50% Daze or more
  // her colours: the official theme red and gold (umamusume.jp), the pale gold of a Physical kick
  const RED = 0xda3c57, GOLDC = 0xe9da36, KICK = 0xfff2c0;

  /* ----------------------------------------------------------------- kit -- */
  const BA = 'Basic Attack: Fickle Maiden', GT = 'Basic Attack: Golshi Theater - ';
  const arcO = (r, arc, o) => Object.assign({ shape: 'arc', r, arc }, o || {});
  const cone = (r, arc, o) => Object.assign({ shape: 'cone', r, arc }, o || {});
  const front = (r, o) => Object.assign({ shape: 'circle', at: 'front', r }, o || {});
  const atT = (r, o) => Object.assign({ shape: 'circle', at: 'target', r }, o || {});
  const UT = [0.5, 0.62, 0.74, 0.86, 0.98, 1.1];       // the Ultimate's lap of kicks
  const K = {
    basic: [
      { name: BA, anim: 'gsSnap', dur: 0.4, cancel: 0.28, reach: 1.7, range: 1.4, hits: [hit(0.14, 66, 28, 15, arcO(2.1, 110))] },
      { name: BA, anim: 'gsBackKick', dur: 0.48, cancel: 0.34, reach: 1.7, range: 1.4, hits: [hit(0.2, 82, 46, 25, arcO(2.3, 160))] },
      { name: BA, anim: 'gsStomp', dur: 0.66, cancel: 0.5, reach: 1.7, range: 1.4, hits: [part(0.18, 0.4, B3, front(2.0)), part(0.38, 0.6, B3, front(2.1))] },
      // the flying kick, then the landing stomp (the string's finisher: heavy)
      { name: BA, anim: 'gsFlyKick', dur: 0.9, cancel: 0.72, reach: 2.0, range: 1.5, hits: [part(0.3, 0.4, B4, arcO(2.4, 120)), part(0.52, 0.6, B4, front(2.5, { heavy: true, kb: 0.9 }))] },
    ],
    // Golshi Theater (held Basic at 100 Whim, resolve): the act drawn when the Whim filled. Anti-Interrupt
    sack: { name: GT + 'Into the Sack', anim: 'gsSack', dur: 0.95, cancel: 0.8, reach: 1.7, range: 1.4, dr: 0.4, gsAct: 'sack',
      hits: [part(0.32, 0.4, SACK, front(2.0, { gsBag: true })), part(0.62, 0.6, SACK, front(2.2, { heavy: true, kb: 0.6 }))] },
    mustard: { name: GT + 'Hot Mustard', anim: 'gsMustard', dur: 0.9, cancel: 0.75, reach: 1.6, range: 1.3, dr: 0.4, gsAct: 'mustard',
      hits: [part(0.34, 1, MUST, front(2.2, { heavy: true, kb: 0.5, gsMustard: true }))] },
    guess: { name: GT + 'Guess Who?', anim: 'gsGuess', dur: 1.0, cancel: 0.85, reach: 2.2, range: 1.4, dr: 0.4, gsAct: 'guess', track: 0.72,
      hits: [part(0.42, 0.15, GUESS, front(1.8)), part(0.78, 0.85, GUESS, front(2.4, { heavy: true, kb: 1.1 }))] },
    dash: { name: 'Dash Attack: Straight to the Gate', anim: 'gsShoulder', dur: 0.55, cancel: 0.42, reach: 7, hits: [hit(0.22, 110, 42, 25, cone(2.2, 90, { kb: 0.5 }))] },
    // a double rear kick, her back to the enemy
    counter: { name: 'Dodge Counter: Red Ribbon', anim: 'gsBuck', dur: 0.72, cancel: 0.56, inv: [0, 0.64],
      hits: [part(0.26, 0.5, DCM, cone(2.6, 100)), part(0.38, 0.5, DCM, cone(2.7, 100, { heavy: true, kb: 1.0 }))] },
    // the Rubik's cube, thrown: a straight line ahead
    special: { name: 'Special Attack: Warning Shot!', anim: 'gsThrow', dur: 0.5, cancel: 0.38, reach: 6, range: 3.2, cd: 1.2, hits: [hit(0.26, 180, 136, 90, { shape: 'line', r: 0.8, len: 7, kb: 0.4 })] },
    // a drop kick, a spring off the enemy, a second drop kick
    ex: { name: 'EX Special Attack: Golshi Drop Kick', anim: 'gsEx', dur: 1.2, cancel: 1.05, cost: 60, reach: 2.8, range: 1.8, inv: [0, 1.15],
      hits: [part(0.44, 0.55, EXM, front(2.4, { heavy: true, kb: 0.8 })), part(0.84, 0.45, EXM, front(2.7, { heavy: true, kb: 1.4 }))] },
    // down from the sky feet first, then a spinning kick
    chain: { name: 'Chain Attack: Gold Ship Has Arrived!', anim: 'gsArrive', dur: 1.35, inv: [0, 1.35],
      hits: [part(0.66, 0.35, CHM, atT(2.6)), part(0.98, 0.65, CHM, atT(3.0, { heavy: true, kb: 1.3 }))] },
    // the lap (six kicks, 6% each), then the drop kick and the anchor (64%)
    ult: { name: 'Ultimate: Anchors Aweigh!', anim: 'gsUlt', dur: 2.3, inv: [0, 2.3], track: 1.78,
      hits: UT.map(t => part(t, 0.06, ULM, atT(3.0))).concat([part(1.78, 0.64, ULM, atT(4.6, { heavy: true, kb: 1.8 }))]) },
    // Gatekept: Anby's Light Defensive Daze, unscaled (battle.js adds 20% against a heavy blow)
    assist: { name: 'Defensive Assist: Gatekept', type: 'defensive', anim: 'gsParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(PARRY) },
    followup: { name: 'Assist Follow-Up: 12 Billion Yen Rear', anim: 'gsRear', dur: 1.05, inv: [0, 1.0],
      hits: [part(0.3, 0.3, FUM, front(2.2, { kb: 0.4 })), part(0.64, 0.7, FUM, front(2.8, { heavy: true, kb: 1.1 }))] },
    quick: { name: 'Quick Assist: Out of Nowhere', anim: 'gsLeapKick', dur: 0.72, inv: [0, 0.66], hits: [hit(0.3, 124, 93, 60, arcO(2.6, 130, { kb: 0.7 }))] },
  };

  /* ----------------------------------------------------- her mechanics -- */
  const isPhys = at => ((D.ATTR[at] && D.ATTR[at].as) || at) === 'physical';
  // Whim fills; at 100 tonight's act is drawn (nobody knows which, not even her)
  function gainWhim(a, n) {
    if (a.rival || !(n > 0)) return;
    a.gsWhim = Math.min(WMAX, a.gsWhim + n);
    if (a.gsWhim >= WMAX && !a.gsAct) {
      a.gsAct = U.pick(Object.keys(ACTS));
      BT.log(`Gold Ship: Golshi Theater! Tonight's act: ${ACTS[a.gsAct]} (hold Basic).`, 'skill');
    }
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.goldship = {
    id: 'goldship', name: 'Gold Ship', short: 'Gold Ship', faction: 'Guest · Umamusume', spec: 'Stun', attr: 'physical', rank: 'A',
    color: '#da3c57', color2: '#e9da36', assist: 'defensive', stance: 'goldship',
    blurb: 'A guest from Umamusume: Pretty Derby: Gold Ship, Tracen Academy\'s greatest trickster, who lives on a whim and for fun, cannot stand staying still and drop-kicks her own trainer when she wins. Here she is a Physical Stun Agent of this game\'s own design: kicks and drop kicks, and Golshi Theater, a random act (a sack, hot mustard, or "guess who?") whenever her Whim fills.',
    // OUR stats (no official ones): beside Anby (8400 / 2220 / 655 / Impact 136). More HP and a little more ATK for her
    // Stamina and Power (her best stats as a trainee), a little less Impact; the top of the speed range: she is a racer
    stats: { hp: 8600, atk: 2250, def: 640, impact: 134, ap: 92, am: 91, cr: 0.1, cd: 0.7, er: 1.2, speed: 4.9 },
    ai: { range: 1.6, dodge: 0.8, reflex: 0.64, aggr: 1.1 },
    energyMax: 120, resource: 'whim',
    core: [
      ['Core Passive: Golshi Theater', 'Her moves fill Whim (max 100; she enters a fight with 50) as they first land: a Basic step or the Dash Attack 8, a Special 12, a Quick Assist 20, a Dodge Counter or Assist Follow-Up 25, her EX or a Chain Attack 30; her Ultimate fills it. At 100, tonight\'s act is drawn at random, and holding Basic plays it (Anti-Interrupt): Into the Sack (a sack over the enemy\'s head: Bagged for 6 s, every hit from the squad deals it 20% more Daze), Hot Mustard (it is interrupted, unless it is a boss, and she gains 20 Energy) or Guess Who? (she slips behind it, covers its eyes, then the heaviest kick of the three).'],
      ['Additional Ability: End Closer', 'With an Attack Agent or another Physical Agent in the squad: against an enemy whose Daze is at 50% or more, her hits deal 25% more Daze. (In her races she stays back, then closes in at the end.)'],
      ['A guest: our design', 'Gold Ship comes from Umamusume: Pretty Derby and is not in Zenless Zone Zero. Every skill, number and mechanic here is this game\'s own design in ZZZ\'s structure, set no stronger than its other Stun Agents. The names are her own: her unique skills Warning Shot! and Anchors Aweigh!, her Gatekept skill, her End Closer running style, her self-introduction and her gags.'],
    ],
    kit: K,
    kitShow: [['Hold (100 Whim)', 'sack'], ['Hold (100 Whim)', 'mustard'], ['Hold (100 Whim)', 'guess']],
    rivalMoves: [{ k: 'guess', kind: 'core', p: 0.2, cd: 8 }],
    howto: 'Gold Ship (a guest from Umamusume: her kit is this game\'s own design): her hits fill Whim; at 100, hold Basic for Golshi Theater, an act drawn at random: Into the Sack (the whole squad deals 20% more Daze to that enemy for 6 s), Hot Mustard (an interrupt and 20 Energy) or Guess Who? (big Daze). Special throws her Rubik\'s cube from range; her EX is a double drop kick; her Ultimate refills Whim. With an Attack or another Physical Agent, she deals 25% more Daze to an enemy already half Dazed. Her assist is a Defensive Assist: she parries, then Basic for 12 Billion Yen Rear.',
    mech: {
      // gsWhim: the gauge; gsAct: the act drawn at 100 (null below); gsEC: End Closer holds
      init(a) { a.gsWhim = 0; a.gsAct = null; a.gsEC = false; gainWhim(a, W_START); },
      squad(a, B) { a.gsEC = B.squad.some(s => s !== a && (s.def.spec === 'Attack' || isPhys(s.def.attr))); },
      start(a, def, A) {
        // an act plays: the Whim is spent; the next act is drawn when it fills again
        if (def.gsAct) {
          a.gsWhim = 0; a.gsAct = null;
          if (!a.rival) BT.callout(ACTS[def.gsAct].toUpperCase(), 'skill', 'Gold Ship · Golshi Theater');
        }
        if (A.kind === 'ult') gainWhim(a, WMAX);
      },
      hit(a, v, h, A) {
        const B = BT.B; if (!B || !A || !A.data) return;
        // Whim: each move gives it once, when it first lands
        if (!A.data.gsW) { A.data.gsW = true; gainWhim(a, WGAIN[A.kind] || 0); }
        if (!v.alive || a.rival) return;
        const dz = a.st.impact * (h.daze || 0) / 100;
        // Bagged: her own hits on it (the squad's: allyHit). The hit that bags it does not count
        if (v.gsBag > B.t && dz > 0) BT.addDaze(a, v, dz * BAG_DZ);
        // End Closer: past halfway, she closes in (this hit's own Daze is already in)
        if (a.gsEC && dz > 0 && v.dazeMax > 0 && !(v.stun > 0) && v.daze >= v.dazeMax * EC_AT) BT.addDaze(a, v, dz * EC);
        // Into the Sack
        if (h.gsBag && !v.rival) {
          if (!(v.gsBag > B.t)) BT.log(`${v.def.name} is Bagged! (+20% Daze from the squad, 6 s)`, 'skill');
          v.gsBag = B.t + BAG_T; sackOn(v);
          FX.number(v.x, (v.height || 1.6) + 0.5, v.z, 'BAGGED', 'miss', '#d8b07a');
        }
        // Hot Mustard: once a move
        if (h.gsMustard && !A.data.gsM) {
          A.data.gsM = true; BT.gainEnergy(a, MUSTARD_EN, true);
          if (!(v.stun > 0) && v.rank !== 'boss') BT.interrupt(v, 0.8);
          spice(v); BT.log(`Gold Ship: Hot Mustard! (+${MUSTARD_EN} Energy)`, 'skill');
        }
      },
      // a teammate's hit on a Bagged enemy: 20% more Daze
      allyHit(a, src, v, h) {
        const B = BT.B; if (!B || a.rival || src.rival || !v.alive || !(v.gsBag > B.t)) return;
        const dz = src.st.impact * (h.daze || 0) / 100; if (dz > 0) BT.addDaze(src, v, dz * BAG_DZ);
      },
      // held Basic with 100 Whim: tonight's act (tapped, the string as usual)
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || !hold || c.dash || !(a.gsWhim >= WMAX) || !a.gsAct) return null;
        return { def: K[a.gsAct], kind: 'core' };
      },
      // AUTO: the act when it is ready (a sack is no use on a Stunned enemy, which takes no Daze: kept for later)
      ai(a, tgt, B) {
        if (!(a.gsWhim >= WMAX) || !a.gsAct) return null;
        if (a.gsAct === 'sack' && tgt.stun > 0) return null;
        return Math.random() < 0.7 ? { btn: 'basic', hold: true } : null;
      },
      hud(a, B) {
        const n = Math.floor(a.gsWhim / 10), r = [`WHIM ${'●'.repeat(n)}${'○'.repeat(10 - n)} ${Math.floor(a.gsWhim)}`];
        if (a.gsWhim >= WMAX && a.gsAct) r.push(`GOLSHI THEATER: ${ACTS[a.gsAct].toUpperCase()} · HOLD BASIC`);
        const bag = B.enemies.filter(v => v.alive && v.gsBag > B.t);
        if (bag.length) r.push(`BAGGED ${Math.ceil(Math.max(...bag.map(v => v.gsBag)) - B.t)}s · +20% DAZE`);
        if (a.gsEC) r.push('END CLOSER · +25% DAZE PAST 50%');
        return r;
      },
    },
    town: {
      // Blazewood (our judgement: she has no ZZZ trust events). She hates staying still and lives to race and make trouble;
      // the Outer Ring's desert town of racing bikers suits her, Old Demir's bench is her foil, Kasa's Cheesetopia her rival
      // for the yakisoba stand she keeps planning, the 747 her supply of commercial-use seasoning
      home: 'blazewood',
      // mornings on the road out of town (room to run), at the 747 for seasoning, among the bikes; afternoons at
      // Cheesetopia, bothering Old Demir, on the fuel truck; evenings at the bar and the bikes; late nights she still
      // cannot sit still: the road, the arch, the truck
      routine: ['south:look 30, 747:browse 25, shop:bike 15, huddle 30', 'cheese:queue 25, bench:demir 20, truck:lean 20, huddle 35', 'bar:stool 30, shop:bike 25, cheese:seat 15, huddle 30', 'south:look 35, arch:look 35, truck:lean 30'],
      chatter: ['Golshi\'s rule of the day: no standing still. ...Rule updated. No sitting either.', 'If it\'s fun, it\'s fine! ...Is it? Who cares!'],
      lines: [
        'Bow down! Gold Ship has arrived! ...From where? Tracen Academy. Further out than the Outer Ring. Don\'t worry about it.',
        'Old Demir says nobody in Blazewood is in a hurry, except on a bike. Golshi-chan\'s in a hurry on foot. Always. Sitting still makes my face itch.',
        'Hot mustard is the king of condiments. I put some in McQueen\'s snacks once. Now she runs whenever she hears my voice. ...She\'ll come around.',
      ],
      chapters: [
        { title: 'Golshi\'s House Specialty', ask: ['Proxy! Big news! Golshi-chan\'s opening a yakisoba stand. Right here in Blazewood, next to Cheesetopia. "Golshi\'s House Specialty"!', 'Kasa\'s holding a tub of commercial-use seasoning for me. Go get it, then eat something at Cheesetopia. Know your enemy! Then come tell me how it was.'],
          steps: [{ t: 'talk', to: 'kasa', reply: 'Seasoning? She ordered a barrel of it. A barrel! ...Fine, take it. And tell her if she sets up next to my Cheesetopia, the cheese on her noodles comes from me.' }, { t: 'order' }, { t: 'talk', to: 'goldship' }],
          scene: [['A', 'You ATE there?! Traitor! ...Was it good? It was good, wasn\'t it.'], ['P', 'The cheese fries were great.'], ['A', 'Then we fight cheese with cheese! Yakisoba, Kasa\'s cheese, a whole tube of hot mustard. Takoyakisoba walked so this could run!'], ['P', '...I\'ll try a bite.'], ['A', 'Terrible, right? Perfect! Grand opening tomorrow. Or next year. Depends how I feel.']] },
        { title: 'Starting gate', ask: ['Oi, Proxy. Golshi-chan challenged the Sons of Calydon to a race. Me on foot, them on bikes, down the road out of town and back.', 'I need a starter. Ask Caesar to wave the flag. And tell Leif his tortoise can enter too. Everybody\'s welcome at Golshi\'s races!'],
          steps: [{ t: 'talk', to: 'caesar', reply: 'A footrace against our bikes? Ha! I like her! Sure, I\'ll wave the flag. ...She does know we\'ve got engines, right?' }, { t: 'talk', to: 'leif', reply: 'Slowpoke can race?! He\'s waited his whole life for this! ...He\'s already set off. Slowly.' }, { t: 'talk', to: 'goldship' }],
          scene: [['A', 'So. Slowpoke won.'], ['P', 'You reared up at the start and stood there yelling at the flag for five seconds.'], ['A', 'The flag looked at me funny! ...Everybody was so busy staring at me, nobody saw the tortoise go past.'], ['A', 'Hah! A win\'s a win. For Slowpoke. Rematch next week. I\'m entering the groundhog.']] },
        { title: 'Anchors aweigh', ask: ['Lighter says there\'s something huge in the Hollow outside town. The Champion fights one on one, right? Boring!', 'Golshi-chan fights however she feels like. Put me at the front, him with me. Anchors aweigh!'],
          steps: [{ t: 'clear', f: { arena: 'outer', enc: 'boss', lead: 'goldship', with: 'lighter' } }, { t: 'talk', to: 'lighter', reply: 'She drop-kicked it before I got my glove up. Then she drop-kicked it again, because the first one "didn\'t have enough feeling". ...Honestly? Respect.' }, { t: 'talk', to: 'goldship' }],
          scene: [['A', 'Did you see that?! Two drop kicks! A new Golshi-chan record!'], ['P', 'You were great out there.'], ['A', '...Hey, Proxy. I lie about a lot of stuff. Dumb stuff. How old I am, my family, where I\'m from.'], ['A', 'Never about the stuff that matters, though. So, for real: that was fun. You\'re fun. ...Now buy me yakisoba!']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official racing-outfit art (umamusume.jp; hex sampled from it):
     long straight silver-grey hair with blunt straight bangs, lavender in its
     lower lengths, past her hips; tall grey horse ears, a purple bow on her
     right one; a small brimless brown pillbox hat with a gold emblem, worn
     off to her right, its brown straps running round her head to big copper
     discs over her ears (a horse's headstall); rosewood eyes, a toothy grin.
     A short sleeveless red dress: a white stand-up collar, a big dark red bow
     with a gold diamond ornament, two gold stripes down the front that split
     into slits at the hips and run round the hem, six gold buttons between
     them; brown harness straps round her chest with big gold rings; a
     diagonal brown belt to a brown saddlebag on her right hip (a gold
     horseshoe, a fleur-de-lis), a strap hanging behind with a gold tip. Red
     sweatbands with a white stripe on her upper arms; long white gloves with
     oversized cuffs, black stripes. White leggings with grey seams down the
     outside, a brown strap round her right thigh with a gold anchor. White
     calf-high boots: huge folded cuffs with a dark stripe, brown throats with
     gold-tan buckles, red bows. A long grey-lavender horse tail. 170 cm,
     athletic. Approximated: the chin strap (voxels too few), the cuffs' two
     stripes (one each), the seam pattern on the ear discs (one pale voxel). */
  const DRAW = {};
  {
    const HAIR = 0xdcdbe6, HAIRHI = 0xe7e2ea, HAIR2 = 0xbcb6cc, HAIR3 = 0xa58eb8, HAIR4 = 0x988ea7;   // (HAIR2: between the two samples)
    const EAR = 0xbcb9ce, EAR2 = 0x9c97b0, BOW = 0x311a69, BOW2 = 0x2c1679;                            // (EAR2: a shade, ours)
    const HAT = 0x68463f, HATTOP = 0x7b564b, HATBAND = 0x59373b, EMB = 0xead191, EMB2 = 0xc7ad8b, EMBR = 0x826254;
    const STRAP = 0x3b140f, DISC = 0x8f6161, DISC2 = 0x714543, DISCRIM = 0xcaa4a2;
    const SKIN = 0xffebd9, BLUSH = 0xffd6ce, EYE = 0x89465d, LASH = 0x3b1521, TEETH = 0xfaf6f4, LIP = 0xd88a8a;
    const WHITE = 0xf4f2f7, RED = 0xfa3944, RED2 = 0xde2a42, REDSH = 0x9f1344, GOLD = 0xfad193, BTN = 0xd4b189, BTN2 = 0xa76836;
    const NECKBOW = 0x910c10, NECKBOW2 = 0x840408, ORN = 0xe2ba93, ORN2 = 0xb58467, RING = 0xd1af89;
    const BAG = 0x552a28, BAG2 = 0x3b1a19, BAGGOLD = 0xd3a87a;
    const BAND = 0xe9313e, BANDW = 0xfdfefd, GLOVE = 0xece6e7, STRIPE = 0x493640;
    const LEG = 0xf4f2f7, LEGSH = 0xbdbce7, THIGH = 0x7a4d3b, ANCHOR = 0xfef3ba;
    const BOOT = 0xf0ebf8, BOOTSH = 0x968bc3, CUFFST = 0x4f3d4f, THROAT = 0x5e4239, BUCKLE = 0xb18565, BBOW = 0x830408, SOLE = 0xc8c2d8;
    const TAIL = 0xa58eb8, TAIL2 = 0x8e779e, TAILHI = 0xad93bd;
    // an arm (s = 1: her left): the bare shoulder, the red sweatband with its white stripe above the elbow, the long white
    // glove: its oversized cuff (a dark stripe on its top edge), the forearm and hand
    const arm = s => g => {
      g.box(-1, 0, -1, 1, -1, 1, SKIN);
      g.box(-1, -2, -1, 1, -2, 1, BAND); g.box(-1, -3, -1, 1, -3, 1, BANDW); g.box(-1, -4, -1, 1, -4, 1, BAND);
      g.box(-2, -5, -2, 2, -5, 2, (x, y, z) => Math.abs(x) === 2 && Math.abs(z) === 2 ? -1 : Math.abs(x) === 2 || Math.abs(z) === 2 ? STRIPE : GLOVE);
      g.box(-2, -6, -2, 2, -6, 2, (x, y, z) => Math.abs(x) === 2 && Math.abs(z) === 2 ? -1 : GLOVE);
      g.box(-1, -7, -1, 1, -7, 1, GLOVE);
    };
    // a leg (s = 1: her left): the white legging (a grey seam down the outside), the folded boot cuff (a dark stripe on
    // its top edge), the white boot with its brown throat, buckles and a red bow under the cuff
    const leg = s => g => {
      H.leg(g, { pant: LEG, boot: BOOT, bootH: 4, sole: SOLE });
      for (let y = -1; y >= -3; y--) g.set(s, y, 0, LEGSH);
      g.box(-2, -5, -2, 2, -5, 2, (x, y, z) => Math.abs(x) === 2 && Math.abs(z) === 2 ? -1 : (Math.abs(x) === 2 || z === -2) ? BOOTSH : BOOT);
      g.box(-2, -4, -2, 2, -4, 2, (x, y, z) => Math.abs(x) === 2 && Math.abs(z) === 2 ? -1 : Math.abs(x) === 2 || Math.abs(z) === 2 ? CUFFST : -1);
      g.box(0, -8, 2, 0, -6, 2, THROAT); g.set(0, -7, 3, BUCKLE); g.set(0, -8, 3, BUCKLE);   // the brown throat down the front, buckles
      g.set(-1, -5, 3, BBOW); g.set(1, -5, 3, BBOW); g.set(0, -5, 3, RING);
      if (s < 0) {                                                               // her right thigh: the brown strap, the gold anchor
        g.box(-1, -3, -1, 1, -3, 1, THIGH);
        g.set(-2, -2, 0, ANCHOR); g.box(-2, -3, -1, -2, -3, 1, ANCHOR); g.set(-2, -4, 0, ANCHOR);
      }
    };
    MODELS.goldship = H.humanoid({
      scale: 0.072, height: 28, width: 20,
      sockets: { weapon: ['legR', [0, -9, 2]], hand: ['armR', [0, -8, 1]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, RED2);
        // the short dress's skirt: red, flared, shaded at the sides; the gold hem
        g.box(-4, -4, -3, 4, -2, 2, (x, y, z) => y === -4 ? GOLD : Math.abs(x) === 4 ? REDSH : z === -3 ? RED2 : RED);
        g.box(-3, -1, 2, 3, -1, 2, RED);
        // the gold stripes down the front, splitting into slits from the hips
        g.box(-3, -2, 2, -3, -1, 2, GOLD); g.box(3, -2, 2, 3, -1, 2, GOLD);
        for (const s of [-1, 1]) { g.set(2 * s, -3, 2, GOLD); g.set(4 * s, -3, 2, GOLD); g.set(3 * s, -3, 2, REDSH); }
        // the diagonal brown belt from her left hip down to her right, its gold clasp
        for (let x = 4; x >= -4; x--) g.set(x, x >= 1 ? 0 : -1, 3, STRAP);
        g.set(-1, -1, 3, GOLD);
        // the saddlebag on her right hip: a gold horseshoe on its side, a fleur-de-lis on its front
        g.box(-6, -3, -1, -5, -1, 1, (x, y) => y === -3 ? BAG2 : BAG); g.box(-6, -1, -1, -5, -1, 1, BAG2);
        g.set(-7, -2, 0, BAGGOLD); g.set(-5, -2, 2, BAGGOLD);
        g.box(0, -2, -4, 0, -4, -4, STRAP); g.set(0, -5, -4, GOLD);              // the strap hanging behind, its gold tip
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, x => Math.abs(x) === 3 ? REDSH : RED2);         // the dress to the waist
        g.box(-2, 0, 2, 2, 2, 2, RED);
        g.box(-3, 3, -2, 3, 5, 1, x => Math.abs(x) === 3 ? REDSH : RED);         // the bodice, sleeveless
        g.box(-2, 3, 2, 2, 4, 2, RED);
        g.box(-3, 0, 1, -3, 5, 1, GOLD); g.box(3, 0, 1, 3, 5, 1, GOLD);           // the gold stripes, down the front's edges
        for (const y of [0, 1, 2]) { g.set(-1, y, 3, BTN); g.set(1, y, 3, BTN); g.set(-1, y, 2, BTN2); g.set(1, y, 2, BTN2); }   // six gold buttons
        // the harness: a brown strap under the bust and one over it at the back, big gold rings under the arms
        g.box(-3, 3, -2, 3, 3, 1, x => Math.abs(x) === 3 ? STRAP : -1); g.box(-1, 3, 3, 1, 3, 3, STRAP);
        g.box(-3, 5, -3, 3, 5, -3, STRAP);
        g.set(-3, 4, 2, RING); g.set(3, 4, 2, RING);
        g.box(-3, 6, -2, 3, 6, 1, x => Math.abs(x) >= 2 ? SKIN : -1);           // bare shoulders
        g.box(-1, 6, -1, 1, 6, 1, WHITE); g.box(-1, 5, 2, 1, 6, 2, WHITE);        // the white stand-up collar
        g.set(-2, 5, 3, NECKBOW); g.set(2, 5, 3, NECKBOW); g.set(-1, 5, 3, NECKBOW2); g.set(1, 5, 3, NECKBOW2);   // the dark red bow...
        g.set(0, 5, 3, NECKBOW2); g.set(0, 4, 3, ORN); g.set(0, 3, 4, ORN2);     // ...its gold diamond ornament
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: TEETH, blush: BLUSH });
        g.set(-1, 0, 3, LIP); g.set(1, 0, 3, LIP);                                // the toothy grin
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [], sideTo: 2 });            // blunt straight bangs (strands: none)
        for (let x = -4; x <= 4; x += 2) g.set(x, 6, 4, HAIRHI);
        for (const s of [-1, 1]) g.box(4 * s, -3, -3, 4 * s, 0, 1, (x, y) => y < -1 ? HAIR2 : HAIR);   // long side locks to the shoulders
        g.box(-4, -3, -4, 4, -1, -4, HAIR2);
        // the horse ears, standing up and a little out: grey, darker inside
        for (const s of [-1, 1]) {
          g.box(3 * s, 8, -1, 4 * s, 9, 0, EAR); g.box(4 * s, 10, -1, 4 * s, 11, 0, EAR); g.set(4 * s, 12, 0, EAR);
          g.box(3 * s, 8, 1, 4 * s, 9, 1, EAR2); g.set(4 * s, 10, 1, EAR2);
        }
        g.set(-5, 8, 0, BOW2); g.set(-5, 9, -1, BOW); g.set(-5, 7, 1, BOW);     // the purple bow on her right ear
        // the pillbox hat, off to her right: its darker band, a lighter top, the gold emblem
        g.box(-2, 8, -1, 1, 10, 2, (x, y) => y === 8 ? HATBAND : y === 10 ? HATTOP : HAT);
        g.set(-1, 9, 3, EMB); g.set(0, 9, 3, EMB2); g.set(-1, 8, 3, EMBR); g.set(0, 8, 3, EMB);
        // its straps down the sides and round the back, to the copper discs over her ears
        for (const s of [-1, 1]) {
          g.box(5 * s, 4, 0, 5 * s, 6, 0, HATBAND);
          g.set(5 * s, 2, 0, DISC); for (const [y, z] of [[1, 0], [3, 0], [2, -1], [2, 1]]) g.set(5 * s, y, z, DISC2);
          g.set(6 * s, 2, 0, DISCRIM);
        }
        g.box(-3, 5, -5, 3, 5, -5, HATBAND);
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(1),
      legR: leg(-1),
      extra: {
        // her long straight hair down her back past her hips, lavender in its lower lengths (anim.js sways `tail`)
        tail: {
          parent: 'head', at: [0, 3, -4], rot: [0.08, 0, 0], draw(g) {
            for (let y = 0; y >= -15; y--) {
              const w = y > -11 ? 4 : 3;
              g.box(-w, y, -1, w, y, 0, (x, yy, z) => (y < -12 ? HAIR4 : y < -8 ? ((x + y) % 3 === 0 ? HAIR4 : HAIR3) : y < -4 ? ((x + y) % 4 === 0 ? HAIR3 : HAIR2) : z === -1 && x % 2 === 0 ? HAIR2 : HAIR));
            }
            g.box(-2, -16, -1, 2, -16, 0, HAIR4);
          },
        },
        // the horse tail, long and grey-lavender, down to her calves (anim.js sways `tailL` too)
        tailL: {
          parent: 'hips', at: [0, -1, -3], rot: [0.3, 0, 0], draw(g) {
            const path = [[0, 0], [-1, -1], [-2, -1], [-3, -2], [-4, -2], [-5, -2], [-6, -2], [-7, -2], [-8, -1]];
            path.forEach(([y, z], i) => g.ell(0, y, z, i < 5 ? 1.3 : 0.9, 0.7, i < 5 ? 1.0 : 0.7, (x) => i === 8 ? TAIL2 : x > 0 ? TAILHI : (i % 3 === 2 ? TAIL2 : TAIL)));
          },
        },
      },
    });

    /* her props, built once (effects below): the sack, the Rubik's cube, the anchor */
    // a burlap sack, tied with rope at the bottom (it goes over the enemy's head)
    DRAW.sack = g => {
      g.ell(0, 0, 0, 4, 4.5, 4, (x, y, z) => ((x + y + z) % 4 === 0 ? 0x8a6438 : 0xa07a4a));
      g.box(-3, -5, -3, 3, -5, 3, (x, y, z) => (Math.abs(x) === 3 || Math.abs(z) === 3 ? 0xd8c49a : -1));
      g.set(0, 5, 0, 0x8a6438); g.set(1, 5, 1, 0x7a5430);
    };
    // the Rubik's cube: white up, yellow down, red, orange, green, blue round the sides
    DRAW.cube = g => {
      g.box(-1, -1, -1, 1, 1, 1, (x, y, z) => (y === 1 ? 0xf6f6f6 : y === -1 ? 0xf2d01a : x === 1 ? 0xd8202a : x === -1 ? 0xf27a1a : z === 1 ? 0x1aa84a : z === -1 ? 0x1a4ad8 : 0x111111));
    };
    // the anchor: ring, stock, shank, curved arms and flukes, in gold
    DRAW.anchor = g => {
      const C = (x, y) => ((x + y) & 1 ? 0xe9da36 : 0xd1af89);
      for (const [x, y] of [[-1, 9], [0, 10], [1, 9], [-2, 8], [2, 8], [-1, 7], [1, 7]]) g.box(x, y, -1, x, y, 0, C(x, y));
      g.box(-4, 5, -1, 4, 5, 0, C);                                              // the stock
      g.box(0, -7, -1, 0, 6, 0, C);                                              // the shank
      for (let i = 1; i <= 5; i++) { const y = -7 + Math.round((i * i) / 6); g.box(i, y, -1, i, y, 0, C); g.box(-i, y, -1, -i, y, 0, C); }   // the arms curving up
      for (const s of [-1, 1]) { g.box(5 * s, -3, -1, 6 * s, -1, 0, 0xe9da36); g.set(6 * s, 0, 0, 0xe9da36); }   // the flukes
    };
  }

  /* --------------------------------------------------------------- poses --
     Her stance: easy and cocky, weight back, hands loose. Every pose below is
     a change from it; keys() plays a move as keyframes, from her stance and
     back to it. She fights with her legs: kicks, stomps, drop kicks. */
  ANIM.READY.goldship = { armL: [-0.25, 0, 0.3], armR: [-0.45, 0.1, -0.25], torso: [0.05, 0.15, 0], head: [0, -0.12, 0.05], legL: [-0.22, 0, 0.08], legR: [0.18, 0, -0.08], hipsY: -0.03 };
  function keys(b, t, KF) {
    if (t <= KF[0][0]) return mix(b, add(b, KF[0][1]), U.easeOut(clamp(t / Math.max(0.01, KF[0][0]), 0, 1)));
    for (let i = 1; i < KF.length; i++) if (t <= KF[i][0]) return mix(add(b, KF[i - 1][1]), add(b, KF[i][1]), U.ease(clamp((t - KF[i - 1][0]) / Math.max(0.01, KF[i][0] - KF[i - 1][0]), 0, 1)));
    return add(b, KF[KF.length - 1][1]);
  }
  const turn = (t, t0, t1, n) => ({ spin: clamp((t - t0) / (t1 - t0), 0, 1) * PI * 2 * (n || 1) });
  const CHAMBER = { legR: [-0.9, 0, 0], legL: [0.1, 0, 0], torso: [0.05, 0.1, 0], armL: [-0.3, 0, 0.3], hipsY: -0.04 };   // the right knee up
  const KICKR = { legR: [-1.75, 0, 0], torso: [-0.3, -0.15, 0], armL: [0.1, 0, 0.6], armR: [0.6, 0, -0.5] };              // a front kick, high
  const BACKK = { legL: [-1.5, 0, 0.35], torso: [0.25, 0, 0], armL: [-0.3, 0, 1.0], armR: [-0.3, 0, -1.0] };              // the spinning back kick
  const UPR = { legR: [-1.4, 0, 0], armL: [-1.0, 0, 0.6], armR: [-1.0, 0, -0.6], torso: [-0.2, 0, 0], lift: 0.2 };      // a hoof raised to stomp
  const DNR = { legR: [0.05, 0, 0], legL: [-0.4, 0, 0], armL: [-0.3, 0, 0.6], armR: [-0.3, 0, -0.6], torso: [0.35, 0, 0], hipsY: -0.12 };
  const UPL = { legL: [-1.4, 0, 0], armL: [-1.0, 0, 0.6], armR: [-1.0, 0, -0.6], torso: [-0.2, 0, 0], lift: 0.2 };
  const DNL = { legL: [0.25, 0, 0], legR: [-0.5, 0, 0], armL: [-0.3, 0, 0.6], armR: [-0.3, 0, -0.6], torso: [0.35, 0, 0], hipsY: -0.12 };
  const FLY = { legR: [-1.55, 0, 0], legL: [0.7, 0, 0], torso: [-0.45, 0, 0], armL: [0.6, 0, 0.8], armR: [0.6, 0, -0.8] };   // a flying kick
  const CROUCH = { hipsY: -0.2, torso: [0.4, 0, 0], armL: [0.7, 0, 0.3], armR: [0.7, 0, -0.3], legL: [-0.7, 0, 0.1], legR: [0.5, 0, -0.1] };
  // the drop kick: laid out flat in the air, both feet at the enemy, arms flung back (both legs end at -0.1 from her stance's)
  const DROP = { tilt: -1.25, lift: 0.55, legL: [0.12, 0, 0], legR: [-0.28, 0, 0], armL: [-2.7, 0, 0.5], armR: [-2.7, 0, -0.5], head: [0.55, 0, 0], torso: [0.1, 0, 0] };
  const LAND = { hipsY: -0.18, torso: [0.35, 0, 0], armL: [-0.6, 0, 0.7], armR: [-0.6, 0, -0.7], legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1] };
  const THROWUP = { armR: [-2.6, 0, -0.4], torso: [-0.2, 0.5, 0], legL: [-0.3, 0, 0], legR: [0.2, 0, 0] };
  const THROW = { armR: [-1.0, 0, 0.3], torso: [0.3, -0.45, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0] };
  const SHOULDER = { torso: [0.45, 0.8, 0], armL: [-0.3, 0, 0.15], armR: [0.5, 0, -0.4], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], hipsY: -0.12, head: [0, -0.6, 0] };
  // the buck: her back to the enemy (half a turn), bent over, both legs kicked out behind her
  const BUCKIN = { spin: PI, torso: [0.6, 0, 0], legL: [-0.3, 0, 0], legR: [-0.3, 0, 0], hipsY: -0.12, armL: [-0.6, 0, 0.3], armR: [-0.6, 0, -0.3] };
  const BUCK = { spin: PI, torso: [1.1, 0, 0], head: [-0.6, 0, 0], legL: [1.0, 0, 0.12], legR: [1.0, 0, -0.12], armL: [-0.9, 0, 0.3], armR: [-0.9, 0, -0.3], lift: 0.3 };
  const SACKUP = { armL: [-2.8, 0, 0.45], armR: [-2.8, 0, -0.45], torso: [-0.25, 0, 0], head: [-0.2, 0, 0], lift: 0.12 };   // the sack held high
  const SACKDN = { armL: [-1.3, 0, 0.25], armR: [-1.3, 0, -0.25], torso: [0.45, 0, 0], hipsY: -0.12, legL: [-0.5, 0, 0], legR: [0.4, 0, 0] };
  const FEEDUP = { armR: [-0.6, 0, -0.5], torso: [0, 0.5, 0], legR: [0.3, 0, 0] };
  const FEED = { armR: [-1.6, 0, 0.15], armL: [-0.9, 0, 0.5], torso: [0.25, -0.35, 0], legL: [-0.7, 0, 0], legR: [0.45, 0, 0] };   // the mustard, shoved in
  const COVER = { armL: [-2.2, -0.5, -0.3], armR: [-2.2, 0.5, 0.3], torso: [0.1, 0, 0], head: [0.15, 0, 0], lift: 0.1 };          // hands over its eyes
  const REAR = { torso: [-0.55, 0, 0], armL: [-2.9, 0, 0.3], armR: [-2.9, 0, -0.3], legR: [-1.3, 0, 0], legL: [0.25, 0, 0], head: [-0.3, 0, 0], lift: 0.35 };
  const SLAM = { torso: [0.55, 0, 0], armL: [-0.7, 0, 0.25], armR: [-0.7, 0, -0.25], legR: [0.0, 0, 0], legL: [-0.5, 0, 0], hipsY: -0.16 };
  const GUARD = { armL: [-1.45, -0.6, -0.25], armR: [-1.45, 0.6, 0.25], torso: [0.18, 0, 0], hipsY: -0.1, legL: [-0.45, 0, 0.08], legR: [0.4, 0, -0.08] };
  const RUNA = { torso: [0.45, 0, 0], head: [-0.3, 0, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], armL: [0.7, 0, 0.15], armR: [-0.9, 0, -0.15], hipsY: -0.02 };
  const RUNB = { torso: [0.45, 0, 0], head: [-0.3, 0, 0], legL: [0.75, 0, 0], legR: [-1.05, 0, 0], armL: [-0.9, 0, 0.15], armR: [0.7, 0, -0.15], hipsY: -0.02 };
  // Fickle Maiden: the snap kick, the spinning back kick, two stomps, the flying kick and its landing stomp
  ACT.gsSnap = (b, t, th, d) => keys(b, t, [[th * 0.7, CHAMBER], [th + 0.03, KICKR], [th + 0.12, KICKR], [d, {}]]);
  ACT.gsBackKick = (b, t, th, d) => add(keys(b, t, [[th * 0.6, { legL: [-0.5, 0, 0.1], torso: [0.1, 0.3, 0] }], [th + 0.03, BACKK], [th + 0.14, BACKK], [d, {}]]), turn(t, 0.02, th + 0.04));
  ACT.gsStomp = (b, t, th, d) => keys(b, t, [[0.1, UPR], [0.18, DNR], [0.28, UPL], [0.38, DNL], [0.5, DNL], [d, {}]]);
  ACT.gsFlyKick = (b, t, th, d) => keys(b, t, [[0.12, CROUCH], [0.28, FLY], [0.4, FLY], [0.52, DNR], [0.64, DNR], [d, {}]]);
  ACT.gsLeapKick = (b, t, th, d) => keys(b, t, [[th - 0.14, FLY], [th + 0.08, FLY], [th + 0.2, LAND], [d, {}]]);
  ACT.gsShoulder = (b, t, th, d) => keys(b, t, [[th - 0.02, SHOULDER], [th + 0.12, SHOULDER], [d, {}]]);
  ACT.gsBuck = (b, t, th, d) => keys(b, t, [[0.14, BUCKIN], [0.26, BUCK], [0.32, BUCKIN], [0.38, BUCK], [0.5, BUCK], [d, {}]]);
  ACT.gsThrow = (b, t, th, d) => keys(b, t, [[0.12, THROWUP], [0.2, THROW], [0.32, THROW], [d, {}]]);
  // the EX: a run-up, the drop kick, a spring back off the enemy, the second drop kick, the landing
  ACT.gsEx = (b, t, th, d) => keys(b, t, [[0.16, CROUCH], [0.3, DROP], [0.46, DROP], [0.56, CROUCH], [0.7, DROP], [0.86, DROP], [0.98, LAND], [1.08, LAND], [d, {}]]);
  // Golshi Theater: the sack over its head then a kick; the mustard; behind it, hands over its eyes, then the kick
  ACT.gsSack = (b, t, th, d) => keys(b, t, [[0.24, SACKUP], [0.32, SACKDN], [0.44, SACKDN], [0.54, CHAMBER], [0.62, KICKR], [0.74, KICKR], [d, {}]]);
  ACT.gsMustard = (b, t, th, d) => keys(b, t, [[0.24, FEEDUP], [0.34, FEED], [0.55, FEED], [d, {}]]);
  ACT.gsGuess = (b, t, th, d) => keys(b, t, [[0.3, COVER], [0.52, COVER], [0.66, CHAMBER], [0.78, KICKR], [0.9, KICKR], [d, {}]]);
  // Gold Ship Has Arrived!: up out of sight, down in a drop kick, then a spinning kick
  ACT.gsArrive = (b, t, th, d) => add(keys(b, t, [[0.2, CROUCH], [0.36, DROP], [0.66, DROP], [0.76, LAND], [0.88, CHAMBER], [0.98, BACKK], [1.1, BACKK], [d, {}]]), turn(t, 0.84, 1.0));
  // Anchors Aweigh!: the crouch at the gate, the long-spurt lap, the drop kick, the landing
  const ULT_K = [[0.28, CROUCH]];
  for (let i = 0, tt = 0.36; tt < 1.3; i++, tt += 0.09) ULT_K.push([tt, i % 2 ? RUNA : RUNB]);
  ULT_K.push([1.4, CROUCH], [1.56, DROP], [1.8, DROP], [1.96, LAND], [2.1, LAND], [2.3, {}]);
  ACT.gsUlt = (b, t) => keys(b, t, ULT_K);
  // 12 Billion Yen Rear: a knee, up on her hind legs, and down
  ACT.gsRear = (b, t, th, d) => keys(b, t, [[0.22, CHAMBER], [0.3, KICKR], [0.44, REAR], [0.56, REAR], [0.64, SLAM], [0.8, SLAM], [d, {}]]);
  // Gatekept: braced, forearms crossed, going nowhere
  ACT.gsParry = b => add(b, GUARD);

  /* ------------------------------------------------------------- effects --
     gsKick: the arc of a kick (pale gold, a white core). gsImpact: a drop
     kick or stomp landing (red and gold rings, dust, a shake). gsCube: her
     Rubik's cube flying at the enemy; gsPop: it bursting in its colours.
     gsBeam: a gold beam marking where she will land. gsAnchor: the giant
     anchor falling. gsGate: the parry. The sack (Into the Sack) and the
     mustard (Hot Mustard) are put on the enemy her hit landed on: sackOn,
     spice (from mech.hit). */
  const _v = new THREE.Vector3();
  const PROTO = {};
  const SCALE = { sack: 0.075, cube: 0.07, anchor: 0.15 };
  const protoObj = k => PROTO[k] || (PROTO[k] = (() => { const g = new VX.Grid(); DRAW[k](g); return VX.object(g, SCALE[k], { cast: false }); })());
  const aim = (a, A, tgt, d) => ({ x: tgt ? tgt.x : a.x + Math.sin(A.dir) * (d || 1.6), z: tgt ? tgt.z : a.z + Math.cos(A.dir) * (d || 1.6) });
  CHOREO.events.gsKick = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 0.9) + (a.airY || 0), r = e.r || 2.0, arc = e.arc || 2.2, sweep = e.sweep || 1.0, tilt = e.tilt || 0;
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, e.col || KICK, { tilt, arc, width: e.big ? 0.55 : 0.4, life: 0.24, sweep });
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r * 0.85, dir, 0xffffff, { tilt, arc: arc * 0.9, width: 0.14, life: 0.18, sweep });
    if (e.big) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.12);
  };
  CHOREO.events.gsImpact = (a, A, e, tgt) => {
    const P = e.at === 'front' ? { x: a.x + Math.sin(A.dir) * 1.0, z: a.z + Math.cos(A.dir) * 1.0 } : aim(a, A, tgt, 1.4), r = e.r || 2.2;
    FX.named('quake', { x: P.x, z: P.z, r });
    FX.ring(P.x, P.z, 0.3, r * 1.1, RED, 0.35); FX.ring(P.x, P.z, 0.3, r * 0.7, GOLDC, 0.3);
    FX.burst(P.x, 1.0, P.z, e.big ? 40 : 18, { col: [0xffffff, RED, GOLDC, KICK], speed: e.big ? 8 : 5, size: 0.12, life: 0.45, g: 3, up: 1 });
    FX.glow(P.x, 1.0, P.z, e.big ? 2.6 : 1.5, GOLDC, 0.25, { size1: e.big ? 4.2 : 2.4 });
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.32 : 0.14); if (e.big) SFX.play('boom');
  };
  CHOREO.events.gsCube = (a, A, e, tgt) => {
    BT.sock(a, 'hand', _v); const p0 = _v.clone(), P = aim(a, A, tgt, 6), y1 = tgt ? (tgt.height || 1.6) * 0.6 : 1.0, T = e.dur || 0.1;
    const o = protoObj('cube').clone(); o.position.copy(p0);
    FX.custom(o, T, (k, dt, obj) => { obj.position.set(p0.x + (P.x - p0.x) * k, p0.y + (y1 - p0.y) * k + Math.sin(k * PI) * 0.4, p0.z + (P.z - p0.z) * k); obj.rotation.x += dt * 25; obj.rotation.y += dt * 18; });
  };
  CHOREO.events.gsPop = (a, A, e, tgt) => {
    const P = aim(a, A, tgt, 6), y = tgt ? (tgt.height || 1.6) * 0.6 : 1.0;
    FX.burst(P.x, y, P.z, 22, { col: [0xf6f6f6, 0xf2d01a, 0xd8202a, 0xf27a1a, 0x1aa84a, 0x1a4ad8], glow: false, speed: 5, size: 0.1, life: 0.5, g: 8 });
    FX.glow(P.x, y, P.z, 1.2, 0xffffff, 0.15, { size1: 2 });
  };
  CHOREO.events.gsBeam = (a, A, e, tgt) => {
    const P = aim(a, A, tgt, 2);
    FX.beam(new THREE.Vector3(P.x, 9, P.z), new THREE.Vector3(P.x, 0.2, P.z), GOLDC, 0.3, 0.35); FX.beam(new THREE.Vector3(P.x, 9, P.z), new THREE.Vector3(P.x, 0.2, P.z), 0xffffff, 0.1, 0.3);
    FX.ring(P.x, P.z, 0.4, 2.4, GOLDC, 0.5);
  };
  CHOREO.events.gsGuess = (a, A, e, tgt) => {
    if (!tgt) return; const y = (tgt.height || 1.6) + 0.3;
    FX.glow(tgt.x, y - 0.3, tgt.z, 1.4, GOLDC, 0.25, { size1: 2 });
    FX.number(tgt.x, y + 0.3, tgt.z, 'GUESS WHO?', 'miss', '#e9da36');
  };
  CHOREO.events.gsAnchor = (a, A, e, tgt) => {
    const P = aim(a, A, tgt, 2), T = e.dur || 0.28, o = protoObj('anchor').clone();
    o.rotation.y = A.dir; o.position.set(P.x, 9, P.z);
    FX.custom(o, T + 0.9, (k, dt, obj) => {
      const t = k * (T + 0.9), f = Math.min(1, t / T);
      obj.position.set(P.x, 9 * (1 - f * f) + 1.0 - (t > T ? Math.min(0.5, (t - T) * 0.6) : 0), P.z);
      if (t > T + 0.6) obj.scale.setScalar(Math.max(0.01, 1 - (t - T - 0.6) / 0.3));
    });
  };
  CHOREO.events.gsGate = a => {
    BT.sock(a, 'chest', _v);
    FX.glow(_v.x, _v.y, _v.z, 1.8, RED, 0.22, { size1: 2.8 }); FX.ring(a.x, a.z, 0.3, 1.8, GOLDC, 0.3);
    FX.burst(_v.x, _v.y, _v.z, 16, { col: [0xffffff, RED, GOLDC], speed: 5, size: 0.1, life: 0.3, g: 2 });
  };
  // the sack over a Bagged enemy's head, for as long as it is Bagged
  function sackOn(v) {
    if (v.gsSack) FX.kill(v.gsSack);
    const o = protoObj('sack').clone(), s = clamp((v.height || 1.6) / 1.6, 0.8, 2.2);
    o.scale.setScalar(s); o.position.set(v.x, (v.height || 1.6) * 0.78, v.z);
    v.gsSack = FX.custom(o, BAG_T, (k, dt, obj) => {
      const B = BT.B;
      if (!B || !v.alive || !(v.gsBag > B.t)) { obj.visible = false; return; }
      obj.position.set(v.x, (v.height || 1.6) * 0.78 + (v.airY || 0) + Math.sin(B.t * 9) * 0.03, v.z);
      obj.rotation.y = v.face || 0; obj.rotation.z = Math.sin(B.t * 5) * 0.12;
    });
    FX.burst(v.x, (v.height || 1.6) * 0.8, v.z, 14, { col: [0xa07a4a, 0x8a6438, 0xd8c49a], glow: false, speed: 3, size: 0.1, life: 0.4, g: 6 });
  }
  // a mouthful of hot mustard: yellow, then the heat
  function spice(v) {
    const y = (v.height || 1.6) * 0.85;
    FX.burst(v.x, y, v.z, 26, { col: [0xffd23a, 0xf2c81a, 0xffffff], speed: 5, size: 0.12, life: 0.45, g: 2 });
    FX.burst(v.x, y + 0.2, v.z, 14, { col: [0xff6a2a, 0xff3a1a], speed: 3, size: 0.14, life: 0.6, g: -2, up: 1.5 });
    FX.glow(v.x, y, v.z, 1.6, 0xffd23a, 0.25, { size1: 2.6 });
    FX.number(v.x, y + 0.8, v.z, 'HOT!!', 'miss', '#ffd23a');
  }

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const kick = (t, o) => Object.assign({ t, fx: 'gsKick' }, o || {});
  const boom = (t, o) => Object.assign({ t, fx: 'gsImpact' }, o || {});
  const UPK = { y: 1.0, tilt: 1.3, sweep: -1.2 };                                 // a rising kick: an upward arc
  const AFT = { kind: 'afterimage', col: 0xff8a9a };
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.13, kind: 'fwd', d: 0.45 }], events: [kick(0.14, UPK)] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.18, kind: 'fwd', d: 0.4 }], events: [kick(0.2, { y: 1.0, tilt: 0.1, arc: 4.5, sweep: 2.4 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.36, kind: 'fwd', d: 0.5, ease: 'lin' }], events: [{ t: 0.18, fx: 'dust' }, boom(0.18, { at: 'front', r: 1.4 }), { t: 0.38, fx: 'dust' }, boom(0.38, { at: 'front', r: 1.6 })] });
  set(K.basic[3], { motion: [{ t0: 0.1, t1: 0.5, kind: 'leap', h: 0.9, d: 1.0 }], events: [kick(0.3, { y: 1.2, tilt: 0.3 }), { t: 0.52, fx: 'dust' }, boom(0.52, { at: 'front', r: 2.2 })] });
  for (const k of ['sack', 'mustard']) set(K[k], { motion: [{ t0: 0.02, t1: 0.26, kind: 'fwd', d: 0.6 }] });
  K.sack.events = [boom(0.32, { at: 'front', r: 1.2 }), kick(0.62, Object.assign({ big: true }, UPK)), boom(0.62, { at: 'front', r: 1.8 })];
  K.mustard.events = [kick(0.34, { y: 1.3, tilt: -0.2, r: 1.6, arc: 1.6, col: 0xffd23a })];
  set(K.guess, { motion: [{ t0: 0.04, t1: 0.34, kind: 'orbit', ang: PI, gap: 0.8, side: 'auto' }], stream: [Object.assign({ t0: 0.04, t1: 0.34 }, AFT)],
    events: [{ t: 0.42, fx: 'gsGuess' }, kick(0.78, Object.assign({ big: true }, UPK)), boom(0.78, { at: 'front', r: 2.2, big: true })] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.0 }], stream: [Object.assign({ t0: 0, t1: 0.2 }, AFT), { t0: 0, t1: 0.2, kind: 'dust' }], events: [boom(0.22, { at: 'front', r: 1.6 })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 0.9, side: 'auto' }, { t0: 0.1, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [Object.assign({ t0: 0, t1: 0.22 }, AFT)],
    events: [kick(0.26, { y: 0.8, tilt: -0.2, arc: 2.0 }), kick(0.38, { y: 0.9, tilt: 0.2, arc: 2.0, big: true }), boom(0.38, { at: 'front', r: 2.0 })] });
  set(K.special, { motion: [{ t0: 0.3, t1: 0.42, kind: 'back', d: 0.3 }], events: [{ t: 0.16, fx: 'gsCube', dur: 0.1 }, { t: 0.26, fx: 'gsPop' }] });
  set(K.ex, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.8 }, { t0: 0.22, t1: 0.52, kind: 'leap', h: 1.0, toTarget: true }, { t0: 0.5, t1: 0.6, kind: 'back', d: 1.2 }, { t0: 0.6, t1: 0.94, kind: 'leap', h: 1.4, toTarget: true }],
    stream: [{ t0: 0, t1: 0.2, kind: 'dust' }, Object.assign({ t0: 0, t1: 0.94 }, AFT)],
    events: [boom(0.44, { r: 2.4 }), boom(0.84, { r: 2.8, big: true }), { t: 0.84, fx: 'whiteFlash' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'rise', h: 3.2 }, { t0: 0.3, t1: 0.62, kind: 'toTarget', gap: 0.9 }, { t0: 0.36, t1: 0.66, kind: 'fall' }],
    stream: [Object.assign({ t0: 0.3, t1: 0.66 }, AFT)],
    events: [{ t: 0.12, fx: 'gsBeam' }, boom(0.66, { r: 2.6, big: true }), kick(0.98, { y: 0.9, tilt: 0.08, arc: 5.8, sweep: 2.6, big: true }), boom(0.98, { at: 'front', r: 3.0, big: true }), { t: 0.98, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0.3, t1: 1.25, kind: 'orbit', ang: PI * 2, gap: 1.6, side: 'auto', ease: 'lin' }, { t0: 1.32, t1: 1.86, kind: 'leap', h: 2.2, toTarget: true }],
    stream: [{ t0: 0.3, t1: 1.25, kind: 'dust' }, { t0: 0.3, t1: 1.86, kind: 'afterimage', col: GOLDC }],
    events: [{ t: 0.1, fx: 'dust' }].concat(UT.map((t, i) => kick(t, { y: 0.9, tilt: i % 2 ? 0.3 : -0.3, arc: 2.0, col: i % 2 ? KICK : GOLDC })))
      .concat([{ t: 1.5, fx: 'gsAnchor', dur: 0.28 }, boom(1.78, { r: 4.6, big: true }), { t: 1.78, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [Object.assign({ t0: 0, t1: 0.22 }, AFT)],
    events: [kick(0.3, UPK), { t: 0.64, fx: 'dust' }, boom(0.64, { at: 'front', r: 2.6, big: true })] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.3, kind: 'leap', h: 1.4, toTarget: true }], stream: [Object.assign({ t0: 0, t1: 0.3 }, AFT)], events: [kick(0.3, { y: 1.1, tilt: 0.3, big: true }), boom(0.3, { at: 'front', r: 1.8 })] });
  set(K.assist, { events: [{ t: 0.05, fx: 'gsGate' }] });
})();
