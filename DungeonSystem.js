// ══════════════════════════════════════════════════════════════════════
// DUNGEON SYSTEM — Instanced Group Content
// Unlocked when Molten Wasteland zone becomes accessible.
// WoW-style dungeons: queue → matchmake → enter instance → trash → boss → loot
// First dungeon: The Embercrypt — Volcanic Cathedral of the Damned
// Inspired by Ragefire Chasm × Wailing Caverns: winding volcanic caves
// with corrupted cultists, fissure worms, obsidian constructs, and
// a towering flame-priest final boss.
// ══════════════════════════════════════════════════════════════════════

import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { audioManager } from './AudioManager.js';
import { partySystem } from './PartySystem.js';
import { soulForge } from './SoulForge.js';

// ── CLASS DISPLAY DATA ──────────────────────────────────────────────
const CLASS_IDS = ['warrior', 'mage', 'ranger', 'cleric'];
const CLASS_DISPLAY = {
    warrior: { name: 'Aetherblade', color: '#4488cc', icon: '⚔️', role: 'Tank' },
    mage:    { name: 'Voidweaver',  color: '#aa66ff', icon: '🔮', role: 'DPS' },
    ranger:  { name: 'Thornwarden', color: '#66bb44', icon: '🏹', role: 'DPS' },
    cleric:  { name: 'Dawnkeeper',  color: '#ffcc44', icon: '✨', role: 'Healer' },
};

// ── NPC NAME POOLS ──────────────────────────────────────────────────
const FIRST_NAMES = [
    'Kael', 'Lyra', 'Theron', 'Zara', 'Brynn', 'Dax', 'Elara', 'Finn',
    'Gwyn', 'Haze', 'Iris', 'Jett', 'Kira', 'Lux', 'Mira', 'Nyx',
    'Orion', 'Pax', 'Quinn', 'Riven', 'Sable', 'Talon', 'Uma', 'Vex',
    'Wren', 'Xara', 'Yuki', 'Zephyr', 'Ash', 'Blaze', 'Cass', 'Drake',
    'Echo', 'Frost', 'Gale', 'Haven', 'Ivy', 'Jade', 'Knox', 'Luna',
    'Kai', 'Nyla', 'Rex', 'Suki', 'Vale', 'Bex', 'Rune', 'Storm',
];
const SUFFIXES = ['', '_xX', '42', 'HD', '_GG', '99', 'TV', 'Pro', 'Jr', 'Arc', '', '', '', '', ''];

// ── DUNGEON CHAT MESSAGES ──────────────────────────────────────────
const DUNGEON_CHAT_PHASES = {
    queue: [
        { user: 'SYSTEM', msg: '⏳ Searching for group members...' },
        { user: 'SYSTEM', msg: '🔍 Scanning the Dungeon Finder queue...' },
        { user: 'SYSTEM', msg: '📡 Matching compatible adventurers...' },
    ],
    forming: [
        '{tank} has joined the group as Tank.',
        '{healer} has joined the group as Healer.',
        '{dps1} has joined the group as DPS.',
        '{dps2} has joined the group as DPS.',
    ],
    entering: [
        { from: 'dps1', msg: 'lets goooo 🔥' },
        { from: 'tank', msg: 'Hey all. First time here, heard its rough.' },
        { from: 'healer', msg: 'np ill keep u alive, just dont stand in lava' },
        { from: 'dps2', msg: 'gogogo pull everything' },
        { from: 'dps1', msg: 'this place looks insane' },
        { from: 'tank', msg: 'ok buffing up, everyone ready?' },
        { from: 'healer', msg: 'buff up, I need mana before first pull' },
        { from: 'dps2', msg: 'I can smell the sulfur already' },
    ],
    midRun: [
        { from: 'dps1', msg: 'big dps here 💪' },
        { from: 'healer', msg: 'stop standing in fire plz' },
        { from: 'tank', msg: 'holding aggro np' },
        { from: 'dps2', msg: 'these mobs hit different than overworld' },
        { from: 'dps1', msg: 'tank pull more we got this' },
        { from: 'healer', msg: 'my mana tho 😰' },
        { from: 'tank', msg: 'sry i pulled too many' },
        { from: 'dps2', msg: 'its fine just nuke em' },
        { from: 'dps1', msg: 'lol nice dodge' },
        { from: 'healer', msg: 'who keeps pulling extra trash' },
        { from: 'dps2', msg: 'watch the lava pools!' },
        { from: 'tank', msg: 'these cultists are casting, interrupt them!' },
        { from: 'dps1', msg: 'the worms keep spawning from the floor 😱' },
        { from: 'healer', msg: 'nice cleave, keep it up' },
        { from: 'dps2', msg: 'remind me not to lick the obsidian walls' },
        { from: 'tank', msg: 'stay together through the tunnels' },
        { from: 'dps1', msg: 'I can hear chanting up ahead...' },
        { from: 'healer', msg: 'careful, the troggoths spit poison' },
        { from: 'dps2', msg: 'these mushrooms are sus 🍄' },
        { from: 'tank', msg: 'adds on healer! peel peel!' },
        { from: 'healer', msg: 'the cave is... breathing? 😨' },
        { from: 'dps1', msg: 'nice interrupt!' },
        { from: 'dps2', msg: 'we clearing this easy' },
    ],
    bossPhase: [
        { from: 'tank', msg: 'BOSS! Focus up everyone!' },
        { from: 'healer', msg: 'save your cooldowns, this ones nasty' },
        { from: 'dps1', msg: 'LET ME AT HIM 💀' },
        { from: 'dps2', msg: 'dont stand in the fire circles' },
        { from: 'tank', msg: 'I\'ll hold him, burn hard' },
        { from: 'healer', msg: 'he hits SO hard omg' },
        { from: 'dps1', msg: 'ok BIG PULL incoming' },
        { from: 'tank', msg: 'watch the AoE, spread out when he channels' },
    ],
    victory: [
        { from: 'dps1', msg: 'GG EZ 🏆' },
        { from: 'healer', msg: 'gj team! that was wild' },
        { from: 'tank', msg: 'nice run everyone' },
        { from: 'dps2', msg: 'anyone need the loot? 👀' },
        { from: 'dps1', msg: 'requeue?? that was fun' },
        { from: 'healer', msg: 'thanks all, great group ✨' },
        { from: 'tank', msg: 'smooth run, would group again' },
        { from: 'dps2', msg: 'emberlord got REKT' },
    ],
    wipe: [
        { from: 'dps2', msg: 'bruh' },
        { from: 'healer', msg: 'i ran out of mana on the adds...' },
        { from: 'tank', msg: 'my bad, missed the phase change' },
        { from: 'dps1', msg: 'thats a wipe lol' },
        { from: 'healer', msg: 'the lava damage was too much' },
        { from: 'dps2', msg: 'he one-shot me during enrage 💀' },
    ],
};

