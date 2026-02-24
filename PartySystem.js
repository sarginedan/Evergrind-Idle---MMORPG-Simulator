// PartySystem.js — Simulated MMORPG Party System
// Unlocks at Shattered Expanse. Party size grows with zone progression.
// Party members are AI "players" with their own class, gear, level, and DPS.
// Party chat simulates the authentic WoW dungeon finder experience:
// polite strangers → awkward silence → passive aggression → full tilt

import { CONFIG } from './config.js';
import { gameState } from './GameState.js';

// ══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════

/** Zone ID → max party size (including the player) */
const ZONE_PARTY_CAP = {
    shattered_expanse: 2,
    molten_abyss:      3,
    abyssal_depths:    4,
    neon_wastes:       5,
    halo_ring:         5,
    crimson_reach:     5,
};

const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric'];

const CLASS_DISPLAY = {
    warrior: { name: 'Aetherblade', color: '#4488cc', icon: '⚔️' },
    mage:    { name: 'Voidweaver',  color: '#aa66ff', icon: '🔮' },
    ranger:  { name: 'Thornwarden', color: '#66bb44', icon: '🏹' },
    cleric:  { name: 'Dawnkeeper',  color: '#ffcc44', icon: '✨' },
};

const FIRST_NAMES = [
    'Kael', 'Lyra', 'Theron', 'Zara', 'Brynn', 'Dax', 'Elara', 'Finn',
    'Gwyn', 'Haze', 'Iris', 'Jett', 'Kira', 'Lux', 'Mira', 'Nyx',
    'Orion', 'Pax', 'Quinn', 'Riven', 'Sable', 'Talon', 'Uma', 'Vex',
    'Wren', 'Xara', 'Yuki', 'Zephyr', 'Ash', 'Blaze', 'Cass', 'Drake',
    'Echo', 'Frost', 'Gale', 'Haven', 'Ivy', 'Jade', 'Knox', 'Luna',
];

const SUFFIXES = [
    '', '_xX', '42', 'HD', '_GG', '99', 'TV', '_RL', 'Pro', 'Jr',
    'Arc', '_EU', '_NA', 'OP', 'Boss', '', '', '', '', '',
];

const ARMOR_TYPE_FOR_CLASS = {
    warrior: 'mail',
    ranger:  'leather',
    mage:    'cloth',
    cleric:  'cloth',
};

// ── Weapon templates per class (mirrors Inventory.js style) ─────────
const PARTY_WEAPONS = {
    warrior: [
        { name: 'Iron Longsword', iconKey: 'sword' },
        { name: 'Forest Cleaver', iconKey: 'axe' },
        { name: 'Verdant Blade', iconKey: 'sword' },
        { name: 'Thornfang Greatsword', iconKey: 'sword' },
        { name: 'Wyrmtooth Saber', iconKey: 'sword' },
        { name: 'Aether Reaver', iconKey: 'axe' },
    ],
    mage: [
        { name: 'Apprentice Staff', iconKey: 'crystal' },
        { name: 'Void-Touched Rod', iconKey: 'crystal' },
        { name: 'Riftweaver Staff', iconKey: 'crystal' },
        { name: 'Entropy Scepter', iconKey: 'crystal' },
        { name: 'Abyssal Focus', iconKey: 'crystal' },
        { name: 'Singularity Staff', iconKey: 'crystal' },
    ],
    ranger: [
        { name: "Hunter's Longbow", iconKey: 'brambleShot' },
        { name: 'Thornwood Recurve', iconKey: 'brambleShot' },
        { name: 'Sylvan Greatbow', iconKey: 'brambleShot' },
        { name: 'Viper Fang Bow', iconKey: 'brambleShot' },
        { name: 'Stormstring Warbow', iconKey: 'brambleShot' },
        { name: 'Wrath of the Wilds', iconKey: 'brambleShot' },
    ],
    cleric: [
        { name: 'Iron Scepter', iconKey: 'dawnStrike' },
        { name: 'Blessed Cudgel', iconKey: 'dawnStrike' },
        { name: 'Dawn Censer', iconKey: 'dawnStrike' },
        { name: 'Solaris Mace', iconKey: 'dawnStrike' },
        { name: 'Radiant Hammer', iconKey: 'dawnStrike' },
        { name: 'Chorus of Dawn', iconKey: 'dawnStrike' },
    ],
};

// ── Armor templates by type ─────────────────────────────────────────
const PARTY_ARMOR = {
    mail: {
        helm:  [{ name: 'Chain Coif', iconKey: 'helm' }, { name: 'Iron Half-Helm', iconKey: 'helm' }, { name: 'Plated Warhelm', iconKey: 'helm' }, { name: 'Drakescale Crown', iconKey: 'crown' }],
        chest: [{ name: 'Chain Hauberk', iconKey: 'chestArmor' }, { name: 'Reinforced Mail', iconKey: 'chestArmor' }, { name: 'Battleworn Cuirass', iconKey: 'chestArmor' }, { name: 'Ancient Treant Armor', iconKey: 'chestArmor' }],
        legs:  [{ name: 'Chain Leggings', iconKey: 'legsArmor' }, { name: 'Reinforced Greaves', iconKey: 'legsArmor' }, { name: 'Plated Legguards', iconKey: 'legsArmor' }],
        boots: [{ name: 'Chain Sabatons', iconKey: 'boots' }, { name: 'Ironshod Greaves', iconKey: 'boots' }, { name: 'Warplate Treads', iconKey: 'boots' }],
    },
    leather: {
        helm:  [{ name: 'Leather Cap', iconKey: 'helm' }, { name: 'Hardened Hood', iconKey: 'helm' }, { name: "Stalker's Mask", iconKey: 'helm' }, { name: 'Primal Crown', iconKey: 'crown' }],
        chest: [{ name: 'Leather Vest', iconKey: 'chestArmor' }, { name: 'Tanned Jerkin', iconKey: 'chestArmor' }, { name: 'Mosshide Tunic', iconKey: 'chestArmor' }, { name: 'Sylvan Warbark', iconKey: 'chestArmor' }],
        legs:  [{ name: 'Leather Breeches', iconKey: 'legsArmor' }, { name: 'Ranger Leggings', iconKey: 'legsArmor' }, { name: 'Vinewrap Chaps', iconKey: 'legsArmor' }],
        boots: [{ name: 'Soft Moccasins', iconKey: 'boots' }, { name: 'Leather Boots', iconKey: 'boots' }, { name: 'Stalker Treads', iconKey: 'boots' }],
    },
    cloth: {
        helm:  [{ name: 'Linen Cowl', iconKey: 'helm' }, { name: 'Woven Circlet', iconKey: 'helm' }, { name: 'Mystic Diadem', iconKey: 'helm' }, { name: 'Crown of Radiance', iconKey: 'crown' }],
        chest: [{ name: 'Linen Robes', iconKey: 'chestArmor' }, { name: 'Silk Vestments', iconKey: 'chestArmor' }, { name: 'Enchanted Robes', iconKey: 'chestArmor' }, { name: 'Robes of the Beyond', iconKey: 'chestArmor' }],
        legs:  [{ name: 'Cloth Breeches', iconKey: 'legsArmor' }, { name: 'Silk Trousers', iconKey: 'legsArmor' }, { name: 'Ethereal Leggings', iconKey: 'legsArmor' }],
        boots: [{ name: 'Worn Sandals', iconKey: 'boots' }, { name: 'Cloth Slippers', iconKey: 'boots' }, { name: 'Arcane Treads', iconKey: 'boots' }],
    },
};

