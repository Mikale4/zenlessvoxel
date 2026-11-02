/* ============================================================================
   auth.js -- Proxy accounts, after Post Parade's.

   Registration and sign-in against an account store in this browser, each
   account with its own save (squad, Battle Lab settings, records). Which
   sibling you are (Wise or Belle) is chosen once, when the account is new,
   as in the real game.

   On passwords: this is localStorage. Anyone with the machine and devtools
   can read it, so it is NOT a security boundary. It is salted SHA-256 rather
   than plaintext only because people reuse passwords, and a local game has no
   business keeping one in the clear.

     Auth.list() Auth.register(user, pw) Auth.login(user, pw) Auth.logout()
     Auth.current() Auth.update(patch) Auth.record(result) Auth.remove(id)
   ========================================================================== */
(function () {
  'use strict';
  const ACCOUNTS = 'zvz.accounts', SESSION = 'zvz.session';
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode */ } };
  const store = () => read(ACCOUNTS) || {};
  const persist = a => write(ACCOUNTS, a);
  const norm = u => String(u || '').trim().toLowerCase();
  const uid = () => 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function salt() {
    const b = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b); else b.forEach((_, i) => b[i] = (Math.random() * 256) | 0);
    return Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  }
  async function hash(pw, s) {
    const data = new TextEncoder().encode(s + '|' + pw);
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf), x => x.toString(16).padStart(2, '0')).join('');
    }
    // file:// on an old browser: degrade rather than refuse to run
    let h = 0; for (const c of s + '|' + pw) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
    return 'weak:' + (h >>> 0).toString(16);
  }

  function checkUser(u, accounts) {
    u = String(u || '').trim();
    if (u.length < 3) return 'Proxy name needs at least 3 characters.';
    if (u.length > 16) return 'Proxy name can be at most 16 characters.';
    if (!/^[a-zA-Z0-9 _-]+$/.test(u)) return 'Letters, numbers, spaces, - and _ only.';
    if (Object.values(accounts || store()).some(a => norm(a.user) === norm(u))) return 'That Proxy name is already taken.';
    return null;
  }
  function checkPass(pw) {
    if (String(pw || '').length < 4) return 'Password needs at least 4 characters.';
    if (String(pw).length > 64) return 'That password is too long.';
    return null;
  }
  const pub = a => a && ({ id: a.id, user: a.user, proxy: a.proxy || null, created: a.created, lastLogin: a.lastLogin,
    battles: a.battles || 0, clears: a.clears || 0, best: a.best || {}, seenIntro: !!a.seenIntro,
    duels: a.duels || 0, duelWins: a.duelWins || 0, clash: a.clash || {}, dives: a.dives || 0, diveClears: a.diveClears || 0 });

  const Auth = {
    checkUser, checkPass,
    list: () => Object.values(store()).map(pub).sort((x, y) => (y.lastLogin || 0) - (x.lastLogin || 0)),
    async register(user, pw) {
      const accounts = store();
      const e1 = checkUser(user, accounts); if (e1) return { ok: false, error: e1, field: 'user' };
      const e2 = checkPass(pw); if (e2) return { ok: false, error: e2, field: 'pass' };
      const s = salt();
      const acc = { id: uid(), user: String(user).trim(), salt: s, hash: await hash(pw, s), created: Date.now(), lastLogin: Date.now(), proxy: null, battles: 0, clears: 0, best: {}, seenIntro: false };
      accounts[acc.id] = acc; persist(accounts); write(SESSION, acc.id);
      return { ok: true, account: pub(acc) };
    },
    async login(user, pw) {
      const accounts = store(), acc = Object.values(accounts).find(a => norm(a.user) === norm(user));
      const bad = { ok: false, error: 'Proxy name or password is incorrect.', field: 'pass' };   // the same either way: no hint which names exist
      if (!acc || await hash(pw, acc.salt) !== acc.hash) return bad;
      acc.lastLogin = Date.now(); persist(accounts); write(SESSION, acc.id);
      return { ok: true, account: pub(acc) };
    },
    logout() { try { localStorage.removeItem(SESSION); } catch (e) { /* fine */ } },
    current() { const id = read(SESSION), acc = id && store()[id]; return acc ? pub(acc) : null; },
    update(patch) {
      const id = read(SESSION), accounts = store(); if (!id || !accounts[id]) return null;
      Object.assign(accounts[id], patch || {}); persist(accounts); return pub(accounts[id]);
    },
    /* a finished battle: count it, and keep the best rank per battleground and encounter
       (a Proxy Clash: won and lost, the best rank and fastest win, per rival Proxy, and won / lost per mode) */
    record(r) {
      const id = read(SESSION), accounts = store(), a = id && accounts[id]; if (!a) return null;
      if (r.clash) {
        a.duels = (a.duels || 0) + 1; if (r.win) a.duelWins = (a.duelWins || 0) + 1;
        a.clash = a.clash || {}; const c = a.clash[r.rival] || (a.clash[r.rival] = { w: 0, l: 0, best: null, time: 0 }), order = 'FCBAS';
        if (r.win) { c.w++; if (order.indexOf(r.rank) > order.indexOf(c.best || 'F')) c.best = r.rank; if (!c.time || r.time < c.time) c.time = r.time; } else c.l++;
        if (r.mode) { c.modes = c.modes || {}; const m = c.modes[r.mode] || (c.modes[r.mode] = { w: 0, l: 0 }); if (r.win) m.w++; else m.l++; }   // and per mode
        persist(accounts); return pub(a);
      }
      a.battles = (a.battles || 0) + 1; if (r.win) a.clears = (a.clears || 0) + 1;
      a.best = a.best || {}; const k = r.arena + '.' + r.encounter, order = 'FCBAS';
      if (r.win && order.indexOf(r.rank) > order.indexOf((a.best[k] || {}).rank || 'F')) a.best[k] = { rank: r.rank, time: r.time };
      else if (r.win && a.best[k] && a.best[k].rank === r.rank && r.time < a.best[k].time) a.best[k].time = r.time;
      persist(accounts); return pub(a);
    },
    remove(id) { const a = store(); if (!a[id]) return false; delete a[id]; persist(a); try { for (const k of ['setup', 'tuning', 'clash']) localStorage.removeItem('zvz.' + id + '.' + k); } catch (e) { /* fine */ } if (read(SESSION) === id) Auth.logout(); return true; },
    /* where this account's own settings live (U.store namespaces by it) */
    ns() { const id = read(SESSION); return id && store()[id] ? id : null; },
  };
  window.Auth = Auth;
})();
