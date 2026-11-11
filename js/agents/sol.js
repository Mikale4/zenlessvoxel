/* ============================================================================
   agents/sol.js -- Sol Badguy, a GUEST from Guilty Gear (Arc System Works):
   the bounty hunter, the Prototype Gear, the "Flame of Corruption". He is not
   in Zenless Zone Zero: here he is an S-Rank Fire Attack Agent with a
   Defensive Assist, and HIS KIT IS THIS GAME'S OWN MAPPING of his real Guilty
   Gear -Strive- moves onto ZZZ's structure (no official ZZZ kit exists).
   (An Agent in his own file: the hooks and helpers are listed at the top of
   js/agents/zhuyuan.js.)

   Sources: Dustloop (GGST/Sol_Badguy: every move, its input and what it
   does; the Clean Hit rule), the Guilty Gear Wiki (Sol_Badguy: design,
   personality, abilities, Strive's story, trivia; Sol_Badguy/Quotes; the
   Junkyard Dog and Outrage pages), the official Guilty Gear -Strive- site
   (profile: 184 cm, Queen, "Sheer Heart Attack", dislikes effort, weapon
   "Outrage Mk.II"), guiltygear.wiki.gg (the "JUNKYARD DOG MK.3" stencil on
   the Strive sword), the official Strive render and concept sheet, Dustloop's
   move screenshots (the flame colours).

   His moves (Guilty Gear -Strive-, Dustloop) and where they go here:
     5K, c.S, f.S, 6S, Bandit Revolver   Basic Attack: Bandit Revolver (5 hits:
                                     a knee and a kick, a close slash, a
                                     lunging gut punch, a stepping sword swing,
                                     then Bandit Revolver: a charging jumping
                                     knee and a revolving kick). Hits 1-3
                                     Physical, 4-5 Fire.
     Night Raid Vortex (hold OK)     Dash Attack: a rush low along the ground,
                                     an uppercut. Basic held after a dodge
                                     charges it, as the real move charges: a
                                     longer rush, Fire, a heavy knockdown.
     Fafnir                          Dodge Counter: a lunging flaming straight
                                     punch.
     Gun Flame                       Special Attack: a pillar of flame that
                                     crawls along the ground.
     Volcanic Viper (H)              EX Special Attack (40 Energy): a flaming
                                     rising slash, invulnerable.
     Sidewinder Ignited              Special again during Volcanic Viper (20
                                     Energy; the real follow-up comes out of
                                     the H Viper "until Sol lands"): he
                                     detonates his sword and blows them away.
     Bandit Bringer                  Chain Attack: up, then a dive to the ground.
     Tyrant Rave                     Ultimate: an uppercut, then a blow that
                                     sends them flying.
     Wild Throw                      Quick Assist: a command grab; the enemy
                                     lands on his other side.
     Faultless Defense (universal)   Defensive Assist: the guard that pushes the
                                     blow back.
     Volcanic Viper (S)              Assist Follow-Up: the invulnerable
                                     reversal.
     Clean Hit                       Core Passive: Dustloop's rule: Sidewinder
                                     Ignited at the centre of its blast, Fafnir
                                     at point-blank, and Tyrant Rave's second
                                     hit after its first connected up close
                                     "Clean Hit" for more damage. Here: +40% DMG
                                     at point-blank (Zhu Yuan's core figure).
     Dragon Install                  Additional Ability: his latent Gear power
                                     (the Wiki; Strive's Heavy Mob Cemetery is
                                     "Dragon Install-powered"). With a Stun
                                     Agent or another Fire Agent in the squad,
                                     a Clean Hit gives 10 s of DMG +15%.
   Not used: Gun Flame (Feint), Bandit Bringer's air version, Heavy Mob
   Cemetery, Roman Cancels, Tension. Voice lines: none.
   Our choices (no source can give them, he is not in ZZZ): every number. The
   multipliers below are written as "official level-12" values and scaled like
   every Agent's (DMG x0.45, Daze x0.6), set beside Zhu Yuan, Evelyn and Hugo
   and no stronger overall: Basic string 1180% (Evelyn 1207, Zhu Yuan 1243),
   EX 780% for 40 Energy + Sidewinder 420% for 20 (Evelyn 1202% for 60), Chain
   1420% (Hugo 1403), Ultimate 3800% (Evelyn 3977), Dodge Counter 360% (Zhu
   Yuan 354), Follow-Up 580% (Evelyn 584). Point-blank: within 1.6 m of the
   enemy's edge. The parry's Daze is the game's usual light-parry 407.7. Fire
   Anomaly Buildup about 0.4 of a hit's DMG, as the Fire Attack Agents'.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add, mix } = ANIM;
  const { clamp, rnd, lerp, dist } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // "official level-12" multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // his fire, sampled from Dustloop's Gun Flame, Volcanic Viper and Fafnir shots: a pale yellow core, yellow, orange, red
  const FLAME = [0xf8f888, 0xf8d848, 0xf8a838, 0xf88848, 0xf87838, 0xf84818], FL_DARK = 0xa83828, STEEL = 0xd8dde4, AFTER = 0xf88848;
  const CLEAN = 0.4, CLEAN_R = 1.6;                   // Clean Hit: +40% DMG within 1.6 m of the enemy's edge (our choice)
  const DI_DMG = 0.15, DI_T = 10;                     // Dragon Install: DMG +15% for 10 s (our choice)

  /* ----------------------------------------------------------------- kit --
     clean: a hit that Clean Hits an enemy at point-blank ('after': only one
     the move's first hit (solFirst) struck up close); solAir: a move that
     keeps him in the air (any other drops him back to the ground at once).
     fx 'solNone': the move's own choreography draws the hit. */
  const BR = 'Basic Attack: Bandit Revolver', PHYS = { attr: 'physical' }, NONE = { fx: 'solNone' };
  const o = (...a) => Object.assign({}, NONE, ...a);
  const K = {
    basic: [
      // 5K: a fast knee, then the fully extended kick
      { name: BR, anim: 'solKnee', dur: 0.42, cancel: 0.3, reach: 1.6, range: 1.4, hits: [hit(0.12, 38, 15, 0, PHYS), hit(0.26, 57, 23, 0, PHYS)] },
      // c.S: the close slash
      { name: BR, anim: 'solCS', dur: 0.44, cancel: 0.32, reach: 1.8, range: 1.5, hits: [hit(0.16, 125, 70, 0, { attr: 'physical', arc: 150 })] },
      // f.S: the lunging gut punch
      { name: BR, anim: 'solGut', dur: 0.5, cancel: 0.36, reach: 2.4, range: 1.6, hits: [hit(0.2, 160, 95, 0, { attr: 'physical', shape: 'cone', r: 2.4, arc: 70, kb: 0.4 })] },
      // 6S: a step and a wide swing of the sword, burning
      { name: BR, anim: 'sol6S', dur: 0.66, cancel: 0.5, reach: 2.6, range: 1.8, hits: [hit(0.26, 330, 200, 125, o({ arc: 170, r: 3.0, kb: 0.5 }))] },
      // Bandit Revolver: the charging jumping knee, then the revolving kick that knocks down
      { name: BR, anim: 'solRevolver', dur: 0.85, cancel: 0.7, reach: 2.4, range: 1.6, solAir: true,
        hits: [hit(0.2, 470 * 0.35, 260 * 0.35, 160 * 0.35, o({ shape: 'cone', r: 2.4, arc: 80 })), hit(0.48, 470 * 0.65, 260 * 0.65, 160 * 0.65, o({ heavy: true, shape: 'circle', at: 'front', r: 2.3, kb: 1.0 }))] },
    ],
    dash: { name: 'Dash Attack: Night Raid Vortex', anim: 'solVortex', dur: 0.55, cancel: 0.42, reach: 7, hits: [hit(0.3, 120, 45, 0, { attr: 'physical', shape: 'cone', r: 2.2, arc: 80, kb: 0.5 })] },
    // held: charged, as the real move is (more startup and travel, more damage, a hard knockdown)
    dashC: { name: 'Dash Attack: Night Raid Vortex (Charged)', anim: 'solVortex', dur: 0.85, cancel: 0.7, reach: 7.5, hits: [hit(0.56, 290, 130, 80, o({ heavy: true, shape: 'cone', r: 2.5, arc: 90, kb: 1.0 }))] },
    counter: { name: 'Dodge Counter: Fafnir', anim: 'solFafnir', dur: 0.62, cancel: 0.48, inv: [0, 0.56], hits: [hit(0.22, 360, 250, 70, o({ heavy: true, shape: 'line', r: 1.0, len: 3.2, kb: 1.0, clean: true }))] },
    special: { name: 'Special Attack: Gun Flame', anim: 'solGun', dur: 0.7, cancel: 0.55, reach: 6.5, range: 4.5, cd: 1.2, hits: [hit(0.36, 150, 110, 60, o({ shape: 'line', r: 0.9, len: 6.5, kb: 0.5 }))] },
    ex: { name: 'EX Special Attack: Volcanic Viper', anim: 'solViper', dur: 1.0, cancel: 0.62, cost: 40, reach: 2.4, range: 1.6, inv: [0, 0.95], solAir: true,
      hits: [0.2, 0.32, 0.44].map((t, i) => hit(t, 780 / 3, 520 / 3, 310 / 3, o({ shape: 'circle', at: 'front', r: 2.2, kb: i === 2 ? 1.0 : 0.2 }, i === 2 ? { heavy: true } : {}))) },
    // Special again during Volcanic Viper (battle.js: K.ex2 within the EX's window)
    ex2: { name: 'EX Special Attack: Sidewinder Ignited', anim: 'solSide', dur: 0.8, cancel: 0.66, cost: 20, reach: 2.6, inv: [0, 0.75], solAir: true,
      hits: [hit(0.3, 420, 240, 160, o({ heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.6, clean: true }))] },
    chain: { name: 'Chain Attack: Bandit Bringer', anim: 'solBringer', dur: 1.35, inv: [0, 1.35], solAir: true,
      hits: [hit(0.84, 1420 * 0.6, 330 * 0.6, 420 * 0.6, o({ shape: 'circle', at: 'target', r: 2.8, kb: 0.6 })), hit(1.0, 1420 * 0.4, 330 * 0.4, 420 * 0.4, o({ heavy: true, shape: 'circle', at: 'target', r: 3.4, kb: 1.2 }))] },
    // Tyrant Rave: the uppercut launches; the blow-away Clean Hits only an enemy the uppercut struck up close
    ult: { name: 'Ultimate: Tyrant Rave', anim: 'solTyrant', dur: 2.2, inv: [0, 2.2],
      hits: [hit(0.7, 3800 * 0.3, 380 * 0.6, 300 * 0.3, o({ shape: 'cone', r: 2.8, arc: 100, kb: 0.3, solFirst: true })), hit(1.55, 3800 * 0.7, 380 * 0.4, 300 * 0.7, o({ heavy: true, shape: 'cone', r: 4.8, arc: 80, kb: 1.8, clean: 'after' }))] },
    // Faultless Defense: the game's usual Light Defensive Assist Daze, unscaled (battle.js adds 20% against a heavy blow)
    assist: { name: 'Defensive Assist: Faultless Defense', type: 'defensive', anim: 'solFD', dur: 0.45, inv: [0, 0.45], daze: Math.round(407.7) },
    followup: { name: 'Assist Follow-Up: Volcanic Viper', anim: 'solViper', dur: 1.0, inv: [0, 0.95], solAir: true,
      hits: [hit(0.24, 580 * 0.35, 370 * 0.35, 240 * 0.35, o({ shape: 'circle', at: 'front', r: 2.4, kb: 0.3 })), hit(0.5, 580 * 0.65, 370 * 0.65, 240 * 0.65, o({ heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.0 }))] },
    quick: { name: 'Quick Assist: Wild Throw', anim: 'solThrow', dur: 0.62, inv: [0, 0.58], hits: [hit(0.3, 150, 110, 65, o({ shape: 'cone', r: 2.2, arc: 70, kb: 0.6 }))] },
  };

  /* -------------------------------------------- Clean Hit, Dragon Install -- */
  const close = (a, v) => dist(a, v) - (v.rad || 0.5) <= CLEAN_R;
  const cleanOK = (a, v, h, A) => (h.clean === 'after' ? !!(A.data.solNear && A.data.solNear.has(v)) : close(a, v));
  const baseAttr = at => (D.ATTR[at] && D.ATTR[at].as) || at;
  function cleanHit(a, v, A) {
    const B = BT.B, t = B.t;
    FX.glow(v.x, 1.1, v.z, 2.6, 0xffffff, 0.18, { size1: 3.8 }); FX.ring(v.x, v.z, 0.3, 2.4, 0xf8d848, 0.35, { y: 0.5 });
    FX.burst(v.x, 1.0, v.z, 24, { col: FLAME, speed: 7, size: 0.13, size1: 0.03, life: 0.45, g: 1 });
    if (!A.data.solTold) {
      A.data.solTold = true;
      BT.callout('CLEAN HIT', 'skill', 'Sol · ' + A.def.name.replace(/^.*: /, '') + ' · +40% DMG');
      BT.log(`Sol: Clean Hit! ${A.def.name.replace(/^.*: /, '')} at point-blank (+40% DMG).`, 'skill');
    }
    // Dragon Install: a Stun Agent or another Fire Agent in the squad
    if (a.solDIok) {
      if (!(a.solDI > t)) { BT.callout('DRAGON INSTALL', 'skill', 'Sol · DMG +15% · 10 s'); BT.log('Sol: Dragon Install (DMG +15% for 10 s).', 'skill'); flareFx(a); }
      a.solDI = t + DI_T;
    }
  }

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.sol = {
    id: 'sol', name: 'Sol Badguy', short: 'Sol', faction: 'Guest · Guilty Gear', spec: 'Attack', attr: 'fire', rank: 'S',
    color: '#a45043', color2: '#f8a838', assist: 'defensive', stance: 'sol',
    blurb: 'A guest from Guilty Gear: the bounty hunter Sol Badguy, the Prototype Gear, a man of few words who hates effort and likes to end a fight with one blow. His kit is this game\'s mapping of his Guilty Gear -Strive- moves: a sword that burns, Gun Flame along the ground, Volcanic Viper into Sidewinder Ignited, Tyrant Rave, and Clean Hits up close.',
    // HP 8590, DEF 648, Impact 93, CRIT 49% / 90%: the scale rule's S-Rank Attack Agent (Hugo, Harumasa). Our choice: he has no ZZZ stats
    stats: { hp: 8590, atk: 3100, def: 648, impact: 93, ap: 92, am: 93, cr: 0.49, cd: 0.9, er: 1.2, speed: 4.8 },
    ai: { range: 1.8, dodge: 0.8, reflex: 0.64, aggr: 1.0 },
    energyMax: 120, resource: 'clean',
    core: [
      ['Core Passive: Clean Hit', 'His Dodge Counter (Fafnir), Sidewinder Ignited and the second hit of his Ultimate (Tyrant Rave: only on an enemy its uppercut struck up close) Clean Hit an enemy at point-blank, within 1.6 m: 40% more DMG. This kit is this game\'s mapping of his Guilty Gear -Strive- moves; Clean Hit is their rule there.'],
      ['Volcanic Viper, Sidewinder Ignited', 'Special is Gun Flame, a pillar of fire crawling along the ground; with 40 Energy, EX Special Attack: Volcanic Viper, an invulnerable flaming rising slash. Special again during it (or just after) spends 20 more on Sidewinder Ignited: he detonates his sword. Hold Basic after a dodge to charge Night Raid Vortex: a longer rush, Fire, a heavy uppercut.'],
      ['Additional Ability: Dragon Install', 'With a Stun Agent or another Fire Agent in the squad: a Clean Hit puts him in Dragon Install for 10 s (another Clean Hit starts it over): all his DMG +15%.'],
    ],
    kit: K,
    kitShow: [['Dash hold', 'dashC'], ['EX again', 'ex2']],
    rivalMoves: [{ k: 'dashC', kind: 'dash', p: 0.15, cd: 6 }, { k: 'special', kind: 'special', p: 0.2, cd: 4 }],
    howto: 'Sol (a guest from Guilty Gear; his kit is this game\'s mapping of his Strive moves): Special is Gun Flame, fire along the ground; with 40 Energy it is Volcanic Viper, and Special again during it spends 20 more on Sidewinder Ignited. Hold Basic after a dodge to charge Night Raid Vortex. His Dodge Counter (Fafnir), Sidewinder Ignited and Tyrant Rave Clean Hit an enemy at point-blank for 40% more DMG; with a Stun or another Fire Agent in the squad a Clean Hit starts Dragon Install (DMG +15%, 10 s). Defensive Assist.',
    mech: {
      init(a) { Object.assign(a, { solDI: 0, solDIok: false }); },
      squad(a, B) { a.solDIok = B.squad.some(s => s !== a && (s.def.spec === 'Stun' || baseAttr(s.def.attr) === 'fire')); },
      start(a, def, A) {
        // AUTO presses Special again during Volcanic Viper now and then: Sidewinder Ignited
        if (def === K.ex && !(A.data && A.data.manual) && a.energy >= K.ex2.cost && Math.random() < 0.7) a.queue.push({ def: K.ex2, kind: 'ex2', delay: 0.05 });
      },
      // Clean Hit (and Dragon Install's DMG); the Clean Hit is told here, as the hit lands (it may finish the enemy)
      mods(a, v, h, A) {
        const B = BT.B, r = { dmg: 0 };
        if (h && h.clean && A && A.data && cleanOK(a, v, h, A)) { r.dmg += CLEAN; cleanHit(a, v, A); }
        if (a.solDI > B.t) r.dmg += DI_DMG;
        return r;
      },
      // Tyrant Rave's uppercut: who it struck up close (its blow-away Clean Hits them)
      hit(a, v, h, A) {
        if (h.solFirst && close(a, v)) { const D0 = A.data || (A.data = {}); (D0.solNear || (D0.solNear = new Set())).add(v); }
      },
      tick(a, dt, on) {
        const B = BT.B, A = a.act;
        if (!B || !a.alive) return;
        // a move cut short in the air (Volcanic Viper, Bandit Revolver): whatever follows starts back on the ground
        if (A && !A.def.solAir && a.airY > 0) a.airY = Math.max(0, a.airY - dt * 9);
        // Dragon Install: embers and heat round him
        if (on && a.obj.visible && a.solDI > B.t && Math.random() < dt * 16) {
          const an = rnd(0, PI * 2), r = rnd(0.3, 0.8);
          FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.2, 1.6) + (a.airY || 0), z: a.z + Math.sin(an) * r, vy: rnd(0.8, 1.8), drag: 1, life: 0.55, size: 0.11, size1: 0.02, col: U.pick(FLAME), g: -1 });
        }
      },
      // Basic held just after a dodge: the charged Night Raid Vortex (tapped: the usual one)
      resolve(a, btn, hold, c) {
        if (btn === 'basic' && c.dash) return { def: hold ? K.dashC : K.dash, kind: 'dash' };
        return null;
      },
      // AUTO: from a few steps out, now and then the charged Night Raid Vortex
      ai(a, tgt, B) {
        const d = dist(a, tgt) - tgt.rad;
        if (d > 3.2 && d < 7 && Math.random() < 0.18) return { btn: 'basic', hold: true, o: { dash: true } };
        return null;
      },
      hud(a, B) {
        const t = B.t, r = [];
        if (a.ex2Until > t) r.push(a.energy >= K.ex2.cost ? 'SPECIAL: SIDEWINDER IGNITED' : 'SIDEWINDER IGNITED: 20 ENERGY');
        const v = B.focus && B.focus.alive ? B.focus : a.lastTgt;
        if (v && v.alive && close(a, v)) r.push('POINT-BLANK · CLEAN HIT +40%');
        if (a.solDI > t) r.push(`DRAGON INSTALL ${Math.ceil(a.solDI - t)}s · DMG +15%`);
        return r;
      },
    },
    town: {
      // Blazewood (the lead's suggestion, nothing in the research against it): a drifting bounty hunter among bikers; the
      // covered workshop for the man who ends Strive running a junk garage and tinkering at night; the bar in the fuel
      // truck (gin, the Wiki says). Mornings slow by the fuel truck and the workshop; afternoons at the bench, Cheesetopia,
      // the 747; evenings at the bar; late nights at the bar, on the road out of town, under the arch
      home: 'blazewood',
      routine: ['truck:lean 30, shop:bike 30, huddle 40', 'shop:bike 45, cheese:seat 20, 747:browse 10, huddle 25', 'bar:stool 45, cheese:queue 20, huddle 35', 'bar:stool 45, south:look 30, arch:look 25'],
      chatter: ['Tch. What a pain...', 'This town needs better records.'],
      lines: [
        'Sol. Bounty hunter. ...That\'s all you need to know.',
        'Queen. "Sheer Heart Attack", on vinyl. A CD doesn\'t sound right, so I built a player that works on the road.',
        'The kid at the workshop keeps asking me to fix his bike. I keep fixing it. He keeps breaking it.',
      ],
      chapters: [
        { title: 'Junk garage', ask: ['I\'ve got a bench at the workshop. Junk goes in, something that works comes out. Right now it\'s an engine.', 'It needs Nitro-Fuel and I\'m not walking to the 747. Grab one. And tell Dorian his bike\'s done.'],
          steps: [{ t: 'buy', item: 'nitro' }, { t: 'bring', item: 'nitro', to: 'sol' }, { t: 'talk', to: 'dorian', reply: 'He fixed it already? It took me a week to break it like that! ...I said thanks. He just grunted at me.' }, { t: 'talk', to: 'sol' }],
          scene: [['A', 'Hm. It turns over.'], ['P', 'What\'s it going to be?'], ['A', 'A rocket. ...Eventually. An old acquaintance went somewhere far away. Figured I\'d drop in and surprise him.'], ['P', 'Dorian says thanks.'], ['A', 'Tell him to stop riding over everything he sees. ...Or don\'t. Keeps me busy.']] },
        { title: 'Bounty', ask: ['Kasa\'s got a bounty pinned up at Cheesetopia. Something out of the Hollow keeps wrecking bikes on the south road.', 'Bounties are how I eat. Get the details from her, then put me up front. Let\'s go.'],
          steps: [{ t: 'talk', to: 'kasa', reply: 'The bounty? Something big crawls out of the Hollow by the south road every few nights and smashes the bikes. Bring me proof it\'s gone and dinner\'s on the house. For both of you!' }, { t: 'clear', f: { arena: 'outer', enc: 'elite', lead: 'sol' } }, { t: 'talk', to: 'sol' }],
          scene: [['A', 'Done. That\'s one bounty.'], ['P', 'Kasa says dinner\'s on the house.'], ['A', '...Cheesesteak, then. Don\'t look at me like that. I don\'t do extra work for free.'], ['A', 'You called the angles in there before I had to think about them. Saved me effort. I hate effort.']] },
        { title: 'All-out from the start', ask: ['Lighter won\'t stop asking "the bounty hunter in red" for a round. Says the Champion has to know.', 'Not here, he\'d wreck the bar. Win a Proxy Clash with me in your squad. He can watch.'],
          steps: [{ t: 'talk', to: 'lighter', reply: 'A round with the bounty hunter? Ha! Fine, a Proxy Clash first. I\'ll be watching every move he makes, Proxy.' }, { t: 'clash', f: { with: 'sol' } }, { t: 'talk', to: 'sol' }],
          scene: [['A', '"You\'d better go all-out right from the start." That\'s what I told the other side. They didn\'t listen.'], ['P', 'Lighter wants his round now.'], ['A', 'Tch. One round. If the Champion holds back, I\'ll know.'], ['A', '...Not bad, Proxy. Out here nobody asks what I am. I could get used to that.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official Guilty Gear -Strive- render and concept sheet (hex
     values sampled from them): brown spiky hair (#57443a, shade #3b3230, light
     #71604b) swept up in spikes, locks hanging over his face, one between the
     eyes, the rest tied in a long ponytail to his waist; the red headband
     (#a45043) across his forehead, under the bangs; brown eyes (the Wiki), a
     toothy grin; tan skin (#e3b281). A red leather jacket (#a45043, the
     concept's flat #c63e3c, shadow #674b59) with a big stand-up collar, worn
     open, broad shoulders, the sleeves turned up to the elbow on a blue-grey
     lining (#4e6a77 / #8eb9c8), gold buckles on chest straps (#dac178), a
     white round patch on the left upper arm, handcuffs on the right sleeve,
     a black accent on the back; a tight black shirt (#3d3538) with a low V
     and a pendant. A black belt over a wide black belt (#323030 / #464443):
     the silver plate scratched "FREE" (#6a6f79), the big gold buckle, a red
     X; the red cloth hanging beneath; a holster at his right hip. White jeans
     (#efeee5, shade #9e938f), two black straps with gold eyelets and a
     line-art print on the left thigh, the cuffs turned up, a red tab. Red
     shoes (#a45043) on black soles (#2f2c2f). Black fingerless gloves
     (#303243) with red cuffs (the concept sheet).
     THE SWORD (the Junkyard Dog Mk. III, stencilled so on the Strive sword;
     the official profile names his weapon Outrage Mk.II): a long thick slab
     about two thirds of his height, gunmetal grey (#6b6f77) with a pale edge
     (#e8ded2), a maroon inset panel (#492a34), a blue-grey back (#3b5968), an
     angled tip with five vents and a glowing orange slit (#ffa528); a dark
     hilt wrapped in white bandage, a long white cloth ribbon ending in an
     orange flame pattern (#f1a441). Held in his right hand in the render, the
     blade down and back behind his legs (the 'sword' part's rot). 184 cm and
     broad: scale 0.078, long legs, wide shoulders. */
  {
    const HAIR = 0x57443a, HAIR2 = 0x3b3230, HAIRHI = 0x71604b, BAND = 0xa45043, SKIN = 0xe3b281, SKIN2 = 0x906258, EYE = 0x7a5232, LASH = 0x2a2220, TEETH = 0xf4efe6, LIP = 0x9a5e50;
    const RED = 0xa45043, REDHI = 0xc63e3c, RED2 = 0x674b59, LINING = 0x4e6a77, LINING2 = 0x8eb9c8, SHIRT = 0x3d3538, BLACK = 0x2a2829;
    const GOLD = 0xdac178, GOLDHI = 0xf0dc9a, GOLD2 = 0x7b6756, SILVER = 0xb8bec8, SILVER2 = 0x828d98, PLATE = 0x6a6f79, INK = 0x2a2a2e, XRED = 0xc63e3c, WHITE = 0xf2f2ee, GREY = 0x9aa0a8;
    const BELT = 0x323030, BELT2 = 0x464443, DRAPE = 0xa45043, DRAPE2 = 0x674b59, PANTS = 0xefeee5, PANTS2 = 0x9e938f, PANTS3 = 0xdcd8cf;
    const SHOE = 0xa45043, SOLE = 0x2f2c2f, GLOVE = 0x303243, GLOVER = 0xc63e3c;
    const BLADE = 0x6b6f77, EDGE = 0xe8ded2, PANEL = 0x492a34, RIM = 0x3b5968, HILT = 0x303332, HILT2 = 0x252525, WRAP = 0xefeee5, WRAP2 = 0xd8d2c6, VENT = 0x1c1a1c, RIBBON = 0xf1a441, RIBBON2 = 0xe08a2a;
    // an arm: the red leather sleeve on a broad shoulder, turned up at the elbow on its blue-grey lining, a fingerless glove
    const arm = g => {
      H.arm(g, { sleeve: RED, sleeveTo: 5, skin: SKIN, glove: GLOVE, gloveLen: 2, len: 9 });
      g.box(-2, 0, -2, 2, 1, 2, (x, y) => (y === 1 ? RED : RED2));                                  // the jacket's broad shoulder
      g.box(-2, -4, -2, 2, -4, 2, LINING2);                                                          // the sleeve turned up at the elbow...
      g.box(-2, -3, -2, 2, -3, 2, (x, y, z) => (Math.abs(x) === 2 || Math.abs(z) === 2 ? LINING : RED));   // ...its blue-grey lining
      g.box(-1, -6, -1, 1, -6, 1, GLOVER);                                                           // the glove's red cuff
      g.box(-1, -8, 1, 1, -8, 1, SKIN);                                                              // fingerless: the fingers show
    };
    // a leg: the wide white jeans, turned up at the ankle, a red shoe on a black sole
    const leg = s => g => {
      H.leg(g, { len: 10, pant: PANTS, boot: SHOE, bootH: 3, sole: SOLE });
      for (let y = -6; y <= -1; y++) g.set(-s, y, 1, PANTS2);                                       // the shade down the inside of the leg
      g.box(-2, -7, -2, 2, -7, 2, PANTS3);                                                           // the turned-up cuff
      g.box(-1, -8, 1, 1, -8, 1, SOLE);                                                              // the shoe's dark strap
      if (s < 0) g.set(-2, -7, 0, XRED);                                                             // a red tab on the right cuff
      if (s > 0) {   // his left thigh: two black straps with gold eyelets, the line-art print under them
        for (const y of [-2, -4]) { g.box(-1, y, -1, 1, y, 1, BELT2); g.set(-1, y, 1, GOLD); g.set(1, y, 1, GOLD); }
        g.set(0, -5, 1, INK); g.set(-1, -6, 1, INK); g.set(1, -6, 1, INK);
      }
    };
    MODELS.sol = H.humanoid({
      scale: 0.078, height: 29, width: 20, std: { hipY: 12, shoulderX: 6 },     // 184 cm: long legs (10 voxels), broad shoulders
      sockets: { weapon: ['sword', [0, -12, 0]], fist: ['armR', [0, -9, 1]], off: ['armL', [0, -9, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, -1, 1, PANTS);                                                          // the white jeans
        g.box(-3, 0, -2, 3, 0, 1, BELT2);                                                            // the wide black belt...
        g.box(-3, -1, 2, -1, 0, 2, PLATE); g.set(-2, 0, 2, SILVER2); g.set(-3, 0, 2, INK); g.set(-1, -1, 2, INK);   // ...its silver plate, scratched "FREE"
        g.box(0, -1, 2, 1, 0, 2, GOLD); g.set(0, 0, 2, GOLDHI); g.set(2, 0, 2, XRED); g.set(2, -1, 2, BELT2); g.set(3, 0, 2, GOLD2);   // the big gold buckle, the red X, an eyelet
        g.box(-3, -2, -3, 3, 0, -3, RED); g.box(-4, -1, -2, -4, 0, 1, RED2); g.box(4, -1, -2, 4, 0, 1, RED2);   // the jacket's hem round his hips
        g.box(-3, -4, 2, -1, -2, 2, (x, y) => (y === -4 ? DRAPE2 : DRAPE));                           // the red cloth hanging beneath the belt
        g.box(-5, -2, -1, -5, 0, 1, BELT); g.set(-5, 0, 0, GOLD); g.set(-5, -2, 0, GOLD2);            // the holster at his right hip, its gold fittings
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 0, 1, BELT); g.set(-1, 0, 2, GOLD); g.set(0, 0, 2, BELT); g.set(1, 0, 2, BELT);   // the second belt, its gold buckle
        g.box(-3, 1, -2, 3, 2, 1, RED);                                                              // the red leather jacket: the waist...
        g.box(-4, 3, -2, 4, 5, 1, x => (Math.abs(x) === 4 ? RED2 : RED));                            // ...a broad chest...
        g.box(-3, 6, -2, 3, 6, 1, RED);                                                              // ...the shoulders
        g.box(-3, 1, 2, -2, 5, 2, RED); g.box(2, 1, 2, 3, 5, 2, RED);                                // its open fronts...
        g.box(-1, 1, 2, 1, 5, 2, SHIRT);                                                             // ...over the tight black shirt
        g.set(-1, 5, 2, SKIN); g.set(0, 5, 2, SKIN); g.set(1, 5, 2, SKIN); g.set(0, 4, 2, SKIN2);    // its low V at the chest
        g.box(-1, 6, 0, 1, 6, 1, SKIN);                                                              // the neck
        g.set(-1, 4, 2, SILVER2); g.set(1, 4, 2, SILVER2); g.set(0, 3, 2, SILVER);                   // the pendant on its chain
        for (const s of [-1, 1]) { g.set(3 * s, 5, 3, BELT); g.set(3 * s, 4, 3, GOLD); g.set(3 * s, 3, 3, GOLD2); }   // the chest straps' gold buckles
        g.box(-4, 6, -3, -4, 8, 1, RED); g.box(4, 6, -3, 4, 8, 1, RED); g.box(-3, 6, -3, 3, 8, -3, RED2);   // the big stand-up collar round his neck...
        g.set(-4, 8, 2, REDHI); g.set(4, 8, 2, REDHI); g.set(-4, 7, 2, RED); g.set(4, 7, 2, RED);     // ...its points turned out
        g.box(-3, 1, -3, 3, 5, -3, RED); g.box(-1, 2, -3, 1, 4, -3, BLACK); g.set(0, 5, -3, BLACK);  // the back, its single black accent
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LASH, mouth: TEETH });
        g.set(-1, 0, 3, TEETH); g.set(1, 0, 3, TEETH); g.set(-2, 0, 3, LIP); g.set(2, 1, 3, LIP);   // the toothy grin, one corner up
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-2, 4], [0, 2], [2, 4], [4, 2]], sideTo: 2 });   // the bangs, one lock between the eyes
        g.box(-3, 8, -4, 3, 8, 1, HAIR); g.box(-2, 9, -4, 2, 9, -1, HAIR2);                         // the mass of hair swept up and back
        for (const x of [-3, -1, 1, 3]) g.set(x, 5, 4, BAND);                                        // the red headband, showing between the bangs...
        g.box(-4, 5, -3, -4, 5, 2, BAND); g.box(4, 5, -3, 4, 5, 2, BAND);                             // ...and round the sides
        for (const [x, y] of [[-3, 7], [-1, 6], [1, 7], [3, 6]]) g.set(x, y, 5, (x & 2) ? HAIR2 : HAIR);   // the bangs' spikes, sticking out
        g.box(-5, -1, -3, -5, 4, -1, HAIR); g.box(5, -1, -3, 5, 4, -1, HAIR); g.set(-5, -2, -2, HAIR2); g.set(5, -2, -2, HAIR2);   // long locks behind the ears
        g.box(-4, 0, -5, 4, 6, -5, HAIR2);                                                           // the back of his head
        // the spikes, up and back
        for (const [x, y, z] of [[-3, 9, 1], [-1, 9, 2], [1, 9, 2], [3, 9, 0], [-2, 10, 0], [0, 10, 1], [2, 10, -1], [-4, 9, -2], [4, 9, -1], [0, 11, -1], [-1, 11, -2], [1, 12, -2],
          [-3, 10, -3], [3, 10, -3], [5, 7, -1], [-5, 7, -1], [6, 8, -2], [-6, 8, -2], [5, 6, 1], [-5, 6, 1], [0, 10, -4], [2, 9, -5], [-2, 9, -5], [-2, 4, 5], [2, 5, 5]]) g.set(x, y, z, ((x + y + z) & 1) ? HAIR : HAIRHI);
      },
      armL(g) { arm(g); g.box(2, -2, -1, 2, -1, 0, WHITE); g.set(2, -2, 0, GREY); },                  // the white round patch on his left arm
      armR(g) { arm(g); g.set(-2, -1, -1, SILVER); g.set(-2, -2, 0, SILVER2); g.set(-2, -1, 1, SILVER); },   // a handcuff strapped to the sleeve
      legL: leg(1),
      legR: leg(-1),
      extra: {
        tail: {   // the long ponytail, tied at the back of his head, falling to his waist
          parent: 'head', at: [0, 5, -5], draw(g) {
            g.box(-1, -1, -1, 1, 1, 0, HAIR2);
            const path = [[0, 0, -1], [0, -1, -2], [0, -3, -3], [0, -5, -3], [0, -7, -3], [0, -9, -3], [0, -11, -2], [0, -13, -2], [0, -15, -1], [0, -17, -1]];
            path.forEach(([x, y, z], i) => g.ell(x, y, z, 1.9 - i * 0.11, 1.2, 1.5 - i * 0.07, i === 3 || i === 7 ? HAIRHI : i % 2 ? HAIR2 : HAIR));
            g.set(1, -18, -1, HAIR2); g.set(-1, -19, 0, HAIR2); g.set(0, -19, -2, HAIR);              // its spiky ends
          },
        },
        sword: {  // the Junkyard Dog Mk. III in his right hand, the blade along -Y (rot: down and back behind him, as in the render)
          parent: 'armR', at: [0, -8, 0], rot: [1.25, 0, 0], draw(g) {
            g.box(0, -1, 0, 0, 3, 0, HILT); g.box(0, -1, -2, 0, 3, -2, HILT); g.box(0, 4, -2, 0, 4, 0, HILT);   // the hilt: a frame, punched out to grip...
            for (const y of [1, 2, 3]) g.set(0, y, 0, (y & 1) ? WRAP : WRAP2);                         // ...the grip wrapped in white bandage
            g.box(-1, -3, -2, 0, -2, 1, HILT2);                                                        // the housing at the base of the blade
            g.box(-1, -16, -2, 0, -4, 1, (x, y, z) => (z === 1 ? EDGE : z === -2 ? RIM : (y <= -6 && y >= -12 ? PANEL : BLADE)));   // the blade: pale edge, blue-grey back, the maroon panel
            for (const [y, z] of [[-13, -1], [-13, 0], [-14, -1], [-14, 0], [-15, -1]]) { g.set(-1, y, z, VENT); g.set(0, y, z, VENT); }   // the five vents
            g.box(-1, -17, -2, 0, -17, -1, RIM); g.box(-1, -17, 0, 0, -17, 0, G(0xffa528));           // the angled tip, its glowing slit
            for (let i = 0; i < 14; i++) g.set(1, 3 - i, -1 - Math.floor(i / 3), i >= 10 ? ((i & 1) ? RIBBON : RIBBON2) : WRAP);   // the long white ribbon...
            g.set(1, -11, -6, RIBBON2); g.set(1, -9, -6, RIBBON);                                      // ...its flame-cut orange end
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses --
     His stance (the Strive render and concept sheet): hunched low, the left
     hand open and forward like a claw, the sword low in his right behind him.
     The rest from the move descriptions: crude, wide, whole-body blows. */
  ANIM.READY.sol = { armL: [-1.1, -0.3, 0.35], armR: [0, 0.3, -0.35], torso: [0.25, 0.3, 0], head: [-0.2, -0.25, 0], legL: [-0.5, 0, 0.15], legR: [0.4, 0, -0.15], hipsY: -0.1 };
  // wind up, strike at t1, hold to t2, back to the stance by d
  const pose3 = (b, W, S, t, t1, t2, d) => {
    const w = add(b, W), s = add(b, S), a0 = Math.max(0.02, t1 - 0.06), a1 = t1 + 0.04;
    if (t < a0) return mix(b, w, U.easeOut(t / a0));
    if (t < a1) return mix(w, s, (t - a0) / (a1 - a0));
    if (t < t2) return s;
    return mix(s, b, U.ease(clamp((t - t2) / Math.max(0.05, d - t2), 0, 1)));
  };
  // 5K: the knee, then the kick at full stretch
  ACT.solKnee = (b, t, th, d) => (t < 0.19
    ? stage(b, { legR: [0.2, 0, 0], torso: [-0.1, 0.15, 0] }, { legR: [-1.4, 0, 0], torso: [-0.15, 0, 0] }, t, 0.12, 0.19)
    : stage(b, { legR: [-1.3, 0, 0], torso: [-0.15, 0, 0] }, { legR: [-2.0, 0, 0], legL: [0.3, 0, 0], torso: [-0.35, -0.15, 0], armL: [0.4, 0, 0.5], armR: [0.2, 0, -0.3] }, t - 0.19, 0.07, d - 0.19));
  // c.S: the sword up from low behind, close in
  ACT.solCS = (b, t, th, d) => stage(b, { armR: [0.5, 0.3, -0.3], torso: [0.05, 0.5, 0] }, { armR: [-1.9, -0.2, 0.2], torso: [-0.05, -0.4, 0], legL: [-0.2, 0, 0] }, t, th, d);
  // f.S: the lunging gut punch, with the free left hand
  ACT.solGut = (b, t, th, d) => stage(b, { armL: [0.6, 0, 0.1], torso: [0, -0.45, 0] }, { armL: [-0.45, 0.25, -0.3], torso: [0.2, 0.55, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], hipsY: -0.05 }, t, th, d);
  // 6S: a step and a wide swing of the sword across him
  ACT.sol6S = (b, t, th, d) => stage(b, { armR: [-1.1, 0.9, -1.0], torso: [0, 0.85, 0], armL: [0.4, 0, 0.2] }, { armR: [-1.2, -1.1, 0.9], torso: [0.15, -0.8, 0], legL: [-0.55, 0, 0], legR: [0.45, 0, 0], hipsY: -0.05 }, t, th, d);
  // Bandit Revolver: the jumping knee, then the revolving kick
  ACT.solRevolver = (b, t, th, d) => {
    if (t < 0.34) return pose3(b, { torso: [0.2, 0, 0], hipsY: -0.06, legR: [0.3, 0, 0] }, { legR: [-1.8, 0, 0], legL: [0.5, 0, 0], torso: [-0.15, 0, 0], armL: [0.7, 0, 0.5], armR: [0.6, 0, -0.5] }, t, 0.2, 0.32, 0.34);
    const k = clamp((t - 0.34) / 0.16, 0, 1);
    const kick = add(b, { legL: [-1.5, 0, 0.5], legR: [0.2, 0, 0], torso: [-0.3, 0, -0.2], armL: [-0.4, 0, 1.0], armR: [-0.4, 0, -1.0], spin: k < 1 ? U.easeOut(k) * PI * 2 : 0, lift: 0.1 });
    return t < 0.62 ? kick : mix(kick, b, U.ease(clamp((t - 0.62) / Math.max(0.05, d - 0.62), 0, 1)));
  };
  // Night Raid Vortex: a rush low along the ground, then the uppercut
  ACT.solVortex = (b, t, th, d) => (t < th - 0.1
    ? add(b, { torso: [0.6, 0, 0], hipsY: -0.25, legL: [-0.9, 0, 0], legR: [0.8, 0, 0], armR: [0.6, 0, -0.2], armL: [0.5, 0, 0.3] })
    : pose3(b, { torso: [0.5, 0, 0], hipsY: -0.2, armR: [0.6, 0, -0.2] }, { armR: [-2.6, -0.2, 0.2], torso: [-0.3, -0.3, 0], head: [-0.2, 0, 0], legL: [-0.5, 0, 0], lift: 0.15 }, t - (th - 0.1), 0.1, 0.3, d - (th - 0.1)));
  // Fafnir: the lunge, the flaming straight punch with the sword hand
  ACT.solFafnir = (b, t, th, d) => stage(b, { armR: [0.6, -0.4, -0.3], torso: [0.05, 0.6, 0], hipsY: -0.1 }, { armR: [-1.35, -0.3, 0.3], armL: [0.6, 0, 0.3], torso: [0.3, -0.75, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], hipsY: -0.16 }, t, th, d);
  // Gun Flame: the sword raised and driven down into the ground in front of him
  ACT.solGun = (b, t, th, d) => stage(b, { armR: [-2.4, 0, 0], torso: [-0.2, 0.2, 0], lift: 0.05 }, { armR: [-0.9, 0, 0.25], armL: [-0.2, 0, 0.3], torso: [0.45, 0, 0], legL: [-0.6, 0, 0.1], legR: [0.5, 0, -0.1], hipsY: -0.16 }, t, th, d);
  // Volcanic Viper: from a crouch, the sword swept up overhead as he rises, a knee tucked
  ACT.solViper = (b, t, th, d) => pose3(b, { armR: [0.5, 0, -0.2], torso: [0.3, 0.3, 0], hipsY: -0.15 }, { armR: [-2.75, 0, 0.1], armL: [0.3, 0, 0.6], torso: [-0.35, -0.2, 0], head: [-0.3, 0, 0], legL: [-1.3, 0, 0], legR: [0.3, 0, 0] }, t, th, Math.max(th + 0.3, d * 0.62), d);
  // Sidewinder Ignited: the sword brought down before him in both hands, and set off
  ACT.solSide = (b, t, th, d) => pose3(b, { armR: [-2.4, 0, 0], torso: [-0.2, 0, 0], legL: [-0.9, 0, 0], legR: [-0.3, 0, 0] }, { armR: [-1.3, 0, 0.1], armL: [-0.2, 0.3, -0.2], torso: [0.3, 0, 0], legL: [-0.6, 0, 0], legR: [0.2, 0, 0] }, t, th, th + 0.25, d);
  // Bandit Bringer: up, curled, the sword hand raised; then the dive, the blow driven down into the ground
  ACT.solBringer = (b, t, th, d) => (t < th - 0.15
    ? add(b, { legL: [-1.4, 0, 0], legR: [-1.0, 0, 0], armR: [-2.6, 0, -0.2], armL: [-1.0, 0, 0.5], torso: [-0.2, 0, 0], tilt: -0.25 * Math.sin(clamp(t / (th - 0.15), 0, 1) * PI) })
    : pose3(b, { armR: [-2.8, 0, -0.2], legL: [-1.2, 0, 0] }, { armR: [-0.4, 0, 0.1], armL: [0.4, 0, 0.5], torso: [0.6, 0, 0], legL: [-0.7, 0, 0], legR: [0.5, 0, 0], hipsY: -0.2 }, t - (th - 0.15), 0.15, 0.4, d - (th - 0.15)));
  // Tyrant Rave: the uppercut with the free fist; then the sword hand drawn back and the blow that sends them flying
  ACT.solTyrant = (b, t, th, d) => (t < 1.15
    ? pose3(b, { armL: [0.9, 0, 0.1], torso: [0.3, 0.3, 0], hipsY: -0.18 }, { armL: [-1.85, 0, -0.2], torso: [-0.3, -0.4, 0], head: [-0.25, 0, 0], legL: [-0.4, 0, 0], lift: 0.15 }, t, 0.7, 0.95, 1.15)
    : pose3(b, { armR: [0.8, -0.4, -0.4], torso: [0.1, 0.8, 0], hipsY: -0.15, legL: [-0.5, 0, 0], legR: [0.5, 0, 0] }, { armR: [-1.4, -0.3, 0.3], armL: [0.6, 0, 0.4], torso: [0.3, -0.9, 0], legL: [-0.8, 0, 0], legR: [0.7, 0, 0], hipsY: -0.2 }, t - 1.15, 0.4, 0.75, d - 1.15));
  // Wild Throw: the grab, then the heave round to his other side
  ACT.solThrow = (b, t, th, d) => pose3(b, { armL: [-0.4, 0, -0.2], torso: [0.25, 0.4, 0], legL: [-0.5, 0, 0] }, { armL: [-1.9, 0.3, 0.4], armR: [0.4, 0, -0.4], torso: [-0.25, -0.9, 0], legR: [-0.4, 0, 0], legL: [0.3, 0, 0] }, t, th, th + 0.2, d);
  // Faultless Defense: braced, the sword across in front of him, the free hand up
  ACT.solFD = b => add(b, { armR: [-1.2, -0.6, 0.5], armL: [-0.4, 0.5, -0.4], torso: [0.1, 0.3, 0], hipsY: -0.08, legL: [-0.35, 0, 0.1], legR: [0.3, 0, -0.1] });

  /* ------------------------------------------------------------- effects --
     solSlash: a sword arc (fire: burning; vert: a rising arc in the plane he
     faces); solPunch: a fist or knee landing; solFafnir: the flaming straight
     punch; solPillar: one of Gun Flame's pillars; solPlant: the sword driven
     into the ground; solRise: a column of fire (Viper, Vortex); solSide: the
     sword's detonation; solRing: a ring of fire (the revolving kick); solBoom:
     a fire explosion; solCharge: fire gathering in his fist; solBlast: Tyrant
     Rave's torrent of fire; solThrowFx: Wild Throw; solFD: the guard;
     solFlare / flareFx: flames bursting round him (Dragon Install). Streams:
     solTrail (the burning sword), solFist (the burning fist). */
  const E = CHOREO.events, S = CHOREO.streams, _v = new THREE.Vector3();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const shake = s => { BT.B.cam.shake = Math.max(BT.B.cam.shake, s); };
  const tipOf = a => { BT.sock(a, 'weapon', _v); if (_v.y < 0.2) _v.y = 0.3; return _v; };
  FX.extra.solNone = () => {};
  E.solSlash = (a, A, e) => {
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), y = (e.y || 1.0) + (a.airY || 0), r = e.r || 2.2;
    const yaw = e.vert ? dir + PI / 2 : dir, opt = { tilt: e.vert ? -PI / 2 : e.tilt || 0, arc: e.arc || 2.6, life: 0.26, sweep: e.sweep || 1.0 };
    const x0 = a.x + fx * (e.vert ? 0.6 : 0.3), z0 = a.z + fz * (e.vert ? 0.6 : 0.3);
    FX.slash(x0, y, z0, r, yaw, e.fire ? 0xf87838 : STEEL, Object.assign({ width: e.fire ? (e.big ? 0.6 : 0.45) : 0.32 }, opt));
    FX.slash(x0, y + 0.03, z0, r * 0.93, yaw, e.fire ? 0xf8f888 : 0xffffff, Object.assign({}, opt, { width: 0.1, life: 0.2 }));
    if (!e.fire) { SFX.play('swing'); return; }
    for (let i = 0; i < (e.big ? 26 : 14); i++) {
      const an = rnd(-opt.arc / 2, opt.arc / 2), rr = r * rnd(0.85, 1.05);
      const px = e.vert ? x0 + fx * Math.sin(an) * rr : a.x + Math.sin(dir + an) * rr, py = e.vert ? y + Math.cos(an) * rr : y + rnd(-0.3, 0.3), pz = e.vert ? z0 + fz * Math.sin(an) * rr : a.z + Math.cos(dir + an) * rr;
      FX.p({ x: px, y: Math.max(0.1, py), z: pz, vy: rnd(0.4, 1.4), drag: 1.5, life: rnd(0.25, 0.5), size: 0.15, size1: 0.03, col: U.pick(FLAME), g: -1 });
    }
    if (e.big) shake(0.16);
    SFX.play('fire');
  };
  E.solPunch = (a, A, e) => {
    BT.sock(a, e.hand || 'off', _v);
    const x = _v.x + Math.sin(A.dir) * 0.4, z = _v.z + Math.cos(A.dir) * 0.4, f = !!e.fire;
    FX.burst(x, _v.y, z, f ? 18 : 10, { col: f ? FLAME : [0xffffff, 0xfff2c0, 0xf4d35e], speed: 4, size: 0.1, life: 0.28, g: f ? -1 : 2 });
    FX.glow(x, _v.y, z, f ? 1.4 : 0.9, f ? 0xf88848 : 0xfff0c0, 0.12, { size1: f ? 2.2 : 1.4 });
  };
  E.solFafnir = (a, A, e) => {
    BT.sock(a, 'fist', _v);
    const dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir), p0 = _v.clone(), L = e.len || 2.6, p1 = V(p0.x + fx * L, p0.y, p0.z + fz * L);
    FX.beam(p0, p1, 0xf87838, 0.5, 0.22); FX.beam(p0.clone(), p1.clone(), 0xf8f888, 0.2, 0.16);
    for (let i = 0; i < 30; i++) {
      const k = Math.random(), an = dir + rnd(-0.25, 0.25), sp = rnd(5, 10);
      FX.p({ x: lerp(p0.x, p1.x, k), y: p0.y + rnd(-0.2, 0.2), z: lerp(p0.z, p1.z, k), vx: Math.sin(an) * sp, vy: rnd(0, 1.5), vz: Math.cos(an) * sp, drag: 3, life: rnd(0.2, 0.4), size: 0.2, size1: 0.05, col: U.pick(FLAME), g: -1 });
    }
    FX.glow(p1.x, p1.y, p1.z, 1.8, 0xf88848, 0.22, { size1: 3 }); FX.ring(p1.x, p1.z, 0.3, 2.0, 0xf8a838, 0.3, { y: 0.1 });
    shake(0.22); SFX.play('fire');
  };
  // one of Gun Flame's pillars, d metres ahead of him
  E.solPillar = (a, A, e) => {
    const d = e.d || 2, x = a.x + Math.sin(A.dir) * d, z = a.z + Math.cos(A.dir) * d, h = e.h || 2.2;
    FX.pillar(x, z, 0.5, h, 0xf87838, 0.45); FX.pillar(x, z, 0.24, h * 1.15, 0xf8f888, 0.32);
    FX.burst(x, 0.3, z, 14, { col: FLAME, speed: 3, size: 0.18, size1: 0.04, life: 0.5, g: -6, up: 4 });
    FX.ring(x, z, 0.2, 1.0, 0xf8a838, 0.3, { y: 0.06 });
    if (e.first) SFX.play('fire');
  };
  E.solPlant = a => {
    const p = tipOf(a);
    FX.named('quake', { x: p.x, z: p.z, r: 1.4 });
    FX.burst(p.x, 0.2, p.z, 12, { col: [0xffffff, 0xf8d848, 0xf87838], speed: 4, size: 0.1, life: 0.3, g: 4 });
    shake(0.12); SFX.play('heavy');
  };
  E.solRise = (a, A, e) => {
    const d = e.d != null ? e.d : 0.8, x = a.x + Math.sin(A.dir) * d, z = a.z + Math.cos(A.dir) * d, r = e.big ? 0.9 : 0.6, h = e.big ? 4.2 : 2.8;
    FX.pillar(x, z, r, h, 0xf87838, 0.4); FX.pillar(x, z, r * 0.5, h * 1.1, 0xf8f888, 0.3);
    FX.burst(x, 0.6, z, e.big ? 36 : 18, { col: FLAME, speed: 4, size: 0.15, size1: 0.03, life: 0.5, g: -6, up: 4 });
    SFX.play('fire');
  };
  E.solSpark = a => { const p = tipOf(a); FX.glow(p.x, p.y, p.z, 1.4, 0xffa528, 0.2, { size1: 2.2 }); FX.burst(p.x, p.y, p.z, 10, { col: FLAME, speed: 3, size: 0.09, life: 0.3, g: -1 }); };
  // Sidewinder Ignited: the sword set off before him
  E.solSide = (a, A, e) => {
    const fx = Math.sin(A.dir), fz = Math.cos(A.dir), x = a.x + fx * 1.4, z = a.z + fz * 1.4, y = 0.9 + (a.airY || 0) * 0.6, r = e.r || 2.6;
    FX.glow(x, y, z, r * 1.2, 0xf88848, 0.3, { size1: r * 2.2 }); FX.glow(x, y, z, r * 0.6, 0xffffff, 0.15, { size1: r });
    FX.burst(x, y, z, 50, { col: FLAME.concat([FL_DARK]), speed: 9, size: 0.2, size1: 0.04, life: 0.6, g: 2, up: 1 });
    FX.named('explode', { x, z, r, attr: 'fire' }); FX.ring(x, z, 0.4, r, 0xf8a838, 0.4, { y: 0.08 });
    shake(0.38); SFX.play('boom');
  };
  E.solRing = (a, A, e) => {
    const r = e.r || 2.4, y = 0.7 + (a.airY || 0);
    FX.ring(a.x, a.z, 0.4, r, 0xf87838, 0.35, { y }); FX.ring(a.x, a.z, 0.3, r * 0.7, 0xf8f888, 0.3, { y });
    for (let i = 0; i < 18; i++) { const an = rnd(0, PI * 2); FX.p({ x: a.x + Math.cos(an) * r * 0.9, y, z: a.z + Math.sin(an) * r * 0.9, vy: rnd(0.4, 1.4), life: rnd(0.25, 0.45), size: 0.14, size1: 0.03, col: U.pick(FLAME), g: -1 }); }
    SFX.play('fire');
  };
  E.solBoom = (a, A, e, tgt) => {
    const d = e.d || 1.6, x = tgt && !e.self ? tgt.x : a.x + Math.sin(A.dir) * d, z = tgt && !e.self ? tgt.z : a.z + Math.cos(A.dir) * d, r = e.r || 2.6;
    FX.named('explode', { x, z, r, attr: 'fire' });
    FX.ring(x, z, 0.4, r, 0xf8a838, 0.45); FX.ring(x, z, 0.3, r * 0.6, 0xf8f888, 0.35); FX.ring(x, z, 0.2, r * 1.15, 0xf84818, 0.5, { y: 0.06, a: 0.5 });
    FX.glow(x, 1, z, r * 1.1, 0xf87838, 0.35, { size1: r * 1.8 });
    for (let i = 0; i < (e.big ? 40 : 18); i++) { const an = rnd(0, PI * 2), rr = rnd(0.3, r); FX.p({ x: x + Math.cos(an) * rr, y: rnd(1.5, 3.5), z: z + Math.sin(an) * rr, vy: rnd(-2, 1), life: rnd(0.5, 0.9), size: 0.08, size1: 0.02, col: U.pick(FLAME), g: 4 }); }   // embers falling
    shake(e.big ? 0.42 : 0.24); SFX.play('boom');
  };
  E.solCharge = a => {
    BT.sock(a, 'fist', _v);
    for (let i = 0; i < 24; i++) { const an = rnd(0, PI * 2), r = rnd(0.8, 1.6), py = _v.y + rnd(-0.6, 0.6); FX.p({ x: _v.x + Math.cos(an) * r, y: py, z: _v.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 3, vy: (_v.y - py) * 3, vz: -Math.sin(an) * r * 3, life: 0.3, size: 0.12, size1: 0.2, col: U.pick(FLAME) }); }
    FX.glow(_v.x, _v.y, _v.z, 1.6, 0xf88848, 0.35, { size1: 2.4 });
    SFX.play('fire');
  };
  // Tyrant Rave's blow-away: a torrent of fire out of his fist, the explosion where it lands
  E.solBlast = (a, A, e, tgt) => {
    BT.sock(a, 'fist', _v);
    const dir = A.dir, L = e.len || 5, p0 = _v.clone();
    for (let i = 0; i < 110; i++) { const an = dir + rnd(-0.32, 0.32), sp = rnd(8, 15); FX.p({ x: p0.x, y: p0.y, z: p0.z, vx: Math.sin(an) * sp, vy: rnd(-0.6, 1.6), vz: Math.cos(an) * sp, drag: 1.6, life: L / sp * rnd(0.9, 1.2), size: 0.2, size1: 0.8, col: U.pick(FLAME), g: -1.5 }); }
    FX.beam(p0, V(p0.x + Math.sin(dir) * L, p0.y, p0.z + Math.cos(dir) * L), 0xf87838, 0.7, 0.3);
    FX.glow(p0.x, p0.y, p0.z, 2.4, 0xf8f888, 0.2, { size1: 3.6 });
    E.solBoom(a, A, { r: 4.0, big: true, d: 3 }, tgt);
  };
  // Wild Throw: whoever he grabbed lands on his other side (a boss is too big to throw)
  E.solThrowFx = (a, A, e, tgt) => {
    if (!tgt || !tgt.alive) return;
    FX.burst(tgt.x, 1.0, tgt.z, 12, { col: FLAME, speed: 4, size: 0.12, life: 0.35, g: 1 });
    if (tgt.rank !== 'boss') { const g = (tgt.rad || 0.5) + 1.0; tgt.x = a.x - Math.sin(A.dir) * g; tgt.z = a.z - Math.cos(A.dir) * g; }
    FX.named('quake', { x: tgt.x, z: tgt.z, r: 1.6 });
    FX.burst(tgt.x, 0.4, tgt.z, 16, { col: FLAME, speed: 5, size: 0.12, life: 0.4, g: 2, up: 2 });
    shake(0.22); SFX.play('heavy');
  };
  E.solFD = (a, A) => {
    BT.sock(a, 'chest', _v);
    const x = _v.x + Math.sin(A.dir) * 0.6, z = _v.z + Math.cos(A.dir) * 0.6;
    FX.glow(x, _v.y, z, 1.8, 0xfff4d0, 0.2, { size1: 2.6 }); FX.ring(a.x, a.z, 0.3, 1.8, 0xfff0c0, 0.3, { y: 1.0 });
    FX.burst(x, _v.y, z, 14, { col: [0xffffff, 0xfff0c0, 0xf8d848], speed: 5, size: 0.08, life: 0.3, g: 2 });
  };
  function flareFx(a) {
    if (!a.obj || !a.obj.visible) return;
    FX.glow(a.x, 1.1, a.z, 2.6, 0xf84818, 0.35, { size1: 3.8 }); FX.ring(a.x, a.z, 0.4, 2.6, 0xf87838, 0.45, { y: 0.06 });
    FX.burst(a.x, 1.0, a.z, 36, { col: FLAME.concat([FL_DARK]), speed: 5, size: 0.14, size1: 0.03, life: 0.6, g: -3, up: 2 });
  }
  E.solFlare = a => { flareFx(a); SFX.play('fire'); };
  S.solTrail = a => {
    const p = tipOf(a);
    for (let i = 0; i < 2; i++) FX.p({ x: p.x + rnd(-0.15, 0.15), y: p.y + rnd(-0.15, 0.15), z: p.z + rnd(-0.15, 0.15), vy: rnd(0.3, 1.0), life: 0.35, size: 0.13, size1: 0.03, col: U.pick(FLAME), g: -0.5 });
  };
  S.solFist = a => {
    BT.sock(a, 'fist', _v);
    for (let i = 0; i < 2; i++) FX.p({ x: _v.x + rnd(-0.12, 0.12), y: _v.y + rnd(-0.12, 0.12), z: _v.z + rnd(-0.12, 0.12), vy: rnd(0.4, 1.2), life: 0.3, size: 0.14, size1: 0.04, col: U.pick(FLAME), g: -1 });
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, x) => { Object.assign(def, x); if (x.motion) delete def.move; if (def.events) def.events.sort((p, q) => p.t - q.t); };
  const sl = (t, x) => Object.assign({ t, fx: 'solSlash' }, x || {});
  const kickArc = (t, y, tilt, r) => ({ t, fx: 'crescent', y, tilt, r, arc: 1.4, col: 0xfff0c0 });
  // Bandit Revolver, the string
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.12, kind: 'fwd', d: 0.3 }], events: [kickArc(0.12, 0.6, 0.6, 1.3), kickArc(0.26, 1.0, 0.8, 1.7)] });
  set(K.basic[1], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.35 }], events: [sl(0.16, { tilt: -1.1, sweep: 1.3, r: 2.0 })] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.2, kind: 'fwd', d: 0.9 }], stream: [{ t0: 0.02, t1: 0.2, kind: 'dust' }], events: [{ t: 0.2, fx: 'solPunch' }] });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.26, kind: 'fwd', d: 0.55 }], stream: [{ t0: 0.08, t1: 0.3, kind: 'solTrail' }], events: [sl(0.26, { fire: true, big: true, r: 3.0, arc: 3.0, tilt: 0.15, sweep: -1.4 })] });
  set(K.basic[4], { motion: [{ t0: 0.02, t1: 0.36, kind: 'leap', h: 0.9, d: 0.9 }], stream: [{ t0: 0.02, t1: 0.2, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.2, fx: 'solPunch', hand: 'chest', fire: true }, { t: 0.48, fx: 'crescent', y: 0.9, tilt: 0.2, r: 2.3, arc: 6.0, col: 0xf87838 }, { t: 0.48, fx: 'solRing', r: 2.3 }] });
  // Night Raid Vortex, tapped and charged
  set(K.dash, { motion: [{ t0: 0, t1: 0.26, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.26, kind: 'dust' }, { t0: 0, t1: 0.26, kind: 'afterimage', col: AFTER }], events: [kickArc(0.3, 0.8, 0.9, 1.8)] });
  set(K.dashC, { motion: [{ t0: 0.12, t1: 0.5, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0.12, t1: 0.5, kind: 'fireTrail' }, { t0: 0.12, t1: 0.5, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.05, fx: 'solSpark' }, { t: 0.56, fx: 'solRise', d: 1.0 }, sl(0.56, { fire: true, vert: true, r: 2.0, y: 0.9 })] });
  // Fafnir
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 0.9, side: 'auto' }, { t0: 0.1, t1: 0.22, kind: 'toTarget', gap: 0.9 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }, { t0: 0.08, t1: 0.24, kind: 'solFist' }], events: [{ t: 0.22, fx: 'solFafnir' }] });
  // Gun Flame: the sword into the ground, the pillars crawling out along it
  set(K.special, { events: [{ t: 0.3, fx: 'solPlant' }].concat([1.2, 2.4, 3.6, 4.8, 6.0].map((d, i) => ({ t: 0.34 + i * 0.06, fx: 'solPillar', d, h: 1.8 + i * 0.2, first: i === 0 }))) });
  // Volcanic Viper: up through his own fire, three burning arcs
  set(K.ex, { motion: [{ t0: 0.04, t1: 0.3, kind: 'fwd', d: 0.8 }, { t0: 0.1, t1: 0.46, kind: 'rise', h: 1.9 }, { t0: 0.66, t1: 0.96, kind: 'fall' }], stream: [{ t0: 0.1, t1: 0.6, kind: 'solTrail' }, { t0: 0.1, t1: 0.46, kind: 'fireTrail' }],
    events: [{ t: 0.12, fx: 'solRise', big: true, d: 0.5 }, sl(0.2, { fire: true, vert: true, r: 2.0 }), sl(0.32, { fire: true, vert: true, r: 2.3, y: 0.8 }), sl(0.44, { fire: true, vert: true, big: true, r: 2.6, y: 0.6 })] });
  // Sidewinder Ignited: where he is (in the air after the Viper), the sword goes off; then down
  set(K.ex2, { motion: [{ t0: 0.32, t1: 0.7, kind: 'fall' }], stream: [{ t0: 0, t1: 0.3, kind: 'solTrail' }], events: [{ t: 0.22, fx: 'solSpark' }, { t: 0.3, fx: 'solSide', r: 2.6 }, { t: 0.3, fx: 'whiteFlash' }] });
  // Bandit Bringer: in, up, the dive, the ground going up in flames
  set(K.chain, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 2.0 }, { t0: 0.2, t1: 0.6, kind: 'rise', h: 2.4 }, { t0: 0.66, t1: 0.84, kind: 'toTarget', gap: 0.9 }, { t0: 0.66, t1: 0.84, kind: 'fall' }],
    stream: [{ t0: 0.2, t1: 0.84, kind: 'solTrail' }, { t0: 0.66, t1: 0.84, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0.84, fx: 'solBoom', r: 2.8 }, { t: 0.84, fx: 'dust' }, { t: 1.0, fx: 'solRise', d: 1.0, big: true }, { t: 1.0, fx: 'solBoom', r: 3.4, big: true }, { t: 1.0, fx: 'whiteFlash' }] });
  // Tyrant Rave: in close, flames round him, the uppercut; the fist charged, the torrent
  set(K.ult, { motion: [{ t0: 0, t1: 0.35, kind: 'toTarget', gap: 1.0 }, { t0: 1.4, t1: 1.55, kind: 'fwd', d: 0.6 }], stream: [{ t0: 0, t1: 0.6, kind: 'flameRing', r: 2.6 }, { t0: 1.1, t1: 1.55, kind: 'solFist' }],
    events: [{ t: 0.05, fx: 'solFlare' }, { t: 0.7, fx: 'solRise', big: true, d: 0.9 }, { t: 0.7, fx: 'solPunch', fire: true }, { t: 1.2, fx: 'solCharge' }, { t: 1.55, fx: 'solBlast', len: 5.5 }, { t: 1.55, fx: 'whiteFlash' }] });
  set(K.assist, { events: [{ t: 0.04, fx: 'solFD' }] });
  // Volcanic Viper (S), after the guard
  set(K.followup, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 1.0 }, { t0: 0.18, t1: 0.45, kind: 'rise', h: 1.5 }, { t0: 0.65, t1: 0.92, kind: 'fall' }],
    stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: AFTER }, { t0: 0.18, t1: 0.55, kind: 'solTrail' }],
    events: [{ t: 0.2, fx: 'solRise', d: 0.6 }, sl(0.24, { fire: true, vert: true, r: 2.0 }), sl(0.5, { fire: true, vert: true, big: true, r: 2.4, y: 0.7 })] });
  // Wild Throw
  set(K.quick, { motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 0.8 }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFTER }], events: [{ t: 0.32, fx: 'solThrowFx' }] });
})();
