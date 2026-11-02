/* ============================================================================
   agents/miyabi.js -- Hoshimi Miyabi ("Void Hunter: Isshin Muga"), Chief of
   Hollow Special Operations Section 6 (H.A.N.D.). S-Rank, Frost, Anomaly,
   Defensive Assist. Released in Version 1.4.
   (The hooks and helpers an Agent's file can use are listed in zhuyuan.js.)

   Sources: Zenless Zone Zero Wiki (Hoshimi Miyabi, every skill page, Frost,
   Change History, Tailless, Voice-Overs, Lore, Dialogue, the skill preview
   clips), zzz.gachabase.net (datamine, game data 3.4.2: per-hit multipliers
   and Anomaly Buildup), zzz.gg, the official model sheets and splash art, and
   the HoYoLAB "Behind the Scenes with the Dev Team" article (her VFX, Tiny
   Tailless, the sheathing animations).

   Her kit (official):
     Basic Attack: Kazahana         5 slashes: hits 1-2 Physical, 3-5 Frost; she
                                    blocks enemy attacks during hit 5.
     Basic Attack: Shimotsuki       hold Basic with at least 2 Fallen Frost: she
                                    sheathes the blade and charges in Shimotsuki
                                    Stance (invulnerable), each charge level
                                    costing 2 Fallen Frost (up to 3), then draws
                                    in one huge Frost slash.
     Dash Attack: Fuyubachi (Physical)   Dodge Counter: Kan Suzume (Frost)
     Special Attack: Miyuki         a quick-draw Frost slash, raised
                                    Anti-Interrupt.
     EX Special Attack: Hisetsu     (40 Energy) rushes through everything in her
                                    path, +2 Fallen Frost; press EX again (40
                                    more) for a frontal strike, +2 more.
     Chain Attack: Spring's Call    Ultimate: Lingering Snow (+3 Fallen Frost,
                                    +30% Ice DMG for 12 s)
     Quick Assist: Dancing Petals   Defensive Assist: Drifting Petals
     Assist Follow-Up: Falling Petals
     Core Passive: Searing Cold     her Frost DMG leaves Icefire (30 s); on an
                                    Icefire target her Frost buildup rises by her
                                    CRIT Rate (max +80%). Her Frostbite on an
                                    Icefire target consumes it: Frostburn - Break
                                    (Frost DMG, 1,500% of her ATK), and the target
                                    is in Frostburn while the Frostbite lasts (the
                                    whole squad builds 20% more Anomaly on it; she
                                    cannot put Icefire on it). Frostburn - Break
                                    gives 1 Fallen Frost (once per 10 s).
     Additional Ability: Bask in Frost   with a Support or Anomaly Agent, or one
                                    of her faction: Shimotsuki +60% DMG; when the
                                    squad triggers Disorder, +2 Fallen Frost and
                                    her next Shimotsuki ignores 30% Ice RES.
     Fallen Frost                   up to 6; she starts each battle with 3.
   FROST is her own attribute: it counts as Ice for weakness and resistance,
   with its own Anomaly gauge, so Frost and Ice set off Disorder together.
   Numbers: the official level-12 values (the datamine splits Hisetsu, its
   follow-up and Spring's Call into parts; we hit with those parts) x0.45 DMG,
   x0.6 Daze; Anomaly Buildup as datamined (/100).
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, lerp, dist } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const FROSTS = [0xffffff, 0xeaf6ff, 0xa4c0ff, 0xb89aff, 0x6bd6e4];   // ice-blue with violet tones (the dev article)

  /* ------------------------------------------------- her own attribute --
     Frost counts as Ice for weakness and resistance (as: 'ice') but builds its
     own gauge. Its Anomaly, like this game's Freeze, lands as one burst (the
     Shatter); Frostbite then lingers on the target. How long it lingers is not
     in our sources: 10 s, our choice; Disorder over it pays at most what a
     Disorder over Freeze does (450% + 10 s x 22.5% = 450% + 3 s x 75%). */
  D.ATTR.frost = { name: 'Frost', color: '#a4c0ff', hex: 0xa4c0ff, anomaly: 'frostbite', as: 'ice' };
  D.ANOMALY.frostbite = { name: 'Frostbite', attr: 'frost', color: '#a4c0ff', dur: 10, burst: 500, disorderBase: 450, disorderPerSec: 22.5 };
  FX.ATTR_COL.frost = [0xeaf6ff, 0xa4c0ff, 0x8a6aff];

  /* ----------------------------------------------------------------- kit -- */
  const K = {
    // Kazahana: hits 3-5 split into the sub-slashes the previews show (our split of the official total)
    basic: [
      { name: 'Basic Attack: Kazahana', anim: 'myDraw1', dur: 0.44, cancel: 0.3, reach: 1.8, range: 1.6, hits: [hit(0.15, 54.4, 21.2, 0, { attr: 'physical' })] },
      { name: 'Basic Attack: Kazahana', anim: 'myCut2', dur: 0.44, cancel: 0.31, reach: 1.8, range: 1.6, hits: [hit(0.16, 59.3, 41.2, 0, { attr: 'physical' })] },
      { name: 'Basic Attack: Kazahana', anim: 'myRing', dur: 0.56, cancel: 0.42, reach: 1.9, range: 1.6, hits: [hit(0.24, 126.6, 70.6, 62.9, { shape: 'circle', at: 'self', r: 2.4 })] },
      { name: 'Basic Attack: Kazahana', anim: 'myFlurry', dur: 0.62, cancel: 0.48, reach: 2.0, range: 1.6, hits: [0.14, 0.26, 0.38].map(t => hit(t, 193.3 / 3, 123.9 / 3, 91.21 / 3, { shape: 'circle', at: 'front', r: 2.1 })) },
      { name: 'Basic Attack: Kazahana', anim: 'myGale', dur: 0.92, cancel: 0.75, reach: 2.0, range: 1.6, myBlock: 0.6,
        hits: [0.2, 0.36, 0.52].map((t, i) => hit(t, 258.8 / 3, 197 / 3, 129.27 / 3, i < 2 ? { shape: 'circle', at: 'self', r: 2.8 } : { heavy: true, shape: 'circle', at: 'self', r: 3.0, kb: 0.9 })) },
    ],
    // Shimotsuki, one entry per charge level (shimo: the level; each costs 2 Fallen Frost). Heavy: a charged
    // finisher, as the other Agents' charged attacks (our choice). Level 3's datamined total is split between the
    // crescent waves and the X-shaped slashes that follow them (65/35, our choice)
    shimo1: { name: 'Basic Attack: Shimotsuki', anim: 'myStance', dur: 1.0, cancel: 0.9, reach: 3.2, range: 2.4, inv: [0, 1.0], shimo: 1, hits: [hit(0.62, 910.1, 66, 39.98, { heavy: true, shape: 'cone', r: 5, arc: 70, kb: 1.0 })] },
    shimo2: { name: 'Basic Attack: Shimotsuki', anim: 'myStance', dur: 1.3, cancel: 1.18, reach: 3.2, range: 2.4, inv: [0, 1.3], shimo: 2, hits: [hit(0.85, 1717.2, 94.3, 56.68, { heavy: true, shape: 'cone', r: 5.5, arc: 80, kb: 1.1 })] },
    shimo3: { name: 'Basic Attack: Shimotsuki', anim: 'myStance', dur: 1.8, cancel: 1.68, reach: 3.2, range: 2.4, inv: [0, 1.8], shimo: 3,
      hits: [hit(1.1, 4282.8 * 0.65, 567 * 0.65, 343.36 * 0.65, { shape: 'cone', r: 6, arc: 90 }), hit(1.32, 4282.8 * 0.35, 567 * 0.35, 343.36 * 0.35, { heavy: true, shape: 'circle', at: 'target', r: 3.6, kb: 1.4 })] },
    dash: { name: 'Dash Attack: Fuyubachi', anim: 'myDash', dur: 0.5, cancel: 0.38, reach: 7, hits: [hit(0.2, 52.2, 19.5, 0, { attr: 'physical' })] },
    counter: { name: 'Dodge Counter: Kan Suzume', anim: 'myIai', dur: 0.66, cancel: 0.5, inv: [0, 0.58], hits: [hit(0.22, 492.3, 322.3, 94.99, { heavy: true, shape: 'arc', r: 2.8, arc: 160, kb: 0.9 })] },
    special: { name: 'Special Attack: Miyuki', anim: 'myIai', dur: 0.5, cancel: 0.36, reach: 2.6, range: 2.0, cd: 2, dr: 0.4, hits: [hit(0.2, 72.1, 54.5, 32.51, { shape: 'line', r: 1.0, len: 4.5 })] },
    // Hisetsu: the rush cuts everything along her path, then the cut on the target takes effect behind her
    ex: { name: 'EX Special Attack: Hisetsu', anim: 'myEx', dur: 1.0, cancel: 0.86, cost: 40, reach: 6, range: 2.6, inv: [0, 0.95], fallen: 2,
      hits: [hit(0.14, 315.8, 193.6, 157.75, { shape: 'line', r: 1.3, len: 8 }), hit(0.62, 472.5, 289.8, 250.52, { heavy: true, shape: 'circle', at: 'target', r: 2.6, kb: 1.0 })] },
    // pressing EX again during Hisetsu (battle.js: Special during her EX is K.ex2). The sources give it no name of its own
    ex2: { name: 'EX Special Attack: Hisetsu (follow-up)', anim: 'myDome', dur: 1.0, cancel: 0.86, cost: 40, reach: 3.2, range: 2.2, inv: [0, 0.95], fallen: 2,
      hits: [hit(0.3, 386.9, 243.4, 189.25, { shape: 'circle', at: 'target', r: 3.0 }), hit(0.62, 580.3, 365.1, 297.77, { heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1.2 })] },
    chain: { name: 'Chain Attack: Spring\'s Call', anim: 'myChain', dur: 1.4, inv: [0, 1.4],
      hits: [hit(0.3, 377.6, 85.3, 111.36, { shape: 'line', r: 1.5, len: 9 }), hit(0.72, 377.6, 85.3, 111.36, { shape: 'circle', at: 'self', r: 3.4 }), hit(1.0, 503.1, 114.1, 148.48, { heavy: true, shape: 'circle', at: 'self', r: 3.8, kb: 1.2 })] },
    // Lingering Snow: one datamined value; the slashes from all sides take 5 x 8% of it and the Finishing Move 60% (our split)
    ult: { name: 'Ultimate: Lingering Snow', anim: 'myUlt', dur: 2.5, inv: [0, 2.5], fallen: 3,
      hits: [0.45, 0.62, 0.79, 0.96, 1.13].map(t => hit(t, 4776.1 * 0.08, 556.3 * 0.08, 1137.16 * 0.08, { shape: 'circle', at: 'target', r: 3.4 })).concat([hit(1.9, 4776.1 * 0.6, 556.3 * 0.6, 1137.16 * 0.6, { heavy: true, shape: 'circle', at: 'target', r: 5, kb: 1.8 })]) },
    // Drifting Petals: the official Daze is 407.7% on a light blow, 514.4% on a heavy one; the parry's own x1.2 on a heavy blow comes close
    assist: { name: 'Defensive Assist: Drifting Petals', type: 'defensive', anim: 'myParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Falling Petals', anim: 'myIai', dur: 0.95, inv: [0, 0.9], hits: [hit(0.36, 676.6, 438.2, 286.17, { heavy: true, shape: 'arc', r: 3.0, arc: 170, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Dancing Petals', anim: 'myDraw1', dur: 0.62, inv: [0, 0.55], hits: [hit(0.24, 209, 157.3, 94.99, { shape: 'arc', r: 2.6, arc: 150, kb: 0.6 })] },
  };
  // Frostburn - Break: Frost DMG, 1,500% of her ATK (scaled as every multiplier)
  const BREAK = { mult: Math.round(1500 * DM), daze: 0, bu: 0, attr: 'frost', shape: 'circle', r: 1.2 };
  const BREAK_ACT = () => ({ kind: 'frostburn', def: { name: 'Frostburn - Break', hits: [] }, data: {}, dir: 0, t: 0 });

  // Frostburn: on while the Frostbite that her Frostburn - Break went with is still on the target
  // (it ends with that Frostbite, and another Anomaly taking its place ends it too)
  const frostburn = v => { const f = v && v.myFrostburn; return !!(f && v.anom === f && f.t > 0); };
  const gainFF = (a, n) => { a.fallen = Math.min(6, (a.fallen || 0) + n); };
  // the charge level a held Basic gets: the most her Fallen Frost pays for (2 a level, up to 3)
  const shimoLevel = a => Math.min(3, Math.floor((a.fallen || 0) / 2));

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.miyabi = {
    id: 'miyabi', name: 'Hoshimi Miyabi', short: 'Miyabi', faction: 'Hollow Special Operations Section 6', spec: 'Anomaly', attr: 'frost', rank: 'S',
    color: '#3d707a', color2: '#6bd6e4', assist: 'defensive', stance: 'iai',
    blurb: 'Chief of Section 6 of H.A.N.D., a fox Thiren swordswoman and the only Agent whose attribute is Frost. Her katana Tailless stays sheathed at her hip until the instant she cuts: she gathers Fallen Frost, then holds Basic to spend it on Shimotsuki, a charged draw-slash, and her Frost sets off Frostburn on the enemies it has marked with Icefire.',
    // HP 7,673 x1.12, DEF 606 x1.07; ATK at the top of the Anomaly range (her official 880 is the highest of them);
    // Anomaly Proficiency 238 x2.5 (the low end: her damage is mostly her own hits); CRIT 5% + 0.05, 50% + 0.3
    stats: { hp: 8590, atk: 2900, def: 648, impact: 86, ap: 595, am: 116, cr: 0.1, cd: 0.8, er: 1.2, speed: 4.8 },
    ai: { range: 1.8, dodge: 0.8, reflex: 0.64, aggr: 1.05 },
    energyMax: 120, resource: 'fallen',
    core: [
      ['Core Passive: Searing Cold', 'Her Frost hits leave Icefire on the target (30 s); against a target with Icefire her Frost Anomaly Buildup rises by 100% of her CRIT Rate (up to +80%). When her Frostbite lands on a target with Icefire, the Icefire is consumed for Frostburn - Break (Frost DMG, 1,500% of her ATK), and the target is in Frostburn while that Frostbite lasts: everyone builds 20% more Anomaly on it, and she cannot put Icefire on it. Frostburn - Break gives her 1 Fallen Frost (once every 10 s).'],
      ['Frost and Fallen Frost', 'Frost is her own attribute: it counts as Ice for weakness and resistance but has its own Anomaly gauge (Frostbite), so Frost and Ice set off Disorder together. Fallen Frost: up to 6, and she enters battle with 3. Her EX gives 2, pressing EX again for its follow-up 2 more, her Ultimate 3 (and +30% Ice DMG for 12 s). Hold Basic with at least 2 for Shimotsuki: she sheathes the blade and charges, invulnerable, then draws in one huge Frost slash, each charge level costing 2 (up to 3).'],
      ['Additional Ability: Bask in Frost', 'With a Support or Anomaly Agent, or a member of her faction, in the squad: Shimotsuki deals 60% more DMG, and whenever the squad triggers Disorder she gains 2 Fallen Frost and her next Shimotsuki ignores 30% of the target\'s Ice RES.'],
    ],
    kit: K,
    kitShow: [['Hold', 'shimo1']],
    rivalMoves: [{ k: 'shimo2', kind: 'charged', p: 0.22, cd: 6 }],
    howto: 'Miyabi: hold Basic with 2+ Fallen Frost for Shimotsuki, an invulnerable charged draw-slash: she charges as many levels as her Fallen Frost pays for (2 a level, up to 3). Her EX gives 2, EX again (its follow-up) 2 more, her Ultimate 3. Her Frost hits leave Icefire, and her Frostbite on an Icefire target sets off Frostburn - Break. Her 5th Basic blocks attacks; her assist is a Defensive Assist.',
    mech: {
      init(a) { a.fallen = 3; a.myIce = 0; a.myBreakCd = 0; a.myRes = false; a.myBask = false; hookLook(); },
      // Bask in Frost: a Support or Anomaly Agent, or one of her faction, in the squad (Version 3.1 added Anomaly)
      squad(a, B) { a.myBask = B.squad.some(s => s !== a && (s.def.spec === 'Support' || s.def.spec === 'Anomaly' || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B;
        if (def.fallen) gainFF(a, def.fallen);                                   // EX +2, its follow-up +2, Ultimate +3
        if (def.shimo) {
          a.fallen = Math.max(0, a.fallen - 2 * def.shimo);
          if (a.myRes) { A.data.myRes = true; a.myRes = false; }                  // Bask in Frost: this one ignores 30% Ice RES
          BT.log(`Miyabi: ${def.name}, charge level ${def.shimo} (${2 * def.shimo} Fallen Frost)`, 'skill');
          BT.callout('SHIMOTSUKI', 'skill', `Miyabi · charge level ${def.shimo}`);
        }
        if (A.kind === 'ult') a.myIce = B.t + 12;                                 // Lingering Snow: +30% Ice DMG for 12 s
        // AUTO presses EX again for the follow-up (as ai.js does for the other Agents' second EX)
        if (def === K.ex && !A.data.manual && a.energy >= K.ex2.cost && Math.random() < 0.8) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
      },
      hit(a, v, h, A, attr) {
        const B = BT.B;
        if (attr !== 'frost') return;
        const burn = frostburn(v);
        // the buildup this hit already made, raised: by her CRIT Rate on Icefire (max +80%), by 20% in Frostburn
        const k = (v.myIcefire > B.t ? Math.min(0.8, a.st.cr) : 0) + (burn ? 0.2 : 0);
        if (k > 0 && h.bu) BT.addBuildup(a, v, 'frost', h.bu * k);
        if (!burn && v.alive) v.myIcefire = B.t + 30;                            // Icefire (not on a target in Frostburn)
      },
      // Frostburn: a teammate's hits build 20% more Anomaly too
      allyHit(a, src, v, h) {
        if (!h.bu || !frostburn(v)) return;
        const attr = h.attr || src.flux || src.def.attr;
        if (D.ATTR[attr] && D.ATTR[attr].anomaly) BT.addBuildup(src, v, attr, h.bu * 0.2);
      },
      // her Frostbite on a target with Icefire: Frostburn - Break
      anomaly(a, src, v, type) {
        const B = BT.B;
        if (src !== a || type !== 'frostbite' || !(v.myIcefire > B.t)) return;
        v.myIcefire = 0; v.myFrostburn = v.anom;
        BT.callout('FROSTBURN - BREAK', 'anomaly frostbite', v.def.name);
        BT.log(`${v.def.name}: Frostburn - Break! (Miyabi's Icefire consumed: the squad builds 20% more Anomaly on it while Frostbite lasts)`, 'anomaly');
        frostburnFx(v);
        BT.applyHit(a, v, BREAK, BREAK_ACT(), 'frost');
        if (a.myBreakCd <= B.t) { a.myBreakCd = B.t + 10; gainFF(a, 1); }
      },
      // Bask in Frost: anyone in the squad triggers Disorder
      disorder(a, src, v) {
        if (!a.myBask || !src || !BT.B.squad.includes(src)) return;
        gainFF(a, 2); a.myRes = true;
        BT.log('Miyabi: Bask in Frost: +2 Fallen Frost; her next Shimotsuki ignores 30% of the target\'s Ice RES.', 'skill');
      },
      mods(a, v, h, A) {
        const B = BT.B, d = A && A.def, attr = (h && h.attr) || a.def.attr;
        let dmg = 0;
        if (d && d.shimo) {
          if (a.myBask) dmg += 0.6;                                               // Bask in Frost: Shimotsuki +60%
          if (A.data && A.data.myRes) dmg += 0.3;                                 // ignoring 30% Ice RES, approximated as +30% DMG
        }
        if (a.myIce > B.t && (attr === 'frost' || attr === 'ice')) dmg += 0.3;   // Lingering Snow
        return { dmg };
      },
      // Kazahana's 5th hit: she blocks what comes at her while she makes it (not an unblockable red flash: our choice)
      incoming(a, e, h) {
        const A = a.act;
        if (!A || !A.def.myBlock || A.t > A.def.myBlock || h.flash === 'red') return false;
        blockFx(a); return true;
      },
      // held Basic with 2+ Fallen Frost: Shimotsuki. The hold cannot tell how long the button is held, so the charge
      // level is the most her Fallen Frost pays for (2 a level, up to 3): our stand-in for holding through the levels
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || !hold || c.dash) return null;
        const n = shimoLevel(a);
        return n ? { def: K['shimo' + n], kind: 'charged' } : null;
      },
      // AUTO: Shimotsuki at full charge, or at level 2+ on a Stunned target (level 1 if the Stun is about to end)
      ai(a, tgt, B) {
        const n = shimoLevel(a);
        if (n >= 3 || (n >= 2 && tgt.stun > 0) || (n >= 1 && tgt.stun > 0 && tgt.stun < 1.5)) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) {
        const r = [`FALLEN FROST ${'●'.repeat(a.fallen)}${'○'.repeat(Math.max(0, 6 - a.fallen))}`], n = shimoLevel(a), v = a.lastTgt;
        if (n) r.push(`SHIMOTSUKI LV ${n}`);
        if (a.myIce > B.t) r.push(`ICE DMG +30% ${Math.ceil(a.myIce - B.t)}s`);
        if (a.myRes) r.push('BASK IN FROST · IGNORE 30% ICE RES');
        if (v && v.alive) { if (frostburn(v)) r.push('TARGET: FROSTBURN'); else if (v.myIcefire > B.t) r.push('TARGET: ICEFIRE'); }
        return r;
      },
    },
    town: {
      routine: ['bardic:bench 30, cafe:t 25, metro:wait 20, huddle 25', 'box:claw 30, box:statue 15, 141:icecream 20, huddle 35', 'rp:door 30, alley:phone 20, turbo:ramp 15, soup:side 10, huddle 25', 'rp:night 40, bardic:wall 30, news:read 30'],
      chatter: ['This, too, is training.', 'The metro was this way. ...Or that way.'],
      lines: [
        'Hoshimi Miyabi, Chief of Section 6. I am on patrol. ...This is Sixth Street, is it not? Good. Then I am where I meant to be.',
        'Every Saturday I open a Surprise Box at Box Galaxy. It trains one\'s luck. Mine has not improved yet, so the training continues.',
        'Officer Mewmew is a sea otter. Zhu Yuan says it is a cat. I have examined it closely. It is a sea otter.',
      ],
      chapters: [
        { title: 'The best fruit', ask: ['Proxy. A request. Something sweet from the 141, if you would.', 'I would go myself, but the last time I set out for the 141 I arrived at the metro. Twice.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'miyabi' }],
          scene: [['A', 'Milk tea. Thank you.'], ['P', 'There was nothing melon-flavoured. Sorry.'], ['A', 'Melon is the best fruit. But this is also good.'], ['A', 'Enjoying what is in front of you, even when it is not melon. That is training as well.']] },
        { title: 'The sea otter question', ask: ['Zhu Yuan still insists Officer Mewmew is a cat. You are an impartial witness, Proxy.', 'Look at Officer Mewmew closely. Then tell Zhu Yuan what you saw.'], steps: [{ t: 'talk', to: 'mewmew', reply: '(Officer Mewmew salutes, then pats its round tummy with both paws. Like a sea otter. Or a cat. It is hard to say.)' }, { t: 'talk', to: 'zhuyuan', reply: 'It patted its tummy? Cats do that. ...Sometimes. Tell Miyabi the case is still open.' }, { t: 'talk', to: 'miyabi' }],
          scene: [['P', 'It patted its tummy. Zhu Yuan says the case is still open.'], ['A', 'Patting its tummy, as a sea otter does with a shell. The evidence grows.'], ['A', 'Zhu Yuan will not concede. We have argued about it since the Academy.'], ['A', '...I would not like the argument to end. I find that difficult to explain.']] },
        { title: 'A sheathed blade', ask: ['A Notorious has surfaced in a Hollow. Section 6 has been asked to deal with it.', 'Put me at the head of your squad, Proxy. I will cut it down. You need only point the way.'], steps: [{ t: 'clear', f: { enc: 'boss', lead: 'miyabi' } }, { t: 'talk', to: 'miyabi' }],
          scene: [['A', 'It is done. My blade is already sheathed.'], ['P', 'You didn\'t even turn around.'], ['A', 'There was no need. You were watching what I could not see.'], ['A', 'Thank you, Proxy. With you pointing the way, I did not get lost once. That is rare.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official model sheets and splash art: near-black hair with a
     green-grey tint, floor-length and straight, blunt hime bangs, long side
     locks, a braid running back along her left temple, a little gold hairpin
     at the back; tall black fox ears with grey insides; red eyes. A white
     collared shirt with a black tie and an HSO-S6 badge; a black corset-style
     waist cincher, belted, with the H.A.N.D. crossed-hands ornament and a gold
     knot-and-tassel charm. The teal jacket: on her right arm an oversized
     sleeve with black straps; on the left it slips off the shoulder, its
     yellow collar lining showing and its empty sleeve (white triangles on it)
     hanging behind her arm; the 特 emblem on the back. Her left arm is a black
     armoured gauntlet with red rope wound round the upper arm; a black
     fingerless glove on the right. A long black pleated skirt, slit at the
     front; brownish sheer tights; black high-heeled ankle boots with buckle
     straps, a strap round the left shin.
     TAILLESS, her katana, sheathed at her left hip: a black scabbard; the
     square mechanical guard with its gold fingerprint lock; the black hilt
     wrapped in a white diamond pattern; white zigzag paper streamers. Drawn,
     a silver blade (myBlade); in her skills a glowing cyan spectral blade
     with jagged spikes and a cyan zigzag streamer (mySpirit). Both are drawn
     only in battle (syncLook, below): out of it she keeps the blade sheathed.
     TINY TAILLESS, the blade's curse given a body: a floating black sphere
     with two horns and one big red eye in a white crescent, wreathed in blue
     foxfire. It floats beside her while the blade is sheathed and retreats
     into the blade when she fights. 170 cm with the ears: scale 0.072. */
  const DRAW = {};
  {
    const HAIR = 0x313333, HAIR2 = 0x262828, HAIRHI = 0x494d50, EARIN = 0x6a6e72, SKIN = 0xf3e2d2, EYE = 0xb73d1b;
    const TEAL = 0x3d707a, TEAL2 = 0x2e5860, GOLD = 0xd1a961, TASSEL = 0xe4c076, WHITE = 0xf4f4f6, WHITE2 = 0xdcdde2, TIE = 0x18181c, BADGE = 0xe8eaee;
    const CORSET = 0x1e1f22, BELT = 0x2a2b2f, SILVER = 0xb8bcc4, SKIRT = 0x333536, SKIRT2 = 0x292b2c, TIGHTS = 0x5e544e, BOOT = 0x1a1a1d, BOOT2 = 0x2c2c30;
    const GAUNT = 0x232428, GAUNT2 = 0x3c3e44, ROPE = 0xa62b25, ROPE2 = 0x7e1f1b, GLOVE = 0x1c1c20;
    const SAYA = 0x161618, WRAP = 0xf2f2f2, GUARD = 0x2e3036, LOCK = 0xd9b04a, PAPER = 0xf6f6f2, STEEL = 0xb8c0c8, EDGE = 0xe8eef4, POMMEL = 0x5a5e66;
    const SPIRIT = G(0x6bd6e4), SPIRIT2 = G(0xb8f4ff), INK = 0x1a1a1e, INK2 = 0x2a2a30;
    // the hilt (behind the hand, drawn along +Z from the guard), the guard and its lock, the streamers below
    const hilt = (g, streamer) => {
      for (let z = -4; z <= 0; z++) g.set(0, 0, z, (z & 1) ? WRAP : INK);                    // black, wrapped in white diamonds
      g.set(0, 0, -5, POMMEL);
      g.box(-1, -1, 1, 1, 1, 1, GUARD); g.set(1, 0, 1, LOCK); g.set(0, 2, 1, GUARD);            // the square mechanical guard, its gold lock
      [[0, -1, 0], [0, -2, -1], [0, -3, 0], [0, -4, -1], [0, -5, 0]].forEach(([x, y, z]) => g.set(x, y, z, streamer));   // the zigzag streamer
    };
    DRAW.blade = g => {   // drawn: a silver blade, curving a little toward the tip
      hilt(g, PAPER);
      for (let z = 2; z <= 14; z++) { const y = z > 11 ? 1 : 0; g.set(0, y, z, STEEL); if (z < 14) g.set(0, y - 1, z, EDGE); }
    };
    DRAW.spirit = g => {  // in her skills: the spectral blade, glowing cyan, jagged spikes rising behind the guard
      hilt(g, SPIRIT);
      for (let z = 2; z <= 17; z++) { const y = z > 13 ? 1 : 0; g.set(0, y, z, SPIRIT); if (z < 16) g.set(0, y - 1, z, SPIRIT2); }
      g.line(0, 1, 3, 0, 4, 1, SPIRIT); g.line(0, 1, 5, 0, 3, 3, SPIRIT); g.line(0, 1, 7, 0, 2, 6, SPIRIT2);   // the jagged spikes
      g.line(0, -2, 2, 0, -3, 4, INK);                                                         // the dark hook under the guard
    };
    const skirt = (x, y, z) => ((x + z + 9) % 2 ? SKIRT : SKIRT2);
    const legOf = shin => g => {
      H.leg(g, { pant: TIGHTS, boot: BOOT, bootH: 3, sole: BOOT2 });
      g.cut(-1, -9, 0, 1, -9, 1); g.cut(-1, -9, -1, -1, -9, -1); g.cut(1, -9, -1, 1, -9, -1);   // high heels: the arch lifts onto a narrow heel
      g.box(-1, -7, -1, 1, -7, 1, BOOT2); g.set(1, -7, 2, SILVER);                              // the buckle strap at the ankle
      if (shin) { g.box(-1, -5, -1, 1, -5, 1, BOOT); g.set(1, -5, 2, SILVER); }                // the strap round her left shin
    };
    MODELS.miyabi = H.humanoid({
      scale: 0.072, height: 28, width: 20,
      sockets: { weapon: ['myBlade', [0, 0, 14]], off: ['armL', [0, -8, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]], tiny: ['tiny', [0, 0, 0]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, skirt); g.box(-4, -7, -3, 4, -2, 2, skirt);                   // the long pleated skirt, to just below the knee
        g.box(-4, -7, -3, 4, -7, 2, (x, y, z) => ((x + z) & 1 ? SKIRT2 : 0x222425));
        g.cut(-1, -7, 0, -1, -5, 2);                                                             // the slit at the front
        g.box(-3, 0, -2, 3, 0, 1, BELT); g.set(0, 0, 2, SILVER);                                 // the belt and buckle
        g.box(2, -3, 2, 3, -1, 3, BELT); g.set(3, -2, 4, SILVER);                                // a pouch at her left front
        g.set(-1, -1, 2, TASSEL); g.box(-1, -4, 3, -1, -2, 3, (x, y) => y === -2 ? GOLD : TASSEL);   // the gold knot-and-tassel charm
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 2, 1, CORSET); g.box(-2, 0, 2, 2, 2, 2, CORSET);                     // the black waist cincher...
        g.box(-3, 0, -2, 3, 0, 1, BELT); g.box(-3, 2, -2, 3, 2, -2, BELT);
        for (const [x, y] of [[-1, 2], [1, 2], [0, 1], [-1, 0], [1, 0]]) g.set(x, y, 3, SILVER); // ...the H.A.N.D. crossed hands at its front
        g.box(-3, 3, -2, 3, 6, 1, WHITE); g.box(-2, 3, 2, 2, 5, 2, WHITE);                       // the white shirt
        g.set(-1, 6, 2, WHITE2); g.set(1, 6, 2, WHITE2); g.set(0, 6, 2, TIE);                    // collar points, the tie's knot...
        for (let y = 3; y <= 5; y++) g.set(0, y, 3, TIE);                                        // ...and the tie
        g.set(2, 4, 3, BADGE); g.set(2, 5, 3, 0x9aa0a8);                                         // the HSO-S6 badge
        g.box(-3, 2, -3, 3, 6, -3, TEAL);                                                        // the teal jacket across her back...
        g.box(-3, 2, -2, -3, 6, 1, TEAL); g.box(-3, 2, 2, -3, 5, 2, TEAL); g.box(-3, 6, -2, -2, 6, 1, TEAL);   // ...over her right shoulder
        g.set(-3, 6, 2, GOLD); g.set(-2, 6, 2, GOLD);                                            // gold lining at the right lapel
        g.box(2, 6, -2, 3, 6, 0, GOLD); g.box(3, 2, -3, 3, 4, -1, TEAL);                         // slipped off the left shoulder: the collar's lining
        for (const [x, y] of [[-1, 3], [0, 3], [1, 3], [-1, 4], [1, 4], [-1, 5], [0, 5], [1, 5]]) g.set(x, y, -3, WHITE);   // the 特 emblem on the back
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x1a1414, mouth: 0xc98a80 });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 4], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]], sideTo: 3 });
        g.box(-4, 4, 4, 4, 4, 4, HAIR);                                                          // blunt hime bangs, cut straight over the eyes
        for (const s of [-1, 1]) {
          g.box(s * 4, -2, -3, s * 4, 0, 3, HAIR); g.box(s * 5, -1, -2, s * 5, 4, 1, HAIR2);      // side hair cut straight at the jaw
          g.box(s * 4, -8, 2, s * 4, -3, 2, (x, y) => (y & 1 ? HAIR : HAIR2));                    // the long locks down her front
        }
        g.box(-4, -3, -4, 4, -1, -4, HAIR2);
        [[5, 6, 2], [5, 7, 1], [5, 7, 0], [5, 8, -1], [4, 8, -2], [3, 8, -3], [2, 8, -4], [1, 7, -5], [0, 7, -5]].forEach(([x, y, z], i) => g.set(x, y, z, i & 1 ? HAIRHI : HAIR2));   // the braid
        g.set(-1, 6, -5, GOLD); g.set(1, 6, -5, TASSEL);                                         // her handmade hairpin
        for (const s of [-1, 1]) {                                                               // tall fox ears, grey inside
          g.box(s * 2, 8, -1, s * 4, 9, 0, HAIR); g.box(s * 3, 10, -1, s * 4, 11, 0, HAIR); g.box(s * 4, 12, -1, s * 4, 13, 0, HAIR);
          g.box(s * 3, 8, 1, s * 3, 10, 1, EARIN); g.set(s * 2, 8, 1, HAIR); g.set(s * 4, 8, 1, HAIR); g.set(s * 4, 10, 1, HAIR);
        }
        g.set(-2, 6, 4, HAIRHI); g.set(2, 7, 4, HAIRHI);
      },
      armL(g) {   // the black armoured gauntlet, red rope round the upper arm
        g.box(-1, 0, -1, 1, 0, 1, WHITE); g.box(-1, 1, -1, 2, 1, 1, GAUNT2);
        for (let y = -1; y >= -2; y--) g.box(-1, y, -1, 1, y, 1, (x, yy, z) => ((x + z + yy) & 1 ? ROPE : ROPE2));
        g.set(2, -2, 0, ROPE); g.set(2, -3, 1, ROPE2);                                           // the rope's knotted end
        g.box(-1, -3, -1, 1, -7, 1, GAUNT); g.box(2, -6, -1, 2, -3, 1, GAUNT2);                 // the gauntlet, its outer plates
        g.set(0, -3, 2, GAUNT2); g.set(0, -5, 2, WHITE); g.set(0, -6, 2, GAUNT2);               // forearm plates, a white mark
        g.box(-1, -8, -1, 1, -8, 1, GAUNT2); g.set(-1, -9, 1, POMMEL); g.set(1, -9, 1, POMMEL); // armoured fingers
      },
      armR(g) {   // the oversized teal sleeve, a black fingerless glove
        H.arm(g, { sleeve: TEAL, sleeveTo: 6, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 8 });
        g.box(-2, -2, -2, 1, -5, 2, TEAL); g.box(-2, -8, -2, 1, -6, -1, (x, y) => (y === -8 ? TEAL2 : TEAL));   // the sleeve, hanging past her hand behind
        g.box(-2, -4, -2, 1, -4, 2, BELT); g.set(-3, -4, 0, SILVER); g.set(-3, -3, 1, GOLD);   // a black strap with a buckle, a yellow tag
        g.box(-1, -8, 0, 1, -8, 1, SKIN);                                                       // bare fingers
      },
      legL: legOf(true),
      legR: legOf(false),
      extra: {
        tail: {   // floor-length straight hair down her back, parting into long locks at the ends
          parent: 'head', at: [0, 2, -4], draw(g) {
            for (let i = 0; i < 16; i++) {
              const z = -1 - Math.min(2, Math.floor(i / 6)), col = x => ((x + i) % 5 === 0 ? HAIR2 : (x * 3 + i) % 7 === 0 ? HAIRHI : HAIR);
              if (i < 11) g.box(-4, -i, z - 1, 4, -i, z, col);
              else for (const [x0, n] of [[-4, 14], [-1, 16], [2, 15]]) if (i < n) g.box(x0, -i, z - 1, x0 + 2, -i, z, col);
            }
          }
        },
        tailL: {  // the jacket's left sleeve, slipped off her shoulder, hanging empty behind her arm
          parent: 'torso', at: [5, 6, -3], draw(g) {
            g.box(0, -9, -2, 2, 0, 0, (x, y) => (y === -9 ? TEAL2 : TEAL)); g.box(0, 0, 1, 2, 0, 1, GOLD);
            for (const x0 of [0, 2]) { g.set(x0, -7, -2, WHITE); g.set(x0, -6, -2, WHITE); }   // the white triangles
            g.set(1, -7, -2, WHITE); g.box(0, -8, -2, 2, -8, 0, INK); g.set(3, -8, -1, SILVER);
          }
        },
        saya: {   // Tailless's black scabbard at her left hip, the mouth forward and up
          parent: 'hips', at: [5, -1, 1], rot: [-0.45, 0, 0], draw(g) {
            g.box(0, -1, -12, 0, 0, 0, SAYA); g.set(0, 0, -13, POMMEL); g.set(0, 0, -10, 0xd0d0d4);
            g.set(-1, 0, -1, INK2); g.set(-1, 1, -2, INK2);                                   // the cord to her belt
          }
        },
        tsuka: {  // ...and the sheathed hilt (hidden while she has the blade drawn)
          parent: 'hips', at: [5, -1, 1], rot: [-0.45, 0, 0], draw(g) {
            g.box(-1, -1, 1, 1, 1, 1, GUARD); g.set(1, 0, 1, LOCK); g.set(0, 2, 1, GUARD);
            for (let z = 2; z <= 6; z++) g.set(0, 0, z, (z & 1) ? WRAP : INK);
            g.set(0, 0, 7, POMMEL);
            [[0, -2, 2], [0, -3, 3], [0, -4, 2], [0, -5, 3]].forEach(([x, y, z]) => g.set(x, y, z, PAPER));
          }
        },
        // the drawn blades in her right hand: empty here, filled in battle (syncLook)
        myBlade: { parent: 'armR', at: [0, -7, 1] },
        mySpirit: { parent: 'armR', at: [0, -7, 1] },
        tiny: {   // Tiny Tailless, floating by her left shoulder
          parent: 'hips', at: [8, 17, -1], draw(g) {
            g.ell(0, 0, 0, 2.4, 2.4, 2.4, (x, y) => (y >= 2 ? INK2 : INK));
            for (const [x, y] of [[-1, -1], [-1, 0], [0, 1], [1, 1], [2, 0], [2, -1], [0, -2], [1, -2]]) g.set(x, y, 3, WHITE);   // the white crescent...
            g.box(0, -1, 3, 1, 0, 3, G(0xe0283a)); g.set(1, 0, 3, G(0xffb0b8));                // ...round its one red eye
            for (const s of [-1, 1]) [[s, 2, 0], [s * 2, 3, 0], [s * 2, 4, -1], [s * 2, 5, -1], [s, 6, -1]].forEach(([x, y, z]) => g.set(x, y, z, INK2));   // two horns
          }
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     Her stance: left foot forward, the right shoulder back, her right hand on
     the hilt at her left hip, ready to draw. Poses below are written as the
     angles she reaches (rel() turns them into the change from her stance). */
  ANIM.READY.iai = { armR: [-0.55, 0.1, 0.62], armL: [-0.18, 0, 0.14], torso: [0.08, -0.22, 0], head: [0, 0.22, 0], legL: [-0.3, 0, 0.06], legR: [0.22, 0, -0.06], hipsY: -0.05 };
  const R0 = ANIM.READY.iai;
  const rel = o => { const r = {}; for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].map((v, i) => v - R0[k][i]) : k === 'hipsY' ? o[k] - R0.hipsY : o[k]; return r; };
  // crouched, the hand on the hilt (Shimotsuki Stance; the moment before every quick-draw)...
  const HILT = rel({ armR: [-0.35, 0, 0.85], armL: [-0.45, 0, 0.35], torso: [0.3, -0.55, 0], head: [-0.05, 0.5, 0], hipsY: -0.17, legL: [-0.9, 0, 0.14], legR: [0.65, 0, -0.1] });
  // ...and the draw: the blade swept out to her right
  const DRAWN = rel({ armR: [-1.55, -1.0, -1.0], armL: [-0.2, 0, 0.5], torso: [0.15, 0.65, 0], head: [0, -0.4, 0], hipsY: -0.14, legL: [-0.95, 0, 0.14], legR: [0.7, 0, -0.1] });
  const SWEEP = rel({ armR: [-1.5, 0, -1.4], armL: [-0.5, 0, 1.0], torso: [0.05, 0, 0], head: [0, 0, 0], hipsY: -0.12, legL: [-0.4, 0, 0.15], legR: [0.3, 0, -0.15] });   // arms out, to spin
  const RUSH = rel({ armR: [0.45, 0, -0.5], armL: [0.35, 0, 0.4], torso: [0.65, -0.3, 0], head: [-0.4, 0.3, 0], hipsY: -0.2, legL: [-1.2, 0, 0], legR: [0.9, 0, 0] });   // low and fast, the blade trailing
  const SHEATHE = rel({ armR: [-0.3, 0, 0.85], armL: [-0.35, 0, 0.3], torso: [0.25, -0.35, 0], head: [0.1, 0.3, 0], hipsY: -0.08 });   // the blade back in the scabbard, a slight bow
  ACT.myIai = (b, t, th, d) => stage(b, HILT, DRAWN, t, th, d);
  // Kazahana 1: a rising cut drawn from the hip; 2: the return slash, right to left
  ACT.myDraw1 = (b, t, th, d) => stage(b, rel({ armR: [-0.4, 0, 0.8], torso: [0.15, -0.5, 0], head: [0, 0.4, 0], hipsY: -0.1, legL: [-0.6, 0, 0.1], legR: [0.4, 0, -0.1] }), rel({ armR: [-2.1, -0.4, -0.8], torso: [0.05, 0.45, 0], head: [0, -0.3, 0], hipsY: -0.06, legL: [-0.65, 0, 0.1], legR: [0.45, 0, -0.1] }), t, th, d);
  ACT.myCut2 = (b, t, th, d) => stage(b, rel({ armR: [-1.7, 0.6, -1.2], torso: [0.05, 0.55, 0], head: [0, -0.4, 0] }), rel({ armR: [-1.3, -0.6, 0.9], torso: [0.12, -0.6, 0], head: [0, 0.5, 0], legL: [-0.55, 0, 0.1], legR: [0.4, 0, -0.1] }), t, th, d);
  // Kazahana 3: one turn, a ring slash round her
  ACT.myRing = (b, t, th, d) => add(stage(b, SWEEP, SWEEP, t, th, d), { spin: clamp((t - th * 0.3) / (th * 0.9), 0, 1) * PI * 2 });
  // Kazahana 4: a burst of quick crossing cuts
  ACT.myFlurry = (b, t, th, d) => {
    const k = Math.sin(t * 34), p = add(b, rel({ armR: [-1.45 + k * 0.6, Math.sin(t * 17) * 0.9, Math.cos(t * 34) * 0.5], armL: [-0.4, 0, 0.5], torso: [0.15, Math.sin(t * 17) * 0.35, 0], head: [0, 0, 0], hipsY: -0.1, legL: [-0.7, 0, 0.1], legR: [0.5, 0, -0.1] }));
    return t < d * 0.7 ? p : mix(p, b, U.ease(clamp((t - d * 0.7) / (d * 0.3), 0, 1)));
  };
  // Kazahana 5: three turns of sweeping rings, then she sheathes
  ACT.myGale = (b, t, th, d) => {
    if (t < 0.6) return add(b, Object.assign({}, SWEEP, { spin: clamp(t / 0.56, 0, 1) * PI * 6, lift: Math.sin(clamp(t / 0.6, 0, 1) * PI) * 0.12 }));
    const s = add(b, SHEATHE);
    return t < 0.8 ? mix(add(b, SWEEP), s, U.easeOut(clamp((t - 0.6) / 0.12, 0, 1))) : mix(s, b, U.ease(clamp((t - 0.8) / Math.max(0.05, d - 0.8), 0, 1)));
  };
  ACT.myDash = (b, t, th, d) => stage(b, rel({ armR: [-0.3, 0, 0.85], armL: [0.3, 0, 0.3], torso: [0.5, -0.4, 0], head: [-0.2, 0.3, 0], hipsY: -0.16, legL: [-1.0, 0, 0], legR: [0.75, 0, 0] }), rel({ armR: [-1.7, -0.3, -0.4], armL: [0.2, 0, 0.4], torso: [0.3, 0.4, 0], head: [-0.1, -0.3, 0], hipsY: -0.16, legL: [-1.0, 0, 0], legR: [0.8, 0, 0] }), t, th, d);
  // Shimotsuki: still in the stance, trembling a little, then the draw at the hit
  ACT.myStance = (b, t, th, d) => t < th - 0.06 ? add(b, Object.assign({}, HILT, { roll: Math.sin(t * 40) * 0.012 * Math.min(1, t * 2) })) : ACT.myIai(b, t - th + 0.14, 0.14, d - th + 0.14);
  // Hisetsu: the rush through, then the cut on the way out
  ACT.myEx = (b, t, th, d) => t < 0.42 ? add(b, RUSH) : ACT.myCut2(b, t - 0.42, 0.2, d - 0.42);
  // its follow-up: both hands overhead for the dome-shaped cut, then the X-shaped slashes
  ACT.myDome = (b, t, th, d) => t < 0.45 ? stage(b, rel({ armR: [-2.9, 0, -0.3], armL: [-2.4, 0, 0.3], torso: [-0.3, 0, 0], head: [-0.3, 0, 0], lift: 0.3 }), rel({ armR: [-0.6, 0, 0.3], armL: [-0.8, 0, 0.3], torso: [0.6, 0, 0], head: [0.2, 0, 0], hipsY: -0.16, legL: [-0.9, 0, 0], legR: [0.6, 0, 0] }), t, th, 0.45) : ACT.myCut2(b, t - 0.45, 0.17, d - 0.45);
  // Spring's Call: the piercing draw, then two turns of slashes over the frosted ground
  ACT.myChain = (b, t, th, d) => {
    if (t < 0.5) return ACT.myIai(b, t, th, 0.5);
    if (t < 1.06) return add(b, Object.assign({}, SWEEP, { spin: clamp((t - 0.5) / 0.52, 0, 1) * PI * 4 }));
    return mix(add(b, SWEEP), b, U.ease(clamp((t - 1.06) / Math.max(0.05, d - 1.06), 0, 1)));
  };
  // Lingering Snow: in, slashes from every side, back to the centre; still; then the Finishing Move: draw, and sheathe
  ACT.myUlt = (b, t, th, d) => {
    if (t < 0.32) return add(b, RUSH);
    if (t < 1.25) return ACT.myFlurry(b, t, th, 10);
    if (t < 1.84) return add(b, HILT);
    return ACT.myIai(b, t - 1.76, 0.14, d - 1.76);
  };
  ACT.myParry = b => add(b, rel({ armR: [-1.5, -0.3, 0.75], armL: [-0.9, 0, 0.35], torso: [0.12, 0.3, 0], head: [0, -0.2, 0], hipsY: -0.1, legL: [-0.55, 0, 0.1], legR: [0.45, 0, -0.1] }));

  /* ------------------------------------------------------------- effects --
     The dev article's Frost: an ice-blue base with violet and magenta tones,
     hard comic-like edges, and four-point stars ("Hoshi"). myArc / myRing:
     slash arcs and ring slashes; myLines: a burst of thin crossing cuts;
     myWaves: Shimotsuki's stacked crescent waves; myCross: the X-shaped
     violet slashes; myDome: Hisetsu's follow-up; myBeam: Spring's Call's
     piercing slash; myComet / myMaw / myCrack: Lingering Snow (Tiny Tailless
     streaking past, the red fanged maw, the four-point star crack);
     myBloom: a burst of frost on a finisher. Streams: myCharge (the stance's
     frost mist), myTrail (her frost wake). */
  const E = CHOREO.events, S = CHOREO.streams, _v = new THREE.Vector3();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shake = s => { BT.B.cam.shake = Math.max(BT.B.cam.shake, s); };
  const tgtPos = (a, A, tgt, k) => tgt ? [tgt.x, tgt.z] : [a.x + Math.sin(A.dir) * (k || 2), a.z + Math.cos(A.dir) * (k || 2)];
  function star(x, y, z, s, col) {   // a four-point star: two thin crossed beams and a glint
    FX.beam(V(x - s, y, z), V(x + s, y, z), col || 0xffffff, 0.05, 0.28);
    FX.beam(V(x, y - s * 1.4, z), V(x, y + s * 1.4, z), col || 0xffffff, 0.05, 0.28);
    FX.glow(x, y, z, s * 1.4, 0xeaf6ff, 0.18, { size1: s * 0.5 });
  }
  function stars(x, y, z, n, spread) { for (let i = 0; i < n; i++) star(x + rnd(-1, 1) * spread, y + rnd(-0.2, 0.9), z + rnd(-1, 1) * spread, rnd(0.22, 0.45), i % 3 === 2 ? 0xd8c8ff : 0xffffff); }
  function mist(x, z, r) {   // frost mist rolling over the ground
    for (let i = 0; i < 24; i++) { const an = rnd(0, PI * 2), d = rnd(0.2, r); FX.p({ x: x + Math.cos(an) * d, y: 0.12, z: z + Math.sin(an) * d, vx: Math.cos(an) * rnd(0.4, 1.4), vy: rnd(0.1, 0.4), vz: Math.sin(an) * rnd(0.4, 1.4), drag: 1.6, life: rnd(0.6, 1.1), size: 0.32, size1: 0.6, col: U.pick([0x7a9ad8, 0xa4c0ff, 0x8a7ad8]) }); }
    FX.ring(x, z, 0.3, r, 0xc8e0ff, 0.55, { a: 0.45 });
  }
  E.myArc = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.0) + (a.airY || 0), r = e.r || 2.2, o = { tilt: e.tilt || 0, arc: e.arc || 2.6, life: 0.3, sweep: e.sweep || 1.0 };
    FX.slash(a.x + fx * 0.3, y, a.z + fz * 0.3, r, dir, e.col || 0x8ab8ff, Object.assign({ width: e.big ? 0.62 : 0.44 }, o));
    FX.slash(a.x + fx * 0.3, y + 0.03, a.z + fz * 0.3, r * 0.86, dir, e.core || 0xffffff, Object.assign({}, o, { width: 0.16, life: 0.22 }));
    if (e.stars) stars(a.x + fx * r * 0.8, y, a.z + fz * r * 0.8, e.stars, 0.6);
    if (e.big) shake(0.16);
  };
  E.myRing = (a, A, e) => {
    const y = (e.y || 0.9) + (a.airY || 0), r = e.r || 2.4, o = { tilt: e.tilt || 0, arc: 6.1, life: 0.32, sweep: 1.6 };
    FX.slash(a.x, y, a.z, r, A.dir, e.col || 0x6a9aff, Object.assign({ width: 0.42 }, o));
    FX.slash(a.x, y + 0.04, a.z, r * 0.9, A.dir, e.edge || 0xffe0f4, Object.assign({}, o, { width: 0.14, life: 0.26 }));   // pink-white edge
    FX.ring(a.x, a.z, 0.4, r, 0xa4c0ff, 0.35, { a: 0.55 });
    if (e.mist) mist(a.x, a.z, r);
    if (e.stars) stars(a.x, y, a.z, e.stars, r * 0.7);
    if (e.big) shake(0.18);
  };
  E.myLines = (a, A, e, tgt) => {
    const [cx, cz] = tgtPos(a, A, tgt, 1.6), n = e.n || 5, L = e.len || 2.4;
    for (let i = 0; i < n; i++) {
      const an = rnd(0, PI * 2), el = rnd(-0.6, 0.6), dx = Math.cos(an) * Math.cos(el) * L, dy = Math.sin(el) * L, dz = Math.sin(an) * Math.cos(el) * L, y = 1.1 + rnd(-0.2, 0.3);
      FX.beam(V(cx - dx, y - dy, cz - dz), V(cx + dx, y + dy, cz + dz), U.pick([0xffffff, 0xb8d8ff, 0xb89aff]), 0.05, 0.2);
    }
    FX.glow(cx, 1.1, cz, 1.5, 0xa4c0ff, 0.16, { size1: 2.2 });
    FX.burst(cx, 1.1, cz, 10, { col: FROSTS, speed: 4, size: 0.08, life: 0.3, g: 1 });
  };
  // Miyuki: one horizontal violet-white line across the target, a star flash
  E.myIaiLine = (a, A, e, tgt) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), sx = Math.cos(dir), sz = -Math.sin(dir), L = e.len || 4, w = e.w || 2.4, y = e.y || 1.05;
    const near = tgt && dist(a, tgt) < L + tgt.rad, cx = near ? tgt.x : a.x + fx * L * 0.6, cz = near ? tgt.z : a.z + fz * L * 0.6;
    FX.beam(V(cx - sx * w, y, cz - sz * w), V(cx + sx * w, y, cz + sz * w), 0xa88aff, 0.16, 0.24);
    FX.beam(V(cx - sx * w * 1.1, y, cz - sz * w * 1.1), V(cx + sx * w * 1.1, y, cz + sz * w * 1.1), 0xffffff, 0.05, 0.2);
    star(cx, y, cz, 0.55);
  };
  // the instant the blade leaves the scabbard
  E.myDrawFlash = a => {
    BT.sock(a, 'chest', _v); FX.glow(_v.x, _v.y, _v.z, 1.6, 0x9a7cff, 0.16, { size1: 2.6 });
    FX.burst(_v.x, _v.y, _v.z, 12, { col: FROSTS, speed: 4, size: 0.08, life: 0.3, g: 0 }); SFX.play('swing');
  };
  E.myBloom = (a, A, e, tgt) => {
    const [x, z] = e.self || !tgt ? [a.x, a.z] : [tgt.x, tgt.z], r = e.r || 2.4;
    FX.burst(x, 1.0, z, 40, { col: FROSTS, speed: 7, size: 0.13, size1: 0.03, life: 0.55, g: 1.5, up: 1 });
    FX.glow(x, 1.1, z, r, 0xa4c0ff, 0.3, { size1: r * 1.8 }); FX.ring(x, z, 0.4, r, 0xb89aff, 0.4); FX.ring(x, z, 0.3, r * 0.7, 0xffffff, 0.3);
    mist(x, z, r * 0.8); shake(0.2 + r * 0.03);
  };
  E.myMist = (a, A, e, tgt) => { const [x, z] = e.self || !tgt ? [a.x, a.z] : [tgt.x, tgt.z]; mist(x, z, e.r || 3); };
  // Hisetsu: a long blue streak along her dash
  E.myMark = (a, A) => { A.myFrom = { x: a.x, z: a.z }; };
  E.myStreak = (a, A) => {
    const f = A.myFrom || { x: a.x - Math.sin(A.dir) * 4, z: a.z - Math.cos(A.dir) * 4 };
    if (Math.hypot(a.x - f.x, a.z - f.z) < 0.4) return;
    FX.beam(V(f.x, 0.9, f.z), V(a.x, 0.9, a.z), 0x4a7aff, 0.5, 0.45); FX.beam(V(f.x, 0.9, f.z), V(a.x, 0.9, a.z), 0xeaf6ff, 0.14, 0.35);
    for (let i = 0; i < 30; i++) { const k = Math.random(); FX.p({ x: lerp(f.x, a.x, k), y: 0.9 + rnd(-0.3, 0.3), z: lerp(f.z, a.z, k), vy: rnd(0, 0.8), life: rnd(0.3, 0.6), size: 0.14, size1: 0.02, col: U.pick(FROSTS) }); }
  };
  // X-shaped violet slashes across the target, facing the camera
  E.myCross = (a, A, e, tgt) => {
    const [x, z0] = tgtPos(a, A, tgt, 2), s = e.s || 2.4, y = 1.2 + s * 0.3, z = z0 + 0.7;
    for (const k of [1, -1]) {
      const p0 = V(x - s, y + k * s * 0.5, z), p1 = V(x + s, y - k * s * 0.5, z);
      FX.beam(p0, p1, 0x8a5aff, e.big ? 0.3 : 0.2, 0.34); FX.beam(p0, p1, 0xffffff, e.big ? 0.1 : 0.07, 0.28);
    }
    if (e.stars) stars(x, y - 0.3, z, e.stars, s * 0.5);
    FX.glow(x, y, z, s, 0x9a7cff, 0.26, { size1: s * 1.8 });
    shake(e.big ? 0.35 : 0.18); if (e.big) SFX.play('boom');
  };
  // Hisetsu's follow-up: three arcs rising over the target in a dome
  E.myDome = (a, A, e, tgt) => {
    const [x, z] = tgtPos(a, A, tgt, 2), r = e.r || 2.6;
    for (let i = 0; i < 3; i++) FX.slash(x, 0.1, z, r, A.dir + i * PI / 3, i ? 0x7aa8ff : 0xeaf6ff, { tilt: -PI / 2, arc: PI, width: 0.3, life: 0.42, sweep: 0.2 });
    FX.ring(x, z, 0.5, r, 0xa4c0ff, 0.42); FX.glow(x, r * 0.5, z, r, 0xa4c0ff, 0.25, { size1: r * 1.6 });
    stars(x, r * 0.6, z, 2, r * 0.5); shake(0.2);
  };
  // Shimotsuki's release: huge stacked crescent waves in white, violet and blue, flying out ahead
  E.myWaves = (a, A, e) => {
    const n = e.n || 3, big = e.big ? 1.35 : 1, dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), x0 = a.x, z0 = a.z;
    for (let i = 0; i < n; i++) {
      const r0 = (1.5 + i * 0.45) * big, col = [0xffffff, 0xb89aff, 0x6a9aff, 0xa4c0ff, 0xeaf6ff][i % 5], delay = i * 0.05, life = 0.5 + delay, L = (e.len || 6) + i * 0.6, y = 0.8 + i * 0.22;
      const geo = new THREE.RingGeometry(r0, r0 + 0.5 * big, 28, 1, -1.15, 2.3), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
      const m = new THREE.Mesh(geo, mat), g = new THREE.Group(); g.add(m);
      m.rotation.x = -PI / 2 + (i - (n - 1) / 2) * 0.18; m.rotation.z = -PI / 2;
      g.rotation.y = dir; g.position.set(x0, y, z0);
      FX.custom(g, life, k => {
        const kk = clamp((k * life - delay) / 0.5, 0, 1);
        g.position.set(x0 + fx * kk * L, y, z0 + fz * kk * L); mat.opacity = kk > 0 ? 0.9 * (1 - kk * kk) : 0;
        if (kk > 0 && Math.random() < 0.5) FX.p({ x: g.position.x + rnd(-1, 1), y: y + rnd(-0.3, 0.3), z: g.position.z + rnd(-1, 1), life: 0.3, size: 0.16, size1: 0.02, col: U.pick(FROSTS) });
      }, [mat, geo]);
    }
    BT.sock(a, 'weapon', _v); star(_v.x, _v.y, _v.z, 0.6);
    shake(e.big ? 0.4 : 0.22); SFX.play('heavy');
  };
  // Spring's Call: a horizontal piercing slash, straight through
  E.myBeam = (a, A, e) => {
    const L = e.len || 9, fx = Math.sin(A.dir), fz = Math.cos(A.dir), p0 = V(a.x + fx * 0.4, 1.0, a.z + fz * 0.4), p1 = V(a.x + fx * L, 1.0, a.z + fz * L);
    FX.beam(p0, p1, 0x4a7aff, 0.6, 0.38); FX.beam(p0, p1, 0xeaf6ff, 0.2, 0.32); FX.beam(V(p0.x, 1.25, p0.z), V(p1.x, 1.25, p1.z), 0xe07ae8, 0.06, 0.26);
    for (let i = 0; i < 40; i++) { const d = rnd(0.5, L); FX.p({ x: a.x + fx * d + rnd(-0.3, 0.3), y: 1 + rnd(-0.3, 0.3), z: a.z + fz * d + rnd(-0.3, 0.3), vx: rnd(-1, 1), vy: rnd(-0.5, 1), vz: rnd(-1, 1), life: rnd(0.3, 0.6), size: 0.15, size1: 0.02, col: U.pick(FROSTS) }); }
    star(p1.x, 1.0, p1.z, 0.7); shake(0.25); SFX.play('heavy');
  };
  // Lingering Snow: Tiny Tailless streaks past like a comet, its red mouth open
  E.myComet = (a, A, e, tgt) => {
    const fx = Math.sin(A.dir), fz = Math.cos(A.dir), sx = Math.cos(A.dir), sz = -Math.sin(A.dir);
    const x0 = a.x + sx * 1.2 - fx * 1.5, z0 = a.z + sz * 1.2 - fz * 1.5, [x1, z1] = tgtPos(a, A, tgt, 4), p = V(x0, 2.4, z0);
    FX.glow(x0, 2.4, z0, 1.0, 0xff3a5a, 0.42, { size1: 0.8, follow: () => p });
    FX.custom(new THREE.Group(), 0.42, k => {
      const kk = U.easeIn(k); p.set(lerp(x0, x1, kk), lerp(2.4, 1.2, kk), lerp(z0, z1, kk));
      for (let i = 0; i < 3; i++) FX.p({ x: p.x, y: p.y, z: p.z, vx: rnd(-0.6, 0.6), vy: rnd(0, 1.2), vz: rnd(-0.6, 0.6), drag: 2, life: 0.45, size: 0.24, size1: 0.02, col: U.pick([0x3a6aff, 0x6bd6e4, 0xa8c8ff]) });
      FX.p({ x: p.x, y: p.y, z: p.z, life: 0.12, size: 0.34, size1: 0.1, col: 0xff3a5a });
    });
  };
  // ...the giant red fanged maw...
  E.myMaw = (a, A, e, tgt) => {
    const [x, z0] = tgtPos(a, A, tgt, 2), z = z0 + 0.9, R = e.r || 2.6, y = 1.6;
    for (const s of [1, -1]) {   // the upper jaw and the lower, the fangs pointing in
      let prev = null;
      for (let i = 0; i <= 8; i++) {
        const an = PI * (0.1 + 0.8 * i / 8), px = x - Math.cos(an) * R, py = y + s * (0.25 + Math.sin(an) * R * 0.38), p = V(px, py, z);
        if (prev) FX.beam(prev, p, 0xd0183a, 0.16, 0.45);
        if (i > 0 && i < 8) FX.beam(p, V(px, py - s * 0.5 * Math.sin(an), z), 0xffffff, 0.07, 0.4);
        prev = p;
      }
    }
    FX.glow(x, y, z, R * 1.5, 0xc0103a, 0.4, { size1: R * 2.2 });
  };
  // ...and the cyan flash, a four-point star cracking open
  E.myCrack = (a, A, e, tgt) => { const [x, z] = tgtPos(a, A, tgt, 2), s = e.s || 3; star(x, 1.5, z + 0.8, s, 0x6bd6e4); star(x, 1.5, z + 0.85, s * 0.45, 0xffffff); FX.glow(x, 1.5, z, s * 2.2, 0x6bd6e4, 0.3, { size1: s * 3.5 }); };
  // Shimotsuki Stance: frost mist round her feet, motes drawn in to the blade
  S.myCharge = (a, A, s, dt) => {
    if (Math.random() < dt * 30) { const an = rnd(0, PI * 2), r = rnd(1.2, 2.4); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.1, 1.6), z: a.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.2, vz: -Math.sin(an) * r * 2.2, drag: 1, life: 0.4, size: 0.1, size1: 0.02, col: U.pick(FROSTS) }); }
    if (Math.random() < dt * 14) FX.p({ x: a.x + rnd(-1.4, 1.4), y: 0.12, z: a.z + rnd(-1.4, 1.4), vy: rnd(0.1, 0.3), life: 0.8, size: 0.3, size1: 0.55, col: U.pick([0xa4c0ff, 0x7a8ad8]) });
    if (Math.random() < dt * 4) FX.ring(a.x, a.z, 0.3, 1.8 + (s.lv || 1) * 0.3, 0xa4c0ff, 0.4, { a: 0.4 });
  };
  S.myTrail = (a, A, s, dt) => {
    const n = Math.max(1, Math.round(dt * 120));
    for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.2, 0.2), y: 0.3 + rnd(0, 1.2) + (a.airY || 0), z: a.z + rnd(-0.2, 0.2), life: 0.4, size: 0.14, size1: 0.02, col: U.pick(FROSTS) });
    if (Math.random() < 0.6) FX.glow(a.x, 1.0 + (a.airY || 0), a.z, 1.3, 0x6a9aff, 0.22, { size1: 1.1, a: 0.55 });
  };
  // Frostburn - Break: violet frost-flame bursting up from the target
  function frostburnFx(v) {
    FX.pillar(v.x, v.z, Math.max(0.6, v.rad), 4, 0x8a5aff, 0.5);
    FX.burst(v.x, 1, v.z, 46, { col: [0xffffff, 0xb89aff, 0x6a9aff, 0xe07ae8], speed: 7, size: 0.15, size1: 0.03, life: 0.6, g: -2, up: 2 });
    FX.ring(v.x, v.z, 0.4, 3, 0xb89aff, 0.45); FX.glow(v.x, 1.2, v.z, 3, 0x9a7cff, 0.35, { size1: 5 });
    star(v.x, v.height * 0.8, v.z + 0.6, 0.8); shake(0.25);
  }
  function blockFx(a) {
    BT.sock(a, 'weapon', _v);
    FX.glow(_v.x, _v.y, _v.z, 1.6, 0xd8e8ff, 0.18, { size1: 2.6 }); FX.burst(_v.x, _v.y, _v.z, 16, { col: FROSTS, speed: 6, size: 0.08, life: 0.3 });
    if (BT.T.dmgNumbers) FX.number(a.x, a.height, a.z, 'BLOCK', 'miss');
    SFX.play('parry');
  }

  /* ---------------------------------------- the blade and Tiny Tailless --
     Each frame of a battle (BT.on 'frame', for her and for a rival Proxy's
     Miyabi): the move she is making says which blade is out (def.myBlade,
     from def.myDrawAt, until def.mySheathAt); a beat after she stops she
     sheathes it. Tiny Tailless floats by her, bobbing in its foxfire, only
     while the blade is sheathed and she is still: it retreats into the blade
     when she fights, and comes back in a puff of blue fire. */
  const PROTO = {};
  const proto = k => PROTO[k] || (PROTO[k] = (() => { const g = new VX.Grid(); DRAW[k](g); return VX.object(g, MODELS.miyabi.scale, { cast: false }); })());
  function foxfire(e, n) {
    BT.sock(e, 'tiny', _v);
    FX.burst(_v.x, _v.y, _v.z, n, { col: [0x3a6aff, 0x6bd6e4, 0xa8d8ff], speed: 2.5, size: 0.12, size1: 0.02, life: 0.5, g: -1.5 });
    FX.glow(_v.x, _v.y, _v.z, 0.9, 0x4a8aff, 0.3, { size1: 1.6 });
  }
  function syncLook(e, rdt) {
    const P = e.rig && e.rig.parts, B = BT.B; if (!P || !P.myBlade || !P.mySpirit || !P.tiny) return;
    if (!P.myBlade.userData.armed) { P.myBlade.add(proto('blade').clone()); P.mySpirit.add(proto('spirit').clone()); P.myBlade.userData.armed = true; }
    const A = e.act, d = A && A.def;
    let want = d && d.myBlade && A.t >= (d.myDrawAt || 0) && !(d.mySheathAt && A.t >= d.mySheathAt) ? d.myBlade : null;
    if (e.myIdle == null) e.myIdle = 9;
    e.myIdle = A ? 0 : e.myIdle + rdt;
    if (!want && !A && e.myIdle < 0.25) want = e.myLast || null;                 // a beat before she sheathes
    e.myLast = want;
    P.myBlade.visible = want === 'blade'; P.mySpirit.visible = want === 'spirit'; P.tsuka.visible = !want;
    const tiny = !want && e.myIdle > 0.8 && e.alive !== false;
    if (tiny !== P.tiny.visible && e.obj.visible) foxfire(e, tiny ? 14 : 8);
    P.tiny.visible = tiny;
    if (tiny) {
      P.tiny.position.y = e.rig.rest.tiny.py + Math.sin(B.real * 2.4 + e.seed) * 0.05;
      if (e.obj.visible && Math.random() < rdt * 10) { BT.sock(e, 'tiny', _v); FX.p({ x: _v.x + rnd(-0.15, 0.15), y: _v.y - 0.05, z: _v.z + rnd(-0.15, 0.15), vy: rnd(0.4, 0.9), drag: 1, life: 0.6, size: 0.14, size1: 0.02, col: U.pick([0x3a6aff, 0x6bd6e4, 0xa8d8ff]) }); }
    }
  }
  // (agent files load before battle.js: the frame hook goes in once the page has loaded, or at her first battle)
  let hooked = false;
  function hookLook() {
    if (hooked || !window.BT || !BT.on) return;
    hooked = true;
    BT.on((kind, rdt) => {
      if (kind !== 'frame' || !BT.B) return;
      const B = BT.B;
      for (const e of B.squad) if (e.id === 'miyabi') syncLook(e, rdt || 0);
      if (B.rival) for (const e of B.rival.squad) if (e.id === 'miyabi') syncLook(e, rdt || 0);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookLook); else hookLook();

  /* -------------------------------------------------------- choreography --
     myBlade: the silver blade for her Physical cuts (Kazahana 1-2, Fuyubachi),
     the spectral blade for every Frost move (our reading of "during skills"). */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const arc = (t, o) => Object.assign({ t, fx: 'myArc' }, o || {});
  const PHYS = { col: 0xffc070, core: 0xfff4e0 };   // Kazahana 1-2: orange-white arcs (Physical)
  set(K.basic[0], { myBlade: 'blade', motion: [{ t0: 0.02, t1: 0.15, kind: 'fwd', d: 0.5 }], events: [arc(0.15, Object.assign({ tilt: -0.6, r: 2.0, arc: 2.4, sweep: -1.0 }, PHYS))] });
  set(K.basic[1], { myBlade: 'blade', motion: [{ t0: 0.02, t1: 0.16, kind: 'side', d: 0.4, side: 'auto' }], events: [arc(0.16, Object.assign({ tilt: 0.35, r: 2.1, arc: 2.6, sweep: 1.2 }, PHYS))] });
  set(K.basic[2], { myBlade: 'spirit', motion: [{ t0: 0.02, t1: 0.24, kind: 'fwd', d: 0.4 }], events: [{ t: 0.24, fx: 'myRing', r: 2.4, y: 0.9 }] });
  set(K.basic[3], { myBlade: 'spirit', motion: [{ t0: 0.02, t1: 0.38, kind: 'fwd', d: 0.5, ease: 'lin' }], events: [0.14, 0.26, 0.38].map(t => ({ t, fx: 'myLines', n: 4 })) });
  set(K.basic[4], { myBlade: 'spirit', mySheathAt: 0.74, motion: [{ t0: 0.02, t1: 0.5, kind: 'fwd', d: 0.4, ease: 'lin' }],
    events: [{ t: 0.2, fx: 'myRing', r: 2.8, y: 0.7, mist: true }, { t: 0.36, fx: 'myRing', r: 3.0, y: 1.1, tilt: 0.12 }, { t: 0.52, fx: 'myRing', r: 3.2, y: 0.85, tilt: -0.1, stars: 4, big: true }] });
  // Shimotsuki: sheathed through the stance; the spectral blade only for the draw, then back in the scabbard
  for (const [k, lv] of [['shimo1', 1], ['shimo2', 2], ['shimo3', 3]]) {
    const h0 = K[k].hits[0].t, h1 = K[k].hits[K[k].hits.length - 1].t;
    set(K[k], { myBlade: 'spirit', myDrawAt: h0 - 0.06, mySheathAt: h1 + 0.3, stream: [{ t0: 0, t1: h0 - 0.06, kind: 'myCharge', lv }],
      events: [{ t: h0 - 0.06, fx: 'myDrawFlash' }, { t: h0, fx: 'myWaves', n: 2 + lv, big: lv === 3, len: 5 + lv }, { t: h0, fx: 'myMist', r: 2 + lv * 0.6, self: true }] });
  }
  K.shimo3.events.push({ t: 1.32, fx: 'myCross', s: 4, big: true, stars: 6 }, { t: 1.32, fx: 'whiteFlash' });   // level 3: the screen-wide X, star flashes
  set(K.dash, { myBlade: 'blade', motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.2, kind: 'myTrail' }], events: [arc(0.2, Object.assign({ tilt: -0.3, r: 2.0 }, PHYS))] });
  set(K.counter, { myBlade: 'spirit', motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.1, t1: 0.22, kind: 'fwd', d: 1.0 }], stream: [{ t0: 0, t1: 0.2, kind: 'myTrail' }],
    events: [arc(0.22, { r: 2.8, arc: 3.0, big: true, tilt: -0.2, stars: 2 }), { t: 0.24, fx: 'myBloom', r: 2 }] });
  set(K.special, { myBlade: 'spirit', myDrawAt: 0.14, events: [{ t: 0.14, fx: 'myDrawFlash' }, { t: 0.2, fx: 'myIaiLine', len: 4 }] });
  set(K.ex, { myBlade: 'spirit', motion: [{ t0: 0.08, t1: 0.38, kind: 'charge', d: 8, hit: 0.26 }], stream: [{ t0: 0.06, t1: 0.4, kind: 'myTrail' }],
    events: [{ t: 0.07, fx: 'myMark' }, { t: 0.14, fx: 'myLines', n: 6 }, { t: 0.4, fx: 'myStreak' }, { t: 0.62, fx: 'myCross', s: 2.4, stars: 3 }, { t: 0.62, fx: 'myBloom', r: 2.6 }] });
  set(K.ex2, { myBlade: 'spirit', motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.2 }], events: [{ t: 0.3, fx: 'myDome', r: 2.8 }, { t: 0.62, fx: 'myCross', s: 3, big: true, stars: 4 }, { t: 0.62, fx: 'myBloom', r: 3 }] });
  set(K.chain, { myBlade: 'spirit', motion: [{ t0: 0, t1: 0.2, kind: 'back', d: 1.2 }, { t0: 0.45, t1: 0.62, kind: 'toTarget', gap: 0.6 }], stream: [{ t0: 0.45, t1: 0.62, kind: 'myTrail' }],
    events: [{ t: 0.24, fx: 'myDrawFlash' }, { t: 0.3, fx: 'myBeam', len: 9 }, { t: 0.72, fx: 'myRing', r: 3.4, y: 0.8, mist: true }, { t: 0.86, fx: 'myRing', r: 3.6, y: 1.2, tilt: 0.15 },
      { t: 1.0, fx: 'myRing', r: 3.8, y: 0.9, stars: 5, big: true }, { t: 1.0, fx: 'myBloom', r: 3.6, self: true }, { t: 1.0, fx: 'whiteFlash' }] });
  // Lingering Snow: in, round the target cutting from every side, back to the centre, and the Finishing Move
  set(K.ult, { myBlade: 'spirit', mySheathAt: 2.22,
    motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.3 }, { t0: 0.34, t1: 1.22, kind: 'orbit', ang: PI * 2, gap: 1.5, ease: 'lin' }, { t0: 1.26, t1: 1.5, kind: 'back', d: 1.4 }],
    stream: [{ t0: 0, t1: 1.24, kind: 'myTrail' }],
    events: [{ t: 0.04, fx: 'myComet' }].concat([0.45, 0.62, 0.79, 0.96, 1.13].map(t => ({ t, fx: 'myLines', n: 5, len: 3.2 })))
      .concat([{ t: 1.3, fx: 'myMist', r: 4 }, { t: 1.72, fx: 'myMaw', r: 2.8 }, { t: 1.86, fx: 'myDrawFlash' }, { t: 1.9, fx: 'myCrack', s: 3.2 }, { t: 1.9, fx: 'myCross', s: 4.2, big: true, stars: 6 }, { t: 1.9, fx: 'myBloom', r: 5 }, { t: 1.9, fx: 'whiteFlash' }]) });
  set(K.quick, { myBlade: 'spirit', motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'myTrail' }], events: [arc(0.24, { r: 2.6, arc: 2.8, tilt: -0.5, sweep: -1.0, stars: 1 })] });
  set(K.followup, { myBlade: 'spirit', motion: [{ t0: 0.05, t1: 0.3, kind: 'toTarget', gap: 0.9 }], stream: [{ t0: 0.05, t1: 0.3, kind: 'myTrail' }],
    events: [{ t: 0.3, fx: 'myDrawFlash' }, { t: 0.36, fx: 'myIaiLine', len: 3 }, arc(0.36, { r: 3.0, arc: 3.0, big: true, stars: 2 }), { t: 0.4, fx: 'myBloom', r: 2.6 }] });
  set(K.assist, { myBlade: 'spirit' });   // Drifting Petals: the spectral blade meets the blow
})();
