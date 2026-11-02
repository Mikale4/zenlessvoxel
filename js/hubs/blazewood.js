/* ============================================================================
   hubs/blazewood.js -- Blazewood, the Outer Ring: the desert town where the
   Sons of Calydon are most at home, laid out from the Zenless Zone Zero
   Wiki's map of it (a long strip, the Lower Level north, the Upper Level
   south), its location shots and NPC portraits.

   The look: sand and tyre tracks, red mesas, corrugated sheds and graffitied
   brick, black metal stairs, orange barrels, motorcycles everywhere.

   North (-z) to south (+z), along the one street:
     the Lower Level: the camper at the end, the 747 (a stall under a teal tarp,
       Bangboo clerks, the white pickup), Sage in a Barrel, the covered
       workshop (bikes, tyres, string lights, the red container), and the red
       steel arch WELCOME TO 无边野火 BOUNDLESS BLAZE
     the middle: Kasa's Cheesetopia (OUTER RING CUISINE · TAKEOUT, a Grumpy
       Groundhog round the back) across from the Sons' fuel truck, its trailer
       a bar; Officer Mewmew
     the Upper Level: the brick block with the Sons' graffiti and its stairs,
       the sheds across, and the road out of town
   ========================================================================== */
(function () {
  'use strict';
  const PI = Math.PI, G = VX.glow, H = window.MB;
  const { piece, sign, put, glass, text, hash, solid, spot, light, night, tall, bench, bin, aframe, DISP, CJK } = STREET.KIT;
  const { mass, flat, slab, barriers } = window.HUBS.kit;

  /* ----------------------------------------------------------- townsfolk -- */
  MODELS.kasa = H.person({ scale: 0.068, skin: 0xc8946a, eye: 0x4a2a1a, hair: 0x4a2e1e, hair2: 0x3a2214, long: 9, top: 0xf2ece0, sleeve: 0xf2ece0, sleeveTo: 8, pants: 0x4a6a9a, shoe: 0xf2ece0, shoeH: 4,
    head(g) { g.box(-4, 5, -4, 4, 5, 4, 0x8a4a2a); g.box(3, 6, -1, 4, 9, -1, 0xd8b060); },                                                  // a headband, a feather
    torso(g) { g.box(-3, 4, -2, 3, 6, 3, 0xd8c8a8); g.box(-3, 0, 2, 3, 1, 2, 0xc8946a); },                                                  // the fur collar, a crop
    hips(g) { g.box(2, -3, 2, 4, 0, 3, 0x6a4a2a); } });
  MODELS.leigh = H.person({ scale: 0.066, skin: 0xf6dcc8, eye: 0x4a3a4a, hair: 0xc8ccd4, hair2: 0xa8acb4, long: 5, top: 0x1c1c22, sleeve: 0xc8302a, sleeveTo: 8, pants: 0x1c1c22, legsR: 0xc8302a, shoe: 0x1c1c22, shoeH: 4,
    torso(g) { g.box(0, 0, 2, 3, 6, 2, 0xc8302a); g.box(-1, 3, 3, 0, 6, 3, 0xf2f2ee); },                                                    // a red-and-black racing suit
    armL(g) { g.box(-2, -10, -2, 2, -7, 2, 0x2a2a30); } });                                                                                   // her helmet
  MODELS.lola = H.person({ scale: 0.065, skin: 0xf0d0b8, eye: 0x3a2a3a, hair: 0x2a2a5a, hair2: 0x1e1e44, long: 4, top: 0x6a8ab8, sleeve: 0x6a8ab8, sleeveTo: 6, pants: 0x4a3a2a, shoe: 0xe8e4dc,
    head(g) { g.box(-4, 5, -4, 4, 8, 4, (x, y) => y & 1 ? 0x3a8a4a : 0x2a6a3a); }, torso(g) { g.box(-2, 0, 2, 2, 3, 2, 0x3a3634); } });       // a green beanie, a denim crop jacket
  MODELS.bolter = H.person({ scale: 0.07, skin: 0xf0c8a8, eye: 0x3a2a1a, hair: 0xd8783a, top: 0x9a2a2a, sleeve: 0xf0c8a8, sleeveTo: 0, pants: 0x2a3a5a, shoe: 0x4a3a2a, shoeH: 3,
    head(g) { g.box(-4, 5, -4, 4, 7, 4, 0xe8702a); g.box(-4, 5, 5, 4, 5, 6, 0xe8702a); } });                                                  // an orange cap, a red COW COW tank
  MODELS.dorian = H.person({ scale: 0.07, skin: 0xe8c0a0, eye: 0x4a3a2a, hair: 0x6a4a32, hair2: 0x4a3222, long: 4, top: 0x8a8a3a, sleeve: 0xe8c0a0, sleeveTo: 0, pants: 0x6a8ab8, shoe: 0xd8d8d4, glove: 0x1c1c22, gloveLen: 2 });
  MODELS.buffy = H.person({ scale: 0.064, skin: 0xf6dcc8, eye: 0x4a4a5a, hair: 0xc8c4bc, hair2: 0xa8a49c, top: 0x3a4a7a, sleeve: 0x3a4a7a, sleeveTo: 8, skirt: 0x8a8e96, skirtLen: 5, legs: 0xf6dcc8, shoe: 0x3a4a7a, shoeH: 4 });
  MODELS.leif = H.person({ scale: 0.052, skin: 0xf6dcc8, eye: 0x6a3a2a, hair: 0x2a2a3a, top: 0xe8ecf0, sleeve: 0xe8ecf0, sleeveTo: 6, pants: 0x6a8aa8, shoe: 0x6a4a2a,
    torso(g) { g.box(-3, 0, 2, 3, 3, 2, 0x6a8aa8); g.box(-3, 3, 2, -2, 6, 2, 0x6a8aa8); g.box(2, 3, 2, 3, 6, 2, 0x6a8aa8); } });             // a child in overalls
  MODELS.demir = H.person({ scale: 0.068, skin: 0xd8b090, eye: 0x3a2a1a, hair: 0xe8e4dc, hair2: 0xc8c4bc, top: 0x2a3a3a, sleeve: 0x2a3a3a, sleeveTo: 8, pants: 0x4a3a2a, shoe: 0x6a4a2a,
    head(g) { g.box(-3, -3, 3, 3, 0, 4, 0xe8e4dc); }, torso(g) { g.box(-3, 1, 2, -1, 6, 3, 0xd8c040); },
    armR(g) { g.box(0, -16, 2, 0, 4, 2, 0x6a4a2a); g.box(-2, 3, 2, 2, 7, 2, 0xc8302a); } });                                                  // a white beard, a yellow scarf, his staff
  MODELS.biker = H.person({ scale: 0.071, skin: 0xe0b090, eye: 0x2a2a2a, hair: 0x2a2220, top: 0x1c1c22, sleeve: 0x1c1c22, sleeveTo: 8, pants: 0x3a4a6a, shoe: 0x3a2a20, shoeH: 3,
    torso(g) { g.box(-3, 0, -3, 3, 6, -3, (x, y) => (Math.abs(x) < 2 && y > 1 && y < 5) ? 0xd8a040 : 0x1c1c22); } });                        // a leather jacket, an emblem on the back
  MODELS.clerk747 = H.bangboo({ body: 0x2a3a5a, eye: 0x7ad8ff, inner: 0xf2f2f0, foot: 0x2a3a5a, outfit: (x, y, z) => (z >= 2 && y < 3) ? 0x3a7ad8 : 0xf2f2f0, arm: 0xf2f2f0,
    extra: g => { g.box(-4, 12, -3, 4, 13, 4, 0xf2f2f0); g.box(-4, 12, 5, 4, 12, 6, 0x3a7ad8); } });                                         // the 747's Bangboo, a cap
  MODELS.groundhog = H.animal({ scale: 0.05, coat: 0x8a5a32, coat2: 0xc89a6a, eye: 0x1c1c22, hip: 5, leg: 3, bw: 4, bh: 4, bl: 4, ear: 1, tail: 2, face: (x, y) => y < 1 ? 0xc89a6a : 0x8a5a32 });
  MODELS.slowpoke = H.animal({ scale: 0.05, coat: 0x6a4a2a, coat2: 0xa88a5a, eye: 0x1c1c22, hip: 3, leg: 2, bw: 5, bh: 3, bl: 6, ear: 1, tail: 1, hw: 2, hh: 2, hl: 2,
    pat: (x, y, z) => y < -1 ? 0xa88a5a : ((Math.abs(x) + Math.abs(z)) % 4 === 0 ? 0x4a321e : 0x7a5a32), face: () => 0x8a7a4a });                // a tortoise

  /* ------------------------------------------------------------ helpers -- */
  const CORR = (x, y, z) => (Math.floor((x + z) * 4) & 1) ? 0x8a8e92 : (hash(Math.floor(x + z), Math.floor(y)) > 0.85 ? 0xa86a42 : 0x9a9ea2);   // corrugated, a little rust
  const RBRICK = (x, y, z) => { const row = Math.floor(y / 0.25), off = row & 1 ? 0.25 : 0; return (Math.floor((x + z + off) / 0.5) % 6 === 0) ? 0x8a3a2a : (row % 4 ? 0xa8503a : 0x984632); };
  /* black metal stairs up a wall facing ±x (dir), rising toward +z from z0 */
  function stairs(root, xw, z0, dir, h) {
    const P = piece(0.125, xw, z0, 0.03), d = dir, n = Math.round(h / 0.25), x0 = d > 0 ? xw : xw - 1.0, x1 = d > 0 ? xw + 1.0 : xw;
    for (let i = 0; i < n; i++) P.box(x0, i * 0.25, z0 + i * 0.25, x1, i * 0.25 + 0.0625, z0 + i * 0.25 + 0.25, 0x2a2c30);
    for (let i = 0; i <= n; i += 4) P.box(d > 0 ? x1 - 0.0625 : x0, 0, z0 + i * 0.25, d > 0 ? x1 : x0 + 0.0625, i * 0.25 + 1.0, z0 + i * 0.25 + 0.0625, 0x2a2c30);
    P.box(x0, h, z0 + n * 0.25, x1, h + 0.0625, z0 + n * 0.25 + 1.5, 0x2a2c30);
    P.mesh(root); solid(Math.min(x0, x1), z0, Math.max(x0, x1), z0 + Math.min(n * 0.25, 1.2));
  }
  const barrel = (P, x, z, col) => { P.cyl(x, z, 0.3, 0, 0.9, (X, Y) => (Y > 0.25 && Y < 0.35) || (Y > 0.6 && Y < 0.7) ? 0x6a3a1a : (col || 0xe8702a)); solid(x - 0.32, z - 0.32, x + 0.32, z + 0.32); };
  const crate = (P, x, z, h, col) => { P.box(x - 0.3, 0, z - 0.3, x + 0.3, h || 0.6, z + 0.3, (X, Y) => Math.abs(((Y + 0.01) % 0.3) - 0.15) > 0.12 ? 0x6a4a2a : (col || 0x9a7448)); solid(x - 0.32, z - 0.32, x + 0.32, z + 0.32); };
  const tyres = (P, x, z, n) => { for (let i = 0; i < n; i++) P.cyl(x + (i & 1) * 0.05, z, 0.36, i * 0.25, i * 0.25 + 0.25, (X, Y, Z) => Math.hypot(X - x, Z - z) < 0.16 ? -1 : 0x1c1c20); solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4); };
  /* a motorbike, its nose along +z (rot turns it) */
  function bike(root, x, z, rot, col) {
    const g = new THREE.Group(), P = piece(0.0625, 0, 0, 0.04), BK = 0x1c1c20, C = col || 0xe8702a;
    for (const wz of [-0.6, 0.6]) P.discX(wz, 0.32, 0.32, -0.0625, 0.0625, d => d < 0.1 ? 0xb0b2b8 : BK);
    P.box(-0.125, 0.35, -0.5, 0.125, 0.65, 0.4, 0x3a3c42); P.box(-0.2, 0.6, -0.15, 0.2, 0.85, 0.4, C); P.box(-0.15, 0.7, -0.6, 0.15, 0.8, -0.15, 0x2a1a12);
    P.box(-0.06, 0.6, 0.45, 0.06, 1.05, 0.55, 0x8a8c90); P.box(-0.35, 1.0, 0.45, 0.35, 1.06, 0.52, BK); P.box(-0.06, 0.82, 0.58, 0.06, 0.92, 0.64, G(0xfff0c0));
    P.box(0.15, 0.3, -0.7, 0.22, 0.4, -0.1, 0xb0b2b8);
    P.mesh(g); g.position.set(x, 0, z); g.rotation.y = rot || 0; root.add(g); solid(x - 0.5, z - 0.5, x + 0.5, z + 0.5);
  }
  /* a desert plant: a yucca (spiky tufts on a forked trunk) or a cactus */
  function yucca(P, x, z, h) {
    for (let y = 0; y < h; y += 0.25) P.box(x - 0.1 + Math.sin(y) * 0.1, y, z - 0.1, x + 0.1 + Math.sin(y) * 0.1, y + 0.25, z + 0.1, 0x7a6a4a);
    for (const [ax, az] of [[0.5, 0], [-0.4, 0.3], [0, -0.45]]) { const tx = x + ax, tz = z + az, ty = h + 0.3; P.box(Math.min(x, tx) - 0.06, h - 0.3, Math.min(z, tz) - 0.06, Math.max(x, tx) + 0.06, h - 0.2, Math.max(z, tz) + 0.06, 0x7a6a4a); for (let k = 0; k < 8; k++) { const a = k * PI / 4; P.box(tx - 0.04 + Math.cos(a) * 0.15, ty, tz - 0.04 + Math.sin(a) * 0.15, tx + 0.04 + Math.cos(a) * 0.35, ty + 0.12, tz + 0.04 + Math.sin(a) * 0.35, 0x5a7a3a); } }
  }
  function cactus(P, x, z, h) { P.cyl(x, z, 0.22, 0, h, 0x4a8a4a); for (const s of [-1, 1]) { P.box(x, h * 0.45, z - 0.1, x + s * 0.6, h * 0.45 + 0.25, z + 0.1, 0x4a8a4a); P.box(x + s * 0.5 - 0.12, h * 0.45, z - 0.12, x + s * 0.5 + 0.12, h * 0.75, z + 0.12, 0x4a8a4a); } }

  /* ---------------------------------------------------- the desert floor -- */
  function ground(root) {
    const T = piece(0.5, 0, 0, 0.02);
    T.box(-60, -0.5, -70, 60, 0, 60, (x, y, z) => {
      if (Math.abs(Math.abs(x) - 2.5) < 0.3 && z > -32 && z < 40) return 0xa87a50;                                    // tyre tracks down the street
      const h = hash(Math.floor(x), Math.floor(z));
      return h > 0.93 ? 0x9a6c46 : h > 0.6 ? 0xc89058 : (h > 0.3 ? 0xbf8a52 : 0xc48e56);
    });
    T.mesh(root, { cast: false });
    // the mesas, red sandstone in bands, and the far desert
    const E = piece(1, 0, 0, 0.04), band = (x, y, z) => (y % 5 === 4 ? 0xa85a34 : y % 5 === 0 ? 0xd8824a : (hash(x, z + y) > 0.8 ? 0xb8683c : 0xc0663a));
    const mesa = (x0, z0, w, d, h) => E.box(x0, 0, z0, x0 + w, h, z0 + d, (x, y, z) => { const e = Math.min(x - x0, x0 + w - 1 - x, z - z0, z0 + d - 1 - z); return (y > h - 4 && e < (h - y) * 0.6 - 1) ? -1 : band(x, y, z); });
    mesa(-58, -70, 28, 20, 26); mesa(-20, -78, 22, 18, 34); mesa(10, -72, 30, 22, 22); mesa(34, -40, 18, 30, 18); mesa(-56, -30, 16, 26, 16); mesa(36, 0, 14, 22, 12); mesa(-52, 10, 14, 24, 14); mesa(-8, 70, 40, 14, 18);
    E.mesh(root, { cast: false });
    const D = piece(0.125, 0, 0, 0.03);
    for (const [x, z, h] of [[-9.0, 27.0, 2.6], [9.6, 27.4, 3.2], [-18.0, 32.0, 3.0], [18.0, 34.0, 2.4], [-14.0, -34.0, 2.8], [12.0, -36.0, 3.4], [-28.0, 0.0, 3.0], [28.0, -12.0, 2.6]]) yucca(D, x, z, h);
    for (const [x, z, h] of [[-8.6, 22.4, 1.8], [11.4, 30.4, 2.2], [-6.6, -33.0, 1.6], [24.0, 20.0, 2.0]]) cactus(D, x, z, h);
    D.mesh(root);
  }

  /* -------------------------------------------- the Lower Level (north) -- */
  function lower(root) {
    // the blocks behind: brick on the west, corrugated on the east
    mass(root, -28, -36, -16, -10, 0, 7, RBRICK, { win: 'es', wy0: 1, floor: 3.5, step: 2.6 });
    mass(root, 16, -36, 28, -12, 0, 7.5, CORR, { win: '', s: 0.5 });
    tall(-28, -36, -16, -10, 7); tall(16, -36, 28, -12, 7.5); solid(-40, -40, -16, -10); solid(16, -40, 40, -12);
    // the camper at the end of the street, its awning
    const Cv = piece(0.125, 0, -32, 0.04);
    Cv.box(-3.5, 0.5, -34, 3.5, 3.0, -31.5, (x, y, z) => (y > 1.6 && y < 2.3 && z > -31.7 && Math.abs(x % 1.4) > 0.3) ? 0x2a3442 : (y < 1.0 ? 0xc8702a : 0xe8dcb8));
    for (const wx of [-2.4, 2.4]) Cv.discX(-32.8, 0.45, 0.45, wx - 0.1, wx + 0.1, d => d < 0.15 ? 0xb0b2b8 : 0x1c1c20);
    for (const ax of [-3.4, 3.4]) Cv.box(ax, 0, -30.2, ax + 0.06, 2.6, -30.14, 0x8a8c90);
    Cv.box(-3.5, 2.6, -31.5, 3.5, 2.7, -30.1, (x) => (Math.floor(x * 2) & 1) ? 0x2a8a8a : 0xe8dcb8);
    crate(Cv, -2.2, -30.0); crate(Cv, -1.4, -30.2, 0.4, 0x6a8a4a); barrel(Cv, 2.6, -29.8, 0xc8302a);
    Cv.mesh(root); solid(-3.6, -34.2, 3.6, -31.4);
    // the 747: a stall under a teal tarp, crates of drinks, the Bangboo clerks, the white pickup behind
    const S = piece(0.0625, -6, -22, 0.04), sx0 = -7.8, sx1 = -4.6, sz0 = -24.4, sz1 = -21.0;
    for (const [px, pz] of [[sx0, sz0], [sx1, sz0], [sx0, sz1], [sx1, sz1]]) S.box(px, 0, pz, px + 0.1, 2.6, pz + 0.1, 0xe8dcc0);
    S.box(sx0 - 0.3, 2.6, sz0 - 0.3, sx1 + 0.4, 2.7, sz1 + 0.4, (x, y, z) => (Math.floor(z * 1.5) & 1) ? 0x2a9a8a : 0x3aa898);
    S.box(sx1 - 0.4, 0, sz0 + 0.3, sx1, 0.95, sz1 - 0.3, (x, y) => y > 0.85 ? 0xe8dcc0 : 0xf2f2ee);                                     // the counter
    for (let z = sz0 + 0.4; z < sz1 - 0.5; z += 0.35) { S.box(sx1 - 0.35, 0.95, z, sx1 - 0.2, 1.25, z + 0.1, hash(z, 1) > 0.5 ? 0x3aa858 : 0x3a7ad8); }
    crate(S, -7.2, -20.4, 0.5, 0x3aa898); crate(S, -7.4, -24.9, 0.8); S.box(-7.6, 0, -23.4, -6.8, 0.6, -22.6, 0xd8c8a0);
    for (const lz of [-23.6, -22.0]) { S.box(sx1 + 0.2, 2.0, lz, sx1 + 0.26, 2.6, lz + 0.06, 0x2a2a30); S.box(sx1 + 0.12, 1.75, lz - 0.08, sx1 + 0.34, 2.0, lz + 0.14, G(0x5ae87a)); }
    S.mesh(root); solid(sx1 - 0.45, sz0 + 0.25, sx1 + 0.05, sz1 - 0.25);
    flat(root, 1.2, 0.4, (c, w, h) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a7ad8'; c.fillRect(w * 0.06, h * 0.12, w * 0.88, h * 0.76); text(c, '747', w / 2, h / 2, h * 0.62, '#fff', { fam: DISP }); }, sx1 + 0.02, 0.55, (sz0 + sz1) / 2, PI / 2);
    light(root, 0x9affb0, 0.45, 6, sx1, 2.2, -22.7, 'lamp');
    spot('747:clerk1', -5.3, -23.6, PI / 2, 'shopkeep', { post: true }); spot('747:clerk2', -5.3, -22.0, PI / 2, 'shopkeep', { post: true }); spot('747:clerk3', -6.6, -20.6, PI / 2, 'shopkeep', { post: true });
    spot('747:browse1', -3.6, -23.4, -PI / 2, 'browse'); spot('747:browse2', -3.6, -21.8, -PI / 2, 'browse');
    const Pk = piece(0.125, -12, -23, 0.04);
    Pk.box(-13.0, 0.4, -25.5, -10.6, 1.3, -20.6, 0xe8ecf0); Pk.box(-12.9, 1.3, -24.8, -10.7, 2.1, -23.2, (x, y, z) => y > 1.5 && y < 1.95 && (z < -24.5 || z > -23.5) ? 0x2a3442 : 0xe8ecf0);
    Pk.box(-13.0, 0.4, -20.6, -10.6, 0.9, -20.4, 0xb0b2b8);
    for (const [wx, wz] of [[-13.05, -24.6], [-10.55, -24.6], [-13.05, -21.4], [-10.55, -21.4]]) Pk.discX(wz, 0.4, 0.4, wx - 0.12, wx + 0.12, d => d < 0.15 ? 0xb0b2b8 : 0x1c1c20);
    crate(Pk, -11.4, -22.0, 0.4, 0x3aa898); Pk.mesh(root); solid(-13.1, -25.6, -10.5, -20.3);
    spot('north:sage', -3.0, -27.4, PI / 2 + 0.3, 'chat', { post: true });
    // the covered workshop: a corrugated roof on posts, bikes, tyres, a workbench, the red container, string lights
    const Wk = piece(0.125, 8, -24, 0.04), wx0 = 8.5, wx1 = 16, wz0 = -28.5, wz1 = -17.5;
    for (const [px, pz] of [[wx0, wz0], [wx0, -23], [wx0, wz1], [wx1 - 0.25, wz1]]) Wk.box(px, 0, pz, px + 0.25, 3.6, pz + 0.25, 0x2a5a4a);
    Wk.box(wx0 - 0.5, 3.6, wz0 - 0.5, wx1, 3.85, wz1 + 0.5, (x, y, z) => (Math.floor(z * 3) & 1) ? 0x8a8e92 : 0x7a7e82);
    Wk.box(12.5, 0, -28.5, 16, 2.75, -22.5, (x, y, z) => (z > -28.4 && z < -22.6 && x < 12.625 && y < 2.3 && y > 0.1) ? (Math.floor(z * 2) & 1 ? 0x2a1a12 : 0x3a2418) : (Math.floor(z * 4) & 1 ? 0xb8302a : 0xa82a24));
    Wk.box(9.0, 0, -28.2, 11.0, 0.9, -27.4, (x, y) => y > 0.8 ? 0x8a6a4a : 0x4a4c52);                                                    // the workbench
    tyres(Wk, 9.4, -19.0, 4); tyres(Wk, 10.2, -18.6, 3); barrel(Wk, 15.2, -19.0, 0xc8302a); barrel(Wk, 15.4, -20.0); crate(Wk, 14.4, -18.6, 0.6, 0x6a8a4a);
    Wk.mesh(root); solid(12.5, -28.6, 16.1, -22.4); solid(8.9, -28.3, 11.1, -27.3);
    for (const [k, [bx, bz, r, c]] of [[9.8, -25.6, 0.3, 0xe8702a], [11.0, -21.2, -0.2, 0xc8302a], [13.4, -20.6, 0.5, 0x3a3c42]].entries()) { bike(root, bx, bz, r, c); spot('shop:bike' + k, bx + 0.9, bz + 0.2, -PI / 2, k === 1 ? 'tinker' : 'lean'); }
    for (let i = 0; i < 7; i++) { const lz = wz0 + 0.5 + i * 1.6, ly = 3.35 - Math.sin(i * 0.9) * 0.15; const L = piece(0.0625, wx0, lz, 0.02); L.box(wx0 + 0.6, ly, lz, wx0 + 0.75, ly + 0.15, lz + 0.15, G([0xff6a3a, 0xf2c230, 0x5ae87a][i % 3])); L.mesh(root); }
    light(root, 0xffc080, 0.6, 9, 11.5, 3.2, -23, 'lamp');
    flat(root, 3.0, 0.9, (c, w, h) => { c.fillStyle = '#141416'; c.fillRect(0, 0, w, h); text(c, 'SONS OF CALYDON', w / 2, h * 0.4, h * 0.34, '#d8a040', { fam: DISP }); text(c, 'GARAGE · NO RIDE LEFT BEHIND', w / 2, h * 0.78, h * 0.16, '#e8e4dc', { w: 800 }); }, 12.4, 2.0, -25.5, -PI / 2);
    spot('shop:leigh', 9.4, -22.4, -PI / 2 + 0.4, 'look', { post: true });
    // the arch: WELCOME TO 无边野火 BOUNDLESS BLAZE, red steel, flames
    const Ar = piece(0.125, 0, -14, 0.03);
    for (const s of [-1, 1]) Ar.box(s * 7.4 - 0.3, 0, -14.3, s * 7.4 + 0.3, 6.2, -13.7, (x, y) => (Math.floor(y * 2) + Math.floor(x * 4)) % 3 === 0 ? 0x8a2420 : 0xb8302a);
    for (let i = 0; i <= 60; i++) { const t = i / 60, x = -7.4 + 14.8 * t, y = 6.0 + Math.sin(t * PI) * 1.4; Ar.box(x - 0.15, y, -14.15, x + 0.15, y + 0.3, -13.85, 0xb8302a); }
    Ar.mesh(root); for (const s of [-1, 1]) solid(s * 7.4 - 0.35, -14.35, s * 7.4 + 0.35, -13.65);
    const welcome = (c, w, h) => {
      c.fillStyle = '#e8501a'; for (let i = 0; i < 14; i++) { const fx = w * (0.05 + i * 0.065), fh = h * (0.35 + hash(i, 7) * 0.35); c.beginPath(); c.moveTo(fx - w * 0.04, h * 0.62); c.quadraticCurveTo(fx, h * 0.62 - fh, fx + w * 0.015, h * 0.62 - fh * 1.15); c.quadraticCurveTo(fx + w * 0.02, h * 0.5, fx + w * 0.045, h * 0.62); c.fill(); }
      c.fillStyle = '#b8241e'; c.fillRect(w * 0.05, h * 0.38, w * 0.9, h * 0.42); c.strokeStyle = '#f2c230'; c.lineWidth = h * 0.03; c.strokeRect(w * 0.05, h * 0.38, w * 0.9, h * 0.42);
      text(c, 'WELCOME TO', w / 2, h * 0.3, h * 0.11, '#f2ead8', { fam: DISP }); text(c, '无边野火', w / 2, h * 0.56, h * 0.26, '#f2d060', { fam: CJK, w: 900, stroke: '#6a1410', lw: h * 0.03 }); text(c, 'BOUNDLESS BLAZE', w / 2, h * 0.9, h * 0.13, '#f2ead8', { fam: DISP, stroke: '#6a1410', lw: h * 0.02 }); };
    for (const [d, ry] of [[0.18, 0], [-0.18, PI]]) flat(root, 9.0, 2.8, welcome, 0, 7.7, -14 + d, ry, true);
    spot('arch:look', 4.0, -12.0, PI, 'look');
  }

  /* ---------------------------------------------- the middle of town -- */
  function middle(root) {
    // Cheesetopia: OUTER RING CUISINE · TAKEOUT, bunting, two windows, Kasa at the door
    mass(root, 8, -10, 20, 4, 0, 4.5, (x, y) => y > 3.5 ? 0x6a5a4a : (Math.floor(y * 2) % 4 === 0 ? 0x8a7a68 : 0x9a8a76), { win: '', s: 0.25, roof: 0x5a4a3a });
    tall(8, -10, 20, 4, 4.5); solid(8, -10, 30, 4);
    const Ch = piece(0.125, 7.5, -10, 0.04);
    Ch.box(7.875, 0, -9.5, 8, 3.25, 3.5, (x, y, z) => ((z > -8.5 && z < -5.5) || (z > -0.5 && z < 2.5)) && y > 1.0 && y < 2.4 ? -1 : (z > -4.5 && z < -1.5 && y < 2.5 ? 0x3a3c42 : (y < 1.0 ? 0x4a6a8a : 0xe8dcc8)));
    for (const [a, b] of [[-8.5, -5.5], [-0.5, 2.5]]) Ch.box(7.5, 0.95, a, 7.875, 1.05, b, 0xd8b060);
    Ch.box(7.0, 3.25, -9.75, 8, 3.375, 3.75, 0x4a6a8a);
    Ch.mesh(root); solid(7.45, -9.6, 8, 3.6);
    for (const [a, b] of [[-7, 0], [1, 0]]) { const g = glass(2.9, 1.3, 0xffd890, 0.5); put(root, g, 7.97, 1.7, a, -PI / 2); }
    const cheese = (c, w, h) => {
      c.fillStyle = '#1e6aa8'; c.beginPath(); c.ellipse(w * 0.42, h * 0.48, w * 0.4, h * 0.36, 0, 0, PI * 2); c.fill(); c.strokeStyle = '#f2f2ee'; c.lineWidth = h * 0.05; c.stroke();
      text(c, 'Cheesetopia', w * 0.42, h * 0.42, h * 0.3, '#f2f2ee', { fam: '"Segoe Script", "Brush Script MT", cursive', w: 800, stroke: '#0e3a6a', lw: h * 0.04 });
      c.fillStyle = '#f08a2a'; c.fillRect(w * 0.12, h * 0.6, w * 0.6, h * 0.14); text(c, 'OUTER RING CUISINE   TAKEOUT', w * 0.42, h * 0.67, h * 0.09, '#fff', { w: 800 });
      c.fillStyle = '#f2c230'; c.beginPath(); c.moveTo(w * 0.78, h * 0.62); c.lineTo(w * 0.98, h * 0.5); c.lineTo(w * 0.96, h * 0.7); c.closePath(); c.fill();   // the cheese car
      c.fillStyle = '#e8a020'; for (const [hx, hy] of [[0.88, 0.6], [0.93, 0.64]]) { c.beginPath(); c.arc(w * hx, h * hy, h * 0.025, 0, PI * 2); c.fill(); }
      c.fillStyle = '#1c1c22'; for (const hx of [0.82, 0.94]) { c.beginPath(); c.arc(w * hx, h * 0.74, h * 0.04, 0, PI * 2); c.fill(); } };
    flat(root, 7.0, 2.2, cheese, 7.9, 4.6, -3.0, -PI / 2, true);
    const BF = piece(0.0625, 7, -10, 0.02); for (let z = -9.4; z < 3.4; z += 0.4) BF.box(7.3, 2.95 - Math.sin((z + 9.4) * 0.6) * 0.0, z, 7.36, 3.15, z + 0.25, [0xd8302a, 0xf2c230, 0x3a9ae0, 0x5ab84a, 0xf2f2ee][Math.floor((z + 10) / 0.4) % 5]); BF.mesh(root);
    light(root, 0x9ad0ff, 0.55, 8, 6.6, 3.4, -3.0, 'neon');
    spot('cheese:kasa', 7.3, -3.0, -PI / 2, 'shopkeep', { post: true });
    for (let i = 0; i < 3; i++) spot('cheese:queue' + i, 6.6 - i * 0.7, -7.0 + i * 0.4, PI / 2, i ? 'phone' : 'browse');
    // picnic tables out front
    const Pt = piece(0.0625, 4, -2, 0.03);
    for (const tz of [-7.4, 0.8]) { Pt.box(3.6, 0, tz - 0.9, 4.6, 0.75, tz + 0.9, (x, y) => y > 0.68 ? 0x9a7448 : (Math.abs(x - 4.1) < 0.35 ? -1 : 0x6a4a2a)); for (const s of [-1, 1]) Pt.box(4.1 + s * 0.75 - 0.2, 0, tz - 0.9, 4.1 + s * 0.75 + 0.2, 0.45, tz + 0.9, (x, y) => y > 0.38 ? 0x9a7448 : 0x6a4a2a); solid(3.1, tz - 0.95, 5.1, tz + 0.95);
      for (const s of [-1, 1]) spot('cheese:seat' + tz + s, 4.1 + s * 0.75, tz, s > 0 ? -PI / 2 : PI / 2, 'eat', { seat: 0.45 }); }
    Pt.mesh(root);
    // the Grumpy Groundhog round the back, by its speaker
    const Gh = piece(0.0625, 9, -11, 0.03); Gh.box(10.2, 0, -11.2, 10.8, 0.9, -10.6, (x, y) => Math.hypot(x - 10.5, y - 0.55) < 0.2 ? 0x3a3c42 : 0x1c1c22); Gh.mesh(root); solid(10.1, -11.3, 10.9, -10.5);
    spot('cheese:groundhog', 9.4, -11.0, PI, 'sit');
    // the Sons' fuel truck: a red cab with bull horns, its trailer a bar (BAR in gold, bottles, pink stools on green stems)
    mass(root, -26, -10, -16, 8, 0, 7, CORR, { win: '', s: 0.5 }); tall(-26, -10, -16, 8, 7); solid(-40, -10, -16, 8);
    const Tr = piece(0.125, -13, -2, 0.04), tx0 = -15.5, tx1 = -12.0;
    Tr.box(tx0, 0.75, -6.5, tx1, 4.0, 2.0, (x, y, z) => { if (x >= tx1 - 0.125 && y > 1.6 && y < 3.4 && z > -5.6 && z < 1.4) return -1; if (x < tx1 - 0.25 && x > tx0 + 0.125 && z > -6.375 && z < 1.875 && y < 3.875 && y > 0.875) return -1; return y > 3.75 ? 0x3a3c42 : (y < 1.0 ? 0x2a2c30 : 0x4a4c52); });
    for (let z = -5.4; z < 1.2; z += 0.5) for (const y of [2.1, 2.7]) { Tr.box(tx0 + 0.2, y, z, tx0 + 0.7, y + 0.06, z + 0.4, 0x6a4a2a); for (let k = 0; k < 3; k++) Tr.box(tx0 + 0.3, y + 0.06, z + k * 0.13, tx0 + 0.4, y + 0.36, z + k * 0.13 + 0.07, [0x3aa858, 0x8a5a2a, 0xd8d8c8][(k + Math.round(z * 2)) % 3]); }
    Tr.box(tx1 - 0.375, 0.75, -5.6, tx1, 1.875, 1.4, (x, y) => y > 1.75 ? 0x9a7448 : 0x2a2c30);                                           // the bar counter
    for (const [wx, wz] of [[tx0 + 0.3, -5.6], [tx1 - 0.3, -5.6], [tx0 + 0.3, 0.6], [tx1 - 0.3, 0.6]]) Tr.discX(wz, 0.5, 0.5, wx - 0.15, wx + 0.15, d => d < 0.18 ? 0xb0b2b8 : 0x1c1c20);
    Tr.box(tx0, 0.5, 2.0, tx1, 3.6, 5.6, (x, y, z) => (y > 2.4 && y < 3.2 && z > 4.6) ? 0x2a3442 : (z > 5.3 && y < 1.6 ? ((Math.floor(x * 4) & 1) ? 0xd8d8d0 : 0x8a8c90) : 0xc8302a));   // the cab
    for (const s of [-1, 1]) { const hx = (tx0 + tx1) / 2 + s * 1.9; for (let k = 0; k < 8; k++) Tr.box(hx + s * k * 0.12 - 0.08, 2.6 + k * 0.12 - (k > 5 ? (k - 5) * 0.2 : 0), 5.6, hx + s * k * 0.12 + 0.08, 2.75 + k * 0.12, 5.8, 0xf2ead8); }   // bull horns
    for (const ex of [tx0 + 0.2, tx1 - 0.4]) Tr.box(ex, 3.0, 2.2, ex + 0.2, 4.6, 2.4, 0xb0b2b8);
    for (const [wx, wz] of [[tx0 + 0.3, 4.6], [tx1 - 0.3, 4.6]]) Tr.discX(wz, 0.55, 0.55, wx - 0.2, wx + 0.2, d => d < 0.2 ? 0xb0b2b8 : 0x1c1c20);
    for (let i = 0; i < 4; i++) Tr.box(tx1, 0.75 - i * 0.19, -7.5 + i * 0.25, tx1 + 1.0, 0.8 - i * 0.19, -7.25 + i * 0.25, 0x2a2c30);                                // its steps
    tyres(Tr, -10.4, 3.6, 3); tyres(Tr, -10.0, 4.4, 2); barrel(Tr, -10.4, -7.2);
    Tr.mesh(root); solid(tx0, -6.5, tx1 + 0.05, 5.8);
    flat(root, 3.2, 0.8, (c, w, h) => { text(c, 'BAR', w / 2, h / 2, h * 0.9, '#d8b040', { fam: DISP, stroke: '#5a4010', lw: h * 0.05 }); }, tx1 + 0.03, 3.45, -2.1, PI / 2);
    flat(root, 1.6, 0.5, (c, w, h) => { c.fillStyle = '#141416'; c.fillRect(0, 0, w, h); text(c, 'ACE', w / 2, h / 2, h * 0.7, '#e8e4dc', { fam: DISP }); }, tx1 + 0.03, 1.2, -6.0, PI / 2);
    const SB = piece(0.0625, -11, -2, 0.03);
    for (let i = 0; i < 5; i++) { const sz = -4.9 + i * 1.35; SB.cyl(-11.4, sz, 0.06, 0, 0.75, 0x3a8a5a); SB.cyl(-11.4, sz, 0.22, 0.68, 0.82, 0xe85a8a); solid(-11.65, sz - 0.25, -11.15, sz + 0.25); spot('bar:stool' + i, -11.4, sz, -PI / 2, 'drink', { seat: 0.82 }); }
    SB.mesh(root);
    light(root, 0xffc890, 0.65, 8, -11.2, 2.6, -2.1, 'shop');
    spot('truck:lean1', -10.6, 5.6, PI, 'lean'); spot('truck:lean2', -9.6, 6.2, -PI / 2 - 0.5, 'chat');
    // Officer Mewmew, a bench, lamps
    spot('mid:mewmew', -6.4, 8.4, PI / 2, 'mascot', { post: true });
    slab(root, -7.7, 12.6, -7.2, 14.8); spot('bench:demir1', -7.45, 13.2, PI / 2, 'sit', { seat: 0.5 }); spot('bench:demir2', -7.45, 14.2, PI / 2, 'sit', { seat: 0.5 });
    const Lp = piece(0.0625, 0, 0, 0.02);
    for (const [lx, lz] of [[-7.4, -9.0], [7.4, 6.4], [-7.4, 18.0], [7.4, 20.6], [-7.4, -27.0], [7.4, -14.8]]) { Lp.cyl(lx, lz, 0.09, 0, 4.4, 0x2a6a4a); Lp.box(lx - 0.05, 4.3, lz - 0.05, lx + (lx < 0 ? 0.7 : -0.7), 4.4, lz + 0.05, 0x2a6a4a); const hx = lx + (lx < 0 ? 0.55 : -0.55); Lp.box(hx - 0.2, 3.95, lz - 0.2, hx + 0.2, 4.3, lz + 0.2, (X, Y) => Y > 4.2 ? 0x2a6a4a : G(0xfff0c0)); solid(lx - 0.12, lz - 0.12, lx + 0.12, lz + 0.12); light(root, 0xffe0b0, 0.55, 9, hx, 3.9, lz, 'lamp'); }
    Lp.mesh(root);
  }

  /* -------------------------------------------- the Upper Level (south) -- */
  function upperLevel(root) {
    // the brick block on the east: the Sons' graffiti, black stairs up its face
    mass(root, 8, 6, 22, 30, 0, 9, RBRICK, { win: 'w', wy0: 1, floor: 3, step: 3 }); tall(8, 6, 22, 30, 9); solid(8, 6, 30, 30);
    flat(root, 5.5, 3.0, (c, w, h) => { c.strokeStyle = 'rgba(30,30,34,.85)'; c.lineWidth = w * 0.012; c.beginPath(); c.ellipse(w * 0.3, h * 0.45, w * 0.18, h * 0.34, 0, 0, PI * 2); c.stroke(); c.beginPath(); c.moveTo(w * 0.16, h * 0.2); c.quadraticCurveTo(w * 0.05, h * 0.05, w * 0.18, h * 0.02); c.moveTo(w * 0.44, h * 0.2); c.quadraticCurveTo(w * 0.55, h * 0.05, w * 0.42, h * 0.02); c.stroke(); c.fillStyle = 'rgba(30,30,34,.85)'; c.fillRect(w * 0.22, h * 0.38, w * 0.05, h * 0.08); c.fillRect(w * 0.33, h * 0.38, w * 0.05, h * 0.08); text(c, 'SONS OF', w * 0.72, h * 0.36, h * 0.17, 'rgba(30,30,34,.85)', { fam: DISP }); text(c, 'CALYDON', w * 0.72, h * 0.58, h * 0.2, 'rgba(30,30,34,.85)', { fam: DISP }); }, 7.96, 4.0, 18.0, -PI / 2);
    stairs(root, 8, 9.0, -1, 3.0);
    // the sheds on the west: corrugated, a walkway and stairs, barrels and crates
    mass(root, -24, 8, -8, 30, 0, 5, CORR, { win: '', s: 0.5 }); tall(-24, 8, -8, 30, 5); solid(-40, 8, -8, 30);
    stairs(root, -8, 19.0, 1, 2.75);
    const Sd = piece(0.125, -8, 12, 0.04);
    Sd.box(-8.0, 0, 10.5, -7.875, 2.6, 12.0, (x, y) => (Math.floor(y * 4) & 1) ? 0x6a6e72 : 0x7a7e82);                                        // a roll-up door
    barrel(Sd, -7.4, 16.2); barrel(Sd, -7.0, 16.9, 0xc8302a); barrel(Sd, -7.5, 17.4); crate(Sd, -7.3, 22.6, 0.6, 0x3aa858); crate(Sd, -7.4, 23.4, 0.9);
    barrel(Sd, 7.4, 23.6, 0xe8702a); crate(Sd, 7.3, 24.6, 0.6);
    Sd.mesh(root);
    bike(root, -6.4, 20.8, 0.4, 0xe8702a); bike(root, 6.2, 12.8, -0.3, 0x3a3c42);
    // the Sons' emblem on its pole at the town's edge; the road out
    const Pl = piece(0.125, 6, 26, 0.03); Pl.box(6.4, 0, 26.4, 6.6, 6.0, 26.6, 0x5a5c62); Pl.mesh(root); solid(6.3, 26.3, 6.7, 26.7);
    flat(root, 2.2, 2.2, (c, w, h) => { c.fillStyle = '#141416'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); c.strokeStyle = '#d8a040'; c.lineWidth = w * 0.04; c.stroke(); c.fillStyle = '#e8e4dc'; c.beginPath(); c.ellipse(w / 2, h * 0.52, w * 0.2, h * 0.24, 0, 0, PI * 2); c.fill(); c.fillStyle = '#141416'; c.fillRect(w * 0.4, h * 0.46, w * 0.06, h * 0.06); c.fillRect(w * 0.54, h * 0.46, w * 0.06, h * 0.06); c.strokeStyle = '#e8e4dc'; c.lineWidth = w * 0.05; c.beginPath(); c.moveTo(w * 0.32, h * 0.36); c.quadraticCurveTo(w * 0.2, h * 0.2, w * 0.3, h * 0.14); c.moveTo(w * 0.68, h * 0.36); c.quadraticCurveTo(w * 0.8, h * 0.2, w * 0.7, h * 0.14); c.stroke(); text(c, 'SONS OF CALYDON', w / 2, h * 0.87, h * 0.08, '#d8a040', { fam: DISP }); }, 6.5, 6.6, 26.62, 0, true);
    const Rs = piece(0.0625, 0, 28, 0.02); Rs.box(-0.06, 0, 28.6, 0.06, 2.8, 28.72, 0x8a8c90); Rs.mesh(root);
    flat(root, 1.8, 0.6, (c, w, h) => { c.fillStyle = '#2a6a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(3, 3, w - 6, h - 6); text(c, 'OUTER RING RD ▸', w / 2, h * 0.38, h * 0.26, '#fff', { w: 800 }); text(c, 'New Eridu 47', w / 2, h * 0.72, h * 0.2, '#fff', { w: 700 }); }, 0, 2.5, 28.74, 0, true);
    barriers(root, -7.4, 29.2, -1.6, 29.2); barriers(root, 1.6, 29.2, 7.4, 29.2);
    spot('south:look', -3.6, 27.6, 0, 'look'); spot('south:sign', 1.8, 27.2, 0.3, 'phone');
    // the alleys' far ends
    barriers(root, -15.6, 6.4, -15.6, 7.6); barriers(root, 15.6, 4.4, 15.6, 5.6);
  }

  /* ---------------------------------------------------------------- hub -- */
  window.HUBS.blazewood = {
    id: 'blazewood', name: 'Blazewood', region: 'Outer Ring',
    blurb: 'The Sons of Calydon\'s town in the desert: the 747, Cheesetopia, the bar in the fuel truck, bikes everywhere.',
    build(root) { STREET.begin(); ground(root); lower(root); middle(root); upperLevel(root); return STREET.finish({ x0: -15.2, x1: 15.2, z0: -29.6, z1: 28.6 }); },
    spawn: [0, 25.6, PI], arrive: [0, 25.6, PI],
    cam: 'free', yaw0: 0, music: 'street', inMusic: 'shop',
    travel: { label: 'Travel', sub: 'The Outer Ring road · back to the city', x: 0, z: 27.8, sx: 0, sy: 3.2, sz: 28.7, r: 1.8 },
    stations: {},
    // the Agents who live here: the Sons of Calydon's
    agents: {
      caesar: ['shop:bike 45, 747:browse 20, huddle 35', 'shop:bike 35, cheese:queue 25, huddle 40', 'bar:stool 45, shop:bike 25, huddle 30', 'bar:stool 40, shop:bike 60'],
      burnice: ['747:browse 40, cheese:queue 30, huddle 30', 'cheese:queue 35, bar:stool 30, huddle 35', 'bar:stool 50, cheese:seat 25, huddle 25', 'bar:stool 60, 747:browse 40'],
    },
    staff: [
      { id: 'kasa', name: 'Kasa', at: 'cheese:kasa', act: 'shopkeep', hours: [0, 1, 2, 3] },
      { id: 'clerk747', name: '747 Clerk', at: '747:clerk1', act: 'bangboo', hours: [0, 1, 2, 3] },
      { id: 'clerk747b', model: 'clerk747', name: '747 Clerk', at: '747:clerk2', act: 'bangboo', hours: [0, 1, 2, 3] },
      { id: 'clerk747c', model: 'clerk747', name: '747 Clerk', at: '747:clerk3', act: 'bangboo', hours: [0, 1, 2] },
      { id: 'mewmewB', model: 'mewmew', name: 'Officer Mewmew', at: 'mid:mewmew', act: 'mascot', hours: [0, 1, 2] },
      { id: 'sage', name: 'Sage in a Barrel', at: 'north:sage', act: 'chat', hours: [0, 1, 2, 3] },
      { id: 'leigh', name: 'Leigh', at: 'shop:leigh', act: 'look', hours: [0, 1, 2] },
    ],
    regulars: [
      { id: 'dorian', name: 'Dorian', slots: { 0: 'shop:bike 60, arch:look 40', 1: 'cheese:queue 50, shop:bike 50', 2: 'bar:stool 100', 3: 'bar:stool 100' } },
      { id: 'lola', name: 'Lola', slots: { 0: 'truck:lean 100', 1: '747:browse 100', 2: 'truck:lean 100' } },
      { id: 'bolter', name: 'Bolter', slots: { 0: 'truck:lean 100', 1: 'shop:bike 100', 2: 'truck:lean 100', 3: 'bar:stool 100' } },
      { id: 'buffy', name: 'Buffy', slots: { 1: 'cheese:queue 100', 2: 'cheese:seat 100' } },
      { id: 'leif', name: 'Leif', slots: { 0: 'south:look 100', 1: 'cheese:seat 100', 2: 'south:look 100' } },
      { id: 'demir', name: 'Old Demir', slots: { 0: 'bench:demir 100', 1: 'bench:demir 100', 2: 'bench:demir 100' } },
    ],
    pets: [
      { id: 'groundhog', name: 'Grumpy Groundhog', slots: { 0: 'cheese:groundhog', 1: 'cheese:groundhog', 2: 'cheese:groundhog', 3: 'cheese:groundhog' } },
      { id: 'slowpoke', name: 'Slowpoke', slots: { 0: 'south:sign', 1: 'arch:look', 2: 'south:sign' } },
    ],
    walkers: [['biker', 'builder', 'biker', 'courier'], ['biker', 'courier', 'biker', 'builder', 'biker'], ['biker', 'biker', 'dude', 'builder'], ['biker', 'dude']],
    ends: [[0, 28.4], [0, -29.4], [-14.8, 7.0], [14.8, 5.0]],
    huddles: [[-2.0, 18.0], [2.4, -4.0], [-2.6, -19.6], [3.0, 10.0], [0.0, 23.0], [-4.0, 3.0]],
    lines: {
      kasa: ['Welcome to Cheesetopia! Outer Ring cuisine, hot off the grill.', 'Mayor by day, chef by night. Blazewood keeps me busy.'],
      clerk747: ['Ehn-na! (The 747 Clerk taps its cap.)', 'Ehn-ne-nu! (It points at the drinks crate.)'], clerk747b: ['Ehn! (It is restocking the bottles.)', 'Ehn-nu?'], clerk747c: ['Ehn-na-na! (It waves you over.)', 'Ehn...'],
      mewmewB: ['Officer Mewmew, on patrol in Blazewood! Ride safe, citizen!', 'No racing through town! ...Unless it\'s a parade.'],
      leigh: ['Grew up on this street. Learned to ride on it too.', 'Dorian\'s fixing his bike again. He\'s always fixing his bike.'],
      dorian: ['My sister runs this town and the cheese. I run errands.', 'Leigh? We\'re... just old friends.'],
      lola: ['Bolter, the truck\'s not going to wash itself.', 'Shawn\'s around somewhere. Probably up to no good.'], bolter: ['Cow Cow! Best shirt in the Outer Ring.', 'Lola says I talk to the truck more than her.'],
      buffy: ['The cheese fries here are worth the drive.', 'Is it always this windy?'],
      leif: ['Slowpoke wants to ride a motorbike. He\'s a tortoise.', 'Slowpoke! Come back! ...Slowly!'],
      demir: ['The desert remembers everything. Even the Sons.', 'Sit a while. Nobody in Blazewood is in a hurry, except on a bike.'],
      biker: ['Nice ride, Proxy? No? Shame.', 'Sons of Calydon. Don\'t forget it.'],
      groundhog: ['(The groundhog yells at you. Then at the speaker.)', '(It is very grumpy.)'], slowpoke: ['(Slowpoke stares at the bikes with envy.)', '(The tortoise takes one step. Then rests.)'],
    },
  };
})();
