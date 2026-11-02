/* ============================================================================
   lobby.js -- the home screen: Sixth Street at dusk, in voxels, to walk
   around in (as Post Parade's academy is). From the official Sixth Street:
   Random Play, the siblings' video store (a yellow storefront in red brick,
   the black "Random Play" sign), Bardic Needle's green record-shop sign,
   Chop's noodle stand, the 141 convenience store, power poles and wires
   over the street, a crosswalk.

   Every mode is a place:
     the HDD system in Random Play's back room   -> Hollow Deep Dive (battle)
     the shop computer on the counter              -> Battle Lab
     the tutorial tapes on the shelf               -> How to Play
     the notice board by the door                  -> Proxy Records
     the arcade cabinets out front                 -> Proxy Clash (Agent vs Agent)
     the Agents out on the street                  -> talk; take one into the Hollow
     your sibling behind the counter               -> talk
   You walk as the sibling you chose (Wise or Belle); Eous waddles after you.
   WASD / arrows to walk, Shift to run, E to use what has a sign over it; or
   click / tap where to go (a sign: go and use it); or drag to steer (the
   thumb stick, main.js). Walking into Random Play cuts its front away.

     Lobby.start({ me: 'wise'|'belle', chooser, onUse(id), tags: el, spawn })
     Lobby.stop()  Lobby.update(dt)  Lobby.tap(x, y)  Lobby.choose(id)
     Lobby.STATIONS  (id -> label, sub)
   ========================================================================== */
