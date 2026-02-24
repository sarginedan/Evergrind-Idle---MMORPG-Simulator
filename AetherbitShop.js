// Aetherbit Emporium — Premium permanent account upgrades
// Inspired by WoW Conquest Vendor, GW2 Gem Store, and ARPG Paragon systems
//
// Aetherbits are the rare "prestige" currency earned from bosses, quests, and events.
// Everything here is a PERMANENT upgrade — aspirational long-term goals.
// No consumables — this is where you invest for lasting power.

import { gameState } from './GameState.js';

// ══════════════════════════════════════════════════════════════════════
// PERMANENT AETHERBIT UPGRADES — tiered account-wide power
// ══════════════════════════════════════════════════════════════════════

export const AETHERBIT_UPGRADES = [
    {
        id: 'swift_stride',
        name: 'Swift Stride',
        icon: '🏃',
        description: 'Permanent movement speed increase',
        tiers: [
            { cost: 20,   bonus: 0.10, label: '+10% Move Speed' },
            { cost: 60,   bonus: 0.10, label: '+20% Move Speed' },
            { cost: 150,  bonus: 0.10, label: '+30% Move Speed' },
            { cost: 400,  bonus: 0.10, label: '+40% Move Speed' },
            { cost: 1000, bonus: 0.10, label: '+50% Move Speed' },
        ],
        effect: 'moveSpeed',
    },
    {
        id: 'fortune_favor',
        name: 'Fortune\'s Favor',
        icon: '🍀',
        description: 'Improved item rarity from drops',
        tiers: [
            { cost: 30,   bonus: 5,  label: '+5% Rare drop chance' },
            { cost: 80,   bonus: 5,  label: '+10% Rare drop chance' },
            { cost: 200,  bonus: 5,  label: '+15% Rare drop chance' },
            { cost: 500,  bonus: 5,  label: '+20% Rare drop chance' },
            { cost: 1200, bonus: 5,  label: '+25% Rare drop chance' },
        ],
        effect: 'lootLuck',
    },
    {
        id: 'soul_siphon',
        name: 'Soul Siphon',
        icon: '🩸',
        description: 'Lifesteal — heal for a % of damage dealt',
        tiers: [
            { cost: 40,   bonus: 0.02, label: '2% Lifesteal' },
            { cost: 100,  bonus: 0.02, label: '4% Lifesteal' },
            { cost: 250,  bonus: 0.02, label: '6% Lifesteal' },
            { cost: 600,  bonus: 0.02, label: '8% Lifesteal' },
            { cost: 1500, bonus: 0.02, label: '10% Lifesteal' },
        ],
        effect: 'lifesteal',
    },
    {
        id: 'midas_touch',
        name: 'Midas Touch',
        icon: '✨',
        description: 'Passive gold generation per second',
        tiers: [
            { cost: 25,   bonus: 0.5,  label: '+0.5 Gold/sec' },
            { cost: 70,   bonus: 0.5,  label: '+1.0 Gold/sec' },
            { cost: 180,  bonus: 1.0,  label: '+2.0 Gold/sec' },
            { cost: 450,  bonus: 1.5,  label: '+3.5 Gold/sec' },
            { cost: 1100, bonus: 2.5,  label: '+6.0 Gold/sec' },
        ],
        effect: 'passiveGold',
    },
    {
        id: 'war_veteran',
        name: 'War Veteran',
        icon: '⚔️',
        description: 'Permanent base DPS increase',
        tiers: [
            { cost: 50,   bonus: 0.05, label: '+5% Base DPS' },
            { cost: 120,  bonus: 0.05, label: '+10% Base DPS' },
            { cost: 300,  bonus: 0.05, label: '+15% Base DPS' },
            { cost: 700,  bonus: 0.05, label: '+20% Base DPS' },
            { cost: 1800, bonus: 0.05, label: '+25% Base DPS' },
        ],
        effect: 'baseDps',
    },
    {
        id: 'arcane_reservoir',
        name: 'Arcane Reservoir',
        icon: '🔮',
        description: 'Reduced skill cooldowns',
        tiers: [
            { cost: 35,   bonus: 0.05, label: '-5% Cooldowns' },
            { cost: 90,   bonus: 0.05, label: '-10% Cooldowns' },
            { cost: 220,  bonus: 0.05, label: '-15% Cooldowns' },
            { cost: 550,  bonus: 0.05, label: '-20% Cooldowns' },
            { cost: 1400, bonus: 0.05, label: '-25% Cooldowns' },
        ],
        effect: 'cooldownReduction',
    },
    {
        id: 'critical_mastery',
        name: 'Critical Mastery',
        icon: '💥',
        description: 'Increased critical strike damage',
        tiers: [
            { cost: 45,   bonus: 0.10, label: '+10% Crit Damage' },
            { cost: 110,  bonus: 0.10, label: '+20% Crit Damage' },
            { cost: 280,  bonus: 0.10, label: '+30% Crit Damage' },
            { cost: 650,  bonus: 0.10, label: '+40% Crit Damage' },
            { cost: 1600, bonus: 0.10, label: '+50% Crit Damage' },
        ],
        effect: 'critDamage',
    },
    {
        id: 'ironclad_constitution',
        name: 'Ironclad Constitution',
        icon: '🏛️',
        description: 'Flat damage reduction from all sources',
        tiers: [
            { cost: 40,   bonus: 0.03, label: '3% Damage Reduction' },
            { cost: 100,  bonus: 0.03, label: '6% Damage Reduction' },
            { cost: 260,  bonus: 0.03, label: '9% Damage Reduction' },
            { cost: 620,  bonus: 0.03, label: '12% Damage Reduction' },
            { cost: 1500, bonus: 0.03, label: '15% Damage Reduction' },
        ],
        effect: 'damageReduction',
    },
    {
        id: 'gathering_savant',
        name: 'Gathering Savant',
        icon: '🌿',
        description: 'Permanent gathering speed increase',
        tiers: [
            { cost: 25,   bonus: 0.15, label: '+15% Gather Speed' },
            { cost: 65,   bonus: 0.15, label: '+30% Gather Speed' },
            { cost: 160,  bonus: 0.15, label: '+45% Gather Speed' },
            { cost: 400,  bonus: 0.15, label: '+60% Gather Speed' },
            { cost: 1000, bonus: 0.15, label: '+75% Gather Speed' },
        ],
        effect: 'gatherSpeed',
    },
    {
        id: 'xp_siphon',
        name: 'XP Siphon',
        icon: '📚',
        description: 'Permanent bonus XP from all sources',
        tiers: [
            { cost: 30,   bonus: 0.05, label: '+5% XP Gained' },
            { cost: 75,   bonus: 0.05, label: '+10% XP Gained' },
            { cost: 190,  bonus: 0.05, label: '+15% XP Gained' },
            { cost: 480,  bonus: 0.05, label: '+20% XP Gained' },
            { cost: 1200, bonus: 0.05, label: '+25% XP Gained' },
        ],
        effect: 'xpBonus',
    },
    {
        id: 'enchanted_vitality',
        name: 'Enchanted Vitality',
        icon: '💖',
        description: 'Permanent HP regeneration increase',
        tiers: [
            { cost: 20,   bonus: 0.15, label: '+15% HP Regen' },
            { cost: 55,   bonus: 0.15, label: '+30% HP Regen' },
            { cost: 140,  bonus: 0.15, label: '+45% HP Regen' },
            { cost: 350,  bonus: 0.15, label: '+60% HP Regen' },
            { cost: 900,  bonus: 0.15, label: '+75% HP Regen' },
        ],
        effect: 'hpRegen',
    },
    {
        id: 'paragon_accelerator',
        name: 'Paragon Accelerator',
        icon: '⚡',
        description: 'Increased Paragon XP gain (endgame)',
        tiers: [
            { cost: 60,   bonus: 0.10, label: '+10% Paragon XP' },
            { cost: 150,  bonus: 0.10, label: '+20% Paragon XP' },
            { cost: 380,  bonus: 0.10, label: '+30% Paragon XP' },
            { cost: 900,  bonus: 0.10, label: '+40% Paragon XP' },
            { cost: 2200, bonus: 0.10, label: '+50% Paragon XP' },
        ],
        effect: 'paragonXp',
    },
    {
        id: 'veterans_instinct',
        name: 'Veteran\'s Instinct',
        icon: '🎯',
        description: 'Increased base critical strike chance',
        tiers: [
            { cost: 35,   bonus: 0.02, label: '+2% Crit Chance' },
            { cost: 85,   bonus: 0.02, label: '+4% Crit Chance' },
            { cost: 210,  bonus: 0.02, label: '+6% Crit Chance' },
            { cost: 520,  bonus: 0.02, label: '+8% Crit Chance' },
            { cost: 1300, bonus: 0.02, label: '+10% Crit Chance' },
        ],
        effect: 'critChance',
    },
    {
        id: 'treasure_hunter',
        name: 'Treasure Hunter',
        icon: '🗝️',
        description: 'Increased equipment drop rate from mobs',
        tiers: [
            { cost: 25,   bonus: 0.02, label: '+2% Equip Drop Rate' },
            { cost: 65,   bonus: 0.02, label: '+4% Equip Drop Rate' },
            { cost: 170,  bonus: 0.02, label: '+6% Equip Drop Rate' },
            { cost: 420,  bonus: 0.02, label: '+8% Equip Drop Rate' },
            { cost: 1050, bonus: 0.02, label: '+10% Equip Drop Rate' },
        ],
        effect: 'equipDropRate',
    },
];

