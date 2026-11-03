/* ============================================================================
   hubs.js -- New Eridu as the real game has it: not one big city, but compact
   areas you travel between (the Travel map, the metro), each with the people
   and the Agents who belong there. Sixth Street is street.js / street2.js;
   the others are js/hubs/<id>.js, each built with Sixth Street's kit
   (STREET.KIT, between STREET.begin() and STREET.finish(bounds)).

   A hub (HUBS[id]):
     id, name, region, blurb
     build(root) -> { col, spots, lights, night, anims, bounds }
     spawn: [x, z, face]       where you arrive from the Travel map
     travel: { x, z, sx, sy, sz, r, label, sub }   the way out (a station)
     stations: { id: { label, sub, x, z, sx, sy, sz, r } }  things to use
     cam: 'street' (Sixth Street's: it faces the shopfronts on your side)
          | 'free' (yaw0 to start; you turn it; camDist)
     music: the area's track (music.js), or four: [weekday by day, weekday by night,
            weekend by day, weekend by night], as the real game plays them
     agents: { id: [4 routine slots] }  the Agents who live here (and so are
             not on Sixth Street): 'spot-prefix weight, ...' as street-life.js
     staff: [{ id, name, at | x,z,face, act, hours: [slots] }]
     regulars: [{ id, name, slots: { slot: spec } }]   pets: [{ id, name, slots }]
     walkers: [4 slots of model ids], ends: [[x, z], ...] (where they come
             and go), huddles: [[x, z], ...] (where people stop to chat)
     ambient(S, dt): its own little animations
   ========================================================================== */
