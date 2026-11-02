/* ============================================================================
   street.js -- Sixth Street, built as it is in the real game, from the Zenless
   Zone Zero Wiki's location shots, shop pictures and maps.

   The street runs west to east (x), the camera's usual view is north (-z).
     north side (fronts at z = -4, facing the street):
       the metro entrance at the west end, Box Galaxy (gadgets, the Bangboo
       statue by its graffiti wall), Coff Cafe (Tin Master's corner cafe, its
       patio), an alley, Waterfall Soup (General Chop's noodle shop), the alley
       to the parking lot, Random Play, Turbo (Enzo's container garage)
     south side (fronts at z = 8, in street2.js):
       the 404 Livehouse, the 141 convenience store and its truck, Godfinger
       (Asha's arcade), the back road, Howl's newsstand, Bardic Needle (Elfy's
       record shop, across from Random Play), the shuttered block, the roadworks

   Grain: buildings in quarter metres, shopfronts in eighths, fittings and props
   in sixteenths (piece(): a small grid round its own origin, so a fine prop
   stays in the grid's range anywhere on the street).

     STREET.build(root) -> { col, spots, lights, night, anims, bounds }
     STREET.RP (Random Play's front, upper floor, low rail: cut away inside)
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, PI = Math.PI;
  const hash = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };
  const ST = { parts: [] };

  /* ------------------------------------------------------------ the kit -- */
  function piece(s, ox, oz, jit) {
    const g = new VX.Grid(); g.jit = jit != null ? jit : 0.05;
    ox = ox || 0; oz = oz || 0;
    const q = m => Math.round(m / s);
    const P = {
      g, s,
      box(x0, y0, z0, x1, y1, z1, c) {
        g.box(q(x0 - ox), q(y0), q(z0 - oz), q(x1 - ox) - 1, q(y1) - 1, q(z1 - oz) - 1, typeof c === 'function' ? (x, y, z) => c(x * s + ox, y * s, z * s + oz) : c);
        return P;
      },
      cut(x0, y0, z0, x1, y1, z1) { g.cut(q(x0 - ox), q(y0), q(z0 - oz), q(x1 - ox) - 1, q(y1) - 1, q(z1 - oz) - 1); return P; },
      /* a vertical cylinder round (cx, cz) */
      cyl(cx, cz, r, y0, y1, c) {
        for (let i = -Math.ceil(r / s); i < Math.ceil(r / s); i++) for (let k = -Math.ceil(r / s); k < Math.ceil(r / s); k++)
          if (Math.hypot((i + 0.5) * s, (k + 0.5) * s) <= r) P.box(cx + i * s, y0, cz + k * s, cx + (i + 1) * s, y1, cz + (k + 1) * s, c);
        return P;
      },
      /* a disc standing up, facing z (a wheel, a record, a porthole): centre (cx, cy), at depth z0..z1 */
      discZ(cx, cy, r, z0, z1, c) {
        for (let i = -Math.ceil(r / s); i < Math.ceil(r / s); i++) for (let k = -Math.ceil(r / s); k < Math.ceil(r / s); k++) {
          const d = Math.hypot((i + 0.5) * s, (k + 0.5) * s); if (d > r) continue;
          P.box(cx + i * s, cy + k * s, z0, cx + (i + 1) * s, cy + (k + 1) * s, z1, typeof c === 'function' ? () => c(d) : c);
        }
        return P;
      },
      /* the same facing x */
      discX(cz, cy, r, x0, x1, c) {
        for (let i = -Math.ceil(r / s); i < Math.ceil(r / s); i++) for (let k = -Math.ceil(r / s); k < Math.ceil(r / s); k++) {
          const d = Math.hypot((i + 0.5) * s, (k + 0.5) * s); if (d > r) continue;
          P.box(x0, cy + k * s, cz + i * s, x1, cy + (k + 1) * s, cz + (i + 1) * s, typeof c === 'function' ? () => c(d) : c);
        }
        return P;
      },
      mesh(root, opts) { const m = VX.object(g, s, { cast: !(opts && opts.cast === false) }); m.position.set(ox + s / 2, s / 2, oz + s / 2); root.add(m); return m; },
    };
    return P;
  }
  /* a flat panel with a picture drawn on a canvas, facing +z: a sign (unlit) or, lit: true, a poster */
  function sign(w, h, draw, o) {
    o = o || {};
    const k = o.res || 140, c = document.createElement('canvas'); c.width = Math.max(8, Math.round(w * k)); c.height = Math.max(8, Math.round(h * k));
    const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const paint = () => { ctx.clearRect(0, 0, c.width, c.height); draw(ctx, c.width, c.height); tex.needsUpdate = true; };
    paint(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    const mat = o.lit ? new THREE.MeshLambertMaterial({ map: tex, transparent: true }) : new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    if (o.both) mat.side = THREE.DoubleSide;
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  }
  const put = (root, m, x, y, z, ry) => { m.position.set(x, y, z); if (ry) m.rotation.y = ry; root.add(m); return m; };
  const glass = (w, h, col, op) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col || 0x9fd0ff, transparent: true, opacity: op || 0.22, depthWrite: false, side: THREE.DoubleSide }));
  const font = (px, w, fam) => `${w || 700} ${Math.round(px)}px ${fam || 'Rubik, "Segoe UI", sans-serif'}`;
  const DISP = '"Bebas Neue", Rubik, sans-serif', CJK = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", "Hiragino Sans", sans-serif';
  function text(c, s, x, y, px, col, o) { o = o || {}; c.font = font(px, o.w, o.fam); c.fillStyle = col; c.textAlign = o.align || 'center'; c.textBaseline = 'middle'; if (o.stroke) { c.lineWidth = o.lw || px * 0.12; c.strokeStyle = o.stroke; c.strokeText(s, x, y); } c.fillText(s, x, y); }
  /* a poster's worth of shapes, seeded: a band, a figure, a title */
  function poster(c, w, h, seed, pal) {
    const r = i => hash(seed * 13.1 + i * 7.3, seed * 3.7 + i), P = pal || ['#d84a3a', '#3a7ad8', '#f2c230', '#3ab87a', '#e86ab0', '#8a5ad8', '#141416', '#f0f0f0'];
    c.fillStyle = P[Math.floor(r(1) * P.length)]; c.fillRect(0, 0, w, h);
    c.fillStyle = P[Math.floor(r(2) * P.length)]; c.beginPath(); c.arc(w * (0.3 + r(3) * 0.4), h * (0.35 + r(4) * 0.2), w * (0.22 + r(5) * 0.15), 0, PI * 2); c.fill();
    c.fillStyle = P[Math.floor(r(6) * P.length)]; c.fillRect(w * 0.1, h * 0.7, w * 0.8, h * 0.08);
    c.fillStyle = '#111'; c.fillRect(w * (0.35 + r(7) * 0.2), h * 0.28, w * 0.12, h * 0.42);
    c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(w * 0.12, h * 0.84, w * 0.5, h * 0.04); c.fillRect(w * 0.12, h * 0.9, w * 0.32, h * 0.03);
  }

  /* the street's measures */
  const N = -4, NC = -1, SC = 4.5, S = 8, X0 = -61, X1 = 25;
  const STORE = { x0: -6, x1: 6, z0: -14, z1: -4, door0: -1.1, door1: 1.1 };
  const inStore = (x, z) => x > STORE.x0 && x < STORE.x1 && z < STORE.z1 - 0.05 && z > STORE.z0;

  /* what the build collects for the lobby */
  let COL, SPOTS, LIGHTS, NIGHT, ANIMS, TALL;
  const solid = (x0, z0, x1, z1) => COL.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
  /* a place someone can be: act (what they do there), face (the way they look), seat (how high they sit) */
  const spot = (id, x, z, face, act, o) => { SPOTS[id] = Object.assign({ id, x, z, face, act }, o || {}); };
  /* lights, as data: the lobby keeps a few real point lights and hands them to the ones nearest the
     camera (a constant number, so no shader rebuilds). kind: 'lamp' (on from dusk), 'shop', 'neon'. */
  function light(root, col, i, d, x, y, z, kind) { const L = { col, i, d, x, y, z, kind: kind || 'shop' }; LIGHTS.push(L); return L; }

  /* ---------------------------------------------------- shared parts -- */
  const P1 = 0x2a2c32, CHROME = 0xb8bcc4, CONC = 0x8c8a86, CONC2 = 0x7d7b77;
  const BRICK = (x, y, z, a, b) => { const row = Math.floor(y / 0.25), off = row & 1 ? 0.25 : 0; return ((Math.floor((x + z + off) / 0.5)) % 7 === 0) ? (b || 0x7a3226) : (row % 4 === 0 ? (a || 0x8d3c2e) : 0x9c4635); };
  const GREYBRICK = (x, y, z) => { const row = Math.floor(y / 0.25), off = row & 1 ? 0.25 : 0; return ((Math.floor((x + z + off) / 0.5)) % 5 === 0) ? 0xa6a6a2 : (row % 3 === 0 ? 0xbdbdb8 : 0xb2b2ad); };
  /* an air-conditioning unit, the front facing +z (dir 1) or -z (dir -1) */
  function acUnit(P, x, y, z, dir) {
    const d = dir || 1, z0 = d > 0 ? z : z - 0.375, z1 = d > 0 ? z + 0.375 : z;
    P.box(x, y, z0, x + 0.75, y + 0.5625, z1, 0xd8d8d2);
    P.discZ(x + 0.4375, y + 0.28, 0.2, d > 0 ? z1 : z0 - 0.0625, d > 0 ? z1 + 0.0625 : z0, dd => dd < 0.06 ? 0x55555a : (Math.floor(dd * 32) % 2 ? 0x8a8a90 : 0x3a3a40));
    P.box(x + 0.0625, y + 0.0625, d > 0 ? z1 : z0 - 0.0625, x + 0.1875, y + 0.5, d > 0 ? z1 + 0.0625 : z0, 0xbdbdb6);
  }
  /* a window in a wall facing +z or -z: frame, sill, dark glass (lit at night: a separate glowing pane) */
  function windowAt(P, root, x, y, z, w, h, dir, o) {      // z: the wall's face
    o = o || {};
    const d = dir || 1, zo = d > 0 ? z : z - 0.125;
    P.box(x - 0.125, y - 0.125, zo, x + w + 0.125, y, zo + 0.125, o.sill || 0xc8c4bc);           // sill
    P.box(x - 0.125, y + h, zo, x + w + 0.125, y + h + 0.125, zo + 0.125, o.frame || 0x2a2c34);  // lintel
    P.box(x - 0.125, y, zo, x, y + h, zo + 0.125, o.frame || 0x2a2c34); P.box(x + w, y, zo, x + w + 0.125, y + h, zo + 0.125, o.frame || 0x2a2c34);
    if (o.bars) for (let bx = x + 0.25; bx < x + w; bx += 0.25) P.box(bx, y, zo + (d > 0 ? 0.125 : -0.0625), bx + 0.0625, y + h, zo + (d > 0 ? 0.1875 : 0), 0x3a3c42);
    const pane = glass(w, h, o.glass || 0x3a4658, 0.85); pane.material.depthWrite = true; put(root, pane, x + w / 2, y + h / 2, z + d * 0.01, d > 0 ? 0 : PI);
    if (o.lit !== false && hash(x, y) > 0.35) { const g = glass(w - 0.1, h - 0.1, o.warm === false ? 0xbfe0ff : 0xffd890, 0.7); put(root, g, x + w / 2, y + h / 2, z + d * 0.02, d > 0 ? 0 : PI); g.visible = false; NIGHT.push(g); }
  }
  /* an upper floor: a wall along the street from x0 to x1 at depth zf (dir: the way it faces), with windows */
  function upper(root, x0, x1, zf, dir, y0, y1, col, o) {
    o = o || {};
    const d = dir || 1, P = piece(0.25, x0, zf, 0.05), zb = zf - d * (o.depth || 10);
    const wall = typeof col === 'function' ? col : () => col;
    P.box(x0, y0, d > 0 ? zf - 0.25 : zf, x1, y1, d > 0 ? zf : zf + 0.25, wall);                        // the front
    P.box(x0, y0, Math.min(zf, zb), x0 + 0.25, y1, Math.max(zf, zb), wall); P.box(x1 - 0.25, y0, Math.min(zf, zb), x1, y1, Math.max(zf, zb), wall); // the sides
    P.box(x0, y1, Math.min(zf, zb), x1, y1 + 0.25, Math.max(zf, zb), o.roof || 0x6a6a70);              // the roof
    P.box(x0, y1 + 0.25, d > 0 ? zf - 0.25 : zf, x1, y1 + 0.75, d > 0 ? zf : zf + 0.25, o.parapet || 0x7a7a80); // the parapet
    P.mesh(root);
    const W = piece(0.125, x0, zf, 0.04), wy = o.wy || [y0 + 0.9], ww = o.ww || 1.5, wh = o.wh || 1.4;
    for (const yy of wy) for (let x = x0 + (o.wx0 || 1); x + ww < x1 - 0.5; x += o.step || 3) {
      windowAt(W, root, x, yy, zf, ww, wh, d, o);
      if (o.ac && hash(x, yy + 1) > 0.55) acUnit(W, x + ww + 0.25, yy - 0.3, zf, d);
    }
    W.mesh(root);
  }
  /* a payphone on a post, facing +z or -z */
  function payphone(root, x, z, dir) {
    const d = dir || 1, P = piece(0.0625, x, z, 0.04), zb = d > 0 ? z - 0.25 : z, zf = d > 0 ? z : z + 0.25;
    P.box(x - 0.0625, 0, z - 0.125, x + 0.0625, 1.0, z + 0.125, 0x55585e);                        // post
    P.box(x - 0.375, 1.0, zb - 0.0625, x + 0.375, 2.0, zf + 0.0625, 0x2a6a4a);                   // the box (green)
    P.box(x - 0.4375, 2.0, zb - 0.125, x + 0.4375, 2.125, zf + 0.125, 0x1e4a34);                 // hood
    const fz0 = d > 0 ? zf + 0.0625 : zb - 0.125, fz1 = fz0 + 0.0625;
    P.box(x - 0.3125, 1.125, fz0, x + 0.3125, 1.875, fz1, 0x22262c);                            // the face
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) P.box(x - 0.1875 + j * 0.125, 1.25 + i * 0.125, fz0 - 0.0625 * d, x - 0.125 + j * 0.125, 1.3125 + i * 0.125, fz1, 0xd8dce4); // keypad
    P.box(x + 0.0625, 1.5625, fz0, x + 0.25, 1.75, fz1, G(0x9ae8a0));                              // the little screen
    P.box(x - 0.3125, 1.25, fz0 - 0.0625 * d, x - 0.25, 1.75, fz1, 0x111114);                       // the receiver on its hook
    P.box(x - 0.3125, 1.75, fz0 - 0.0625 * d, x - 0.1875, 1.8125, fz1, 0x111114);
    P.mesh(root); solid(x - 0.45, Math.min(zb, zf) - 0.15, x + 0.45, Math.max(zb, zf) + 0.15);
  }
  /* a drinks vending machine (front facing +z or -z): cans behind the glass, a button under each, the readout, the slots, the flap */
  function vending(root, x0, zf, dir, body, top) {
    const d = dir || 1, F = 0.0625, x1 = x0 + 1.125, zb = zf - d * 0.75, P = piece(F, x0, zf, 0.03), H = 1.9375;
    const z = (a, b) => d > 0 ? [zf - b, zf - a] : [zf + a, zf + b];   // a depth band measured inward from the front
    const [c0, c1] = z(F, 0.75); P.box(x0, F, c0, x1, H, c1, body || 0xd8302a);                       // cabinet
    const [p0, p1] = z(0, F); P.box(x0, F, p0, x1, H, p1, 0xf2f2f4);                                     // the white front
    P.box(x0 + F, 1.6875, p0, x1 - F, H - F, p1, (X, Y) => Math.abs(Y - (1.78 + Math.sin((X - x0) * 9) * 0.04)) < 0.035 ? (body || 0xd8302a) : (top || 0xeaf3ff));
    const wx0 = x0 + 0.125, wx1 = x0 + 0.8125, wy0 = 0.75, wy1 = 1.625;
    const [g0, g1] = z(F, 3 * F); P.cut(wx0, wy0, Math.min(g0, g1), wx1, wy1, Math.max(g0, g1) + F);
    const [b0, b1] = z(3 * F, 4 * F); P.box(wx0, wy0, b0, wx1, wy1, b1, 0x1c2840);
    const DR = [0xd8302a, 0x3a9ae0, 0xf0c040, 0x5ab84a, 0xf07a2a, 0xe8e8f0, 0x8a4ac8];
    for (let r = 0; r < 3; r++) {
      const sy = wy0 + r * 0.3;
      const [s0, s1] = z(F, 3 * F); P.box(wx0, sy, s0, wx1, sy + F, s1, CHROME);
      for (let i = 0; i < 4; i++) {
        const cx = wx0 + F + i * 0.1625, col = DR[(r * 3 + i * 2) % DR.length];
        const [k0, k1] = z(2 * F, 3 * F); P.box(cx, sy + F, k0, cx + 0.125, sy + 0.25, k1, (X, Y) => Y >= sy + 0.1875 ? 0xd8dce4 : Y >= sy + 0.125 ? 0xf6f6f6 : col);
        const [u0, u1] = d > 0 ? [zf, zf + F] : [zf - F, zf]; P.box(cx + 0.03, sy, u0, cx + 0.09, sy + F, u1, r === 0 && i === 3 ? 0xff5a3a : 0xffd23a);
      }
    }
    const [f0, f1] = d > 0 ? [zf, zf + F] : [zf - F, zf];
    P.box(x0 + 0.875, 0.75, f0, x1 - F, 1.625, f1, 0x4a5060);                                            // the money panel
    P.box(x0 + 0.9375, 1.4375, f0, x1 - 0.125, 1.5625, f1, G(0xff4a30));                                  // red readout
    P.box(x0 + 0.9375, 1.1875, f0, x0 + 1.0, 1.3125, f1, 0x14161c); P.box(x0 + 0.9375, 1.0, f0, x1 - 0.125, 1.0625, f1, 0x14161c);
    const [h0, h1] = z(0, 3 * F); P.cut(x0 + 0.25, 0.1875, Math.min(h0, h1), x0 + 0.875, 0.4375, Math.max(h0, h1) + F);
    const [i0, i1] = z(3 * F, 4 * F); P.box(x0 + 0.25, 0.1875, i0, x0 + 0.875, 0.4375, i1, 0x14141a);  // where the can drops
    P.box(x0 + 0.25, 0.3125, p0, x0 + 0.875, 0.4375, p1, 0x7a808c);                                      // its flap
    P.mesh(root); solid(x0 - 0.05, Math.min(zf, zb) - 0.05, x1 + 0.05, Math.max(zf, zb) + 0.05);
    const lt = glass(0.65, 0.85, 0xfff4d8, 0.35); put(root, lt, x0 + 0.47, 1.19, zf - d * 0.1, d > 0 ? 0 : PI);
  }
  /* a slatted bench on two metal frames, facing +z or -z */
  function bench(root, x0, z, dir, len) {
    const d = dir || 1, L = len || 1.75, P = piece(0.0625, x0, z, 0.04), zb = d > 0 ? z - 0.5 : z, zf = zb + 0.5;
    for (const fx of [x0 + 0.125, x0 + L - 0.25]) { P.box(fx, 0, zb, fx + 0.125, 0.4375, zb + 0.0625, 0x3a3c42); P.box(fx, 0, zf - 0.0625, fx + 0.125, 0.4375, zf, 0x3a3c42); P.box(fx, 0.375, zb, fx + 0.125, 0.4375, zf, 0x3a3c42); }
    for (let i = 0; i < 4; i++) P.box(x0, 0.4375, zb + i * 0.125 + 0.0, x0 + L, 0.5, zb + i * 0.125 + 0.0625 + 0.03, 0xa8724a);
    const bz = d > 0 ? zb : zf - 0.0625;                                                                  // the back
    for (const fx of [x0 + 0.125, x0 + L - 0.25]) P.box(fx, 0.4375, bz, fx + 0.125, 1.0, bz + 0.0625, 0x3a3c42);
    for (const y of [0.625, 0.8125]) P.box(x0, y, bz, x0 + L, y + 0.125, bz + 0.0625, 0xa8724a);
    P.mesh(root); solid(x0, zb, x0 + L, zf);
  }
  function bin(root, cx, cz, col, o) {
    const P = piece(0.0625, cx, cz, 0.04);
    P.cyl(cx, cz, 0.25, 0, 0.8125, (X, Y) => Y >= 0.4375 && Y < 0.5625 ? 0xe8e8e2 : (col || 0x6a7480));
    P.cyl(cx, cz, 0.28, 0.8125, 0.875, 0x4a525c); P.cyl(cx, cz, 0.09, 0.875, 0.9375, 0x1a1a20);
    if (o && o.x) { P.box(cx - 0.125, 0.25, cz + 0.25, cx + 0.125, 0.375, cz + 0.3125, 0xf2c230); }
    P.mesh(root); solid(cx - 0.3, cz - 0.3, cx + 0.3, cz + 0.3);
  }
  function tires(root, cx, cz, n) {
    const P = piece(0.0625, cx, cz, 0.05);
    for (let i = 0; i < (n || 3); i++) { const y = i * 0.25; P.cyl(cx + (i & 1) * 0.05, cz, 0.36, y, y + 0.25, (X, Y, Z) => Math.hypot(X - cx - (i & 1) * 0.05 + 0.03, Z - cz + 0.03) < 0.16 ? -1 : (Y - y > 0.06 && Y - y < 0.18 ? 0x2a2a2e : 0x1c1c20)); }
    P.mesh(root); solid(cx - 0.4, cz - 0.4, cx + 0.4, cz + 0.4);
  }
  function cone(root, x, z) { const P = piece(0.0625, x, z, 0.04); P.box(x - 0.1875, 0, z - 0.1875, x + 0.1875, 0.0625, z + 0.1875, 0x1c1c20); for (let y = 0.0625; y < 0.6875; y += 0.0625) { const r = 0.15 * (1 - y / 0.75) + 0.03; P.cyl(x, z, r, y, y + 0.0625, y > 0.31 && y < 0.44 ? 0xf0f0f0 : 0xff6a1a); } P.mesh(root); }
  /* an A-frame board on the pavement with a picture each side; rot: its facing */
  function aframe(root, x, z, rot, draw, col) {
    const g = new THREE.Group(), P = piece(0.0625, 0, 0, 0.03);
    P.box(-0.3125, 0, -0.25, 0.3125, 1.0, -0.1875, col || 0x2a2a30); P.box(-0.3125, 0, 0.1875, 0.3125, 1.0, 0.25, col || 0x2a2a30); P.box(-0.3125, 0.9375, -0.25, 0.3125, 1.0, 0.25, col || 0x2a2a30);
    P.mesh(g);
    const f = sign(0.5, 0.75, draw, { lit: true }); f.position.set(0, 0.55, 0.26); g.add(f);
    const b = sign(0.5, 0.75, draw, { lit: true }); b.position.set(0, 0.55, -0.26); b.rotation.y = PI; g.add(b);
    g.position.set(x, 0, z); g.rotation.y = rot || 0; root.add(g); solid(x - 0.35, z - 0.35, x + 0.35, z + 0.35);
  }
  function planter(root, x0, z0, x1, z1, leaf) {
    const P = piece(0.0625, x0, z0, 0.05);
    P.box(x0, 0, z0, x1, 0.5, z1, BRICK); P.box(x0 + 0.0625, 0.4375, z0 + 0.0625, x1 - 0.0625, 0.5, z1 - 0.0625, 0x4a3426);
    for (let x = x0 + 0.125; x < x1 - 0.1; x += 0.0625) for (let z = z0 + 0.125; z < z1 - 0.1; z += 0.0625) { const h = hash(x * 9, z * 7); if (h > 0.45) P.box(x, 0.5, z, x + 0.0625, 0.5 + 0.2 + h * 0.5, z + 0.0625, h > 0.75 ? (leaf || 0x3a8a3a) : 0x4aa04a); }
    P.mesh(root); solid(x0, z0, x1, z1);
  }
  /* a potted plant: a snake plant (tall leaves) or a monstera (wide) */
  function pot(root, x, z, kind, potCol) {
    const P = piece(0.0625, x, z, 0.05);
    P.cyl(x, z, 0.2, 0, 0.375, potCol || 0x6a4a3a);
    if (kind === 'monstera') for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.2 + (i % 3) * 0.15; P.box(x + Math.cos(a) * r - 0.125, 0.5 + (i % 4) * 0.15, z + Math.sin(a) * r - 0.125, x + Math.cos(a) * r + 0.1875, 0.5625 + (i % 4) * 0.15, z + Math.sin(a) * r + 0.1875, i & 1 ? 0x2f7a3a : 0x3a9a48); }
    else for (let i = 0; i < 7; i++) { const a = i * 0.9, ox = Math.cos(a) * 0.09, oz = Math.sin(a) * 0.09; P.box(x + ox - 0.0313, 0.375, z + oz - 0.0313, x + ox + 0.0313, 0.8 + (i % 3) * 0.15, z + oz + 0.0313, (X, Y) => Math.floor(Y * 12) % 3 ? 0x3a7a3a : 0xc8d870); }
    P.mesh(root); solid(x - 0.25, z - 0.25, x + 0.25, z + 0.25);
  }

  /* ------------------------------------------------------------ the ground -- */
  function ground(root) {
    // the pavements, the alleys, the patio: half-metre slabs
    const A = piece(0.5, 0, 0, 0.03);
    const slab = (x, y, z) => ((Math.floor(x) + Math.floor(z)) & 1) ? 0xa8a196 : 0x9c958a;
    A.box(X0, -0.5, N, X1, 0, NC - 0.5, slab); A.box(X0, -0.5, NC - 0.5, X1, 0, NC, 0xbcb6ab);              // north pavement, kerb
    A.box(X0, -0.5, SC + 0.5, X1, 0, S, slab); A.box(X0, -0.5, SC, X1, 0, SC + 0.5, 0xbcb6ab);              // south pavement, kerb
    A.box(-3, -0.5, NC - 1, 3, 0, NC - 0.5, (x, y, z) => (Math.floor(x * 2) & 1) ? 0xe8b830 : 0xd8a828);    // tactile strip by Random Play
    A.box(9, -0.5, NC - 1, 12, 0, NC - 0.5, 0xe8b830); A.box(9, -0.5, SC + 0.5, 12, 0, SC + 1, 0xe8b830);  // and at the crossing
    A.box(-46, -0.5, NC - 1, -43, 0, NC - 0.5, 0xe8b830); A.box(-46, -0.5, SC + 0.5, -43, 0, SC + 1, 0xe8b830);
    const conc = (x, y, z) => hash(Math.floor(x), Math.floor(z)) > 0.85 ? CONC2 : CONC;
    A.box(-10.5, -0.5, -12, -6.5, 0, N, conc); A.box(-25, -0.5, -12, -21, 0, N, conc);                       // the alleys
    A.box(-15.5, -0.5, S, -11, 0, 17.5, conc);                                                              // the back road
    A.box(-37, -0.5, -7.5, -25, 0, N, (x, y, z) => ((Math.floor(x / 0.5) + Math.floor(z / 0.5)) & 1) ? 0xb0583a : 0xa04e34); // the cafe's patio
    A.box(-60, -0.5, -9, -52.5, 0, N, 0xc8c8c4);                                                             // the metro's apron
    A.box(-50, -0.5, -6.5, -41, 0, N, (x, y, z) => ((Math.floor(x) + Math.floor(z)) & 1) ? 0x6a6e76 : 0x5e626a);   // Box Galaxy's entrance
    A.box(-28, -0.5, 6.5, -15, 0, S, (x, y, z) => ((Math.floor(x * 2) + Math.floor(z * 2)) & 1) ? 0x1c1c20 : 0xe8e8e4); // Godfinger's chequers
    A.mesh(root, { cast: false });
    // the road, in quarters: its centre line, edge lines, two crossings, the manholes, arrows by the roadworks
    const R = piece(0.25, 0, 0, 0.03), mid = (NC + SC) / 2;
    R.box(X0, -0.25, NC, X1, 0, SC, (x, y, z) => {
      const cl = Math.abs(z - mid) < 0.13 && (((x - X0) % 3) < 1.6);
      const edge = Math.abs(z - (NC + 0.35)) < 0.13 || Math.abs(z - (SC - 0.35)) < 0.13;
      const cross = ((x >= 9 && x < 12) || (x >= -46 && x < -43)) && z > NC + 0.5 && z < SC - 0.5 && (Math.floor(z * 2) % 2 === 0);
      const arrow = x > 14 && x < 17 && Math.abs(z - (mid + 1.4)) < (x < 15 ? 0.35 : 0.13);
      for (const [mx, mz] of [[-3, mid - 0.4], [-25, mid + 0.8], [14, mid - 0.6], [-49, mid + 0.6]]) { const r = Math.hypot(x - mx + 0.12, z - mz + 0.12); if (r < 0.5) return r > 0.35 ? 0x5a5a60 : (Math.floor((x + z) * 6) & 1 ? 0x4a4a50 : 0x44444a); }
      return cross || cl || edge || arrow ? 0xe6e4dc : 0x3a3c43;
    });
    R.mesh(root, { cast: false });
    // the yellow and black kerb by Turbo
    const K = piece(0.25, 8, 0, 0.03); K.box(8, 0, NC - 0.5, 19, 0.0625, NC, (x) => Math.floor(x) & 1 ? 0xf2c230 : 0x1c1c20); K.mesh(root, { cast: false });
  }

  /* power poles along the north pavement: crossarms, transformers, a street lamp on each, the wires */
  function poles(root) {
    const xs = [-55, -43, -30.5, -19.5, -8.5, 7.25, 20];
    for (const px of xs) {
      const P = piece(0.125, px, -2.25, 0.03);
      P.box(px - 0.125, 0, -2.375, px + 0.125, 8.5, -2.125, 0x9a968c);
      P.box(px - 0.75, 7.75, -2.375, px + 0.75, 7.875, -2.125, 0x6a665e); P.box(px - 0.5, 7.0, -2.375, px + 0.5, 7.125, -2.125, 0x6a665e);
      for (const ix of [-0.625, 0, 0.625]) P.box(px + ix, 7.875, -2.3125, px + ix + 0.125, 8.0, -2.1875, 0xe8e8e0);   // insulators
      P.box(px + 0.125, 5.5, -2.5, px + 0.625, 6.25, -2.0, 0x8a8c90); P.box(px - 0.625, 5.75, -2.5, px - 0.125, 6.5, -2.0, 0x8a8c90); // transformers
      P.box(px - 0.0625, 0, -2.125, px + 0.0625, 2.5, -2.0, 0x4a4c52);                                                   // a conduit
      P.box(px - 0.25, 2.0, -2.125, px + 0.25, 2.75, -1.875, (x, y) => y > 2.5 ? 0xf2c230 : 0xe8e8e0);                    // a pole notice
      P.box(px - 0.125, 5.0, -2.25, px + 0.125, 5.125, -0.75, 0x4a4c52); P.box(px - 0.25, 4.75, -1.0, px + 0.25, 5.0, -0.5, G(0xfff0c0)); // the lamp
      P.mesh(root); solid(px - 0.25, -2.5, px + 0.25, -2.0);
      light(root, 0xffd8a0, 0.55, 9, px, 4.6, -0.75, 'lamp');
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1a1e });
    for (let i = 0; i < xs.length - 1; i++) for (const off of [-0.6, 0, 0.6]) {
      const a = xs[i] + off, b = xs[i + 1] + off, pts = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector3(a + (b - a) * t, 7.95 - Math.sin(t * PI) * 0.7, -2.25)); }
      root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.02, 4), mat));
    }
    // wires across the street to the south side's walls
    for (const px of [-30.5, -8.5, 20]) { const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new THREE.Vector3(px + t * 1.5, 7.5 - Math.sin(t * PI) * 0.5 - t * 1.2, -2.25 + t * 10.1)); } root.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.018, 4), mat)); }
    // lamp posts along the south pavement
    for (const px of [-50.5, -23.5, -0.5, 14.5]) {
      const P = piece(0.125, px, 6.5, 0.03);
      P.box(px - 0.125, 0, 6.375, px + 0.125, 5.0, 6.625, 0x5a5c62); P.box(px - 0.125, 4.875, 5.25, px + 0.125, 5.0, 6.625, 0x5a5c62); P.box(px - 0.25, 4.625, 5.0, px + 0.25, 4.875, 5.5, G(0xfff0c0));
      P.mesh(root); solid(px - 0.2, 6.3, px + 0.2, 6.7);
      light(root, 0xffd8a0, 0.5, 8, px, 4.4, 5.25, 'lamp');
    }
  }

  /* ------------------------------------------------------- Random Play --
     From the official shots: a red-brown brick building; at street level a
     yellow board-and-batten storefront in a navy frame (a navy door with a
     wired-glass light, a lamp over it, the big window with a film poster and
     stickers), a navy sign band (the white italic "Random Play", play and pause
     icons, a placard: SALES / RENTALS, VCR RENTALS, OPEN 365 DAYS) over a yellow
     canopy; to the left, brick with a board of film posters, a yellow box on a
     stool, a snake plant and a watering can on a low bench. Upstairs, brick and
     three windows; a railing round the roof. The black stair with the orange
     rail climbs Turbo's side. Inside (the shop shots): a mesh-panelled counter
     with stickers and a Bangboo plush, the logo painted on the brick, posters on
     a red pegboard, an oil-drum sofa, an orange TV, a monstera in a drum; the
     back room's wall of monitors (the H.D.D.). */
  const RP = {};
  function randomPlay(root) {
    const s = 0.25, { x0, x1, z0, z1 } = STORE, H1 = 3.5, H2 = 7.0, NAVY = 0x1d2738, NAVY2 = 0x141c2a, YEL = 0xf2c230, YEL2 = 0xd8aa22;
    const B = piece(s, x0, z0, 0.06), zf = z1 - 0.25;
    // the shell (no two surfaces in the same plane: they flicker against each other)
    B.box(x0 - 0.25, 0, z0, x0, H1, zf, BRICK); B.box(x1, 0, z0, x1 + 0.25, H1, zf, BRICK); B.box(x0 - 0.25, 0, z0 - 0.25, x1 + 0.25, H1, z0, BRICK);
    B.box(x0, -0.25, z0, x1, 0.01, z1, (x) => (Math.floor(x / 0.5) & 1) ? 0x8a6a4a : 0x7b5d41);
    B.box(x0, 0, z0, x0 + 0.25, 1.0, zf, 0x2f3d4c); B.box(x1 - 0.25, 0, z0, x1, 1.0, zf, 0x2f3d4c); B.box(x0, 0, z0, x1, 1.0, z0 + 0.25, 0x2f3d4c);
    B.box(x0, 1.0, z0, x0 + 0.25, H1, zf, BRICK); B.box(x1 - 0.25, 1.0, z0, x1, H1, zf, 0xe6d9bd); B.box(x0, 1.0, z0, x1, H1, z0 + 0.25, 0xe6d9bd);
    B.mesh(root);
    solid(x0 - 0.3, z0, x0, z1); solid(x1, z0, x1 + 0.3, z1); solid(x0, z0 - 0.3, x1, z0);
    // the front: brick to the left, the yellow storefront from x -2.5
    const F = piece(0.125, x0, z1, 0.05), fz = z1 - 0.25;
    F.box(x0 - 0.25, 0, fz, -2.5, H1, z1, BRICK);
    F.box(-2.5, 0, fz, x1 + 0.25, H1, z1, (x, y) => (y < 0.375 || y >= 3.0) ? NAVY : (x < -2.25 || x >= x1) ? NAVY : (Math.floor(x / 0.125) % 4 === 0 ? YEL2 : YEL));
    F.cut(STORE.door0, 0, fz, STORE.door1, 2.625, z1);                                                    // the door
    F.box(STORE.door0 - 0.125, 0, fz - 0.06, STORE.door0, 2.75, z1 + 0.06, NAVY); F.box(STORE.door1, 0, fz - 0.06, STORE.door1 + 0.125, 2.75, z1 + 0.06, NAVY); F.box(STORE.door0 - 0.125, 2.625, fz - 0.06, STORE.door1 + 0.125, 2.75, z1 + 0.06, NAVY);
    F.box(STORE.door0, 0, fz - 1.0, STORE.door0 + 0.125, 2.5, fz - 0.125, NAVY2);                         // the door leaf, swung in against the wall
    F.box(STORE.door0 + 0.0, 1.375, fz - 0.875, STORE.door0 + 0.1875, 2.125, fz - 0.375, 0x9ab0c8);         // its wired-glass light
    F.box(-0.1875, 2.75, z1, 0.1875, 2.875, z1 + 0.125, G(0xfff0c0)); F.box(-0.25, 2.875, z1, 0.25, 2.9375, z1 + 0.1875, 0x2a2a30); // the lamp over it
    F.cut(1.75, 0.625, fz, 5.625, 2.625, z1);                                                              // the window
    F.box(1.625, 0.5, fz - 0.06, 5.75, 0.625, z1 + 0.06, NAVY); F.box(1.625, 2.625, fz - 0.06, 5.75, 2.75, z1 + 0.06, NAVY);
    F.box(1.625, 0.5, fz - 0.06, 1.75, 2.75, z1 + 0.06, NAVY); F.box(5.625, 0.5, fz - 0.06, 5.75, 2.75, z1 + 0.06, NAVY); F.box(3.625, 0.625, fz - 0.06, 3.75, 2.625, z1 + 0.06, NAVY);
    for (const [sx, sy, c] of [[5.25, 0.875, 0xff4a7a], [5.375, 1.0, 0x4ae8f0], [2.0, 0.75, 0xf2c230]]) F.box(sx, sy, z1 + 0.02, sx + 0.25, sy + 0.25, z1 + 0.07, c); // stickers
    // the canopy and the sign band
    F.box(-2.5, 2.875, z1, x1 + 0.25, 3.125, z1 + 0.5, (x, y) => y < 2.95 ? 0x3a3020 : YEL);
    F.box(x0 - 0.25, 3.125, fz, x1 + 0.25, 3.875, z1 + 0.125, NAVY);
    // left: the poster board, the yellow box on its stool, a snake plant, the watering can on a low bench
    F.box(-5.875, 0.875, z1, -2.875, 2.625, z1 + 0.0625, 0x1a1a1e);
    F.box(-5.25, 0, z1 + 0.125, -4.75, 0.625, z1 + 0.5, 0x6a4a32); F.box(-5.3125, 0.625, z1 + 0.0625, -4.6875, 1.125, z1 + 0.5, YEL); F.box(-5.125, 0.875, z1 + 0.5, -4.875, 0.9375, z1 + 0.5625, 0x1a1a1e);
    F.box(-3.75, 0, z1 + 0.25, -2.75, 0.3125, z1 + 0.625, 0x8a6a4a); F.box(-3.4375, 0.3125, z1 + 0.3125, -3.0625, 0.5625, z1 + 0.5625, 0x3a8ad8); F.box(-3.0625, 0.4375, z1 + 0.375, -2.875, 0.5, z1 + 0.4375, 0x3a8ad8);
    F.box(5.125, 0, z1 + 0.125, 5.875, 0.5, z1 + 0.75, 0xb08a5a); F.box(5.25, 0.25, z1 + 0.75, 5.5, 0.4375, z1 + 0.8125, 0x3a7ad8); F.box(5.5, 0.125, z1 + 0.75, 5.6875, 0.25, z1 + 0.8125, 0xff4a7a); // a stickered box
    RP.front = F.mesh(root);
    pot(root, -4.1, z1 + 0.35, 'snake', 0x3a3a40);
    // the film posters (black and white), the sign, the placard, the window poster
    const pb = sign(3.0, 1.75, (c, w, h) => { for (let i = 0; i < 6; i++) { const px = (i % 3) * w / 3, py = Math.floor(i / 3) * h / 2; c.save(); c.translate(px + w * 0.015, py + h * 0.03); poster(c, w / 3 - w * 0.03, h / 2 - h * 0.06, i + 3, ['#e8e8e4', '#bdbdb8', '#55555a', '#222226', '#8a8a8e']); c.restore(); } }, { lit: true });
    put(RP.front, pb, -4.375 - RP.front.position.x, 1.75 - RP.front.position.y, z1 + 0.07 - RP.front.position.z);
    const sg = sign(12.4, 0.74, (c, w, h) => {
      c.fillStyle = '#1d2738'; c.fillRect(0, 0, w, h);
      text(c, 'Random Play', w * 0.56, h * 0.53, h * 0.66, '#f4f4f0', { w: '700 italic', fam: 'Rubik, sans-serif' });
      for (const [k, ic] of [[0.86, 'p'], [0.92, 'q']]) { c.fillStyle = '#f4f4f0'; c.beginPath(); c.arc(w * k, h / 2, h * 0.3, 0, PI * 2); c.fill(); c.fillStyle = '#1d2738'; if (ic === 'p') { c.beginPath(); c.moveTo(w * k - h * 0.08, h * 0.36); c.lineTo(w * k + h * 0.14, h / 2); c.lineTo(w * k - h * 0.08, h * 0.64); c.fill(); } else { c.fillRect(w * k - h * 0.11, h * 0.36, h * 0.07, h * 0.28); c.fillRect(w * k + h * 0.04, h * 0.36, h * 0.07, h * 0.28); } }
      c.strokeStyle = '#f4f4f0'; c.lineWidth = 2; c.strokeRect(w * 0.03, h * 0.14, w * 0.16, h * 0.72);
      text(c, 'SALES / RENTALS', w * 0.11, h * 0.3, h * 0.15, '#f4f4f0', { w: 800 }); text(c, 'VCR RENTALS', w * 0.11, h * 0.5, h * 0.15, '#f4f4f0', { w: 800 }); text(c, 'OPEN 365 DAYS', w * 0.11, h * 0.7, h * 0.15, '#f4f4f0', { w: 800 });
    });
    put(RP.front, sg, -RP.front.position.x, 3.5 - RP.front.position.y, z1 + 0.135 - RP.front.position.z);
    const wp = sign(1.7, 1.8, (c, w, h) => { poster(c, w, h, 42, ['#2a3a6a', '#d84a3a', '#f2c230', '#e8e8e4', '#141416']); text(c, 'STARLIGHT', w / 2, h * 0.12, h * 0.1, '#f2c230', { fam: DISP }); }, { lit: true });
    const wp2 = sign(1.7, 1.8, (c, w, h) => { poster(c, w, h, 77); text(c, 'NEW RELEASES', w / 2, h * 0.12, h * 0.09, '#fff', { fam: DISP }); }, { lit: true });
    for (const [m, x] of [[wp, 2.7], [wp2, 4.7]]) { m.position.set(x - RP.front.position.x, 1.62 - RP.front.position.y, z1 - 0.45 - RP.front.position.z); RP.front.add(m); }  // they go with the front
    for (const cx of [2.69, 4.69]) { const gl = glass(1.88, 2.0); gl.position.set(cx - RP.front.position.x, 1.625 - RP.front.position.y, z1 - 0.13 - RP.front.position.z); RP.front.add(gl); }
    solid(x0 - 0.3, z1 - 0.3, STORE.door0, z1 + 0.05); solid(STORE.door1, z1 - 0.3, x1 + 0.3, z1 + 0.05); solid(-5.4, z1, -2.7, z1 + 0.7); solid(5.1, z1, 5.9, z1 + 0.85);
    // what stands in for the front while it is cut away: its bottom rail
    const Lw = piece(s, x0, z1); Lw.box(x0 - 0.25, 0, fz, STORE.door0, 0.25, z1, NAVY); Lw.box(STORE.door1, 0, fz, x1 + 0.25, 0.25, z1, NAVY);
    RP.low = Lw.mesh(root); RP.low.visible = false;
    // upstairs: brick, three windows, the roof edge, a railing round the roof
    const U2 = piece(s, x0, z0, 0.06);
    U2.box(x0 - 0.25, H1, z0 - 0.25, x1 + 0.25, H2, z1, (x, y, z) => (z > z0 && z < z1 - 0.3 && x > x0 && x < x1 && y > H1 + 0.24) ? -1 : BRICK(x, y, z));
    for (const wx of [-4.5, -1.5, 1.5]) U2.cut(wx, 4.5, z1 - 0.25, wx + 2, 6, z1);
    U2.box(x0 - 0.5, H2, z0 - 0.5, x1 + 0.5, H2 + 0.25, z1 + 0.25, 0x5a5e66);
    U2.box(x0 + 0.25, H1 - 0.25, z0 + 0.25, x1 - 0.25, H1, z1 - 0.25, 0x3a3a40);
    RP.upper = U2.mesh(root);
    const RR = piece(0.125, x0, z0, 0.03);                                                                   // the roof railing
    for (let x = x0 - 0.25; x <= x1 + 0.25; x += 1) RR.box(x, H2 + 0.25, z1 + 0.0, x + 0.125, H2 + 1.1, z1 + 0.125, 0x3a3c42);
    RR.box(x0 - 0.25, H2 + 1.0, z1, x1 + 0.375, H2 + 1.125, z1 + 0.125, 0x3a3c42); RR.box(x0 - 0.25, H2 + 0.6, z1, x1 + 0.375, H2 + 0.6625, z1 + 0.125, 0x3a3c42);
    const rr = RR.mesh(root); RP.upper.add(rr); rr.position.sub(RP.upper.position);
    for (const wx of [-3.5, -0.5, 2.5]) { const gl = glass(2, 1.5, 0xffd890, 0.55); gl.position.set(wx - RP.upper.position.x, 5.25 - RP.upper.position.y, z1 - 0.13 - RP.upper.position.z); RP.upper.add(gl); }
    const AC = piece(0.0625, 4, z1, 0.03); acUnit(AC, 4.0, 3.95, z1, 1); const ac = AC.mesh(root); RP.upper.add(ac); ac.position.sub(RP.upper.position);
    // the stair up Turbo's side: black steps, an orange rail
    const STR = piece(0.125, x1, z1, 0.03);
    for (let i = 0; i < 14; i++) STR.box(x1 + 0.3, i * 0.25, z1 - 1.0 - i * 0.4, x1 + 1.5, i * 0.25 + 0.125, z1 - 0.6 - i * 0.4, 0x2a2c32);
    STR.box(x1 + 1.375, 0, z1 - 6.4, x1 + 1.5, 4.2, z1 - 0.6, (x, y, z) => (Math.abs(y - (z1 - 0.6 - z) * 0.62 - 0.9) < 0.07) ? 0xc8642a : (Math.abs(y - (z1 - 0.6 - z) * 0.62 - 0.5) < 0.04 ? 0x2a2c32 : -1));
    for (let i = 0; i < 14; i += 3) STR.box(x1 + 1.375, i * 0.25, z1 - 0.8 - i * 0.4, x1 + 1.5, i * 0.25 + 0.95, z1 - 0.675 - i * 0.4, 0x2a2c32);
    STR.mesh(root); solid(x1 + 0.3, z0 + 0.5, x1 + 1.6, z1 - 0.5);
    insideRP(root);
    spot('rp:window', 3.6, z1 + 1.2, PI, 'look'); spot('rp:door', -1.8, z1 + 0.9, 0.4, 'lean');
    spot('rp:night', 1.8, z1 + 1.6, 0.2, 'stand');
  }
  function insideRP(root) {
    const s = 0.125, TAPES = [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x3ab87a, 0xe86ab0, 0xf0f0f0, 0x2a2a30, 0xff8a3a, 0x8a5ad8, 0x5fe8e0];
    const WOOD = 0x5a3a28, WOOD2 = 0x6e4a32, I = piece(s, -6, -14, 0.04);
    const shelf = (xa, xb, za, zb, h, faceX) => {
      I.box(xa, 0, za, xb, h, zb, (x, y, z) => {
        const row = Math.abs((y % 0.5)) < 0.12, frame = row || z < za + 0.12 || z >= zb - 0.13 || y >= h - 0.13;
        const back = faceX > 0 ? x < xa + 0.13 : x >= xb - 0.13;
        if (frame || back) return frame ? WOOD : WOOD2;
        return TAPES[Math.floor(hash(Math.floor(z / 0.125), Math.floor(y / 0.5)) * TAPES.length)];
      });
    };
    shelf(-5.75, -5.25, -11.0, -5.25, 2.25, 1); solid(-6, -11.0, -5.2, -5.25);
    shelf(-2.75, -2.25, -10.75, -6.75, 1.5, -1); shelf(-2.25, -1.75, -10.75, -6.75, 1.5, 1); solid(-2.8, -10.8, -1.7, -6.7);
    // the counter: a dark metal frame round mesh panels, stickers; the shop computer, the till, a Bangboo plush, a radio
    I.box(1.5, 0, -8.75, 4.75, 1.0, -7.75, (x, y, z) => {
      if (y >= 0.875) return 0x3a3c44;
      const edge = x < 1.625 || x >= 4.625 || y < 0.125 || z < -8.625 || Math.abs((x - 1.5) % 1.0) < 0.07;
      if (edge) return 0x22242a;
      if (z > -7.875 && ((Math.floor(x / 0.125) + Math.floor(y / 0.125)) % 2 === 0)) return 0x2e3036;
      if (z > -7.875 && hash(Math.floor(x * 2), Math.floor(y * 3)) > 0.8) return [0xff4a7a, 0xf2c230, 0x4ae8f0, 0xf0f0f0][Math.floor(hash(x, y) * 4)];
      return 0x46484e;
    });
    I.box(1.875, 1.0, -8.5, 2.75, 1.125, -8.0, 0x2a2a30); I.box(2.0, 1.125, -8.4, 2.625, 1.75, -8.275, 0x1c1c22); I.box(2.0, 1.25, -8.275, 2.625, 1.625, -8.15, G(0x5ad0ff));
    I.box(3.625, 1.0, -8.5, 4.25, 1.375, -8.0, 0x8a8c94); I.box(3.75, 1.375, -8.375, 4.125, 1.5, -8.125, G(0x7aff9a));
    I.box(3.0, 1.0, -8.375, 3.375, 1.375, -8.0, 0xf0f0ee); I.box(3.0, 1.125, -8.0, 3.375, 1.25, -7.875, 0x111114);     // a Bangboo plush
    I.box(3.0625, 1.375, -8.25, 3.125, 1.625, -8.125, 0xf0f0ee); I.box(3.25, 1.375, -8.25, 3.3125, 1.625, -8.125, 0xf0f0ee); // the plush's ears
    I.box(4.375, 1.0, -8.375, 4.625, 1.25, -8.0, 0x8a8c94);
    solid(1.45, -8.8, 4.8, -7.7);
    // an oil-drum sofa in the window, chequered cushions; a monstera in a drum; a red cabinet; the orange TV
    for (const dx of [3.875, 5.0]) for (let i = 0; i < 6; i++) I.box(dx, 0.0625 + i * 0.0625, -6.0 + Math.abs(i - 2.5) * 0.04, dx + 0.875, 0.125 + i * 0.0625, -5.0 - Math.abs(i - 2.5) * 0.04, (x) => Math.abs(((x - dx) % 0.4375)) < 0.07 ? 0xa85a1a : 0xd8782a);
    I.box(3.875, 0.4375, -5.875, 5.875, 0.5625, -5.125, (x, y, z) => ((Math.floor(x / 0.25) + Math.floor(z / 0.25)) & 1) ? 0x1c1c20 : 0xe8e8e4);
    I.box(3.875, 0.5, -6.0, 5.875, 0.9375, -5.875, (x) => ((Math.floor(x / 0.25)) & 1) ? 0x1c1c20 : 0xe8e8e4);
    solid(3.7, -6.05, 5.95, -4.95);
    I.box(-5.75, 0, -5.5, -5.0, 0.75, -4.75, (x, y) => Math.abs(y - 0.375) < 0.07 ? 0x55585e : 0x24262c);
    I.box(5.25, 0, -11.0, 5.875, 1.5, -10.25, 0xb8302a); I.box(5.25, 1.25, -10.9, 5.3, 1.4, -10.35, 0xd8d8d0);
    I.box(5.375, 2.0, -7.5, 5.875, 2.625, -6.75, 0xe0782a); I.box(5.3125, 2.125, -7.375, 5.375, 2.5, -6.875, G(0x9ae8ff)); I.box(5.75, 1.875, -7.25, 5.875, 2.0, -7.0, 0x2a2a30);
    // the back room: the H.D.D. -- a wall of monitors, the desk, the chair, the shelves of tapes and a boombox
    I.box(-6, 0, -11.5, -0.75, 2.5, -11.25, 0x2a3a52); I.box(3.75, 0, -11.5, 6, 2.5, -11.25, 0x2a3a52);
    I.box(-0.75, 2.25, -11.5, 3.75, 2.5, -11.25, 0x2a3a52);
    solid(-6, -11.55, -0.75, -11.2); solid(3.75, -11.55, 6, -11.2);
    I.box(-0.5, 0, -13.75, 3.5, 0.875, -13.125, 0x2a2c32); I.box(-0.5, 0.75, -13.75, 3.5, 0.875, -13.125, 0x3a3c44);
    for (let mx = -1.5; mx < 5.5; mx += 0.875) for (let my = 1.0; my < 3.2; my += 0.6875) {
      if (my < 1.6 && mx > -0.6 && mx < 3.4) continue;
      I.box(mx, my, -13.875, mx + 0.75, my + 0.625, -13.625, 0x1a1c22);
      I.box(mx + 0.0625, my + 0.0625, -13.625, mx + 0.6875, my + 0.5625, -13.5625, G(hash(mx, my) > 0.75 ? 0x9af4ff : hash(mx * 3, my) > 0.4 ? 0x2a7aa8 : 0x5fe8e0));
    }
    I.box(0.25, 0.875, -13.75, 2.75, 2.375, -13.625, 0x16161a); I.box(0.375, 1.0, -13.625, 2.625, 2.25, -13.5, (x, y) => G(((Math.floor(x * 8) + Math.floor(y * 8)) % 5 === 0) ? 0x9af4ff : (y > 1.7 ? 0x2a7aa8 : 0x1f5a88)));
    I.box(1.0, 0, -12.875, 2.0, 0.5, -12.0, 0x1c1c22); I.box(1.0, 0.5, -12.875, 2.0, 1.625, -12.6875, 0xf0f0ee); I.box(1.25, 0.75, -12.75, 1.75, 1.5, -12.6875, 0xb8302a); I.box(1.125, 0.5, -12.625, 1.875, 0.625, -12.125, 0x2a2a30);
    I.box(-5.875, 0, -13.75, -5.375, 2.25, -11.75, (x, y) => (Math.abs(y % 0.5) < 0.12) ? WOOD : TAPES[Math.floor(hash(x * 9, y * 4) * TAPES.length)]);
    I.box(-5.875, 2.25, -13.5, -5.5, 2.5, -12.75, 0x8a8c94); I.box(-5.5, 2.3125, -13.375, -5.4375, 2.4375, -13.125, 0x2a2a30);
    for (let x = -0.25; x < 5; x += 0.375) I.box(x, 0, -12.75 + Math.sin(x * 3) * 0.25, x + 0.375, 0.0625 + 0.06, -12.625 + Math.sin(x * 3) * 0.25, 0x111114);
    solid(-0.6, -14, 3.6, -13.05); solid(1.0, -12.9, 2.0, -12.0); solid(-6, -13.8, -5.3, -11.7);
    I.mesh(root);
    pot(root, -5.375, -6.25, 'monstera', 0x24262c);
    // the logo painted on the brick, the pegboard posters, the H.D.D. badge
    const logo = sign(2.0, 1.0, (c, w, h) => { c.fillStyle = 'rgba(235,225,205,.95)'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.48, h * 0.46, -0.08, 0, PI * 2); c.fill(); text(c, 'Random', w * 0.5, h * 0.36, h * 0.32, '#f4f4f0', { w: '800 italic', stroke: '#55555a', lw: 4 }); text(c, 'Play', w * 0.58, h * 0.68, h * 0.32, '#f4f4f0', { w: '800 italic', stroke: '#55555a', lw: 4 }); }, { lit: true });
    put(root, logo, 4.875, 1.5, -11.22);
    const peg = sign(1.6, 1.0, (c, w, h) => { c.fillStyle = '#b8302a'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.35)'; for (let x = 6; x < w; x += 12) for (let y = 6; y < h; y += 12) c.fillRect(x, y, 3, 3); for (let i = 0; i < 2; i++) { c.save(); c.translate(w * (0.08 + i * 0.47), h * 0.1); poster(c, w * 0.4, h * 0.8, 20 + i); c.restore(); } }, { lit: true });
    put(root, peg, 5.86, 1.9, -9.4, -PI / 2);
    const hdd = sign(0.8, 0.4, (c, w, h) => { c.fillStyle = '#e8e8e4'; c.beginPath(); c.arc(w / 2, h / 2, h * 0.48, 0, PI * 2); c.fill(); text(c, 'H.D.D.', w / 2, h / 2, h * 0.36, '#1d2738', { w: 900 }); });
    put(root, hdd, 1.5, 2.6, -13.49);
    const l1 = light(root, 0xffe0b0, 0.8, 9, 1, 3.0, -8); const l2 = light(root, 0x5ad0ff, 0.9, 6, 1.5, 2.0, -12.6);
    l1.inside = l2.inside = true;
  }

  /* ------------------------------------------------------------ Turbo --
     Enzo's remodeling shop, built from shipping containers: teal, an orange
     band low down, stacked two high in an orange steel frame; the vertical TURBO
     sign and the "TURBO 改造" mark, round portholes, a door with a porthole up two
     metal steps, an orange ramp, a turbo housing bolted to the side; a railing
     round the roof (you can stand up there in the game). */
  function turbo(root) {
    const P = piece(0.125, 8, -12, 0.05), TEAL = 0x2f6f62, TEAL2 = 0x285f54, OR = 0xd8642a, OR2 = 0xb8521e;
    const rib = (x, y, z, low) => { const r = Math.floor((x + z) / 0.25) & 1; if (low && y < low) return r ? OR : OR2; return r ? TEAL : TEAL2; };
    P.box(8.5, 0, -10.75, 17.5, 2.75, -4.5, (x, y, z) => rib(x, y, z, 0.875));                    // the lower container
    P.box(8.5, 0, -10.75, 17.5, 0.125, -4.5, 0x1c1c20); P.box(8.5, 2.625, -10.75, 17.5, 2.75, -4.5, 0x24504a);
    P.box(9.0, 2.75, -10.25, 15.5, 5.375, -5.0, (x, y, z) => rib(x, y, z));                           // the upper container
    P.box(9.0, 5.25, -10.25, 15.5, 5.375, -5.0, 0x24504a);
    P.cut(11.0, 0.125, -4.625, 12.25, 2.25, -4.5);                                                    // the door
    P.box(11.0, 0.125, -4.75, 12.25, 2.25, -4.625, 0x8a9098); P.discZ(11.625, 1.6, 0.22, -4.5, -4.4375, d => d > 0.15 ? 0x5a5e66 : 0x2a3a4a);
    P.box(11.0, 1.0, -4.5, 11.125, 1.1875, -4.4375, 0x2a2c32);
    for (let i = 0; i < 2; i++) P.box(10.75, i * 0.15, -4.5 + 0.0, 12.5, i * 0.15 + 0.125, -4.0 + i * 0.25 + 0.0, 0x3a3c42);    // two steps
    for (const sx of [10.75, 12.375]) P.box(sx, 0, -4.0, sx + 0.125, 1.0, -3.875, 0x2a2c32);
    for (let i = 0; i < 6; i++) P.box(13.0, i * 0.03, -4.5 + i * 0.25, 15.0, i * 0.03 + 0.0625, -4.25 + i * 0.25, OR);      // the ramp
    P.discZ(16.2, 1.7, 0.45, -4.5, -4.375, d => d > 0.35 ? 0x8a8c90 : (Math.floor(d * 20) & 1 ? 0x55585e : 0x3a3c42));   // the turbo housing
    P.discZ(16.2, 1.7, 0.18, -4.375, -4.25, 0x2a2c32);
    for (const px of [10.0, 14.25]) P.discZ(px, 4.1, 0.32, -5.0, -4.875, d => d > 0.24 ? 0xd8642a : 0x9ac8d8);               // portholes
    // the orange frame
    for (const [a, b] of [[17.5, 17.75], [19.0, 19.25]]) for (const zz of [-10.5, -4.625]) P.box(a, 0, zz, b, 6.5, zz + 0.25, OR);
    for (const y of [2.75, 5.0, 6.375]) P.box(17.5, y, -10.5, 19.25, y + 0.125, -4.375, OR);
    for (let i = 0; i < 9; i++) { const y = i * 0.25; P.box(17.75 + (i % 2) * 0.6, y + 0.25, -4.625, 17.875 + (i % 2) * 0.6, y + 0.5, -4.5, OR); }
    // the roof railing
    for (let x = 8.5; x <= 17.5; x += 1) P.box(x, 2.75, -4.625, x + 0.125, 3.75, -4.5, 0x3a3c42);
    P.box(8.5, 3.625, -4.625, 17.625, 3.75, -4.5, OR);
    P.mesh(root); solid(8.4, -10.8, 17.6, -4.4); solid(17.4, -10.6, 19.3, -4.3); solid(10.7, -4.5, 12.6, -3.85);
    const t = sign(0.7, 2.4, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); for (const [i, ch] of ['T', 'U', 'R', 'B', 'O'].entries()) text(c, ch, w / 2, h * (0.12 + i * 0.19), h * 0.17, 'rgba(0,0,0,0)', { fam: DISP, stroke: '#e86a2a', lw: 6 }); });
    put(root, t, 15.15, 4.05, -4.98);
    const m = sign(1.2, 0.7, (c, w, h) => { text(c, 'TURBO', w / 2, h * 0.3, h * 0.3, '#e8f0ec', { fam: DISP }); text(c, '改造', w / 2, h * 0.7, h * 0.32, '#e8f0ec', { fam: CJK, w: 900 }); }, { lit: true });
    put(root, m, 13.0, 4.2, -4.98);
    const sl = sign(1.4, 0.45, (c, w, h) => { c.fillStyle = '#e86a2a'; c.fillRect(0, 0, w, h); text(c, 'BURN WHILE YOU RUN!', w / 2, h / 2, h * 0.4, '#1a2a26', { fam: DISP }); }, { lit: true });
    put(root, sl, 9.6, 1.9, -4.48);
    tires(root, 9.4, -3.9, 3); tires(root, 8.9, -3.4, 2);
    spot('turbo:door', 11.6, -3.3, PI, 'look'); spot('turbo:bike', 16.2, -2.6, 0.9, 'tinker'); spot('turbo:ramp', 14.2, -2.9, PI - 0.3, 'stand');
    light(root, 0xffc890, 0.4, 5, 11.6, 2.4, -3.6, 'lamp');
  }

  /* ---------------------------------------------------- Waterfall Soup --
     General Chop's noodle shop: an open counter on the street with red-topped
     stools on green posts, a band of red and white waves over the front, a
     sloped tiled awning; above it the big painted board (a koi leaping a bowl of
     noodles out of the waves), the white board with "瀑汤谷" in black brush
     strokes and a red seal, a red lightbox down the corner ("锦鲤面馆"), another
     standing on the pavement; carp-head lanterns at the corners; a scooter. */
  function waterfallSoup(root) {
    const x0 = -21, x1 = -10.5, P = piece(0.125, x0, -14, 0.05);
    P.box(x0, 0, -14, x0 + 0.25, 3.25, -4, CONC2); P.box(x1 - 0.25, 0, -14, x1, 3.25, -4, CONC2);
    P.box(x0 + 0.25, -0.125, -8.5, x1 - 0.25, 0.01, -4.5, 0x6a6a64);                                                    // kitchen floor
    P.box(x0 + 0.25, 2.875, -8.5, x1 - 0.25, 3.25, -4.25, 0x3a3430);                                                     // its ceiling
    P.box(x0 + 0.25, 0, -8.75, x1 - 0.25, 2.875, -8.5, (x, y) => ((Math.floor(x / 0.25) + Math.floor(y / 0.25)) & 1) ? 0xe8e4dc : 0xd0ccc4);
    P.box(x0 + 0.5, 0, -8.5, x1 - 0.5, 1.0, -7.75, 0x8a8c94);                                                           // the range
    for (const px of [-19.75, -17.25, -14.5]) { P.cyl(px, -8.1, 0.32, 1.0, 1.55, 0x5a5a60); P.cyl(px, -8.1, 0.26, 1.5, 1.56, 0xd8c8a0); }
    P.box(-18.0, 1.75, -8.5, -12.25, 1.875, -8.25, 0x3a2a20); for (let x = -17.875; x < -12.4; x += 0.375) P.cyl(x + 0.12, -8.37, 0.12, 1.875, 2.0, 0xe8e8e0);
    P.box(-20.5, 1.75, -8.5, -19.0, 2.5, -8.375, (x, y) => (Math.floor(y * 8) & 1) ? 0xd8302a : 0xf2c230);                 // a menu strip
    P.box(x0 + 0.25, 0, -5.0, x1 - 0.25, 1.0, -4.375, (x, y) => y >= 0.875 ? 0xc89a5a : (Math.floor(x / 0.5) & 1 ? 0x7a2a22 : 0x6a241e)); // counter
    for (let x = -20.25; x < -11; x += 0.875) P.box(x, 1.0, -4.875, x + 0.375, 1.125, -4.5, 0xe8e8e0);                     // bowls on the counter
    P.box(x0, 2.375, -4.375, x1, 3.0, -4.125, (x, y) => { const w = Math.sin(x * 4) * 0.08; return y - 2.375 < 0.25 + w ? 0xd8342c : (Math.floor(x * 4) % 3 === 0 ? 0xf2e8d8 : 0xd8342c); }); // the wave band
    for (let i = 0; i < 6; i++) P.box(x0 - 0.25, 3.0 + i * 0.1, -4.125 + i * 0.15, x1 + 0.25, 3.1 + i * 0.1, -3.875 + i * 0.15, (x) => Math.floor(x / 0.375) & 1 ? 0x3a3236 : 0x4a4044); // the awning
    for (const sx of [-19.75, -18.25, -16.75, -15.25, -13.75, -12.25]) { P.cyl(sx, -3.4, 0.07, 0, 0.75, 0x2a8a4a); P.cyl(sx, -3.4, 0.22, 0.6875, 0.8125, 0xd8302a); P.cyl(sx, -3.4, 0.14, 0, 0.0625, 0x2a8a4a); solid(sx - 0.25, -3.65, sx + 0.25, -3.15); spot('soup:stool' + sx, sx, -3.4, PI, 'eat', { seat: 0.8125, zone: 'soup' }); }
    // the upper floor behind the boards
    P.box(x0, 3.25, -14, x1, 7.5, -4.25, (x, y, z) => z > -13.75 && z < -4.5 && x > x0 + 0.2 && x < x1 - 0.2 && y < 7.25 ? -1 : (Math.floor(y / 0.5) % 5 === 0 ? 0x5a6470 : 0x6a7480));
    P.mesh(root); solid(x0 - 0.25, -14, x0 + 0.25, -4); solid(x1 - 0.25, -14, x1, -4); solid(x0, -5.05, x1, -4.3);
    // the boards
    const big = sign(9.6, 3.0, (c, w, h) => {
      c.fillStyle = '#1e3a4e'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2a5a7a'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(w * (i / 8), h * 1.02, h * 0.42, PI, 0); c.fill(); }
      c.strokeStyle = '#e8f4f8'; c.lineWidth = h * 0.025; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(w * (i / 8), h * 1.02, h * 0.36, PI * 1.05, PI * 1.6); c.stroke(); }
      c.fillStyle = '#f2f0e8'; c.beginPath(); c.ellipse(w * 0.62, h * 0.62, w * 0.16, h * 0.14, 0, 0, PI); c.fill();             // the bowl
      c.fillStyle = '#c8302a'; c.fillRect(w * 0.47, h * 0.6, w * 0.3, h * 0.05);
      c.strokeStyle = '#f2d060'; c.lineWidth = h * 0.02; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(w * (0.52 + i * 0.03), h * 0.6); c.bezierCurveTo(w * (0.5 + i * 0.04), h * 0.3, w * (0.6 + i * 0.02), h * 0.2, w * (0.62 + i * 0.03), h * 0.05); c.stroke(); }
      c.strokeStyle = '#8a5a2a'; c.lineWidth = h * 0.03; c.beginPath(); c.moveTo(w * 0.7, h * 0.05); c.lineTo(w * 0.8, h * 0.55); c.stroke(); c.beginPath(); c.moveTo(w * 0.74, h * 0.04); c.lineTo(w * 0.82, h * 0.52); c.stroke();
      c.fillStyle = '#f07a2a'; c.beginPath(); c.ellipse(w * 0.27, h * 0.4, w * 0.15, h * 0.17, -0.35, 0, PI * 2); c.fill();      // the koi
      c.fillStyle = '#f2f0e8'; c.beginPath(); c.ellipse(w * 0.31, h * 0.36, w * 0.05, h * 0.06, -0.35, 0, PI * 2); c.fill();
      c.fillStyle = '#f07a2a'; c.beginPath(); c.moveTo(w * 0.12, h * 0.55); c.lineTo(w * 0.04, h * 0.42); c.lineTo(w * 0.07, h * 0.72); c.fill();
      c.fillStyle = '#141416'; c.beginPath(); c.arc(w * 0.38, h * 0.33, h * 0.025, 0, PI * 2); c.fill();
      text(c, '丰盛豪礴', w * 0.33, h * 0.84, h * 0.2, '#f2f0e8', { fam: CJK, w: 900, stroke: '#141416', lw: 6 });
    }, { lit: true, res: 100 });
    put(root, big, -16.9, 5.2, -4.2);
    const bw = sign(3.2, 2.4, (c, w, h) => { c.fillStyle = '#f0ece0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#141416'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12); text(c, '瀑汤谷', w * 0.47, h * 0.5, h * 0.38, '#141416', { fam: CJK, w: 900 }); c.fillStyle = '#c8302a'; c.fillRect(w * 0.82, h * 0.12, w * 0.12, h * 0.28); text(c, '面', w * 0.88, h * 0.26, h * 0.16, '#f0ece0', { fam: CJK, w: 900 }); text(c, 'WATERFALL SOUP', w * 0.47, h * 0.86, h * 0.09, '#141416', { w: 800 }); }, { lit: true });
    put(root, bw, -11.4, 5.3, -4.05, -0.25);
    const vert = () => sign(0.55, 1.8, (c, w, h) => { c.fillStyle = '#f0ece0'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8302a'; c.fillRect(0, 0, w, h * 0.42); for (const [i, ch] of ['锦', '鲤', '面', '馆'].entries()) text(c, ch, w / 2, h * (0.11 + i * 0.22), h * 0.16, i < 2 ? '#f0ece0' : '#141416', { fam: CJK, w: 900 }); });
    const v1 = vert(); put(root, v1, -21.35, 4.0, -3.95, PI / 2); const v1b = vert(); put(root, v1b, -21.35, 4.0, -3.96, -PI / 2);
    const st = vert(); st.scale.set(1.1, 0.75, 1); put(root, st, -10.9, 0.95, -2.0, 0.4);
    const SB = piece(0.0625, -11, -2, 0.03); SB.box(-11.25, 0, -2.25, -10.625, 0.3, -1.8, 0x2a1a18); SB.mesh(root); solid(-11.3, -2.3, -10.5, -1.75);
    // the carp lanterns at the corners, an A-frame menu, a scooter
    const L = piece(0.0625, -21, -4, 0.03);
    for (const lx of [-21.0, -10.5]) { L.box(lx - 0.25, 2.25, -3.875, lx + 0.25, 2.625, -3.5, 0xf07a2a); L.box(lx - 0.1875, 2.3125, -3.5, lx + 0.1875, 2.5625, -3.4375, 0xf2f0e8); L.box(lx - 0.125, 2.375, -3.4375, lx - 0.0625, 2.4375, -3.375, 0x141416); L.box(lx + 0.0625, 2.375, -3.4375, lx + 0.125, 2.4375, -3.375, 0x141416); L.box(lx - 0.0625, 2.625, -3.75, lx + 0.0625, 2.875, -3.6875, 0x2a2a30); }
    L.mesh(root);
    aframe(root, -21.6, -2.7, 0.3, (c, w, h) => { c.fillStyle = '#1a1210'; c.fillRect(0, 0, w, h); text(c, '今日', w / 2, h * 0.15, h * 0.12, '#f2c230', { fam: CJK }); for (let i = 0; i < 5; i++) { c.fillStyle = '#e8e4dc'; c.fillRect(w * 0.15, h * (0.32 + i * 0.12), w * (0.4 + hash(i, 2) * 0.3), h * 0.04); } }, 0x3a2a20);
    scooter(root, -9.9, -2.2, 0.1);
    light(root, 0xffb070, 0.7, 7, -15.8, 2.4, -6.0, 'shop'); light(root, 0xff7a3a, 0.35, 4, -21, 2.5, -3.2, 'neon');
    spot('soup:chop', -15.9, -6.4, 0, 'cook', { post: true }); spot('soup:queue', -14.3, -1.9, PI, 'stand'); spot('soup:side', -21.8, -2.0, PI / 2, 'lean');
  }
  function scooter(root, x, z, rot) {
    const g = new THREE.Group(), P = piece(0.0625, 0, 0, 0.04), R = 0xc8c8c4, BK = 0x1c1c20;
    for (const wz of [-0.55, 0.55]) P.discX(wz, 0.22, 0.22, -0.0625, 0.0625, d => d < 0.08 ? 0xb0b2b8 : BK);
    P.box(-0.1875, 0.25, -0.5, 0.1875, 0.5, 0.375, R); P.box(-0.25, 0.5, -0.625, 0.25, 0.6875, -0.125, 0x2a2a30); P.box(-0.125, 0.25, 0.25, 0.125, 1.0, 0.4375, R);
    P.box(-0.3125, 1.0, 0.3125, 0.3125, 1.0625, 0.375, BK); P.box(-0.0625, 0.875, 0.4375, 0.0625, 0.9375, 0.5, G(0xfff0c0)); P.box(-0.25, 0.6875, -0.75, 0.25, 0.875, -0.5, 0xd8302a);
    P.mesh(g); g.position.set(x, 0, z); g.rotation.y = rot || 0; root.add(g); solid(x - 0.4, z - 0.8, x + 0.4, z + 0.8);
  }

  /* ------------------------------------------------------- the alleys --
     Between Waterfall Soup and Random Play: the way to the store's parking lot,
     a chain-link gate at the end, a yellow 24-hour parking booth, bike stands,
     the vending machine by the gate, a payphone at the mouth. Behind Coff Cafe:
     graffiti, a dumpster, pipes, air conditioners (a courier and a Hollow Raider
     hang about there). */
  function alleys(root) {
    const A = piece(0.125, -10.5, -12, 0.05);
    A.box(-10.5, 0, -12.0, -6.25, 2.5, -11.875, (x, y) => (Math.floor(x / 0.25) + Math.floor(y / 0.25)) % 4 === 0 ? 0x6a7a6a : (Math.abs((x * 4) % 1) < 0.2 || Math.abs((y * 4) % 1) < 0.2 ? 0x55605a : -1)); // chain link
    A.box(-10.5, 0, -12.125, -6.25, 0.125, -11.875, 0x3a3c42); A.box(-10.5, 2.5, -12.125, -6.25, 2.625, -11.875, 0x3a3c42);
    for (const px of [-10.5, -8.375, -6.375]) A.box(px, 0, -12.125, px + 0.125, 2.625, -11.875, 0x3a3c42);
    A.box(-7.25, 0, -10.0, -6.25, 2.5, -8.75, (x, y) => y > 2.25 ? 0xf2c230 : (y > 1.0 && y < 1.75 && x < -6.4 ? G(0xbfe0ff) : 0xe8b830)); // the parking booth
    A.box(-7.375, 2.0, -9.5, -7.25, 2.375, -9.25, 0x2a4ad8);
    for (const bz of [-10.75, -9.5]) { A.box(-10.25, 0, bz, -10.125, 0.75, bz + 0.125, 0xc8c8c4); A.box(-9.25, 0, bz, -9.125, 0.75, bz + 0.125, 0xc8c8c4); A.box(-10.25, 0.6875, bz, -9.125, 0.75, bz + 0.125, 0xc8c8c4); }
    A.box(-10.5, 1.0, -9.0, -10.4375, 2.0, -7.0, (x, y, z) => (Math.abs(Math.sin(z * 3 + y * 2)) < 0.25) ? 0xd8302a : -1);   // graffiti on the wall
    A.mesh(root); solid(-10.6, -12.2, -6.2, -11.8); solid(-7.3, -10.05, -6.2, -8.7);
    vending(root, -9.0, -10.5, 1, 0x2a6ad8, 0xe8f2ff);
    payphone(root, -9.6, -4.6, 1);
    spot('alley:vend', -8.45, -9.6, PI, 'vend'); spot('alley:phone', -9.6, -3.9, PI, 'phone'); spot('alley:lean', -7.0, -6.5, -PI / 2, 'lean');
    // behind Coff Cafe
    const B = piece(0.125, -25, -12, 0.05);
    B.box(-25, 0, -12.25, -21, 3.0, -12.0, (x, y) => hash(Math.floor(x * 2), Math.floor(y * 2)) > 0.85 ? 0x5a5c62 : 0x6a6c72);
    B.box(-24.75, 0, -11.75, -23.0, 1.25, -10.75, 0x2a5a3a); B.box(-24.875, 1.25, -11.875, -22.875, 1.375, -10.625, 0x1e4a2e);   // the dumpster
    B.box(-21.125, 0, -11.5, -21.0, 3.0, -11.375, 0x8a8c90); B.box(-21.125, 2.5, -11.5, -21.0, 2.625, -5.0, 0x8a8c90);       // a pipe
    B.box(-25.0, 1.25, -10.0, -24.9375, 2.5, -6.0, (x, y, z) => (Math.abs(Math.sin(z * 2.5) * 0.5 + 1.8 - y) < 0.12 || Math.abs(Math.cos(z * 4) * 0.3 + 1.6 - y) < 0.09) ? [0x3a9ad8, 0xf2c230, 0xd8302a][Math.floor(z) & 1 ? 0 : 2] : -1);
    acUnit(B, -22.0, 2.2, -11.75, 1);
    B.mesh(root); solid(-25.1, -12.3, -21, -11.9); solid(-24.9, -11.9, -22.8, -10.5);
    spot('alleyB:courier', -22.8, -8.5, 0.6, 'stand'); spot('alleyB:raider', -23.6, -7.4, -0.8, 'lean');
  }

  /* --------------------------------------------------------- Coff Cafe --
     Tin Master's corner cafe: pale grey brick, dark wood above under a curved
     wooden soffit with cone lamps hanging from it; the big navy sign (COFF CAFE,
     the tipping cup, MADE BY TIN MASTER); the windows with WELCOME COFF on the
     glass, a chalk menu, planters; the terracotta patio round the side with dark
     tables, wooden chairs, a striped umbrella, three framed posters, and Mr.
     Panda at his table; an A-frame chalkboard and a yellow board on the
     pavement; a payphone at the corner. */
  function coffCafe(root) {
    const x0 = -37, x1 = -25, zf = -7.5, P = piece(0.125, x0, -14, 0.05), WOOD = 0x6a4a32, WOOD2 = 0x5a3e2a;
    P.box(x0, 0, -14, x1, 3.25, zf, (x, y, z) => (x > x0 + 0.25 && x < x1 - 0.25 && z > -13.75 && z < zf - 0.25) ? -1 : GREYBRICK(x, y, z));
    P.box(x0, 0, zf - 0.25, x0 + 4.5, 0.75, zf, WOOD2);                                                                   // a wood dado under the window
    P.cut(x0 + 0.5, 0.875, zf - 0.25, x0 + 3.5, 2.625, zf); P.box(x0 + 0.375, 0.75, zf - 0.25, x0 + 3.625, 0.875, zf + 0.0625, 0x1c1c22); P.box(x0 + 0.375, 2.625, zf - 0.25, x0 + 3.625, 2.75, zf, 0x1c1c22);
    P.cut(x0 + 4.25, 0, zf - 0.25, x0 + 5.5, 2.5, zf); P.box(x0 + 4.125, 0, zf - 0.25, x0 + 4.25, 2.625, zf + 0.0625, 0x1c1c22); P.box(x0 + 5.5, 0, zf - 0.25, x0 + 5.625, 2.625, zf + 0.0625, 0x1c1c22); P.box(x0 + 4.125, 2.5, zf - 0.25, x0 + 5.625, 2.625, zf + 0.0625, 0x1c1c22);
    P.box(x0 + 6.0, 0.75, zf, x0 + 6.875, 2.0, zf + 0.0625, 0x3a2a20); P.box(x0 + 6.0625, 0.8125, zf + 0.0625, x0 + 6.8125, 1.9375, zf + 0.125, 0x1e2a24); // the chalk menu
    P.box(x0 + 0.375, 0, zf, x0 + 3.625, 0.5, zf + 0.5, 0x5a3a28);                                                        // the planter
    for (let x = x0 + 0.5; x < x0 + 3.5; x += 0.125) if (hash(x * 9, 3) > 0.35) P.box(x, 0.5, zf + 0.125, x + 0.125, 0.75 + hash(x, 5) * 0.4, zf + 0.375, hash(x, 7) > 0.6 ? 0x4a9a48 : 0x3a8a3a);
    // dark wood above, the curved soffit over the patio and the door
    P.box(x0, 3.25, -14, x1, 6.5, zf, (x, y, z) => (x > x0 + 0.25 && x < x1 - 0.25 && z > -13.75 && z < zf - 0.25 && y < 6.25) ? -1 : (Math.floor(x / 0.375) & 1 ? WOOD : WOOD2));
    for (let i = 0; i < 8; i++) { const zz = zf + i * 0.25, yb = 3.25 - (i * i) * 0.012; P.box(x0, yb, zz, x1, yb + 0.25, zz + 0.25, (x) => Math.floor(x / 0.375) & 1 ? WOOD : WOOD2); }
    P.box(x0 - 0.125, 6.5, -14, x1 + 0.125, 6.75, zf + 0.125, 0x55585e);
    // the patio: dark tables, wooden chairs; Mr. Panda's table by the wall
    const tables = [[-30.0, -5.6], [-27.6, -5.6], [-32.4, -4.9]];
    for (const [tx, tz] of tables) {
      P.cyl(tx, tz, 0.06, 0, 0.75, 0x1c1c22); P.cyl(tx, tz, 0.25, 0, 0.0625, 0x1c1c22); P.box(tx - 0.375, 0.75, tz - 0.375, tx + 0.375, 0.8125, tz + 0.375, 0x24262c);
      for (const [cx, cz] of [[tx - 0.6, tz], [tx + 0.6, tz]]) { P.box(cx - 0.1875, 0, cz - 0.1875, cx + 0.1875, 0.45, cz + 0.1875, (x, y) => y > 0.375 ? 0x8a5a3a : (Math.abs(x - cx) > 0.12 && Math.abs(y) < 0.4 ? 0x5a3a28 : -1)); P.box(cx + (cx < tx ? -0.25 : 0.1875), 0.45, cz - 0.1875, cx + (cx < tx ? -0.1875 : 0.25), 0.95, cz + 0.1875, 0x8a5a3a); }
      solid(tx - 0.45, tz - 0.45, tx + 0.45, tz + 0.45);
    }
    P.mesh(root); solid(x0, -14, x1, zf);
    const T = [['cafe:t1a', -30.6, -5.6, PI / 2], ['cafe:t1b', -29.4, -5.6, -PI / 2], ['cafe:t2a', -28.2, -5.6, PI / 2], ['cafe:t3a', -33.0, -4.9, PI / 2], ['cafe:t3b', -31.8, -4.9, -PI / 2]];
    for (const [id, x, z, f] of T) spot(id, x, z, f, 'drink', { seat: 0.45, zone: 'cafe' });
    // the striped umbrella, the cone lamps
    const U = piece(0.0625, -26.2, -5.6, 0.03);
    U.cyl(-26.2, -5.6, 0.05, 0, 2.4, 0x2a2a30);
    for (let r = 0; r < 1.6; r += 0.0625) { const y = 2.55 - r * 0.32; U.cyl(-26.2, -5.6, r + 0.0625, y, y + 0.0625, (X, Y, Z) => Math.hypot(X - -26.2, Z - -5.6) < r - 0.02 ? -1 : (Math.floor(Math.atan2(Z + 5.6, X + 26.2) / (PI / 6) + 6) & 1) ? 0x4a4a52 : (r > 1.4 ? 0xe8e0c8 : 0x4a4a52)); }
    U.mesh(root); solid(-26.4, -5.8, -26.0, -5.4);
    const LP = piece(0.0625, x0, zf, 0.03);
    for (let x = x0 + 1; x < x1; x += 2.5) { LP.box(x, 2.75, zf + 0.75, x + 0.0625, 3.25, zf + 0.8125, 0x1c1c22); LP.box(x - 0.1875, 2.5625, zf + 0.5625, x + 0.25, 2.75, zf + 1.0, 0xb8bcc4); LP.box(x - 0.0625, 2.5, zf + 0.6875, x + 0.125, 2.5625, zf + 0.875, G(0xfff0c0)); }
    LP.mesh(root);
    light(root, 0xffd8a0, 0.6, 8, -31, 2.6, -5.8, 'lamp'); light(root, 0xffe0b0, 0.4, 5, -34.5, 1.8, -8.3, 'shop');
    // the sign, the posters, the window decals, Mr. Panda
    const sg = sign(5.6, 1.5, (c, w, h) => {
      c.fillStyle = '#1c2436'; c.fillRect(0, h * 0.12, w * 0.8, h * 0.76);
      text(c, 'COFF CAFE', w * 0.4, h * 0.45, h * 0.42, '#eef0f2', { fam: DISP });
      text(c, 'MADE BY TIN MASTER', w * 0.4, h * 0.76, h * 0.13, '#cfd4dc', { w: 800 });
      c.fillStyle = '#1c2436'; c.beginPath(); c.arc(w * 0.88, h * 0.5, h * 0.48, 0, PI * 2); c.fill();
      c.save(); c.translate(w * 0.88, h * 0.5); c.rotate(-0.5); c.fillStyle = '#f2f2f0'; c.beginPath(); c.moveTo(-h * 0.22, -h * 0.2); c.lineTo(h * 0.22, -h * 0.2); c.lineTo(h * 0.16, h * 0.24); c.lineTo(-h * 0.16, h * 0.24); c.fill(); c.lineWidth = h * 0.05; c.strokeStyle = '#f2f2f0'; c.beginPath(); c.arc(h * 0.24, 0, h * 0.09, -1.2, 1.2); c.stroke(); c.restore();
    });
    put(root, sg, -34.1, 4.5, zf + 0.06);
    for (let i = 0; i < 3; i++) { const pp = sign(0.9, 1.2, (c, w, h) => { c.fillStyle = '#e8b830'; c.fillRect(0, 0, w, h); c.fillStyle = '#141416'; c.fillRect(w * 0.06, h * 0.05, w * 0.88, h * 0.9); c.fillStyle = '#e8b830'; c.fillRect(w * 0.12, h * 0.1, w * 0.76, h * 0.8); c.fillStyle = '#f2f2f0'; c.beginPath(); c.arc(w / 2, h * 0.48, w * 0.28, 0, PI * 2); c.fill(); c.fillStyle = '#141416'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * w * 0.22, h * 0.26, w * 0.1, 0, PI * 2); c.fill(); c.beginPath(); c.ellipse(w / 2 + s * w * 0.1, h * 0.46, w * 0.07, w * 0.09, 0, 0, PI * 2); c.fill(); } text(c, 'COFF CAFE', w / 2, h * 0.82, h * 0.08, '#141416', { fam: DISP }); }, { lit: true }); put(root, pp, -30.2 + i * 1.6, 1.9, zf + 0.03); }
    const dc = sign(1.4, 1.0, (c, w, h) => { c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h * 0.55, h * 0.3, 0, PI * 2); c.stroke(); text(c, 'WELCOME', w / 2, h * 0.14, h * 0.13, 'rgba(255,255,255,.9)', { w: 800 }); text(c, 'COFF', w / 2, h * 0.56, h * 0.2, 'rgba(255,255,255,.95)', { fam: DISP }); });
    put(root, dc, -35.0, 1.75, zf + 0.04);
    const win = glass(3.0, 1.75, 0x2a3442, 0.55); win.material.depthWrite = true; put(root, win, -35.0, 1.75, zf - 0.06);
    const wl = glass(2.9, 1.6, 0xffd090, 0.6); put(root, wl, -35.0, 1.75, zf - 0.05); wl.visible = false; NIGHT.push(wl);
    aframe(root, -31.5, -3.4, 0.2, (c, w, h) => { c.fillStyle = '#1e2a2a'; c.fillRect(0, 0, w, h); text(c, 'COFF CAFE', w / 2, h * 0.1, h * 0.09, '#f2f2f0', { fam: DISP }); c.strokeStyle = '#f2f2f0'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.3, h * 0.3); c.lineTo(w * 0.7, h * 0.3); c.lineTo(w * 0.64, h * 0.55); c.lineTo(w * 0.36, h * 0.55); c.closePath(); c.stroke(); for (let i = 0; i < 4; i++) c.fillRect(w * 0.2, h * (0.66 + i * 0.07), w * 0.6, 2); });
    aframe(root, -36.2, -3.6, -0.2, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); c.fillStyle = '#141416'; c.beginPath(); c.moveTo(w / 2, h * 0.2); c.lineTo(w * 0.85, h * 0.75); c.lineTo(w * 0.15, h * 0.75); c.fill(); text(c, '!', w / 2, h * 0.56, h * 0.3, '#f2c230', { w: 900 }); }, 0xd8aa22);
    payphone(root, -37.7, -4.5, 1);
    spot('cafe:tin', -32.7, -6.9, 0, 'serve', { post: true }); spot('cafe:phone', -37.7, -3.8, PI, 'phone');
    spot('cafe:panda', -27.0, -5.6, -PI / 2, 'panda');
    spot('cafe:menu', -30.4, -3.3, PI, 'look');
  }

  /* -------------------------------------------------------- Box Galaxy --
     Susie's gadget store: a beige facade of angled panels, an entrance arch of
     orange-brown planks in a sage-green trim, BOXGALAXY in white over it, the
     box-face sign on the corner; glass doors with a WELCOME >>> band, two lit
     claw machines, orange crates of toys; a bin; and round the corner the big
     black Bangboo statue (in a pose that earned it a red PROHIBITED hand and a
     plaster) against a graffiti wall. */
  function boxGalaxy(root) {
    const x0 = -51, x1 = -40, P = piece(0.125, x0, -14, 0.05), SAGE = 0x7a9a7a, PLANK = 0xb06a3a, PLANK2 = 0x9a5a30;
    P.box(x0, 0, -14, x1, 7.0, -4.25, (x, y, z) => {
      if (x > x0 + 0.25 && x < x1 - 0.25 && z > -13.75 && z < -4.5 && y < 6.75) return -1;
      const u = (x - x0) / 1.5, v = y / 1.5, fu = u - Math.floor(u), fv = v - Math.floor(v), tri = fu > fv;
      return ((Math.floor(u) + Math.floor(v) + (tri ? 1 : 0)) % 3 === 0) ? 0xd8c8a8 : tri ? 0xc8b898 : 0xbcac8c;
    });
    P.cut(x0 + 0.75, 0, -4.5, x1 - 0.75, 3.75, -4.25);
    P.box(x0 + 0.5, 0, -4.375, x1 - 0.5, 4.0, -4.0, (x, y) => (x < x0 + 0.75 || x >= x1 - 0.75 || y >= 3.75) ? (y >= 3.875 || x < x0 + 0.625 || x >= x1 - 0.625 ? SAGE : (Math.floor(y / 0.25) & 1 ? PLANK : PLANK2)) : -1); // the arch
    P.box(x0 + 0.75, 3.375, -6.5, x1 - 0.75, 3.75, -4.375, (x) => Math.floor(x / 0.5) & 1 ? PLANK : PLANK2);                // the soffit
    P.box(x0 + 0.75, 0, -6.625, x1 - 0.75, 3.375, -6.5, 0x3a3c44);                                                          // the back of the entrance
    P.cut(-46.5, 0, -6.625, -43.0, 2.5, -6.5); P.box(-46.625, 0, -6.625, -46.5, 2.5, -6.5, 0x8a8c94); P.box(-43.0, 0, -6.625, -42.875, 2.5, -6.5, 0x8a8c94); P.box(-44.8125, 0, -6.625, -44.6875, 2.5, -6.5, 0x8a8c94);
    for (const [cx, col] of [[-49.8, 0x3a6ad8], [-48.5, 0x5a8ae8]]) { P.box(cx, 0, -6.4, cx + 1.0, 0.75, -5.6, col); P.box(cx, 0.75, -6.4, cx + 1.0, 1.75, -5.6, (x, y, z) => (z > -5.7 || x < cx + 0.1 || x > cx + 0.88) ? 0x2a3a6a : (y < 1.0 && hash(x * 8, z * 8) > 0.5 ? [0xff4a7a, 0xf2c230, 0x4ae8f0, 0xf0f0f0][Math.floor(hash(x, z) * 4)] : -1)); P.box(cx, 1.75, -6.4, cx + 1.0, 2.125, -5.6, G(0x7ab8ff)); P.box(cx + 0.375, 1.25, -6.0, cx + 0.5, 1.6875, -5.875, CHROME); solid(cx, -6.45, cx + 1.0, -5.55); }
    for (const [cx, cz, art] of [[-45.4, -5.4, 0], [-44.6, -5.4, 1], [-45.0, -4.8, 2]]) { P.box(cx - 0.3125, 0, cz - 0.25, cx + 0.3125, 0.5, cz + 0.25, 0xf07a2a); P.box(cx - 0.25, 0.5, cz - 0.0625, cx + 0.25, 0.5625, cz + 0.0625, 0x141416); if (art === 1) P.box(cx - 0.125, 0.5625, cz - 0.0625, cx + 0.125, 0.8125, cz + 0.1875, 0xf2c230); else P.box(cx - 0.0625, 0.5625, cz - 0.0625, cx + 0.125, 0.75, cz + 0.0625, art ? 0x4a9ad8 : 0x8a5ad8); }
    solid(-45.8, -5.7, -44.2, -4.5);
    P.mesh(root); solid(x0, -14, x0 + 0.75, -4); solid(x1 - 0.75, -14, x1, -4); solid(x0, -14, x1, -6.5);
    const wg = glass(3.4, 2.4, 0x9ad0ff, 0.28); put(root, wg, -44.75, 1.25, -6.48);
    const wb = sign(3.4, 0.28, (c, w, h) => { c.fillStyle = '#e86a2a'; c.fillRect(0, 0, w, h); text(c, 'WELCOME', w * 0.25, h * 0.55, h * 0.7, '#fff', { fam: DISP }); for (let i = 0; i < 6; i++) text(c, '>', w * (0.5 + i * 0.08), h * 0.55, h * 0.8, '#fff', { w: 900 }); }); put(root, wb, -44.75, 1.3, -6.46);
    const lt = sign(6.5, 0.9, (c, w, h) => text(c, 'BOXGALAXY', w / 2, h * 0.55, h * 0.78, '#f2f2ee', { fam: DISP, stroke: '#5a6a5a', lw: 5 })); put(root, lt, -45.5, 4.55, -3.98);
    const ICON = (c, w, h) => { c.fillStyle = '#e8e8e0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a4a3a'; c.lineWidth = w * 0.06; c.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84); c.fillStyle = '#2a3a2a'; c.fillRect(w * 0.18, h * 0.22, w * 0.64, h * 0.1); c.fillRect(w * 0.3, h * 0.45, w * 0.12, h * 0.12); c.fillRect(w * 0.58, h * 0.45, w * 0.12, h * 0.12); c.fillRect(w * 0.25, h * 0.7, w * 0.5, h * 0.08); };
    const ic = piece(0.25, -41, -4, 0.03); ic.box(-41.5, 5.25, -4.75, -40.0, 6.75, -3.75, 0xc8d0c0); ic.mesh(root);
    const i1 = sign(1.4, 1.4, ICON); put(root, i1, -40.75, 6.0, -3.74); const i2 = sign(1.0, 1.4, ICON); put(root, i2, -39.99, 6.0, -4.25, PI / 2);
    bin(root, -41.3, -3.4, 0x8a9098, { x: true });
    light(root, 0x9ac8ff, 0.6, 6, -46, 2.2, -5.8, 'shop');
    // the statue and its wall
    const W = piece(0.25, -40, -7, 0.05); W.box(-40.0, 0, -7.0, -37.0, 3.0, -6.5, (x, y) => (Math.abs(Math.sin(x * 2.2) * 0.6 + 1.5 - y) < 0.25 ? 0x2a6ad8 : Math.abs(Math.cos(x * 3) * 0.5 + 1.1 - y) < 0.2 ? 0xe86a2a : BRICK(x, y, 0, 0x8a8a86, 0x7a7a76))); W.mesh(root); solid(-40, -7, -37, -6.5);
    const BS = piece(0.0625, -38.5, -5.5, 0.04);
    BS.box(-39.8, 0, -6.4, -37.4, 0.5, -5.2, 0x5a5c62);                                                                     // plinth
    BS.box(-39.6, 0.5, -6.2, -37.6, 1.3, -5.4, 0x1c1e2a); BS.box(-38.0, 1.3, -6.2, -37.3, 2.4, -5.4, 0x1c1e2a);                // lying egg, its head end up
    BS.box(-37.95, 1.6, -5.4, -37.35, 2.2, -5.3, 0x0e1018); BS.box(-37.75, 1.8, -5.3, -37.55, 2.0, -5.2, G(0x5ad0ff));         // visor, an eye
    BS.box(-38.3, 2.4, -5.9, -38.1, 3.0, -5.7, 0x1c1e2a); BS.box(-37.7, 2.4, -5.9, -37.5, 2.9, -5.7, 0x1c1e2a);                 // ears
    BS.box(-39.4, 1.3, -5.6, -39.0, 1.6, -5.4, 0xe8b88a);                                                                   // the plaster
    BS.mesh(root); solid(-39.9, -6.5, -37.3, -5.1);
    const stop = sign(0.9, 0.9, (c, w, h) => { c.fillStyle = '#e83a3a'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.38, 0, PI * 2); c.fill(); c.fillStyle = '#e83a3a'; c.fillRect(w * 0.38, h * 0.22, w * 0.24, h * 0.5); for (let i = 0; i < 4; i++) c.fillRect(w * (0.3 + i * 0.1), h * (0.15 + Math.abs(i - 1.5) * 0.04), w * 0.07, h * 0.3); });
    put(root, stop, -37.6, 1.95, -5.15, 0.3);
    bench(root, -48.2, -1.55, -1, 1.75);
    spot('box:susie', -45.0, -4.3, 0, 'serve', { post: true }); spot('box:claw', -48.0, -5.0, PI, 'arcade'); spot('box:bench1', -47.7, -1.3, PI, 'sit', { seat: 0.5 }); spot('box:bench2', -46.9, -1.3, PI, 'sit', { seat: 0.5 });
    spot('box:statue', -38.6, -4.2, PI, 'look'); spot('box:cats', -39.2, -2.9, 0, 'pet');
  }

  /* -------------------------------------------------- the metro entrance --
     At the street's west end: concrete pillars with yellow bands, a glass canopy
     on struts, the lit METRO PASSAGE and EXIT signs, a white-tiled wall with a
     yellow stripe and the New Eridu Metro map ("FLOW WITH THE CITY'S BEAT"), steps
     with rails, a yellow caution board, a red fire box. */
  function metro(root) {
    const P = piece(0.125, -61, -10, 0.05), x0 = -60, x1 = -52.5;
    for (const px of [x0, x1 - 0.875]) P.box(px, 0, -4.75, px + 0.875, 4.0, -4.0, (x, y) => (y > 3.0 && y < 3.375) || (y > 0.5 && y < 0.75) ? 0xe8b830 : 0x6a7280);
    P.box(x0, 4.0, -9.5, x1, 4.25, -3.75, 0x55606a); P.box(x0 + 0.25, 4.25, -9.25, x1 - 0.25, 4.375, -4.0, 0x9ac0d8);         // the canopy
    for (let x = x0 + 1; x < x1; x += 1.75) P.box(x, 4.375, -9.0, x + 0.125, 4.875, -4.0, 0x55606a);
    P.box(x0, 0, -9.5, x1, 4.0, -9.25, (x, y) => (y > 1.4 && y < 1.7) ? 0xe8b830 : (Math.floor(x / 0.25) + Math.floor(y / 0.25)) & 1 ? 0xeeeeea : 0xe0e0dc);
    P.box(x0 + 0.875, 0, -9.25, x1 - 0.875, 3.25, -9.125, -1);
    for (let i = 0; i < 4; i++) P.box(x0 + 0.875, 0, -9.0 + i * 0.6, x1 - 0.875, 0.15 * (4 - i), -8.4 + i * 0.6, 0x7a808a);    // steps
    for (let x = x0 + 1.5; x < x1 - 1; x += 1.4) { P.box(x, 0, -6.6, x + 0.125, 1.0, -6.475, CHROME); P.box(x, 0.875, -9.0, x + 0.125, 1.0, -6.475, CHROME); }
    P.box(x1 - 1.6, 0.6, -9.25, x1 - 1.1, 1.3, -9.0, 0xd8302a);
    P.box(x0 - 0.25, 0, -10, x0, 6.0, -3.75, 0x5a6270); P.box(x1, 0, -10, x1 + 0.25, 5.0, -4.75, 0x5a6270);
    P.mesh(root); solid(x0 - 0.3, -10, x0 + 0.9, -4.0); solid(x1 - 0.9, -10, x1 + 0.3, -4.0); solid(x0, -9.6, x1, -7.2);
    const ms = sign(4.6, 0.62, (c, w, h) => { c.fillStyle = '#141418'; c.fillRect(0, 0, w * 0.74, h); c.fillStyle = '#e86a2a'; c.fillRect(w * 0.76, 0, w * 0.24, h); text(c, '↙', w * 0.07, h * 0.5, h * 0.6, '#fff', { w: 900 }); text(c, '地铁站通行道', w * 0.4, h * 0.36, h * 0.36, '#fff', { fam: CJK, w: 900 }); text(c, 'METRO PASSAGE', w * 0.4, h * 0.78, h * 0.16, '#fff', { w: 800 }); text(c, '出入口', w * 0.88, h * 0.36, h * 0.32, '#fff', { fam: CJK, w: 900 }); text(c, 'EXIT', w * 0.88, h * 0.78, h * 0.18, '#fff', { w: 900 }); });
    put(root, ms, -56.25, 3.45, -4.3);
    const map = sign(3.4, 1.15, (c, w, h) => { c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e86a2a'; c.lineWidth = h * 0.05; c.beginPath(); c.moveTo(w * 0.45, h * 0.15); c.bezierCurveTo(w * 0.6, h * 0.3, w * 0.7, h * 0.8, w * 0.95, h * 0.85); c.stroke(); c.beginPath(); c.moveTo(w * 0.5, h * 0.9); c.bezierCurveTo(w * 0.6, h * 0.5, w * 0.8, h * 0.2, w * 0.98, h * 0.18); c.stroke(); text(c, '新艾利都地铁', w * 0.2, h * 0.18, h * 0.1, '#c8302a', { fam: CJK }); text(c, '都市脉络 川流不息', w * 0.24, h * 0.5, h * 0.12, '#141416', { fam: CJK, w: 900 }); text(c, "FLOW WITH THE CITY'S BEAT", w * 0.24, h * 0.7, h * 0.08, '#141416', { w: 800 }); }, { lit: true });
    put(root, map, -56.25, 2.35, -9.24);
    aframe(root, -53.6, -5.4, -0.4, (c, w, h) => { c.fillStyle = '#f2c230'; c.fillRect(0, 0, w, h); c.fillStyle = '#141416'; c.fillRect(w * 0.42, h * 0.2, w * 0.16, h * 0.5); c.beginPath(); c.arc(w / 2, h * 0.8, w * 0.08, 0, PI * 2); c.fill(); }, 0xd8aa22);
    light(root, 0xe0f0ff, 0.6, 7, -56.25, 3.6, -6.5, 'shop');
    spot('metro:in', -56.25, -6.3, PI, 'metro', { exit: true }); spot('metro:wait', -54.2, -3.2, 0.4, 'stand'); spot('metro:wait2', -58.6, -3.4, -0.3, 'phone');
  }

  /* the far city past both ends of the street */
  function skyline(root) {
    const E = piece(1, 0, 0, 0.05);
    E.box(-66, 0, -16, -61, 16, 20, (x, y) => y % 3 === 1 && Math.floor(x + y) % 2 ? G(0xffd890) : 0x5a6270);
    E.box(25, 0, -16, 30, 13, 20, (x, y) => y % 3 === 1 && Math.floor(x + y) % 2 ? G(0xffd890) : 0x6a6458);
    for (let i = 0; i < 22; i++) {
      const bx = -66 + i * 4.6 + hash(i, 1) * 2, h = 12 + Math.floor(hash(i, 2) * 26), bz = -26 - Math.floor(hash(i, 3) * 14), w = 4;
      E.box(bx, 0, bz, bx + w, h, bz + 4, (x, y, z) => (z >= bz + 3 && y % 2 === 1 && hash(x, y) > 0.55) ? G(hash(x, z) > 0.5 ? 0xffd890 : 0xbfe0ff) : (y >= h - 1 ? 0x4a5060 : 0x6a7080));
      const sz = 26 + Math.floor(hash(i, 4) * 12), sh = 10 + Math.floor(hash(i, 5) * 22);
      E.box(bx, 0, sz, bx + w, sh, sz + 4, (x, y) => (y % 2 === 1 && hash(x, y + 9) > 0.6) ? G(0xffd890) : (y >= sh - 1 ? 0x4a5060 : 0x6a7080));
    }
    E.mesh(root, { cast: false });
    solid(-66, -16, -60.2, 20); solid(24.2, -16, 30, 20);
  }

  /* the north side's backs and gaps: walls behind the alleys, the rear of the block */
  function northFill(root) {
    upper(root, -52.5, -51, -4, 1, 0, 6, 0x6a7280, { depth: 6, ww: 0.8, step: 2, lit: false });
    upper(root, -40, -37, -7, 1, 3.0, 6.0, GREYBRICK, { depth: 7, ww: 1.2, step: 2.5, wy: [3.9] });
    upper(root, -25, -21, -12.25, 1, 3.0, 8.0, 0x6a6c72, { depth: 2, ww: 1.2, step: 1.8, wy: [4.0, 6.2], ac: true });
    upper(root, -10.5, -6.25, -12.25, 1, 2.75, 7.5, BRICK, { depth: 2, ww: 1.0, step: 1.8, wy: [3.6, 5.6] });
    upper(root, -21, -10.5, -4.25, 1, 7.5, 10.0, 0x5a6470, { depth: 9.75, ww: 1.4, step: 2.6, wy: [8.1], ac: true });
    upper(root, -37, -25, -7.5, 1, 6.75, 9.25, GREYBRICK, { depth: 6.5, ww: 1.4, step: 2.8, wy: [7.4], ac: true });
    upper(root, -51, -40, -4.25, 1, 7.0, 10.5, 0xbcac8c, { depth: 9.75, ww: 1.6, step: 2.75, wy: [7.6, 9.2] });
  }

  /* ---------------------------------------------------------- build -- */
  /* another hub built with this kit (js/hubs/): a fresh set of colliders, spots and lights, then hand them over */
  ST.begin = () => { COL = []; SPOTS = {}; LIGHTS = []; NIGHT = []; ANIMS = []; TALL = []; };
  ST.finish = bounds => ({ col: COL, spots: SPOTS, lights: LIGHTS, night: NIGHT, anims: ANIMS, tall: TALL, bounds });
  ST.build = (root) => {
    ST.begin();
    ground(root); poles(root); skyline(root);
    randomPlay(root); turbo(root); waterfallSoup(root); alleys(root); coffCafe(root); boxGalaxy(root); metro(root); northFill(root);
    for (const f of ST.parts) f(root, KIT);
    return { col: COL, spots: SPOTS, lights: LIGHTS, night: NIGHT, anims: ANIMS, bounds: { x0: X0 + 1.5, x1: X1 - 1.5, z0: -13.6, z1: 17.2 } };
  };
  /* what street2.js (and others) build with */
  const KIT = { piece, sign, put, glass, font, text, poster, hash, solid: (...a) => solid(...a), spot: (...a) => spot(...a), light: (...a) => light(...a), night: m => NIGHT.push(m), anim: f => ANIMS.push(f),
    tall: (x0, z0, x1, z1, h) => TALL.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), h || 99]),   // (a free camera keeps you in sight over it)
    acUnit, windowAt, upper, payphone, vending, bench, bin, tires, cone, aframe, planter, pot, scooter, BRICK, GREYBRICK, DISP, CJK, CHROME, CONC, N, S, NC, SC, X0, X1 };
  ST.KIT = KIT; ST.RP = RP; ST.STORE = STORE; ST.inStore = inStore;
  window.STREET = ST;
})();
