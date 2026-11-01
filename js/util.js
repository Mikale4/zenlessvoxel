/* util.js -- small shared helpers (math, DOM, settings storage). */
(function () {
  'use strict';
  const U = {};
  U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rnd = (a, b) => a + Math.random() * (b - a);
  U.rndi = (a, b) => Math.floor(U.rnd(a, b + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.chance = p => Math.random() < p;
  U.dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  U.ang = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);         // yaw that faces from a to b (model faces +Z)
  U.wrap = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
  U.turn = (a, b, k) => a + U.wrap(b - a) * k;                // ease an angle toward another
  U.ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  U.easeOut = t => 1 - Math.pow(1 - t, 3);
  U.easeIn = t => t * t * t;
  U.smooth = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));
  U.fmt = n => Math.round(n).toLocaleString('en-US');
  U.hex = n => '#' + (n & 0xffffff).toString(16).padStart(6, '0');

  U.$ = id => document.getElementById(id);
  /* el('div', {class:'x', onclick:fn}, child, 'text', ...) */
  U.el = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k === 'html') e.innerHTML = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  };

  /* persisted settings: a JSON blob in localStorage; every access is guarded */
  /* (signed in, each account keeps its own: U.store.ns is the account id) */
  U.store = {
    ns: null,
    k(key) { return 'zvz.' + (U.store.ns ? U.store.ns + '.' : '') + key; },
    get(key, def) { try { const v = localStorage.getItem(U.store.k(key)); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem(U.store.k(key), JSON.stringify(val)); } catch (e) { /* private mode: keep going */ } },
  };

  window.U = U;
})();
