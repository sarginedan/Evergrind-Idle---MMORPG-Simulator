// ══════════════════════════════════════════════════════════════════════
// BATTLEGROUND SYSTEM — Instanced PvP Content (WoW-style Battlegrounds)
// Unlocked when Neon Wastes zone becomes accessible.
// 10v10 Capture-the-Flag: two NPC teams fight in real-time simulation.
// First battleground: Voidstrike Basin — Alien Xenotech Arena
//
// WoW Battleground Research Applied:
//   • Warsong Gulch CTF — two team bases, flag capture win condition
//   • Role-based composition (tanks, healers, DPS, flag carriers)
//   • Kill feed, score tracking, VP reward system
//   • Team coordination AI: healers heal, tanks peel, DPS focus fire
//   • Respawn timers on death (30s waves like WoW graveyards)
//   • Best-of-3 flag captures to win
//   • Diminishing returns on healing (like dampening in arenas)
//   • Mid-fight chat from NPC "players" — trash talk, callouts, GGs
// ══════════════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { pvpVendor, VP_REWARDS } from './PvPVendor.js';
import { partySystem } from './PartySystem.js';
import { companionSystem } from './CompanionSystem.js';
import { audioManager } from './AudioManager.js';

// ── FACTION DATA ─────────────────────────────────────────────────────
const FACTIONS = {
    voidborne: {
        name: 'Voidborne',
        color: '#aa44ff',
        colorHex: 0xaa44ff,
        flagColor: 0xcc66ff,
        icon: '🟣',
        basePos: { x: -30, z: 0 },
    },
    ironcrest: {
        name: 'Ironcrest',
        color: '#ff6644',
        colorHex: 0xff6644,
        flagColor: 0xff8844,
        icon: '🔴',
        basePos: { x: 30, z: 0 },
    },
};

// ── CLASS DATA ───────────────────────────────────────────────────────
const PVP_CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric'];
const PVP_CLASS_DISPLAY = {
    warrior: { name: 'Aetherblade', color: '#4488cc', icon: '⚔️', role: 'Tank' },
    mage:    { name: 'Voidweaver',  color: '#aa66ff', icon: '🔮', role: 'DPS' },
    ranger:  { name: 'Thornwarden', color: '#66bb44', icon: '🏹', role: 'DPS' },
    cleric:  { name: 'Dawnkeeper',  color: '#ffcc44', icon: '✨', role: 'Healer' },
};

// ══════════════════════════════════════════════════════════════════════
// WOW-STYLE CLASS MOVEMENT & COMBAT PROFILES
// Research: WoW WSG class behavior patterns
//
// Warriors  — Plate-armored melee. Charge in straight lines. Sprint bursts.
//             Circle-strafe in melee. Hamstring (slow) targets. Intercept FCs.
//             Slowest base speed but periodic charges cover ground fast.
//
// Mages     — Ranged caster. Maintain 7-9yd distance. Blink repositioning.
//             Lateral strafing while casting. Frost Nova (root) and kite.
//             Never push deep alone; hold mid-field ridge positions.
//
// Rangers   — Ranged physical. Maintain 6-8yd distance. Disengage to create
//             gap. Flank patrol routes. Concussive Shot (slow). Backpedal
//             when melee approaches. Fastest base movement (aspect of cheetah).
//
// Clerics   — Healer. Stay 8-10yd behind frontline. Pillar-hug near LoS.
//             Serpentine movement to dodge CC. Sprint toward injured allies.
//             Never push alone. Run toward teammates when pressured.
// ══════════════════════════════════════════════════════════════════════
const CLASS_PROFILE = {
    warrior: {
        baseSpeed: 3.2,           // Slowest base (plate armor)
        combatRange: 1.8,         // Melee range — get right on top of target
        attackRange: 3.5,         // Swing range
        chargeCd: 8,              // Seconds between charges
        chargeSpeed: 9.0,         // Burst speed during charge
        chargeMaxDist: 14,        // Only charge if target within this
        chargeMinDist: 4,         // Don't charge if already close
        strafeRadius: 0.8,        // Circle-strafe radius in melee combat
        retreatHp: 0.18,          // Retreat below 18% HP
        kiteRange: 0,             // Melee doesn't kite
    },
    mage: {
        baseSpeed: 3.6,           // Medium (cloth is light)
        combatRange: 8.0,         // Stay at range — turret caster
        attackRange: 10.0,        // Cast range
        blinkCd: 12,              // Blink repositioning cooldown
        blinkDist: 8,             // Blink teleport distance
        strafeRadius: 2.5,        // Wide lateral strafe while casting
        retreatHp: 0.30,          // Retreat earlier (squishy)
        kiteRange: 5.0,           // Kite melee that gets too close
    },
    ranger: {
        baseSpeed: 4.2,           // Fastest (aspect of the cheetah)
        combatRange: 7.0,         // Ranged physical
        attackRange: 9.5,         // Bow range
        disengageCd: 10,          // Disengage (backwards leap) cooldown
        disengageDist: 6,         // Disengage distance
        strafeRadius: 2.0,        // Moderate flanking movement
        retreatHp: 0.25,          // Kite early
        kiteRange: 4.0,           // Backpedal if melee closes in
    },
    cleric: {
        baseSpeed: 3.4,           // Moderate
        combatRange: 9.0,         // Stay behind group — max range heals
        attackRange: 10.0,        // Heal range
        sprintCd: 15,             // Sprint-to-ally cooldown
        sprintSpeed: 7.0,         // Sprint burst speed
        sprintDuration: 2.0,      // How long sprint lasts
        strafeRadius: 1.5,        // Serpentine dodging
        retreatHp: 0.35,          // Flee very early (high value)
        kiteRange: 6.0,           // Run away from melee
    },
};

// ── NPC NAME POOLS ───────────────────────────────────────────────────
const PVP_NAMES = [
    'Kael', 'Lyra', 'Theron', 'Zara', 'Brynn', 'Dax', 'Elara', 'Finn',
    'Gwyn', 'Haze', 'Iris', 'Jett', 'Kira', 'Lux', 'Mira', 'Nyx',
    'Orion', 'Pax', 'Quinn', 'Riven', 'Sable', 'Talon', 'Uma', 'Vex',
    'Wren', 'Xara', 'Yuki', 'Zephyr', 'Ash', 'Blaze', 'Cass', 'Drake',
    'Echo', 'Frost', 'Gale', 'Haven', 'Ivy', 'Jade', 'Knox', 'Luna',
    'Kai', 'Nyla', 'Rex', 'Suki', 'Vale', 'Bex', 'Rune', 'Storm',
    'Flint', 'Sage', 'Riot', 'Onyx', 'Nova', 'Hex', 'Pyro', 'Glitch',
];
const PVP_SUFFIXES = ['', '_xX', '42', 'HD', '_GG', '99', 'TV', 'Pro', 'Jr', 'Arc', 'PvP', '', '', '', ''];

// ── FLAG CARRIER DEBUFF CONSTANTS (WoW "Focused Assault" inspired) ──
// Carrying the flag applies stacking debuffs that grow over time,
// preventing turtle strategies and infinite flag-hold stalling.
const FC_DEBUFF = {
    // Movement: carrier starts 15% slower, loses 2% more speed per stack
    baseMoveReduction: 0.15,
    moveReductionPerStack: 0.02,
    maxMoveReduction: 0.50,       // Can't be slowed more than 50%

    // Damage Taken: +10% per stack (WoW "Focused Assault")
    damageTakenPerStack: 0.10,
    maxDamageTakenBonus: 1.00,    // +100% max

    // Healing Received: -8% per stack
    healReductionPerStack: 0.08,
    maxHealReduction: 0.60,       // 60% max healing reduction

    // Stacking: one stack every 8 seconds while holding the flag
    stackInterval: 8,
    maxStacks: 10,

    // Visual: HP drain per second at max stacks (bleed tick)
    bleedDpsPerStack: 0.002,      // 0.2% maxHP per stack per second
};

// ── BASE CAPTURE ZONE ──
// Carrier must stand on their capture pad for a brief "channel" to score.
// Enemies entering the zone interrupt the capture.
const CAPTURE_ZONE = {
    radius: 5.0,                  // Larger than flag pickup (3), matches base platform
    channelTime: 2.5,            // 2.5s channel to capture (WoW-like brief pause)
    interruptRadius: 5.0,        // Enemy within this radius interrupts the channel
};

// ── DROPPED FLAG AUTO-RETURN ──
const FLAG_DROP_RETURN_TIME = 20; // 20s on the ground → auto-returns to base

