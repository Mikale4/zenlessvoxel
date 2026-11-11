/* ============================================================================
   agents/nekomata.js -- Nekomiya Mana, "Nekomata", the third member of the
   Cunning Hares (Gentle House): a cat Thiren with two tails, once of the Red
   Fang Gang. S-Rank, Physical, Attack, Defensive Assist. Released in
   Version 1.0.
   (How an Agent's own file works, its hooks and its helpers: agents/zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Nekomata, Lore, Dialogue, DMs, Voice-Overs,
   Steel Cushion; each of her skill pages: Basic Attack: Kitty Slash / Crimson
   Blade, Dodge: Can't Touch Me-ow~, Dash Attack: Over Here!, Dodge Counter:
   Phantom Claws, Special Attack: Surprise Attack, EX Special Attack: Super
   Surprise Attack!, Chain Attack: Claw Swipe, Ultimate: Claw Smash, Quick
   Assist: Cat's Paw, Defensive Assist: Desperate Defense, Assist Follow-Up:
   Shadow Strike, Core Passive: Stealthy Paws, Additional Ability: Catwalk; the
   trust commissions Who Doesn't Love Kittens?, I'm So, So, So Bored, I Love
   Watching You Shop; the wish events Kitty and Kitty, Fixed Call, Wishing
   Barrel, Battle Between Cats and Dogs), zzz.gachabase.net (datamine, agent
   1021: multipliers, Buildup, the hit-by-hit split of every move and which
   hits are heavy, the EX's cost), Game8, the official portrait, in-game and
   city models and the Agent Intro graphics.

   Her kit (official):
     Basic Attack: Kitty Slash       5 slashes. On the last hit, a 33.33%
                                     chance it repeats 3 times.
     Basic Attack: Crimson Blade     hold Basic during the first 3 hits: she
                                     slashes the enemies ahead and passes
                                     through them. When it starts, a 33.33%
                                     chance it repeats 3 times.
     Dash Attack: Over Here!         Dodge Counter: Phantom Claws
     Special Attack: Surprise Attack a downward strike (Anti-Interrupt)
     EX Special Attack: Super Surprise Attack!   40 Energy: a falling slash
     Chain Attack: Claw Swipe        Ultimate: Claw Smash (slashes ahead, a
                                     large area)
     Quick Assist: Cat's Paw         Defensive Assist: Desperate Defense
     Assist Follow-Up: Shadow Strike (a charge and a slash)
     Core Passive: Stealthy Paws     when her Dodge Counter or Quick Assist
                                     hits: her DMG +60% for 6 s (core level 7)
     Additional Ability: Catwalk     with another Physical Agent or a Cunning
                                     Hare: after anyone inflicts Assault, her
                                     next EX deals 35% more DMG (2 stacks)
   Our choices where no source says (the report lists them): a repeat is the
   whole hit again, 3 more times, 0.14 s apart, on the enemies it hit (the
   later Potential text says "three additional times"); Crimson Blade comes
   from Basic held after the 1st, 2nd or 3rd hit and takes the place of the
   next step of the string; Catwalk's stacks are spent by the EX. NOT
   included: her Potential Vision (Purr Energy, Disappearing Tail, Fluffy
   Piercing Claw, Pawpad Ambush) and Mindscapes.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // a share k of a move's official total [DMG%, Daze%, Anomaly Buildup] (the datamine splits each move over its hits)
  const part = (t, k, T, o) => hit(t, T[0] * k, T[1] * k, Math.round(T[2] * k * 100) / 100, o);
  // official level-12 totals (gachabase skill_data: base + 11 steps; Buildup /100; the wiki's tables agree)
  const B1 = [111.3, 27.9, 17.08], B2 = [125.3, 55.8, 35.24], B3 = [146.4, 70.9, 44.40], B4 = [340.7, 156.5, 98.73], B5 = [247.9, 88.6, 56.02];
  const CB = [144.4, 88.6, 56.02], DA = [70.3, 26.4, 16.68], DC = [456.7, 299.6, 89.96], SP = [94.6, 71.5, 45.01], EXM = [1079.8, 683.1, 430.73];
  const CHM = [1073.0, 239.5, 367.86], ULM = [3143.0, 177.5, 124.96], QAM = [189.1, 141.8, 89.96], FUM = [601.8, 387.9, 265.92];
  const PARRY = 388.8;                                 // Desperate Defense: Light Defensive Daze (Heavy 491.2, Chain 239.6), official, unscaled
  const PAWS = 0.6, PAWS_T = 6;                        // Stealthy Paws at core level 7
  const CAT = 0.35, CAT_MAX = 2;                       // Catwalk
  const REP_P = 1 / 3, REP_N = 3, REP_GAP = 0.14;      // the repeats (the gap: our choice)
  const WIN = 0.9;                                     // the string's window (as for everyone)
  // the datamined split of each move over its hits
  const SSP = [1 / 6, 1 / 6, 1 / 6, 1 / 4, 1 / 4], SEX = [1 / 9, 1 / 9, 1 / 9, 1 / 6, 1 / 6, 1 / 6, 1 / 6];
  const SCH = [2 / 11, 1 / 11, 1 / 11, 1 / 11, 1 / 11, 1 / 11, 1 / 11, 1 / 11, 2 / 11], SFU = [1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 4, 1 / 4];
  // when the hits land (ours: the skill texts set the shape of each move, not its timing)
  const T1 = [0.12, 0.2], T2 = [0.14, 0.22], T3 = [0.14, 0.24, 0.34], T4 = [0.12, 0.22, 0.32, 0.44, 0.54], T5 = [0.3, 0.4];
  const TCB = [0.16, 0.24], TDA = [0.18, 0.26], TDC = [0.16, 0.22, 0.28, 0.36, 0.44, 0.56], TSP = [0.36, 0.41, 0.46, 0.52, 0.6];
  const TEX = [0.42, 0.48, 0.54, 0.7, 0.76, 0.84, 0.92], TCH = [0.3, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72, 0.8, 1.0];
  const TUL = [0.55, 0.7, 0.85, 1.0, 1.15, 1.3, 1.45, 1.6, 1.85], TFU = [0.24, 0.3, 0.36, 0.42, 0.58, 0.72];
  // her slashes: crimson, white-hot at the core; the afterimage of a cat in a hurry
  const CRIM = 0xff3a4a, CRIM2 = 0xff8a90, HOTW = 0xfff0f0, AFT = 0xd05060;
  // the knife (in her hand in battle, two in holsters on her greaves) and the rope on it: official portrait, sampled
  const STEEL = 0xa3acb5, STEEL2 = 0x969da9, SPINE = 0x6a717b, EDGE = 0xcdd4da, HILT = 0x742e35, HILT2 = 0x3e252d, ROPE = 0xeaeaec, ROPE2 = 0xc4c2c8, ROPEO = 0xd78e53;

  /* ----------------------------------------------------------------- kit -- */
  const arcO = (r, arc, o) => Object.assign({ shape: 'arc', r, arc }, o || {});
  const last = (i, n, o) => (i === n - 1 ? o : {});
  // a repeat: the whole hit again (the 5th hit's two slashes, Crimson Blade's two), mech.hit queues them
  const REP5 = hit(0, B5[0], B5[1], B5[2], { heavy: true, kb: 0.3 }), REPC = hit(0, CB[0], CB[1], CB[2], { kb: 0.2 });
  const BA = 'Basic Attack: Kitty Slash';
  const K = {
    basic: [
      { name: BA, anim: 'nmCut1', dur: 0.42, cancel: 0.3, reach: 1.7, range: 1.4, hits: T1.map(t => part(t, 0.5, B1, arcO(2.1, 130))) },
      { name: BA, anim: 'nmCut2', dur: 0.46, cancel: 0.32, reach: 1.7, range: 1.4, hits: T2.map(t => part(t, 0.5, B2, arcO(2.1, 130))) },
      { name: BA, anim: 'nmSpin', dur: 0.62, cancel: 0.46, reach: 1.8, range: 1.4, hits: T3.map(t => part(t, 1 / 3, B3, { shape: 'circle', at: 'self', r: 2.3 })) },
      { name: BA, anim: 'nmFlurry', dur: 0.85, cancel: 0.66, reach: 1.8, range: 1.4, hits: T4.map(t => part(t, 0.2, B4, arcO(2.3, 140))) },
      // the 5th: up and a cut down, its second slash heavy; nmRep: the last hit, which may repeat
      { name: BA, anim: 'nmDrop', dur: 0.85, cancel: 0.68, reach: 1.9, range: 1.4, nmRepHit: REP5,
        hits: T5.map((t, i) => part(t, 0.5, B5, Object.assign({ shape: 'circle', at: 'front', r: 2.3 }, last(i, 2, { heavy: true, kb: 1.0, nmRep: true })))) },
    ],
    // held during the first 3 hits (resolve): a dash that cuts through; nmRoll: its chance is rolled as it starts
    crimson: { name: 'Basic Attack: Crimson Blade', anim: 'nmPierce', dur: 0.62, cancel: 0.48, reach: 3.2, range: 1.8, nmRoll: true, nmRepHit: REPC,
      hits: TCB.map((t, i) => part(t, 0.5, CB, Object.assign({ shape: 'line', r: 1.0, len: 4.5 }, last(i, 2, { nmRep: true })))) },
    dash: { name: 'Dash Attack: Over Here!', anim: 'nmPierce', dur: 0.5, cancel: 0.38, reach: 6, range: 1.6, hits: TDA.map(t => part(t, 0.5, DA, arcO(2.2, 140))) },
    counter: { name: 'Dodge Counter: Phantom Claws', anim: 'nmClaws', dur: 0.78, cancel: 0.62, reach: 2.0, inv: [0, 0.72],
      hits: TDC.map((t, i) => part(t, 1 / 6, DC, arcO(2.5, 150, last(i, 6, { heavy: true, kb: 0.9 })))) },
    special: { name: 'Special Attack: Surprise Attack', anim: 'nmDrop', dur: 0.74, cancel: 0.58, reach: 2.6, range: 1.6, cd: 1.2, dr: 0.4,
      hits: TSP.map((t, i) => part(t, SSP[i], SP, Object.assign({ shape: 'circle', at: 'front', r: 2.2 }, last(i, 5, { heavy: true, kb: 0.7 })))) },
    // three slashes as she twirls in the air, then the fall (the last two heavy)
    ex: { name: 'EX Special Attack: Super Surprise Attack!', anim: 'nmFall', dur: 1.15, cancel: 1.0, cost: 40, reach: 3.2, range: 1.8, inv: [0, 1.05],
      hits: TEX.map((t, i) => part(t, SEX[i], EXM, i < 3 ? arcO(2.6, 160) : Object.assign({ shape: 'circle', at: 'front', r: 2.8 }, i >= 5 ? { heavy: true, kb: i === 6 ? 1.3 : 0.6 } : {}))) },
    chain: { name: 'Chain Attack: Claw Swipe', anim: 'nmChain', dur: 1.35, inv: [0, 1.35],
      hits: TCH.map((t, i) => part(t, SCH[i], CHM, Object.assign({ shape: 'cone', r: 4.2, arc: 110 }, last(i, 9, { heavy: true, kb: 1.2 })))) },
    ult: { name: 'Ultimate: Claw Smash', anim: 'nmUlt', dur: 2.2, inv: [0, 2.2],
      hits: TUL.map((t, i) => part(t, 1 / 9, ULM, Object.assign({ shape: 'circle', at: 'target', r: i < 8 ? 3.4 : 4.2 }, last(i, 9, { heavy: true, kb: 1.6 })))) },
    // Desperate Defense: the Light Defensive Daze, official and unscaled (battle.js adds 20% against a heavy blow)
    assist: { name: 'Defensive Assist: Desperate Defense', type: 'defensive', anim: 'nmParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(PARRY) },
    followup: { name: 'Assist Follow-Up: Shadow Strike', anim: 'nmFollow', dur: 1.05, inv: [0, 1.0], reach: 3,
      hits: TFU.map((t, i) => part(t, SFU[i], FUM, arcO(2.5, 150, last(i, 6, { heavy: true, kb: 1.1 })))) },
    quick: { name: 'Quick Assist: Cat\'s Paw', anim: 'nmClaws', dur: 0.78, inv: [0, 0.72],
      hits: TDC.map((t, i) => part(t, 1 / 6, QAM, arcO(2.5, 150, last(i, 6, { heavy: true, kb: 0.7 })))) },
  };

  /* ----------------------------------------------------- her mechanics -- */
  const isPhys = attr => attr === 'physical' || !!(D.ATTR[attr] && D.ATTR[attr].as === 'physical');
  // a phantom of the cut, at the enemy it repeats on
  function phantom(v, dir) {
    const y = (v.height || 1.6) * 0.55, s = Math.random() < 0.5 ? -1 : 1;
    FX.slash(v.x - Math.sin(dir) * 1.4, y, v.z - Math.cos(dir) * 1.4, 1.9, dir, CRIM, { tilt: s * rnd(0.6, 1.2), arc: 1.7, width: 0.14, life: 0.24, sweep: 1.3 });
    FX.glow(v.x, y, v.z, 1.2, CRIM2, 0.15);
  }
  function runRepeats(a) {
    const B = BT.B;
    for (let i = a.nmReps.length - 1; i >= 0; i--) {
      const r = a.nmReps[i]; if (r.at > B.t) continue;
      a.nmReps.splice(i, 1);
      if (!r.v.alive) continue;
      phantom(r.v, r.dir); SFX.play('swing');
      BT.applyHit(a, r.v, r.h, { kind: 'basic', def: { name: r.name + ' (repeat)', hits: [] }, data: {}, dir: r.dir, t: 0, tgt: null }, 'physical');
    }
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.nekomata = {
    id: 'nekomata', name: 'Nekomiya Mana', short: 'Nekomata', faction: 'Cunning Hares', spec: 'Attack', attr: 'physical', rank: 'S',
    color: '#b64434', color2: '#3e4448', assist: 'defensive', stance: 'nekomata',
    blurb: 'The Cunning Hares\' third member: a two-tailed cat Thiren, once of the Red Fang Gang, who loves mackerel, pranks and other people\'s wallets. She weaves through enemies with her knife and claws: her Dodge Counter or Quick Assist makes every hit after it 60% stronger, and her cheap EX drops on them from above.',
    // Lv60 with core (gachabase): HP 7,560, ATK 910, DEF 587, Impact 92, Anomaly Mastery 97, Proficiency 96, CRIT 19.4% / 50%,
    // Energy Regen 1.2. On this game's scale
    stats: { hp: 8470, atk: 3070, def: 628, impact: 92, ap: 96, am: 97, cr: 0.49, cd: 0.9, er: 1.2, speed: 4.9 },
    ai: { range: 1.6, dodge: 0.82, reflex: 0.66, aggr: 1.05 },
    energyMax: 120,
    core: [
      ['Core Passive: Stealthy Paws', 'When her Dodge Counter or Quick Assist hits an enemy, Nekomata deals 60% more DMG for 6 s.'],
      ['Crimson Blade and the repeats', 'Hold Basic during the first three hits of Kitty Slash for Basic Attack: Crimson Blade: she slashes the enemies ahead and passes through them. When Crimson Blade starts, and when the last hit of Kitty Slash lands, there is a 1-in-3 chance the attack repeats three more times.'],
      ['Additional Ability: Catwalk', 'With another Physical Agent or a Cunning Hares member in the squad: each time anyone inflicts Assault, her next EX Special Attack deals 35% more DMG (up to 2 stacks; the EX spends them).'],
    ],
    kit: K,
    kitShow: [['Hold (hits 1-3)', 'crimson']],
    rivalMoves: [{ k: 'crimson', kind: 'basic', p: 0.25, cd: 4 }],
    howto: 'Nekomata: hold Basic during the first three hits of her string for Crimson Blade, a slash that cuts through the enemies ahead; Crimson Blade and the last hit of her string each have a 1-in-3 chance to repeat three more times. When her Dodge Counter or Quick Assist hits, she deals 60% more DMG for 6 s (Stealthy Paws). With another Physical Agent or a Cunning Hare in the squad, every Assault adds 35% to her next EX (up to 2). Her EX costs only 40 Energy. Her assist is a Defensive Assist: she parries, then Basic for Shadow Strike.',
    mech: {
      // nmPaws: until when Stealthy Paws lasts; nmCat: Catwalk stacks (nmCatOK: it holds); nmReps: repeats waiting to land
      init(a) { Object.assign(a, { nmPaws: 0, nmCat: 0, nmCatOK: false, nmReps: [] }); hookUp(); },
      squad(a, B) { a.nmCatOK = B.squad.some(s => s !== a && (isPhys(s.def.attr) || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        // Crimson Blade: its chance is rolled upon activation
        if (def.nmRoll) A.data.nmRoll = Math.random() < REP_P;
        // Catwalk: the EX spends the stacks
        if (A.kind === 'ex' && a.nmCat > 0) { A.data.nmCat = a.nmCat; BT.log(`Nekomata: Catwalk! ${def.name.replace('EX Special Attack: ', '')} +${Math.round(CAT * 100 * a.nmCat)}% DMG.`, 'skill'); a.nmCat = 0; }
        // AUTO (yours are your own presses): now and then, Crimson Blade in place of the next step of the first three
        const bot = !A.data.manual && !!a.queue && !a.rival, i = K.basic.indexOf(def);
        if (bot && i >= 0 && i <= 2 && !a.queue.length && Math.random() < 0.22) a.queue.push({ def: K.crimson, kind: 'basic', step: i + 1, delay: 0.02, tgt: A.tgt && A.tgt.alive ? A.tgt : null });
      },
      // Stealthy Paws when the Dodge Counter or Quick Assist hits; the last hit of the string (and Crimson Blade) may repeat
      hit(a, v, h, A) {
        const B = BT.B; if (!B || a.rival || !A || !A.data) return;
        if ((A.kind === 'counter' || A.kind === 'quick') && !A.data.nmP) {
          A.data.nmP = true;
          if (!(a.nmPaws > B.t)) BT.log('Nekomata: Stealthy Paws! +60% DMG for 6 s.', 'skill');
          a.nmPaws = B.t + PAWS_T;
        }
        if (h.nmRep && A.def.nmRepHit) {
          if (A.data.nmRoll == null) A.data.nmRoll = Math.random() < REP_P;
          if (!A.data.nmRoll) return;
          if (!A.data.nmSaid) { A.data.nmSaid = true; BT.callout('×3 REPEAT', 'skill', A.def.name.replace('Basic Attack: ', '')); }
          for (let n = 1; n <= REP_N; n++) a.nmReps.push({ at: B.t + REP_GAP * n, v, h: A.def.nmRepHit, dir: A.dir, name: A.def.name });
        }
      },
      mods(a, v, h, A) {
        const B = BT.B; if (!B) return {};
        return { dmg: (a.nmPaws > B.t ? PAWS : 0) + (A && A.data && A.data.nmCat ? CAT * A.data.nmCat : 0) };
      },
      // Catwalk: an Assault from anyone in the squad
      anomaly(a, src, v, type) {
        if (type !== 'assault' || !a.nmCatOK || a.rival || a.nmCat >= CAT_MAX) return;
        a.nmCat++; BT.log(`Nekomata: Catwalk ×${a.nmCat} (her next EX +${Math.round(CAT * 100 * a.nmCat)}% DMG).`, 'skill');
      },
      tick(a, dt) {
        const B = BT.B; if (!B || a.rival) return;
        if (B.result) { a.nmReps.length = 0; return; }
        if (a.nmReps.length) runRepeats(a);
      },
      // Basic held after the 1st, 2nd or 3rd hit of the string: Crimson Blade (in place of the next step)
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || !hold || c.dash) return null;
        const step = c.step != null ? c.step : c.t - a.lastBasic > WIN ? 0 : a.combo;
        return step >= 1 && step <= 3 ? { def: K.crimson, kind: 'basic', step } : null;
      },
      // AUTO: her EX is cheap; she spends it on a Stun, with Catwalk stacks, or when the bar fills
      ai(a, tgt, B) {
        if (a.energy >= K.ex.cost && (a.nmCat > 0 || tgt.stun > 0 || a.energy >= 90 || Math.random() < 0.08)) return { btn: 'special' };
        return null;
      },
      hud(a, B) {
        const r = [], step = B.t - a.lastBasic > WIN ? 0 : a.combo;
        if (step >= 1 && step <= 3 && !(a.act && a.act.def === K.crimson)) r.push('HOLD BASIC: CRIMSON BLADE');
        if (a.nmPaws > B.t) r.push(`STEALTHY PAWS +60% DMG ${Math.ceil(a.nmPaws - B.t)}s`);
        if (a.nmCatOK) r.push(`CATWALK ${'●'.repeat(a.nmCat)}${'○'.repeat(CAT_MAX - a.nmCat)}${a.nmCat ? ` · NEXT EX +${Math.round(CAT * 100 * a.nmCat)}%` : ''}`);
        if (a.nmReps.length) r.push('REPEAT!');
        return r;
      },
    },
    town: {
      // Sixth Street: every one of her trust events is there (Random Play's door at noon; on and behind the truck by the 141;
      // outside Coff Cafe with a Mint Espresso; Box Galaxy and the wallets across the road from it; Waterfall Soup, in front
      // and behind; the alley behind Godfinger; Howl's newsstand with Nicole), her Quality Time (Snake Duel at Godfinger,
      // Box Galaxy's gacha, Turbo's roof, Mr. Panda, Officer Mewmew, the bins behind Godfinger) and her trust invites (Cookie
      // behind Godfinger, the 141, Random Play). Lumina Square has only outings (the playground, the graffiti wall).
      home: 'sixth',
      // mornings with the strays by Box Galaxy and the newsstand, the bins in the back alley, black coffee; afternoons napping on
      // the truck by the 141, at Random Play's door, watching wallets across from Box Galaxy, waiting for a free buffet;
      // evenings at Godfinger's cabinets, Box Galaxy's claw machine, noodles; late nights prowling: the bins, the cats, the truck,
      // and the payphone where she hears about mackerel
      routine: ['box:cats 20, news:read 20, back:dumpster 15, cafe:t 15, huddle 30', '141:truck 30, rp:door 15, box:statue 15, soup:queue 15, huddle 25', 'gf:cab 30, box:claw 20, soup:stool 20, huddle 30', 'back:dumpster 30, box:cats 25, 141:truck 25, alley:phone 20'],
      chatter: ['Mackerel... somewhere close. I can smell it.', 'So many wallets out today~ Kidding! Mostly.'],
      lines: [
        'Nekomiya Mana, but call me Nekomata~ Third member of the Cunning Hares. ...Your wallet\'s sticking out, by the way. Just saying!',
        'Black coffee. No sugar, no foam. Sweet stuff is for kids. I may look young, but I\'m a seasoned veteran of the streets.',
        'Cookie\'s the real celebrity on Sixth Street, I just bring the treats. And Howl? Flat fur, stiff legs, so loud. Cats are better, m\'kay?',
      ],
      chapters: [
        { title: 'Who doesn\'t love kittens?', ask: ['Proxy! Cookie\'s out today. You know Cookie? Grey tabby, the most famous cat on Sixth Street. A total celebrity.', 'Officer Mewmew keeps snacks for the strays. Ask the big guy for some and go say hi to Cookie for me~ Cat treats, not dried fish. She hates dried fish.'],
          steps: [{ t: 'talk', to: 'mewmew', reply: 'Snacks for the little citizens of Sixth Street? Mew! Officer Mewmew never patrols without them. One pouch of cat treats. Share fairly, citizen!' },
            { t: 'talk', to: 'cookie', reply: '(Cookie hears the pouch rustle, trots over, rubs her head on your fingers, then eats the treats one at a time, very politely. You have been approved.)' }, { t: 'talk', to: 'nekomata' }],
          scene: [['A', 'She let you feed her? Cookie\'s picky, you know. She just stares at dried fish and starts washing her face.'], ['P', 'Mewmew says the strays never go hungry on this street.'], ['A', 'Yep! The big guy\'s a softie. And I know every spot where the strays hang out. We\'re buddies.'], ['A', 'Next time you bring the treats again. ...And a mackerel for me. That\'s only fair~']] },
        { title: 'I was here first', ask: ['Anby\'s been giving me the stink eye all week. All I did was hang out with Nicole. A lot. Okay, every day.', 'Can you find out what\'s up with her? Take her a coffee from Coff Cafe. A black one. Sugar is for kids~'],
          steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'anby', reply: '...From Nekomata? Thank you. I\'m not angry. I was with Nicole first, that\'s all. Tell her the seat on Nicole\'s left is mine. She can have the right one.' },
            { t: 'talk', to: 'nicole', reply: 'Anby and Nekomata fighting over who sits next to me? Hehe~ Being this popular is exhausting. Tell them whoever brings in the next commission fee gets the good seat!' },
            { t: 'clear', f: { enc: 'elite', lead: 'nekomata', with: 'anby' } }, { t: 'talk', to: 'nekomata' }],
          scene: [['A', 'Anby covered me the whole fight. Didn\'t say a word, just... covered me.'], ['P', 'She says the seat on Nicole\'s left is hers. You can have the right one.'], ['A', 'The right one? ...Fine. It\'s closer to the snack drawer anyway.'], ['A', 'You know, a stray cat never knows where it\'s supposed to go. Now I do. ...Don\'t make it weird, Proxy!']] },
        { title: 'The most valuable thing', ask: ['Guess what? Robbers in a Hollow told me to leave my most valuable thing behind. So I left... me! Then I gave them a beating. Now they call me boss~', 'Their old crew wants a rematch. Nicole says take Billy along. Put me in front, okay? I\'ll keep the android out of trouble.'],
          steps: [{ t: 'clear', f: { enc: 'elite', lead: 'nekomata', with: 'billy' } },
            { t: 'talk', to: 'billy', reply: '"The android"! She called me "the android" the whole fight! I\'m a Starlight Knight! ...She did jump in when I got knocked down, though. Don\'t tell her I said thanks.' }, { t: 'talk', to: 'nekomata' }],
          scene: [['A', 'Hehe~ They ran off crying. Being the best can get kinda lonely, you know?'], ['P', 'Billy says thanks for jumping in. He also says he\'s not an android.'], ['A', 'He\'s totally an android. A clanky one. ...But he\'s our clanky one.'], ['A', 'When I left the Red Fang Gang I thought I\'d be on my own for good. Nine lives, and this one\'s pretty nice. ...Now, my reward. A mackerel buffet. You\'re paying!']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait, the in-game and city models (hex sampled
     from them): black hair with a cool blue-green cast, a choppy bob, jaw-
     length side locks and a high ponytail with a blue-violet sheen; big cat
     ears, black outside, red-pink inside with white fur; a red hairband plate
     with a white emblem on top of her head; a dark mark on her forehead
     between the bangs; red eyes, tan skin, a little fang. A red bow with white
     dots behind her head, its streamers hanging by her cheeks. A black choker
     and a gold bell; a black mesh halter, a white wrap top with a red tag, a
     red corset to the hips with a black frog fastener and gold plum blossoms,
     cut-outs at the waist. Bare shoulders, black armbands, puffy detached red
     sleeves with a black paw print, black fingerless gloves; white ropes with
     orange bands loop from the sleeves up behind her shoulders. Puffy black
     shorts, a red pouch on her right hip, a fluffy fur puff at her lower back
     and two long segmented cat tails, grey-black with light bands and a white
     triangle mark. Black thigh-highs ("TSUBAKI" on her right thigh), red
     armoured greaves with black pointed knee plates, gold rivets and "NEKO",
     and black cat-paw feet with pale toes. Two knives with maroon frame hilts
     ride holstered on her greaves; in battle she has one drawn in her left
     hand (the portrait's), her right hand a cat's paw. 148 cm. */
  // the knife: the grip in her fist, the maroon frame round it, a straight single-edged blade (lighter edge below, darker
  // spine above, the tanto point), the white rope tied at the guard
  function drawKnife(g) {
    g.box(0, 0, -1, 0, 0, 1, HILT2);                                             // the wrapped grip
    g.box(0, -2, -2, 0, -2, 1, HILT); g.box(0, -1, -2, 0, 0, -2, HILT);          // the frame: under her fingers, behind her fist
    g.box(0, -2, 2, 0, 1, 2, HILT);                                              // ...and the guard
    g.box(0, 0, 3, 0, 1, 10, (x, y, z) => y === 0 ? EDGE : z % 3 === 0 ? STEEL2 : y === 1 && z > 8 ? SPINE : STEEL);
    g.set(0, 1, 11, STEEL);                                                      // the point
    g.set(0, -3, 2, ROPE); g.set(0, -4, 2, ROPE2); g.set(0, -5, 2, ROPEO);       // the rope and its orange tip
  }
  {
    const HAIR = 0x3e4448, HAIR2 = 0x2c2a30, HAIR3 = 0x22212c, SHEEN = 0x5b5a6b, SHEEN2 = 0x5b526e;
    const SKIN = 0xd6b8a5, SKIN2 = 0xc59a89, EYE = 0x9b3b4a, LASH = 0x1a1214, MOUTH = 0x8a3a40, FANG = 0xf4eeea, MARK = 0x4f433a;
    const EAR = 0x1c181c, EARIN = 0x8f4655, FUR = 0xf2f3f2, BAND = 0xb64434, BAND2 = 0x712021, EMB = 0xf2f2f2;
    const RIB = 0x9a443f, RIB2 = 0x622223, DOT = 0xf2f2f2, CHOKER = 0x321f25, BELL = 0xd2a77a, BELL2 = 0xa0746b, BELLHI = 0xebd7b1;
    const MESH = 0x2f2529, MESH2 = 0x3c3538, WHITE = 0xe2dede, WHITE2 = 0xbcb2b6, CORSET = 0xb64435, CORSET2 = 0x843025, FROG = 0x1c1c20, GOLD = 0xd7925f, GOLD2 = 0xac593a;
    const SLEEVE = 0xb54636, SLEEVE2 = 0x9d281b, PRINT = 0x1c1a1e, ARMBAND = 0x1e1d20, GLOVE = 0x303236;
    const SHORTS = 0x323539, SHORTS2 = 0x191e25, POUCH = 0xb7483a, POUCH2 = 0x9b3c33, FLUFF = 0x444d55, FLUFF2 = 0x4c565d, FLUFFHI = 0x708e9d;
    const STOCK = 0x474748, STOCK2 = 0x1d1d1d, TEXT = 0xbfb4af, GREAVE = 0xa83e32, GREAVE2 = 0x95241b, GREAVE3 = 0x65231f, KNEE = 0x323236;
    const PAW = 0x333235, SOLE = 0x080608, TOE = 0xaca2a1, TAIL = 0x565d68, TAIL2 = 0x3f4650, TAILBAND = 0x787e89, TAILMARK = 0xe8eaee;
    // an arm (s = 1: her left, +X): the bare shoulder, a black armband, the puffy detached sleeve (puffed outward, a black paw
    // print on its outside), the fingerless glove; a white rope from the cuff up behind her shoulder, orange bands and tips
    const arm = s => g => {
      g.box(-1, -1, -1, 1, 0, 1, SKIN);
      g.box(-1, -2, -1, 1, -2, 1, ARMBAND); g.set(s, -2, 1, TEXT);
      g.box(s > 0 ? -1 : -2, -6, -2, s > 0 ? 2 : 1, -3, 2, (x, y, z) => Math.abs(x) === 2 && Math.abs(z) === 2 ? -1 : y === -6 ? SLEEVE2 : SLEEVE);
      g.set(2 * s, -4, 0, PRINT); g.set(2 * s, -5, 1, PRINT); g.set(2 * s, -5, -1, PRINT); g.set(2 * s, -6, 0, PRINT);
      g.box(-1, -7, -1, 1, -7, 1, GLOVE); g.set(0, -7, 1, SKIN);                // the glove, a fingertip showing
      const loop = [[3, -5], [3, -4], [3, -3], [3, -2], [3, -1], [3, 0], [3, 1], [2, 2], [1, 2], [0, 1]];
      loop.forEach(([x, y], i) => g.set(x * s, y, -2, i === 3 || i === 7 ? ROPEO : i % 2 ? ROPE2 : ROPE));
      g.set(3 * s, -6, -2, ROPEO); g.set(0, 0, -2, ROPEO);
    };
    // a leg (s = 1: her left): the shorts' hem, bare thigh, the thigh-high, the red greave (its front plate, darker back, gold
    // rivets, "NEKO" on the outside), the black knee plate pointing up and out, the cat-paw foot with pale toes
    const leg = s => g => {
      H.leg(g, { pant: STOCK, boot: GREAVE, bootH: 5, sole: SOLE, skin: SKIN, skinFrom: 8, skinTo: 9 });
      g.box(-1, 0, -1, 1, 0, 1, SHORTS);
      g.box(-1, -2, -1, 1, -2, 1, STOCK2);                                       // the thigh-high's top band
      g.box(-1, -8, 2, 1, -5, 2, (x, y) => x === 0 && y > -8 ? GREAVE : GREAVE2);
      g.box(-1, -8, -1, 1, -5, -1, GREAVE3);
      g.set(s, -5, 2, GOLD); g.set(s, -7, 2, GOLD); g.set(s, -6, 0, TEXT);
      g.box(-1, -4, 2, 1, -4, 2, KNEE); g.set(0, -3, 2, KNEE); g.set(0, -4, 3, KNEE); g.set(2 * s, -4, 0, KNEE); g.set(2 * s, -3, 0, KNEE);
      g.box(-1, -8, -1, 1, -8, 2, PAW); g.box(-1, -9, -1, 1, -9, 2, SOLE);
      g.set(-1, -9, 3, TOE); g.set(0, -9, 3, PAW); g.set(1, -9, 3, TOE);
      if (s < 0) { g.set(-1, -3, 1, TEXT); g.set(-1, -4, 0, TEXT); }            // "TSUBAKI" and its flower, on her right thigh
    };
    // a knife in its holster on the outside of a greave: the maroon frame standing up along her thigh (the blade inside)
    const holster = s => ({ parent: s > 0 ? 'legL' : 'legR', at: [2 * s, -3, 0], draw(g) {
      g.box(0, -2, -1, 0, 2, -1, HILT); g.box(0, -2, 1, 0, 2, 1, HILT); g.set(0, 2, 0, HILT); g.set(0, -2, 0, HILT2);
      g.box(0, -1, 0, 0, 1, 0, HILT2);
    } });
    // a cat tail (s = 1: the left one) from the fur at her lower back: back, then up in an S, its tip curling forward; light bands,
    // the white triangle near the tip. anim.js sways tailL / tailR (rot: tilted back and apart)
    // (drawn well back from her, so that even swung forward as she runs it stays behind her)
    const catTail = s => ({ parent: 'hips', at: [s, -1, -3], rot: [-0.3, 0, -0.3 * s], draw(g) {
      const path = [[0, 0], [0, -1], [0, -2], [1, -3], [1, -4], [2, -5], [3, -6], [4, -6], [5, -7], [6, -7], [7, -7], [8, -6], [9, -6], [9, -5]];
      path.forEach(([y, z], i) => g.box(0, y, z, s, y + (i < 12 ? 1 : 0), z, (x) => i >= 12 ? TAIL2 : i === 11 && x === s ? TAILMARK : i % 4 === 3 ? TAILBAND : x === 0 ? TAIL2 : TAIL));
    } });
    MODELS.nekomata = H.humanoid({
      scale: 0.064, height: 30, width: 18,
      sockets: { weapon: ['blade', [0, 1, 8]], off: ['armR', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, SHORTS);                                      // the puffy shorts...
        g.box(-4, -2, -1, -4, -1, 1, SHORTS2); g.box(4, -2, -1, 4, -1, 1, SHORTS2);   // ...puffed at the legs
        g.box(-2, 0, 2, 2, 0, 2, CORSET2); g.set(0, -1, 2, CORSET2);             // the corset's point over the front
        g.box(-3, -1, 2, -1, -1, 2, POUCH2);                                     // the red strap...
        g.box(-4, -2, 0, -4, 0, 2, POUCH); g.set(-4, 0, 2, POUCH2); g.set(-4, -1, 3, FROG);   // ...to the pouch on her right hip
        g.ell(0, -1, -3, 2, 1.2, 1, (x, y) => y >= 0 && x === 0 ? FLUFFHI : (x + y) % 3 === 0 ? FLUFF2 : FLUFF);   // the fur at the tails' root
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, x => Math.abs(x) === 3 ? CORSET2 : CORSET);     // the red corset...
        g.box(-2, 0, 2, 2, 2, 2, CORSET);
        for (const s of [-1, 1]) { g.set(3 * s, 0, 1, SKIN); g.set(3 * s, 1, 1, SKIN); }   // ...the cut-outs at her waist
        g.box(-1, 2, 3, 1, 2, 3, FROG); g.set(0, 1, 3, FROG);                    // the black frog fastener
        g.set(2, 1, 3, GOLD); g.set(1, 0, 3, GOLD2);                             // the gold plum blossoms on her left
        g.box(-3, 3, -2, 3, 4, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, (x, y) => (x + y) % 3 === 0 ? WHITE2 : WHITE);   // the white wrap top
        g.set(2, 4, 3, CORSET);                                                  // its red tag
        g.box(-3, 5, -2, 3, 6, 1, SKIN); g.set(-3, 5, -2, SKIN2); g.set(3, 5, -2, SKIN2);   // bare shoulders
        g.box(-1, 5, 1, 1, 5, 2, (x) => x ? MESH : MESH2);                       // the black mesh halter...
        g.set(-1, 6, 1, MESH); g.set(1, 6, 1, MESH);
        g.box(-1, 6, -1, 1, 6, 0, CHOKER); g.set(0, 6, 1, CHOKER);               // ...the choker
        g.set(0, 5, 3, BELL); g.set(0, 6, 2, BELL2); g.set(1, 5, 3, BELLHI);     // ...and its gold bell
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: MOUTH });
        g.set(1, 0, 3, FANG);                                                    // the little fang in her grin
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 3], [-2, 4], [-1, 3], [1, 3], [2, 4], [3, 3], [4, 2]], sideTo: 2 });   // choppy bangs
        g.set(0, 6, 4, SKIN); g.set(0, 5, 4, MARK);                             // the mark on her forehead, between the bangs
        g.set(-2, 7, 4, SHEEN); g.set(2, 6, 4, SHEEN); g.set(-3, 6, 3, SHEEN); g.set(3, 7, 1, SHEEN);
        for (const s of [-1, 1]) g.box(4 * s, -2, 1, 4 * s, 0, 2, (x, y) => y < -1 ? HAIR2 : HAIR);   // jaw-length side locks
        g.box(-4, -2, -4, 4, 0, -4, HAIR2); g.box(-3, -3, -4, 3, -3, -4, HAIR3);  // the bob at her nape
        // the red hairband plate on top of her head, its front edge over the top of the bangs, the white emblem
        g.box(-3, 8, 2, 3, 8, 4, x => Math.abs(x) === 3 ? BAND2 : BAND);
        g.box(-2, 7, 4, 2, 7, 4, x => Math.abs(x) === 2 ? BAND2 : BAND); g.set(0, 7, 4, EMB);
        // the cat ears: black outside, white fur and red-pink inside, the tips leaning out
        for (const s of [-1, 1]) {
          g.box(2 * s, 8, -1, 4 * s, 9, 0, EAR); g.box(3 * s, 10, -1, 4 * s, 11, 0, EAR); g.set(4 * s, 12, -1, EAR);
          g.box(2 * s, 8, 1, 3 * s, 9, 1, FUR); g.set(4 * s, 8, 1, EARIN); g.set(4 * s, 9, 1, EARIN); g.box(3 * s, 10, 1, 4 * s, 10, 1, EARIN);
        }
        // the streamers of her bow (on the ponytail) hanging by her cheeks, dotted, white at the ends
        for (const s of [-1, 1]) g.box(5 * s, -2, -3, 5 * s, 5, -2, (x, y, z) => y === -2 ? DOT : (y === 0 && z === -2) || (y === 3 && z === -3) ? DOT : RIB);
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tail: {   // the high ponytail from her crown, down her back to the shoulder blades, the blue-violet sheen at its ends (sways);
                  // the red bow with white dots round its root
          parent: 'head', at: [0, 8, -3], draw(g) {
            const path = [[0, 0, -1], [0, 0, -2], [0, -1, -3], [0, -3, -3], [0, -5, -3], [0, -7, -3], [0, -9, -2], [0, -11, -2]];
            path.forEach(([x, y, z], i) => g.ell(x, y, z, i < 5 ? 1.5 : 1.1, 1.1, i < 5 ? 1.2 : 0.9, i === 7 ? SHEEN2 : i === 6 ? SHEEN : i % 2 ? HAIR2 : HAIR));
            g.box(-3, -1, -3, 3, 0, -3, (x, y) => x === 0 ? RIB2 : (x === -2 && y === 0) || (x === 2 && y === -1) || (x === -3 && y === -1) || (x === 3 && y === 0) ? DOT : RIB);
          },
        },
        tailL: catTail(1), tailR: catTail(-1),
        // the knife in her left hand: empty here, filled in battle (hookUp, below). It points along her forearm's front
        blade: { parent: 'armL', at: [0, -7, 1] },
        knifeL: holster(1), knifeR: holster(-1),
      },
    });
  }

  /* --------------------------------------------- the knife, drawn in battle --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Nekomata) her rig's empty blade part gets the knife, once, and the
     holster on her left greave empties: in battle she has it drawn; in town
     (the city model) both stay holstered. */
  let PROTO = null;
  const proto = () => PROTO || (PROTO = (() => { const g = new VX.Grid(); drawKnife(g); return VX.object(g, MODELS.nekomata.scale, { cast: false }); })());
  function armKnife(e) {
    const P = e.rig && e.rig.parts; if (!P || !P.blade || P.blade.userData.armed) return;
    P.blade.add(proto().clone()); P.blade.userData.armed = true;
    if (P.knifeL) P.knifeL.visible = false;
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded)
  let hooked = false;
  function hookUp() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on(kind => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'nekomata') armKnife(e);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'nekomata') armKnife(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookUp); else hookUp();

  /* --------------------------------------------------------------- poses --
     The knife is in her LEFT hand, so her cuts are the usual slashes mirrored;
     her right hand claws. */
  // her ready stance: crouched like a cat about to pounce, the knife low and forward, the right paw up
  ANIM.READY.nekomata = { armL: [-0.75, 0.25, 0.3], armR: [-1.55, -0.4, -0.35], torso: [0.16, -0.12, 0], head: [-0.08, 0.1, 0], legL: [-0.35, 0, 0.12], legR: [0.28, 0, -0.12], hipsY: -0.07 };
  // Kitty Slash: a cut across from her left (1st), a backhand (2nd), a spinning cut (3rd), a flurry of knife and claws (4th)
  ACT.nmCut1 = (b, t, th, d) => stage(b, { armL: [-2.4, -0.2, 0.9], armR: [-1.2, -0.3, -0.5], torso: [0, -0.7, 0], legR: [0.3, 0, 0] }, { armL: [-1.0, 0.5, -0.6], armR: [-0.9, 0, -0.6], torso: [0.15, 0.6, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0] }, t, th, d);
  ACT.nmCut2 = (b, t, th, d) => stage(b, { armL: [-1.4, -0.6, -0.8], torso: [0, 0.6, 0] }, { armL: [-1.3, 0.3, 1.0], torso: [0.1, -0.7, 0], legR: [-0.6, 0, 0], legL: [0.4, 0, 0] }, t, th, d);
  ACT.nmSpin = (b, t) => { const k = clamp(t / 0.4, 0, 1); return add(b, { armL: [-1.45, 0, 1.25], armR: [-1.0, 0, -1.0], torso: [0.12, 0, 0], legR: [-0.3, 0, 0], hipsY: -0.06, spin: k * PI * 2, lift: 0.12 * Math.sin(k * PI) }); };
  ACT.nmFlurry = (b, t) => { const k = Math.sin(t * 30); return add(b, { armL: [-1.5 + k * 0.5, 0.5 * k, 0.35], armR: [-1.5 - k * 0.5, 0.5 * k, -0.35], torso: [0.25, k * 0.3, 0], legL: [-0.6, 0, 0.1], legR: [0.45, 0, -0.1], hipsY: -0.1 }); };
  // the 5th hit and Surprise Attack: up with the knife high, then a cut straight down
  ACT.nmDrop = (b, t, th, d) => {
    if (t < th - 0.05) { const k = clamp(t / Math.max(0.05, th - 0.05), 0, 1); return add(b, { armL: [-3.0, 0, 0.35], armR: [-2.3, 0, -0.45], torso: [-0.3 + 0.2 * k, 0, 0], legL: [-1.1 * k, 0, 0.1], legR: [-0.5 * k, 0, -0.1] }); }
    return stage(b, { armL: [-3.0, 0, 0.35], armR: [-2.3, 0, -0.45] }, { armL: [-0.5, 0.2, -0.1], armR: [-0.8, -0.2, -0.3], torso: [0.6, 0, 0], legL: [-1.0, 0, 0.1], legR: [0.75, 0, -0.1], hipsY: -0.18 }, t - th + 0.07, 0.07, d - th + 0.07);
  };
  // Crimson Blade, the Dash Attack: low and fast, the knife out ahead, then the cut as she passes through
  const LOW = { torso: [0.6, 0.2, 0], armL: [-1.55, -0.1, 0.1], armR: [0.7, 0, -0.5], legL: [-1.1, 0, 0], legR: [0.9, 0, 0], hipsY: -0.18 };
  ACT.nmPierce = (b, t, th, d) => stage(b, LOW, { torso: [0.3, 0.75, 0], armL: [-1.25, 0.9, -0.7], armR: [0.4, 0, -0.6], legL: [-0.9, 0, 0], legR: [0.7, 0, 0], hipsY: -0.14 }, t, th, d);
  // both hands raised, then knife and claws crossed down: an X
  const XW = { armL: [-2.6, -0.3, 0.6], armR: [-2.6, 0.3, -0.6], torso: [-0.2, 0, 0], lift: 0.1 };
  const XS = { armL: [-0.9, 0.6, -0.3], armR: [-0.9, -0.6, 0.3], torso: [0.45, 0, 0], legL: [-0.9, 0, 0], legR: [0.6, 0, 0], hipsY: -0.15 };
  ACT.nmCross = (b, t, th, d) => stage(b, XW, XS, t, th, d);
  // Phantom Claws, Cat's Paw: a flurry of claws and knife, the X to finish
  ACT.nmClaws = (b, t, th, d) => t < d * 0.62 ? ACT.nmFlurry(b, t) : ACT.nmCross(b, t - d * 0.62, 0.08, d - d * 0.62);
  // Super Surprise Attack!: tucked, twirling in the air as she cuts, then the fall
  ACT.nmFall = (b, t, th, d) => {
    if (t < 0.62) { const k = clamp(t / 0.6, 0, 1); return add(b, { armL: [-2.2, 0, 0.7], armR: [-2.2, 0, -0.7], legL: [-1.4, 0, 0.2], legR: [-1.2, 0, -0.2], torso: [0.4, 0, 0], spin: k * PI * 2, tilt: 0.5 * Math.sin(k * PI) }); }
    return ACT.nmCross(b, t - 0.62, 0.08, d - 0.62);
  };
  // Claw Swipe: in low and fast, the flurry, the big X
  ACT.nmChain = (b, t, th, d) => t < 0.36 ? ACT.nmPierce(b, t, 0.3, 0.36) : t < 0.9 ? ACT.nmFlurry(b, t) : ACT.nmCross(b, t - 0.9, 0.1, d - 0.9);
  // Claw Smash: a twirling leap, slash after slash as she circles the target, the X to finish
  ACT.nmUlt = (b, t, th, d) => {
    if (t < 0.45) { const k = clamp(t / 0.45, 0, 1); return add(b, { armL: [-2.6, 0, 0.6], armR: [-2.6, 0, -0.6], legL: [-1.3, 0, 0.2], legR: [-1.1, 0, -0.2], torso: [0.3, 0, 0], spin: k * PI * 2, tilt: 0.5 * Math.sin(k * PI) }); }
    if (t < 1.7) return add(ACT.nmFlurry(b, t), { spin: Math.sin(t * 9) * 0.6 });
    return ACT.nmCross(b, t - 1.7, 0.15, d - 1.7);
  };
  // Desperate Defense: the knife held across, the paw braced behind it
  ACT.nmParry = b => add(b, { armL: [-1.6, -0.7, 0.2], armR: [-1.3, 0.5, -0.1], torso: [0.15, 0, 0], head: [0.05, 0, 0], hipsY: -0.1, legL: [-0.5, 0, 0], legR: [0.4, 0, 0] });
  // Shadow Strike: the charge in, the flurry, a cut, the X
  ACT.nmFollow = (b, t, th, d) => t < 0.22 ? add(b, LOW) : t < 0.46 ? ACT.nmFlurry(b, t) : t < 0.64 ? ACT.nmCut1(b, t - 0.46, 0.12, 0.18) : ACT.nmCross(b, t - 0.64, 0.08, d - 0.64);

  /* ------------------------------------------------------------- effects --
     Her cuts are crimson arcs (the built-in crescent). nmClaw: three claw
     lines side by side; nmCross: an X of knife and claws on the target;
     nmPierce: the red streak of Crimson Blade along the way she went;
     nmImpact: a landing that cracks the ground; nmRain: the Ultimate's
     slashes falling all over the target. The repeats' phantom cuts are drawn
     by phantom() above. */
  const E = CHOREO.events, V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  E.nmClaw = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), sx = Math.cos(dir), sz = -Math.sin(dir), y = (e.y || 1.0) + (a.airY || 0);
    for (let i = -1; i <= 1; i++) FX.slash(a.x + fx * 0.4 + sx * i * 0.18, y + i * 0.1, a.z + fz * 0.4 + sz * i * 0.18, e.r || 1.8, dir, i ? CRIM : HOTW, { tilt: e.tilt || 0, arc: 1.8, width: 0.1, life: 0.24, sweep: 1 });
    FX.burst(a.x + fx * 1.2, y, a.z + fz * 1.2, 6, { col: [CRIM, CRIM2, HOTW], speed: 3, size: 0.08, life: 0.25, g: 0 });
  };
  E.nmCross = (a, A, e, tgt) => {
    const B = BT.B, dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), near = tgt && Math.hypot(tgt.x - a.x, tgt.z - a.z) < 4.5;
    const x = near ? tgt.x : a.x + fx * 1.4, z = near ? tgt.z : a.z + fz * 1.4, r = e.r || (e.big ? 2.8 : 2.2);
    for (const s of [-1, 1]) {
      FX.slash(x - fx * r * 0.6, 1.1, z - fz * r * 0.6, r, dir, CRIM, { tilt: s * 0.95, arc: 2.0, width: 0.4, life: 0.32, sweep: 1.2 });
      FX.slash(x - fx * r * 0.6, 1.1, z - fz * r * 0.6, r * 0.92, dir, HOTW, { tilt: s * 0.95, arc: 1.6, width: 0.12, life: 0.26, sweep: 1.2 });
    }
    FX.glow(x, 1.1, z, e.big ? 2.6 : 1.8, CRIM, 0.25, { size1: e.big ? 4 : 2.8 });
    FX.burst(x, 1.1, z, e.big ? 30 : 16, { col: [CRIM, CRIM2, HOTW], speed: e.big ? 7 : 5, size: 0.1, life: 0.35, g: 1 });
    if (e.big) B.cam.shake = Math.max(B.cam.shake, 0.25);
  };
  E.nmPierce = (a, A) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), f = A.chargeFrom || { x: a.x - fx * 2.5, z: a.z - fz * 2.5 };
    const p0 = V3(f.x, 0.95, f.z), p1 = V3(a.x + fx * 1.2, 0.95, a.z + fz * 1.2);
    FX.beam(p0, p1, CRIM, 0.14, 0.3); FX.beam(p0.clone(), p1.clone(), HOTW, 0.05, 0.22);
  };
  E.nmImpact = (a, A, e) => {
    const B = BT.B, x = a.x + Math.sin(A.dir) * 1.0, z = a.z + Math.cos(A.dir) * 1.0, r = e.r || 2;
    FX.ring(x, z, 0.3, r, CRIM, 0.35); FX.ring(x, z, 0.2, r * 0.6, HOTW, 0.28);
    FX.burst(x, 0.15, z, e.big ? 26 : 14, { col: [0xc8b090, 0x8a7a60], glow: false, speed: 4, size: 0.12, g: 6, life: 0.5, flat: true });
    FX.glow(x, 0.6, z, r, CRIM, 0.22, { size1: r * 1.6 });
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.3 : 0.14); SFX.play(e.big ? 'boom' : 'heavy');
  };
  E.nmRain = (a, A, e, tgt) => {
    const dir = A.dir, x0 = tgt ? tgt.x : a.x + Math.sin(dir) * 3, z0 = tgt ? tgt.z : a.z + Math.cos(dir) * 3;
    for (let i = 0; i < 3; i++) {
      const yaw = rnd(0, PI * 2), r = rnd(1.6, 2.6), x = x0 + rnd(-1.2, 1.2), z = z0 + rnd(-1.2, 1.2);
      FX.slash(x - Math.sin(yaw) * r * 0.7, rnd(0.6, 1.8), z - Math.cos(yaw) * r * 0.7, r, yaw, U.pick([CRIM, CRIM2, HOTW]), { tilt: rnd(-1.3, 1.3), arc: 1.8, width: 0.16, life: 0.26, sweep: 1.4 });
    }
    FX.burst(x0, 1.1, z0, 8, { col: [CRIM, HOTW], speed: 5, size: 0.08, life: 0.3, g: 0 });
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; if (def.events) def.events.sort((x, y) => x.t - y.t); };
  const cres = (t, o) => Object.assign({ t, fx: 'crescent', y: 0.95, r: 2.0, arc: 2.2, col: CRIM, sweep: 1.0 }, o || {});
  const claw = (t, o) => Object.assign({ t, fx: 'nmClaw' }, o || {});
  const trail = (t0, t1) => [{ t0, t1, kind: 'afterimage', col: AFT }];
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.14, kind: 'fwd', d: 0.45 }], events: [cres(0.12, { tilt: 0.5 }), cres(0.2, { tilt: -0.3, col: CRIM2 })] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.45 }], events: [cres(0.14, { tilt: -0.6 }), claw(0.22, { tilt: 0.3 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.34, kind: 'fwd', d: 0.5, ease: 'lin' }], events: T3.map((t, i) => cres(t, { r: 2.2, arc: 4.5, tilt: 0.15 * (i - 1), sweep: 1.6 })) });
  set(K.basic[3], { motion: [{ t0: 0.02, t1: 0.56, kind: 'fwd', d: 0.7, ease: 'lin' }], events: T4.map((t, i) => i & 1 ? claw(t, { tilt: i & 2 ? -0.4 : 0.4 }) : cres(t, { tilt: i % 4 ? -0.5 : 0.5 })) });
  set(K.basic[4], { motion: [{ t0: 0.04, t1: 0.3, kind: 'leap', h: 0.9, d: 0.8 }], events: [cres(0.3, { y: 1.2, tilt: 1.3, r: 2.3, arc: 2.6 }), cres(0.4, { tilt: 1.45, r: 2.5, arc: 2.8, col: HOTW }), { t: 0.4, fx: 'nmImpact', r: 1.6 }] });
  // Crimson Blade: a straight run that reaches the target as the second cut lands and carries on through
  set(K.crimson, { motion: [{ t0: 0.06, t1: 0.34, kind: 'charge', d: 4.5, hit: 0.26 }], stream: trail(0.04, 0.36), events: [cres(0.16, { tilt: 0.2, r: 2.2 }), cres(0.24, { tilt: -0.2, r: 2.4, col: CRIM2 }), { t: 0.3, fx: 'nmPierce' }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: trail(0, 0.18), events: [cres(0.18, { tilt: 0.4 }), cres(0.26, { tilt: -0.5, col: CRIM2 })] });
  const clawSet = TDC.slice(0, 5).map((t, i) => claw(t, { tilt: [0.5, -0.5, 0.2, -0.2, 0.7][i] })).concat([{ t: TDC[5], fx: 'nmCross' }]);
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 0.9, side: 'auto' }, { t0: 0.1, t1: 0.22, kind: 'fwd', d: 1.0 }], stream: trail(0, 0.3), events: clawSet.map(e => Object.assign({}, e)) });
  set(K.quick, { motion: [{ t0: 0, t1: 0.16, kind: 'toTarget', gap: 1.2 }], stream: trail(0, 0.2), events: clawSet.map(e => Object.assign({}, e)) });
  set(K.special, { motion: [{ t0: 0.02, t1: 0.34, kind: 'leap', h: 1.3, toTarget: true }], events: [cres(0.36, { y: 1.2, tilt: 1.4 }), claw(0.41), claw(0.46, { tilt: -0.4 }), cres(0.52, { tilt: 1.45, col: HOTW }), { t: 0.6, fx: 'nmImpact', r: 2.0 }] });
  set(K.ex, { motion: [{ t0: 0.04, t1: 0.66, kind: 'leap', h: 2.4, toTarget: true }], stream: trail(0.04, 0.66),
    events: [cres(0.42, { tilt: 0.6 }), cres(0.48, { tilt: -0.6, col: CRIM2 }), cres(0.54, { tilt: 1.2 }), { t: 0.7, fx: 'nmImpact', r: 2.8, big: true }, { t: 0.7, fx: 'whiteFlash' }, claw(0.76), claw(0.84, { tilt: -0.5 }), { t: 0.92, fx: 'nmCross', big: true }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.3 }], stream: trail(0, 0.24),
    events: [cres(0.3, { r: 3.2, arc: 3.0, tilt: 0.3 })].concat(TCH.slice(1, 8).map((t, i) => claw(t, { tilt: i & 1 ? -0.6 : 0.6, r: 2.4 })), [{ t: 1.0, fx: 'nmCross', big: true }, { t: 1.0, fx: 'whiteFlash' }]) });
  set(K.ult, { motion: [{ t0: 0.1, t1: 0.45, kind: 'leap', h: 1.6, toTarget: true }, { t0: 0.5, t1: 1.6, kind: 'orbit', ang: PI * 2, gap: 1.2 }, { t0: 1.62, t1: 1.8, kind: 'toTarget', gap: 1.0 }],
    stream: trail(0.1, 1.7), events: [{ t: 0.3, fx: 'whiteFlash' }].concat(TUL.slice(0, 8).map(t => ({ t, fx: 'nmRain' })), [{ t: 1.85, fx: 'nmCross', big: true, r: 4 }, { t: 1.85, fx: 'nmImpact', r: 4.2, big: true }, { t: 1.85, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: trail(0, 0.24),
    events: TFU.slice(0, 4).map((t, i) => i & 1 ? claw(t, { tilt: -0.4 }) : cres(t, { tilt: 0.5 })).concat([cres(TFU[4], { r: 2.6, arc: 3, tilt: 0.2, col: HOTW }), { t: TFU[5], fx: 'nmCross', big: true }]) });
})();
