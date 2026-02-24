// Gold Merchant — Consumable buffs, bag upgrades, and utility purchases
// Inspired by WoW vendors, GW2 Trading Post consumables, and classic MMO gold sinks
//
// Two categories:
//  1. Consumable Buffs — temporary combat/economy boosts (repeatable purchases)
//  2. Permanent Upgrades — bag slots, auto-sell, etc. (one-time purchases with tiers)

import { gameState } from './GameState.js';

// ══════════════════════════════════════════════════════════════════════
// CONSUMABLE BUFFS — temporary effects purchased with Gold
// ══════════════════════════════════════════════════════════════════════

export const CONSUMABLE_BUFFS = [
    {
        id: 'xp_scroll',
        name: 'Scroll of Wisdom',
        icon: '📜',
        description: '+50% XP gained for 120s',
        baseCost: 50,
        costScale: 1.12,    // price scales with player level
        duration: 120,
        effect: 'xpBoost',
        value: 0.5,          // 50% bonus
        category: 'buff',
    },
    {
        id: 'damage_elixir',
        name: 'Elixir of Fury',
        icon: '⚗️',
        description: '+30% damage dealt for 90s',
        baseCost: 75,
        costScale: 1.15,
        duration: 90,
        effect: 'damageBoost',
        value: 0.3,
        category: 'buff',
    },
    {
        id: 'iron_skin',
        name: 'Ironbark Tonic',
        icon: '🛡️',
        description: '-25% damage taken for 90s',
        baseCost: 60,
        costScale: 1.12,
        duration: 90,
        effect: 'defenseBoost',
        value: 0.25,
        category: 'buff',
    },
    {
        id: 'gold_incense',
        name: 'Incense of Avarice',
        icon: '💰',
        description: '+75% Gold from kills for 120s',
        baseCost: 80,
        costScale: 1.15,
        duration: 120,
        effect: 'goldBoost',
        value: 0.75,
        category: 'buff',
    },
    {
        id: 'regen_salve',
        name: 'Verdant Salve',
        icon: '💚',
        description: '+200% HP regen for 60s',
        baseCost: 40,
        costScale: 1.1,
        duration: 60,
        effect: 'regenBoost',
        value: 2.0,
        category: 'buff',
    },
    {
        id: 'haste_draught',
        name: 'Swiftblade Draught',
        icon: '⚡',
        description: '+25% attack speed for 90s',
        baseCost: 90,
        costScale: 1.15,
        duration: 90,
        effect: 'hasteBoost',
        value: 0.25,
        category: 'buff',
    },
    // ── New Consumables ──
    {
        id: 'mercenary_contract',
        name: 'Mercenary Contract',
        icon: '👤',
        description: '+20% DPS (spectral ally) for 180s',
        baseCost: 120,
        costScale: 1.18,
        duration: 180,
        effect: 'mercenaryBoost',
        value: 0.20,
        category: 'buff',
    },
    {
        id: 'field_repair',
        name: 'Field Repair Kit',
        icon: '🔧',
        description: 'Instant full HP & Mana restore',
        baseCost: 45,
        costScale: 1.18,
        duration: 0,         // instant — no buff timer
        effect: 'instantHeal',
        value: 1.0,
        category: 'instant',
    },
    {
        id: 'gathering_charm',
        name: 'Gatherer\'s Charm',
        icon: '🧿',
        description: '+100% gather speed, +50% gather XP for 120s',
        baseCost: 55,
        costScale: 1.12,
        duration: 120,
        effect: 'gatherBoost',
        value: 1.0,          // 100% gather speed
        category: 'buff',
    },
    {
        id: 'lucky_horseshoe',
        name: 'Lucky Horseshoe',
        icon: '🧲',
        description: '+35% Aetherbit drops for 120s',
        baseCost: 95,
        costScale: 1.15,
        duration: 120,
        effect: 'aetherbitBoost',
        value: 0.35,
        category: 'buff',
    },
    {
        id: 'sprint_boots',
        name: 'Windrunner Draught',
        icon: '💨',
        description: '+40% movement speed for 60s',
        baseCost: 35,
        costScale: 1.10,
        duration: 60,
        effect: 'moveSpeedBoost',
        value: 0.40,
        category: 'buff',
    },
    {
        id: 'pocket_healer',
        name: 'Spirit Ward',
        icon: '👻',
        description: 'Auto-heal 3% max HP every 5s for 120s',
        baseCost: 65,
        costScale: 1.12,
        duration: 120,
        effect: 'autoHealBoost',
        value: 0.03,         // 3% max HP per tick
        category: 'buff',
    },
];