(function () {
  'use strict';
  const { clamp, lerp, rnd } = U;
  const G = VX.glow, PI = Math.PI;
  const L = { running: false };

  /* ---------------------------------------------------- voxel helpers --
     A grid at grain s (metres per voxel). box() takes metres, [x0,x1) etc.;
     a colour function gets the voxel's low corner in metres. mesh() places
     it so that box(0,0,0,1,1,1) fills exactly one cubic metre at the origin. */
  function grid(s, jit) {
    const g = new VX.Grid(); g.jit = jit != null ? jit : 0.05;
    const q = m => Math.round(m / s);
    return {
      g, s, q,
      box(x0, y0, z0, x1, y1, z1, c) {
        g.box(q(x0), q(y0), q(z0), q(x1) - 1, q(y1) - 1, q(z1) - 1, typeof c === 'function' ? (x, y, z) => c(x * s, y * s, z * s) : c);
      },
      cut(x0, y0, z0, x1, y1, z1) { g.cut(q(x0), q(y0), q(z0), q(x1) - 1, q(y1) - 1, q(z1) - 1); },
    };
  }
  function mesh(Gd, x, y, z, opts) {
    const m = VX.object(Gd.g, Gd.s, { cast: !(opts && opts.cast === false) });
    m.position.set((x || 0) + Gd.s / 2, (y || 0) + Gd.s / 2, (z || 0) + Gd.s / 2);
    return m;
  }
  /* a flat sign with text drawn on a canvas, facing +z */
  function sign(w, h, draw) {
    const c = document.createElement('canvas'); c.width = Math.round(w * 160); c.height = Math.round(h * 160);
    const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
    const paint = () => { ctx.clearRect(0, 0, c.width, c.height); draw(ctx, c.width, c.height); tex.needsUpdate = true; };
    paint(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
    return m;
  }
  const glass = (w, h, col, op) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col || 0x9fd0ff, transparent: true, opacity: op || 0.22, depthWrite: false, side: THREE.DoubleSide }));
  const hash = (x, z) => { const h = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return h - Math.floor(h); };

  /* ---------------------------------------------------- the street -- */
  const STREET = { x0: -24, x1: 24, z0: -1.5, z1: 4.5 };
  const BOUNDS = { x0: -21.5, x1: 21.5, z0: -13.6, z1: 6.4 };
  const STORE = { x0: -6, x1: 6, z0: -14, z1: -4, door0: -1.1, door1: 1.1 };
  const inStore = (x, z) => x > STORE.x0 && x < STORE.x1 && z < STORE.z1 - 0.05;
  const COL = [];                 // colliders: [x0, z0, x1, z1]
  const solid = (x0, z0, x1, z1) => COL.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);

  function buildGround(root) {
    const A = grid(0.25, 0.04);
    // asphalt, the centre line, edge lines, a crosswalk, a manhole
    A.box(STREET.x0, -0.25, STREET.z0, STREET.x1, 0, STREET.z1, (x, y, z) => {
      const cz = Math.abs(z - 1.5) < 0.13 && (((x + 24) % 3) < 1.6);
      const edge = Math.abs(z - (STREET.z0 + 0.3)) < 0.13 || Math.abs(z - (STREET.z1 - 0.3)) < 0.13;
      const cross = x >= 7 && x < 10 && z > STREET.z0 + 0.5 && z < STREET.z1 - 0.5 && (Math.floor(z * 2) % 2 === 0);
      const hole = Math.hypot(x + 3, z - 3) < 0.5;
      return cross || cz || edge ? 0xe6e4dc : hole ? (Math.hypot(x + 3, z - 3) > 0.35 ? 0x5a5a60 : 0x4a4a50) : 0x3a3c43;
    });
    // sidewalks: paving tiles, a curb along the street
    const walk = (z0, z1, curbZ) => A.box(STREET.x0, -0.25, z0, STREET.x1, 0, z1, (x, y, z) =>
      Math.abs(z - curbZ) < 0.26 ? 0xbcb6ab : ((Math.floor(x / 0.75) + Math.floor(z / 0.75)) & 1) ? 0xa69e93 : 0x978f85);
    walk(-4, STREET.z0, STREET.z0 - 0.25); walk(STREET.z1, 7.5, STREET.z1);
    root.add(mesh(A, 0, 0, 0, { cast: false }));
    // the far side of the street: a low wall and railing (it is behind the camera most of the time)
    const W = grid(0.25);
    W.box(-24, 0, 7.5, 24, 0.75, 7.75, 0x8a8478); W.box(-24, 0.75, 7.5, 24, 1.0, 7.75, 0x6c665c);
    root.add(mesh(W, 0, 0, 0));
    solid(-24, 7.4, 24, 8);
  }

  /* ---------------------------------------------------- Random Play --
     The front (and the whole upper floor) are their own meshes so that they
     can be cut away while you are inside. */
  const RP = {};
  function buildRandomPlay(root) {
    const s = 0.25, { x0, x1, z0, z1 } = STORE, H1 = 3.5, H2 = 7.0;
    const BRICK = (x, y, z) => { const row = Math.floor(y / 0.25), off = row & 1 ? 0.25 : 0; return ((Math.floor((x + z + off) / 0.5)) % 7 === 0) ? 0x7a3226 : (row % 4 === 0 ? 0x8d3c2e : 0x9c4635); };
    // the shell: side and back walls to the first floor, the floor
    // (nothing in one mesh may share a face with another: where two surfaces lie in the same plane they
    // flicker against each other, so the side walls stop where the storefront begins, and so on)
    const B = grid(s, 0.06), zf = z1 - 0.25;
    B.box(x0 - 0.25, 0, z0, x0, H1, zf, BRICK); B.box(x1, 0, z0, x1 + 0.25, H1, zf, BRICK); B.box(x0 - 0.25, 0, z0 - 0.25, x1 + 0.25, H1, z0, BRICK);
    B.box(x0, -0.25, z0, x1, 0.01, z1, (x, y, z) => (Math.floor(x / 0.5) & 1) ? 0x8a6a4a : 0x7b5d41);                // wooden floor
    B.box(x0, 0, z0, x0 + 0.25, 1.0, zf, 0x2f3d4c); B.box(x1 - 0.25, 0, z0, x1, 1.0, zf, 0x2f3d4c); B.box(x0, 0, z0, x1, 1.0, z0 + 0.25, 0x2f3d4c); // wainscot
    B.box(x0, 1.0, z0, x0 + 0.25, H1, zf, 0xe6d9bd); B.box(x1 - 0.25, 1.0, z0, x1, H1, zf, 0xe6d9bd); B.box(x0, 1.0, z0, x1, H1, z0 + 0.25, 0xe6d9bd);
    root.add(mesh(B, 0, 0, 0));
    solid(x0 - 0.3, z0, x0, z1); solid(x1, z0, x1 + 0.3, z1); solid(x0, z0 - 0.3, x1, z0);
    // the front: a yellow storefront with the door between two windows, the sign above
    const F = grid(s, 0.05), YEL = 0xf2c230, YEL2 = 0xd8aa22, TRIM = 0x2a2a30;
    const fz = z1 - 0.25;
    F.box(x0 - 0.25, 0, fz, x1 + 0.25, H1, z1, (x, y) => y < 0.5 ? TRIM : y > 2.7 ? TRIM : (Math.floor(x / 0.5) % 2 ? YEL : YEL2));
    F.cut(STORE.door0, 0, fz, STORE.door1, 2.5, z1);                                     // the door
    F.cut(-5.25, 0.75, fz, -1.75, 2.5, z1); F.cut(1.75, 0.75, fz, 5.25, 2.5, z1);         // the windows
    F.box(STORE.door0 - 0.25, 0, fz - 0.01, STORE.door0, 2.5, z1, TRIM); F.box(STORE.door1, 0, fz - 0.01, STORE.door1 + 0.25, 2.5, z1, TRIM);
    RP.front = mesh(F, 0, 0, 0); root.add(RP.front);
    for (const cx of [-3.5, 3.5]) { const gl = glass(3.5, 1.75); gl.position.set(cx, 1.625, z1 - 0.12); RP.front.add(gl); gl.position.sub(RP.front.position); }
    const sg = sign(6.2, 0.8, (c, w, h) => {
      c.fillStyle = '#141416'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff'; c.font = `italic 700 ${Math.round(h * 0.62)}px Rubik, "Segoe UI", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Random Play', w / 2, h * 0.54);
      c.fillStyle = '#f2c230'; c.fillRect(w * 0.06, h * 0.86, w * 0.88, h * 0.05);
    });
    sg.position.set(0, 3.1 - RP.front.position.y, z1 + 0.02 - RP.front.position.z); sg.position.x -= RP.front.position.x; RP.front.add(sg);
    solid(x0 - 0.3, z1 - 0.3, STORE.door0, z1 + 0.05); solid(STORE.door1, z1 - 0.3, x1 + 0.3, z1 + 0.05);
    // what stands in for the front while it is cut away: its bottom rail
    const Lw = grid(s); Lw.box(x0 - 0.25, 0, fz, STORE.door0, 0.25, z1, TRIM); Lw.box(STORE.door1, 0, fz, x1 + 0.25, 0.25, z1, TRIM);
    RP.low = mesh(Lw, 0, 0, 0); RP.low.visible = false; root.add(RP.low);
    // the upper floor: brick, windows, the roof edge, a black metal stair up the side
    const U2 = grid(s, 0.06);
    U2.box(x0 - 0.25, H1, z0 - 0.25, x1 + 0.25, H2, z1, (x, y, z) => (z > z0 && z < z1 - 0.3 && x > x0 && x < x1 && y > H1 + 0.24) ? -1 : BRICK(x, y, z));
    for (const wx of [-4.5, -1.5, 1.5]) U2.cut(wx, 4.5, z1 - 0.25, wx + 2, 6, z1);
    U2.box(x0 - 0.5, H2, z0 - 0.5, x1 + 0.5, H2 + 0.25, z1 + 0.25, 0x5a5e66);              // roof edge
    U2.box(x0 - 0.25, H1, z1, x1 + 0.25, H1 + 0.25, z1 + 0.5, TRIM);                      // a ledge over the storefront
    U2.box(x0 + 0.25, H1 - 0.25, z0 + 0.25, x1 - 0.25, H1, z1 - 0.25, 0x3a3a40);           // ceiling, between the walls' inner layers
    RP.upper = mesh(U2, 0, 0, 0); root.add(RP.upper);
    for (const wx of [-3.5, -0.5, 2.5]) { const gl = glass(2, 1.5, 0xffd890, 0.55); gl.position.set(wx, 5.25, z1 - 0.13); RP.upper.add(gl); gl.position.sub(RP.upper.position); }
    const ST = grid(0.125, 0.03);                                                           // the stair
    for (let i = 0; i < 14; i++) ST.box(x1 + 0.3, i * 0.25, z1 - 1.0 - i * 0.4, x1 + 1.5, i * 0.25 + 0.125, z1 - 0.6 - i * 0.4, 0x2a2c32);
    ST.box(x1 + 1.375, 0, z1 - 6.4, x1 + 1.5, 4.2, z1 - 0.6, (x, y, z) => (Math.abs(y - (z1 - 0.6 - z) * 0.62 - 0.9) < 0.07) ? 0xd85a2a : -1);
    root.add(mesh(ST, 0, 0, 0)); solid(x1 + 0.3, z0 + 0.5, x1 + 1.6, z1 - 0.5);
    buildStoreInside(root);
  }

  function buildStoreInside(root) {
    const s = 0.125, TAPES = [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x3ab87a, 0xe86ab0, 0xf0f0f0, 0x2a2a30, 0xff8a3a, 0x8a5ad8, 0x5fe8e0];
    const WOOD = 0x5a3a28, WOOD2 = 0x6e4a32;
    const I = grid(s, 0.04);
    // tape shelves: a tall unit on the west wall, an island, a short one on the east wall
    const shelf = (xa, xb, za, zb, h, faceX) => {
      I.box(xa, 0, za, xb, h, zb, (x, y, z) => {
        const shelfRow = Math.abs((y % 0.5)) < 0.12;
        const frame = shelfRow || z < za + 0.12 || z >= zb - 0.13 || y >= h - 0.13;
        const back = faceX > 0 ? x < xa + 0.13 : x >= xb - 0.13;
        if (frame || back) return frame ? WOOD : WOOD2;
        return TAPES[Math.floor(hash(Math.floor(z / 0.125), Math.floor(y / 0.5)) * TAPES.length)];
      });
    };
    shelf(-5.75, -5.25, -12.5, -5.25, 2.25, 1); solid(-6, -12.5, -5.2, -5.25);
    shelf(-2.75, -2.25, -10.75, -6.75, 1.5, -1); shelf(-2.25, -1.75, -10.75, -6.75, 1.5, 1); solid(-2.8, -10.8, -1.7, -6.7);
    shelf(5.25, 5.75, -10.5, -8.0, 1.75, -1); solid(5.2, -10.5, 6, -8);
    // the counter, with the shop computer and the till
    I.box(1.5, 0, -8.75, 4.75, 1.0, -7.75, (x, y, z) => y >= 0.87 ? 0xf2c230 : (z > -7.9 ? 0x3a2a20 : WOOD));
    I.box(1.875, 1.0, -8.5, 2.75, 1.125, -8.0, 0x2a2a30); I.box(2.0, 1.125, -8.4, 2.625, 1.75, -8.275, 0x1c1c22); I.box(2.0, 1.25, -8.275, 2.625, 1.625, -8.15, G(0x5ad0ff)); // monitor
    I.box(3.625, 1.0, -8.5, 4.25, 1.375, -8.0, 0x8a8c94); I.box(3.75, 1.375, -8.375, 4.125, 1.5, -8.125, G(0x7aff9a));                // till
    I.box(3.0, 1.0, -8.4, 3.375, 1.25, -8.1, (x, y) => TAPES[Math.floor(y * 8) % TAPES.length]);                                     // a stack of tapes
    solid(1.45, -8.8, 4.8, -7.7);
    // a sofa in the window
    I.box(3.75, 0, -6.0, 5.75, 0.5, -5.0, 0xd8603a); I.box(3.75, 0.5, -6.0, 5.75, 1.0, -5.75, 0xc04e2c); I.box(3.75, 0.5, -6.0, 4.0, 0.75, -5.0, 0xc04e2c); I.box(5.5, 0.5, -6.0, 5.75, 0.75, -5.0, 0xc04e2c);
    solid(3.7, -6.05, 5.8, -4.95);
    // the back room: the Hollow Deep Dive System. A desk of monitors (one big Hollow map), a chair, a server rack.
    I.box(-6, 0, -11.5, -0.75, 2.5, -11.25, 0x3a4652); I.box(3.75, 0, -11.5, 6, 2.5, -11.25, 0x3a4652);   // the partition
    I.box(-0.75, 2.25, -11.5, 3.75, 2.5, -11.25, 0x3a4652);
    solid(-6, -11.55, -0.75, -11.2); solid(3.75, -11.55, 6, -11.2);
    I.box(-0.5, 0, -13.75, 3.5, 0.875, -13.125, 0x2a2c32); I.box(-0.5, 0.75, -13.75, 3.5, 0.875, -13.125, 0x3a3c44);                       // desk
    I.box(0.25, 0.875, -13.75, 2.75, 2.375, -13.625, 0x16161a); I.box(0.375, 1.0, -13.625, 2.625, 2.25, -13.5, (x, y) => G(((Math.floor(x * 8) + Math.floor(y * 8)) % 5 === 0) ? 0x9af4ff : (y > 1.7 ? 0x2a7aa8 : 0x1f5a88))); // the big screen: a Hollow map
    for (const [mx, my] of [[-0.5, 1.25], [3.125, 1.25]]) { I.box(mx, 0.875, -13.75, mx + 0.75, my + 0.625, -13.5, 0x16161a); I.box(mx + 0.125, 1.0, -13.5, mx + 0.625, my + 0.5, -13.375, G(0x5fe8e0)); }
    I.box(1.125, 0, -12.75, 1.875, 0.5, -12.0, 0x1c1c22); I.box(1.125, 0.5, -12.875, 1.875, 1.375, -12.75, 0xd8603a); I.box(1.25, 0.5, -12.625, 1.75, 0.625, -12.125, 0x2a2a30); // the chair
    I.box(4.5, 0, -13.75, 5.75, 2.125, -13.0, 0x24262c); for (let y = 0.25; y < 2; y += 0.25) for (let x = 4.75; x < 5.6; x += 0.25) I.box(x, y, -13.0, x + 0.125, y + 0.125, -12.875, G(hash(x, y) > 0.5 ? 0x7aff9a : 0xffb040)); // rack LEDs
    for (let x = -0.25; x < 5; x += 0.375) I.box(x, 0, -12.75 + Math.sin(x * 3) * 0.25, x + 0.375, 0.0625 + 0.06, -12.625 + Math.sin(x * 3) * 0.25, 0x111114); // cables
    solid(-0.6, -14, 3.6, -13.05); solid(4.4, -14, 6, -12.9); solid(1.1, -12.8, 1.9, -12.0);
    // posters
    const POST = [[0xd84a3a, 0xf2c230], [0x3a7ad8, 0xf0f0f0], [0x8a5ad8, 0x5fe8e0], [0x2a2a30, 0xff8a3a]];
    [[-5.75, 2.375, -10.5, 'x', 0.75], [5.625, 1.5, -6.5, 'x', 1.0], [-4.0, 1.25, -13.75, 'z', 1.0], [-2.0, 1.25, -13.75, 'z', 1.0]].forEach(([px, py, pz, ax, ph], i) => {
      const [a, b] = POST[i % POST.length];
      if (ax === 'x') I.box(px, py, pz, px + 0.125, py + ph, pz + 0.75, (x, y, z) => (y - py > ph * 0.6 ? b : a)); else I.box(px, py, pz, px + 0.75, py + ph, pz + 0.125, (x, y) => (y - py > 0.6 ? b : a));
    });
    root.add(mesh(I, 0, 0, 0));
    // a light over the counter and one over the HDD (inside, so they show when the ceiling is cut away)
    const l1 = new THREE.PointLight(0xffe0b0, 0.8, 9); l1.position.set(1, 3.0, -8); root.add(l1);
    const l2 = new THREE.PointLight(0x5ad0ff, 0.9, 6); l2.position.set(1.5, 2.0, -12.6); root.add(l2);
  }

  /* ---------------------------------------------------- the neighbours -- */
  function facade(root, xa, xb, h, wall, wall2, opts) {
    const s = 0.5, F = grid(s, 0.06), open = opts && opts.open;
    F.box(xa, 0, -14, xb, h, -4, (x, y, z) => {
      if (z > -13.5 && z < -4.5 && x > xa + 0.4 && x < xb - 0.5 && y > 0.4 && y < h - 0.5) return -1;   // hollow
      if (open && z >= -4.5 && x >= open[0] && x < open[1] && y < open[2]) return -1;                    // the shopfront, open
      if (open && x >= open[0] && x < open[1] && y < open[2] && z >= -8 && z < -4.5) return -1;           // and the shop behind it
      if (z >= -4.5 && y > 3.5 && ((Math.floor(x) % 3) === 1) && (Math.floor(y) % 3) === 1) return opts && opts.lit ? G(0xffd890) : 0x3a4250; // windows
      return (Math.floor(y / 0.5) % 6 === 0) ? wall2 : wall;
    });
    root.add(mesh(F, 0, 0, 0));
    solid(xa, -14, xb, -4);
  }
  function buildNeighbours(root) {
    // Bardic Needle: a record shop under a big green oval sign, records in the window, a rack outside
    facade(root, -22, -7, 8, 0x6c7680, 0x5a626c, { lit: true, open: [-20.5, -8.5, 3.0] });
    const BN = grid(0.25, 0.05);
    BN.box(-20.5, -0.25, -7.5, -8.5, 0.01, -4.25, (x) => (Math.floor(x / 0.5) & 1) ? 0x5a4a3c : 0x4e4034);         // the shop: floor, ceiling, walls
    BN.box(-20.5, 2.75, -7.5, -8.5, 3.0, -4.25, 0x2c2c32); BN.box(-20.5, 0, -7.75, -8.5, 3.0, -7.5, 0x2e3e48);
    for (let x = -20; x < -9; x += 1.5) BN.box(x, 0, -7.5, x + 1.25, 2.25, -7.0, (xx, y) => (Math.abs(y % 0.5) < 0.13) ? 0x3a2a20 : [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x3ab87a, 0xe86ab0, 0x141416][Math.floor(hash(xx * 4, y * 2) * 6)]); // record shelves
    BN.box(-15.5, 0, -6.25, -12.5, 0.875, -5.5, 0x3a2a20); BN.box(-15.375, 0.875, -6.125, -12.625, 1.0, -5.625, (x) => [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x8a5ad8][Math.floor(x * 4) & 3]); // a crate table of records
    BN.box(-20.5, 0, -4.25, -8.5, 3.0, -4.0, (x, y) => y < 0.5 || y >= 2.5 ? 0x2c3a34 : -1);
    for (let i = 0; i < 6; i++) { const cx = -19.5 + i * 1.75; BN.box(cx, 1.0, -4.5, cx + 1.25, 2.25, -4.25, (x, y) => Math.hypot(x - cx - 0.625, y - 1.625) < 0.6 ? (Math.hypot(x - cx - 0.625, y - 1.625) < 0.15 ? [0xd84a3a, 0xf2c230, 0x3ab87a][i % 3] : 0x141416) : 0x2e3e48); }
    BN.box(-12, 0, -3.75, -10, 1.0, -3.25, 0x3a2a20); BN.box(-11.875, 1.0, -3.625, -10.125, 1.5, -3.375, (x) => [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x8a5ad8][Math.floor(x * 4) & 3]); // record rack outside
    root.add(mesh(BN, 0, 0, 0)); solid(-12.1, -3.8, -9.9, -3.2);
    const bn = sign(6, 2.2, (c, w, h) => {
      c.fillStyle = '#1e5a46'; c.beginPath(); c.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, PI * 2); c.fill();
      c.strokeStyle = '#cfe8d8'; c.lineWidth = 10; c.stroke();
      c.fillStyle = '#e8f4ec'; c.font = `900 ${Math.round(h * 0.3)}px "Bebas Neue", Rubik, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('BARDIC', w / 2, h * 0.36); c.fillText('NEEDLE', w / 2, h * 0.68);
    });
    bn.position.set(-14.5, 4.6, -3.9); root.add(bn);
    // Chop's noodle stand: an open kitchen behind a counter, stools, red curtains and lanterns, a big sign
    facade(root, 7.5, 16.5, 7.5, 0xc8b49a, 0xb09c82, { open: [8, 16, 3.0] });
    const N = grid(0.25, 0.05);
    N.box(8, -0.25, -7.5, 16, 0.01, -4.75, 0x6a6a64);                                                         // the kitchen: floor, ceiling, a tiled back wall
    N.box(8, 2.75, -7.5, 16, 3.0, -4.25, 0x3a3430); N.box(8, 0, -7.75, 16, 3.0, -7.5, (x, y) => ((Math.floor(x / 0.25) + Math.floor(y / 0.25)) & 1) ? 0xe8e4dc : 0xd0ccc4);
    N.box(8.5, 0, -7.5, 15.5, 1.0, -6.75, 0x8a8c94); N.box(9.0, 1.0, -7.25, 10.0, 1.5, -6.75, 0x5a5a60); N.box(12.0, 1.0, -7.25, 13.0, 1.75, -6.75, 0x5a5a60); // the range, two big pots
    N.box(10.25, 1.75, -7.5, 14.75, 2.25, -7.25, 0x3a2a20); for (let x = 10.5; x < 14.5; x += 0.5) N.box(x, 2.25, -7.5, x + 0.25, 2.5, -7.25, 0xe8e8e0); // a shelf of bowls
    N.box(8, 0, -4.75, 16, 1.0, -4.0, (x, y) => y >= 0.75 ? 0xc89a5a : 0x7a2a22);                         // counter
    N.box(8, 2.25, -4.25, 16, 3.0, -4.0, (x) => (Math.floor(x / 0.75) & 1) ? 0xd8342c : 0xb82a24);        // the curtain
    for (const sx of [9.25, 10.75, 12.25, 13.75, 15.0]) { N.box(sx - 0.25, 0, -3.5, sx + 0.25, 0.5, -3.0, 0x2a2a30); N.box(sx - 0.25, 0.5, -3.5, sx + 0.25, 0.75, -3.0, 0xd8342c); solid(sx - 0.3, -3.55, sx + 0.3, -2.95); }
    N.box(8.25, 1.0, -4.75, 9.0, 1.5, -4.25, 0xe8e8e0); N.box(14.5, 1.0, -4.75, 15.5, 1.25, -4.25, 0xe8e8e0); // bowls, a pot
    root.add(mesh(N, 0, 0, 0)); solid(8, -4.8, 16, -3.95);
    const ch = sign(7, 1.2, (c, w, h) => {
      c.fillStyle = '#1a1210'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f2c230'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, h - 12);
      c.fillStyle = '#ffd890'; c.font = `900 ${Math.round(h * 0.55)}px "Bebas Neue", Rubik, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText("CHOP'S NOODLES", w / 2, h * 0.55);
    });
    ch.position.set(12, 3.9, -3.95); root.add(ch);
    for (const lx of [8.5, 15.5]) { const lan = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7a3a, toneMapped: false })); lan.position.set(lx, 3.0, -3.8); lan.scale.y = 1.3; root.add(lan); }
    // the 141 convenience store: white, a blue and orange band, its lit windows
    facade(root, 17, 23, 6, 0xe8e8e4, 0xd0d0cc, { open: [17.5, 22.5, 3.0] });
    const K = grid(0.25, 0.03);
    K.box(17.5, -0.25, -7.5, 22.5, 0.01, -4.25, 0xe0e0dc); K.box(17.5, 2.75, -7.5, 22.5, 3.0, -4.25, G(0xfff8e8)); K.box(17.5, 0, -7.75, 22.5, 3.0, -7.5, 0xf4f4f0);
    for (const x of [18, 20, 21.5]) K.box(x, 0, -7.0, x + 0.75, 1.75, -5.25, (xx, y) => (Math.abs(y % 0.5) < 0.13) ? 0xb0b0b8 : [0xd84a3a, 0x3a7ad8, 0xf2c230, 0x3ab87a, 0xff8a3a][Math.floor(hash(xx * 4, y * 3) * 5)]); // shelves of snacks
    K.box(17.5, 0, -4.25, 22.5, 3.0, -4.0, (x, y) => y < 0.5 ? 0x3a3a40 : y >= 2.5 ? (y >= 2.75 ? 0x2a6ad8 : 0xff8a3a) : -1);
    root.add(mesh(K, 0, 0, 0));
    const kg = glass(5.5, 2.0, 0xfff8e0, 0.55); kg.position.set(20, 1.5, -4.1); root.add(kg);
    const k1 = sign(1.6, 0.8, (c, w, h) => { c.fillStyle = '#2a6ad8'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `900 ${Math.round(h * 0.7)}px Rubik, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('141', w / 2, h * 0.55); });
    k1.position.set(18.2, 3.6, -3.95); root.add(k1);
    // the ends of the street and the city beyond
    const E = grid(1, 0.05);
    E.box(-28, 0, -16, -24, 14, 8, (x, y) => y % 3 === 1 && Math.floor(x + y) % 2 ? G(0xffd890) : 0x5a6270);
    E.box(24, 0, -16, 28, 12, 8, (x, y) => y % 3 === 1 && Math.floor(x + y) % 2 ? G(0xffd890) : 0x6a6458);
    for (let i = 0; i < 16; i++) {
      const bx = -40 + i * 5.5 + hash(i, 1) * 2, h = 12 + Math.floor(hash(i, 2) * 26), bz = -24 - Math.floor(hash(i, 3) * 14), w = 4;
      E.box(bx, 0, bz, bx + w, h, bz + 4, (x, y, z) => (z >= bz + 3 && y % 2 === 1 && hash(x, y) > 0.55) ? G(hash(x, z) > 0.5 ? 0xffd890 : 0xbfe0ff) : (y >= h - 1 ? 0x4a5060 : 0x6a7080));
    }
    root.add(mesh(E, 0, 0, 0, { cast: false }));
    solid(-28, -16, -21.8, 8); solid(21.8, -16, 28, 8);
  }

  /* power poles with crossarms, street lamps, wires sagging between them */
  function buildPoles(root) {
    const P = grid(0.125, 0.03), poles = [-20, -7.5, 7.5, 20];
    for (const px of poles) {
      P.box(px - 0.125, 0, -2.375, px + 0.125, 8.5, -2.125, 0x9a968c);
      P.box(px - 0.75, 7.75, -2.375, px + 0.75, 7.875, -2.125, 0x6a665e);
      P.box(px + 0.125, 5.5, -2.5, px + 0.625, 6.25, -2.0, 0x8a8c90);                                      // transformer
      P.box(px - 0.125, 5.0, -2.25, px + 0.125, 5.125, -0.75, 0x4a4c52); P.box(px - 0.25, 4.75, -1.0, px + 0.25, 5.0, -0.5, G(0xfff0c0)); // street lamp
      solid(px - 0.25, -2.5, px + 0.25, -2.0);
    }
    root.add(mesh(P, 0, 0, 0));
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1a1e });
    for (let i = 0; i < poles.length - 1; i++) for (const off of [-0.6, 0, 0.6]) {
      const a = poles[i] + off, b = poles[i + 1] + off, pts = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(new THREE.Vector3(lerp(a, b, t), 7.85 - Math.sin(t * PI) * 0.6, -2.25)); }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.02, 4), mat); root.add(tube);
    }
    for (const px of poles) { const lp = new THREE.PointLight(0xffd8a0, 0.5, 8); lp.position.set(px, 4.6, -0.75); root.add(lp); }
  }

  /* Caesar's motorcycle (orange and black), Yixuan's bench under a little tree */
  function buildProps(root) {
    const M = grid(0.0625, 0.04), OR = 0xf08a2a, BK = 0x1c1c22, CH = 0xb0b2b8;
    const wheel = (cz) => { for (let y = 0; y <= 0.75; y += 0.0625) for (let z = -0.375; z <= 0.375; z += 0.0625) { const d = Math.hypot(y - 0.375, z); if (d < 0.38 && d > 0.25) M.box(-0.0625, y, cz + z, 0.0625, y + 0.0625, cz + z + 0.0625, BK); else if (d < 0.1) M.box(-0.0625, y, cz + z, 0.0625, y + 0.0625, cz + z + 0.0625, CH); } };
    wheel(-0.75); wheel(0.75);
    M.box(-0.1875, 0.375, -0.75, 0.1875, 0.625, 0.75, BK); M.box(-0.25, 0.5, -0.375, 0.25, 0.875, 0.375, OR); M.box(-0.1875, 0.8125, -0.75, 0.1875, 0.9375, -0.125, BK);
    M.box(-0.4375, 1.0, 0.625, 0.4375, 1.0625, 0.6875, CH); M.box(-0.0625, 0.5, 0.5, 0.0625, 1.0, 0.75, CH); M.box(-0.125, 0.875, 0.75, 0.125, 1.0, 0.8125, G(0xfff0c0));
    const bike = mesh(M, -8.2, 0, 0.3); bike.rotation.y = 0.35; root.add(bike); solid(-9.0, -0.6, -7.4, 1.2);
    const Bn = grid(0.125, 0.04);
    Bn.box(-18.25, 0, -3.25, -16.25, 0.375, -2.75, 0x3a3c42); Bn.box(-18.25, 0.375, -3.25, -16.25, 0.5, -2.625, 0xa8724a); Bn.box(-18.25, 0.5, -3.25, -16.25, 1.0, -3.125, 0xa8724a);
    Bn.box(-19.5, 0, -3.75, -18.75, 0.5, -3.0, 0x6c665c); Bn.box(-19.25, 0.5, -3.5, -19.0, 1.75, -3.25, 0x5a3a28);
    Bn.box(-20.0, 1.5, -4.0, -18.25, 2.75, -2.75, (x, y, z) => hash(x * 9, y * 7 + z * 3) > 0.25 ? (hash(x, z) > 0.5 ? 0x4a8a3a : 0x3a7a2e) : -1);
    root.add(mesh(Bn, 0, 0, 0)); solid(-18.3, -3.3, -16.2, -2.6); solid(-19.6, -3.8, -18.7, -2.9);
    buildArcade(root);
  }
  /* two arcade cabinets in front of Random Play's left window: Proxy Clash */
  function buildArcade(root) {
    const A = grid(0.0625, 0.03), BODY = 0x2a1f3a, BODY2 = 0x221a30, PINK = 0xff4a7a, CYAN = 0x4ae8f0;
    const cab = (x0, art) => {
      const x1 = x0 + 0.875, zb = -3.875, zf = -3.125;
      A.box(x0, 0, zb, x1, 0.875, zf, (x, y) => (Math.abs(x - x0) < 0.07 || Math.abs(x - x1 + 0.0625) < 0.07) && y > 0.2 ? (Math.floor(y * 8) % 3 ? art : BODY2) : BODY);   // the cabinet, side art
      A.box(x0, 0.875, zb, x1, 1.0, zf + 0.25, BODY2);                                                                                  // control panel
      for (const [bx, c] of [[0.5, PINK], [0.625, CYAN], [0.75, 0xf2c230]]) A.box(x0 + bx - 0.0625, 1.0, zf + 0.0625, x0 + bx, 1.0625, zf + 0.125, G(c));   // buttons
      A.box(x0 + 0.1875, 1.0, zf + 0.0625, x0 + 0.25, 1.125, zf + 0.125, 0x111114); A.box(x0 + 0.1875, 1.125, zf + 0.0625, x0 + 0.25, 1.1875, zf + 0.125, G(PINK)); // the stick
      A.box(x0, 1.0, zb, x1, 1.75, zf - 0.1875, (x, y) => Math.abs(x - x0) < 0.07 || Math.abs(x - x1 + 0.0625) < 0.07 ? art : BODY);   // the screen housing
      A.box(x0 + 0.125, 1.0625, zf - 0.1875, x1 - 0.125, 1.6875, zf - 0.125, (x, y) => G(((Math.floor(x * 16) + Math.floor(y * 16)) % 6 === 0) ? 0xffffff : (y > 1.4 ? PINK : CYAN)));   // the screen: two fighters' colours
      A.box(x0, 1.75, zb, x1, 2.0, zf - 0.0625, (x) => G(Math.floor((x - x0) * 8) % 2 ? art : 0xfff0f6));                              // the lit marquee
    };
    cab(-5.0, PINK); cab(-3.75, CYAN);
    root.add(mesh(A, 0, 0, 0));
    solid(-5.05, -3.9, -2.85, -2.85);
    const sg = sign(2.6, 0.55, (c, w, h) => {
      c.fillStyle = '#16101e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ff4a7a'; c.lineWidth = 6; c.strokeRect(4, 4, w - 8, h - 8);
      c.font = `900 ${Math.round(h * 0.62)}px "Bebas Neue", Rubik, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = '#4ae8f0'; c.fillText('PROXY', w * 0.33, h * 0.56); c.fillStyle = '#ff4a7a'; c.fillText('CLASH', w * 0.69, h * 0.56);
    });
    sg.position.set(-3.9, 2.35, -3.4); root.add(sg);
    const lp = new THREE.PointLight(0xff6aa0, 0.45, 4); lp.position.set(-3.9, 1.6, -2.4); root.add(lp);
  }

  /* ---------------------------------------------------- people -- */
  const STATIONS = {
    hdd: { label: 'Hollow Deep Dive', sub: 'HDD system · into the Hollow', x: 0.5, z: -11.7, sx: 1.5, sy: 2.7, sz: -13.4, r: 1.5, inside: true },
    lab: { label: 'Battle Lab', sub: 'Shop computer', x: 2.3, z: -7.0, sx: 2.3, sy: 2.2, sz: -8.2, r: 1.0, inside: true },
    howto: { label: 'How to Play', sub: 'Tutorial tapes', x: -4.7, z: -8.5, sx: -5.5, sy: 2.7, sz: -8.5, r: 1.2, inside: true },
    records: { label: 'Proxy Records', sub: 'Notice board', x: 3.6, z: -3.0, sx: 3.6, sy: 2.4, sz: -3.85, r: 1.2 },
    clash: { label: 'Proxy Clash', sub: 'Arcade · Agent vs Agent', x: -3.9, z: -2.3, sx: -3.9, sy: 2.95, sz: -3.4, r: 1.3 },
  };
  L.STATIONS = STATIONS;
  /* where the Agents spend the evening, and the pose they hold there. `sit` raises (or lowers) a seated
     Agent so that her hips rest on the seat: Yixuan's bench is 0.5 m high, Burnice's stool 0.75 m. */
  const SPOTS = {
    caesar: { x: -6.7, z: 0.9, face: 0.4, pose: { armL: [-1.25, -0.7, 0.2], armR: [-1.25, 0.7, -0.2], torso: [-0.05, 0, 0], head: [0.05, -0.3, 0], legL: [0.1, 0, 0.15], tilt: -0.05 } },
    burnice: { x: 10.75, z: -3.25, face: 0.35, sit: 0.17, pose: { legL: [-1.35, 0, 0.1], legR: [-1.15, 0, -0.15], armL: [-0.9, 0, 0.3], armR: [-1.5, 0.3, -0.2], torso: [-0.1, 0, 0], head: [-0.1, 0.2, 0] } },
    aria: { x: -12.6, z: -2.7, face: 0.5, pose: { armR: [-2.4, 0, -0.5], armL: [-0.2, 0, 0.4], head: [0, 0, 0.18], torso: [0, 0.2, 0.05] }, bounce: true },
    yixuan: { x: -17.25, z: -2.85, face: 0, sit: 0.03, pose: { legL: [-1.5, 0, 0.55], legR: [-1.5, 0, -0.55], armL: [-0.75, -0.6, 0.0], armR: [-0.75, 0.6, 0.0], torso: [0.05, 0, 0], head: [0.15, 0, 0] } },
    // Qingyi on patrol by the notice board, the staff planted
    qingyi: { x: 5.6, z: 0.6, face: -0.55, pose: { armR: [-0.15, 0, -0.1], armL: [-0.35, 0, 0.25], torso: [0, 0, 0], head: [0, 0.3, 0] } },
    // Ju Fufu bouncing on her toes, Hu Wei beside her
    jufufu: { x: -9.6, z: 0.7, face: 0.6, pose: { armL: [-1.2, -0.3, 0.5], armR: [-2.5, 0, -0.5], head: [0, 0, 0.15], torso: [0.05, 0, 0] }, bounce: true },
    // Orphie at the end of the street, arms folded, Magus coiled in the air
    orphie: { x: 13.2, z: 0.4, face: -0.9, pose: { armL: [-1.35, -0.75, 0.25], armR: [-1.35, 0.75, -0.25], torso: [-0.05, 0, 0], head: [0.05, 0.25, 0], legR: [0.15, 0, -0.1] } },
    // Remielle in the middle of the street, one hand raised to the dusk light
    remielle: { x: -2.3, z: 1.7, face: 0.25, pose: { armL: [-2.6, 0, 0.6], armR: [-0.35, 0, -0.35], head: [-0.25, 0, 0.1], torso: [-0.05, 0.1, 0.04], legR: [-0.2, 0, 0] } },
  };
  const LINES = {
    caesar: ['Phaethon! The Sons of Calydon ride when you say ride. Point me at the Hollow and I\'ll hold the line.', 'This bike? Rebuilt her three times. Same as the gang: nothing stays broken around me.'],
    burnice: ['Heyyy, Proxy! Want a Nitro-Fuel? No? More for me! Let\'s go torch some Ethereals!', 'Chop says if I set one more stool on fire I\'m paying for it. Worth it.'],
    aria: ['Oh! You\'re the Proxy everyone talks about! The Angels of Delusion are on a break... so how about a private show, in the Hollow?', 'Bardic Needle has our new single on vinyl! ...They put it behind the jazz. Hmph.'],
    yixuan: ['Breathe, Proxy. The Hollow rewards a still mind. When you are ready, I will follow your lead.', 'My bird likes this street. Too many noodles, it says. I disagree.'],
    qingyi: ['Proxy. Criminal Investigation Special Response Team, on patrol. Report anything suspicious. Or anything with noodles.', 'My sensors read this street as eighty-seven percent pleasant. The other thirteen percent is Caesar\'s bike.'],
    jufufu: ['Hey, hey, Proxy! Hu Wei says you smell like popcorn. That\'s the nicest thing it says about anyone!', 'Yunkui Summit\'s little tiger, ready to go! If the Hollow gets rowdy, Hu Wei and I\'ll just sit on it.'],
    orphie: ['Obol Squad, captain speaking. Give me a target and Magus will handle the rest.', 'Magus, don\'t growl at the Bangboo. ...It likes you, Proxy. That was it being friendly.'],
    remielle: ['A Proxy! The Covenant of Dayat sends its greetings. My light takes the colour of whoever stands beside me. Shall we find out yours?', 'Stay a moment... dusk on Sixth Street makes the loveliest colours.'],
    wise: ['Don\'t forget, the tapes on the bottom shelf are due back Thursday.', 'The HDD\'s running hot today. Lots of Agents, lots of Hollows. Good for business.', 'If the shop\'s quiet, that just means business is good... in the Hollow.'],
    belle: ['Did you rewind the tapes? You never rewind the tapes.', 'Eous has been polishing the HDD all morning. I think it\'s nervous.', 'Eight Agents on Sixth Street today. Somebody\'s going to need a Proxy.'],
  };
  L.LINES = LINES;

  function ent(modelId, x, z, face) {
    const M = MODELS[modelId], R = VX.rig(modelId, M), obj = new THREE.Group(), body = new THREE.Group();
    body.add(R.root); obj.add(body);
    return { id: modelId, model: M, rig: R, obj, body, kind: M.kind || 'humanoid', stance: (DATA.AGENTS[modelId] && DATA.AGENTS[modelId].stance) || 'brute', seed: rnd(0, 9), x, z, face: face || 0, airY: 0,
      anim: { state: 'idle', t: 0, th: 0.3, dur: 1, speed: 0, phase: 0, side: 1 } };
  }
  function place(e) { e.obj.position.set(e.x, 0, e.z); e.obj.rotation.y = e.face; }

  /* ---------------------------------------------------- state -- */
  let S = null;          // the running lobby
  let built = null;      // the street, built once and kept
  function build() {
    if (built) return built;
    COL.length = 0;
    const root = new THREE.Group();
    buildGround(root); buildRandomPlay(root); buildNeighbours(root); buildPoles(root); buildProps(root);
    built = { root, col: COL.slice() };
    return built;
  }

  L.start = (opts) => {
    L.stop();
    const W = BT.world, scene = W.scene;
    while (scene.children.length) scene.remove(scene.children[0]);
    // dusk over New Eridu
    scene.background = new THREE.Color(0xffd9a8);
    scene.fog = new THREE.Fog(0xf0b07a, 34, 95);
    VX.sky(scene, 0x41609e, 0xffb36a, 0xffe2b0);
    scene.add(new THREE.HemisphereLight(0xc4d4ff, 0x5a4232, 0.8));
    const sun = new THREE.DirectionalLight(0xffc488, 1.05);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 80;
    scene.add(sun, sun.target); W.sun = sun;
    const B = build(); scene.add(B.root);
    FX.attach(scene);
    const me = opts.me || 'wise', sib = me === 'wise' ? 'belle' : 'wise';
    S = { opts, t: 0, sun, keys: new Set(), path: [], useOnArrive: null, near: null, tags: {}, cam: new THREE.Vector3(0, 7, 6), look: new THREE.Vector3(0, 1, -2), inside: null };
    // the people: you, your sibling at the counter, Eous, the Agents and Yixuan's bird
    S.me = ent(me, opts.spawn ? opts.spawn[0] : 0, opts.spawn ? opts.spawn[1] : -5.4, PI * 0.0);
    S.sib = ent(sib, 4.2, -9.4, 0); S.sib.pose = { armL: [-0.95, 0, 0.25], armR: [-0.95, 0, -0.25], torso: [0.12, 0, 0], head: [0.05, 0, 0] };
    S.eous = ent('eous', S.me.x + 0.9, S.me.z + 0.8, 0); S.eous.walk = 0;
    S.npcs = Object.keys(SPOTS).map(id => { const sp = SPOTS[id], e = ent(id, sp.x, sp.z, sp.face); e.pose = sp.pose; e.sit = sp.sit; e.bounce = sp.bounce; return e; });
    S.bird = ent('inkbird', -17.25, -2.8, 0); S.bird.kind = 'float';
    // Ju Fufu's Hu Wei and Orphie's Magus keep them company
    S.pets = [['huwei', SPOTS.jufufu.x - 0.85, SPOTS.jufufu.z - 0.45, 0.6], ['magus', SPOTS.orphie.x + 0.7, SPOTS.orphie.z - 0.5, -0.9]].filter(p => MODELS[p[0]]).map(([id, x, z, f]) => { const e = ent(id, x, z, f); e.kind = 'float'; e.bx = x; e.bz = z; return e; });
    for (const e of [S.me, S.sib, S.eous, ...S.npcs, S.bird, ...S.pets]) { scene.add(e.obj); place(e); }
    if (opts.chooser) {               // the choice of sibling: both side by side in the shop, the camera close
      S.me.x = -0.85; S.me.z = -6.3; S.sib.x = 0.85; S.sib.z = -6.3; S.me.face = S.sib.face = 0; S.sib.pose = null;
      S.eous.x = 0; S.eous.z = -5.4; S.choice = null;
      for (const e of [S.me, S.sib, S.eous]) place(e);
    }
    // the signs over the places you can use, and over the people you can talk to
    S.tagLayer = opts.tags || null;
    if (S.tagLayer && !opts.chooser) {
      S.tagLayer.innerHTML = '';
      const mk = (id, label, sub, cls) => {
        const t = U.el('button', { class: 'lb-tag ' + (cls || ''), onpointerdown: ev => { ev.preventDefault(); ev.stopPropagation(); L.goUse(id); } }, U.el('b', null, label), U.el('small', null, sub), U.el('kbd', null, GAME.touch ? 'TAP' : 'E'));
        S.tagLayer.append(t); S.tags[id] = t;
      };
      for (const id in STATIONS) mk(id, STATIONS[id].label, STATIONS[id].sub, id === 'hdd' || id === 'clash' ? id : '');
      for (const e of S.npcs) mk('agent:' + e.id, DATA.AGENTS[e.id].short, 'Talk', 'npc');
      mk('sib', S.sib.id === 'wise' ? 'Wise' : 'Belle', 'Talk', 'npc');
    }
    S.onKey = ev => onKey(ev, true); S.offKey = ev => onKey(ev, false);
    addEventListener('keydown', S.onKey); addEventListener('keyup', S.offKey);
    S.blur = () => S && S.keys.clear(); addEventListener('blur', S.blur);
    L.running = true;
    snapCam();
    return true;
  };
  L.stop = () => {
    if (!S) return;
    removeEventListener('keydown', S.onKey); removeEventListener('keyup', S.offKey); removeEventListener('blur', S.blur);
    for (const e of [S.me, S.sib, S.eous, ...S.npcs, S.bird, ...(S.pets || [])]) { if (e.obj.parent) e.obj.parent.remove(e.obj); e.rig.dispose(); }
    if (S.tagLayer) S.tagLayer.innerHTML = '';
    S = null; L.running = false;
  };
  L.player = () => S && S.me;

  /* ---------------------------------------------------- input -- */
  const blocked = () => !!document.querySelector('.panel, .dlg');
  function onKey(ev, down) {
    if (!S) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift'].includes(k)) {
      if (down) S.keys.add(k); else S.keys.delete(k);
      if (k.startsWith('Arrow') && down && !blocked()) ev.preventDefault();
      if (down) S.path = [];
      return;
    }
    if (down && (k === 'e' || k === 'Enter') && !blocked() && !S.opts.chooser && S.near) { ev.preventDefault(); use(S.near); }
  }
  /* a tap or a click on the street: go there (or to whoever is under it, and talk) */
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  L.tap = (x, y) => {
    if (!S || S.opts.chooser || blocked()) return;
    v2.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(v2, BT.world.camera);
    for (const e of S.npcs.concat([S.sib])) {
      const p = new THREE.Vector3(e.x, 1.0, e.z);
      if (ray.ray.distanceSqToPoint(p) < 0.45) return L.goUse(e === S.sib ? 'sib' : 'agent:' + e.id);
    }
    if (!ray.ray.intersectPlane(plane, hit)) return;
    route(clamp(hit.x, BOUNDS.x0, BOUNDS.x1), clamp(hit.z, BOUNDS.z0, BOUNDS.z1), null);
    tapMark(hit.x, hit.z);
  };
  function tapMark(x, z) { FX.ring(x, z, 0.1, 0.6, 0xf4d35e, 0.45, { y: 0.04 }); }
  /* where a place or a person is used from */
  function spotOf(id) {
    if (STATIONS[id]) return [STATIONS[id].x, STATIONS[id].z];
    if (id === 'sib') return [S.sib.x, -6.95];
    const e = S.npcs.find(n => 'agent:' + n.id === id); if (!e) return null;
    return [e.x + Math.sin(e.face) * 1.1, e.z + Math.cos(e.face) * 1.1];
  }
  L.goUse = id => {
    if (!S || blocked()) return;
    const p = spotOf(id); if (!p) return;
    if (Math.hypot(S.me.x - p[0], S.me.z - p[1]) < 0.6) return use(id);
    route(p[0], p[1], id);
  };
  /* the way there: through the door if it is on the other side of Random Play's front */
  function route(x, z, useId) {
    const a = inStore(S.me.x, S.me.z), b = inStore(x, z), path = [];
    if (a !== b) { const outP = [0, -2.9], inP = [0, -5.1]; if (a) path.push(inP, outP); else path.push(outP, inP); }
    path.push([x, z]); S.path = path; S.useOnArrive = useId;
  }
  function use(id) {
    if (!S) return;
    S.path = []; S.useOnArrive = null;
    const e = id === 'sib' ? S.sib : S.npcs.find(n => 'agent:' + n.id === id);
    if (e) { S.me.face = Math.atan2(e.x - S.me.x, e.z - S.me.z); e.talkT = S.t; }
    else if (STATIONS[id]) S.me.face = Math.atan2(STATIONS[id].sx - S.me.x, STATIONS[id].sz - S.me.z);
    SFX.play('ui');
    if (S.opts.onUse) S.opts.onUse(id);
  }

  /* ---------------------------------------------------- the frame -- */
  const _p = new THREE.Vector3();
  L.update = dt => {
    if (!S) return;
    S.t += dt;
    const me = S.me, cam = BT.world.camera;
    if (S.opts.chooser) return chooserFrame(dt);
    // the player: keys, the stick, or a path
    let ix = 0, iy = 0, run = S.keys.has('Shift');
    if (!blocked()) {
      if (S.keys.has('d') || S.keys.has('ArrowRight')) ix += 1; if (S.keys.has('a') || S.keys.has('ArrowLeft')) ix -= 1;
      if (S.keys.has('w') || S.keys.has('ArrowUp')) iy += 1; if (S.keys.has('s') || S.keys.has('ArrowDown')) iy -= 1;
      const st = GAME.stickState && GAME.stickState();
      if (!ix && !iy && st && st.on) { ix = st.dx; iy = -st.dy; run = st.m > 0.9; S.path = []; }
    }
    let vx = 0, vz = 0;
    if (ix || iy) { const l = Math.hypot(ix, iy); vx = ix / l; vz = -iy / l; S.path = []; S.useOnArrive = null; }
    else if (S.path.length) {
      const [tx, tz] = S.path[0], dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz);
      if (d < (S.path.length === 1 && S.useOnArrive ? 0.45 : 0.25)) { S.path.shift(); if (!S.path.length && S.useOnArrive) { S.pendingUse = S.useOnArrive; S.useOnArrive = null; } }
      else { vx = dx / d; vz = dz / d; run = run || d > 4; }
    }
    const sp = (vx || vz) ? (run ? 5.4 : 3.1) : 0;
    const ox = me.x, oz = me.z;
    me.x += vx * sp * dt; me.z += vz * sp * dt;
    collide(me, 0.32);
    for (const n of S.npcs.concat([S.sib])) { const dx = me.x - n.x, dz = me.z - n.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 1e-4) { me.x = n.x + dx / d * 0.7; me.z = n.z + dz / d * 0.7; } }
    const moved = Math.hypot(me.x - ox, me.z - oz) / Math.max(dt, 1e-4);
    if (S.path.length && moved < 0.3 && sp > 0) {
      S.stuck = (S.stuck || 0) + dt;
      if (S.stuck > 0.6) { S.path.shift(); S.stuck = 0; if (!S.path.length && S.useOnArrive) { const id = S.useOnArrive, p = spotOf(id); S.useOnArrive = null; if (p && Math.hypot(me.x - p[0], me.z - p[1]) < 1.5) S.pendingUse = id; } }
    } else S.stuck = 0;
    if (vx || vz) me.face = U.turn(me.face, Math.atan2(vx, vz), 1 - Math.exp(-14 * dt));
    me.anim.speed = moved; me.anim.phase += moved * dt * 2.3; me.anim.state = moved > 0.3 ? 'run' : 'idle';
    animate(me, dt);
    // your sibling, the Agents (they turn to you when you talk to them, or come close)
    for (const n of S.npcs.concat([S.sib])) {
      const d = Math.hypot(me.x - n.x, me.z - n.z), talking = n.talkT != null && S.t - n.talkT < 4;
      const base = n === S.sib ? 0 : SPOTS[n.id].face;
      const want = talking || d < 2.2 ? Math.atan2(me.x - n.x, me.z - n.z) : base;
      if (!n.sit) n.face = U.turn(n.face, want, 1 - Math.exp(-4 * dt));
      n.anim.state = n.pose ? 'pose' : 'idle'; n.posePreset = n.pose;
      if (n.bounce) n.airY = Math.abs(Math.sin(S.t * 3.2)) * 0.05;
      if (n.sit != null) n.airY = n.sit;
      animate(n, dt);
    }
    eous(dt); bird(dt); pets();
    // Random Play's front comes away while you are inside
    const inside = inStore(me.x, me.z) || (me.z < -3.6 && Math.abs(me.x) < 1.3 && S.path.length && inStore(...S.path[S.path.length - 1]));
    if (inside !== S.inside) { S.inside = inside; RP.front.visible = !inside; RP.upper.visible = !inside; RP.low.visible = inside; }
    // what is close enough to use
    let near = null, nd = 1e9;
    const cand = Object.keys(STATIONS).map(id => [id, STATIONS[id].x, STATIONS[id].z, STATIONS[id].r]).concat(S.npcs.map(n => ['agent:' + n.id, n.x, n.z, 1.7]), [['sib', S.sib.x, -7.0, 1.3]]);
    for (const [id, x, z, r] of cand) { const d = Math.hypot(me.x - x, me.z - z); if (d < r && d < nd) { nd = d; near = id; } }
    S.near = near;
    ambient(dt);
    // the camera: behind and above, closer inside the shop
    const k = inside ? 0.82 : 1, wantCam = _p.set(me.x, 6.0 * k, me.z + 8.0 * k);
    wantCam.x = clamp(wantCam.x, -16, 16);
    S.cam.lerp(wantCam, 1 - Math.exp(-4 * dt)); S.look.lerp(_p.set(me.x * 0.9 + wantCam.x * 0.1, 0.9, me.z - 1.4 * k), 1 - Math.exp(-5 * dt));
    cam.position.copy(S.cam); cam.lookAt(S.look);
    S.sun.position.set(me.x - 16, 18, me.z + 10); S.sun.target.position.set(me.x, 0, me.z - 2);
    tags();
    // a place reached this frame is used last (using it may leave the lobby)
    if (S.pendingUse) { const id = S.pendingUse; S.pendingUse = null; use(id); }
  };
  function snapCam() { const me = S.me, cam = BT.world.camera; S.cam.set(clamp(me.x, -16, 16), 6, me.z + 8); S.look.set(me.x, 0.9, me.z - 1.4); if (S.opts.chooser) { S.cam.set(0, 1.75, -2.3); S.look.set(0, 1.15, -6.3); } cam.position.copy(S.cam); cam.lookAt(S.look); }
  function collide(e, r) {
    for (const [x0, z0, x1, z1] of built.col) {
      const cx = clamp(e.x, x0, x1), cz = clamp(e.z, z0, z1), dx = e.x - cx, dz = e.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-5) { e.x = cx + dx / d * r; e.z = cz + dz / d * r; }
        else { const l = e.x - x0, rr = x1 - e.x, t = e.z - z0, b = z1 - e.z, m = Math.min(l, rr, t, b); if (m === l) e.x = x0 - r; else if (m === rr) e.x = x1 + r; else if (m === t) e.z = z0 - r; else e.z = z1 + r; }
      }
    }
    e.x = clamp(e.x, BOUNDS.x0, BOUNDS.x1); e.z = clamp(e.z, BOUNDS.z0, BOUNDS.z1);
  }
  function animate(e, dt) { e.anim.t += dt; ANIM.apply(e, dt, S.t); place(e); }
  /* Eous keeps up, a step behind and to the side, waddling */
  function eous(dt) {
    const e = S.eous, me = S.me, R = e.rig.parts;
    const tx = me.x - Math.sin(me.face) * 1.0 + Math.cos(me.face) * 0.7, tz = me.z - Math.cos(me.face) * 1.0 - Math.sin(me.face) * 0.7;
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    const sp = d > 0.25 ? Math.min(5.8, d * 3) : 0;
    if (sp) { e.x += dx / d * sp * dt; e.z += dz / d * sp * dt; e.face = U.turn(e.face, Math.atan2(dx, dz), 1 - Math.exp(-10 * dt)); }
    else e.face = U.turn(e.face, Math.atan2(me.x - e.x, me.z - e.z), 1 - Math.exp(-3 * dt));
    collide(e, 0.22);
    e.walk += sp * dt * 9;
    const w = sp > 0.1 ? 1 : 0, t = S.t;
    R.legL.rotation.x = Math.sin(e.walk) * 0.7 * w; R.legR.rotation.x = -Math.sin(e.walk) * 0.7 * w;
    R.armL.rotation.x = -Math.sin(e.walk) * 0.5 * w; R.armR.rotation.x = Math.sin(e.walk) * 0.5 * w;
    R.earL.rotation.z = -0.15 + Math.sin(t * 3.1) * 0.12; R.earR.rotation.z = 0.15 + Math.sin(t * 2.7 + 1) * 0.12;
    R.earL.rotation.x = -0.1 - w * 0.35; R.earR.rotation.x = -0.1 - w * 0.35;
    e.body.rotation.z = Math.sin(e.walk) * 0.12 * w; e.body.position.y = Math.abs(Math.sin(e.walk)) * 0.04 * w + Math.sin(t * 2) * 0.01;
    place(e);
  }
  /* Yixuan's ink bird circles over her bench */
  function bird(dt) {
    const b = S.bird, t = S.t, R = b.rig.parts;
    b.x = -17.25 + Math.cos(t * 0.8) * 1.3; b.z = -2.8 + Math.sin(t * 0.8) * 1.0; b.face = Math.atan2(-Math.sin(t * 0.8), Math.cos(t * 0.8)) + PI / 2;
    b.obj.position.set(b.x, 2.4 + Math.sin(t * 2) * 0.15, b.z); b.obj.rotation.y = b.face;
    const f = Math.sin(t * 8) * 0.55; if (R.armL) R.armL.rotation.z = 0.15 + f; if (R.armR) R.armR.rotation.z = -0.15 - f;
  }
  /* Hu Wei hops on the spot; Magus hangs in the air, its tail swaying */
  function pets() {
    const t = S.t;
    for (const p of S.pets) {
      const R = p.rig.parts;
      if (p.id === 'huwei') { p.obj.position.set(p.bx, Math.abs(Math.sin(t * 3.2)) * 0.22 + 0.15, p.bz); p.obj.rotation.y = p.face + Math.sin(t * 0.7) * 0.3; if (R.head) R.head.rotation.x = -Math.abs(Math.sin(t * 3.2)) * 0.25; }
      else { p.obj.position.set(p.bx, 1.9 + Math.sin(t * 1.8) * 0.12, p.bz); p.obj.rotation.y = p.face + Math.sin(t * 0.5) * 0.25; if (R.tail) { R.tail.rotation.y = Math.sin(t * 2) * 0.35; R.tail.rotation.x = 0.15 + Math.sin(t * 1.4) * 0.12; } if (R.armL) R.armL.rotation.z = 0.2 + Math.sin(t * 3) * 0.3; if (R.armR) R.armR.rotation.z = -0.2 - Math.sin(t * 3) * 0.3; }
    }
  }
  /* steam over Chop's pots, a flicker on the HDD screens */
  function ambient(dt) {
    if (Math.random() < dt * 6) FX.p({ x: 8.6 + rnd(0, 0.4), y: 1.5, z: -4.5, vx: rnd(-0.1, 0.1), vy: rnd(0.4, 0.8), life: 1.6, size: 0.12, size1: 0.45, col: 0x9a9a9a, glow: false, g: -0.05, drag: 0.4 });
    if (Math.random() < dt * 3) FX.p({ x: 15 + rnd(0, 0.4), y: 1.3, z: -4.5, vy: rnd(0.4, 0.8), life: 1.6, size: 0.12, size1: 0.45, col: 0x9a9a9a, glow: false, g: -0.05, drag: 0.4 });
  }
  /* the signs: over each place, faded when far, lit with the key when close */
  function tags() {
    if (!S.tagLayer) return;
    const cam = BT.world.camera, W = innerWidth, H = innerHeight;
    const pos = id => {
      if (id === 'hdd' && !S.inside) return _p.set(0, 3.95, -3.9);
      if (STATIONS[id]) return _p.set(STATIONS[id].sx, STATIONS[id].sy, STATIONS[id].sz);
      if (id === 'sib') return _p.set(S.sib.x, 2.35, S.sib.z);
      const e = S.npcs.find(n => 'agent:' + n.id === id); return _p.set(e.x, 2.35 + (e.sit || 0), e.z);
    };
    for (const id in S.tags) {
      const t = S.tags[id], p = pos(id), d = Math.hypot(S.me.x - p.x, S.me.z - p.z);
      p.project(cam);
      const st = STATIONS[id];
      const show = p.z < 1 && (id.includes(':') || id === 'sib' ? d < 7 : !(st && st.inside && !S.inside && id !== 'hdd') && !(id === 'records' && S.inside));
      t.style.display = show ? '' : 'none'; if (!show) continue;
      t.style.transform = `translate(${((p.x + 1) / 2 * W).toFixed(1)}px,${((1 - p.y) / 2 * H).toFixed(1)}px) translate(-50%,-100%)`;
      t.classList.toggle('near', S.near === id);
      t.classList.toggle('far', d > 9 && S.near !== id);
    }
  }

  /* ---------------------------------------------------- choosing who you are --
     Both siblings stand in the shop; the one you point at steps forward and waves. */
  L.choose = id => { if (!S || !S.opts.chooser) return; S.choice = id; };
  function chooserFrame(dt) {
    const cam = BT.world.camera;
    for (const e of [S.me, S.sib]) {
      const on = S.choice === e.id;
      e.z = U.smooth(e.z, on ? -5.95 : -6.3, 6, dt); e.face = U.smooth(e.face, on ? 0 : (e.x < 0 ? 0.25 : -0.25), 6, dt);
      e.anim.state = on ? 'pose' : 'idle'; e.posePreset = on ? { armR: [-2.7 + Math.sin(S.t * 7) * 0.25, 0, -0.5], head: [0, 0, 0.12], torso: [0, 0, 0.04] } : null;
      animate(e, dt);
    }
    const E = S.eous; E.face = U.smooth(E.face, S.choice ? (S.choice === S.me.id ? -0.6 : 0.6) : 0, 4, dt);
    const R = E.rig.parts; R.earL.rotation.z = -0.15 + Math.sin(S.t * 3.1) * 0.12; R.earR.rotation.z = 0.15 + Math.sin(S.t * 2.7 + 1) * 0.12; E.body.position.y = Math.abs(Math.sin(S.t * 4)) * 0.03; place(E);
    RP.front.visible = false; RP.upper.visible = false; RP.low.visible = true;
    S.cam.set(Math.sin(S.t * 0.25) * 0.3, 1.75, -2.3); cam.position.copy(S.cam); cam.lookAt(S.look);
  }

  window.Lobby = L;
})();
