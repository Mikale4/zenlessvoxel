# Zenless Voxel Zone — Battle Lab

An unofficial, non-commercial **Zenless Zone Zero** fan game in voxels, built around one question first: what should the
battles feel like? **You fight as in the real game**: you move the Agent on the field and press every attack, dodge,
Special, Ultimate and switch yourself. Or flip on **AUTO** and, like *Pallet to Pewter*, your Agents fight **on their own,
in real time** while the game gives the commands too.

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
- **Hollow dives**: a whole Hollow, zone after zone, then its Notorious. Pick the way on, carry your HP, collect Resonia
  between fights (see [Hollow dives](#hollow-dives)).
- **Things to do on Sixth Street**: Denny, food that buffs your next fight, shops, errands for the shopkeepers and
  regulars, and three story chapters for every Agent (see [Things to do](#things-to-do-on-sixth-street)).
- **Proxy Clash**: Agents against Agents, a rival Proxy's squad against yours, in five modes: 1v1 Duel, 2v2 and 3v3
  Tag Team (one on the field at a time), 2v2 and 3v3 All-Out (everyone at once).
- **Manual play, or AUTO**: the real game's five buttons (Basic, Dodge, Special, Ultimate, Switch), with every move of
  every kit on them; or let the Agents fight on their own (see [Commands](#commands)). Every key can be rebound.
- **TRAINING**: an interactive tutorial, thirteen lessons you play through against a Faun (see [Training](#training)).
- **The Battle Lab**: every rule and number as a toggle or slider, saved in your browser.
- **Music** from the official soundtrack: a track for every screen and every fight, each from where it plays in the
  real game (see [Music](#music)).
- **Voices**: the Agents' own lines from the real game, in battle, at squad select and on Sixth Street (see
  [Voices](#voices)).

## Signing in, and Sixth Street

As in Post Parade, the title screen runs a **live battle** behind the logo (a random squad on AUTO). **Register a Proxy**
(a name and password, kept in this browser; each Proxy has its own squad, Battle Lab settings and records) or **log in**.
A new Proxy chooses who they are, as in the real game: **Wise** or **Belle**, the siblings who run Random Play. The other
one minds the shop.

Home is **Sixth Street**, in voxels, to walk around in, built as it is in the real game from the Zenless Zone Zero Wiki's
location shots, shop pictures and maps (`street.js`, `street2.js`). West to east:

| North side | South side |
|---|---|
| the **metro entrance** (METRO PASSAGE / EXIT, the New Eridu Metro map) | the **404 Livehouse** (its front is this game's guess) |
| **Box Galaxy** (Susie's gadgets; the black Bangboo statue and its PROHIBITED hand, a bench, the strays) | a garage, and the **Sage in a Barrel** |
| **Coff Cafe** (Tin Master; the patio, the striped umbrella, Mr. Panda's posters, a payphone) | the **141** (the Bangboo trio's stall, the freezer, the Ice Cream Kingdom machine, the truck) |
| an alley (a courier, a Hollow Raider, the dumpster) | **Godfinger** (Asha; the pixel billboard, chequers, banners; the Proxy Clash cabinets) |
| **Waterfall Soup** (General Chop; the koi board, the stools) | the back road (**Officer Mewmew**), **Howl's newsstand** |
| the alley to the parking lot (the booth, a vending machine, a payphone) | **Bardic Needle** (Elfy; the record door, album walls, crates) |
| **Random Play** | a stuck vending machine, shutters |
| **Turbo** (Enzo's container garage, its stair and roof) | the roadworks at the east end |

Buildings are voxels a quarter of a metre across, shopfronts an eighth, fittings and props a sixteenth (vending machines
with cans, buttons and a pick-up flap; payphones with keypads; slatted benches; arcade cabinets; the 141's truck).

**Random Play** (walk in through the door: its front comes away), as in the shop shots: the mesh-panelled counter with
stickers and a Bangboo plush, the logo painted on the brick, posters on a red pegboard, the oil-drum sofa, an orange TV,
a monstera; the **Hollow Deep Dive System** in the back room under a wall of monitors (into battle), the **shop computer**
(Battle Lab), the **tutorial tapes** (How to Play), the **sofa** (Rest: the next time of day) and the **poster board** by
the door (your records). Your sibling is behind the counter and **Eous** waddles after you.

**Who's out** (`street-life.js`). The day runs in the real game's four slots, from your clock: **morning** (6 AM),
**afternoon** (12 PM), **evening** (6 PM), **late night** (12 AM), with its own light, lamps and lit windows; the sofa moves
it on. The shopkeepers keep their posts in their hours; the eight Agents follow routines from where the game puts them
(Caesar at Turbo and the 141, Burnice at Waterfall Soup and the newsstand, Aria at Godfinger and, evenings, outside the
404, Yixuan on the bench across from Random Play and at the newsstand, Qingyi at Turbo and, late at night, outside Random
Play, Ju Fufu with General Chop, Orphie at the noodle counter, Remielle on her way to Random Play), and stop to talk in
twos and threes; the regulars keep their hours (Luo and Phil by Turbo in the morning, Jonah and Roy at the newsstand at
six, Mrs. Yani's rounds, the cat's owner, Cookie napping on the 141 truck in the afternoon, the Dazed Dude at midnight);
passers-by come off the metro and the ends of the street (office workers by day, students at six). Each walks to her spot
along a path round everything (A* on a half-metre grid), and does what it is for: eats at the counter, sips coffee, plays a
cabinet, browses the crates, reads a magazine, phones, leans, sits. They look up as you pass, say something now and then,
and you can talk to every one of them (the Agents in their own voices).

Walk with **WASD / arrows** (Shift runs), **E** uses what has a sign over it; or click / tap where to go (a sign: go and
use it), or drag to steer on a phone. The camera turns to face the shopfronts on your side of the street; **Z / C**, a
right-button drag or the arrow buttons turn it yourself. The dock at the bottom goes straight to every place.

## Things to do on Sixth Street

`town.js`. Everything is saved per Proxy.

- **Denny.** You start with 60. A fight in the Hollow pays by encounter and rank (a Patrol about 40, a Notorious about
  120, more for an S), a Proxy Clash win pays by rival, and a Hollow dive pays on the way out. The chip at the top shows it.
- **Food is for fighting**, as in the real game. **Waterfall Soup**: General Chop's noodles, 30 Denny, eaten on a stool at
  the counter, last until your next fight (house: +8% damage and HP; spicy: +15% Daze; seafood: +20% Decibels, +10%
  Energy). **Coff Cafe**: Tin Master's coffee of the day, once a day, sipped on the patio (+20% Energy, +1 Assist Point),
  or a coffee to go. A meal and a coffee stack, and both last a whole Hollow dive.
- **Shops.** The **141** (Nitro-Fuel, milk tea, jerky, bin bags, coffee beans), **Howl's newsstand** (a free scratch card
  once a day, the Ridu Weekly's gossip), and the **vending machines** (a can, drunk on the spot).
- **Errands.** Five shopkeepers and regulars ask for something each day, out of eleven: fetch Mrs. Yani bin bags, find
  Cookie for her worried owner, find Cyclone's ball under the Box Galaxy bench, take the courier's parcel to Susie, bring
  Enzo the crate of bolts off the 141's truck, win a medal from Officer Mewmew with an A-rank Patrol, put your name on
  Asha's Proxy Clash board, and more.
- **The Agents' stories.** Each Agent has three chapters: a request of her own (something from a shop, a fight in the
  Hollow with her in the squad, a time of day to find her), then a scene. **Trust** grows when you talk to her (once a
  day), win a fight with her (once a day) and finish her chapters; the second opens at trust 4, the third at 9.

A **!** over someone means they have something for you; a **?** means you have something for them. **REQUESTS** on the
dock lists what you are doing, who is asking today, what you are carrying, and every Agent's trust and stories. Agents
also show their trust on the Agents panel.

## Hollow dives

`dive.js`. On the squad screen, pick **HOLLOW DIVE** under the encounters, then **START DIVE**. A dive is five zones of
one battleground: the way in (a fight), two forks, a fork before the end (one way is always a supply cache), and the
battleground's **Notorious**. At each fork you choose which TV to go through:

| Tile | What it is |
|---|---|
| **Combat** | The battleground's Patrol. Win it, then pick 1 of 3 Resonia. |
| **Elite** | The Elite: rarer Resonia and more Denny. |
| **Supply cache** | Every Agent recovers 40% HP; a downed Agent gets back up with 25%. |
| **Resonium crate** | Pick 1 of 2 Resonia, no fight. |
| **???** | Something in the dark: a Bangboo stuck in a crate, an Ether vein (Denny for HP), a Bangboo merchant, a pocket of clean air, a TV that says PICK A DOOR. |
| **Notorious** | The boss. Clear it to clear the dive. |

**Resonia** (B, A or S) last the rest of the dive: more damage, Daze, Energy, Decibels, Anomaly buildup or max HP, an
extra Assist Point each fight, or a heal or a revive on the spot. **HP carries over** from fight to fight (the living
catch their breath: +10%); an Agent who went down stays down until a supply cache or a Resonium gets her up, and if the
whole squad goes down the dive is over. Denny is paid on the way out: everything plus 60 for a cleared dive, half if the
squad went down, what you had earned if you **pull out** (between zones, or Retreat from Tactics). Fights in a dive count
for errands and stories too.

## Proxy Clash: Agent against Agent

At Godfinger's two cabinets across the street from Random Play, a **rival Proxy** dials in with a squad of their own. Pick a mode, your
squad, the rival, their squad (or let them choose: mirror matches are fine, their Agents stand on red rings), the
battleground, and fight. Five modes:

| Mode | How it plays |
|---|---|
| **1v1 Duel** | One Agent each. No swaps, no assists, no Chain Attacks: just the two of them. |
| **2v2 Tag Team** · **3v3 Tag Team** | One Agent per side on the field at a time, as in the Hollow: swap, Defensive Assist, Quick Assist, Chain Attack. |
| **2v2 All-Out** · **3v3 All-Out** | Every Agent of both squads on the field at once. |

In **All-Out** you **lead** one Agent (the yellow ring): with AUTO off you fight with her as with anyone; the Switch keys
(`Space` / `C`) or a squad card switch whom you lead. The others fight on their own and fire their own Ultimates. On a flash
aimed at any of yours, Switch sends a teammate dashing in to **parry** it (gold) or **pull her clear** (red); when one is launched,
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

## Music

From HOYO-MiX's official albums *Hyper Commission* (2024) and *Hyper Commission 2.0* (2026), and *19%* from
*Loading...* (the KHInsider gamerip), in `audio/`. Each track is where the real game plays it (the *Played In* column on
the Zenless Zone Zero Wiki's album pages). The music starts on your first click or key (browsers block sound until
then), crossfades between screens, picks a screen's track back up where it left off, and starts a fight's from the top.
Battle Lab: *Music volume*.

| Where | Track | In the real game |
|---|---|---|
| Title | 19% | The official website's theme |
| Sixth Street | 60% Fantasy - Serenity, then 60% Fantasy - Passion | Sixth Street, evenings |
| Inside Random Play | Time To Play | Random Play |
| Hollow Deep Dive (squad select) | 60% Fantasy | Random Play |
| Proxy Clash (setup) | Up-Up-Down-Down-Left-Left-Right-Right | Godfinger, the arcade |
| Blazewood · Patrol / Elite | Wind of the Wild / Dusk in the Wilderness | Chapter 4 Commissions / the Outer Ring Hollows |
| Blazewood · Pompey | Long Live the King | Notorious Hunt: Corrupted Overlord - Pompey |
| Yunkui Summit · Patrol / Elite | Darkest Hour / The Source | Miasmic Field / Yunkui Disciples Re-Emerge |
| Yunkui Summit · Miasma Priest | "Mevorakh", and The Way in phase 2 | Notorious Hunt: Miasma Priest, and the fight's second phase |
| Concert Stage · Patrol | Perish Together | A Harmony of Delusions: Performance Showdown |
| Concert Stage · Elite / Dead End Butcher | Sword of Corruption / Four-Armed Sword | Every Dullahan fight / Notorious Hunt: Dead End Butcher |
| Proxy Clash vs Patch / Vesper / Mirage | Purchasable Loyalty / Pride and Paranoia / The Final Duel | Fights with Pulchra, Bellum and Mors / Razor / The Defector |
| Mission clear / failed or retreated | Victory / Defeat | Finishing / losing or quitting a Commission |

The rival Proxies are this game's own, so their tracks are picks: the real game's music for fights against people.

## Voices

The Agents' English voice lines from the real game (the Zenless Zone Zero Wiki's *Voice-Overs* pages), 674 of them,
in `audio/voice/<agent>/` and listed in `js/voice-data.js`. Caesar, Burnice, Yixuan, Qingyi, Ju Fufu and Orphie speak;
Aria (no audio on the wiki yet) and Remielle (no page yet) do not. Battle Lab: *Voice volume*.

| When | She says (the wiki's category) |
|---|---|
| Squad select: you pick her / DEPLOY or FIGHT | Select Agent / Confirm Agent Selection |
| Sixth Street: you talk to her | Obtain Agent or Select Agent, and the box shows the words |
| A fight starts | Encounter Normal / Elite / Boss Enemy (a Proxy Clash: Boss) |
| EX Special, Dodge Counter, Perfect Dodge | EX Special Attack, Dodge Counter, Perfect Dodge |
| A Stun opens a Chain Attack (AUTO off) / she takes the Chain | Chain Attack Selection / Chain Attack |
| Ultimate | Ultimate (Yixuan's Endless Talisman Suppression has its own) |
| Defensive Assist, then the parry | Assist, Perfect Assist |
| Quick Assist / swapping in / after a teammate goes down | Assist (her lines for a teammate when it is Caesar or Burnice she helps) |
| An enemy's gold or red flash / it recovers from a Stun | Charge Hint / Enemy Stun Recovery |
| Launched / down | Staggered / Defeated |

One voice at a time: an Ultimate, a Chain Attack, a KO or the start of a fight cuts in; the everyday lines speak only
now and then (an EX about 3 times in 5) and never over another line. A rival Proxy's Agents speak their EX Specials,
Chain Attacks, Ultimates and KOs, quieter, and give way to yours.

## Commands

Two ways to fight, switched any time with the **AUTO** button (or `T`):

- **AUTO off** (the default): **you play**, as in the real game. You move the Agent on the field and press every attack,
  dodge, Special, Ultimate and switch yourself.
- **AUTO on**: she fights on her own (she picks her skills, chains her string, spends her Energy, dodges what she sees
  coming) and the game gives the commands too.
- In between, the Battle Lab's **Auto-attack**: you move her and give the commands; she attacks and dodges on her own.

The defaults are the real game's PC layout. Every action takes two keys or mouse buttons, and **KEY BINDINGS** (on the
squad screen, in the Battle Lab and in Tactics) changes any of them, saved per Proxy (`js/keys.js`).

| Key | Command |
|---|---|
| `W` `A` `S` `D` / arrows | **Move**. |
| Left click / `J` | **Basic Attack**. Tap it again and again for her string; **hold** it for her hold move. Kept held with no hold move, her string goes on. |
| `Shift` / right click | **Dodge** the way you push (no direction: a step back). Just before a hit: a **Perfect Dodge**. Kept held after a dodge: a sprint. |
| `E` / `K` | **Special Attack**; with the Energy past the mark, the **EX Special Attack**. |
| `Q` / `L` | **Ultimate** at MAXIMUM Decibels (Yixuan: or 120 Technique Points). |
| `Space` / `C` / `1` `2` `3` | Switch to the next / previous Agent / that slot. On an enemy's **gold flash** this is a **Defensive Assist** (parry, costs Assist Points); on a **red flash** (or with no Assist Points) the incoming Agent **Perfect Dodges**. While your Agent is **launched**, it's a **Quick Assist**. |
| `C` `Space` (or `1` `2`) | During a **Chain Attack**: pick who follows up (left / right). |
| `Tab` / middle click | Change target (middle click: the enemy under the pointer; or click / tap one). |
| `T` | **AUTO** on/off. |
| `Esc` | **Tactics** menu (time stands still). |

**What a button does depends on the moment**, as in the real game: one lookup (`resolve()` in `js/ai.js`) turns a
button, tapped or held, into the move, for your presses and AUTO's alike.

| Moment | Basic | Special |
|---|---|---|
| Any time | The next step of her string (a second without one starts it over) | The Special; with the Energy, the EX |
| Just after a dodge, or sprinting | **Dash Attack** (Ju Fufu with 3 Momentum: Mountain King's Game) | |
| Just after a Perfect Dodge | **Dodge Counter** | |
| Just after a Defensive Assist | **Assist Follow-Up** | |
| During (or just after) Burnice's, Aria's or Yixuan's EX | | Her **second EX** (Burnice: also after her Chain Attack, Follow-Up or Mixed Flame Blend) |
| Caesar, just after a Perfect Block | **Roaring Thrust** | **Overpowered Shield Bash** |
| Held | Caesar: **Dead End** (1 Assist Point) · Burnice: **Mixed Flame Blend** (Nitro-Fuel) · Aria: **Perfect Pitch** · Qingyi: **Enchanted Moonlit Blossoms** (75 Voltage) · Yixuan: **Auric Array** (an Auric Ink Point) · Remielle: **Rainbow's End** / Fleeting Grace | Orphie: **Heat Charge** (100 Bottled Heat) · Yixuan: **Cloud-Shaper** (our choice of button for her other EX) |

A press is remembered for a moment and plays as soon as she can move (an input buffer); one made during a long move
waits for its end. A Special cuts a Basic, Dash Attack or Dodge Counter short once its hit has landed; a Dodge cuts
short anything but an Ultimate, a Chain Attack or an Assist. Attacks home in a little on the target you picked, or on the
nearest enemy the way she faces. The buttons light up for the moment: COUNTER, FOLLOW-UP, DASH ATTACK, EX, EX ×2, ASSIST,
QUICK, and name her hold move when one is ready.

**On a phone** (portrait or landscape): drag anywhere on the battlefield to move (a thumb stick appears under your
thumb); with AUTO off, BASIC, DODGE and SPECIAL are buttons you tap or hold, with ULT, the swaps, TARGET and TACTICS
above them. Tap an enemy to focus it, tap a squad card to swap to her. Phones start on a lighter graphics budget (fewer
pixels, softer shadows, fewer particles), and if the frames still run slow the game steps it down on its own.

## Training

**HOW TO PLAY → START TRAINING** (`js/tutorial.js`): a fight on the Hollow Concert Stage against one Faun where nothing
happens until you do it. A card over the battle gives one lesson at a time, in your own keys (on a phone, the buttons),
and the next opens once you have done it (or SKIP): move, the Basic string, a hold move, dodging, the Dash Attack, a
Perfect Dodge and its Dodge Counter, the Special, the EX, switching, a Defensive Assist and its Follow-Up, Stun and a
Chain Attack, the Ultimate, and a last round where the Faun fights back. The Faun only swings when a lesson wants it to,
and a missed Perfect Dodge or Assist says why (too early, too late, no flash yet). Nobody loses: the squad is topped up
and the Faun cannot fall before the last lesson. The squad is Qingyi, Caesar and Aria.

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
| `js/lobby.js` | Sixth Street: you, the camera, the time of day, the light pool, the places to use, the signs |
| `js/street.js` · `js/street2.js` | Sixth Street's buildings and props (north side, south side), as in the real game |
| `js/street-life.js` · `js/models-street.js` | Its people: routines, paths, activities, chatter; the shopkeepers, regulars, passers-by and animals |
| `js/town.js` | Things to do on Sixth Street: Denny, the shops, food buffs, errands, the Agents' trust and stories, the REQUESTS panel |
| `js/dive.js` | Hollow dives: the zones and forks, Resonia, HP carried between fights, the pay on the way out |
| `js/arenas.js` | The three battlegrounds |
| `js/data.js` | **All the numbers**: rules, kits, enemies, encounters, Battle Lab defaults |
| `js/battle.js` | The battle: damage, Daze/Stun/Chains, anomalies, assists, ultimates, hazards, camera |
| `js/ai.js` | The five buttons (what each does at each moment, for you and AUTO alike), your presses, Agent AI, enemy AI, the AUTO commander |
| `js/clash.js` | Proxy Clash: the rival Proxy's Agents (their brain, dodges, blocks, assists, swaps, Ultimates) |
| `js/moves.js` | How the Agents move: poses, footwork and effects per skill, matched to the official skill previews |
| `js/enemy-moves.js` | How the enemies move and attack: poses, footwork, props (Pompey's bike and hover guns), effects |
| `js/anim.js` · `js/fx.js` · `js/audio.js` | Procedural animation (a walk and run whose planted foot keeps pace with the ground), effects, synthesized sound |
| `js/music.js` · `audio/` | The soundtrack: what plays where, crossfades, the first-click unlock |
| `js/voice.js` · `js/voice-data.js` · `audio/voice/` | The Agents' voice lines: which moment says what, one voice at a time |
| `js/hud.js` · `js/menu.js` · `js/main.js` | HUD, menus, boot and input |
| `js/keys.js` | The battle controls and your key bindings |
| `js/tutorial.js` | TRAINING, the interactive tutorial |
| `tools/` | Dev only: a model/arena viewer and headless test scripts (`node tools/play.js`, `tools/moves-test.js`, `tools/enemy-test.js`, `tools/flow-test.js`, `tools/phone-test.js`, `tools/clash-test.js` (Proxy Clash fights and calibration batches), `tools/clash-shots.js`, `tools/zfight-check.js`) |

Zenless Zone Zero, its characters, enemies, music and voices belong to HoYoverse / miHoYo. This is a non-commercial fan project, not
affiliated with or endorsed by them, and will come down on request.
