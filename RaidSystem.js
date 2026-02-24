// ══════════════════════════════════════════════════════════════════════
// RAID SYSTEM — 10-Player Instanced Group Content
// Unlocked when Crimson Reach zone becomes accessible.
// WoW-style raids: queue → matchmake → enter instance → trash → bosses → loot
// First raid: The Hivespire Sanctum — Bio-Mechanical Cathedral of the Overmind
// Inspired by Blackwing Lair × Ahn'Qiraj: alien hive architecture,
// psionic horrors, crystalline constructs, chitin-armored war beasts,
// and a colossal hive brain final boss.
// ══════════════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { raidVendor, RAID_GEAR } from './RaidVendor.js';
import { partySystem } from './PartySystem.js';
import { audioManager } from './AudioManager.js';
import { soulForge } from './SoulForge.js';

// ── Gear lookup cache for O(1) access during combat ─────────────────
const RAID_GEAR_CACHE = new Map();
for (const g of RAID_GEAR) RAID_GEAR_CACHE.set(g.id, g);

// ── CLASS DISPLAY DATA ──────────────────────────────────────────────
const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric'];
const CLASS_DISPLAY = {
    warrior: { name: 'Aetherblade', color: '#4488cc', icon: '⚔️', role: 'Tank' },
    mage:    { name: 'Voidweaver',  color: '#aa66ff', icon: '🔮', role: 'DPS' },
    ranger:  { name: 'Thornwarden', color: '#66bb44', icon: '🏹', role: 'DPS' },
    cleric:  { name: 'Dawnkeeper',  color: '#ffcc44', icon: '✨', role: 'Healer' },
};

// ── NPC NAME POOLS (expanded for 10-man raids) ─────────────────────
const FIRST_NAMES = [
    'Kael', 'Lyra', 'Theron', 'Zara', 'Brynn', 'Dax', 'Elara', 'Finn',
    'Gwyn', 'Haze', 'Iris', 'Jett', 'Kira', 'Lux', 'Mira', 'Nyx',
    'Orion', 'Pax', 'Quinn', 'Riven', 'Sable', 'Talon', 'Uma', 'Vex',
    'Wren', 'Xara', 'Yuki', 'Zephyr', 'Ash', 'Blaze', 'Cass', 'Drake',
    'Echo', 'Frost', 'Gale', 'Haven', 'Ivy', 'Jade', 'Knox', 'Luna',
    'Kai', 'Nyla', 'Rex', 'Suki', 'Vale', 'Bex', 'Rune', 'Storm',
    'Alder', 'Crow', 'Dusk', 'Ember', 'Flint', 'Hark', 'Mace', 'Onyx',
    'Pike', 'Sage', 'Thorn', 'Wolf', 'Zane', 'Fern', 'Slate', 'Vesper',
];
const SUFFIXES = ['', '_xX', '42', 'HD', '_GG', '99', 'TV', 'Pro', 'Jr', 'Arc', '', '', '', '', '', 'RL', '_MVP', ''];

// ── RAID CHAT MESSAGES ──────────────────────────────────────────────
const RAID_CHAT_PHASES = {
    queue: [
        { user: 'SYSTEM', msg: '⏳ Searching for raid group members...' },
        { user: 'SYSTEM', msg: '🔍 Scanning the Raid Finder queue...' },
        { user: 'SYSTEM', msg: '📡 Matching compatible raiders...' },
    ],
    entering: [
        { from: 'dps1', msg: 'LFR vibes but lets get it 💪' },
        { from: 'tank1', msg: 'Main tank here. Everyone know the fights?' },
        { from: 'healer1', msg: 'two healers should be enough right?' },
        { from: 'dps3', msg: 'first time raiding lol hope I dont die' },
        { from: 'dps2', msg: 'this place is HUGE' },
        { from: 'tank1', msg: 'ok listen up — assist on skull, dont break CC' },
        { from: 'healer2', msg: 'ill focus tanks, other healer cover raid' },
        { from: 'dps4', msg: 'just point me at the bad guys' },
        { from: 'dps1', msg: 'the hive walls are breathing... 😨' },
        { from: 'dps5', msg: 'my gear is ready, parse time' },
    ],
    midRun: [
        { from: 'dps1', msg: 'pulling big numbers here 📊' },
        { from: 'healer1', msg: 'stop standing in the green stuff!!!' },
        { from: 'tank1', msg: 'holding aggro on both, burn the right one first' },
        { from: 'dps2', msg: 'these bugs are NASTY' },
        { from: 'dps3', msg: 'interrupt the caster! its casting!' },
        { from: 'healer2', msg: 'big heal on tank GO' },
        { from: 'tank1', msg: 'taunt swap after 3 stacks' },
        { from: 'dps4', msg: 'watch for the adds spawning from the walls' },
        { from: 'dps1', msg: 'nice cleave dmg 🔥' },
        { from: 'healer1', msg: 'who keeps pulling extra packs' },
        { from: 'dps5', msg: 'the crystals are pulsing... get away from them' },
        { from: 'dps2', msg: 'these chitin warriors hit different' },
        { from: 'tank1', msg: 'stack up for AoE heals' },
        { from: 'dps3', msg: 'loot the sparkly thing!' },
        { from: 'healer2', msg: 'mana break pls 🙏' },
        { from: 'dps4', msg: 'I can hear something skittering in the walls...' },
        { from: 'dps1', msg: 'soak the orbs or we wipe' },
        { from: 'tank1', msg: 'off-tank grab the adds' },
        { from: 'healer1', msg: 'raid-wide dmg incoming, cooldowns NOW' },
        { from: 'dps5', msg: 'the psionic waves are hurting my brain fr' },
    ],
    bossPhase: [
        { from: 'tank1', msg: 'BOSS!! Everyone to positions!' },
        { from: 'healer1', msg: 'save your big cooldowns for phase 2' },
        { from: 'dps1', msg: 'BLOODLUST ON PULL' },
        { from: 'dps2', msg: 'dont stand in the circles, dodge the beams' },
        { from: 'tank1', msg: 'main tank pulling in 3... 2... 1...' },
        { from: 'healer2', msg: 'this boss hits like a TRUCK' },
        { from: 'dps3', msg: 'kill the adds ASAP or we wipe' },
        { from: 'dps4', msg: 'spread for the AoE, stack for the debuff' },
        { from: 'tank1', msg: 'TAUNT SWAP! Off-tank take over!' },
        { from: 'dps5', msg: 'DPS CHECK incoming, burn hard!' },
    ],
    victory: [
        { from: 'dps1', msg: 'LETS GOOOOOO 🏆🏆🏆' },
        { from: 'healer1', msg: 'GG!! that was intense' },
        { from: 'tank1', msg: 'CLEAN KILL! great job everyone' },
        { from: 'dps2', msg: 'did anyone screenshot the kill??' },
        { from: 'dps3', msg: 'first raid clear LETS GO' },
        { from: 'healer2', msg: 'my hands are shaking lol' },
        { from: 'dps4', msg: 'LOOT LOOT LOOT 💰' },
        { from: 'dps5', msg: 'server first??? 😂' },
    ],
    wipe: [
        { from: 'dps2', msg: 'thats a wipe' },
        { from: 'healer1', msg: 'ran out of mana during the add phase' },
        { from: 'tank1', msg: 'my bad, missed the taunt swap' },
        { from: 'dps1', msg: 'bro he one-shot me during enrage' },
        { from: 'healer2', msg: 'too much raid damage, cant keep up' },
        { from: 'dps3', msg: '☠️ well that happened' },
        { from: 'dps4', msg: 'who pulled the boss early??' },
    ],
};

// ══════════════════════════════════════════════════════════════════════
// RAID DEFINITIONS — The Hivespire Sanctum
// ══════════════════════════════════════════════════════════════════════

