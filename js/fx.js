/* ============================================================================
   fx.js -- battle effects: voxel particles (instanced cubes), soft glows,
   slash arcs, ground rings, beams, telegraph circles and damage numbers.
   Everything is pooled and advanced with the battle's own (scaled) time, so
   slow motion and impact freezes slow the effects too.
   ========================================================================== */
(function () {
  'use strict';
  const { rnd, clamp } = U;
  const FX = {};
  let scene = null, numLayer = null, cam = null;
  const _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();

  /* ---------------------------------------------------- particle pools -- */
  function pool(max, additive) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = additive ? new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      : new THREE.MeshLambertMaterial({});
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.setColorAt(0, new THREE.Color(1, 1, 1)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false; mesh.count = 0;
    return { mesh, max, list: [], additive };
  }
  let GLOW, SOLID;
  /* p({x,y,z, vx,vy,vz, g (gravity), drag, life, size, size1, col, glow (default true), spin}) */
  FX.budget = 1;   // share of particles actually spawned (main.js lowers it on phones and slow frames)
  FX.p = o => {
    const P = o.glow === false ? SOLID : GLOW;
    if (!P || P.list.length >= P.max) return;
    if (FX.budget < 1 && Math.random() > FX.budget) return;
    P.list.push({ x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g || 0, drag: o.drag || 0, t: 0, life: o.life || 0.5, s0: o.size || 0.12, s1: o.size1 != null ? o.size1 : 0, col: o.col != null ? o.col : 0xffffff, spin: o.spin != null ? o.spin : rnd(-8, 8), r: Math.random() * 6 });
  };
  /* a burst of particles from a point */
  FX.burst = (x, y, z, n, o) => {
    o = o || {};
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * (o.flat ? 0.3 : 1.4), sp = rnd(0.4, 1) * (o.speed || 3);
      FX.p({ x: x + rnd(-0.05, 0.05), y, z: z + rnd(-0.05, 0.05), vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + (o.up || 0), vz: Math.sin(a) * Math.cos(e) * sp,
        g: o.g != null ? o.g : 6, drag: o.drag || 1.5, life: rnd(0.6, 1) * (o.life || 0.5), size: (o.size || 0.12) * rnd(0.6, 1.3), size1: o.size1, col: Array.isArray(o.col) ? U.pick(o.col) : o.col, glow: o.glow });
    }
  };
  function stepPool(P, dt) {
    const L = P.list; let n = 0;
    for (let i = 0; i < L.length; i++) {
      const q = L[i]; q.t += dt;
      if (q.t >= q.life) continue;
      const d = Math.exp(-q.drag * dt);
      q.vx *= d; q.vy = q.vy * d - q.g * dt; q.vz *= d;
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.y < 0.02 && q.g > 0) { q.y = 0.02; q.vy *= -0.3; q.vx *= 0.6; q.vz *= 0.6; }
      q.r += q.spin * dt;
      const k = q.t / q.life, s = q.s0 + (q.s1 - q.s0) * k;
      _q.setFromAxisAngle(_v.set(0.5, 1, 0.3).normalize(), q.r); _s.set(s, s, s);
      _m.compose(_v.set(q.x, q.y, q.z), _q, _s); P.mesh.setMatrixAt(n, _m);
      _c.setHex(q.col); if (P.additive) _c.multiplyScalar(1 - k * k);
      P.mesh.setColorAt(n, _c);
      L[n++] = q;
    }
    L.length = n; P.mesh.count = n;
    P.mesh.instanceMatrix.needsUpdate = true; if (P.mesh.instanceColor) P.mesh.instanceColor.needsUpdate = true;
  }

  /* ----------------------------------------------------- one-off meshes --
     Each lives `life` seconds; update(k, dt) animates it; it is then disposed. */
  const live = [];
  function addLive(obj, life, update, mats) { scene.add(obj); live.push({ obj, life, t: 0, update, mats: mats || [] }); return obj; }
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  /* a soft additive glow sprite */
  FX.glow = (x, y, z, size, col, life, o) => {
    o = o || {};
    const mat = new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: o.depthTest !== false, opacity: o.a || 1, toneMapped: false });
    const s = new THREE.Sprite(mat); s.position.set(x, y, z); s.scale.setScalar(size); s.renderOrder = 5;
    const s1 = o.size1 != null ? o.size1 : size * 1.6;
    return addLive(s, life, (k) => { s.scale.setScalar(size + (s1 - size) * U.easeOut(k)); mat.opacity = (o.a || 1) * (1 - k); if (o.follow) { const p = o.follow(); if (p) s.position.copy(p); } }, [mat]);
  };
  /* a slash arc around (x,y,z): radius r, arc length (rad), facing yaw, tilt (roll of the slash plane) */
  FX.slash = (x, y, z, r, yaw, col, o) => {
    o = o || {};
    const arc = o.arc || 2.2, w = o.width || 0.32, tilt = o.tilt || 0, life = o.life || 0.22;
    const geo = new THREE.RingGeometry(r - w, r, 24, 1, -arc / 2, arc);
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(geo, mat);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; g.add(m);
    m.rotation.x = -Math.PI / 2 + tilt; m.rotation.z = -Math.PI / 2;   // the arc's middle faces the way the slash goes
    return addLive(g, life, k => { mat.opacity = 1 - k; m.scale.setScalar(1 + k * 0.25); m.rotation.z = -Math.PI / 2 + (o.sweep || 0.6) * (k - 0.5); }, [mat, geo]);
  };
  /* an expanding ring on the ground */
  FX.ring = (x, z, r0, r1, col, life, o) => {
    o = o || {};
    const geo = new THREE.RingGeometry(0.85, 1, 48), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: o.a || 0.9 });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, o.y || 0.05, z);
    return addLive(m, life, k => { const r = r0 + (r1 - r0) * U.easeOut(k); m.scale.setScalar(r); mat.opacity = (o.a || 0.9) * (1 - k); }, [mat, geo]);
  };
  /* a beam between two points */
  FX.beam = (a, b, col, width, life) => {
    const len = a.distanceTo(b), geo = new THREE.BoxGeometry(width, width, len), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(geo, mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.lookAt(b);
    return addLive(m, life, k => { mat.opacity = 1 - k; m.scale.x = m.scale.y = 1 - k * 0.7; }, [mat, geo]);
  };
  /* a column of light rising from the ground */
  FX.pillar = (x, z, r, hgt, col, life) => {
    const geo = new THREE.CylinderGeometry(r, r * 1.2, hgt, 20, 1, true), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const m = new THREE.Mesh(geo, mat); m.position.set(x, hgt / 2, z);
    return addLive(m, life, k => { mat.opacity = 0.7 * (1 - k); m.scale.x = m.scale.z = 1 + k * 0.6; }, [mat, geo]);
  };

  /* ------------------------------------------------- telegraph circles --
     A warning decal on the ground that fills up until the hit lands. */
  FX.telegraph = (x, z, r, col, dur, o) => {
    o = o || {};
    const grp = new THREE.Group(); grp.position.set(x, 0.04, z);
    const edgeGeo = new THREE.RingGeometry(r * 0.92, r, 48, 1, o.a0 || 0, o.arc || Math.PI * 2), edgeMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const fillGeo = new THREE.CircleGeometry(r, 48, o.a0 || 0, o.arc || Math.PI * 2), fillMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const edge = new THREE.Mesh(edgeGeo, edgeMat), fill = new THREE.Mesh(fillGeo, fillMat);
    for (const m of [edge, fill]) { m.rotation.x = -Math.PI / 2; grp.add(m); }
    if (o.yaw != null) grp.rotation.y = o.yaw;
    return addLive(grp, dur, k => { fill.scale.setScalar(Math.max(0.01, k)); fillMat.opacity = 0.15 + 0.25 * k; edgeMat.opacity = 0.6 + 0.4 * Math.sin(k * 30); }, [edgeMat, fillMat, edgeGeo, fillGeo]);
  };
  /* a lingering ground zone (a miasma pool, a fire patch): stays until removed */
  FX.zone = (x, z, r, col, life) => {
    const geo = new THREE.CircleGeometry(r, 40), mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z);
    return addLive(m, life, k => { mat.opacity = 0.35 * Math.min(1, (1 - k) * 4) * (0.8 + 0.2 * Math.sin(k * 40)); }, [mat, geo]);
  };

  /* ------------------------------------------------------ damage numbers -- */
  const nums = [];
  FX.number = (x, y, z, text, cls, color) => {
    if (!numLayer || FX.noNumbers) return;
    const el = document.createElement('div'); el.className = 'dmg ' + (cls || ''); el.textContent = text; if (color) el.style.color = color;
    numLayer.appendChild(el);
    nums.push({ el, x: x + rnd(-0.3, 0.3), y, z: z + rnd(-0.2, 0.2), t: 0, life: cls && cls.includes('big') ? 1.2 : 0.85, vy: 1.6 });
    if (nums.length > 60) { const o = nums.shift(); o.el.remove(); }
  };
  function stepNums(dt) {
    const W = innerWidth, H = innerHeight;
    for (let i = nums.length - 1; i >= 0; i--) {
      const n = nums[i]; n.t += dt; n.y += n.vy * dt; n.vy *= Math.exp(-3 * dt);
      if (n.t >= n.life) { n.el.remove(); nums.splice(i, 1); continue; }
      _v.set(n.x, n.y, n.z).project(cam);
      if (_v.z > 1) { n.el.style.display = 'none'; continue; }
      n.el.style.display = '';
      const k = n.t / n.life, s = n.t < 0.08 ? 1.5 - n.t * 6 : 1;
      n.el.style.transform = `translate(${(_v.x + 1) / 2 * W}px, ${(1 - _v.y) / 2 * H}px) translate(-50%,-50%) scale(${s})`;
      n.el.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
    }
  }

  /* ------------------------------------------------------------ lifecycle -- */
  FX.init = (sc, camera, layer) => {
    scene = sc; cam = camera; numLayer = layer;
    GLOW = pool(1600, true); SOLID = pool(500, false);
    scene.add(GLOW.mesh); scene.add(SOLID.mesh);
  };
  /* move the pools into a freshly built scene */
  FX.attach = sc => { scene = sc; sc.add(GLOW.mesh); sc.add(SOLID.mesh); };
  FX.update = (dt, realDt) => {
    if (!scene) return;
    stepPool(GLOW, dt); stepPool(SOLID, dt);
    for (let i = live.length - 1; i >= 0; i--) {
      const L = live[i]; L.t += dt; const k = clamp(L.t / L.life, 0, 1);
      if (L.update) L.update(k, dt);
      if (L.t >= L.life || L.kill) { scene.remove(L.obj); for (const m of L.mats) m.dispose(); live.splice(i, 1); }
    }
    stepNums(realDt != null ? realDt : dt);
  };
  FX.kill = obj => { const L = live.find(l => l.obj === obj); if (L) L.kill = true; };
  FX.clear = () => {
    for (const L of live) { scene.remove(L.obj); for (const m of L.mats) m.dispose(); } live.length = 0;
    if (GLOW) { GLOW.list.length = 0; SOLID.list.length = 0; GLOW.mesh.count = 0; SOLID.mesh.count = 0; }
    for (const n of nums) n.el.remove(); nums.length = 0;
  };

  /* ------------------------------------------------- composed effects --
     Named hit effects, chosen by a skill hit's `fx` and its attribute. */
  const ATTR_COL = { physical: [0xfff2c0, 0xf4d35e, 0xffffff], fire: [0xffd060, 0xff8a2a, 0xff4a1a], ether: [0xff9af0, 0xe45cff, 0xa040ff], auric: [0xfff0a0, 0xffcf4a, 0x1a1a1a], ice: [0xe0ffff, 0x8fe4ff], electric: [0xd0f0ff, 0x5ec8ff], lumiflux: [0xffe0f8, 0xff9ae6, 0xb8a4e8] };
  FX.colors = a => ATTR_COL[a] || ATTR_COL.physical;
  FX.hitSpark = (x, y, z, attr, heavy, crit) => {
    const cols = FX.colors(attr);
    FX.burst(x, y, z, heavy ? 22 : 10, { col: cols, speed: heavy ? 6 : 4, size: heavy ? 0.13 : 0.09, life: 0.35, g: 4 });
    FX.glow(x, y, z, heavy ? 1.6 : 0.9, cols[1], heavy ? 0.22 : 0.14, { size1: heavy ? 2.6 : 1.4 });
    if (crit) FX.glow(x, y, z, 2.2, 0xffffff, 0.12, { size1: 3.2, a: 0.7 });
  };
  FX.named = (name, o) => {
    const { x, z, yaw, attr, r } = o, y = o.y != null ? o.y : 1, cols = FX.colors(attr);
    switch (name) {
      case 'flame': {
        const fx = o.fromX, fz = o.fromZ, dir = yaw, len = r || 4;
        for (let i = 0; i < 26; i++) { const a = dir + rnd(-0.35, 0.35), sp = rnd(5, 9) * len / 4; FX.p({ x: fx + Math.sin(dir) * 0.6, y: 1.0, z: fz + Math.cos(dir) * 0.6, vx: Math.sin(a) * sp, vy: rnd(-0.2, 1.2), vz: Math.cos(a) * sp, drag: 2.2, life: rnd(0.35, 0.6), size: 0.18, size1: 0.45, col: U.pick([0xffe080, 0xff9a30, 0xff5a1a]), g: -1 }); }
        break;
      }
      case 'flameRing': for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, sp = rnd(3, 6); FX.p({ x, y: 0.8, z, vx: Math.cos(a) * sp, vy: rnd(0, 1), vz: Math.sin(a) * sp, drag: 2, life: 0.5, size: 0.2, size1: 0.45, col: U.pick([0xffe080, 0xff9a30, 0xff5a1a]), g: -1 }); } FX.ring(x, z, 0.5, r || 3, 0xff7a2a, 0.35); break;
      case 'explode': FX.burst(x, 0.8, z, 50, { col: [0xffe080, 0xff9a30, 0xff4a1a, 0x5a3a2a], speed: 9, size: 0.2, size1: 0.05, life: 0.7, g: 3, up: 2 }); FX.glow(x, 1, z, 3, 0xff8a2a, 0.35, { size1: 6 }); FX.ring(x, z, 0.5, (r || 2.5) * 1.1, 0xffa040, 0.4); break;
      case 'fireLine': for (let i = 0; i < 60; i++) { const d = rnd(0.5, o.len || 7); FX.p({ x: o.fromX + Math.sin(yaw) * d, y: 1 + rnd(-0.3, 0.3), z: o.fromZ + Math.cos(yaw) * d, vx: rnd(-1, 1), vy: rnd(0.5, 2.5), vz: rnd(-1, 1), life: rnd(0.3, 0.7), size: 0.25, size1: 0.5, col: U.pick([0xffe080, 0xff9a30, 0xff5a1a]), g: -1 }); } break;
      case 'quake': FX.ring(x, z, 0.4, r || 2.5, 0xfff0c0, 0.4); FX.burst(x, 0.1, z, 30, { col: [0xc8b090, 0x8a7a60, 0xe0d0b0], glow: false, speed: 5, up: 3, size: 0.14, g: 12, life: 0.8 }); break;
      case 'shock': FX.ring(x, z, 0.3, r || 2.2, 0xffffff, 0.3); FX.glow(x, 1, z, 1.5, 0xfff0c0, 0.2); break;
      case 'shieldSpin': FX.ring(x, z, 0.5, r || 3, 0xf4d35e, 0.4); for (let i = 0; i < 24; i++) { const a = i / 24 * 6.28; FX.p({ x: x + Math.cos(a) * (r || 3) * 0.6, y: 1, z: z + Math.sin(a) * (r || 3) * 0.6, vx: -Math.sin(a) * 6, vz: Math.cos(a) * 6, life: 0.3, size: 0.12, col: 0xffe080 }); } break;
      case 'ink': FX.burst(x, y, z, 24, { col: [0x141418, 0x2a2a33, 0xffcf4a, 0xfff0a0], speed: 5, size: 0.16, size1: 0.02, life: 0.5, g: 2 }); FX.ring(x, z, 0.3, r || 2, 0xffcf4a, 0.3, { a: 0.6 }); break;
      case 'wings': FX.burst(x, y + 0.5, z, 40, { col: [0x141418, 0x2a2a33, 0xffcf4a], speed: 7, size: 0.2, size1: 0.05, life: 0.6, g: 1 }); FX.glow(x, y, z, 2.5, 0xffcf4a, 0.3, { size1: 4.5 }); FX.ring(x, z, 0.5, r || 3, 0xffcf4a, 0.45); break;
      case 'talisman': for (let i = 0; i < 18; i++) { const a = rnd(0, 6.28), d = rnd(0.5, r || 3); FX.p({ x: x + Math.cos(a) * d, y: rnd(3, 5), z: z + Math.sin(a) * d, vy: -9, life: 0.4, size: 0.3, size1: 0.2, col: U.pick([0xffcf4a, 0xfff0a0]) }); } FX.pillar(x, z, (r || 3) * 0.6, 6, 0xffcf4a, 0.5); FX.ring(x, z, 0.5, r || 4, 0xffcf4a, 0.5); break;
      case 'notes': for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; FX.p({ x, y: 1.1, z, vx: Math.cos(a) * 5, vz: Math.sin(a) * 5, vy: 0.5, life: 0.45, size: 0.18, col: U.pick([0xff9af0, 0xe45cff, 0x7ff4ff]), drag: 2 }); } break;
      case 'sound': FX.ring(x, z, 0.3, r || 2, 0xe45cff, 0.35, { y: 0.9 }); FX.ring(x, z, 0.3, (r || 2) * 0.7, 0x7ff4ff, 0.3, { y: 1.2 }); FX.glow(x, 1, z, 1.6, 0xe45cff, 0.25); break;
      case 'heart': FX.burst(x, 1.2, z, 34, { col: [0xff9ad0, 0xff5ab0, 0xffffff, 0x7ff4ff], speed: 6, size: 0.16, life: 0.6, g: 2 }); FX.glow(x, 1, z, 2.6, 0xff5ab0, 0.3, { size1: 4.5 }); FX.ring(x, z, 0.4, r || 3, 0xff5ab0, 0.45); break;
      // Qingyi: a lightning strike from the sky
      case 'bolt': {
        const top = new THREE.Vector3(x + rnd(-0.6, 0.6), 7, z + rnd(-0.6, 0.6)); let p = top;
        for (let i = 1; i <= 6; i++) { const k = i / 6, q = new THREE.Vector3(U.lerp(top.x, x, k) + (i < 6 ? rnd(-0.5, 0.5) : 0), 7 - k * 6.8, U.lerp(top.z, z, k) + (i < 6 ? rnd(-0.5, 0.5) : 0)); FX.beam(p, q, i % 2 ? 0xd0f0ff : 0x5ec8ff, 0.15, 0.22); p = q; }
        FX.glow(x, 0.6, z, 2.6, 0x5ec8ff, 0.3, { size1: 4 }); FX.ring(x, z, 0.3, r || 2.2, 0x9ad8ff, 0.3);
        FX.burst(x, 0.4, z, 24, { col: [0xffffff, 0xd0f0ff, 0x5ec8ff], speed: 7, size: 0.08, life: 0.35, g: 2 });
        break;
      }
      // Hu Wei: popcorn everywhere
      case 'popcorn': FX.burst(x, 0.9, z, 36, { col: [0xfff6d8, 0xffe9a0, 0xffffff, 0xffc040], glow: false, speed: 5, size: 0.13, life: 0.9, g: 9, up: 4 }); FX.burst(x, 0.8, z, 20, { col: [0xffe080, 0xff9a30], speed: 4, size: 0.18, size1: 0.05, life: 0.4, g: -1 }); break;
      // Remielle: a burst of light, and a prism of rainbow rings
      case 'lightBurst': FX.burst(x, y, z, 30, { col: [0xffffff, 0xffe0f8, 0xff9ae6, cols[1]], speed: 6, size: 0.12, life: 0.45, g: 1 }); FX.glow(x, y, z, 2.2, 0xff9ae6, 0.25, { size1: 3.6 }); FX.ring(x, z, 0.3, r || 2, 0xffe0f8, 0.35); break;
      case 'prism': {
        const R0 = r || 3;
        [0xff7aa8, 0xffd04a, 0x8affc8, 0x7ac8ff, 0xc89aff].forEach((c, i) => FX.ring(x, z, 0.3, R0 * (0.55 + i * 0.12), c, 0.55, { y: 0.06 + i * 0.012, a: 0.65 }));
        FX.glow(x, 1, z, R0, 0xffe0f8, 0.3, { size1: R0 * 1.6 }); FX.burst(x, 0.6, z, 40, { col: [0xffffff, 0xff9ae6, 0xb8a4e8, cols[1]], speed: 6, size: 0.12, life: 0.6, g: 2, up: 1 });
        break;
      }
      default: if (FX.extra[name]) FX.extra[name](o); break;
    }
  };
  FX.extra = {};
  /* any object that lives for `life` seconds, animated by update(k, dt, obj) */
  FX.custom = (obj, life, update, mats) => addLive(obj, life, update ? (k, dt) => update(k, dt, obj) : null, mats);

  window.FX = FX;
})();
