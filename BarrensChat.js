/**
 * BarrensChat.js — Procedural MMO Chat Generator
 * 
 * Generates unique, hilarious Barrens-chat-style messages every single time.
 * Uses combinatorial template expansion with randomized fragments, names,
 * zone awareness, class references, and multi-message "thread" chains.
 * 
 * Produces 100,000+ unique messages from ~800 handcrafted fragments.
 */

import { CONFIG } from './config.js';
import { gameState } from './GameState.js';

// ─── Name Generators ──────────────────────────────────────────────────────────
const NAME_PREFIXES = [
    'Shadow', 'Dark', 'Xx', 'Epic', 'Holy', 'Swift', 'Dank', 'Mega', 'Ultra',
    'Lil', 'Big', 'Lord', 'Sir', 'xxX', 'Sneaky', 'Angry', 'Chill', 'AFK',
    'Pro', 'Noob', 'Chad', 'Based', 'Crispy', 'Soggy', 'Frosty', 'Spicy',
    'Salty', 'Toxic', 'Zen', 'Turbo', 'Hyper', 'Sleepy', 'Grumpy', 'Thicc',
    'Smol', 'Tall', 'Old', 'Wise', 'Fool', 'Lucky', 'Lost', 'Idle',
    'Void', 'Aether', 'Thorn', 'Dawn', 'Dusk', 'Iron', 'Gold', 'Crystal',
    'Elite', 'Savage', 'Brutal', 'Magic', 'Mystic', 'Rogue', 'Ghost',
    'Wild', 'Feral', 'Storm', 'Light', 'Shadow', 'Frost', 'Flame'
];

const NAME_CORES = [
    'Slayer', 'Hunter', 'Blade', 'Mage', 'Tank', 'Healer', 'Rogue', 'Knight',
    'Wizard', 'Archer', 'Bard', 'Monk', 'Cleric', 'Paladin', 'Ranger', 'Dragon',
    'Wolf', 'Bear', 'Cat', 'Rat', 'Wurm', 'Golem', 'Spider', 'Goblin',
    'Gamer', 'Player', 'King', 'Queen', 'Boss', 'Chief', 'Master', 'Dude',
    'Dad', 'Mom', 'Bro', 'Sis', 'Lad', 'Chad', 'Karen', 'Steve',
    'Puncher', 'Kicker', 'Farmer', 'Grinder', 'Looter', 'Crafter',
    'Warrior', 'Stalker', 'Seeker', 'Walker', 'Runner', 'Crawler', 'Dancer'
];

const NAME_SUFFIXES = [
    '', '', '', '', '69', '420', '99', '_xX', 'HD', '2024', '3000',
    '_v2', 'Jr', 'Sr', 'III', '_IRL', '_btw', 'Main', 'Alt', '_',
    '42', '007', '1337', 'OwO', 'UwU', 'XD', 'LOL', '_TTV', 'Gaming',
    'YT', 'Pro', 'God', 'OP', 'AFK', 'LUL', 'KEKW'
];

const SPECIAL_NAMES = [
    'Mankrik', 'NoobHunter', 'AFKmaster', 'RNGesus', 'LootGoblin', 'GrindGod',
    'Day1Player', 'Butterfingers', 'TouchGrass', 'MinMaxer', 'ExistDread',
    'ServerFirst', 'PartyWiper', 'DadJoke42', 'GuildMom', 'OfficerChad',
    'SneakyRogue', 'MetaSlave', 'PatchNotes', 'BardLife', 'ShowerThought',
    'Conspiracy99', 'FlipMaster', 'ZenMaster', 'HealthyGamer', 'CasualAndy',
    'OldTimer', 'Philosopher', 'SpeedRunner', 'ErrorReport', 'Realist',
    'ThatOneGuy', 'ItsJustAGame', 'MomSaidNo', 'PizzaRoll', 'GamerFuel',
    'BotOrNot', 'DefinitelyHuman', 'NotABot', 'TrustMeBro', 'MyUncleWorks',
    'HonestTrader', 'FairPrice', 'WurmSurvivor', 'GolemPhD', 'DrakeDebater',
    'PugLeader', 'WipeRecovery', 'LogsOrLie', 'ParseGod', 'FloorTank',
    'MechanicsDodger', 'StackOnMe', 'DontStand', 'HealthySnack', 'GFuelAddict',
    'MankriksWife', 'ZhevraHoof', 'BarrensChatLegend', 'ChuckNorris', 'Leeroy',
    'Jenkins', 'ThrallFan', 'ArthasDidNothingWrong', 'TheGrindNeverStops'
];

// ─── Template Components ──────────────────────────────────────────────────────

