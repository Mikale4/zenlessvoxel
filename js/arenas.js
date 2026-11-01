/* ============================================================================
   arenas.js -- the three battlegrounds.
     outer   Blazewood: the Sons of Calydon's camp in the Outer Ring wasteland
     summit  Yunkui Summit: Yixuan's mountaintop temple above a sea of clouds
     stage   Hollow Concert Stage: the Angels of Delusion's stage, swallowed by a Hollow
   Each build(scene) returns { bounds, obstacles, barrels?, anim(t, dt) }.
   The fight area is bounds [-11, -7, 11, 7] on the XZ plane, floor at y = 0;
   the camera looks from +Z toward -Z, so set dressing is heaviest behind and
   at the sides.
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, h3 = VX.hash3;
  window.ARENAS = window.ARENAS || {};
  const BOUNDS = [-11, -7, 11, 7];

  /* ----------------------------------------------------------- helpers -- */
  const shade = (c, k) => { const r = Math.min(255, ((c >> 16) & 255) * k), g = Math.min(255, ((c >> 8) & 255) * k), b = Math.min(255, (c & 255) * k); return (r << 16) | (g << 8) | b; };
  const noise = (x, z, s) => { // smooth-ish value noise
    const fx = Math.floor(x / s), fz = Math.floor(z / s), tx = x / s - fx, tz = z / s - fz;
    const a = h3(fx, 0, fz), b = h3(fx + 1, 0, fz), c = h3(fx, 0, fz + 1), d = h3(fx + 1, 0, fz + 1);
    const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
    return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
  };
  function place(scene, obj, x, y, z, ry) { obj.position.set(x, y, z); if (ry) obj.rotation.y = ry; scene.add(obj); return obj; }
  function make(scene, s, draw, x, y, z, ry, opts) { const g = new VX.Grid(); draw(g); return place(scene, VX.object(g, s, opts), x, y || 0, z, ry); }
  /* a voxel floor: one layer of cells of size s, top face at y = 0 */
  function floor(scene, s, x0, z0, x1, z1, col) {
    const g = new VX.Grid(); g.jit = 0.03;
    for (let i = Math.round(x0 / s); i <= Math.round(x1 / s); i++) for (let k = Math.round(z0 / s); k <= Math.round(z1 / s); k++) {
      const c = col(i * s, k * s); if (c != null) g.set(i, 0, k, c);
    }
    const o = VX.object(g, s, { noBottom: true, cast: false }); o.position.y = -s / 2; scene.add(o); return o;
  }
  /* a flat plane stretching to the horizon under everything */
  function ground(scene, color, y) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color }));
    m.rotation.x = -Math.PI / 2; m.position.y = y || -0.02; m.receiveShadow = true; scene.add(m); return m;
  }
  /* drifting particles in a box; returns an updater */
  function motes(scene, n, box, color, size, vel, opts) {
    opts = opts || {};
    const pos = new Float32Array(n * 3), geo = new THREE.BufferGeometry();
    for (let i = 0; i < n; i++) { pos[i * 3] = U.rnd(box[0], box[3]); pos[i * 3 + 1] = U.rnd(box[1], box[4]); pos[i * 3 + 2] = U.rnd(box[2], box[5]); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: opts.opacity || 0.8, depthWrite: false, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true });
    const pts = new THREE.Points(geo, mat); scene.add(pts);
    return (t, dt) => {
      for (let i = 0; i < n; i++) {
        const j = i * 3;
        pos[j] += (vel[0] + Math.sin(t * 0.7 + i) * (opts.wob || 0.2)) * dt; pos[j + 1] += (vel[1] + Math.cos(t * 0.9 + i * 1.3) * (opts.wob || 0.2) * 0.5) * dt; pos[j + 2] += vel[2] * dt;
        for (let a = 0; a < 3; a++) { const lo = box[a], hi = box[a + 3]; if (pos[j + a] < lo) pos[j + a] = hi; else if (pos[j + a] > hi) pos[j + a] = lo; }
      }
      geo.attributes.position.needsUpdate = true;
    };
  }

  /* ================================================================ BLAZEWOOD */
  ARENAS.outer = {
    id: 'outer', name: 'Blazewood', sub: 'Outer Ring · camp of the Sons of Calydon',
    sky: { top: 0x3c5c8c, mid: 0xf0a860, bottom: 0xd88a4a, fog: 0xe2a46e, fogNear: 34, fogFar: 120 },
    light: { hemiSky: 0xffdcb0, hemiGround: 0x7a5a3a, hemiI: 0.75, sun: 0xffc488, sunI: 1.05, sunDir: [-14, 10, 7] },
    build(scene) {
      const SAND = 0xbf9a6a, SAND2 = 0xb48f60, CRACK = 0x9a7a52, TRACK = 0xa6825a, OIL = 0x4a3a2c, RUST = 0x9a4a28, RUST2 = 0x7a3a22, STEEL = 0x8a8e96, TIRE = 0x1e1e22;
      ground(scene, 0xbb9666, -0.03);
      floor(scene, 0.5, -34, -40, 34, 22, (x, z) => {
        const n = noise(x, z, 3), m = h3(Math.round(x * 2), 1, Math.round(z * 2));
        const tr = Math.abs(((x * 0.85 + z * 0.35) % 9 + 9) % 9 - 4.5);                       // tyre tracks
        if (Math.hypot(x - 6.5, z - 2) < 1.1 || Math.hypot(x + 7, z + 3.5) < 0.8 || Math.hypot(x + 15, z - 4) < 1.4) return OIL;
        if (tr > 0.3 && tr < 0.75 && Math.abs(z) < 12) return TRACK;
        if (m < 0.04) return CRACK;
        return n > 0.66 ? SAND2 : n < 0.2 ? shade(SAND, 1.03) : SAND;
      });
      // canyon walls and distant mesas: layered sandstone
      const strata = y => [0xb8683c, 0xc98a52, 0xa45a34, 0xd49a62, 0xb06a40][Math.floor(y / 2) % 5];
      const cliff = (x0, x1, z0, z1, hmax, seed) => make(scene, 1.0, g => {
        for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
          const hgt = Math.floor(hmax * (0.55 + 0.45 * noise(x + seed, z, 6)));
          for (let y = 0; y < hgt; y++) g.set(x, y, z, strata(y + seed));
        }
      }, 0, 0, 0);
      cliff(-75, 75, -86, -66, 22, 3); cliff(-56, -34, -60, 14, 12, 7); cliff(34, 58, -60, 10, 12, 11);
      cliff(-30, -14, -64, -48, 15, 5); cliff(12, 28, -65, -52, 18, 9);   // (it began inside the back ridge, and the two flickered)
      // a rusty shipping container
      make(scene, 0.2, g => {
        g.box(0, 0, 0, 30, 13, 11, (x, y, z) => x === 0 || x === 30 ? RUST2 : (x % 3 === 0 ? RUST2 : (h3(x, y, z) < 0.08 ? 0x6a5a4a : RUST)));
        g.box(4, 4, 12, 9, 8, 12, 0xe8e0d0); g.box(5, 5, 12, 8, 7, 12, 0xc8302a);
      }, -9.5, 0, -13.5, 0.12);
      // scrap heaps
      const heap = (seed, rx, ry, rz) => g => {
        g.ell(0, 0, 0, rx, ry, rz, (x, y, z) => { const r = h3(x + seed, y, z); return r < 0.3 ? RUST : r < 0.55 ? STEEL : r < 0.7 ? 0x5a5c62 : r < 0.8 ? RUST2 : r < 0.86 ? 0x2a6a8a : 0x6a6050; });
        for (let i = 0; i < 6; i++) { const a = h3(seed, i, 1) * 6.28; g.line(0, ry * 0.5, 0, Math.cos(a) * rx * 1.2, ry * 1.1 + i % 3, Math.sin(a) * rz, STEEL, 0.4); }
        g.cut(-rx - 2, -ry - 2, -rz - 2, rx + 2, -1, rz + 2);
      };
      make(scene, 0.25, heap(1, 14, 8, 10), 5, 0, -14); make(scene, 0.25, heap(2, 10, 6, 8), 15, 0, -11); make(scene, 0.25, heap(3, 12, 7, 9), -18, 0, -6, 0.6);
      // a wrecked car
      make(scene, 0.15, g => {
        g.box(0, 2, 0, 28, 7, 13, (x, y, z) => h3(x, y, z) < 0.15 ? RUST2 : 0x8a5a3a); g.box(7, 8, 1, 20, 12, 12, 0x7a4a30); g.cut(9, 9, 1, 18, 11, 12);
        for (const [x, z] of [[5, -1], [22, -1], [5, 13], [22, 13]]) g.cyl('z', 2, x, 2.5, z, z + 1, TIRE);
      }, -20, 0, -15, 0.4);
      // tyre stacks
      const tires = n => g => { for (let i = 0; i < n; i++) g.cyl('y', 0, 0, 4, i * 3, i * 3 + 2, (x, y, z) => Math.hypot(x, z) < 1.8 ? -1 : TIRE); };
      make(scene, 0.15, tires(4), 11, 0, -9.2); make(scene, 0.15, tires(3), 12.3, 0, -8.4); make(scene, 0.15, tires(5), -13.5, 0, -9.5);
      const tireStack = make(scene, 0.15, tires(3), -9.6, 0, 5.4);
      // chain-link fence along the back
      for (const [x, ry] of [[-22, 0], [-12, 0], [18, 0], [26.15, 0.25]]) make(scene, 0.1, g => {   // (the last one clear of the one before: their rails overlapped)
        for (let x2 = 0; x2 <= 80; x2++) for (let y = 0; y <= 26; y++) { if (x2 % 20 === 0) g.set(x2, y, 0, 0x6a6c72); else if ((x2 + y) % 4 === 0 || (x2 - y + 400) % 4 === 0) g.set(x2, y, 0, 0x9a9ca2); }
        g.box(0, 26, 0, 80, 26, 0, 0x6a6c72);
      }, x, 0, -19.5, ry);
      // the Calydon banner
      make(scene, 0.15, g => {
        g.box(0, 0, 0, 1, 50, 1, 0x3a3a40); g.box(40, 0, 0, 41, 50, 1, 0x3a3a40);
        g.box(2, 28, 0, 39, 48, 0, (x, y) => y < 30 || (y + Math.floor(x / 3)) % 17 === 0 ? 0x8a1a1a : 0xc4302b);
        g.ell(20, 39, 0, 6, 6, 0.4, 0xf0ece4); g.box(16, 38, 1, 18, 40, 1, 0x1c1c22); g.box(22, 38, 1, 24, 40, 1, 0x1c1c22); g.box(18, 33, 1, 22, 34, 1, 0x1c1c22); // skull
        g.line(10, 32, 1, 30, 46, 1, 0xf0ece4); g.line(30, 32, 1, 10, 46, 1, 0xf0ece4); // crossbones behind
      }, -3, 0, -16.5);
      // parked motorbikes
      const bike = col => g => {
        for (const z of [0, 16]) g.cyl('x', 4, z, 4, 0, 1, (x, y, zz) => Math.hypot(y - 4, zz - z) < 2 ? 0x8a8e96 : TIRE);
        g.box(0, 5, 3, 1, 8, 13, col); g.box(0, 9, 5, 1, 10, 10, 0x1c1c22); g.line(0, 8, 13, 0, 12, 15, 0x8a8e96); g.box(-3, 12, 15, 4, 12, 15, 0x3a3a40); g.box(0, 7, 15, 1, 8, 16, G(0xffe8a0));
      };
      make(scene, 0.1, bike(0xc4302b), 7.5, 0, -10.2, -0.6); make(scene, 0.1, bike(0x2a2a30), -6, 0, -10.6, 0.5);
      // the fire barrel, with a flickering light
      const fire = make(scene, 0.1, g => {
        g.cyl('y', 0, 0, 4, 0, 9, (x, y, z) => y % 4 === 0 ? 0x5a4a3a : RUST2);
        for (let i = 0; i < 26; i++) { const a = h3(i, 2, 3) * 6.28, r = h3(i, 4, 5) * 3; g.set(Math.round(Math.cos(a) * r), 10 + Math.floor(h3(i, 6, 7) * 5), Math.round(Math.sin(a) * r), G(h3(i, 8, 9) < 0.5 ? 0xff8a2a : 0xffd060)); }
      }, -1.8, 0, -10.5);
      const fireLight = new THREE.PointLight(0xff8a3a, 1.3, 12, 2); fireLight.position.set(-1.8, 1.8, -10.3); scene.add(fireLight);
      // an old highway billboard
      make(scene, 0.25, g => {
        g.box(6, 0, 0, 7, 40, 1, 0x4a4a50); g.box(30, 0, 0, 31, 40, 1, 0x4a4a50);
        g.box(0, 40, 0, 37, 58, 1, (x, y) => y < 44 ? 0xe8d8b0 : (x < 18 ? 0x3a7ab8 : 0xd8a040)); g.box(2, 46, 2, 15, 56, 2, 0xf2ece0); g.box(20, 48, 2, 34, 52, 2, 0xc4302b);
      }, -22, 0, -36, 0.3);
      // explosive fuel barrels inside the fight area
      const barrelDraw = g => { g.cyl('y', 0, 0, 3.5, 0, 11, (x, y) => (y === 3 || y === 8) ? 0x2a2a30 : (y === 5 || y === 6) ? ((Math.floor(Math.atan2(x, 0.01) * 3) & 1) ? 0x1c1c22 : 0xf2c230) : 0xc4302b); g.box(-1, 12, -1, 1, 12, 1, 0x3a3a40); };
      const barrels = [[-6.5, -3.8], [7.5, 3.2], [4, -5.2]].map(([x, z]) => ({ x, z, obj: make(scene, 0.09, barrelDraw, x, 0, z) }));
      const dust = motes(scene, 260, [-30, 0.2, -30, 30, 6, 16], 0xe8c08a, 0.09, [0.8, 0.05, 0.2], { opacity: 0.55 });
      return {
        bounds: BOUNDS, obstacles: [{ x: -9.6, z: 5.4, r: 0.7 }], barrels,
        anim(t, dt) { dust(t, dt); fireLight.intensity = 1.1 + Math.sin(t * 17) * 0.2 + Math.sin(t * 7.3) * 0.15; fire.scale.y = 1 + Math.sin(t * 13) * 0.04; },
      };
    },
  };

  /* ============================================================ YUNKUI SUMMIT */
  ARENAS.summit = {
    id: 'summit', name: 'Yunkui Summit', sub: 'Mountain temple of the Yunkui Summit sect',
    sky: { top: 0x5a7eb2, mid: 0xd6e2ee, bottom: 0xe8edf2, fog: 0xdbe4ee, fogNear: 30, fogFar: 140 },
    light: { hemiSky: 0xe8f0ff, hemiGround: 0x5a6470, hemiI: 0.85, sun: 0xfff2dc, sunI: 0.9, sunDir: [9, 15, 10] },
    build(scene) {
      const STONE = 0x8e9096, STONE2 = 0x86888e, STONE3 = 0x95979d, GROUT = 0x74767c, MOSS = 0x7a8a6a, INLAY = 0xb8aa80, RED = 0xb02a24, WOOD = 0x4a2e22, GOLD = 0xd6a843, TILE = 0x2f5f5a, TILE2 = 0x244a46;
      // the courtyard sits on top of the mountain: a raised stone platform
      floor(scene, 0.5, -26, -24, 26, 18, (x, z) => {
        const r = Math.hypot(x, z);
        if (r < 3.6 && r > 3.1) return INLAY;                                            // the inlaid ring
        if (r <= 3.1) { const a = Math.atan2(z, x); return (Math.sin(a) * r > Math.cos(a * 2) * 0.6) ? 0xb0b2b8 : 0x8a8c92; }
        const ix = Math.floor((x + 100) / 2.0), iz = Math.floor((z + 100 + (ix % 2)) / 2.0);
        const gx = ((x + 100) % 2.0) < 0.26, gz = ((z + 100 + (ix % 2)) % 2.0) < 0.26;
        if (gx || gz) return GROUT;
        const n = h3(ix, 3, iz); const edge = Math.abs(x) > 22 || z > 15 || z < -21;
        return edge && n < 0.4 ? MOSS : n < 0.33 ? STONE : n < 0.66 ? STONE2 : STONE3;
      });
      // its stone base: the top sits just under the courtyard's slab (level with it, the two faces fought and the floor flickered)
      make(scene, 1.0, g => { g.box(-26, -8, -24, 26, -1, 18, (x, y, z) => y === -1 ? 0x7c7e84 : (h3(x, y, z) < 0.5 ? 0x6e7076 : 0x7c7e84)); g.cut(-25, -8, -23, 25, -2, 17); }, 0, 0, 0);
      // balustrade around the edge (not at the back, where the temple stands)
      make(scene, 0.25, g => {
        const rail = (x0, z0, x1, z1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0)); for (let i = 0; i <= n; i++) { const x = x0 + Math.sign(x1 - x0) * i, z = z0 + Math.sign(z1 - z0) * i; g.box(x, 0, z, x, 1, z, 0xc8cace); if (i % 8 === 0) g.box(x, 0, z, x, 4, z, 0xb4b6bc); else g.set(x, 3, z, 0xc8cace); g.set(x, 4, z, i % 8 === 0 ? 0xd8dade : 0xbabcc2); } };
        rail(-103, 70, 103, 70); rail(-103, 70, -103, -90); rail(103, 70, 103, -90);
      }, 0, 0, 0);
      // the temple hall
      make(scene, 0.25, g => {
        g.box(-46, 0, -36, 46, 4, 0, 0x8a8c92); g.box(-46, 4, -36, 46, 4, 0, 0xa2a4aa);           // base platform
        for (let s = 0; s < 4; s++) g.box(-10, 0, 1 + s * 2, 10, 3 - s, 2 + s * 2, s % 2 ? 0xa2a4aa : 0x96989e); // stairs
        for (const x of [-36, -22, -7, 7, 22, 36]) g.cyl('y', x, -4, 1.6, 5, 22, RED);                   // red pillars
        g.box(-40, 5, -30, 40, 22, -28, (x, y) => (y > 8 && y < 18 && x % 8 > 1 && x % 8 < 7) ? ((x + y) % 2 ? GOLD : 0x6a4a2a) : WOOD); // wall with gold lattice windows
        g.box(-6, 5, -28, 6, 18, -28, 0x2a1a14); g.box(-6, 18, -28, 6, 19, -27, GOLD);
        g.box(-44, 22, -34, 44, 23, 4, RED); g.box(-44, 23, -34, 44, 23, 4, GOLD);                  // lintel
        for (let L = 0; L < 7; L++) {                                                               // sweeping roof, upturned at the corners
          const inset = L * 3, y = 24 + L * 2;
          g.box(-50 + inset, y, -38 + inset * 0.6, 50 - inset, y + 1, 8 - inset * 0.6, (x, yy, z) => (x + z) % 3 === 0 ? TILE2 : TILE);
        }
        for (const s of [-1, 1]) { g.line(s * 50, 25, 8, s * 56, 30, 12, TILE, 0.8); g.line(s * 50, 25, -38, s * 56, 30, -42, TILE, 0.8); g.set(s * 56, 31, 12, GOLD); g.set(s * 56, 31, -42, GOLD); }
        g.box(-32, 38, -18, 32, 39, -12, GOLD); g.box(-34, 39, -16, -30, 43, -14, GOLD); g.box(30, 39, -16, 34, 43, -14, GOLD); // ridge and ornaments
        g.box(-8, 20, 5, 8, 23, 5, 0x1c1c22); g.box(-6, 21, 6, 6, 22, 6, GOLD);                       // name plaque
      }, 0, 0, -15);
      // stone lanterns
      const lantern = g => { g.box(-3, 0, -3, 3, 1, 3, 0x8a8c92); g.box(-1, 2, -1, 1, 9, 1, 0x9a9ca2); g.box(-3, 10, -3, 3, 11, 3, 0x8a8c92); g.box(-2, 12, -2, 2, 15, 2, 0xa2a4aa); g.box(-1, 13, -2, 1, 14, 2, G(0xffd890)); g.box(-1, 13, -2, 1, 14, 2, G(0xffd890)); g.box(-4, 16, -4, 4, 16, 4, 0x7c7e84); g.box(-2, 17, -2, 2, 17, 2, 0x7c7e84); g.set(0, 18, 0, 0x7c7e84); };
      for (const [x, z] of [[-12.6, -6.5], [12.6, -6.5], [-12.6, 5.5], [12.6, 5.5], [-6, -12], [6, -12]]) make(scene, 0.12, lantern, x, 0, z);
      // the bronze incense cauldron
      make(scene, 0.12, g => {
        for (const [x, z] of [[-6, -6], [6, -6], [0, 7]]) g.box(x, 0, z, x + 1, 5, z + 1, 0x6a4a2a);
        g.ell(0, 10, 0, 9, 6, 9, (x, y, z) => y > 14 ? -1 : (y % 4 === 0 ? 0x7a5a32 : 0x8a6a3a)); g.box(-10, 14, -10, 10, 15, 10, (x, y, z) => Math.hypot(x, z) > 9.5 || Math.hypot(x, z) < 7.5 ? -1 : 0x6a4a2a);
        for (let i = 0; i < 5; i++) { const x = -3 + i * 1.5; g.box(Math.round(x), 15, 0, Math.round(x), 19 + i % 2, 0, 0xc8302a); g.set(Math.round(x), 20 + i % 2, 0, G(0xffa040)); }
        for (const s of [-1, 1]) g.box(s * 10, 12, -1, s * 11, 15, 1, 0x7a5a32);
      }, 0, 0, -10.6);
      // gnarled pines at the edges
      const pine = seed => g => {
        let x = 0, z = 0;
        for (let y = 0; y < 26; y++) { x += Math.round(Math.sin(seed + y * 0.3) * 0.6); z += Math.round(Math.cos(seed * 2 + y * 0.25) * 0.4); g.box(x - 1, y, z - 1, x + 1, y, z + 1, y % 5 ? 0x5a3a2a : 0x4a2e22); }
        for (let L = 0; L < 4; L++) g.ell(x + (L % 2 ? 4 : -4) * (L < 2 ? 1 : 0.5), 18 + L * 3, z, 10 - L * 2, 1.6, 7 - L, (xx, yy, zz) => h3(xx + seed, yy, zz) < 0.45 ? 0x2e5a3a : 0x3e6e46);
      };
      for (const [x, z, sd] of [[-19, -9, 1], [19.5, -8, 2], [-21, 7, 3], [21.5, 5, 4], [-17, -18, 5], [16.5, -19, 6]]) make(scene, 0.25, pine(sd), x, 0, z, sd);
      // distant misty peaks
      make(scene, 3.0, g => {
        for (let x = -45; x <= 45; x++) for (let z = -48; z <= -24; z++) {
          const hgt = Math.floor(14 * Math.pow(noise(x + 20, z, 9), 2.2) * (1 - Math.abs(x) / 70));
          for (let y = -6; y < hgt; y++) g.set(x, y, z, y > hgt - 3 && hgt > 7 ? 0xf2f4f8 : (y > hgt * 0.5 ? 0x8a9aae : 0x7486a0));
        }
      }, 0, 0, 0);
      // the sea of clouds below the summit
      const clouds = new THREE.Group(); scene.add(clouds);
      const cloud = seed => g => { for (let i = 0; i < 6; i++) g.ell(h3(seed, i, 1) * 10 - 5, h3(seed, i, 2) * 1.5, h3(seed, i, 3) * 6 - 3, 3 + h3(seed, i, 4) * 3, 1.4, 2 + h3(seed, i, 5) * 2, (x, y, z) => y > 0 ? 0xffffff : 0xe6eaf0); };
      for (let i = 0; i < 46; i++) {
        let x = U.rnd(-120, 120), z = U.rnd(-140, 60);
        if (Math.abs(x) < 30 && z > -28 && z < 22) x += (x < 0 ? -32 : 32);
        const o = VX.object((() => { const g = new VX.Grid(); cloud(i)(g); return g; })(), 1.2, { cast: false });
        o.position.set(x, U.rnd(-9, -4), z); clouds.add(o); o.userData.v = U.rnd(0.3, 0.9);
      }
      // violet miasma seeping in at the edges
      const miasma = motes(scene, 160, [-26, 0.1, -22, 26, 2.2, 18], 0xa060ff, 0.35, [0.1, 0.12, 0], { opacity: 0.35, add: true, wob: 0.4 });
      const petals = motes(scene, 140, [-24, 0.2, -24, 24, 9, 16], 0xffb8d0, 0.12, [0.6, -0.5, 0.25], { opacity: 0.9 });
      return {
        bounds: BOUNDS, obstacles: [],
        anim(t, dt) { petals(t, dt); miasma(t, dt); for (const c of clouds.children) { c.position.x += c.userData.v * dt; if (c.position.x > 130) c.position.x = -130; } },
      };
    },
  };

  /* =================================================== HOLLOW CONCERT STAGE */
  ARENAS.stage = {
    id: 'stage', name: 'Hollow Concert Stage', sub: 'The Angels of Delusion\'s stage, swallowed by a Hollow',
    sky: { top: 0x12061e, mid: 0x5a1a5e, bottom: 0x0a0a14, fog: 0x2a1032, fogNear: 28, fogFar: 100 },
    light: { hemiSky: 0x9a7ac8, hemiGround: 0x1a1028, hemiI: 0.7, sun: 0xd0b0ff, sunI: 0.55, sunDir: [6, 14, 9] },
    build(scene) {
      const FLOOR = 0x17171f, FLOOR2 = 0x1a1a23, LINE_M = 0x4a1a46, LINE_C = 0x1a4652, TRUSS = 0x8a8c96, BLACK = 0x111116, PINK = 0xff5ab0, CYAN = 0x4ae8ff;
      ground(scene, 0x101018, -0.03);
      floor(scene, 0.5, -34, -34, 34, 22, (x, z) => {
        const lx = Math.abs(((x % 4) + 4) % 4) < 0.26, lz = Math.abs(((z % 4) + 4) % 4) < 0.26;
        if (lx && lz) return G(0x8a3a80);
        if (lx) return G(LINE_M); if (lz) return G(LINE_C);
        return h3(Math.round(x * 2), 9, Math.round(z * 2)) < 0.5 ? FLOOR : FLOOR2;
      });
      // the stage
      make(scene, 0.25, g => {
        g.box(-56, 0, -28, 56, 5, 0, (x, y, z) => z === 0 ? (y === 4 ? G(PINK) : 0x22222c) : 0x1a1a22);
        for (let s = 0; s < 3; s++) g.box(-10, 0, 1 + s * 2, 10, 4 - s * 2, 2 + s * 2, 0x26262e);
        for (const x of [-52, 52]) for (const z of [-26, -2]) g.box(x - 1, 6, z - 1, x + 1, 44, z + 1, (xx, y) => y % 4 === 0 ? 0x6a6c76 : TRUSS);   // truss towers
        for (const z of [-26, -2]) g.box(-52, 42, z - 1, 52, 44, z + 1, (x) => x % 4 === 0 ? 0x6a6c76 : TRUSS);                                 // top beams
        for (let x = -48; x <= 48; x += 8) { g.box(x - 1, 39, -3, x + 1, 41, -1, BLACK); g.set(x, 39, 0, G(x % 16 === 0 ? PINK : CYAN)); }     // lamps
        for (const s of [-1, 1]) { g.box(s * 44 - 6, 6, -14, s * 44 + 6, 26, -6, (x, y) => y % 7 === 0 ? 0x2a2a34 : BLACK); for (const y of [9, 16, 23]) g.cyl('z', y, s * 44, 2.5, -5, -5, (x, yy) => Math.hypot(x - s * 44, yy - y) < 1 ? 0x8a8c96 : 0x3a3a46); }
      }, 0, 0, -11);
      // LED screens: canvas textures that pulse
      const screen = (w, h) => {
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const c = cv.getContext('2d');
        const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, fog: false }));
        m.userData.draw = t => {
          c.fillStyle = '#12061e'; c.fillRect(0, 0, 256, 128);
          for (let y = 0; y < 128; y += 8) for (let x = 0; x < 256; x += 8) { const v = Math.sin(x * 0.05 + t * 2) + Math.cos(y * 0.07 - t * 1.5); c.fillStyle = v > 1.2 ? '#ff5ab0' : v > 0.6 ? '#7a2a8a' : v < -1.3 ? '#4ae8ff' : '#1e0a2a'; c.fillRect(x, y, 7, 7); }
          c.save(); c.translate(128, 64); const k = 1 + Math.sin(t * 4) * 0.08; c.scale(k, k);
          c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, 24); c.bezierCurveTo(-36, -2, -20, -34, 0, -14); c.bezierCurveTo(20, -34, 36, -2, 0, 24); c.fill(); // heart
          c.fillStyle = '#ff5ab0'; c.fillRect(-60, -8, 26, 6); c.fillRect(-56, 0, 22, 5); c.fillRect(34, -8, 26, 6); c.fillRect(34, 0, 22, 5); // wings
          c.restore(); tex.needsUpdate = true;
        };
        scene.add(m); return m;
      };
      const big = screen(16, 7); big.position.set(0, 6.2, -17.9);
      const sideL = screen(5, 3); sideL.position.set(-11, 5.4, -15.9); sideL.rotation.y = 0.35;
      const sideR = screen(5, 3); sideR.position.set(11, 5.4, -15.9); sideR.rotation.y = -0.35;
      // sweeping spotlight beams
      const beams = [];
      for (let i = 0; i < 4; i++) {
        const geo = new THREE.ConeGeometry(1.6, 11, 20, 1, true); geo.translate(0, -5.5, 0);
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: i % 2 ? CYAN : PINK, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
        m.position.set(-9 + i * 6, 10.5, -11.6); scene.add(m); beams.push(m);
      }
      // Ether crystals pushing up through the debris
      const crystal = seed => g => {
        g.ell(0, 0, 0, 7, 2, 6, (x, y, z) => h3(x + seed, y, z) < 0.5 ? 0x2a2a34 : 0x3a3a46);
        for (let i = 0; i < 6; i++) { const a = h3(seed, i, 7) * 6.28, r = h3(seed, i, 8) * 4, L = 6 + h3(seed, i, 9) * 10, tilt = (h3(seed, i, 10) - 0.5) * 0.8; g.line(Math.cos(a) * r, 1, Math.sin(a) * r, Math.cos(a) * r + Math.cos(a) * L * tilt, 1 + L, Math.sin(a) * r + Math.sin(a) * L * tilt, G(i % 3 ? 0xe45cff : 0xff8ad8), 1.1); }
      };
      for (const [x, z, s] of [[-15.5, -5, 1], [16, -3, 2], [-17, 6, 3], [18, 7, 4], [-24, -14, 5], [25, -12, 6], [-8, -24, 7], [12, -25, 8]]) make(scene, 0.15, crystal(s), x, 0, z, s);
      // broken barricades
      const barricade = g => { g.box(0, 0, 0, 1, 6, 1, 0x3a3a40); g.box(30, 0, 0, 31, 6, 1, 0x3a3a40); g.box(0, 4, 0, 31, 6, 0, (x) => Math.floor(x / 3) % 2 ? 0x1c1c22 : 0xf2c230); g.cut(18, 4, 0, 22, 6, 0); };
      for (const [x, z, r] of [[-15, 0, 1.4], [13.5, -8, -0.6], [14, 9, 1.8], [-13, -10, 0.4]]) make(scene, 0.12, barricade, x, 0, z, r);
      // glow sticks scattered on the floor
      make(scene, 0.08, g => {
        for (let i = 0; i < 70; i++) { const x = Math.round(U.rnd(-160, 160)), z = Math.round(U.rnd(-110, 100)), c = G(i % 3 ? PINK : CYAN); if (h3(i, 1, 1) < 0.5) g.box(x, 0, z, x + 3, 0, z, c); else g.box(x, 0, z, x, 0, z + 3, c); }
      }, 0, 0.02, 0);
      // a ruined skyline beyond the Hollow
      make(scene, 1.0, g => {
        for (let b = 0; b < 40; b++) {
          const x = Math.round(-90 + b * 4.6 + h3(b, 1, 2) * 2), z = Math.round(-60 - h3(b, 3, 4) * 30), w = 2 + Math.floor(h3(b, 5, 6) * 3), hgt = 8 + Math.floor(h3(b, 7, 8) * 30);
          for (let y = 0; y < hgt; y++) for (let i = 0; i < w; i++) g.box(x + i, y, z, x + i, y, z + 2, (y % 3 === 1 && h3(x + i, y, b) < 0.12) ? G(h3(b, y, i) < 0.5 ? 0xff5ab0 : 0x6ae8ff) : 0x15121e);
        }
      }, 0, 0, 0);
      // the Hollow's ring in the sky
      const ring = new THREE.Mesh(new THREE.TorusGeometry(60, 2.2, 8, 80), new THREE.MeshBasicMaterial({ color: 0xff4ac0, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
      ring.position.set(0, 40, -150); scene.add(ring);
      const pl1 = new THREE.PointLight(PINK, 1.2, 22, 2); pl1.position.set(-8, 5, -9); scene.add(pl1);
      const pl2 = new THREE.PointLight(CYAN, 1.0, 22, 2); pl2.position.set(8, 5, -9); scene.add(pl2);
      const ether = motes(scene, 220, [-28, 0.2, -26, 28, 10, 16], 0xff7ad8, 0.12, [0, 0.35, 0], { opacity: 0.7, add: true, wob: 0.3 });
      let led = 0;
      return {
        bounds: BOUNDS, obstacles: [],
        anim(t, dt) {
          ether(t, dt);
          beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.7 + i * 1.7) * 0.55; b.rotation.x = 0.35 + Math.cos(t * 0.5 + i) * 0.25; });
          led -= dt; if (led <= 0) { led = 1 / 12; big.userData.draw(t); sideL.userData.draw(t + 1); sideR.userData.draw(t + 2); }
          pl1.intensity = 1.0 + Math.sin(t * 3) * 0.35; pl2.intensity = 0.9 + Math.cos(t * 2.6) * 0.3; ring.rotation.z = t * 0.05;
        },
      };
    },
  };
})();