// ══════════════════════════════════════════════════════════════════════
// AETHERBIT SHOP MANAGER
// ══════════════════════════════════════════════════════════════════════

class AetherbitShopManager {
    constructor() {
        // Current tier levels for each upgrade
        this.upgradeLevels = {};
        for (const upg of AETHERBIT_UPGRADES) {
            this.upgradeLevels[upg.id] = 0;
        }

        // Passive gold accumulator (fractional gold tracking)
        this._goldAccum = 0;

        // Stats tracking
        this.totalAetherbitsSpent = 0;
    }

    reset() {
        for (const upg of AETHERBIT_UPGRADES) {
            this.upgradeLevels[upg.id] = 0;
        }
        this._goldAccum = 0;
        this.totalAetherbitsSpent = 0;
    }

    /** Get the next tier info for an upgrade (null if maxed) */
    getNextTier(upgradeId) {
        const def = AETHERBIT_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return null;
        const currentTier = this.upgradeLevels[upgradeId] || 0;
        if (currentTier >= def.tiers.length) return null;
        return { ...def.tiers[currentTier], tierIndex: currentTier };
    }

    /** Is this upgrade maxed out? */
    isMaxed(upgradeId) {
        const def = AETHERBIT_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return true;
        return (this.upgradeLevels[upgradeId] || 0) >= def.tiers.length;
    }

