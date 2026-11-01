/* ============================================================================
   models-proxies.js -- the Proxies and their Bangboo, from the official art
   (Zenless Zone Zero Wiki portraits and in-game city models).

   WISE   silver-grey, messy side-swept hair over the eyes, teal eyes. An open
          navy bomber jacket with orange panels, a ribbed beige collar and
          orange lining, sleeves pushed up over black long sleeves; a black
          tee with a grey logo over a grey undershirt hem; a black chest strap
          with an orange tag; slim black trousers; white sneakers with orange
          laces.
   BELLE  a dark navy bob, longer at the sides, an orange "Z" hair clip, teal
          eyes and earrings. A cream hooded jacket with orange panels worn off
          the shoulders over black long sleeves; a black tee with a white
          print; a grey wrap skirt over orange shorts with a little device on
          her belt; one long black stocking with a white stripe (her left),
          one orange ankle sock (her right); chunky grey sneakers; a red
          fingerless glove.
   EOUS   their Bangboo: a white egg body with a black visor and lime ring
          eyes, one orange ear and one white ear with orange patches (both
          screwed on), an orange "01" bandana, a dark grey Random Play staff
          jacket, little white feet.
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, H = window.MB;

  /* ---------------------------------------------------------------- Wise */
  {
    const SKIN = 0xf6dcc8, HAIR = 0xaab0b9, HAIR2 = 0x7c838d, HAIRHI = 0xd3d7dd, EYE = 0x34a497;
    const NAVY = 0x27324c, NAVY2 = 0x1b2236, ORANGE = 0xf07a20, COLLAR = 0xa69b8c, TEE = 0x17171c, LOGO = 0x8d8d96, UNDER = 0x6c6c74, PANTS = 0x1b1b22, SHOE = 0xededf0, SOLE = 0x9a9aa2;
    MODELS.wise = H.humanoid({
      scale: 0.07, height: 28, width: 16,
      sockets: { head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]], weapon: ['armR', [0, -7, 1]] },
      hips(g) { g.box(-3, -2, -2, 3, 0, 1, PANTS); g.box(-3, 0, -2, 3, 0, 1, UNDER); g.box(-3, -1, 2, -1, -1, 2, 0x2a2a32); },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, TEE);                                           // the tee
        g.box(-1, 2, 2, 1, 5, 2, TEE); g.set(0, 4, 2, LOGO); g.set(-1, 3, 2, LOGO); g.set(1, 3, 2, LOGO); g.set(0, 2, 2, LOGO); // logo
        g.box(-3, 0, -3, 3, 6, -3, NAVY);                                         // the jacket: back, sides, open front
        g.box(-4, 0, -3, -4, 6, 2, NAVY); g.box(4, 0, -3, 4, 6, 2, NAVY);
        g.box(-3, 0, 2, -2, 6, 2, NAVY); g.box(2, 0, 2, 3, 6, 2, NAVY);
        g.box(-2, 3, 3, -2, 6, 3, NAVY2); g.box(-2, 0, 3, -2, 2, 3, ORANGE); g.box(2, 0, 3, 2, 6, 3, NAVY2); // the zip edges, orange lining low on one side
        g.box(-4, 0, -3, 4, 0, 2, COLLAR);                                        // ribbed hem
        g.box(-3, 6, -3, 3, 7, -2, COLLAR); g.box(-3, 7, -2, -2, 7, 2, COLLAR); g.box(2, 7, -2, 3, 7, 2, COLLAR); // ribbed collar
        g.box(4, 3, 0, 4, 5, 1, ORANGE);                                          // orange panel on the side
        g.box(1, 3, 3, 1, 6, 3, 0x111114); g.set(1, 3, 4, ORANGE);               // chest strap + tag
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x2a2a30, mouth: 0xc98a7e });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-3, 3], [-2, 4], [-1, 2], [0, 4], [1, 3], [2, 4], [3, 2], [-4, 2], [4, 3]] });
        g.box(-4, 8, -3, 3, 8, 2, HAIR); g.set(-1, 9, 0, HAIR); g.set(0, 9, -1, HAIRHI); g.set(1, 10, -1, HAIR); // messy crown, a cowlick
        g.box(-5, 1, -3, -5, 5, 1, HAIR); g.box(5, 1, -3, 5, 5, 0, HAIR2);        // side volume
        g.box(-4, -1, -4, 4, 0, -4, HAIR2); g.box(-2, -2, -4, 2, -2, -4, HAIR);   // nape
        g.set(-3, 2, 4, HAIRHI); g.set(2, 1, 4, HAIR); g.set(-4, 1, 3, HAIR);     // strands falling over one eye
        g.set(3, 6, 4, HAIRHI); g.set(-2, 6, 4, HAIRHI);
      },
      armL(g) { H.arm(g, { sleeve: NAVY, sleeveTo: 4, skin: TEE, glove: SKIN, gloveLen: 1 }); g.box(-1, -3, -1, 1, -3, 1, COLLAR); g.box(1, -1, -1, 1, -2, 1, ORANGE); },
      armR(g) { H.arm(g, { sleeve: NAVY, sleeveTo: 4, skin: TEE, glove: SKIN, gloveLen: 1 }); g.box(-1, -3, -1, 1, -3, 1, COLLAR); g.set(-1, -6, 1, ORANGE); },
      legL(g) { H.leg(g, { pant: PANTS, boot: SHOE, bootH: 2, sole: SOLE }); g.set(0, -8, 2, ORANGE); g.set(0, -9, 2, ORANGE); },
      legR(g) { H.leg(g, { pant: PANTS, boot: SHOE, bootH: 2, sole: SOLE }); g.set(0, -8, 2, ORANGE); g.set(0, -9, 2, ORANGE); },
    });
  }

  /* --------------------------------------------------------------- Belle */
  {
    const SKIN = 0xf8ddcc, HAIR = 0x283253, HAIR2 = 0x1a2038, HAIRHI = 0x45588a, EYE = 0x36ab9c;
    const CREAM = 0xe9ddcc, CREAM2 = 0xc4b8a6, ORANGE = 0xf07a20, BLACK = 0x18181d, WHITE = 0xf2f2f2, GREY = 0x6d6d77, GREY2 = 0x55555e, RED = 0xd6342c, TEAL = 0x2fbfa8, SHOE = 0xb6b8be;
    MODELS.belle = H.humanoid({
      scale: 0.068, height: 27, width: 16,
      sockets: { head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]], weapon: ['armR', [0, -7, 1]] },
      hips(g) {
        g.box(-3, -1, -2, 3, 0, 1, ORANGE); g.box(-3, 0, -2, 3, 0, 1, 0x2a2a30);                       // shorts, belt
        g.box(-4, -4, -3, 3, -1, 2, (x, y, z) => y === -4 && x > 0 ? -1 : (x + y) % 5 === 0 ? GREY2 : GREY); // the wrap skirt, shorter on her left
        g.box(-4, -2, 3, -2, -1, 3, GREY2);                                                          // the wrap's overlap
        g.box(-3, -1, 3, -2, 0, 3, 0xd9cdb6); g.set(-3, 0, 4, 0x3a8acf);           // the device on her belt
        g.box(-1, -3, 3, -1, -1, 3, RED);                                                            // a red strap hanging
      },
      torso(g) {
        g.box(-3, 0, -2, 3, 6, 1, BLACK);                                          // the tee
        g.box(-2, 1, 2, 2, 5, 2, BLACK); g.box(-1, 4, 2, 1, 4, 2, WHITE); g.set(-2, 3, 2, WHITE); g.set(0, 3, 2, WHITE); g.set(2, 3, 2, WHITE); g.box(-1, 2, 2, 1, 2, 2, WHITE); g.set(1, 1, 2, ORANGE); // the print
        g.set(0, 6, 2, TEAL); g.set(-1, 6, 2, 0x1f8f7d);                           // necklace
        // the cream jacket, slipped down off the shoulders: lower back and sides, a hood behind
        g.box(-4, 0, -3, 4, 4, -3, CREAM); g.box(-4, 0, -3, -4, 4, 1, CREAM); g.box(4, 0, -3, 4, 4, 1, CREAM);
        g.box(-4, 2, -3, -4, 3, -1, ORANGE); g.box(4, 1, -2, 4, 3, 0, ORANGE);     // orange panels
        g.box(-3, 4, -4, 3, 6, -4, CREAM2); g.box(-2, 5, -5, 2, 6, -5, CREAM);    // the hood, bunched at her back
        g.box(-4, 0, 2, -4, 3, 2, CREAM); g.box(4, 0, 2, 4, 3, 2, CREAM);
      },
      head(g) {
        H.head(g, { skin: SKIN, eye: EYE, lash: 0x1e1e2a, blush: 0xf4b8a8, mouth: 0xd2786e });
        H.hairCap(g, HAIR, { shade: HAIR2, strands: [[-3, 3], [-2, 4], [-1, 3], [1, 4], [2, 3], [3, 4], [-4, 2], [4, 2]] });
        g.box(-5, -1, -3, -5, 5, 2, HAIR); g.box(5, -1, -3, 5, 5, 2, HAIR);         // the bob, full at the sides
        g.box(-5, -2, 0, -5, -2, 2, HAIR2); g.box(5, -2, 0, 5, -2, 2, HAIR2);       // longer side locks
        g.box(-4, -1, -4, 4, 0, -4, HAIR); g.box(-4, -2, -4, 4, -2, -4, HAIR2);     // a short back
        g.box(-3, 8, -3, 3, 8, 2, HAIR); g.set(1, 9, 0, HAIRHI); g.set(-2, 7, 4, HAIRHI); g.set(3, 6, 4, HAIRHI);
        g.box(-5, 4, 2, -5, 6, 2, ORANGE); g.set(-5, 6, 3, ORANGE); g.set(-5, 4, 1, ORANGE); // the "Z" clip on her right
        g.set(-4, 1, 0, G(TEAL)); g.set(4, 1, 0, G(TEAL));                         // earrings
      },
      armL(g) { H.arm(g, { sleeve: CREAM, sleeveTo: 2, skin: BLACK, glove: RED, gloveLen: 2 }); g.box(-1, -2, -1, 1, -3, 1, CREAM); g.set(1, -2, 1, ORANGE); },
      armR(g) { H.arm(g, { sleeve: CREAM, sleeveTo: 2, skin: BLACK, glove: SKIN, gloveLen: 1 }); g.box(-1, -2, -1, 1, -3, 1, CREAM); g.box(-1, -5, -1, 1, -5, 1, G(TEAL)); },
      legL(g) { H.leg(g, { pant: BLACK, boot: SHOE, bootH: 2, sole: 0x55555e, skin: SKIN, skinFrom: 7, skinTo: 9 }); g.box(1, -6, -1, 1, 1, -1, WHITE); }, // long black stocking, white stripe
      legR(g) { H.leg(g, { pant: SKIN, boot: SHOE, bootH: 2, sole: 0x55555e }); g.box(-1, -7, -1, 1, -6, 1, ORANGE); },                                   // bare leg, orange sock
    });
  }

  /* ---------------------------------------------------------------- Eous
     A Bangboo rig: body (the egg, with the visor) -> earL, earR, armL, armR,
     legL, legR. lobby.js animates it (a waddle and ear wiggles). */
  {
    const WHITE = 0xf2f2f0, WHITE2 = 0xd8d8d6, BLACK = 0x111114, LIME = 0xb8ff3a, ORANGE = 0xf07a20, ORANGE2 = 0xc8601a, JACKET = 0x3e4048, JACKET2 = 0x2c2e34, SCREW = 0x9a9aa2;
    MODELS.eous = {
      kind: 'bangboo', scale: 0.05, height: 18, width: 12,
      sockets: { head: ['body', [0, 9, 0]] },
      parts: {
        body: { parent: null, at: [0, 3, 0], draw(g) {
          g.ell(0, 6, 0, 5, 7, 4.5, WHITE);                                         // the egg
          // the visor and its ring eyes, set into the egg's front surface
          const surf = (x, y) => Math.floor(5 * Math.sqrt(Math.max(0, 1 - (x / 5.5) ** 2 - ((y - 6) / 7.5) ** 2)));
          for (let x = -4; x <= 4; x++) for (let y = 5; y <= 12; y++) { if (Math.abs(x) === 4 && (y < 6 || y > 11)) continue; const z = surf(x, y); g.set(x, y, z, BLACK); g.set(x, y, z - 1, BLACK); }
          for (const s of [-1, 1]) for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) { const X = s * 2 + x, Y = 9 + y; g.set(X, Y, surf(X, Y), G(LIME)); }
          g.box(-5, 3, -4, 5, 5, 4, (x, y, z) => x * x / 30 + z * z / 22 > 1.05 ? -1 : ORANGE); // the bandana
          g.box(-1, 2, 5, 1, 4, 5, ORANGE); g.set(0, 1, 5, ORANGE2); g.set(-1, 3, 6, WHITE); g.set(1, 3, 6, WHITE); // "01" knot
          g.box(-5, -1, -4, 5, 2, 4, (x, y, z) => x * x / 30 + z * z / 22 > 1.05 ? -1 : JACKET); // the staff jacket
          g.box(-1, -1, 4, 1, 2, 4, JACKET2); g.set(3, 0, 4, WHITE2);
        } },
        earL: { parent: 'body', at: [2, 12, -1], draw(g) { g.box(-1, 0, -1, 1, 7, 0, WHITE); g.box(-1, 3, 1, 1, 6, 1, ORANGE); g.set(0, 4, 2, SCREW); g.set(0, 6, 2, SCREW); } },
        earR: { parent: 'body', at: [-2, 12, -1], draw(g) { g.box(-1, 0, -1, 1, 6, 0, ORANGE2); g.box(-1, 1, 1, 1, 5, 1, ORANGE); g.set(0, 3, 2, SCREW); g.set(0, 5, 2, SCREW); } },
        armL: { parent: 'body', at: [5, 2, 0], draw(g) { g.box(0, -3, -1, 1, 0, 1, JACKET); g.box(0, -4, -1, 1, -4, 1, WHITE); } },
        armR: { parent: 'body', at: [-5, 2, 0], draw(g) { g.box(-1, -3, -1, 0, 0, 1, JACKET); g.box(-1, -4, -1, 0, -4, 1, WHITE); } },
        legL: { parent: 'body', at: [2, 0, 0], draw(g) { g.box(-1, -3, -1, 1, 0, 1, WHITE); g.box(-1, -3, 2, 1, -3, 2, WHITE2); } },
        legR: { parent: 'body', at: [-2, 0, 0], draw(g) { g.box(-1, -3, -1, 1, 0, 1, WHITE); g.box(-1, -3, 2, 1, -3, 2, WHITE2); } },
      },
    };
  }
})();