export const RAID_DEFS = [
    {
        id: 'hivespire_sanctum',
        name: 'The Hivespire Sanctum',
        subtitle: 'Bio-Mechanical Cathedral of the Overmind',
        iconKey: 'raidSanctum',
        icon: '🏛️',
        color: '#cc3344',
        unlockZone: 'crimson_reach',
        levelRange: [55, 60],
        description: 'Deep beneath the Crimson Reach, the hive civilization has built a colossal bio-mechanical cathedral around a pulsing crystalline brain — the Overmind\'s true form. Chitin corridors wind through chambers of alien horror where psionic constructs, war-bred abominations, and crystal-fused sentinels guard the path to the hive\'s beating heart. Only a full raid party of 10 can breach the Sanctum. This is endgame. This is where legends are forged.',
        loadingImage: 'https://rosebud.ai/assets/loading-raid-hivespire.webp?DqEQ',
        colors: {
            fogColor: 0x0a0205,
            ambientLight: 0x3a1525,
            directionalLight: 0xcc4466,
            godRayColor: 0x44ccaa,
            groundTint: 0x1a0508,
            sceneBg: 0x080204,
            fogDensity: 0.010,
            particleColor: 0x44ccaa,
            lavaColor: 0x33ccaa,
            emissiveAccent: 0xcc3344,
        },
        // ── Raid encounters — 12 encounters with 4 bosses ──
        // trash → trash → BOSS 1 → trash → trash → BOSS 2 → trash → trash → BOSS 3 → trash → trash → FINAL BOSS
        encounters: [
            {
                id: 'enc_chitin_breach',
                type: 'trash',
                name: 'The Chitin Breach',
                description: 'The outer walls of the Sanctum are breached. Hive Sentries — towering chitin-armored warriors — guard the first corridor alongside Spore Drifters that release clouds of psychoactive gas.',
                roomDesc: 'A massive breach in the hive wall. Bioluminescent veins pulse along the corridors. The air is thick with alien spores.',
                mobs: [
                    { name: 'Hive Sentry', hp: 1800, dps: 45, color: 0x882222, scale: 1.4, count: 4, mobShape: 'hiveSentry' },
                    { name: 'Spore Drifter', hp: 900, dps: 60, color: 0x44aa88, scale: 0.9, count: 3, mobShape: 'sporeDrifter' },
                ],
            },
            {
                id: 'enc_crystalline_corridor',
                type: 'trash',
                name: 'The Crystalline Corridor',
                description: 'Massive teal crystals line the walls, pulsing with psionic energy. Crystal Resonators amplify the Overmind\'s will, while Chitin Stalkers ambush from hidden alcoves.',
                roomDesc: 'A long corridor of living crystal. Each step sends ripples of bioluminescent light cascading along the walls.',
                mobs: [
                    { name: 'Crystal Resonator', hp: 2200, dps: 55, color: 0x33bbaa, scale: 1.2, count: 3, mobShape: 'crystalResonator' },
                    { name: 'Chitin Stalker', hp: 1200, dps: 70, color: 0x661111, scale: 1.0, count: 4, mobShape: 'chitinStalker' },
                ],
            },
            {
                id: 'enc_boss1_broodmother',
                type: 'boss',
                name: 'Krix\'ala, Broodmother of Chitin',
                description: 'The first guardian of the Sanctum — a massive insectoid broodmother who continuously births war-larvae from her bloated abdomen. Her chitin armor is nearly impenetrable. The raid must destroy her egg sacs to stop the endless reinforcements while burning her down between broods.',
                roomDesc: 'A vast breeding chamber. The floor writhes with larvae. Egg sacs hang from the ceiling, pulsing with unborn horrors.',
                mobs: [
                    { name: 'Krix\'ala, Broodmother', hp: 65000, dps: 120, color: 0xcc2233, scale: 3.2, count: 1, isBoss: true, mobShape: 'broodmother' },
                    { name: 'War Larva', hp: 600, dps: 35, color: 0x883322, scale: 0.5, count: 4, mobShape: 'neuralParasite' },
                ],
                phases: [
                    { hpThreshold: 0.75, name: 'Brood Swarm', description: 'Krix\'ala spawns a wave of war-larvae! AoE them down quickly!', dialogue: 'Feast, my children! Feast upon their flesh!' },
                    { hpThreshold: 0.50, name: 'Chitin Hardening', description: 'Her armor thickens! Focus the exposed weak point on her abdomen!', dialogue: 'My shell is iron, my will is absolute!' },
                    { hpThreshold: 0.25, name: 'Psionic Screech', description: 'The Broodmother screeches — raid-wide damage and fear! Use defensives!', dialogue: 'SCREEEEEE! Feel the hive\'s agony!' },
                    { hpThreshold: 0.10, name: 'Final Brood', description: 'She goes berserk, birthing elites! BURN HER NOW!', dialogue: 'If I fall, you fall with me!' },
                ],
                loot: { gold: 3500, xp: 12000, karma: 80, soulEssence: 800, raidPoints: 25 },
            },
            {
                id: 'enc_neural_gallery',
                type: 'trash',
                name: 'The Neural Gallery',
                description: 'A vast open chamber where floating psionic tendrils connect crystal nodes. Thoughtweavers — ethereal psionic constructs — assemble new war-forms from raw chitin while Neural Parasites seek to mind-control the raiders.',
                roomDesc: 'Floating psionic tendrils crackle with teal energy. The air hums with the Overmind\'s thoughts.',
                mobs: [
                    { name: 'Thoughtweaver', hp: 2800, dps: 80, color: 0x5555cc, scale: 1.3, count: 3, mobShape: 'thoughtweaver' },
                    { name: 'Neural Parasite', hp: 1000, dps: 50, color: 0x44aa88, scale: 0.7, count: 4, mobShape: 'neuralParasite' },
                ],
            },
            {
                id: 'enc_forge_pits',
                type: 'trash',
                name: 'The Forge Pits',
                description: 'Bio-mechanical foundries where the hive melts crimson ore and chitin into war-constructs. Forge Assemblers weld living armor to themselves while Molten Drones spray superheated ichor.',
                roomDesc: 'Rivers of molten bio-metal flow through channels. The heat is unbearable. War-constructs stand half-assembled on production lines.',
                mobs: [
                    { name: 'Forge Assembler', hp: 3200, dps: 65, color: 0xcc6622, scale: 1.5, count: 2, mobShape: 'forgeAssembler' },
                    { name: 'Molten Drone', hp: 1500, dps: 85, color: 0xee5522, scale: 1.0, count: 4, mobShape: 'moltenDrone' },
                ],
            },
            {
                id: 'enc_boss2_crystalwarden',
                type: 'boss',
                name: 'Thal\'zyx, the Crystalwarden',
                description: 'A colossal construct of living crystal and chitin, created by the Overmind to guard the inner sanctum. Thal\'zyx absorbs psionic energy from the crystal pillars around the room, becoming more powerful over time. The raid must destroy the pillars to weaken him, but each destroyed pillar releases a devastating shockwave.',
                roomDesc: 'A circular arena surrounded by six massive crystal pillars. Thal\'zyx stands at the center, glowing with absorbed energy.',
                mobs: [
                    { name: 'Thal\'zyx, Crystalwarden', hp: 95000, dps: 150, color: 0x33ccaa, scale: 3.5, count: 1, isBoss: true, mobShape: 'crystalwardenBoss' },
                    { name: 'Crystal Pillar', hp: 4000, dps: 0, color: 0x55ddcc, scale: 2.0, count: 3, mobShape: 'crystalResonator' },
                ],
                phases: [
                    { hpThreshold: 0.80, name: 'Crystal Resonance', description: 'The pillars charge Thal\'zyx! Destroy a pillar to weaken him!', dialogue: 'The crystals sing of your demise.' },
                    { hpThreshold: 0.55, name: 'Psionic Overload', description: 'Thal\'zyx channels a massive AoE! Interrupt or spread out!', dialogue: 'OVERFLOWING. PSIONIC. DESTRUCTION.' },
                    { hpThreshold: 0.30, name: 'Crystal Storm', description: 'Crystal shards rain from above! Dodge the impact zones!', dialogue: 'The sky itself shall fracture.' },
                    { hpThreshold: 0.10, name: 'Final Absorption', description: 'He absorbs ALL remaining pillars! Maximum DPS before he overwhelms you!', dialogue: 'I AM THE CONDUIT. I AM ETERNAL.' },
                ],
                loot: { gold: 5000, xp: 18000, karma: 120, soulEssence: 1200, raidPoints: 40 },
            },
            {
                id: 'enc_psionic_nexus',
                type: 'trash',
                name: 'The Psionic Nexus',
                description: 'The deeper chambers pulse with raw psionic power. Mindshatter Elites — the Overmind\'s personal guard — patrol alongside Void Lashers that whip corrosive psionic tendrils.',
                roomDesc: 'The walls are translucent, revealing a web of psionic energy flowing toward the Sanctum\'s core. Reality feels thin here.',
                mobs: [
                    { name: 'Mindshatter Elite', hp: 3800, dps: 95, color: 0x7733cc, scale: 1.4, count: 3, mobShape: 'mindshatterElite' },
                    { name: 'Void Lasher', hp: 1800, dps: 110, color: 0x553388, scale: 1.1, count: 3, mobShape: 'voidLasher' },
                ],
            },
            {
                id: 'enc_queens_antechamber',
                type: 'trash',
                name: 'The Queen\'s Antechamber',
                description: 'Before the throne room, the Hive Queen\'s honor guard stands ready. Royal Sentinels in ornate chitin-gold armor wield psionic halberds, while Hive Priests channel protective wards.',
                roomDesc: 'An ornate chamber of polished chitin inlaid with crimson crystal. Royal banners hang from organic pillars.',
                mobs: [
                    { name: 'Royal Sentinel', hp: 4500, dps: 100, color: 0xcc8822, scale: 1.6, count: 3, mobShape: 'hiveSentry' },
                    { name: 'Hive Priest', hp: 2200, dps: 60, color: 0xddaa44, scale: 1.1, count: 2, mobShape: 'hivePriest' },
                ],
            },
            {
                id: 'enc_boss3_queen',
                type: 'boss',
                name: 'Queen Vyrenthis, the Psionic Matriarch',
                description: 'The Hive Queen — second only to the Overmind itself. Vyrenthis commands the entire military caste through psionic dominion. She alternates between devastating melee attacks with her razor-sharp limbs and channeling mass mind-control on random raiders. The raid must break MC\'d allies free while managing her devastating ground-slam AoE pattern.',
                roomDesc: 'A massive throne room of crimson chitin and gold. The Queen perches atop a living throne that pulses with psionic energy.',
                mobs: [
                    { name: 'Queen Vyrenthis', hp: 130000, dps: 180, color: 0xdd3355, scale: 3.8, count: 1, isBoss: true, mobShape: 'queenBoss' },
                    { name: 'Royal Guard', hp: 3000, dps: 65, color: 0xcc8822, scale: 1.3, count: 2, mobShape: 'mindshatterElite' },
                ],
                phases: [
                    { hpThreshold: 0.80, name: 'Mind Domination', description: 'Vyrenthis mind-controls 2 raiders! Break them free quickly!', dialogue: 'Your will is no longer your own. Obey!' },
                    { hpThreshold: 0.60, name: 'Royal Summons', description: 'The Queen calls her Royal Guard! Off-tank pick them up!', dialogue: 'Guardians! Purge these intruders from my presence!' },
                    { hpThreshold: 0.40, name: 'Psionic Tempest', description: 'She channels a devastating psionic storm! Stack for heals!', dialogue: 'Witness the true power of the Matriarch!' },
                    { hpThreshold: 0.20, name: 'Queen\'s Fury', description: 'Vyrenthis goes berserk — all damage doubled! Defensive cooldowns NOW!', dialogue: 'I will tear the thoughts from your very skulls!' },
                    { hpThreshold: 0.05, name: 'Final Stand', description: 'She calls the Overmind for aid! FINISH HER before reinforcements arrive!', dialogue: 'Master... grant me... your strength...' },
                ],
                loot: { gold: 8000, xp: 28000, karma: 200, soulEssence: 2000, raidPoints: 60 },
            },
            {
                id: 'enc_overmind_conduit',
                type: 'trash',
                name: 'The Overmind\'s Conduit',
                description: 'The final corridor leads to the Sanctum\'s heart. Psionic energy is so concentrated that the walls themselves attack. Conduit Horrors — manifestations of raw hive consciousness — materialize from the energy streams.',
                roomDesc: 'A tunnel of pure psionic energy. The Overmind\'s heartbeat echoes through the floor. Reality warps around every step.',
                mobs: [
                    { name: 'Conduit Horror', hp: 5000, dps: 120, color: 0x9944cc, scale: 1.8, count: 3, mobShape: 'conduitHorror' },
                    { name: 'Psionic Fragment', hp: 2000, dps: 80, color: 0x55ccbb, scale: 0.8, count: 4, mobShape: 'sporeDrifter' },
                ],
            },
            {
                id: 'enc_sanctum_core',
                type: 'trash',
                name: 'The Sanctum Core',
                description: 'The inner sanctum — a vast spherical chamber where the Overmind\'s crystalline brain floats. Its final defenders are the Core Wardens: massive chitin-crystal hybrids fused directly to the chamber walls.',
                roomDesc: 'A colossal spherical chamber. At its center floats a pulsing crystalline brain the size of a house, wreathed in teal fire.',
                mobs: [
                    { name: 'Core Warden', hp: 6000, dps: 130, color: 0x44ddbb, scale: 2.2, count: 2, mobShape: 'coreWarden' },
                    { name: 'Sanctum Drone', hp: 2500, dps: 90, color: 0x773322, scale: 1.0, count: 4, mobShape: 'moltenDrone' },
                ],
            },
            {
                id: 'enc_boss4_overmind',
                type: 'boss',
                name: 'The Crimson Overmind',
                description: 'The true form of the hive\'s consciousness — a colossal crystalline brain suspended in a web of psionic energy. The Overmind fights through waves of psychic assaults, summoning manifestations of its will, warping reality around the raiders, and in its final phase, attempting to collapse the entire Sanctum on top of the raid. This is the ultimate test. Every cooldown, every consumable, every ounce of skill is needed to destroy the brain before it destroys everything.',
                roomDesc: 'The heart of the Sanctum. The crystalline brain pulses with blinding teal light. The floor is transparent — beneath it, an infinite psionic abyss.',
                mobs: [
                    { name: 'The Crimson Overmind', hp: 250000, dps: 220, color: 0x33eedd, scale: 4.5, count: 1, isBoss: true, mobShape: 'overmindBoss' },
                    { name: 'Psionic Manifestation', hp: 4000, dps: 90, color: 0x7744cc, scale: 1.5, count: 2, mobShape: 'conduitHorror' },
                ],
                phases: [
                    { hpThreshold: 0.85, name: 'Neural Cascade', description: 'The Overmind attacks all minds simultaneously! Healers compensate!', dialogue: 'YOUR THOUGHTS ARE BUT STATIC IN THE VOID.' },
                    { hpThreshold: 0.65, name: 'Reality Fracture', description: 'The chamber splits — dodge the fracture lines or take massive damage!', dialogue: 'SPACE. TIME. ALL SHALL BEND TO THE HIVEMIND.' },
                    { hpThreshold: 0.45, name: 'Hive Awakening', description: 'Every fallen creature in the Sanctum stirs! Waves of ghostly adds assault the raid!', dialogue: 'DEATH IS NO ESCAPE FROM MY DOMINION.' },
                    { hpThreshold: 0.25, name: 'Psionic Singularity', description: 'The Overmind implodes inward — all raiders pulled to center! Escape the gravity well!', dialogue: 'COLLAPSE. CONSUME. BECOME ONE WITH THE OVERMIND.' },
                    { hpThreshold: 0.10, name: 'Sanctum Collapse', description: 'THE SANCTUM IS COLLAPSING! Maximum DPS — you have 30 seconds before total annihilation!', dialogue: 'IF I SHALL CEASE TO BE... THEN ALL SHALL END WITH ME!' },
                ],
                loot: { gold: 15000, xp: 50000, karma: 400, soulEssence: 4000, raidPoints: 100 },
            },
        ],
        // Completion rewards (one-time + repeatable)
        firstClearRewards: { gold: 25000, xp: 80000, karma: 600, soulEssence: 8000, raidPoints: 200 },
        repeatRewards: { gold: 5000, xp: 15000, karma: 100, soulEssence: 1500, raidPoints: 75 },
        estimatedTime: '8-12 min',
    },
];

