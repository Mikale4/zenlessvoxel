/* ============================================================================
   models-base.js -- shared pieces for building voxel characters.

   (exported as window.MB)
   THE HUMANOID RIG (agents, human enemies, mechs, bosses). Part names the
   animation system drives:
     hips  (root, parent null)  pivot at the hip joint height
     torso (parent hips)        pivot at the waist
     head  (parent torso)       pivot at the neck
     armL / armR (parent torso) pivot at the shoulder; the arm hangs down -Y
     legL / legR (parent hips)  pivot at the hip joint; the leg hangs down -Y
   Anything else (weapons, shields, hair tails, backpacks, capes) is an extra
   part parented to one of these, e.g. a sword parented to armR at the hand.
   Standard proportions at H.STD (voxels); the model faces +Z, +X is its left.

   THE QUADRUPED RIG: body (root) -> head, legFL, legFR, legBL, legBR, tail.
   THE FLOATER RIG:   body (root) -> head?, armL?, armR?, tail? (hovers, no legs)
   ========================================================================== */
(function () {
  'use strict';
  const STD = {
    hipY: 11,     // hips pivot height above the feet
    legX: 2,      // hip joints at x = +/-2, one voxel below the hips pivot
    legLen: 9,    // leg voxels from the joint down to the sole (y -9..0 under the joint at hipY-2)
    torsoH: 7,    // torso voxels y 0..6 above the waist pivot (waist pivot = hips + 1)
    shoulderX: 5, // arm pivots at x = +/-5, at the top of the torso
    armLen: 8,    // arm voxels y -7..0
    headY: 7,     // neck pivot above the waist
  };

  const H = {
    STD,
    /* a straight leg under its pivot: thigh, knee, shin, boot with a toe */
    leg(g, o) {
      o = o || {};
      const L = o.len || 9, w = o.w || 1, pant = o.pant, boot = o.boot || 0x222222, sole = o.sole || 0x111111, skin = o.skin;
      const bootH = o.bootH != null ? o.bootH : 4;
      for (let y = -L; y <= 0; y++) {
        const fromBottom = y + L;
        let c = pant;
        if (fromBottom < bootH) c = boot;
        else if (o.skinFrom != null && fromBottom >= o.skinFrom && fromBottom < (o.skinTo || 99) && skin) c = skin;
        if (c == null) continue;
        g.box(-w, y, -1, w, y, 1, c);
      }
      g.box(-w, -L, 2, w, -L + 1, 2, boot);          // toe
      g.box(-w, -L, -1, w, -L, 2, sole);             // sole
      if (o.cuff) g.box(-w - 0, -L + bootH, -1, w, -L + bootH, 1, o.cuff);
      return g;
    },
    /* an arm hanging from its pivot: sleeve, forearm, hand (the hand is at y = -7) */
    arm(g, o) {
      o = o || {};
      const L = o.len || 8, sleeve = o.sleeve, skin = o.skin || 0xf3d2bd, glove = o.glove;
      const sleeveTo = o.sleeveTo != null ? o.sleeveTo : 3; // how many voxels the sleeve covers from the shoulder
      for (let i = 0; i < L; i++) {
        const y = -i;
        let c = i < sleeveTo ? sleeve : skin;
        if (glove && i >= L - (o.gloveLen || 3)) c = glove;
        if (c == null) continue;
        const w = o.thin && i > 1 ? 0 : 1;
        if (w) g.box(-1, y, -1, 1, y, 1, c); else g.box(-1, y, -1, 0, y, 0, c);
      }
      if (o.cuff) g.box(-1, -sleeveTo, -1, 1, -sleeveTo, 1, o.cuff);
      if (o.pad) g.box(-1, -1, -1, 1, 1, 1, o.pad);
      return g;
    },
    /* a head: skin block, an anime face on the front (z = 3), room for hair around it */
    head(g, o) {
      o = o || {};
      const skin = o.skin || 0xf6d7c3, eye = o.eye || 0x3a7bd5, lash = o.lash || 0x2a1d1d, white = 0xffffff;
      g.box(-3, 0, -3, 3, 6, 3, skin);           // skull (the neck is the torso's top row)
      // eyes: 2x2 with a highlight and a lash line over them
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -2 : 1, x1 = s < 0 ? -1 : 2;
        g.box(x0, 2, 3, x1, 3, 3, o.glowEyes ? VX.glow(eye) : eye);
        g.set(s < 0 ? x0 : x1, 3, 3, white);
        g.box(x0 - (s < 0 ? 1 : 0), 4, 3, x1 + (s > 0 ? 1 : 0), 4, 3, lash);
      }
      if (o.mouth !== false) g.set(0, 0, 3, o.mouth || 0xc9776e);
      if (o.blush) { g.set(-3, 1, 3, o.blush); g.set(3, 1, 3, o.blush); }
      g.set(-4, 2, 0, skin); g.set(4, 2, 0, skin); // ears
      return g;
    },
    /* a hair cap: covers the top, back and sides of the head; bangs over the forehead */
    hairCap(g, c, o) {
      o = o || {};
      const c2 = o.shade || c;
      g.box(-4, 5, -4, 4, 7, 3, c);                 // crown (covers the skull's top rows)
      g.box(-4, 0, -4, 4, 4, -4, c2);               // back of the head
      g.box(-4, 1, -3, -4, 4, o.sideTo != null ? o.sideTo : 1, c); g.box(4, 1, -3, 4, 4, o.sideTo != null ? o.sideTo : 1, c); // sides
      // bangs: a fringe at z = 4 with a few longer strands down over the brow
      g.box(-4, 5, 4, 4, 7, 4, c);
      for (const [x, y] of (o.strands || [[-3, 4], [-1, 4], [2, 4], [3, 3], [-4, 3], [4, 3]])) g.box(x, y, 4, x, 4, 4, c);
      return g;
    },
    /* long hair falling down the back from the head pivot (drawn on the head part) */
    hairBack(g, c, len, o) {
      o = o || {};
      const w = o.w || 4;
      const top = o.from != null ? o.from : 4;
      for (let y = top; y > top - len; y--) {
        const i = top - y, ww = Math.max(2, w - Math.floor(i / 6));
        g.box(-ww, y, -5, ww, y, y >= 0 ? -4 : -3, (x) => o.shade && ((x + i) % 4 === 0) ? o.shade : c);
      }
      if (o.tip) g.box(-2, top - len, -5, 2, top - len, -3, o.tip);
      return g;
    },
    /* a simple torso block with an optional chest layer */
    torso(g, o) {
      o = o || {};
      const top = o.top, bot = o.bot || top, belt = o.belt;
      g.box(-3, 0, -2, 3, 2, 1, bot);
      g.box(-3, 3, -2, 3, 6, 1, top);
      if (o.chest) g.box(-2, 3, 2, 2, 5, 2, o.chest === true ? top : o.chest);
      if (belt) g.box(-3, 0, -2, 3, 0, 1, belt);
      return g;
    },
  };

  /* assemble the standard humanoid parts from draw functions.
     spec = { scale, height, width, hips(g), torso(g), head(g), armL(g), armR(g), legL(g), legR(g), extra:{name:{parent,at,draw,rot}} } */
  H.humanoid = function (spec) {
    const S = Object.assign({}, STD, spec.std || {});
    const parts = {
      hips: { parent: null, at: [0, S.hipY, 0], draw: spec.hips || (g => g.box(-3, -2, -2, 3, 0, 1, 0x333333)) },
      torso: { parent: 'hips', at: [0, 1, 0], draw: spec.torso },
      head: { parent: 'torso', at: [0, S.headY, 0], draw: spec.head },
      armL: { parent: 'torso', at: [S.shoulderX, 6, 0], draw: spec.armL },
      armR: { parent: 'torso', at: [-S.shoulderX, 6, 0], draw: spec.armR },
      legL: { parent: 'hips', at: [S.legX, -2, 0], draw: spec.legL },
      legR: { parent: 'hips', at: [-S.legX, -2, 0], draw: spec.legR },
    };
    for (const k in spec.extra || {}) parts[k] = spec.extra[k];
    return { kind: 'humanoid', scale: spec.scale || 0.07, height: spec.height || 27, width: spec.width || 14, sockets: spec.sockets || {}, parts };
  };

  window.MB = H; // "model builder": the helpers above (models refer to it as MB)
  window.MODELS = window.MODELS || {};
})();
