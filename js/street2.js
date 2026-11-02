/* ============================================================================
   street2.js -- Sixth Street's south side (fronts at z = 8, facing north across
   the road), from the Zenless Zone Zero Wiki's shop and location shots:
     the 404 Livehouse (west end; its front is this game's own guess: the wiki
       shows only its stage), the garage where the Sage in a Barrel keeps his
       barrel, the 141 convenience store (the Bangboo trio's stall, its truck),
       Godfinger (Asha's arcade: the pixel billboard, the red awning, chequers),
       the back road (Officer Mewmew, a dumpster, tyres), the red-shuttered block,
       Howl's newsstand, Bardic Needle (Elfy's records), a stuck vending machine,
       the roadworks at the east end.
   ========================================================================== */
(function () {
  'use strict';
  const PI = Math.PI, G = VX.glow;
  STREET.parts.push((root, K) => {
    const { piece, sign, put, glass, text, poster, hash, solid, spot, light, night, upper, acUnit, payphone, vending, bench, bin, tires, cone, aframe, planter, pot, BRICK, GREYBRICK, DISP, CJK, CHROME, S } = K;
    const back = PI;                                                      // a south-side front faces -z

    /* ------------------------------------------------ the 404 Livehouse */
    {
      const x0 = -58, x1 = -46.5, P = piece(0.125, x0, S, 0.05);
      P.box(x0, 0, S, x1, 4.0, S + 0.25, (x, y) => (y > 3.5 ? 0x1c1a24 : (Math.abs(y - 0.25) < 0.13 || Math.abs(y - 3.0) < 0.07) ? G(0xd84af0) : ((Math.floor(x / 0.5) & 1) ? 0x2a2834 : 0x24222e)));
      P.cut(-53.25, 0, S, -50.75, 2.75, S + 0.25);
      P.box(-53.375, 0, S - 0.0625, -53.25, 2.875, S + 0.25, CHROME); P.box(-50.75, 0, S - 0.0625, -50.625, 2.875, S + 0.25, CHROME); P.box(-53.375, 2.75, S - 0.0625, -50.625, 2.875, S + 0.25, CHROME);
      P.box(-53.25, 0, S + 0.75, -50.75, 2.75, S + 0.875, 0x141418); P.discZ(-52.6, 1.6, 0.2, S + 0.6875, S + 0.75, 0x6a5a8a); P.discZ(-51.4, 1.6, 0.2, S + 0.6875, S + 0.75, 0x6a5a8a);
      for (let x = -56.5; x < -47; x += 1.5) { if (x > -53.6 && x < -50.4) continue; P.box(x, 0, S - 2.0, x + 0.125, 1.0, S - 1.875, CHROME); }   // the queue posts
      P.box(-56.5, 0.8125, S - 2.0, -53.5, 0.875, S - 1.875, 0xb8302a); P.box(-50.4, 0.8125, S - 2.0, -47.3, 0.875, S - 1.875, 0xb8302a);
      P.mesh(root); solid(x0, S, x1, S + 10);
      for (const [a, b] of [[-56.6, -53.4], [-50.3, -47.2]]) solid(a, S - 2.05, b, S - 1.8);
      const neon = sign(5.0, 1.6, (c, w, h) => { c.fillStyle = '#0e0c14'; c.fillRect(0, 0, w, h); text(c, '404', w * 0.3, h * 0.52, h * 0.85, '#ff5af0', { fam: DISP, stroke: '#ffd0fa', lw: 3 }); text(c, 'LIVEHOUSE', w * 0.7, h * 0.4, h * 0.26, '#7af0ff', { fam: DISP }); text(c, 'ERROR', w * 0.7, h * 0.72, h * 0.2, '#ffd0fa', { fam: DISP }); });
      put(root, neon, -52.0, 3.35, S - 0.02, back);
      const BANDS = [['ANGELS OF DELUSION', ['#ff8ad0', '#f2f0ff', '#8a5ad8', '#ffd84a']], ['THE FORECASTERS', ['#3a7ad8', '#f0f0f0', '#141416', '#4ae8f0']], ['SATELLITE', ['#e86a2a', '#141416', '#f2c230', '#f0f0f0']]];
      BANDS.forEach(([name, pal], i) => { const p = sign(1.0, 1.45, (c, w, h) => { poster(c, w, h, 60 + i, pal); c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, h * 0.02, w, h * 0.16); text(c, name, w / 2, h * 0.1, h * 0.065, '#fff', { fam: DISP }); text(c, 'LIVE 6PM', w / 2, h * 0.94, h * 0.06, '#fff', { w: 800 }); }, { lit: true }); put(root, p, (i < 2 ? -56.6 : -48.4) + (i === 1 ? 1.25 : 0), 1.55, S - 0.02, back); });
      upper(root, x0, x1, S, -1, 4.0, 9.5, 0x3a3a46, { depth: 10, ww: 1.4, step: 2.7, wy: [5.0, 7.4], ac: true });
      light(root, 0xd84af0, 0.6, 7, -52, 3.0, S - 1.2, 'neon');
      spot('404:door', -52.0, S - 1.0, back, 'stand'); spot('404:q1', -55.6, S - 1.3, back + 0.5, 'phone'); spot('404:q2', -54.6, S - 1.25, back, 'stand'); spot('404:q3', -49.0, S - 1.3, back - 0.4, 'stand');
      spot('404:aria', -50.2, S - 1.0, back + 0.3, 'perform');
    }

    /* -------------------------------- the garage, and the Sage in a Barrel */
    {
      const P = piece(0.0625, -46.5, S, 0.04);
      P.box(-46.5, 0, S, -42, 4.0, S + 0.25, GREYBRICK);
      P.box(-46.25, 0, S - 0.0625, -43.25, 2.75, S, (x, y) => (Math.floor(y / 0.125) & 1) ? 0x8a8c90 : 0x7a7c80);           // the roller door
      P.box(-46.375, 2.75, S - 0.125, -43.125, 3.0, S, 0x5a5c62);
      P.cyl(-44.6, S - 0.6, 0.34, 0, 0.9, (X, Y) => (Math.floor(Y / 0.25) & 1) && Math.abs(Y % 0.25) < 0.07 ? 0x6a7a88 : 0x8a9aa8); // the barrel
      P.cyl(-44.6, S - 0.6, 0.38, 0.9, 0.97, 0x6a7a88); P.box(-44.85, 0.97, S - 0.85, -44.35, 1.03, S - 0.3, 0x6a7a88);       // its lid, ajar
      P.box(-44.8, 0.55, S - 0.95, -44.4, 0.8, S - 0.92, 0x141416); P.box(-44.75, 0.62, S - 0.95, -44.69, 0.69, S - 0.94, G(0xf2e8a0)); P.box(-44.51, 0.62, S - 0.95, -44.45, 0.69, S - 0.94, G(0xf2e8a0)); // eyes in the dark
      P.mesh(root); solid(-46.5, S, -42, S + 0.3); solid(-45.0, S - 1.0, -44.2, S - 0.2);
      upper(root, -46.5, -42, S, -1, 4.0, 8.0, 0x6a6e78, { depth: 10, ww: 1.0, step: 2.0, wy: [5.0, 6.6] });
      spot('sage', -44.6, S - 0.6, back, 'barrel', { post: true });
    }

    /* ---------------------------------------- the 141 convenience store --
       A blue sign band, the big orange "141" and ONE FOUR ONE, orange stripes;
       a scalloped blue awning trimmed orange; a vertical 141 banner; glass doors
       with the 24-hour badge; the stall where Buy, Ask and Give Change sell from
       crates; a red chest freezer, snack racks, A-frame posters; the Ice Cream
       Kingdom machine at the side; the white truck with its blue stripe and red
       crates parked out front, a sawhorse by it. */
    {
      const x0 = -42, x1 = -31, P = piece(0.125, x0, S, 0.05), BLUE = 0x2a4ab8, BLUE2 = 0x223c98, OR = 0xf09a2a, BEIGE = 0xd8ccb0;
      P.box(x0, 0, S, x1, 3.0, S + 0.25, BEIGE);
      P.cut(-41.5, 0, S, -37.75, 2.5, S + 0.25);                                                                         // the stall's opening
      P.box(-41.5, 0, S + 1.0, -37.75, 2.5, S + 1.125, 0xe8e8e2); P.box(-41.5, 2.375, S, -37.75, 2.5, S + 1.0, 0xf4f4f0);  // its back and ceiling
      for (let i = 0; i < 4; i++) P.box(-41.375, 0.25 + i * 0.5, S + 0.875, -37.875, 0.375 + i * 0.5, S + 1.0, (x) => [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x3ab87a, 0xff8a3a][Math.floor(hash(x * 4, i) * 5)]);
      P.box(-41.5, 0, S - 0.75, -37.75, 0.875, S - 0.125, (x, y) => y > 0.75 ? 0x8a6a4a : ((Math.floor(x / 0.5) & 1) ? 0x5a5c62 : 0x4a4c52)); // the counter of crates
      for (let x = -41.375; x < -37.9; x += 0.25) P.box(x, 0.875, S - 0.625, x + 0.125, 1.125, S - 0.5, [0xd84a3a, 0x3a9ae0, 0xf0c040, 0x5ab84a, 0xe8e8f0][Math.floor(hash(x * 8, 1) * 5)]);
      P.cut(-37.5, 0, S, -36.0, 2.5, S + 0.25); P.box(-37.625, 0, S - 0.0625, -37.5, 2.5, S + 0.25, CHROME); P.box(-36.0, 0, S - 0.0625, -35.875, 2.5, S + 0.25, CHROME); P.box(-36.8125, 0, S - 0.0625, -36.6875, 2.5, S + 0.125, CHROME);
      P.cut(-35.5, 0.5, S, -31.5, 2.5, S + 0.25);                                                                        // the window
      P.box(-35.5, 0, S + 0.75, -31.5, 2.5, S + 0.875, 0xe8e8e2);
      for (let i = 0; i < 4; i++) P.box(-35.375, 0.5 + i * 0.5, S + 0.5, -31.625, 0.625 + i * 0.5, S + 0.75, (x) => (Math.floor(x / 0.25) & 1) ? [0xf2c230, 0xd8782a, 0x8a5a3a][i % 3] : [0xd84a3a, 0xf0f0f0, 0x3a7ad8][i % 3]);
      // the awning: scallops, blue and orange, sloping out
      for (let i = 0; i < 4; i++) P.box(x0 - 0.125, 2.5 + i * 0.125, S - 0.75 + i * 0.1875, x1 + 0.125, 2.625 + i * 0.125, S - 0.5625 + i * 0.1875, (x) => i === 0 ? ((Math.floor(x / 0.5) & 1) ? BLUE : -1) : BLUE);
      P.box(x0 - 0.125, 2.375, S - 0.8125, x1 + 0.125, 2.5, S - 0.75, (x) => (Math.floor(x / 0.5) & 1) ? OR : -1);
      P.box(x0, 3.0, S - 0.125, x1, 4.375, S + 0.25, BLUE2);                                                               // the sign band
      P.box(x0, 4.375, S, x1, 8.0, S + 0.25, (x) => (Math.floor(x / 0.375) & 1) ? BEIGE : 0xc8bca0);                     // panelled above
      // the chest freezer, the snack rack, the sawhorse
      P.box(-35.4, 0, S - 0.95, -34.3, 0.75, S - 0.25, (x, y) => y > 0.6875 ? 0xd8e8f0 : 0xd8302a); P.box(-35.3, 0.75, S - 0.85, -34.4, 0.8125, S - 0.35, 0x9ad0f0);
      P.box(-33.8, 0, S - 0.6, -32.2, 1.5, S - 0.2, (x, y) => Math.abs(y % 0.5) < 0.1 ? 0xb0b0b8 : [0xf2c230, 0xd8782a, 0x8a5a3a, 0xd84a3a][Math.floor(hash(x * 6, y * 2) * 4)]);
      P.mesh(root); solid(x0, S, x1, S + 10); solid(-41.6, S - 0.8, -37.7, S); solid(-35.45, S - 1.0, -34.25, S - 0.2); solid(-33.85, S - 0.65, -32.15, S - 0.15);
      const sg = sign(11.0, 1.4, (c, w, h) => {
        c.fillStyle = '#223c98'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f09a2a'; for (const k of [0.18, 0.5, 0.82]) { c.fillRect(w * 0.02, h * k - h * 0.03, w * 0.26, h * 0.06); c.fillRect(w * 0.72, h * k - h * 0.03, w * 0.26, h * 0.06); }
        c.fillStyle = '#f09a2a'; c.fillRect(w * 0.31, h * 0.08, w * 0.38, h * 0.84);
        text(c, '141', w * 0.43, h * 0.53, h * 0.78, '#f09a2a', { fam: DISP, stroke: '#223c98', lw: 10 });
        c.fillStyle = '#223c98'; c.fillRect(w * 0.53, h * 0.16, w * 0.14, h * 0.68);
        text(c, 'ONE', w * 0.6, h * 0.28, h * 0.2, '#f4f4f0', { fam: DISP }); text(c, 'FOUR', w * 0.6, h * 0.5, h * 0.2, '#f4f4f0', { fam: DISP }); text(c, 'ONE', w * 0.6, h * 0.72, h * 0.2, '#f4f4f0', { fam: DISP });
      });
      put(root, sg, -36.5, 3.69, S - 0.14, back);
      const hi = sign(1.6, 1.0, (c, w, h) => { c.fillStyle = '#223c98'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f09a2a'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12); text(c, '141', w / 2, h * 0.55, h * 0.6, '#f09a2a', { fam: DISP }); });
      put(root, hi, -36.5, 6.6, S - 0.02, back);
      const b24 = sign(0.5, 0.5, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); c.strokeStyle = '#223c98'; c.lineWidth = 6; c.stroke(); text(c, '24', w / 2, h * 0.55, h * 0.5, '#223c98', { w: 900 }); });
      put(root, b24, -36.75, 1.65, S - 0.08, back);
      const gl = glass(1.5, 2.5, 0x9ad0ff, 0.3); put(root, gl, -36.75, 1.25, S + 0.1); const gw = glass(4.0, 2.0, 0x9ad0ff, 0.22); put(root, gw, -33.5, 1.5, S + 0.1);
      const banner = sign(0.6, 2.2, (c, w, h) => { c.fillStyle = '#2a4ab8'; c.fillRect(0, 0, w, h); text(c, '141', w / 2, h * 0.22, h * 0.14, '#f09a2a', { fam: DISP }); for (const [i, s] of ['ONE', 'FOUR', 'ONE'].entries()) text(c, s, w / 2, h * (0.48 + i * 0.13), h * 0.08, '#f4f4f0', { fam: DISP }); }, { both: true });
      put(root, banner, -30.5, 1.7, S - 1.2, back);
      const BP = piece(0.0625, -30.5, S - 1.2, 0.03); BP.box(-30.5625, 0, S - 1.2625, -30.4375, 2.9, S - 1.1375, 0xc8c8c4); BP.box(-30.8, 2.8, S - 1.2625, -30.2, 2.875, S - 1.1375, 0xc8c8c4); BP.box(-30.75, 0, S - 1.45, -30.25, 0.125, S - 0.95, 0x3a3c42); BP.mesh(root); solid(-30.8, S - 1.5, -30.2, S - 0.9);
      aframe(root, -31.6, S - 0.9, back + 0.25, (c, w, h) => { poster(c, w, h, 141, ['#f09a2a', '#2a4ab8', '#f4f4f0', '#d84a3a']); text(c, 'NEW', w / 2, h * 0.1, h * 0.1, '#fff', { fam: DISP }); });
      vending(root, -43.15, S - 0.02, -1, 0xe86ab0, 0xfff0f8);
      const ick = sign(1.1, 0.4, (c, w, h) => { c.fillStyle = '#ffe8f4'; c.fillRect(0, 0, w, h); text(c, 'ICE CREAM KINGDOM', w / 2, h * 0.55, h * 0.36, '#e84a9a', { fam: DISP }); }); put(root, ick, -42.6, 2.15, S - 0.02, back);
      // the truck: a white cab-over pickup, a blue stripe and 141 on the door, red crates in the bed
      const T = piece(0.125, -33, 3.6, 0.04), WH = 0xeeeee8, BL = 0x2a4ab8;
      for (const wx of [-32.2, -29.4]) for (const wz of [2.875, 4.25]) T.discZ(wx, 0.4, 0.4, wz, wz + 0.25, d => d < 0.15 ? 0xb0b2b8 : 0x1c1c20);
      T.box(-33.0, 0.375, 3.0, -28.5, 0.75, 4.375, (x, y) => y < 0.5 ? 0x5a5c62 : WH);
      T.box(-33.0, 0.75, 3.0, -31.25, 2.0, 4.375, (x, y, z) => (y > 1.375 && y < 1.875 && (x < -32.8 || z < 3.1 || z > 4.25)) ? 0x3a4a5a : (Math.abs(y - 1.0) < 0.07 ? BL : WH)); // the cab
      T.box(-31.25, 0.75, 3.0, -28.5, 1.25, 3.125, (x, y) => Math.abs(y - 1.0) < 0.07 ? BL : WH); T.box(-31.25, 0.75, 4.25, -28.5, 1.25, 4.375, (x, y) => Math.abs(y - 1.0) < 0.07 ? BL : WH); T.box(-28.625, 0.75, 3.0, -28.5, 1.25, 4.375, WH);
      for (const [cx, cz] of [[-30.9, 3.3], [-30.2, 3.35], [-30.6, 4.0], [-29.5, 3.9]]) T.box(cx, 0.75, cz, cx + 0.5, 1.125, cz + 0.4, (x, y) => Math.abs(y - 0.95) < 0.07 ? 0x8a1a1a : 0xc82a2a);
      T.box(-33.0625, 0.875, 3.25, -33.0, 1.0, 3.5, G(0xfff0c0)); T.box(-33.0625, 0.875, 3.875, -33.0, 1.0, 4.125, G(0xfff0c0));
      T.mesh(root); solid(-33.1, 2.9, -28.4, 4.45);
      const dl = sign(0.7, 0.35, (c, w, h) => text(c, '141', w / 2, h * 0.55, h * 0.7, '#2a4ab8', { fam: DISP }), { lit: true }); put(root, dl, -32.1, 1.2, 4.39);
      const SH = piece(0.0625, -27.9, 5.1, 0.04); for (const lx of [-28.3, -27.5]) { SH.box(lx, 0, 4.95, lx + 0.0625, 0.75, 5.0, 0x8a6a4a); SH.box(lx, 0, 5.2, lx + 0.0625, 0.75, 5.25, 0x8a6a4a); } SH.box(-28.4, 0.6875, 4.95, -27.35, 0.8125, 5.25, (x) => Math.floor(x * 4) & 1 ? 0xd8302a : 0xf0f0f0); SH.mesh(root); solid(-28.45, 4.9, -27.3, 5.3);
      upper(root, x0, x1, S, -1, 8.0, 10.0, BEIGE, { depth: 10, ww: 1.4, step: 2.6, wy: [8.4], parapet: 0xc8bca0 });
      light(root, 0xf0f4ff, 0.6, 7, -38, 2.4, S - 1.0, 'shop');
      spot('141:buy', -40.6, S + 0.45, back, 'shopkeep', { post: true }); spot('141:ask', -39.6, S + 0.45, back, 'shopkeep', { post: true }); spot('141:change', -38.6, S + 0.45, back, 'shopkeep', { post: true });
      spot('141:stall', -39.6, S - 1.35, 0, 'browse'); spot('141:stall2', -40.8, S - 1.4, 0.3, 'browse'); spot('141:freezer', -34.85, S - 1.45, 0, 'browse');
      spot('141:icecream', -42.6, S - 1.35, 0, 'vend'); spot('141:window', -33.0, S - 1.2, 0, 'look'); spot('141:truck', -30.4, 3.7, -PI / 2, 'nap', { y: 1.15 });
    }

    /* ------------------------------------------------------------ Godfinger --
       Asha's arcade on the corner of the back road: dark brick, a red awning
       round the corner, the huge red billboard with GODFINGER in white pixels,
       an X GO! neon, posters, a cabinet facing the street, black and white
       chequers out front, red-and-white chequered banners and standees along the
       kerb, a yellow board, a bin. Two of its cabinets run Proxy Clash. */
    {
      const x0 = -28, x1 = -15.5, P = piece(0.125, x0, S, 0.05), RED = 0xd8302a, RED2 = 0xb8261e;
      const DB = (x, y, z) => { const v = BRICK(x, y, z, 0x3a2a2c, 0x2a1e20); return v === 0x9c4635 ? 0x4a3436 : v; };
      P.box(x0, 0, S, x1, 3.0, S + 10, (x, y, z) => (x > x0 + 0.25 && x < x1 - 0.25 && z > S + 0.25 && z < S + 9.75) ? -1 : DB(x, y, z));
      P.cut(-21.0, 0, S, -19.25, 2.5, S + 0.25); P.box(-21.0, 0, S + 0.5, -19.25, 2.5, S + 0.625, 0x1c1c22);
      P.box(-21.125, 0, S - 0.0625, -21.0, 2.625, S + 0.25, 0x1c1c22); P.box(-19.25, 0, S - 0.0625, -19.125, 2.625, S + 0.25, 0x1c1c22); P.box(-21.125, 2.5, S - 0.0625, -19.125, 2.625, S + 0.25, 0x1c1c22);
      for (let i = 0; i < 5; i++) P.box(x0 - 0.125, 2.75 + i * 0.125, S - 0.875 + i * 0.1875, x1 + 0.125, 2.875 + i * 0.125, S - 0.6875 + i * 0.1875, (x) => (Math.floor(x / 0.375) & 1) ? RED : RED2); // the awning
      for (let i = 0; i < 5; i++) P.box(x1 - 0.125 + (4 - i) * 0.1875, 2.75 + i * 0.125, S - 0.875, x1 + 0.0625 + (4 - i) * 0.1875 + 0.1875, 2.875 + i * 0.125, S + 9.0, (x, y, z) => (Math.floor(z / 0.375) & 1) ? RED : RED2); // round the corner
      P.box(x0, 3.5, S - 0.25, x1, 7.5, S + 0.25, RED);                                                                  // the billboard
      P.box(x1, 3.5, S - 0.25, x1 + 0.5, 7.5, S + 6, RED);
      P.box(x1, 0, S + 1.0, x1 + 0.125, 7.0, S + 1.125, 0x7a7c80); P.box(x1, 0, S + 1.5, x1 + 0.125, 6.0, S + 1.625, 0x7a7c80); // pipes
      P.mesh(root); solid(x0, S, x1, S + 10);
      const bb = sign(12.5, 4.0, (c, w, h) => {
        c.fillStyle = '#d8302a'; c.fillRect(0, 0, w, h);
        const px = h / 10;
        c.fillStyle = '#f4f4f0'; for (let i = 0; i < 4; i++) { for (let k = 0; k < 3; k++) { c.fillRect(w * 0.03 + i * px * 1.4 + k * px * 0.35, h * 0.3 + k * px * 0.9, px * 0.8, px * 0.8); c.fillRect(w * 0.03 + i * px * 1.4 + k * px * 0.35, h * 0.7 - k * px * 0.9, px * 0.8, px * 0.8); } }
        c.font = `900 ${Math.round(h * 0.5)}px "Bebas Neue", monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        const s = 'GODFINGER', x0 = w * 0.22, step = w * 0.085;
        for (let i = 0; i < s.length; i++) { c.save(); c.translate(x0 + i * step, h * 0.52); c.fillStyle = '#f4f4f0'; c.fillText(s[i], 0, 0); c.restore(); }
        c.fillStyle = 'rgba(216,48,42,.9)'; for (let y = 0; y < h; y += px * 0.5) c.fillRect(0, y, w, px * 0.12);   // the pixel grid
        for (let x = 0; x < w; x += px * 0.5) c.fillRect(x, 0, px * 0.12, h);
      });
      put(root, bb, (x0 + x1) / 2, 5.5, S - 0.26, back);
      const xgo = sign(1.2, 0.5, (c, w, h) => { c.fillStyle = '#141416'; c.fillRect(0, 0, w, h); text(c, 'X GO!', w / 2, h * 0.55, h * 0.62, '#ff4a3a', { fam: DISP, stroke: '#ffb0a0', lw: 2 }); });
      put(root, xgo, -22.4, 1.9, S - 0.02, back);
      for (let i = 0; i < 3; i++) { const pp = sign(0.9, 1.3, (c, w, h) => { poster(c, w, h, 300 + i, ['#d8302a', '#141416', '#f4f4f0', '#f2c230', '#4ae8f0']); }, { lit: true }); put(root, pp, [-27.0, -24.0, -17.8][i], 1.4, S - 0.02, back); }
      const fest = sign(1.0, 1.4, (c, w, h) => { poster(c, w, h, 404, ['#2a2a6a', '#f2c230', '#e86ab0', '#4ae8f0']); text(c, '4TH URBAN', w / 2, h * 0.1, h * 0.07, '#fff', { fam: DISP }); text(c, 'VIDEO GAME FESTIVAL', w / 2, h * 0.18, h * 0.055, '#fff', { fam: DISP }); }, { lit: true });
      put(root, fest, -15.4, 1.5, S + 2.6, PI / 2);
      // the Proxy Clash cabinets and the one on the corner
      const A = piece(0.0625, -27, S - 1, 0.03), BODY = 0x2a1f3a, BODY2 = 0x221a30, PINK = 0xff4a7a, CYAN = 0x4ae8f0;
      const cab = (x0c, art) => {
        const x1c = x0c + 0.875, zb = S - 0.125, zf = S - 0.875;
        A.box(x0c, 0, zf, x1c, 0.875, zb, (x, y) => (Math.abs(x - x0c) < 0.07 || Math.abs(x - x1c + 0.0625) < 0.07) && y > 0.2 ? (Math.floor(y * 8) % 3 ? art : BODY2) : BODY);
        A.box(x0c, 0.875, zf - 0.25, x1c, 1.0, zb, BODY2);
        for (const [bx, cc] of [[0.25, PINK], [0.375, CYAN], [0.5, 0xf2c230]]) A.box(x0c + bx, 1.0, zf - 0.1875, x0c + bx + 0.0625, 1.0625, zf - 0.125, G(cc));
        A.box(x0c + 0.625, 1.0, zf - 0.1875, x0c + 0.6875, 1.125, zf - 0.125, 0x111114); A.box(x0c + 0.625, 1.125, zf - 0.1875, x0c + 0.6875, 1.1875, zf - 0.125, G(PINK));
        A.box(x0c, 1.0, zf + 0.1875, x1c, 1.75, zb, (x) => Math.abs(x - x0c) < 0.07 || Math.abs(x - x1c + 0.0625) < 0.07 ? art : BODY);
        A.box(x0c + 0.125, 1.0625, zf + 0.125, x1c - 0.125, 1.6875, zf + 0.1875, (x, y) => G(((Math.floor(x * 16) + Math.floor(y * 16)) % 6 === 0) ? 0xffffff : (y > 1.4 ? PINK : CYAN)));
        A.box(x0c, 1.75, zf + 0.0625, x1c, 2.0, zb, (x) => G(Math.floor((x - x0c) * 8) % 2 ? art : 0xfff0f6));
        solid(x0c - 0.05, zf - 0.3, x1c + 0.05, zb);
      };
      cab(-27.0, PINK); cab(-25.75, CYAN); cab(-16.5, 0xf2c230);
      A.mesh(root);
      const pc = sign(2.6, 0.55, (c, w, h) => { c.fillStyle = '#16101e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ff4a7a'; c.lineWidth = 6; c.strokeRect(4, 4, w - 8, h - 8); text(c, 'PROXY', w * 0.33, h * 0.56, h * 0.62, '#4ae8f0', { fam: DISP }); text(c, 'CLASH', w * 0.69, h * 0.56, h * 0.62, '#ff4a7a', { fam: DISP }); });
      put(root, pc, -25.9, 2.35, S - 0.04, back);
      // banners and standees along the kerb
      for (const [i, bx] of [-26.6, -23.4, -20.2].entries()) {
        const BN = piece(0.0625, bx, 5.4, 0.03); BN.box(bx - 0.03, 0, 5.37, bx + 0.03, 3.0, 5.43, 0xc8c8c4); BN.box(bx - 0.25, 0, 5.15, bx + 0.25, 0.125, 5.65, 0x3a3c42); BN.mesh(root); solid(bx - 0.3, 5.1, bx + 0.3, 5.7);
        const fl = sign(0.6, 2.4, (c, w, h) => { for (let y = 0; y < h; y += w / 3) for (let x = 0; x < w; x += w / 3) { c.fillStyle = ((x + y) / (w / 3)) % 2 < 1 ? '#d8302a' : '#f4f4f0'; c.fillRect(x, y, w / 3 + 1, w / 3 + 1); } c.fillStyle = '#d8302a'; c.fillRect(0, h * 0.7, w, h * 0.3); text(c, 'GODFINGER', w / 2, h * 0.85, w * 0.22, '#f4f4f0', { fam: DISP }); }, { both: true });
        put(root, fl, bx + 0.33, 1.75, 5.4, back);
        const sd = sign(0.7, 1.4, (c, w, h) => poster(c, w, h, 500 + i, ['#141416', '#f4f4f0', '#d8302a', '#f2c230', '#8a5ad8']), { lit: true, both: true }); put(root, sd, bx + 1.4, 0.7, 5.5, back + 0.2);
        solid(bx + 1.1, 5.35, bx + 1.7, 5.65);
      }
      aframe(root, -18.4, S - 0.9, back - 0.3, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); text(c, 'HIGH', w / 2, h * 0.3, h * 0.14, '#141416', { fam: DISP }); text(c, 'SCORE', w / 2, h * 0.48, h * 0.14, '#141416', { fam: DISP }); text(c, 'TODAY', w / 2, h * 0.7, h * 0.12, '#d8302a', { fam: DISP }); }, 0xd8aa22);
      bin(root, -22.2, S - 0.45, 0x8a9098, { x: true });
      upper(root, x0, x1, S + 0.75, -1, 7.5, 10.5, 0x5a5e68, { depth: 9, ww: 1.5, step: 2.8, wy: [8.2], ac: true });
      light(root, 0xff5a4a, 0.7, 8, -21.5, 2.6, S - 1.4, 'neon'); light(root, 0xff8ad0, 0.45, 5, -26.4, 1.8, S - 1.5, 'neon');
      spot('gf:asha', -20.1, S - 0.7, back, 'shopkeep', { post: true });
      spot('gf:cab1', -26.56, S - 1.5, 0, 'arcade'); spot('gf:cab2', -25.31, S - 1.5, 0, 'arcade'); spot('gf:corner', -16.06, S - 1.5, 0, 'arcade');
      spot('gf:flags', -21.8, 6.1, PI / 2 + 0.3, 'stand'); spot('gf:drunk', -18.9, 5.9, 0.4, 'sway'); spot('gf:wall', -27.6, S - 0.55, back, 'lean');
    }

    /* --------------------------------------------------------- the back road --
       Behind Godfinger and the newsstand: a concrete fence plastered with posters,
       a utility pole with its boxes, tyres, a dumpster (Officer Mewmew waits
       here with his medal challenges; at midnight the cat's owner too). */
    {
      const P = piece(0.125, -15.5, S, 0.05);
      P.box(-15.5, 0, 17.25, -11, 2.25, 17.5, (x, y) => (Math.floor(x / 1.5) !== Math.floor((x - 0.125) / 1.5)) ? 0x9a9a94 : 0xb0b0aa);
      P.box(-14.6, 0.5, 17.1875, -13.6, 1.75, 17.25, (x, y) => y > 1.5 ? 0x141416 : 0xf2c230); P.box(-13.3, 0.6, 17.1875, -12.5, 1.6, 17.25, 0xe8e8e2);
      P.box(-11.75, 0, 16.5, -11.5, 7.0, 16.75, 0x9a968c); P.box(-11.5, 2.0, 16.5, -11.125, 2.75, 16.875, 0x7a7c80); P.box(-11.5, 3.0, 16.5, -11.125, 3.5, 16.875, 0x8a8c90);
      P.box(-15.25, 0, 12.5, -13.625, 1.25, 13.75, 0x2a5a8a); P.box(-15.375, 1.25, 12.375, -13.5, 1.375, 13.875, 0x1e4a74);
      P.mesh(root); solid(-15.5, 17.2, -11, 17.6); solid(-15.3, 12.4, -13.5, 13.9); solid(-11.8, 16.4, -11.1, 16.9);
      tires(root, -14.5, 15.6, 3); tires(root, -13.6, 16.0, 2);
      spot('back:mewmew', -12.6, 11.0, back, 'mascot', { post: true }); spot('back:owner', -13.2, 14.6, -0.8, 'pet'); spot('back:dumpster', -13.2, 13.2, -PI / 2, 'look');
    }

    /* ------------------------------------------------- the shuttered block */
    {
      const P = piece(0.125, -11, S, 0.05);
      P.box(-11, 0, S, -7.25, 3.0, S + 10, (x, y, z) => (x > -10.75 && x < -7.5 && z > S + 0.25 && z < S + 9.75) ? -1 : 0x6a6e78);
      P.box(-10.75, 0, S - 0.0625, -7.5, 2.75, S, (x, y) => { const g = Math.hypot((x + 9.1) * 0.8, (y - 1.4) * 1.3); if (g < 0.9 && Math.abs(Math.sin(x * 6 + y * 4)) < 0.6) return g < 0.5 ? 0xf2c230 : 0x141416; return (Math.floor(y / 0.125) & 1) ? 0xc8302a : 0xb02a24; });
      P.box(-10.875, 2.75, S - 0.125, -7.375, 3.0, S, 0x5a5c62);
      P.mesh(root); solid(-11, S, -7.25, S + 10);
      const ns = sign(0.45, 0.45, (c, w, h) => { c.fillStyle = '#f4f4f0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8302a'; c.lineWidth = w * 0.08; c.beginPath(); c.arc(w / 2, h / 2, w * 0.38, 0, PI * 2); c.stroke(); c.beginPath(); c.moveTo(w * 0.24, h * 0.24); c.lineTo(w * 0.76, h * 0.76); c.stroke(); c.fillStyle = '#141416'; c.fillRect(w * 0.25, h * 0.47, w * 0.4, h * 0.08); });
      put(root, ns, -7.6, 1.8, S - 0.02, back);
      upper(root, -11, -7.25, S, -1, 3.0, 9.0, 0x7a7e88, { depth: 10, ww: 1.0, step: 1.8, wy: [3.8, 5.8], ac: true });
    }

    /* ------------------------------------------------------ Howl's newsstand --
       A kiosk under a round saucer roof: green and yellow racks of magazines,
       goods hanging along the top, newspapers stacked in front, boxes at the
       side; Howl minds it (and sleeps at midnight). */
    {
      const cx = -9.4, cz = 6.1, P = piece(0.0625, cx, cz, 0.04), GR = 0x2a8a4a, YE = 0xf2c230;
      P.box(cx - 0.9, 0, cz - 0.6, cx + 0.9, 1.25, cz + 0.75, (x, y, z) => (z < cz - 0.5 && y > 0.375) ? -1 : 0x3a6a4a);   // the booth (its window open to the north)
      P.box(cx - 0.9, 1.25, cz - 0.6, cx + 0.9, 2.375, cz + 0.75, (x, y, z) => (z < cz - 0.45 && x > cx - 0.75 && x < cx + 0.75) ? -1 : 0xd8d8d0);
      P.box(cx - 1.4, 0, cz - 0.95, cx - 0.9, 1.75, cz + 0.6, (x, y) => Math.abs(y % 0.4375) < 0.07 ? YE : [0xd84a3a, 0x3a7ad8, 0xf2c230, 0xe86ab0, 0x3ab87a, 0xf0f0f0][Math.floor(hash(x * 9, y * 5) * 6)]); // a rack, yellow shelves
      P.box(cx + 0.9, 0, cz - 0.95, cx + 1.3, 1.5, cz + 0.6, (x, y) => Math.abs(y % 0.375) < 0.07 ? GR : [0xd84a3a, 0x3a7ad8, 0xf2c230, 0xe86ab0, 0xf0f0f0][Math.floor(hash(x * 7, y * 9) * 5)]);
      P.box(cx - 0.75, 0.375, cz - 0.95, cx + 0.75, 0.9375, cz - 0.6, (x, y) => Math.abs(y - 0.375) < 0.07 ? GR : [0xd84a3a, 0x3a7ad8, 0xf2c230, 0xe86ab0, 0xf0f0f0][Math.floor(hash(x * 11, y * 3) * 5)]);
      for (let x = cx - 0.75; x < cx + 0.7; x += 0.25) P.box(x, 1.875, cz - 0.6, x + 0.1875, 2.25, cz - 0.5625, [0x3ab87a, 0xf2c230, 0xd84a3a][Math.floor(hash(x * 5, 2) * 3)]);   // goods hanging
      for (let i = 0; i < 3; i++) P.box(cx - 0.6 + i * 0.45, 0, cz - 1.3, cx - 0.25 + i * 0.45, 0.25 + i * 0.06, cz - 1.0, (x, y) => (Math.floor(y / 0.0625) & 1) ? 0xe8e8e2 : 0xc8c8c0);   // newspapers
      P.box(cx + 1.35, 0, cz + 0.05, cx + 1.85, 0.5, cz + 0.55, 0xb08a5a); P.box(cx + 1.4, 0.5, cz + 0.1, cx + 1.8, 0.875, cz + 0.5, 0xc89a6a);
      P.cyl(cx, cz, 0.08, 2.375, 2.75, 0x8a8c94);
      for (let r = 0; r < 1.75; r += 0.0625) { const y = 2.75 + Math.max(0, 0.35 - r * 0.25); P.cyl(cx, cz, r + 0.0625, y, y + 0.0625, (X, Y, Z) => Math.hypot(X - cx, Z - cz) < r - 0.02 ? -1 : (r > 1.55 ? 0x9aa0a8 : 0xc8ccd2)); }
      P.box(cx - 0.125, 2.6875, cz - 0.8, cx + 0.125, 2.75, cz - 0.55, G(0xc8f040));
      P.mesh(root); solid(cx - 1.45, cz - 1.35, cx + 1.9, cz + 0.8);
      const mags = sign(1.5, 0.5, (c, w, h) => { for (let i = 0; i < 5; i++) { c.save(); c.translate(i * w / 5 + 2, 2); poster(c, w / 5 - 4, h - 4, 700 + i); c.restore(); } }, { lit: true });
      put(root, mags, cx, 1.55, cz - 0.62, back);
      light(root, 0xfff0d0, 0.4, 4, cx, 2.3, cz - 1.0, 'lamp');
      spot('news:howl', cx, cz - 0.15, back, 'shopkeep', { post: true }); spot('news:read', cx - 1.85, cz - 0.2, PI / 2, 'read'); spot('news:read2', cx + 2.25, cz + 0.2, -PI / 2, 'read');
    }

    /* ------------------------------------------------------------ Bardic Needle --
       Elfy's record shop, across the street from Random Play: louvred metal
       cladding upstairs with two air conditioners; the big sign panel (a steel
       mesh, the dark green oval with BARDIC NEEDLE in raised letters, green
       crescents either side); a yellow-tiled pillar with an AC unit at its foot,
       a window of album covers, the orange door made up as a record in its sleeve,
       a wall of album covers over two big speakers; crates of records in hazard
       stripes on the pavement; a green BARDIC NEEDLE banner on a stand. */
    {
      const x0 = -7, x1 = 7, P = piece(0.125, x0, S, 0.05), DARK = 0x2a2e34;
      P.box(5.75, 0, S, 7, 3.5, S + 0.25, (x, y) => ((Math.floor(x / 0.25) + Math.floor(y / 0.25)) & 1) ? 0xd8b84a : 0xc8a83a);   // the tiled pillar
      P.box(x0, 0, S + 0.25, 5.75, 3.5, S + 0.5, DARK);                                                                     // behind the front
      P.box(2.0, 0.5, S, 5.75, 0.625, S + 0.25, DARK); P.box(2.0, 2.875, S, 5.75, 3.0, S + 0.25, DARK); P.box(2.0, 0, S, 2.125, 3.0, S + 0.25, DARK); P.box(5.625, 0, S, 5.75, 3.0, S + 0.25, DARK);
      // the door: an orange sleeve round a record
      P.box(-0.75, 0, S - 0.0625, 1.875, 3.0, S + 0.125, (x, y) => (x < -0.625 || x >= 1.75 || y >= 2.875) ? DARK : 0xd8782a);
      P.discZ(0.56, 1.5, 1.15, S - 0.125, S - 0.0625, d => d < 0.18 ? (d < 0.05 ? 0x141416 : 0xd8302a) : (Math.floor(d * 16) & 1 ? 0x24242a : 0x34343a));
      // the album wall over its two speakers
      P.box(x0, 0, S, -0.75, 3.5, S + 0.25, (x, y) => (y < 1.0 && (x < -4.6 || x > -2.9)) ? 0x1c1c22 : DARK);
      for (const sx of [-6.5, -2.6]) { P.box(sx, 0, S - 0.25, sx + 1.4, 1.0, S, 0x1c1c22); P.discZ(sx + 0.7, 0.5, 0.36, S - 0.3125, S - 0.25, d => d < 0.12 ? 0x55585e : (d > 0.3 ? 0x3a3c42 : 0x2a2c30)); }
      P.box(x0, 3.5, S - 0.25, x1, 5.75, S + 0.25, (x, y) => ((Math.floor((x + y) / 0.25) & 1) ^ (Math.floor((x - y) / 0.25) & 1)) ? 0x6a6e74 : 0x5a5e64); // the mesh behind the sign
      P.box(x0, 5.75, S, x1, 9.0, S + 0.25, (x, y) => (Math.floor(y / 0.25) & 1) ? 0x9a9ea4 : 0x8a8e94);                     // louvres upstairs
      P.box(x0, 0, S + 0.25, x0 + 0.25, 9.0, S + 10, 0x8a8e94); P.box(x1 - 0.25, 0, S + 0.25, x1, 9.0, S + 10, 0x8a8e94);
      P.mesh(root); solid(x0, S - 0.3, -0.75, S + 10); solid(1.875, S - 0.05, x1, S + 10); solid(-0.75, S - 0.1, 1.875, S + 10);
      const AC = piece(0.0625, 3, S, 0.03); acUnit(AC, -5.0, 8.0, S, -1); acUnit(AC, -3.9, 8.0, S, -1); acUnit(AC, 6.0, 0, S - 0.4, -1); AC.mesh(root); solid(5.9, S - 0.85, 6.85, S - 0.4);
      const sg = sign(14.0, 2.25, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#2e6a4a'; for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { c.beginPath(); c.ellipse(w / 2 + s * (w * 0.33 + i * w * 0.06), h / 2, w * 0.06, h * 0.42, 0, s < 0 ? PI / 2 : -PI / 2, s < 0 ? PI * 1.5 : PI / 2); c.fill(); }
        c.fillStyle = '#24493a'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.22, h * 0.44, 0, 0, PI * 2); c.fill(); c.strokeStyle = '#3a7a5a'; c.lineWidth = h * 0.04; c.stroke();
        text(c, 'BARDIC', w / 2, h * 0.32, h * 0.3, '#e8f0ec', { fam: DISP, stroke: '#5a6a64', lw: 5 }); text(c, 'NEEDLE', w / 2, h * 0.68, h * 0.3, '#e8f0ec', { fam: DISP, stroke: '#5a6a64', lw: 5 });
      });
      put(root, sg, 0, 4.62, S - 0.27, back);
      const covers = (seed, cols, rows) => (c, w, h) => { for (let i = 0; i < cols * rows; i++) { const cw = w / cols, ch = h / rows; c.save(); c.translate((i % cols) * cw + cw * 0.06, Math.floor(i / cols) * ch + ch * 0.06); poster(c, cw * 0.88, ch * 0.88, seed + i, ['#e86ab0', '#f2c230', '#4ae8f0', '#d84a3a', '#8a5ad8', '#3ab87a', '#141416', '#f4f4f0']); c.restore(); } };
      const win = sign(3.4, 2.2, covers(900, 3, 2), { lit: true }); put(root, win, 3.87, 1.75, S + 0.2, back);
      const gw = glass(3.5, 2.25, 0x9ad0ff, 0.25); put(root, gw, 3.87, 1.75, S - 0.02);
      const wall = sign(5.8, 2.4, covers(950, 3, 2), { lit: true }); put(root, wall, -3.85, 2.25, S - 0.02, back);
      // crates on the pavement, the banner, a planter
      const CR = piece(0.0625, 3.5, S - 0.6, 0.03);
      for (const cx of [2.9, 3.9]) { CR.box(cx, 0, S - 1.0, cx + 0.8, 0.5, S - 0.4, (x, y) => (Math.floor((x + y) / 0.125) & 1) ? 0xf2c230 : 0x1c1c22); for (let x = cx + 0.1; x < cx + 0.7; x += 0.0625) CR.box(x, 0.5, S - 0.9, x + 0.03, 0.75 + hash(x * 9, 1) * 0.1, S - 0.5, [0xd84a3a, 0x3a7ad8, 0xf2c230, 0xe86ab0, 0x141416][Math.floor(hash(x * 13, 2) * 5)]); }
      CR.mesh(root); solid(2.85, S - 1.05, 4.75, S - 0.35);
      const fl = sign(0.6, 2.0, (c, w, h) => { c.fillStyle = '#24493a'; c.fillRect(0, 0, w, h); text(c, 'BARDIC', w / 2, h * 0.2, w * 0.26, '#e8f0ec', { fam: DISP }); text(c, 'NEEDLE', w / 2, h * 0.34, w * 0.26, '#e8f0ec', { fam: DISP }); c.fillStyle = '#141416'; c.beginPath(); c.arc(w / 2, h * 0.62, w * 0.3, 0, PI * 2); c.fill(); c.fillStyle = '#d8302a'; c.beginPath(); c.arc(w / 2, h * 0.62, w * 0.1, 0, PI * 2); c.fill(); }, { both: true });
      put(root, fl, -7.4, 1.4, S - 1.6, back);
      const FP = piece(0.0625, -7.4, S - 1.6, 0.03); FP.box(-7.75, 0, S - 1.65, -7.69, 2.45, S - 1.55, 0xc8c8c4); FP.box(-7.8, 0, S - 1.85, -7.3, 0.125, S - 1.35, 0x3a3c42); FP.mesh(root); solid(-7.85, S - 1.9, -7.25, S - 1.3);
      planter(root, 6.4, S - 1.3, 7.6, S - 0.9);
      bench(root, -6.2, 6.1, -1, 1.75);                                        // a bench facing Random Play (Yixuan's, in the evenings)
      light(root, 0xffe0b0, 0.5, 6, 2.5, 2.6, S - 1.0, 'shop');
      spot('bardic:elfy', 0.4, S - 0.75, back, 'shopkeep', { post: true }); spot('bardic:crates', 3.9, S - 1.75, 0, 'browse'); spot('bardic:crates2', 3.0, S - 1.75, 0.3, 'browse');
      spot('bardic:window', 3.9, S - 2.1, -0.2, 'look'); spot('bardic:wall', -3.9, S - 1.5, 0, 'look'); spot('bardic:lean', -0.9, S - 0.55, back - 0.4, 'lean');
    }

    /* ------------------------------------------------- the east end of the south side */
    {
      vending(root, 7.25, S - 0.02, -1, 0xd8302a, 0xfff4e8);                    // the one with a TANKA Cola stuck in it
      solid(7, S, 8.5, S + 10);
      const tk = piece(0.0625, 7.6, S, 0.03); tk.box(7.6, 1.32, S - 0.25, 7.73, 1.52, S - 0.12, 0xd8302a); tk.mesh(root);
      spot('east:vend', 7.8, S - 1.3, 0, 'vend');
      const P = piece(0.25, 8.5, S, 0.05);
      P.box(8.5, 0, S, 24, 3.25, S + 10, (x, y, z) => (x > 8.75 && x < 23.75 && z > S + 0.25 && z < S + 9.75) ? -1 : (Math.floor(y / 0.5) % 5 === 0 ? 0x8a8478 : 0x9a9488));
      P.mesh(root); solid(8.5, S, 24, S + 10);
      const SH = piece(0.125, 9, S, 0.05);
      for (const [a, b] of [[9.25, 12.25], [13.0, 16.0], [18.5, 21.5]]) { SH.box(a, 0, S - 0.0625, b, 2.75, S, (x, y) => (Math.floor(y / 0.125) & 1) ? 0x8a8c90 : 0x7a7c80); SH.box(a - 0.125, 2.75, S - 0.125, b + 0.125, 3.0, S, 0x5a5c62); }
      SH.box(16.6, 1.0, S - 0.0625, 17.6, 1.6, S, (x, y) => Math.abs(Math.sin(x * 7) * 0.2 + 1.3 - y) < 0.1 ? 0x2a6ad8 : -1);
      SH.mesh(root);
      upper(root, 8.5, 17.5, S, -1, 3.25, 9.5, (x, y) => (Math.floor(y / 0.5) % 5 === 0 ? 0x7a7468 : 0x8a8478), { depth: 10, ww: 1.4, step: 2.6, wy: [4.2, 6.6], ac: true });
      upper(root, 17.5, 24, S, -1, 3.25, 7.5, 0x6a7280, { depth: 10, ww: 1.2, step: 2.2, wy: [4.2, 5.9], bars: true });
      // the roadworks: barriers across the road, cones, the sign
      const R = piece(0.0625, 20, 2, 0.03);
      for (let z = -0.8; z < 4.4; z += 1.3) { R.box(19.75, 0, z, 19.875, 1.0, z + 0.125, 0x3a3c42); R.box(19.75, 0, z + 1.0, 19.875, 1.0, z + 1.125, 0x3a3c42); R.box(19.6875, 0.6875, z, 19.9375, 0.9375, z + 1.125, (x, y, zz) => (Math.floor((zz + y) / 0.25) & 1) ? 0xd8302a : 0xf4f4f0); R.box(19.6875, 0.75, z + 0.5, 19.9375, 0.8125, z + 0.5625, G(0xffb040)); }
      R.mesh(root); solid(19.5, -1.05, 20.1, 4.55);
      for (const [x, z] of [[19.0, 0.2], [18.6, 1.9], [19.1, 3.6]]) cone(root, x, z);
      const rw = sign(1.2, 0.8, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); c.strokeStyle = '#141416'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10); text(c, 'ROAD UNDER', w / 2, h * 0.36, h * 0.2, '#141416', { fam: DISP }); text(c, 'MAINTENANCE', w / 2, h * 0.64, h * 0.2, '#141416', { fam: DISP }); });
      put(root, rw, 19.6, 1.6, 1.8, -PI / 2);
      const SP = piece(0.0625, 19.7, 1.8, 0.03); SP.box(19.72, 0, 1.75, 19.78, 1.25, 1.85, 0x3a3c42); SP.mesh(root);
      spot('east:works', 18.4, 2.6, -PI / 2, 'look');
    }
  });
})();