// ══════════════════════════════════════════════════════════════════════
// RAID INSTANCE STATE
// ══════════════════════════════════════════════════════════════════════

class RaidInstance {
    constructor(raidDef) {
        this.def = raidDef;
        this.state = 'queue';       // queue → forming → entering → combat → complete | failed
        this.encounterIndex = 0;
        this.timer = 0;
        this.combatTimer = 0;
        this.totalTime = 0;
        this.phaseTimer = 0;
        this.hardMode = false; // Enabled if certain conditions are met on pull

        // Current encounter combat state
        this.currentMobs = [];
        this.partyHp = 100;
        this.partyMaxHp = 100;

        // Boss phase tracking
        this.currentPhaseIndex = -1;
        this.phaseAnnounced = {};
        this._lastPhaseAnnounced = null;

        // Raid party NPCs (9 NPCs for 10-man)
        this.partyMembers = [];

        // Chat log
        this.chatLog = [];
        this.chatTimer = 0;

        // Loot collected
        this.lootCollected = { gold: 0, xp: 0, karma: 0, soulEssence: 0, raidPoints: 0 };

        // ── Combat Stats Tracking ─────────────────────────────────
        this.combatStats = {
            damage: new Map(),  // memberId (or 'player') -> amount
            healing: new Map()  // memberId (or 'player') -> amount
        };
        // Initialize with player
        this.combatStats.damage.set('player', 0);
        this.combatStats.healing.set('player', 0);

        // Did we already get first-clear?
        this.isFirstClear = false;

        // Encounter transition timer
        this._encounterTransitionTimer = 0;
        this._awaitingNextEncounter = false;
        this._lastAnnounced = 0;

        // ── Vendor Effect State ──────────────────────────────────
        // Bloodlust: temporary DPS buff at start of boss encounters
        this.bloodlustTimer = 0;
        this.bloodlustBonus = 0;

        // Feast: max HP boost applied before boss encounters
        this._feastApplied = {};   // encounterIndex → bool (prevent re-apply)

        // Enrage timer: after a long combat, mobs enrage for increasing damage
        this._enrageTimer = 0;
        this._enraged = false;

        // NPC individual HP tracking (more granular party health simulation)
        this._npcHealCooldowns = {}; // npcId → cooldown until next self-heal

        // Mechanic tracking
        this.mechanicTimer = 0;

        // ── Death Analysis Log ────────────────────────────────────
        this.deathLog = []; // { name, role, time, encounterName, cause }

        // ── Failure Tracking ──────────────────────────────────────
        this.failureRecap = {
            cause: null, // 'mechanic', 'dps', 'enrage', 'healing'
            details: '',
            majorFails: [] // { type, name, player, time }
        };

        // ── Advanced Mechanics State ──────────────────────────────
        this.activeMechanics = []; // { id, type: 'soak'|'cast', x, z, radius, timer, maxTimer, damage, ... }

        // ── Loot Council State ────────────────────────────────────
        this.lootingState = {
            active: false,
            timer: 0,
            rolls: [], // { name, roll, item }
            items: [], // Potential items dropped
        };

        // ── Raid Markers ──────────────────────────────────────────
        this.markers = {}; // mobId -> type ('skull', 'square', 'cross', 'circle')
    }
}

// ══════════════════════════════════════════════════════════════════════
// RAID SYSTEM MANAGER
// ══════════════════════════════════════════════════════════════════════

class RaidSystemManager {
    constructor() {
        this.unlocked = false;
        this.instance = null;
        this.completedRaids = {};   // { raidId: { clears, bestTime, firstClear } }
        this.cooldownTimer = 0;
        this.totalClears = 0;

        // Callbacks for 3D scene management (set by main.js)
        this._onEnterRaid = null;    // (raidDef) => void
        this._onLeaveRaid = null;    // () => void
        this._onTriggerMechanic = null; // (type, x, z, scale, life, color) => void
        this._sceneEntered = false;  // track whether 3D scene is active
    }

    // ── Raid Markers ──────────────────────────────────────────
    setMarker(mobId, type) {
        if (!this.instance) return;
        if (!type) {
            delete this.instance.markers[mobId];
        } else {
            // Remove this type from any other mob first (unique markers)
            for (const id in this.instance.markers) {
                if (this.instance.markers[id] === type) delete this.instance.markers[id];
            }
            this.instance.markers[mobId] = type;
        }
    }

    // ── Unlock Check ────────────────────────────────────────────────
    isUnlocked() {
        if (this.unlocked) return true;
        if (gameState.canAccessZone('crimson_reach')) {
            this.unlocked = true;
            return true;
        }
        return false;
    }

    // ── Get Available Raids ─────────────────────────────────────────
    getAvailableRaids() {
        return RAID_DEFS.filter(r => {
            return gameState.level >= r.levelRange[0] && gameState.canAccessZone(r.unlockZone);
        });
    }

    // ── Get Raid Stats ──────────────────────────────────────────────
    getRaidStats(raidId) {
        return this.completedRaids[raidId] || { clears: 0, bestTime: Infinity, firstClear: false };
    }

    // ── Can Queue ───────────────────────────────────────────────────
    canQueue(raidId) {
        if (this.instance) return false;
        if (this.cooldownTimer > 0) return false;
        const def = RAID_DEFS.find(r => r.id === raidId);
        if (!def) return false;
        if (gameState.level < def.levelRange[0]) return false;
        return true;
    }

    // ── Queue for Raid ──────────────────────────────────────────────
    queueRaid(raidId) {
        if (!this.canQueue(raidId)) return false;
        const def = RAID_DEFS.find(r => r.id === raidId);
        if (!def) return false;

        const inst = new RaidInstance(def);
        inst.state = 'queue';
        // Increased wait time (10-20 seconds) to feel more like a real raid queue
        inst.timer = 10 + Math.random() * 10; 
        inst.isFirstClear = !this.getRaidStats(raidId).firstClear;

        this._log(inst, 'SYSTEM', `⚔️ You have entered the Raid Finder queue for ${def.name}.`);

        this.instance = inst;
        gameState.addGameLog(`🏛️ Queued for raid: ${def.name}...`);
        gameState.addChatMessage('Game', 'System', `🏛️ ${gameState.playerName} has entered the Raid Finder queue.`);
        return true;
    }