// ══════════════════════════════════════════════════════════════════════
// DUNGEON DEFINITIONS
// ══════════════════════════════════════════════════════════════════════

export const DUNGEON_DEFS = [
    {
        id: 'embercrypt',
        name: 'The Embercrypt',
        subtitle: 'Volcanic Cathedral of the Damned',
        iconKey: 'dungeonEmbercrypt',
        icon: '🏚️',
        color: '#ff6633',
        unlockZone: 'molten_abyss',
        levelRange: [15, 24],
        description: 'Beneath the Molten Wasteland, an ancient cathedral carved from living obsidian descends into the earth. Once a holy sanctum of the Flame Oracles, it was desecrated by the Emberlord Thal\'kesh — a corrupted high priest who fused his body with volcanic rock. Twisted cultists worship him in the depths while fissure-dwelling horrors patrol the winding lava channels. Only the brave dare enter.',
        loadingImage: 'https://rosebud.ai/assets/loading-dungeon-embercrypt.webp.webp?HqaY',
        textures: {
            ground: 'https://rosebud.ai/assets/dungeon-ground-obsidian.webp.webp?AlyD',
            wall: 'https://rosebud.ai/assets/dungeon-wall-basalt.webp.webp?9Tw1',
        },
        colors: {
            fogColor: 0x1a0800,
            ambientLight: 0x4a2a15,
            directionalLight: 0xffaa66,
            godRayColor: 0xff6600,
            groundTint: 0x2a1208,
            sceneBg: 0x120600,
            fogDensity: 0.012,
            particleColor: 0xff6633,
            lavaColor: 0xff3300,
            emissiveAccent: 0xff5500,
        },
        // ── Dungeon encounters — Ragefire Chasm × Wailing Caverns fusion ──
        // 7 encounters: trash → trash → mini-boss → trash → trash → trash → FINAL BOSS
        // ALL enemies are UNIQUE to this dungeon — NOT found in Molten Wasteland overworld.
        encounters: [
            {
                id: 'enc_fissure_descent',
                type: 'trash',
                name: 'The Fissure Descent',
                description: 'The entrance narrows into a cracked fissure. Troggoth sentries and magma leeches guard the way down.',
                roomDesc: 'A narrow fissure with glowing cracks along the walls. Hot steam vents hiss from the floor.',
                mobs: [
                    { name: 'Troggoth Sentry', hp: 500, dps: 20, color: 0x665544, scale: 1.1, count: 3, mobShape: 'troggoth' },
                    { name: 'Magma Leech', hp: 300, dps: 28, color: 0xcc4400, scale: 0.7, count: 2, mobShape: 'leech' },
                ],
            },
            {
                id: 'enc_fungal_grotto',
                type: 'trash',
                name: 'The Fungal Grotto',
                description: 'A cavern thick with bioluminescent spores. Corrupted sporecaps release toxic clouds while cave crawlers skitter through the shadows.',
                roomDesc: 'A damp cavern covered in glowing mushrooms and toxic spore clouds.',
                mobs: [
                    { name: 'Corrupted Sporecap', hp: 400, dps: 35, color: 0x44aa55, scale: 1.0, count: 2, mobShape: 'sporecap' },
                    { name: 'Embercrypt Crawler', hp: 600, dps: 25, color: 0x553322, scale: 1.2, count: 3, mobShape: 'crawler' },
                ],
            },
            {
                id: 'enc_miniboss_goremaul',
                type: 'miniboss',
                name: 'Goremaul the Bloated',
                description: 'A massive troggoth chieftain bloated with volcanic gases. He swings a pillar of obsidian and vomits magma at his foes.',
                roomDesc: 'A wide cavern arena with a cracked obsidian floor and pools of bubbling magma.',
                mobs: [
                    { name: 'Goremaul the Bloated', hp: 5500, dps: 48, color: 0x553311, scale: 2.4, count: 1, isBoss: true, mobShape: 'troggothBoss' },
                    { name: 'Troggoth Whelp', hp: 200, dps: 18, color: 0x665544, scale: 0.6, count: 3, mobShape: 'troggoth' },
                ],
                phases: [
                    { hpThreshold: 0.50, name: 'Magma Vomit', description: 'Goremaul hurls pools of lava across the arena!' },
                    { hpThreshold: 0.20, name: 'Bloat Burst', description: 'His body swells — run from the explosion!' },
                ],
                loot: { gold: 250, xp: 600, karma: 8, soulEssence: 50 },
            },
            {
                id: 'enc_wailing_tunnels',
                type: 'trash',
                name: 'The Wailing Tunnels',
                description: 'Narrow passages where tortured spirits echo. Cinder wraiths materialize from the walls and fissure serpents slither through cracks.',
                roomDesc: 'Winding tunnels with ghostly wails and flickering shadow torches.',
                mobs: [
                    { name: 'Cinder Wraith', hp: 450, dps: 42, color: 0x331100, scale: 1.0, count: 3, mobShape: 'wraith' },
                    { name: 'Fissure Serpent', hp: 650, dps: 32, color: 0x448844, scale: 1.3, count: 2, mobShape: 'serpent' },
                ],
            },
            {
                id: 'enc_sacrificial_pit',
                type: 'trash',
                name: 'The Sacrificial Pit',
                description: 'A ritual chamber where cultists channel dark fire magic. Obsidian golems stand guard as living shields.',
                roomDesc: 'A circular pit ringed with burning braziers and obsidian totems.',
                mobs: [
                    { name: 'Embercrypt Channeler', hp: 700, dps: 50, color: 0xff2200, scale: 1.0, count: 2, mobShape: 'channeler' },
                    { name: 'Obsidian Guardian', hp: 1200, dps: 28, color: 0x221100, scale: 1.6, count: 2, mobShape: 'golem' },
                ],
            },
            {
                id: 'enc_cathedral_nave',
                type: 'trash',
                name: 'Cathedral Nave',
                description: 'The grand hall of the desecrated cathedral. Elite Flameguard knights and infernal hounds bar the way to the Emberlord\'s throne.',
                roomDesc: 'A massive gothic cathedral interior with shattered stained glass and rivers of lava flowing through broken channels.',
                mobs: [
                    { name: 'Flameguard Knight', hp: 1400, dps: 42, color: 0x990000, scale: 1.3, count: 2, mobShape: 'knight' },
                    { name: 'Infernal Hound', hp: 600, dps: 55, color: 0xcc3300, scale: 1.1, count: 3, mobShape: 'hound' },
                ],
            },
            {
                id: 'enc_finalboss_thalkesh',
                type: 'boss',
                name: 'Emberlord Thal\'kesh',
                description: 'The corrupted high priest stands fused to his throne of obsidian and lava. Half man, half volcanic horror — his power over fire is absolute. He summons pillars of flame and rains cinders upon all who challenge him.',
                roomDesc: 'A vast throne room with a lake of magma at its center. The Emberlord\'s throne rises from the molten depths on a spire of black glass.',
                mobs: [
                    { name: 'Emberlord Thal\'kesh', hp: 18000, dps: 75, color: 0xff2200, scale: 2.8, count: 1, isBoss: true, mobShape: 'demonLord' },
                ],
                phases: [
                    { hpThreshold: 0.75, name: 'Volcanic Reckoning', description: 'Lava erupts from the floor! Dodge the geysers!' },
                    { hpThreshold: 0.50, name: 'Summon Flame Guard', description: 'Thal\'kesh calls forth two Flameguard adds!' },
                    { hpThreshold: 0.25, name: 'Infernal Apotheosis', description: 'The Emberlord transforms — all damage increased 50%!' },
                    { hpThreshold: 0.10, name: 'Last Stand', description: 'Thal\'kesh enrages! Kill him NOW or wipe!' },
                ],
                loot: { gold: 1200, xp: 3500, karma: 30, soulEssence: 600 },
            },
        ],
        // Completion rewards (one-time + repeatable)
        firstClearRewards: { gold: 2500, xp: 6000, karma: 60, soulEssence: 1200 },
        repeatRewards: { gold: 600, xp: 1800, karma: 12, soulEssence: 250 },
        estimatedTime: '3-5 min',
    },
];

