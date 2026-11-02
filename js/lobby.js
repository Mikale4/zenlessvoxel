/* ============================================================================
   lobby.js -- the home screen: Sixth Street, in voxels, to walk around in (as
   Post Parade's academy is). The street is street.js / street2.js, its people
   street-life.js; this file is you, the camera, the light and the places to use.

   Every mode is a place:
     the HDD system in Random Play's back room   -> Hollow Deep Dive (battle)
     the shop computer on the counter              -> Battle Lab
     the tutorial tapes on the shelf               -> How to Play
     the oil-drum sofa in the window               -> Rest (the next time of day)
     the poster board by the door                  -> Proxy Records
     Godfinger's two cabinets across the street    -> Proxy Clash (Agent vs Agent)
     the Agents, the shopkeepers, the passers-by   -> talk
     your sibling behind the counter               -> talk
   You walk as the sibling you chose (Wise or Belle); Eous waddles after you.
   WASD / arrows to walk, Shift to run, E to use what has a sign over it; or
   click / tap where to go; or drag to steer (the thumb stick, main.js). Z / C,
   a right-button drag or the arrow buttons turn the camera; on the street it
   turns by itself to face the shopfronts on your side. The day runs in the real
   game's four slots, from your clock (the sofa moves it on).

     Lobby.start({ me: 'wise'|'belle', chooser, onUse(id, who), tags: el, spawn, slot })
     Lobby.stop()  Lobby.update(dt)  Lobby.tap(x, y)  Lobby.choose(id)  Lobby.turn(dir)
   ========================================================================== */