    /** 
     * Unified logging for Raid content.
     * Routes system events to the Raid Log (top left) and banter to Global Chat (bottom left).
     */
    _log(inst, user, msg, color = null) {
        if (user === 'SYSTEM') {
            // SYSTEM messages (Log events: Clears, Phase Alerts, Descriptions) stay in the Raid Log
            inst.chatLog.push({ user, msg, color, time: inst.totalTime });
        } else {
            // Party members (NPC/Player Chat) move to the main chat box (Bottom Left)
            // Use 'Party' channel for raid chat to keep it consistent with dungeon banter
            gameState.addChatMessage('Party', user, msg, color);
        }
    }

    // ── Accept Match Found ───────────────────────────────────────────
    acceptMatch() {
        if (!this.instance || this.instance.state !== 'match_found') return;
        
        const inst = this.instance;
        inst.state = 'forming';
        inst.timer = 0;
        inst.phaseTimer = 0;
        inst._lastAnnounced = 0; // Reset announcement tracker
        // DEFERRED: Generate 10-man raid party only after acceptance
        inst.partyMembers = this._generateRaidParty();
        
        // Initialize stats for party members
        for (const m of inst.partyMembers) {
            inst.combatStats.damage.set(m.id, 0);
            inst.combatStats.healing.set(m.id, 0);
        }
        this._log(inst, 'SYSTEM', '✅ Raid group accepted! Assembling 10-man team...');
    }

    // ── Decline Match Found ──────────────────────────────────────────
    declineMatch() {
        if (!this.instance || this.instance.state !== 'match_found') return;
        this.leaveRaid();
    }

    // ── Generate 10-Man Raid Party ──────────────────────────────────
    _generateRaidParty() {
        const playerClass = gameState.classId;
        const members = [];
        const usedNames = new Set();

        // 1. Start with the player's actual party members
        const currentParty = partySystem.members || [];
        
        // 10-man comp targets: 2 Tanks, 2 Healers, 6 DPS (total 10)
        // We track how many of each role we have so far
        const roleCounts = { Tank: 0, Healer: 0, DPS: 0 };
        
        // Count the player
        const playerRole = playerClass === 'warrior' ? 'Tank' : playerClass === 'cleric' ? 'Healer' : 'DPS';
        roleCounts[playerRole]++;

        // Add actual party members first
        for (const partyMember of currentParty) {
            const role = partyMember.classId === 'warrior' ? 'Tank' : partyMember.classId === 'cleric' ? 'Healer' : 'DPS';
            roleCounts[role]++;
            usedNames.add(partyMember.name);

            members.push({
                id: `party_${partyMember.id}`,
                name: partyMember.name,
                classId: partyMember.classId,
                role: role,
                level: partyMember.level,
                dps: partyMember.getDps(),
                display: CLASS_DISPLAY[partyMember.classId],
                hp: 100,
                maxHp: 100,
                alive: true,
                isFromParty: true, // Marker that this is a player's actual party member
            });
        }

        // 2. Fill the remaining slots to hit exactly 10 members (9 NPCs + player)
        const targetComp = ['Tank', 'Tank', 'Healer', 'Healer', 'DPS', 'DPS', 'DPS', 'DPS', 'DPS', 'DPS'];
        
        // Remove roles already filled by player + party
        let neededRoles = [...targetComp];
        
        // Deduct player's role
        const pIdx = neededRoles.indexOf(playerRole);
        if (pIdx !== -1) neededRoles.splice(pIdx, 1);
        
        // Deduct party member roles
        for (const partyMember of currentParty) {
            const role = partyMember.classId === 'warrior' ? 'Tank' : partyMember.classId === 'cleric' ? 'Healer' : 'DPS';
            const rIdx = neededRoles.indexOf(role);
            if (rIdx !== -1) neededRoles.splice(rIdx, 1);
        }

        // Now generate random NPCs for the remaining roles
        for (const role of neededRoles) {
            let classId;
            if (role === 'Tank') classId = 'warrior';
            else if (role === 'Healer') classId = 'cleric';
            else {
                const dpsClasses = CLASS_IDS.filter(c => c !== 'warrior' && c !== 'cleric');
                classId = dpsClasses[Math.floor(Math.random() * dpsClasses.length)];
            }

            let name;
            let attempts = 0;
            do {
                const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
                const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
                name = first + suffix;
                attempts++;
            } while (usedNames.has(name) && attempts < 50);
            usedNames.add(name);

            const level = Math.max(gameState.level - 2, 55) + Math.floor(Math.random() * 5);
            const isMercenary = Math.random() < 0.15;
            const statMult = isMercenary ? 1.15 : 1.0;
            const baseDps = Math.floor(gameState.getDPS() * (0.55 + Math.random() * 0.5) * statMult);

            members.push({
                id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: isMercenary ? `Elite ${name}` : name,
                classId,
                role,
                level: Math.min(level, CONFIG.MAX_LEVEL),
                dps: baseDps,
                display: CLASS_DISPLAY[classId],
                hp: 100,
                maxHp: 100,
                alive: true,
                isMercenary,
            });
        }

        return members;
    }

    // ── Leave Raid ──────────────────────────────────────────────────
    leaveRaid() {
        if (!this.instance) return;
        this.instance = null;
        this.cooldownTimer = 20; // 20s cooldown (longer than dungeon)

        // Exit 3D raid scene
        if (this._sceneEntered && this._onLeaveRaid) {
            this._onLeaveRaid();
        }
        this._sceneEntered = false;

        gameState.addGameLog('🏛️ Left the raid.');
    }

    // ── Main Update Loop ────────────────────────────────────────────
    update(dt) {
        if (!this.unlocked) return;

        if (this.cooldownTimer > 0) {
            this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
        }

        const inst = this.instance;
        if (!inst) return;

        // Use unscaled delta time for queue logic
        const realDt = dt / (gameState.gameSpeed || 1);
        inst.totalTime += dt;
        inst.chatTimer += dt;

        switch (inst.state) {
            case 'queue':
                this._updateQueue(inst, realDt);
                break;
            case 'match_found':
                this._updateMatchFound(inst, realDt);
                break;
            case 'forming':
                this._updateForming(inst, dt);
                break;
            case 'entering':
                this._updateEntering(inst, dt);
                break;
            case 'combat':
                this._updateCombat(inst, dt);
                break;
            case 'looting':
                this._updateLooting(inst, dt);
                break;
            case 'complete':
            case 'failed':
                break;
        }
    }

    // ── Looting Phase ───────────────────────────────────────────────
    _updateLooting(inst, dt) {
        const ls = inst.lootingState;
        ls.timer += dt;

        // Simulate rolls appearing in chat
        const interval = 0.6;
        const rollsCount = Math.floor(ls.timer / interval);
        const toRoll = Math.min(rollsCount, inst.partyMembers.length + 1); // +1 for player

        if (ls.rolls.length < toRoll) {
            const idx = ls.rolls.length;
            const roller = idx === 0 ? { name: gameState.playerName, classId: gameState.classId, role: (gameState.classId === 'warrior' ? 'Tank' : gameState.classId === 'cleric' ? 'Healer' : 'DPS'), color: '#ffffff', isPlayer: true } : inst.partyMembers[idx - 1];
            
            const item = ls.items[0];
            let roll = Math.floor(Math.random() * 100) + 1;
            
            // ── LOOT COUNCIL DYNAMIC WEIGHTING: MS vs OS logic ──
            // Logic: items have preferred roles. If roller's role matches, it's Main Spec (MS).
            // Main Spec rolls get a +100 base bonus to beat any Off-Spec (OS) rolls.
            const itemRoles = item?.preferredRoles || ['DPS', 'Tank', 'Healer'];
            const isMS = itemRoles.includes(roller.role);
            
            if (isMS) {
                roll += 100; // MS Priority
            }

            ls.rolls.push({ name: roller.name, roll, item: item?.name, isMS });
            
            const specTag = isMS ? '[Main Spec]' : '[Off-Spec]';
            const rollerColor = roller.color || roller.display?.color || '#ffffff';
            this._log(inst, 'SYSTEM', `🎲 ${roller.name} rolled ${roll > 100 ? roll-100 : roll} for [${item?.name || 'Unknown Item'}] ${specTag}`, rollerColor);
        }

        if (ls.timer >= 6.0) {
            ls.active = false;
            inst.state = 'combat'; // Return to combat to handle next transition
            
            // Find winner (highest roll wins, MS always beats OS due to +100 bonus)
            const winner = [...ls.rolls].sort((a, b) => b.roll - a.roll)[0];
            const displayRoll = winner.roll > 100 ? winner.roll - 100 : winner.roll;
            this._log(inst, 'SYSTEM', `🏆 [Loot Council] ${winner.name} won [${ls.items[0]?.name || 'Unknown Item'}] with a ${winner.isMS ? 'Main Spec' : 'Off-Spec'} roll of ${displayRoll}!`, '#ffcc44');

            // If player won, actually add it to inventory? 
            // Currently, raid gear is managed via RaidVendor and Raid Points, but we can simulate the "win" feel.
            if (winner.name === gameState.playerName) {
                gameState.addGameLog(`✨ You won the loot roll: [${ls.items[0]?.name}]!`);
            }

            // Transition to next encounter or complete
            inst.encounterIndex++;
            if (inst.encounterIndex < inst.def.encounters.length) {
                inst._awaitingNextEncounter = true;
                inst._encounterTransitionTimer = 2.0;
            } else {
                this._completeRaid(inst);
            }
        }
    }

