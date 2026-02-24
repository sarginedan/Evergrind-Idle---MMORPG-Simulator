// SaveManager — Autosave & Load for Evergrind Idle
// Persists gameState, questLog, and inventory to localStorage
import { CONFIG } from './config.js';
import { gameState } from './GameState.js';
import { questLog } from './QuestLog.js';
import { inventory, getNextItemId, setNextItemId } from './Inventory.js';
import { talentTree } from './TalentTree.js';
import { upgradeStation } from './UpgradeStation.js';
import { goldShop } from './GoldShop.js';
import { aetherbitShop } from './AetherbitShop.js';
import { iconImgLg } from './icons.js';
import { achievementManager } from './Achievements.js';
import { partySystem } from './PartySystem.js';
import { soulForge } from './SoulForge.js';
import { dungeonSystem } from './DungeonSystem.js';
import { companionSystem } from './CompanionSystem.js';
import { battlegroundSystem } from './BattlegroundSystem.js';
import { pvpVendor } from './PvPVendor.js';
import { raidSystem } from './RaidSystem.js';
import { raidVendor } from './RaidVendor.js';

const BASE_SAVE_KEY = 'evergrind_slot_';
const METADATA_KEY = 'evergrind_metadata_v1';
const AUTOSAVE_INTERVAL = 30; // seconds

// ── Rarity lookup (mirrors Inventory.js RARITIES) ──────────────────
const RARITIES_LOOKUP = {
    'Common':    { name: 'Common',    color: '#aabbaa', weight: 50, statMult: 1.0,  prefix: '' },
    'Uncommon':  { name: 'Uncommon',  color: '#44cc44', weight: 30, statMult: 1.3,  prefix: 'Fine ' },
    'Rare':      { name: 'Rare',      color: '#4488ff', weight: 14, statMult: 1.7,  prefix: 'Superior ' },
    'Exotic':    { name: 'Exotic',    color: '#ffaa00', weight: 5,  statMult: 2.2,  prefix: 'Exotic ' },
    'Legendary': { name: 'Legendary', color: '#cc44ff', weight: 1,  statMult: 3.0,  prefix: 'Legendary ' },
};

function rarityFromName(name) {
    return RARITIES_LOOKUP[name] || RARITIES_LOOKUP['Common'];
}

// ── Item serialization ──────────────────────────────────────────────

function serializeItem(item) {
    if (!item) return null;
    // Strip the computed `icon` HTML — we'll rebuild from iconKey on load
    const { icon, rarity, ...rest } = item;
    return {
        ...rest,
        rarityName: rarity ? rarity.name : 'Common',
        // Persist upgrade data
        upgradeTier: item.upgradeTier || 0,
        _baseDps: item._baseDps ?? null,
        _baseArmor: item._baseArmor ?? null,
        _baseBonus: item._baseBonus ?? null,
        _baseBonusStatValue: item._baseBonusStatValue ?? null,
    };
}

function deserializeItem(data) {
    if (!data) return null;
    const { rarityName, ...rest } = data;
    const rarity = rarityFromName(rarityName);
    return {
        ...rest,
        rarity,
        icon: iconImgLg(rest.iconKey || 'sword', 22),
    };
}

// ── Build save payload ──────────────────────────────────────────────