// ══════════════════════════════════════════════════════════════════════
// PERMANENT GOLD UPGRADES — one-time tiered purchases
// ══════════════════════════════════════════════════════════════════════

export const GOLD_UPGRADES = [
    {
        id: 'bag_expand',
        name: 'Bag Expansion',
        icon: '🎒',
        description: '+4 inventory slots per tier',
        tiers: [
            { cost: 100,  bonus: 4,  label: 'Traveler\'s Pack (28 slots)' },
            { cost: 300,  bonus: 4,  label: 'Explorer\'s Pack (32 slots)' },
            { cost: 800,  bonus: 4,  label: 'Adventurer\'s Satchel (36 slots)' },
            { cost: 2000, bonus: 4,  label: 'Hero\'s Rucksack (40 slots)' },
            { cost: 5000, bonus: 4,  label: 'Legendary Haversack (44 slots)' },
        ],
        effect: 'bagSlots',
    },
    {
        id: 'auto_sell',
        name: 'Auto-Sell Junk',
        icon: '🪙',
        description: 'Automatically sell junk items on loot',
        tiers: [
            { cost: 200,  label: 'Auto-sell Common junk', value: 0 },
            { cost: 600,  label: 'Auto-sell Uncommon junk', value: 1 },
        ],
        effect: 'autoSell',
    },
    {
        id: 'heal_well',
        name: 'Healing Well',
        icon: '⛲',
        description: 'Passive out-of-combat HP regen increase',
        tiers: [
            { cost: 150,  bonus: 0.25, label: '+25% regen' },
            { cost: 500,  bonus: 0.50, label: '+50% regen' },
            { cost: 1500, bonus: 1.00, label: '+100% regen' },
        ],
        effect: 'passiveRegen',
    },
    // ── New Permanent Upgrades ──
    {
        id: 'war_drums',
        name: 'War Drums',
        icon: '🥁',
        description: 'Bonus XP from mob kills',
        tiers: [
            { cost: 200,  bonus: 0.10, label: '+10% Kill XP' },
            { cost: 600,  bonus: 0.10, label: '+20% Kill XP' },
            { cost: 1800, bonus: 0.10, label: '+30% Kill XP' },
            { cost: 5000, bonus: 0.10, label: '+40% Kill XP' },
        ],
        effect: 'killXpBonus',
    },
    {
        id: 'scouts_compass',
        name: 'Scout\'s Compass',
        icon: '🧭',
        description: 'Increased pickup collection range',
        tiers: [
            { cost: 120,  bonus: 0.5, label: '+0.5 Pickup Range' },
            { cost: 400,  bonus: 0.5, label: '+1.0 Pickup Range' },
            { cost: 1200, bonus: 0.5, label: '+1.5 Pickup Range' },
        ],
        effect: 'pickupRange',
    },
    {
        id: 'battle_rations',
        name: 'Battle Rations',
        icon: '🍖',
        description: 'Permanent max HP increase',
        tiers: [
            { cost: 180,  bonus: 0.05, label: '+5% Max HP' },
            { cost: 500,  bonus: 0.05, label: '+10% Max HP' },
            { cost: 1400, bonus: 0.05, label: '+15% Max HP' },
            { cost: 4000, bonus: 0.05, label: '+20% Max HP' },
        ],
        effect: 'maxHpBonus',
    },
    {
        id: 'merchant_ledger',
        name: 'Merchant\'s Ledger',
        icon: '📒',
        description: 'Increased gold from all sources',
        tiers: [
            { cost: 250,  bonus: 0.10, label: '+10% Gold from all sources' },
            { cost: 750,  bonus: 0.10, label: '+20% Gold from all sources' },
            { cost: 2200, bonus: 0.10, label: '+30% Gold from all sources' },
        ],
        effect: 'goldIncome',
    },
    {
        id: 'trophy_case',
        name: 'Trophy Case',
        icon: '🏆',
        description: 'Increased Aetherbit drops from kills',
        tiers: [
            { cost: 300,  bonus: 0.10, label: '+10% Aetherbits from kills' },
            { cost: 900,  bonus: 0.10, label: '+20% Aetherbits from kills' },
            { cost: 2500, bonus: 0.10, label: '+30% Aetherbits from kills' },
        ],
        effect: 'aetherbitIncome',
    },
    {
        id: 'sharpening_stone',
        name: 'Whetstone Kit',
        icon: '🪨',
        description: 'Flat permanent DPS increase',
        tiers: [
            { cost: 150,  bonus: 0.03, label: '+3% Base DPS' },
            { cost: 450,  bonus: 0.03, label: '+6% Base DPS' },
            { cost: 1200, bonus: 0.03, label: '+9% Base DPS' },
            { cost: 3500, bonus: 0.03, label: '+12% Base DPS' },
        ],
        effect: 'flatDpsBonus',
    },
];

