// Central Game State Manager - Idle Progression Engine
import { CONFIG } from './config.js';
import { talentTree, bindGameState } from './TalentTree.js';
import { soulForge } from './SoulForge.js';
import { audioManager } from './AudioManager.js';

// Late-bound party system reference (set after module load to avoid circular deps)
let _partySystem = null;
export function bindPartySystem(ps) { _partySystem = ps; }

// Late-bound imports to avoid circular deps (set after module load)
let _goldShop = null;
let _aetherbitShop = null;
export function bindShops(gs, as) { _goldShop = gs; _aetherbitShop = as; }

/** Currency label — used in all UI strings */
export const AETHERBIT_NAME = 'Aetherbits';

// ══════════════════════════════════════════════════════════════════════
// PARAGON MILESTONES — 50 unique unlocks, one per Paragon Level
// Each milestone auto-activates when the player reaches that level.
// Categories: Combat, Defense, Fortune, Mastery, Companion, Party, Prestige (icons in PARAGON_CATEGORY_ICONS)
// ══════════════════════════════════════════════════════════════════════
// Maps each paragon category → icon key from icons.js (used as final fallback)
export const PARAGON_CATEGORY_ICONS = {
    combat:    'paragonCombat',
    defense:   'paragonDefense',
    fortune:   'paragonFortune',
    companion: 'paragonCompanion',
    mastery:   'paragonMastery',
    party:     'paragonParty',
    prestige:  'paragonPrestige',
};

// Per-stat unique icon mapping — every stat gets its own distinct icon (no duplicates)
export const PARAGON_STAT_ICONS = {
    dps:            'paragonDps',
    critDmg:        'paragonCritDmg',
    hp:             'paragonMaxHp',
    crit:           'paragonCrit',
    cdr:            'paragonCdr',
    fortune:        'paragonFortune',
    companionDps:   'paragonCompanionDps',
    companionScale: 'paragonCompanionSize',
    lifesteal:      'paragonLifesteal',
    regen:          'paragonRegen',
    partyDps:       'paragonParty',
    soulEssence:    'paragonSoul',
};