function buildSaveData() {
    return {
        version: 1,
        timestamp: Date.now(),

        // ─ GameState ─
        gs: {
            playerName: gameState.playerName,
            classId: gameState.classId,
            level: gameState.level,
            xp: gameState.xp,
            xpToLevel: gameState.xpToLevel,
            gold: gameState.gold,
            karma: gameState.karma,
            hp: gameState.hp,
            maxHp: gameState.maxHp,
            mana: gameState.mana,
            maxMana: gameState.maxMana,
            dps: gameState.dps,
            sustain: gameState.sustain,
            // Stats tracking
            totalXpGained: gameState.totalXpGained,
            totalGoldGained: gameState.totalGoldGained,
            totalKarmaGained: gameState.totalKarmaGained,
            totalMobsKilled: gameState.totalMobsKilled,
            totalEventsCompleted: gameState.totalEventsCompleted,
            totalCrits: gameState.totalCrits,
            totalGoldSpent: gameState.totalGoldSpent,
            totalItemsSold: gameState.totalItemsSold,
            totalItemsEnhanced: gameState.totalItemsEnhanced,
            totalSkillsUsed: gameState.totalSkillsUsed,
            totalDeaths: gameState.totalDeaths,
            totalClicks: gameState.totalClicks,
            totalMenuOpens: gameState.totalMenuOpens,
            totalUnstuckUsed: gameState.totalUnstuckUsed,
            totalRareAetherbitsFound: gameState.totalRareAetherbitsFound,
            totalItemsLooted: gameState.totalItemsLooted,
            totalDistanceTraveled: gameState.totalDistanceTraveled,
            mobsKilledByZone: { ...gameState.mobsKilledByZone },
            totalTimeByZone: { ...gameState.totalTimeByZone },
            totalPlayTime: gameState.totalPlayTime,
            // Equipment bonuses
            equipBonusDps: gameState.equipBonusDps,
            equipBonusArmor: gameState.equipBonusArmor,
            equipBonusHp: gameState.equipBonusHp,
            equipBonusCrit: gameState.equipBonusCrit,
            equipBonusMisc: gameState.equipBonusMisc,
            // Damage buff
            damageBuff: gameState.damageBuff,
            damageBuffTimer: gameState.damageBuffTimer,
            // Zone
            currentZoneId: gameState.currentZoneId,
            // Boss tracking
            defeatedBosses: Array.from(gameState.defeatedBosses),
            // Settings
            gameSpeed: gameState.gameSpeed,
            lowResMode: gameState.lowResMode,
            cameraMode: gameState.cameraMode,
            // NEW indicators
            seenZoneCount: gameState.seenZoneCount,
            seenDungeonCount: gameState.seenDungeonCount,
            // Paragon Mastery (milestone-based, max 50)
            paragonUnlocked: gameState.paragonUnlocked,
            paragonLevel: gameState.paragonLevel,
            paragonXp: gameState.paragonXp,
            paragonXpToLevel: gameState.paragonXpToLevel,
            endgameComplete: gameState.endgameComplete,
        },

        // ─ Quest Log ─
        ql: {
            completedIds: Array.from(questLog.completedIds),
            totalQuestsCompleted: questLog.totalQuestsCompleted,
            killsByMobName: { ...questLog.killsByMobName },
            totalHerbsGathered: questLog.totalHerbsGathered,
            totalOreGathered: questLog.totalOreGathered,
            pendingNext: questLog._pendingNext || null,
            // Serialize active quests with their current objective progress
            activeQuests: questLog.activeQuests.map(q => ({
                id: q.id,
                objectives: q.objectives.map(o => ({ current: o.current })),
                completed: q.completed,
            })),
        },

        // ─ Inventory ─
        inv: {
            equipped: {},
            items: inventory.items.map(serializeItem),
            nextItemId: getNextItemId(),
        },

        // ─ Talent Tree ─
        talents: talentTree.serialize(),

        // ─ Upgrade Station ─
        upgrades: upgradeStation.serialize(),

        // ─ Gold Shop ─
        goldShop: goldShop.serialize(),

        // ─ Aetherbit Shop ─
        aetherbitShop: aetherbitShop.serialize(),

        // ─ Achievements ─
        achievements: achievementManager.serialize(),

        // ─ Party System ─
        party: partySystem.serialize(),

        // ─ Soul Forge ─
        soulForge: soulForge.serialize(),

        // ─ Dungeons ─
        dungeons: dungeonSystem.serialize(),

        // ─ Companion System ─
        companion: companionSystem.serialize(),

        // ─ Battleground System ─
        battleground: battlegroundSystem.serialize(),

        // ─ PvP Vendor ─
        pvpVendor: pvpVendor.serialize(),

        // ─ Raid System ─
        raids: raidSystem.serialize(),

        // ─ Raid Vendor ─
        raidVendor: raidVendor.serialize(),
    };
}

// ── Apply save data to living singletons ────────────────────────────

