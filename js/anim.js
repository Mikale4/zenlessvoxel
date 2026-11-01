/* ============================================================================
   anim.js -- procedural animation for the voxel rigs.
   Every frame a fighter's state (idle, run, action, hit, down, stun, dodge...)
   becomes a target pose: rotations per part plus an offset for the whole body.
   Actions are staged around their first hit: wind up, snap to the strike as
   the hit lands, hold, recover. Parts ease toward the target, so the voxel
   figures move with a little weight instead of popping.
   ========================================================================== */
(function () {
  'use strict';
  const { clamp, lerp } = U;
  const PI = Math.PI;

  // ready stances (added to each part's rest rotation)
  const READY = {
    shield: { armL: [-0.95, 0.15, 0.15], armR: [-0.75, 0, -0.1], torso: [0.08, 0.15, 0], head: [0, -0.1, 0], legL: [-0.25, 0, 0.05], legR: [0.2, 0, -0.05], hipsY: -0.04 },
    guns: { armL: [-0.75, 0, 0.12], armR: [-0.75, 0, -0.12], torso: [0.05, 0, 0], head: [0, 0, 0], legL: [-0.15, 0, 0.06], legR: [0.15, 0, -0.06], hipsY: -0.02 },
    idol: { armL: [-0.15, 0, 0.35], armR: [-0.65, 0, -0.1], torso: [0, 0, 0.04], head: [0.05, 0, 0.06], legL: [0, 0, 0.04], legR: [0.1, 0, -0.02], hipsY: 0 },
    martial: { armL: [-1.1, -0.3, 0.35], armR: [-0.55, 0.2, -0.2], torso: [0.1, 0.35, 0], head: [0, -0.3, 0], legL: [-0.4, 0, 0.12], legR: [0.35, 0, -0.12], hipsY: -0.08 },
    brute: { armL: [-0.35, 0, 0.2], armR: [-0.5, 0, -0.2], torso: [0.12, 0, 0], head: [-0.05, 0, 0], legL: [-0.1, 0, 0.08], legR: [0.1, 0, -0.08], hipsY: -0.03 },
    gun: { armL: [-1.2, 0.3, 0.3], armR: [-1.35, 0, -0.05], torso: [0.05, -0.2, 0], head: [0, 0.2, 0], legL: [-0.15, 0, 0.05], legR: [0.2, 0, -0.05], hipsY: -0.02 },
    // enemies
    boxer: { armL: [-1.85, -0.35, 0.25], armR: [-1.6, 0.35, -0.25], torso: [0.18, 0.25, 0], head: [0.12, -0.2, 0], legL: [-0.35, 0, 0.1], legR: [0.35, 0, -0.1], hipsY: -0.07 },
    blade: { armL: [-0.3, 0, 0.3], armR: [-0.85, 0.1, -0.25], torso: [0.1, 0.2, 0], head: [0, -0.15, 0], legL: [-0.3, 0, 0.08], legR: [0.25, 0, -0.08], hipsY: -0.05 },
    priest: { armL: [-0.45, 0, 0.55], armR: [-0.45, 0, -0.55], torso: [-0.05, 0, 0], head: [-0.05, 0, 0], legL: [0, 0, 0], legR: [0, 0, 0], hipsY: 0 },
    hulk: { armL: [-0.2, 0, 0.3], armR: [-0.3, 0, -0.3], torso: [0.3, 0, 0], head: [-0.25, 0, 0], legL: [-0.2, 0, 0.12], legR: [0.2, 0, -0.12], hipsY: -0.08 },
  };
  const PARTS = ['armL', 'armR', 'torso', 'head', 'legL', 'legR'];
  function P(o) { // fill a pose from a partial one
    const r = { hipsY: o.hipsY || 0, lift: o.lift || 0, tilt: o.tilt || 0, roll: o.roll || 0, spin: o.spin || 0 };
    for (const k of PARTS) r[k] = o[k] ? o[k].slice() : [0, 0, 0];
    return r;
  }
  function mix(a, b, t) {
    const r = { hipsY: lerp(a.hipsY, b.hipsY, t), lift: lerp(a.lift, b.lift, t), tilt: lerp(a.tilt, b.tilt, t), roll: lerp(a.roll, b.roll, t), spin: lerp(a.spin, b.spin, t) };
    for (const k of PARTS) r[k] = [lerp(a[k][0], b[k][0], t), lerp(a[k][1], b[k][1], t), lerp(a[k][2], b[k][2], t)];
    return r;
  }
  function add(a, d) { // a + partial delta
    const r = mix(a, a, 0);
    for (const k of PARTS) if (d[k]) for (let i = 0; i < 3; i++) r[k][i] += d[k][i];
    for (const k of ['hipsY', 'lift', 'tilt', 'roll', 'spin']) if (d[k]) r[k] += d[k];
    return r;
  }
  /* wind up -> strike (at the hit) -> hold -> back to base */
  function stage(base, W, S, t, th, dur) {
    const w = add(base, W), s = add(base, S);
    const a = Math.max(0.02, th - 0.06), b = th + 0.05, c = Math.min(dur, th + 0.22);
    if (t < a) return mix(base, w, U.easeOut(t / a));
    if (t < b) return mix(w, s, (t - a) / (b - a));
    if (t < c) return s;
    return mix(s, base, U.ease(clamp((t - c) / Math.max(0.05, dur - c), 0, 1)));
  }

  /* ----------------------------------------------- humanoid action poses --
     Each returns a pose for time t into an action whose first hit lands at th. */
  const H_ACT = {
    slashR: (b, t, th, d) => stage(b, { armR: [-2.4, 0.2, -0.9], torso: [0, 0.7, 0] }, { armR: [-1.0, -0.5, 0.6], torso: [0.15, -0.6, 0] }, t, th, d),
    slashL: (b, t, th, d) => stage(b, { armR: [-1.4, 0.6, 0.8], torso: [0, -0.6, 0] }, { armR: [-1.3, -0.3, -1.0], torso: [0.1, 0.7, 0] }, t, th, d),
    slash: (b, t, th, d) => stage(b, { armR: [-2.5, 0, -0.5], torso: [-0.1, 0.6, 0] }, { armR: [-0.7, 0, 0.4], torso: [0.25, -0.5, 0] }, t, th, d),
    // two alternating swings (right, then left), then the last big one overhead
    slash2: (b, t, th, d) => {
      const a = d * 0.36, c = d * 0.66;
      if (t < a) return stage(b, { armR: [-2.4, 0, -0.6], torso: [0, 0.6, 0] }, { armR: [-0.7, 0, 0.3], torso: [0.2, -0.5, 0] }, t, Math.min(th, a * 0.8), a);
      if (t < c) return stage(b, { armL: [-2.4, 0, 0.6], torso: [0, -0.6, 0] }, { armL: [-0.7, 0, -0.3], torso: [0.2, 0.5, 0] }, t - a, (c - a) * 0.6, c - a);
      return H_ACT.slamDown(b, t - c, (d - c) * 0.45, d - c);
    },
    bash: (b, t, th, d) => stage(b, { armL: [-0.6, 0.6, 0.3], torso: [0, 0.55, 0], legL: [0.3, 0, 0] }, { armL: [-1.55, -0.2, 0.0], torso: [0.15, -0.45, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0] }, t, th, d),
    slamDown: (b, t, th, d) => stage(b, { armR: [-3.0, 0, -0.2], armL: [-2.2, 0, 0.3], torso: [-0.3, 0, 0], lift: 0.25 }, { armR: [-0.5, 0, 0.1], armL: [-0.9, 0, 0.2], torso: [0.55, 0, 0], hipsY: -0.12 }, t, th, d),
    thrust: (b, t, th, d) => stage(b, { armR: [-0.4, 0, -0.3], torso: [0, 0.6, 0], legR: [0.4, 0, 0] }, { armR: [-1.6, 0, 0.1], torso: [0.25, -0.4, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0] }, t, th, d),
    guard: (b) => add(b, { armL: [-0.75, -0.25, 0.0], torso: [0.2, -0.3, 0], hipsY: -0.08, legL: [-0.45, 0, 0], legR: [0.45, 0, 0] }),
    guardPalm: (b) => add(b, { armL: [-0.7, -0.6, 0.3], armR: [-0.7, 0.6, -0.3], torso: [0.15, 0, 0], hipsY: -0.1, legL: [-0.4, 0, 0.1], legR: [0.4, 0, -0.1] }),
    exCaesar: (b, t, th, d) => t < 0.55 ? H_ACT.bash(b, t, th, 0.55) : H_ACT.thrust(b, t - 0.55, 0.17, d - 0.55),
    ultSmash: (b, t, th, d) => {
      if (t < 0.85) { const k = t / 0.85; return add(b, { lift: Math.sin(k * PI) * 1.4, spin: k * PI * 2, armR: [-2.6, 0, -0.4], armL: [-1.5, 0, 0.5], torso: [-0.2, 0, 0] }); }
      return stage(b, { armR: [-3.0, 0, -0.2], armL: [-2.4, 0, 0.3], torso: [-0.35, 0, 0], lift: 0.6 }, { armR: [-0.4, 0, 0.1], armL: [-1.4, 0, 0.3], torso: [0.6, 0, 0], hipsY: -0.15 }, t - 0.85, 0.5, d - 0.85);
    },
    spray: (b, t) => add(b, { armL: [-1.5 + Math.sin(t * 30) * 0.05, -0.15, 0.05], armR: [-1.5 + Math.cos(t * 30) * 0.05, 0.15, -0.05], torso: [0.12, Math.sin(t * 6) * 0.25, 0], hipsY: -0.05, legL: [-0.3, 0, 0], legR: [0.3, 0, 0] }),
    shootBoth: (b, t, th, d) => stage(b, { armL: [-1.7, -0.1, 0.1], armR: [-1.7, 0.1, -0.1], torso: [-0.1, 0, 0] }, { armL: [-1.95, -0.1, 0.1], armR: [-1.95, 0.1, -0.1], torso: [-0.25, 0, 0], hipsY: -0.05 }, t, th, d),
    shoot: (b, t, th, d) => stage(b, { armR: [-1.5, 0, 0], armL: [-1.4, 0.4, 0.3] }, { armR: [-1.75, 0, 0], armL: [-1.55, 0.4, 0.3], torso: [-0.12, 0, 0] }, t, th, d),
    shootL: (b, t, th, d) => stage(b, { armL: [-1.5, 0, 0.1], torso: [0, -0.3, 0] }, { armL: [-1.75, 0, 0.1], torso: [-0.12, -0.3, 0] }, t, th, d),
    dashFire: (b) => add(b, { armL: [0.9, 0, 0.3], armR: [0.9, 0, -0.3], torso: [0.5, 0, 0], legL: [-0.9, 0, 0], legR: [0.6, 0, 0] }),
    exBurnice: (b, t, th, d) => t < 0.85 ? H_ACT.spray(b, t) : stage(b, { armL: [-2.8, 0, 0.3], armR: [-2.8, 0, -0.3], torso: [-0.25, 0, 0] }, { armL: [-1.2, 0, 0.2], armR: [-1.2, 0, -0.2], torso: [0.3, 0, 0], hipsY: -0.1 }, t - 0.85, 0.13, d - 0.85),
    ultBurnice: (b, t) => add(b, { armL: [-2.0 + Math.sin(t * 9) * 0.3, 0, 0.6], armR: [-2.0 + Math.cos(t * 9) * 0.3, 0, -0.6], spin: t * 5.5, lift: Math.min(1, t * 2) * 0.35 + Math.sin(t * 4) * 0.05, torso: [-0.15, 0, 0] }),
    spin: (b, t, th, d) => add(b, { spin: clamp(t / Math.max(0.1, th + 0.1), 0, 1) * PI * 2, armL: [-1.2, 0, 1.1], armR: [-1.2, 0, -1.1], hipsY: -0.05 }),
    sweep: (b, t, th, d) => stage(b, { armR: [-1.5, 0.9, -1.0], armL: [-1.4, 0.8, 0.6], torso: [0, 1.0, 0] }, { armR: [-1.5, -0.9, 0.6], armL: [-1.4, -0.9, 1.0], torso: [0.1, -1.0, 0] }, t, th, d),
    stomp: (b, t, th, d) => stage(b, { legL: [-1.4, 0, 0], armL: [-1.0, 0, 0.8], armR: [-1.0, 0, -0.8], torso: [-0.2, 0, 0], lift: 0.25 }, { legL: [0.1, 0, 0], armL: [-0.4, 0, 0.6], armR: [-0.4, 0, -0.6], torso: [0.35, 0, 0], hipsY: -0.12 }, t, th, d),
    cast: (b, t, th, d) => stage(b, { armL: [-2.8, 0, 0.5], armR: [-2.8, 0, -0.5], torso: [-0.25, 0, 0], head: [-0.3, 0, 0] }, { armL: [-1.6, 0, 0.4], armR: [-1.6, 0, -0.4], torso: [0.15, 0, 0] }, t, th, d),
    roar: (b, t, th, d) => stage(b, { armL: [-0.3, 0, 0.6], armR: [-0.3, 0, -0.6], torso: [0.4, 0, 0], head: [0.3, 0, 0], hipsY: -0.08 }, { armL: [-0.9, 0, 1.4], armR: [-0.9, 0, -1.4], torso: [-0.35, 0, 0], head: [-0.4, 0, 0] }, t, th, d),
    charge: (b, t, th, d) => t < th - 0.35 ? add(b, { torso: [0.5, 0, 0], armR: [-0.3, 0, -0.3], armL: [0.4, 0, 0.3], hipsY: -0.12, legL: [-0.6, 0, 0], legR: [0.6, 0, 0] }) : add(b, { torso: [0.6, 0, 0], armR: [-1.6, 0, 0], armL: [-1.2, 0, 0.4], legL: [-1.1, 0, 0], legR: [0.8, 0, 0] }),
    pounce: (b, t, th, d) => stage(b, { torso: [0.5, 0, 0], hipsY: -0.15, armL: [0.5, 0, 0.3], armR: [0.5, 0, -0.3] }, { torso: [0.3, 0, 0], armL: [-2.2, 0, 0.3], armR: [-2.2, 0, -0.3] }, t, th, d),
    bite: (b, t, th, d) => H_ACT.slash(b, t, th, d),
    swingStick: (b, t, th, d) => stage(b, { armR: [-2.2, 0.4, -1.0], torso: [0, 0.6, 0] }, { armR: [-1.2, -0.4, 0.8], torso: [0.1, -0.6, 0.1] }, t, th, d),
    point: (b, t, th, d) => stage(b, { armR: [-1.3, 0.3, -0.4], armL: [-0.3, 0, 0.5], torso: [0, 0.3, 0] }, { armR: [-1.75, 0, 0], armL: [-0.2, 0, 0.7], torso: [0, -0.2, 0.05] }, t, th, d),
    sing: (b, t, th, d) => stage(b, { armR: [-1.2, 0, -0.6], armL: [-0.8, 0, 0.8], head: [0.2, 0, 0] }, { armR: [-2.9, 0, -0.2], armL: [-0.5, 0, 1.3], head: [-0.35, 0, 0.1], torso: [-0.15, 0, 0], lift: 0.12 }, t, th, d),
    exAria: (b, t, th, d) => t < 0.55 ? H_ACT.spin(b, t, 0.3, 0.55) : H_ACT.sing(b, t - 0.55, Math.max(0.1, th - 0.55), d - 0.55),
    ultAria: (b, t) => add(b, { armR: [-2.9, 0, -0.3], armL: [-2.6, 0, 0.6], head: [-0.3, 0, Math.sin(t * 6) * 0.1], lift: Math.min(1, t * 1.5) * 0.6 + Math.sin(t * 3) * 0.06, spin: Math.sin(t * 2) * 0.4, torso: [-0.15, 0, 0] }),
    palmR: (b, t, th, d) => stage(b, { armR: [-0.6, 0, -0.4], torso: [0, 0.5, 0] }, { armR: [-1.65, 0, 0.1], torso: [0.1, -0.5, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0] }, t, th, d),
    palmL: (b, t, th, d) => stage(b, { armL: [-0.6, 0, 0.4], torso: [0, -0.5, 0] }, { armL: [-1.65, 0, -0.1], torso: [0.1, 0.5, 0], legR: [-0.6, 0, 0], legL: [0.5, 0, 0] }, t, th, d),
    palmBoth: (b, t, th, d) => stage(b, { armL: [-0.7, 0.3, 0.5], armR: [-0.7, -0.3, -0.5], torso: [-0.1, 0, 0] }, { armL: [-1.6, -0.2, 0.05], armR: [-1.6, 0.2, -0.05], torso: [0.2, 0, 0], legL: [-0.7, 0, 0], legR: [0.5, 0, 0], hipsY: -0.08 }, t, th, d),
    kick: (b, t, th, d) => stage(b, { legR: [0.5, 0, 0], torso: [-0.1, 0.4, 0], armL: [-1.0, 0, 0.6] }, { legR: [-1.75, 0, 0], torso: [-0.35, -0.2, 0], armL: [-0.6, 0, 1.0], armR: [0.3, 0, -0.6] }, t, th, d),
    spinKick: (b, t, th, d) => add(stage(b, { legR: [0.3, 0, 0], torso: [0, 0.4, 0], lift: 0.2 }, { legR: [-1.6, 0, -0.4], torso: [-0.3, 0, 0], armL: [-0.8, 0, 1.2], armR: [-0.8, 0, -1.2], lift: 0.35 }, t, th, d), { spin: clamp(t / (th + 0.08), 0, 1) * PI * 2 }),
    auric: (b, t, th, d) => stage(b, { armL: [-1.3, -0.8, 0.2], armR: [-1.3, 0.8, -0.2], torso: [-0.15, 0, 0], hipsY: -0.06 }, { armR: [-1.7, 0, 0], armL: [-0.4, 0, 0.8], torso: [0.25, -0.5, 0], legL: [-0.8, 0, 0], legR: [0.6, 0, 0], hipsY: -0.14 }, t, th, d),
    exYixuan: (b, t, th, d) => t < 0.5 ? H_ACT.palmR(b, t, 0.3, 0.5) : H_ACT.palmBoth(b, t - 0.5, Math.max(0.1, th - 0.5), d - 0.5),
    ultYixuan: (b, t, th, d) => {
      if (t < th) { const k = t / th; return add(b, { armL: [-1.5, -1.2 * k, 0.2], armR: [-1.5, 1.2 * k, -0.2], lift: k * 0.7, torso: [-0.2, 0, 0], head: [-0.2, 0, 0] }); }
      return stage(b, { armL: [-1.5, -1.2, 0.2], armR: [-1.5, 1.2, -0.2], lift: 0.7 }, { armR: [-1.7, 0, 0], armL: [-1.7, 0, 0], torso: [0.3, 0, 0], lift: 0.2, hipsY: -0.1 }, t - th, 0.08, d - th);
    },
    dodge: (b) => add(b, { torso: [0.35, 0, 0.25], armL: [0.5, 0, 0.6], armR: [0.5, 0, -0.6], legL: [-0.8, 0, 0], legR: [0.5, 0, 0], hipsY: -0.12 }),
  };
  // Aria's charged note: gather (crouch, stick to chest), then release at the hit
  H_ACT.chargeNote = (b, t, th, d) => t < th - 0.1 ? add(b, { armR: [-0.6, -0.6, 0.5], armL: [-0.6, 0.6, -0.4], hipsY: -0.1, torso: [0.2, 0, 0], head: [0.15, 0, 0] }) : H_ACT.point(b, t - (th - 0.1), 0.1, d - th + 0.1);

  /* --------------------------------------------------- state poses -- */
  function humanoidPose(ent, t) {
    const S = READY[ent.stance || 'brute'] || READY.brute;
    let base = P(S);
    const A = ent.anim;
    // breathing
    base.hipsY += Math.sin(t * 2.6 + ent.seed) * 0.012;
    base.torso[0] += Math.sin(t * 2.6 + ent.seed) * 0.02;
    if (A.state === 'run') {
      const ph = A.phase, s = clamp(A.speed / 4, 0.35, 1.2), sw = Math.sin(ph) * 0.9 * s;
      base = mix(base, P({ armL: [sw * 0.8 - 0.3, 0, 0.1], armR: [-sw * 0.8 - 0.3, 0, -0.1], legL: [-sw, 0, 0], legR: [sw, 0, 0], torso: [0.2 * s, 0, 0], head: [-0.1, 0, 0] }), clamp(s, 0, 1));
      base.hipsY += Math.abs(Math.cos(ph)) * 0.06 * s;
      if (ent.stance === 'guns' || ent.stance === 'gun') { base.armL[0] = -0.9; base.armR[0] = -0.9; }
      if (ent.stance === 'shield') base.armL = [-0.9, 0.15, 0.15];
    } else if (A.state === 'strafe') {
      const ph = A.phase, sw = Math.sin(ph) * 0.35;
      base = add(base, { legL: [0, 0, 0.15 + sw], legR: [0, 0, -0.15 + sw], hipsY: Math.abs(Math.cos(ph)) * 0.03 });
    }
    if (A.state === 'act' && A.act) {
      const fn = H_ACT[A.act.anim] || H_ACT.slash;
      return fn(base, A.t, A.th, A.dur);
    }
    if (A.state === 'dodge') { const p = H_ACT.dodge(base); p.roll = A.side * 0.25; return p; }
    if (A.state === 'hit') { const k = 1 - clamp(A.t / 0.3, 0, 1); return add(base, { torso: [-0.5 * k, 0, 0], head: [-0.4 * k, 0, 0], armL: [0.4 * k, 0, 0.4 * k], armR: [0.4 * k, 0, -0.4 * k] }); }
    if (A.state === 'down') return add(base, { tilt: -1.45, lift: 0.18, armL: [-2.6, 0, 0.6], armR: [-2.6, 0, -0.6], legL: [-0.2, 0, 0.2], legR: [0.2, 0, -0.2], head: [0.3, 0, 0] });
    if (A.state === 'getup') { const k = clamp(A.t / 0.45, 0, 1); return mix(add(base, { tilt: -1.45, lift: 0.18 }), base, U.easeOut(k)); }
    if (A.state === 'stun') return add(base, { torso: [0.55, 0, Math.sin(t * 2) * 0.12], head: [0.4, 0, Math.sin(t * 3) * 0.25], armL: [0.3, 0, 0.1], armR: [0.3, 0, -0.1], hipsY: -0.1, legL: [-0.3, 0, 0], legR: [0.3, 0, 0] });
    if (A.state === 'dead') return add(base, { tilt: -1.5, lift: 0.18, armL: [-2.8, 0, 0.9], armR: [-2.8, 0, -0.9] });
    if (A.state === 'guard') return H_ACT[ent.stance === 'martial' ? 'guardPalm' : 'guard'](base);
    if (A.state === 'win') return add(base, { armR: [-2.9 + Math.sin(t * 4) * 0.1, 0, -0.3], armL: [-0.2, 0, 0.5], head: [-0.2, 0, 0], torso: [-0.1, 0, 0] });
    if (A.state === 'pose') return add(base, ent.posePreset || {});
    return base;
  }

  /* quadrupeds: body (root) -> head, legFL..legBR, tail, jaw.
     Q_ACT[name](pose, t, th, dur, clock) can fill a quadruped's action pose. */
  const Q_ACT = {};
  function quadPose(ent, t) {
    const A = ent.anim, r = { body: [0, 0, 0], head: [0, 0, 0], legFL: [0, 0, 0], legFR: [0, 0, 0], legBL: [0, 0, 0], legBR: [0, 0, 0], tail: [0.3 + Math.sin(t * 3 + ent.seed) * 0.15, Math.sin(t * 2.2) * 0.3, 0], jaw: [0, 0, 0], lift: 0, tilt: 0, spin: 0, hipsY: Math.sin(t * 2.4 + ent.seed) * 0.01 };
    if (A.state === 'run' || A.state === 'strafe') {
      const ph = A.phase * 1.15, s = clamp(A.speed / 4, 0.3, 1.2), sw = Math.sin(ph) * 0.75 * s;
      r.legFL[0] = sw; r.legBR[0] = sw; r.legFR[0] = -sw; r.legBL[0] = -sw; r.hipsY += Math.abs(Math.cos(ph)) * 0.05 * s; r.body[0] = Math.sin(ph * 2) * 0.04;
    }
    if (A.state === 'act' && A.act && Q_ACT[A.act.anim]) Q_ACT[A.act.anim](r, A.t, A.th, A.dur, t);
    else if (A.state === 'act' && A.act) {
      const an = A.act.anim, k = A.t, th = A.th;
      const w = k < th - 0.05 ? U.easeOut(k / Math.max(0.05, th - 0.05)) : 0, s = k >= th - 0.05 && k < th + 0.25 ? 1 : 0, rec = k >= th + 0.25 ? clamp(1 - (k - th - 0.25) / 0.3, 0, 1) : 0;
      if (an === 'bite' || an === 'slash' || an === 'slash2') { r.head[0] = -0.5 * w + 0.5 * s + 0.2 * rec; r.jaw[0] = 0.7 * w + 0.1 * s; r.body[0] = -0.12 * w + 0.12 * s; r.legFL[0] = -0.4 * s; r.legFR[0] = -0.4 * s; }
      else if (an === 'pounce' || an === 'charge') { r.body[0] = -0.3 * w + 0.2 * s; r.hipsY -= 0.12 * w; r.legFL[0] = -1.0 * (w + s) * 0.6; r.legFR[0] = -1.0 * (w + s) * 0.6; r.legBL[0] = 0.8 * s; r.legBR[0] = 0.8 * s; r.lift = s * 0.25 + (A.air || 0); r.jaw[0] = 0.6 * s; }
      else if (an === 'spin') { r.spin = clamp(k / (th + 0.6), 0, 1) * Math.PI * 4; r.jaw[0] = 0.5; r.hipsY -= 0.06; }
      else if (an === 'slam') { r.body[0] = -0.45 * w + 0.25 * s; r.legFL[0] = -1.4 * w + 0.3 * s; r.legFR[0] = -1.4 * w + 0.3 * s; r.lift = 0; r.hipsY += 0.1 * w - 0.08 * s; }
      else if (an === 'roar' || an === 'cast') { r.head[0] = -0.6 * (w + s); r.jaw[0] = 0.9 * (w + s); r.body[0] = -0.2 * (w + s); }
    }
    if (A.state === 'hit') { const k = 1 - clamp(A.t / 0.3, 0, 1); r.body[0] = -0.2 * k; r.head[0] = -0.3 * k; }
    if (A.state === 'down' || A.state === 'dead') { r.roll = 1.4; r.lift = 0.05; r.legFL[2] = 0.4; r.legBL[2] = 0.4; }
    if (A.state === 'getup') { r.roll = 1.4 * (1 - clamp(A.t / 0.45, 0, 1)); }
    if (A.state === 'stun') { r.head[0] = 0.4; r.head[2] = Math.sin(t * 3) * 0.3; r.hipsY -= 0.1; r.legFL[0] = -0.5; r.legFR[0] = -0.5; }
    return r;
  }

  /* floaters: hover and bob; arms reach and claw */
  function floatPose(ent, t) {
    const A = ent.anim, r = { body: [0.1, 0, 0], head: [0, 0, 0], armL: [-0.4, 0, 0.4], armR: [-0.4, 0, -0.4], tail: [0.2 + Math.sin(t * 2.5) * 0.25, Math.sin(t * 1.7) * 0.3, 0], lift: Math.sin(t * 2 + ent.seed) * 0.12, tilt: 0, spin: 0, hipsY: 0 };
    if (A.state === 'run' || A.state === 'strafe') r.body[0] = 0.3;
    if (A.state === 'act' && A.act) {
      const k = A.t, th = A.th, w = k < th ? U.easeOut(k / Math.max(0.05, th)) : 0, s = k >= th && k < th + 0.3 ? 1 : 0;
      r.armL = [-0.4 - 2.0 * w - 1.0 * s, 0, 0.4]; r.armR = [-0.4 - 2.0 * w - 1.0 * s, 0, -0.4]; r.body[0] = -0.25 * w + 0.35 * s; r.lift += 0.3 * w;
    }
    if (A.state === 'hit') r.body[0] = -0.4 * (1 - clamp(A.t / 0.3, 0, 1));
    if (A.state === 'down' || A.state === 'dead') { r.lift = -0.4; r.tilt = -1.2; }
    if (A.state === 'stun') { r.lift = -0.2 + Math.sin(t * 3) * 0.05; r.body[2] = Math.sin(t * 2) * 0.3; }
    return r;
  }

  /* apply a pose to the rig, easing every part toward it */
  function apply(ent, dt, t) {
    const R = ent.rig, parts = R.parts, rest = R.rest, A = ent.anim;
    const rate = A.state === 'act' ? 26 : A.state === 'hit' ? 30 : 12;
    const k = 1 - Math.exp(-rate * dt);
    let pose;
    if (ent.kind === 'quad') pose = quadPose(ent, t);
    else if (ent.kind === 'float') pose = floatPose(ent, t);
    else pose = humanoidPose(ent, t);
    const set = (name, rot) => {
      const p = parts[name]; if (!p || !rot) return;
      const r0 = rest[name];
      p.rotation.x += (r0.rx + rot[0] - p.rotation.x) * k;
      p.rotation.y += (r0.ry + rot[1] - p.rotation.y) * k;
      p.rotation.z += (r0.rz + rot[2] - p.rotation.z) * k;
    };
    if (ent.kind === 'quad') { for (const n of ['body', 'head', 'legFL', 'legFR', 'legBL', 'legBR', 'tail', 'jaw']) set(n, pose[n]); }
    else if (ent.kind === 'float') { for (const n of ['body', 'head', 'armL', 'armR', 'tail']) set(n, pose[n]); }
    else {
      for (const n of PARTS) set(n, pose[n]);
      if (parts.hips) parts.hips.position.y += (rest.hips.py + pose.hipsY * 0.9 - parts.hips.position.y) * k;
      // hair and coat tails trail behind motion
      const sway = clamp(A.speed / 5, 0, 1);
      for (const n of ['tail', 'tailL', 'tailR']) {
        const p = parts[n]; if (!p) continue;
        const tx = rest[n].rx + 0.15 + sway * 0.7 + Math.sin(t * 3.1 + ent.seed) * 0.06 + (A.state === 'act' ? 0.2 : 0);
        p.rotation.x += (tx - p.rotation.x) * (1 - Math.exp(-6 * dt));
        p.rotation.z += (rest[n].rz + Math.sin(t * 2.3 + ent.seed) * 0.08 - p.rotation.z) * (1 - Math.exp(-6 * dt));
      }
    }
    if (ent.kind !== 'humanoid' && parts.body) parts.body.position.y += (rest.body.py + pose.hipsY - parts.body.position.y) * k;
    // whole-body offsets live on ent.body (an inner group): lift, tilt, roll, spin
    const B = ent.body, kb = 1 - Math.exp(-(A.state === 'act' ? 22 : 10) * dt);
    B.position.y += ((pose.lift || 0) + (ent.airY || 0) - B.position.y) * kb;
    B.rotation.x += ((pose.tilt || 0) - B.rotation.x) * kb;
    B.rotation.z += ((pose.roll || 0) - B.rotation.z) * kb;
    // spins are driven directly so a full turn reads as one
    B.rotation.y = pose.spin || 0;
  }

  window.ANIM = { apply, READY, ACT: H_ACT, QUAD: Q_ACT, stage, add, mix, P };
})();
