// ══════════════════════════════════════════════════════════════════════
// PVP VENDOR — Victory Points Shop for PvP Gear & Upgrades
// ══════════════════════════════════════════════════════════════════════
// Victory Points (VP) are earned exclusively from PvP content (Battlegrounds).
// The War Quartermaster sells exclusive PvP gear and permanent upgrades
// that enhance your effectiveness in PvP combat.
//
// Inspired by WoW Conquest vendors, GW2 Reward Tracks.
// ══════════════════════════════════════════════════════════════════════

import { gameState } from './GameState.js';
import { battlegroundSystem } from './BattlegroundSystem.js';

// ── VP REWARD RATES (added to BG rewards) ────────────────────────────
export const VP_REWARDS = {
    bgWin: 75,          // Victory Points for winning a BG
    bgLoss: 25,         // VP for losing
    perKill: 3,         // VP per killing blow (team total)
    perFlagCap: 15,     // VP per flag capture
};

// ══════════════════════════════════════════════════════════════════════
// PVP GEAR — Purchasable equipment with PvP-specific bonuses
// ══════════════════════════════════════════════════════════════════════
// These provide stats in all content but have BONUS effects in PvP.

export const PVP_GEAR = [
    {
        id: 'pvp_trinket_resilience',
        name: 'Voidforged Wardstone',
        icon: '🔮',
        slot: 'trinket',
        description: 'Reduces all PvP damage taken by 8%. +500 HP.',
        cost: 300,
        stats: { hp: 500 },
        pvpEffect: 'pvpDamageReduction',
        pvpValue: 0.08,
        tier: 1,
    },
    {
        id: 'pvp_ring_fury',
        name: 'Band of Relentless Fury',
        icon: '💍',
        slot: 'ring',
        description: '+10% PvP damage dealt. +150 DPS.',
        cost: 350,
        stats: { dps: 150 },
        pvpEffect: 'pvpDamageBoost',
        pvpValue: 0.10,
        tier: 1,
    },
    {
        id: 'pvp_helm_fortitude',
        name: 'Gladiator\'s Voidhelm',
        icon: '⛑️',
        slot: 'helm',
        description: '+1200 HP. Reduces FC debuff stacking speed by 15%.',
        cost: 500,
        stats: { hp: 1200, armor: 20 },
        pvpEffect: 'fcDebuffSlowdown',
        pvpValue: 0.15,
        tier: 2,
    },
    {
        id: 'pvp_weapon_conquest',
        name: 'Conquest Aetherblade',
        icon: '⚔️',
        slot: 'weapon',
        description: '+400 DPS. +15% PvP damage. +5% PvP Crit.',
        cost: 750,
        stats: { dps: 400 },
        pvpEffect: 'pvpDamageBoost',
        pvpValue: 0.15,
        pvpCritBonus: 0.05,
        tier: 3,
    },
    {
        id: 'pvp_chest_bastion',
        name: 'Warmaster\'s Aegis Plate',
        icon: '🛡️',
        slot: 'chest',
        description: '+1800 HP. +40 Armor. Reduces PvP damage taken by 12%.',
        cost: 650,
        stats: { hp: 1800, armor: 40 },
        pvpEffect: 'pvpDamageReduction',
        pvpValue: 0.12,
        tier: 2,
    },
    {
        id: 'pvp_boots_swiftness',
        name: 'Striders of the Arena',
        icon: '👢',
        slot: 'boots',
        description: '+600 HP. +15 Armor. Reduces FC movement slow by 20%.',
        cost: 400,
        stats: { hp: 600, armor: 15 },
        pvpEffect: 'fcMoveSlow',
        pvpValue: 0.20,
        tier: 1,
    },
];

// ══════════════════════════════════════════════════════════════════════
// PVP PERMANENT UPGRADES — Tiered upgrades bought with VP
// ══════════════════════════════════════════════════════════════════════

