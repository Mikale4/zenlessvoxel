/* ============================================================================
   models-agents2.js -- the second wave of playable Agents, matched to their
   official character art (as models-agents.js): Qingyi, Ju Fufu, Orphie &
   Magus (Magus is Orphie's own mechanical tail, part of her model), Remielle
   Dan; and Hu Wei, the tiger cauldron that rolls along beside Ju Fufu.
   Standard humanoid rig (models-base.js); the model faces +Z, +X is its left.
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, H = window.MB;
  const FRAME = [[-4, 2], [-3, 3], [0, 4], [3, 3], [4, 2]];

  /* ------------------------------------------------------------- Qingyi --
     Qingyi of the Criminal Investigation Special Response Team, an android:
     dark green hair with blunt bangs and a long side ponytail at her left,
     teal ribbon clips; a black top under a navy PubSec tactical vest hung
     with gear (a yellow radio, a gold badge, a red-striped strap); a navy band
     on the upper arm; black mechanical forearms with teal joint lights; navy
     shorts, black tights and boots. A black folding bo staff ringed in
     teal, crackling at both ends. */
  {
    const HAIR = 0x1d5446, HAIR2 = 0x153e34, HAIRHI = 0x2e8a70, SKIN = 0xf4dccd, EYE = 0x7c8e46;
    const BLACK = 0x17171c, BLACK2 = 0x26262d, NAVY = 0x22315a, NAVY2 = 0x1a2546, TEAL = 0x2fc8a8, TEALG = G(0x5affd8), YEL = 0xe8c43a, GOLD = 0xd9a838, RED = 0xc8302a, GREY = 0x6a6c74;
    const mechArm = (s) => g => {
      g.box(-1, 0, -1, 1, -2, 1, BLACK2);                                         // shoulder joint
      g.box(-1, -1, -1, 1, -1, 1, NAVY); g.set(s, -1, 1, 0x3a5aa0);              // navy band
      g.box(-1, -3, -1, 1, -7, 1, BLACK); g.box(-1, -4, 2, 1, -6, 2, BLACK2);     // mechanical forearm
      g.set(0, -3, 2, TEALG); g.set(s, -5, 1, TEALG); g.box(-1, -7, -1, 1, -7, 1, GREY);
      g.box(-1, -8, -1, 1, -8, 1, SKIN);                                          // fingers (fingerless glove)
    };
    MODELS.qingyi = H.humanoid({
      scale: 0.07, height: 28, width: 20,
      sockets: { weapon: ['staff', [0, 0, 14]], off: ['staff', [0, 0, -8]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, NAVY2); g.box(-3, 0, -2, 3, 0, 1, BLACK);       // shorts, belt
        g.box(-1, -1, 2, 1, 0, 2, GREY); g.set(0, 0, 3, G(0xdfe6ff));              // belt plate
        g.box(3, -2, -1, 3, 0, 1, BLACK2); g.box(-3, -2, -1, -3, -1, 0, BLACK2);   // holsters
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, BLACK);                                           // black top, bare midriff above the belt
        g.box(-1, 1, 2, 1, 1, 2, SKIN);
        g.box(-3, 3, -2, 3, 6, 1, NAVY); g.box(-3, 2, -2, 3, 2, 1, NAVY2);          // the tactical vest
        g.box(-2, 3, 2, 2, 5, 2, NAVY);
        g.box(-2, 4, 3, -1, 5, 3, YEL); g.set(-2, 5, 4, 0x2a2a30);                  // yellow radio
        g.box(1, 3, 3, 2, 4, 3, BLACK2); g.set(2, 5, 3, GOLD); g.set(1, 5, 3, G(0xffe08a)); // pouch, badge
        for (let y = 2; y <= 6; y++) g.set(-1, y, 3, (y & 1) ? RED : BLACK);       // red-striped strap
        g.box(-2, 6, -1, 2, 6, 1, BLACK); g.box(-1, 6, 2, 1, 6, 2, BLACK);         // high black collar
        g.box(-3, 2, -3, 3, 5, -3, NAVY2); g.set(0, 4, -4, G(0x5affd8));            // the vest's back, a status light
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x1a2a24, mouth: 0xc9776e });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 2]], sideTo: 2 });  // blunt bangs
        g.box(-4, 4, 4, 4, 4, 4, HAIR);                                             // the fringe cut straight across, just over the eyes
        g.box(-5, -3, -2, -5, 4, 1, HAIR); g.box(5, -3, -2, 5, 4, 1, HAIR);         // side locks to the jaw
        g.box(-4, -2, -4, 4, 1, -4, HAIR2);
        g.set(-3, 7, 1, HAIRHI); g.set(2, 7, 2, HAIRHI);
        g.box(4, 6, -1, 5, 7, 0, TEAL); g.set(5, 8, -1, TEAL); g.set(6, 9, -1, TEAL); // teal ribbon clips over the ponytail
        g.box(-5, 6, 0, -4, 7, 1, TEAL); g.set(-5, 8, 0, TEAL);
      },
      armL: mechArm(1),
      armR: mechArm(-1),
      legL(g) { H.leg(g, { pant: BLACK2, boot: BLACK, bootH: 5, sole: GREY }); g.box(-1, -1, -1, 1, 0, 1, SKIN); g.set(0, -5, 2, TEAL); },
      legR(g) { H.leg(g, { pant: BLACK2, boot: BLACK, bootH: 5, sole: GREY }); g.box(-1, -1, -1, 1, 0, 1, SKIN); g.set(0, -5, 2, TEAL); },
      extra: {
        tail: {   // the long side ponytail at her left, falling to the hip
          parent: 'head', at: [5, 6, -2], draw(g) {
            g.ell(0, 0, 0, 1.2, 1.2, 1.2, HAIR);
            for (let i = 1; i < 15; i++) g.ell(1 + Math.min(1, i / 4), -i, -Math.min(2, i / 5), i < 11 ? 1.3 : 0.9, 0.6, 1.1, i % 4 === 2 ? HAIRHI : i % 3 ? HAIR : HAIR2);
          }
        },
        staff: {  // the folding bo staff, held at its middle
          parent: 'armR', at: [0, -7, 1], draw(g) {
            for (let z = -8; z <= 14; z++) {
              const ring = z === -3 || z === 4 || z === 9;
              g.set(0, 0, z, ring ? TEAL : BLACK);
              if (ring) { g.set(1, 0, z, GREY); g.set(-1, 0, z, GREY); g.set(0, 1, z, GREY); g.set(0, -1, z, GREY); }
            }
            g.box(-1, -1, -9, 1, 1, -8, BLACK2); g.set(0, 0, -10, TEALG);
            g.box(-2, -1, 11, 2, 2, 15, GREY); g.box(-2, -1, 13, 2, 2, 13, BLACK2);   // the heavy block head at the business end
            g.set(0, 3, 13, TEALG); g.set(-3, 0, 13, TEALG); g.set(3, 0, 13, TEALG); g.set(0, 0, 16, TEALG);
          }
        },
      },
    });
  }

  /* ------------------------------------------------------------ Ju Fufu --
     Ju Fufu of Yunkui Summit: little and fierce. Golden hair, white at the
     tips, straight bangs, round tiger ears; a huge golden ponytail tied with
     a navy ribbon, sweeping up and back like a tiger's tail; green eyes. A
     grey collared shirt with long black sleeves, clawed metal gauntlets, a
     wooden temple tag on a gold cord, dark grey shorts with ragged hems, a
     black thigh strap, an orange gourd charm at the hip. */
  {
    const HAIR = 0xf2c24a, HAIR2 = 0xd8a232, TIP = 0xfff3dc, SKIN = 0xf8e2d2, EYE = 0x3fae4c;
    const SHIRT = 0x7c7e86, SHIRT2 = 0x64666e, SLEEVE = 0x1e1e24, SHORTS = 0x3a3c44, SHORTS2 = 0x2c2e34, CLAW = 0x8c8e96, CLAW2 = 0x5c5e66, WOOD = 0xb07a48, GOLD = 0xd9a838, NAVY = 0x2a3264, ORANGE = 0xf08a2a, EAR = 0x5a3a2a, PINK = 0xf6b8b8;
    const claw = s => g => {
      H.arm(g, { sleeve: SLEEVE, sleeveTo: 8, skin: SKIN, len: 7 });
      g.box(-1, -1, -1, 1, 0, 1, SHIRT);                                         // shirt over the shoulder
      for (let i = 0; i < 3; i++) { const y = -6 - i; g.ell(s * 0.5, y, 1 + i * 0.5, 1.4, 0.8, 1.2, i % 2 ? CLAW2 : CLAW); }   // stacked claw shells over the fist
      g.set(0, -9, 3, 0xe8e8ee); g.set(s, -8, 3, 0xe8e8ee); g.set(-s, -8, 3, 0xe8e8ee);  // the claw tips
    };
    MODELS.jufufu = H.humanoid({
      scale: 0.062, height: 30, width: 22,
      sockets: { weapon: ['armR', [0, -8, 3]], off: ['armL', [0, -8, 3]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, SHORTS); g.box(-3, 0, -2, 3, 0, 1, SHORTS2);
        for (const x of [-3, -1, 1, 3]) g.set(x, -3, 1, SHORTS2);                  // ragged hems
        g.box(-1, -1, 2, 1, 0, 2, 0x8a8c94);                                       // belt buckle
        g.ell(4, -2, 1, 1, 1, 1, ORANGE); g.set(4, -4, 1, ORANGE); g.set(4, 0, 1, GOLD);   // the gourd charm
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, SHIRT2); g.box(-3, 3, -2, 3, 6, 1, SHIRT);
        g.box(-2, 3, 2, 2, 4, 2, SHIRT);
        for (let y = 1; y <= 5; y++) g.set(0, y, 2, SHIRT2);                       // placket
        g.box(-2, 6, 1, -1, 6, 2, SHIRT2); g.box(1, 6, 1, 2, 6, 2, SHIRT2);         // collar points
        g.line(-1, 6, 2, 0, 3, 3, GOLD); g.line(1, 6, 2, 0, 3, 3, GOLD);           // gold cord...
        g.box(-1, 1, 3, 1, 3, 3, WOOD); g.set(0, 2, 4, 0x6a3a1a);                   // ...and the wooden temple tag
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x3a2a1a, mouth: 0xd07070, blush: 0xf8c0c0 });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-4, 2], [-3, 4], [-2, 4], [-1, 4], [0, 4], [1, 4], [2, 4], [3, 4], [4, 2]], sideTo: 2 });
        g.box(-5, -4, -2, -5, 4, 1, HAIR); g.box(5, -4, -2, 5, 4, 1, HAIR);         // long side locks, white at the ends
        g.box(-5, -6, -1, -5, -5, 1, TIP); g.box(5, -6, -1, 5, -5, 1, TIP);
        g.box(-4, -2, -4, 4, 1, -4, HAIR2);
        for (const s of [-1, 1]) {                                                 // round tiger ears
          g.ell(s * 3.5, 8.5, 0, 1.5, 1.5, 0.8, HAIR); g.set(s * 3.5, 8.5, 1, PINK); g.set(s * 4, 9.5, 0, EAR); g.set(s * 2.5, 9.5, 0, EAR);
        }
      },
      armL: claw(1),
      armR: claw(-1),
      legL(g) { H.leg(g, { pant: SKIN, boot: SLEEVE, bootH: 3, sole: 0xe8e8ee }); g.box(-1, -1, -1, 1, 0, 1, SHORTS); },
      legR(g) { H.leg(g, { pant: SKIN, boot: SLEEVE, bootH: 3, sole: 0xe8e8ee }); g.box(-1, -1, -1, 1, 0, 1, SHORTS); g.box(-1, -3, -1, 1, -3, 1, SLEEVE); g.set(0, -3, 2, 0x8a8c94); }, // thigh strap
      extra: {
        tail: {   // the great ponytail, sweeping up and back like a tiger's tail, tied in navy
          parent: 'head', at: [0, 6, -4], draw(g) {
            g.box(-2, -1, 0, 2, 1, 1, NAVY); g.set(-3, 1, 0, NAVY); g.set(3, 1, 0, NAVY); g.set(-4, 2, 0, NAVY); g.set(4, 2, 0, NAVY); // the bow
            const path = [[0, 1, -1], [0, 2, -2], [0, 3, -3], [0, 3, -4], [0, 2, -5], [0, 0, -6], [0, -2, -7], [0, -4, -7], [0, -6, -7], [0, -8, -6], [0, -10, -6], [0, -12, -5]];
            path.forEach(([x, y, z], i) => g.ell(x, y, z, i < 9 ? 2.2 : 1.6, 1.3, i < 9 ? 1.8 : 1.4, i > 9 ? TIP : i % 3 === 1 ? HAIR2 : HAIR));
          }
        },
      },
    });
  }

  /* ------------------------------------------------------ Orphie & Magus --
     Orphie Magnusson of the Obol Squad: bright orange hair, long and loose,
     pointed ears, yellow-green eyes, curled dark metal horns under a black
     beret with a silver badge. A charcoal combat jacket with grey panels and a
     yellow-lined hood, a harness with a silver ring, a row of silver
     cartridges on the left shoulder, a blue patch; black gloves with yellow
     fingers, a red cuff on the right wrist; black tights and boots.
     MAGUS is her tail: a long charcoal mechanical tail, crimson underneath,
     growing from her lower back and ending in a red mechanical dragon's head
     with a glowing lens, a fire-breathing jaw and a blade slung under it. It
     thinks and talks for itself, and it is the Obol Squad's captain. Five
     parts, mg1 (at her back) -> mg2 -> mg3 -> mg4 -> mgHead, each running back
     along -Z from its joint; anim.js curls, aims and swings it. */
  {
    const HAIR = 0xff5a1a, HAIR2 = 0xd8400e, HAIRHI = 0xff9a4a, SKIN = 0xf8dccb, EYE = 0xc8c43a;
    const JACK = 0x2e2f36, JACK2 = 0x46484f, YEL = 0xf2c230, BLACK = 0x16161a, SILVER = 0xc8ccd4, BLUE = 0x3a5a8a, RED = 0xc8202a, GREY = 0x8a8c94;
    const MDARK = 0x26272d, MPLATE = 0x3c3e46, MRED = 0xa81a22, MRED2 = 0x7a141a;
    MODELS.orphie = H.humanoid({
      scale: 0.07, height: 29, width: 20,
      // weapon / muzzle: Magus's jaw, where the fire blade and the lasers come from
      sockets: { weapon: ['mgHead', [0, -1, -8]], muzzle: ['mgHead', [0, 0, -8]], off: ['armL', [0, -8, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, JACK); g.box(-4, -4, -3, 4, -3, 2, JACK);        // the jacket's long hem
        g.box(-4, -5, -3, 4, -5, 2, (x) => (x & 1) ? JACK2 : JACK); g.cut(-3, -5, -2, 3, -3, 1);
        g.box(-1, -4, 2, 1, -3, 2, YEL);                                           // yellow lining at the front split
        g.box(-3, 0, -2, 3, 0, 1, BLACK); g.box(2, -2, 2, 3, 0, 2, BLACK);         // belt, pouch
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, JACK2); g.box(-3, 3, -2, 3, 6, 1, JACK);
        g.box(-2, 3, 2, 2, 4, 2, JACK2);
        for (let y = 0; y <= 6; y++) g.set(0, y, 2, y === 4 ? SILVER : 0x5a5c64);   // zip, harness ring
        g.box(-2, 4, 3, 2, 4, 3, BLACK); g.set(0, 4, 4, SILVER);                    // harness strap across the chest
        g.box(-3, 6, -3, 3, 7, 1, YEL); g.box(-3, 7, -3, 3, 7, -3, JACK);           // the yellow-lined hood at the collar
        for (let i = 0; i < 4; i++) g.set(3 - i, 7, 2, SILVER);                     // cartridges on the left shoulder
        g.box(-3, 3, -3, 3, 5, -3, JACK2);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x3a1a10, mouth: 0xc9776e });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: FRAME, sideTo: 2 });
        g.box(-5, -4, -2, -5, 4, 1, HAIR); g.box(5, -4, -2, 5, 4, 1, HAIR);
        g.box(-4, -3, -4, 4, 1, -4, HAIR2); g.set(-2, 7, 4, HAIRHI); g.set(1, 7, 4, HAIRHI);
        for (const s of [-1, 1]) { g.set(s * 5, 2, 1, SKIN); g.set(s * 6, 3, 0, SKIN); g.set(s * 7, 4, -1, SKIN); }   // pointed ears
        g.box(-4, 7, -4, 4, 8, 3, BLACK); g.box(-3, 9, -3, 4, 9, 2, BLACK); g.box(-4, 7, 4, 3, 7, 5, BLACK);   // the black beret, tilted
        g.set(2, 8, 4, SILVER); g.set(3, 8, 4, G(0xdfe6ff));
        for (const s of [-1, 1]) {                                                  // curled dark metal horns, back and down like a ram's
          const HORN = [[5, 6, 0], [6, 7, -1], [6, 7, -2], [7, 6, -3], [7, 5, -3], [7, 4, -2], [7, 3, -1], [6, 2, -1]];
          HORN.forEach(([x, y, z], i) => { g.box(s * x, y, z - 1, s * (x - (i < 3 ? 1 : 0)), y, z, i === 4 ? GREY : 0x3a3c44); });
          g.set(s * 6, 2, 0, 0x5a5c64);
        }
      },
      armL(g) { H.arm(g, { sleeve: JACK, sleeveTo: 6, skin: SKIN, glove: BLACK, gloveLen: 2 }); g.box(-1, 0, -1, 1, 0, 1, BLUE); g.set(0, -7, 2, YEL); },
      armR(g) { H.arm(g, { sleeve: JACK, sleeveTo: 6, skin: SKIN, glove: BLACK, gloveLen: 2 }); g.box(-1, -5, -1, 1, -5, 1, RED); g.set(0, -7, 2, YEL); },
      legL(g) { H.leg(g, { pant: BLACK, boot: JACK, bootH: 4, sole: BLACK }); g.box(-1, -1, -1, 1, 0, 1, JACK2); },
      legR(g) { H.leg(g, { pant: BLACK, boot: JACK, bootH: 4, sole: BLACK }); g.box(-1, -1, -1, 1, 0, 1, JACK2); },
      extra: {
        tail: {   // long loose orange hair falling behind, the tips flicking out
          parent: 'head', at: [0, 2, -4], draw(g) {
            for (let i = 0; i < 16; i++) {                                         // one mass at the nape, parting into two long locks
              const z = -Math.floor(i / 6), col = x => i > 12 ? HAIRHI : (x + i) % 4 === 0 ? HAIR2 : HAIR;
              if (i < 5) g.box(-3, -i, z - 1, 3, -i, z, col);
              else for (const s of [-1, 1]) g.box(s * 1, -i, z - 1, s * (i < 11 ? 3 : 2), -i, z, col);
            }
            g.set(-3, -16, -4, HAIRHI); g.set(3, -16, -4, HAIRHI);
          }
        },
        // Magus: the tail, segment by segment (charcoal plates on top, crimson underneath)
        mg1: { parent: 'hips', at: [0, -2, -2], rot: [-0.55, 0, 0], draw: seg(2, 6) },
        mg2: { parent: 'mg1', at: [0, 0, -6], rot: [0.6, 0, 0], draw: seg(2, 6) },
        mg3: { parent: 'mg2', at: [0, 0, -6], rot: [0.85, 0, 0], draw: seg(1, 6) },
        mg4: { parent: 'mg3', at: [0, 0, -6], rot: [0.6, 0, 0], draw: seg(1, 5) },
        mgHead: { parent: 'mg4', at: [0, 0, -5], rot: [0.85, 0, 0], draw(g) {
          // the red mechanical dragon's head, snout toward -Z: a tapering wedge, a glowing lens, a jaw, a crest, the blade under it
          for (let z = 0; z >= -8; z--) {
            const d = -z, w = d < 3 ? 2 : d < 6 ? 1 : 0, top = d < 2 ? 2 : d < 5 ? 1 : d < 7 ? 0 : -1;
            g.box(-w, -1, z, w, top, z, (x, y) => y === top && d > 1 && d < 6 && x === 0 ? MRED2 : MRED);
            if (d > 0) { const j = Math.max(w - (d > 5 ? 0 : 1), 0); g.box(-j, -2, z, j, -2, z, d > 6 ? SILVER : GREY); }
          }
          g.set(0, -1, -8, BLACK); g.set(0, -2, -8, SILVER);                        // the mouth
          for (const s of [-1, 1]) { g.set(s * 2, 1, -3, G(0xffb03a)); g.set(s * 2, 0, -4, G(0xffb03a)); }   // the lens, both sides
          g.box(0, 3, -1, 0, 4, 2, BLACK); g.set(0, 5, 2, BLACK); g.set(0, 3, -3, BLACK);                   // the black crest fin
          for (let z = -1; z >= -9; z--) g.set(0, -3, z, z < -5 ? SILVER : GREY); g.set(0, -4, -8, SILVER); g.set(0, -4, -9, SILVER);   // the blade
        } },
      },
    });
    function seg(r, len) {   // one tail segment: a chunky charcoal box running back along -Z
      return g => {
        for (let z = 0; z >= -len; z--) {
          g.box(-r, -r, z, r, r, z, (x, y) => y === -r ? (z & 1 ? MRED : MRED2) : (y === r && (z & 1)) ? MPLATE : MDARK);
          if (z % 2 === 0) g.set(0, r + 1, z, MPLATE);                              // a ridge of plates along the top
        }
      };
    }
  }

  /* ------------------------------------------------------- Remielle Dan --
     Remielle Dan of the Covenant of Dayat: coral-pink hair to the shoulders,
     soft waves, a silver four-pointed star clip and a thin silver band;
     rose-pink eyes. A white dress with lavender layers, a laced corset front
     and a purple ribbon at the throat, puffed white sleeves; a short layered
     skirt; white thigh-highs; a grey pauldron fringed with lavender feathers.
     Her wings are her weapons: two great white mechanical wings, each topped
     by a hooded head with a rose-pink lens, hung with long blade-feathers
     tipped in lilac that reach to her knees. Separate parts (wingL, wingR) so
     anim.js can fold, spread, beat and sweep them. */
  {
    const HAIR = 0xf2868a, HAIR2 = 0xd86a72, HAIRHI = 0xffb6aa, SKIN = 0xfae2d8, EYE = 0xe0508a;
    const WHITE = 0xf6f4fa, WHITE2 = 0xdcd8e8, LAV = 0xc4b2ec, LAV2 = 0xa490d8, PURPLE = 0x6a50b8, SILVER = 0xd6d8e2, GREY = 0x8a8c9a, FEATH = 0xe2e2ea, FEATH2 = 0xb6b8c6;
    // one wing (s = 1: her left, +X): the arm rising from her back to a hooded head with a pink lens,
    // then a fan of long blade-feathers hanging down and out
    function wing(s) {
      return g => {
        g.line(0, 0, 0, s * 3, 4, -1, WHITE2, 0.7);                                   // the wing's arm
        g.box(s * 2, 3, -2, s * 5, 7, 0, (x, y, z) => y === 7 || z === -2 ? WHITE2 : WHITE);   // the hood
        g.box(s * 3, 4, 1, s * 5, 6, 1, WHITE); g.set(s * 4, 5, 2, G(0xff6aa8)); g.set(s * 5, 5, 1, G(0xff9ac8));   // its face, the lens
        g.set(s * 3, 8, -1, WHITE2); g.set(s * 4, 8, -2, LAV);
        for (let i = 0; i < 6; i++) {                                                 // the blade-feathers
          const x0 = s * (2 + i * 0.6), y0 = 3 - i * 0.6, x1 = s * (4 + i * 1.3), y1 = -9 - i * 0.9 + (i > 3 ? (i - 3) * 2.5 : 0), z = -1.5 - i * 0.35;
          g.line(x0, y0, z, x1, y1, z, i % 2 ? FEATH2 : FEATH, 0.6);
          g.line(x1, y1, z, x1 + s * 0.6, y1 - 2, z, i > 2 ? LAV : LAV2, 0.45);
          if (i % 2 === 0) g.line(x0, y0, z - 0.6, (x0 + x1) / 2, (y0 + y1) / 2 - 1, z - 0.6, WHITE, 0.5);
        }
      };
    }
    MODELS.remielle = H.humanoid({
      scale: 0.07, height: 28, width: 30,
      sockets: { weapon: ['wingR', [-9, -12, -2]], off: ['wingL', [9, -12, -2]], muzzle: ['wingR', [-4, 5, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, WHITE);
        g.box(-4, -3, -3, 4, -2, 2, WHITE); g.box(-5, -4, -4, 5, -4, 3, (x, y, z) => ((x + z) & 1) ? LAV : LAV2);   // short layered skirt
        g.box(-5, -5, -4, 5, -5, 3, (x, y, z) => ((x + z) & 1) ? WHITE : WHITE2); g.cut(-4, -5, -3, 4, -5, 2); g.cut(-3, -4, -2, 3, -4, 1);
        g.set(0, -3, 3, PURPLE);
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, WHITE); g.box(-3, 3, -2, 3, 6, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, WHITE);
        for (let y = 0; y <= 3; y++) { g.set(-1, y, 2, y & 1 ? LAV2 : WHITE2); g.set(1, y, 2, y & 1 ? LAV2 : WHITE2); }   // the laced corset
        g.box(-3, 1, -2, 3, 1, 1, LAV);
        g.box(-1, 5, 3, 1, 6, 3, PURPLE); g.set(0, 4, 3, PURPLE); g.set(0, 5, 4, G(0xd8c0ff));   // ribbon and star brooch at the throat
        g.box(-2, 6, -1, 2, 6, 1, WHITE2);
        g.box(2, 5, -2, 4, 7, 1, GREY); g.box(3, 4, -2, 4, 4, 1, GREY);             // the pauldron on her left shoulder...
        for (let i = 0; i < 4; i++) g.line(3 + i * 0.3, 4, -1 + i, 5, 2 - i * 0.4, -2 + i, i & 1 ? LAV : FEATH);   // ...fringed with feathers
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x5a2a3a, mouth: 0xe07a88, blush: 0xf8bcc4 });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: FRAME, sideTo: 2 });
        for (const s of [-1, 1]) for (let y = -4; y <= 4; y++) {                  // soft waves to the shoulders, curling out at the ends
          const out = y < -1 ? 1 : 0, z0 = y < 0 ? -1 : -2;
          g.box(s * (5 + out), y, z0, s * (5 + out), y, (y & 1) ? 1 : 0, (y & 2) ? HAIR2 : HAIR);
        }
        g.box(-4, -3, -4, 4, 1, -4, HAIR2); g.box(-3, -4, -4, 3, -4, -4, HAIR); g.set(-2, -5, -4, HAIRHI); g.set(2, -5, -4, HAIRHI);
        g.set(-6, -5, 0, HAIRHI); g.set(6, -5, 0, HAIRHI); g.set(-5, 5, 2, HAIRHI); g.set(4, 6, 3, HAIRHI);
        g.box(-4, 7, 0, 4, 7, 0, SILVER);                                           // the thin silver band
        g.set(-3, 6, 4, SILVER); g.set(-3, 7, 4, G(0xe8e8ff)); g.set(-4, 6, 4, SILVER); g.set(-2, 6, 4, SILVER); g.set(-3, 5, 4, SILVER);   // the star clip
        g.set(0, 8, 1, HAIRHI); g.set(1, 9, 0, HAIR);
      },
      armL(g) {   // puffed white sleeve, layered lilac at the cuff
        g.box(-2, -3, -2, 2, 0, 2, WHITE); g.box(-2, -3, -2, 2, -3, 2, LAV);
        H.arm(g, { sleeve: null, sleeveTo: 4, skin: SKIN, len: 7 }); g.box(-1, -4, -1, 1, -6, 1, WHITE2); g.box(-2, -6, -2, 2, -6, 2, LAV2);
      },
      armR(g) {
        g.box(-2, -3, -2, 2, 0, 2, WHITE); g.box(-2, -3, -2, 2, -3, 2, LAV);
        H.arm(g, { sleeve: null, sleeveTo: 4, skin: SKIN, len: 7 }); g.box(-1, -4, -1, 1, -6, 1, WHITE2); g.box(-2, -6, -2, 2, -6, 2, LAV2);
      },
      legL(g) { H.leg(g, { pant: SKIN, boot: WHITE, bootH: 7, sole: LAV2 }); g.box(-1, -2, -1, 1, -2, 1, LAV); g.set(0, -9, 2, PURPLE); },
      legR(g) { H.leg(g, { pant: SKIN, boot: WHITE, bootH: 7, sole: LAV2 }); g.box(-1, -2, -1, 1, -2, 1, LAV); g.set(0, -9, 2, PURPLE); },
      extra: {
        wingL: { parent: 'torso', at: [2, 5, -3], draw: wing(1) },
        wingR: { parent: 'torso', at: [-2, 5, -3], draw: wing(-1) },
      },
    });
  }

  /* ======================= COMPANION ======================= */

  /* Hu Wei: Ju Fufu's tiger cauldron. A round iron pot with a scowling tiger's
     face (its brow-mark glows when it attacks), yellow eyes and fangs, gold
     spikes around its waist, a lid with a handle, and a long golden tiger's
     tail, striped black, that she swings it by. It rolls along the ground
     beside her. Rig: body (the pot) -> head (the lid), armL / armR (the gold
     spike crowns), tail. */
  {
    const IRON = 0x6a6c76, IRON2 = 0x50525a, DARK = 0x2a2a30, GOLD = 0xd9a838, WHITE = 0xf2f2ea, ROPE = 0xf0b030;
    MODELS.huwei = {
      kind: 'float', scale: 0.075, height: 9, width: 14, companion: true,
      sockets: { head: ['head', [0, 1, 0]], chest: ['body', [0, 0, 4]], weapon: ['body', [0, -1, 5]] },
      parts: {
        body: { parent: null, at: [0, 0, 0], draw(g) {
          g.ell(0, 0, 0, 4, 3.6, 4, (x, y, z) => (y === 0 ? IRON2 : IRON));
          g.box(-2, 1, 4, -1, 1, 4, G(0xffd23a)); g.box(1, 1, 4, 2, 1, 4, G(0xffd23a));   // yellow eyes
          g.line(-3, 3, 4, -1, 2, 5, DARK); g.line(3, 3, 4, 1, 2, 5, DARK);               // scowling brows
          g.box(-1, 0, 5, 1, 0, 5, DARK); g.box(-3, -2, 4, 3, -1, 4, DARK);               // nose, the maw
          for (const x of [-2, 2]) g.set(x, -1, 5, WHITE); g.set(-1, -2, 5, WHITE); g.set(1, -2, 5, WHITE);   // fangs
          g.cyl('y', 0, 0, 4.4, 0, 0, (x, y, z) => (Math.hypot(x, z) > 3.6 ? GOLD : -1));  // the gold rim
        } },
        head: { parent: 'body', at: [0, 3, 0], draw(g) { g.ell(0, 0, 0, 3, 1, 3, IRON2); g.box(-1, 1, 0, 1, 2, 0, DARK); g.set(0, 3, 0, GOLD); } },
        armL: { parent: 'body', at: [4, 0, 0], draw(g) { g.line(0, 0, 0, 2, 0, 1, GOLD); g.line(0, 0, 0, 2, 1, -1, GOLD); g.set(2, 0, 1, G(0xffe08a)); } },
        armR: { parent: 'body', at: [-4, 0, 0], draw(g) { g.line(0, 0, 0, -2, 0, 1, GOLD); g.line(0, 0, 0, -2, 1, -1, GOLD); g.set(-2, 0, 1, G(0xffe08a)); } },
        tail: { parent: 'body', at: [0, 0, -4], draw(g) {   // the striped golden tail, curling up at the tip
          for (let i = 0; i < 14; i++) { const y = i < 8 ? -i * 0.25 : -2 + (i - 8) * 0.9, z = -i * 0.9 + (i > 9 ? (i - 9) * 0.6 : 0); g.ell(Math.sin(i * 0.5) * 0.8, y, z, 0.8, 0.8, 0.8, i % 3 === 1 ? DARK : i > 11 ? 0xfff0c0 : ROPE); }
        } },
      },
    };
  }

})();