const RARITIES = [
    { name: 'Common',    color: '#aabbaa', statMult: 1.0,  prefix: '' },
    { name: 'Uncommon',  color: '#44cc44', statMult: 1.3,  prefix: 'Fine ' },
    { name: 'Rare',      color: '#4488ff', statMult: 1.7,  prefix: 'Superior ' },
    { name: 'Exotic',    color: '#ffaa00', statMult: 2.2,  prefix: 'Exotic ' },
    { name: 'Legendary', color: '#cc44ff', statMult: 3.0,  prefix: 'Legendary ' },
];

// ══════════════════════════════════════════════════════════════════════
// PARTY CHAT — The WoW Dungeon Finder Experience™
// ══════════════════════════════════════════════════════════════════════
// 
// Frustration escalation system:
// Stage 0 (0-3 msgs):   Normal dungeon smalltalk — "hi", "r?", build discussion
// Stage 1 (4-7 msgs):   Noticing the silence — "you good?", "hello?"
// Stage 2 (8-12 msgs):  Passive aggression — "cool cool, I'll just talk to myself"
// Stage 3 (13-18 msgs): Active annoyance — "are you a bot?", "report AFK"
// Stage 4 (19+ msgs):   Existential meltdown — full tilt, philosophical despair
//
// Members also react to each other, creating organic multi-person conversations.
// The player NEVER responds (because they can't), which is the whole joke.

// ── Context-aware message generators per frustration stage ──────────

/** Stage 0: Normal Pug Talk — the honeymoon phase */
const PARTY_CHAT_STAGE_0 = {
    // Generic opener messages any member might say
    openers: [
        (m) => 'hi',
        (m) => 'hey',
        (m) => 'o/',
        (m) => 'sup',
        (m) => 'r?',
        (m) => 'yo',
        (m) => 'heyy',
        (m) => 'hey all',
        (m) => 'glhf',
        (m) => 'lets gooo',
    ],
    // Combat/zone commentary
    combat: [
        (m) => 'nice dps',
        (m) => 'big pulls nice',
        (m) => 'these mobs hit kinda hard',
        (m) => 'ooh nice drop',
        (m) => pick(['ez','smooth run so far','not bad','clean']),
        (m) => `my ${pick(['gear','dps','build'])} is kinda ${pick(['scuffed','rough','carried','mid'])} ngl`,
        (m) => `first time running this zone on ${m.getDisplayClass().name}`,
        (m) => 'anyone know the boss mechanics or are we just winging it',
        (m) => pick(["let's just pull everything","big dick pulls let's go","speed run speed run"]),
        (m) => `${pick(['lol','lmao','haha'])} that mob just ${pick(['evaporated','got deleted','melted','got sent to the shadow realm'])}`,
        (m) => pick(['gotta love auto combat','idle games are peak gaming','this is so chill']),
    ],
    // Class-specific smalltalk
    classChat: [
        (m) => m.classId === 'cleric' ? pick(["I'll keep everyone topped off","heals ready","don't stand in stuff pls"]) : null,
        (m) => m.classId === 'warrior' ? pick(["I'll tank if needed","going in","let me grab aggro first"]) : null,
        (m) => m.classId === 'mage' ? pick(["food table up","anyone need mana?","time for big numbers"]) : null,
        (m) => m.classId === 'ranger' ? pick(["I'll kite if it goes bad","aspect of the dps","pew pew time"]) : null,
    ],
    // Build/gear discussion
    gearTalk: [
        (m) => `anyone else running ${pick(['crit','haste','mastery','armor pen','all damage'])} build?`,
        (m) => `I just got this ${pick(['weapon','chest piece','helm'])} and it's kinda ${pick(['insane','cracked','mid','disappointing','ugly but strong'])}`,
        (m) => 'what talents are you guys running',
        (m) => `is ${pick(['crit','haste','raw damage','defense'])} better for ${m.getDisplayClass().name}?`,
        (m) => 'I respecced 4 times today. I have a problem.',
    ],
};