export const PVP_UPGRADES = [
    {
        id: 'pvp_resilience',
        name: 'PvP Resilience',
        icon: '🛡️',
        description: 'Reduces damage taken in Battlegrounds',
        tiers: [
            { cost: 100, bonus: 0.03, label: '-3% PvP Damage Taken' },
            { cost: 250, bonus: 0.03, label: '-6% PvP Damage Taken' },
            { cost: 500, bonus: 0.04, label: '-10% PvP Damage Taken' },
            { cost: 800, bonus: 0.05, label: '-15% PvP Damage Taken' },
        ],
        effect: 'pvpDmgReduction',
    },
    {
        id: 'pvp_power',
        name: 'PvP Power',
        icon: '⚔️',
        description: 'Increases damage dealt in Battlegrounds',
        tiers: [
            { cost: 100, bonus: 0.05, label: '+5% PvP Damage' },
            { cost: 250, bonus: 0.05, label: '+10% PvP Damage' },
            { cost: 500, bonus: 0.05, label: '+15% PvP Damage' },
            { cost: 800, bonus: 0.05, label: '+20% PvP Damage' },
        ],
        effect: 'pvpDmgBoost',
    },
    {
        id: 'pvp_tenacity',
        name: 'PvP Tenacity',
        icon: '💪',
        description: 'Increases max HP of your team in Battlegrounds',
        tiers: [
            { cost: 150, bonus: 0.05, label: '+5% Team Max HP' },
            { cost: 350, bonus: 0.05, label: '+10% Team Max HP' },
            { cost: 600, bonus: 0.05, label: '+15% Team Max HP' },
        ],
        effect: 'pvpTeamHp',
    },
    {
        id: 'pvp_vp_boost',
        name: 'Victory Banner',
        icon: '🏆',
        description: 'Increases Victory Points earned from Battlegrounds',
        tiers: [
            { cost: 150, bonus: 0.10, label: '+10% VP Earned' },
            { cost: 400, bonus: 0.10, label: '+20% VP Earned' },
            { cost: 700, bonus: 0.10, label: '+30% VP Earned' },
        ],
        effect: 'vpBoost',
    },
    {
        id: 'pvp_healing',
        name: 'Battle Medic\'s Crest',
        icon: '💚',
        description: 'Increases healing done by your team\'s healers in BGs',
        tiers: [
            { cost: 120, bonus: 0.08, label: '+8% Team Healing' },
            { cost: 300, bonus: 0.08, label: '+16% Team Healing' },
            { cost: 550, bonus: 0.09, label: '+25% Team Healing' },
        ],
        effect: 'pvpTeamHeal',
    },
];

// ══════════════════════════════════════════════════════════════════════
// PVP VENDOR MANAGER
// ══════════════════════════════════════════════════════════════════════

class PvPVendorManager {
    constructor() {
        this.victoryPoints = 0;
        this.totalVPEarned = 0;
        this.totalVPSpent = 0;

        // Purchased gear IDs
        this.purchasedGear = new Set();

        // Upgrade tiers: { upgradeId: currentTier (0 = not bought) }
        this.upgradeLevels = {};
        for (const upg of PVP_UPGRADES) {
            this.upgradeLevels[upg.id] = 0;
        }
    }

    // ── VP Management ─────────────────────────────────────────────────
    addVP(amount) {
        // Apply VP boost from Victory Banner upgrade
        const vpBoost = 1 + this.getVPBoostMult();
        const boosted = Math.floor(amount * vpBoost);
        this.victoryPoints += boosted;
        this.totalVPEarned += boosted;
        return boosted;
    }

    spendVP(amount) {
        if (this.victoryPoints < amount) return false;
        this.victoryPoints -= amount;
        this.totalVPSpent += amount;
        return true;
    }

    // ── Gear Purchases ────────────────────────────────────────────────
    canAffordGear(gearId) {
        const def = PVP_GEAR.find(g => g.id === gearId);
        if (!def) return false;
        return this.victoryPoints >= def.cost && !this.purchasedGear.has(gearId);
    }

    buyGear(gearId) {
        const def = PVP_GEAR.find(g => g.id === gearId);
        if (!def) return { success: false, reason: 'Unknown item.' };
        if (this.purchasedGear.has(gearId)) return { success: false, reason: 'Already purchased.' };
        if (!this.spendVP(def.cost)) return { success: false, reason: `Need ${def.cost} VP.` };

        this.purchasedGear.add(gearId);

        // Apply passive stats to gameState
        if (def.stats.hp) gameState.equipBonusHp += def.stats.hp;
        if (def.stats.dps) gameState.equipBonusDps += def.stats.dps;
        if (def.stats.armor) gameState.equipBonusArmor += def.stats.armor;

        gameState.addGameLog(`⚔️ Purchased PvP Gear: ${def.name}!`);
        gameState.addChatMessage('Game', 'System', `⚔️ ${gameState.playerName} acquired ${def.name} from the War Quartermaster!`);
        return { success: true };
    }

    isGearPurchased(gearId) {
        return this.purchasedGear.has(gearId);
    }

    // ── Upgrade Purchases ─────────────────────────────────────────────
    getNextUpgradeTier(upgradeId) {
        const def = PVP_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return null;
        const tier = this.upgradeLevels[upgradeId] || 0;
        if (tier >= def.tiers.length) return null;
        return { ...def.tiers[tier], tierIndex: tier };
    }

    canAffordUpgrade(upgradeId) {
        const next = this.getNextUpgradeTier(upgradeId);
        if (!next) return false;
        return this.victoryPoints >= next.cost;
    }

