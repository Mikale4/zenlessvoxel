/* ============================================================================
   dive.js -- a Hollow dive: one Hollow, zone after zone, and its Notorious at
   the end. Before each zone you pick the way on (a fight, an Elite, a supply
   cache, a Resonium crate, something odd in the dark); after each fight, one
   of three Resonia: buffs that last the rest of the dive. Each Agent's HP
   carries from one fight to the next (the living catch their breath: +10%),
   and a squad that goes down ends the dive.
   Denny is paid on the way out: all of it and a bonus for a cleared dive,
   half if the squad went down, what was earned if you pulled out. A meal at
   Waterfall Soup and the day's coffee last the whole dive.

     DIVE.start({ squad, arena, look })   from the squad screen (encounter: DIVE)
     DIVE.after(B) -> true                 the end of one of the dive's fights (main.js)
     DIVE.active()                         the dive under way, or null
   ========================================================================== */
(function () {
  'use strict';
  const { el, $ } = U, D = window.DATA;
  const DV = {};
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const scr = () => $('screens');
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let run = null;

  /* ------------------------------------------------------------ Resonia --
     tier 0 / 1 / 2 (B / A / S): how strong. k: the battle buff it multiplies
     (assist: Assist Points it adds); heal / revive act at once */
  const TIER = ['B', 'A', 'S'];
  const RES = [
    { id: 'edge', name: 'Sharpened Edge', k: 'dmg', v: [0.08, 0.14, 0.22], txt: 'damage' },
    { id: 'hammer', name: 'Heavy Hammer', k: 'daze', v: [0.1, 0.18, 0.28], txt: 'Daze' },
    { id: 'battery', name: 'Spare Battery', k: 'energy', v: [0.12, 0.2, 0.3], txt: 'Energy' },
    { id: 'amp', name: 'Crowd Amplifier', k: 'db', v: [0.12, 0.2, 0.32], txt: 'Decibels' },
    { id: 'catalyst', name: 'Ether Catalyst', k: 'anomaly', v: [0.12, 0.2, 0.32], txt: 'Anomaly buildup' },
    { id: 'plating', name: 'Reinforced Plating', k: 'hp', v: [0.08, 0.14, 0.22], txt: 'max HP' },
    { id: 'beacon', name: 'Signal Beacon', k: 'assist', v: [1, 1, 2] },
    { id: 'medkit', name: 'Field Medkit', heal: [0.3, 0.5, 1] },
    { id: 'wind', name: 'Second Wind', revive: [0.3, 0.5, 1] },
  ];
  const RBY = Object.fromEntries(RES.map(r => [r.id, r]));
  const pct = v => Math.round(v * 100) + '%';
  function resText(r, t) {
    if (r.heal) return r.heal[t] >= 1 ? 'Every Agent back to full HP, now' : `Every Agent recovers ${pct(r.heal[t])} HP, now`;
    if (r.revive) return `A downed Agent gets back up with ${r.revive[t] >= 1 ? 'full' : pct(r.revive[t])} HP, now`;
    if (r.k === 'assist') return `+${r.v[t]} Assist Point${r.v[t] > 1 ? 's' : ''} at the start of every fight`;
    return `+${pct(r.v[t])} ${r.txt}`;
  }
  /* n Resonia to choose from; odds: [B, A, S] */
  const ODDS = { combat: [0.6, 0.35, 0.05], elite: [0, 0.7, 0.3], cache: [0.5, 0.45, 0.05], merchant: [0.2, 0.6, 0.2] };
  function offer(n, kind) {
    const down = run.squad.some(id => run.hp[id] <= 0), hurt = run.squad.some(id => run.hp[id] < 0.8);
    const pool = shuffle(RES.filter(r => (!r.revive || down) && (!r.heal || hurt)));
    const o = ODDS[kind] || ODDS.combat;
    return pool.slice(0, n).map(r => { const x = Math.random(); return { id: r.id, t: x < o[0] ? 0 : x < o[0] + o[1] ? 1 : 2 }; });
  }
  function take(h) {
    const r = RBY[h.id];
    if (r.heal) heal(r.heal[h.t], 0);
    else if (r.revive) heal(0, r.revive[h.t]);
    else run.res.push(h);
  }
  /* the living recover f; the downed get back up with rv */
  function heal(f, rv) { for (const id of run.squad) { const h = run.hp[id]; run.hp[id] = h > 0 ? Math.min(1, h + f) : rv ? Math.min(1, rv) : 0; } }
  function buffOf() {
    const b = {};
    for (const h of run.res) { const r = RBY[h.id]; if (r.k === 'assist') b.assist = (b.assist || 0) + r.v[h.t]; else b[r.k] = (b[r.k] || 1) * (1 + r.v[h.t]); }
    if (run.fuel) for (const k in run.fuel.buff) b[k] = k === 'assist' ? (b[k] || 0) + run.fuel.buff[k] : (b[k] || 1) * run.fuel.buff[k];
    return b;
  }

  /* ------------------------------------------------------------- the way --
     five zones: the way in (a fight), two forks, a fork before the end (a
     supply cache is always one way), and the Notorious */
  const TILE = {
    combat: { name: 'COMBAT', note: 'A fight. Win it, then pick 1 of 3 Resonia.' },
    elite: { name: 'ELITE', note: 'A harder fight: rarer Resonia, and more Denny.' },
    supply: { name: 'SUPPLY CACHE', note: 'Every Agent recovers 40% HP; a downed Agent gets back up with 25%.' },
    cache: { name: 'RESONIUM CRATE', note: 'Pick 1 of 2 Resonia. No fight.' },
    event: { name: '???', note: 'Something in the dark. It might be worth a look.' },
    boss: { name: 'NOTORIOUS', note: 'The Hollow\'s Notorious. Clear it to clear the dive.' },
  };
  const ENC = { combat: 'patrol', elite: 'elite', boss: 'boss' };
  function route() {
    return [['combat'], shuffle(['combat', 'cache', 'event']).slice(0, 2), shuffle(['elite', pick(['combat', 'event'])]), shuffle(['supply', pick(['cache', 'elite', 'event'])]), ['boss']];
  }
  const PAY = { combat: 25, elite: 45, boss: 90 }, RANKX = { S: 1.5, A: 1.25, B: 1, C: 0.8, F: 0 }, CLEAR_BONUS = 60;

  /* --------------------------------------------- things in the dark (???) */
  const me = () => { const a = Auth.current(); return a && a.proxy === 'belle' ? { who: 'belle', name: 'Belle' } : { who: 'wise', name: 'Wise' }; };
  const EVENTS = [
    { id: 'bangboo', text: 'A Bangboo is wedged in a crate, beeping for help.', choices: [
      { label: 'Pull it out', fn: () => { const h = offer(1, 'cache')[0]; take(h); return `It wriggles free, beeps a thank-you, and leaves you something it was carrying: ${RBY[h.id].name} (${TIER[h.t]}): ${resText(RBY[h.id], h.t)}.`; } },
      { label: 'Leave it', fn: () => 'You leave it beeping. It sounds offended.' }] },
    { id: 'vein', text: 'An Ether vein glows in the wall. It would sell for something, but raw Ether bites.', choices: [
      { label: 'Mine it (+40 Denny, every Agent loses 15% HP)', fn: () => { run.denny += 40; for (const id of run.squad) if (run.hp[id] > 0) run.hp[id] = Math.max(0.05, run.hp[id] - 0.15); return 'The crystal comes away in your hands, still humming. (+40 Denny)'; } },
      { label: 'Leave it', fn: () => 'Better not. The squad gives it a wide berth.' }] },
    { id: 'merchant', text: 'A Bangboo has set up shop on an upturned crate. "Ehn-ne! Ehn-na-nu!" It has Resonia, for a price.', choices: [
      { label: 'Trade 30 Denny of this dive\'s pay for a Resonium', ok: () => run.denny >= 30, fn: () => { run.denny -= 30; return { pick: offer(3, 'merchant'), text: '"Ehn-na!" It spreads its wares out on the crate.' }; } },
      { label: 'No, thanks', fn: () => '"Ehn..." It goes back to polishing its stock.' }] },
    { id: 'spring', text: 'A pocket of clean air, quiet as a held breath. The Ether doesn\'t reach in here.', choices: [
      { label: 'Rest a while (every Agent recovers 25% HP)', fn: () => { heal(0.25, 0); return 'The squad sits for a minute. Nobody says anything. It helps.'; } },
      { label: 'Keep moving', fn: () => 'No time. On you go.' }] },
    { id: 'tv', text: 'A cracked TV flickers in the dark: "PICK A DOOR."', choices: [
      { label: 'The left door', fn: () => door() }, { label: 'The right door', fn: () => door() },
      { label: 'Walk past', fn: () => 'Nothing good ever came of a TV that talks.' }] },
  ];
  function door() {
    if (Math.random() < 0.55) { const h = offer(1, 'elite')[0]; take(h); return `A Resonium on a pedestal: ${RBY[h.id].name} (${TIER[h.t]}): ${resText(RBY[h.id], h.t)}.`; }
    for (const id of run.squad) if (run.hp[id] > 0) run.hp[id] = Math.max(0.05, run.hp[id] - 0.2);
    return 'A trap. Ether floods the corridor before you can back out. (Every Agent loses 20% HP.)';
  }

  /* --------------------------------------------------------------- start -- */
  DV.active = () => run;
  DV.start = o => {
    const old = document.querySelector('.dlg'); if (old) old.remove();
    run = { arena: o.arena, squad: o.squad.slice(), look: Object.assign({}, o.look), floors: route(), floor: 0, hp: {}, res: [], denny: 0, fights: [], t: 0, dmg: 0,
      fuel: window.TOWN && Auth.current() ? TOWN.takeBuff() : null, seen: [] };
    for (const id of run.squad) run.hp[id] = 1;
    VOICE.line(run.squad[0], ['confirm']);
    DV.map();
  };

  /* ------------------------------------------------------------- the map -- */
  const agentCard = id => {
    const h = run.hp[id], A = D.AGENTS[id];
    return el('div', { class: 'dv-ag' + (h <= 0 ? ' down' : '') }, el('img', { src: (window.PORTRAITS || {})[BT.modelFor(id, run.look)] || '', alt: '' }), el('b', null, A.short),
      el('div', { class: 'dv-bar' }, el('i', { style: { width: pct(Math.max(0, h)), background: h < 0.3 ? 'var(--red)' : '' } })), el('small', null, h <= 0 ? 'DOWN' : pct(h) + ' HP'));
  };
  const chip = h => el('span', { class: 'dv-chip t' + h.t, title: resText(RBY[h.id], h.t) }, el('b', null, TIER[h.t]), ' ' + RBY[h.id].name);
  DV.map = () => {
    if (!run) return;
    scr().innerHTML = '';
    if (GAME.mode !== 'menu') GAME.toMenu();
    MUSIC.play('dive');
    GAME.preview(run.arena, run.squad, run.look);
    const F = run.floors, n = run.floor, E = D.ENCOUNTERS[run.arena];
    const tile = type => el('button', { class: 'dv-tile t-' + type, onclick: () => { SFX.unlock(); SFX.play('ui'); enter(type); } },
      el('b', null, TILE[type].name), ENC[type] ? el('em', null, E[ENC[type]].name) : null, el('small', null, TILE[type].note),
      PAY[type] ? el('i', null, `+${PAY[type]} Denny or more`) : null);
    const box = el('div', { class: 'dive' },
      el('div', { class: 'dv-head' }, el('h2', null, 'HOLLOW DIVE'), el('small', null, `${ARENAS[run.arena].name} · zone ${n + 1} of ${F.length}`)),
      el('div', { class: 'dv-track' }, ...F.map((f, i) => el('i', { class: (i < n ? 'done' : i === n ? 'now' : '') + (f[0] === 'boss' ? ' boss' : ''), title: i < n ? run.seen[i] || '' : '' }, f[0] === 'boss' ? 'NOTORIOUS' : String(i + 1)))),
      el('div', { class: 'dv-squad' }, ...run.squad.map(agentCard)),
      el('h3', null, F[n].length > 1 ? 'CHOOSE THE WAY ON' : n === F.length - 1 ? 'THE END OF THE LINE' : 'THE WAY IN'),
      el('div', { class: 'dv-tiles' }, ...F[n].map(tile)),
      el('h3', null, `RESONIA${run.res.length ? ` (${run.res.length})` : ''}`),
      run.res.length ? el('div', { class: 'dv-res' }, ...run.res.map(chip)) : el('p', { class: 'hint' }, 'None yet. Win a fight to pick one: they last the whole dive.'),
      run.fuel ? el('p', { class: 'hint' }, run.fuel.note + ' For the whole dive.') : null,
      el('div', { class: 'dv-foot' }, el('span', null, 'Denny so far ', el('b', null, U.fmt(run.denny))),
        el('button', { class: 'btn dark small', onclick: () => MENU.say([{ who: me().who, name: me().name, text: `Pull out of the Hollow now? You keep the ${run.denny} Denny earned so far.`, choices: [{ label: 'Pull out', fn: () => end('out') }, { label: 'Keep going', fn: () => {} }] }]) }, 'PULL OUT')));
    scr().append(el('div', { class: 'scr dive-scr' }, box));
  };
  function next() { run.floor++; DV.map(); }
  function enter(type) {
    run.seen[run.floor] = TILE[type].name;
    if (ENC[type]) return fight(type);
    if (type === 'supply') { heal(0.4, 0.25); return say('A supply cache, still sealed. Med-kits, water, a little quiet. (Every Agent recovers 40% HP; a downed Agent gets back up.)', next); }
    if (type === 'cache') return pickScreen(offer(2, 'cache'), 'RESONIUM CRATE', 'Two Resonia in the crate. You can carry one.');
    if (type === 'event') {
      const ev = pick(EVENTS.filter(e => !run.seenEv || !run.seenEv.includes(e.id))); (run.seenEv = run.seenEv || []).push(ev.id);
      const M = me();
      MENU.say([{ who: M.who, name: 'IN THE DARK', text: ev.text, choices: ev.choices.filter(c => !c.ok || c.ok()).map(c => ({ label: c.label, fn: () => {
        const r = c.fn();
        if (r && r.pick) say(r.text, () => pickScreen(r.pick, 'BANGBOO MERCHANT', 'Pick one.'));
        else say(r, next);
      } })) }]);
    }
  }
  const say = (text, done) => { const M = me(); MENU.say([{ who: M.who, name: M.name, text }], done); };

  /* ------------------------------------------------------------ fighting -- */
  function fight(type) {
    run.type = type;
    const names = run.res.map(h => RBY[h.id].name);
    scr().innerHTML = '';
    GAME.startBattle({ squad: run.squad.slice(), arena: run.arena, encounter: ENC[type], look: Object.assign({}, run.look), dive: true,
      carry: Object.assign({}, run.hp), buff: buffOf(),
      buffNote: `Hollow dive, zone ${run.floor + 1} of ${run.floors.length}.` + (names.length ? ` Resonia: ${names.join(', ')}.` : '') + (run.fuel ? ' ' + run.fuel.note : '') });
  }
  DV.after = B => {
    if (!run || !B.opts.dive) return false;
    const win = B.result === 'win', rank = MENU.rank(B), type = run.type;
    if (B.result !== 'retreat' && Auth.current()) Auth.record({ arena: B.opts.arena, encounter: B.opts.encounter, win, rank, time: B.t });
    const tw = Auth.current() ? TOWN.afterBattle(B, rank) : null;      // errand and story steps (a dive pays at the end)
    for (const s of B.squad) run.hp[s.id] = s.alive ? Math.max(0.01, s.hp / s.hpMax) : 0;
    run.t += B.t; run.dmg += B.stats.dmg;
    if (B.result === 'retreat') return end('out'), true;
    if (!win) { run.fights.push({ name: B.enc.name, type, rank: 'F', t: B.t }); return end('down'), true; }
    const earned = Math.round(PAY[type] * RANKX[rank]); run.denny += earned;
    run.fights.push({ name: B.enc.name, type, rank, t: B.t, earned });
    if (type === 'boss') return end('clear'), true;
    heal(0.1, 0);
    pickScreen(offer(3, type), `ZONE ${run.floor + 1} CLEARED`, null, { rank, B, earned, tw });
    return true;
  };

  /* ---------------------------------------------- picking a Resonium -- */
  function pickScreen(opts, title, sub, fightInfo) {
    scr().innerHTML = '';
    const card = h => { const r = RBY[h.id]; return el('button', { class: 'dv-card t' + h.t, onclick: () => { SFX.play('ui'); take(h); next(); } },
      el('span', { class: 'dv-tier' }, TIER[h.t]), el('b', null, r.name), el('small', null, resText(r, h.t))); };
    const box = el('div', { class: 'box dv-pick' });
    if (fightInfo) {
      const { rank, B, earned, tw } = fightInfo;
      box.append(el('div', { class: 'rank ' + rank }, rank), el('h2', null, title), el('div', { class: 'hint' }, `${B.arena.name} · ${B.enc.name} · ${fmtT(B.t)} · ${U.fmt(B.stats.dmg)} damage`),
        el('div', { class: 'town-note' }, `+${earned} Denny for the dive (paid on the way out) · the squad catches its breath (+10% HP)` + (tw ? ' · ' + tw.text : '')),
        el('div', { class: 'dv-squad' }, ...run.squad.map(agentCard)));
    } else box.append(el('h2', null, title), sub ? el('div', { class: 'hint' }, sub) : null);
    box.append(el('h3', null, 'PICK A RESONIUM'), el('div', { class: 'dv-cards' }, ...opts.map(card)),
      el('div', { class: 'row', style: { justifyContent: 'center' } }, el('button', { class: 'btn dark small', onclick: () => { SFX.play('ui'); next(); } }, 'TAKE NONE')));
    scr().append(el('div', { class: 'scr results' }, box));
  }

  /* --------------------------------------------------------- the way out -- */
  function end(kind) {
    const R = run; run = null;
    const pay = kind === 'clear' ? R.denny + CLEAR_BONUS : kind === 'down' ? Math.floor(R.denny / 2) : R.denny;
    let acc = Auth.current();
    if (acc) { if (pay) TOWN.pay(pay); acc = Auth.update({ dives: (acc.dives || 0) + 1, diveClears: (acc.diveClears || 0) + (kind === 'clear' ? 1 : 0) }) || acc; }
    const row = (k, v) => [el('span', null, k), el('b', null, v)];
    const cleared = R.fights.filter(f => f.rank !== 'F').length;
    const box = el('div', { class: 'box dv-end-box' },
      el('div', { class: 'rank dv-end ' + kind }, { clear: 'CLEARED', down: 'SQUAD DOWN', out: 'PULLED OUT' }[kind]),
      el('h2', null, 'HOLLOW DIVE · ' + ARENAS[R.arena].name.toUpperCase()),
      el('div', { class: 'hint' }, kind === 'clear' ? 'The Notorious is down and the whole squad walks out.' : kind === 'down' ? 'The squad was pulled out of the Hollow. Half the dive\'s pay made it back.' : 'You brought them home early. Nobody will hold it against you.'),
      el('div', { class: 'stats' }, ...row('Zones reached', `${R.floor + 1} of ${R.floors.length}`), ...row('Fights won', cleared), ...row('Time in fights', fmtT(R.t)), ...row('Damage dealt', U.fmt(R.dmg)),
        ...R.fights.map(f => row(f.name, f.rank === 'F' ? 'lost' : `${f.rank} · ${fmtT(f.t)}`)).flat(),
        ...row('Denny earned', U.fmt(R.denny)), ...(kind === 'clear' ? row('Clear bonus', '+' + CLEAR_BONUS) : []), ...row('Denny paid', U.fmt(pay))),
      R.res.length ? el('div', { class: 'dv-res' }, ...R.res.map(chip)) : null,
      acc ? el('div', { class: 'town-note' }, `+${pay} Denny (now ${U.fmt(TOWN.denny())}) · dives: ${acc.dives || 1}, cleared: ${acc.diveClears || 0}`) : null,
      el('div', { class: 'row', style: { justifyContent: 'center' } },
        el('button', { class: 'btn', onclick: () => DV.start(R) }, 'DIVE AGAIN'),
        el('button', { class: 'btn dark', onclick: () => { GAME.toMenu(); MENU.setup(); } }, 'SQUAD SELECT'),
        acc ? el('button', { class: 'btn dark', onclick: () => MENU.lobby({ spawn: [1.5, -11.0] }) }, 'SIXTH STREET') : null));
    scr().innerHTML = ''; scr().append(el('div', { class: 'scr results' }, box));
  }

  DV.TILE = TILE; DV.RES = RES;
  window.DIVE = DV;
})();
