/* ============================================================================
   street-life.js -- who is out on Sixth Street, and what they are doing.

   As in the real game the day runs in four slots: morning (6 AM), afternoon
   (12 PM), evening (6 PM), late night (12 AM). Each slot has its own street:
   - the SHOPKEEPERS keep their posts in their hours (General Chop at his range,
     Tin Master at the cafe door, Elfy at Bardic Needle, Asha at Godfinger,
     Susie at Box Galaxy, Enzo at Turbo, Howl in the newsstand, the 141 trio at
     their stall, Officer Mewmew in the back road, Bangboo 6 by the staff room);
   - the AGENTS follow routines drawn from where the game puts them (Caesar at
     Turbo and the 141, Burnice at Waterfall Soup and the newsstand, Aria at
     Godfinger and the 404, Yixuan at the newsstand and Godfinger, Qingyi at
     Turbo, Godfinger and outside Random Play late at night, Ju Fufu with General
     Chop, Orphie at the noodle counter, Remielle on her way to Random Play), and
     sometimes stop to talk with each other;
   - the REGULARS keep their hours (Luo and Phil by Turbo in the morning, Jonah
     and Roy training Howl in the evening, Mrs. Yani on her rounds, the cat's
     owner at the payphone and by the dumpster at midnight, Cookie on the 141
     truck in the afternoon, the strays by Box Galaxy, the Dazed Dude at midnight);
   - PASSERS-BY come off the metro and the ends of the street and go about
     their business (office workers by day, students at six, few at midnight).

   Each person reserves a spot, walks there by A* over a half-metre grid of the
   street (string-pulled), and does what the spot is for: eats at the counter,
   sips coffee, plays a cabinet, browses the crates, reads a magazine, phones,
   leans, looks in a window, sits on a bench. They look up when you come near,
   say something now and then (a bubble), and talk in twos and threes.

     LIFE.start(S, ctx)  LIFE.update(dt, S)  LIFE.stop()
     LIFE.people()        talkable people: { key, id, name, x, z, e, line() }
   ========================================================================== */