/** Stage 1: The Awkward Phase — noticing nobody's responding */
const PARTY_CHAT_STAGE_1 = [
    (m, p) => `${p}?`,
    (m, p) => 'hello?',
    (m, p) => `${p} you there?`,
    (m, p) => '...',
    (m, p) => `is ${p} afk`,
    (m, p) => 'anyone else alive in here lol',
    (m, p) => 'this party is quiet',
    (m, p) => `earth to ${p}`,
    (m, p) => 'man this group is silent',
    (m, p) => 'ok then',
    (m, p) => `${p} do you have chat turned off or something`,
    (m, p) => 'am I talking to myself lol',
    (m, p) => 'silent treatment huh',
    (m, p) => 'at least the dps is good even if nobody talks',
    (m, p) => `does ${p} not have a keyboard`,
    (m, p) => 'usually people say hi back but ok',
    (m, p) => pick(["just me chatting then?","echo...","*crickets*","tough crowd"]),
    (m, p) => 'my last group was chatty, this is... different',
];

/** Stage 2: Passive Aggression — the snark comes out */
const PARTY_CHAT_STAGE_2 = [
    (m, p) => `cool cool cool, love talking to myself`,
    (m, p) => `beginning to think ${p} is actually a bot`,
    (m, p) => 'I have literally said 12 things and gotten zero responses. zero.',
    (m, p) => `${p}'s keyboard must only have combat buttons`,
    (m, p) => 'love the communication in this group. very collaborative.',
    (m, p) => `tell you what ${p}, just type one letter. any letter. prove you're human.`,
    (m, p) => 'this is like grouping with NPCs that do damage',
    (m, p) => pick([
        `is this what solo queue has come to`,
        `I miss my guild group`,
        'my dog responds to me more than this party',
        `I've had more engaging conversations with the mob AI`,
    ]),
    (m, p) => `I'm going to keep talking. you can't stop me.`,
    (m, p) => `ok new rule: ${p} has to say one word per boss kill. ONE WORD.`,
    (m, p) => 'I wonder if the ignore list works on party members',
    (m, p) => 'fine. I didn\'t want to chat anyway. *sniff*',
    (m, p) => `imagine being in a MASSIVELY MULTIPLAYER game and refusing to be multiplayer`,
    (m, p) => 'this group has the social energy of a loading screen',
    (m, p) => `I'm putting "${p} refuses to communicate" in my memoirs`,
    (m, p) => `you know what, the damage is good, I'll take silent and competent`,
    (m, p) => 'I just realized I don\'t even know what class you are because YOU WON\'T TALK',
    (m, p) => 'my therapist said I need to work on one-sided relationships. exhibit A.',
];

/** Stage 3: The Tilt Phase — losing it */
const PARTY_CHAT_STAGE_3 = [
    (m, p) => `okay ${p} I am GENUINELY asking. blink once if you're alive.`,
    (m, p) => `at this point I'm convinced ${p} is a very advanced auto-clicker`,
    (m, p) => `report ${p} for... for... I don't even know. emotional neglect?`,
    (m, p) => 'IF ANYONE IN THIS PARTY SAYS LITERALLY ANYTHING I will give them my next epic drop',
    (m, p) => `I have now sent more messages in this party than I sent to my ex. ${p}, you're welcome.`,
    (m, p) => `you know there's a chat box right? bottom of the screen? you type words in it? words come out?`,
    (m, p) => `HELLO???? IS ANYONE HOME????`,
    (m, p) => 'I am one more silent pull away from typing my life story in party chat',
    (m, p) => `${p} has said exactly zero words in ${pick(['ten minutes','forever','an eternity','literally my entire lifetime'])}`,
    (m, p) => `${p} treating party chat like it has a subscription fee`,
    (m, p) => 'fine you know what. FINE.',
    (m, p) => 'I once got more conversation out of a dungeon boss mid-fight',
    (m, p) => `do I need to pay ${p} to type? is there a microtransaction for that`,
    (m, p) => `vote kick for emotional damage????`,
    (m, p) => 'this is the loneliest party I have ever been in and I once solo queued on christmas eve',
    (m, p) => `I'm starting to think ${p} is on the phone with their mom or something`,
    (m, p) => `${p} out here playing a single player game with party buffs`,
    (m, p) => `just pretend I'm an NPC at this point. "press F to interact with ${m.name}." oh wait you won't.`,
];

/** Stage 4: Existential Meltdown — they've snapped */
const PARTY_CHAT_STAGE_4 = [
    (m, p) => `I have been talking to ${p} for an unreasonable amount of time and I genuinely don't know if they can read`,
    (m, p) => 'you know what the worst part is? the DPS is actually good. I can\'t even leave.',
    (m, p) => `*deep breath* it's fine. not everyone needs to talk. some people express themselves through... combat damage. sure.`,
    (m, p) => `I'm going to start narrating everything I do like a nature documentary since no one else will talk`,
    (m, p) => `breaking news: local adventurer ${p} completes entire dungeon without learning what the Enter key does`,
    (m, p) => `you know in the old days people used to TALK in parties. we had CONVERSATION. we had COMMUNITY.`,
    (m, p) => `at this point I'd accept a typo. give me a "dsfj" or an accidental "ffffffffff". anything.`,
    (m, p) => 'I wonder if this is what it felt like to be the one person talking in a group project',
    (m, p) => `${p} if you're doing the strong silent type thing, it's working. I'm both impressed and infuriated.`,
    (m, p) => `look I've made peace with this. this is a silent party. we communicate through damage meters.`,
    (m, p) => `my messages are just going into the void. THE VOID. ${m.classId === 'mage' ? 'and I\'m a Voidweaver, I KNOW the void' : 'at least the void whispers back sometimes'}`,
    (m, p) => `imagine queuing into a party, seeing people say hi, and just... not responding. the POWER move.`,
    (m, p) => `honestly? respect. you've maintained total silence while I've had a complete emotional arc.`,
    (m, p) => `I have written a novel in this party chat. ${p} has contributed zero chapters.`,
    (m, p) => 'the mobs have heard me talk more than my own party has and THEY want to kill me',
    (m, p) => `you either die chatty or live long enough to see yourself become ${p}`,
    (m, p) => `okay I'm just gonna accept this is therapy now. party chat therapy. my party members are my therapist. they are silent. it costs me nothing.`,
    (m, p) => `is there an achievement for "Most Words Spoken In A Party Where Nobody Responded"? because I want it.`,
    (m, p) => 'plot twist: I was the NPC all along',
    (m, p) => `you know what ${p}? GG. genuinely. best silent carry I've ever had.`,
];

