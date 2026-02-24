// ══════════════════════════════════════════════════════════════════════
// RAID VENDOR — Raid Points Shop for Raid-Exclusive Upgrades
// ══════════════════════════════════════════════════════════════════════
// Raid Points (RP) are earned exclusively from Raids.
// The Hivemind Quartermaster sells unique WoW-inspired upgrades that
// provide meaningful gameplay mechanics — not just flat stat boosts.
//
// Inspired by WoW Tier Sets, Great Vault, Catalyst upgrades.
// ══════════════════════════════════════════════════════════════════════

import { gameState } from './GameState.js';

// ══════════════════════════════════════════════════════════════════════
// RAID GEAR — Set Pieces with Set Bonuses (WoW Tier Set inspiration)
// ══════════════════════════════════════════════════════════════════════

export const RAID_GEAR = [
    {
        id: 'raid_helm_hivemind',
        name: 'Hivemind Crown',
        icon: '👑',
        slot: 'helm',
        description: '+2000 HP. Raid bosses take 5% more damage from your party.',
        cost: 150,
        stats: { hp: 2000 },
        raidEffect: 'raidBossDmgBoost',
        raidValue: 0.05,
        setId: 'hivemind',
        tier: 1,
    },
    {
        id: 'raid_chest_hivemind',
        name: 'Hivemind Carapace',
        icon: '🛡️',
        slot: 'chest',
        description: '+3000 HP. +60 Armor. Party takes 8% less raid damage.',
        cost: 200,
        stats: { hp: 3000, armor: 60 },
        raidEffect: 'raidDmgReduction',
        raidValue: 0.08,
        setId: 'hivemind',
        tier: 2,
    },
    {
        id: 'raid_weapon_hivemind',
        name: 'Hivemind Psi-Blade',
        icon: '⚔️',
        slot: 'weapon',
        description: '+600 DPS. Boss phase transitions deal 50% less raid damage.',
        cost: 300,
        stats: { dps: 600 },
        raidEffect: 'phaseTransitionShield',
        raidValue: 0.50,
        setId: 'hivemind',
        tier: 3,
    },
    {
        id: 'raid_trinket_overmind',
        name: 'Shard of the Overmind',
        icon: '🔮',
        slot: 'trinket',
        description: '+800 HP. +200 DPS. Raid encounter transitions restore +15% party HP.',
        cost: 250,
        stats: { hp: 800, dps: 200 },
        raidEffect: 'encounterHealBoost',
        raidValue: 0.15,
        setId: 'hivemind',
        tier: 2,
    },
];

// ══════════════════════════════════════════════════════════════════════
// RAID UPGRADES — Unique WoW-Inspired Mechanics (NOT flat stat %s)
// ══════════════════════════════════════════════════════════════════════

