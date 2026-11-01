// Finds surfaces that fight: two different meshes with a face in the same plane, facing the same
// way and overlapping (the GPU cannot tell which is in front, so they flicker into stripes).
//   node tools/zfight-check.js [lobby|lobby-inside|outer|summit|stage ...]
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : ['lobby', 'lobby-inside', 'outer', 'summit', 'stage'];
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html')); await p.waitForFunction('window.__ready === true');
  for (const w of which) {
    const res = await p.evaluate(w => {
      if (w === 'lobby') GAME.toLobby({ me: 'wise', tags: null, onUse: () => {}, spawn: [0, 2] });
      else if (w === 'lobby-inside') { GAME.toLobby({ me: 'wise', tags: null, onUse: () => {}, spawn: [0, -8] }); Lobby.update(1 / 30); }
      else { GAME.toMenu(); BT.world.loadArena(w); }
      const scene = BT.world.scene; scene.updateMatrixWorld(true);
      // the scenery only: not the characters (a rig's parts are named after its pivots), not see-through things
      const PARTS = new Set(['hips', 'torso', 'head', 'armL', 'armR', 'legL', 'legR', 'body', 'jaw', 'tail', 'earL', 'earR', 'legFL', 'legFR', 'legBL', 'legBR']);
      const inRig = o => { for (let q = o; q; q = q.parent) if (q.name && PARTS.has(q.name)) return true; return false; };
      const meshes = []; scene.traverse(o => { if (o.isMesh && o.geometry && o.visible !== false && o.geometry.attributes.position && !(o.material && o.material.transparent) && !inRig(o)) meshes.push(o); });
      const desc = mi => { const m = meshes[mi], bb = new THREE.Box3().setFromObject(m), c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3()); return `${m.material.type === 'MeshBasicMaterial' ? 'glow' : 'lit'}@(${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}) ${sz.x.toFixed(1)}x${sz.y.toFixed(1)}x${sz.z.toFixed(1)}`; };
      const buckets = new Map(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
      meshes.forEach((m, mi) => {
        if (m.geometry.type !== 'BufferGeometry') return;
        let vis = true; for (let o = m; o; o = o.parent) if (o.visible === false) vis = false; if (!vis) return;
        const pos = m.geometry.attributes.position, idx = m.geometry.index, tri = idx ? idx.count / 3 : pos.count / 3;
        for (let t = 0; t < tri; t++) {
          for (let k = 0; k < 3; k++) { const i = idx ? idx.getX(t * 3 + k) : t * 3 + k; v[k].fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); }
          e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); n.crossVectors(e1, e2); const len = n.length(); if (len < 1e-8) continue; n.divideScalar(len);
          const ax = Math.abs(n.x) > 0.99 ? 0 : Math.abs(n.y) > 0.99 ? 1 : Math.abs(n.z) > 0.99 ? 2 : -1; if (ax < 0) continue;
          const sgn = (ax === 0 ? n.x : ax === 1 ? n.y : n.z) > 0 ? 1 : -1, c = [v[0].x, v[0].y, v[0].z][ax];
          if (ax === 1 && sgn < 0 && c < 0.1) continue;           // undersides at the ground: never seen
          const key = ax + ':' + sgn + ':' + c.toFixed(3);
          const [u, w2] = [[1, 2], [0, 2], [0, 1]][ax];
          const us = v.map(q => [q.x, q.y, q.z][u]), ws = v.map(q => [q.x, q.y, q.z][w2]);
          const r = [Math.min(...us), Math.min(...ws), Math.max(...us), Math.max(...ws), mi, [[us[0], ws[0]], [us[1], ws[1]], [us[2], ws[2]]]];
          if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(r);
        }
      });
      // do two triangles' interiors overlap? (no edge direction separates them)
      const triOverlap = (A, C) => {
        for (const T of [A, C]) for (let k = 0; k < 3; k++) {
          const p0 = T[k], p1 = T[(k + 1) % 3], nx = p1[1] - p0[1], ny = p0[0] - p1[0], L = Math.hypot(nx, ny) || 1;
          const pr = P => P.map(q => (q[0] * nx + q[1] * ny) / L), a = pr(A), c = pr(C);
          if (Math.max(...a) <= Math.min(...c) + 1e-3 || Math.max(...c) <= Math.min(...a) + 1e-3) return false;
        }
        return true;
      };
      const hits = [];
      for (const [key, rs] of buckets) {
        if (rs.length < 2) continue;
        const byMesh = new Set(rs.map(r => r[4])); if (byMesh.size < 2) continue;
        rs.sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length && rs[j][0] < rs[i][2] - 1e-4; j++) {
          const a = rs[i], c = rs[j]; if (a[4] === c[4]) continue;
          const ou = Math.min(a[2], c[2]) - Math.max(a[0], c[0]), ow = Math.min(a[3], c[3]) - Math.max(a[1], c[1]);
          if (ou > 1e-3 && ow > 1e-3 && triOverlap(a[5], c[5])) { hits.push({ key, area: ou * ow, at: [+(Math.max(a[0], c[0])).toFixed(2), +(Math.max(a[1], c[1])).toFixed(2)], meshes: [a[4], c[4]] }); }
        }
      }
      // sum by plane
      const agg = {}; for (const h of hits) { const k = h.key + '  ' + h.meshes.sort().map(desc).join('  vs  '); (agg[k] = agg[k] || { area: 0, at: h.at }).area += h.area; }
      return { meshes: meshes.length, hits: Object.entries(agg).sort((a, b) => b[1].area - a[1].area).slice(0, 25).map(([k, o]) => `${k}  area ${o.area.toFixed(3)}  near ${o.at}`) };
    }, w);
    console.log(`== ${w}: ${res.meshes} meshes, ${res.hits.length ? res.hits.length + ' fighting surfaces' : 'nothing fights'}`); for (const h of res.hits) console.log('  ' + h);
  }
  console.log(errs.length ? 'ERRORS ' + errs.join('\n') : 'no errors'); await b.close();
})();
