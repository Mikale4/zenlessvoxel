/* ============================================================================
   town.js -- things to do on Sixth Street: Denny, the shops, errands, and the
   Agents' own requests and story beats. Saved per Proxy (U.store 'town').

   DENNY      earned in the Hollow (by encounter and rank) and at Proxy Clash, and
              for errands; spent at the shops.
   THE SHOPS  (as in the real game, food is for fighting)
     Waterfall Soup  General Chop's noodles, eaten at the counter: a buff for your
                     next fight (house: damage and HP; spicy: Daze; seafood: Decibels)
     Coff Cafe       Tin Master's coffee of the day, once a day (Energy, an Assist
                     Point), sipped on the patio; or a coffee to go
     the 141         the Bangboo trio's stall: Nitro-Fuel, milk tea, jerky, bin bags, beans
     the newsstand   Howl's scratch card, once a day; the Ridu Weekly's gossip
     vending machines a can, drunk on the spot
   ERRANDS    the shopkeepers' and regulars' requests: five a day out of ten (fetch,
              find, deliver, a medal challenge in the Hollow, a high score at Proxy Clash)
   AGENTS     trust grows by talking (once a day), fighting together (a win, once a
              day) and by their stories; each Agent has three chapters (a request of
              her own, then a scene), the next opening at trust 4 and 9.

     TOWN.talk(id, who) -> true if it took the conversation
     TOWN.mark(id) -> '!' (has something for you) | '?' (you have something for them) | ''
     TOWN.places() / TOWN.usePlace(id)   things to look at or use on the street
     TOWN.takeBuff()   the meal and coffee for the fight about to start
     TOWN.afterBattle(B, rank) -> { text }   pay, trust, steps done
     TOWN.journal()  TOWN.agentInfo(id)  TOWN.denny()
   ========================================================================== */