// ══════════════════════════════════════════════════════════════════════
// DUNGEON INSTANCE STATE
// ══════════════════════════════════════════════════════════════════════

class DungeonInstance {
    constructor(dungeonDef) {
        this.def = dungeonDef;
        this.state = 'queue';       // queue → forming → entering → combat → loot → complete | failed
        this.encounterIndex = 0;
        this.timer = 0;
        this.combatTimer = 0;
        this.totalTime = 0;
        this.phaseTimer = 0;

        // Current encounter combat state
        this.currentMobs = [];      // { name, hp, maxHp, dps, alive, isBoss, color, scale }
        this.partyHp = 100;         // % party health pool (simplified)
        this.partyMaxHp = 100;

        // Boss phase tracking
        this.currentPhaseIndex = -1;
        this.phaseAnnounced = {};
        this._lastPhaseAnnounced = null;   // for HUD alerts

        // Dungeon party NPCs (generated on queue)
        this.partyMembers = [];

        // Chat log
        this.chatLog = [];
        this.chatTimer = 0;
        this.chatPhaseQueue = [];

        // Loot collected
        this.lootCollected = { gold: 0, xp: 0, karma: 0, soulEssence: 0 };

        // Did we already get first-clear?
        this.isFirstClear = false;

        // Encounter transition timer
        this._encounterTransitionTimer = 0;
        this._awaitingNextEncounter = false;
    }
}

