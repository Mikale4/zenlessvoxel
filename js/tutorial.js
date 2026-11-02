/* ============================================================================
   tutorial.js -- TRAINING: the interactive tutorial.

   A fight on the Ether stage against one Faun, where nothing happens until
   you do it. A card over the battle gives one lesson at a time and the next
   opens once you have done it (or SKIP). The Faun only swings when a lesson
   wants it to; it cannot be Stunned before the Stun lesson or fall before
   the last one, and the squad's HP is topped up, so nobody loses. A missed
   Perfect Dodge or Assist says why (too early, too late, no flash yet). The
   keys the card names are your own (keys.js); on a phone, the buttons.

   The squad: Qingyi on the field (four hits to her string, and a hold move
   once her Voltage is full), Caesar and Aria behind her.

     TUTORIAL.start()   TUTORIAL.after(B) (main.js, when the fight ends)
     TUTORIAL.done()    finished once on this Proxy
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U, D = window.DATA, R = D.RULES;
  const SQUAD = ['qingyi', 'caesar', 'aria'];
  const TUTORIAL = {};
  let S = null;                         // the training running: { B, i, got, note, card, off, ... }

  /* ------------------------------------------------- the keys it names -- */
  const touch = () => !!(window.GAME && GAME.touch);
  const BUTTON = { basic: 'BASIC', dodge: 'DODGE', special: 'SPECIAL', ult: 'ULT', next: 'SWAP ▶', prev: '◀ SWAP', target: 'TARGET', chainL: 'the left card', chainR: 'the right card' };
  /* an action's keys as <kbd>s: "Left click or J" (on a phone, its button) */
  function K(id) {
    if (touch()) return [el('kbd', null, BUTTON[id] || id)];
    const ks = KEYS.get(id).filter(Boolean), out = [];
    ks.forEach((c, i) => { if (i) out.push(' or '); out.push(el('kbd', null, KEYS.label(c))); });
    return out.length ? out : [el('kbd', null, '(no key: KEY BINDINGS)')];
  }
  function moveKeys() {
    if (touch()) return ['Drag anywhere on the battlefield (a stick appears under your thumb)'];
    const set = slot => ['up', 'left', 'down', 'right'].map(id => KEYS.get(id)[slot]).filter(Boolean).map(c => el('kbd', null, KEYS.label(c)));
    const a = set(0), b = set(1);
    return b.length ? [...a, ' (or ', ...b, ')'] : a;
  }

  /* ------------------------------------------------------ the world -- */
  const B_ = () => S && BT.B === S.B ? S.B : null;
  const me = () => BT.active();
  const faun = () => S.B.enemies.find(v => v.alive) || null;
  /* make the Faun swing a move of its own, when it is close and free (a lesson asks) */
  function cue(name) {
    const B = S.B, v = faun(), a = me();
    if (!v || !a || v.act || v.stun > 0 || v.spawnT > 0 || B.t < (S.cueAt || 0) || B.phase !== 'fight') return;
    if (U.dist(v, a) - v.rad - a.rad > 2.2) { S.far = true; return; }
    S.far = false;
    const def = v.def.attacks.find(m => m.name === name);
    BT.startEnemyAttack(v, def, a);
    S.th = v.act && v.act.threats.slice(); S.thSeen = false; S.dodgedAt = null;
    S.cueAt = B.t + def.dur + 1.6;
  }
  const lastImpact = () => S.th && S.th.length ? S.th[S.th.length - 1] : null;
  const nextThreat = () => S.th && S.th.find(t => !t.done);

  const HOLDS = ['moonlit', 'deadEnd', 'hold', 'charged', 'auric', 'rainbow', 'fleeting'];
  /* ------------------------------------------------------ the lessons --
     text: what the card says (by progress), need: how many to do, on: what
     counts (returns true for one more, or a number for the progress itself),
     tick: each frame while it is open (cues, timers, what it keeps topped up) */
  const LESSONS = [
    {
      id: 'move', title: 'MOVE', need: 1,
      text: () => [...moveKeys(), touch() ? '. Walk into the yellow ring.' : ' to walk. Walk into the yellow ring.'],
      setup() { const a = me(), I = S.B.bounds; S.spot = { x: U.clamp(a.x + 4, I[0] + 1.5, I[2] - 1.5), z: U.clamp(a.z - 1.5, I[1] + 1.5, I[3] - 1.5) }; S.ringT = 0; },
      tick(dt) {
        S.ringT -= dt; if (S.ringT <= 0) { S.ringT = 0.55; FX.ring(S.spot.x, S.spot.z, 0.4, 1.0, 0xf4d35e, 0.6); }
        const a = me(); if (a && Math.hypot(a.x - S.spot.x, a.z - S.spot.z) < 1.0) return true;
      },
    },
    {
      id: 'string', title: 'BASIC ATTACK', need: 4,
      text: () => ['Walk up to the Faun and tap ', ...K('basic'), ' again and again: Qingyi\'s string is four hits, and the last one is heavy. Pause for a second and it starts over.'],
      on(k, d) { if (k === 'skill' && d.kind === 'basic') return d.step + 1; },
    },
    {
      id: 'hold', title: 'HOLD BASIC', need: 1,
      text: () => ['Her Voltage is full (FLASH CONNECT on her panel). Now hold ', ...K('basic'), ': Enchanted Moonlit Blossoms, five rushes and a big finish. Every Agent has hold moves of her own: the BASIC button names one when it is ready.'],
      tick() { const a = me(); if (a && a.id === 'qingyi') a.voltage = Math.max(a.voltage, 100); },
      on(k, d) {
        if (k === 'skill' && HOLDS.some(h => d.def === d.a.def.kit[h])) return true;     // (any Agent's hold move counts)
        if (k === 'skill' && d.kind === 'basic' && d.step === 0) S.note = 'Keep it held a moment longer: a tap is a Basic.';
      },
    },
    {
      id: 'dodge', title: 'DODGE', need: 2,
      text: () => ['Press ', ...K('dodge'), touch() ? ' to dodge the way you drag (no drag: a step back).' : ' to dodge the way you are pushing (no direction: a step back).', ' Dodge twice. She has two in a row, then a short wait.'],
      on(k) { if (k === 'dodge') return true; },
    },
    {
      id: 'dash', title: 'DASH ATTACK', need: 1,
      text: () => ['Dodge, then ', ...K('basic'), ' right away: a Dash Attack, a lunge that closes the distance. (Keep ', ...K('dodge'), ' held after a dodge to sprint: Basic while sprinting is a Dash Attack too.)'],
      on(k, d) {
        if (k === 'dodge') S.dodgeT = S.B.t;
        if (k === 'skill' && (d.kind === 'dash' || d.def === d.a.def.kit.spin)) return true;
        if (k === 'skill' && d.kind === 'basic' && S.B.t - (S.dodgeT || -9) < 1.5) S.note = 'A little sooner: Basic the moment the dodge ends.';
      },
    },
    {
      id: 'perfect', title: 'PERFECT DODGE', need: 2,
      text: () => S.got < 1 ? ['The Faun is about to swing its signpost. Press ', ...K('dodge'), ' just before the blow lands: a Perfect Dodge, and time slows. Too early and the swing still finds you.']
        : ['PERFECT! Now ', ...K('basic'), ', right away: the Dodge Counter.'],
      tick() {
        const B = S.B, a = me();
        if (S.got < 1) cue('Signpost Swing');
        // the swing went by: why it was not a Perfect Dodge
        const last = lastImpact();
        if (S.got < 1 && last && last.done && !S.thSeen) { S.thSeen = true; if (!S.note) S.note = S.dodgedAt == null ? 'No dodge that time: press Dodge just as the signpost comes down.' : 'Too late: dodge a little before it lands.'; }
        if (S.got === 1 && a && !(a.counterUntil > B.t) && !(a.act && a.act.kind === 'counter')) { S.got = 0; S.note = 'Too slow: press Basic the moment you Perfect Dodge.'; draw(); }
        if (S.far && S.got < 1 && !S.note) S.note = 'Get close to the Faun.';
      },
      on(k, d) {
        if (k === 'dodge' && S.got < 1) {
          const th = nextThreat(), lead = th ? th.impactAt - S.B.t : null;
          S.dodgedAt = S.B.t;
          if (lead != null && lead > BT.T.perfectWin + 0.02) S.note = 'Too early: wait until the signpost is coming down.';
        }
        if (k === 'perfect' && S.got < 1) { S.note = ''; return 1; }
        if (k === 'skill' && d.kind === 'counter' && S.got >= 1) return 2;
      },
    },
    {
      id: 'special', title: 'SPECIAL ATTACK', need: 1,
      text: () => ['Tap ', ...K('special'), ': a Special Attack. It costs nothing.'],
      setup() { const a = me(); a.energy = 0; },
      tick() { const a = me(); if (a) a.energy = Math.min(a.energy, a.def.kit.ex.cost - 5); },
      on(k, d) { if (k === 'skill' && d.kind === 'special') return true; },
    },
    {
      id: 'ex', title: 'EX SPECIAL ATTACK', need: 1,
      text: () => ['Her Energy is full. Past the mark on the bar, ', ...K('special'), ' is her EX Special Attack: much stronger, and nothing can hurt her while it plays. The SPECIAL button says EX when it is ready.'],
      tick() { const a = me(); if (a && a.energy < a.def.kit.ex.cost && !(a.act && a.act.kind === 'ex')) a.energy = a.def.energyMax; },
      on(k, d) { if (k === 'skill' && d.kind === 'ex') return true; },
    },
    {
      id: 'switch', title: 'SWITCH', need: 1,
      text: () => ['Press ', ...K('next'), ' to bring in the next Agent, Caesar (', ...K('prev'), ' brings in the one before). Each of the three fills her own Energy and Decibels, and the two waiting can jump in to help, as you are about to see.'],
      on(k, d) { if (k === 'swap' && d.why === 'swap') return true; },
    },
    {
      id: 'assist', title: 'DEFENSIVE ASSIST', need: 2,
      text: () => S.got < 1 ? ['The Faun is winding up a big slam. When it flashes gold, press ', ...K('next'), ': the next Agent jumps in and parries it. That costs Assist Points (the pips under your squad).']
        : ['PARRIED! Now ', ...K('basic'), ': the Assist Follow-Up.'],
      tick() {
        const B = S.B, a = me();
        B.assist = R.assistPointsMax;
        if (S.got < 1) cue('Charged Slam');
        const last = lastImpact();
        if (S.got < 1 && last && last.done && !S.thSeen) { S.thSeen = true; if (!last.assist && !S.note) S.note = 'You missed the flash: press Switch while the gold glow is up.'; }
        if (S.got === 1 && a && !(a.followUntil > B.t) && !(a.act && ['followup', 'assist'].includes(a.act.kind))) { S.got = 0; S.note = 'Too slow: Basic right after the parry.'; draw(); }
        if (S.far && S.got < 1 && !S.note) S.note = 'Get close to the Faun.';
      },
      on(k, d) {
        if (k === 'swap' && d.why === 'swap' && S.got < 1) S.note = 'That was a plain switch: wait for the gold flash.';
        if (k === 'assist' && d.type === 'defensive' && S.got < 1) { S.note = ''; return 1; }
        if (k === 'skill' && d.kind === 'followup' && S.got >= 1) return 2;
      },
    },
    {
      id: 'chain', title: 'STUN AND CHAIN ATTACK', need: 2,
      text: () => S.got < 1 ? ['Every hit builds Daze: the yellow bar under its HP. Fill it to Stun the Faun. Heavy hits (the last of a string, a Special, an EX) Daze the most.']
        : ['STUNNED: it cannot act and takes more damage. Land a heavy hit and a Chain Attack opens: time slows, and you pick who follows up, ', ...K('chainL'), ' for the left card, ', ...K('chainR'), ' for the right.'],
      setup() { const v = faun(); if (v) { v.noStun = false; v.daze = Math.max(v.daze, v.dazeMax * 0.7); } },
      tick() {
        const v = faun(); if (!v) return;
        if (S.got === 1 && !(v.stun > 0) && !S.B.chain) { S.got = 0; v.daze = v.dazeMax * 0.7; S.note = 'It got back up: Stun it again, then a heavy hit.'; draw(); }
      },
      on(k) { if (k === 'stun' && S.got < 1) return 1; if (k === 'chain') return 2; },
    },
    {
      id: 'ult', title: 'ULTIMATE', need: 1,
      text: () => ['Her Decibels are at MAXIMUM (the bar under her Energy; the ULT button glows). Press ', ...K('ult'), ': her Ultimate.'],
      tick() { const a = me(); if (a && !(S.B.cutin)) a.decibels = R.decibelMax; },
      on(k) { if (k === 'ult') return true; },
    },
    {
      id: 'finish', title: 'NOW FOR REAL', need: 1,
      text: () => ['Everything at once: the Faun fights back now. Dodge its swings, parry the gold flashes, Stun it, and bring it down.'],
      setup() { const v = faun(); if (v) { v.floor = 0; v.noStun = false; v.hp = Math.min(v.hp, v.hpMax * 0.3); v.atkCd = 1.2; } },
      tick() { if (!faun()) return true; },
    },
  ];

  /* ------------------------------------------------------ the card -- */
  function draw(flash) {
    const L = LESSONS[S.i]; if (!S.card || !L) return;
    const c = S.card; c.innerHTML = '';
    c.className = 'tut' + (flash ? ' ' + flash : '');
    c.append(...[
      el('div', { class: 'n' }, el('span', null, `TRAINING · LESSON ${S.i + 1} / ${LESSONS.length}`), el('i', null, S.ok ? '' : touch() ? '' : 'Esc: Tactics')),
      el('h3', null, S.ok ? '✓ ' + L.title : L.title),
      el('p', null, ...(S.ok ? [S.ok] : L.text())),
      L.need > 1 ? el('div', { class: 'pips' }, ...Array.from({ length: L.need }, (_, k) => el('i', { class: k < S.got ? 'on' : '' }))) : null,
      S.note && !S.ok ? el('div', { class: 'try' }, S.note) : null,
      el('div', { class: 'row' },
        el('button', { onclick: () => { SFX.play('ui'); next(); } }, S.i + 1 < LESSONS.length ? 'SKIP LESSON ▸' : 'SKIP'),
        el('button', { onclick: () => { SFX.play('ui'); BT.retreat(); } }, 'LEAVE TRAINING'))].filter(Boolean));
  }
  const PRAISE = ['Nice!', 'Clean.', 'That\'s it.', 'Sharp.', 'Exactly.', 'Good.'];
  function complete() {
    const L = LESSONS[S.i];
    const nx = LESSONS[S.i + 1], title = t => t.toLowerCase().replace(/\bex\b/, 'EX').replace(/^./, x => x.toUpperCase());
    S.ok = `${U.pick(PRAISE)} ${nx ? 'Next: ' + title(nx.title) + '.' : 'Training complete.'}`;
    SFX.play('win'); BT.callout(L.title, 'skill', 'LESSON CLEAR');
    draw('ok');
    const B = S.B, i = S.i;
    setTimeout(() => { if (S && S.B === B && S.i === i && BT.B === B && B.phase !== 'end') next(); }, 1300);
  }
  function next() {
    if (!S) return;
    S.i++; S.got = 0; S.note = ''; S.ok = null; S.th = null; S.cueAt = S.B.t + 0.8;
    const L = LESSONS[S.i];
    if (!L) return;
    if (L.setup) L.setup();
    draw('new');
  }
  /* one more done (or the progress itself) */
  function progress(r) {
    const L = LESSONS[S.i];
    const got = typeof r === 'number' ? r : S.got + 1;
    if (got !== S.got) { S.got = got; if (S.got < L.need) SFX.play('ui'); }
    if (S.got >= L.need) complete(); else draw();
  }

  /* ------------------------------------------------- listening in -- */
  function hear(kind, d) {
    const B = B_(); if (!B) return;
    const L = LESSONS[S.i]; if (!L) return;
    if (kind === 'frame') return frame(d);
    if (S.ok || !L.on) return;
    const before = S.note, r = L.on(kind, d);
    if (r === true || typeof r === 'number') progress(r);
    else if (S.note !== before) draw();
  }
  function frame(rdt) {
    const B = S.B, L = LESSONS[S.i], v = faun(), last = L && L.id === 'finish';
    // a gentle world: nobody gets hurt for long, the Faun keeps its swings for when a lesson wants one
    for (const a of B.squad) if (a.alive) a.hp = last ? Math.max(a.hp, a.hpMax * 0.35) : a.hpMax;
    if (v && !last) { v.atkCd = Math.max(v.atkCd, 0.6); }
    if (!L || S.ok || B.phase !== 'fight' || B.paused) return;
    const before = S.note;
    if (L.tick && L.tick(rdt * (BT.T.speed || 1))) return progress(true);
    if (S.note !== before) draw();
  }

  /* ------------------------------------------------------- start, end -- */
  TUTORIAL.start = () => {
    stop();
    document.querySelectorAll('.panel').forEach(p => p.remove());
    GAME.startBattle({ squad: SQUAD.slice(), arena: 'stage', encounter: 'patrol', tutorial: true, enc: { name: 'Training', waves: [['faun']] } });
    const B = BT.B, v = B.enemies[0];
    if (v) { v.noStun = true; v.floor = 0.5; }
    S = { B, i: -1, got: 0, note: '', ok: null };
    S.card = el('div', { class: 'tut' }); U.$('hud').append(S.card);
    S.off = BT.on(hear);
    next();
  };
  function stop() { if (!S) return; if (S.off) S.off(); if (S.card) S.card.remove(); S = null; }
  TUTORIAL.done = () => !!(U.store.get('tutorial', null) || {}).done;
  /* the fight is over: the training's own last screen (true: handled) */
  TUTORIAL.after = B => {
    const won = B.result === 'win', st = B.stats, reached = S ? S.i : 0;
    stop();
    if (!won) { MENU.setup(); return true; }
    U.store.set('tutorial', { done: true, at: Date.now() });
    const row = (k, v) => [el('span', null, k), el('b', null, v)];
    const box = el('div', { class: 'box tutdone' },
      el('div', { class: 'rank S' }, '✓'),
      el('h2', null, 'TRAINING COMPLETE'),
      el('div', { class: 'hint' }, `All ${LESSONS.length} lessons${reached + 1 < LESSONS.length ? ' (some skipped)' : ''}. Every Agent plays by the same buttons: her own string, hold moves and EX are in her kit on the squad screen.`),
      el('div', { class: 'stats' }, ...row('Perfect Dodges', st.perfect), ...row('Perfect Assists', st.assists), ...row('Stuns / Chain Attacks', `${st.stuns} / ${st.chains}`), ...row('Ultimates', st.ults), ...row('Damage dealt', U.fmt(st.dmg))),
      el('p', null, 'Rather watch? AUTO fights for you, and the Battle Lab\'s Auto-attack lets you just move and command. KEY BINDINGS changes any key.'),
      el('div', { class: 'row', style: { justifyContent: 'center' } },
        el('button', { class: 'btn', onclick: () => MENU.setup() }, 'TO THE HOLLOW'),
        el('button', { class: 'btn dark', onclick: () => TUTORIAL.start() }, 'TRAIN AGAIN'),
        Auth.current() ? el('button', { class: 'btn dark', onclick: () => MENU.lobby({ spawn: [1.5, -11.0] }) }, 'SIXTH STREET') : null));
    U.$('screens').innerHTML = ''; U.$('screens').append(el('div', { class: 'scr results' }, box));
    return true;
  };
  window.TUTORIAL = TUTORIAL;
})();
