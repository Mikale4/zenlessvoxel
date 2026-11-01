/* ============================================================================
   moves.js -- how each Agent moves, matched to the official skill previews
   (Zenless Zone Zero Wiki clips, Burnice's official mechanics clips).

   Every skill can carry, on top of its numbers in data.js:
     anim     the pose sequence (defined below with the pose toolkit)
     motion   [{ t0, t1, kind, d, h, side, gap, ease }]
              kind: 'fwd' | 'back' | 'side' | 'toTarget' | 'leap' | 'rise' | 'fall'
     stream   [{ t0, t1, kind, from, len }]   continuous effects (flame jets,
              fire rings, ink and pink trails) while the move plays
     events   [{ t, fx, ... }]                one-shot moments: a thrown shield,
              a crescent wave, an ink pillar, the bird's dive, a transformation
   The CHOREO runtime below plays these for the battle (battle.js calls
   CHOREO.start / step / end around every Agent action).

   CAESAR    wide orange crescent arcs; a shield-first rolling rush; sidestep
             then stab; a thrown spinning shield; leaping overhead slams that
             burst into fire rings.
   BURNICE   mid-range: long flame jets from both nozzles, one-handed spray
             while sidestepping, spinning inside a ring of fire, fire blasts
             that run along the ground, and an Ultimate that leaps and hoses the
             ground below.
   ARIA      mech-fist slashes leaving pink arcs, flying and axe kicks, a
             leap that crashes down in a pink shockwave; Fandom Power appears
             as little teal critters; her Ultimate turns her into her Construct.
   YIXUAN    flowing palms trailing gold-and-black ink; her bird swoops in on
             strikes; gold ink pillars from the sky; an ink circle on the
             ground; an ink orb that swallows the target and bursts.
   ========================================================================== */