export const PARAGON_MILESTONES = [
    // Lv 1-5: Early rewards — taste of power
    { level: 1,  name: 'Hardened Strikes',       stat: 'dps',            value: 0.05,  desc: '+5% DPS',                             category: 'combat',    color: '#ff6644', iconKey: 'paragonDps' },
    { level: 2,  name: 'Ironblood',              stat: 'hp',             value: 0.05,  desc: '+5% Max HP',                          category: 'defense',   color: '#44aaff', iconKey: 'paragonMaxHp' },
    { level: 3,  name: 'Lucky Coin',             stat: 'fortune',         value: 0.05,  desc: '+5% Gold & XP',                       category: 'fortune',   color: '#ffcc00', iconKey: 'paragonFortune' },
    { level: 4,  name: 'Oversized Companion',    stat: 'companionScale',  value: 0.50,  desc: 'Companion pet grows 1.5× size',       category: 'companion', color: '#66dd66', iconKey: 'paragonCompanionSize' },
    { level: 5,  name: 'Keen Edge',              stat: 'crit',            value: 0.03,  desc: '+3% Crit Chance',                     category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCrit' },

    // Lv 6-10: Building momentum
    { level: 6,  name: 'Savage Blows',           stat: 'critDmg',         value: 0.15,  desc: '+15% Crit Damage',                    category: 'combat',    color: '#ff6644', iconKey: 'paragonCritDmg' },
    { level: 7,  name: 'Companion Fury',         stat: 'companionDps',    value: 0.25,  desc: '+25% Companion DPS',                  category: 'companion', color: '#66dd66', iconKey: 'paragonCompanionDps' },
    { level: 8,  name: 'Vital Surge',            stat: 'regen',           value: 0.15,  desc: '+15% HP Regeneration',                category: 'defense',   color: '#44aaff', iconKey: 'paragonRegen' },
    { level: 9,  name: 'Warband Tactics',        stat: 'partyDps',        value: 0.08,  desc: '+8% Party Member DPS',                category: 'party',     color: '#ffaa33', iconKey: 'paragonParty' },
    { level: 10, name: 'Blade Mastery',          stat: 'dps',            value: 0.08,  desc: '+8% DPS',                             category: 'combat',    color: '#ff6644', iconKey: 'paragonDps2' },

    // Lv 11-15: Mid-tier power spikes
    { level: 11, name: 'Soul Siphon',            stat: 'soulEssence',     value: 0.15,  desc: '+15% Soul Essence from dungeons',     category: 'fortune',   color: '#ffcc00', iconKey: 'paragonSoul' },
    { level: 12, name: 'Blood Drinker',          stat: 'lifesteal',       value: 0.02,  desc: 'Heal 2% of damage dealt',             category: 'defense',   color: '#44aaff', iconKey: 'paragonLifesteal' },
    { level: 13, name: 'Quick Reflexes',         stat: 'cdr',             value: 0.05,  desc: '-5% Skill Cooldowns',                 category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCdr' },
    { level: 14, name: 'Pack Leader',            stat: 'companionDps',    value: 0.25,  desc: '+25% Companion DPS',                  category: 'companion', color: '#66dd66', iconKey: 'paragonCompDps2' },
    { level: 15, name: 'Executioner\'s Gaze',    stat: 'critDmg',         value: 0.20,  desc: '+20% Crit Damage',                    category: 'combat',    color: '#ff6644', iconKey: 'paragonCritDmg2' },

    // Lv 16-20: Getting serious
    { level: 16, name: 'Treasure Hunter',        stat: 'fortune',       value: 0.08,  desc: '+8% Gold & XP',                       category: 'fortune',   color: '#ffcc00', iconKey: 'paragonFortune2' },
    { level: 17, name: 'Fortified Body',         stat: 'hp',             value: 0.10,  desc: '+10% Max HP',                         category: 'defense',   color: '#44aaff', iconKey: 'paragonHp2' },
    { level: 18, name: 'Ruthless Precision',     stat: 'crit',            value: 0.04,  desc: '+4% Crit Chance',                     category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCrit2' },
    { level: 19, name: 'Rally the Squad',        stat: 'partyDps',        value: 0.10,  desc: '+10% Party Member DPS',               category: 'party',     color: '#ffaa33', iconKey: 'paragonParty2' },
    { level: 20, name: 'Warlord\'s Might',       stat: 'dps',             value: 0.10,  desc: '+10% DPS',                            category: 'combat',    color: '#ff6644', iconKey: 'paragonDps3' },

    // Lv 21-25: Hardened veteran
    { level: 21, name: 'Rapid Recovery',         stat: 'regen',           value: 0.20,  desc: '+20% HP Regeneration',                category: 'defense',   color: '#44aaff', iconKey: 'paragonRegen2' },
    { level: 22, name: 'Colossal Companion',     stat: 'companionScale',  value: 0.50,  desc: 'Companion grows another +50% (2× total)', category: 'companion', color: '#66dd66', iconKey: 'paragonCompScale2' },
    { level: 23, name: 'Arcane Tempo',           stat: 'cdr',             value: 0.05,  desc: '-5% Skill Cooldowns',                 category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCdr2' },
    { level: 24, name: 'Golden Chalice',         stat: 'fortune',         value: 0.10,  desc: '+10% Gold & XP',                      category: 'fortune',   color: '#ffcc00', iconKey: 'paragonFortune3' },
    { level: 25, name: 'Devastating Force',      stat: 'dps',             value: 0.12,  desc: '+12% DPS',                            category: 'combat',    color: '#ff6644', iconKey: 'paragonDps4' },

    // Lv 26-30: Elite tier
    { level: 26, name: 'Vampiric Touch',         stat: 'lifesteal',       value: 0.03,  desc: 'Heal 3% of damage dealt (5% total)',  category: 'defense',   color: '#44aaff', iconKey: 'paragonLifesteal2' },
    { level: 27, name: 'Essence Extraction',     stat: 'soulEssence',     value: 0.20,  desc: '+20% Soul Essence from dungeons',     category: 'fortune',   color: '#ffcc00', iconKey: 'paragonSoul2' },
    { level: 28, name: 'Lethal Instinct',        stat: 'critDmg',         value: 0.25,  desc: '+25% Crit Damage',                    category: 'combat',    color: '#ff6644', iconKey: 'paragonCritDmg3' },
    { level: 29, name: 'Beast Bond',             stat: 'companionDps',    value: 0.30,  desc: '+30% Companion DPS',                  category: 'companion', color: '#66dd66', iconKey: 'paragonCompDps3' },
    { level: 30, name: 'Iron Bastion',           stat: 'hp',             value: 0.15,  desc: '+15% Max HP',                         category: 'defense',   color: '#44aaff', iconKey: 'paragonHp3' },

    // Lv 31-35: Legendary power
    { level: 31, name: 'Commander\'s Presence',  stat: 'partyDps',        value: 0.12,  desc: '+12% Party Member DPS',               category: 'party',     color: '#ffaa33', iconKey: 'paragonParty3' },
    { level: 32, name: 'Deadeye Focus',          stat: 'crit',            value: 0.05,  desc: '+5% Crit Chance',                     category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCrit3' },
    { level: 33, name: 'Haste Protocol',         stat: 'cdr',             value: 0.08,  desc: '-8% Skill Cooldowns',                 category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCdr3' },
    { level: 34, name: 'Apex Predator',          stat: 'companionDps',    value: 0.30,  desc: '+30% Companion DPS',                  category: 'companion', color: '#66dd66', iconKey: 'paragonCompDps4' },
    { level: 35, name: 'Titan\'s Strength',      stat: 'dps',            value: 0.15,  desc: '+15% DPS',                            category: 'combat',    color: '#ff6644', iconKey: 'paragonDps5' },

    // Lv 36-40: Mythic ascension
    { level: 36, name: 'Midas Touch',            stat: 'fortune',         value: 0.12,  desc: '+12% Gold & XP',                      category: 'fortune',   color: '#ffcc00', iconKey: 'paragonFortune4' },
    { level: 37, name: 'Undying Will',           stat: 'regen',           value: 0.25,  desc: '+25% HP Regeneration',                category: 'defense',   color: '#44aaff', iconKey: 'paragonRegen3' },
    { level: 38, name: 'Annihilator',            stat: 'critDmg',         value: 0.30,  desc: '+30% Crit Damage',                    category: 'combat',    color: '#ff6644', iconKey: 'paragonCritDmg4' },
    { level: 39, name: 'Warmonger',              stat: 'partyDps',        value: 0.15,  desc: '+15% Party Member DPS',               category: 'party',     color: '#ffaa33', iconKey: 'paragonParty4' },
    { level: 40, name: 'Godslayer\'s Blade',     stat: 'dps',            value: 0.18,  desc: '+18% DPS',                            category: 'combat',    color: '#ff6644', iconKey: 'paragonDps6' },

    // Lv 41-45: Demigod tier
    { level: 41, name: 'Life Warden',            stat: 'lifesteal',     value: 0.03,  desc: 'Heal 3% of damage dealt (8% total)', category: 'defense',   color: '#44aaff', iconKey: 'paragonLifesteal3' },
    { level: 42, name: 'Unyielding Fortress',    stat: 'hp',             value: 0.20,  desc: '+20% Max HP',                         category: 'defense',   color: '#44aaff', iconKey: 'paragonHp4' },
    { level: 43, name: 'War Titan Companion',    stat: 'companionScale',  value: 0.50,  desc: 'Companion grows another +50% (2.5× total)', category: 'companion', color: '#66dd66', iconKey: 'paragonCompScale3' },
    { level: 44, name: 'Chronoshift',            stat: 'cdr',             value: 0.10,  desc: '-10% Skill Cooldowns',                category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCdr4' },
    { level: 45, name: 'Aspect of Carnage',      stat: 'dps',            value: 0.20,  desc: '+20% DPS',                            category: 'combat',    color: '#ff6644', iconKey: 'paragonDps7' },

    // Lv 46-50: Ascendant — the ultimate rewards
    { level: 46, name: 'Eternal Fortune',        stat: 'fortune',         value: 0.15,  desc: '+15% Gold & XP',                      category: 'fortune',   color: '#ffcc00', iconKey: 'paragonFortune5' },
    { level: 47, name: 'Paragon of Precision',   stat: 'crit',            value: 0.06,  desc: '+6% Crit Chance',                     category: 'mastery',   color: '#cc44ff', iconKey: 'paragonCrit4' },
    { level: 48, name: 'Harbinger of Ruin',      stat: 'critDmg',         value: 0.35,  desc: '+35% Crit Damage',                    category: 'combat',    color: '#ff6644', iconKey: 'paragonCritDmg5' },
    { level: 49, name: 'Hivemind Sovereign',     stat: 'companionDps',    value: 0.50,  desc: '+50% Companion DPS',                  category: 'companion', color: '#66dd66', iconKey: 'paragonCompDps5' },
    { level: 50, name: 'Ascendant Paragon',      stat: 'dps',             value: 0.25,  desc: '+25% DPS — You are a living legend',  category: 'prestige',  color: '#ffdd44', iconKey: 'paragonPrestige' },
];

class GameStateManager {
    constructor() {
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = CONFIG.BASE_XP_REQUIRED;
        this.gold = 0;
        this.karma = 0;
        this.hp = CONFIG.PLAYER_BASE_HP;
        this.maxHp = CONFIG.PLAYER_BASE_HP;
        this.mana = CONFIG.PLAYER_BASE_MANA;
        this.maxMana = CONFIG.PLAYER_BASE_MANA;
        this.dps = CONFIG.PLAYER_BASE_DPS;
        this.sustain = 100;
        
        // Current zone
        this.currentZoneId = 'verdant_wilds';
        
        // Stats tracking
        this.totalXpGained = 0;
        this.totalGoldGained = 0;
        this.totalKarmaGained = 0;
        this.totalMobsKilled = 0;
        this.totalEventsCompleted = 0;
        this.totalCrits = 0;
        this.totalGoldSpent = 0;
        this.totalItemsSold = 0;
        this.totalItemsLooted = 0;
        this.totalItemsEnhanced = 0;
        this.totalSkillsUsed = 0;
        this.totalDistanceTraveled = 0;
        this.totalDeaths = 0;
        this.totalClicks = 0;
        this.totalMenuOpens = 0;
        this.totalUnstuckUsed = 0;
        this.totalRareAetherbitsFound = 0;
        this.mobsKilledByZone = {}; // zoneId -> count
        this.totalTimeByZone = {}; // zoneId -> total milliseconds
        this.totalPlayTime = 0;    // total milliseconds across all sessions
        this.sessionStartTime = Date.now();
        
        // XP/Gold rates (rolling average)
        this.xpHistory = [];
        this.goldHistory = [];
        this.xpPerHour = 0;
        this.goldPerMin = 0;
        
        // Current event
        this.currentEvent = null;
        this.eventProgress = 0;
        this.eventTarget = 0;
        this.eventTimeLeft = 0;
        
        // Skills — 8 skill slots
        this.skillCooldowns = [0, 0, 0, 0, 0, 0, 0, 0];
        this._anyCooldownActive = false; // Skip cooldown iteration when no skills are on CD
        this.activeBuffs = [];
        this.defenseBuff = 1.0;       // damage reduction multiplier (lower = more defense)
        this.defenseBuffTimer = 0;
        
        // Death / Downed state
        this.brokenGearTimer = 0;    // Penalty timer after rallying
        
        // Combat state
        this.inCombat = false;
        this.isLoading = false; // New flag for blocking logic during transitions
        this.currentTarget = null;
        this.isAttacking = false;
        this.attackTimer = 0;
        
        // Idle state
        this.isMovingToTarget = false;
        this.isGathering = false;
        this.gatherProgress = 0;
        
        // Game log
        this.gameLog = [];
        
        // Damage buff
        this.damageBuff = 1.0;
        this.damageBuffTimer = 0;

        // Equipment bonuses (set by Inventory.recalcStats)
        this.equipBonusDps = 0;
        this.equipBonusArmor = 0;
        this.equipBonusHp = 0;
        this.equipBonusCrit = 0;
        this.equipBonusMisc = 0;
        
        // Zone change callback — set by main.js
        this._onZoneChange = null;

        // Boss tracking — which zone bosses have been defeated
        this.defeatedBosses = new Set();
        // Currently active boss mob (reference set by MobManager)
        this.activeBoss = null;

        // Settings — game speed, low-res mode, camera mode
        this.gameSpeed = 3.0;       // 1x → 10x multiplier applied to dt (default 3x)
        this.lowResMode = true;     // halves render resolution — default ON for performance
        this.cameraMode = 'locked'; // 'locked' (behind player) or 'dynamic' (free)

        // Tracking — "NEW" indicators for zones & dungeons
        this.seenZoneCount = 1;     // Player starts having seen 1 zone (Verdant Wilds)
        this.seenDungeonCount = 0;  // No dungeons seen initially

        // ── Paragon Mastery — Milestone-based progression ──
        // Unlocked after defeating the final boss (Crimson Reach).
        // Paragon XP is earned from ALL zones at level 60.
        // Max level 50 — each level auto-unlocks a unique milestone reward.
        this.playerName = 'Hero';
        this.classId = 'warrior';
        this.paragonUnlocked = false;
        this.paragonLevel = 0;
        this.paragonXp = 0;
        this.paragonXpToLevel = 25000;

        // Endgame completion flag — all zones scaled to 60
        this.endgameComplete = false;

        // Victory UI callback — set by UI.js
        this._onVictory = null;

        // Endgame world-scaling callback — set by main.js
        // Called when endgameComplete flips to true so the current zone's mobs
        // are immediately respawned at level 60 stats, giving the dramatic
        // "world shift" moment the player expects.
        this._onEndgameActivated = null;

        // Initialize late-bound dependencies
        bindGameState(this);

        this.startNewEvent();
    }

    reset() {
        this.level = 1;
        this.xp = 0;
        this.xpToLevel = CONFIG.BASE_XP_REQUIRED;
        this.gold = 0;
        this.karma = 0;
        this.hp = CONFIG.PLAYER_BASE_HP;
        this.maxHp = CONFIG.PLAYER_BASE_HP;
        this.mana = CONFIG.PLAYER_BASE_MANA;
        this.maxMana = CONFIG.PLAYER_BASE_MANA;
        this.dps = CONFIG.PLAYER_BASE_DPS;
        this.sustain = 100;
        this.currentZoneId = 'verdant_wilds';
        this.totalXpGained = 0;
        this.totalGoldGained = 0;
        this.totalKarmaGained = 0;
        this.totalMobsKilled = 0;
        this.totalEventsCompleted = 0;
        this.totalCrits = 0;
        this.totalGoldSpent = 0;
        this.totalItemsSold = 0;
        this.totalItemsLooted = 0;
        this.totalItemsEnhanced = 0;
        this.totalSkillsUsed = 0;
        this.totalDistanceTraveled = 0;
        this.totalDeaths = 0;
        this.defeatedBosses = new Set();
        this.seenZoneCount = 1;
        this.seenDungeonCount = 0;
        this.endgameComplete = false;
        this.paragonUnlocked = false;
        this.paragonLevel = 0;
        this.paragonXp = 0;
        this.paragonXpToLevel = this._getParagonXpReq(0);
        this.gameLog = [];
        this.chatMessages = [];
        this.skillCooldowns = [0, 0, 0, 0, 0, 0, 0, 0];
        this._anyCooldownActive = false;
        this.activeBuffs = [];
        this.recalcBaseStats();
        this.startNewEvent();
    }

    getCurrentZone() {
        return CONFIG.getZone(this.currentZoneId);
    }

    /** Returns the skills list for the current player class */
    getSkills() {
        if (this.classId === 'mage') return CONFIG.MAGE_SKILLS;
        if (this.classId === 'ranger') return CONFIG.RANGER_SKILLS;
        if (this.classId === 'cleric') return CONFIG.CLERIC_SKILLS;
        return CONFIG.WARRIOR_SKILLS;
    }

    /** Returns true if the player meets the level requirement for a zone AND has defeated previous zone bosses */
    canAccessZone(zoneId) {
        const zone = CONFIG.getZone(zoneId);
        if (!zone) return false;

        // Endgame complete = all zones unlocked regardless of level
        if (this.endgameComplete) return true;

        if (this.level < zone.levelRange[0]) return false;

        // Check if all prior zone bosses are defeated
        const zoneIdx = CONFIG.getZoneIndex(zoneId);
        for (let i = 0; i < zoneIdx; i++) {
            const prevZoneId = CONFIG.ZONES[i].id;
            const prevBoss = CONFIG.getBossForZone(prevZoneId);
            if (prevBoss && !this.defeatedBosses.has(prevZoneId)) {
                return false; // Must defeat prior zone's boss first
            }
        }
        return true;
    }

    /** Check if the zone boss has been defeated */
    isBossDefeated(zoneId) {
        return this.defeatedBosses.has(zoneId);
    }

    /** Mark a zone boss as defeated */
    defeatBoss(zoneId) {
        this.defeatedBosses.add(zoneId);
        this.activeBoss = null;
        const boss = CONFIG.getBossForZone(zoneId);
        const nextZone = CONFIG.getNextZone(zoneId);
        if (boss) {
            this.addGameLog(`BOSS DEFEATED: ${boss.name}!`);
            this.addChatMessage('Game', 'System', `⚔ ${this.playerName} has slain ${boss.name}!`);
        }
        if (nextZone) {
            this.addGameLog(`NEW ZONE UNLOCKED: ${nextZone.name}! Travel there from the Zone menu.`);
            this.addChatMessage('Game', 'System', `🌍 New zone unlocked: ${nextZone.name}! ${nextZone.icon}`);
        }

        // ── ENDGAME: Crimson Reach boss defeated ──
        if (zoneId === 'crimson_reach' && !this.endgameComplete) {
            this.endgameComplete = true;
            this.paragonUnlocked = true;
            this.paragonXpToLevel = this._getParagonXpReq(0);
            this.addGameLog('★ ENDGAME COMPLETE! All zones now scale to level 60!');
            this.addGameLog('★ PARAGON MASTERY UNLOCKED! A new progression system awaits.');
            this.addChatMessage('Game', 'System', '🏆 REALM FIRST: The Crimson Overmind has been destroyed!');
            this.addChatMessage('Game', 'System', '✨ Paragon Mastery system unlocked — a new journey begins!');
            // Trigger endgame world scaling (respawn all mobs at Lv60 stats)
            if (this._onEndgameActivated) {
                this._onEndgameActivated();
            }
            // Trigger victory UI (slight delay so world-scale refresh finishes first)
            if (this._onVictory) {
                setTimeout(() => this._onVictory(), 500);
            }
        }
    }

    /** Paragon XP requirement per level — extremely hard, max 50 */
    _getParagonXpReq(level) {
        // Steep exponential curve: level 1 ~500k, level 25 ~15M, level 50 ~500M
        const base = 500000;
        return Math.floor(base * Math.pow(1.15, level) + level * level * 5000);
    }

    /** Maximum paragon level */
    static get PARAGON_MAX_LEVEL() { return 50; }

    /** Add Paragon XP (called when paragon is unlocked and player earns XP at max level) */
    addParagonXp(amount) {
        if (!this.paragonUnlocked) return;
        if (this.paragonLevel >= 50) return; // Hard cap
        // Aetherbit Paragon Accelerator still applies
        const paragonAccel = _aetherbitShop ? (1 + _aetherbitShop.getParagonXpBonus()) : 1;
        // Paragon fortune bonus from milestones
        const fortuneBonus = 1 + this.getParagonFortuneMult();
        const boosted = Math.floor(amount * paragonAccel * fortuneBonus);
        this.paragonXp += boosted;
        while (this.paragonXp >= this.paragonXpToLevel && this.paragonLevel < 50) {
            this.paragonXp -= this.paragonXpToLevel;
            this.paragonLevel++;
            this.paragonXpToLevel = this._getParagonXpReq(this.paragonLevel);
            const milestone = PARAGON_MILESTONES[this.paragonLevel - 1];
            const unlockName = milestone ? milestone.name : 'Unknown Power';
            this.addGameLog(`★ PARAGON LEVEL ${this.paragonLevel}! Unlocked: ${unlockName}`);
            this.addChatMessage('Game', 'System', `★ ${this.playerName} reached Paragon Level ${this.paragonLevel}! 🏆 ${unlockName}`);
        }
        // Cap at max
        if (this.paragonLevel >= 50) {
            this.paragonXp = 0;
            this.paragonXpToLevel = 0;
        }
    }

    // ── Paragon Milestone Bonus Aggregators ──────────────────────────
    // These scan all unlocked milestones (1..paragonLevel) and sum bonuses.

    /** Get total Paragon DPS multiplier (additive bonus, returned as 1 + sum) */
    getParagonDPSMult() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'dps') bonus += m.value;
        }
        return 1 + bonus;
    }

    /** Get total Paragon HP multiplier */
    getParagonHPMult() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'hp') bonus += m.value;
        }
        return 1 + bonus;
    }

    /** Get total Paragon Gold/XP fortune bonus (additive) */
    getParagonFortuneMult() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'fortune') bonus += m.value;
        }
        return bonus;
    }

    /** Get total Paragon crit/CDR bonus */
    getParagonMasteryBonus() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'crit') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon crit damage bonus */
    getParagonCritDamageBonus() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'critDmg') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon CDR bonus */
    getParagonCDRBonus() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'cdr') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon companion scale bonus */
    getParagonCompanionScale() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'companionScale') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon companion DPS bonus */
    getParagonCompanionDps() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'companionDps') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon regen bonus */
    getParagonRegenBonus() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'regen') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon party DPS bonus */
    getParagonPartyDps() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'partyDps') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon lifesteal bonus */
    getParagonLifesteal() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'lifesteal') bonus += m.value;
        }
        return bonus;
    }

    /** Get paragon soul essence bonus */
    getParagonSoulEssenceBonus() {
        let bonus = 0;
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            const m = PARAGON_MILESTONES[i];
            if (m.stat === 'soulEssence') bonus += m.value;
        }
        return bonus;
    }

    /** Check if a specific paragon milestone stat is unlocked */
    hasParagonMilestone(statKey) {
        for (let i = 0; i < this.paragonLevel && i < PARAGON_MILESTONES.length; i++) {
            if (PARAGON_MILESTONES[i].stat === statKey) return true;
        }
        return false;
    }

    /** Change to a new zone. Returns true if successful. */
    changeZone(zoneId) {
        if (!this.canAccessZone(zoneId)) return false;
        if (zoneId === this.currentZoneId) return false;
        
        const zone = CONFIG.getZone(zoneId);
        this.currentZoneId = zoneId;
        
        // Reset combat state
        this.inCombat = false;
        this.currentTarget = null;
        this.isAttacking = false;
        this.isMovingToTarget = false;
        this.isGathering = false;
        this.gatherProgress = 0;
        
        // Start new zone event
        this.startNewEvent();
        
        this.addGameLog(`Traveled to ${zone.name}.`);
        this.addChatMessage('Game', 'System', `${this.playerName} has entered ${zone.name}.`);
        
        // Auto-start zone quest chain if not already started
        if (this._questLogRef) {
            this._questLogRef.onZoneEnter(zoneId);
        }

        // Update procedural music zone
        audioManager.updateZone(zoneId);
        
        // Trigger zone change callback (rebuilds world, respawns mobs, etc.)
        if (this._onZoneChange) {
            this._onZoneChange(zoneId);
        }
        
        return true;
    }

    getXpRequired(level) {
        // ── XP curve designed for level 60 cap ──
        // Three-phase system:
        //   Phase 1 (Lv 1-49): Polynomial growth with mid-game acceleration.
        //   Phase 2 (Lv 50-59): Exponential "Endgame Grind" ramp.
        //   Phase 3 (Lv 60+): Paragon Mastery (handled by addParagonXp).

        if (level >= CONFIG.MAX_LEVEL) {
            return 0; // At max level, no XP needed
        }

        // Phase 1 (Levels 1-49): base formula: 100 * level^1.8 with mid-game acceleration
        if (level < 50) {
            let xp = Math.floor(CONFIG.BASE_XP_REQUIRED * Math.pow(level, 1.8));
            if (level >= 30) {
                xp = Math.floor(xp * (1.0 + (level - 29) * 0.06));
            }
            return xp;
        }

        // Phase 2 (Levels 50-59): Exponential ramp starting from the level 49 value.
        // This creates the "long tail" required for the final zone (Crimson Reach).
        // Balance: At 1.26 factor the base curve sets the pace for 50-53.
        // Levels 54-59 apply a cumulative 50% XP penalty per level above 53,
        // creating a steep final push that aligns quest completion with level cap.
        let lv49base = Math.floor(CONFIG.BASE_XP_REQUIRED * Math.pow(49, 1.8));
        lv49base = Math.floor(lv49base * (1.0 + (49 - 29) * 0.06));
        
        const growthFactor = 1.26;
        let xp = Math.floor(lv49base * Math.pow(growthFactor, level - 49));
        
        // Hard push: levels 54-59 each require 50% more XP on top of the curve
        if (level >= 54) {
            xp = Math.floor(xp * 1.5);
        }
        
        return xp;
    }

    addXp(amount) {
        // At max level, feed into Paragon system instead
        if (this.level >= CONFIG.MAX_LEVEL) {
            this.totalXpGained += amount;
            if (this.paragonUnlocked) {
                this.addParagonXp(amount);
                // Track XP/hr during paragon progression (stop at Paragon 50)
                if (this.paragonLevel < 50) {
                    const now = Date.now();
                    this.xpHistory.push({ amount, time: now });
                    const cutoff = now - 60000;
                    if (this.xpHistory.length > 0 && this.xpHistory[0].time < cutoff) {
                        let trimIdx = 0;
                        while (trimIdx < this.xpHistory.length && this.xpHistory[trimIdx].time < cutoff) trimIdx++;
                        if (trimIdx > 0) this.xpHistory.splice(0, trimIdx);
                    }
                    let recentXp = 0;
                    for (let i = 0; i < this.xpHistory.length; i++) recentXp += this.xpHistory[i].amount;
                    this.xpPerHour = Math.floor(recentXp * 60);
                } else {
                    this.xpPerHour = 0;
                }
            }
            return;
        }

        // Apply shop XP boost + War Drums kill XP + Aetherbit XP Siphon
        const shopXp = _goldShop ? (1 + _goldShop.xpBoost + _goldShop.getKillXpBonus()) : 1;
        const aetherbitXp = _aetherbitShop ? (1 + _aetherbitShop.getXpBonus()) : 1;
        const xpMult = shopXp * aetherbitXp;
        const boostedXp = Math.floor(amount * xpMult);
        this.xp += boostedXp;
        this.totalXpGained += boostedXp;
        const now = Date.now();
        this.xpHistory.push({ amount, time: now });
        
        // Trim old entries — find cutoff index with binary-ish scan instead of repeated shift()
        const cutoff = now - 60000;
        if (this.xpHistory.length > 0 && this.xpHistory[0].time < cutoff) {
            let trimIdx = 0;
            while (trimIdx < this.xpHistory.length && this.xpHistory[trimIdx].time < cutoff) trimIdx++;
            if (trimIdx > 0) this.xpHistory.splice(0, trimIdx);
        }
        
        // Calculate XP/hr from recent data
        let recentXp = 0;
        for (let i = 0; i < this.xpHistory.length; i++) recentXp += this.xpHistory[i].amount;
        this.xpPerHour = Math.floor(recentXp * 60);
        
        while (this.xp >= this.xpToLevel && this.level < CONFIG.MAX_LEVEL) {
            this.xp -= this.xpToLevel;
            this.level++;
            this.xpToLevel = this.getXpRequired(this.level);
            this.onLevelUp();
        }

        // Cap XP at max level
        if (this.level >= CONFIG.MAX_LEVEL) {
            this.xp = 0;
            this.xpToLevel = 0;
        }
        
        this.addGameLog(`You gained ${amount} XP.`);
    }

    addGold(amount) {
        const goldMult = _goldShop ? (1 + _goldShop.goldBoost + _goldShop.getGoldIncomeBonus()) : 1;
        const paragonMult = this.paragonUnlocked ? (1 + this.getParagonFortuneMult()) : 1;
        const boosted = Math.floor(amount * goldMult * paragonMult);
        this.gold += boosted;
        this.totalGoldGained += boosted;
        const now = Date.now();
        this.goldHistory.push({ amount, time: now });
        
        // Trim old entries — batch splice instead of repeated shift()
        const cutoff = now - 60000;
        if (this.goldHistory.length > 0 && this.goldHistory[0].time < cutoff) {
            let trimIdx = 0;
            while (trimIdx < this.goldHistory.length && this.goldHistory[trimIdx].time < cutoff) trimIdx++;
            if (trimIdx > 0) this.goldHistory.splice(0, trimIdx);
        }
        let recentGold = 0;
        for (let i = 0; i < this.goldHistory.length; i++) recentGold += this.goldHistory[i].amount;
        this.goldPerMin = Math.round(recentGold * 10) / 10;
    }

    addKarma(amount) {
        // Trophy Case (gold shop permanent) + Lucky Horseshoe (gold shop consumable)
        const aetherbitIncMult = _goldShop ? (1 + _goldShop.getAetherbitIncomeBonus() + _goldShop.getAetherbitBoost()) : 1;
        const boosted = Math.floor(amount * aetherbitIncMult);
        this.karma += boosted;
        this.totalKarmaGained += boosted;
    }

    /**
     * Recalculate base stats for the current level.
     * Called on level up AND on save load to ensure stats match the curve.
     * Uses accelerating growth curves designed for a level 60 cap:
     *
     *   HP:   100 → 100,000 at 60 (high-fidelity power fantasy)
     *   Mana:  50 → ~1,000 at 60  (moderate growth)
     *   DPS:    8 → 8,000 at 60   (satisfying power climb)
     *
     * Growth accelerates through mid-game (20-45) and the final stretch
     * (45-60) delivers the biggest per-level gains — rewarding the grind.
     */
    recalcBaseStats() {
        const lv = this.level;
        const t = (lv - 1) / (CONFIG.MAX_LEVEL - 1); // 0.0 at Lv1, 1.0 at Lv60

        // ── HP: 100 → 100,000 ──
        // Blended polynomial growth for massive endgame scaling
        this.maxHp = Math.floor(
            CONFIG.PLAYER_BASE_HP + (t * 40000) + (t * t * 30000) + (t * t * t * 29900)
        );

        // ── Mana: 50 → ~1,000 ──
        this.maxMana = Math.floor(
            CONFIG.PLAYER_BASE_MANA + (t * 400) + (t * t * 300) + (t * t * t * 250)
        );

        // ── DPS: 8 → 8,000 ──
        this.dps = Math.floor(
            CONFIG.PLAYER_BASE_DPS + (t * 3000) + (t * t * 2500) + (t * t * t * 2492)
        );
    }

    onLevelUp() {
        // Recalculate base stats from the curve
        this.recalcBaseStats();

        // Full heal on level up
        this.hp = this.maxHp;
        this.mana = this.maxMana;
        
        const talentMsg = this.level >= 2 ? ' (+1 Talent Point)' : '';
        const maxMsg = this.level >= CONFIG.MAX_LEVEL ? ' ★ MAX LEVEL REACHED! ★' : '';
        this.addGameLog(`LEVEL UP! You are now level ${this.level}!${talentMsg}${maxMsg}`);
        this.addChatMessage('Game', 'System', `${this.playerName} has reached level ${this.level}!${maxMsg}`);

        if (this.level >= CONFIG.MAX_LEVEL) {
            this.addChatMessage('Game', 'System', `🏆 ${this.playerName} has reached the maximum level! Congratulations!`);
        }

        // Check if a new skill unlocks at this level
        const classSkills = this.getSkills();
        const newSkill = classSkills.find(s => s.unlockLevel === this.level);
        if (newSkill) {
            this.addGameLog(`NEW ABILITY UNLOCKED: ${newSkill.name}!`);
            this.addChatMessage('Game', 'System', `${this.playerName} learned ${newSkill.name}!`);
        }

        // Check if a new zone unlocks at this level
        for (const zone of CONFIG.ZONES) {
            if (zone.levelRange[0] === this.level) {
                this.addGameLog(`NEW ZONE UNLOCKED: ${zone.name}!`);
                this.addChatMessage('Game', 'System', `New zone unlocked: ${zone.name}! ${zone.icon}`);
            }
        }

        // Notify quest log so pending quests can unlock
        if (this._questLogRef) this._questLogRef.onLevelUp();
    }

    /** Called once after both gameState and questLog are created */
    setQuestLog(ql) {
        this._questLogRef = ql;
    }

    takeDamage(amount) {
        // Apply armor damage reduction + active defense buff + gold shop defense buff
        let reduced = Math.floor(amount * (1 - this.getArmorReduction()));
        reduced = Math.floor(reduced * this.defenseBuff);
        // Gold shop Ironbark Tonic reduces damage further
        const shopDefense = _goldShop ? (1 - _goldShop.defenseBoost) : 1;
        reduced = Math.floor(reduced * shopDefense);
        // Aetherbit Ironclad Constitution — flat damage reduction
        const ironcladDR = _aetherbitShop ? (1 - _aetherbitShop.getDamageReduction()) : 1;
        reduced = Math.floor(reduced * ironcladDR);
        this.hp = Math.max(0, this.hp - reduced);
        if (this.hp <= 0) {
            this.hp = this.getEffectiveMaxHp();
            this.totalDeaths++;
            this.brokenGearTimer = 15; // 15s debuff on rally
            this.addGameLog('You were downed! Rallied with Broken Gear (-25% DPS/Regen).');
        }
    }

    /** Check if a skill is unlocked at current level */
    isSkillUnlocked(index) {
        const skill = this.getSkills()[index];
        return skill && this.level >= skill.unlockLevel;
    }

    healPlayer(amount) {
        this.hp = Math.min(this.getEffectiveMaxHp(), this.hp + amount);
    }

    getDPS() {
        const shopDmgBoost = _goldShop ? (1 + _goldShop.damageBoost) : 1;
        const aetherbitDps = _aetherbitShop ? (1 + _aetherbitShop.getBaseDPSBonus()) : 1;
        // Mercenary Contract consumable adds flat DPS %
        const mercBoost = _goldShop ? (1 + _goldShop.getMercenaryBoost()) : 1;
        // Whetstone Kit (gold shop permanent) — flat % DPS increase
        const whetstoneBoost = _goldShop ? (1 + _goldShop.getFlatDpsBonus()) : 1;
        const base = (this.dps + this.equipBonusDps) * this.damageBuff * shopDmgBoost * mercBoost * whetstoneBoost;
        const soulForgeDps = soulForge.getDPSMultiplier();
        let finalDps = Math.floor(base * talentTree.getDPSMultiplier() * this.getParagonDPSMult() * aetherbitDps * soulForgeDps);
        
        // Broken Gear Penalty (-25%)
        if (this.brokenGearTimer > 0) {
            finalDps = Math.floor(finalDps * 0.75);
        }

        // Party DPS contribution (each member adds their own DPS)
        if (_partySystem && _partySystem.members.length > 0) {
            finalDps += _partySystem.getTotalPartyDps();
        }
        
        return finalDps;
    }

    /** Get player-only DPS (excludes party) for display purposes */
    getPlayerOnlyDPS() {
        const shopDmgBoost = _goldShop ? (1 + _goldShop.damageBoost) : 1;
        const aetherbitDps = _aetherbitShop ? (1 + _aetherbitShop.getBaseDPSBonus()) : 1;
        const mercBoost = _goldShop ? (1 + _goldShop.getMercenaryBoost()) : 1;
        const whetstoneBoost = _goldShop ? (1 + _goldShop.getFlatDpsBonus()) : 1;
        const base = (this.dps + this.equipBonusDps) * this.damageBuff * shopDmgBoost * mercBoost * whetstoneBoost;
        const soulForgeDps = soulForge.getDPSMultiplier();
        let finalDps = Math.floor(base * talentTree.getDPSMultiplier() * this.getParagonDPSMult() * aetherbitDps * soulForgeDps);
        if (this.brokenGearTimer > 0) finalDps = Math.floor(finalDps * 0.75);
        return finalDps;
    }

    getEffectiveMaxHp() {
        // Battle Rations (gold shop permanent) adds % max HP
        const rationBonus = _goldShop ? (1 + _goldShop.getMaxHpBonus()) : 1;
        const soulForgeHp = soulForge.getHPMultiplier();
        return Math.floor((this.maxHp + this.equipBonusHp) * talentTree.getHPMultiplier() * this.getParagonHPMult() * rationBonus * soulForgeHp);
    }

    getArmorReduction() {
        // Each point of armor reduces incoming damage by ~0.5%, boosted by talent
        const armor = this.equipBonusArmor * talentTree.getArmorMultiplier();
        return Math.min(0.5, armor * 0.005); // Lowered cap to 50% for more danger
    }

    /** Effective crit chance (base 15% + talent + gear + paragon + aetherbit + soul forge) */
    getEffectiveCritChance() {
        const aetherbitCrit = _aetherbitShop ? _aetherbitShop.getCritChanceBonus() : 0;
        return 0.15 + talentTree.getCritChance() + (this.equipBonusCrit * 0.005) + this.getParagonMasteryBonus() + aetherbitCrit + soulForge.getCritBonus();
    }

    /** Effective crit damage multiplier (base 2x + talent bonus + aetherbit + soul forge + paragon) */
    getEffectiveCritDamage() {
        const aetherbitCritDmg = _aetherbitShop ? _aetherbitShop.getCritDamageBonus() : 0;
        return 2.0 + talentTree.getCritDamageBonus() + aetherbitCritDmg + soulForge.getCritDamageBonus() + this.getParagonCritDamageBonus();
    }

    /** Effective max mana with talent bonus */
    getEffectiveMaxMana() {
        return Math.floor(this.maxMana * talentTree.getManaMultiplier());
    }

    /**
     * Returns true if the player has out-leveled the current zone.
     * This means:
     *   - Player level is ABOVE the zone's max level range
     *   - The zone boss has been defeated (story is done)
     *   - Endgame is NOT yet active (endgame scales all zones to 60)
     *
     * When true: mobs yield no XP, no new quests are given (current quest can still finish).
     */
    isCurrentZoneOutleveled() {
        if (this.endgameComplete) return false; // endgame zones scale to 60, always relevant
        const zone = this.getCurrentZone();
        if (!zone) return false;
        if (this.level <= zone.levelRange[1]) return false; // still within zone level range
        // Player is above zone max — check if boss is defeated (zone story complete)
        const boss = CONFIG.getBossForZone(zone.id);
        if (boss && !this.defeatedBosses.has(zone.id)) return false; // boss not defeated, zone still active
        return true;
    }

    getMobStats(mobType) {
        // ── Mob stat scaling for level 60 cap ──
        // Mobs scale alongside the player's stat curve to maintain balanced combat.
        // Uses the same normalized t value as player stats for consistent pacing.
        //
        // Mob HP should require 3-6 hits to kill at-level with base DPS.
        // Mob damage should take ~15-25 hits to kill the player (without healing).
        // XP/gold rewards scale to match the XP-per-level curve at each tier.

        // ── Endgame zone scaling: all zones scale to level 60 after completing endgame ──
        const baseLv = Math.max(1, this.level);
        const lv = this.endgameComplete ? CONFIG.MAX_LEVEL : baseLv;
        const t = (lv - 1) / (CONFIG.MAX_LEVEL - 1); // 0.0 at Lv1, 1.0 at Lv60

        // ── Mob HP: 40 → 40,000 ──
        const hp = Math.floor(
            CONFIG.BASE_MOB_HP + (t * 15000) + (t * t * 12000) + (t * t * t * 12960)
        );

        // ── Mob Damage: 8 → 15,000 ──
        // Increased damage scaling to challenge high-health players and percentage-based regen.
        const damage = Math.floor(
            CONFIG.BASE_MOB_DAMAGE + (t * 5000) + (t * t * 5000) + (t * t * t * 4992)
        );

        // XP Reward: scales with the XP curve so kill-to-level ratio stays sane
        // At level 1: 25 XP (need 4 kills), at level 59: ~25,000 XP
        const xpReward = Math.floor(
            CONFIG.BASE_XP_REWARD * (1 + t * 20 + t * t * 80 + t * t * t * 900)
        );

        // Gold Reward: 3 → ~500 at 60
        const goldReward = Math.floor(
            CONFIG.BASE_GOLD_REWARD * (1 + t * 20 + t * t * 60 + t * t * t * 80)
        );

        // Karma: 1 → ~50 at 60
        const karmaReward = Math.floor(
            CONFIG.BASE_KARMA_REWARD + (t * 15) + (t * t * 34)
        );

        return { hp, damage, xpReward, goldReward, karmaReward };
    }

    startNewEvent() {
        const zone = this.getCurrentZone();
        const events = zone.eventTypes;
        const evt = events[Math.floor(Math.random() * events.length)];
        this.currentEvent = evt;
        this.eventProgress = 0;
        this.eventTarget = evt.target + Math.floor(this.level * 0.3);
        this.eventTimeLeft = CONFIG.EVENT_DURATION + this.level * 2;
    }

    progressEvent(amount = 1) {
        this.eventProgress = Math.min(this.eventTarget, this.eventProgress + amount);
        if (this.eventProgress >= this.eventTarget) {
            this.completeEvent();
        }
    }

    completeEvent() {
        // Use current level XP req, or last pre-cap level if at max
        const xpBase = this.level >= CONFIG.MAX_LEVEL
            ? this.getXpRequired(CONFIG.MAX_LEVEL - 1)
            : this.getXpRequired(this.level);
        const bonusXp = Math.floor(xpBase * 0.15);
        const bonusGold = Math.floor(5 + this.level * 2);
        const bonusKarma = 10 + this.level;
        
        this.addXp(bonusXp);
        this.addGold(bonusGold);
        this.addKarma(bonusKarma);
        this.totalEventsCompleted++;
        
        this.addGameLog(`Event Complete! +${bonusXp} XP, +${bonusGold}g, +${bonusKarma} Karma`);
        this.addChatMessage('Game', 'System', `Event "${this.currentEvent.name}" completed!`);
        
        // Start new event after delay
        setTimeout(() => this.startNewEvent(), 3000);
    }

    updateSkillCooldowns(dt) {
        // Track whether any cooldown is active to skip iteration when all clear
        if (this._anyCooldownActive) {
            let anyActive = false;
            for (let i = 0; i < this.skillCooldowns.length; i++) {
                if (this.skillCooldowns[i] > 0) {
                    this.skillCooldowns[i] = Math.max(0, this.skillCooldowns[i] - dt);
                    if (this.skillCooldowns[i] > 0) anyActive = true;
                }
            }
            this._anyCooldownActive = anyActive;
        }
        
        if (this.damageBuffTimer > 0) {
            this.damageBuffTimer -= dt;
            if (this.damageBuffTimer <= 0) {
                this.damageBuff = 1.0;
            }
        }
        if (this.defenseBuffTimer > 0) {
            this.defenseBuffTimer -= dt;
            if (this.defenseBuffTimer <= 0) {
                this.defenseBuff = 1.0;
            }
        }
    }

    useSkill(index) {
        const skill = this.getSkills()[index];
        if (!skill || this.skillCooldowns[index] > 0) return false;
        if (!this.isSkillUnlocked(index)) return false;
        
        // Check mana cost
        const cost = skill.manaCost || 0;
        if (cost > 0 && this.mana < cost) return false;
        
        // Spend mana
        if (cost > 0) this.mana -= cost;
        
        // Apply cooldown with talent CDR + aetherbit CDR + soul forge CDR
        const cdr = talentTree.getCooldownReduction() + (_aetherbitShop ? _aetherbitShop.getCooldownReduction() : 0) + soulForge.getCDRBonus();
        this.skillCooldowns[index] = skill.cooldown * Math.max(0.2, 1 - cdr);
        this._anyCooldownActive = true;
        this.totalSkillsUsed = (this.totalSkillsUsed || 0) + 1;
        
        // Apply buff effects (with talent buff duration bonus)
        const buffDurBonus = 1 + talentTree.getBuffDurationBonus();
        if (skill.buffType === 'damage') {
            this.damageBuff = skill.buffValue || 1.6;
            this.damageBuffTimer = (skill.buffDuration || 10) * buffDurBonus;
            this.addGameLog(`${skill.name}! +${Math.round((this.damageBuff - 1) * 100)}% damage for ${Math.round(this.damageBuffTimer)}s`);
        } else if (skill.buffType === 'defense') {
            this.defenseBuff = skill.buffValue || 0.5;
            this.defenseBuffTimer = (skill.buffDuration || 8) * buffDurBonus;
            this.addGameLog(`${skill.name}! -${Math.round((1 - this.defenseBuff) * 100)}% damage taken for ${Math.round(this.defenseBuffTimer)}s`);
        }
        
        return true;
    }

    updateSustain() {
        // Sustain based on HP ratio
        this.sustain = Math.floor((this.hp / this.maxHp) * 100);
    }

    update(dt) {
        // Track real wall-clock time (not inflated by game speed)
        const realDt = dt / (this.gameSpeed || 1);
        const zoneId = this.currentZoneId;
        if (!this.totalTimeByZone[zoneId]) this.totalTimeByZone[zoneId] = 0;
        this.totalTimeByZone[zoneId] += realDt * 1000; // convert to ms
        this.totalPlayTime += realDt * 1000; // total character playtime

        // Passive HP regen scaled by percentage of Max HP
        const regenMult = talentTree.getRegenMultiplier();
        // Gold shop: consumable regen boost + permanent healing well bonus
        const shopRegenBoost = _goldShop ? (1 + _goldShop.regenBoost + _goldShop.getPassiveRegenBonus()) : 1;
        // Aetherbit: Enchanted Vitality permanent HP regen increase
        const aetherbitRegenBoost = _aetherbitShop ? (1 + _aetherbitShop.getHpRegenBonus()) : 1;
        let totalRegenMult = regenMult * shopRegenBoost * aetherbitRegenBoost;
        
        // Broken Gear Penalty (-25% regen)
        if (this.brokenGearTimer > 0) {
            totalRegenMult *= 0.75;
            this.brokenGearTimer = Math.max(0, this.brokenGearTimer - dt);
        }
        
        const effectiveMaxHp = this.getEffectiveMaxHp();
        const baseRegenAmount = effectiveMaxHp * CONFIG.SUSTAIN_REGEN_RATE;

        if (!this.inCombat) {
            this.healPlayer(baseRegenAmount * 2 * dt * totalRegenMult);
        } else {
            // Combat regen is significantly lower to ensure mobs feel dangerous
            this.healPlayer(baseRegenAmount * 0.25 * dt * totalRegenMult);
        }
        
        this.updateSkillCooldowns(dt);
        this.updateSustain();
        
        // Mana regen (boosted by talent)
        const effectiveMaxMana = this.getEffectiveMaxMana();
        this.mana = Math.min(effectiveMaxMana, this.mana + 2 * dt * talentTree.getManaRegenMultiplier());
        
        // Event timer
        if (this.currentEvent && this.eventProgress < this.eventTarget) {
            this.eventTimeLeft = Math.max(0, this.eventTimeLeft - dt);
            if (this.eventTimeLeft <= 0) {
                this.addGameLog('Event expired. New event starting...');
                this.startNewEvent();
            }
        }
    }

    // Version counter — incremented on every chat or log addition for reliable UI change detection
    chatVersion = 0;

    addGameLog(msg) {
        this.gameLog.push({ msg, time: Date.now() });
        if (this.gameLog.length > 50) this.gameLog.shift();
        this.chatVersion++;
    }

    // Chat messages stored separately
    chatMessages = [];
    
    addBossChatMessage(bossName, msg, bossColor = '#cc3344') {
        this.chatMessages.push({ 
            channel: 'Boss', 
            user: bossName, 
            msg, 
            time: Date.now(), 
            isBoss: true,
            color: bossColor 
        });
        if (this.chatMessages.length > 50) this.chatMessages.shift();
        this.chatVersion++;
    }

    addChatMessage(channel, user, msg, color = null) {
        this.chatMessages.push({ channel, user, msg, time: Date.now(), color });
        if (this.chatMessages.length > 50) this.chatMessages.shift();
        this.chatVersion++;
    }

    getEventPercent() {
        if (!this.currentEvent) return 0;
        return Math.floor((this.eventProgress / this.eventTarget) * 100);
    }

    getEstCompletion() {
        if (!this.currentEvent || this.eventProgress >= this.eventTarget) return 0;
        const remaining = this.eventTarget - this.eventProgress;
        // Estimate based on kill/gather rate
        return Math.floor(remaining * 5); // rough 5s per action
    }

    formatGold(amount) {
        if (amount >= 10000) return (amount / 1000).toFixed(1) + 'k';
        return amount.toString();
    }
}

export const gameState = new GameStateManager();