function applySaveData(data) {
    if (!data || data.version !== 1) return false;

    // ─ GameState ─
    const gs = data.gs;
    if (gs) {
        gameState.playerName = gs.playerName || 'Hero';
        gameState.classId = gs.classId || 'warrior';
        // ── Level cap migration: clamp level to MAX_LEVEL ──
        gameState.level = Math.min(gs.level || 1, CONFIG.MAX_LEVEL);
        gameState.gold = gs.gold || 0;
        gameState.karma = gs.karma || 0;
        gameState.sustain = gs.sustain != null ? gs.sustain : 100;
        gameState.totalXpGained = gs.totalXpGained || 0;
        gameState.totalGoldGained = gs.totalGoldGained || 0;
        gameState.totalKarmaGained = gs.totalKarmaGained || 0;
        gameState.totalMobsKilled = gs.totalMobsKilled || 0;
        gameState.totalEventsCompleted = gs.totalEventsCompleted || 0;
        gameState.totalCrits = gs.totalCrits || 0;
        gameState.totalGoldSpent = gs.totalGoldSpent || 0;
        gameState.totalItemsSold = gs.totalItemsSold || 0;
        gameState.totalItemsEnhanced = gs.totalItemsEnhanced || 0;
        gameState.totalSkillsUsed = gs.totalSkillsUsed || 0;
        gameState.totalDeaths = gs.totalDeaths || 0;
        gameState.totalClicks = gs.totalClicks || 0;
        gameState.totalMenuOpens = gs.totalMenuOpens || 0;
        gameState.totalUnstuckUsed = gs.totalUnstuckUsed || 0;
        gameState.totalRareAetherbitsFound = gs.totalRareAetherbitsFound || 0;
        gameState.totalItemsLooted = gs.totalItemsLooted || 0;
        gameState.totalDistanceTraveled = gs.totalDistanceTraveled || 0;
        gameState.mobsKilledByZone = gs.mobsKilledByZone || {};
        gameState.totalTimeByZone = gs.totalTimeByZone || {};
        gameState.totalPlayTime = gs.totalPlayTime || 0;
        gameState.equipBonusDps = gs.equipBonusDps || 0;
        gameState.equipBonusArmor = gs.equipBonusArmor || 0;
        gameState.equipBonusHp = gs.equipBonusHp || 0;
        gameState.equipBonusCrit = gs.equipBonusCrit || 0;
        gameState.equipBonusMisc = gs.equipBonusMisc || 0;
        gameState.damageBuff = gs.damageBuff || 1.0;
        gameState.damageBuffTimer = gs.damageBuffTimer || 0;
        gameState.currentZoneId = gs.currentZoneId || 'verdant_wilds';
        gameState.defeatedBosses = new Set(gs.defeatedBosses || []);
        gameState.gameSpeed = gs.gameSpeed != null ? Math.max(1, Math.min(10, gs.gameSpeed)) : 3.0;
        gameState.lowResMode = gs.lowResMode !== undefined ? gs.lowResMode : true;
        gameState.cameraMode = gs.cameraMode || 'locked';
        gameState.seenZoneCount = gs.seenZoneCount != null ? gs.seenZoneCount : 1;
        gameState.seenDungeonCount = gs.seenDungeonCount != null ? gs.seenDungeonCount : 0;

        // ── Paragon Mastery restoration (milestone-based, max 50) ──
        gameState.paragonUnlocked = gs.paragonUnlocked || false;
        gameState.paragonLevel = Math.min(gs.paragonLevel || 0, 50);
        gameState.paragonXp = gs.paragonXp || 0;
        gameState.paragonXpToLevel = gameState.paragonLevel >= 50 ? 0 : gameState._getParagonXpReq(gameState.paragonLevel);
        gameState.endgameComplete = gs.endgameComplete || false;
        // If Crimson Reach boss defeated but endgame flag missing (save migration)
        if (gameState.defeatedBosses.has('crimson_reach') && !gameState.endgameComplete) {
            gameState.endgameComplete = true;
            gameState.paragonUnlocked = true;
        }

        // ── Recalculate stats from the leveling curve (not saved values) ──
        // This ensures stats always match the current formula, even after
        // balance changes or level cap migrations.
        gameState.recalcBaseStats();
        gameState.xpToLevel = gameState.getXpRequired(gameState.level);

        // If at max level, zero out XP
        if (gameState.level >= CONFIG.MAX_LEVEL) {
            gameState.xp = 0;
            gameState.xpToLevel = 0;
        } else {
            gameState.xp = gs.xp || 0;
            // Clamp XP to not exceed current requirement
            if (gameState.xpToLevel > 0 && gameState.xp >= gameState.xpToLevel) {
                gameState.xp = gameState.xpToLevel - 1;
            }
        }

        // Restore current HP/mana (clamped to new maximums)
        gameState.hp = Math.min(gs.hp || gameState.maxHp, gameState.maxHp);
        gameState.mana = Math.min(gs.mana || gameState.maxMana, gameState.maxMana);

        if ((gs.level || 1) > CONFIG.MAX_LEVEL) {
            console.log(`💾 Save migration: clamped level ${gs.level} → ${CONFIG.MAX_LEVEL} (new level cap)`);
        }
    }

    // ─ Quest Log ─
    const ql = data.ql;
    if (ql) {
        questLog.completedIds = new Set(ql.completedIds || []);
        questLog.totalQuestsCompleted = ql.totalQuestsCompleted || 0;
        questLog.killsByMobName = ql.killsByMobName || {};
        questLog.totalHerbsGathered = ql.totalHerbsGathered || 0;
        questLog.totalOreGathered = ql.totalOreGathered || 0;
        questLog._pendingNext = ql.pendingNext || null;

        // Rebuild active quests from definitions + saved progress
        questLog.activeQuests = [];
        if (ql.activeQuests && ql.activeQuests.length > 0) {
            for (const saved of ql.activeQuests) {
                const def = questLog.getQuestDef(saved.id);
                if (!def) continue;
                const quest = {
                    ...def,
                    objectives: def.objectives.map((o, i) => ({
                        ...o,
                        current: (saved.objectives[i] && saved.objectives[i].current) || 0,
                    })),
                    accepted: Date.now(),
                    completed: saved.completed || false,
                };
                questLog.activeQuests.push(quest);
            }
        }

        // ── Save migration: fix boss-quest desync ──
        // If a zone boss was defeated but its boss quest isn't in completedIds,
        // force-complete the boss quest and accept the next one.
        // This fixes the "killed boss before quest was ready" edge case.
        for (const [zoneId, bossConfig] of Object.entries(CONFIG.ZONE_BOSSES)) {
            if (!gameState.defeatedBosses.has(zoneId)) continue;
            const bqId = bossConfig.questId;
            if (questLog.completedIds.has(bqId)) continue;
            // Boss was defeated but quest not completed — fix it
            questLog.completedIds.add(bqId);
            // Also mark the story-end quest as complete (the one before the boss)
            if (bossConfig.storyEndQuestId && !questLog.completedIds.has(bossConfig.storyEndQuestId)) {
                questLog.completedIds.add(bossConfig.storyEndQuestId);
                questLog.activeQuests = questLog.activeQuests.filter(q => q.id !== bossConfig.storyEndQuestId);
                console.log(`💾 Save migration: force-completed story quest ${bossConfig.storyEndQuestId} for boss desync`);
            }
            // Remove boss quest from active quests if it's still there
            questLog.activeQuests = questLog.activeQuests.filter(q => q.id !== bqId);
            // Accept the next quest in chain if not already active/completed
            const bqDef = questLog.getQuestDef(bqId);
            if (bqDef && bqDef.next && !questLog.completedIds.has(bqDef.next)) {
                const alreadyActive = questLog.activeQuests.some(q => q.id === bqDef.next);
                if (!alreadyActive) {
                    questLog.acceptQuestById(bqDef.next);
                }
            }
            console.log(`💾 Save migration: fixed boss quest desync for ${zoneId} (${bqId})`);
        }

        // ── Save migration: fix stuck repeating quests ──
        // If a repeating quest (post-boss) is active but seems stuck,
        // verify all its objectives match current config and reset if needed
        for (const quest of questLog.activeQuests) {
            if (quest.completed) continue;
            const def = questLog.getQuestDef(quest.id);
            if (!def) {
                // Quest no longer exists in config — remove it
                questLog.activeQuests = questLog.activeQuests.filter(q => q !== quest);
                console.log(`💾 Save migration: removed obsolete quest ${quest.id}`);
                continue;
            }
            // Ensure objective count matches (config may have changed)
            if (quest.objectives.length !== def.objectives.length) {
                quest.objectives = def.objectives.map(o => ({ ...o, current: 0 }));
                console.log(`💾 Save migration: reset objectives for ${quest.id} (count mismatch)`);
            }
        }

        // ── Save migration: reset stale active quests with changed objectives ──
        // If an active quest's objective structure doesn't match the current config
        // (e.g., dropId changed from wraith_essence to scarab_chitin), reset progress
        // to 0 on mismatched objectives to avoid stuck quests.
        for (const quest of questLog.activeQuests) {
            const def = questLog.getQuestDef(quest.id);
            if (!def) continue;
            for (let i = 0; i < quest.objectives.length; i++) {
                const obj = quest.objectives[i];
                const defObj = def.objectives[i];
                if (!defObj) continue;
                // Check for structural mismatch (type/dropId/pickupId changed)
                if (obj.type !== defObj.type ||
                    (obj.dropId && obj.dropId !== defObj.dropId) ||
                    (obj.pickupId && obj.pickupId !== defObj.pickupId) ||
                    (obj.mobName && obj.mobName !== defObj.mobName)) {
                    // Reset to match new definition
                    quest.objectives[i] = { ...defObj, current: 0 };
                }
            }
        }

        // If no active quests and there's a pending next, try to accept it
        if (questLog.activeQuests.length === 0 && questLog._pendingNext) {
            const nextDef = questLog.getQuestDef(questLog._pendingNext);
            if (nextDef && gameState.level >= nextDef.levelReq) {
                questLog.acceptQuestById(questLog._pendingNext);
                questLog._pendingNext = null;
            }
        }

        // If still no active quests and no pending, figure out next quest from completed chain
        if (questLog.activeQuests.length === 0 && !questLog._pendingNext) {
            // Find the next incomplete quest — prioritize current zone, then fall back to any zone
            const allQuests = CONFIG.QUEST_CHAINS;
            const currentZone = gameState.getCurrentZone();
            let nextId = null;
            let fallbackId = null;

            for (const q of allQuests) {
                if (!questLog.completedIds.has(q.id) || !q.next || questLog.completedIds.has(q.next)) continue;
                // Prefer current zone's chain
                if (q.zone === currentZone.name) {
                    nextId = q.next;
                    break; // Current zone match — use it immediately
                }
                // Track last fallback from any zone (only used if no current zone match)
                if (!fallbackId) fallbackId = q.next;
            }
            if (!nextId) nextId = fallbackId;

            if (nextId) {
                const def = questLog.getQuestDef(nextId);
                if (def && gameState.level >= def.levelReq) {
                    questLog.acceptQuestById(nextId);
                } else {
                    questLog._pendingNext = nextId;
                }
            } else if (questLog.completedIds.size === 0) {
                // Fresh start fallback
                questLog.acceptQuestById('vw1');
            }
        }
    }

    // ─ Inventory ─
    const inv = data.inv;
    if (inv) {
        // Equipped items
        const slotKeys = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
        for (const slot of slotKeys) {
            if (inv.equipped && inv.equipped[slot]) {
                inventory.equipped[slot] = deserializeItem(inv.equipped[slot]);
            } else {
                inventory.equipped[slot] = null;
            }
        }

        // Bag items
        inventory.items = (inv.items || []).map(deserializeItem).filter(Boolean);

        // Restore item ID counter to avoid duplicates
        if (inv.nextItemId) setNextItemId(inv.nextItemId);

        // Recalculate equipment stats
        inventory.recalcStats();
    }

    // ─ Talent Tree ─
    if (data.talents) {
        talentTree.deserialize(data.talents);
    }

    // ─ Upgrade Station ─
    if (data.upgrades) {
        upgradeStation.deserialize(data.upgrades);
    }
    // Reapply upgrade multipliers to all equipped items
    upgradeStation.reapplyAll();

    // ─ Gold Shop ─
    if (data.goldShop) {
        goldShop.deserialize(data.goldShop);
    }

    // ─ Aetherbit Shop ─
    if (data.aetherbitShop) {
        aetherbitShop.deserialize(data.aetherbitShop);
    }

    // ─ Achievements ─
    if (data.achievements) {
        achievementManager.deserialize(data.achievements);
    }

    // ─ Party System ─
    if (data.party) {
        partySystem.deserialize(data.party);
    }

    // ─ Soul Forge ─
    if (data.soulForge) {
        soulForge.deserialize(data.soulForge);
    }

    // ─ Dungeons ─
    if (data.dungeons) {
        dungeonSystem.deserialize(data.dungeons);
    }

    // ─ Companion System ─
    if (data.companion) {
        companionSystem.deserialize(data.companion);
    }
    // Sync bestiary from kill log (covers pre-companion saves)
    companionSystem.syncFromKillLog();

    // ─ Battleground System ─
    if (data.battleground) {
        battlegroundSystem.deserialize(data.battleground);
    }

    // ─ PvP Vendor ─
    if (data.pvpVendor) {
        pvpVendor.deserialize(data.pvpVendor);
        pvpVendor.reapplyGearStats(); // Re-add gear stat bonuses to gameState
    }

    // ─ Raid System ─
    if (data.raids) {
        raidSystem.deserialize(data.raids);
    }

    // ─ Raid Vendor ─
    if (data.raidVendor) {
        raidVendor.deserialize(data.raidVendor);
        raidVendor.reapplyGearStats();
    }

    return true;
}

