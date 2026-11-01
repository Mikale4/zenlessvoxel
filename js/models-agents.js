/* ============================================================================
   models-agents.js -- the four playable Agents as voxel rigs, matched to
   their official character art. Standard humanoid rig (see models-base.js).
   Scale 0.07: about 1.9 m tall.
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, H = window.MB;
  // bang strands that frame the face without covering the eyes (x = -2..-1 and 1..2)
  const FRAME = [[-4, 2], [-3, 3], [0, 4], [3, 3], [4, 2]];

  /* ------------------------------------------------------------ Caesar --
     Caesar King: sage-green hair, short and messy, with a long low ponytail
     that curls out behind; two black horn clips and a black KING clip; gold
     eyes. Black fur-collared cropped jacket lined in red, a red high neck,
     a red band with gold KING letters, a dark grey laced corset, a studded
     belt with a gold star buckle and a grey skirt; black thigh-highs with knee
     pads; white sneakers. A round tyre shield ringed with gold spikes around a
     gold skull, and a long dark blade. */
  {
    const HAIR = 0xb4c3ad, HAIR2 = 0x95a58f, HAIRHI = 0xd3ddcf, SKIN = 0xf6d6c2, EYE = 0xe8b43a;
    const BLACK = 0x1d1d22, FUR = 0x34343a, FUR2 = 0x45454c, RED = 0xc4302b, RED2 = 0x9a2421, GOLD = 0xdcb64c, GOLD2 = 0xb08a2e,
      CORSET = 0x4a4d55, CORSET2 = 0x3a3c43, SKIRT = 0x4e5058, STUD = 0xd9d9dc, STOCK = 0x232328, SHOE = 0xe8e8ea, SHOE2 = 0xb9b9bf;
    MODELS.caesar = H.humanoid({
      scale: 0.07, height: 28, width: 20,
      sockets: { weapon: ['blade', [0, 0, 18]], off: ['shield', [0, 0, 4]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, STUD);                                  // studded belt
        g.box(-3, 0, -2, 3, 0, 1, (x, y, z) => (x + z) & 1 ? STUD : 0x8c8c92);
        g.box(-1, -1, 2, 1, 0, 2, GOLD); g.set(0, 1, 2, GOLD); g.setM(2, 0, 2, GOLD2); // gold star buckle
        g.box(-4, -3, -3, 4, -2, 2, SKIRT); g.box(-3, -1, -2, 3, -1, 1, SKIRT);         // skirt
        g.box(-4, -3, -3, 4, -3, 2, (x, y, z) => (x & 1) ? SKIRT : 0x5c5e66);
        g.box(3, -3, 2, 3, -1, 2, BLACK); g.set(3, -2, 3, RED);              // pouch on the hip
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, CORSET);                                   // waist corset
        g.box(-3, 3, -2, 3, 4, 1, CORSET);
        g.box(0, 0, 2, 0, 3, 2, CORSET2); g.set(-1, 1, 2, BLACK); g.set(1, 1, 2, BLACK); g.set(-1, 3, 2, BLACK); g.set(1, 3, 2, BLACK); // lacing
        g.box(-2, 4, 2, 2, 5, 2, RED);                                       // red band...
        g.set(-2, 5, 3, GOLD); g.set(-1, 5, 3, GOLD); g.set(0, 5, 3, GOLD); g.set(1, 5, 3, GOLD); g.set(2, 5, 3, GOLD); // ...with gold KING
        g.box(-3, 5, -2, 3, 6, 1, RED);                                      // red high neck
        g.box(-1, 6, -1, 1, 6, 1, RED2); g.set(0, 6, 2, GOLD);
        g.box(-3, 2, -3, 3, 6, -2, BLACK);                                   // cropped jacket back
        g.box(-3, 2, -2, -3, 6, 1, BLACK); g.box(3, 2, -2, 3, 6, 1, BLACK);
        g.box(-3, 2, 2, -3, 4, 2, RED); g.box(3, 2, 2, 3, 4, 2, RED);        // red lining at the open front
        g.box(-4, 6, -3, 4, 7, 2, (x, y, z) => ((x * 7 + z * 3 + y) % 3 === 0) ? FUR2 : FUR); // fur collar
        g.cut(-2, 7, -1, 2, 7, 1); g.cut(-1, 6, 2, 1, 7, 2);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x2e2a26, mouth: 0xc77a70 });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: FRAME, sideTo: 2 });
        // messy layers hanging to the jaw and down the nape
        g.box(-5, -2, -3, -4, 4, 1, HAIR); g.box(4, -2, -3, 5, 4, 1, HAIR);
        g.box(-4, -3, -5, 4, 3, -4, HAIR2); g.box(-3, -4, -5, 3, -4, -5, HAIR2);
        g.set(-5, -3, 0, HAIR); g.set(5, -3, -1, HAIR); g.set(-5, 5, 2, HAIR); g.set(5, 5, 2, HAIR);
        g.box(-2, 8, -2, 1, 8, 1, HAIR); g.set(0, 9, 0, HAIR); g.set(-1, 9, -1, HAIRHI); // messy crown
        g.box(-3, 7, 1, 3, 7, 3, HAIRHI);
        // black horn clips
        for (const s of [-1, 1]) { g.box(s * 3, 8, 0, s * 3, 10, 0, BLACK); g.set(s * 3, 11, -1, BLACK); g.set(s * 4, 11, -2, BLACK); g.set(s * 4, 12, -2, 0x3a1a1a); }
        g.box(-5, 4, 1, -5, 5, 3, BLACK); g.set(-5, 5, 2, G(0xd9d9d9));       // KING clip
      },
      armL(g) { H.arm(g, { sleeve: BLACK, sleeveTo: 6, skin: SKIN, glove: 0x16161a, gloveLen: 2, cuff: RED }); g.box(-1, 1, -1, 1, 1, 1, FUR); },
      armR(g) { H.arm(g, { sleeve: BLACK, sleeveTo: 6, skin: SKIN, glove: 0x16161a, gloveLen: 2, cuff: RED }); g.box(-1, 1, -1, 1, 1, 1, FUR); g.set(-2, -4, 0, GOLD); },
      legL(g) {
        H.leg(g, { pant: SKIN, boot: STOCK, bootH: 8, sole: RED, skin: SKIN });
        g.box(-1, -2, -1, 1, -2, 1, RED);                                    // red stocking band
        g.box(-1, -5, 2, 1, -4, 2, 0x111114);                                // knee pad
        g.box(-1, -9, -1, 1, -7, 2, SHOE); g.box(-1, -9, -1, 1, -9, 2, SHOE2); g.box(-1, -8, 2, 1, -8, 2, BLACK); g.set(0, -9, -1, RED);
      },
      legR(g) {
        H.leg(g, { pant: SKIN, boot: STOCK, bootH: 8, sole: RED, skin: SKIN });
        g.box(-1, -5, 2, 1, -4, 2, 0x111114);
        g.box(-1, -9, -1, 1, -7, 2, SHOE); g.box(-1, -9, -1, 1, -9, 2, SHOE2); g.box(-1, -8, 2, 1, -8, 2, BLACK); g.set(0, -9, -1, RED);
      },
      extra: {
        tail: {
          parent: 'head', at: [0, 1, -5], draw(g) {   // the long low ponytail, curling out to her right
            g.box(-1, 0, -1, 1, 1, 0, BLACK);
            const path = [[0, -1, -1], [0, -2, -2], [-1, -3, -2], [-1, -4, -3], [-2, -5, -3], [-3, -6, -3], [-4, -7, -2], [-5, -7, -1], [-6, -6, 0], [-6, -5, 0], [-5, -4, 1]];
            path.forEach(([x, y, z], i) => g.ell(x, y, z, i < 8 ? 1 : 0.6, 1, 1, i % 3 === 1 ? HAIR2 : HAIR));
          }
        },
        // the tyre shield: black tyre, gold ring and skull, gold spikes all round
        shield: {
          parent: 'armL', at: [1, -6, 2], draw(g) {
            for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) {
              const r = Math.hypot(x, y);
              if (r > 5.7) continue;
              const c = r > 4.6 ? (Math.abs(Math.atan2(y, x) * 6 % 1) < 0.3 ? 0x2c2c32 : 0x1c1c20) : r > 3.6 ? GOLD : r > 3.0 ? 0x28282d : GOLD2;
              g.set(x, y, 1, c); if (r > 3.6) g.set(x, y, 2, c);
            }
            // gold skull in the middle
            g.box(-2, -1, 3, 2, 2, 3, GOLD); g.box(-1, -2, 3, 1, -2, 3, GOLD);
            g.set(-1, 1, 3, 0x1c1c20); g.set(1, 1, 3, 0x1c1c20); g.set(-1, 1, 4, G(0xff8a3a)); g.set(1, 1, 4, G(0xff8a3a));
            g.box(-3, 3, 3, -3, 4, 3, GOLD); g.box(3, 3, 3, 3, 4, 3, GOLD);
            // spikes around the rim
            for (let k = 0; k < 10; k++) {
              const a = k / 10 * Math.PI * 2;
              for (let d = 6; d <= 7; d++) g.set(Math.round(Math.cos(a) * d), Math.round(Math.sin(a) * d), 1, d === 7 ? 0xf2d27a : GOLD);
            }
            g.box(-1, -1, 0, 1, 0, 0, 0x2c2c32);                                // grip
          }
        },
        blade: {
          parent: 'armR', at: [0, -7, 0], draw(g) {
            const STEEL = 0x40434b, EDGE = 0x7d828c;
            g.box(0, 0, -3, 0, 0, 1, 0x18181c); g.set(0, 0, -4, GOLD);        // grip + pommel
            g.box(-2, 0, 2, 2, 0, 2, GOLD); g.box(-1, -1, 2, 1, 1, 2, GOLD);   // guard
            g.box(-1, 0, 3, 1, 0, 17, STEEL); g.box(1, 0, 4, 1, 0, 16, EDGE);
            g.box(0, 0, 4, 0, 0, 15, G(0xe0b84c));                             // the gold line down the blade
            g.set(0, 0, 18, STEEL); g.set(0, 1, 3, GOLD);
          }
        },
      },
    });
  }

  /* ----------------------------------------------------------- Burnice --
     Burnice White: pale-blonde twin tails, red eyes, red-and-black sunglasses
     with gold horns pushed up on her head, a red choker. Black studded crop
     jacket with red-and-white cuffs, a black crop top, a black pleated skirt
     lined red, black thigh-high boots with red straps and gold heels. A white
     Nitro-Fuel tank pack and two long gold flamethrowers. */
  {
    const HAIR = 0xeee1b6, HAIR2 = 0xd6c48e, SKIN = 0xf8dac8, EYE = 0xd8282e;
    const BLACK = 0x1c1c21, BLACK2 = 0x2a2a30, RED = 0xc8302a, WHITE = 0xf0ece6, GOLD = 0xd9a838, GOLD2 = 0xa67c22, TANK = 0xe9e9ea;
    const gun = g => {
      g.box(-1, -1, -1, 1, 1, 3, BLACK2); g.box(0, -2, 0, 0, -2, 1, BLACK);   // body + grip
      g.box(-2, 1, 1, 2, 2, 2, GOLD); g.set(-2, 3, 2, GOLD); g.set(2, 3, 2, GOLD); g.set(0, 3, 1, 0xf2d27a); // spiked star knuckle guard
      g.box(0, 0, 4, 0, 0, 16, GOLD); g.box(-1, 0, 4, 1, 0, 6, GOLD);           // long gold barrel
      for (let z = 7; z <= 15; z += 2) g.set(0, 1, z, BLACK);                   // black dots
      g.box(-1, -1, 17, 1, 1, 17, GOLD2); g.set(0, 0, 18, G(0xffb040)); g.set(0, 1, 18, G(0xff7a20)); g.set(0, -1, 18, G(0xff7a20));
      g.box(0, -2, 3, 0, -3, 4, 0x9a9aa2);                                      // hose hook
    };
    const twin = s => g => {
      for (let i = 0; i < 11; i++) {
        const w = i < 2 ? 1 : i < 8 ? 1.4 : 0.8, x = s * Math.sin(i * 0.6) * 0.8;
        g.ell(x, -i, 0, w, 0.6, w, i % 3 === 2 ? HAIR2 : HAIR);
      }
      g.box(-1, 1, -1, 1, 1, 1, RED);
    };
    MODELS.burnice = H.humanoid({
      scale: 0.07, height: 28, width: 22,
      sockets: { weapon: ['gunR', [0, 0, 18]], off: ['gunL', [0, 0, 18]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]], tank: ['tank', [0, 4, -2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, BLACK); g.box(-1, -1, 2, 1, 0, 2, GOLD);   // belt + buckle
        g.box(-4, -4, -3, 4, -2, 2, (x, y, z) => ((x + 9) % 3 === 0 && z === 2) ? RED : BLACK); // pleated skirt, red in the folds
        g.box(-4, -4, -3, 4, -4, 2, (x) => (x & 1) ? BLACK : 0x2b2b31);
        g.box(3, -2, 1, 4, -1, 2, GOLD2);                                       // pouch
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, SKIN);                                         // midriff
        g.box(-3, 3, -2, 3, 5, 1, BLACK); g.box(-2, 3, 2, 2, 4, 2, BLACK);       // crop top
        g.set(-1, 4, 3, 0x9a9aa2); g.set(0, 4, 3, 0xcfcfd4); g.set(1, 4, 3, 0x9a9aa2); // grey print
        g.box(-3, 5, -2, 3, 6, 1, SKIN); g.box(-1, 6, -1, 1, 6, 1, RED);       // shoulders + red choker
        g.box(-3, 3, -3, 3, 6, -2, BLACK2);                                      // cropped jacket (back, sides, collar)
        g.box(-3, 3, -2, -3, 6, 2, BLACK2); g.box(3, 3, -2, 3, 6, 2, BLACK2);
        g.set(-3, 5, 3, 0xbdbdc2); g.set(3, 5, 3, 0xbdbdc2); g.set(-3, 4, 3, 0xbdbdc2); g.set(3, 4, 3, 0xbdbdc2); // studs
        g.box(-3, 6, -3, 3, 7, -2, BLACK2);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x3a2020, blush: 0xf4b0a0, mouth: 0xd06a60 });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: FRAME });
        g.box(-4, -1, -4, 4, 0, -4, HAIR2); g.box(-5, 0, -2, -5, 4, 1, HAIR); g.box(5, 0, -2, 5, 4, 1, HAIR);
        // sunglasses pushed up, with gold horns
        g.box(-4, 8, 0, 4, 8, 3, BLACK); g.box(-3, 8, 3, -1, 8, 3, G(0xe0302a)); g.box(1, 8, 3, 3, 8, 3, G(0xe0302a));
        for (const s of [-1, 1]) { g.box(s * 4, 9, 0, s * 4, 11, 0, GOLD); g.set(s * 3, 11, 0, GOLD); g.set(s * 4, 12, 0, 0xf2d27a); }
      },
      armL(g) { H.arm(g, { sleeve: BLACK2, sleeveTo: 4, skin: SKIN, glove: BLACK, gloveLen: 2 }); g.box(-1, -4, -1, 1, -5, 1, RED); g.set(-1, -4, 1, WHITE); g.set(1, -5, 1, WHITE); },
      armR(g) { H.arm(g, { sleeve: BLACK2, sleeveTo: 4, skin: SKIN, glove: BLACK, gloveLen: 2 }); g.box(-1, -4, -1, 1, -5, 1, RED); g.set(-1, -4, 1, WHITE); g.set(1, -5, 1, WHITE); },
      legL(g) { H.leg(g, { pant: SKIN, boot: BLACK, bootH: 9, sole: GOLD2 }); g.box(-1, -3, -1, 1, -3, 1, RED); g.box(-1, -6, -1, 1, -6, 1, RED); g.box(-1, -9, 2, 1, -9, 2, GOLD); g.box(0, -9, -1, 0, -8, -1, GOLD); },
      legR(g) { H.leg(g, { pant: SKIN, boot: BLACK, bootH: 9, sole: GOLD2 }); g.box(-1, -3, -1, 1, -3, 1, RED); g.box(-1, -6, -1, 1, -6, 1, RED); g.box(-1, -9, 2, 1, -9, 2, GOLD); g.box(0, -9, -1, 0, -8, -1, GOLD); },
      extra: {
        tailL: { parent: 'head', at: [5, 5, -1], draw: twin(1) },
        tailR: { parent: 'head', at: [-5, 5, -1], draw: twin(-1) },
        tank: {
          parent: 'torso', at: [0, 3, -4], draw(g) {
            g.box(-4, -3, -2, -1, 5, 0, TANK); g.box(1, -3, -2, 4, 5, 0, TANK);
            g.box(-4, 1, 0, -1, 2, 0, RED); g.box(1, 1, 0, 4, 2, 0, RED); g.set(-3, 1, 1, G(0xffb040)); g.set(2, 1, 1, G(0xffb040));
            g.box(-3, 6, -1, -2, 6, -1, BLACK); g.box(2, 6, -1, 3, 6, -1, BLACK); g.box(-4, -4, -2, 4, -4, 0, 0x9a9aa2);
          }
        },
        gunL: { parent: 'armL', at: [0, -7, 1], draw: gun },
        gunR: { parent: 'armR', at: [0, -7, 1], draw: gun },
      },
    });
  }

  /* --------------------------------------------------------------- Aria --
     Aria of the Angels of Delusion: pink hair with teal streaks in two puffy
     twin tails, black headset spikes, blue eyes. A white idol dress with puffy
     sleeves, an orange star on the chest and a piano-key placket; a teal
     layered skirt under white frills; white angel wings; pink fingerless
     socks and chunky white sneakers with teal bows. Teal star-shaped speaker
     panels hang at both hips of the skirt, with orange fins. In battle she
     wears big white mechanical gloves (from her in-game model). She is an
     Intelligent Construct: this look is her projected human form. */
  {
    const HAIR = 0xf58fae, HAIR2 = 0xd9708f, HAIRHI = 0xffc2d2, TEALH = 0x5fe8e0, SKIN = 0xfadfd0, EYE = 0x48b8ff;
    const WHITE = 0xf7f7fa, WHITE2 = 0xdedee6, TEAL = 0x2fbfa8, TEAL2 = 0x1f8f7d, ORANGE = 0xffa13a, PINK = 0xf6a3b5, PINK2 = 0xffd3dc, BLACK = 0x1c1c22;
    const puff = s => g => {
      for (let i = 0; i < 8; i++) { const w = i < 1 ? 1 : i < 6 ? 1.8 : 1.1; g.ell(s * (0.5 + i * 0.25), -i, 0, w, 0.7, w, i === 3 ? TEALH : i % 2 ? HAIR2 : HAIR); }
    };
    MODELS.aria = H.humanoid({
      scale: 0.07, height: 28, width: 22,
      sockets: { weapon: ['armR', [0, -9, 2]], off: ['armL', [0, -9, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, WHITE);
        g.box(-4, -3, -3, 4, -2, 2, WHITE);                                        // white overskirt
        g.box(-5, -4, -4, 5, -4, 3, (x, y, z) => ((x + z) & 1) ? TEAL : TEAL2);   // teal layered underskirt
        g.box(-5, -5, -4, 5, -5, 3, (x, y, z) => ((x + z) & 1) ? WHITE : WHITE2);  // frills
        g.cut(-4, -5, -3, 4, -5, 2); g.cut(-3, -4, -2, 3, -4, 1);
        g.box(-1, -2, 3, 1, -1, 3, 0x2a2a30); g.set(0, -2, 3, WHITE);             // A.o.D logo
        for (const s of [-1, 1]) {                                                  // teal star speaker panels at both hips
          g.box(s * 5, -4, -2, s * 6, 0, 2, TEAL); g.box(s * 6, -3, -1, s * 7, -1, 1, TEAL2);
          g.set(s * 7, -2, 0, 0x2a2a30); g.set(s * 8, -2, 0, G(0xffa13a));                  // speaker eye, orange ring
          g.set(s * 5, 1, 0, TEAL); g.set(s * 6, -5, 1, TEAL2);
          g.line(s * 5, -4, -1, s * 7, -7, -2, ORANGE, 0.5);                                // orange fin
        }
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, WHITE); g.box(-3, 3, -2, 3, 6, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, WHITE);
        g.box(-3, 1, -2, 3, 1, 1, TEAL);                                            // waist band
        for (let y = 0; y <= 4; y++) g.set(0, y, 2, y & 1 ? BLACK : WHITE);        // piano-key placket
        g.box(-2, 4, 3, 2, 4, 3, ORANGE); g.box(-1, 5, 3, 1, 5, 3, ORANGE); g.box(-1, 3, 3, 1, 3, 3, ORANGE); g.set(0, 6, 3, ORANGE); // star
        g.set(0, 4, 4, G(0xffd27a));
        g.box(-2, 6, -1, 2, 6, 1, WHITE2);                                          // collar
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x4a2a3a, blush: 0xf8b4c8, mouth: 0xe07a90 });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: FRAME, sideTo: 2 });
        g.box(-5, -1, -2, -5, 4, 2, HAIR); g.box(5, -1, -2, 5, 4, 2, HAIR);
        g.box(-4, -2, -4, 4, 0, -4, HAIR2);
        g.set(-2, 7, 4, TEALH); g.set(-3, 6, 4, TEALH); g.box(-1, 8, -1, 1, 8, 1, HAIRHI); g.set(2, 9, 0, HAIR); g.set(3, 9, 1, TEALH);
        for (const s of [-1, 1]) { g.line(s * 3, 8, -1, s * 4, 11, -3, BLACK); g.set(s * 4, 12, -3, BLACK); }  // headset spikes
        g.box(-5, 2, -1, -5, 3, 0, BLACK); g.box(5, 2, -1, 5, 3, 0, BLACK); g.set(5, 2, 1, G(0x7ff4ff));
      },
      armL(g) { g.box(-1, -2, -2, 2, 0, 2, WHITE); g.box(-1, -2, -2, 2, -2, 2, WHITE2); H.arm(g, { sleeve: null, sleeveTo: 3, skin: SKIN, len: 6 }); g.box(-2, -10, -2, 2, -6, 2, WHITE); g.box(-2, -6, -2, 2, -6, 2, WHITE2); g.box(-1, -10, 3, 1, -8, 3, WHITE2); g.set(0, -8, 3, G(0x5fe8e0)); g.box(-2, -7, -2, 2, -7, 2, TEAL); },
      armR(g) { g.box(-2, -2, -2, 1, 0, 2, WHITE); g.box(-2, -2, -2, 1, -2, 2, WHITE2); H.arm(g, { sleeve: null, sleeveTo: 3, skin: SKIN, len: 6 }); g.box(-2, -10, -2, 2, -6, 2, WHITE); g.box(-2, -6, -2, 2, -6, 2, WHITE2); g.box(-1, -10, 3, 1, -8, 3, WHITE2); g.set(0, -8, 3, G(0x5fe8e0)); g.box(-2, -7, -2, 2, -7, 2, TEAL); },
      legL(g) {
        H.leg(g, { pant: SKIN, boot: PINK, bootH: 6, sole: WHITE2 });
        for (let y = -8; y <= -4; y++) if (y & 1) g.box(-1, y, -1, 1, y, 1, PINK2);
        g.box(-1, -3, -1, 1, -3, 1, WHITE);                                         // frill cuff
        g.box(-2, -9, -1, 2, -7, 3, WHITE); g.box(-2, -9, -1, 2, -9, 3, WHITE2); g.box(-1, -7, 3, 1, -7, 3, TEAL); g.set(0, -8, 3, ORANGE);
      },
      legR(g) {
        H.leg(g, { pant: SKIN, boot: PINK, bootH: 6, sole: WHITE2 });
        for (let y = -8; y <= -4; y++) if (y & 1) g.box(-1, y, -1, 1, y, 1, PINK2);
        g.box(-1, -3, -1, 1, -3, 1, WHITE);
        g.box(-2, -9, -1, 2, -7, 3, WHITE); g.box(-2, -9, -1, 2, -9, 3, WHITE2); g.box(-1, -7, 3, 1, -7, 3, TEAL); g.set(0, -8, 3, ORANGE);
      },
      extra: {
        tailL: { parent: 'head', at: [5, 5, -1], draw: puff(1) },
        tailR: { parent: 'head', at: [-5, 5, -1], draw: puff(-1) },
        wings: {
          parent: 'torso', at: [0, 4, -3], draw(g) {
            for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {          // three white feather blades a side
              const y = 2 - i * 1.5;
              g.line(s * 1, 0, -1, s * (6 + i), y, -1, i === 0 ? WHITE : WHITE2, 0.45);
              g.set(s * (6 + i), y, -1, G(0xe8f8ff));
            }
          }
        },
      },
    });
  }

  /* ------------------------------------------------------------- Yixuan --
     Yixuan, master of Yunkui Summit: long flowing silver-white hair with an
     ahoge and a black cloud ornament, gold eyes. A golden-yellow cropped
     jacket with white pleated panels at the sleeves, a white top with a red
     knot, black high-waisted shorts with gold buttons and a gold-and-red belt
     charm; a dark patterned stocking on one leg, white spat boots with gold
     buckles; a long black glove. (Her ink bird is its own model below: it follows her around.) */
  {
    const HAIR = 0xe9ebf1, HAIR2 = 0xc5c9d6, HAIRHI = 0xffffff, SKIN = 0xf7dccb, EYE = 0xf2b33a;
    const YEL = 0xf0b52a, YEL2 = 0xc98f1c, WHITE = 0xf4f2ee, WHITE2 = 0xd8d6d0, BLACK = 0x18181d, GLOSS = 0x2a2a33, RED = 0xc8302a, GOLD = 0xd9a838, STOCK = 0x3a3032, BOOT = 0xe2e4ea;
    const sleeve = s => g => {
      // a wide yellow sleeve panel ending in white pleats, hanging off the elbow
      g.box(-2, 0, -2, 2, -3, 2, YEL); g.box(s * 2, -3, -2, s * 2, -7, 2, YEL2);
      for (let z = -2; z <= 2; z++) g.box(s * 2, -8, z, s * 2, -10, z, (z & 1) ? WHITE : WHITE2);
    };
    MODELS.yixuan = H.humanoid({
      scale: 0.07, height: 28, width: 22,
      sockets: { weapon: ['armR', [0, -7, 1]], off: ['armL', [0, -7, 1]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, GLOSS); g.box(-3, 0, -2, 3, 0, 1, BLACK);       // glossy shorts + belt
        g.box(-1, -1, 2, 1, 0, 2, GOLD); g.set(0, -1, 3, G(0xffd65e));             // gold belt charm
        g.box(2, -4, 2, 2, -2, 2, RED); g.set(2, -5, 2, GOLD);                     // red-gold tassel
        g.set(-2, -1, 2, GOLD); g.set(2, -1, 2, GOLD);
      },
      torso(g) {
        g.box(-2, 0, -2, 2, 2, 1, GLOSS); for (const x of [-1, 1]) for (const y of [0, 2]) g.set(x, y, 2, GOLD); // high waist, gold buttons
        g.box(-3, 3, -2, 3, 5, 1, WHITE); g.box(-2, 3, 2, 2, 4, 2, WHITE); g.set(0, 4, 2, SKIN);
        g.box(-3, 5, -2, 3, 6, 1, SKIN); g.box(-1, 6, -1, 1, 6, 1, BLACK); g.set(0, 6, 2, RED); g.set(0, 5, 3, G(0xff5a4a)); // choker + red knot
        g.box(-3, 3, -3, 3, 6, -2, YEL);                                           // yellow jacket, worn off the shoulders
        g.box(-4, 3, -2, -4, 6, 1, YEL); g.box(4, 3, -2, 4, 6, 1, YEL);
        g.box(-3, 6, -3, 3, 7, -3, YEL2);                                          // high collar at the back
        g.box(-4, 2, -2, -4, 2, 1, YEL2); g.box(4, 2, -2, 4, 2, 1, YEL2);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x2a2228, mouth: 0xc0706a });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: FRAME, sideTo: 2 });
        H.hairBack(g, HAIR, 15, { shade: HAIR2, w: 4, from: 4 });                 // long flowing hair down to the waist
        g.box(-5, -6, -1, -5, 4, 1, HAIR); g.box(5, -6, -1, 5, 4, 1, HAIR);        // long side locks
        g.set(-5, -7, 0, HAIR2); g.set(5, -7, 0, HAIR2);
        g.set(0, 8, 1, HAIR); g.set(0, 9, 0, HAIR); g.set(-1, 10, -1, HAIRHI); g.set(-2, 10, -2, HAIRHI); // ahoge
        g.box(1, 7, 1, 3, 8, 2, BLACK); g.set(2, 8, 3, 0xf0f0f0);                  // black cloud ornament
      },
      armL(g) { H.arm(g, { sleeve: SKIN, sleeveTo: 2, skin: BLACK, glove: BLACK, gloveLen: 2 }); g.box(-1, -1, -1, 1, -1, 1, GOLD); },   // long black glove
      armR(g) { H.arm(g, { sleeve: SKIN, sleeveTo: 3, skin: SKIN, glove: BLACK, gloveLen: 2 }); g.box(-1, -6, -1, 1, -6, 1, G(0xffd65e)); },
      legL(g) {
        H.leg(g, { pant: SKIN, boot: BOOT, bootH: 4, sole: BLACK });
        g.box(-1, -2, -1, 1, -2, 1, BLACK); g.set(0, -2, 2, GOLD);                  // garter
        g.box(-1, -9, 2, 1, -9, 2, BLACK); g.set(0, -9, -1, RED); g.set(1, -7, 1, GOLD); g.set(1, -6, 1, GOLD); // buckles, red heel
      },
      legR(g) {
        H.leg(g, { pant: STOCK, boot: BOOT, bootH: 4, sole: BLACK });
        g.box(-1, -1, -1, 1, 0, 1, SKIN); g.set(1, -4, 1, 0x4a3c3e); g.set(-1, -6, 1, 0x4a3c3e); // patterned stocking
        g.box(-1, -9, 2, 1, -9, 2, BLACK); g.set(0, -9, -1, RED); g.set(-1, -7, 1, GOLD); g.set(-1, -6, 1, GOLD);
      },
      extra: {
        sleeveL: { parent: 'armL', at: [1, 0, 0], draw: sleeve(1) },
        sleeveR: { parent: 'armR', at: [-1, 0, 0], draw: sleeve(-1) },
      },
    });
  }

  /* --------------------------------------------- Aria: construct form --
     Aria's true form, the A-H0L0 Type Intelligent Tactical Construct: a pink
     and white combat robot with a dark visor helmet and big pink ear-pieces,
     a white armoured body with a dark core, pink limbs, white armoured shins,
     big round white mechanical hands with pink rings, teal bows. */
  {
    const PINK = 0xf27a9a, PINK2 = 0xd85a7c, WHITE = 0xf2f2f6, WHITE2 = 0xcfd0d8, DARK = 0x22232b, VISOR = 0x2a2e3a, TEAL = 0x2fbfa8, GREEN = 0x7affb0;
    const hand = g => { g.ell(0, -8, 0, 2.2, 2.2, 2.2, WHITE); g.cyl('y', 0, 0, 2.3, -7, -7, (x, y, z) => Math.hypot(x, z) > 1.5 ? PINK : -1); g.set(0, -8, 3, G(0xff9ad0)); };
    MODELS.ariaRobot = H.humanoid({
      scale: 0.07, height: 30, width: 22,
      sockets: { weapon: ['armR', [0, -9, 2]], off: ['armL', [0, -9, 2]], head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]] },
      hips(g) { g.box(-3, -2, -2, 3, 0, 1, DARK); g.box(-3, 0, -2, 3, 0, 1, WHITE2); for (const s of [-1, 1]) { g.box(s * 4, -2, -1, s * 5, 0, 1, TEAL); g.set(s * 5, -3, 0, TEAL); } },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, WHITE); g.box(-2, 1, 2, 2, 4, 2, DARK); g.box(-1, 2, 3, 1, 3, 3, G(GREEN));
        g.box(-3, 5, -3, 3, 6, 2, WHITE2); g.box(-1, 0, -3, 1, 4, -3, PINK);
      },
      head(g) {
        g.box(-3, 0, -3, 3, 6, 3, WHITE); g.box(-3, 1, 4, 3, 4, 4, VISOR);           // helmet + dark visor
        g.box(-2, 2, 5, -1, 3, 5, G(GREEN)); g.box(1, 2, 5, 2, 3, 5, G(GREEN));      // eyes glowing through the visor
        g.box(-4, 0, -3, -4, 5, 2, PINK); g.box(4, 0, -3, 4, 5, 2, PINK);
        for (const s of [-1, 1]) {                                                    // the big pink ear-pieces
          for (let i = 0; i < 7; i++) g.box(s * (3 + Math.floor(i / 2)), 6 + i, -1, s * (5 + Math.floor(i / 2)), 6 + i, 1, i > 4 ? PINK2 : PINK);
          g.box(s * 4, 6, 0, s * 4, 9, 0, DARK);
        }
      },
      armL(g) { H.arm(g, { sleeve: PINK, sleeveTo: 3, skin: WHITE2, len: 6 }); hand(g); },
      armR(g) { H.arm(g, { sleeve: PINK, sleeveTo: 3, skin: WHITE2, len: 6 }); hand(g); },
      legL(g) { H.leg(g, { pant: PINK, boot: WHITE, bootH: 5, sole: WHITE2 }); g.box(-1, -5, 2, 1, -2, 2, WHITE2); },
      legR(g) { H.leg(g, { pant: WHITE, boot: WHITE, bootH: 5, sole: WHITE2 }); g.box(-1, -6, -1, 1, -6, 1, PINK); g.box(-1, -3, 2, 1, -2, 2, PINK); },
      extra: { cable: { parent: 'hips', at: [0, -1, -3], draw(g) { for (let i = 0; i < 9; i++) g.set(Math.round(Math.sin(i * 0.7) * 1.5), -i, -Math.floor(i / 2), i === 8 ? G(0xff9ad0) : DARK); } } },
    });
  }

  /* ======================= COMPANIONS =======================
     Separate models that fly with their Agent around the field (they come and
     go with her). Float rig: body (root) -> head, armL / armR (wings), tail. */

  /* Yixuan's ink bird: black, gold-veined, purple-eyed. The wings are armL/armR
     so they can flap (rotation around Z). */
  {
    const INK = 0x141418, INK2 = 0x2a2a33, VEIN = G(0xffd65e), GOLD = 0xd9a838;
    const wing = s => g => {
      for (let i = 0; i <= 9; i++) {
        const h = i < 3 ? 3 : i < 7 ? 2 : 1, z0 = -Math.floor(i / 3);
        g.box(s * i, -h + 1, z0 - 2, s * i, 1, z0 + 1, i > 7 ? INK2 : INK);
      }
      g.line(0, 0, 0, s * 8, 0, -2, VEIN); g.line(s * 3, -1, 0, s * 9, 0, -3, VEIN);
    };
    MODELS.inkbird = {
      kind: 'float', scale: 0.09, height: 10, width: 22, companion: true,
      sockets: { head: ['head', [0, 1, 2]], chest: ['body', [0, 0, 2]], weapon: ['head', [0, 0, 4]] },
      parts: {
        body: { parent: null, at: [0, 0, 0], draw(g) { g.ell(0, 0, 0, 2, 2, 3, INK); g.box(0, -2, 1, 0, -2, 2, GOLD); g.line(-1, 1, 1, 1, -1, -2, VEIN); } },
        head: { parent: 'body', at: [0, 2, 3], draw(g) {
          g.ell(0, 0, 0, 1.6, 1.6, 1.6, INK2); g.set(-1, 1, 1, G(0xc060ff)); g.set(1, 1, 1, G(0xc060ff));
          g.box(0, 0, 2, 0, 0, 3, GOLD); g.set(0, 2, -1, VEIN); g.set(0, 3, -2, VEIN);
        } },
        armL: { parent: 'body', at: [2, 1, 0], draw: wing(1) },
        armR: { parent: 'body', at: [-2, 1, 0], draw: wing(-1) },
        tail: { parent: 'body', at: [0, 0, -3], draw(g) { for (let i = 0; i < 6; i++) g.box(-1 + (i > 3 ? 1 : 0), -Math.floor(i / 2), -i, 1 - (i > 3 ? 1 : 0), -Math.floor(i / 2), -i, i === 5 ? VEIN : INK); } },
      },
    };
  }

})();
