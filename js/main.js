/* ============================================================================
   main.js -- boots the game: renderer, the world (sky, light, arena), the
   squad-select preview, Agent portraits, input, and the main loop.
   ========================================================================== */
(function () {
  'use strict';
  const D = window.DATA;
  const canvas = U.$('view');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 700);
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  /* ------------------------------------------------------------ tuning -- */
  const tuning = Object.assign({}, D.TUNING_DEFAULTS, U.store.get('tuning', {}));
  for (const k in tuning) if (!(k in D.TUNING_DEFAULTS)) delete tuning[k];
  SFX.setVolume(tuning.volume);

  /* ------------------------------------------------------------- world -- */
  const world = {
    scene, camera, renderer, arenaId: null,
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
      const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 70;
      scene.add(sun, sun.target);
      const built = A.build(scene) || {};
      FX.attach(scene);
      world.arenaId = id;
      return { A, bounds: built.bounds || [-11, -7, 11, 7], obstacles: built.obstacles || [], barrels: built.barrels || [], anim: built.anim };
    },
  };
  FX.init(scene, camera, U.$('dmgLayer'));
  BT.init(world, tuning);

  /* ---------------------------------------------------------- portraits --
     Each Agent's voxel bust, rendered once into a data URL for the HUD. */
  function makePortraits() {
    const P = {}, size = 256;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(size, size);
    const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x404050, 0.9)); const dl = new THREE.DirectionalLight(0xffffff, 0.7); dl.position.set(2, 3, 4); sc.add(dl);
    for (const id in D.AGENTS) {
      const R = VX.rig(id, MODELS[id]); sc.add(R.root); R.root.rotation.y = 0.35;
      const h = R.height;
      cam.position.set(0.35, h * 0.86, 1.55); cam.lookAt(0, h * 0.8, 0);
      const bg = new THREE.Color(D.AGENTS[id].color); sc.background = bg.multiplyScalar(0.35);
      r.render(sc, cam); P[id] = r.domElement.toDataURL('image/png');
      sc.remove(R.root);
    }
    r.dispose(); r.forceContextLoss && r.forceContextLoss();
    return P;
  }

  /* ----------------------------------------------------------- preview --
     Behind the menus: the chosen battleground with the squad lined up. */
  let preview = null;
  function clearPreview() { if (!preview) return; for (const e of preview.ents) e.rig.dispose(); preview = null; }
  const GAME = {
    mode: 'menu',
    preview(arenaId, squad) {
      if (GAME.mode !== 'menu') return;
      const key = arenaId + '|' + squad.join(',');
      if (preview && preview.key === key) return;
      clearPreview();
      const built = world.loadArena(arenaId);
      const ents = squad.map((id, i) => {
        const R = VX.rig(id, MODELS[id]), obj = new THREE.Group(), body = new THREE.Group(); body.add(R.root); obj.add(body); scene.add(obj);
        const x = (i - (squad.length - 1) / 2) * 1.8, z = 2 + Math.abs(i - (squad.length - 1) / 2) * -0.6;
        obj.position.set(x, 0, z); obj.rotation.y = -x * 0.08;
        return { rig: R, obj, body, kind: 'humanoid', stance: D.AGENTS[id].stance, seed: i * 3.1, anim: { state: 'idle', t: 0, speed: 0, phase: 0 } };
      });
      const comps = [];
      squad.forEach((id, i) => { if (id === 'yixuan') { const R = VX.rig('inkbird', MODELS.inkbird); scene.add(R.root); comps.push({ R, base: ents[i].obj.position.clone() }); } });
      preview = { key, built, ents, comps, t: 0 };
    },
    startBattle(opts) {
      clearPreview(); GAME.mode = 'battle'; U.$('screens').innerHTML = '';
      BT.T.auto = !!BT.T.auto;
      BT.start(opts);
      HUD.build(BT.B);
    },
    toMenu() { BT.end(); HUD.destroy(); GAME.mode = 'menu'; },
  };
  window.GAME = GAME;
  BT.hooks.finish = B => { MENU.results(B); };

  /* -------------------------------------------------------------- input -- */
  const keyMap = e => {
    if (GAME.mode !== 'battle' || !BT.B) return;
    const B = BT.B, k = e.key;
    if (document.querySelector('.panel') && k !== 'Escape') return;
    if (B.chain) {
      if (k === '1' || k === 'ArrowLeft' || k === 'a' || k === 'A') { BT.chainPick(0); e.preventDefault(); return; }
      if (k === '2' || k === 'ArrowRight' || k === 'd' || k === 'D') { BT.chainPick(1); e.preventDefault(); return; }
      if (k === 'q' || k === 'Q') { BT.cmdUlt(); return; }
      if (k === 'Escape') { BT.chainSkip(); return; }
      return;
    }
    switch (k) {
      case ' ': BT.cmdSwap(1); e.preventDefault(); break;
      case 'c': case 'C': BT.cmdSwap(-1); break;
      case '1': case '2': case '3': { const a = B.squad[+k - 1]; if (a) BT.cmdSwap(a); break; }
      case 'q': case 'Q': BT.cmdUlt(); break;
      case 'e': case 'E': BT.cmdEx(); break;
      case 'Tab': BT.cmdFocus(); e.preventDefault(); break;
      case 't': case 'T': BT.setAuto(!B.auto); MENU.saveTuning(); break;
      case 'Escape': { const open = document.querySelector('.panel'); if (open && open.id !== 'tactics') { open.remove(); if (BT.B) BT.B.paused = false; } else MENU.tactics(); break; }
    }
  };
  addEventListener('keydown', e => { SFX.unlock(); keyMap(e); });
  // click an enemy to focus it
  const ray = new THREE.Raycaster(), mv = new THREE.Vector2();
  canvas.addEventListener('pointerdown', ev => {
    SFX.unlock();
    if (GAME.mode !== 'battle' || !BT.B) return;
    mv.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1); ray.setFromCamera(mv, camera);
    let best = null, bd = 1e9;
    for (const v of BT.B.enemies) { if (!v.alive) continue; const p = new THREE.Vector3(v.x, v.height * 0.5, v.z); const d = ray.ray.distanceSqToPoint(p); if (d < Math.max(0.8, v.rad * v.rad * 1.6) && d < bd) { bd = d; best = v; } }
    if (best) BT.cmdFocus(best);
  });

  /* --------------------------------------------------------------- loop -- */
  let last = performance.now(), fpsAcc = 0, fpsN = 0;
  window.__stats = { fps: 0 };
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    fpsAcc += dt; fpsN++; if (fpsAcc > 1) { window.__stats.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    if (GAME.mode === 'battle' && BT.B) { BT.update(dt); HUD.update(BT.B, dt); }
    else if (preview) {
      preview.t += dt; const t = preview.t;
      for (const e of preview.ents) { e.anim.t += dt; ANIM.apply(e, dt, t); }
      preview.comps.forEach((c, i) => { c.R.root.position.set(c.base.x + 0.9 + Math.sin(t * 0.8) * 0.4, 2.4 + Math.sin(t * 2) * 0.15, c.base.z - 0.3); const f = Math.sin(t * 8) * 0.55; c.R.parts.armL.rotation.z = 0.15 + f; c.R.parts.armR.rotation.z = -0.15 - f; });
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
  MENU.title();
  requestAnimationFrame(frame);
  window.__ready = true;
})();
