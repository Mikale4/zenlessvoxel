/* ============================================================================
   models-street.js -- the people (and Bangboo, and animals) of Sixth Street,
   from their portraits on the Zenless Zone Zero Wiki.

   SHOPKEEPERS
     chop       General Chop (Waterfall Soup): short, a red face, a tall white
                chef's hat and whites, and his second pair of arms, green
     tinmaster  Tin Master (Coff Cafe): a tall dark Intelligent Construct, a
                camera lens for a face ringed in orange, an orange wave apron
     elfy       Elfy (Bardic Needle): a construct, dark skin, teal hair in a high
                bun, a black top, a long white skirt trimmed green with pink flowers
     asha       Asha (Godfinger): a rabbit Thiren, long blonde hair and ears, a
                green patterned top, dark flared jeans, her phone
     susie      Susie (Box Galaxy): an orange cap with goggles, brown hair, a
                black tee under a mint pinafore, orange striped socks
     enzo       Enzo (Turbo): broad, a beard, an orange cap, sunglasses, an
                orange scarf, a green plaid shirt, a red tool apron, a mechanical
                left arm in orange and black, red shoes
     howl       Howl (the newsstand): a husky in a green striped vest
     buy, ask, change   the 141 Bangboo: black, rabbit-eared, orange ring eyes,
                white and blue 141 uniforms (Buy with the till, Ask a clipboard and
                a headset, Give Change a white headband)
     bb6        Bangboo 6, Random Play's: white, green eyes, an orange-and-black scarf
   REGULARS
     mewmew     Officer Mewmew: a white cat mascot in a blue police cap, a gold
                medal and a yellow sash
     yani       Mrs. Yani: short brown hair, a black top, a long green striped skirt
     jonah, roy schoolboys in navy blazers (Roy red-haired)
     luo, phil  Luo (glasses, white shirt, a shoulder bag), Phil (blue hair, a
                pale track jacket)
     owner      the cat's owner (long hair tied back, a dark coat, a scarf)
     cookie, chalky   the cats: a grey tabby, a white one with grey patches
   PASSERS-BY (this game's own: office workers, students, a courier, a Hollow
     Raider, the Dazed Dude, a builder)
   ========================================================================== */
