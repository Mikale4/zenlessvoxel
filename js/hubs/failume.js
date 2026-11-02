/* ============================================================================
   hubs/failume.js -- Failume Heights, Waifei Peninsula: the old mountainside
   town of Yunkui Summit's Suibian Temple, laid out from the Zenless Zone Zero
   Wiki's map of it (its markers), its area pictures and NPC portraits.

   The look: red flagstones, green-glazed tile and salmon brick, a red
   archway (陶瓷市集, the porcelain market), vertical shop signs, green globe
   lamps, stairs climbing to the rock above, the sea below.

     the main street (Huiying Road, 辉映道), running north to the stairs:
       west: Tin Master's Coffee, Yum Cha Sin (饮茶仙: its fan sign, Sweety and
         Lee; the neighbourhood's commission board), Buyan Antique Store
         (Ginger), Good Goods (Reed)
       east: Devon Pawnshop (Vince), the archway into the square, BooBox (邦巢,
         Bangboo for hire), a bakery
     the square: its banyan, the Random Play video store branch, the cable car
       station (Failume Heights Station: the way out), the wooden dummies
     east: Suibian Temple (随便观): its gate, the skyletter tree, the incense
       burner, the main hall (the HDD), the side hall (Threshold Simulation),
       A-Shuo's divination
   ========================================================================== */
