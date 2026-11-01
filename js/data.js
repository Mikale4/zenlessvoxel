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
  };

  /* ------------------------------------------------------------ ENEMIES --
     Real Zenless Zone Zero enemies (names, tiers, weaknesses and resistances
     from the official game). rank: minion | elite | boss.
     poise: 0 = any hit staggers, 1 = only heavy hits, 2 = only anomalies,
     parries and Stun interrupt. */
  const E = (o) => Object.assign({ rank: 'minion', poise: 0, weak: [], resist: [], speed: 2.4, range: 1.5, daze: 1000, stunDur: 3, buMax: 900, atkGap: [1.2, 2.6] }, o);
  const ENEMIES = {
    // Outer Ring: Hollow Thugs, and the Corrupted Overlord the Sons of Calydon fought
    raider: E({ name: 'Hollow Thug - Raider', faction: 'Thugs', model: 'raider', hp: 185000, atk: 1140, def: 620, speed: 2.7, weak: ['ice', 'physical'],
      attacks: [
        { name: 'Bat Swing', anim: 'slash', reach: 1.7, cd: 2.2, w: 3, move: [0.3, 0.5, 0.6], hits: [{ t: 0.55, mult: 95, shape: 'arc', r: 1.9, arc: 120 }] },
        { name: 'Overhead Smash', anim: 'slam', reach: 1.8, cd: 6, w: 1.5, move: [0.5, 0.8, 0.8], hits: [{ t: 0.85, mult: 170, heavy: true, flash: 'gold', shape: 'arc', r: 2.0, arc: 90 }] },
      ] }),
    pyromaniac: E({ name: 'Hollow Thug - Pyromaniac', faction: 'Thugs', model: 'pyromaniac', hp: 150000, atk: 1080, def: 560, speed: 2.4, range: 5.5, weak: ['ice', 'physical'],
      attacks: [
        { name: 'Firebomb Toss', anim: 'throw', reach: 8, cd: 2.6, w: 3, hits: [{ t: 0.65, mult: 85, shape: 'proj', speed: 10, arc: 1, fx: 'fireball' }] },
        { name: 'Torch Sweep', anim: 'slash', reach: 1.9, cd: 5, w: 1.2, hits: [{ t: 0.85, mult: 140, heavy: true, flash: 'gold', shape: 'arc', r: 2.2, arc: 140 }] },
      ] }),
    enforcer: E({ name: 'Hollow Thug - Bulky Enforcer', faction: 'Thugs', model: 'enforcer', rank: 'elite', poise: 1, hp: 1010000, atk: 2070, def: 860, speed: 2.5, range: 2.0, daze: 2550, stunDur: 8, buMax: 1500, weak: ['ice', 'physical'], atkGap: [0.5, 1.2],
      attacks: [
        { name: 'Gauntlet Jab', anim: 'punch', reach: 2.0, cd: 2.0, w: 3, move: [0.25, 0.45, 0.6], hits: [{ t: 0.45, mult: 110, shape: 'arc', r: 2.2, arc: 90 }] },
        { name: 'Haymaker', anim: 'slash', reach: 2.2, cd: 4.5, w: 2, move: [0.4, 0.8, 1.0], hits: [{ t: 0.85, mult: 190, heavy: true, flash: 'gold', shape: 'arc', r: 2.4, arc: 120 }] },
        { name: 'Ground Breaker', anim: 'slam', reach: 2.6, cd: 8, w: 1.4, hits: [{ t: 1.05, mult: 240, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 3.2 }] },
        { name: 'Shoulder Charge', anim: 'charge', reach: 9, cd: 9, w: 1, move: [0.7, 1.15, 7.5], hits: [{ t: 1.0, mult: 220, heavy: true, launch: true, flash: 'red', shape: 'line', r: 1.3 }] },
      ] }),
    pompey: E({ name: 'Corrupted Overlord - Pompey', faction: 'Corrupted', model: 'pompey', rank: 'boss', poise: 2, hp: 2900000, atk: 1890, def: 950, speed: 2.6, range: 2.6, daze: 4600, stunDur: 6, buMax: 2200, weak: ['fire'], resist: ['electric'], atkGap: [0.6, 1.3],
      phase2: { at: 0.5, name: 'Rear wheel and longsword' },
      attacks: [
        { name: 'Hover Gun Volley', anim: 'shootL', reach: 12, cd: 5, w: 2, rec: 0.5, hits: [0.7, 0.85, 1.0, 1.15].map(t => ({ t, mult: 70, shape: 'proj', speed: 15 })) },
        { name: 'Throttle Ram', anim: 'charge', reach: 10, cd: 6, w: 2, move: [0.7, 1.2, 8], hits: [{ t: 1.0, mult: 230, heavy: true, launch: true, flash: 'gold', shape: 'line', r: 1.4 }] },
        { name: 'Longsword Cleave', anim: 'slam', reach: 3.0, cd: 3, w: 3, phase: 2, hits: [{ t: 0.9, mult: 210, heavy: true, flash: 'gold', shape: 'arc', r: 3.4, arc: 100 }] },
        { name: 'Wheel Grind', anim: 'sweep', reach: 3.2, cd: 5, w: 2, phase: 2, hits: [{ t: 0.8, mult: 120, shape: 'arc', r: 3.6, arc: 200 }, { t: 1.1, mult: 150, flash: 'gold', shape: 'arc', r: 3.6, arc: 200 }] },
        { name: 'Ether Wheel Burst', anim: 'stomp', reach: 5, cd: 12, w: 1.3, phase: 2, hits: [{ t: 1.4, mult: 330, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 5.0 }] },
      ] }),
    // Yunkui Summit: the Miasma
    spawn: E({ name: 'Miasma Spawn', faction: 'Special', model: 'spawn', hp: 145000, atk: 1080, def: 520, speed: 2.8, weak: ['physical', 'ether'],
      attacks: [
        { name: 'Axe Chop', anim: 'slash', reach: 1.7, cd: 2.2, w: 3, move: [0.3, 0.5, 0.6], hits: [{ t: 0.55, mult: 90, shape: 'arc', r: 1.9, arc: 120 }] },
        { name: 'Lantern Lunge', anim: 'slam', reach: 2.4, cd: 5, w: 1.4, move: [0.45, 0.8, 1.8], hits: [{ t: 0.85, mult: 150, heavy: true, flash: 'gold', shape: 'circle', at: 'front', r: 1.6 }] },
      ] }),
    arcavor: E({ name: 'Miasma Walker - Arcavor', faction: 'Ether Mutants', model: 'arcavor', hp: 175000, atk: 1140, def: 600, speed: 3.2, range: 1.7, weak: ['physical', 'ether'],
      attacks: [
        { name: 'Shard Rake', anim: 'slash2', reach: 1.9, cd: 3.5, w: 3, move: [0.3, 0.9, 1.0], hits: [{ t: 0.45, mult: 70, shape: 'arc', r: 2.0, arc: 120 }, { t: 0.85, mult: 120, flash: 'gold', shape: 'arc', r: 2.1, arc: 120 }] },
        { name: 'Core Beam', anim: 'cast', reach: 7, cd: 6, w: 1.2, hits: [{ t: 0.9, mult: 120, shape: 'line', r: 0.9, len: 8 }] },
      ] }),
    huskron: E({ name: 'Miasma Ravager - Huskron', faction: 'Corrupted', model: 'huskron', rank: 'elite', poise: 1, hp: 1060000, atk: 2110, def: 900, speed: 3.6, range: 2.2, daze: 2700, stunDur: 8, buMax: 1500, weak: ['ice', 'fire'], atkGap: [0.5, 1.2],
      attacks: [
        { name: 'Spine Bite', anim: 'bite', reach: 2.2, cd: 2.2, w: 3, move: [0.3, 0.5, 0.8], hits: [{ t: 0.5, mult: 120, shape: 'arc', r: 2.4, arc: 100 }] },
        { name: 'Claw Pin', anim: 'slam', reach: 2.4, cd: 4.5, w: 2, hits: [{ t: 0.85, mult: 190, heavy: true, flash: 'gold', shape: 'circle', at: 'front', r: 2.0 }] },
        { name: 'Miasma Howl', anim: 'roar', reach: 3.6, cd: 9, w: 1.3, hits: [{ t: 1.1, mult: 200, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 3.8 }] },
        { name: 'Ravaging Leap', anim: 'pounce', reach: 8, cd: 8, w: 1.2, move: [0.6, 1.1, 6], hits: [{ t: 1.1, mult: 240, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'front', r: 2.2 }] },
      ] }),
    priest: E({ name: 'Miasma Priest', faction: 'Ether Mutants', model: 'priest', rank: 'boss', poise: 2, hp: 3000000, atk: 1830, def: 920, speed: 2.0, range: 3, daze: 4750, stunDur: 6, buMax: 2300, weak: ['ether'], resist: ['ice'], atkGap: [0.6, 1.4],
      attacks: [
        { name: 'Coral Palm', anim: 'slam', reach: 3.2, cd: 3, w: 3, hits: [{ t: 0.95, mult: 210, heavy: true, flash: 'gold', shape: 'circle', at: 'front', r: 2.4 }] },
        { name: 'Ribbon Sweep', anim: 'sweep', reach: 3.4, cd: 5, w: 2, hits: [{ t: 0.8, mult: 165, flash: 'gold', shape: 'arc', r: 3.8, arc: 200 }] },
        { name: 'Miasma Talismans', anim: 'cast', reach: 12, cd: 6, w: 2, rec: 0.5, hits: [0.8, 0.95, 1.1, 1.25, 1.4].map(t => ({ t, mult: 70, shape: 'proj', speed: 11 })) },
        { name: 'Bloom of Rot', anim: 'roar', reach: 5, cd: 10, w: 1.4, hits: [{ t: 1.2, mult: 310, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'self', r: 5 }] },
        { name: 'Miasma Rain', anim: 'cast', reach: 14, cd: 13, w: 1.2, rec: 0.5, hits: [{ t: 1.6, mult: 190, heavy: true, flash: 'red', shape: 'rain', n: 5, r: 1.6 }] },
      ] }),
    // The Hollow: Ethereals
    faun: E({ name: 'Faun', faction: 'Ether Mutants', model: 'faun', hp: 190000, atk: 1170, def: 620, speed: 2.6, range: 1.8, weak: ['ice', 'ether'],
      attacks: [
        { name: 'Signpost Swing', anim: 'slash', reach: 2.0, cd: 2.4, w: 3, move: [0.3, 0.5, 0.6], hits: [{ t: 0.6, mult: 100, shape: 'arc', r: 2.3, arc: 130 }] },
        { name: 'Signpost Slam', anim: 'slam', reach: 2.2, cd: 5.5, w: 1.5, hits: [{ t: 0.95, mult: 170, heavy: true, flash: 'gold', shape: 'arc', r: 2.6, arc: 70 }] },
      ] }),
    specter: E({ name: 'Specter', faction: 'Ether Mutants', model: 'specter', hp: 160000, atk: 1140, def: 560, speed: 3.4, range: 1.7, weak: ['ice', 'ether'],
      attacks: [
        { name: 'Blade Arm', anim: 'slash', reach: 1.9, cd: 2.0, w: 3, move: [0.25, 0.45, 0.8], hits: [{ t: 0.45, mult: 90, shape: 'arc', r: 2.1, arc: 110 }] },
        { name: 'Phantom Lunge', anim: 'thrust', reach: 5, cd: 5.5, w: 1.5, move: [0.5, 0.85, 4], hits: [{ t: 0.85, mult: 160, heavy: true, flash: 'gold', shape: 'circle', at: 'front', r: 1.5 }] },
      ] }),
    dullahan: E({ name: 'Dullahan', faction: 'Ether Mutants', model: 'dullahan', rank: 'elite', poise: 1, hp: 1040000, atk: 2140, def: 900, speed: 2.8, range: 2.2, daze: 2650, stunDur: 8, buMax: 1500, weak: ['ice', 'ether'], atkGap: [0.5, 1.2],
      attacks: [
        { name: 'Shard Sword Combo', anim: 'slash2', reach: 2.3, cd: 3.5, w: 3, move: [0.3, 1.1, 1.4], hits: [{ t: 0.5, mult: 100, shape: 'arc', r: 2.6, arc: 140 }, { t: 0.85, mult: 100, shape: 'arc', r: 2.6, arc: 140 }, { t: 1.3, mult: 180, heavy: true, flash: 'gold', shape: 'arc', r: 2.8, arc: 120 }] },
        { name: 'Impaling Charge', anim: 'charge', reach: 9, cd: 8, w: 1.4, move: [0.75, 1.2, 7.5], hits: [{ t: 1.05, mult: 230, heavy: true, launch: true, flash: 'red', shape: 'line', r: 1.3 }] },
        { name: 'Whirlwind', anim: 'spin', reach: 2.6, cd: 7, w: 1.6, hits: [{ t: 0.9, mult: 200, heavy: true, flash: 'gold', shape: 'circle', at: 'self', r: 3.0 }] },
      ] }),
    butcher: E({ name: 'Notorious - Dead End Butcher', faction: 'Ether Mutants', model: 'butcher', rank: 'boss', poise: 2, hp: 3100000, atk: 1950, def: 950, speed: 2.3, range: 2.8, daze: 4950, stunDur: 6, buMax: 2300, weak: ['ice', 'ether'], atkGap: [0.5, 1.2], cancelsFollowUp: true,
      attacks: [
        { name: 'Pummel', anim: 'slash2', reach: 3, cd: 3.2, w: 3, move: [0.3, 1.2, 1.6], hits: [{ t: 0.45, mult: 90, shape: 'arc', r: 3.0, arc: 140 }, { t: 0.75, mult: 90, shape: 'arc', r: 3.0, arc: 140 }, { t: 1.25, mult: 190, heavy: true, flash: 'gold', shape: 'arc', r: 3.2, arc: 140 }] },
        { name: 'Dead End Hammer', anim: 'slam', reach: 3.4, cd: 6, w: 2, hits: [{ t: 1.0, mult: 280, heavy: true, launch: true, flash: 'red', shape: 'arc', r: 4.0, arc: 80 }] },
        { name: 'Crushing Leap', anim: 'pounce', reach: 10, cd: 9, w: 1.4, move: [0.7, 1.25, 7], hits: [{ t: 1.25, mult: 300, heavy: true, launch: true, flash: 'red', shape: 'circle', at: 'front', r: 3.0 }] },
        { name: 'Backhand Sweep', anim: 'sweep', reach: 3.4, cd: 5, w: 2, hits: [{ t: 0.8, mult: 180, flash: 'gold', shape: 'arc', r: 4.0, arc: 220 }] },
        { name: 'Ether Rupture', anim: 'cast', reach: 14, cd: 13, w: 1.1, rec: 0.5, hits: [{ t: 1.6, mult: 200, heavy: true, flash: 'red', shape: 'rain', n: 5, r: 1.6 }] },
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

  /* ---------------------------------------------------- BATTLE LAB TUNING --
     Every knob the Battle Lab panel exposes. Saved per browser. */
  const TUNING_DEFS = [
    { group: 'Commands' },
    { key: 'auto', label: 'AUTO: the game gives your commands', type: 'bool', def: false, help: 'Swaps, Assists, Chain picks, EX calls and Ultimates are made for you. Also on the battle screen (the AUTO button, or T).' },
    { key: 'autoUlt', label: 'Agents fire Ultimates on their own', type: 'bool', def: false, help: 'Off: you call Ultimates (Q) when an Agent\'s Decibels hit MAXIMUM.' },
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
    { group: 'Presentation' },
    { key: 'speed', label: 'Game speed', type: 'range', min: 0.5, max: 1.5, step: 0.05, def: 1 },
    { key: 'calmCam', label: 'Steady camera (no push-ins)', type: 'bool', def: false },
    { key: 'cutins', label: 'Ultimate cut-ins', type: 'bool', def: true },
    { key: 'dmgNumbers', label: 'Damage numbers', type: 'bool', def: true },
    { key: 'showLog', label: 'Battle log', type: 'bool', def: true },
    { key: 'volume', label: 'Sound volume', type: 'range', min: 0, max: 1, step: 0.05, def: 0.6 },
  ];
  const TUNING_DEFAULTS = {}; for (const d of TUNING_DEFS) if (d.key) TUNING_DEFAULTS[d.key] = d.def;

  window.DATA = { RULES, ATTR, ANOMALY, SPEC, AGENTS, ENEMIES, ENCOUNTERS, TUNING_DEFS, TUNING_DEFAULTS };
})();