// ══════════════════════════════════════════════════════════════════════
// GOLD SHOP MANAGER
// ══════════════════════════════════════════════════════════════════════

class GoldShopManager {
    constructor() {
        // Active consumable buffs: { id, name, icon, effect, value, timeLeft, duration }
        this.activeBuffs = [];

        // Permanent upgrade levels: { upgradeId: currentTier (0 = not purchased) }
        this.upgradeLevels = {};
        for (const upg of GOLD_UPGRADES) {
            this.upgradeLevels[upg.id] = 0;
        }

        // Aggregate buff bonuses (recalculated each update)
        this.xpBoost = 0;
        this.damageBoost = 0;
        this.defenseBoost = 0;
        this.goldBoost = 0;
        this.regenBoost = 0;
        this.hasteBoost = 0;
        this.mercenaryBoost = 0;
        this.gatherBoost = 0;
        this.aetherbitBoost = 0;
        this.moveSpeedBoost = 0;
        this.autoHealBoost = 0;

        // Auto-heal tick tracker (Spirit Ward — heals every 5s)
        this._autoHealTimer = 0;

        // Stats tracking
        this.totalGoldSpent = 0;
        this.totalBuffsPurchased = 0;
    }

    reset() {
        this.activeBuffs = [];
        for (const upg of GOLD_UPGRADES) {
            this.upgradeLevels[upg.id] = 0;
        }
        this.xpBoost = 0;
        this.damageBoost = 0;
        this.defenseBoost = 0;
        this.goldBoost = 0;
        this.regenBoost = 0;
        this.hasteBoost = 0;
        this.mercenaryBoost = 0;
        this.gatherBoost = 0;
        this.aetherbitBoost = 0;
        this.moveSpeedBoost = 0;
        this.autoHealBoost = 0;
        this._autoHealTimer = 0;
        this.totalGoldSpent = 0;
        this.totalBuffsPurchased = 0;
    }

    /** Get the current cost of a consumable (scales with level) */
    getConsumableCost(def) {
        return Math.floor(def.baseCost * Math.pow(def.costScale, gameState.level - 1));
    }

    /** Can the player afford a consumable? */
    canAffordConsumable(def) {
        return gameState.gold >= this.getConsumableCost(def);
    }

    /** Purchase and activate a consumable buff */
    buyConsumable(consumableId) {
        const def = CONSUMABLE_BUFFS.find(c => c.id === consumableId);
        if (!def) return { success: false, reason: 'Unknown item.' };

        const cost = this.getConsumableCost(def);
        if (gameState.gold < cost) return { success: false, reason: `Need ${cost} Gold.` };

        gameState.gold -= cost;
        gameState.totalGoldSpent = (gameState.totalGoldSpent || 0) + cost;
        this.totalGoldSpent += cost;
        this.totalBuffsPurchased++;

        // Handle instant-use consumables (no buff timer)
        if (def.category === 'instant') {
            if (def.effect === 'instantHeal') {
                gameState.hp = gameState.getEffectiveMaxHp();
                gameState.mana = gameState.getEffectiveMaxMana();
                gameState.addGameLog(`${def.name} used! HP & Mana fully restored.`);
            }
            return { success: true };
        }

        // Check if buff already active — refresh duration instead of stacking
        const existing = this.activeBuffs.find(b => b.id === def.id);
        if (existing) {
            existing.timeLeft = def.duration;
            existing.duration = def.duration;
            gameState.addGameLog(`${def.name} refreshed! (${def.duration}s)`);
        } else {
            this.activeBuffs.push({
                id: def.id,
                name: def.name,
                icon: def.icon,
                effect: def.effect,
                value: def.value,
                timeLeft: def.duration,
                duration: def.duration,
            });
            gameState.addGameLog(`${def.name} activated! ${def.description} (${def.duration}s)`);
        }

        this._recalcBuffBonuses();
        return { success: true };
    }