/** Cross-member reactions — party members talking to each other ABOUT the silence */
const CROSS_MEMBER_CHAT = {
    // One member reacting to another member's complaint about the player
    commiserate: [
        (m, other) => `lol ${other.name} I feel you`,
        (m, other) => `fr fr, ${gameState.playerName} is a ghost`,
        (m, other) => 'at least we have each other',
        (m, other) => `I was thinking the same thing lol`,
        (m, other) => `${other.name} you're doing god's work trying to get a response`,
        (m, other) => 'honestly same',
        (m, other) => 'quiet groups are either really good or really cursed',
        (m, other) => `maybe they're just shy?? ...after ${pick(['5','10','15','twenty'])} messages? ok maybe not.`,
        (m, other) => `give up ${other.name}, I already have`,
        (m, other) => 'the dps is carrying my emotional damage at this point',
        (m, other) => `${other.name} at least you're talking. I was about to start talking to the mobs.`,
    ],
    // Side conversation (ignoring the player entirely)
    sideChat: [
        (m, other) => `${other.name} what build are you running btw`,
        (m, other) => `nice ${other.getDisplayClass().name} btw ${other.name}`,
        (m, other) => `${other.name} where did you get that ${pick(['weapon','gear','helm'])}?`,
        (m, other) => `at least YOU talk ${other.name}. wanna add me after?`,
        (m, other) => `${other.name} and I are basically the whole party's personality`,
        (m, other) => `yo ${other.name} you should join my guild, we actually COMMUNICATE`,
        (m, other) => `okay new plan: ${other.name} and I are friends now. everyone else is furniture.`,
        (m, other) => `${other.name} you ever get runs this quiet? is this normal?`,
    ],
    // Defending the player (rare, for variety)
    defend: [
        (m, other) => `let em be ${other.name}, maybe they're having a rough day`,
        (m, other) => 'some people just don\'t type, it\'s fine',
        (m, other) => `tbh I'm quiet in parties too sometimes... not THIS quiet but still`,
        (m, other) => `they're carrying in dps though, I'll allow it`,
    ],
};

/** 
 * Class-specific frustrated lines — each class complains differently 
 * These fire randomly at any stage 2+ to add personality.
 */
const CLASS_FRUSTRATION = {
    warrior: [
        (p) => `I didn't spec into "Communication" on my talent tree but at least I TRY, ${p}`,
        (p) => 'as a tank main I\'m used to being ignored but this is PERSONAL',
        (p) => `I could shield bash ${p} into responding. is that an option. devs??`,
        (p) => 'you know warriors are supposed to be the strong silent type. that\'s MY thing.',
    ],
    mage: [
        (p) => `I have 47 different spells and none of them can make ${p} talk`,
        (p) => 'I\'m going to polymorph the next person who doesn\'t respond. oh wait.',
        (p) => `conjuring a conversation out of thin air like everything else I do`,
        (p) => 'the void speaks to me more than this party does and the void is LITERALLY NOTHING',
    ],
    ranger: [
        (p) => `I could track ${p}'s keystrokes from a mile away and the answer is: there are none`,
        (p) => 'even my pet responds when I talk to it',
        (p) => `I have eagle-eye precision and I still can't spot a single response from ${p}`,
        (p) => `nature is quiet. this party is quieter.`,
    ],
    cleric: [
        (p) => `I can heal wounds but I cannot heal ${p}'s refusal to communicate`,
        (p) => 'the Light provides many things. apparently conversation is not one of them.',
        (p) => `I'm out here keeping everyone alive and nobody can even type "ty"`,
        (p) => `dawn breaks but ${p}'s silence is ETERNAL`,
        (p) => 'praying for a response... still praying...',
    ],
};

/** One-off event reactions — triggered by game events, not timers */
const EVENT_REACTIONS = {
    memberJoined: [
        (m, newMember) => `oh nice, another person! ${newMember.name} please talk. PLEASE.`,
        (m, newMember) => `${newMember.name}!! say something, literally anything, I'm STARVING for conversation`,
        (m, newMember) => `welcome ${newMember.name}. fair warning: nobody talks in here except me.`,
        (m, newMember) => `${newMember.name} hi!! finally someone new. do you type? please say you type.`,
    ],
    memberLeft: [
        (m, leftMember) => `even ${leftMember.name} left. it's just us now. in the silence.`,
        (m, leftMember) => `${leftMember.name} escaped. wish that were me.`,
        (m, leftMember) => `and then there were fewer... the quiet grows stronger`,
    ],
    bossKill: [
        (m, p) => 'GG!! ...hello? gg? anything?',
        (m, p) => 'nice boss kill. one of you could say GG but I won\'t hold my breath.',
        (m, p) => `${p} popped OFF on that boss. still won't say a word though.`,
        (m, p) => 'boss is dead and the party chat is ALSO dead. fitting.',
    ],
    lootDrop: [
        (m, item) => `ooh I just got ${item.name}! ${pick(["nobody cares I know","","into the void this message goes","at least the LOOT talks to me"])}`,
        (m, item) => `${item.name} dropped!! ${pick(["gz me? anyone? no? ok.","*congratulates self*","I'll just be happy alone then"])}`,
    ],
};

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateName() {
    const first = pick(FIRST_NAMES);
    const suf = pick(SUFFIXES);
    return first + suf;
}

function pickRarityForLevel(level) {
    // Higher level = better chance at better gear
    const bonus = Math.min(level * 0.3, 12);
    const weights = [
        Math.max(10, 50 - bonus * 2),  // Common
        30 + bonus * 0.5,               // Uncommon
        14 + bonus * 0.8,               // Rare
        5 + bonus * 0.4,                // Exotic
        1 + bonus * 0.15,               // Legendary
    ];
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < RARITIES.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return RARITIES[i];
    }
    return RARITIES[0];
}