    // ── Update Phase Mechanics ──────────────────────────────────────
    _updateMechanics(inst, dt) {
        if (inst.state !== 'combat' || inst._awaitingNextEncounter) return;
        const enc = inst.def.encounters[inst.encounterIndex];
        if (!enc || enc.type !== 'boss') return;

        inst.mechanicTimer += dt;
        const boss = inst.currentMobs.find(m => m.isBoss && m.alive);
        if (!boss) return;

        const centerZ = -inst.encounterIndex * 16;

        // ── Boss 1: Krix'ala ──────────────────────────────────────
        if (enc.id === 'enc_boss1_broodmother') {
            // Bio-Acid Spray (Interruptible Cast)
            if (inst.mechanicTimer > 12.0) {
                inst.mechanicTimer = 0;
                this._startBossCast(inst, boss, 'Bio-Acid Spray', 4.0, 35);
            }
        }

        // ── Boss 2: Thal'zyx ──────────────────────────────────────
        if (enc.id === 'enc_boss2_crystalwarden') {
            // Phase 2: Psionic Overload (Now an Interruptible Cast)
            if (inst.currentPhaseIndex === 1 && inst.mechanicTimer > 8.0) {
                inst.mechanicTimer = 0;
                this._startBossCast(inst, boss, 'Psionic Overload', 5.0, 50);
            }
            // Phase 3: Crystal Storm (Falling shards - ground circles)
            if (inst.currentPhaseIndex === 2 && inst.mechanicTimer > 2.0) {
                inst.mechanicTimer = 0;
                const rx = (Math.random() - 0.5) * 12;
                const rz = centerZ + (Math.random() - 0.5) * 12;
                this._triggerGroundEffect(inst, 'circle', rx, rz, 3.0, 3.0, 0x33ffee);
            }
        }

        // ── Boss 3: Queen Vyrenthis ───────────────────────────────
        if (enc.id === 'enc_boss3_queen') {
            // Royal Decree (Soak Mechanic)
            if (inst.mechanicTimer > 15.0) {
                inst.mechanicTimer = 0;
                this._triggerSoak(inst, 0, centerZ, 5.0, 6.0, 40, 0xffcc44);
            }
            // Psionic Tether (NEW Mechanic)
            if (inst.mechanicTimer > 7.0 && inst.mechanicTimer < 7.5 && Math.random() < 0.5) {
                this._triggerTether(inst, 10.0, 30); // 10s to break, 30 damage if fail
            }
            // Mind Blast (Interruptible Cast)
            if (inst.mechanicTimer > 9.0 && inst.mechanicTimer < 9.5) {
                this._startBossCast(inst, boss, 'Mind Blast', 3.0, 30);
            }
        }

        // ── Final Boss: The Crimson Overmind ──────────────────────
        if (enc.id === 'enc_boss4_overmind') {
            // Phase 2: Reality Fracture (Lines)
            if (inst.currentPhaseIndex === 1 && inst.mechanicTimer > 2.5) {
                inst.mechanicTimer = 0;
                const angle = Math.random() * Math.PI;
                this._onTriggerMechanic?.('line', 0, centerZ, 15, 3.0, 0x33eedd, angle);
            }
            // Psionic Tether (NEW Mechanic) - more frequent in final boss
            if (inst.mechanicTimer > 5.0 && inst.mechanicTimer < 5.5 && Math.random() < 0.4) {
                this._triggerTether(inst, 8.0, 45); 
            }
            // Neural Blast (Interruptible Cast)
            if (inst.mechanicTimer > 10.0) {
                inst.mechanicTimer = 0;
                this._startBossCast(inst, boss, 'Neural Blast', 3.5, 45);
            }
            // Psionic Singularity (Soak Mechanic)
            if (inst.currentPhaseIndex === 3 && inst.mechanicTimer > 12.0) {
                inst.mechanicTimer = 0;
                this._triggerSoak(inst, 0, centerZ, 7.0, 5.0, 60, 0x66ffee);
            }
        }
    }

    _triggerTether(inst, time, damage) {
        const aliveMembers = inst.partyMembers.filter(m => m.alive);
        if (aliveMembers.length < 2) return;
        
        // Pick two random members (could include player)
        const m1 = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        let m2 = aliveMembers[Math.floor(Math.random() * aliveMembers.length)];
        if (m1 === m2) m2 = aliveMembers[(aliveMembers.indexOf(m1) + 1) % aliveMembers.length];

        const id = `tether_${Date.now()}`;
        inst.activeMechanics.push({
            id, type: 'tether', m1, m2, timer: 0, maxTimer: time, damage, color: 0xff33bb
        });
        
        this._log(inst, 'SYSTEM', `🔗 Psionic Tether: ${m1.name} and ${m2.name} are linked! Move apart to break the bond!`, '#ff33bb');
    }

    _startBossCast(inst, mob, name, time, damage) {
        if (mob.casting) return;
        mob.casting = { name, timer: 0, maxTime: time, damage };
        inst.activeMechanics.push({
            id: `cast_${Date.now()}`,
            type: 'cast',
            mob,
            name,
            timer: 0,
            maxTimer: time,
        });
        // Visual indicator for cast in 3D scene (if scene supports it)
        // We'll also use UI to show this.
    }

    _triggerSoak(inst, x, z, radius, time, damage, color) {
        const id = `soak_${Date.now()}`;
        inst.activeMechanics.push({
            id, type: 'soak', x, z, radius, timer: 0, maxTimer: time, damage, color
        });
        this._onTriggerMechanic?.('circle', x, z, radius, time, color);
    }

    _triggerGroundEffect(inst, type, x, z, radius, time, color) {
        // Simple ground effect that deals damage if you are in it (checked in update loop)
        const id = `ground_${Date.now()}`;
        inst.activeMechanics.push({
            id, type: 'ground', x, z, radius, timer: 0, maxTimer: time, color
        });
        this._onTriggerMechanic?.(type, x, z, radius, time, color);
    }

    // ── QUEUE PHASE ─────────────────────────────────────────────────
    _updateQueue(inst, dt) {
        inst.timer -= dt;
        if (inst.timer <= 0) {
            inst.state = 'match_found';
            inst.timer = 40; // 40s to accept match
            this._log(inst, 'SYSTEM', '🔔 Raid group found! Click the prompt to enter.');
            audioManager.playQueuePop();
        }
    }

    // ── MATCH FOUND PHASE ───────────────────────────────────────────
    _updateMatchFound(inst, dt) {
        inst.timer -= dt;
        if (inst.timer <= 0) {
            this.declineMatch();
        }
    }