export const RAID_UPGRADES = [
    {
        id: 'raid_bloodlust',
        name: 'Bloodlust Protocol',
        icon: '🔥',
        description: 'On boss pull, your raid gains a burst of Bloodlust — massively increased DPS for the first moments of each boss fight.',
        tiers: [
            { cost: 80, bonus: 0.15, duration: 8, label: '+15% raid DPS for 8s on boss pull' },
            { cost: 200, bonus: 0.20, duration: 10, label: '+20% raid DPS for 10s on boss pull' },
            { cost: 400, bonus: 0.30, duration: 12, label: '+30% raid DPS for 12s on boss pull' },
        ],
        effect: 'bloodlust',
    },
    {
        id: 'raid_soulstone',
        name: 'Soulstone Reserve',
        icon: '💎',
        description: 'When a raid member falls, there\'s a chance they self-resurrect with partial HP — preventing a full wipe from a single mistake.',
        tiers: [
            { cost: 100, bonus: 0.15, label: '15% chance fallen NPCs self-resurrect' },
            { cost: 250, bonus: 0.10, label: '25% chance fallen NPCs self-resurrect' },
            { cost: 500, bonus: 0.10, label: '35% chance fallen NPCs self-resurrect' },
        ],
        effect: 'soulstone',
    },
    {
        id: 'raid_feast',
        name: 'Raid Feast',
        icon: '🍖',
        description: 'Before each boss encounter, your raid sets up a feast that buffs the entire party — increased max HP and healing received.',
        tiers: [
            { cost: 60, bonus: 0.08, label: '+8% max HP before boss fights' },
            { cost: 150, bonus: 0.07, label: '+15% max HP before boss fights' },
            { cost: 350, bonus: 0.10, label: '+25% max HP before boss fights' },
        ],
        effect: 'feast',
    },
    {
        id: 'raid_battle_rez',
        name: 'Mass Resurrection',
        icon: '✨',
        description: 'After defeating a boss, ALL fallen raid members are instantly revived at full HP — no more limping through trash with a depleted roster.',
        tiers: [
            { cost: 120, bonus: 0.50, label: 'Revive fallen NPCs at 50% HP after bosses' },
            { cost: 280, bonus: 0.25, label: 'Revive fallen NPCs at 75% HP after bosses' },
            { cost: 550, bonus: 0.25, label: 'Revive fallen NPCs at 100% HP after bosses' },
        ],
        effect: 'massRez',
    },
    {
        id: 'raid_rp_boost',
        name: 'Crimson War Standard',
        icon: '🚩',
        description: 'Plant a war standard that increases Raid Points earned from all raid content — faster path to powerful upgrades.',
        tiers: [
            { cost: 100, bonus: 0.15, label: '+15% Raid Points earned' },
            { cost: 250, bonus: 0.10, label: '+25% Raid Points earned' },
            { cost: 500, bonus: 0.10, label: '+35% Raid Points earned' },
        ],
        effect: 'rpBoost',
    },
    {
        id: 'raid_loot_council',
        name: 'Loot Council Favor',
        icon: '💰',
        description: 'Increased gold and XP rewards from raid bosses. The loot council favors your contributions to the raid.',
        tiers: [
            { cost: 80, bonus: 0.10, label: '+10% gold & XP from raid bosses' },
            { cost: 200, bonus: 0.10, label: '+20% gold & XP from raid bosses' },
            { cost: 400, bonus: 0.10, label: '+30% gold & XP from raid bosses' },
        ],
        effect: 'lootCouncil',
    },
];

// ══════════════════════════════════════════════════════════════════════
// RAID VENDOR MANAGER
// ══════════════════════════════════════════════════════════════════════

class RaidVendorManager {
    constructor() {
        this.raidPoints = 0;
        this.totalRPEarned = 0;
        this.totalRPSpent = 0;

        this.purchasedGear = new Set();
        this.upgradeLevels = {};
        for (const upg of RAID_UPGRADES) {
            this.upgradeLevels[upg.id] = 0;
        }
    }

    // ── RP Management ──────────────────────────────────────────────────
    addRP(amount) {
        const rpBoost = 1 + this.getRPBoostMult();
        const boosted = Math.floor(amount * rpBoost);
        this.raidPoints += boosted;
        this.totalRPEarned += boosted;
        return boosted;
    }

    spendRP(amount) {
        if (this.raidPoints < amount) return false;
        this.raidPoints -= amount;
        this.totalRPSpent += amount;
        return true;
    }

    // ── Gear Purchases ─────────────────────────────────────────────────
    canAffordGear(gearId) {
        const def = RAID_GEAR.find(g => g.id === gearId);
        if (!def) return false;
        return this.raidPoints >= def.cost && !this.purchasedGear.has(gearId);
    }

    buyGear(gearId) {
        const def = RAID_GEAR.find(g => g.id === gearId);
        if (!def) return { success: false, reason: 'Unknown item.' };
        if (this.purchasedGear.has(gearId)) return { success: false, reason: 'Already purchased.' };
        if (!this.spendRP(def.cost)) return { success: false, reason: `Need ${def.cost} RP.` };

        this.purchasedGear.add(gearId);

        // Apply passive stats to gameState
        if (def.stats.hp) gameState.equipBonusHp += def.stats.hp;
        if (def.stats.dps) gameState.equipBonusDps += def.stats.dps;
        if (def.stats.armor) gameState.equipBonusArmor += def.stats.armor;

        gameState.addGameLog(`🏛️ Purchased Raid Gear: ${def.name}!`);
        gameState.addChatMessage('Game', 'System', `🏛️ ${gameState.playerName} acquired ${def.name} from the Hivemind Quartermaster!`);
        return { success: true };
    }

    isGearPurchased(gearId) {
        return this.purchasedGear.has(gearId);
    }

    // ── Set Bonus Check ────────────────────────────────────────────────
    getSetPieceCount(setId) {
        let count = 0;
        for (const gearId of this.purchasedGear) {
            const g = RAID_GEAR.find(x => x.id === gearId);
            if (g && g.setId === setId) count++;
        }
        return count;
    }