/** Generate a full gear set for a party member */
function generateGearSet(classId, level) {
    const armorType = ARMOR_TYPE_FOR_CLASS[classId];
    const gear = {};
    const levelScale = 1 + (level - 1) * 0.08;

    // Weapon
    const weapons = PARTY_WEAPONS[classId];
    const wIdx = Math.min(weapons.length - 1, Math.floor(level / 10));
    const wTpl = weapons[wIdx];
    const wRarity = pickRarityForLevel(level);
    gear.weapon = {
        name: wRarity.prefix + wTpl.name,
        iconKey: wTpl.iconKey,
        rarity: wRarity,
        dps: Math.max(1, Math.round((2 + wIdx * 3) * wRarity.statMult * levelScale)),
        slot: 'weapon',
    };

    // Armor pieces
    const armorSlots = ['helm', 'chest', 'legs', 'boots'];
    for (const slot of armorSlots) {
        const templates = PARTY_ARMOR[armorType][slot];
        const aIdx = Math.min(templates.length - 1, Math.floor(level / 12));
        const tpl = templates[aIdx];
        const rarity = pickRarityForLevel(level);
        const baseArmor = slot === 'chest' ? 4 : slot === 'legs' ? 3 : 2;
        gear[slot] = {
            name: rarity.prefix + tpl.name,
            iconKey: tpl.iconKey,
            rarity,
            armor: Math.max(1, Math.round((baseArmor + aIdx * 3) * rarity.statMult * levelScale)),
            slot,
            armorType,
        };
    }

    return gear;
}

/** Calculate total DPS contribution from a party member's gear + level */
function calcMemberDps(member) {
    const levelScale = 1 + (member.level - 1) * 0.05;
    const baseDps = member.gear.weapon ? member.gear.weapon.dps : 1;
    // Party members do ~60-80% of player DPS equivalent for their gear level
    return Math.floor(baseDps * levelScale * 0.7);
}

// ══════════════════════════════════════════════════════════════════════
// PARTY MEMBER CLASS
// ══════════════════════════════════════════════════════════════════════

let _nextMemberId = 1;

export class PartyMember {
    constructor(opts = {}) {
        this.id = opts.id || _nextMemberId++;
        this.name = opts.name || generateName();
        this.classId = opts.classId || pick(CLASS_IDS);
        this.level = opts.level || Math.max(1, gameState.level + Math.floor(Math.random() * 5) - 2);
        this.gear = opts.gear || generateGearSet(this.classId, this.level);
        this.joinedAt = opts.joinedAt || Date.now();

        // ── Chat / Frustration state ──
        this.chatTimer = 8 + Math.random() * 12;  // first message comes quick (the "hi" phase)
        this.lastMessage = '';
        this.messagesSent = opts.messagesSent || 0; // total messages this member has sent
        this.hasGreeted = opts.hasGreeted || false;  // has said their initial "hi"
        this._recentChatHashes = [];                 // avoid repeating exact messages
    }

    /** Recalculate gear for current player level (called on level up / zone change) */
    refreshGear() {
        // Level the member up to near the player's level
        this.level = Math.max(this.level, gameState.level + Math.floor(Math.random() * 3) - 1);
        this.gear = generateGearSet(this.classId, this.level);
    }

    getDps() {
        return calcMemberDps(this);
    }

    getDisplayClass() {
        return CLASS_DISPLAY[this.classId] || CLASS_DISPLAY.warrior;
    }

    getTotalArmor() {
        let total = 0;
        for (const slot of ['helm', 'chest', 'legs', 'boots']) {
            if (this.gear[slot]) total += this.gear[slot].armor || 0;
        }
        return total;
    }

    /** Get this member's frustration stage (0-4) based on messages sent without response */
    getFrustrationStage() {
        if (this.messagesSent <= 3) return 0;
        if (this.messagesSent <= 7) return 1;
        if (this.messagesSent <= 12) return 2;
        if (this.messagesSent <= 18) return 3;
        return 4;
    }

    /** Serialize for save */
    serialize() {
        const gearSer = {};
        for (const [slot, item] of Object.entries(this.gear)) {
            if (!item) continue;
            const { rarity, ...rest } = item;
            gearSer[slot] = { ...rest, rarityName: rarity.name };
        }
        return {
            id: this.id,
            name: this.name,
            classId: this.classId,
            level: this.level,
            gear: gearSer,
            joinedAt: this.joinedAt,
            messagesSent: this.messagesSent,
            hasGreeted: this.hasGreeted,
        };
    }

    /** Deserialize from save */
    static deserialize(data) {
        const gear = {};
        if (data.gear) {
            for (const [slot, item] of Object.entries(data.gear)) {
                const { rarityName, ...rest } = item;
                gear[slot] = {
                    ...rest,
                    rarity: RARITIES.find(r => r.name === rarityName) || RARITIES[0],
                };
            }
        }
        return new PartyMember({
            id: data.id,
            name: data.name,
            classId: data.classId,
            level: data.level,
            gear,
            joinedAt: data.joinedAt,
            messagesSent: data.messagesSent || 0,
            hasGreeted: data.hasGreeted || false,
        });
    }
}

// ══════════════════════════════════════════════════════════════════════
// PARTY SYSTEM MANAGER (Singleton)
// ══════════════════════════════════════════════════════════════════════