(function () {
  'use strict';
  const { clamp, rnd } = U, PI = Math.PI;
  const LIFE = {};
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ------------------------------------------------------- time of day -- */
  LIFE.SLOT_LABEL = ['MORNING', 'AFTERNOON', 'EVENING', 'LATE NIGHT'];
  LIFE.SLOT_TIME = ['6 AM', '12 PM', '6 PM', '12 AM'];
  LIFE.clockSlot = () => { const h = new Date().getHours(); return h >= 6 && h < 12 ? 0 : h >= 12 && h < 18 ? 1 : h >= 18 ? 2 : 3; };

  /* -------------------------------------------------------------- cast -- */
  const STAFF = [
    { id: 'chop', name: 'General Chop', at: 'soup:chop', act: 'cook', hours: [0, 1, 2, 3] },
    { id: 'tinmaster', name: 'Tin Master', at: 'cafe:tin', act: 'serve', hours: [0, 1, 2] },
    { id: 'elfy', name: 'Elfy', at: 'bardic:elfy', act: 'shopkeep', hours: [0, 1, 2, 3] },
    { id: 'asha', name: 'Asha', at: 'gf:asha', act: 'phone', hours: [1, 2, 3] },
    { id: 'susie', name: 'Susie', at: 'box:susie', act: 'shopkeep', hours: [0, 1, 2] },
    { id: 'enzo', name: 'Enzo', at: 'turbo:ramp', act: 'tinker', hours: [0, 1, 2] },
    { id: 'howl', name: 'Howl', at: 'news:howl', act: 'dog', hours: [0, 1, 2, 3] },
    { id: 'buy', name: 'Buy', at: '141:buy', act: 'bangboo', hours: [0, 1, 2, 3] },
    { id: 'ask', name: 'Ask', at: '141:ask', act: 'bangboo', hours: [0, 1, 2, 3] },
    { id: 'change', name: 'Give Change', at: '141:change', act: 'bangboo', hours: [0, 1, 2, 3] },
    { id: 'mewmew', name: 'Officer Mewmew', at: 'back:mewmew', act: 'mascot', hours: [0, 1, 2] },
    { id: 'bb6', name: 'Bangboo 6', x: -0.7, z: -10.85, face: 0, act: 'bangboo', hours: [0, 1, 2, 3] },
  ];
  /* where each Agent goes, slot by slot: "spot-prefix weight, ..." ('huddle': join a conversation) */
  const ROUTINE = {
    caesar: ['turbo:bike 45, 141:stall 20, soup:stool 15, huddle 20', 'turbo:bike 35, 141:stall 25, gf:cab 15, huddle 25', 'soup:stool 30, turbo:bike 30, rp:door 15, huddle 25', 'turbo:bike 45, soup:stool 35, rp:door 20'],
    burnice: ['141:icecream 25, metro:wait 20, news:read 20, huddle 35', 'soup:stool 30, 141:freezer 25, turbo:chat 15, huddle 30', 'soup:stool 40, news:read 20, huddle 40', 'soup:stool 35, 141:icecream 25, gf:cab 20, huddle 20'],
    aria: ['141:stall 30, bardic:window 30, huddle 40', 'gf:cab 40, soup:stool 20, huddle 40', '404:aria 70, gf:cab 15, huddle 15', '404:aria 40, gf:cab 30, bardic:wall 30'],
    yixuan: ['bardic:bench 50, news:read 30, cafe:t 20', 'news:read 30, gf:cab 25, bardic:bench 45', 'bardic:bench 60, cafe:t 20, box:statue 20', 'bardic:bench 70, metro:wait 30'],
    qingyi: ['turbo:door 40, cafe:t 30, huddle 30', 'gf:corner 35, bardic:crates 30, huddle 35', 'cafe:t 30, gf:corner 30, huddle 40', 'rp:night 70, alley:lean 30'],
    jufufu: ['soup:queue 40, soup:stool 40, huddle 20', 'soup:stool 50, gf:cab 25, huddle 25', 'soup:stool 45, soup:queue 25, huddle 30', 'soup:stool 60, news:read 40'],
    orphie: ['east:works 30, alley:lean 30, huddle 40', 'soup:stool 45, gf:wall 25, huddle 30', 'soup:stool 50, alley:lean 20, huddle 30', 'alley:lean 50, soup:stool 50'],
    remielle: ['rp:window 40, cafe:t 30, huddle 30', 'cafe:t 40, box:statue 25, huddle 35', 'rp:window 35, bardic:window 25, huddle 40', 'rp:window 50, box:bench 50'],
  };
  const REGULARS = [
    { id: 'luo', name: 'Luo', slots: { 0: 'turbo:chat1 100' } },
    { id: 'phil', name: 'Phil', slots: { 0: 'turbo:chat2 100' } },
    { id: 'jonah', name: 'Jonah', slots: { 2: 'news:read 100' } },
    { id: 'roy', name: 'Roy', slots: { 2: 'news:read2 100' } },
    { id: 'yani', name: 'Mrs. Yani', slots: { 0: 'back:dumpster 50, 141:stall 30, box:statue 20', 1: '141:stall 50, bardic:window 50' } },
    { id: 'owner', name: '???', slots: { 0: 'alley:phone 100', 3: 'back:owner 100' } },
    { id: 'dude', name: 'Dazed Dude', slots: { 3: 'gf:drunk 100' } },
    { id: 'courier', name: 'Courier', slots: { 1: 'alleyB:courier 100', 2: 'alleyB:courier 100' } },
    { id: 'raider', name: 'Hollow Raider', slots: { 2: 'alleyB:raider 100', 3: 'alleyB:raider 100' } },
  ];
  const PETS = [
    { id: 'cookie', name: 'Cookie', slots: { 0: 'box:cats', 1: '141:truck', 2: 'back:dumpster', 3: 'back:owner' } },
    { id: 'chalky', name: 'Chalky', slots: { 0: 'box:cats', 1: 'box:cats', 2: 'box:cats', 3: 'box:statue' } },
  ];
  const WALKERS = [['office_m', 'office_f', 'office_m', 'builder', 'office_f'], ['office_f', 'courier', 'student_f', 'office_m'], ['student_m', 'student_f', 'student_f', 'office_m', 'student_m'], ['dude', 'office_m']];
  const WALKER_NAMES = { office_m: 'Office Worker', office_f: 'Office Worker', builder: 'Builder', courier: 'Courier', student_f: 'Student', student_m: 'Student', dude: 'Night Owl', raider: 'Hollow Raider' };
  /* where the passers-by come from and go to */
  const ENDS = [[-56.25, -6.3], [-58.5, -2.4], [-58.5, 6.3], [21.5, -2.6], [21.5, 6.4], [-13.2, 16.6], [-8.4, -11.0]];
  /* conversations: up to three on a ring round each */
  const HUDDLES = [[-28.6, -2.3], [2.8, -2.2], [-45.6, -2.4], [-36.2, 6.0], [-4.4, 5.4], [-19.2, -2.0], [13.2, 6.0]];
  /* a few more places to be, not tied to a building */
  const EXTRA = {
    'turbo:chat1': [13.0, -2.5, PI / 2 + 0.3, 'chat'], 'turbo:chat2': [14.1, -2.3, -PI / 2 - 0.3, 'chat'],
    'bardic:bench1': [-5.6, 6.35, PI, 'sit', 0.5], 'bardic:bench2': [-4.8, 6.35, PI, 'sit', 0.5],
  };

  /* -------------------------------------------------------------- lines -- */
  const LINES = {
    chop: ['Noodles! Hot noodles! The broth\'s been on since dawn.', 'Four hands, four bowls. Nobody waits long at Waterfall Soup.', 'Sit, sit! A Proxy can\'t guide anyone on an empty stomach.'],
    tinmaster: ['Welcome to Coff Cafe. One cup a day, made properly.', 'Today\'s special is on the board. Choose with care, Proxy.', 'A good coffee steadies the hand. And the mind.'],
    elfy: ['Welcome to Bardic Needle. Every record here has been played at least once. By me.', 'Rare pressings come to those who listen.', 'The crates out front are for browsing. Gently, please.'],
    asha: ['Godfinger\'s open! The top score is still up for grabs.', 'The Proxy Clash cabinets have been busy all day. Somebody called Mirage keeps signing the board.', 'One more round. Always one more round.'],
    susie: ['Welcome to Box Galaxy! If it beeps, blinks or builds, we stock it.', 'The claw machine is completely fair. Probably.', 'New stock came in this morning. The boss says sell it before it sells itself.'],
    enzo: ['Bring me anything with an engine and I\'ll make it go faster.', 'That Bangboo of yours could use a tune-up, Proxy.', 'Grease, sparks and good music. That\'s a workshop.'],
    howl: ['*boop* Do you need anything else?', '*boop* Today\'s paper!', '*boop* Woof.'],
    buy: ['Ehn-ne! Ehn-na-nu!', 'Ehn! (It holds up the till.)'], ask: ['Ehn-nu? (It consults its clipboard.)', 'Ehn-ne-nu!'], change: ['Ehn-na! (It counts out your change.)', 'Ehn-ne!'],
    mewmew: ['Officer Mewmew, Public Security! Keep Sixth Street tidy, citizen!', 'Medals for model citizens! Ask me about a challenge!', 'Mew! Litter is a crime against cuteness.'],
    bb6: ['Ehn-nu. (Bangboo 6 is guarding the staff room.)', 'Ehn! Ehn-ne! (No customers past this point.)'],
    sage: ['Coins... HIA coins... bring them to the barrel...', 'The barrel sees all. The barrel knows all. The barrel would like a sandwich.'],
    luo: ['Morning already? I have a meeting in twenty minutes.', 'Phil, the garage isn\'t even open yet.'], phil: ['Luo, relax. Enzo opens when Enzo opens.', 'Have you seen the new exhaust on the bike out front?'],
    jonah: ['We\'re training Howl! Sit, Cyclone! ...He never sits.', 'One day Howl\'s going to fetch.'], roy: ['Cyclone, roll over! ...He just pressed the button again.', 'Jonah, he\'s a newsstand dog. Not a hero dog.'],
    yani: ['Who keeps leaving the bins open? Every morning, the same mess.', 'Young people these days. Not one of them recycles.'],
    owner: ['Have you seen Cookie? A grey tabby. Thinks she owns the street.', '...Hello? Yes. No, the cat\'s fine.'],
    dude: ['*hic* ...Which way\'s the metro?', 'I just... need to sit down... for a minute...'],
    courier: ['Delivery for... where is this address?', 'Third parcel this hour. Who orders this much?'], raider: ['The Hollows have been restless. Good for business.', 'Keep walking, Proxy.'],
    office_m: ['Another day, another commute.', 'Coffee first. Everything else after.'], office_f: ['If the metro\'s late again I\'m walking.', 'Is Coff Cafe open yet?'],
    student_m: ['Godfinger after school?', 'I\'m saving up for the new console.'], student_f: ['Did you hear the Angels of Delusion are playing the 404?', 'We should get noodles!'],
    builder: ['Road\'s closed east of here. Maintenance.', 'Mind the cones.'],
    cookie: ['Mrrp.', '(The cat ignores you.)'], chalky: ['Mew.', '(It blinks slowly at you.)'],
  };
  /* what an Agent says out loud as you pass (her full lines are for when you talk) */
  const CHATTER = {
    caesar: ['Engine sounds good today.', 'Hey, Proxy!'], burnice: ['Nitro-Fuel break!', 'Heyyy!'], aria: ['La-la-la...', 'Hi hi!'], yixuan: ['...', 'Breathe.'],
    qingyi: ['Patrol status: normal.', 'Proxy.'], jufufu: ['Noodles, noodles, noodles!', 'Hu Wei, heel!'], orphie: ['Magus, stop growling.', 'Proxy.'], remielle: ['What lovely light.', 'Good evening!'],
  };

  /* ------------------------------------------------- the street's grid --
     half-metre cells, blocked where any collider comes within a person's
     shoulder (0.32 m) of the centre; A* with a binary heap, eight ways, no
     cutting corners; then the path is pulled straight where the line is clear. */
  const CELL = 0.5, RAD = 0.32;
  function navGrid(built) {
    const b = built.bounds, x0 = b.x0, z0 = b.z0, W = Math.ceil((b.x1 - x0) / CELL), H = Math.ceil((b.z1 - z0) / CELL);
    const block = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const cx = x0 + (i + 0.5) * CELL, cz = z0 + (j + 0.5) * CELL;
      for (const [a, c, d, e] of built.col) if (cx > a - RAD && cx < d + RAD && cz > c - RAD && cz < e + RAD) { block[j * W + i] = 1; break; }
    }
    return { x0, z0, W, H, block, g: new Float32Array(W * H), from: new Int32Array(W * H), seen: new Uint32Array(W * H), shut: new Uint32Array(W * H), gen: 0, heap: new Int32Array(W * H), hf: new Float32Array(W * H) };
  }
  const cellOf = (N, x, z) => [clamp(Math.floor((x - N.x0) / CELL), 0, N.W - 1), clamp(Math.floor((z - N.z0) / CELL), 0, N.H - 1)];
  const free = (N, i, j) => i >= 0 && j >= 0 && i < N.W && j < N.H && !N.block[j * N.W + i];
  function nearestFree(N, i, j) {
    if (free(N, i, j)) return [i, j];
    for (let r = 1; r < 8; r++) for (let di = -r; di <= r; di++) for (const dj of [-r, r]) { if (free(N, i + di, j + dj)) return [i + di, j + dj]; if (free(N, i + dj, j + di)) return [i + dj, j + di]; }
    return [i, j];
  }
  function clear(N, ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / (CELL * 0.5));
    for (let k = 1; k < n; k++) { const t = k / n, [i, j] = cellOf(N, ax + (bx - ax) * t, az + (bz - az) * t); if (N.block[j * N.W + i]) return false; }
    return true;
  }
  function findPath(N, ax, az, bx, bz) {
    let [si, sj] = nearestFree(N, ...cellOf(N, ax, az)); const [ti, tj] = nearestFree(N, ...cellOf(N, bx, bz));
    const W = N.W, s = sj * W + si, t = tj * W + ti, gen = ++N.gen;
    let hn = 0; const H = N.heap, F = N.hf;
    const push = (k, f) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (F[p] <= f) break; H[i] = H[p]; F[i] = F[p]; i = p; } H[i] = k; F[i] = f; };
    const pop = () => { const top = H[0], lk = H[--hn], lf = F[hn]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && F[c + 1] < F[c]) c++; if (F[c] >= lf) break; H[i] = H[c]; F[i] = F[c]; i = c; } H[i] = lk; F[i] = lf; return top; };
    const h = k => { const i = k % W, j = (k / W) | 0, dx = Math.abs(i - ti), dz = Math.abs(j - tj); return dx + dz - 0.586 * Math.min(dx, dz); };
    N.seen[s] = gen; N.g[s] = 0; N.from[s] = -1; push(s, h(s));
    let found = false, iter = 0;
    while (hn && iter++ < 20000) {
      const k = pop(); if (N.shut[k] === gen) continue; N.shut[k] = gen;
      if (k === t) { found = true; break; }
      const i = k % W, j = (k / W) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = i + di, nj = j + dj; if (!free(N, ni, nj)) continue;
        if (di && dj && (!free(N, i + di, j) || !free(N, i, j + dj))) continue;
        const nk = nj * W + ni, ng = N.g[k] + (di && dj ? 1.414 : 1);
        if (N.shut[nk] === gen) continue;
        if (N.seen[nk] !== gen || ng < N.g[nk]) { N.seen[nk] = gen; N.g[nk] = ng; N.from[nk] = k; push(nk, ng + h(nk)); }
      }
    }
    if (!found) return [[bx, bz]];
    const cells = []; for (let k = t; k !== -1; k = N.from[k]) cells.push(k); cells.reverse();
    const pts = cells.map(k => [N.x0 + (k % W + 0.5) * CELL, N.z0 + (((k / W) | 0) + 0.5) * CELL]); pts.push([bx, bz]);
    const out = []; let a = [ax, az], i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !clear(N, a[0], a[1], pts[j][0], pts[j][1])) j--; out.push(pts[j]); a = pts[j]; i = j; }
    return out.length ? out : [[bx, bz]];
  }

  /* --------------------------------------------------- what they do there --
     a pose for every activity, moving with the clock (t) and the person (s) */
  function poseFor(act, t, s) {
    const w = Math.sin(t * 1.3 + s), q = Math.sin(t * 5 + s * 2);
    switch (act) {
      case 'eat': return { legL: [-1.45, 0, 0.1], legR: [-1.45, 0, -0.1], armL: [-1.1, 0.2, 0.2], armR: [-1.4 + (Math.sin(t * 2.2 + s) > 0.6 ? -0.9 : 0), 0.3, -0.2], torso: [0.12, 0, 0], head: [0.15 + (Math.sin(t * 2.2 + s) > 0.6 ? -0.2 : 0), 0, 0] };
      case 'drink': return { legL: [-1.45, 0, 0.1], legR: [-1.45, 0, -0.1], armL: [-0.9, 0, 0.2], armR: [Math.sin(t * 0.6 + s) > 0.7 ? -2.4 : -1.0, 0.4, -0.2], head: [0.05, w * 0.2, 0], torso: [0.05, 0, 0] };
      case 'sit': return { legL: [-1.45, 0, 0.12], legR: [-1.45, 0, -0.12], armL: [-0.6, 0, 0.25], armR: [-0.6, 0, -0.25], head: [0.05, w * 0.3, 0] };
      case 'meditate': return { legL: [-1.5, 0, 0.55], legR: [-1.5, 0, -0.55], armL: [-0.75, -0.6, 0], armR: [-0.75, 0.6, 0], head: [0.15, 0, 0], torso: [0.05, 0, 0] };
      case 'arcade': return { armL: [-1.25 + q * 0.06, -0.2, 0.15], armR: [-1.25 - q * 0.08, 0.2, -0.15], torso: [0.12, 0, 0], head: [0.1, 0, 0], legL: [-0.1, 0, 0.1], legR: [0.1, 0, -0.1] };
      case 'browse': return { armL: [-0.9, -0.2, 0.2], armR: [-1.1 + Math.max(0, Math.sin(t * 1.6 + s)) * 0.4, 0.2, -0.2], torso: [0.35, 0, 0], head: [0.3, w * 0.2, 0] };
      case 'read': return { armL: [-1.2, -0.35, 0.25], armR: [-1.2, 0.35, -0.25], head: [0.35, 0, 0], torso: [0.08, 0, 0] };
      case 'phone': return { armR: [-2.5, 0.4, -0.95], armL: [-0.15, 0, 0.3], head: [0, w * 0.4, -0.15], legR: [0.15, 0, 0] };
      case 'vend': return { armR: [-1.4 + (q > 0.8 ? 0.2 : 0), 0, -0.1], head: [0.1, 0, 0] };
      case 'look': return { armL: [0.25, 0.4, 0.1], armR: [0.25, -0.4, -0.1], head: [-0.1 + w * 0.05, w * 0.35, 0] };
      case 'lean': return { torso: [-0.12, 0, 0], armL: [-1.3, -0.75, 0.3], armR: [-1.3, 0.75, -0.3], legR: [0.25, 0, -0.1], head: [0, w * 0.4, 0] };
      case 'chat': return { armR: [-0.8 + Math.max(0, q) * 0.5, 0.3, -0.3], armL: [-0.2, 0, 0.2], head: [0, Math.sin(t * 0.7 + s) * 0.25, Math.sin(t * 2 + s) * 0.05] };
      case 'tinker': return { hipsY: -0.32, legL: [-1.2, 0, 0.25], legR: [0.2, 0, -0.1], torso: [0.45, 0, 0], armL: [-1.4, 0, 0.2], armR: [-1.6 + q * 0.2, 0, -0.2], head: [0.3, 0, 0] };
      case 'pet': return { hipsY: -0.38, legL: [-1.3, 0, 0.25], legR: [-0.2, 0, -0.1], torso: [0.5, 0, 0], armR: [-1.6 + Math.sin(t * 3) * 0.15, 0, -0.1], head: [0.4, 0, 0] };
      case 'sway': return { torso: [0.1, 0, Math.sin(t * 0.9 + s) * 0.18], head: [0.2, 0, Math.sin(t * 1.1) * 0.25], armL: [0.1, 0, 0.3], armR: [0.1, 0, -0.3] };
      case 'perform': return { armR: [-2.6 + Math.sin(t * 2) * 0.25, 0, -0.4], armL: [-0.6 + Math.sin(t * 2 + 1) * 0.4, 0, 0.7], head: [-0.15, 0, Math.sin(t * 2) * 0.1], torso: [-0.05, 0, Math.sin(t * 2) * 0.06], lift: Math.max(0, Math.sin(t * 4)) * 0.04 };
      case 'cook': return { armR: [-1.3 + Math.sin(t * 3 + s) * 0.25, Math.cos(t * 3 + s) * 0.3, -0.2], armL: [-1.1, 0.2, 0.2], torso: [0.2, 0, 0], head: [0.25, 0, 0] };
      case 'serve': return { armL: [-0.7, -0.5, 0.15], armR: [-0.7, 0.5, -0.15], head: [Math.sin(t * 0.5 + s) > 0.8 ? 0.2 : 0, 0, 0] };
      case 'shopkeep': return { armL: [-1.3, -0.75, 0.25], armR: [-1.3, 0.75, -0.25], head: [0, w * 0.3, 0] };
      case 'mascot': return { armR: [-2.7 + Math.sin(t * 6) * 0.3, 0, -0.5], armL: [-0.3, 0, 0.3], torso: [0, 0, Math.sin(t * 3) * 0.05] };
      default: return { head: [0, w * 0.3, 0] };
    }
  }
  const SEATED = { eat: 1, drink: 1, sit: 1, meditate: 1 };

  /* ------------------------------------------------------------- state -- */
  let L = null;
  LIFE.start = (S, ctx) => {
    LIFE.stop();
    const built = ctx.built;
    L = { S, ctx, built, nav: navGrid(built), spots: Object.assign({}, built.spots), taken: new Map(), people: [], slot: ctx.slot, t: 0, chatterAt: 0, sync: 0 };
    for (const k in EXTRA) { const [x, z, face, act, seat] = EXTRA[k]; L.spots[k] = { id: k, x, z, face, act, seat }; }
    if (L.spots['bardic:bench1']) { L.spots['bardic:bench1'].act = 'sit'; }
    populate();
    return L;
  };
  LIFE.stop = () => {
    if (!L) return;
    for (const p of L.people) drop(p);
    L = null;
  };
  LIFE.setSlot = slot => { if (!L || L.slot === slot) return; L.slot = slot; for (const p of L.people.slice()) drop(p); L.people.length = 0; L.taken.clear(); populate(); };

  function make(id, o) {
    const e = L.ctx.ent(id, o.x, o.z, o.face || 0); e.stance = 'casual';
    L.ctx.scene.add(e.obj); L.ctx.place(e);
    const p = Object.assign({ key: o.key || id, id, e, name: o.name || id, state: 'idle', until: 0, path: null, goal: null, perch: 0, act: o.act || 'stand', speed: rnd(1.25, 1.6), seed: rnd(0, 9), lineAt: -99, kind: o.kind }, o);
    L.people.push(p);
    return p;
  }
  function drop(p) {
    if (p.spotKey) L.taken.delete(p.spotKey);
    if (p.e.obj.parent) p.e.obj.parent.remove(p.e.obj); p.e.rig.dispose();
    if (p.pet) { if (p.pet.e.obj.parent) p.pet.e.obj.parent.remove(p.pet.e.obj); p.pet.e.rig.dispose(); }
    if (p.bub) p.bub.remove();
  }
  function populate() {
    const slot = L.slot;
    for (const st of STAFF) {
      if (!st.hours.includes(slot)) continue;
      const sp = st.at ? L.spots[st.at] : { x: st.x, z: st.z, face: st.face };
      if (!sp) continue;
      const p = make(st.id, { x: sp.x, z: sp.z, face: sp.face, name: st.name, kind: 'staff', act: st.act, state: 'post', key: 'npc:' + st.id });
      if (st.at) L.taken.set(st.at, p);
      if (st.id === 'howl' && slot === 3) p.act = 'sleep';
    }
    for (const id of Object.keys(ROUTINE)) {
      const s = choose(ROUTINE[id][slot]), sp = s && L.spots[s];
      const p = make(id, { x: sp ? sp.x : rnd(-30, 10), z: sp ? sp.z + 0.8 : -2.5, face: 0, name: DATA.AGENTS[id].short, kind: 'agent', key: 'agent:' + id });
      if (sp) arrive(p, s, true); else p.until = 0;
      if (id === 'jufufu' && MODELS.huwei) p.pet = { e: L.ctx.ent('huwei', p.x, p.z, 0), kind: 'huwei' };
      if (id === 'yixuan' && MODELS.inkbird) p.pet = { e: L.ctx.ent('inkbird', p.x, p.z, 0), kind: 'bird' };
      if (p.pet) { L.ctx.scene.add(p.pet.e.obj); p.pet.x = p.e.x; p.pet.z = p.e.z; }
    }
    for (const r of REGULARS) {
      const spec = r.slots[slot]; if (!spec) continue;
      const s = choose(spec), sp = s && L.spots[s]; if (!sp) continue;
      const p = make(r.id, { x: sp.x, z: sp.z, face: sp.face, name: r.name, kind: 'regular', key: 'npc:' + r.id, spec });
      arrive(p, s, true);
    }
    for (const a of PETS) {
      const s = a.slots[slot], sp = s && L.spots[s]; if (!sp) continue;
      const p = make(a.id, { x: sp.x + rnd(-0.3, 0.3), z: sp.z + rnd(-0.2, 0.3), face: sp.face + rnd(-0.6, 0.6), name: a.name, kind: 'cat', key: 'npc:' + a.id, state: 'post', act: sp.act === 'nap' ? 'nap' : 'sitcat', y: sp.y || 0 });
      p.e.airY = p.y;
    }
    const n = GAME.lowPower ? Math.ceil(WALKERS[slot].length * 0.6) : WALKERS[slot].length;
    for (let i = 0; i < n; i++) walker(WALKERS[slot][i], i * 3.5 + rnd(0, 2), true);
  }
  /* a passer-by: from one end of the street to another, stopping somewhere on the way, now and then */
  function walker(model, delay, initial) {
    const from = pick(ENDS); let to = pick(ENDS); while (to === from) to = pick(ENDS);
    const p = make(model, { x: initial ? rnd(-50, 15) : from[0], z: initial ? pick([-2.6, 6.2]) : from[1], name: WALKER_NAMES[model] || 'Passer-by', kind: 'walker', key: 'npc:w' + Math.floor(Math.random() * 1e6), state: 'wait', until: L.t + (delay || 0), dest: to });
    p.e.obj.visible = !(delay > 0);
    p.speed = rnd(1.15, 1.55);
  }
  /* pick from "spot-prefix weight, ..." -- a free spot under that prefix (or 'huddle') */
  function choose(spec) {
    const opts = spec.split(',').map(s => s.trim().split(/\s+/)).map(([k, w]) => [k, +w || 1]);
    let tot = 0; for (const [, w] of opts) tot += w;
    for (let tries = 0; tries < 4; tries++) {
      let r = Math.random() * tot, k = opts[0][0];
      for (const [kk, w] of opts) { r -= w; if (r <= 0) { k = kk; break; } }
      if (k === 'huddle') { const hs = huddleSlot(); if (hs) return hs; continue; }
      const free = Object.keys(L.spots).filter(id => id.startsWith(k) && !L.taken.has(id) && !L.spots[id].post);
      if (free.length) return pick(free);
    }
    return null;
  }
  function huddleSlot() {
    const order = HUDDLES.map((h, i) => i).sort(() => Math.random() - 0.5);
    // prefer one somebody is already in
    order.sort((a, b) => countIn(b) - countIn(a));
    for (const i of order) {
      if (countIn(i) >= 3) continue;
      for (let k = 0; k < 3; k++) {
        const id = `huddle:${i}:${k}`; if (L.taken.has(id)) continue;
        const [hx, hz] = HUDDLES[i], a = k * (PI * 2 / 3) + i;
        L.spots[id] = { id, x: hx + Math.sin(a) * 0.75, z: hz + Math.cos(a) * 0.75, face: a + PI, act: 'chat', huddle: i };
        return id;
      }
    }
    return null;
  }
  const countIn = i => { let n = 0; for (let k = 0; k < 3; k++) if (L.taken.has(`huddle:${i}:${k}`)) n++; return n; };
  function arrive(p, id, instant) {
    const sp = L.spots[id];
    if (p.spotKey && p.spotKey !== id) L.taken.delete(p.spotKey);
    p.spotKey = id; L.taken.set(id, p); p.goal = sp;
    if (instant) { p.e.x = sp.x; p.e.z = sp.z; p.e.face = sp.face; p.state = 'stay'; p.act = actOf(p, sp); p.perch = SEATED[p.act] ? 1 : 0; p.until = L.t + rnd(15, 50); }
    else { p.state = 'walk'; p.path = findPath(L.nav, p.e.x, p.e.z, sp.x, sp.z); }
  }
  /* an Agent on a bench: Yixuan meditates */
  const actOf = (p, sp) => (p.id === 'yixuan' && sp.act === 'sit') ? 'meditate' : (sp.act === 'stand' ? 'idle' : sp.act);

  /* -------------------------------------------------------------- frame -- */
  LIFE.update = (dt, S) => {
    if (!L) return;
    L.t += dt;
    const me = S.me, cx = L.ctx.camFocus.x, cz = L.ctx.camFocus.z;
    for (const p of L.people.slice()) {
      const e = p.e;
      if (p.state === 'gone') continue;
      if (p.kind === 'walker') stepWalker(p, dt);
      else if (p.kind === 'agent' || p.kind === 'regular') stepAgent(p, dt);
      // keep out of the player's way, and away from each other while walking
      const dx = e.x - me.x, dz = e.z - me.z, d = Math.hypot(dx, dz);
      if (p.state === 'walk' && d < 0.75 && d > 1e-3) { e.x = me.x + dx / d * 0.75; e.z = me.z + dz / d * 0.75; }
      // near the camera: draw and animate; far: hide
      const far = Math.abs(e.x - cx) > 26 || Math.abs(e.z - cz) > 18;
      e.obj.visible = !far && p.state !== 'wait';
      if (p.pet) stepPet(p, dt, far);
      if (far || p.state === 'wait') { L.ctx.place(e); continue; }
      animatePerson(p, dt, d);
      if (p.bub) bubble(p);
    }
    // talk as you pass
    chatter(me);
  };
  function stepAgent(p, dt) {
    const e = p.e;
    if (p.state === 'stay' && L.t > p.until) {
      p.state = 'rise';
    }
    if (p.state === 'rise') { p.perch = Math.max(0, p.perch - dt * 2.5); if (p.perch <= 0) { plan(p); } return; }
    if (p.state === 'idle') plan(p);
    if (p.state === 'walk') follow(p, dt);
  }
  function plan(p) {
    const spec = p.kind === 'agent' ? ROUTINE[p.id][L.slot] : (p.spec || '');
    const id = spec ? choose(spec) : null;
    if (!id) { p.state = 'stay'; p.until = L.t + rnd(6, 14); return; }
    arrive(p, id, false);
  }
  function follow(p, dt) {
    const e = p.e;
    if (!p.path || !p.path.length) return reach(p);
    const [tx, tz] = p.path[0], dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { p.path.shift(); if (!p.path.length) return reach(p); return; }
    const sp = p.speed * dt, ox = e.x, oz = e.z;
    e.x += dx / d * Math.min(sp, d); e.z += dz / d * Math.min(sp, d);
    e.face = U.turn(e.face, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
    const moved = Math.hypot(e.x - ox, e.z - oz) / Math.max(dt, 1e-4);
    p.stuck = moved < 0.2 ? (p.stuck || 0) + dt : 0;
    if (p.stuck > 1.5) { p.stuck = 0; if (p.goal) p.path = findPath(L.nav, e.x, e.z, p.goal.x, p.goal.z); else p.path = []; }
    ANIM.stride(e, moved, dt);                // the feet keep pace with the ground (anim.js)
  }
  function reach(p) {
    const e = p.e, sp = p.goal;
    if (p.kind === 'walker') { if (p.stop) { p.state = 'stay'; p.act = actOf(p, sp); p.until = L.t + rnd(8, 20); p.stop = null; return; } return gone(p); }
    p.state = 'stay'; p.act = actOf(p, sp); p.until = L.t + (p.kind === 'regular' ? rnd(30, 70) : rnd(20, 55));
    if (sp.huddle != null && Math.random() < 0.5) say(p, '...');
  }
  function stepWalker(p, dt) {
    if (p.state === 'wait') { if (L.t > p.until) { p.state = 'walk'; p.e.obj.visible = true; route(p); } return; }
    if (p.state === 'stay') { if (L.t > p.until) { if (p.spotKey) { L.taken.delete(p.spotKey); p.spotKey = null; } p.state = 'walk'; p.goal = { x: p.dest[0], z: p.dest[1] }; p.path = findPath(L.nav, p.e.x, p.e.z, p.dest[0], p.dest[1]); } return; }
    if (p.state === 'walk') follow(p, dt);
  }
  function route(p) {
    // half of them stop somewhere on the way: a window, a rack, a cabinet, the vending machine
    if (Math.random() < 0.5) {
      const ids = Object.keys(L.spots).filter(id => !L.taken.has(id) && !L.spots[id].post && ['look', 'browse', 'vend', 'read', 'arcade', 'drink', 'phone'].includes(L.spots[id].act));
      if (ids.length) { const id = pick(ids); p.spotKey = id; L.taken.set(id, p); p.goal = L.spots[id]; p.stop = true; p.path = findPath(L.nav, p.e.x, p.e.z, p.goal.x, p.goal.z); return; }
    }
    p.goal = { x: p.dest[0], z: p.dest[1] }; p.path = findPath(L.nav, p.e.x, p.e.z, p.dest[0], p.dest[1]);
  }
  function gone(p) {
    p.state = 'gone'; drop(p); L.people.splice(L.people.indexOf(p), 1);
    const pool = WALKERS[L.slot]; walker(pick(pool), rnd(4, 14));
  }
  /* Hu Wei trots after Ju Fufu; the ink bird circles over Yixuan */
  function stepPet(p, dt, far) {
    const P = p.pet, e = P.e, a = p.e;
    if (P.kind === 'bird') {
      const t = L.t; e.x = a.x + Math.cos(t * 0.8) * 1.3; e.z = a.z + Math.sin(t * 0.8) * 1.0; e.face = Math.atan2(-Math.sin(t * 0.8), Math.cos(t * 0.8)) + PI / 2;
      e.obj.position.set(e.x, 2.4 + Math.sin(t * 2) * 0.15, e.z); e.obj.rotation.y = e.face; e.obj.visible = !far;
      const R = e.rig.parts, f = Math.sin(t * 8) * 0.55; if (R.armL) R.armL.rotation.z = 0.15 + f; if (R.armR) R.armR.rotation.z = -0.15 - f;
      return;
    }
    const tx = a.x - Math.sin(a.face) * 0.9 + Math.cos(a.face) * 0.8, tz = a.z - Math.cos(a.face) * 0.9 - Math.sin(a.face) * 0.8;
    const dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz), sp = d > 0.3 ? Math.min(4, d * 2.5) : 0;
    if (sp) { P.x += dx / d * sp * dt; P.z += dz / d * sp * dt; e.face = U.turn(e.face, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt)); }
    const t = L.t, R = e.rig.parts;
    e.obj.position.set(P.x, 0.28 + Math.abs(Math.sin(t * (sp ? 8 : 3.2))) * 0.1, P.z); e.obj.rotation.y = e.face + (sp ? 0 : Math.sin(t * 0.7) * 0.3); e.obj.visible = !far;
    if (R.head) R.head.rotation.x = -Math.abs(Math.sin(t * 3.2)) * 0.25; if (R.tail) R.tail.rotation.y = Math.sin(t * 2.2) * 0.4;
  }
  function animatePerson(p, dt, dMe) {
    const e = p.e, t = L.t, S = L.S;
    const walking = p.state === 'walk' && e.anim.speed > 0.2;
    if (p.kind === 'cat') return animateCat(p, dt);
    if (p.act === 'dog' || p.act === 'sleep') return animateDog(p, dt, dMe);
    if (e.kind === 'bangboo') {
      e.anim.state = walking ? 'run' : 'idle';
      ANIM.apply(e, dt, t); L.ctx.place(e);
      const R = e.rig.parts; if (R.earL) { R.earL.rotation.z = -0.15 + Math.sin(t * 3.1 + p.seed) * 0.12; R.earR.rotation.z = 0.15 + Math.sin(t * 2.7 + p.seed) * 0.12; }
      e.body.position.y = Math.abs(Math.sin(t * 4 + p.seed)) * 0.02;
      if (dMe < 3) e.face = U.turn(e.face, Math.atan2(S.me.x - e.x, S.me.z - e.z), 1 - Math.exp(-3 * dt));
      return;
    }
    const sp = p.goal || {};
    if (walking) { e.anim.state = 'run'; p.perch = Math.max(0, p.perch - dt * 3); }
    else {
      e.anim.speed = 0;
      if (p.state === 'stay' || p.state === 'post') {
        if (SEATED[p.act]) p.perch = Math.min(1, p.perch + dt * 2); else p.perch = 0;
        if (sp.face != null && p.state === 'stay') e.face = U.turn(e.face, sp.face, 1 - Math.exp(-6 * dt));
      }
      e.anim.state = 'pose';
      const pre = poseFor(p.act, t, p.seed);
      // look up at the player when they come near (not mid-game or mid-bowl)
      const talking = p.talkT != null && t - p.talkT < 4;
      if ((dMe < 2.6 || talking) && !['arcade', 'cook', 'eat', 'browse', 'tinker', 'meditate'].includes(p.act)) {
        const want = U.wrap(Math.atan2(S.me.x - e.x, S.me.z - e.z) - e.face);
        pre.head = [pre.head ? pre.head[0] * 0.3 : 0, clamp(want, -1.1, 1.1), 0];
        if (!SEATED[p.act] && (talking || p.kind === 'staff') && Math.abs(want) > 1.0 && p.act !== 'mascot') e.face = U.turn(e.face, e.face + want, 1 - Math.exp(-3 * dt));
      }
      e.posePreset = pre;
    }
    // seated: hips onto the seat
    const seatY = sp.seat != null ? sp.seat + 0.06 - 9 * e.rig.scale : 0;
    e.airY = (p.perch || 0) * seatY + (e.posePreset && e.posePreset.lift || 0);
    e.anim.t += dt; ANIM.apply(e, dt, t); L.ctx.place(e);
  }
  function animateCat(p, dt) {
    const e = p.e, R = e.rig.parts, t = L.t;
    e.obj.position.set(e.x, p.y || 0, e.z); e.obj.rotation.y = e.face;
    if (p.act === 'nap') { R.body.rotation.z = 1.35; R.body.position.y = e.rig.rest.body.py - 0.04; if (R.head) R.head.rotation.x = 0.4; if (R.tail) R.tail.rotation.y = Math.sin(t * 0.8) * 0.25; return; }
    R.body.rotation.x = -0.5; if (R.legBL) { R.legBL.rotation.x = -1.2; R.legBR.rotation.x = -1.2; } if (R.legFL) { R.legFL.rotation.x = 0.5; R.legFR.rotation.x = 0.5; }
    if (R.head) { R.head.rotation.x = 0.45; R.head.rotation.y = Math.sin(t * 0.6 + p.seed) * 0.5; }
    if (R.tail) R.tail.rotation.y = Math.sin(t * 1.8 + p.seed) * 0.6;
  }
  function animateDog(p, dt, dMe) {
    const e = p.e, R = e.rig.parts, t = L.t, S = L.S;
    e.obj.position.set(e.x, 0, e.z); e.obj.rotation.y = e.face;
    if (p.act === 'sleep') { R.body.rotation.x = 0; R.body.position.y = e.rig.rest.body.py - 0.18; for (const n of ['legFL', 'legFR', 'legBL', 'legBR']) if (R[n]) R[n].rotation.x = n.includes('F') ? -1.4 : 1.4; if (R.head) R.head.rotation.x = 0.5; return; }
    R.body.rotation.x = -0.55; if (R.legBL) { R.legBL.rotation.x = -1.0; R.legBR.rotation.x = -1.0; } if (R.legFL) { R.legFL.rotation.x = 0.55; R.legFR.rotation.x = 0.55; }
    const look = dMe < 4 ? clamp(U.wrap(Math.atan2(S.me.x - e.x, S.me.z - e.z) - e.face), -0.9, 0.9) : Math.sin(t * 0.4) * 0.5;
    if (R.head) { R.head.rotation.x = 0.5; R.head.rotation.y += (look - R.head.rotation.y) * (1 - Math.exp(-4 * dt)); }
    if (R.tail) R.tail.rotation.y = Math.sin(t * (dMe < 4 ? 9 : 2)) * 0.5;
  }

  /* ----------------------------------------------------- bubbles, lines -- */
  function say(p, text, dur) {
    if (!L.ctx.tags) return;
    if (!p.bub) { p.bub = U.el('div', { class: 'lb-bub' }); L.ctx.tags.append(p.bub); }
    p.bub.textContent = text; p.bub.classList.toggle('dots', text === '...'); p.bub.style.display = '';
    p.bubT = L.t + (dur || Math.min(5, 1.8 + text.length * 0.05));
    bubble(p);
  }
  const _v = new THREE.Vector3();
  function bubble(p) {
    if (L.t > p.bubT || !p.e.obj.visible) { p.bub.style.display = 'none'; return; }
    const e = p.e, h = (e.rig.height || 1.8) + (e.airY || 0) + 0.3;
    _v.set(e.x, h, e.z).project(BT.world.camera);
    if (_v.z > 1) { p.bub.style.display = 'none'; return; }
    p.bub.style.display = ''; p.bub.style.transform = `translate(${((_v.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - _v.y) / 2 * innerHeight).toFixed(1)}px) translate(-50%,-100%)`;
  }
  function chatter(me) {
    if (L.t < L.chatterAt) return;
    for (const p of L.people) {
      if (!p.e.obj.visible || p.state === 'wait' || L.t - p.lineAt < 25) continue;
      const d = Math.hypot(p.e.x - me.x, p.e.z - me.z);
      if (d > 2.2) continue;
      p.lineAt = L.t;
      if (Math.random() < 0.5) { const pool = p.kind === 'agent' ? CHATTER[p.id] : LINES[p.id]; if (pool) { say(p, pick(pool)); L.chatterAt = L.t + 3.5; return; } }
    }
    // the huddles mutter among themselves
    if (Math.random() < 0.02) { const h = L.people.filter(p => p.goal && p.goal.huddle != null && p.state === 'stay' && p.e.obj.visible); if (h.length > 1) say(pick(h), '...', 2.2); }
  }
  /* who you can talk to, for the lobby's signs and taps */
  LIFE.people = () => L ? L.people.filter(p => p.state !== 'wait' && p.state !== 'gone' && p.e.obj.visible).map(p => ({ key: p.key, id: p.id, name: p.name, e: p.e, kind: p.kind, p })) : [];
  LIFE.lineFor = (id) => pick(LINES[id] || ['...']);
  LIFE.talked = key => { if (!L) return; const p = L.people.find(q => q.key === key); if (p) { p.talkT = L.t; if (p.bub) p.bub.style.display = 'none'; p.bubT = 0; } };
  LIFE.spot = id => L && L.spots[id];
  LIFE.poseFor = poseFor;
  /* a way round the street's furniture (the player's walks to a tag use it too) */
  LIFE.path = (ax, az, bx, bz) => L ? findPath(L.nav, ax, az, bx, bz) : [[bx, bz]];
  /* the player takes a free spot under a prefix (a stool, a patio chair) for a while */
  LIFE.reserve = prefix => { if (!L) return null; const ids = Object.keys(L.spots).filter(id => id.startsWith(prefix) && !L.taken.has(id) && !L.spots[id].post); if (!ids.length) return null; const id = ids.sort((a, b) => Math.hypot(L.spots[a].x - L.S.me.x, L.spots[a].z - L.S.me.z) - Math.hypot(L.spots[b].x - L.S.me.x, L.spots[b].z - L.S.me.z))[0]; L.taken.set(id, 'player'); return L.spots[id]; };
  LIFE.release = id => { if (L && L.taken.get(id) === 'player') L.taken.delete(id); };
  LIFE.agentAt = id => { if (!L) return null; const p = L.people.find(q => q.id === id && q.kind === 'agent'); return p ? p.e : null; };
  window.LIFE = LIFE;
})();
