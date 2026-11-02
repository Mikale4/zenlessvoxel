/* ============================================================================
   hubs/section6.js -- the Section 6 Office, HAND Headquarters, Throne Quarter:
   the communal office of Hollow Special Operations Section 6, high in the
   HAND tower, from the Zenless Zone Zero Wiki's pictures of it and its
   interactables.

   The look: concrete walls and dark teal panels, long linear ceiling lights,
   two rows of teal-topped desks facing across the aisle, the HAND emblem over
   the back counter between tall blue windows, reel-to-reel computer cabinets,
   the digital Hollow board (ROUTINE SURVEILLANCE, NEW ETHER-ACTIVE AREA)
   covered in handwritten notes, a whiteboard on wheels, the custom sofa.

     the desks: Yanagi's (the file piles), Soukaku's (her handwriting books,
       her drawing on the wall), Miyabi's (the chief's: tic-tac-toe, a scroll),
       Harumasa's (a medical file)
     the way out: the lift, down to HAND Headquarters

   No ceiling: you look in from above, past the lights, over the city.
   ========================================================================== */
(function () {
  'use strict';
  const PI = Math.PI, G = VX.glow;
  const { piece, sign, put, glass, text, poster, hash, solid, spot, light, tall, pot, DISP, CJK } = STREET.KIT;
  const { mass, flat } = window.HUBS.kit;

  const X0 = -10, X1 = 10, Z0 = -7, Z1 = 7, HW = 3.8;
  const CONC = (x, y, z) => (hash(Math.floor(x * 2 + z * 2), Math.floor(y * 2)) > 0.9 ? 0x8e928e : (Math.floor(y / 1.25) % 2 ? 0x9a9e9a : 0x969a96));   // board-marked concrete
  const SLATE = 0x2a3a3e, TEAL = 0x2a8a8a, GOLD = 0xc8a040;

  /* --------------------------------------------- the room: floor, walls -- */
  function room(root) {
    const F = piece(0.5, 0, 0, 0.02);
    F.box(X0 - 0.5, -0.5, Z0 - 0.5, X1 + 0.5, 0, Z1 + 0.5, (x, y, z) => {
      if ((x >= -5.5 && x < -1 || x >= 1 && x < 5.5) && z >= -3.5 && z < 3) return ((Math.floor(x * 2) + Math.floor(z * 2)) & 1) ? 0x4a5a52 : 0x46564e;   // carpet under the desks
      return ((Math.floor(x) + Math.floor(z)) & 1) ? 0x8a8e8c : 0x7e8280;
    });
    F.mesh(root, { cast: false });
    // the tower the office sits in, and the city far below
    const T = piece(2, 0, 0, 0.02); T.box(X0 - 2, -80, Z0 - 2, X1 + 2, -2, Z1 + 2, (x, y) => (y % 4 === 0 && hash(x, y) > 0.5) ? G(0xbfe0ff) : 0x3a4250); T.mesh(root, { cast: false });
    const W = piece(0.25, X0, Z0, 0.03);
    W.box(X0, 0, Z0 - 0.5, X1, HW, Z0, (x, y) => {                                                       // the north wall: blue windows, the emblem's panel
      if ((x >= -6.5 && x < -4.5 || x >= 4.5 && x < 6.5) && y >= 0.75 && y < 3.25) return (Math.abs(((x + 10) % 0.5) - 0.25) < 0.07) ? 0x2a3a4a : -1;
      if (x >= -3 && x < 3 && y < 3.5) return SLATE;
      return y >= HW - 0.25 ? 0x6a6e6a : CONC(x, y, 0);
    });
    W.box(X0 - 0.5, 0, Z0 - 0.5, X0, HW, Z1 + 0.5, (x, y, z) => (z >= 3.5 && z < 5.5 && y < 2.75) ? (Math.abs(z - 4.5) < 0.06 ? 0x3a3e42 : 0x8a9096) : (y >= HW - 0.25 ? 0x6a6e6a : CONC(z, y, x)));   // west, the lift doors
    W.box(X1, 0, Z0 - 0.5, X1 + 0.5, HW, Z1 + 0.5, (x, y, z) => y >= HW - 0.25 ? 0x6a6e6a : CONC(z, y, x));                 // east
    W.box(X0, 0, Z1, X1, 1.0, Z1 + 0.5, (x, y) => y >= 0.875 ? GOLD : SLATE);                                                // south: low, the room cut away for you
    for (const px of [-7.5, -3.5, 3.5, 7.5]) W.box(px - 0.25, 0, Z0, px + 0.25, HW, Z0 + 0.5, 0x3a4a4e);                     // pilasters
    W.mesh(root);
    for (const wx of [-5.5, 5.5]) { const g = glass(2.0, 2.5, 0x9ad8ff, 0.55); put(root, g, wx, 2.0, Z0 - 0.2); const s = glass(0.3, 2.4, 0xe8f6ff, 0.8); s.material.blending = THREE.AdditiveBlending; put(root, s, wx - 0.5, 2.0, Z0 - 0.15); }
    solid(X0 - 3, Z0 - 3, X1 + 3, Z0); solid(X0 - 3, Z0 - 3, X0, Z1 + 3); solid(X1, Z0 - 3, X1 + 3, Z1 + 3); solid(X0 - 3, Z1, X1 + 3, Z1 + 3);
    tall(X0 - 0.5, Z0 - 0.5, X1 + 0.5, Z0, HW); tall(X0 - 0.5, Z0 - 0.5, X0, Z1 + 0.5, HW); tall(X1, Z0 - 0.5, X1 + 0.5, Z1 + 0.5, HW);
    // the HAND emblem over the back counter
    flat(root, 1.8, 2.0, (c, w, h) => { c.strokeStyle = '#c8ccd0'; c.lineWidth = w * 0.05; c.beginPath(); c.arc(w / 2, h * 0.38, w * 0.3, 0, PI * 2); c.stroke(); c.beginPath(); c.ellipse(w / 2, h * 0.38, w * 0.44, w * 0.12, -0.5, 0, PI * 2); c.stroke(); c.fillStyle = '#c8ccd0'; c.beginPath(); c.arc(w / 2, h * 0.38, w * 0.1, 0, PI * 2); c.fill(); text(c, 'H.A.N.D.', w / 2, h * 0.82, h * 0.13, '#c8ccd0', { fam: DISP }); c.fillStyle = GOLD_CSS; c.fillRect(w * 0.3, h * 0.92, w * 0.4, h * 0.02); }, 0, 2.5, Z0 + 0.03, 0);
    const C = piece(0.125, 0, Z0, 0.03);
    C.box(-2.75, 0, Z0 + 0.75, 2.75, 1.125, Z0 + 1.75, (x, y) => y >= 1.0 ? TEAL : (Math.abs(y - 0.8) < 0.04 ? GOLD : SLATE));
    for (let i = 0; i < 5; i++) C.box(-2.4 + i * 1.1, 1.125, Z0 + 1.0, -2.0 + i * 1.1, 1.25 + (i % 2) * 0.12, Z0 + 1.4, i % 2 ? 0xf2f2ee : 0x5ab8a0);
    C.mesh(root); solid(-2.8, Z0 + 0.7, 2.8, Z0 + 1.8);
    // the ceiling lights: long cream bars, floating where the ceiling would be
    const Lt = piece(0.125, 0, 0, 0.02);
    for (const lx of [-3.0, 3.0]) { Lt.box(lx - 0.125, 3.6, Z0 + 0.5, lx + 0.125, 3.7, Z1 - 1.5, (x) => Math.abs(x + 0.06 - lx) < 0.07 ? G(0xfff4d8) : 0xd8ccb0); }
    Lt.mesh(root, { cast: false });
    for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) light(root, 0xfff4e0, 0.7, 10, lx, 3.3, lz, 'shop');
  }
  const GOLD_CSS = '#c8a040';

  /* ------------------------------------------------------------ the desks -- */
  function desks(root) {
    const P = piece(0.0625, 0, 0, 0.03);
    // two curved rows facing across the aisle; each a pair of workstations
    const row = (x0, x1, z0, z1) => { P.box(x0, 0, z0, x1, 0.72, z1, (x, y, z) => y >= 0.66 ? TEAL : (Math.abs(y - 0.5) < 0.03 ? GOLD : SLATE)); solid(x0, z0, x1, z1); };
    row(-3.4, -2.2, -3.0, 2.6); row(2.2, 3.4, -3.0, 2.6);
    for (const z of [-0.2]) { P.box(-3.4, 0.72, z, -2.2, 1.25, z + 0.08, SLATE); P.box(2.2, 0.72, z, 3.4, 1.25, z + 0.08, SLATE); }   // the divider in each row
    const monitor = (x, z, d) => { P.box(x - 0.05, 0.72, z - 0.05, x + 0.05, 0.95, z + 0.05, 0x3a3c42); P.box(x - 0.06, 0.95, z - 0.35, x + 0.06, 1.32, z + 0.35, 0x1c1e22); P.box(d < 0 ? x - 0.125 : x + 0.0625, 1.0, z - 0.3, d < 0 ? x - 0.0625 : x + 0.125, 1.28, z + 0.3, G(0x8ad8e8)); };   // (the screen faces whoever sits there)
    // chairs: dark, on five feet
    const chair = (x, z) => { P.cyl(x, z, 0.3, 0, 0.06, 0x2a2c30); P.cyl(x, z, 0.05, 0.06, 0.42, 0x5a5c62); P.box(x - 0.26, 0.42, z - 0.26, x + 0.26, 0.52, z + 0.26, 0x3a3c42); };
    // Yanagi's: the file piles (and a filing cabinet buried in them)
    monitor(-2.6, -1.6, -1); chair(-4.2, -1.6);
    for (let i = 0; i < 6; i++) { const h = 0.2 + hash(i, 1) * 0.45; P.box(-3.3 + (i % 2) * 0.45, 0.72, -2.9 + Math.floor(i / 2) * 0.42, -2.95 + (i % 2) * 0.45, 0.72 + h, -2.55 + Math.floor(i / 2) * 0.42, (x, y) => Math.floor(y * 16) % 3 ? 0xf2f2ee : 0xe8d8a8); }
    P.box(-5.4, 0, -3.2, -4.8, 1.2, -2.6, 0x6a7478); for (let i = 0; i < 3; i++) P.box(-5.35, 1.2 + i * 0.18, -3.15, -4.85, 1.36 + i * 0.18, -2.65, i & 1 ? 0xe8d8a8 : 0xf2f2ee); solid(-5.45, -3.25, -4.75, -2.55);
    // Soukaku's: handwriting books, snacks, a cabinet
    monitor(-2.6, 1.4, -1); chair(-4.2, 1.4);
    for (let i = 0; i < 5; i++) P.box(-3.3, 0.72 + i * 0.07, 0.4 + (i % 2) * 0.05, -2.9, 0.78 + i * 0.07, 0.75 + (i % 2) * 0.05, [0xe85a8a, 0x3a9ae0, 0xf2c230, 0x5ab84a, 0xf08a2a][i]);
    P.box(-3.3, 0.72, 2.0, -3.0, 0.82, 2.3, 0xc8402a);   // a bun
    P.box(-5.4, 0, 2.0, -4.8, 1.0, 2.6, 0x6a7478); solid(-5.45, 1.95, -4.75, 2.65);
    // Miyabi's, the chief's: a game of tic-tac-toe, a scroll
    monitor(2.6, -1.6, 1); chair(4.2, -1.6);
    P.box(2.3, 0.72, -2.8, 2.8, 0.74, -2.3, 0xf2f2ee); P.box(2.9, 0.72, -2.9, 3.0, 0.8, -2.2, 0xe8dcc0); P.box(2.88, 0.72, -2.95, 3.02, 0.82, -2.88, 0x6a3a22);
    // Harumasa's: the medical file, a mess
    monitor(2.6, 1.4, 1); chair(4.2, 1.4);
    P.box(2.3, 0.72, 0.4, 2.7, 0.76, 0.75, 0xd8e8f0); P.box(2.8, 0.72, 2.0, 3.2, 0.95, 2.4, 0x3a3c42); P.box(2.3, 0.72, 2.0, 2.6, 0.8, 2.2, 0xf2c230);
    // reel-to-reel cabinets along the walls, north end
    // (a cabinet against a side wall, its reels toward the room: dir +1 on the west wall, -1 on the east)
    const reels = (x, z, dir) => { const w = 0.9, fx0 = dir > 0 ? x + 0.6 : x - 0.0625, fx1 = dir > 0 ? x + 0.6625 : x; P.box(x, 0, z, x + 0.6, 2.0, z + w, (X, Y) => Y > 1.85 ? 0x9a9e9a : 0xe8e4d8);
      for (const ry of [1.45, 0.95]) P.discX(z + w / 2, ry, 0.2, fx0, fx1, d => d < 0.06 ? 0xb0b2b8 : 0x2a2a30);
      P.box(fx0, 0.45, z + 0.15, fx1, 0.6, z + 0.75, (X, Y, Z) => (Math.floor(Z * 10) % 3) ? G(0xffb040) : 0x2a2a30); solid(x, z, x + 0.6, z + w); };
    reels(X0, -6.4, 1); reels(X0, -5.4, 1); reels(X1 - 0.6, -6.4, -1); reels(X1 - 0.6, -5.4, -1);
    // the custom sofa against the east wall, a low table, plants
    P.box(8.6, 0, -2.6, 9.9, 0.45, 2.6, 0x3a4a5a); P.box(9.5, 0.45, -2.6, 9.9, 1.05, 2.6, 0x3a4a5a); P.box(8.6, 0.45, -2.6, 9.9, 0.75, -2.3, 0x34444e); P.box(8.6, 0.45, 2.3, 9.9, 0.75, 2.6, 0x34444e);
    for (let i = 0; i < 3; i++) P.box(8.7, 0.45, -2.2 + i * 1.5, 9.45, 0.6, -0.9 + i * 1.5, 0x4a5a6a);
    P.box(7.2, 0, -1.0, 8.0, 0.4, 1.0, (x, y) => y > 0.34 ? 0x8a6a4a : 0x2a2c30); P.box(7.4, 0.4, 0.2, 7.6, 0.5, 0.4, 0xf2f2ee);
    solid(8.55, -2.65, 10, 2.65); solid(7.15, -1.05, 8.05, 1.05);
    // the whiteboard on wheels; the water cooler
    P.box(-7.6, 0, 4.4, -7.5, 1.9, 4.5, 0x5a5c62); P.box(-5.1, 0, 4.4, -5.0, 1.9, 4.5, 0x5a5c62); P.box(-7.7, 0, 4.2, -4.9, 0.06, 4.7, 0x3a3c42); solid(-7.7, 4.2, -4.9, 4.7);
    P.box(7.0, 0, 6.2, 7.5, 1.0, 6.7, 0xd8dce0); P.cyl(7.25, 6.45, 0.18, 1.0, 1.5, 0x9ad0f0); solid(6.95, 6.15, 7.55, 6.75);
    P.mesh(root);
    flat(root, 2.4, 1.6, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a3c42'; c.lineWidth = w * 0.012; c.strokeRect(2, 2, w - 4, h - 4); c.strokeStyle = '#2a5ab8'; c.beginPath(); c.moveTo(w * 0.08, h * 0.7); c.lineTo(w * 0.25, h * 0.4); c.lineTo(w * 0.38, h * 0.55); c.lineTo(w * 0.5, h * 0.25); c.stroke(); for (let i = 0; i < 6; i++) { c.fillStyle = ['#f2c230', '#e85a8a', '#8ad8e8'][i % 3]; c.fillRect(w * (0.58 + (i % 3) * 0.13), h * (0.2 + Math.floor(i / 3) * 0.32), w * 0.1, h * 0.22); } c.strokeStyle = '#c8302a'; c.beginPath(); c.arc(w * 0.3, h * 0.75, h * 0.1, 0, PI * 2); c.stroke(); }, -6.3, 1.45, 4.52, 0, true);
    for (const [x, z] of [[-9.3, -3.6], [9.3, -4.2], [9.3, 4.2], [-9.3, 6.3]]) pot(root, x, z, 'monstera', 0x3a3c42);
    // the digital Hollow board on the west wall: two maps under handwritten notes; a monitor above
    const board = (c, w, h) => { c.fillStyle = '#1c2228'; c.fillRect(0, 0, w, h); for (const [mx, title, col] of [[0.04, 'ROUTINE SURVEILLANCE', '#2a6ab8'], [0.53, 'NEW ETHER-ACTIVE AREA', '#3a8a5a']]) { c.fillStyle = '#4a6a5a'; c.fillRect(w * mx, h * 0.14, w * 0.43, h * 0.8); c.fillStyle = col; c.globalAlpha = 0.7; c.beginPath(); c.arc(w * (mx + 0.2), h * 0.52, h * 0.26, 0, PI * 2); c.fill(); c.globalAlpha = 1; c.fillStyle = '#e8f0e8'; c.fillRect(w * mx, h * 0.04, w * 0.3, h * 0.08); text(c, title, w * (mx + 0.15), h * 0.08, h * 0.045, '#1c2228', { w: 900, align: 'center' }); }
      c.fillStyle = '#d83a2a'; c.beginPath(); c.arc(w * 0.78, h * 0.6, h * 0.12, 0, PI * 2); c.fill();
      for (let i = 0; i < 16; i++) { c.fillStyle = ['#f2e070', '#f2a0c0', '#9ae0a0', '#f2f2ee'][i % 4]; c.fillRect(w * (0.05 + hash(i, 1) * 0.86), h * (0.16 + hash(i, 2) * 0.7), w * 0.05, h * 0.09); } };
    flat(root, 4.6, 2.2, board, X0 + 0.03, 2.0, -1.0, PI / 2);
    flat(root, 1.2, 0.75, (c, w, h) => { c.fillStyle = '#e8ecf0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a5ab8'; c.lineWidth = w * 0.02; c.beginPath(); c.arc(w * 0.7, h * 0.55, h * 0.3, 0, PI * 2); c.stroke(); c.fillStyle = '#2a5ab8'; c.fillRect(w * 0.06, h * 0.2, w * 0.3, h * 0.08); c.fillRect(w * 0.06, h * 0.4, w * 0.24, h * 0.06); }, X0 + 0.04, 3.3, 2.2, PI / 2);
    light(root, 0x8ad8e8, 0.5, 6, X0 + 1.2, 2.0, -1.0, 'shop');
    // Soukaku's drawing by her desk; the training records on the east wall; Section 6's emblem; the lift's sign
    flat(root, 0.8, 0.6, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2a30'; c.lineWidth = w * 0.02; c.beginPath(); c.arc(w * 0.35, h * 0.38, h * 0.14, 0, PI * 2); c.moveTo(w * 0.35, h * 0.52); c.lineTo(w * 0.35, h * 0.85); c.stroke(); c.fillStyle = '#2a2a30'; c.beginPath(); c.moveTo(w * 0.28, h * 0.27); c.lineTo(w * 0.3, h * 0.12); c.lineTo(w * 0.34, h * 0.25); c.fill(); c.strokeStyle = '#d8302a'; c.beginPath(); c.arc(w * 0.35, h * 0.4, h * 0.05, 0.2, PI - 0.2); c.stroke(); c.fillStyle = '#f2a0b0'; c.beginPath(); c.arc(w * 0.68, h * 0.5, h * 0.12, 0, PI * 2); c.fill(); }, X0 + 0.03, 1.6, 3.0, PI / 2, true);
    flat(root, 1.1, 1.4, (c, w, h) => { c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a3a3e'; c.fillRect(0, 0, w, h * 0.14); text(c, 'TRAINING', w / 2, h * 0.07, h * 0.08, '#f2f2ee', { fam: DISP }); for (let i = 0; i < 9; i++) { c.fillStyle = '#9aa0a8'; c.fillRect(w * 0.1, h * (0.22 + i * 0.08), w * (0.4 + hash(i, 5) * 0.45), h * 0.03); } }, X1 - 0.03, 1.7, -4.4, -PI / 2, true);
    flat(root, 1.2, 1.2, (c, w, h) => { c.fillStyle = '#2a3a3e'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); c.strokeStyle = GOLD_CSS; c.lineWidth = w * 0.04; c.stroke(); text(c, '6', w / 2, h * 0.52, h * 0.62, '#e8e4dc', { fam: DISP }); text(c, 'SECTION', w / 2, h * 0.2, h * 0.1, GOLD_CSS, { fam: DISP }); }, X1 - 0.03, 2.4, 0, -PI / 2);
    flat(root, 1.4, 0.4, (c, w, h) => { c.fillStyle = '#2a3a3e'; c.fillRect(0, 0, w, h); text(c, '▼ LIFT · HAND HQ', w / 2, h / 2, h * 0.46, '#e8e4dc', { w: 800 }); }, X0 + 0.04, 3.05, 4.5, PI / 2);
    // the spots
    spot('s6:desk_yanagi', -4.2, -1.6, PI / 2, 'sit', { seat: 0.5 }); spot('s6:desk_soukaku', -4.2, 1.4, PI / 2, 'sit', { seat: 0.5 });
    spot('s6:desk_miyabi', 4.2, -1.6, -PI / 2, 'sit', { seat: 0.5 }); spot('s6:desk_harumasa', 4.2, 1.4, -PI / 2, 'sit', { seat: 0.5 });
    spot('s6:board1', -8.4, -1.6, -PI / 2, 'look'); spot('s6:board2', -8.2, -0.2, -PI / 2, 'read');
    spot('s6:window1', -5.5, -5.6, PI, 'look'); spot('s6:window2', 5.5, -5.6, PI, 'look');
    for (let i = 0; i < 3; i++) spot('s6:sofa' + i, 9.0, -1.8 + i * 1.6, -PI / 2, 'sit', { seat: 0.45 });
    spot('s6:cooler', 6.6, 6.0, PI / 2, 'drink'); spot('s6:white', -6.3, 3.6, 0, 'look'); spot('s6:counter', 0.0, -4.6, PI, 'browse');
  }

  /* ------------------------------------------------- the Throne Quarter -- */
  function city(root) {
    const E = piece(2, 0, 0, 0.05);
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * PI * 2 + hash(i, 1) * 0.1, r = 30 + hash(i, 2) * 40, x = Math.round(Math.cos(a) * r / 2) * 2, z = Math.round(Math.sin(a) * r / 2) * 2, w = 6 + Math.floor(hash(i, 3) * 4) * 2, h = -20 + Math.floor(hash(i, 4) * 30) * 2;
      E.box(x, -80, z, x + w, h, z + w, (X, Y, Z) => (Y % 4 === 2 && hash(X + Z, Y) > 0.45) ? G(hash(X, Z + Y) > 0.5 ? 0xbfe0ff : 0xffe0a8) : (Y >= h - 2 ? 0x2a3040 : (hash(i, 5) > 0.5 ? 0x4a5468 : 0x5a6474)));
    }
    E.mesh(root, { cast: false });
    const base = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x2a3040 })); base.rotation.x = -PI / 2; base.position.y = -80; root.add(base);
  }

  /* ---------------------------------------------------------------- hub -- */
  window.HUBS.section6 = {
    id: 'section6', name: 'Section 6 Office', region: 'Throne Quarter',
    blurb: 'Hollow Special Operations Section 6\'s office, high in HAND Headquarters: four desks, the Hollow board, the famous sofa.',
    build(root) { STREET.begin(); room(root); desks(root); city(root); return STREET.finish({ x0: X0 + 0.4, x1: X1 - 0.4, z0: Z0 + 0.4, z1: Z1 - 0.4 }); },
    spawn: [-8.6, 4.5, PI / 2], arrive: [-8.6, 4.5, PI / 2],
    cam: 'free', yaw0: 0, camDist: 8.8, music: 'hand', inMusic: 'hand',
    travel: { label: 'Travel', sub: 'Lift · down to HAND Headquarters', x: -9.2, z: 4.5, sx: -9.6, sy: 3.0, sz: 4.5, r: 1.5 },
    stations: {},
    // the Agents who live here: Section 6's
    agents: {
      miyabi: ['s6:desk_miyabi 50, s6:window 30, s6:board 20', 's6:board 40, s6:desk_miyabi 40, s6:window 20', 's6:window 50, s6:sofa 20, s6:desk_miyabi 30', 's6:window 50, s6:sofa 50'],
      harumasa: ['s6:sofa 60, s6:desk_harumasa 40', 's6:desk_harumasa 40, s6:sofa 40, s6:cooler 20', 's6:sofa 50, s6:window 30, s6:cooler 20', 's6:sofa 80, s6:desk_harumasa 20'],
    },
    staff: [], pets: [],
    regulars: [
      { id: 'handclerk', model: 'officerL', name: 'HAND Staff', slots: { 0: 's6:counter 100', 1: 's6:white 50, s6:counter 50' } },
    ],
    walkers: [[], [], [], []], ends: [], huddles: [[0.0, 0.4], [6.4, -0.4]],
    lines: {
      handclerk: ['Section 6\'s paperwork, delivered. Again.', 'Is the chief in? These need her signature. All of them.'],
    },
    // what there is to look at (the office's own things; you look, you don't pry)
    looks: [
      { id: 'records', label: 'Training records', x: 9.2, z: -4.4, y: 2.6, text: ['Section 6\'s training notes, neat and complete: stamina plans, boxing combinations, long-range shooting, carrying limits...', '...and, in the margin, someone is keeping count of red bean buns.'] },
      { id: 'board', label: 'Digital Hollow board', x: -9.0, z: -1.0, y: 3.4, text: ['Live reports on every Hollow that needs Section 6. Routine surveillance on the left, new Ether activity on the right.', 'Almost all of it is hidden under handwritten sticky notes.'] },
      { id: 'sofa', label: 'Custom sofa', x: 8.0, z: 2.2, y: 1.4, text: ['A huge, soft custom sofa. Long enough to sleep on after an all-nighter, and someone clearly does.'] },
      { id: 'books', label: 'Soukaku\'s books', x: -3.2, z: 0.6, y: 1.5, text: ['Handwriting practice books on Soukaku\'s desk.', 'The practice is... still going.'] },
      { id: 'files', label: 'Yanagi\'s file pile', x: -3.6, z: -2.6, y: 1.8, text: ['A tower of documents on Yanagi\'s desk, tagged "due today". Behind it, a bigger tower tagged "due tomorrow".'] },
      { id: 'doodle', label: 'A drawing', x: -9.2, z: 3.0, y: 2.2, text: ['A crayon drawing by Soukaku: a girl with a pointed ear and a big smile.', 'It must be Miyabi.'] },
      { id: 'medical', label: 'Harumasa\'s medical file', x: 2.0, z: 0.6, y: 1.5, text: ['A medical file on Harumasa\'s desk. You leave it closed.'] },
      { id: 'tictactoe', label: 'Sketch paper', x: 2.0, z: -2.6, y: 1.5, text: ['A game of tic-tac-toe on the chief\'s desk. A draw.'] },
    ],
  };
})();