class PartySystemManager {
    constructor() {
        this.members = [];       // PartyMember[]
        this.pendingInvite = null; // { member: PartyMember, expiresAt: number } or null
        this.inviteTimer = 0;     // seconds until next invite attempt
        this.inviteCooldown = 60 + Math.random() * 60; // first invite after 60-120s in eligible zone
        this._usedNames = new Set();
        this._declinedRecently = 0; // consecutive declines — backs off invite frequency

        // ── Chat system state ──
        // Each member has their OWN chat timer. Global timer is for cross-member chatter.
        this._crossChatTimer = 0;   // timer for member-to-member reactions
        this._crossChatCooldown = 0; // prevents cross-chat spam
        this._lastSpeaker = null;    // track who spoke last for cross-chat reactions
        this._recentPartyMsgs = [];  // dedup ring buffer

        // Version counter for UI reactivity
        this.version = 0;

        // ── 3D world hooks (wired by main.js) ──
        // Called when a new invite is generated so the 3D scene can spawn a prospect NPC
        this._onInviteCreated = null;   // (member: PartyMember) => void
        // Called when invite is resolved (accept/decline/expire) so 3D scene can clean up
        this._onInviteResolved = null;  // (outcome: 'accepted'|'declined'|'expired', member: PartyMember) => void
    }

    // ── Zone & Capacity ─────────────────────────────────────────────

    /** Is the party feature unlocked? (requires Shattered Expanse access) */
    isUnlocked() {
        return gameState.canAccessZone('shattered_expanse');
    }

    /** Max party members (NOT including the player) for the highest unlocked zone */
    getMaxPartySize() {
        if (!this.isUnlocked()) return 0;
        let max = 0;
        for (const [zoneId, cap] of Object.entries(ZONE_PARTY_CAP)) {
            if (gameState.canAccessZone(zoneId)) {
                // cap includes the player, so member slots = cap - 1
                max = Math.max(max, cap - 1);
            }
        }
        return max;
    }

    /** Current member count */
    getMemberCount() {
        return this.members.length;
    }

    /** Can we add another member? */
    canAddMember() {
        return this.members.length < this.getMaxPartySize();
    }

    /** Get total party DPS bonus (sum of all members) */
    getTotalPartyDps() {
        let total = 0;
        for (const m of this.members) {
            total += m.getDps();
        }
        return total;
    }

    // ── Party Chat Engine ───────────────────────────────────────────

    /** Generate a frustration-appropriate message for a specific member */
    _generateMemberMessage(member) {
        const stage = member.getFrustrationStage();
        const pName = gameState.playerName;
        let msg = null;
        let attempts = 0;

        while (!msg && attempts < 8) {
            attempts++;

            // Stage 0: Normal pug talk with sub-categories
            if (stage === 0) {
                if (!member.hasGreeted) {
                    // First message is always a greeting
                    msg = pick(PARTY_CHAT_STAGE_0.openers)(member);
                    member.hasGreeted = true;
                } else {
                    // Rotate through sub-categories
                    const subCat = pick(['combat', 'combat', 'classChat', 'gearTalk']);
                    const pool = PARTY_CHAT_STAGE_0[subCat];
                    const candidate = pick(pool)(member);
                    // classChat returns null if wrong class — reroll
                    if (candidate) msg = candidate;
                }
            }
            // Stage 1: Noticing the silence
            else if (stage === 1) {
                msg = pick(PARTY_CHAT_STAGE_1)(member, pName);
            }
            // Stage 2: Passive aggression
            else if (stage === 2) {
                // 25% chance of class-specific frustration line
                if (Math.random() < 0.25 && CLASS_FRUSTRATION[member.classId]) {
                    msg = pick(CLASS_FRUSTRATION[member.classId])(pName);
                } else {
                    msg = pick(PARTY_CHAT_STAGE_2)(member, pName);
                }
            }
            // Stage 3: Full tilt
            else if (stage === 3) {
                if (Math.random() < 0.2 && CLASS_FRUSTRATION[member.classId]) {
                    msg = pick(CLASS_FRUSTRATION[member.classId])(pName);
                } else {
                    msg = pick(PARTY_CHAT_STAGE_3)(member, pName);
                }
            }
            // Stage 4: Existential meltdown — mix stage 3 & 4 so it doesn't exhaust
            else {
                if (Math.random() < 0.65) {
                    msg = pick(PARTY_CHAT_STAGE_4)(member, pName);
                } else if (Math.random() < 0.5) {
                    msg = pick(PARTY_CHAT_STAGE_3)(member, pName);
                } else if (CLASS_FRUSTRATION[member.classId]) {
                    msg = pick(CLASS_FRUSTRATION[member.classId])(pName);
                }
            }
        }

        // Final dedup check
        if (msg && this._recentPartyMsgs.includes(msg)) {
            msg = null; // skip this tick, they'll talk next time
        }

        return msg;
    }

    /** Try to fire a cross-member reaction (one member responding to another) */
    _tryCrossMemberChat(speaker) {
        if (this.members.length < 2) return;
        if (this._crossChatCooldown > 0) return;

        const stage = speaker.getFrustrationStage();
        // Cross-chat becomes more likely at higher frustration
        const crossChance = stage <= 1 ? 0.08 : stage === 2 ? 0.25 : 0.35;
        if (Math.random() > crossChance) return;

        // Pick a different member to react
        const others = this.members.filter(m => m.id !== speaker.id);
        if (others.length === 0) return;
        const reactor = pick(others);

        let msg = null;
        if (stage >= 2) {
            // At higher stages, members commiserate about the player's silence
            const roll = Math.random();
            if (roll < 0.45) {
                msg = pick(CROSS_MEMBER_CHAT.commiserate)(reactor, speaker);
            } else if (roll < 0.85) {
                msg = pick(CROSS_MEMBER_CHAT.sideChat)(reactor, speaker);
            } else {
                // Rare: one member defends the player
                msg = pick(CROSS_MEMBER_CHAT.defend)(reactor, speaker);
            }
        } else {
            // Early stages: just casual side-chat
            if (Math.random() < 0.7) {
                msg = pick(CROSS_MEMBER_CHAT.sideChat)(reactor, speaker);
            }
        }

        if (msg && !this._recentPartyMsgs.includes(msg)) {
            // Delay the cross-chat slightly so it feels like a real response
            setTimeout(() => {
                gameState.addChatMessage('Party', reactor.name, msg);
                reactor.messagesSent++;
                reactor.lastMessage = msg;
                this._addToRecent(msg);
            }, 2000 + Math.random() * 4000);

            this._crossChatCooldown = 30 + Math.random() * 20; // don't spam cross-chat
        }
    }