// ── Public API ──────────────────────────────────────────────────────

class SaveManager {
    constructor() {
        this._timer = 0;
        this._loaded = false;
        this._saveCount = 0;
        this._resetInProgress = false; // blocks all saves when reset is pending
        this._currentSlotId = 0;
        this._maxSlots = 5;
        
        // Run migration once on construction
        this._migrateLegacySave();
    }

    /** Migrates legacy single save if it exists and we have no valid slots yet. 
     *  Separated from getSlots to prevent accidental triggers during deletion. */
    _migrateLegacySave() {
        try {
            const rawMetadata = localStorage.getItem(METADATA_KEY);
            const legacySave = localStorage.getItem('idleRealms_save_v1');
            
            // Only migrate if we have NO metadata at all and a legacy save exists
            if (!rawMetadata && legacySave) {
                console.log('💾 Found legacy save — migrating to Slot 0');
                const legacyData = JSON.parse(legacySave);
                const slot0Key = `${BASE_SAVE_KEY}0`;
                localStorage.setItem(slot0Key, legacySave);
                
                const metadata = {
                    '0': {
                        id: 0,
                        playerName: legacyData.gs?.playerName || 'Hero',
                        level: legacyData.gs?.level || 1,
                        classId: legacyData.gs?.classId || 'warrior',
                        timestamp: legacyData.timestamp || Date.now()
                    }
                };
                localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
                // Remove legacy key to prevent re-migration
                localStorage.removeItem('idleRealms_save_v1');
            }
        } catch (e) {
            console.error('💾 Legacy migration failed:', e);
        }
    }