// ── BG CHAT MESSAGES ─────────────────────────────────────────────────
// Deep WoW Battleground Chat Research Applied:
// • WSG/AB/AV chat meta — callouts, blame culture, armchair generals
// • Classic "bg hero" syndrome — 1 guy with all the strats nobody listens to
// • Keyboard warriors who type essays mid-fight then die
// • The "I'm carrying" complex, healer persecution complex, tank ego
// • Casual racism toward specific classes (always blame the rogue/hunter)
// • AFK accusations, honor farming accusations, premade accusations
// • People who queue BGs to do anything except the objective
// • Nostalgia-bait ("this game is dead" while actively playing)
// • The guy who links damage meters after every fight
// • Passive-aggressive "?" after deaths
// • People who rage-type then immediately die
const BG_CHAT = {
    start: [
        'lets gooo ⚔️', 'first time pvp wish me luck', 'PROTECT THE FLAG CARRIER',
        'focus their healer', 'group mid dont solo', 'this map is crazy',
        'everyone stack on flag room', 'dont let them cap', 'I\'ll guard base',
        'need a healer on offense', 'warrior take FC duty', 'CC their FC on sight',
        'if we lose this I\'m uninstalling', 'please be a good group please be a good group',
        'oh great another pug BG', 'alright who\'s premade', 'my last bg before work lets make it count',
        'just hit max level time to get farmed 😅', 'EVERYONE RUSH LEFT',
        'ok serious strat: 8 offense 2 defense go', 'anyone here actually have pvp gear?',
        'I swear if nobody guards flag room again', 'just do damage and don\'t die, ez',
        'wait is this rated or random', 'stay together for once in your lives',
        'inv me to the premade channel', 'can we try... communicating? just once?',
        'warrior guard base. warrior? ...hello?', 'hype hype hype lets get this W 🔥',
    ],
    combat: [
        'NICE KILL 💀', 'healer down!', 'their FC is low, nuke him',
        'flag dropped mid!', 'peel for our carrier!', 'im getting focused hard',
        'these guys are actually good', 'need heals over here 😰', 'got a 3 piece lol',
        'THEY HAVE OUR FLAG GO GO', 'tank where are you', 'kiting 3 of them solo btw',
        'omg that crit', 'returned their flag!', 'protect the flag room!!',
        'why is nobody guarding base', 'inc 3 to our base!', 'I see their whole team mid',
        'big teamfight at center', 'rezzing in 10s wait for me',
        'I just got one-shot from full health what is this game',
        'HEALS???? HELLO????', 'bro I\'m literally 1v5ing here',
        'can someone peel me im the healer', 'their healer is literally unkillable',
        'imagine dying to a ranger lmao', 'warrior just charged off the cliff btw',
        'nice, all 4 healers are healing each other', 'WHO JUST PULLED THE ENTIRE TEAM',
        'I\'m doing 40% of team damage btw just saying', 'my cooldowns are up let\'s go in',
        '?', 'lol', 'bro what was that', 'ok that was actually a sick play ngl',
        'they\'re all mid fighting over nothing just cap', 'how am I the only one on defense',
        'this healer diff is insane rn', 'report the afk in base',
        'nice CC chain 👏', 'whoever just saved me with that heal, marry me',
        'I haven\'t been healed once this entire match', 'literally nobody peels for the healer ever',
        'just got 3-shot what am I supposed to do', 'WHY IS NOBODY HELPING',
        'their warrior is in our backline and nobody cares apparently',
        'i typed all that and died during it worth it though',
        'ok new plan: everyone go mid and just cleave', 'dude how do they always find our FC',
        'imagine if we had coordination. just imagine.', 'that mage is playing out of their mind',
        'warrior just hamstrung me to death. not the game, my actual soul.',
        'I\'m gonna need therapy after this bg', 'bro stop chasing the ranger he\'s baiting you',
        'our FC is literally solo with 3 on him and nobody cares', 'DISPEL THE HEALER',
        'can we get a real comp next time', 'how does their team always group up and we dont',
    ],
    // ── Troll / Salt / Classic WoW BG Copypasta-style ──
    troll: [
        'you guys are the worst team I\'ve ever seen and I\'ve been playing since beta',
        'is this a bg or a group therapy session', 'did everyone just forget the objective exists',
        'flag room is a CONCEPT not a SUGGESTION', 'we have 10 players and 0 brain cells',
        'skill issue tbh', 'actually I can\'t even be mad that was impressive from them',
        'can we forfeit I need to go walk my fish', 'I queued for pvp not a pve escort mission',
        'the real voidstrike basin was the friends we lost along the way',
        'this is what happens when you play a free game', 'bold strategy cotton let\'s see how it plays out',
        'I didn\'t come to the bg to do objectives I came to crit people 🎯',
        'healers are just DPS that chose wrong', 'STOP FIGHTING MID TAKE THE FLAG',
        'great now they\'re teabagging. we deserve this.', 'my 5 year old could play this better. and has.',
        'imagine losing to a team with 3 rangers lmaooo', 'everyone\'s a shotcaller but nobody can aim',
        'why does every bg feel like i\'m the main character in a tragedy',
        'someone told me pvp would be fun. they lied.',
        'is our warrior lost? genuine question. does he know where the flag is.',
        'you know it\'s bad when even the enemy team is confused',
        'we\'re not losing, we\'re just winning... differently', 'i have never seen such disrespect in all my bgs',
        'does anyone want to explain the strat or are we just vibing',
        'i am malding. actual hair loss.', 'ah yes, the classic "everyone go mid and die" strat. bold.',
        'can the ranger stop trying to 1v5 challenge accepted I guess',
        'fun fact: the objective is the flags. I know, shocking.',
        'we lost this the moment I saw our comp', 'wp... to myself specifically. rest of you are suspects.',
        'I\'ve seen better coordination in a kindergarten relay race',
        'brb writing a formal complaint to the War Quartermaster',
    ],
    // ── Healer-specific lines (healer perspective) ──
    healerRage: [
        'STOP RUNNING AWAY FROM ME I\'M TRYING TO HEAL YOU',
        'oh cool 4 people behind pillars out of my range. love healing air.',
        'healer perspective: I see you. all 10 of you. none of you see me.',
        'the warrior line of sighted me while I was casting. in an open field.',
        'every time I cast a heal: three enemies on me. every time I dont: "HEALS???"',
        'I\'m healing through more damage than is mathematically possible',
        'fun healer fact: we can\'t heal you if we\'re dead 🙃',
        'I have 47 people on me and zero peels. this is fine.',
        'stop asking for heals, start asking "what can I do for my healer today"',
        'running behind a wall while my heal is at 90% cast. thank you so much.',
        'WE HAVE A PREMADE SYNERGY, USE IT! 🚑',
        'I\'m prioritizing the party, pugs are on their own if they overextend!',
    ],
    // ── Backseat / Armchair General lines ──
    shotcaller: [
        'OK LISTEN UP. 4 offense, 3 mid, 3 base. Simple. Do it. Please.',
        'everyone group up. GROUP. TOGETHER. IN A GROUP. DO YOU KNOW WHAT A GROUP IS.',
        'if you die alone it\'s your fault. STAY TOGETHER.',
        'the only acceptable reason to go mid is if you\'re literally on fire',
        'I am begging. BEGGING. someone to guard the flag room.',
        'strat: kill their healer first. that\'s it. that\'s the entire strat.',
        'rotate left NOW. left. YOUR OTHER LEFT.',
        'why am I the only person who reads the minimap',
        'I shouldn\'t have to explain this at this level bracket but here we are',
        'ok who voted this guy as raid leader. oh wait. nobody did. he just started typing.',
        'our premade is leading the charge, just follow them! ⚔️',
    ],
    flagCap: [
        'FLAG CAPTURED!! 🏆', 'EZ CAP', 'great teamwork on that one',
        'we needed that', 'LETS GO BOYS', 'one more cap for the W',
        'FINALLY someone carried the flag somewhere useful',
        'see what happens when we WORK TOGETHER? novel concept',
        'the flag carrier did everything btw the rest of us just watched',
        'LETS GOOOOO 🔥🔥🔥', 'ok that cap was clean. I take back everything I said.',
        'imagine if we did that every time', 'one more and I can stop stress-eating',
    ],
    enemyCap: [
        'they capped 😤', 'who was guarding??', 'we need to step it up',
        'focus defense this time', 'dont let them get another',
        'literally nobody was in the flag room. not one person.', 'HOW.',
        'i said guard base. I SAID IT. SCROLL UP.',
        'cool so we\'re just letting them walk in uncontested. great team.',
        'you know what, they earned that. we deserve this.',
        'their FC literally walked through our entire team how is that possible',
        'our base had 6 people and they STILL capped. incredible.',
        'whoever was on defense: what were you defending? your ego?',
    ],
    victory: [
        'GG WP 🏆', 'that was intense', 'ez clap', 'great game everyone',
        'VP farming complete', 'wp all, close game', 'requeue? 👀',
        'carried tbh 💪', 'never in doubt', 'despite my teammates, we prevailed',
        'ok that was actually fun gg', 'MY team btw 🏆', 'close game wp enemies',
        'I can finally unclench', 'easiest bg of my life (it was not easy)',
        'was worried for a sec ngl', 'gg, now do it 200 more times for the mount',
        'I aged 10 years during that match but we won so worth', 'the healer CARRIED. you\'re welcome.',
    ],
    defeat: [
        'gg they were better', 'tough loss', 'we\'ll get em next time',
        'that healer was insane', 'report our afk base guard lol', 'wp enemies',
        'I blame society', 'healer diff', 'team diff honestly', 'comp diff what can you do',
        'I did everything I could. literally. everything.', 'well SOMEONE had to bottom frag',
        'at least we got some VP I guess', 'gg go next', 'requeue and pray for better teammates',
        'if I had ONE more second on that last fight...', 'outplayed. it happens.',
        'we would\'ve won with even 1 more brain cell on our team. one.',
        'I\'m not mad I\'m just disappointed', 'ok I\'m actually mad too',
        'we almost had it. "almost" is doing a lot of work in that sentence.',
    ],
    flagDebuff: [
        'FC is getting stacks, hurry!!', 'flag carrier slowed hard',
        'carrier is gonna die to debuff', 'need to cap before stacks kill us',
        'focused assault too high, drop and re-pick?', 'carrier HP melting 💀',
        'FC is a walking corpse at this point', 'stacks are getting insane GOGOGO',
        'if the FC dies to the debuff I\'m closing the game',
    ],
    capInterrupt: [
        'CAP INTERRUPTED!! clear the base!', 'they stopped our cap!!',
        'enemy in our cap zone get them OUT', 'almost had it, go again',
        'need to kill everyone at base first', 'escort FC better next time',
        'we were SO CLOSE', 'clear. the. base. please.', 'KILL THEM FIRST THEN CAP',
    ],
    flagReturn: [
        'flag auto-returned, nobody grabbed it', 'flag reset to base',
        'too slow on the pickup, flag went home', 'seriously nobody picked up the flag??',
    ],
    // ── Passive-aggressive mid-match observations ──
    passive: [
        'interesting strategy guys. very avant-garde.',
        'oh we\'re doing our own thing? cool. cool cool cool.',
        'so this is what it feels like to queue solo',
        'if dying was the objective we\'d be rank 1',
        'I see the team has decided to each pursue our own personal journeys',
        'love the energy. hate the results.',
        'it\'s ok guys, objectives are just a social construct',
        'reminder: the flag is that glowy thing in the base. just in case.',
        'we\'re all just NPCs in this bg huh', 'I am once again asking for basic teamwork',
    ],

    // ══════════════════════════════════════════════════════════════════
    // PARTY MEMBER–SPECIFIC CHAT — Lines only spoken by your party
    // These reflect the bond between grouped players — inside jokes,
    // callouts specific to their role, loyalty, banter with their
    // leader (the player), and the camaraderie of a premade group
    // queuing into a pug BG together.
    // ══════════════════════════════════════════════════════════════════

    // ── General party banter (any party member) ──
    partyGeneral: [
        'got your back boss 👊', 'our comms are so much better than these pugs lol',
        'see that play? that\'s premade synergy baby', 'you guys are the only reason I queue bgs',
        'imagine pugging this without us 😂', 'party carries another bg, what else is new',
        'we\'re the only ones doing anything as usual', 'I gotchu, stay on me',
        'these pugs are... something', 'ok group up on me, ignore the randoms',
        'at least WE know the strat', 'this is why you always queue with friends',
        'ok party focus fire on my target', 'pug life is suffering, glad we\'re premade',
        'remember last bg when we 3-capped? let\'s do that again', 'trust the group, ignore the noise',
        'I\'ve been in worse pugs... actually no. no I haven\'t.',
        'premade diff 😤', 'yo stay tight, these randoms are going to feed',
        'party chat > bg chat and it\'s not even close', 'as long as we stick together we win this',
        'the coordination gap between us and the pugs is... significant',
        'I love that we don\'t need to explain the strat to each other',
        'we practiced this. the pugs are just bonus NPCs at this point.',
        'ok real talk our team is carried by the group and it\'s fine',
        'they have no idea we\'re in voice rn 😏', 'group focus left, let the pugs do... whatever they do',
    ],

    // ── Party warrior/tank lines ──
    partyWarrior: [
        'charging in, follow me! ⚔️', 'I\'ll frontline, heal me through this',
        'pulling aggro off you guys, go go', 'peeling their DPS off our healer rn',
        'hamstring on their FC, he\'s not going anywhere', 'shield wall up, push with me NOW',
        'I\'ll hold mid, you guys get the flag', 'they can\'t kill me fast enough, PUSH',
        'intercepting their carrier — backup please', 'main tanking this entire bg apparently',
        'their backline is scared of me btw', 'warrior FC duty engaged 🛡️',
        'who needs a healer when you have plate armor *dies immediately*', 'I just charged 3 people off the flag. you\'re welcome.',
        'don\'t worry I can take the hits, just... stay behind me maybe?',
    ],

    // ── Party mage lines ──
    partyMage: [
        'frost nova their whole team, GO NOW ❄️', 'blinking to high ground, follow up',
        'nuking their healer from range, cover me', 'I just one-shot their ranger lol',
        'crowd control on lockdown, push in', 'baiting their interrupt then bursting, watch this',
        'mage things: deleting people from downtown 🔮', 'rooted 3 of them, capitalize NOW',
        'if I blink away it means I\'m repositioning, not running... mostly',
        'their healer just ate my full burst and lived. I\'m offended.',
        'I have exactly one blink and 4 people on me. math doesn\'t check out.',
        'I\'m doing more damage than our entire pug side combined btw',
        'frost nova + shatter combo = chef\'s kiss 💋', 'sheep their FC and go',
    ],

    // ── Party ranger lines ──
    partyRanger: [
        'sniping their healer from across the map 🏹', 'concussive shot on FC, he\'s slowed',
        'flanking right side, creating a gap', 'I have eyes on their whole team from up here',
        'kiting 2 of them solo, they can\'t catch me 😎', 'disengaged off 3 melees, too easy',
        'backpedaling and shooting, the ranger special', 'trapping their warrior, push past him',
        'speed boost active, grabbing flag', 'their backline doesn\'t know I exist yet... surprise 🎯',
        'aspect of the cheetah btw, can\'t catch this', 'I just disengage-juked their entire team off the ledge',
        'I\'m doing callouts from sniper position: 3 inc left, 2 mid, rest base',
        'someone peel for me? no? cool I\'ll just kite forever I guess',
        'scouting ahead, their FC is solo — free kill', 'outranging their entire team from the ridge',
    ],

    // ── Party cleric/healer lines ──
    partyCleric: [
        'keeping you alive through this, don\'t worry ✨', 'big heals incoming, stay in range',
        'I\'m healing through their entire burst, we\'re fine', 'dispelling the CC off you, go go',
        'saving my cooldowns for the flag push', 'PEEL FOR ME IM THE HEALER — oh wait we actually do that in this group 🥲',
        'healing our FC through 4 attackers rn', 'mana getting low, need a breather',
        'I can keep us alive but I can\'t heal stupid — luckily our group isn\'t stupid',
        'party healer diff is REAL, their pugs wish they had me', 'topping everyone off, push when ready',
        'ok I\'m popping everything to keep you alive through this next fight',
        'these pugs keep running out of my healing range and then typing "HEALS???" I can\'t.',
        'healing priority: party > flag carrier > ... everyone else eventually I guess',
        'the randoms have no idea how much healing I\'m doing for them. they\'re welcome.',
        'if one more pug line-of-sights my heal I swear', 'I\'ve been spam healing you for 30 seconds, you\'re unkillable rn',
    ],

    // ── Party member reacting to kills/deaths ──
    partyKill: [
        'nice kill!! that\'s my group 💀', 'we just deleted them lmaooo',
        'party combo strikes again', 'that focus fire was CLEAN', 'ez kill, next target',
        'their team is malding rn guaranteed', 'premade synergy too strong 😤',
        'they didn\'t stand a chance against our burst', 'imagine getting focused by a premade lol',
        'that\'s what coordination looks like pugs, take notes',
        'LMAO that person absolutely got sent to the shadow realm',
        'did you see how fast they melted?? that\'s group focus for ya',
    ],
    partyDeath: [
        'ugh I\'m down, avenge me! 💀', 'they got me, focus the one who killed me',
        'dead... I\'ll be back in 15s save the flag', 'ok that was my fault I overextended',
        'I just got absolutely DELETED, what hit me??', 'down but not out, rezzing soon',
        'tell my story... actually just win the bg for me', 'brb dead 🪦',
        'that was embarrassing. we never speak of this.', 'I died to the same warrior AGAIN',
        'ok in my defense 4 of them jumped me at once', 'I blame the pugs for not peeling',
        'at least I died doing what I love: overextending',
    ],

    // ── Party member reacting to flag events ──
    partyFlagCap: [
        'WE CAPPED LETS GOOOO 🏆🔥', 'PARTY DELIVERS AGAIN', 'that cap was all us honestly',
        'premade flag run OP', 'our escort game is on point', 'one more!! finish this!!',
        'CLEAN cap, beautiful execution', 'that\'s how a real team does it',
        'did the pugs help? debatable. did we carry? absolutely.',
        'flag capped, group up for the next one — same strat, same result',
    ],
    partyFlagLoss: [
        'they capped on us... group up and refocus', 'ok that\'s on the pugs not us',
        'we need to tighten up defense', 'I blame the solo ranger who was "flanking"',
        'that\'s fine, we come back stronger', 'their carry just walked through our pug defenders lol',
        'regroup at base, we\'re not losing this', 'can we get ONE pug to actually guard? ONE?',
    ],

    // ── Party victory / defeat reactions ──
    partyVictory: [
        'GG PARTY CARRIES AGAIN 🏆', 'easiest bg of our lives', 'premade wins, shocker',
        'never in doubt when we queue together', 'group queue = free wins confirmed',
        'imagine what we could do in rated 👀', 'another W for the squad 💪',
        'our synergy is just built different', 'that was fun, requeue?',
        'wp team but mostly wp us 😂', 'I love this group. every single one of you. mostly.',
        'carried by vibes and coordination. gg.', 'party chat MVP: all of us.',
    ],
    partyDefeat: [
        'we lost?? with a premade?? how...', 'ok that one hurts ngl',
        'it wasn\'t us, it was the pugs. I\'m going with that.',
        'we did our best, rest of the team didn\'t show up', 'tough one. requeue and stomp next one.',
        'I blame matchmaking', 'that was a team gap beyond our control',
        'we tried. the pugs... did not.', 'loss with the squad hits different. it actually hurts.',
        'ok next bg we\'re going full tryhard mode', 'if we lost with premade comms imagine the pugs...',
        'it takes 10 to win and we only had ourselves. math was against us.',
    ],

    // ── Companion pet chat (from the companion combatant) ──
    companionCombat: [
        '*growls at enemy FC* 🐾', '*charges into the fray*', '*protective snarl* 🐾',
        '*snaps at healer\'s attacker*', '*howls triumphantly* 🐾', '*bristles with fury*',
        '*flanking enemy backline* 🐾', '*lunges at low-health target*',
        '*loyal eyes on party, keeps fighting*', '*snarls defiantly at 3 enemies*',
        '*dodges a killing blow* 🐾', '*pounces on flag carrier*',
    ],
    companionKill: [
        '*proud howl after the kill* 🐾🏆', '*wags tail menacingly*',
        '*sits on the corpse* 🐾', '*looks at you for approval*',
    ],
    companionDeath: [
        '*whimpers and falls* 🐾💔', '*loyal to the end* 🐾', '*will be back soon...*',
    ],
};

