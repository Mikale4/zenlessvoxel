/* music.js -- the soundtrack: a track for every screen and every fight, from the official
   Zenless Zone Zero albums (audio/, see the README). Two <audio> elements, so one fades out
   while the next fades in; the first track waits for a click or a key (browsers block sound
   until then). As in Post Parade. */
(function () {
  'use strict';
  /* what plays where: a screen, a battleground's encounter (`outer_boss`, as DATA.ENCOUNTERS),
     a rival Proxy (`clash_mirage`), and the jingles. A list plays through, one after the other.
     `<key>2` takes over when a boss enters phase 2. */
  const TRACKS = {
    title: ['title - 19 Percent.mp3'],                                  // the official website's theme
    street: ['street - 60 Percent Fantasy - Serenity.mp3', 'street - 60 Percent Fantasy - Passion.mp3'],   // Sixth Street, evening
    shop: ['shop - Time To Play.mp3'],                                  // Random Play
    dive: ['dive - 60 Percent Fantasy.mp3'],
    clash_menu: ['clash_menu - Up-Up-Down-Down-Left-Left-Right-Right.mp3'],   // Godfinger, the arcade
    outer_patrol: ['outer_patrol - Wind of the Wild.mp3'],
    outer_elite: ['outer_elite - Dusk in the Wilderness.mp3'],
    outer_boss: ['outer_boss - Long Live the King.mp3'],                // Notorious Hunt: Pompey
    summit_patrol: ['summit_patrol - Darkest Hour.mp3'],
    summit_elite: ['summit_elite - The Source.mp3'],
    summit_boss: ['summit_boss - Mevorakh.mp3'],                        // Notorious Hunt: Miasma Priest
    summit_boss2: ['summit_boss2 - The Way.mp3'],                       // ...and its second phase
    stage_patrol: ['stage_patrol - Perish Together.mp3'],
    stage_elite: ['stage_elite - Sword of Corruption.mp3'],             // every Dullahan fight
    stage_boss: ['stage_boss - Four-Armed Sword.mp3'],                  // Notorious Hunt: Dead End Butcher
    clash_patch: ['clash_patch - Purchasable Loyalty.mp3'],
    clash_vesper: ['clash_vesper - Pride and Paranoia.mp3'],
    clash_mirage: ['clash_mirage - The Final Duel.mp3'],
    win: ['win - Victory.mp3'],
    lose: ['lose - Defeat.mp3'],
  };
  const SCREENS = { title: 1, street: 1, shop: 1, dive: 1, clash_menu: 1 };   // these pick up where they left off; a fight starts from the top
  const ONCE = { win: 1, lose: 1 };                                            // jingles: once, then quiet
  const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'];
  const M = { vol: 0.5, key: null };
  const url = f => 'audio/' + encodeURIComponent(f);
  let deck = null, cur = 0, unlocked = false, pending = null, seq = 0, wasOn = false;
  const at = {}, next = {};   // where each file had got to; which track of a list is up

  const mk = () => { const a = new Audio(); a.preload = 'auto'; a.volume = 0; return a; };
  function retire(a) { a.onended = null; try { a.pause(); } catch (e) { /* already stopped */ } a.removeAttribute('src'); a.load(); }
  /* by hand, not Web Audio: these are long streamed files (a new fade on an element cancels its old one) */
  const fades = new Map();
  function fade(a, to, ms, done) {
    clearInterval(fades.get(a));
    const from = a.volume, n = Math.max(1, Math.round(ms / 40)); let i = 0;
    fades.set(a, setInterval(() => {
      a.volume = Math.max(0, Math.min(1, from + (to - from) * (++i / n)));
      if (i >= n) { clearInterval(fades.get(a)); fades.delete(a); if (done) done(); }
    }, 40));
  }

  /* Play `key`, crossfading from whatever is on. Asking for what is already playing does
     nothing, so a screen can ask on every redraw. False when there is nothing to hear. */
  M.play = (key, o) => {
    o = o || {};
    const list = TRACKS[key]; if (!list) return false;
    if (key === M.key && !o.restart) return M.vol > 0;
    M.key = key;
    if (!unlocked) { pending = key; return M.vol > 0; }
    const my = ++seq, ms = o.fade || 600;
    if (!deck) deck = [mk(), mk()];
    const from = deck[cur], to = deck[1 - cur]; cur = 1 - cur;
    if (from.src && !from.paused) at[from.src] = from.currentTime;
    const i = (next[key] || 0) % list.length;
    to.src = url(list[i]); to.loop = list.length === 1 && !ONCE[key];
    to.onended = list.length > 1 ? () => { if (seq === my) { next[key] = i + 1; M.play(key, { restart: true }); } } : null;
    const t = SCREENS[key] && at[to.src];
    if (t) to.addEventListener('loadedmetadata', () => { if (t < to.duration - 1) to.currentTime = t; }, { once: true });
    to.volume = 0;
    const p = to.play();
    // a gesture that did not count as one (a touch that began a scroll): wait for the next
    if (p && p.catch) p.catch(e => { if (e && e.name === 'NotAllowedError' && seq === my) { unlocked = false; pending = key; } });
    fade(to, M.vol, ms);
    if (!from.paused) fade(from, 0, ms, () => retire(from));
    return M.vol > 0;
  };
  /* a boss enters phase 2: its own music, if it has some */
  M.phase2 = () => { if (M.key && TRACKS[M.key + '2']) M.play(M.key + '2', { fade: 900 }); };
  M.setVolume = v => { M.vol = v; const a = deck && deck[cur]; if (a && !a.paused) fade(a, v, 200); };
  /* what is on, for the test tools */
  M.state = () => { const a = deck && deck[cur]; return { key: M.key, unlocked, file: a && a.src ? decodeURIComponent(a.src.split('/audio/')[1] || '') : null, playing: !!a && !a.paused, t: a ? Math.round(a.currentTime * 10) / 10 : 0, volume: a ? Math.round(a.volume * 100) / 100 : 0 }; };

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    if (pending) { const k = pending; pending = null; M.key = null; M.play(k); }
  }
  for (const ev of GESTURES) addEventListener(ev, unlock, true);
  /* a phone puts the game away: the music stops with it, and comes back with it */
  document.addEventListener('visibilitychange', () => {
    const a = deck && deck[cur]; if (!a || !a.src) return;
    if (document.hidden) { wasOn = !a.paused; a.pause(); }
    else if (wasOn) { const p = a.play(); if (p && p.catch) p.catch(() => { /* waits for a gesture */ }); }
  });
  window.MUSIC = M;
})();
