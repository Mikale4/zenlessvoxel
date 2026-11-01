/* ============================================================================
   enemy-moves.js -- how each enemy moves and attacks, after the official game
   (the Zenless Zone Zero Wiki's combat notes for every enemy, and the enemy
   attacks seen in the official skill-preview clips).

   On top of its numbers in data.js, every enemy attack gets here:
     anim     its pose sequence (poses below)
     motion   footwork: steps, side-weaves, a charge that runs through the
              Agent's spot ('charge'), a circle around her ('orbit'), leaps
     stream   continuous effects (baton sparks, bike exhaust, a gathering
              charge, the Butcher's sweeping laser)
     events   one-shot moments (Pompey mounting his bike or summoning his
              hover guns, a thrown wheel, Miasma dust clouds, a blink)
   and the battle rules that come with them (see the notes in data.js): a
   Raider's charge that can end against a wall, the Huskron's guard and
   counter, the Dullahan's breakable charge, the Butcher's openings and its
   Ether Enhanced state, Pompey's Ether wheel.

   RAIDER       shock-baton swings; from far off, a running charge
   PYROMANIAC   keeps its distance; lobbed molotovs, a four-bottle hail
   ENFORCER     a boxer: jabs, a weaving hook, uppercut, ground pound
   POMPEY       phase 1 on his motorcycle (rams, a wheelie slam, a burnout
                drift) with hover guns; phase 2 longsword and rear wheel
                (grinding, thrown like a saw), the wheel's Ether bursting
   SPAWN        axe chops; Miasma dust that bursts around you after a delay
   ARCAVOR      a stream of fire from range; a ballet pirouette
   HUSKRON      stalks, then a clawing assault; a bristling guard that counters
   PRIEST       glides; ribbon lashes, coral palms, talismans; coral spires
   FAUN         signpost swings; a long charged slam it will not be stopped in
   SPECTER      bursts of Ether bolts; blinks in to cut
   DULLAHAN     sword combos; a charged thrust; a whirlwind
   BUTCHER      pummels, hammer fists, a crushing leap; phase 2 flurries and a
                sweeping Ether laser
   ========================================================================== */