// ══════════════════════════════════════════════════════════════════════
// DUNGEON SYSTEM MANAGER
// ══════════════════════════════════════════════════════════════════════

class DungeonSystemManager {
    constructor() {
        this.unlocked = false;
        this.instance = null;           // active DungeonInstance or null
        this.completedDungeons = {};    // { dungeonId: { clears: N, bestTime: N, firstClear: bool } }
        this.cooldownTimer = 0;         // cooldown between dungeon runs
        this.totalClears = 0;

        // Callbacks for 3D scene management (set by main.js)
        this._onEnterDungeon = null;    // (dungeonDef) => void
        this._onLeaveDungeon = null;    // () => void
        this._sceneEntered = false;     // track whether 3D scene is active
    }

    // ── Unlock Check ────────────────────────────────────────────────
    isUnlocked() {
        if (this.unlocked) return true;
        if (gameState.canAccessZone('molten_abyss')) {
            this.unlocked = true;
            return true;
        }
        return false;
    }

    // ── Get Available Dungeons ──────────────────────────────────────
    getAvailableDungeons() {
        return DUNGEON_DEFS.filter(d => {
            return gameState.level >= d.levelRange[0] && gameState.canAccessZone(d.unlockZone);
        });
    }

    // ── Get Dungeon Stats ──────────────────────────────────────────
    getDungeonStats(dungeonId) {
        return this.completedDungeons[dungeonId] || { clears: 0, bestTime: Infinity, firstClear: false };
    }

    // ── Can Queue ──────────────────────────────────────────────────
    canQueue(dungeonId) {
        if (this.instance) return false;
        if (this.cooldownTimer > 0) return false;
        const def = DUNGEON_DEFS.find(d => d.id === dungeonId);
        if (!def) return false;
        if (gameState.level < def.levelRange[0]) return false;
        return true;
    }

    // ── Queue for Dungeon ──────────────────────────────────────────
    queueDungeon(dungeonId) {
        if (!this.canQueue(dungeonId)) return false;
        const def = DUNGEON_DEFS.find(d => d.id === dungeonId);
        if (!def) return false;

        const inst = new DungeonInstance(def);
        inst.state = 'queue';
        
        // Populate party members immediately if player already has a group
        if (partySystem && partySystem.members.length > 0) {
            inst.partyMembers = this._getExistingPartyMembers();
        }

        // If party is full (5-man), the queue pops much faster (simulated group queue)
        if (inst.partyMembers.length >= 4) {
            inst.timer = 2 + Math.random() * 2;
        } else {
            inst.timer = 8 + Math.random() * 7; 
        }
        
        inst.isFirstClear = !this.getDungeonStats(dungeonId).firstClear;

        // Queue phase chat
        this._log(inst, 'SYSTEM', `⚔️ You have entered the Dungeon Finder queue for ${def.name}.`);
        if (inst.partyMembers.length > 0) {
            this._log(inst, 'SYSTEM', `👥 Queuing with ${inst.partyMembers.length} party members...`);
        }

        this.instance = inst;
        gameState.addGameLog(`🏰 Queued for ${def.name}...`);
        gameState.addChatMessage('Game', 'System', `🏰 ${gameState.playerName} has entered the Dungeon Finder queue.`);
        return true;
    }