(function () {
  'use strict';
  const { clamp, rnd, dist, ang, lerp } = U;
  const { ACT, stage, add, mix } = ANIM;
  const PI = Math.PI;

  /* ================================================================ POSES */
  // Caesar
  ACT.csSlash1 = (b, t, th, d) => stage(b, { armR: [-1.5, 1.0, -1.2], torso: [0, 0.9, 0], legL: [-0.4, 0, 0] }, { armR: [-1.4, -1.1, 0.9], torso: [0.1, -0.9, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0] }, t, th, d);
  ACT.csSlash2 = (b, t, th, d) => stage(b, { armR: [-0.3, -0.6, 0.8], torso: [0.2, -0.6, 0], hipsY: -0.1 }, { armR: [-2.7, 0.5, -0.6], torso: [-0.25, 0.6, 0], legR: [-0.6, 0, 0] }, t, th, d);
  ACT.csSpin = (b, t, th, d) => add(stage(b, { armR: [-1.5, 0, -1.3], hipsY: -0.08 }, { armR: [-1.5, 0, -1.4], armL: [-1.2, 0, 1.0], hipsY: -0.1 }, t, th, d), { spin: clamp((t - th * 0.4) / (th * 0.9), 0, 1) * PI * 2 });
  ACT.csStab = (b, t, th, d) => stage(b, { armR: [-0.2, 0, -0.4], armL: [-1.2, 0.3, 0.2], torso: [0, 0.7, 0], legR: [0.5, 0, 0] }, { armR: [-1.65, -0.2, 0.15], armL: [-0.6, 0, 0.3], torso: [0.3, -0.5, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.12 }, t, th, d);
  ACT.csLeapSlam = (b, t, th, d) => {
    if (t < th - 0.04) { const k = t / (th - 0.04); return add(b, { armR: [-3.0, 0, -0.3], armL: [-2.6, 0, 0.4], torso: [-0.3 + k * 0.2, 0, 0], legL: [-0.9 * k, 0, 0], legR: [0.5 * k, 0, 0] }); }
    return stage(b, { armR: [-3.0, 0, -0.3] }, { armR: [-0.35, 0, 0.1], armL: [-1.1, 0, 0.3], torso: [0.65, 0, 0], legL: [-1.0, 0, 0], legR: [0.8, 0, 0], hipsY: -0.2 }, t - th + 0.06, 0.06, d - th + 0.06);
  };
  ACT.csRush = (b, t) => add(b, { armL: [-1.45, -0.2, 0], armR: [0.4, 0, -0.3], torso: [0.55, -0.3, 0], hipsY: -0.18, legL: [-1.0, 0, 0], legR: [0.8, 0, 0], roll: Math.sin(t * 20) * 0.05 });
  ACT.csToss = (b, t, th, d) => stage(b, { armL: [-0.8, 1.2, 1.2], torso: [0, 0.9, 0] }, { armL: [-1.5, -0.9, -0.2], torso: [0.1, -0.7, 0], armR: [-0.5, 0, -0.5] }, t, th, d);
  ACT.csCatchSlash = (b, t, th, d) => t < th * 0.5 ? ACT.csToss(b, t, th * 0.5, th) : ACT.csSlash1(b, t - th * 0.5, th * 0.5, d - th * 0.5);
  ACT.csOSB = (b, t, th, d) => stage(b, { armL: [-0.4, 1.0, 0.6], torso: [0, 0.8, 0], hipsY: -0.12, legR: [0.6, 0, 0] }, { armL: [-1.6, -0.3, 0.0], torso: [0.3, -0.6, 0], legL: [-1.1, 0, 0], legR: [0.7, 0, 0], hipsY: -0.14 }, t, th, d);
  // Burnice
  ACT.bnSpray = (b, t) => add(b, { armL: [-0.3 + Math.sin(t * 40) * 0.04, -0.15, 0.15], armR: [-0.3 + Math.cos(t * 40) * 0.04, 0.15, -0.15], torso: [-0.08, Math.sin(t * 7) * 0.12, 0], hipsY: -0.05, legL: [-0.35, 0, 0.1], legR: [0.35, 0, -0.1] });
  ACT.bnSprayR = (b, t) => add(b, { armR: [-0.35 + Math.sin(t * 40) * 0.04, 0.1, -0.1], armL: [0.25, 0, 0.5], torso: [-0.05, -0.35, 0], hipsY: -0.05, legL: [-0.4, 0, 0.12], legR: [0.3, 0, -0.1] });
  ACT.bnSprayL = (b, t) => add(b, { armL: [-0.35 + Math.sin(t * 40) * 0.04, -0.1, 0.1], armR: [0.25, 0, -0.5], torso: [-0.05, 0.35, 0], hipsY: -0.05, legR: [-0.4, 0, -0.12], legL: [0.3, 0, 0.1] });
  ACT.bnSide = (b, t) => add(ACT.bnSprayR(b, t), { legL: [0, 0, 0.5 + Math.sin(t * 14) * 0.3], legR: [0, 0, -0.2 + Math.sin(t * 14) * 0.3], roll: 0.12 });
  ACT.bnKick = (b, t, th, d) => add(stage(b, { legR: [0.4, 0, 0], torso: [0, 0.5, 0], armL: [-0.2, 0, 0.6] }, { legR: [-1.6, 0, -0.3], torso: [-0.3, -0.4, 0], armL: [0.2, 0, 0.9], armR: [0.2, 0, -0.9] }, t, th, d), { spin: clamp(t / (th + 0.05), 0, 1) * PI * 2 });
  ACT.bnBlast = (b, t, th, d) => stage(b, { armL: [-0.3, -0.1, 0.1], armR: [-0.3, 0.1, -0.1], torso: [0.15, 0, 0], hipsY: -0.1, legL: [-0.5, 0, 0], legR: [0.5, 0, 0] }, { armL: [-0.75, -0.1, 0.1], armR: [-0.75, 0.1, -0.1], torso: [-0.35, 0, 0], hipsY: -0.06, legL: [-0.5, 0, 0], legR: [0.5, 0, 0], lift: 0.05 }, t, th, d);
  ACT.bnSpin = (b, t) => add(b, { armL: [-0.35, 0, 1.45], armR: [-0.35, 0, -1.45], spin: t * 11, hipsY: -0.06, torso: [0.05, 0, 0] });
  ACT.bnThrust = (b, t, th, d) => stage(b, { armR: [0.3, 0, -0.2], torso: [0.3, 0.5, 0], hipsY: -0.12 }, { armR: [-0.7, 0, 0.1], armL: [0.4, 0, 0.4], torso: [0.35, -0.3, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0] }, t, th, d);
  ACT.bnAir = (b, t) => add(b, { armL: [0.55, -0.2, 0.3], armR: [0.55, 0.2, -0.3], torso: [0.45, Math.sin(t * 5) * 0.2, 0], legL: [-1.2, 0, 0.2], legR: [-0.7, 0, -0.2], tilt: 0.35 });
  ACT.bnDash = (b, t) => add(b, { armL: [0.5, 0, 0.3], armR: [-0.4, 0, -0.2], torso: [0.45, 0, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.08 });
  // Aria
  ACT.arFistR = (b, t, th, d) => stage(b, { armR: [-1.4, 1.1, -1.2], torso: [0, 0.8, 0] }, { armR: [-1.5, -1.0, 0.8], torso: [0.1, -0.8, 0.05], legL: [-0.5, 0, 0] }, t, th, d);
  ACT.arFistL = (b, t, th, d) => stage(b, { armL: [-0.2, -0.6, 0.8], torso: [0.15, -0.4, 0], hipsY: -0.12 }, { armL: [-2.8, 0.3, 0.2], torso: [-0.3, 0.3, 0], legR: [-0.8, 0, 0], lift: 0.25 }, t, th, d);
  ACT.arSpinKick = (b, t, th, d) => add(stage(b, { legR: [0.3, 0, 0], armL: [-0.6, 0, 1.0], armR: [-0.6, 0, -1.0], lift: 0.1 }, { legR: [-1.5, 0, -0.5], armL: [-0.4, 0, 1.3], armR: [-0.4, 0, -1.3], lift: 0.35, torso: [-0.2, 0, 0] }, t, th, d), { spin: clamp(t / (th + 0.06), 0, 1) * PI * 2 });
  ACT.arFlyKick = (b, t, th, d) => add(b, { legR: [-1.55, 0, 0], legL: [0.6, 0, 0], torso: [-0.5, 0, 0], armL: [0.6, 0, 0.8], armR: [0.6, 0, -0.8], tilt: -0.55 * Math.sin(clamp(t / d, 0, 1) * PI) });
  ACT.arAxeKick = (b, t, th, d) => stage(b, { legR: [-2.6, 0, 0], torso: [-0.35, 0, 0], armL: [-0.8, 0, 1.0], armR: [-0.8, 0, -1.0] }, { legR: [-0.2, 0, 0], torso: [0.5, 0, 0], armL: [-0.3, 0, 0.6], armR: [-0.3, 0, -0.6], hipsY: -0.15 }, t, th, d);
  ACT.arCrash = (b, t, th, d) => {
    if (t < th - 0.08) { const k = clamp(t / (th - 0.08), 0, 1); return add(b, { armL: [-2.9, 0, 0.2], armR: [-2.9, 0, -0.2], torso: [-0.25, 0, 0], legL: [-1.0 * k, 0, 0], legR: [-0.6 * k, 0, 0], spin: k > 0.35 ? (k - 0.35) / 0.65 * PI * 2 : 0 }); }
    return stage(b, { armL: [-2.9, 0, 0.2], armR: [-2.9, 0, -0.2] }, { armL: [-0.6, -0.4, 0.1], armR: [-0.6, 0.4, -0.1], torso: [0.6, 0, 0], legL: [-1.1, 0, 0.2], legR: [0.8, 0, -0.2], hipsY: -0.22 }, t - th + 0.1, 0.08, d - th + 0.1);
  };
  ACT.arGather = (b, t, th, d) => t < th - 0.12 ? add(b, { armL: [-1.0, -0.8, 0.3], armR: [-1.0, 0.8, -0.3], hipsY: -0.14, torso: [0.25, 0, 0], head: [0.2, 0, 0], legL: [-0.4, 0, 0], legR: [0.4, 0, 0] }) : ACT.arCrash(b, t - (th - 0.12) + 0.3, 0.42, d - th + 0.42);
  ACT.arIdol = (b, t, th, d) => stage(b, { armR: [-2.6, -0.4, -0.6], armL: [-0.3, 0, 0.7], head: [-0.1, 0, 0.15], torso: [0, 0, 0.1] }, { armR: [-1.7, 0.4, 0.4], armL: [-0.5, 0, 1.2], legR: [-1.3, 0, 0], torso: [-0.2, 0, 0], lift: 0.2 }, t, th, d);
  // Yixuan
  ACT.yxRise = (b, t, th, d) => stage(b, { legL: [0.3, 0, 0], torso: [0.1, 0.4, 0], armR: [-0.4, 0, -0.6] }, { legL: [-2.4, 0, 0.3], torso: [-0.45, -0.2, 0], armL: [0.3, 0, 0.9], armR: [-0.9, 0, -1.1], lift: 0.3 }, t, th, d);
  ACT.yxSeal = (b, t) => add(b, { armL: [-1.35, -0.75, 0.0], armR: [-1.35, 0.75, 0.0], torso: [0.05, 0, 0], head: [0.15, 0, 0], hipsY: -0.06, legL: [-0.3, 0, 0.12], legR: [0.3, 0, -0.12], lift: Math.sin(t * 3) * 0.04 });
  ACT.yxWide = (b, t, th, d) => stage(b, { armL: [-1.0, 0, 0.4], armR: [-1.0, 0, -0.4], torso: [0.2, 0, 0] }, { armL: [-1.4, 0, 1.4], armR: [-1.4, 0, -1.4], torso: [-0.3, 0, 0], head: [-0.25, 0, 0], lift: 0.4 }, t, th, d);
  ACT.yxBackStrike = (b, t, th, d) => t < th * 0.55 ? add(b, { torso: [-0.35, 0.3, 0], armL: [-0.9, 0, 0.6], armR: [-0.3, 0, -0.3], legL: [0.4, 0, 0], legR: [-0.2, 0, 0], lift: 0.15 }) : ACT.palmR(b, t - th * 0.55, th * 0.45, d - th * 0.55);

  /* ====================================================== CHOREOGRAPHY --
     Per Agent, per kit entry. Hit times in data.js are re-timed here where
     the motion needs it (a leap lands when the hit lands). */
  const CH = {};
  const basic = (id, i) => DATA.AGENTS[id].kit.basic[i];
  const sync = (def, hitTimes) => { if (!def.hits) return; hitTimes.forEach((t, i) => { if (def.hits[i]) def.hits[i].t = t; }); };

  // ------------------------------------------------------------- Caesar
  CH.caesar = () => {
    const K = DATA.AGENTS.caesar.kit;
    const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
    set(K.basic[0], { anim: 'csSlash1', dur: 0.46, motion: [{ t0: 0.04, t1: 0.18, kind: 'fwd', d: 0.6 }], events: [{ t: 0.17, fx: 'crescent', y: 1.0, tilt: -0.2, r: 2.2, col: 0xff8a3a }] });
    set(K.basic[1], { anim: 'csSlash2', dur: 0.46, motion: [{ t0: 0.04, t1: 0.18, kind: 'side', d: 0.6, side: 'auto' }], events: [{ t: 0.18, fx: 'crescent', y: 1.1, tilt: 1.1, r: 2.0, col: 0xffa04a }] });
    set(K.basic[2], { anim: 'bash', events: [{ t: 0.22, fx: 'sparkBurst' }] });
    set(K.basic[3], { anim: 'csSpin', dur: 0.55, motion: [{ t0: 0.05, t1: 0.3, kind: 'fwd', d: 0.5 }], events: [{ t: 0.2, fx: 'crescent', y: 0.9, tilt: 0, r: 2.4, arc: 5.6, col: 0xff8a3a, sweep: 2.8 }, { t: 0.2, fx: 'dust' }] });
    set(K.basic[4], { anim: 'csStab', dur: 0.55, motion: [{ t0: 0.08, t1: 0.22, kind: 'fwd', d: 1.0 }], events: [{ t: 0.22, fx: 'thrustLine', col: 0xff7a3a }] });
    set(K.basic[5], { anim: 'csLeapSlam', dur: 0.95, motion: [{ t0: 0, t1: 0.44, kind: 'leap', h: 1.3, d: 1.2 }], events: [{ t: 0.44, fx: 'fireRing', r: 2.4 }] });
    sync(K.basic[5], [0.44]);
    set(K.dash, { anim: 'csRush', dur: 0.62, motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.1 }], stream: [{ t0: 0, t1: 0.3, kind: 'dust' }], events: [{ t: 0.3, fx: 'sparkBurst' }] });
    sync(K.dash, [0.3]);
    set(K.counter, { anim: 'csStab', dur: 0.62, motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.2, side: 'auto' }, { t0: 0.1, t1: 0.2, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.15, kind: 'afterimage', col: 0x8ad0ff }], events: [{ t: 0.2, fx: 'thrustLine', col: 0xff7a3a }] });
    sync(K.counter, [0.2]);
    set(K.special, { anim: 'bash', events: [{ t: 0.25, fx: 'sparkBurst' }] });
    set(K.thrust, { anim: 'csStab', events: [{ t: 0.2, fx: 'thrustLine', col: 0xff5a3a }] });
    set(K.ex, { anim: 'exCaesar', events: [{ t: 0.3, fx: 'sparkBurst' }, { t: 0.72, fx: 'thrustLine', col: 0xff5a3a }] });
    set(K.osb, { anim: 'csOSB', events: [{ t: 0.22, fx: 'bigBurst', col: 0xff9a3a }] });
    set(K.deadEnd, { anim: 'csToss', events: [{ t: 0.2, fx: 'shieldOrbit', dur: 0.75, r: 2.6 }, { t: 0.65, fx: 'crescent', y: 1.0, tilt: 0.1, r: 2.6, arc: 5.8, col: 0xffb04a, sweep: 2.6 }] });
    set(K.followup, { anim: 'csCatchSlash', dur: 1.05, events: [{ t: 0.15, fx: 'shieldThrow', dur: 0.55 }, { t: 0.7, fx: 'crescentWave', col: 0xffa040 }] });
    sync(K.followup, [0.45, 0.75]);
    set(K.quick, { anim: 'csSlash1', motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.2 }], stream: [{ t0: 0, t1: 0.25, kind: 'afterimage', col: 0xffc080 }], events: [{ t: 0.25, fx: 'crescent', y: 1.0, tilt: -0.3, r: 2.4, col: 0xff8a3a }] });
    set(K.chain, { anim: 'csLeapSlam', dur: 1.25, motion: [{ t0: 0, t1: 0.55, kind: 'leap', h: 2.6, d: 0, toTarget: true }], events: [{ t: 0.55, fx: 'fireRing', r: 3.2 }, { t: 0.55, fx: 'whiteFlash' }] });
    set(K.ult, { anim: 'ultSmash', events: [{ t: 0.3, fx: 'shieldThrow', dur: 0.5 }, { t: 1.35, fx: 'fireRing', r: 4.4 }, { t: 1.35, fx: 'whiteFlash' }], motion: [{ t0: 0.85, t1: 1.35, kind: 'leap', h: 2.2, d: 0, toTarget: true }] });
  };

  // ------------------------------------------------------------ Burnice
  CH.burnice = () => {
    const K = DATA.AGENTS.burnice.kit;
    const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
    const jet = (t0, t1, from) => ({ t0, t1, kind: 'flame', from, len: 4.6 });
    // the basic string: right jet, left jet, a spinning kick when close, both-gun jet, and a big double blast
    set(K.basic[0], { anim: 'bnSprayR', dur: 0.5, reach: 4.2, range: 3.4, stream: [jet(0.06, 0.42, ['gunR'])], motion: [{ t0: 0, t1: 0.45, kind: 'side', d: 0.6, side: 'auto' }] });
    set(K.basic[1], { anim: 'bnSprayL', dur: 0.5, reach: 4.2, range: 3.4, stream: [jet(0.06, 0.42, ['gunL'])], motion: [{ t0: 0, t1: 0.45, kind: 'side', d: 0.6, side: 'auto' }] });
    set(K.basic[2], { name: 'Basic Attack: Direct Flame Blend', anim: 'bnKick', dur: 0.55, cancel: 0.42, reach: 1.9, range: 1.6, motion: [{ t0: 0, t1: 0.2, kind: 'fwd', d: 0.8 }], hits: [{ t: 0.24, mult: 70, daze: 50, bu: 20, attr: 'physical', shape: 'circle', at: 'self', r: 2.0, kb: 0.8 }], stream: [{ t0: 0.1, t1: 0.35, kind: 'flameRing', r: 1.6 }] });
    set(K.basic[3], { anim: 'bnSpray', dur: 0.6, reach: 4.4, range: 3.4, stream: [jet(0.06, 0.52, ['gunL', 'gunR'])], motion: [{ t0: 0.4, t1: 0.6, kind: 'back', d: 0.6 }] });
    set(K.basic[4], { anim: 'bnBlast', dur: 0.8, reach: 5.2, range: 3.6, events: [{ t: 0.3, fx: 'muzzleBoom' }], motion: [{ t0: 0.3, t1: 0.5, kind: 'back', d: 0.9 }] });
    K.basic[4].hits[0].shape = 'line'; K.basic[4].hits[0].r = 1.3; K.basic[4].hits[0].len = 5.5; K.basic[4].hits[0].fx = 'fireLine';
    set(K.hold, { anim: 'bnSpin', reach: 2.6, range: 2.0, stream: [{ t0: 0.08, t1: 1.42, kind: 'flameRing', r: 3.0 }, { t0: 0.08, t1: 1.42, kind: 'flame', from: ['gunL', 'gunR'], len: 2.8, spin: true }], events: [{ t: 1.5, fx: 'bigBurst', col: 0xff7a2a }] });
    set(K.dash, { anim: 'bnThrust', motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.6 }], stream: [{ t0: 0, t1: 0.3, kind: 'fireTrail' }, jet(0.25, 0.45, ['gunR'])] });
    set(K.counter, { anim: 'bnSpray', motion: [{ t0: 0, t1: 0.12, kind: 'side', d: 1.4, side: 'auto' }], stream: [jet(0.08, 0.55, ['gunL', 'gunR'])] });
    set(K.special, { anim: 'bnBlast', events: [{ t: 0.38, fx: 'muzzleBoom' }], motion: [{ t0: 0.38, t1: 0.6, kind: 'back', d: 0.8 }] });
    // EX: one-handed spray while sidestepping, then a fire blast along the ground
    set(K.ex, { anim: 'bnSide', stream: [jet(0.1, 0.95, ['gunR'])], motion: [{ t0: 0.1, t1: 0.9, kind: 'side', d: 2.4, side: 'auto' }], events: [{ t: 1.0, fx: 'muzzleBoom' }] });
    set(K.ex2, { anim: 'bnSpray', stream: [jet(0.08, 0.85, ['gunL', 'gunR'])], events: [{ t: 0.92, fx: 'muzzleBoom' }], motion: [{ t0: 0.95, t1: 1.15, kind: 'back', d: 0.8 }] });
    // Chain: dash in spraying, then a fan of fire
    set(K.chain, { anim: 'bnDash', motion: [{ t0: 0, t1: 0.45, kind: 'toTarget', gap: 2.4 }], stream: [{ t0: 0, t1: 0.45, kind: 'fireTrail' }, jet(0.1, 0.5, ['gunR'])], events: [{ t: 0.9, fx: 'fireFan' }] });
    K.chain.animSeq = [[0.5, 'bnBlast']];
    // Ultimate: dash, leap, and hose the ground below from the air
    set(K.ult, { anim: 'bnDash', motion: [{ t0: 0, t1: 0.35, kind: 'toTarget', gap: 2.5 }, { t0: 0.4, t1: 0.65, kind: 'rise', h: 2.4 }, { t0: 1.75, t1: 2.05, kind: 'fall' }], stream: [{ t0: 0.65, t1: 1.75, kind: 'flame', from: ['gunL', 'gunR'], len: 4.5, down: true }, { t0: 0.7, t1: 1.8, kind: 'groundFire' }] });
    K.ult.animSeq = [[0.4, 'bnAir'], [1.75, 'bnBlast']];
    set(K.followup, { anim: 'bnAir', motion: [{ t0: 0, t1: 0.3, kind: 'rise', h: 1.6 }, { t0: 0.3, t1: 0.8, kind: 'fwd', d: 2.2 }, { t0: 0.8, t1: 1.0, kind: 'fall' }], stream: [{ t0: 0.25, t1: 0.85, kind: 'flameRing', r: 2.6 }] });
    K.followup.animSeq = [[0.3, 'bnSpin'], [0.85, 'bnBlast']];
    set(K.quick, { anim: 'bnSpray', motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 2.6 }], stream: [jet(0.12, 0.7, ['gunL', 'gunR'])] });
    // a hop back when enemies crowd her (not an attack)
    K.hop = { name: 'Dodge: Fiery Phantom Dash', anim: 'bnDash', dur: 0.32, cancel: 0.32, motion: [{ t0: 0, t1: 0.28, kind: 'back', d: 2.6 }], stream: [{ t0: 0, t1: 0.28, kind: 'fireTrail' }], hits: [] };
  };

  // --------------------------------------------------------------- Aria
  CH.aria = () => {
    const K = DATA.AGENTS.aria.kit;
    const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
    set(K.basic[0], { anim: 'arFistR', motion: [{ t0: 0.02, t1: 0.16, kind: 'fwd', d: 0.7 }], events: [{ t: 0.16, fx: 'crescent', y: 1.0, tilt: -0.25, r: 2.0, col: 0xff7ab8 }] });
    set(K.basic[1], { anim: 'arSpinKick', motion: [{ t0: 0.02, t1: 0.18, kind: 'fwd', d: 0.5 }], events: [{ t: 0.18, fx: 'crescent', y: 0.7, tilt: 0.0, r: 1.8, arc: 5.6, col: 0xffa0d0, sweep: 2.6 }] });
    set(K.basic[2], { anim: 'arFlyKick', dur: 0.6, motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: -0.8 }], stream: [{ t0: 0, t1: 0.3, kind: 'pinkTrail' }], events: [{ t: 0.24, fx: 'crescent', y: 0.9, tilt: 0.0, r: 2.0, col: 0xff7ab8 }] });
    sync(K.basic[2], [0.24]);
    set(K.basic[3], { anim: 'arAxeKick', motion: [{ t0: 0, t1: 0.32, kind: 'leap', h: 0.8, d: 0.6 }], events: [{ t: 0.32, fx: 'pinkCrash', r: 1.9 }] });
    set(K.charged, { anim: 'arGather', motion: [{ t0: 0.6, t1: 1.1, kind: 'leap', h: 2.2, d: 0, toTarget: true }], stream: [{ t0: 0, t1: 0.6, kind: 'gather' }], events: [{ t: 1.1, fx: 'pinkCrash', r: 2.6, rainbow: true }] });
    set(K.dash, { anim: 'arFlyKick', motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: -0.6 }], stream: [{ t0: 0, t1: 0.3, kind: 'pinkTrail' }] });
    set(K.counter, { anim: 'arFistL', motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.2, side: 'auto' }, { t0: 0.1, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.15, kind: 'afterimage', col: 0xff9ad0 }], events: [{ t: 0.16, fx: 'crescent', y: 1.2, tilt: 1.2, r: 2.2, col: 0xff7ab8 }] });
    set(K.special, { anim: 'arFlyKick', motion: [{ t0: 0.05, t1: 0.32, kind: 'toTarget', gap: 0.6 }], stream: [{ t0: 0.05, t1: 0.32, kind: 'pinkTrail' }], events: [{ t: 0.32, fx: 'pinkBeam' }] });
    set(K.noIce, { anim: 'arSpinKick', motion: [{ t0: 0, t1: 0.2, kind: 'toTarget', gap: 0.8 }], stream: [{ t0: 0, t1: 0.2, kind: 'pinkTrail' }], events: [{ t: 0.2, fx: 'crescent', y: 0.9, tilt: 0, r: 2.2, arc: 5.6, col: 0xff7ab8, sweep: 2.8 }] });
    set(K.ex, { anim: 'arIdol', motion: [{ t0: 0.2, t1: 0.75, kind: 'leap', h: 1.6, d: 0, toTarget: true }], events: [{ t: 0.35, fx: 'crescent', y: 1.6, tilt: 1.0, r: 2.4, col: 0xff7ab8 }, { t: 0.75, fx: 'pinkCrash', r: 2.8 }] });
    set(K.ex2, { anim: 'arCrash', motion: [{ t0: 0, t1: 0.45, kind: 'leap', h: 2.4, d: 0, toTarget: true }], events: [{ t: 0.45, fx: 'pinkCrash', r: 3.0, rainbow: true }] });
    set(K.chain, { anim: 'arCrash', motion: [{ t0: 0.1, t1: 0.8, kind: 'leap', h: 2.6, d: 0, toTarget: true }], events: [{ t: 0.35, fx: 'crescent', y: 1.4, tilt: 0.8, r: 2.4, col: 0xff7ab8 }, { t: 0.8, fx: 'pinkCrash', r: 3.2, rainbow: true }] });
    // Ultimate: she becomes her Construct and the robot dives in
    set(K.ult, { anim: 'arCrash', events: [{ t: 0.05, fx: 'transform', to: 'ariaRobot' }, { t: 1.6, fx: 'pinkCrash', r: 4.8, rainbow: true }, { t: 2.15, fx: 'transform', to: null }], motion: [{ t0: 0.55, t1: 1.6, kind: 'leap', h: 3.2, d: 0, toTarget: true }], stream: [{ t0: 0.75, t1: 1.3, kind: 'pinkShots' }] });
    sync(K.ult, [0.85, 1.0, 1.15, 1.6]);
    set(K.followup, { anim: 'arFistR', motion: [{ t0: 0, t1: 0.2, kind: 'fwd', d: 1.2 }], events: [{ t: 0.25, fx: 'crescent', y: 1.0, tilt: -0.3, r: 2.4, col: 0xff7ab8 }, { t: 0.45, fx: 'crescent', y: 1.2, tilt: 1.0, r: 2.4, col: 0xffa0d0 }, { t: 0.7, fx: 'pinkCrash', r: 2.6 }] });
    set(K.quick, { anim: 'arFistL', motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.25, kind: 'pinkTrail' }], events: [{ t: 0.25, fx: 'crescent', y: 1.2, tilt: 1.2, r: 2.4, col: 0xff7ab8 }] });
  };

  // ------------------------------------------------------------- Yixuan
  CH.yixuan = () => {
    const K = DATA.AGENTS.yixuan.kit;
    const set = (def, o) => { Object.assign(def, o); if (o.motion) delete def.move; };
    set(K.basic[0], { anim: 'palmR', motion: [{ t0: 0, t1: 0.15, kind: 'fwd', d: 0.6 }], stream: [{ t0: 0.1, t1: 0.2, kind: 'inkStreak' }] });
    set(K.basic[1], { anim: 'palmL', motion: [{ t0: 0, t1: 0.15, kind: 'side', d: 0.5, side: 'auto' }], stream: [{ t0: 0.1, t1: 0.2, kind: 'inkStreak' }], events: [{ t: 0.05, fx: 'birdDive', dur: 0.6 }] });
    set(K.basic[2], { anim: 'yxRise', motion: [{ t0: 0, t1: 0.2, kind: 'fwd', d: 0.6 }], events: [{ t: 0.22, fx: 'crescent', y: 1.4, tilt: 1.3, r: 1.8, col: 0xffcf4a }] });
    set(K.basic[3], { anim: 'palmBoth', motion: [{ t0: 0, t1: 0.3, kind: 'fwd', d: 0.7 }], stream: [{ t0: 0.08, t1: 0.4, kind: 'inkStreak' }] });
    set(K.basic[4], { anim: 'spinKick', events: [{ t: 0.0, fx: 'birdDive', dur: 0.7 }, { t: 0.35, fx: 'inkPillar', r: 1.4 }] });
    set(K.auric, { anim: 'yxSeal', events: [{ t: 0.0, fx: 'inkCircle', dur: 2.1, r: 3.0 }], stream: [{ t0: 0.1, t1: 1.9, kind: 'inkSwirl' }] });
    set(K.eruption, { anim: 'yxWide', events: [{ t: 0.0, fx: 'birdDive', dur: 0.6 }, { t: 0.35, fx: 'inkPillar', r: 2.4 }, { t: 0.35, fx: 'wingBurst' }] });
    set(K.dash, { anim: 'kick', motion: [{ t0: 0, t1: 0.25, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.25, kind: 'inkTrail' }] });
    set(K.counter, { anim: 'palmBoth', motion: [{ t0: 0, t1: 0.1, kind: 'side', d: 1.3, side: 'auto' }, { t0: 0.1, t1: 0.16, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.15, kind: 'afterimage', col: 0xffe0a0 }], events: [{ t: 0.15, fx: 'birdDive', dur: 0.55 }] });
    set(K.special, { anim: 'yxBackStrike', motion: [{ t0: 0, t1: 0.18, kind: 'back', d: 1.4 }, { t0: 0.25, t1: 0.4, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0.25, t1: 0.42, kind: 'inkTrail' }], events: [{ t: 0.4, fx: 'inkPillar', r: 1.2 }] });
    set(K.ex, { anim: 'exYixuan', events: [{ t: 0.0, fx: 'birdDive', dur: 0.8 }, { t: 0.45, fx: 'wingBurst' }, { t: 0.8, fx: 'inkPillar', r: 2.2 }] });
    set(K.ex2, { anim: 'yxWide', events: [{ t: 0.35, fx: 'inkPillar', r: 2.6 }, { t: 0.35, fx: 'wingBurst' }] });
    set(K.exAlt, { anim: 'yxSeal', events: [{ t: 0.1, fx: 'inkOrb', dur: 1.75 }] });
    set(K.chain, { anim: 'exYixuan', motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.3, kind: 'inkTrail' }], events: [{ t: 0.3, fx: 'birdDive', dur: 0.7 }, { t: 0.8, fx: 'wingBurst' }, { t: 0.8, fx: 'inkPillar', r: 2.6 }] });
    set(K.ult, { anim: 'ultYixuan', events: [{ t: 0.4, fx: 'birdDive', dur: 0.9 }, { t: 0.4, fx: 'inkCircle', dur: 1.7, r: 4.5 }, { t: 1.45, fx: 'talismanRain', r: 4.5 }, { t: 1.45, fx: 'inkPillar', r: 4 }] });
    set(K.ult2, { anim: 'ultYixuan', events: [{ t: 0.3, fx: 'inkCircle', dur: 1.4, r: 4 }, { t: 1.2, fx: 'talismanRain', r: 4 }, { t: 1.2, fx: 'wingBurst' }] });
    set(K.followup, { anim: 'palmBoth', motion: [{ t0: 0, t1: 0.3, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.3, kind: 'inkTrail' }], events: [{ t: 0.55, fx: 'inkPillar', r: 1.8 }] });
    set(K.quick, { anim: 'palmBoth', motion: [{ t0: 0, t1: 0.15, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0, t1: 0.15, kind: 'inkTrail' }], events: [{ t: 0.3, fx: 'birdDive', dur: 0.6 }, { t: 0.45, fx: 'inkPillar', r: 1.6 }] });
  };
  for (const k in CH) CH[k]();

  /* ============================================================= RUNTIME */
  const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
  const ease = { lin: k => k, out: U.easeOut, inOut: U.ease, in: U.easeIn };
  const CHOREO = {};
  CHOREO.streams = {};   // more stream kinds (enemy-moves.js adds its own)
  CHOREO.events = {};    // more event kinds
  CHOREO.ext = null;     // enemy runtime (enemy-moves.js)
  CHOREO.start = (a, A) => {
    const d = A.def;
    A.side = Math.random() < 0.5 ? 1 : -1;
    A.ev = 0; A.ms = (d.motion || []).map(() => ({}));
    A.seqI = 0; a.anim.seqName = null;
    if (a.type === 'enemy' && CHOREO.ext) CHOREO.ext.start(a, A);
  };
  CHOREO.end = (a, A) => {
    const d = A.def;
    if (a.type === 'enemy' && CHOREO.ext) CHOREO.ext.end(a, A);
    if (d.events) for (const e of d.events) if (e.fx === 'transform' && e.to && a.rigAlt) swapRig(a, null);
    if (a.rig.parts.shield && !a.rig.parts.shield.visible) a.rig.parts.shield.visible = true;
  };
  CHOREO.step = (a, A, dt) => {
    const d = A.def, B = BT.B, t = A.t, t0 = t - dt;
    const tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    // pose sequence (a move that changes poses part way through)
    if (d.animSeq) { let an = d.anim; for (const [ts, name] of d.animSeq) if (t >= ts) an = name; if (a.anim.seqName !== an) { a.anim.seqName = an; a.anim.act = Object.assign({}, d, { anim: an }); } }
    // motion
    (d.motion || []).forEach((m, i) => {
      if (t < m.t0 || t0 > m.t1) return;
      const S = A.ms[i], span = Math.max(0.01, m.t1 - m.t0), e = ease[m.ease || 'out'];
      const k0 = clamp((t0 - m.t0) / span, 0, 1), k1 = clamp((t - m.t0) / span, 0, 1), dk = e(k1) - e(k0);
      if (!S.init) { S.init = true; S.x = a.x; S.z = a.z; S.y = a.airY || 0; S.dir = A.dir; }
      const fx = Math.sin(A.dir), fz = Math.cos(A.dir), side = m.side === 'auto' ? A.side : (m.side || 1);
      switch (m.kind) {
        case 'fwd': { let dd = m.d * dk; if (tgt && dd > 0) dd = Math.min(dd, Math.max(0, dist(a, tgt) - tgt.rad - a.rad * 0.6)); a.x += fx * dd; a.z += fz * dd; break; }
        case 'back': a.x -= fx * m.d * dk; a.z -= fz * m.d * dk; break;
        case 'side': a.x += fz * m.d * dk * side; a.z -= fx * m.d * dk * side; break;
        case 'toTarget': {
          if (!tgt) break;
          const g0 = m.gap != null ? m.gap : 1.1, gap = g0 < 0 ? g0 - tgt.rad : g0 + tgt.rad, ax = ang(tgt, S), tx = tgt.x + Math.sin(ax) * gap, tz = tgt.z + Math.cos(ax) * gap;
          const ek = e(k1); a.x = lerp(S.x, tx, ek); a.z = lerp(S.z, tz, ek); break;
        }
        case 'leap': {
          a.airY = (m.h || 1) * Math.sin(k1 * PI);
          if (m.toTarget && tgt) { const gap = tgt.rad + 0.9, ax = ang(tgt, S), tx = tgt.x + Math.sin(ax) * gap, tz = tgt.z + Math.cos(ax) * gap; a.x = lerp(S.x, tx, U.ease(k1)); a.z = lerp(S.z, tz, U.ease(k1)); }
          else if (m.d) { a.x += fx * m.d * dk; a.z += fz * m.d * dk; }
          if (k1 >= 1) a.airY = 0;
          break;
        }
        case 'rise': a.airY = S.y + ((m.h || 1.5) - S.y) * e(k1); break;
        case 'fall': a.airY = S.y * (1 - U.easeIn(k1)); if (k1 >= 1) a.airY = 0; break;
        // a straight run along the aim: it reaches the target's spot at m.hit and keeps going until t1
        case 'charge': {
          if (!S.v) { const D = tgt ? clamp(dist(a, tgt) - tgt.rad * 0.3, 1, m.d || 9) : (m.d || 6); S.v = D / Math.max(0.05, (m.hit || m.t1) - m.t0); A.chargeFrom = { x: a.x, z: a.z }; }
          const step = S.v * (Math.min(t, m.t1) - Math.max(t0, m.t0));
          a.x += fx * step; a.z += fz * step;
          if (m.crash && a.type === 'enemy' && CHOREO.ext && CHOREO.ext.crashCheck(a, A)) return;
          break;
        }
        // a circle around the target (a drift, a stalk) through m.ang radians, easing to radius m.r
        case 'orbit': {
          if (!tgt) break;
          if (S.r == null) { S.r = Math.max(1.2, dist(a, tgt)); S.a = ang(tgt, a); }
          const an = S.a + (m.ang || PI) * side * e(k1), r = m.r != null ? lerp(S.r, m.r, e(k1)) : S.r;
          a.x = tgt.x + Math.sin(an) * r; a.z = tgt.z + Math.cos(an) * r;
          break;
        }
      }
    });
    if (a.type === 'enemy' && CHOREO.ext && a.act === A) CHOREO.ext.step(a, A, dt);
    if (a.act !== A) return;
    // streams
    for (const s of d.stream || []) if (t >= s.t0 && t <= s.t1) stream(a, A, s, dt, tgt);
    // one-shot events
    const ev = d.events || [];
    while (A.ev < ev.length && t >= ev[A.ev].t) { const e = ev[A.ev++]; try { event(a, A, e, tgt); } catch (err) { console.warn('choreo', e.fx, err); } }
  };

  /* -------------------------------------------------------- streams -- */
  const FLAME = [0xfff0a0, 0xffd060, 0xff9a30, 0xff6a1a, 0xff4a10];
  function nozzle(a, part, out) {
    const P = a.rig.parts[part]; if (!P) return BT.sock(a, 'chest', out);
    out.set(0, 0, 18 * a.rig.scale); a.rig.root.updateMatrixWorld(true); return P.localToWorld(out);
  }
  function stream(a, A, s, dt, tgt) {
    const n = Math.max(1, Math.round(dt * 160));
    switch (s.kind) {
      case 'flame': {
        for (const part of s.from) {
          nozzle(a, part, _v);
          let dir = A.dir;
          if (s.spin) dir = a.face + a.body.rotation.y + (part === 'gunL' ? PI / 2 : -PI / 2);
          const down = s.down ? -0.9 : -0.02;
          for (let i = 0; i < n; i++) {
            const sp = rnd(8, 11), a2 = dir + rnd(-0.12, 0.12), len = s.len || 4.5;
            FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: Math.sin(a2) * sp, vy: (down + rnd(-0.08, 0.12)) * sp * 0.7, vz: Math.cos(a2) * sp, drag: 1.2, life: len / sp * rnd(0.85, 1.1), size: 0.1, size1: 0.6, col: U.pick(FLAME), g: s.down ? 2 : -1.5 });
          }
          if (Math.random() < 0.5) FX.glow(_v.x, _v.y, _v.z, 0.6, 0xffa040, 0.06);
        }
        break;
      }
      case 'flameRing': {
        const r = s.r || 2.6;
        for (let i = 0; i < n; i++) { const an = rnd(0, PI * 2), sp = rnd(5, 7); FX.p({ x: a.x + Math.cos(an) * 0.5, y: 0.5 + a.airY, z: a.z + Math.sin(an) * 0.5, vx: Math.cos(an) * sp, vy: rnd(0.2, 1.2), vz: Math.sin(an) * sp, drag: 2.2, life: r / sp, size: 0.18, size1: 0.6, col: U.pick(FLAME), g: -1 }); }
        if (Math.random() < 0.3) FX.ring(a.x, a.z, 0.4, r, 0xff7a2a, 0.3, { a: 0.5 });
        break;
      }
      case 'groundFire': {
        const tx = tgt ? tgt.x : a.x + Math.sin(A.dir) * 3, tz = tgt ? tgt.z : a.z + Math.cos(A.dir) * 3;
        for (let i = 0; i < n * 2; i++) { const an = rnd(0, PI * 2), r = rnd(0, 3); FX.p({ x: tx + Math.cos(an) * r, y: 0.15, z: tz + Math.sin(an) * r, vy: rnd(1, 3), life: rnd(0.3, 0.6), size: 0.25, size1: 0.6, col: U.pick(FLAME), g: -1 }); }
        if (Math.random() < 0.2) FX.glow(tx, 0.4, tz, 3, 0xff6a1a, 0.2);
        break;
      }
      case 'fireTrail': for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.2, 0.2), y: 0.2 + a.airY, z: a.z + rnd(-0.2, 0.2), vy: rnd(0.5, 1.5), life: 0.45, size: 0.22, size1: 0.05, col: U.pick(FLAME), g: -1 }); break;
      case 'dust': if (Math.random() < 0.6) FX.burst(a.x, 0.1, a.z, 3, { col: [0xc8b090, 0x8a7a60], glow: false, speed: 2, size: 0.1, g: 4, life: 0.4 }); break;
      case 'afterimage': if (Math.random() < 0.7) FX.glow(a.x, 1.0 + a.airY, a.z, 1.4, s.col || 0x8ad0ff, 0.25, { size1: 1.2, a: 0.6 }); break;
      case 'pinkTrail': for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.2, 0.2), y: 0.6 + rnd(0, 0.8) + a.airY, z: a.z + rnd(-0.2, 0.2), life: 0.35, size: 0.14, size1: 0.02, col: U.pick([0xff7ab8, 0xffb0d8, 0x7ff4ff, 0xffffff]) }); break;
      case 'pinkShots': if (tgt && Math.random() < dt * 14) { BT.sock(a, 'weapon', _v); FX.beam(_v.clone(), new THREE.Vector3(tgt.x, 1, tgt.z), U.pick([0xff5ab0, 0x7ff4ff]), 0.12, 0.18); } break;
      case 'gather': for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(1.2, 2); FX.p({ x: a.x + Math.cos(an) * r, y: rnd(0.4, 1.8), z: a.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 3, vz: -Math.sin(an) * r * 3, life: 0.3, size: 0.12, col: U.pick([0xff7ab8, 0x7ff4ff, 0xffffff]) }); } break;
      case 'inkStreak': for (let i = 0; i < n; i++) { BT.sock(a, i % 2 ? 'weapon' : 'off', _v); FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: Math.sin(A.dir) * rnd(3, 6), vy: rnd(-0.5, 0.5), vz: Math.cos(A.dir) * rnd(3, 6), drag: 3, life: 0.3, size: 0.14, size1: 0.02, col: U.pick([0x141418, 0xffcf4a, 0xfff0a0]) }); } break;
      case 'inkTrail': for (let i = 0; i < n; i++) FX.p({ x: a.x + rnd(-0.25, 0.25), y: rnd(0.3, 1.6) + a.airY, z: a.z + rnd(-0.25, 0.25), life: 0.45, size: 0.16, size1: 0.02, col: U.pick([0x141418, 0x2a2a33, 0xffcf4a]), g: 0.5 }); break;
      case 'inkSwirl': { const an = BT.B.real * 6; for (let i = 0; i < 2; i++) { const a2 = an + i * PI, r = 2.4; FX.p({ x: a.x + Math.cos(a2) * r, y: 0.15, z: a.z + Math.sin(a2) * r, vx: -Math.sin(a2) * 3, vz: Math.cos(a2) * 3, life: 0.5, size: 0.2, size1: 0.05, col: U.pick([0x141418, 0xffcf4a]) }); } break; }
      default: if (CHOREO.streams[s.kind]) CHOREO.streams[s.kind](a, A, s, dt, tgt); break;
    }
  }

  /* --------------------------------------------------------- events -- */
  let shieldProto = null;
  function shieldObj() {
    if (!shieldProto) { const g = new VX.Grid(); MODELS.caesar.parts.shield.draw(g); shieldProto = VX.object(g, MODELS.caesar.scale, { cast: false }); }
    return shieldProto.clone();
  }
  function event(a, A, e, tgt) {
    const B = BT.B, dir = A.dir, fx = Math.sin(dir), fz = Math.cos(dir);
    const tx = tgt ? tgt.x : a.x + fx * 2, tz = tgt ? tgt.z : a.z + fz * 2;
    switch (e.fx) {
      case 'crescent': FX.slash(a.x + fx * 0.3, (e.y || 1) + (a.airY || 0), a.z + fz * 0.3, e.r || 2.2, dir, e.col || 0xff8a3a, { tilt: e.tilt || 0, arc: e.arc || 2.6, width: 0.45, life: 0.28, sweep: e.sweep || 0.9 }); break;
      case 'thrustLine': { const p0 = new THREE.Vector3(a.x, 1.0, a.z), p1 = new THREE.Vector3(a.x + fx * 4.5, 1.0, a.z + fz * 4.5); FX.beam(p0, p1, e.col || 0xff7a3a, 0.12, 0.2); FX.glow(a.x + fx * 1.4, 1.0, a.z + fz * 1.4, 1.6, 0xffc080, 0.18); break; }
      case 'sparkBurst': FX.burst(a.x + fx * 1.0, 1.0, a.z + fz * 1.0, 22, { col: [0xffffff, 0xffd080, 0xff8a3a], speed: 7, size: 0.08, life: 0.35 }); FX.glow(a.x + fx * 1.0, 1.0, a.z + fz * 1.0, 1.6, 0xffb060, 0.2); break;
      case 'bigBurst': FX.named('explode', { x: a.x + fx * 1.2, z: a.z + fz * 1.2, r: 2.2, attr: 'fire' }); B.cam.shake = Math.max(B.cam.shake, 0.25); break;
      case 'fireRing': FX.ring(a.x, a.z, 0.4, e.r || 2.4, 0xff9a3a, 0.45); FX.ring(a.x, a.z, 0.3, (e.r || 2.4) * 0.7, 0xffe0a0, 0.35); FX.named('quake', { x: a.x, z: a.z, r: e.r || 2.4 }); for (let i = 0; i < 30; i++) { const an = rnd(0, PI * 2), r = rnd(0.5, e.r || 2.4); FX.p({ x: a.x + Math.cos(an) * r, y: 0.15, z: a.z + Math.sin(an) * r, vy: rnd(1, 3), life: 0.45, size: 0.22, size1: 0.05, col: U.pick(FLAME), g: -1 }); } B.cam.shake = Math.max(B.cam.shake, 0.3); break;
      case 'whiteFlash': FX.glow(a.x, 1.2, a.z, 4, 0xffffff, 0.22, { size1: 7 }); break;
      case 'dust': FX.burst(a.x, 0.1, a.z, 18, { col: [0xc8b090, 0x8a7a60, 0xe0d0b0], glow: false, speed: 4, size: 0.12, g: 6, life: 0.5, flat: true }); break;
      case 'muzzleBoom': for (const part of ['gunL', 'gunR']) { nozzle(a, part, _v); FX.glow(_v.x, _v.y, _v.z, 1.6, 0xffa040, 0.2, { size1: 2.6 }); } FX.named('fireLine', { fromX: a.x, fromZ: a.z, yaw: dir, len: 5.5 }); B.cam.shake = Math.max(B.cam.shake, 0.15); SFX.play('boom'); break;
      case 'fireFan': for (let i = 0; i < 90; i++) { const a2 = dir + rnd(-0.7, 0.7), sp = rnd(7, 11); nozzle(a, 'gunR', _v); FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: Math.sin(a2) * sp, vy: rnd(-0.5, 1), vz: Math.cos(a2) * sp, drag: 1.4, life: 0.55, size: 0.2, size1: 0.7, col: U.pick(FLAME), g: -1 }); } SFX.play('boom'); break;
      case 'shieldThrow': case 'shieldOrbit': {
        const P = a.rig.parts.shield; if (P) P.visible = false;
        const obj = shieldObj(); obj.rotation.x = PI / 2; const dur = e.dur || 0.6, r = e.r || 2.6;
        const sx = a.x, sz = a.z, orbit = e.fx === 'shieldOrbit';
        FX.custom(obj, dur, (k, dt2, o) => {
          if (!BT.B) return;
          o.rotation.z += dt2 * 24;
          if (orbit) { const an = k * PI * 3; o.position.set(a.x + Math.cos(an) * r, 1.0, a.z + Math.sin(an) * r); }
          else { const out = Math.sin(k * PI), px = lerp(a.x, tx, out), pz = lerp(a.z, tz, out); o.position.set(px, 1.0 + out * 0.4, pz); }
          if (Math.random() < 0.6) FX.p({ x: o.position.x, y: o.position.y, z: o.position.z, life: 0.3, size: 0.1, col: U.pick([0xffd060, 0xfff0a0]) });
          if (k >= 0.99 && P) P.visible = true;
        });
        scene().add(obj);
        break;
      }
      case 'crescentWave': {
        const geo = new THREE.RingGeometry(1.6, 2.2, 24, 1, -1.2, 2.4), mat = new THREE.MeshBasicMaterial({ color: e.col || 0xffa040, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
        const m = new THREE.Mesh(geo, mat), g = new THREE.Group(); g.add(m); m.rotation.x = -PI / 2; m.rotation.z = -PI / 2;
        g.position.set(a.x, 1.0, a.z); g.rotation.y = dir;
        FX.custom(g, 0.5, (k) => { g.position.set(a.x + fx * k * 7, 1.0, a.z + fz * k * 7); mat.opacity = 1 - k * k; for (let i = 0; i < 3; i++) FX.p({ x: g.position.x + rnd(-1, 1), y: rnd(0.5, 1.5), z: g.position.z + rnd(-1, 1), life: 0.3, size: 0.18, size1: 0.02, col: U.pick(FLAME) }); }, [mat, geo]);
        break;
      }
      case 'pinkCrash': {
        const r = e.r || 2.4;
        FX.ring(a.x, a.z, 0.3, r, 0xff5ab0, 0.45); FX.glow(a.x, 0.8, a.z, r * 1.2, 0xff7ab8, 0.3, { size1: r * 2 });
        if (e.rainbow) [0xff5a5a, 0xffd04a, 0x7aff7a, 0x5ac8ff, 0xb05aff].forEach((c, i) => FX.ring(a.x, a.z, 0.3, r * (0.6 + i * 0.12), c, 0.5, { y: 0.06 + i * 0.01, a: 0.6 }));
        FX.burst(a.x, 0.4, a.z, 40, { col: [0xff7ab8, 0xffb0d8, 0xffffff, 0x7ff4ff], speed: 7, size: 0.14, life: 0.55, g: 3, up: 1 });
        B.cam.shake = Math.max(B.cam.shake, 0.3); break;
      }
      case 'pinkBeam': { const p0 = new THREE.Vector3(a.x, 0.9, a.z), p1 = new THREE.Vector3(a.x + fx * 4, 0.9, a.z + fz * 4); FX.beam(p0, p1, 0xff5ab0, 0.3, 0.25); FX.beam(p0, p1, 0xffffff, 0.1, 0.2); break; }
      case 'transform': {
        const to = e.to;
        if (to && a.modelId !== to && MODELS[to]) swapRig(a, to);
        else if (!to && a.rigAlt) swapRig(a, null);
        FX.glow(a.x, 1.1 + a.airY, a.z, 3, 0xff7ab8, 0.35, { size1: 5 }); FX.burst(a.x, 1, a.z, 40, { col: [0xff7ab8, 0xffffff, 0x7ff4ff], speed: 5, size: 0.12, life: 0.5 });
        break;
      }
      case 'birdDive': { const c = (B.companions || []).find(x => x.owner === a); if (c && tgt) c.dive = { t0: B.real, dur: e.dur || 0.6, tgt }; break; }
      case 'inkPillar': { const r = e.r || 1.6; FX.pillar(tx, tz, Math.min(0.8, r * 0.28), 6, 0x7a5a18, 0.3); FX.beam(new THREE.Vector3(tx, 9, tz), new THREE.Vector3(tx, 0.2, tz), 0xfff0a0, 0.16, 0.2); FX.named('ink', { x: tx, z: tz, y: 0.5, r }); B.cam.shake = Math.max(B.cam.shake, 0.2); break; }
      case 'wingBurst': { BT.sock(a, 'chest', _v); for (const s of [-1, 1]) for (let i = 0; i < 26; i++) { const k = i / 26; FX.p({ x: _v.x, y: _v.y + 0.3, z: _v.z, vx: Math.cos(a.face) * s * rnd(3, 7) * (1 - k * 0.5), vy: rnd(1, 4) * k, vz: -Math.sin(a.face) * s * rnd(3, 7), drag: 2.5, life: 0.6, size: 0.22, size1: 0.04, col: U.pick([0x141418, 0x2a2a33, 0xffcf4a]) }); } FX.glow(_v.x, _v.y, _v.z, 2.4, 0xffcf4a, 0.3); break; }
      case 'inkCircle': {
        const r = e.r || 3, geo = new THREE.RingGeometry(r * 0.25, r, 48), mat = new THREE.MeshBasicMaterial({ color: 0x111116, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
        const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2; m.position.set(a.x, 0.04, a.z); scene().add(m);
        FX.custom(m, e.dur || 2, (k, dt2) => { m.rotation.z += dt2 * 2; mat.opacity = 0.75 * Math.min(1, (1 - k) * 5) * Math.min(1, k * 8); m.scale.setScalar(Math.min(1, k * 6)); }, [mat, geo]);
        FX.ring(a.x, a.z, r * 0.9, r, 0xffcf4a, e.dur || 2, { a: 0.5 });
        break;
      }
      case 'inkOrb': {
        if (!tgt) break;
        const geo = new THREE.SphereGeometry(1, 20, 14), mat = new THREE.MeshBasicMaterial({ color: 0x2a2010, transparent: true, opacity: 0.55, depthWrite: false });
        const glowM = new THREE.MeshBasicMaterial({ color: 0xffcf4a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
        const g = new THREE.Group(), s1 = new THREE.Mesh(geo, mat), s2 = new THREE.Mesh(geo, glowM); s2.scale.setScalar(1.08); g.add(s1, s2); scene().add(g);
        const R = Math.max(1.6, tgt.rad + 1.2);
        FX.custom(g, e.dur || 1.7, (k) => { g.position.set(tgt.x, 0.9, tgt.z); const s = k < 0.2 ? R * U.easeOut(k / 0.2) : k < 0.85 ? R * (1 - 0.25 * (k - 0.2) / 0.65) : R * 0.75 * (1 - (k - 0.85) / 0.15); g.scale.setScalar(Math.max(0.01, s)); g.rotation.y += 0.05; if (k > 0.97) FX.named('ink', { x: tgt.x, z: tgt.z, y: 0.9, r: R }); }, [mat, glowM, geo]);
        break;
      }
      case 'talismanRain': FX.named('talisman', { x: tx, z: tz, r: e.r || 4 }); for (let i = 0; i < 12; i++) FX.beam(new THREE.Vector3(tx + rnd(-3, 3), 7, tz + rnd(-3, 3)), new THREE.Vector3(tx + rnd(-1, 1), 0.3, tz + rnd(-1, 1)), 0xffcf4a, 0.08, 0.3); break;
      default: if (CHOREO.events[e.fx]) CHOREO.events[e.fx](a, A, e, tgt); break;
    }
  }
  const scene = () => BT.world.scene;

  /* swap an Agent's model for another (Aria's Construct during her Ultimate) */
  function swapRig(a, to) {
    if (to) {
      if (!a.rigAlt || a.rigAlt.id !== to) { if (a.rigAlt) a.rigAlt.dispose(); a.rigAlt = VX.rig(to, MODELS[to]); }
      if (!a.rigHome) a.rigHome = a.rig;
      a.body.remove(a.rig.root); a.body.add(a.rigAlt.root); a.rig = a.rigAlt;
    } else if (a.rigHome) {
      a.body.remove(a.rig.root); a.body.add(a.rigHome.root); a.rig = a.rigHome; a.rigHome = null;
    }
  }
  CHOREO.swapRig = swapRig;

  /* ---------------------------------------------------- Fandom critters --
     Aria's Fandom Power: little teal mascots that hop on the stage. */
  let critterProto = null;
  CHOREO.critter = (x, z) => {
    if (!critterProto) {
      const g = new VX.Grid(), T = 0x2fbfa8, T2 = 0x1f8f7d, W = 0xf7f7fa;
      g.ell(0, 3, 0, 3, 2.6, 3, T); g.box(-2, 2, 3, 2, 4, 3, W); g.set(-1, 3, 4, VX.glow(0x7ff4ff)); g.set(1, 3, 4, VX.glow(0x7ff4ff));
      for (const s of [-1, 1]) { g.box(s * 2, 5, -1, s * 3, 7, 0, T2); g.set(s * 3, 8, 0, VX.glow(0xff9ad0)); }
      g.box(-2, 0, -1, -1, 0, 1, T2); g.box(1, 0, -1, 2, 0, 1, T2);
      critterProto = VX.object(g, 0.06, { cast: false });
    }
    const o = critterProto.clone(); o.position.set(x, 0, z); o.rotation.y = rnd(-1, 1); scene().add(o);
    return FX.custom(o, 9999, (k, dt2) => { o.userData.t = (o.userData.t || rnd(0, 3)) + dt2; o.position.y = Math.abs(Math.sin(o.userData.t * 4)) * 0.18; o.rotation.y += dt2 * 0.6; });
  };

  window.CHOREO = CHOREO;
})();