(function () {
  'use strict';
  const { clamp, rnd, dist, ang, lerp, turn } = U;
  const { ACT, QUAD, mix } = ANIM;
  const PI = Math.PI, G = VX.glow;

  /* ================================================================ POSES
     Enemy poses are written as absolute part rotations ("over" the stance:
     only the parts named change). Arms: x -1.57 points forward, -3 straight
     up; z swings an arm out sideways (armR negative, armL positive), and with
     z at about +-1.5 the y rotation sweeps it horizontally. Torso y > 0 brings
     the right shoulder forward. */
  function over(b, o) { const r = mix(b, b, 0); for (const k in o) r[k] = Array.isArray(o[k]) ? o[k].slice() : o[k]; return r; }
  function tl(base, w, s, t, th, dur) {
    const a = Math.max(0.02, th - 0.06), b = th + 0.05, c = Math.min(dur, th + 0.22);
    if (t < a) return mix(base, w, U.easeOut(t / a));
    if (t < b) return mix(w, s, (t - a) / (b - a));
    if (t < c) return s;
    return mix(s, base, U.ease(clamp((t - c) / Math.max(0.05, dur - c), 0, 1)));
  }
  const st = (b, W, S, t, th, d) => tl(b, over(b, W), over(b, S), t, th, d);
  /* a pose made of segments: [[start, fn(b, localT, segDur)], ...] */
  function seq(b, t, d, list) {
    let i = 0; while (i + 1 < list.length && t >= list[i + 1][0]) i++;
    const t0 = list[i][0], t1 = i + 1 < list.length ? list[i + 1][0] : d;
    return list[i][1](b, t - t0, t1 - t0);
  }
  const shake = (t, k) => Math.sin(t * 47) * 0.04 * k;
  // reusable swings
  const FH = { W: { armR: [-2.2, 1.0, -1.3], armL: [-0.4, 0, 0.4], torso: [0, 0.8, 0], legR: [0.3, 0, 0] }, S: { armR: [-2.0, -1.1, 0.8], armL: [-0.3, 0, 0.5], torso: [0.15, -0.8, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0], hipsY: -0.08 } };
  const BH = { W: { armR: [-1.9, -1.0, 0.9], torso: [0.1, -0.8, 0] }, S: { armR: [-2.0, 1.1, -1.0], torso: [0.1, 0.7, 0], legR: [-0.6, 0, 0], legL: [0.4, 0, 0], hipsY: -0.06 } };
  const OH = { W: { armR: [-3.0, 0, -0.3], armL: [-2.4, 0, 0.3], torso: [-0.3, 0, 0], lift: 0.1 }, S: { armR: [-0.35, 0, 0.05], armL: [-0.7, 0, 0.2], torso: [0.6, 0, 0], hipsY: -0.16, legL: [-0.7, 0, 0], legR: [0.45, 0, 0] } };
  const FHL = { W: { armL: [-2.2, -1.0, 1.3], torso: [0, -0.8, 0], legL: [0.3, 0, 0] }, S: { armL: [-2.0, 1.1, -0.8], torso: [0.15, 0.8, 0], legR: [-0.6, 0, 0], legL: [0.5, 0, 0], hipsY: -0.08 } };
  // horizontal sweeps (arm out level, y turns it round)
  const SWR = { W: { armR: [0, -0.6, -1.5], torso: [0, -0.7, 0] }, S: { armR: [0, 2.3, -1.5], torso: [0.1, 0.8, 0], legL: [-0.5, 0, 0], legR: [0.4, 0, 0], hipsY: -0.08 } };
  const SWL = { W: { armL: [0, 0.6, 1.5], torso: [0, 0.7, 0] }, S: { armL: [0, -2.3, 1.5], torso: [0.1, -0.8, 0], legR: [-0.5, 0, 0], legL: [0.4, 0, 0], hipsY: -0.08 } };
  const swing = (S, th) => (b, u, d) => st(b, S.W, S.S, u, th, d);
  const run = (t, f, k) => { const s = Math.sin(t * f) * (k || 0.9); return { legL: [-s, 0, 0], legR: [s, 0, 0], armL: [s * 0.6 - 0.2, 0, 0.3] }; };

  // ---- Raider
  ACT.rdCombo = (b, t, th, d) => seq(b, t, d, [[0, swing(FH, 0.42)], [0.62, swing(BH, 0.2)]]);
  ACT.rdCharge = (b, t, th, d) => {
    if (t < 0.68) { const k = U.easeOut(clamp(t / 0.45, 0, 1)); return over(b, { armR: [-0.35 * k, 0, 0.1], armL: [0.4 * k, 0, 0.4], torso: [0.4 * k, -0.3 * k, shake(t, k)], hipsY: -0.2 * k, legL: [-0.7 * k, 0, 0], legR: [0.6 * k, 0, 0], head: [-0.25 * k, 0, 0] }); }
    if (t < 1.32) return over(b, Object.assign(run(t, 26), { armR: [-0.3, 0, 0.1], torso: [0.6, -0.2, 0], head: [-0.35, 0, 0], hipsY: -0.08 }));
    return mix(over(b, { armR: [-0.6, 0, 0.1], torso: [0.3, 0, 0], hipsY: -0.12, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] }), b, U.ease(clamp((t - 1.32) / 0.3, 0, 1)));
  };
  ACT.rdOverhead = (b, t, th, d) => st(b, OH.W, OH.S, t, th, d);
  // ---- Pyromaniac
  const THR = { W: { armR: [-2.9, 0.2, -0.5], armL: [-1.0, 0, 0.5], torso: [-0.15, -0.5, 0], legR: [0.4, 0, 0] }, S: { armR: [-1.1, -0.2, 0.3], armL: [-0.2, 0, 0.3], torso: [0.25, 0.5, 0], legL: [-0.6, 0, 0], legR: [0.5, 0, 0] } };
  ACT.pyThrow = (b, t, th, d) => st(b, THR.W, THR.S, t, 0.4, d);
  ACT.pyHail = (b, t, th, d) => {
    const base = over(b, { hipsY: -0.06, legL: [-0.4, 0, 0.1], legR: [0.4, 0, -0.1] });
    if (t < 0.25) return mix(b, over(base, THR.W), U.easeOut(t / 0.25));
    if (t > 1.1) return mix(over(base, THR.S), b, U.ease(clamp((t - 1.1) / Math.max(0.1, d - 1.1), 0, 1)));
    const i = clamp(Math.floor((t - 0.25) / 0.2), 0, 3), u = t - 0.25 - i * 0.2, R = i % 2 === 0;
    const W = R ? THR.W : { armL: [-2.9, -0.2, 0.5], armR: [-1.0, 0, -0.5], torso: [-0.15, 0.5, 0] };
    const S = R ? THR.S : { armL: [-1.1, 0.2, -0.3], armR: [-0.2, 0, -0.3], torso: [0.25, -0.5, 0] };
    return st(base, W, S, u, 0.15, 0.2);
  };
  ACT.pySwipe = (b, t, th, d) => st(b, FH.W, FH.S, t, th, d);
  // ---- Bulky Enforcer (boxer guard)
  const JAB = { W: { armL: [-1.75, -0.4, 0.35], torso: [0.12, 0.15, 0] }, S: { armL: [-1.6, 0.05, 0.0], armR: [-1.9, 0.35, -0.3], torso: [0.25, -0.4, 0], legL: [-0.75, 0, 0.05], legR: [0.45, 0, -0.05], hipsY: -0.1 } };
  const CROSS = { W: { armR: [-1.5, 0.4, -0.4], torso: [0.12, -0.35, 0], hipsY: -0.1 }, S: { armR: [-1.6, -0.05, 0.0], armL: [-1.95, -0.35, 0.3], torso: [0.25, 0.6, 0], legL: [-0.85, 0, 0], legR: [0.6, 0, 0], hipsY: -0.12 } };
  const HOOK = { W: { armR: [-1.6, -0.8, -1.35], torso: [0.2, -0.75, 0], hipsY: -0.16, legL: [-0.5, 0, 0], legR: [0.5, 0, 0] }, S: { armR: [-1.65, 0.95, -0.2], torso: [0.25, 0.85, 0], legL: [-0.75, 0, 0], legR: [0.5, 0, 0], hipsY: -0.12 } };
  const UPPER = { W: { armR: [0.25, 0, -0.3], torso: [0.4, -0.35, 0], hipsY: -0.28, legL: [-0.7, 0, 0], legR: [0.6, 0, 0] }, S: { armR: [-3.0, 0, -0.1], armL: [-1.4, 0, 0.4], torso: [-0.3, 0.35, 0], lift: 0.32, legL: [-0.3, 0, 0], legR: [0.25, 0, 0] } };
  const SLAM2 = { W: { armL: [-3.1, 0, 0.25], armR: [-3.1, 0, -0.25], torso: [-0.35, 0, 0], lift: 0.25, legL: [-0.5, 0, 0], legR: [0.3, 0, 0] }, S: { armL: [-0.5, 0, 0.15], armR: [-0.5, 0, -0.15], torso: [0.8, 0, 0], hipsY: -0.28, legL: [-0.85, 0, 0.2], legR: [0.6, 0, -0.2] } };
  ACT.efOneTwo = (b, t, th, d) => seq(b, t, d, [[0, swing(JAB, 0.32)], [0.45, swing(CROSS, 0.17)]]);
  ACT.efHook = (b, t, th, d) => t < 0.32 ? over(b, { torso: [0.3, 0.1, 0.3 * Math.sin(t / 0.32 * PI)], hipsY: -0.22, head: [0.2, 0, 0], legL: [-0.4, 0, 0.35], legR: [0.4, 0, -0.1] }) : st(b, HOOK.W, HOOK.S, t - 0.32, 0.4, d - 0.32);
  ACT.efUpper = (b, t, th, d) => seq(b, t, d, [[0, swing(JAB, 0.3)], [0.42, swing(CROSS, 0.13)], [0.66, swing(UPPER, 0.39)]]);
  ACT.efSlam = (b, t, th, d) => st(b, SLAM2.W, Object.assign({}, SLAM2.S), t, th, d);
  ACT.efCharge = (b, t, th, d) => t < 0.62 ? over(b, { torso: [0.45, 0.9, 0], armL: [-0.5, 0, 0.3], armR: [-1.2, 0, -0.4], hipsY: -0.2, legL: [-0.6, 0, 0], legR: [0.6, 0, 0], head: [-0.2, -0.6, 0] })
    : over(b, Object.assign(run(t, 22, 0.8), { torso: [0.55, 0.9, 0], armL: [-0.6, 0, 0.3], armR: [-1.0, 0, -0.4], head: [-0.25, -0.7, 0], hipsY: -0.12 }));
  // ---- Pompey
  const RIDE = { hipsY: -0.3, legL: [-1.35, 0, 0.35], legR: [-1.35, 0, -0.35], armL: [-1.3, 0, 0.3], armR: [-1.3, 0, -0.3], torso: [0.45, 0, 0], head: [-0.25, 0, 0] };
  ACT.pmRide = (b, t, th, d) => over(b, Object.assign({}, RIDE, { torso: [0.45 + (t > 0.7 && t < 1.5 ? 0.2 : 0), 0, 0], tilt: t < 0.68 ? -0.06 + Math.sin(t * 30) * 0.02 : 0 }));
  ACT.pmWheelie = (b, t, th, d) => {
    const up = t < 0.95 ? U.easeOut(clamp(t / 0.5, 0, 1)) : 1 - clamp((t - 0.95) / 0.08, 0, 1), down = t >= 0.95 && t < 1.25 ? 1 : 0;
    return over(b, Object.assign({}, RIDE, { tilt: -0.5 * up + 0.08 * down, lift: 0.45 * up, torso: [0.2 + 0.3 * down, 0, 0] }));
  };
  ACT.pmDrift = (b, t, th, d) => over(b, Object.assign({}, RIDE, { spin: t > 0.12 && t < 1.4 ? -1.2 * Math.min(1, (t - 0.12) / 0.25) * Math.min(1, (1.4 - t) / 0.2) : 0, roll: t > 0.12 && t < 1.4 ? 0.25 : 0, armR: [-0.9, 0, -0.9] }));
  ACT.pmCommand = (b, t, th, d) => st(b, { armL: [-2.2, 0, 0.6], armR: [-0.6, 0, -0.9], torso: [-0.1, 0, 0] }, { armL: [-1.6, 0, 0.1], armR: [-0.7, 0, -1.0], torso: [0.05, -0.3, 0], legL: [-0.4, 0, 0], legR: [0.3, 0, 0] }, t, 0.4, d);
  ACT.pmSword3 = (b, t, th, d) => seq(b, t, d, [[0, swing(FH, 0.45)], [0.65, swing(BH, 0.2)], [1.05, swing(OH, 0.3)]]);
  ACT.pmWheelSwing = (b, t, th, d) => seq(b, t, d, [[0, swing(SWL, 0.7)], [0.9, (b2, u, dd) => st(b2, SWL.S, SWL.W, u, 0.15, dd)]]);
  ACT.pmWheelThrow = (b, t, th, d) => t < 0.9 ? st(b, { armL: [0.7, 0.3, 0.5], torso: [-0.1, 0.7, 0], hipsY: -0.1 }, { armL: [-1.7, -0.3, 0.1], torso: [0.25, -0.6, 0], legR: [-0.6, 0, 0], legL: [0.4, 0, 0] }, t, 0.55, 0.9)
    : st(b, { armL: [-1.6, 0, 0.3] }, { armL: [-1.3, 0, 0.5], torso: [-0.1, 0.2, 0] }, t - 0.9, 0.6, d - 0.9);
  ACT.pmWheelRaise = (b, t, th, d) => {
    if (t < 1.7) { const k = U.easeOut(clamp(t / 0.5, 0, 1)), tr = clamp((t - 0.4) / 1.2, 0, 1); return over(b, { armL: [-3.0, 0, 0.35 + shake(t, tr)], armR: [-3.0, 0, -0.35 - shake(t, tr)], torso: [-0.3 * k, 0, 0], lift: 0.15 * k, head: [-0.3 * k, 0, 0], legL: [-0.3, 0, 0.15], legR: [0.3, 0, -0.15] }); }
    return st(b, { armL: [-3.0, 0, 0.35], armR: [-3.0, 0, -0.35], lift: 0.2 }, { armL: [-0.5, 0, 0.2], armR: [-0.5, 0, -0.2], torso: [0.8, 0, 0], hipsY: -0.32, legL: [-0.9, 0, 0.2], legR: [0.6, 0, -0.2] }, t - 1.7, 0.1, d - 1.7);
  };
  // ---- Miasma Spawn
  ACT.spChop = (b, t, th, d) => st(b, OH.W, OH.S, t, th, d);
  ACT.spSummon = (b, t, th, d) => {
    if (t < 0.45) return st(b, { armL: [-2.7, 0, 0.8], armR: [-2.7, 0, -0.8], head: [-0.35, 0, 0], torso: [-0.25, 0, 0], lift: 0.08 }, { armL: [-1.5, 0, 0.4], armR: [-1.5, 0, -0.4], torso: [0.25, 0, 0], head: [0.1, 0, 0] }, t, 0.4, 0.45);
    return over(b, { armL: [-1.6 + Math.sin(t * 9) * 0.12, 0, 0.5], armR: [-1.6 + Math.cos(t * 9) * 0.12, 0, -0.5], torso: [0.25, Math.sin(t * 3) * 0.1, 0], head: [0.1, 0, 0], hipsY: -0.08 });
  };
  ACT.spLunge = (b, t, th, d) => st(b, { armL: [-0.3, 0, 0.6], armR: [-0.3, 0, -0.6], torso: [0.3, 0, 0], hipsY: -0.22, legL: [-0.6, 0, 0], legR: [0.6, 0, 0] }, { armL: [-1.6, 0, 0.1], armR: [-1.6, 0, -0.1], torso: [0.55, 0, 0], legL: [-1.0, 0, 0], legR: [0.7, 0, 0], hipsY: -0.12 }, t, th, d);
  // ---- Arcavor
  ACT.acShoot = (b, t, th, d) => {
    const k = U.easeOut(clamp(t / 0.35, 0, 1)), shots = [0.55, 0.7, 0.85, 1.0, 1.15, 1.3];
    let rec = 0; for (const s of shots) if (t >= s && t < s + 0.15) rec = Math.exp(-(t - s) * 25) * 0.3;
    const p = over(b, { armR: [-1.6 * k + rec, 0, 0.05], armL: [-0.3, 0, 0.6 * k], torso: [-0.05 - rec * 0.3, -0.35 * k, 0], legL: [-0.4, 0, 0.12], legR: [0.4, 0, -0.12], hipsY: -0.06, head: [0, 0.2 * k, 0] });
    return t > 1.4 ? mix(p, b, U.ease(clamp((t - 1.4) / 0.3, 0, 1))) : p;
  };
  ACT.acTwirl = (b, t, th, d) => {
    const on = t > 0.15 && t < 1.25, k = clamp((t - 0.15) / 0.15, 0, 1) * clamp((1.3 - t) / 0.15, 0, 1);
    return over(b, { spin: on ? (t - 0.15) * 14 : 0, legR: [-1.4 * k, 0, -0.5 * k], legL: [0.1, 0, 0], armL: [0, 0, 0.4 + 1.1 * k], armR: [0, 0, -0.4 - 1.1 * k], torso: [-0.15 * k, 0, 0], lift: 0.18 * k, head: [-0.2 * k, 0, 0] });
  };
  ACT.acRake = (b, t, th, d) => seq(b, t, d, [[0, swing(FH, 0.45)], [0.62, swing(FHL, 0.23)]]);
  // ---- Miasma Priest (gliding)
  ACT.prPalm = (b, t, th, d) => st(b, { armR: [-1.0, 0, -0.6], armL: [-0.6, 0, 0.7], torso: [-0.1, -0.5, 0] }, { armR: [-1.65, 0, -0.05], armL: [-0.4, 0, 0.8], torso: [0.25, 0.45, 0] }, t, th, d);
  ACT.prSweep = (b, t, th, d) => st(b, Object.assign({}, SWR.W, { armL: [0, 0.6, 1.5] }), Object.assign({}, SWR.S, { armL: [0, -1.2, 1.3] }), t, th, d);
  ACT.prFlurry = (b, t, th, d) => seq(b, t, d, [[0, swing(SWR, 0.7)], [0.9, swing(SWL, 0.25)], [1.35, swing({ W: SWR.W, S: Object.assign({}, SWR.S, { lift: 0.25 }) }, 0.25)]]);
  ACT.prBloom = (b, t, th, d) => st(b, { armL: [-1.3, 0, -0.5], armR: [-1.3, 0, 0.5], torso: [0.35, 0, 0], head: [0.3, 0, 0], hipsY: -0.15 }, { armL: [-2.6, 0, 1.3], armR: [-2.6, 0, -1.3], torso: [-0.35, 0, 0], head: [-0.4, 0, 0], lift: 0.5 }, t, th, d);
  ACT.prSpires = (b, t, th, d) => st(b, { armR: [-3.0, 0, -0.3], armL: [-0.6, 0, 0.8], torso: [-0.2, -0.3, 0], lift: 0.2 }, { armR: [-1.2, 0, -0.1], armL: [-0.4, 0, 0.8], torso: [0.35, 0.3, 0], lift: 0 }, t, 0.85, d);
  // ---- Faun
  ACT.fnSwing2 = (b, t, th, d) => seq(b, t, d, [[0, swing(FH, 0.55)], [0.75, swing(BH, 0.2)]]);
  ACT.fnCharge = (b, t, th, d) => {
    if (t < 1.42) { const k = U.easeOut(clamp(t / 0.5, 0, 1)), tr = clamp(t / 1.4, 0, 1); return over(b, { armR: [-3.3, 0, -0.4 + shake(t, tr * 2)], armL: [-2.7, 0, 0.5], torso: [-0.45 * k, 0.3 * k, shake(t + 1, tr)], hipsY: -0.2 * k, legL: [-0.7 * k, 0, 0.1], legR: [0.5 * k, 0, -0.1], head: [-0.2, 0, 0] }); }
    return st(b, { armR: [-3.3, 0, -0.4], armL: [-2.7, 0, 0.5], torso: [-0.45, 0.3, 0] }, { armR: [-0.4, 0, 0.1], armL: [-0.7, 0, 0.2], torso: [0.85, 0, 0], hipsY: -0.32, legL: [-0.9, 0, 0], legR: [0.6, 0, 0] }, t - 1.42, 0.08, d - 1.42);
  };
  ACT.fnLeap = (b, t, th, d) => t < 0.3 ? over(b, { hipsY: -0.3 * t / 0.3, torso: [0.4, 0, 0], armR: [0.4, 0, -0.3], armL: [0.4, 0, 0.3] })
    : st(b, { armR: [-3.2, 0, -0.3], armL: [-2.9, 0, 0.3], torso: [-0.3, 0, 0], legL: [-1.0, 0, 0], legR: [-0.5, 0, 0] }, OH.S, t - 0.3, 0.55, d - 0.3);
  // ---- Specter
  ACT.stBurst = (b, t, th, d) => {
    const shots = [0.5, 0.6, 0.7, 1.05, 1.15, 1.25]; let rec = 0; for (const s of shots) if (t >= s && t < s + 0.1) rec = Math.exp(-(t - s) * 30) * 0.25;
    const k = U.easeOut(clamp(t / 0.3, 0, 1));
    const p = over(b, { armL: [-1.75 * k + rec, 0, 0.15], armR: [0.3 * k, 0, -0.5], torso: [-0.1 - rec * 0.4, 0.3 * k, 0], head: [-0.25 * k + rec, 0, 0], legL: [-0.3, 0, 0.1], legR: [0.3, 0, -0.1] });
    return t > 1.35 ? mix(p, b, U.ease(clamp((t - 1.35) / 0.3, 0, 1))) : p;
  };
  ACT.stSlash = (b, t, th, d) => st(b, FH.W, FH.S, t, th, d);
  ACT.stLunge = (b, t, th, d) => t < 0.5 ? over(b, { torso: [0.5, 0, 0], hipsY: -0.25, armR: [0.4, 0, -0.5], armL: [0.4, 0, 0.5], legL: [-0.7, 0, 0], legR: [0.6, 0, 0] }) : st(b, FH.W, FH.S, t - 0.5, 0.25, d - 0.5);
  // ---- Dullahan
  ACT.dhCombo = (b, t, th, d) => seq(b, t, d, [[0, swing(FH, 0.45)], [0.65, swing(BH, 0.2)], [1.05, swing(OH, 0.3)]]);
  ACT.dhCharge = (b, t, th, d) => {
    if (t < 1.55) { const k = U.easeOut(clamp(t / 0.4, 0, 1)), tr = clamp((t - 0.3) / 1.2, 0, 1); return over(b, { armR: [0.6 * k, 0, -0.3 + shake(t, tr)], armL: [-1.45 * k, 0, 0.25], torso: [0.2 * k, -0.7 * k, shake(t + 2, tr)], hipsY: -0.24 * k, legL: [-0.95 * k, 0, 0.1], legR: [0.75 * k, 0, -0.1], head: [0.1, 0.4 * k, 0] }); }
    return st(b, { armR: [0.6, 0, -0.3], armL: [-1.45, 0, 0.25], torso: [0.2, -0.7, 0], hipsY: -0.24 }, { armR: [-0.35, 0, 0.05], armL: [0.4, 0, 0.5], torso: [0.4, 0.65, 0], legL: [-1.15, 0, 0], legR: [0.95, 0, 0], hipsY: -0.22 }, t - 1.55, 0.1, d - 1.55);
  };
  ACT.dhSpin = (b, t, th, d) => over(b, { spin: clamp((t - 0.3) / 0.75, 0, 1) * PI * 4, armR: [0, 0, -1.5], armL: [0, 0, 1.2], torso: [0.1, 0, 0], hipsY: -0.12, legL: [-0.4, 0, 0.2], legR: [0.4, 0, -0.2] });
  ACT.dhRise = (b, t, th, d) => st(b, { armR: [0.5, 0, -0.4], torso: [0.4, -0.4, 0], hipsY: -0.25, legL: [-0.8, 0, 0], legR: [0.6, 0, 0] }, { armR: [-3.0, 0, -0.2], torso: [-0.35, 0.3, 0], lift: 0.3, legL: [-0.2, 0, 0] }, t, th, d);
  // ---- Dead End Butcher (huge fists)
  ACT.btPummel = (b, t, th, d) => seq(b, t, d, [[0, swing(SWL, 0.45)], [0.6, swing(SWR, 0.15)], [0.9, swing(SLAM2, 0.35)]]);
  ACT.btHammer = (b, t, th, d) => st(b, SLAM2.W, SLAM2.S, t, th, d);
  ACT.btLeap = (b, t, th, d) => t < 0.45 ? over(b, { hipsY: -0.35 * Math.min(1, t / 0.3), torso: [0.5, 0, 0], armL: [0.6, 0, 0.4], armR: [0.6, 0, -0.4], legL: [-0.6, 0, 0], legR: [0.6, 0, 0] })
    : st(b, Object.assign({}, SLAM2.W, { legL: [-1.0, 0, 0], legR: [-0.6, 0, 0] }), SLAM2.S, t - 0.45, 0.8, d - 0.45);
  ACT.btSweep = (b, t, th, d) => st(b, SWL.W, SWL.S, t, th, d);
  ACT.btFlurry = (b, t, th, d) => {
    if (t < 0.3) return over(b, { armL: [-1.5, 0, 0.3], armR: [-1.5, 0, -0.3], torso: [0.3, 0, 0], hipsY: -0.15 });
    if (t < 1.25) { const i = Math.floor((t - 0.3) / 0.15), u = (t - 0.3 - i * 0.15) / 0.15, L = i % 2 === 0, x = -1.1 - 0.55 * Math.sin(u * PI); return over(b, { armL: L ? [x, 0, 0.1] : [-1.0, 0, 0.4], armR: L ? [-1.0, 0, -0.4] : [x, 0, -0.1], torso: [0.3, (L ? -0.4 : 0.4) * Math.sin(u * PI), 0], hipsY: -0.15, legL: [-0.6, 0, 0], legR: [0.5, 0, 0] }); }
    return st(b, SLAM2.W, SLAM2.S, t - 1.25, 0.35, d - 1.25);
  };
  ACT.btLaser = (b, t, th, d) => {
    if (t < 1.0) { const k = U.easeOut(clamp(t / 0.6, 0, 1)); return over(b, { head: [-0.4 * k, 0, 0], torso: [-0.3 * k, 0, 0], armL: [-0.5, 0, 1.2 * k], armR: [-0.5, 0, -1.2 * k], hipsY: -0.1 * k, legL: [-0.5, 0, 0.2], legR: [0.5, 0, -0.2] }); }
    const k = clamp((t - 1.05) / 0.9, 0, 1), yaw = lerp(-0.6, 0.6, k) * (t < 2.0 ? 1 : 0);
    return over(b, { head: [0.2, yaw * 0.4, 0], torso: [0.2, yaw * 0.6, 0], armL: [-0.7, 0, 1.0], armR: [-0.7, 0, -1.0], hipsY: -0.14, legL: [-0.5, 0, 0.2], legR: [0.5, 0, -0.2] });
  };
  ACT.btRoar = (b, t, th, d) => st(b, { armL: [-0.4, 0, 0.7], armR: [-0.4, 0, -0.7], torso: [0.45, 0, 0], head: [0.35, 0, 0], hipsY: -0.15 }, { armL: [-1.2, 0, 1.5], armR: [-1.2, 0, -1.5], torso: [-0.4, 0, 0], head: [-0.5, 0, 0], lift: 0.15 }, t, th, d);

  /* quadruped (Huskron) poses fill r: body, head, jaw, legs, tail, lift, hipsY */
  QUAD.hkFlurry = (r, t, th, d) => {
    const hits = [0.35, 0.6, 0.85, 1.3];
    hits.forEach((h, i) => {
      const u = t - h, pre = u < 0 ? clamp(1 + u / 0.16, 0, 1) : 0, post = u >= 0 ? Math.exp(-u * 9) : 0, k = pre * 0.6 + post;
      const big = i === 3 ? 1.4 : 1, front = i % 2 ? 'legFR' : 'legFL';
      r.head[0] += (-0.5 * pre + 0.55 * post) * big; r.jaw[0] += 0.8 * pre; r.body[0] += (-0.15 * pre + 0.2 * post) * big;
      r[front][0] += -1.3 * k * big; r.hipsY -= 0.06 * pre;
    });
    r.tail[0] = -0.4;
  };
  QUAD.hkGuard = (r, t, th, d, clock) => {
    const k = U.easeOut(clamp(t / 0.25, 0, 1)) * (t < 2.0 ? 1 : clamp(1 - (t - 2.0) / 0.15, 0, 1));
    r.body[0] = 0.28 * k; r.body[2] = Math.sin(clock * 30) * 0.02 * k; r.head[0] = 0.4 * k; r.hipsY -= 0.14 * k;
    r.legFL = [-0.45 * k, 0, 0.35 * k]; r.legFR = [-0.45 * k, 0, -0.35 * k]; r.legBL = [0.3 * k, 0, 0.2 * k]; r.legBR = [0.3 * k, 0, -0.2 * k];
    r.tail[0] = -0.7 * k + 0.3;
    if (t >= 2.0 && t < 2.3) { r.body[0] = -0.25; r.head[0] = -0.4; r.jaw[0] = 0.8; r.lift = 0.15; }
  };
  QUAD.hkCounter = (r, t) => {
    const pre = clamp(t / 0.3, 0, 1), s = t >= 0.42 && t < 0.75 ? 1 : 0;
    r.body[0] = -0.3 * pre * (1 - s) + 0.25 * s; r.hipsY -= 0.12 * pre * (1 - s); r.head[0] = -0.4 * pre * (1 - s) + 0.6 * s; r.jaw[0] = 0.9 * (pre * (1 - s) + s * 0.4);
    r.legFL[0] = -1.1 * s; r.legFR[0] = -1.1 * s; r.legBL[0] = 0.7 * s; r.legBR[0] = 0.7 * s; r.lift = 0.2 * s;
  };

  /* ====================================================== CHOREOGRAPHY --
     Per enemy, per attack name. */
  const cres = (t, o) => Object.assign({ t, fx: 'crescent' }, o);
  const C = {
    raider: {
      'Shock Baton Combo': { anim: 'rdCombo', motion: [{ t0: 0.28, t1: 0.42, kind: 'fwd', d: 0.6 }, { t0: 0.68, t1: 0.82, kind: 'fwd', d: 0.5 }], stream: [{ t0: 0, t1: 1.0, kind: 'sparks', from: 'weapon' }], events: [cres(0.42, { y: 1.0, tilt: -0.3, r: 1.8, col: 0x8ad8ff }), cres(0.82, { y: 1.1, tilt: 1.0, r: 1.9, col: 0x8ad8ff })] },
      'Running Charge': { anim: 'rdCharge', motion: [{ t0: 0.7, t1: 1.3, kind: 'charge', hit: 1.05, d: 10, crash: true }], stream: [{ t0: 0.1, t1: 0.66, kind: 'sparks', from: 'weapon' }, { t0: 0.7, t1: 1.3, kind: 'dust' }, { t0: 0.7, t1: 1.3, kind: 'speedLines', col: 0x8ad8ff }], events: [{ t: 0.62, fx: 'eyeGlint' }] },
      'Overhead Shock': { anim: 'rdOverhead', motion: [{ t0: 0.55, t1: 0.78, kind: 'fwd', d: 0.5 }], stream: [{ t0: 0.2, t1: 0.82, kind: 'sparks', from: 'weapon' }], events: [cres(0.8, { y: 1.3, tilt: 1.5, r: 1.8, col: 0x8ad8ff })] },
    },
    pyromaniac: {
      'Molotov Toss': { anim: 'pyThrow', stream: [{ t0: 0, t1: 0.42, kind: 'torch' }] },
      'Molotov Hail': { anim: 'pyHail', motion: [{ t0: 0, t1: 0.3, kind: 'back', d: 0.9 }], stream: [{ t0: 0, t1: 1.0, kind: 'torch' }] },
      'Torch Swipe': { anim: 'pySwipe', stream: [{ t0: 0, t1: 0.8, kind: 'torch' }], motion: [{ t0: 0.5, t1: 0.7, kind: 'fwd', d: 0.6 }], events: [cres(0.7, { y: 1.0, tilt: -0.2, r: 2.0, col: 0xff7a2a })] },
    },
    enforcer: {
      'One-Two': { anim: 'efOneTwo', motion: [{ t0: 0.2, t1: 0.32, kind: 'fwd', d: 0.5 }, { t0: 0.5, t1: 0.62, kind: 'fwd', d: 0.6 }], events: [{ t: 0.32, fx: 'punch', side: 'L' }, { t: 0.62, fx: 'punch', side: 'R', zap: true }] },
      'Weaving Hook': { anim: 'efHook', motion: [{ t0: 0, t1: 0.3, kind: 'side', d: 1.7, side: 'auto' }, { t0: 0.5, t1: 0.72, kind: 'fwd', d: 0.9 }], stream: [{ t0: 0, t1: 0.3, kind: 'afterimage', col: 0x9ad8ff }, { t0: 0.32, t1: 0.75, kind: 'sparks', from: 'fistR' }], events: [{ t: 0.72, fx: 'punch', side: 'R', zap: true, big: true }] },
      'Rising Uppercut': { anim: 'efUpper', motion: [{ t0: 0.2, t1: 0.3, kind: 'fwd', d: 0.4 }, { t0: 0.45, t1: 0.55, kind: 'fwd', d: 0.4 }, { t0: 0.85, t1: 1.05, kind: 'fwd', d: 0.6 }], stream: [{ t0: 0.66, t1: 1.05, kind: 'sparks', from: 'fistR' }], events: [{ t: 0.3, fx: 'punch', side: 'L' }, { t: 0.55, fx: 'punch', side: 'R' }, { t: 1.05, fx: 'punch', side: 'R', zap: true, big: true }, cres(1.05, { y: 1.6, tilt: 1.5, r: 1.6, col: 0x8ad8ff })] },
      'Ground Breaker': { anim: 'efSlam', stream: [{ t0: 0.3, t1: 1.05, kind: 'sparks', from: 'fistR' }, { t0: 0.3, t1: 1.05, kind: 'sparks', from: 'fistL' }] },
      'Shoulder Charge': { anim: 'efCharge', motion: [{ t0: 0.62, t1: 1.25, kind: 'charge', hit: 1.0, d: 9 }], stream: [{ t0: 0.62, t1: 1.25, kind: 'dust' }, { t0: 0.62, t1: 1.25, kind: 'speedLines', col: 0xffffff }] },
    },
    pompey: {
      'Hover Gun Volley': { anim: 'pmCommand', events: [{ t: 0.05, fx: 'hoverGuns' }] },
      'Throttle Ram': { anim: 'pmRide', motion: [{ t0: 0.15, t1: 0.55, kind: 'back', d: 1.2 }, { t0: 0.7, t1: 1.55, kind: 'charge', hit: 1.1, d: 12 }], stream: [{ t0: 0.1, t1: 0.68, kind: 'rev' }, { t0: 0.7, t1: 1.55, kind: 'exhaust' }, { t0: 0.7, t1: 1.55, kind: 'speedLines', col: 0xc8ff3a }], events: [{ t: 0, fx: 'bike' }] },
      'Wheelie Slam': { anim: 'pmWheelie', motion: [{ t0: 0.5, t1: 1.0, kind: 'leap', h: 0.9, d: 0, toTarget: true }], stream: [{ t0: 0.1, t1: 1.0, kind: 'exhaust' }], events: [{ t: 0, fx: 'bike' }, { t: 1.0, fx: 'etherRing', r: 2.8 }] },
      'Burnout Drift': { anim: 'pmDrift', retrack: true, motion: [{ t0: 0.15, t1: 1.35, kind: 'orbit', ang: PI * 1.3, r: 2.4, side: 'auto', ease: 'inOut' }], stream: [{ t0: 0.15, t1: 1.35, kind: 'tireSmoke' }, { t0: 0.15, t1: 1.35, kind: 'exhaust' }], events: [{ t: 0, fx: 'bike' }, { t: 0.75, fx: 'etherRing', r: 2.8 }, { t: 1.25, fx: 'etherRing', r: 2.8 }] },
      'Longsword Combo': { anim: 'pmSword3', motion: [{ t0: 0.3, t1: 0.45, kind: 'fwd', d: 0.6 }, { t0: 0.7, t1: 0.85, kind: 'fwd', d: 0.5 }, { t0: 1.15, t1: 1.35, kind: 'fwd', d: 0.8 }], events: [cres(0.45, { y: 1.6, tilt: -0.3, r: 3.0, col: 0xc8ff3a }), cres(0.85, { y: 1.7, tilt: 1.0, r: 3.0, col: 0xc8ff3a }), cres(1.35, { y: 2.0, tilt: 1.5, r: 3.0, col: 0xe8ffb0, sweep: 1.4 })] },
      'Wheel Grind': { anim: 'pmWheelSwing', stream: [{ t0: 0.45, t1: 1.1, kind: 'wheelSparks' }], events: [{ t: 0, fx: 'wheelHand' }, cres(0.7, { y: 1.5, tilt: 0, r: 3.3, arc: 4, col: 0xc8ff3a, sweep: 2 }), cres(1.05, { y: 1.5, tilt: 0.1, r: 3.3, arc: 4, col: 0xd9a838, sweep: -2 })] },
      'Wheel Throw': { anim: 'pmWheelThrow', events: [{ t: 0, fx: 'wheelHand' }, { t: 0.55, fx: 'wheelThrow', back: 1.55, len: 8 }] },
      'Ether Wheel Burst': { anim: 'pmWheelRaise', release: 3, stream: [{ t0: 0.2, t1: 1.75, kind: 'etherGather' }], events: [{ t: 0, fx: 'wheelHand', overhead: true }, { t: 1.8, fx: 'whiteFlash' }] },
    },
    spawn: {
      'Axe Chop': { anim: 'spChop', motion: [{ t0: 0.35, t1: 0.55, kind: 'fwd', d: 0.6 }], events: [cres(0.55, { y: 1.1, tilt: 1.4, r: 1.6, col: 0xff5060 })] },
      'Miasma Dust': { anim: 'spSummon', stream: [{ t0: 0.1, t1: 2.0, kind: 'lantern' }], events: [{ t: 0.45, fx: 'dustClouds' }] },
      'Lantern Lunge': { anim: 'spLunge', motion: [{ t0: 0.5, t1: 0.85, kind: 'toTarget', gap: 1.0 }], stream: [{ t0: 0.5, t1: 0.85, kind: 'afterimage', col: 0xff3040 }] },
    },
    arcavor: {
      'Miasma Barrage': { anim: 'acShoot', motion: [{ t0: 0.5, t1: 1.35, kind: 'side', d: 1.6, side: 'auto', ease: 'inOut' }], stream: [{ t0: 0.3, t1: 1.35, kind: 'muzzle', col: 0xff3a8a }] },
      'Pirouette': { anim: 'acTwirl', motion: [{ t0: 0.15, t1: 0.6, kind: 'toTarget', gap: 0.5 }], stream: [{ t0: 0.2, t1: 1.2, kind: 'twirl', col: 0xff3a8a }], events: [{ t: 0.6, fx: 'spinRing', col: 0xff5aa0, r: 2.0 }, { t: 0.85, fx: 'spinRing', col: 0xff5aa0, r: 2.0 }, { t: 1.15, fx: 'spinRing', col: 0xffffff, r: 2.3 }] },
      'Shard Rake': { anim: 'acRake', motion: [{ t0: 0.3, t1: 0.45, kind: 'fwd', d: 0.6 }, { t0: 0.7, t1: 0.85, kind: 'fwd', d: 0.5 }], events: [cres(0.45, { y: 1.0, tilt: -0.3, r: 1.8, col: 0xff3a8a }), cres(0.85, { y: 1.0, tilt: 0.3, r: 1.8, col: 0xff3a8a })] },
    },
    huskron: {
      'Ravaging Assault': { anim: 'hkFlurry', motion: [{ t0: 0.2, t1: 0.35, kind: 'fwd', d: 0.7 }, { t0: 0.48, t1: 0.6, kind: 'fwd', d: 0.5 }, { t0: 0.73, t1: 0.85, kind: 'fwd', d: 0.5 }, { t0: 1.1, t1: 1.3, kind: 'fwd', d: 1.0 }], events: [0.35, 0.6, 0.85, 1.3].map(t => ({ t, fx: 'claw', col: 0xff5a2a })) },
      'Bristle Guard': { anim: 'hkGuard', stream: [{ t0: 0.15, t1: 2.0, kind: 'bristle' }], events: [{ t: 2.1, fx: 'spineBurst' }] },
      'Spine Counter': { anim: 'hkCounter', motion: [{ t0: 0.3, t1: 0.5, kind: 'toTarget', gap: 0.9 }], events: [{ t: 0.5, fx: 'claw', col: 0xffd04a, big: true }] },
      'Ravaging Leap': { anim: 'pounce', motion: [{ t0: 0.55, t1: 1.05, kind: 'leap', h: 1.8, d: 0, toTarget: true }] },
      'Tail Sweep': { anim: 'spin', events: [{ t: 0.6, fx: 'spinRing', col: 0xff5a2a, r: 2.6 }] },
      'Miasma Howl': { anim: 'roar', stream: [{ t0: 0.85, t1: 1.2, kind: 'howl' }] },
    },
    priest: {
      'Coral Palm': { anim: 'prPalm', motion: [{ t0: 0.6, t1: 0.95, kind: 'fwd', d: 1.2 }], events: [{ t: 0.95, fx: 'coralBurst' }] },
      'Ribbon Sweep': { anim: 'prSweep' },
      'Ribbon Flurry': { anim: 'prFlurry', motion: [{ t0: 0.55, t1: 0.7, kind: 'fwd', d: 0.5 }, { t0: 1.0, t1: 1.15, kind: 'fwd', d: 0.5 }, { t0: 1.45, t1: 1.6, kind: 'fwd', d: 0.6 }] },
      'Miasma Talismans': { anim: 'cast', stream: [{ t0: 0.1, t1: 0.8, kind: 'gatherCol', col: 0xffcf4a }] },
      'Bloom of Rot': { anim: 'prBloom', stream: [{ t0: 0.1, t1: 1.15, kind: 'gatherCol', col: 0xd040ff, r: 4 }] },
      'Miasma Rain': { anim: 'cast', stream: [{ t0: 0.1, t1: 1.2, kind: 'gatherCol', col: 0xd040ff }] },
      'Coral Spires': { anim: 'prSpires' },
    },
    faun: {
      'Signpost Swing': { anim: 'fnSwing2', motion: [{ t0: 0.4, t1: 0.55, kind: 'fwd', d: 0.6 }, { t0: 0.8, t1: 0.95, kind: 'fwd', d: 0.4 }], events: [cres(0.55, { y: 1.1, tilt: -0.3, r: 2.0, col: 0xc8ff3a }), cres(0.95, { y: 1.2, tilt: 1.0, r: 2.0, col: 0xc8ff3a })] },
      'Charged Slam': { anim: 'fnCharge', stream: [{ t0: 0.2, t1: 1.45, kind: 'charge', col: 0xc8ff3a, from: 'weapon' }], events: [cres(1.5, { y: 1.4, tilt: 1.5, r: 2.4, col: 0xc8ff3a, sweep: 1.4 })] },
      'Leaping Smash': { anim: 'fnLeap', motion: [{ t0: 0.3, t1: 0.85, kind: 'leap', h: 1.5, d: 0, toTarget: true }] },
    },
    specter: {
      'Ether Burst': { anim: 'stBurst', stream: [{ t0: 0.25, t1: 1.3, kind: 'muzzle', col: 0xc8ff3a, from: 'muzzle' }] },
      'Blade Arm': { anim: 'stSlash', motion: [{ t0: 0.25, t1: 0.4, kind: 'fwd', d: 0.8 }], events: [cres(0.4, { y: 1.1, tilt: -0.3, r: 1.9, col: 0xc8ff3a })] },
      'Phantom Lunge': { anim: 'stLunge', motion: [{ t0: 0.35, t1: 0.47, kind: 'toTarget', gap: 1.1, ease: 'lin' }], stream: [{ t0: 0.3, t1: 0.5, kind: 'afterimage', col: 0xc8ff3a }], events: [{ t: 0.33, fx: 'blink' }, { t: 0.48, fx: 'blink' }, cres(0.75, { y: 1.1, tilt: -0.3, r: 2.0, col: 0xc8ff3a })] },
    },
    dullahan: {
      'Shard Sword Combo': { anim: 'dhCombo', motion: [{ t0: 0.3, t1: 0.45, kind: 'fwd', d: 0.6 }, { t0: 0.7, t1: 0.85, kind: 'fwd', d: 0.5 }, { t0: 1.15, t1: 1.35, kind: 'fwd', d: 0.8 }], events: [cres(0.45, { y: 1.2, tilt: -0.3, r: 2.4, col: 0xe8eaef }), cres(0.85, { y: 1.3, tilt: 1.0, r: 2.4, col: 0xc8ff3a }), cres(1.35, { y: 1.5, tilt: 1.5, r: 2.4, col: 0xe8ffb0, sweep: 1.4 })] },
      'Charged Thrust': { anim: 'dhCharge', motion: [{ t0: 1.48, t1: 1.9, kind: 'charge', hit: 1.65, d: 7 }], stream: [{ t0: 0.2, t1: 1.45, kind: 'charge', col: 0xc8ff3a, from: 'weapon' }, { t0: 1.48, t1: 1.9, kind: 'speedLines', col: 0xc8ff3a }], events: [{ t: 1.65, fx: 'thrustLine', col: 0xc8ff3a }] },
      'Whirlwind': { anim: 'dhSpin', events: [{ t: 0.6, fx: 'spinRing', col: 0xc8ff3a, r: 2.8 }, { t: 0.95, fx: 'spinRing', col: 0xffffff, r: 3.0 }] },
      'Rising Cleave': { anim: 'dhRise', motion: [{ t0: 0.5, t1: 0.7, kind: 'fwd', d: 0.6 }], events: [cres(0.7, { y: 1.5, tilt: 1.5, r: 2.2, col: 0xc8ff3a, sweep: -1.4 })] },
    },
    butcher: {
      'Pummel': { anim: 'btPummel', motion: [{ t0: 0.3, t1: 0.45, kind: 'fwd', d: 0.6 }, { t0: 0.6, t1: 0.75, kind: 'fwd', d: 0.5 }, { t0: 1.05, t1: 1.25, kind: 'fwd', d: 0.8 }], events: [{ t: 0.45, fx: 'punch', side: 'L', col: 0xc8ff3a }, { t: 0.75, fx: 'punch', side: 'R', col: 0xc8ff3a }, { t: 1.25, fx: 'punch', side: 'R', col: 0xc8ff3a, big: true }, { t: 1.4, fx: 'opening' }] },
      'Dead End Hammer': { anim: 'btHammer' },
      'Crushing Leap': { anim: 'btLeap', motion: [{ t0: 0.45, t1: 1.25, kind: 'leap', h: 2.6, d: 0, toTarget: true }] },
      'Backhand Sweep': { anim: 'btSweep', events: [cres(0.8, { y: 1.8, tilt: 0, r: 3.6, arc: 4, col: 0xc8ff3a, sweep: -2 })] },
      'Ether Rupture': { anim: 'cast', stream: [{ t0: 0.1, t1: 1.3, kind: 'gatherCol', col: 0xc8ff3a }] },
      'Flurry': { anim: 'btFlurry', motion: [{ t0: 0.35, t1: 1.15, kind: 'fwd', d: 1.4, ease: 'lin' }, { t0: 1.4, t1: 1.6, kind: 'fwd', d: 0.6 }], events: [0.4, 0.55, 0.7, 0.85, 1.0, 1.15].map((t, i) => ({ t, fx: 'punch', side: i % 2 ? 'R' : 'L', col: 0xc8ff3a })).concat([{ t: 1.6, fx: 'punch', side: 'R', col: 0xc8ff3a, big: true }, { t: 1.8, fx: 'opening' }]) },
      'Ether Laser': { anim: 'btLaser', stream: [{ t0: 0.1, t1: 1.0, kind: 'gatherCol', col: 0xc8ff3a, from: 'head', r: 1.2 }, { t0: 1.05, t1: 1.95, kind: 'laser', y0: -0.6, y1: 0.6, len: 12 }] },
      'Ether Enhance': { anim: 'btRoar', stream: [{ t0: 0.2, t1: 0.95, kind: 'gatherCol', col: 0xc8ff3a, r: 3 }], events: [{ t: 1.0, fx: 'enhance' }] },
    },
  };
  for (const id in C) {
    const def = DATA.ENEMIES[id]; if (!def) continue;
    for (const k of def.attacks) {
      const o = C[id][k.name]; if (!o) continue;
      Object.assign(k, o); delete k.move;
      // hits whose swing already draws its own crescent do not need the generic slash
      for (const h of k.hits) if (h.fx === 'ribbon' || (k.events || []).some(e => e.fx === 'crescent' && Math.abs(e.t - h.t) < 0.06)) h.noSlash = true;
    }
  }

  /* =============================================================== PROPS */
  const scene = () => BT.world.scene;
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const proto = {};
  function make(name, scale, draw) { if (!proto[name]) { const g = new VX.Grid(); draw(g); proto[name] = VX.object(g, scale, { cast: false }); } return proto[name].clone(); }
  // Pompey's motorcycle: black and white, lime seams, his toothed rear wheel
  function drawBike(g) {
    const BLK = 0x16161a, BODY = 0x23242c, WHITE = 0xe6e8ee, LIME = 0xc8ff3a, GOLD = 0xd9a838;
    const wheel = (cz, R, teeth) => {
      for (let y = -R - 1; y <= R + 1; y++) for (let z = -R - 1; z <= R + 1; z++) {
        const d = Math.hypot(y, z), Y = R + y, Z = cz + z;
        if (d <= R + 0.4 && d > R - 1.4) g.box(-1, Y, Z, 1, Y, Z, BLK);
        else if (d <= R - 1.4 && d > R - 2.4) g.set(0, Y, Z, G(LIME));
        else if (d <= 1.3) g.box(-1, Y, Z, 1, Y, Z, 0x3a3c46);
      }
      if (teeth) for (let k = 0; k < 12; k++) { const a = k / 12 * PI * 2; g.set(0, R + Math.round(Math.sin(a) * (R + 1)), cz + Math.round(Math.cos(a) * (R + 1)), GOLD); }
    };
    wheel(10, 5, false); wheel(-9, 6, true);
    g.box(-2, 5, -6, 2, 9, 7, BODY); g.box(-2, 9, -2, 2, 11, 5, WHITE); g.box(-2, 10, -8, 2, 10, -3, BLK);
    g.box(-3, 7, -6, -3, 7, 6, G(LIME)); g.box(3, 7, -6, 3, 7, 6, G(LIME));
    g.line(0, 9, 7, 0, 13, 10, WHITE); g.line(1, 9, 7, 1, 13, 10, WHITE);
    g.box(-5, 13, 9, 5, 13, 9, BLK); g.box(-1, 11, 11, 1, 12, 12, WHITE); g.set(0, 12, 13, G(0xfff2c0)); g.set(0, 11, 13, G(0xfff2c0));
    g.box(-3, 4, -11, -3, 5, -4, 0x5a5c66); g.set(-3, 4, -12, G(0xff9a3a));
    g.box(2, 9, 0, 3, 10, 3, G(0x9a6aff));
  }
  // the hover guns: small white gun drones with lime muzzles
  function drawGun(g) {
    g.box(-1, -1, -3, 1, 1, 4, 0xe6e8ee); g.box(-2, 0, -2, 2, 0, 1, 0x23242c); g.box(-1, -2, -1, 1, -2, 0, 0x23242c);
    g.set(0, 0, 5, G(0xc8ff3a)); g.set(0, 1, 2, G(0x9a6aff));
  }
  function drawBottle(g) { g.box(-1, -1, 0, 1, 1, 3, 0x5a8a3a); g.set(0, 0, 4, 0xe9e4da); g.set(0, 0, 5, G(0xffd040)); g.set(0, 1, 5, G(0xff7a20)); }
  function wheelObj() { return make('wheel', MODELS.pompey.scale, g => MODELS.pompey.parts.wheel.draw(g)); }
  /* a prop that lives while action A is still running on e, then removes itself */
  function prop(e, A, obj, update, parent, mats) {
    let gone = false;
    FX.custom(obj, 9999, (k, dt) => {
      if (gone) return;
      if (!BT.B || e.act !== A || !e.alive) { gone = true; if (obj.parent) obj.parent.remove(obj); FX.kill(obj); if (A.onPropEnd) A.onPropEnd(); return; }
      if (update) update(dt);
    }, mats);
    if (parent) parent.add(obj);   // FX.custom put it in the scene; a bike rides along with its rider
    return obj;
  }
  /* a fist (or hand) in world space */
  function fist(e, side, out) {
    const w = e.model.sockets.weapon, off = w && /^arm/.test(w[0]) ? w[1] : [0, -8, 1];
    return e.rig.socket(side === 'L' ? 'armL' : 'armR', side === 'L' ? [-off[0], off[1], off[2]] : off, out);
  }
  function from(e, name, out) {
    if (name === 'fistL') return fist(e, 'L', out);
    if (name === 'fistR') return fist(e, 'R', out);
    if (name === 'muzzle' && e.model.sockets.muzzle) return BT.sock(e, 'muzzle', out);
    if (name === 'head') return BT.sock(e, 'head', out);
    return BT.sock(e, 'weapon', out);
  }

  /* ============================================================= STREAMS */
  const FLAME = [0xfff0a0, 0xffd060, 0xff9a30, 0xff6a1a];
  const S = CHOREO.streams;
  S.sparks = (a, A, s, dt) => { if (Math.random() > dt * 30) return; from(a, s.from, _v); FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: rnd(-3, 3), vy: rnd(-1, 3), vz: rnd(-3, 3), drag: 3, life: 0.18, size: 0.07, col: U.pick([0x8ad8ff, 0xffffff, 0x5ec8ff]) }); if (Math.random() < 0.3) FX.glow(_v.x, _v.y, _v.z, 0.5, 0x5ec8ff, 0.08); };
  S.speedLines = (a, A, s, dt) => { const fx = Math.sin(A.dir), fz = Math.cos(A.dir); for (let i = 0; i < 2; i++) { const sd = rnd(-0.6, 0.6); FX.p({ x: a.x + fz * sd, y: rnd(0.4, a.height * 0.8) + a.airY, z: a.z - fx * sd, vx: -fx * 9, vz: -fz * 9, life: 0.12, size: 0.06, size1: 0.02, col: s.col || 0xffffff }); } };
  S.torch = (a, A, s, dt) => { if (!a.rig.parts.bottle || !a.rig.parts.bottle.visible || Math.random() > dt * 40) return; BT.sock(a, 'muzzle', _v); FX.p({ x: _v.x, y: _v.y, z: _v.z, vy: rnd(1, 2), life: 0.25, size: 0.1, size1: 0.02, col: U.pick(FLAME), g: -1 }); };
  S.rev = (a, A, s, dt) => { if (Math.random() < dt * 20) { const bx = a.x - Math.sin(a.face) * 1.2, bz = a.z - Math.cos(a.face) * 1.2; FX.burst(bx, 0.2, bz, 2, { col: [0x8a8a92, 0x5a5a62], glow: false, speed: 1.5, size: 0.14, g: -1, life: 0.6 }); } };
  S.exhaust = (a, A, s, dt) => { const bx = a.x - Math.sin(a.face) * 1.3, bz = a.z - Math.cos(a.face) * 1.3; if (Math.random() < dt * 40) FX.p({ x: bx, y: 0.45 + a.airY, z: bz, vx: rnd(-0.5, 0.5), vy: rnd(0.3, 1), vz: rnd(-0.5, 0.5), life: 0.4, size: 0.16, size1: 0.35, col: U.pick([0xc8ff3a, 0x9a6aff, 0xffffff]) }); if (Math.random() < dt * 25) FX.burst(bx, 0.1, bz, 1, { col: [0xc8b090, 0x8a7a60], glow: false, speed: 1.5, size: 0.12, g: 4, life: 0.4 }); };
  S.tireSmoke = (a, A, s, dt) => { if (Math.random() < dt * 40) FX.burst(a.x + rnd(-0.6, 0.6), 0.15, a.z + rnd(-0.6, 0.6), 1, { col: [0xd8d8dc, 0xa8a8b0], glow: false, speed: 1, size: 0.25, g: -0.6, life: 0.8 }); };
  S.wheelSparks = (a, A, s, dt) => { fist(a, 'L', _v); for (let i = 0; i < 2; i++) FX.p({ x: _v.x, y: _v.y, z: _v.z, vx: rnd(-5, 5), vy: rnd(0, 4), vz: rnd(-5, 5), drag: 2, g: 6, life: 0.3, size: 0.07, col: U.pick([0xd9a838, 0xfff0a0, 0xc8ff3a]) }); };
  S.etherGather = (a, A, s, dt) => { fist(a, 'L', _v); _v.y += 0.4; for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(1, 2.4), y = rnd(-1, 1); FX.p({ x: _v.x + Math.cos(an) * r, y: _v.y + y, z: _v.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 2.8, vy: -y * 2.8, vz: -Math.sin(an) * r * 2.8, life: 0.35, size: 0.12, col: U.pick([0xc8ff3a, 0x9a6aff, 0xffffff]) }); } if (Math.random() < dt * 8) FX.glow(_v.x, _v.y, _v.z, 0.6 + A.t * 0.8, 0xc8ff3a, 0.15); };
  S.lantern = (a, A, s, dt) => { if (Math.random() > dt * 18) return; BT.sock(a, 'head', _v); FX.p({ x: _v.x + rnd(-0.4, 0.4), y: _v.y, z: _v.z + rnd(-0.4, 0.4), vy: rnd(0.5, 1.5), life: 0.6, size: 0.12, size1: 0.02, col: U.pick([0xff3040, 0xd040ff, 0x2a0a10]) }); };
  S.muzzle = (a, A, s, dt) => { if (Math.random() > dt * 14) return; from(a, s.from || 'weapon', _v); FX.glow(_v.x, _v.y, _v.z, 0.5, s.col || 0xff3a8a, 0.08, { size1: 0.7 }); };
  S.twirl = (a, A, s, dt) => { for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2); FX.p({ x: a.x + Math.cos(an) * 0.9, y: rnd(0.2, 1.4) + a.airY, z: a.z + Math.sin(an) * 0.9, vx: -Math.sin(an) * 4, vz: Math.cos(an) * 4, life: 0.25, size: 0.1, size1: 0.02, col: U.pick([s.col || 0xff3a8a, 0xffffff]) }); } };
  S.bristle = (a, A, s, dt) => { if (Math.random() > dt * 30) return; FX.p({ x: a.x + rnd(-0.6, 0.6), y: rnd(1.0, 1.7), z: a.z + rnd(-0.8, 0.8), vy: rnd(1, 2.5), life: 0.35, size: 0.09, size1: 0.02, col: U.pick([0xff5a2a, 0xffd04a]) }); if (Math.random() < dt * 4) FX.ring(a.x, a.z, 0.5, 1.8, 0xff7a3a, 0.4, { a: 0.4 }); };
  S.howl = (a, A, s, dt) => { if (Math.random() < dt * 12) { BT.sock(a, 'head', _v); FX.ring(_v.x, _v.z, 0.3, 2.6, 0xff5ab0, 0.3, { y: _v.y, a: 0.6 }); } };
  S.gatherCol = (a, A, s, dt) => {
    const p = s.from ? from(a, s.from, _v) : _v.set(a.x, a.height * 0.55 + a.airY, a.z), R = s.r || 2.2;
    for (let i = 0; i < 2; i++) { const an = rnd(0, PI * 2), r = rnd(R * 0.5, R), y = rnd(-0.8, 0.8); FX.p({ x: p.x + Math.cos(an) * r, y: p.y + y, z: p.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 3, vy: -y * 3, vz: -Math.sin(an) * r * 3, life: 0.32, size: 0.12, size1: 0.03, col: U.pick([s.col, s.col, 0xffffff]) }); }
  };
  S.charge = (a, A, s, dt) => {
    from(a, s.from || 'weapon', _v);
    const k = clamp((A.t - s.t0) / Math.max(0.1, s.t1 - s.t0), 0, 1);
    for (let i = 0; i < 2; i++) if (Math.random() < dt * 24) { const an = rnd(0, PI * 2), r = rnd(0.6, 1.5); FX.p({ x: _v.x + Math.cos(an) * r, y: _v.y + rnd(-0.6, 0.6), z: _v.z + Math.sin(an) * r, vx: -Math.cos(an) * r * 4, vz: -Math.sin(an) * r * 4, life: 0.25, size: 0.11, col: U.pick([s.col, 0xffffff]) }); }
    if (Math.random() < dt * 20) FX.glow(_v.x, _v.y, _v.z, 0.6 + k * 1.8, s.col, 0.1, { size1: 0.9 + k * 2.2 });
    // the whole body glows as the charge fills: it will not be staggered out of this
    if (Math.random() < dt * 6) FX.glow(a.x, a.height * 0.5 + a.airY, a.z, a.height * (0.7 + k * 0.5), s.col, 0.18, { size1: a.height * (0.9 + k * 0.6), a: 0.25 + k * 0.25 });
  };
  /* the Butcher's Ether laser: one beam from its eye, swept across the aim */
  S.laser = (a, A, s, dt) => {
    if (!A.laser) {
      const geo = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshBasicMaterial({ color: 0xc8ff3a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const core = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const g = new THREE.Group(), m1 = new THREE.Mesh(geo, mat), m2 = new THREE.Mesh(geo, core); m1.scale.set(0.5, 0.5, 1); m2.scale.set(0.18, 0.18, 1); g.add(m1, m2);
      A.laser = g;
      prop(a, A, g, () => {
        const k = clamp((A.t - s.t0) / (s.t1 - s.t0), 0, 1), on = A.t >= s.t0 && A.t <= s.t1 + 0.05; g.visible = on;
        if (!on) return;
        BT.sock(a, 'head', _w); const yaw = A.dir + lerp(s.y0, s.y1, k), len = s.len || 12;
        const ex = _w.x + Math.sin(yaw) * len, ez = _w.z + Math.cos(yaw) * len;
        g.position.set((_w.x + ex) / 2, (_w.y + 0.3) / 2, (_w.z + ez) / 2); g.lookAt(ex, 0.3, ez);
        const L = Math.hypot(ex - _w.x, ez - _w.z, _w.y - 0.3); m1.scale.z = L; m2.scale.z = L; m1.scale.x = m1.scale.y = 0.45 + Math.sin(BT.B.real * 40) * 0.08;
        for (let i = 0; i < 3; i++) { const d = rnd(0.5, len); FX.p({ x: _w.x + Math.sin(yaw) * d, y: 0.25 + rnd(0, 0.3), z: _w.z + Math.cos(yaw) * d, vy: rnd(1, 3), vx: rnd(-1, 1), vz: rnd(-1, 1), life: 0.3, size: 0.12, col: U.pick([0xc8ff3a, 0xffffff, 0x9a6aff]) }); }
      }, null, [mat, core, geo]);
      A.onPropEnd = () => { A.laser = null; };
    }
  };

  /* ============================================================== EVENTS */
  const EV = CHOREO.events;
  EV.eyeGlint = (a) => { BT.sock(a, 'head', _v); FX.glow(_v.x, _v.y, _v.z + 0, 0.6, 0xffffff, 0.25, { size1: 1.6 }); };
  EV.punch = (a, A, e) => {
    fist(a, e.side, _v); const col = e.col || (e.zap ? 0x8ad8ff : 0xfff0c0);
    FX.burst(_v.x, _v.y, _v.z, e.big ? 22 : 10, { col: [col, 0xffffff], speed: e.big ? 7 : 4, size: 0.09, life: 0.3, g: 2 });
    FX.glow(_v.x, _v.y, _v.z, e.big ? 1.8 : 1.0, col, 0.15, { size1: e.big ? 2.8 : 1.6 });
    if (e.zap) for (let i = 0; i < 4; i++) { const an = rnd(0, PI * 2); FX.beam(_v.clone(), new THREE.Vector3(_v.x + Math.cos(an) * rnd(0.6, 1.2), _v.y + rnd(-0.6, 0.6), _v.z + Math.sin(an) * rnd(0.6, 1.2)), 0x8ad8ff, 0.04, 0.1); }
  };
  EV.hoverGuns = (a, A) => {
    a.guns = [];
    for (const side of [-1, 1]) {
      const obj = make('gun', 0.13, drawGun), G0 = { obj, side, kick: 0 };
      a.guns.push(G0);
      FX.glow(a.x, 2.6, a.z, 1.2, 0xc8ff3a, 0.25);
      prop(a, A, obj, (dt) => {
        const tg = A.tgt && A.tgt.alive ? A.tgt : null, f = a.face, rx = Math.cos(f), rz = -Math.sin(f);
        const px = a.x + rx * side * 1.4 + Math.sin(f) * 0.4, pz = a.z + rz * side * 1.4 + Math.cos(f) * 0.4, py = a.height * 0.8 + Math.sin(BT.B.real * 4 + side) * 0.08;
        G0.kick = Math.max(0, G0.kick - dt * 6);
        obj.position.set(px - Math.sin(f) * G0.kick * 0.3, py, pz - Math.cos(f) * G0.kick * 0.3);
        if (tg) obj.lookAt(tg.x, 1.0, tg.z);
        if (Math.random() < dt * 20) FX.p({ x: px, y: py - 0.2, z: pz, vy: -1.5, life: 0.2, size: 0.06, col: 0xc8ff3a });
      });
    }
    A.onPropEnd = () => { a.guns = null; };
  };
  EV.bike = (a, A) => {
    const obj = make('bike', MODELS.pompey.scale, drawBike);
    FX.burst(a.x, 0.5, a.z, 20, { col: [0xc8ff3a, 0x9a6aff, 0xffffff], speed: 4, size: 0.1, life: 0.4 });
    prop(a, A, obj, null, a.body);
  };
  EV.wheelHand = (a, A, e) => {
    const obj = wheelObj(); a.wheelOut = true; let spin = 0;
    A.wheel = { obj, flying: false };
    prop(a, A, obj, (dt) => {
      spin += dt * 18;
      if (A.wheel.flying) return;
      if (e.overhead) { fist(a, 'L', _v); fist(a, 'R', _w); _v.add(_w).multiplyScalar(0.5); _v.y += 0.3; obj.position.copy(_v); obj.rotation.set(0, a.face + PI / 2, spin * 0.6); }
      else { fist(a, 'L', _v); obj.position.copy(_v); obj.rotation.set(0, a.face, spin); }
    });
    A.onPropEnd = () => { a.wheelOut = false; };
  };
  EV.wheelThrow = (a, A, e) => {
    if (!A.wheel) return;
    const W = A.wheel, t0 = A.t, back = e.back || 1.55, len = e.len || 8;
    W.flying = true; fist(a, 'L', _v); const sy = _v.y;
    FX.custom(new THREE.Group(), back - t0 + 0.05, () => {
      if (!BT.B || a.act !== A) return;
      const k = clamp((A.t - t0) / (back - t0), 0, 1), d = len * Math.sin(k * PI);
      if (k >= 1) { W.flying = false; return; }
      const x = a.x + Math.sin(A.dir) * (0.8 + d), z = a.z + Math.cos(A.dir) * (0.8 + d);
      W.obj.position.set(x, lerp(sy, 0.9, Math.sin(k * PI)), z); W.obj.rotation.set(0, A.dir + PI / 2, BT.B.real * 30);   // rolling edge-first like a saw blade
      for (let i = 0; i < 2; i++) FX.p({ x, y: 0.5, z, vx: rnd(-4, 4), vy: rnd(1, 4), vz: rnd(-4, 4), g: 8, life: 0.3, size: 0.07, col: U.pick([0xd9a838, 0xc8ff3a, 0xfff0a0]) });
    });
  };
  EV.etherRing = (a, A, e) => { FX.ring(a.x, a.z, 0.4, e.r || 2.6, 0xc8ff3a, 0.4); FX.ring(a.x, a.z, 0.3, (e.r || 2.6) * 0.7, 0x9a6aff, 0.35); FX.named('quake', { x: a.x, z: a.z, r: e.r || 2.6 }); BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.2); };
  EV.dustClouds = (a, A) => {
    const i = A.def.hits.findIndex(h => h.zone), h = A.def.hits[i], pts = A.rain && A.rain[i]; if (!pts) return;
    const life = (h.t - A.t) / (A.speed || 1), B = BT.B;
    for (const [x, z] of pts) {
      const zn = { x, z, r: (h.r || 1.5) + 0.2, t: life, tick: 999, live: true }; B.zones.push(zn);
      FX.custom(new THREE.Group(), life, (k, dt) => {
        if (!BT.B || a.act !== A) { zn.t = 0; return; }
        const r = (h.r || 1.5) * (0.4 + 0.6 * k);
        for (let j = 0; j < 3; j++) { const an = rnd(0, PI * 2), rr = rnd(0, r); FX.p({ x: x + Math.cos(an) * rr, y: rnd(0.1, 1.2), z: z + Math.sin(an) * rr, vx: -Math.sin(an) * 1.5, vy: rnd(0.1, 0.5), vz: Math.cos(an) * 1.5, life: 0.5, size: 0.28, size1: 0.5, col: U.pick([0x5a1a3a, 0x8a2a5a, 0xd040ff, 0x2a0a1a]) }); }
      });
    }
  };
  EV.spinRing = (a, A, e) => { FX.ring(a.x, a.z, 0.4, e.r || 2.2, e.col || 0xffffff, 0.3, { y: 0.8 + a.airY }); FX.slash(a.x, 0.9 + a.airY, a.z, e.r || 2.2, a.face, e.col || 0xffffff, { arc: 6.2, width: 0.3, life: 0.2, sweep: 2 }); };
  EV.claw = (a, A, e) => { for (let i = -1; i <= 1; i++) FX.slash(a.x + Math.cos(A.dir) * i * 0.18, 1.0 + i * 0.12, a.z - Math.sin(A.dir) * i * 0.18, (e.big ? 2.4 : 2.0) - Math.abs(i) * 0.1, A.dir, e.col || 0xff5a2a, { tilt: 0.9 + i * 0.1, arc: 1.6, width: 0.12, life: 0.22, sweep: 1.4 }); };
  EV.spineBurst = (a) => { for (let i = 0; i < 30; i++) { const an = rnd(0, PI * 2); FX.p({ x: a.x, y: 1.3, z: a.z, vx: Math.cos(an) * rnd(4, 8), vy: rnd(1, 4), vz: Math.sin(an) * rnd(4, 8), drag: 2, life: 0.4, size: 0.12, size1: 0.03, col: U.pick([0xff5a2a, 0xffd04a, 0x1a1420]) }); } FX.ring(a.x, a.z, 0.4, 2.6, 0xff5a2a, 0.35); };
  EV.coralBurst = (a, A) => { const x = a.x + Math.sin(A.dir) * (a.rad + 0.8), z = a.z + Math.cos(A.dir) * (a.rad + 0.8); FX.named('coralSpike', { x, z, r: 1.8 }); };
  EV.blink = (a) => { FX.glow(a.x, 1.1 + a.airY, a.z, 2, 0xc8ff3a, 0.2, { size1: 0.4 }); FX.burst(a.x, 1.1, a.z, 14, { col: [0xc8ff3a, 0x1a1a20, 0xff70d0], speed: 4, size: 0.1, life: 0.3, g: 0 }); };
  EV.opening = (a) => { BT.sock(a, 'head', _v); FX.glow(_v.x, _v.y, _v.z, 1.0, 0xffffff, 0.3, { size1: 2.6 }); FX.glow(_v.x, _v.y, _v.z, 0.6, 0xfff0a0, 0.6, { size1: 1.2 }); };
  EV.enhance = (a) => {
    const B = BT.B; a.enhanced = true; a.enhDaze = 0;
    BT.callout('ETHER ENHANCED', 'warn', a.def.name); BT.log(`${a.def.name} is Ether Enhanced: more ATK until you Daze it enough.`, 'warn');
    FX.glow(a.x, 1.6, a.z, 4, 0xc8ff3a, 0.4, { size1: 7 }); FX.ring(a.x, a.z, 0.5, 4.5, 0xc8ff3a, 0.5); B.cam.shake = Math.max(B.cam.shake, 0.3);
  };

  /* =========================================================== HIT EFFECTS */
  const X = FX.extra;
  X.zap = o => { const x = o.x + Math.sin(o.yaw) * 1.2, z = o.z + Math.cos(o.yaw) * 1.2; FX.burst(x, 1.0, z, 14, { col: [0x8ad8ff, 0xffffff, 0x5ec8ff], speed: 5, size: 0.08, life: 0.3, g: 1 }); FX.glow(x, 1.0, z, 1.4, 0x5ec8ff, 0.15); for (let i = 0; i < 4; i++) FX.beam(new THREE.Vector3(x, 1, z), new THREE.Vector3(x + rnd(-1, 1), rnd(0.2, 1.8), z + rnd(-1, 1)), 0x8ad8ff, 0.04, 0.12); };
  X.shockQuake = o => { FX.named('quake', o); FX.ring(o.x, o.z, 0.4, (o.r || 3) * 1.05, 0x5ec8ff, 0.4); for (let i = 0; i < 8; i++) { const an = i / 8 * PI * 2; FX.beam(new THREE.Vector3(o.x, 0.2, o.z), new THREE.Vector3(o.x + Math.cos(an) * (o.r || 3), 0.2, o.z + Math.sin(an) * (o.r || 3)), 0x8ad8ff, 0.06, 0.2); } };
  X.molotov = o => { FX.named('explode', { x: o.x, z: o.z, r: o.r || 1.4 }); FX.zone(o.x, o.z, (o.r || 1.4) * 0.9, 0xff6a1a, 1.6); for (let i = 0; i < 16; i++) { const an = rnd(0, PI * 2), r = rnd(0, o.r || 1.4); FX.p({ x: o.x + Math.cos(an) * r, y: 0.1, z: o.z + Math.sin(an) * r, vy: rnd(1, 3), life: rnd(0.5, 1.2), size: 0.2, size1: 0.05, col: U.pick(FLAME), g: -0.5 }); } };
  X.fireArc = o => { for (let i = 0; i < 24; i++) { const a2 = o.yaw + rnd(-1.2, 1.2), sp = rnd(3, 6); FX.p({ x: o.x + Math.sin(a2) * 0.6, y: 1.0, z: o.z + Math.cos(a2) * 0.6, vx: Math.sin(a2) * sp, vy: rnd(0, 1), vz: Math.cos(a2) * sp, drag: 2, life: 0.4, size: 0.16, size1: 0.4, col: U.pick(FLAME), g: -1 }); } };
  X.miasmaBurst = o => { const r = o.r || 1.6; FX.burst(o.x, 0.6, o.z, 36, { col: [0xd040ff, 0xff3a8a, 0x5a1a3a, 0xffffff], speed: 6, size: 0.18, size1: 0.04, life: 0.6, g: 2, up: 1.5 }); FX.glow(o.x, 0.8, o.z, r * 1.4, 0xd040ff, 0.3, { size1: r * 2.6 }); FX.ring(o.x, o.z, 0.4, r * 1.1, 0xff3a8a, 0.4); };
  X.etherBurst = o => { const r = o.r || 1.6; FX.burst(o.x, 0.6, o.z, 36, { col: [0xc8ff3a, 0x9a6aff, 0xffffff, 0x1a1a20], speed: 6, size: 0.18, size1: 0.04, life: 0.6, g: 2, up: 1.5 }); FX.glow(o.x, 0.8, o.z, r * 1.4, 0xc8ff3a, 0.3, { size1: r * 2.6 }); FX.ring(o.x, o.z, 0.4, r * 1.1, 0xc8ff3a, 0.4); FX.pillar(o.x, o.z, r * 0.4, 4, 0xc8ff3a, 0.35); };
  X.etherBlast = o => { const r = o.r || 4; X.etherBurst(o); FX.ring(o.x, o.z, 0.5, r, 0xc8ff3a, 0.5); FX.ring(o.x, o.z, 0.5, r * 0.75, 0x9a6aff, 0.45); FX.named('quake', { x: o.x, z: o.z, r }); FX.glow(o.x, 1.5, o.z, r, 0xffffff, 0.25, { size1: r * 2 }); };
  X.coralSpike = o => {
    const r = o.r || 1.3, mat = new THREE.MeshLambertMaterial({ color: 0xd8282e }), geo = new THREE.ConeGeometry(0.22, 1.8, 5), g = new THREE.Group();
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(geo, mat), an = rnd(0, PI * 2), rr = i ? rnd(0.2, r * 0.7) : 0; m.position.set(Math.cos(an) * rr, 0.9, Math.sin(an) * rr); m.rotation.set(rnd(-0.4, 0.4), 0, rnd(-0.4, 0.4)); m.scale.setScalar(i ? rnd(0.6, 1) : 1.3); g.add(m); }
    g.position.set(o.x, 0, o.z); scene().add(g);
    FX.custom(g, 0.9, (k) => { const s = k < 0.15 ? k / 0.15 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1; g.scale.set(1, Math.max(0.01, s), 1); }, [mat, geo]);
    FX.burst(o.x, 0.4, o.z, 16, { col: [0xd8282e, 0xff5a4a, 0xffffff], speed: 4, size: 0.1, life: 0.4, g: 4 }); FX.ring(o.x, o.z, 0.3, r, 0xff5a4a, 0.3);
  };
  X.quakeLine = o => { for (let i = 1; i <= 6; i++) { const d = i * 0.7, x = o.x + Math.sin(o.yaw) * d, z = o.z + Math.cos(o.yaw) * d; FX.burst(x, 0.1, z, 6, { col: [0xc8b090, 0x8a7a60, 0xe0d0b0], glow: false, speed: 3, up: 3, size: 0.14, g: 12, life: 0.6 }); } FX.ring(o.x + Math.sin(o.yaw) * 2, o.z + Math.cos(o.yaw) * 2, 0.3, 2.2, 0xfff0c0, 0.3); BT.B.cam.shake = Math.max(BT.B.cam.shake, 0.25); };
  X.ribbon = o => { for (let i = 0; i < 3; i++) FX.slash(o.x, 1.3 + i * 0.3, o.z, (o.r || 3.6) - i * 0.35, o.yaw, [0xf28a3a, 0xffb070, 0xff5a4a][i], { arc: 3.2, width: 0.22, life: 0.32, tilt: -0.25 + i * 0.25, sweep: 1.6 }); };

  /* =============================================================== RUNTIME
     CHOREO.ext: the battle calls these for enemies. */
  const HIGH = ['ex', 'ex2', 'chain', 'ult', 'ult2', 'followup', 'quick', 'counter', 'eruption', 'charged'];
  const trackUntil = d => d.track != null ? d.track : (d.hits && d.hits.length ? d.hits[0].t : 0.2) - 0.22;
  const EXT = {};
  EXT.start = (e, A) => {
    const d = A.def;
    if (d.ether) e.ether = Math.min(3, (e.ether || 0) + d.ether);
    if (d.release) e.ether = 0;
    A.lobbed = {};
  };
  EXT.end = () => {};
  EXT.step = (e, A, dt) => {
    const d = A.def, tgt = A.tgt && A.tgt.alive ? A.tgt : null;
    // re-aim between the hits of a combo
    if (d.retrack && tgt && d.hits) { const nh = d.hits[A.hi], pt = A.hi > 0 ? d.hits[A.hi - 1].t : 0; if (nh && A.t > pt + 0.05 && A.t < nh.t - 0.2) A.dir = turn(A.dir, ang(e, tgt), 1 - Math.exp(-14 * dt)); }
    // charge telegraphs follow the aim until it locks
    if (A.teleFollow && A.t < trackUntil(d)) for (const f of A.teleFollow) { f.obj.position.set(e.x, 0.04, e.z); f.obj.rotation.y = A.dir + (f.yaw || 0); }
    // bottles in the air
    if (d.hits) d.hits.forEach((h, i) => { if (h.lob && !A.lobbed[i] && A.t >= h.t - h.lob) { A.lobbed[i] = true; lob(e, A, h, i); } });
  };
  function lob(e, A, h, i) {
    const pt = A.rain && A.rain[i] && A.rain[i][0]; if (!pt) return;
    const P = e.rig.parts.bottle; if (P) P.visible = false;
    BT.sock(e, 'muzzle', _v); const sx = _v.x, sy = _v.y, sz = _v.z, flight = h.lob / (A.speed || 1);
    const obj = make('bottle', 0.07, drawBottle); scene().add(obj);
    FX.custom(obj, flight, (k, dt) => {
      if (!BT.B || e.act !== A) { FX.kill(obj); return; }
      const x = lerp(sx, pt[0], k), z = lerp(sz, pt[1], k), y = lerp(sy, 0.2, k) + Math.sin(k * PI) * 2.2;
      obj.position.set(x, y, z); obj.rotation.x += dt * 14; obj.rotation.y += dt * 6;
      if (Math.random() < 0.7) FX.p({ x, y: y + 0.15, z, vy: 0.5, life: 0.25, size: 0.1, size1: 0.02, col: U.pick(FLAME) });
      if (k > 0.5 && P) P.visible = true;
    });
  }
  /* each frame, every live enemy */
  EXT.think = (e, dt) => {
    const B = BT.B, AI = e.def.ai || {};
    const hov = AI.hover && e.stun <= 0 && e.alive ? AI.hover + Math.sin(B.t * 2 + e.seed) * 0.08 : 0;
    const flying = e.act && e.act.def.motion && e.act.def.motion.some(m => m.kind === 'leap' || m.kind === 'rise' || m.kind === 'fall');
    if (!flying) e.airY += (hov - e.airY) * (1 - Math.exp(-6 * dt));
    if (!e.act && e.rig.parts.bottle && !e.rig.parts.bottle.visible) e.rig.parts.bottle.visible = true;
    if (e.rig.parts.wheel) e.rig.parts.wheel.visible = !(e.wheelOut && e.act);
    // Pompey's wheel stores Ether: it glows brighter with every wheel attack
    if (e.ether > 0 && e.rig.parts.wheel && Math.random() < dt * 6 * e.ether) {
      const W = e.wheelOut && e.act && e.act.wheel ? e.act.wheel.obj.position : e.rig.parts.wheel.getWorldPosition(_v);
      FX.p({ x: W.x + rnd(-0.4, 0.4), y: W.y + rnd(-0.4, 0.4), z: W.z + rnd(-0.4, 0.4), vy: rnd(0.5, 1.5), life: 0.4, size: 0.08 + e.ether * 0.03, col: U.pick([0xc8ff3a, 0x9a6aff]) });
      if (e.ether >= 3 && Math.random() < 0.3) FX.glow(W.x, W.y, W.z, 1.2, 0xc8ff3a, 0.15);
    }
    // the Ether Enhanced aura
    if (e.enhanced && Math.random() < dt * 30) FX.p({ x: e.x + rnd(-1, 1), y: rnd(0.3, e.height), z: e.z + rnd(-1, 1), vy: rnd(1, 2.5), life: 0.5, size: 0.12, size1: 0.02, col: U.pick([0xc8ff3a, 0xc8ff3a, 0xffffff]) });
    // dazed after crashing into a wall
    if (e.crashedUntil > B.t && Math.random() < dt * 12) { BT.sock(e, 'head', _v); const an = B.real * 6; FX.p({ x: _v.x + Math.cos(an) * 0.4, y: _v.y + 0.35, z: _v.z + Math.sin(an) * 0.4, life: 0.3, size: 0.09, col: 0xffe060 }); }
  };
  /* attacks the enemy is allowed to start now */
  EXT.allowed = (e, k) => {
    if (k.counterOnly) return false;
    if (k.enhance) return !e.enhanced && BT.B.t >= (e.enhNext != null ? e.enhNext : 14);
    if (k.release && (e.ether || 0) < k.release) return false;
    return true;
  };
  /* a move the enemy must make next (Pompey's wheel, full of Ether) */
  EXT.forced = e => {
    if ((e.ether || 0) >= 3) { const k = e.def.attacks.find(x => x.release && (!x.ph || x.ph === e.phase)); if (k) return k; }
    return null;
  };
  /* hits on an enemy in its guard take less damage */
  EXT.guardMult = v => { const A = v.act, d = A && A.def; return d && d.stance && A.t >= d.stance[0] && A.t <= d.stance[1] ? 0.3 : 1; };
  /* an Agent's hit landed on v: guards counter, charges break, openings reward. true = handled (no stagger) */
  EXT.onHit = (a, v, h, A) => {
    const VA = v.act, d = VA && VA.def; if (!d || !v.alive) return false;
    const t = VA.t, B = BT.B;
    if (d.stance && d.counter && t >= d.stance[0] && t <= d.stance[1]) {
      const c = v.def.attacks.find(k => k.name === d.counter); if (!c) return false;
      BT.callout('COUNTERATTACK', 'warn', v.def.name); BT.log(`${v.def.name}: ${c.name}! (gold flash: a Defensive Assist leaves it reeling)`, 'enemy');
      BT.sock(v, 'head', _v); FX.glow(_v.x, _v.y, _v.z, 1.6, 0xff7a3a, 0.25, { size1: 3 });
      B.threats = B.threats.filter(th => th.A !== VA); for (const f of VA.tele || []) FX.kill(f);   // the guard's own burst is off
      BT.endAct(v); BT.startEnemyAttack(v, c, a);
      return true;
    }
    if (d.breakable && HIGH.includes(A.kind) && t >= d.breakable[0] && t <= d.breakable[1]) {
      BT.interrupt(v, 1.5, true); BT.addDaze(a, v, v.dazeMax * 0.22);
      BT.callout('CHARGE BROKEN', 'perfect', v.def.name); BT.log(`${a.def.short} breaks the ${d.name}!`, 'perfect');
      FX.glow(v.x, 1.4, v.z, 2.6, 0xffffff, 0.3, { size1: 4 }); FX.burst(v.x, 1.4, v.z, 30, { col: [0xc8ff3a, 0xffffff], speed: 6, size: 0.1, life: 0.4 });
      return true;
    }
    if (d.opening && HIGH.includes(A.kind) && t >= d.opening[0] && t <= d.opening[1] && !VA.openUsed) {
      VA.openUsed = true; BT.addDaze(a, v, v.dazeMax * 0.18);
      BT.callout('OPENING', 'perfect', 'Bonus Daze'); BT.log(`${a.def.short} punishes the opening: bonus Daze.`, 'perfect');
    }
    return false;
  };
  /* a charge that meets a wall, a barrel or the arena edge stops dead */
  EXT.crashCheck = (e, A) => {
    const B = BT.B, I = B.bounds, m = e.rad * 0.5 + 0.08;
    let hit = e.x <= I[0] + m || e.x >= I[2] - m || e.z <= I[1] + m || e.z >= I[3] - m;
    for (const ob of B.obstacles) if (Math.hypot(e.x - ob.x, e.z - ob.z) < ob.r + e.rad) hit = true;
    for (const b of B.barrels || []) if (b.alive && Math.hypot(e.x - b.x, e.z - b.z) < 0.55 + e.rad) hit = true;
    if (!hit) return false;
    BT.sock(e, 'head', _v); FX.burst(e.x + Math.sin(A.dir) * e.rad, 1.0, e.z + Math.cos(A.dir) * e.rad, 24, { col: [0xffe060, 0xffffff, 0xc8b090], speed: 5, size: 0.1, life: 0.4 });
    FX.named('quake', { x: e.x, z: e.z, r: 1.2 }); B.cam.shake = Math.max(B.cam.shake, 0.15); SFX.play('heavy');
    BT.interrupt(e, 1.8, true); e.crashedUntil = B.t + 1.8;
    const ag = BT.active(); if (ag && ag.alive) BT.addDaze(ag, e, e.dazeMax * 0.3);
    BT.log(`${e.def.name} crashes into a wall! A free opening.`, 'perfect');
    if (BT.T.dmgNumbers) FX.number(e.x, e.height + 0.2, e.z, 'CRASH!', 'miss');
    return true;
  };
  /* where an enemy shot comes from (Pompey's hover guns) */
  EXT.origin = (e, h, out) => {
    if (h.from && e.guns) { const g = e.guns.find(x => (h.from === 'gunL') === (x.side > 0)) || e.guns[0]; g.kick = 1; out.copy(g.obj.position); FX.glow(out.x, out.y, out.z, 0.8, 0xc8ff3a, 0.1); return true; }
    return false;
  };
  /* a rectangle on the ground from (x,z) along yaw: len long, w wide, filling until the hit */
  EXT.teleRect = (x, z, yaw, len, w, col, dur) => {
    const grp = new THREE.Group(); grp.position.set(x, 0.04, z); grp.rotation.y = yaw;
    const mk = (op) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const fillM = mk(0.2), edgeM = mk(0.85), geo = new THREE.PlaneGeometry(1, 1);
    const fill = new THREE.Mesh(geo, fillM), l = new THREE.Mesh(geo, edgeM), r = new THREE.Mesh(geo, edgeM), end = new THREE.Mesh(geo, edgeM);
    for (const m of [fill, l, r, end]) { m.rotation.x = -PI / 2; grp.add(m); }
    l.scale.set(0.08, len, 1); l.position.set(w / 2, 0, len / 2); r.scale.set(0.08, len, 1); r.position.set(-w / 2, 0, len / 2); end.scale.set(w, 0.08, 1); end.position.set(0, 0, len);
    scene().add(grp);
    return FX.custom(grp, dur, (k) => { const L = Math.max(0.01, k) * len; fill.scale.set(w, L, 1); fill.position.set(0, 0, L / 2); fillM.opacity = 0.15 + 0.25 * k; edgeM.opacity = 0.6 + 0.4 * Math.sin(k * 30); }, [fillM, edgeM, geo]);
  };
  CHOREO.ext = EXT;
})();
