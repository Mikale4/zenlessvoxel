/* voice.js -- the Agents speak: their own lines from the real game (voice-data.js, audio/voice/) at the
   moments this game has. One voice at a time: a big moment (an Ultimate, a Chain Attack, a KO, the start of
   a fight) cuts in over an everyday one, and the everyday ones speak only now and then, never on top of each
   other. A rival Proxy's Agents are quieter and give way to yours. */
(function () {
  'use strict';
  const L = window.VOICE_LINES || {};
  const BIG = { ult: 1, ult2: 1, chain: 1, defeated: 1, encounter_patrol: 1, encounter_elite: 1, encounter_boss: 1 };
  // an everyday moment: how likely she says something, and how long (s) after the last line she may
  const OFTEN = {
    ex: [0.6, 1.2], counter: [0.5, 1.2], perfect_dodge: [0.8, 0.8], assist: [0.6, 1.2], quick: [1, 0.4], assist_down: [1, 0],
    assist_stunned: [0.8, 0.8], perfect_assist: [0.6, 0.8], def_assist: [0.6, 0.8], chain_select: [0.7, 0.3],
    stun_recover: [0.6, 2], charge_hint: [0.35, 4], staggered: [0.7, 1],
  };
  // a moment she has no lines for borrows another's
  const ELSE = { ult2: 'ult', quick: 'assist', assist_down: 'assist', assist_stunned: 'assist', perfect_assist: 'def_assist', def_assist: 'assist' };
  const V = { vol: 0.8 };
  const url = (id, f) => 'audio/voice/' + id + '/' + f + '.mp3';
  let cur = null, curPri = 0, lastAt = 0;
  const lastI = {}, ahead = {};

  /* a line picked (never the same one twice running) and already loading, so it speaks on time */
  function pick(id, key) {
    const list = L[id][key];
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastI[id + key]) i = (i + 1) % list.length;
    lastI[id + key] = i;
    const a = new Audio(url(id, list[i][0])); a.preload = 'auto';
    return { a, text: list[i][1] };
  }
  function take(id, key) { const k = id + '|' + key, r = ahead[k] || pick(id, key); ahead[k] = pick(id, key); return r; }
  function start(a, pri, vol) {
    if (cur && !cur.paused) cur.pause();
    a.volume = Math.max(0, Math.min(1, vol));
    const p = a.play(); if (p && p.catch) p.catch(() => { /* sound not allowed yet: she says nothing */ });
    cur = a; curPri = pri; lastAt = performance.now();
    a.onended = () => { lastAt = performance.now(); };
  }
  /* before a fight: the squad's lines start loading */
  V.prime = ids => { for (const id of ids) if (L[id]) for (const key in L[id]) if (!ahead[id + '|' + key]) ahead[id + '|' + key] = pick(id, key); };

  /* In a fight: `id` says her line for `moment`. o.with: the teammate it is about (her own line for her,
     if she has one); o.p: how likely (else the moment's own odds); o.rival: a rival Proxy's Agent.
     Returns the line as written ('' where the wiki has no transcript), or null if she says nothing. */
  V.say = (id, moment, o) => {
    o = o || {};
    const lines = L[id]; if (!lines || V.vol <= 0 || (window.SFX && SFX.quiet)) return null;
    let key = moment;
    if (o.with && lines[key + '_' + o.with] && Math.random() < 0.7) key += '_' + o.with;
    while (key && !lines[key]) key = ELSE[key];
    if (!key) return null;
    const big = BIG[moment], rule = OFTEN[moment] || [1, 0], pri = (big ? 2 : 1) - (o.rival ? 0.5 : 0);
    if (Math.random() > (o.p != null ? o.p : rule[0])) return null;
    const busy = cur && !cur.paused && !cur.ended;
    if (busy ? pri <= curPri : !big && performance.now() - lastAt < rule[1] * 1000) return null;
    const r = take(id, key);
    start(r.a, pri, V.vol * (o.rival ? 0.7 : 1));
    return r.text;
  };
  /* Outside a fight: she says one of her lines that has words (for these moments), so it can be shown too. */
  V.line = (id, moments) => {
    const lines = L[id]; if (!lines || V.vol <= 0) return null;
    const pool = []; for (const m of moments) for (const x of lines[m] || []) if (x[1]) pool.push(x);
    if (!pool.length) return null;
    const x = pool[Math.floor(Math.random() * pool.length)];
    start(new Audio(url(id, x[0])), 1, V.vol);   // a fight's big moment (its first line) may cut in
    return x[1];
  };
  V.setVolume = v => { V.vol = v; if (cur && !cur.paused) cur.volume = Math.min(cur.volume, v); };
  /* what is being said, for the test tools */
  V.state = () => ({ playing: !!cur && !cur.paused && !cur.ended, file: cur ? decodeURIComponent(cur.src.split('/audio/voice/')[1] || '') : null });
  window.VOICE = V;
})();