// ══════════════════════════════════════════════════════════════════════
// BATTLEGROUND DEFINITIONS
// ══════════════════════════════════════════════════════════════════════

export const BG_DEFS = [
    {
        id: 'voidstrike_basin',
        name: 'Voidstrike Basin',
        subtitle: 'Xenotech Capture Arena',
        icon: '⚔️',
        color: '#bb55ff',
        unlockZone: 'neon_wastes',
        levelRange: [35, 60],
        mode: 'ctf',          // Capture The Flag
        teamSize: 10,         // 10v10
        capsToWin: 3,         // First to 3 flag captures wins
        matchTimeLimit: 300,  // 5 min hard timer (shorter team wins if tie)
        respawnWave: 15,      // Respawn every 15s in waves
        description: 'Deep in the Neon Wastes, rival factions battle over a basin of raw void energy. Two fortified bases face each other across a shattered alien arena. Capture the enemy flag and return it to your base — first to 3 captures wins. 10v10 team combat with Victory Point rewards.',
        loadingImage: 'https://rosebud.ai/assets/loading-pvp-voidstrike.webp?OabF',
        textures: {
            ground: 'https://rosebud.ai/assets/bg-arena-ground.webp?4Ofu',
            rock: 'https://rosebud.ai/assets/bg-arena-rock.webp?hHof',
        },
        colors: {
            fogColor: 0x0a0520,
            ambientLight: 0x1a0a2a,
            directionalLight: 0xcc66ff,
            sceneBg: 0x050210,
            fogDensity: 0.008,
            particleColor: 0xcc55ff,
        },
        // Reward structure
        rewards: {
            win:  { gold: 800, xp: 4000, karma: 150 },
            loss: { gold: 300, xp: 1500, karma: 50  },
            // VP rewards use VP_REWARDS constants from PvPVendor
        },
        estimatedTime: '3-5 min',
    },
];

// ══════════════════════════════════════════════════════════════════════
// PVP COMBATANT — Individual NPC fighter in the BG
// ══════════════════════════════════════════════════════════════════════