    /** Set the active save slot */
    setCurrentSlot(id) {
        this._currentSlotId = id;
        console.log(`💾 Active save slot set to: ${id}`);
    }

    get currentSlotId() {
        return this._currentSlotId;
    }

    get currentSaveKey() {
        return `${BASE_SAVE_KEY}${this._currentSlotId}`;
    }

    /** Get metadata for all save slots */
    getSlots() {
        try {
            const raw = localStorage.getItem(METADATA_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('💾 Failed to load save metadata:', e);
            return {};
        }
    }

    /** Update metadata for the current slot */
    _updateMetadata() {
        try {
            const slots = this.getSlots();
            slots[this._currentSlotId] = {
                id: this._currentSlotId,
                playerName: gameState.playerName,
                level: gameState.level,
                classId: gameState.classId,
                timestamp: Date.now()
            };
            localStorage.setItem(METADATA_KEY, JSON.stringify(slots));
        } catch (e) {
            console.error('💾 Failed to update save metadata:', e);
        }
    }

    /** Try to load saved data. Call once before game loop starts. Returns true if save was found. */
    load() {
        try {
            const raw = localStorage.getItem(this.currentSaveKey);
            if (!raw) {
                console.log(`💾 No save found for slot ${this._currentSlotId} — starting fresh.`);
                return false;
            }
            const data = JSON.parse(raw);

            // Build equipped map for inventory
            const slotKeys = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
            if (data.inv) {
                // The equipped data was saved as part of inv, build it properly
                if (!data.inv.equipped) data.inv.equipped = {};
                // Check if equipped was saved at all (handle legacy)
                for (const slot of slotKeys) {
                    if (data.inv[`eq_${slot}`]) {
                        data.inv.equipped[slot] = data.inv[`eq_${slot}`];
                    }
                }
            }

            const success = applySaveData(data);
            if (success) {
                this._loaded = true;
                // Keep CONFIG.PLAYER_NAME in sync with loaded save
                CONFIG.PLAYER_NAME = gameState.playerName;
                const age = Date.now() - (data.timestamp || 0);
                const ageSec = Math.floor(age / 1000);
                const ageStr = ageSec < 60 ? `${ageSec}s` : ageSec < 3600 ? `${Math.floor(ageSec/60)}m` : `${Math.floor(ageSec/3600)}h`;
                console.log(`💾 Save loaded! (${ageStr} old) — "${gameState.playerName}" Level ${gameState.level}, ${gameState.formatGold(gameState.gold)} Gold, class=${gameState.classId}`);
                gameState.addGameLog(`Welcome back! Save restored (${ageStr} ago).`);
                const zoneName = gameState.getCurrentZone().name;
                gameState.addChatMessage('Game', 'System', `${gameState.playerName} has reconnected to ${zoneName}.`);
                return true;
            } else {
                console.warn('💾 Save data found but applySaveData returned false (version mismatch?)');
            }
        } catch (e) {
            console.error('💾 Save load failed:', e);
        }
        return false;
    }

    /** Save current state to localStorage. */
    save() {
        if (this._resetInProgress) {
            console.warn('💾 Save blocked — reset in progress.');
            return;
        }
        try {
            const data = buildSaveData();

            // Serialize equipped items into the inv section
            const slotKeys = ['weapon', 'helm', 'chest', 'legs', 'boots', 'ring', 'trinket'];
            for (const slot of slotKeys) {
                data.inv.equipped[slot] = serializeItem(inventory.equipped[slot]);
            }

            const json = JSON.stringify(data);
            localStorage.setItem(this.currentSaveKey, json);
            this._saveCount++;
            
            // Update metadata for selection screen
            this._updateMetadata();
            
            // Verify the save actually persisted (detect quota/privacy issues)
            if (this._saveCount <= 3 || this._saveCount % 20 === 0) {
                const verify = localStorage.getItem(this.currentSaveKey);
                if (!verify) {
                    console.error('💾 CRITICAL: Save written but immediately missing from localStorage! Browser may be blocking storage.');
                } else if (verify.length !== json.length) {
                    console.error('💾 CRITICAL: Save data corrupted during write! Expected', json.length, 'bytes, got', verify.length);
                }
            }
        } catch (e) {
            console.error('💾 Save failed:', e);
        }
    }

    /** Call every frame with delta time. Handles autosave interval. */
    update(dt) {
        this._timer += dt;
        // Save more frequently in the first 2 minutes (every 10s) to protect new characters
        const interval = this._saveCount < 4 ? 10 : AUTOSAVE_INTERVAL;
        if (this._timer >= interval) {
            this._timer = 0;
            this.save();
        }
    }

    /** Force an immediate save (e.g., before page unload). */
    forceSave() {
        this.save();
    }

    /** Clear all saved data (reset). Temporarily blocks saves to prevent beforeunload re-saving stale data. */
    clearSave() {
        this._resetInProgress = true;
        localStorage.removeItem(this.currentSaveKey);
        
        // Remove from metadata
        try {
            const slots = this.getSlots();
            delete slots[this._currentSlotId];
            localStorage.setItem(METADATA_KEY, JSON.stringify(slots));
        } catch (e) {}

        console.log(`💾 Save data cleared for slot ${this._currentSlotId}.`);
        
        // Re-enable after a short delay so we can start a new save if needed
        setTimeout(() => {
            this._resetInProgress = false;
        }, 100);
    }

    /** Re-enable saving after a reset (call once game state is freshly initialized). */
    enableSaving() {
        this._resetInProgress = false;
        console.log('💾 Saving re-enabled.');
    }

    get hasSave() {
        return !!localStorage.getItem(this.currentSaveKey);
    }

    /** Returns true if any slot has a save */
    get hasAnySave() {
        const slots = this.getSlots();
        return Object.keys(slots).length > 0;
    }

    /** Returns the raw save data for a slot without applying it */
    peek(id) {
        try {
            const raw = localStorage.getItem(`${BASE_SAVE_KEY}${id}`);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error(`💾 Save peek failed for slot ${id}:`, e);
            return null;
        }
    }

    get wasLoaded() {
        return this._loaded;
    }
}

export const saveManager = new SaveManager();