const ITEMS = [
    'Rusty Spoon', 'Legendary Boot (left)', 'Slightly Haunted Ring', 'Stick of Truth',
    'Sword of Moderate Discomfort', 'Shield of Procrastination', 'Helm of Bad Decisions',
    'Gauntlets of Butterfingers', 'Cape of Dramatic Entrances', 'Pants of Invisibility (only the pants)',
    'Staff of Aggressive Pointing', 'Dagger of Passive Aggression', 'Wand of Mild Inconvenience',
    'Boots of Running Away Really Fast', 'Ring of Questionable Enchantment', 'Amulet of "It Seemed Like a Good Idea"',
    'Belt of Holding (my pants up)', 'Tome of Blank Pages', 'Scroll of Aggressive Negotiation',
    'Potion of Temporary Confidence', 'Elixir of Mild Regret', 'Flask of Questionable Liquid',
    'Trophy of Participation', 'Badge of Almost Winning', 'Trinket That Does Nothing',
    'Crown of the Lunch King', 'Orb of Staring Blankly', 'Chalice of Lukewarm Water',
    'Bag of Holding (Grudges)', 'Necklace of Aggressive Jingling', 'Bracelet of +1 Vibes',
];

const MOBS_GENERIC = [
    'wurm', 'spider', 'golem', 'skeleton', 'rat', 'slime', 'ghost', 'imp',
    'drake', 'treant', 'crystal horror', 'frost wraith', 'void fiend', 'mushroom',
    'angry bush', 'sentient rock', 'bee swarm', 'crab with a knife', 'very large frog',
];

const LOCATIONS_FAKE = [
    'the Forgotten Bathroom', 'behind the AH', 'Mankrik\'s house', 'the shadow realm',
    'my guild leader\'s basement', 'that one cave nobody goes to', 'the wrong zone',
    'a bush I can\'t get out of', 'the tutorial zone (I\'m level 40)', 'the loading screen',
    'somewhere I shouldn\'t be', 'inside a mob\'s hitbox', 'the exact center of the map',
    'a glitched wall', 'my previous life', 'the auction house (mentally)', 'the grave (again)',
];

const NUMBERS = () => [
    Math.floor(Math.random() * 47000) + 1,
    Math.floor(Math.random() * 999) + 1,
    Math.floor(Math.random() * 69) + 1,
    Math.floor(Math.random() * 1000000),
][Math.floor(Math.random() * 4)];

const CLASSES = ['Aetherblade', 'Voidweaver', 'Thornwarden', 'Dawnkeeper'];
const CLASS_SHORT = ['warrior', 'mage', 'ranger', 'cleric'];

// ─── Message Template Categories ──────────────────────────────────────────────

