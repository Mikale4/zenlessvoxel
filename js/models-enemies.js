/* ============================================================================
   models-enemies.js -- the enemies, matched to their official art.
   Outer Ring: Hollow Thugs (Raider, Pyromaniac, Bulky Enforcer) and the
   Corrupted Overlord - Pompey. Yunkui Summit: Miasma Spawn, Miasma Walker -
   Arcavor, Miasma Ravager - Huskron, Miasma Priest. The Hollow: Faun,
   Specter, Dullahan, Notorious - Dead End Butcher.
   Ethereals share a look: dark bodies, white crystal shards, neon seams, and
   a black void "eye ring" with a glowing halo.
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, H = window.MB;

  /* a black void disc ringed with glow, facing +Z, centred at (cx, cy, cz) */
  function voidRing(g, cx, cy, cz, r, col) {
    for (let x = -r - 1; x <= r + 1; x++) for (let y = -r - 1; y <= r + 1; y++) {
      const d = Math.hypot(x, y);
      if (d <= r - 0.6) g.set(cx + x, cy + y, cz, 0x050507);
      else if (d <= r + 0.5) g.set(cx + x, cy + y, cz, G(col));
    }
    g.set(cx, cy, cz + 1, G(0xffffff));
  }
  /* crystal shards: short jagged spikes poking out of a surface */
  function shards(g, list, col, col2) {
    for (const [x, y, z, dx, dy, dz, n] of list) for (let i = 0; i < (n || 3); i++) g.set(x + dx * i, y + dy * i, z + dz * i, i === (n || 3) - 1 ? (col2 || col) : col);
  }
  /* a hunched humanoid's arms reach lower: an arm of length L with fist size f */
  function longArm(g, L, c, fist, f) {
    for (let i = 0; i < L; i++) g.box(-1, -i, -1, 1, -i, 1, c);
    f = f || 1; g.box(-f, -L - f, -f, f, -L + 1, f, fist);
  }

  /* ======================= OUTER RING ======================= */

  /* Hollow Thug - Raider: big white dome helmet with a black angry-face visor
     and an antenna, a gas-mask respirator, a white vest over black, baggy grey
     pants, a black-and-yellow bat. */
  {
    const WHITE = 0xeeeeee, WHITE2 = 0xc9c9cd, BLACK = 0x1c1c22, PANTS = 0x45474f, SKIN = 0xe4b796, YEL = 0xf2c230;
    MODELS.raider = H.humanoid({
      scale: 0.07, height: 28, width: 18,
      sockets: { weapon: ['bat', [0, 0, 14]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -2, -2, 3, 0, 1, PANTS); g.box(-3, 0, -2, 3, 0, 1, BLACK); g.set(2, -1, 2, YEL); },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, BLACK); g.box(-3, 2, -2, 3, 6, 1, WHITE); g.box(-1, 2, 2, 1, 6, 2, BLACK);
        g.box(-3, 2, 2, -2, 6, 2, WHITE); g.box(2, 2, 2, 3, 6, 2, WHITE); g.set(-2, 4, 3, YEL); g.box(-3, 2, -3, 3, 5, -3, 0x3a3a40);
      },
      head(g) {
        g.ell(0, 3, 0, 4.5, 4.5, 4.5, WHITE); g.box(-4, 0, -4, 4, 0, 4, WHITE2);
        g.box(-3, 2, 5, 3, 4, 5, BLACK); g.set(-2, 4, 5, G(0xffffff)); g.set(2, 4, 5, G(0xffffff)); g.set(-1, 3, 5, WHITE2); g.set(1, 3, 5, WHITE2); // angry face visor
        g.box(-2, -1, 3, 2, 0, 5, BLACK); g.box(-3, -1, 4, -3, 0, 5, YEL); g.box(3, -1, 4, 3, 0, 5, YEL);     // respirator
        g.box(3, 7, -1, 3, 11, -1, BLACK); g.set(3, 12, -1, G(0xff4040));                                  // antenna
      },
      armL(g) { H.arm(g, { sleeve: BLACK, sleeveTo: 5, skin: SKIN, glove: BLACK, gloveLen: 2 }); },
      armR(g) { H.arm(g, { sleeve: BLACK, sleeveTo: 5, skin: SKIN, glove: BLACK, gloveLen: 2 }); },
      legL(g) { H.leg(g, { pant: PANTS, boot: BLACK, bootH: 3 }); g.box(-2, -6, -1, 1, -3, 1, PANTS); },
      legR(g) { H.leg(g, { pant: PANTS, boot: BLACK, bootH: 3 }); g.box(-1, -6, -1, 2, -3, 1, PANTS); },
      extra: { bat: { parent: 'armR', at: [0, -7, 0], draw(g) { g.box(0, 0, -2, 0, 0, 3, YEL); g.box(-1, -1, 4, 1, 1, 14, BLACK); g.box(-1, -1, 9, 1, 1, 9, YEL); } } },
    });
  }

  /* Hollow Thug - Pyromaniac: glossy orange dome visor, black respirator, a
     black jacket with a white print, bandaged arms, shorts over leggings, red
     sneakers; a flaming bottle in the right hand. */
  {
    const ORANGE = 0xf29a1a, ORANGE2 = 0xc8740e, BLACK = 0x1c1c22, WHITE = 0xe8e8e8, SKIN = 0xe4b796, BAND = 0xe9e4da, RED = 0xc8302a;
    MODELS.pyromaniac = H.humanoid({
      scale: 0.07, height: 28, width: 18,
      sockets: { weapon: ['bottle', [0, 0, 4]], muzzle: ['bottle', [0, 0, 5]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -3, -2, 3, 0, 1, BLACK); g.box(-3, -3, -2, 3, -3, 1, 0x2c2c32); },
      torso(g) { g.box(-3, 0, -2, 3, 6, 1, BLACK); g.box(-2, 2, 2, 2, 5, 2, BLACK); g.box(-1, 3, 3, 1, 4, 3, WHITE); g.set(0, 5, 3, WHITE); g.box(-3, 1, -3, 3, 1, -3, RED); },
      head(g) {
        g.ell(0, 3, 0, 4.5, 4.5, 4.5, ORANGE); g.box(-3, 2, 4, 3, 5, 5, ORANGE2); g.set(-2, 5, 5, G(0xffe2a0)); g.box(-4, 0, -4, 4, 0, 4, BLACK);
        g.box(-2, -1, 3, 2, 1, 5, BLACK); g.box(-3, 0, 4, -3, 1, 5, 0x4a4a52); g.box(3, 0, 4, 3, 1, 5, 0x4a4a52);
      },
      armL(g) { H.arm(g, { sleeve: BLACK, sleeveTo: 3, skin: BAND, glove: BLACK, gloveLen: 2 }); },
      armR(g) { H.arm(g, { sleeve: BLACK, sleeveTo: 3, skin: BAND, glove: BLACK, gloveLen: 2 }); },
      legL(g) { H.leg(g, { pant: BLACK, boot: RED, bootH: 3, sole: WHITE }); g.box(-1, -9, 2, 1, -9, 2, WHITE); },
      legR(g) { H.leg(g, { pant: BLACK, boot: RED, bootH: 3, sole: WHITE }); g.box(-1, -9, 2, 1, -9, 2, WHITE); },
      extra: { bottle: { parent: 'armR', at: [0, -7, 1], draw(g) { g.box(-1, -1, 0, 1, 1, 3, 0x6a8a3a); g.box(0, 0, 4, 0, 0, 4, BAND); g.set(0, 0, 5, G(0xffd040)); g.set(0, 1, 5, G(0xff7a20)); g.set(0, 1, 6, G(0xff5010)); g.set(-1, 1, 5, G(0xff8a30)); } } },
    });
  }

  /* Hollow Thug - Bulky Enforcer (elite): a huge brute in a black sphere helmet
     with a white target eye, a white tank top and jeans, massive mechanical
     gauntlets on both arms. */
  {
    const BLACK = 0x18181d, WHITE = 0xf0f0f0, SKIN = 0xd9a07a, SKIN2 = 0xc08860, JEANS = 0x3f4a63, METAL = 0x4a4c54, METAL2 = 0x2c2e34;
    const gauntlet = g => {
      for (let i = 0; i < 3; i++) g.box(-2, -i, -2, 2, -i, 2, i === 0 ? SKIN : SKIN2);
      g.box(-3, -10, -3, 3, -3, 3, METAL); g.box(-3, -10, 3, 3, -9, 4, METAL2); g.box(-3, -6, -3, 3, -6, 3, METAL2);
      g.set(-3, -5, 3, G(0x5ec8ff)); g.set(3, -5, 3, G(0x5ec8ff)); g.box(-1, -4, -4, 1, -2, -4, 0x9a9aa2);
    };
    MODELS.enforcer = H.humanoid({
      scale: 0.085, height: 30, width: 22,
      std: { shoulderX: 8, legX: 2 },
      sockets: { weapon: ['armR', [0, -10, 3]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 5, 3]] },
      hips(g) { g.box(-4, -2, -2, 4, 0, 2, JEANS); g.box(-4, 0, -2, 4, 0, 2, 0x2a2a30); },
      torso(g) {
        g.box(-5, 0, -3, 5, 7, 2, SKIN); g.box(-4, 0, -3, 4, 6, 3, WHITE); g.box(-5, 6, -3, 5, 7, 2, SKIN2);
        g.box(-2, 3, 4, 2, 3, 4, 0x9a9aa2); g.set(0, 4, 4, G(0xffd65e));                        // chain + charm
      },
      head(g) { g.ell(0, 3, 0, 4, 4, 4, BLACK); voidRing(g, 0, 3, 4, 2, 0xffffff); g.set(-2, 6, 3, G(0xcfe8ff)); g.box(3, 5, -1, 4, 6, 0, 0x8a8a92); g.box(-4, 5, -1, -3, 6, 0, 0x8a8a92); },
      armL: gauntlet, armR: gauntlet,
      legL(g) { H.leg(g, { pant: JEANS, boot: WHITE, bootH: 2, w: 1 }); g.box(-2, -5, -2, 2, 0, 2, JEANS); },
      legR(g) { H.leg(g, { pant: JEANS, boot: WHITE, bootH: 2, w: 1 }); g.box(-2, -5, -2, 2, 0, 2, JEANS); },
    });
  }

  /* Corrupted Overlord - Pompey (boss): a biker turned Ethereal. Jagged white
     crystal armour over a black body, lime and violet seams, a horned helm with
     a void eye ring, a serrated white longsword and his bike's toothed rear
     wheel on his back. */
  {
    const BODY = 0x1c1d24, BODY2 = 0x2c2e38, WHITE = 0xe6e8ee, WHITE2 = 0xb9bcc8, LIME = 0xc8ff3a, VIOLET = 0x9a6aff, GOLD = 0xd9a838;
    MODELS.pompey = H.humanoid({
      scale: 0.11, height: 30, width: 24,
      sockets: { weapon: ['sword', [0, 0, 20]], muzzle: ['head', [0, 3, 5]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -2, -2, 3, 0, 1, BODY); shards(g, [[-4, -1, 0, -1, -1, 0, 2], [4, -1, 0, 1, -1, 0, 2]], WHITE); },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, BODY); g.box(-3, 3, 2, 3, 6, 2, WHITE); g.box(-2, 1, 2, 2, 2, 2, WHITE2);
        g.box(0, 0, 3, 0, 5, 3, G(LIME)); g.set(-2, 4, 3, G(VIOLET)); g.set(2, 4, 3, G(VIOLET));
        shards(g, [[-4, 6, 0, -1, 1, 0, 3], [4, 6, 0, 1, 1, 0, 3], [-3, 6, -2, -1, 1, -1, 3], [3, 6, -2, 1, 1, -1, 3]], WHITE, WHITE2);
      },
      head(g) {
        g.box(-3, 0, -3, 3, 6, 3, BODY2); g.box(-3, 4, -3, 3, 7, 3, WHITE);
        voidRing(g, 0, 3, 4, 2, VIOLET);
        for (const s of [-1, 1]) shards(g, [[s * 3, 7, 0, s, 1, -1, 4], [s * 2, 8, 2, 0, 1, 0, 3]], WHITE, G(LIME));
      },
      armL(g) { H.arm(g, { sleeve: WHITE, sleeveTo: 3, skin: BODY, glove: BODY2, gloveLen: 2 }); g.box(-1, -5, 2, 1, -5, 2, G(LIME)); },
      armR(g) { H.arm(g, { sleeve: WHITE, sleeveTo: 3, skin: BODY, glove: BODY2, gloveLen: 2 }); g.box(-1, -5, 2, 1, -5, 2, G(LIME)); },
      legL(g) { H.leg(g, { pant: BODY, boot: WHITE, bootH: 4, sole: BODY2 }); g.box(-1, -5, 2, 1, -5, 2, G(LIME)); },
      legR(g) { H.leg(g, { pant: BODY, boot: WHITE, bootH: 4, sole: BODY2 }); g.box(-1, -5, 2, 1, -5, 2, G(LIME)); },
      extra: {
        sword: { parent: 'armR', at: [0, -7, 0], draw(g) {
          g.box(0, 0, -2, 0, 0, 1, BODY); g.box(-2, 0, 2, 2, 0, 2, G(LIME));
          g.box(-1, 0, 3, 1, 0, 19, WHITE); for (let z = 4; z <= 18; z += 2) g.set(2, 0, z, WHITE2); g.box(0, 0, 4, 0, 0, 17, G(LIME)); g.set(0, 0, 20, WHITE);
        } },
        wheel: { parent: 'torso', at: [0, 4, -4], draw(g) {
          for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) { const d = Math.hypot(x, y); if (d <= 6.5 && d > 4.6) g.set(x, y, 0, 0x16161a); else if (d <= 4.6 && d > 3.6) g.set(x, y, 0, G(LIME)); else if (d <= 1.5) g.set(x, y, 0, 0x2c2e38); }
          for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.set(Math.round(Math.cos(a) * 7.5), Math.round(Math.sin(a) * 7.5), 0, GOLD); }
        } },
      },
    });
  }

  /* ======================= YUNKUI SUMMIT ======================= */

  /* Miasma Spawn: a small figure under a huge round black hood-lantern hung with
     white skull charms, in a red ritual robe with white trim, with a red-handled
     axe. */
  {
    const BLACK = 0x16161a, RED = 0xb8242a, RED2 = 0x8a1a20, WHITE = 0xeeeae2, BONE = 0xd8d2c4;
    MODELS.spawn = H.humanoid({
      scale: 0.07, height: 28, width: 20,
      std: { hipY: 9, headY: 6 },
      sockets: { weapon: ['axe', [0, 0, 12]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 3, 2]] },
      hips(g) { g.box(-4, -5, -3, 4, 0, 2, RED); g.box(-4, -5, 3, 4, -5, 3, WHITE); g.box(-1, -5, 3, 1, 0, 3, WHITE); },
      torso(g) { g.box(-3, 0, -2, 3, 5, 1, RED); g.box(-1, 0, 2, 1, 5, 2, WHITE); g.box(-3, 2, -2, 3, 2, 1, RED2); },
      head(g) {
        g.ell(0, 4, -1, 6, 5.5, 6, BLACK);                                              // the great black hood
        g.box(-3, 0, 4, 3, 4, 5, 0x2a1418); g.set(-1, 2, 6, G(0xff3040)); g.set(1, 2, 6, G(0xff3040)); // red eyes in the dark
        for (let k = 0; k < 7; k++) { const a = -0.6 + k * 0.2 * Math.PI; const x = Math.round(Math.sin(a) * 6), z = Math.round(Math.cos(a) * 6) - 1; g.box(x, 6, z, x, 7, z, BONE); g.set(x, 7, z + (z > 0 ? 1 : 0), WHITE); }
        g.box(-6, 4, -1, 6, 4, -1, RED);
      },
      armL(g) { H.arm(g, { sleeve: RED, sleeveTo: 6, skin: BONE, glove: BONE, gloveLen: 2 }); g.box(-1, -5, -1, 1, -5, 1, WHITE); },
      armR(g) { H.arm(g, { sleeve: RED, sleeveTo: 6, skin: BONE, glove: BONE, gloveLen: 2 }); g.box(-1, -5, -1, 1, -5, 1, WHITE); },
      legL(g) { H.leg(g, { len: 7, pant: RED2, boot: BLACK, bootH: 2 }); },
      legR(g) { H.leg(g, { len: 7, pant: RED2, boot: BLACK, bootH: 2 }); },
      extra: { axe: { parent: 'armR', at: [0, -7, 0], draw(g) { g.box(0, 0, -2, 0, 0, 11, RED); g.box(0, -3, 8, 0, 3, 11, 0xd8d8de); g.box(0, 1, 9, 0, 2, 10, WHITE); g.set(0, 0, 12, 0x9a9aa2); } } },
    });
  }

  /* Miasma Walker - Arcavor: a hunched Ether mutant of white crystal shards over
     black, a round head with a magenta core-eye, pink glowing veins. */
  {
    const BLACK = 0x1a1a20, WHITE = 0xeceef2, WHITE2 = 0xc4c8d2, PINK = 0xff3a8a;
    MODELS.arcavor = H.humanoid({
      scale: 0.07, height: 28, width: 20,
      sockets: { weapon: ['armR', [0, -10, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -2, -2, 3, 0, 1, BLACK); shards(g, [[-3, -2, 1, -1, -1, 1, 2], [3, -2, 1, 1, -1, 1, 2]], WHITE); },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, BLACK); g.box(-3, 3, -3, 3, 6, -2, WHITE);
        g.box(-1, 1, 2, 1, 3, 2, G(PINK)); shards(g, [[-3, 6, -2, -1, 1, -1, 3], [0, 6, -3, 0, 1, -1, 4], [3, 6, -2, 1, 1, -1, 3]], WHITE, WHITE2);
      },
      head(g) { g.ell(0, 3, 0, 3.6, 3.6, 3.6, WHITE); voidRing(g, 0, 3, 4, 2, PINK); shards(g, [[-2, 6, -1, -1, 1, -1, 3], [2, 6, -1, 1, 1, -1, 3]], WHITE, G(PINK)); },
      armL(g) { longArm(g, 9, BLACK, WHITE, 1); g.box(-1, -4, 2, 1, -4, 2, G(PINK)); shards(g, [[1, 0, 0, 1, 1, 0, 2]], WHITE); },
      armR(g) { longArm(g, 9, BLACK, WHITE, 1); g.box(-1, -4, 2, 1, -4, 2, G(PINK)); shards(g, [[-1, 0, 0, -1, 1, 0, 2]], WHITE); },
      legL(g) { H.leg(g, { pant: BLACK, boot: WHITE, bootH: 3, sole: WHITE2 }); g.set(0, -5, 2, G(PINK)); },
      legR(g) { H.leg(g, { pant: BLACK, boot: WHITE, bootH: 3, sole: WHITE2 }); g.set(0, -5, 2, G(PINK)); },
    });
  }

  /* Miasma Ravager - Huskron (elite): a spiny purple-and-black quadruped with
     red-orange glowing spines and claws and a void eye ring with a pink halo. */
  {
    const S = 0.09, PURP = 0x5a3a8a, PURP2 = 0x3a2460, BLACK = 0x1a1420, SPINE = 0xff5a2a;
    MODELS.huskron = {
      kind: 'quad', scale: S, height: 20, width: 26,
      sockets: { weapon: ['head', [0, -1, 6]], head: ['head', [0, 2, 3]], chest: ['body', [0, 0, 4]] },
      parts: {
        body: { parent: null, at: [0, 11, 0], draw(g) {
          g.ell(0, 0, 0, 5, 4, 8, PURP); g.box(-4, -3, -6, 4, -3, 6, PURP2);
          for (let z = -6; z <= 5; z += 2) { g.box(0, 4, z, 0, 7, z, BLACK); g.set(0, 8, z, G(SPINE)); g.set(-3, 3, z, BLACK); g.set(-3, 5, z - 1, G(SPINE)); g.set(3, 3, z, BLACK); g.set(3, 5, z - 1, G(SPINE)); }
          voidRing(g, 0, 0, 8, 2, 0xff5ab0);
        } },
        head: { parent: 'body', at: [0, 1, 8], draw(g) { g.box(-3, -3, 0, 3, 2, 6, BLACK); g.box(-2, -2, 6, 2, 0, 7, PURP2); g.set(-2, 1, 6, G(SPINE)); g.set(2, 1, 6, G(SPINE)); for (const s of [-1, 1]) g.line(s * 3, 2, 1, s * 5, 5, -2, G(SPINE)); } },
        jaw: { parent: 'head', at: [0, -3, 1], draw(g) { g.box(-2, -1, 0, 2, 0, 5, PURP2); g.set(-2, 1, 5, 0xffffff); g.set(2, 1, 5, 0xffffff); } },
        legFL: { parent: 'body', at: [4, -2, 5], draw(g) { g.box(-1, -9, -1, 1, 0, 1, BLACK); g.box(-2, -9, 1, 2, -8, 2, G(SPINE)); } },
        legFR: { parent: 'body', at: [-4, -2, 5], draw(g) { g.box(-1, -9, -1, 1, 0, 1, BLACK); g.box(-2, -9, 1, 2, -8, 2, G(SPINE)); } },
        legBL: { parent: 'body', at: [4, -2, -5], draw(g) { g.box(-1, -9, -1, 1, 0, 1, BLACK); g.box(-1, -9, 1, 1, -9, 2, PURP2); } },
        legBR: { parent: 'body', at: [-4, -2, -5], draw(g) { g.box(-1, -9, -1, 1, 0, 1, BLACK); g.box(-1, -9, 1, 1, -9, 2, PURP2); } },
        tail: { parent: 'body', at: [0, 1, -8], draw(g) { for (let i = 0; i < 8; i++) g.box(0, i * 0.4, -i, 0, i * 0.4, -i, i % 2 ? PURP : G(SPINE)); } },
      },
    };
  }

  /* Miasma Priest (boss): a tall priest in white robes overgrown with red coral
     Miasma, a great white fan crown, a pale mask, trailing orange ribbons. */
  {
    const WHITE = 0xf2efe8, WHITE2 = 0xd6d1c6, CORAL = 0xd8282e, CORAL2 = 0xff5a4a, ORANGE = 0xf28a3a, MASK = 0xf4ece0;
    const coral = (g, pts) => { for (const [x, y, z] of pts) { g.set(x, y, z, CORAL); g.set(x, y + 1, z, CORAL); g.set(x + 1, y + 1, z, G(CORAL2)); } };
    MODELS.priest = H.humanoid({
      scale: 0.11, height: 34, width: 26,
      std: { shoulderX: 6 },
      sockets: { weapon: ['armR', [0, -8, 2]], muzzle: ['head', [0, 9, 0]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-4, -10, -3, 4, 0, 2, WHITE); g.box(-4, -10, -3, 4, -10, 2, WHITE2); coral(g, [[-3, -8, 3], [2, -6, 3], [-1, -3, 3], [3, -9, -3], [-4, -5, 0]]); },
      torso(g) { g.box(-3, 0, -2, 3, 6, 1, WHITE); g.box(-1, 0, 2, 1, 6, 2, CORAL); coral(g, [[-3, 4, 2], [2, 2, 2], [-2, 1, -3], [3, 5, 0]]); },
      head(g) {
        g.box(-3, 0, -3, 3, 6, 3, MASK); g.box(-2, 3, 4, -1, 3, 4, CORAL); g.box(1, 3, 4, 2, 3, 4, CORAL); g.box(0, 0, 4, 0, 5, 4, CORAL2);
        for (let a = -5; a <= 5; a++) { const x = a, y = 9 + Math.round(Math.sqrt(30 - a * a) * 0.8); g.box(x, 6, -3, x, y, -3, (a & 1) ? WHITE : WHITE2); g.set(x, y + 1, -3, (a % 3 === 0) ? G(CORAL2) : WHITE); } // fan crown
      },
      armL(g) { g.box(-2, -6, -2, 2, 0, 2, WHITE); g.box(-1, -8, -1, 1, -7, 1, MASK); coral(g, [[1, -3, 2]]); },
      armR(g) { g.box(-2, -6, -2, 2, 0, 2, WHITE); g.box(-1, -8, -1, 1, -7, 1, MASK); coral(g, [[-2, -4, 2]]); },
      legL(g) { g.box(-1, -9, -1, 1, 0, 1, WHITE2); },
      legR(g) { g.box(-1, -9, -1, 1, 0, 1, WHITE2); },
      extra: { ribbons: { parent: 'torso', at: [0, 5, -3], draw(g) { for (const s of [-1, 1]) for (let i = 0; i < 14; i++) g.box(s * (2 + Math.floor(i / 4)), -i, -Math.floor(i / 3), s * (2 + Math.floor(i / 4)), -i, -Math.floor(i / 3), i % 4 === 3 ? 0xffb070 : ORANGE); } } },
    });
  }

  /* ======================= THE HOLLOW ======================= */

  /* Faun: a hunched, ape-like Ethereal, dark grey with lime veins, a lime
     crystal cluster around its void eye ring, swinging a traffic-signal pole. */
  {
    const BODY = 0x2c2e34, BODY2 = 0x3c3f47, LIME = 0xc8ff3a, LIME2 = 0x8acc1a;
    MODELS.faun = H.humanoid({
      scale: 0.075, height: 26, width: 22,
      std: { hipY: 9, headY: 5, shoulderX: 7 },
      sockets: { weapon: ['pole', [0, 0, 16]], head: ['head', [0, 3, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -2, -2, 3, 0, 1, BODY); },
      torso(g) { g.box(-4, 0, -3, 4, 6, 2, BODY); g.box(-5, 4, -3, 5, 7, 2, BODY2); g.line(-3, 0, 3, -1, 5, 3, G(LIME)); g.line(3, 1, 3, 2, 6, 3, G(LIME)); },
      head(g) {
        g.box(-3, -1, -1, 3, 4, 4, BODY); voidRing(g, 0, 2, 5, 2, 0xff70d0);
        g.ell(-2, 4, 3, 2, 2, 2, LIME); g.ell(2, 5, 2, 2, 2, 2, LIME2); g.ell(0, 5, 4, 1.5, 1.5, 1.5, G(LIME)); // lime crystal cluster
      },
      armL(g) { longArm(g, 10, BODY, BODY2, 2); g.line(0, -2, 2, 0, -7, 2, G(LIME)); },
      armR(g) { longArm(g, 10, BODY, BODY2, 2); g.line(0, -2, 2, 0, -7, 2, G(LIME)); },
      legL(g) { H.leg(g, { len: 7, pant: BODY, boot: BODY2, bootH: 2 }); },
      legR(g) { H.leg(g, { len: 7, pant: BODY, boot: BODY2, bootH: 2 }); },
      extra: { pole: { parent: 'armR', at: [0, -11, 0], draw(g) {
        g.box(0, 0, -3, 0, 0, 14, 0x2a2a30); for (let z = 0; z <= 12; z += 3) g.set(0, 1, z, 0xf2c230);
        g.box(-1, -2, 13, 1, 2, 17, 0x1c1c20); g.set(0, 1, 18, G(0xff3030)); g.set(0, 0, 18, G(0xffc030)); g.set(0, -1, 18, G(0x30ff60));
      } } },
    });
  }

  /* Specter: a slim dark Ethereal with lime seams, gold armour plates on the
     shoulders, a long blade for a right arm, and a void halo above its head. */
  {
    const BODY = 0x26272e, BODY2 = 0x3a3c45, LIME = 0xc8ff3a, GOLD = 0xc9a23a, GOLD2 = 0x9a7a28, BLADE = 0xb8bcc6;
    MODELS.specter = H.humanoid({
      scale: 0.07, height: 30, width: 20,
      std: { shoulderX: 6 },
      sockets: { weapon: ['armR', [0, -14, 0]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-2, -2, -2, 2, 0, 1, BODY); g.set(0, -1, 2, G(LIME)); },
      torso(g) { g.box(-2, 0, -2, 2, 6, 1, BODY); g.box(0, 0, 2, 0, 5, 2, G(LIME)); g.box(-3, 5, -2, 3, 7, 2, GOLD); g.box(-3, 5, 2, 3, 5, 2, GOLD2); },
      head(g) {
        g.box(-2, 0, -2, 2, 5, 2, BODY2); g.set(0, 3, 3, G(LIME));
        for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2; g.set(Math.round(Math.cos(t) * 3), 9 + Math.round(Math.sin(t) * 3), 0, G(a % 2 ? 0xff70d0 : 0xffffff)); } // halo ring
        g.box(-1, 8, 0, 1, 10, 0, 0x050507);
      },
      armL(g) { g.box(-1, -8, -1, 1, 0, 1, BODY); g.box(-2, -3, -2, 2, 0, 2, GOLD); g.box(-1, -9, -1, 1, -8, 1, GOLD2); },
      armR(g) { g.box(-1, -4, -1, 1, 0, 1, BODY); g.box(-2, -3, -2, 2, 0, 2, GOLD); for (let i = 4; i <= 14; i++) g.box(0, -i, i > 11 ? 0 : -1, 0, -i, 1, i === 14 ? 0xffffff : BLADE); g.line(0, -5, 2, 0, -12, 2, G(LIME)); },
      legL(g) { H.leg(g, { pant: BODY, boot: BODY2, bootH: 3, w: 1 }); g.set(0, -5, 2, G(LIME)); },
      legR(g) { H.leg(g, { pant: BODY, boot: BODY2, bootH: 3, w: 1 }); g.set(0, -5, 2, G(LIME)); },
    });
  }

  /* Dullahan (elite): a knight of black and white shard armour with lime cracks,
     a void eye ring with a halo where a head should be, a jagged shard sword. */
  {
    const BLACK = 0x1c1d24, BLACK2 = 0x2e3039, WHITE = 0xe8eaef, WHITE2 = 0xbfc3cd, LIME = 0xc8ff3a;
    MODELS.dullahan = H.humanoid({
      scale: 0.08, height: 30, width: 22,
      std: { shoulderX: 6 },
      sockets: { weapon: ['sword', [0, 0, 20]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -3, -2, 3, 0, 1, BLACK); g.box(-4, -4, 2, -1, -1, 2, WHITE); g.box(1, -4, 2, 4, -1, 2, WHITE2); },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, BLACK); g.box(-3, 2, 2, 3, 6, 2, WHITE); g.line(-2, 2, 3, 1, 6, 3, G(LIME));
        shards(g, [[-4, 6, 0, -1, 1, 0, 3], [4, 6, 0, 1, 1, 0, 3], [-2, 6, -3, 0, 1, -1, 3], [2, 6, -3, 0, 1, -1, 3]], WHITE, WHITE2);
      },
      head(g) { voidRing(g, 0, 3, 0, 3, LIME); for (let a = 0; a < 20; a++) { const t = a / 20 * Math.PI * 2; g.set(Math.round(Math.cos(t) * 5), 3 + Math.round(Math.sin(t) * 5), -1, G(a % 2 ? LIME : 0x9a6aff)); } },
      armL(g) { H.arm(g, { sleeve: WHITE, sleeveTo: 3, skin: BLACK, glove: BLACK2, gloveLen: 2 }); g.box(-2, -1, -2, 2, 1, 2, WHITE2); },
      armR(g) { H.arm(g, { sleeve: WHITE, sleeveTo: 3, skin: BLACK, glove: BLACK2, gloveLen: 2 }); g.box(-2, -1, -2, 2, 1, 2, WHITE2); },
      legL(g) { H.leg(g, { pant: BLACK, boot: WHITE, bootH: 4, sole: BLACK2 }); g.set(0, -6, 2, G(LIME)); },
      legR(g) { H.leg(g, { pant: BLACK, boot: WHITE, bootH: 4, sole: BLACK2 }); g.set(0, -6, 2, G(LIME)); },
      extra: { sword: { parent: 'armR', at: [0, -7, 0], draw(g) {
        g.box(0, 0, -2, 0, 0, 2, BLACK2);
        for (let z = 3; z <= 20; z++) { const w = z < 16 ? 2 : 1, jag = (z % 3 === 0) ? 1 : 0; g.box(-w - jag, 0, z, w, 0, z, z > 18 ? WHITE : (z % 4 === 0 ? WHITE2 : 0x1c1d24)); }
        g.box(0, 1, 4, 0, 1, 16, G(LIME));
      } } },
    });
  }

  /* Notorious - Dead End Butcher (boss): a massive Ethereal of blocky dark rock,
     lime seams, white shard crests and huge blocky fists; a void eye ring. */
  {
    const ROCK = 0x2c2e35, ROCK2 = 0x3e414a, BLACK = 0x16171c, WHITE = 0xe8eaef, LIME = 0xc8ff3a;
    const fist = g => { g.box(-2, -3, -2, 2, 0, 2, ROCK2); g.box(-3, -9, -3, 3, -4, 3, ROCK); g.box(-4, -13, -4, 4, -9, 4, ROCK2); g.line(-3, -5, 3, 3, -11, 3, G(LIME)); g.box(-1, -14, -1, 1, -14, 1, BLACK); };
    MODELS.butcher = H.humanoid({
      scale: 0.12, height: 30, width: 26,
      std: { shoulderX: 9, headY: 7 },
      sockets: { weapon: ['armR', [0, -13, 2]], head: ['head', [0, 3, 0]], chest: ['torso', [0, 4, 3]] },
      hips(g) { g.box(-4, -3, -3, 4, 0, 2, ROCK); },
      torso(g) {
        g.box(-5, 0, -3, 5, 7, 2, ROCK); g.box(-5, 4, 3, 5, 7, 3, ROCK2); g.box(-6, 6, -3, 6, 8, 2, ROCK2);
        g.line(-4, 1, 3, 4, 6, 3, G(LIME)); g.box(-1, 2, 3, 1, 3, 3, G(LIME));
        shards(g, [[-5, 8, 0, -1, 1, 0, 4], [5, 8, 0, 1, 1, 0, 4], [-3, 8, -3, 0, 1, -1, 4], [3, 8, -3, 0, 1, -1, 4], [0, 8, -3, 0, 1, -1, 3]], WHITE, G(LIME));
      },
      head(g) { g.box(-3, -1, -2, 3, 4, 3, ROCK2); voidRing(g, 0, 2, 4, 2, LIME); shards(g, [[-2, 5, 0, -1, 1, 0, 3], [2, 5, 0, 1, 1, 0, 3]], WHITE); },
      armL: fist, armR: fist,
      legL(g) { g.box(-2, -9, -2, 2, 0, 2, ROCK); g.box(-2, -9, 2, 2, -8, 3, ROCK2); g.set(0, -4, 3, G(LIME)); },
      legR(g) { g.box(-2, -9, -2, 2, 0, 2, ROCK); g.box(-2, -9, 2, 2, -8, 3, ROCK2); g.set(0, -4, 3, G(LIME)); },
    });
  }
})();