(function () {
  'use strict';
  const PI = Math.PI, G = VX.glow, H = window.MB;
  const { piece, sign, put, glass, text, poster, hash, solid, spot, light, night, anim, tall, bench, bin, aframe, pot, DISP, CJK } = STREET.KIT;
  const { mass, flat, slab, barriers } = window.HUBS.kit;

  /* ----------------------------------------------------------- townsfolk -- */
  MODELS.sweety = H.person({ scale: 0.066, skin: 0xf8dcc8, eye: 0x6a3a4a, hair: 0xc8b8a0, hair2: 0xa8987e, long: 3, top: 0x1c1c22, sleeve: 0x1c1c22, sleeveTo: 1,
    skirt: 0x1c1c22, skirtLen: 12, skirtFn: (x, y) => (Math.abs(x) === 4 || y <= -12) ? 0xc8302a : (x === 2 && y < -3 ? 0xf8dcc8 : 0x1c1c22), legs: 0xf8dcc8, shoe: 0x141416,
    head(g) { g.box(-3, 6, -4, -1, 8, -2, 0xc8b8a0); g.box(1, 6, -4, 3, 8, -2, 0xc8b8a0); g.box(-3, 6, 3, 3, 6, 4, 0xd8a040); },          // the buns, sunglasses pushed up
    torso(g) { g.box(-3, 5, -2, 3, 6, 2, 0xc8302a); g.box(0, 2, 3, 0, 5, 3, 0xc8302a); },                                                   // the qipao's red trim
    armR(g) { g.box(-3, -9, 1, 3, -5, 1, 0xf2ead8); } });                                                                                    // her paper fan
  MODELS.lee = H.person({ scale: 0.07, skin: 0x8a8e96, top: 0xf2c230, sleeve: 0xf2c230, sleeveTo: 8, pants: 0xf2c230, shoe: 0x1c1c22, glove: 0xf2f2ee, gloveLen: 3,
    head(g) { g.box(-4, -1, -4, 4, 7, 4, (x, y, z) => z >= 4 && y >= 2 && y <= 3 && Math.abs(x) >= 1 && Math.abs(x) <= 2 ? 0x1c1c22 : 0xb8bcc4); g.box(-4, 7, -2, -3, 9, 0, 0xb8bcc4); g.box(3, 7, -2, 4, 9, 0, 0xb8bcc4); },   // the masked helmet, its ears
    torso(g) { g.box(0, 0, 2, 0, 6, 2, 0x1c1c22); g.box(-3, 0, -2, -3, 6, 2, 0x1c1c22); g.box(3, 0, -2, 3, 6, 2, 0x1c1c22); } });           // a yellow tracksuit, black stripes
  MODELS.ginger = H.person({ scale: 0.064, skin: 0xf8dcc8, eye: 0x5a3a2a, hair: 0xe8903a, hair2: 0xc8702a, glasses: 0x1c1c22, top: 0x2a8a8a, sleeve: 0x2a8a8a, sleeveTo: 7, pants: 0x5a3a2a, legs: 0xf8dcc8, shoe: 0xd8402a, skinFrom: 0, skinTo: 5,
    head(g) { for (const s of [-1, 1]) g.box(s * 3 - 1, 7, -1, s * 3, 9, 0, 0xe8903a); },
    torso(g) { g.box(-1, 0, 2, 1, 6, 2, 0xf2f2ee); g.box(-1, 3, 3, 1, 4, 3, 0xd8902a); } });                                                  // a cat Thiren, a teal jacket over white
  MODELS.reed = H.person({ scale: 0.064, skin: 0xf8dcc8, eye: 0x6a3a5a, hair: 0xf0a0a8, hair2: 0xd88890, long: 4, top: 0xf2f2f0, sleeve: 0xf2f2f0, sleeveTo: 0, pants: 0x6a8ab8, legs: 0xd8803a, shoe: 0xe8e8e8, skinFrom: 4, skinTo: 8,
    head(g) { g.box(-4, 5, -3, 4, 6, 4, 0xf2f2ee); g.box(-4, 5, 4, 4, 5, 5, 0x8a5ab8); g.box(-3, 7, -1, -2, 9, 0, 0xf2f2ee); g.box(2, 7, -1, 3, 9, 0, 0xf2f2ee); },   // the cat-ear visor
    torso(g) { g.box(-3, 5, -2, 3, 6, 3, 0xf08a2a); } });
  MODELS.vince = H.person({ scale: 0.076, width: 18, skin: 0xa86a42, eye: 0x1c1c22, hair: 0x1c1c22, top: 0xa86a42, sleeve: 0xa86a42, sleeveTo: 0, pants: 0x24283a, shoe: 0x1c1c22, glove: 0x2a2a30, gloveLen: 4,
    head(g) { g.box(-3, -2, 3, 3, 0, 4, 0x1c1c22); for (let a = 0; a < 16; a++) g.set(Math.round(Math.cos(a / 16 * PI * 2) * 5), 9 + Math.round(Math.sin(a / 16 * PI * 2) * 4), -1, 0x1c1c22); },   // a beard, the ring
    torso(g) { g.box(-4, 2, 2, 4, 3, 3, 0x2a2a30); g.box(-1, 3, 3, 1, 5, 3, 0xc8302a); g.box(-4, 0, -3, 4, 0, 3, 0x2a2a30); } });           // a harness on a bare chest
  MODELS.ashuo = H.animal({ scale: 0.05, coat: 0x2a2a30, coat2: 0x1c1c22, eye: 0xf2c230, hip: 7, leg: 6, bl: 6, bw: 3, bh: 3, snout: 2, ear: 3, tail: 5,
    face: (x, y) => (Math.abs(x) < 1 && y > 1) ? 0xf2f2ee : 0x2a2a30,
    vest: (x, y, z) => (z > 2 && y > 1) ? 0xc8302a : (x === 0 && y > 2 && z < 0 ? 0x8a8e96 : 0x2a8a8a) });                                  // a black dog in a teal vest
  MODELS.disciple = H.person({ scale: 0.066, skin: 0xf6d7c3, eye: 0x3a2a2a, hair: 0x1c1c22, top: 0x5a6a8a, sleeve: 0x5a6a8a, sleeveTo: 8, pants: 0x3a4258, shoe: 0x1c1c22,
    torso(g) { g.box(-3, 0, 2, 3, 0, 2, 0xf2f2ee); g.box(-1, 2, 3, 1, 6, 3, 0xf2f2ee); } });                                               // a Yunkui Summit disciple
  MODELS.elder = H.person({ scale: 0.064, skin: 0xe8c0a0, eye: 0x3a2a2a, hair: 0xd8d8d4, hair2: 0xb8b8b4, top: 0xd8d0b8, sleeve: 0xd8d0b8, sleeveTo: 6, pants: 0x4a4a52, shoe: 0x3a2a20 });

  /* ------------------------------------------------------------ helpers -- */
  const TILEG = (x, y) => { const row = Math.floor(y / 0.25), off = row & 1 ? 0.25 : 0; return (Math.floor((x + off) / 0.5) % 6 === 0) ? 0x3a9a80 : (row % 3 ? 0x4ab89a : 0x44ae92); };   // green glazed tile
  const SALMON = (x, y) => { const row = Math.floor(y / 0.25), off = row & 1 ? 0.25 : 0; return (Math.floor((x + off) / 0.5) % 5 === 0) ? 0xc0644e : 0xd8785e; };
  /* a Chinese roof over x0..x1, z0..z1 from height y: grey-green tiles in steps, upturned corners, a ridge */
  function roof(P, x0, z0, x1, z1, y, o) {
    o = o || {}; const n = o.n || 6, ax = x1 - x0 > z1 - z0, col = o.col || 0x5a6a6a, col2 = o.col2 || 0x4a5858;
    for (let k = 0; k < n; k++) { const ix = ax ? k * 0.08 : k * 0.3, iz = ax ? k * 0.3 : k * 0.08; P.box(x0 - 0.5 + ix, y + k * 0.25, z0 - 0.5 + iz, x1 + 0.5 - ix, y + (k + 1) * 0.25, z1 + 0.5 - iz, (x, yy, z) => (Math.floor((ax ? x : z) * 4) & 1) ? col : col2); }
    const top = y + n * 0.25; P.box(ax ? x0 : (x0 + x1) / 2 - 0.25, top, ax ? (z0 + z1) / 2 - 0.25 : z0, ax ? x1 : (x0 + x1) / 2 + 0.25, top + 0.375, ax ? (z0 + z1) / 2 + 0.25 : z1, o.ridge || 0x3a4646);
    for (const [cx, cz] of [[x0 - 0.5, z0 - 0.5], [x1 + 0.25, z0 - 0.5], [x0 - 0.5, z1 + 0.25], [x1 + 0.25, z1 + 0.25]]) P.box(cx, y + 0.25, cz, cx + 0.25, y + 0.75, cz + 0.25, o.ridge || 0x3a4646);   // the upturned corners
  }
  /* a red lantern, hanging */
  const lantern = (P, x, y, z) => { P.box(x - 0.03, y + 0.35, z - 0.03, x + 0.03, y + 0.55, z + 0.03, 0x2a1a12); P.cyl(x, z, 0.2, y, y + 0.35, G(0xe8302a)); P.cyl(x, z, 0.1, y - 0.06, y, 0xf2c230); P.cyl(x, z, 0.1, y + 0.35, y + 0.41, 0xf2c230); };
  /* a green lamp post with its globe */
  function globeLamp(root, x, z) {
    const P = piece(0.0625, x, z, 0.02); P.cyl(x, z, 0.08, 0, 4.2, 0x2a6a4a); P.box(x - 0.04, 4.1, z - 0.04, x + 0.6, 4.2, z + 0.04, 0x2a6a4a);
    P.box(x + 0.35, 3.7, z - 0.18, x + 0.75, 4.1, z + 0.18, (X, Y) => Y >= 3.95 ? 0xd8b040 : G(0xfff2c0)); P.mesh(root); solid(x - 0.12, z - 0.12, x + 0.12, z + 0.12);
    light(root, 0xffe0b0, 0.55, 9, x + 0.55, 3.8, z, 'lamp');
  }
  /* a vertical blade sign on a wall (facing ±x: ry), its lines one character to a row */
  const blade = (root, x, y, z, ry, w, h, bg, fg, s) => flat(root, w, h, (c, W, Hh) => { c.fillStyle = bg; c.fillRect(0, 0, W, Hh); c.strokeStyle = fg; c.lineWidth = W * 0.05; c.strokeRect(W * 0.06, W * 0.06, W * 0.88, Hh - W * 0.12); const ch = [...s]; ch.forEach((t, i) => text(c, t, W / 2, Hh * (i + 0.5) / ch.length, Math.min(W * 0.62, Hh / ch.length * 0.8), fg, { fam: CJK, w: 900 })); }, x, y, z, ry, true);
  /* a tree: a trunk, a broad leafy crown (the banyan has hanging roots, the skyletter tree its wishes) */
  function tree(root, x, z, h, r, o) {
    o = o || {}; const P = piece(0.125, x, z, 0.04);
    P.cyl(x, z, o.trunk || 0.45, 0, h, 0x6a4a32);
    for (const a of [0.4, 2.3, 4.2]) for (let k = 0; k < 10; k++) { const t = k / 10; P.box(x + Math.cos(a) * t * r * 0.7 - 0.1, h - 0.6 + t * 0.9, z + Math.sin(a) * t * r * 0.7 - 0.1, x + Math.cos(a) * t * r * 0.7 + 0.1, h - 0.4 + t * 0.9, z + Math.sin(a) * t * r * 0.7 + 0.1, 0x5a3e2a); }
    P.box(x - r, h, z - r, x + r, h + r * 0.9, z + r, (X, Y, Z) => { const d = Math.hypot((X - x) / r, (Y - h - r * 0.4) / (r * 0.5), (Z - z) / r); return d > 1 || (d > 0.8 && hash(X * 3 + Y, Z * 3) > 0.5) ? -1 : (hash(X * 2, Z * 2 + Y) > 0.6 ? 0x3a8a3a : 0x2f7a34); });
    if (o.roots) for (let i = 0; i < 14; i++) { const a = i * 2.4, rr = r * (0.4 + hash(i, 1) * 0.5), rx = x + Math.cos(a) * rr, rz = z + Math.sin(a) * rr; P.box(rx, 0, rz, rx + 0.125, h + 0.2, rz + 0.125, 0x6a5038); }
    if (o.wishes) for (let i = 0; i < 46; i++) { const a = i * 2.39, rr = r * (0.3 + hash(i, 2) * 0.6), rx = x + Math.cos(a) * rr, rz = z + Math.sin(a) * rr, y0 = h + 0.1 - hash(i, 3) * 0.3; P.box(rx, y0, rz, rx + 0.0625, y0 + 0.3, rz + 0.0625, 0xc8c0b0); P.box(rx - 0.06, y0 - 0.45, rz, rx + 0.12, y0, rz + 0.0625, [0xd8302a, 0xf2f2ee, 0xf2c230][i % 3]); }
    P.mesh(root); solid(x - (o.trunk || 0.45) - 0.1, z - (o.trunk || 0.45) - 0.1, x + (o.trunk || 0.45) + 0.1, z + (o.trunk || 0.45) + 0.1);
  }

  /* ------------------------------------------------------------- ground -- */
  function ground(root) {
    const T = piece(0.25, 0, 0, 0.02);
    T.box(-36, -0.25, -30, 32, 0, 17.75, (x, y, z) => {
      if (x >= 8 && x < 27.5 && z >= -5 && z < 14.5) return ((Math.floor(x) + Math.floor(z)) & 1) ? 0x8c887e : 0x827e74;   // the temple's stone court
      if (x >= -21 && x < -20 && z < 17) return Math.floor(z * 2) & 1 ? 0xb0aaa2 : 0xa49e96;                               // the pavement along the west row
      const u = x + Math.sin(z * 2.1) * 0.22, v = z + Math.sin(x * 1.9) * 0.22, fu = ((u / 0.75) % 1 + 1) % 1, fv = ((v / 0.75) % 1 + 1) % 1;
      if (fu < 0.15 || fv < 0.15) return 0xa88a80;                                                                         // the mortar
      return [0xc07058, 0xb8664e, 0xc87a62, 0xbc6c56][Math.floor(hash(Math.floor(u / 0.75), Math.floor(v / 0.75)) * 4)];   // red flagstones
    });
    T.mesh(root, { cast: false });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x3a7a98 })); water.rotation.x = -PI / 2; water.position.set(0, -1.6, 0); root.add(water);
    const Q = piece(0.5, 0, 17.5, 0.03); Q.box(-36, -2, 17.5, 32, 0, 18.5, (x, y) => y > -0.6 ? 0xb8b0a4 : 0x8a8478); Q.box(32, -2, -30, 33, 0, 18.5, 0x8a8478); Q.mesh(root, { cast: false });
    const F = piece(0.125, 0, 17, 0.02);
    F.box(-12, 1.0, 17.0, 32, 1.125, 17.125, 0x2a6a4a); F.box(-12, 0.5, 17.0, 32, 0.5625, 17.125, 0x2a6a4a); for (let x = -12; x < 32; x += 1.5) F.box(x, 0, 17.0, x + 0.125, 1.0, 17.125, 0x2a6a4a);
    F.mesh(root); solid(-40, 16.95, 40, 30);
  }

  /* --------------------------------------- the mountain, the sea's far shore -- */
  function mountain(root) {
    const E = piece(1, 0, 0, 0.04);
    const rock = (x, y, z) => hash(Math.floor(x / 2) + y * 0.3, Math.floor(z / 2)) > 0.86 ? 0x4a7a4a : (hash(Math.floor(x / 3), Math.floor(y / 2) + z) > 0.5 ? 0x6a6e74 : 0x5c6066);
    for (let x = -60; x < 34; x += 3) for (let z = -60; z < -26; z += 3) { const h = 10 + Math.floor((-z - 26) * 0.6 + (34 - x) * 0.12 + hash(x, z) * 8); E.box(x, 0, z, x + 3, h, z + 3, rock); }
    for (let x = -60; x < -32; x += 3) for (let z = -26; z < 18; z += 3) { const h = 8 + Math.floor((-32 - x) * 0.7 + hash(x, z) * 8); E.box(x, 0, z, x + 3, h, z + 3, rock); }
    // houses up the slope, cream and teal
    for (let i = 0; i < 16; i++) { const x = -40 + i * 5 + Math.floor(hash(i, 4) * 2), z = -30 - Math.floor(hash(i, 5) * 8), y0 = 8 + Math.floor(hash(i, 6) * 6), h = 4 + Math.floor(hash(i, 7) * 6), c = hash(i, 8) > 0.5 ? 0xe8dcc0 : 0x8ac8b8;
      E.box(x, y0, z, x + 4, y0 + h, z + 3, (X, Y, Z) => (Z >= z + 2 && (Y - y0) % 2 === 1 && (X - x) % 2 === 1) ? (hash(X, Y) > 0.6 ? G(0xffd890) : 0x3a4658) : (Y === y0 + h - 1 ? 0x6a6a70 : c)); }
    // the far shore across the bay
    for (let i = 0; i < 14; i++) E.box(-40 + i * 9, 0, 70 + Math.floor(hash(i, 9) * 8), -32 + i * 9, 6 + Math.floor(hash(i, 10) * 14), 78 + Math.floor(hash(i, 9) * 8), (x, y, z) => y % 2 === 1 && hash(x, y + z) > 0.6 ? G(0xffd890) : (y < 3 ? 0x5c6066 : 0xa8a49a));
    E.mesh(root, { cast: false });
    // a little red shrine gate on the rock above the stairs
    const S = piece(0.25, -16, -32, 0.03);
    for (const px of [-18, -14.5]) S.box(px, 14, -31, px + 0.5, 18, -30.5, 0xd8302a);
    S.box(-18.75, 18, -31.25, -13.25, 18.5, -30.25, 0xd8302a); S.box(-18.5, 17, -31, -13.5, 17.375, -30.5, 0xd8302a); S.mesh(root);
    tall(-60, -60, 34, -26, 30); tall(-60, -26, -32, 18, 26);
  }

  /* ---------------------------------- the main street: the west row -- */
  function westRow(root) {
    mass(root, -32, -26, -21, 17.5, 0, 13, (x, y, z) => y < 3.75 ? 0xb8b0a4 : (z > -9 && z < 2 ? (y < 4.5 ? SALMON(z, y) : TILEG(z, y)) : (Math.floor(y * 2) % 7 === 0 ? 0xc8bca4 : 0xe0d4bc)), { win: 'e', wy0: 4.5, ww: 1.4, step: 2.4 });
    tall(-32, -26, -21, 17.5, 13); solid(-40, -26, -21, 17.5);
    // Tin Master's Coffee: dark wood, a black-and-white awning, the counter at the window
    const C = piece(0.125, -21, -14, 0.04);
    C.box(-21, 0, -14, -20.875, 3.0, -10, (x, y, z) => (z > -13.5 && z < -10.5 && y > 1.0 && y < 2.25) ? -1 : (Math.floor(z * 4) & 1 ? 0x4a3222 : 0x5a3c28));
    C.box(-20.375, 0, -13.5, -20.0, 1.0625, -10.5, (x, y) => y >= 0.9375 ? 0xc8a070 : 0x4a3222);
    for (let k = 0; k < 6; k++) C.box(-20.875 + k * 0.125, 3.0 - k * 0.0625, -14, -20.75 + k * 0.125, 3.125 - k * 0.0625, -10, (x, y, z) => (Math.floor(z * 3) & 1) ? 0x141416 : 0xf2f2f0);
    C.mesh(root); solid(-21, -14, -19.95, -10);
    flat(root, 2.6, 0.6, (c, w, h) => { text(c, 'COFF CAFE', w / 2, h * 0.38, h * 0.44, '#f2f2f0', { fam: DISP }); text(c, 'MADE BY TIN MASTER', w / 2, h * 0.8, h * 0.2, '#f2f2f0', { w: 800 }); }, -20.84, 2.6, -12, PI / 2);
    for (const [tx, tz] of [[-17.6, -13.2], [-17.6, -10.8]]) { slab(root, tx - 0.35, tz - 0.35, tx + 0.35, tz + 0.35); }
    spot('cafe:tin', -20.62, -12.0, PI / 2, 'serve', { post: true }); spot('cafe:t1', -18.2, -13.2, PI / 2, 'drink'); spot('cafe:t2', -18.2, -10.8, PI / 2, 'drink');
    light(root, 0xffd8a0, 0.55, 6, -19.8, 2.6, -12, 'shop');
    // Yum Cha Sin: green tile and salmon brick, its fan sign and cloud plaque, tea shelves and a lattice door under the overhang
    const Y = piece(0.125, -21, -9, 0.04);
    Y.box(-21, 0, -9, -20.5, 3.75, -8.5, SALMON); Y.box(-21, 0, 1.5, -20.5, 3.75, 2.0, TILEG);                                               // the corner columns
    Y.box(-20.5, 3.5, -9, -19.25, 3.75, 2.0, 0xe8dcc0); Y.box(-20.5, 3.75, -9, -19.25, 4.5, 2.0, (x, y, z) => SALMON(z, y));                // the overhang
    for (let z = -8.0; z < -5.5; z += 0.6) for (let y = 0.6; y < 3.0; y += 0.7) Y.box(-20.95, y, z, -20.8, y + 0.06, z + 0.5, 0x6a4a2a);  // tea shelves
    for (let z = -7.9; z < -5.6; z += 0.6) for (let y = 0.66; y < 3.0; y += 0.7) Y.box(-20.9, y, z + 0.1, -20.75, y + 0.3, z + 0.3, 0x2a2a30);   // tea tins
    Y.box(-20.4, 0, -7.6, -19.9, 1.0, -5.8, (x, y) => y >= 0.875 ? 0xe8dcc0 : TILEG(x * 3, y));                                              // the counter
    Y.box(-20.95, 0, -4.4, -20.875, 3.0, -1.4, (x, y, z) => (Math.abs(((z + 4.4) % 0.375) - 0.19) < 0.05 || Math.abs((y % 0.375) - 0.19) < 0.05) ? 0x8a4a2a : 0x6a3a22);   // the lattice door
    for (const lz of [-7.2, -6.4, -5.6]) lantern(Y, -20.0, 2.55, lz);
    Y.mesh(root); solid(-21, -9, -19.85, 2);
    for (const [d, lz] of [[0, -2.3], [1, -3.5]]) flat(root, 0.62, 0.62, (c, w, h) => { c.fillStyle = '#f2c860'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.46, 0, PI * 2); c.fill(); text(c, '饮茶'[d], w / 2, h * 0.52, h * 0.56, '#c8302a', { fam: CJK, w: 900 }); }, -20.86, 1.9, lz, PI / 2);
    const fan = (c, w, h) => { const cx = w / 2, cy = h * 0.98, R = h * 0.95, a0 = PI * 1.12, a1 = PI * 1.88;
      c.fillStyle = '#f4ecd8'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath(); c.fill(); c.fillStyle = '#5a3a2a'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R * 0.32, a0, a1); c.closePath(); c.fill();
      c.strokeStyle = '#8a6a4a'; c.lineWidth = w * 0.006; for (let i = 0; i <= 3; i++) { const a = a0 + (a1 - a0) * i / 3; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); }
      ['YUM', 'CHA', 'SIN'].forEach((t, i) => { const a = a0 + (a1 - a0) * (i + 0.5) / 3; c.save(); c.translate(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78); c.rotate(a + PI / 2); text(c, t, 0, 0, h * 0.13, '#2a2a30', { fam: DISP }); c.restore(); c.save(); c.translate(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55); c.rotate(a + PI / 2); text(c, '饮茶仙'[i], 0, 0, h * 0.15, '#e8602a', { fam: CJK, w: 900 }); c.restore(); }); };
    flat(root, 4.6, 2.4, fan, -19.2, 5.6, -3.5, PI / 2);
    const plaque = (c, w, h) => { c.fillStyle = '#f2ead8'; c.strokeStyle = '#c8a040'; c.lineWidth = w * 0.06; for (const yy of [0.3, 0.7]) { c.beginPath(); c.ellipse(w / 2, h * yy, w * 0.44, h * 0.2, 0, 0, PI * 2); c.fill(); c.stroke(); } text(c, '饮', w / 2, h * 0.3, w * 0.5, '#c8a040', { fam: CJK, w: 900 }); text(c, '仙', w / 2, h * 0.7, w * 0.5, '#c8a040', { fam: CJK, w: 900 }); };
    flat(root, 1.1, 2.6, plaque, -20.94, 8.4, 1.4, PI / 2);
    flat(root, 0.8, 1.0, (c, w, h) => { c.fillStyle = '#f4ecd8'; c.fillRect(0, 0, w, h); text(c, 'YUM CHA SIN', w / 2, h * 0.12, h * 0.1, '#2a2a30', { fam: DISP }); c.fillStyle = '#2a2a30'; c.beginPath(); c.arc(w / 2, h * 0.45, w * 0.22, 0, PI * 2); c.fill(); c.fillStyle = '#f8dcc8'; c.beginPath(); c.arc(w / 2, h * 0.5, w * 0.17, 0, PI * 2); c.fill(); text(c, '饮茶仙', w / 2, h * 0.82, h * 0.13, '#2a2a30', { fam: CJK, w: 900 }); }, -20.44, 1.6, 1.2, PI / 2, true);
    light(root, 0xffd090, 0.65, 7, -19.6, 3.0, -4.5, 'shop');
    // tables out front
    const Tb = piece(0.0625, -17, -6, 0.03);
    for (const tz of [-6.6, -2.4]) { Tb.cyl(-17.4, tz, 0.05, 0, 0.72, 0x3a3c42); Tb.cyl(-17.4, tz, 0.42, 0.72, 0.78, 0xe8dcc0); for (const s of [-1, 1]) Tb.cyl(-17.4 + s * 0.7, tz, 0.18, 0, 0.45, 0xe8702a); solid(-17.85, tz - 0.45, -16.95, tz + 0.45); }
    Tb.mesh(root);
    spot('yum:sweety', -19.55, -4.2, PI / 2, 'serve', { post: true }); spot('yum:lee', -20.62, -6.7, PI / 2, 'shopkeep', { post: true });
    for (const tz of [-6.6, -2.4]) { spot('yum:seat' + tz + 'a', -18.1, tz, PI / 2, 'eat', { seat: 0.45 }); spot('yum:seat' + tz + 'b', -16.7, tz, -PI / 2, 'eat', { seat: 0.45 }); }
    spot('yum:cat', -20.1, 0.9, 1.2, 'sit'); spot('yum:ad', -18.6, 0.4, PI / 2, 'chat');
    // Buyan Antique Store: dark lattice, a celadon vase in the window
    const B = piece(0.125, -21, 3, 0.04);
    B.box(-21, 0, 3, -20.875, 3.25, 8, (x, y, z) => (z > 3.5 && z < 7.5 && y > 0.5 && y < 2.75) ? ((Math.abs(((z - 3.5) % 0.5) - 0.25) < 0.05 || Math.abs(((y - 0.5) % 0.5) - 0.25) < 0.05) ? 0x4a2a1a : -1) : 0x3a2418);
    B.cyl(-21.2, 4.6, 0.28, 0.5, 1.6, (X, Yy) => Yy > 1.3 ? 0x7ab8a0 : 0x8ac8b0); B.box(-21.0, 0, 4.2, -20.875, 0.5, 5.0, 0x3a2418);
    B.mesh(root); solid(-21, 3, -20.8, 8);
    const bg = glass(4.0, 2.25, 0x2a2a30, 0.7); bg.material.depthWrite = true; put(root, bg, -21.03, 1.625, 5.5, PI / 2);
    flat(root, 3.2, 0.5, (c, w, h) => { c.fillStyle = '#1c140e'; c.fillRect(0, 0, w, h); text(c, 'BUYAN ANTIQUES', w / 2, h / 2, h * 0.5, '#d8b060', { fam: DISP }); }, -20.84, 3.0, 5.5, PI / 2);
    spot('buyan:ginger', -20.3, 5.5, PI / 2, 'shopkeep', { post: true }); spot('buyan:look', -19.0, 6.6, -PI / 2, 'look');
    // Good Goods: goods piled outside, drinks posters
    const Gd = piece(0.125, -21, 10, 0.04);
    Gd.box(-21, 0, 10, -20.875, 3.25, 16, (x, y, z) => (z > 10.5 && z < 15.5 && y > 0.4 && y < 2.75) ? -1 : 0xd8c8a8);
    for (let i = 0; i < 5; i++) Gd.box(-20.75, 0, 10.6 + i * 1.0, -20.0, 0.375 + (i % 3) * 0.25, 11.4 + i * 1.0, [0xe8a03a, 0xc8302a, 0xd8b060, 0x5ab84a, 0xe8702a][i]);
    for (const sz of [12.6, 14.6]) { Gd.cyl(-19.6, sz, 0.18, 0, 0.42, 0xe8702a); Gd.cyl(-19.6, sz + 0.5, 0.18, 0, 0.42, 0x3a9ae0); }
    Gd.mesh(root); solid(-21, 10, -19.3, 16);
    const gg = glass(5.0, 2.35, 0x3a3a34, 0.55); gg.material.depthWrite = true; put(root, gg, -21.03, 1.575, 13, PI / 2);
    const gl = glass(4.9, 2.25, 0xfff0d0, 0.6); put(root, gl, -21.02, 1.575, 13, PI / 2); gl.visible = false; night(gl);
    flat(root, 3.6, 0.55, (c, w, h) => { c.fillStyle = '#c8302a'; c.fillRect(0, 0, w, h); text(c, 'GOOD GOODS', w * 0.36, h / 2, h * 0.52, '#fff', { fam: DISP }); text(c, '好货铺', w * 0.8, h / 2, h * 0.5, '#f2c230', { fam: CJK, w: 900 }); }, -20.84, 2.95, 13, PI / 2);
    for (const [pz, k] of [[10.5, 1], [15.5, 2]]) flat(root, 0.6, 0.9, (c, w, h) => { poster(c, w, h, 60 + k, ['#c8302a', '#f2c230', '#f2ead8', '#2a2a30']); text(c, k & 1 ? '如意' : 'COLA', w / 2, h * 0.88, h * 0.12, '#fff', { fam: CJK, w: 900 }); }, -20.84, 1.6, pz, PI / 2, true);
    spot('goods:reed', -19.8, 13.3, PI / 2, 'shopkeep', { post: true }); spot('goods:browse', -18.8, 11.6, -PI / 2, 'browse');
    // blade signs up the west row
    blade(root, -20.6, 7.0, -12.0, PI / 2, 0.8, 3.6, '#c8302a', '#f2ead8', '如意饮料公司');
    blade(root, -20.6, 6.6, 9.0, PI / 2, 0.8, 2.8, '#f2c230', '#2a2a30', '老将饼家');
    for (const z of [-9.6, 2.6, 9.4, 16.0]) globeLamp(root, -19.9, z);
    flat(root, 0.9, 0.3, (c, w, h) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h); c.strokeStyle = '#1c1c22'; c.strokeRect(2, 2, w - 4, h - 4); text(c, '辉映道', w / 2, h / 2, h * 0.62, '#1c1c22', { fam: CJK, w: 900 }); }, -20.82, 2.3, 2.4, PI / 2);
    // the stairs up the hill at the street's north end, a red stall at the top
    const St = piece(0.25, -20, -15, 0.03);
    for (let i = 0; i < 22; i++) St.box(-20, 0, -15 - (i + 1) * 0.5, -12, (i + 1) * 0.25, -15 - i * 0.5, i % 2 ? 0xb8b0a4 : 0xaca49a);
    St.box(-20, 0, -27, -12, 5.5, -26, 0x9a9488); St.box(-20.5, 0, -26, -20, 6.5, -15, 0xb8b0a4); St.box(-12, 0, -26, -11.5, 6.5, -15, 0xb8b0a4);
    St.box(-17.5, 5.5, -25.5, -14.5, 7.5, -24.5, (x, y) => y > 7.0 ? 0xf2f2ee : 0xc8302a); St.mesh(root);
    solid(-20, -40, -12, -14.9);
    flat(root, 2.6, 0.4, (c, w, h) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h); text(c, 'INDESTRUCTIBLES', w / 2, h / 2, h * 0.55, '#c8302a', { fam: DISP }); }, -16, 7.25, -24.45, 0);
    barriers(root, -20.4, 16.7, -12.4, 16.7);
  }

  /* --------------------------- the east of the street, the square -- */
  function square(root) {
    // the block north of the square: Devon Pawnshop on the street, the video store and the cable car facing the square
    mass(root, -12, -26, 1, -8, 0, 10, (x, y) => y < 3.75 ? 0xa8a49a : (Math.floor(y * 2) % 6 === 0 ? 0x7ab8a8 : 0xe0d4bc), { win: 'ws', wy0: 4, step: 2.6 });
    mass(root, 1, -26, 8, -8, 0, 3.5, 0xa8a49a, { win: '' });
    tall(-12, -26, 1, -8, 10); solid(-12, -26, 8, -8);
    // Devon Pawnshop: an old-style front, the hanging 押 sign
    const D = piece(0.125, -12, -15, 0.04);
    D.box(-12.125, 0, -15, -12, 3.5, -9.5, (x, y, z) => (z > -14.5 && z < -10 && y > 0.4 && y < 2.9) ? -1 : (y >= 3.0 ? 0x2a1a12 : 0x6a4026));
    D.box(-13.0, 2.6, -12.35, -12.125, 2.7, -12.15, 0x2a1a12); D.mesh(root);
    const dg = glass(4.5, 2.5, 0x2a2420, 0.7); dg.material.depthWrite = true; put(root, dg, -12.03, 1.65, -12.25, -PI / 2);
    const dl = glass(4.4, 2.4, 0xffc890, 0.55); put(root, dl, -12.04, 1.65, -12.25, -PI / 2); dl.visible = false; night(dl);
    flat(root, 0.9, 1.0, (c, w, h) => { c.fillStyle = '#1c1410'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8b060'; c.lineWidth = w * 0.05; c.beginPath(); c.arc(w / 2, h * 0.55, w * 0.36, 0, PI * 2); c.stroke(); text(c, '押', w / 2, h * 0.56, h * 0.5, '#d8302a', { fam: CJK, w: 900 }); }, -12.8, 2.15, -12.25, 0, true);
    flat(root, 3.6, 0.45, (c, w, h) => { text(c, 'DEVON PAWNSHOP', w / 2, h / 2, h * 0.6, '#d8b060', { fam: DISP }); }, -12.15, 3.25, -12.25, -PI / 2);
    spot('pawn:vince', -12.6, -10.4, -PI / 2, 'lean', { post: true });
    blade(root, -12.1, 6.4, -14.0, -PI / 2, 0.8, 3.2, '#2a8a6a', '#f2f2ee', '薄暮書局');
    // the Random Play video store branch
    const V = piece(0.125, -9, -8, 0.04);
    V.box(-9, 0, -8, -2, 3.75, -7.875, (x, y) => (x > -8.5 && x < -2.5 && y > 0.4 && y < 2.75) ? -1 : (y >= 3.0 ? 0x24304a : 0x2a2c34));
    V.mesh(root);
    const vg = glass(6.0, 2.35, 0x2a3442, 0.55); vg.material.depthWrite = true; put(root, vg, -5.5, 1.575, -7.97);
    const vl = glass(5.9, 2.25, 0xffd8a0, 0.6); put(root, vl, -5.5, 1.575, -7.96); vl.visible = false; night(vl);
    flat(root, 5.6, 0.62, (c, w, h) => { text(c, 'RANDOM PLAY', w * 0.42, h * 0.5, h * 0.6, '#f2c230', { fam: DISP }); text(c, 'FAILUME BRANCH', w * 0.86, h * 0.5, h * 0.22, '#f2f2ee', { w: 800 }); }, -5.5, 3.38, -7.84, 0);
    for (let i = 0; i < 4; i++) flat(root, 0.7, 1.0, (c, w, h) => { poster(c, w, h, 80 + i); }, -8.0 + i * 1.6, 1.5, -7.95, 0, true);
    light(root, 0xffd8a0, 0.55, 7, -5.5, 2.6, -6.8, 'shop');
    spot('video:window1', -7.0, -7.2, PI, 'look'); spot('video:window2', -4.0, -7.2, PI, 'look');
    // the cable car station, Failume Heights Station, its cable going up the mountain and a car on it
    const C = piece(0.25, 1, -14, 0.03);
    C.box(1, 0, -8.25, 8, 0.25, -7.75, 0x8a8a86); C.box(1, 3.5, -12, 8, 3.75, -7.25, 0x2a6a4a); C.box(1.25, 3.75, -11.75, 7.75, 4.0, -7.5, 0x3a8a5a);
    for (const px of [1.25, 7.5]) C.box(px, 0, -7.75, px + 0.25, 3.5, -7.5, 0xe8dcc0);
    C.box(2.5, 4.0, -11, 6.5, 7.25, -9.5, (x, y) => y > 6.75 ? 0x2a6a4a : 0xe8dcc0); C.box(4.25, 7.25, -10.5, 4.75, 7.75, -10, 0x5a5c62);
    C.mesh(root);
    flat(root, 4.4, 0.6, (c, w, h) => { c.fillStyle = '#2a6a4a'; c.fillRect(0, 0, w, h); text(c, '缆车', w * 0.16, h / 2, h * 0.6, '#f2f2ee', { fam: CJK, w: 900 }); text(c, 'CABLE CAR · FAILUME HEIGHTS', w * 0.62, h / 2, h * 0.28, '#f2f2ee', { w: 800 }); }, 4.5, 3.62, -7.22, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1a1e }), A = new THREE.Vector3(4.5, 7.6, -10.25), B2 = new THREE.Vector3(34, 32, -58);
    for (const off of [-0.3, 0.3]) root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(A.clone().setX(A.x + off), B2.clone().setX(B2.x + off)), 2, 0.035, 4), mat));
    const car = new THREE.Group(), CP = piece(0.125, 0, 0, 0.02);
    CP.box(-0.05, 0, -0.05, 0.05, 1.2, 0.05, 0x3a3c42); CP.box(-1.1, -2.2, -0.8, 1.1, -0.2, 0.8, (x, y) => y < -1.4 ? 0xc8302a : (y > -1.25 && y < -0.5 ? 0x2a3442 : 0xf2ead8)); CP.box(-1.2, -0.25, -0.9, 1.2, 0, 0.9, 0x3a3c42);
    CP.mesh(car); root.add(car);
    anim(t => { const k = 0.5 - 0.5 * Math.cos(t * 0.05); car.position.set(A.x + (B2.x - A.x) * (0.18 + k * 0.7), A.y + (B2.y - A.y) * (0.18 + k * 0.7) - 0.1, A.z + (B2.z - A.z) * (0.18 + k * 0.7)); });
    solid(1, -12, 8, -7.4);
    spot('cable:look', 6.8, -6.4, PI + 0.6, 'look'); spot('cable:bench', 2.6, -6.6, 0, 'sit', { seat: 0.5 });
    slab(root, 2.0, -7.1, 3.4, -6.6);
    // the block south of the square: BooBox and the bakery, on the street
    mass(root, -12, 5, -3, 17, 0, 9, (x, y) => y < 3.75 ? 0x8a8e96 : (Math.floor(y * 2) % 5 === 0 ? 0xb8b0a4 : 0xd0c8b8), { win: 'w', wy0: 4, step: 2.4 });
    tall(-12, 5, -3, 17, 9); solid(-12, 5, -3, 17);
    const Bx = piece(0.125, -12, 5.5, 0.04);
    Bx.box(-12.125, 0, 5.5, -12, 3.5, 11, (x, y, z) => { const cx = Math.floor((z - 6) / 1.6), cy = Math.floor((y - 0.5) / 1.25); if (z >= 6 && z < 10.8 && y >= 0.5 && y < 3.0 && cx >= 0 && cx < 3 && cy >= 0 && cy < 2) { const d = Math.hypot(z - (6.8 + cx * 1.6), y - (1.1 + cy * 1.25)); return d < 0.42 ? -1 : 0xe8e8e4; } return y >= 3.0 ? 0xf2c230 : 0x5a5e66; });
    Bx.mesh(root);
    for (let i = 0; i < 6; i++) { const pz = 6.8 + (i % 3) * 1.6, py = 1.1 + Math.floor(i / 3) * 1.25, pg = glass(0.8, 0.8, i === 2 ? 0x9aff5a : 0x3a4658, 0.7); put(root, pg, -12.03, py, pz, -PI / 2); }
    flat(root, 2.6, 0.5, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); text(c, '邦巢', w * 0.3, h / 2, h * 0.62, '#141416', { fam: CJK, w: 900 }); text(c, 'BOOBOX', w * 0.72, h / 2, h * 0.42, '#141416', { fam: DISP }); }, -12.15, 3.25, 8.25, -PI / 2);
    spot('boo:look', -11.2, 8.4, -PI / 2, 'look'); spot('boo:cat', -11.4, 11.6, -0.8, 'sit');
    const Bk = piece(0.125, -12, 12, 0.04);
    Bk.box(-12.125, 0, 12, -12, 3.25, 16.5, (x, y, z) => (z > 12.5 && z < 16 && y > 0.5 && y < 2.75) ? -1 : 0xc8302a); Bk.mesh(root);
    const kg = glass(3.5, 2.25, 0x3a2a20, 0.6); kg.material.depthWrite = true; put(root, kg, -12.03, 1.625, 14.25, -PI / 2);
    flat(root, 2.6, 0.5, (c, w, h) => { c.fillStyle = '#f2ead8'; c.fillRect(0, 0, w, h); text(c, '老将', w * 0.3, h / 2, h * 0.6, '#c8302a', { fam: CJK, w: 900 }); text(c, 'BAKERY', w * 0.72, h / 2, h * 0.42, '#2a2a30', { fam: DISP }); }, -12.15, 3.0, 14.25, -PI / 2);
    spot('bakery:queue', -11.2, 14.0, -PI / 2, 'phone');
    // the red archway into the square: 陶瓷市集, the porcelain market
    const Pf = piece(0.125, -12, -6, 0.03), px0 = -11.6;
    for (const [pz, h] of [[-6.0, 4.6], [-3.4, 6.0], [1.4, 6.0], [4.0, 4.6]]) { Pf.box(px0 - 0.25, 0, pz - 0.25, px0 + 0.25, h, pz + 0.25, 0xd8302a); Pf.box(px0 - 0.4, 0, pz - 0.4, px0 + 0.4, 0.5, pz + 0.4, 0xc8c0b0); solid(px0 - 0.42, pz - 0.42, px0 + 0.42, pz + 0.42); }
    Pf.box(px0 - 0.3, 5.0, -3.6, px0 + 0.3, 5.5, 1.6, 0xd8302a); Pf.box(px0 - 0.25, 4.4, -3.6, px0 + 0.25, 4.6, 1.6, 0x2a8a8a); Pf.box(px0 - 0.3, 3.8, -6.2, px0 + 0.3, 4.2, -3.4, 0xd8302a); Pf.box(px0 - 0.3, 3.8, 1.4, px0 + 0.3, 4.2, 4.2, 0xd8302a);
    roof(Pf, px0 - 0.6, -3.9, px0 + 0.6, 1.9, 6.0, { n: 3 }); roof(Pf, px0 - 0.5, -6.4, px0 + 0.5, -3.2, 4.6, { n: 2 }); roof(Pf, px0 - 0.5, 1.2, px0 + 0.5, 4.4, 4.6, { n: 2 });
    Pf.mesh(root);
    for (const [d, ry] of [[-0.32, -PI / 2], [0.32, PI / 2]]) flat(root, 2.6, 0.75, (c, w, h) => { c.fillStyle = '#3a3a6a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8b060'; c.lineWidth = h * 0.08; c.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.88); text(c, '陶瓷市集', w / 2, h / 2, h * 0.56, '#f2d080', { fam: CJK, w: 900 }); }, px0 + d, 5.25, -1.0, ry);
    // the square: a banyan in a round bed, benches, the wooden dummies by the temple gate, lamps
    const Rb = piece(0.125, 0, -1, 0.03); Rb.cyl(0, -1, 2.4, 0, 0.5, (x, y, z) => Math.hypot(x + 0.06, z + 0.06 + 1) > 2.15 ? 0xc8c0b0 : 0x5a4030); Rb.mesh(root); solid(-2.4, -3.4, 2.4, 1.4);
    tree(root, 0, -1, 4.2, 3.4, { roots: true, trunk: 0.6 });
    slab(root, -4.6, -2.0, -4.1, 0.0); slab(root, 4.1, -2.0, 4.6, 0.0); slab(root, -1.0, 2.6, 1.0, 3.1);
    spot('plaza:bench1', -4.35, -1.5, -PI / 2, 'sit', { seat: 0.5 }); spot('plaza:bench2', -4.35, -0.5, -PI / 2, 'sit', { seat: 0.5 }); spot('plaza:bench3', 4.35, -1.0, PI / 2, 'sit', { seat: 0.5 }); spot('plaza:bench4', 0.0, 2.85, PI, 'sit', { seat: 0.5 });
    const Dm = piece(0.0625, 4, 9, 0.03);
    for (const [dx, dz] of [[4.2, 9.6], [6.0, 11.0], [3.4, 12.2]]) { Dm.cyl(dx, dz, 0.2, 0, 1.75, 0x8a5a32); Dm.cyl(dx, dz, 0.25, 0, 0.12, 0x6a4026); for (const [ay, ad] of [[1.35, 1], [1.05, -1], [0.6, 1]]) Dm.box(dx - 0.04, ay, dz, dx + 0.04, ay + 0.08, dz + ad * 0.45, 0x6a4026); solid(dx - 0.3, dz - 0.3, dx + 0.3, dz + 0.3); spot('dummy:spar' + dx, dx - 0.65, dz + 0.1, PI / 2, 'chat'); }
    Dm.mesh(root);
    aframe(root, 2.4, 9.2, 0.4, (c, w, h) => { c.fillStyle = '#f2ead8'; c.fillRect(0, 0, w, h); text(c, '木人桩', w / 2, h * 0.2, h * 0.14, '#c8302a', { fam: CJK, w: 900 }); c.fillStyle = '#8a5a32'; c.fillRect(w * 0.45, h * 0.35, w * 0.1, h * 0.4); c.fillRect(w * 0.3, h * 0.45, w * 0.4, h * 0.05); text(c, 'Blow off steam!', w / 2, h * 0.88, h * 0.07, '#2a2a30', { w: 800 }); }, 0x6a4026);
    for (const [lx, lz] of [[-9.5, -6.6], [6.5, -6.6], [-9.5, 4.0], [6.6, 5.2], [-2.0, 15.6], [6.0, 15.6]]) globeLamp(root, lx, lz);
    for (const [bx, bz] of [[-10.6, 4.6], [6.6, -2.0], [-3.4, 15.8]]) bin(root, bx, bz, 0x2a6a4a);
    for (const [i, x] of [-1.5, 2.5, 5.5].entries()) spot('view:rail' + i, x, 16.5, 0, 'look');
  }

  /* -------------------------------------------- east: Suibian Temple -- */
  function temple(root) {
    const W = piece(0.25, 8, -9, 0.03), wall = (x, y) => y >= 2.75 ? 0x4a5858 : (y < 0.5 ? 0x8a8478 : 0xb8503a);
    W.box(8, 0, -9, 9, 3.0, -5, wall); W.box(8, 0, -5, 8.5, 3.0, -1.5, wall); W.box(8, 0, 2.5, 8.5, 3.0, 14.5, wall); W.box(8, 0, 14.5, 27.5, 3.0, 15, wall); W.box(27.5, 0, -9, 28, 3.0, 15, wall);
    // the gate: red pillars, a roof, its plaque
    for (const pz of [-1.5, 2.25]) W.box(7.75, 0, pz, 8.75, 4.25, pz + 0.25, 0xd8302a);
    W.box(7.75, 3.75, -1.5, 8.75, 4.25, 2.5, 0xd8302a); roof(W, 7.5, -2.0, 9.0, 3.0, 4.25, { n: 4 });
    // the side hall (Threshold Simulation), facing the court
    W.box(9, 0, -9, 21, 4.0, -5.5, (x, y, z) => z >= -5.75 && y < 3.25 && y > 0.25 ? ((Math.floor(x / 1.5) & 1) && y < 2.75 ? 0x8a4a2a : 0xd8302a) : 0xc8b8a0);
    roof(W, 9, -9, 21, -5.5, 4.0, { n: 5 });
    // the main hall: red pillars before lattice doors, steps, a sweeping roof
    W.box(22.5, 0, -5, 27.5, 0.5, 13, 0xa8a49a); W.box(22, 0, -1, 22.5, 0.25, 7, 0xa8a49a);
    W.box(23.5, 0.5, -4.5, 27.5, 6.0, 12.5, (x, y, z) => x < 23.75 && y < 4.5 ? ((Math.abs(((z + 4.5) % 0.5) - 0.25) < 0.07 || Math.abs((y % 0.5) - 0.25) < 0.07) ? 0x6a3a22 : 0x9a5a32) : 0xc8b8a0);
    for (let pz = -4.5; pz <= 12.5; pz += 2.125) W.box(22.75, 0.5, pz - 0.25, 23.25, 6.0, pz + 0.25, 0xd8302a);
    W.box(22.5, 5.5, -4.75, 23.5, 6.0, 12.75, 0x2a8a8a);
    roof(W, 22.5, -4.75, 27.5, 12.75, 6.0, { n: 7, col: 0x4a6a62, col2: 0x3e5a54 });
    W.mesh(root);
    solid(8, -9, 9, -5); solid(8, -5, 8.6, -1.4); solid(8, 2.4, 8.6, 14.5); solid(8, 14.4, 28, 15); solid(27.4, -9, 28, 15); solid(9, -9, 21, -5.4); solid(23.4, -5, 28, 13); solid(22.4, -5, 23.4, -0.9); solid(22.4, 6.9, 23.4, 13);
    for (const pz of [-1.5, 2.25]) solid(7.7, pz - 0.05, 8.8, pz + 0.3);
    tall(9, -9, 21, -5.5, 6); tall(22.5, -5, 28, 13, 8);
    for (const [d, ry] of [[-0.06, -PI / 2]]) flat(root, 2.6, 0.7, (c, w, h) => { c.fillStyle = '#1c1c22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8b060'; c.lineWidth = h * 0.08; c.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.88); text(c, '随便观', w / 2, h / 2, h * 0.6, '#f2d080', { fam: CJK, w: 900 }); }, 7.75 + d, 4.6, 0.5, ry);
    flat(root, 3.2, 0.8, (c, w, h) => { c.fillStyle = '#1c1c22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8b060'; c.lineWidth = h * 0.08; c.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h * 0.88); text(c, '云岿', w / 2, h / 2, h * 0.6, '#f2d080', { fam: CJK, w: 900 }); }, 22.45, 5.0, 4.0, -PI / 2);
    flat(root, 3.0, 0.6, (c, w, h) => { c.fillStyle = '#d8302a'; c.fillRect(0, 0, w, h); text(c, 'THRESHOLD SIMULATION', w / 2, h / 2, h * 0.36, '#f2ead8', { w: 800 }); }, 15, 3.4, -5.45, 0);
    // the court: the skyletter tree, the incense burner, lanterns, stone stools
    tree(root, 15, 3, 3.6, 3.0, { wishes: true, trunk: 0.5 });
    const Ct = piece(0.0625, 18, 3, 0.03);
    Ct.cyl(18.6, 3, 0.55, 0, 0.3, 0x5a4a32); Ct.cyl(18.6, 3, 0.5, 0.3, 0.95, 0x8a6a3a); Ct.cyl(18.6, 3, 0.58, 0.95, 1.05, 0x6a5030); for (const s of [-1, 1]) Ct.box(18.6 + s * 0.5, 0.95, 2.95, 18.6 + s * 0.62, 1.25, 3.05, 0x6a5030);
    for (const [lx, lz] of [[22.9, -2.4], [22.9, 0.4], [22.9, 6.6], [22.9, 9.4]]) lantern(Ct, lx, 4.5, lz);
    for (const [sx, sz] of [[12.6, 8.4], [13.6, 9.6], [17.4, 8.6]]) { Ct.cyl(sx, sz, 0.25, 0, 0.45, 0x9a968c); solid(sx - 0.28, sz - 0.28, sx + 0.28, sz + 0.28); }
    Ct.mesh(root); solid(18.0, 2.4, 19.2, 3.6);
    anim(t => { if (Math.random() < 0.08) FX.p({ x: 18.6 + U.rnd(-0.1, 0.1), y: 1.1, z: 3 + U.rnd(-0.1, 0.1), vx: U.rnd(-0.05, 0.05), vy: U.rnd(0.3, 0.6), life: 2.2, size: 0.08, size1: 0.35, col: 0xb0aca4, glow: false, g: -0.04, drag: 0.4 }); });   // incense smoke
    light(root, 0xffb070, 0.6, 9, 21.5, 3.6, 4.0, 'lamp'); light(root, 0xffb070, 0.45, 7, 8.2, 3.4, 0.5, 'lamp');
    // A-Shuo's divination booth by the south wall
    const Ds = piece(0.125, 12, 12, 0.03);
    for (const [px, pz] of [[12.2, 12.4], [15.6, 12.4]]) Ds.box(px, 0, pz, px + 0.2, 2.6, pz + 0.2, 0xd8302a);
    Ds.box(12.0, 2.6, 12.2, 16.0, 2.85, 14.5, 0x4a5858); Ds.box(12.8, 0, 13.4, 15.2, 0.8, 14.2, 0x6a4026); Ds.box(13.3, 0.8, 13.5, 14.7, 0.86, 14.1, 0xe8a03a);
    Ds.mesh(root); solid(12.7, 13.3, 15.3, 14.5);
    flat(root, 2.4, 0.45, (c, w, h) => { c.fillStyle = '#d8302a'; c.fillRect(0, 0, w, h); text(c, '占卜 · DIVINATION', w / 2, h / 2, h * 0.5, '#f2ead8', { fam: CJK, w: 900 }); }, 14.0, 2.45, 12.3, 0, true);
    spot('temple:ashuo', 14.0, 13.2, PI, 'sit', { post: true }); spot('temple:queue', 14.0, 11.4, PI, 'phone');
    spot('temple:tree1', 13.2, 3.4, PI / 2, 'look'); spot('temple:tree2', 15.4, 5.0, PI, 'look'); spot('temple:tree3', 16.6, 1.8, -PI / 2, 'look');
    spot('temple:sit1', 22.2, 0.6, -PI / 2, 'sit', { seat: 0.5 }); spot('temple:sit2', 22.2, 5.4, -PI / 2, 'sit', { seat: 0.5 }); spot('temple:sit3', 12.6, 8.4, PI / 2, 'sit', { seat: 0.45 });
    spot('temple:incense', 17.7, 3.0, PI / 2, 'look'); spot('temple:sweep', 10.4, 10.2, 0.4, 'look');
  }

  /* ---------------------------------------------------------------- hub -- */
  window.HUBS.failume = {
    id: 'failume', name: 'Failume Heights', region: 'Waifei Peninsula',
    blurb: 'Suibian Temple, Yum Cha Sin, the porcelain market and the cable car: the old town on the mountain by the sea.',
    build(root) { STREET.begin(); ground(root); mountain(root); westRow(root); square(root); temple(root); return STREET.finish({ x0: -20.2, x1: 27.2, z0: -14.6, z1: 16.6 }); },
    spawn: [15, -4.2, 0], arrive: [4.5, -6.4, 0],
    cam: 'free', yaw0: 0, music: 'street', inMusic: 'shop',
    travel: { label: 'Travel', sub: 'Cable car · Failume Heights Station', x: 4.5, z: -6.9, sx: 4.5, sy: 4.4, sz: -7.4, r: 1.7 },
    stations: {
      hdd: { label: 'Hollow Deep Dive', sub: 'HDD system · Suibian Temple', x: 21.6, z: 3.0, sx: 22.6, sy: 3.6, sz: 3.0, r: 1.6 },
      lab: { label: 'Threshold Simulation', sub: 'Combat trials · Battle Lab', x: 15, z: -4.6, sx: 15, sy: 3.0, sz: -5.4, r: 1.6 },
    },
    // the Agents who live here: Yunkui Summit's, at their temple
    agents: {
      yixuan: ['temple:sit 50, temple:tree 30, plaza:bench 20', 'temple:tree 30, plaza:bench 30, temple:sit 40', 'temple:sit 60, yum:seat 20, temple:tree 20', 'temple:sit 70, view:rail 30'],
      jufufu: ['dummy:spar 40, yum:seat 40, huddle 20', 'yum:seat 50, dummy:spar 25, huddle 25', 'yum:seat 45, plaza:bench 25, huddle 30', 'yum:seat 60, temple:tree 40'],
      yeshunguang: ['view:rail 40, temple:tree 30, huddle 30', 'cable:look 30, temple:incense 30, huddle 40', 'view:rail 40, plaza:bench 30, huddle 30', 'view:rail 60, temple:sit 40'],
    },
    staff: [
      { id: 'sweety', name: 'Sweety', at: 'yum:sweety', act: 'serve', hours: [0, 1, 2, 3] },
      { id: 'lee', name: 'Lee', at: 'yum:lee', act: 'shopkeep', hours: [0, 1, 2] },
      { id: 'tinmaster', name: 'Tin Master', at: 'cafe:tin', act: 'serve', hours: [0, 1, 2] },
      { id: 'ginger', name: 'Ginger', at: 'buyan:ginger', act: 'shopkeep', hours: [0, 1, 2] },
      { id: 'reed', name: 'Reed', at: 'goods:reed', act: 'shopkeep', hours: [0, 1, 2, 3] },
      { id: 'vince', name: 'Vince', at: 'pawn:vince', act: 'lean', hours: [0, 1, 2, 3] },
      { id: 'ashuo', name: 'A-Shuo', at: 'temple:ashuo', act: 'dog', hours: [0, 1, 2, 3] },
    ],
    regulars: [
      { id: 'disciple1', model: 'disciple', name: 'Disciple', slots: { 0: 'dummy:spar 100', 1: 'dummy:spar 60, temple:sweep 40', 2: 'temple:sweep 100' } },
      { id: 'disciple2', model: 'disciple', name: 'Disciple', slots: { 0: 'dummy:spar 100', 1: 'temple:tree 100' } },
      { id: 'cableelder', model: 'elder', name: 'Old Resident', slots: { 0: 'cable:bench 100', 1: 'cable:bench 100', 2: 'plaza:bench 100' } },
      { id: 'adwoman', model: 'office_f', name: 'Seasight Real Estate', slots: { 0: 'yum:ad 100' } },
      { id: 'fortune', model: 'student_f', name: 'Visitor', slots: { 0: 'temple:queue 100', 1: 'temple:queue 60, video:window 40', 2: 'bakery:queue 100' } },
    ],
    pets: [
      { id: 'yumcat', model: 'lumcat', name: 'Orange Cat', slots: { 0: 'yum:cat', 1: 'yum:cat', 2: 'yum:cat', 3: 'boo:cat' } },
      { id: 'cockycat', model: 'cookie', name: 'Cocky Cat', slots: { 1: 'boo:cat', 2: 'boo:cat' } },
    ],
    walkers: [['office_m', 'office_f', 'student_f', 'office_m', 'courier'], ['office_f', 'student_m', 'student_f', 'courier', 'office_m'], ['student_m', 'student_f', 'office_f', 'office_m'], ['dude', 'office_m']],
    ends: [[-16, 16.2], [-16, -14.3], [4.5, -6.9], [3.0, 16.2], [-3.0, 8.0]],
    huddles: [[-15.5, -8.6], [-15.0, 8.0], [-6.0, -4.0], [2.6, 6.4], [12.0, 6.0], [-15.6, 2.0]],
    lines: {
      sweety: ['Welcome to Yum Cha Sin! Tea first, gossip second.', 'Everyone in Failume Heights comes through here eventually. Everyone.'],
      lee: ['Hiyah! (Lee strikes a pose, then refills the teapot.)', 'Dim sum is ready. Kung fu is always ready.'],
      ginger: ['Buyan doesn\'t really sell things. We keep their stories.', 'Every antique has a scratch on it somewhere. That\'s the best part.'],
      reed: ['Good Goods has everything! Well, nearly everything.', 'Restocking day. Mind the crates!'],
      vince: ['Devon Pawnshop. Bring me something worth remembering.', 'Got an Omnicoin? Then we can talk treasures.'],
      ashuo: ['Woof. (A-Shuo has looked after the temple for eleven years.)', '(A-Shuo\'s nose twitches. He senses something in the air.)'],
      disciple1: ['Hit the dummy, not your neighbour!', 'Training never ends at Suibian Temple.'], disciple2: ['Every skyletter on that tree is somebody\'s wish.', 'Master says breathe first, then strike.'],
      cableelder: ['The cable car has run since before you were born.', 'Sun\'s out. Retirement is the life.'],
      adwoman: ['Seasight Real Estate! Luxury seaside apartments, coming soon!', 'Wake up to the bay every morning!'],
      fortune: ['They say A-Shuo\'s readings are never wrong.', 'One reading a day. I\'ve used mine already...'],
      yumcat: ['Mrrp. (It waits for its steamed fish.)', '(The orange cat is the real regular here.)'], cockycat: ['Meow~', '(It sits right where the Bangboo want to charge.)'],
    },
  };
})();