    /** 
     * Unified logging for Dungeon content.
     * "Dungeon log [System events] should be at top left and the chat parts [Party chat] should be migrated down to the bottom left."
     */
    _log(inst, user, msg, color = null) {
        if (user === 'SYSTEM') {
            // SYSTEM messages (Log events: Clears, Phase Alerts, Descriptions) stay in the Dungeon Log
            inst.chatLog.push({ user, msg, color, time: inst.totalTime });
        } else {
            // Party members (NPC/Player Chat) move to the main chat box (Bottom Left)
            // Use 'Party' channel for dungeon chat
            gameState.addChatMessage('Party', user, msg, color);
        }
    }

    _getExistingPartyMembers() {
        const members = [];
        if (!partySystem) return members;

        for (const pm of partySystem.members) {
            if (members.length >= 4) break;
            members.push({
                id: pm.id,
                name: pm.name,
                classId: pm.classId,
                role: pm.getDisplayClass()?.role || 'DPS',
                level: pm.level,
                dps: pm.getDps(),
                display: pm.getDisplayClass(),
                hp: 100,
                maxHp: 100,
                alive: true,
                isFromParty: true,
            });
        }
        return members;
    }

    // ── Accept Match Found ───────────────────────────────────────────
    acceptMatch() {
        if (!this.instance || this.instance.state !== 'match_found') return;
        
        const inst = this.instance;
        inst.state = 'forming';
        inst.timer = 0;
        inst.phaseTimer = 0;
        inst._lastAnnounced = 0; 
        
        this._log(inst, 'SYSTEM', '✅ Dungeon group accepted! Assembling party...');
    }

    // ── Decline Match Found ──────────────────────────────────────────
    declineMatch() {
        if (!this.instance || this.instance.state !== 'match_found') return;
        this.leaveDungeon();
    }

