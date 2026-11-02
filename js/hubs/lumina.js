/* ============================================================================
   hubs/lumina.js -- Lumina Square, Janus Quarter: the well-off, busy square of
   New Eridu, laid out from the Zenless Zone Zero Wiki's map of it (its markers
   read as x% / y% of the map), its location and shop pictures and NPC pages.

   North (-z) to south (+z):
     the road; across it, behind a fence of globe lamps, the N.E.P.S. tower
       (Public Security) with its guard booth; the elevated railway passing
     north-west: the 141 (blue, orange stripes, scalloped awning) on the west
       street, JC Pharmacy (white and teal, the green cross) on the spine,
       Officer Mewmew at its door
     the spine: the wide pedestrian way down the west half, and in its plaza
       the twisted ribbon sculpture
     west: the HIA Club (dark corrugated slabs, orange strips, the gold
       geodesic sphere), Sān-Z STUDIO against its wall, Sage in a Barrel, the
       red hourglass LUMINA monument by the Pedestrian Area (where you arrive)
     east: Richard Teamilk on the corner (its teapot mascot), Waterfall Soup
       (锦鲤面馆, Chop Junior's counter) and the metro, Lumina Square Station,
       facing the spine; Gravity Cinema's red neon; the round Lumina Galleria
     south: the riverside: Beaverson, Dew Gardening, Old Duyi's, Simmer and
       Coff Cafe in a row; Eve's newsstand by the railing; the playground
   ========================================================================== */
