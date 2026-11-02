/* ============================================================================
   keys.js -- the battle controls, and your own bindings for them.

   The defaults are the real game's PC layout: WASD to move, left click for
   Basic Attack, Shift or right click to Dodge, E for Special, Q for the
   Ultimate, Space / C to switch Agents, middle click to change target. Each
   action takes two keys or mouse buttons. The KEY BINDINGS panel (menu.js)
   changes them; they are saved per Proxy, like the Battle Lab.

   A key is stored as its KeyboardEvent.code (where it sits on the keyboard,
   so WASD stays WASD on any layout), Shift / Ctrl / Alt without their side,
   and the mouse buttons as Mouse0 (left), Mouse1 (middle), Mouse2 (right).

     KEYS.of(code, chain)   the actions bound to a key (chain: the Chain
                            Attack prompt is open)
     KEYS.get(id) KEYS.set(id, slot, code) KEYS.reset() KEYS.load()
     KEYS.label(code) KEYS.short(id)   names for menus and the HUD
     KEYS.code(event)                  a keyboard or mouse event's code
   ========================================================================== */
(function () {
  'use strict';
  // ctx: when the action listens. 'fight' the battle, 'chain' the Chain Attack prompt, 'both' either
  const ACTIONS = [
    { group: 'Move' },
    { id: 'up', label: 'Move up', def: ['KeyW', 'ArrowUp'] },
    { id: 'down', label: 'Move down', def: ['KeyS', 'ArrowDown'] },
    { id: 'left', label: 'Move left', def: ['KeyA', 'ArrowLeft'] },
    { id: 'right', label: 'Move right', def: ['KeyD', 'ArrowRight'] },
    { group: 'Fight' },
    { id: 'basic', label: 'Basic Attack', help: 'Tap again and again for her string; hold for her hold move', def: ['Mouse0', 'KeyJ'] },
    { id: 'dodge', label: 'Dodge', help: 'Basic right after it is a Dash Attack; keep it held to sprint', def: ['Shift', 'Mouse2'] },
    { id: 'special', label: 'Special Attack / EX', help: 'With the Energy it is her EX Special Attack', def: ['KeyE', 'KeyK'] },
    { id: 'ult', label: 'Ultimate', help: 'At MAXIMUM Decibels', def: ['KeyQ', 'KeyL'], ctx: 'both' },
    { group: 'Squad' },
    { id: 'next', label: 'Switch to the next Agent', help: 'On a flash it is an Assist; when she is launched, a Quick Assist', def: ['Space', null] },
    { id: 'prev', label: 'Switch to the previous Agent', def: ['KeyC', null] },
    { id: 'slot1', label: 'Switch to squad slot 1', def: ['Digit1', null] },
    { id: 'slot2', label: 'Switch to squad slot 2', def: ['Digit2', null] },
    { id: 'slot3', label: 'Switch to squad slot 3', def: ['Digit3', null] },
    { id: 'target', label: 'Change target', help: 'With the mouse: the enemy under the pointer', def: ['Tab', 'Mouse1'] },
    { group: 'Chain Attack' },
    { id: 'chainL', label: 'Pick the left Agent', def: ['KeyC', 'Digit1'], ctx: 'chain' },
    { id: 'chainR', label: 'Pick the right Agent', def: ['Space', 'Digit2'], ctx: 'chain' },
    { group: 'Other' },
    { id: 'auto', label: 'AUTO on / off', def: ['KeyT', null] },
    { id: 'tactics', label: 'Tactics menu', help: 'Esc always opens it too', def: ['Escape', null], ctx: 'both' },
  ];
  const BY = {}; for (const a of ACTIONS) if (a.id) { a.ctx = a.ctx || 'fight'; BY[a.id] = a; }
  const overlap = (x, y) => x === 'both' || y === 'both' || x === y;
  const defaults = () => { const m = {}; for (const a of ACTIONS) if (a.id) m[a.id] = a.def.slice(); return m; };
  let map = defaults();

  const NAMES = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Escape: 'Esc', Space: 'Space', Tab: 'Tab', Enter: 'Enter',
    Backspace: 'Backspace', Mouse0: 'Left click', Mouse1: 'Middle click', Mouse2: 'Right click', Mouse3: 'Mouse 4', Mouse4: 'Mouse 5',
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', CapsLock: 'Caps' };
  const SHORT = { Mouse0: 'LMB', Mouse1: 'MMB', Mouse2: 'RMB', Mouse3: 'M4', Mouse4: 'M5', Space: 'SPACE', Escape: 'ESC', Tab: 'TAB' };
  const KEYS = {
    ACTIONS,
    label: c => !c ? '—' : NAMES[c] || (/^Key./.test(c) ? c.slice(3) : /^Digit./.test(c) ? c.slice(5) : /^Numpad/.test(c) ? 'Num ' + c.slice(6) : c),
    /* the first key bound to an action, short enough for a button */
    short: id => { const k = (map[id] || []).find(Boolean); return !k ? '' : SHORT[k] || KEYS.label(k).toUpperCase(); },
    get: id => (map[id] || [null, null]).slice(),
    code: e => {
      if (e.type && /^(mouse|pointer)/.test(e.type)) return 'Mouse' + e.button;
      const c = e.code || e.key || '';
      const m = /^(Shift|Control|Alt|Meta|OS)(Left|Right)?$/.exec(c);
      return m ? ({ Control: 'Ctrl', OS: 'Meta' })[m[1]] || m[1] : c;
    },
    of(code, chain) { if (!code) return []; const out = []; for (const id in map) if (map[id].includes(code) && (chain ? BY[id].ctx !== 'fight' : BY[id].ctx !== 'chain')) out.push(id); return out; },
    /* bind a key to one of an action's two slots; whatever else listened for it at the same time lets it go.
       Returns the actions it was taken from. */
    set(id, slot, code) {
      const taken = [];
      if (code) for (const o in map) {
        if (o === id || !overlap(BY[o].ctx, BY[id].ctx)) continue;
        map[o] = map[o].map(k => { if (k === code) { taken.push(o); return null; } return k; });
      }
      map[id][slot] = code || null;
      if (map[id][1 - slot] === code) map[id][1 - slot] = null;
      KEYS.save(); return taken;
    },
    reset() { map = defaults(); KEYS.save(); },
    load() {
      const s = U.store.get('keys', {}) || {};
      map = {}; for (const a of ACTIONS) if (a.id) map[a.id] = Array.isArray(s[a.id]) ? [s[a.id][0] || null, s[a.id][1] || null] : a.def.slice();
    },
    save() { U.store.set('keys', map); },
  };
  window.KEYS = KEYS;
})();