    /** Fire event-based party chat (boss kill, loot, member join/leave) */
    fireEventChat(eventType, context) {
        if (this.members.length === 0) return;
        const pool = EVENT_REACTIONS[eventType];
        if (!pool) return;

        // Only the most frustrated member reacts to events (or a random one at low stages)
        let speaker;
        if (eventType === 'memberJoined' || eventType === 'memberLeft') {
            // Existing members react
            const existing = this.members.filter(m => m.id !== (context && context.id));
            if (existing.length === 0) return;
            speaker = existing.reduce((a, b) => a.messagesSent > b.messagesSent ? a : b);
        } else {
            speaker = this.members.reduce((a, b) => a.messagesSent > b.messagesSent ? a : b);
        }

        // Only fire if member has sent enough msgs to be aware of the silence (stage 1+)
        if (speaker.getFrustrationStage() < 1 && eventType !== 'memberJoined') return;

        const msg = pick(pool)(speaker, context || gameState.playerName);
        if (msg) {
            setTimeout(() => {
                gameState.addChatMessage('Party', speaker.name, msg);
                speaker.messagesSent++;
                this._addToRecent(msg);
            }, 1000 + Math.random() * 3000);
        }
    }

    _addToRecent(msg) {
        this._recentPartyMsgs.push(msg);
        if (this._recentPartyMsgs.length > 25) this._recentPartyMsgs.shift();
    }

    // ── Invite System ───────────────────────────────────────────────

    /** Called every logic tick — manages invite popups + per-member chat */
    update(dt) {
        if (!this.isUnlocked()) return;

        // ── Per-member chat timers ──
        // Each member independently decides when to speak based on their frustration
        for (const member of this.members) {
            member.chatTimer -= dt;
            if (member.chatTimer <= 0) {
                const stage = member.getFrustrationStage();
                // Chat frequency increases with frustration:
                // Stage 0: every 18-30s (normal pug pace)
                // Stage 1: every 15-25s (getting antsy)
                // Stage 2: every 12-22s (can't stop talking)
                // Stage 3: every 10-18s (tilted, rapid fire)
                // Stage 4: every 14-28s (slowed down, long existential rants)
                const intervals = [
                    [18, 30],  // stage 0
                    [15, 25],  // stage 1
                    [12, 22],  // stage 2
                    [10, 18],  // stage 3
                    [14, 28],  // stage 4 (slightly slower — they're monologuing)
                ];
                const [lo, hi] = intervals[stage] || [18, 30];
                member.chatTimer = lo + Math.random() * (hi - lo);

                const msg = this._generateMemberMessage(member);
                if (msg) {
                    member.messagesSent++;
                    member.lastMessage = msg;
                    this._addToRecent(msg);
                    gameState.addChatMessage('Party', member.name, msg);
                    this._lastSpeaker = member;

                    // After a member speaks, other members might react
                    this._tryCrossMemberChat(member);
                }
            }
        }

        // Cross-chat cooldown
        if (this._crossChatCooldown > 0) {
            this._crossChatCooldown -= dt;
        }

        // If there's a pending invite, check expiry
        if (this.pendingInvite) {
            if (Date.now() > this.pendingInvite.expiresAt) {
                // Expired — treat as decline
                const member = this.pendingInvite.member;
                this.pendingInvite = null;
                this._declinedRecently = Math.min(this._declinedRecently + 1, 5);
                this.version++;
                // Notify 3D world — prospect NPC should walk away
                if (this._onInviteResolved) this._onInviteResolved('expired', member);
            }
            return; // Don't generate new invites while one is pending
        }

        // Don't send invites if party is full
        if (!this.canAddMember()) return;

        // Countdown to next invite
        this.inviteTimer -= dt;
        if (this.inviteTimer <= 0) {
            this._generateInvite();
            // Backoff: more declines = longer wait
            const backoffMult = 1 + this._declinedRecently * 0.5;
            this.inviteTimer = (40 + Math.random() * 50) * backoffMult;
        }
    }

    _generateInvite() {
        // Generate a random party member who wants to join
        // Try to pick a class the player doesn't already have in party
        const existingClasses = new Set(this.members.map(m => m.classId));
        existingClasses.add(gameState.classId); // player's class
        let candidateClass = pick(CLASS_IDS);

        // 70% chance to pick a missing class for variety
        const missingClasses = CLASS_IDS.filter(c => !existingClasses.has(c));
        if (missingClasses.length > 0 && Math.random() < 0.7) {
            candidateClass = pick(missingClasses);
        }

        // Generate unique name
        let name;
        let attempts = 0;
        do {
            name = generateName();
            attempts++;
        } while (this._usedNames.has(name) && attempts < 20);
        this._usedNames.add(name);

        const member = new PartyMember({
            classId: candidateClass,
            name,
            level: Math.max(1, gameState.level + Math.floor(Math.random() * 3) - 1),
        });

        const now = Date.now();
        this.pendingInvite = {
            member,
            expiresAt: now + 23000, // 23 seconds total (3s approach + 20s popup window)
            showPopupAt: now + 3000, // 3 seconds for NPC to walk closer before popup appears
        };
        this.version++;

        // Notify 3D world to spawn the prospect NPC on the map
        if (this._onInviteCreated) this._onInviteCreated(member);
    }

    /** Accept the current pending invite */
    acceptInvite() {
        if (!this.pendingInvite || !this.canAddMember()) return false;
        const member = this.pendingInvite.member;
        this.members.push(member);
        this.pendingInvite = null;
        this._declinedRecently = Math.max(0, this._declinedRecently - 1);
        this.version++;

        // Notify 3D world — prospect NPC converts into party member
        if (this._onInviteResolved) this._onInviteResolved('accepted', member);

        gameState.addGameLog(`${member.name} joined your party!`);
        // New member says hi — this is their stage 0 greeting
        gameState.addChatMessage('Party', member.name, pick([
            'hi','hey','o/','sup','yo','hey all',
            'inv ty!','thanks for inv','lets go','r?','heyy',
        ]));
        member.hasGreeted = true;
        member.messagesSent = 1;

        // Existing frustrated members react to the new arrival
        this.fireEventChat('memberJoined', member);

        return true;
    }