    // ── Upgrade Purchases ──────────────────────────────────────────────
    getNextUpgradeTier(upgradeId) {
        const def = RAID_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return null;
        const tier = this.upgradeLevels[upgradeId] || 0;
        if (tier >= def.tiers.length) return null;
        return { ...def.tiers[tier], tierIndex: tier };
    }

    canAffordUpgrade(upgradeId) {
        const next = this.getNextUpgradeTier(upgradeId);
        if (!next) return false;
        return this.raidPoints >= next.cost;
    }

    buyUpgrade(upgradeId) {
        const def = RAID_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return { success: false, reason: 'Unknown upgrade.' };
        const next = this.getNextUpgradeTier(upgradeId);
        if (!next) return { success: false, reason: 'Already at max tier.' };
        if (!this.spendRP(next.cost)) return { success: false, reason: `Need ${next.cost} RP.` };

        this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] || 0) + 1;
        gameState.addGameLog(`🏛️ Raid Upgrade: ${next.label}`);
        return { success: true, label: next.label };
    }

    // ── Aggregate Raid Bonuses (read by RaidSystem) ────────────────────
    getBloodlustBonus() {
        const tier = this.upgradeLevels['raid_bloodlust'] || 0;
        if (tier === 0) return { bonus: 0, duration: 0 };
        const def = RAID_UPGRADES.find(u => u.id === 'raid_bloodlust');
        return { bonus: def.tiers[tier - 1].bonus, duration: def.tiers[tier - 1].duration };
    }

    getSoulstoneChance() {
        const tier = this.upgradeLevels['raid_soulstone'] || 0;
        let total = 0;
        const def = RAID_UPGRADES.find(u => u.id === 'raid_soulstone');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    getFeastBonus() {
        const tier = this.upgradeLevels['raid_feast'] || 0;
        let total = 0;
        const def = RAID_UPGRADES.find(u => u.id === 'raid_feast');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    getMassRezHP() {
        const tier = this.upgradeLevels['raid_battle_rez'] || 0;
        let total = 0;
        const def = RAID_UPGRADES.find(u => u.id === 'raid_battle_rez');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    getRPBoostMult() {
        const tier = this.upgradeLevels['raid_rp_boost'] || 0;
        let total = 0;
        const def = RAID_UPGRADES.find(u => u.id === 'raid_rp_boost');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    getLootCouncilBonus() {
        const tier = this.upgradeLevels['raid_loot_council'] || 0;
        let total = 0;
        const def = RAID_UPGRADES.find(u => u.id === 'raid_loot_council');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    getRaidBossDmgBoost() {
        let total = 0;
        for (const gearId of this.purchasedGear) {
            const g = RAID_GEAR.find(x => x.id === gearId);
            if (g && g.raidEffect === 'raidBossDmgBoost') total += g.raidValue;
        }
        return total;
    }

    getRaidDmgReduction() {
        let total = 0;
        for (const gearId of this.purchasedGear) {
            const g = RAID_GEAR.find(x => x.id === gearId);
            if (g && g.raidEffect === 'raidDmgReduction') total += g.raidValue;
        }
        return total;
    }

    /** Reapply gear stats after save load */
    reapplyGearStats() {
        for (const gearId of this.purchasedGear) {
            const def = RAID_GEAR.find(g => g.id === gearId);
            if (!def) continue;
            if (def.stats.hp) gameState.equipBonusHp += def.stats.hp;
            if (def.stats.dps) gameState.equipBonusDps += def.stats.dps;
            if (def.stats.armor) gameState.equipBonusArmor += def.stats.armor;
        }
    }

    // ── Serialization ──────────────────────────────────────────────────
    serialize() {
        return {
            raidPoints: this.raidPoints,
            totalRPEarned: this.totalRPEarned,
            totalRPSpent: this.totalRPSpent,
            purchasedGear: Array.from(this.purchasedGear),
            upgradeLevels: { ...this.upgradeLevels },
        };
    }

    deserialize(data) {
        if (!data) return;
        this.raidPoints = data.raidPoints || 0;
        this.totalRPEarned = data.totalRPEarned || 0;
        this.totalRPSpent = data.totalRPSpent || 0;
        this.purchasedGear = new Set(data.purchasedGear || []);
        if (data.upgradeLevels) {
            for (const key in data.upgradeLevels) {
                this.upgradeLevels[key] = data.upgradeLevels[key];
            }
        }
    }
}

export const raidVendor = new RaidVendorManager();