class PvPCombatant {
    constructor(name, classId, faction, level, partyMemberRef = null) {
        this.id = `pvp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        this.name = name;
        this.classId = classId;
        this.faction = faction;  // 'voidborne' or 'ironcrest'
        this.level = level;
        this.partyMemberRef = partyMemberRef; // Persistent party member data
        this.display = PVP_CLASS_DISPLAY[classId];
        this.role = this.display.role;
        this.profile = CLASS_PROFILE[classId] || CLASS_PROFILE.warrior;
        this.isPartyMember = false; // Set to true for player's party members
        this.isCompanion = false;   // Set to true for player's companion pet

        // Stats scaled to level
        const t = (level - 1) / (CONFIG.MAX_LEVEL - 1);
        const baseMult = 0.7 + Math.random() * 0.6; // Skill variance

        if (this.role === 'Tank') {
            this.maxHp = Math.floor((800 + t * 20000) * baseMult);
            this.dps = Math.floor((30 + t * 1200) * baseMult * 0.6);
            this.healPower = 0;
            this.threatMult = 2.0;
        } else if (this.role === 'Healer') {
            this.maxHp = Math.floor((500 + t * 14000) * baseMult);
            this.dps = Math.floor((20 + t * 600) * baseMult * 0.4);
            this.healPower = Math.floor((40 + t * 2000) * baseMult);
            this.threatMult = 0.5;
        } else {
            // DPS
            this.maxHp = Math.floor((600 + t * 16000) * baseMult);
            this.dps = Math.floor((40 + t * 2000) * baseMult);
            this.healPower = 0;
            this.threatMult = 1.0;
        }

        this.hp = this.maxHp;
        this.alive = true;
        this.respawnTimer = 0;
        this.hasFlag = false;

        // Position on battlefield (x, z)
        const base = FACTIONS[faction].basePos;
        this.x = base.x + (Math.random() - 0.5) * 6;
        this.z = base.z + (Math.random() - 0.5) * 6;
        this.targetX = this.x;
        this.targetZ = this.z;

        // AI state
        this.aiRole = 'offense';  // offense | defense | flagCarry | support
        this.targetEnemy = null;
        this.attackCooldown = 0;

        // ── Class-based movement (WoW research) ──
        this.baseMoveSpeed = this.profile.baseSpeed + (Math.random() - 0.5) * 0.4;
        this.moveSpeed = this.baseMoveSpeed;
        this.currentSpeed = this.baseMoveSpeed; // Actual speed this tick (affected by charges/sprints)

        // ── Class ability cooldowns ──
        this.chargeCd = 0;         // Warrior: charge burst
        this.blinkCd = 0;          // Mage: blink reposition
        this.disengageCd = 0;      // Ranger: disengage backwards leap
        this.sprintCd = 0;         // Cleric: sprint to ally
        this.sprintTimer = 0;      // Remaining sprint duration
        this.rootedTimer = 0;      // Rooted in place (from Mage frost nova)
        this.slowedTimer = 0;      // Slowed (from Ranger concussive shot)
        this.slowAmount = 0;       // How much slow is applied (0-1)
        this.slowApplyCd = 0;      // Cooldown to re-apply slow (Ranger)
        this.rootApplyCd = 0;      // Cooldown to re-apply root (Mage)

        // ── Combat positioning state (WoW-style) ──
        this.strafeAngle = Math.random() * Math.PI * 2;  // Current strafe orbit angle
        this.strafeDir = Math.random() > 0.5 ? 1 : -1;   // CW or CCW
        this.inCombatWith = null;  // Current combat target ref for positioning
        this.isCharging = false;   // Warrior mid-charge flag
        this.isRetreating = false; // Fleeing to healer / base

        // ── Flag Carrier Debuff State ──
        this.fcDebuffStacks = 0;
        this.fcDebuffTimer = 0;
        this.fcDamageTakenMult = 1.0;
        this.fcHealReceivedMult = 1.0;

        // ── Base Capture Channel ──
        this.captureProgress = 0;
        this.isChanneling = false;

        // Stats tracking
        this.kills = 0;
        this.deaths = 0;
        this.damage = 0;
        this.healing = 0;
        this.flagCaps = 0;
        this.flagReturns = 0;
    }

    /** Clear flag carrier debuffs and capture state */
    clearFCState() {
        this.hasFlag = false;
        this.fcDebuffStacks = 0;
        this.fcDebuffTimer = 0;
        this.fcDamageTakenMult = 1.0;
        this.fcHealReceivedMult = 1.0;
        this.moveSpeed = this.baseMoveSpeed;
        this.captureProgress = 0;
        this.isChanneling = false;
    }

    /** Get effective move speed accounting for CC, sprints, charges */
    getEffectiveSpeed() {
        if (this.rootedTimer > 0) return 0;
        let speed = this.moveSpeed;
        if (this.isCharging && this.classId === 'warrior') speed = this.profile.chargeSpeed;
        if (this.sprintTimer > 0 && this.classId === 'cleric') speed = this.profile.sprintSpeed;
        if (this.slowedTimer > 0) speed *= (1 - this.slowAmount);
        return speed;
    }
}

// ══════════════════════════════════════════════════════════════════════
// BATTLEGROUND INSTANCE — A single match in progress
// ══════════════════════════════════════════════════════════════════════

class BattlegroundInstance {
    constructor(bgDef) {
        this.def = bgDef;
        this.state = 'queue';  // queue → forming → countdown → active → complete
        this.timer = 0;
        this.totalTime = 0;
        this.matchTimer = 0;   // Time elapsed in active match

        // Team rosters
        this.teamA = [];       // Voidborne (player's team)
        this.teamB = [];       // Ironcrest (enemy team)

        // CTF state
        this.score = { voidborne: 0, ironcrest: 0 };
        this.flags = {
            voidborne: { state: 'base', carrier: null, dropX: 0, dropZ: 0, dropTimer: 0 },
            ironcrest: { state: 'base', carrier: null, dropX: 0, dropZ: 0, dropTimer: 0 },
        };

        // Respawn wave timer
        this.respawnWaveTimer = 0;

        // Dampening (reduces healing over time, prevents infinite matches)
        this.dampening = 0; // 0-80% healing reduction over match duration

        // Kill feed
        this.killFeed = [];
        this.maxKillFeed = 8;

        // Chat log
        this.chatLog = [];
        this.chatTimer = 0;
        this._chatIdx = 0;

        // Winner
        this.winner = null; // 'voidborne' | 'ironcrest'

        // Player's team faction
        this.playerFaction = 'voidborne';
    }

    get allCombatants() {
        return [...this.teamA, ...this.teamB];
    }

    getTeam(faction) {
        return faction === 'voidborne' ? this.teamA : this.teamB;
    }

    getEnemyTeam(faction) {
        return faction === 'voidborne' ? this.teamB : this.teamA;
    }
}

// ══════════════════════════════════════════════════════════════════════
// BATTLEGROUND SYSTEM MANAGER
// ══════════════════════════════════════════════════════════════════════

class BattlegroundSystemManager {
    constructor() {
        this.unlocked = false;
        this.instance = null;
        this.stats = {};         // { bgId: { wins, losses, totalKills, totalDeaths, bestTime, totalVP } }
        this.cooldownTimer = 0;
        this.totalMatches = 0;

        // Callbacks for 3D scene (set by main.js)
        this._onEnterBG = null;
        this._onLeaveBG = null;
        this._sceneEntered = false;
    }

    // ── Unlock Check ─────────────────────────────────────────────────
    isUnlocked() {
        if (this.unlocked) return true;
        if (gameState.canAccessZone('neon_wastes')) {
            this.unlocked = true;
            return true;
        }
        return false;
    }

    getAvailableBGs() {
        return BG_DEFS.filter(d => gameState.level >= d.levelRange[0] && gameState.canAccessZone(d.unlockZone));
    }

    getBGStats(bgId) {
        return this.stats[bgId] || { wins: 0, losses: 0, totalKills: 0, totalDeaths: 0, bestTime: Infinity, totalVP: 0 };
    }

    canQueue(bgId) {
        if (this.instance) return false;
        if (this.cooldownTimer > 0) return false;
        const def = BG_DEFS.find(d => d.id === bgId);
        if (!def) return false;
        if (gameState.level < def.levelRange[0]) return false;
        return true;
    }

    // ── Queue for Battleground ───────────────────────────────────────
    queueBG(bgId) {
        if (!this.canQueue(bgId)) return false;
        const def = BG_DEFS.find(d => d.id === bgId);
        if (!def) return false;

        const inst = new BattlegroundInstance(def);
        inst.state = 'queue';
        // Increased wait time (8-15 seconds) to feel more like a real queue
        inst.timer = 8 + Math.random() * 7; 

        this._pushChat(inst, 'SYSTEM', `⚔️ You have entered the Battleground queue for ${def.name}.`, '#cccccc');

        this.instance = inst;
        gameState.addGameLog(`⚔️ Queued for ${def.name} (PvP)...`);
        gameState.addChatMessage('Game', 'System', `⚔️ ${gameState.playerName} has entered the Battleground queue.`);
        return true;
    }

    // ── Accept Match Found ───────────────────────────────────────────
    acceptMatch() {
        if (!this.instance || this.instance.state !== 'match_found') return;
        
        const inst = this.instance;
        inst.state = 'forming';
        inst.timer = 0;
        inst._formPhase = 0;
        this._generateTeams(inst);
        this._pushChat(inst, 'SYSTEM', '✅ Match accepted! Assembling teams...', '#66ff88');
    }

    // ── Decline Match Found ──────────────────────────────────────────
    declineMatch() {
        if (!this.instance || this.instance.state !== 'match_found') return;
        this.leaveBG();
    }

    // ── Generate Teams ───────────────────────────────────────────────
    _generateTeams(inst) {
        const usedNames = new Set();
        const level = Math.min(gameState.level, CONFIG.MAX_LEVEL);

        // Team composition: 2 tanks, 2 healers, 6 DPS per team (WoW-like)
        const comp = ['warrior', 'warrior', 'cleric', 'cleric', 'mage', 'mage', 'ranger', 'ranger', 'mage', 'ranger'];

        // ── Party member integration ──
        // Player's party members join the player's team (Voidborne).
        // They replace random NPC slots with the party member's actual class/name/level.
        const partyMembers = (partySystem && partySystem.members) ? [...partySystem.members] : [];

        // ── Companion pet integration ──
        // If the player has an active companion, it joins as a combatant on the player's team.
        // Companions are DPS-role fighters using ranger class profile (nimble creature behavior).
        // They replace one NPC slot to maintain 10v10 balance.
        const activeCompanion = companionSystem.getActiveCompanion();

        for (const faction of ['voidborne', 'ironcrest']) {
            const team = [];
            const shuffledComp = [...comp].sort(() => Math.random() - 0.5);

            // For the player's faction, reserve slots for party members + companion
            const companionSlots = (faction === 'voidborne' && activeCompanion) ? 1 : 0;
            const partySlots = (faction === 'voidborne') ? partyMembers.length : 0;
            const reservedSlots = partySlots + companionSlots;

            // First, add party members to the player's team
            if (faction === 'voidborne') {
                for (let p = 0; p < partyMembers.length; p++) {
                    const pm = partyMembers[p];
                    const pmName = pm.name;
                    usedNames.add(pmName);

                    const pmLevel = Math.min(pm.level, CONFIG.MAX_LEVEL);
                    const combatant = new PvPCombatant(pmName, pm.classId, faction, pmLevel, pm);
                    combatant.isPartyMember = true;

                    // Party members get a slight stat buff (gear synergy)
                    combatant.maxHp = Math.floor(combatant.maxHp * 1.08);
                    combatant.dps = Math.floor(combatant.dps * 1.08);
                    if (combatant.healPower > 0) combatant.healPower = Math.floor(combatant.healPower * 1.08);
                    combatant.hp = combatant.maxHp;

                    // Apply PvP Vendor team HP boost
                    const hpBoost = pvpVendor.getPvPTeamHpBoost();
                    if (hpBoost > 0) {
                        combatant.maxHp = Math.floor(combatant.maxHp * (1 + hpBoost));
                        combatant.hp = combatant.maxHp;
                    }

                    // Assign roles: first party member gets offense, rest contextual
                    if (pm.classId === 'warrior') combatant.aiRole = p === 0 ? 'flagCarry' : 'offense';
                    else if (pm.classId === 'cleric') combatant.aiRole = 'support';
                    else combatant.aiRole = 'offense';

                    team.push(combatant);
                }

                // Add companion pet to the player's team
                if (activeCompanion) {
                    const compName = activeCompanion.name;
                    usedNames.add(compName);

                    // Companion uses ranger class profile (fast, nimble creature)
                    const compLevel = Math.min(level, CONFIG.MAX_LEVEL);
                    const combatant = new PvPCombatant(compName, 'ranger', faction, compLevel);
                    combatant.isCompanion = true;

                    // Scale companion stats from its actual combat stats
                    // Companion HP = system's companion max HP with +12% PvP toughness
                    // Floor: at least 50% of a normal ranger's HP to avoid being dead-weight
                    const compHp = companionSystem.getCompanionMaxHp();
                    const baseRangerHp = combatant.maxHp; // ranger stat formula result
                    combatant.maxHp = Math.max(Math.floor(baseRangerHp * 0.5), Math.floor(compHp * 1.12));
                    combatant.hp = combatant.maxHp;

                    // Companion DPS = system's companion DPS with +12% PvP ferocity
                    // Floor: at least 50% of a normal ranger's DPS
                    const compDps = companionSystem.getCompanionDps();
                    const baseRangerDps = combatant.dps; // ranger stat formula result
                    combatant.dps = Math.max(Math.floor(baseRangerDps * 0.5), Math.floor(compDps * 1.12));
                    combatant.healPower = 0;

                    // Apply PvP Vendor team HP boost
                    const hpBoost = pvpVendor.getPvPTeamHpBoost();
                    if (hpBoost > 0) {
                        combatant.maxHp = Math.floor(combatant.maxHp * (1 + hpBoost));
                        combatant.hp = combatant.maxHp;
                    }

                    // Companions are aggressive offense fighters — they charge in
                    combatant.aiRole = 'offense';

                    team.push(combatant);
                }
            }

            // Fill remaining NPC slots
            let npcIndex = 0;
            for (let i = reservedSlots; i < inst.def.teamSize; i++) {
                const classId = shuffledComp[npcIndex] || PVP_CLASS_IDS[Math.floor(Math.random() * PVP_CLASS_IDS.length)];
                npcIndex++;
                let name;
                do {
                    const first = PVP_NAMES[Math.floor(Math.random() * PVP_NAMES.length)];
                    const suffix = PVP_SUFFIXES[Math.floor(Math.random() * PVP_SUFFIXES.length)];
                    name = first + suffix;
                } while (usedNames.has(name));
                usedNames.add(name);

                const lvl = Math.max(level - 3, inst.def.levelRange[0]) + Math.floor(Math.random() * 7);
                const combatant = new PvPCombatant(name, classId, faction, Math.min(lvl, CONFIG.MAX_LEVEL));

                // Apply PvP Vendor team HP boost to player's team
                if (faction === 'voidborne') {
                    const hpBoost = pvpVendor.getPvPTeamHpBoost();
                    if (hpBoost > 0) {
                        combatant.maxHp = Math.floor(combatant.maxHp * (1 + hpBoost));
                        combatant.hp = combatant.maxHp;
                    }
                }

                // Assign AI roles — ensure at least 1 flagCarry per team
                const teamIdx = i;
                if (teamIdx === 0) combatant.aiRole = 'flagCarry';  // First NPC slot = FC (if no party warrior took it)
                else if (teamIdx < 3) combatant.aiRole = 'offense';
                else if (teamIdx < 5) combatant.aiRole = 'defense';
                else combatant.aiRole = 'offense';

                team.push(combatant);
            }

            // Ensure at least one FC exists on each team
            if (!team.some(c => c.aiRole === 'flagCarry') && team.length > 0) {
                // Prefer a warrior for FC
                const warrior = team.find(c => c.classId === 'warrior');
                (warrior || team[0]).aiRole = 'flagCarry';
            }

            if (faction === 'voidborne') inst.teamA = team;
            else inst.teamB = team;
        }
    }

    // ── Leave BG ─────────────────────────────────────────────────────
    leaveBG() {
        if (!this.instance) return;
        this.instance = null;
        this.cooldownTimer = 15;

        if (this._sceneEntered && this._onLeaveBG) {
            this._onLeaveBG();
        }
        this._sceneEntered = false;
        gameState.addGameLog('⚔️ Left the battleground.');
    }

    // ══════════════════════════════════════════════════════════════════
    // MAIN UPDATE LOOP
    // ══════════════════════════════════════════════════════════════════
    update(dt) {
        if (!this.unlocked) return;
        if (this.cooldownTimer > 0) {
            this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
        }

        const inst = this.instance;
        if (!inst) return;

        // Use unscaled delta time for queue logic so game speed doesn't make match popups instant
        const realDt = dt / (gameState.gameSpeed || 1);
        inst.totalTime += dt;

        switch (inst.state) {
            case 'queue':       this._updateQueue(inst, realDt); break;
            case 'match_found': this._updateMatchFound(inst, realDt); break;
            case 'forming':     this._updateForming(inst, dt); break;
            case 'countdown':   this._updateCountdown(inst, dt); break;
            case 'active':      this._updateActive(inst, dt); break;
            case 'complete':    this._updateComplete(inst, dt); break;
        }
    }

    // ── QUEUE ────────────────────────────────────────────────────────
    _updateQueue(inst, dt) {
        inst.timer -= dt;
        if (inst.timer <= 0) {
            inst.state = 'match_found';
            inst.timer = 40; // 40s to accept match
            this._pushChat(inst, 'SYSTEM', '🔔 Match found! Click the prompt to enter.', '#ffcc44');
            audioManager.playQueuePop();
        }
    }

    // ── MATCH FOUND ──────────────────────────────────────────────────
    _updateMatchFound(inst, dt) {
        inst.timer -= dt;
        if (inst.timer <= 0) {
            // Auto-decline if timer expires
            this.declineMatch();
        }
    }

    // ── FORMING ──────────────────────────────────────────────────────
    _updateForming(inst, dt) {
        inst._formPhase += dt;
        if (inst._formPhase >= 3) {
            inst.state = 'countdown';
            inst.timer = 5; // 5s countdown
            this._pushChat(inst, 'SYSTEM', `🏟️ Entering ${inst.def.name}... Prepare for battle!`, '#ffcc44');
            this._pushChat(inst, 'SYSTEM', `${FACTIONS.voidborne.icon} Voidborne (${inst.teamA.length}) vs ${FACTIONS.ironcrest.icon} Ironcrest (${inst.teamB.length})`, '#cccccc');

            // Announce party members joining the BG
            const partyInBG = inst.teamA.filter(c => c.isPartyMember);
            if (partyInBG.length > 0) {
                const names = partyInBG.map(c => c.name).join(', ');
                this._pushChat(inst, 'SYSTEM', `★ Your party joined: ${names}`, '#55ccff');
            }

            // Announce companion pet joining the BG
            const companionInBG = inst.teamA.find(c => c.isCompanion);
            if (companionInBG) {
                this._pushChat(inst, 'SYSTEM', `🐾 Your companion ${companionInBG.name} charges into battle!`, '#66ddaa');
            }

            // Enter 3D scene
            if (!this._sceneEntered && this._onEnterBG) {
                this._sceneEntered = true;
                this._onEnterBG(inst.def);
            }
        }
    }

    // ── COUNTDOWN ────────────────────────────────────────────────────
    _updateCountdown(inst, dt) {
        inst.timer -= dt;
        if (inst.timer <= 0) {
            inst.state = 'active';
            inst.matchTimer = 0;
            inst.respawnWaveTimer = 0;
            this._pushChat(inst, 'SYSTEM', '⚔️ THE BATTLE HAS BEGUN! Capture the enemy flag!', '#ff4444');

            // Initial chat burst — the classic BG opener flood
            this._addRandomChat(inst, BG_CHAT.start, 3);
            // Someone always has a strat they insist on
            if (Math.random() < 0.6) {
                this._addRandomChat(inst, BG_CHAT.shotcaller, 1);
            }

            // Party members hype up at match start
            this._addPartyChat(inst, 'general');
            if (Math.random() < 0.5) {
                this._addPartyChat(inst, 'classRole');
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // ACTIVE MATCH — The core PvP simulation engine
    // ══════════════════════════════════════════════════════════════════
    _updateActive(inst, dt) {
        inst.matchTimer += dt;

        // Dampening: increases 1% per 10 seconds, caps at 80%
        inst.dampening = Math.min(0.8, inst.matchTimer * 0.001);

        // Respawn wave
        inst.respawnWaveTimer += dt;
        if (inst.respawnWaveTimer >= inst.def.respawnWave) {
            inst.respawnWaveTimer = 0;
            this._processRespawnWave(inst);
        }

        // Update respawn timers for dead combatants
        for (const c of inst.allCombatants) {
            if (!c.alive && c.respawnTimer > 0) {
                c.respawnTimer -= dt;
            }
        }

        // ── Flag Carrier Debuff Ticking ──
        this._updateFCDebuffs(inst, dt);

        // Run AI for all alive combatants
        for (const c of inst.allCombatants) {
            if (!c.alive) continue;
            this._updateCombatantAI(inst, c, dt);
        }

        // Process combat (with debuff multipliers applied)
        this._processCombat(inst, dt);

        // Check flag pickups / captures / returns / auto-return
        this._updateFlags(inst, dt);

        // Random combat chat — diverse categories for authentic WoW BG feel
        inst.chatTimer += dt;
        if (inst.chatTimer >= 5 + Math.random() * 7) {
            inst.chatTimer = 0;
            // Weighted category selection for varied, authentic BG chat
            const roll = Math.random();
            let chatPool;
            if (roll < 0.35) {
                chatPool = BG_CHAT.combat;
            } else if (roll < 0.55) {
                chatPool = BG_CHAT.troll;
            } else if (roll < 0.68) {
                chatPool = BG_CHAT.passive;
            } else if (roll < 0.80) {
                chatPool = BG_CHAT.shotcaller;
            } else if (roll < 0.90) {
                chatPool = BG_CHAT.healerRage;
            } else {
                // Late-game frustration: more salt as match drags on
                chatPool = inst.matchTimer > 120 ? BG_CHAT.troll : BG_CHAT.combat;
            }
            this._addRandomChat(inst, chatPool, 1);
            // Occasional double message (someone replying / piling on)
            if (Math.random() < 0.25) {
                const replyPool = Math.random() < 0.5 ? BG_CHAT.passive : BG_CHAT.combat;
                this._addRandomChat(inst, replyPool, 1);
            }

            // Party members chime in alongside generic chat (~30% chance)
            const hasParty = inst.teamA.some(c => c.isPartyMember && c.alive);
            if (hasParty && Math.random() < 0.30) {
                // 50/50 between general banter and class-specific callout
                this._addPartyChat(inst, Math.random() < 0.5 ? 'general' : 'classRole');
            }

            // Companion occasionally emotes during combat (~15% chance)
            if (Math.random() < 0.15) {
                this._addCompanionChat(inst, 'combat');
            }
        }

        // Win condition: first to capsToWin
        if (inst.score.voidborne >= inst.def.capsToWin) {
            this._endMatch(inst, 'voidborne');
        } else if (inst.score.ironcrest >= inst.def.capsToWin) {
            this._endMatch(inst, 'ironcrest');
        }

        // Time limit
        if (inst.matchTimer >= inst.def.matchTimeLimit) {
            const winner = inst.score.voidborne > inst.score.ironcrest ? 'voidborne'
                         : inst.score.ironcrest > inst.score.voidborne ? 'ironcrest'
                         : (Math.random() > 0.5 ? 'voidborne' : 'ironcrest'); // tie-break
            this._endMatch(inst, winner);
        }
    }

    // ── FLAG CARRIER DEBUFF SYSTEM ──────────────────────────────────
    // WoW "Focused Assault": stacking debuff that makes holding the
    // flag increasingly punishing. Prevents turtling.
    _updateFCDebuffs(inst, dt) {
        for (const c of inst.allCombatants) {
            if (!c.alive || !c.hasFlag) {
                // Clear debuff state if not carrying (safety)
                if (c.fcDebuffStacks > 0 && !c.hasFlag) {
                    c.fcDebuffStacks = 0;
                    c.fcDebuffTimer = 0;
                    c.fcDamageTakenMult = 1.0;
                    c.fcHealReceivedMult = 1.0;
                    c.moveSpeed = c.baseMoveSpeed;
                }
                continue;
            }

            // Tick debuff timer
            c.fcDebuffTimer += dt;
            if (c.fcDebuffTimer >= FC_DEBUFF.stackInterval) {
                c.fcDebuffTimer -= FC_DEBUFF.stackInterval;
                if (c.fcDebuffStacks < FC_DEBUFF.maxStacks) {
                    c.fcDebuffStacks++;

                    // Chat callout on certain stack milestones
                    if (c.fcDebuffStacks === 3) {
                        this._pushChat(inst, 'SYSTEM', `⚡ ${c.name} gains Focused Assault ×${c.fcDebuffStacks} — taking ${c.fcDebuffStacks * 10}% more damage!`, '#ff8844');
                    } else if (c.fcDebuffStacks === 6) {
                        this._pushChat(inst, 'SYSTEM', `🔥 ${c.name} — Focused Assault ×${c.fcDebuffStacks}! HP draining, movement crippled!`, '#ff4444');
                        this._addRandomChat(inst, BG_CHAT.flagDebuff, 1);
                    } else if (c.fcDebuffStacks === FC_DEBUFF.maxStacks) {
                        this._pushChat(inst, 'SYSTEM', `💀 ${c.name} — MAX Focused Assault ×${c.fcDebuffStacks}! Critical condition!`, '#ff2222');
                        this._addRandomChat(inst, BG_CHAT.flagDebuff, 1);
                    }
                }
            }

            // Apply debuff values from stacks
            const stacks = c.fcDebuffStacks;

            // Movement slow: base reduction + per-stack, capped
            const moveReduction = Math.min(
                FC_DEBUFF.maxMoveReduction,
                FC_DEBUFF.baseMoveReduction + stacks * FC_DEBUFF.moveReductionPerStack
            );
            c.moveSpeed = c.baseMoveSpeed * (1 - moveReduction);

            // Damage taken multiplier: 1.0 + stacks * 0.10, capped at 2.0
            c.fcDamageTakenMult = 1.0 + Math.min(
                FC_DEBUFF.maxDamageTakenBonus,
                stacks * FC_DEBUFF.damageTakenPerStack
            );

            // Heal received multiplier: 1.0 - stacks * 0.08, floored at 0.40
            c.fcHealReceivedMult = Math.max(
                1 - FC_DEBUFF.maxHealReduction,
                1 - stacks * FC_DEBUFF.healReductionPerStack
            );

            // Bleed damage tick: 0.2% maxHP per stack per second
            if (stacks > 0) {
                const bleedDmg = Math.floor(c.maxHp * FC_DEBUFF.bleedDpsPerStack * stacks * dt);
                if (bleedDmg > 0) {
                    c.hp -= bleedDmg;
                    if (c.hp <= 0) {
                        // Killed by debuff bleed — drop the flag
                        c.hp = 0;
                        c.alive = false;
                        c.deaths++;
                        c.respawnTimer = inst.def.respawnWave;

                        const flagFaction = c.faction === 'voidborne' ? 'ironcrest' : 'voidborne';
                        inst.flags[flagFaction].state = 'dropped';
                        inst.flags[flagFaction].carrier = null;
                        inst.flags[flagFaction].dropX = c.x;
                        inst.flags[flagFaction].dropZ = c.z;
                        inst.flags[flagFaction].dropTimer = 0;
                        c.clearFCState();

                        inst.killFeed.push({ msg: `${c.name} died to Focused Assault`, attackerFaction: '', targetFaction: c.faction, time: inst.totalTime });
                        if (inst.killFeed.length > inst.maxKillFeed) inst.killFeed.shift();
                        this._pushChat(inst, 'SYSTEM', `💀 ${c.name} has been CONSUMED by Focused Assault! Flag dropped!`, '#ff2222');
                    }
                }
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // WOW-STYLE CLASS-SPECIFIC AI & MOVEMENT ENGINE
    // Each class behaves fundamentally differently in how they move,
    // position, engage, and retreat — just like real WoW WSG.
    // ══════════════════════════════════════════════════════════════════

    _updateCombatantAI(inst, c, dt) {
        c.attackCooldown -= dt;
        const prof = c.profile;

        // ── Tick CC / ability cooldowns ──
        if (c.chargeCd > 0) c.chargeCd -= dt;
        if (c.blinkCd > 0) c.blinkCd -= dt;
        if (c.disengageCd > 0) c.disengageCd -= dt;
        if (c.sprintCd > 0) c.sprintCd -= dt;
        if (c.sprintTimer > 0) c.sprintTimer -= dt;
        if (c.rootedTimer > 0) c.rootedTimer -= dt;
        if (c.slowedTimer > 0) { c.slowedTimer -= dt; if (c.slowedTimer <= 0) c.slowAmount = 0; }
        if (c.slowApplyCd > 0) c.slowApplyCd -= dt;
        if (c.rootApplyCd > 0) c.rootApplyCd -= dt;
        c.isCharging = false;

        const enemyTeam = inst.getEnemyTeam(c.faction);
        const myTeam = inst.getTeam(c.faction);
        const enemyFaction = c.faction === 'voidborne' ? 'ironcrest' : 'voidborne';
        const enemyBase = FACTIONS[enemyFaction].basePos;
        const myBase = FACTIONS[c.faction].basePos;
        const enemyFlag = inst.flags[enemyFaction];
        const myFlag = inst.flags[c.faction];

        // ── Find nearest enemy for threat checks ──
        const nearest = this._findNearestEnemy(c, enemyTeam);
        const nearDist = nearest ? Math.sqrt((nearest.x - c.x) ** 2 + (nearest.z - c.z) ** 2) : 999;

        // ══════════════════════════════════════════
        // PRIORITY 1: FLAG CARRIER — run home with class-specific pathing
        // ══════════════════════════════════════════
        if (c.hasFlag) {
            c.isRetreating = false;
            // FC runs toward own base but Warriors charge through, Mages blink, Rangers sprint
            c.targetX = myBase.x;
            c.targetZ = myBase.z;

            // Warriors use Charge to burst toward base if enemies nearby
            if (c.classId === 'warrior' && c.chargeCd <= 0 && nearDist < 8) {
                c.isCharging = true;
                c.chargeCd = prof.chargeCd;
            }
            // Mages Blink toward base
            if (c.classId === 'mage' && c.blinkCd <= 0 && nearDist < 6) {
                this._blinkToward(c, myBase.x, myBase.z);
                c.blinkCd = prof.blinkCd;
            }

            this._moveCombatant(c, dt);
            return;
        }

        // ══════════════════════════════════════════
        // PRIORITY 2: RETREAT — low HP, flee to healer or base
        // Class-specific retreat thresholds (squishier = retreat earlier)
        // ══════════════════════════════════════════
        const hpPct = c.hp / c.maxHp;
        if (hpPct < prof.retreatHp && c.role !== 'Healer') {
            c.isRetreating = true;
            // Find nearest allied healer
            const healer = this._findNearestAllyByRole(c, myTeam, 'Healer');
            if (healer) {
                c.targetX = healer.x + (Math.random() - 0.5) * 2;
                c.targetZ = healer.z + (Math.random() - 0.5) * 2;
            } else {
                c.targetX = myBase.x + (Math.random() - 0.5) * 4;
                c.targetZ = myBase.z + (Math.random() - 0.5) * 4;
            }
            // Mage blink away from nearest enemy
            if (c.classId === 'mage' && c.blinkCd <= 0 && nearDist < 5) {
                this._blinkAwayFrom(c, nearest);
                c.blinkCd = prof.blinkCd;
            }
            // Ranger disengage
            if (c.classId === 'ranger' && c.disengageCd <= 0 && nearDist < 4) {
                this._disengageFrom(c, nearest);
                c.disengageCd = prof.disengageCd;
            }
            this._moveCombatant(c, dt);
            return;
        }
        c.isRetreating = false;

        // ══════════════════════════════════════════
        // PRIORITY 3: HEALER (Cleric) AI — WoW healer positioning
        // Stay behind group, sprint to injured, serpentine to dodge
        // ══════════════════════════════════════════
        if (c.role === 'Healer') {
            // Find lowest HP ally in range
            let lowestAlly = null, lowestPct = 1;
            for (const ally of myTeam) {
                if (!ally.alive || ally === c) continue;
                const pct = ally.hp / ally.maxHp;
                if (pct < lowestPct) { lowestPct = pct; lowestAlly = ally; }
            }

            // Sprint to critically injured ally
            if (lowestAlly && lowestPct < 0.4 && c.sprintCd <= 0) {
                const dToAlly = Math.sqrt((lowestAlly.x - c.x) ** 2 + (lowestAlly.z - c.z) ** 2);
                if (dToAlly > 8) {
                    c.sprintTimer = prof.sprintDuration;
                    c.sprintCd = prof.sprintCd;
                }
            }

            if (lowestAlly && lowestPct < 0.85) {
                // Move toward injured ally but stay BEHIND them (away from enemies)
                const allyToEnemyX = nearest ? nearest.x - lowestAlly.x : enemyBase.x - lowestAlly.x;
                const allyToEnemyZ = nearest ? nearest.z - lowestAlly.z : enemyBase.z - lowestAlly.z;
                const len = Math.sqrt(allyToEnemyX ** 2 + allyToEnemyZ ** 2) || 1;
                // Position behind the ally (opposite side from enemy)
                c.targetX = lowestAlly.x - (allyToEnemyX / len) * 3;
                c.targetZ = lowestAlly.z - (allyToEnemyZ / len) * 3;
            } else {
                // No urgent healing — follow FC or stay behind offense pack
                const fc = myTeam.find(a => a.hasFlag && a.alive);
                if (fc) {
                    // Stay behind FC (between FC and own base)
                    const fcToBase = { x: myBase.x - fc.x, z: myBase.z - fc.z };
                    const fbLen = Math.sqrt(fcToBase.x ** 2 + fcToBase.z ** 2) || 1;
                    c.targetX = fc.x + (fcToBase.x / fbLen) * 4;
                    c.targetZ = fc.z + (fcToBase.z / fbLen) * 4;
                } else {
                    // Stay behind team center
                    const center = this._getTeamCenter(myTeam);
                    const toBase = { x: myBase.x - center.x, z: myBase.z - center.z };
                    const tbLen = Math.sqrt(toBase.x ** 2 + toBase.z ** 2) || 1;
                    c.targetX = center.x + (toBase.x / tbLen) * 4;
                    c.targetZ = center.z + (toBase.z / tbLen) * 4;
                }
            }

            // Kite away from melee (serpentine movement)
            if (nearest && nearDist < prof.kiteRange) {
                const awayX = c.x - nearest.x, awayZ = c.z - nearest.z;
                const awayLen = Math.sqrt(awayX ** 2 + awayZ ** 2) || 1;
                // Serpentine: add perpendicular offset that oscillates
                const serpTime = Math.sin(inst.matchTimer * 3 + c.strafeAngle) * 2;
                c.targetX = c.x + (awayX / awayLen) * 5 + (-awayZ / awayLen) * serpTime;
                c.targetZ = c.z + (awayZ / awayLen) * 5 + (awayX / awayLen) * serpTime;
            }

            this._moveCombatant(c, dt);
            return;
        }

        // ══════════════════════════════════════════
        // PRIORITY 4: DEFENSE AI — guard flag room
        // ══════════════════════════════════════════
        if (c.aiRole === 'defense') {
            if (myFlag.state !== 'base') {
                // Flag stolen — chase carrier!
                const carrier = enemyTeam.find(e => e.hasFlag && e.alive);
                if (carrier) {
                    c.targetX = carrier.x;
                    c.targetZ = carrier.z;
                    c.inCombatWith = carrier;
                    // Warrior charge at FC
                    if (c.classId === 'warrior' && c.chargeCd <= 0) {
                        const dFC = Math.sqrt((carrier.x - c.x) ** 2 + (carrier.z - c.z) ** 2);
                        if (dFC > prof.chargeMinDist && dFC < prof.chargeMaxDist) {
                            c.isCharging = true;
                            c.chargeCd = prof.chargeCd;
                        }
                    }
                }
            } else {
                // Patrol near base — class-specific patrol patterns
                const patrolRadius = c.classId === 'ranger' ? 7 : 5;
                const patrolSpeed = c.classId === 'ranger' ? 0.4 : 0.25;
                c.targetX = myBase.x + Math.sin(inst.matchTimer * patrolSpeed + c.strafeAngle) * patrolRadius;
                c.targetZ = myBase.z + Math.cos(inst.matchTimer * patrolSpeed + c.strafeAngle) * patrolRadius;
                c.inCombatWith = null;

                // Engage enemies near base
                if (nearest && nearDist < 12) {
                    c.inCombatWith = nearest;
                    this._applyCombatPositioning(c, nearest, dt, inst);
                    this._tryClassAbilities(c, nearest, nearDist, enemyTeam, dt);
                    this._moveCombatant(c, dt);
                    return;
                }
            }
            this._moveCombatant(c, dt);
            return;
        }

        // ══════════════════════════════════════════
        // PRIORITY 5: FLAG CARRY ROLE AI — go pick up enemy flag
        // ══════════════════════════════════════════
        if (c.aiRole === 'flagCarry') {
            if (enemyFlag.state === 'base') {
                c.targetX = enemyBase.x;
                c.targetZ = enemyBase.z;
                // Warriors charge toward flag
                if (c.classId === 'warrior' && c.chargeCd <= 0) {
                    const dFlag = Math.sqrt((enemyBase.x - c.x) ** 2 + (enemyBase.z - c.z) ** 2);
                    if (dFlag > prof.chargeMinDist && dFlag < prof.chargeMaxDist) {
                        c.isCharging = true;
                        c.chargeCd = prof.chargeCd;
                    }
                }
            } else if (enemyFlag.state === 'dropped') {
                c.targetX = enemyFlag.dropX;
                c.targetZ = enemyFlag.dropZ;
            } else {
                // Flag carried by ally — escort or fight
                const allyFC = myTeam.find(a => a.hasFlag && a.alive);
                if (allyFC) {
                    // Escort: position between FC and enemies
                    if (nearest) {
                        const midX = (allyFC.x + nearest.x) / 2;
                        const midZ = (allyFC.z + nearest.z) / 2;
                        c.targetX = midX;
                        c.targetZ = midZ;
                    } else {
                        c.targetX = allyFC.x + 2;
                        c.targetZ = allyFC.z + 1;
                    }
                } else {
                    if (nearest) { c.targetX = nearest.x; c.targetZ = nearest.z; }
                }
            }
            this._moveCombatant(c, dt);
            return;
        }

        // ══════════════════════════════════════════
        // PRIORITY 6: OFFENSE — pick up dropped flags nearby
        // ══════════════════════════════════════════
        if (c.aiRole === 'offense' && enemyFlag.state === 'dropped') {
            const dfx = enemyFlag.dropX - c.x, dfz = enemyFlag.dropZ - c.z;
            if (dfx * dfx + dfz * dfz < 100) {
                c.targetX = enemyFlag.dropX;
                c.targetZ = enemyFlag.dropZ;
                this._moveCombatant(c, dt);
                return;
            }
        }

        // ══════════════════════════════════════════
        // PRIORITY 7: OFFENSE COMBAT — class-specific target selection & positioning
        // WoW target priority: FC > Healers > low HP > nearest
        // ══════════════════════════════════════════
        let target = null;
        // Warriors tunnel the FC (intercepting)
        if (c.classId === 'warrior') {
            target = enemyTeam.find(e => e.hasFlag && e.alive);
            if (!target) target = this._findNearestEnemy(c, enemyTeam);
        }
        // Mages prioritize healers (CC/burst them down)
        else if (c.classId === 'mage') {
            target = enemyTeam.find(e => e.role === 'Healer' && e.alive);
            if (!target) target = enemyTeam.find(e => e.hasFlag && e.alive);
            if (!target) target = this._findLowestHPEnemy(c, enemyTeam);
            if (!target) target = this._findNearestEnemy(c, enemyTeam);
        }
        // Rangers prioritize low HP (finishing blows) and FCs
        else if (c.classId === 'ranger') {
            target = enemyTeam.find(e => e.hasFlag && e.alive);
            if (!target) target = this._findLowestHPEnemy(c, enemyTeam);
            if (!target) target = this._findNearestEnemy(c, enemyTeam);
        }
        // Default: FC > healer > nearest
        else {
            target = enemyTeam.find(e => e.hasFlag && e.alive);
            if (!target) target = enemyTeam.find(e => e.role === 'Healer' && e.alive);
            if (!target) target = this._findNearestEnemy(c, enemyTeam);
        }

        if (target) {
            c.inCombatWith = target;
            c.targetEnemy = target;
            const dToTarget = Math.sqrt((target.x - c.x) ** 2 + (target.z - c.z) ** 2);

            // ── Class-specific combat movement ──
            this._applyCombatPositioning(c, target, dt, inst);

            // ── Use class abilities ──
            this._tryClassAbilities(c, target, dToTarget, enemyTeam, dt);
        } else {
            // No targets — push toward enemy base as a group
            const center = this._getTeamCenter(myTeam);
            const pushX = (enemyBase.x - myBase.x);
            const pushZ = (enemyBase.z - myBase.z);
            const pushLen = Math.sqrt(pushX ** 2 + pushZ ** 2) || 1;
            // Move slightly ahead of team center toward enemy
            c.targetX = center.x + (pushX / pushLen) * 5 + (Math.random() - 0.5) * 3;
            c.targetZ = center.z + (pushZ / pushLen) * 2 + (Math.random() - 0.5) * 3;
            c.inCombatWith = null;
        }
        this._moveCombatant(c, dt);
    }

    // ── CLASS-SPECIFIC COMBAT POSITIONING ──────────────────────────
    // Warriors circle-strafe in melee range
    // Mages maintain max range with lateral strafing
    // Rangers kite at medium range, flanking
    // Clerics handled separately (healer AI above)
    _applyCombatPositioning(c, target, dt, inst) {
        const prof = c.profile;
        const dx = target.x - c.x, dz = target.z - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;

        if (c.classId === 'warrior') {
            // ── Warrior: close to melee range, circle-strafe ──
            if (dist > prof.combatRange + 1) {
                // Close the gap
                c.targetX = target.x;
                c.targetZ = target.z;
            } else {
                // Circle-strafe: orbit around target at melee range
                c.strafeAngle += c.strafeDir * dt * 2.5;
                c.targetX = target.x + Math.cos(c.strafeAngle) * prof.strafeRadius;
                c.targetZ = target.z + Math.sin(c.strafeAngle) * prof.strafeRadius;
                // Occasionally reverse strafe direction (unpredictable)
                if (Math.random() < 0.01) c.strafeDir *= -1;
            }
        } else if (c.classId === 'mage') {
            // ── Mage: maintain max range, wide lateral strafe ──
            if (dist < prof.kiteRange) {
                // Too close — backpedal away
                c.targetX = c.x - (dx / dist) * 4;
                c.targetZ = c.z - (dz / dist) * 4;
            } else if (dist > prof.combatRange + 2) {
                // Too far — close in a bit
                c.targetX = target.x - (dx / dist) * prof.combatRange;
                c.targetZ = target.z - (dz / dist) * prof.combatRange;
            } else {
                // At range — lateral strafe while casting
                c.strafeAngle += c.strafeDir * dt * 1.5;
                const perpX = -dz / dist, perpZ = dx / dist;
                c.targetX = c.x + perpX * prof.strafeRadius * Math.sin(c.strafeAngle);
                c.targetZ = c.z + perpZ * prof.strafeRadius * Math.sin(c.strafeAngle);
                if (Math.random() < 0.015) c.strafeDir *= -1;
            }
        } else if (c.classId === 'ranger') {
            // ── Ranger: medium range, flanking movement, kiting ──
            if (dist < prof.kiteRange) {
                // Kite — backpedal diagonally
                const perpX = -dz / dist, perpZ = dx / dist;
                c.targetX = c.x - (dx / dist) * 3 + perpX * 2 * c.strafeDir;
                c.targetZ = c.z - (dz / dist) * 3 + perpZ * 2 * c.strafeDir;
            } else if (dist > prof.combatRange + 2) {
                // Close in
                c.targetX = target.x - (dx / dist) * prof.combatRange;
                c.targetZ = target.z - (dz / dist) * prof.combatRange;
            } else {
                // At range — orbital flanking
                c.strafeAngle += c.strafeDir * dt * 2.0;
                c.targetX = target.x + Math.cos(c.strafeAngle) * prof.combatRange;
                c.targetZ = target.z + Math.sin(c.strafeAngle) * prof.combatRange;
                if (Math.random() < 0.02) c.strafeDir *= -1;
            }
        } else {
            // Generic: move toward target
            c.targetX = target.x + (Math.random() - 0.5) * 2;
            c.targetZ = target.z + (Math.random() - 0.5) * 2;
        }
    }

    // ── CLASS ABILITIES (movement-related) ─────────────────────────
    _tryClassAbilities(c, target, dist, enemyTeam, dt) {
        const prof = c.profile;

        // ── Warrior: Charge ──
        if (c.classId === 'warrior' && c.chargeCd <= 0 && !c.isCharging) {
            if (dist > prof.chargeMinDist && dist < prof.chargeMaxDist) {
                c.isCharging = true;
                c.chargeCd = prof.chargeCd;
                // Apply brief slow to target (Hamstring)
                if (target.slowedTimer <= 0) {
                    target.slowedTimer = 3.0;
                    target.slowAmount = 0.35;
                }
            }
        }

        // ── Mage: Blink away from melee, Root (Frost Nova) ──
        if (c.classId === 'mage') {
            if (c.blinkCd <= 0 && dist < 4) {
                this._blinkAwayFrom(c, target);
                c.blinkCd = prof.blinkCd;
            }
            if (c.rootApplyCd <= 0 && dist < 5) {
                // Frost Nova: root nearby enemies
                for (const e of enemyTeam) {
                    if (!e.alive) continue;
                    const ed = Math.sqrt((e.x - c.x) ** 2 + (e.z - c.z) ** 2);
                    if (ed < 5) e.rootedTimer = 2.0;
                }
                c.rootApplyCd = 10;
            }
        }

        // ── Ranger: Disengage if melee closes, Concussive Shot ──
        if (c.classId === 'ranger') {
            if (c.disengageCd <= 0 && dist < 3.5) {
                this._disengageFrom(c, target);
                c.disengageCd = prof.disengageCd;
            }
            if (c.slowApplyCd <= 0 && target.slowedTimer <= 0 && dist < 9) {
                target.slowedTimer = 3.0;
                target.slowAmount = 0.40;
                c.slowApplyCd = 6;
            }
        }
    }

    // ── MOVEMENT HELPERS ──────────────────────────────────────────
    _moveCombatant(c, dt) {
        if (c.rootedTimer > 0) return; // Rooted — can't move

        const dx = c.targetX - c.x;
        const dz = c.targetZ - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.3) {
            const speed = c.getEffectiveSpeed() * dt;
            c.x += (dx / dist) * Math.min(speed, dist);
            c.z += (dz / dist) * Math.min(speed, dist);
        }
        // Clamp to arena bounds
        c.x = Math.max(-38, Math.min(38, c.x));
        c.z = Math.max(-15, Math.min(15, c.z));
    }

    // ── Mage Blink: instant teleport toward a point ──
    _blinkToward(c, tx, tz) {
        const dx = tx - c.x, dz = tz - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const blinkDist = Math.min(c.profile.blinkDist, dist);
        c.x += (dx / dist) * blinkDist;
        c.z += (dz / dist) * blinkDist;
        c.x = Math.max(-38, Math.min(38, c.x));
        c.z = Math.max(-15, Math.min(15, c.z));
    }

    // ── Mage Blink: instant teleport away from threat ──
    _blinkAwayFrom(c, threat) {
        if (!threat) return;
        const dx = c.x - threat.x, dz = c.z - threat.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        c.x += (dx / dist) * c.profile.blinkDist;
        c.z += (dz / dist) * c.profile.blinkDist;
        c.x = Math.max(-38, Math.min(38, c.x));
        c.z = Math.max(-15, Math.min(15, c.z));
    }

    // ── Ranger Disengage: backwards leap away from threat ──
    _disengageFrom(c, threat) {
        if (!threat) return;
        const dx = c.x - threat.x, dz = c.z - threat.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        c.x += (dx / dist) * c.profile.disengageDist;
        c.z += (dz / dist) * c.profile.disengageDist;
        c.x = Math.max(-38, Math.min(38, c.x));
        c.z = Math.max(-15, Math.min(15, c.z));
    }

    // ── TARGETING HELPERS ─────────────────────────────────────────
    _findNearestEnemy(c, enemyTeam) {
        let nearest = null, nearDist = Infinity;
        for (const e of enemyTeam) {
            if (!e.alive) continue;
            const dx = e.x - c.x, dz = e.z - c.z;
            const d = dx * dx + dz * dz;
            if (d < nearDist) { nearDist = d; nearest = e; }
        }
        return nearest;
    }

    _findLowestHPEnemy(c, enemyTeam) {
        let lowest = null, lowestPct = 1;
        for (const e of enemyTeam) {
            if (!e.alive) continue;
            const dx = e.x - c.x, dz = e.z - c.z;
            if (dx * dx + dz * dz > 225) continue; // Within 15 units
            const pct = e.hp / e.maxHp;
            if (pct < lowestPct) { lowestPct = pct; lowest = e; }
        }
        return lowestPct < 0.5 ? lowest : null; // Only focus if below 50%
    }

    _findNearestAllyByRole(c, myTeam, role) {
        let nearest = null, nearDist = Infinity;
        for (const a of myTeam) {
            if (!a.alive || a === c || a.role !== role) continue;
            const d = (a.x - c.x) ** 2 + (a.z - c.z) ** 2;
            if (d < nearDist) { nearDist = d; nearest = a; }
        }
        return nearest;
    }

    _getTeamCenter(team) {
        let x = 0, z = 0, n = 0;
        for (const c of team) {
            if (!c.alive) continue;
            x += c.x; z += c.z; n++;
        }
        return n > 0 ? { x: x / n, z: z / n } : { x: 0, z: 0 };
    }

    // ── COMBAT (with FC debuff multipliers + base defender buff + PvP vendor bonuses) ─
    _processCombat(inst, dt) {
        // ── PvP Vendor bonuses (applied to player's team = voidborne) ──
        const pvpDmgBoost = 1 + pvpVendor.getPvPDamageBoost();
        const pvpDmgReduction = 1 - pvpVendor.getPvPDamageReduction();
        const pvpHealBoost = 1 + pvpVendor.getPvPTeamHealBoost();
        const playerFaction = inst.playerFaction;

        for (const attacker of inst.allCombatants) {
            if (!attacker.alive || attacker.attackCooldown > 0) continue;

            const enemyTeam = inst.getEnemyTeam(attacker.faction);
            const myTeam = inst.getTeam(attacker.faction);
            const isPlayerTeam = attacker.faction === playerFaction;

            // ── Base Defender Buff: +15% damage, +10% healing near own base ──
            const myBase = FACTIONS[attacker.faction].basePos;
            const dxBase = attacker.x - myBase.x, dzBase = attacker.z - myBase.z;
            const nearOwnBase = (dxBase * dxBase + dzBase * dzBase) < 100; // within 10 units
            const defenderDmgMult = nearOwnBase ? 1.15 : 1.0;
            const defenderHealMult = nearOwnBase ? 1.10 : 1.0;

            // Healers heal allies instead of attacking
            if (attacker.role === 'Healer' && attacker.healPower > 0) {
                let lowestAlly = null, lowestPct = 1.0;
                
                // ── PREMADE PARTY AI POLISH: Prioritize party and player ──
                // Healers on player's team (Voidborne) consider the player and party first
                let potentialTargets = [...myTeam];
                
                // Add player as a virtual target if faction matches
                const playerFaction = inst.playerFaction;
                if (attacker.faction === playerFaction) {
                    const playerPct = gameState.hp / gameState.maxHp;
                    if (playerPct < 1.0) {
                        potentialTargets.push({
                            name: gameState.playerName,
                            hp: gameState.hp,
                            maxHp: gameState.maxHp,
                            isPlayer: true,
                            x: inst.playerX || 0, // Injected by scene
                            z: inst.playerZ || 0,
                            fcHealReceivedMult: 1.0,
                            alive: gameState.hp > 0
                        });
                    }
                }

                for (const ally of potentialTargets) {
                    if (!ally.alive || (ally.hp >= ally.maxHp && !ally.isPlayer)) continue;
                    const dx = ally.x - attacker.x, dz = ally.z - attacker.z;
                    const healRange = attacker.profile.attackRange || 10;
                    if (dx * dx + dz * dz > healRange * healRange) continue;
                    
                    let pct = ally.isPlayer ? (gameState.hp / gameState.maxHp) : (ally.hp / ally.maxHp);
                    
                    // Party members prioritize other party members or the player
                    // We artificially "lower" their pct in the selection to make them more attractive targets
                    if (attacker.isPartyMember) {
                        if (ally.isPlayer || ally.isPartyMember) {
                            pct *= 0.8; // 20% "priority" boost in selection
                        }
                    }

                    if (pct < lowestPct) { lowestPct = pct; lowestAlly = ally; }
                }

                if (lowestAlly) {
                    // Apply dampening + defender buff + target's FC heal reduction + PvP heal boost
                    const teamHealMult = isPlayerTeam ? pvpHealBoost : 1.0;
                    let heal = Math.floor(attacker.healPower * (1 - inst.dampening) * defenderHealMult * teamHealMult * (0.8 + Math.random() * 0.4));
                    heal = Math.floor(heal * (lowestAlly.fcHealReceivedMult || 1.0));
                    
                    if (lowestAlly.isPlayer) {
                        gameState.hp = Math.min(gameState.maxHp, gameState.hp + heal);
                    } else {
                        lowestAlly.hp = Math.min(lowestAlly.maxHp, lowestAlly.hp + heal);
                    }
                    
                    attacker.healing += heal;
                    attacker.attackCooldown = 1.5 + Math.random() * 0.5;
                    continue;
                }
            }

            // Find target in range — class-specific attack ranges
            const atkRange = attacker.profile.attackRange || 6;
            const atkRangeSq = atkRange * atkRange;
            let target = null;
            let targetDist = Infinity;
            for (const e of enemyTeam) {
                if (!e.alive) continue;
                const dx = e.x - attacker.x, dz = e.z - attacker.z;
                const d = dx * dx + dz * dz;
                // Prioritize flag carriers: treat them as if 60% closer
                const effectiveD = e.hasFlag ? d * 0.4 : d;
                if (d < atkRangeSq && effectiveD < targetDist) {
                    targetDist = effectiveD;
                    target = e;
                }
            }

            if (target) {
                const isTargetPlayerTeam = target.faction === playerFaction;
                // Base damage × defender buff × target's FC damage-taken multiplier
                // × PvP vendor: attacker boost (if player team) × target reduction (if player team)
                let dmg = Math.floor(attacker.dps * defenderDmgMult * (0.6 + Math.random() * 0.8));
                dmg = Math.floor(dmg * target.fcDamageTakenMult);
                if (isPlayerTeam) dmg = Math.floor(dmg * pvpDmgBoost);         // Player team deals more
                if (isTargetPlayerTeam) dmg = Math.floor(dmg * pvpDmgReduction); // Player team takes less
                target.hp -= dmg;
                attacker.damage += dmg;
                attacker.attackCooldown = 1.0 + Math.random() * 0.8;

                if (target.hp <= 0) {
                    target.hp = 0;
                    target.alive = false;
                    target.deaths++;
                    target.respawnTimer = inst.def.respawnWave;
                    attacker.kills++;

                    // Drop flag on death — uses clearFCState
                    if (target.hasFlag) {
                        const flagFaction = target.faction === 'voidborne' ? 'ironcrest' : 'voidborne';
                        inst.flags[flagFaction].state = 'dropped';
                        inst.flags[flagFaction].carrier = null;
                        inst.flags[flagFaction].dropX = target.x;
                        inst.flags[flagFaction].dropZ = target.z;
                        inst.flags[flagFaction].dropTimer = 0;
                        target.clearFCState();
                        this._pushChat(inst, 'SYSTEM', `🚩 ${FACTIONS[flagFaction].name} flag has been dropped!`, FACTIONS[flagFaction].color);
                    }

                    // Kill feed
                    const killMsg = `${attacker.name} killed ${target.name}`;
                    inst.killFeed.push({ msg: killMsg, attackerFaction: attacker.faction, targetFaction: target.faction, time: inst.totalTime });
                    if (inst.killFeed.length > inst.maxKillFeed) inst.killFeed.shift();

                    // Party/companion kill & death chat reactions
                    if (attacker.isPartyMember && Math.random() < 0.35) {
                        this._addPartyChat(inst, 'kill', attacker);
                    } else if (attacker.isCompanion && Math.random() < 0.30) {
                        this._addCompanionChat(inst, 'kill');
                    }
                    if (target.isPartyMember) {
                        this._addPartyChat(inst, 'death', target);
                    } else if (target.isCompanion) {
                        this._addCompanionChat(inst, 'death');
                    }
                }
            }
        }
    }

    // ── FLAG MECHANICS (with capture channel, auto-return, debuff clearing) ──
    _updateFlags(inst, dt) {
        for (const faction of ['voidborne', 'ironcrest']) {
            const flag = inst.flags[faction];
            const enemyFaction = faction === 'voidborne' ? 'ironcrest' : 'voidborne';
            const enemyTeam = inst.getTeam(enemyFaction);
            const friendlyTeam = inst.getTeam(faction);
            const basePos = FACTIONS[faction].basePos;

            if (flag.state === 'base') {
                // Enemy can pick up flag at base
                for (const e of enemyTeam) {
                    if (!e.alive || e.hasFlag) continue;
                    const dx = e.x - basePos.x, dz = e.z - basePos.z;
                    if (dx * dx + dz * dz < 9) { // 3 unit pickup radius
                        flag.state = 'carried';
                        flag.carrier = e;
                        e.hasFlag = true;
                        e.fcDebuffStacks = 0;
                        e.fcDebuffTimer = 0;
                        e.captureProgress = 0;
                        e.isChanneling = false;
                        this._pushChat(inst, 'SYSTEM', `🚩 ${e.name} has picked up the ${FACTIONS[faction].name} flag!`, FACTIONS[enemyFaction].color);
                        break;
                    }
                }
            } else if (flag.state === 'dropped') {
                // ── Auto-return timer ──
                flag.dropTimer += dt;
                if (flag.dropTimer >= FLAG_DROP_RETURN_TIME) {
                    flag.state = 'base';
                    flag.carrier = null;
                    flag.dropTimer = 0;
                    this._pushChat(inst, 'SYSTEM', `⏱️ ${FACTIONS[faction].name} flag has auto-returned to base!`, FACTIONS[faction].color);
                    this._addRandomChat(inst, BG_CHAT.flagReturn, 1);
                    continue;
                }

                // Friendly can return (instantly)
                let returned = false;
                for (const f of friendlyTeam) {
                    if (!f.alive) continue;
                    const dx = f.x - flag.dropX, dz = f.z - flag.dropZ;
                    if (dx * dx + dz * dz < 9) {
                        flag.state = 'base';
                        flag.carrier = null;
                        flag.dropTimer = 0;
                        f.flagReturns++;
                        this._pushChat(inst, 'SYSTEM', `🏳️ ${f.name} has returned the ${FACTIONS[faction].name} flag!`, FACTIONS[faction].color);
                        returned = true;
                        break;
                    }
                }

                // Enemy can re-pick up dropped flag
                if (!returned && flag.state === 'dropped') {
                    for (const e of enemyTeam) {
                        if (!e.alive || e.hasFlag) continue;
                        const dx = e.x - flag.dropX, dz = e.z - flag.dropZ;
                        if (dx * dx + dz * dz < 9) {
                            flag.state = 'carried';
                            flag.carrier = e;
                            flag.dropTimer = 0;
                            e.hasFlag = true;
                            e.fcDebuffStacks = 0;
                            e.fcDebuffTimer = 0;
                            e.captureProgress = 0;
                            e.isChanneling = false;
                            this._pushChat(inst, 'SYSTEM', `🚩 ${e.name} has picked up the ${FACTIONS[faction].name} flag!`, FACTIONS[enemyFaction].color);
                            break;
                        }
                    }
                }
            } else if (flag.state === 'carried') {
                // ── BASE CAPTURE CHANNEL ──
                // Carrier must stand on their own capture pad for channelTime seconds.
                // Own flag must be at base (WoW rule). Enemies in zone interrupt.
                const carrier = flag.carrier;
                if (carrier && carrier.alive) {
                    const myBase = FACTIONS[carrier.faction].basePos;
                    const myFlag = inst.flags[carrier.faction];
                    const dx = carrier.x - myBase.x, dz = carrier.z - myBase.z;
                    const distToBaseSq = dx * dx + dz * dz;
                    const capRadSq = CAPTURE_ZONE.radius * CAPTURE_ZONE.radius;

                    if (distToBaseSq < capRadSq && myFlag.state === 'base') {
                        // In capture zone with own flag home — check for enemy interruptors
                        let interrupted = false;
                        for (const enemy of inst.getEnemyTeam(carrier.faction)) {
                            if (!enemy.alive) continue;
                            const ex = enemy.x - myBase.x, ez = enemy.z - myBase.z;
                            if (ex * ex + ez * ez < CAPTURE_ZONE.interruptRadius * CAPTURE_ZONE.interruptRadius) {
                                interrupted = true;
                                break;
                            }
                        }

                        if (interrupted) {
                            // Interrupt the channel — reset progress
                            if (carrier.isChanneling && carrier.captureProgress > 0) {
                                this._pushChat(inst, 'SYSTEM', `❌ ${carrier.name}'s capture INTERRUPTED by enemy presence!`, '#ff6644');
                                this._addRandomChat(inst, BG_CHAT.capInterrupt, 1);
                            }
                            carrier.captureProgress = 0;
                            carrier.isChanneling = false;
                        } else {
                            // Channel the capture
                            carrier.isChanneling = true;
                            carrier.captureProgress += dt;

                            if (carrier.captureProgress >= CAPTURE_ZONE.channelTime) {
                                // ═══ FLAG CAPTURED! ═══
                                inst.score[carrier.faction]++;
                                carrier.flagCaps++;
                                flag.state = 'base';
                                flag.carrier = null;
                                carrier.clearFCState();

                                // Reset all flags to base after a capture (WoW behavior)
                                inst.chatLog.push({
                                    user: 'SYSTEM',
                                    msg: `🏆 ${carrier.name} has CAPTURED the ${FACTIONS[faction].name} flag! Score: ${FACTIONS.voidborne.icon} ${inst.score.voidborne} - ${inst.score.ironcrest} ${FACTIONS.ironcrest.icon}`,
                                    time: inst.totalTime,
                                    color: '#ffdd44'
                                });

                                const isPlayerTeam = carrier.faction === inst.playerFaction;
                                this._addRandomChat(inst, isPlayerTeam ? BG_CHAT.flagCap : BG_CHAT.enemyCap, 1);

                                // Party reacts to flag caps
                                if (isPlayerTeam) {
                                    this._addPartyChat(inst, 'flagCap');
                                } else {
                                    this._addPartyChat(inst, 'flagLoss');
                                }
                            }
                        }
                    } else {
                        // Not in cap zone — reset channel
                        carrier.captureProgress = 0;
                        carrier.isChanneling = false;
                    }
                }
            }
        }
    }

    // ── RESPAWN WAVE ─────────────────────────────────────────────────
    _processRespawnWave(inst) {
        for (const c of inst.allCombatants) {
            if (!c.alive) {
                // Respawn any dead combatant on wave — regardless of timer
                // (wave fires every respawnWave seconds, that IS the timer)
                c.alive = true;
                c.hp = c.maxHp;
                c.respawnTimer = 0;
                c.clearFCState();
                // Reset all CC and ability state
                c.rootedTimer = 0;
                c.slowedTimer = 0;
                c.slowAmount = 0;
                c.isCharging = false;
                c.isRetreating = false;
                c.sprintTimer = 0;
                c.inCombatWith = null;
                const base = FACTIONS[c.faction].basePos;
                c.x = base.x + (Math.random() - 0.5) * 6;
                c.z = base.z + (Math.random() - 0.5) * 6;
                c.targetX = c.x;
                c.targetZ = c.z;
                c.attackCooldown = 0;
            }
        }
    }

    // ── END MATCH ────────────────────────────────────────────────────
    _endMatch(inst, winnerFaction) {
        inst.state = 'complete';
        inst.winner = winnerFaction;

        const playerWon = winnerFaction === inst.playerFaction;
        const rewardSet = playerWon ? inst.def.rewards.win : inst.def.rewards.loss;

        // Apply rewards
        gameState.addXp(rewardSet.xp);
        gameState.addGold(rewardSet.gold);
        gameState.addKarma(rewardSet.karma);

        // ── Victory Points — PvP-exclusive currency ──
        const baseVP = playerWon ? VP_REWARDS.bgWin : VP_REWARDS.bgLoss;
        let vpFromMatch = baseVP;

        // VP from kills/caps
        const playerTeam = inst.getTeam(inst.playerFaction);
        let totalKills = 0, totalDeaths = 0;
        for (const c of playerTeam) {
            totalKills += c.kills;
            totalDeaths += c.deaths;
            vpFromMatch += c.kills * VP_REWARDS.perKill;
            vpFromMatch += c.flagCaps * VP_REWARDS.perFlagCap;
        }

        // Award VP through the vendor (applies VP boost)
        const actualVP = pvpVendor.addVP(vpFromMatch);

        // Update stats
        if (!this.stats[inst.def.id]) {
            this.stats[inst.def.id] = { wins: 0, losses: 0, totalKills: 0, totalDeaths: 0, bestTime: Infinity, totalVP: 0 };
        }
        const s = this.stats[inst.def.id];
        if (playerWon) s.wins++; else s.losses++;
        s.totalKills += totalKills;
        s.totalDeaths += totalDeaths;
        s.totalVP = (s.totalVP || 0) + actualVP;
        if (inst.matchTimer < s.bestTime) s.bestTime = inst.matchTimer;
        this.totalMatches++;

        const winIcon = playerWon ? '🏆 VICTORY' : '💀 DEFEAT';
        this._pushChat(inst, 'SYSTEM', `${winIcon}! ${FACTIONS[winnerFaction].name} wins ${inst.score.voidborne}-${inst.score.ironcrest}!`, playerWon ? '#ffdd44' : '#ff4444');
        this._pushChat(inst, 'SYSTEM', `Rewards: ${rewardSet.xp.toLocaleString()} XP, ${rewardSet.gold.toLocaleString()} Gold, ${actualVP} VP`, '#88ff88');

        this._addRandomChat(inst, playerWon ? BG_CHAT.victory : BG_CHAT.defeat, 3);
        // Post-match salt/celebration — someone always has something extra to say
        if (Math.random() < 0.5) {
            this._addRandomChat(inst, playerWon ? BG_CHAT.troll : BG_CHAT.passive, 1);
        }

        // Party members react to the outcome
        this._addPartyChat(inst, playerWon ? 'victory' : 'defeat');
        // Second party member might also chime in
        if (Math.random() < 0.4) {
            this._addPartyChat(inst, playerWon ? 'victory' : 'defeat');
        }

        gameState.addGameLog(`⚔️ Battleground ${playerWon ? 'VICTORY' : 'DEFEAT'}: ${FACTIONS[winnerFaction].name} wins! +${actualVP} VP`);
        gameState.addChatMessage('Game', 'System', `⚔️ ${inst.def.name} ${playerWon ? 'won' : 'lost'} — ${inst.score.voidborne}:${inst.score.ironcrest}`);
    }

    // ── COMPLETE STATE — wait for user to leave via summary screen ──────────
    _updateComplete(inst, dt) {
        // Track REAL time spent in complete state (not game-speed-scaled)
        if (!inst._completeTimer) inst._completeTimer = 0;
        const realDt = dt / Math.max(1, gameState.gameSpeed || 1);
        inst._completeTimer += realDt;

        // Auto-leave after 120 real seconds as a fallback if they go AFK
        if (inst._completeTimer >= 120) {
            this.leaveBG();
        }
    }

    // ── CHAT HELPER ──────────────────────────────────────────────────
    _pushChat(inst, user, msg, color) {
        inst.chatLog.push({ user, msg, time: inst.totalTime, color });
        gameState.addChatMessage('BG', user, msg, color);
    }

    _addRandomChat(inst, pool, count) {
        const allC = inst.allCombatants.filter(c => c.alive);
        if (allC.length === 0) return;
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            const speaker = allC[Math.floor(Math.random() * allC.length)];
            const fColor = FACTIONS[speaker.faction].color;
            this._pushChat(inst, speaker.name, shuffled[i], fColor);
        }
    }

    /**
     * Add a chat line spoken by a random alive party member.
     * Falls back to general party pool if no class-specific pool applies.
     * @param {object} inst - BG instance
     * @param {string} category - 'general'|'kill'|'death'|'flagCap'|'flagLoss'|'victory'|'defeat'|'classRole'
     * @param {object} [specificSpeaker] - Force a specific combatant to speak (e.g. on death)
     */
    _addPartyChat(inst, category, specificSpeaker) {
        const partyAlive = inst.teamA.filter(c => c.isPartyMember && c.alive);
        const speaker = specificSpeaker || (partyAlive.length > 0 ? partyAlive[Math.floor(Math.random() * partyAlive.length)] : null);
        if (!speaker) return;

        let pool;
        switch (category) {
            case 'kill':     pool = BG_CHAT.partyKill; break;
            case 'death':    pool = BG_CHAT.partyDeath; break;
            case 'flagCap':  pool = BG_CHAT.partyFlagCap; break;
            case 'flagLoss': pool = BG_CHAT.partyFlagLoss; break;
            case 'victory':  pool = BG_CHAT.partyVictory; break;
            case 'defeat':   pool = BG_CHAT.partyDefeat; break;
            case 'classRole': {
                // Pick class-specific pool based on speaker's class
                const classMap = {
                    warrior: BG_CHAT.partyWarrior,
                    mage: BG_CHAT.partyMage,
                    ranger: BG_CHAT.partyRanger,
                    cleric: BG_CHAT.partyCleric,
                };
                pool = classMap[speaker.classId] || BG_CHAT.partyGeneral;
                break;
            }
            default: pool = BG_CHAT.partyGeneral;
        }

        const msg = pool[Math.floor(Math.random() * pool.length)];
        this._pushChat(inst, `★ ${speaker.name}`, msg, '#55ccff');
    }

    /**
     * Add a chat line spoken by the companion pet.
     * @param {object} inst - BG instance
     * @param {string} category - 'combat'|'kill'|'death'
     */
    _addCompanionChat(inst, category) {
        const companion = inst.teamA.find(c => c.isCompanion);
        if (!companion) return;
        // For death lines the companion doesn't need to be alive
        if (category !== 'death' && !companion.alive) return;

        let pool;
        switch (category) {
            case 'kill':  pool = BG_CHAT.companionKill; break;
            case 'death': pool = BG_CHAT.companionDeath; break;
            default:      pool = BG_CHAT.companionCombat;
        }

        const msg = pool[Math.floor(Math.random() * pool.length)];
        this._pushChat(inst, `🐾 ${companion.name}`, msg, '#66ddaa');
    }

    // ── SERIALIZATION ────────────────────────────────────────────────
    serialize() {
        return {
            unlocked: this.unlocked,
            stats: this.stats,
            totalMatches: this.totalMatches,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.unlocked = data.unlocked || false;
        this.stats = data.stats || {};
        this.totalMatches = data.totalMatches || 0;
        // Migration: clean up legacy honor fields from old saves
        for (const key in this.stats) {
            if (this.stats[key].totalHonor !== undefined) {
                delete this.stats[key].totalHonor;
            }
        }
    }
}

export const battlegroundSystem = new BattlegroundSystemManager();