    /** Decline the current pending invite */
    declineInvite() {
        if (!this.pendingInvite) return;
        const member = this.pendingInvite.member;
        const name = member.name;
        this.pendingInvite = null;
        this._declinedRecently = Math.min(this._declinedRecently + 1, 5);
        this.version++;

        // Notify 3D world — prospect NPC should walk away
        if (this._onInviteResolved) this._onInviteResolved('declined', member);

        gameState.addChatMessage('Say', name, pick([
            'No worries, good luck out there!',
            'All good, maybe next time.',
            'Understandable, happy hunting!',
            'No problem! See you around.',
        ]));
    }

    /** Kick/remove a party member by id */
    removeMember(memberId) {
        const idx = this.members.findIndex(m => m.id === memberId);
        if (idx < 0) return false;
        const member = this.members[idx];
        const stage = member.getFrustrationStage();
        this.members.splice(idx, 1);
        this.version++;

        gameState.addGameLog(`${member.name} has left your party.`);

        // Leave message depends on how frustrated they were
        if (stage <= 1) {
            gameState.addChatMessage('Party', member.name, pick([
                'gg cya','later','peace','gotta go, gl','thx for run','bye',
            ]));
        } else if (stage <= 3) {
            gameState.addChatMessage('Party', member.name, pick([
                'finally free from the silence','gg I guess. would have been nice to hear it back.',
                `bye ${gameState.playerName}. or don't say bye. like everything else.`,
                'leaving. at least my next group might have keyboards.',
                'peace. it\'s been... quiet.',
            ]));
        } else {
            gameState.addChatMessage('Party', member.name, pick([
                `${gameState.playerName} I will remember you. not fondly. but I will remember you.`,
                'I\'m leaving. I talked enough for both of us. for ALL of us. goodbye.',
                'if you ever learn to type, look me up. actually don\'t.',
                `leaving this group changed me as a person. ${gameState.playerName}, this was an experience.`,
                'goodbye everyone. and by everyone I mean myself, since I was the only one talking.',
            ]));
        }

        // Remaining members react
        this.fireEventChat('memberLeft', member);

        return true;
    }

    /** Refresh all member gear/levels (e.g., on zone change or level up) */
    refreshAllMembers() {
        for (const m of this.members) {
            m.refreshGear();
        }
        this.version++;
    }

    // ── Loot Generation for Party Members ───────────────────────────

    /** Called when a mob dies — roll loot for each party member independently */
    rollPartyLoot(mobType, mobLevel) {
        const results = []; // { member, item }
        for (const member of this.members) {
            // 12% chance each member gets a gear upgrade (they auto-equip)
            if (Math.random() < 0.12) {
                const slot = pick(['weapon', 'helm', 'chest', 'legs', 'boots']);
                const rarity = pickRarityForLevel(member.level);
                const armorType = ARMOR_TYPE_FOR_CLASS[member.classId];
                let item;

                if (slot === 'weapon') {
                    const weapons = PARTY_WEAPONS[member.classId];
                    const wIdx = Math.min(weapons.length - 1, Math.floor(member.level / 10));
                    const tpl = weapons[wIdx];
                    const levelScale = 1 + (member.level - 1) * 0.08;
                    item = {
                        name: rarity.prefix + tpl.name,
                        iconKey: tpl.iconKey,
                        rarity,
                        dps: Math.max(1, Math.round((2 + wIdx * 3) * rarity.statMult * levelScale)),
                        slot: 'weapon',
                    };
                } else {
                    const templates = PARTY_ARMOR[armorType][slot];
                    const aIdx = Math.min(templates.length - 1, Math.floor(member.level / 12));
                    const tpl = templates[aIdx];
                    const levelScale = 1 + (member.level - 1) * 0.08;
                    const baseArmor = slot === 'chest' ? 4 : slot === 'legs' ? 3 : 2;
                    item = {
                        name: rarity.prefix + tpl.name,
                        iconKey: tpl.iconKey,
                        rarity,
                        armor: Math.max(1, Math.round((baseArmor + aIdx * 3) * rarity.statMult * levelScale)),
                        slot,
                        armorType,
                    };
                }

                // Auto-equip if upgrade
                const current = member.gear[slot];
                const currentStat = current ? (current.dps || current.armor || 0) : 0;
                const newStat = item.dps || item.armor || 0;
                if (newStat > currentStat) {
                    member.gear[slot] = item;
                    results.push({ member, item, equipped: true });
                    this.version++;

                    // Member reacts to their own loot drop
                    if (member.getFrustrationStage() >= 1) {
                        this.fireEventChat('lootDrop', item);
                    }
                }
            }
        }
        return results;
    }

    // ── Serialization ───────────────────────────────────────────────

    serialize() {
        return {
            members: this.members.map(m => m.serialize()),
            declinedRecently: this._declinedRecently,
            usedNames: Array.from(this._usedNames),
            nextMemberId: _nextMemberId,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.members = (data.members || []).map(d => PartyMember.deserialize(d));
        this._declinedRecently = data.declinedRecently || 0;
        this._usedNames = new Set(data.usedNames || []);
        if (data.nextMemberId) _nextMemberId = Math.max(_nextMemberId, data.nextMemberId);
        this.version++;
    }

    /** Full reset (new character) */
    reset() {
        this.members = [];
        this.pendingInvite = null;
        this.inviteTimer = 60 + Math.random() * 60;
        this._usedNames = new Set();
        this._declinedRecently = 0;
        this._crossChatCooldown = 0;
        this._lastSpeaker = null;
        this._recentPartyMsgs = [];
        _nextMemberId = 1;
        this.version++;
    }
}

export const partySystem = new PartySystemManager();