(function () {
  'use strict';
  const PI = Math.PI;
  const HUBS = {};

  HUBS.sixth = {
    id: 'sixth', name: 'Sixth Street', region: 'Janus Quarter',
    blurb: 'Random Play, the 141, Waterfall Soup, Coff Cafe and Godfinger: the street you live on.',
    build: root => STREET.build(root),
    spawn: [0, -5.4, 0], arrive: [-55.4, -3.6, 0.4],
    cam: 'street', sib: true, rp: () => STREET.RP, inStore: (x, z) => STREET.inStore(x, z),
    music: ['street_day', 'street', 'street_we', 'street_wn'], inMusic: 'shop',
    travel: { label: 'Travel', sub: 'Metro · around New Eridu', x: -56.25, z: -5.2, sx: -56.25, sy: 3.1, sz: -6.4, r: 1.6 },
    stations: {
      hdd: { label: 'Hollow Deep Dive', sub: 'HDD system · into the Hollow', x: 0.5, z: -11.7, sx: 1.5, sy: 2.7, sz: -13.4, r: 1.5, inside: true },
      lab: { label: 'Battle Lab', sub: 'Shop computer', x: 2.3, z: -7.0, sx: 2.3, sy: 2.2, sz: -8.2, r: 1.0, inside: true },
      howto: { label: 'How to Play', sub: 'Tutorial tapes', x: -4.7, z: -8.5, sx: -5.5, sy: 2.7, sz: -8.5, r: 1.2, inside: true },
      rest: { label: 'Rest', sub: 'Sofa · pass the time', x: 4.9, z: -4.75, sx: 4.9, sy: 1.6, sz: -5.5, r: 1.0, inside: true },
      records: { label: 'Proxy Records', sub: 'Poster board', x: -4.4, z: -2.9, sx: -4.4, sy: 2.95, sz: -3.9, r: 1.2 },
      clash: { label: 'Proxy Clash', sub: 'Godfinger · Agent vs Agent', x: -25.9, z: 6.25, sx: -25.9, sy: 2.95, sz: 7.4, r: 1.4 },
    },
    // steam over General Chop's pots
    ambient(S, dt) { for (const px of [-19.75, -17.25, -14.5]) if (Math.random() < dt * 2.5) FX.p({ x: px + U.rnd(-0.15, 0.15), y: 1.6, z: -8.1, vx: U.rnd(-0.1, 0.1), vy: U.rnd(0.4, 0.8), life: 1.6, size: 0.12, size1: 0.45, col: 0x9a9a9a, glow: false, g: -0.05, drag: 0.4 }); },
  };

  /* -------------------------------------------- what the hubs build with --
       (beside STREET.KIT: city blocks, signs, benches, barriers, palms) */
    HUBS.kit = (() => {
      const { piece, sign, put, text, hash, solid, CJK } = STREET.KIT, G = VX.glow;
    /* a block of the city, hollow (only its skin is built): rows of windows on the faces named in o.win (n s e w) */
    function mass(root, x0, z0, x1, z1, y0, y1, wall, o) {
      o = o || {}; const s = o.s || 0.5, P = piece(s, x0, z0, 0.03), fl = o.floor || 3, ww = o.ww || 1.5, step = o.step || 2.5, wy0 = o.wy0 != null ? o.wy0 : y0, win = o.win != null ? o.win : 'nsew';
      P.box(x0, y0, z0, x1, y1, z1, (x, y, z) => {
        const ex = x < x0 + s * 0.5 ? 'w' : x >= x1 - s * 1.5 ? 'e' : '', ez = z < z0 + s * 0.5 ? 'n' : z >= z1 - s * 1.5 ? 's' : '';
        if (y >= y1 - s * 1.5) return o.roof || 0x6a6a70;
        if (!ex && !ez) return -1;
        const f = ex || ez, u = ex ? z - z0 : x - x0, fy = y - wy0, m = ((u % step) + step) % step;
        if (fy >= 0 && win.includes(f) && fy % fl >= 1 && fy % fl < 1 + (o.wh || 1.5) && m >= 0.5 && m < 0.5 + ww) return hash(Math.floor(u / step) + x0, Math.floor(y / fl) + z0) > 0.82 ? G(0xffd890) : (o.glass || 0x3a4658);
        return typeof wall === 'function' ? wall(x, y, z, f) : wall;
      });
      P.mesh(root);
    }
    const flat = (root, w, h, draw, x, y, z, ry, lit) => put(root, sign(w, h, draw, lit ? { lit: true } : null), x, y, z, ry);
    /* a palm in its round pit */
    function palm(root, x, z, h) {
      const P = piece(0.125, x, z, 0.03);
      P.cyl(x, z, 0.62, 0, 0.125, (X, Y, Z) => Math.hypot(X + 0.06 - x, Z + 0.06 - z) < 0.48 ? 0x4a3a2a : 0xa8a8a4);
      for (let y = 0; y < h; y += 0.25) P.cyl(x + Math.sin(y * 0.3) * 0.18, z, 0.16, y, y + 0.25, Math.floor(y * 4) % 2 ? 0x8a6a4a : 0x7a5a3e);
      const tx = x + Math.sin(h * 0.3) * 0.18;
      for (let i = 0; i < 8; i++) { const a = i * PI / 4 + 0.3; for (let k = 0; k < 9; k++) { const r = 0.2 + k * 0.22, yy = h + Math.sin(k / 8 * PI) * 0.45 - k * k * 0.014; P.box(tx + Math.cos(a) * r - 0.1, yy, z + Math.sin(a) * r - 0.1, tx + Math.cos(a) * r + 0.1, yy + 0.125, z + Math.sin(a) * r + 0.1, k & 1 ? 0x3a8a3a : 0x2f7a32); } }
      P.mesh(root); solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
    }
    /* a wood-topped concrete bench, along x (or along z: alongZ) */
    function slab(root, x0, z0, x1, z1) {
      const P = piece(0.0625, x0, z0, 0.03), alongZ = z1 - z0 > x1 - x0;
      for (const e of [0, 1]) alongZ ? P.box(x0 + 0.06, 0, e ? z1 - 0.35 : z0 + 0.1, x1 - 0.06, 0.38, e ? z1 - 0.1 : z0 + 0.35, 0xa8a8a4) : P.box(e ? x1 - 0.35 : x0 + 0.1, 0, z0 + 0.06, e ? x1 - 0.1 : x0 + 0.35, 0.38, z1 - 0.06, 0xa8a8a4);
      P.box(x0, 0.38, z0, x1, 0.5, z1, (x, y, z) => (Math.floor((alongZ ? x : z) * 8) & 1) ? 0xb07a4a : 0xa06a3e);
      P.mesh(root); solid(x0, z0, x1, z1);
    }
    /* yellow-and-black barriers across a way out, an orange 止步 sign in the middle */
    function barriers(root, x0, z0, x1, z1) {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.6)), P = piece(0.0625, x0, z0, 0.02), ax = (x1 - x0) / L, az = (z1 - z0) / L;
      for (let i = 0; i < n; i++) {
        const a = i * L / n + 0.1, b = (i + 1) * L / n - 0.1, cx0 = x0 + ax * a, cz0 = z0 + az * a, cx1 = x0 + ax * b, cz1 = z0 + az * b;
        const bx0 = Math.min(cx0, cx1) - (ax ? 0 : 0.06), bx1 = Math.max(cx0, cx1) + (ax ? 0 : 0.06), bz0 = Math.min(cz0, cz1) - (az ? 0 : 0.06), bz1 = Math.max(cz0, cz1) + (az ? 0 : 0.06);
        P.box(bx0, 0.45, bz0, bx1, 0.95, bz1, (x, y, z) => (Math.floor((x + z + y) * 3) & 1) ? 0xf2c230 : 0x1c1c22);
        for (const t of [0.12, 0.88]) { const fx = bx0 + (bx1 - bx0) * t, fz = bz0 + (bz1 - bz0) * t; P.box(fx - 0.06, 0, fz - 0.06, fx + 0.06, 0.45, fz + 0.06, 0x3a3c42); P.box(fx - (az ? 0.3 : 0.06), 0, fz - (ax ? 0.3 : 0.06), fx + (az ? 0.3 : 0.06), 0.06, fz + (ax ? 0.3 : 0.06), 0x3a3c42); }
      }
      P.mesh(root); solid(Math.min(x0, x1) - 0.2, Math.min(z0, z1) - 0.2, Math.max(x0, x1) + 0.2, Math.max(z0, z1) + 0.2);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      const s = sign(0.62, 0.62, (c, w, h) => { c.fillStyle = '#f07a1a'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.48, 0, PI * 2); c.fill(); text(c, '止步', w / 2, h / 2, h * 0.34, '#fff', { fam: CJK, w: 900 }); }, { lit: true, both: true });
      put(root, s, mx, 1.3, mz, Math.abs(ax) > 0.5 ? 0 : PI / 2);
    }

      return { mass, flat, palm, slab, barriers };
    })();

  /* the order on the Travel map */
  HUBS.order = () => Object.keys(HUBS).filter(k => HUBS[k] && HUBS[k].build);
  /* where an Agent lives: her own file's town.home, or the hub that lists her, else Sixth Street */
  HUBS.homeOf = id => {
    const T = window.DATA && DATA.AGENTS[id] && DATA.AGENTS[id].town;
    if (T && T.home && HUBS[T.home] && HUBS[T.home].build) return T.home;
    for (const k of HUBS.order()) if (k !== 'sixth' && HUBS[k].agents && HUBS[k].agents[id]) return k;
    return 'sixth';
  };
  HUBS.get = id => HUBS[id] && HUBS[id].build ? HUBS[id] : HUBS.sixth;
  window.HUBS = HUBS;
})();