(function () {
  'use strict';
  const G = VX.glow, H = window.MB;

  /* a person from a palette: o.top, o.pants (or o.skirt), o.shoe, o.hair (+ o.hair2), and hooks */
  function person(o) {
    const SK = o.skin || 0xf6d7c3;
    return H.humanoid({
      scale: o.scale || 0.068, height: o.height || 27, width: o.width || 15,
      sockets: { head: ['head', [0, 4, 0]], chest: ['torso', [0, 4, 2]], weapon: ['armR', [0, -7, 1]] },
      hips(g) {
        g.box(-3, -2, -2, 3, 0, 1, o.pants || o.skirt || 0x2a2a30); g.box(-3, 0, -2, 3, 0, 1, o.belt || o.pants || o.skirt || 0x2a2a30);
        if (o.skirt) g.box(-4, -(o.skirtLen || 5), -3, 4, -1, 2, (x, y) => o.skirtFn ? o.skirtFn(x, y) : o.skirt);
        if (o.hips) o.hips(g);
      },
      torso(g) { H.torso(g, { top: o.top, bot: o.top2 || o.top, belt: o.beltTop }); if (o.torso) o.torso(g); },
      head(g) {
        H.head(g, { skin: SK, eye: o.eye || 0x4a3a2a, lash: o.lash || 0x2a1d1d, mouth: o.mouth, blush: o.blush, glowEyes: o.glowEyes });
        if (o.hair != null) H.hairCap(g, o.hair, { shade: o.hair2 || o.hair, strands: o.strands });
        if (o.long) H.hairBack(g, o.hair, o.long, { shade: o.hair2 });
        if (o.glasses) { g.box(-3, 2, 4, -1, 3, 4, o.glasses); g.box(1, 2, 4, 3, 3, 4, o.glasses); g.set(0, 3, 4, o.glasses); }
        if (o.head) o.head(g);
      },
      armL(g) { H.arm(g, { sleeve: o.sleeve || o.top, sleeveTo: o.sleeveTo != null ? o.sleeveTo : 3, skin: o.armSkinL || SK, glove: o.gloveL || o.glove, gloveLen: o.gloveLen }); if (o.armL) o.armL(g); },
      armR(g) { H.arm(g, { sleeve: o.sleeve || o.top, sleeveTo: o.sleeveTo != null ? o.sleeveTo : 3, skin: o.armSkinR || SK, glove: o.glove, gloveLen: o.gloveLen }); if (o.armR) o.armR(g); },
      legL(g) { H.leg(g, { pant: o.legs || o.pants || SK, boot: o.shoe || 0x2a2a30, bootH: o.shoeH != null ? o.shoeH : 2, sole: o.sole || 0x3a3a3a, skin: SK, skinFrom: o.skinFrom, skinTo: o.skinTo }); if (o.legL) o.legL(g); },
      legR(g) { H.leg(g, { pant: o.legsR || o.legs || o.pants || SK, boot: o.shoe || 0x2a2a30, bootH: o.shoeH != null ? o.shoeH : 2, sole: o.sole || 0x3a3a3a, skin: SK, skinFrom: o.skinFrom, skinTo: o.skinTo }); if (o.legR) o.legR(g); },
      extra: o.extra,
    });
  }

  /* -------------------------------------------------------- shopkeepers */
  MODELS.chop = person({
    scale: 0.056, height: 30, skin: 0xd8342c, eye: 0x141416, lash: 0x141416, mouth: 0x5a1010,
    top: 0xf2f0ea, pants: 0xe8e6e0, shoe: 0x2a2a30, sleeve: 0xf2f0ea, glove: 0xf2f0ea, gloveLen: 2,
    head(g) {
      g.box(-3, 4, 3, -1, 4, 3, 0x141416); g.box(1, 4, 3, 3, 4, 3, 0x141416);                 // heavy brows
      g.box(-1, 1, 4, 1, 2, 4, 0xb8261e); g.box(-2, 0, 3, 2, 0, 4, 0x6a1410);                 // a big nose, the mouth
      g.box(-4, 5, -4, 4, 6, 4, 0xf4f4f0); g.box(-4, 7, -4, 4, 11, 4, (x, y, z) => (x * x + z * z > 22 && y > 8) ? -1 : 0xf8f8f4); // the chef's hat
      g.box(-4, 6, 4, 4, 6, 4, 0xd8d8d0);
    },
    torso(g) { g.box(-4, 0, -2, 4, 6, 2, 0xf2f0ea); for (const y of [1, 3, 5]) g.set(1, y, 3, 0xc8c8c0); g.box(-3, 6, -2, 3, 6, 2, 0xd8d8d0); },
    extra: {
      armL2: { parent: 'torso', at: [5, 3, -1], rot: [0, 0, 0.9], draw(g) { H.arm(g, { sleeve: 0x2a8a4a, sleeveTo: 4, skin: 0x3aa45a, len: 7 }); } },
      armR2: { parent: 'torso', at: [-5, 3, -1], rot: [0, 0, -0.9], draw(g) { H.arm(g, { sleeve: 0x2a8a4a, sleeveTo: 4, skin: 0x3aa45a, len: 7 }); } },
    },
  });
  MODELS.tinmaster = person({
    scale: 0.074, height: 28, skin: 0x2a2c32, eye: 0x141416, top: 0x141416, pants: 0x24262c, shoe: 0x5a3a30, glove: 0x6a6e76, gloveLen: 2, sleeve: 0x141416,
    head(g) {
      g.box(-3, 0, -3, 3, 6, 3, 0x2a2c32); g.box(-2, 1, 3, 2, 5, 3, 0x141416);                   // a dark head, a black face
      for (let x = -2; x <= 2; x++) for (let y = 1; y <= 5; y++) { const d = Math.hypot(x, y - 3); if (d > 1.2 && d < 2.4) g.set(x, y, 4, G(0xf08a2a)); else if (d <= 1.2) g.set(x, y, 5, 0x3a4a5a); }
      g.set(0, 3, 6, G(0x9ae8ff)); g.box(-1, 7, -1, 1, 7, 1, 0x6a6e76); g.set(0, 8, 0, G(0xf08a2a));   // the lens; a little cap light
      g.box(-4, 2, -1, -4, 4, 1, 0x6a6e76); g.box(4, 2, -1, 4, 4, 1, 0x6a6e76);
    },
    torso(g) { g.box(-3, 0, 2, 3, 5, 2, (x, y) => (Math.abs(Math.sin(x * 1.3 + y * 0.9)) < 0.35 ? 0xf8b05a : 0xe8782a)); g.box(-3, 5, 2, -2, 6, 2, 0xe8782a); g.box(2, 5, 2, 3, 6, 2, 0xe8782a); },
    hips(g) { g.box(-3, -5, 2, 3, -1, 2, (x, y) => (Math.abs(Math.sin(x * 1.3 + y * 0.9)) < 0.35 ? 0xf8b05a : 0xe8782a)); },
  });
  MODELS.elfy = person({
    scale: 0.068, skin: 0x2a2e44, eye: 0x5ae8d8, glowEyes: true, lash: 0x0e1018, mouth: 0x6a5a8a, hair: 0x2fbfa8, hair2: 0x1f8f7d,
    top: 0x141418, sleeve: 0x141418, sleeveTo: 8, shoe: 0x141418, legs: 0x2a2e44,
    skirt: 0xf2f0ea, skirtLen: 9, skirtFn: (x, y) => (y <= -8 || Math.abs(x) === 4 && y < -3) ? 0x2a8a5a : ((x * 3 + y * 5) % 11 === 0 ? 0xf08ab0 : 0xf2f0ea),
    head(g) { g.box(-2, 7, -2, 2, 10, 2, 0x2fbfa8); g.box(-1, 11, -1, 1, 11, 1, 0x1f8f7d); g.set(-3, 9, 0, 0xf2c230); g.set(3, 9, 0, 0xf2c230); g.box(-4, 2, -1, -4, 4, 1, 0x141418); g.box(4, 2, -1, 4, 4, 1, 0x141418); },
  });
  MODELS.asha = person({
    scale: 0.068, skin: 0xf6dcc8, eye: 0x5a8a3a, hair: 0xf0e0a8, hair2: 0xd8c488, long: 12,
    top: 0x7acc4a, sleeve: 0x7acc4a, sleeveTo: 2, pants: 0x2a3a5a, shoe: 0xe8e8e8,
    torso(g) { for (let y = 1; y < 6; y += 2) for (let x = -3; x <= 3; x += 2) g.set(x + (y % 4 ? 1 : 0), y, 2, 0x2a3a2a); g.box(-2, 5, 2, 2, 6, 2, 0x7acc4a); },
    head(g) { for (const s of [-1, 1]) { g.box(s * 2 - 1, 7, -1, s * 2, 14, 0, 0xf4ecd8); g.box(s * 2 - 1, 8, 1, s * 2, 13, 1, 0xf4b8c0); } },
    legL(g) { g.box(-2, -8, -2, 2, -6, 2, 0x2a3a5a); }, legR(g) { g.box(-2, -8, -2, 2, -6, 2, 0x2a3a5a); },
    armR(g) { g.box(-1, -8, 1, 1, -6, 1, 0x1c1c22); g.set(0, -7, 2, G(0x7ab8ff)); },
  });
  MODELS.susie = person({
    scale: 0.064, skin: 0xf8dcc8, eye: 0x5a3a2a, blush: 0xf4b8a8, hair: 0x6a3a2a, hair2: 0x4a2a1e, long: 5,
    top: 0x1c1c22, sleeve: 0x1c1c22, sleeveTo: 2, skirt: 0x8ae0c8, skirtLen: 4, legs: 0xf8dcc8, shoe: 0xe8e8e8, skinFrom: 4, skinTo: 9,
    legL(g) { g.box(-1, -7, -1, 1, -5, 1, (x, y) => y & 1 ? 0xf08a2a : 0xf8f0e0); }, legR(g) { g.box(-1, -7, -1, 1, -5, 1, (x, y) => y & 1 ? 0xf08a2a : 0xf8f0e0); },
    torso(g) { g.box(-3, 0, 2, 3, 5, 2, 0x8ae0c8); g.box(-3, 5, 2, -2, 6, 2, 0x8ae0c8); g.box(2, 5, 2, 3, 6, 2, 0x8ae0c8); g.box(-1, 2, 3, 1, 3, 3, 0xf2c230); },
    head(g) { g.box(-4, 6, -4, 4, 8, 4, 0xf08a2a); g.box(-4, 6, 5, 4, 6, 6, 0xf08a2a); g.box(-3, 7, 4, -1, 8, 5, 0x3a6a8a); g.box(1, 7, 4, 3, 8, 5, 0x3a6a8a); g.box(-4, 7, 4, 4, 7, 4, 0x2a2a30); },
  });
  MODELS.enzo = person({
    scale: 0.074, width: 18, skin: 0xd8a882, eye: 0x141416, top: 0x2a6a4a, pants: 0x24262c, shoe: 0xd8302a, sleeveTo: 4,
    torso(g) { g.box(-4, 0, -3, 4, 6, 2, (x, y, z) => ((x + 20) % 3 === 0 || y % 3 === 0) ? 0x1e4a34 : ((x + y) & 1 ? 0x2a6a4a : 0x3a7a5a)); g.box(-3, 0, 3, 3, 4, 3, 0xc8302a); g.box(-3, 1, 4, -1, 2, 4, 0x6a6e76); g.box(1, 1, 4, 3, 2, 4, 0x5a3a2a); g.box(-3, 5, -2, 3, 6, 3, 0xf08a2a); },
    head(g) {
      g.box(-4, 5, -4, 4, 7, 4, 0xf08a2a); g.box(-4, 5, 5, 4, 5, 6, 0xf08a2a);                  // the cap
      g.box(-3, 2, 4, 3, 3, 4, 0x141416); g.box(-3, -1, 3, 3, 1, 4, 0x6a4a2a); g.box(-2, -2, 3, 2, -2, 4, 0x6a4a2a);   // sunglasses, the beard
      g.box(-4, -1, -4, 4, 4, -4, 0x6a4a2a);
    },
    hips(g) { g.box(-3, -4, 2, 3, -1, 2, 0xc8302a); },
    armL(g) { g.box(-1, -7, -1, 1, 0, 1, (x, y) => (y % 3 === 0) ? 0x1c1c22 : 0xf08a2a); g.box(-2, -8, -2, 2, -7, 2, 0xf08a2a); g.set(0, -3, 2, G(0xffd23a)); },
  });

  /* Bangboo: an egg body with a visor and ring eyes, two ears, little arms and feet (as Eous) */
  function bangboo(o) {
    const B = o.body, V = o.visor || 0x111114, E = o.eye;
    return {
      kind: 'bangboo', scale: 0.05, height: 18, width: 12,
      sockets: { head: ['body', [0, 9, 0]] },
      parts: {
        body: { parent: null, at: [0, 3, 0], draw(g) {
          g.ell(0, 6, 0, 5, 7, 4.5, B);
          const surf = (x, y) => Math.floor(5 * Math.sqrt(Math.max(0, 1 - (x / 5.5) ** 2 - ((y - 6) / 7.5) ** 2)));
          for (let x = -4; x <= 4; x++) for (let y = 5; y <= 12; y++) { if (Math.abs(x) === 4 && (y < 6 || y > 11)) continue; const z = surf(x, y); g.set(x, y, z, V); g.set(x, y, z - 1, V); }
          for (const s of [-1, 1]) for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) { const X = s * 2 + x, Y = 9 + y; g.set(X, Y, surf(X, Y), G(E)); }
          if (o.outfit) g.box(-5, -1, -4, 5, 4, 4, (x, y, z) => x * x / 30 + z * z / 22 > 1.05 ? -1 : o.outfit(x, y, z));
          if (o.band) g.box(-5, 12, -4, 5, 12, 4, (x, y, z) => x * x / 30 + z * z / 22 > 1.05 ? -1 : o.band);
          if (o.extra) o.extra(g);
        } },
        earL: { parent: 'body', at: [2, 12, -1], draw(g) { g.box(-1, 0, -1, 1, 7, 0, B); if (o.inner) g.box(-1, 2, 1, 1, 6, 1, o.inner); } },
        earR: { parent: 'body', at: [-2, 12, -1], draw(g) { g.box(-1, 0, -1, 1, 7, 0, B); if (o.inner) g.box(-1, 2, 1, 1, 6, 1, o.inner); } },
        armL: { parent: 'body', at: [5, 2, 0], draw(g) { g.box(0, -3, -1, 1, 0, 1, o.arm || B); g.box(0, -4, -1, 1, -4, 1, o.hand || B); if (o.holdL) o.holdL(g); } },
        armR: { parent: 'body', at: [-5, 2, 0], draw(g) { g.box(-1, -3, -1, 0, 0, 1, o.arm || B); g.box(-1, -4, -1, 0, -4, 1, o.hand || B); if (o.holdR) o.holdR(g); } },
        legL: { parent: 'body', at: [2, 0, 0], draw(g) { g.box(-1, -3, -1, 1, 0, 1, o.foot || B); g.box(-1, -3, 2, 1, -3, 2, o.foot || B); } },
        legR: { parent: 'body', at: [-2, 0, 0], draw(g) { g.box(-1, -3, -1, 1, 0, 1, o.foot || B); g.box(-1, -3, 2, 1, -3, 2, o.foot || B); } },
      },
    };
  }
  const UNI = (x, y, z) => (z >= 2 && y < 3) ? 0x2a4ab8 : 0xf2f2f0;               // the 141 uniform: white, a blue apron
  MODELS.buy = bangboo({ body: 0x1c1c22, eye: 0xf08a2a, inner: 0xf2f2f0, outfit: UNI, arm: 0xf2f2f0, foot: 0x1c1c22, holdL: g => g.box(-1, -7, 0, 3, -4, 3, 0x8a6a4a) });
  MODELS.ask = bangboo({ body: 0x1c1c22, eye: 0xf08a2a, inner: 0xf2f2f0, outfit: UNI, arm: 0xf2f2f0, foot: 0x1c1c22, extra: g => { g.box(-6, 9, -1, -6, 12, 1, 0x3a3c42); g.set(-6, 9, 2, 0x3a3c42); }, holdR: g => g.box(-2, -7, 1, 0, -3, 2, 0xd8c8a0) });
  MODELS.change = bangboo({ body: 0x1c1c22, eye: 0xf08a2a, inner: 0xf2f2f0, outfit: UNI, arm: 0xf2f2f0, foot: 0x1c1c22, band: 0xf8f8f4 });
  MODELS.bb6 = bangboo({ body: 0xf2f2f0, eye: 0x9aff5a, inner: 0x1c1c22, outfit: (x, y) => y > 2 ? 0xf08a2a : 0x1c1c22, foot: 0xf2f2f0 });

  /* animals: a quadruped rig (body -> head, legs, tail), sat or lying by the lobby */
  function animal(o) {
    const C = o.coat, C2 = o.coat2 || C, s = o.scale;
    return {
      kind: 'quad', scale: s, height: o.h || 10, width: o.w || 8,
      sockets: { head: ['head', [0, 2, 2]] },
      parts: {
        body: { parent: null, at: [0, o.hip || 6, 0], draw(g) { g.ell(0, 0, 0, o.bw || 3, o.bh || 3, o.bl || 6, (x, y, z) => o.pat ? o.pat(x, y, z) : (y < -1 ? C2 : C)); if (o.vest) g.box(-4, -2, -2, 4, 3, 4, (x, y, z) => (x * x / 14 + (y - 0.5) * (y - 0.5) / 9 > 1.05) ? -1 : o.vest(x, y, z)); } },
        head: { parent: 'body', at: [0, o.headY || 3, o.bl || 6], draw(g) {
          g.ell(0, 1, 1, o.hw || 3, o.hh || 3, o.hl || 3, (x, y, z) => o.face ? o.face(x, y, z) : C);
          if (o.snout) g.box(-1, -1, 3, 1, 1, 3 + o.snout, C2);
          g.set(-1, 2, (o.hl || 3) + 1, o.eye || 0x2a3a1a); g.set(1, 2, (o.hl || 3) + 1, o.eye || 0x2a3a1a); g.set(0, o.snout ? 0 : 0, (o.hl || 3) + 1 + (o.snout || 0), 0x1c1c22);
          for (const sx of [-2, 2]) g.box(sx - 1, 3, 0, sx, 3 + (o.ear || 3), 1, (x, y) => y > 4 + (o.ear || 3) - 2 ? C : C);
        } },
        legFL: { parent: 'body', at: [2, -1, (o.bl || 6) - 2], draw(g) { g.box(-1, -(o.leg || 5), -1, 0, 0, 0, C2); } },
        legFR: { parent: 'body', at: [-2, -1, (o.bl || 6) - 2], draw(g) { g.box(0, -(o.leg || 5), -1, 1, 0, 0, C2); } },
        legBL: { parent: 'body', at: [2, -1, -(o.bl || 6) + 2], draw(g) { g.box(-1, -(o.leg || 5), -1, 0, 0, 0, C2); } },
        legBR: { parent: 'body', at: [-2, -1, -(o.bl || 6) + 2], draw(g) { g.box(0, -(o.leg || 5), -1, 1, 0, 0, C2); } },
        tail: { parent: 'body', at: [0, 1, -(o.bl || 6)], draw(g) { for (let i = 0; i < (o.tail || 5); i++) g.box(0, Math.round(i * 0.5), -i, 0, Math.round(i * 0.5), -i, o.tailCol ? o.tailCol(i) : C); } },
      },
    };
  }
  MODELS.howl = animal({ scale: 0.05, coat: 0x8a8e96, coat2: 0xf2f2f0, eye: 0x6ab8f0, hip: 7, leg: 6, bl: 6, bw: 3, bh: 3, snout: 2, ear: 3, tail: 6,
    face: (x, y) => (y < 1 || Math.abs(x) < 1) ? 0xf2f2f0 : 0x8a8e96, tailCol: i => i > 3 ? 0xf2f2f0 : 0x8a8e96,
    vest: (x, y, z) => (Math.floor(x + 10) % 2 ? 0x2a8a4a : 0x1e6a38) });
  MODELS.cookie = animal({ scale: 0.032, coat: 0x8a8a86, coat2: 0x6a6a66, eye: 0x9ad83a, hip: 6, leg: 5, ear: 2, tail: 8,
    pat: (x, y, z) => (Math.abs(z) % 3 === 0 ? 0x4a4a48 : (y < -1 ? 0xb0b0aa : 0x8a8a86)), face: (x, y) => (y < 0 ? 0xd8d8d2 : (Math.abs(x) === 1 && y > 2 ? 0x4a4a48 : 0x8a8a86)) });
  MODELS.chalky = animal({ scale: 0.032, coat: 0xf2f2ee, coat2: 0xd8d8d4, eye: 0x5ab0f0, hip: 6, leg: 5, ear: 2, tail: 8,
    pat: (x, y, z) => (x > 1 && z > 1 && z < 4) || (x < -1 && z < -2) ? 0x8a8a86 : 0xf2f2ee });

  /* --------------------------------------------------------- regulars */
  MODELS.mewmew = person({
    scale: 0.076, width: 18, skin: 0xf4f4f0, eye: 0x1c1c22, top: 0xf4f4f0, pants: 0xf4f4f0, shoe: 0xf4f4f0, sleeve: 0xf4f4f0,
    head(g) {
      g.ell(0, 3, 0, 5, 4, 4, 0xf8f8f4); g.box(-2, 3, 4, -1, 4, 5, 0x1c1c22); g.box(1, 3, 4, 2, 4, 5, 0x1c1c22); g.set(0, 2, 5, 0xf0a0a8);      // a big head, the eyes, the nose
      for (const s of [-1, 1]) g.box(s * 3 - 1, 7, -1, s * 3, 9, 1, 0xf8f8f4);
      g.box(-4, 7, -3, 4, 8, 3, 0x2a3a8a); g.box(-4, 7, 4, 4, 7, 5, 0x1c2a6a); g.set(0, 8, 4, G(0xf2c230));                                    // the police cap and badge
    },
    torso(g) { g.box(-4, 0, -2, 4, 6, 2, 0xf4f4f0); for (let i = 0; i < 6; i++) g.box(-3 + i, i, 3, -2 + i, i, 3, 0xf2c230); g.box(-1, 4, 3, 1, 5, 4, 0xf2c230); g.set(0, 3, 4, 0xd8302a); g.box(-4, 6, -2, 4, 6, 2, 0x2a3a8a); },
  });
  MODELS.yani = person({ scale: 0.064, skin: 0xf0d0b8, eye: 0x4a3a2a, hair: 0x6a4a32, hair2: 0x4a3222, top: 0x1c1c22, sleeve: 0x1c1c22, sleeveTo: 2, legs: 0xf0d0b8, shoe: 0xe8e8e0,
    skirt: 0x8a9a6a, skirtLen: 8, skirtFn: (x, y) => (x & 1 ? 0x7a8a5a : 0x9aaa7a), head(g) { g.set(-3, 6, 4, 0xf2c230); g.set(3, 6, 4, 0xf2c230); },
    armL(g) { g.box(-1, -9, -1, 2, -7, 2, 0x8a5a3a); } });
  const blazer = (hair, hair2) => person({ scale: 0.06, skin: 0xf6d7c3, eye: 0x3a2a2a, hair, hair2, top: 0x24304a, sleeve: 0x24304a, sleeveTo: 8, pants: 0x1c2232, shoe: 0x1c1c22,
    torso(g) { g.box(-1, 2, 2, 1, 6, 2, 0xf2f2f0); g.set(0, 5, 3, 0xc8302a); g.box(-3, 0, 2, -2, 6, 2, 0x24304a); g.box(2, 0, 2, 3, 6, 2, 0x24304a); } });
  MODELS.jonah = blazer(0x6a4a32, 0x4a3222);
  MODELS.roy = blazer(0xb8302a, 0x8a2420);
  MODELS.luo = person({ scale: 0.069, skin: 0xf0d0b8, eye: 0x2a2a2a, hair: 0x1c1c22, glasses: 0x1c1c22, top: 0xe8ecf0, sleeve: 0xe8ecf0, sleeveTo: 7, pants: 0x24283a, shoe: 0x1c1c22,
    torso(g) { g.box(-3, 6, -2, 3, 6, 1, 0xe8ecf0); g.box(3, 0, -3, 3, 6, -3, 0x1c1c22); g.box(-3, 5, 2, -2, 5, 2, 0x1c1c22); },
    hips(g) { g.box(3, -3, -3, 5, 1, 2, 0x1c1c22); } });
  MODELS.phil = person({ scale: 0.069, skin: 0xf6d7c3, eye: 0x2a3a6a, hair: 0x2a3a8a, hair2: 0x1e2a6a, top: 0xc8d8e8, sleeve: 0xc8d8e8, sleeveTo: 8, pants: 0x1c2232, shoe: 0xe8e8e8,
    torso(g) { g.box(-1, 0, 2, 1, 6, 2, 0x8a9aa8); g.box(-3, 6, -2, 3, 6, 2, 0x1e2a4a); } });
  MODELS.owner = person({ scale: 0.07, skin: 0xf0d0b8, eye: 0x3a2a1a, hair: 0x5a4030, hair2: 0x3e2c20, long: 7, top: 0x2a2624, sleeve: 0x2a2624, sleeveTo: 8, pants: 0x1c1c1e, shoe: 0x3a2a20,
    torso(g) { g.box(-3, 4, 2, 3, 6, 2, 0xb8a888); g.box(-1, 0, 2, 1, 4, 2, 0x3a3634); } });

  /* ------------------------------------------------------- passers-by */
  MODELS.office_m = person({ scale: 0.069, skin: 0xf0d0b8, eye: 0x2a2a2a, hair: 0x2a2220, top: 0xf2f4f6, sleeve: 0xf2f4f6, sleeveTo: 7, pants: 0x3a3e48, shoe: 0x1c1c22,
    torso(g) { g.box(0, 1, 2, 0, 5, 2, 0x2a4a8a); g.set(0, 5, 3, 0x2a4a8a); } , armR(g) { g.box(-1, -9, -1, 1, -8, 3, 0x2a2a30); } });
  MODELS.office_f = person({ scale: 0.066, skin: 0xf8dcc8, eye: 0x3a2a2a, hair: 0x3a2a24, hair2: 0x2a1e1a, long: 6, top: 0xf0eee8, sleeve: 0xf0eee8, sleeveTo: 6, skirt: 0x2a3048, skirtLen: 5, legs: 0xf8dcc8, shoe: 0x1c1c22,
    torso(g) { g.box(-3, 0, -3, 3, 6, -3, 0x2a3048); } });
  MODELS.student_f = person({ scale: 0.062, skin: 0xf8dcc8, eye: 0x4a2a3a, blush: 0xf4b8a8, hair: 0x2a1e1a, long: 8, top: 0xf2f2f0, sleeve: 0x24304a, sleeveTo: 8, skirt: 0x24304a, skirtLen: 4, legs: 0x1c1c22, shoe: 0x3a2a20,
    torso(g) { g.box(-3, 0, 2, -2, 6, 2, 0x24304a); g.box(2, 0, 2, 3, 6, 2, 0x24304a); g.box(-1, 4, 3, 1, 5, 3, 0xc8302a); } });
  MODELS.student_m = blazer(0x2a2220, 0x1a1614);
  MODELS.courier = person({ scale: 0.07, skin: 0xd8a882, eye: 0x2a2a2a, hair: 0x1c1c22, top: 0xf2c230, sleeve: 0xf2c230, sleeveTo: 4, pants: 0x3a3c42, shoe: 0x1c1c22,
    head(g) { g.box(-4, 6, -4, 4, 7, 4, 0x2a2a30); g.box(-4, 6, 5, 4, 6, 6, 0x2a2a30); }, torso(g) { g.box(-3, 2, 2, 3, 3, 2, 0x2a2a30); g.box(-4, 1, -5, 4, 7, -3, 0xb08a5a); } });
  MODELS.raider = person({ scale: 0.07, skin: 0xf0d0b8, eye: 0xd8302a, top: 0x3a3e46, sleeve: 0x3a3e46, sleeveTo: 8, pants: 0x24262c, shoe: 0x1c1c22, glove: 0x1c1c22,
    head(g) { g.box(-4, 0, -4, 4, 7, 4, (x, y, z) => (z >= 3 && y > 0 && y < 5 && Math.abs(x) < 3) ? -1 : 0x3a3e46); g.box(-3, 0, 4, 3, 2, 4, 0x1c1c22); } });
  MODELS.dude = person({ scale: 0.069, skin: 0xf0c8b0, eye: 0x2a2a2a, hair: 0x4a3a2a, top: 0xe8e4dc, sleeve: 0xe8e4dc, sleeveTo: 7, pants: 0x4a4e58, shoe: 0x3a2a20, blush: 0xe88a8a,
    torso(g) { g.box(0, 2, 2, 1, 5, 2, 0xb8302a); g.box(-3, 0, 2, -2, 1, 2, 0xe8e4dc); } });
  MODELS.builder = person({ scale: 0.071, skin: 0xd8a882, eye: 0x2a2a2a, top: 0x5a6a7a, sleeve: 0x5a6a7a, sleeveTo: 8, pants: 0x3a4a5a, shoe: 0x6a4a2a,
    head(g) { g.box(-4, 5, -4, 4, 8, 4, 0xf2c230); g.box(-4, 5, 5, 4, 5, 5, 0xf2c230); }, torso(g) { g.box(-3, 0, 2, 3, 6, 2, (x, y) => y === 3 ? 0xe8e8e0 : 0xf08a2a); } });

  /* the townsfolk whose busts the menus show */
  window.TOWN_FACES = ['chop', 'tinmaster', 'elfy', 'asha', 'susie', 'enzo', 'howl', 'buy', 'ask', 'change', 'bb6', 'mewmew', 'yani', 'jonah', 'roy', 'luo', 'phil', 'owner', 'cookie', 'chalky', 'office_m', 'office_f', 'student_f', 'student_m', 'courier', 'raider', 'dude', 'builder'];
})();
