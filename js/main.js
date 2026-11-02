/* ============================================================================
   main.js -- boots the game: renderer, the world (sky, light, arena), the
   squad-select preview, Agent portraits, input, and the main loop.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA;
  const canvas = U.$('view');
  /* A phone (a touch screen, or few cores) starts on a smaller budget: fewer pixels, a
     coarser shadow map, fewer particles. Then a governor watches the frames; if they keep
     running long it steps the budget down a notch, and never back up (a picture that keeps
     sharpening and blurring is worse than one a little soft). As in Post Parade. */
  const LOW_POWER = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.hardwareConcurrency || 8) <= 4;
  const TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  document.documentElement.classList.toggle('touch', TOUCH);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = LOW_POWER ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 700);
  const gov = { level: 0, slow: 0, t: 0 };
  function budget() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, [LOW_POWER ? 1.25 : 1.75, 1, 1, 0.8][gov.level]));
    const size = gov.level >= 2 ? 512 : LOW_POWER ? 1024 : 2048, sun = world.sun;
    if (sun && sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    FX.budget = (LOW_POWER ? 0.6 : 1) * (gov.level >= 2 ? 0.5 : 1);
  }
  function govern(dt) {
    if (!dt || document.hidden || gov.level >= 3) return;
    // the share of recent frames slower than 24 a second (not 30: a phone on battery saver holds every page there)
    gov.slow += ((dt > 1 / 24 ? 1 : 0) - gov.slow) * 0.05; gov.t += dt;
    if (gov.t < 2.5 || gov.slow < 0.5) return;
    gov.level++; gov.t = 0; gov.slow = 0; budget(); resize();
  }
  /* a tall (portrait) screen sees more of the arena: a wider lens and the camera a little further back */
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
    camera.fov = camera.aspect < 1.3 ? Math.min(58, 38 * Math.pow(1.3 / camera.aspect, 0.5)) : 38;
    BT.camK = camera.aspect < 1 ? 1.15 : 1;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  /* ------------------------------------------------------------ tuning -- */
  const tuning = Object.assign({}, D.TUNING_DEFAULTS, U.store.get('tuning', {}));
  for (const k in tuning) if (!(k in D.TUNING_DEFAULTS)) delete tuning[k];
  SFX.setVolume(tuning.volume); MUSIC.setVolume(tuning.music); VOICE.setVolume(tuning.voice);

  /* ------------------------------------------------------------- world -- */
  const world = {
    scene, camera, renderer, arenaId: null, sun: null,
    loadArena(id) {
      const A = ARENAS[id];
      while (scene.children.length) scene.remove(scene.children[0]);
      const S = A.sky || {}, L = A.light || {};
      scene.background = new THREE.Color(S.bottom || 0x111118);
      scene.fog = S.fog != null ? new THREE.Fog(S.fog, S.fogNear || 30, S.fogFar || 100) : null;
      VX.sky(scene, S.top != null ? S.top : 0x223, S.mid, S.bottom);
      scene.add(new THREE.HemisphereLight(L.hemiSky || 0xdde6ff, L.hemiGround || 0x30303a, L.hemiI || 0.75));
      const sun = new THREE.DirectionalLight(L.sun || 0xffffff, L.sunI || 0.9);
      const d = L.sunDir || [6, 14, 8]; sun.position.set(d[0], d[1], d[2]); sun.target.position.set(0, 0, 0);
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
      world.sun = sun;
      const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 70;
      scene.add(sun, sun.target);
      const built = A.build(scene) || {};
      FX.attach(scene); budget();
      world.arenaId = id;
      return { A, bounds: built.bounds || [-11, -7, 11, 7], obstacles: built.obstacles || [], barrels: built.barrels || [], anim: built.anim };
    },
  };
  FX.init(scene, camera, U.$('dmgLayer'));
  BT.init(world, tuning);
  budget();

  /* ---------------------------------------------------------- portraits --
     Each Agent's voxel bust, rendered once into a data URL for the HUD. */
  function makePortraits() {
    const P = {}, size = 256;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(size, size);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x404050, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(2, 3, 4); sc.add(dl);
    const list = []; for (const id in D.AGENTS) { list.push([id, D.AGENTS[id].color]); const f = D.AGENTS[id].forms; if (f) for (const k in f) if (f[k].model !== id && MODELS[f[k].model]) list.push([f[k].model, D.AGENTS[id].color]); }
    list.push(['wise', 0x3a5a9a], ['belle', 0xf07a20], ['eous', 0xb8ff3a]);
    for (const id of window.TOWN_FACES || []) list.push([id, 0x4a5a6a]);           // Sixth Street's people (models-street.js)
    for (const [id, color] of list) {
      if (!MODELS[id]) continue;
      const R = VX.rig(id, MODELS[id]); sc.add(R.root); R.root.rotation.y = 0.35;
      const h = R.height, bang = MODELS[id].kind === 'bangboo', quad = MODELS[id].kind === 'quad';
      if (quad) { const s = MODELS[id].scale * 12; cam.position.set(s * 0.6, s * 0.9, s * 2.4); cam.lookAt(0, s * 0.6, s * 0.4); }
      else { cam.position.set(0.35 * (bang ? 0.7 : 1), h * (bang ? 0.62 : 0.86), bang ? 1.35 : 1.55); cam.lookAt(0, h * (bang ? 0.58 : 0.8), 0); }
      const bg = new THREE.Color(color); sc.background = bg.multiplyScalar(0.35);
      r.render(sc, cam); P[id] = r.domElement.toDataURL('image/png');
      sc.remove(R.root);
    }
    r.dispose(); r.forceContextLoss && r.forceContextLoss();
    return P;
  }

  /* ----------------------------------------------------------- preview --
     Behind the menus: the chosen battleground with the squad lined up. */
  let preview = null;
  function clearPreview() { if (!preview) return; for (const e of preview.ents) e.rig.dispose(); for (const c of preview.comps) { if (c.R.root.parent) c.R.root.parent.remove(c.R.root); c.R.dispose(); } if (preview.ring) { preview.ring.geometry.dispose(); preview.ring.material.dispose(); } preview = null; }
  const GAME = {
    mode: 'menu',
    /* the squad lined up on its battleground (a Proxy Clash: yours on the left, the rival's on the right, facing off) */
    preview(arenaId, squad, look, rival, rlook) {
      if (GAME.mode !== 'menu') return;
      const models = squad.map(id => BT.modelFor(id, look)), rmodels = (rival || []).map(id => BT.modelFor(id, rlook || {}));
      const key = arenaId + '|' + models.join(',') + '|' + rmodels.join(',');
      if (preview && preview.key === key) return;
      clearPreview();
      const built = world.loadArena(arenaId);
      const mk = (id, modelId, x, z, ry) => {
        const R = VX.rig(modelId, MODELS[modelId]), obj = new THREE.Group(), body = new THREE.Group(); body.add(R.root); obj.add(body); scene.add(obj);
        obj.position.set(x, 0, z); obj.rotation.y = ry;
        return { id, rig: R, obj, body, kind: 'humanoid', stance: D.AGENTS[id].stance, seed: x * 3.1 + z, anim: { state: 'idle', t: 0, speed: 0, phase: 0 } };
      };
      const ents = rival
        ? squad.map((id, i) => mk(id, models[i], -1.0 - i * 1.2, 1.7 + i * 0.55, 0.7)).concat(rival.map((id, i) => mk(id, rmodels[i], 1.0 + i * 1.2, 1.7 + i * 0.55, -0.7)))
        : squad.map((id, i) => { const x = (i - (squad.length - 1) / 2) * 1.8; return mk(id, models[i], x, 2 + Math.abs(i - (squad.length - 1) / 2) * -0.6, -x * 0.08); });
      const comps = [];
      ents.forEach(e => { const m = BT.COMPANION[e.id]; if (m && MODELS[m]) { const R = VX.rig(m, MODELS[m]); scene.add(R.root); R.root.rotation.y = e.obj.rotation.y; comps.push({ R, m, base: e.obj.position.clone() }); } });
      let ring = null;
      if (rival) {   // the rival side stands on a red ring
        ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.35, 48, 1, 0, Math.PI * 2), new THREE.MeshBasicMaterial({ color: 0xff3a4a, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(2.2, 0.035, 2.25); ring.scale.set(0.95, 0.5, 1); scene.add(ring);
      }
      preview = { key, built, ents, comps, ring, t: 0 };
    },
    startBattle(opts) {
      leaveLobby(); clearPreview(); GAME.mode = 'battle'; U.$('screens').innerHTML = '';
      quiet(false);
      // a meal at Waterfall Soup and the day's coffee go into this fight (a dive brings its own: dive.js)
      if (!opts.dive && !opts.tutorial && window.TOWN && Auth.current()) { const fb = TOWN.takeBuff(); if (fb) { opts.buff = Object.assign({}, fb.buff, opts.buff || {}); opts.buffNote = fb.note; } }
      MUSIC.play(opts.clash ? 'clash_' + opts.clash.rival : opts.arena + '_' + opts.encounter);
      VOICE.prime(opts.squad.concat(opts.clash ? opts.clash.squad : []));
      BT.T.auto = !!BT.T.auto;
      BT.start(opts);
      HUD.build(BT.B);
    },
    toMenu() { leaveLobby(); BT.end(); HUD.destroy(); quiet(false); GAME.mode = 'menu'; clearPreview(); if (typeof endPress === 'function') endPress(); },
    /* behind the title: a real battle on AUTO, a random squad in a random place, over and over */
    attract() {
      leaveLobby(); clearPreview(); HUD.destroy(); endPress();
      const ids = Object.keys(D.AGENTS).sort(() => Math.random() - 0.5).slice(0, 3), arenas = Object.keys(D.ENCOUNTERS);
      const arena = U.pick(arenas), enc = Math.random() < 0.65 ? 'patrol' : 'elite';
      // now and then the title shows a Proxy Clash instead: two squads of Agents
      const mode = Math.random() < 0.3 ? D.CLASH_MODES[U.pick(['tag3', 'all3', 'all2', 'tag2'])] : null;
      const clash = mode ? { rival: U.pick(Object.keys(D.RIVALS)), squad: CLASH.randomSquad(mode.size), look: { aria: Math.random() < 0.5 ? 'idol' : 'construct' }, mode: mode.id } : null;
      GAME.mode = 'title'; quiet(true);
      BT.start({ squad: mode ? ids.slice(0, mode.size) : ids, arena, encounter: enc, attract: true, clash });
      BT.B.auto = true;
      if (window.MENU && MENU.liveText) MENU.liveText();
    },
    /* the lobby: Sixth Street (lobby.js) */
    toLobby(opts) {
      BT.end(); HUD.destroy(); clearPreview(); endPress(); quiet(false);
      GAME.mode = 'lobby'; clearPreview();
      Lobby.start(opts);
    },
    stickState: () => stick,
  };
  window.GAME = GAME;
  function leaveLobby() { if (window.Lobby && Lobby.running) Lobby.stop(); }
  /* the title's battle makes no sound and shows no numbers */
  function quiet(on) { SFX.quiet = on; FX.noNumbers = on; }
  BT.hooks.finish = B => {
    if (B.opts.attract) { if (GAME.mode === 'title') GAME.attract(); return; }
    if (B.result === 'retreat') MUSIC.play('lose');   // as in the real game: Defeat plays on a lost or a quit Commission
    if (B.opts.dive && DIVE.after(B)) return;         // one fight of a Hollow dive (dive.js)
    if (B.opts.tutorial && TUTORIAL.after(B)) return; // TRAINING (tutorial.js)
    MENU.results(B);
  };
  BT.hooks.phase2 = () => MUSIC.phase2();

  /* -------------------------------------------------------------- input --
     The battle is played with actions, each on keys of your own (keys.js;
     the defaults are the real game's): move, Basic, Dodge, Special,
     Ultimate, switch to the next / previous Agent (on a flash an Assist,
     while she is launched a Quick Assist; in an All-Out Proxy Clash it picks
     whom you lead), a squad slot, target, AUTO, Tactics. During a Chain
     Attack the chain keys pick the left or right Agent and Ultimate still
     works. Esc always opens Tactics (or skips the Chain Attack). */
  const MOVES = { up: 1, down: 1, left: 1, right: 1 }, BTNS = { basic: 1, special: 1, dodge: 1 }, held = new Set();
  function escape() {
    const B = BT.B; if (B.chain) return BT.chainSkip();
    const open = document.querySelector('.panel');
    if (open && open.id !== 'tactics') { open.remove(); if (BT.B) BT.B.paused = false; } else MENU.tactics();
  }
  /* a key or mouse button went down: true if the battle used it */
  function action(code, ev) {
    if (GAME.mode !== 'battle' || !BT.B) return false;
    const B = BT.B, repeat = ev && ev.repeat;
    if (code === 'Escape') { if (!repeat) escape(); return true; }
    if (document.querySelector('.panel')) return false;
    if (B.chain) {
      const ids = KEYS.of(code, true); if (!ids.length) return false;
      if (repeat) return true;
      if (ids.includes('chainL')) BT.chainPick(0); else if (ids.includes('chainR')) BT.chainPick(1);
      else if (ids.includes('ult')) BT.cmdUlt(); else if (ids.includes('tactics')) escape();
      return true;
    }
    const ids = KEYS.of(code, false); if (!ids.length) return false;
    for (const id of ids) {
      if (MOVES[id]) { held.add(id); continue; }
      if (repeat) continue;
      if (BTNS[id]) { BT.btnDown(id); continue; }
      switch (id) {
        case 'ult': BT.cmdUlt(); break;
        case 'next': BT.cmdSwap(1); break;
        case 'prev': BT.cmdSwap(-1); break;
        case 'slot1': case 'slot2': case 'slot3': { const a = B.squad[+id.slice(4) - 1]; if (a) BT.cmdSwap(a); break; }
        case 'target': if (!(/^Mouse/.test(code) && tapFocus(ev.clientX, ev.clientY))) BT.cmdFocus(); break;   // a mouse button: the enemy under the pointer
        case 'auto': BT.setAuto(!B.auto); MENU.saveTuning(); break;
        case 'tactics': escape(); break;
      }
    }
    return true;
  }
  /* and let go (whatever else is going on, so nothing stays held) */
  function release(code) {
    for (const id of KEYS.of(code, false).concat(KEYS.of(code, true))) { if (MOVES[id]) held.delete(id); if (BTNS[id] && BT.B) BT.btnUp(id); }
  }
  addEventListener('keydown', e => { SFX.unlock(); if (action(KEYS.code(e), e)) e.preventDefault(); });
  addEventListener('keyup', e => release(KEYS.code(e)));
  addEventListener('blur', () => { held.clear(); if (BT.B) BT.btnsUp(); endPress(); });

  /* The mouse and a finger alike. A press that lets go where it began is a tap: it focuses
     the enemy under it. A press that travels is a thumb stick (AUTO off): it appears where
     the press began and steers the Agent the way it points, and the rim follows the thumb,
     so a long drag never runs out of room. (Post Parade's stick.) */
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  function tapFocus(x, y) {
    mv.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); ray.setFromCamera(mv, camera);
    let best = null, bd = 1e9;
    for (const v of BT.B.enemies) { if (!v.alive) continue; const p = new THREE.Vector3(v.x, v.height * 0.5, v.z); const d = ray.ray.distanceSqToPoint(p); if (d < Math.max(0.8, v.rad * v.rad * 1.6) * (TOUCH ? 2.2 : 1) && d < bd) { bd = d; best = v; } }
    if (best) BT.cmdFocus(best);
    return best;
  }
  /* mouse buttons are bound like keys (left click Basic, right click Dodge, middle click target); left click only
     while you fight yourself (AUTO off): otherwise it is still a tap to focus, or a drag to steer */
  const mouseHeld = new Set();
  const mouseBound = ev => GAME.mode === 'battle' && BT.B && KEYS.of('Mouse' + ev.button, !!BT.B.chain).length > 0 && (ev.button !== 0 || BT.isPlayer(BT.active()));
  canvas.addEventListener('mousedown', ev => { if (!mouseBound(ev)) return; ev.preventDefault(); const c = 'Mouse' + ev.button; mouseHeld.add(c); action(c, ev); });
  addEventListener('mouseup', ev => { const c = 'Mouse' + ev.button; if (mouseHeld.delete(c)) release(c); });
  canvas.addEventListener('contextmenu', ev => { if (GAME.mode === 'battle') ev.preventDefault(); });
  const STICK_R = 56, DRAG_PX = 10;
  let press = null, stick = null, stickEl = null;
  canvas.addEventListener('pointerdown', ev => {
    SFX.unlock();
    if (!(GAME.mode === 'battle' && BT.B) && GAME.mode !== 'lobby') return;
    if (press || (ev.pointerType === 'mouse' && (ev.button > 0 || mouseBound(ev)))) return;
    press = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, bx: ev.clientX, by: ev.clientY, drag: false };
    try { canvas.setPointerCapture(ev.pointerId); } catch (err) { /* moves still arrive */ }
  });
  canvas.addEventListener('pointermove', ev => {
    if (!press || ev.pointerId !== press.id) return;
    if (!press.drag) {
      if (Math.hypot(ev.clientX - press.x0, ev.clientY - press.y0) < DRAG_PX) return;
      press.drag = true; stick = { on: false, dx: 0, dy: 0, m: 0 };
    }
    let dx = ev.clientX - press.bx, dy = ev.clientY - press.by;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) { press.bx = ev.clientX - dx / d * STICK_R; press.by = ev.clientY - dy / d * STICK_R; dx = ev.clientX - press.bx; dy = ev.clientY - press.by; }
    stick.m = Math.min(d, STICK_R) / STICK_R; stick.on = stick.m > 0.15;
    stick.dx = dx / (d || 1); stick.dy = dy / (d || 1);
    drawStick(dx, dy);
  });
  const up = ev => {
    if (!press || ev.pointerId !== press.id) return; const p = press; endPress();
    if (ev.type !== 'pointerup' || p.drag) return;
    if (GAME.mode === 'lobby') Lobby.tap(p.x0, p.y0); else if (GAME.mode === 'battle' && BT.B) tapFocus(p.x0, p.y0);
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  function endPress() { press = null; stick = null; if (stickEl) stickEl.hidden = true; }
  function drawStick(dx, dy) {
    if (!(GAME.mode === 'lobby' || (GAME.mode === 'battle' && BT.B && !BT.B.auto))) { if (stickEl) stickEl.hidden = true; return; }
    if (!stickEl) { stickEl = U.el('div', { class: 'stick' }, U.el('i')); document.body.append(stickEl); }
    stickEl.hidden = false;
    stickEl.style.transform = `translate(${press.bx.toFixed(1)}px,${press.by.toFixed(1)}px)`;
    stickEl.firstChild.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
  }
  /* the move keys win over the stick; either one is BT.input for the Agent you lead */
  function readInput() {
    const x = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0), y = (held.has('up') ? 1 : 0) - (held.has('down') ? 1 : 0);
    const I = BT.input || (BT.input = {});
    if (x || y) { const L = Math.hypot(x, y); I.x = x / L; I.y = y / L; I.k = 1; }
    else if (stick && stick.on) { I.x = stick.dx; I.y = -stick.dy; I.k = stick.m; }
    else { I.x = 0; I.y = 0; I.k = 0; }
  }
  GAME.touch = TOUCH; GAME.lowPower = LOW_POWER;
  GAME.tick = dt => { readInput(); BT.update(dt); };   // for the headless test tools: one step with the live input

  /* --------------------------------------------------------------- loop -- */
  let last = performance.now(), fpsAcc = 0, fpsN = 0;
  window.__stats = { fps: 0 };
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { window.__stats.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    if (GAME.mode === 'battle' && BT.B) { readInput(); BT.update(dt); HUD.update(BT.B, dt); govern(dt); }
    else if (GAME.mode === 'title' && BT.B) { BT.update(dt); govern(dt); }
    else if (GAME.mode === 'lobby') { Lobby.update(dt); FX.update(dt, dt); govern(dt); }
    else if (preview) {
      preview.t += dt; const t = preview.t;
      for (const e of preview.ents) { e.anim.t += dt; ANIM.apply(e, dt, t); }
      preview.comps.forEach((c, i) => {
        const P = c.R.parts;
        if (c.m === 'huwei') { c.R.root.position.set(c.base.x + 0.75, 0.28 + Math.abs(Math.sin(t * 3.2)) * 0.1, c.base.z + 0.45); if (P.head) P.head.rotation.x = -Math.abs(Math.sin(t * 3.2)) * 0.25; return; }
        c.R.root.position.set(c.base.x + 0.9 + Math.sin(t * 0.8) * 0.4, 2.4 + Math.sin(t * 2) * 0.15, c.base.z - 0.3); const f = Math.sin(t * 8) * 0.55; P.armL.rotation.z = 0.15 + f; P.armR.rotation.z = -0.15 - f;
      });
      if (preview.built.anim) preview.built.anim(t, dt);
      const a = Math.sin(t * 0.12) * 0.35;
      camera.position.set(Math.sin(a) * 9.5, 3.4, 2 + Math.cos(a) * 9.5); camera.lookAt(0, 1.2, 1.2);
      FX.update(dt, dt);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------- boot -- */
  try { window.PORTRAITS = makePortraits(); } catch (e) { console.warn('portraits failed', e); window.PORTRAITS = {}; }
  U.$('boot').remove();
  MENU.boot();
  requestAnimationFrame(frame);
  window.__ready = true;
})();