    buyUpgrade(upgradeId) {
        const def = PVP_UPGRADES.find(u => u.id === upgradeId);
        if (!def) return { success: false, reason: 'Unknown upgrade.' };
        const next = this.getNextUpgradeTier(upgradeId);
        if (!next) return { success: false, reason: 'Already at max tier.' };
        if (!this.spendVP(next.cost)) return { success: false, reason: `Need ${next.cost} VP.` };

        this.upgradeLevels[upgradeId] = (this.upgradeLevels[upgradeId] || 0) + 1;
        gameState.addGameLog(`⚔️ PvP Upgrade: ${next.label}`);
        return { success: true, label: next.label };
    }

    // ── Aggregate PvP Bonuses (read by BattlegroundSystem) ──────────
    /** Total PvP damage reduction (0.0 to ~0.27) from upgrades + gear */
    getPvPDamageReduction() {
        // From upgrade
        const tier = this.upgradeLevels['pvp_resilience'] || 0;
        let total = 0;
        const def = PVP_UPGRADES.find(u => u.id === 'pvp_resilience');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;

        // From gear
        for (const gearId of this.purchasedGear) {
            const g = PVP_GEAR.find(x => x.id === gearId);
            if (g && g.pvpEffect === 'pvpDamageReduction') total += g.pvpValue;
        }
        return total;
    }

    /** Total PvP damage boost (0.0 to ~0.35) */
    getPvPDamageBoost() {
        const tier = this.upgradeLevels['pvp_power'] || 0;
        let total = 0;
        const def = PVP_UPGRADES.find(u => u.id === 'pvp_power');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;

        for (const gearId of this.purchasedGear) {
            const g = PVP_GEAR.find(x => x.id === gearId);
            if (g && g.pvpEffect === 'pvpDamageBoost') total += g.pvpValue;
        }
        return total;
    }

    /** Team HP boost (0.0 to 0.15) */
    getPvPTeamHpBoost() {
        const tier = this.upgradeLevels['pvp_tenacity'] || 0;
        let total = 0;
        const def = PVP_UPGRADES.find(u => u.id === 'pvp_tenacity');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    /** VP earned boost (0.0 to 0.30) */
    getVPBoostMult() {
        const tier = this.upgradeLevels['pvp_vp_boost'] || 0;
        let total = 0;
        const def = PVP_UPGRADES.find(u => u.id === 'pvp_vp_boost');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    /** Team healing boost (0.0 to 0.25) */
    getPvPTeamHealBoost() {
        const tier = this.upgradeLevels['pvp_healing'] || 0;
        let total = 0;
        const def = PVP_UPGRADES.find(u => u.id === 'pvp_healing');
        for (let i = 0; i < tier && def; i++) total += def.tiers[i].bonus;
        return total;
    }

    /** FC debuff slowdown from gear (0.0 to 0.15) */
    getFCDebuffSlowdown() {
        let total = 0;
        for (const gearId of this.purchasedGear) {
            const g = PVP_GEAR.find(x => x.id === gearId);
            if (g && g.pvpEffect === 'fcDebuffSlowdown') total += g.pvpValue;
        }
        return total;
    }

    /** FC movement slow reduction from gear (0.0 to 0.20) */
    getFCMoveSlowReduction() {
        let total = 0;
        for (const gearId of this.purchasedGear) {
            const g = PVP_GEAR.find(x => x.id === gearId);
            if (g && g.pvpEffect === 'fcMoveSlow') total += g.pvpValue;
        }
        return total;
    }

    /** PvP Crit bonus from gear */
    getPvPCritBonus() {
        let total = 0;
        for (const gearId of this.purchasedGear) {
            const g = PVP_GEAR.find(x => x.id === gearId);
            if (g && g.pvpCritBonus) total += g.pvpCritBonus;
        }
        return total;
    }

    /** Reapply gear stats after save load */
    reapplyGearStats() {
        for (const gearId of this.purchasedGear) {
            const def = PVP_GEAR.find(g => g.id === gearId);
            if (!def) continue;
            if (def.stats.hp) gameState.equipBonusHp += def.stats.hp;
            if (def.stats.dps) gameState.equipBonusDps += def.stats.dps;
            if (def.stats.armor) gameState.equipBonusArmor += def.stats.armor;
        }
    }

    // ── Serialization ─────────────────────────────────────────────────
    serialize() {
        return {
            victoryPoints: this.victoryPoints,
            totalVPEarned: this.totalVPEarned,
            totalVPSpent: this.totalVPSpent,
            purchasedGear: Array.from(this.purchasedGear),
            upgradeLevels: { ...this.upgradeLevels },
        };
    }

    deserialize(data) {
        if (!data) return;
        this.victoryPoints = data.victoryPoints || 0;
        this.totalVPEarned = data.totalVPEarned || 0;
        this.totalVPSpent = data.totalVPSpent || 0;
        this.purchasedGear = new Set(data.purchasedGear || []);
        if (data.upgradeLevels) {
            for (const key in data.upgradeLevels) {
                this.upgradeLevels[key] = data.upgradeLevels[key];
            }
        }
    }
}

export const pvpVendor = new PvPVendorManager();