    // ── Generate Party NPCs ────────────────────────────────────────
    _generateParty() {
        const playerClass = gameState.classId;
        const members = [];
        const usedNames = new Set();

        // Dungeons are 5-man content: 1 Tank, 1 Healer, 3 DPS
        const neededRoles = ['Tank', 'Healer', 'DPS', 'DPS', 'DPS'];
        const playerRole = playerClass === 'warrior' ? 'Tank' : playerClass === 'cleric' ? 'Healer' : 'DPS';
        
        // Remove the player's role from the needed list
        const pIdx = neededRoles.indexOf(playerRole);
        if (pIdx !== -1) neededRoles.splice(pIdx, 1);

        // 1. Pull existing party members from PartySystem first
        if (partySystem && partySystem.members.length > 0) {
            for (const pm of partySystem.members) {
                if (members.length >= 4) break;
                
                // Match a role from neededRoles if possible
                const pmRole = CLASS_DISPLAY[pm.classId]?.role || 'DPS';
                const rIdx = neededRoles.indexOf(pmRole);
                if (rIdx !== -1) {
                    neededRoles.splice(rIdx, 1);
                } else {
                    // If role not strictly needed (e.g. 2nd tank in a 5-man), just pop a DPS slot
                    const dpsIdx = neededRoles.indexOf('DPS');
                    if (dpsIdx !== -1) neededRoles.splice(dpsIdx, 1);
                    else neededRoles.pop(); // Fallback
                }

                members.push({
                    id: pm.id,
                    name: pm.name,
                    classId: pm.classId,
                    role: pmRole,
                    level: pm.level,
                    dps: pm.getDps(),
                    display: pm.getDisplayClass(),
                    hp: 100,
                    maxHp: 100,
                    alive: true,
                    isFromParty: true, // Tag for special UI/Logic
                });
                usedNames.add(pm.name);
            }
        }

        // 2. Fill remaining slots with random simulated players
        for (const role of neededRoles) {
            let classId;
            if (role === 'Tank') classId = 'warrior';
            else if (role === 'Healer') classId = 'cleric';
            else {
                const dpsClasses = CLASS_IDS.filter(c => c !== playerClass && c !== 'warrior' && c !== 'cleric');
                if (dpsClasses.length > 0) {
                    classId = dpsClasses[Math.floor(Math.random() * dpsClasses.length)];
                } else {
                    classId = CLASS_IDS.filter(c => c !== playerClass)[0] || 'ranger';
                }
            }

            let name;
            do {
                const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
                const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
                name = first + suffix;
            } while (usedNames.has(name));
            usedNames.add(name);

            const level = Math.max(gameState.level - 2, 15) + Math.floor(Math.random() * 5);
            const baseDps = Math.floor(gameState.getPlayerOnlyDPS() * (0.6 + Math.random() * 0.5));

            members.push({
                id: `npc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name,
                classId,
                role,
                level: Math.min(level, CONFIG.MAX_LEVEL),
                dps: baseDps,
                display: CLASS_DISPLAY[classId],
                hp: 100,
                maxHp: 100,
                alive: true,
            });
        }

        return members;
    }

    // ── Leave Dungeon ──────────────────────────────────────────────
    leaveDungeon() {
        if (!this.instance) return;
        this.instance = null;
        this.cooldownTimer = 10; // 10s cooldown

        // Exit 3D dungeon scene
        if (this._sceneEntered && this._onLeaveDungeon) {
            this._onLeaveDungeon();
        }
        this._sceneEntered = false;

        gameState.addGameLog('🏰 Left the dungeon.');
    }

    // ── Main Update Loop ───────────────────────────────────────────
    update(dt) {
        if (!this.unlocked) return;

        // Cooldown between runs
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
            case 'loot':
                this._updateLoot(inst, dt);
                break;
            case 'complete':
            case 'failed':
                break;
        }
    }

    // ── QUEUE PHASE ────────────────────────────────────────────────
    _updateQueue(inst, dt) {
        inst.timer -= dt;
        if (inst.timer <= 0) {
            inst.state = 'match_found';
            inst.timer = 40; // 40s to accept match
            
            // Fill remaining slots now so they are visible in the Match Found UI
            if (inst.partyMembers.length < 4) {
                const fullParty = this._generateParty();
                // Merge: keep existing party members (prioritize), fill rest with new ones
                const existingIds = new Set(inst.partyMembers.map(m => m.id));
                for (const m of fullParty) {
                    if (inst.partyMembers.length >= 4) break;
                    if (!existingIds.has(m.id)) {
                        inst.partyMembers.push(m);
                    }
                }
            }

            this._log(inst, 'SYSTEM', '🔔 Dungeon group found! Click the prompt to enter.');
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

    // ── FORMING PHASE ──────────────────────────────────────────────
    _updateForming(inst, dt) {
        inst.phaseTimer += dt;
        const announceInterval = 0.8;
        const announced = Math.floor(inst.phaseTimer / announceInterval);
        const toAnnounce = Math.min(announced, inst.partyMembers.length);

        for (let i = (inst._lastAnnounced || 0); i < toAnnounce; i++) {
            const m = inst.partyMembers[i];
            // Skip "joined" message for persistent party members who were already there
            if (!m.isFromParty) {
                this._log(inst, 'SYSTEM', `${m.display.icon} ${m.name} (${m.display.name}) has joined as ${m.role}.`);
            }
        }
        inst._lastAnnounced = toAnnounce;

        if (inst.phaseTimer >= inst.partyMembers.length * announceInterval + 1.5) {
            inst.state = 'entering';
            inst.timer = 3;
            this._log(inst, 'SYSTEM', `🏰 Entering ${inst.def.name}...`);

            const chat = DUNGEON_CHAT_PHASES.entering;
            // Pick 2-3 entering messages
            const shuffled = [...chat].sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(3, shuffled.length); i++) {
                const chosen = shuffled[i];
                const speaker = this._resolveSpeaker(inst, chosen.from);
                if (speaker) {
                    this._log(inst, speaker.name, chosen.msg, speaker.display.color);
                }
            }
        }
    }

    // ── ENTERING PHASE ─────────────────────────────────────────────
    _updateEntering(inst, dt) {
        inst.timer -= dt;

        // Enter the 3D dungeon scene as soon as entering phase starts
        if (!this._sceneEntered && this._onEnterDungeon) {
            this._sceneEntered = true;
            this._onEnterDungeon(inst.def);
        }

        if (inst.timer <= 0) {
            inst.state = 'combat';
            inst.encounterIndex = 0;
            this._startEncounter(inst);
        }
    }

    // ── START ENCOUNTER ────────────────────────────────────────────
    _startEncounter(inst) {
        const enc = inst.def.encounters[inst.encounterIndex];
        if (!enc) {
            this._completeDungeon(inst);
            return;
        }

        const levelScale = 1 + (gameState.level - inst.def.levelRange[0]) * 0.08;

        inst.currentMobs = [];
        for (const mobDef of enc.mobs) {
            for (let i = 0; i < mobDef.count; i++) {
                inst.currentMobs.push({
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

        const announceIcon = enc.type === 'boss' ? '💀' : enc.type === 'miniboss' ? '⚠️' : '⚔️';
        if (enc.roomDesc) {
            this._log(inst, 'SYSTEM', `📍 ${enc.roomDesc}`);
        }
        this._log(inst, 'SYSTEM', `${announceIcon} ${enc.name} — ${enc.description}`);

        if (enc.type === 'boss' || enc.type === 'miniboss') {
            const bChat = DUNGEON_CHAT_PHASES.bossPhase;
            const picks = [...bChat].sort(() => Math.random() - 0.5).slice(0, 2);
            for (const pick of picks) {
                const speaker = this._resolveSpeaker(inst, pick.from);
                if (speaker) {
                    this._log(inst, speaker.name, pick.msg, speaker.display.color);
                }
            }
        }
    }

    // ── COMBAT UPDATE ──────────────────────────────────────────────
    _updateCombat(inst, dt) {
        // Handle encounter transition delay
        if (inst._awaitingNextEncounter) {
            inst._encounterTransitionTimer -= dt;
            if (inst._encounterTransitionTimer <= 0) {
                inst._awaitingNextEncounter = false;
                if (inst.encounterIndex < inst.def.encounters.length) {
                    this._startEncounter(inst);
                } else {
                    this._completeDungeon(inst);
                }
            }
            return;
        }

        inst.combatTimer += dt;
        const enc = inst.def.encounters[inst.encounterIndex];
        if (!enc) return;

        // ── Party DPS → damage mobs ──
        const playerDps = gameState.getDPS();
        const partyNpcDps = inst.partyMembers.reduce((sum, m) => sum + (m.alive ? m.dps : 0), 0);
        const totalPartyDps = playerDps + partyNpcDps;

        const aliveMobs = inst.currentMobs.filter(m => m.alive);
        if (aliveMobs.length > 0) {
            const focusDmg = totalPartyDps * 0.7 * dt;
            const spreadDmg = totalPartyDps * 0.3 * dt / Math.max(1, aliveMobs.length);

            aliveMobs[0].hp -= focusDmg;
            for (const mob of aliveMobs) {
                mob.hp -= spreadDmg;
                if (mob.hp <= 0) { mob.hp = 0; mob.alive = false; }
            }
        }

        // ── Mob DPS → damage party ──
        const aliveMobsNow = inst.currentMobs.filter(m => m.alive);
        const totalMobDps = aliveMobsNow.reduce((sum, m) => sum + m.dps, 0);
        const tankMitigation = 0.6;
        const effectiveMobDps = totalMobDps * tankMitigation;
        const partyHpPool = 1000 + gameState.level * 50;

        inst.partyHp -= (effectiveMobDps * dt / partyHpPool) * 100;

        // Healer restores HP
        const healerAlive = inst.partyMembers.some(m => m.role === 'Healer' && m.alive);
        if (healerAlive) {
            inst.partyHp += (3.5 * dt);
        }
        inst.partyHp += (1.0 * dt);
        inst.partyHp = Math.min(100, inst.partyHp);

        // ── NPC damage simulation ──
        if (inst.partyHp < 30 && Math.random() < 0.005 * dt) {
            const aliveNpcs = inst.partyMembers.filter(m => m.alive);
            if (aliveNpcs.length > 0) {
                if (aliveNpcs.length > 1 || inst.partyHp < 10) {
                    const victim = aliveNpcs[Math.floor(Math.random() * aliveNpcs.length)];
                    victim.alive = false;
                    victim.hp = 0;
                    this._log(inst, 'SYSTEM', `☠️ ${victim.name} has fallen!`);
                }
            }
        }

        // ── Boss Phase Announcements ──
        if (enc.phases) {
            const bossTarget = inst.currentMobs.find(m => m.isBoss && m.alive);
            if (bossTarget) {
                const hpPct = bossTarget.hp / bossTarget.maxHp;
                for (let pi = 0; pi < enc.phases.length; pi++) {
                    const phase = enc.phases[pi];
                    if (hpPct <= phase.hpThreshold && !inst.phaseAnnounced[pi]) {
                        inst.phaseAnnounced[pi] = true;
                        inst._lastPhaseAnnounced = phase;
                        this._log(inst, 'SYSTEM', `⚠️ PHASE: ${phase.name} — ${phase.description}`);
                        // Phase damage spike
                        inst.partyHp -= 8;
                    }
                }
            }
        }

        // ── Mid-run chat ──
        if (inst.chatTimer > 6 + Math.random() * 8) {
            inst.chatTimer = 0;
            const pool = DUNGEON_CHAT_PHASES.midRun;
            const pick = pool[Math.floor(Math.random() * pool.length)];
            const speaker = this._resolveSpeaker(inst, pick.from);
            if (speaker) {
                this._log(inst, speaker.name, pick.msg, speaker.display.color);
            }
        }

        // ── Check encounter end ──
        const allMobsDead = inst.currentMobs.every(m => !m.alive);
        if (allMobsDead) {
            if (enc.loot) {
                inst.lootCollected.gold += enc.loot.gold || 0;
                inst.lootCollected.xp += enc.loot.xp || 0;
                inst.lootCollected.karma += enc.loot.karma || 0;
                
                // Only collect Soul Essence if Soul Forge is unlocked
                if (soulForge.isUnlocked()) {
                    inst.lootCollected.soulEssence += enc.loot.soulEssence || 0;
                }
            }

            this._log(inst, 'SYSTEM', `✅ ${enc.name} cleared!`);

            // Heal party between encounters
            inst.partyHp = Math.min(100, inst.partyHp + 25);
            // Revive dead NPCs between non-boss encounters
            if (enc.type !== 'boss') {
                for (const m of inst.partyMembers) { m.alive = true; m.hp = 100; }
            }

            inst.encounterIndex++;
            if (inst.encounterIndex < inst.def.encounters.length) {
                // Short delay before next encounter — walk to the next room
                inst._awaitingNextEncounter = true;
                inst._encounterTransitionTimer = 3.0;  // Time for player to walk to next room
            } else {
                this._completeDungeon(inst);
            }
            return;
        }

        // ── Party wipe check ──
        if (inst.partyHp <= 0) {
            inst.state = 'failed';
            inst.partyHp = 0;
            this._log(inst, 'SYSTEM', '☠️ Your party has been defeated!');

            const wipe = DUNGEON_CHAT_PHASES.wipe;
            for (const msg of wipe) {
                const speaker = this._resolveSpeaker(inst, msg.from);
                if (speaker) {
                    this._log(inst, speaker.name, msg.msg, speaker.display.color);
                }
            }

            gameState.addGameLog(`☠️ Dungeon failed: ${inst.def.name}`);
        }
    }

    // ── COMPLETE DUNGEON ───────────────────────────────────────────
    _completeDungeon(inst) {
        inst.state = 'complete';

        const stats = this.completedDungeons[inst.def.id] || { clears: 0, bestTime: Infinity, firstClear: false };
        stats.clears++;
        stats.bestTime = Math.min(stats.bestTime, inst.totalTime);

        const rewards = inst.isFirstClear && !stats.firstClear
            ? inst.def.firstClearRewards
            : inst.def.repeatRewards;

        inst.lootCollected.gold += rewards.gold;
        inst.lootCollected.xp += rewards.xp;
        inst.lootCollected.karma += rewards.karma;

        gameState.gold += inst.lootCollected.gold;
        gameState.addXp(inst.lootCollected.xp);
        gameState.karma += inst.lootCollected.karma;

        if (soulForge.isUnlocked()) {
            inst.lootCollected.soulEssence += rewards.soulEssence || 0;
            soulForge.addSoulEssence(inst.lootCollected.soulEssence);
        }

        if (inst.isFirstClear) stats.firstClear = true;
        this.completedDungeons[inst.def.id] = stats;
        this.totalClears++;

        this._log(inst, 'SYSTEM', `🏆 ${inst.def.name} CLEARED! Time: ${this._formatTime(inst.totalTime)}`);

        const victory = DUNGEON_CHAT_PHASES.victory;
        let delay = 0.5;
        for (const msg of victory.slice(0, 3)) {
            const speaker = this._resolveSpeaker(inst, msg.from);
            if (speaker) {
                this._log(inst, speaker.name, msg.msg, speaker.display.color);
            }
        }

        gameState.addGameLog(`🏆 Dungeon cleared: ${inst.def.name}! +${inst.lootCollected.gold}g, +${inst.lootCollected.xp} XP`);
        gameState.addChatMessage('Game', 'System', `🏆 ${gameState.playerName}'s party has cleared ${inst.def.name}!`);
    }

    // ── LOOT PHASE ─────────────────────────────────────────────────
    _updateLoot(inst, dt) { }

    // ── Helper: Resolve NPC speaker ────────────────────────────────
    _resolveSpeaker(inst, roleKey) {
        if (!roleKey) return null;
        const roleMap = { tank: 'Tank', healer: 'Healer', dps1: 'DPS', dps2: 'DPS' };
        const role = roleMap[roleKey];
        if (!role) return null;

        const matches = inst.partyMembers.filter(m => m.role === role);
        if (matches.length === 0) return null;

        if (roleKey === 'dps2' && matches.length > 1) return matches[1];
        return matches[0];
    }

    _formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    isInDungeon() {
        return this.instance !== null;
    }

    getProgress() {
        if (!this.instance) return null;
        const inst = this.instance;
        return {
            state: inst.state,
            encounterIndex: inst.encounterIndex,
            totalEncounters: inst.def.encounters.length,
            currentEncounter: inst.def.encounters[inst.encounterIndex] || null,
            mobs: inst.currentMobs,
            partyHp: inst.partyHp,
            partyMembers: inst.partyMembers,
            chatLog: inst.chatLog,
            totalTime: inst.totalTime,
            loot: inst.lootCollected,
            dungeonDef: inst.def,
            isFirstClear: inst.isFirstClear,
            lastPhaseAnnounced: inst._lastPhaseAnnounced,
            awaitingNext: inst._awaitingNextEncounter,
        };
    }

    serialize() {
        return {
            unlocked: this.unlocked,
            completedDungeons: this.completedDungeons,
            totalClears: this.totalClears,
        };
    }

    deserialize(data) {
        if (!data) return;
        this.unlocked = data.unlocked || false;
        this.completedDungeons = data.completedDungeons || {};
        this.totalClears = data.totalClears || 0;
    }
}

export const dungeonSystem = new DungeonSystemManager();