    // ── FORMING PHASE ───────────────────────────────────────────────
    _updateForming(inst, dt) {
        inst.phaseTimer += dt;
        const announceInterval = 0.5; // Faster for 9 NPCs
        const announced = Math.floor(inst.phaseTimer / announceInterval);
        const toAnnounce = Math.min(announced, inst.partyMembers.length);

        for (let i = (inst._lastAnnounced || 0); i < toAnnounce; i++) {
            const m = inst.partyMembers[i];
            this._log(inst, 'SYSTEM', `${m.display.icon} ${m.name} (${m.display.name}) has joined as ${m.role}.`);
        }
        inst._lastAnnounced = toAnnounce;

        if (inst.phaseTimer >= inst.partyMembers.length * announceInterval + 2.0) {
            inst.state = 'entering';
            inst.timer = 4;
            this._log(inst, 'SYSTEM', `🏛️ Entering ${inst.def.name}...`);

            const chat = RAID_CHAT_PHASES.entering;
            const shuffled = [...chat].sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(4, shuffled.length); i++) {
                const chosen = shuffled[i];
                const speaker = this._resolveSpeaker(inst, chosen.from);
                if (speaker) {
                    this._log(inst, speaker.name, chosen.msg, speaker.display.color);
                }
            }
        }
    }

    // ── ENTERING PHASE ──────────────────────────────────────────────
    _updateEntering(inst, dt) {
        inst.timer -= dt;

        // Enter the 3D raid scene as soon as entering phase starts
        if (!this._sceneEntered && this._onEnterRaid) {
            this._sceneEntered = true;
            this._onEnterRaid(inst.def);
        }

        if (inst.timer <= 0) {
            inst.state = 'combat';
            inst.encounterIndex = 0;
            this._startEncounter(inst);
        }
    }

    // ── START ENCOUNTER ─────────────────────────────────────────────
    _startEncounter(inst) {
        const enc = inst.def.encounters[inst.encounterIndex];
        if (!enc) {
            this._completeRaid(inst);
            return;
        }

        const hmMult = (inst.hardMode ? 1.3 : 1.0);
        const levelScale = (1 + (gameState.level - inst.def.levelRange[0]) * 0.06) * hmMult;

        inst.currentMobs = [];
        let mobIdCounter = 0;
        for (const mobDef of enc.mobs) {
            for (let i = 0; i < mobDef.count; i++) {
                inst.currentMobs.push({
                    id: `mob_${inst.encounterIndex}_${mobIdCounter++}`,
                    name: mobDef.name,
                    hp: Math.floor(mobDef.hp * levelScale),
                    maxHp: Math.floor(mobDef.hp * levelScale),
                    dps: Math.floor(mobDef.dps * levelScale),
                    alive: true,
                    isBoss: mobDef.isBoss || false,
                    color: mobDef.color,
                    scale: mobDef.scale,
                });
            }
        }

        inst.combatTimer = 0;
        inst.currentPhaseIndex = -1;
        inst.phaseAnnounced = {};
        inst._awaitingNextEncounter = false;
        inst._enrageTimer = 0;
        inst._enraged = false;

        // ── Hard Mode Trigger ──
        // Trigger Hard Mode if the previous encounter was cleared very fast or random chance (20%)
        if (enc.type === 'boss') {
            if (Math.random() < 0.2) {
                inst.hardMode = true;
                this._log(inst, 'SYSTEM', `⚠️ HARD MODE ACTIVATED! ${enc.name} is empowered! Rewards increased!`, '#ffaa00');
                audioManager.playBossEnrage(); 
            } else {
                inst.hardMode = false;
            }
        }

        // ── Vendor: Feast buff before boss encounters ──
        if (enc.type === 'boss') {
            const feastBonus = raidVendor.getFeastBonus();
            if (feastBonus > 0 && !inst._feastApplied[inst.encounterIndex]) {
                inst._feastApplied[inst.encounterIndex] = true;
                // Feast heals the raid and grants a temporary HP boost feel
                inst.partyHp = Math.min(100, inst.partyHp + feastBonus * 100);
                this._log(inst, 'SYSTEM', `🍖 Raid Feast active! +${Math.round(feastBonus * 100)}% max HP buff applied.`);
            }
        }

        // ── Vendor: Bloodlust on boss pull ──
        if (enc.type === 'boss') {
            const bl = raidVendor.getBloodlustBonus();
            if (bl.bonus > 0 && bl.duration > 0) {
                inst.bloodlustTimer = bl.duration;
                inst.bloodlustBonus = bl.bonus;
                this._log(inst, 'SYSTEM', `🔥 BLOODLUST! +${Math.round(bl.bonus * 100)}% raid DPS for ${bl.duration}s!`);
                audioManager.playBloodlust();
            }
        } else {
            inst.bloodlustTimer = 0;
            inst.bloodlustBonus = 0;
        }

        const announceIcon = enc.type === 'boss' ? '💀' : '⚔️';
        if (enc.roomDesc) {
            this._log(inst, 'SYSTEM', `📍 ${enc.roomDesc}`);
        }
        this._log(inst, 'SYSTEM', `${announceIcon} ${enc.name} — ${enc.description}`);

        if (enc.type === 'boss') {
            const bChat = RAID_CHAT_PHASES.bossPhase;
            const picks = [...bChat].sort(() => Math.random() - 0.5).slice(0, 3);
            for (const pick of picks) {
                const speaker = this._resolveSpeaker(inst, pick.from);
                if (speaker) {
                    this._log(inst, speaker.name, pick.msg, speaker.display.color);
                }
            }
        }
    }

    // ── COMBAT UPDATE ───────────────────────────────────────────────
    _updateCombat(inst, dt) {
        // Handle encounter transition delay
        if (inst._awaitingNextEncounter) {
            inst._encounterTransitionTimer -= dt;
            if (inst._encounterTransitionTimer <= 0) {
                inst._awaitingNextEncounter = false;
                if (inst.encounterIndex < inst.def.encounters.length) {
                    this._startEncounter(inst);
                } else {
                    this._completeRaid(inst);
                }
            }
            return;
        }

        inst.combatTimer += dt;
        const enc = inst.def.encounters[inst.encounterIndex];
        if (!enc) return;

        // ── Tick Bloodlust timer ──
        if (inst.bloodlustTimer > 0) {
            inst.bloodlustTimer -= dt;
            if (inst.bloodlustTimer <= 0) {
                inst.bloodlustTimer = 0;
                inst.bloodlustBonus = 0;
            }
        }

        // ── Enrage timer — bosses enrage after extended combat ──
        if (enc.type === 'boss') {
            inst._enrageTimer += dt;
            const enrageThreshold = 90; // 90 seconds on a single boss
            if (!inst._enraged && inst._enrageTimer >= enrageThreshold) {
                inst._enraged = true;
                this._log(inst, 'SYSTEM', `🔥 ENRAGE! The boss is enraged — damage output massively increased!`);
                audioManager.playBossEnrage();
            }
        }

        // ══════════════════════════════════════════════════════════
        // PARTY DPS → DAMAGE MOBS
        // Includes: Bloodlust buff, Raid Vendor boss damage boost,
        //           Hivemind 2-piece set bonus, NPC alive count scaling
        // ══════════════════════════════════════════════════════════

        const playerDpsBase = gameState.getDPS();
        let totalPartyDps = 0;

        // Apply shared buffs to individual DPS before summing
        const hasBoss = inst.currentMobs.some(m => m.isBoss && m.alive);
        const bossDmgBoost = hasBoss ? raidVendor.getRaidBossDmgBoost() : 0;
        const bloodlustMult = (inst.bloodlustTimer > 0 && inst.bloodlustBonus > 0) ? (1 + inst.bloodlustBonus) : 1;
        const hivemind2pcMult = raidVendor.getSetPieceCount('hivemind') >= 2 ? 1.08 : 1.0;
        
        // Efficiency scaling
        const aliveCount = inst.partyMembers.filter(m => m.alive).length + 1;
        const fullRaid = inst.partyMembers.length + 1;
        const raidEfficiency = 0.5 + 0.5 * (aliveCount / fullRaid);

        const sharedMult = bloodlustMult * hivemind2pcMult * raidEfficiency * (1 + bossDmgBoost);

        // Player Contribution
        const pDpsActual = playerDpsBase * sharedMult;
        totalPartyDps += pDpsActual;
        inst.combatStats.damage.set('player', (inst.combatStats.damage.get('player') || 0) + pDpsActual * dt);

        // NPC Contributions
        for (const m of inst.partyMembers) {
            if (m.alive) {
                const npcDpsActual = m.dps * sharedMult;
                totalPartyDps += npcDpsActual;
                inst.combatStats.damage.set(m.id, (inst.combatStats.damage.get(m.id) || 0) + npcDpsActual * dt);
            }
        }

        const aliveMobs = inst.currentMobs.filter(m => m.alive);
        if (aliveMobs.length > 0) {
            // Kill priority: focus bosses first, then lowest HP
            let focusTarget = aliveMobs.find(m => m.isBoss) || aliveMobs[0];
            // Sort non-boss mobs by HP for cleave damage
            const nonBossMobs = aliveMobs.filter(m => m !== focusTarget);

            // 65% focused on primary target, 35% cleave/spread
            const focusDmg = totalPartyDps * 0.65 * dt;
            const spreadDmg = totalPartyDps * 0.35 * dt / Math.max(1, aliveMobs.length);

            focusTarget.hp -= focusDmg;
            for (const mob of aliveMobs) {
                mob.hp -= spreadDmg;
                if (mob.hp <= 0) { mob.hp = 0; mob.alive = false; }
            }
        }

        // ══════════════════════════════════════════════════════════
        // MOB DPS → DAMAGE RAID
        // Includes: Tank mitigation, Vendor damage reduction,
        //           Hivemind 4-piece set bonus, Enrage multiplier,
        //           Individual NPC HP simulation
        // ══════════════════════════════════════════════════════════

        const aliveMobsNow = inst.currentMobs.filter(m => m.alive);
        let totalMobDps = aliveMobsNow.reduce((sum, m) => sum + m.dps, 0);

        // Enrage: boss DPS doubles after extended combat
        if (inst._enraged) {
            totalMobDps *= 2.0;
        }

        // Tank mitigation — scales with alive tanks
        const tanksAlive = inst.partyMembers.filter(m => m.role === 'Tank' && m.alive).length;
        // Base 55% mitigation with 2 tanks, degrades without tanks
        const tankMitigation = tanksAlive >= 2 ? 0.55 : tanksAlive === 1 ? 0.70 : 0.90;
        let effectiveMobDps = totalMobDps * tankMitigation;

        // Vendor gear effects
        const hivemindPieces = raidVendor.getSetPieceCount('hivemind');

        // Vendor gear: raid damage reduction (Hivemind Carapace effect)
        const raidDmgReduction = raidVendor.getRaidDmgReduction();
        if (raidDmgReduction > 0) effectiveMobDps *= (1 - raidDmgReduction);

        // Hivemind 4-piece set bonus: +12% raid healing and -5% incoming damage
        if (hivemindPieces >= 4) effectiveMobDps *= 0.95;

        const raidHpPool = 2500 + gameState.level * 80;
        inst.partyHp -= (effectiveMobDps * dt / raidHpPool) * 100;

        // ══════════════════════════════════════════════════════════
        // HEALER THROUGHPUT — Raid healing math
        // Includes: Hivemind 4-piece heal bonus, Feast bonus
        // ══════════════════════════════════════════════════════════

        const healers = inst.partyMembers.filter(m => m.role === 'Healer' && m.alive);
        const playerIsHealer = gameState.classId === 'cleric';
        const totalHealers = healers.length + (playerIsHealer ? 1 : 0);
        
        let baseHealPerHealer = 2.8;
        if (hivemindPieces >= 4) baseHealPerHealer *= 1.12;

        // Healing is less effective when raid is near full (overheal reduction)
        let efficiency = 1.0;
        if (inst.partyHp > 85) efficiency = 0.4;
        else if (inst.partyHp > 70) efficiency = 0.7;

        const actualHealPerHealer = baseHealPerHealer * efficiency;
        const totalHealTick = actualHealPerHealer * totalHealers;

        // Track healing stats
        if (playerIsHealer) {
            inst.combatStats.healing.set('player', (inst.combatStats.healing.get('player') || 0) + actualHealPerHealer * dt * 10);
        }
        for (const h of healers) {
            inst.combatStats.healing.set(h.id, (inst.combatStats.healing.get(h.id) || 0) + actualHealPerHealer * dt * 10);
        }

        inst.partyHp += (totalHealTick * dt);
        inst.partyHp += (0.8 * dt); // Passive regen
        inst.partyHp = Math.min(100, inst.partyHp);

        // ══════════════════════════════════════════════════════════
        // NPC DAMAGE / DEATH SIMULATION
        // More dynamic than before: stress-based, role-weighted
        // ══════════════════════════════════════════════════════════

        // NPCs take individual damage when raid HP is low
        const raidStress = 1 - (inst.partyHp / 100); // 0 = fine, 1 = dying
        if (raidStress > 0.6) {
            // Higher stress = more likely someone falls
            const deathChance = (raidStress - 0.6) * 0.015 * dt;
            if (Math.random() < deathChance) {
                const aliveNpcs = inst.partyMembers.filter(m => m.alive);
                if (aliveNpcs.length > 1) {
                    // DPS die first (tanks and healers are protected)
                    const dpsAlive = aliveNpcs.filter(m => m.role === 'DPS');
                    const candidates = dpsAlive.length > 0 ? dpsAlive : aliveNpcs;
                    const victim = candidates[Math.floor(Math.random() * candidates.length)];

                    // ── Vendor: Soulstone — chance to self-resurrect ──
                    const soulstoneChance = raidVendor.getSoulstoneChance();
                    if (soulstoneChance > 0 && Math.random() < soulstoneChance) {
                        victim.hp = 40;
                        this._log(inst, 'SYSTEM', `💎 ${victim.name}'s Soulstone activates — self-resurrected!`);
                    } else {
                        victim.alive = false;
                        victim.hp = 0;
                        this._log(inst, 'SYSTEM', `☠️ ${victim.name} has fallen!`);
                        
                        // ── Log for Death Analysis ──
                        inst.deathLog.push({
                            name: victim.name,
                            role: victim.role,
                            time: inst.totalTime,
                            encounterName: enc.name
                        });
                    }
                }
            }
        }

        // Individual NPC HP simulation — NPCs slowly lose/gain HP for visual feedback
        for (const m of inst.partyMembers) {
            if (!m.alive) continue;
            // NPC HP trends toward raid HP but with variance
            const targetHp = inst.partyHp + (Math.random() - 0.5) * 20;
            m.hp += (targetHp - m.hp) * 0.05 * dt;
            m.hp = Math.max(1, Math.min(100, m.hp));
        }

        // ══════════════════════════════════════════════════════════
        // BOSS PHASE TRANSITIONS
        // Includes: Vendor Phase Transition Shield (Hivemind Psi-Blade)
        // ══════════════════════════════════════════════════════════

        // ══════════════════════════════════════════════════════════
        // ADVANCED MECHANICS RESOLUTION
        // ══════════════════════════════════════════════════════════
        for (let i = inst.activeMechanics.length - 1; i >= 0; i--) {
            const mech = inst.activeMechanics[i];
            mech.timer += dt;

            // ── Cast Mechanic ──────────────────────────────────────
            if (mech.type === 'cast') {
                const mob = mech.mob;
                if (!mob || !mob.alive || !mob.casting) {
                    inst.activeMechanics.splice(i, 1);
                    continue;
                }

                mob.casting.timer = mech.timer;
                
                // NPC Interrupt Chance
                const interruptible = true; // Most boss casts are interruptible
                if (interruptible && Math.random() < 0.05 * dt) {
                    const kicker = inst.partyMembers.filter(m => m.alive && (m.classId === 'warrior' || m.classId === 'mage' || m.classId === 'ranger'))[0];
                    if (kicker) {
                        mob.casting = null;
                        inst.activeMechanics.splice(i, 1);
                        this._log(inst, 'SYSTEM', `⚡ ${kicker.name} interrupted ${mob.name}'s [${mech.name}]!`, '#44ccaa');
                        continue;
                    }
                }

                if (mech.timer >= mech.maxTimer) {
                    // Cast completed! Massive raid damage
                    inst.partyHp -= mob.casting.damage;
                    
                    // Log failure for diagnostics
                    inst.failureRecap.majorFails.push({
                        type: 'Missed Interrupt',
                        name: mech.name,
                        target: mob.name,
                        time: inst.totalTime,
                        damage: mob.casting.damage
                    });

                    mob.casting = null;
                    inst.activeMechanics.splice(i, 1);
                    this._log(inst, 'SYSTEM', `💥 ${mob.name} completed [${mech.name}]! Raid took massive damage!`, '#ff3344');
                }
            }

            // ── Soak Mechanic ──────────────────────────────────────
            else if (mech.type === 'soak') {
                if (mech.timer >= mech.maxTimer) {
                    // Soak explode! Check raiders (simulated)
                    const aliveCount = inst.partyMembers.filter(m => m.alive).length + 1;
                    const soakCount = Math.floor(aliveCount * (0.4 + Math.random() * 0.4)); // 40-80% of raid soaks
                    
                    const needed = Math.ceil(inst.partyMembers.length * 0.3); // Need 30% of raid
                    if (soakCount >= needed) {
                        // Success! Damage split
                        const splitDmg = mech.damage / soakCount;
                        inst.partyHp -= splitDmg;
                        inst.chatLog.push({ 
                            user: 'SYSTEM', 
                            msg: `🛡️ [${mech.radius}m Soak] successfully absorbed by ${soakCount} raiders!`, 
                            time: inst.totalTime,
                            color: '#ffcc44'
                        });
                    } else {
                        // Failure! Massive raid-wide damage
                        inst.partyHp -= mech.damage * 2;

                        // Log failure for diagnostics
                        inst.failureRecap.majorFails.push({
                            type: 'Failed Soak',
                            name: `[${mech.radius}m Soak]`,
                            time: inst.totalTime,
                            damage: mech.damage * 2,
                            details: `Only ${soakCount}/${needed} raiders in zone`
                        });

                        inst.chatLog.push({ 
                            user: 'SYSTEM', 
                            msg: `💀 [Soak FAILED]! Not enough raiders in the zone!`, 
                            time: inst.totalTime,
                            color: '#ff3344'
                        });
                    }
                    inst.activeMechanics.splice(i, 1);
                }
            }

            // ── Ground/Avoid Mechanic ────────────────────────────────
            else if (mech.type === 'ground') {
                if (mech.timer >= mech.maxTimer) {
                    // One-time damage if raiders "fail" to move
                    if (Math.random() < 0.15) { // 15% chance someone fails to move
                        inst.partyHp -= 10;
                    }
                    inst.activeMechanics.splice(i, 1);
                }
            }

            // ── Psionic Tether Mechanic (NEW) ─────────────────────────
            else if (mech.type === 'tether') {
                // To break tether, raiders must "move apart"
                // NPCs are in formation, so we simulate this by giving it a chance to break over time
                const breakChancePerSec = 0.35; // ~3 seconds to break on average
                if (Math.random() < breakChancePerSec * dt) {
                    this._log(inst, 'SYSTEM', `✨ Tether BROKEN between ${mech.m1.name} and ${mech.m2.name}!`, '#44ccaa');
                    inst.activeMechanics.splice(i, 1);
                    continue;
                }

                // If timer runs out, it deals massive damage
                if (mech.timer >= mech.maxTimer) {
                    inst.partyHp -= mech.damage;
                    this._log(inst, 'SYSTEM', `💥 Tether EXPLODED! ${mech.m1.name} and ${mech.m2.name} failed to break the bond!`, '#ff3344');
                    inst.activeMechanics.splice(i, 1);
                }
            }
        }

        this._updateMechanics(inst, dt);

        if (enc.phases) {
            const bossTarget = inst.currentMobs.find(m => m.isBoss && m.alive);
            if (bossTarget) {
                const hpPct = bossTarget.hp / bossTarget.maxHp;
                for (let pi = 0; pi < enc.phases.length; pi++) {
                    const phase = enc.phases[pi];
                    if (hpPct <= phase.hpThreshold && !inst.phaseAnnounced[pi]) {
                        inst.phaseAnnounced[pi] = true;
                        inst.currentPhaseIndex = pi;
                        inst._lastPhaseAnnounced = phase;
                        this._log(inst, 'SYSTEM', `⚠️ PHASE: ${phase.name} — ${phase.description}`);

                        // ── Trigger Boss Voice Line ──
                        if (phase.dialogue) {
                            gameState.addBossChatMessage(bossTarget.name, phase.dialogue, `#${bossTarget.color.toString(16).padStart(6, '0')}`);
                        }

                        // Phase transition raid damage
                        let phaseDmg = 10;

                        // Vendor gear: Phase Transition Shield (Hivemind Psi-Blade)
                        const phaseShield = this._getGearEffect(inst, 'phaseTransitionShield');
                        if (phaseShield > 0) {
                            phaseDmg *= (1 - phaseShield);
                            this._log(inst, 'SYSTEM', `🛡️ Phase Shield absorbed ${Math.round(phaseShield * 100)}% of the transition damage!`);
                        }
                        inst.partyHp -= phaseDmg;

                        // Later phases deal escalating damage
                        if (pi >= 3) inst.partyHp -= 5;
                        if (pi >= 4) inst.partyHp -= 5;
                    }
                }
            }
        }

        // ══════════════════════════════════════════════════════════
        // RAID CHAT
        // ══════════════════════════════════════════════════════════

        if (inst.chatTimer > 5 + Math.random() * 7) {
            inst.chatTimer = 0;
            const pool = RAID_CHAT_PHASES.midRun;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            const speaker = this._resolveSpeaker(inst, pick.from);
            if (speaker) {
                this._log(inst, speaker.name, pick.msg, speaker.display.color);
            }
        }

        // ══════════════════════════════════════════════════════════
        // ENCOUNTER COMPLETION
        // Includes: Vendor Encounter Heal Boost, Mass Rez, Loot Council
        // ══════════════════════════════════════════════════════════

        const allMobsDead = inst.currentMobs.every(m => !m.alive);
        if (allMobsDead) {
            // ── Loot collection with Loot Council + Hard Mode bonus ──
            if (enc.loot) {
                const hmBonus = inst.hardMode ? 0.5 : 0; // +50% loot for hard mode
                const lootMult = 1 + raidVendor.getLootCouncilBonus() + hmBonus;
                inst.lootCollected.gold += Math.floor((enc.loot.gold || 0) * lootMult);
                inst.lootCollected.xp += Math.floor((enc.loot.xp || 0) * lootMult);
                inst.lootCollected.karma += Math.floor((enc.loot.karma || 0) * lootMult);

                // Only collect Soul Essence if Soul Forge is unlocked
                if (soulForge.isUnlocked()) {
                    inst.lootCollected.soulEssence += Math.floor((enc.loot.soulEssence || 0) * (inst.hardMode ? 1.5 : 1.0));
                }

                inst.lootCollected.raidPoints += Math.floor((enc.loot.raidPoints || 0) * (inst.hardMode ? 1.5 : 1.0));
            }

            this._log(inst, 'SYSTEM', `✅ ${enc.name} cleared!`);

            // Base heal between encounters
            let transitionHeal = 20;

            // Vendor gear: Encounter Heal Boost (Shard of the Overmind)
            const encounterHealBoost = this._getGearEffect(inst, 'encounterHealBoost');
            transitionHeal += encounterHealBoost * 100;

            inst.partyHp = Math.min(100, inst.partyHp + transitionHeal);

            // ── Vendor: Mass Rez after boss kills ──
            if (enc.type === 'boss') {
                const massRezHp = raidVendor.getMassRezHP();
                if (massRezHp > 0) {
                    let rezzed = 0;
                    for (const m of inst.partyMembers) {
                        if (!m.alive) {
                            m.alive = true;
                            m.hp = massRezHp * 100;
                            rezzed++;
                        }
                    }
                    if (rezzed > 0) {
                        this._log(inst, 'SYSTEM', `✨ Mass Resurrection! ${rezzed} fallen raider${rezzed > 1 ? 's' : ''} revived at ${Math.round(massRezHp * 100)}% HP!`);
                    }
                }
            } else {
                // Standard revive on non-boss encounters
                for (const m of inst.partyMembers) { m.alive = true; m.hp = 100; }
            }

            // ── Transition to Looting if Boss ──
            if (enc.type === 'boss') {
                inst.state = 'looting';
                inst.lootingState.active = true;
                inst.lootingState.timer = 0;
                inst.lootingState.rolls = [];
                // Pick a set piece based on boss
                const setPieces = RAID_GEAR.filter(g => g.setId === 'hivemind');
                const piece = setPieces[Math.floor(Math.random() * setPieces.length)];
                inst.lootingState.items = [piece || { name: 'Glistening Chitin Fragment', rarity: 'Epic' }];
                return;
            }

            inst.encounterIndex++;
            if (inst.encounterIndex < inst.def.encounters.length) {
                inst._awaitingNextEncounter = true;
                inst._encounterTransitionTimer = 3.5;
            } else {
                this._completeRaid(inst);
            }
            return;
        }

        // ── Raid wipe check ──
        if (inst.partyHp <= 0) {
            inst.state = 'failed';
            inst.partyHp = 0;
            audioManager.playRaidDefeat();

            // Determine primary cause
            if (inst._enraged) {
                inst.failureRecap.cause = 'enrage';
                inst.failureRecap.details = 'The boss reached its enrage timer (90s) and overwhelmed the raid with 200% damage.';
            } else if (inst.failureRecap.majorFails.length > 0) {
                inst.failureRecap.cause = 'mechanic';
                const lastFail = inst.failureRecap.majorFails[inst.failureRecap.majorFails.length - 1];
                inst.failureRecap.details = `The raid failed a critical mechanic: ${lastFail.type} (${lastFail.name}).`;
            } else {
                const healersAlive = inst.partyMembers.filter(m => m.role === 'Healer' && m.alive).length;
                if (healersAlive === 0) {
                    inst.failureRecap.cause = 'healing';
                    inst.failureRecap.details = 'All healers perished, leading to unsustainable raid damage.';
                } else {
                    inst.failureRecap.cause = 'dps';
                    inst.failureRecap.details = 'Sustained boss damage eventually overwhelmed the raid\'s healing capacity.';
                }
            }

            this._log(inst, 'SYSTEM', '☠️ Your raid has been defeated!');

            const wipe = RAID_CHAT_PHASES.wipe;
            for (const msg of wipe.slice(0, 4)) {
                const speaker = this._resolveSpeaker(inst, msg.from);
                if (speaker) {
                    this._log(inst, speaker.name, msg.msg, speaker.display.color);
                }
            }

            gameState.addGameLog(`☠️ Raid failed: ${inst.def.name}`);
        }
    }

    // ── COMPLETE RAID ───────────────────────────────────────────────
    _completeRaid(inst) {
        inst.state = 'complete';
        audioManager.playRaidVictory();

        const stats = this.completedRaids[inst.def.id] || { clears: 0, bestTime: Infinity, firstClear: false };
        stats.clears++;
        stats.bestTime = Math.min(stats.bestTime, inst.totalTime);

        const rewards = inst.isFirstClear && !stats.firstClear
            ? inst.def.firstClearRewards
            : inst.def.repeatRewards;

        // Apply Loot Council bonus to gold/XP rewards
        const lootMult = 1 + raidVendor.getLootCouncilBonus();
        inst.lootCollected.gold += Math.floor(rewards.gold * lootMult);
        inst.lootCollected.xp += Math.floor(rewards.xp * lootMult);
        inst.lootCollected.karma += Math.floor(rewards.karma * lootMult);
        inst.lootCollected.raidPoints += rewards.raidPoints || 0;

        gameState.gold += inst.lootCollected.gold;
        gameState.addXp(inst.lootCollected.xp);
        gameState.karma += inst.lootCollected.karma;

        if (soulForge.isUnlocked()) {
            inst.lootCollected.soulEssence += rewards.soulEssence || 0;
            soulForge.addSoulEssence(inst.lootCollected.soulEssence);
        }

        // Award Raid Points via the vendor (addRP already applies RP Boost internally)
        raidVendor.addRP(inst.lootCollected.raidPoints);

        if (inst.isFirstClear) stats.firstClear = true;
        this.completedRaids[inst.def.id] = stats;
        this.totalClears++;

        this._log(inst, 'SYSTEM', `🏆 ${inst.def.name} CLEARED! Time: ${this._formatTime(inst.totalTime)}`);

        const victory = RAID_CHAT_PHASES.victory;
        for (const msg of victory.slice(0, 4)) {
            const speaker = this._resolveSpeaker(inst, msg.from);
            if (speaker) {
                this._log(inst, speaker.name, msg.msg, speaker.display.color);
            }
        }

        gameState.addGameLog(`🏆 Raid cleared: ${inst.def.name}! +${inst.lootCollected.gold}g, +${inst.lootCollected.xp} XP, +${inst.lootCollected.raidPoints} RP`);
        gameState.addChatMessage('Game', 'System', `🏆 ${gameState.playerName}'s raid has cleared ${inst.def.name}!`);

        // Trigger Hero Toast
        if (window._showRaidClearToast) {
            window._showRaidClearToast(inst.def, inst.lootCollected, inst.totalTime);
        }
    }

    // ── Helper: Resolve NPC speaker ─────────────────────────────────
    _resolveSpeaker(inst, roleKey) {
        if (!roleKey) return null;
        const roleMap = {
            tank1: 'Tank', tank2: 'Tank',
            healer1: 'Healer', healer2: 'Healer',
            dps1: 'DPS', dps2: 'DPS', dps3: 'DPS', dps4: 'DPS', dps5: 'DPS',
        };
        const role = roleMap[roleKey];
        if (!role) return null;

        const matches = inst.partyMembers.filter(m => m.role === role);
        if (matches.length === 0) return null;

        // tank2 / healer2 → second match if available
        if ((roleKey === 'tank2' || roleKey === 'healer2') && matches.length > 1) return matches[1];
        // dps1-5 map to different DPS members
        const dpsIdx = parseInt(roleKey.replace('dps', '')) - 1;
        if (!isNaN(dpsIdx) && dpsIdx < matches.length) return matches[dpsIdx];
        return matches[0];
    }

    // ── Helper: Get gear effect value ──────────────────────────────
    _getGearEffect(inst, effectKey) {
        let total = 0;
        for (const gearId of raidVendor.purchasedGear) {
            const g = RAID_GEAR_CACHE.get(gearId);
            if (g && g.raidEffect === effectKey) total += g.raidValue;
        }
        return total;
    }

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    isInRaid() {
        return this.instance !== null;
    }

    getProgress() {
        if (!this.instance) return null;
        const inst = this.instance;
        const enc = inst.def.encounters[inst.encounterIndex] || null;

        // Gather active buff/debuff info for UI display
        const hivemindPieces = raidVendor.getSetPieceCount('hivemind');
        const tanksAlive = inst.partyMembers.filter(m => m.role === 'Tank' && m.alive).length;
        const healersAlive = inst.partyMembers.filter(m => m.role === 'Healer' && m.alive).length;
        const aliveCount = inst.partyMembers.filter(m => m.alive).length + 1;
        const fullRaid = inst.partyMembers.length + 1;
        const raidEfficiency = 0.5 + 0.5 * (aliveCount / fullRaid);
        const hasBoss = inst.currentMobs.some(m => m.isBoss && m.alive);

        return {
            state: inst.state,
            encounterIndex: inst.encounterIndex,
            totalEncounters: inst.def.encounters.length,
            currentEncounter: enc,
            mobs: inst.currentMobs,
            partyHp: inst.partyHp,
            partyMembers: inst.partyMembers,
            chatLog: inst.chatLog,
            totalTime: inst.totalTime,
            loot: inst.lootCollected,
            raidDef: inst.def,
            combatStats: inst.combatStats,
            isFirstClear: inst.isFirstClear,
            lastPhaseAnnounced: inst._lastPhaseAnnounced,
            awaitingNext: inst._awaitingNextEncounter,
            bloodlustTimer: inst.bloodlustTimer,
            bloodlustBonus: inst.bloodlustBonus,
            enraged: inst._enraged,
            enrageTimer: inst._enrageTimer,
            currentPhaseIndex: inst.currentPhaseIndex,
            combatTimer: inst.combatTimer,
            deathLog: inst.deathLog,
            activeMechanics: inst.activeMechanics,
            lootingState: inst.lootingState,
            failureRecap: inst.failureRecap,
            markers: inst.markers,
            // ── Active Buffs/Debuffs data for UI ──
            buffs: {
                bloodlust: inst.bloodlustTimer > 0 ? { timer: inst.bloodlustTimer, bonus: inst.bloodlustBonus } : null,
                feast: (enc && enc.type === 'boss' && inst._feastApplied[inst.encounterIndex] && raidVendor.getFeastBonus() > 0) ? { bonus: raidVendor.getFeastBonus() } : null,
                hivemind2pc: hivemindPieces >= 2,
                hivemind4pc: hivemindPieces >= 4,
                hivemindPieces,
                bossDmgBoost: hasBoss ? raidVendor.getRaidBossDmgBoost() : 0,
                dmgReduction: raidVendor.getRaidDmgReduction(),
                lootCouncil: raidVendor.getLootCouncilBonus(),
                soulstoneChance: raidVendor.getSoulstoneChance(),
                massRezHP: raidVendor.getMassRezHP(),
            },
            raidState: {
                tanksAlive,
                healersAlive,
                aliveCount,
                fullRaid,
                raidEfficiency,
                hasBoss,
                enrageThreshold: 90,
            },
        };
    }

    serialize() {
        return {
            unlocked: this.unlocked,
            completedRaids: this.completedRaids,
            totalClears: this.totalClears,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.unlocked = data.unlocked || false;
        this.completedRaids = data.completedRaids || {};
        this.totalClears = data.totalClears || 0;
    }
}

export const raidSystem = new RaidSystemManager();
