# Zenless Voxel Zone — Battle Lab

An unofficial, non-commercial **Zenless Zone Zero** fan game in voxels, built around one question first: what should the
battles feel like? Like *Pallet to Pewter*, your Agents fight **on their own, in real time**, and **you are the commander**: you move the
Agent on the field and give the commands. Flip on **AUTO** and the game moves her and gives the commands too.

**Play:** https://mikale4.github.io/zenlessvoxel/ (computer or phone). Settings are saved in your browser.

Or locally: open `index.html` in a browser (no server or install needed).

## What's in it so far

- **Eight Agents**, with kits, skill names and core passives from the official game:
  **Caesar King** (Defense · Physical), **Burnice White** (Anomaly · Fire), **Aria** (Anomaly · Ether), **Yixuan** (Rupture · Auric Ink, with her ink bird),
  **Qingyi** (Stun · Electric), **Ju Fufu** (Stun · Fire, with Hu Wei, her tiger cauldron), **Orphie & Magus** (Attack · Fire: Magus is her
  sentient mechanical tail, and the Obol Squad's captain) and **Remielle Dan** (Anomaly · Lumiflux).
- **Three battlegrounds:** **Blazewood** (the Sons of Calydon's Outer Ring camp, with explosive fuel barrels),
  **Yunkui Summit** (mountain temple, miasma pools), and a **Hollow Concert Stage** (the Angels of Delusion's venue, falling stage lights).
- **Twelve real enemies**, three encounters per battleground (Patrol, Elite, Notorious boss):
  Hollow Thug Raider / Pyromaniac / Bulky Enforcer and **Corrupted Overlord - Pompey**; Miasma Spawn, Miasma Walker - Arcavor,
  Miasma Ravager - Huskron and the **Miasma Priest**; Faun, Specter, Dullahan and **Notorious - Dead End Butcher**.
- **Proxy Clash**: Agents against Agents, a rival Proxy's squad against yours, in five modes: 1v1 Duel, 2v2 and 3v3
  Tag Team (one on the field at a time), 2v2 and 3v3 All-Out (everyone at once).
- **The Battle Lab**: every rule and number as a toggle or slider, saved in your browser.

## Signing in, and Sixth Street

As in Post Parade, the title screen runs a **live battle** behind the logo (a random squad on AUTO). **Register a Proxy**
(a name and password, kept in this browser; each Proxy has its own squad, Battle Lab settings and records) or **log in**.
A new Proxy chooses who they are, as in the real game: **Wise** or **Belle**, the siblings who run Random Play. The other
one minds the shop.

Home is **Sixth Street at dusk**, in voxels, to walk around in. **Random Play** (walk in through the door: its front
comes away) has the **Hollow Deep Dive System** in the back room (into battle), the **shop computer** (Battle Lab), the
**tutorial tapes** (How to Play) and the **notice board** by the door (your records: dives, clears, best rank on every
battleground). Your sibling is behind the counter, **Eous** waddles after you, and the Agents are out on the street:
Caesar by her bike, Burnice at Chop's Noodles, Aria at Bardic Needle, Yixuan meditating on a bench under her bird,
Qingyi on patrol by the notice board, Ju Fufu bouncing on her toes beside Hu Wei, Orphie at the end of the street with
Magus, her tail, curled behind her, and Remielle in the middle of it all, one hand raised to the dusk. Talk
to one to read her file and take her into the Hollow. Walk with **WASD / arrows** (Shift runs), **E** uses what has a
sign over it; or click / tap where to go (a sign: go and use it), or drag to steer on a phone. The dock at the bottom
goes straight to every place. Out front, two **arcade cabinets** run **Proxy Clash**.

## Proxy Clash: Agent against Agent

At the arcade cabinets in front of Random Play, a **rival Proxy** dials in with a squad of their own. Pick a mode, your
squad, the rival, their squad (or let them choose: mirror matches are fine, their Agents stand on red rings), the
battleground, and fight. Five modes:

| Mode | How it plays |
|---|---|
| **1v1 Duel** | One Agent each. No swaps, no assists, no Chain Attacks: just the two of them. |
| **2v2 Tag Team** · **3v3 Tag Team** | One Agent per side on the field at a time, as in the Hollow: swap, Defensive Assist, Quick Assist, Chain Attack. |
| **2v2 All-Out** · **3v3 All-Out** | Every Agent of both squads on the field at once. |

In **All-Out** you **lead** one Agent (the yellow ring): you move her (AUTO off) and call her EX and Ultimate; `W` / `Q`
or a squad card switch whom you lead. The others fight on their own and fire their own Ultimates. On a flash aimed at any
of yours, `W` / `Q` sends a teammate dashing in to **parry** it (gold) or **pull her clear** (red); when one is launched,
a teammate's **Quick Assist**. Your teammates spread out over their rivals rather than all piling onto one, and theirs do
the same.

Their Agents fight with **the same kits as yours**: basic combos and their cancels, Specials, EX Specials and the
follow-ups the kits chain, each Agent's core move (Burnice's Mixed Flame Blend and her hop back, Aria's Perfect Pitch,
Caesar's Dead End, Qingyi's Enchanted Moonlit Blossoms, Ju Fufu's spin, Orphie's Heat Charge, Remielle's Rainbow's End),
Hu Wei (a rival's jumps on your Agents too), a rival Orphie flashing in from the bench for Corrosive Flash, dodges,
Perfect Dodges and Dodge Counters, Perfect Blocks (Caesar, Yixuan), Ultimates. Their Proxy
rotates the squad, pulls a hurt Agent out, and spends **Assist Points**: a teammate can step in, **parry one of your
heavy hits** and follow up. You command yours exactly as in the Hollow.

- Their **heavy hits flash gold**: a Defensive Assist parries. The finisher of their **Ultimate flashes red**: dodge it
  (the big area hits are marked on the ground).
- Only a **high-level skill's heavy hit** (EX Special, Dodge Counter, Chain Attack, Ultimate, Assist Follow-Up, Quick
  Assist) staggers an Agent, theirs or yours. Anything else is a flinch.
- **Daze works both ways.** A Stunned rival is open to your Chain Attacks; and their landed hits Daze your Agents (the
  orange bar under HP). Stunned, she cannot act, takes ×1.5 DMG, and a heavy hit on her opens a **rival Chain Attack**
  (up to two per Stun). In Tag Team, swap her out; the sharper rivals swap theirs out of a Stun too.
- Anomalies, Disorder and your Agents' buffs all work on them.
- Both squads get the same extra HP (Battle Lab: *Agent HP in Proxy Clash*, ×18 by default; All-Out runs deeper still).
- The panel under the clock shows their squad and Assist Points; the target bar says when one has an EX or her
  Ultimate ready.

| Rival | Tier | How they play |
|---|---|---|
| **Patch** | Rookie | Two weeks into the job: slow swaps, few dodges, rarely an Assist, never ducks out of a Stun. |
| **Vesper** | Ace | Methodical: rotates on a schedule, saves Assists for your big hits, fires Ultimates when they count. A fair fight. |
| **Mirage** | Legend | Signs every job "Phaethon". Near-perfect dodges, a parry waiting for every heavy hit, out of a Stun before you can chain it. |

The rival Proxies are this game's own characters. The notice board keeps your record against each, per mode, with the
best rank and fastest win.

**Balance.** Their Agents' damage is set per rival and per mode (`data.js` RIVALS): it runs above your Agents' because
yours carry buffs, Anomalies, Disorders, Abloom, Afterburn, Refringe, Subjugation, Tiger's Roar, Zeroed In and the Aegis
that theirs do not. A rival's Hu Wei and Corrosive Flash hit at half that multiplier (they fire on a timer, with no breathers),
and a rival waits about as long for Moonlit Blossoms, the spin and Heat Charge as your Agents take to earn them. It was
calibrated with `tools/clash-test.js` (`batch=6 mode=all3`, ...): your squad on AUTO against each rival, over random
matchups drawn from all eight Agents on all three battlegrounds. How often AUTO won at the final settings (small
samples, so read them as rough):

| Mode | vs Patch | vs Vesper | vs Mirage | A fight lasts |
|---|---|---|---|---|
| 1v1 Duel | 8 of 8 | 5 of 8 | 1 of 8 | 25-60 s |
| 2v2 Tag Team | 6 of 6 | 5 of 6 | 1 of 6 | 40-55 s |
| 2v2 All-Out | 5 of 6 | 4 of 6 | 1 of 6 | 35-45 s |
| 3v3 Tag Team | 6 of 6 | 2 of 6 | 3 of 6 | 55-75 s |
| 3v3 All-Out | 6 of 6 | 6 of 8 | 3 of 8 | 30-45 s |

Vesper comes out a little easier than before the new Agents (22 of 34 overall, against about half), mostly from the
new Agents' own mechanics on your side; Mirage still wins about three fights in four. A single fight swings a lot
with the matchup (two Anomaly Agents lean on Anomalies that do not land on Agents; a Yixuan and Caesar pair hits hard;
a Remielle needs a teammate's Anomaly to Refringe). You playing by hand will land somewhere else entirely: tell me what
feels off.

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
| `←` `↑` `↓` `→` | **Move** the Agent on the field (AUTO off). She still fights on her own: the moment you let go she attacks whatever is in range. |
| `W` / `Q` / `1` `2` `3` | Swap to the next / previous Agent / that slot. On an enemy's **gold flash** this is a **Defensive Assist** (parry, costs Assist Points); on a **red flash** (or with no Assist Points) the incoming Agent **Perfect Dodges**. While your Agent is **launched**, it's a **Quick Assist**. |
| `E` | Call an **EX Special Attack**. |
| `R` | **Ultimate** when the on-field Agent's Decibels are at MAXIMUM (Yixuan: or 120 Technique Points). |
| `Q` / `W` (or `1` / `2`) | During a **Chain Attack**: pick who follows up (left / right). |
| `Tab` or click | Change the focus target. |
| `T` | **AUTO** on/off. AUTO moves your Agent and gives your commands; with it off you move her and command, and she fights on her own. |
| `Esc` | **Tactics** menu (time stands still). |

**On a phone** (portrait or landscape): drag anywhere on the battlefield to move (a thumb stick appears under your
thumb), tap the buttons for every command, tap an enemy to focus it, tap a squad card to swap to her. Phones start on a
lighter graphics budget (fewer pixels, softer shadows, fewer particles), and if the frames still run slow the game
steps it down on its own.

## The rules (from the official game)

- Hits build **Daze**; a full bar **Stuns** (no actions, ×1.5 DMG taken). A heavy hit on a Stunned enemy opens a
  **Chain Attack**: 1 on normal enemies, 2 on elites, 3 on bosses (never more than the squad).
- **Perfect Assists** cost Assist Points (start with 6; each Chain Attack or Ultimate gives one back).
- A dodge just before a hit is a **Perfect Dodge** → slow motion → **Dodge Counter**.
- Each Agent fills her own **Decibels** (part spills to the squad): UPROAR 1,000 · BLASTING 2,000 · MAXIMUM 3,000.
- **Anomalies**: Physical → Assault (+Flinch), Fire → Burn, Ether → Corruption, Auric Ink → its own Corruption,
  Electric → Shock. A second, different anomaly triggers **Disorder**. Lumiflux (Remielle) takes on the attribute of the
  next Agent in the squad.
- Agent cores: Caesar's Perfect Block, guard stance, Retaliation and **Radiant Aegis**; Burnice's **Heat / Nitro-Fuel**,
  **Scorched** and **Afterburn**; Aria's **Fandom Power**, **Perfect Pitch** and **Abloom**, **Moment of Delusion**;
  Yixuan's **Sheer DMG**, **Adrenaline**, **Technique Points**, **Auric Array** and **Endless Talisman Suppression**;
  Qingyi's **Flash Connect Voltage**, **Enchanted Moonlit Blossoms** and **Subjugation** (a Stunned enemy takes more DMG);
  Ju Fufu's **Hu Wei** (it attacks on its own, on or off the field), **Might** and **Momentum**, **Suppressing Tiger
  Cauldron** (Hu Wei answers a teammate's Chain Attack) and **Tiger's Roar**, **Aura of Authority**; Orphie's **Magus**,
  **Bottled Heat**, **Heat Charge**, **Zeroed In** (+ATK for the squad), **Corrosive Flash** from the bench, **Forged in
  Flames**; Remielle's **Attribute Flux**, **Lumiflux Buildup**, **Refringe** (a teammate's Anomaly on it hits harder and
  stores a **Voidflare**), **Luminize**, **Floating Radiance**, **Phase Flow** off the field and **Flower & Feather Dance**
  on her way back, **Invitation to Bloom**.

## How it's built

Plain JavaScript and three.js (r128, vendored in `lib/`), no build step. Every model is voxels painted in code.

| File | What it does |
|---|---|
| `js/voxel.js` | Voxel grid, mesher (ambient occlusion), rigs |
| `js/models-*.js` | Agents (`models-agents.js`, `models-agents2.js`), companions (Yixuan's ink bird, Ju Fufu's Hu Wei; Orphie's Magus is her tail, part of her model), enemies, and the Proxies (Wise, Belle) and Eous, matched to official art |
| `js/auth.js` | Proxy accounts: register / sign in (salted SHA-256 in this browser), per-account saves and records |
| `js/lobby.js` | Sixth Street: the walkable home screen, its places, people and signs |
| `js/arenas.js` | The three battlegrounds |
| `js/data.js` | **All the numbers**: rules, kits, enemies, encounters, Battle Lab defaults |
| `js/battle.js` | The battle: damage, Daze/Stun/Chains, anomalies, assists, ultimates, hazards, camera |
| `js/ai.js` | Agent AI, enemy AI, the AUTO commander |
| `js/clash.js` | Proxy Clash: the rival Proxy's Agents (their brain, dodges, blocks, assists, swaps, Ultimates) |
| `js/moves.js` | How the Agents move: poses, footwork and effects per skill, matched to the official skill previews |
| `js/enemy-moves.js` | How the enemies move and attack: poses, footwork, props (Pompey's bike and hover guns), effects |
| `js/anim.js` · `js/fx.js` · `js/audio.js` | Procedural animation, effects, synthesized sound |
| `js/hud.js` · `js/menu.js` · `js/main.js` | HUD, menus, boot and input |
| `tools/` | Dev only: a model/arena viewer and headless test scripts (`node tools/play.js`, `tools/moves-test.js`, `tools/enemy-test.js`, `tools/flow-test.js`, `tools/phone-test.js`, `tools/clash-test.js` (Proxy Clash fights and calibration batches), `tools/clash-shots.js`, `tools/zfight-check.js`) |

Zenless Zone Zero, its characters and enemies belong to HoYoverse / miHoYo. This is a non-commercial fan project, not
affiliated with or endorsed by them, and will come down on request.
