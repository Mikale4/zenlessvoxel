/* ============================================================================
   data.js -- everything the battle system reads: the combat rules, attributes
   and anomalies, the Agents and their kits, the enemies and their attack
   patterns, the encounters on each battleground, and the Battle Lab knobs.

   Skill names, kit mechanics, enemy names and weaknesses follow the official
   game (Zenless Zone Zero Wiki / Prydwen). Multipliers and timings are this
   game's own, tuned for a commander-style battle, and are meant to be tweaked.

   SKILL SCHEMA (Agents)
     name   display name ("Basic Attack: Rampaging Slash")
     anim   animation key (see anim.js)
     dur    seconds the action lasts; cancel: when the next action may start
     reach  distance the Agent closes to before starting; range: preferred spacing
     move   [t0, t1, dist]  a lunge during the action (negative = back step)
     inv    [t0, t1]        invulnerable window
     dr     damage reduction while acting (Anti-Interrupt moves)
     cost / cd               Energy (Adrenaline for Yixuan) cost, cooldown
     hits   [{ t, mult (% ATK), daze (% Impact), bu (anomaly buildup), heavy,
               attr (override), shape: 'arc' | 'cone' | 'circle' | 'proj' | 'line',
               r, arc (deg), at: 'self' | 'target' | 'front', kb, fx }]
   ENEMY ATTACK SCHEMA
     { name, anim, reach, cd, w (pick weight), move, rec,
       hits: [{ t, mult, heavy, launch, flash: null|'gold'|'red', shape, r, arc, n, speed }] }
     A flashed hit flashes `flashLead` seconds (Battle Lab) before it lands.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------- RULES --
     The official game's combat rules this battle system follows. */
  const RULES = {
    assistPointsStart: 6,     // the squad enters combat with 6 Assist Points
    assistPointsMax: 6,
    assistGain: 1,            // each Chain Attack or Ultimate gives back 1
    assistCostLight: 1, assistCostHeavy: 2, // a Perfect Assist costs more against a heavy blow
    chains: { minion: 1, elite: 2, boss: 3 }, // Chain Attacks per Stun (never more than the squad's size)
    stunMult: 1.5,            // Stunned enemies take +50% DMG (bosses ramp per Chain)
    decibelMax: 3000,         // each Agent's own Decibels; Ultimate costs 3000
    decibelRatings: [[1000, 'UPROAR'], [2000, 'BLASTING'], [3000, 'MAXIMUM']],
    decibelShare: 0.3,        // a share of every Decibel gain goes to the rest of the squad
    dodgeCharges: 2,          // dodges before the brief dodge cooldown
  };

  const ATTR = {
    physical: { name: 'Physical', color: '#f4d35e', hex: 0xf4d35e, anomaly: 'assault' },
    fire: { name: 'Fire', color: '#ff6a2a', hex: 0xff6a2a, anomaly: 'burn' },
    ether: { name: 'Ether', color: '#e45cff', hex: 0xe45cff, anomaly: 'corruption' },
    auric: { name: 'Auric Ink', color: '#ffcf4a', hex: 0xffcf4a, anomaly: 'auric' },
    ice: { name: 'Ice', color: '#8fe4ff', hex: 0x8fe4ff, anomaly: 'freeze' },
    electric: { name: 'Electric', color: '#5ec8ff', hex: 0x5ec8ff, anomaly: 'shock' },
    // Remielle's: Lumiflux takes on the attribute of the next Agent in the squad (Attribute Flux), and its
    // own buildup is not an anomaly but a charge a teammate's Anomaly sets off (Refringe)
    lumiflux: { name: 'Lumiflux', color: '#ff9ae6', hex: 0xff9ae6, anomaly: null },
  };

  /* Attribute Anomalies. Assault interrupts with one heavy blow and leaves the
     enemy Flinched (takes more Daze). Burn ticks Fire DMG. Corruption makes
     every hit the enemy takes deal extra Ether DMG. Burn/Corruption interrupt
     enemies weak to that attribute. Applying a different anomaly over an
     active one overrides it with DISORDER: damage from the old one's
     remaining time, plus Daze. */
  const ANOMALY = {
    assault: { name: 'Assault', attr: 'physical', color: '#f4d35e', dur: 7.5, burst: 713, flinch: 7.5, flinchDaze: 0.1, disorderBase: 450, disorderPerSec: 7.5 },
    burn: { name: 'Burn', attr: 'fire', color: '#ff6a2a', dur: 10, tick: 0.5, tickMult: 50, disorderBase: 450, disorderPerSec: 100 },
    corruption: { name: 'Corruption', attr: 'ether', color: '#e45cff', dur: 10, onHit: 62.5, onHitCd: 0.5, disorderBase: 450, disorderPerSec: 125 },
    auric: { name: 'Auric Ink Corruption', attr: 'auric', color: '#ffcf4a', dur: 10, onHit: 62.5, onHitCd: 0.5, disorderBase: 450, disorderPerSec: 125 },
    freeze: { name: 'Freeze', attr: 'ice', color: '#8fe4ff', dur: 3, burst: 500, disorderBase: 450, disorderPerSec: 75 },
    shock: { name: 'Shock', attr: 'electric', color: '#5ec8ff', dur: 10, onHit: 125, onHitCd: 1, disorderBase: 450, disorderPerSec: 125 },
  };

  const SPEC = {
    Attack: 'Deals damage. Fights up close and finishes enemies.',
    Stun: 'Builds Daze fast to Stun enemies for Chain Attacks.',
    Anomaly: 'Builds Attribute Anomalies; anomaly damage scales with Anomaly Proficiency.',
    Support: 'Buffs and heals the squad.',
    Defense: 'Shields the squad, blocks and parries, and leads Defensive Assists.',
    Rupture: 'Sheer DMG: ignores DEF and grows with Max HP. Runs on Adrenaline instead of Energy.',
  };

  /* ------------------------------------------------------------- AGENTS -- */
  const AGENTS = {
    caesar: {
      id: 'caesar', name: 'Caesar King', short: 'Caesar', faction: 'Sons of Calydon', spec: 'Defense', attr: 'physical', rank: 'S',
      color: '#c8302a', color2: '#b3c2ae', assist: 'defensive', stance: 'shield',
      blurb: 'Leader of the Sons of Calydon. A spiked tyre shield and a long blade: she blocks, retaliates, and wraps the whole squad in Radiant Aegis.',
      stats: { hp: 9900, atk: 2200, def: 980, impact: 140, ap: 90, am: 90, cr: 0.2, cd: 0.8, er: 1.25, speed: 4.6 },
      ai: { range: 1.4, dodge: 0.62, reflex: 0.6, aggr: 0.9, guard: 0.7 },
      energyMax: 120, resource: 'aegis',
      core: [
        ['Core Passive: Barrier of Resilience', 'EX Special Attack: Parry Counter, Chain Attack, Ultimate, or Overpowered Shield Bash through Retaliation give the squad a Radiant Aegis shield (shared, worn by whoever is on-field, 90 s). The bearer gains Anti-Interrupt and +ATK; the ATK stays 5 s after the shield breaks.'],
        ['Additional Ability: Battle Spirit', 'With another Defensive Assist Agent or a Sons of Calydon member in the squad: Perfect Block, Retaliation, Defensive Assist and Dead End make enemies within 7 m take +25% DMG from the squad for 30 s.'],
        ['Stance Switch', 'Perfect Block, Retaliation and Defensive Assist raise Caesar\'s Impact by 20% for 3 s.'],
        ['Perfect Block and Retaliation', 'Shockwave Shield Bash and Parry Counter Perfect Block a hit that lands at the start of the skill (no damage). Afterwards she holds a guard stance (-40% DMG); blocking a hit there lets her Retaliate with Roaring Thrust or Overpowered Shield Bash.'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: Rampaging Slash', anim: 'slashR', dur: 0.42, cancel: 0.3, reach: 1.5, move: [0, 0.16, 0.45], hits: [{ t: 0.16, mult: 48, daze: 46, bu: 18 }] },
          { name: 'Basic Attack: Rampaging Slash', anim: 'slashL', dur: 0.42, cancel: 0.3, reach: 1.5, move: [0, 0.16, 0.45], hits: [{ t: 0.17, mult: 52, daze: 48, bu: 20 }] },
          { name: 'Basic Attack: Rampaging Slash', anim: 'bash', dur: 0.55, cancel: 0.4, reach: 1.5, move: [0.05, 0.22, 0.6], hits: [{ t: 0.22, mult: 70, daze: 72, bu: 26, kb: 0.5 }] },
          { name: 'Basic Attack: Rampaging Slash', anim: 'slashR', dur: 0.45, cancel: 0.32, reach: 1.5, move: [0, 0.16, 0.45], hits: [{ t: 0.17, mult: 62, daze: 58, bu: 22 }] },
          { name: 'Basic Attack: Rampaging Slash', anim: 'thrust', dur: 0.55, cancel: 0.42, reach: 1.6, move: [0, 0.22, 0.8], hits: [{ t: 0.22, mult: 84, daze: 80, bu: 30 }] },
          { name: 'Basic Attack: Rampaging Slash', anim: 'slamDown', dur: 0.85, cancel: 0.7, reach: 1.6, move: [0.1, 0.38, 0.6], hits: [{ t: 0.4, mult: 165, daze: 145, bu: 60, heavy: true, kb: 1.2, shape: 'circle', at: 'front', r: 2.0, fx: 'quake' }] },
        ],
        deadEnd: { name: 'Basic Attack: Dead End', anim: 'toss', dur: 1.0, cancel: 0.85, inv: [0, 1.0], assistCost: 1, hits: [{ t: 0.35, mult: 140, daze: 145, bu: 60, shape: 'circle', at: 'self', r: 3.6, fx: 'shieldSpin' }, { t: 0.65, mult: 180, daze: 205, bu: 70, heavy: true, shape: 'circle', at: 'self', r: 3.6, kb: 1, fx: 'shieldSpin' }] },
        dash: { name: 'Dash Attack: Hog Rush', anim: 'bash', dur: 0.6, cancel: 0.45, reach: 6, dr: 0.4, move: [0, 0.28, 4.2], hits: [{ t: 0.26, mult: 85, daze: 85, bu: 30 }] },
        counter: { name: 'Dodge Counter: Eye For an Eye', anim: 'thrust', dur: 0.6, cancel: 0.45, inv: [0, 0.5], move: [0, 0.16, 1.6], hits: [{ t: 0.16, mult: 170, daze: 145, bu: 55, heavy: true, kb: 0.9 }] },
        special: { name: 'Special Attack: Shockwave Shield Bash', anim: 'bash', dur: 0.7, cancel: 0.55, reach: 1.9, cd: 3.5, perfectBlock: 0.22, guardAfter: 1.4, move: [0, 0.25, 0.7], hits: [{ t: 0.25, mult: 120, daze: 145, bu: 45, heavy: true, shape: 'cone', r: 3, arc: 80, kb: 0.8, fx: 'shock' }] },
        thrust: { name: 'Special Attack: Roaring Thrust', anim: 'thrust', dur: 0.62, cancel: 0.5, inv: [0, 0.55], move: [0, 0.2, 1.2], hits: [{ t: 0.2, mult: 210, daze: 235, bu: 70, heavy: true, kb: 1.2 }] },
        ex: { name: 'EX Special Attack: Parry Counter', anim: 'exCaesar', dur: 1.1, cancel: 0.95, cost: 40, reach: 2.0, inv: [0, 0.95], perfectBlock: 0.25, guardAfter: 1.4, aegis: true, move: [0, 0.75, 1.6], hits: [{ t: 0.3, mult: 180, daze: 205, bu: 70, kb: 0.4, fx: 'shock' }, { t: 0.72, mult: 290, daze: 265, bu: 90, heavy: true, kb: 1.8 }] },
        osb: { name: 'EX Special Attack: Overpowered Shield Bash', anim: 'bash', dur: 0.8, cancel: 0.62, cost: 40, inv: [0, 0.65], move: [0, 0.22, 1.2], hits: [{ t: 0.22, mult: 360, daze: 380, bu: 100, heavy: true, kb: 1.6, shape: 'cone', r: 3.2, arc: 90, fx: 'shock' }] },
        chain: { name: 'Chain Attack: Road Rage Slam', anim: 'slamDown', dur: 1.25, inv: [0, 1.25], aegis: true, hits: [{ t: 0.55, mult: 560, daze: 265, bu: 150, heavy: true, shape: 'circle', at: 'target', r: 3, kb: 1.4, fx: 'quake' }] },
        ult: { name: 'Ultimate: Savage Smash', anim: 'ultSmash', dur: 2.0, inv: [0, 2.0], aegis: true, hits: [{ t: 0.7, mult: 640, daze: 325, bu: 160, shape: 'circle', at: 'target', r: 3.5, kb: 0.6, fx: 'shieldSpin' }, { t: 1.35, mult: 1700, daze: 675, bu: 300, heavy: true, shape: 'circle', at: 'target', r: 4.5, kb: 2, fx: 'quake' }] },
        assist: { name: 'Defensive Assist: Aegis Shield', type: 'defensive', anim: 'guard', dur: 0.45, inv: [0, 0.45], daze: 520 },
        followup: { name: 'Assist Follow-Up: Aiding Blade', anim: 'toss', dur: 1.0, inv: [0, 0.95], move: [0, 0.3, 1.2], hits: [{ t: 0.3, mult: 200, daze: 145, bu: 60, shape: 'cone', r: 3.2, arc: 90, fx: 'shieldSpin' }, { t: 0.7, mult: 260, daze: 205, bu: 80, heavy: true, kb: 1.2 }] },
        quick: { name: 'Quick Assist: Lane Change', anim: 'slashR', dur: 0.65, inv: [0, 0.6], move: [0, 0.25, 2.6], hits: [{ t: 0.25, mult: 210, daze: 175, bu: 60, kb: 0.8, shape: 'arc', r: 2.4, arc: 140 }] },
      },
    },

    burnice: {
      id: 'burnice', name: 'Burnice White', short: 'Burnice', faction: 'Sons of Calydon', spec: 'Anomaly', attr: 'fire', rank: 'S',
      color: '#e8452e', color2: '#eee0b8', assist: 'defensive', stance: 'guns',
      blurb: 'The Sons of Calydon\'s bartender, mixing Nitro-Fuel in twin flamethrowers. Her Scorched mark makes every teammate\'s hit set off Afterburn.',
      stats: { hp: 8100, atk: 2700, def: 610, impact: 86, ap: 300, am: 150, cr: 0.1, cd: 0.5, er: 1.45, speed: 4.4 },
      ai: { range: 3.4, dodge: 0.8, reflex: 0.56, aggr: 1.0, kite: 1.6 },
      energyMax: 120, resource: 'heat',
      core: [
        ['Core Passive: Nitro-Fuel Cocktail', 'Spending Energy builds Heat (1.4 per Energy, max 100; she enters battle at 100). At 50 Heat she enters the Nitro-Fuel Cocktail state until her Heat runs out. In it, Mixed Flame Blend, both EX Specials, Fuel-Fed Flame and Glorious Inferno leave enemies Scorched. When another squad member hits a Scorched enemy, Afterburn fires (once per 1.5 s, costs 8 Heat): Fire DMG from Burnice\'s ATK and Fire buildup, even while she is off-field.'],
        ['Additional Ability: Fire Kindling', 'With another Anomaly Agent or a Sons of Calydon member in the squad: Mixed Flame Blend, both EX Specials and Afterburn build 65% more Fire buildup, and every Burn the squad applies lasts 3 s longer.'],
      ],
      kit: {
        basic: [0, 1, 2, 3, 4].map(i => ({ name: 'Basic Attack: Direct Flame Blend', anim: i === 4 ? 'shootBoth' : 'spray', dur: i === 4 ? 0.75 : 0.5, cancel: i === 4 ? 0.6 : 0.38, reach: 3.6, range: 3.0,
          hits: i === 4 ? [{ t: 0.3, mult: 120, daze: 70, bu: 90, heavy: true, shape: 'proj', speed: 14, r: 1.5, kb: 0.6, fx: 'fireball' }]
            : [0.12, 0.3].map(t => ({ t, mult: 26 + i * 3, daze: 16, bu: 30, shape: 'cone', r: 4.2, arc: 44, fx: 'flame', attr: t < 0.2 ? 'physical' : 'fire' })) })),
        hold: { name: 'Basic Attack: Mixed Flame Blend', anim: 'spinSpray', dur: 1.8, cancel: 1.65, reach: 3.0, range: 2.2, heatCost: 20, scorch: true, dr: 0.4, hits: [0.18, 0.4, 0.62, 0.84, 1.06, 1.28].map(t => ({ t, mult: 34, daze: 18, bu: 46, shape: 'circle', at: 'self', r: 3.0, fx: 'flameRing' })).concat([{ t: 1.5, mult: 160, daze: 80, bu: 140, heavy: true, shape: 'circle', at: 'self', r: 3.2, kb: 0.8, fx: 'explode' }]) },
        dash: { name: 'Dash Attack: Dangerous Fermentation', anim: 'thrust', dur: 0.6, cancel: 0.45, reach: 7, move: [0, 0.3, 3.5], hits: [{ t: 0.3, mult: 90, daze: 50, bu: 70, shape: 'cone', r: 3, arc: 60, fx: 'flame' }] },
        counter: { name: 'Dodge Counter: Fluttering Steps', anim: 'spray', dur: 0.7, cancel: 0.55, inv: [0, 0.6], hits: [{ t: 0.15, mult: 70, daze: 40, bu: 80, shape: 'cone', r: 4, arc: 60, fx: 'flame', attr: 'physical' }, { t: 0.4, mult: 110, daze: 60, bu: 130, heavy: true, shape: 'cone', r: 4.2, arc: 60, fx: 'flame' }] },
        special: { name: 'Special Attack: Intense Heat Aging Method', anim: 'shootBoth', dur: 0.8, cancel: 0.6, reach: 5, range: 3.0, cd: 3.5, dr: 0.4, hits: [{ t: 0.38, mult: 150, daze: 80, bu: 160, heavy: true, shape: 'proj', speed: 13, r: 1.9, kb: 0.6, fx: 'fireball' }] },
        ex: { name: 'EX Special Attack: Intense Heat Stirring Method', anim: 'spray', dur: 1.3, cancel: 1.15, cost: 40, reach: 3.8, range: 2.8, dr: 0.4, inv: [0.95, 1.3], scorch: true, hits: [0.2, 0.42, 0.64, 0.86].map(t => ({ t, mult: 60, daze: 35, bu: 120, shape: 'cone', r: 4.4, arc: 50, fx: 'flame' })).concat([{ t: 1.05, mult: 300, daze: 120, bu: 360, heavy: true, shape: 'line', r: 1.4, len: 7, kb: 1, fx: 'fireLine' }]) },
        ex2: { name: 'EX Special Attack: Intense Heat Stirring Method - Double Shot', anim: 'shootBoth', dur: 1.2, cancel: 1.05, cost: 30, dr: 0.4, inv: [0.85, 1.2], scorch: true, hits: [0.18, 0.38, 0.58].map(t => ({ t, mult: 70, daze: 35, bu: 140, shape: 'cone', r: 4.6, arc: 60, fx: 'flame' })).concat([{ t: 0.95, mult: 380, daze: 120, bu: 460, heavy: true, shape: 'line', r: 1.7, len: 7.5, kb: 1.2, fx: 'fireLine' }]) },
        chain: { name: 'Chain Attack: Fuel-Fed Flame', anim: 'exBurnice', dur: 1.3, inv: [0, 1.3], scorch: true, move: [0, 0.4, 2.4], hits: [{ t: 0.3, mult: 140, daze: 60, bu: 220, shape: 'cone', r: 4, arc: 60, fx: 'flame' }, { t: 0.95, mult: 420, daze: 120, bu: 620, heavy: true, shape: 'cone', r: 5, arc: 90, kb: 1, fx: 'explode' }] },
        ult: { name: 'Ultimate: Glorious Inferno', anim: 'ultBurnice', dur: 2.2, inv: [0, 2.2], scorch: true, move: [0, 0.35, 2.4], hits: [0.7, 0.95, 1.2, 1.45].map(t => ({ t, mult: 260, daze: 70, bu: 380, shape: 'cone', r: 6, arc: 90, at: 'self', fx: 'flame' })).concat([{ t: 1.75, mult: 900, daze: 205, bu: 900, heavy: true, shape: 'circle', at: 'target', r: 4.6, kb: 1.6, fx: 'explode' }]) },
        assist: { name: 'Defensive Assist: Smoky Cauldron', type: 'defensive', anim: 'guardGuns', dur: 0.45, inv: [0, 0.45], daze: 400 },
        followup: { name: 'Assist Follow-Up: Scorching Dew', anim: 'ultBurnice', dur: 1.05, inv: [0, 1.0], move: [0, 0.6, 2.2], hits: [0.3, 0.55].map(t => ({ t, mult: 150, daze: 60, bu: 220, shape: 'circle', at: 'self', r: 3, fx: 'flameRing' })).concat([{ t: 0.82, mult: 190, daze: 80, bu: 260, heavy: true, shape: 'circle', at: 'self', r: 3.2, kb: 0.8, fx: 'explode' }]) },
        quick: { name: 'Quick Assist: Energizing Specialty Drink', anim: 'spray', dur: 0.8, inv: [0, 0.7], hits: [0.15, 0.35, 0.55].map((t, i) => ({ t, mult: 75, daze: 40, bu: 100, shape: 'cone', r: 4.2, arc: 70, fx: 'flame', attr: i === 0 ? 'physical' : 'fire' })) },
      },
    },

    aria: {
      id: 'aria', name: 'Aria', short: 'Aria', faction: 'Angels of Delusion', spec: 'Anomaly', attr: 'ether', rank: 'S',
      color: '#ff7aa8', color2: '#2fbfa8', assist: 'defensive', stance: 'idol',
      blurb: 'The Angels of Delusion\'s idol. Her songs plant Fandom Power on the stage; her charged Perfect Pitch soaks it up and, on an enemy already suffering an anomaly, blooms into Abloom.',
      stats: { hp: 7800, atk: 2900, def: 600, impact: 86, ap: 365, am: 160, cr: 0.1, cd: 0.5, er: 1.35, speed: 4.6 },
      ai: { range: 2.2, dodge: 0.82, reflex: 0.6, aggr: 0.95 },
      energyMax: 120, resource: 'fandom',
      forms: { idol: { name: 'Idol', model: 'aria', note: 'Her projected stage persona: bright and high-energy.' }, construct: { name: 'Construct', model: 'ariaRobot', note: 'Her true form, an A-H0L0 Type Intelligent Tactical Construct: shy, soft-spoken. Same kit.' } },
      core: [
        ['Core Passive: Innate Stage Presence', 'Aria has +45 Anomaly Proficiency. When the 3rd charge level of Perfect Pitch lands as a heavy attack on an enemy suffering an Attribute Anomaly, it triggers Abloom: an extra instance of that anomaly\'s DMG (scaled by Aria\'s Anomaly Mastery), 50% higher if the enemy is Stunned.'],
        ['Fandom Power', 'The 4th hit of Sweet Melody, Full-Sugar Electronica - No Ice, both EX Specials (3 each) and Dream Collab (4) put Fandom Power on the stage, up to 6. Perfect Pitch soaks up nearby Fandom Power: +1 charge level and +10% buildup each (max 2).'],
        ['Ultimate: 100% Energy', 'Aria enters Moment of Delusion for 15 s with 3 All-Out Cheering (each charges Perfect Pitch by 2 levels) and her Perfect Pitch 3rd hit is enhanced. Ether Veil: Delusion Reprise gives the squad +ATK for 30 s.'],
        ['Additional Ability: Collaborative Stage', 'With a Stun, Support or Anomaly Agent or an Angels of Delusion member in the squad: Ether Veil puts 4 Fandom Power on the stage, and every Corruption the squad applies lasts 3 s longer.'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: Sweet Melody', anim: 'slashR', dur: 0.45, cancel: 0.33, reach: 1.9, range: 1.8, move: [0, 0.16, 0.6], hits: [{ t: 0.16, mult: 46, daze: 32, bu: 44, shape: 'arc', r: 2.2, arc: 140 }] },
          { name: 'Basic Attack: Sweet Melody', anim: 'kickA', dur: 0.5, cancel: 0.37, reach: 1.9, range: 1.8, move: [0, 0.18, 0.6], hits: [{ t: 0.18, mult: 52, daze: 36, bu: 50 }] },
          { name: 'Basic Attack: Sweet Melody', anim: 'spin', dur: 0.58, cancel: 0.45, reach: 2.0, range: 1.8, hits: [{ t: 0.24, mult: 66, daze: 44, bu: 66, shape: 'circle', at: 'self', r: 2.3, fx: 'notes' }] },
          { name: 'Basic Attack: Sweet Melody', anim: 'slamDown', dur: 0.75, cancel: 0.6, reach: 2.0, range: 1.8, noIce: true, fandom: 1, move: [0, 0.3, 0.6], hits: [{ t: 0.32, mult: 120, daze: 80, bu: 120, heavy: true, shape: 'circle', at: 'front', r: 1.9, kb: 0.6, fx: 'sound' }] },
        ],
        charged: { name: 'Basic Attack: Perfect Pitch', anim: 'chargeNote', dur: 1.5, cancel: 1.3, reach: 2.4, range: 2.0, dr: 0.4, inv: [1.0, 1.5], abloom: true, hits: [{ t: 1.1, mult: 340, daze: 145, bu: 380, heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 1, fx: 'heart' }] },
        dash: { name: 'Dash Attack: Silky-Smooth Combo', anim: 'slashR', dur: 0.55, cancel: 0.42, reach: 7, move: [0, 0.25, 3.4], hits: [{ t: 0.25, mult: 75, daze: 45, bu: 70, shape: 'arc', r: 2.2, arc: 140 }] },
        counter: { name: 'Dodge Counter: Slide-Shift Variation', anim: 'slashL', dur: 0.6, cancel: 0.45, inv: [0, 0.5], move: [0, 0.15, 1.6], hits: [{ t: 0.15, mult: 160, daze: 70, bu: 180, heavy: true, kb: 0.8, shape: 'arc', r: 2.4, arc: 160 }] },
        special: { name: 'Special Attack: Full-Sugar Electronica', anim: 'kickA', dur: 0.75, cancel: 0.58, reach: 1.9, cd: 3.5, dr: 0.4, move: [0, 0.3, 0.8], hits: [{ t: 0.32, mult: 140, daze: 70, bu: 150, heavy: true, kb: 0.8 }] },
        noIce: { name: 'Special Attack: Full-Sugar Electronica - No Ice', anim: 'kickA', dur: 0.55, cancel: 0.42, reach: 1.9, fandom: 1, move: [0, 0.2, 0.8], hits: [{ t: 0.2, mult: 175, daze: 80, bu: 190, heavy: true, kb: 0.8, fx: 'sound' }] },
        ex: { name: 'EX Special Attack: Fall Into Delusion', anim: 'exAria', dur: 1.1, cancel: 0.95, cost: 40, reach: 2.4, range: 2.0, inv: [0, 0.95], fandom: 3, noIce: true, hits: [{ t: 0.35, mult: 200, daze: 80, bu: 260, kb: 0.4 }, { t: 0.75, mult: 300, daze: 120, bu: 380, heavy: true, shape: 'cone', r: 4.5, arc: 70, kb: 0.8, fx: 'sound' }] },
        ex2: { name: 'EX Special Attack: Instantly Hooked', anim: 'slamDown', dur: 1.0, cancel: 0.85, cost: 40, inv: [0, 0.9], fandom: 3, noIce: true, hits: [{ t: 0.45, mult: 460, daze: 145, bu: 560, heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.2, fx: 'heart' }] },
        chain: { name: 'Chain Attack: Dream Collab', anim: 'exAria', dur: 1.3, inv: [0, 1.3], fandomStart: 4, noIce: true, hits: [{ t: 0.35, mult: 180, daze: 60, bu: 260, fx: 'sound' }, { t: 0.8, mult: 360, daze: 120, bu: 480, heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1, fx: 'heart' }] },
        ult: { name: 'Ultimate: 100% Energy', anim: 'ultAria', dur: 2.2, inv: [0, 2.2], noIce: true, delusion: true, hits: [0.8, 1.0, 1.2].map(t => ({ t, mult: 280, daze: 70, bu: 320, shape: 'proj', speed: 22, r: 1.6, fx: 'bignote' })).concat([{ t: 1.6, mult: 900, daze: 205, bu: 900, heavy: true, shape: 'circle', at: 'target', r: 4.5, kb: 1.4, fx: 'heart' }]) },
        assist: { name: 'Defensive Assist: Clutch Save', type: 'defensive', anim: 'guardStick', dur: 0.45, inv: [0, 0.45], daze: 400 },
        followup: { name: 'Assist Follow-Up: Encore Song', anim: 'exAria', dur: 1.0, inv: [0, 0.95], noIce: true, hits: [0.25, 0.45].map(t => ({ t, mult: 120, daze: 50, bu: 160, shape: 'arc', r: 2.6, arc: 160 })).concat([{ t: 0.7, mult: 220, daze: 90, bu: 280, heavy: true, shape: 'circle', at: 'target', r: 2.6, kb: 0.8, fx: 'sound' }]) },
        quick: { name: 'Quick Assist: Shatter Fantasy', anim: 'slashL', dur: 0.65, inv: [0, 0.6], move: [0, 0.25, 2.5], hits: [{ t: 0.25, mult: 190, daze: 70, bu: 230, kb: 0.8, shape: 'arc', r: 2.6, arc: 160 }] },
      },
    },

    yixuan: {
      id: 'yixuan', name: 'Yixuan', short: 'Yixuan', faction: 'Yunkui Summit', spec: 'Rupture', attr: 'auric', rank: 'S',
      color: '#f0b52a', color2: '#e8eaf0', assist: 'defensive', stance: 'martial',
      blurb: 'Master of Yunkui Summit, with her ink-winged familiar. Auric Ink strikes deal Sheer DMG that ignores DEF and grows with her Max HP; she runs on Adrenaline instead of Energy.',
      stats: { hp: 12400, atk: 2350, def: 640, impact: 94, ap: 110, am: 110, cr: 0.42, cd: 1.0, er: 0, speed: 4.9 },
      ai: { range: 1.4, dodge: 0.85, reflex: 0.66, aggr: 1.1 },
      energyMax: 120, resource: 'adrenaline', sheer: true,
      core: [
        ['Core Passive: Grandmaster of Mysticism', 'Sheer Force +0.1 per point of Max HP; all her DMG is Sheer DMG (ignores DEF). Auric Ink buildup has its own gauge; triggering its anomaly restores 10 Adrenaline (once per 10 s). She enters battle with full Adrenaline; a Perfect Dodge gives +5. Spending Adrenaline builds Technique Points (0.667 each, max 120); at 120 she can unleash Endless Talisman Suppression, which grants an Auric Ink Point for Auric Array.'],
        ['Additional Ability: Auric Ink Undercurrent', 'With a Stun, Support or Defense Agent in the squad: when a teammate uses an Ultimate, Yixuan regains 2 Adrenaline/s for 10 s; switched out by a Perfect Assist, she strikes with lightning (225% Sheer Force, +5 Adrenaline); Cloud-Shaper deals +30% DMG to Stunned enemies; after her Ultimate she enters Meditation (+40% CRIT DMG, 15 s).'],
        ['Ultimate: Qingming Skyshade', 'Wing barrage and talismans; on use, Yixuan evenly redistributes the squad\'s HP.'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: Cirrus Strike', anim: 'palmR', dur: 0.42, cancel: 0.3, reach: 1.5, move: [0, 0.15, 0.5], hits: [{ t: 0.15, mult: 52, daze: 50, bu: 22 }] },
          { name: 'Basic Attack: Cirrus Strike', anim: 'palmL', dur: 0.42, cancel: 0.3, reach: 1.5, move: [0, 0.15, 0.5], hits: [{ t: 0.15, mult: 56, daze: 52, bu: 24 }] },
          { name: 'Basic Attack: Cirrus Strike', anim: 'kick', dur: 0.55, cancel: 0.4, reach: 1.6, dr: 0.4, move: [0, 0.2, 0.6], hits: [{ t: 0.22, mult: 74, daze: 66, bu: 30, kb: 0.5 }] },
          { name: 'Basic Attack: Cirrus Strike', anim: 'palmBoth', dur: 0.6, cancel: 0.45, reach: 1.6, dr: 0.4, move: [0, 0.22, 0.7], hits: [{ t: 0.12, mult: 40, daze: 30, bu: 18 }, { t: 0.24, mult: 40, daze: 30, bu: 18 }, { t: 0.36, mult: 50, daze: 40, bu: 22 }] },
          { name: 'Basic Attack: Cirrus Strike', anim: 'spinKick', dur: 0.8, cancel: 0.62, reach: 1.7, move: [0.05, 0.35, 0.8], hits: [{ t: 0.35, mult: 160, daze: 120, bu: 60, heavy: true, shape: 'circle', at: 'self', r: 2.2, kb: 1.1, fx: 'ink' }] },
        ],
        auric: { name: 'Basic Attack: Auric Array', anim: 'array', dur: 2.1, cancel: 2.05, inv: [0, 2.1], vitalView: true, adrenalinePerSec: 7, hits: [0.3, 0.6, 0.9, 1.2, 1.5].map(t => ({ t, mult: 90, daze: 45, bu: 60, shape: 'circle', at: 'target', r: 2.6, fx: 'ink' })), then: 'eruption' },
        eruption: { name: 'Basic Attack: Qingming Eruption', anim: 'wings', dur: 0.9, cancel: 0.75, inv: [0, 0.8], hits: [{ t: 0.35, mult: 520, daze: 205, bu: 300, heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1.4, fx: 'wings' }] },
        dash: { name: 'Dash Attack: Skybreaker', anim: 'kick', dur: 0.55, cancel: 0.42, reach: 7, move: [0, 0.25, 4], hits: [{ t: 0.25, mult: 85, daze: 70, bu: 30 }] },
        counter: { name: 'Dodge Counter: Banishing Blow', anim: 'palmBoth', dur: 0.62, cancel: 0.46, inv: [0, 0.5], move: [0, 0.15, 1.8], hits: [{ t: 0.12, mult: 80, daze: 60, bu: 50 }, { t: 0.28, mult: 130, daze: 90, bu: 80, heavy: true, kb: 0.9, fx: 'ink' }] },
        special: { name: 'Special Attack: Shadow-Ignition', anim: 'palmR', dur: 0.75, cancel: 0.55, reach: 2.2, cd: 3.5, dr: 0.4, retreat: true, move: [0, 0.18, -1.2], move2: [0.25, 0.4, 2.0], hits: [{ t: 0.4, mult: 160, daze: 120, bu: 110, heavy: true, kb: 0.6, fx: 'ink' }] },
        ex: { name: 'EX Special Attack: Ink Manifestation', anim: 'wingsUp', dur: 1.1, cancel: 0.95, cost: 40, reach: 2.2, inv: [0.35, 1.1], perfectBlock: 0.25, technique: true, hits: [{ t: 0.45, mult: 380, daze: 205, bu: 260, heavy: true, shape: 'arc', r: 2.8, arc: 140, kb: 1.2, fx: 'wings' }, { t: 0.8, mult: 180, daze: 60, bu: 120, shape: 'circle', at: 'target', r: 2.4, fx: 'talisman' }] },
        ex2: { name: 'EX Special Attack: Qingming Eruption - Break', anim: 'wings', dur: 0.9, cancel: 0.75, cost: 20, inv: [0, 0.8], technique: true, hits: [{ t: 0.35, mult: 360, daze: 145, bu: 220, heavy: true, shape: 'circle', at: 'target', r: 3, kb: 1.2, fx: 'wings' }] },
        exAlt: { name: 'EX Special Attack: Cloud-Shaper', anim: 'array', dur: 2.0, cancel: 1.95, cost: 40, reach: 3, dr: 0.4, technique: true, hits: [0.3, 0.6, 0.9, 1.2, 1.5].map(t => ({ t, mult: 70, daze: 40, bu: 50, shape: 'circle', at: 'target', r: 2.4, fx: 'ink', stunBonus: 0.3 })).concat([{ t: 1.8, mult: 420, daze: 145, bu: 240, heavy: true, shape: 'circle', at: 'target', r: 2.8, kb: 1, fx: 'ink', stunBonus: 0.3, name: 'Ashen Ink Becomes Shadows' }]) },
        chain: { name: 'Chain Attack: Auric Ink Rush', anim: 'wings', dur: 1.25, inv: [0, 1.25], move: [0, 0.35, 2.6], hits: [{ t: 0.35, mult: 220, daze: 90, bu: 160, fx: 'ink' }, { t: 0.8, mult: 460, daze: 145, bu: 320, heavy: true, shape: 'circle', at: 'target', r: 3, kb: 1.2, fx: 'wings' }] },
        ult: { name: 'Ultimate: Qingming Skyshade', anim: 'ultYixuan', dur: 2.1, inv: [0, 2.1], meditation: true, evenHp: true, hits: [0.6, 0.8, 1.0].map(t => ({ t, mult: 300, daze: 90, bu: 160, shape: 'circle', at: 'target', r: 3.5, fx: 'wings' })).concat([{ t: 1.45, mult: 1500, daze: 470, bu: 600, heavy: true, shape: 'circle', at: 'target', r: 5, kb: 2, fx: 'talisman' }]) },
        ult2: { name: 'Ultimate: Endless Talisman Suppression', anim: 'ultYixuan', dur: 1.8, inv: [0, 1.8], meditation: true, evenHp: true, auricPoint: true, hits: [{ t: 1.2, mult: 1100, daze: 355, bu: 500, heavy: true, shape: 'circle', at: 'target', r: 4.5, kb: 1.6, fx: 'talisman' }] },
        assist: { name: 'Defensive Assist: Clear Sky Surge', type: 'defensive', anim: 'guardPalm', dur: 0.45, inv: [0, 0.45], daze: 440 },
        followup: { name: 'Assist Follow-Up: Celestial Cloud Blitz', anim: 'palmBoth', dur: 0.95, inv: [0, 0.9], move: [0, 0.3, 2.4], hits: [{ t: 0.3, mult: 220, daze: 120, bu: 140 }, { t: 0.55, mult: 260, daze: 145, bu: 160, heavy: true, kb: 1.2, fx: 'ink' }] },
        quick: { name: 'Quick Assist: Cloudstream Shadow', anim: 'palmBoth', dur: 0.7, inv: [0, 0.6], move: [0, 0.3, 3], hits: [{ t: 0.15, mult: 110, daze: 75, bu: 60 }, { t: 0.32, mult: 130, daze: 90, bu: 70, kb: 0.8, fx: 'ink' }] },
      },
    },

    qingyi: {
      id: 'qingyi', name: 'Qingyi', short: 'Qingyi', faction: 'Criminal Investigation Special Response Team', spec: 'Stun', attr: 'electric', rank: 'S',
      color: '#2a8a6e', color2: '#1f3a6a', assist: 'defensive', stance: 'staff',
      blurb: 'A PubSec android of the Criminal Investigation Special Response Team. A folding bo staff, an endless flurry: she builds Flash Connect Voltage, cashes it in for Enchanted Moonlit Blossoms, and leaves enemies Subjugated, taking far more DMG while Stunned.',
      stats: { hp: 9000, atk: 2200, def: 730, impact: 150, ap: 93, am: 94, cr: 0.25, cd: 0.6, er: 1.2, speed: 4.8 },
      ai: { range: 1.6, dodge: 0.75, reflex: 0.62, aggr: 1.0 },
      energyMax: 120, resource: 'voltage',
      core: [
        ['Core Passive: Eternal Seasons', 'The Finishing Move of Basic Attack: Enchanted Moonlit Blossoms applies 5 stacks of Subjugation (+1 for each rush attack that landed; double on normal and elite enemies), up to 20. Each stack raises the target\'s Stun DMG Multiplier by 4%. The stacks reset when the target recovers from Stun.'],
        ['Flash Connect', 'Her Electric hits build Flash Connect Voltage. At 75% she enters Flash Connect, and her next Basic Attack is Enchanted Moonlit Blossoms: five rush attacks and a finishing strike, with more DMG and Daze for every point of Voltage over 75. She is Anti-Interrupt during the rush (-40% DMG taken) and invulnerable during the finish. Her Chain Attack restores 25 Voltage, her Ultimate 50.'],
        ['Additional Ability: Three Verses of Farewell at Yang Pass', 'With an Attack Agent or a member of her faction in the squad: Basic Attacks deal 20% more Daze. Every point of Impact over 120 gives her 6 ATK (up to 600).'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: Penultimate Attack', anim: 'slashR', dur: 0.46, cancel: 0.32, reach: 1.9, range: 1.6, move: [0, 0.16, 0.5], hits: [{ t: 0.16, mult: 50, daze: 55, bu: 18, attr: 'physical', shape: 'arc', r: 2.4, arc: 150 }] },
          { name: 'Basic Attack: Penultimate Attack', anim: 'thrust', dur: 0.46, cancel: 0.33, reach: 2.0, range: 1.6, move: [0, 0.15, 0.6], hits: [{ t: 0.15, mult: 55, daze: 58, bu: 20 }] },
          { name: 'Basic Attack: Penultimate Attack', anim: 'spin', dur: 1.0, cancel: 0.85, reach: 2.0, range: 1.6, dr: 0.4, hits: [0.12, 0.27, 0.42, 0.57, 0.72].map(t => ({ t, mult: 26, daze: 32, bu: 14, shape: 'circle', at: 'front', r: 2.0 })) },
          { name: 'Basic Attack: Penultimate Attack', anim: 'slamDown', dur: 0.8, cancel: 0.66, reach: 2.0, range: 1.6, move: [0.05, 0.3, 0.6], hits: [{ t: 0.36, mult: 155, daze: 170, bu: 50, heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 0.9, fx: 'shock' }] },
        ],
        moonlit: { name: 'Basic Attack: Enchanted Moonlit Blossoms', anim: 'thrust', dur: 1.75, cancel: 1.7, reach: 2.6, range: 1.8, dr: 0.4, inv: [1.15, 1.6], moonlit: true,
          hits: [0.15, 0.35, 0.55, 0.75, 0.95].map(t => ({ t, mult: 60, daze: 75, bu: 26, rush: true, shape: 'line', r: 1.3, len: 3.4 })).concat([{ t: 1.35, mult: 330, daze: 430, bu: 90, heavy: true, finisher: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.2, fx: 'shock' }]) },
        dash: { name: 'Dash Attack: Breach', anim: 'slashR', dur: 0.6, cancel: 0.45, reach: 7, move: [0, 0.28, 4], hits: [{ t: 0.3, mult: 85, daze: 85, bu: 30, attr: 'physical' }] },
        counter: { name: 'Dodge Counter: Lingering Sentiments', anim: 'slamDown', dur: 0.7, cancel: 0.55, inv: [0, 0.6], move: [0, 0.2, 1.4], hits: [{ t: 0.3, mult: 170, daze: 160, bu: 55, heavy: true, shape: 'circle', at: 'front', r: 2.2, kb: 0.9, fx: 'shock' }] },
        special: { name: 'Special Attack: Sunlit Glory', anim: 'slamDown', dur: 0.8, cancel: 0.62, reach: 2.0, cd: 3.5, dr: 0.4, move: [0, 0.2, 0.6], hits: [{ t: 0.2, mult: 70, daze: 90, bu: 30 }, { t: 0.5, mult: 125, daze: 160, bu: 45, heavy: true, shape: 'circle', at: 'front', r: 2.2, kb: 0.8, fx: 'shock' }] },
        ex: { name: 'EX Special Attack: Moonlit Begonia', anim: 'slamDown', dur: 1.25, cancel: 1.1, cost: 40, reach: 2.2, inv: [0, 1.15], move: [0, 0.3, 0.8], hits: [{ t: 0.25, mult: 130, daze: 150, bu: 50, kb: 0.4 }, { t: 0.55, mult: 120, daze: 140, bu: 45 }, { t: 1.0, mult: 310, daze: 330, bu: 90, heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.2, fx: 'shock' }] },
        chain: { name: 'Chain Attack: Tranquil Serenade', anim: 'spin', dur: 1.3, inv: [0, 1.3], voltage: 25, hits: [0.3, 0.5, 0.7].map(t => ({ t, mult: 90, daze: 60, bu: 60, shape: 'circle', at: 'front', r: 3.0 })).concat([{ t: 1.0, mult: 380, daze: 200, bu: 150, heavy: true, shape: 'circle', at: 'front', r: 3.2, kb: 1.2, fx: 'shock' }]) },
        ult: { name: 'Ultimate: Eight Sounds of Ganzhou', anim: 'spin', dur: 2.1, inv: [0, 2.1], voltage: 50, hits: [0.5, 0.65, 0.8, 0.95, 1.1, 1.25].map(t => ({ t, mult: 160, daze: 70, bu: 60, shape: 'circle', at: 'target', r: 3.4 })).concat([{ t: 1.7, mult: 1300, daze: 600, bu: 300, heavy: true, shape: 'circle', at: 'target', r: 4.5, kb: 1.8, fx: 'shock' }]) },
        assist: { name: 'Defensive Assist: Graceful Embellishment', type: 'defensive', anim: 'guard', dur: 0.45, inv: [0, 0.45], daze: 460 },
        followup: { name: 'Assist Follow-Up: Song of the Clear River', anim: 'thrust', dur: 1.0, inv: [0, 0.95], move: [0, 0.25, 2.2], hits: [{ t: 0.3, mult: 140, daze: 120, bu: 50 }, { t: 0.75, mult: 280, daze: 220, bu: 80, heavy: true, shape: 'circle', at: 'front', r: 2.8, kb: 1.0, fx: 'shock' }] },
        quick: { name: 'Quick Assist: Wind Through the Pines', anim: 'slamDown', dur: 0.75, inv: [0, 0.65], move: [0, 0.3, 2.4], hits: [{ t: 0.35, mult: 200, daze: 180, bu: 60, kb: 0.8, shape: 'circle', at: 'front', r: 2.2, fx: 'shock' }] },
      },
    },

    jufufu: {
      id: 'jufufu', name: 'Ju Fufu', short: 'Fufu', faction: 'Yunkui Summit', spec: 'Stun', attr: 'fire', rank: 'S',
      color: '#f2b530', color2: '#3a3a44', assist: 'defensive', stance: 'tiger',
      blurb: 'The little tiger of Yunkui Summit, keeper of Suibian Temple, with clawed gauntlets and Hu Wei: a tiger-faced cauldron that fires flames and popcorn. Hu Wei fights on its own and builds Might; with enough, it answers your Chain Attacks and roars the squad up.',
      stats: { hp: 9000, atk: 2900, def: 720, impact: 150, ap: 96, am: 93, cr: 0.4, cd: 0.6, er: 1.2, speed: 4.7 },
      ai: { range: 1.5, dodge: 0.72, reflex: 0.6, aggr: 1.1 },
      energyMax: 120, resource: 'might',
      core: [
        ['Core Passive: Fu-rocious Might', 'Hu Wei attacks on its own every few seconds, on or off the field, dealing Fire DMG and gaining 20 Might (max 200). When a Chain Attack is triggered and Hu Wei has 100 Might, and Ju Fufu is not the one on the field, Hu Wei unleashes Chain Attack: Suppressing Tiger Cauldron on the target: flames and popcorn, massive Fire DMG. The whole squad then gains Tiger\'s Roar for 30 s: +20% CRIT DMG (more if her ATK is over 2,800), Chain Attack DMG +11.7% and Ultimate DMG +23.3%.'],
        ['Momentum', 'Assist Follow-Ups (1), EX Specials (3) and her Ultimate (6) give Momentum (max 15). Her spinning Dash Attack: Mountain King\'s Game spends it to turn Fire and build Might.'],
        ['Additional Ability: Aura of Authority', 'With an Attack or Rupture Agent in the squad: when an Attack or Rupture Agent uses an Ultimate, she gets 300 Decibels back.'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: Tiger Seven Forms - Flaming Claw', anim: 'slashR', dur: 0.44, cancel: 0.3, reach: 1.6, move: [0, 0.15, 0.6], hits: [{ t: 0.15, mult: 46, daze: 55, bu: 20, attr: 'physical', shape: 'arc', r: 2.2, arc: 130 }] },
          { name: 'Basic Attack: Tiger Seven Forms - Flaming Claw', anim: 'slashL', dur: 0.44, cancel: 0.31, reach: 1.6, move: [0, 0.15, 0.6], hits: [{ t: 0.15, mult: 50, daze: 58, bu: 24 }] },
          { name: 'Basic Attack: Tiger Seven Forms - Flaming Claw', anim: 'spin', dur: 0.95, cancel: 0.8, reach: 1.7, dr: 0.4, hits: [0.12, 0.27, 0.42, 0.57, 0.72].map(t => ({ t, mult: 24, daze: 30, bu: 16, shape: 'circle', at: 'front', r: 1.9 })) },
          { name: 'Basic Attack: Tiger Seven Forms - Flaming Claw', anim: 'slamDown', dur: 0.8, cancel: 0.65, reach: 1.8, move: [0.05, 0.32, 0.9], hits: [{ t: 0.36, mult: 160, daze: 175, bu: 55, heavy: true, shape: 'circle', at: 'front', r: 2.3, kb: 0.9, fx: 'flameRing' }] },
        ],
        spin: { name: 'Dash Attack: Tiger Seven Forms - Mountain King\'s Game', anim: 'spin', dur: 1.5, cancel: 1.45, reach: 3.5, dr: 0.4, spin: true, hits: [0.2, 0.4, 0.6, 0.8, 1.0].map(t => ({ t, mult: 40, daze: 42, bu: 30, shape: 'circle', at: 'self', r: 2.0 })).concat([{ t: 1.3, mult: 160, daze: 140, bu: 60, heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 0.9, fx: 'explode' }]) },
        dash: { name: 'Dash Attack: Tiger Seven Forms - Tiger Charge', anim: 'slashR', dur: 0.55, cancel: 0.42, reach: 7, move: [0, 0.26, 4], hits: [{ t: 0.26, mult: 85, daze: 80, bu: 30, attr: 'physical' }] },
        counter: { name: 'Dodge Counter: Tiger Seven Forms - Reignited Mountain', anim: 'slashL', dur: 0.7, cancel: 0.55, inv: [0, 0.6], move: [0, 0.15, 1.6], hits: [{ t: 0.15, mult: 80, daze: 70, bu: 40 }, { t: 0.32, mult: 140, daze: 120, bu: 60, heavy: true, kb: 0.9, fx: 'flameRing', shape: 'circle', at: 'front', r: 2.0 }] },
        special: { name: 'Special Attack: Tiger Seven Forms - Mountain-Descending Tiger', anim: 'spinKick', dur: 0.85, cancel: 0.65, reach: 2.0, cd: 3.5, dr: 0.4, move: [0, 0.3, 0.8], hits: [{ t: 0.22, mult: 75, daze: 95, bu: 35, shape: 'circle', at: 'self', r: 2.0 }, { t: 0.55, mult: 130, daze: 165, bu: 50, heavy: true, shape: 'circle', at: 'front', r: 2.2, kb: 0.8, fx: 'flameRing' }] },
        ex: { name: 'EX Special Attack: Tiger Seven Forms Alt - Mountain-Descending Savage Tiger', anim: 'slamDown', dur: 1.15, cancel: 1.0, cost: 40, reach: 2.6, inv: [0, 1.05], might: 50, momentum: 3, huwei: true, hits: [{ t: 0.55, mult: 430, daze: 410, bu: 120, heavy: true, shape: 'circle', at: 'front', r: 3.0, kb: 1.3, fx: 'explode' }] },
        chain: { name: 'Chain Attack: Tiger Cauldron Collapse', anim: 'slamDown', dur: 1.25, inv: [0, 1.25], huwei: true, hits: [{ t: 0.6, mult: 580, daze: 280, bu: 160, heavy: true, shape: 'circle', at: 'target', r: 2.8, kb: 1.4, fx: 'explode' }] },
        ult: { name: 'Ultimate: Tiger Seven Forms - Raging Tiger Explosion', anim: 'ultSmash', dur: 2.0, inv: [0, 2.0], might: 100, momentum: 6, huwei: true, hits: [{ t: 0.75, mult: 700, daze: 320, bu: 200, shape: 'circle', at: 'target', r: 3.5, kb: 0.6, fx: 'explode' }, { t: 1.4, mult: 1550, daze: 620, bu: 320, heavy: true, shape: 'circle', at: 'target', r: 4.5, kb: 2, fx: 'explode' }] },
        assist: { name: 'Defensive Assist: Steadfast Crouching Tiger', type: 'defensive', anim: 'guard', dur: 0.45, inv: [0, 0.45], daze: 460 },
        followup: { name: 'Assist Follow-Up: Feral Blazing Maw', anim: 'slashR', dur: 1.0, inv: [0, 0.95], move: [0, 0.25, 1.6], momentum: 1, huwei: true, hits: [{ t: 0.25, mult: 170, daze: 140, bu: 60 }, { t: 0.7, mult: 290, daze: 230, bu: 90, heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.1, fx: 'explode' }] },
        quick: { name: 'Quick Assist: Decisive Stomp', anim: 'slashL', dur: 0.7, inv: [0, 0.6], move: [0, 0.25, 2.6], hits: [{ t: 0.25, mult: 200, daze: 175, bu: 60, kb: 0.8, shape: 'arc', r: 2.4, arc: 150 }] },
        // what Hu Wei does on its own (not moves Ju Fufu makes; data for battle.js)
        huwei: { name: 'Hu Wei', mult: 120, daze: 60, bu: 40, might: 20, every: 4 },
        suppress: { name: 'Chain Attack: Suppressing Tiger Cauldron', mult: 650, daze: 160, bu: 200, r: 2.6 },
      },
    },

    orphie: {
      id: 'orphie', name: 'Orphie & Magus', short: 'Orphie', faction: 'Obol Squad', spec: 'Attack', attr: 'fire', rank: 'S',
      color: '#ff6a1a', color2: '#c8202a', assist: 'defensive', stance: 'soldier',
      blurb: 'Captain of the Obol Squad and Magus, her mechanical fire-breathing serpent. Magus sweeps lasers and flame blades on her command; with Bottled Heat full she pours it all into one long Heat Charge laser, and even off the field Magus fires on the squad\'s targets.',
      stats: { hp: 8500, atk: 3100, def: 650, impact: 93, ap: 90, am: 92, cr: 0.35, cd: 0.9, er: 1.6, speed: 4.7 },
      ai: { range: 2.2, dodge: 0.72, reflex: 0.6, aggr: 1.0 },
      energyMax: 120, resource: 'heatO',
      core: [
        ['Core Passive: Taming Wind and Fire', 'CRIT Rate +25%, Aftershock DMG +85%. Orphie & Magus start with 100 Bottled Heat (max 125); EX Specials, the Chain Attack and the Ultimate restore 20. With 100, hold Special for EX Special Attack: Heat Charge: Magus fires a laser that grows hotter the longer it runs and ends in Fiery Eruption. When its laser hits, the whole squad gains Zeroed In for 12 s: +255 ATK.'],
        ['Off the field', 'While another Agent attacks, Magus fires Special Attack: Corrosive Flash, four laser Aftershocks at her target (once every 5 s, +20 Bottled Heat).'],
        ['Additional Ability: Forged in Flames', 'With a Stun or Support Agent in the squad: Aftershock DMG dealt by Agents with Zeroed In ignores 25% DEF.'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: High-Pressure Flamethrower', anim: 'slashR', dur: 0.42, cancel: 0.3, reach: 2.2, range: 2.0, move: [0, 0.14, 0.4], hits: [{ t: 0.14, mult: 42, daze: 28, bu: 16, attr: 'physical' }] },
          { name: 'Basic Attack: High-Pressure Flamethrower', anim: 'point', dur: 0.48, cancel: 0.36, reach: 3.6, range: 2.4, hits: [0.12, 0.26].map(t => ({ t, mult: 26, daze: 16, bu: 22, shape: 'line', r: 1.0, len: 4.2 })) },
          { name: 'Basic Attack: High-Pressure Flamethrower', anim: 'kick', dur: 0.48, cancel: 0.35, reach: 2.0, range: 1.8, move: [0, 0.16, 0.5], hits: [{ t: 0.17, mult: 58, daze: 34, bu: 18, attr: 'physical' }] },
          { name: 'Basic Attack: High-Pressure Flamethrower', anim: 'point', dur: 0.5, cancel: 0.38, reach: 3.6, range: 2.4, hits: [0.12, 0.26].map(t => ({ t, mult: 32, daze: 18, bu: 26, shape: 'line', r: 1.0, len: 4.4 })) },
          { name: 'Basic Attack: High-Pressure Flamethrower', anim: 'sweep', dur: 0.52, cancel: 0.4, reach: 2.4, range: 2.0, hits: [{ t: 0.22, mult: 70, daze: 40, bu: 30, shape: 'arc', r: 2.8, arc: 170 }] },
          { name: 'Basic Attack: High-Pressure Flamethrower', anim: 'slamDown', dur: 0.8, cancel: 0.66, reach: 2.6, range: 2.0, aftershock: true, hits: [{ t: 0.36, mult: 190, daze: 70, bu: 60, heavy: true, shape: 'arc', r: 3.2, arc: 160, kb: 0.9, fx: 'flameRing' }] },
        ],
        heatCharge: { name: 'EX Special Attack: Heat Charge', anim: 'point', dur: 2.75, cancel: 2.7, reach: 7, range: 4, dr: 0.4, inv: [1.4, 2.75], bheatCost: 100, zeroIn: true, aftershock: true,
          hits: [0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0].map((t, i) => ({ t, mult: 45 + i * 6, daze: 22, bu: 30, shape: 'line', r: 1.2, len: 10 })).concat([{ t: 2.35, mult: 520, daze: 120, bu: 160, heavy: true, shape: 'line', r: 1.6, len: 11, kb: 1.2, fx: 'fireLine' }]) },
        dash: { name: 'Dash Attack: Rush Command', anim: 'thrust', dur: 0.55, cancel: 0.42, reach: 7, move: [0, 0.26, 4], hits: [{ t: 0.26, mult: 85, daze: 45, bu: 25, attr: 'physical' }] },
        counter: { name: 'Dodge Counter: Counter Strike Opportunity', anim: 'sweep', dur: 0.7, cancel: 0.55, inv: [0, 0.6], move: [0, 0.15, 1.4], hits: [{ t: 0.15, mult: 80, daze: 40, bu: 30, attr: 'physical' }, { t: 0.36, mult: 170, daze: 70, bu: 60, heavy: true, shape: 'arc', r: 2.8, arc: 160, kb: 0.9 }] },
        special: { name: 'Special Attack: Blazing Chamber', anim: 'thrust', dur: 0.8, cancel: 0.62, reach: 2.4, cd: 3.5, dr: 0.4, move: [0, 0.2, 0.8], hits: [{ t: 0.2, mult: 95, daze: 50, bu: 40 }, { t: 0.5, mult: 165, daze: 80, bu: 60, heavy: true, shape: 'arc', r: 2.8, arc: 120, kb: 0.8 }] },
        ex: { name: 'EX Special Attack: Watch Your Step', anim: 'sweep', dur: 1.15, cancel: 1.0, cost: 40, reach: 5, range: 3, inv: [0, 1.05], bheat: 20, aftershock: true, hits: [0.3, 0.45, 0.6, 0.75].map(t => ({ t, mult: 75, daze: 40, bu: 50, shape: 'line', r: 1.4, len: 8 })).concat([{ t: 0.95, mult: 330, daze: 90, bu: 110, heavy: true, shape: 'arc', r: 3.4, arc: 170, kb: 1.0, fx: 'flameRing' }]) },
        chain: { name: 'Chain Attack: Overheated Barrel', anim: 'spin', dur: 1.3, inv: [0, 1.3], bheat: 20, aftershock: true, hits: [{ t: 0.35, mult: 220, daze: 80, bu: 100, shape: 'circle', at: 'self', r: 2.8 }, { t: 0.9, mult: 500, daze: 140, bu: 200, heavy: true, shape: 'line', r: 1.5, len: 9, kb: 1.2, fx: 'fireLine' }] },
        ult: { name: 'Ultimate: Dance With Fire', anim: 'spin', dur: 2.2, inv: [0, 2.2], bheat: 20, aftershock: true, hits: [{ t: 0.45, mult: 420, daze: 100, bu: 150, shape: 'circle', at: 'self', r: 3.0 }].concat([1.0, 1.2, 1.4, 1.6].map(t => ({ t, mult: 260, daze: 60, bu: 120, shape: 'line', r: 1.6, len: 11 }))).concat([{ t: 1.9, mult: 1000, daze: 240, bu: 400, heavy: true, shape: 'line', r: 2.0, len: 12, kb: 1.6, fx: 'fireLine' }]) },
        assist: { name: 'Defensive Assist: Blazing Gunblade', type: 'defensive', anim: 'guard', dur: 0.45, inv: [0, 0.45], daze: 400 },
        followup: { name: 'Assist Follow-Up: Boiling Pierce', anim: 'thrust', dur: 1.0, inv: [0, 0.95], move: [0, 0.25, 1.8], hits: [{ t: 0.25, mult: 150, daze: 60, bu: 60 }, { t: 0.45, mult: 150, daze: 60, bu: 60 }, { t: 0.75, mult: 290, daze: 100, bu: 100, heavy: true, shape: 'line', r: 1.4, len: 6, kb: 1.0, fx: 'fireLine' }] },
        quick: { name: 'Quick Assist: Searing Slash', anim: 'sweep', dur: 0.7, inv: [0, 0.6], move: [0, 0.25, 2.4], hits: [{ t: 0.2, mult: 120, daze: 60, bu: 50, attr: 'physical' }, { t: 0.4, mult: 150, daze: 70, bu: 60, shape: 'arc', r: 2.6, arc: 160 }] },
        // Magus off the field (data for battle.js)
        corrosive: { name: 'Special Attack: Corrosive Flash', mult: 95, bu: 40, every: 5, bheat: 20 },
      },
    },

    remielle: {
      id: 'remielle', name: 'Remielle Dan', short: 'Remielle', faction: 'Covenant of Dayat', spec: 'Anomaly', attr: 'lumiflux', rank: 'S',
      color: '#ff8aa8', color2: '#b8a4e8', assist: 'defensive', stance: 'dancer',
      blurb: 'A first-generation Void Hunter of the Covenant of Dayat, and the first Lumiflux Agent: her light takes on the attribute of whoever stands next to her in the squad. Her Lumiflux Buildup lets a teammate\'s Anomaly Refringe into a bigger blast, and from the wings, in Phase Flow, she keeps the light falling.',
      stats: { hp: 8100, atk: 2900, def: 640, impact: 86, ap: 380, am: 155, cr: 0.1, cd: 0.5, er: 1.4, speed: 4.8 },
      ai: { range: 2.0, dodge: 0.8, reflex: 0.62, aggr: 1.0 },
      energyMax: 120, resource: 'radiance',
      core: [
        ['Attribute Flux', 'Lumiflux takes on the attribute of the next Agent in the squad: her DMG and Anomaly Buildup are that attribute. Her 4th Basic hit, EX Special and Chain Attack also leave Lumiflux Buildup on the enemy.'],
        ['Core Passive: Temporal Patterns = Stilled Colors', 'When a teammate triggers an Attribute Anomaly on an enemy carrying Lumiflux Buildup, it Refringes: the Anomaly hits much harder (scaling with her Anomaly Proficiency), and she stores a Voidflare (up to 3). Hold Basic for Rainbow\'s End (Fleeting Grace in Luminous Reflection) and her Ultimate: each triggers Luminize, Anomaly DMG from every stored Voidflare.'],
        ['Phase Flow', 'Basic Attacks build Floating Radiance (max 120). Swapped out with it full, she enters Phase Flow: off the field, light keeps falling on the target (Lumiflux Buildup), and the squad deals 10% more DMG while it lasts. When the Radiance runs dry (or after 3 Refringes) her next swap-in is Assist: Flower & Feather Dance: a big area hit, Luminize, and +3 s on a Stun.'],
        ['Additional Ability: Invitation to Bloom', 'For each other Anomaly Agent in the squad, the squad gains ATK on entering battle (6% / 12% / 40% of hers with 1 / 2 / 3 Anomaly Agents).'],
      ],
      kit: {
        basic: [
          { name: 'Basic Attack: Leap', anim: 'slashR', dur: 0.46, cancel: 0.33, reach: 2.0, range: 1.8, move: [0, 0.18, 0.8], radiance: 8, hits: [{ t: 0.18, mult: 48, daze: 30, bu: 44, shape: 'arc', r: 2.4, arc: 150 }] },
          { name: 'Basic Attack: Leap', anim: 'slashL', dur: 0.46, cancel: 0.33, reach: 2.0, range: 1.8, move: [0, 0.16, 0.6], radiance: 8, hits: [{ t: 0.16, mult: 52, daze: 34, bu: 48 }] },
          { name: 'Basic Attack: Leap', anim: 'spin', dur: 0.6, cancel: 0.45, reach: 2.1, range: 1.8, radiance: 10, hits: [{ t: 0.24, mult: 66, daze: 40, bu: 62, shape: 'circle', at: 'self', r: 2.4 }] },
          { name: 'Basic Attack: Leap', anim: 'slamDown', dur: 0.75, cancel: 0.6, reach: 2.1, range: 1.8, move: [0, 0.3, 0.6], radiance: 14, hits: [{ t: 0.32, mult: 118, daze: 70, bu: 110, heavy: true, lumi: 1, shape: 'circle', at: 'front', r: 2.2, kb: 0.6 }] },
        ],
        rainbow: { name: 'Basic Attack: Rainbow\'s End', anim: 'sing', dur: 1.3, cancel: 1.2, reach: 3.0, range: 2.4, dr: 0.4, radiance: 60, luminize: 1.05, consumeFlare: true, hits: [{ t: 0.75, mult: 380, daze: 150, bu: 300, heavy: true, shape: 'circle', at: 'front', r: 3.6, kb: 1.0 }] },
        fleeting: { name: 'Basic Attack: Fleeting Grace', anim: 'sing', dur: 1.35, cancel: 1.25, reach: 3.0, range: 2.4, inv: [0.3, 1.0], radiance: 60, luminize: 2.1, consumeFlare: true, hits: [{ t: 0.4, mult: 200, daze: 80, bu: 160, shape: 'circle', at: 'front', r: 3.4 }, { t: 0.8, mult: 460, daze: 180, bu: 360, heavy: true, shape: 'circle', at: 'front', r: 3.8, kb: 1.2 }] },
        dash: { name: 'Dash Attack: Keen Light', anim: 'thrust', dur: 0.55, cancel: 0.42, reach: 7, move: [0, 0.25, 4], hits: [{ t: 0.25, mult: 80, daze: 45, bu: 70 }] },
        counter: { name: 'Dodge Counter: Mirrored Shadow', anim: 'slashL', dur: 0.62, cancel: 0.46, inv: [0, 0.55], move: [0, 0.15, 1.6], hits: [{ t: 0.18, mult: 170, daze: 75, bu: 190, heavy: true, kb: 0.8, shape: 'arc', r: 2.6, arc: 170 }] },
        special: { name: 'Special Attack: Sliver of Light', anim: 'point', dur: 0.7, cancel: 0.55, reach: 6, range: 3, cd: 3.5, dr: 0.4, hits: [{ t: 0.32, mult: 140, daze: 70, bu: 150, heavy: true, shape: 'proj', speed: 18, r: 1.4, kb: 0.6, fx: 'lightLance' }] },
        ex: { name: 'EX Special Attack: Ode to Dawn', anim: 'sing', dur: 1.15, cancel: 1.0, cost: 40, reach: 2.8, range: 2.2, inv: [0, 1.0], radiance: 20, hits: [{ t: 0.4, mult: 200, daze: 80, bu: 260 }, { t: 0.85, mult: 330, daze: 120, bu: 380, heavy: true, lumi: 2, shape: 'circle', at: 'front', r: 3.6, kb: 0.9 }] },
        ffd: { name: 'Assist: Flower & Feather Dance', anim: 'ultAria', dur: 1.5, inv: [0, 1.5], luminize: 2.1, stunExtend: 3, reflection: true, hits: [{ t: 0.55, mult: 360, daze: 140, bu: 300, shape: 'circle', at: 'self', r: 3.6 }, { t: 1.0, mult: 620, daze: 220, bu: 480, heavy: true, shape: 'circle', at: 'self', r: 4.2, kb: 1.2 }] },
        chain: { name: 'Chain Attack: Interwoven Dance Steps', anim: 'exAria', dur: 1.3, inv: [0, 1.3], reflection: true, hits: [{ t: 0.3, mult: 170, daze: 60, bu: 240 }, { t: 0.6, mult: 190, daze: 60, bu: 260, shape: 'circle', at: 'target', r: 3.0 }, { t: 0.95, mult: 300, daze: 120, bu: 480, heavy: true, lumi: 2, shape: 'circle', at: 'target', r: 3.4, kb: 1 }] },
        ult: { name: 'Ultimate: Dazzling Curtain Call', anim: 'ultAria', dur: 2.2, inv: [0, 2.2], luminize: 2.205, hits: [0.7, 0.9, 1.1].map(t => ({ t, mult: 260, daze: 70, bu: 320, shape: 'circle', at: 'target', r: 3.6 })).concat([{ t: 1.6, mult: 960, daze: 210, bu: 900, heavy: true, shape: 'circle', at: 'target', r: 5, kb: 1.4 }]) },
        assist: { name: 'Defensive Assist: Fleeting Light', type: 'defensive', anim: 'guardStick', dur: 0.45, inv: [0, 0.45], daze: 400 },
        followup: { name: 'Assist Follow-Up: Awakening Glimmer', anim: 'slashR', dur: 1.0, inv: [0, 0.95], move: [0, 0.2, 1.4], hits: [0.25, 0.45].map(t => ({ t, mult: 120, daze: 50, bu: 160, shape: 'arc', r: 2.6, arc: 170 })).concat([{ t: 0.7, mult: 230, daze: 90, bu: 280, heavy: true, shape: 'circle', at: 'target', r: 2.6, kb: 0.8 }]) },
        quick: { name: 'Quick Assist: Featherglow Rebirth', anim: 'slashL', dur: 0.65, inv: [0, 0.6], move: [0, 0.25, 2.5], hits: [{ t: 0.25, mult: 190, daze: 70, bu: 230, kb: 0.8, shape: 'arc', r: 2.6, arc: 160 }] },
        // her light in Phase Flow, off the field (data for battle.js)
        phase: { name: 'Phase Flow', mult: 90, daze: 40, bu: 120, every: 1.6, drain: 9, dmgUp: 0.1 },
      },
    },
  };

  /* ------------------------------------------------------------ ENEMIES --
     Real Zenless Zone Zero enemies (names, tiers, weaknesses and resistances
     from the official game). rank: minion | elite | boss.
     poise: 0 = any heavy hit staggers, 1 = only heavy hits while winding up,
     2 = only anomalies, parries and Stun interrupt.
     ai.style: how it moves between attacks (melee, ranged, boxer, stalker,
     float); keep: the distance it likes; flee: how close before a ranged
     enemy backs off; hover: floats this high; retreat [min,max]: every so
     many seconds it backs off (to charge or leap in from range).
     Each attack's pose, footwork and effects live in enemy-moves.js. Attack
     fields used by the battle: reach / minReach (it only starts the move in
     this distance band), ph (only in that boss phase), track (aims until this
     moment; 0 = locks on at the start), retrack (re-aims between combo hits),
     armor [t0,t1] (cannot be staggered then), breakable [t0,t1] (a high-level
     skill then interrupts it), stance [t0,t1] + counter (hitting it then
     triggers the counter), opening [t0,t1] (a high-level skill then deals
     bonus Daze), crash (a charge that can hit a wall).
     Hit fields: shape arc | circle (at self, front, or ahead by d) | line (a
     charge, checked along its path) | beam (from the enemy along its aim, yaw
     offset, len) | proj | rain (n points: the first on the Agent, the rest
     within spread; lob = seconds the bottle flies). flash gold = Defensive
     Assist / parry; red = dodge only. chainParry: one of several gold flashes
     in a row (parry two or more for a special stagger), freeAssist: the
     Defensive Assist costs no Assist Points, parryDaze: a parry adds this
     share of the Daze bar, expose: a parry exposes a weakness. */
  const E = (o) => Object.assign({ rank: 'minion', poise: 0, weak: [], resist: [], speed: 2.4, range: 1.5, daze: 1000, stunDur: 3, buMax: 900, atkGap: [1.2, 2.6], ai: { style: 'melee' }, stance: 'brute' }, o);
  const ENEMIES = {
    // Outer Ring: Hollow Thugs, and the Corrupted Overlord the Sons of Calydon fought
    raider: E({ name: 'Hollow Thug - Raider', faction: 'Thugs', model: 'raider', hp: 185000, atk: 1140, def: 620, speed: 2.7, weak: ['ice', 'physical'],
      ai: { style: 'melee', retreat: [6, 10] },
      info: 'Charges in from a long way off with an electro-shock baton. A charge can end against a wall or a barrel: a free opening.',
      attacks: [
        { name: 'Shock Baton Combo', reach: 1.8, cd: 2.4, w: 3, retrack: true, hits: [{ t: 0.42, mult: 65, shape: 'arc', r: 1.9, arc: 120 }, { t: 0.82, mult: 85, shape: 'arc', r: 2.0, arc: 130, fx: 'shock' }] },
        { name: 'Running Charge', reach: 11, minReach: 4.2, cd: 7, w: 3, track: 0.62, rec: 0.6, crash: true, hits: [{ t: 1.05, mult: 150, heavy: true, flash: 'gold', shape: 'line', r: 1.2, len: 8 }] },
        { name: 'Overhead Shock', reach: 1.9, cd: 6, w: 1.2, hits: [{ t: 0.8, mult: 150, heavy: true, shape: 'arc', r: 2.0, arc: 80, fx: 'shock' }] },
      ] }),
    pyromaniac: E({ name: 'Hollow Thug - Pyromaniac', faction: 'Thugs', model: 'pyromaniac', hp: 150000, atk: 1080, def: 560, speed: 2.4, range: 6, weak: ['ice', 'physical'],
      ai: { style: 'ranged', keep: 6, flee: 3 },
      info: 'Hangs back and bombards you with a hail of molotov cocktails. Get in close.',
      attacks: [
        { name: 'Molotov Toss', reach: 9, cd: 2.6, w: 3, rec: 0.5, hits: [{ t: 1.0, mult: 80, shape: 'rain', n: 1, r: 1.4, lob: 0.6, fx: 'molotov' }] },
        { name: 'Molotov Hail', reach: 10, minReach: 2.5, cd: 8, w: 2, rec: 0.4, hits: [0, 1, 2, 3].map(i => ({ t: 1.0 + i * 0.2, mult: 60, shape: 'rain', n: 1, r: 1.4, spread: i ? 2.6 : 0, lob: 0.6, fx: 'molotov' })) },
        { name: 'Torch Swipe', reach: 1.9, cd: 5, w: 1.5, hits: [{ t: 0.7, mult: 130, heavy: true, flash: 'gold', shape: 'arc', r: 2.1, arc: 140, fx: 'fireArc' }] },
      ] }),
    enforcer: E({ name: 'Hollow Thug - Bulky Enforcer', faction: 'Thugs', model: 'enforcer', rank: 'elite', poise: 1, hp: 1010000, atk: 2070, def: 860, speed: 2.6, range: 2.0, daze: 2550, stunDur: 8, buMax: 1500, weak: ['ice', 'physical'], atkGap: [0.5, 1.2],
      ai: { style: 'boxer', keep: 2.2, retreat: [9, 13] }, stance: 'boxer',
      info: 'A boxer in stun-gun gauntlets: two-fist punches and nimble sidesteps.',
      attacks: [
        { name: 'One-Two', reach: 2.1, cd: 2.0, w: 3, retrack: true, hits: [{ t: 0.32, mult: 95, shape: 'arc', r: 2.2, arc: 80 }, { t: 0.62, mult: 125, shape: 'arc', r: 2.4, arc: 80, fx: 'shock' }] },
        { name: 'Weaving Hook', reach: 2.6, cd: 4.5, w: 2.5, track: 0.5, hits: [{ t: 0.72, mult: 185, heavy: true, flash: 'gold', shape: 'arc', r: 2.5, arc: 130, fx: 'shock' }] },
        { name: 'Rising Uppercut', reach: 2.2, cd: 6.5, w: 1.6, retrack: true, hits: [{ t: 0.3, mult: 80, shape: 'arc', r: 2.2, arc: 80 }, { t: 0.55, mult: 80, shape: 'arc', r: 2.2, arc: 80 }, { t: 1.05, mult: 210, heavy: true, launch: true, flash: 'red', shape: 'arc', r: 2.3, arc: 90, fx: 'shock' }] },
        { name: 'Ground Breaker', reach: 2.8, cd: 8, w: 1.4, hits: [{ t: 1.05, mult: 240, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 3.2, fx: 'shockQuake' }] },
        { name: 'Shoulder Charge', reach: 10, minReach: 4, cd: 9, w: 1.2, track: 0.6, hits: [{ t: 1.0, mult: 220, heavy: true, launch: true, flash: 'gold', shape: 'line', r: 1.3, len: 8 }] },
      ] }),
    pompey: E({ name: 'Corrupted Overlord - Pompey', faction: 'Corrupted', model: 'pompey', rank: 'boss', poise: 2, hp: 2900000, atk: 1890, def: 950, speed: 2.6, range: 2.6, daze: 4600, stunDur: 6, buMax: 2200, weak: ['fire'], resist: ['electric'], atkGap: [0.6, 1.3],
      ai: { style: 'melee', retreat: [6, 9] }, stance: 'blade',
      phase2: { at: 0.5, name: 'Rear wheel and longsword' },
      info: 'Phase 1: rides his motorcycle and fires hover guns. Phase 2: alternates his bike\'s rear wheel and his longsword; the wheel stores Ether until it explodes. A Defensive Assist on his marked moves exposes a weakness.',
      attacks: [
        { name: 'Hover Gun Volley', ph: 1, reach: 12, cd: 5, w: 2.5, rec: 0.5, hits: [0.75, 0.87, 0.99, 1.11, 1.23, 1.35].map((t, i) => ({ t, mult: 50, shape: 'proj', speed: 16, from: i % 2 ? 'gunR' : 'gunL', fx: 'etherBolt' })) },
        { name: 'Throttle Ram', ph: 1, reach: 12, minReach: 3.5, cd: 6, w: 2.5, track: 0.68, rec: 0.6, hits: [{ t: 1.1, mult: 230, heavy: true, launch: true, flash: 'gold', expose: true, shape: 'line', r: 1.4, len: 9 }] },
        { name: 'Wheelie Slam', ph: 1, reach: 6, cd: 7, w: 1.6, hits: [{ t: 1.0, mult: 260, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'front', r: 2.6 }] },
        { name: 'Burnout Drift', ph: 1, reach: 3.6, cd: 8, w: 1.5, hits: [{ t: 0.75, mult: 110, shape: 'circle', at: 'self', r: 2.8 }, { t: 1.25, mult: 140, flash: 'gold', shape: 'circle', at: 'self', r: 2.8 }] },
        { name: 'Longsword Combo', ph: 2, reach: 3.0, cd: 3, w: 3, retrack: true, hits: [{ t: 0.45, mult: 120, shape: 'arc', r: 3.2, arc: 140 }, { t: 0.85, mult: 120, shape: 'arc', r: 3.2, arc: 140 }, { t: 1.35, mult: 210, heavy: true, flash: 'gold', expose: true, shape: 'arc', r: 3.4, arc: 100 }] },
        { name: 'Wheel Grind', ph: 2, reach: 3.4, cd: 5, w: 2, ether: 1, hits: [{ t: 0.7, mult: 110, shape: 'arc', r: 3.6, arc: 220 }, { t: 1.05, mult: 150, flash: 'gold', shape: 'arc', r: 3.6, arc: 220 }] },
        { name: 'Wheel Throw', ph: 2, reach: 9, cd: 6, w: 2, ether: 1, track: 0.45, hits: [{ t: 0.8, mult: 120, shape: 'beam', len: 8, r: 1.0 }, { t: 1.5, mult: 140, heavy: true, flash: 'gold', shape: 'beam', len: 8, r: 1.0 }] },
        { name: 'Ether Wheel Burst', ph: 2, reach: 6, cd: 12, w: 0.5, hits: [{ t: 1.8, mult: 340, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 5.2, fx: 'etherBlast' }] },
      ] }),
    // Yunkui Summit: the Miasma
    spawn: E({ name: 'Miasma Spawn', faction: 'Special', model: 'spawn', hp: 145000, atk: 1080, def: 520, speed: 2.8, weak: ['physical', 'ether'],
      info: 'Summons Miasma dust around you that bursts after a delay: move out of it.',
      attacks: [
        { name: 'Axe Chop', reach: 1.7, cd: 2.2, w: 3, hits: [{ t: 0.55, mult: 90, shape: 'arc', r: 1.9, arc: 110 }] },
        { name: 'Miasma Dust', reach: 9, cd: 8, w: 2, rec: 0.3, hits: [{ t: 2.0, mult: 110, heavy: true, shape: 'rain', n: 3, r: 1.5, spread: 2.4, fx: 'miasmaBurst', zone: true }] },
        { name: 'Lantern Lunge', reach: 2.6, cd: 5, w: 1.4, hits: [{ t: 0.85, mult: 150, heavy: true, flash: 'gold', shape: 'circle', at: 'front', r: 1.6 }] },
      ] }),
    arcavor: E({ name: 'Miasma Walker - Arcavor', faction: 'Ether Mutants', model: 'arcavor', hp: 175000, atk: 1140, def: 600, speed: 3.2, range: 5, weak: ['physical', 'ether'],
      ai: { style: 'ranged', keep: 5, flee: 2.2 },
      info: 'Keeps up a stream of long-range fire, and twirls in on ballet-like legs.',
      attacks: [
        { name: 'Miasma Barrage', reach: 10, cd: 4, w: 3, rec: 0.4, hits: [0.55, 0.7, 0.85, 1.0, 1.15, 1.3].map(t => ({ t, mult: 32, shape: 'proj', speed: 15, fx: 'miasmaBolt' })) },
        { name: 'Pirouette', reach: 5, cd: 5.5, w: 2, hits: [{ t: 0.6, mult: 55, shape: 'circle', at: 'self', r: 2.0 }, { t: 0.85, mult: 55, shape: 'circle', at: 'self', r: 2.0 }, { t: 1.15, mult: 100, heavy: true, flash: 'gold', shape: 'circle', at: 'self', r: 2.2 }] },
        { name: 'Shard Rake', reach: 1.9, cd: 3.5, w: 1.5, retrack: true, hits: [{ t: 0.45, mult: 70, shape: 'arc', r: 2.0, arc: 120 }, { t: 0.85, mult: 110, shape: 'arc', r: 2.1, arc: 120 }] },
      ] }),
    huskron: E({ name: 'Miasma Ravager - Huskron', faction: 'Corrupted', model: 'huskron', rank: 'elite', poise: 1, hp: 1060000, atk: 2110, def: 900, speed: 3.6, range: 2.2, daze: 2700, stunDur: 8, buMax: 1500, weak: ['ice', 'fire'], atkGap: [0.5, 1.2],
      ai: { style: 'stalker', keep: 3.6 },
      info: 'Circles warily, then a vicious assault. Strike it in its bristling guard and it counters: a Defensive Assist on that counter leaves it reeling.',
      attacks: [
        { name: 'Ravaging Assault', reach: 2.4, cd: 4, w: 3, retrack: true, hits: [{ t: 0.35, mult: 80, shape: 'arc', r: 2.3, arc: 100 }, { t: 0.6, mult: 80, shape: 'arc', r: 2.3, arc: 100 }, { t: 0.85, mult: 90, shape: 'arc', r: 2.3, arc: 110 }, { t: 1.3, mult: 180, heavy: true, flash: 'gold', shape: 'arc', r: 2.5, arc: 100 }] },
        { name: 'Bristle Guard', reach: 4.5, cd: 8, w: 2, rec: 0.3, stance: [0.15, 2.0], counter: 'Spine Counter', hits: [{ t: 2.1, mult: 120, shape: 'circle', at: 'self', r: 2.4 }] },
        { name: 'Spine Counter', counterOnly: true, reach: 6, cd: 0, w: 0, hits: [{ t: 0.5, mult: 220, heavy: true, flash: 'gold', parryDaze: 0.35, shape: 'arc', r: 2.6, arc: 120 }] },
        { name: 'Ravaging Leap', reach: 8, minReach: 3, cd: 8, w: 1.5, hits: [{ t: 1.05, mult: 240, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'front', r: 2.2 }] },
        { name: 'Tail Sweep', reach: 2.6, cd: 5, w: 1.5, hits: [{ t: 0.6, mult: 150, shape: 'circle', at: 'self', r: 2.8 }] },
        { name: 'Miasma Howl', reach: 3.6, cd: 10, w: 1, hits: [{ t: 1.1, mult: 200, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 3.8 }] },
      ] }),
    priest: E({ name: 'Miasma Priest', faction: 'Ether Mutants', model: 'priest', rank: 'boss', poise: 2, hp: 3000000, atk: 1830, def: 920, speed: 2.0, range: 3, daze: 4750, stunDur: 6, buMax: 2300, weak: ['ether'], resist: ['ice'], atkGap: [0.6, 1.4],
      ai: { style: 'float', keep: 3.4, hover: 0.45 }, stance: 'priest',
      phase2: { at: 0.5, name: 'Coral Bloom', haste: 1.15 },
      info: 'Glides on Miasma and changes phase with special skills. Her Ribbon Flurry flashes gold three times: Defensive Assists on it cost no Assist Points, and parrying two or more staggers her.',
      attacks: [
        { name: 'Coral Palm', reach: 3.2, cd: 3, w: 3, hits: [{ t: 0.95, mult: 210, heavy: true, flash: 'gold', shape: 'circle', at: 'front', r: 2.4 }] },
        { name: 'Ribbon Sweep', reach: 3.4, cd: 5, w: 2, hits: [{ t: 0.8, mult: 165, flash: 'gold', shape: 'arc', r: 3.8, arc: 200, fx: 'ribbon' }] },
        { name: 'Ribbon Flurry', reach: 3.6, cd: 9, w: 2, retrack: true, hits: [0.7, 1.15, 1.6].map((t, i) => ({ t, mult: 120 + i * 30, heavy: i === 2, flash: 'gold', chainParry: true, freeAssist: true, shape: 'arc', r: 3.6, arc: 160, fx: 'ribbon' })) },
        { name: 'Miasma Talismans', reach: 12, cd: 6, w: 2, rec: 0.5, hits: [0.8, 0.95, 1.1, 1.25, 1.4].map(t => ({ t, mult: 70, shape: 'proj', speed: 11, fx: 'talisman' })) },
        { name: 'Bloom of Rot', reach: 5, cd: 10, w: 1.4, hits: [{ t: 1.2, mult: 310, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 5, fx: 'miasmaBurst' }] },
        { name: 'Miasma Rain', reach: 14, cd: 13, w: 1.2, rec: 0.5, hits: [{ t: 1.6, mult: 190, heavy: true, flash: 'red', shape: 'rain', n: 5, r: 1.6, spread: 3.5, fx: 'miasmaBurst' }] },
        { name: 'Coral Spires', ph: 2, reach: 9, cd: 6, w: 2.5, track: 0, hits: [2, 3.4, 4.8, 6.2, 7.6].map((d, i) => ({ t: 0.9 + i * 0.14, mult: 90, heavy: i === 4, flash: i === 0 ? 'red' : null, shape: 'circle', at: 'ahead', d, r: 1.3, fx: 'coralSpike' })) },
      ] }),
    // The Hollow: Ethereals
    faun: E({ name: 'Faun', faction: 'Ether Mutants', model: 'faun', hp: 190000, atk: 1170, def: 620, speed: 2.6, range: 1.8, weak: ['ice', 'ether'], stance: 'hulk',
      info: 'Comes in groups. Its charged signpost slam is hard to interrupt: get out of the way.',
      attacks: [
        { name: 'Signpost Swing', reach: 2.0, cd: 2.6, w: 3, retrack: true, hits: [{ t: 0.55, mult: 85, shape: 'arc', r: 2.3, arc: 130 }, { t: 0.95, mult: 95, shape: 'arc', r: 2.3, arc: 130 }] },
        { name: 'Charged Slam', reach: 2.6, cd: 6, w: 2, armor: [0, 1.55], hits: [{ t: 1.5, mult: 200, heavy: true, flash: 'gold', shape: 'arc', r: 2.8, arc: 70, fx: 'quakeLine' }] },
        { name: 'Leaping Smash', reach: 6, minReach: 2.5, cd: 6, w: 1.5, hits: [{ t: 0.85, mult: 160, heavy: true, shape: 'circle', at: 'front', r: 1.9 }] },
      ] }),
    specter: E({ name: 'Specter', faction: 'Ether Mutants', model: 'specter', hp: 160000, atk: 1140, def: 560, speed: 3.4, range: 4.5, weak: ['ice', 'ether'],
      ai: { style: 'ranged', keep: 4.5, flee: 2, hover: 0.25 }, stance: 'blade',
      info: 'Fires rapid bursts of concentrated Ether from range, and blinks in to cut.',
      attacks: [
        { name: 'Ether Burst', reach: 10, cd: 3.5, w: 3, rec: 0.4, hits: [0.5, 0.6, 0.7, 1.05, 1.15, 1.25].map(t => ({ t, mult: 30, shape: 'proj', speed: 19, fx: 'etherBolt' })) },
        { name: 'Blade Arm', reach: 1.9, cd: 2.0, w: 2, hits: [{ t: 0.4, mult: 90, shape: 'arc', r: 2.1, arc: 110 }] },
        { name: 'Phantom Lunge', reach: 7, cd: 6, w: 1.5, hits: [{ t: 0.75, mult: 160, heavy: true, flash: 'gold', shape: 'arc', r: 2.0, arc: 110 }] },
      ] }),
    dullahan: E({ name: 'Dullahan', faction: 'Ether Mutants', model: 'dullahan', rank: 'elite', poise: 1, hp: 1040000, atk: 2140, def: 900, speed: 2.8, range: 2.2, daze: 2650, stunDur: 8, buMax: 1500, weak: ['ice', 'ether'], atkGap: [0.5, 1.2],
      ai: { style: 'melee' }, stance: 'blade',
      info: 'Charges up its longsword for a high-level stab. Hit it with a high-level skill (EX Special, Chain, Ultimate) while it charges to break it.',
      attacks: [
        { name: 'Shard Sword Combo', reach: 2.4, cd: 3.5, w: 3, retrack: true, hits: [{ t: 0.45, mult: 100, shape: 'arc', r: 2.6, arc: 140 }, { t: 0.85, mult: 100, shape: 'arc', r: 2.6, arc: 140 }, { t: 1.35, mult: 180, heavy: true, flash: 'gold', shape: 'arc', r: 2.8, arc: 120 }] },
        { name: 'Charged Thrust', reach: 8, cd: 8, w: 2.2, track: 1.35, breakable: [0.2, 1.4], rec: 0.7, hits: [{ t: 1.65, mult: 240, heavy: true, launch: true, flash: 'red', shape: 'line', r: 1.2, len: 6 }] },
        { name: 'Whirlwind', reach: 2.6, cd: 7, w: 1.6, hits: [{ t: 0.6, mult: 90, shape: 'circle', at: 'self', r: 3.0 }, { t: 0.95, mult: 160, heavy: true, flash: 'gold', shape: 'circle', at: 'self', r: 3.0 }] },
        { name: 'Rising Cleave', reach: 2.4, cd: 6, w: 1.5, hits: [{ t: 0.7, mult: 170, heavy: true, launch: true, shape: 'arc', r: 2.5, arc: 90 }] },
      ] }),
    butcher: E({ name: 'Notorious - Dead End Butcher', faction: 'Ether Mutants', model: 'butcher', rank: 'boss', poise: 2, hp: 3100000, atk: 1950, def: 950, speed: 2.3, range: 2.8, daze: 4950, stunDur: 6, buMax: 2300, weak: ['ice', 'ether'], atkGap: [0.5, 1.2], cancelsFollowUp: true,
      ai: { style: 'melee', retreat: [10, 14] }, stance: 'hulk',
      phase2: { at: 0.5, name: 'Flurries and Ether lasers' },
      info: 'Varied combos; a high-level skill right after one staggers it hard. Phase 2 adds punch flurries and a sweeping Ether laser. It can turn Ether Enhanced (more ATK) until you Daze it enough.',
      attacks: [
        { name: 'Pummel', reach: 3, cd: 3.2, w: 3, retrack: true, opening: [1.4, 2.15], rec: 0.9, hits: [{ t: 0.45, mult: 90, shape: 'arc', r: 3.0, arc: 140 }, { t: 0.75, mult: 90, shape: 'arc', r: 3.0, arc: 140 }, { t: 1.25, mult: 190, heavy: true, flash: 'gold', shape: 'arc', r: 3.2, arc: 140 }] },
        { name: 'Dead End Hammer', reach: 3.4, cd: 6, w: 2, hits: [{ t: 1.0, mult: 280, heavy: true, launch: true, flash: 'red', shape: 'arc', r: 4.0, arc: 80, fx: 'quakeLine' }] },
        { name: 'Crushing Leap', reach: 10, minReach: 3.5, cd: 9, w: 1.4, hits: [{ t: 1.25, mult: 300, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'front', r: 3.0 }] },
        { name: 'Backhand Sweep', reach: 3.4, cd: 5, w: 2, hits: [{ t: 0.8, mult: 180, flash: 'gold', shape: 'arc', r: 4.0, arc: 220 }] },
        { name: 'Ether Rupture', reach: 14, cd: 13, w: 1.1, rec: 0.5, hits: [{ t: 1.6, mult: 200, heavy: true, flash: 'red', shape: 'rain', n: 5, r: 1.6, spread: 3.5, fx: 'etherBurst' }] },
        { name: 'Flurry', ph: 2, reach: 3, cd: 4.5, w: 3, retrack: true, opening: [1.8, 2.5], rec: 0.9, hits: [0.4, 0.55, 0.7, 0.85, 1.0, 1.15].map(t => ({ t, mult: 55, shape: 'arc', r: 3.0, arc: 120 })).concat([{ t: 1.6, mult: 200, heavy: true, flash: 'gold', shape: 'arc', r: 3.2, arc: 140 }]) },
        { name: 'Ether Laser', ph: 2, reach: 12, cd: 9, w: 2, track: 0.9, rec: 0.6, sweep: [-0.6, 0.6], hits: [-0.6, -0.3, 0, 0.3, 0.6].map((yaw, i) => ({ t: 1.1 + i * 0.18, mult: 70, heavy: i === 2, flash: i === 0 ? 'red' : null, shape: 'beam', yaw, len: 12, r: 0.8 })) },
        { name: 'Ether Enhance', reach: 30, cd: 6, w: 4, enhance: true, hits: [{ t: 1.0, mult: 120, heavy: true, shape: 'circle', at: 'self', r: 3.4, fx: 'etherBlast' }] },
      ] }),
  };

  /* ---------------------------------------------------------- ENCOUNTERS -- */
  const ENCOUNTERS = {
    outer: {
      patrol: { name: 'Hollow Thug Raid', waves: [['raider', 'raider', 'pyromaniac'], ['raider', 'pyromaniac', 'raider', 'pyromaniac']] },
      elite: { name: 'Bulky Enforcer', waves: [['raider', 'pyromaniac'], ['enforcer', 'raider']] },
      boss: { name: 'Corrupted Overlord - Pompey', waves: [['pompey']], adds: { at: 0.5, ids: ['raider', 'pyromaniac'] } },
    },
    summit: {
      patrol: { name: 'Miasma Incursion', waves: [['spawn', 'arcavor', 'spawn'], ['arcavor', 'spawn', 'arcavor', 'spawn']] },
      elite: { name: 'Miasma Ravager', waves: [['spawn', 'arcavor'], ['huskron', 'spawn']] },
      boss: { name: 'Miasma Priest', waves: [['priest']], adds: { at: 0.5, ids: ['spawn', 'arcavor'] } },
    },
    stage: {
      patrol: { name: 'Ethereal Swarm', waves: [['faun', 'specter', 'faun'], ['specter', 'faun', 'specter', 'faun']] },
      elite: { name: 'The Headless Encore', waves: [['faun', 'specter'], ['dullahan', 'specter']] },
      boss: { name: 'Notorious - Dead End Butcher', waves: [['butcher']], adds: { at: 0.5, ids: ['faun', 'specter'] } },
    },
  };

  /* --------------------------------------------------------- PROXY CLASH --
     The five ways to fight a rival Proxy. Tag Team: one Agent per side on the
     field at a time, the rest swap in (assists, Chain Attacks, Quick Assists as
     in the Hollow). All-Out: every Agent of both squads on the field at once;
     you lead one (move her, call her EX and Ultimate) and the rest fight on their
     own, and a Swap on a flash sends a teammate dashing in to help whoever it is
     aimed at. hp: how much deeper both squads' HP runs in that mode (on top of
     the Battle Lab's Agent HP in Proxy Clash). */
  const CLASH_MODES = {
    duel: { id: 'duel', size: 1, allOut: false, name: '1v1', title: 'DUEL', hp: 1.2, sub: 'One Agent each. No swaps, no assists: just the two of them.' },
    tag2: { id: 'tag2', size: 2, allOut: false, name: '2v2', title: 'TAG TEAM', hp: 1.0, sub: 'One on the field at a time: swap, assist, chain.' },
    all2: { id: 'all2', size: 2, allOut: true, name: '2v2', title: 'ALL-OUT', hp: 3.0, sub: 'Both of yours against both of theirs, all at once.' },
    tag3: { id: 'tag3', size: 3, allOut: false, name: '3v3', title: 'TAG TEAM', hp: 1.0, sub: 'One on the field at a time: swap, assist, chain.' },
    all3: { id: 'all3', size: 3, allOut: true, name: '3v3', title: 'ALL-OUT', hp: 4.2, sub: 'All six Agents on the field at once.' },
  };

  /* ------------------------------------------------------- the rival Proxies --
     Rival Proxies (this game's own characters, not from the official game) who
     command a squad of Agents against yours. reflex and dodge scale how well
     their Agents dodge (as the Battle Lab's Perfect Dodge skill does yours);
     react [min,max] is the breather between their moves; assist is the chance a
     teammate swaps in to parry one of your heavy hits (it costs them an Assist
     Point; assistStart is how many they begin with); ult how readily they fire
     an Ultimate; dbRate the Decibels their on-field Agent builds each second on top
     of what her hits earn; escape the chance they swap a Stunned Agent out before
     your Chain Attacks (Tag Team; you can do the same); dmg, by mode, scales their
     Agents' damage: it runs above 1 because yours carry buffs, Anomalies and
     Disorders, Abloom, Afterburn and the Aegis that theirs do not (the more of
     your Agents fight, the more of those); hp scales their HP; swap [min,max]
     seconds between their rotations. Calibrated with tools/clash-test.js against
     a squad on AUTO. */
  const RIVALS = {
    patch: { id: 'patch', name: 'Patch', tier: 'Rookie', color: '#5ac8ff', line: 'Easy: still learning the ropes',
      blurb: 'Two weeks into the Proxy business, out of Brant Street. Slow on the swap and easy to read, though the Agents hit just as hard whoever gives the orders.',
      reflex: 0.4, dodge: 0.5, react: [0.3, 0.6], assist: 0.12, ult: 0.35, dbRate: 15, escape: 0, hp: 0.9, swap: [16, 24], assistStart: 2,
      dmg: { duel: 2.0, tag2: 3.0, all2: 3.0, tag3: 4.0, all3: 4.0 },
      hello: 'U-um, hi! I just got my Proxy license. Go easy on me?', win: 'I... I won? I WON! Wait till I tell the forums!', lose: 'Okay. Okay! Next time I\'m reading the manual first.' },
    vesper: { id: 'vesper', name: 'Vesper', tier: 'Ace', color: '#b08cff', line: 'A fair fight',
      blurb: 'A freelancer with a spotless record on the Inter-Knot. Methodical: rotates on a schedule, saves her Assists for your big hits, and fires Ultimates when they count.',
      reflex: 0.75, dodge: 0.8, react: [0.12, 0.32], assist: 0.3, ult: 0.75, dbRate: 25, escape: 0.3, hp: 1.0, swap: [11, 17], assistStart: 3,
      dmg: { duel: 3.0, tag2: 5.8, all2: 5.0, tag3: 7.2, all3: 8.0 },
      hello: 'Random Play\'s Proxy. I\'ve seen your work. Let\'s see it up close.', win: 'Clean. Watch the replay: you dropped your guard after every Chain.', lose: 'Well played. My record needed a blemish anyway.' },
    mirage: { id: 'mirage', name: 'Mirage', tier: 'Legend', color: '#ff4a5a', line: 'Very hard: reads your every move',
      blurb: 'Signs every job "Phaethon". Nobody has seen their face, and their Agents move like they can read yours: near-perfect dodges, and a parry waiting for every heavy hit.',
      reflex: 1.0, dodge: 1.0, react: [0.05, 0.18], assist: 0.5, ult: 1.0, dbRate: 35, escape: 0.55, hp: 1.1, swap: [9, 14], assistStart: 4,
      dmg: { duel: 3.6, tag2: 6.4, all2: 5.9, tag3: 7.0, all3: 6.0 },
      hello: 'They call you Phaethon? Funny. They call me that too.', win: 'There\'s only room for one legend on Sixth Street.', lose: '...Impressive. Maybe the name does suit you.' },
  };

  /* ---------------------------------------------------- BATTLE LAB TUNING --
     Every knob the Battle Lab panel exposes. Saved per browser. */
  const TUNING_DEFS = [
    { group: 'Commands' },
    { key: 'auto', label: 'AUTO: the game moves your Agent and gives your commands', type: 'bool', def: false, help: 'On: she moves on her own, and Swaps, Assists, Chain picks, EX calls and Ultimates are made for you. Off: you move her (arrow keys, or drag on a phone) and give the commands; she still fights on her own. Also on the battle screen (the AUTO button, or T).' },
    { key: 'autoUlt', label: 'Agents fire Ultimates on their own', type: 'bool', def: false, help: 'Off: you call Ultimates (R) when an Agent\'s Decibels hit MAXIMUM.' },
    { key: 'autoChain', label: 'Auto-pick a Chain Attack when the timer runs out', type: 'bool', def: true },
    { key: 'chainWindow', label: 'Chain Attack choice window (s)', type: 'range', min: 1, max: 6, step: 0.5, def: 3 },
    { key: 'chainSlow', label: 'Time speed during the Chain choice', type: 'range', min: 0, max: 0.5, step: 0.05, def: 0.08, help: '0 freezes the battle while you choose.' },
    { key: 'swapCd', label: 'Swap cooldown (s)', type: 'range', min: 0, max: 5, step: 0.25, def: 0.75 },
    { key: 'tacticsFreeze', label: 'Tactics menu stops time', type: 'bool', def: true },
    { group: 'Agents' },
    { key: 'reflex', label: 'Agent Perfect Dodge skill', type: 'range', min: 0.2, max: 1.6, step: 0.05, def: 0.8 },
    { key: 'dodgeCd', label: 'Dodge cooldown after 2 dodges (s)', type: 'range', min: 0.5, max: 6, step: 0.25, def: 2.2 },
    { key: 'perfectWin', label: 'Perfect Dodge window (s)', type: 'range', min: 0.08, max: 0.4, step: 0.02, def: 0.2 },
    { key: 'energyRate', label: 'Energy / Adrenaline gain', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { key: 'decibelRate', label: 'Decibel gain', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { key: 'agentDmg', label: 'Agent damage', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { group: 'Enemies' },
    { key: 'enemyHp', label: 'Enemy HP', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { key: 'enemyDmg', label: 'Enemy damage', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { key: 'aggro', label: 'Enemy aggression', type: 'range', min: 0.4, max: 2, step: 0.05, def: 1 },
    { key: 'flashLead', label: 'Flash warning time (s)', type: 'range', min: 0.25, max: 1.0, step: 0.05, def: 0.6 },
    { key: 'dazeRate', label: 'Daze build-up', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { key: 'anomalyRate', label: 'Anomaly build-up', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { key: 'hazards', label: 'Arena hazards', type: 'bool', def: true },
    { group: 'Proxy Clash' },
    { key: 'clashHp', label: 'Agent HP in Proxy Clash (× her HP)', type: 'range', min: 3, max: 30, step: 1, def: 18, help: 'Agents hit each other far harder than enemies hit them, so in a Proxy Clash both squads get this much more HP.' },
    { key: 'rivalDmg', label: 'Rival Agent damage', type: 'range', min: 0.25, max: 3, step: 0.05, def: 1 },
    { group: 'Presentation' },
    { key: 'speed', label: 'Game speed', type: 'range', min: 0.5, max: 1.5, step: 0.05, def: 1 },
    { key: 'calmCam', label: 'Steady camera (no push-ins)', type: 'bool', def: false },
    { key: 'cutins', label: 'Ultimate cut-ins', type: 'bool', def: true },
    { key: 'dmgNumbers', label: 'Damage numbers', type: 'bool', def: true },
    { key: 'showLog', label: 'Battle log', type: 'bool', def: true },
    { key: 'volume', label: 'Sound volume', type: 'range', min: 0, max: 1, step: 0.05, def: 0.6 },
  ];
  const TUNING_DEFAULTS = {}; for (const d of TUNING_DEFS) if (d.key) TUNING_DEFAULTS[d.key] = d.def;

  window.DATA = { RULES, ATTR, ANOMALY, SPEC, AGENTS, ENEMIES, ENCOUNTERS, CLASH_MODES, RIVALS, TUNING_DEFS, TUNING_DEFAULTS };
})();