const TEMPLATES = {
    // ── TRADE CHAT ──
    trade: [
        () => `WTS ${pick(ITEMS)} — ${pick(['only used once','barely cursed','free delivery','no lowballers','I know what I have','slight blood stains','worn gently','previous owner died (unrelated)'])}`,
        () => `WTB ${pick(ITEMS)} for ${NUMBERS()}g. ${pick(['dont ask why','its for science','my cat needs it','guild purposes','long story','im desperate','please'])}`,
        () => `WTS ${pick(MOBS_GENERIC)} fang ×${Math.floor(Math.random()*400)+1}. ${pick(['I have a problem','this is my life now','someone please buy these','farming is a lifestyle','they keep dropping','I cant stop'])}`,
        () => `Just bought my own ${pick(ITEMS)} back from the AH for ${Math.floor(Math.random()*5)+2}x what I sold it for`,
        () => `WTS water. Just regular water. ${Math.floor(Math.random()*50)+5}g.`,
        () => `Can you return items to mobs? Asking for a friend.`,
        () => `PSA: the vendor sells ${pick(ITEMS)} for ${Math.floor(Math.random()*10)+1}g and people are flipping them for ${Math.floor(Math.random()*500)+100}g. Stop falling for it.`,
        () => `WTS information. ${Math.floor(Math.random()*100)+10}g and I'll tell you where ${pick(MOBS_GENERIC)} spawns. (I don't actually know)`,
        () => `Selling my entire inventory because I need ${Math.floor(Math.random()*10000)+1000}g for a cosmetic hat`,
        () => `WTB literally anything. I have gold and no taste.`,
        () => `I've been trying to sell this ${pick(ITEMS)} for ${Math.floor(Math.random()*5)+2} hours. Please someone. Anyone.`,
        () => `WTS enchanting services. Success rate: ${pick(['pretty good','depends','about 50/50','better than last time','nonzero'])}`,
    ],

    // ── LFG ──
    lfg: [
        () => `LFG anything, ${pick(["I'm bored and overgeared","I have snacks","I promise I won't pull extra mobs","my last group kicked me but it wasn't my fault","I read a guide once"])}`,
        () => `LF1M ${pick(['tank','healer','anyone with a pulse','someone who knows the mechanics','a functioning adult'])} for ${pick(['literally anything','the hard dungeon','that boss nobody can kill','casual content (sweating)'])}`,
        () => `LFM know the fights, link achievement, ${Math.floor(Math.random()*500)+200}+ ilvl, bring snacks`,
        () => `LFG — will ${pick(['tank','heal','DPS','stand in the back and cheer','provide moral support'])} if someone gives me gold`,
        () => `Looking for group. Requirements: ${pick(["don't die","be nice","don't stand in fire","have at least 2 brain cells","know what your buttons do","breathe manually"])}`,
        () => `Need ${pick(['tank','healer'])} for ${pick(['10 minutes','like 5 minutes I swear','a quick run','an adventure','pain and suffering'])}. Currently ${Math.floor(Math.random()*40)+20} mins into search.`,
        () => `LFM no ${pick(CLASSES)} mains. Actually okay fine. ANYONE.`,
        () => `If anyone needs a ${pick(CLASS_SHORT)} I'm standing ${pick(['by the tree','in town','in the wrong zone','somewhere','right behind you'])} doing nothing`,
    ],

    // ── NEWBIE QUESTIONS ──
    newbie: [
        () => `how do i ${pick(['eat food','equip items','leave this zone','open inventory','use skills','stop dying','get gold','talk to NPCs','unlearn a talent'])}`,
        () => `why is ${pick(['everything trying to kill me','my health bar red','the zone so dark','the boss so big','my damage so low','my character walking so slow','the chat moving so fast'])}`,
        () => `where do I ${pick(['sell stuff','find the boss','get better gear','learn new skills','go after the tutorial','find other players','report a bug'])}`,
        () => `is there ${pick(['fall damage','PvP','a map','an AH','voice chat','a pause button','a way to pet the animals','fast travel'])} in this game`,
        () => `I just walked into ${pick(LOCATIONS_FAKE)} and everything one-shot me`,
        () => `wait this game is ${pick(['idle?? I\'ve been clicking mobs manually for an hour','auto?? what do I even do then','multiplayer?? who are all these people','an MMO?? I thought it was single player'])}`,
        () => `I accidentally ${pick(['sold my weapon','learned the wrong talent','ate all my potions','walked into the boss room','deleted my quest item'])}. ${pick(["I'm punching things now","this is fine","can I undo","help","I'll figure it out","my career is over"])}`,
        () => `guys I've been ${pick(['walking in circles for 20 minutes','fighting the same mob repeatedly','standing here waiting for something to happen','reading the lore and I have questions'])}`,
        () => `do mobs ${pick(['drop better loot at night','get harder over time','respawn faster if you dance','have feelings','remember you'])}?`,
    ],

    // ── PHILOSOPHY & DEEP THOUGHTS ──
    philosophy: [
        () => `If a mob dies in a forest and no one loots it, does it drop anything?`,
        () => `We're all just NPCs in someone else's idle game`,
        () => `The real ${pick(['endgame content','legendary drop','achievement','boss fight','progression'])} was the ${pick(['friends we made','drama we caused','gold we wasted','time we lost','bugs we found'])} along the way`,
        () => `My character has been grinding for ${Math.floor(Math.random()*72)+1} hours straight without sleep. Is he okay?`,
        () => `We don't choose the grind. The grind chooses us.`,
        () => `Technically every game is an idle game if you just ${pick(['stop playing','walk away','close your eyes','alt-tab','fall asleep'])}`,
        () => `${pick(['Sleep','Eating','Socializing','Going outside','Exercise'])} is just ${pick(['an 8 hour debuff','a DPS loss','a waste of grinding time','maintenance mode','the real endgame'])} with no combat benefits`,
        () => `If auto-battle does all the fighting, are WE the idle ones?`,
        () => `Do our characters know they're in a game? Do they judge our decisions?`,
        () => `What if the real gold was the friends we— nah I need actual gold, I'm broke`,
        () => `If I log out, does my character just stand there? Does he get bored? Does he think about me?`,
        () => `Every ${pick(MOBS_GENERIC)} I kill had a family. I choose not to think about this.`,
        () => `I wonder what the mobs talk about when we're not around`,
        () => `The fact that we grind for hours for imaginary numbers says a lot about society`,
    ],

    // ── CLASS COMPLAINTS ──
    classBalance: [
        () => `${pick(CLASSES)} is so ${pick(['OP','broken','busted','unfair','braindead'])}. Nerf ${pick(['everything','their main skill','their existence','their damage','them to the ground'])} pls`,
        () => `${pick(CLASSES)} main here. We're perfectly balanced. Source: am ${pick(CLASSES)} main.`,
        () => `${pick(['Everything is OP when you\'re bad at the game','Have you tried getting good','Skill issue honestly','The game is perfectly balanced, you just need better gear'])}`,
        () => `they nerfed my class ${pick(['into the ground','to oblivion','personally','specifically to hurt me','and I will never recover emotionally'])}`,
        () => `Patch notes: ${pick(["fixed a bug where players were having fun","nerfed fun by 15%","buffed the class nobody plays","changed something nobody asked for","broke 3 things while fixing 1"])}. Sorry.`,
        () => `If you're not running ${pick(CLASSES)} right now, ${pick(["what are you even doing","are you okay","that's brave","I respect the commitment","you must really like pain"])}`,
        () => `Hot take: ${pick(CLASSES)} ${pick(['mains','players'])} are the ${pick(['most annoying','bravest','smartest','most unhinged','chillest','scariest'])} players in this game`,
        () => `I rerolled from ${pick(CLASSES)} to ${pick(CLASSES)} and ${pick(["my damage tripled","I immediately died","I've never been happier","I regret everything","it was worth it","everything makes sense now"])}`,
    ],

    // ── ABSURD SCENARIOS ──
    absurd: [
        () => `A level 1 ${pick(MOBS_GENERIC)} swarm could take down any boss if you had enough of them`,
        () => `I did the math. You would need approximately ${NUMBERS().toLocaleString()} ${pick(MOBS_GENERIC)}s.`,
        () => `Can a ${pick(MOBS_GENERIC)} ${pick(['swim','fly','feel love','hold a conversation','pay taxes','use the AH','learn magic'])}? This is important.`,
        () => `According to the lore, ${pick(['yes but they choose not to','technically no but actually yes','it depends on the moon phase','nobody knows and the devs won\'t answer','they used to but it was patched out'])}`,
        () => `What if we could ${pick(['tame','ride','befriend','marry','negotiate with','tip','adopt'])} the ${pick(MOBS_GENERIC)}s instead of killing them`,
        () => `Fun fact: you CAN ${pick(['punch','hug','reason with','bribe','insult','compliment'])} a ${pick(MOBS_GENERIC)}. ${pick(['Once.','It doesn\'t help.','They don\'t like it.','Results may vary.','10/10 would recommend.','You will die.'])}`,
        () => `I just watched ${Math.floor(Math.random()*5)+2} ${pick(MOBS_GENERIC)}s walk into each other in a circle for ${Math.floor(Math.random()*10)+2} minutes. Best content in the game.`,
        () => `What happens if you lead a ${pick(MOBS_GENERIC)} to the boss room? ${pick(["Asking for science.","I need to know.","Someone try this.","I'm about to find out.","Don't tell the mods."])}`,
        () => `Petition to add ${pick(['a fishing minigame','housing','a dating sim','cooking','gardening','a card game','pet battles','a rhythm game'])} to this game`,
        () => `I just realized ${pick(MOBS_GENERIC)}s have ${pick(['no kneecaps','exactly 3 hit points of self respect','families they\'re trying to feed','tiny hats if you look closely','their own guild'])}`,
    ],

    // ── MMO CHAOS ──
    chaos: [
        () => `brb ${pick(['bio','afk','my house is on fire','cat on keyboard','pizza arrived','existential crisis','crying','my mom called','someone is at the door','nap time'])}`,
        () => `...sorry about that my ${pick(['cat','dog','child','roommate','elbow','ghost','brain'])} ${pick(['sat on my keyboard','pulled the plug','distracted me','made me panic','ruined everything'])} and I ${pick(['pulled 8 mobs','died instantly','spent all my gold','deleted my gear','ran into the boss','teleported somewhere weird'])}`,
        () => `Any% ${pick(['boss rush','zone clear','death speedrun','gold waste','inventory fill','level 1 challenge'])} is possible in ${Math.floor(Math.random()*10)+1} minutes if you believe hard enough`,
        () => `*${pick(['unsheathes blade','adjusts glasses','cracks knuckles','takes a deep breath','dramatically poses','tips fedora'])} dramatically* ${pick(["Finally, a worthy—oh it died already","It's go time—wait wrong hotbar","My time has come—lag spike, I'm dead","Behold my power—I'm out of mana"])}`,
        () => `I've been ${pick(['farming this spot','grinding this zone','fighting this mob','standing here','clicking this button'])} for ${Math.floor(Math.random()*12)+1} hours. I have become one with the ${pick(['respawn timer','grind','void','error message','loading screen'])}.`,
        () => `I play this game to ${pick(['relax','unwind','de-stress','have fun','escape reality'])}. Anyway I just ${pick(['broke my mouse','punched my desk','screamed at a wurm','had a breakdown','threw my headphones'])}`,
        () => `is it just me or is everything ${pick(['laggy','rubber banding','on fire','sideways','upside down','in slow motion','speaking French'])}`,
        () => `Server first ${pick(['reply to this message','death to a level 1 mob','gold spent on potions','talent respec','ragequit','emotional damage'])}`,
        () => `I told my party I was a ${pick(['tank main','healer','DPS god','veteran','pro gamer','adult with responsibilities'])}. They found out I ${pick(["meant fish tank","lied","was level 3","was AFK the whole time","have no idea what I'm doing","was the reason we wiped"])}`,
        () => `Just got a ${pick(['legendary','mythic','rare','common','broken'])} drop from a level ${Math.floor(Math.random()*3)+1} ${pick(MOBS_GENERIC)}. ${pick(["Later nerds.","I peaked.","It's all downhill from here.","I'm retiring.","RNG is real."])}`,
        () => `I have killed ${NUMBERS().toLocaleString()} ${pick(MOBS_GENERIC)}s. Zero ${pick(['fangs','drops','epics','good memories','regrets'])}. ${pick(['Is this game broken or am I cursed.','This is fine.','I love this game.','Send help.','Working as intended.'])}`,
        () => `Bug report: the game is too ${pick(['fun','addictive','good','time-consuming','pretty'])} and it's affecting my ${pick(['real life','sleep schedule','social life','grades','job','relationship','diet'])}`,
    ],

    // ── WHOLESOME ──
    wholesome: [
        () => `Hey, you're doing great. Keep ${pick(['grinding','going','believing','clicking','existing'])}. Proud of you.`,
        () => `Just hit a new personal best ${pick(['DPS','level','gold count','death count','AFK time'])}!! ${pick(["Oh wait, wrong zone. Still counts.","I'm actually crying.","Mom get the camera!","Screenshot or it didn't happen.","Don't check the logs."])}`,
        () => `${pick(["Has everyone eaten today? Real food. Not in-game food.","Remember to hydrate gamers","Don't forget to stretch!","Take breaks, your eyes will thank you","Go touch grass then come back, I'll wait"])}`,
        () => `This ${pick(['community','guild','zone','game','chat'])} is ${pick(['actually really nice','the best','surprisingly wholesome','why I keep playing','my happy place'])}`,
        () => `Shoutout to the random ${pick(CLASSES)} who ${pick(['helped me with that boss','gave me free gear','buffed me for no reason','said hi when everyone else ignored me','carried me through the zone'])}`,
        () => `New player here and ${pick(["everyone has been so helpful","I'm having a blast","I can't stop playing","this is way better than I expected","I'm already addicted"])}`,
    ],

    // ── CONSPIRACY / RUMORS ──
    conspiracy: [
        () => `The drop rates are ${pick(['rigged','fake','a simulation','controlled by the moon','worse on Tuesdays','better if you spin your character first'])}. ${pick(["My uncle works at the game company.","I have proof (I don't).","You can't convince me otherwise.","Wake up sheeple.","Trust me bro."])}`,
        () => `Fun fact: the devs hid a ${pick(['secret NPC','hidden boss','easter egg','free legendary','portal','developer room'])} ${pick(['behind the waterfall','in the starting zone','if you type /dance 50 times','at exactly midnight','in the loading screen'])}. ${pick(["Jk there's no waterfall.","Or did they?","I can't prove it.","Nobody believes me.","It's real I swear."])}`,
        () => `${pick(["Going outside. Will report back.","Touched grass today.","Went to the store IRL."])} ${pick(["The graphics are good but the gameplay is mid.","No minimap. Hostile NPCs (bees). 0/10.","No respawn points. Very hardcore.","The NPCs don't have quest markers.","Loot tables are terrible.","Framerate was solid though."])}`,
        () => `I heard if you ${pick(['kill','farm','hug','ignore','compliment','insult'])} exactly ${NUMBERS().toLocaleString()} ${pick(MOBS_GENERIC)}s you unlock ${pick(['a secret class','the real ending','developer mode','unlimited gold','the forbidden zone','nothing and it was a lie'])}`,
        () => `The ${pick(MOBS_GENERIC)}s are ${pick(['getting smarter','watching us','evolving','unionizing','planning something','definitely plotting'])} and I have ${pick(['evidence','a theory','anxiety','screenshots','no proof but strong feelings'])}`,
    ],

    // ── ROLEPLAY GONE WRONG ──
    roleplay: [
        () => `*${pick(['slowly approaches','teleports behind you','unsheathes sword','opens spellbook','adjusts monocle','trips over rock'])}* ${pick(["Nothing personnel, kid","I am the chosen one—oh there's a queue","Fear my wrath—one sec brb bio","Darkness consumes—is that a butterfly?"])}`,
        () => `I'm roleplaying as a ${pick(['pacifist in a combat game','merchant who only sells feelings','healer who can\'t find the heal button','tank who\'s afraid of mobs','bard but I only know one song','retired adventurer just vibing'])}`,
        () => `My character's backstory is ${Math.floor(Math.random()*20)+3} pages long and ${pick(["nobody asked","I will tell everyone anyway","it involves cheese","it's mostly fanfiction","it contradicts the actual lore","I cry every time I read it"])}`,
        () => `I've been walking around in circles for ${Math.floor(Math.random()*30)+5} minutes because it's what my character would do`,
    ],

    // ── MULTI-LINE CHAINS (returns an array) ──
    chains: [
        () => {
            const mob = pick(MOBS_GENERIC);
            return [
                { delay: 0, msg: `Guys I just discovered something about ${mob}s` },
                { delay: 3000, msg: `If you ${pick(['stare at','walk around','dance near','crouch next to','insult'])} them long enough...` },
                { delay: 6000, msg: pick([`nothing happens. I wasted 20 minutes.`, `they ${pick(["stare back","get bigger","start following you","make a noise","judge you"])}`, `actually I forgot what I was going to say`]) },
            ];
        },
        () => {
            const name1 = generateName();
            return [
                { delay: 0, user: name1, msg: `guys I found a shortcut to the boss` },
                { delay: 4000, user: name1, msg: `nvm that was the boss` },
                { delay: 6000, user: name1, msg: `I'm dead` },
            ];
        },
        () => {
            const n1 = generateName(), n2 = generateName();
            return [
                { delay: 0, user: n1, msg: `${pick(CLASSES)} is the best class, fight me` },
                { delay: 3000, user: n2, msg: `that's literally the worst class` },
                { delay: 6000, user: n1, msg: `${pick(["1v1 me","check the DPS charts","my dad could beat up your dad","agree to disagree","you wouldn't say that to my face","okay maybe you're right"])}` },
            ];
        },
        () => {
            const n1 = generateName();
            return [
                { delay: 0, user: n1, msg: `how do I open the map` },
                { delay: 5000, user: n1, msg: `nvm found it` },
                { delay: 8000, user: n1, msg: `wait no that's the talent tree` },
                { delay: 11000, user: n1, msg: `I accidentally spent all my points` },
            ];
        },
        () => {
            const n1 = generateName(), n2 = generateName();
            const item = pick(ITEMS);
            return [
                { delay: 0, user: n1, msg: `WTS ${item} 500g` },
                { delay: 4000, user: n2, msg: `I'll give you 5g` },
                { delay: 7000, user: n1, msg: `that's insulting` },
                { delay: 10000, user: n2, msg: `6g` },
                { delay: 12000, user: n1, msg: `...deal` },
            ];
        },
        () => {
            const n1 = generateName(), n2 = generateName();
            return [
                { delay: 0, user: n1, msg: `guild bank audit: who took ${NUMBERS().toLocaleString()} gold and left an IOU note` },
                { delay: 4000, user: n2, msg: `it was for guild purposes` },
                { delay: 7000, user: n1, msg: `you bought a cosmetic hat` },
                { delay: 9000, user: n2, msg: `a GUILD cosmetic hat` },
            ];
        },
        () => {
            const n1 = generateName();
            const mob = pick(MOBS_GENERIC);
            return [
                { delay: 0, user: n1, msg: `I've been farming ${mob}s for ${Math.floor(Math.random()*6)+1} hours` },
                { delay: 4000, user: n1, msg: `I can hear them in my sleep` },
                { delay: 8000, user: n1, msg: `${pick(["I think they're farming ME at this point","we have an understanding now","they know my name","I've started naming them","this is my life"])}` },
            ];
        },
        () => {
            const n1 = generateName();
            return [
                { delay: 0, user: n1, msg: `hot take incoming` },
                { delay: 3000, user: n1, msg: pick([
                    `this game would be better with fishing`,
                    `the final boss should be a giant ${pick(MOBS_GENERIC)}`,
                    `idle games are the peak of game design`,
                    `healers are the real DPS`,
                    `gold is just imaginary numbers... wait`,
                    `the tutorial is the hardest part of any game`,
                ]) },
            ];
        },
    ],

    // ── ZONE-AWARE (uses current zone context) ──
    zoneAware: [
        (zone) => `This ${zone.name} zone is ${pick(['beautiful','terrifying','confusing','massive','my favorite','giving me anxiety','surprisingly cozy','way too dark'])}`,
        (zone) => `The ${pick(MOBS_GENERIC)}s in ${zone.name} ${pick(["hit different","are built different","have no chill","are personally targeting me","are too strong","are weirdly cute"])}`,
        (zone) => `Pro tip for ${zone.name}: ${pick(["don't","run","bring potions","cry","just AFK honestly","stack defense","accept your fate"])}`,
        (zone) => `Who designed ${zone.name}?? ${pick(["I just wanna talk","They were having a bad day","It's genius honestly","Clearly someone who hates us","Give them a raise","Actually I love it"])}`,
        (zone) => `${zone.name} has the best ${pick(['vibes','music','mobs to hate','scenery','death spots','grinding spots'])} in the game`,
        (zone) => `Level ${zone.levelRange[0]}-${zone.levelRange[1]} zone and I'm level ${Math.max(zone.levelRange[0] - Math.floor(Math.random()*5), 1)}. ${pick(["I'll be fine.","How hard could it be.","This was a mistake.","I've made worse decisions.","YOLO."])}`,
        (zone) => `Anyone else notice the ${pick(['weird noise','floating thing','suspicious rock','glowing spot','ominous shadow','creepy music'])} in ${zone.name}?`,
    ],

    // ── SAY CHANNEL (local, shorter, more casual) ──
    say: [
        () => `${pick(['nice gear','cool character','sick damage','that was clean','impressive','not bad','respect'])}`,
        () => `${pick(["gg","gf","wp","nice","bruh","lol","oof","rip","F","same"])}`,
        () => `${pick(["did you see that??","that was insane","I can't believe that worked","how did that happen","what just happened"])}`,
        () => `${pick(["I've been here for way too long","I should probably go to sleep","one more mob then I'll stop","okay maybe one more zone","last run I swear"])}`,
        () => `♪ ${pick(["Ninety nine mobs of wurm on the wall","Grinding grinding grinding","Another one bites the dust","We will we will grind you","Never gonna give you up"])} ♪`,
        () => `${pick(['just vibing','AFK for a bit','don\'t mind me','passing through','sorry about that','my bad','oops'])}`,
    ],

    // ── UNSOLICITED ADVICE ──
    advice: [
        () => `Pro tip: ${pick(["don't die","just do more damage","have you tried not getting hit","gear is overrated, skill is—actually gear helps a lot","if you're struggling, just be better","the secret is to never log off"])}`,
        () => `${pick(CLASSES)} main here. The trick is to ${pick(["press all your buttons at once","close your eyes and believe","blame the healer","alt-tab and hope for the best","just auto-attack honestly","pretend you know the mechanics"])}`,
        () => `I saw a ${pick(['guide','video','post','spreadsheet','graph','tier list'])} that said ${pick(["everything I do is wrong","my build is actually S-tier","this game has been solved","nothing matters past level 20","optimal play is to not play"])}`,
        () => `Unprompted advice: ${pick(["always keep your potions full","never trust a trade from a stranger","the AH is a trap","save your gold for endgame","respec early and often","read the patch notes"])}`,
    ],
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateName() {
    // 40% chance special name, 60% procedural
    if (Math.random() < 0.4) return pick(SPECIAL_NAMES);
    return pick(NAME_PREFIXES) + pick(NAME_CORES) + pick(NAME_SUFFIXES);
}

// ─── Main Generator ──────────────────────────────────────────────────────────

// Track recent messages to avoid repeats
let _recentMessages = [];
const MAX_RECENT = 30;

function addToRecent(msg) {
    _recentMessages.push(msg);
    if (_recentMessages.length > MAX_RECENT) _recentMessages.shift();
}

function isRecent(msg) {
    return _recentMessages.includes(msg);
}

/**
 * Generate a single unique chat message.
 * @param {string} [preferredChannel] - Force a channel ('Map','Say')
 * @returns {{ channel: string, user: string, msg: string }}
 */
export function generateMessage(preferredChannel = null) {
    const zone = gameState.getCurrentZone ? gameState.getCurrentZone() : CONFIG.ZONES[0];
    
    // Weighted category selection (guild removed — weight redistributed to Map/Say)
    const weights = [
        { cat: 'trade', w: 13, ch: 'Map' },
        { cat: 'lfg', w: 11, ch: 'Map' },
        { cat: 'newbie', w: 10, ch: 'Map' },
        { cat: 'philosophy', w: 9, ch: 'Map' },
        { cat: 'classBalance', w: 9, ch: 'Map' },
        { cat: 'absurd', w: 13, ch: 'Map' },
        { cat: 'chaos', w: 15, ch: 'Map' },
        { cat: 'wholesome', w: 7, ch: 'Say' },
        { cat: 'conspiracy', w: 8, ch: 'Map' },
        { cat: 'roleplay', w: 5, ch: 'Map' },
        { cat: 'zoneAware', w: 9, ch: 'Map' },
        { cat: 'say', w: 9, ch: 'Say' },
        { cat: 'advice', w: 6, ch: 'Map' },
    ];

    // Filter by preferred channel if specified
    let pool = preferredChannel 
        ? weights.filter(w => w.ch === preferredChannel || w.ch === 'Map')
        : weights;
    
    const totalWeight = pool.reduce((s, w) => s + w.w, 0);
    
    // Try up to 5 times to get a non-recent message
    for (let attempt = 0; attempt < 5; attempt++) {
        let roll = Math.random() * totalWeight;
        let selected = pool[0];
        for (const w of pool) {
            roll -= w.w;
            if (roll <= 0) { selected = w; break; }
        }

        const templates = TEMPLATES[selected.cat];
        const template = pick(templates);
        
        let msg;
        if (selected.cat === 'zoneAware') {
            msg = template(zone);
        } else {
            msg = template();
        }
        
        if (!isRecent(msg)) {
            addToRecent(msg);
            return {
                channel: preferredChannel || selected.ch,
                user: generateName(),
                msg
            };
        }
    }
    
    // Fallback: always generate something
    const fallback = pick(TEMPLATES.chaos)();
    addToRecent(fallback);
    return {
        channel: preferredChannel || 'Map',
        user: generateName(),
        msg: fallback
    };
}

/**
 * Generate a chat message chain (multi-message thread).
 * Returns an array of { channel, user, msg, delay } objects.
 * The caller should schedule them with setTimeout.
 */
export function generateChain() {
    const chainTemplate = pick(TEMPLATES.chains);
    const entries = chainTemplate();
    const defaultUser = generateName();
    
    return entries.map(e => ({
        channel: 'Map',
        user: e.user || defaultUser,
        msg: e.msg,
        delay: e.delay || 0,
    }));
}

/**
 * Generate a "say" message for FakePlayer overhead bubbles.
 * Shorter, more casual messages suited for world bubbles.
 */
export function generateBubbleMessage() {
    const zone = gameState.getCurrentZone ? gameState.getCurrentZone() : CONFIG.ZONES[0];
    
    const bubbleTemplates = [
        ...TEMPLATES.say,
        // Extra short ones for bubbles
        () => `${pick(['lol','bruh','gg','nice','oof','rip','wow','huh','wait what','oh no'])}`,
        () => `${pick(MOBS_GENERIC)} ${pick(['down','dead','slain','destroyed','defeated','obliterated'])}!`,
        () => `Need ${pick(['heals','mana','a break','gold','help','sleep','motivation','snacks'])}...`,
        () => `${pick(['Anyone','Someone','Hello?','Hey'])} ${pick(['want to party?','need help?','got potions?','here?','alive?'])}`,
        () => `Level ${Math.floor(Math.random()*50)+1} ${pick(['and counting','baby!','finally!','...send help','at last','let\'s go'])}`,
        () => `This ${pick(['zone','mob','boss','loot','grind','view'])} is ${pick(['insane','wild','perfect','brutal','gorgeous','sketchy','sus'])}`,
        () => `Just ${pick(['one more','five more','a few more','okay many more'])} ${pick(['mobs','quests','minutes','levels','runs'])}...`,
        () => `${pick(["I've seen things","I regret nothing","Worth it","No ragrets","Send help","This is fine"])}`,
        () => `*${pick(['dances','waves','sits down','stretches','yawns','flexes','trips','stumbles'])}*`,
        () => `${pick(['Where\'s the','Has anyone seen the','Looking for the'])} ${pick(['boss','exit','vendor','healer','tank','point of all this'])}`,
        () => `My ${pick(ITEMS)} just ${pick(['broke','vanished','started glowing','made a noise','got stolen','evolved'])}??`,
    ];
    
    return pick(bubbleTemplates)();
}

// ─── Scheduled Chain System ──────────────────────────────────────────────────

let _chainTimeouts = [];

/**
 * Fire a message chain into the game chat with realistic delays.
 */
export function fireChain() {
    // Clear any pending chain
    for (const t of _chainTimeouts) clearTimeout(t);
    _chainTimeouts = [];
    
    const chain = generateChain();
    for (const entry of chain) {
        const t = setTimeout(() => {
            gameState.addChatMessage(entry.channel, entry.user, entry.msg);
        }, entry.delay);
        _chainTimeouts.push(t);
    }
}

/**
 * Clean up pending chain timeouts (call on zone change, etc.)
 */
export function clearPendingChains() {
    for (const t of _chainTimeouts) clearTimeout(t);
    _chainTimeouts = [];
    _recentMessages = [];
}