(function () {
  'use strict';
  const { clamp, rnd } = U;
  const PI = Math.PI;
  const L = { running: false };

  const STATIONS = {
    hdd: { label: 'Hollow Deep Dive', sub: 'HDD system · into the Hollow', x: 0.5, z: -11.7, sx: 1.5, sy: 2.7, sz: -13.4, r: 1.5, inside: true },
    lab: { label: 'Battle Lab', sub: 'Shop computer', x: 2.3, z: -7.0, sx: 2.3, sy: 2.2, sz: -8.2, r: 1.0, inside: true },
    howto: { label: 'How to Play', sub: 'Tutorial tapes', x: -4.7, z: -8.5, sx: -5.5, sy: 2.7, sz: -8.5, r: 1.2, inside: true },
    rest: { label: 'Rest', sub: 'Sofa · pass the time', x: 4.9, z: -4.75, sx: 4.9, sy: 1.6, sz: -5.5, r: 1.0, inside: true },
    records: { label: 'Proxy Records', sub: 'Poster board', x: -4.4, z: -2.9, sx: -4.4, sy: 2.95, sz: -3.9, r: 1.2 },
    clash: { label: 'Proxy Clash', sub: 'Godfinger · Agent vs Agent', x: -25.9, z: 6.25, sx: -25.9, sy: 2.95, sz: 7.4, r: 1.4 },
  };
  L.STATIONS = STATIONS;
  /* what the Agents say when you talk to them (their voice lines come first: menu.js) */
  const LINES = {
    caesar: ['Phaethon! The Sons of Calydon ride when you say ride. Point me at the Hollow and I\'ll hold the line.', 'This bike? Rebuilt her three times. Same as the gang: nothing stays broken around me.'],
    burnice: ['Heyyy, Proxy! Want a Nitro-Fuel? No? More for me! Let\'s go torch some Ethereals!', 'Chop says if I set one more stool on fire I\'m paying for it. Worth it.'],
    aria: ['Oh! You\'re the Proxy everyone talks about! The Angels of Delusion are on a break... so how about a private show, in the Hollow?', 'Bardic Needle has our new single on vinyl! ...They put it behind the jazz. Hmph.'],
    yixuan: ['Breathe, Proxy. The Hollow rewards a still mind. When you are ready, I will follow your lead.', 'My bird likes this street. Too many noodles, it says. I disagree.'],
    qingyi: ['Proxy. Criminal Investigation Special Response Team, on patrol. Report anything suspicious. Or anything with noodles.', 'My sensors read this street as eighty-seven percent pleasant. The other thirteen percent is Caesar\'s bike.'],
    jufufu: ['Hey, hey, Proxy! Hu Wei says you smell like popcorn. That\'s the nicest thing it says about anyone!', 'Yunkui Summit\'s little tiger, ready to go! If the Hollow gets rowdy, Hu Wei and I\'ll just sit on it.'],
    orphie: ['Orphie, Obol Squad. And this is Magus, our captain. Yes, the tail. She heard that, by the way.', 'Magus says you check out, Proxy. Give us a target and she\'ll handle the rest. I\'ll handle the aiming.'],
    remielle: ['A Proxy! The Covenant of Dayat sends its greetings. My light takes the colour of whoever stands beside me. Shall we find out yours?', 'Stay a moment... Sixth Street makes the loveliest colours.'],
    wise: ['Don\'t forget, the tapes on the bottom shelf are due back Thursday.', 'The HDD\'s running hot today. Lots of Agents, lots of Hollows. Good for business.', 'If the shop\'s quiet, that just means business is good... in the Hollow.'],
    belle: ['Did you rewind the tapes? You never rewind the tapes.', 'Eous has been polishing the HDD all morning. I think it\'s nervous.', 'Eight Agents on Sixth Street today. Somebody\'s going to need a Proxy.'],
  };
  L.LINES = LINES;

  /* the four times of day: the sky, the sun, the lamps, the lit windows */
  const SKY = [
    { top: 0x6aa8e8, mid: 0xd4e6f4, bottom: 0xeef2f4, fog: 0xd8e4ec, near: 42, far: 120, sun: 0xfff2dc, sunI: 1.0, dir: [-14, 20, 10], hs: 0xdbe8ff, hg: 0x6a6a72, hi: 0.85, lamps: 0, lit: false },
    { top: 0x4a8ee0, mid: 0xc4def4, bottom: 0xeef2f4, fog: 0xd4e0ea, near: 42, far: 120, sun: 0xffffff, sunI: 1.1, dir: [8, 26, 9], hs: 0xe4eeff, hg: 0x707078, hi: 0.9, lamps: 0, lit: false },
    { top: 0x41609e, mid: 0xffb36a, bottom: 0xffe2b0, fog: 0xf0b07a, near: 34, far: 100, sun: 0xffc488, sunI: 1.05, dir: [-16, 18, 10], hs: 0xc4d4ff, hg: 0x5a4232, hi: 0.8, lamps: 1, lit: true },
    { top: 0x070a1c, mid: 0x18203e, bottom: 0x222a46, fog: 0x121830, near: 26, far: 84, sun: 0x8aa0d8, sunI: 0.32, dir: [10, 22, 6], hs: 0x4a5a8a, hg: 0x1a1a24, hi: 0.5, lamps: 1.4, lit: true },
  ];

  function ent(modelId, x, z, face) {
    const M = MODELS[modelId], R = VX.rig(modelId, M), obj = new THREE.Group(), body = new THREE.Group();
    body.add(R.root); obj.add(body);
    return { id: modelId, model: M, rig: R, obj, body, kind: M.kind || 'humanoid', stance: 'casual', seed: rnd(0, 9), x, z, face: face || 0, airY: 0,
      anim: { state: 'idle', t: 0, th: 0.3, dur: 1, speed: 0, phase: 0, side: 1 } };
  }
  function place(e) { e.obj.position.set(e.x, 0, e.z); e.obj.rotation.y = e.face; }

  /* ---------------------------------------------------- state -- */
  let S = null;
  let built = null, BROOT = null;
  function build() {
    if (built) return built;
    BROOT = new THREE.Group();
    built = STREET.build(BROOT);
    return built;
  }

  L.start = (opts) => {
    L.stop();
    const W = BT.world, scene = W.scene;
    while (scene.children.length) scene.remove(scene.children[0]);
    const B = build(); scene.add(BROOT);
    FX.attach(scene);
    const sun = new THREE.DirectionalLight(0xffc488, 1.05);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 90;
    const hemi = new THREE.HemisphereLight(0xc4d4ff, 0x5a4232, 0.8);
    scene.add(sun, sun.target, hemi); W.sun = sun;
    // a fixed pool of point lights, handed to whichever of the street's lights are nearest
    const pool = []; for (let i = 0; i < (GAME.lowPower ? 5 : 8); i++) { const l = new THREE.PointLight(0xffffff, 0, 8); scene.add(l); pool.push(l); }
    const me = opts.me || 'wise', sib = me === 'wise' ? 'belle' : 'wise';
    const slot = opts.slot != null ? opts.slot : LIFE.clockSlot();
    S = { opts, t: 0, sun, hemi, pool, keys: new Set(), path: [], useOnArrive: null, near: null, tags: {}, cam: new THREE.Vector3(0, 7, 6), look: new THREE.Vector3(0, 1, -2), inside: null,
      yaw: 0, yawMan: 0, manualAt: -99, side: 0, basis: null, slot, sky: null, lightT: 0 };
    S.me = ent(me, opts.spawn ? opts.spawn[0] : 0, opts.spawn ? opts.spawn[1] : -5.4, 0);
    S.sib = ent(sib, 4.2, -9.4, 0); S.sib.pose = { armL: [-0.95, 0, 0.25], armR: [-0.95, 0, -0.25], torso: [0.12, 0, 0], head: [0.05, 0, 0] };
    S.eous = ent('eous', S.me.x + 0.9, S.me.z + 0.8, 0); S.eous.walk = 0;
    for (const e of [S.me, S.sib, S.eous]) { scene.add(e.obj); place(e); }
    if (opts.chooser) {
      S.me.x = -0.85; S.me.z = -6.3; S.sib.x = 0.85; S.sib.z = -6.3; S.me.face = S.sib.face = 0; S.sib.pose = null;
      S.eous.x = 0; S.eous.z = -5.4; S.choice = null; S.inside = true;
      for (const e of [S.me, S.sib, S.eous]) place(e);
    }
    setSky(slot);
    S.focus = new THREE.Vector3(S.me.x, 0, S.me.z);
    if (!opts.chooser) LIFE.start(S, { built: B, scene, ent, place, tags: opts.tags, slot, camFocus: S.focus });
    // the signs over the places you can use
    S.tagLayer = opts.tags || null;
    if (S.tagLayer && !opts.chooser) {
      S.tagLayer.innerHTML = '';
      for (const id in STATIONS) mkTag(id, STATIONS[id].label, STATIONS[id].sub, id === 'hdd' || id === 'clash' ? id : '');
      mkTag('sib', S.sib.id === 'wise' ? 'Wise' : 'Belle', 'Talk', 'npc');
    }
    S.onKey = ev => onKey(ev, true); S.offKey = ev => onKey(ev, false);
    addEventListener('keydown', S.onKey); addEventListener('keyup', S.offKey);
    S.blur = () => S && S.keys.clear(); addEventListener('blur', S.blur);
    L.running = true;
    snapCam();
    return true;
  };
  function mkTag(id, label, sub, cls) {
    const t = U.el('button', { class: 'lb-tag ' + (cls || ''), onpointerdown: ev => { ev.preventDefault(); ev.stopPropagation(); L.goUse(id); } }, U.el('i', { class: 'mk' }), U.el('b', null, label), U.el('small', null, sub), U.el('kbd', null, GAME.touch ? 'TAP' : 'E'));
    S.tagLayer.append(t); S.tags[id] = t; return t;
  }
  L.stop = () => {
    if (!S) return;
    LIFE.stop();
    removeEventListener('keydown', S.onKey); removeEventListener('keyup', S.offKey); removeEventListener('blur', S.blur);
    for (const e of [S.me, S.sib, S.eous]) { if (e.obj.parent) e.obj.parent.remove(e.obj); e.rig.dispose(); }
    for (const l of S.pool) if (l.parent) l.parent.remove(l);
    if (S.tagLayer) S.tagLayer.innerHTML = '';
    S = null; L.running = false;
  };
  L.player = () => S && S.me;
  L.slot = () => S ? S.slot : LIFE.clockSlot();
  /* the time of day: the sky dome, fog, the sun and the sky light, the lamps, the lit windows */
  function setSky(slot) {
    const K = SKY[slot], scene = BT.world.scene;
    S.slot = slot;
    if (S.sky) scene.remove(S.sky);
    S.sky = VX.sky(scene, K.top, K.mid, K.bottom);
    scene.background = new THREE.Color(K.bottom); scene.fog = new THREE.Fog(K.fog, K.near, K.far);
    S.sun.color.setHex(K.sun); S.sun.intensity = K.sunI; S.sunDir = K.dir;
    S.hemi.color.setHex(K.hs); S.hemi.groundColor.setHex(K.hg); S.hemi.intensity = K.hi;
    S.lamps = K.lamps; for (const m of built.night) m.visible = K.lit;
    S.lightT = 0;
  }
  L.setSlot = slot => { if (!S) return; setSky(slot); LIFE.setSlot(slot); };
  /* turn the camera (the arrow buttons, Z / C) */
  L.turn = dir => { if (!S) return; S.yawMan += dir * 0.5; S.manualAt = S.t; };
  /* you do something (town.js): walk to a free spot under o.prefix (a stool, a patio chair) or stay put,
     then sit or stand doing o.act for o.dur seconds; then done() */
  L.perform = (o, done) => {
    if (!S) { if (done) done(); return; }
    const sp = o.prefix ? LIFE.reserve(o.prefix) : null;
    S.act = { o, sp, done, t: -1 };
    if (sp) route(sp.x, sp.z, null); else S.path = [];
  };

  /* ---------------------------------------------------- input -- */
  const blocked = () => !!document.querySelector('.panel, .dlg');
  function onKey(ev, down) {
    if (!S) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'z', 'c'].includes(k)) {
      if (down) S.keys.add(k); else S.keys.delete(k);
      if (k.startsWith('Arrow') && down && !blocked()) ev.preventDefault();
      if (down && k !== 'z' && k !== 'c') S.path = [];
      return;
    }
    if (down && (k === 'e' || k === 'Enter') && !blocked() && !S.opts.chooser && S.near) { ev.preventDefault(); use(S.near); }
  }
  /* a right-button drag turns the camera */
  let drag = null;
  addEventListener('pointerdown', ev => { if (S && ev.button === 2 && GAME.mode === 'lobby') { drag = { x: ev.clientX }; ev.preventDefault(); } }, true);
  addEventListener('pointermove', ev => { if (!drag || !S) return; S.yawMan -= (ev.clientX - drag.x) * 0.006; drag.x = ev.clientX; S.manualAt = S.t; });
  addEventListener('pointerup', ev => { if (ev.button === 2) drag = null; });
  addEventListener('contextmenu', ev => { if (S && GAME.mode === 'lobby') ev.preventDefault(); });
  /* a tap or a click on the street: go there (or to whoever is under it, and talk) */
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), _q = new THREE.Vector3();
  L.tap = (x, y) => {
    if (!S || S.opts.chooser || blocked()) return;
    v2.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(v2, BT.world.camera);
    let best = null, bd = 0.5;
    for (const p of LIFE.people().concat([{ key: 'sib', e: S.sib }])) { const d = ray.ray.distanceSqToPoint(_q.set(p.e.x, 1.0 + (p.e.airY || 0), p.e.z)); if (d < bd) { bd = d; best = p.key; } }
    if (best) return L.goUse(best);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    const b = built.bounds;
    route(clamp(hit.x, b.x0, b.x1), clamp(hit.z, b.z0, b.z1), null);
    FX.ring(hit.x, hit.z, 0.1, 0.6, 0xf4d35e, 0.45, { y: 0.04 });
  };
  const person = key => LIFE.people().find(p => p.key === key);
  /* where a place or a person is used from */
  function spotOf(id) {
    if (STATIONS[id]) return [STATIONS[id].x, STATIONS[id].z];
    if (id.startsWith('place:')) { const pl = TOWN.places().find(q => 'place:' + q.id === id); return pl ? [pl.x, pl.z] : null; }
    if (id === 'sib') return [S.sib.x, -6.95];
    const p = person(id); if (!p) return null;
    const e = p.e, d = Math.hypot(S.me.x - e.x, S.me.z - e.z) || 1, off = p.kind === 'staff' ? 2.4 : 1.0;   // a shopkeeper is served across the counter
    return [e.x + (S.me.x - e.x) / d * off, e.z + (S.me.z - e.z) / d * off];
  }
  L.goUse = id => {
    if (!S || blocked()) return;
    const p = spotOf(id); if (!p) return;
    if (Math.hypot(S.me.x - p[0], S.me.z - p[1]) < 0.7) return use(id);
    route(p[0], p[1], id);
  };
  /* the way there: through Random Play's door if it is on the other side of the front */
  function route(x, z, useId) {
    const a = STREET.inStore(S.me.x, S.me.z), b = STREET.inStore(x, z), path = [], outP = [0, -2.9], inP = [0, -5.1];
    const street = (ax, az, bx, bz) => LIFE.path(ax, az, bx, bz);      // round the benches, poles and tables
    if (a && b) path.push([x, z]);
    else if (a) path.push(inP, outP, ...street(outP[0], outP[1], x, z));
    else if (b) path.push(...street(S.me.x, S.me.z, outP[0], outP[1]), inP, [x, z]);
    else path.push(...street(S.me.x, S.me.z, x, z));
    S.path = path; S.useOnArrive = useId;
  }
  function use(id) {
    if (!S) return;
    S.path = []; S.useOnArrive = null;
    let who = null;
    if (id === 'sib') { who = { id: S.sib.id, name: S.sib.id === 'wise' ? 'Wise' : 'Belle', kind: 'sib' }; S.me.face = Math.atan2(S.sib.x - S.me.x, S.sib.z - S.me.z); }
    else if (STATIONS[id]) S.me.face = Math.atan2(STATIONS[id].sx - S.me.x, STATIONS[id].sz - S.me.z);
    else if (id.startsWith('place:')) { /* town.js */ }
    else { const p = person(id); if (!p) return; who = { id: p.id, name: p.name, kind: p.kind }; S.me.face = Math.atan2(p.e.x - S.me.x, p.e.z - S.me.z); LIFE.talked(id); }
    SFX.play('ui');
    if (S.opts.onUse) S.opts.onUse(id, who);
  }

  /* ---------------------------------------------------- the frame -- */
  const _p = new THREE.Vector3();
  L.update = dt => {
    if (!S) return;
    S.t += dt;
    const me = S.me, cam = BT.world.camera;
    if (S.opts.chooser) return chooserFrame(dt);
    // the camera's heading: toward the shopfronts on your side of the street, or where you turned it
    const inside = STREET.inStore(me.x, me.z) || (me.z < -3.6 && Math.abs(me.x) < 1.3 && S.path.length && STREET.inStore(...S.path[S.path.length - 1]));
    if (me.z > 3.4) S.side = PI; else if (me.z < 0.8) S.side = 0;
    if (S.keys.has('z')) { S.yawMan += dt * 1.8; S.manualAt = S.t; } if (S.keys.has('c')) { S.yawMan -= dt * 1.8; S.manualAt = S.t; }
    if (S.t - S.manualAt > 6) S.yawMan = U.smooth(S.yawMan, 0, 0.8, dt);
    const wantYaw = inside ? 0 : S.side + S.yawMan;
    S.yaw = U.turn(S.yaw, wantYaw, 1 - Math.exp(-2.6 * dt));
    // doing something (eating at the counter, a coffee, a can from the machine): there first, then a while at it
    if (S.act && S.act.t < 0 && (!S.path.length || (S.act.sp && Math.hypot(me.x - S.act.sp.x, me.z - S.act.sp.z) < 0.4))) {
      S.path = []; S.act.t = 0; if (S.act.sp) { me.x = S.act.sp.x; me.z = S.act.sp.z; me.face = S.act.sp.face; }
    }
    const busy = !!(S.act && S.act.t >= 0);
    if (busy) { S.act.t += dt; if (S.act.t > S.act.o.dur) { const A = S.act; S.act = null; if (A.sp) LIFE.release(A.sp.id); me.airY = 0; if (A.done) A.done(); } }
    // the player: keys (relative to the camera, held steady while a key stays down), the stick, or a path
    let ix = 0, iy = 0, run = S.keys.has('Shift');
    if (!blocked() && !busy) {
      if (S.keys.has('d') || S.keys.has('ArrowRight')) ix += 1; if (S.keys.has('a') || S.keys.has('ArrowLeft')) ix -= 1;
      if (S.keys.has('w') || S.keys.has('ArrowUp')) iy += 1; if (S.keys.has('s') || S.keys.has('ArrowDown')) iy -= 1;
      const st = GAME.stickState && GAME.stickState();
      if (!ix && !iy && st && st.on) { ix = st.dx; iy = -st.dy; run = st.m > 0.9; S.path = []; }
    }
    if (ix || iy) { if (S.basis == null) S.basis = S.yaw; } else S.basis = null;
    let vx = 0, vz = 0;
    if (ix || iy) {
      const l = Math.hypot(ix, iy), a = S.basis, fx = -Math.sin(a), fz = -Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
      vx = (rx * ix + fx * iy) / l; vz = (rz * ix + fz * iy) / l; S.path = []; S.useOnArrive = null;
    } else if (S.path.length) {
      const [tx, tz] = S.path[0], dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz);
      if (d < (S.path.length === 1 && S.useOnArrive ? 0.45 : 0.25)) { S.path.shift(); if (!S.path.length && S.useOnArrive) { S.pendingUse = S.useOnArrive; S.useOnArrive = null; } }
      else { vx = dx / d; vz = dz / d; run = run || d > 4; }
    }
    const sp = (vx || vz) ? (run ? 5.4 : 3.1) : 0;
    const ox = me.x, oz = me.z;
    me.x += vx * sp * dt; me.z += vz * sp * dt;
    collide(me, 0.32);
    for (const p of LIFE.people().concat([{ e: S.sib }])) { const n = p.e, dx = me.x - n.x, dz = me.z - n.z, d = Math.hypot(dx, dz), r = p.kind === 'cat' ? 0.35 : 0.65; if (d < r && d > 1e-4) { me.x = n.x + dx / d * r; me.z = n.z + dz / d * r; } }
    const moved = Math.hypot(me.x - ox, me.z - oz) / Math.max(dt, 1e-4);
    if (S.path.length && moved < 0.3 && sp > 0) {
      S.stuck = (S.stuck || 0) + dt;
      if (S.stuck > 0.6) { S.path.shift(); S.stuck = 0; if (!S.path.length && S.useOnArrive) { const id = S.useOnArrive, p = spotOf(id); S.useOnArrive = null; if (p && Math.hypot(me.x - p[0], me.z - p[1]) < 1.6) S.pendingUse = id; } }
    } else S.stuck = 0;
    if (vx || vz) me.face = U.turn(me.face, Math.atan2(vx, vz), 1 - Math.exp(-14 * dt));
    me.anim.speed = moved; me.anim.phase += moved * dt * 2.3; me.anim.state = moved > 0.3 ? 'run' : 'idle';
    if (S.act && S.act.t >= 0) { const sp = S.act.sp; me.anim.state = 'pose'; me.posePreset = LIFE.poseFor(S.act.o.act, S.t, 1); me.airY = sp && sp.seat != null ? sp.seat + 0.06 - 9 * me.rig.scale : 0; }
    animate(me, dt);
    // your sibling at the counter turns to you when you come close
    { const n = S.sib, d = Math.hypot(me.x - n.x, me.z - n.z), talking = n.talkT != null && S.t - n.talkT < 4; n.face = U.turn(n.face, talking || d < 2.2 ? Math.atan2(me.x - n.x, me.z - n.z) : 0, 1 - Math.exp(-4 * dt)); n.anim.state = 'pose'; n.posePreset = n.pose; animate(n, dt); }
    eous(dt);
    S.focus.set(me.x, 0, me.z);
    LIFE.update(dt, S);
    // Random Play's front comes away while you are inside
    if (inside !== S.inside) { S.inside = inside; STREET.RP.front.visible = !inside; STREET.RP.upper.visible = !inside; STREET.RP.low.visible = inside; MUSIC.play(inside ? 'shop' : 'street'); }
    // what is close enough to use
    let near = null, nd = 1e9;
    const cand = Object.keys(STATIONS).map(id => [id, STATIONS[id].x, STATIONS[id].z, STATIONS[id].r]).concat(LIFE.people().map(p => [p.key, p.e.x, p.e.z, p.kind === 'staff' ? 3.0 : p.kind === 'cat' ? 1.0 : 1.6]), [['sib', S.sib.x, -7.0, 1.3]], TOWN.places().map(q => ['place:' + q.id, q.x, q.z, 1.4]));
    for (const [id, x, z, r] of cand) { const d = Math.hypot(me.x - x, me.z - z); if (d < r && d < nd) { nd = d; near = id; } }
    S.near = near;
    ambient(dt); lights(dt);
    // the camera: behind and above you along its heading, closer inside the shop
    // it stays over the street (never inside the buildings across it): held short, it rises instead
    const k = inside ? 0.78 : 1, fx = clamp(me.x, -56, 18), cz = Math.cos(S.yaw);
    let dist = 9.6 * k;
    if (!inside) { if (cz > 0.05) dist = Math.min(dist, (7.6 - me.z) / cz); else if (cz < -0.05) dist = Math.min(dist, (me.z + 3.7) / -cz); dist = Math.max(dist, 4.5); }
    const wantCam = _p.set(fx + Math.sin(S.yaw) * dist, 7.0 * k + (9.6 * k - dist) * 0.6, me.z + cz * dist);
    S.cam.lerp(wantCam, 1 - Math.exp(-4 * dt));
    S.look.lerp(_q.set(me.x * 0.9 + fx * 0.1 - Math.sin(S.yaw) * 1.4 * k, 0.9, me.z - Math.cos(S.yaw) * 1.4 * k), 1 - Math.exp(-5 * dt));
    cam.position.copy(S.cam); cam.lookAt(S.look);
    const sd = S.sunDir || [-16, 18, 10]; S.sun.position.set(me.x + sd[0], sd[1], me.z + sd[2]); S.sun.target.position.set(me.x, 0, me.z - 2);
    tags();
    if (S.pendingUse) { const id = S.pendingUse; S.pendingUse = null; use(id); }
  };
  function snapCam() {
    const me = S.me, cam = BT.world.camera;
    S.yaw = me.z > 3.4 ? PI : 0; S.side = S.yaw;
    S.cam.set(clamp(me.x, -56, 18) + Math.sin(S.yaw) * 8, 6, me.z + Math.cos(S.yaw) * 8); S.look.set(me.x, 0.9, me.z - Math.cos(S.yaw) * 1.4);
    if (S.opts.chooser) { S.cam.set(0, 1.75, -2.3); S.look.set(0, 1.15, -6.3); }
    cam.position.copy(S.cam); cam.lookAt(S.look);
  }
  function collide(e, r) {
    for (const [x0, z0, x1, z1] of built.col) {
      const cx = clamp(e.x, x0, x1), cz = clamp(e.z, z0, z1), dx = e.x - cx, dz = e.z - cz, d = Math.hypot(dx, dz);
      if (d < r) {
        if (d > 1e-5) { e.x = cx + dx / d * r; e.z = cz + dz / d * r; }
        else { const l = e.x - x0, rr = x1 - e.x, t = e.z - z0, b = z1 - e.z, m = Math.min(l, rr, t, b); if (m === l) e.x = x0 - r; else if (m === rr) e.x = x1 + r; else if (m === t) e.z = z0 - r; else e.z = z1 + r; }
      }
    }
    const b = built.bounds; e.x = clamp(e.x, b.x0, b.x1); e.z = clamp(e.z, b.z0, b.z1);
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
    if (d > 6) { e.x = tx; e.z = tz; }
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
  /* steam over General Chop's pots, the street's animated bits */
  function ambient(dt) {
    for (const px of [-19.75, -17.25, -14.5]) if (Math.random() < dt * 2.5) FX.p({ x: px + rnd(-0.15, 0.15), y: 1.6, z: -8.1, vx: rnd(-0.1, 0.1), vy: rnd(0.4, 0.8), life: 1.6, size: 0.12, size1: 0.45, col: 0x9a9a9a, glow: false, g: -0.05, drag: 0.4 });
    for (const f of built.anims) f(S.t, dt);
  }
  /* hand the light pool to the nearest of the street's lights (lamps only from dusk; the shop's own while you are in it) */
  function lights(dt) {
    S.lightT -= dt; if (S.lightT > 0) return; S.lightT = 0.35;
    const fx = S.focus.x, fz = S.focus.z, lamp = S.lamps;
    const cand = built.lights.filter(l => (l.kind !== 'lamp' || lamp > 0) && (!l.inside || S.inside) && Math.abs(l.x - fx) < 30).sort((a, b) => Math.hypot(a.x - fx, a.z - fz) - Math.hypot(b.x - fx, b.z - fz));
    S.pool.forEach((pl, i) => {
      const L0 = cand[i];
      if (!L0) { pl.intensity = 0; return; }
      pl.position.set(L0.x, L0.y, L0.z); pl.color.setHex(L0.col); pl.distance = L0.d;
      pl.intensity = L0.i * (L0.kind === 'lamp' ? lamp : L0.kind === 'neon' ? (lamp ? 1.3 : 0.6) : (lamp ? 1 : 0.55));
    });
  }
  /* the signs: over each place, and over people you can talk to near you */
  function tags() {
    if (!S.tagLayer) return;
    const cam = BT.world.camera, Wd = innerWidth, Hd = innerHeight, seen = new Set();
    const show = (id, x, y, z, vis, far) => {
      const t = S.tags[id]; if (!t) return;
      _p.set(x, y, z).project(cam);
      if (!vis || _p.z > 1) { t.style.display = 'none'; return; }
      t.style.display = ''; t.style.transform = `translate(${((_p.x + 1) / 2 * Wd).toFixed(1)}px,${((1 - _p.y) / 2 * Hd).toFixed(1)}px) translate(-50%,-100%)`;
      t.classList.toggle('near', S.near === id); t.classList.toggle('far', far && S.near !== id);
    };
    for (const id in STATIONS) {
      const st = STATIONS[id], d = Math.hypot(S.me.x - st.x, S.me.z - st.z);
      if (id === 'hdd' && !S.inside) show(id, 0, 3.95, -3.9, d < 30, d > 9);
      else show(id, st.sx, st.sy, st.sz, !(st.inside && !S.inside) && !(id === 'records' && S.inside) && d < 30, d > 9);
    }
    const mark = (id, m) => { const t = S.tags[id]; if (t && t.dataset.mk !== m) { t.dataset.mk = m; t.firstChild.textContent = m; t.classList.toggle('marked', !!m); } };
    show('sib', S.sib.x, 2.35, S.sib.z, Math.hypot(S.me.x - S.sib.x, S.me.z - S.sib.z) < 7 || !!TOWN.mark('sib'), false); mark('sib', TOWN.mark('sib'));
    // people: a sign when you are near, or from across the street when they have something for you (! or ?)
    for (const p of LIFE.people()) {
      const d = Math.hypot(S.me.x - p.e.x, S.me.z - p.e.z), m = p.kind === 'walker' ? '' : TOWN.mark(p.id);
      if (d > 6 && !(m && d < 30)) continue;
      seen.add(p.key);
      if (!S.tags[p.key]) mkTag(p.key, p.name, p.kind === 'cat' ? 'Pet' : 'Talk', p.kind === 'agent' ? 'npc' : 'town');
      mark(p.key, m);
      show(p.key, p.e.x, (p.e.rig.height || 1.7) + 0.55 + (p.e.airY || 0), p.e.z, true, d > 9);
    }
    // things on the street: vending machines, and what an errand has you look for
    for (const q of TOWN.places()) {
      const key = 'place:' + q.id, d = Math.hypot(S.me.x - q.x, S.me.z - q.z);
      if (d > (q.quest ? 30 : 9)) continue;
      seen.add(key);
      if (!S.tags[key]) mkTag(key, q.label, q.sub, q.quest ? 'place quest' : 'place');
      mark(key, q.quest ? '?' : '');
      show(key, q.x, q.y, q.z, true, d > 9);
    }
    for (const id in S.tags) if ((id.startsWith('agent:') || id.startsWith('npc:') || id.startsWith('place:')) && !seen.has(id)) { S.tags[id].remove(); delete S.tags[id]; }
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
    STREET.RP.front.visible = false; STREET.RP.upper.visible = false; STREET.RP.low.visible = true;
    lights(dt);
    S.cam.set(Math.sin(S.t * 0.25) * 0.3, 1.75, -2.3); cam.position.copy(S.cam); cam.lookAt(S.look);
  }

  window.Lobby = L;
})();
