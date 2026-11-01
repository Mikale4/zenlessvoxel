# Zenless Voxel Zone — Battle Lab

An unofficial, non-commercial **Zenless Zone Zero** fan game in voxels, built around one question first: what should the
battles feel like? Like *Pallet to Pewter*, your Agents fight **on their own, in real time**, and **you are the commander**.
Flip on **AUTO** and the game gives the commands too.

**Play:** https://mikale4.github.io/zenlessvoxel/ (computer or phone). Settings are saved in your browser.

Or locally: open `index.html` in a browser (no server or install needed).

## What's in it so far

- **Four Agents**, with kits, skill names and core passives from the official game:
  **Caesar King** (Defense · Physical), **Burnice White** (Anomaly · Fire), **Aria** (Anomaly · Ether), **Yixuan** (Rupture · Auric Ink, with her ink bird).
- **Three battlegrounds:** **Blazewood** (the Sons of Calydon's Outer Ring camp, with explosive fuel barrels),
  **Yunkui Summit** (mountain temple, miasma pools), and a **Hollow Concert Stage** (the Angels of Delusion's venue, falling stage lights).
- **Twelve real enemies**, three encounters per battleground (Patrol, Elite, Notorious boss):
  Hollow Thug Raider / Pyromaniac / Bulky Enforcer and **Corrupted Overlord - Pompey**; Miasma Spawn, Miasma Walker - Arcavor,
  Miasma Ravager - Huskron and the **Miasma Priest**; Faun, Specter, Dullahan and **Notorious - Dead End Butcher**.
- **The Battle Lab**: every rule and number as a toggle or slider, saved in your browser.

## How the enemies fight

Each enemy's moves follow its official combat notes (Zenless Zone Zero Wiki) and the enemy attacks in the official skill
previews. Ground markings fill up until an area attack lands; *How to Play* lists every enemy's tricks.

| Enemy | How it fights |
|---|---|
| **Raider** | Shock-baton combos; backs off and **charges from far away**. A charge that ends in a wall or a barrel leaves it dazed. |
| **Pyromaniac** | Keeps its distance and **lobs molotovs**, up to a four-bottle hail; a flaming torch swipe if you get close. |
| **Bulky Enforcer** | A boxer: jab-cross, a **weaving hook** after a sidestep, uppercut (launches), a ground pound, a shoulder charge. |
| **Pompey** | Phase 1 on his **motorcycle** (rams, a wheelie slam, a burnout drift) with **hover guns**. Phase 2: longsword combos and his **rear wheel**, swung and thrown like a saw. Every wheel attack stores Ether; at three it explodes. A Defensive Assist on his marked moves **exposes a weakness**. |
| **Miasma Spawn** | Axe chops; summons **Miasma dust** around you that bursts after a delay (your Agents step out of it). |
| **Arcavor** | A steady stream of Miasma bolts from range while strafing; a **ballet pirouette** that spins in. |
| **Huskron** | Circles warily, darts in with a four-hit assault. Hit it in its **bristling guard** and it counters: parry the counter and it reels. |
| **Miasma Priest** | Glides; ribbon lashes, coral palms, talismans, Miasma rain. **Ribbon Flurry** flashes gold three times: those assists are free, and two or more in a row stagger her. Phase 2 (*Coral Bloom*) is faster and adds **coral spires** that erupt toward you. |
| **Faun** | Comes in groups; a long **charged slam** it will not be staggered out of. |
| **Specter** | **Rapid bursts of Ether bolts** from range; blinks in to cut. |
| **Dullahan** | Sword combos, a whirlwind; a **charged thrust** that a high-level skill (EX, Chain, Ultimate...) breaks. |
| **Dead End Butcher** | Pummels, hammer fists, a crushing leap. A high-level skill right after its combos deals **bonus Daze**. Phase 2 adds punch flurries and a **sweeping Ether laser**. It can turn **Ether Enhanced** (more ATK) until you Daze it enough. |

## Commands

| Key | Command |
|---|---|
| `Space` / `C` / `1` `2` `3` | Swap Agents. On an enemy's **gold flash** this is a **Defensive Assist** (parry, costs Assist Points); on a **red flash** (or with no Assist Points) the incoming Agent **Perfect Dodges**. While your Agent is **launched**, it's a **Quick Assist**. |
| `Q` | **Ultimate** when the on-field Agent's Decibels are at MAXIMUM (Yixuan: or 120 Technique Points). |
| `E` | Call an **EX Special Attack**. |
| `1` / `2` (or `←` / `→`) | Pick who follows up in a **Chain Attack**. |
| `Tab` or click | Change the focus target. |
| `T` | **AUTO** on/off. |
| `Esc` | **Tactics** menu (time stands still). |

Everything also has an on-screen button for phones.

## The rules (from the official game)

- Hits build **Daze**; a full bar **Stuns** (no actions, ×1.5 DMG taken). A heavy hit on a Stunned enemy opens a
  **Chain Attack**: 1 on normal enemies, 2 on elites, 3 on bosses (never more than the squad).
- **Perfect Assists** cost Assist Points (start with 6; each Chain Attack or Ultimate gives one back).
- A dodge just before a hit is a **Perfect Dodge** → slow motion → **Dodge Counter**.
- Each Agent fills her own **Decibels** (part spills to the squad): UPROAR 1,000 · BLASTING 2,000 · MAXIMUM 3,000.
- **Anomalies**: Physical → Assault (+Flinch), Fire → Burn, Ether → Corruption, Auric Ink → its own Corruption.
  A second, different anomaly triggers **Disorder**.
- Agent cores: Caesar's Perfect Block, guard stance, Retaliation and **Radiant Aegis**; Burnice's **Heat / Nitro-Fuel**,
  **Scorched** and **Afterburn**; Aria's **Fandom Power**, **Perfect Pitch** and **Abloom**, **Moment of Delusion**;
  Yixuan's **Sheer DMG**, **Adrenaline**, **Technique Points**, **Auric Array** and **Endless Talisman Suppression**.

## How it's built

Plain JavaScript and three.js (r128, vendored in `lib/`), no build step. Every model is voxels painted in code.

| File | What it does |
|---|---|
| `js/voxel.js` | Voxel grid, mesher (ambient occlusion), rigs |
| `js/models-*.js` | Agents, companions and enemies, matched to official art |
| `js/arenas.js` | The three battlegrounds |
| `js/data.js` | **All the numbers**: rules, kits, enemies, encounters, Battle Lab defaults |
| `js/battle.js` | The battle: damage, Daze/Stun/Chains, anomalies, assists, ultimates, hazards, camera |
| `js/ai.js` | Agent AI, enemy AI, the AUTO commander |
| `js/moves.js` | How the Agents move: poses, footwork and effects per skill, matched to the official skill previews |
| `js/enemy-moves.js` | How the enemies move and attack: poses, footwork, props (Pompey's bike and hover guns), effects |
| `js/anim.js` · `js/fx.js` · `js/audio.js` | Procedural animation, effects, synthesized sound |
| `js/hud.js` · `js/menu.js` · `js/main.js` | HUD, menus, boot and input |
| `tools/` | Dev only: a model/arena viewer and headless test scripts (`node tools/play.js`, `tools/moves-test.js`, `tools/enemy-test.js`) |

Zenless Zone Zero, its characters and enemies belong to HoYoverse / miHoYo. This is a non-commercial fan project, not
affiliated with or endorsed by them, and will come down on request.
