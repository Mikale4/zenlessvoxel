/* ============================================================================
   agents/sunna.js -- Sunna, the composer of the Angels of Delusion. S-Rank,
   Physical, Support, Defensive Assist. Released in Version 2.6.
   (How an Agent's own file works, its hooks and its helpers: agents/zhuyuan.js.)

   Sources: zzz.gachabase.net (datamine, release data 3.3.0; the 3.4.2 beta is
   the same), Prydwen (kit and review), Game8, genshin-builds (the heal's
   formula), the Zenless Zone Zero Wiki (Sunna, Lore, Dialogue, Dreams on
   Loop), the official portrait and in-game renders, and the official demo
   "Sampling Dreams". The wiki has no voice lines for her yet: she fights in
   silence.

   Her kit (official):
     Basic Attack: Mischief Meteor Hammer   4 swings of a giant inflatable
                                     hammer (the 4th: a long recovery)
     Basic Attack: Naughty Cat Spotted   off the field, with no enemy under
                                     Cat's Gaze: Bubblegum spends 1 Claw
                                     Sharpener to pounce on the target
     Dash Attack: Skyward Hammer (launches)   Dodge Counter: Delusion Strikeout
     Special Attack: Star Shooter    Bubblegum fired from her megaphone air gun
     EX Special Attack: Bubblegum Barrage (70 Energy)   Bubblegum hurled at the
                                     target; the squad gets Angelic
                                     Chord-ination for 40 s
     EX Special Attack: Special Photography Technique   EX during Angelic
                                     Chord-ination (once per Chord-ination), or
                                     keep EX held through Bubblegum Barrage: she
                                     and Bubblegum strike together, and before
                                     the heavy hit it starts Ether Veil:
                                     Delusion Reprise (40 s)
     Chain Attack: Don't Mess With the Cat   she charges in riding Bubblegum
     Ultimate: Smash It All!         hammer strikes, Bubblegum launched to burst
                                     over the area, a strike from above: 6 Claw
                                     Sharpeners, and the whole squad is healed
     Quick Assist: Sonic Beatdown    Defensive Assist: Stage Fright
     Assist Follow-Up: Jump Training (bouncing on the hammer)
     Core Passive: Cuteness Is Justice   Angelic Chord-ination: the squad gains
                                     ATK equal to 30% of hers (up to 1,050).
                                     Naughty Cat Spotted, both EX Specials, the
                                     Chain Attack and the Ultimate put Cat's
                                     Gaze on enemies (12 s, refreshed while she
                                     is on the field). An Attack or Anomaly
                                     teammate who keeps hitting the marked main
                                     target sets it off (3 hits, 1 on a Stunned
                                     enemy): 300% of that teammate's ATK in her
                                     attribute, 480% with a guaranteed CRIT and
                                     +150% CRIT DMG for an Anomaly Agent, dealt
                                     as hers; every mark on the field goes.
     Claw Sharpeners (max 6): +2 when anyone starts an Ether Veil, +1 when
                                     anyone applies an Anomaly (once per 10 s),
                                     +6 from her Ultimate.
     Additional Ability: Daydreamer's Counterpoint   with another Attack Agent
                                     or an Angels of Delusion member: hits from
                                     inside Delusion Reprise raise the target's
                                     Stun DMG Multiplier by 30% for 40 s; +15
                                     Energy when she enters the field.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd, lerp } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  // a share k of a move's official total [DMG%, Daze%, Anomaly Buildup] (the sources give each flurry as one number)
  const part = (t, k, T, o) => hit(t, T[0] * k, T[1] * k, Math.round(T[2] * k * 100) / 100, o);
  const PINK = 0xff8fbf, MINT = 0x7fe6c8, LILAC = 0xc8b8ff, PIX = [PINK, MINT, 0xffffff, LILAC, 0xffe08a];
  // Angelic Chord-ination: 30% of her ATK, capped at 1,050 (the official cap: this game's ATK sits on the official
  // in-combat scale, so it stays as it is). The Ultimate's heal: 2,950 HP (-50 + 250 x skill level 12) x 1.12, this
  // game's HP scale.
  const CHORD = 0.3, CHORD_CAP = 1050, HEAL = 3300, GAZE_T = 12, CLAWS = 6;

  /* ----------------------------------------------------------------- kit -- */
  // official level-12 totals [DMG%, Daze%, Anomaly Buildup] of the moves split into several hits here
  const EXB = [1827.4, 921.8, 216.83], EXH = [1588.3, 742.1, 171.02], PHO = [1656.4, 903.7, 217.16], CHN = [1623.1, 438.9, 212.26];
  const ULT = [4182.0, 559.8, 143.35], CTR = [637.8, 413.9, 55.84], QCK = [146.4, 110.1, 27.92], FUP = [1071.4, 708.2, 193.71];
  const K = {
    basic: [
      { name: 'Basic Attack: Mischief Meteor Hammer', anim: 'sunHit1', dur: 0.44, cancel: 0.32, reach: 1.9, range: 1.6, hits: [hit(0.16, 87.4, 38.0, 12.5, { shape: 'arc', r: 2.2, arc: 120 })] },
      { name: 'Basic Attack: Mischief Meteor Hammer', anim: 'sunHit2', dur: 0.5, cancel: 0.36, reach: 2.0, range: 1.6, hits: [hit(0.2, 351.9, 164.1, 52.65, { shape: 'arc', r: 2.5, arc: 160 })] },
      { name: 'Basic Attack: Mischief Meteor Hammer', anim: 'sunHit3', dur: 0.52, cancel: 0.38, reach: 2.0, range: 1.6, hits: [hit(0.22, 362.7, 186.3, 56.74, { shape: 'arc', r: 2.5, arc: 160, kb: 0.4 })] },
      // (Prydwen: a long recovery that a dodge can't cut short: the cancel point comes late)
      { name: 'Basic Attack: Mischief Meteor Hammer', anim: 'sunSlam', dur: 0.95, cancel: 0.85, reach: 2.0, range: 1.6, hits: [hit(0.42, 811.2, 378.2, 116.43, { heavy: true, shape: 'circle', at: 'front', r: 2.4, kb: 0.9 })] },
    ],
    dash: { name: 'Dash Attack: Skyward Hammer', anim: 'sunUpper', dur: 0.6, cancel: 0.45, reach: 7, hits: [hit(0.28, 199.8, 75.2, 19.16, { shape: 'arc', r: 2.3, arc: 140, kb: 1.0 })] },
    counter: { name: 'Dodge Counter: Delusion Strikeout', anim: 'sunCounter', dur: 0.85, cancel: 0.7, inv: [0, 0.8],
      hits: [0.14, 0.24, 0.34].map(t => part(t, 0.15, CTR, { shape: 'circle', at: 'front', r: 1.9 })).concat([part(0.56, 0.55, CTR, { heavy: true, shape: 'circle', at: 'front', r: 2.3, kb: 0.9 })]) },
    special: { name: 'Special Attack: Star Shooter', anim: 'sunShot', dur: 0.55, cancel: 0.42, reach: 6, range: 3.5, cd: 1.5, hits: [hit(0.3, 113.6, 85.0, 21.67, { shape: 'line', r: 1.0, len: 7, kb: 0.5 })] },
    // gaze: puts Cat's Gaze on whoever it hits. Both versions of Bubblegum Barrage give the squad Angelic Chord-ination
    ex: { name: 'EX Special Attack: Bubblegum Barrage', anim: 'sunBarrage', dur: 1.2, cancel: 1.05, cost: 70, reach: 6, range: 3.5, inv: [0, 1.15], gaze: true,
      hits: [part(0.42, 0.2, EXB, { shape: 'circle', at: 'target', r: 1.8 }), part(0.62, 0.2, EXB, { shape: 'circle', at: 'target', r: 1.8 }), part(0.92, 0.6, EXB, { heavy: true, shape: 'circle', at: 'target', r: 2.6, kb: 1.0 })] },
    // held: the shorter Barrage that flows straight into Special Photography Technique
    exHold: { name: 'EX Special Attack: Bubblegum Barrage', anim: 'sunBarrage', dur: 0.85, cancel: 0.8, cost: 70, reach: 6, range: 3.5, inv: [0, 0.85], gaze: true,
      hits: [part(0.38, 0.35, EXH, { shape: 'circle', at: 'target', r: 1.8 }), part(0.66, 0.65, EXH, { heavy: true, shape: 'circle', at: 'target', r: 2.6, kb: 1.0 })] },
    // no Energy (Prydwen); sunAt: her file's timed moments (the Veil starts before the heavy hit)
    photo: { name: 'EX Special Attack: Special Photography Technique', anim: 'sunPhoto', dur: 1.45, cancel: 1.3, reach: 3.2, range: 2.2, inv: [0, 1.4], gaze: true, sunAt: [[0.8, 'veil']],
      hits: [part(0.35, 0.15, PHO, { shape: 'circle', at: 'target', r: 2.4 }), part(0.62, 0.2, PHO, { shape: 'circle', at: 'target', r: 2.2 }), part(1.1, 0.65, PHO, { heavy: true, shape: 'circle', at: 'target', r: 3.0, kb: 1.2 })] },
    chain: { name: 'Chain Attack: Don\'t Mess With the Cat', anim: 'sunRide', dur: 1.35, inv: [0, 1.35], gaze: true,
      hits: [part(0.45, 0.3, CHN, { shape: 'line', r: 1.3, len: 5 }), part(1.0, 0.7, CHN, { heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1.3 })] },
    // three strikes, Bubblegum bursting over the area, the strike from above: 6 Claw Sharpeners as the heavy hit starts, the heal as it lands
    ult: { name: 'Ultimate: Smash It All!', anim: 'sunUlt', dur: 2.3, inv: [0, 2.3], gaze: true, sunAt: [[1.6, 'claws'], [1.85, 'heal']],
      hits: [0.4, 0.6, 0.8].map(t => part(t, 0.1, ULT, { shape: 'arc', r: 2.6, arc: 160 })).concat([part(1.3, 0.25, ULT, { shape: 'circle', at: 'target', r: 4 }), part(1.85, 0.45, ULT, { heavy: true, shape: 'circle', at: 'target', r: 4.6, kb: 1.6 })]) },
    assist: { name: 'Defensive Assist: Stage Fright', type: 'defensive', anim: 'sunParry', dur: 0.45, inv: [0, 0.45], daze: Math.round(481.3) },   // (light 481.3%; the battle adds 20% on a heavy blow, about her 608.7%)
    followup: { name: 'Assist Follow-Up: Jump Training', anim: 'sunPogo', dur: 1.15, inv: [0, 1.1],
      hits: [part(0.3, 0.25, FUP, { shape: 'circle', at: 'self', r: 2.0 }), part(0.6, 0.25, FUP, { shape: 'circle', at: 'self', r: 2.0 }), part(0.95, 0.5, FUP, { heavy: true, shape: 'circle', at: 'front', r: 2.6, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Sonic Beatdown', anim: 'sunFlurry', dur: 0.7, inv: [0, 0.65],
      hits: [part(0.28, 0.5, QCK, { shape: 'circle', at: 'front', r: 2.0 }), part(0.45, 0.5, QCK, { shape: 'circle', at: 'front', r: 2.0, kb: 0.6 })] },
    // what Bubblegum does off the field (data for her mech below; 417%, no Daze). every: seconds between pounces
    // (no source gives a rate: our choice)
    cat: { name: 'Basic Attack: Naughty Cat Spotted', mult: Math.round(417 * DM), daze: 0, bu: 0, every: 3 },
  };
  const CATDEF = { name: K.cat.name, hits: [], gaze: true };   // (the "move" a pounce lands as)
  const chordAtk = a => Math.min(CHORD_CAP, Math.round(CHORD * a.st.atk));

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.sunna = {
    id: 'sunna', name: 'Sunna', short: 'Sunna', faction: 'Angels of Delusion', spec: 'Support', attr: 'physical', rank: 'S',
    color: '#f6a3c0', color2: '#76c6b9', assist: 'defensive', stance: 'sunna',
    blurb: 'The Angels of Delusion\'s composer: painfully shy, quick to stammer, and secretly devoted to her fans. She bops enemies with a giant inflatable hammer and fires Bubblegum, her pixel-art kitten, from a megaphone air gun; her EX tunes the whole squad up with Angelic Chord-ination, and Bubblegum\'s Cat\'s Gaze turns a teammate\'s hits into a burst.',
    stats: { hp: 9490, atk: 2800, def: 642, impact: 98, ap: 95, am: 96, cr: 0.1, cd: 0.8, er: 1.0, speed: 4.7 },
    ai: { range: 1.9, dodge: 0.75, reflex: 0.6, aggr: 0.95 },
    energyMax: 120, resource: 'claws',
    core: [
      ['Core Passive: Cuteness Is Justice', 'Bubblegum Barrage gives the whole squad Angelic Chord-ination for 40 s: ATK equal to 30% of Sunna\'s (up to 1,050). Naughty Cat Spotted, both EX Specials, her Chain Attack and her Ultimate put Cat\'s Gaze on enemies (12 s; it keeps refreshing while she is on the field). When an Attack or Anomaly teammate keeps hitting the marked main target (3 hits a second apart, 1 on a Stunned enemy), it bursts round the target: 300% of that teammate\'s ATK in her own attribute (an Anomaly Agent: 480%, a guaranteed CRIT with +150% CRIT DMG), as her own DMG. Every mark on the field is used up.'],
      ['Claw Sharpeners', 'Up to 6: +2 whenever anyone in the squad starts an Ether Veil, +1 when anyone applies an Attribute Anomaly (once per 10 s), 6 from her Ultimate. Off the field, with no enemy under Cat\'s Gaze, Bubblegum spends one to pounce on the target: Basic Attack: Naughty Cat Spotted, which marks it.'],
      ['Special Photography Technique', 'Once per Angelic Chord-ination: Special again while it lasts (or keep Special held through Bubblegum Barrage) for her second EX, free. Before its heavy hit it starts Ether Veil: Delusion Reprise, +ATK for the squad for 40 s (a new Veil replaces the old). Her Ultimate heals the whole squad.'],
      ['Additional Ability: Daydreamer\'s Counterpoint', 'With another Attack Agent or an Angels of Delusion member in the squad: hits landed inside Delusion Reprise raise the target\'s Stun DMG Multiplier by 30% for 40 s, and Sunna gains 15 Energy when she enters the field (once every 180 s).'],
    ],
    kit: K,
    kitShow: [['EX', 'photo'], ['Off-field', 'cat']],
    rivalMoves: [{ k: 'photo', kind: 'ex2', p: 0.12, cd: 14 }],
    howto: 'Sunna: her EX, Bubblegum Barrage (70 Energy), gives the squad Angelic Chord-ination (40 s, +ATK from 30% of hers); press Special again while it lasts, or keep Special held through the EX, for Special Photography Technique, free, which starts Ether Veil: Delusion Reprise. Her EX, Chain Attack and Ultimate put Cat\'s Gaze on enemies: an Attack or Anomaly teammate\'s hits on the marked target set it off. Off the field, Bubblegum spends Claw Sharpeners to mark the target (Naughty Cat Spotted). Her Ultimate heals the squad. Her assist is a Defensive Assist: a parry.',
    mech: {
      // claws: Claw Sharpeners. snChord: Angelic Chord-ination ends; snPhoto: its Special Photography Technique is unused.
      // snVeil: the last Ether Veil seen. snCatT: Bubblegum's next pounce. snEnterT: the 15 Energy is ready again
      init(a) { a.claws = 0; a.snChord = 0; a.snPhoto = false; a.snVeil = 0; a.snAnomCd = 0; a.snCatT = 3; a.snEnterT = 0; a.snDC = false; },
      squad(a, B) { a.snDC = B.squad.some(s => s !== a && (s.def.spec === 'Attack' || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B;
        if (def === K.ex || def === K.exHold) {
          a.snChord = B.t + 40; a.snPhoto = true;
          BT.log(`Sunna: Angelic Chord-ination! The squad gains +${chordAtk(a)} ATK (40 s).`, 'skill');
          if (def === K.exHold) a.queue.push({ def: K.photo, kind: 'ex2', delay: 0.02, tgt: A.tgt });   // Special held through it
        }
        if (def === K.photo) a.snPhoto = false;
      },
      hit(a, v, h, A) {
        const B = BT.B;
        if (a.snDC && B.veil > B.t) stunUp(v);
        if (A.def.gaze && v.alive) gaze(v);
      },
      // a teammate's hit: Daydreamer's Counterpoint, and Cat's Gaze going off
      allyHit(a, src, v, h, A) {
        const B = BT.B;
        if (a.snDC && B.veil > B.t) stunUp(v);
        if (!(v.snGaze > B.t) || !['Attack', 'Anomaly'].includes(src.def.spec)) return;
        if (A && A.tgt && A.tgt !== v) return;                       // only the main target's mark
        if (v.snGazeNext > B.t) return;                              // (Prydwen: about a second between counted hits)
        v.snGazeNext = B.t + 1; v.snGazeN = (v.snGazeN || 0) + 1;
        if (v.snGazeN >= (v.stun > 0 ? 1 : 3)) catsGaze(src, v);
      },
      anomaly(a) { const B = BT.B; if (a.snAnomCd <= B.t) { a.snAnomCd = B.t + 10; a.claws = Math.min(CLAWS, a.claws + 1); } },
      swap(a, isIn) {
        const B = BT.B;
        if (!isIn || !a.snDC || a.snEnterT > B.t) return;
        a.snEnterT = B.t + 180; BT.gainEnergy(a, 15, true);          // (the 180 s limit holds in every fight: our choice, so swaps can't farm it)
        BT.log('Daydreamer\'s Counterpoint: Sunna enters the field (+15 Energy).', 'skill');
      },
      tick(a, dt, on) {
        const B = BT.B;
        // a new Ether Veil (anyone's, hers too): +2 Claw Sharpeners
        if (B.veil > B.t && B.veil !== a.snVeil) { a.snVeil = B.veil; a.claws = Math.min(CLAWS, a.claws + 2); }
        // her moves' timed moments: the Veil before the Photography's heavy hit; the Ultimate's Claw Sharpeners and heal
        const A = a.act;
        if (A && A.def && A.def.sunAt && A.data) for (const [t, k] of A.def.sunAt) if (A.t >= t && !A.data['sun' + k]) { A.data['sun' + k] = true; AT[k](a); }
        // on the field she keeps Cat's Gaze fresh; marked minions grow warier of her (their attacks come 30% slower: our choice)
        if (on) for (const v of B.enemies) if (v.alive && v.snGaze > B.t) { v.snGaze = B.t + GAZE_T; if (v.rank === 'minion' && !v.rival) v.atkCd += dt * 0.3; }
        // off the field: Naughty Cat Spotted, when no enemy has Cat's Gaze
        if (!on && !B.allOut && a.claws >= 1 && a.snCatT <= B.t) {
          a.snCatT = B.t + 0.5;
          const ag = BT.active();
          if (ag && ag.alive && ag !== a && !B.enemies.some(v => v.alive && v.snGaze > B.t)) {
            const v = BT.pickTarget(ag);
            if (v && v.alive) { a.claws--; a.snCatT = B.t + K.cat.every; naughtyCat(a, ag, v); }
          }
        }
      },
      // Angelic Chord-ination: everyone in the squad, her too (atkOf asks every Agent: never call BT.atkOf here)
      atkFor(a, b) { const B = BT.B; return B && a.snChord > B.t && !b.rival ? chordAtk(a) : 0; },
      // Special: during Angelic Chord-ination (once), Special Photography Technique; held with the Energy, the Barrage
      // that flows into it. Otherwise the usual rule (the EX with 70 Energy, else Star Shooter)
      resolve(a, btn, hold, c) {
        if (btn !== 'special') return null;
        if (a.snChord > c.t && a.snPhoto) return { def: K.photo, kind: 'ex2' };
        if (hold && a.energy >= K.exHold.cost) return { def: K.exHold, kind: 'ex' };
        return null;
      },
      // AUTO: the Photography while it is there to use (sooner on a Stun or when the Veil is running out), the
      // Barrage whenever Chord-ination is about to lapse (held, now and then, straight into the Photography)
      ai(a, tgt, B) {
        if (a.snChord > B.t && a.snPhoto && (tgt.stun > 0 || !(B.veil > B.t + 6) || a.snChord - B.t < 8)) return { btn: 'special' };
        if (a.energy >= K.ex.cost && !(a.snChord > B.t + 6)) return { btn: 'special', hold: Math.random() < 0.4 };
        return null;
      },
      hud(a, B) {
        const r = [`CLAW SHARPENER ${'●'.repeat(a.claws)}${'○'.repeat(Math.max(0, CLAWS - a.claws))}`];
        if (a.snChord > B.t) r.push(`CHORD-INATION ${Math.ceil(a.snChord - B.t)}s${a.snPhoto ? ' · PHOTO READY' : ''}`);
        if (B.veil > B.t) r.push(`DELUSION REPRISE ${Math.ceil(B.veil - B.t)}s`);
        const n = B.enemies.filter(v => v.alive && v.snGaze > B.t).length; if (n) r.push(`CAT'S GAZE ×${n}`);
        return r;
      },
    },
    town: {
      routine: ['cafe:t 35, box:cats 30, bardic:bench 20, huddle 15', '404:door 30, bardic:crates 30, 141:icecream 25, huddle 15', '404:q1 35, soup:stool 30, cafe:t 20, huddle 15', '404:door 45, alley:lean 30, box:cats 25'],
      chatter: ['Don\'t make eye contact, don\'t make eye contact...', 'Bubblegum, back in your screen. People are looking.'],
      lines: [
        'M-Manager! Hi. Sorry. I was humming. You didn\'t hear that. ...Did you hear that?',
        'Strangers keep asking me for directions. I don\'t know where anything is! I just point at the 141 and walk away very fast.',
        'Aria and I fell asleep in the studio again, halfway through mixing the bridge. It\'s going to be good. Don\'t tell her I said so.',
      ],
      chapters: [
        { title: 'Sugar rush', ask: ['M-Manager. Emergency. I need sugar before rehearsal.', 'The 141 is full of people. Could you... get me a milk tea? The sweetest one they have. Please.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'sunna' }],
          scene: [['A', 'Th-thank you. Is this the sweetest one? ...It is. Perfect.'], ['P', 'That\'s a lot of sugar.'], ['A', 'Composers run on sugar. It\'s science. Probably.'], ['A', '...You remembered how I like it. Don\'t make that face. I\'m not blushing, it\'s the sugar.']] },
        { title: 'The demo', ask: ['I left a demo on Aria\'s desk three days ago. She hasn\'t said a single word about it.', 'Could you ask her if she listened? I can\'t. If she hated it, I\'ll have to move to another city.'], steps: [{ t: 'talk', to: 'aria', reply: 'Sunna\'s demo? I\'ve had it on loop for three days! Tell her the bridge made me cry. ...Don\'t tell her I cried.' }, { t: 'talk', to: 'sunna' }],
          scene: [['P', 'Aria\'s had it on loop for three days.'], ['A', 'Th-three days?! That\'s an unhealthy amount of looping!'], ['P', 'She said the bridge made her cry. I wasn\'t supposed to tell you that part.'], ['A', '...I rewrote that bridge eleven times.'], ['A', 'Then I didn\'t hear it. I\'m going to go hum at a wall for a while. A happy hum.']] },
        { title: 'No audience', ask: ['Hollows are fine. Hollows don\'t have audiences.', 'Take me on a Notorious hunt, Manager. I want to show I can do this without hiding behind Bubblegum.'], steps: [{ t: 'clear', f: { enc: 'boss', with: 'sunna' } }, { t: 'talk', to: 'sunna' }],
          scene: [['A', 'W-we won? We won! Bubblegum, we won!'], ['P', 'You didn\'t hide once.'], ['A', 'I hid a little. Behind the hammer. It\'s inflatable, so it doesn\'t count.'], ['A', '...Thanks for not making it weird, Manager. I think I\'m getting less allergic to people. A little.']] },
      ],
    },
  };

  /* -------------------------------------------------------- mechanics -- */
  // Daydreamer's Counterpoint: +30% Stun DMG Multiplier for 40 s (battle.js's stunMult reads stunUpT / stunUpK)
  function stunUp(v) { v.stunUpT = BT.B.t + 40; v.stunUpK = 0.3; }
  // Cat's Gaze on an enemy (the little pixel cat over its head shows it)
  function gaze(v) { v.snGaze = BT.B.t + GAZE_T; markIcon(v); }
  // the mark goes off: the teammate's own ATK and attribute, round the target, as her DMG; every mark is used up
  function catsGaze(src, v) {
    const B = BT.B, T = BT.T, anom = src.def.spec === 'Anomaly', attr = src.flux || src.def.attr;
    for (const e of B.enemies) { e.snGaze = 0; e.snGazeN = 0; }
    const crit = anom || Math.random() < src.st.cr, k = (anom ? 480 : 300) * DM / 100 * (crit ? 1 + src.st.cd + (anom ? 1.5 : 0) : 1);
    const atk = BT.atkOf(src); let total = 0;
    for (const e of BT.enemiesIn('circle', v.x, v.z, 2.6, 0)) {
      const dmg = Math.max(1, Math.round(atk * k * 794 / (794 + (e.def_ || 0)) * BT.resMult(e, attr) * BT.stunMult(e) * (e.vuln > B.t ? 1.25 : 1) * T.agentDmg * ((B.buff && B.buff.dmg) || 1)));
      BT.hurtEnemy(e, dmg, { attr, crit, src, big: true, cls: 'abloom', color: '#ff9ad0' }); total += dmg;
    }
    gazeFx(v); BT.gainDecibels(src, 40);
    BT.callout('CAT\'S GAZE', 'abloom', `${src.def.short} sets it off`);
    BT.log(`Cat's Gaze bursts on ${v.def.name} (${src.def.short}${anom ? ', a guaranteed CRIT' : ''}): ${U.fmt(total)}`, 'anomaly');
  }
  // Naughty Cat Spotted: Bubblegum springs in from beside whoever is fighting and pounces on her target
  function naughtyCat(a, ag, v) {
    const B = BT.B, side = Math.random() < 0.5 ? 1 : -1, x0 = ag.x + Math.cos(ag.face) * side * 1.2, z0 = ag.z - Math.sin(ag.face) * side * 1.2;
    BT.log('Sunna (off the field): Naughty Cat Spotted! Bubblegum pounces (1 Claw Sharpener).', 'skill');
    catFlight(x0, 2.2, z0, follow(v, { x: v.x, y: 0.8, z: v.z }), [0.35], 0.6, 1.2, () => {
      if (BT.B !== B || !v.alive) return;
      // (it lands as her hit: her ATK as it is now; the sources say her pre-combat ATK)
      BT.applyHit(a, v, { mult: K.cat.mult, daze: K.cat.daze, bu: K.cat.bu, shape: 'circle', r: 1.2 }, { kind: 'cat', def: CATDEF, data: {}, dir: 0, t: 0, tgt: v }, 'physical');
    });
  }
  // the moments in her moves (def.sunAt), fired from mech.tick
  const AT = {
    veil(a) {
      const B = BT.B; B.veil = B.t + 40;                             // Ether Veil: Delusion Reprise (as Aria's Ultimate; a new one replaces the old)
      BT.log('Sunna: Ether Veil: Delusion Reprise! The squad gains ATK (40 s).', 'skill'); BT.callout('DELUSION REPRISE', 'skill', 'Sunna · Ether Veil');
    },
    claws(a) { a.claws = CLAWS; BT.log('Sunna: 6 Claw Sharpeners.', 'skill'); },
    heal() {
      const B = BT.B;
      for (const s of B.squad) if (s.alive) s.hp = Math.min(s.hpMax, s.hp + HEAL);
      for (const s of BT.fielded()) {
        if (BT.T.dmgNumbers) FX.number(s.x, s.height + 0.2, s.z, '+' + U.fmt(HEAL), 'big', '#8dffb8');
        FX.burst(s.x, 1, s.z, 24, { col: [0x8dffb8, 0xff9ad0, 0xffffff], speed: 3, size: 0.12, life: 0.7, g: -2 }); FX.ring(s.x, s.z, 0.4, 2.2, 0x8dffb8, 0.5);
      }
      BT.log(`Sunna: the whole squad recovers ${U.fmt(HEAL)} HP.`, 'skill');
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait and in-game renders: pale cream-mint hair,
     sage-teal in the lengths with lavender tips, blunt bangs, wavy to the
     shoulder, and a long high side ponytail on her left tied with a big mint
     ribbon; a black triangle clip on her right bangs, black clips with pink
     pins on her left, small black earrings; green eyes with pink and yellow
     glints, pink-red winged liner. A white puff-sleeve blouse, a black
     choker, a loose red tie with a white sparkle, a black double-heart pin, a
     white belt; a mint polka-dot bow at the waist with a yellow virtual pet
     on it; a black feathery layered skirt. A pink backpack (its straps over
     her shoulders, a yellow lanyard tassel) with small white angel wings.
     Pink-and-white striped arm warmers with black bands, green nails. Her
     right leg in a ripped white thigh-high with a pink studded strap and a
     little pink cat pouch; her left leg bare, a black garter with a mint
     bow; slouchy striped leg warmers on both; chunky pink sneakers on white
     studded platforms. 154 cm.
     In her right hand the inflatable hammer (a long black handle with pink
     and mint bands, a huge white-and-silver barrel head with mint striking
     ends ringed in pink, little mint points like ears, dark lettering); in
     her left the megaphone air gun (a grey speaker box, a pink bell with a
     lime ring round a dark muzzle, green polka-dot bows). The portrait has
     the gun in her right hand: the hammer, her main weapon, takes it here
     (our choice). Bubblegum, the pixel-art cat, is drawn by her effects. */
  {
    const HAIR = 0xe4e7d4, HAIR2 = 0xc6d2b6, HAIR3 = 0x8fa99f, HAIR4 = 0x6a8b90, TIPS = 0xa3a0c0, HAIRHI = 0xf5f7ec;
    const SKIN = 0xfdefe6, EYE = 0x4fae74, LINER = 0x7a2838, RIB = 0x5ec9b4, RIB2 = 0x3fa595, RIBHI = 0xdaf1e2;
    const WHITE = 0xf9f9f9, WHITE2 = 0xdcdde6, BLACK = 0x292731, BLACK2 = 0x1c1b22, TIE = 0xc8304a, TIE2 = 0x902639;
    const BAG = 0xf6b4bd, BAG2 = 0xd67b97, STRAP = 0xd27c93, STRIPE = 0xf7b1c6, STRIPE2 = 0xfdf0f4, STRIPE3 = 0xe987a7;
    const DOT = 0x6bc09f, YEL = 0xfacf6e, GOLD = 0xf2c040, NAIL = 0x5fc08a;
    const SKIRT = 0x272f36, SKIRT2 = 0x585355, SKIRT3 = 0x353c44, SHOE = 0xfea5ba, SOLE = 0xf4f4f8, STUD = 0xaeb4c2, WING = 0xe8edf4, WING2 = 0xc9d3e2;
    const BELL = 0xcc6b92, BELL2 = 0xf09ab8, LIME = 0x90b047, GREY = 0x798a9d, GREY2 = 0x5c6a7a, DARK = 0x2a2a30;
    const HAMW = 0xf2f4f8, HAMS = 0xc5cad6, HMINT = 0x7fe0c8, HPINK = 0xff8fb0;
    // an arm (s = 1: her left, +X): a puffed sleeve (kept clear of her chest), a black band, the striped warmer
    const arm = s => g => {
      g.box(s > 0 ? -1 : -2, -1, -2, s > 0 ? 2 : 1, 0, 2, WHITE); g.box(-1, -2, -1, 1, -2, 1, WHITE2);   // puffed white sleeve, its frill
      g.box(-1, -3, -1, 1, -3, 1, BLACK);                                                                 // a black band
      g.box(-1, -4, -1, 1, -4, 1, STRIPE); g.box(-1, -5, -1, 1, -5, 1, STRIPE2); g.box(-1, -6, -2, 1, -6, 2, STRIPE3);   // the arm warmer, bunched at the wrist
      g.box(-1, -7, -1, 1, -7, 1, SKIN); g.set(0, -7, 1, NAIL);                                          // her hand, green nails
    };
    // a leg (right: her right one, in the white thigh-high)
    const leg = right => g => {
      for (let y = 0; y >= -3; y--) g.box(-1, y, -1, 1, y, 1, right ? WHITE : SKIN);
      g.box(-1, -4, -2, 1, -4, 2, STRIPE2);                                                  // slouchy leg warmers: a frilled white top,
      g.box(-1, -5, -1, 1, -5, 1, STRIPE); g.box(-1, -6, -1, 1, -6, 1, STRIPE2);             // pink and white stripes,
      g.box(-1, -7, -2, 1, -7, 2, STRIPE3);                                                  // bunched at the ankle
      g.box(-1, -8, -1, 1, -8, 2, SHOE); g.set(0, -8, 2, WHITE);                             // chunky pink sneakers, a white strap and buckle,
      g.box(-2, -9, -2, 2, -9, 3, SOLE);                                                     // white platform soles,
      for (let x = -2; x <= 2; x += 2) { g.set(x, -9, 3, STUD); g.set(x, -9, -2, STUD); }   // studded round the rim
      g.set(-2, -9, 1, STUD); g.set(2, -9, 1, STUD);
      if (right) {
        g.box(-1, -2, -1, 1, -2, 1, STRAP); g.set(-1, -2, 1, STUD); g.set(1, -2, 1, STUD);   // the pink studded thigh strap...
        g.box(-2, -3, -1, -2, -2, 0, BAG2); g.set(-2, -3, 1, BAG);                            // ...and the little pink cat pouch on it
        g.set(0, -3, 1, SKIN); g.set(1, -1, 1, SKIN);                                         // holes ripped in the stocking
      } else {
        g.box(-1, -3, -1, 1, -3, 1, BLACK); g.set(2, -3, 0, RIB); g.set(2, -3, 1, RIBHI);      // a black garter under the knee, a mint bow
      }
    };
    MODELS.sunna = H.humanoid({
      scale: 0.066, height: 27, width: 22,
      sockets: { weapon: ['hammer', [0, 0, 14]], off: ['gun', [0, 0, 8]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, SKIRT);                                                     // the black feathery skirt,
        g.box(-4, -2, -3, 4, -2, 2, (x, y, z) => ((x + z) & 1) ? SKIRT : SKIRT3);             // feathers on feathers,
        g.box(-5, -3, -4, 5, -3, 3, (x, y, z) => ((x + 2 * z) % 3 === 0) ? SKIRT2 : SKIRT);
        g.box(-5, -4, -4, 5, -4, 3, (x, y, z) => ((x * 5 + z * 3) & 3) ? SKIRT : -1);         // to a ragged hem
        g.cut(-3, -2, -2, 3, -2, 1); g.cut(-4, -4, -3, 4, -3, 2);                             // (hollow underneath: her legs move freely)
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, WHITE); g.box(-3, 3, -2, 3, 6, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, WHITE);   // the white blouse
        g.box(-2, 0, -2, 2, 0, 1, WHITE2);                                                     // the white belt
        g.box(-1, 6, 2, 1, 6, 2, BLACK); g.set(0, 6, 2, STUD); g.set(-2, 6, 2, WHITE2); g.set(2, 6, 2, WHITE2);   // the black choker and its ring; collar points
        g.set(0, 5, 2, TIE2); g.set(0, 4, 3, TIE); g.set(1, 3, 3, 0xffffff); g.set(1, 2, 2, TIE); g.set(2, 2, 2, TIE);   // the red tie, loose, a white sparkle
        g.set(0, 3, 2, BLACK); g.set(-2, 4, 2, BLACK2);                                        // a button; the black double-heart pin
        g.set(-2, 0, 2, DOT); g.set(-2, 1, 2, WHITE); g.set(2, 1, 2, DOT); g.set(2, 0, 2, WHITE);   // the mint polka-dot bow...
        g.box(-1, 0, 2, 1, 1, 2, BLACK);                                                       // ...on a black one,
        g.box(-1, 0, 3, 1, 1, 3, YEL); g.set(0, 1, 3, G(0xb48aff));                            // the yellow virtual pet clipped on, its screen lit
        for (const s of [-1, 1]) { g.box(s * 3, 2, 2, s * 3, 5, 2, STRAP); g.box(s * 3, 6, -2, s * 3, 6, 2, STRAP); }   // the backpack's straps
        g.set(-3, 1, 2, GOLD); g.set(-3, 0, 2, GOLD);                                          // the lanyard's yellow tassel
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: LINER, mouth: 0xd8707e, blush: 0xf9c4c8 });
        g.set(-3, 3, 3, LINER); g.set(3, 3, 3, LINER);                                         // the winged liner
        g.set(-1, 2, 3, G(0xff9ac8)); g.set(1, 2, 3, G(0xffe08a));                             // pink and yellow glints in her eyes
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 2]], sideTo: 2 });   // blunt bangs
        for (let x = -3; x <= 3; x += 2) g.set(x, 4, 4, HAIR2);
        g.box(-3, 8, -3, 3, 8, 2, HAIR); g.set(-1, 8, 1, HAIRHI); g.set(1, 8, -1, HAIRHI); g.set(0, 9, 0, HAIR);   // the crown
        g.box(-4, -2, -4, 4, -1, -4, HAIR3); g.box(-3, -3, -4, 3, -3, -4, TIPS);              // the back, to the nape, lavender at the ends
        for (let y = 4; y >= -3; y--) {                                                       // wavy to the shoulder on her right...
          const c = y >= 1 ? HAIR : y >= -1 ? HAIR2 : y >= -2 ? HAIR3 : TIPS;
          g.box(-5, y, -2, -5, y, 1, c); if (y === -1 || y === -2) g.box(-6, y, -1, -6, y, 1, c);
        }
        for (let y = 4; y >= -1; y--) g.box(5, y, -2, 5, y, 0, y >= 1 ? HAIR : HAIR2);       // ...shorter on her left, under the ponytail
        g.set(5, -2, -1, HAIR3); g.set(-5, 5, 2, HAIRHI); g.set(4, 6, 3, HAIRHI);
        g.set(-2, 6, 5, BLACK); g.box(-3, 5, 5, -1, 5, 5, BLACK);                              // the black triangle clip on her right bangs
        g.box(2, 7, 5, 3, 7, 5, BLACK); g.set(2, 6, 5, STRIPE3); g.set(3, 5, 5, STRIPE3); g.set(3, 6, 5, BLACK2);   // black clips and pink pins on her left
        for (const s of [-1, 1]) { g.set(s * 4, 0, 0, BLACK); g.set(s * 4, -1, 0, BLACK); }    // small black earrings
      },
      armL: arm(1),
      armR: arm(-1),
      legL: leg(false),
      legR: leg(true),
      extra: {
        tail: {   // the high side ponytail on her left, tied with the big mint ribbon (anim.js sways it)
          parent: 'head', at: [4, 7, -1], draw(g) {
            g.ell(0, 0, 0, 1, 1, 1, RIB2);                                                    // the knot,
            for (const dz of [-1, 1]) for (let k = 0; k <= 4; k++) g.line(0, 0, 0, 1 + k * 0.2, 5 - k * 0.6, dz * (1.2 + k * 0.7), k === 0 ? RIBHI : k < 3 ? RIB : RIB2, 0.45);   // two big stiff loops
            const path = [[1, -1, -1, 1.5, HAIR], [2, -3, -1.5, 1.6, HAIR2], [2.5, -5, -2, 1.6, HAIR2], [3, -7, -2, 1.4, HAIR3], [2.5, -9, -2.5, 1.3, HAIR3], [3, -11, -2, 1.1, HAIR4], [2.5, -12.5, -1.5, 0.9, TIPS]];
            path.forEach(([x, y, z, r, c]) => g.ell(x, y, z, r, 1.1, r * 0.9, c));             // waves out to her left and down, into lavender tips
            g.set(2, -2, 0, HAIRHI); g.set(3, -6, -1, HAIR2);
          },
        },
        pack: {   // the pink backpack, and the small white angel wings on it
          parent: 'torso', at: [0, 3, -3], draw(g) {
            g.box(-3, -2, -2, 3, 3, 0, BAG); g.box(-3, 3, -2, 3, 3, 0, BAG2); g.box(-3, -2, -2, 3, -2, 0, BAG2);
            g.box(-2, -1, -3, 2, 1, -3, BAG2); g.set(0, 0, -4, BLACK); g.set(-1, 2, -3, BLACK2); g.set(1, 2, -3, BLACK2);   // its pocket, a little speaker
            for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
              g.line(s * 3, 2 - i, -1, s * (7 + i), 3 - i * 1.6, -2, i === 0 ? WING : WING2, 0.45);
              g.set(s * (7 + i), Math.round(3 - i * 1.6), -2, G(0xf6fbff));
            }
          },
        },
        hammer: {  // the inflatable hammer, in her right hand (rot: level when her arm is out in front, as the K22 in zhuyuan.js)
          parent: 'armR', at: [0, -7, 1], rot: [0.8, 0, 0], draw(g) {
            for (let z = -1; z <= 10; z++) g.set(0, 0, z, z === 2 || z === 7 ? HPINK : z === 4 || z === 9 ? HMINT : BLACK2);   // the long handle, banded pink and mint
            g.set(0, 0, -2, HPINK);
            // the barrel head across its end: its flat ends strike (mint, ringed in pink)
            g.cyl('y', 0, 14, 3, -4, 4, (x, y, z) => {
              const r2 = x * x + (z - 14) * (z - 14);
              if (Math.abs(y) === 4) return r2 <= 1.5 ? HMINT : r2 <= 5 ? HPINK : HMINT;
              if (Math.abs(y) === 3) return HPINK;
              return z < 13 ? HAMS : HAMW;
            });
            for (const [x, y] of [[-1, 1], [0, 1], [1, 0], [-1, -1], [0, -1], [1, -2]]) g.set(x, y, 17, DARK);   // dark lettering
            g.set(-1, 3, 18, HMINT); g.set(1, 3, 18, HMINT); g.set(-1, 2, 18, HMINT); g.set(1, 2, 18, HMINT);    // the little mint ears
          },
        },
        gun: {     // the megaphone air gun, in her left hand
          parent: 'armL', at: [0, -7, 1], rot: [0.8, 0, 0], draw(g) {
            g.box(0, -3, -1, 0, -1, 0, DARK);                                                 // the grip
            g.box(-1, -1, -2, 1, 1, 3, GREY); g.box(-1, 1, -2, 1, 1, 3, GREY2);               // the grey speaker box...
            for (const z of [-1, 1]) for (const y of [-1, 0]) g.set(-1, y, z, DARK);          // ...its grille
            for (const s of [-1, 1]) { g.set(s * 2, 1, 1, DOT); g.set(s * 2, 0, 1, WHITE); g.set(s * 2, 0, 2, DOT); }   // green polka-dot bows
            for (let z = 4; z <= 7; z++) g.cyl('z', 0, 0, 0.9 + (z - 4) * 0.7, z, z, (x, y) => {   // the pink bell,
              if (z < 7) return z & 1 ? BELL : BELL2;
              const r2 = x * x + y * y; return r2 <= 1 ? DARK : r2 <= 4 ? LIME : BELL2;      // a lime ring round the dark muzzle
            });
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: the hammer's head resting on the ground before her, the air gun low in her left hand
  ANIM.READY.sunna = { armL: [-0.3, -0.1, 0.2], armR: [-0.22, 0.1, -0.14], torso: [0.05, 0.1, 0], head: [0.04, -0.1, 0.05], legL: [-0.1, 0, 0.05], legR: [0.14, 0, -0.06], hipsY: -0.02 };
  // the string: an overhead bop, a sweep right to left, a backhand sweep with a hop, and the big slam
  ACT.sunHit1 = (b, t, th, d) => stage(b, { armR: [-2.4, 0.3, -0.5], torso: [-0.1, 0.4, 0], legR: [0.3, 0, 0] }, { armR: [-0.7, -0.1, -0.1], torso: [0.25, -0.2, 0], legL: [-0.6, 0, 0], legR: [0.4, 0, 0], hipsY: -0.06 }, t, th, d);
  ACT.sunHit2 = (b, t, th, d) => stage(b, { armR: [-1.0, 1.2, -1.1], torso: [0, 0.8, 0], hipsY: -0.04 }, { armR: [-1.0, -1.1, 0.8], torso: [0.12, -0.8, 0], legL: [-0.55, 0, 0], legR: [0.35, 0, 0], hipsY: -0.08 }, t, th, d);
  ACT.sunHit3 = (b, t, th, d) => stage(b, { armR: [-1.0, -1.0, 0.9], torso: [0, -0.8, 0], legL: [0.2, 0, 0] }, { armR: [-1.0, 1.1, -1.2], torso: [0.12, 0.85, 0], legR: [-0.6, 0, 0], legL: [0.35, 0, 0], lift: 0.12 }, t, th, d);
  const UP = { armR: [-3.1, 0, -0.15], armL: [-2.2, -0.3, 0.3] };
  ACT.sunSlam = (b, t, th, d) => {
    if (t < th - 0.05) { const k = clamp(t / Math.max(0.05, th - 0.05), 0, 1); return add(b, Object.assign({ torso: [-0.3 + k * 0.15, 0, 0], legL: [-0.6 * k, 0, 0], legR: [0.3 * k, 0, 0] }, UP)); }
    return stage(b, UP, { armR: [-0.35, 0, 0.05], armL: [-0.6, -0.3, 0.3], torso: [0.6, 0, 0], legL: [-1.0, 0, 0], legR: [0.75, 0, 0], hipsY: -0.2 }, t - th + 0.07, 0.07, d - th + 0.07);
  };
  // Skyward Hammer: low, then an upswing that launches
  ACT.sunUpper = (b, t, th, d) => stage(b, { armR: [0.35, 0.2, -0.3], torso: [0.4, 0.3, 0], hipsY: -0.16, legL: [-0.7, 0, 0], legR: [0.6, 0, 0] }, { armR: [-2.9, -0.1, -0.2], torso: [-0.35, -0.2, 0], legR: [-0.9, 0, 0], legL: [0.2, 0, 0], lift: 0.35 }, t, th, d);
  // a flurry of bops (Quick Assist; the Dodge Counter ends it with the slam)
  ACT.sunFlurry = (b, t) => { const k = Math.sin(t * 32); return add(b, { armR: [-1.5 + k * 0.8, Math.sin(t * 16) * 0.5, -0.2], armL: [-0.6, -0.2, 0.3], torso: [0.25, Math.sin(t * 16) * 0.3, 0], legL: [-0.6, 0, 0.1], legR: [0.5, 0, -0.1], hipsY: -0.1 }); };
  ACT.sunCounter = (b, t, th, d) => t < 0.42 ? ACT.sunFlurry(b, t) : ACT.sunSlam(b, t - 0.42, 0.14, d - 0.42);
  // the air gun, one-handed, her left side leading; the recoil kicks the megaphone up
  const AIM = { torso: [0, -0.35, 0], head: [0, 0.3, 0], armR: [-0.15, 0.2, -0.2], legL: [-0.3, 0, 0.1], legR: [0.25, 0, -0.1] };
  ACT.sunAim = (b, t, th, d) => stage(b, Object.assign({ armL: [-0.8, 0, 0.35] }, AIM), Object.assign({ armL: [-1.15, 0, 0.35], hipsY: -0.04 }, AIM), t, th, d);
  ACT.sunShot = (b, t, th, d) => ACT.sunAim(b, t, 0.2, d);           // (she fires at 0.2; Bubblegum lands with the hit)
  // Bubblegum Barrage: braced, the gun bucks as it fires (th - 0.2: the shot, before Bubblegum's first landing)
  ACT.sunBarrage = (b, t, th, d) => { const f = th - 0.2, kick = t > f ? Math.max(0, 1 - (t - f) * 5) : 0; return add(b, Object.assign({}, AIM, { armL: [-0.85 - kick * 0.5, 0, 0.35], torso: [-kick * 0.2, -0.4, 0], legL: [-0.45, 0, 0.12], legR: [0.4, 0, -0.12], hipsY: -0.1 })); };
  // Special Photography Technique: a pose for the camera, a crouch, then the leap and the slam beside Bubblegum
  ACT.sunPhoto = (b, t, th, d) => {
    if (t < 0.55) return add(b, { armL: [-2.3, -0.2, -0.35], armR: [-1.3, 0.4, -0.3], head: [0.1, 0.2, 0.15], torso: [-0.05, -0.2, 0.05], legR: [-0.3, 0, 0] });
    if (t < 0.8) return add(b, { armR: [-0.6, 0.2, -0.2], armL: [-0.5, 0, 0.4], torso: [0.3, 0, 0], hipsY: -0.15, legL: [-0.6, 0, 0], legR: [0.4, 0, 0] });
    return ACT.sunSlam(b, t - 0.8, 0.3, d - 0.8);
  };
  // Don't Mess With the Cat: astride Bubblegum, the hammer up like a lance, then off it for the strike
  ACT.sunRide = (b, t, th, d) => t < 0.7 ? add(b, { legL: [-1.3, 0, 0.35], legR: [-1.3, 0, -0.35], torso: [0.35, 0, 0], armR: [-1.6, 0.2, -0.3], armL: [-0.9, -0.2, 0.5], head: [-0.15, 0, 0], hipsY: -0.1, roll: Math.sin(t * 18) * 0.06 }) : ACT.sunSlam(b, t - 0.7, 0.3, d - 0.7);
  // Smash It All!: three strikes, Bubblegum from the air gun, then up and down on them
  ACT.sunUlt = (b, t, th, d) => {
    if (t < 0.5) return ACT.sunHit2(b, t, 0.4, 0.5);
    if (t < 0.7) return ACT.sunHit3(b, t - 0.5, 0.1, 0.2);
    if (t < 0.95) return ACT.sunHit1(b, t - 0.7, 0.1, 0.25);
    if (t < 1.35) return ACT.sunAim(b, t - 0.95, 0.12, 0.4);
    return ACT.sunSlam(b, t - 1.35, 0.5, d - 1.35);
  };
  // Jump Training: bouncing along on the hammer, then the slam
  ACT.sunPogo = (b, t, th, d) => { if (t >= 0.62) return ACT.sunSlam(b, t - 0.62, 0.33, d - 0.62); const s = Math.abs(Math.sin(t * 10)) * 0.8; return add(b, { armR: [-0.05, 0, 0.05], armL: [-0.4, -0.3, 0.45], legL: [-1.0 + s, 0, 0.15], legR: [-1.0 + s, 0, -0.15], torso: [0.25, 0, 0], hipsY: -0.08 }); };
  // Stage Fright: the hammer thrown up across her as a shield
  ACT.sunParry = (b) => add(b, { armR: [-1.6, 0.7, -0.7], armL: [-1.1, -0.5, 0.5], torso: [0.15, -0.35, 0], hipsY: -0.1, legL: [-0.45, 0, 0.1], legR: [0.45, 0, -0.1] });

  /* ------------------------------------------------------------- effects --
     Bubblegum, her pixel-art kitten: a flat pixel cat head, pink on its
     right half and mint on its left, a white outline, small dark square
     eyes (the demo's 55-60 s). catFlight sends it from a point to a target
     (hopping from one landing to the next); markIcon floats a little one over
     an enemy under Cat's Gaze. sunCat: fired from the air gun (yellow
     lightning at the muzzle). sunPounce: it leaps in from beside her (or
     drops from above). sunFlash: the photograph. sunVeil: Delusion Reprise's
     pastel wash. sunRide: Bubblegum under her for the Chain Attack. sunBop,
     sunSlam: hammer impacts in pink and mint pixels. */
  let catProto = null;
  function catObj() {
    if (!catProto) {
      const g = new VX.Grid(), rows = { 9: [[-5, -5], [4, 4]], 8: [[-6, -4], [3, 5]], 1: [[-5, 4]], 0: [[-4, 3]] };
      const isIn = (x, y) => y >= 0 && y <= 9 && (rows[y] || [[-6, 5]]).some(([x0, x1]) => x >= x0 && x <= x1);
      for (let y = 0; y <= 9; y++) for (let x = -6; x <= 5; x++) {
        if (!isIn(x, y)) continue;
        const edge = !isIn(x - 1, y) || !isIn(x + 1, y) || !isIn(x, y - 1) || !isIn(x, y + 1);
        g.box(x, y, 0, x, y, 1, G(edge ? 0xf6f2ff : x < 0 ? PINK : MINT));
      }
      for (const x of [-3, 2]) { g.set(x, 4, 1, G(0x9a7464)); g.set(x, 3, 1, G(0x3a2430)); }
      catProto = VX.object(g, 0.09, { cast: false });
    }
    return catProto.clone();
  }
  const CAT_MID = 4.5 * 0.09;                                    // (its origin is at the bottom of the head: half its height, per unit of scale)
  const _p = new THREE.Vector3();
  const camYaw = () => (BT.B && BT.B.cam && BT.B.cam.yaw) || 0;   // turned to face the camera
  const hammerHead = a => { BT.sock(a, 'weapon', _p); if (_p.y < 0.2) _p.y = 0.2; return _p; };
  const muzzle = a => { BT.sock(a, 'off', _p); if (_p.y < 0.5) _p.y = 0.9; return _p; };
  const aimAt = (a, A, tgt) => tgt ? { x: tgt.x, y: (tgt.height || 1.5) * 0.45, z: tgt.z } : { x: a.x + Math.sin(A.dir) * 5, y: 0.8, z: a.z + Math.cos(A.dir) * 5 };
  const follow = (v, fb) => () => v && v.alive ? { x: v.x, y: (v.height || 1.5) * 0.45, z: v.z } : fb;
  function catBurst(x, y, z, s) {
    FX.burst(x, y, z, Math.round(26 * s), { col: PIX, speed: 6 * s, size: 0.14, size1: 0.05, life: 0.5, g: 4 });
    FX.glow(x, y, z, 1.8 * s, 0xff9ad0, 0.22, { size1: 3.2 * s });
    FX.ring(x, z, 0.3, 1.8 * s, MINT, 0.35); FX.ring(x, z, 0.3, 1.3 * s, PINK, 0.3, { y: 0.08 });
  }
  // Bubblegum from (x0, y0, z0) to where tgtFn() says, landing at each time in lands (s after now), hopping between them
  function catFlight(x0, y0, z0, tgtFn, lands, s, arc, onLand) {
    const o = catObj(), T = lands[lands.length - 1];
    let seg = 0, sx = x0, sy = y0, sz = z0;
    o.scale.setScalar(s * 0.4); o.position.set(x0, y0 - CAT_MID * s, z0);
    FX.custom(o, T, (k) => {
      if (!BT.B) return;
      const tau = k * T, p = tgtFn();
      while (seg < lands.length && tau >= lands[seg]) {
        catBurst(p.x, p.y, p.z, s * (seg === lands.length - 1 ? 1.3 : 0.8));
        if (onLand) onLand(seg, p);
        sx = p.x; sy = p.y; sz = p.z; seg++;
      }
      if (seg >= lands.length) return;
      const t0 = seg ? lands[seg - 1] : 0, u = clamp((tau - t0) / Math.max(0.01, lands[seg] - t0), 0, 1), h = seg ? 0.7 + seg * 0.5 : arc;
      const sc = s * Math.min(1, 0.4 + tau * 6);
      o.scale.setScalar(sc);
      o.position.set(lerp(sx, p.x, u), lerp(sy, p.y, u) + Math.sin(u * PI) * h - CAT_MID * sc, lerp(sz, p.z, u));
      o.rotation.y = camYaw(); o.rotation.z = Math.sin(tau * 25) * 0.25;
      if (Math.random() < 0.7) FX.p({ x: o.position.x + rnd(-0.2, 0.2), y: o.position.y + CAT_MID * sc, z: o.position.z + rnd(-0.2, 0.2), life: 0.3, size: 0.1, size1: 0.02, col: U.pick(PIX) });
    });
  }
  // the little pixel cat over a marked enemy's head; it goes when the mark does
  function markIcon(v) {
    if (v.snMark) return;
    const o = catObj(); o.scale.setScalar(0.32); v.snMark = o;
    FX.custom(o, 9999, () => {
      const B = BT.B;
      if (!B || !v.alive || !(v.snGaze > B.t)) { v.snMark = null; FX.kill(o); return; }
      o.position.set(v.x, (v.height || 1.5) + 0.3 + Math.sin(B.real * 4) * 0.06, v.z); o.rotation.y = camYaw();
    });
  }
  // Cat's Gaze bursting: a giant Bubblegum pops over the target
  function gazeFx(v) {
    const o = catObj(), y = (v.height || 1.5) * 0.5;
    FX.custom(o, 0.3, (k) => { const s = 0.6 + k * 1.2; o.scale.setScalar(s); o.position.set(v.x, y + 0.4 - CAT_MID * s, v.z); o.rotation.y = camYaw(); if (k >= 1) catBurst(v.x, y + 0.4, v.z, 1.5); });
    FX.glow(v.x, y, v.z, 3, 0xffffff, 0.2, { size1: 5 });
    if (BT.B) BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.25);
  }
  // the air gun's yellow lightning
  function sparks(x, y, z) {
    for (let i = 0; i < 3; i++) {
      let p = new THREE.Vector3(x, y, z);
      for (let j = 0; j < 3; j++) { const q = p.clone().add(new THREE.Vector3(rnd(-0.3, 0.3), rnd(-0.2, 0.35), rnd(-0.3, 0.3))); FX.beam(p, q, j & 1 ? 0xfff6b0 : 0xffd23a, 0.05, 0.14); p = q; }
    }
  }
  const E = CHOREO.events;
  E.sunBop = (a, A, e) => {
    const p = hammerHead(a), k = e.big ? 1.6 : 1;
    FX.burst(p.x, p.y, p.z, Math.round(14 * k), { col: PIX, speed: 4 * k, size: 0.12, size1: 0.06, life: 0.4, g: 5 });
    FX.glow(p.x, p.y, p.z, 1.1 * k, 0xff9ad0, 0.16, { size1: 1.8 * k });
  };
  E.sunSlam = (a, A, e, tgt) => {
    const B = BT.B, r = e.r || 2.4, x = e.at === 'target' && tgt ? tgt.x : a.x + Math.sin(A.dir) * 1.3, z = e.at === 'target' && tgt ? tgt.z : a.z + Math.cos(A.dir) * 1.3;
    FX.ring(x, z, 0.4, r, PINK, 0.45); FX.ring(x, z, 0.3, r * 0.7, MINT, 0.38, { y: 0.08 }); FX.named('quake', { x, z, r });
    for (let i = 0; i < 24; i++) FX.p({ x: x + rnd(-r, r) * 0.6, y: 0.2, z: z + rnd(-r, r) * 0.6, vy: rnd(2, 5), g: 6, life: 0.6, size: 0.16, size1: 0.08, col: U.pick(PIX) });
    FX.glow(x, 0.6, z, r * 1.1, 0xffb0d8, 0.25, { size1: r * 1.8 });
    B.cam.shake = Math.max(B.cam.shake, e.big ? 0.4 : 0.22); if (e.big) SFX.play('boom');
  };
  E.sunCat = (a, A, e, tgt) => {
    const m = muzzle(a), x0 = m.x, y0 = m.y, z0 = m.z, to = aimAt(a, A, tgt);
    FX.glow(x0, y0, z0, 1.2, PINK, 0.15, { size1: 2.4 }); sparks(x0, y0, z0); SFX.play('shot');
    catFlight(x0, y0, z0, follow(tgt, to), e.lands || [0.12], e.s || 0.7, e.arc != null ? e.arc : 0.4);
  };
  E.sunPounce = (a, A, e, tgt) => {
    const side = A.side || 1, to = aimAt(a, A, tgt), x0 = a.x + Math.cos(a.face) * side * 1.1, z0 = a.z - Math.sin(a.face) * side * 1.1;
    catFlight(x0, e.high ? 4.5 : 1.6, z0, follow(tgt, to), e.lands || [0.22], e.s || 0.8, e.high ? 0.5 : 1.2);
  };
  E.sunFlash = (a, A, e, tgt) => {
    const p = aimAt(a, A, tgt), r = e.r || 1.8;
    FX.glow(p.x, 1.3, p.z, 3.5, 0xffffff, 0.2, { size1: 6 }); FX.ring(p.x, p.z, 0.3, r * 1.3, 0xffffff, 0.3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {                 // the viewfinder's corners on the ground round the target
      const c = new THREE.Vector3(p.x + sx * r, 0.12, p.z + sz * r);
      FX.beam(c, new THREE.Vector3(c.x - sx * 0.7, 0.12, c.z), 0xffffff, 0.08, 0.8); FX.beam(c, new THREE.Vector3(c.x, 0.12, c.z - sz * 0.7), 0xffffff, 0.08, 0.8);
    }
    FX.glow(p.x + r, 0.3, p.z - r, 0.5, 0xff3a5a, 0.8, { size1: 0.5 });   // (REC)
    SFX.play('ui');
  };
  E.sunVeil = (a) => {
    const B = BT.B;
    [0xff9ad0, LILAC, 0x8af0ff].forEach((c, i) => FX.ring(a.x, a.z, 0.5, 4 + i * 1.2, c, 0.6 + i * 0.12, { y: 0.06 + i * 0.02 }));
    FX.pillar(a.x, a.z, 1.0, 4, 0xffb0e0, 0.6); FX.glow(a.x, 1.4, a.z, 3, 0xffd0ec, 0.4, { size1: 6 });
    for (let i = 0; i < 40; i++) { const an = rnd(0, PI * 2), r = rnd(0.5, 3.5); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.2, 1), z: a.z + Math.sin(an) * r, vy: rnd(1.5, 3.5), life: rnd(0.6, 1), size: 0.14, size1: 0.05, col: U.pick(PIX), g: -0.5 }); }
    B.cam.shake = Math.max(B.cam.shake, 0.15); SFX.play('ether');
  };
  E.sunRide = (a, A, e) => {
    const o = catObj(), dur = e.dur || 0.75;
    o.scale.setScalar(0.95);
    FX.custom(o, dur, (k) => {
      if (!BT.B) return;
      o.position.set(a.x, Math.abs(Math.sin(k * 26)) * 0.05, a.z); o.rotation.y = a.face;
      if (Math.random() < 0.8) FX.p({ x: a.x + rnd(-0.4, 0.4), y: 0.15, z: a.z + rnd(-0.4, 0.4), vy: rnd(0.3, 1.2), life: 0.35, size: 0.12, size1: 0.03, col: U.pick(PIX) });
      if (k >= 1) catBurst(a.x, 0.5, a.z, 1);
    });
  };
  // a trail of pink and mint pixels
  CHOREO.streams.sunPix = (a, A, s, dt) => {
    const n = Math.max(1, Math.round(dt * 90));
    for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.25, 0.25), y: 0.4 + rnd(0, 1) + (a.airY || 0), z: a.z + rnd(-0.25, 0.25), vy: rnd(0.2, 1), life: 0.35, size: 0.12, size1: 0.03, col: U.pick(PIX) });
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const AFTER = 0xffb0d8;
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.45 }], events: [{ t: 0.16, fx: 'sunBop' }] });
  set(K.basic[1], { motion: [{ t0: 0.04, t1: 0.2, kind: 'fwd', d: 0.5 }], events: [{ t: 0.2, fx: 'crescent', y: 0.9, tilt: 0.15, r: 2.3, arc: 2.6, col: PINK }, { t: 0.2, fx: 'sunBop' }] });
  set(K.basic[2], { motion: [{ t0: 0.04, t1: 0.22, kind: 'fwd', d: 0.5 }], events: [{ t: 0.22, fx: 'crescent', y: 1.0, tilt: -0.2, r: 2.3, arc: 2.6, col: MINT, sweep: -0.9 }, { t: 0.22, fx: 'sunBop' }] });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.42, kind: 'leap', h: 0.55, d: 0.6 }], events: [{ t: 0.42, fx: 'sunSlam', r: 2.4 }] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.24, kind: 'afterimage', col: AFTER }, { t0: 0, t1: 0.24, kind: 'sunPix' }],
    events: [{ t: 0.28, fx: 'sunBop', big: true }, { t: 0.28, fx: 'crescent', y: 1.0, tilt: 1.45, r: 1.8, arc: 2.4, col: 0xffffff }] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.1, t1: 0.2, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.18, kind: 'afterimage', col: AFTER }],
    events: [0.14, 0.24, 0.34].map(t => ({ t, fx: 'sunBop' })).concat([{ t: 0.56, fx: 'sunSlam', r: 2.2 }]) });
  // (each landing below is timed to a hit: event time + land = the hit's t)
  set(K.special, { events: [{ t: 0.2, fx: 'sunCat', lands: [0.1], s: 0.55, arc: 0.2 }] });
  set(K.ex, { motion: [{ t0: 0.22, t1: 0.4, kind: 'back', d: 0.6 }], events: [{ t: 0.22, fx: 'sunCat', lands: [0.2, 0.4, 0.7], s: 0.95 }] });
  set(K.exHold, { motion: [{ t0: 0.18, t1: 0.34, kind: 'back', d: 0.5 }], events: [{ t: 0.18, fx: 'sunCat', lands: [0.2, 0.48], s: 0.95 }] });
  set(K.photo, { motion: [{ t0: 0.8, t1: 1.1, kind: 'leap', h: 1.2, toTarget: true }], stream: [{ t0: 0.8, t1: 1.1, kind: 'sunPix' }],
    events: [{ t: 0.35, fx: 'sunFlash' }, { t: 0.4, fx: 'sunPounce', lands: [0.22] }, { t: 0.8, fx: 'sunVeil' }, { t: 0.85, fx: 'sunPounce', high: true, lands: [0.25], s: 1.1 }, { t: 1.1, fx: 'sunSlam', r: 3.0, big: true, at: 'target' }] });
  set(K.chain, { motion: [{ t0: 0, t1: 0.15, kind: 'back', d: 1.6 }, { t0: 0, t1: 0.15, kind: 'rise', h: 0.3 }, { t0: 0.15, t1: 0.6, kind: 'charge', d: 6, hit: 0.45 }, { t0: 0.65, t1: 0.82, kind: 'rise', h: 1.6 }, { t0: 0.86, t1: 1.0, kind: 'fall' }],
    stream: [{ t0: 0.15, t1: 0.6, kind: 'sunPix' }, { t0: 0.15, t1: 0.6, kind: 'afterimage', col: AFTER }],
    events: [{ t: 0, fx: 'sunRide', dur: 0.75 }, { t: 0.45, fx: 'sunBop', big: true }, { t: 1.0, fx: 'sunSlam', r: 3.2, big: true, at: 'target' }, { t: 1.0, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.3 }, { t0: 1.4, t1: 1.62, kind: 'rise', h: 2.2 }, { t0: 1.72, t1: 1.85, kind: 'fall' }], stream: [{ t0: 1.4, t1: 1.85, kind: 'sunPix' }],
    events: [{ t: 0.4, fx: 'crescent', y: 0.9, tilt: 0.15, r: 2.4, arc: 2.6, col: PINK }, { t: 0.4, fx: 'sunBop' }, { t: 0.6, fx: 'crescent', y: 1.0, tilt: -0.2, r: 2.4, arc: 2.6, col: MINT, sweep: -0.9 }, { t: 0.6, fx: 'sunBop' }, { t: 0.8, fx: 'sunBop', big: true },
      { t: 1.07, fx: 'sunCat', lands: [0.23], s: 1.4, arc: 2.5 }, { t: 1.3, fx: 'whiteFlash' }, { t: 1.85, fx: 'sunSlam', r: 4.4, big: true, at: 'target' }, { t: 1.85, fx: 'whiteFlash' }] });
  set(K.followup, { motion: [{ t0: 0, t1: 0.3, kind: 'leap', h: 0.9, d: 1.3 }, { t0: 0.3, t1: 0.6, kind: 'leap', h: 0.9, d: 1.0 }, { t0: 0.62, t1: 0.95, kind: 'leap', h: 1.3, toTarget: true }], stream: [{ t0: 0, t1: 0.95, kind: 'sunPix' }],
    events: [{ t: 0.3, fx: 'sunSlam', r: 1.6 }, { t: 0.6, fx: 'sunSlam', r: 1.6 }, { t: 0.95, fx: 'sunSlam', r: 2.6, big: true }] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.22, kind: 'toTarget', gap: 1.3 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: AFTER }], events: [{ t: 0.28, fx: 'sunBop' }, { t: 0.45, fx: 'sunBop', big: true }] });
})();