(function () {
  'use strict';
  const PI = Math.PI, G = VX.glow, H = window.MB;
  const { piece, sign, put, glass, text, poster, hash, solid, spot, light, night, anim, tall, bench, bin, vending, aframe, pot, planter, DISP, CJK } = STREET.KIT;
  const { mass, flat, palm, slab, barriers } = window.HUBS.kit;

  /* ----------------------------------------------------------- townsfolk -- */
  MODELS.chopjr = H.bangboo({ body: 0xd8342c, visor: 0x2a1010, eye: 0xf2f2f0, inner: 0xf2f2f0, foot: 0xd8342c, outfit: (x, y, z) => z >= 2 ? 0xf2f2f0 : 0xd8342c,
    extra: g => { g.box(-4, 12, -3, 4, 13, 3, 0xe8e8e2); g.box(-4, 14, -4, 4, 18, 4, (x, y, z) => x * x + z * z > 20 ? -1 : 0xf8f8f4); } });   // red face, a chef's hat
  MODELS.tinlumina = H.person({ scale: 0.07, skin: 0xb8bcc4, eye: 0x1c1c22, top: 0xe8782a, sleeve: 0x2a2c32, sleeveTo: 8, pants: 0x2a2c32, shoe: 0x3a2a20, glove: 0xf4f4f0, gloveLen: 3,
    head(g) {
      g.box(-4, -1, -4, 4, 7, 4, (x, y, z) => x * x + z * z > 20 ? -1 : (y % 3 === 0 ? 0x9a9ea6 : 0xc8ccd4));                           // a tin can
      g.box(-2, 3, 4, -1, 4, 4, 0x1c1c22); g.box(1, 3, 4, 2, 4, 4, 0x1c1c22);
      g.box(0, 8, 0, 0, 10, 0, 0x6a6e76); g.box(0, 10, 0, 3, 10, 0, 0x6a6e76); g.box(3, 11, 0, 3, 12, 0, 0x8a5a3a);                     // the grinder's crank
    },
    torso(g) { g.box(-3, 0, 2, 3, 5, 2, (x, y) => ((x + y * 3) % 4 === 0 ? 0x6a3a1e : 0xe8782a)); },                                        // coffee beans on orange
    hips(g) { g.box(-3, -5, 2, 3, -1, 2, (x, y) => ((x + y * 3) % 4 === 0 ? 0x6a3a1e : 0xe8782a)); } });
  MODELS.eve = H.person({ scale: 0.066, skin: 0xf6d7c3, eye: 0x3a2a2a, hair: 0xf0f0f0, hair2: 0xd0d0d8, long: 4, top: 0x6a4a32, sleeve: 0x6a4a32, sleeveTo: 8, pants: 0x2a2a30, shoe: 0x3a2a20,
    head(g) { g.box(-3, 2, 4, -1, 3, 4, 0x141416); g.box(1, 2, 4, 3, 3, 4, 0x141416); g.box(-1, 3, 4, 1, 3, 4, 0x141416); g.box(-5, 6, -4, 4, 7, 4, 0x7a2032); g.box(-4, 8, -3, 3, 8, 3, 0x7a2032); },
    torso(g) { g.box(-3, 5, -2, 3, 6, 3, 0x2a9a9a); g.box(1, 1, 3, 2, 5, 3, 0x2a9a9a); } });                                                  // sunglasses, maroon beret, teal scarf
  MODELS.orchidea = H.person({ scale: 0.066, skin: 0xf6dcc8, eye: 0x2a5a5a, hair: 0x1e4a4a, hair2: 0x163838, long: 11, top: 0xb8d8f0, sleeve: 0xb8d8f0, sleeveTo: 8, skirt: 0x1c1c22, skirtLen: 11, legs: 0xf6dcc8, shoe: 0x1c1c22 });
  MODELS.mia = H.person({ scale: 0.064, skin: 0xf8dcc8, eye: 0x4a3a2a, hair: 0x4a3428, hair2: 0x3a281e, long: 6, top: 0xf2f2f0, sleeve: 0xf2f2f0, sleeveTo: 4, skirt: 0x24304a, skirtLen: 5, legs: 0xf8dcc8, shoe: 0x1c1c22,
    torso(g) { g.box(-3, 0, 2, 3, 5, 2, 0x24304a); g.box(-3, 5, 2, -2, 6, 2, 0x24304a); g.box(2, 5, 2, 3, 6, 2, 0x24304a); } });             // the Galleria's navy pinafore
  MODELS.yi = H.person({ scale: 0.068, skin: 0x8a8e96, top: 0x2a2a30, sleeve: 0x2a2a30, sleeveTo: 8, pants: 0x3a3c42, shoe: 0x1c1c22,
    head(g) { g.box(-5, -1, -5, 5, 8, 5, (x, y, z) => (z === 5 && y >= 1 && y <= 4 && Math.abs(x) <= 3) ? (y === 3 && Math.abs(x) === 2 ? G(0x5ae8ff) : 0x1a2a3a)
      : (hash(x * 3 + z, y) > 0.8 ? [0xf2c230, 0xe85a8a, 0x5ab8f0, 0x7acc4a][Math.floor(hash(x, y + z) * 4)] : 0xe8e8e4)); } });             // a helmet covered in stickers
  MODELS.sage = H.person({ scale: 0.066, skin: 0xe0b898, eye: 0x2a2a2a, hair: 0x8a8478, hair2: 0x6a6458, top: 0x6a5a3a, sleeve: 0x6a5a3a, sleeveTo: 6, pants: 0x3a8a8a, shoe: 0x3a8a8a,
    head(g) { g.box(-3, -2, 3, 3, 0, 4, 0x8a8478); },
    hips(g) { g.box(-6, -13, -5, 6, 3, 5, (x, y, z) => (x * x / 36 + z * z / 25 > 1.05) ? -1 : (y === -11 || y === -3 || y === 3 ? 0x2a5a5a : 0x3a8a8a)); } });   // the barrel he lives in
  MODELS.traffie = H.bangboo({ body: 0xf2f2f0, eye: 0x5ae0ff, inner: 0x2a5ab8, foot: 0x2a5ab8, outfit: (x, y) => y > 2 ? 0x2a5ab8 : 0xf2c230,
    extra: g => { g.box(-4, 12, -3, 4, 13, 4, 0x1e3a8a); g.box(-4, 12, 5, 4, 12, 5, 0x141416); } });                                       // a Securityboo, its cap
  MODELS.officerL = H.person({ scale: 0.07, skin: 0xf0d0b8, eye: 0x2a2a2a, hair: 0x2a2220, top: 0x1e2a4a, sleeve: 0x1e2a4a, sleeveTo: 8, pants: 0x1e2a4a, shoe: 0x141416,
    head(g) { g.box(-4, 6, -4, 4, 7, 4, 0x1e2a4a); g.box(-4, 6, 5, 4, 6, 6, 0x141416); g.set(0, 7, 5, G(0xf2c230)); }, torso(g) { g.set(-2, 4, 3, 0xf2c230); } });
  MODELS.lumcat = H.animal({ scale: 0.036, coat: 0xe8a050, coat2: 0xf2e8d8, eye: 0x6ab83a, hip: 6, leg: 4, ear: 2, tail: 7, bw: 4,
    pat: (x, y, z) => Math.abs(z) % 3 === 0 ? 0xc87a30 : (y < -1 ? 0xf2e8d8 : 0xe8a050) });                                                  // a plump ginger

  /* ------------------------------------------------------------ helpers -- */
  /* a shopfront on the riverside row (its face at z = 19): the wall round a big window, the glass, lit at night */
  function front(root, x0, x1, col, o) {
    o = o || {}; const zf = 19, top = o.top || 2.875, P = piece(0.125, x0, zf, 0.04);
    P.box(x0, 0, zf, x1, top + 0.125, zf + 0.125, (x, y) => (y >= 0.375 && y < top - 0.375 && x >= x0 + 0.25 && x < x1 - 0.25) ? -1 : (typeof col === 'function' ? col(x, y) : col));
    if (o.mullions) { for (let x = x0 + 0.75; x < x1 - 0.4; x += 0.5) P.box(x, 0.375, zf + 0.125, x + 0.0625, top - 0.375, zf + 0.1875, o.mullions); for (const y of [1.25, 2.0]) P.box(x0 + 0.25, y, zf + 0.125, x1 - 0.25, y + 0.0625, zf + 0.1875, o.mullions); }
    P.mesh(root);
    const w = x1 - x0 - 0.5, h = top - 0.75, g = glass(w, h, o.glass || 0x2a3442, 0.6); g.material.depthWrite = true; put(root, g, (x0 + x1) / 2, 0.375 + h / 2, zf + 0.03);
    const wl = glass(w - 0.1, h - 0.1, o.warm || 0xffd090, 0.6); put(root, wl, (x0 + x1) / 2, 0.375 + h / 2, zf + 0.04); wl.visible = false; night(wl);
  }
  /* a lamp pole carrying two ART SHOW 文艺撷英 banners (black and cream, a dragon) */
  function artPole(root, x, z) {
    const P = piece(0.0625, x, z, 0.02);
    P.cyl(x, z, 0.09, 0, 5.5, 0x8a8c90); P.box(x - 0.0625, 5.375, z - 0.0625, x + 0.9375, 5.5, z + 0.0625, 0x8a8c90); P.box(x + 0.5625, 5.125, z - 0.1875, x + 1.0, 5.375, z + 0.1875, G(0xfff0c0));
    for (const y of [2.6, 4.2]) P.box(x, y, z - 0.03, x + 0.75, y + 0.0625, z + 0.03, 0x6a6c72);
    P.mesh(root); solid(x - 0.15, z - 0.15, x + 0.15, z + 0.15);
    light(root, 0xffe0b0, 0.55, 9, x + 0.8, 5.0, z, 'lamp');
    const ban = (c, w, h) => {
      c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h); c.fillStyle = '#141416'; c.fillRect(0, 0, w, h * 0.42);
      c.strokeStyle = '#d8402a'; c.lineWidth = w * 0.07; c.beginPath(); c.moveTo(w * 0.2, h * 0.95); c.bezierCurveTo(w * 1.1, h * 0.75, -w * 0.1, h * 0.6, w * 0.8, h * 0.46); c.stroke();
      text(c, 'ART', w / 2, h * 0.1, w * 0.3, '#efe6d2', { fam: DISP }); text(c, 'SHOW', w / 2, h * 0.22, w * 0.3, '#efe6d2', { fam: DISP });
      for (let i = 0; i < 4; i++) text(c, '文艺撷英'[i], w * 0.78, h * (0.56 + i * 0.1), w * 0.18, '#141416', { fam: CJK });
    };
    for (const [d, ry] of [[0.04, 0], [-0.04, PI]]) flat(root, 0.5, 1.5, ban, x + 0.4, 3.4, z + d, ry, true);
  }
  /* ------------------------------------------------------------- ground -- */
  const ROAD = 0x4a4c54;
  function ground(root) {
    const T = piece(0.5, 0, 0, 0.02);
    T.box(-27, -0.5, -40, 27, 0, 26, (x, y, z) => {
      if (z >= -25 && z < -19.5) return -1;                                                             // (the road: below)
      if (z < -25) return ((Math.round(x * 2) + Math.round(z * 2)) & 1) ? 0xc8c4bc : 0xbebab2;           // N.E.P.S.'s forecourt
      if (x >= 1.5 && x < 3.5 && z >= 2 && z < 6) return -1;                                             // the metro's stairwell
      if (x < -12.5 && z >= -12 && z < -5) return (Math.abs(z + 8.5) < 0.3 && ((x + 40) % 3) < 1.5) ? 0xf2f2ee : ROAD;   // the west street
      if (x >= 20 && x < 23 && z >= 8 && z < 11.5) return hash(x, z) > 0.7 ? 0xd8c48a : 0xe8d49a;        // the sandpit
      if (z >= 24) return Math.round(x * 2) % 5 === 0 ? 0x7a5a3e : 0x9a7452;                             // the riverside deck
      if (x >= -14.5 && x < 1 && z >= 13 && z < 19) return Math.round(z * 2) % 3 === 0 ? 0x8e8e8a : 0xa4a4a0;   // the Pedestrian Area's planks
      if (x === -6.5 && z < 13) return 0xe8b830;                                                          // the tactile strip
      const i = Math.round(x * 2), k = Math.round(z * 2);
      return (i % 8 === 0 || k % 8 === 0) ? 0x9a7484 : ((i + k) & 1 ? 0xc9adaa : 0xbda09d);            // pale pink tiles, mauve lines
    });
    T.mesh(root, { cast: false });
    // the road, its kerb, the centre line, the zebra crossing
    const R = piece(0.25, 0, 0, 0.02);
    R.box(-27, -0.25, -25, 27, 0, -19.5, (x, y, z) => {
      if (z >= -19.75) return 0xbcb6ab;
      if (x >= -9 && x < -4 && z >= -24.5 && z < -20) return (Math.floor(x * 2) & 1) ? 0xf0f0ec : ROAD;
      if (z === -22.25 && ((x + 30) % 3) < 1.5) return 0xf2c230;
      return hash(Math.floor(x), Math.floor(z)) > 0.9 ? 0x44464e : ROAD;
    });
    R.mesh(root, { cast: false });
    const base = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), new THREE.MeshLambertMaterial({ color: 0x8a8a88 })); base.rotation.x = -PI / 2; base.position.set(0, -0.55, 0); root.add(base);
    // the river, its quay and the railing
    const water = new THREE.Mesh(new THREE.PlaneGeometry(260, 46), new THREE.MeshLambertMaterial({ color: 0x3a6a88 })); water.rotation.x = -PI / 2; water.position.set(0, -1.1, 49); root.add(water);
    const Q = piece(0.5, 0, 26, 0.03); Q.box(-60, -2, 26, 60, 0, 26.5, (x, y) => y > -0.6 ? 0xa8a49c : 0x7a7872); Q.box(-60, -2, 71, 60, 0.5, 74, 0x8a8a86); Q.mesh(root, { cast: false });
    const F = piece(0.125, 0, 25.5, 0.02);
    F.box(-27, 1.0, 25.5, 24, 1.125, 25.625, 0x4a4c52); F.box(-27, 0.5, 25.5, 24, 0.5625, 25.625, 0x6a6c72);
    for (let x = -26.5; x < 24; x += 1.5) F.box(x, 0, 25.5, x + 0.125, 1.0, 25.625, 0x4a4c52);
    F.box(23.5, 1.0, 7, 23.625, 1.125, 25.625, 0x4a4c52); for (let z = 7; z < 25.5; z += 1.5) F.box(23.5, 0, z, 23.625, 1.0, z + 0.125, 0x4a4c52);   // the playground's fence
    F.mesh(root);
    solid(-30, 25.45, 30, 30);
  }

  /* -------------------------------------------- north: N.E.P.S. and the road -- */
  function neps(root) {
    const x0 = -10, x1 = 6, zf = -29, zb = -38;
    mass(root, x0, zb, x1, zf, 0, 24, (x, y) => { const b = y % 6; return b < 0.5 ? 0x2a5aa8 : b < 1 ? 0xf0f0ec : (Math.floor(y * 2) & 1 ? 0xc8ac88 : 0xb89c78); }, { win: 'sew', wy0: 6 });
    tall(x0, zb, x1, zf, 24);
    const P = piece(0.25, x0, zf, 0.03);
    P.box(-3, 0, zf, 3, 4.5, zf + 0.25, (x, y) => y >= 4 ? 0xf0f0ec : (Math.abs(x) < 0.15 || Math.abs(x - 1.5) < 0.15 || Math.abs(x + 1.5) < 0.15 ? 0xe8e8e4 : 0x3a5068));
    P.box(-4, 4.5, zf, 4, 4.75, zf + 1.75, 0x2a5aa8); P.mesh(root);
    flat(root, 5.2, 1.8, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#1e3a8a'; c.fillRect(0, h * 0.84, w, h * 0.16); text(c, 'N.E.P.S.', w / 2, h * 0.44, h * 0.56, '#1e3a8a', { fam: DISP }); }, -2, 15.6, zf + 0.06, 0, true);
    flat(root, 3.6, 0.5, (c, w, h) => { c.fillStyle = '#1e3a8a'; c.fillRect(0, 0, w, h); text(c, 'NEW ERIDU PUBLIC SECURITY', w / 2, h / 2, h * 0.42, '#fff', { w: 800 }); }, 0, 5.15, zf + 1.78, 0);
    light(root, 0xe0ecff, 0.6, 9, 0, 4.2, zf + 2.5, 'shop');
    // the fence: white pillars with globe lamps, black bars, a gap for the gate and the guard booth beside it
    const F = piece(0.125, 0, -25.5, 0.02);
    for (let x = -27; x < 27; x += 3) {
      if (x > -3 && x < 2) continue;
      F.box(x, 0, -25.5, x + 0.375, 1.75, -25.125, 0xe8e4dc); F.box(x + 0.0625, 1.75, -25.4375, x + 0.3125, 2.25, -25.1875, (X, Y) => Y >= 1.875 ? G(0xfff2d0) : 0xb8b4ac);
      if (x + 3 < 27 && !(x + 3 > -3 && x + 3 < 2)) { for (let b = x + 0.5; b < x + 3; b += 0.25) F.box(b, 0, -25.375, b + 0.0625, 1.5, -25.25, 0x2a2c32); F.box(x + 0.375, 1.375, -25.4375, x + 3, 1.5, -25.1875, 0x2a2c32); }
      if (((x + 27) / 3) % 2 === 0) light(root, 0xfff0d0, 0.4, 6, x + 0.19, 2.2, -24.9, 'lamp');
    }
    F.box(2.25, 0, -27.25, 3.875, 2.5, -25.75, (x, y) => y >= 2.25 ? 0x2a5aa8 : (y > 1.0 && y < 2.0 && x < 3.7 && x > 2.4 ? 0x3a5068 : 0xf0f0ec));   // the booth
    F.box(2.0, 2.5, -27.5, 4.125, 2.625, -25.5, 0x2a5aa8);
    F.mesh(root); solid(-27, -25.6, -2.6, -25.0); solid(2.0, -27.6, 27, -25.0);
    flat(root, 1.2, 0.3, (c, w, h) => { c.fillStyle = '#1e3a8a'; c.fillRect(0, 0, w, h); text(c, 'ON DUTY 执勤中', w / 2, h / 2, h * 0.6, '#fff', { w: 800, fam: CJK }); }, 3.06, 2.4, -25.72, 0);
    // posters on the fence, the Hollow alert board
    for (const [px, k] of [[-20.6, 1], [-14.6, 2], [8.4, 3], [17.4, 4]]) flat(root, 1.0, 1.35, (c, w, h) => { c.fillStyle = '#1e3a8a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f2ee'; c.fillRect(w * 0.08, h * 0.06, w * 0.84, h * 0.6); poster(c, w * 0.84, h * 0.6, k + 20, ['#1e3a8a', '#f2c230', '#3a7ad8', '#f2f2ee']); text(c, 'N.E.P.S.', w / 2, h * 0.76, h * 0.1, '#f2f2ee', { fam: DISP }); text(c, k & 1 ? 'SAFETY FIRST' : 'REPORT HOLLOWS', w / 2, h * 0.88, h * 0.06, '#f2c230', { w: 800 }); }, px, 1.05, -25.08, 0, true);
    const B = piece(0.125, 11, -26, 0.03); for (const bx of [11.25, 15.5]) B.box(bx, 0, -26.25, bx + 0.25, 2.5, -26, 0x5a5c62); B.mesh(root);
    flat(root, 5, 2.4, (c, w, h) => { c.fillStyle = '#141416'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c230'; for (let i = 0; i < 12; i++) c.fillRect(i * w / 12, 0, w / 24, h * 0.08); text(c, 'HOLLOW ALERT', w / 2, h * 0.33, h * 0.22, '#ff4a30', { fam: DISP }); text(c, '空洞预警 · Stay clear of the cordon', w / 2, h * 0.58, h * 0.1, '#f2f2ee', { fam: CJK }); text(c, 'Level: LOW', w / 2, h * 0.8, h * 0.12, '#5be37a', { w: 800 }); }, 13.6, 3.6, -25.98, 0);
    // the elevated railway, and a train (orange and cream) now and then
    const V = piece(0.5, 0, -28, 0.02);
    V.box(-70, 10.5, -28, 70, 11.5, -26, (x, y) => y >= 11 ? 0x8a8c90 : 0x6a6c72);
    for (const px of [-36, -24, -12, 12, 24, 36]) V.box(px - 0.5, 0, -27.5, px + 0.5, 10.5, -26.5, 0x8a8c90);
    V.mesh(root, { cast: false });
    const tr = new THREE.Group(), TP = piece(0.25, 0, 0, 0.02);
    for (let c = 0; c < 3; c++) { const cx = c * 11.5; TP.box(cx, 0, -1.25, cx + 11, 3, 1.25, (x, y) => y < 1.0 ? 0xe8782a : (y >= 1.5 && y < 2.25) ? ((Math.floor((x - cx) / 1.25) % 2) ? 0x2a3442 : 0xf0e6cc) : y >= 2.75 ? 0xc8c0b0 : 0xf0e6cc); }
    TP.mesh(tr); tr.position.set(-200, 11.5, -27.1); root.add(tr);
    anim(t => { const k = (t % 42) / 9; tr.visible = k < 1; tr.position.x = -80 + k * 160; });
    // traffic lights at the crossing, bollards along the kerb
    const L = piece(0.0625, -9.6, -19.2, 0.02);
    for (const [lx, lz, d] of [[-9.6, -19.2, 1], [-3.4, -24.8, -1]]) { L.cyl(lx, lz, 0.07, 0, 3.0, 0x5a5c62); L.box(lx - 0.15, 2.2, lz - 0.12 * d, lx + 0.15, 3.0, lz + 0.12 * d, 0x1c1c22); L.box(lx - 0.08, 2.75, lz + 0.12 * d, lx + 0.08, 2.9, lz + 0.18 * d, G(0xff4030)); L.box(lx - 0.08, 2.3, lz + 0.12 * d, lx + 0.08, 2.45, lz + 0.18 * d, G(0x40e070)); solid(lx - 0.15, lz - 0.15, lx + 0.15, lz + 0.15); }
    for (const bx of [-11.6, -10.4, -2.8, -1.6, -0.4]) { L.cyl(bx, -19.3, 0.12, 0, 0.8, (X, Y) => Math.floor(Y * 6) & 1 ? 0xf2c230 : 0x1c1c22); solid(bx - 0.15, -19.45, bx + 0.15, -19.15); }
    L.mesh(root);
  }

  /* ----------------------------------- north-west: the 141 and JC Pharmacy -- */
  function northWest(root) {
    mass(root, -27, -20, -12, -12, 0, 12, (x, y) => y < 4.5 ? 0xd8d4cc : (Math.floor(y * 2) % 6 === 0 ? 0xb8b0a4 : 0xcac2b6), { win: 'se', wy0: 4.5 });
    tall(-27, -20, -12, -12, 12); solid(-27, -20, -12, -12);
    // the 141: blue with orange stripes, a blue scalloped awning, its glowing sign, the stall out front
    const x0 = -23, x1 = -16.5, zf = -12, P = piece(0.125, x0, zf, 0.04);
    P.box(x0, 0, zf, x1, 4.5, zf + 0.125, (x, y) => y >= 3.75 ? ((y >= 4.25 || y < 3.875) ? 0xf08a2a : 0x2a5ab8) : (x > x0 + 0.375 && x < x1 - 0.375 && y > 0.375 && y < 3.0 && Math.abs(((x - x0) % 1.6) - 0.8) > 0.07) ? -1 : 0x2a5ab8);
    for (let x = x0; x < x1; x += 0.5) { P.box(x, 3.125, zf, x + 0.5, 3.5, zf + 0.75, 0x2a5ab8); P.box(x + 0.0625, 2.9375, zf + 0.625, x + 0.4375, 3.125, zf + 0.75, (X) => Math.abs(X - x - 0.25) < 0.13 ? 0x2a5ab8 : 0xf2f2f0); }   // the scallops
    // the stall: a table of crates, a pegboard; the red chest freezer; the drinks fridge
    P.box(-22.0, 0, -11.2, -19.5, 0.8, -10.5, 0x6a5a4a); for (let i = 0; i < 4; i++) P.box(-21.9 + i * 0.62, 0.8, -11.1, -21.4 + i * 0.62, 1.15, -10.6, [0xf2c230, 0x5ab84a, 0xd8302a, 0x3a9ae0][i]);
    P.box(-22.0, 0.9, -11.875, -19.5, 2.25, -11.75, (x, y) => (Math.floor(x * 8) + Math.floor(y * 8)) % 5 === 0 ? [0xf08a2a, 0x3a9ae0, 0xe85a8a][Math.floor(hash(x, y) * 3)] : 0xc8b48a);
    P.box(-18.75, 0, -11.75, -17.5, 0.875, -11.0, (x, y) => y >= 0.75 ? 0xe8f2ff : 0xd8302a);
    P.box(-16.25, 0, -11.875, -15.375, 1.9375, -11.25, (x, y, z) => z >= -11.375 && y > 0.25 && y < 1.75 ? (Math.floor(y * 4) % 2 ? G(0xeaf3ff) : [0xd8302a, 0x3a9ae0, 0xf0c040, 0x5ab84a][Math.floor(hash(x * 4, y * 4) * 4)]) : 0xf2f2f4);
    P.mesh(root);
    solid(-22.1, -11.95, -19.4, -10.4); solid(-18.85, -11.9, -17.4, -10.9); solid(-16.35, -11.95, -15.3, -11.15);
    const g = glass(x1 - x0 - 0.75, 2.6, 0x2a3442, 0.55); g.material.depthWrite = true; put(root, g, (x0 + x1) / 2, 1.7, zf + 0.03);
    const wl = glass(x1 - x0 - 0.85, 2.5, 0xfff4e0, 0.6); put(root, wl, (x0 + x1) / 2, 1.7, zf + 0.04); wl.visible = false; night(wl);
    flat(root, 3.4, 0.62, (c, w, h) => { c.fillStyle = '#f2f2f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a5ab8'; c.fillRect(w * 0.02, h * 0.08, w * 0.3, h * 0.84); text(c, '141', w * 0.17, h * 0.52, h * 0.7, '#fff', { fam: DISP }); text(c, 'ONE FOUR ONE', w * 0.64, h * 0.5, h * 0.4, '#f08a2a', { fam: DISP }); }, -19.75, 4.05, zf + 0.14, 0);
    flat(root, 0.8, 0.8, (c, w, h) => { c.fillStyle = '#f08a2a'; c.fillRect(0, 0, w, h); text(c, '杂', w / 2, h / 2, h * 0.7, '#fff', { fam: CJK, w: 900 }); }, -17.05, 2.3, zf + 0.16, 0);
    flat(root, 0.7, 0.7, (c, w, h) => { c.fillStyle = '#d8302a'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); text(c, 'OPEN', w / 2, h * 0.36, h * 0.2, '#fff', { fam: DISP }); text(c, '24', w / 2, h * 0.58, h * 0.24, '#f2c230', { fam: DISP }); text(c, 'HOURS', w / 2, h * 0.78, h * 0.13, '#fff', { w: 800 }); }, -22.45, 2.3, zf + 0.16, 0);
    aframe(root, -15.0, -10.9, 0.3, (c, w, h) => { c.fillStyle = '#2a5ab8'; c.fillRect(0, 0, w, h); text(c, '141', w / 2, h * 0.18, h * 0.16, '#fff', { fam: DISP }); c.fillStyle = '#f08a2a'; c.fillRect(w * 0.1, h * 0.34, w * 0.8, h * 0.3); text(c, 'SALE', w / 2, h * 0.49, h * 0.16, '#fff', { fam: DISP }); text(c, 'ice cream · snacks', w / 2, h * 0.78, h * 0.06, '#fff', { w: 700 }); }, 0x2a5ab8);
    light(root, 0xeaf3ff, 0.6, 7, -19.75, 2.8, -10.6, 'shop');
    spot('141:buy', -21.4, -11.55, 0, 'shopkeep', { post: true }); spot('141:ask', -20.7, -11.55, 0, 'shopkeep', { post: true }); spot('141:change', -20.0, -11.55, 0, 'shopkeep', { post: true });
    spot('141:stall', -20.75, -9.85, PI, 'browse'); spot('141:freezer', -18.1, -10.35, PI, 'browse'); spot('141:fridge', -15.8, -10.6, PI, 'vend');
    // JC Pharmacy (杰氏药房), on the spine: white and teal, a big JC, the green cross
    const J = piece(0.125, -12, -19.5, 0.04);
    J.box(-12, 0, -19.5, -11.875, 4.5, -13, (x, y, z) => y >= 3.5 ? (y >= 4.375 ? 0x2aa08a : 0xf4f4f0) : (z > -19.0 && z < -13.5 && y > 0.375 && y < 3.125 && Math.abs(((z + 19) % 1.5) - 0.75) > 0.07) ? -1 : (Math.floor((z + 20) * 2) % 4 === 0 ? 0x2aa08a : 0xf4f4f0));
    J.mesh(root);
    const jg = glass(5.5, 2.75, 0x2a3a3a, 0.5); jg.material.depthWrite = true; put(root, jg, -11.97, 1.75, -16.25, PI / 2);
    const jl = glass(5.4, 2.65, 0xe8fff4, 0.6); put(root, jl, -11.96, 1.75, -16.25, PI / 2); jl.visible = false; night(jl);
    flat(root, 3.2, 0.8, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.fillStyle = '#2aa08a'; c.fillRect(w * 0.04, h * 0.1, w * 0.28, h * 0.8); text(c, 'JC', w * 0.18, h * 0.52, h * 0.66, '#fff', { fam: DISP }); text(c, '杰氏药房', w * 0.64, h * 0.4, h * 0.36, '#1e6a5a', { fam: CJK, w: 900 }); text(c, 'JC PHARMACY', w * 0.64, h * 0.78, h * 0.16, '#1e6a5a', { w: 800 }); }, -11.84, 3.95, -16.25, PI / 2);
    const cross = (c, w, h) => { c.fillStyle = '#2ad070'; c.fillRect(w * 0.34, h * 0.08, w * 0.32, h * 0.84); c.fillRect(w * 0.08, h * 0.34, w * 0.84, h * 0.32); };
    flat(root, 0.8, 0.8, cross, -11.82, 3.0, -13.45, PI / 2); flat(root, 0.8, 0.8, cross, -11.82, 3.0, -19.05, PI / 2);
    light(root, 0xd8fff0, 0.5, 6, -11.0, 2.2, -16.25, 'shop');
    spot('jc:mewmew', -10.7, -16.1, PI / 2, 'mascot', { post: true }); spot('jc:window1', -10.9, -18.0, -PI / 2, 'look'); spot('jc:window2', -10.9, -14.2, -PI / 2, 'look');
    barriers(root, -23.1, -11.8, -23.1, -5.2);
  }

  /* ------------------------------ west: the HIA Club, Sān-Z, the monument -- */
  function west(root) {
    const x0 = -27, x1 = -14.5, z0 = -5, z1 = 12.5;
    mass(root, x0, z0, x1, z1, 0, 9, (x, y, z, f) => {
      const u = f === 'e' || f === 'w' ? z : x, k = (((u * 0.55 + y) % 3.2) + 3.2) % 3.2;
      if (f === 'e' && k < 0.5) return G(0xf08a2a);                                   // orange strips across the tilted slabs
      return (Math.floor(u * 2) & 1) ? 0x2a2c32 : 0x363942;                           // corrugated, dark
    }, { win: '', roof: 0x24262c });
    tall(x0, z0, x1, z1, 9); solid(x0, z0, x1, z1);
    const D = piece(0.125, x1, 1, 0.03);
    D.box(x1, 0, 1.25, x1 + 0.125, 3.375, 4.75, (x, y, z) => (y >= 3.0 || z < 1.5 || z >= 4.5 || Math.abs(z - 3) < 0.07) ? 0xf08a2a : -1); D.mesh(root);
    const dg = glass(3.0, 3.0, 0x2a2a30, 0.6); dg.material.depthWrite = true; put(root, dg, x1 + 0.03, 1.5, 3.0, PI / 2);
    const dl = glass(2.9, 2.9, 0xffc890, 0.55); put(root, dl, x1 + 0.04, 1.5, 3.0, PI / 2); dl.visible = false; night(dl);
    light(root, 0xffb060, 0.7, 8, x1 + 1.2, 3.0, 3.0, 'neon');
    // the gold geodesic sphere, its HIA band
    const cx = -20.5, cy = 12.6, cz = 3.75, R = 4.2, S = piece(0.25, -25, -1, 0.02);
    S.box(cx - R, cy - R, cz - R, cx + R, cy + R, cz + R, (x, y, z) => {
      const dx = x + 0.125 - cx, dy = y + 0.125 - cy, dz = z + 0.125 - cz, d = Math.hypot(dx, dy, dz);
      if (d > R || d < R - 0.45) return -1;
      if (Math.abs(dy) < 0.4) return 0x1c1c22;
      const e = Math.asin(dy / d), fe = Math.floor(e * 4), fa = Math.floor(Math.atan2(dz, dx) * 3.2 + (fe & 1) * 0.5);
      return ((fa + fe) & 1) ? 0xd8a838 : 0xbc8a28;
    });
    S.mesh(root); tall(cx - R, cz - R, cx + R, cz + R, cy + R);
    for (const [ax, az, ry] of [[cx + R + 0.02, cz, PI / 2], [cx, cz - R - 0.02, PI]]) flat(root, 2.6, 0.62, (c, w, h) => { text(c, 'HIA', w / 2, h / 2, h * 0.8, '#f2c230', { fam: DISP }); }, ax, cy, az, ry);
    flat(root, 3.4, 0.7, (c, w, h) => { text(c, 'HIA CLUB', w / 2, h / 2, h * 0.7, '#f08a2a', { fam: DISP }); }, x1 + 0.06, 3.9, 3.0, PI / 2);
    spot('hia:door', -13.1, 5.3, -PI / 2, 'phone');
    // Sān-Z STUDIO: a white corrugated container against the Club's wall, its black marquee, the orange truss and Z flags
    const zx0 = -14.5, zx1 = -12.75, Z = piece(0.125, zx0, 8.5, 0.03);
    Z.box(zx0, 0, 8.5, zx1, 3.25, 12.5, (x, y, z) => {
      if (x < zx1 - 0.125 && z >= 8.625 && z < 12.375 && y < 3.125) return -1;
      if (x >= zx1 - 0.125 && z > 9.75 && z < 11.75 && y < 2.75) return (Math.floor(y * 4) & 1) ? 0x8a8c90 : 0x9a9ca0;            // the roll-up door
      return (Math.floor(z * 4) & 1) ? 0xf2f2ee : 0xdcdcd6;
    });
    Z.box(zx1, 3.25, 8.5, zx1 + 0.25, 4.0, 12.5, 0x141416);
    for (const tz of [8.5, 12.375]) Z.box(-13.75, 3.25, tz, -13.625, 4.75, tz + 0.125, 0xf08a2a);
    Z.box(-13.75, 4.625, 8.5, -13.625, 4.75, 12.5, 0xf08a2a); for (let tz = 8.75; tz < 12.4; tz += 0.5) Z.box(-13.75, 3.25 + ((tz * 2) % 2 ? 0 : 0.6), tz, -13.625, 3.875 + ((tz * 2) % 2 ? 0 : 0.6), tz + 0.125, 0xf08a2a);
    Z.mesh(root); solid(zx0, 8.5, zx1 + 0.3, 12.5);
    flat(root, 3.8, 0.66, (c, w, h) => { text(c, 'ΞZ STUDIO', w / 2, h / 2, h * 0.72, '#e8d8b0', { fam: DISP }); }, zx1 + 0.27, 3.62, 10.5, PI / 2);
    for (const fz of [9.0, 10.0, 11.0, 12.0]) flat(root, 0.42, 0.55, (c, w, h) => { c.fillStyle = '#141416'; c.fillRect(0, 0, w, h); text(c, 'Z', w / 2, h / 2, h * 0.7, '#e8d8b0', { fam: DISP }); }, -13.55, 4.3, fz, PI / 2, true);
    flat(root, 0.8, 1.2, (c, w, h) => { const n = 8; for (let i = 0; i < n; i++) for (let j = 0; j < 12; j++) { c.fillStyle = hash(i, j) > 0.55 ? '#f08a2a' : hash(j, i) > 0.5 ? '#141416' : '#f2e8d8'; c.fillRect(i * w / n, j * h / 12, w / n + 1, h / 12 + 1); } }, zx1 + 0.02, 1.6, 9.15, PI / 2, true);
    aframe(root, -12.2, 12.1, PI / 2, (c, w, h) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8302a'; c.lineWidth = w * 0.08; c.beginPath(); c.arc(w / 2, h * 0.38, w * 0.3, 0, PI * 2); c.moveTo(w * 0.29, h * 0.24); c.lineTo(w * 0.71, h * 0.52); c.stroke(); text(c, '禁止停车', w / 2, h * 0.75, h * 0.1, '#141416', { fam: CJK, w: 900 }); text(c, 'NO PARKING', w / 2, h * 0.88, h * 0.07, '#141416', { w: 800 }); }, 0x3a3c42);
    light(root, 0xffe8c0, 0.5, 6, -12.0, 3.0, 10.5, 'shop');
    spot('sanz:yi', -12.3, 10.75, PI / 2, 'shopkeep', { post: true });
    spot('hia:sage', -13.95, 6.6, PI / 2, 'chat', { post: true });
    // the LUMINA monument: a red hourglass column, its lettered disc, a red ring on top
    const mx = -11.2, mz = 14.6, M = piece(0.0625, mx, mz, 0.02);
    M.cyl(mx, mz, 0.62, 0, 0.25, 0x8a8a86);
    for (let y = 0.25; y < 3.6; y += 0.125) M.cyl(mx, mz, 0.17 + 0.3 * Math.abs(y - 1.9) / 1.65, y, y + 0.125, 0xd8302a);
    M.discZ(mx, 4.3, 0.75, mz - 0.0625, mz + 0.0625, d => d > 0.66 ? 0xb8241e : 0xf2f2f0);
    M.discZ(mx, 5.42, 0.44, mz - 0.0625, mz + 0.0625, d => d < 0.27 ? -1 : 0xd8302a);
    M.mesh(root); solid(mx - 0.62, mz - 0.62, mx + 0.62, mz + 0.62);
    for (const [d, ry] of [[0.08, 0], [-0.08, PI]]) flat(root, 1.2, 0.4, (c, w, h) => text(c, 'LUMINA', w / 2, h / 2, h * 0.7, '#b8241e', { fam: DISP }), mx, 4.3, mz + d, ry);
    spot('mon:look', -11.2, 15.9, PI, 'look');
    barriers(root, -23.1, 12.8, -23.1, 18.8);
    mass(root, -27, 19, -18, 26.5, 0, 3.5, 0xb8b4ac, { win: '', s: 0.5 });     // the ticket hall at the river's end (closed)
    solid(-27, 19, -18, 26.5);
  }

  /* --------------------------------------------- the plaza: the sculpture -- */
  function plaza(root) {
    const cx = -6.5, cz = -2.5, P = piece(0.0625, cx, cz, 0.02);
    P.cyl(cx, cz, 1.7, 0, 0.5, (x, y, z) => Math.hypot(x + 0.06 - cx, z + 0.06 - cz) > 1.45 ? 0x9a968e : 0xbcb8b0);
    // a ribbon of metal twisting up round the axis (bronze below, silver above)
    for (let y = 0.5; y < 8; y += 0.0625) {
      const a = y * 0.62, ox = cx + Math.cos(a) * 0.75, oz = cz + Math.sin(a) * 0.75, t = (y - 0.5) / 7.5, col = t > 0.6 ? 0xd0d4da : t > 0.3 ? 0xc4b48e : 0xb0905e, b = a + PI / 2 + y * 0.3;
      for (let u = -0.42; u <= 0.42; u += 0.08) { const x = ox + Math.cos(b) * u, z = oz + Math.sin(b) * u; P.box(x - 0.0625, y, z - 0.0625, x + 0.0625, y + 0.0625, z + 0.0625, col); }
    }
    P.mesh(root); solid(cx - 1.7, cz - 1.7, cx + 1.7, cz + 1.7);
    light(root, 0xfff0d8, 0.5, 8, cx, 1.0, cz + 2.4, 'lamp');
    slab(root, -9.75, -3.6, -9.25, -1.4); slab(root, -3.75, -3.6, -3.25, -1.4); slab(root, -7.6, 0.6, -5.4, 1.1);
    spot('sculpt:bench1', -9.5, -3.0, PI / 2, 'sit', { seat: 0.5 }); spot('sculpt:bench2', -9.5, -2.0, PI / 2, 'sit', { seat: 0.5 });
    spot('sculpt:bench3', -3.5, -3.0, -PI / 2, 'sit', { seat: 0.5 }); spot('sculpt:bench4', -3.5, -2.0, -PI / 2, 'sit', { seat: 0.5 }); spot('sculpt:bench5', -6.5, 0.85, PI, 'sit', { seat: 0.5 });
    for (const [x, z] of [[-9.6, -14.2], [-2.6, -14.2], [-10.6, 6.4], [-2.4, 7.4], [-16.0, 22.2], [12.2, 23.6], [8.5, -7.9], [18.0, -7.9]]) palm(root, x, z, 4.6 + hash(x, z) * 1.4);
    for (const [x, z] of [[-11.2, -10.5], [-1.0, -18.4], [-13.2, -1.0], [-13.2, 7.4], [0.0, 10.0], [-3.0, 18.6], [-13.0, 24.6], [1.0, 24.6], [14.2, 24.6], [21.0, 24.6], [22.6, -8.6]]) artPole(root, x, z);
    for (const [x, z] of [[-11.4, -8.6], [-0.6, -5.8], [6.6, -5.6], [-0.6, 12.2], [-14.0, 18.6], [10.6, 20.4], [19.6, 20.6]]) bin(root, x, z, 0x2a8a8a);
    // the Lumina Street signpost by the Pedestrian Area
    const S = piece(0.0625, -3.6, 13.6, 0.02); S.cyl(-3.6, 13.6, 0.08, 0, 3.2, 0x5a5c62); S.box(-3.6, 2.3, 13.55, -2.6, 2.55, 13.65, 0xf2f2ee); S.box(-4.6, 1.9, 13.55, -3.6, 2.15, 13.65, 0xf2f2ee); S.mesh(root); solid(-3.75, 13.45, -3.45, 13.75);
    const disc = (c, w, h) => { c.fillStyle = '#1e5a8a'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); c.strokeStyle = '#f2f2ee'; c.lineWidth = w * 0.04; c.stroke(); text(c, '光映街', w / 2, h * 0.42, h * 0.22, '#fff', { fam: CJK, w: 900 }); text(c, 'Lumina Street', w / 2, h * 0.66, h * 0.1, '#fff', { w: 800 }); };
    for (const [d, ry] of [[0.07, 0], [-0.07, PI]]) flat(root, 0.8, 0.8, disc, -3.6, 3.45, 13.6 + d, ry);
    flat(root, 1.1, 0.25, (c, w, h) => { text(c, 'PEDESTRIAN AREA 步行区 ▸', w / 2, h / 2, h * 0.5, '#1e3a5a', { w: 800, fam: CJK }); }, -3.1, 2.42, 13.68, 0);
    flat(root, 1.1, 0.25, (c, w, h) => { text(c, '◂ HIA CLUB', w / 2, h / 2, h * 0.55, '#1e3a5a', { w: 800 }); }, -4.1, 2.02, 13.68, 0);
  }

  /* ------------------- east: Richard Teamilk, Waterfall Soup, the metro -- */
  function east(root) {
    mass(root, 0, -20, 27, -9, 0, 14, (x, y) => y < 4.5 ? 0x6a6e78 : (Math.floor(y * 2) % 6 === 0 ? 0x8a8e98 : 0x9ea2ac), { win: 'sw', wy0: 4.5 });
    tall(0, -20, 27, -9, 14); solid(0, -20, 27, -9);
    flat(root, 8, 3.4, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a3a8a'); gr.addColorStop(1, '#8a3ab8'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) c.fillRect(w * (0.55 + i * 0.07), h * (0.2 + (i % 3) * 0.2), w * 0.05, h * 0.5); text(c, 'SREC', w * 0.28, h * 0.42, h * 0.36, '#fff', { fam: DISP }); text(c, 'Building the city of tomorrow', w * 0.28, h * 0.68, h * 0.07, '#e8e0ff', { w: 700 }); }, 16, 9.6, -8.94, 0);
    // Richard Teamilk: orange brick tiles under a charcoal header, its neon, the teapot mascot, a porthole door, a serving window, three teal stools
    const rx0 = 0.5, rx1 = 6.5, zf = -9, R = piece(0.125, rx0, zf, 0.04);
    R.box(rx0, 0, zf, rx1, 4.5, zf + 0.125, (x, y) => {
      if (y >= 3.5) return 0x2a2a2e;
      if (x >= 1.0 && x < 2.0 && y < 2.5) return (Math.hypot(x + 0.06 - 1.5, y + 0.06 - 1.85) < 0.2) ? 0xbfe0ff : 0x8a5a32;
      if (x >= 3.0 && x < 5.75 && y >= 1.0 && y < 2.25) return -1;
      return ((Math.floor(y * 4) + (Math.floor(x * 2) & 1)) & 1) ? 0xd8783a : 0xc86a30;
    });
    R.box(3.0, 0.9375, zf, 5.75, 1.0625, zf + 0.5, 0xc8a070);
    for (const sx of [3.5, 4.4, 5.3]) { R.cyl(sx, -8.25, 0.06, 0, 0.6, 0x3a3c42); R.cyl(sx, -8.25, 0.2, 0.55, 0.65, 0x2aa0a0); solid(sx - 0.22, -8.47, sx + 0.22, -8.03); }
    R.mesh(root);
    const tw = glass(2.75, 1.25, 0x3a2418, 0.95); tw.material.depthWrite = true; put(root, tw, 4.375, 1.625, zf + 0.01);
    const tl = glass(2.6, 1.1, 0xffc890, 0.6); put(root, tl, 4.375, 1.625, zf + 0.02); tl.visible = false; night(tl);
    flat(root, 5.6, 0.9, (c, w, h) => { text(c, 'Richard', w * 0.28, h * 0.52, h * 0.62, '#f08a2a', { fam: '"Segoe Script", "Brush Script MT", cursive', w: 700 }); text(c, '理查茶奶', w * 0.74, h * 0.5, h * 0.5, '#ffffff', { fam: CJK, w: 900, stroke: 'rgba(255,240,220,.35)', lw: h * 0.08 }); }, 3.5, 4.0, zf + 0.15, 0);
    flat(root, 1.0, 0.5, (c, w, h) => { c.fillStyle = '#f8f2e6'; c.fillRect(0, 0, w, h); text(c, 'QUALITY', w / 2, h * 0.34, h * 0.28, '#6a3a1e', { fam: DISP }); text(c, 'TEA', w / 2, h * 0.7, h * 0.32, '#d8783a', { fam: DISP }); }, 6.0, 2.9, zf + 0.15, 0);
    const T = piece(0.0625, 3.5, -9.4, 0.03), tx = 3.5, ty = 5.05, tz = -9.4;
    T.box(tx - 0.6, ty - 0.6, tz - 0.6, tx + 0.6, ty + 0.6, tz + 0.6, (x, y, z) => { const d = Math.hypot(x + 0.03 - tx, (y + 0.03 - ty) * 1.2, z + 0.03 - tz); return d > 0.55 || d < 0.38 ? -1 : (Math.abs(y - ty + 0.1) < 0.07 ? 0xd8783a : 0xf2ead8); });
    T.box(tx + 0.45, ty - 0.1, tz - 0.08, tx + 0.8, ty + 0.05, tz + 0.08, 0xf2ead8); T.box(tx + 0.7, ty, tz - 0.08, tx + 0.85, ty + 0.25, tz + 0.08, 0xf2ead8);
    T.box(tx - 0.8, ty - 0.2, tz - 0.06, tx - 0.5, ty + 0.25, tz + 0.06, 0xd8783a);
    for (let k = 0; k < 5; k++) T.cyl(tx, tz, 0.36 - k * 0.07, ty + 0.38 + k * 0.1, ty + 0.48 + k * 0.1, 0xfaf6ee);
    T.box(tx - 0.22, ty + 0.02, tz + 0.46, tx - 0.1, ty + 0.14, tz + 0.56, 0x2a1a12); T.box(tx + 0.1, ty + 0.02, tz + 0.46, tx + 0.22, ty + 0.14, tz + 0.56, 0x2a1a12);
    T.mesh(root);
    light(root, 0xffc890, 0.55, 6, 3.5, 2.6, -8.0, 'shop');
    for (let i = 0; i < 3; i++) spot('tea:stool' + i, 3.5 + i * 0.9, -8.25, PI, 'drink', { seat: 0.65 });
    // the east arm: benches against the wall, the vending machine by Waterfall Soup, the barrier at its end
    bench(root, 10.2, -8.5, 1, 1.75); bench(root, 14.6, -8.5, 1, 1.75);
    spot('arm:bench1', 10.7, -8.7, 0, 'sit', { seat: 0.5 }); spot('arm:bench2', 15.4, -8.7, 0, 'sit', { seat: 0.5 });
    vending(root, 4.0, -5.85, -1, 0xd8302a, 0xf2f2f0); spot('lum:vend', 4.55, -6.6, 0, 'vend');
    barriers(root, 23.4, -8.8, 23.4, -5.2); barriers(root, 23.4, -24.3, 23.4, -19.7); barriers(root, -23.1, -24.3, -23.1, -19.7);
    // the block behind: low, its roof with billboards
    mass(root, 3.5, -5, 27, 6.5, 0, 5.5, (x, y) => y >= 5 ? 0x8a8a90 : (Math.floor(y * 2) % 4 === 0 ? 0xb8b0a6 : 0xc8c0b6), { win: 'n', wy0: 0, floor: 5.5, wh: 2.25, step: 3, ww: 2.2 });
    solid(1, -5, 27, 6.5); tall(3.5, -5, 27, 6.5, 5.5);
    const BB = piece(0.25, 6, 0, 0.02); BB.box(8.0, 5.5, -1.5, 8.25, 6.5, -1.25, 0x5a5c62); BB.box(8.0, 5.5, 2.25, 8.25, 6.5, 2.5, 0x5a5c62); BB.mesh(root);
    flat(root, 6, 3.2, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2c8a0'); gr.addColorStop(1, '#e8786a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f2ee'; c.fillRect(w * 0.06, h * 0.3, w * 0.36, h * 0.6); c.fillStyle = '#8ab8d8'; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) c.fillRect(w * (0.09 + i * 0.08), h * (0.34 + j * 0.1), w * 0.05, h * 0.06); text(c, 'LUMINA RESIDENCES', w * 0.7, h * 0.36, h * 0.11, '#fff', { fam: DISP }); text(c, '光映公寓', w * 0.7, h * 0.56, h * 0.15, '#fff', { fam: CJK, w: 900 }); text(c, 'Riverside living, now leasing', w * 0.7, h * 0.76, h * 0.06, '#fff', { w: 700 }); }, 8.0, 8.1, 0.5, -PI / 2);
    // Waterfall Soup (锦鲤面馆): an open counter under a red wave valance and a dark wood eave, lanterns, five red stools on green stems
    const W = piece(0.125, 1, -5, 0.04);
    W.box(0.75, 0, -4.75, 3.5, 3.0, -4.5, 0x3a2418); W.box(0.75, 0, 0.5, 3.5, 3.0, 0.75, 0x3a2418);
    W.box(0.75, 0, -4.5, 1.25, 0.9375, 0.5, (x, y) => y >= 0.8125 ? 0xc8a070 : 0x6a4026);
    W.box(3.375, 0, -4.5, 3.5, 3.0, 0.5, 0x7a1e1a);
    W.box(0.5, 3.0, -4.75, 3.5, 3.375, 0.75, 0x2a1a12); W.box(0.5, 3.375, -4.75, 0.625, 4.25, 0.75, 0x2a1a12);
    W.box(0.5, 2.5, -4.75, 0.625, 3.0, 0.75, (x, y, z) => (y - 2.5) > Math.abs(((((z + 8) * 2) % 1) + 1) % 1 - 0.5) * 0.6 + 0.1 ? 0xd8302a : 0xf2f2f0);
    for (const lz of [-3.6, -2.0, -0.4]) { W.box(0.75, 2.45, lz - 0.03, 0.81, 2.5, lz + 0.03, 0x2a1a12); W.cyl(0.78, lz, 0.17, 2.0, 2.45, G(0xf0902a)); }
    for (const kz of [-4.5, 0.375]) W.box(2.0, 2.0, kz, 2.5, 2.375, kz + 0.125, 0xf08a2a);
    for (let i = 0; i < 5; i++) { const sz = -3.7 + i * 0.85; W.cyl(0.25, sz, 0.07, 0, 0.75, 0x2a8a4a); W.cyl(0.25, sz, 0.22, 0.6875, 0.8125, 0xd8302a); W.cyl(0.25, sz, 0.14, 0, 0.0625, 0x2a8a4a); solid(0.02, sz - 0.24, 0.48, sz + 0.24); spot('soup:stool' + i, 0.25, sz, PI / 2, 'eat', { seat: 0.8125, zone: 'soup' }); }
    W.mesh(root); solid(0.7, -4.8, 3.5, 0.8);
    flat(root, 4.6, 0.75, (c, w, h) => { c.fillStyle = '#2a1a12'; c.fillRect(0, 0, w, h); text(c, '锦鲤面馆', w * 0.5, h * 0.52, h * 0.66, '#f2c060', { fam: CJK, w: 900 }); }, 0.48, 3.8, -2.0, -PI / 2);
    flat(root, 1.3, 1.6, (c, w, h) => { c.fillStyle = '#b8241e'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2f0ea'; c.beginPath(); c.arc(w / 2, h * 0.42, w * 0.3, 0, PI * 2); c.fill(); text(c, '面', w / 2, h * 0.43, w * 0.4, '#141416', { fam: CJK, w: 900 }); }, 3.36, 1.9, -2.0, -PI / 2, true);
    for (const mz of [-3.7, -0.3]) flat(root, 0.8, 0.6, (c, w, h) => { c.fillStyle = '#f2e8d0'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a3a1e'; for (let i = 0; i < 5; i++) c.fillRect(w * 0.1, h * (0.15 + i * 0.16), w * (0.5 + hash(mz, i) * 0.3), h * 0.06); }, 3.36, 2.35, mz, -PI / 2, true);
    light(root, 0xffc080, 0.7, 6, 1.4, 2.6, -2.0, 'shop');
    spot('soup:chop', 2.1, -2.0, -PI / 2, 'cook', { post: true });
    // the metro: Lumina Square Station, exit E: a canopy, stairs going down
    const Mt = piece(0.125, 0, 1, 0.04);
    Mt.box(0.75, 0, 0.75, 3.5, 3.25, 1.5, 0x6a7280);
    for (const z of [1.5, 6.25]) Mt.box(1, 0, z, 3.5, 3.25, z + 0.25, (x, y) => (y > 2.4 && y < 2.75) || (y > 0.5 && y < 0.75) ? 0xe8b830 : 0x6a7280);
    Mt.box(0.5, 3.25, 1.25, 3.5, 3.5, 6.75, 0x55606a); Mt.box(0.75, 3.5, 1.5, 3.5, 3.625, 6.5, 0x9ac0d8);
    for (let i = 0; i < 8; i++) Mt.box(1.5 + i * 0.25, -0.25 - i * 0.3, 2, 1.75 + i * 0.25, -i * 0.3, 6, 0x7a808a);
    Mt.box(1.5, -2.75, 1.75, 3.625, 0, 2, 0x3a3e46); Mt.box(1.5, -2.75, 6, 3.625, 0, 6.25, 0x3a3e46); Mt.box(3.5, -2.75, 2, 3.625, 0, 6, 0x1c1e24);
    for (const z of [2.6, 5.4]) { Mt.box(1.25, 0, z, 1.375, 1.0, z + 0.125, 0xb8bcc4); Mt.box(1.25, 0.875, z, 3.5, 1.0, z + 0.125, 0xb8bcc4); }
    Mt.mesh(root);
    flat(root, 4.6, 0.95, (c, w, h) => { c.fillStyle = '#1e2a4a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c230'; c.fillRect(w * 0.86, h * 0.12, h * 0.76, h * 0.76); text(c, 'E', w * 0.86 + h * 0.38, h * 0.52, h * 0.6, '#141416', { fam: DISP }); text(c, '光映广场站', w * 0.42, h * 0.36, h * 0.36, '#fff', { fam: CJK, w: 900 }); text(c, 'LUMINA SQUARE STATION', w * 0.42, h * 0.76, h * 0.2, '#cfe0ff', { w: 800 }); }, 0.62, 4.1, 4.0, -PI / 2);
    light(root, 0xe0f0ff, 0.6, 7, 0.6, 3.0, 4.0, 'shop');
    spot('metro:in', 0.9, 4.0, PI / 2, 'metro', { exit: true }); spot('metro:wait', -0.7, 1.4, 0.3, 'phone'); spot('metro:wait2', -0.7, 6.8, -0.4, 'stand');
  }

  /* ------------------------------- south-east: Gravity Cinema, the Galleria -- */
  function galleria(root) {
    const cx = 10, cz = 11.5, R = 4.5, Hh = 15, P = piece(0.25, cx, cz, 0.02);
    P.box(cx - R, 0, cz - R, cx + R, Hh, cz + R, (x, y, z) => {
      const dx = x + 0.125 - cx, dz = z + 0.125 - cz, d = Math.hypot(dx, dz);
      if (d > R) return -1;
      if (y >= Hh - 0.25) return 0x8a8a90;
      if (d < R - 0.5) return -1;
      const a = Math.atan2(dz, dx), sec = Math.floor((a + PI) / (PI / 12));
      if (Math.abs(Math.abs(a) - PI) < 0.25 && y < 3) return (y >= 2.75 || Math.abs(Math.abs(a) - PI) > 0.2) ? 0xd8b060 : 0x3a4658;   // the doors
      if (y >= 12.75 && y < 13.25) return sec & 1 ? G(0x7ab8ff) : 0x2a2c34;                                                             // the ring of screens
      if (y < 0.5) return 0x8a8478;
      return ((sec + Math.floor(y / 1.5)) & 1) ? 0xf2efe8 : (y % 4.5 < 0.25 ? 0xd8b060 : 0xdad2c2);                                    // faceted zig-zag panels
    });
    P.mesh(root); tall(cx - R, cz - R, cx + R, cz + R, Hh); solid(cx - R + 0.3, cz - R + 0.3, cx + R, cz + R);
    // the big curved screen facing the plaza (north-west)
    const ad = (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#2a1a5a'); gr.addColorStop(0.5, '#d84a8a'); gr.addColorStop(1, '#f2c230'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(w * 0.72, h * 0.45, h * 0.32, 0, PI * 2); c.fill(); text(c, 'LUMINA GALLERIA', w * 0.34, h * 0.4, h * 0.13, '#fff', { fam: DISP }); text(c, 'New season · 新品上市', w * 0.34, h * 0.6, h * 0.08, '#fff', { fam: CJK, w: 800 }); };
    const n = 5;
    for (let i = 0; i < n; i++) { const a = -2.85 + i * 0.25 + 0.125, rr = R + 0.06; flat(root, 1.16, 4.6, (c, w, h) => { c.save(); c.translate(-(n - 1 - i) * w, 0); ad(c, w * n, h); c.restore(); }, cx + Math.cos(a) * rr, 8.4, cz + Math.sin(a) * rr, Math.atan2(Math.cos(a), Math.sin(a))); }
    for (const a of [0, PI / 2, PI, -PI / 2]) flat(root, 3.2, 0.9, (c, w, h) => text(c, '光映广场', w / 2, h / 2, h * 0.72, '#f2c230', { fam: CJK, w: 900 }), cx + Math.cos(a) * (R + 0.08), 14.1, cz + Math.sin(a) * (R + 0.08), Math.atan2(Math.cos(a), Math.sin(a)));
    flat(root, 3.2, 0.8, (c, w, h) => text(c, 'LUMINA', w / 2, h / 2, h * 0.8, '#e8f4ff', { fam: DISP, stroke: 'rgba(120,190,255,.6)', lw: h * 0.1 }), cx - R - 0.06, 4.3, cz, -PI / 2);
    flat(root, 1.8, 0.4, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); text(c, 'GALLERIA', w / 2, h / 2, h * 0.72, '#141416', { fam: DISP }); }, cx - R - 0.1, 3.35, cz, -PI / 2);
    light(root, 0xfff0d8, 0.7, 9, cx - R - 1.2, 3.5, cz, 'shop');
    spot('gal:mia', 4.9, 10.1, -PI / 2, 'serve', { post: true }); spot('gal:door1', 4.4, 8.2, 0.9, 'look'); spot('gal:door2', 2.0, 7.9, PI, 'phone');
    // the back of the mall
    mass(root, 14.5, 6.5, 19.5, 16.5, 0, 8, (x, y) => (Math.floor(y * 2) % 5 === 0 ? 0xc8c0b0 : 0xdad2c2), { win: 'e', wy0: 2 });
    tall(14.5, 6.5, 19.5, 16.5, 8); solid(14.5, 6.5, 19.5, 16.5); solid(5.5, 6.5, 14.5, 7.3);
    // Gravity Cinema: dark red, posters, the box office, the tall red neon
    mass(root, 1, 12, 5.5, 16.5, 0, 6, (x, y) => y >= 5.25 ? 0x1c1c22 : (Math.floor(x * 4 + y * 4) % 7 === 0 ? 0x2e1a20 : 0x3a2228), { win: '', s: 0.25 });
    solid(1, 12, 5.5, 16.5);
    for (let i = 0; i < 3; i++) flat(root, 0.9, 1.3, (c, w, h) => { poster(c, w, h, 40 + i, ['#141416', '#d8302a', '#3a7ad8', '#f2c230', '#8a5ad8', '#f0f0f0']); text(c, ['GRAVITY', 'NEVER OVERTIME', 'MIDNIGHT'][i], w / 2, h * 0.94, h * 0.06, '#fff', { w: 800 }); }, 2.2 + i * 1.15, 1.75, 11.96, PI, true);
    const bo = glass(1.6, 1.0, 0x2a2a30, 0.7); bo.material.depthWrite = true; put(root, bo, 0.97, 1.6, 14.4, -PI / 2);
    flat(root, 1.6, 0.35, (c, w, h) => { c.fillStyle = '#d8302a'; c.fillRect(0, 0, w, h); text(c, 'TICKETS 售票', w / 2, h / 2, h * 0.6, '#fff', { fam: CJK, w: 900 }); }, 0.96, 2.35, 14.4, -PI / 2);
    const grav = (c, w, h) => { c.fillStyle = '#1c0a0e'; c.fillRect(0, 0, w, h); c.shadowColor = '#ff3040'; c.shadowBlur = w * 0.12; const L = 'GRAVITY'; for (let i = 0; i < L.length; i++) text(c, L[i], w / 2, h * (0.07 + i * 0.085), w * 0.55, '#ff4a5a', { fam: DISP }); for (let i = 0; i < 5; i++) text(c, '引力电影院'[i], w / 2, h * (0.66 + i * 0.07), w * 0.36, '#ffd0d4', { fam: CJK, w: 900 }); };
    flat(root, 0.9, 5.6, grav, 0.94, 3.6, 12.55, -PI / 2); flat(root, 0.9, 5.6, grav, 1.5, 3.6, 11.94, PI);
    light(root, 0xff3040, 0.6, 7, 0.3, 4.0, 12.3, 'neon');
    // the "Never Overtime" standee in the forecourt (a hole for your face)
    const st = (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h * 0.9); c.fillStyle = '#24304a'; c.fillRect(w * 0.22, h * 0.36, w * 0.56, h * 0.54); c.fillStyle = '#f2f2ee'; c.fillRect(w * 0.44, h * 0.36, w * 0.12, h * 0.3); c.clearRect(w * 0.34, h * 0.13, w * 0.32, h * 0.2); text(c, 'NEVER', w / 2, h * 0.05, h * 0.06, '#141416', { fam: DISP }); text(c, 'OVERTIME', w / 2, h * 0.95, h * 0.07, '#d8302a', { fam: DISP }); };
    for (const [d, ry] of [[0.02, 0], [-0.02, PI]]) flat(root, 1.2, 2.0, st, 3.0, 1.0, 9.4 + d, ry, true);
    solid(2.3, 9.2, 3.7, 9.6); spot('cin:poster', 3.2, 11.2, PI, 'look');
  }

  /* --------------------------------------------------- south: the riverside -- */
  function riverside(root) {
    mass(root, 1, 16.5, 15.5, 19, 0, 4.5, (x, y) => y >= 4.25 ? 0x6a6a70 : 0x8a8478, { win: '', s: 0.25 });
    solid(1, 16.5, 19.1, 19);
    // Beaverson Beauty Salon: a dark marquee (pink "Beaverson", mint 彼佛斯), its bulbs, the pink sofa, a barber pole
    front(root, 1, 4.5, 0xf2e2e8);
    const B = piece(0.0625, 1, 19, 0.03);
    B.box(1, 2.875, 19, 4.5, 3.75, 19.375, 0x1c1c22); for (let x = 1.125; x < 4.4; x += 0.25) B.box(x, 2.875, 19.375, x + 0.0625, 2.9375, 19.4375, G(0xfff0c0));
    B.box(1.4, 0, 19.3, 2.9, 0.45, 19.9, 0xf0a0c0); B.box(1.4, 0.45, 19.3, 2.9, 0.9, 19.45, 0xe890b4); B.box(1.4, 0.45, 19.3, 1.55, 0.65, 19.9, 0xe890b4); B.box(2.75, 0.45, 19.3, 2.9, 0.65, 19.9, 0xe890b4);
    B.cyl(4.25, 19.3, 0.11, 1.0, 2.5, (x, y, z) => [0xd8302a, 0xf2f2f0, 0x2a5ab8][((Math.floor(y * 6 + Math.atan2(z - 19.3, x - 4.25) / PI * 1.5) % 3) + 3) % 3]);
    B.mesh(root); solid(1.35, 19.0, 2.95, 19.95); solid(4.1, 19.1, 4.4, 19.45);
    flat(root, 3.3, 0.72, (c, w, h) => { text(c, 'Beaverson', w * 0.4, h * 0.5, h * 0.62, '#f08ab8', { fam: '"Segoe Script", "Brush Script MT", cursive', w: 700 }); text(c, '彼佛斯', w * 0.85, h * 0.52, h * 0.4, '#8ae8c8', { fam: CJK, w: 900 }); }, 2.75, 3.32, 19.39, 0);
    flat(root, 0.7, 0.7, (c, w, h) => { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = w * 0.06; for (const s of [-1, 1]) { c.beginPath(); c.arc(w * (0.5 + s * 0.18), h * 0.72, w * 0.12, 0, PI * 2); c.stroke(); c.beginPath(); c.moveTo(w * (0.5 + s * 0.14), h * 0.62); c.lineTo(w * (0.5 - s * 0.16), h * 0.12); c.stroke(); } }, 3.6, 1.7, 19.06, 0);
    spot('beav:sofa', 2.15, 19.65, 0, 'sit', { seat: 0.45 });
    // Dew Gardening Shop: dark green, a many-paned window, the purple and cream awning, copper letters, pots, a chalkboard
    front(root, 4.5, 8.5, 0x1e4a34, { glass: 0x3a5a48, warm: 0xfff0c8, mullions: 0x163a28 });
    const D = piece(0.0625, 4.5, 19, 0.03);
    for (let k = 0; k < 7; k++) D.box(4.5, 2.875 - k * 0.0625, 19.125 + k * 0.125, 8.5, 2.9375 - k * 0.0625, 19.25 + k * 0.125, (x) => (Math.floor(x * 3) & 1) ? 0x8a5ab8 : 0xf2ead8);
    for (const [px, pz, h] of [[5.0, 19.5, 0.3], [5.4, 19.6, 0.22], [7.6, 19.55, 0.26]]) { D.cyl(px, pz, 0.16, 0, h, 0xc0603a); D.cyl(px, pz, 0.2, h, h + 0.25, 0x3a9a48); }
    D.mesh(root);
    pot(root, 4.85, 19.95, 'monstera'); pot(root, 8.15, 19.45, 'snake', 0xc0603a);
    flat(root, 3.6, 0.62, (c, w, h) => { c.fillStyle = '#1e4a34'; c.fillRect(0, 0, w, h); text(c, 'dew', w * 0.16, h * 0.5, h * 0.66, '#d8904a', { fam: 'Georgia, serif', w: 700 }); text(c, 'GARDENING SHOP', w * 0.62, h * 0.52, h * 0.32, '#c87a3a', { w: 800 }); }, 6.5, 3.55, 19.06, 0);
    flat(root, 0.5, 0.5, (c, w, h) => { c.fillStyle = '#f2ead8'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.47, 0, PI * 2); c.fill(); c.fillStyle = '#2a7a3a'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.12, h * 0.3, 0.5, 0, PI * 2); c.fill(); }, 8.35, 2.3, 19.7, 0, true);
    aframe(root, 7.5, 20.45, 0.25, (c, w, h) => { c.fillStyle = '#1e2a24'; c.fillRect(0, 0, w, h); text(c, 'Fresh today', w / 2, h * 0.2, h * 0.09, '#f2f2ee', { w: 700 }); text(c, '特价', w / 2, h * 0.45, h * 0.2, '#f2c0d8', { fam: CJK, w: 900 }); text(c, 'roses · lilies · ferns', w / 2, h * 0.75, h * 0.06, '#c8e8c8', { w: 700 }); }, 0x3a2a1e);
    spot('dew:orchidea', 6.2, 19.55, 0, 'shopkeep', { post: true }); spot('dew:browse1', 5.2, 20.35, PI, 'browse'); spot('dew:browse2', 7.1, 20.3, PI, 'browse');
    light(root, 0xfff0c8, 0.55, 6, 6.5, 2.4, 20.0, 'shop');
    // Old Duyi's Physiotherapy Studio: an open front (brick, an apothecary counter), a teal-tile awning, the praying mascot on its red and gold cloud
    const O = piece(0.0625, 8.5, 19, 0.03);
    O.box(8.5, 0, 19, 8.75, 2.875, 19.125, 0x9a2a22); O.box(11.25, 0, 19, 11.5, 2.875, 19.125, 0x9a2a22);
    O.box(8.75, 0, 19.0, 11.25, 2.875, 19.0625, (x, y) => STREET.KIT.BRICK(x, y, 0));
    O.box(9.0, 0, 19.0, 11.0, 1.0, 19.5, (x, y) => (Math.abs(((x - 9) % 0.4)) < 0.05 || Math.abs(((y) % 0.33)) < 0.05) ? 0x4a2a1a : 0x8a5a3a);
    for (let k = 0; k < 6; k++) O.box(8.5, 2.875 - k * 0.0625, 19.125 + k * 0.125, 11.5, 2.9375 - k * 0.0625, 19.25 + k * 0.125, (x) => (Math.floor(x * 4) & 1) ? 0x2a8a8a : 0x237a7a);
    const mo = 10, mz = 18.4, my = 4.5;
    O.box(mo - 0.6, my, mz - 0.4, mo + 0.6, my + 1.05, mz + 0.4, (x, y) => (Math.abs(x + 0.03 - mo) > 0.6 - (y - my) * 0.25) ? -1 : 0xe8782a);   // the robe
    O.box(mo - 0.3, my + 1.05, mz - 0.3, mo + 0.3, my + 1.6, mz + 0.3, 0xf0c8a0); O.box(mo - 0.3, my + 1.5, mz - 0.3, mo + 0.3, my + 1.62, mz + 0.3, 0xe8b890);   // the head, bald
    O.box(mo - 0.25, my + 1.15, mz + 0.3, mo + 0.25, my + 1.25, mz + 0.36, 0x1c1c22); O.box(mo - 0.15, my + 1.35, mz + 0.3, mo - 0.05, my + 1.42, mz + 0.34, 0x1c1c22); O.box(mo + 0.05, my + 1.35, mz + 0.3, mo + 0.15, my + 1.42, mz + 0.34, 0x1c1c22);
    O.box(mo - 0.1, my + 0.55, mz + 0.4, mo + 0.1, my + 0.95, mz + 0.55, 0xf0c8a0);   // hands together
    O.mesh(root); solid(8.95, 18.95, 11.05, 19.55);
    flat(root, 3.0, 1.3, (c, w, h) => { c.fillStyle = '#c8302a'; c.strokeStyle = '#f2c230'; c.lineWidth = h * 0.05; c.beginPath(); for (const [bx, by, br] of [[0.2, 0.55, 0.22], [0.42, 0.42, 0.28], [0.64, 0.45, 0.26], [0.84, 0.56, 0.18]]) { c.moveTo(w * bx + h * br, h * by); c.arc(w * bx, h * by, h * br, 0, PI * 2); } c.fill(); c.stroke(); c.fillRect(w * 0.08, h * 0.55, w * 0.84, h * 0.3); text(c, '杜伊', w * 0.5, h * 0.42, h * 0.32, '#f2c230', { fam: CJK, w: 900 }); text(c, 'PHYSIOTHERAPY STUDIO', w * 0.5, h * 0.72, h * 0.11, '#f2c230', { w: 800 }); }, 10, 3.75, 19.2, 0, true);
    spot('duyi:look', 10.0, 20.2, PI, 'look');
    light(root, 0xffd8a0, 0.5, 6, 10.0, 2.4, 19.8, 'shop');
    // Simmer: slate brick and porcelain bowls under red-tiled eaves, copper moon doors, its boards, the waiting bench
    const Sm = piece(0.0625, 11.5, 19, 0.03);
    Sm.box(11.5, 0, 19, 15.5, 3.125, 19.125, (x, y) => {
      if (x >= 12.75 && x < 14.25 && y < 2.5) return Math.hypot(x + 0.03 - 13.5, y + 0.03 - 1.55) < 0.45 ? 0xe8d8b0 : (Math.abs(x - 13.5) < 0.04 ? 0x6a3a1a : 0xb87333);
      const cxw = Math.floor((x - 11.5) / 0.5) * 0.5 + 11.75, cyw = Math.floor(y / 0.5) * 0.5 + 0.25, d = Math.hypot(x + 0.03 - cxw, y + 0.03 - cyw);
      return y > 0.25 ? (d < 0.12 ? 0xf2f2f0 : d < 0.2 ? 0x2a5ab8 : 0x4a5058) : 0x3a3e46;
    });
    for (let k = 0; k < 7; k++) Sm.box(11.375, 3.125 + (6 - k) * 0.0625 + 0.0, 19.0 + k * 0.125, 15.625, 3.25 + (6 - k) * 0.0625, 19.125 + k * 0.125, (x) => (Math.floor(x * 4) & 1) ? 0xb8302a : 0x9a2420);
    for (const px of [11.5, 15.375]) Sm.box(px, 0, 19.0, px + 0.125, 3.125, 19.125, 0x3a2418);
    Sm.mesh(root);
    flat(root, 1.9, 0.5, (c, w, h) => { c.fillStyle = '#b8241e'; c.fillRect(0, 0, w, h); text(c, '煮味炊金', w / 2, h / 2, h * 0.66, '#f2c230', { fam: CJK, w: 900 }); }, 13.5, 3.95, 19.06, 0);
    flat(root, 0.8, 1.1, (c, w, h) => { c.fillStyle = '#f2e8d0'; c.fillRect(0, 0, w, h); text(c, 'THE', w / 2, h * 0.16, h * 0.1, '#b8241e', { fam: DISP }); text(c, 'SIMMER', w / 2, h * 0.32, h * 0.16, '#b8241e', { fam: DISP }); c.fillStyle = '#d8402a'; c.beginPath(); c.arc(w / 2, h * 0.66, w * 0.28, 0, PI); c.fill(); }, 12.15, 1.7, 19.16, 0, true);
    flat(root, 1.5, 0.34, (c, w, h) => { c.fillStyle = '#2a1a12'; c.fillRect(0, 0, w, h); text(c, 'HOT POT RESTAURANT', w / 2, h / 2, h * 0.46, '#f2c230', { w: 800 }); }, 14.85, 2.75, 19.85, 0, true);
    bench(root, 11.55, 20.1, 1, 1.0);
    spot('simmer:bench', 12.05, 19.85, 0, 'sit', { seat: 0.5 }); spot('simmer:queue1', 14.3, 20.5, PI, 'phone'); spot('simmer:queue2', 14.9, 21.0, PI + 0.3, 'stand'); spot('simmer:queue3', 13.7, 21.3, PI - 0.3, 'stand');
    light(root, 0xffb080, 0.55, 6, 13.5, 2.6, 20.0, 'shop');
    // Coff Cafe: a dark wood corner kiosk, COFF CAFE / MADE BY TIN MASTER, a black-and-white awning, the window decal, Tin Master's posters
    const kx0 = 15.5, kx1 = 19, kz0 = 16.5, kz1 = 19, K = piece(0.125, kx0, kz0, 0.03);
    K.box(kx0, 0, kz0, kx1, 3.25, kz1, (x, y, z) => {
      const skin = x >= kx1 - 0.125 || z >= kz1 - 0.125 || z < kz0 + 0.125 || y >= 3.125;
      if (!skin) return y < 0.125 ? 0x5a4a3a : -1;
      if (z >= kz1 - 0.125 && x > 16.0 && x < 18.5 && y >= 1.0 && y < 2.25) return -1;                                 // the serving window
      if (y >= 3.125) return 0x3a2a1e;
      return (Math.floor(x * 4 + z * 4) & 1) ? 0x4a3222 : 0x5a3c28;
    });
    K.box(16.0, 0.9375, kz1, 18.5, 1.0625, kz1 + 0.375, 0xc8a070);
    for (let k = 0; k < 7; k++) K.box(kx0, 3.25 - k * 0.0625, kz1 + k * 0.125, kx1 + 0.125, 3.375 - k * 0.0625, kz1 + 0.125 + k * 0.125, (x) => (Math.floor(x * 3) & 1) ? 0x141416 : 0xf2f2f0);
    K.mesh(root); solid(kx0, kz0, kx1 + 0.1, kz1 + 0.4);
    flat(root, 2.6, 0.62, (c, w, h) => { text(c, 'COFF CAFE', w / 2, h * 0.36, h * 0.44, '#f2f2f0', { fam: DISP }); text(c, 'MADE BY TIN MASTER', w / 2, h * 0.8, h * 0.2, '#f2f2f0', { w: 800 }); }, 17.25, 2.62, kz1 + 0.02, 0);
    flat(root, 1.3, 1.0, (c, w, h) => { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h * 0.56, h * 0.3, 0, PI * 2); c.stroke(); text(c, 'WELCOME', w / 2, h * 0.14, h * 0.13, 'rgba(255,255,255,.9)', { w: 800 }); text(c, 'COFF', w / 2, h * 0.57, h * 0.2, 'rgba(255,255,255,.95)', { fam: DISP }); }, kx1 + 0.02, 1.7, 17.6, PI / 2);
    for (const pz of [16.9, 18.4]) flat(root, 0.55, 0.8, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8ccd4'; c.fillRect(w * 0.3, h * 0.2, w * 0.4, h * 0.36); c.fillStyle = '#1c1c22'; c.fillRect(w * 0.38, h * 0.32, w * 0.07, h * 0.06); c.fillRect(w * 0.55, h * 0.32, w * 0.07, h * 0.06); text(c, 'TIN MASTER', w / 2, h * 0.75, h * 0.09, '#141416', { fam: DISP }); }, kx1 + 0.03, 2.45, pz, PI / 2, true);
    aframe(root, 19.6, 19.8, -0.5, (c, w, h) => { c.fillStyle = '#1e2a2a'; c.fillRect(0, 0, w, h); text(c, 'COFF CAFE', w / 2, h * 0.1, h * 0.09, '#f2f2f0', { fam: DISP }); text(c, 'Coffee of the day', w / 2, h * 0.4, h * 0.07, '#f2f2f0', { w: 700 }); text(c, '☕', w / 2, h * 0.65, h * 0.2, '#f2c230'); }, 0x2a2a30);
    pot(root, 15.85, 19.55, 'snake'); planter(root, 19.2, 16.6, 19.9, 18.6);
    // tables on the promenade
    const Tb = piece(0.0625, 16, 21.6, 0.03);
    for (const [tx, tz] of [[16.0, 21.6], [18.4, 21.9]]) { Tb.cyl(tx, tz, 0.05, 0, 0.7, 0x3a3c42); Tb.cyl(tx, tz, 0.36, 0.7, 0.76, 0xe8e4dc); for (const s of [-1, 1]) { Tb.box(tx + s * 0.55 - 0.18, 0, tz - 0.18, tx + s * 0.55 + 0.18, 0.45, tz + 0.18, 0x2a2a30); Tb.box(tx + s * 0.73 - 0.04, 0.45, tz - 0.18, tx + s * 0.73 + 0.04, 0.85, tz + 0.18, 0x2a2a30); } solid(tx - 0.4, tz - 0.4, tx + 0.4, tz + 0.4); }
    Tb.mesh(root);
    spot('cafe:tin', 17.25, 18.45, 0, 'serve', { post: true });
    spot('cafe:t1', 15.45, 21.6, PI / 2, 'drink', { seat: 0.45 }); spot('cafe:t2', 16.55, 21.6, -PI / 2, 'drink', { seat: 0.45 }); spot('cafe:t3', 17.85, 21.9, PI / 2, 'drink', { seat: 0.45 }); spot('cafe:t4', 18.95, 21.9, -PI / 2, 'drink', { seat: 0.45 });
    light(root, 0xffd8a0, 0.6, 6, 17.25, 2.6, 19.8, 'shop');
    // Eve's newsstand by the railing: grey-green, a curved roof, the green lamp, magazines, the City News
    const nx0 = 2.6, nx1 = 4.6, nz0 = 22.6, nz1 = 24.0, ncx = 3.6, ncz = 23.3, Nw = piece(0.125, nx0, nz0, 0.03);
    Nw.box(nx0, 0, nz0, nx1, 2.25, nz1, (x, y, z) => {
      const edge = x < nx0 + 0.125 || x >= nx1 - 0.125 || z < nz0 + 0.125 || z >= nz1 - 0.125; if (!edge) return y < 0.125 ? 0x4a4a48 : -1;
      if (x < nx0 + 0.125 && y >= 0.95 && y < 2.0 && z > nz0 + 0.2 && z < nz1 - 0.2) return -1;
      if (y >= 0.25 && y < 0.875 && (x < nx0 + 0.125 || z < nz0 + 0.125)) return [0xd8302a, 0xf2c230, 0x3a9ae0, 0xe85a8a, 0xf2f2ee, 0x5ab84a][Math.floor(hash(Math.floor(z * 3) + x, Math.floor(y * 3)) * 6)];
      return 0x6a8a7a;
    });
    for (let x = nx0 - 0.375; x < nx1 + 0.375; x += 0.125) { const y = 2.25 + 0.35 * (1 - ((x + 0.06 - ncx) / 1.4) ** 2); Nw.box(x, y, nz0 - 0.25, x + 0.125, y + 0.125, nz1 + 0.25, 0x5a7a6a); }
    Nw.box(ncx - 0.1, 2.6, ncz - 0.1, ncx + 0.1, 2.85, ncz + 0.1, G(0x5ae87a)); Nw.box(nx0, 0.875, nz0 + 0.2, nx0 + 0.375, 0.95, nz1 - 0.2, 0x5a7a6a);
    Nw.mesh(root); solid(nx0 - 0.1, nz0, nx1, nz1);
    light(root, 0xa0ffc0, 0.45, 6, ncx, 2.9, ncz, 'lamp');
    flat(root, 1.1, 0.36, (c, w, h) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h); text(c, '城市快报', w * 0.32, h * 0.5, h * 0.6, '#141416', { fam: CJK, w: 900 }); text(c, 'CITY NEWS', w * 0.78, h * 0.5, h * 0.36, '#d8302a', { fam: DISP }); }, nx0 - 0.03, 2.08, ncz, -PI / 2);
    spot('news:eve', 3.75, 23.3, -PI / 2, 'shopkeep', { post: true }); spot('news:read', 1.75, 22.85, PI / 2, 'read'); spot('news:read2', 1.75, 23.8, PI / 2, 'read');
    spot('news:cat1', 2.3, 24.75, 0.6, 'nap'); spot('news:cat2', 5.1, 22.25, -0.5, 'sit');
    // the timber pavilion behind it, a bench facing the river
    const Pv = piece(0.125, 5, 23.6, 0.03);
    for (const [px, pz] of [[5.0, 23.6], [8.75, 23.6], [5.0, 25.25], [8.75, 25.25]]) { Pv.box(px, 0, pz, px + 0.25, 2.75, pz + 0.25, 0x8a6648); solid(px - 0.05, pz - 0.05, px + 0.3, pz + 0.3); }
    Pv.box(4.875, 2.75, 23.5, 9.125, 3.0, 25.625, (x) => (Math.floor(x * 2) & 1) ? 0x9a7452 : -1); Pv.box(4.875, 2.75, 23.6, 9.125, 2.875, 23.85, 0x7a5a3e); Pv.box(4.875, 2.75, 25.25, 9.125, 2.875, 25.5, 0x7a5a3e);
    Pv.mesh(root);
    bench(root, 6.0, 25.05, 1, 1.75);
    spot('river:bench1', 6.45, 24.8, 0, 'sit', { seat: 0.5 }); spot('river:bench2', 7.3, 24.8, 0, 'sit', { seat: 0.5 });
    for (const [i, x] of [-15.5, -10.5, -4.5, 11.0, 16.5, 21.5].entries()) spot('river:rail' + i, x, 25.0, 0, 'look');
    // the playground: the sandpit, Belobog barrels, three kiddy rides (one a melting pink ice cream), a bench
    const Pg = piece(0.0625, 20, 8, 0.03);
    Pg.box(19.75, 0, 7.75, 23.25, 0.25, 8.0, 0xb8b4ac); Pg.box(19.75, 0, 11.5, 23.25, 0.25, 11.75, 0xb8b4ac); Pg.box(19.75, 0, 8.0, 20.0, 0.25, 11.5, 0xb8b4ac); Pg.box(23.0, 0, 8.0, 23.25, 0.25, 11.5, 0xb8b4ac);
    Pg.box(21.0, 0.0, 9.0, 21.75, 0.375, 9.75, 0xe86a3a); Pg.box(21.2, 0.375, 9.2, 21.55, 0.5, 9.55, 0xd8302a);   // a bucket and spade
    for (const [bx, bz] of [[22.6, 13.0], [22.9, 13.75], [22.2, 13.45]]) { Pg.cyl(bx, bz, 0.3, 0, 0.9, (x, y) => (y > 0.35 && y < 0.55) ? 0xf2f2f0 : 0xd8302a); solid(bx - 0.32, bz - 0.32, bx + 0.32, bz + 0.32); }
    const ride = (rx, rz, body) => { for (let y = 0; y < 0.45; y += 0.0625) Pg.cyl(rx, rz, (Math.floor(y * 16) & 1) ? 0.12 : 0.08, y, y + 0.0625, 0x6a6c72); Pg.cyl(rx, rz, 0.4, 0, 0.06, 0x4a4c52); body(rx, rz); solid(rx - 0.45, rz - 0.45, rx + 0.45, rz + 0.45); };
    ride(20.6, 14.2, (rx, rz) => { for (let y = 0.45; y < 1.0; y += 0.0625) Pg.cyl(rx, rz, 0.06 + (y - 0.45) * 0.4, y, y + 0.0625, 0xd8a868); Pg.box(rx - 0.35, 1.0, rz - 0.35, rx + 0.35, 1.4, rz + 0.35, (x, y, z) => Math.hypot(x - rx, (y - 1.15) * 1.3, z - rz) > 0.38 ? -1 : 0xf09ac0); for (const [dx, dz] of [[0.3, 0.1], [-0.2, 0.3], [0.05, -0.32]]) Pg.box(rx + dx - 0.06, 0.8, rz + dz - 0.06, rx + dx + 0.06, 1.05, rz + dz + 0.06, 0xf09ac0); Pg.box(rx - 0.15, 1.12, rz + 0.3, rx - 0.08, 1.2, rz + 0.36, 0x1c1c22); Pg.box(rx + 0.08, 1.12, rz + 0.3, rx + 0.15, 1.2, rz + 0.36, 0x1c1c22); });
    ride(21.9, 15.9, (rx, rz) => { Pg.box(rx - 0.25, 0.45, rz - 0.5, rx + 0.25, 0.9, rz + 0.5, 0x5ab84a); Pg.box(rx - 0.2, 0.9, rz + 0.2, rx + 0.2, 1.25, rz + 0.55, 0x5ab84a); Pg.box(rx - 0.12, 1.05, rz + 0.55, rx + 0.12, 1.12, rz + 0.6, 0xf2c230); });
    ride(20.4, 16.9, (rx, rz) => { Pg.box(rx - 0.3, 0.45, rz - 0.3, rx + 0.3, 0.95, rz + 0.3, 0x3a9ae0); Pg.box(rx - 0.2, 0.95, rz - 0.2, rx + 0.2, 1.3, rz + 0.2, 0xf2f2f0); Pg.box(rx - 0.25, 1.3, rz - 0.05, rx - 0.15, 1.55, rz + 0.05, 0xf2f2f0); Pg.box(rx + 0.15, 1.3, rz - 0.05, rx + 0.25, 1.55, rz + 0.05, 0xf2f2f0); });
    Pg.mesh(root);
    bench(root, 20.0, 18.3, -1, 1.75);
    spot('play:bench1', 20.45, 18.55, PI, 'sit', { seat: 0.5 }); spot('play:bench2', 21.3, 18.55, PI, 'sit', { seat: 0.5 }); spot('play:ride', 21.3, 12.6, -0.6, 'look');
    barriers(root, 23.4, 7.2, 23.4, 18.8);
    spot('road:traffie', -3.2, -19.0, PI, 'bangboo', { post: true }); spot('road:cat', -12.2, -19.0, 0.4, 'sit');
    spot('neps:gate', 0.9, -24.0, 0, 'stand'); spot('neps:post', -2.4, -24.1, 0, 'stand'); spot('neps:fence1', -14.6, -24.1, PI, 'look'); spot('neps:fence2', 13.6, -24.2, PI, 'look');
  }

  /* -------------------------------------------- the city past the edges -- */
  function skyline(root) {
    const E = piece(1, 0, 0, 0.05), bld = (x0, z0, w, d, h) => E.box(x0, 0, z0, x0 + w, h, z0 + d, (x, y, z) => (y % 2 === 1 && hash(x * 1.7, y + z * 0.3) > 0.55) ? G(hash(x, z + y) > 0.5 ? 0xffd890 : 0xbfe0ff) : (y >= h - 1 ? 0x4a5060 : 0x6a7080));
    for (let i = 0; i < 8; i++) { bld(-41 - (i % 2) * 4, -44 + i * 9, 10, 8, 14 + Math.floor(hash(i, 1) * 22)); bld(28 + (i % 2) * 4, -44 + i * 9, 10, 8, 12 + Math.floor(hash(i, 2) * 26)); }
    for (let i = 0; i < 9; i++) bld(-44 + i * 10, -60 - Math.floor(hash(i, 3) * 8), 9, 9, 18 + Math.floor(hash(i, 4) * 30));
    for (let i = 0; i < 13; i++) bld(-64 + i * 10, 76 + Math.floor(hash(i, 5) * 6), 9, 8, 10 + Math.floor(hash(i, 6) * 26));
    E.mesh(root, { cast: false });
  }

  /* ---------------------------------------------------------------- hub -- */
  window.HUBS.lumina = {
    id: 'lumina', name: 'Lumina Square', region: 'Janus Quarter',
    blurb: 'The HIA Club, Public Security, the Galleria and Gravity Cinema, and the shops along the river.',
    build(root) { STREET.begin(); ground(root); neps(root); northWest(root); west(root); plaza(root); east(root); galleria(root); riverside(root); skyline(root); return STREET.finish({ x0: -22.8, x1: 23.2, z0: -24.4, z1: 25.3 }); },
    spawn: [-13.1, 3.0, PI / 2], arrive: [-7.5, 16.6, PI],
    cam: 'free', yaw0: 0, music: 'street', inMusic: 'shop',
    travel: { label: 'Travel', sub: 'Lumina Square Station · Metro', x: -0.2, z: 4.0, sx: 0.5, sy: 4.4, sz: 4.0, r: 1.7 },
    stations: { lab: { label: 'HIA Club', sub: 'Combat Simulation · Battle Lab', x: -13.3, z: 3.0, sx: -14.2, sy: 3.9, sz: 3.0, r: 1.6 } },
    // the Agents who live here: the places the wiki's Lumina Square trust events take them
    agents: {
      hugo: ['play:bench 30, jc:window 30, gal:door 20, huddle 20', 'jc:window 35, play:bench 35, huddle 30', 'play:bench 40, gal:door 30, huddle 30', 'river:rail 60, play:bench 40'],
      vivian: ['news:read 30, cafe:t 30, huddle 40', 'neps:fence 30, jc:window 30, huddle 40', 'cafe:t 35, play:bench 30, huddle 35', 'river:rail 70, news:read 30'],
      alice: ['dew:browse 50, sculpt:bench 25, huddle 25', 'dew:browse 45, gal:door 25, huddle 30', 'dew:browse 40, cafe:t 30, huddle 30', 'sculpt:bench 60, river:rail 40'],
      zhuyuan: ['neps:gate 60, cafe:t 20, huddle 20', 'neps:gate 50, duyi:look 25, huddle 25', 'simmer:queue 40, neps:gate 30, huddle 30', 'neps:gate 70, cafe:t 30'],
    },
    staff: [
      { id: 'buy', name: 'Buy', at: '141:buy', act: 'bangboo', hours: [0, 1, 2, 3] },
      { id: 'ask', name: 'Ask', at: '141:ask', act: 'bangboo', hours: [0, 1, 2, 3] },
      { id: 'change', name: 'Give Change', at: '141:change', act: 'bangboo', hours: [0, 1, 2, 3] },
      { id: 'mewmewL', model: 'mewmew', name: 'Officer Mewmew', at: 'jc:mewmew', act: 'mascot', hours: [0, 1, 2] },
      { id: 'chopjr', name: 'Chop Junior', at: 'soup:chop', act: 'bangboo', hours: [0, 1, 2, 3] },
      { id: 'tinlumina', name: 'Tin Master', at: 'cafe:tin', act: 'serve', hours: [0, 1, 2] },
      { id: 'eve', name: 'Eve', at: 'news:eve', act: 'shopkeep', hours: [0, 1, 2] },
      { id: 'orchidea', name: 'Orchidea', at: 'dew:orchidea', act: 'shopkeep', hours: [0, 1, 2] },
      { id: 'yi', name: 'Yi', at: 'sanz:yi', act: 'shopkeep', hours: [0, 1, 2, 3] },
      { id: 'sage', name: 'Sage in a Barrel', at: 'hia:sage', act: 'chat', hours: [0, 1, 2, 3] },
      { id: 'mia', name: 'Mia', at: 'gal:mia', act: 'serve', hours: [0, 1, 2] },
      { id: 'traffie', name: 'Traffie', at: 'road:traffie', act: 'bangboo', hours: [0, 1, 2, 3] },
    ],
    regulars: [
      { id: 'officerL', name: 'Public Security Officer', slots: { 0: 'neps:post 100', 1: 'neps:post 100', 2: 'neps:post 100', 3: 'neps:post 100' } },
      { id: 'shopper', model: 'office_f', name: 'Shopper', slots: { 1: 'gal:door 50, dew:browse 50', 2: 'simmer:queue 100' } },
      { id: 'filmfan', model: 'student_m', name: 'Student', slots: { 1: 'cin:poster 100', 2: 'cin:poster 60, tea:stool 40' } },
      { id: 'date', model: 'student_f', name: 'Student', slots: { 2: 'cin:poster 50, tea:stool 50', 3: 'river:rail 100' } },
    ],
    pets: [
      { id: 'lumcat1', model: 'lumcat', name: 'Plump Cat', slots: { 0: 'news:cat1', 1: 'news:cat2', 2: 'news:cat1', 3: 'news:cat1' } },
      { id: 'lumcat2', model: 'chalky', name: 'White Cat', slots: { 0: 'road:cat', 1: 'road:cat', 2: 'news:cat2', 3: 'news:cat2' } },
    ],
    walkers: [['office_m', 'office_f', 'office_m', 'office_f', 'courier', 'student_f'], ['office_f', 'student_f', 'office_m', 'courier', 'student_m', 'office_f'], ['student_m', 'student_f', 'student_f', 'office_m', 'office_f', 'student_m'], ['dude', 'office_m', 'office_f']],
    ends: [[0.0, 4.0], [-22.4, -22.2], [22.8, -22.2], [-22.4, -8.5], [22.8, -7.0], [-22.4, 15.8], [22.8, 22.0]],
    huddles: [[-7.5, -11.0], [-3.2, 4.0], [9.5, -7.0], [-6.0, 21.5], [9.5, 21.6], [-18.5, 15.8], [-3.0, -22.0]],
    lines: {
      chopjr: ['Ehn-ne! Ehn-na-nu! (Chop Junior waves a ladle at the menu.)', 'Ehn! (It points at the stools. Sit!)'],
      tinlumina: ['Welcome to Coff Cafe. One cup a day, ground to order.', 'The grinder is fresh. So is the cup.'],
      eve: ['Papers, magazines, the City News. And a scratch card, if you\'re feeling lucky.', 'The pigeons hear all the gossip on this square. So do I.'],
      orchidea: ['Welcome to Dew Gardening. Mind the ferns, they\'re shy.', 'Every flower here is picked with someone in mind.'],
      mia: ['Welcome to Lumina Galleria!', 'The screen out front is showing the new season.'],
      yi: ['Sān-Z STUDIO. Display stands, collectibles, inspiration.', 'Every sticker on this helmet is a design I liked.'],
      traffie: ['Bee-boop! Please cross at the stripes!', 'Bee-boop! Traffic status: smooth.'],
      officerL: ['Public Security. Move along, please.', 'Report any Hollow activity to N.E.P.S. right away.'],
      mewmewL: ['What a lively spot... Keep Lumina Square tidy, citizen!', 'Officer Mewmew, Public Security! Medals for model citizens!'],
      shopper: ['The Galleria sale ends today!', 'Two hours to get into Simmer. Two hours!'],
      filmfan: ['What\'s on at Gravity tonight?', 'My allowance goes on Richard Teamilk. All of it.'],
      date: ['The river\'s pretty at night.', 'A film, then tea?'],
      lumcat1: ['Mrrrp.', '(The cat is far too comfortable to move.)'], lumcat2: ['Mew.', '(It watches the traffic lights change.)'],
    },
  };
})();