    /** Get the next tier info for a permanent upgrade (null if maxed) */
    getNextUpgradeTier(upgradeId) {
        const def = GOLD_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return null;
        const currentTier = this.upgradeLevels[upgradeId] || 0;
        if (currentTier >= def.tiers.length) return null;
        return { ...def.tiers[currentTier], tierIndex: currentTier };
    }

    /** Can the player afford the next tier of a permanent upgrade? */
    canAffordUpgrade(upgradeId) {
        const next = this.getNextUpgradeTier(upgradeId);
        if (!next) return false;
        return gameState.gold >= next.cost;
    }

    /** Purchase the next tier of a permanent upgrade */
    buyUpgrade(upgradeId) {
        const def = GOLD_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return { success: false, reason: 'Unknown upgrade.' };

        const next = this.getNextUpgradeTier(upgradeId);
        if (!next) return { success: false, reason: 'Already at max tier.' };
        if (gameState.gold < next.cost) return { success: false, reason: `Need ${next.cost} Gold.` };

        gameState.gold -= next.cost;
        gameState.totalGoldSpent = (gameState.totalGoldSpent || 0) + next.cost;
        this.totalGoldSpent += next.cost;
        this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] || 0) + 1;

        gameState.addGameLog(`Purchased: ${next.label}`);
        return { success: true, label: next.label };
    }

    /** Get total extra bag slots from bag expansions */
    getExtraBagSlots() {
        const tier = this.upgradeLevels['bag_expand'] || 0;
        return tier * 4;
    }

    /** Get auto-sell rarity threshold (-1 = disabled, 0 = common, 1 = uncommon) */
    getAutoSellTier() {
        const tier = this.upgradeLevels['auto_sell'] || 0;
        if (tier <= 0) return -1;
        return tier - 1; // tier 1 = sell rarity 0 (common), tier 2 = sell rarity 0+1
    }

    /** Get passive regen bonus multiplier */
    getPassiveRegenBonus() {
        const tier = this.upgradeLevels['heal_well'] || 0;
        if (tier <= 0) return 0;
        let total = 0;
        for (let i = 0; i < tier; i++) {
            total += GOLD_UPGRADES.find(u => u.id === 'heal_well').tiers[i].bonus;
        }
        return total;
    }

    /** Get kill XP bonus from War Drums (0.0 to 0.40) */
    getKillXpBonus() {
        const tier = this.upgradeLevels['war_drums'] || 0;
        return tier * 0.10;
    }

    /** Get extra pickup collection range from Scout's Compass */
    getExtraPickupRange() {
        const tier = this.upgradeLevels['scouts_compass'] || 0;
        return tier * 0.5;
    }

    /** Get max HP bonus from Battle Rations (0.0 to 0.20) */
    getMaxHpBonus() {
        const tier = this.upgradeLevels['battle_rations'] || 0;
        return tier * 0.05;
    }

    /** Get gathering speed bonus from active Gatherer's Charm (0 or 1.0) */
    getGatherSpeedBonus() {
        return this.gatherBoost;
    }

    /** Get mercenary DPS boost (0 or 0.20) */
    getMercenaryBoost() {
        return this.mercenaryBoost;
    }

    /** Get Aetherbit drop boost from Lucky Horseshoe consumable */
    getAetherbitBoost() {
        return this.aetherbitBoost;
    }

    /** Get movement speed boost from Windrunner Draught consumable */
    getMoveSpeedBoost() {
        return this.moveSpeedBoost;
    }

    /** Get gold income bonus from Merchant's Ledger (0.0 to 0.30) */
    getGoldIncomeBonus() {
        const tier = this.upgradeLevels['merchant_ledger'] || 0;
        return tier * 0.10;
    }

    /** Get Aetherbit income bonus from Trophy Case (0.0 to 0.30) */
    getAetherbitIncomeBonus() {
        const tier = this.upgradeLevels['trophy_case'] || 0;
        return tier * 0.10;
    }

    /** Get flat DPS bonus from Whetstone Kit (0.0 to 0.12) */
    getFlatDpsBonus() {
        const tier = this.upgradeLevels['sharpening_stone'] || 0;
        return tier * 0.03;
    }

    /** Update buff timers — called each frame */
    update(dt) {
        let changed = false;
        for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
            this.activeBuffs[i].timeLeft -= dt;
            if (this.activeBuffs[i].timeLeft <= 0) {
                const expired = this.activeBuffs.splice(i, 1)[0];
                gameState.addGameLog(`${expired.name} has expired.`);
                changed = true;
            }
        }
        if (changed) this._recalcBuffBonuses();

        // Spirit Ward auto-heal tick (every 5s when active)
        if (this.autoHealBoost > 0) {
            this._autoHealTimer += dt;
            if (this._autoHealTimer >= 5) {
                this._autoHealTimer -= 5;
                const healAmount = Math.floor(gameState.getEffectiveMaxHp() * this.autoHealBoost);
                if (healAmount > 0) gameState.healPlayer(healAmount);
            }
        } else {
            this._autoHealTimer = 0;
        }
    }

    /** Recalculate aggregate buff bonuses from all active buffs */
    _recalcBuffBonuses() {
        this.xpBoost = 0;
        this.damageBoost = 0;
        this.defenseBoost = 0;
        this.goldBoost = 0;
        this.regenBoost = 0;
        this.hasteBoost = 0;
        this.mercenaryBoost = 0;
        this.gatherBoost = 0;
        this.aetherbitBoost = 0;
        this.moveSpeedBoost = 0;
        this.autoHealBoost = 0;

        for (const buff of this.activeBuffs) {
            switch (buff.effect) {
                case 'xpBoost':        this.xpBoost += buff.value; break;
                case 'damageBoost':    this.damageBoost += buff.value; break;
                case 'defenseBoost':   this.defenseBoost += buff.value; break;
                case 'goldBoost':      this.goldBoost += buff.value; break;
                case 'regenBoost':     this.regenBoost += buff.value; break;
                case 'hasteBoost':     this.hasteBoost += buff.value; break;
                case 'mercenaryBoost': this.mercenaryBoost += buff.value; break;
                case 'gatherBoost':    this.gatherBoost += buff.value; break;
                case 'aetherbitBoost':  this.aetherbitBoost += buff.value; break;
                case 'moveSpeedBoost': this.moveSpeedBoost += buff.value; break;
                case 'autoHealBoost':  this.autoHealBoost += buff.value; break;
            }
        }
    }

    // ── Serialization ────────────────────────────────────────────
    serialize() {
        return {
            upgradeLevels: { ...this.upgradeLevels },
            activeBuffs: this.activeBuffs.map(b => ({
                id: b.id, timeLeft: b.timeLeft,
            })),
            totalGoldSpent: this.totalGoldSpent,
            totalBuffsPurchased: this.totalBuffsPurchased,
        };
    }

    deserialize(data) {
        if (!data) return;
        if (data.upgradeLevels) {
            for (const key in data.upgradeLevels) {
                this.upgradeLevels[key] = data.upgradeLevels[key];
            }
        }
        this.totalGoldSpent = data.totalGoldSpent || 0;
        this.totalBuffsPurchased = data.totalBuffsPurchased || 0;

        // Restore active buffs (re-link to definitions)
        if (data.activeBuffs) {
            for (const saved of data.activeBuffs) {
                const def = CONSUMABLE_BUFFS.find(c => c.id === saved.id);
                if (def && saved.timeLeft > 0) {
                    this.activeBuffs.push({
                        id: def.id,
                        name: def.name,
                        icon: def.icon,
                        effect: def.effect,
                        value: def.value,
                        timeLeft: saved.timeLeft,
                        duration: def.duration,
                    });
                }
            }
            this._recalcBuffBonuses();
        }
    }
}

export const goldShop = new GoldShopManager();
