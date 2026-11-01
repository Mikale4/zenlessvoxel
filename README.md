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
| `js/anim.js` · `js/fx.js` · `js/audio.js` | Procedural animation, effects, synthesized sound |
| `js/hud.js` · `js/menu.js` · `js/main.js` | HUD, menus, boot and input |
| `tools/` | Dev only: a model/arena viewer and headless test scripts (`node tools/play.js`) |

Zenless Zone Zero, its characters and enemies belong to HoYoverse / miHoYo. This is a non-commercial fan project, not
affiliated with or endorsed by them, and will come down on request.
