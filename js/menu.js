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
  let sel = U.store.get('setup', { squad: ['caesar', 'burnice', 'yixuan'], arena: 'outer', encounter: 'patrol', look: {} });
  if (!sel.squad || !sel.squad.length) sel.squad = ['caesar', 'burnice', 'yixuan'];
  if (!D.ENCOUNTERS[sel.arena]) sel.arena = 'outer';
  if (!sel.look) sel.look = {};
  let kitFocus = sel.squad[0];
  const save = () => U.store.set('setup', sel);
  MENU.saveTuning = () => U.store.set('tuning', BT.T);

  /* ---------------------------------------------------------------- title */
  MENU.title = () => {
    scr().innerHTML = '';
    GAME.preview(sel.arena, sel.squad, sel.look);
    const s = el('div', { class: 'scr title' }, el('div', { class: 'logo' },
      el('h1', null, 'ZENLESS ', el('span', null, 'VOXEL'), ' ZONE'),
      el('p', null, 'BATTLE LAB · AGENTS FIGHT · YOU COMMAND'),
      el('button', { class: 'btn', onclick: () => { SFX.unlock(); SFX.play('ui'); MENU.setup(); } }, 'START'),
      el('div', { class: 'note' }, 'An unofficial, non-commercial Zenless Zone Zero fan game. Zenless Zone Zero, its characters and enemies belong to HoYoverse / miHoYo; this project is not affiliated with or endorsed by them.')));
    scr().append(s);
  };

  /* ---------------------------------------------------------------- setup */
  MENU.setup = () => {
    scr().innerHTML = '';
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
        else { if (sel.squad.length >= 3) sel.squad.pop(); sel.squad.push(id); }
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
    right.append(en);
    right.append(el('div', { class: 'deploy' },
      el('button', { class: 'btn', onclick: () => { SFX.unlock(); MENU.deploy(); } }, 'DEPLOY'),
      el('button', { class: 'btn dark small', onclick: () => MENU.lab() }, 'BATTLE LAB'),
      el('button', { class: 'btn dark small', onclick: () => MENU.howto() }, 'HOW TO PLAY'),
      el('div', { class: 'hint' }, BT.T.auto ? 'AUTO is ON: the game moves your Agent and gives the commands (T toggles it in battle)' : `AUTO is OFF: you move the Agent (${window.GAME && GAME.touch ? 'drag on the battlefield' : 'arrow keys'}) and give the commands; she fights on her own (T toggles it)`)));
    scr().append(el('div', { class: 'scr setup' }, left, mid, right));
  };
  /* Agents with more than one look (Aria: idol / construct) get a switch */
  function formPicker(id) {
    const A = D.AGENTS[id]; if (!A || !A.forms) return null;
    const cur = sel.look[id] || Object.keys(A.forms)[0];
    const row = el('div', { class: 'forms' }, el('span', null, `${A.short.toUpperCase()}'S FORM`));
    for (const k in A.forms) row.append(el('button', { class: 'opt form' + (k === cur ? ' sel' : ''), title: A.forms[k].note, onclick: () => { SFX.play('ui'); sel.look[id] = k; save(); MENU.setup(); } }, el('b', null, A.forms[k].name), el('small', null, A.forms[k].note)));
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
    return el('div', { class: 'kit' }, el('h3', null, A.name),
      el('div', { class: 'tags' }, el('span', null, A.rank + '-Rank'), el('span', { style: { color: D.ATTR[A.attr].color } }, D.ATTR[A.attr].name), el('span', null, A.spec), el('span', null, A.faction), el('span', null, 'Defensive Assist')),
      el('p', null, A.blurb), el('dl', null, ...A.core.flatMap(([t, d]) => [el('dt', null, t), el('dd', null, d)])), el('ul', null, ...names));
  }

  MENU.deploy = () => {
    scr().innerHTML = '';
    GAME.startBattle({ squad: sel.squad.slice(), arena: sel.arena, encounter: sel.encounter, look: Object.assign({}, sel.look) });
  };

  /* --------------------------------------------------------- Battle Lab */
  MENU.lab = (fromBattle) => {
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
      el('button', { class: 'btn small', onclick: () => { p.remove(); MENU.saveTuning(); if (!fromBattle) MENU.setup(); } }, 'DONE'),
      el('button', { class: 'btn dark small', onclick: () => { Object.assign(BT.T, D.TUNING_DEFAULTS); MENU.saveTuning(); p.remove(); MENU.lab(fromBattle); } }, 'RESET TO DEFAULTS')));
    const p = el('div', { class: 'panel' }, box); scr().append(p);
  };
  function fmt(d, v) { return d.type === 'bool' ? (v ? 'ON' : 'OFF') : (Math.round(v * 100) / 100) + ''; }
  function applied(key) {
    MENU.saveTuning();
    if (key === 'volume') SFX.setVolume(BT.T.volume);
    if (key === 'auto' && BT.B) BT.B.auto = BT.T.auto;
    if (key === 'showLog' && window.HUD) HUD.applyLogPref();
  }

  /* -------------------------------------------------------- how to play */
  MENU.howto = () => {
    const k = (key, what) => el('tr', null, el('td', null, ...key.split(' ').map(x => el('kbd', null, x))), el('td', null, what));
    const box = el('div', { class: 'box' }, el('h2', null, 'HOW TO PLAY'),
      el('p', null, 'Like Pallet to Pewter: your Agents fight on their own, in real time. They pick their skills, chain their combos, spend Energy, and try to dodge what they see coming. You are the commander, and with AUTO off you also move the Agent on the field (arrow keys, or drag anywhere on a phone): she attacks whatever is in range, but goes where you take her. Turn on AUTO and the game moves her and gives the commands too.'),
      el('h4', null, 'Commands'),
      el('table', { class: 'keys' }, k('← ↑ ↓ →', 'Move the Agent on the field (AUTO off). On a phone: drag anywhere on the battlefield; the stick appears under your thumb.'), k('W', 'Swap to the next Agent. During an enemy\'s gold flash this is a Defensive Assist (parry); on a red flash, or with no Assist Points, the incoming Agent Perfect Dodges. While your Agent is launched it is a Quick Assist.'),
        k('Q', 'Swap to the previous Agent (same rules).'), k('1 2 3', 'Swap to that squad slot.'),
        k('R', 'Ultimate, when the on-field Agent\'s Decibels are at MAXIMUM (Yixuan: or 120 Technique Points for Endless Talisman Suppression).'),
        k('E', 'Call an EX Special Attack (spends Energy / Adrenaline).'), k('Tab', 'Change the focus target (or click an enemy).'),
        k('Q W', 'During a Chain Attack: pick who follows up (left / right; 1 / 2 also work).'), k('T', 'AUTO on/off: AUTO moves your Agent and gives your commands.'), k('Esc', 'Tactics menu (stops time).')),
      el('p', null, 'On a phone every command has a button; tap an enemy to focus it, tap a squad card to swap to her.'),
      el('h4', null, 'The rules (from the official game)'),
      el('ul', null,
        el('li', null, 'Hits build Daze. A full Daze bar Stuns the enemy: it cannot act and takes ×1.5 DMG. A heavy hit (combo finishers, Specials, EX, counters) on a Stunned enemy opens a Chain Attack: 1 chain on normal enemies, 2 on elites, 3 on bosses.'),
        el('li', null, 'Gold flash = a Perfect Assist chance: swap and the next Agent parries (huge Daze), then follows up. It costs Assist Points (you start with 6; each Chain Attack or Ultimate gives one back). Red flash = cannot be parried: swapping makes the next Agent Perfect Dodge it.'),
        el('li', null, 'A dodge timed right before a hit is a Perfect Dodge: time slows and the Agent answers with a Dodge Counter. Agents get 2 dodges before a short cooldown.'),
        el('li', null, 'Each Agent fills her own Decibels (some spills to the squad). At 3,000 (MAXIMUM) you can call her Ultimate.'),
        el('li', null, 'Attribute damage builds Anomalies: Physical → Assault (heavy blow, Flinch), Fire → Burn (damage over time), Ether → Corruption (extra damage on every hit), Auric Ink → its own Corruption. A second, different Anomaly on the same enemy triggers Disorder, cashing in the first one\'s remaining time.'),
        el('li', null, 'Caesar: Perfect Block / guard stance and Retaliation; Radiant Aegis shields the squad. Burnice: Heat and Nitro-Fuel; Scorched enemies take Afterburn whenever a teammate hits them. Aria: Fandom Power on the stage, charged Perfect Pitch, Abloom on enemies already suffering an Anomaly. Yixuan: Sheer DMG, Adrenaline, Technique Points, Auric Array; her ink bird flies with her.')),
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
    for (const a of B.squad) if (a !== ag) act(`SWAP: ${a.def.short.toUpperCase()}`, () => BT.cmdSwap(a), !a.alive);
    act('ULTIMATE', () => BT.cmdUlt(), !(ag.decibels >= D.RULES.decibelMax || (ag.id === 'yixuan' && ag.tp >= 120)));
    act('CALL EX', () => BT.cmdEx(), ag.energy < ag.def.kit.ex.cost);
    act('NEXT TARGET', () => BT.cmdFocus());
    act(B.auto ? 'AUTO: TURN OFF' : 'AUTO: TURN ON', () => { BT.setAuto(!B.auto); MENU.saveTuning(); });
    box.append(row, el('div', { class: 'row' },
      el('button', { class: 'btn dark small', onclick: () => { MENU.closeTactics(); B.paused = true; MENU.lab(true); const chk = setInterval(() => { if (!document.querySelector('.panel')) { clearInterval(chk); if (BT.B) BT.B.paused = false; } }, 200); } }, 'BATTLE LAB'),
      el('button', { class: 'btn dark small', onclick: () => { MENU.closeTactics(); B.paused = true; MENU.howto(); const chk = setInterval(() => { if (!document.querySelector('.panel')) { clearInterval(chk); if (BT.B) BT.B.paused = false; } }, 200); } }, 'HOW TO PLAY'),
      el('button', { class: 'btn dark small', onclick: () => { MENU.closeTactics(); BT.retreat(); } }, 'RETREAT')));
    scr().append(el('div', { class: 'panel', id: 'tactics' }, box));
  };
  MENU.closeTactics = () => { const t = $('tactics'); if (t) t.remove(); if (BT.B && !document.querySelector('.panel')) BT.B.paused = false; };

  /* ---------------------------------------------------------- results */
  MENU.results = B => {
    const S = B.stats, t = B.t, win = B.result === 'win', downs = B.squad.filter(a => !a.alive).length;
    const par = { patrol: 70, elite: 95, boss: 150 }[B.opts.encounter];
    let score = 0; if (win) { score = 3; if (t > par) score--; if (t > par * 1.6) score--; score -= downs; if (S.perfect + S.assists >= 4) score++; }
    const rank = !win ? 'F' : score >= 4 ? 'S' : score >= 3 ? 'A' : score >= 2 ? 'B' : 'C';
    const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const row = (k, v) => [el('span', null, k), el('b', null, v)];
    const box = el('div', { class: 'box' },
      el('div', { class: 'rank ' + rank }, rank),
      el('h2', null, B.result === 'win' ? 'MISSION CLEAR' : B.result === 'retreat' ? 'RETREATED' : 'MISSION FAILED'),
      el('div', { class: 'hint' }, `${B.arena.name} · ${B.enc.name}`),
      el('div', { class: 'stats' }, ...row('Time', fmtT(t)), ...row('Damage dealt', U.fmt(S.dmg)), ...row('Biggest hit', U.fmt(S.maxHit)), ...row('Damage taken', U.fmt(S.taken)),
        ...row('Perfect Dodges', S.perfect), ...row('Perfect Assists', S.assists), ...row('Stuns / Chain Attacks', `${S.stuns} / ${S.chains}`), ...row('Anomalies / Disorders', `${S.anomalies} / ${S.disorders}`), ...row('Ultimates', S.ults), ...row('Agents down', downs)),
      el('div', { class: 'row', style: { justifyContent: 'center' } },
        el('button', { class: 'btn', onclick: () => { MENU.deploy(); } }, 'RETRY'),
        el('button', { class: 'btn dark', onclick: () => { GAME.toMenu(); MENU.setup(); } }, 'SQUAD SELECT')));
    scr().innerHTML = ''; scr().append(el('div', { class: 'scr results' }, box));
  };

  window.MENU = MENU;
})();
