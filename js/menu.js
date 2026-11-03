/* ============================================================================
   menu.js -- title, squad / battleground / encounter select, the Battle Lab
   (every tuning knob), how to play, the in-battle Tactics menu (stops time),
   and the results screen.
   ========================================================================== */
(function () {
  'use strict';
  const { el, $ } = U, D = window.DATA;
  const MENU = {};
  const scr = () => $('screens');
  const portrait = id => (window.PORTRAITS && PORTRAITS[id]) || '';
  const DEF_SETUP = () => ({ squad: ['caesar', 'burnice', 'yixuan'], arena: 'outer', encounter: 'patrol', look: {} });
  let sel = DEF_SETUP(), kitFocus = 'caesar';
  function normSel() {
    if (!sel || !sel.squad || !sel.squad.length) sel = DEF_SETUP();
    if (!D.ENCOUNTERS[sel.arena]) sel.arena = 'outer';
    if (!sel.look) sel.look = {};
    kitFocus = sel.squad[0];
  }
  const save = () => U.store.set('setup', sel);
  /* Proxy Clash: your squad (1 to 3), the rival Proxy, their squad (null: they pick), the battleground */
  const DEF_CLASH = () => ({ mode: 'tag3', squad: ['caesar', 'burnice', 'aria'], rival: 'vesper', rsquad: null, arena: 'stage' });
  let csel = DEF_CLASH(), rolled = null, rlook = {};
  function normClash() {
    if (!csel || !Array.isArray(csel.squad)) csel = DEF_CLASH();
    csel.squad = csel.squad.filter(id => D.AGENTS[id]).slice(0, 3); if (!csel.squad.length) csel.squad = ['caesar'];
    if (!D.RIVALS[csel.rival]) csel.rival = 'vesper';
    if (!D.CLASH_MODES[csel.mode]) csel.mode = ({ 1: 'duel', 2: 'tag2' })[csel.squad.length] || 'tag3';
    csel.squad = csel.squad.slice(0, D.CLASH_MODES[csel.mode].size);
    if (!D.ENCOUNTERS[csel.arena]) csel.arena = 'stage';
    if (Array.isArray(csel.rsquad)) { csel.rsquad = [...new Set(csel.rsquad.filter(id => D.AGENTS[id]))].slice(0, 3); if (!csel.rsquad.length) csel.rsquad = null; } else csel.rsquad = null;
  }
  const saveClash = () => U.store.set('clash', csel);
  MENU.saveTuning = () => U.store.set('tuning', BT.T);
  /* signed in: this account's own squad and Battle Lab */
  MENU.loadAccount = () => {
    const a = Auth.current(); U.store.ns = a ? a.id : null;
    sel = U.store.get('setup', DEF_SETUP()); normSel();
    csel = U.store.get('clash', DEF_CLASH()); normClash(); rolled = null;
    const t = U.store.get('tuning', {}); for (const k in D.TUNING_DEFAULTS) BT.T[k] = k in t ? t[k] : D.TUNING_DEFAULTS[k];
    KEYS.load();
    if (window.TOWN) TOWN.reload();
    SFX.setVolume(BT.T.volume); MUSIC.setVolume(BT.T.music); VOICE.setVolume(BT.T.voice);
    return a;
  };
  MENU.boot = () => { MENU.loadAccount(); MENU.title(); };
  const NAME = { wise: 'Wise', belle: 'Belle' };
  const sibOf = p => p === 'wise' ? 'belle' : 'wise';

  /* ---------------------------------------------------------------- title --
     As in Post Parade: behind the logo a real battle runs on AUTO (a random
     squad, a random battleground), and the menu signs you in. */
  MENU.title = () => {
    if (GAME.mode !== 'title' || !BT.B) GAME.attract();
    MUSIC.play('title');
    const acc = Auth.current(), n = Auth.list().length;
    scr().innerHTML = '';
    const B = BT.B;
    const s = el('div', { class: 'scr title2' },
      el('div', { class: 't-live' }, el('i'), el('span', null, liveText())),
      el('div', { class: 'logo' },
        el('h1', null, 'ZENLESS ', el('span', null, 'VOXEL'), ' ZONE'),
        el('p', null, 'A PROXY\'S BATTLE LAB · AGENTS FIGHT · YOU COMMAND')),
      el('div', { class: 't-menu' },
        acc ? el('button', { class: 'btn', onclick: () => { SFX.unlock(); SFX.play('ui'); enter(acc); } }, `CONTINUE AS ${acc.user.toUpperCase()}`) : null,
        el('button', { class: 'btn' + (acc ? ' dark' : ''), onclick: () => { SFX.unlock(); SFX.play('ui'); MENU.auth('login'); } }, 'LOG IN'),
        el('button', { class: 'btn dark', onclick: () => { SFX.unlock(); SFX.play('ui'); MENU.auth('register'); } }, 'REGISTER A PROXY')),
      el('div', { class: 't-foot' }, n ? `${n} ${n === 1 ? 'Proxy' : 'Proxies'} registered on this device` : 'No Proxies yet: register to begin'),
      el('div', { class: 'note' }, 'An unofficial, non-commercial Zenless Zone Zero fan game. Zenless Zone Zero, its characters, enemies, music and voices belong to HoYoverse / miHoYo; this project is not affiliated with or endorsed by them.'));
    scr().append(s);
  };
  function liveText() {
    const B = BT.B; if (!B) return 'LIVE FROM THE HOLLOW';
    const mine = B.squad.map(a => a.def.short).join(' / ');
    return B.rival ? `LIVE · PROXY CLASH ${B.rival.mode.name} ${B.rival.mode.title} · ${B.arena.name} · ${mine} VS ${B.rival.squad.map(a => a.def.short).join(' / ')} (${B.rival.diff.name})` : `LIVE FROM THE HOLLOW · ${B.arena.name} · ${mine}`;
  }
  MENU.liveText = () => { const t = document.querySelector('.t-live span'); if (t) t.textContent = liveText(); };
  /* signed in: a new account chooses its Proxy, trains (unless it skips), then Sixth Street;
     one that left before the training was over picks up there */
  function enter(acc) {
    acc = MENU.loadAccount() || acc;
    if (!acc.proxy) MENU.chooseProxy(); else if (acc.onboard === 'training') MENU.onboard(); else MENU.lobby();
  }
  /* a new Proxy's way in, step by step: the account, who you are, training, Sixth Street */
  const STEPS = ['ACCOUNT', 'WHO YOU ARE', 'TRAINING', 'SIXTH STREET'];
  MENU.steps = n => el('div', { class: 'np-steps' }, ...STEPS.map((t, i) => el('span', { class: i < n ? 'done' : i === n ? 'on' : '' }, el('i', null, i < n ? '✓' : String(i + 1)), t)));

  /* -------------------------------------------------- register / sign in */
  MENU.auth = mode => {
    const reg = mode === 'register', accounts = Auth.list();
    const user = el('input', { maxlength: 16, autocomplete: 'off', spellcheck: 'false', placeholder: reg ? '3-16 characters' : 'your Proxy name' });
    const pass = el('input', { type: 'password', maxlength: 64, autocomplete: 'off', placeholder: reg ? 'at least 4 characters' : '' });
    const pass2 = reg ? el('input', { type: 'password', maxlength: 64, autocomplete: 'off' }) : null;
    const err = el('div', { class: 'au-err' }), go = el('button', { class: 'btn' }, reg ? 'CREATE ACCOUNT' : 'SIGN IN');
    const fld = (label, input) => el('label', { class: 'fld' }, el('span', null, label), input);
    const box = el('div', { class: 'box auth' },
      reg ? MENU.steps(0) : null,
      el('h2', null, reg ? 'REGISTER A PROXY' : 'PROXY SIGN-IN'),
      el('p', null, reg ? 'Your own Proxy: your squad, your Battle Lab settings, your records. Next you choose who you are, then a training run teaches you to fight.' : 'Random Play is where you left it.'),
      fld('PROXY NAME', user), fld('PASSWORD', pass), reg ? fld('CONFIRM PASSWORD', pass2) : null,
      !reg && accounts.length ? el('div', { class: 'fld' }, el('span', null, 'ON THIS DEVICE'), el('div', { class: 'acct-list' }, ...accounts.map(a =>
        el('button', { class: 'acct', onclick: () => { user.value = a.user; pass.focus(); } }, a.proxy ? el('img', { src: portrait(a.proxy), alt: '' }) : null,
          el('b', null, a.user), el('i', null, `${a.battles} dive${a.battles === 1 ? '' : 's'} · ${a.clears} clear${a.clears === 1 ? '' : 's'}`))))) : null,
      el('div', { class: 'row' }, go,
        el('button', { class: 'btn dark small', onclick: () => MENU.auth(reg ? 'login' : 'register') }, reg ? 'I HAVE AN ACCOUNT' : 'REGISTER INSTEAD'),
        el('button', { class: 'btn dark small', onclick: () => MENU.title() }, 'BACK')),
      err);
    const submit = async () => {
      err.textContent = ''; go.disabled = true;
      try {
        if (reg && pass.value !== pass2.value) { err.textContent = 'The two passwords do not match.'; return; }
        const res = reg ? await Auth.register(user.value, pass.value) : await Auth.login(user.value, pass.value);
        if (!res.ok) { err.textContent = res.error; (res.field === 'user' ? user : pass).focus(); return; }
        SFX.play('perfect');
        enter(res.account);
      } finally { go.disabled = false; }
    };
    go.onclick = submit;
    for (const i of [user, pass, pass2]) if (i) i.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') submit(); });
    scr().innerHTML = ''; scr().append(el('div', { class: 'panel login' }, box));
    setTimeout(() => user.focus(), 200);
  };

  /* ------------------------------------------------- choosing who you are --
     As in the real game, a new Proxy is one of the two siblings who run Random
     Play: Wise or Belle. The other one minds the shop. */
  const PROXY = {
    wise: { name: 'Wise', line: 'Calm, dry and a film buff: he knows every tape on the shelf, and reads a Hollow like a script.' },
    belle: { name: 'Belle', line: 'Bright and quick: she runs the till, keeps Eous in line, and guides Agents through a Hollow on instinct.' },
  };
  MENU.chooseProxy = () => {
    const acc = Auth.current(); if (!acc) return MENU.title();
    GAME.toLobby({ me: 'wise', chooser: true });
    let choice = null;
    const ok = el('button', { class: 'btn', disabled: true }, 'CHOOSE');
    const ids = ['wise', 'belle'];
    const cards = ids.map(id => el('button', { class: 'pcard ' + id, onclick: () => {
      choice = id; SFX.play('ui'); Lobby.choose(id);
      cards.forEach((c, i) => c.classList.toggle('sel', ids[i] === id)); ok.disabled = false; ok.textContent = `I'M ${PROXY[id].name.toUpperCase()}`;
    } }, el('img', { src: portrait(id), alt: '' }), el('b', null, PROXY[id].name), el('small', null, PROXY[id].line)));
    ok.onclick = () => { if (!choice) return; Auth.update({ proxy: choice, onboard: 'training' }); SFX.play('perfect'); MENU.onboard(); };
    scr().innerHTML = '';
    scr().append(el('div', { class: 'scr chooser' },
      el('div', { class: 'ch-head' }, MENU.steps(1), el('h2', null, 'WHO ARE YOU?'), el('p', null, `${acc.user}, every Proxy in New Eridu works from somewhere. Yours is Random Play, the video store on Sixth Street you run with your sibling. Which of you are you?`)),
      el('div', { class: 'ch-cards' }, cards[0], cards[1]),
      el('div', { class: 'ch-foot' }, ok, el('small', null, 'This is who you walk Sixth Street as; your sibling minds the shop. The battles are the same either way.'))));
  };

  /* ------------------------------------------------- your first training --
     Before a new Proxy's first Commission, your sibling sends you into the HDD's
     training run (tutorial.js): one lesson at a time, against a Faun. Skippable;
     either way Sixth Street and its welcome come next. */
  MENU.onboard = () => {
    const acc = Auth.current(); if (!acc) return MENU.title(); if (!acc.proxy) return MENU.chooseProxy();
    const s = sibOf(acc.proxy), me = NAME[acc.proxy], sn = NAME[s];
    if (GAME.mode !== 'lobby') GAME.toLobby({ me: acc.proxy, chooser: true });
    if (Lobby.choose) Lobby.choose(acc.proxy);
    scr().innerHTML = '';
    scr().append(el('div', { class: 'scr chooser onboard' }, el('div', { class: 'ch-head' }, MENU.steps(2), el('h2', null, 'TRAINING'),
      el('p', null, 'A real fight in the Hollow Deep Dive System\'s simulator, one lesson at a time: moving, the attack string, dodging, Specials, swapping and assists, Stuns and Chain Attacks, Ultimates. Nobody gets hurt. About ten minutes.'))));
    MENU.say([
      { who: s, name: sn, text: `So you're ${me} today. Good. Before you take a single Commission, you're doing a run in the HDD's training simulation.` },
      { who: 'eous', name: 'Eous', text: 'Ehn-ne! Ehn-nu! (Eous has the simulator warmed up.)' },
      { who: s, name: sn, text: 'Qingyi, Caesar and Aria offered to show you the ropes. The sim tells you what to press, one thing at a time, and nothing waits on a clock. Ready?', choices: [
        { label: 'Start training', fn: () => { SFX.play('ui'); TUTORIAL.start({ onboard: true }); } },
        { label: 'Skip it: I know how to fight', fn: () => { SFX.play('ui'); MENU.onboardDone(); } }] },
    ]);
  };
  /* the training is behind you (finished, left or skipped): Sixth Street, and its welcome */
  MENU.onboardDone = () => { Auth.update({ onboard: null }); MENU.lobby({ intro: true }); };

  /* -------------------------------------------------------- the lobby -- */
  MENU.lobby = (o) => {
    o = o || {};
    const acc = Auth.current(); if (!acc) return MENU.title(); if (!acc.proxy) return MENU.chooseProxy();
    scr().innerHTML = '';
    const tags = el('div', { class: 'lb-tags' });
    const chip = (k, v, id) => el('span', { class: 'lb-chip' }, el('b', id ? { id } : null, String(v)), k);
    const dock = (label, sub, fn, cls) => el('button', { class: 'lb-btn ' + (cls || ''), onclick: () => { SFX.unlock(); SFX.play('ui'); fn(); } }, el('b', null, label), el('small', null, sub));
    const ui = el('div', { class: 'scr lobby-ui' }, tags,
      el('div', { class: 'lb-top' },
        el('div', { class: 'lb-me' }, el('img', { src: portrait(acc.proxy), alt: '' }), el('div', null, el('b', null, acc.user), el('small', null, `${NAME[acc.proxy]} · Proxy of Random Play`))),
        chip('DENNY', U.fmt(TOWN.denny()), 'lbDenny'), chip('FIGHTS WON', `${acc.clears}/${acc.battles}`), chip('DIVES CLEARED', `${acc.diveClears}/${acc.dives}`), chip('CLASH WINS', `${acc.duelWins}/${acc.duels}`),
        el('span', { style: { flex: 1 } }),
        el('button', { class: 'lb-out', onclick: () => { Auth.logout(); U.store.ns = null; MENU.loadAccount(); MENU.title(); } }, 'SIGN OUT')),
      el('div', { class: 'lb-help' }, GAME.touch ? 'Tap where to go, or drag to steer · tap a sign to use it · the arrows turn the view' : 'WASD / arrows to walk · Shift to run · E to use · M to travel · Z / C or right-drag to turn the view'),
      el('div', { class: 'lb-clock', id: 'lbClock' }),
      el('div', { class: 'lb-cam' }, el('button', { title: 'Turn the view', onpointerdown: ev => { ev.preventDefault(); Lobby.turn(1); } }, '⟲'), el('button', { title: 'Turn the view', onpointerdown: ev => { ev.preventDefault(); Lobby.turn(-1); } }, '⟳')),
      el('nav', { class: 'lb-dock' },
        dock('HOLLOW DEEP DIVE', 'Into the Hollow', () => MENU.setup(), 'hdd'),
        dock('PROXY CLASH', 'Agent vs Agent', () => MENU.clash(), 'clash'),
        dock('AGENTS', 'Who is in town', () => MENU.agents()),
        dock('REQUESTS', 'Errands & stories', () => TOWN.journal()),
        dock('BATTLE LAB', 'Rules & numbers', () => MENU.lab('lobby')),
        dock('HOW TO PLAY', 'Tutorial tapes', () => MENU.howto()),
        dock('TRAVEL', 'Around New Eridu', () => MENU.travel())));
    scr().append(ui);
    GAME.toLobby({ me: acc.proxy, hub: (MENU._hub = o.hub || (o.spawn ? 'sixth' : MENU._hub) || 'sixth'), arrive: !!o.arrive, tags, onUse: lobbyUse, spawn: o.spawn, slot: slotNow() });
    clock();
    if (o.intro || !acc.seenIntro) setTimeout(() => intro(acc), 450);
  };
  /* the time of day: your clock's slot, moved on by however often you have rested on the sofa */
  const slotNow = () => (LIFE.clockSlot() + (U.store.get('slotShift', 0) || 0)) % 4;
  function clock() { const c = $('lbClock'); if (c) { const s = Lobby.slot(); c.innerHTML = ''; c.append(LIFE.SLOT_LABEL[s], el('small', null, `${Lobby.hub().name} · ${LIFE.SLOT_TIME[s]}`)); } }

  /* ------------------------------------------------------------ travel --
     New Eridu's areas (hubs.js), as the real game's Travel map: from the metro's sign, the TRAVEL button or M.
     Each says who lives there. */
  MENU.travel = () => {
    if (document.querySelector('.panel')) return;
    const cur = Lobby.hub().id;
    const box = el('div', { class: 'box travel' }, el('h2', null, 'TRAVEL'), el('p', null, 'New Eridu is a lot of places. Where to?'));
    const list = el('div', { class: 'tr-list' });
    for (const id of HUBS.order()) {
      const H = HUBS[id], here = id === cur, who = Object.keys(D.AGENTS).filter(a => HUBS.homeOf(a) === id).map(a => D.AGENTS[a].short);
      list.append(el('button', { class: 'tr-hub' + (here ? ' here' : ''), disabled: here || null, onclick: () => { SFX.play('ui'); p.remove(); MENU.lobby({ hub: id, arrive: true }); } },
        el('small', null, H.region.toUpperCase()), el('b', null, H.name), el('span', null, H.blurb || ''), who.length ? el('em', null, who.join(' · ')) : null, here ? el('i', null, 'YOU ARE HERE') : null));
    }
    box.append(list, el('div', { class: 'row' }, el('button', { class: 'btn dark small', onclick: () => p.remove() }, 'STAY HERE')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };
  const REST = ['Morning! The shutters are going up all along the street.', 'Afternoon already. The lunch crowd\'s queuing at Waterfall Soup.', 'Evening. This is when Sixth Street really wakes up.', 'Past midnight. Only the night owls are out now... and the cat.'];
  function rest() {
    const acc = Auth.current() || {}, s0 = sibOf(acc.proxy);
    U.store.set('slotShift', ((U.store.get('slotShift', 0) || 0) + 1) % 4);
    const s = slotNow(); Lobby.setSlot(s); clock();
    MENU.say([{ who: acc.proxy, name: NAME[acc.proxy], text: '(You put your feet up on the oil-drum sofa for a while...)' }, { who: s0, name: NAME[s0], text: REST[s] }]);
  }
  function lobbyUse(id, who) {
    const acc = Auth.current() || {};
    if (id === 'hdd') return MENU.setup();
    if (id === 'clash') return MENU.clash();
    if (id === 'lab') return MENU.lab('lobby');
    if (id === 'howto') return MENU.howto();
    if (id === 'records') return MENU.records();
    if (id === 'rest') return rest();
    if (id === 'travel') return MENU.travel();
    if (id.startsWith('place:')) return TOWN.usePlace(id.slice(6));
    // errands, stories and shops first (town.js); then just a word
    if (id === 'sib') { if (TOWN.talk('sib', who)) return; const s = sibOf(acc.proxy); return MENU.say([{ who: s, name: NAME[s], text: U.pick(Lobby.LINES[s]) }]); }
    if (id.startsWith('agent:')) { if (TOWN.talk(id.slice(6), who)) return; return MENU.talk(id.slice(6)); }
    if (id.startsWith('npc:') && who) { if (TOWN.talk(who.id, who)) return; return MENU.say([{ who: who.id, name: who.name, text: LIFE.lineFor(who.id) }]); }
  }
  function intro(acc) {
    if (GAME.mode !== 'lobby') return;
    const s = sibOf(acc.proxy), me = NAME[acc.proxy], sn = NAME[s];
    MENU.say([
      { who: s, name: sn, text: `Morning, ${me}. Random Play's open, the tapes are rewound, and Eous has the Hollow Deep Dive System warmed up in the back room.` },
      { who: 'eous', name: 'Eous', text: 'Ehn-ne! Ehn-nu-nu!' },
      { who: s, name: sn, text: `${Object.keys(D.AGENTS).length} Agents are out on Sixth Street, and every one of them wants a Proxy: ${(n => n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1])(Object.values(D.AGENTS).map(A => A.short))}. They get about: Waterfall Soup, the 141, Godfinger, Turbo... Go and say hello.` },
      { who: s, name: sn, text: 'When you\'re ready, sit down at the HDD. You guide them through the Hollow; they do the fighting.' },
      { who: s, name: sn, text: 'Oh, and Godfinger across the street? Two of Asha\'s cabinets run Proxy Clash. Other Proxies dial in with their own Agents and fight yours. Somebody called Mirage keeps topping the board...' },
      { who: s, name: sn, text: `The shop computer has the Battle Lab, the tutorial tapes are on the shelf, the poster board by the door keeps your records, and the sofa's there when you want to let the day go by. ${GAME.touch ? 'Tap where you want to go, or drag to steer,' : 'Walk with WASD or the arrow keys,'} and use anything with a sign over it.` },
    ], () => Auth.update({ seenIntro: true }));
  }
  /* a conversation at the bottom of the screen: a portrait, a name, a line at a time */
  /* (a line may end in choices: { label, fn }, picked by a click or its number; Escape takes the last) */
  MENU.say = (lines, done) => {
    const old = document.querySelector('.dlg'); if (old) old.remove();
    let i = 0, closed = false;
    const img = el('img', { alt: '' }), nm = el('b'), tx = el('p'), next = el('span', { class: 'dlg-next' }, '▶'), ch = el('div', { class: 'dlg-choices' });
    const box = el('div', { class: 'dlg', onpointerdown: ev => { if (ev.target.closest('.dlg-choices')) return; ev.preventDefault(); if (!lines[i].choices) step(); } }, img, el('div', null, nm, tx, ch), next);
    const choose = c => { close(); if (c && c.fn) c.fn(); };
    const show = () => {
      const L = lines[i]; img.src = portrait(L.who); nm.textContent = L.name; tx.textContent = L.text; next.textContent = i < lines.length - 1 ? '▶' : '✓';
      next.style.display = L.choices ? 'none' : ''; ch.innerHTML = '';
      if (L.choices) L.choices.forEach((c, k) => ch.append(el('button', { class: 'btn small' + (k ? ' dark' : ''), onclick: ev => { ev.stopPropagation(); choose(c); } }, `${k + 1}. ${c.label}`)));
    };
    const close = () => { if (closed) return; closed = true; box.remove(); removeEventListener('keydown', key); };
    const key = ev => {
      const L = lines[i];
      if (L.choices) { const n = parseInt(ev.key, 10); if (n >= 1 && n <= L.choices.length) { ev.preventDefault(); choose(L.choices[n - 1]); } else if (ev.key === 'Escape') { ev.preventDefault(); choose(L.choices[L.choices.length - 1]); } return; }
      if (['Enter', ' ', 'e', 'E', 'Escape'].includes(ev.key)) { ev.preventDefault(); if (ev.key === 'Escape') i = lines.length; step(); }
    };
    function step() { i++; if (i >= lines.length) { close(); if (done) done(); return; } show(); }
    addEventListener('keydown', key);
    show(); document.body.append(box);
  };
  /* talking to an Agent: a line, then her file, and the offer of the Hollow */
  MENU.talk = id => {
    const A = D.AGENTS[id];
    // one of her own lines from the real game, said out loud (Aria and Remielle, who have none yet: a line of ours)
    MENU.say([{ who: id, name: A.short, text: VOICE.line(id, ['obtain', 'select']) || U.pick(Lobby.LINES[id]) }], () => MENU.dossier(id));
  };
  MENU.dossier = id => {
    const A = D.AGENTS[id], inSquad = sel.squad.indexOf(id);
    const box = el('div', { class: 'box dossier' },
      el('div', { class: 'ds-head' }, el('img', { src: portrait(BT.modelFor(id, sel.look)), alt: '' }), el('div', null, el('h2', null, A.name.toUpperCase()), el('p', null, inSquad === 0 ? 'Leading your squad.' : inSquad > 0 ? `In your squad (slot ${inSquad + 1}).` : 'Not in your squad.'))),
      kitPanel(id),
      el('div', { class: 'row' },
        el('button', { class: 'btn small', onclick: () => { p.remove(); lead(id); VOICE.line(id, ['confirm']); MENU.setup(); } }, 'TAKE HER INTO THE HOLLOW'),
        el('button', { class: 'btn dark small', onclick: () => p.remove() }, 'CLOSE')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };
  function lead(id) {
    const k = sel.squad.indexOf(id);
    if (k >= 0) sel.squad.splice(k, 1); else if (sel.squad.length >= 3) sel.squad.pop();
    sel.squad.unshift(id); kitFocus = id; save();
  }
  MENU.agents = () => {
    const box = el('div', { class: 'box' }, el('h2', null, 'AGENTS ON SIXTH STREET'), el('p', null, 'Talk to them in the street, or open their files here.'),
      el('div', { class: 'cards ag-cards' }, ...Object.keys(D.AGENTS).map(id => { const ti = TOWN.agentInfo(id); return el('button', { class: 'card' + (sel.squad.includes(id) ? ' sel' : ''), onclick: () => { p.remove(); MENU.dossier(id); } },
        sel.squad.includes(id) ? el('span', { class: 'ord' }, String(sel.squad.indexOf(id) + 1)) : null, el('img', { src: portrait(BT.modelFor(id, sel.look)), alt: '' }), el('b', null, D.AGENTS[id].name), el('small', null, `${D.AGENTS[id].spec} · ${D.ATTR[D.AGENTS[id].attr].name}`),
        el('small', { class: 'trust' }, `Trust ${ti.trust} · stories ${ti.done}/${ti.of}${ti.active ? ' · on a request' : ''}`)); })),
      el('div', { class: 'row' }, el('button', { class: 'btn small', onclick: () => p.remove() }, 'CLOSE')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };
  /* the notice board: dives, clears, and the best rank on every battleground */
  MENU.records = () => {
    const acc = Auth.current() || { battles: 0, clears: 0, best: {} };
    const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const rows = [];
    for (const ar in D.ENCOUNTERS) for (const k of ['patrol', 'elite', 'boss']) {
      const b = acc.best[ar + '.' + k];
      rows.push(el('tr', null, el('td', null, ARENAS[ar].name), el('td', null, D.ENCOUNTERS[ar][k].name), el('td', { class: 'rk ' + (b ? b.rank : '') }, b ? b.rank : '—'), el('td', null, b ? fmtT(b.time) : '')));
    }
    const MODES = Object.values(D.CLASH_MODES);
    const crow = Object.values(D.RIVALS).map(R0 => {
      const c = (acc.clash || {})[R0.id];
      return el('tr', null, el('td', null, el('b', null, R0.name), el('small', null, ' ' + R0.tier)),
        ...MODES.map(m => { const x = c && c.modes && c.modes[m.id]; return el('td', { class: 'wl' }, x ? `${x.w}–${x.l}` : '—'); }),
        el('td', { class: 'rk ' + (c && c.best ? c.best : '') }, c && c.best ? c.best : '—'), el('td', null, c && c.time ? fmtT(c.time) : ''));
    });
    const box = el('div', { class: 'box records' }, el('h2', null, 'PROXY RECORDS'),
      el('p', null, `${acc.user || 'Proxy'}: ${acc.battles} fight${acc.battles === 1 ? '' : 's'} in the Hollow, ${acc.clears} won · ${acc.dives} Hollow dive${acc.dives === 1 ? '' : 's'}, ${acc.diveClears} cleared · ${acc.duels || 0} Proxy Clash${acc.duels === 1 ? '' : 'es'}, ${acc.duelWins || 0} won.`),
      el('table', null, el('tr', null, el('th', null, 'BATTLEGROUND'), el('th', null, 'ENCOUNTER'), el('th', null, 'BEST'), el('th', null, 'TIME')), ...rows),
      el('h4', null, 'PROXY CLASH'),
      el('table', { class: 'clash-rec' }, el('tr', null, el('th', null, 'RIVAL'), ...MODES.map(m => el('th', null, `${m.name} ${m.allOut ? 'ALL-OUT' : m.size > 1 ? 'TAG' : 'DUEL'}`)), el('th', null, 'BEST'), el('th', null, 'FASTEST')), ...crow),
      el('p', { class: 'hint' }, 'Won – lost against each rival in each mode.'),
      el('div', { class: 'row' }, el('button', { class: 'btn small', onclick: () => p.remove() }, 'CLOSE')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };

  /* ---------------------------------------------------------------- setup */
  MENU.setup = () => {
    scr().innerHTML = '';
    const old = document.querySelector('.dlg'); if (old) old.remove();
    if (GAME.mode !== 'menu') GAME.toMenu();
    MUSIC.play('dive');
    GAME.preview(sel.arena, sel.squad, sel.look);
    const left = el('div', { class: 'col' }), mid = el('div', { class: 'col' }), right = el('div', { class: 'col' });
    // squad
    left.append(el('h2', null, 'SQUAD', el('small', null, 'pick 3 · the first is on the field')));
    const cards = el('div', { class: 'cards' });
    for (const id in D.AGENTS) {
      const A = D.AGENTS[id], i = sel.squad.indexOf(id);
      cards.append(el('button', { class: 'card' + (i >= 0 ? ' sel' : ''), onclick: () => {
        SFX.unlock(); SFX.play('ui'); kitFocus = id;
        const k = sel.squad.indexOf(id);
        if (k >= 0) { if (sel.squad.length > 1) sel.squad.splice(k, 1); }
        else { if (sel.squad.length >= 3) sel.squad.pop(); sel.squad.push(id); VOICE.line(id, ['select']); }
        save(); MENU.setup();
      } }, i >= 0 ? el('span', { class: 'ord' }, String(i + 1)) : null, el('img', { src: portrait(BT.modelFor(id, sel.look)), alt: A.name }), el('b', null, A.name), el('small', null, `${A.spec} · ${D.ATTR[A.attr].name} · ${A.faction}`)));
    }
    left.append(cards, ...Object.keys(D.AGENTS).filter(id => D.AGENTS[id].forms && (sel.squad.includes(id) || id === kitFocus)).map(formPicker), kitPanel(kitFocus));
    // battleground + encounter
    mid.append(el('div', { style: { flex: 1 } }));
    right.append(el('h2', null, 'BATTLEGROUND'));
    const ar = el('div', { class: 'opts' });
    for (const id in ARENAS) ar.append(el('button', { class: 'opt' + (sel.arena === id ? ' sel' : ''), onclick: () => { SFX.play('ui'); sel.arena = id; save(); MENU.setup(); } }, el('b', null, ARENAS[id].name), el('small', null, ARENAS[id].sub)));
    right.append(ar, el('h2', null, 'ENCOUNTER'));
    const en = el('div', { class: 'opts' }), E = D.ENCOUNTERS[sel.arena];
    for (const k of ['patrol', 'elite', 'boss']) {
      const enc = E[k], ids = [...new Set(enc.waves.flat())];
      en.append(el('button', { class: 'opt' + (sel.encounter === k ? ' sel' : ''), onclick: () => { SFX.play('ui'); sel.encounter = k; save(); MENU.setup(); } },
        el('b', null, { patrol: 'PATROL · ', elite: 'ELITE · ', boss: 'NOTORIOUS · ' }[k] + enc.name), el('small', null, `${enc.waves.length} wave${enc.waves.length > 1 ? 's' : ''}: ` + ids.map(i => D.ENEMIES[i].name).join(', '))));
    }
    // or the whole Hollow: zone after zone, HP carried over, Resonia between fights, its Notorious at the end (dive.js)
    en.append(el('button', { class: 'opt dive-opt' + (sel.encounter === 'dive' ? ' sel' : ''), onclick: () => { SFX.play('ui'); sel.encounter = 'dive'; save(); MENU.setup(); } },
      el('b', null, 'HOLLOW DIVE · ' + ARENAS[sel.arena].name), el('small', null, 'Five zones, then the Notorious. Pick your way through; HP carries over; a Resonium after every fight.')));
    right.append(en);
    right.append(el('div', { class: 'deploy' },
      el('button', { class: 'btn', onclick: () => { SFX.unlock(); MENU.deploy(); } }, sel.encounter === 'dive' ? 'START DIVE' : 'DEPLOY'),
      Auth.current() ? el('button', { class: 'btn dark small', onclick: () => { SFX.play('ui'); MENU.lobby({ spawn: [1.5, -11.0] }); } }, '◀ SIXTH STREET') : null,
      el('button', { class: 'btn dark small', onclick: () => MENU.lab() }, 'BATTLE LAB'),
      el('button', { class: 'btn dark small', onclick: () => MENU.keys() }, 'KEY BINDINGS'),
      el('button', { class: 'btn dark small', onclick: () => MENU.howto() }, 'HOW TO PLAY'),
      el('div', { class: 'hint' }, modeHint())));
    scr().append(el('div', { class: 'scr setup' }, left, mid, right));
  };
  /* Agents with more than one look (Aria: idol / construct) get a switch */
  function formPicker(id, redraw) {
    const A = D.AGENTS[id]; if (!A || !A.forms) return null;
    const cur = sel.look[id] || Object.keys(A.forms)[0];
    const row = el('div', { class: 'forms' }, el('span', null, `${A.short.toUpperCase()}'S FORM`));
    for (const k in A.forms) row.append(el('button', { class: 'opt form' + (k === cur ? ' sel' : ''), title: A.forms[k].note, onclick: () => { SFX.play('ui'); sel.look[id] = k; save(); (redraw || MENU.setup)(); } }, el('b', null, A.forms[k].name), el('small', null, A.forms[k].note)));
    return row;
  }
  function kitPanel(id) {
    const A = D.AGENTS[id]; if (!A) return el('div');
    const K = A.kit, names = [];
    const add = (lbl, d) => { if (d) names.push(el('li', null, el('b', null, lbl + ' '), d.name.replace(/^[^:]+: /, ''))); };
    add('Basic', K.basic[0]); add('Special', K.special); add('EX', K.ex); if (K.ex2) add('EX', K.ex2); if (K.exAlt) add('EX', K.exAlt);
    add('Counter', K.counter); add('Chain', K.chain); add('Ultimate', K.ult); if (K.ult2) add('Ultimate', K.ult2);
    add('Assist', K.assist); add('Follow-Up', K.followup); add('Quick', K.quick);
    if (K.hold) add('Core', K.hold); if (K.charged) add('Core', K.charged); if (K.auric) add('Core', K.auric); if (K.deadEnd) add('Core', K.deadEnd);
    for (const [lbl, k] of A.kitShow || []) add(lbl, K[k]);                 // (an Agent's own extra moves: js/agents/)
    return el('div', { class: 'kit' }, el('h3', null, A.name),
      el('div', { class: 'tags' }, el('span', null, A.rank + '-Rank'), el('span', { style: { color: D.ATTR[A.attr].color } }, D.ATTR[A.attr].name), el('span', null, A.spec), el('span', null, A.faction), el('span', null, A.assist === 'evasive' ? 'Evasive Assist' : 'Defensive Assist')),
      el('p', null, A.blurb), el('dl', null, ...A.core.flatMap(([t, d]) => [el('dt', null, t), el('dd', null, d)])), el('ul', null, ...names));
  }

  MENU.deploy = () => {
    scr().innerHTML = '';
    if (sel.encounter === 'dive') return DIVE.start({ squad: sel.squad, arena: sel.arena, look: sel.look });
    VOICE.line(sel.squad[0], ['confirm']);
    GAME.startBattle({ squad: sel.squad.slice(), arena: sel.arena, encounter: sel.encounter, look: Object.assign({}, sel.look) });
  };

  /* ---------------------------------------------------------- Proxy Clash --
     The arcade cabinets on Sixth Street: your squad against a rival Proxy's,
     Agent against Agent. Pick yours (1 to 3: the size of the fight), the
     rival, their squad (or let them pick), and where. */
  const clashMode = () => D.CLASH_MODES[csel.mode];
  /* your squad for the fight: the size the mode asks for (an empty slot is filled with the next Agent) */
  function mySquad() { const n = clashMode().size, s = csel.squad.slice(0, n); for (const id of Object.keys(D.AGENTS)) if (s.length < n && !s.includes(id)) s.push(id); return s; }
  function rivalSquad() {
    const n = clashMode().size;
    if (csel.rsquad) { const s = csel.rsquad.slice(0, n); for (const id of CLASH.randomSquad(4)) if (s.length < n && !s.includes(id)) s.push(id); return s; }
    if (!rolled || rolled.length !== n) { rolled = CLASH.randomSquad(n); rlook = { aria: Math.random() < 0.5 ? 'idol' : 'construct' }; }
    return rolled;
  }
  MENU.clash = () => {
    scr().innerHTML = '';
    const old = document.querySelector('.dlg'); if (old) old.remove();
    if (GAME.mode !== 'menu') GAME.toMenu();
    MUSIC.play('clash_menu');
    const theirs = rivalSquad(), RV = D.RIVALS[csel.rival], acc = Auth.current() || {};
    GAME.preview(csel.arena, mySquad(), sel.look, theirs, rlook);
    const left = el('div', { class: 'col' }), mid = el('div', { class: 'col' }), right = el('div', { class: 'col' });
    // your squad: one to three Agents; the first is on the field
    const M0 = clashMode(), N = M0.size;
    left.append(el('h2', null, 'PROXY CLASH', el('small', null, 'your Agents against a rival Proxy\'s')));
    // the five modes
    const mg = el('div', { class: 'modes' });
    for (const id in D.CLASH_MODES) {
      const m = D.CLASH_MODES[id];
      mg.append(el('button', { class: 'opt mode' + (csel.mode === id ? ' sel' : '') + (m.allOut ? ' allout' : ''), title: m.sub, onclick: () => {
        SFX.play('ui'); csel.mode = id; csel.squad = csel.squad.slice(0, m.size); if (csel.rsquad) csel.rsquad = csel.rsquad.slice(0, m.size); rolled = null; saveClash(); MENU.clash();
      } }, el('b', null, m.name), el('small', null, m.title)));
    }
    left.append(mg, el('div', { class: 'hint mode-sub' }, M0.sub + (M0.allOut ? ' You lead one (you fight with her; the Switch keys change whom); the rest fight on their own. On a flash, W / Q sends a teammate to help.' : '')));
    left.append(el('h2', null, 'YOUR SQUAD', el('small', null, N === 1 ? 'pick 1' : `pick ${N} · ${M0.allOut ? 'all on the field at once' : 'the first starts on the field'}`)));
    const cards = el('div', { class: 'cards' });
    for (const id in D.AGENTS) {
      const A = D.AGENTS[id], i = csel.squad.indexOf(id);
      cards.append(el('button', { class: 'card' + (i >= 0 ? ' sel' : ''), onclick: () => {
        SFX.unlock(); SFX.play('ui'); kitFocus = id;
        const k = csel.squad.indexOf(id);
        if (k >= 0) { if (csel.squad.length > 1) csel.squad.splice(k, 1); } else { if (csel.squad.length >= N) csel.squad.pop(); csel.squad.push(id); VOICE.line(id, ['select']); }
        saveClash(); MENU.clash();
      } }, i >= 0 ? el('span', { class: 'ord' }, String(i + 1)) : null, el('img', { src: portrait(BT.modelFor(id, sel.look)), alt: A.name }), el('b', null, A.name), el('small', null, `${A.spec} · ${D.ATTR[A.attr].name}`)));
    }
    left.append(cards, ...Object.keys(D.AGENTS).filter(id => D.AGENTS[id].forms && csel.squad.includes(id)).map(id => formPicker(id, MENU.clash)));
    left.append(el('div', { class: 'kit' }, el('h3', null, 'HOW A CLASH WORKS'),
      el('p', null, 'Their Agents fight with the same kits as yours: combos, EX Specials, dodges, Perfect Dodges and Dodge Counters, Ultimates. You command yours as in the Hollow; the rival Proxy commands theirs.'),
      el('ul', null,
        el('li', null, 'Their heavy hits flash gold: swap for a Defensive Assist. An Ultimate\'s finisher flashes red: dodge it.'),
        el('li', null, 'Daze them to a Stun for Chain Attacks. Only a high-level skill\'s heavy hit (EX, counter, Chain, Ultimate, Follow-Up) staggers an Agent.'),
        el('li', null, 'Watch their Assist Points: a rival teammate can swap in and parry one of your heavy hits, then hit back.'))));
    mid.append(el('div', { style: { flex: 1 } }));
    // the rival
    right.append(el('h2', null, 'RIVAL PROXY'));
    const ro = el('div', { class: 'opts' });
    for (const id in D.RIVALS) {
      const R0 = D.RIVALS[id], c = (acc.clash || {})[id];
      ro.append(el('button', { class: 'opt rival-opt' + (csel.rival === id ? ' sel' : ''), style: { borderLeftColor: R0.color }, onclick: () => { SFX.play('ui'); csel.rival = id; saveClash(); MENU.clash(); } },
        el('b', null, `${R0.name.toUpperCase()} · ${R0.tier.toUpperCase()}`), el('small', null, (csel.rival === id ? R0.blurb : R0.line) + (c ? ` · you ${c.w} won, ${c.l} lost` : ''))));
    }
    right.append(ro, el('h2', null, 'THEIR SQUAD', el('small', null, csel.rsquad ? 'your pick' : `${RV.name} picks`)));
    const rc = el('div', { class: 'cards mini' });
    for (const id in D.AGENTS) {
      const k = theirs.indexOf(id);
      rc.append(el('button', { class: 'card' + (k >= 0 ? ' sel rv' : ''), title: D.AGENTS[id].name, onclick: () => {
        SFX.play('ui');
        const s = (csel.rsquad || theirs).slice(), j = s.indexOf(id);
        if (j >= 0) { if (s.length > 1) s.splice(j, 1); } else { if (s.length >= N) s.pop(); s.push(id); }
        csel.rsquad = s; saveClash(); MENU.clash();
      } }, k >= 0 ? el('span', { class: 'ord' }, String(k + 1)) : null, el('img', { src: portrait(BT.modelFor(id, rlook)), alt: '' }), el('b', null, D.AGENTS[id].short)));
    }
    right.append(rc, el('div', { class: 'row tight' },
      el('button', { class: 'btn dark small', onclick: () => { SFX.play('ui'); csel.rsquad = null; rolled = null; saveClash(); MENU.clash(); } }, csel.rsquad ? 'LET THEM PICK' : 'REROLL THEIR SQUAD')));
    right.append(el('h2', null, 'BATTLEGROUND'));
    const ar = el('div', { class: 'opts across' });
    for (const id in ARENAS) ar.append(el('button', { class: 'opt' + (csel.arena === id ? ' sel' : ''), title: ARENAS[id].sub, onclick: () => { SFX.play('ui'); csel.arena = id; saveClash(); MENU.clash(); } }, el('b', null, ARENAS[id].name)));
    right.append(ar);
    right.append(el('div', { class: 'deploy' },
      el('button', { class: 'btn', onclick: () => { SFX.unlock(); MENU.clashGo(); } }, 'FIGHT'),
      Auth.current() ? el('button', { class: 'btn dark small', onclick: () => { SFX.play('ui'); MENU.lobby({ spawn: [-25.9, 5.4] }); } }, '◀ SIXTH STREET') : null,
      el('button', { class: 'btn dark small', onclick: () => MENU.lab() }, 'BATTLE LAB'),
      el('button', { class: 'btn dark small', onclick: () => MENU.keys() }, 'KEY BINDINGS'),
      el('button', { class: 'btn dark small', onclick: () => MENU.howto() }, 'HOW TO PLAY'),
      el('div', { class: 'hint' }, `${M0.name} ${M0.title} · ${mySquad().map(id => D.AGENTS[id].short).join(' / ')}${csel.squad.length < N ? ' (filled in)' : ''}  vs  ${theirs.map(id => D.AGENTS[id].short).join(' / ')} · ${BT.T.auto ? 'AUTO is ON (T toggles it in battle)' : 'AUTO is OFF: you move and command'}`)));
    scr().append(el('div', { class: 'scr setup clash' }, left, mid, right));
  };
  MENU.clashGo = () => {
    const theirs = rivalSquad().slice();
    scr().innerHTML = '';
    VOICE.line(mySquad()[0], ['confirm']);
    GAME.startBattle({ squad: mySquad(), arena: csel.arena, look: Object.assign({}, sel.look), clash: { rival: csel.rival, squad: theirs, look: Object.assign({}, rlook), mode: csel.mode } });
  };

  /* how you will fight: AUTO, Auto-attack, or yourself (and with which keys) */
  function modeHint() {
    const t = window.GAME && GAME.touch, ks = id => KEYS.short(id), mv = ['up', 'left', 'down', 'right'].map(ks).join(' ');
    if (BT.T.auto) return `AUTO is ON: your Agent fights on her own and the game gives the commands (${t ? 'the AUTO button' : ks('auto')} in battle turns it off)`;
    if (BT.T.autoAttack) return `AUTO is OFF, Auto-attack on: you move her (${t ? 'drag' : mv}) and give the commands; she attacks on her own`;
    return t ? 'AUTO is OFF: you fight. Drag to move; the buttons are Basic, Dodge, Special, Ultimate and Swap'
      : `AUTO is OFF: you fight. ${mv} move · ${ks('basic')} Basic · ${ks('dodge')} Dodge · ${ks('special')} Special · ${ks('ult')} Ultimate · ${ks('next')} Switch`;
  }

  /* ------------------------------------------------------- key bindings --
     Every battle action, with two keys (or mouse buttons) each. Click one,
     press the new key: whatever else used it at the same time lets it go.
     Saved per Proxy (keys.js). */
  MENU.keys = () => {
    const note = el('div', { class: 'note' }), grid = el('div', { class: 'binds' });
    let wait = null;
    const draw = () => {
      grid.innerHTML = '';
      grid.append(el('span'), el('small', { class: 'hd' }, 'KEY'), el('small', { class: 'hd' }, 'OR'));
      for (const a of KEYS.ACTIONS) {
        if (a.group) { grid.append(el('div', { class: 'g' }, a.group)); continue; }
        grid.append(el('label', null, a.label, a.help ? el('small', null, a.help) : null), ...[0, 1].map(slot => {
          const c = KEYS.get(a.id)[slot];
          const b = el('button', { class: 'k' + (c ? '' : ' empty'), onclick: () => listen(a, slot, b) }, c ? KEYS.label(c) : '—');
          return b;
        }));
      }
    };
    const noMenu = e => e.preventDefault();
    function stop() {
      removeEventListener('keydown', onKey, true); removeEventListener('mousedown', onMouse, true);
      setTimeout(() => removeEventListener('contextmenu', noMenu, true), 50);
      if (wait) { wait.b.classList.remove('wait'); wait.b.textContent = wait.text; }
      wait = null;
    }
    function listen(a, slot, b) {
      stop();
      wait = { a, slot, b, text: b.textContent }; b.classList.add('wait'); b.textContent = 'PRESS A KEY';
      note.textContent = `${a.label}: press a key or click a mouse button on this button. Esc cancels; Backspace or Delete clears it.`;
      addEventListener('keydown', onKey, true); addEventListener('mousedown', onMouse, true); addEventListener('contextmenu', noMenu, true);
    }
    function take(code) {
      const W = wait; stop();
      const taken = KEYS.set(W.a.id, W.slot, code), name = id => KEYS.ACTIONS.find(x => x.id === id).label;
      note.textContent = !code ? `${W.a.label}: cleared.` : taken.length ? `${KEYS.label(code)} was on ${taken.map(name).join(', ')}; now it is ${W.a.label}.` : `${W.a.label}: ${KEYS.label(code)}.`;
      draw();
    }
    function onKey(e) {
      e.preventDefault(); e.stopImmediatePropagation();
      const c = KEYS.code(e);
      if (c === 'Escape') { stop(); note.textContent = ''; return; }
      take(c === 'Backspace' || c === 'Delete' ? null : c);
    }
    function onMouse(e) {
      if (!wait) return;
      if (e.target.closest('button') !== wait.b) { stop(); note.textContent = ''; return; }   // a click anywhere else: never mind
      e.preventDefault(); e.stopImmediatePropagation(); take('Mouse' + e.button);
    }
    draw();
    const box = el('div', { class: 'box' }, el('h2', null, 'KEY BINDINGS'),
      el('p', null, 'The battle controls. The defaults are the real game\'s PC layout; each action takes two keys or mouse buttons. (On Sixth Street you walk with WASD or the arrows and use things with E.)'),
      grid, note,
      el('div', { class: 'row' },
        el('button', { class: 'btn small', onclick: () => { stop(); p.remove(); } }, 'DONE'),
        el('button', { class: 'btn dark small', onclick: () => { stop(); KEYS.reset(); note.textContent = 'Back to the defaults.'; draw(); } }, 'RESET TO DEFAULTS')));
    const p = el('div', { class: 'panel keysp' }, box); scr().append(p);
  };

  /* --------------------------------------------------------- Battle Lab */
  MENU.lab = (from) => {   // from: 'battle' | 'lobby' | (the squad screen)
    const box = el('div', { class: 'box' }, el('h2', null, 'BATTLE LAB'), el('p', null, 'Every rule and number the battles use. Changes apply right away and are saved in this browser.'));
    const grid = el('div', { class: 'tune' });
    for (const d of D.TUNING_DEFS) {
      if (d.group) { grid.append(el('div', { class: 'g' }, d.group)); continue; }
      const out = el('output', null, fmt(d, BT.T[d.key]));
      let inp;
      if (d.type === 'bool') inp = el('input', { type: 'checkbox', checked: !!BT.T[d.key], onchange: e => { BT.T[d.key] = e.target.checked; out.textContent = fmt(d, BT.T[d.key]); applied(d.key); } });
      else inp = el('input', { type: 'range', min: d.min, max: d.max, step: d.step, value: BT.T[d.key], oninput: e => { BT.T[d.key] = parseFloat(e.target.value); out.textContent = fmt(d, BT.T[d.key]); applied(d.key); } });
      grid.append(el('label', null, d.label), inp, out);
      if (d.help) grid.append(el('div', { class: 'h' }, d.help));
    }
    box.append(grid, el('div', { class: 'row' },
      el('button', { class: 'btn small', onclick: () => { p.remove(); MENU.saveTuning(); if (!from) MENU.setup(); } }, 'DONE'),
      el('button', { class: 'btn dark small', onclick: () => MENU.keys() }, 'KEY BINDINGS'),
      el('button', { class: 'btn dark small', onclick: () => { Object.assign(BT.T, D.TUNING_DEFAULTS); MENU.saveTuning(); SFX.setVolume(BT.T.volume); MUSIC.setVolume(BT.T.music); VOICE.setVolume(BT.T.voice); p.remove(); MENU.lab(from); } }, 'RESET TO DEFAULTS')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };
  function fmt(d, v) { return d.type === 'bool' ? (v ? 'ON' : 'OFF') : (Math.round(v * 100) / 100) + ''; }
  function applied(key) {
    MENU.saveTuning();
    if (key === 'volume') SFX.setVolume(BT.T.volume);
    if (key === 'music') MUSIC.setVolume(BT.T.music);
    if (key === 'voice') VOICE.setVolume(BT.T.voice);
    if (key === 'auto' && BT.B) BT.B.auto = BT.T.auto;
    if (key === 'showLog' && window.HUD) HUD.applyLogPref();
  }

  /* -------------------------------------------------------- how to play */
  MENU.howto = () => {
    const B = BT.B, inFight = GAME.mode === 'battle' && B && !B.opts.tutorial, done = window.TUTORIAL && TUTORIAL.done();
    // the keys of one or more actions: every first key, then (after a /) every second one
    const keys = ids => { const at = slot => ids.map(id => KEYS.get(id)[slot]).filter(Boolean).map(c => el('kbd', null, KEYS.label(c))), a = at(0), b = at(1); return b.length ? [...a, ' / ', ...b] : a; };
    const k = (ids, what) => el('tr', null, el('td', null, ...keys([].concat(ids))), el('td', null, what));
    const box = el('div', { class: 'box' }, el('h2', null, 'HOW TO PLAY'),
      // the interactive tutorial (tutorial.js)
      el('div', { class: 'train' },
        el('div', null, el('b', null, 'TRAINING'), done ? el('em', null, '✓ DONE') : null,
          el('p', null, 'Learn by doing: a fight against a Faun where nothing happens until you do it. Thirteen short lessons, from your first steps and Basic string to Perfect Dodges, Assists, the Chain Attack and the Ultimate. About five minutes.')),
        el('button', { class: 'btn', disabled: inFight || null, onclick: () => { p.remove(); TUTORIAL.start(); } }, done ? 'TRAIN AGAIN' : 'START TRAINING')),
      inFight ? el('p', { class: 'hint' }, 'Finish or leave this fight to train.') : null,
      el('h4', null, 'Two ways to fight'),
      el('p', null, 'AUTO off (the default): you play, as in the real game. You move the Agent on the field and press every attack, dodge, Special, Ultimate and switch yourself. AUTO on: she fights on her own, as in Pallet to Pewter: she picks her skills, chains her string, spends her Energy and dodges what she sees coming, and the game gives the commands too. Switch any time with the AUTO button (or its key). In between, the Battle Lab\'s Auto-attack lets you just move her and give the commands while she attacks on her own.'),
      el('h4', null, 'Controls (AUTO off)'),
      el('table', { class: 'keys' },
        k(['up', 'left', 'down', 'right'], 'Move. On a phone: drag anywhere on the battlefield; the stick appears under your thumb.'),
        k('basic', 'Basic Attack. Tap again and again for her string; hold it for her hold move (shown under the button when she has one).'),
        k('dodge', 'Dodge the way you push (no direction: a step back). Just before a hit it is a Perfect Dodge. Keep it held after a dodge to sprint. Two dodges, then a short wait.'),
        k('special', 'Special Attack. With the Energy past the mark it is her EX Special Attack.'),
        k('ult', 'Ultimate, at MAXIMUM Decibels (Yixuan: or 120 Technique Points).'),
        k('next', 'Switch to the next Agent. On a gold flash it is a Defensive Assist; on a red one (or with no Assist Points) the incoming Agent Perfect Dodges; while yours is launched, a Quick Assist.'),
        k('prev', 'Switch to the previous Agent (the same rules).'), k(['slot1', 'slot2', 'slot3'], 'Switch to that squad slot.'),
        k('target', 'Change target (or click / tap an enemy).'), k(['chainL', 'chainR'], 'During a Chain Attack: pick who follows up, left or right.'),
        k('auto', 'AUTO on / off.'), k('tactics', 'Tactics menu (stops time). Esc always opens it.')),
      el('p', null, 'Every key is yours to change: KEY BINDINGS. On a phone every command has a button; tap an enemy to focus it, tap a squad card to swap to her.'),
      el('h4', null, 'What a button does depends on the moment'),
      el('ul', null,
        el('li', null, 'Basic right after a dodge (or while sprinting): a Dash Attack. Right after a Perfect Dodge: the Dodge Counter. Right after a Defensive Assist: the Assist Follow-Up.'),
        el('li', null, 'Special pressed again during Burnice\'s, Aria\'s or Yixuan\'s EX: her second EX. A Special cuts a Basic short once its hit lands; a Dodge cuts short anything but an Ultimate, a Chain Attack or an Assist.'),
        el('li', null, 'Held Basic: Caesar\'s Dead End (1 Assist Point), Burnice\'s Mixed Flame Blend (Nitro-Fuel), Aria\'s Perfect Pitch, Qingyi\'s Enchanted Moonlit Blossoms (75 Voltage), Yixuan\'s Auric Array (an Auric Ink Point), Remielle\'s Rainbow\'s End. Held Special: Orphie\'s Heat Charge (100 Bottled Heat), Yixuan\'s Cloud-Shaper. Caesar after a Perfect Block: Basic for Roaring Thrust, Special for Overpowered Shield Bash.'),
        el('li', null, 'The buttons light up for the moment: COUNTER, FOLLOW-UP, DASH ATTACK, EX, EX ×2, ASSIST, QUICK.')),
      el('h4', null, 'The rules (from the official game)'),
      el('ul', null,
        el('li', null, 'Hits build Daze. A full Daze bar Stuns the enemy: it cannot act and takes ×1.5 DMG. A heavy hit (combo finishers, Specials, EX, counters) on a Stunned enemy opens a Chain Attack: 1 chain on normal enemies, 2 on elites, 3 on bosses.'),
        el('li', null, 'Gold flash = a Perfect Assist chance: swap and the next Agent parries (huge Daze), then follows up. It costs Assist Points (you start with 6; each Chain Attack or Ultimate gives one back). Red flash = cannot be parried: swapping makes the next Agent Perfect Dodge it.'),
        el('li', null, 'A dodge timed right before a hit is a Perfect Dodge: time slows and the Agent answers with a Dodge Counter. Agents get 2 dodges before a short cooldown.'),
        el('li', null, 'Each Agent fills her own Decibels (some spills to the squad). At 3,000 (MAXIMUM) you can call her Ultimate.'),
        el('li', null, 'Attribute damage builds Anomalies: Physical → Assault (heavy blow, Flinch), Fire → Burn (damage over time), Ether → Corruption (extra damage on every hit), Auric Ink → its own Corruption. A second, different Anomaly on the same enemy triggers Disorder, cashing in the first one\'s remaining time.'),
        el('li', null, 'Caesar: Perfect Block / guard stance and Retaliation; Radiant Aegis shields the squad. Burnice: Heat and Nitro-Fuel; Scorched enemies take Afterburn whenever a teammate hits them. Aria: Fandom Power on the stage, charged Perfect Pitch, Abloom on enemies already suffering an Anomaly. Yixuan: Sheer DMG, Adrenaline, Technique Points, Auric Array; her ink bird flies with her.'),
        el('li', null, 'Qingyi: Electric hits build Flash Connect Voltage; at 75% her next Basic Attack is Enchanted Moonlit Blossoms, whose finish leaves Subjugation (a Stunned enemy takes more DMG). Ju Fufu: Hu Wei, her cauldron, rolls along beside whoever is fighting and attacks on its own, building Might; she swings it on its tail, rides it, drops it from the sky; with 100, it answers a teammate\'s Chain Attack with Suppressing Tiger Cauldron and the squad gets Tiger\'s Roar. Orphie: Magus is her tail (and her squad\'s captain): it whips the fire blade and fires the lasers; with 100 Bottled Heat she kneels for Heat Charge (Zeroed In: +ATK for the squad), and off the field she flashes in so Magus can fire Corrosive Flash at whatever your Agent is hitting. Remielle: she fights with her wings; her Lumiflux takes the attribute of the next Agent in the squad and leaves Lumiflux Buildup; a teammate\'s Anomaly on it Refringes and stores a Voidflare, which Rainbow\'s End and her Ultimate spend (Luminize). Swap her out with full Radiance for Phase Flow; she comes back with Flower & Feather Dance.'),
        ...Object.values(D.AGENTS).filter(A => A.howto).map(A => el('li', null, A.howto))),   // (Agents from js/agents/ explain themselves)
      el('h4', null, 'Proxy Clash: Agent against Agent'),
      el('p', null, 'At the arcade cabinets on Sixth Street, a rival Proxy dials in with a squad of their own. Their Agents use the same kits as yours, and their Proxy swaps, assists and fires Ultimates as you do. Five modes:'),
      el('ul', null,
        el('li', null, '1v1 DUEL: one Agent each. No swaps, no assists, no Chain Attacks.'),
        el('li', null, '2v2 and 3v3 TAG TEAM: one Agent per side on the field at a time, as in the Hollow. Swap, assist, Quick Assist, Chain Attack.'),
        el('li', null, '2v2 and 3v3 ALL-OUT: every Agent of both squads on the field at once. You lead one (yellow ring): you fight with her as with anyone; the Switch keys (or a squad card) switch whom you lead. The others fight on their own and fire their own Ultimates. On a flash aimed at any of yours, Switch sends a teammate dashing in to parry (gold) or pull her clear (red); when one is launched, a teammate\'s Quick Assist.')),
      el('ul', null,
        el('li', null, 'Their heavy hits flash gold: swap for a Defensive Assist and parry. The finisher of their Ultimate flashes red: dodge it, or swap and the incoming Agent Perfect Dodges. The big ones are marked on the ground.'),
        el('li', null, 'Only a high-level skill\'s heavy hit (an EX Special, Dodge Counter, Chain Attack, Ultimate, Assist Follow-Up or Quick Assist) staggers an Agent, theirs or yours. Anything else is a flinch.'),
        el('li', null, 'They dodge too: a Perfect Dodge answers with a Dodge Counter. Caesar and Yixuan Perfect Block, and while their Proxy has Assist Points a benched teammate can swap in, parry one of your heavy hits and follow up. The panel under the clock shows their squad and Assist Points; the target bar says when one of them has her Ultimate or an EX ready.'),
        el('li', null, 'Daze works both ways here. A Stunned rival is open to your Chain Attacks; and their hits Daze your Agents (the orange bar under HP): Stunned, she cannot act, takes ×1.5 DMG, and their heavy hit on her opens a rival Chain Attack. In Tag Team, swap her out (sharper rivals do the same). Both squads get the same extra HP in a clash (Battle Lab).'),
        el('li', null, 'The rivals: Patch (Rookie), Vesper (Ace) and Mirage (Legend), who signs as Phaethon. Your record against each is on the notice board.')),
      el('h4', null, 'Know your enemies'),
      el('p', null, 'Ground markings warn of area attacks: they fill up until the hit lands. A high-level skill means an EX Special, Chain Attack, Ultimate, Assist Follow-Up, Quick Assist or Dodge Counter.'),
      el('ul', null, ...Object.values(DATA.ENEMIES).map(d => el('li', null, el('b', null, d.name + ': '), d.info || ''))),
      el('div', { class: 'row' }, el('button', { class: 'btn small', onclick: () => p.remove() }, 'GOT IT')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };

  /* ---------------------------------------------------------- tactics */
  MENU.tactics = () => {
    const B = BT.B; if (!B || B.result) return;
    if ($('tactics')) return MENU.closeTactics();
    if (BT.T.tacticsFreeze) B.paused = true;
    const ag = BT.active();
    const box = el('div', { class: 'box' }, el('h2', null, BT.T.tacticsFreeze ? 'TACTICS · TIME STANDS STILL' : 'TACTICS'));
    const row = el('div', { class: 'row' });
    const act = (label, fn, dis) => row.append(el('button', { class: 'btn small' + (dis ? ' dark' : ''), disabled: dis || null, onclick: () => { MENU.closeTactics(); fn(); } }, label));
    act('RESUME', () => { });
    for (const a of B.squad) if (a !== ag) act(`${B.allOut ? 'LEAD' : 'SWAP'}: ${a.def.short.toUpperCase()}`, () => BT.cmdSwap(a), !a.alive);
    act('ULTIMATE', () => BT.cmdUlt(), !BT.ultReady(ag));
    if (!BT.isPlayer(ag)) act('CALL EX', () => BT.cmdEx(), ag.energy < ag.def.kit.ex.cost);   // (you fight: the Special key is the EX)
    act('NEXT TARGET', () => BT.cmdFocus());
    if (!B.opts.tutorial) act(B.auto ? 'AUTO: TURN OFF' : 'AUTO: TURN ON', () => { BT.setAuto(!B.auto); MENU.saveTuning(); });
    // another panel over the battle: time waits until it closes
    const over = (label, open) => el('button', { class: 'btn dark small', onclick: () => { MENU.closeTactics(); B.paused = true; open(); const chk = setInterval(() => { if (!document.querySelector('.panel')) { clearInterval(chk); if (BT.B) BT.B.paused = false; } }, 200); } }, label);
    box.append(row, el('div', { class: 'row' },
      over('BATTLE LAB', () => MENU.lab('battle')), over('KEY BINDINGS', () => MENU.keys()), over('HOW TO PLAY', () => MENU.howto()),
      el('button', { class: 'btn dark small', onclick: () => { MENU.closeTactics(); BT.retreat(); } }, 'RETREAT')));
    scr().append(el('div', { class: 'panel', id: 'tactics' }, box));
  };
  MENU.closeTactics = () => { const t = $('tactics'); if (t) t.remove(); if (BT.B && !document.querySelector('.panel')) BT.B.paused = false; };

  /* ---------------------------------------------------------- results */
  /* the rank of a fight in the Hollow: time against par, Agents lost (in a dive, not those who came in down), Perfect Dodges and Assists */
  MENU.rank = B => {
    const S = B.stats, t = B.t, win = B.result === 'win', carry = B.opts.carry || {}, downs = B.squad.filter(a => !a.alive && carry[a.id] !== 0).length;
    const par = { patrol: 70, elite: 95, boss: 150 }[B.opts.encounter];
    let score = 0; if (win) { score = 3; if (t > par) score--; if (t > par * 1.6) score--; score -= downs; if (S.perfect + S.assists >= 4) score++; }
    return !win ? 'F' : score >= 4 ? 'S' : score >= 3 ? 'A' : score >= 2 ? 'B' : 'C';
  };
  MENU.results = B => {
    if (B.rival) return clashResults(B);
    const S = B.stats, t = B.t, win = B.result === 'win', downs = B.squad.filter(a => !a.alive).length, rank = MENU.rank(B);
    if (B.result !== 'retreat' && Auth.current()) Auth.record({ arena: B.opts.arena, encounter: B.opts.encounter, win, rank, time: t });
    const tw = Auth.current() ? TOWN.afterBattle(B, rank) : null;          // Denny, trust, errand steps
    const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const row = (k, v) => [el('span', null, k), el('b', null, v)];
    const box = el('div', { class: 'box' },
      el('div', { class: 'rank ' + rank }, rank),
      el('h2', null, B.result === 'win' ? 'MISSION CLEAR' : B.result === 'retreat' ? 'RETREATED' : 'MISSION FAILED'),
      el('div', { class: 'hint' }, `${B.arena.name} · ${B.enc.name}`),
      el('div', { class: 'stats' }, ...row('Time', fmtT(t)), ...row('Damage dealt', U.fmt(S.dmg)), ...row('Biggest hit', U.fmt(S.maxHit)), ...row('Damage taken', U.fmt(S.taken)),
        ...row('Perfect Dodges', S.perfect), ...row('Perfect Assists', S.assists), ...row('Stuns / Chain Attacks', `${S.stuns} / ${S.chains}`), ...row('Anomalies / Disorders', `${S.anomalies} / ${S.disorders}`), ...row('Ultimates', S.ults), ...row('Agents down', downs)),
      tw ? el('div', { class: 'town-note' }, tw.text) : null,
      el('div', { class: 'row', style: { justifyContent: 'center' } },
        el('button', { class: 'btn', onclick: () => { MENU.deploy(); } }, 'RETRY'),
        el('button', { class: 'btn dark', onclick: () => { GAME.toMenu(); MENU.setup(); } }, 'SQUAD SELECT'),
        Auth.current() ? el('button', { class: 'btn dark', onclick: () => MENU.lobby({ spawn: [1.5, -11.0] }) }, 'SIXTH STREET') : null));
    scr().innerHTML = ''; scr().append(el('div', { class: 'scr results' }, box));
  };

  function clashResults(B) {
    const S = B.stats, RV = B.rival, RS = RV.stats, t = B.t, win = B.result === 'win', n = RV.squad.length;
    const downs = B.squad.filter(a => !a.alive).length, theirsDown = RV.squad.filter(r => !r.alive).length;
    const mode = RV.mode || D.CLASH_MODES.tag3, par = { duel: 45, tag2: 75, all2: 60, tag3: 105, all3: 75 }[mode.id] || 90;
    let score = 0;
    if (win) { score = 3; if (t > par) score--; if (t > par * 1.6) score--; score -= downs; if (S.perfect + S.assists >= 6) score++; if (RV.id === 'mirage') score++; if (RV.id === 'patch') score--; }
    const rank = !win ? 'F' : score >= 4 ? 'S' : score >= 3 ? 'A' : score >= 2 ? 'B' : 'C';
    let acc = Auth.current();
    if (B.result !== 'retreat' && acc) acc = Auth.record({ clash: true, rival: RV.id, mode: mode.id, win, rank, time: t }) || acc;
    const tw = acc ? TOWN.afterBattle(B, rank) : null;
    const c = acc && acc.clash && acc.clash[RV.id];
    const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const row = (k, v) => [el('span', null, k), el('b', null, v)];
    const box = el('div', { class: 'box' },
      el('div', { class: 'rank ' + rank }, rank),
      el('h2', null, win ? 'VICTORY' : B.result === 'retreat' ? 'RETREATED' : 'DEFEAT'),
      el('div', { class: 'hint' }, `Proxy Clash · ${mode.name} ${mode.title} vs ${RV.diff.name} (${RV.diff.tier}) · ${B.arena.name}`),
      el('p', { class: 'quote' }, `${RV.diff.name}: "${win ? RV.diff.lose : B.result === 'retreat' ? 'Leaving already?' : RV.diff.win}"`),
      el('div', { class: 'stats' }, ...row('Time', fmtT(t)), ...row('Rival Agents down', `${theirsDown} / ${n}`), ...row('Your Agents down', `${downs} / ${B.squad.length}`),
        ...row('Damage dealt / taken', `${U.fmt(S.dmg)} / ${U.fmt(S.taken)}`), ...row('Perfect Dodges (you / them)', `${S.perfect} / ${RS.perfect}`), ...row('Perfect Assists (you / them)', `${S.assists} / ${RS.assists}`),
        ...row('Stuns / Chain Attacks (you)', `${S.stuns} / ${S.chains}`), ...row('Stuns / Chain Attacks (them)', `${RS.stuns} / ${RS.chains}`), ...row('Ultimates (you / them)', `${S.ults} / ${RS.ults}`),
        ...(c ? row(`Your record vs ${RV.diff.name}`, `${c.w} won · ${c.l} lost`) : [])));
    if (tw) box.append(el('div', { class: 'town-note' }, tw.text));
    box.append(el('div', { class: 'row', style: { justifyContent: 'center' } },
      el('button', { class: 'btn', onclick: () => MENU.clashGo() }, 'REMATCH'),
      el('button', { class: 'btn dark', onclick: () => { GAME.toMenu(); MENU.clash(); } }, 'PROXY CLASH'),
      Auth.current() ? el('button', { class: 'btn dark', onclick: () => MENU.lobby({ spawn: [-25.9, 5.4] }) }, 'SIXTH STREET') : null));
    scr().innerHTML = ''; scr().append(el('div', { class: 'scr results' }, box));
  }

  window.MENU = MENU;
})();
