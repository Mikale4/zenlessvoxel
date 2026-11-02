/* ============================================================================
   agents/zhuyuan.js -- Zhu Yuan, Officer 148 of the Criminal Investigation
   Special Response Team (New Eridu Public Security). S-Rank, Ether, Attack,
   Evasive Assist. Released in Version 1.0.

   ---- AN AGENT IN HER OWN FILE ---------------------------------------------
   Agents added after the first eight live in js/agents/<id>.js, each a
   self-contained file loaded after moves.js (index.html). A file:
     DATA.AGENTS[id] = { ...the schema in data.js, plus:
       town:  { routine: [4 slots of 'spot weight, ...'], chatter: [2 lines],
                lines: [what she says when you talk], chapters: [3 stories] }
              (street-life.js, lobby.js and town.js read them)
       howto: one line for HOW TO PLAY's Agent notes
       kitShow: [[label, kit key]] her own moves for the squad screen's kit
       rivalMoves: [{ k: kit key, kind, p, cd }] what a rival Proxy uses
       mech:  her mechanics, called by battle.js / ai.js / hud.js (BT.mech):
              init(a) squad(a, B) start(a, def, A) hit(a, v, h, A, attr)
              mods(a, v, h, A) -> { dmg, cr, cd, defIgnore }
              tick(a, dt, onField)  (every frame, on the field or not)
              swap(a, isIn, why)  anomaly(a, src, v, type)  disorder(a, src, v, old)
              allyHit(a, src, v, h, A)  (a teammate's hit landed)
              stunned(a, v)  (her hit Stunned v)
              incoming(a, e, h) -> true if she took the hit her own way
              atkFor(a, b) -> ATK she gives teammate b (or herself)
              ult(a) -> { def, kind, free } when she has an Ultimate without
                Decibels (free: costs none); ultUsed(a, u)
              resolve(a, btn, hold, { t, B, dash, step }) -> { def, kind } | null
              ai(a, tgt, B) -> { btn, hold, o } | null   hud(a, B) -> [strings] }
     Helpers for them: BT.hurtEnemy, BT.anomalyDamage, BT.addBuildup,
     BT.triggerAnomaly, BT.addDaze, BT.endStun(v, daze), BT.gainEnergy,
     BT.gainDecibels, BT.gainAssist, BT.atkOf, BT.enemiesIn, BT.sock, BT.log,
     BT.callout; FX.ATTR_COL[attr] = [3 colours] for an attribute of her own
     (D.ATTR / D.ANOMALY take new entries the same way).
     MODELS[id]  her voxel model (models-base.js, MB.humanoid)
     ANIM.ACT.*  her poses; CHOREO.events.* her effects; the kit's choreography
   Numbers: skill names, inputs and mechanics are the official game's (the
   research notes in each file say where from). Multipliers are the official
   level-12 values scaled to this game's tuning: DMG x0.45, Daze x0.6;
   Anomaly Buildup as datamined (/100). Which hits are heavy is not listed by
   any source: the game's usual rule (string finishers, counters, EX, Chain,
   Ultimate, assist follow-ups) decides.
   ---------------------------------------------------------------------------

   Sources: Zenless Zone Zero Wiki (Zhu Yuan, K22, Voice-Overs, Lore, DMs,
   Dialogue), zzz.gachabase.net (datamine, game data 3.4.2), Prydwen, the
   official HoYoLAB mechanics clips and "Behind the Agent" art.

   Her kit (official):
     Basic Attack: Don't Move!       5 hits: kick (Physical), shotgun blast,
                                     multi-kick (Physical), jumping blast,
                                     dashing blast. Hit 4 or 5 loads 1 Enhanced
                                     Shotshell (once a string).
     Basic Attack: Please Do Not Resist   hold Basic: Suppressive Mode, up to 3
                                     piercing shotshell shots; with Enhanced
                                     Shotshells they are Ether and much
                                     stronger (1 shell each, as the in-game
                                     text says), without, Physical.
     Dash Attack: Firepower Offensive (handgun) / Overwhelming Firepower (held:
                                     one piercing shot)
     Dodge Counter: Fire Blast (+1 shell)   Special Attack: Buckshot Blast
     EX Special Attack: Full Barrage (60 Energy, +3 shells)
     Chain Attack: Eradication Mode / Ultimate: Max Eradication Mode (+3 each):
                                     the K22's launcher form, lasers and missiles
     Quick Assist: Covering Shot (+1)   Evasive Assist: Guarded Backup
     Assist Follow-Up: Defensive Counter (+3)
     Core Passive: Special Ops Ammunition: shots that use Enhanced Shotshells
                                     deal +40% DMG, +40% more against a Stunned
                                     enemy. She starts with 6 (up to 9).
     Additional Ability: Tactical Coordination: with a Support Agent or one of
                                     her own faction (Qingyi) in the squad, +30%
                                     CRIT Rate for 10 s after an EX, Chain Attack
                                     or Ultimate.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA, H = window.MB, G = VX.glow, { ACT, stage, add } = ANIM;
  const { clamp, rnd } = U, PI = Math.PI;
  const DM = 0.45, DZ = 0.6;                          // official level-12 multipliers -> this game's
  const hit = (t, dmg, daze, bu, o) => Object.assign({ t, mult: Math.round(dmg * DM), daze: Math.round(daze * DZ), bu: bu || 0 }, o || {});
  const ETHER = 0xe45cff, PINK = 0xff6ad5, HOT = 0xffd0f4;

  /* ----------------------------------------------------------------- kit -- */
  const K = {
    basic: [
      { name: 'Basic Attack: Don\'t Move!', anim: 'zyKick', dur: 0.42, cancel: 0.3, reach: 1.6, range: 1.6, hits: [hit(0.16, 87.1, 32.6, 0, { attr: 'physical' })] },
      { name: 'Basic Attack: Don\'t Move!', anim: 'zyBlast', dur: 0.5, cancel: 0.36, reach: 3.2, range: 2.2, hits: [hit(0.18, 252.9, 146.8, 104.8, { shape: 'cone', r: 3.8, arc: 50 })] },
      { name: 'Basic Attack: Don\'t Move!', anim: 'spinKick', dur: 0.78, cancel: 0.62, reach: 1.7, range: 1.6, hits: [0.18, 0.34, 0.5].map(t => hit(t, 274.8 / 3, 143.1 / 3, 0, { attr: 'physical', shape: 'circle', at: 'front', r: 1.9 })) },
      { name: 'Basic Attack: Don\'t Move!', anim: 'zyJumpBlast', dur: 0.62, cancel: 0.46, reach: 3.0, range: 2.0, shellHit: true, hits: [hit(0.3, 302.8, 187.0, 59.1, { shape: 'cone', r: 3.6, arc: 60 })] },
      { name: 'Basic Attack: Don\'t Move!', anim: 'zySlideBlast', dur: 0.72, cancel: 0.56, reach: 3.0, range: 2.0, shellHit: true, hits: [hit(0.32, 325.0, 209.6, 60.1, { heavy: true, shape: 'cone', r: 4, arc: 60, kb: 0.9 })] },
    ],
    // Suppressive Mode: three shots, with or without Enhanced Shotshells (holdRepeat: held, it keeps firing)
    supp1: { name: 'Basic Attack: Please Do Not Resist', anim: 'zyFlipShot', dur: 0.62, cancel: 0.5, reach: 6, range: 3.2, useShell: 1, zyShot: 0, holdRepeat: true, dr: 0.4, hits: [hit(0.42, 272.3, 90.4, 54.2, { shape: 'line', r: 0.9, len: 7 })] },
    supp2: { name: 'Basic Attack: Please Do Not Resist', anim: 'zyAim', dur: 0.44, cancel: 0.34, reach: 6, range: 3.2, useShell: 1, zyShot: 1, holdRepeat: true, dr: 0.4, hits: [hit(0.14, 272.3, 90.4, 54.2, { shape: 'line', r: 0.9, len: 7 })] },
    supp3: { name: 'Basic Attack: Please Do Not Resist', anim: 'zyAimBig', dur: 0.62, cancel: 0.5, reach: 6, range: 3.2, useShell: 1, zyShot: 2, holdRepeat: true, dr: 0.4, hits: [hit(0.2, 815.8, 268.9, 162.5, { heavy: true, shape: 'line', r: 1.1, len: 7.5, kb: 0.8 })] },
    supp1p: { name: 'Basic Attack: Please Do Not Resist', anim: 'zyFlipShot', dur: 0.62, cancel: 0.5, reach: 6, range: 3.2, zyShot: 0, holdRepeat: true, dr: 0.4, hits: [hit(0.42, 107.6, 90.4, 0, { attr: 'physical', shape: 'line', r: 0.9, len: 7 })] },
    supp2p: { name: 'Basic Attack: Please Do Not Resist', anim: 'zyAim', dur: 0.44, cancel: 0.34, reach: 6, range: 3.2, zyShot: 1, holdRepeat: true, dr: 0.4, hits: [hit(0.14, 107.6, 90.4, 0, { attr: 'physical', shape: 'line', r: 0.9, len: 7 })] },
    supp3p: { name: 'Basic Attack: Please Do Not Resist', anim: 'zyAimBig', dur: 0.62, cancel: 0.5, reach: 6, range: 3.2, zyShot: 2, holdRepeat: true, dr: 0.4, hits: [hit(0.2, 322.6, 268.9, 0, { attr: 'physical', heavy: true, shape: 'line', r: 1.1, len: 7.5, kb: 0.8 })] },
    dash: { name: 'Dash Attack: Firepower Offensive', anim: 'zyPistol', dur: 0.5, cancel: 0.38, reach: 7, move: [0, 0.2, 3.2], hits: [hit(0.22, 111.2, 41.9, 50, { shape: 'line', r: 0.8, len: 5 })] },
    dashSupp: { name: 'Dash Attack: Overwhelming Firepower', anim: 'zyAim', dur: 0.5, cancel: 0.38, reach: 7, range: 3.2, useShell: 1, holdRepeat: true, zyShot: 1, move: [0, 0.16, 2.2], hits: [hit(0.2, 272.3, 90.4, 54.2, { shape: 'line', r: 0.9, len: 7 })] },
    dashSuppP: { name: 'Dash Attack: Overwhelming Firepower', anim: 'zyAim', dur: 0.5, cancel: 0.38, reach: 7, range: 3.2, holdRepeat: true, zyShot: 1, move: [0, 0.16, 2.2], hits: [hit(0.2, 107.6, 90.4, 0, { attr: 'physical', shape: 'line', r: 0.9, len: 7 })] },
    counter: { name: 'Dodge Counter: Fire Blast', anim: 'zySlideBlast', dur: 0.66, cancel: 0.5, inv: [0, 0.55], shells: 1, move: [0, 0.18, 1.2], hits: [hit(0.24, 353.9, 242.8, 95, { heavy: true, shape: 'cone', r: 4.2, arc: 70, kb: 0.9 })] },
    special: { name: 'Special Attack: Buckshot Blast', anim: 'zyBlast', dur: 0.4, cancel: 0.3, reach: 3.4, range: 2.4, cd: 1.2, dr: 0.4, hits: [hit(0.14, 37.1, 28.3, 12, { shape: 'cone', r: 3.8, arc: 55 })] },
    ex: { name: 'EX Special Attack: Full Barrage', anim: 'zyBarrage', dur: 1.25, cancel: 1.1, cost: 60, reach: 3.6, range: 2.6, inv: [0, 1.15], shells: 3,
      hits: [0.2, 0.38, 0.56, 0.74].map(t => hit(t, 130, 100, 60, { shape: 'cone', r: 4.2, arc: 55 })).concat([hit(0.98, 654.8, 320.9, 245, { heavy: true, shape: 'circle', at: 'target', r: 2.8, kb: 1.1 })]) },
    chain: { name: 'Chain Attack: Eradication Mode', anim: 'zyLauncher', dur: 1.35, inv: [0, 1.35], shells: 3,
      hits: [hit(0.45, 376, 73.4, 100, { shape: 'line', r: 1.2, len: 9 }), hit(1.0, 800, 150, 210, { heavy: true, shape: 'circle', at: 'target', r: 3.2, kb: 1.2 })] },
    ult: { name: 'Ultimate: Max Eradication Mode', anim: 'zyLauncher', dur: 2.2, inv: [0, 2.2], shells: 3,
      hits: [0.6, 0.85, 1.1].map(t => hit(t, 420, 30, 80, { shape: 'line', r: 1.3, len: 10 })).concat([hit(1.65, 2695.4, 104.1, 300, { heavy: true, shape: 'circle', at: 'target', r: 4.6, kb: 1.8 })]) },
    assist: { name: 'Evasive Assist: Guarded Backup', type: 'evasive', anim: 'dodge', dur: 0.45, inv: [0, 0.45] },
    followup: { name: 'Assist Follow-Up: Defensive Counter', anim: 'zyFollow', dur: 1.05, inv: [0, 1.0], shells: 3, move: [0, 0.25, 1.4],
      hits: [hit(0.25, 250, 160, 0, { attr: 'physical', kb: 0.4 }), hit(0.7, 462.2, 303.7, 140, { heavy: true, shape: 'cone', r: 4, arc: 60, kb: 1.0 })] },
    quick: { name: 'Quick Assist: Covering Shot', anim: 'zyBlast', dur: 0.6, inv: [0, 0.55], shells: 1, move: [0, 0.2, 2.2], hits: [hit(0.24, 103.1, 77.8, 40, { shape: 'cone', r: 4, arc: 60, kb: 0.6 })] },
  };

  /* ---------------------------------------------------------- the Agent -- */
  D.AGENTS.zhuyuan = {
    id: 'zhuyuan', name: 'Zhu Yuan', short: 'Zhu Yuan', faction: 'Criminal Investigation Special Response Team', spec: 'Attack', attr: 'ether', rank: 'S',
    color: '#4776b4', color2: '#d85c24', assist: 'evasive', stance: 'shotgun',
    blurb: 'Officer 148, captain of the Criminal Investigation Special Response Team: a stickler for the rules with no unsolved cases. Her K22 is a handgun, a shotgun and a launcher; she kicks, blasts, and holds Basic for Suppressive Mode, shotshell blasts that hit far harder with her Enhanced Shotshells.',
    stats: { hp: 8380, atk: 3100, def: 640, impact: 90, ap: 92, am: 93, cr: 0.35, cd: 1.0, er: 1.2, speed: 4.8 },
    ai: { range: 2.2, dodge: 0.78, reflex: 0.62, aggr: 1.0 },
    energyMax: 120, resource: 'shells',
    core: [
      ['Core Passive: Special Ops Ammunition', 'In Suppressive Mode, attacks that use Enhanced Shotshells deal 40% more DMG, and another 40% more to a Stunned enemy. She enters battle with 6 Enhanced Shotshells (up to 9).'],
      ['Enhanced Shotshells', 'Hold Basic for Suppressive Mode: three piercing shotshell shots, each spending 1 Enhanced Shotshell for Ether DMG (Physical, and much weaker, without one). Her string\'s 4th or 5th hit, Dodge Counter and Quick Assist load 1; her EX, Chain Attack, Ultimate and Assist Follow-Up load 3. Dash with Basic held for Overwhelming Firepower.'],
      ['Additional Ability: Tactical Coordination', 'With a Support Agent or a member of her faction in the squad: +30% CRIT Rate for 10 s after an EX Special Attack, Chain Attack or Ultimate.'],
    ],
    kit: K,
    kitShow: [['Hold', 'supp1'], ['Dash', 'dashSupp']],
    rivalMoves: [{ k: 'supp3', kind: 'core', p: 0.25, cd: 3 }],
    howto: 'Zhu Yuan: hold Basic for Suppressive Mode, piercing shotshell shots that spend her Enhanced Shotshells (+40% DMG, +40% more on a Stunned enemy; she starts with 6, up to 9; her string, Dodge Counter, EX, Chain, Ultimate and assists reload). Her assist is an Evasive Assist: she dodges the blow in Vital View, then Basic follows up.',
    mech: {
      init(a) { a.shells = 6; a.zyShot = 0; a.zyShotT = 0; a.zyTC = 0; a.zyStr = false; },
      squad(a, B) { a.zyCoord = B.squad.some(s => s !== a && (s.def.spec === 'Support' || s.def.faction === a.def.faction)); },
      start(a, def, A) {
        const B = BT.B;
        if (def === K.basic[0]) a.zyStr = false;                                  // a new string may load a shell again
        if (def.useShell) { if (a.shells >= def.useShell) { a.shells -= def.useShell; A.data.shell = true; } }
        if (def.shells) a.shells = Math.min(9, a.shells + def.shells);
        if (def.zyShot != null) { a.zyShot = (def.zyShot + 1) % 3; a.zyShotT = B.t + A.dur + 0.6; }
        if (a.zyCoord && ['ex', 'chain', 'ult'].includes(A.kind)) a.zyTC = B.t + 10;
      },
      hit(a, v, h, A) {
        if (A.def.shellHit && !a.zyStr) { a.zyStr = true; a.shells = Math.min(9, a.shells + 1); }
      },
      mods(a, v, h, A) {
        const B = BT.B;
        return { dmg: A && A.data && A.data.shell ? 0.4 + (v.stun > 0 ? 0.4 : 0) : 0, cr: a.zyTC > B.t ? 0.3 : 0 };
      },
      // held: Suppressive Mode (just after a dodge: Overwhelming Firepower). Tapped Basic is her string as usual
      resolve(a, btn, hold, c) {
        if (btn !== 'basic' || !hold) return null;
        const loaded = a.shells >= 1;
        if (c.dash) return { def: loaded ? K.dashSupp : K.dashSuppP, kind: 'core' };
        const n = a.zyShotT > c.t ? a.zyShot : 0;
        return { def: (loaded ? [K.supp1, K.supp2, K.supp3] : [K.supp1p, K.supp2p, K.supp3p])[n], kind: 'core' };
      },
      // AUTO: Suppressive Mode with shells to spend (always on a Stun), and it keeps the trigger down once it starts
      ai(a, tgt, B) {
        if (a.zyShotT > B.t && a.shells >= 1) return { btn: 'basic', hold: true };
        if (a.shells >= 3 && (tgt.stun > 0 || Math.random() < 0.22)) return { btn: 'basic', hold: true };
        return null;
      },
      hud(a, B) { return [`SHELLS ${'●'.repeat(a.shells)}${'○'.repeat(Math.max(0, 9 - a.shells))}`].concat(a.zyTC > B.t ? [`TACTICAL COORDINATION ${Math.ceil(a.zyTC - B.t)}s`] : []); },
    },
    town: {
      routine: ['cafe:t 40, news:read 25, huddle 35', 'alley:phone 35, gf:corner 25, huddle 40', 'soup:stool 35, box:cats 25, huddle 40', 'rp:door 60, rp:night 40'],
      chatter: ['Officer 148, on patrol.', 'Coffee. Maximum ice.'],
      lines: [
        'Officer 148, Zhu Yuan. If anything on Sixth Street needs looking into, report it to me. Properly, please: who, what, where.',
        'Qingyi keeps bringing me hot tea. I keep telling her I prefer my coffee iced. She keeps bringing tea.',
        'My mother\'s Bangboo needed an update. I talked her through it from the payphone across from the 141. It took... a while.',
      ],
      chapters: [
        { title: 'Maximum ice', ask: ['Manager. A request, off the record.', 'A coffee from Coff Cafe. Iced. As much ice as the cup will hold. I\'m on patrol and can\'t leave my post.'], steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'zhuyuan' }],
          scene: [['A', 'Thank you. ...There is not enough ice in this.'], ['P', 'Tin Master said that was the maximum.'], ['A', 'Then the maximum needs revising. I\'ll file a note.'], ['A', '...Still. It\'s cold, and you brought it. Mission accomplished. Ah, sorry. Habit.']] },
        { title: 'Cat or sea otter', ask: ['Miyabi insists Officer Mewmew is a sea otter. It is clearly a cat.', 'Ask Officer Mewmew yourself. I need an independent witness.'], steps: [{ t: 'talk', to: 'mewmew', reply: '(Officer Mewmew salutes. It does not say what it is. It may not know.)' }, { t: 'talk', to: 'zhuyuan' }],
          scene: [['P', 'It saluted. That\'s all I got.'], ['A', 'A salute. A cat would salute. An otter would... hold a shell, probably.'], ['A', 'The evidence is inconclusive. I\'ll tell Miyabi the case remains open.'], ['P', 'You sound pleased about that.'], ['A', '...An open case means we keep arguing about it. I don\'t mind.']] },
        { title: 'Case closed', ask: ['A Notorious has been sighted in a Hollow. The Special Response Team is short-handed.', 'Put me at the front of your squad, Manager. We close this case today.'], steps: [{ t: 'clear', f: { enc: 'boss', lead: 'zhuyuan' } }, { t: 'talk', to: 'zhuyuan' }],
          scene: [['A', 'Target neutralised. No civilian casualties. Report to follow.'], ['A', 'You called every angle before I saw it. That was good work, Manager.'], ['P', 'You did the shooting.'], ['A', 'Teamwork, then. ...Case closed. Thank you for having my back.']] },
      ],
    },
  };

  /* --------------------------------------------------------------- model --
     From the official portrait: near-black hair with a green-grey tint and
     vivid orange-red streaks in the bangs, side locks and a high ponytail,
     a grey mechanical headband with gear teeth, an orange coiled cable at
     her right jaw, red-orange eyes. A cropped royal-blue uniform jacket with
     white sleeve stripes and N.E.P.S. on the back, a silver shoulder pad with
     a gold star on her right shoulder; a black vest with a white PUBSEC tag,
     a gold badge, a pale blue collared shirt and a green-and-blue checked tie.
     A black belt with a gold star buckle and a cream pouch of six shells;
     charcoal tactical leggings with black armour plates and neon
     yellow-green straps; blue sneakers with red accents; black gloves with
     orange-and-silver cuffs. The K22 in shotgun form: blue, double-barrelled,
     red-ringed muzzles, an orange grip. 175 cm: a tall Agent. */
  {
    const HAIR = 0x2e3633, HAIR2 = 0x222826, HAIRHI = 0x535e5c, STREAK = 0xd85c24, STREAK2 = 0xb04a1c, SKIN = 0xfce9dd, EYE = 0xc0502a;
    const BLUE = 0x4776b4, BLUE2 = 0x324976, WHITE = 0xf2f4f8, BLACK = 0x161819, BLACK2 = 0x26292c, SHIRT = 0x9ea7c4, TIEG = 0x5aa83a, TIEB = 0x3a6ab4;
    const SILVER = 0xb8bec8, GOLD = 0xd9a838, CREAM = 0xf6d9b3, SHELLRED = 0xc8302a, CHAR = 0x585a5c, PLATE = 0x282d35, NEON = 0xcdee23, SHOE = 0x4e77b6, ORANGE = 0xf77c0a, GUNBLUE = 0x1c36a7, GREY = 0x6a6e76;
    const arm = (s) => g => {
      H.arm(g, { sleeve: BLUE, sleeveTo: 6, skin: SKIN, glove: BLACK, gloveLen: 2, len: 8 });
      for (let y = -1; y >= -5; y--) g.set(s, y, 0, WHITE);                         // the white sleeve stripe
      g.box(-1, -6, -1, 1, -6, 1, ORANGE); g.set(0, -6, 2, SILVER);                 // orange-and-silver wrist cuff
    };
    MODELS.zhuyuan = H.humanoid({
      scale: 0.075, height: 28, width: 20,
      sockets: { weapon: ['gun', [0, 0, 11]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, CHAR); g.box(-3, 0, -2, 3, 0, 1, BLACK);            // high-waisted leggings, the belt
        g.set(0, 0, 2, GOLD); g.set(1, 0, 2, BLACK2);                                  // gold star buckle
        g.box(-4, -2, 0, -3, 0, 2, CREAM);                                             // the cream shell pouch at her right hip...
        for (const [x, y] of [[-4, -1], [-3, -1], [-4, -2], [-3, -2]]) g.set(x, y, 3, SHELLRED);   // ...showing the shells' red caps
        g.box(3, -2, -1, 4, 0, 1, BLACK2); g.set(4, -1, 2, GUNBLUE);                   // the holster at her left hip
        g.box(-3, -2, 2, -2, -2, 2, NEON); g.box(2, -2, 2, 3, -2, 2, NEON);           // the neon straps' tops
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, BLACK); g.box(-2, 0, -2, 2, 0, 1, GREY);             // the vest to the waist, a grey band
        g.box(-3, 3, -2, 3, 6, 1, BLUE); g.box(-3, 3, -2, -3, 6, 1, BLUE2); g.box(3, 3, -2, 3, 6, 1, BLUE2);  // the cropped jacket
        g.box(-1, 2, 2, 1, 5, 2, BLACK);                                               // the black vest front, between the lapels
        g.box(-2, 3, 2, -2, 6, 2, BLUE); g.box(2, 3, 2, 2, 6, 2, BLUE);
        g.box(-1, 5, 3, 0, 5, 3, WHITE);                                               // the PUBSEC tag
        g.set(1, 4, 3, GOLD); g.set(-2, 4, 3, SHELLRED); g.set(-2, 5, 3, 0x3a6ab4);    // gold badge; the red-white-blue patch
        g.box(-1, 6, 2, 1, 6, 2, SHIRT); g.set(-1, 7, 1, SHIRT); g.set(1, 7, 1, SHIRT); // the pale blue collar
        g.set(0, 6, 3, TIEG); g.set(0, 5, 3, TIEB); g.set(0, 4, 3, TIEG);              // the checked tie
        g.box(-2, 4, -3, 2, 5, -3, WHITE);                                             // N.E.P.S. across the back
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x2a1a14, mouth: 0xc0706a });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 3], [-2, 4], [-1, 3], [0, 4], [1, 3], [2, 4], [3, 3], [4, 2]], sideTo: 2 });   // choppy bangs
        g.box(-2, 4, 4, -2, 6, 4, STREAK); g.set(-3, 5, 4, STREAK); g.set(2, 6, 4, STREAK2);   // the orange streaks in her bangs (above the eyes)
        g.box(-5, -4, -1, -5, 4, 1, HAIR); g.box(5, -4, -1, 5, 4, 1, HAIR);           // shoulder-length side locks...
        g.box(-5, -3, 1, -5, 2, 1, STREAK); g.box(5, -1, 0, 5, 3, 0, STREAK);         // ...streaked orange
        g.box(-4, -2, -4, 4, 1, -4, HAIR2);
        g.set(0, 9, 1, HAIR); g.set(-2, 8, 2, HAIRHI); g.set(2, 8, 1, HAIRHI);        // the cowlick
        for (let x = -3; x <= 3; x++) g.set(x, 8, -1, (x & 1) ? GREY : SILVER);       // the gear-toothed headband over the crown
        g.set(-4, 7, -1, GREY); g.set(4, 7, -1, GREY);
        for (let y = -1; y >= -4; y--) g.set(-5, y, 2, (y & 1) ? ORANGE : STREAK2);   // the coiled cable at her right jaw
      },
      armL: arm(1),
      armR(g) { arm(-1)(g); g.box(-2, 1, -2, 1, 2, 2, SILVER); g.set(-2, 2, 0, GOLD); g.set(-2, 1, 1, SILVER); },   // the shoulder pad, a gold star
      legL(g) {
        H.leg(g, { pant: CHAR, boot: SHOE, bootH: 2, sole: 0xf0f0f4 });
        g.box(-1, -3, 2, 1, -1, 2, PLATE); g.box(-1, -5, 2, 1, -5, 2, PLATE); g.box(-1, -7, 2, 1, -6, 2, PLATE);   // thigh, knee and shin plates
        g.box(-1, -2, -1, 1, -2, 1, NEON); g.set(0, -8, 2, SHELLRED);                  // a neon strap; red on the sneaker
      },
      legR(g) {
        H.leg(g, { pant: CHAR, boot: SHOE, bootH: 2, sole: 0xf0f0f4 });
        g.box(-1, -3, 2, 1, -1, 2, PLATE); g.box(-1, -5, 2, 1, -5, 2, PLATE); g.box(-1, -7, 2, 1, -6, 2, PLATE);
        g.box(-1, -1, -1, 1, -1, 1, NEON); g.set(0, -8, 2, SHELLRED);
      },
      extra: {
        tail: {   // the high ponytail, streaked orange, falling behind her
          parent: 'head', at: [0, 7, -4], draw(g) {
            g.box(-1, -1, 0, 1, 1, 1, GREY);
            const path = [[0, 1, -1], [0, 1, -2], [0, 0, -3], [0, -2, -4], [0, -4, -4], [0, -6, -4], [0, -8, -4], [0, -10, -3]];
            path.forEach(([x, y, z], i) => g.ell(x, y, z, i < 5 ? 1.8 : 1.3, 1.2, i < 5 ? 1.5 : 1.1, i === 2 || i === 5 ? STREAK : i % 2 ? HAIR2 : HAIR));
          },
        },
        gun: {    // the K22 as a shotgun, held at the hip (rot: level when her arm is out at hip-fire)
          parent: 'armR', at: [0, -7, 1], rot: [0.8, 0, 0], draw(g) {
            g.box(-1, -1, -3, 1, 0, 2, GUNBLUE); g.box(-1, 1, -2, 1, 1, 1, BLUE2);    // the receiver
            g.box(-1, -1, 3, 1, 0, 10, GUNBLUE); g.set(0, 1, 6, SILVER);               // the double barrel
            g.set(-1, -1, 11, SHELLRED); g.set(1, -1, 11, SHELLRED); g.set(-1, 0, 11, SHELLRED); g.set(1, 0, 11, SHELLRED);   // red-ringed muzzles
            g.box(0, -3, -2, 0, -2, -1, ORANGE);                                       // the orange grip
            g.box(-1, -1, -6, 1, 0, -4, BLUE2); g.set(0, 1, 0, CREAM);                 // the stock; a cream shell window
          },
        },
      },
    });
  }

  /* --------------------------------------------------------------- poses -- */
  // her ready stance: the shotgun at the hip in both hands
  ANIM.READY.shotgun = { armL: [-0.95, 0.45, 0.35], armR: [-0.8, 0, -0.12], torso: [0.06, 0.18, 0], head: [0, -0.15, 0], legL: [-0.25, 0, 0.08], legR: [0.2, 0, -0.08], hipsY: -0.03 };
  const HIP = { armL: [-0.95, 0.45, 0.35], armR: [-0.8, 0, -0.12] };
  ACT.zyKick = (b, t, th, d) => stage(b, { legR: [0.5, 0, 0], torso: [-0.1, 0.3, 0], armL: HIP.armL, armR: HIP.armR }, { legR: [-1.7, 0, 0], torso: [-0.3, -0.1, 0], armL: [-0.7, 0.3, 0.6], armR: [-0.6, 0, -0.3] }, t, th, d);
  // a blast from the hip: the recoil rocks her back
  ACT.zyBlast = (b, t, th, d) => stage(b, { armL: HIP.armL, armR: HIP.armR, torso: [0.12, 0.2, 0], legL: [-0.45, 0, 0.1], legR: [0.35, 0, -0.1], hipsY: -0.06 }, { armL: [-0.8, 0.45, 0.35], armR: [-0.62, 0, -0.12], torso: [-0.18, 0.2, 0], legL: [-0.45, 0, 0.1], legR: [0.35, 0, -0.1], hipsY: -0.08 }, t, th, d);
  ACT.zyJumpBlast = (b, t, th, d) => add(ACT.zyBlast(b, t, th, d), { legL: [-1.1, 0, 0], legR: [-0.4, 0, 0], armR: [0.35, 0, 0], armL: [0.35, 0, 0] });   // tucked in the air, firing down
  ACT.zySlideBlast = (b, t, th, d) => add(ACT.zyBlast(b, t, th, d), { legL: [-1.0, 0, 0.1], legR: [0.9, 0, -0.1], hipsY: -0.22, torso: [-0.15, 0, 0] });   // a low slide, then the blast
  ACT.zyPistol = (b, t, th, d) => stage(b, { armR: [-1.2, 0, -0.3], torso: [0.25, 0.4, 0], legL: [-0.7, 0, 0], legR: [0.5, 0, 0] }, { armR: [-1.5, 0, 0], armL: [-0.3, 0, 0.6], torso: [0.15, 0.3, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0] }, t, th, d);
  // Suppressive Mode: a backflip into a braced stance, then shots that shove her back
  ACT.zyAim = (b, t, th, d) => stage(b, { armL: [-0.9, 0.5, 0.3], armR: [-0.8, 0, -0.1], torso: [0.18, 0.3, 0], legL: [-0.6, 0, 0.15], legR: [0.5, 0, -0.15], hipsY: -0.12 }, { armL: [-0.75, 0.5, 0.3], armR: [-0.62, 0, -0.1], torso: [-0.1, 0.3, 0], legL: [-0.6, 0, 0.15], legR: [0.5, 0, -0.15], hipsY: -0.14 }, t, th, d);
  ACT.zyAimBig = (b, t, th, d) => add(ACT.zyAim(b, t, th, d), { torso: [t > th ? -0.15 : 0, 0, 0], hipsY: -0.04 });
  ACT.zyFlipShot = (b, t, th, d) => t < 0.32 ? add(b, { legL: [-1.4, 0, 0.2], legR: [-1.4, 0, -0.2], armL: [-0.9, 0.4, 0.4], armR: [-0.8, 0, -0.2], torso: [0.4, 0, 0], tilt: clamp(t / 0.32, 0, 1) * PI * 2, lift: 0.3 * Math.sin(t / 0.32 * PI) }) : ACT.zyAim(b, t - 0.32, th - 0.32, d - 0.32);
  // Full Barrage: a stream of blasts, the gun bucking in her hands
  ACT.zyBarrage = (b, t, th, d) => add(ACT.zyAim(b, 0.2, 0.1, 1), { armR: [Math.max(0, Math.sin(t * 34)) * 0.18, 0, 0], armL: [Math.max(0, Math.sin(t * 34)) * 0.14, 0, 0], torso: [-Math.max(0, Math.sin(t * 34)) * 0.06, 0, 0] });
  // the launcher on her shoulder (Chain Attack, Ultimate)
  ACT.zyLauncher = (b, t) => add(b, { armR: [-2.5, 0.2, -0.35], armL: [-1.55, 0.4, 0.45], torso: [-0.12, 0.35, 0], head: [0.05, -0.3, 0], legL: [-0.55, 0, 0.15], legR: [0.45, 0, -0.15], hipsY: -0.1, roll: Math.sin(t * 30) * (t > 0.4 ? 0.015 : 0) });
  ACT.zyFollow = (b, t, th, d) => t < 0.45 ? ACT.zyKick(b, t, 0.25, 0.45) : ACT.zyBlast(b, t - 0.45, 0.25, d - 0.45);

  /* ------------------------------------------------------------- effects --
     zyShot: a muzzle flash at the K22 and a cone of Ether pellets (line: a
     piercing slug's streak instead; big: more of everything). zyMissiles:
     missiles arcing from the launcher to the target; zyLaser: a beam to it. */
  const _m = new THREE.Vector3();
  const muzzle = a => { BT.sock(a, 'weapon', _m); if (_m.y < 0.5) _m.y = 1.0; return _m; };
  CHOREO.events.zyShot = (a, A, e) => {
    const B = BT.B, dir = A.dir, m = muzzle(a), big = e.big ? 1.8 : 1, col = e.col || ETHER;
    FX.glow(m.x, m.y, m.z, 1.1 * big, 0xffffff, 0.12, { size1: 2.2 * big });
    FX.glow(m.x, m.y, m.z, 1.6 * big, col, 0.2, { size1: 3 * big });
    if (e.line) {
      const L = e.len || 7, p1 = new THREE.Vector3(m.x + Math.sin(dir) * L, m.y, m.z + Math.cos(dir) * L);
      FX.beam(m.clone(), p1, col, 0.16 * big, 0.22); FX.beam(m.clone(), p1, 0xffffff, 0.06 * big, 0.14);
    } else {
      for (let i = 0; i < 26 * big; i++) {
        const a2 = dir + rnd(-0.42, 0.42), sp = rnd(9, 15);
        FX.p({ x: m.x, y: m.y, z: m.z, vx: Math.sin(a2) * sp, vy: rnd(-0.6, 0.9), vz: Math.cos(a2) * sp, drag: 2.2, life: 0.32, size: 0.12, size1: 0.02, col: U.pick([col, PINK, HOT, 0x5a2a8a]) });
      }
    }
    B.cam.shake = Math.max(B.cam.shake, 0.06 * big); SFX.play(e.big ? 'boom' : 'shot');
  };
  CHOREO.events.zyMissiles = (a, A, e, tgt) => {
    const m = muzzle(a), tx = tgt ? tgt.x : a.x + Math.sin(A.dir) * 6, tz = tgt ? tgt.z : a.z + Math.cos(A.dir) * 6, T = 0.45, g = 18;
    for (let i = 0; i < (e.n || 6); i++) {
      const x1 = tx + rnd(-1.4, 1.4), z1 = tz + rnd(-1.4, 1.4), y0 = m.y + 0.4;
      FX.p({ x: m.x, y: y0, z: m.z, vx: (x1 - m.x) / T, vy: (0.3 - y0) / T + g * T / 2, vz: (z1 - m.z) / T, g, life: T, size: 0.22, size1: 0.12, col: U.pick([0xfff0c0, 0xffb040]) });
    }
    FX.glow(m.x, m.y + 0.4, m.z, 1.4, 0xffc060, 0.2);
  };
  CHOREO.events.zyBoom = (a, A, e, tgt) => {
    const x = tgt ? tgt.x : a.x + Math.sin(A.dir) * 6, z = tgt ? tgt.z : a.z + Math.cos(A.dir) * 6, r = e.r || 3;
    FX.burst(x, 0.8, z, 50, { col: [0xffffff, ETHER, PINK, 0x5a2a8a, 0xffd060], speed: 8, size: 0.2, size1: 0.04, life: 0.6, g: 2, up: 1.5 });
    FX.glow(x, 1, z, r * 1.2, ETHER, 0.35, { size1: r * 2 }); FX.ring(x, z, 0.4, r, PINK, 0.4); FX.ring(x, z, 0.3, r * 0.6, 0xffffff, 0.3);
    BT.B.cam.shake = Math.max(BT.B.cam.shake, e.big ? 0.4 : 0.25); SFX.play('boom');
  };
  CHOREO.events.zyLaser = (a, A, e, tgt) => {
    const m = muzzle(a), L = e.len || 9, tx = tgt ? tgt.x : m.x + Math.sin(A.dir) * L, tz = tgt ? tgt.z : m.z + Math.cos(A.dir) * L;
    const p1 = new THREE.Vector3(tx, 0.9, tz);
    FX.beam(new THREE.Vector3(m.x, m.y + 0.5, m.z), p1, 0xffb040, 0.2, 0.3); FX.beam(new THREE.Vector3(m.x, m.y + 0.5, m.z), p1, 0xfff4d0, 0.08, 0.22);
    FX.burst(tx, 0.9, tz, 18, { col: [0xffffff, 0xffc060, ETHER], speed: 6, size: 0.1, life: 0.3 });
  };

  /* -------------------------------------------------------- choreography -- */
  const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
  const shot = (t, o) => Object.assign({ t, fx: 'zyShot' }, o || {});
  set(K.basic[0], { motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.5 }], events: [{ t: 0.16, fx: 'crescent', y: 0.7, tilt: 0.6, r: 1.6, arc: 1.6, col: 0xfff0c0 }] });
  set(K.basic[1], { motion: [{ t0: 0.18, t1: 0.3, kind: 'back', d: 0.25 }], events: [shot(0.18)] });
  set(K.basic[2], { motion: [{ t0: 0.02, t1: 0.5, kind: 'fwd', d: 0.6, ease: 'lin' }], events: [0.18, 0.34, 0.5].map(t => ({ t, fx: 'crescent', y: 0.8, tilt: 0.4, r: 1.7, arc: 2.2, col: 0xfff0c0 })) });
  set(K.basic[3], { motion: [{ t0: 0.04, t1: 0.42, kind: 'leap', h: 1.1, d: 0.6 }], events: [shot(0.3, { big: true })] });
  set(K.basic[4], { motion: [{ t0: 0.02, t1: 0.3, kind: 'fwd', d: 1.6 }], stream: [{ t0: 0.02, t1: 0.3, kind: 'dust' }], events: [shot(0.32, { big: true })] });
  for (const k of ['supp1', 'supp1p']) set(K[k], { motion: [{ t0: 0, t1: 0.32, kind: 'back', d: 1.2 }, { t0: 0.42, t1: 0.52, kind: 'back', d: 0.3 }], events: [shot(0.42, { line: true })] });
  for (const k of ['supp2', 'supp2p']) set(K[k], { motion: [{ t0: 0.14, t1: 0.24, kind: 'back', d: 0.25 }], events: [shot(0.14, { line: true })] });
  for (const k of ['supp3', 'supp3p']) set(K[k], { motion: [{ t0: 0.2, t1: 0.36, kind: 'back', d: 0.6 }], events: [shot(0.2, { line: true, big: true, len: 7.5 })] });
  for (const k of ['dashSupp', 'dashSuppP']) set(K[k], { motion: [{ t0: 0, t1: 0.16, kind: 'fwd', d: 2.2 }], stream: [{ t0: 0, t1: 0.16, kind: 'afterimage', col: 0x8a9ad8 }], events: [shot(0.2, { line: true })] });
  set(K.dash, { motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 2.2 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: 0x8a9ad8 }], events: [shot(0.22, { line: true, len: 5, col: 0xff8a6a })] });
  set(K.counter, { motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.0, side: 'auto' }, { t0: 0.12, t1: 0.24, kind: 'fwd', d: 1.0 }], stream: [{ t0: 0, t1: 0.2, kind: 'afterimage', col: 0x8a9ad8 }], events: [shot(0.24, { big: true })] });
  set(K.special, { events: [shot(0.14)] });
  set(K.ex, { motion: [{ t0: 0.2, t1: 0.9, kind: 'back', d: 0.8, ease: 'lin' }], events: [0.2, 0.38, 0.56, 0.74].map(t => shot(t)).concat([shot(0.98, { big: true }), { t: 0.98, fx: 'zyBoom', r: 2.8 }]) });
  set(K.chain, { motion: [{ t0: 0, t1: 0.25, kind: 'back', d: 1.0 }], events: [{ t: 0.45, fx: 'zyLaser' }, { t: 0.55, fx: 'zyMissiles', n: 8 }, { t: 1.0, fx: 'zyBoom', r: 3.2 }, { t: 1.0, fx: 'whiteFlash' }] });
  set(K.ult, { motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 1.2 }], events: [0.6, 0.85, 1.1].map(t => ({ t, fx: 'zyLaser', len: 10 })).concat([{ t: 1.2, fx: 'zyMissiles', n: 14 }, { t: 1.65, fx: 'zyBoom', r: 4.6, big: true }, { t: 1.65, fx: 'whiteFlash' }]) });
  set(K.followup, { motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.2 }, { t0: 0.5, t1: 0.7, kind: 'back', d: 0.6 }], events: [{ t: 0.25, fx: 'crescent', y: 0.8, tilt: 0.5, r: 1.8, arc: 2.0, col: 0xfff0c0 }, shot(0.7, { big: true })] });
  set(K.quick, { motion: [{ t0: 0, t1: 0.24, kind: 'toTarget', gap: 2.0 }], stream: [{ t0: 0, t1: 0.22, kind: 'afterimage', col: 0x8a9ad8 }], events: [shot(0.24, { big: true })] });
})();