(function () {
  'use strict';
  const { el } = U, D = window.DATA, PI = Math.PI;
  const T = {};
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const hashS = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };

  /* ---------------------------------------------------------- the save -- */
  const DEF = () => ({ denny: 60, trust: {}, ch: {}, talked: {}, fought: {}, active: {}, done: {}, bag: {}, meal: null, coffee: null, coffeeDay: '', scratchDay: '', day: '' });
  let st = null;
  function load() { st = Object.assign(DEF(), U.store.get('town', {})); if (st.day !== today()) { st.day = today(); st.talked = {}; st.fought = {}; } return st; }
  const S = () => st || load();
  function save() { U.store.set('town', st); const d = document.getElementById('lbDenny'); if (d) d.textContent = U.fmt(st.denny); }
  T.reload = () => { st = null; load(); };
  T.denny = () => S().denny;
  T.pay = n => pay(n);                                          // a dive's pay, on the way out (dive.js)
  const pay = n => { S().denny = Math.max(0, st.denny + n); save(); };
  const has = item => (S().bag[item] || 0) > 0;
  const give = (item, n) => { S().bag[item] = (st.bag[item] || 0) + (n || 1); };
  const take = item => { if (has(item)) { st.bag[item]--; if (!st.bag[item]) delete st.bag[item]; } };

  /* ----------------------------------------------------------- the goods -- */
  const ITEMS = {
    nitro: { name: 'Nitro-Fuel', proper: 1, price: 12, note: 'A fizzy fuel drink. Burnice\'s favourite.' },
    milktea: { name: 'Hot milk tea', price: 9, note: 'Sweet, and warm in the hand.' },
    jerky: { name: 'Jerky', price: 10, note: 'For people. Hu Wei disagrees.' },
    binbags: { name: 'Bin bags', price: 8, note: 'A roll of twenty.' },
    beans: { name: 'Coffee beans', price: 15, note: 'A bag of Tin Master\'s brand.' },
    coffee: { name: 'Coffee to go', price: 15 },
    parcel: { name: 'Parcel' }, ball: { name: 'Cyclone\'s ball', proper: 1 }, bolts: { name: 'Crate of bolts' }, bowl: { name: 'Bowl of noodles' }, sleeve: { name: 'Record sleeve' }, plush: { name: 'Claw machine plush' }, intel: { name: 'Roadworks intel' },
  };
  const low = k => ITEMS[k].proper ? ITEMS[k].name : ITEMS[k].name.toLowerCase();
  const SHOP141 = ['nitro', 'milktea', 'jerky', 'binbags', 'beans'];
  const NOODLES = [
    { id: 'house', name: 'House noodles', price: 30, buff: { dmg: 1.08, hp: 1.08 }, note: '+8% damage, +8% HP' },
    { id: 'spicy', name: 'Spicy noodles', price: 30, buff: { daze: 1.15, dmg: 1.04 }, note: '+15% Daze, +4% damage' },
    { id: 'seafood', name: 'Seafood noodles', price: 30, buff: { db: 1.2, energy: 1.1 }, note: '+20% Decibels, +10% Energy' },
  ];
  // Kasa's Cheesetopia in Blazewood: the same three kinds of meal, Outer Ring style
  const CHEESE = [
    { id: 'burger', name: 'Outer Ring cheeseburger', price: 30, buff: { dmg: 1.08, hp: 1.08 }, note: '+8% damage, +8% HP' },
    { id: 'fries', name: 'Boundless Blaze chili cheese fries', price: 30, buff: { daze: 1.15, dmg: 1.04 }, note: '+15% Daze, +4% damage' },
    { id: 'pizza', name: 'Triple-cheese pizza', price: 30, buff: { db: 1.2, energy: 1.1 }, note: '+20% Decibels, +10% Energy' },
  ];
  const COFFEE = { price: 15, buff: { energy: 1.2, assist: 1 }, note: '+20% Energy, +1 Assist Point' };
  const RIDU = ['Ridu Weekly: "Godfinger high score changes hands three times in one night. Mirage suspected."', 'Ridu Weekly: "Waterfall Soup\'s spicy noodles: Obol Squad challenge still unbeaten."', 'Ridu Weekly: "Bangboo statue outside Box Galaxy: residents divided."', 'Ridu Weekly: "Roadworks at the east end enter their third month. Workers unavailable for comment."', 'Ridu Weekly: "Angels of Delusion spotted at the 404. Fans queue round the block."'];

  /* -------------------------------------------------------------- errands --
     steps: buy (an item at a shop), give (you're handed it), bring (an item to
     someone), talk (to someone; reply: what they say), pick (something on the
     street: at a spot), clear (a fight: arena, enc, rank, with, lead), clash (win
     a Proxy Clash: with), order (noodles: dish), slot (talk to someone at a time
     of day) */
  const ERRANDS = [
    { id: 'yani_bags', from: 'yani', title: 'Bin bags for Mrs. Yani', ask: 'Every morning, the bins are a mess, and I\'m out of bags. Be a dear and fetch me some from the 141?', steps: [{ t: 'buy', item: 'binbags' }, { t: 'bring', item: 'binbags', to: 'yani' }], thanks: 'Finally, someone young with manners. Here, for your trouble.', pay: 30 },
    { id: 'owner_cookie', from: 'owner', title: 'Where\'s Cookie?', ask: '...Have you seen Cookie? Grey tabby. If you find her, come and tell me. She never comes when I call.', steps: [{ t: 'talk', to: 'cookie', reply: '(Cookie opens one eye, decides you are not dinner, and goes back to sleep. Found her.)' }, { t: 'talk', to: 'owner' }], thanks: 'She\'s fine? Good. Good. ...Don\'t tell anyone I was worried.', pay: 40 },
    { id: 'jonah_ball', from: 'jonah', title: 'Cyclone\'s ball', ask: 'We were training Cyclone and the ball rolled away! It went toward Box Galaxy. Can you find it?', steps: [{ t: 'pick', at: 'box:bench1', label: 'Under the bench', item: 'ball' }, { t: 'bring', item: 'ball', to: 'jonah' }], thanks: 'The ball! Cyclone, fetch! ...He pressed the button again.', pay: 30 },
    { id: 'courier_parcel', from: 'courier', title: 'A parcel for Box Galaxy', ask: 'I\'m behind on my round. Could you take this parcel to Susie at Box Galaxy? It\'s paid for.', steps: [{ t: 'give', item: 'parcel' }, { t: 'bring', item: 'parcel', to: 'susie', reply: 'Our parcel! The boss has been asking about this all week. Thanks!' }], thanks: 'Delivered? You\'re a lifesaver. Here, take a cut.', pay: 35 },
    { id: 'mewmew_medal', from: 'mewmew', title: 'A model citizen', ask: 'Mew! Officer Mewmew awards medals to model citizens! Clear a Patrol in the Hollow with an A rank or better, and report back!', steps: [{ t: 'clear', f: { enc: 'patrol', rank: 'A' } }, { t: 'talk', to: 'mewmew' }], thanks: 'Mew! A medal for a model citizen! Wear it with pride!', pay: 60 },
    { id: 'enzo_bolts', from: 'enzo', title: 'Bolts from the truck', ask: 'The 141 truck\'s got a crate of bolts in the back for me. Grab it? My knees and that tailgate don\'t agree.', steps: [{ t: 'pick', at: '141:truck', label: 'The crate of bolts', item: 'bolts' }, { t: 'bring', item: 'bolts', to: 'enzo' }], thanks: 'That\'s the stuff. Turbo runs on bolts and good music.', pay: 40 },
    { id: 'chop_bowl', from: 'chop', title: 'An order for Burnice', ask: 'Burnice ordered and walked off! Take her this bowl before it gets cold. Wherever she is.', steps: [{ t: 'give', item: 'bowl' }, { t: 'bring', item: 'bowl', to: 'burnice', reply: 'Noodles?! For ME?! Proxy, you\'re the best!' }], thanks: 'She got it? Good! A noodle left to go cold is a crime.', pay: 30, trust: { burnice: 1 } },
    { id: 'elfy_sleeve', from: 'elfy', title: 'A lost sleeve', ask: 'A record sleeve blew out of the crates. I saw it skid across to Godfinger. Would you fetch it?', steps: [{ t: 'pick', at: 'gf:wall', label: 'A record sleeve', item: 'sleeve' }, { t: 'bring', item: 'sleeve', to: 'elfy' }], thanks: 'Not a scratch on it. Thank you. Bardic Needle owes you one.', pay: 35 },
    { id: 'susie_claw', from: 'susie', title: 'Claw machine test', ask: 'The boss says the claw machine is "too generous". Could you give it a try and tell me?', steps: [{ t: 'pick', at: 'box:claw', label: 'Try the claw machine', item: 'plush' }, { t: 'talk', to: 'susie' }], thanks: 'You won one? On the first go?! ...Don\'t tell the boss.', pay: 20 },
    { id: 'asha_score', from: 'asha', title: 'Top of the board', ask: 'Somebody called Mirage keeps signing the Proxy Clash board. Win one and put your name up there instead!', steps: [{ t: 'clash' }, { t: 'talk', to: 'asha' }], thanks: 'Your name\'s on the board! I\'ll leave it there. For a day. Maybe two.', pay: 50 },
    { id: 'tin_beans', from: 'tinmaster', title: 'Coffee beans', ask: 'The morning rush emptied the grinder. The 141 keeps my beans. Would you fetch a bag?', steps: [{ t: 'buy', item: 'beans' }, { t: 'bring', item: 'beans', to: 'tinmaster' }], thanks: 'Exactly the right roast. Your next cup is on the house. Well, the Denny is.', pay: 30 },
  ];
  const errandsToday = () => { const d = today(); return ERRANDS.slice().sort((a, b) => hashS(d + a.id) - hashS(d + b.id)).slice(0, 5); };

  /* ------------------------------------------------- the Agents' chapters --
     three each: a request of her own, then a scene. 'A' is she, 'P' is you. */
  const GATE = [0, 4, 9];
  const CH = {
    caesar: [
      { title: 'A ride through the Outer Ring', ask: ['Proxy! You know Blazewood? That\'s Sons of Calydon turf.', 'Take me in there and clear it. Patrol, Elite, whatever you like. I want to see how you run a Hollow.'], steps: [{ t: 'clear', f: { arena: 'outer', with: 'caesar' } }, { t: 'talk', to: 'caesar' }],
        scene: [['A', 'Ha! Now that\'s a ride! The Outer Ring always feels like home.'], ['P', 'You knew every corner of that camp.'], ['A', 'Course I did. Half of it\'s ours. The other half\'s ours too, we just haven\'t told it yet.'], ['A', 'You read a Hollow fast, Proxy. The Sons of Calydon could use someone like you.']] },
      { title: 'Fuel for the road', ask: ['Turbo\'s done tuning my bike, but I\'m running on fumes.', 'Grab me a Nitro-Fuel from the 141? I\'d go myself, but Enzo will start on about exhaust valves again.'], steps: [{ t: 'buy', item: 'nitro' }, { t: 'bring', item: 'nitro', to: 'caesar' }],
        scene: [['A', 'That\'s the stuff. ...Hey, don\'t look at me like that.'], ['P', 'Burnice drinks those.'], ['A', 'Burnice drinks everything. That\'s why I buy my own.'], ['A', 'Thanks, Proxy. A leader looks after her crew. Nice to have somebody look after me for once.']] },
      { title: 'Hold the line', ask: ['An Overlord doesn\'t hide at the back. Put me at the front of the squad and take on something Notorious.', 'Whatever\'s out there, I\'ll hold the line. You just tell me where.'], steps: [{ t: 'clear', f: { enc: 'boss', lead: 'caesar' } }, { t: 'talk', to: 'caesar' }],
        scene: [['A', 'We did it. Everybody\'s walking home.'], ['A', 'Being an Overlord isn\'t about winning every fight. It\'s about making sure everyone gets back.'], ['P', 'You held the line.'], ['A', 'We held it. ...Don\'t let it go to your head, Proxy. But I\'m glad it was you on the other end of that HDD.']] },
    ],
    burnice: [
      { title: 'A cold one', ask: ['Proxyyy! I\'m dying of thirst over here!', 'The 141 has Nitro-Fuel in the fridge. Get me one? Pleeease?'], steps: [{ t: 'buy', item: 'nitro' }, { t: 'bring', item: 'nitro', to: 'burnice' }],
        scene: [['A', 'Ahhh, that\'s the good stuff! Nitro-Fuel: the official drink of the Sons of Calydon!'], ['P', 'Caesar says you drink too much of it.'], ['A', 'Caesar says a lot of things. Most of them are "Burnice, put that out."'], ['A', 'Hehe. Thanks, Proxy. You\'re alright!']] },
      { title: 'Noodle run', ask: ['Waterfall Soup is calling my name. Can you hear it? "Buuurnice..."', 'Get yourself a bowl and eat with me! Noodles are way better with company.'], steps: [{ t: 'order' }, { t: 'talk', to: 'burnice' }],
        scene: [['A', 'See? General Chop\'s noodles fix everything.'], ['A', 'Bad day in the Hollow? Noodles. Good day in the Hollow? Extra noodles.'], ['P', 'And a normal day?'], ['A', 'Noodles AND a Nitro-Fuel! Duh!']] },
      { title: 'Light it up', ask: ['Okay, I\'m all fuelled up. Let\'s go torch something BIG.', 'A Notorious hunt. Me in the squad. Let\'s light it up!'], steps: [{ t: 'clear', f: { enc: 'boss', with: 'burnice' } }, { t: 'talk', to: 'burnice' }],
        scene: [['A', 'WHOO! Did you see that? Did you SEE that?!'], ['P', 'Hard to miss. It was on fire.'], ['A', 'Everything\'s on fire when I\'m around! ...In a good way!'], ['A', 'Hey, Proxy. Thanks for always taking me along. Feels nice to be counted on.']] },
    ],
    aria: [
      { title: 'Front row', ask: ['Pssst, Proxy! I warm up outside the 404 in the evenings.', 'Come and find me there one evening. I\'ll save you the best spot~'], steps: [{ t: 'slot', slot: 2, to: 'aria' }],
        scene: [['A', 'You came! Hehe, the doors aren\'t even open yet, so this is a private warm-up.'], ['A', 'La-la-laaa... how was that? Be honest! ...No, be nice!'], ['P', 'It was lovely.'], ['A', 'Wahh, I knew it! Okay, you\'re officially my favourite Proxy. Don\'t tell the fans.']] },
      { title: 'The new single', ask: ['Our new single\'s out on vinyl! Bardic Needle should have it.', 'Could you ask Elfy where she shelved it? If it\'s behind the jazz again, I\'ll cry.'], steps: [{ t: 'talk', to: 'elfy', reply: 'The Angels of Delusion\'s new single? In the front window. It sells itself.' }, { t: 'talk', to: 'aria' }],
        scene: [['P', 'Elfy put it in the front window.'], ['A', 'The WINDOW?! The front window?!'], ['A', 'Eeee! Okay, okay, I\'m calm. I\'m a professional. ...I\'m going to go and look at it for ten minutes.'], ['A', 'Thank you, Proxy! Next show, you\'re on the guest list. For real this time!']] },
      { title: 'Showtime', ask: ['Fans love a show, and nothing\'s a bigger show than a Proxy Clash!', 'Take me to Godfinger and win one with me in your squad. Let\'s give them something to cheer about!'], steps: [{ t: 'clash', f: { with: 'aria' } }, { t: 'talk', to: 'aria' }],
        scene: [['A', 'And that\'s the encore! Did you hear them cheer?'], ['P', 'I think that was the other Proxy groaning.'], ['A', 'Cheers, groans... it\'s all applause if you\'re an idol~'], ['A', 'Thanks for sharing the stage with me, Proxy. You\'ve got star quality. Just a little!']] },
    ],
    yixuan: [
      { title: 'A warm cup', ask: ['The air turns cold out here, Proxy.', 'There is hot milk tea at the 141. Would you bring me a cup? A still mind keeps better with something warm.'], steps: [{ t: 'buy', item: 'milktea' }, { t: 'bring', item: 'milktea', to: 'yixuan' }],
        scene: [['A', 'Thank you. Warm, and sweet. A good balance.'], ['A', 'Sixth Street is loud, but there is a stillness to it, if you sit long enough.'], ['P', 'Is that why you sit on that bench?'], ['A', 'That, and the noodles are close. ...Balance, Proxy.']] },
      { title: 'Practice', ask: ['A master must keep her hand in. And a Proxy, her eye.', 'Take me to Yunkui Summit. Let us practise together.'], steps: [{ t: 'clear', f: { arena: 'summit', with: 'yixuan' } }, { t: 'talk', to: 'yixuan' }],
        scene: [['A', 'Good. You did not rush, and you did not hesitate.'], ['A', 'Most Proxies watch the enemy. You watched the whole field.'], ['P', 'I had a good teacher.'], ['A', 'Flattery. ...But accurate flattery. I will allow it.']] },
      { title: 'The Priest', ask: ['The Miasma Priest. It defiles the mountain.', 'I would face it with you, Proxy. Will you guide me?'], steps: [{ t: 'clear', f: { arena: 'summit', enc: 'boss', with: 'yixuan' } }, { t: 'talk', to: 'yixuan' }],
        scene: [['A', 'It is done. The mountain breathes easier tonight.'], ['A', 'I have walked many paths alone. It is... strange, to have someone call out the way.'], ['P', 'Strange good, or strange bad?'], ['A', 'Breathe, Proxy. ...Strange good.']] },
    ],
    qingyi: [
      { title: 'Patrol route', ask: ['Proxy. I am conducting a patrol of Sixth Street and require a civilian liaison.', 'Check in with three shopkeepers: Elfy, Susie and Tin Master. Report anything suspicious.'], steps: [{ t: 'talk', to: 'elfy', reply: 'Suspicious? Someone keeps rearranging the jazz section. I have my theories.' }, { t: 'talk', to: 'susie', reply: 'Suspicious? The claw machine\'s been winning a lot lately. Totally normal!' }, { t: 'talk', to: 'tinmaster', reply: 'Suspicious? A customer asked me for decaf this morning. I have not recovered.' }, { t: 'talk', to: 'qingyi' }],
        scene: [['A', 'Report received. Jazz section: monitored. Claw machine: monitored. Decaf: ...concerning.'], ['A', 'Patrol complete. Sixth Street threat level: low. Noodle level: high.'], ['P', 'That\'s a real metric?'], ['A', 'It is now. Thank you for your assistance, Proxy.']] },
      { title: 'Maintenance', ask: ['My left knee is making a sound. I have been scheduled for maintenance at Turbo.', 'Please ask Enzo whether he has time for me. I dislike asking for help.'], steps: [{ t: 'talk', to: 'enzo', reply: 'Qingyi? Tell her to come by anytime. That knee\'s been squeaking for weeks.' }, { t: 'talk', to: 'qingyi' }],
        scene: [['A', 'Enzo said "anytime"? That is... efficient.'], ['A', 'In the Special Response Team, we do not usually rely on civilians.'], ['P', 'I\'m not a civilian. I\'m your Proxy.'], ['A', '...Correction noted. Thank you, Proxy.']] },
      { title: 'Night watch', ask: ['Late at night I keep watch outside Random Play. The street is quiet then.', 'Join me one night, if you are awake. I will share the watch.'], steps: [{ t: 'slot', slot: 3, to: 'qingyi' }],
        scene: [['A', 'You came. Most people sleep at this hour.'], ['A', 'I keep watch because someone must. Tonight, two of us do.'], ['P', 'Anything to report?'], ['A', 'A cat. A man looking for the cat. And a Proxy keeping me company. ...A good night.']] },
    ],
    jufufu: [
      { title: 'A snack for Hu Wei', ask: ['Hu Wei\'s hungry! It\'s always hungry. It\'s a cauldron!', 'The 141 has jerky. Get some for Hu Wei? It\'ll love you forever. Or at least till dinner.'], steps: [{ t: 'buy', item: 'jerky' }, { t: 'bring', item: 'jerky', to: 'jufufu' }],
        scene: [['A', 'Hu Wei! Look! The Proxy brought you jerky!'], ['A', '...It says thank you. And that you should bring more next time.'], ['P', 'Cauldrons eat jerky?'], ['A', 'Hu Wei eats EVERYTHING. That\'s what makes it the best!']] },
      { title: 'Noodles with the General', ask: ['General Chop says a little tiger needs her noodles!', 'Eat a bowl at Waterfall Soup with me, Proxy! The General makes them extra big for friends.'], steps: [{ t: 'order' }, { t: 'talk', to: 'jufufu' }],
        scene: [['A', 'Mmm! The General\'s noodles are the best on all of Sixth Street!'], ['A', 'The General always says a hero needs a full stomach. So I keep mine VERY full.'], ['P', 'Sounds like good advice.'], ['A', 'It\'s the best advice! Hu Wei follows it too!']] },
      { title: 'Prove it', ask: ['Yunkui Summit\'s little tiger wants to see how strong you are!', 'Clear a Patrol with an S rank! Then I\'ll call you my rival. Or my friend. Both!'], steps: [{ t: 'clear', f: { enc: 'patrol', rank: 'S' } }, { t: 'talk', to: 'jufufu' }],
        scene: [['A', 'An S! You really did it!'], ['A', 'Hu Wei says you\'re strong. Hu Wei doesn\'t say that about anybody!'], ['P', 'So, rival or friend?'], ['A', 'Both! Rivals who eat noodles together. That\'s the best kind!']] },
    ],
    orphie: [
      { title: 'Recon', ask: ['Proxy. Magus wants intel on the roadworks at the east end.', 'Read the sign by the barriers and report back. Standard recon.'], steps: [{ t: 'pick', at: 'east:works', label: 'The roadworks sign', item: 'intel' }, { t: 'bring', item: 'intel', to: 'orphie' }],
        scene: [['P', 'It says "Road under maintenance".'], ['A', '...That\'s it?'], ['A', 'Magus says that\'s exactly what a front would say. She wants to keep watching it.'], ['A', 'Good work, Proxy. You follow orders and you don\'t ask why. Magus likes that.']] },
      { title: 'The spicy challenge', ask: ['General Chop\'s spicy noodles. The Obol Squad has a standing challenge: nobody finishes a bowl.', 'Order one. Finish it. Magus is watching.'], steps: [{ t: 'order', dish: 'spicy' }, { t: 'talk', to: 'orphie' }],
        scene: [['A', 'You finished it.'], ['A', 'Magus is... impressed. She says you have a soldier\'s stomach.'], ['P', 'I can\'t feel my tongue.'], ['A', 'That\'s normal. It comes back. Mostly.']] },
      { title: 'Operation Blazewood', ask: ['Magus has drawn up an operation: the Elite at Blazewood.', 'Me in your squad, you on the HDD. Let\'s run it clean.'], steps: [{ t: 'clear', f: { arena: 'outer', enc: 'elite', with: 'orphie' } }, { t: 'talk', to: 'orphie' }],
        scene: [['A', 'Operation complete. No losses. Clean.'], ['A', 'Magus says you\'d make a decent Obol Squad recruit.'], ['P', 'Is that a compliment?'], ['A', 'From her? That\'s a medal. Wear it well, Proxy.']] },
    ],
    remielle: [
      { title: 'The video store', ask: ['I\'ve heard so much about Random Play. A shop full of stories on tapes!', 'Would you show me? Introduce me to your sibling at the counter.'], steps: [{ t: 'talk', to: 'sib', reply: 'A friend of yours? Tell her the romance section\'s on the left. Everyone ends up in the romance section.' }, { t: 'talk', to: 'remielle' }],
        scene: [['A', 'So many tapes! Every one of them a little world.'], ['A', 'Your sibling says the romance section is on the left. I... may have already looked.'], ['P', 'Find anything good?'], ['A', 'Three things. I\'d like to rent them all. Is that greedy? It feels greedy.']] },
      { title: 'Coffee with a view', ask: ['Coff Cafe\'s patio catches the light so beautifully.', 'Would you bring me a coffee from Tin Master? We could watch the street a while.'], steps: [{ t: 'buy', item: 'coffee' }, { t: 'bring', item: 'coffee', to: 'remielle' }],
        scene: [['A', 'Thank you. It smells like a morning that hasn\'t started yet.'], ['A', 'Light takes on the colours around it. People do too, I think.'], ['P', 'What colour is Sixth Street?'], ['A', 'Warm yellow. Like your shop\'s sign. ...Like you, a little.']] },
      { title: 'The evening light', ask: ['At six o\'clock the light on Sixth Street turns gold.', 'Find me one evening. I\'d like to watch it with someone.'], steps: [{ t: 'slot', slot: 2, to: 'remielle' }],
        scene: [['A', 'There. Do you see how it falls across the street?'], ['A', 'My light takes the colour of whoever stands beside me. Tonight it\'s yours.'], ['P', 'What colour is it?'], ['A', 'Hmm... a colour I don\'t have a name for yet. I think I\'d like to find one. With you.']] },
    ],
  };
  // Agents with files of their own (js/agents/) bring their story chapters with them: def.town.chapters
  for (const id in window.DATA.AGENTS) { const T = window.DATA.AGENTS[id].town; if (T && T.chapters && !CH[id]) CH[id] = T.chapters; }

  /* --------------------------------------------------------- bookkeeping -- */
  const me = () => { const a = Auth.current() || {}; return { who: a.proxy || 'wise', name: a.proxy === 'belle' ? 'Belle' : 'Wise' }; };
  const agentName = id => D.AGENTS[id] ? D.AGENTS[id].short : id;
  const nameOf = id => ({ kasa: 'Kasa', clerk747: '747 Clerk', howl: 'Howl', ashuo: 'A-Shuo', sweety: 'Sweety', reed: 'Reed', vince: 'Vince', ginger: 'Ginger', lee: 'Lee', chopjr: 'Chop Junior', tinlumina: 'Tin Master', eve: 'Eve', orchidea: 'Orchidea', mia: 'Mia', sage: 'Sage in a Barrel', sib: (me().who === 'wise' ? 'Belle' : 'Wise'), cookie: 'Cookie', owner: '???', yani: 'Mrs. Yani', mewmew: 'Officer Mewmew', tinmaster: 'Tin Master', chop: 'General Chop', susie: 'Susie', elfy: 'Elfy', asha: 'Asha', enzo: 'Enzo', jonah: 'Jonah', courier: 'Courier' })[id] || agentName(id);
  const whoOf = id => id === 'sib' ? (me().who === 'wise' ? 'belle' : 'wise') : id;
  const chState = id => (S().ch[id] = st.ch[id] || { n: 0, active: false, step: 0 });
  const trust = id => S().trust[id] || 0;
  const addTrust = (id, n) => { S().trust[id] = (st.trust[id] || 0) + n; };
  /* every quest in progress: { key, kind: 'errand'|'chapter', agent?, def, step } */
  function quests() {
    const out = [];
    for (const id in S().active) { const def = ERRANDS.find(e => e.id === id); if (def) out.push({ key: 'e:' + id, kind: 'errand', def, step: st.active[id].step, set: n => { st.active[id].step = n; } }); }
    for (const a in CH) { const c = chState(a); if (c.active && CH[a][c.n]) out.push({ key: 'c:' + a, kind: 'chapter', agent: a, def: CH[a][c.n], step: c.step, set: n => { c.step = n; } }); }
    return out;
  }
  const stepOf = q => q.def.steps[q.step];
  function advance(q, notes) {
    q.set(++q.step);
    let s = stepOf(q);
    while (s && s.t === 'give') { give(s.item); q.set(++q.step); s = stepOf(q); }
    if (!s) finish(q, notes);
    else if (notes) notes.push(`${q.kind === 'chapter' ? agentName(q.agent) + ': ' : ''}${q.def.title}: next, ${stepText(s).replace(/^./, c => c.toLowerCase())}`);
    save();
  }
  function finish(q, notes) {
    if (q.kind === 'errand') {
      delete st.active[q.def.id]; st.done[q.def.id] = today(); pay(q.def.pay);
      if (q.def.trust) for (const a in q.def.trust) addTrust(a, q.def.trust[a]);
      if (notes) notes.push(`${q.def.title}: done (+${q.def.pay} Denny)`);
      return { who: q.def.from, text: q.def.thanks, pay: q.def.pay };
    }
    const c = chState(q.agent); c.active = false; c.step = 0; c.ready = true;   // the scene plays when you next talk to her
    if (notes) notes.push(`${agentName(q.agent)}: "${q.def.title}" (talk to her)`);
    return null;
  }

  /* -------------------------------------------------------------- talking -- */
  /* the first step that wants this person (talk, bring, slot), if any */
  function stepFor(id) {
    for (const q of quests()) {
      const s = stepOf(q); if (!s) continue;
      if ((s.t === 'talk' && s.to === id) || (s.t === 'bring' && s.to === id && has(s.item)) || (s.t === 'slot' && s.to === id && Lobby.slot() === s.slot)) return { q, s };
    }
    return null;
  }
  T.mark = id => {
    if (stepFor(id)) return '?';
    if (CH[id]) { const c = chState(id); if (c.ready || (!c.active && CH[id][c.n] && trust(id) >= GATE[c.n])) return '!'; }
    if (errandsToday().some(e => e.from === id && !st.active[e.id] && st.done[e.id] !== today())) return '!';
    return '';
  };
  /* returns true if the town took this conversation */
  T.talk = (id, who) => {
    S();
    const M = me(), sayAs = (sid, text) => ({ who: whoOf(sid), name: nameOf(sid), text });
    // a step that wants this person
    const f = stepFor(id);
    if (f) {
      const { q, s } = f, lines = [];
      if (s.t === 'bring') { take(s.item); lines.push({ who: M.who, name: M.name, text: `(You hand over the ${low(s.item)}.)` }); }
      if (s.reply) lines.push(sayAs(id, s.reply));
      const notes = []; const isLast = q.step === q.def.steps.length - 1;
      advance(q, notes);
      if (isLast && q.kind === 'errand') lines.push(sayAs(q.def.from === id ? id : q.def.from, q.def.thanks + `  (+${q.def.pay} Denny)`));
      if (q.kind === 'chapter' && chState(q.agent).ready && q.agent === id) return scene(id, lines);
      const nx = stepOf(q);
      if (nx) lines.push({ who: M.who, name: M.name, text: `(Next: ${stepText(nx)}.)` });
      else if (q.kind === 'chapter') lines.push({ who: M.who, name: M.name, text: `(${agentName(q.agent)} will want to hear about this.)` });
      if (!lines.length) lines.push(sayAs(id, q.kind === 'chapter' ? '...' : 'Thanks!'));
      MENU.say(lines);
      return true;
    }
    // an Agent: her story, her request, or (once a day) a little trust for the chat
    if (CH[id]) {
      if (!st.talked[id]) { st.talked[id] = 1; addTrust(id, 1); save(); }
      const c = chState(id);
      if (c.ready) return scene(id);
      if (!c.active && CH[id][c.n] && trust(id) >= GATE[c.n]) {
        const ch = CH[id][c.n], A = agentName(id);
        MENU.say(ch.ask.map((t, i) => Object.assign({ who: id, name: A, text: t }, i === ch.ask.length - 1 ? { choices: [
          { label: 'I\'ll do it', fn: () => { c.active = true; c.step = 0; save(); MENU.say([{ who: id, name: A, text: 'Thanks, Proxy! I\'ll be around.' }]); } },
          { label: 'Not now', fn: () => {} }] } : {})));
        return true;
      }
      return false;
    }
    // a shopkeeper's errand on offer today
    const e = errandsToday().find(x => x.from === id && !st.active[x.id] && st.done[x.id] !== today());
    if (e) {
      MENU.say([{ who: whoOf(id), name: nameOf(id), text: e.ask, choices: [
        { label: 'Leave it to me', fn: () => { st.active[e.id] = { step: 0 }; let s0 = e.steps[0]; while (s0 && s0.t === 'give') { give(s0.item); st.active[e.id].step++; s0 = e.steps[st.active[e.id].step]; } save(); MENU.say([{ who: whoOf(id), name: nameOf(id), text: 'Thank you!' }]); } },
        ...(shopFor(id) ? [{ label: 'Something else', fn: () => shopFor(id)() }] : []),
        { label: 'Not now', fn: () => {} }] }]);
      return true;
    }
    // the shops
    const sh = shopFor(id); if (sh) { sh(); return true; }
    return false;
  };
  function scene(id, pre) {
    const c = chState(id), ch = CH[id][c.n], M = me(), A = agentName(id);
    c.ready = false; c.n++; addTrust(id, 2); save();
    VOICE.line(id, ['obtain', 'select', 'confirm']);
    MENU.say((pre || []).concat([{ who: M.who, name: 'STORY', text: `${A}: ${ch.title}` }]).concat(ch.scene.map(([w, t]) => w === 'P' ? { who: M.who, name: M.name, text: t } : { who: id, name: A, text: t })).concat([{ who: id, name: A, text: `(Trust with ${A}: ${trust(id)}. ${!CH[id][c.n] ? 'You have seen all of her stories.' : trust(id) >= GATE[c.n] ? 'She has something else to ask you.' : `Her next story opens at trust ${GATE[c.n]}: talk to her each day, and take her into the Hollow.`})` }]));
    return true;
  }

  /* -------------------------------------------------------------- shopping -- */
  /* who keeps each shop: Sixth Street's, or another hub's (Chop Junior's Waterfall Soup, Eve's newsstand) */
  const keeper = { soup: 'chop', cafe: 'tinmaster', news: 'howl', shop: 'buy' };
  function shopFor(id) {
    if (id === 'chop' || id === 'chopjr' || id === 'kasa') { keeper.soup = id; return noodles; }
    if (id === 'tinmaster' || id === 'tinlumina') { keeper.cafe = id; return coffee; }
    if (id === 'buy' || id === 'ask' || id === 'change' || id === 'reed' || id === 'clerk747') { keeper.shop = id; return shop141; }
    if (id === 'howl' || id === 'eve' || id === 'ashuo') { keeper.news = id; return newsstand; }
    if (id === 'sweety') return yumcha;
    return null;
  }
  const afford = n => { if (S().denny >= n) return true; MENU.say([{ who: me().who, name: me().name, text: `(Not enough Denny. You have ${st.denny}.)` }]); return false; };
  function noodles() {
    const meal = S().meal;
    MENU.say([{ who: keeper.soup, name: nameOf(keeper.soup), text: (meal ? `You've still got the ${meal.name} in you! Another? ` : 'What\'ll it be? ') + `(You have ${st.denny} Denny.)`, choices: (keeper.soup === 'kasa' ? CHEESE : NOODLES).map(d => ({ label: `${d.name}, ${d.price} Denny (${d.note})`, fn: () => order(d) })).concat([{ label: 'Just looking', fn: () => {} }]) }]);
  }
  function order(d) {
    if (!afford(d.price)) return;
    pay(-d.price);
    Lobby.perform({ prefix: keeper.soup === 'kasa' ? 'cheese:seat' : 'soup:stool', act: 'eat', dur: 4.5 }, () => {
      S().meal = { id: d.id, name: d.name, buff: d.buff, note: d.note }; save();
      const notes = []; for (const q of quests()) { const s = stepOf(q); if (s && s.t === 'order' && (!s.dish || s.dish === d.id)) advance(q, notes); }
      MENU.say([{ who: keeper.soup, name: nameOf(keeper.soup), text: `${keeper.soup === 'kasa' ? 'Clean plate!' : 'Clean bowl!'} That ${d.name.toLowerCase()} will see you through your next fight. (${d.note})` }].concat(notes.map(n => ({ who: me().who, name: me().name, text: n }))));
    });
  }
  function coffee() {
    const done = S().coffeeDay === today();
    MENU.say([{ who: keeper.cafe, name: nameOf(keeper.cafe), text: `Welcome to Coff Cafe. (You have ${st.denny} Denny.)`, choices: [
      ...(done ? [] : [{ label: `Coffee of the day, ${COFFEE.price} Denny (${COFFEE.note}, once a day)`, fn: () => { if (!afford(COFFEE.price)) return; pay(-COFFEE.price); Lobby.perform({ prefix: 'cafe:t', act: 'drink', dur: 4 }, () => { S().coffee = { buff: COFFEE.buff, note: COFFEE.note }; st.coffeeDay = today(); save(); MENU.say([{ who: keeper.cafe, name: nameOf(keeper.cafe), text: `Properly made. It will steady you in your next fight. (${COFFEE.note})` }]); }); } }]),
      { label: `Coffee to go, ${ITEMS.coffee.price} Denny`, fn: () => { if (!afford(ITEMS.coffee.price)) return; pay(-ITEMS.coffee.price); give('coffee'); const n = bought('coffee'); MENU.say([{ who: keeper.cafe, name: nameOf(keeper.cafe), text: 'One to go. Mind, it is hot.' + n }]); } },
      { label: 'Just looking', fn: () => {} }] }]);
  }
  function shop141() {
    // the 141's Bangboo, Reed at Good Goods, the 747's clerks in Blazewood
    const K = keeper.shop === 'reed' ? { who: 'reed', name: 'Reed', hi: 'Welcome to Good Goods! Have a look around.', by: 'reed', byName: 'Reed', got: 'Here you go!' }
      : keeper.shop === 'clerk747' ? { who: 'clerk747', name: '747 Clerk', hi: 'Ehn-na! (The 747 is open: drinks, snacks, odds and ends.)', by: 'clerk747', byName: '747 Clerk', got: 'Ehn!' }
      : { who: 'buy', name: 'Buy', hi: 'Ehn-ne! (The till is open.)', by: 'change', byName: 'Give Change', got: 'Ehn-na!' };
    MENU.say([{ who: K.who, name: K.name, text: `${K.hi} (You have ${S().denny} Denny.)`, choices: SHOP141.map(k => ({ label: `${ITEMS[k].name}, ${ITEMS[k].price} Denny`, fn: () => { if (!afford(ITEMS[k].price)) return; pay(-ITEMS[k].price); give(k); const n = bought(k); MENU.say([{ who: K.by, name: K.byName, text: `${K.got} (You got: ${ITEMS[k].name}.)${n}` }]); } })).concat([{ label: 'Nothing, thanks', fn: () => {} }]) }]);
  }
  /* Yum Cha Sin: the neighbourhood's commission board (the errands and the stories) */
  function yumcha() {
    MENU.say([{ who: 'sweety', name: 'Sweety', text: 'Welcome to Yum Cha Sin! Tea, dim sum, and every bit of news in Failume Heights. The board has the neighbours\' requests.', choices: [
      { label: 'See the commission board', fn: () => T.journal() }, { label: 'Just the tea, thanks', fn: () => {} }] }]);
  }
  function bought(item) { const notes = []; for (const q of quests()) { const s = stepOf(q); if (s && s.t === 'buy' && s.item === item) advance(q, notes); } save(); return notes.length ? ` (${notes.join(' · ')})` : ''; }
  /* the daily luck: Howl's or Eve's scratch card, or A-Shuo's divination (one of them a day, as in the game) */
  const LUCK = {
    howl: { hi: '*boop* Do you need anything else?', card: 'A scratch card (one a day, free)', won: n => `*scratch scratch* ...${n} Denny! *boop* Congratulations!`, paper: true },
    eve: { hi: 'Papers, magazines, and a scratch card a day. Feeling lucky?', card: 'A scratch card (one a day, free)', won: n => `...${n} Denny! Not bad at all.`, paper: true },
    ashuo: { hi: 'Woof. (A-Shuo pushes the trigram mat toward you. One reading a day.)', card: 'A divination (one a day, free)', won: n => `(The trigrams settle.) Good fortune: ${n} Denny. Woof!` },
  };
  function newsstand() {
    const done = S().scratchDay === today(), dog = keeper.news === 'howl', Lk = LUCK[keeper.news] || LUCK.howl, K = t => ({ who: keeper.news, name: nameOf(keeper.news), text: t });
    MENU.say([Object.assign(K(Lk.hi), { choices: [
      ...(done ? [] : [{ label: Lk.card, fn: () => { const won = pick([5, 5, 10, 10, 15, 20, 30, 50]); st.scratchDay = today(); pay(won); MENU.say([K(Lk.won(won))]); } }]),
      ...(Lk.paper ? [{ label: 'Read the Ridu Weekly', fn: () => MENU.say([K(pick(RIDU))]) }] : []),
      ...(dog ? [{ label: 'Pet Howl', fn: () => MENU.say([K('*boop* Woof. (His tail thumps against the rack.)')]) }] : []),
      { label: 'Nothing', fn: () => {} }] })]);
  }

  /* --------------------------------------------- places on the street -- */
  const VENDS = { 'alley:vend': 'Vending machine', '141:icecream': 'Ice Cream Kingdom', 'east:vend': 'Vending machine', 'lum:vend': 'Vending machine' };
  T.places = () => {
    const out = [];
    for (const id in VENDS) { const sp = LIFE.spot(id); if (sp) out.push({ id: 'vend:' + id, label: VENDS[id], sub: id === '141:icecream' ? 'Ice cream · 6 Denny' : 'A drink · 5 Denny', x: sp.x, z: sp.z, y: 2.3 }); }
    for (const q of quests()) { const s = stepOf(q); if (s && s.t === 'pick') { const sp = LIFE.spot(s.at); if (sp) out.push({ id: 'pick:' + q.key, label: s.label, sub: 'Look', x: sp.x, z: sp.z, y: 1.5, quest: true }); } }
    // things in this hub to look at (hub.looks: the Section 6 office's desks and boards)
    const hub = window.Lobby && Lobby.hub && Lobby.hub();
    for (const k of (hub && hub.looks) || []) out.push({ id: 'look:' + k.id, label: k.label, sub: 'Look', x: k.x, z: k.z, y: k.y || 1.6 });
    return out;
  };
  T.usePlace = id => {
    if (id.startsWith('vend:')) {
      const ice = id.endsWith('icecream'), price = ice ? 6 : 5;
      if (!afford(price)) return;
      pay(-price); SFX.play('ui');
      Lobby.perform({ act: 'vend', dur: 1.2 }, () => Lobby.perform({ act: ice ? 'drink' : 'drink', dur: 3 }, () => MENU.say([{ who: me().who, name: me().name, text: ice ? '(Strawberry. It drips down your wrist.)' : pick(['(A can of TANKA Cola. Fizzy.)', '(Lemon soda. The can is ice cold.)', '(Something called "Nitro-Fuel Zero". Hm.)']) }])));
      return;
    }
    if (id.startsWith('look:')) {
      const k = ((Lobby.hub() || {}).looks || []).find(q => 'look:' + q.id === id);
      if (k) MENU.say(k.text.map(t => ({ who: me().who, name: me().name, text: t })));
      return;
    }
    if (id.startsWith('pick:')) {
      const q = quests().find(x => 'pick:' + x.key === id); if (!q) return;
      const s = stepOf(q); give(s.item); const notes = []; advance(q, notes);
      MENU.say([{ who: me().who, name: me().name, text: `(You found: ${ITEMS[s.item].name}.${notes.length ? ' ' + notes.join(' · ') : ''})` }]);
    }
  };

  /* -------------------------------------------------------------- battles -- */
  /* the meal and the coffee go into the next fight (and are eaten) */
  T.takeBuff = () => {
    S(); const parts = [], buff = {};
    for (const k of ['meal', 'coffee']) { const m = st[k]; if (!m) continue; for (const b in m.buff) buff[b] = b === 'assist' ? (buff[b] || 0) + m.buff[b] : (buff[b] || 1) * m.buff[b]; parts.push(k === 'meal' ? `${m.name} (${m.note})` : `Coffee (${m.note})`); st[k] = null; }
    if (!parts.length) return null;
    save();
    return { buff, note: 'Fuelled: ' + parts.join(', ') + '.' };
  };
  T.peekBuff = () => { S(); return [st.meal && st.meal.name, st.coffee && 'Coffee'].filter(Boolean).join(' + '); };
  const RANKS = ['F', 'C', 'B', 'A', 'S'];
  T.afterBattle = (B, rank) => {
    S();
    if (!B || B.opts.attract || B.result === 'retreat') return null;
    const win = B.result === 'win', notes = [];
    let earned = 0;
    if (B.rival) { if (win) earned = { patch: 30, vesper: 60, mirage: 100 }[B.rival.id] || 40; }
    else earned = Math.round(({ patrol: 40, elite: 70, boss: 120 }[B.opts.encounter] || 40) * ({ S: 1.5, A: 1.25, B: 1, C: 0.8, F: 0.2 }[rank] || 1));
    if (B.opts.dive) earned = 0;                                // a dive pays at its end (dive.js)
    if (earned) pay(earned);
    const squad = B.squad.map(s => s.id);
    if (win) for (const id of squad) if (CH[id] && !st.fought[id]) { st.fought[id] = 1; addTrust(id, 1); }
    for (const q of quests()) {
      const s = stepOf(q); if (!s || !win) continue;
      const f = s.f || {};
      if (s.t === 'clear' && !B.rival && (!f.arena || f.arena === B.opts.arena) && (!f.enc || f.enc === B.opts.encounter) && (!f.rank || RANKS.indexOf(rank) >= RANKS.indexOf(f.rank)) && (!f.with || squad.includes(f.with)) && (!f.lead || squad[0] === f.lead)) advance(q, notes);
      else if (s.t === 'clash' && B.rival && (!f.with || squad.includes(f.with))) advance(q, notes);
    }
    save();
    const text = [earned ? `+${earned} Denny (now ${st.denny})` : '', ...notes].filter(Boolean).join(' · ');
    return text ? { text } : null;
  };

  /* -------------------------------------------------------------- panels -- */
  T.agentInfo = id => { const c = chState(id), n = CH[id] ? CH[id].length : 0; return { trust: trust(id), done: c.n, of: n, active: c.active, next: c.n < n ? GATE[c.n] : null, title: CH[id] && CH[id][c.n] ? CH[id][c.n].title : '' }; };
  const stepText = s => ({
    buy: () => `Buy ${low(s.item)} at ${s.item === 'coffee' ? 'Coff Cafe' : 'the 141'}`,
    bring: () => `Bring the ${low(s.item)} to ${nameOf(s.to)}`,
    talk: () => `Talk to ${nameOf(s.to)}`, pick: () => `Find: ${s.label}`,
    clear: () => { const f = s.f || {}; return `In the Hollow: clear ${f.enc ? ({ patrol: 'a Patrol', elite: 'an Elite', boss: 'a Notorious hunt' })[f.enc] : 'a fight'}${f.arena ? ' at ' + ARENAS[f.arena].name : ''}${f.rank ? ` with rank ${f.rank} or better` : ''}${f.with ? ` with ${agentName(f.with)} in the squad` : ''}${f.lead ? ` with ${agentName(f.lead)} leading` : ''}`; },
    clash: () => `Win a Proxy Clash at Godfinger${s.f && s.f.with ? ` with ${agentName(s.f.with)} in the squad` : ''}`,
    order: () => `Eat ${s.dish ? NOODLES.find(d => d.id === s.dish).name.toLowerCase() : 'a bowl of noodles'} at Waterfall Soup`,
    slot: () => `Find ${nameOf(s.to)} in the ${['morning', 'afternoon', 'evening', 'late night'][s.slot]} (the sofa at Random Play passes the time)`,
  })[s.t]();
  T.journal = () => {
    S();
    const scr = document.getElementById('screens'), qs = quests();
    const row = (title, sub, cls) => el('div', { class: 'jr ' + (cls || '') }, el('b', null, title), el('small', null, sub));
    const bag = Object.keys(st.bag).map(k => `${ITEMS[k].name}${st.bag[k] > 1 ? ' ×' + st.bag[k] : ''}`).join(', ');
    const box = el('div', { class: 'box journal' },
      el('h2', null, 'REQUESTS'), el('p', null, `${U.fmt(st.denny)} Denny${bag ? ' · carrying: ' + bag : ''}${T.peekBuff() ? ' · fuelled: ' + T.peekBuff() : ''}`),
      el('h3', null, 'IN PROGRESS'),
      ...(qs.length ? qs.map(q => row(q.kind === 'chapter' ? `${agentName(q.agent)}: ${q.def.title}` : q.def.title, '▶ ' + stepText(stepOf(q)), q.kind)) : [row('Nothing yet', 'People with a ! over their heads have something for you.')]),
      el('h3', null, 'ASKING TODAY'),
      ...errandsToday().filter(e => !st.active[e.id]).map(e => row(e.title, st.done[e.id] === today() ? 'Done today' : `${nameOf(e.from)} · +${e.pay} Denny`, st.done[e.id] === today() ? 'done' : '')),
      el('h3', null, 'AGENTS'),
      el('div', { class: 'jr-agents' }, ...Object.keys(CH).map(id => { const i = T.agentInfo(id); return el('div', { class: 'jr-ag' }, el('img', { src: (window.PORTRAITS || {})[id] || '', alt: '' }), el('b', null, agentName(id)), el('small', null, `Trust ${i.trust} · stories ${i.done}/${i.of}`), el('small', null, i.active ? 'Request in progress' : i.next == null ? 'All stories seen' : i.trust >= i.next ? 'Has something to ask (!)' : `Next story at trust ${i.next}`)); })),
      el('div', { class: 'row' }, el('button', { class: 'btn small', onclick: () => p.remove() }, 'CLOSE'), el('button', { class: 'btn dark small', onclick: () => { p.remove(); MENU.records(); } }, 'RECORDS')));
    const p = el('div', { class: 'panel' }, box); scr.append(p);
  };

  window.TOWN = T;
})();