    /** Can the player afford the next tier? */
    canAfford(upgradeId) {
        const next = this.getNextTier(upgradeId);
        if (!next) return false;
        return gameState.karma >= next.cost;
    }

    /** Purchase the next tier */
    buyUpgrade(upgradeId) {
        const def = AETHERBIT_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return { success: false, reason: 'Unknown upgrade.' };

        const next = this.getNextTier(upgradeId);
        if (!next) return { success: false, reason: 'Already at max tier.' };
        if (gameState.karma < next.cost) return { success: false, reason: `Need ${next.cost} Aetherbits.` };

        gameState.karma -= next.cost;
        this.totalAetherbitsSpent += next.cost;
        this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] || 0) + 1;

        gameState.addGameLog(`Aetherbit Upgrade: ${next.label}`);
        gameState.addChatMessage('Game', 'System', `${def.icon} ${def.name} upgraded to Tier ${this.upgradeLevels[upgradeId]}!`);
        return { success: true, label: next.label };
    }

    // ── Computed bonuses ──────────────────────────────────────────

    /** Total move speed bonus (0.0 to 0.5) */
    getMoveSpeedBonus() {
        const tier = this.upgradeLevels['swift_stride'] || 0;
        return tier * 0.10;
    }

    /** Total loot luck bonus in percentage points (0 to 25) */
    getLootLuckBonus() {
        const tier = this.upgradeLevels['fortune_favor'] || 0;
        return tier * 5;
    }

    /** Total lifesteal fraction (0.0 to 0.10) */
    getLifestealFraction() {
        const tier = this.upgradeLevels['soul_siphon'] || 0;
        return tier * 0.02;
    }

    /** Passive gold per second */
    getPassiveGoldPerSec() {
        const tier = this.upgradeLevels['midas_touch'] || 0;
        if (tier <= 0) return 0;
        let total = 0;
        const def = AETHERBIT_UPGRADES.find(u => u.id === 'midas_touch');
        for (let i = 0; i < tier; i++) total += def.tiers[i].bonus;
        return total;
    }

    /** Base DPS multiplier bonus (0.0 to 0.25) */
    getBaseDPSBonus() {
        const tier = this.upgradeLevels['war_veteran'] || 0;
        return tier * 0.05;
    }

    /** Cooldown reduction bonus (0.0 to 0.25) */
    getCooldownReduction() {
        const tier = this.upgradeLevels['arcane_reservoir'] || 0;
        return tier * 0.05;
    }

    /** Crit damage bonus (0.0 to 0.50) */
    getCritDamageBonus() {
        const tier = this.upgradeLevels['critical_mastery'] || 0;
        return tier * 0.10;
    }

    /** Flat damage reduction (0.0 to 0.15) */
    getDamageReduction() {
        const tier = this.upgradeLevels['ironclad_constitution'] || 0;
        return tier * 0.03;
    }

    /** Permanent gathering speed bonus (0.0 to 0.75) */
    getGatherSpeedBonus() {
        const tier = this.upgradeLevels['gathering_savant'] || 0;
        return tier * 0.15;
    }

    /** Permanent XP bonus (0.0 to 0.25) */
    getXpBonus() {
        const tier = this.upgradeLevels['xp_siphon'] || 0;
        return tier * 0.05;
    }

    /** Permanent HP regen bonus (0.0 to 0.75) */
    getHpRegenBonus() {
        const tier = this.upgradeLevels['enchanted_vitality'] || 0;
        return tier * 0.15;
    }

    /** Paragon XP bonus (0.0 to 0.50) — endgame progression sink */
    getParagonXpBonus() {
        const tier = this.upgradeLevels['paragon_accelerator'] || 0;
        return tier * 0.10;
    }

    /** Base crit chance bonus (0.0 to 0.10) */
    getCritChanceBonus() {
        const tier = this.upgradeLevels['veterans_instinct'] || 0;
        return tier * 0.02;
    }

    /** Equipment drop rate bonus (0.0 to 0.10) */
    getEquipDropRateBonus() {
        const tier = this.upgradeLevels['treasure_hunter'] || 0;
        return tier * 0.02;
    }

    /** Called every frame — handles passive gold generation */
    update(dt) {
        const gps = this.getPassiveGoldPerSec();
        if (gps > 0) {
            this._goldAccum += gps * dt;
            if (this._goldAccum >= 1) {
                const whole = Math.floor(this._goldAccum);
                this._goldAccum -= whole;
                gameState.gold += whole;
                gameState.totalGoldGained += whole;
            }
        }
    }

    // ── Serialization ────────────────────────────────────────────
    serialize() {
        return {
            upgradeLevels: { ...this.upgradeLevels },
            totalAetherbitsSpent: this.totalAetherbitsSpent,
        };
    }

    deserialize(data) {
        if (!data) return;
        if (data.upgradeLevels) {
            for (const key in data.upgradeLevels) {
                this.upgradeLevels[key] = data.upgradeLevels[key];
            }
        }
        this.totalAetherbitsSpent = data.totalAetherbitsSpent || 0;
    }
}

export const aetherbitShop = new AetherbitShopManager();
